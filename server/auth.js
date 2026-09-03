const crypto = require("node:crypto");

const COOKIE_NAME = "cpd_session";
const STATE_COOKIE_NAME = "cpd_oauth_state";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const ROLE_CHECK_INTERVAL = 60 * 60;
const DISCORD_API = "https://discord.com/api/v10";
const GUILD_ID = "1408092767963451615";
const ROLE_ID = "1408092768026365974";
const ACADEMY_GUILD_ID = "1538858756354473984";
const INSTRUCTOR_ROLE_ID = "1538858756371386400";
const DISCORD_MAX_ATTEMPTS = 2;
const DISCORD_REQUEST_TIMEOUT = 3500;

function env() {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Configuration Discord manquante");
  return { clientId, clientSecret };
}

function siteUrl(req) {
  const forwardedHost = String(req.headers["x-forwarded-host"] || req.headers.host || "");
  const host = forwardedHost.split(",")[0].trim();
  const proto = String(req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
  return `${proto}://${host}`;
}

function deriveKey() {
  return crypto.createHash("sha256").update(`${env().clientSecret}:cpd-session:v1`).digest();
}

function b64url(value) {
  return Buffer.from(value).toString("base64url");
}

function encrypt(payload) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", deriveKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return `${b64url(iv)}.${b64url(encrypted)}.${b64url(cipher.getAuthTag())}`;
}

function decrypt(value) {
  try {
    const [iv, encrypted, tag] = String(value || "").split(".").map(part => Buffer.from(part, "base64url"));
    if (!iv || !encrypted || !tag) return null;
    const decipher = crypto.createDecipheriv("aes-256-gcm", deriveKey(), iv);
    decipher.setAuthTag(tag);
    const payload = JSON.parse(Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8"));
    if (!payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function parseCookies(req) {
  return String(req.headers.cookie || "").split(";").reduce((cookies, item) => {
    const index = item.indexOf("=");
    if (index > 0) cookies[item.slice(0, index).trim()] = decodeURIComponent(item.slice(index + 1).trim());
    return cookies;
  }, {});
}

function cookie(name, value, maxAge) {
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

function sessionCookie(session) {
  return cookie(COOKIE_NAME, encrypt(session), SESSION_MAX_AGE);
}

function clearSessionCookie() {
  return cookie(COOKIE_NAME, "", 0);
}

function readSession(req) {
  return decrypt(parseCookies(req)[COOKIE_NAME]);
}

function createStateCookie(state) {
  return cookie(STATE_COOKIE_NAME, encrypt({ state, exp: Math.floor(Date.now() / 1000) + 600 }), 600);
}

function consumeState(req, receivedState) {
  const payload = decrypt(parseCookies(req)[STATE_COOKIE_NAME]);
  return Boolean(payload && receivedState && payload.state === receivedState);
}

function clearStateCookie() {
  return cookie(STATE_COOKIE_NAME, "", 0);
}

function wait(delay) {
  return new Promise(resolve => setTimeout(resolve, delay));
}

function retryDelay(response, detail, attempt) {
  const headerDelay = Number(
    response.headers.get("retry-after") || response.headers.get("x-ratelimit-reset-after")
  );
  let bodyDelay = 0;
  try {
    bodyDelay = Number(JSON.parse(detail).retry_after || 0);
  } catch {}

  const seconds = Number.isFinite(headerDelay) && headerDelay > 0 ? headerDelay : bodyDelay;
  return Math.min(1500, Math.max(250, seconds > 0 ? seconds * 1000 : 350 * (attempt + 1)));
}

async function discordRequest(url, options = {}) {
  let lastError;

  for (let attempt = 0; attempt < DISCORD_MAX_ATTEMPTS; attempt += 1) {
    try {
      const requestOptions = {
        ...options,
        signal: options.signal || AbortSignal.timeout(DISCORD_REQUEST_TIMEOUT)
      };
      const response = await fetch(url, requestOptions);
      if (response.ok) return response.json();

      const detail = await response.text().catch(() => "");
      const error = new Error(`Discord API ${response.status}: ${detail.slice(0, 200)}`);
      error.status = response.status;
      lastError = error;

      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt === DISCORD_MAX_ATTEMPTS - 1) throw error;
      await wait(retryDelay(response, detail, attempt));
    } catch (error) {
      lastError = error;
      if (error.status || attempt === DISCORD_MAX_ATTEMPTS - 1) throw error;
      await wait(350 * (attempt + 1));
    }
  }

  throw lastError || new Error("Discord indisponible");
}

async function exchangeCode(req, code) {
  const { clientId, clientSecret } = env();
  return discordRequest(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: `${siteUrl(req)}/api/auth/callback`
    })
  });
}

async function refreshToken(refreshTokenValue) {
  const { clientId, clientSecret } = env();
  return discordRequest(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshTokenValue
    })
  });
}

