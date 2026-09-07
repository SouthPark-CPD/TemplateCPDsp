const { neon } = require("@neondatabase/serverless");
const { validateSession, sessionCookie, clearSessionCookie } = require("./auth");
const { getConfig, serverByKey, accessAllowed, isControlPanelAdmin } = require("./admin-config");

const DISCORD_API = "https://discord.com/api/v10";
const STATUS = new Set(["controle", "dispute", "conteste", "abandonne"]);
const THREAT = new Set(["faible", "moderee", "elevee", "critique"]);
const OPERATION = new Set(["planifiee", "active", "terminee", "annulee"]);
const WATCH = new Set(["prevue", "active", "suspendue", "terminee", "archivee"]);
let schemaPromise = null;

const text = (value, max) => String(value || "").trim().slice(0, max);
const id = value => /^\d+$/.test(String(value || "")) ? String(value) : "";
const discordId = value => /^\d{17,20}$/.test(String(value || ""));
const safeEnum = (value, allowed, fallback) => allowed.has(String(value || "")) ? String(value) : fallback;

function dossierDetails(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const limits = { phone: 80, lawyerPhone: 80, address: 300, appearance: 2000, tattoos: 1000, clothing: 1000, weapons: 1500, activities: 2000, vehicles: 1500, neighborhood: 300, allies: 1500, rivals: 1500, lastSeen: 500, status: 40, affiliation: 40, participants: 2000, objective: 3000, location: 300, instructions: 3000, startsAt: 40, endsAt: 40, observedAt: 40, observationType: 80, source: 300, photo: 300 };
  const result = {};
  for (const [key, limit] of Object.entries(limits)) if (typeof value[key] === "string") result[key] = text(value[key], limit);
  if (Array.isArray(value.links)) result.links = value.links.slice(0, 100).filter(link => ["gang", "individual", "watchlist", "report", "operation"].includes(link?.type) && id(link?.id)).map(link => ({ type: link.type, id: id(link.id) })).filter((link, index, all) => all.findIndex(other => other.type === link.type && other.id === link.id) === index);
  for (const key of ["startsAt", "endsAt", "observedAt"]) if (result[key] && Number.isNaN(Date.parse(result[key]))) delete result[key];
  return result;
}

function body(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch { return null; } }
  return {};
}

async function memberForGangAccess(userId, guildId) {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token || !discordId(userId) || !discordId(guildId)) return null;
  const response = await fetch(`${DISCORD_API}/guilds/${guildId}/members/${userId}`, { headers: { Authorization: `Bot ${token}` } });
  return response.ok ? response.json() : null;
}

async function gangUnitAccess(req, res) {
  const access = await validateSession(req, false);
  if (!access.ok) {
    res.setHeader("Set-Cookie", clearSessionCookie());
    res.status(401).json({ ok: false, code: access.reason });
    return null;
  }
  if (access.changed) res.setHeader("Set-Cookie", sessionCookie(access.session));
  const current = await getConfig();
  const policy = current.value.access.gang;
  const guild = serverByKey(current.value, policy.guildKey);
  const member = await memberForGangAccess(access.session.user?.id, guild?.guildId);
  if (!member || !accessAllowed(member, policy)) {
    res.status(403).json({ ok: false, code: "gang_unit_access_denied" });
    return null;
  }
  return { session: access.session, config: current.value };
}

async function gangUnitAdminAccess(req, res) {
  const access = await validateSession(req, false);
  if (!access.ok) {
    res.setHeader("Set-Cookie", clearSessionCookie());
    res.status(401).json({ ok: false, code: access.reason });
    return null;
  }
  if (!await isControlPanelAdmin(access.session.user?.id)) {
    res.status(403).json({ ok: false, code: "admin_access_denied" });
    return null;
  }
  if (access.changed) res.setHeader("Set-Cookie", sessionCookie(access.session));
  return { session: access.session };
}

function actor(access) {
  return { id: String(access.session.user?.id || ""), name: text(access.session.user?.globalName || access.session.user?.username, 120) || "Agent CPD" };
}

