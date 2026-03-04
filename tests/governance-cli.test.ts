import { afterEach, describe, expect, it, vi } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { runCli } from "../mcp-server/cli";
import { analyzeProject } from "../mcp-server/stack";
import { validateProject } from "../mcp-server/governance";
import {
  LOCAL_REGISTRY_ROOT,
  PROJECT_LOCK_FILENAME,
  compareSemver,
  createProjectFromTemplate,
  extractTemplate,
  upgradeProjectFromTemplate,
} from "../mcp-server/registry";

const tempDirs: string[] = [];
const registryTemplatesToCleanup: string[] = [];

function mkTemp(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function write(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf-8");
}

function setupNodeFixture(root: string): void {
  write(
    path.join(root, "package.json"),
    JSON.stringify(
      {
        name: "fixture-app",
        version: "1.0.0",
        scripts: {
          test: "vitest run",
          typecheck: "tsc --noEmit",
          lint: "eslint .",
        },
        dependencies: {
          express: "4.19.2",
          helmet: "7.1.0",
          pino: "9.0.0",
          "@sentry/node": "8.0.0",
          zod: "3.23.8",
        },
        devDependencies: {
          typescript: "5.6.3",
        },
      },
      null,
      2
    )
  );
  write(path.join(root, "package-lock.json"), "{}");
  write(path.join(root, "tsconfig.json"), "{}");
  write(path.join(root, ".github/workflows/ci.yml"), "name: ci");
  write(path.join(root, "src/server.ts"), "import helmet from 'helmet';\napp.use(helmet());");
  write(path.join(root, "src/logger.ts"), "export const logger = console;");
  write(path.join(root, "sentry.server.config.ts"), "export default {};\n");
  write(path.join(root, "src/app.test.ts"), "describe('ok',()=>{});");
  write(path.join(root, "README.md"), "# Fixture\n\n## Setup\n\nInstall and run.");
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const dir of tempDirs.splice(0, tempDirs.length)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  for (const name of registryTemplatesToCleanup.splice(0, registryTemplatesToCleanup.length)) {
    fs.rmSync(path.join(LOCAL_REGISTRY_ROOT, name), { recursive: true, force: true });
  }
});

describe("analyze detection", () => {
  it("detects framework/language/package manager", () => {
    const root = mkTemp("boilerforge-analyze-");
    setupNodeFixture(root);

    const summary = analyzeProject(root);
    expect(summary.framework).toBe("express");
    expect(summary.languages).toContain("typescript");
    expect(summary.packageManager).toBe("npm");
  });
});

describe("validate and doctor scoring", () => {
  it("returns score and categorized issues", () => {
    const root = mkTemp("boilerforge-validate-");
    write(path.join(root, "package.json"), JSON.stringify({ name: "weak", dependencies: { express: "latest" } }, null, 2));

    const result = validateProject(root);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThan(100);
    expect(Array.isArray(result.issues.critical)).toBe(true);
    expect(Array.isArray(result.issues.warning)).toBe(true);
    expect(Array.isArray(result.issues.info)).toBe(true);
  });

  it("doctor json output includes score and stack", async () => {
    const root = mkTemp("boilerforge-doctor-json-");
    setupNodeFixture(root);

    const out: string[] = [];
    vi.spyOn(console, "log").mockImplementation((line?: unknown) => {
      out.push(String(line));
    });

    await runCli(["doctor", root, "--json"]);

    const payload = JSON.parse(out.join("\n"));
    expect(payload.score).toBeGreaterThan(0);
    expect(payload.stack).toBeDefined();
    expect(payload.issues).toBeDefined();
  });

  it("doctor ci fails when score below threshold", async () => {
    const root = mkTemp("boilerforge-doctor-ci-");
    write(path.join(root, "package.json"), JSON.stringify({ name: "tiny" }, null, 2));

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    await expect(runCli(["doctor", root, "--ci", "--min-score", "90"])).rejects.toThrow("Doctor CI gate failed");
    expect(logSpy).toHaveBeenCalled();
  });

  it("doctor ci passes when threshold is met", async () => {
    const root = mkTemp("boilerforge-doctor-ci-pass-");
    setupNodeFixture(root);

    await expect(runCli(["doctor", root, "--ci", "--min-score", "70"]))
      .resolves
      .toBeUndefined();
  });
});

