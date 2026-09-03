const { neon } = require("@neondatabase/serverless");
const crypto = require("node:crypto");
const {
  env,
  siteUrl,
  createState,
  stateCookie,
  consumeState,
  clearStateCookie,
  sessionCookie,
  clearSessionCookie,
  clearAllSessionCookies,
  exchangeCode,
  getDiscordUser,
  getAcademyMember,
  hasInstructorRole,
  newSession,
  validateSession,
  validatedSessionCookie
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

const STANDARD_TRAINING_MODULES = [
  "Intégration et règlement",
  "Communications radio",
  "Contrôle routier",
  "Procédure d’interpellation",
  "Usage de la force",
  "Conduite opérationnelle",
  "Rédaction de rapports",
  "Évaluation finale"
];

const EXCLUDED_HIGH_RANKS = new Set([
  "1505209645764055100",
  "1530139558333907014",
  "1530139086474444831",
  "1540684488043143280",
  "1530139099757805741",
  "1540495833529589770"
]);

const ACADEMY_STATUSES = new Set(["a_former", "en_formation", "termine", "suspendu"]);
const TRAINING_RESULTS = new Set(["planifiee", "valide", "a_revoir", "non_valide"]);
const TICKET_STATUSES = new Set(["active", "closed", "deleted"]);
const RECRUITMENT_DECISIONS = new Set(["pending", "accepted", "refused", "withdrawn"]);
const TEMPLATE_CATEGORIES = new Set(["formation", "entretien", "physique", "connaissances", "terrain", "finale"]);
const CRITERION_TYPES = new Set(["question", "observation", "physique", "pratique", "connaissance"]);

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
  if (result.changed) res.setHeader("Set-Cookie", validatedSessionCookie(result));
  return res.status(200).json({ authenticated: true, user: result.session.user });
}

function logout(req, res) {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).end();
  res.setHeader("Set-Cookie", clearAllSessionCookies());
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

async function getCpdMember(discordId) {
  return discordBotRequest(`/guilds/${CPD_GUILD_ID}/members/${discordId}`);
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

function publicAgent(member) {
  const roles = Array.isArray(member.roles) ? member.roles : [];
  const rank = highestRecognizedRank(roles);
  if (!member.user || member.user.bot || !roles.includes(CPD_MEMBER_ROLE_ID)
    || roles.some(roleId => EXCLUDED_HIGH_RANKS.has(roleId)) || !rank) {
    return null;
  }
  return {
    discordId: member.user.id,
    displayName: member.nick || member.user.global_name || member.user.username,
    username: member.user.username,
    avatar: discordAvatar(member),
    rank: rank.name,
    rankLevel: rank.level
  };
}

function readJsonBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "object") return req.body;
  try {
    return JSON.parse(req.body);
  } catch {
    return null;
  }
}

function validSyncSecret(req) {
  const expected = String(process.env.ACADEMY_SYNC_SECRET || "");
  const provided = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!expected || !provided) return false;
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  return expectedBuffer.length === providedBuffer.length
    && crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

function textField(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function validDiscordId(value) {
  return /^\d{17,20}$/.test(String(value || ""));
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))
    && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function normalizeTrainingResult(value) {
  const result = String(value || "");
  return result === "validee" ? "valide" : result;
}

function evaluationPayload(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const templateId = String(value.templateId || "");
  const templateName = textField(value.templateName, 120);
  const criteria = Array.isArray(value.criteria) ? value.criteria.slice(0, 100).map(item => ({
    criterionId: String(item?.criterionId || "").slice(0, 30),
    section: textField(item?.section, 100),
    label: textField(item?.label, 300),
    rating: ["acquis", "partiel", "non_acquis", "non_evalue"].includes(item?.rating)
      ? item.rating : "non_evalue",
    weight: Math.min(10, Math.max(1, Number(item?.weight) || 1)),
    critical: item?.critical === true,
    note: textField(item?.note, 1000)
  })).filter(item => item.label) : [];
  if (!/^\d+$/.test(templateId) || !templateName || !criteria.length) return null;
  return {
    version: 1,
    templateId,
    templateName,
    score: Number.isInteger(value.score) ? Math.min(100, Math.max(0, value.score)) : null,
    suggestedResult: TRAINING_RESULTS.has(normalizeTrainingResult(value.suggestedResult))
      ? normalizeTrainingResult(value.suggestedResult) : null,
    criteria
  };
}

function mapTemplate(row, criteria = []) {
  return {
    id: String(row.id),
    name: row.name,
    category: row.category,
    description: row.description || "",
    active: row.is_active,
    sortOrder: Number(row.sort_order || 0),
    createdByName: row.created_by_name || "",
    updatedByName: row.updated_by_name || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    criteria
  };
}

async function trainingTemplates(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  res.setHeader("Cache-Control", "private, no-store");
  const session = await instructorAccess(req, res);
  if (!session) return;
  if (!process.env.DATABASE_URL) return res.status(503).json({ ok: false, code: "database_not_configured" });
  try {
    const sql = neon(process.env.DATABASE_URL);
    const [templates, criteria] = await Promise.all([
      sql`SELECT id, name, category, description, is_active, sort_order,
        created_by_name, updated_by_name, created_at, updated_at
        FROM academy_training_templates ORDER BY sort_order, name`,
      sql`SELECT id, template_id, section_name, label, guidance, criterion_type,
        weight, is_critical, sort_order
        FROM academy_evaluation_criteria ORDER BY template_id, sort_order, id`
    ]);
    const byTemplate = new Map();
    criteria.forEach(row => {
      const key = String(row.template_id);
      if (!byTemplate.has(key)) byTemplate.set(key, []);
      byTemplate.get(key).push({
        id: String(row.id), section: row.section_name, label: row.label,
        guidance: row.guidance || "", type: row.criterion_type,
        weight: Number(row.weight), critical: row.is_critical,
        sortOrder: Number(row.sort_order || 0)
      });
    });
    return res.status(200).json({
      ok: true,
      templates: templates.map(row => mapTemplate(row, byTemplate.get(String(row.id)) || []))
    });
  } catch (error) {
    console.error("Academy templates read failed", error);
    return res.status(500).json({ ok: false, code: error.code === "42P01" ? "templates_table_missing" : "templates_unavailable" });
  }
}