async function ensureSchema(sql) {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS gang_unit_gangs (
        id BIGSERIAL PRIMARY KEY, name VARCHAR(120) NOT NULL, aliases TEXT NOT NULL DEFAULT '', members TEXT NOT NULL DEFAULT '', color VARCHAR(20) NOT NULL DEFAULT '#c95757',
        threat_level VARCHAR(24) NOT NULL DEFAULT 'moderee', status VARCHAR(32) NOT NULL DEFAULT 'actif', notes TEXT NOT NULL DEFAULT '',
        is_archived BOOLEAN NOT NULL DEFAULT FALSE, created_by_id VARCHAR(32), created_by_name VARCHAR(120), updated_by_id VARCHAR(32), updated_by_name VARCHAR(120),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), archived_at TIMESTAMPTZ
      )`;
      await sql`ALTER TABLE gang_unit_gangs ADD COLUMN IF NOT EXISTS members TEXT NOT NULL DEFAULT ''`;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS gang_unit_gangs_active_name_idx ON gang_unit_gangs(LOWER(name)) WHERE is_archived=FALSE`;
      await sql`CREATE TABLE IF NOT EXISTS gang_unit_territories (
        id BIGSERIAL PRIMARY KEY, name VARCHAR(120) NOT NULL, gang_name VARCHAR(120) NOT NULL, color VARCHAR(20) NOT NULL DEFAULT '#c95757',
        status VARCHAR(24) NOT NULL DEFAULT 'conteste', polygon JSONB NOT NULL, notes TEXT NOT NULL DEFAULT '', is_archived BOOLEAN NOT NULL DEFAULT FALSE,
        created_by_id VARCHAR(32), created_by_name VARCHAR(120), updated_by_id VARCHAR(32), updated_by_name VARCHAR(120),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), archived_at TIMESTAMPTZ
      )`;
      await sql`CREATE INDEX IF NOT EXISTS gang_unit_territories_active_idx ON gang_unit_territories(is_archived, updated_at DESC)`;
      await sql`CREATE TABLE IF NOT EXISTS gang_unit_markers (
        id BIGSERIAL PRIMARY KEY, title VARCHAR(160) NOT NULL, marker_type VARCHAR(32) NOT NULL DEFAULT 'interest', gang_name VARCHAR(120) NOT NULL DEFAULT '',
        x NUMERIC(7,3) NOT NULL, y NUMERIC(7,3) NOT NULL, notes TEXT NOT NULL DEFAULT '', is_archived BOOLEAN NOT NULL DEFAULT FALSE,
        created_by_id VARCHAR(32), created_by_name VARCHAR(120), updated_by_id VARCHAR(32), updated_by_name VARCHAR(120), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), archived_at TIMESTAMPTZ
      )`;
      await sql`CREATE INDEX IF NOT EXISTS gang_unit_markers_active_idx ON gang_unit_markers(is_archived, updated_at DESC)`;
      await sql`CREATE TABLE IF NOT EXISTS gang_unit_individuals (
        id BIGSERIAL PRIMARY KEY, display_name VARCHAR(160) NOT NULL, aliases TEXT NOT NULL DEFAULT '', gang_id BIGINT REFERENCES gang_unit_gangs(id) ON DELETE SET NULL,
        gang_name VARCHAR(120) NOT NULL DEFAULT '', role_title VARCHAR(120) NOT NULL DEFAULT '', threat_level VARCHAR(24) NOT NULL DEFAULT 'moderee',
        vehicles TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '', is_archived BOOLEAN NOT NULL DEFAULT FALSE,
        created_by_id VARCHAR(32), created_by_name VARCHAR(120), updated_by_id VARCHAR(32), updated_by_name VARCHAR(120),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), archived_at TIMESTAMPTZ
      )`;
      await sql`CREATE INDEX IF NOT EXISTS gang_unit_individuals_active_idx ON gang_unit_individuals(is_archived, updated_at DESC)`;
      await sql`CREATE TABLE IF NOT EXISTS gang_unit_reports (
        id BIGSERIAL PRIMARY KEY, title VARCHAR(160) NOT NULL, category VARCHAR(40) NOT NULL DEFAULT 'observation', territory_id BIGINT REFERENCES gang_unit_territories(id) ON DELETE SET NULL,
        content TEXT NOT NULL, reliability VARCHAR(24) NOT NULL DEFAULT 'a_confirmer', is_archived BOOLEAN NOT NULL DEFAULT FALSE,
        created_by_id VARCHAR(32), created_by_name VARCHAR(120), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`CREATE INDEX IF NOT EXISTS gang_unit_reports_active_idx ON gang_unit_reports(is_archived, created_at DESC)`;
      await sql`ALTER TABLE gang_unit_reports ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ`;
      await sql`CREATE TABLE IF NOT EXISTS gang_unit_operations (
        id BIGSERIAL PRIMARY KEY, code_name VARCHAR(160) NOT NULL, status VARCHAR(24) NOT NULL DEFAULT 'planifiee', objective TEXT NOT NULL DEFAULT '',
        location VARCHAR(160) NOT NULL DEFAULT '', starts_at TIMESTAMPTZ, participants TEXT NOT NULL DEFAULT '', targets TEXT NOT NULL DEFAULT '', result_summary TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '', is_archived BOOLEAN NOT NULL DEFAULT FALSE,
        created_by_id VARCHAR(32), created_by_name VARCHAR(120), updated_by_id VARCHAR(32), updated_by_name VARCHAR(120), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`ALTER TABLE gang_unit_operations ADD COLUMN IF NOT EXISTS participants TEXT NOT NULL DEFAULT ''`;
      await sql`ALTER TABLE gang_unit_operations ADD COLUMN IF NOT EXISTS targets TEXT NOT NULL DEFAULT ''`;
      await sql`ALTER TABLE gang_unit_operations ADD COLUMN IF NOT EXISTS result_summary TEXT NOT NULL DEFAULT ''`;
      await sql`ALTER TABLE gang_unit_operations ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ`;
      await sql`CREATE INDEX IF NOT EXISTS gang_unit_operations_active_idx ON gang_unit_operations(is_archived, starts_at DESC NULLS LAST)`;
      await sql`CREATE TABLE IF NOT EXISTS gang_unit_watchlist (
        id BIGSERIAL PRIMARY KEY, target_type VARCHAR(24) NOT NULL DEFAULT 'individual', target_name VARCHAR(160) NOT NULL, priority VARCHAR(24) NOT NULL DEFAULT 'normale',
        reason TEXT NOT NULL DEFAULT '', status VARCHAR(24) NOT NULL DEFAULT 'active', assigned_to VARCHAR(120) NOT NULL DEFAULT '', is_archived BOOLEAN NOT NULL DEFAULT FALSE,
        created_by_id VARCHAR(32), created_by_name VARCHAR(120), updated_by_id VARCHAR(32), updated_by_name VARCHAR(120), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`CREATE INDEX IF NOT EXISTS gang_unit_watchlist_active_idx ON gang_unit_watchlist(is_archived, priority, updated_at DESC)`;
      await sql`ALTER TABLE gang_unit_watchlist ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ`;
      await sql`CREATE TABLE IF NOT EXISTS gang_unit_activity (
        id BIGSERIAL PRIMARY KEY, actor_discord_id VARCHAR(32), actor_name VARCHAR(120), action_type VARCHAR(80) NOT NULL,
        target_type VARCHAR(40) NOT NULL, target_id VARCHAR(40), target_name VARCHAR(160), details JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`CREATE INDEX IF NOT EXISTS gang_unit_activity_recent_idx ON gang_unit_activity(created_at DESC)`;
      await sql`ALTER TABLE gang_unit_gangs ADD COLUMN IF NOT EXISTS dossier_details JSONB NOT NULL DEFAULT '{}'::jsonb`;
      await sql`ALTER TABLE gang_unit_individuals ADD COLUMN IF NOT EXISTS dossier_details JSONB NOT NULL DEFAULT '{}'::jsonb`;
      await sql`ALTER TABLE gang_unit_reports ADD COLUMN IF NOT EXISTS dossier_details JSONB NOT NULL DEFAULT '{}'::jsonb`;
      await sql`ALTER TABLE gang_unit_watchlist ADD COLUMN IF NOT EXISTS dossier_details JSONB NOT NULL DEFAULT '{}'::jsonb`;
      await sql`ALTER TABLE gang_unit_operations ADD COLUMN IF NOT EXISTS dossier_details JSONB NOT NULL DEFAULT '{}'::jsonb`;
    })().catch(error => { schemaPromise = null; throw error; });
  }
  return schemaPromise;
}

