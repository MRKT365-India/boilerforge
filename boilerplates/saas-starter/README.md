# saas-starter boilerplate

Production-ready SaaS starter with auth, billing, and multi-tenancy.

## Features
- **Auth** — Email/OTP via Resend + JWT sessions
- **Billing** — Razorpay (India) or Stripe (global)
- **Multi-tenancy** — org-based data isolation
- **API** — Express + Prisma + PostgreSQL
- **Email** — Resend for transactional emails

## Stack
- Node.js + TypeScript
- Express
- Prisma + PostgreSQL
- Razorpay / Stripe
- Resend (email)
- Zod (validation)

## Structure
```
src/
├── auth/           # Auth middleware + JWT
├── billing/        # Razorpay/Stripe integration
├── api/            # Route handlers
├── db/             # Prisma client + migrations
└── index.ts
```

## Via boilerforge MCP
```
"Scaffold a saas-starter project in ./my-saas"
```
