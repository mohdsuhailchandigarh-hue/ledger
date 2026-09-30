# Shared Ledger

A premium fintech-grade web application for maintaining synchronized shared financial records between trusted parties.

> Built with Next.js 15, TypeScript, Tailwind CSS, Supabase, and Framer Motion.

---

## Features

- 🏦 **Shared Ledger Engine** — Both parties see the same financial truth
- ✅ **Approval Workflow** — Every transaction requires counterparty confirmation
- 📊 **Premium Dashboard** — Animated balance cards with GSAP counters
- 🔔 **Real-time Approvals** — Instant notification of pending transactions
- 👥 **Connection System** — Connect with others to share a ledger
- 🔐 **Admin Portal** — Full user management, force approval, analytics
- 📱 **Mobile-first** — Bottom navigation, gesture-friendly, responsive
- 🎨 **Premium Dark UI** — Glassmorphism, gradients, micro-animations

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + Custom CSS Design System |
| Animation | Framer Motion + GSAP |
| Database | Supabase PostgreSQL |
| Auth | Custom bcrypt session auth |
| Deployment | Vercel |

---

## Getting Started

### 1. Clone and install

```bash
cd shared-ledger
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. Enable **Realtime** for the `transactions` and `connection_requests` tables
   - Go to **Database → Replication** and add the tables

### 3. Configure environment variables

Copy `.env.local` and fill in your values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

ADMIN_USERNAME=admin
ADMIN_PASSWORD=YourSecurePassword123

SESSION_SECRET=your_random_32_character_secret_here
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Usage

### Admin Login
- Go to `/login` → click **Admin Login**
- Use credentials from `ADMIN_USERNAME` / `ADMIN_PASSWORD`

### Create Users (Admin)
1. Login as admin → **Users** → **Create User**
2. Fill in name, username, password

### User Workflow
1. Login as user
2. Go to **Connections** → search for another user → **Connect**
3. Other user accepts the connection request
4. Both users can now access the **Shared Ledger**
5. Create a transaction entry (Get / Give)
6. The other party receives an approval request
7. Upon approval, both users see the updated balance

---

## Deployment on Vercel

```bash
npx vercel
```

Set environment variables in the Vercel dashboard matching `.env.local`.

---

## Database Schema

See `supabase/schema.sql` for the full schema including:
- `users` — user accounts with bcrypt passwords
- `connections` — accepted ledger pairs
- `connection_requests` — pending/rejected connection requests
- `transactions` — financial entries with approval workflow
- `sessions` — server-side session tokens
- `connection_balances` — computed view for net balances

---

## Project Structure

```
app/
├── (auth)/login/          # Premium login page
├── (user)/
│   ├── dashboard/         # Main financial dashboard
│   ├── ledger/[id]/       # Shared ledger view
│   ├── connections/       # Connection management
│   └── notifications/     # Pending approvals
├── (admin)/admin/         # Admin portal
└── api/                   # API routes

components/
├── dashboard/             # Balance cards, connection grid
├── ledger/                # Timeline, create sheet, approval overlay
├── connections/           # Connection search & management
├── notifications/         # Approval list
├── admin/                 # Admin UI components
├── layout/                # Sidebar, bottom nav
└── motion/                # Animation components

lib/
├── actions/               # Server actions (auth, connections, transactions)
├── auth/                  # Session management
├── supabase/              # Supabase clients
└── utils/                 # Currency formatting, class utilities
```
