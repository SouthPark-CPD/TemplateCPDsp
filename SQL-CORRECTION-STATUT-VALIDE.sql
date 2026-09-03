DO $$
DECLARE
  existing_constraint RECORD;
BEGIN
  FOR existing_constraint IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.academy_training_records'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%result%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.academy_training_records DROP CONSTRAINT %I',
      existing_constraint.conname
    );
  END LOOP;

  UPDATE public.academy_training_records
  SET result = 'valide'
  WHERE result = 'validee';

  ALTER TABLE public.academy_training_records
    ADD CONSTRAINT academy_training_records_result_check
    CHECK (result IN ('planifiee', 'valide', 'a_revoir', 'non_valide'));
END
$$;
