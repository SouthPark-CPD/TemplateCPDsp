const DISCORD_API = "https://discord.com/api/v10";
const ACADEMY_GUILD_ID = "1538858756354473984";
const APPLICATION_CATEGORY_ID = "1538858758116089927";
const CHANNEL_TYPE_TEXT = 0;
const CHANNEL_TYPE_CATEGORY = 4;
const MEMBER_OVERWRITE = 1;
const CANDIDATE_PERMISSIONS = String(1024 + 2048 + 16384 + 32768 + 65536);
const CLOSE_TICKET_BUTTON_ID = "academy_ticket_close";

class AcademyError extends Error {
  constructor(code, status = 500, detail = "") {
    super(code);
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

function botToken() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) throw new AcademyError("bot_not_configured", 503);
  return token;
}

async function discordRequest(path, options = {}) {
  const response = await fetch(`${DISCORD_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bot ${botToken()}`,
      "Content-Type": "application/json",
      ...options.headers
    }
  });

  const text = await response.text().catch(() => "");
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }

  if (!response.ok) {
    const error = new AcademyError("discord_api_error", response.status, typeof data === "string" ? data : JSON.stringify(data || {}));
    error.discordStatus = response.status;
    throw error;
  }
  return data;
}

function normalized(value) {
  return typeof value === "string" ? value.trim().replace(/\r\n/g, "\n") : "";
}

function within(value, min, max) {
  return value.length >= min && value.length <= max;
}

function validateApplication(body) {
  const application = {
    firstName: normalized(body.firstName),
    lastName: normalized(body.lastName),
    age: Number(body.age),
    playerId: normalized(body.playerId),
    policeExperience: normalized(body.policeExperience),
    experience: normalized(body.experience),
    availability: normalized(body.availability),
    motivation: normalized(body.motivation),
    qualities: normalized(body.qualities),
    accuracy: body.accuracy === true
  };

  const valid = within(application.firstName, 2, 40)
    && within(application.lastName, 2, 40)
    && Number.isInteger(application.age) && application.age >= 18 && application.age <= 80
    && application.playerId.length <= 50
    && ["Oui", "Non"].includes(application.policeExperience)
    && within(application.experience, 40, 1000)
    && within(application.availability, 20, 500)
    && within(application.motivation, 100, 1800)
    && within(application.qualities, 60, 1200)
    && application.accuracy;

  if (!valid) throw new AcademyError("invalid_application", 400);
  return application;
}

function channelSlug(firstName, lastName, discordId) {
  const name = `${firstName}-${lastName}`
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-").replace(/^-|-$/g, "") || "candidat";
  return `candidature-${name.slice(0, 65)}-${discordId.slice(-4)}`.slice(0, 100);
}

function avatarUrl(user) {
  return user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128` : undefined;
}

function cleanDiscordText(value) {
  return value.replace(/@/g, "@\u200b");
}

function applicationEmbeds(applicationId, user, application) {
  const displayName = user.globalName || user.username;
  const color = 0x3c8fdc;
  return [
    {
      title: `Nouvelle candidature • ${applicationId}`,
      description: `Candidature déposée depuis le portail Police Academy par **${cleanDiscordText(displayName)}**.`,
      color,
      thumbnail: avatarUrl(user) ? { url: avatarUrl(user) } : undefined,
      fields: [
        { name: "Candidat RP", value: `${cleanDiscordText(application.firstName)} ${cleanDiscordText(application.lastName)}`, inline: true },
        { name: "Âge RP", value: String(application.age), inline: true },
        { name: "Discord", value: `<@${user.id}>\n\`${user.id}\``, inline: true },
        { name: "Identifiant joueur", value: cleanDiscordText(application.playerId || "Non renseigné"), inline: true },
        { name: "Expérience police RP", value: application.policeExperience, inline: true },
        { name: "Disponibilités", value: cleanDiscordText(application.availability), inline: false }
      ],
      footer: { text: "Statut : Nouvelle candidature" },
      timestamp: new Date().toISOString()
    },
    { title: "Expérience RP", description: cleanDiscordText(application.experience), color: 0x183c60 },
    { title: "Motivations", description: cleanDiscordText(application.motivation), color: 0xd3aa56 },
    { title: "Qualités indispensables d’un policier", description: cleanDiscordText(application.qualities), color: 0x183c60 }
  ];
}

