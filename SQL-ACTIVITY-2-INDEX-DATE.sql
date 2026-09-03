CREATE INDEX IF NOT EXISTS academy_activity_log_created_at_idx
ON public.academy_activity_log (created_at DESC);
