const { neon } = require("@neondatabase/serverless");
const {
  env,
  siteUrl,
  createState,
  stateCookie,
  consumeState,
  clearStateCookie,
  sessionCookie,
  clearSessionCookie,
  exchangeCode,
  getDiscordUser,
  getAcademyMember,
  hasInstructorRole,
  newSession,
  validateSession
} = require("../server/academy-admin-auth");

function actionFromRequest(req) {
  return Array.isArray(req.query.action)
    ? req.query.action[0]
    : String(req.query.action || "");
}

function discordLogin(req, res) {
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
}

async function discordCallback(req, res) {
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
}

async function sessionStatus(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  res.setHeader("Cache-Control", "no-store");
  const result = await validateSession(req, false);
  if (!result.ok) {
    res.setHeader("Set-Cookie", clearSessionCookie());
    return res.status(401).json({ authenticated: false, reason: result.reason });
  }
  if (result.changed) res.setHeader("Set-Cookie", sessionCookie(result.session));
  return res.status(200).json({ authenticated: true, user: result.session.user });
}

function logout(req, res) {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).end();
  res.setHeader("Set-Cookie", clearSessionCookie());
  return res.redirect(302, "/");
}

async function databaseCheck(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  res.setHeader("Cache-Control", "no-store");
  if (!process.env.DATABASE_URL) {
    return res.status(503).json({ ok: false, code: "database_not_configured" });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const [result] = await sql`
      SELECT
        to_regclass('public.academy_agent_files') IS NOT NULL AS agent_files_ready,
        to_regclass('public.academy_training_records') IS NOT NULL AS training_records_ready
    `;
    const ready = Boolean(result?.agent_files_ready && result?.training_records_ready);
    return res.status(ready ? 200 : 503).json({
      ok: ready,
      database: "connected",
      tables: ready ? "ready" : "missing"
    });
  } catch (error) {
    console.error("Academy database check failed", error);
    return res.status(500).json({ ok: false, code: "database_error" });
  }
}

module.exports = async function handler(req, res) {
  switch (actionFromRequest(req)) {
    case "discord": return discordLogin(req, res);
    case "callback": return discordCallback(req, res);
    case "session": return sessionStatus(req, res);
    case "logout": return logout(req, res);
    case "database-check": return databaseCheck(req, res);
    default: return res.status(404).json({ ok: false, code: "route_not_found" });
  }
};
