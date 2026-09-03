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
  const now = Math.floor(Date.now() / 1000);
  const academyCheckFresh = Number(result.session.academyRoleCheckedAt || 0) > now - 3600;
  let academyAccess = academyCheckFresh;

  if (!academyCheckFresh) {
    try {
      const member = await getAcademyMember(result.session.accessToken, result.session.user?.id);
      academyAccess = hasInstructorRole(member);
      if (academyAccess) {
        result.session.academyRoleCheckedAt = now;
        result.changed = true;
      }
    } catch (error) {
      const recentlyAuthorized = Number(result.session.academyRoleCheckedAt || 0) > now - (6 * 3600);
      academyAccess = recentlyAuthorized;
      if (!recentlyAuthorized && ![403, 404].includes(error.status)) {
        console.error("Academy access check temporarily unavailable", {
          status: Number(error.status || 0),
          type: error.name || "Error"
        });
      }
    }
  }

  if (result.changed) res.setHeader("Set-Cookie", sessionCookie(result.session));
  return res.status(200).json({ authenticated: true, user: result.session.user, academyAccess });
};
