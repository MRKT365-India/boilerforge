# 🔥 boilerforge

> The MCP-powered boilerplate registry for AI coding agents.

Stop wasting hours on project setup. Tell your AI coding agent to scaffold a production-ready project in seconds — via Model Context Protocol (MCP).

```
"Start a new Shopify app"  →  Claude Code pulls from boilerforge  →  Project scaffolded instantly
```

Inspired by 21st.dev for UI components — but for entire project boilerplates.

---

## ✨ What is boilerforge?

boilerforge is an MCP server that exposes opinionated, production-ready project starters as tools for AI coding agents.

- AI agents use it natively — no manual setup, no copy-pasting
- BYOK friendly — no infrastructure costs on your side  
- Open source — community-contributed boilerplates
- Always updated — maintained stacks, not stale templates

---

## 📦 Available Boilerplates

| Name | Description | Status |
|------|-------------|--------|
| openclaw-agent | OpenClaw AI agent workspace with memory system | ✅ Ready |
| shopify-app | Shopify app with Next.js + Prisma + Billing | 🚧 WIP |
| react-native | React Native with auth, navigation, payments | 🚧 Coming soon |
| saas-starter | SaaS starter with auth + Stripe + multi-tenancy | 🚧 Coming soon |
| ai-agent-memory | AI agent with long-term memory patterns | 🚧 Coming soon |

---

## 🚀 Quick Start

### Use with Claude Code

Add to your Claude Code config (~/.claude/config.json):

```json
{
  "mcpServers": {
    "boilerforge": {
      "command": "npx",
      "args": ["boilerforge"]
    }
  }
}
```

Then in Claude Code:
> "Scaffold an openclaw-agent project in ./my-agent"

### Use with Cursor

Same config as above in your Cursor MCP settings.

---

## 🛠 Available MCP Tools

| Tool | Description |
|------|-------------|
| list_boilerplates | List all available boilerplates |
| get_boilerplate | Get files for a specific boilerplate |
| scaffold_project | Scaffold a boilerplate into a target directory |

---

## 🤝 Contributing

Want to add a boilerplate? See CONTRIBUTING.md.

The bar is simple: it must be production-ready, not a toy.

---

## Built by CometForge

boilerforge is a CometForge open source project.

MIT License
