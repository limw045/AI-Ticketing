-- Ticketing structure only. Generated from the live development catalog.

-- No INSERT/COPY, auth.users changes, shared public.profiles changes, or Signora objects.

-- Apply only to an empty gtjbticketing schema, after prerequisites.sql.

BEGIN;

SET LOCAL lock_timeout = '5s';

SET LOCAL search_path = pg_catalog, extensions, public;

-- The destination schema must already exist and be owned by the applying role.

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class WHERE relnamespace='gtjbticketing'::regnamespace AND relkind IN ('r','v','S')) THEN RAISE EXCEPTION 'gtjbticketing is not empty; refusing bootstrap'; END IF; END $$;

CREATE FUNCTION gtjbticketing.auth_claims() RETURNS jsonb LANGUAGE sql STABLE SET search_path = '' AS $$ SELECT COALESCE(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb) $$;

CREATE FUNCTION gtjbticketing.auth_user_id() RETURNS uuid LANGUAGE sql STABLE SET search_path = '' AS $$ SELECT nullif(gtjbticketing.auth_claims()->>'sub', '')::uuid $$;

REVOKE ALL ON FUNCTION gtjbticketing.auth_claims(), gtjbticketing.auth_user_id() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION gtjbticketing.auth_claims(), gtjbticketing.auth_user_id() TO anon, authenticated, service_role;

CREATE SEQUENCE gtjbticketing."tickets_ticket_number_seq" AS integer START 1 INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 NO CYCLE;

CREATE SEQUENCE gtjbticketing."api_request_logs_id_seq" AS bigint START 1 INCREMENT 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1 NO CYCLE;

CREATE SEQUENCE gtjbticketing."admin_activity_logs_id_seq" AS bigint START 1 INCREMENT 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1 NO CYCLE;

CREATE TABLE gtjbticketing."profiles" (
  "id" uuid NOT NULL,
  "email" text NOT NULL,
  "display_name" text NOT NULL,
  "user_type" text NOT NULL,
  "department" text NOT NULL,
  "supervisor_name" text,
  "role" text DEFAULT 'employee'::text,
  "avatar_url" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "account_status" text DEFAULT 'active'::text NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone,
  "deleted_by" uuid,
  "department_id" uuid
);

CREATE TABLE gtjbticketing."tickets" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "ticket_number" integer DEFAULT nextval('gtjbticketing.tickets_ticket_number_seq'::regclass) NOT NULL,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "status" text DEFAULT 'open'::text,
  "priority" text DEFAULT 'medium'::text,
  "category" text NOT NULL,
  "author_id" uuid,
  "assignee_id" uuid,
  "is_pinned" boolean DEFAULT false,
  "pin_order" integer DEFAULT 0,
  "subtasks" jsonb DEFAULT '[]'::jsonb,
  "device_context" jsonb,
  "system_logs" jsonb,
  "ai_summary" text,
  "first_responded_at" timestamp with time zone,
  "resolved_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "source" text DEFAULT 'portal'::text NOT NULL,
  "reporter_email" text,
  "deleted_by" uuid,
  "department_id" uuid
);

CREATE TABLE gtjbticketing."comments" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "ticket_id" uuid NOT NULL,
  "author_id" uuid NOT NULL,
  "content" text NOT NULL,
  "is_internal_note" boolean DEFAULT false,
  "type" text DEFAULT 'user_comment'::text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone,
  "deleted_by" uuid
);

CREATE TABLE gtjbticketing."ticket_audit_logs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "ticket_id" uuid,
  "actor_id" uuid,
  "action" text NOT NULL,
  "old_value" text,
  "new_value" text,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE gtjbticketing."faqs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "question" text NOT NULL,
  "answer" text NOT NULL,
  "category" text NOT NULL,
  "embedding" vector(1536),
  "is_pinned" boolean DEFAULT true,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone,
  "deleted_by" uuid
);

CREATE TABLE gtjbticketing."category_rules" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "category_name" text NOT NULL,
  "template_markdown" text,
  "default_assignee_id" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone,
  "deleted_by" uuid
);

CREATE TABLE gtjbticketing."incidents" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "message" text NOT NULL,
  "severity" text DEFAULT 'warning'::text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone,
  "deleted_by" uuid
);

CREATE TABLE gtjbticketing."notifications" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "recipient_id" uuid NOT NULL,
  "ticket_id" uuid,
  "kind" text NOT NULL,
  "title" text NOT NULL,
  "body" text,
  "read_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE gtjbticketing."api_clients" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "key_hash" text NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_used_at" timestamp with time zone,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone,
  "deleted_by" uuid
);

CREATE TABLE gtjbticketing."api_request_logs" (
  "id" bigint DEFAULT nextval('gtjbticketing.api_request_logs_id_seq'::regclass) NOT NULL,
  "client_id" uuid NOT NULL,
  "ticket_id" uuid,
  "idempotency_key" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE gtjbticketing."admin_activity_logs" (
  "id" bigint DEFAULT nextval('gtjbticketing.admin_activity_logs_id_seq'::regclass) NOT NULL,
  "actor_id" uuid,
  "action" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" text NOT NULL,
  "changed_fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE gtjbticketing."departments" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "is_system" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE gtjbticketing."ticket_attachments" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "storage_path" text NOT NULL,
  "uploader_id" uuid NOT NULL,
  "ticket_id" uuid,
  "display_name" text NOT NULL,
  "kind" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER SEQUENCE gtjbticketing."tickets_ticket_number_seq" OWNED BY gtjbticketing."tickets"."ticket_number";

ALTER SEQUENCE gtjbticketing."api_request_logs_id_seq" OWNED BY gtjbticketing."api_request_logs"."id";

ALTER SEQUENCE gtjbticketing."admin_activity_logs_id_seq" OWNED BY gtjbticketing."admin_activity_logs"."id";

ALTER TABLE gtjbticketing."admin_activity_logs" ADD CONSTRAINT "admin_activity_logs_pkey" PRIMARY KEY (id);

ALTER TABLE gtjbticketing."api_clients" ADD CONSTRAINT "api_clients_pkey" PRIMARY KEY (id);

ALTER TABLE gtjbticketing."api_request_logs" ADD CONSTRAINT "api_request_logs_pkey" PRIMARY KEY (id);

ALTER TABLE gtjbticketing."category_rules" ADD CONSTRAINT "category_rules_pkey" PRIMARY KEY (id);

ALTER TABLE gtjbticketing."comments" ADD CONSTRAINT "comments_pkey" PRIMARY KEY (id);

ALTER TABLE gtjbticketing."departments" ADD CONSTRAINT "departments_pkey" PRIMARY KEY (id);

ALTER TABLE gtjbticketing."faqs" ADD CONSTRAINT "faqs_pkey" PRIMARY KEY (id);

ALTER TABLE gtjbticketing."incidents" ADD CONSTRAINT "incidents_pkey" PRIMARY KEY (id);

ALTER TABLE gtjbticketing."notifications" ADD CONSTRAINT "notifications_pkey" PRIMARY KEY (id);

ALTER TABLE gtjbticketing."profiles" ADD CONSTRAINT "profiles_pkey" PRIMARY KEY (id);

ALTER TABLE gtjbticketing."ticket_attachments" ADD CONSTRAINT "ticket_attachments_pkey" PRIMARY KEY (id);

ALTER TABLE gtjbticketing."ticket_audit_logs" ADD CONSTRAINT "ticket_audit_logs_pkey" PRIMARY KEY (id);

ALTER TABLE gtjbticketing."tickets" ADD CONSTRAINT "tickets_pkey" PRIMARY KEY (id);

ALTER TABLE gtjbticketing."api_clients" ADD CONSTRAINT "api_clients_key_hash_key" UNIQUE (key_hash);

ALTER TABLE gtjbticketing."category_rules" ADD CONSTRAINT "category_rules_category_name_key" UNIQUE (category_name);

ALTER TABLE gtjbticketing."departments" ADD CONSTRAINT "departments_name_key" UNIQUE (name);

ALTER TABLE gtjbticketing."departments" ADD CONSTRAINT "departments_slug_key" UNIQUE (slug);

ALTER TABLE gtjbticketing."profiles" ADD CONSTRAINT "profiles_email_key" UNIQUE (email);

ALTER TABLE gtjbticketing."ticket_attachments" ADD CONSTRAINT "ticket_attachments_storage_path_key" UNIQUE (storage_path);

ALTER TABLE gtjbticketing."tickets" ADD CONSTRAINT "tickets_ticket_number_key" UNIQUE (ticket_number);

ALTER TABLE gtjbticketing."comments" ADD CONSTRAINT "comments_content_length_check" CHECK (((char_length(TRIM(BOTH FROM content)) >= 1) AND (char_length(TRIM(BOTH FROM content)) <= 20000)));

ALTER TABLE gtjbticketing."comments" ADD CONSTRAINT "comments_type_check" CHECK ((type = ANY (ARRAY['user_comment'::text, 'system_audit'::text])));

ALTER TABLE gtjbticketing."departments" ADD CONSTRAINT "departments_name_check" CHECK (((length(TRIM(BOTH FROM name)) >= 2) AND (length(TRIM(BOTH FROM name)) <= 120)));

ALTER TABLE gtjbticketing."departments" ADD CONSTRAINT "departments_slug_check" CHECK ((slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::text));

ALTER TABLE gtjbticketing."faqs" ADD CONSTRAINT "faqs_content_length_check" CHECK ((((char_length(TRIM(BOTH FROM question)) >= 1) AND (char_length(TRIM(BOTH FROM question)) <= 500)) AND ((char_length(TRIM(BOTH FROM answer)) >= 1) AND (char_length(TRIM(BOTH FROM answer)) <= 50000))));

ALTER TABLE gtjbticketing."incidents" ADD CONSTRAINT "incidents_content_length_check" CHECK ((((char_length(TRIM(BOTH FROM title)) >= 1) AND (char_length(TRIM(BOTH FROM title)) <= 200)) AND ((char_length(TRIM(BOTH FROM message)) >= 1) AND (char_length(TRIM(BOTH FROM message)) <= 5000))));

ALTER TABLE gtjbticketing."incidents" ADD CONSTRAINT "incidents_severity_check" CHECK ((severity = ANY (ARRAY['info'::text, 'warning'::text, 'critical'::text])));

ALTER TABLE gtjbticketing."notifications" ADD CONSTRAINT "notifications_kind_check" CHECK ((kind = ANY (ARRAY['new_ticket'::text, 'comment'::text, 'status'::text, 'assignment'::text])));

ALTER TABLE gtjbticketing."profiles" ADD CONSTRAINT "profiles_account_status_check" CHECK ((account_status = ANY (ARRAY['active'::text, 'suspended'::text])));

ALTER TABLE gtjbticketing."profiles" ADD CONSTRAINT "profiles_role_check" CHECK ((role = ANY (ARRAY['employee'::text, 'admin'::text, 'super_admin'::text])));

ALTER TABLE gtjbticketing."profiles" ADD CONSTRAINT "profiles_user_type_check" CHECK ((user_type = ANY (ARRAY['full_time'::text, 'intern'::text, 'contractor'::text])));

ALTER TABLE gtjbticketing."ticket_attachments" ADD CONSTRAINT "ticket_attachments_kind_check" CHECK ((kind = ANY (ARRAY['image'::text, 'log'::text])));

ALTER TABLE gtjbticketing."tickets" ADD CONSTRAINT "tickets_content_length_check" CHECK ((((char_length(TRIM(BOTH FROM title)) >= 1) AND (char_length(TRIM(BOTH FROM title)) <= 200)) AND ((char_length(description) >= 1) AND (char_length(description) <= 100000)) AND ((char_length(TRIM(BOTH FROM category)) >= 1) AND (char_length(TRIM(BOTH FROM category)) <= 100))));

ALTER TABLE gtjbticketing."tickets" ADD CONSTRAINT "tickets_priority_check" CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text])));

