const { neon } = require("@neondatabase/serverless");
const { AcademyError, validateApplication, sendRecruitmentNotification } = require("../../server/academy");

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
  if (req.method !== "POST") return res.status(405).json({ ok: false, code: "method_not_allowed" });
  if (!process.env.DATABASE_URL) return res.status(503).json({ ok: false, code: "database_not_configured" });
  if (Number(req.headers["content-length"] || 0) > 30000) return res.status(413).json({ ok: false, code: "payload_too_large" });

  try {
    const application = validateApplication(bodyFromRequest(req));
    const phoneNormalized = application.phone.replace(/\D/g, "");
    const sql = neon(process.env.DATABASE_URL);
    const existing = await sql`
      SELECT id FROM academy_recruitment_applications
      WHERE phone_normalized = ${phoneNormalized}
        AND status NOT IN ('processed', 'archived')
        AND created_at >= NOW() - INTERVAL '30 days'
      ORDER BY created_at DESC LIMIT 1
    `;
    if (existing.length) {
      return res.status(409).json({ ok: false, code: "active_application", applicationId: publicId(existing[0].id) });
    }

    const [created] = await sql`
      INSERT INTO academy_recruitment_applications (
        first_name, last_name, age, phone, phone_normalized, police_experience,
        experience, availability, motivation, qualities, status, decision,
        created_at, updated_at
      ) VALUES (
        ${application.firstName}, ${application.lastName}, ${application.age},
        ${application.phone}, ${phoneNormalized}, ${application.policeExperience},
        ${application.experience}, ${application.availability}, ${application.motivation},
        ${application.qualities}, 'new', 'pending', NOW(), NOW()
      ) RETURNING id
    `;
    const applicationId = publicId(created.id);

    let notification = { sent: false };
    try {
      notification = await sendRecruitmentNotification(applicationId, application);
      if (notification.sent) {
        await sql`UPDATE academy_recruitment_applications
          SET discord_channel_id=${notification.channelId}, discord_message_id=${notification.messageId}, updated_at=NOW()
          WHERE id=${created.id}`;
      }
    } catch (error) {
      console.error("Recruitment application saved but Discord notification failed", error);
    }

    return res.status(201).json({ ok: true, applicationId, notificationSent: notification.sent === true });
  } catch (error) {
    if (error instanceof AcademyError) return res.status(error.status).json({ ok: false, code: error.code });
    console.error("Recruitment application submission failed", error);
    const code = error.code === "42P01" ? "database_not_ready" : "database_error";
    return res.status(500).json({ ok: false, code });
  }
};
