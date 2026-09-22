"""Export only the allowlisted Ticketing structure; never export rows or Auth objects.

Usage: set TICKETING_SOURCE_DATABASE_URL, then run this script from the repo root.
Requires psycopg. The output is an empty-schema bootstrap, not a data migration.
"""
import os
import re
from pathlib import Path

import psycopg
from psycopg import sql

TABLES = (
    "profiles", "tickets", "comments", "ticket_audit_logs", "faqs",
    "category_rules", "incidents", "notifications", "api_clients",
    "api_request_logs", "admin_activity_logs", "departments", "ticket_attachments",
)
VIEWS = ("comment_details", "category_rule_details")
TARGET = "gtjbticketing"


def ident(value):
    return '"' + value.replace('"', '""') + '"'


def remap(value):
    # Only application names are changed; shared extensions remain in place.
    value = value.replace('auth.uid()', TARGET+'.auth_user_id()').replace('auth.jwt()', TARGET+'.auth_claims()')
    return re.sub(r'\bpublic\.("?)([a-z_][a-z_0-9]*)\1',
                  lambda m: TARGET + '.' + m.group(1) + m.group(2) + m.group(1)
                  if m.group(2) in objects else m.group(0), value)


with psycopg.connect(os.environ["TICKETING_SOURCE_DATABASE_URL"], autocommit=False) as db:
    db.execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY")
    db.execute("SET LOCAL search_path = pg_catalog")
    functions = db.execute("""
        SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid),
               pg_get_functiondef(p.oid)
        FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.prokind='f'
        AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass
                        AND d.objid=p.oid AND d.deptype='e') ORDER BY p.proname
    """).fetchall()
    migration_text = '\n'.join(p.read_text(encoding='utf-8') for p in Path('supabase/migrations').glob('*.sql'))
    names = set(re.findall(r'CREATE (?:OR REPLACE )?FUNCTION public\.([a-z_]+)', migration_text, re.I))
    functions = [f for f in functions if f[1] in names and f[1] != 'handle_new_user']
    sequences = db.execute("""
        SELECT s.relname,t.relname,a.attname,q.seqtypid::regtype::text,
               q.seqstart,q.seqincrement,q.seqmin,q.seqmax,q.seqcache,q.seqcycle
        FROM pg_class s JOIN pg_sequence q ON q.seqrelid=s.oid
        JOIN pg_depend d ON d.objid=s.oid AND d.classid='pg_class'::regclass AND d.deptype IN ('a','i')
        JOIN pg_class t ON t.oid=d.refobjid
        JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=d.refobjsubid
        WHERE s.relnamespace='public'::regnamespace AND t.relname=ANY(%s)
    """, (list(TABLES),)).fetchall()
    objects = set(TABLES) | set(VIEWS) | {f[1] for f in functions} | {s[0] for s in sequences}
    out = [
        '-- Ticketing structure only. Generated from the live development catalog.',
        '-- No INSERT/COPY, auth.users changes, shared public.profiles changes, or Signora objects.',
        '-- Apply only to an empty gtjbticketing schema, after prerequisites.sql.',
        'BEGIN;', 'SET LOCAL lock_timeout = \'5s\';',
        'SET LOCAL search_path = pg_catalog, extensions, public;',
        '-- The destination schema must already exist and be owned by the applying role.',
        "DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class WHERE relnamespace='gtjbticketing'::regnamespace AND relkind IN ('r','v','S')) THEN RAISE EXCEPTION 'gtjbticketing is not empty; refusing bootstrap'; END IF; END $$;",
        "CREATE FUNCTION gtjbticketing.auth_claims() RETURNS jsonb LANGUAGE sql STABLE SET search_path = '' AS $$ SELECT COALESCE(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb) $$;",
        "CREATE FUNCTION gtjbticketing.auth_user_id() RETURNS uuid LANGUAGE sql STABLE SET search_path = '' AS $$ SELECT nullif(gtjbticketing.auth_claims()->>'sub', '')::uuid $$;",
        'REVOKE ALL ON FUNCTION gtjbticketing.auth_claims(), gtjbticketing.auth_user_id() FROM PUBLIC;',
        'GRANT EXECUTE ON FUNCTION gtjbticketing.auth_claims(), gtjbticketing.auth_user_id() TO anon, authenticated, service_role;',
    ]
    for name, table, column, typ, start, inc, low, high, cache, cycle in sequences:
        out.append(f'CREATE SEQUENCE {TARGET}.{ident(name)} AS {typ} START {start} INCREMENT {inc} MINVALUE {low} MAXVALUE {high} CACHE {cache} ' + ('CYCLE;' if cycle else 'NO CYCLE;'))
    for table in TABLES:
        columns = db.execute("""
            SELECT a.attname,format_type(a.atttypid,a.atttypmod),a.attnotnull,
                   pg_get_expr(d.adbin,d.adrelid),a.attidentity,a.attgenerated
            FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
            WHERE a.attrelid=%s::regclass AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum
        """, ('public.'+table,)).fetchall()
        if not columns:
            raise RuntimeError('Missing source table: '+table)
        definitions = []
        for name, typ, required, default, identity, generated in columns:
            if identity or generated:
                raise RuntimeError('Review identity/generated column before export: '+table+'.'+name)
            # pgvector lives in public on the source and extensions on the destination.
            typ = typ.replace('public.vector', 'vector')
            definitions.append(ident(name)+' '+typ + (' DEFAULT '+remap(default) if default else '') + (' NOT NULL' if required else ''))
        out.append(f'CREATE TABLE {TARGET}.{ident(table)} (\n  '+',\n  '.join(definitions)+'\n);')
    for name, table, column, *_ in sequences:
        out.append(f'ALTER SEQUENCE {TARGET}.{ident(name)} OWNED BY {TARGET}.{ident(table)}.{ident(column)};')
    for kind in ('p', 'u', 'c', 'f'):
        for table,name,definition in db.execute("""
            SELECT t.relname,c.conname,pg_get_constraintdef(c.oid)
            FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
            WHERE c.connamespace='public'::regnamespace AND t.relname=ANY(%s) AND c.contype=%s
            ORDER BY t.relname,c.conname
        """, (list(TABLES),kind)).fetchall():
            # Identity is supplied by validated Auth JWTs. No direct dependency on
            # this project's auth.users: development shares production identities.
            if table == 'profiles' and name == 'profiles_id_fkey':
                continue
            out.append(f'ALTER TABLE {TARGET}.{ident(table)} ADD CONSTRAINT {ident(name)} '+remap(definition)+';')
    for (definition,) in db.execute("""
        SELECT pg_get_indexdef(i.indexrelid) FROM pg_index i JOIN pg_class t ON t.oid=i.indrelid
        WHERE t.relnamespace='public'::regnamespace AND t.relname=ANY(%s)
        AND NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conindid=i.indexrelid)
        ORDER BY i.indexrelid
    """, (list(TABLES),)).fetchall():
        out.append(remap(definition)+';')
    # Deferred body checking allows mutually dependent routines; all definitions come from the catalog.
    out.append('SET LOCAL check_function_bodies = false;')
    for oid,name,args,definition in functions:
        out.append(remap(definition).replace('public.%I', TARGET+'.%I').replace('\r','').rstrip()+';')
        signature = f'{TARGET}.{ident(name)}({remap(args)})'
        out.append(f'REVOKE ALL ON FUNCTION {signature} FROM PUBLIC;')
        for (role,) in db.execute("""
            SELECT r.rolname FROM pg_proc p CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a
            JOIN pg_roles r ON r.oid=a.grantee WHERE p.oid=%s AND a.privilege_type='EXECUTE'
            AND r.rolname IN ('anon','authenticated','service_role')
        """, (oid,)).fetchall():
            out.append(f'GRANT EXECUTE ON FUNCTION {signature} TO {ident(role)};')
    for view in VIEWS:
        definition,options = db.execute("SELECT pg_get_viewdef(c.oid,true),c.reloptions FROM pg_class c WHERE c.oid=%s::regclass",('public.'+view,)).fetchone()
        opts = ' WITH ('+', '.join(options)+')' if options else ''
        out.append(f'CREATE VIEW {TARGET}.{ident(view)}{opts} AS '+remap(definition))
    for table,definition in db.execute("""
        SELECT c.relname,pg_get_triggerdef(t.oid,true) FROM pg_trigger t
        JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_proc p ON p.oid=t.tgfoid
        WHERE NOT t.tgisinternal AND c.relnamespace='public'::regnamespace
        AND c.relname=ANY(%s) AND p.pronamespace='public'::regnamespace
        ORDER BY c.relname,t.tgname
    """, (list(TABLES),)).fetchall():
        out.append(remap(definition)+';')
    for table in TABLES:
        rls,force = db.execute("SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE oid=%s::regclass",('public.'+table,)).fetchone()
        if not rls:
            raise RuntimeError('Source table has no RLS: '+table)
        out.append(f'ALTER TABLE {TARGET}.{ident(table)} ENABLE ROW LEVEL SECURITY;')
        if force:
            out.append(f'ALTER TABLE {TARGET}.{ident(table)} FORCE ROW LEVEL SECURITY;')
    for table,name,permissive,roles,cmd,qual,check in db.execute("""
        SELECT tablename,policyname,permissive,roles,cmd,qual,with_check FROM pg_policies
        WHERE schemaname='public' AND tablename=ANY(%s) ORDER BY tablename,policyname
    """,(list(TABLES),)).fetchall():
        statement=f'CREATE POLICY {ident(name)} ON {TARGET}.{ident(table)} AS {permissive} FOR {cmd} TO '+', '.join('PUBLIC' if r=='public' else ident(r) for r in roles)
        if qual: statement+=' USING ('+remap(qual)+')'
        if check: statement+=' WITH CHECK ('+remap(check)+')'
        out.append(statement+';')
    out.extend([
        'GRANT USAGE ON SCHEMA gtjbticketing TO anon, authenticated, service_role;',
        'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA gtjbticketing TO authenticated, service_role;',
        'GRANT SELECT ON gtjbticketing.departments TO anon;',
        'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA gtjbticketing TO authenticated, service_role;',
        "NOTIFY pgrst, 'reload schema';", 'COMMIT;',
    ])
    target = Path('supabase/schema/gtjbticketing.sql')
    target.write_text('\n\n'.join(out)+'\n',encoding='utf-8')
    print(f'Exported {len(TABLES)} tables, {len(VIEWS)} views, {len(functions)} functions, {len(sequences)} sequences to {target}; no rows exported.')
