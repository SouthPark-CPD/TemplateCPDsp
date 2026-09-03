const { clearAllSessionCookies } = require("../../server/academy-admin-auth");

module.exports = function handler(req, res) {
  res.setHeader("Set-Cookie", clearAllSessionCookies());
  res.redirect(302, "/");
};
