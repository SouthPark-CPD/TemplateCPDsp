const {
  verifyFiveMTicket,
  getGuildMemberById,
  hasRequiredRole,
  newFiveMSession,
  sessionCookie
} = require("../../server/auth");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Referrer-Policy", "no-referrer");

  const ticket = typeof req.query.ticket === "string" ? req.query.ticket : "";

  try {
    const payload = verifyFiveMTicket(ticket);
    if (!payload) {
      return res.redirect(302, "/auth/login.html?error=invalid_session");
    }

    const member = await getGuildMemberById(payload.sub);
    if (!hasRequiredRole(member)) {
      return res.redirect(302, "/auth/denied.html?reason=role");
    }

    const session = newFiveMSession(member, payload);
    res.setHeader("Set-Cookie", sessionCookie(session));
    return res.redirect(302, "/mdt/portail.html");
  } catch (error) {
    console.error("FiveM auth failed", {
      status: Number(error.status || 0),
      type: error.name || "Error"
    });

    if (error.status === 403 || error.status === 404) {
      return res.redirect(302, "/auth/denied.html?reason=server");
    }

    const loginError = error.message === "DISCORD_BOT_TOKEN manquant"
      ? "config"
      : "discord_unavailable";
    return res.redirect(302, `/auth/login.html?error=${loginError}`);
  }
};
