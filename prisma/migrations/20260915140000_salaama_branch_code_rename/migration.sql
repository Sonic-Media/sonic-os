-- Production migration: rename Salaama Branch.code from branch2 → salaama.
-- Preserves the existing Branch row (same UUID) and all foreign-key relationships.
-- Safe to run once; no-op when Salaama already uses code salaama.

DO $$
DECLARE
  salaama_branch_id UUID;
  branch2_branch_id UUID;
  salaama_code_count INT;
  branch2_code_count INT;
  kansanga_count INT;
BEGIN
  SELECT COUNT(*) INTO kansanga_count
  FROM "Branch"
  WHERE code = 'main' AND active = true;

  IF kansanga_count <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one active Kansanga branch (code=main), found %', kansanga_count;
  END IF;

  SELECT COUNT(*) INTO salaama_code_count
  FROM "Branch"
  WHERE code = 'salaama';

  SELECT COUNT(*) INTO branch2_code_count
  FROM "Branch"
  WHERE code = 'branch2';

  IF salaama_code_count > 0 AND branch2_code_count > 0 THEN
    RAISE EXCEPTION 'Both salaama and branch2 branch codes exist; reconcile duplicates before migration';
  END IF;

  IF salaama_code_count = 1 AND branch2_code_count = 0 THEN
    SELECT id INTO salaama_branch_id
    FROM "Branch"
    WHERE code = 'salaama';

    IF NOT EXISTS (
      SELECT 1 FROM "Branch"
      WHERE id = salaama_branch_id
        AND lower(name) = lower('Salaama')
        AND active = true
    ) THEN
      RAISE EXCEPTION 'Active Salaama branch with code salaama has unexpected name or inactive status';
    END IF;

    RAISE NOTICE 'Salaama branch already uses code salaama (id=%); migration no-op', salaama_branch_id;
    RETURN;
  END IF;

  IF branch2_code_count <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one branch2 record to migrate, found %', branch2_code_count;
  END IF;

  SELECT id INTO branch2_branch_id
  FROM "Branch"
  WHERE code = 'branch2';

  IF NOT EXISTS (
    SELECT 1 FROM "Branch"
    WHERE id = branch2_branch_id
      AND lower(name) = lower('Salaama')
      AND active = true
  ) THEN
    RAISE EXCEPTION 'branch2 record id=% is not the active Salaama branch', branch2_branch_id;
  END IF;

  UPDATE "Branch"
  SET code = 'salaama', "updatedAt" = CURRENT_TIMESTAMP
  WHERE id = branch2_branch_id;

  RAISE NOTICE 'Renamed Salaama branch id=% from branch2 to salaama', branch2_branch_id;
END $$;
