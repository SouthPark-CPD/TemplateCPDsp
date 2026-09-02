const { clearSessionCookie } = require("../../server/academy-admin-auth");

module.exports = function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).end();
  res.setHeader("Set-Cookie", clearSessionCookie());
  return res.redirect(302, "/");
};
