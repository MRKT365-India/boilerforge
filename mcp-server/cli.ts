#!/usr/bin/env node
import * as path from "path";
import {
  addProtectedResource,
  buildUpdatePlan,
  getLifecycleStatus,
  initProject,
  removeProtectedResource,
  updateProject,
} from "./lifecycle";
import { main as runMcpServer } from "./index";
import { analyzeProject } from "./stack";
import { doctorProject, validateProject } from "./governance";
import { createProjectFromTemplate, extractTemplate, upgradeProjectFromTemplate } from "./registry";

function printHelp(): void {
  console.log(`boilerforge CLI — architecture governance + lifecycle

Primary entrypoint:
  boilerforge doctor .

Usage:
  boilerforge doctor [path] [--json] [--ci] [--min-score <number>] [--badge]
  boilerforge analyze [path]
  boilerforge validate [path] [--json]
  boilerforge extract [path] [--name <template-name>]
  boilerforge create <template-name> [target-path]
  boilerforge upgrade [path]

Lifecycle compatibility:
  boilerforge init <project-name> [--workflow=claude]
  boilerforge update [--dry-run]
  boilerforge protect add <category> <name>
  boilerforge protect remove <category> <name>
  boilerforge status
  boilerforge --help`);
}

function parseWorkflow(args: string[]): "claude" {
  const flag = args.find((arg) => arg.startsWith("--workflow="));
  if (!flag) {
    return "claude";
  }
  const workflow = flag.split("=", 2)[1];
  if (workflow !== "claude") {
    throw new Error(`Unsupported workflow: ${workflow}`);
  }
  return workflow;
}

function printUpdatePlan(prefix: string, plan: ReturnType<typeof buildUpdatePlan>): void {
  console.log(prefix);
  console.log(`- workflow: ${plan.workflow}`);
  console.log(`- version: ${plan.fromVersion} -> ${plan.toVersion}`);
  console.log(`- protected: ${plan.protectedResources.length ? plan.protectedResources.join(", ") : "(none)"}`);
  console.log("- managed paths:");
  for (const entry of plan.managedPaths) {
    console.log(`  - ${entry.path} (${entry.action})`);
  }
}

function parseOptionalPath(args: string[]): string {
  const firstPositional = args.find((arg) => !arg.startsWith("--"));
  return path.resolve(firstPositional || ".");
}

function parseValueFlag(args: string[], flag: string): string | undefined {
  const index = args.findIndex((arg) => arg === flag);
  if (index >= 0 && index < args.length - 1) {
    return args[index + 1];
  }
  const prefixed = args.find((arg) => arg.startsWith(`${flag}=`));
  if (prefixed) {
    return prefixed.split("=", 2)[1];
  }
  return undefined;
}

function renderDoctorHuman(result: ReturnType<typeof doctorProject>): void {
  console.log(`Architecture score: ${result.score}/100`);
  console.log(`Stack: framework=${result.stack.framework || "unknown"}, languages=${result.stack.languages.join(",") || "unknown"}, packageManager=${result.stack.packageManager || "unknown"}`);
  console.log(`Status: ${result.passed ? "PASS" : "FAIL"}`);

  const groups: Array<["critical" | "warning" | "info", typeof result.issues.critical]> = [
    ["critical", result.issues.critical],
    ["warning", result.issues.warning],
    ["info", result.issues.info],
  ];

  for (const [label, issues] of groups) {
    if (issues.length === 0) continue;
    console.log(`\n${label.toUpperCase()} (${issues.length})`);
    for (const issue of issues) {
      console.log(`- ${issue.title}: ${issue.message}`);
      console.log(`  ↳ ${issue.recommendation}`);
    }
  }

  if (result.recommendations.length > 0) {
    console.log("\nRecommendations:");
    for (const recommendation of result.recommendations) {
      console.log(`- ${recommendation}`);
    }
  }
}

function renderBadge(score: number): void {
  const color = score >= 85 ? "brightgreen" : score >= 70 ? "yellow" : "red";
  const badge = `![Boilerforge Score](https://img.shields.io/badge/boilerforge-${score}%2F100-${color})`;
  console.log(badge);
  console.log(`Score: ${score}/100`);
}