async function saveTrainingTemplate(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  res.setHeader("Cache-Control", "private, no-store");
  const session = await instructorAccess(req, res);
  if (!session) return;
  if (!process.env.DATABASE_URL) return res.status(503).json({ ok: false, code: "database_not_configured" });
  const body = readJsonBody(req);
  if (!body) return res.status(400).json({ ok: false, code: "invalid_json" });
  const id = body.id ? String(body.id) : "";
  const name = textField(body.name, 120);
  const category = String(body.category || "formation");
  const description = textField(body.description, 3000);
  const sortOrder = Math.min(10000, Math.max(0, Number(body.sortOrder) || 0));
  const criteria = Array.isArray(body.criteria) ? body.criteria.slice(0, 100).map((item, index) => ({
    section: textField(item?.section, 100) || "Évaluation",
    label: textField(item?.label, 300),
    guidance: textField(item?.guidance, 2000),
    type: CRITERION_TYPES.has(item?.type) ? item.type : "observation",
    weight: Math.min(10, Math.max(1, Number(item?.weight) || 1)),
    critical: item?.critical === true,
    sortOrder: index
  })).filter(item => item.label) : [];
  if ((id && !/^\d+$/.test(id)) || !name || !TEMPLATE_CATEGORIES.has(category)) {
    return res.status(400).json({ ok: false, code: "invalid_template" });
  }
  try {
    const sql = neon(process.env.DATABASE_URL);
    const actorName = session.user.globalName || session.user.username;
    let templateId = id;
    if (id) {
      const rows = await sql`UPDATE academy_training_templates SET name=${name}, category=${category},
        description=${description || null}, sort_order=${sortOrder}, updated_by_discord_id=${session.user.id},
        updated_by_name=${actorName}, updated_at=NOW() WHERE id=${id} RETURNING id`;
      if (!rows.length) return res.status(404).json({ ok: false, code: "template_not_found" });
      await sql`DELETE FROM academy_evaluation_criteria WHERE template_id=${id}`;
    } else {
      const [created] = await sql`INSERT INTO academy_training_templates
        (name, category, description, sort_order, created_by_discord_id, created_by_name,
        updated_by_discord_id, updated_by_name) VALUES
        (${name}, ${category}, ${description || null}, ${sortOrder}, ${session.user.id}, ${actorName},
        ${session.user.id}, ${actorName}) RETURNING id`;
      templateId = String(created.id);
    }
    for (const criterion of criteria) {
      await sql`INSERT INTO academy_evaluation_criteria
        (template_id, section_name, label, guidance, criterion_type, weight, is_critical, sort_order)
        VALUES (${templateId}, ${criterion.section}, ${criterion.label}, ${criterion.guidance || null},
        ${criterion.type}, ${criterion.weight}, ${criterion.critical}, ${criterion.sortOrder})`;
    }
    await writeActivityLog(sql, session, {
      actionType: id ? "template_updated" : "template_created",
      targetType: "template", targetId: templateId, targetName: name,
      details: { category, criteriaCount: criteria.length }
    });
    return res.status(id ? 200 : 201).json({ ok: true, id: templateId });
  } catch (error) {
    console.error("Academy template save failed", error);
    return res.status(500).json({ ok: false, code: error.code === "42P01" ? "templates_table_missing" : "template_save_failed" });
  }
}

async function toggleTrainingTemplate(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  res.setHeader("Cache-Control", "private, no-store");
  const session = await instructorAccess(req, res);
  if (!session) return;
  const body = readJsonBody(req);
  const id = String(body?.id || "");
  if (!/^\d+$/.test(id) || typeof body?.active !== "boolean") return res.status(400).json({ ok: false, code: "invalid_template_toggle" });
  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`UPDATE academy_training_templates SET is_active=${body.active},
      updated_by_discord_id=${session.user.id}, updated_by_name=${session.user.globalName || session.user.username},
      updated_at=NOW() WHERE id=${id} RETURNING id, name`;
    if (!rows.length) return res.status(404).json({ ok: false, code: "template_not_found" });
    await writeActivityLog(sql, session, {
      actionType: body.active ? "template_activated" : "template_deactivated",
      targetType: "template", targetId: id, targetName: rows[0].name, details: {}
    });
    return res.status(200).json({ ok: true, id, active: body.active });
  } catch (error) {
    console.error("Academy template toggle failed", error);
    return res.status(500).json({ ok: false, code: "template_toggle_failed" });
  }
}

async function syncAgentCompletion(sql, discordId) {
  const rows = await sql`
    SELECT training_type, result, training_date, created_at
    FROM academy_training_records
    WHERE agent_discord_id = ${discordId} AND archived_at IS NULL
    ORDER BY training_type, training_date DESC, created_at DESC
  `;
  const latestByModule = new Map();
  rows.forEach(row => {
    if (STANDARD_TRAINING_MODULES.includes(row.training_type) && !latestByModule.has(row.training_type)) {
      latestByModule.set(row.training_type, normalizeTrainingResult(row.result));
    }
  });
  const completed = STANDARD_TRAINING_MODULES.every(module => latestByModule.get(module) === "valide");
  const fallbackStatus = rows.length ? "en_formation" : "a_former";
  await sql`
    UPDATE academy_agent_files
    SET academy_status = CASE
      WHEN academy_status = 'suspendu' THEN academy_status
      WHEN ${completed} THEN 'termine'
      WHEN academy_status = 'termine' THEN ${fallbackStatus}
      ELSE academy_status
    END,
    updated_at = CASE
      WHEN academy_status <> 'suspendu' AND (
        (${completed} AND academy_status <> 'termine')
        OR (NOT ${completed} AND academy_status = 'termine')
      ) THEN NOW()
      ELSE updated_at
    END
    WHERE discord_id = ${discordId}
  `;
}

async function writeActivityLog(sql, session, entry) {
  try {
    const actorName = session.user.globalName || session.user.username || "Instructeur";
    await sql`
      INSERT INTO academy_activity_log (
        actor_discord_id, actor_name, action_type, target_type,
        target_id, target_name, details, created_at
      ) VALUES (
        ${session.user.id}, ${actorName}, ${entry.actionType}, ${entry.targetType},
        ${entry.targetId || null}, ${entry.targetName || null},
        ${JSON.stringify(entry.details || {})}::jsonb, NOW()
      )
    `;
  } catch (error) {
    console.error("Academy activity log write failed", error);
  }
}

