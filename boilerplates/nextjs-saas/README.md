# Next.js 14 SaaS Starter

A production-ready Next.js 14 SaaS boilerplate focused on Indian markets. Ships with authentication, Razorpay payments, transactional email, database ORM, and a polished component library out of the box.

## Stack

- **Next.js 14** — App Router, Server Components, Server Actions
- **Prisma** — Type-safe ORM with PostgreSQL
- **NextAuth.js** — Authentication with Google OAuth (JWT strategy)
- **Razorpay** — Payment gateway for INR subscriptions and one-time charges
- **Resend** — Transactional email with React templates
- **Tailwind CSS** — Utility-first styling
- **shadcn/ui** — Accessible, composable UI components (Radix + CVA)
- **Zod** — Runtime schema validation

## Quick Start

```bash
# 1. Copy environment variables
cp .env.example .env

# 2. Install dependencies
npm install

# 3. Push the Prisma schema to your database
npm run db:push

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Folder Structure

```
├── prisma/
│   └── schema.prisma        # Database schema
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── auth/         # NextAuth API route
│   │   ├── dashboard/        # Protected dashboard page
│   │   ├── globals.css       # Tailwind base styles
│   │   ├── layout.tsx        # Root layout (Inter font, metadata)
│   │   └── page.tsx          # Landing page
│   └── lib/
│       ├── prisma.ts         # Prisma client singleton
│       └── razorpay.ts       # Razorpay client initialisation
├── .env.example              # Environment variable template
├── package.json
└── tsconfig.json
```

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_URL` | Canonical app URL (e.g. `http://localhost:3000`) |
| `NEXTAUTH_SECRET` | Random string for JWT signing |
| `RAZORPAY_KEY_ID` | Razorpay API key ID |
| `RAZORPAY_KEY_SECRET` | Razorpay API key secret |
| `RESEND_API_KEY` | Resend API key for transactional email |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |

## License

MIT
