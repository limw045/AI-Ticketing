-- Backend integrity and authorization hardening.
-- This migration is intentionally additive so existing Auth users and tickets survive.

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_account_status_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_account_status_check
      CHECK (account_status IN ('active', 'suspended'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_content_length_check') THEN
    ALTER TABLE public.tickets ADD CONSTRAINT tickets_content_length_check CHECK (
      char_length(trim(title)) BETWEEN 1 AND 200
      AND char_length(description) BETWEEN 1 AND 100000
      AND char_length(trim(category)) BETWEEN 1 AND 100
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comments_content_length_check') THEN
    ALTER TABLE public.comments ADD CONSTRAINT comments_content_length_check
      CHECK (char_length(trim(content)) BETWEEN 1 AND 20000);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'faqs_content_length_check') THEN
    ALTER TABLE public.faqs ADD CONSTRAINT faqs_content_length_check CHECK (
      char_length(trim(question)) BETWEEN 1 AND 500
      AND char_length(trim(answer)) BETWEEN 1 AND 50000
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'incidents_content_length_check') THEN
    ALTER TABLE public.incidents ADD CONSTRAINT incidents_content_length_check CHECK (
      char_length(trim(title)) BETWEEN 1 AND 200
      AND char_length(trim(message)) BETWEEN 1 AND 5000
    );
  END IF;
END $$;

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'portal',
  ADD COLUMN IF NOT EXISTS reporter_email TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tickets_source_check'
  ) THEN
    ALTER TABLE public.tickets
      ADD CONSTRAINT tickets_source_check CHECK (source IN ('portal', 'api'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('new_ticket', 'comment', 'status', 'assignment')),
  title TEXT NOT NULL,
  body TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

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
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND account_status = 'active'
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

  inferred_type := CASE
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
  profile_supervisor := NULLIF(trim(NEW.raw_user_meta_data ->> 'supervisor_name'), '');

  IF inferred_type = 'intern' AND profile_supervisor IS NULL THEN
    RAISE EXCEPTION 'Intern accounts require a supervisor name';
  END IF;

  -- Bootstrap exactly one administrator from a verified corporate mailbox.
  IF inferred_type = 'full_time' THEN
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
    supervisor_name = EXCLUDED.supervisor_name;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Repair profiles for Auth users created while browser-side profile inserts were blocked.
DROP TRIGGER IF EXISTS protect_profile_security_fields ON public.profiles;
INSERT INTO public.profiles (
  id, email, display_name, user_type, department, supervisor_name, role, account_status
)
SELECT
  u.id,
  lower(trim(u.email)),
  COALESCE(NULLIF(trim(u.raw_user_meta_data ->> 'display_name'), ''), split_part(lower(u.email), '@', 1)),
  CASE WHEN lower(u.email) LIKE '%@outlook.com' THEN 'intern' ELSE 'full_time' END,
  COALESCE(NULLIF(trim(u.raw_user_meta_data ->> 'department'), ''), 'General'),
  CASE
    WHEN lower(u.email) LIKE '%@outlook.com'
      THEN COALESCE(NULLIF(trim(u.raw_user_meta_data ->> 'supervisor_name'), ''), 'Pending assignment')
    ELSE NULL
  END,
  'employee',
  'active'
FROM auth.users u
WHERE lower(u.email) ~ '^[^@]+@(gtmsw\.com\.my|outlook\.com)$'
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin') THEN
    UPDATE public.profiles
    SET role = 'admin'
    WHERE id = (
      SELECT id FROM public.profiles
      WHERE user_type = 'full_time' AND account_status = 'active'
      ORDER BY created_at ASC
      LIMIT 1
    );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.protect_profile_security_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF public.current_user_role() IS DISTINCT FROM 'admin' AND (
    NEW.id IS DISTINCT FROM OLD.id OR
    NEW.email IS DISTINCT FROM OLD.email OR
    NEW.user_type IS DISTINCT FROM OLD.user_type OR
    NEW.role IS DISTINCT FROM OLD.role OR
    NEW.account_status IS DISTINCT FROM OLD.account_status OR
    NEW.created_at IS DISTINCT FROM OLD.created_at
  ) THEN
    RAISE EXCEPTION 'Only administrators may change identity, role, or account status';
  END IF;
  IF OLD.role = 'admin'
    AND OLD.account_status = 'active'
    AND (NEW.role IS DISTINCT FROM 'admin' OR NEW.account_status IS DISTINCT FROM 'active')
    AND (SELECT count(*) FROM public.profiles WHERE role = 'admin' AND account_status = 'active') <= 1
  THEN
    RAISE EXCEPTION 'The final active administrator cannot be demoted or suspended';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_security_fields ON public.profiles;
CREATE TRIGGER protect_profile_security_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_security_fields();

CREATE OR REPLACE FUNCTION public.prepare_ticket_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.ticket_number IS DISTINCT FROM OLD.ticket_number
    OR NEW.author_id IS DISTINCT FROM OLD.author_id
    OR NEW.source IS DISTINCT FROM OLD.source
    OR NEW.reporter_email IS DISTINCT FROM OLD.reporter_email
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Ticket identity and source fields are immutable';
  END IF;
  NEW.updated_at := now();
  IF NEW.status IN ('resolved', 'closed') AND OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.resolved_at := COALESCE(NEW.resolved_at, now());
  ELSIF NEW.status IN ('open', 'in_progress') THEN
    NEW.resolved_at := NULL;
  END IF;
  IF OLD.status = 'open' AND NEW.status = 'in_progress' THEN
    NEW.first_responded_at := COALESCE(NEW.first_responded_at, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prepare_ticket_update ON public.tickets;
CREATE TRIGGER prepare_ticket_update
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.prepare_ticket_update();

ALTER TABLE public.comments ALTER COLUMN ticket_id SET NOT NULL;
ALTER TABLE public.comments ALTER COLUMN author_id SET NOT NULL;

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
    WHERE p.role IN ('support_agent', 'admin')
      AND p.account_status = 'active'
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

  IF NEW.is_internal_note THEN
    RETURN NEW;
  END IF;

  IF author_role IN ('support_agent', 'admin') THEN
    IF parent_ticket.author_id IS NOT NULL AND parent_ticket.author_id IS DISTINCT FROM NEW.author_id THEN
      INSERT INTO public.notifications(recipient_id, ticket_id, kind, title, body)
      VALUES (parent_ticket.author_id, NEW.ticket_id, 'comment', 'New reply on ticket #' || parent_ticket.ticket_number, left(NEW.content, 180));
    END IF;
  ELSE
    INSERT INTO public.notifications(recipient_id, ticket_id, kind, title, body)
    SELECT p.id, NEW.ticket_id, 'comment', 'New employee reply on ticket #' || parent_ticket.ticket_number, left(NEW.content, 180)
    FROM public.profiles p
    WHERE p.account_status = 'active'
      AND p.role IN ('support_agent', 'admin')
      AND (p.id = parent_ticket.assignee_id OR parent_ticket.assignee_id IS NULL)
      AND p.id IS DISTINCT FROM NEW.author_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_ticket_comment ON public.comments;
CREATE TRIGGER notify_ticket_comment
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_ticket_comment();

DROP TRIGGER IF EXISTS audit_ticket_change ON public.tickets;
CREATE TRIGGER audit_ticket_change
  AFTER INSERT OR UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.audit_ticket_change();

-- Replace permissive/incomplete policies with parent-aware, role-aware policies.
DROP POLICY IF EXISTS "Public profiles read" ON public.profiles;
DROP POLICY IF EXISTS "Profile self update" ON public.profiles;
DROP POLICY IF EXISTS "Tickets read access" ON public.tickets;
DROP POLICY IF EXISTS "Tickets insert access" ON public.tickets;
DROP POLICY IF EXISTS "Tickets update access" ON public.tickets;
DROP POLICY IF EXISTS "Comments read access" ON public.comments;
DROP POLICY IF EXISTS "Comments insert access" ON public.comments;
DROP POLICY IF EXISTS "Public FAQs read" ON public.faqs;
DROP POLICY IF EXISTS "Admin FAQs write" ON public.faqs;
DROP POLICY IF EXISTS "Public Incidents read" ON public.incidents;
DROP POLICY IF EXISTS "Admin Incidents write" ON public.incidents;

CREATE POLICY "Authenticated profiles read"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_active_user());

CREATE POLICY "Profile self or admin update"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.current_user_role() = 'admin')
  WITH CHECK (id = auth.uid() OR public.current_user_role() = 'admin');

CREATE POLICY "Visible tickets read"
  ON public.tickets FOR SELECT TO authenticated
  USING (
    public.is_active_user()
    AND deleted_at IS NULL
    AND (
      author_id = auth.uid()
      OR public.current_user_role() IN ('support_agent', 'admin')
    )
  );

CREATE POLICY "Portal tickets insert"
  ON public.tickets FOR INSERT TO authenticated
  WITH CHECK (
    public.is_active_user()
    AND author_id = auth.uid()
    AND source = 'portal'
  );

CREATE POLICY "Agents update tickets"
  ON public.tickets FOR UPDATE TO authenticated
  USING (public.is_active_user() AND public.current_user_role() IN ('support_agent', 'admin'))
  WITH CHECK (public.is_active_user() AND public.current_user_role() IN ('support_agent', 'admin'));

CREATE POLICY "Visible comments read"
  ON public.comments FOR SELECT TO authenticated
  USING (
    public.is_active_user()
    AND EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = comments.ticket_id
        AND t.deleted_at IS NULL
        AND (t.author_id = auth.uid() OR public.current_user_role() IN ('support_agent', 'admin'))
    )
    AND (NOT is_internal_note OR public.current_user_role() IN ('support_agent', 'admin'))
  );

