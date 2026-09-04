const crypto = require("node:crypto");

const DISCORD_API = "https://discord.com/api/v10";
const ACADEMY_GUILD_ID = "1538858756354473984";
const SESSION_COOKIE = "cpd_candidate_session";
const STATE_COOKIE = "cpd_candidate_oauth_state";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

function env() {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Configuration Discord manquante");
  return { clientId, clientSecret };
}

function siteUrl(req) {
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
  const proto = String(req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
  return `${proto}://${host}`;
}

function deriveKey() {
  return crypto.createHash("sha256").update(`${env().clientSecret}:candidate-session:v1`).digest();
}

function encrypt(payload) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", deriveKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${encrypted.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}`;
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

function cookies(req) {
  return String(req.headers.cookie || "").split(";").reduce((result, item) => {
    const index = item.indexOf("=");
    if (index > 0) result[item.slice(0, index).trim()] = decodeURIComponent(item.slice(index + 1).trim());
    return result;
  }, {});
}

function cookie(name, value, maxAge) {
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

function createState() {
  return crypto.randomBytes(24).toString("base64url");
}

function stateCookie(state) {
  return cookie(STATE_COOKIE, encrypt({ state, exp: Math.floor(Date.now() / 1000) + 600 }), 600);
}

function consumeState(req, state) {
  const payload = decrypt(cookies(req)[STATE_COOKIE]);
  return Boolean(payload && state && payload.state === state);
}

function clearStateCookie() {
  return cookie(STATE_COOKIE, "", 0);
}

function sessionCookie(user) {
  const now = Math.floor(Date.now() / 1000);
  return cookie(SESSION_COOKIE, encrypt({
    v: 1,
    user: { id: user.id, username: user.username, globalName: user.global_name || user.username, avatar: user.avatar || null },
    exp: now + SESSION_MAX_AGE
  }), SESSION_MAX_AGE);
}

function clearSessionCookie() {
  return cookie(SESSION_COOKIE, "", 0);
}

function readSession(req) {
  return decrypt(cookies(req)[SESSION_COOKIE]);
}

async function discordRequest(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`Discord API ${response.status}`);
  return response.json();
}

async function exchangeCode(req, code) {
  const { clientId, clientSecret } = env();
  return discordRequest(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: "authorization_code", code, redirect_uri: `${siteUrl(req)}/api/candidate-auth/callback` })
  });
}

async function getUser(accessToken) {
  return discordRequest(`${DISCORD_API}/users/@me`, { headers: { Authorization: `Bearer ${accessToken}` } });
}

async function joinAcademyGuild(accessToken, userId) {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) throw new Error("Bot Discord non configuré");
  const response = await fetch(`${DISCORD_API}/guilds/${ACADEMY_GUILD_ID}/members/${userId}`, {
    method: "PUT",
    headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: accessToken })
  });
  if (!response.ok && response.status !== 204) throw new Error(`Discord guild join ${response.status}`);
}

module.exports = { env, siteUrl, createState, stateCookie, consumeState, clearStateCookie, sessionCookie, clearSessionCookie, readSession, exchangeCode, getUser, joinAcademyGuild };
