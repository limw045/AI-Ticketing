-- Dynamic ticket categories and private plain-text log attachments.

INSERT INTO public.category_rules (category_name, template_markdown)
VALUES
  (
    'Risk Screen',
    E'Please provide:\n- The automation or process name.\n- Its purpose and business context.\n- The departments, systems, or types of data involved.\n- The risk review or approval required.\n- The target completion date and impact of delay.\n- Any other reviewer context. Do not include passwords, API keys, credentials, or sensitive data.'
  ),
  (
    'Common Problem',
    E'Please provide:\n- The affected automation, tool, or page.\n- What you were trying to do.\n- What happened and what you expected instead.\n- When the problem started and whether it happens consistently.\n- The impact on the workflow and internal staff.\n- A supporting screenshot or TXT log when useful.'
  )
ON CONFLICT (category_name) DO UPDATE
SET template_markdown = EXCLUDED.template_markdown,
    deleted_at = NULL,
    deleted_by = NULL,
    updated_at = now();

UPDATE public.category_rules
SET deleted_at = now(),
    deleted_by = NULL,
    updated_at = now()
WHERE deleted_at IS NULL
  AND category_name NOT IN ('Risk Screen', 'Common Problem');

CREATE OR REPLACE FUNCTION public.protect_last_active_category()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  becoming_inactive BOOLEAN := false;
  active_categories INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    becoming_inactive := OLD.deleted_at IS NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    becoming_inactive := OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL;
  END IF;

  IF becoming_inactive THEN
    SELECT count(*) INTO active_categories
    FROM public.category_rules
    WHERE deleted_at IS NULL;

    IF active_categories <= 1 THEN
      RAISE EXCEPTION 'The final active ticket category cannot be deleted';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_last_active_category ON public.category_rules;
CREATE TRIGGER protect_last_active_category
BEFORE UPDATE OR DELETE ON public.category_rules
FOR EACH ROW EXECUTE FUNCTION public.protect_last_active_category();

CREATE OR REPLACE FUNCTION public.validate_new_ticket_category()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  category_assignee UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT default_assignee_id INTO category_assignee
    FROM public.category_rules
    WHERE category_name = NEW.category AND deleted_at IS NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Ticket category is not active';
    END IF;
    IF NEW.assignee_id IS NULL THEN NEW.assignee_id := category_assignee; END IF;
  ELSIF NEW.category IS DISTINCT FROM OLD.category THEN
    SELECT default_assignee_id INTO category_assignee
    FROM public.category_rules
    WHERE category_name = NEW.category AND deleted_at IS NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Ticket category is not active';
    END IF;
    IF NEW.assignee_id IS NULL THEN NEW.assignee_id := category_assignee; END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_new_ticket_category ON public.tickets;
CREATE TRIGGER validate_new_ticket_category
BEFORE INSERT OR UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.validate_new_ticket_category();

UPDATE storage.buckets
SET public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'text/plain']
WHERE id = 'ticket-attachments';

CREATE OR REPLACE FUNCTION public.ingest_ticket(
  p_api_key TEXT,
  p_ticket_title TEXT,
  p_ticket_description TEXT,
  p_ticket_category TEXT DEFAULT NULL,
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
  requested_category TEXT := NULLIF(trim(p_ticket_category), '');
  resolved_category TEXT;
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

  IF requested_category IS NULL THEN
    SELECT category_name INTO resolved_category
    FROM public.category_rules
    WHERE deleted_at IS NULL
    ORDER BY CASE WHEN category_name = 'Risk Screen' THEN 0 ELSE 1 END, category_name
    LIMIT 1;
  ELSE
    SELECT category_name INTO resolved_category
    FROM public.category_rules
    WHERE deleted_at IS NULL AND category_name = requested_category
    LIMIT 1;
  END IF;
  IF resolved_category IS NULL THEN
    RAISE EXCEPTION 'Ticket category is not active';
  END IF;

  IF p_user_email IS NOT NULL THEN
    IF lower(trim(p_user_email)) !~ '^[^@]+@(gtmsw\.com\.my|outlook\.com)$' THEN RAISE EXCEPTION 'Reporter email domain is not allowed'; END IF;
    SELECT id INTO matched_author FROM public.profiles
    WHERE email = lower(trim(p_user_email)) AND account_status = 'active' AND deleted_at IS NULL LIMIT 1;
  END IF;
  IF p_system_logs IS NOT NULL AND length(p_system_logs::TEXT) > 100000 THEN RAISE EXCEPTION 'System logs exceed the allowed size'; END IF;

  INSERT INTO public.tickets(title, description, category, priority, author_id, reporter_email, system_logs, source)
  VALUES (trim(p_ticket_title), p_ticket_description, resolved_category, p_ticket_priority,
    matched_author, CASE WHEN p_user_email IS NULL THEN NULL ELSE lower(trim(p_user_email)) END, p_system_logs, 'api')
  RETURNING * INTO new_ticket;
  INSERT INTO public.api_request_logs(client_id, ticket_id, idempotency_key)
  VALUES (matched_client.id, new_ticket.id, p_idempotency_key);
  UPDATE public.api_clients SET last_used_at = now() WHERE id = matched_client.id;
  RETURN jsonb_build_object('id', new_ticket.id, 'ticket_number', new_ticket.ticket_number, 'title', new_ticket.title, 'status', new_ticket.status);
END;
$$;

REVOKE ALL ON FUNCTION public.protect_last_active_category() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_new_ticket_category() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ingest_ticket(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ingest_ticket(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT) TO anon, authenticated;