async function log(sql, access, actionType, targetType, target) {
  const user = actor(access);
  await sql`INSERT INTO gang_unit_activity (actor_discord_id, actor_name, action_type, target_type, target_id, target_name, details)
    VALUES (${user.id}, ${user.name}, ${actionType}, ${targetType}, ${String(target?.id || "") || null}, ${text(target?.name, 160) || null}, ${JSON.stringify(target?.details || {})}::jsonb)`;
}

function territory(row) { return { id: String(row.id), name: row.name, gangName: row.gang_name, color: row.color, status: row.status, polygon: row.polygon, notes: row.notes || "", updatedByName: row.updated_by_name || "", createdAt: row.created_at, updatedAt: row.updated_at }; }
function marker(row) { return { id: String(row.id), title: row.title, markerType: row.marker_type, gangName: row.gang_name || "", x: Number(row.x), y: Number(row.y), notes: row.notes || "", updatedByName: row.updated_by_name || "", createdAt: row.created_at, updatedAt: row.updated_at }; }
function gang(row) { return { details: row.dossier_details || {}, id: String(row.id), name: row.name, aliases: row.aliases || "", members: row.members || "", color: row.color, threatLevel: row.threat_level, status: row.status, notes: row.notes || "", updatedByName: row.updated_by_name || "", createdAt: row.created_at, updatedAt: row.updated_at }; }
function individual(row) { return { details: row.dossier_details || {}, id: String(row.id), displayName: row.display_name, aliases: row.aliases || "", gangId: row.gang_id ? String(row.gang_id) : "", gangName: row.gang_name || "", roleTitle: row.role_title || "", threatLevel: row.threat_level, vehicles: row.vehicles || "", notes: row.notes || "", updatedByName: row.updated_by_name || "", createdAt: row.created_at, updatedAt: row.updated_at }; }
function report(row) { return { details: row.dossier_details || {}, id: String(row.id), title: row.title, category: row.category, territoryId: row.territory_id ? String(row.territory_id) : "", content: row.content, reliability: row.reliability, createdByName: row.created_by_name || "", createdAt: row.created_at, updatedAt: row.updated_at }; }
function operation(row) { return { details: row.dossier_details || {}, id: String(row.id), codeName: row.code_name, status: row.status, objective: row.objective || "", location: row.location || "", startsAt: row.starts_at, participants: row.participants || "", targets: row.targets || "", resultSummary: row.result_summary || "", notes: row.notes || "", updatedByName: row.updated_by_name || "", createdAt: row.created_at, updatedAt: row.updated_at }; }
function watch(row) { return { details: row.dossier_details || {}, id: String(row.id), targetType: row.target_type, targetName: row.target_name, priority: row.priority, reason: row.reason || "", status: row.status, assignedTo: row.assigned_to || "", updatedByName: row.updated_by_name || "", createdAt: row.created_at, updatedAt: row.updated_at }; }
function activity(row) { return { id: String(row.id), actorName: row.actor_name || "Agent", actionType: row.action_type, targetType: row.target_type, targetId: row.target_id || "", targetName: row.target_name || "", details: row.details || {}, createdAt: row.created_at }; }

