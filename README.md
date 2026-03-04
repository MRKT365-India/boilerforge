# boilerforge

[![npm version](https://img.shields.io/npm/v/@cometforge/boilerforge.svg)](https://www.npmjs.com/package/@cometforge/boilerforge)
[![license](https://img.shields.io/npm/l/@cometforge/boilerforge.svg)](https://github.com/MRKT365-India/boilerforge/blob/main/LICENSE)

> Architecture health & governance CLI for AI-built projects.

Boilerforge is now **doctor-first**. Instead of starting from a boilerplate registry, you start by checking architecture quality:

```bash
boilerforge doctor .
```

It scores your project, detects stack metadata, validates governance guardrails, and gives actionable recommendations.

---

## Quickstart

```bash
npx -y @cometforge/boilerforge@latest doctor .
```

CI gate:

```bash
boilerforge doctor . --ci --min-score 70
```

Badge snippet:

```bash
boilerforge doctor . --badge
```

Example output:

```md
![Boilerforge Score](https://img.shields.io/badge/boilerforge-78%2F100-yellow)
```

---

## Commands

### `boilerforge doctor [path]`
Architecture health report with weighted score (/100).

Flags:
- `--json` output machine-readable JSON
- `--ci` fail with non-zero exit if below threshold
- `--min-score <number>` threshold for `--ci` (default 70)
- `--badge` print markdown badge snippet + score

### `boilerforge analyze [path]`
Detect stack metadata:
- language/runtime
- framework
- package manager
- baseline project metadata

### `boilerforge validate [path]`
Evaluate architecture guardrails and return:
- pass/fail
- score
- categorized issues (`critical`, `warning`, `info`)
- recommendations

### `boilerforge extract [path] [--name <template-name>]`
Extract current project into local template registry:
- writes `.boilerforge-template.yaml` in source project
- creates template under `~/.boilerforge/registry/<template-name>/`
- copies sane files only (excludes `.git`, `node_modules`, `dist`, build artifacts, env secrets)

### `boilerforge create <template-name> [target-path]`
Scaffold a project from local registry template and write lockfile (`boilerforge.lock.json`).

### `boilerforge upgrade [path]`
Upgrade project based on lockfile + local template version:
- compares locked template version vs latest local registry
- applies migration hooks in order when present
- writes updated lockfile

---

## Doctor Rule Engine (100 points)

1. CI workflow exists
2. Env schema validation present
3. Typecheck script exists
4. Test script + test files exist
5. Lint configured
6. Security headers configured (web stacks)
7. Centralized logging present
8. Observability hook present (Sentry/OpenTelemetry/etc)
9. Dependency hygiene
10. Docs baseline (README + setup)

Outputs include:
- score `/100`
- detected stack summary
- categorized issues
- actionable recommendations

---

## Local Registry Model

Registry root:

```txt
~/.boilerforge/registry
```

Template layout:

```txt
<template>/
  template.yaml
  files/
  migrations/   (optional)
```

Lockfile (`boilerforge.lock.json`) stores template name/version/source for deterministic upgrades.

---

## Lifecycle Compatibility

Existing lifecycle workflows remain supported:

```bash
boilerforge init <project-name> [--workflow=claude]
boilerforge update [--dry-run]
boilerforge protect add <category> <name>
boilerforge protect remove <category> <name>
boilerforge status
```

---

## MCP Server Tools (unchanged)

- `list_boilerplates`
- `get_boilerplate`
- `search_boilerplates`
- `scaffold_project`
- `check_project_updates`

Running the package without CLI args in non-interactive MCP context still starts the MCP server.

---

## Development

```bash
git clone https://github.com/MRKT365-India/boilerforge.git
cd boilerforge
npm install
npm run build
npm test
```
