# Technical Design Specification: Internal Staff Ticketing Platform

**Date:** 2026-08-06  
**Status:** Approved  
**Deployment Target:** Vercel  

---

## 1. Overview & Objectives

The goal of this project is to build a modern, high-efficiency internal ticketing and communication platform for company staff (`@gtmsw.com.my`) and interns (`@outlook.com`) to report issues, request IT support, and track resolutions.

The user interface follows a GitHub Issues-inspired timeline layout with developer-grade polish, Markdown support, drag-and-drop/clipboard image uploads, Microsoft Teams integration, a Pinned Knowledge Base / Q&A Section, and a comprehensive Admin Analytics Dashboard.

---

## 2. Technical Stack

* **Frontend & API**: Next.js 14+ (App Router, Server Actions, React Email)
* **Backend as a Service**: Supabase (PostgreSQL Database, Supabase Auth, Supabase Storage)
* **Styling & UI**: Tailwind CSS, shadcn/ui, Recharts / Tremor (for Analytics charts), Zinc color palette, Geist Sans & Geist Mono typography
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
- `employee`: Standard ticket creator. Can view/comment on own tickets and browse Pinned Q&A.
- `support_agent`: IT / Support staff. Can be assigned tickets, change statuses, post internal notes, and manage FAQs.
- `admin`: Full administrative access to manage users, labels, categories, FAQ pinning, and view the Analytics Dashboard.

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
| `department` | TEXT | NOT NULL (e.g., `'IT'`, `'HR'`, `'Marketing'`, `'Finance'`) |
| `supervisor_name`| TEXT | NULLABLE (Required for interns) |
| `role` | TEXT | DEFAULT `'employee'` (ENUM: `'employee'`, `'support_agent'`, `'admin'`) |
| `avatar_url` | TEXT | NULLABLE |
| `created_at` | TIMESTAMPTZ | DEFAULT `now()` |

### 4.2 `tickets` Table
Primary ticket records with analytics timestamps and pinning flags.

| Column | Type | Constraints / Description |
|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` |
| `ticket_number` | SERIAL | AUTO-INCREMENT (e.g., #1001) |
| `title` | TEXT | NOT NULL |
| `description` | TEXT | NOT NULL (Markdown content) |
| `status` | TEXT | DEFAULT `'open'` (ENUM: `'open'`, `'in_progress'`, `'resolved'`, `'closed'`) |
| `priority` | TEXT | DEFAULT `'medium'` (ENUM: `'low'`, `'medium'`, `'high'`, `'urgent'`) |
| `category` | TEXT | NOT NULL (e.g., `'Hardware'`, `'System Bug'`, `'VPN'`, `'Permission'`, `'Software'`) |
| `author_id` | UUID | REFERENCES `profiles(id)` |
| `assignee_id` | UUID | NULLABLE, REFERENCES `profiles(id)` |
| `is_pinned` | BOOLEAN | DEFAULT `false` (Used for Pinned Q&A / Knowledge Base) |
| `pin_order` | INT | DEFAULT `0` |
| `first_responded_at`| TIMESTAMPTZ | NULLABLE (For SLA response calculation) |
| `resolved_at` | TIMESTAMPTZ | NULLABLE (For SLA resolution calculation) |
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

### 4.4 `faqs` Table (Pinned Knowledge Base)
Dedicated structure for admin-curated Q&A entries.

| Column | Type | Constraints / Description |
|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` |
| `question` | TEXT | NOT NULL |
| `answer` | TEXT | NOT NULL (Markdown format) |
| `category` | TEXT | NOT NULL |
| `is_pinned` | BOOLEAN | DEFAULT `true` |
| `created_by` | UUID | REFERENCES `profiles(id)` |
| `created_at` | TIMESTAMPTZ | DEFAULT `now()` |

---

## 5. UI Layout & User Experience

### 5.1 Registration & Login (`/register`, `/login`)
- Email domain validation feedback in real time.
- Dynamic fields based on email domain:
  - `@gtmsw.com.my` shows standard department dropdown.
  - `@outlook.com` activates Intern mode and adds required Supervisor input field.

