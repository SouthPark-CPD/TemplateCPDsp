ALTER TABLE public.academy_training_records
  ALTER COLUMN score DROP NOT NULL,
  ALTER COLUMN comment DROP NOT NULL,
  ALTER COLUMN strengths DROP NOT NULL,
  ALTER COLUMN improvements DROP NOT NULL;
