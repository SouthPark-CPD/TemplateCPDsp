const {
  exchangeCode, getDiscordUser, getGuildMember, hasRequiredRole,
  newSession, sessionCookie, consumeState, clearStateCookie
} = require("../../server/auth");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const code = typeof req.query.code === "string" ? req.query.code : "";
  const state = typeof req.query.state === "string" ? req.query.state : "";
  const discordError = typeof req.query.error === "string" ? req.query.error : "";

  if (discordError) return res.redirect(302, "/auth/login.html?error=cancelled");
  if (!code || !consumeState(req, state)) return res.redirect(302, "/auth/login.html?error=invalid_state");

  try {
    const tokens = await exchangeCode(req, code);
    const [user, member] = await Promise.all([
      getDiscordUser(tokens.access_token),
      getGuildMember(tokens.access_token)
    ]);

    if (!hasRequiredRole(member)) {
      res.setHeader("Set-Cookie", clearStateCookie());
      return res.redirect(302, "/auth/denied.html?reason=role");
    }

    res.setHeader("Set-Cookie", [clearStateCookie(), sessionCookie(newSession(user, tokens))]);
    return res.redirect(302, "/mdt/portail.html");
  } catch (error) {
    const reason = error.status === 403 || error.status === 404 ? "server" : "discord";
    res.setHeader("Set-Cookie", clearStateCookie());
    return res.redirect(302, `/auth/denied.html?reason=${reason}`);
  }
};
