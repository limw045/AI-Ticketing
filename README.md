# Grant Thornton AI Department - Internal Support Desk

Internal support and incident management platform for Grant Thornton (GTMSW) AI and automation operations. It provides a direct line between operational units (Audit, Tax, HR, Secretary, RockAcc) and the AI Engineering team, handling issue reports, error logs, machine-to-machine API ticket ingestion, knowledge base lookups, and outage tracking.

Live deployment: [gt-ai-ticketing.vercel.app](https://gt-ai-ticketing.vercel.app/)

---

## Visual Overview

### 1. Portal Landing and Authentication

Users can switch between light and dark themes. Account registration is restricted to corporate domains (@gtmsw.com.my for full-time staff and @outlook.com for interns) and requires selecting an active department.

| Portal Home (Light) | Portal Home (Dark) |
| :---: | :---: |
| ![Landing Page Light](docs/screenshots/01-landing-page.png) | ![Landing Page Dark](docs/screenshots/01-landing-page-dark.png) |

| Staff Login | Account Registration | Password Recovery |
| :---: | :---: | :---: |
| ![Login](docs/screenshots/02-login.png) | ![Register](docs/screenshots/03-register.png) | ![Forgot Password](docs/screenshots/04-forgot-password.png) |

---

### 2. Administrator Operations Console

Super Admins and Admins manage queue throughput, triage incoming tickets, broadcast service incidents, update user permissions, issue external API keys, and review audit trails.

| Operations Dashboard (Light) | Operations Dashboard (Dark) |
| :---: | :---: |
| ![Admin Dashboard](docs/screenshots/05-admin-dashboard.png) | ![Admin Dashboard Dark](docs/screenshots/05-admin-dashboard-dark.png) |

| Central Ticket Queue | Global Incident Broadcasts |
| :---: | :---: |
| ![Admin Tickets](docs/screenshots/06-admin-tickets.png) | ![Admin Incidents](docs/screenshots/07-admin-incidents.png) |

| Staff Access and Roles | API Client Management |
| :---: | :---: |
| ![Admin Staff](docs/screenshots/08-admin-staff.png) | ![Admin API Clients](docs/screenshots/09-admin-api-clients.png) |

| Knowledge Base and Rules | Comment and Note Moderation |
| :---: | :---: |
| ![Admin Knowledge](docs/screenshots/10-admin-knowledge.png) | ![Admin Comments](docs/screenshots/11-admin-comments.png) |

| Immutable System Audit Logs | Recycle Bin and Record Recovery |
| :---: | :---: |
| ![Admin System Logs](docs/screenshots/12-admin-system-logs.png) | ![Admin Recycle Bin](docs/screenshots/13-admin-recycle-bin.png) |

---

### 3. Requester Workspace and Ticket Tracking

Employees and interns track submitted requests, find answers in the knowledge base, submit structured tickets with diagnostic context, and follow real-time progress.

| User Dashboard (Light) | User Dashboard (Dark) |
| :---: | :---: |
| ![User Dashboard](docs/screenshots/14-user-dashboard.png) | ![User Dashboard Dark](docs/screenshots/14-user-dashboard-dark.png) |

| Personal Ticket List | Ticket Submission (Data Guard Active) |
| :---: | :---: |
| ![User Tickets](docs/screenshots/15-user-tickets.png) | ![Ticket New](docs/screenshots/16-ticket-new.png) |

| Knowledge Base FAQ | Ticket Detail (Timeline, Subtasks, PDF Export) |
| :---: | :---: |
| ![FAQ Knowledge](docs/screenshots/17-faq-knowledge.png) | ![Ticket Detail](docs/screenshots/18-ticket-detail.png) |

---

## Technical Stack

- Frontend: Next.js 16 (App Router), React 19, TypeScript
- Styling and Components: Tailwind CSS, Lucide Icons, Framer Motion
- Analytics and Export: Recharts, jsPDF, html2canvas
- Backend and Database: Supabase (PostgreSQL 15, Auth, Storage, Realtime, pgvector)
- Authorization: Row Level Security (RLS) policies across all tables and storage objects
- Test Suite: Vitest (34 test files, 164 passing tests)

---

## Architecture and Key Capabilities

### 1. Role-Based Access Control and Department Isolation
- Super Admin: Controls user roles, manages department records, provisions API clients, and performs permanent record deletions.
- Admin: Triages tickets, updates statuses and assignees, posts internal staff notes, and publishes global incident notices.
- Support Agent: Works on assigned tickets, adds technical commentary, and resolves issues.
- Employee / Intern: Submits requests and tracks tickets within their assigned department. Staff notes are hidden from non-admin roles at the database level via RLS.

### 2. Structured Intake with Data Guard
- Pre-built templates for common categories such as Risk Screen, System Bug, and Automation Failure.
- Captures browser and display metrics automatically on submission to help reproduce client-side issues.
- Scans input text and log payloads to redact API tokens, private keys, and passwords before database write.

### 3. Machine-to-Machine Ingestion API (/api/v1/tickets)
Allows backend bots, scheduled tasks, and internal scripts to file tickets programmatically.
- SHA-256 one-time hashed client keys validated directly in the database.
- Enforces a 60 request per minute rate limit per client key.
- Supports the `Idempotency-Key` header to prevent duplicate ticket creation during retry loops.
- Automatically redacts sensitive parameters from submitted log payloads.

### 4. Audit Logging and Soft Deletes
- All status transitions, assignments, and ticket modifications generate records in `ticket_audit_logs` via PostgreSQL triggers.
- Deleted tickets move to the Recycle Bin (`deleted_at`) so administrators can recover them if needed.

### 5. Real-Time Incident Notifications
- Active incidents display an alert banner across the application to prevent duplicate reports during outages.
- Supabase Realtime updates unread badge counts and comment threads without manual page refreshes.

---

## Getting Started

### Prerequisites
- Node.js 20 or higher (Node.js 24 recommended)
- npm, pnpm, or yarn

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd Ticketing
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment variables:

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-anon-key
NEXT_PUBLIC_SUPABASE_SCHEMA=gtjbticketing
NEXT_PUBLIC_TICKET_ATTACHMENT_BUCKET=gtjbticketing-attachments
```

4. Apply database schema and migrations:

For a new isolated installation, create an empty `gtjbticketing` schema owned by the deployment database role, then apply these files in order:

1. `supabase/schema/prerequisites.sql` as the database administrator (adjust the role name for another installation).
2. `supabase/schema/gtjbticketing.sql` as the schema owner.
3. `supabase/schema/ticketing_departments.sql` and `supabase/schema/ticketing_onboarding.sql` as the schema owner.
4. `supabase/schema/enable_ticketing_services.sql` as the database administrator.

The bootstrap refuses a nonempty destination schema. It creates no Auth users or application rows, and excludes Signora objects and shared `public.profiles` triggers. The older files in `supabase/migrations/` describe the original `public` installation; do not replay them against a shared production project.

Existing Auth users sign in normally and complete `/onboarding` to create their independent Ticketing profile. Roles are stored only in `gtjbticketing.profiles`. The existing reserved administrator email policy is enforced using the verified Auth email, not editable user metadata. Departments must be configured before onboarding; registration and profile setup only accept active, non-system directory entries. Profile department names follow their directory IDs, including subsequent renames. The approved department directory is in `supabase/schema/department_directory.sql` and was imported separately from development; users and tickets were not copied. Ticket categories still require application configuration.

Allow the exact production callback URL `https://gt-ai-ticketing.vercel.app/auth/callback` in the shared Auth project's Redirect URLs. Signup and password recovery both request this URL without query parameters. Recovery uses an isolated, nonpersistent implicit-flow client so email links can be opened in another browser. The callback forwards URL fragments to `/reset-password`; that page removes credentials from the address bar, validates the recovery session, and shows the account email before enabling password changes. Older PKCE recovery links are also supported when the original verifier cookie is present. No wildcard or change to the shared Site URL is needed.

For development data with production Auth, additionally set `NEXT_PUBLIC_SUPABASE_AUTH_URL` and `NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY` to the production project. Set `SUPABASE_DATA_JWT_SECRET` on the server to the development project's accepted legacy JWT signing secret. The server verifies the production session before exchanging it for a data token lasting at most five minutes, with the same user ID and the `authenticated` database role. Application roles are never copied into this token. No Auth user is created in development. This configuration requires the development project to still accept that signing key; do not rotate a shared project's keys as part of this migration. Leave the separate Auth variables unset when Auth and data belong to the same project.

Keep environment-specific public settings in `.env.development.local` and `.env.production` (or deployment environment variables). Use `.env.local` only for local server secrets, because it takes precedence over `.env.production` during a production build. Public environment variables require a rebuild after changes.

`scripts/database/export_ticketing_schema.py` exports the allowlisted structure from `TICKETING_SOURCE_DATABASE_URL`. `scripts/database/verify_ticketing_schema.py` uses `TICKETING_TEST_DATABASE_URL` to test permissions in an isolated temporary schema, and always rolls back. Both require Python and `psycopg`. Neither exports user passwords or creates Auth users.

5. Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

6. Run the test suite:

```bash
# Run unit and integration tests
npm test

# Run TypeScript check
npm run typecheck

# Run ESLint
npm run lint
```

---

## Ingestion API Usage Example

External scripts can create tickets by sending a POST request to `/api/v1/tickets`:

```bash
curl -X POST https://gt-ai-ticketing.vercel.app/api/v1/tickets \
  -H "Authorization: Bearer YOUR_API_CLIENT_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 7f8a9b2c-3d4e-5f6a-7b8c-9d0e1f2a3b4c" \
  -d '{
    "title": "Tax Bot: Failed to fetch invoice PDF",
    "description": "Invoice service returned HTTP 502 bad gateway after 3 retries.",
    "category": "Automation Failure",
    "priority": "high",
    "reporter_email": "bot.runner@gtmsw.com.my",
    "system_logs": {
      "service": "tax-invoice-sync",
      "error_code": "ETIMEDOUT",
      "attempt": 3
    }
  }'
```

**Sample Response:**

```json
{
  "success": true,
  "ticket_id": "70b49344-edff-417a-8bcc-bfd8cd6681f8",
  "ticket_number": 18,
  "status": "open"
}
```

---

## Project Structure

```text
|-- app/
|   |-- (workspace)/             # Authenticated layout and pages
|   |   |-- admin/               # Admin console (dashboard, staff, tickets, incidents, logs)
|   |   |-- dashboard/           # User dashboard
|   |   |-- tickets/             # Ticket list, creation form, and detail view
|   |   |-- faq/                 # Knowledge base and FAQ search
|   |-- api/                     # Backend API routes (v1 ingestion, AI endpoints, attachments)
|   |-- login/                   # User sign-in
|   |-- register/                # Staff registration with department binding
|   |-- forgot-password/         # Password recovery
|   |-- reset-password/          # Password update
|-- components/                  # Shared UI components and form fields
|-- docs/
|   |-- screenshots/             # High-resolution application screenshots
|-- lib/                         # Supabase clients, auth policies, helper utilities
|-- scripts/                     # Verification and automation scripts
|-- supabase/
|   |-- migrations/              # PostgreSQL schema, RLS policies, functions, and triggers
|   |-- templates/               # Supabase Auth email templates
|-- tests/                       # Automated Vitest test suites
```

---

## License

Internal proprietary software for Grant Thornton AI Department.
