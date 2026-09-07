function prepareAsset(req, res, stat, extension) {
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  if (extension === '.html') { res.setHeader('Cache-Control','private, no-store'); return false; }
  // Revalidate behind authorization: cached assets never bypass role checks.
  const etag = `W/"${stat.size.toString(16)}-${Math.trunc(stat.mtimeMs).toString(16)}"`;
  res.setHeader('Cache-Control','private, no-cache');
  res.setHeader('ETag',etag);
  if (String(req.headers['if-none-match'] || '').split(',').map(v=>v.trim()).includes(etag)) {res.status(304).end();return true;}
  if (req.method === 'HEAD') {res.setHeader('Content-Length',String(stat.size));res.status(200).end();return true;}
  return false;
}
function withMotion(body) {
  const html=body.toString('utf8');
  return Buffer.from(html.includes('/assets/motion.css')?html:html.replace(/<\/head>/i,'<link rel="stylesheet" href="/assets/motion.css?v=1"></head>'));
}
module.exports={prepareAsset,withMotion};
