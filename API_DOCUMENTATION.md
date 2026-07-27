# DevOps-Guard — CLI & API Documentation

DevOps-Guard can be used either as a command-line interface (CLI) or integrated directly into your Node.js projects programmatically.

---

## 1. CLI Reference

When installed, the `devops-guard` command (or `dg`) is available in your terminal.

```bash
# Display help
devops-guard help

# Run Security Scanner (Gate 1)
devops-guard scan

# Run Security Scanner and output as JSON/SARIF
devops-guard scan --json
devops-guard scan --sarif

# Run Dependency Scanner (Gate 2)
devops-guard dep

# Rebuild Knowledge Graph & Summary
devops-guard kb

# Run auto-remediation (dry run)
devops-guard fix

# Apply auto-remediation
devops-guard fix --apply

# Run all gates sequentially
devops-guard all
```

## 2. Configuration (`guard.config.js`)

Place a `guard.config.js` in your project root to customize behavior. Only the keys below are
currently read by the scanners — see [CONTRIBUTING.md](CONTRIBUTING.md) if you'd like to help
wire up additional options.

```javascript
// guard.config.js
module.exports = {
  // Directories the security & dependency scanners skip
  ignorePaths: ['node_modules', 'dist', 'build', '.git'],

  // Extensions the dependency scanner checks for imports
  extensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs'],

  // Additional secret-detection rules, merged with the built-in 27
  customRules: [
    {
      id: 'CUSTOM-001',
      name: 'Internal API Key',
      regex: 'INTERNAL_[A-Z0-9]{32}',
      severity: 'HIGH',
    },
  ],
};
```

## 3. Module exports (advanced/scripted use)

`devops-guard` re-exports each command's CLI entry point (see
[`src/index.js`](packages/core/src/index.js)):

```javascript
import { runScan, runDepScan, runFix, runGraphBuild, runOutput, runSummary, loadConfig } from 'devops-guard';
```

These are **not** a sandboxed programmatic API — each one *is* the CLI command it backs. It reads
`process.cwd()`/`process.argv` directly (not a function parameter you pass in), prints to the
console the same way `devops-guard scan` does, and calls `process.exit()` when finished. Only call
these from a standalone script (e.g. a custom build step), never from inside a long-running
process — the `process.exit()` call will kill it.

The supported, stable interface is the CLI (Section 1 above) and the [MCP server](README.md#the-ai-native-layer).
