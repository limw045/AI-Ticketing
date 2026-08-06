# Technical Design Specification: Internal Staff Ticketing Platform

**Date:** 2026-08-06  
**Status:** Approved  
**Deployment Target:** Vercel  

---

## 1. Overview & Objectives

The goal of this project is to build a modern, high-efficiency internal ticketing and communication platform for company staff (`@gtmsw.com.my`) and interns (`@outlook.com`) to report issues, request IT support, and track resolutions.

The platform combines developer-grade polish (GitHub/Linear inspired timeline & keyboard shortcuts), **macOS Minimalist Glassmorphism Aesthetic** (powered by React Bits components), Markdown support, drag-and-drop clipboard image uploads, Microsoft Teams integration, a Pinned Q&A Knowledge Base with Semantic Vector Search, Category Issue Templates, Auto-Routing Rules, Sub-task Checklists, Admin Analytics Dashboard, Global Outage Banners, External App API Log Ingestion, AI Assist, Sensitive Data Masking, and PDF Compliance Export.

---

## 2. Technical Stack & Design System

* **Frontend & API**: Next.js 14+ (App Router, Server Actions, React Email)
* **Backend as a Service**: Supabase (PostgreSQL Database, Supabase Auth, Supabase Storage, Supabase Realtime, pgvector for semantic Q&A search)
* **UI & Aesthetics (macOS Minimal Style)**:
  * **Design Tokens**: macOS Translucent Frosted Glass (`backdrop-blur-md bg-white/70 dark:bg-zinc-900/70 border-white/20`), Subtle Radius (`rounded-xl`), Soft Ambient Drop Shadows.
  * **Typography**: Geist Sans / SF Pro Display & Geist Mono.
  * **React Bits UI Components**:
    * `GlassSurface` / `FluidGlass`: Translucent macOS window panels & floating headers.
    * `Dock`: Floating macOS-style navigation dock for quick filter switching.
    * `SpotlightCard`: Interactive mouse-following spotlight glow on ticket & stats cards.
    * `CountUp`: Animated numerical counter on Analytics KPI metrics.
    * `BlurText`: Smooth blur-in animation on section headers.
    * `ShinyText`: Subtle shimmer effect on Urgent P0 badges & primary submit CTA buttons.
* **AI Engine**: Vercel AI SDK (OpenAI / Claude API for Ticket Summarization, Draft Reply Generation & Vector Embeddings)
* **Integrations & Queue**: Microsoft Teams (Incoming Webhooks / Adaptive Cards), Resend/Nodemailer, Upstash Redis / Vercel Queue (for async Webhook retries & rate-limiting)
* **Hosting**: Vercel

---

## 3. Authentication, Domain Rules & API Ingestion

### 3.1 Domain & Role Rules
1. **Full-time Staff (`@gtmsw.com.my`)**
   - Automatically assigned `user_type: full_time`.
   - Requires department selection during registration.
2. **Interns & Contractors (`@outlook.com`)**
   - Automatically assigned `user_type: intern`.
   - Requires department selection + supervisor name during registration.
3. **Account Migration Handling**: Supporting email/domain migration (e.g., Intern converting to Full-time staff) via Supabase Auth admin API while maintaining foreign key integrity (`author_id`).
4. **Other Public Domains (`@gmail.com`, `@qq.com`, etc.)**
   - Strictly rejected at authentication/registration API level.

### 3.2 User Roles (`profiles.role`)
- `employee`: Standard ticket creator. Can view/comment on own tickets and browse Pinned Q&A.
- `support_agent`: IT / Support staff. Can be assigned tickets, change statuses, post internal notes, use bulk actions, and manage FAQs.
- `admin`: Full administrative access to manage users, labels, categories, FAQ pinning, outage banners, auto-routing rules, and view the Analytics Dashboard.

### 3.3 External App Integration (`/api/v1/tickets`)
Internal applications can submit tickets programmatically via API Key authentication:
- Accepts JSON payload with `title`, `description`, `category`, `user_email`, and `system_logs` (error stack trace, app version, runtime state).
- **Payload Truncation & Sanitization Middleware**: Maximum 50KB payload limit for `system_logs`.
- **Rate-Limiting**: Max 60 requests/min per API Key to prevent loop spam.