async function withAccess(req, res, callback, authorize = gangUnitAccess) {
  const access = await authorize(req, res);
  if (!access) return;
  if (!process.env.DATABASE_URL) return res.status(503).json({ ok: false, code: "database_not_configured" });
  try {
    const sql = neon(process.env.DATABASE_URL);
    await ensureSchema(sql);
    return callback(sql, access);
  } catch (error) {
    console.error("Gang Unit request failed", { code: error.code || "unknown" });
    return res.status(500).json({ ok: false, code: "gang_unit_unavailable" });
  }
}

async function gangUnitData(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  return withAccess(req, res, async sql => {
    const [territories, markers, gangs, individuals, reports, operations, watchlist] = await Promise.all([
      sql`SELECT * FROM gang_unit_territories WHERE is_archived=FALSE ORDER BY updated_at DESC`,
      sql`SELECT * FROM gang_unit_markers WHERE is_archived=FALSE ORDER BY updated_at DESC`,
      sql`SELECT * FROM gang_unit_gangs WHERE is_archived=FALSE ORDER BY updated_at DESC`,
      sql`SELECT * FROM gang_unit_individuals WHERE is_archived=FALSE ORDER BY updated_at DESC`,
      sql`SELECT * FROM gang_unit_reports WHERE is_archived=FALSE ORDER BY created_at DESC LIMIT 100`,
      sql`SELECT * FROM gang_unit_operations WHERE is_archived=FALSE ORDER BY starts_at DESC NULLS LAST, updated_at DESC LIMIT 100`,
      sql`SELECT * FROM gang_unit_watchlist WHERE is_archived=FALSE ORDER BY CASE priority WHEN 'urgente' THEN 1 WHEN 'haute' THEN 2 ELSE 3 END, updated_at DESC LIMIT 100`
    ]);
    return res.status(200).json({ ok: true, territories: territories.map(territory), markers: markers.map(marker), gangs: gangs.map(gang), individuals: individuals.map(individual), reports: reports.map(report), operations: operations.map(operation), watchlist: watchlist.map(watch) });
  });
}

async function gangUnitAdminData(req, res) {
  if (req.method === "POST") return restoreEntity(req, res, gangUnitAdminAccess);
  if (req.method !== "GET") return res.status(405).end();
  return withAccess(req, res, async sql => {
    const [activityRows, archivedGangs, archivedTerritories, archivedMarkers, archivedIndividuals, archivedReports, archivedOperations, archivedWatchlist] = await Promise.all([
      sql`SELECT * FROM gang_unit_activity ORDER BY created_at DESC LIMIT 300`,
      sql`SELECT id, name, archived_at FROM gang_unit_gangs WHERE is_archived=TRUE ORDER BY archived_at DESC LIMIT 100`,
      sql`SELECT id, name, archived_at FROM gang_unit_territories WHERE is_archived=TRUE ORDER BY archived_at DESC LIMIT 100`,
      sql`SELECT id, title AS name, archived_at FROM gang_unit_markers WHERE is_archived=TRUE ORDER BY archived_at DESC LIMIT 100`,
      sql`SELECT id, display_name AS name, archived_at FROM gang_unit_individuals WHERE is_archived=TRUE ORDER BY archived_at DESC LIMIT 100`,
      sql`SELECT id, title AS name, archived_at FROM gang_unit_reports WHERE is_archived=TRUE ORDER BY archived_at DESC LIMIT 100`,
      sql`SELECT id, code_name AS name, archived_at FROM gang_unit_operations WHERE is_archived=TRUE ORDER BY archived_at DESC LIMIT 100`,
      sql`SELECT id, target_name AS name, archived_at FROM gang_unit_watchlist WHERE is_archived=TRUE ORDER BY archived_at DESC LIMIT 100`
    ]);
    const groups = [
      ["gang", archivedGangs], ["territory", archivedTerritories], ["marker", archivedMarkers], ["individual", archivedIndividuals],
      ["report", archivedReports], ["operation", archivedOperations], ["watchlist", archivedWatchlist]
    ];
    const archives = groups.flatMap(([type, rows]) => rows.map(row => ({ id: String(row.id), type, name: row.name, archivedAt: row.archived_at })))
      .sort((a, b) => new Date(b.archivedAt || 0) - new Date(a.archivedAt || 0));
    return res.status(200).json({ ok: true, activity: activityRows.map(activity), archives });
  }, gangUnitAdminAccess);
}

