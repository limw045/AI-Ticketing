BEGIN;

INSERT INTO public.departments(id,name,slug,is_active,is_system)
VALUES ('164b1a2e-8ed8-4732-bd0b-c1fad46cc806','General','general',true,false)
ON CONFLICT(slug) DO UPDATE
SET name=excluded.name,is_active=true,is_system=false;

UPDATE public.profiles
SET department_id=(SELECT id FROM public.departments WHERE slug='general')
WHERE department_id IN (SELECT id FROM public.departments WHERE slug='initial-department');

UPDATE public.tickets
SET department_id=(SELECT id FROM public.departments WHERE slug='general')
WHERE department_id IN (SELECT id FROM public.departments WHERE slug='initial-department');

DELETE FROM public.departments WHERE slug='initial-department';

INSERT INTO gtjbticketing.departments(id,name,slug,is_active,is_system)
VALUES ('164b1a2e-8ed8-4732-bd0b-c1fad46cc806','General','general',true,false)
ON CONFLICT(slug) DO UPDATE
SET name=excluded.name,is_active=true,is_system=false;

UPDATE gtjbticketing.profiles
SET department_id=(SELECT id FROM gtjbticketing.departments WHERE slug='general')
WHERE department_id IN (SELECT id FROM gtjbticketing.departments WHERE slug='initial-department');

UPDATE gtjbticketing.tickets
SET department_id=(SELECT id FROM gtjbticketing.departments WHERE slug='general')
WHERE department_id IN (SELECT id FROM gtjbticketing.departments WHERE slug='initial-department');

DELETE FROM gtjbticketing.departments WHERE slug='initial-department';

COMMIT;
