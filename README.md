# boilerforge

[![npm version](https://img.shields.io/npm/v/@cometforge/boilerforge.svg)](https://www.npmjs.com/package/@cometforge/boilerforge)
[![license](https://img.shields.io/npm/l/@cometforge/boilerforge.svg)](https://github.com/MRKT365-India/boilerforge/blob/main/LICENSE)

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
| `shopify-app` | Shopify app with Remix + Prisma + Polaris + Webhooks | Ready |

---

## Quick Start

### Use with Claude Code

Add to your Claude Code MCP config (`~/.claude.json` or project `.mcp.json`):

```json
{
  "mcpServers": {
    "boilerforge": {
      "command": "npx",
      "args": ["-y", "@cometforge/boilerforge@latest"]
    }
  }
}
```

Then in Claude Code:
> "Scaffold a nextjs-saas project in ./my-app"

**2-minute smoke test (recommended):**
1. Ask: `List available boilerplates`
2. Ask: `Scaffold openclaw-agent in ./test-agent`
3. Confirm files appear in `./test-agent`

### Use with Cursor

Same config in your Cursor MCP settings (`~/.cursor/mcp.json`).

---

## Lifecycle CLI (workflow packs)

boilerforge now ships a lifecycle CLI for project workflow assets:

```bash
# scaffold a new Claude workflow project
boilerforge init my-project --workflow=claude

# check managed workflow status in current project
boilerforge status

# preview updates without changing files
boilerforge update --dry-run

# apply workflow pack updates
boilerforge update

# protect local customizations from managed updates
boilerforge protect add commands implement
boilerforge protect remove commands implement
```

Manifest file created in managed projects:

```json
{
  "version": "0.1.6",
  "workflow": "claude",
  "protected": [],
  "updatedAt": "2026-03-05T00:00:00.000Z"
}
```

Managed update paths (workflow=claude):
- `BOILERFORGE.md`
- `.claude/commands`
- `.claude/agents`
- `.claude/skills`

Protected categories:
- `commands`
- `agents`
- `skills`
- `BOILERFORGE.md`

Backward compatibility: running `npx -y @cometforge/boilerforge@latest` with no args in non-interactive MCP context still starts the MCP server.

## MCP Tools

| Tool | Description |
|------|-------------|
| `list_boilerplates` | List all available boilerplates with descriptions |
| `get_boilerplate` | Get all files for a specific boilerplate |
| `search_boilerplates` | Search boilerplates by name, tags, or stack |
| `scaffold_project` | Scaffold a boilerplate into a target directory |
| `check_project_updates` | Check whether a scaffolded project has boilerplate updates available |

---

## Project lock & updates

When `scaffold_project` runs, boilerforge now writes a `boilerforge.lock.json` file in the target project root.

Lockfile shape:

```json
{
  "boilerplate": "openclaw-agent",
  "version": "1.2.0",
  "scaffoldedAt": "2026-03-04T12:34:56.789Z",
  "source": "@cometforge/boilerforge"
}
```

Use `check_project_updates` with:

```json
{
  "target": "./my-project"
}
```

The tool reads `boilerforge.lock.json`, compares its version with the current `boilerplate.json` version in the registry, and returns an update status (`up-to-date`, `update-available`, etc.).

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

boilerforge is a [CometForge](https://github.com/MRKT365-India) open source project.

MIT License — see [LICENSE](LICENSE) for details.
