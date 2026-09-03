CREATE INDEX IF NOT EXISTS academy_activity_log_actor_idx
ON public.academy_activity_log (actor_discord_id, created_at DESC);
