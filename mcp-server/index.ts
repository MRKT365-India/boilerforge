#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs";
import * as path from "path";

const BOILERPLATES_DIR = path.resolve(__dirname, "../boilerplates");

const server = new Server(
  { name: "boilerforge", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

function getBoilerplates(): string[] {
  if (!fs.existsSync(BOILERPLATES_DIR)) {
    return [];
  }
  return fs.readdirSync(BOILERPLATES_DIR).filter((f) => {
    const full = path.join(BOILERPLATES_DIR, f);
    return fs.statSync(full).isDirectory();
  });
}

function validateBoilerplateName(name: string): string {
  // Prevent path traversal
  const sanitized = path.basename(name);
  const dir = path.join(BOILERPLATES_DIR, sanitized);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    throw new Error(`Boilerplate not found: ${sanitized}`);
  }
  return sanitized;
}

function getBoilerplateFiles(name: string): Record<string, string> {
  const sanitized = validateBoilerplateName(name);
  const dir = path.join(BOILERPLATES_DIR, sanitized);
  const files: Record<string, string> = {};

  function walk(current: string, rel: string) {
    for (const entry of fs.readdirSync(current)) {
      const full = path.join(current, entry);
      const relPath = rel ? `${rel}/${entry}` : entry;
      if (fs.statSync(full).isDirectory()) {
        walk(full, relPath);
      } else {
        files[relPath] = fs.readFileSync(full, "utf-8");
      }
    }
  }

  walk(dir, "");
  return files;
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "list_boilerplates",
      description: "List all available boilerplates in the registry",
      inputSchema: { type: "object" as const, properties: {} },
    },
    {
      name: "get_boilerplate",
      description: "Get all files for a specific boilerplate",
      inputSchema: {
        type: "object" as const,
        properties: {
          name: { type: "string" as const, description: "Boilerplate name" },
        },
        required: ["name"],
      },
    },
    {
      name: "scaffold_project",
      description: "Scaffold a boilerplate into a target directory",
      inputSchema: {
        type: "object" as const,
        properties: {
          boilerplate: { type: "string" as const, description: "Boilerplate name" },
          target: { type: "string" as const, description: "Target directory path" },
        },
        required: ["boilerplate", "target"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "list_boilerplates") {
      const list = getBoilerplates();
      return {
        content: [{ type: "text", text: JSON.stringify(list, null, 2) }],
      };
    }

    if (name === "get_boilerplate") {
      const bpName = args?.name as string;
      if (!bpName) {
        return {
          content: [{ type: "text", text: "Error: 'name' argument is required" }],
          isError: true,
        };
      }
      const files = getBoilerplateFiles(bpName);
      return {
        content: [{ type: "text", text: JSON.stringify(files, null, 2) }],
      };
    }

    if (name === "scaffold_project") {
      const boilerplate = args?.boilerplate as string;
      const target = args?.target as string;
      if (!boilerplate || !target) {
        return {
          content: [{ type: "text", text: "Error: 'boilerplate' and 'target' arguments are required" }],
          isError: true,
        };
      }
      const targetPath = path.resolve(target);
      const files = getBoilerplateFiles(boilerplate);
      for (const [relPath, content] of Object.entries(files)) {
        const fullPath = path.join(targetPath, relPath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, content);
      }
      return {
        content: [{ type: "text", text: `Scaffolded ${Object.keys(files).length} files into ${targetPath}` }],
      };
    }

    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Failed to start boilerforge MCP server:", err);
  process.exit(1);
});
