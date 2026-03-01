# boilerforge

[![npm version](https://img.shields.io/npm/v/@cometforge/boilerforge.svg)](https://www.npmjs.com/package/@cometforge/boilerforge)
[![license](https://img.shields.io/npm/l/@cometforge/boilerforge.svg)](https://github.com/mrkt365/boilerforge/blob/main/LICENSE)

> MCP-powered boilerplate registry for AI coding agents.

Stop wasting hours on project setup. Tell your AI coding agent to scaffold a production-ready project in seconds — via Model Context Protocol (MCP).

```
"Start a new SaaS app"  →  Claude Code pulls from boilerforge  →  Project scaffolded instantly
```

Inspired by 21st.dev for UI components — but for entire project boilerplates.

---

## Available Boilerplates

| Name | Description | Status |
|------|-------------|--------|
| `openclaw-agent` | OpenClaw AI agent workspace with memory system | Ready |
| `saas-starter` | SaaS starter with Express, JWT auth, Razorpay billing, Prisma | Ready |
| `nextjs-saas` | Next.js 14 SaaS with NextAuth, Razorpay, Prisma, Tailwind | Ready |
| `react-native` | React Native with auth, navigation, Razorpay payments | Ready |
| `whatsapp-bot` | WhatsApp Business API bot (India-focused) | Ready |
| `ai-agent-memory` | AI agent with long-term vector memory | Ready |
| `ci-cd` | GitHub Actions CI/CD workflows | Ready |
| `shopify-app` | Shopify app with Next.js + Prisma + Billing | WIP |

---

## Quick Start

### Use with Claude Code

Add to your Claude Code MCP config (`~/.claude.json` or project `.mcp.json`):

```json
{
  "mcpServers": {
    "boilerforge": {
      "command": "npx",
      "args": ["@cometforge/boilerforge"]
    }
  }
}
```

Then in Claude Code:
> "Scaffold a nextjs-saas project in ./my-app"

### Use with Cursor

Same config in your Cursor MCP settings (`~/.cursor/mcp.json`).

---

## MCP Tools

| Tool | Description |
|------|-------------|
| `list_boilerplates` | List all available boilerplates with descriptions |
| `get_boilerplate` | Get all files for a specific boilerplate |
| `scaffold_project` | Scaffold a boilerplate into a target directory |

---

## Local Development

```bash
git clone https://github.com/mrkt365/boilerforge.git
cd boilerforge
npm install
npm run build
npm test
```

---

## Contributing

Want to add a boilerplate? See [CONTRIBUTING.md](CONTRIBUTING.md).

The bar is simple: it must be production-ready, not a toy.

---

## Built by CometForge

boilerforge is a [CometForge](https://github.com/mrkt365) open source project.

MIT License — see [LICENSE](LICENSE) for details.
