import * as fs from "fs";
import * as os from "os";
import * as path from "path";
export const PROJECT_LOCK_FILENAME = "boilerforge.lock.json";
import { analyzeProject } from "./stack";

export const LOCAL_REGISTRY_ROOT = path.join(os.homedir(), ".boilerforge", "registry");

export interface TemplateManifest {
  name: string;
  version: string;
  description?: string;
  sourcePath?: string;
  createdAt: string;
  stack?: string[];
}

export interface TemplateLock {
  boilerplate: string;
  version: string;
  scaffoldedAt: string;
  source: string;
  template: {
    name: string;
    version: string;
    registryRoot: string;
  };
  lockSchemaVersion: 1;
}

export interface ExtractResult {
  name: string;
  registryPath: string;
  filesCopied: number;
  manifestPath: string;
  sourceManifestPath: string;
}

export interface CreateResult {
  name: string;
  version: string;
  targetPath: string;
  filesCopied: number;
  lockPath: string;
}

export interface UpgradeResult {
  status: "up-to-date" | "upgraded";
  fromVersion: string;
  toVersion: string;
  migrationsApplied: string[];
  lockPath: string;
}

interface MigrationOperation {
  type: "writeFile" | "appendFile" | "deleteFile";
  path: string;
  content?: string;
}

interface MigrationFile {
  from: string;
  to: string;
  operations: MigrationOperation[];
}

function parseSemver(version: string): [number, number, number] | null {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function compareSemver(a: string, b: string): number {
  const aParsed = parseSemver(a);
  const bParsed = parseSemver(b);
  if (!aParsed || !bParsed) return a.localeCompare(b);
  for (let i = 0; i < 3; i += 1) {
    if (aParsed[i] > bParsed[i]) return 1;
    if (aParsed[i] < bParsed[i]) return -1;
  }
  return 0;
}

function sanitizeTemplateName(input: string): string {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) {
    throw new Error("Template name cannot be empty.");
  }
  if (!/^[a-z0-9][a-z0-9-_]*$/.test(trimmed)) {
    throw new Error(`Invalid template name: ${input}. Use [a-z0-9-_].`);
  }
  return trimmed;
}

function ensureDirectory(target: string): void {
  fs.mkdirSync(target, { recursive: true });
}

function isIgnored(relPath: string): boolean {
  const normalized = relPath.replace(/\\/g, "/");
  const parts = normalized.split("/");

  const ignoredDirs = new Set([
    ".git",
    "node_modules",
    "dist",
    "build",
    ".next",
    "coverage",
    ".turbo",
    ".cache",
    "tmp",
    "temp",
  ]);

  if (parts.some((part) => ignoredDirs.has(part))) return true;

  const base = parts[parts.length - 1] || "";
  if ([".env", ".env.local", ".env.production", ".DS_Store"].includes(base)) return true;
  if (base.endsWith(".log")) return true;

  return false;
}

function copyProjectFiles(sourceRoot: string, destinationRoot: string): number {
  let count = 0;

  function walk(current: string): void {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      const relPath = path.relative(sourceRoot, fullPath);
      if (!relPath) continue;
      if (isIgnored(relPath)) continue;

      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (!entry.isFile()) continue;

      const outPath = path.join(destinationRoot, relPath);
      ensureDirectory(path.dirname(outPath));
      fs.copyFileSync(fullPath, outPath);
      count += 1;
    }
  }

  walk(sourceRoot);
  return count;
}

function serializeManifest(manifest: TemplateManifest): string {
  return JSON.stringify(manifest, null, 2) + "\n";
}

function parseManifest(content: string): TemplateManifest {
  try {
    const parsed = JSON.parse(content) as TemplateManifest;
    if (!parsed.name || !parsed.version || !parsed.createdAt) {
      throw new Error("Template manifest missing required fields.");
    }
    return parsed;
  } catch {
    throw new Error("Failed to parse template manifest. Expected JSON-compatible YAML.");
  }
}

