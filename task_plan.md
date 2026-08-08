# Task Plan: Internal Staff Ticketing System

**Goal:** Make the internal AI Department support platform production-ready end to end: every supported workflow must persist to Supabase, authorization must be enforced in the database and APIs, and the deployed application must pass live write/read verification without weakening the approved Get Blue interface.

**Architecture:** Next.js 14 App Router on Vercel, Supabase (PostgreSQL + Auth + Storage + Realtime + pgvector), Teams Webhooks, and Vercel AI SDK.

## Phases & Status

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Project Scaffolding & macOS Tailwind Tokens | complete |
| Phase 2 | Supabase Database Schema, RLS & Migrations | complete |
| Phase 3 | Domain Auth (`@gtmsw.com.my` & `@outlook.com`) | complete |
| Phase 4 | React Bits UI & macOS Glass Layout Shell | complete |
| Phase 5 | Ticket Creation, Security Scanner & Templates | complete |
| Phase 6 | Ticket Dashboard, Keyboard Shortcuts & Bulk Actions | complete |
| Phase 7 | Ticket Detail, Timeline, Internal Notes & Subtasks | complete |
| Phase 8 | AI Copilot & External App Log Ingestion API | complete |
| Phase 9 | Pinned Q&A Knowledge Base & Vector Search | complete |
| Phase 10| Admin Analytics Dashboard & PDF Export | complete |
| Phase 11 | Backend integrity audit: auth, schema, RLS, APIs, Storage, and production configuration | complete |
| Phase 12 | Database/auth/RLS/Storage remediation and secure migration | complete |
| Phase 13 | Client/server workflow authorization and error-handling remediation | complete |
| Phase 14 | Automated tests, local build, and security regression checks | complete |
| Phase 15 | Remote migration, production deployment, and live database smoke test | complete |

## Key Decisions & Constraints
- Domain Restrictions: `@gtmsw.com.my` (Full-time) and `@outlook.com` (Intern).
- Design Tokens: Matte black editorial surfaces (`#0a0a0c`, `#141416`), hairline grid dividers (`border-white/10`), slate-blue CTA (`#6a9bcc`), white editorial type, and monospace step metadata.
- RLS Policy: Internal notes restricted to `support_agent` and `admin`.
- Completion evidence: a successful build alone is insufficient; database mutations and role boundaries must be verified against the deployed Supabase/Vercel environment.

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| `@vercel/ai` not found | 1 | Replaced with package `ai` |
| Turbopack WASM build issue | 1 | Changed script to `next build --webpack` |
| Tailwind v4 PostCSS plugin move | 1 | Installed `@tailwindcss/postcss` and updated `postcss.config.mjs` |
| Out-File wildcard path with [id] | 1 | Passed `-LiteralPath` to PowerShell `Out-File` |
| Supabase CLI project listing requires authentication | 1 | No `SUPABASE_ACCESS_TOKEN` or CLI login is configured; continue local remediation and inspect alternative remote access before requesting credentials. |
| `/login` prerender failed because `useSearchParams` lacked Suspense | 1 | Read the callback error from `window.location.search` inside `useEffect`, avoiding a static-render bailout. |
| Local Supabase validation unavailable because Docker Desktop is not running | 1 | Use static SQL checks now; remote migration/lint will be the authoritative validation once project access is available. |
| ESLint 9 could not find a flat config | 1 | Added `eslint.config.mjs` using the installed Next.js 16 Core Web Vitals and TypeScript presets. |
| First full lint surfaced 62 legacy UI findings | 1 | Kept actionable Next.js rules, documented temporary exceptions for legacy `any` and intentional client hydration, and began fixing navigation/errors instead of suppressing the entire linter. |
| Supabase automatic login cannot run in the non-TTY tool process | 2 | Opened a visible interactive PowerShell window for the official Supabase CLI login; poll read-only project access after user confirmation. |
| Parallel `tsc` raced with `next build` regenerating `.next/types` | 1 | Build itself passed TypeScript; rerun standalone typecheck sequentially after build and keep these two checks non-concurrent. |
| Vercel ignore rule `supabase` also excluded `lib/supabase` | 1 | Anchor non-runtime exclusions to the repository root (`/supabase/`, `/tests/`) and redeploy; the existing production alias remained healthy. |