async function getCategory() {
  const category = await discordRequest(`/channels/${APPLICATION_CATEGORY_ID}`);
  if (!category || category.type !== CHANNEL_TYPE_CATEGORY || category.guild_id !== ACADEMY_GUILD_ID) {
    throw new AcademyError("invalid_ticket_category", 503);
  }
  return category;
}

async function ensureCandidateIsMember(userId) {
  try {
    return await discordRequest(`/guilds/${ACADEMY_GUILD_ID}/members/${userId}`);
  } catch (error) {
    if (error.discordStatus === 404) throw new AcademyError("academy_membership_required", 403);
    throw error;
  }
}

async function findActiveApplication(userId) {
  const channels = await discordRequest(`/guilds/${ACADEMY_GUILD_ID}/channels`);
  return channels.find(channel => channel.parent_id === APPLICATION_CATEGORY_ID
    && typeof channel.topic === "string"
    && channel.topic.includes(`candidate:${userId}`)
    && channel.topic.includes("status:active"));
}

function applicationIdFromChannel(channelId) {
  return `PA-${channelId.slice(-6)}`;
}

async function createApplicationTicket(user, application) {
  await ensureCandidateIsMember(user.id);
  const active = await findActiveApplication(user.id);
  if (active) {
    throw new AcademyError("active_application", 409, JSON.stringify({
      channelId: active.id,
      applicationId: applicationIdFromChannel(active.id)
    }));
  }

  const category = await getCategory();
  const inheritedOverwrites = Array.isArray(category.permission_overwrites)
    ? category.permission_overwrites.filter(overwrite => overwrite.id !== user.id)
    : [];

  let channel = null;
  try {
    channel = await discordRequest(`/guilds/${ACADEMY_GUILD_ID}/channels`, {
      method: "POST",
      headers: { "X-Audit-Log-Reason": encodeURIComponent(`Candidature web de ${user.username} (${user.id})`) },
      body: JSON.stringify({
        name: channelSlug(application.firstName, application.lastName, user.id),
        type: CHANNEL_TYPE_TEXT,
        parent_id: APPLICATION_CATEGORY_ID,
        topic: `candidate:${user.id} | status:active | création en cours`,
        permission_overwrites: [
          ...inheritedOverwrites,
          { id: user.id, type: MEMBER_OVERWRITE, allow: CANDIDATE_PERMISSIONS, deny: "0" }
        ]
      })
    });

    const applicationId = applicationIdFromChannel(channel.id);
    await discordRequest(`/channels/${channel.id}`, {
      method: "PATCH",
      body: JSON.stringify({ topic: `${applicationId} | candidate:${user.id} | status:active | ${application.firstName} ${application.lastName}` })
    });

    await discordRequest(`/channels/${channel.id}/messages`, {
      method: "POST",
      body: JSON.stringify({
        content: `<@${user.id}>, votre candidature **${applicationId}** a bien été créée. L’équipe Police Academy vous répondra dans ce salon.`,
        embeds: applicationEmbeds(applicationId, user, application),
        components: [
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 4,
                label: "Clore le ticket",
                custom_id: CLOSE_TICKET_BUTTON_ID,
                emoji: { name: "🔒" }
              }
            ]
          }
        ],
        allowed_mentions: { parse: [], users: [user.id] }
      })
    });

    return {
      applicationId,
      channelId: channel.id,
      channelUrl: `https://discord.com/channels/${ACADEMY_GUILD_ID}/${channel.id}`
    };
  } catch (error) {
    if (channel?.id) {
      await discordRequest(`/channels/${channel.id}`, { method: "DELETE" }).catch(() => {});
    }
    throw error;
  }
}

module.exports = {
  ACADEMY_GUILD_ID,
  APPLICATION_CATEGORY_ID,
  CLOSE_TICKET_BUTTON_ID,
  AcademyError,
  validateApplication,
  channelSlug,
  applicationIdFromChannel,
  createApplicationTicket
};
