#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs";
import * as path from "path";

// Resolve boilerplates/ relative to the package root.
// When compiled, __dirname is dist/mcp-server/, so go up two levels.
// Also handle running via ts-node where __dirname is mcp-server/.
function resolveBoilerplatesDir(): string {
  // Try relative to compiled output: dist/mcp-server/ -> package root
  const fromDist = path.resolve(__dirname, "../../boilerplates");
  if (fs.existsSync(fromDist) && fs.statSync(fromDist).isDirectory()) {
    return fromDist;
  }
  // Try relative to source: mcp-server/ -> package root
  const fromSrc = path.resolve(__dirname, "../boilerplates");
  if (fs.existsSync(fromSrc) && fs.statSync(fromSrc).isDirectory()) {
    return fromSrc;
  }
  // Fallback: look relative to process.cwd()
  const fromCwd = path.resolve(process.cwd(), "boilerplates");
  if (fs.existsSync(fromCwd) && fs.statSync(fromCwd).isDirectory()) {
    return fromCwd;
  }
  return fromDist;
}

const BOILERPLATES_DIR = resolveBoilerplatesDir();
export const PROJECT_LOCK_FILENAME = "boilerforge.lock.json";


function resolvePackageVersion(): string {
  const candidates = [
    path.resolve(__dirname, '../../package.json'),
    path.resolve(__dirname, '../package.json'),
    path.resolve(process.cwd(), 'package.json'),
  ];
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        const pkg = JSON.parse(fs.readFileSync(candidate, 'utf-8')) as { version?: string };
        if (pkg.version) return pkg.version;
      }
    } catch {
      // ignore and try next candidate
    }
  }
  return '0.0.0';
}

const server = new Server(
  { name: "boilerforge", version: resolvePackageVersion() },
  { capabilities: { tools: {} } }
);

function getBoilerplates(): string[] {
  if (!fs.existsSync(BOILERPLATES_DIR)) {
    return [];
  }
  return fs
    .readdirSync(BOILERPLATES_DIR)
    .filter((f) => {
      const full = path.join(BOILERPLATES_DIR, f);
      return fs.statSync(full).isDirectory();
    })
    .sort();
}

function validateBoilerplateName(name: string): string {
  if (!name || !name.trim()) {
    throw new Error("Boilerplate name is required");
  }
  const sanitized = path.basename(name);
  if (sanitized !== name || sanitized.includes("..")) {
    throw new Error(`Invalid boilerplate name: ${name}`);
  }
  const dir = path.join(BOILERPLATES_DIR, sanitized);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    throw new Error(`Boilerplate not found: ${sanitized}`);
  }
  return sanitized;
}

interface BoilerplateMetadata {
  name: string;
  description: string;
  version: string;
  tags: string[];
  stack: string[];
  author: string;
  changelog: Array<{ version: string; date: string; notes: string }>;
}

interface ProjectLock {
  boilerplate: string;
  version: string;
  scaffoldedAt: string;
  source: string;
}

interface ProjectUpdateStatus {
  status:
    | "up-to-date"
    | "update-available"
    | "ahead-of-registry"
    | "lockfile-missing"
    | "invalid-lockfile"
    | "boilerplate-not-found";
  lockfilePath: string;
  boilerplate?: string;
  lockedVersion?: string;
  latestVersion?: string;
  updateAvailable: boolean;
}

function getBoilerplateMetadata(bpName: string): BoilerplateMetadata | null {
  const metaPath = path.join(BOILERPLATES_DIR, bpName, "boilerplate.json");
  if (fs.existsSync(metaPath)) {
    try {
      return JSON.parse(fs.readFileSync(metaPath, "utf-8"));
    } catch {
      return null;
    }
  }
  return null;
}

