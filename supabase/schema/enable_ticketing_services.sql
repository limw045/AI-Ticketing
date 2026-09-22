-- Run as postgres AFTER gtjbticketing.sql and ticketing_onboarding.sql.
-- Only adds Ticketing service configuration. No application rows or Auth users.
BEGIN;
-- The live API currently exposes public and graphql_public. Preserve any explicit
-- role-level list too, then add gtjbticketing without replacing other schemas.
DO $$
DECLARE schemas text;
BEGIN
  SELECT substring(setting FROM length('pgrst.db_schemas=') + 1) INTO schemas
  FROM pg_roles CROSS JOIN LATERAL unnest(rolconfig) setting
  WHERE rolname = 'authenticator' AND setting LIKE 'pgrst.db_schemas=%';
  schemas := coalesce(nullif(schemas,''), 'public, graphql_public');
  IF NOT 'gtjbticketing' = ANY(regexp_split_to_array(schemas, '\s*,\s*')) THEN
    schemas := schemas || ', gtjbticketing';
  END IF;
  EXECUTE format('ALTER ROLE authenticator SET pgrst.db_schemas = %L', schemas);
END $$;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('gtjbticketing-attachments','gtjbticketing-attachments',false,10485760,
  ARRAY['image/jpeg','image/png','image/webp','text/plain','application/json','text/csv'])
ON CONFLICT(id) DO NOTHING;

CREATE POLICY "gtjbticketing attachment upload" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='gtjbticketing-attachments' AND gtjbticketing.is_active_user()
  AND (storage.foldername(name))[1]=gtjbticketing.auth_user_id()::text);
CREATE POLICY "gtjbticketing attachment read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='gtjbticketing-attachments' AND gtjbticketing.is_active_user()
  AND ((storage.foldername(name))[1]=gtjbticketing.auth_user_id()::text
    OR gtjbticketing.current_user_role() IN ('admin','super_admin')
    OR EXISTS(SELECT 1 FROM gtjbticketing.ticket_attachments a
      JOIN gtjbticketing.tickets t ON t.id=a.ticket_id WHERE a.storage_path=name AND t.deleted_at IS NULL)));
CREATE POLICY "gtjbticketing attachment delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='gtjbticketing-attachments' AND gtjbticketing.is_active_user()
  AND (storage.foldername(name))[1]=gtjbticketing.auth_user_id()::text);

DO $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime'
    AND schemaname='gtjbticketing' AND tablename='notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE gtjbticketing.notifications;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime'
    AND schemaname='gtjbticketing' AND tablename='incidents') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE gtjbticketing.incidents;
  END IF;
END $$;
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';
COMMIT;