ALTER TABLE gtjbticketing."tickets" ADD CONSTRAINT "tickets_source_check" CHECK ((source = ANY (ARRAY['portal'::text, 'api'::text])));

ALTER TABLE gtjbticketing."tickets" ADD CONSTRAINT "tickets_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'resolved'::text, 'closed'::text])));

ALTER TABLE gtjbticketing."admin_activity_logs" ADD CONSTRAINT "admin_activity_logs_actor_id_fkey" FOREIGN KEY (actor_id) REFERENCES gtjbticketing.profiles(id);

ALTER TABLE gtjbticketing."api_clients" ADD CONSTRAINT "api_clients_created_by_fkey" FOREIGN KEY (created_by) REFERENCES gtjbticketing.profiles(id);

ALTER TABLE gtjbticketing."api_clients" ADD CONSTRAINT "api_clients_deleted_by_fkey" FOREIGN KEY (deleted_by) REFERENCES gtjbticketing.profiles(id);

ALTER TABLE gtjbticketing."api_request_logs" ADD CONSTRAINT "api_request_logs_client_id_fkey" FOREIGN KEY (client_id) REFERENCES gtjbticketing.api_clients(id) ON DELETE CASCADE;

ALTER TABLE gtjbticketing."api_request_logs" ADD CONSTRAINT "api_request_logs_ticket_id_fkey" FOREIGN KEY (ticket_id) REFERENCES gtjbticketing.tickets(id) ON DELETE SET NULL;

ALTER TABLE gtjbticketing."category_rules" ADD CONSTRAINT "category_rules_default_assignee_id_fkey" FOREIGN KEY (default_assignee_id) REFERENCES gtjbticketing.profiles(id);

ALTER TABLE gtjbticketing."category_rules" ADD CONSTRAINT "category_rules_deleted_by_fkey" FOREIGN KEY (deleted_by) REFERENCES gtjbticketing.profiles(id);

ALTER TABLE gtjbticketing."comments" ADD CONSTRAINT "comments_author_id_fkey" FOREIGN KEY (author_id) REFERENCES gtjbticketing.profiles(id);

ALTER TABLE gtjbticketing."comments" ADD CONSTRAINT "comments_deleted_by_fkey" FOREIGN KEY (deleted_by) REFERENCES gtjbticketing.profiles(id);

ALTER TABLE gtjbticketing."comments" ADD CONSTRAINT "comments_ticket_id_fkey" FOREIGN KEY (ticket_id) REFERENCES gtjbticketing.tickets(id) ON DELETE CASCADE;

ALTER TABLE gtjbticketing."faqs" ADD CONSTRAINT "faqs_created_by_fkey" FOREIGN KEY (created_by) REFERENCES gtjbticketing.profiles(id);

ALTER TABLE gtjbticketing."faqs" ADD CONSTRAINT "faqs_deleted_by_fkey" FOREIGN KEY (deleted_by) REFERENCES gtjbticketing.profiles(id);

ALTER TABLE gtjbticketing."incidents" ADD CONSTRAINT "incidents_deleted_by_fkey" FOREIGN KEY (deleted_by) REFERENCES gtjbticketing.profiles(id);

ALTER TABLE gtjbticketing."notifications" ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY (recipient_id) REFERENCES gtjbticketing.profiles(id) ON DELETE CASCADE;

ALTER TABLE gtjbticketing."notifications" ADD CONSTRAINT "notifications_ticket_id_fkey" FOREIGN KEY (ticket_id) REFERENCES gtjbticketing.tickets(id) ON DELETE CASCADE;

ALTER TABLE gtjbticketing."profiles" ADD CONSTRAINT "profiles_deleted_by_fkey" FOREIGN KEY (deleted_by) REFERENCES gtjbticketing.profiles(id);

ALTER TABLE gtjbticketing."profiles" ADD CONSTRAINT "profiles_department_id_fkey" FOREIGN KEY (department_id) REFERENCES gtjbticketing.departments(id);

ALTER TABLE gtjbticketing."ticket_attachments" ADD CONSTRAINT "ticket_attachments_ticket_id_fkey" FOREIGN KEY (ticket_id) REFERENCES gtjbticketing.tickets(id) ON DELETE CASCADE;

ALTER TABLE gtjbticketing."ticket_attachments" ADD CONSTRAINT "ticket_attachments_uploader_id_fkey" FOREIGN KEY (uploader_id) REFERENCES gtjbticketing.profiles(id);

ALTER TABLE gtjbticketing."ticket_audit_logs" ADD CONSTRAINT "ticket_audit_logs_actor_id_fkey" FOREIGN KEY (actor_id) REFERENCES gtjbticketing.profiles(id);

ALTER TABLE gtjbticketing."ticket_audit_logs" ADD CONSTRAINT "ticket_audit_logs_ticket_id_fkey" FOREIGN KEY (ticket_id) REFERENCES gtjbticketing.tickets(id) ON DELETE CASCADE;