function polygon(value) {
  if (!Array.isArray(value) || value.length < 3 || value.length > 60) return null;
  const points = value.map(point => ({ x: Number(point?.x), y: Number(point?.y) }));
  return points.some(point => !Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.x > 100 || point.y < 0 || point.y > 100) ? null : points;
}

function territoryWriteMode(input) {
  const entityId = id(input?.id);
  if (input?.intent === "update" && !entityId) return { entityId: "", mode: "invalid-update" };
  return { entityId, mode: entityId ? "update" : "create" };
}

async function saveTerritory(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  return withAccess(req, res, async (sql, access) => {
    const input = body(req), shape = polygon(input?.polygon), name = text(input?.name, 120), gangName = text(input?.gangName, 120), write = territoryWriteMode(input), entityId = write.entityId;
    const color = /^#[0-9a-f]{6}$/i.test(String(input?.color || "")) ? String(input.color) : "#c95757";
    if (!shape || !name || !gangName) return res.status(400).json({ ok: false, code: "invalid_territory" });
    if (write.mode === "invalid-update") return res.status(400).json({ ok: false, code: "territory_update_id_required" });
    const user = actor(access), status = safeEnum(input?.status, STATUS, "conteste"), notes = text(input?.notes, 5000);
    const rows = write.mode === "update" ? await sql`UPDATE gang_unit_territories SET name=${name}, gang_name=${gangName}, color=${color}, status=${status}, polygon=${JSON.stringify(shape)}::jsonb, notes=${notes}, updated_by_id=${user.id}, updated_by_name=${user.name}, updated_at=NOW() WHERE id=${entityId} AND is_archived=FALSE RETURNING *` : await sql`INSERT INTO gang_unit_territories (name, gang_name, color, status, polygon, notes, created_by_id, created_by_name, updated_by_id, updated_by_name) VALUES (${name}, ${gangName}, ${color}, ${status}, ${JSON.stringify(shape)}::jsonb, ${notes}, ${user.id}, ${user.name}, ${user.id}, ${user.name}) RETURNING *`;
    if (!rows.length) return res.status(404).json({ ok: false, code: "territory_not_found" });
    await log(sql, access, write.mode === "update" ? "territory_updated" : "territory_created", "territory", { id: rows[0].id, name });
    return res.status(200).json({ ok: true, territory: territory(rows[0]) });
  });
}

async function saveMarker(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  return withAccess(req, res, async (sql, access) => {
    const input = body(req), entityId = id(input?.id), title = text(input?.title, 160), markerType = ["hideout", "deal", "vehicle", "incident", "meeting", "operation", "interest"].includes(input?.markerType) ? input.markerType : "interest";
    const x = Number(input?.x), y = Number(input?.y), gangName = text(input?.gangName, 120), notes = text(input?.notes, 3000);
    if (!title || !Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 100 || y < 0 || y > 100) return res.status(400).json({ ok: false, code: "invalid_marker" });
    const user = actor(access);
    const rows = entityId ? await sql`UPDATE gang_unit_markers SET title=${title}, marker_type=${markerType}, gang_name=${gangName}, x=${x}, y=${y}, notes=${notes}, updated_by_id=${user.id}, updated_by_name=${user.name}, updated_at=NOW() WHERE id=${entityId} AND is_archived=FALSE RETURNING *` : await sql`INSERT INTO gang_unit_markers (title, marker_type, gang_name, x, y, notes, created_by_id, created_by_name, updated_by_id, updated_by_name) VALUES (${title}, ${markerType}, ${gangName}, ${x}, ${y}, ${notes}, ${user.id}, ${user.name}, ${user.id}, ${user.name}) RETURNING *`;
    if (!rows.length) return res.status(404).json({ ok: false, code: "marker_not_found" });
    const [row] = rows;
    await log(sql, access, entityId ? "marker_updated" : "marker_created", "marker", { id: row.id, name: title });
    return res.status(entityId ? 200 : 201).json({ ok: true, marker: marker(row) });
  });
}

