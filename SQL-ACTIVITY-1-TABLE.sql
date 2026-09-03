CREATE TABLE IF NOT EXISTS public.academy_activity_log (
  id BIGSERIAL PRIMARY KEY,
  actor_discord_id VARCHAR(32) NOT NULL,
  actor_name VARCHAR(100) NOT NULL,
  action_type VARCHAR(80) NOT NULL,
  target_type VARCHAR(40) NOT NULL,
  target_id VARCHAR(64),
  target_name VARCHAR(160),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
