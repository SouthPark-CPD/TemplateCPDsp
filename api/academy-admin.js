const fs = require("node:fs/promises");
const path = require("node:path");
const { validateSession, sessionCookie, clearSessionCookie } = require("../server/academy-admin-auth");

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

  const result = await validateSession(req, false);
  if (!result.ok) {
    res.setHeader("Set-Cookie", clearSessionCookie());
    const acceptsHtml = String(req.headers.accept || "").includes("text/html") || path.extname(assetPath) === ".html";
    if (acceptsHtml) {
      const destination = ["missing_role", "not_member"].includes(result.reason)
        ? "/academy-auth/denied.html"
        : `/academy-auth/login.html?error=${encodeURIComponent(result.reason)}`;
      return res.redirect(302, destination);
    }
    return res.status(401).end("Accès non autorisé");
  }

  if (result.changed) res.setHeader("Set-Cookie", sessionCookie(result.session));

  const adminRoot = path.resolve(process.cwd(), "academy-admin");
  const absolutePath = path.resolve(adminRoot, assetPath);
  if (absolutePath !== adminRoot && !absolutePath.startsWith(`${adminRoot}${path.sep}`)) {
    return res.status(403).end();
  }

  try {
    const stat = await fs.stat(absolutePath);
    const finalPath = stat.isDirectory() ? path.join(absolutePath, "index.html") : absolutePath;
    const body = await fs.readFile(finalPath);
    res.setHeader("Content-Type", CONTENT_TYPES[path.extname(finalPath).toLowerCase()] || "application/octet-stream");
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
