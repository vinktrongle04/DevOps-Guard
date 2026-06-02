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

You can place a `guard.config.js` or `guard.config.json` in your project root to customize behavior.

```javascript
// guard.config.js
module.exports = {
  // Directories to ignore during scanning
  ignoreDirs: ['node_modules', 'dist', 'build', '.git'],
  
  // Specific files to ignore
  ignoreFiles: ['vite.config.js', 'eslint.config.js'],
  
  // Thresholds
  failOnCritical: true,
  failOnHigh: true,
  failOnMedium: false,
  
  // Knowledge Base path
  kbPath: './.knowledge-base'
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
