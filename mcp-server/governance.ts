import * as fs from "fs";
import * as path from "path";
import { analyzeProject, StackSummary } from "./stack";

export type IssueSeverity = "critical" | "warning" | "info";

export interface RuleIssue {
  id: string;
  title: string;
  severity: IssueSeverity;
  message: string;
  recommendation: string;
}

export interface RuleCheck {
  id: string;
  title: string;
  weight: number;
  passed: boolean;
  issues: RuleIssue[];
}

export interface GovernanceResult {
  score: number;
  stack: StackSummary;
  checks: RuleCheck[];
  issues: {
    critical: RuleIssue[];
    warning: RuleIssue[];
    info: RuleIssue[];
  };
  recommendations: string[];
  passed: boolean;
}

function readText(filePath: string): string {
  return fs.readFileSync(filePath, "utf-8");
}

function exists(root: string, relPath: string): boolean {
  return fs.existsSync(path.join(root, relPath));
}

function findFilesByRegex(root: string, pattern: RegExp, maxDepth = 4): string[] {
  const results: string[] = [];

  function walk(current: string, depth: number): void {
    if (depth > maxDepth) return;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (["node_modules", ".git", "dist", "build", ".next", "coverage", "tmp", "temp"].includes(entry.name)) {
        continue;
      }
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath, depth + 1);
      } else if (pattern.test(entry.name)) {
        results.push(fullPath);
      }
    }
  }

  walk(root, 0);
  return results;
}

function checkCiWorkflow(root: string): RuleCheck {
  const workflowsDir = path.join(root, ".github/workflows");
  const hasWorkflow = fs.existsSync(workflowsDir) && fs.readdirSync(workflowsDir).some((f) => f.endsWith(".yml") || f.endsWith(".yaml"));
  const issues: RuleIssue[] = [];
  if (!hasWorkflow) {
    issues.push({
      id: "ci.workflow.missing",
      title: "CI workflow missing",
      severity: "critical",
      message: "No GitHub Actions workflow found under .github/workflows.",
      recommendation: "Add a CI workflow with lint, typecheck, and tests on pull requests.",
    });
  }
  return { id: "ci-workflow", title: "CI workflow exists", weight: 12, passed: hasWorkflow, issues };
}

function checkEnvSchema(root: string): RuleCheck {
  const candidates = ["env.schema.ts", "env.schema.js", "src/env.ts", "src/env.schema.ts", "zod-env.ts", "config/env.ts"];
  const hasSchemaFile = candidates.some((candidate) => exists(root, candidate));
  const packageJsonPath = path.join(root, "package.json");
  let hasSchemaLib = false;
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(readText(packageJsonPath)) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      hasSchemaLib = Boolean(deps.zod || deps.envalid || deps.envsafe || deps["@t3-oss/env-nextjs"]);
    } catch {
      hasSchemaLib = false;
    }
  }
  const passed = hasSchemaFile || hasSchemaLib;
  const issues: RuleIssue[] = [];
  if (!passed) {
    issues.push({
      id: "env.schema.missing",
      title: "Environment schema validation missing",
      severity: "warning",
      message: "No evidence of runtime environment validation was detected.",
      recommendation: "Add environment schema validation (for example using zod/envalid) and fail fast on invalid env.",
    });
  }
  return { id: "env-schema", title: "Env schema validation present", weight: 10, passed, issues };
}

function checkScriptAndTests(root: string): RuleCheck {
  let hasTestScript = false;
  if (exists(root, "package.json")) {
    try {
      const pkg = JSON.parse(readText(path.join(root, "package.json"))) as { scripts?: Record<string, string> };
      hasTestScript = Boolean(pkg.scripts?.test);
    } catch {
      hasTestScript = false;
    }
  }
  const testFiles = findFilesByRegex(root, /\.(test|spec)\.(ts|tsx|js|jsx|py|go|rs)$/);
  const passed = hasTestScript && testFiles.length > 0;
  const issues: RuleIssue[] = [];
  if (!hasTestScript) {
    issues.push({
      id: "test.script.missing",
      title: "Test script missing",
      severity: "critical",
      message: "package.json is missing a test script.",
      recommendation: "Add a `test` script that runs your test suite in CI mode.",
    });
  }
  if (testFiles.length === 0) {
    issues.push({
      id: "test.files.missing",
      title: "No test files found",
      severity: "warning",
      message: "No test/spec files were discovered.",
      recommendation: "Add baseline unit/integration tests and keep them part of CI.",
    });
  }
  return { id: "tests", title: "Test script + test files exist", weight: 12, passed, issues };
}

