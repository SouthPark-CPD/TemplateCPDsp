const { neon } = require("@neondatabase/serverless");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, code: "method_not_allowed" });
  }

  if (!process.env.DATABASE_URL) {
    return res.status(503).json({ ok: false, code: "database_not_configured" });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const [result] = await sql`
      SELECT
        to_regclass('public.academy_agent_files') IS NOT NULL AS agent_files_ready,
        to_regclass('public.academy_training_records') IS NOT NULL AS training_records_ready
    `;

    const ready = Boolean(
      result?.agent_files_ready && result?.training_records_ready
    );

    return res.status(ready ? 200 : 503).json({
      ok: ready,
      database: "connected",
      tables: ready ? "ready" : "missing"
    });
  } catch (error) {
    console.error("Academy database check failed", error);
    return res.status(500).json({ ok: false, code: "database_error" });
  }
};
