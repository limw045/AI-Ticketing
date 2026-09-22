-- App-owned profiles for existing Supabase Auth identities. Does not create Auth users.
BEGIN;
-- Missing application membership is an empty role, never SQL NULL. Existing
-- authorization routines use NOT IN / <> and must fail closed for new Auth users.
CREATE OR REPLACE FUNCTION gtjbticketing.current_user_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT coalesce((SELECT role FROM gtjbticketing.profiles
    WHERE id = gtjbticketing.auth_user_id() LIMIT 1), '');
$$;
CREATE OR REPLACE FUNCTION gtjbticketing.complete_ticketing_profile(
  p_display_name text,
  p_department_id uuid,
  p_user_type text,
  p_supervisor_name text DEFAULT NULL,
  p_initial_department_name text DEFAULT NULL
)
RETURNS gtjbticketing.profiles
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor_id uuid := gtjbticketing.auth_user_id();
  actor_email text := lower(trim(gtjbticketing.auth_claims()->>'email'));
  selected_department gtjbticketing.departments;
  existing_profile gtjbticketing.profiles;
  assigned_role text := 'employee';
BEGIN
  IF actor_id IS NULL OR gtjbticketing.auth_claims()->>'role' IS DISTINCT FROM 'authenticated' THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF actor_email IS NULL OR actor_email = '' THEN
    RAISE EXCEPTION 'An authenticated email address is required';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('gtjbticketing-profile:' || actor_id::text, 0));
  SELECT * INTO existing_profile FROM gtjbticketing.profiles WHERE id = actor_id;
  IF FOUND THEN
    -- Repeated onboarding cannot elevate, reactivate, or overwrite existing access.
    RETURN existing_profile;
  END IF;
  IF p_display_name IS NULL OR length(trim(p_display_name)) NOT BETWEEN 1 AND 120 THEN
    RAISE EXCEPTION 'Enter a name between 1 and 120 characters';
  END IF;
  IF p_user_type IS NULL OR p_user_type NOT IN ('full_time','intern','contractor') THEN
    RAISE EXCEPTION 'Select a valid account type';
  END IF;
  IF p_user_type = 'intern' AND nullif(trim(p_supervisor_name),'') IS NULL THEN
    RAISE EXCEPTION 'Interns must specify a supervisor';
  END IF;
  -- Preserve the project's existing reserved administrator policy. The email comes
  -- from the signed Auth JWT, never the request body or editable user metadata.
  IF actor_email = 'lim.weijian@outlook.com' THEN assigned_role := 'super_admin'; END IF;
  -- Keep the legacy fifth argument for deployed clients, but never create departments here.
  SELECT * INTO selected_department FROM gtjbticketing.departments
  WHERE id = p_department_id AND is_active AND NOT is_system;
  IF NOT FOUND THEN RAISE EXCEPTION 'Select an active department'; END IF;
  INSERT INTO gtjbticketing.profiles(id,email,display_name,user_type,department,
    department_id,supervisor_name,role,account_status)
  VALUES(actor_id,actor_email,trim(p_display_name),p_user_type,selected_department.name,
    selected_department.id,nullif(trim(p_supervisor_name),''),assigned_role,'active')
  RETURNING * INTO existing_profile;
  RETURN existing_profile;
END;
$$;
REVOKE ALL ON FUNCTION gtjbticketing.complete_ticketing_profile(text,uuid,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION gtjbticketing.complete_ticketing_profile(text,uuid,text,text,text) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
