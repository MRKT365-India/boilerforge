import * as fs from "fs";
import * as path from "path";

export interface StackSummary {
  path: string;
  languages: string[];
  framework: string | null;
  packageManager: string | null;
  runtime: string[];
  metadata: Record<string, string | boolean | number | null>;
}

function exists(projectPath: string, relPath: string): boolean {
  return fs.existsSync(path.join(projectPath, relPath));
}

function readJson<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return null;
  }
}

export function detectPackageManager(projectPath: string): string | null {
  if (exists(projectPath, "pnpm-lock.yaml")) return "pnpm";
  if (exists(projectPath, "yarn.lock")) return "yarn";
  if (exists(projectPath, "bun.lockb") || exists(projectPath, "bun.lock")) return "bun";
  if (exists(projectPath, "package-lock.json")) return "npm";
  if (exists(projectPath, "poetry.lock")) return "poetry";
  if (exists(projectPath, "Pipfile.lock")) return "pipenv";
  if (exists(projectPath, "requirements.txt")) return "pip";
  if (exists(projectPath, "go.mod")) return "go";
  if (exists(projectPath, "Cargo.lock")) return "cargo";
  return null;
}

export function analyzeProject(projectPath: string): StackSummary {
  const root = path.resolve(projectPath);
  const languages = new Set<string>();
  const runtime = new Set<string>();
  let framework: string | null = null;
  const metadata: Record<string, string | boolean | number | null> = {};

  const packageJsonPath = path.join(root, "package.json");
  const packageJson = exists(root, "package.json")
    ? readJson<{ name?: string; scripts?: Record<string, string>; dependencies?: Record<string, string>; devDependencies?: Record<string, string> }>(packageJsonPath)
    : null;

  if (packageJson) {
    languages.add("javascript");
    runtime.add("node");

    if (exists(root, "tsconfig.json") || exists(root, "tsconfig.base.json")) {
      languages.add("typescript");
    }

    const deps = {
      ...(packageJson.dependencies || {}),
      ...(packageJson.devDependencies || {}),
    };

    if (deps.next) framework = "nextjs";
    else if (deps.nuxt) framework = "nuxt";
    else if (deps.react || deps["react-dom"]) framework = "react";
    else if (deps.vue) framework = "vue";
    else if (deps.svelte) framework = "svelte";
    else if (deps.express) framework = "express";
    else if (deps.fastify) framework = "fastify";
    else if (deps.nestjs || deps["@nestjs/core"]) framework = "nestjs";

    metadata.packageName = packageJson.name || null;
    metadata.hasScripts = Boolean(packageJson.scripts && Object.keys(packageJson.scripts).length > 0);
  }

  if (exists(root, "pyproject.toml") || exists(root, "requirements.txt") || exists(root, "Pipfile")) {
    languages.add("python");
    runtime.add("python");
    framework = framework || (exists(root, "manage.py") ? "django" : exists(root, "app.py") || exists(root, "main.py") ? "python-app" : null);
  }

  if (exists(root, "go.mod")) {
    languages.add("go");
    runtime.add("go");
    framework = framework || "go";
  }

  if (exists(root, "Cargo.toml")) {
    languages.add("rust");
    runtime.add("rust");
    framework = framework || "rust";
  }

  const packageManager = detectPackageManager(root);
  metadata.hasDocker = exists(root, "Dockerfile") || exists(root, "docker-compose.yml") || exists(root, "docker-compose.yaml");
  metadata.hasGithubActions = exists(root, ".github/workflows");

  return {
    path: root,
    languages: Array.from(languages).sort(),
    framework,
    packageManager,
    runtime: Array.from(runtime).sort(),
    metadata,
  };
}
