# boilerforge — Claude Code Instructions

## What this project is
boilerforge is an MCP server that exposes project boilerplates as tools for AI coding agents.

## Key commands
- `npm run dev` — start MCP server in development mode
- `npm run build` — compile TypeScript
- `npm start` — run compiled server

## Adding a boilerplate
1. Create a folder under `boilerplates/your-name/`
2. Add all template files
3. Add a `README.md` explaining the boilerplate
4. The MCP server auto-discovers boilerplates from the folder

## MCP Tools available
- `list_boilerplates` — list all boilerplates
- `get_boilerplate` — get files for a boilerplate
- `scaffold_project` — scaffold into a directory

## Ruflo integration
This project has ruflo initialized. Use ruflo MCP tools for:
- Spawning coder agents for boilerplate work
- Memory storage for project decisions
- Task tracking for boilerplate roadmap
