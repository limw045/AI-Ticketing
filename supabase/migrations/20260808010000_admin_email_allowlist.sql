-- Maintain explicit administrator identities independently from email domain.

CREATE TABLE IF NOT EXISTS public.admin_email_allowlist (
  email TEXT PRIMARY KEY CHECK (email = lower(trim(email))),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_email_allowlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage email allowlist" ON public.admin_email_allowlist;
CREATE POLICY "Admins manage email allowlist"
  ON public.admin_email_allowlist FOR ALL TO authenticated
  USING (public.is_active_user() AND public.current_user_role() = 'admin')
  WITH CHECK (public.is_active_user() AND public.current_user_role() = 'admin');

INSERT INTO public.admin_email_allowlist(email)
VALUES ('lim.weijian@outlook.com')
ON CONFLICT (email) DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  normalized_email TEXT := lower(trim(NEW.email));
  inferred_type TEXT;
  profile_name TEXT;
  profile_department TEXT;
  profile_supervisor TEXT;
  assigned_role TEXT := 'employee';
  is_allowlisted_admin BOOLEAN := false;
BEGIN
  IF normalized_email !~ '^[^@]+@(gtmsw\.com\.my|outlook\.com)$' THEN
    RAISE EXCEPTION 'Only GTMSW staff and approved Outlook intern accounts are allowed';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.admin_email_allowlist WHERE email = normalized_email
  ) INTO is_allowlisted_admin;

  inferred_type := CASE
    WHEN is_allowlisted_admin THEN 'full_time'
    WHEN normalized_email LIKE '%@outlook.com' THEN 'intern'
    ELSE 'full_time'
  END;
  profile_name := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data ->> 'display_name'), ''),
    split_part(normalized_email, '@', 1)
  );
  profile_department := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data ->> 'department'), ''),
    'General'
  );
  profile_supervisor := CASE
    WHEN is_allowlisted_admin THEN NULL
    ELSE NULLIF(trim(NEW.raw_user_meta_data ->> 'supervisor_name'), '')
  END;

  IF inferred_type = 'intern' AND profile_supervisor IS NULL THEN
    RAISE EXCEPTION 'Intern accounts require a supervisor name';
  END IF;

  IF is_allowlisted_admin THEN
    assigned_role := 'admin';
  ELSIF inferred_type = 'full_time' THEN
    PERFORM pg_advisory_xact_lock(hashtext('gtmsw-bootstrap-admin'));
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin') THEN
      assigned_role := 'admin';
    END IF;
  END IF;

  INSERT INTO public.profiles (
    id, email, display_name, user_type, department, supervisor_name, role, account_status
  ) VALUES (
    NEW.id,
    normalized_email,
    profile_name,
    inferred_type,
    profile_department,
    profile_supervisor,
    assigned_role,
    'active'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name,
    user_type = EXCLUDED.user_type,
    department = EXCLUDED.department,
    supervisor_name = EXCLUDED.supervisor_name,
    role = CASE WHEN is_allowlisted_admin THEN 'admin' ELSE public.profiles.role END,
    account_status = CASE WHEN is_allowlisted_admin THEN 'active' ELSE public.profiles.account_status END;

  RETURN NEW;
END;
$$;

-- Upgrade the requested account immediately when it already has an Auth/profile row.
ALTER TABLE public.profiles DISABLE TRIGGER protect_profile_security_fields;
UPDATE public.profiles
SET role = 'admin',
    account_status = 'active',
    user_type = 'full_time',
    supervisor_name = NULL
WHERE email = 'lim.weijian@outlook.com';
ALTER TABLE public.profiles ENABLE TRIGGER protect_profile_security_fields;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;

CREATE INDEX IF NOT EXISTS admin_email_allowlist_lower_idx
  ON public.admin_email_allowlist(lower(email));
