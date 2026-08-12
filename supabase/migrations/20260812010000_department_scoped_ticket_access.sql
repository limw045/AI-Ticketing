-- Controlled department directory and department-scoped ticket visibility.

CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 120),
  slug TEXT UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.departments(name, slug, is_system)
VALUES
  ('AI & Automation Transformation', 'ai-automation-transformation', false),
  ('AUDIT', 'audit', false),
  ('Indirect Tax & Admin', 'indirect-tax-admin', false),
  ('M.S.WONG & CO', 'ms-wong-co', false),
  ('RockAcc', 'rockacc', false),
  ('TAX', 'tax', false),
  ('TYM', 'tym', false),
  ('HR', 'hr', false),
  ('Secretary', 'secretary', false),
  ('IT', 'it', false),
  ('System Integrations', 'system-integrations', true)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id);
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id);

CREATE OR REPLACE FUNCTION public.sync_profile_department()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  matched public.departments%ROWTYPE;
BEGIN
  IF NEW.department_id IS NOT NULL THEN
    SELECT * INTO matched FROM public.departments WHERE id = NEW.department_id;
  ELSE
    SELECT * INTO matched
    FROM public.departments
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
$$;

DROP TRIGGER IF EXISTS sync_profile_department_before_write ON public.profiles;
CREATE TRIGGER sync_profile_department_before_write
  BEFORE INSERT OR UPDATE OF department_id, department ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_department();

UPDATE public.profiles p
SET department_id = d.id
FROM public.departments d
WHERE p.department_id IS NULL
  AND d.slug = CASE
    WHEN trim(p.department) IN ('AI Department', 'General', 'AI & Automation Transformation')
      THEN 'ai-automation-transformation'
    WHEN trim(p.department) = 'AUDIT' THEN 'audit'
    WHEN trim(p.department) = 'Indirect Tax & Admin' THEN 'indirect-tax-admin'
    WHEN trim(p.department) = 'M.S.WONG & CO' THEN 'ms-wong-co'
    WHEN trim(p.department) = 'RockAcc' THEN 'rockacc'
    WHEN trim(p.department) = 'TAX' THEN 'tax'
    WHEN trim(p.department) = 'TYM' THEN 'tym'
    WHEN trim(p.department) = 'HR' THEN 'hr'
    WHEN trim(p.department) = 'Secretary' THEN 'secretary'
    WHEN trim(p.department) = 'IT' THEN 'it'
    ELSE 'ai-automation-transformation'
  END;

UPDATE public.tickets t
SET department_id = COALESCE(
  (SELECT p.department_id FROM public.profiles p WHERE p.id = t.author_id),
  (SELECT d.id FROM public.departments d WHERE d.slug = 'system-integrations')
)
WHERE t.department_id IS NULL;

CREATE OR REPLACE FUNCTION public.set_ticket_department_snapshot()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.department_id IS NULL THEN
    SELECT p.department_id INTO NEW.department_id
    FROM public.profiles p WHERE p.id = NEW.author_id;
    IF NEW.department_id IS NULL THEN
      SELECT d.id INTO NEW.department_id
      FROM public.departments d WHERE d.slug = 'system-integrations';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_ticket_department_before_insert ON public.tickets;
CREATE TRIGGER set_ticket_department_before_insert
  BEFORE INSERT ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_ticket_department_snapshot();

CREATE TABLE IF NOT EXISTS public.ticket_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path TEXT UNIQUE NOT NULL,
  uploader_id UUID NOT NULL REFERENCES public.profiles(id),
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('image', 'log')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active departments read" ON public.departments;
CREATE POLICY "Active departments read" ON public.departments FOR SELECT TO anon, authenticated
  USING ((is_active AND NOT is_system) OR public.current_user_role() = 'super_admin');
DROP POLICY IF EXISTS "Super admins manage departments" ON public.departments;
CREATE POLICY "Super admins manage departments" ON public.departments FOR ALL TO authenticated
  USING (public.is_active_user() AND public.current_user_role() = 'super_admin')
  WITH CHECK (public.is_active_user() AND public.current_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Visible tickets read" ON public.tickets;
CREATE POLICY "Department tickets read" ON public.tickets FOR SELECT TO authenticated
  USING (
    public.is_active_user() AND (
      (tickets.deleted_at IS NULL AND (
        tickets.author_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles viewer
          WHERE viewer.id = auth.uid()
            AND viewer.department_id = tickets.department_id
            AND viewer.account_status = 'active'
            AND viewer.deleted_at IS NULL
        )
      ))
      OR public.current_user_role() IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Visible comments read" ON public.comments;
CREATE POLICY "Department public comments read" ON public.comments FOR SELECT TO authenticated
  USING (
    public.is_active_user() AND comments.deleted_at IS NULL AND (
      public.current_user_role() IN ('admin', 'super_admin')
      OR (
        NOT comments.is_internal_note
        AND EXISTS (
          SELECT 1 FROM public.tickets t
          JOIN public.profiles viewer ON viewer.id = auth.uid()
          WHERE t.id = comments.ticket_id
            AND t.deleted_at IS NULL
            AND (t.author_id = auth.uid() OR viewer.department_id = t.department_id)
        )
      )
    )
  );

DROP POLICY IF EXISTS "Visible comments insert" ON public.comments;
CREATE POLICY "Authors insert public comments" ON public.comments FOR INSERT TO authenticated
  WITH CHECK (
    public.is_active_user() AND comments.author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = comments.ticket_id AND t.deleted_at IS NULL
        AND (t.author_id = auth.uid() OR public.current_user_role() IN ('admin', 'super_admin'))
    )
    AND (NOT comments.is_internal_note OR public.current_user_role() IN ('admin', 'super_admin'))
  );

CREATE POLICY "Attachment metadata insert" ON public.ticket_attachments FOR INSERT TO authenticated
  WITH CHECK (public.is_active_user() AND uploader_id = auth.uid() AND ticket_id IS NULL);
CREATE POLICY "Attachment metadata read" ON public.ticket_attachments FOR SELECT TO authenticated
  USING (
    public.is_active_user() AND (
      (ticket_id IS NULL AND uploader_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id AND t.deleted_at IS NULL)
      OR public.current_user_role() IN ('admin', 'super_admin')
    )
  );
CREATE POLICY "Draft attachment delete" ON public.ticket_attachments FOR DELETE TO authenticated
  USING (public.is_active_user() AND uploader_id = auth.uid() AND ticket_id IS NULL);
CREATE POLICY "Uploader binds draft attachment" ON public.ticket_attachments FOR UPDATE TO authenticated
  USING (public.is_active_user() AND uploader_id = auth.uid() AND ticket_id IS NULL)
  WITH CHECK (
    uploader_id = auth.uid() AND ticket_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_id AND t.author_id = auth.uid() AND t.deleted_at IS NULL
    )
  );

DROP TRIGGER IF EXISTS audit_admin_department_change ON public.departments;
CREATE TRIGGER audit_admin_department_change
  AFTER INSERT OR UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_resource_change();

CREATE INDEX IF NOT EXISTS profiles_department_idx ON public.profiles(department_id);
CREATE INDEX IF NOT EXISTS tickets_department_active_idx ON public.tickets(department_id, deleted_at, created_at DESC);
CREATE INDEX IF NOT EXISTS ticket_attachments_ticket_idx ON public.ticket_attachments(ticket_id);
