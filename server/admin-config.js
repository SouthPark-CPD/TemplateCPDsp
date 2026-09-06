const DEFAULT_CONFIG = Object.freeze({
  servers: [
    { key: "cpd", label: "Serveur CPD", guildId: "1408092767963451615", enabled: true },
    { key: "academy", label: "Police Academy", guildId: "1538858756354473984", enabled: true }
  ],
  access: {
    police: { label: "Connexion policier", guildKey: "cpd", roleIds: ["1408092768026365974"], userIds: [], mode: "any" },
    academy: { label: "Police Academy", guildKey: "academy", roleIds: ["1538858756371386400"], userIds: [], mode: "any" },
    admin: { label: "Administration configuration", guildKey: "cpd", roleIds: [], userIds: [], mode: "any" }
  },
  liaison: {
    sectionLabel: "Liaison gouvernement",
    complaintKey: "complaints",
    limits: {
      messageMaxLength: 1800,
      maxAttachments: 3,
      maxAttachmentMb: 3,
      maxTotalUploadMb: 8,
      forumAutoArchiveMinutes: 10080
    },
    channels: [
      { key: "complaints", label: "Dépôts de plainte", channelId: "1473895325197406328", guildKey: "cpd", type: "forum", icon: "inbox", enabled: true, canRead: true, canWrite: true, canUpload: true, canMention: true, allowedRoleIds: [], allowedUserIds: [], sortOrder: 10 },
      { key: "doj", label: "Communication DOJ", channelId: "1489640064207032475", guildKey: "cpd", type: "text", icon: "radio", enabled: true, canRead: true, canWrite: true, canUpload: true, canMention: true, allowedRoleIds: [], allowedUserIds: [], sortOrder: 20 },
      { key: "government", label: "Liaison gouvernement", channelId: "1408092769079267379", guildKey: "cpd", type: "text", icon: "users", enabled: true, canRead: true, canWrite: true, canUpload: true, canMention: true, allowedRoleIds: [], allowedUserIds: [], sortOrder: 30 },
      { key: "lawyer", label: "Liaison avocat", channelId: "1408092768848449646", guildKey: "cpd", type: "text", icon: "users", enabled: true, canRead: true, canWrite: true, canUpload: true, canMention: true, allowedRoleIds: [], allowedUserIds: [], sortOrder: 40 }
    ]
  },
  ui: {
    siteTitle: "MDT — Chicago Police Department",
    departmentName: "CHICAGO",
    departmentSubtitle: "POLICE DEPARTMENT",
    guideUrl: "https://guidejuridiquesp.netlify.app/",
    sections: {
      mdt: { label: "MDT", enabled: true, open: true },
      academy: { label: "Police Academy", enabled: true, open: true },
      liaison: { label: "Liaison gouvernement", enabled: true, open: true }
    },
    mdtItems: [
      { key: "rapide", label: "Accès rapide", icon: "grid", enabled: true, sortOrder: 10 },
      { key: "procedures", label: "Procédures", icon: "book", enabled: true, sortOrder: 20 },
      { key: "radio", label: "Radio", icon: "radio", enabled: true, sortOrder: 30 },
      { key: "reglement", label: "Règlement", icon: "list", enabled: true, sortOrder: 40 },
      { key: "tenues", label: "Tenues", icon: "users", enabled: true, sortOrder: 50 },
      { key: "organigramme", label: "Organigramme", icon: "chart", enabled: true, sortOrder: 60 }
    ],
    academyItems: [
      { key: "pa", label: "Tableau de bord", icon: "grid", enabled: true, sortOrder: 10 },
      { key: "suivi", label: "Suivi pédagogique", icon: "chart", enabled: true, sortOrder: 20 },
      { key: "formations", label: "Formations", icon: "book", enabled: true, sortOrder: 30 },
      { key: "recrutements", label: "Recrutements", icon: "inbox", enabled: true, sortOrder: 40 },
      { key: "activite", label: "Historique", icon: "clock", enabled: true, sortOrder: 50 }
    ]
  },
  notifications: {
    showBadges: true,
    showAcademyBadge: true,
    showLiaisonBadge: true,
    refreshSeconds: 15
  },
  recruitment: {
    enabled: true,
    notificationEnabled: true,
    title: "Rejoindre le CPD",
    intro: "Les informations demandées concernent uniquement votre personnage RP.",
    closedMessage: "Les recrutements sont momentanément fermés.",
    submitLabel: "Envoyer ma candidature →",
    notificationGuildKey: "cpd",
    notificationChannelId: ""
  }
});

