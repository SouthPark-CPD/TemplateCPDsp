const crypto = require("node:crypto");

const COOKIE_NAME = "cpd_session";
const FIVEM_COOKIE_NAME = "cpd_session_fivem";
const STATE_COOKIE_NAME = "cpd_oauth_state";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const ROLE_CHECK_INTERVAL = 60 * 60;
const FIVEM_TICKET_MAX_AGE = 20;
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

function fiveMSecret() {
  const secret = String(process.env.FIVEM_AUTH_SECRET || "");
  if (secret.length < 32) throw new Error("Configuration FiveM manquante");
  return secret;
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

function cookie(name, value, maxAge, options = {}) {
  const sameSite = options.sameSite || "Lax";
  const partitioned = options.partitioned ? "; Partitioned" : "";
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=${sameSite}${partitioned}`;
}

function sessionCookie(session) {
  if (session?.authMode === "fivem") {
    return cookie(FIVEM_COOKIE_NAME, encrypt(session), SESSION_MAX_AGE, {
      sameSite: "None",
      partitioned: true
    });
  }
  return cookie(COOKIE_NAME, encrypt(session), SESSION_MAX_AGE);
}

function clearSessionCookie() {
  return [
    cookie(COOKIE_NAME, "", 0),
    cookie(FIVEM_COOKIE_NAME, "", 0, { sameSite: "None", partitioned: true })
  ];
}

function readSession(req) {
  const cookies = parseCookies(req);
  // Dans la NUI, la session partitionnee FiveM a priorite sur une eventuelle
  // session Discord classique deja presente dans le navigateur.
  return decrypt(cookies[FIVEM_COOKIE_NAME]) || decrypt(cookies[COOKIE_NAME]);
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

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ""), "utf8");
  const right = Buffer.from(String(b || ""), "utf8");
  return left.length === right.length && left.length > 0 && crypto.timingSafeEqual(left, right);
}

function verifyFiveMServerSecret(providedSecret) {
  return safeEqual(providedSecret, fiveMSecret());
}

function signFiveMTicketBody(body) {
  return crypto.createHmac("sha256", fiveMSecret()).update(body).digest("base64url");
}

function issueFiveMTicket(data) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    v: 1,
    iss: "Meech_WebTablet",
    aud: "TemplateCPDsp",
    sub: String(data.discordId || ""),
    license: String(data.license || "").slice(0, 128),
    job: String(data.job || "").slice(0, 64),
    grade: Number(data.grade || 0),
    name: String(data.name || "").slice(0, 96),
    nonce: crypto.randomBytes(12).toString("base64url"),
    iat: now,
    exp: now + FIVEM_TICKET_MAX_AGE
  };

  if (!/^\d{17,20}$/.test(payload.sub)) throw new Error("Discord ID FiveM invalide");
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${signFiveMTicketBody(body)}`;
}

function verifyFiveMTicket(ticket) {
  try {
    const [body, signature, extra] = String(ticket || "").split(".");
    if (!body || !signature || extra) return null;
    if (!safeEqual(signature, signFiveMTicketBody(body))) return null;

    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    const now = Math.floor(Date.now() / 1000);
    if (payload.v !== 1 || payload.iss !== "Meech_WebTablet" || payload.aud !== "TemplateCPDsp") return null;
    if (!/^\d{17,20}$/.test(String(payload.sub || ""))) return null;
    if (!Number.isFinite(payload.iat) || !Number.isFinite(payload.exp)) return null;
    if (payload.iat > now + 5 || payload.exp <= now || payload.exp - payload.iat > FIVEM_TICKET_MAX_AGE + 2) return null;
    return payload;
  } catch {
    return null;
  }
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

async function getGuildMemberById(userId) {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) throw new Error("DISCORD_BOT_TOKEN manquant");
  if (!/^\d{17,20}$/.test(String(userId || ""))) {
    const error = new Error("Discord ID invalide");
    error.status = 400;
    throw error;
  }
  return discordRequest(`${DISCORD_API}/guilds/${GUILD_ID}/members/${userId}`, {
    headers: { Authorization: `Bot ${botToken}` }
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

function newSession(user, tokens, member = null) {
  const now = Math.floor(Date.now() / 1000);
  return {
    v: 1,
    authMode: "discord",
    user: {
      id: user.id,
      username: user.username,
      globalName: member?.nick || user.global_name || user.username,
      avatar: user.avatar || null
    },
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    tokenExp: now + Number(tokens.expires_in || 604800),
    roleCheckedAt: now,
    cpdNameResolved: true,
    exp: now + SESSION_MAX_AGE
  };
}

function newFiveMSession(member, ticketPayload = {}) {
  const now = Math.floor(Date.now() / 1000);
  const user = member?.user || {};
  return {
    v: 1,
    authMode: "fivem",
    user: {
      id: String(user.id || ticketPayload.sub || ""),
      username: String(user.username || ticketPayload.name || "Agent"),
      globalName: member?.nick || user.global_name || user.username || ticketPayload.name || "Agent",
      avatar: user.avatar || null
    },
    roleCheckedAt: now,
    cpdNameResolved: true,
    fivem: {
      license: String(ticketPayload.license || "").slice(0, 128),
      job: String(ticketPayload.job || "").slice(0, 64),
      grade: Number(ticketPayload.grade || 0)
    },
    exp: now + SESSION_MAX_AGE
  };
}

async function validateSession(req, forceRoleCheck = false) {
  let session = readSession(req);
  if (!session) return { ok: false, reason: "login_required" };

  const now = Math.floor(Date.now() / 1000);
  let changed = false;
  const authMode = session.authMode || "discord";

  if (authMode === "fivem") {
    if (!session.user?.id || !/^\d{17,20}$/.test(String(session.user.id))) {
      return { ok: false, reason: "invalid_session" };
    }
  } else {
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
  }

  const roleCheckDue = forceRoleCheck || session.cpdNameResolved !== true || !session.roleCheckedAt || now - session.roleCheckedAt >= ROLE_CHECK_INTERVAL;
  if (roleCheckDue) {
    try {
      const member = authMode === "fivem"
        ? await getGuildMemberById(session.user.id)
        : await getGuildMember(session.accessToken);

      if (!hasRequiredRole(member)) return { ok: false, reason: "missing_role" };
      session.user.globalName = member.nick || member.user?.global_name || member.user?.username || session.user.globalName;
      session.user.username = member.user?.username || session.user.username;
      session.user.avatar = member.user?.avatar || session.user.avatar || null;
      session.cpdNameResolved = true;
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
  COOKIE_NAME, FIVEM_COOKIE_NAME, DISCORD_API, GUILD_ID, ROLE_ID, ACADEMY_GUILD_ID,
  INSTRUCTOR_ROLE_ID, SESSION_MAX_AGE, FIVEM_TICKET_MAX_AGE,
  env, siteUrl, createStateCookie, consumeState, clearStateCookie,
  sessionCookie, clearSessionCookie, exchangeCode, getDiscordUser,
  getGuildMember, getGuildMemberById, getAcademyMember, hasRequiredRole, hasInstructorRole,
  newSession, newFiveMSession, validateSession,
  verifyFiveMServerSecret, issueFiveMTicket, verifyFiveMTicket
};
