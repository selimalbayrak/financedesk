# FinanceDesk

A lightweight, modern business accounting and financial tracking web application. Built to replace Micro Accounting with a faster, simpler, and more enjoyable experience.

## Features (Phase 1)

- **Dashboard** — Real-time KPIs: total receivables, payables, loan balances, upcoming payments
- **Current Accounts (Cari)** — Manage customers and suppliers with full contact/tax info
- **Payables & Receivables** — Track money owed and owed to you, record payments, track status

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS v4 + shadcn/ui v4 |
| Database | Supabase (PostgreSQL, free tier) |
| Auth | Supabase Auth |
| Deployment | Vercel (free tier) |

## Quick Start

### 1. Install

```bash
cd financedesk
npm install
```

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free project
2. In the SQL Editor, run the migration: `supabase/migration.sql`
3. Create your first user: Authentication → Users → Add User

### 3. Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Both values are in: Supabase Dashboard → Project Settings → API

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deployment (Vercel)

```bash
git add .
git commit -m "Initial commit"
git push
# Connect repo to Vercel at vercel.com
# Add environment variables in Vercel Dashboard
```

## Database Schema

All monetary values are stored as **BIGINT (kuruş = 1/100 TRY)**. The app converts automatically.

| Table | Purpose |
|---|---|
| `accounts` | Customers and suppliers (Cari) |
| `transactions` | Transaction ledger |
| `payables` | Payable and receivable entries |
| `payable_payments` | Payment records for payables |
| `reconciliations` | Supplier reconciliation (Phase 2) |
| `loans` | Bank loans (Phase 2) |
| `checks` | Check tracking (Phase 2) |
| `promissory_notes` | Senet tracking (Phase 2) |
| `invoices` | Invoice archive (Phase 2) |

## Free Tier Notes

- **Supabase** pauses after 7 days of inactivity — set up a daily health check ping
- **Vercel** free tier is 100GB bandwidth/month — more than enough for personal use
- **DB Storage**: 500MB limit (~500K transactions at ~1KB each)

## Roadmap

- [ ] Phase 2: Supplier Reconciliation
- [ ] Phase 2: Loan Tracking
- [ ] Phase 2: Check Tracking
- [ ] Phase 2: Promissory Note Tracking
- [ ] Phase 2: Invoice Archive + PDF Upload