async function instructorAccess(req, res) {
  const access = await validateSession(req, false);
  if (!access.ok) {
    res.setHeader("Set-Cookie", clearSessionCookie());
    res.status(401).json({ ok: false, code: access.reason });
    return null;
  }
  if (access.changed) res.setHeader("Set-Cookie", validatedSessionCookie(access));
  return access.session;
}

async function eligibleAgent(discordId) {
  try {
    const member = await getCpdMember(discordId);
    return publicAgent(member);
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
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
      files.general_note,
      files.updated_at,
      COUNT(trainings.id) FILTER (WHERE trainings.archived_at IS NULL)::INTEGER AS training_count
    FROM academy_agent_files AS files
    LEFT JOIN academy_training_records AS trainings
      ON trainings.agent_discord_id = files.discord_id
    GROUP BY
      files.discord_id,
      files.rp_name,
      files.matricule,
      files.academy_status,
      files.general_note,
      files.updated_at
  `;
  return new Map(rows.map(row => [row.discord_id, row]));
}

async function agentsList(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  res.setHeader("Cache-Control", "private, no-store");

  const session = await instructorAccess(req, res);
  if (!session) return;

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
        const agent = publicAgent(member);
        if (!agent) return null;
        const stored = storedFiles.get(member.user.id);
        return {
          ...agent,
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
      instructor: session.user,
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

async function trainingOverview(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  res.setHeader("Cache-Control", "private, no-store");
  const session = await instructorAccess(req, res);
  if (!session) return;
  if (!process.env.DATABASE_URL) return res.status(503).json({ ok: false, code: "database_not_configured" });

  try {
    const sql = neon(process.env.DATABASE_URL);
    const [members, storedFiles, trainingRows] = await Promise.all([
      getAllCpdMembers(),
      getStoredAgentSummaries(),
      sql`
        SELECT agent_discord_id, training_type, result, training_date, created_at
        FROM academy_training_records
        WHERE archived_at IS NULL
        ORDER BY training_date DESC, created_at DESC
      `
    ]);

    const rowsByAgent = new Map();
    trainingRows.forEach(row => {
      if (!rowsByAgent.has(row.agent_discord_id)) rowsByAgent.set(row.agent_discord_id, []);
      rowsByAgent.get(row.agent_discord_id).push(row);
    });

    const agents = members
      .map(publicAgent)
      .filter(Boolean)
      .map(agent => {
        const file = storedFiles.get(agent.discordId) || null;
        const rows = rowsByAgent.get(agent.discordId) || [];
        const latestByModule = new Map();
        rows.forEach(row => {
          if (STANDARD_TRAINING_MODULES.includes(row.training_type) && !latestByModule.has(row.training_type)) {
            latestByModule.set(row.training_type, normalizeTrainingResult(row.result));
          }
        });
        const modules = STANDARD_TRAINING_MODULES.map(name => ({
          name,
          result: latestByModule.get(name) || "non_commence"
        }));
        const validatedCount = modules.filter(module => module.result === "valide").length;
        const reviewCount = modules.filter(module => module.result === "a_revoir").length;
        const failedCount = modules.filter(module => module.result === "non_valide").length;
        const plannedCount = modules.filter(module => module.result === "planifiee").length;
        const missingCount = modules.filter(module => module.result === "non_commence").length;
        const calculatedCompleted = validatedCount === STANDARD_TRAINING_MODULES.length;
        const academyStatus = file?.academy_status === "suspendu"
          ? "suspendu"
          : calculatedCompleted
            ? "termine"
            : file?.academy_status || (rows.length ? "en_formation" : "a_former");
        return {
          ...agent,
          rpName: file?.rp_name || "",
          matricule: file?.matricule || "",
          academyStatus,
          trainingCount: Number(file?.training_count || 0),
          validatedCount,
          reviewCount,
          failedCount,
          plannedCount,
          missingCount,
          percentage: Math.round((validatedCount / STANDARD_TRAINING_MODULES.length) * 100),
          lastTrainingDate: rows[0]?.training_date || null,
          modules
        };
      })
      .sort((a, b) => {
        const priorityA = a.reviewCount > 0 || a.failedCount > 0 ? 0 : a.percentage < 100 ? 1 : 2;
        const priorityB = b.reviewCount > 0 || b.failedCount > 0 ? 0 : b.percentage < 100 ? 1 : 2;
        return priorityA - priorityB || a.percentage - b.percentage
          || b.rankLevel - a.rankLevel || a.displayName.localeCompare(b.displayName, "fr");
      });

    return res.status(200).json({
      ok: true,
      instructor: session.user,
      modules: STANDARD_TRAINING_MODULES,
      ranks: CPD_RANKS.map(rank => rank.name),
      summary: {
        total: agents.length,
        completed: agents.filter(agent => agent.academyStatus === "termine").length,
        inProgress: agents.filter(agent => agent.academyStatus === "en_formation").length,
        toReview: agents.filter(agent => agent.reviewCount > 0 || agent.failedCount > 0).length,
        notStarted: agents.filter(agent => agent.trainingCount === 0).length
      },
      agents
    });
  } catch (error) {
    console.error("Academy training overview failed", error);
    const code = error.status === 403 ? "discord_members_forbidden" : "training_overview_unavailable";
    return res.status(500).json({ ok: false, code });
  }
}

async function activityLog(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  res.setHeader("Cache-Control", "private, no-store");
  const session = await instructorAccess(req, res);
  if (!session) return;
  if (!process.env.DATABASE_URL) return res.status(503).json({ ok: false, code: "database_not_configured" });

  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`
      SELECT id, actor_discord_id, actor_name, action_type, target_type,
        target_id, target_name, details, created_at
      FROM academy_activity_log
      ORDER BY created_at DESC
      LIMIT 300
    `;
    const instructors = [...new Map(rows.map(row => [row.actor_discord_id, {
      discordId: row.actor_discord_id,
      name: row.actor_name
    }])).values()].sort((a, b) => a.name.localeCompare(b.name, "fr"));
    return res.status(200).json({
      ok: true,
      instructor: session.user,
      instructors,
      entries: rows.map(row => ({
        id: String(row.id),
        actorDiscordId: row.actor_discord_id,
        actorName: row.actor_name,
        actionType: row.action_type,
        targetType: row.target_type,
        targetId: row.target_id || "",
        targetName: row.target_name || "",
        details: row.details || {},
        createdAt: row.created_at
      }))
    });
  } catch (error) {
    console.error("Academy activity log read failed", error);
    const code = error.code === "42P01" ? "activity_table_missing" : "activity_unavailable";
    return res.status(500).json({ ok: false, code });
  }
}

async function academyDashboard(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  res.setHeader("Cache-Control", "private, no-store");
  const session = await instructorAccess(req, res);
  if (!session) return;
  if (!process.env.DATABASE_URL) return res.status(503).json({ ok: false, code: "database_not_configured" });

  try {
    const sql = neon(process.env.DATABASE_URL);
    const [members, storedFiles, reviewRows, recentRows, instructorRows, ticketRows] = await Promise.all([
      getAllCpdMembers(),
      getStoredAgentSummaries(),
      sql`
        SELECT agent_discord_id, COUNT(*)::INTEGER AS review_count
        FROM academy_training_records
        WHERE archived_at IS NULL AND result IN ('a_revoir', 'non_valide')
        GROUP BY agent_discord_id
      `,
      sql`
        SELECT trainings.id, trainings.agent_discord_id, trainings.training_type,
          trainings.training_date, trainings.result, trainings.score,
          trainings.instructor_name, trainings.created_at, files.rp_name
        FROM academy_training_records AS trainings
        LEFT JOIN academy_agent_files AS files
          ON files.discord_id = trainings.agent_discord_id
        WHERE trainings.archived_at IS NULL
        ORDER BY trainings.created_at DESC
        LIMIT 30
      `,
      sql`
        SELECT instructor_name, COUNT(*)::INTEGER AS training_count,
          MAX(created_at) AS last_activity
        FROM academy_training_records
        WHERE archived_at IS NULL
          AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY instructor_name
        ORDER BY training_count DESC, last_activity DESC
        LIMIT 6
      `,
      sql`
        SELECT COUNT(*)::INTEGER AS total,
          COUNT(*) FILTER (WHERE ticket_status = 'active')::INTEGER AS active,
          COUNT(*) FILTER (WHERE ticket_status = 'closed')::INTEGER AS closed,
          COUNT(*) FILTER (WHERE ticket_status = 'deleted')::INTEGER AS archived
        FROM academy_recruitment_tickets
      `
    ]);

    const agents = members.map(publicAgent).filter(Boolean);
    const agentsById = new Map(agents.map(agent => [agent.discordId, agent]));
    const reviewByAgent = new Map(reviewRows.map(row => [row.agent_discord_id, Number(row.review_count || 0)]));
    const eligibleFiles = agents.map(agent => ({ agent, file: storedFiles.get(agent.discordId) || null }));
    const attention = eligibleFiles
      .map(({ agent, file }) => {
        const reviewCount = reviewByAgent.get(agent.discordId) || 0;
        let reason = "";
        let priority = 4;
        if (reviewCount > 0) {
          reason = `${reviewCount} formation${reviewCount > 1 ? "s" : ""} nécessitant un suivi`;
          priority = 1;
        } else if (!file) {
          reason = "Dossier non commencé";
          priority = 2;
        } else if (Number(file.training_count || 0) === 0) {
          reason = "Aucune formation enregistrée";
          priority = 3;
        }
        return reason ? {
          discordId: agent.discordId,
          name: file?.rp_name || agent.displayName,
          rank: agent.rank,
          avatar: agent.avatar,
          reason,
          priority
        } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name, "fr"))
      .slice(0, 8);

    const reviewTotal = agents.reduce(
      (total, agent) => total + (reviewByAgent.get(agent.discordId) || 0),
      0
    );
    const ticketStats = ticketRows[0] || {};
    return res.status(200).json({
      ok: true,
      instructor: session.user,
      metrics: {
        totalAgents: agents.length,
        dossiersStarted: eligibleFiles.filter(({ file }) => Boolean(file)).length,
        inTraining: eligibleFiles.filter(({ file }) => file?.academy_status === "en_formation").length,
        completed: eligibleFiles.filter(({ file }) => file?.academy_status === "termine").length,
        withoutTraining: eligibleFiles.filter(({ file }) => !file || Number(file.training_count || 0) === 0).length,
        toReview: reviewTotal
      },
      recruitment: {
        total: Number(ticketStats.total || 0),
        active: Number(ticketStats.active || 0),
        closed: Number(ticketStats.closed || 0),
        archived: Number(ticketStats.archived || 0)
      },
      attention,
      recentTrainings: recentRows
        .filter(row => agentsById.has(row.agent_discord_id))
        .slice(0, 8)
        .map(row => ({
          id: String(row.id),
          agentDiscordId: row.agent_discord_id,
          agentName: row.rp_name || agentsById.get(row.agent_discord_id).displayName,
          trainingType: row.training_type,
          trainingDate: row.training_date,
          result: row.result,
          score: row.score,
          instructorName: row.instructor_name,
          createdAt: row.created_at
        })),
      instructorActivity: instructorRows.map(row => ({
        name: row.instructor_name,
        trainingCount: Number(row.training_count || 0),
        lastActivity: row.last_activity
      }))
    });
  } catch (error) {
    console.error("Academy dashboard failed", error);
    const code = error.status === 403 ? "discord_members_forbidden" : "dashboard_unavailable";
    return res.status(500).json({ ok: false, code });
  }
}

async function agentDetail(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  res.setHeader("Cache-Control", "private, no-store");
  const session = await instructorAccess(req, res);
  if (!session) return;

  const discordId = Array.isArray(req.query.id) ? req.query.id[0] : String(req.query.id || "");
  if (!validDiscordId(discordId)) return res.status(400).json({ ok: false, code: "invalid_agent_id" });
  if (!process.env.DATABASE_URL) return res.status(503).json({ ok: false, code: "database_not_configured" });

  try {
    const agent = await eligibleAgent(discordId);
    if (!agent) return res.status(404).json({ ok: false, code: "agent_not_eligible" });

    const sql = neon(process.env.DATABASE_URL);
    const [files, trainings] = await Promise.all([
      sql`
        SELECT discord_id, rp_name, matricule, academy_status, general_note,
          created_at, updated_at, updated_by_discord_id
        FROM academy_agent_files
        WHERE discord_id = ${discordId}
        LIMIT 1
      `,
      sql`
        SELECT id, training_type, training_date, result, score, comment,
          strengths, improvements, instructor_discord_id, instructor_name,
          created_at, updated_at, archived_at, archived_by_discord_id,
          updated_by_discord_id, updated_by_name, evaluation_data
        FROM academy_training_records
        WHERE agent_discord_id = ${discordId}
        ORDER BY training_date DESC, created_at DESC
      `
    ]);

    const file = files[0] || null;
    return res.status(200).json({
      ok: true,
      agent,
      file: {
        rpName: file?.rp_name || "",
        matricule: file?.matricule || "",
        academyStatus: file?.academy_status || "a_former",
        generalNote: file?.general_note || "",
        createdAt: file?.created_at || null,
        updatedAt: file?.updated_at || null,
        updatedByDiscordId: file?.updated_by_discord_id || null
      },
      trainings: trainings.filter(training => !training.archived_at).map(training => ({
        id: String(training.id),
        trainingType: training.training_type,
        trainingDate: training.training_date,
        result: training.result,
        score: training.score,
        comment: training.comment || "",
        strengths: training.strengths || "",
        improvements: training.improvements || "",
        instructorDiscordId: training.instructor_discord_id,
        instructorName: training.instructor_name,
        createdAt: training.created_at,
        updatedAt: training.updated_at,
        updatedByDiscordId: training.updated_by_discord_id || null,
        updatedByName: training.updated_by_name || "",
        evaluationData: training.evaluation_data || null
      })),
      archivedTrainings: trainings.filter(training => training.archived_at).map(training => ({
        id: String(training.id),
        trainingType: training.training_type,
        trainingDate: training.training_date,
        result: training.result,
        score: training.score,
        comment: training.comment || "",
        strengths: training.strengths || "",
        improvements: training.improvements || "",
        instructorDiscordId: training.instructor_discord_id,
        instructorName: training.instructor_name,
        createdAt: training.created_at,
        updatedAt: training.updated_at,
        archivedAt: training.archived_at,
        archivedByDiscordId: training.archived_by_discord_id || null,
        updatedByDiscordId: training.updated_by_discord_id || null,
        updatedByName: training.updated_by_name || "",
        evaluationData: training.evaluation_data || null
      }))
    });
  } catch (error) {
    console.error("Academy agent detail failed", error);
    const code = error.status === 403 ? "discord_members_forbidden" : "agent_detail_unavailable";
    return res.status(500).json({ ok: false, code });
  }
}

async function saveAgentFile(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  res.setHeader("Cache-Control", "private, no-store");
  const session = await instructorAccess(req, res);
  if (!session) return;
  if (!process.env.DATABASE_URL) return res.status(503).json({ ok: false, code: "database_not_configured" });

  const body = readJsonBody(req);
  if (!body) return res.status(400).json({ ok: false, code: "invalid_json" });
  const discordId = String(body.discordId || "");
  const rpName = textField(body.rpName, 100);
  const matricule = textField(body.matricule, 40);
  const academyStatus = String(body.academyStatus || "");
  const generalNote = textField(body.generalNote, 5000);
  if (!validDiscordId(discordId) || !ACADEMY_STATUSES.has(academyStatus)) {
    return res.status(400).json({ ok: false, code: "invalid_agent_file" });
  }

  try {
    const agent = await eligibleAgent(discordId);
    if (!agent) return res.status(404).json({ ok: false, code: "agent_not_eligible" });
    const sql = neon(process.env.DATABASE_URL);
    const [saved] = await sql`
      INSERT INTO academy_agent_files (
        discord_id, rp_name, matricule, academy_status, general_note,
        updated_by_discord_id, created_at, updated_at
      ) VALUES (
        ${discordId}, ${rpName || null}, ${matricule || null}, ${academyStatus},
        ${generalNote || null}, ${session.user.id}, NOW(), NOW()
      )
      ON CONFLICT (discord_id) DO UPDATE SET
        rp_name = EXCLUDED.rp_name,
        matricule = EXCLUDED.matricule,
        academy_status = EXCLUDED.academy_status,
        general_note = EXCLUDED.general_note,
        updated_by_discord_id = EXCLUDED.updated_by_discord_id,
        updated_at = NOW()
      RETURNING updated_at
    `;
    await writeActivityLog(sql, session, {
      actionType: "agent_file_updated",
      targetType: "agent",
      targetId: discordId,
      targetName: rpName || agent.displayName,
      details: { academyStatus, matricule, hasGeneralNote: Boolean(generalNote) }
    });
    return res.status(200).json({ ok: true, updatedAt: saved.updated_at });
  } catch (error) {
    console.error("Academy agent file save failed", error);
    return res.status(500).json({ ok: false, code: "agent_file_save_failed" });
  }
}

async function createTraining(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  res.setHeader("Cache-Control", "private, no-store");
  const session = await instructorAccess(req, res);
  if (!session) return;
  if (!process.env.DATABASE_URL) return res.status(503).json({ ok: false, code: "database_not_configured" });

  const body = readJsonBody(req);
  if (!body) return res.status(400).json({ ok: false, code: "invalid_json" });
  const discordId = String(body.discordId || "");
  const trainingType = textField(body.trainingType, 120);
  const trainingDate = String(body.trainingDate || "");
  const result = normalizeTrainingResult(body.result);
  const comment = textField(body.comment, 5000);
  const strengths = textField(body.strengths, 3000);
  const improvements = textField(body.improvements, 3000);
  const rawScore = body.score === "" || body.score === null || body.score === undefined
    ? null
    : Number(body.score);
  const evaluation = body.evaluationData ? evaluationPayload(body.evaluationData) : null;

  if (!validDiscordId(discordId) || !trainingType || !validDate(trainingDate)
    || !TRAINING_RESULTS.has(result) || (body.evaluationData && !evaluation)
    || (rawScore !== null && (!Number.isInteger(rawScore) || rawScore < 0 || rawScore > 100))) {
    return res.status(400).json({ ok: false, code: "invalid_training" });
  }

  try {
    const agent = await eligibleAgent(discordId);
    if (!agent) return res.status(404).json({ ok: false, code: "agent_not_eligible" });
    const sql = neon(process.env.DATABASE_URL);
    if (evaluation) {
      const templates = await sql`SELECT name FROM academy_training_templates
        WHERE id=${evaluation.templateId} AND is_active=TRUE LIMIT 1`;
      if (!templates.length || templates[0].name !== trainingType) {
        return res.status(400).json({ ok: false, code: "evaluation_template_unavailable" });
      }
    }
    await sql`
      INSERT INTO academy_agent_files (
        discord_id, academy_status, updated_by_discord_id, created_at, updated_at
      ) VALUES (${discordId}, 'en_formation', ${session.user.id}, NOW(), NOW())
      ON CONFLICT (discord_id) DO NOTHING
    `;
    const [created] = await sql`
      INSERT INTO academy_training_records (
        agent_discord_id, training_type, training_date, result, score, comment,
        strengths, improvements, instructor_discord_id, instructor_name,
        created_at, updated_at, updated_by_discord_id, updated_by_name, evaluation_data
      ) VALUES (
        ${discordId}, ${trainingType}, ${trainingDate}, ${result}, ${rawScore},
        ${comment || null}, ${strengths || null}, ${improvements || null},
        ${session.user.id}, ${session.user.globalName || session.user.username}, NOW(), NOW(),
        ${session.user.id}, ${session.user.globalName || session.user.username},
        ${evaluation ? JSON.stringify(evaluation) : null}::jsonb
      )
      RETURNING id
    `;
    await syncAgentCompletion(sql, discordId);
    await writeActivityLog(sql, session, {
      actionType: "training_created",
      targetType: "agent",
      targetId: discordId,
      targetName: agent.displayName,
      details: {
        trainingId: String(created.id), trainingType, trainingDate,
        result, score: rawScore, evaluatedWithGrid: Boolean(evaluation)
      }
    });
    return res.status(201).json({ ok: true, id: String(created.id) });
  } catch (error) {
    console.error("Academy training creation failed", error);
    const code = error.code === "23502"
      ? "optional_fields_not_nullable"
      : error.code === "23514"
        ? "training_result_constraint"
        : "training_creation_failed";
    return res.status(500).json({ ok: false, code });
  }
}

async function updateTraining(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  res.setHeader("Cache-Control", "private, no-store");
  const session = await instructorAccess(req, res);
  if (!session) return;
  if (!process.env.DATABASE_URL) return res.status(503).json({ ok: false, code: "database_not_configured" });

  const body = readJsonBody(req);
  if (!body) return res.status(400).json({ ok: false, code: "invalid_json" });
  const id = String(body.id || "");
  const discordId = String(body.discordId || "");
  const trainingType = textField(body.trainingType, 120);
  const trainingDate = String(body.trainingDate || "");
  const result = normalizeTrainingResult(body.result);
  const comment = textField(body.comment, 5000);
  const strengths = textField(body.strengths, 3000);
  const improvements = textField(body.improvements, 3000);
  const rawScore = body.score === "" || body.score === null || body.score === undefined
    ? null
    : Number(body.score);

  if (!/^\d+$/.test(id) || !validDiscordId(discordId) || !trainingType || !validDate(trainingDate)
    || !TRAINING_RESULTS.has(result) || (rawScore !== null && (!Number.isInteger(rawScore) || rawScore < 0 || rawScore > 100))) {
    return res.status(400).json({ ok: false, code: "invalid_training" });
  }

  try {
    const agent = await eligibleAgent(discordId);
    if (!agent) return res.status(404).json({ ok: false, code: "agent_not_eligible" });
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`
      UPDATE academy_training_records
      SET training_type = ${trainingType},
        training_date = ${trainingDate},
        result = ${result},
        score = ${rawScore},
        comment = ${comment || null},
        strengths = ${strengths || null},
        improvements = ${improvements || null},
        updated_at = NOW(),
        updated_by_discord_id = ${session.user.id},
        updated_by_name = ${session.user.globalName || session.user.username}
      WHERE id = ${id}
        AND agent_discord_id = ${discordId}
        AND archived_at IS NULL
      RETURNING id, updated_at
    `;
    if (!rows.length) return res.status(404).json({ ok: false, code: "training_not_found" });
    await syncAgentCompletion(sql, discordId);
    await writeActivityLog(sql, session, {
      actionType: "training_updated",
      targetType: "agent",
      targetId: discordId,
      targetName: agent.displayName,
      details: { trainingId: id, trainingType, trainingDate, result, score: rawScore }
    });
    return res.status(200).json({ ok: true, id: String(rows[0].id), updatedAt: rows[0].updated_at });
  } catch (error) {
    console.error("Academy training update failed", error);
    const code = error.code === "23502"
      ? "optional_fields_not_nullable"
      : error.code === "23514"
        ? "training_result_constraint"
        : "training_update_failed";
    return res.status(500).json({ ok: false, code });
  }
}

async function archiveTraining(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  res.setHeader("Cache-Control", "private, no-store");
  const session = await instructorAccess(req, res);
  if (!session) return;
  if (!process.env.DATABASE_URL) return res.status(503).json({ ok: false, code: "database_not_configured" });

  const body = readJsonBody(req);
  if (!body) return res.status(400).json({ ok: false, code: "invalid_json" });
  const id = String(body.id || "");
  const discordId = String(body.discordId || "");
  const archived = body.archived === true;
  if (!/^\d+$/.test(id) || !validDiscordId(discordId) || typeof body.archived !== "boolean") {
    return res.status(400).json({ ok: false, code: "invalid_archive_request" });
  }

  try {
    const agent = await eligibleAgent(discordId);
    if (!agent) return res.status(404).json({ ok: false, code: "agent_not_eligible" });
    const sql = neon(process.env.DATABASE_URL);
    const rows = archived
      ? await sql`
          UPDATE academy_training_records
          SET archived_at = NOW(), archived_by_discord_id = ${session.user.id},
            updated_at = NOW(), updated_by_discord_id = ${session.user.id},
            updated_by_name = ${session.user.globalName || session.user.username}
          WHERE id = ${id} AND agent_discord_id = ${discordId} AND archived_at IS NULL
          RETURNING id
        `
      : await sql`
          UPDATE academy_training_records
          SET archived_at = NULL, archived_by_discord_id = NULL,
            updated_at = NOW(), updated_by_discord_id = ${session.user.id},
            updated_by_name = ${session.user.globalName || session.user.username}
          WHERE id = ${id} AND agent_discord_id = ${discordId} AND archived_at IS NOT NULL
          RETURNING id
        `;
    if (!rows.length) return res.status(404).json({ ok: false, code: "training_not_found" });
    await syncAgentCompletion(sql, discordId);
    await writeActivityLog(sql, session, {
      actionType: archived ? "training_archived" : "training_restored",
      targetType: "agent",
      targetId: discordId,
      targetName: agent.displayName,
      details: { trainingId: id }
    });
    return res.status(200).json({ ok: true, archived });
  } catch (error) {
    console.error("Academy training archive failed", error);
    return res.status(500).json({ ok: false, code: "training_archive_failed" });
  }
}

async function recruitmentTickets(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  res.setHeader("Cache-Control", "private, no-store");
  const session = await instructorAccess(req, res);
  if (!session) return;
  if (!process.env.DATABASE_URL) return res.status(503).json({ ok: false, code: "database_not_configured" });

  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`
      SELECT application_id, channel_id, channel_name, candidate_discord_id,
        candidate_name, ticket_status, recruitment_decision, created_at,
        closed_at, closed_by_name, deleted_at, deleted_by_name, updated_at,
        CASE
          WHEN transcript IS NULL THEN 0
          ELSE COALESCE(jsonb_array_length(transcript->'messages'), 0)
        END AS message_count
      FROM academy_recruitment_tickets
      ORDER BY created_at DESC
    `;
    return res.status(200).json({
      ok: true,
      tickets: rows.map(row => ({
        applicationId: row.application_id,
        channelId: row.channel_id,
        channelName: row.channel_name || "",
        candidateDiscordId: row.candidate_discord_id,
        candidateName: row.candidate_name,
        ticketStatus: row.ticket_status,
        recruitmentDecision: row.recruitment_decision,
        createdAt: row.created_at,
        closedAt: row.closed_at,
        closedByName: row.closed_by_name || "",
        deletedAt: row.deleted_at,
        deletedByName: row.deleted_by_name || "",
        updatedAt: row.updated_at,
        messageCount: Number(row.message_count || 0)
      }))
    });
  } catch (error) {
    console.error("Academy recruitment tickets list failed", error);
    return res.status(500).json({ ok: false, code: "recruitment_tickets_unavailable" });
  }
}

async function recruitmentTicketDetail(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  res.setHeader("Cache-Control", "private, no-store");
  const session = await instructorAccess(req, res);
  if (!session) return;
  if (!process.env.DATABASE_URL) return res.status(503).json({ ok: false, code: "database_not_configured" });

  const applicationId = Array.isArray(req.query.id) ? req.query.id[0] : String(req.query.id || "");
  if (!/^PA-\d{4,20}$/i.test(applicationId)) {
    return res.status(400).json({ ok: false, code: "invalid_application_id" });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`
      SELECT application_id, channel_id, channel_name, candidate_discord_id,
        candidate_name, ticket_status, recruitment_decision, form_data,
        transcript, created_at, closed_at, closed_by_discord_id, closed_by_name,
        deleted_at, deleted_by_discord_id, deleted_by_name, updated_at
      FROM academy_recruitment_tickets
      WHERE application_id = ${applicationId.toUpperCase()}
      LIMIT 1
    `;
    if (!rows.length) return res.status(404).json({ ok: false, code: "recruitment_ticket_not_found" });
    const row = rows[0];
    return res.status(200).json({
      ok: true,
      ticket: {
        applicationId: row.application_id,
        channelId: row.channel_id,
        channelName: row.channel_name || "",
        candidateDiscordId: row.candidate_discord_id,
        candidateName: row.candidate_name,
        ticketStatus: row.ticket_status,
        recruitmentDecision: row.recruitment_decision,
        formData: row.form_data || null,
        transcript: row.transcript || null,
        createdAt: row.created_at,
        closedAt: row.closed_at,
        closedByDiscordId: row.closed_by_discord_id || null,
        closedByName: row.closed_by_name || "",
        deletedAt: row.deleted_at,
        deletedByDiscordId: row.deleted_by_discord_id || null,
        deletedByName: row.deleted_by_name || "",
        updatedAt: row.updated_at
      }
    });
  } catch (error) {
    console.error("Academy recruitment ticket detail failed", error);
    return res.status(500).json({ ok: false, code: "recruitment_ticket_unavailable" });
  }
}

async function saveRecruitmentDecision(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  res.setHeader("Cache-Control", "private, no-store");
  const session = await instructorAccess(req, res);
  if (!session) return;
  if (!process.env.DATABASE_URL) return res.status(503).json({ ok: false, code: "database_not_configured" });

  const body = readJsonBody(req);
  if (!body) return res.status(400).json({ ok: false, code: "invalid_json" });
  const applicationId = String(body.applicationId || "").toUpperCase();
  const decision = String(body.decision || "");
  if (!/^PA-\d{4,20}$/.test(applicationId) || !RECRUITMENT_DECISIONS.has(decision)) {
    return res.status(400).json({ ok: false, code: "invalid_recruitment_decision" });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`
      UPDATE academy_recruitment_tickets
      SET recruitment_decision = ${decision}, updated_at = NOW()
      WHERE application_id = ${applicationId}
      RETURNING application_id, candidate_name, recruitment_decision, updated_at
    `;
    if (!rows.length) return res.status(404).json({ ok: false, code: "recruitment_ticket_not_found" });
    await writeActivityLog(sql, session, {
      actionType: "recruitment_decision_updated",
      targetType: "recruitment",
      targetId: applicationId,
      targetName: rows[0].candidate_name || applicationId,
      details: { decision }
    });
    return res.status(200).json({
      ok: true,
      applicationId: rows[0].application_id,
      decision: rows[0].recruitment_decision,
      updatedAt: rows[0].updated_at,
      updatedBy: session.user.globalName || session.user.username
    });
  } catch (error) {
    console.error("Academy recruitment decision save failed", error);
    return res.status(500).json({ ok: false, code: "recruitment_decision_save_failed" });
  }
}

async function syncRecruitmentTicket(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  res.setHeader("Cache-Control", "no-store");
  if (!validSyncSecret(req)) return res.status(401).json({ ok: false, code: "invalid_sync_secret" });
  if (!process.env.DATABASE_URL) return res.status(503).json({ ok: false, code: "database_not_configured" });

  const contentLength = Number(req.headers["content-length"] || 0);
  if (contentLength > 2500000) return res.status(413).json({ ok: false, code: "transcript_too_large" });
  const body = readJsonBody(req);
  if (!body) return res.status(400).json({ ok: false, code: "invalid_json" });

  const applicationId = textField(body.applicationId, 32).toUpperCase();
  const channelId = textField(body.channelId, 32);
  const channelName = textField(body.channelName, 100);
  const candidateDiscordId = textField(body.candidateDiscordId, 32);
  const candidateName = textField(body.candidateName, 120);
  const ticketStatus = String(body.ticketStatus || "");
  const actorDiscordId = textField(body.actorDiscordId, 32);
  const actorName = textField(body.actorName, 100);
  const transcript = body.transcript && typeof body.transcript === "object" ? body.transcript : null;
  const createdAt = body.createdAt && !Number.isNaN(Date.parse(body.createdAt))
    ? new Date(body.createdAt).toISOString()
    : new Date().toISOString();

  if (!/^PA-\d{4,20}$/.test(applicationId) || !validDiscordId(channelId)
    || !validDiscordId(candidateDiscordId) || !candidateName || !TICKET_STATUSES.has(ticketStatus)
    || (actorDiscordId && !validDiscordId(actorDiscordId))) {
    return res.status(400).json({ ok: false, code: "invalid_ticket_sync" });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const transcriptJson = transcript ? JSON.stringify(transcript) : null;
    const closedAt = ticketStatus === "closed" ? new Date().toISOString() : null;
    const deletedAt = ticketStatus === "deleted" ? new Date().toISOString() : null;
    await sql`
      INSERT INTO academy_recruitment_tickets (
        application_id, channel_id, channel_name, candidate_discord_id,
        candidate_name, ticket_status, recruitment_decision, transcript,
        created_at, closed_at, closed_by_discord_id, closed_by_name,
        deleted_at, deleted_by_discord_id, deleted_by_name, updated_at
      ) VALUES (
        ${applicationId}, ${channelId}, ${channelName || null}, ${candidateDiscordId},
        ${candidateName}, ${ticketStatus}, 'pending', ${transcriptJson}::jsonb,
        ${createdAt}, ${closedAt}, ${ticketStatus === "closed" ? actorDiscordId || null : null},
        ${ticketStatus === "closed" ? actorName || null : null}, ${deletedAt},
        ${ticketStatus === "deleted" ? actorDiscordId || null : null},
        ${ticketStatus === "deleted" ? actorName || null : null}, NOW()
      )
      ON CONFLICT (application_id) DO UPDATE SET
        channel_id = EXCLUDED.channel_id,
        channel_name = EXCLUDED.channel_name,
        candidate_discord_id = EXCLUDED.candidate_discord_id,
        candidate_name = EXCLUDED.candidate_name,
        ticket_status = EXCLUDED.ticket_status,
        transcript = COALESCE(EXCLUDED.transcript, academy_recruitment_tickets.transcript),
        closed_at = CASE
          WHEN EXCLUDED.ticket_status = 'active' THEN NULL
          WHEN EXCLUDED.ticket_status = 'closed' THEN COALESCE(academy_recruitment_tickets.closed_at, EXCLUDED.closed_at)
          ELSE academy_recruitment_tickets.closed_at
        END,
        closed_by_discord_id = CASE
          WHEN EXCLUDED.ticket_status = 'active' THEN NULL
          WHEN EXCLUDED.ticket_status = 'closed' THEN COALESCE(EXCLUDED.closed_by_discord_id, academy_recruitment_tickets.closed_by_discord_id)
          ELSE academy_recruitment_tickets.closed_by_discord_id
        END,
        closed_by_name = CASE
          WHEN EXCLUDED.ticket_status = 'active' THEN NULL
          WHEN EXCLUDED.ticket_status = 'closed' THEN COALESCE(EXCLUDED.closed_by_name, academy_recruitment_tickets.closed_by_name)
          ELSE academy_recruitment_tickets.closed_by_name
        END,
        deleted_at = COALESCE(EXCLUDED.deleted_at, academy_recruitment_tickets.deleted_at),
        deleted_by_discord_id = COALESCE(EXCLUDED.deleted_by_discord_id, academy_recruitment_tickets.deleted_by_discord_id),
        deleted_by_name = COALESCE(EXCLUDED.deleted_by_name, academy_recruitment_tickets.deleted_by_name),
        updated_at = NOW()
    `;
    return res.status(200).json({ ok: true, applicationId, ticketStatus });
  } catch (error) {
    console.error("Academy ticket sync failed", error);
    return res.status(500).json({ ok: false, code: "ticket_sync_failed" });
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
    case "training-overview": return trainingOverview(req, res);
    case "activity": return activityLog(req, res);
    case "dashboard": return academyDashboard(req, res);
    case "training-templates": return trainingTemplates(req, res);
    case "training-template-save": return saveTrainingTemplate(req, res);
    case "training-template-toggle": return toggleTrainingTemplate(req, res);
    case "agent": return agentDetail(req, res);
    case "agent-save": return saveAgentFile(req, res);
    case "training-create": return createTraining(req, res);
    case "training-update": return updateTraining(req, res);
    case "training-archive": return archiveTraining(req, res);
    case "recruitment-tickets": return recruitmentTickets(req, res);
    case "recruitment-ticket": return recruitmentTicketDetail(req, res);
    case "recruitment-decision": return saveRecruitmentDecision(req, res);
    case "ticket-sync": return syncRecruitmentTicket(req, res);
    default: return res.status(404).json({ ok: false, code: "route_not_found" });
  }
};
