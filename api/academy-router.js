const { neon } = require("@neondatabase/serverless");
const {
  env,
  siteUrl,
  createState,
  stateCookie,
  consumeState,
  clearStateCookie,
  sessionCookie,
  clearSessionCookie,
  exchangeCode,
  getDiscordUser,
  getAcademyMember,
  hasInstructorRole,
  newSession,
  validateSession
} = require("../server/academy-admin-auth");

const DISCORD_API = "https://discord.com/api/v10";
const CPD_GUILD_ID = "1408092767963451615";
const CPD_MEMBER_ROLE_ID = "1408092768026365974";

const CPD_RANKS = [
  { id: "1408092768043270224", name: "Officier I", level: 1 },
  { id: "1408092768047337692", name: "Officier II", level: 2 },
  { id: "1408092768047337693", name: "Officier III", level: 3 },
  { id: "1408092768047337694", name: "Détective", level: 4 },
  { id: "1408092768047337697", name: "FTO", level: 5 },
  { id: "1408092768047337700", name: "Sergeant I", level: 6 },
  { id: "1443306212488646848", name: "Sergeant II", level: 7 },
  { id: "1408092768055595314", name: "Lieutenant I", level: 8 },
  { id: "1443306145463926895", name: "Lieutenant II", level: 9 },
  { id: "1505210763499798750", name: "Capitaine", level: 10 }
];

const EXCLUDED_HIGH_RANKS = new Set([
  "1505209645764055100",
  "1530139558333907014",
  "1530139086474444831",
  "1540684488043143280",
  "1530139099757805741",
  "1540495833529589770"
]);

function actionFromRequest(req) {
  return Array.isArray(req.query.action)
    ? req.query.action[0]
    : String(req.query.action || "");
}

function discordLogin(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  try {
    const state = createState();
    const params = new URLSearchParams({
      client_id: env().clientId,
      response_type: "code",
      redirect_uri: `${siteUrl(req)}/api/academy-admin-auth/callback`,
      scope: "identify guilds.members.read",
      state
    });
    res.setHeader("Set-Cookie", stateCookie(state));
    return res.redirect(302, `https://discord.com/oauth2/authorize?${params}`);
  } catch {
    return res.redirect(302, "/academy-auth/login.html?error=config");
  }
}

async function discordCallback(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const code = typeof req.query.code === "string" ? req.query.code : "";
  const state = typeof req.query.state === "string" ? req.query.state : "";

  if (req.query.error) return res.redirect(302, "/academy-auth/login.html?error=cancelled");
  if (!code || !consumeState(req, state)) {
    return res.redirect(302, "/academy-auth/login.html?error=invalid_state");
  }

  try {
    const tokens = await exchangeCode(req, code);
    const [user, member] = await Promise.all([
      getDiscordUser(tokens.access_token),
      getAcademyMember(tokens.access_token)
    ]);

    if (!hasInstructorRole(member)) {
      res.setHeader("Set-Cookie", [clearStateCookie(), clearSessionCookie()]);
      return res.redirect(302, "/academy-auth/denied.html");
    }

    res.setHeader("Set-Cookie", [clearStateCookie(), sessionCookie(newSession(user, tokens))]);
    return res.redirect(302, "/academy-admin/");
  } catch (error) {
    res.setHeader("Set-Cookie", [clearStateCookie(), clearSessionCookie()]);
    const reason = [401, 403, 404].includes(error.status) ? "membership" : "discord";
    return res.redirect(302, `/academy-auth/login.html?error=${reason}`);
  }
}

async function sessionStatus(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  res.setHeader("Cache-Control", "no-store");
  const result = await validateSession(req, false);
  if (!result.ok) {
    res.setHeader("Set-Cookie", clearSessionCookie());
    return res.status(401).json({ authenticated: false, reason: result.reason });
  }
  if (result.changed) res.setHeader("Set-Cookie", sessionCookie(result.session));
  return res.status(200).json({ authenticated: true, user: result.session.user });
}

function logout(req, res) {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).end();
  res.setHeader("Set-Cookie", clearSessionCookie());
  return res.redirect(302, "/");
}

async function databaseCheck(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  res.setHeader("Cache-Control", "no-store");
  if (!process.env.DATABASE_URL) {
    return res.status(503).json({ ok: false, code: "database_not_configured" });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const [result] = await sql`
      SELECT
        to_regclass('public.academy_agent_files') IS NOT NULL AS agent_files_ready,
        to_regclass('public.academy_training_records') IS NOT NULL AS training_records_ready
    `;
    const ready = Boolean(result?.agent_files_ready && result?.training_records_ready);
    return res.status(ready ? 200 : 503).json({
      ok: ready,
      database: "connected",
      tables: ready ? "ready" : "missing"
    });
  } catch (error) {
    console.error("Academy database check failed", error);
    return res.status(500).json({ ok: false, code: "database_error" });
  }
}

