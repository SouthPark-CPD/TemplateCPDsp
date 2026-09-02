const { exchangeCode, getUser, consumeState, clearStateCookie, sessionCookie } = require("../../server/candidate-auth");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const code = typeof req.query.code === "string" ? req.query.code : "";
  const state = typeof req.query.state === "string" ? req.query.state : "";
  if (req.query.error) return res.redirect(302, "/public/application.html?auth_error=cancelled");
  if (!code || !consumeState(req, state)) return res.redirect(302, "/public/application.html?auth_error=invalid_state");

  try {
    const tokens = await exchangeCode(req, code);
    const user = await getUser(tokens.access_token);
    res.setHeader("Set-Cookie", [clearStateCookie(), sessionCookie(user)]);
    return res.redirect(302, "/public/application.html");
  } catch {
    res.setHeader("Set-Cookie", clearStateCookie());
    return res.redirect(302, "/public/application.html?auth_error=discord");
  }
};
