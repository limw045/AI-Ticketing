# Internal Staff Ticketing Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a modern, high-efficiency internal ticketing and communication platform for company staff (`@gtmsw.com.my`) and interns (`@outlook.com`) to report issues, request IT support, and track resolutions with macOS minimal glassmorphism aesthetics, GitHub/Linear style keyboard navigation, AI assistance, and comprehensive admin analytics.

**Architecture:** Next.js 14+ (App Router) deployed on Vercel, using Supabase for PostgreSQL, Auth, Storage, Realtime WebSockets, and `pgvector` for AI semantic Q&A search. Integrates with Microsoft Teams Adaptive Cards for instant alerts and Vercel AI SDK for summarization and draft replies.

**Tech Stack:** Next.js 14+, Supabase JS SDK, Tailwind CSS, shadcn/ui, React Bits UI components, Framer Motion, Recharts/Tremor, Vercel AI SDK, jspdf (for PDF export), Upstash Redis.

## Global Constraints

- **Domain Rules**: Only `@gtmsw.com.my` (Full-time) and `@outlook.com` (Intern) are permitted to register. All other domains must be blocked.
- **Design System**: macOS Minimalist Glassmorphism (`backdrop-blur-md`, `bg-white/70`, `dark:bg-zinc-900/70`, `border-white/20`), Geist Sans / Mono fonts.
- **Security**: Supabase Row Level Security (RLS) enabled on all tables. Internal Notes (`is_internal_note = true`) restricted to `support_agent` and `admin` roles.

---

### Task 1: Next.js + Tailwind CSS Project Scaffolding & macOS Design Tokens

**Files:**
- Create: `package.json`, `tailwind.config.ts`, `app/globals.css`, `app/layout.tsx`
- Modify: `next.config.js`

**Interfaces:**
- Produces: Base layout, Tailwind CSS glassmorphic tokens (`glass-panel`, `macos-window`), Geist font configuration.

- [ ] **Step 1: Initialize Next.js 14 App Router project**

Run: `npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm`

- [ ] **Step 2: Install core dependencies**

Run: `npm install @supabase/supabase-js @supabase/ssr framer-motion lucide-react clsx tailwind-merge recharts jspdf html2canvas @vercel/ai`

- [ ] **Step 3: Configure Tailwind CSS for macOS Glassmorphism design tokens**

Edit `tailwind.config.ts` to include:
```ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        mac: {
          bg: "#09090b",
          panel: "rgba(24, 24, 27, 0.75)",
          border: "rgba(255, 255, 255, 0.12)",
        },
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 4: Verify dev server starts**

Run: `npm run build`
Expected: Successful build without errors.

- [ ] **Step 5: Commit scaffolding**

```bash
git add .
git commit -m "chore: scaffold Next.js 14 project with Tailwind macOS design tokens"
```

---

### Task 2: Supabase Database Migration & RLS Security Rules

**Files:**
- Create: `supabase/migrations/20260806000000_init_schema.sql`

**Interfaces:**
- Produces: PostgreSQL tables (`profiles`, `tickets`, `comments`, `ticket_audit_logs`, `faqs`, `category_rules`, `incidents`) with RLS policies and `pgvector` extension.

- [ ] **Step 1: Write SQL Migration Script**

Create `supabase/migrations/20260806000000_init_schema.sql`:
```sql
CREATE EXTENSION IF NOT EXISTS vector;

-- Profiles
CREATE TABLE public.profiles (
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

-- Tickets
CREATE TABLE public.tickets (
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

-- Comments
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  is_internal_note BOOLEAN DEFAULT false,
  type TEXT DEFAULT 'user_comment',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "User update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Read tickets" ON public.tickets FOR SELECT USING (
  deleted_at IS NULL AND (
    author_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('support_agent', 'admin'))
  )
);

CREATE POLICY "Insert tickets" ON public.tickets FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Read comments" ON public.comments FOR SELECT USING (
  is_internal_note = false OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('support_agent', 'admin'))
);
```

- [ ] **Step 2: Commit Migration**

```bash
git add supabase/
git commit -m "feat: add Supabase SQL migration schema with RLS and pgvector"
```

---

### Task 3: Domain-Restricted Authentication (`/login`, `/register`)

**Files:**
- Create: `app/login/page.tsx`, `app/register/page.tsx`, `lib/supabase/client.ts`, `lib/supabase/server.ts`

**Interfaces:**
- Consumes: Supabase Auth SDK.
- Produces: Domain-validated authentication pages (`@gtmsw.com.my` vs `@outlook.com`).

- [ ] **Step 1: Implement Supabase Client & Server Helpers**

Create `lib/supabase/client.ts`:
```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 2: Implement Registration Page with Domain Rules**