let cache = { expires: 0, value: null, version: 0 };
let schemaPromise = null;

const discordId = value => /^\d{17,20}$/.test(String(value || "")) ? String(value) : "";
const shortText = (value, max = 80) => String(value || "").trim().slice(0, max);
const slug = value => shortText(value, 40).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
const boolean = (value, fallback = true) => typeof value === "boolean" ? value : fallback;
const allowedIcons = new Set(["grid", "users", "chart", "book", "inbox", "clock", "radio", "list"]);

function safeUrl(value, fallback) {
  try {
    const url = new URL(String(value || ""));
    return ["http:", "https:"].includes(url.protocol) ? url.href.slice(0, 400) : fallback;
  } catch {
    return fallback;
  }
}

function sanitizeMenuItems(input, fallback) {
  const source = Array.isArray(input) ? input : fallback;
  const seen = new Set();
  return source.slice(0, 30).map((item, index) => {
    const key = slug(item?.key);
    if (!key || seen.has(key)) return null;
    seen.add(key);
    return {
      key,
      label: shortText(item?.label, 70) || fallback[index]?.label || key,
      icon: allowedIcons.has(item?.icon) ? item.icon : (fallback[index]?.icon || "list"),
      enabled: boolean(item?.enabled),
      sortOrder: Math.min(9999, Math.max(0, Number(item?.sortOrder) || (index + 1) * 10))
    };
  }).filter(Boolean).sort((a, b) => a.sortOrder - b.sortOrder);
}