async function saveGang(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  return withAccess(req, res, async (sql, access) => {
    const input = body(req), entityId = id(input?.id), name = text(input?.name, 120), user = actor(access);
    if (!name) return res.status(400).json({ ok: false, code: "invalid_gang" });
    const color = /^#[0-9a-f]{6}$/i.test(String(input?.color || "")) ? String(input.color) : "#c95757", threat = safeEnum(input?.threatLevel, THREAT, "moderee"), status = text(input?.status, 32) || "actif", aliases = text(input?.aliases, 1000), members = text(input?.members, 3000), notes = text(input?.notes, 5000);
    const details = input?.details === undefined ? null : JSON.stringify(dossierDetails(input.details));
    const rows = entityId ? await sql`UPDATE gang_unit_gangs SET dossier_details=COALESCE(${details}::jsonb, dossier_details), name=${name}, aliases=${aliases}, members=${members}, color=${color}, threat_level=${threat}, status=${status}, notes=${notes}, updated_by_id=${user.id}, updated_by_name=${user.name}, updated_at=NOW() WHERE id=${entityId} AND is_archived=FALSE RETURNING *` : await sql`INSERT INTO gang_unit_gangs (dossier_details, name, aliases, members, color, threat_level, status, notes, created_by_id, created_by_name, updated_by_id, updated_by_name) VALUES (COALESCE(${details}::jsonb, '{}'::jsonb), ${name}, ${aliases}, ${members}, ${color}, ${threat}, ${status}, ${notes}, ${user.id}, ${user.name}, ${user.id}, ${user.name}) RETURNING *`;
    if (!rows.length) return res.status(404).json({ ok: false, code: "gang_not_found" });
    await log(sql, access, entityId ? "gang_updated" : "gang_created", "gang", { id: rows[0].id, name });
    return res.status(200).json({ ok: true, gang: gang(rows[0]) });
  });
}

async function saveIndividual(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  return withAccess(req, res, async (sql, access) => {
    const input = body(req), entityId = id(input?.id), name = text(input?.displayName, 160), user = actor(access);
    if (!name) return res.status(400).json({ ok: false, code: "invalid_individual" });
    const gangId = id(input?.gangId) || null, gangName = text(input?.gangName, 120), aliases = text(input?.aliases, 1000), roleTitle = text(input?.roleTitle, 120), threat = safeEnum(input?.threatLevel, THREAT, "moderee"), vehicles = text(input?.vehicles, 1500), notes = text(input?.notes, 5000);
    const details = input?.details === undefined ? null : JSON.stringify(dossierDetails(input.details));
    const rows = entityId ? await sql`UPDATE gang_unit_individuals SET dossier_details=COALESCE(${details}::jsonb, dossier_details), display_name=${name}, aliases=${aliases}, gang_id=${gangId}, gang_name=${gangName}, role_title=${roleTitle}, threat_level=${threat}, vehicles=${vehicles}, notes=${notes}, updated_by_id=${user.id}, updated_by_name=${user.name}, updated_at=NOW() WHERE id=${entityId} AND is_archived=FALSE RETURNING *` : await sql`INSERT INTO gang_unit_individuals (dossier_details, display_name, aliases, gang_id, gang_name, role_title, threat_level, vehicles, notes, created_by_id, created_by_name, updated_by_id, updated_by_name) VALUES (COALESCE(${details}::jsonb, '{}'::jsonb), ${name}, ${aliases}, ${gangId}, ${gangName}, ${roleTitle}, ${threat}, ${vehicles}, ${notes}, ${user.id}, ${user.name}, ${user.id}, ${user.name}) RETURNING *`;
    if (!rows.length) return res.status(404).json({ ok: false, code: "individual_not_found" });
    await log(sql, access, entityId ? "individual_updated" : "individual_created", "individual", { id: rows[0].id, name });
    return res.status(200).json({ ok: true, individual: individual(rows[0]) });
  });
}

async function saveReport(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  return withAccess(req, res, async (sql, access) => {
    const input = body(req), title = text(input?.title, 160), content = text(input?.content, 10000), territoryId = id(input?.territoryId) || null;
    if (!title || !content) return res.status(400).json({ ok: false, code: "invalid_report" });
    const category = ["observation", "operation", "source", "incident"].includes(input?.category) ? input.category : "observation", reliability = ["fiable", "a_confirmer", "incertaine"].includes(input?.reliability) ? input.reliability : "a_confirmer", user = actor(access);
    const details = JSON.stringify(dossierDetails(input?.details)), entityId = id(input?.id);
    const [row] = entityId
      ? await sql`UPDATE gang_unit_reports SET dossier_details=${details}::jsonb, title=${title}, category=${category}, territory_id=${territoryId}, content=${content}, reliability=${reliability}, updated_at=NOW() WHERE id=${entityId} AND is_archived=FALSE RETURNING *`
      : await sql`INSERT INTO gang_unit_reports (dossier_details, title, category, territory_id, content, reliability, created_by_id, created_by_name) VALUES (${details}::jsonb, ${title}, ${category}, ${territoryId}, ${content}, ${reliability}, ${user.id}, ${user.name}) RETURNING *`;
    if (!row) return res.status(404).json({ ok: false, code: "report_not_found" });
    await log(sql, access, entityId ? "report_updated" : "report_created", "report", { id: row.id, name: title });
    return res.status(entityId ? 200 : 201).json({ ok: true, report: report(row) });
  });
}

