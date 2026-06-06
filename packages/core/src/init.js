// ============================================================
// init.js — devops-guard init
// One-time project setup command.
// Installs Husky and writes pre-commit hooks for Gate 1 + Gate 2.
// Creates a guard.config.js template in the project root.
// ============================================================

import fs           from 'fs'
import path         from 'path'
import { execSync } from 'child_process'
import { log, divider, COLORS } from './utils/colors.js'

const TARGET_DIR = process.cwd()

export async function runInit() {
  console.log()
  divider('cyan')
  log('cyan', `${COLORS.bold}  🛡️  DevOps-Guard — Project Setup`)
  log('dim',  `  Configuring Quality Gates for: ${TARGET_DIR}`)
  divider('cyan')
  console.log()

  // ─── Step 1: Check for package.json ────────────────────────
  const pkgPath = path.join(TARGET_DIR, 'package.json')
  if (!fs.existsSync(pkgPath)) {
    log('red', `  ✗ No package.json found. Run 'npm init' first.`)
    process.exit(1)
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
  log('green', `  ✓ Found package.json (${pkg.name || 'unnamed project'})`)

  // ─── Step 2: Install devops-guard if not already present ───
  const allDeps = {
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {}),
  }
  if (!allDeps['devops-guard']) {
    log('dim', '  Installing devops-guard...')
    try {
      execSync('npm install --save-dev devops-guard', { cwd: TARGET_DIR, stdio: 'inherit' })
      log('green', '  ✓ devops-guard installed')
    } catch {
      log('yellow', '  ⚠ Could not auto-install devops-guard. Add it manually: npm install --save-dev devops-guard')
    }
  } else {
    log('green', '  ✓ devops-guard already installed')
  }

  // ─── Step 3: Install Husky ──────────────────────────────────
  if (!allDeps['husky']) {
    log('dim', '  Installing husky...')
    try {
      execSync('npm install --save-dev husky', { cwd: TARGET_DIR, stdio: 'inherit' })
      log('green', '  ✓ husky installed')
    } catch {
      log('yellow', '  ⚠ Could not auto-install husky.')
    }
  } else {
    log('green', '  ✓ husky already installed')
  }

  // ─── Step 4: Init Husky ─────────────────────────────────────
  const huskyDir = path.join(TARGET_DIR, '.husky')
  if (!fs.existsSync(huskyDir)) {
    try {
      execSync('npx husky init', { cwd: TARGET_DIR, stdio: 'inherit' })
      log('green', '  ✓ Husky initialized (.husky/ created)')
    } catch {
      fs.mkdirSync(huskyDir, { recursive: true })
      log('yellow', '  ⚠ husky init failed — created .husky/ manually')
    }
  } else {
    log('green', '  ✓ .husky/ already exists')
  }

  // ─── Step 5: Write pre-commit hook ─────────────────────────
  const preCommitPath = path.join(huskyDir, 'pre-commit')
  const preCommitContent = `#!/usr/bin/env sh
# ============================================================
# DevOps-Guard — Husky Pre-Commit Hook v2.0
# Runs Gate 1 (Security) and Gate 2 (Dependency) before commit.
# ============================================================

echo ""
echo "  DevOps-Guard Pre-Commit Pipeline starting..."
echo ""

# ─── GATE 1: Security Scanner (HARD BLOCK) ───────────────────
echo "  [Gate 1/2] Security Scanner..."
npm run guard:scan
GATE1_EXIT=$?

if [ $GATE1_EXIT -ne 0 ]; then
  echo ""
  echo "  GATE 1 BLOCKED — Commit rejected by Security Scanner."
  echo "  Remove all secrets before committing."
  echo ""
  exit 1
fi

echo "  Gate 1 passed."
echo ""

# ─── GATE 2: Dependency Scanner (SOFT BLOCK) ─────────────────
echo "  [Gate 2/2] Dependency Scanner..."
npm run guard:dep
GATE2_EXIT=$?

if [ $GATE2_EXIT -ne 0 ]; then
  echo ""
  echo "  GATE 2 BLOCKED — Fix missing dependencies before committing."
  echo ""
  exit 1
fi

echo "  Gate 2 passed."
echo ""
echo "  All Quality Gates passed! Commit is allowed."
echo ""
`
  fs.writeFileSync(preCommitPath, preCommitContent, { mode: 0o755 })
  log('green', '  ✓ .husky/pre-commit written (Gate 1 + Gate 2)')

  // ─── Step 6: Suggest package.json scripts ──────────────────
  const hasGuardScripts = pkg.scripts?.['guard:scan']
  if (!hasGuardScripts) {
    log('yellow', '')
    log('yellow', '  ⚠ Add these scripts to your package.json:')
    console.log()
    console.log('    "scripts": {')
    console.log('      "guard:scan":  "devops-guard scan",')
    console.log('      "guard:dep":   "devops-guard dep",')
    console.log('      "guard:fix":   "devops-guard fix",')
    console.log('      "guard:kb":    "devops-guard kb",')
    console.log('      "guard:all":   "devops-guard all"')
    console.log('    }')
    console.log()
  }

  // ─── Step 7: Create guard.config.js template ───────────────
  const configPath = path.join(TARGET_DIR, 'guard.config.js')
  if (!fs.existsSync(configPath)) {
    const configContent = `// guard.config.js — DevOps-Guard configuration
// See: https://github.com/vinktrongle04/DevOps-Guard

export default {
  // Directories to skip during scanning
  ignorePaths: ['node_modules', '.git', 'dist', 'build', 'coverage', '.devops-guard'],

  // File extensions to scan
  extensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.vue', '.svelte'],

  // Severity threshold: only fail on violations at or above this level
  // Values: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  failOnSeverity: 'HIGH',

  // Custom Security Rules
  // Define company-specific tokens or patterns you want to catch
  customRules: [
    // Example:
    // {
    //   id: 'CUSTOM-001',
    //   name: 'Internal Company Token',
    //   regex: /COMP-[A-Z0-9]{20}/,
    //   severity: 'CRITICAL',
    //   description: 'Company internal access tokens must never be committed.',
    //   remediation: 'Revoke the token and use environment variables.'
    // }
  ],

  // Auto-fix behavior: 'off' | 'dry-run' | 'apply'
  fix: 'dry-run',

  // Output directory for reports and knowledge graph
  outputDir: '.devops-guard',
}
`
    fs.writeFileSync(configPath, configContent, 'utf-8')
    log('green', '  ✓ guard.config.js created')
  } else {
    log('green', '  ✓ guard.config.js already exists')
  }

  // ─── Step 8: Update .gitignore ─────────────────────────────
  const gitignorePath = path.join(TARGET_DIR, '.gitignore')
  const gitignoreEntry = '\n# DevOps-Guard generated files\n.devops-guard/\n'
  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, 'utf-8')
    if (!content.includes('.devops-guard')) {
      fs.appendFileSync(gitignorePath, gitignoreEntry, 'utf-8')
      log('green', '  ✓ .gitignore updated (.devops-guard/ added)')
    } else {
      log('green', '  ✓ .gitignore already excludes .devops-guard/')
    }
  } else {
    fs.writeFileSync(gitignorePath, `node_modules/\n.env${gitignoreEntry}`, 'utf-8')
    log('green', '  ✓ .gitignore created')
  }

  // ─── Done ───────────────────────────────────────────────────
  console.log()
  divider('green')
  log('green', `${COLORS.bold}  ✅ DevOps-Guard setup complete!`)
  console.log()
  log('dim', '  Next steps:')
  log('dim', '  1. Add guard:* scripts to your package.json (see above)')
  log('dim', '  2. Run:  devops-guard all        ← scan your project now')
  log('dim', '  3. Run:  devops-guard fix         ← preview auto-fixes')
  divider('green')
  console.log()
}