function checkTypecheck(root: string): RuleCheck {
  let hasTypecheckScript = false;
  let hasTsConfig = exists(root, "tsconfig.json") || exists(root, "tsconfig.base.json");

  if (exists(root, "package.json")) {
    try {
      const pkg = JSON.parse(readText(path.join(root, "package.json"))) as { scripts?: Record<string, string>; devDependencies?: Record<string, string>; dependencies?: Record<string, string> };
      hasTypecheckScript = Boolean(pkg.scripts?.typecheck);
      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      hasTsConfig = hasTsConfig || Boolean(deps.typescript);
    } catch {
      // noop
    }
  }

  const passed = hasTypecheckScript || !hasTsConfig;
  const issues: RuleIssue[] = [];
  if (!passed) {
    issues.push({
      id: "typecheck.script.missing",
      title: "Typecheck script missing",
      severity: "warning",
      message: "TypeScript appears to be used but no typecheck script was found.",
      recommendation: "Add `typecheck` script (for example `tsc --noEmit`) and run it in CI.",
    });
  }

  return { id: "typecheck", title: "Typecheck script exists", weight: 10, passed, issues };
}

function checkLint(root: string): RuleCheck {
  let hasLintScript = false;
  let hasLintConfig = false;

  if (exists(root, "package.json")) {
    try {
      const pkg = JSON.parse(readText(path.join(root, "package.json"))) as { scripts?: Record<string, string> };
      hasLintScript = Boolean(pkg.scripts?.lint);
    } catch {
      // noop
    }
  }

  hasLintConfig = [".eslintrc", ".eslintrc.js", ".eslintrc.cjs", "eslint.config.js", "eslint.config.mjs", ".ruff.toml", "ruff.toml"].some((file) => exists(root, file));

  const passed = hasLintScript || hasLintConfig;
  const issues: RuleIssue[] = [];
  if (!passed) {
    issues.push({
      id: "lint.missing",
      title: "Lint configuration missing",
      severity: "warning",
      message: "No lint script or lint configuration file detected.",
      recommendation: "Add a lint tool (ESLint/Ruff/etc.) and enforce it in CI.",
    });
  }

  return { id: "lint", title: "Lint configured", weight: 10, passed, issues };
}

function checkSecurityHeaders(root: string, stack: StackSummary): RuleCheck {
  const webFramework = ["nextjs", "react", "vue", "express", "fastify", "nestjs"].includes(stack.framework || "") || exists(root, "public");
  const filesToScan = ["next.config.js", "next.config.mjs", "server.ts", "server.js", "app.ts", "app.js", "src/server.ts", "src/server.js"];
  const keywords = ["helmet", "Content-Security-Policy", "Strict-Transport-Security", "X-Frame-Options", "X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy", "headers()"]; 
  const hasHeaders = filesToScan.some((file) => {
    const full = path.join(root, file);
    if (!fs.existsSync(full)) return false;
    const content = readText(full);
    return keywords.some((keyword) => content.includes(keyword));
  });

  const passed = webFramework ? hasHeaders : true;
  const issues: RuleIssue[] = [];
  if (!passed) {
    issues.push({
      id: "security.headers.missing",
      title: "Security headers not configured",
      severity: "critical",
      message: "Web stack detected but no security headers configuration found.",
      recommendation: "Configure CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy.",
    });
  }

  return { id: "security-headers", title: "Security headers configured (for web frameworks)", weight: 10, passed, issues };
}

function checkLogging(root: string): RuleCheck {
  const fileCandidates = ["src/logger.ts", "src/lib/logger.ts", "logger.ts", "logger.js", "config/logger.ts", "config/logger.js"];
  const hasLoggingFile = fileCandidates.some((f) => exists(root, f));

  let hasLoggingDependency = false;
  if (exists(root, "package.json")) {
    try {
      const pkg = JSON.parse(readText(path.join(root, "package.json"))) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      hasLoggingDependency = Boolean(deps.pino || deps.winston || deps.bunyan || deps["@opentelemetry/api-logs"]);
    } catch {
      hasLoggingDependency = false;
    }
  }

  const passed = hasLoggingFile || hasLoggingDependency;
  const issues: RuleIssue[] = [];
  if (!passed) {
    issues.push({
      id: "logging.centralized.missing",
      title: "Centralized logging missing",
      severity: "warning",
      message: "No centralized logging setup detected.",
      recommendation: "Use a dedicated logger module (pino/winston/etc.) and route all app logs through it.",
    });
  }

  return { id: "centralized-logging", title: "Centralized logging present", weight: 8, passed, issues };
}

