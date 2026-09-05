const {
  verifyFiveMServerSecret,
  issueFiveMTicket,
  FIVEM_TICKET_MAX_AGE
} = require("../../server/auth");

function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body.length <= 8192) {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return {};
}

module.exports = function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  res.setHeader("Cache-Control", "no-store, max-age=0");

  try {
    const providedSecret = String(req.headers["x-fivem-secret"] || "");
    if (!verifyFiveMServerSecret(providedSecret)) {
      return res.status(401).json({ ok: false, error: "unauthorized" });
    }

    const body = readBody(req);
    const discordId = String(body.discordId || "");
    const job = String(body.job || "");
    const grade = Number(body.grade || 0);

    if (!/^\d{17,20}$/.test(discordId)) {
      return res.status(400).json({ ok: false, error: "invalid_discord_id" });
    }
    if (!job || !Number.isFinite(grade)) {
      return res.status(400).json({ ok: false, error: "invalid_player_context" });
    }

    const ticket = issueFiveMTicket({
      discordId,
      license: body.license,
      job,
      grade,
      name: body.name
    });

    return res.status(200).json({
      ok: true,
      ticket,
      expiresIn: FIVEM_TICKET_MAX_AGE
    });
  } catch (error) {
    console.error("FiveM ticket creation failed", { type: error.name || "Error" });
    return res.status(500).json({ ok: false, error: "config" });
  }
};
