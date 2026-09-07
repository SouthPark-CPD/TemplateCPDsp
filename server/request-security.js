// Browser requests must originate from this site. Server-to-server clients still
// require their route's existing credentials; this guard is not authentication.
function guardMutation(req, res, maxBytes = 4_000_000) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store');
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return true;
  const origin = req.headers.origin;
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  const protocol = String(req.headers['x-forwarded-proto'] || (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https')).split(',')[0].trim();
  if (origin) {
    try { if (new URL(origin).origin !== new URL(`${protocol}://${host}`).origin) throw new Error('origin'); }
    catch { res.status(403).json({ok:false,code:'request_origin_denied'}); return false; }
  } else if (req.headers['sec-fetch-site'] === 'cross-site') {
    res.status(403).json({ok:false,code:'request_origin_denied'}); return false;
  }
  const contentType = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  if (contentType !== 'application/json') { res.status(415).json({ok:false,code:'json_required'}); return false; }
  let size;
  try { size = Buffer.byteLength(typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {})); }
  catch { res.status(400).json({ok:false,code:'invalid_json'}); return false; }
  if (size > maxBytes || Number(req.headers['content-length'] || 0) > maxBytes) { res.status(413).json({ok:false,code:'payload_too_large'}); return false; }
  return true;
}
function decodeCookie(value) { try { return decodeURIComponent(value); } catch { return ''; } }
function safeError(error) { return { code: String(error?.code || 'unknown').slice(0,80), status: Number(error?.status || 0), type: String(error?.name || 'Error').slice(0,80) }; }
module.exports = {guardMutation, decodeCookie, safeError};