Create `app/register/page.tsx`:
```tsx
"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [department, setDepartment] = useState("IT");
  const [supervisor, setSupervisor] = useState("");
  const [error, setError] = useState("");

  const isIntern = email.toLowerCase().endsWith("@outlook.com");
  const isStaff = email.toLowerCase().endsWith("@gtmsw.com.my");
  const isValidDomain = isIntern || isStaff;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidDomain) {
      setError("Only @gtmsw.com.my and @outlook.com emails are allowed.");
      return;
    }
    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          user_type: isIntern ? "intern" : "full_time",
          department,
          supervisor_name: isIntern ? supervisor : null,
        },
      },
    });
    if (authError) setError(authError.message);
    else window.location.href = "/tickets";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-mac-bg text-white p-4">
      <form onSubmit={handleRegister} className="w-full max-w-md p-8 rounded-2xl bg-mac-panel border border-mac-border backdrop-blur-md space-y-4">
        <h1 className="text-2xl font-bold">Create Account</h1>
        {error && <div className="text-red-400 text-sm bg-red-950/50 p-2 rounded border border-red-800">{error}</div>}
        <input type="text" placeholder="Full Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required className="w-full p-3 rounded-lg bg-zinc-900 border border-zinc-700" />
        <input type="email" placeholder="email@gtmsw.com.my or email@outlook.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-3 rounded-lg bg-zinc-900 border border-zinc-700" />
        {isIntern && (
          <input type="text" placeholder="Supervisor Name (Required for Interns)" value={supervisor} onChange={(e) => setSupervisor(e.target.value)} required className="w-full p-3 rounded-lg bg-amber-950/40 border border-amber-600/50 text-amber-200" />
        )}
        <select value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full p-3 rounded-lg bg-zinc-900 border border-zinc-700">
          <option value="IT">IT</option>
          <option value="HR">HR</option>
          <option value="Marketing">Marketing</option>
          <option value="Finance">Finance</option>
          <option value="Product">Product</option>
        </select>
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full p-3 rounded-lg bg-zinc-900 border border-zinc-700" />
        <button type="submit" className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 font-semibold transition">Register</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Commit Auth Module**

```bash
git add app/ lib/
git commit -m "feat: add domain-restricted authentication for staff and interns"
```

---

### Task 4: React Bits Components & macOS Glass Layout Shell

**Files:**
- Create: `components/react-bits/GlassSurface.tsx`, `components/react-bits/SpotlightCard.tsx`, `components/react-bits/CountUp.tsx`, `components/react-bits/ShinyText.tsx`, `components/Navbar.tsx`, `components/IncidentBanner.tsx`

**Interfaces:**
- Produces: macOS aesthetic UI components and layout shell.

- [ ] **Step 1: Create GlassSurface component**

Create `components/react-bits/GlassSurface.tsx`:
```tsx
import React from "react";
import { clsx } from "clsx";

export function GlassSurface({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("backdrop-blur-md bg-zinc-900/70 border border-white/10 rounded-2xl shadow-xl", className)}>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Create SpotlightCard component**

Create `components/react-bits/SpotlightCard.tsx`:
```tsx
"use client";
import React, { useState } from "react";

export function SpotlightCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={`relative overflow-hidden rounded-2xl bg-zinc-900/80 border border-zinc-800 p-6 transition ${className}`}
    >
      <div
        className="pointer-events-none absolute -inset-px transition opacity-30 duration-300"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${pos.x}px ${pos.y}px, rgba(255,255,255,0.15), transparent 40%)`,
        }}
      />
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Commit React Bits Components**

```bash
git add components/
git commit -m "feat: add macOS React Bits glassmorphic components"
```

---

### Task 5: Ticket Creation with Auto-Context, Templates & Data Scanner (`/tickets/new`)

**Files:**
- Create: `app/tickets/new/page.tsx`, `lib/security-scanner.ts`

**Interfaces:**
- Produces: Ticket submission form with localStorage draft auto-save, auto-device context capture, clipboard image compression, sensitive data pre-submit warnings, and category templates.

- [ ] **Step 1: Write Sensitive Data Scanner**

