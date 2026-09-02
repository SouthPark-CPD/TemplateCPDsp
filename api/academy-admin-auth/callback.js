const {
  exchangeCode,
  getDiscordUser,
  getAcademyMember,
  hasInstructorRole,
  consumeState,
  clearStateCookie,
  clearSessionCookie,
  sessionCookie,
  newSession
} = require("../../server/academy-admin-auth");

module.exports = async function handler(req, res) {
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
};
