-- Enable vector extension for AI semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('full_time', 'intern', 'contractor')),
  department TEXT NOT NULL,
  supervisor_name TEXT,
  role TEXT DEFAULT 'employee' CHECK (role IN ('employee', 'support_agent', 'admin')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tickets Table
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number SERIAL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  category TEXT NOT NULL,
  author_id UUID REFERENCES public.profiles(id),
  assignee_id UUID REFERENCES public.profiles(id),
  is_pinned BOOLEAN DEFAULT false,
  pin_order INT DEFAULT 0,
  subtasks JSONB DEFAULT '[]'::jsonb,
  device_context JSONB,
  system_logs JSONB,
  ai_summary TEXT,
  first_responded_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Comments Table
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  is_internal_note BOOLEAN DEFAULT false,
  type TEXT DEFAULT 'user_comment' CHECK (type IN ('user_comment', 'system_audit')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Ticket Audit Logs Table
CREATE TABLE IF NOT EXISTS public.ticket_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. FAQs Table (Knowledge Base with Vector Embedding)
CREATE TABLE IF NOT EXISTS public.faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL,
  embedding VECTOR(1536),
  is_pinned BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Category Rules Table
CREATE TABLE IF NOT EXISTS public.category_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name TEXT UNIQUE NOT NULL,
  template_markdown TEXT,
  default_assignee_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Global Incidents / Outage Banners Table
CREATE TABLE IF NOT EXISTS public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Profiles
CREATE POLICY "Public profiles read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Profile self update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for Tickets
CREATE POLICY "Tickets read access" ON public.tickets FOR SELECT USING (
  deleted_at IS NULL AND (
    author_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('support_agent', 'admin'))
  )
);
CREATE POLICY "Tickets insert access" ON public.tickets FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Tickets update access" ON public.tickets FOR UPDATE USING (
  author_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('support_agent', 'admin'))
);

-- RLS Policies for Comments (Internal Notes Isolation)
CREATE POLICY "Comments read access" ON public.comments FOR SELECT USING (
  is_internal_note = false OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('support_agent', 'admin'))
);
CREATE POLICY "Comments insert access" ON public.comments FOR INSERT WITH CHECK (auth.uid() = author_id);

-- RLS Policies for FAQs & Incidents
CREATE POLICY "Public FAQs read" ON public.faqs FOR SELECT USING (true);
CREATE POLICY "Admin FAQs write" ON public.faqs FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('support_agent', 'admin'))
);

CREATE POLICY "Public Incidents read" ON public.incidents FOR SELECT USING (true);
CREATE POLICY "Admin Incidents write" ON public.incidents FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('support_agent', 'admin'))
);
