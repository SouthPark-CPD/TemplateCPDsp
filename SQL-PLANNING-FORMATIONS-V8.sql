CREATE TABLE IF NOT EXISTS academy_scheduled_sessions (
  id BIGSERIAL PRIMARY KEY,
  template_id BIGINT REFERENCES academy_training_templates(id) ON DELETE SET NULL,
  training_type VARCHAR(120) NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  location VARCHAR(160),
  notes TEXT,
  status VARCHAR(24) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'completed')),
  instructor_discord_id VARCHAR(32) NOT NULL,
  instructor_name VARCHAR(100) NOT NULL,
  participants JSONB NOT NULL DEFAULT '[]'::jsonb,
  discord_guild_id VARCHAR(32) NOT NULL,
  discord_channel_id VARCHAR(32) NOT NULL,
  discord_message_id VARCHAR(32),
  notification_status VARCHAR(24) NOT NULL DEFAULT 'pending',
  notification_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
