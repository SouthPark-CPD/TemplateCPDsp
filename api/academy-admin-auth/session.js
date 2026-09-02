const { validateSession, sessionCookie, clearSessionCookie } = require("../../server/academy-admin-auth");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  res.setHeader("Cache-Control", "no-store");
  const result = await validateSession(req, false);
  if (!result.ok) {
    res.setHeader("Set-Cookie", clearSessionCookie());
    return res.status(401).json({ authenticated: false, reason: result.reason });
  }
  if (result.changed) res.setHeader("Set-Cookie", sessionCookie(result.session));
  return res.status(200).json({ authenticated: true, user: result.session.user });
};
