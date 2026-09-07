const fs = require("node:fs/promises");
const path = require("node:path");
const { validateSession, validatedSessionCookie, clearSessionCookie } = require("../server/academy-admin-auth");
const policeAuth = require("../server/auth");
const { isControlPanelAdmin, ownerDiscordId } = require("../server/admin-config");

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

function withClipboardSupport(body, extension) {
  if (extension !== ".html") return body;
  const html = body.toString("utf8");
  if (html.includes("police-clipboard.js")) return body;
  return Buffer.from(html.replace(/<\/head>/i, '<link rel="stylesheet" href="/assets/police-clipboard.css?v=2"><script defer src="/assets/police-clipboard.js?v=2"></script></head>'));
}

function requestedPath(req) {
  const raw = Array.isArray(req.query.path) ? req.query.path.join("/") : String(req.query.path || "index.html");
  let decoded;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  const normalized = path.posix.normalize(`/${decoded}`).slice(1);
  if (!normalized || normalized === ".") return "index.html";
  if (normalized.startsWith("../") || normalized.includes("\0") || path.isAbsolute(normalized)) return null;
  return normalized;
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") return res.status(405).end();
  const assetPath = requestedPath(req);
  if (!assetPath) return res.status(400).end("Requête incorrecte");

  const adminPanel = String(req.query.admin_panel || "") === "1";
  const result = adminPanel ? await policeAuth.validateSession(req, false) : await validateSession(req, false);
  if (!result.ok) {
    res.setHeader("Set-Cookie", adminPanel ? policeAuth.clearSessionCookie() : clearSessionCookie());
    const acceptsHtml = String(req.headers.accept || "").includes("text/html") || path.extname(assetPath) === ".html";
    if (acceptsHtml) {
      const destination = ["missing_role", "not_member"].includes(result.reason)
        ? "/academy-auth/denied.html"
        : `/academy-auth/login.html?error=${encodeURIComponent(result.reason)}`;
      return res.redirect(302, destination);
    }
    return res.status(401).end("Accès non autorisé");
  }

  if (adminPanel) {
    if (!ownerDiscordId()) return res.status(503).end("CPD_ADMIN_OWNER_ID non configuré");
    if (!await isControlPanelAdmin(result.session.user?.id)) return res.status(403).end("Accès administrateur refusé");
  }
  if (result.changed) res.setHeader("Set-Cookie", adminPanel ? policeAuth.sessionCookie(result.session) : validatedSessionCookie(result));

  // The private configuration panel is a real top-level /admin application.
  // Academy remains served from academy-admin and keeps its existing auth flow.
  const adminRoot = path.resolve(process.cwd(), adminPanel ? "admin" : "academy-admin");
  const absolutePath = path.resolve(adminRoot, assetPath);
  if (absolutePath !== adminRoot && !absolutePath.startsWith(`${adminRoot}${path.sep}`)) {
    return res.status(403).end();
  }

  try {
    const stat = await fs.stat(absolutePath);
    const finalPath = stat.isDirectory() ? path.join(absolutePath, "index.html") : absolutePath;
    const extension = path.extname(finalPath).toLowerCase();
    const body = withClipboardSupport(await fs.readFile(finalPath), extension);
    res.setHeader("Content-Type", CONTENT_TYPES[extension] || "application/octet-stream");
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (req.method === "HEAD") return res.status(200).end();
    return res.status(200).send(body);
  } catch (error) {
    return res.status(error.code === "ENOENT" ? 404 : 500).end(
      error.code === "ENOENT" ? "Fichier introuvable" : "Erreur serveur"
    );
  }
};
