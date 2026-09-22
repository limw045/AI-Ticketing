"""Run real PostgreSQL authorization checks in a transaction that always rolls back.

TICKETING_TEST_DATABASE_URL must be an administrator connection to development.
A temporary isolated schema is created and always rolled back. No Auth users are created.
"""
import json
import os
from pathlib import Path
from uuid import uuid4

import psycopg


with psycopg.connect(os.environ['TICKETING_TEST_DATABASE_URL'], autocommit=True) as db:
    test_schema = 'ticketing_verify_' + uuid4().hex

    def execute(query, params=None):
        return db.execute(query.replace('gtjbticketing', test_schema), params)

    try:
        execute('BEGIN')
        execute('CREATE SCHEMA IF NOT EXISTS gtjbticketing')
        for filename in ('gtjbticketing.sql', 'ticketing_onboarding.sql'):
            ddl = Path('supabase/schema', filename).read_text(encoding='utf-8')
            execute(ddl.replace('BEGIN;', '').replace('COMMIT;', ''))

        def identity(email, uid=None, extra=None):
            execute('RESET ROLE')
            claims = {'sub': str(uid or uuid4()), 'email': email, 'role': 'authenticated'}
            if extra:
                claims.update(extra)
            execute("SELECT set_config('request.jwt.claims', %s, true)", (json.dumps(claims),))
            execute('SET LOCAL ROLE authenticated')
            return claims['sub']

        def rejected(statement, params=()):
            execute('SAVEPOINT rejected_operation')
            try:
                execute(statement, params)
            except psycopg.Error:
                execute('ROLLBACK TO SAVEPOINT rejected_operation')
                return
            raise AssertionError('Expected rejection: '+statement)

        signup = 'SELECT (gtjbticketing.complete_ticketing_profile(%s,%s,%s,%s,%s)).*'
        identity('ordinary@example.com', extra={'user_metadata': {'role': 'super_admin'}})
        rejected(signup, ('Ordinary', None, 'full_time', None, 'Unauthorized department'))

        admin_id = identity('lim.weijian@outlook.com')
        admin = execute(signup, ('Ticketing Admin',None,'full_time',None,'Test Department')).fetchone()
        assert admin[6] == 'super_admin'
        department = execute('SELECT id FROM gtjbticketing.departments').fetchone()[0]

        employee_id = identity('ordinary@example.com', extra={'user_metadata': {'role': 'super_admin'}})
        employee = execute(signup, ('Employee',department,'full_time',None,None)).fetchone()
        assert employee[6] == 'employee'
        rejected("UPDATE gtjbticketing.profiles SET role='super_admin' WHERE id=%s", (employee_id,))
        repeated = execute(signup, ('Overwrite',department,'contractor',None,None)).fetchone()
        assert repeated[2] == 'Employee' and repeated[6] == 'employee'
        rejected("INSERT INTO gtjbticketing.profiles(id,email,display_name,user_type,department,role) VALUES(%s,'forged@example.com','Forged','full_time','Test Department','super_admin')", (str(uuid4()),))

        identity('intern@example.com')
        rejected(signup, ('Intern',department,'intern',None,None))

        identity('lim.weijian@outlook.com', admin_id)
        execute("UPDATE gtjbticketing.profiles SET account_status='suspended' WHERE id=%s", (employee_id,))
        identity('ordinary@example.com', employee_id)
        suspended = execute(signup, ('Reactivation',department,'full_time',None,None)).fetchone()
        assert suspended[9] == 'suspended'
        assert execute('SELECT gtjbticketing.is_active_user()').fetchone()[0] is False
        assert execute('SELECT count(*) FROM gtjbticketing.profiles').fetchone()[0] == 0

        execute('RESET ROLE')
        execute("SELECT set_config('request.jwt.claims','{}',true)")
        execute('SET LOCAL ROLE anon')
        rejected(signup, ('Anonymous',department,'full_time',None,None))
        print('Passed: onboarding, trusted identity, forged-role rejection, RLS, no self-elevation, idempotency, intern validation, suspension, anonymous denial.')
    finally:
        execute('ROLLBACK')
        print('All test changes rolled back; no Auth users or application data persisted.')