export function extractTemplate(projectPath: string, providedName?: string): ExtractResult {
  const sourceRoot = path.resolve(projectPath);
  if (!fs.existsSync(sourceRoot) || !fs.statSync(sourceRoot).isDirectory()) {
    throw new Error(`Project path does not exist or is not a directory: ${sourceRoot}`);
  }

  const inferredName = sanitizeTemplateName(providedName || path.basename(sourceRoot));
  const registryTemplateRoot = path.join(LOCAL_REGISTRY_ROOT, inferredName);
  const filesRoot = path.join(registryTemplateRoot, "files");
  const manifestPath = path.join(registryTemplateRoot, "template.yaml");

  ensureDirectory(filesRoot);
  const filesCopied = copyProjectFiles(sourceRoot, filesRoot);

  const stack = analyzeProject(sourceRoot);
  const manifest: TemplateManifest = {
    name: inferredName,
    version: "1.0.0",
    description: `Extracted from ${sourceRoot}`,
    sourcePath: sourceRoot,
    createdAt: new Date().toISOString(),
    stack: [
      ...(stack.framework ? [stack.framework] : []),
      ...stack.languages,
    ],
  };

  fs.writeFileSync(manifestPath, serializeManifest(manifest), "utf-8");

  const sourceManifestPath = path.join(sourceRoot, ".boilerforge-template.yaml");
  fs.writeFileSync(sourceManifestPath, serializeManifest(manifest), "utf-8");

  return {
    name: inferredName,
    registryPath: registryTemplateRoot,
    filesCopied,
    manifestPath,
    sourceManifestPath,
  };
}