ALTER TABLE gtjbticketing."tickets" ADD CONSTRAINT "tickets_assignee_id_fkey" FOREIGN KEY (assignee_id) REFERENCES gtjbticketing.profiles(id);

ALTER TABLE gtjbticketing."tickets" ADD CONSTRAINT "tickets_author_id_fkey" FOREIGN KEY (author_id) REFERENCES gtjbticketing.profiles(id);

ALTER TABLE gtjbticketing."tickets" ADD CONSTRAINT "tickets_deleted_by_fkey" FOREIGN KEY (deleted_by) REFERENCES gtjbticketing.profiles(id);

ALTER TABLE gtjbticketing."tickets" ADD CONSTRAINT "tickets_department_id_fkey" FOREIGN KEY (department_id) REFERENCES gtjbticketing.departments(id);

CREATE INDEX tickets_author_created_idx ON gtjbticketing.tickets USING btree (author_id, created_at DESC);

CREATE INDEX tickets_status_created_idx ON gtjbticketing.tickets USING btree (status, created_at DESC);

CREATE INDEX comments_ticket_created_idx ON gtjbticketing.comments USING btree (ticket_id, created_at);

CREATE INDEX audit_logs_ticket_created_idx ON gtjbticketing.ticket_audit_logs USING btree (ticket_id, created_at);

CREATE INDEX api_request_logs_client_created_idx ON gtjbticketing.api_request_logs USING btree (client_id, created_at DESC);

CREATE UNIQUE INDEX api_request_logs_idempotency_idx ON gtjbticketing.api_request_logs USING btree (client_id, idempotency_key) WHERE (idempotency_key IS NOT NULL);

CREATE INDEX notifications_recipient_created_idx ON gtjbticketing.notifications USING btree (recipient_id, created_at DESC);

CREATE INDEX profiles_role_status_created_idx ON gtjbticketing.profiles USING btree (role, account_status, created_at DESC);

CREATE INDEX profiles_deleted_created_idx ON gtjbticketing.profiles USING btree (deleted_at, created_at DESC);

CREATE INDEX tickets_deleted_created_idx ON gtjbticketing.tickets USING btree (deleted_at, created_at DESC);

CREATE INDEX comments_deleted_created_idx ON gtjbticketing.comments USING btree (deleted_at, created_at DESC);

CREATE INDEX faqs_deleted_created_idx ON gtjbticketing.faqs USING btree (deleted_at, created_at DESC);

CREATE INDEX category_rules_deleted_created_idx ON gtjbticketing.category_rules USING btree (deleted_at, created_at DESC);

CREATE INDEX incidents_deleted_created_idx ON gtjbticketing.incidents USING btree (deleted_at, created_at DESC);

CREATE INDEX api_clients_deleted_created_idx ON gtjbticketing.api_clients USING btree (deleted_at, created_at DESC);

CREATE INDEX admin_activity_actor_created_idx ON gtjbticketing.admin_activity_logs USING btree (actor_id, created_at DESC);

CREATE INDEX admin_activity_entity_created_idx ON gtjbticketing.admin_activity_logs USING btree (entity_type, created_at DESC);

CREATE INDEX profiles_department_idx ON gtjbticketing.profiles USING btree (department_id);

CREATE INDEX tickets_department_active_idx ON gtjbticketing.tickets USING btree (department_id, deleted_at, created_at DESC);

CREATE INDEX ticket_attachments_ticket_idx ON gtjbticketing.ticket_attachments USING btree (ticket_id);

SET LOCAL check_function_bodies = false;

CREATE OR REPLACE FUNCTION gtjbticketing.audit_admin_resource_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  actor_role TEXT := gtjbticketing.current_user_role();
  safe_row JSONB;
BEGIN
  IF gtjbticketing.auth_user_id() IS NULL OR actor_role NOT IN ('admin', 'super_admin') THEN
    RETURN NEW;
  END IF;
  safe_row := to_jsonb(NEW)
    - 'key_hash' - 'description' - 'content' - 'answer' - 'template_markdown'
    - 'system_logs' - 'device_context' - 'ai_summary';
  INSERT INTO gtjbticketing.admin_activity_logs(actor_id, action, entity_type, entity_id, changed_fields)
  VALUES (
    gtjbticketing.auth_user_id(),
    lower(TG_OP),
    TG_TABLE_NAME,
    COALESCE(safe_row ->> 'id', ''),
    safe_row
  );
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION gtjbticketing."audit_admin_resource_change"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION gtjbticketing."audit_admin_resource_change"() TO "anon";

GRANT EXECUTE ON FUNCTION gtjbticketing."audit_admin_resource_change"() TO "authenticated";

GRANT EXECUTE ON FUNCTION gtjbticketing."audit_admin_resource_change"() TO "service_role";

CREATE OR REPLACE FUNCTION gtjbticketing.audit_ticket_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO gtjbticketing.ticket_audit_logs(ticket_id, actor_id, action, new_value)
    VALUES (NEW.id, gtjbticketing.auth_user_id(), 'ticket_created', NEW.source);

    INSERT INTO gtjbticketing.notifications(recipient_id, ticket_id, kind, title, body)
    SELECT p.id, NEW.id, 'new_ticket', 'New ticket #' || NEW.ticket_number, NEW.title
    FROM gtjbticketing.profiles p
    WHERE p.role IN ('admin', 'super_admin')
      AND p.account_status = 'active'
      AND p.deleted_at IS NULL;
    RETURN NEW;
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO gtjbticketing.ticket_audit_logs(ticket_id, actor_id, action, old_value, new_value)
    VALUES (NEW.id, gtjbticketing.auth_user_id(), 'status_changed', OLD.status, NEW.status);

    INSERT INTO gtjbticketing.notifications(recipient_id, ticket_id, kind, title, body)
    SELECT recipients.id,
           NEW.id,
           'status',
           'Ticket #' || NEW.ticket_number || ' status updated',
           NEW.status
    FROM (
      SELECT p.id
      FROM gtjbticketing.profiles p
      WHERE p.id = NEW.author_id
        AND p.role = 'employee'
        AND p.account_status = 'active'
        AND p.deleted_at IS NULL
        AND p.id IS DISTINCT FROM gtjbticketing.auth_user_id()
      UNION
      SELECT p.id
      FROM gtjbticketing.profiles p
      WHERE p.role IN ('admin', 'super_admin')
        AND p.account_status = 'active'
        AND p.deleted_at IS NULL
        AND p.id IS DISTINCT FROM gtjbticketing.auth_user_id()
        AND (
          (NEW.assignee_id IS NOT NULL AND p.id = NEW.assignee_id)
          OR NEW.assignee_id IS NULL
        )
    ) recipients;
  END IF;

  IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
    INSERT INTO gtjbticketing.ticket_audit_logs(ticket_id, actor_id, action, old_value, new_value)
    VALUES (NEW.id, gtjbticketing.auth_user_id(), 'assignee_changed', OLD.assignee_id::TEXT, NEW.assignee_id::TEXT);

    INSERT INTO gtjbticketing.notifications(recipient_id, ticket_id, kind, title, body)
    SELECT p.id,
           NEW.id,
           'assignment',
           'Ticket #' || NEW.ticket_number || ' assigned to you',
           NEW.title
    FROM gtjbticketing.profiles p
    WHERE p.id = NEW.assignee_id
      AND p.role IN ('admin', 'super_admin')
      AND p.account_status = 'active'
      AND p.deleted_at IS NULL;
  END IF;

  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO gtjbticketing.ticket_audit_logs(ticket_id, actor_id, action, old_value, new_value)
    VALUES (NEW.id, gtjbticketing.auth_user_id(), 'priority_changed', OLD.priority, NEW.priority);
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION gtjbticketing."audit_ticket_change"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION gtjbticketing."audit_ticket_change"() TO "anon";

GRANT EXECUTE ON FUNCTION gtjbticketing."audit_ticket_change"() TO "authenticated";

GRANT EXECUTE ON FUNCTION gtjbticketing."audit_ticket_change"() TO "service_role";

