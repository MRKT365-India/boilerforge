#!/usr/bin/env node

const { runCli } = require("../dist/mcp-server/cli.js");

runCli().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exit(1);
});
