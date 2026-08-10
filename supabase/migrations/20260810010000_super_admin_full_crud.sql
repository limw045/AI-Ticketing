-- Super Admin RBAC and safe full-CRUD administration.
-- This migration is additive and preserves existing staff, tickets, and API keys.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id);

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id);

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id);

ALTER TABLE public.faqs
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id);

ALTER TABLE public.category_rules
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id);

ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id);

ALTER TABLE public.api_clients
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id);

CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  changed_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- Convert the legacy four-role model into employee/admin/super_admin.
DROP TRIGGER IF EXISTS protect_profile_security_fields ON public.profiles;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
UPDATE public.profiles SET role = 'admin' WHERE role = 'support_agent';
UPDATE public.profiles
SET role = 'super_admin',
    account_status = 'active',
    deleted_at = NULL,
    deleted_by = NULL,
    user_type = 'full_time',
    supervisor_name = NULL
WHERE lower(email) = 'lim.weijian@outlook.com';
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('employee', 'admin', 'super_admin'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE role = 'super_admin' AND account_status = 'active' AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'The reserved Super Admin profile must exist and be active before this migration can complete';
  END IF;
END $$;

-- The allowlist no longer grants administrator roles. All future promotions are explicit.
DROP TABLE IF EXISTS public.admin_email_allowlist;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND account_status = 'active'
      AND deleted_at IS NULL
  );
