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

## 4. Backend Integrity Audit — Verified Findings (2026-08-08)
- **[必须修复] Signup/profile persistence is broken by design:** the browser calls `profiles.upsert`, but `profiles` has no `INSERT` RLS policy. If email confirmation is enabled, signup also has no authenticated session, so a browser-side profile insert cannot be trusted or made reliable. Profile creation must move to an `auth.users` database trigger.
- **[必须修复] Ticket creation depends on the missing profile:** `tickets.author_id` references `profiles(id)`. A successful Auth signup without a profile therefore causes the subsequent ticket insert to fail its foreign key/RLS checks.
- **[必须修复] Comment data is horizontally exposed:** the current comments `SELECT` policy allows every non-internal comment without checking whether the caller can read the parent ticket.
- **[必须修复] Employee privilege escalation is possible:** ticket authors satisfy the broad `UPDATE` policy and can mutate status, assignee, subtasks, priority, or ownership through direct Supabase requests, regardless of what the UI hides.
- **[必须修复] External ingestion authentication is non-functional:** `/api/v1/tickets` only checks that the header starts with `Bearer `; any non-empty token passes. It also falls back from the service-role secret to the public anon key, which cannot bypass RLS and explains failed API inserts.
- **[必须修复] Storage is not provisioned in migration:** the client writes to `ticket-attachments`, but no bucket or object policies are created. Upload failure is silently converted to an inline data URL, which can bloat ticket descriptions and is not a valid durable upload strategy.
- **[必须修复] Internal identity data is publicly readable:** `profiles` uses `USING (true)`, exposing staff email, department, supervisor, and role to anonymous callers.
- **[必须修复] Audit/category tables have RLS enabled but no usable policies, and no trigger actually writes the promised immutable audit trail.**
- **[建议修改] Supabase helpers silently fall back to dummy credentials, hiding deployment misconfiguration instead of failing clearly.**
- Environment inspection found no process-level Supabase/Vercel management credentials; only a local `.env.production` file is present. Remote migration capability still needs explicit verification.
- Production Vercel has **zero configured environment variables**. The current deployment only works because `.env.production` is committed and consumed during the build; removing it before configuring Vercel would break production.
- Supabase Auth has email signup enabled, signup allowed, and `mailer_autoconfirm=false`. New users do not receive an authenticated session until email confirmation, making the current post-signup browser `profiles.upsert` definitively unauthenticated.
- Read-only REST probes confirm all seven expected tables exist remotely but currently contain zero visible rows. This means the migration was at least partially applied, while no successful application workflow has persisted data.
- **[必须修复] Admin and agent actions are UI-only:** `/admin/dashboard` performs no role check, ticket dashboard stores the Auth user rather than the profile role, and `C`/`M`/bulk mutations execute for any signed-in user. Current RLS also permits ticket authors to make those mutations.
- **[必须修复] Mutation errors are routinely discarded:** dashboard, ticket detail, FAQ, and incident handlers often await writes without checking `error`, then refresh or inject optimistic fallback data. This makes failed writes look successful to users.
- **[必须修复] AI helper endpoints are anonymous:** both heuristic endpoints accept unauthenticated POST requests, allowing public abuse and making support-only reply drafting callable by anyone.
- **[建议修改] Current profile joins use `select('*')`, unnecessarily returning email, supervisor, role, and other identity fields throughout the client. Queries should request only display fields required by the page.

## 5. Remediation Decisions
- Profile creation is now an Auth trigger transaction, with backfill for previously stranded Auth users. The first active corporate profile becomes the bootstrap admin; the final active admin cannot be demoted or suspended.
- External ingestion uses one-time generated, SHA-256-hashed database API keys, per-client 60/minute limiting, optional `Idempotency-Key`, reporter-domain validation, log redaction, and size limits. No service-role secret is required by Vercel.
- Attachments use a private bucket and a short-lived signed URL behind an authenticated application proxy; upload failures are surfaced instead of silently embedding Base64.
- New tickets, comments, status changes, and assignments create RLS-protected in-app notifications from database triggers so API-created tickets and direct database mutations cannot skip notification logic.
- Vercel environment variables are now configured in all three environments, allowing the tracked `.env.production` file to be removed safely.

## 6. Remote Verification Evidence
- The hardening migration is present remotely: `notifications`, `api_clients`, `profiles.account_status`, and ticket source fields all resolve through PostgREST.
- Anonymous security probes returned zero visible profiles, RLS `42501` for ticket insert, administrator rejection for API client creation, and SQLSTATE `28000` for an invalid ingestion key.
- Real Auth signups produced an active Outlook `employee` profile with supervisor metadata and an active GTMSW `admin` profile through the bootstrap rule.
- The reusable remote E2E verifier completed every assertion and printed `BACKEND_E2E_OK`; test-created tickets are soft-deleted, API keys revoked, and Storage objects removed in its cleanup phase.