function parseSemver(version: string): [number, number, number] | null {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compareSemver(a: string, b: string): number {
  const aParsed = parseSemver(a);
  const bParsed = parseSemver(b);
  if (!aParsed || !bParsed) {
    return a.localeCompare(b);
  }
  for (let i = 0; i < 3; i += 1) {
    if (aParsed[i] > bParsed[i]) return 1;
    if (aParsed[i] < bParsed[i]) return -1;
  }
  return 0;
}

function getBoilerplateVersionOrThrow(boilerplate: string): string {
  const metadata = getBoilerplateMetadata(boilerplate);
  if (!metadata?.version) {
    throw new Error(`boilerplate.json missing or invalid for: ${boilerplate}`);
  }
  return metadata.version;
}

export function writeProjectLockFile(targetPath: string, boilerplate: string): ProjectLock {
  const version = getBoilerplateVersionOrThrow(boilerplate);
  const lock: ProjectLock = {
    boilerplate,
    version,
    scaffoldedAt: new Date().toISOString(),
    source: "@cometforge/boilerforge",
  };
  fs.writeFileSync(
    path.join(targetPath, PROJECT_LOCK_FILENAME),
    JSON.stringify(lock, null, 2) + "\n",
    "utf-8"
  );
  return lock;
}

export function getProjectUpdateStatus(targetPath: string): ProjectUpdateStatus {
  const lockfilePath = path.join(targetPath, PROJECT_LOCK_FILENAME);
  if (!fs.existsSync(lockfilePath)) {
    return {
      status: "lockfile-missing",
      lockfilePath,
      updateAvailable: false,
    };
  }

  let lock: ProjectLock;
  try {
    lock = JSON.parse(fs.readFileSync(lockfilePath, "utf-8")) as ProjectLock;
  } catch {
    return {
      status: "invalid-lockfile",
      lockfilePath,
      updateAvailable: false,
    };
  }

  if (!lock.boilerplate || !lock.version) {
    return {
      status: "invalid-lockfile",
      lockfilePath,
      updateAvailable: false,
    };
  }

  const latest = getBoilerplateMetadata(lock.boilerplate);
  if (!latest?.version) {
    return {
      status: "boilerplate-not-found",
      lockfilePath,
      boilerplate: lock.boilerplate,
      lockedVersion: lock.version,
      updateAvailable: false,
    };
  }

  const comparison = compareSemver(lock.version, latest.version);
  if (comparison < 0) {
    return {
      status: "update-available",
      lockfilePath,
      boilerplate: lock.boilerplate,
      lockedVersion: lock.version,
      latestVersion: latest.version,
      updateAvailable: true,
    };
  }
  if (comparison > 0) {
    return {
      status: "ahead-of-registry",
      lockfilePath,
      boilerplate: lock.boilerplate,
      lockedVersion: lock.version,
      latestVersion: latest.version,
      updateAvailable: false,
    };
  }

  return {
    status: "up-to-date",
    lockfilePath,
    boilerplate: lock.boilerplate,
    lockedVersion: lock.version,
    latestVersion: latest.version,
    updateAvailable: false,
  };
}

function searchBoilerplates(
  query: string
): Array<{ name: string; description: string; tags: string[] }> {
  const q = query.toLowerCase();
  const boilerplates = getBoilerplates();
  const results: Array<{
    name: string;
    description: string;
    tags: string[];
  }> = [];

  for (const bp of boilerplates) {
    const meta = getBoilerplateMetadata(bp);
    if (meta) {
      const searchable = [meta.name, meta.description, ...meta.tags, ...meta.stack]
        .join(" ")
        .toLowerCase();
      if (searchable.includes(q)) {
        results.push({
          name: bp,
          description: meta.description,
          tags: meta.tags,
        });
      }
    } else {
      // Fallback: match against folder name and README first 200 chars
      let searchable = bp.toLowerCase();
      const readmePath = path.join(BOILERPLATES_DIR, bp, "README.md");
      if (fs.existsSync(readmePath)) {
        const content = fs.readFileSync(readmePath, "utf-8").slice(0, 200);
        searchable += " " + content.toLowerCase();
      }
      if (searchable.includes(q)) {
        const firstLine = fs.existsSync(readmePath)
          ? fs
              .readFileSync(readmePath, "utf-8")
              .split("\n")
              .find((l) => l.trim() && !l.startsWith("#"))
              ?.trim() || bp
          : bp;
        results.push({ name: bp, description: firstLine, tags: [] });
      }
    }
  }

  return results;
}

function getBoilerplateFiles(name: string): Record<string, string> {
  const sanitized = validateBoilerplateName(name);
  const dir = path.join(BOILERPLATES_DIR, sanitized);
  const files: Record<string, string> = {};

  function walk(current: string, rel: string) {
    for (const entry of fs.readdirSync(current)) {
      const full = path.join(current, entry);
      const relPath = rel ? `${rel}/${entry}` : entry;
      const stat = fs.lstatSync(full);
      // Skip symlinks to prevent escaping the boilerplates directory
      if (stat.isSymbolicLink()) continue;
      if (stat.isDirectory()) {
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
      name: "search_boilerplates",
      description: "Search boilerplates by name, stack, or tags",
      inputSchema: {
        type: "object" as const,
        properties: {
          query: {
            type: "string" as const,
            description: "Search query to match against name, description, tags, and stack",
          },
        },
        required: ["query"],
      },
    },
    {
      name: "scaffold_project",
      description: "Scaffold a boilerplate into a target directory",
      inputSchema: {
        type: "object" as const,
        properties: {
          boilerplate: {
            type: "string" as const,
            description: "Boilerplate name",
          },
          target: {
            type: "string" as const,
            description: "Target directory path",
          },
        },
        required: ["boilerplate", "target"],
      },
    },
    {
      name: "check_project_updates",
      description: "Check whether a scaffolded project has boilerplate updates available",
      inputSchema: {
        type: "object" as const,
        properties: {
          target: {
            type: "string" as const,
            description: "Project root directory path containing boilerforge.lock.json",
          },
        },
        required: ["target"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "list_boilerplates") {
      const list = getBoilerplates();
      const descriptions: Record<string, string> = {};
      for (const bp of list) {
        const readmePath = path.join(BOILERPLATES_DIR, bp, "README.md");
        if (fs.existsSync(readmePath)) {
          const content = fs.readFileSync(readmePath, "utf-8");
          const firstLine = content.split("\n").find((l) => l.trim() && !l.startsWith("#"));
          descriptions[bp] = firstLine?.trim() || bp;
        } else {
          descriptions[bp] = bp;
        }
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { boilerplates: list, descriptions },
              null,
              2
            ),
          },
        ],
      };
    }

    if (name === "get_boilerplate") {
      const bpName = args?.name as string;
      if (!bpName) {
        return {
          content: [
            { type: "text", text: "Error: 'name' argument is required" },
          ],
          isError: true,
        };
      }
      const files = getBoilerplateFiles(bpName);
      const metadata = getBoilerplateMetadata(bpName);
      const result: { metadata: BoilerplateMetadata | null; files: Record<string, string> } = {
        metadata,
        files,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }

    if (name === "search_boilerplates") {
      const query = args?.query as string;
      if (!query) {
        return {
          content: [
            { type: "text", text: "Error: 'query' argument is required" },
          ],
          isError: true,
        };
      }
      const results = searchBoilerplates(query);
      return {
        content: [
          { type: "text", text: JSON.stringify({ results }, null, 2) },
        ],
      };
    }

    if (name === "scaffold_project") {
      const boilerplate = args?.boilerplate as string;
      const target = args?.target as string;
      if (!boilerplate || !target) {
        return {
          content: [
            {
              type: "text",
              text: "Error: 'boilerplate' and 'target' arguments are required",
            },
          ],
          isError: true,
        };
      }
      const targetPath = path.resolve(target);
      if (fs.existsSync(targetPath) && fs.readdirSync(targetPath).length > 0) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Target directory is not empty: ${targetPath}`,
            },
          ],
          isError: true,
        };
      }
      const files = getBoilerplateFiles(boilerplate);
      for (const [relPath, content] of Object.entries(files)) {
        const fullPath = path.resolve(targetPath, relPath);
        // Ensure the resolved path stays within the target directory
        if (!fullPath.startsWith(targetPath + path.sep) && fullPath !== targetPath) {
          continue;
        }
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, content);
      }
      const lock = writeProjectLockFile(targetPath, boilerplate);
      return {
        content: [
          {
            type: "text",
            text: `Scaffolded ${Object.keys(files).length} files into ${targetPath} and created ${PROJECT_LOCK_FILENAME} (${lock.version})`,
          },
        ],
      };
    }

    if (name === "check_project_updates") {
      const target = args?.target as string;
      if (!target) {
        return {
          content: [
            {
              type: "text",
              text: "Error: 'target' argument is required",
            },
          ],
          isError: true,
        };
      }
      const targetPath = path.resolve(target);
      const status = getProjectUpdateStatus(targetPath);
      return {
        content: [{ type: "text", text: JSON.stringify(status, null, 2) }],
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

export async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Failed to start boilerforge MCP server:", err);
    process.exit(1);
  });
}