CREATE OR REPLACE FUNCTION gtjbticketing.create_api_client(client_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  raw_key TEXT;
  new_client gtjbticketing.api_clients;
BEGIN
  IF NOT gtjbticketing.is_active_user() OR gtjbticketing.current_user_role() NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;
  IF NULLIF(trim(client_name), '') IS NULL THEN RAISE EXCEPTION 'Client name is required'; END IF;
  raw_key := 'gts_' || encode(extensions.gen_random_bytes(24), 'hex');
  INSERT INTO gtjbticketing.api_clients(name, key_hash, created_by)
  VALUES (trim(client_name), encode(extensions.digest(raw_key, 'sha256'), 'hex'), gtjbticketing.auth_user_id())
  RETURNING * INTO new_client;
  RETURN jsonb_build_object('id', new_client.id, 'name', new_client.name, 'api_key', raw_key);
END;
$function$;

REVOKE ALL ON FUNCTION gtjbticketing."create_api_client"(client_name text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION gtjbticketing."create_api_client"(client_name text) TO "anon";

GRANT EXECUTE ON FUNCTION gtjbticketing."create_api_client"(client_name text) TO "authenticated";

GRANT EXECUTE ON FUNCTION gtjbticketing."create_api_client"(client_name text) TO "service_role";

CREATE OR REPLACE FUNCTION gtjbticketing.current_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT role FROM gtjbticketing.profiles WHERE id = gtjbticketing.auth_user_id() LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION gtjbticketing."current_user_role"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION gtjbticketing."current_user_role"() TO "anon";

GRANT EXECUTE ON FUNCTION gtjbticketing."current_user_role"() TO "authenticated";

GRANT EXECUTE ON FUNCTION gtjbticketing."current_user_role"() TO "service_role";

CREATE OR REPLACE FUNCTION gtjbticketing.delete_api_client(p_client_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  RETURN gtjbticketing.set_admin_record_deleted('api_clients', p_client_id, false);
END;
$function$;

REVOKE ALL ON FUNCTION gtjbticketing."delete_api_client"(p_client_id uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION gtjbticketing."delete_api_client"(p_client_id uuid) TO "anon";

GRANT EXECUTE ON FUNCTION gtjbticketing."delete_api_client"(p_client_id uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION gtjbticketing."delete_api_client"(p_client_id uuid) TO "service_role";

CREATE OR REPLACE FUNCTION gtjbticketing.ingest_ticket(p_api_key text, p_ticket_title text, p_ticket_description text, p_ticket_category text DEFAULT NULL::text, p_ticket_priority text DEFAULT 'medium'::text, p_user_email text DEFAULT NULL::text, p_system_logs jsonb DEFAULT NULL::jsonb, p_idempotency_key text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  matched_client gtjbticketing.api_clients;
  matched_author UUID;
  new_ticket gtjbticketing.tickets;
  recent_requests INTEGER;
  requested_category TEXT := NULLIF(trim(p_ticket_category), '');
  resolved_category TEXT;
BEGIN
  SELECT * INTO matched_client FROM gtjbticketing.api_clients
  WHERE key_hash = encode(extensions.digest(p_api_key, 'sha256'), 'hex')
    AND is_active = true AND deleted_at IS NULL LIMIT 1;
  IF matched_client.id IS NULL THEN RAISE EXCEPTION 'Invalid API key' USING ERRCODE = '28000'; END IF;

  IF p_idempotency_key IS NOT NULL THEN
    IF length(p_idempotency_key) > 200 THEN RAISE EXCEPTION 'Idempotency key is too long'; END IF;
    SELECT t.* INTO new_ticket FROM gtjbticketing.api_request_logs l
    JOIN gtjbticketing.tickets t ON t.id = l.ticket_id
    WHERE l.client_id = matched_client.id AND l.idempotency_key = p_idempotency_key LIMIT 1;
    IF new_ticket.id IS NOT NULL THEN
      RETURN jsonb_build_object('id', new_ticket.id, 'ticket_number', new_ticket.ticket_number, 'title', new_ticket.title, 'status', new_ticket.status, 'duplicate', true);
    END IF;
  END IF;

  SELECT count(*) INTO recent_requests FROM gtjbticketing.api_request_logs
  WHERE client_id = matched_client.id AND created_at > now() - interval '1 minute';
  IF recent_requests >= 60 THEN RAISE EXCEPTION 'API rate limit exceeded'; END IF;
  IF NULLIF(trim(p_ticket_title), '') IS NULL OR NULLIF(trim(p_ticket_description), '') IS NULL THEN
    RAISE EXCEPTION 'Title and description are required';
  END IF;
  IF length(p_ticket_title) > 200 OR length(p_ticket_description) > 100000 THEN RAISE EXCEPTION 'Ticket content exceeds the allowed size'; END IF;
  IF p_ticket_priority NOT IN ('low', 'medium', 'high', 'urgent') THEN RAISE EXCEPTION 'Invalid priority'; END IF;

  IF requested_category IS NULL THEN
    SELECT category_name INTO resolved_category
    FROM gtjbticketing.category_rules
    WHERE deleted_at IS NULL
    ORDER BY CASE WHEN category_name = 'Risk Screen' THEN 0 ELSE 1 END, category_name
    LIMIT 1;
  ELSE
    SELECT category_name INTO resolved_category
    FROM gtjbticketing.category_rules
    WHERE deleted_at IS NULL AND category_name = requested_category
    LIMIT 1;
  END IF;
  IF resolved_category IS NULL THEN
    RAISE EXCEPTION 'Ticket category is not active';
  END IF;

  IF p_user_email IS NOT NULL THEN
    IF lower(trim(p_user_email)) !~ '^[^@]+@(gtmsw\.com\.my|outlook\.com)$' THEN RAISE EXCEPTION 'Reporter email domain is not allowed'; END IF;
    SELECT id INTO matched_author FROM gtjbticketing.profiles
    WHERE email = lower(trim(p_user_email)) AND account_status = 'active' AND deleted_at IS NULL LIMIT 1;
  END IF;
  IF p_system_logs IS NOT NULL AND length(p_system_logs::TEXT) > 100000 THEN RAISE EXCEPTION 'System logs exceed the allowed size'; END IF;

  INSERT INTO gtjbticketing.tickets(title, description, category, priority, author_id, reporter_email, system_logs, source)
  VALUES (trim(p_ticket_title), p_ticket_description, resolved_category, p_ticket_priority,
    matched_author, CASE WHEN p_user_email IS NULL THEN NULL ELSE lower(trim(p_user_email)) END, p_system_logs, 'api')
  RETURNING * INTO new_ticket;
  INSERT INTO gtjbticketing.api_request_logs(client_id, ticket_id, idempotency_key)
  VALUES (matched_client.id, new_ticket.id, p_idempotency_key);
  UPDATE gtjbticketing.api_clients SET last_used_at = now() WHERE id = matched_client.id;
  RETURN jsonb_build_object('id', new_ticket.id, 'ticket_number', new_ticket.ticket_number, 'title', new_ticket.title, 'status', new_ticket.status);
END;
$function$;

REVOKE ALL ON FUNCTION gtjbticketing."ingest_ticket"(p_api_key text, p_ticket_title text, p_ticket_description text, p_ticket_category text, p_ticket_priority text, p_user_email text, p_system_logs jsonb, p_idempotency_key text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION gtjbticketing."ingest_ticket"(p_api_key text, p_ticket_title text, p_ticket_description text, p_ticket_category text, p_ticket_priority text, p_user_email text, p_system_logs jsonb, p_idempotency_key text) TO "anon";

GRANT EXECUTE ON FUNCTION gtjbticketing."ingest_ticket"(p_api_key text, p_ticket_title text, p_ticket_description text, p_ticket_category text, p_ticket_priority text, p_user_email text, p_system_logs jsonb, p_idempotency_key text) TO "authenticated";

GRANT EXECUTE ON FUNCTION gtjbticketing."ingest_ticket"(p_api_key text, p_ticket_title text, p_ticket_description text, p_ticket_category text, p_ticket_priority text, p_user_email text, p_system_logs jsonb, p_idempotency_key text) TO "service_role";

CREATE OR REPLACE FUNCTION gtjbticketing.is_active_user()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM gtjbticketing.profiles
    WHERE id = gtjbticketing.auth_user_id()
      AND account_status = 'active'
      AND deleted_at IS NULL
  );
$function$;

REVOKE ALL ON FUNCTION gtjbticketing."is_active_user"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION gtjbticketing."is_active_user"() TO "anon";

GRANT EXECUTE ON FUNCTION gtjbticketing."is_active_user"() TO "authenticated";

GRANT EXECUTE ON FUNCTION gtjbticketing."is_active_user"() TO "service_role";

CREATE OR REPLACE FUNCTION gtjbticketing.notify_ticket_comment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  parent_ticket gtjbticketing.tickets;
  author_role TEXT;
BEGIN
  IF NEW.is_internal_note THEN RETURN NEW; END IF;

  SELECT * INTO parent_ticket FROM gtjbticketing.tickets WHERE id = NEW.ticket_id;
  SELECT role INTO author_role FROM gtjbticketing.profiles WHERE id = NEW.author_id;

  INSERT INTO gtjbticketing.notifications(recipient_id, ticket_id, kind, title, body)
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
    FROM gtjbticketing.profiles p
    WHERE author_role IN ('admin', 'super_admin')
      AND p.id = parent_ticket.author_id
      AND p.role = 'employee'
      AND p.account_status = 'active'
      AND p.deleted_at IS NULL
      AND p.id IS DISTINCT FROM NEW.author_id
    UNION
    SELECT p.id
    FROM gtjbticketing.profiles p
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
$function$;

REVOKE ALL ON FUNCTION gtjbticketing."notify_ticket_comment"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION gtjbticketing."notify_ticket_comment"() TO "anon";

GRANT EXECUTE ON FUNCTION gtjbticketing."notify_ticket_comment"() TO "authenticated";

GRANT EXECUTE ON FUNCTION gtjbticketing."notify_ticket_comment"() TO "service_role";

CREATE OR REPLACE FUNCTION gtjbticketing.prepare_ticket_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

REVOKE ALL ON FUNCTION gtjbticketing."prepare_ticket_update"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION gtjbticketing."prepare_ticket_update"() TO "anon";

GRANT EXECUTE ON FUNCTION gtjbticketing."prepare_ticket_update"() TO "authenticated";

GRANT EXECUTE ON FUNCTION gtjbticketing."prepare_ticket_update"() TO "service_role";

CREATE OR REPLACE FUNCTION gtjbticketing.protect_last_active_category()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    FROM gtjbticketing.category_rules
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
$function$;

REVOKE ALL ON FUNCTION gtjbticketing."protect_last_active_category"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION gtjbticketing."protect_last_active_category"() TO "anon";

GRANT EXECUTE ON FUNCTION gtjbticketing."protect_last_active_category"() TO "authenticated";

GRANT EXECUTE ON FUNCTION gtjbticketing."protect_last_active_category"() TO "service_role";

CREATE OR REPLACE FUNCTION gtjbticketing.protect_profile_security_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  actor_role TEXT := gtjbticketing.current_user_role();
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
    IF gtjbticketing.auth_user_id() = OLD.id THEN
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
    AND gtjbticketing.auth_user_id() IS DISTINCT FROM OLD.id
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
    FROM gtjbticketing.profiles
    WHERE role = 'super_admin' AND account_status = 'active' AND deleted_at IS NULL;
    IF active_super_admins <= 1 THEN
      RAISE EXCEPTION 'The final active Super Admin cannot be demoted, suspended, or deleted';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION gtjbticketing."protect_profile_security_fields"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION gtjbticketing."protect_profile_security_fields"() TO "anon";

GRANT EXECUTE ON FUNCTION gtjbticketing."protect_profile_security_fields"() TO "authenticated";

GRANT EXECUTE ON FUNCTION gtjbticketing."protect_profile_security_fields"() TO "service_role";

CREATE OR REPLACE FUNCTION gtjbticketing.protect_system_comments()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$;

REVOKE ALL ON FUNCTION gtjbticketing."protect_system_comments"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION gtjbticketing."protect_system_comments"() TO "anon";

GRANT EXECUTE ON FUNCTION gtjbticketing."protect_system_comments"() TO "authenticated";

GRANT EXECUTE ON FUNCTION gtjbticketing."protect_system_comments"() TO "service_role";

CREATE OR REPLACE FUNCTION gtjbticketing.reopen_own_ticket(target_ticket_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  changed_count INTEGER;
BEGIN
  IF NOT gtjbticketing.is_active_user() THEN
    RAISE EXCEPTION 'Active account required';
  END IF;

  UPDATE gtjbticketing.tickets
  SET status = 'open', resolved_at = NULL
  WHERE id = target_ticket_id
    AND author_id = gtjbticketing.auth_user_id()
    AND status IN ('resolved', 'closed')
    AND resolved_at IS NOT NULL
    AND resolved_at >= now() - interval '7 days';

  GET DIAGNOSTICS changed_count = ROW_COUNT;
  IF changed_count = 0 THEN
    RAISE EXCEPTION 'Ticket cannot be reopened after seven days or by this user';
  END IF;
  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION gtjbticketing."reopen_own_ticket"(target_ticket_id uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION gtjbticketing."reopen_own_ticket"(target_ticket_id uuid) TO "anon";

GRANT EXECUTE ON FUNCTION gtjbticketing."reopen_own_ticket"(target_ticket_id uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION gtjbticketing."reopen_own_ticket"(target_ticket_id uuid) TO "service_role";

CREATE OR REPLACE FUNCTION gtjbticketing.set_admin_record_deleted(p_resource text, p_record_id uuid, p_restore boolean DEFAULT false)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  actor_role TEXT := gtjbticketing.current_user_role();
  affected INTEGER;
  lifecycle_at TIMESTAMPTZ;
  lifecycle_actor UUID;
BEGIN
  IF NOT gtjbticketing.is_active_user() OR actor_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;
  IF p_resource NOT IN ('tickets', 'comments', 'faqs', 'category_rules', 'incidents', 'api_clients') THEN
    RAISE EXCEPTION 'Unsupported administrative resource';
  END IF;

  IF p_resource = 'tickets' THEN
    IF p_restore THEN
      SELECT deleted_at, deleted_by
      INTO lifecycle_at, lifecycle_actor
      FROM gtjbticketing.tickets
      WHERE id = p_record_id AND deleted_at IS NOT NULL
      FOR UPDATE;

      IF lifecycle_at IS NULL THEN
        RAISE EXCEPTION 'Record not found or already in the requested lifecycle state';
      END IF;

      UPDATE gtjbticketing.tickets
      SET deleted_at = NULL, deleted_by = NULL
      WHERE id = p_record_id;

      UPDATE gtjbticketing.comments
      SET deleted_at = NULL, deleted_by = NULL
      WHERE ticket_id = p_record_id
        AND deleted_at = lifecycle_at
        AND deleted_by IS NOT DISTINCT FROM lifecycle_actor;
    ELSE
      lifecycle_at := clock_timestamp();
      lifecycle_actor := gtjbticketing.auth_user_id();

      UPDATE gtjbticketing.tickets
      SET deleted_at = lifecycle_at, deleted_by = lifecycle_actor
      WHERE id = p_record_id AND deleted_at IS NULL;
      GET DIAGNOSTICS affected = ROW_COUNT;

      IF affected = 0 THEN
        RAISE EXCEPTION 'Record not found or already in the requested lifecycle state';
      END IF;

      UPDATE gtjbticketing.comments
      SET deleted_at = lifecycle_at, deleted_by = lifecycle_actor
      WHERE ticket_id = p_record_id AND deleted_at IS NULL;
    END IF;
    RETURN true;
  END IF;

  IF p_restore THEN
    EXECUTE format(
      'UPDATE gtjbticketing.%I SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 AND deleted_at IS NOT NULL',
      p_resource
    ) USING p_record_id;
  ELSIF p_resource = 'api_clients' THEN
    UPDATE gtjbticketing.api_clients
    SET is_active = false, deleted_at = now(), deleted_by = gtjbticketing.auth_user_id()
    WHERE id = p_record_id AND deleted_at IS NULL;
  ELSE
    EXECUTE format(
      'UPDATE gtjbticketing.%I SET deleted_at = now(), deleted_by = $2 WHERE id = $1 AND deleted_at IS NULL',
      p_resource
    ) USING p_record_id, gtjbticketing.auth_user_id();
  END IF;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected = 0 THEN
    RAISE EXCEPTION 'Record not found or already in the requested lifecycle state';
  END IF;
  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION gtjbticketing."set_admin_record_deleted"(p_resource text, p_record_id uuid, p_restore boolean) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION gtjbticketing."set_admin_record_deleted"(p_resource text, p_record_id uuid, p_restore boolean) TO "anon";

GRANT EXECUTE ON FUNCTION gtjbticketing."set_admin_record_deleted"(p_resource text, p_record_id uuid, p_restore boolean) TO "authenticated";

GRANT EXECUTE ON FUNCTION gtjbticketing."set_admin_record_deleted"(p_resource text, p_record_id uuid, p_restore boolean) TO "service_role";

CREATE OR REPLACE FUNCTION gtjbticketing.set_ticket_department_snapshot()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF NEW.department_id IS NULL THEN
    SELECT p.department_id INTO NEW.department_id
    FROM gtjbticketing.profiles p WHERE p.id = NEW.author_id;
    IF NEW.department_id IS NULL THEN
      SELECT d.id INTO NEW.department_id
      FROM gtjbticketing.departments d WHERE d.slug = 'system-integrations';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION gtjbticketing."set_ticket_department_snapshot"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION gtjbticketing."set_ticket_department_snapshot"() TO "anon";

GRANT EXECUTE ON FUNCTION gtjbticketing."set_ticket_department_snapshot"() TO "authenticated";

GRANT EXECUTE ON FUNCTION gtjbticketing."set_ticket_department_snapshot"() TO "service_role";

CREATE OR REPLACE FUNCTION gtjbticketing.soft_delete_ticket(p_ticket_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  RETURN gtjbticketing.set_admin_record_deleted('tickets', p_ticket_id, false);
END;
$function$;

REVOKE ALL ON FUNCTION gtjbticketing."soft_delete_ticket"(p_ticket_id uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION gtjbticketing."soft_delete_ticket"(p_ticket_id uuid) TO "anon";

GRANT EXECUTE ON FUNCTION gtjbticketing."soft_delete_ticket"(p_ticket_id uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION gtjbticketing."soft_delete_ticket"(p_ticket_id uuid) TO "service_role";

CREATE OR REPLACE FUNCTION gtjbticketing.submit_portal_ticket(p_title text, p_category text, p_priority text, p_description text, p_device_context jsonb DEFAULT '{}'::jsonb, p_attachment_paths text[] DEFAULT ARRAY[]::text[], p_impact text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  created_ticket_id UUID;
  linked_count INTEGER;
BEGIN
  IF NOT gtjbticketing.is_active_user() THEN RAISE EXCEPTION 'Active staff access required'; END IF;
  IF length(trim(p_title)) < 5 THEN RAISE EXCEPTION 'Ticket title is too short'; END IF;
  IF NOT EXISTS (SELECT 1 FROM gtjbticketing.category_rules WHERE category_name = p_category AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Select an active ticket category';
  END IF;
  IF p_priority NOT IN ('low', 'medium', 'high', 'urgent') THEN RAISE EXCEPTION 'Invalid ticket priority'; END IF;
  IF length(trim(p_description)) < 12 THEN RAISE EXCEPTION 'Ticket description is incomplete'; END IF;
  IF p_priority = 'urgent' AND length(trim(COALESCE(p_impact, ''))) < 20 THEN
    RAISE EXCEPTION 'P0 impact details are required';
  END IF;

  INSERT INTO gtjbticketing.tickets(title, category, priority, description, author_id, device_context, source)
  VALUES (
    trim(p_title), p_category, p_priority,
    CASE WHEN p_priority = 'urgent' THEN p_description || E'\n\n## Business impact\n' || trim(p_impact) ELSE p_description END,
    gtjbticketing.auth_user_id(), p_device_context, 'portal'
  )
  RETURNING id INTO created_ticket_id;

  IF cardinality(p_attachment_paths) > 0 THEN
    UPDATE gtjbticketing.ticket_attachments
    SET ticket_id = created_ticket_id
    WHERE uploader_id = gtjbticketing.auth_user_id() AND ticket_id IS NULL AND storage_path = ANY(p_attachment_paths);
    GET DIAGNOSTICS linked_count = ROW_COUNT;
    IF linked_count <> cardinality(p_attachment_paths) THEN
      RAISE EXCEPTION 'One or more draft attachments could not be linked';
    END IF;
  END IF;
  RETURN created_ticket_id;
END;
$function$;

REVOKE ALL ON FUNCTION gtjbticketing."submit_portal_ticket"(p_title text, p_category text, p_priority text, p_description text, p_device_context jsonb, p_attachment_paths text[], p_impact text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION gtjbticketing."submit_portal_ticket"(p_title text, p_category text, p_priority text, p_description text, p_device_context jsonb, p_attachment_paths text[], p_impact text) TO "anon";

GRANT EXECUTE ON FUNCTION gtjbticketing."submit_portal_ticket"(p_title text, p_category text, p_priority text, p_description text, p_device_context jsonb, p_attachment_paths text[], p_impact text) TO "authenticated";

GRANT EXECUTE ON FUNCTION gtjbticketing."submit_portal_ticket"(p_title text, p_category text, p_priority text, p_description text, p_device_context jsonb, p_attachment_paths text[], p_impact text) TO "service_role";

CREATE OR REPLACE FUNCTION gtjbticketing.sync_profile_department()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  matched gtjbticketing.departments%ROWTYPE;
BEGIN
  IF NEW.department_id IS NOT NULL THEN
    SELECT * INTO matched FROM gtjbticketing.departments WHERE id = NEW.department_id;
  ELSE
    SELECT * INTO matched
    FROM gtjbticketing.departments
    WHERE slug = CASE
      WHEN trim(COALESCE(NEW.department, '')) IN ('AI Department', 'General', 'AI & Automation Transformation')
        THEN 'ai-automation-transformation'
      ELSE regexp_replace(lower(trim(COALESCE(NEW.department, ''))), '[^a-z0-9]+', '-', 'g')
    END;
  END IF;
  IF matched.id IS NULL OR matched.is_system OR NOT matched.is_active THEN
    RAISE EXCEPTION 'Select an active staff department';
  END IF;
  NEW.department_id := matched.id;
  NEW.department := matched.name;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION gtjbticketing."sync_profile_department"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION gtjbticketing."sync_profile_department"() TO "anon";

GRANT EXECUTE ON FUNCTION gtjbticketing."sync_profile_department"() TO "authenticated";

GRANT EXECUTE ON FUNCTION gtjbticketing."sync_profile_department"() TO "service_role";

CREATE OR REPLACE FUNCTION gtjbticketing.touch_admin_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION gtjbticketing."touch_admin_updated_at"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION gtjbticketing."touch_admin_updated_at"() TO "anon";

GRANT EXECUTE ON FUNCTION gtjbticketing."touch_admin_updated_at"() TO "authenticated";

GRANT EXECUTE ON FUNCTION gtjbticketing."touch_admin_updated_at"() TO "service_role";

CREATE OR REPLACE FUNCTION gtjbticketing.validate_new_ticket_category()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  category_assignee UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT default_assignee_id INTO category_assignee
    FROM gtjbticketing.category_rules
    WHERE category_name = NEW.category AND deleted_at IS NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Ticket category is not active';
    END IF;
    IF NEW.assignee_id IS NULL THEN NEW.assignee_id := category_assignee; END IF;
  ELSIF NEW.category IS DISTINCT FROM OLD.category THEN
    SELECT default_assignee_id INTO category_assignee
    FROM gtjbticketing.category_rules
    WHERE category_name = NEW.category AND deleted_at IS NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Ticket category is not active';
    END IF;
    IF NEW.assignee_id IS NULL THEN NEW.assignee_id := category_assignee; END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION gtjbticketing."validate_new_ticket_category"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION gtjbticketing."validate_new_ticket_category"() TO "anon";

GRANT EXECUTE ON FUNCTION gtjbticketing."validate_new_ticket_category"() TO "authenticated";

GRANT EXECUTE ON FUNCTION gtjbticketing."validate_new_ticket_category"() TO "service_role";

CREATE VIEW gtjbticketing."comment_details" WITH (security_invoker=true) AS  SELECT c.id,
    c.ticket_id,
    c.author_id,
    c.content,
    c.is_internal_note,
    c.type,
    c.created_at,
    c.updated_at,
    c.deleted_at,
        CASE
            WHEN author.id IS NULL THEN NULL::jsonb
            ELSE jsonb_build_object('id', author.id, 'display_name', author.display_name, 'department', author.department)
        END AS author,
        CASE
            WHEN ticket.id IS NULL THEN NULL::jsonb
            ELSE jsonb_build_object('id', ticket.id, 'ticket_number', ticket.ticket_number, 'title', ticket.title)
        END AS ticket
   FROM gtjbticketing.comments c
     LEFT JOIN gtjbticketing.profiles author ON author.id = c.author_id
     LEFT JOIN gtjbticketing.tickets ticket ON ticket.id = c.ticket_id;

CREATE VIEW gtjbticketing."category_rule_details" WITH (security_invoker=true) AS  SELECT rule.id,
    rule.category_name,
    rule.template_markdown,
    rule.default_assignee_id,
    rule.created_at,
    rule.updated_at,
    rule.deleted_at,
        CASE
            WHEN assignee.id IS NULL THEN NULL::jsonb
            ELSE jsonb_build_object('id', assignee.id, 'display_name', assignee.display_name)
        END AS default_assignee
   FROM gtjbticketing.category_rules rule
     LEFT JOIN gtjbticketing.profiles assignee ON assignee.id = rule.default_assignee_id;

CREATE TRIGGER audit_admin_resource_change AFTER INSERT OR UPDATE ON gtjbticketing.api_clients FOR EACH ROW EXECUTE FUNCTION gtjbticketing.audit_admin_resource_change();

CREATE TRIGGER touch_admin_updated_at BEFORE UPDATE ON gtjbticketing.api_clients FOR EACH ROW EXECUTE FUNCTION gtjbticketing.touch_admin_updated_at();

CREATE TRIGGER audit_admin_resource_change AFTER INSERT OR UPDATE ON gtjbticketing.category_rules FOR EACH ROW EXECUTE FUNCTION gtjbticketing.audit_admin_resource_change();

CREATE TRIGGER protect_last_active_category BEFORE DELETE OR UPDATE ON gtjbticketing.category_rules FOR EACH ROW EXECUTE FUNCTION gtjbticketing.protect_last_active_category();

CREATE TRIGGER touch_admin_updated_at BEFORE UPDATE ON gtjbticketing.category_rules FOR EACH ROW EXECUTE FUNCTION gtjbticketing.touch_admin_updated_at();

CREATE TRIGGER audit_admin_resource_change AFTER INSERT OR UPDATE ON gtjbticketing.comments FOR EACH ROW EXECUTE FUNCTION gtjbticketing.audit_admin_resource_change();

CREATE TRIGGER notify_ticket_comment AFTER INSERT ON gtjbticketing.comments FOR EACH ROW EXECUTE FUNCTION gtjbticketing.notify_ticket_comment();

CREATE TRIGGER protect_system_comments BEFORE UPDATE ON gtjbticketing.comments FOR EACH ROW EXECUTE FUNCTION gtjbticketing.protect_system_comments();

CREATE TRIGGER touch_admin_updated_at BEFORE UPDATE ON gtjbticketing.comments FOR EACH ROW EXECUTE FUNCTION gtjbticketing.touch_admin_updated_at();

CREATE TRIGGER audit_admin_department_change AFTER INSERT OR UPDATE ON gtjbticketing.departments FOR EACH ROW EXECUTE FUNCTION gtjbticketing.audit_admin_resource_change();

CREATE TRIGGER audit_admin_resource_change AFTER INSERT OR UPDATE ON gtjbticketing.faqs FOR EACH ROW EXECUTE FUNCTION gtjbticketing.audit_admin_resource_change();

CREATE TRIGGER touch_admin_updated_at BEFORE UPDATE ON gtjbticketing.faqs FOR EACH ROW EXECUTE FUNCTION gtjbticketing.touch_admin_updated_at();

CREATE TRIGGER audit_admin_resource_change AFTER INSERT OR UPDATE ON gtjbticketing.incidents FOR EACH ROW EXECUTE FUNCTION gtjbticketing.audit_admin_resource_change();

CREATE TRIGGER touch_admin_updated_at BEFORE UPDATE ON gtjbticketing.incidents FOR EACH ROW EXECUTE FUNCTION gtjbticketing.touch_admin_updated_at();

CREATE TRIGGER audit_admin_resource_change AFTER INSERT OR UPDATE ON gtjbticketing.profiles FOR EACH ROW EXECUTE FUNCTION gtjbticketing.audit_admin_resource_change();

CREATE TRIGGER protect_profile_security_fields BEFORE UPDATE ON gtjbticketing.profiles FOR EACH ROW EXECUTE FUNCTION gtjbticketing.protect_profile_security_fields();

CREATE TRIGGER sync_profile_department_before_write BEFORE INSERT OR UPDATE OF department_id, department ON gtjbticketing.profiles FOR EACH ROW EXECUTE FUNCTION gtjbticketing.sync_profile_department();

CREATE TRIGGER audit_admin_resource_change AFTER INSERT OR UPDATE ON gtjbticketing.tickets FOR EACH ROW EXECUTE FUNCTION gtjbticketing.audit_admin_resource_change();

CREATE TRIGGER audit_ticket_change AFTER INSERT OR UPDATE ON gtjbticketing.tickets FOR EACH ROW EXECUTE FUNCTION gtjbticketing.audit_ticket_change();

CREATE TRIGGER prepare_ticket_update BEFORE UPDATE ON gtjbticketing.tickets FOR EACH ROW EXECUTE FUNCTION gtjbticketing.prepare_ticket_update();

CREATE TRIGGER set_ticket_department_before_insert BEFORE INSERT ON gtjbticketing.tickets FOR EACH ROW EXECUTE FUNCTION gtjbticketing.set_ticket_department_snapshot();

CREATE TRIGGER validate_new_ticket_category BEFORE INSERT OR UPDATE ON gtjbticketing.tickets FOR EACH ROW EXECUTE FUNCTION gtjbticketing.validate_new_ticket_category();

ALTER TABLE gtjbticketing."profiles" ENABLE ROW LEVEL SECURITY;

ALTER TABLE gtjbticketing."tickets" ENABLE ROW LEVEL SECURITY;

ALTER TABLE gtjbticketing."comments" ENABLE ROW LEVEL SECURITY;

ALTER TABLE gtjbticketing."ticket_audit_logs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE gtjbticketing."faqs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE gtjbticketing."category_rules" ENABLE ROW LEVEL SECURITY;

ALTER TABLE gtjbticketing."incidents" ENABLE ROW LEVEL SECURITY;

ALTER TABLE gtjbticketing."notifications" ENABLE ROW LEVEL SECURITY;

ALTER TABLE gtjbticketing."api_clients" ENABLE ROW LEVEL SECURITY;

ALTER TABLE gtjbticketing."api_request_logs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE gtjbticketing."admin_activity_logs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE gtjbticketing."departments" ENABLE ROW LEVEL SECURITY;

ALTER TABLE gtjbticketing."ticket_attachments" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admins read activity logs" ON gtjbticketing."admin_activity_logs" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((gtjbticketing.is_active_user() AND (gtjbticketing.current_user_role() = 'super_admin'::text)));

CREATE POLICY "Administrators read API clients" ON gtjbticketing."api_clients" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((gtjbticketing.is_active_user() AND (gtjbticketing.current_user_role() = ANY (ARRAY['admin'::text, 'super_admin'::text]))));

CREATE POLICY "Administrators update API clients" ON gtjbticketing."api_clients" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((gtjbticketing.is_active_user() AND (gtjbticketing.current_user_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])))) WITH CHECK ((gtjbticketing.is_active_user() AND (gtjbticketing.current_user_role() = ANY (ARRAY['admin'::text, 'super_admin'::text]))));

CREATE POLICY "Super Admins read API request logs" ON gtjbticketing."api_request_logs" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((gtjbticketing.is_active_user() AND (gtjbticketing.current_user_role() = 'super_admin'::text)));

CREATE POLICY "Administrators insert category rules" ON gtjbticketing."category_rules" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((gtjbticketing.is_active_user() AND (gtjbticketing.current_user_role() = ANY (ARRAY['admin'::text, 'super_admin'::text]))));

CREATE POLICY "Administrators update category rules" ON gtjbticketing."category_rules" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((gtjbticketing.is_active_user() AND (gtjbticketing.current_user_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])))) WITH CHECK ((gtjbticketing.is_active_user() AND (gtjbticketing.current_user_role() = ANY (ARRAY['admin'::text, 'super_admin'::text]))));

CREATE POLICY "Visible category rules read" ON gtjbticketing."category_rules" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((gtjbticketing.is_active_user() AND ((deleted_at IS NULL) OR (gtjbticketing.current_user_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])))));

CREATE POLICY "Administrators update comments" ON gtjbticketing."comments" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((gtjbticketing.is_active_user() AND (gtjbticketing.current_user_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])))) WITH CHECK ((gtjbticketing.is_active_user() AND (gtjbticketing.current_user_role() = ANY (ARRAY['admin'::text, 'super_admin'::text]))));

CREATE POLICY "Authors insert public comments" ON gtjbticketing."comments" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((gtjbticketing.is_active_user() AND (author_id = gtjbticketing.auth_user_id()) AND (EXISTS ( SELECT 1
   FROM gtjbticketing.tickets t
  WHERE ((t.id = comments.ticket_id) AND (t.deleted_at IS NULL) AND ((t.author_id = gtjbticketing.auth_user_id()) OR (gtjbticketing.current_user_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])))))) AND ((NOT is_internal_note) OR (gtjbticketing.current_user_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])))));

CREATE POLICY "Department public comments read" ON gtjbticketing."comments" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((gtjbticketing.is_active_user() AND (deleted_at IS NULL) AND ((gtjbticketing.current_user_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])) OR ((NOT is_internal_note) AND (EXISTS ( SELECT 1
   FROM (gtjbticketing.tickets t
     JOIN gtjbticketing.profiles viewer ON ((viewer.id = gtjbticketing.auth_user_id())))
  WHERE ((t.id = comments.ticket_id) AND (t.deleted_at IS NULL) AND ((t.author_id = gtjbticketing.auth_user_id()) OR (viewer.department_id = t.department_id)))))))));

CREATE POLICY "Active departments read" ON gtjbticketing."departments" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (((is_active AND (NOT is_system)) OR (gtjbticketing.current_user_role() = 'super_admin'::text)));

CREATE POLICY "Super admins manage departments" ON gtjbticketing."departments" AS PERMISSIVE FOR ALL TO "authenticated" USING ((gtjbticketing.is_active_user() AND (gtjbticketing.current_user_role() = 'super_admin'::text))) WITH CHECK ((gtjbticketing.is_active_user() AND (gtjbticketing.current_user_role() = 'super_admin'::text)));

CREATE POLICY "Administrators insert FAQs" ON gtjbticketing."faqs" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((gtjbticketing.is_active_user() AND (gtjbticketing.current_user_role() = ANY (ARRAY['admin'::text, 'super_admin'::text]))));

CREATE POLICY "Administrators update FAQs" ON gtjbticketing."faqs" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((gtjbticketing.is_active_user() AND (gtjbticketing.current_user_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])))) WITH CHECK ((gtjbticketing.is_active_user() AND (gtjbticketing.current_user_role() = ANY (ARRAY['admin'::text, 'super_admin'::text]))));

