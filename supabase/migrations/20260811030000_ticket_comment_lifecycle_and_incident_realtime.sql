-- Keep comment lifecycle aligned with soft-deleted tickets and broadcast incidents globally.
-- Run this migration as one complete script; do not execute only the function body.

UPDATE public.comments comment
SET deleted_at = ticket.deleted_at,
    deleted_by = ticket.deleted_by
FROM public.tickets ticket
WHERE comment.ticket_id = ticket.id
  AND ticket.deleted_at IS NOT NULL
  AND comment.deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.set_admin_record_deleted(
  p_resource TEXT,
  p_record_id UUID,
  p_restore BOOLEAN DEFAULT false
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  actor_role TEXT := public.current_user_role();
  affected INTEGER;
  lifecycle_at TIMESTAMPTZ;
  lifecycle_actor UUID;
BEGIN
  IF NOT public.is_active_user() OR actor_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;
  IF p_resource NOT IN ('tickets', 'comments', 'faqs', 'category_rules', 'incidents', 'api_clients') THEN
    RAISE EXCEPTION 'Unsupported administrative resource';
  END IF;

  IF p_resource = 'tickets' THEN
    IF p_restore THEN
      SELECT deleted_at, deleted_by
      INTO lifecycle_at, lifecycle_actor
      FROM public.tickets
      WHERE id = p_record_id AND deleted_at IS NOT NULL
      FOR UPDATE;

      IF lifecycle_at IS NULL THEN
        RAISE EXCEPTION 'Record not found or already in the requested lifecycle state';
      END IF;

      UPDATE public.tickets
      SET deleted_at = NULL, deleted_by = NULL
      WHERE id = p_record_id;

      UPDATE public.comments
      SET deleted_at = NULL, deleted_by = NULL
      WHERE ticket_id = p_record_id
        AND deleted_at = lifecycle_at
        AND deleted_by IS NOT DISTINCT FROM lifecycle_actor;
    ELSE
      lifecycle_at := clock_timestamp();
      lifecycle_actor := auth.uid();

      UPDATE public.tickets
      SET deleted_at = lifecycle_at, deleted_by = lifecycle_actor
      WHERE id = p_record_id AND deleted_at IS NULL;
      GET DIAGNOSTICS affected = ROW_COUNT;

      IF affected = 0 THEN
        RAISE EXCEPTION 'Record not found or already in the requested lifecycle state';
      END IF;

      UPDATE public.comments
      SET deleted_at = lifecycle_at, deleted_by = lifecycle_actor
      WHERE ticket_id = p_record_id AND deleted_at IS NULL;
    END IF;
    RETURN true;
  END IF;

  IF p_restore THEN
    EXECUTE format(
      'UPDATE public.%I SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 AND deleted_at IS NOT NULL',
      p_resource
    ) USING p_record_id;
  ELSIF p_resource = 'api_clients' THEN
    UPDATE public.api_clients
    SET is_active = false, deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_record_id AND deleted_at IS NULL;
  ELSE
    EXECUTE format(
      'UPDATE public.%I SET deleted_at = now(), deleted_by = $2 WHERE id = $1 AND deleted_at IS NULL',
      p_resource
    ) USING p_record_id, auth.uid();
  END IF;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected = 0 THEN
    RAISE EXCEPTION 'Record not found or already in the requested lifecycle state';
  END IF;
  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_admin_record_deleted(TEXT, UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_admin_record_deleted(TEXT, UUID, BOOLEAN) TO authenticated;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'incidents'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.incidents;
  END IF;
END
$migration$;
