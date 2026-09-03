CREATE INDEX IF NOT EXISTS academy_activity_log_target_idx
ON public.academy_activity_log (target_type, target_id, created_at DESC);
