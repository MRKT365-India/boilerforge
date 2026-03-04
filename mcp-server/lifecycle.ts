import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export const PROJECT_MANIFEST_FILENAME = ".boilerforge-project.json";

export interface ProjectManifest {
  version: string;
  workflow: "claude";
  protected: string[];
  updatedAt: string;
}

const WORKFLOW_MANAGED_PATHS: Record<string, string[]> = {
  claude: ["BOILERFORGE.md", ".claude/commands", ".claude/agents", ".claude/skills"],
};

function resolvePackageVersion(): string {
  const candidates = [
    path.resolve(__dirname, "../package.json"),
    path.resolve(__dirname, "../../package.json"),
    path.resolve(process.cwd(), "package.json"),
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        const pkg = JSON.parse(fs.readFileSync(candidate, "utf-8")) as { version?: string };
        if (pkg.version) {
          return pkg.version;
        }
      }
    } catch {
      // ignore and continue
    }
  }

  return "0.0.0";
}

export function getCurrentPackageVersion(): string {
  return resolvePackageVersion();
}

export function getManagedPathsForWorkflow(workflow: string): string[] {
  const managed = WORKFLOW_MANAGED_PATHS[workflow];
  if (!managed) {
    throw new Error(`Unsupported workflow: ${workflow}`);
  }
  return managed;
}

function resolveWorkflowPacksBaseDir(): string {
  const fromDist = path.resolve(__dirname, "../../workflow-packs");
  if (fs.existsSync(fromDist)) {
    return fromDist;
  }
  const fromSrc = path.resolve(__dirname, "../workflow-packs");
  if (fs.existsSync(fromSrc)) {
    return fromSrc;
  }
  const fromCwd = path.resolve(process.cwd(), "workflow-packs");
  if (fs.existsSync(fromCwd)) {
    return fromCwd;
  }
  return fromDist;
}

function resolveWorkflowPackDir(workflow: string): string {
  const dir = path.join(resolveWorkflowPacksBaseDir(), workflow);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    throw new Error(`Workflow pack not found: ${workflow}`);
  }
  return dir;
}

function ensureWithinProject(projectRoot: string, relativePath: string): string {
  const resolved = path.resolve(projectRoot, relativePath);
  if (!resolved.startsWith(projectRoot + path.sep) && resolved !== projectRoot) {
    throw new Error(`Unsafe path outside project: ${relativePath}`);
  }
  return resolved;
}

function copyDirectory(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function copyPath(src: string, dest: string): void {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (fs.existsSync(dest)) {
      fs.rmSync(dest, { recursive: true, force: true });
    }
    copyDirectory(src, dest);
    return;
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function writeManifest(projectRoot: string, manifest: ProjectManifest): void {
  const manifestPath = path.join(projectRoot, PROJECT_MANIFEST_FILENAME);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf-8");
}

export function readManifest(projectRoot: string): ProjectManifest {
  const manifestPath = path.join(projectRoot, PROJECT_MANIFEST_FILENAME);
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest not found: ${PROJECT_MANIFEST_FILENAME}`);
  }

  let parsed: Partial<ProjectManifest>;
  try {
    parsed = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as Partial<ProjectManifest>;
  } catch {
    throw new Error(`Invalid manifest JSON: ${PROJECT_MANIFEST_FILENAME}`);
  }

  if (
    typeof parsed.version !== "string" ||
    parsed.workflow !== "claude" ||
    !Array.isArray(parsed.protected) ||
    typeof parsed.updatedAt !== "string"
  ) {
    throw new Error(`Invalid manifest format: ${PROJECT_MANIFEST_FILENAME}`);
  }

  return {
    version: parsed.version,
    workflow: parsed.workflow,
    protected: parsed.protected.filter((entry): entry is string => typeof entry === "string"),
    updatedAt: parsed.updatedAt,
  };
}

function normalizeProtectedIdentifier(category: string, name: string): string {
  if (category === "BOILERFORGE.md") {
    return "BOILERFORGE.md";
  }

  if (!["commands", "agents", "skills"].includes(category)) {
    throw new Error(`Invalid category: ${category}. Use commands, agents, skills, or BOILERFORGE.md`);
  }

  const trimmed = name.trim();
  if (!trimmed || trimmed.includes("..") || trimmed.startsWith("/")) {
    throw new Error(`Invalid name: ${name}`);
  }

  return `${category}/${trimmed}`;
}

function identifierToRelativePath(identifier: string): string {
  if (identifier === "BOILERFORGE.md") {
    return "BOILERFORGE.md";
  }
  const [category, name] = identifier.split("/", 2);
  if (!name) {
    throw new Error(`Invalid protected identifier: ${identifier}`);
  }
  if (category === "commands") {
    return `.claude/commands/${name}.md`;
  }
  if (category === "agents") {
    return `.claude/agents/${name}.md`;
  }
  if (category === "skills") {
    return `.claude/skills/${name}`;
  }
  throw new Error(`Invalid protected identifier: ${identifier}`);
}

export function initProject(projectName: string, workflow: "claude" = "claude", cwd = process.cwd()): string {
  const targetPath = path.resolve(cwd, projectName);
  if (fs.existsSync(targetPath)) {
    throw new Error(`Target directory already exists: ${targetPath}`);
  }

  const workflowDir = resolveWorkflowPackDir(workflow);
  fs.mkdirSync(targetPath, { recursive: true });
  copyDirectory(workflowDir, targetPath);

  const manifest: ProjectManifest = {
    version: getCurrentPackageVersion(),
    workflow,
    protected: [],
    updatedAt: new Date().toISOString(),
  };
  writeManifest(targetPath, manifest);

  return targetPath;
}

export interface UpdatePlan {
  workflow: string;
  managedPaths: Array<{
    path: string;
    action: "create" | "replace";
  }>;
  protectedResources: string[];
  fromVersion: string;
  toVersion: string;
}

export function buildUpdatePlan(projectRoot: string): UpdatePlan {
  const manifest = readManifest(projectRoot);
  const workflowDir = resolveWorkflowPackDir(manifest.workflow);
  const managedPaths = getManagedPathsForWorkflow(manifest.workflow).map((relativePath) => {
    const sourcePath = path.join(workflowDir, relativePath);
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Managed source missing in workflow pack: ${relativePath}`);
    }
    const destinationPath = ensureWithinProject(projectRoot, relativePath);
    return {
      path: relativePath,
      action: fs.existsSync(destinationPath) ? "replace" : "create",
    } as const;
  });

  return {
    workflow: manifest.workflow,
    managedPaths,
    protectedResources: [...manifest.protected],
    fromVersion: manifest.version,
    toVersion: getCurrentPackageVersion(),
  };
}