async function discordBotRequest(path) {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    const error = new Error("DISCORD_BOT_TOKEN manquant");
    error.code = "bot_not_configured";
    throw error;
  }

  const response = await fetch(`${DISCORD_API}${path}`, {
    headers: { Authorization: `Bot ${token}` }
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    const error = new Error(`Discord API ${response.status}: ${detail.slice(0, 180)}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

async function getAllCpdMembers() {
  const members = [];
  let after = "0";

  for (;;) {
    const page = await discordBotRequest(
      `/guilds/${CPD_GUILD_ID}/members?limit=1000&after=${encodeURIComponent(after)}`
    );
    if (!Array.isArray(page)) throw new Error("Réponse Discord invalide");
    members.push(...page);
    if (page.length < 1000) break;
    after = page[page.length - 1].user.id;
  }

  return members;
}

function highestRecognizedRank(roleIds) {
  for (let index = CPD_RANKS.length - 1; index >= 0; index -= 1) {
    if (roleIds.includes(CPD_RANKS[index].id)) return CPD_RANKS[index];
  }
  return null;
}

function discordAvatar(member) {
  const user = member.user;
  if (member.avatar) {
    return `https://cdn.discordapp.com/guilds/${CPD_GUILD_ID}/users/${user.id}/avatars/${member.avatar}.png?size=128`;
  }
  if (user.avatar) {
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
  }
  const index = user.discriminator && user.discriminator !== "0"
    ? Number(user.discriminator) % 5
    : Number((BigInt(user.id) >> 22n) % 6n);
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

async function getStoredAgentSummaries() {
  if (!process.env.DATABASE_URL) return new Map();
  const sql = neon(process.env.DATABASE_URL);
  const rows = await sql`
    SELECT
      files.discord_id,
      files.rp_name,
      files.matricule,
      files.academy_status,
      COUNT(trainings.id)::INTEGER AS training_count
    FROM academy_agent_files AS files
    LEFT JOIN academy_training_records AS trainings
      ON trainings.agent_discord_id = files.discord_id
    GROUP BY
      files.discord_id,
      files.rp_name,
      files.matricule,
      files.academy_status
  `;
  return new Map(rows.map(row => [row.discord_id, row]));
}

async function agentsList(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  res.setHeader("Cache-Control", "private, no-store");

  const access = await validateSession(req, false);
  if (!access.ok) {
    res.setHeader("Set-Cookie", clearSessionCookie());
    return res.status(401).json({ ok: false, code: access.reason });
  }
  if (access.changed) res.setHeader("Set-Cookie", sessionCookie(access.session));

  try {
    const [members, storedFiles] = await Promise.all([
      getAllCpdMembers(),
      getStoredAgentSummaries()
    ]);

    const agents = members
      .filter(member => {
        const roles = Array.isArray(member.roles) ? member.roles : [];
        return roles.includes(CPD_MEMBER_ROLE_ID)
          && !roles.some(roleId => EXCLUDED_HIGH_RANKS.has(roleId));
      })
      .map(member => {
        const roles = Array.isArray(member.roles) ? member.roles : [];
        const rank = highestRecognizedRank(roles);
        if (!rank || !member.user || member.user.bot) return null;
        const stored = storedFiles.get(member.user.id);
        return {
          discordId: member.user.id,
          displayName: member.nick || member.user.global_name || member.user.username,
          username: member.user.username,
          avatar: discordAvatar(member),
          rank: rank.name,
          rankLevel: rank.level,
          rpName: stored?.rp_name || "",
          matricule: stored?.matricule || "",
          academyStatus: stored?.academy_status || "a_former",
          trainingCount: Number(stored?.training_count || 0)
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.rankLevel - a.rankLevel || a.displayName.localeCompare(b.displayName, "fr"));

    return res.status(200).json({
      ok: true,
      total: agents.length,
      ranks: CPD_RANKS.map(rank => rank.name),
      agents
    });
  } catch (error) {
    console.error("Academy agents list failed", error);
    const code = error.code || (error.status === 403 ? "discord_members_forbidden" : "agents_unavailable");
    return res.status(500).json({ ok: false, code });
  }
}

module.exports = async function handler(req, res) {
  switch (actionFromRequest(req)) {
    case "discord": return discordLogin(req, res);
    case "callback": return discordCallback(req, res);
    case "session": return sessionStatus(req, res);
    case "logout": return logout(req, res);
    case "database-check": return databaseCheck(req, res);
    case "agents": return agentsList(req, res);
    default: return res.status(404).json({ ok: false, code: "route_not_found" });
  }
};