### 5.2 Pinned Q&A / Knowledge Base Section (`/faq` & Ticket Creation Guard)
- **Top Banner / Accordion Component**: High-frequency common issues pinned by admins (e.g., "How to reconnect Company VPN", "Printer IP Configuration").
- **Searchable FAQ**: Instant search across answer contents to deflect redundant ticket creation before submitting.
- **Admin Quick Pin**: Admins/Support agents can click "Pin as FAQ" directly on resolved tickets to publish them into the Knowledge Base.

### 5.3 Ticket Dashboard (`/tickets`)
- **Top Stats Cards**: Open count, In Progress count, Resolved count.
- **GitHub-style Filter Bar**:
  - Search input (queries title and body text).
  - Quick filters: `Created by me`, `Status`, `Category`, `Priority`.
- **List View**:
  - Status indicators: 🟢 Open (Emerald), 🟣 In Progress (Indigo), ⚪ Closed (Slate).
  - Ticket ID (`#1001`), Title, Author with badge (`Staff` or `Intern`), and Department tag.

### 5.4 Ticket Creation (`/tickets/new`)
- Title, Category, Priority selectors.
- Live Q&A Suggestion popup if title matches existing Pinned Q&As.
- Markdown editor with live preview tab.
- **Paste to Upload**: Pressing `Ctrl + V` with an image in clipboard uploads directly to Supabase Storage bucket (`ticket-attachments`) and inserts `![image](url)` automatically.

### 5.5 Ticket Detail & Timeline (`/tickets/[id]`)
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

## 6. Comprehensive Admin Analytics Dashboard (`/admin/dashboard`)

Available to `admin` and `support_agent` roles to monitor overall system performance.

### 6.1 Metric KPI Cards (Top Row)
- **Total Tickets This Month**: Count + percentage growth compared to last month.
- **Average First Response Time**: Calculated from `created_at` to `first_responded_at` (Target: < 2 hours).
- **Resolution Rate**: Percentage of tickets resolved vs created.
- **SLA Breach Counter**: Number of urgent/high priority tickets exceeding response threshold.

### 6.2 Interactive Analytics Charts
- **Ticket Volume Trend Line Chart**: Daily/Weekly breakdown of new vs closed tickets over time.
- **Category Distribution (Bar Chart)**: Visualizing top problem areas (e.g., VPN vs Hardware vs Software Bug).
- **Department Ticket Ratio (Donut Chart)**: Percentage of tickets originating from HR, Marketing, Finance, Product, etc.
- **Agent Workload Table**: Workload per IT support member (Assigned, In Progress, Resolved count, Avg Resolution Time).

### 6.3 Reporting & Export
- **Date Range Selector**: Filter metrics by 7 Days, 30 Days, Quarter, or Custom Range.
- **Export to CSV / XLSX**: One-click download of filtered ticket records for IT management reports.

---

## 7. Notifications & Webhook Flow

1. **Ticket Created**:
   - Post Microsoft Teams **Adaptive Card** to IT support channel via Incoming Webhook.
   - Send confirmation email to ticket author.
2. **Ticket Status Change / Reply**:
   - Send notification email to author with direct link to ticket timeline.
   - Notify assigned IT agent on new comments.

---

## 8. Security & Row Level Security (RLS)

- **`profiles`**: Users can read all profiles; users can only update their own profile.
- **`tickets`**: Employees can read their own created tickets. Support agents/admins can read and edit all tickets.
- **`comments`**: Non-agent employees CANNOT query rows where `is_internal_note = true`.
- **`faqs`**: Publicly readable by all authenticated users; writable only by `admin` and `support_agent`.
- **Analytics API**: Accessible exclusively by `admin` and `support_agent` roles.

---

## 9. Self-Review Checklist

- [x] No placeholders or TBD items.
- [x] Domain validation rules (`@gtmsw.com.my` & `@outlook.com`).
- [x] Pinned Q&A / Knowledge Base section integrated to prevent duplicate tickets.
- [x] Comprehensive Analytics Dashboard (`/admin/dashboard`) with KPI metrics, charts, and CSV exports.
- [x] Role-based UI & RLS protection for internal notes and admin routes.