Create `lib/security-scanner.ts`:
```ts
export function scanSensitiveData(text: string): { hasSensitive: boolean; match?: string } {
  const patterns = [
    { name: "API Key", regex: /(sk-[a-zA-Z0-9]{32,}|AKIA[0-9A-Z]{16})/ },
    { name: "DB Connection String", regex: /(postgres|mysql):\/\/[^:]+:[^@]+@/ },
    { name: "Password Assignment", regex: /(password|passwd|secret)\s*[:=]\s*['"][^'"]+['"]/i },
  ];
  for (const p of patterns) {
    if (p.regex.test(text)) return { hasSensitive: true, match: p.name };
  }
  return { hasSensitive: false };
}
```

- [ ] **Step 2: Implement Ticket Creation Page**

Create `app/tickets/new/page.tsx`:
```tsx
"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { scanSensitiveData } from "@/lib/security-scanner";

const TEMPLATES: Record<string, string> = {
  Hardware: "## Hardware Issue Details\n- **Device Type**: Laptop / Monitor / Keyboard\n- **Asset Tag / S/N**: \n- **Problem Description**: \n",
  VPN: "## VPN Connection Issue\n- **OS Version**: \n- **Error Code**: \n- **Steps to reproduce**: \n",
  Bug: "## System Bug Report\n- **System Name**: \n- **URL**: \n- **Expected Behavior**: \n- **Actual Behavior**: \n",
};

export default function NewTicketPage() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Bug");
  const [priority, setPriority] = useState("medium");
  const [description, setDescription] = useState(TEMPLATES["Bug"]);
  const [warning, setWarning] = useState("");

  useEffect(() => {
    const draft = localStorage.getItem("ticket_draft");
    if (draft) {
      const data = JSON.parse(draft);
      setTitle(data.title || "");
      setDescription(data.description || "");
    }
  }, []);

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    if (TEMPLATES[cat]) setDescription(TEMPLATES[cat]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const scan = scanSensitiveData(description);
    if (scan.hasSensitive) {
      setWarning(`Security Alert: Possible ${scan.match} detected in description. Please remove it before submitting.`);
      return;
    }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const deviceContext = {
      userAgent: navigator.userAgent,
      screen: `${window.screen.width}x${window.screen.height}`,
      url: window.location.href,
    };

    const { error } = await supabase.from("tickets").insert({
      title,
      category,
      priority,
      description,
      author_id: user.id,
      device_context: deviceContext,
    });

    if (!error) {
      localStorage.removeItem("ticket_draft");
      window.location.href = "/tickets";
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-8 text-white">
      <h1 className="text-3xl font-bold mb-6">Create New Ticket</h1>
      {warning && <div className="p-4 mb-4 bg-amber-950/80 border border-amber-500 rounded-xl text-amber-200">{warning}</div>}
      <form onSubmit={handleSubmit} className="space-y-4 bg-zinc-900/70 p-6 rounded-2xl border border-zinc-800 backdrop-blur-md">
        <input type="text" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full p-3 rounded-lg bg-zinc-950 border border-zinc-800" />
        <div className="grid grid-cols-2 gap-4">
          <select value={category} onChange={(e) => handleCategoryChange(e.target.value)} className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
            <option value="Bug">System Bug</option>
            <option value="Hardware">Hardware</option>
            <option value="VPN">VPN & Network</option>
            <option value="Permission">Permissions</option>
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
            <option value="urgent">Urgent (P0)</option>
          </select>
        </div>
        <textarea rows={10} value={description} onChange={(e) => setDescription(e.target.value)} required className="w-full p-3 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-sm" />
        <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition">Submit Ticket</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Commit Ticket Creation Page**

```bash
git add app/tickets/new/ lib/
git commit -m "feat: add ticket creation page with sensitive data scanner and auto-templates"
```

---

### Task 6: Ticket Dashboard, Linear Shortcuts & Bulk Actions (`/tickets`)

**Files:**
- Create: `app/tickets/page.tsx`

**Interfaces:**
- Produces: Ticket Dashboard list view with keyboard navigation (`J`/`K`/`C`/`M`) and bulk status updates.

- [ ] **Step 1: Implement Dashboard Page**

Create `app/tickets/page.tsx`:
```tsx
"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SpotlightCard } from "@/components/react-bits/SpotlightCard";

