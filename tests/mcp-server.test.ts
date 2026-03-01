import { describe, it, expect, afterAll } from "vitest";
import * as fs from "fs";
import * as path from "path";

const BOILERPLATES_DIR = path.resolve(__dirname, "../boilerplates");

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

    expect(fs.existsSync(path.join(targetPath, "README.md"))).toBe(true);
    expect(fs.existsSync(path.join(targetPath, "SOUL.md"))).toBe(true);

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

    const originalReadme = files["README.md"];
    const scaffoldedReadme = fs.readFileSync(
      path.join(targetPath, "README.md"),
      "utf-8"
    );
    expect(scaffoldedReadme).toBe(originalReadme);

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true });
  });
});