CREATE POLICY "Visible FAQs read" ON gtjbticketing."faqs" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((gtjbticketing.is_active_user() AND ((deleted_at IS NULL) OR (gtjbticketing.current_user_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])))));

CREATE POLICY "Administrators insert incidents" ON gtjbticketing."incidents" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((gtjbticketing.is_active_user() AND (gtjbticketing.current_user_role() = ANY (ARRAY['admin'::text, 'super_admin'::text]))));

CREATE POLICY "Administrators update incidents" ON gtjbticketing."incidents" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((gtjbticketing.is_active_user() AND (gtjbticketing.current_user_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])))) WITH CHECK ((gtjbticketing.is_active_user() AND (gtjbticketing.current_user_role() = ANY (ARRAY['admin'::text, 'super_admin'::text]))));

CREATE POLICY "Visible incidents read" ON gtjbticketing."incidents" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((gtjbticketing.is_active_user() AND ((deleted_at IS NULL) OR (gtjbticketing.current_user_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])))));

CREATE POLICY "Recipients read notifications" ON gtjbticketing."notifications" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((gtjbticketing.is_active_user() AND (recipient_id = gtjbticketing.auth_user_id())));

CREATE POLICY "Recipients update notifications" ON gtjbticketing."notifications" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((gtjbticketing.is_active_user() AND (recipient_id = gtjbticketing.auth_user_id()))) WITH CHECK ((recipient_id = gtjbticketing.auth_user_id()));

