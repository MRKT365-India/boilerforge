import { afterEach, describe, expect, it } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  PROJECT_MANIFEST_FILENAME,
  addProtectedResource,
  getCurrentPackageVersion,
  initProject,
  readManifest,
  removeProtectedResource,
  updateProject,
} from "../mcp-server/lifecycle";

const tempRoots: string[] = [];

function makeTempRoot(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "boilerforge-test-"));
  tempRoots.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempRoots.splice(0, tempRoots.length)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("lifecycle CLI flows", () => {
  it("init creates manifest and workflow files", () => {
    const root = makeTempRoot();
    const target = initProject("demo", "claude", root);

    expect(fs.existsSync(path.join(target, PROJECT_MANIFEST_FILENAME))).toBe(true);
    expect(fs.existsSync(path.join(target, "BOILERFORGE.md"))).toBe(true);
    expect(fs.existsSync(path.join(target, ".claude/commands/implement.md"))).toBe(true);
    expect(fs.existsSync(path.join(target, ".claude/agents/task-executor.md"))).toBe(true);
    expect(fs.existsSync(path.join(target, ".claude/skills/project-context/SKILL.md"))).toBe(true);

    const manifest = readManifest(target);
    expect(manifest.workflow).toBe("claude");
    expect(manifest.protected).toEqual([]);
    expect(manifest.version).toBe(getCurrentPackageVersion());
  });

  it("update dry-run returns plan without mutating manifest", () => {
    const root = makeTempRoot();
    const target = initProject("demo", "claude", root);
    const manifestPath = path.join(target, PROJECT_MANIFEST_FILENAME);

    const before = fs.readFileSync(manifestPath, "utf-8");
    const plan = updateProject(target, true);
    const after = fs.readFileSync(manifestPath, "utf-8");

    expect(plan.managedPaths.length).toBeGreaterThan(0);
    expect(plan.managedPaths.some((entry) => entry.path === "BOILERFORGE.md")).toBe(true);
    expect(after).toBe(before);
  });

  it("protect add/remove modifies manifest", () => {
    const root = makeTempRoot();
    const target = initProject("demo", "claude", root);

    const withProtection = addProtectedResource(target, "commands", "implement");
    expect(withProtection.protected).toContain("commands/implement");

    const withoutProtection = removeProtectedResource(target, "commands", "implement");
    expect(withoutProtection.protected).not.toContain("commands/implement");
  });

  it("update preserves protected resource modifications", () => {
    const root = makeTempRoot();
    const target = initProject("demo", "claude", root);

    addProtectedResource(target, "commands", "implement");

    const protectedPath = path.join(target, ".claude/commands/implement.md");
    const unprotectedPath = path.join(target, ".claude/commands/review.md");

    fs.writeFileSync(protectedPath, "# implement\n\nLOCAL CUSTOM PROTECTED\n", "utf-8");
    fs.writeFileSync(unprotectedPath, "# review\n\nLOCAL CUSTOM UNPROTECTED\n", "utf-8");

    updateProject(target, false);

    const protectedContent = fs.readFileSync(protectedPath, "utf-8");
    const unprotectedContent = fs.readFileSync(unprotectedPath, "utf-8");

    expect(protectedContent).toContain("LOCAL CUSTOM PROTECTED");
    expect(unprotectedContent).not.toContain("LOCAL CUSTOM UNPROTECTED");
  });
});