$$;

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
BEGIN
  IF normalized_email !~ '^[^@]+@(gtmsw\.com\.my|outlook\.com)$' THEN
    RAISE EXCEPTION 'Only GTMSW staff and approved Outlook intern accounts are allowed';
  END IF;

  IF normalized_email = 'lim.weijian@outlook.com' THEN
    inferred_type := 'full_time';
    profile_supervisor := NULL;
    assigned_role := 'super_admin';
  ELSE
    inferred_type := CASE WHEN normalized_email LIKE '%@outlook.com' THEN 'intern' ELSE 'full_time' END;
    profile_supervisor := NULLIF(trim(NEW.raw_user_meta_data ->> 'supervisor_name'), '');
  END IF;

  IF inferred_type = 'intern' AND profile_supervisor IS NULL THEN
    RAISE EXCEPTION 'Intern accounts require a supervisor name';
  END IF;

  profile_name := COALESCE(NULLIF(trim(NEW.raw_user_meta_data ->> 'display_name'), ''), split_part(normalized_email, '@', 1));
  profile_department := COALESCE(NULLIF(trim(NEW.raw_user_meta_data ->> 'department'), ''), 'General');

  INSERT INTO public.profiles (
    id, email, display_name, user_type, department, supervisor_name,
    role, account_status, deleted_at, deleted_by
  ) VALUES (
    NEW.id, normalized_email, profile_name, inferred_type, profile_department,
    profile_supervisor, assigned_role, 'active', NULL, NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name,
    user_type = EXCLUDED.user_type,
    department = EXCLUDED.department,
    supervisor_name = EXCLUDED.supervisor_name;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_profile_security_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_role TEXT := public.current_user_role();
  active_super_admins INTEGER;
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.email IS DISTINCT FROM OLD.email
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Profile identity fields are immutable';
  END IF;

  IF NEW.user_type IS DISTINCT FROM OLD.user_type
    OR NEW.supervisor_name IS DISTINCT FROM OLD.supervisor_name
    OR NEW.role IS DISTINCT FROM OLD.role
    OR NEW.account_status IS DISTINCT FROM OLD.account_status
    OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
    OR NEW.deleted_by IS DISTINCT FROM OLD.deleted_by
  THEN
    IF auth.uid() = OLD.id THEN
      RAISE EXCEPTION 'You cannot change your own access or account lifecycle';
    END IF;

    IF actor_role = 'admin' THEN
      IF OLD.role <> 'employee' OR NEW.role <> 'employee' THEN
        RAISE EXCEPTION 'Administrators may only manage Employee accounts';
      END IF;
    ELSIF actor_role = 'super_admin' THEN
      NULL;
    ELSE
      RAISE EXCEPTION 'Administrator access required';
    END IF;
  END IF;

  IF actor_role = 'admin'
    AND auth.uid() IS DISTINCT FROM OLD.id
    AND OLD.role <> 'employee'
    AND NEW IS DISTINCT FROM OLD
  THEN
    RAISE EXCEPTION 'Administrators may not modify other administrators';
  END IF;

  IF OLD.role = 'super_admin'
    AND OLD.account_status = 'active'
    AND OLD.deleted_at IS NULL
    AND (
      NEW.role IS DISTINCT FROM 'super_admin'
      OR NEW.account_status IS DISTINCT FROM 'active'
      OR NEW.deleted_at IS NOT NULL
    )
  THEN
    SELECT count(*) INTO active_super_admins
    FROM public.profiles
    WHERE role = 'super_admin' AND account_status = 'active' AND deleted_at IS NULL;
    IF active_super_admins <= 1 THEN
      RAISE EXCEPTION 'The final active Super Admin cannot be demoted, suspended, or deleted';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_profile_security_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_security_fields();

CREATE OR REPLACE FUNCTION public.touch_admin_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_system_comments()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.type = 'system_audit' AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'System comments are immutable';
  END IF;
  IF NEW.author_id IS DISTINCT FROM OLD.author_id
    OR NEW.ticket_id IS DISTINCT FROM OLD.ticket_id
    OR NEW.type IS DISTINCT FROM OLD.type
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Comment identity fields are immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_system_comments ON public.comments;
CREATE TRIGGER protect_system_comments
  BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.protect_system_comments();

DO $$
DECLARE
  target_table TEXT;
BEGIN
  FOREACH target_table IN ARRAY ARRAY['comments', 'faqs', 'category_rules', 'incidents', 'api_clients']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS touch_admin_updated_at ON public.%I', target_table);
    EXECUTE format(
      'CREATE TRIGGER touch_admin_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.touch_admin_updated_at()',
      target_table
    );
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.audit_admin_resource_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_role TEXT := public.current_user_role();
  safe_row JSONB;
BEGIN
  IF auth.uid() IS NULL OR actor_role NOT IN ('admin', 'super_admin') THEN
    RETURN NEW;
  END IF;
  safe_row := to_jsonb(NEW)
    - 'key_hash' - 'description' - 'content' - 'answer' - 'template_markdown'
    - 'system_logs' - 'device_context' - 'ai_summary';
  INSERT INTO public.admin_activity_logs(actor_id, action, entity_type, entity_id, changed_fields)
  VALUES (
    auth.uid(),
    lower(TG_OP),
    TG_TABLE_NAME,
    COALESCE(safe_row ->> 'id', ''),
    safe_row
  );
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  target_table TEXT;
BEGIN
  FOREACH target_table IN ARRAY ARRAY['profiles', 'tickets', 'comments', 'faqs', 'category_rules', 'incidents', 'api_clients']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_admin_resource_change ON public.%I', target_table);
    EXECUTE format(
      'CREATE TRIGGER audit_admin_resource_change AFTER INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_admin_resource_change()',
      target_table
    );
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.set_admin_record_deleted(
  p_resource TEXT,
  p_record_id UUID,
  p_restore BOOLEAN DEFAULT false
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_role TEXT := public.current_user_role();
  affected INTEGER;
BEGIN
  IF NOT public.is_active_user() OR actor_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;
  IF p_resource NOT IN ('tickets', 'comments', 'faqs', 'category_rules', 'incidents', 'api_clients') THEN
    RAISE EXCEPTION 'Unsupported administrative resource';
  END IF;

  IF p_restore THEN
    EXECUTE format('UPDATE public.%I SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 AND deleted_at IS NOT NULL', p_resource)
      USING p_record_id;
  ELSIF p_resource = 'api_clients' THEN
    UPDATE public.api_clients
    SET is_active = false, deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_record_id AND deleted_at IS NULL;
  ELSE
    EXECUTE format('UPDATE public.%I SET deleted_at = now(), deleted_by = $2 WHERE id = $1 AND deleted_at IS NULL', p_resource)
      USING p_record_id, auth.uid();
  END IF;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected = 0 THEN
    RAISE EXCEPTION 'Record not found or already in the requested lifecycle state';
  END IF;
  RETURN true;
END;
$$;

-- Refresh notification triggers for the three-role model.
CREATE OR REPLACE FUNCTION public.audit_ticket_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.ticket_audit_logs(ticket_id, actor_id, action, new_value)
    VALUES (NEW.id, auth.uid(), 'ticket_created', NEW.source);
    INSERT INTO public.notifications(recipient_id, ticket_id, kind, title, body)
    SELECT p.id, NEW.id, 'new_ticket', 'New ticket #' || NEW.ticket_number, NEW.title
    FROM public.profiles p
    WHERE p.role IN ('admin', 'super_admin')
      AND p.account_status = 'active' AND p.deleted_at IS NULL
      AND p.id IS DISTINCT FROM auth.uid();
    RETURN NEW;
  END IF;
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.ticket_audit_logs(ticket_id, actor_id, action, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'status_changed', OLD.status, NEW.status);
    IF NEW.author_id IS NOT NULL AND NEW.author_id IS DISTINCT FROM auth.uid() THEN
      INSERT INTO public.notifications(recipient_id, ticket_id, kind, title, body)
      VALUES (NEW.author_id, NEW.id, 'status', 'Ticket #' || NEW.ticket_number || ' status updated', NEW.status);
    END IF;
  END IF;
  IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
    INSERT INTO public.ticket_audit_logs(ticket_id, actor_id, action, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'assignee_changed', OLD.assignee_id::TEXT, NEW.assignee_id::TEXT);
    IF NEW.assignee_id IS NOT NULL AND NEW.assignee_id IS DISTINCT FROM auth.uid() THEN
      INSERT INTO public.notifications(recipient_id, ticket_id, kind, title, body)
      VALUES (NEW.assignee_id, NEW.id, 'assignment', 'Ticket #' || NEW.ticket_number || ' assigned to you', NEW.title);
    END IF;
  END IF;
  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO public.ticket_audit_logs(ticket_id, actor_id, action, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'priority_changed', OLD.priority, NEW.priority);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_ticket_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  parent_ticket public.tickets;
  author_role TEXT;
BEGIN
  SELECT * INTO parent_ticket FROM public.tickets WHERE id = NEW.ticket_id;
  SELECT role INTO author_role FROM public.profiles WHERE id = NEW.author_id;
  IF NEW.is_internal_note THEN RETURN NEW; END IF;

  IF author_role IN ('admin', 'super_admin') THEN
    IF parent_ticket.author_id IS NOT NULL AND parent_ticket.author_id IS DISTINCT FROM NEW.author_id THEN
      INSERT INTO public.notifications(recipient_id, ticket_id, kind, title, body)
      VALUES (parent_ticket.author_id, NEW.ticket_id, 'comment', 'New reply on ticket #' || parent_ticket.ticket_number, left(NEW.content, 180));
    END IF;
  ELSE
    INSERT INTO public.notifications(recipient_id, ticket_id, kind, title, body)
    SELECT p.id, NEW.ticket_id, 'comment', 'New employee reply on ticket #' || parent_ticket.ticket_number, left(NEW.content, 180)
    FROM public.profiles p
    WHERE p.account_status = 'active' AND p.deleted_at IS NULL
      AND p.role IN ('admin', 'super_admin')
      AND (p.id = parent_ticket.assignee_id OR parent_ticket.assignee_id IS NULL)
      AND p.id IS DISTINCT FROM NEW.author_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Replace resource policies with explicit three-role and soft-delete rules.
DROP POLICY IF EXISTS "Authenticated profiles read" ON public.profiles;
DROP POLICY IF EXISTS "Profile self or admin update" ON public.profiles;
CREATE POLICY "Visible profiles read" ON public.profiles FOR SELECT TO authenticated
  USING (public.is_active_user() AND (deleted_at IS NULL OR public.current_user_role() IN ('admin', 'super_admin')));
CREATE POLICY "Profile self or administrators update" ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_active_user() AND (id = auth.uid() OR public.current_user_role() IN ('admin', 'super_admin')))
  WITH CHECK (public.is_active_user() AND (id = auth.uid() OR public.current_user_role() IN ('admin', 'super_admin')));

DROP POLICY IF EXISTS "Visible tickets read" ON public.tickets;
DROP POLICY IF EXISTS "Agents update tickets" ON public.tickets;
CREATE POLICY "Visible tickets read" ON public.tickets FOR SELECT TO authenticated
  USING (
    public.is_active_user() AND (
      (author_id = auth.uid() AND deleted_at IS NULL)
      OR public.current_user_role() IN ('admin', 'super_admin')
    )
  );
CREATE POLICY "Administrators update tickets" ON public.tickets FOR UPDATE TO authenticated
  USING (public.is_active_user() AND public.current_user_role() IN ('admin', 'super_admin'))
  WITH CHECK (public.is_active_user() AND public.current_user_role() IN ('admin', 'super_admin'));

DROP POLICY IF EXISTS "Visible comments read" ON public.comments;
DROP POLICY IF EXISTS "Visible comments insert" ON public.comments;
CREATE POLICY "Visible comments read" ON public.comments FOR SELECT TO authenticated
  USING (
    public.is_active_user() AND (
      public.current_user_role() IN ('admin', 'super_admin')
      OR (
        deleted_at IS NULL
        AND EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = comments.ticket_id AND t.author_id = auth.uid() AND t.deleted_at IS NULL)
        AND NOT is_internal_note
      )
    )
  );