function loadTemplateManifest(templateName: string): { root: string; filesRoot: string; migrationsRoot: string; manifest: TemplateManifest } {
  const sanitized = sanitizeTemplateName(templateName);
  const root = path.join(LOCAL_REGISTRY_ROOT, sanitized);
  const manifestPath = path.join(root, "template.yaml");
  const filesRoot = path.join(root, "files");
  const migrationsRoot = path.join(root, "migrations");

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Template not found in local registry: ${sanitized}`);
  }
  if (!fs.existsSync(filesRoot)) {
    throw new Error(`Template files directory missing: ${filesRoot}`);
  }

  const manifest = parseManifest(fs.readFileSync(manifestPath, "utf-8"));
  return { root, filesRoot, migrationsRoot, manifest };
}

function copyTemplateFiles(filesRoot: string, targetPath: string): number {
  let count = 0;

  function walk(current: string): void {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      const relPath = path.relative(filesRoot, fullPath);
      const outPath = path.join(targetPath, relPath);
      if (entry.isDirectory()) {
        ensureDirectory(outPath);
        walk(fullPath);
      } else if (entry.isFile()) {
        ensureDirectory(path.dirname(outPath));
        fs.copyFileSync(fullPath, outPath);
        count += 1;
      }
    }
  }

  walk(filesRoot);
  return count;
}

function writeTemplateLock(targetPath: string, manifest: TemplateManifest): TemplateLock {
  const lock: TemplateLock = {
    boilerplate: manifest.name,
    version: manifest.version,
    scaffoldedAt: new Date().toISOString(),
    source: "local-registry",
    template: {
      name: manifest.name,
      version: manifest.version,
      registryRoot: LOCAL_REGISTRY_ROOT,
    },
    lockSchemaVersion: 1,
  };

  fs.writeFileSync(path.join(targetPath, PROJECT_LOCK_FILENAME), JSON.stringify(lock, null, 2) + "\n", "utf-8");
  return lock;
}

export function createProjectFromTemplate(templateName: string, targetPath: string): CreateResult {
  const resolvedTarget = path.resolve(targetPath);
  const { filesRoot, manifest } = loadTemplateManifest(templateName);

  if (fs.existsSync(resolvedTarget) && fs.readdirSync(resolvedTarget).length > 0) {
    throw new Error(`Target path is not empty: ${resolvedTarget}`);
  }

  ensureDirectory(resolvedTarget);
  const filesCopied = copyTemplateFiles(filesRoot, resolvedTarget);
  writeTemplateLock(resolvedTarget, manifest);

  return {
    name: manifest.name,
    version: manifest.version,
    targetPath: resolvedTarget,
    filesCopied,
    lockPath: path.join(resolvedTarget, PROJECT_LOCK_FILENAME),
  };
}

function parseLock(projectPath: string): TemplateLock {
  const lockPath = path.join(projectPath, PROJECT_LOCK_FILENAME);
  if (!fs.existsSync(lockPath)) {
    throw new Error(`Lockfile missing: ${lockPath}`);
  }

  let parsed: TemplateLock;
  try {
    parsed = JSON.parse(fs.readFileSync(lockPath, "utf-8")) as TemplateLock;
  } catch {
    throw new Error(`Invalid lockfile JSON: ${lockPath}`);
  }

  const name = parsed.template?.name || parsed.boilerplate;
  const version = parsed.template?.version || parsed.version;

  if (!name || !version) {
    throw new Error(`Lockfile missing template name/version: ${lockPath}`);
  }

  return {
    ...parsed,
    template: {
      name,
      version,
      registryRoot: parsed.template?.registryRoot || LOCAL_REGISTRY_ROOT,
    },
    lockSchemaVersion: 1,
  };
}

function listMigrationFiles(migrationsRoot: string): string[] {
  if (!fs.existsSync(migrationsRoot)) return [];
  return fs
    .readdirSync(migrationsRoot)
    .filter((file) => file.endsWith(".json"))
    .sort((a, b) => compareSemver(a.replace(/\.json$/, ""), b.replace(/\.json$/, "")));
}

function backupIfExists(projectRoot: string, relativePath: string): void {
  const fullPath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(fullPath)) return;

  const backupRoot = path.join(projectRoot, ".boilerforge", "backups", new Date().toISOString().replace(/[:.]/g, "-"));
  const backupPath = path.join(backupRoot, relativePath);
  ensureDirectory(path.dirname(backupPath));
  fs.copyFileSync(fullPath, backupPath);
}

function applyMigration(projectRoot: string, migration: MigrationFile): void {
  for (const operation of migration.operations) {
    const rel = operation.path;
    if (!rel || rel.includes("..") || path.isAbsolute(rel)) {
      throw new Error(`Invalid migration path: ${operation.path}`);
    }

    const target = path.join(projectRoot, rel);
    if (operation.type === "writeFile") {
      backupIfExists(projectRoot, rel);
      ensureDirectory(path.dirname(target));
      fs.writeFileSync(target, operation.content || "", "utf-8");
      continue;
    }

    if (operation.type === "appendFile") {
      backupIfExists(projectRoot, rel);
      ensureDirectory(path.dirname(target));
      fs.appendFileSync(target, operation.content || "", "utf-8");
      continue;
    }

    if (operation.type === "deleteFile") {
      backupIfExists(projectRoot, rel);
      fs.rmSync(target, { force: true });
      continue;
    }

    throw new Error(`Unsupported migration operation: ${(operation as MigrationOperation).type}`);
  }
}

function readMigration(filePath: string): MigrationFile {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8")) as MigrationFile;
    if (!parsed.from || !parsed.to || !Array.isArray(parsed.operations)) {
      throw new Error("Migration file is missing required fields");
    }
    return parsed;
  } catch (error) {
    throw new Error(`Invalid migration file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function upgradeProjectFromTemplate(projectPath: string): UpgradeResult {
  const root = path.resolve(projectPath);
  const lock = parseLock(root);
  const { manifest, migrationsRoot } = loadTemplateManifest(lock.template.name);

  const fromVersion = lock.template.version;
  const toVersion = manifest.version;

  if (compareSemver(fromVersion, toVersion) >= 0) {
    return {
      status: "up-to-date",
      fromVersion,
      toVersion,
      migrationsApplied: [],
      lockPath: path.join(root, PROJECT_LOCK_FILENAME),
    };
  }

  const migrationFiles = listMigrationFiles(migrationsRoot);
  const migrationsApplied: string[] = [];
  let currentVersion = fromVersion;

  for (const file of migrationFiles) {
    const migration = readMigration(path.join(migrationsRoot, file));
    if (compareSemver(migration.to, fromVersion) <= 0) continue;
    if (compareSemver(migration.to, toVersion) > 0) continue;
    if (migration.from !== currentVersion) continue;

    applyMigration(root, migration);
    currentVersion = migration.to;
    migrationsApplied.push(`${migration.from}->${migration.to}`);
  }

  if (currentVersion !== toVersion && migrationFiles.length > 0) {
    throw new Error(`Cannot upgrade ${lock.template.name}: missing migration chain from ${fromVersion} to ${toVersion}.`);
  }

  const updatedLock: TemplateLock = {
    ...lock,
    version: toVersion,
    scaffoldedAt: lock.scaffoldedAt || new Date().toISOString(),
    template: {
      ...lock.template,
      version: toVersion,
      registryRoot: LOCAL_REGISTRY_ROOT,
    },
    source: "local-registry",
    lockSchemaVersion: 1,
  };

  fs.writeFileSync(path.join(root, PROJECT_LOCK_FILENAME), JSON.stringify(updatedLock, null, 2) + "\n", "utf-8");

  return {
    status: "upgraded",
    fromVersion,
    toVersion,
    migrationsApplied,
    lockPath: path.join(root, PROJECT_LOCK_FILENAME),
  };
}
