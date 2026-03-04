import { describe, it, expect, afterAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  getProjectUpdateStatus,
  PROJECT_LOCK_FILENAME,
  writeProjectLockFile,
} from "../mcp-server/index";

const BOILERPLATES_DIR = path.resolve(__dirname, "../boilerplates");

interface BoilerplateMetadata {
  name: string;
  description: string;
  version: string;
  tags: string[];
  stack: string[];
  author: string;
  changelog: Array<{ version: string; date: string; notes: string }>;
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

function searchBoilerplates(
  query: string
): Array<{ name: string; description: string; tags: string[] }> {
  const q = query.toLowerCase();
  const boilerplates = getBoilerplates();
  const results: Array<{ name: string; description: string; tags: string[] }> = [];

  for (const bp of boilerplates) {
    const meta = getBoilerplateMetadata(bp);
    if (meta) {
      const searchable = [meta.name, meta.description, ...meta.tags, ...meta.stack]
        .join(" ")
        .toLowerCase();
      if (searchable.includes(q)) {
        results.push({ name: bp, description: meta.description, tags: meta.tags });
      }
    } else {
      let searchable = bp.toLowerCase();
      const readmePath = path.join(BOILERPLATES_DIR, bp, "README.md");
      if (fs.existsSync(readmePath)) {
        const content = fs.readFileSync(readmePath, "utf-8").slice(0, 200);
        searchable += " " + content.toLowerCase();
      }
      if (searchable.includes(q)) {
        const firstLine = fs.existsSync(readmePath)
          ? fs.readFileSync(readmePath, "utf-8").split("\n").find((l) => l.trim() && !l.startsWith("#"))?.trim() || bp
          : bp;
        results.push({ name: bp, description: firstLine, tags: [] });
      }
    }
  }

  return results;
}

function getBoilerplates(): string[] {
  return fs
    .readdirSync(BOILERPLATES_DIR)
    .filter((f) => fs.statSync(path.join(BOILERPLATES_DIR, f)).isDirectory())
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

function getBoilerplateFiles(name: string): Record<string, string> {
  const sanitized = validateBoilerplateName(name);
  const dir = path.join(BOILERPLATES_DIR, sanitized);
  const files: Record<string, string> = {};

  function walk(current: string, rel: string) {
    for (const entry of fs.readdirSync(current)) {
      const full = path.join(current, entry);
      const relPath = rel ? `${rel}/${entry}` : entry;
      const stat = fs.lstatSync(full);
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

describe("list_boilerplates", () => {
  it("returns an array of boilerplate names", () => {
    const list = getBoilerplates();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
  });

  it("includes expected boilerplates", () => {
    const list = getBoilerplates();
    expect(list).toContain("openclaw-agent");
    expect(list).toContain("saas-starter");
    expect(list).toContain("react-native");
    expect(list).toContain("nextjs-saas");
    expect(list).toContain("whatsapp-bot");
    expect(list).toContain("ai-agent-memory");
    expect(list).toContain("ci-cd");
  });

  it("returns sorted names", () => {
    const list = getBoilerplates();
    const sorted = [...list].sort();
    expect(list).toEqual(sorted);
  });
});

describe("get_boilerplate", () => {
  it("returns files for a valid boilerplate", () => {
    const files = getBoilerplateFiles("openclaw-agent");
    expect(Object.keys(files).length).toBeGreaterThan(0);
    expect(files["README.md"]).toBeDefined();
  });

  it("throws for non-existent boilerplate", () => {
    expect(() => getBoilerplateFiles("does-not-exist")).toThrow(
      "Boilerplate not found"
    );
  });

  it("prevents path traversal", () => {
    expect(() => getBoilerplateFiles("../package.json")).toThrow(
      "Invalid boilerplate name"
    );
    expect(() => getBoilerplateFiles("foo/../../etc")).toThrow(
      "Invalid boilerplate name"
    );
  });

  it("rejects empty boilerplate name", () => {
    expect(() => getBoilerplateFiles("")).toThrow("Boilerplate name is required");
    expect(() => getBoilerplateFiles("   ")).toThrow("Boilerplate name is required");
  });

  it("returns all files recursively", () => {
    const files = getBoilerplateFiles("react-native");
    const paths = Object.keys(files);
    expect(paths.some((p) => p.includes("/"))).toBe(true);
  });
});

describe("search_boilerplates", () => {
  it("returns matches for a known tag", () => {
    const results = searchBoilerplates("saas");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.name === "saas-starter" || r.name === "nextjs-saas")).toBe(true);
  });

  it("returns matches for a stack keyword", () => {
    const results = searchBoilerplates("prisma");
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.name).toBeTruthy();
      expect(r.description).toBeTruthy();
    }
  });

  it("returns empty array for non-matching query", () => {
    const results = searchBoilerplates("zzz-nonexistent-xyz");
    expect(results).toEqual([]);
  });

  it("is case-insensitive", () => {
    const lower = searchBoilerplates("typescript");
    const upper = searchBoilerplates("TypeScript");
    expect(lower.length).toBe(upper.length);
    expect(lower.map((r) => r.name).sort()).toEqual(upper.map((r) => r.name).sort());
  });

  it("matches against name and description fields", () => {
    const results = searchBoilerplates("whatsapp");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe("whatsapp-bot");
    expect(results[0].tags.length).toBeGreaterThan(0);
  });

  it("returns description and tags in results", () => {
    const results = searchBoilerplates("shopify");
    expect(results.length).toBe(1);
    expect(results[0].description).toBeTruthy();
    expect(Array.isArray(results[0].tags)).toBe(true);
  });
});

describe("boilerplate.json validation", () => {
  const boilerplates = getBoilerplates();

  it("every boilerplate has a boilerplate.json", () => {
    for (const bp of boilerplates) {
      const metaPath = path.join(BOILERPLATES_DIR, bp, "boilerplate.json");
      expect(fs.existsSync(metaPath), `${bp} missing boilerplate.json`).toBe(true);
    }
  });

  it("every boilerplate.json has required fields", () => {
    for (const bp of boilerplates) {
      const meta = getBoilerplateMetadata(bp);
      expect(meta, `${bp} failed to parse`).not.toBeNull();
      expect(meta!.name, `${bp} missing name`).toBeTruthy();
      expect(meta!.description, `${bp} missing description`).toBeTruthy();
      expect(meta!.version, `${bp} invalid version`).toMatch(/^\d+\.\d+\.\d+$/);
      expect(Array.isArray(meta!.tags), `${bp} tags not array`).toBe(true);
      expect(meta!.tags.length, `${bp} needs tags`).toBeGreaterThan(0);
      expect(Array.isArray(meta!.stack), `${bp} stack not array`).toBe(true);
      expect(meta!.stack.length, `${bp} needs stack`).toBeGreaterThan(0);
      expect(meta!.author, `${bp} missing author`).toBeTruthy();
    }
  });

  it("every boilerplate.json has a valid changelog", () => {
    for (const bp of boilerplates) {
      const meta = getBoilerplateMetadata(bp)!;
      expect(Array.isArray(meta.changelog), `${bp} changelog not array`).toBe(true);
      expect(meta.changelog.length, `${bp} needs changelog`).toBeGreaterThan(0);
      for (const entry of meta.changelog) {
        expect(entry.version).toMatch(/^\d+\.\d+\.\d+$/);
        expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(entry.notes).toBeTruthy();
      }
    }
  });

  it("metadata version matches latest changelog version", () => {
    for (const bp of boilerplates) {
      const meta = getBoilerplateMetadata(bp)!;
      expect(meta.version, `${bp} version mismatch`).toBe(meta.changelog[0].version);
    }
  });
});

describe("scaffold_project", () => {
  const tmpDir = path.resolve(__dirname, "../.test-scaffold-output");

  afterAll(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  it("scaffolds files into a target directory", () => {
    const files = getBoilerplateFiles("openclaw-agent");
    const targetPath = path.resolve(tmpDir);
    for (const [relPath, content] of Object.entries(files)) {
      const fullPath = path.join(targetPath, relPath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content);
    }
    writeProjectLockFile(targetPath, "openclaw-agent");

    expect(fs.existsSync(path.join(targetPath, "README.md"))).toBe(true);
    expect(fs.existsSync(path.join(targetPath, "SOUL.md"))).toBe(true);
    expect(fs.existsSync(path.join(targetPath, PROJECT_LOCK_FILENAME))).toBe(true);

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true });
  });

  it("preserves file content during scaffolding", () => {
    const files = getBoilerplateFiles("openclaw-agent");
    const targetPath = path.resolve(tmpDir);

    for (const [relPath, content] of Object.entries(files)) {
      const fullPath = path.join(targetPath, relPath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content);
    }
    writeProjectLockFile(targetPath, "openclaw-agent");

    const originalReadme = files["README.md"];
    const scaffoldedReadme = fs.readFileSync(
      path.join(targetPath, "README.md"),
      "utf-8"
    );
    expect(scaffoldedReadme).toBe(originalReadme);

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true });
  });

  it("writes a valid project lockfile", () => {
    const targetPath = path.resolve(tmpDir);
    fs.mkdirSync(targetPath, { recursive: true });
    const lock = writeProjectLockFile(targetPath, "openclaw-agent");
    const lockPath = path.join(targetPath, PROJECT_LOCK_FILENAME);

    expect(fs.existsSync(lockPath)).toBe(true);
    expect(lock.boilerplate).toBe("openclaw-agent");
    expect(lock.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(lock.scaffoldedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(lock.source).toBe("@cometforge/boilerforge");

    const parsed = JSON.parse(fs.readFileSync(lockPath, "utf-8")) as {
      boilerplate: string;
      version: string;
      source: string;
    };
    expect(parsed.boilerplate).toBe("openclaw-agent");
    expect(parsed.version).toBe(getBoilerplateMetadata("openclaw-agent")!.version);
    expect(parsed.source).toBe("@cometforge/boilerforge");

    fs.rmSync(tmpDir, { recursive: true });
  });
});

