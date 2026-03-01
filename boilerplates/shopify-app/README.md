# Shopify App Starter

A production-ready Shopify app boilerplate built on the official Shopify Remix stack. Ships with OAuth, session management, Prisma database, webhook handling, GDPR compliance, and Polaris UI out of the box.

## Stack

- **Remix** — Full-stack web framework (Shopify's recommended approach)
- **@shopify/shopify-app-remix** — Official Shopify app framework with OAuth, session, billing
- **@shopify/polaris** — Shopify's design system for embedded app UI
- **Prisma** — Type-safe ORM with PostgreSQL
- **App Bridge** — Embedded app navigation and actions
- **Webhooks** — APP_UNINSTALLED, SHOP_UPDATE, GDPR mandatory webhooks

## Quick Start

```bash
# 1. Copy environment variables
cp .env.example .env
# Fill in your Shopify Partners app credentials

# 2. Install dependencies
npm install

# 3. Push the Prisma schema to your database
npm run db:push

# 4. Start the dev server (uses Shopify CLI tunnel)
npm run dev
```

Your app will be available at the URL provided by the Shopify CLI.

## Folder Structure

```
├── prisma/
│   └── schema.prisma           # Session, Shop, AppInstall models
├── app/
│   ├── shopify.server.ts       # Shopify app config (auth, webhooks, session storage)
│   ├── db.server.ts            # Prisma client singleton
│   ├── root.tsx                # Remix root with Polaris AppProvider
│   └── routes/
│       ├── app.tsx             # Authenticated app layout with navigation
│       ├── app._index.tsx      # Dashboard home page
│       └── webhooks.tsx        # Webhook handler (uninstall, GDPR, etc.)
├── .env.example                # Environment variable template
├── package.json
└── tsconfig.json
```

## Environment Variables

| Variable | Description |
|---|---|
| `SHOPIFY_API_KEY` | App API key from Shopify Partners Dashboard |
| `SHOPIFY_API_SECRET` | App API secret |
| `SCOPES` | Comma-separated OAuth scopes (e.g. `write_products,read_orders`) |
| `HOST` | Your app's public URL (ngrok/cloudflare tunnel for dev) |
| `DATABASE_URL` | PostgreSQL connection string |

## Webhooks

The app registers these webhooks automatically after OAuth:

| Webhook | Purpose |
|---|---|
| `APP_UNINSTALLED` | Clean up sessions, mark shop inactive |
| `SHOP_UPDATE` | Sync shop name/plan changes |
| `CUSTOMERS_DATA_REQUEST` | GDPR — export customer data |
| `CUSTOMERS_REDACT` | GDPR — delete customer data |
| `SHOP_REDACT` | GDPR — delete all shop data |

## Adding New Routes

Shopify Remix uses file-based routing. To add a new page:

1. Create `app/routes/app.products.tsx` for `/app/products`
2. Use `authenticate.admin(request)` to get the admin API client
3. Use Polaris components for consistent Shopify UI

## Via boilerforge MCP

```
"Scaffold a shopify-app project in ./my-shopify-app"
```

## License

MIT