CREATE POLICY "Super Admins read all notifications" ON gtjbticketing."notifications" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((gtjbticketing.is_active_user() AND (gtjbticketing.current_user_role() = 'super_admin'::text)));

CREATE POLICY "Profile self or administrators update" ON gtjbticketing."profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((gtjbticketing.is_active_user() AND ((id = gtjbticketing.auth_user_id()) OR (gtjbticketing.current_user_role() = ANY (ARRAY['admin'::text, 'super_admin'::text]))))) WITH CHECK ((gtjbticketing.is_active_user() AND ((id = gtjbticketing.auth_user_id()) OR (gtjbticketing.current_user_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])))));

CREATE POLICY "Visible profiles read" ON gtjbticketing."profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((gtjbticketing.is_active_user() AND ((deleted_at IS NULL) OR (gtjbticketing.current_user_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])))));

CREATE POLICY "Attachment metadata insert" ON gtjbticketing."ticket_attachments" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((gtjbticketing.is_active_user() AND (uploader_id = gtjbticketing.auth_user_id()) AND (ticket_id IS NULL)));

CREATE POLICY "Attachment metadata read" ON gtjbticketing."ticket_attachments" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((gtjbticketing.is_active_user() AND (((ticket_id IS NULL) AND (uploader_id = gtjbticketing.auth_user_id())) OR (EXISTS ( SELECT 1
   FROM gtjbticketing.tickets t
  WHERE ((t.id = ticket_attachments.ticket_id) AND (t.deleted_at IS NULL)))) OR (gtjbticketing.current_user_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])))));

