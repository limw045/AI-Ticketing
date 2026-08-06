# Task Plan: Internal Staff Ticketing System

**Goal:** Build a production-ready, high-efficiency internal staff ticketing platform using Next.js 14+, Supabase, Tailwind CSS with macOS Minimalist Glassmorphism aesthetic, React Bits UI components, AI vector search, and admin analytics.

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

## Key Decisions & Constraints
- Domain Restrictions: `@gtmsw.com.my` (Full-time) and `@outlook.com` (Intern).
- Design Tokens: Translucent glassmorphism (`backdrop-blur-md`, `bg-white/70`, `dark:bg-zinc-900/70`, `border-white/20`).
- RLS Policy: Internal notes restricted to `support_agent` and `admin`.

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| `@vercel/ai` not found | 1 | Replaced with package `ai` |
| Turbopack WASM build issue | 1 | Changed script to `next build --webpack` |
| Tailwind v4 PostCSS plugin move | 1 | Installed `@tailwindcss/postcss` and updated `postcss.config.mjs` |
| Out-File wildcard path with [id] | 1 | Passed `-LiteralPath` to PowerShell `Out-File` |
