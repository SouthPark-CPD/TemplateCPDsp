const {
  validateSession, sessionCookie, clearSessionCookie,
  getAcademyMember, hasInstructorRole,
  verifyFiveMServerSecret, issueFiveMTicket, FIVEM_TICKET_MAX_AGE,
  verifyFiveMTicket, getGuildMemberById, hasRequiredRole, newFiveMSession
} = require("../../server/auth");
const { neon } = require("@neondatabase/serverless");

async function academyRecruitmentSummary() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const sql = neon(process.env.DATABASE_URL);
    const [row] = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'new')::INTEGER AS new_count,
        COUNT(*) FILTER (WHERE status = 'to_contact')::INTEGER AS to_contact_count
      FROM academy_recruitment_applications
    `;
    const newCount = Number(row?.new_count || 0);
    const toContactCount = Number(row?.to_contact_count || 0);
    return { newCount, toContactCount, pendingCount: newCount + toContactCount };
  } catch (error) {
    console.error("Academy recruitment summary unavailable", { code: error.code || "unknown" });
    return null;
  }
}

function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body.length <= 8192) {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return {};
}

function readFiveMTicket(req) {
  const raw = req.query?.fivem_ticket;
  return typeof raw === "string" ? raw : "";
}

function issueTicket(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");

  try {
    const providedSecret = String(req.headers["x-fivem-secret"] || "");
    if (!verifyFiveMServerSecret(providedSecret)) {
      return res.status(401).json({ ok: false, error: "unauthorized" });
    }

    const body = readBody(req);
    const discordId = String(body.discordId || "");
    const job = String(body.job || "");
    const grade = Number(body.grade || 0);

    if (!/^\d{17,20}$/.test(discordId)) {
      return res.status(400).json({ ok: false, error: "invalid_discord_id" });
    }
    if (!job || !Number.isFinite(grade)) {
      return res.status(400).json({ ok: false, error: "invalid_player_context" });
    }

    const ticket = issueFiveMTicket({
      discordId,
      license: body.license,
      job,
      grade,
      name: body.name
    });

    return res.status(200).json({
      ok: true,
      ticket,
      expiresIn: FIVEM_TICKET_MAX_AGE
    });
  } catch (error) {
    console.error("FiveM ticket creation failed", { type: error.name || "Error" });
    return res.status(500).json({ ok: false, error: "config" });
  }
}

async function consumeFiveMTicket(req, res, ticket) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Referrer-Policy", "no-referrer");

  try {
    const payload = verifyFiveMTicket(ticket);
    if (!payload) {
      return res.redirect(302, "/auth/login.html?error=invalid_session");
    }

    const member = await getGuildMemberById(payload.sub);
    if (!hasRequiredRole(member)) {
      return res.redirect(302, "/auth/denied.html?reason=role");
    }

    const session = newFiveMSession(member, payload);
    res.setHeader("Set-Cookie", sessionCookie(session));
    return res.redirect(302, "/mdt/portail.html");
  } catch (error) {
    console.error("FiveM auth failed", {
      status: Number(error.status || 0),
      type: error.name || "Error"
    });

    if (error.status === 403 || error.status === 404) {
      return res.redirect(302, "/auth/denied.html?reason=server");
    }

    const loginError = error.message === "DISCORD_BOT_TOKEN manquant"
      ? "config"
      : "discord_unavailable";
    return res.redirect(302, `/auth/login.html?error=${loginError}`);
  }
}

async function normalSession(req, res) {
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

  const academySummary = academyAccess ? await academyRecruitmentSummary() : null;
  if (result.changed) res.setHeader("Set-Cookie", sessionCookie(result.session));
  return res.status(200).json({ authenticated: true, user: result.session.user, academyAccess, academySummary });
}

module.exports = async function handler(req, res) {
  if (req.method === "POST") {
    return issueTicket(req, res);
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).end();
  }

  const ticket = readFiveMTicket(req);
  if (ticket) {
    return consumeFiveMTicket(req, res, ticket);
  }

  return normalSession(req, res);
};