CREATE POLICY "Visible comments insert" ON public.comments FOR INSERT TO authenticated
  WITH CHECK (
    public.is_active_user() AND author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.tickets t WHERE t.id = comments.ticket_id AND t.deleted_at IS NULL
        AND (t.author_id = auth.uid() OR public.current_user_role() IN ('admin', 'super_admin'))
    )
    AND (NOT is_internal_note OR public.current_user_role() IN ('admin', 'super_admin'))
  );
CREATE POLICY "Administrators update comments" ON public.comments FOR UPDATE TO authenticated
  USING (public.is_active_user() AND public.current_user_role() IN ('admin', 'super_admin'))
  WITH CHECK (public.is_active_user() AND public.current_user_role() IN ('admin', 'super_admin'));

DROP POLICY IF EXISTS "Visible audit logs read" ON public.ticket_audit_logs;
CREATE POLICY "Visible audit logs read" ON public.ticket_audit_logs FOR SELECT TO authenticated
  USING (
    public.is_active_user() AND EXISTS (
      SELECT 1 FROM public.tickets t WHERE t.id = ticket_audit_logs.ticket_id
        AND (t.author_id = auth.uid() OR public.current_user_role() IN ('admin', 'super_admin'))
    )
  );

DROP POLICY IF EXISTS "Authenticated FAQs read" ON public.faqs;
DROP POLICY IF EXISTS "Agents manage FAQs" ON public.faqs;
CREATE POLICY "Visible FAQs read" ON public.faqs FOR SELECT TO authenticated
  USING (public.is_active_user() AND (deleted_at IS NULL OR public.current_user_role() IN ('admin', 'super_admin')));
