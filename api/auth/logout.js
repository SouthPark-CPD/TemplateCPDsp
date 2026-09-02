const { clearSessionCookie } = require("../../server/auth");

module.exports = function handler(req, res) {
  res.setHeader("Set-Cookie", clearSessionCookie());
  res.redirect(302, "/");
};
