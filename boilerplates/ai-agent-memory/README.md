# ai-agent-memory boilerplate

Production-ready AI agent with long-term memory using vector search.

## Features
- **Short-term memory** — conversation context window
- **Long-term memory** — vector DB (pgvector or Chroma)
- **Episodic memory** — timestamped event log
- **Semantic search** — find relevant past context
- **Memory decay** — TTL and importance scoring
- **BYOK** — bring your own OpenAI/Anthropic key

## Stack
- TypeScript / Node.js
- OpenAI / Anthropic SDK (BYOK)
- pgvector or ChromaDB
- Ruflo for agent orchestration (optional)

## Structure
```
src/
├── agent/          # Agent core logic
├── memory/         # Memory store implementations
│   ├── short-term.ts
│   ├── long-term.ts
│   └── episodic.ts
├── tools/          # Agent tools
└── index.ts        # Entry point
```

## Via boilerforge MCP
```
"Scaffold an ai-agent-memory project in ./my-agent"
```
