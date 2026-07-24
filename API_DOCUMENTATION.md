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

## 3. Node.js API (Programmatic Usage)

You can import DevOps-Guard directly into your custom scripts or CI pipelines.

```javascript
import { security, dependency, kb, fixer } from 'devops-guard';

// Example: Run security scan programmatically
async function runCustomScan() {
  const result = await security.scan({
    targetDir: process.cwd(),
    format: 'json'
  });
  
  if (result.violations.length > 0) {
    console.log(`Found ${result.violations.length} issues.`);
  }
}
```

*More API documentation will be generated dynamically as the core packages expand.*