CREATE POLICY "Draft attachment delete" ON gtjbticketing."ticket_attachments" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((gtjbticketing.is_active_user() AND (uploader_id = gtjbticketing.auth_user_id()) AND (ticket_id IS NULL)));

CREATE POLICY "Uploader binds draft attachment" ON gtjbticketing."ticket_attachments" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((gtjbticketing.is_active_user() AND (uploader_id = gtjbticketing.auth_user_id()) AND (ticket_id IS NULL))) WITH CHECK (((uploader_id = gtjbticketing.auth_user_id()) AND (ticket_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM gtjbticketing.tickets t
  WHERE ((t.id = ticket_attachments.ticket_id) AND (t.author_id = gtjbticketing.auth_user_id()) AND (t.deleted_at IS NULL))))));

CREATE POLICY "Visible audit logs read" ON gtjbticketing."ticket_audit_logs" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((gtjbticketing.is_active_user() AND (EXISTS ( SELECT 1
   FROM gtjbticketing.tickets t
  WHERE ((t.id = ticket_audit_logs.ticket_id) AND ((t.author_id = gtjbticketing.auth_user_id()) OR (gtjbticketing.current_user_role() = ANY (ARRAY['admin'::text, 'super_admin'::text]))))))));

CREATE POLICY "Administrators update tickets" ON gtjbticketing."tickets" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((gtjbticketing.is_active_user() AND (gtjbticketing.current_user_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])))) WITH CHECK ((gtjbticketing.is_active_user() AND (gtjbticketing.current_user_role() = ANY (ARRAY['admin'::text, 'super_admin'::text]))));

CREATE POLICY "Department tickets read" ON gtjbticketing."tickets" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((gtjbticketing.is_active_user() AND (((deleted_at IS NULL) AND ((author_id = gtjbticketing.auth_user_id()) OR (EXISTS ( SELECT 1
   FROM gtjbticketing.profiles viewer
  WHERE ((viewer.id = gtjbticketing.auth_user_id()) AND (viewer.department_id = tickets.department_id) AND (viewer.account_status = 'active'::text) AND (viewer.deleted_at IS NULL)))))) OR (gtjbticketing.current_user_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])))));

CREATE POLICY "Portal tickets insert" ON gtjbticketing."tickets" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((gtjbticketing.is_active_user() AND (author_id = gtjbticketing.auth_user_id()) AND (source = 'portal'::text)));

GRANT USAGE ON SCHEMA gtjbticketing TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA gtjbticketing TO authenticated, service_role;

GRANT SELECT ON gtjbticketing.departments TO anon;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA gtjbticketing TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