export async function runCli(argv = process.argv.slice(2)): Promise<void> {
  if (argv.length === 0) {
    if (!process.stdin.isTTY) {
      await runMcpServer();
      return;
    }
    printHelp();
    return;
  }

  const [command, ...rest] = argv;

  if (command === "--help" || command === "-h" || command === "help") {
    printHelp();
    return;
  }

  if (command === "doctor") {
    const targetPath = parseOptionalPath(rest);
    const asJson = rest.includes("--json");
    const ciMode = rest.includes("--ci");
    const badge = rest.includes("--badge");
    const minScoreRaw = parseValueFlag(rest, "--min-score");
    const minScore = ciMode ? Number(minScoreRaw || "70") : Number(minScoreRaw || "0");
    if (Number.isNaN(minScore)) {
      throw new Error("Invalid --min-score value. Expected a number.");
    }

    const result = doctorProject(targetPath);

    if (badge) {
      renderBadge(result.score);
    } else if (asJson) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      renderDoctorHuman(result);
    }

    if (ciMode && result.score < minScore) {
      throw new Error(`Doctor CI gate failed: score ${result.score} is below min-score ${minScore}.`);
    }

    return;
  }

  if (command === "analyze") {
    const targetPath = parseOptionalPath(rest);
    const summary = analyzeProject(targetPath);
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  if (command === "validate") {
    const targetPath = parseOptionalPath(rest);
    const asJson = rest.includes("--json");
    const result = validateProject(targetPath);

    if (asJson) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(`Validation: ${result.passed ? "PASS" : "FAIL"}`);
    console.log(`Score: ${result.score}/100`);
    console.log(`Critical: ${result.issues.critical.length}, Warning: ${result.issues.warning.length}, Info: ${result.issues.info.length}`);
    if (result.recommendations.length) {
      console.log("Recommendations:");
      for (const recommendation of result.recommendations) {
        console.log(`- ${recommendation}`);
      }
    }
    return;
  }

  if (command === "extract") {
    const name = parseValueFlag(rest, "--name");
    const pathArg = rest.find((arg, index) => !arg.startsWith("--") && (index === 0 || rest[index - 1] !== "--name"));
    const targetPath = path.resolve(pathArg || ".");
    const result = extractTemplate(targetPath, name);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "create") {
    const templateName = rest[0];
    const targetPath = path.resolve(rest[1] || ".");
    if (!templateName) {
      throw new Error("Usage: boilerforge create <template-name> [target-path]");
    }
    const result = createProjectFromTemplate(templateName, targetPath);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "upgrade") {
    const targetPath = parseOptionalPath(rest);
    const result = upgradeProjectFromTemplate(targetPath);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "init") {
    const projectName = rest.find((arg) => !arg.startsWith("--"));
    if (!projectName) {
      throw new Error("Usage: boilerforge init <project-name> [--workflow=claude]");
    }
    const workflow = parseWorkflow(rest);
    const target = initProject(projectName, workflow);
    console.log(`Initialized ${workflow} workflow project at ${target}`);
    return;
  }

  if (command === "update") {
    const dryRun = rest.includes("--dry-run");
    const plan = updateProject(process.cwd(), dryRun);
    if (dryRun) {
      printUpdatePlan("Dry run: no files changed", plan);
      return;
    }
    printUpdatePlan("Update applied", plan);
    return;
  }

  if (command === "protect") {
    const [action, category, name] = rest;
    if (!action || !category || !name || (action !== "add" && action !== "remove")) {
      throw new Error("Usage: boilerforge protect <add|remove> <category> <name>");
    }

    const manifest =
      action === "add"
        ? addProtectedResource(process.cwd(), category, name)
        : removeProtectedResource(process.cwd(), category, name);

    console.log(`Protected resources (${manifest.protected.length}): ${manifest.protected.join(", ") || "(none)"}`);
    return;
  }

  if (command === "status") {
    const status = getLifecycleStatus(process.cwd());
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

if (require.main === module) {
  runCli().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exit(1);
  });
}