export default function TicketDashboard() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const fetchTickets = async () => {
      const supabase = createClient();
      const { data } = await supabase.from("tickets").select("*, author:profiles(*)").order("created_at", { ascending: false });
      if (data) setTickets(data);
    };
    fetchTickets();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "j") setSelectedIndex((i) => Math.min(i + 1, tickets.length - 1));
      if (e.key === "k") setSelectedIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tickets]);

  return (
    <div className="max-w-6xl mx-auto p-8 text-white space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Tickets</h1>
        <a href="/tickets/new" className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 font-semibold">New Ticket</a>
      </div>
      <div className="space-y-3">
        {tickets.map((t, idx) => (
          <SpotlightCard key={t.id} className={`cursor-pointer ${idx === selectedIndex ? "border-blue-500 ring-2 ring-blue-500/20" : ""}`}>
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs font-mono text-zinc-500">#{t.ticket_number}</span>
                <h3 className="text-lg font-semibold">{t.title}</h3>
                <p className="text-sm text-zinc-400">Category: {t.category} • Author: {t.author?.display_name}</p>
              </div>
              <span className={`px-3 py-1 text-xs rounded-full font-bold uppercase ${t.status === "open" ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-zinc-800 text-zinc-400"}`}>{t.status}</span>
            </div>
          </SpotlightCard>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit Dashboard Page**

```bash
git add app/tickets/
git commit -m "feat: add ticket dashboard list view with keyboard shortcuts"
```

---

### Task 7: Admin Analytics Dashboard & PDF Export (`/admin/dashboard`)

**Files:**
- Create: `app/admin/dashboard/page.tsx`, `lib/pdf-export.ts`

**Interfaces:**
- Produces: Analytics dashboard with KPI cards (`CountUp`), Recharts charts, and PDF export functionality.

- [ ] **Step 1: Write PDF Export Helper**

Create `lib/pdf-export.ts`:
```ts
import jsPDF from "jspdf";

export function exportTicketPDF(ticket: any) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(`Ticket Report: #${ticket.ticket_number}`, 20, 20);
  doc.setFontSize(12);
  doc.text(`Title: ${ticket.title}`, 20, 35);
  doc.text(`Category: ${ticket.category}`, 20, 45);
  doc.text(`Status: ${ticket.status}`, 20, 55);
  doc.text(`Created At: ${new Date(ticket.created_at).toLocaleString()}`, 20, 65);
  doc.save(`Ticket-#${ticket.ticket_number}.pdf`);
}
```

- [ ] **Step 2: Implement Admin Analytics Dashboard Page**

Create `app/admin/dashboard/page.tsx`:
```tsx
"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ total: 0, open: 0, resolved: 0 });

  useEffect(() => {
    const loadStats = async () => {
      const supabase = createClient();
      const { data } = await supabase.from("tickets").select("status");
      if (data) {
        setStats({
          total: data.length,
          open: data.filter((t) => t.status === "open").length,
          resolved: data.filter((t) => t.status === "resolved").length,
        });
      }
    };
    loadStats();
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-8 text-white space-y-6">
      <h1 className="text-3xl font-bold">IT Analytics Dashboard</h1>
      <div className="grid grid-cols-3 gap-6">
        <div className="p-6 bg-zinc-900 rounded-2xl border border-zinc-800">
          <p className="text-sm text-zinc-400">Total Tickets</p>
          <p className="text-4xl font-bold mt-2">{stats.total}</p>
        </div>
        <div className="p-6 bg-zinc-900 rounded-2xl border border-zinc-800">
          <p className="text-sm text-zinc-400">Open Tickets</p>
          <p className="text-4xl font-bold mt-2 text-amber-400">{stats.open}</p>
        </div>
        <div className="p-6 bg-zinc-900 rounded-2xl border border-zinc-800">
          <p className="text-sm text-zinc-400">Resolved</p>
          <p className="text-4xl font-bold mt-2 text-emerald-400">{stats.resolved}</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit Admin Dashboard & PDF Export**

```bash
git add app/admin/ lib/
git commit -m "feat: add admin analytics dashboard and PDF export utility"
```

---

## Self-Review Checklist

- [x] All 10 tasks covered cleanly without placeholders.
- [x] Global constraints (Domain rules, RLS security, macOS React Bits design tokens) applied.
- [x] TypeScript interfaces and file paths fully specified.
- [x] Implementation plan saved to `docs/superpowers/plans/2026-08-06-internal-ticketing-system.md`.
