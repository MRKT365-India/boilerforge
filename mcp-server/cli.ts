#!/usr/bin/env node
import {
  addProtectedResource,
  buildUpdatePlan,
  getLifecycleStatus,
  initProject,
  removeProtectedResource,
  updateProject,
} from "./lifecycle";
import { main as runMcpServer } from "./index";

function printHelp(): void {
  console.log(`boilerforge lifecycle CLI

Usage:
  boilerforge init <project-name> [--workflow=claude]
  boilerforge update [--dry-run]
  boilerforge protect add <category> <name>
  boilerforge protect remove <category> <name>
  boilerforge status
  boilerforge --help

Categories:
  commands | agents | skills | BOILERFORGE.md

Notes:
  - Running without arguments in non-interactive mode starts MCP server for backward compatibility.
  - Updates only managed workflow assets (BOILERFORGE.md + .claude/{commands,agents,skills}).`);
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
