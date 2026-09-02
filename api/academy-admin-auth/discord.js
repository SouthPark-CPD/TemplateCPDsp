const { env, siteUrl, createState, stateCookie } = require("../../server/academy-admin-auth");

module.exports = function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  try {
    const state = createState();
    const params = new URLSearchParams({
      client_id: env().clientId,
      response_type: "code",
      redirect_uri: `${siteUrl(req)}/api/academy-admin-auth/callback`,
      scope: "identify guilds.members.read",
      state
    });
    res.setHeader("Set-Cookie", stateCookie(state));
    return res.redirect(302, `https://discord.com/oauth2/authorize?${params}`);
  } catch {
    return res.redirect(302, "/academy-auth/login.html?error=config");
  }
};
