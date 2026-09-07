const { neon } = require("@neondatabase/serverless");
const { AcademyError, validateApplication } = require("../../server/academy");
const { getConfig, publicRecruitmentConfig } = require("../../server/admin-config");
const { readSession } = require("../../server/candidate-auth");
const { ensureTicketSchema, createForApplication, storedApplication } = require("../../server/recruitment-tickets");

function bodyFromRequest(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { throw new AcademyError("invalid_json", 400); }
  }
  throw new AcademyError("invalid_json", 400);
}

function publicId(id) {
  return `PA-${String(id).padStart(6, "0")}`;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "GET") {
    const current = await getConfig();
    return res.status(200).json({ ok: true, recruitment: publicRecruitmentConfig(current.value) });
  }
  if (req.method !== "POST") return res.status(405).json({ ok: false, code: "method_not_allowed" });
  const candidateSession = readSession(req);
  if (!candidateSession?.user?.id) return res.status(401).json({ ok: false, code: "candidate_login_required" });
  if (!process.env.DATABASE_URL) return res.status(503).json({ ok: false, code: "database_not_configured" });
  if (Number(req.headers["content-length"] || 0) > 30000) return res.status(413).json({ ok: false, code: "payload_too_large" });

  try {
    const settings = (await getConfig({ fresh: true })).value.recruitment;
    if (!settings.enabled) return res.status(403).json({ ok: false, code: "recruitment_closed" });
    const application = validateApplication({ ...bodyFromRequest(req), discordId: String(candidateSession.user.id) });
    const phoneNormalized = application.phone.replace(/\D/g, "");
    const sql = neon(process.env.DATABASE_URL);
    await ensureTicketSchema(sql);
    const existing = await sql`
      SELECT * FROM academy_recruitment_applications
      WHERE (candidate_discord_id = ${candidateSession.user.id} OR (${phoneNormalized} <> '' AND phone_normalized = ${phoneNormalized}))
        AND status NOT IN ('processed', 'archived')
        AND created_at >= NOW() - INTERVAL '30 days'
      ORDER BY created_at DESC LIMIT 1
    `;
    if (existing.length) {
      const row = existing[0];
      if (row.candidate_discord_id !== candidateSession.user.id) return res.status(409).json({ok:false,code:"active_application"});
      const ticket = await createForApplication(sql,row,candidateSession.user,storedApplication(row));
      return res.status(200).json({ ok: true, existing:true, applicationId: publicId(row.id), ...ticket });
    }

    const [created] = await sql`
      INSERT INTO academy_recruitment_applications (
        first_name, last_name, age, phone, phone_normalized, police_experience,
        experience, availability, motivation, qualities, status, decision,
        candidate_discord_id, created_at, updated_at
      ) VALUES (
        ${application.firstName}, ${application.lastName}, ${application.age},
        ${application.phone}, ${phoneNormalized}, ${application.policeExperience},
        ${application.experience}, ${application.storageAvailability || application.availability}, ${application.motivation},
        ${application.qualities}, 'new', 'pending', ${candidateSession.user.id}, NOW(), NOW()
      ) RETURNING *
    `;
    const applicationId = publicId(created.id);

    let ticket = null;
    try {
      ticket = await createForApplication(sql, created, candidateSession.user, application);
    } catch (error) {
      console.error("Recruitment ticket creation pending", {code:error.code || "unknown"});
      return res.status(201).json({ok:true,applicationId,ticketPending:true});
    }

    return res.status(201).json({ ok: true, applicationId, ...ticket });
  } catch (error) {
    if (error instanceof AcademyError) return res.status(error.status).json({ ok: false, code: error.code });
    console.error("Recruitment application submission failed", error);
    const code = error.code === "42P01" ? "database_not_ready" : "database_error";
    return res.status(500).json({ ok: false, code });
  }
};
