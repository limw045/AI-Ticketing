# Task Plan: Internal Staff Ticketing System

**Goal:** Build a production-ready, high-efficiency internal staff ticketing platform using Next.js 14+, Supabase, Tailwind CSS with macOS Minimalist Glassmorphism aesthetic, React Bits UI components, AI vector search, and admin analytics.

**Architecture:** Next.js 14 App Router on Vercel, Supabase (PostgreSQL + Auth + Storage + Realtime + pgvector), Teams Webhooks, and Vercel AI SDK.

## Phases & Status

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Project Scaffolding & macOS Tailwind Tokens | pending |
| Phase 2 | Supabase Database Schema, RLS & Migrations | pending |
| Phase 3 | Domain Auth (`@gtmsw.com.my` & `@outlook.com`) | pending |
| Phase 4 | React Bits UI & macOS Glass Layout Shell | pending |
| Phase 5 | Ticket Creation, Security Scanner & Templates | pending |
| Phase 6 | Ticket Dashboard, Keyboard Shortcuts & Bulk Actions | pending |
| Phase 7 | Ticket Detail, Timeline, Internal Notes & Subtasks | pending |
| Phase 8 | AI Copilot & External App Log Ingestion API | pending |
| Phase 9 | Pinned Q&A Knowledge Base & Vector Search | pending |
| Phase 10| Admin Analytics Dashboard & PDF Export | pending |

## Key Decisions & Constraints
- Domain Restrictions: `@gtmsw.com.my` (Full-time) and `@outlook.com` (Intern).
- Design Tokens: Translucent glassmorphism (`backdrop-blur-md`, `bg-white/70`, `dark:bg-zinc-900/70`, `border-white/20`).
- RLS Policy: Internal notes restricted to `support_agent` and `admin`.

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
