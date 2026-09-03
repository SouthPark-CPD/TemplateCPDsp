const { readSession } = require("../../server/candidate-auth");
const { AcademyError, validateApplication, createApplicationTicket } = require("../../server/academy");
const { neon } = require("@neondatabase/serverless");

function bodyFromRequest(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { throw new AcademyError("invalid_json", 400); }
  }
  throw new AcademyError("invalid_json", 400);
}

async function storeRecruitmentTicket(user, application, ticket) {
  if (!process.env.DATABASE_URL) return;
  const sql = neon(process.env.DATABASE_URL);
  const formData = JSON.stringify({
    firstName: application.firstName,
    lastName: application.lastName,
    age: application.age,
    playerId: application.playerId,
    policeExperience: application.policeExperience,
    experience: application.experience,
    availability: application.availability,
    motivation: application.motivation,
    qualities: application.qualities,
    discordUsername: user.username,
    discordGlobalName: user.globalName || user.username
  });
  await sql`
    INSERT INTO academy_recruitment_tickets (
      application_id, channel_id, channel_name, candidate_discord_id,
      candidate_name, ticket_status, recruitment_decision, form_data,
      created_at, updated_at
    ) VALUES (
      ${ticket.applicationId}, ${ticket.channelId}, ${ticket.channelName}, ${user.id},
      ${`${application.firstName} ${application.lastName}`}, 'active', 'pending',
      ${formData}::jsonb, NOW(), NOW()
    )
    ON CONFLICT (application_id) DO UPDATE SET
      channel_id = EXCLUDED.channel_id,
      channel_name = EXCLUDED.channel_name,
      candidate_discord_id = EXCLUDED.candidate_discord_id,
      candidate_name = EXCLUDED.candidate_name,
      ticket_status = 'active',
      form_data = EXCLUDED.form_data,
      updated_at = NOW()
  `;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ ok: false, code: "method_not_allowed" });

  const contentLength = Number(req.headers["content-length"] || 0);
  if (contentLength > 30000) return res.status(413).json({ ok: false, code: "payload_too_large" });

  const session = readSession(req);
  if (!session?.user?.id) return res.status(401).json({ ok: false, code: "candidate_login_required" });

  try {
    const application = validateApplication(bodyFromRequest(req));
    const ticket = await createApplicationTicket(session.user, application);
    try {
      await storeRecruitmentTicket(session.user, application, ticket);
    } catch (databaseError) {
      console.error("Academy ticket created but database tracking failed", databaseError);
    }
    return res.status(201).json({ ok: true, ...ticket });
  } catch (error) {
    if (error instanceof AcademyError) {
      const response = { ok: false, code: error.code };
      if (error.code === "active_application" && error.detail) {
        try {
          const existing = JSON.parse(error.detail);
          response.applicationId = existing.applicationId;
          response.channelUrl = `https://discord.com/channels/1538858756354473984/${existing.channelId}`;
        } catch {}
      }
      return res.status(error.status).json(response);
    }
    console.error("Academy submission failed", error);
    return res.status(500).json({ ok: false, code: "internal_error" });
  }
};
