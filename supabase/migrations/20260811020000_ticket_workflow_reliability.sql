-- Stable relationship reads and reliable role-scoped notifications.

CREATE OR REPLACE VIEW public.comment_details
WITH (security_invoker = true)
AS
SELECT
  c.id,
  c.ticket_id,
  c.author_id,
  c.content,
  c.is_internal_note,
  c.type,
  c.created_at,
  c.updated_at,
  c.deleted_at,
  CASE
    WHEN author.id IS NULL THEN NULL
    ELSE jsonb_build_object(
      'id', author.id,
      'display_name', author.display_name,
      'department', author.department
    )
  END AS author,
  CASE
    WHEN ticket.id IS NULL THEN NULL
    ELSE jsonb_build_object(
      'id', ticket.id,
      'ticket_number', ticket.ticket_number,
      'title', ticket.title
    )
  END AS ticket
FROM public.comments c
LEFT JOIN public.profiles author ON author.id = c.author_id
LEFT JOIN public.tickets ticket ON ticket.id = c.ticket_id;

CREATE OR REPLACE VIEW public.category_rule_details
WITH (security_invoker = true)
AS
SELECT
  rule.id,
  rule.category_name,
  rule.template_markdown,
  rule.default_assignee_id,
  rule.created_at,
  rule.updated_at,
  rule.deleted_at,
  CASE
    WHEN assignee.id IS NULL THEN NULL
    ELSE jsonb_build_object(
      'id', assignee.id,
      'display_name', assignee.display_name
    )
  END AS default_assignee
FROM public.category_rules rule
LEFT JOIN public.profiles assignee ON assignee.id = rule.default_assignee_id;

REVOKE ALL ON public.comment_details FROM PUBLIC, anon;
REVOKE ALL ON public.category_rule_details FROM PUBLIC, anon;
GRANT SELECT ON public.comment_details TO authenticated;
GRANT SELECT ON public.category_rule_details TO authenticated;

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
      AND p.account_status = 'active'
      AND p.deleted_at IS NULL;
    RETURN NEW;
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.ticket_audit_logs(ticket_id, actor_id, action, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'status_changed', OLD.status, NEW.status);

    INSERT INTO public.notifications(recipient_id, ticket_id, kind, title, body)
    SELECT recipients.id,
           NEW.id,
           'status',
           'Ticket #' || NEW.ticket_number || ' status updated',
           NEW.status
    FROM (
      SELECT p.id
      FROM public.profiles p
      WHERE p.id = NEW.author_id
        AND p.role = 'employee'
        AND p.account_status = 'active'
        AND p.deleted_at IS NULL
        AND p.id IS DISTINCT FROM auth.uid()
      UNION
      SELECT p.id
      FROM public.profiles p
      WHERE p.role IN ('admin', 'super_admin')
        AND p.account_status = 'active'
        AND p.deleted_at IS NULL
        AND p.id IS DISTINCT FROM auth.uid()
        AND (
          (NEW.assignee_id IS NOT NULL AND p.id = NEW.assignee_id)
          OR NEW.assignee_id IS NULL
        )
    ) recipients;
  END IF;

  IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
    INSERT INTO public.ticket_audit_logs(ticket_id, actor_id, action, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'assignee_changed', OLD.assignee_id::TEXT, NEW.assignee_id::TEXT);

    INSERT INTO public.notifications(recipient_id, ticket_id, kind, title, body)
    SELECT p.id,
           NEW.id,
           'assignment',
           'Ticket #' || NEW.ticket_number || ' assigned to you',
           NEW.title
    FROM public.profiles p
    WHERE p.id = NEW.assignee_id
      AND p.role IN ('admin', 'super_admin')
      AND p.account_status = 'active'
      AND p.deleted_at IS NULL;
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
  IF NEW.is_internal_note THEN RETURN NEW; END IF;

  SELECT * INTO parent_ticket FROM public.tickets WHERE id = NEW.ticket_id;
  SELECT role INTO author_role FROM public.profiles WHERE id = NEW.author_id;

  INSERT INTO public.notifications(recipient_id, ticket_id, kind, title, body)
  SELECT recipients.id,
         NEW.ticket_id,
         'comment',
         CASE
           WHEN author_role IN ('admin', 'super_admin')
             THEN 'New reply on ticket #' || parent_ticket.ticket_number
           ELSE 'New employee reply on ticket #' || parent_ticket.ticket_number
         END,
         left(NEW.content, 180)
  FROM (
    SELECT p.id
    FROM public.profiles p
    WHERE author_role IN ('admin', 'super_admin')
      AND p.id = parent_ticket.author_id
      AND p.role = 'employee'
      AND p.account_status = 'active'
      AND p.deleted_at IS NULL
      AND p.id IS DISTINCT FROM NEW.author_id
    UNION
    SELECT p.id
    FROM public.profiles p
    WHERE p.role IN ('admin', 'super_admin')
      AND p.account_status = 'active'
      AND p.deleted_at IS NULL
      AND p.id IS DISTINCT FROM NEW.author_id
      AND (
        (parent_ticket.assignee_id IS NOT NULL AND p.id = parent_ticket.assignee_id)
        OR parent_ticket.assignee_id IS NULL
      )
  ) recipients;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.audit_ticket_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_ticket_comment() FROM PUBLIC;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;
