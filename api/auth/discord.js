const crypto = require("node:crypto");
const { env, siteUrl, createStateCookie } = require("../../server/auth");

module.exports = function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  try {
    const state = crypto.randomBytes(24).toString("base64url");
    const params = new URLSearchParams({
      client_id: env().clientId,
      response_type: "code",
      redirect_uri: `${siteUrl(req)}/api/auth/callback`,
      scope: "identify guilds.members.read",
      state
    });
    res.setHeader("Set-Cookie", createStateCookie(state));
    res.redirect(302, `https://discord.com/oauth2/authorize?${params}`);
  } catch {
    res.redirect(302, "/auth/login.html?error=config");
  }
};
