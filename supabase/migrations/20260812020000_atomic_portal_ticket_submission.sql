-- Create a portal ticket and bind its draft attachments in one transaction.

CREATE OR REPLACE FUNCTION public.submit_portal_ticket(
  p_title TEXT,
  p_category TEXT,
  p_priority TEXT,
  p_description TEXT,
  p_device_context JSONB DEFAULT '{}'::jsonb,
  p_attachment_paths TEXT[] DEFAULT ARRAY[]::text[],
  p_impact TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  created_ticket_id UUID;
  linked_count INTEGER;
BEGIN
  IF NOT public.is_active_user() THEN RAISE EXCEPTION 'Active staff access required'; END IF;
  IF length(trim(p_title)) < 5 THEN RAISE EXCEPTION 'Ticket title is too short'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.category_rules WHERE category_name = p_category AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Select an active ticket category';
  END IF;
  IF p_priority NOT IN ('low', 'medium', 'high', 'urgent') THEN RAISE EXCEPTION 'Invalid ticket priority'; END IF;
  IF length(trim(p_description)) < 12 THEN RAISE EXCEPTION 'Ticket description is incomplete'; END IF;
  IF p_priority = 'urgent' AND length(trim(COALESCE(p_impact, ''))) < 20 THEN
    RAISE EXCEPTION 'P0 impact details are required';
  END IF;

  INSERT INTO public.tickets(title, category, priority, description, author_id, device_context, source)
  VALUES (
    trim(p_title), p_category, p_priority,
    CASE WHEN p_priority = 'urgent' THEN p_description || E'\n\n## Business impact\n' || trim(p_impact) ELSE p_description END,
    auth.uid(), p_device_context, 'portal'
  )
  RETURNING id INTO created_ticket_id;

  IF cardinality(p_attachment_paths) > 0 THEN
    UPDATE public.ticket_attachments
    SET ticket_id = created_ticket_id
    WHERE uploader_id = auth.uid() AND ticket_id IS NULL AND storage_path = ANY(p_attachment_paths);
    GET DIAGNOSTICS linked_count = ROW_COUNT;
    IF linked_count <> cardinality(p_attachment_paths) THEN
      RAISE EXCEPTION 'One or more draft attachments could not be linked';
    END IF;
  END IF;
  RETURN created_ticket_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_portal_ticket(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT[], TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_portal_ticket(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT[], TEXT) TO authenticated;