---

## 4. Database Schema (PostgreSQL via Supabase)

### 4.1 `profiles` Table
| Column | Type | Constraints / Description |
|---|---|---|
| `id` | UUID | PRIMARY KEY, REFERENCES `auth.users(id)` ON DELETE CASCADE |
| `email` | TEXT | UNIQUE, NOT NULL |
| `display_name` | TEXT | NOT NULL |
| `user_type` | TEXT | ENUM: `'full_time'`, `'intern'`, `'contractor'` |
| `department` | TEXT | NOT NULL (e.g., `'IT'`, `'HR'`, `'Marketing'`, `'Finance'`) |
| `supervisor_name`| TEXT | NULLABLE (Required for interns) |
| `role` | TEXT | DEFAULT `'employee'` (ENUM: `'employee'`, `'support_agent'`, `'admin'`) |
| `avatar_url` | TEXT | NULLABLE |
| `created_at` | TIMESTAMPTZ | DEFAULT `now()` |

### 4.2 `tickets` Table
| Column | Type | Constraints / Description |
|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` |
| `ticket_number` | SERIAL | AUTO-INCREMENT (e.g., #1001) |
| `title` | TEXT | NOT NULL |
| `description` | TEXT | NOT NULL (Markdown content) |
| `status` | TEXT | DEFAULT `'open'` (ENUM: `'open'`, `'in_progress'`, `'resolved'`, `'closed'`) |
| `priority` | TEXT | DEFAULT `'medium'` (ENUM: `'low'`, `'medium'`, `'high'`, `'urgent'`) |
| `category` | TEXT | NOT NULL |
| `author_id` | UUID | REFERENCES `profiles(id)` |
| `assignee_id` | UUID | NULLABLE, REFERENCES `profiles(id)` |
| `is_pinned` | BOOLEAN | DEFAULT `false` |
| `pin_order` | INT | DEFAULT `0` |
| `subtasks` | JSONB | NULLABLE (List of `[{ id, title, completed }]`) |
| `device_context` | JSONB | NULLABLE |
| `system_logs` | TEXT / JSONB | NULLABLE |
| `ai_summary` | TEXT | NULLABLE |
| `first_responded_at`| TIMESTAMPTZ | NULLABLE |
| `resolved_at` | TIMESTAMPTZ | NULLABLE |
| `deleted_at` | TIMESTAMPTZ | NULLABLE |
| `created_at` | TIMESTAMPTZ | DEFAULT `now()` |
| `updated_at` | TIMESTAMPTZ | DEFAULT `now()` |

### 4.3 `comments` Table
| Column | Type | Constraints / Description |
|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` |
| `ticket_id` | UUID | REFERENCES `tickets(id)` ON DELETE CASCADE |
| `author_id` | UUID | REFERENCES `profiles(id)` |
| `content` | TEXT | NOT NULL |
| `is_internal_note` | BOOLEAN | DEFAULT `false` |
| `type` | TEXT | DEFAULT `'user_comment'` |
| `created_at` | TIMESTAMPTZ | DEFAULT `now()` |

### 4.4 `ticket_audit_logs` Table
| Column | Type | Constraints / Description |
|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` |
| `ticket_id` | UUID | REFERENCES `tickets(id)` ON DELETE CASCADE |
| `actor_id` | UUID | REFERENCES `profiles(id)` |
| `action` | TEXT | NOT NULL |
| `old_value` | TEXT | NULLABLE |
| `new_value` | TEXT | NULLABLE |
| `created_at` | TIMESTAMPTZ | DEFAULT `now()` |

### 4.5 `faqs` Table (With Vector Embeddings)
| Column | Type | Constraints / Description |
|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` |
| `question` | TEXT | NOT NULL |
| `answer` | TEXT | NOT NULL |
| `category` | TEXT | NOT NULL |
| `embedding` | VECTOR(1536)| NULLABLE (pgvector embedding for AI semantic search) |
| `is_pinned` | BOOLEAN | DEFAULT `true` |
| `created_by` | UUID | REFERENCES `profiles(id)` |
| `created_at` | TIMESTAMPTZ | DEFAULT `now()` |

