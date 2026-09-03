const { readSession, clearSessionCookie } = require("../../server/candidate-auth");

module.exports = function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const session = readSession(req);
  res.setHeader("Cache-Control", "no-store");
  if (!session) {
    res.setHeader("Set-Cookie", clearSessionCookie());
    return res.status(401).json({ authenticated: false });
  }
  return res.status(200).json({ authenticated: true, user: session.user });
};
