const crypto = require("node:crypto");
const { neon } = require("@neondatabase/serverless");
const policeAuth = require("./auth");
const academyAuth = require("./academy-admin-auth");

const MAX_IMAGE_BYTES = 1_500_000;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MEDIA_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let schemaPromise = null;

function parseImagePayload(input) {
  const type = String(input?.type || "").toLowerCase();
  const name = String(input?.name || "capture.png").replace(/[\\/\0]/g, "_").slice(0, 120) || "capture.png";
  const match = String(input?.data || "").match(/^data:(image\/(?:png|jpeg|webp|gif));base64,([a-z0-9+/=\r\n]+)$/i);
  if (!match || !ALLOWED_TYPES.has(type) || match[1].toLowerCase() !== type) return { ok: false, code: "invalid_image" };
  let buffer;
  try { buffer = Buffer.from(match[2].replace(/\s/g, ""), "base64"); } catch { return { ok: false, code: "invalid_image" }; }
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) return { ok: false, code: "image_too_large" };
  const signature = type === 'image/png' ? buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    : type === 'image/jpeg' ? buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255
    : type === 'image/webp' ? buffer.length >= 12 && buffer.toString('ascii',0,4) === 'RIFF' && buffer.toString('ascii',8,12) === 'WEBP'
    : buffer.length >= 6 && ['GIF87a','GIF89a'].includes(buffer.toString('ascii',0,6));
  if (!signature) return { ok: false, code: 'invalid_image' };
  return { ok: true, type, name, buffer, base64: buffer.toString("base64"), hash: crypto.createHash("sha256").update(buffer).digest("hex") };
}

async function authorize(req, res) {
  const police = await policeAuth.validateSession(req, false);
  if (police.ok) {
    if (police.changed) res.setHeader("Set-Cookie", policeAuth.sessionCookie(police.session));
    return police.session;
  }
  const academy = await academyAuth.validateSession(req, false);
  if (!academy.ok) {
    res.status(401).json({ ok: false, code: "login_required" });
    return null;
  }
  if (academy.changed) res.setHeader("Set-Cookie", academyAuth.validatedSessionCookie(academy));
  return academy.session;
}

async function ensureSchema(sql) {
  if (!schemaPromise) schemaPromise = (async () => {
    await sql`CREATE TABLE IF NOT EXISTS cpd_pasted_images (
      id UUID PRIMARY KEY,
      mime_type VARCHAR(32) NOT NULL,
      file_name VARCHAR(120) NOT NULL,
      byte_size INTEGER NOT NULL,
      content_hash CHAR(64) NOT NULL,
      data_base64 TEXT NOT NULL,
      uploaded_by_id VARCHAR(32) NOT NULL,
      uploaded_by_name VARCHAR(120) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE INDEX IF NOT EXISTS cpd_pasted_images_uploader_idx ON cpd_pasted_images(uploaded_by_id, created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS cpd_pasted_images_hash_idx ON cpd_pasted_images(content_hash, created_at DESC)`;
  })().catch(error => { schemaPromise = null; throw error; });
  return schemaPromise;
}

async function policeMedia(req, res) {
  const session = await authorize(req, res);
  if (!session) return;
  if (!process.env.DATABASE_URL) return res.status(503).json({ ok: false, code: "database_not_configured" });
  const sql = neon(process.env.DATABASE_URL);
  try {
    await ensureSchema(sql);
    if (req.method === "GET") {
      const imageId = String(req.query.id || "");
      if (!MEDIA_ID.test(imageId)) return res.status(400).json({ ok: false, code: "invalid_media_id" });
      const [row] = await sql`SELECT mime_type, file_name, byte_size, data_base64 FROM cpd_pasted_images WHERE id=${imageId} LIMIT 1`;
      if (!row) return res.status(404).json({ ok: false, code: "media_not_found" });
      const content = Buffer.from(row.data_base64, "base64");
      res.setHeader("Content-Type", row.mime_type);
      res.setHeader("Content-Length", String(content.length));
      res.setHeader("Content-Disposition", `inline; filename="${String(row.file_name).replace(/["\r\n]/g, "_")}"`);
      res.setHeader("Cache-Control", "private, max-age=3600");
      res.setHeader("X-Content-Type-Options", "nosniff");
      return res.status(200).send(content);
    }
    if (req.method !== "POST") return res.status(405).end();
    let input = req.body;
    if (typeof input === "string") { try { input = JSON.parse(input); } catch { input = null; } }
    const parsed = parseImagePayload(input);
    if (!parsed.ok) return res.status(400).json(parsed);
    const userId = String(session.user?.id || "");
    const userName = String(session.user?.globalName || session.user?.username || "Agent CPD").slice(0, 120);
    const [rate] = await sql`SELECT COUNT(*)::int AS count FROM cpd_pasted_images WHERE uploaded_by_id=${userId} AND created_at > NOW() - INTERVAL '1 hour'`;
    if (Number(rate?.count || 0) >= 60) return res.status(429).json({ ok: false, code: "upload_rate_limited" });
    const [existing] = await sql`SELECT id FROM cpd_pasted_images WHERE content_hash=${parsed.hash} AND uploaded_by_id=${userId} AND created_at > NOW() - INTERVAL '30 days' ORDER BY created_at DESC LIMIT 1`;
    const imageId = existing?.id || crypto.randomUUID();
    if (!existing) await sql`INSERT INTO cpd_pasted_images (id, mime_type, file_name, byte_size, content_hash, data_base64, uploaded_by_id, uploaded_by_name) VALUES (${imageId}, ${parsed.type}, ${parsed.name}, ${parsed.buffer.length}, ${parsed.hash}, ${parsed.base64}, ${userId}, ${userName})`;
    return res.status(existing ? 200 : 201).json({ ok: true, id: imageId, url: `/api/police-media?id=${imageId}` });
  } catch (error) {
    console.error("Police media error", error.code || error.message);
    return res.status(500).json({ ok: false, code: "media_unavailable" });
  }
}

module.exports = { policeMedia, parseImagePayload, MEDIA_ID, MAX_IMAGE_BYTES };