async function saveOperation(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  return withAccess(req, res, async (sql, access) => {
    const input = body(req), entityId = id(input?.id), codeName = text(input?.codeName, 160), user = actor(access);
    if (!codeName) return res.status(400).json({ ok: false, code: "invalid_operation" });
    const startsAt = input?.startsAt && !Number.isNaN(Date.parse(input.startsAt)) ? new Date(input.startsAt).toISOString() : null, status = safeEnum(input?.status, OPERATION, "planifiee"), objective = text(input?.objective, 5000), location = text(input?.location, 160), participants = text(input?.participants, 2000), targets = text(input?.targets, 2000), resultSummary = text(input?.resultSummary, 5000), notes = text(input?.notes, 5000);
    const details = input?.details === undefined ? null : JSON.stringify(dossierDetails(input.details));
    const rows = entityId ? await sql`UPDATE gang_unit_operations SET dossier_details=COALESCE(${details}::jsonb, dossier_details), code_name=${codeName}, status=${status}, objective=${objective}, location=${location}, starts_at=${startsAt}, participants=${participants}, targets=${targets}, result_summary=${resultSummary}, notes=${notes}, updated_by_id=${user.id}, updated_by_name=${user.name}, updated_at=NOW() WHERE id=${entityId} AND is_archived=FALSE RETURNING *` : await sql`INSERT INTO gang_unit_operations (dossier_details, code_name, status, objective, location, starts_at, participants, targets, result_summary, notes, created_by_id, created_by_name, updated_by_id, updated_by_name) VALUES (COALESCE(${details}::jsonb, '{}'::jsonb), ${codeName}, ${status}, ${objective}, ${location}, ${startsAt}, ${participants}, ${targets}, ${resultSummary}, ${notes}, ${user.id}, ${user.name}, ${user.id}, ${user.name}) RETURNING *`;
    if (!rows.length) return res.status(404).json({ ok: false, code: "operation_not_found" });
    await log(sql, access, entityId ? "operation_updated" : "operation_created", "operation", { id: rows[0].id, name: codeName });
    return res.status(200).json({ ok: true, operation: operation(rows[0]) });
  });
}

async function saveWatchlist(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  return withAccess(req, res, async (sql, access) => {
    const input = body(req), entityId = id(input?.id), targetName = text(input?.targetName, 160), user = actor(access);
    if (!targetName) return res.status(400).json({ ok: false, code: "invalid_watchlist" });
    const targetType = ["individual", "gang", "vehicle", "location"].includes(input?.targetType) ? input.targetType : "individual", priority = ["normale", "haute", "urgente"].includes(input?.priority) ? input.priority : "normale", status = safeEnum(input?.status, WATCH, "active"), reason = text(input?.reason, 5000), assignedTo = text(input?.assignedTo, 120);
    const details = input?.details === undefined ? null : JSON.stringify(dossierDetails(input.details));
    const rows = entityId ? await sql`UPDATE gang_unit_watchlist SET dossier_details=COALESCE(${details}::jsonb, dossier_details), target_type=${targetType}, target_name=${targetName}, priority=${priority}, reason=${reason}, status=${status}, assigned_to=${assignedTo}, updated_by_id=${user.id}, updated_by_name=${user.name}, updated_at=NOW() WHERE id=${entityId} AND is_archived=FALSE RETURNING *` : await sql`INSERT INTO gang_unit_watchlist (dossier_details, target_type, target_name, priority, reason, status, assigned_to, created_by_id, created_by_name, updated_by_id, updated_by_name) VALUES (COALESCE(${details}::jsonb, '{}'::jsonb), ${targetType}, ${targetName}, ${priority}, ${reason}, ${status}, ${assignedTo}, ${user.id}, ${user.name}, ${user.id}, ${user.name}) RETURNING *`;
    if (!rows.length) return res.status(404).json({ ok: false, code: "watchlist_not_found" });
    await log(sql, access, entityId ? "watchlist_updated" : "watchlist_created", "watchlist", { id: rows[0].id, name: targetName });
    return res.status(200).json({ ok: true, watchlist: watch(rows[0]) });
  });
}