async function getDiscordUser(accessToken) {
  return discordRequest(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

async function getGuildMember(accessToken) {
  return discordRequest(`${DISCORD_API}/users/@me/guilds/${GUILD_ID}/member`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

async function getAcademyMember(accessToken, userId = "") {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (botToken && /^\d{17,20}$/.test(String(userId))) {
    return discordRequest(`${DISCORD_API}/guilds/${ACADEMY_GUILD_ID}/members/${userId}`, {
      headers: { Authorization: `Bot ${botToken}` }
    });
  }
  return discordRequest(`${DISCORD_API}/users/@me/guilds/${ACADEMY_GUILD_ID}/member`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

function hasRequiredRole(member) {
  return Array.isArray(member.roles) && member.roles.includes(ROLE_ID);
}

function hasInstructorRole(member) {
  return Array.isArray(member.roles) && member.roles.includes(INSTRUCTOR_ROLE_ID);
}

function newSession(user, tokens) {
  const now = Math.floor(Date.now() / 1000);
  return {
    v: 1,
    user: { id: user.id, username: user.username, globalName: user.global_name || user.username, avatar: user.avatar || null },
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    tokenExp: now + Number(tokens.expires_in || 604800),
    roleCheckedAt: now,
    exp: now + SESSION_MAX_AGE
  };
}

async function validateSession(req, forceRoleCheck = false) {
  let session = readSession(req);
  if (!session) return { ok: false, reason: "login_required" };

  const now = Math.floor(Date.now() / 1000);
  let changed = false;
  if (!session.accessToken || !session.refreshToken) return { ok: false, reason: "invalid_session" };

  if (session.tokenExp <= now + 60) {
    try {
      const tokens = await refreshToken(session.refreshToken);
      session.accessToken = tokens.access_token;
      session.refreshToken = tokens.refresh_token || session.refreshToken;
      session.tokenExp = now + Number(tokens.expires_in || 604800);
      changed = true;
    } catch {
      return { ok: false, reason: "session_expired" };
    }
  }

  const roleCheckDue = forceRoleCheck || !session.roleCheckedAt || now - session.roleCheckedAt >= ROLE_CHECK_INTERVAL;
  if (roleCheckDue) {
    try {
      const member = await getGuildMember(session.accessToken);
      if (!hasRequiredRole(member)) return { ok: false, reason: "missing_role" };
      session.roleCheckedAt = now;
      changed = true;
    } catch (error) {
      if (error.status === 401 || error.status === 403 || error.status === 404) {
        return { ok: false, reason: "not_member" };
      }
      return { ok: false, reason: "discord_unavailable" };
    }
  }

  return { ok: true, session, changed };
}

module.exports = {
  COOKIE_NAME, DISCORD_API, GUILD_ID, ROLE_ID, ACADEMY_GUILD_ID, INSTRUCTOR_ROLE_ID, SESSION_MAX_AGE,
  env, siteUrl, createStateCookie, consumeState, clearStateCookie,
  sessionCookie, clearSessionCookie, exchangeCode, getDiscordUser,
  getGuildMember, getAcademyMember, hasRequiredRole, hasInstructorRole,
  newSession, validateSession
};