describe("extract/create/upgrade local registry", () => {
  it("extract creates template metadata + files in local registry", () => {
    const templateName = `governance-template-${Date.now()}`;
    registryTemplatesToCleanup.push(templateName);

    const source = mkTemp("boilerforge-source-");
    setupNodeFixture(source);
    write(path.join(source, "node_modules/leftpad/index.js"), "module.exports={};");
    write(path.join(source, ".env"), "SECRET=1");

    const result = extractTemplate(source, templateName);
    expect(result.filesCopied).toBeGreaterThan(0);

    const templateRoot = path.join(LOCAL_REGISTRY_ROOT, templateName);
    expect(fs.existsSync(path.join(templateRoot, "template.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(templateRoot, "files", "README.md"))).toBe(true);
    expect(fs.existsSync(path.join(templateRoot, "files", "node_modules"))).toBe(false);
    expect(fs.existsSync(path.join(templateRoot, "files", ".env"))).toBe(false);
    expect(fs.existsSync(path.join(source, ".boilerforge-template.yaml"))).toBe(true);
  });

  it("create scaffolds and writes lockfile", () => {
    const templateName = `seed-template-${Date.now()}`;
    registryTemplatesToCleanup.push(templateName);

    const source = mkTemp("boilerforge-source-");
    setupNodeFixture(source);
    extractTemplate(source, templateName);

    const target = mkTemp("boilerforge-target-");
    fs.rmSync(target, { recursive: true, force: true });

    const result = createProjectFromTemplate(templateName, target);
    expect(result.filesCopied).toBeGreaterThan(0);
    expect(fs.existsSync(path.join(target, "README.md"))).toBe(true);
    expect(fs.existsSync(path.join(target, PROJECT_LOCK_FILENAME))).toBe(true);

    const lock = JSON.parse(fs.readFileSync(path.join(target, PROJECT_LOCK_FILENAME), "utf-8")) as {
      template?: { name: string; version: string };
      source?: string;
    };
    expect(lock.template?.name).toBe(templateName);
    expect(lock.source).toBe("local-registry");
  });

  it("upgrade applies mock migration chain", () => {
    const templateName = `upgrade-template-${Date.now()}`;
    registryTemplatesToCleanup.push(templateName);

    const source = mkTemp("boilerforge-source-");
    setupNodeFixture(source);
    write(path.join(source, "defaults/settings.json"), JSON.stringify({
      base: true,
      feature: { enabled: false, rollout: 0 },
    }, null, 2));
    extractTemplate(source, templateName);

    const target = mkTemp("boilerforge-upgrade-target-");
    fs.rmSync(target, { recursive: true, force: true });
    createProjectFromTemplate(templateName, target);
    write(path.join(target, "config/settings.json"), JSON.stringify({
      existing: true,
      feature: { enabled: false, previous: true },
    }, null, 2));

    const registryTemplateRoot = path.join(LOCAL_REGISTRY_ROOT, templateName);
    const manifestPath = path.join(registryTemplateRoot, "template.yaml");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as { name: string; createdAt: string };
    fs.writeFileSync(
      manifestPath,
      JSON.stringify({
        ...manifest,
        version: "1.0.1",
      }, null, 2) + "\n",
      "utf-8"
    );

    const migrationsDir = path.join(registryTemplateRoot, "migrations");
    fs.mkdirSync(migrationsDir, { recursive: true });
    fs.writeFileSync(
      path.join(migrationsDir, "1.0.1.json"),
      JSON.stringify({
        from: "1.0.0",
        to: "1.0.1",
        operations: [
          {
            type: "copyFromTemplate",
            from: "defaults/settings.json",
            path: "config/settings.json",
          },
          {
            type: "patchJSON",
            path: "config/settings.json",
            patch: {
              feature: { enabled: true, rollout: 50 },
              migrated: true,
            },
          },
          {
            type: "writeFile",
            path: "MIGRATED.md",
            content: "migration ok\n",
          },
        ],
      }, null, 2),
      "utf-8"
    );

    const result = upgradeProjectFromTemplate(target);
    expect(result.status).toBe("upgraded");
    expect(result.migrationsApplied).toContain("1.0.0->1.0.1");
    expect(fs.existsSync(path.join(target, "MIGRATED.md"))).toBe(true);

    const patched = JSON.parse(fs.readFileSync(path.join(target, "config/settings.json"), "utf-8")) as {
      base: boolean;
      feature: { enabled: boolean; rollout: number };
      migrated: boolean;
    };
    expect(patched.base).toBe(true);
    expect(patched.feature.enabled).toBe(true);
    expect(patched.feature.rollout).toBe(50);
    expect(patched.migrated).toBe(true);

    const lock = JSON.parse(fs.readFileSync(path.join(target, PROJECT_LOCK_FILENAME), "utf-8")) as {
      template: { version: string };
      version: string;
    };
    expect(compareSemver(lock.template.version, "1.0.1")).toBe(0);
    expect(compareSemver(lock.version, "1.0.1")).toBe(0);
  });

  it("create accepts strict YAML manifest and rejects invalid YAML clearly", () => {
    const yamlTemplateName = `yaml-template-${Date.now()}`;
    registryTemplatesToCleanup.push(yamlTemplateName);

    const templateRoot = path.join(LOCAL_REGISTRY_ROOT, yamlTemplateName);
    fs.mkdirSync(path.join(templateRoot, "files"), { recursive: true });
    fs.writeFileSync(
      path.join(templateRoot, "template.yaml"),
      [
        `name: ${yamlTemplateName}`,
        "version: 1.2.3",
        "createdAt: 2026-03-05T00:00:00.000Z",
        "description: YAML template",
        "stack:",
        "  - node",
      ].join("\n") + "\n",
      "utf-8"
    );
    write(path.join(templateRoot, "files", "README.md"), "# yaml template\n");

    const target = mkTemp("boilerforge-yaml-target-");
    fs.rmSync(target, { recursive: true, force: true });
    const created = createProjectFromTemplate(yamlTemplateName, target);
    expect(created.version).toBe("1.2.3");
    expect(fs.existsSync(path.join(target, "README.md"))).toBe(true);

    const invalidTemplateName = `yaml-invalid-${Date.now()}`;
    registryTemplatesToCleanup.push(invalidTemplateName);
    const invalidRoot = path.join(LOCAL_REGISTRY_ROOT, invalidTemplateName);
    fs.mkdirSync(path.join(invalidRoot, "files"), { recursive: true });
    fs.writeFileSync(path.join(invalidRoot, "template.yaml"), "name: bad\nversion: [\n", "utf-8");
    write(path.join(invalidRoot, "files", "README.md"), "# invalid\n");

    const badTarget = mkTemp("boilerforge-yaml-invalid-target-");
    fs.rmSync(badTarget, { recursive: true, force: true });
    expect(() => createProjectFromTemplate(invalidTemplateName, badTarget)).toThrow(
      /Failed to parse template manifest at .*Expected valid YAML mapping/
    );

    const missingFieldTemplateName = `yaml-missing-field-${Date.now()}`;
    registryTemplatesToCleanup.push(missingFieldTemplateName);
    const missingRoot = path.join(LOCAL_REGISTRY_ROOT, missingFieldTemplateName);
    fs.mkdirSync(path.join(missingRoot, "files"), { recursive: true });
    fs.writeFileSync(
      path.join(missingRoot, "template.yaml"),
      [
        `name: ${missingFieldTemplateName}`,
        "version: 1.0.0",
      ].join("\n") + "\n",
      "utf-8"
    );
    write(path.join(missingRoot, "files", "README.md"), "# missing\n");

    const missingTarget = mkTemp("boilerforge-yaml-missing-target-");
    fs.rmSync(missingTarget, { recursive: true, force: true });
    expect(() => createProjectFromTemplate(missingFieldTemplateName, missingTarget)).toThrow(
      /missing required string field 'createdAt'/
    );
  });
});

it("registry root constant points to ~/.boilerforge/registry", () => {
  expect(LOCAL_REGISTRY_ROOT.endsWith(path.join(".boilerforge", "registry"))).toBe(true);
});