const archiveTables = { territory: ["gang_unit_territories", "territory"], marker: ["gang_unit_markers", "marker"], gang: ["gang_unit_gangs", "gang"], individual: ["gang_unit_individuals", "individual"], report: ["gang_unit_reports", "report"], operation: ["gang_unit_operations", "operation"], watchlist: ["gang_unit_watchlist", "watchlist"] };
async function archiveEntity(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  return withAccess(req, res, async (sql, access) => {
    const input = body(req), type = String(input?.type || ""), entityId = id(input?.id), config = archiveTables[type];
    if (!config || !entityId) return res.status(400).json({ ok: false, code: "invalid_archive" });
    const user = actor(access); const [, targetType] = config;
    const rows = type === "territory"
      ? await sql`UPDATE gang_unit_territories SET is_archived=TRUE, archived_at=NOW(), updated_by_id=${user.id}, updated_by_name=${user.name}, updated_at=NOW() WHERE id=${entityId} AND is_archived=FALSE RETURNING id`
      : type === "marker"
        ? await sql`UPDATE gang_unit_markers SET is_archived=TRUE, archived_at=NOW(), updated_by_id=${user.id}, updated_by_name=${user.name}, updated_at=NOW() WHERE id=${entityId} AND is_archived=FALSE RETURNING id`
      : type === "gang"
        ? await sql`UPDATE gang_unit_gangs SET is_archived=TRUE, archived_at=NOW(), updated_by_id=${user.id}, updated_by_name=${user.name}, updated_at=NOW() WHERE id=${entityId} AND is_archived=FALSE RETURNING id`
        : type === "individual"
          ? await sql`UPDATE gang_unit_individuals SET is_archived=TRUE, archived_at=NOW(), updated_by_id=${user.id}, updated_by_name=${user.name}, updated_at=NOW() WHERE id=${entityId} AND is_archived=FALSE RETURNING id`
          : type === "report"
            ? await sql`UPDATE gang_unit_reports SET is_archived=TRUE, archived_at=NOW(), updated_at=NOW() WHERE id=${entityId} AND is_archived=FALSE RETURNING id`
            : type === "operation"
              ? await sql`UPDATE gang_unit_operations SET is_archived=TRUE, archived_at=NOW(), updated_by_id=${user.id}, updated_by_name=${user.name}, updated_at=NOW() WHERE id=${entityId} AND is_archived=FALSE RETURNING id`
              : await sql`UPDATE gang_unit_watchlist SET is_archived=TRUE, archived_at=NOW(), updated_by_id=${user.id}, updated_by_name=${user.name}, updated_at=NOW() WHERE id=${entityId} AND is_archived=FALSE RETURNING id`;
    if (!rows.length) return res.status(404).json({ ok: false, code: "entity_not_found" });
    await log(sql, access, "entity_archived", targetType, { id: entityId, name: targetType });
    return res.status(200).json({ ok: true });
  });
}

async function restoreEntity(req, res, authorize = gangUnitAccess) {
  if (req.method !== "POST") return res.status(405).end();
  return withAccess(req, res, async (sql, access) => {
    const input = body(req), type = String(input?.type || ""), entityId = id(input?.id), config = archiveTables[type];
    if (!config || !entityId) return res.status(400).json({ ok: false, code: "invalid_restore" });
    const user = actor(access);
    const rows = type === "territory"
      ? await sql`UPDATE gang_unit_territories SET is_archived=FALSE, archived_at=NULL, updated_by_id=${user.id}, updated_by_name=${user.name}, updated_at=NOW() WHERE id=${entityId} AND is_archived=TRUE RETURNING id, name`
      : type === "marker"
        ? await sql`UPDATE gang_unit_markers SET is_archived=FALSE, archived_at=NULL, updated_by_id=${user.id}, updated_by_name=${user.name}, updated_at=NOW() WHERE id=${entityId} AND is_archived=TRUE RETURNING id, title AS name`
      : type === "gang"
        ? await sql`UPDATE gang_unit_gangs SET is_archived=FALSE, archived_at=NULL, updated_by_id=${user.id}, updated_by_name=${user.name}, updated_at=NOW() WHERE id=${entityId} AND is_archived=TRUE RETURNING id, name`
        : type === "individual"
          ? await sql`UPDATE gang_unit_individuals SET is_archived=FALSE, archived_at=NULL, updated_by_id=${user.id}, updated_by_name=${user.name}, updated_at=NOW() WHERE id=${entityId} AND is_archived=TRUE RETURNING id, display_name AS name`
          : type === "report"
            ? await sql`UPDATE gang_unit_reports SET is_archived=FALSE, archived_at=NULL, updated_at=NOW() WHERE id=${entityId} AND is_archived=TRUE RETURNING id, title AS name`
            : type === "operation"
              ? await sql`UPDATE gang_unit_operations SET is_archived=FALSE, archived_at=NULL, updated_by_id=${user.id}, updated_by_name=${user.name}, updated_at=NOW() WHERE id=${entityId} AND is_archived=TRUE RETURNING id, code_name AS name`
              : await sql`UPDATE gang_unit_watchlist SET is_archived=FALSE, archived_at=NULL, updated_by_id=${user.id}, updated_by_name=${user.name}, updated_at=NOW() WHERE id=${entityId} AND is_archived=TRUE RETURNING id, target_name AS name`;
    if (!rows.length) return res.status(404).json({ ok: false, code: "entity_not_found" });
    await log(sql, access, "entity_restored", type, { id: entityId, name: rows[0].name });
    return res.status(200).json({ ok: true });
  }, authorize);
}

module.exports = { gangUnitAccess, gangUnitData, gangUnitAdminData, saveTerritory, saveMarker, saveGang, saveIndividual, saveReport, saveOperation, saveWatchlist, archiveEntity, restoreEntity, territoryWriteMode, dossierDetails };