CREATE POLICY "Administrators insert FAQs" ON public.faqs FOR INSERT TO authenticated
  WITH CHECK (public.is_active_user() AND public.current_user_role() IN ('admin', 'super_admin'));
CREATE POLICY "Administrators update FAQs" ON public.faqs FOR UPDATE TO authenticated
  USING (public.is_active_user() AND public.current_user_role() IN ('admin', 'super_admin'))
  WITH CHECK (public.is_active_user() AND public.current_user_role() IN ('admin', 'super_admin'));

DROP POLICY IF EXISTS "Authenticated category rules read" ON public.category_rules;
DROP POLICY IF EXISTS "Agents manage category rules" ON public.category_rules;
CREATE POLICY "Visible category rules read" ON public.category_rules FOR SELECT TO authenticated
  USING (public.is_active_user() AND (deleted_at IS NULL OR public.current_user_role() IN ('admin', 'super_admin')));
CREATE POLICY "Administrators insert category rules" ON public.category_rules FOR INSERT TO authenticated
  WITH CHECK (public.is_active_user() AND public.current_user_role() IN ('admin', 'super_admin'));
CREATE POLICY "Administrators update category rules" ON public.category_rules FOR UPDATE TO authenticated
  USING (public.is_active_user() AND public.current_user_role() IN ('admin', 'super_admin'))
  WITH CHECK (public.is_active_user() AND public.current_user_role() IN ('admin', 'super_admin'));

DROP POLICY IF EXISTS "Authenticated incidents read" ON public.incidents;
DROP POLICY IF EXISTS "Agents manage incidents" ON public.incidents;
CREATE POLICY "Visible incidents read" ON public.incidents FOR SELECT TO authenticated
  USING (public.is_active_user() AND (deleted_at IS NULL OR public.current_user_role() IN ('admin', 'super_admin')));