CREATE POLICY "Visible comments insert"
  ON public.comments FOR INSERT TO authenticated
  WITH CHECK (
    public.is_active_user()
    AND author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = comments.ticket_id
        AND t.deleted_at IS NULL
        AND (t.author_id = auth.uid() OR public.current_user_role() IN ('support_agent', 'admin'))
    )
    AND (NOT is_internal_note OR public.current_user_role() IN ('support_agent', 'admin'))
  );

CREATE POLICY "Visible audit logs read"
  ON public.ticket_audit_logs FOR SELECT TO authenticated
  USING (
    public.is_active_user()
    AND EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_audit_logs.ticket_id
        AND (t.author_id = auth.uid() OR public.current_user_role() IN ('support_agent', 'admin'))
    )
  );

CREATE POLICY "Authenticated FAQs read"
  ON public.faqs FOR SELECT TO authenticated
  USING (public.is_active_user());

CREATE POLICY "Agents manage FAQs"
  ON public.faqs FOR ALL TO authenticated
  USING (public.is_active_user() AND public.current_user_role() IN ('support_agent', 'admin'))
  WITH CHECK (public.is_active_user() AND public.current_user_role() IN ('support_agent', 'admin'));

CREATE POLICY "Authenticated category rules read"
  ON public.category_rules FOR SELECT TO authenticated
  USING (public.is_active_user());

