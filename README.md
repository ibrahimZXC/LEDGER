# Business Ledger

A minimal business management app for tracking cash, customers, suppliers, and debts. Built with TanStack Start, Supabase, and deployed to Cloudflare Pages.

## Features

- **Dashboard** — cash on hand, receivables, and payables at a glance
- **Customers & Suppliers** — track balances, transactions, and contact info
- **Cash Vaults** — manage multiple cash/bank accounts
- **Transactions** — sales, purchases, payments, returns, and discounts
- **Quantities** — track item quantities per party
- **Analytics** — reports and charts
- **Multi-device sync** — data syncs through your own Supabase project
- **Auth** — secure login so only you see your data
- **Arabic & English** — full bilingual support
- **Themes** — light, dark, OLED, glass, emerald, and sand modes
- **Export** — JSON backup, CSV import/export, PDF reports

## Tech Stack

- **Framework**: TanStack Start (React + Vite + SSR)
- **Database/Auth**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS v4
- **State**: Zustand + TanStack Query
- **Deploy**: Cloudflare Pages

## Prerequisites

1. A [Supabase](https://supabase.com) project (free tier works)
2. Node.js 22+ and npm

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create your Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your **Project URL** and **anon key** from Settings → API

### 3. Run the database schema

Open the Supabase SQL Editor and run the schema from `supabase/schema.sql` in this repo. This creates the `entities`, `vaults`, `transactions`, and `settings` tables with Row Level Security so only authenticated users can access their own data.

### 4. Configure environment variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 5. Create your login

In the Supabase dashboard, go to Authentication → Users and create your first user (email + password). This is the account you'll use to log in to the app.

### 6. Run the dev server

```bash
npm run dev
```

The app runs on `http://localhost:8080`.

## Deploy to Cloudflare Pages

### Option A: Git integration (recommended)

1. Push this repo to GitHub/GitLab
2. In the Cloudflare dashboard → Pages → Create a project → Connect to Git
3. Select your repo and set:
   - **Build command**: `npm run build`
   - **Output directory**: `dist`
   - **Environment variables**:
     - `VITE_SUPABASE_URL` = your Supabase URL
     - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
4. Deploy. Cloudflare will build and host the app on every push.

### Option B: Wrangler CLI

```bash
npm run build
npx wrangler pages deploy dist
```

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build (Cloudflare Pages target)
- `npm run lint` — lint
- `npm run format` — format with prettier

## Project Structure

```
src/
├── components/     # UI components (AppShell, dialogs, etc.)
├── hooks/          # React hooks
├── lib/            # Business logic, Supabase client, store, utils
├── routes/         # TanStack Router file-based routes
├── types/          # TypeScript types
├── router.tsx      # Router setup
├── server.ts       # SSR server entry (Cloudflare worker)
├── start.ts        # TanStack Start middleware
└── styles.css      # Tailwind styles
supabase/
└── schema.sql      # Database schema + RLS policies
```