### 4.6 `category_rules` Table (Auto-Routing & Templates)
| Column | Type | Constraints / Description |
|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` |
| `category_name` | TEXT | UNIQUE, NOT NULL |
| `template_markdown`| TEXT | NULLABLE |
| `default_assignee_id`| UUID | NULLABLE, REFERENCES `profiles(id)` |
| `created_at` | TIMESTAMPTZ | DEFAULT `now()` |

---

## 5. UI & macOS Aesthetic Design Integration

### 5.1 macOS Window & Glassmorphism System
- Translucent sidebar and header navigation panels (`backdrop-blur-md bg-zinc-950/80 border-white/10`).
- macOS window control dot visual styling (Red, Yellow, Green status lights).
- React Bits `Dock` component for quick filtering at bottom/top.

### 5.2 Interactive Micro-Interactions (React Bits)
- **`SpotlightCard`**: Ticket cards glow subtly on hover following mouse position.
- **`ShinyText`**: Shimmering metallic badge for `Urgent (P0)` tickets and `[Submit Ticket]` primary CTA.
- **`BlurText`**: Smooth title entrance on dashboard header.
- **`CountUp`**: Animated number rollup for KPI metrics on the Admin Dashboard.

### 5.3 End-User Submitter Experience
- **Category Issue Templates**: Auto-fills structured template upon category selection.
- **7-Day Reopen Grace Period**: 1-click reopen for resolved tickets.
- **AI Semantic Q&A Search (`pgvector`)**: Intent-based instant FAQ deflection.
- **Form Draft Auto-Save (`localStorage`) & Image Compression**: Prevents data loss & optimizes upload sizes.

---

## 6. Maintenance & IT Support Resilience

### 6.1 Sub-task Checklist Management
- Interactive progress checklist for complex requests.

### 6.2 Auto-Routing Rules
- Automatic ticket assignment to team leads based on category rules.

### 6.3 PDF Compliance & Audit Export
- One-click **"Export Ticket PDF"** for formal IT sign-offs.

### 6.4 Realtime Presence & Optimistic Locking
- Realtime "Agent X is viewing this ticket" indicator to prevent duplicate work.

---

## 7. Admin Analytics Dashboard (`/admin/dashboard`)

- **KPI Cards with React Bits `CountUp`**: Animated rollup of Total Volume, Avg Response Time, Resolution Rate, SLA Breaches.
- **Interactive Charts**: Daily Trend Line, Category Bar Chart, Department Donut Chart, Agent Workload Table.
- **Category Rules Manager**: Configure structured templates and auto-assignment rules.
- **CSV & PDF Report Exports**.

---

## 8. Notifications & Webhook Flow

1. **Ticket Created**: Post Microsoft Teams Adaptive Card asynchronously.
2. **Ticket Status Change / Reply**: Email notification to author with direct link.

---

## 9. Security & Row Level Security (RLS)

- **`profiles`**: User-managed; read all profiles.
- **`tickets`**: `author_id = auth.uid()` or support agent access.
- **`comments`**: Non-agent employees blocked from `is_internal_note = true`.
- **`ticket_audit_logs`**: Read-only; trigger/server action updated.
- **`category_rules`**: Writable only by `admin`.

---

## 10. Self-Review Checklist

- [x] macOS Minimalist Glassmorphism aesthetic specified.
- [x] React Bits micro-interaction components (`GlassSurface`, `Dock`, `SpotlightCard`, `ShinyText`, `BlurText`, `CountUp`) integrated seamlessly.
- [x] Category Issue Templates & 7-Day Reopen Grace Period.
- [x] AI Semantic FAQ Search via Supabase `pgvector`.
- [x] Auto-Routing rules & Sub-task Checklists.
- [x] PDF Export for IT compliance.
- [x] Complete design spec updated and committed to git repository.