CREATE POLICY "Agents manage category rules"
  ON public.category_rules FOR ALL TO authenticated
  USING (public.is_active_user() AND public.current_user_role() IN ('support_agent', 'admin'))
  WITH CHECK (public.is_active_user() AND public.current_user_role() IN ('support_agent', 'admin'));

CREATE POLICY "Authenticated incidents read"
  ON public.incidents FOR SELECT TO authenticated
  USING (public.is_active_user());

CREATE POLICY "Agents manage incidents"
  ON public.incidents FOR ALL TO authenticated
  USING (public.is_active_user() AND public.current_user_role() IN ('support_agent', 'admin'))
  WITH CHECK (public.is_active_user() AND public.current_user_role() IN ('support_agent', 'admin'));

CREATE POLICY "Recipients read notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (public.is_active_user() AND recipient_id = auth.uid());

CREATE POLICY "Recipients update notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (public.is_active_user() AND recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- Private attachment bucket. Stable application URLs are proxied through an authenticated route.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ticket-attachments',
  'ticket-attachments',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Users upload ticket attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users read ticket attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own ticket attachments" ON storage.objects;

CREATE POLICY "Users upload ticket attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'ticket-attachments'
    AND public.is_active_user()
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "Users read ticket attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'ticket-attachments'
    AND public.is_active_user()
    AND (
      (storage.foldername(name))[1] = auth.uid()::TEXT
      OR public.current_user_role() IN ('support_agent', 'admin')
    )
  );

