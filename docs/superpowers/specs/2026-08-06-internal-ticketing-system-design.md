# Technical Design Specification: Internal Staff Ticketing Platform

**Date:** 2026-08-06  
**Status:** Approved  
**Deployment Target:** Vercel  

---

## 1. Overview & Objectives

The goal of this project is to build a modern, high-efficiency internal ticketing and communication platform for company staff (`@gtmsw.com.my`) and interns (`@outlook.com`) to report issues, request IT support, and track resolutions.

The user interface follows a GitHub Issues-inspired timeline layout with developer-grade polish, Markdown support, drag-and-drop/clipboard image uploads, and Microsoft Teams integration.

---

## 2. Technical Stack

* **Frontend & API**: Next.js 14+ (App Router, Server Actions, React Email)
* **Backend as a Service**: Supabase (PostgreSQL Database, Supabase Auth, Supabase Storage)
* **Styling & UI**: Tailwind CSS, shadcn/ui (Zinc color palette, Geist Sans & Geist Mono typography)
* **Integrations**: Microsoft Teams (Incoming Webhooks / Adaptive Cards), Resend/Nodemailer (Email notifications)
* **Hosting**: Vercel

---

## 3. Authentication & Domain Constraints

### Domain & Role Rules
1. **Full-time Staff (`@gtmsw.com.my`)**
   - Automatically assigned `user_type: full_time`.
   - Requires department selection during registration.
2. **Interns & Contractors (`@outlook.com`)**
   - Automatically assigned `user_type: intern`.
   - Requires department selection + supervisor name during registration.
3. **Other Public Domains (`@gmail.com`, `@qq.com`, etc.)**
   - Strictly rejected at authentication/registration API level.

### User Roles (`profiles.role`)
- `employee`: Standard ticket creator. Can view and comment on own tickets.
- `support_agent`: IT / Support staff. Can be assigned tickets, change statuses, and post internal notes.
- `admin`: Full administrative access to manage users, labels, and categories.

---

## 4. Database Schema (PostgreSQL via Supabase)

### 4.1 `profiles` Table
Stores extended user profile information gathered during registration.

| Column | Type | Constraints / Description |
|---|---|---|
| `id` | UUID | PRIMARY KEY, REFERENCES `auth.users(id)` ON DELETE CASCADE |
| `email` | TEXT | UNIQUE, NOT NULL |
| `display_name` | TEXT | NOT NULL |
| `user_type` | TEXT | ENUM: `'full_time'`, `'intern'`, `'contractor'` |
| `department` | TEXT | NOT NULL (e.g., `'IT'`, `'HR'`, `'Marketing'`) |
| `supervisor_name`| TEXT | NULLABLE (Required for interns) |
| `role` | TEXT | DEFAULT `'employee'` (ENUM: `'employee'`, `'support_agent'`, `'admin'`) |
| `avatar_url` | TEXT | NULLABLE |
| `created_at` | TIMESTAMPTZ | DEFAULT `now()` |

### 4.2 `tickets` Table
Primary ticket records.

| Column | Type | Constraints / Description |
|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` |
| `ticket_number` | SERIAL | AUTO-INCREMENT (e.g., #1001) |
| `title` | TEXT | NOT NULL |
| `description` | TEXT | NOT NULL (Markdown content) |
| `status` | TEXT | DEFAULT `'open'` (ENUM: `'open'`, `'in_progress'`, `'resolved'`, `'closed'`) |
| `priority` | TEXT | DEFAULT `'medium'` (ENUM: `'low'`, `'medium'`, `'high'`, `'urgent'`) |
| `category` | TEXT | NOT NULL (e.g., `'Hardware'`, `'System Bug'`, `'VPN'`, `'Permission'`) |
| `author_id` | UUID | REFERENCES `profiles(id)` |
| `assignee_id` | UUID | NULLABLE, REFERENCES `profiles(id)` |
| `created_at` | TIMESTAMPTZ | DEFAULT `now()` |
| `updated_at` | TIMESTAMPTZ | DEFAULT `now()` |

### 4.3 `comments` Table
Timeline entries under a ticket.

| Column | Type | Constraints / Description |
|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` |
| `ticket_id` | UUID | REFERENCES `tickets(id)` ON DELETE CASCADE |
| `author_id` | UUID | REFERENCES `profiles(id)` |
| `content` | TEXT | NOT NULL (Markdown content) |
| `is_internal_note` | BOOLEAN | DEFAULT `false` (Only visible to `support_agent` / `admin`) |
| `created_at` | TIMESTAMPTZ | DEFAULT `now()` |