function checkObservability(root: string): RuleCheck {
  const observabilityFiles = ["sentry.client.config.ts", "sentry.server.config.ts", "sentry.edge.config.ts", "instrumentation.ts", "otel.ts", "opentelemetry.ts"];
  const hasObservabilityFile = observabilityFiles.some((f) => exists(root, f) || exists(root, `src/${f}`));

  let hasObservabilityDep = false;
  if (exists(root, "package.json")) {
    try {
      const pkg = JSON.parse(readText(path.join(root, "package.json"))) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      hasObservabilityDep = Boolean(deps["@sentry/node"] || deps["@sentry/nextjs"] || deps["@opentelemetry/api"] || deps["@opentelemetry/sdk-node"]);
    } catch {
      hasObservabilityDep = false;
    }
  }

  const passed = hasObservabilityFile || hasObservabilityDep;
  const issues: RuleIssue[] = [];
  if (!passed) {
    issues.push({
      id: "observability.missing",
      title: "Observability hook missing",
      severity: "info",
      message: "No Sentry/OpenTelemetry style hook detected.",
      recommendation: "Add one observability provider (Sentry or OpenTelemetry) and wire it at app startup.",
    });
  }

  return { id: "observability", title: "Observability hook present", weight: 8, passed, issues };
}

function checkDependencyHygiene(root: string): RuleCheck {
  const issues: RuleIssue[] = [];

  if (exists(root, "package.json")) {
    try {
      const pkg = JSON.parse(readText(path.join(root, "package.json"))) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      for (const [name, version] of Object.entries(deps)) {
        if (version === "latest" || version === "*" || version.toLowerCase() === "x") {
          issues.push({
            id: `deps.bad-pattern.${name}`,
            title: "Unstable dependency pin",
            severity: "warning",
            message: `Dependency ${name} uses non-deterministic version '${version}'.`,
            recommendation: "Pin dependencies to explicit versions or controlled semver ranges.",
          });
        }
      }
    } catch {
      issues.push({
        id: "deps.parse.failed",
        title: "package.json parse failed",
        severity: "warning",
        message: "Could not parse package.json to evaluate dependency hygiene.",
        recommendation: "Fix package.json formatting to keep dependency checks reliable.",
      });
    }
  }

  if (exists(root, "node_modules")) {
    issues.push({
      id: "deps.node_modules.present",
      title: "node_modules present in project tree",
      severity: "info",
      message: "node_modules directory exists in the project root.",
      recommendation: "Ensure node_modules is gitignored and not committed.",
    });
  }

  const passed = !issues.some((issue) => issue.severity === "warning" || issue.severity === "critical");
  return { id: "dependency-hygiene", title: "Dependency hygiene", weight: 10, passed, issues };
}

function checkDocsBaseline(root: string): RuleCheck {
  const hasReadme = exists(root, "README.md") || exists(root, "readme.md");
  let hasSetup = false;
  if (hasReadme) {
    const readmePath = exists(root, "README.md") ? path.join(root, "README.md") : path.join(root, "readme.md");
    const readme = readText(readmePath).toLowerCase();
    hasSetup = ["install", "setup", "getting started", "quickstart"].some((needle) => readme.includes(needle));
  }
  const passed = hasReadme && hasSetup;
  const issues: RuleIssue[] = [];
  if (!hasReadme) {
    issues.push({
      id: "docs.readme.missing",
      title: "README missing",
      severity: "warning",
      message: "No README file found.",
      recommendation: "Create README with project purpose, architecture, setup, and usage.",
    });
  } else if (!hasSetup) {
    issues.push({
      id: "docs.setup.missing",
      title: "Setup docs missing",
      severity: "info",
      message: "README exists but setup/getting-started instructions were not detected.",
      recommendation: "Add a setup section with install, run, and test commands.",
    });
  }

  return { id: "docs-baseline", title: "Docs baseline (README + setup)", weight: 10, passed, issues };
}

export function validateProject(projectPath: string): GovernanceResult {
  const root = path.resolve(projectPath);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error(`Project path does not exist or is not a directory: ${root}`);
  }

  const stack = analyzeProject(root);

  const checks: RuleCheck[] = [
    checkCiWorkflow(root),
    checkEnvSchema(root),
    checkTypecheck(root),
    checkScriptAndTests(root),
    checkLint(root),
    checkSecurityHeaders(root, stack),
    checkLogging(root),
    checkObservability(root),
    checkDependencyHygiene(root),
    checkDocsBaseline(root),
  ];

  const totalWeight = checks.reduce((acc, check) => acc + check.weight, 0);
  const score = checks.reduce((acc, check) => acc + (check.passed ? check.weight : 0), 0);

  if (totalWeight !== 100) {
    throw new Error(`Rule engine misconfigured: expected weight total 100, got ${totalWeight}`);
  }

  const allIssues = checks.flatMap((check) => check.issues);
  const issues = {
    critical: allIssues.filter((issue) => issue.severity === "critical"),
    warning: allIssues.filter((issue) => issue.severity === "warning"),
    info: allIssues.filter((issue) => issue.severity === "info"),
  };

  const recommendations = Array.from(new Set(allIssues.map((issue) => issue.recommendation)));

  return {
    score,
    stack,
    checks,
    issues,
    recommendations,
    passed: issues.critical.length === 0,
  };
}

export function doctorProject(projectPath: string): GovernanceResult {
  return validateProject(projectPath);
}