CREATE POLICY "Users delete own ticket attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'ticket-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- Database-validated API clients avoid storing a service-role key in Vercel.
CREATE TABLE IF NOT EXISTS public.api_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  key_hash TEXT UNIQUE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.api_request_logs (
  id BIGSERIAL PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.api_clients(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE SET NULL,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.api_request_logs ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

ALTER TABLE public.api_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_request_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read API clients"
  ON public.api_clients FOR SELECT TO authenticated
  USING (public.is_active_user() AND public.current_user_role() = 'admin');

CREATE POLICY "Admins update API clients"
  ON public.api_clients FOR UPDATE TO authenticated
  USING (public.is_active_user() AND public.current_user_role() = 'admin')
  WITH CHECK (public.is_active_user() AND public.current_user_role() = 'admin');

CREATE POLICY "Admins read API request logs"
  ON public.api_request_logs FOR SELECT TO authenticated
  USING (public.is_active_user() AND public.current_user_role() = 'admin');

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
  IF NOT public.is_active_user() OR public.current_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;
  IF NULLIF(trim(client_name), '') IS NULL THEN
    RAISE EXCEPTION 'Client name is required';
  END IF;

  raw_key := 'gts_' || encode(extensions.gen_random_bytes(24), 'hex');
  INSERT INTO public.api_clients(name, key_hash, created_by)
  VALUES (trim(client_name), encode(extensions.digest(raw_key, 'sha256'), 'hex'), auth.uid())
  RETURNING * INTO new_client;

  RETURN jsonb_build_object('id', new_client.id, 'name', new_client.name, 'api_key', raw_key);
END;
$$;

CREATE OR REPLACE FUNCTION public.reopen_own_ticket(target_ticket_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  changed_count INTEGER;
BEGIN
  IF NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Active account required';
  END IF;

  UPDATE public.tickets
  SET status = 'open', resolved_at = NULL
  WHERE id = target_ticket_id
    AND author_id = auth.uid()
    AND status IN ('resolved', 'closed')
    AND resolved_at IS NOT NULL
    AND resolved_at >= now() - interval '7 days';

  GET DIAGNOSTICS changed_count = ROW_COUNT;
  IF changed_count = 0 THEN
    RAISE EXCEPTION 'Ticket cannot be reopened after seven days or by this user';
  END IF;
  RETURN true;
END;
$$;

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
  SELECT * INTO matched_client
  FROM public.api_clients
  WHERE key_hash = encode(extensions.digest(p_api_key, 'sha256'), 'hex') AND is_active = true
  LIMIT 1;

  IF matched_client.id IS NULL THEN
    RAISE EXCEPTION 'Invalid API key' USING ERRCODE = '28000';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    IF length(p_idempotency_key) > 200 THEN
      RAISE EXCEPTION 'Idempotency key is too long';
    END IF;
    SELECT t.* INTO new_ticket
    FROM public.api_request_logs l
    JOIN public.tickets t ON t.id = l.ticket_id
    WHERE l.client_id = matched_client.id AND l.idempotency_key = p_idempotency_key
    LIMIT 1;
    IF new_ticket.id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'id', new_ticket.id,
        'ticket_number', new_ticket.ticket_number,
        'title', new_ticket.title,
        'status', new_ticket.status,
        'duplicate', true
      );
    END IF;
  END IF;

  SELECT count(*) INTO recent_requests
  FROM public.api_request_logs
  WHERE client_id = matched_client.id AND created_at > now() - interval '1 minute';
  IF recent_requests >= 60 THEN
    RAISE EXCEPTION 'API rate limit exceeded' USING ERRCODE = 'P0001';
  END IF;

  IF NULLIF(trim(p_ticket_title), '') IS NULL OR NULLIF(trim(p_ticket_description), '') IS NULL THEN
    RAISE EXCEPTION 'Title and description are required';
  END IF;
  IF length(p_ticket_title) > 200 OR length(p_ticket_description) > 100000 THEN
    RAISE EXCEPTION 'Ticket title or description exceeds the allowed size';
  END IF;
  IF p_ticket_priority NOT IN ('low', 'medium', 'high', 'urgent') THEN
    RAISE EXCEPTION 'Invalid priority';
  END IF;

  IF p_user_email IS NOT NULL THEN
    IF lower(trim(p_user_email)) !~ '^[^@]+@(gtmsw\.com\.my|outlook\.com)$' THEN
      RAISE EXCEPTION 'Reporter email domain is not allowed';
    END IF;
    SELECT id INTO matched_author
    FROM public.profiles
    WHERE email = lower(trim(p_user_email)) AND account_status = 'active'
    LIMIT 1;
  END IF;
  IF p_system_logs IS NOT NULL AND length(p_system_logs::TEXT) > 100000 THEN
    RAISE EXCEPTION 'System logs exceed the allowed size';
  END IF;

  INSERT INTO public.tickets (
    title, description, category, priority, author_id, reporter_email, system_logs, source
  ) VALUES (
    trim(p_ticket_title),
    p_ticket_description,
    COALESCE(NULLIF(trim(p_ticket_category), ''), 'System Bug'),
    p_ticket_priority,
    matched_author,
    CASE WHEN p_user_email IS NULL THEN NULL ELSE lower(trim(p_user_email)) END,
    p_system_logs,
    'api'
  ) RETURNING * INTO new_ticket;

  INSERT INTO public.api_request_logs(client_id, ticket_id, idempotency_key)
  VALUES (matched_client.id, new_ticket.id, p_idempotency_key);
  UPDATE public.api_clients SET last_used_at = now() WHERE id = matched_client.id;

  RETURN jsonb_build_object(
    'id', new_ticket.id,
    'ticket_number', new_ticket.ticket_number,
    'title', new_ticket.title,
    'status', new_ticket.status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_active_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.protect_profile_security_fields() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prepare_ticket_update() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.audit_ticket_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_ticket_comment() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_api_client(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reopen_own_ticket(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ingest_ticket(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_api_client(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reopen_own_ticket(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_ticket(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT) TO anon, authenticated;

CREATE INDEX IF NOT EXISTS tickets_author_created_idx ON public.tickets(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS tickets_status_created_idx ON public.tickets(status, created_at DESC);
CREATE INDEX IF NOT EXISTS comments_ticket_created_idx ON public.comments(ticket_id, created_at);
CREATE INDEX IF NOT EXISTS audit_logs_ticket_created_idx ON public.ticket_audit_logs(ticket_id, created_at);
CREATE INDEX IF NOT EXISTS api_request_logs_client_created_idx ON public.api_request_logs(client_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS api_request_logs_idempotency_idx
  ON public.api_request_logs(client_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS notifications_recipient_created_idx ON public.notifications(recipient_id, created_at DESC);
