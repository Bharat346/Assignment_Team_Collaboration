# Newtonite - Operational Work Management System

Newtonite is a modern, responsive, full-stack team collaboration and operational work management application built with **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS v4**, and **SQLite**. It enables agile teams to organize tasks, manage permissions, collaborate in real time, track status transitions, and visualize workload metrics.

---

## Key Features

### 1. Interactive Analytics & Dashboard
- **Executive Stat Cards**: Real-time counts for *My Work Items*, *Critical/High Risk Items*, *Blocked Work*, and *Overdue Tasks*.
- **Status Distribution Chart**: Visual distribution bar chart tracking task velocity and completion percentage.
- **Priority Risk Donut Chart**: Pure SVG donut visualization breaking down items by severity (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) with interactive filtering.

### 2. Work Items Management
- **List & Advanced Filtering**: Filter items by Status, Priority, Team, Assignee, and Keyword Search.
- **Quick Views**: Pre-filtered tabs for *My Work*, *Critical*, *Blocked*, *Overdue*, and *Unassigned*.
- **Work Item Detail (`/dashboard/work-items/[id]`)**:
  - Full task overview, description editing, and metadata inspection.
  - **Status Updates**: Flexible state machine (`OPEN` ➔ `IN_PROGRESS` ➔ `BLOCKED` ➔ `RESOLVED` ➔ `CLOSED`).
  - **Severity / Priority Changes**: Adjust task importance in real time.
  - **Team Assignment**: 1-click self-assignment or assign to any member within the team.
  - **Comments & Discussion**: Contextual conversation thread with user avatars and relative timestamps.
  - **Audit Trail & Activity Log**: Historical event log capturing all state changes, assignments, and renames.

### 3. Team Management (`/dashboard/teams`)
- Dedicated team overview with member counts and created dates.
- Search and filter teams or members by name/email.
- Member list displaying avatars, emails, and role badges (`ADMIN`, `LEAD`, `MEMBER`).
- Direct navigation to view each team's active work board.

### 4. Role-Based Access Control (RBAC) & Security
- **Roles**:
  - `ADMIN`: Full administrative control across all teams and work items.
  - `LEAD`: Team-level management, member assignment, and oversight.
  - `MEMBER`: Collaborative task execution, status progression, and commenting.
- **Optimistic Concurrency Control**: Tracks record `version` to ensure atomic concurrent updates and prevent accidental overwrites.
- **Session Authentication**: Secure HTTP cookies with password hashing via `bcryptjs`.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16 (Turbopack)](https://nextjs.org/)
- **Frontend**: [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components**: Radix UI Primitives, Lucide React Icons, Sonner Notifications
- **State & Data Fetching**: TanStack React Query v5
- **Database**: SQLite via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) (WAL mode enabled)
- **Utilities**: `date-fns`, `uuid`, `clsx`, `tailwind-merge`

---

## Getting Started

### Prerequisites
- **Node.js**: version `18.18.0` or higher (Node 20+ recommended)
- **npm** or **pnpm** / **yarn**

### 1. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/Bharat346/Assignment_Team_Collaboration.git
cd Assignment_Team_Collaboration
npm install
```

### 2. Database Seeding
Seed the SQLite database with teams, users, work items, and comments:
```bash
npm run seed
```

### 3. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Demo Credentials

The seed script creates the following demo users (all accounts use password: `password123`):

| Name | Email | System Role | Default Teams |
| :--- | :--- | :--- | :--- |
| **Alice Johnson** | `alice@newtonite.com` | `ADMIN` | All Teams |
| **Bob Smith** | `bob@newtonite.com` | `MEMBER` (`LEAD` in Eng) | Engineering |
| **Carol Davis** | `carol@newtonite.com` | `MEMBER` | Engineering, Product |
| **Dave Wilson** | `dave@newtonite.com` | `MEMBER` (`LEAD` in Prod) | Product |
| **Eve Martinez** | `eve@newtonite.com` | `MEMBER` | Operations |

---

## Project Structure

```
├── app/
│   ├── api/                     # Next.js API route handlers
│   │   ├── auth/                # Login, Logout endpoints
│   │   ├── me/                  # Current authenticated user profile
│   │   ├── teams/               # Teams listing & membership
│   │   └── work-items/          # Work items CRUD, comments, activity & assignment
│   ├── dashboard/               # Dashboard pages
│   │   ├── page.js              # Overview page with analytics & charts
│   │   ├── teams/               # Teams page
│   │   └── work-items/          # Work items list & [id] detail views
│   ├── login/                   # Login page
│   ├── layout.js                # Root application layout
│   └── globals.css              # Design tokens, theme inline, and base styles
├── components/
│   ├── auth-provider.jsx        # Auth context provider & session consumer
│   ├── dashboard-charts.jsx     # SVG status & priority analytics charts
│   ├── providers.jsx            # React Query & Sonner providers
│   └── ui/                      # Reusable UI primitives (Badge, Card, Dialog, etc.)
├── lib/
│   ├── api-client.js            # Frontend HTTP client wrapper
│   ├── auth.js                  # Server authentication & RBAC helpers
│   ├── constants.js             # Statuses, priorities, labels & transitions
│   ├── db.js                    # SQLite database connection & schema
│   └── utils.js                 # Class name merger helper (cn)
├── scripts/
│   └── seed.js                  # Database seeder script
└── data/                        # Local SQLite database directory
```

---

## API Reference Summary

- `POST /api/auth/login` - Authenticate user credentials and establish session
- `POST /api/auth/logout` - Clear user session
- `GET /api/me` - Fetch profile of currently authenticated user
- `GET /api/teams` - List all accessible teams and their members
- `GET /api/work-items` - Query work items with filtering, search, and pagination
- `POST /api/work-items` - Create a new work item (with Idempotency-Key support)
- `GET /api/work-items/:id` - Fetch detailed information for a single work item
- `PATCH /api/work-items/:id` - Update work item title, description, status, or priority
- `POST /api/work-items/:id/assign` - Assign or unassign work item to a team member
- `GET /api/work-items/:id/comments` - Fetch discussion comments
- `POST /api/work-items/:id/comments` - Post a comment to a work item
- `GET /api/work-items/:id/activity` - Fetch chronological audit trail

---

## 📜 License
This project is open-source and available under the [MIT License](LICENSE).