function backupProtectedResources(projectRoot: string, protectedResources: string[]): string {
  const backupRoot = fs.mkdtempSync(path.join(os.tmpdir(), "boilerforge-protected-"));

  for (const identifier of protectedResources) {
    const relPath = identifierToRelativePath(identifier);
    const source = ensureWithinProject(projectRoot, relPath);
    if (!fs.existsSync(source)) {
      continue;
    }

    const destination = path.join(backupRoot, relPath);
    copyPath(source, destination);
  }

  return backupRoot;
}

function restoreProtectedResources(projectRoot: string, backupRoot: string, protectedResources: string[]): void {
  for (const identifier of protectedResources) {
    const relPath = identifierToRelativePath(identifier);
    const source = path.join(backupRoot, relPath);
    if (!fs.existsSync(source)) {
      continue;
    }
    const destination = ensureWithinProject(projectRoot, relPath);
    copyPath(source, destination);
  }
}

export function updateProject(projectRoot: string, dryRun = false): UpdatePlan {
  const manifest = readManifest(projectRoot);
  const workflowDir = resolveWorkflowPackDir(manifest.workflow);
  const plan = buildUpdatePlan(projectRoot);

  if (dryRun) {
    return plan;
  }

  const backupRoot = backupProtectedResources(projectRoot, manifest.protected);
  try {
    for (const relPath of getManagedPathsForWorkflow(manifest.workflow)) {
      const source = path.join(workflowDir, relPath);
      const destination = ensureWithinProject(projectRoot, relPath);
      copyPath(source, destination);
    }

    restoreProtectedResources(projectRoot, backupRoot, manifest.protected);

    const updatedManifest: ProjectManifest = {
      ...manifest,
      version: getCurrentPackageVersion(),
      updatedAt: new Date().toISOString(),
    };
    writeManifest(projectRoot, updatedManifest);
  } finally {
    fs.rmSync(backupRoot, { recursive: true, force: true });
  }

  return plan;
}

export function addProtectedResource(projectRoot: string, category: string, name: string): ProjectManifest {
  const manifest = readManifest(projectRoot);
  const identifier = normalizeProtectedIdentifier(category, name);
  if (!manifest.protected.includes(identifier)) {
    manifest.protected.push(identifier);
  }
  manifest.updatedAt = new Date().toISOString();
  writeManifest(projectRoot, manifest);
  return manifest;
}

export function removeProtectedResource(projectRoot: string, category: string, name: string): ProjectManifest {
  const manifest = readManifest(projectRoot);
  const identifier = normalizeProtectedIdentifier(category, name);
  manifest.protected = manifest.protected.filter((entry) => entry !== identifier);
  manifest.updatedAt = new Date().toISOString();
  writeManifest(projectRoot, manifest);
  return manifest;
}

export interface LifecycleStatus {
  manifest: ProjectManifest;
  packageVersion: string;
  updateAvailable: boolean;
  managedPaths: string[];
}

export function getLifecycleStatus(projectRoot: string): LifecycleStatus {
  const manifest = readManifest(projectRoot);
  const packageVersion = getCurrentPackageVersion();
  return {
    manifest,
    packageVersion,
    updateAvailable: manifest.version !== packageVersion,
    managedPaths: getManagedPathsForWorkflow(manifest.workflow),
  };
}
