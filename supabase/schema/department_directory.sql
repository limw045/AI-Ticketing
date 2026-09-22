-- Approved directory imported from development public.departments on 2026-09-22.
-- Preserves inactive and system-only entries; does not copy profiles or tickets.
BEGIN;
INSERT INTO gtjbticketing.departments(id,name,slug,is_active,is_system) VALUES
('605cf14b-69cd-4db4-9873-37dae123e47e','AI & Automation Transformation','ai-automation-transformation',true,false),
('164b1a2e-8ed8-4732-bd0b-c1fad46cc806','General','general',true,false),
('025a8433-1e74-4772-a2cf-abed8c5af366','AUDIT','audit',true,false),
('87222155-7b19-4ad4-97af-7d2e08583d99','HR','hr',true,false),
('9edee8f9-f367-4c37-942c-570aed315a7a','Indirect Tax & Admin','indirect-tax-admin',true,false),
('3cd86e8b-2069-490f-8d26-66be16528479','IT','it',true,false),
('d5603745-e824-48a9-a4a3-1a9b7ce39fd3','M.S.WONG & CO','ms-wong-co',true,false),
('16579898-e970-417d-974b-c1fac492f5fd','RockAcc','rockacc',true,false),
('5eae03de-7052-45ec-8878-9c25264663dd','Secretary','secretary',true,false),
('3a9db18c-5178-491d-a0c8-de4c84523046','System Integrations','system-integrations',true,true),
('a5f05eed-d835-4f78-bab4-5befe5b50583','TAX','tax',false,false),
('5cb0432a-78d5-4e9c-95a6-7526025e9997','TYM','tym',true,false)
ON CONFLICT(slug) DO UPDATE SET name=excluded.name,is_active=excluded.is_active,is_system=excluded.is_system;
UPDATE gtjbticketing.profiles SET department_id=(SELECT id FROM gtjbticketing.departments WHERE slug='general') WHERE department_id IN (SELECT id FROM gtjbticketing.departments WHERE slug='initial-department');
UPDATE gtjbticketing.tickets SET department_id=(SELECT id FROM gtjbticketing.departments WHERE slug='general') WHERE department_id IN (SELECT id FROM gtjbticketing.departments WHERE slug='initial-department');
DELETE FROM gtjbticketing.departments WHERE slug='initial-department';
COMMIT;
