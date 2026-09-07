const fs = require("node:fs/promises");
const path = require("node:path");
const { validateSession, sessionCookie, clearSessionCookie, getConfiguredAccessMemberById, hasConfiguredGangRole } = require("../server/auth");

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon",
  ".woff": "font/woff", ".woff2": "font/woff2"
};

function withClipboardSupport(body, extension) {
  if (extension !== ".html") return body;
  body = require('../server/page-response').withMotion(body);
  const html = body.toString("utf8");
  if (html.includes("police-clipboard.js")) return body;
  return Buffer.from(html.replace(/<\/head>/i, '<link rel="stylesheet" href="/assets/police-clipboard.css?v=2"><script defer src="/assets/police-clipboard.js?v=2"></script></head>'));
}

function requestedPath(req) {
  const raw = Array.isArray(req.query.path) ? req.query.path.join("/") : String(req.query.path || "index.html");
  let decoded;
  try { decoded = decodeURIComponent(raw); } catch { return null; }
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
      const destination = result.reason === "missing_role" || result.reason === "not_member"
        ? "/auth/denied.html?reason=role"
        : `/auth/login.html?error=${encodeURIComponent(result.reason)}`;
      return res.redirect(302, destination);
    }
    return res.status(401).end("Accès non autorisé");
  }

  if (result.changed) res.setHeader("Set-Cookie", sessionCookie(result.session));

  if (assetPath === "gang-unit.html") {
    try {
      const member = await getConfiguredAccessMemberById(result.session.user?.id, "gang");
      if (!await hasConfiguredGangRole(member)) return res.status(403).end("Accès Gang Unit refusé");
    } catch {
      return res.status(403).end("Accès Gang Unit indisponible");
    }
  }

  const mdtRoot = path.resolve(process.cwd(), "mdt");
  const absolutePath = path.resolve(mdtRoot, assetPath);
  if (absolutePath !== mdtRoot && !absolutePath.startsWith(`${mdtRoot}${path.sep}`)) return res.status(403).end();

  try {
    const stat = await fs.stat(absolutePath);
    const finalPath = stat.isDirectory() ? path.join(absolutePath, "index.html") : absolutePath;
    const extension = path.extname(finalPath).toLowerCase();
    if (!CONTENT_TYPES[extension]) return res.status(404).end();
    res.setHeader('Content-Type', CONTENT_TYPES[extension]);
    if (require('../server/page-response').prepareAsset(req,res,stat.isDirectory() ? await fs.stat(finalPath) : stat,extension)) return;
    const body = withClipboardSupport(await fs.readFile(finalPath), extension);
    res.setHeader("Content-Type", CONTENT_TYPES[extension] || "application/octet-stream");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (req.method === "HEAD") return res.status(200).end();
    return res.status(200).send(body);
  } catch (error) {
    return res.status(error.code === "ENOENT" ? 404 : 500).end(error.code === "ENOENT" ? "Fichier introuvable" : "Erreur serveur");
  }
};