function cloneDefault() {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

function sanitizeConfig(input) {
  const fallback = cloneDefault();
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const serverKeys = new Set();
  const servers = (Array.isArray(source.servers) ? source.servers : fallback.servers).slice(0, 12).map((item, index) => {
    const key = slug(item?.key) || `server-${index + 1}`;
    if (serverKeys.has(key)) return null;
    serverKeys.add(key);
    return { key, label: shortText(item?.label, 80) || `Serveur ${index + 1}`, guildId: discordId(item?.guildId), enabled: boolean(item?.enabled) };
  }).filter(item => item && item.guildId);
  if (!servers.length) servers.push(...fallback.servers);
  const validServerKeys = new Set(servers.map(item => item.key));

  const access = {};
  for (const name of ["police", "academy", "admin"]) {
    const item = source.access?.[name] || fallback.access[name];
    const fallbackItem = fallback.access[name];
    const guildKey = validServerKeys.has(String(item.guildKey || ""))
      ? String(item.guildKey)
      : (validServerKeys.has(fallbackItem.guildKey) ? fallbackItem.guildKey : servers[0].key);
    access[name] = {
      label: shortText(item.label, 100) || fallbackItem.label,
      guildKey,
      roleIds: [...new Set((Array.isArray(item.roleIds) ? item.roleIds : []).map(discordId).filter(Boolean))].slice(0, 30),
      userIds: [...new Set((Array.isArray(item.userIds) ? item.userIds : []).map(discordId).filter(Boolean))].slice(0, 30),
      mode: item.mode === "all" ? "all" : "any"
    };
  }

  const channelKeys = new Set();
  const channels = (Array.isArray(source.liaison?.channels) ? source.liaison.channels : fallback.liaison.channels).slice(0, 30).map((item, index) => {
    const key = slug(item?.key) || `liaison-${index + 1}`;
    if (channelKeys.has(key)) return null;
    channelKeys.add(key);
    return {
      key,
      label: shortText(item?.label, 90) || `Canal ${index + 1}`,
      channelId: discordId(item?.channelId),
      guildKey: validServerKeys.has(String(item?.guildKey || "")) ? String(item.guildKey) : servers[0].key,
      type: item?.type === "forum" ? "forum" : "text",
      icon: ["inbox", "radio", "users", "book", "list"].includes(item?.icon) ? item.icon : "users",
      enabled: boolean(item?.enabled),
      canRead: boolean(item?.canRead),
      canWrite: boolean(item?.canWrite),
      canUpload: boolean(item?.canUpload),
      canMention: boolean(item?.canMention),
      allowedRoleIds: [...new Set((Array.isArray(item?.allowedRoleIds) ? item.allowedRoleIds : []).map(discordId).filter(Boolean))].slice(0, 30),
      allowedUserIds: [...new Set((Array.isArray(item?.allowedUserIds) ? item.allowedUserIds : []).map(discordId).filter(Boolean))].slice(0, 30),
      sortOrder: Math.min(9999, Math.max(0, Number(item?.sortOrder) || (index + 1) * 10))
    };
  }).filter(item => item && item.channelId);

  const validChannelKeys = new Set(channels.map(item => item.key));
  const sourceLimits = source.liaison?.limits && typeof source.liaison.limits === "object" ? source.liaison.limits : {};
  const allowedArchiveDurations = new Set([60, 1440, 4320, 10080]);
  const messageMaxLength = Math.min(1800, Math.max(200, Number(sourceLimits.messageMaxLength) || fallback.liaison.limits.messageMaxLength));
  const maxAttachments = Math.min(8, Math.max(0, Number.isFinite(Number(sourceLimits.maxAttachments)) ? Math.floor(Number(sourceLimits.maxAttachments)) : fallback.liaison.limits.maxAttachments));
  const maxAttachmentMb = Math.min(8, Math.max(1, Number(sourceLimits.maxAttachmentMb) || fallback.liaison.limits.maxAttachmentMb));
  const maxTotalUploadMb = Math.min(20, Math.max(maxAttachmentMb, Number(sourceLimits.maxTotalUploadMb) || fallback.liaison.limits.maxTotalUploadMb));
  const forumAutoArchiveMinutes = allowedArchiveDurations.has(Number(sourceLimits.forumAutoArchiveMinutes))
    ? Number(sourceLimits.forumAutoArchiveMinutes)
    : fallback.liaison.limits.forumAutoArchiveMinutes;
  const sourceUi = source.ui && typeof source.ui === "object" ? source.ui : {};
  const fallbackUi = fallback.ui;
  const sourceSections = sourceUi.sections && typeof sourceUi.sections === "object" ? sourceUi.sections : {};
  const sections = {};
  for (const key of ["mdt", "academy", "liaison"]) {
    const item = sourceSections[key] || fallbackUi.sections[key];
    sections[key] = {
      label: shortText(item.label, 70) || fallbackUi.sections[key].label,
      enabled: boolean(item.enabled),
      open: boolean(item.open)
    };
  }
  const sourceNotifications = source.notifications && typeof source.notifications === "object" ? source.notifications : {};
  const sourceRecruitment = source.recruitment && typeof source.recruitment === "object" ? source.recruitment : {};
  const recruitmentGuildKey = validServerKeys.has(String(sourceRecruitment.notificationGuildKey || ""))
    ? String(sourceRecruitment.notificationGuildKey)
    : (validServerKeys.has(fallback.recruitment.notificationGuildKey) ? fallback.recruitment.notificationGuildKey : servers[0].key);
  const defaultComplaintKey = validChannelKeys.has(fallback.liaison.complaintKey)
    ? fallback.liaison.complaintKey
    : (channels.find(channel => channel.type === "forum")?.key || "");

  return {
    servers,
    access,
    liaison: {
      sectionLabel: shortText(source.liaison?.sectionLabel, 80) || fallback.liaison.sectionLabel,
      complaintKey: validChannelKeys.has(String(source.liaison?.complaintKey || ""))
        ? String(source.liaison.complaintKey)
        : defaultComplaintKey,
      limits: {
        messageMaxLength,
        maxAttachments,
        maxAttachmentMb,
        maxTotalUploadMb,
        forumAutoArchiveMinutes
      },
      channels: channels.length ? channels.sort((a, b) => a.sortOrder - b.sortOrder) : fallback.liaison.channels
    },
    ui: {
      siteTitle: shortText(sourceUi.siteTitle, 120) || fallbackUi.siteTitle,
      departmentName: shortText(sourceUi.departmentName, 40) || fallbackUi.departmentName,
      departmentSubtitle: shortText(sourceUi.departmentSubtitle, 80) || fallbackUi.departmentSubtitle,
      guideUrl: safeUrl(sourceUi.guideUrl, fallbackUi.guideUrl),
      sections,
      mdtItems: sanitizeMenuItems(sourceUi.mdtItems, fallbackUi.mdtItems),
      academyItems: sanitizeMenuItems(sourceUi.academyItems, fallbackUi.academyItems)
    },
    notifications: {
      showBadges: boolean(sourceNotifications.showBadges, fallback.notifications.showBadges),
      showAcademyBadge: boolean(sourceNotifications.showAcademyBadge, fallback.notifications.showAcademyBadge),
      showLiaisonBadge: boolean(sourceNotifications.showLiaisonBadge, fallback.notifications.showLiaisonBadge),
      refreshSeconds: Math.min(120, Math.max(5, Number(sourceNotifications.refreshSeconds) || fallback.notifications.refreshSeconds))
    },
    recruitment: {
      enabled: boolean(sourceRecruitment.enabled, fallback.recruitment.enabled),
      notificationEnabled: boolean(sourceRecruitment.notificationEnabled, fallback.recruitment.notificationEnabled),
      title: shortText(sourceRecruitment.title, 120) || fallback.recruitment.title,
      intro: shortText(sourceRecruitment.intro, 500) || fallback.recruitment.intro,
      closedMessage: shortText(sourceRecruitment.closedMessage, 500) || fallback.recruitment.closedMessage,
      submitLabel: shortText(sourceRecruitment.submitLabel, 80) || fallback.recruitment.submitLabel,
      notificationGuildKey: recruitmentGuildKey,
      notificationChannelId: discordId(sourceRecruitment.notificationChannelId)
    }
  };
}

function sqlClient() {
  if (!process.env.DATABASE_URL) return null;
  const { neon } = require("@neondatabase/serverless");
  return neon(process.env.DATABASE_URL);
}

async function ensureSchema(sql) {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS cpd_admin_config (
        config_key VARCHAR(40) PRIMARY KEY,
        version INTEGER NOT NULL DEFAULT 1,
        config JSONB NOT NULL,
        updated_by_id VARCHAR(32),
        updated_by_name VARCHAR(120),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS cpd_admin_config_history (
        id BIGSERIAL PRIMARY KEY,
        config_key VARCHAR(40) NOT NULL,
        version INTEGER NOT NULL,
        config JSONB NOT NULL,
        changed_by_id VARCHAR(32),
        changed_by_name VARCHAR(120),
        change_summary VARCHAR(240),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`CREATE INDEX IF NOT EXISTS cpd_admin_config_history_key_created_idx
        ON cpd_admin_config_history(config_key, created_at DESC)`;
      await sql`CREATE TABLE IF NOT EXISTS cpd_admin_users (
        discord_id VARCHAR(32) PRIMARY KEY,
        display_name VARCHAR(120),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        added_by_id VARCHAR(32),
        added_by_name VARCHAR(120),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`INSERT INTO cpd_admin_config (config_key, version, config, updated_by_name)
        VALUES ('main', 1, ${JSON.stringify(DEFAULT_CONFIG)}::jsonb, 'Configuration initiale')
        ON CONFLICT (config_key) DO NOTHING`;
    })().catch(error => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

async function getConfig(options = {}) {
  if (!options.fresh && cache.value && cache.expires > Date.now()) return cache;
  const sql = sqlClient();
  if (!sql) return { value: cloneDefault(), version: 0, fallback: true, updatedAt: null, updatedByName: "" };
  try {
    await ensureSchema(sql);
    const rows = await sql`SELECT version, config, updated_at, updated_by_name FROM cpd_admin_config WHERE config_key='main' LIMIT 1`;
    const row = rows[0];
    const result = { value: sanitizeConfig(row?.config), version: Number(row?.version || 1), fallback: false, updatedAt: row?.updated_at || null, updatedByName: row?.updated_by_name || "" };
    cache = { ...result, expires: Date.now() + 15000 };
    return result;
  } catch (error) {
    console.error("Admin configuration unavailable", { code: error.code || "unknown" });
    return { value: cloneDefault(), version: 0, fallback: true, updatedAt: null, updatedByName: "" };
  }
}

async function saveConfig(input, actor, summary = "Configuration modifiée") {
  const sql = sqlClient();
  if (!sql) throw Object.assign(new Error("DATABASE_URL manquant"), { code: "database_not_configured" });
  await ensureSchema(sql);
  const currentRows = await sql`SELECT version, config FROM cpd_admin_config WHERE config_key='main' LIMIT 1`;
  const current = currentRows[0];
  const config = sanitizeConfig(input);
  if (current) {
    await sql`INSERT INTO cpd_admin_config_history
      (config_key, version, config, changed_by_id, changed_by_name, change_summary)
      VALUES ('main', ${Number(current.version)}, ${JSON.stringify(current.config)}::jsonb,
        ${String(actor?.id || "")}, ${String(actor?.name || "")}, ${shortText(summary, 240)})`;
  }
  const rows = await sql`UPDATE cpd_admin_config SET version=version+1, config=${JSON.stringify(config)}::jsonb,
    updated_by_id=${String(actor?.id || "")}, updated_by_name=${String(actor?.name || "")}, updated_at=NOW()
    WHERE config_key='main' RETURNING version, config, updated_at, updated_by_name`;
  const row = rows[0];
  cache = { value: sanitizeConfig(row.config), version: Number(row.version), fallback: false, updatedAt: row.updated_at, updatedByName: row.updated_by_name || "", expires: Date.now() + 15000 };
  return cache;
}

async function listHistory(limit = 50) {
  const sql = sqlClient();
  if (!sql) return [];
  await ensureSchema(sql);
  return sql`SELECT id, version, changed_by_id, changed_by_name, change_summary, created_at
    FROM cpd_admin_config_history WHERE config_key='main' ORDER BY id DESC LIMIT ${Math.min(100, Math.max(1, Number(limit) || 50))}`;
}

async function restoreConfig(historyId, actor) {
  const sql = sqlClient();
  if (!sql) throw Object.assign(new Error("DATABASE_URL manquant"), { code: "database_not_configured" });
  await ensureSchema(sql);
  const rows = await sql`SELECT id, version, config FROM cpd_admin_config_history WHERE config_key='main' AND id=${String(historyId || "0")} LIMIT 1`;
  if (!rows.length) throw Object.assign(new Error("Version introuvable"), { code: "history_not_found" });
  return saveConfig(rows[0].config, actor, `Restauration de la version ${rows[0].version}`);
}

function ownerDiscordId() {
  // The deployment variable remains supported, but the owner's ID is also
  // kept as a safe fallback so the private button is not silently hidden when
  // the variable was forgotten in Vercel.
  return discordId(process.env.CPD_ADMIN_OWNER_ID || "689050476154585139");
}

async function isControlPanelAdmin(userId) {
  const id = discordId(userId);
  if (!id) return false;
  if (ownerDiscordId() && id === ownerDiscordId()) return true;
  const sql = sqlClient();
  if (!sql) return false;
  try {
    await ensureSchema(sql);
    const rows = await sql`SELECT discord_id FROM cpd_admin_users WHERE discord_id=${id} AND is_active=TRUE LIMIT 1`;
    return rows.length > 0;
  } catch (error) {
    console.error("Admin access lookup failed", { code: error.code || "unknown" });
    return false;
  }
}

async function listAdminUsers() {
  const sql = sqlClient();
  if (!sql) return [];
  await ensureSchema(sql);
  return sql`SELECT discord_id, display_name, is_active, added_by_id, added_by_name, created_at, updated_at
    FROM cpd_admin_users ORDER BY created_at`;
}

async function addAdminUser(user, actor) {
  const id = discordId(user?.id);
  if (!id) throw Object.assign(new Error("ID Discord invalide"), { code: "invalid_discord_id" });
  if (id === ownerDiscordId()) throw Object.assign(new Error("Le propriétaire possède déjà l’accès"), { code: "owner_already_admin" });
  const sql = sqlClient();
  if (!sql) throw Object.assign(new Error("DATABASE_URL manquant"), { code: "database_not_configured" });
  await ensureSchema(sql);
  await sql`INSERT INTO cpd_admin_users (discord_id, display_name, is_active, added_by_id, added_by_name, updated_at)
    VALUES (${id}, ${shortText(user?.displayName, 120)}, TRUE, ${String(actor?.id || "")}, ${shortText(actor?.name, 120)}, NOW())
    ON CONFLICT (discord_id) DO UPDATE SET display_name=EXCLUDED.display_name, is_active=TRUE,
      added_by_id=EXCLUDED.added_by_id, added_by_name=EXCLUDED.added_by_name, updated_at=NOW()`;
}

async function removeAdminUser(userId) {
  const id = discordId(userId);
  if (!id || id === ownerDiscordId()) throw Object.assign(new Error("Administrateur protégé"), { code: "admin_protected" });
  const sql = sqlClient();
  if (!sql) throw Object.assign(new Error("DATABASE_URL manquant"), { code: "database_not_configured" });
  await ensureSchema(sql);
  await sql`UPDATE cpd_admin_users SET is_active=FALSE, updated_at=NOW() WHERE discord_id=${id}`;
}

function serverByKey(config, key) {
  return config.servers.find(item => item.key === key) || config.servers[0];
}

function accessAllowed(member, policy) {
  const roles = Array.isArray(member?.roles) ? member.roles.map(String) : [];
  const userId = String(member?.user?.id || "");
  if ((policy?.userIds || []).includes(userId)) return true;
  const required = Array.isArray(policy?.roleIds) ? policy.roleIds : [];
  if (!required.length) return false;
  return policy.mode === "all" ? required.every(id => roles.includes(id)) : required.some(id => roles.includes(id));
}

function publicLiaisonConfig(config) {
  let forumSeen = false;
  return {
    sectionLabel: config.liaison.sectionLabel,
    limits: config.liaison.limits,
    channels: config.liaison.channels.filter(item => {
      if (!item.enabled || !item.canRead) return false;
      if (item.type !== "forum") return true;
      if (forumSeen) return false;
      forumSeen = true;
      return true;
    }).map(item => ({
      key: item.key, label: item.label, channelId: item.channelId, type: item.type, icon: item.icon,
      canWrite: item.canWrite, canUpload: item.canUpload, canMention: item.canMention,
      sortOrder: item.sortOrder
    })),
    navigation: config.ui,
    notifications: config.notifications
  };
}

function publicRecruitmentConfig(config) {
  return {
    enabled: config.recruitment.enabled,
    title: config.recruitment.title,
    intro: config.recruitment.intro,
    closedMessage: config.recruitment.closedMessage,
    submitLabel: config.recruitment.submitLabel
  };
}

module.exports = { DEFAULT_CONFIG, sanitizeConfig, getConfig, saveConfig, listHistory, restoreConfig, serverByKey, accessAllowed, publicLiaisonConfig, publicRecruitmentConfig, ownerDiscordId, isControlPanelAdmin, listAdminUsers, addAdminUser, removeAdminUser };
