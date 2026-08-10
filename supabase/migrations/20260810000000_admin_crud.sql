-- Admin CRUD support: soft-delete tickets and hard-delete API clients.
-- Client-side RLS prevents updating deleted_at on tickets (the read policy
-- requires deleted_at IS NULL and Postgres requires updated rows to remain
-- readable), so these operations run through SECURITY DEFINER functions
-- gated to active administrators.

CREATE OR REPLACE FUNCTION public.soft_delete_ticket(p_ticket_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_active_user() OR public.current_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;

  UPDATE public.tickets
  SET deleted_at = now()
  WHERE id = p_ticket_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found or already deleted';
  END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_api_client(p_client_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_active_user() OR public.current_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;

  DELETE FROM public.api_clients WHERE id = p_client_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'API client not found';
  END IF;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.soft_delete_ticket(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_api_client(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.soft_delete_ticket(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_api_client(UUID) TO authenticated;
