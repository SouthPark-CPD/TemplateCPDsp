const { readSession } = require("../../server/candidate-auth");
const { AcademyError, validateApplication, createApplicationTicket } = require("../../server/academy");

function bodyFromRequest(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { throw new AcademyError("invalid_json", 400); }
  }
  throw new AcademyError("invalid_json", 400);
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