### 4.4 `labels` & `ticket_labels` Tables
Tagging system for tickets.

- `labels`: `id`, `name`, `color_hex` (e.g., `bug` -> `#ef4444`, `p0` -> `#f43f5e`).
- `ticket_labels`: `ticket_id`, `label_id`.

---

## 5. UI Layout & User Experience (GitHub Issues Style)

### 5.1 Registration & Login (`/register`, `/login`)
- Email domain validation feedback in real time.
- Dynamic fields based on email domain:
  - `@gtmsw.com.my` shows standard department dropdown.
  - `@outlook.com` activates Intern mode and adds required Supervisor input field.

### 5.2 Ticket Dashboard (`/tickets`)
- **Top Stats Cards**: Open count, In Progress count, Resolved count.
- **GitHub-style Filter Bar**:
  - Search input (queries title and body text).
  - Quick filters: `Created by me`, `Status`, `Category`, `Priority`.
- **List View**:
  - Status indicators: 🟢 Open (Emerald), 🟣 In Progress (Indigo), ⚪ Closed (Slate).
  - Ticket ID (`#1001`), Title, Author with badge (`Staff` or `Intern`), and Department tag.

### 5.3 Ticket Creation (`/tickets/new`)
- Title, Category, Priority selectors.
- Markdown editor with live preview tab.
- **Paste to Upload**: Pressing `Ctrl + V` with an image in clipboard uploads directly to Supabase Storage bucket (`ticket-attachments`) and inserts `![image](url)` automatically.

### 5.4 Ticket Detail & Timeline (`/tickets/[id]`)
- **Main Column (75%)**:
  - Ticket Header with status pill, ID, author profile, timestamp.
  - Main issue description with full Markdown rendering.
  - Timeline of comments with chronological order.
  - **Internal Note Toggle**: Support staff can check "Internal Note" checkbox to leave yellow-tinted comments visible only to agents (`🔒 Internal Note`).
- **Sidebar Column (25%)**:
  - Assignee picker.
  - Priority dropdown.
  - Labels manager.
  - Author summary card (Name, Email, Dept, Intern vs Staff badge).

---

## 6. Notifications & Webhook Flow

1. **Ticket Created**:
   - Post Microsoft Teams **Adaptive Card** to IT support channel via Incoming Webhook.
   - Send confirmation email to ticket author.
2. **Ticket Status Change / Reply**:
   - Send notification email to author with direct link to ticket timeline.
   - Notify assigned IT agent on new comments.

---

## 7. Security & Row Level Security (RLS)

- **`profiles`**: Users can read all profiles; users can only update their own profile.
- **`tickets`**: Employees can read their own created tickets. Support agents/admins can read and edit all tickets.
- **`comments`**: Non-agent employees CANNOT query rows where `is_internal_note = true`.
- **Supabase Storage**: Authenticated users can upload to `ticket-attachments` bucket with max 10MB file size per image.

---

## 8. Self-Review Checklist

- [x] No placeholders or TBD items.
- [x] Clear domain validation rules (`@gtmsw.com.my` & `@outlook.com`).
- [x] Role-based UI & RLS protection for internal notes.
- [x] GitHub Issues design language aligned with Next.js + Supabase on Vercel.
