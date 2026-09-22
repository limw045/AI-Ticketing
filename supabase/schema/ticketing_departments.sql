-- Apply after the base schema. Department identity must come from the directory.
BEGIN;
CREATE OR REPLACE FUNCTION gtjbticketing.sync_profile_department()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE matched gtjbticketing.departments;
BEGIN
  SELECT * INTO matched FROM gtjbticketing.departments WHERE id = NEW.department_id;
  IF matched.id IS NULL OR matched.is_system THEN
    RAISE EXCEPTION 'Select a staff department from the directory';
  END IF;
  IF NOT matched.is_active AND (TG_OP = 'INSERT' OR NEW.department_id IS DISTINCT FROM OLD.department_id) THEN
    RAISE EXCEPTION 'Select an active staff department';
  END IF;
  NEW.department := matched.name;
  RETURN NEW;
END;
$$;
ALTER TABLE gtjbticketing.profiles ALTER COLUMN department_id SET NOT NULL;

CREATE OR REPLACE FUNCTION gtjbticketing.sync_department_profile_names()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE gtjbticketing.profiles SET department = NEW.name WHERE department_id = NEW.id;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION gtjbticketing.sync_department_profile_names() FROM PUBLIC;
DROP TRIGGER IF EXISTS sync_department_profile_names ON gtjbticketing.departments;
CREATE TRIGGER sync_department_profile_names AFTER UPDATE OF name ON gtjbticketing.departments
FOR EACH ROW WHEN (OLD.name IS DISTINCT FROM NEW.name)
EXECUTE FUNCTION gtjbticketing.sync_department_profile_names();
NOTIFY pgrst, 'reload schema';
COMMIT;