CREATE POLICY "Administrators insert incidents" ON public.incidents FOR INSERT TO authenticated
  WITH CHECK (public.is_active_user() AND public.current_user_role() IN ('admin', 'super_admin'));
CREATE POLICY "Administrators update incidents" ON public.incidents FOR UPDATE TO authenticated
  USING (public.is_active_user() AND public.current_user_role() IN ('admin', 'super_admin'))
  WITH CHECK (public.is_active_user() AND public.current_user_role() IN ('admin', 'super_admin'));

DROP POLICY IF EXISTS "Admins read API clients" ON public.api_clients;
DROP POLICY IF EXISTS "Admins update API clients" ON public.api_clients;
CREATE POLICY "Administrators read API clients" ON public.api_clients FOR SELECT TO authenticated
  USING (public.is_active_user() AND public.current_user_role() IN ('admin', 'super_admin'));
CREATE POLICY "Administrators update API clients" ON public.api_clients FOR UPDATE TO authenticated
  USING (public.is_active_user() AND public.current_user_role() IN ('admin', 'super_admin'))
  WITH CHECK (public.is_active_user() AND public.current_user_role() IN ('admin', 'super_admin'));

DROP POLICY IF EXISTS "Admins read API request logs" ON public.api_request_logs;
CREATE POLICY "Super Admins read API request logs" ON public.api_request_logs FOR SELECT TO authenticated
  USING (public.is_active_user() AND public.current_user_role() = 'super_admin');
CREATE POLICY "Super Admins read all notifications" ON public.notifications FOR SELECT TO authenticated
  USING (public.is_active_user() AND public.current_user_role() = 'super_admin');
CREATE POLICY "Super Admins read activity logs" ON public.admin_activity_logs FOR SELECT TO authenticated
  USING (public.is_active_user() AND public.current_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Users read ticket attachments" ON storage.objects;
CREATE POLICY "Users read ticket attachments" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'ticket-attachments' AND public.is_active_user()
    AND ((storage.foldername(name))[1] = auth.uid()::TEXT OR public.current_user_role() IN ('admin', 'super_admin'))
  );

