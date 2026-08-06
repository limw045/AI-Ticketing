# Findings & Architecture Discoveries

## 1. Project Context & Design System
- **Theme**: macOS Minimalist Translucent Glassmorphism.
- **Color Palette**: Dark Zinc (`#09090b`), Panel Translucency (`rgba(24,24,27,0.75)`), Translucent White Border (`rgba(255,255,255,0.12)`).
- **React Bits Components**: `GlassSurface`, `SpotlightCard`, `ShinyText`, `BlurText`, `CountUp`, `Dock`.

## 2. Authentication & Roles
- Staff Email: `@gtmsw.com.my` -> Role: Full-Time
- Intern Email: `@outlook.com` -> Role: Intern (Requires Supervisor Name)
- Public Emails: Blocked at API level.

## 3. Security & Row Level Security (RLS)
- Internal Notes (`is_internal_note = true`) isolated via Supabase RLS policies.
- Audit Trail: Immutable system logs recorded in `ticket_audit_logs`.