describe("check_project_updates", () => {
  const updateTmpDir = path.resolve(__dirname, "../.test-update-check-output");

  afterAll(() => {
    if (fs.existsSync(updateTmpDir)) {
      fs.rmSync(updateTmpDir, { recursive: true });
    }
  });

  it("returns up-to-date when lockfile matches latest version", () => {
    fs.mkdirSync(updateTmpDir, { recursive: true });
    const lock = writeProjectLockFile(updateTmpDir, "openclaw-agent");

    const status = getProjectUpdateStatus(updateTmpDir);
    expect(status.status).toBe("up-to-date");
    expect(status.boilerplate).toBe("openclaw-agent");
    expect(status.lockedVersion).toBe(lock.version);
    expect(status.latestVersion).toBe(lock.version);
    expect(status.updateAvailable).toBe(false);

    fs.rmSync(updateTmpDir, { recursive: true });
  });

  it("returns update-available when lockfile version is older", () => {
    fs.mkdirSync(updateTmpDir, { recursive: true });
    const lockPath = path.join(updateTmpDir, PROJECT_LOCK_FILENAME);
    fs.writeFileSync(
      lockPath,
      JSON.stringify(
        {
          boilerplate: "openclaw-agent",
          version: "0.0.1",
          scaffoldedAt: "2026-01-01T00:00:00.000Z",
          source: "@cometforge/boilerforge",
        },
        null,
        2
      ),
      "utf-8"
    );

    const status = getProjectUpdateStatus(updateTmpDir);
    expect(status.status).toBe("update-available");
    expect(status.updateAvailable).toBe(true);
    expect(status.latestVersion).toBe(getBoilerplateMetadata("openclaw-agent")!.version);

    fs.rmSync(updateTmpDir, { recursive: true });
  });

  it("returns lockfile-missing when lockfile does not exist", () => {
    if (fs.existsSync(updateTmpDir)) {
      fs.rmSync(updateTmpDir, { recursive: true });
    }
    fs.mkdirSync(updateTmpDir, { recursive: true });

    const status = getProjectUpdateStatus(updateTmpDir);
    expect(status.status).toBe("lockfile-missing");
    expect(status.updateAvailable).toBe(false);

    fs.rmSync(updateTmpDir, { recursive: true });
  });
});