CREATE OR REPLACE FUNCTION public.create_api_client(client_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  raw_key TEXT;
  new_client public.api_clients;
BEGIN
  IF NOT public.is_active_user() OR public.current_user_role() NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;
  IF NULLIF(trim(client_name), '') IS NULL THEN RAISE EXCEPTION 'Client name is required'; END IF;
  raw_key := 'gts_' || encode(extensions.gen_random_bytes(24), 'hex');
  INSERT INTO public.api_clients(name, key_hash, created_by)
  VALUES (trim(client_name), encode(extensions.digest(raw_key, 'sha256'), 'hex'), auth.uid())
  RETURNING * INTO new_client;
  RETURN jsonb_build_object('id', new_client.id, 'name', new_client.name, 'api_key', raw_key);
END;
$$;

CREATE OR REPLACE FUNCTION public.soft_delete_ticket(p_ticket_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN public.set_admin_record_deleted('tickets', p_ticket_id, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_api_client(p_client_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN public.set_admin_record_deleted('api_clients', p_client_id, false);
END;
$$;

-- Deleted API clients can never authenticate ingestion requests.
CREATE OR REPLACE FUNCTION public.ingest_ticket(
  p_api_key TEXT,
  p_ticket_title TEXT,
  p_ticket_description TEXT,
  p_ticket_category TEXT DEFAULT 'System Bug',
  p_ticket_priority TEXT DEFAULT 'medium',
  p_user_email TEXT DEFAULT NULL,
  p_system_logs JSONB DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  matched_client public.api_clients;
  matched_author UUID;
  new_ticket public.tickets;
  recent_requests INTEGER;
BEGIN
  SELECT * INTO matched_client FROM public.api_clients
  WHERE key_hash = encode(extensions.digest(p_api_key, 'sha256'), 'hex')
    AND is_active = true AND deleted_at IS NULL LIMIT 1;
  IF matched_client.id IS NULL THEN RAISE EXCEPTION 'Invalid API key' USING ERRCODE = '28000'; END IF;

  IF p_idempotency_key IS NOT NULL THEN
    IF length(p_idempotency_key) > 200 THEN RAISE EXCEPTION 'Idempotency key is too long'; END IF;
    SELECT t.* INTO new_ticket FROM public.api_request_logs l
    JOIN public.tickets t ON t.id = l.ticket_id
    WHERE l.client_id = matched_client.id AND l.idempotency_key = p_idempotency_key LIMIT 1;
    IF new_ticket.id IS NOT NULL THEN
      RETURN jsonb_build_object('id', new_ticket.id, 'ticket_number', new_ticket.ticket_number, 'title', new_ticket.title, 'status', new_ticket.status, 'duplicate', true);
    END IF;
  END IF;

  SELECT count(*) INTO recent_requests FROM public.api_request_logs
  WHERE client_id = matched_client.id AND created_at > now() - interval '1 minute';
  IF recent_requests >= 60 THEN RAISE EXCEPTION 'API rate limit exceeded'; END IF;
  IF NULLIF(trim(p_ticket_title), '') IS NULL OR NULLIF(trim(p_ticket_description), '') IS NULL THEN
    RAISE EXCEPTION 'Title and description are required';
  END IF;
  IF length(p_ticket_title) > 200 OR length(p_ticket_description) > 100000 THEN RAISE EXCEPTION 'Ticket content exceeds the allowed size'; END IF;
  IF p_ticket_priority NOT IN ('low', 'medium', 'high', 'urgent') THEN RAISE EXCEPTION 'Invalid priority'; END IF;
  IF p_user_email IS NOT NULL THEN
    IF lower(trim(p_user_email)) !~ '^[^@]+@(gtmsw\.com\.my|outlook\.com)$' THEN RAISE EXCEPTION 'Reporter email domain is not allowed'; END IF;
    SELECT id INTO matched_author FROM public.profiles
    WHERE email = lower(trim(p_user_email)) AND account_status = 'active' AND deleted_at IS NULL LIMIT 1;
  END IF;
  IF p_system_logs IS NOT NULL AND length(p_system_logs::TEXT) > 100000 THEN RAISE EXCEPTION 'System logs exceed the allowed size'; END IF;

  INSERT INTO public.tickets(title, description, category, priority, author_id, reporter_email, system_logs, source)
  VALUES (trim(p_ticket_title), p_ticket_description, COALESCE(NULLIF(trim(p_ticket_category), ''), 'System Bug'), p_ticket_priority,
    matched_author, CASE WHEN p_user_email IS NULL THEN NULL ELSE lower(trim(p_user_email)) END, p_system_logs, 'api')
  RETURNING * INTO new_ticket;
  INSERT INTO public.api_request_logs(client_id, ticket_id, idempotency_key)
  VALUES (matched_client.id, new_ticket.id, p_idempotency_key);
  UPDATE public.api_clients SET last_used_at = now() WHERE id = matched_client.id;
  RETURN jsonb_build_object('id', new_ticket.id, 'ticket_number', new_ticket.ticket_number, 'title', new_ticket.title, 'status', new_ticket.status);
END;
$$;

REVOKE ALL ON FUNCTION public.set_admin_record_deleted(TEXT, UUID, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.touch_admin_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.protect_system_comments() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.audit_admin_resource_change() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_admin_record_deleted(TEXT, UUID, BOOLEAN) TO authenticated;

CREATE INDEX IF NOT EXISTS profiles_role_status_created_idx ON public.profiles(role, account_status, created_at DESC);
CREATE INDEX IF NOT EXISTS profiles_deleted_created_idx ON public.profiles(deleted_at, created_at DESC);
CREATE INDEX IF NOT EXISTS tickets_deleted_created_idx ON public.tickets(deleted_at, created_at DESC);
CREATE INDEX IF NOT EXISTS comments_deleted_created_idx ON public.comments(deleted_at, created_at DESC);
CREATE INDEX IF NOT EXISTS faqs_deleted_created_idx ON public.faqs(deleted_at, created_at DESC);
CREATE INDEX IF NOT EXISTS category_rules_deleted_created_idx ON public.category_rules(deleted_at, created_at DESC);
CREATE INDEX IF NOT EXISTS incidents_deleted_created_idx ON public.incidents(deleted_at, created_at DESC);
CREATE INDEX IF NOT EXISTS api_clients_deleted_created_idx ON public.api_clients(deleted_at, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_activity_actor_created_idx ON public.admin_activity_logs(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_activity_entity_created_idx ON public.admin_activity_logs(entity_type, created_at DESC);
