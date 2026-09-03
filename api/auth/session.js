const {
  validateSession, sessionCookie, clearSessionCookie,
  getAcademyMember, hasInstructorRole
} = require("../../server/auth");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const result = await validateSession(req, false);
  res.setHeader("Cache-Control", "no-store");
  if (!result.ok) {
    res.setHeader("Set-Cookie", clearSessionCookie());
    return res.status(401).json({ authenticated: false, reason: result.reason });
  }
  if (result.changed) res.setHeader("Set-Cookie", sessionCookie(result.session));
  let academyAccess = false;
  try {
    academyAccess = hasInstructorRole(await getAcademyMember(result.session.accessToken));
  } catch (error) {
    if (![403, 404].includes(error.status)) console.error("Academy access check failed", error);
  }
  return res.status(200).json({ authenticated: true, user: result.session.user, academyAccess });
};
