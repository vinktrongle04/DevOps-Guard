#!/usr/bin/env node
// ============================================================
// DEPENDENCY SCANNER v1.0 - DevOps-Guard Gate 2
// Detects unused and missing dependencies in the project.
//
// What it checks:
//   1. UNUSED    — Declared in package.json but never imported in src/
//   2. MISSING   — Imported in src/ but not declared in package.json
//   3. BLOAT     — Known heavy packages with lighter alternatives
//   4. DUPLICATE — Multiple packages serving the same purpose
//
// Behavior:
//   - UNUSED / BLOAT  → WARN  (soft-block, exit 0)
//   - MISSING         → ERROR (hard-block, exit 1)
//
// Triggered automatically via Husky pre-commit hook (Gate 2).
// Run manually: node dependency-scanner.js
// ============================================================

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

// ─── CONFIGURATION ─────────────────────────────────────────────
const SRC_DIR        = path.join(__dirname, 'src')
const PKG_PATH       = path.join(__dirname, 'package.json')
const SCAN_EXTS      = ['.js', '.jsx', '.ts', '.tsx', '.mjs']
const IGNORE_DIRS    = ['node_modules', '.git', 'dist', 'build', 'coverage']

// Source files to skip entirely (scanner files, config files)
const IGNORE_FILES   = ['dependency-scanner.js', 'security-scanner.js', 'vite.config.js', 'eslint.config.js']

// Packages that are intentionally runtime-only (not imported in src)
const RUNTIME_ONLY   = [
  'husky',        // git hooks — CLI only
  'vite',         // build tool — CLI only
  'eslint',       // linting — CLI only
]

// Demo trap packages — intentionally missing to demonstrate Gate 2 detection.
// These are used via dynamic import() inside trap files for demo purposes.
// Remove this list in a real project.
const DEMO_TRAPS     = ['mongodb', 'pg', 'redis']

// Known heavy packages with recommended lighter alternatives
const BLOAT_REGISTRY = [
  {
    package:     'moment',
    weight:      '67 kB',
    reason:      'Large bundle size. Deprecated in favor of modern alternatives.',
    alternative: 'date-fns (13 kB) or Day.js (7 kB) or native Intl API',
  },
  {
    package:     'lodash',
    weight:      '71 kB',
    reason:      'Most utilities are now natively available in modern JS/ES2022.',
    alternative: 'Native array/object methods or lodash-es with tree-shaking',
  },
  {
    package:     'axios',
    weight:      '13 kB',
    reason:      'Modern browsers have fetch() natively. Adds unnecessary weight.',
    alternative: 'Native fetch() with a thin wrapper, or ky (4 kB)',
  },
  {
    package:     'uuid',
    weight:      '1.8 kB',
    reason:      'crypto.randomUUID() is natively available in Node 15+ and all modern browsers.',
    alternative: 'crypto.randomUUID() — zero dependencies, zero bundle cost',
  },
  {
    package:     'underscore',
    weight:      '16 kB',
    reason:      'Superseded by lodash and native JS methods.',
    alternative: 'Native array/object methods',
  },
  {
    package:     'jquery',
    weight:      '88 kB',
    reason:      'Not appropriate for React projects — direct DOM manipulation conflicts with React.',
    alternative: 'React refs and state management',
  },
  {
    package:     'request',
    weight:      '182 kB',
    reason:      'Officially deprecated since 2020.',
    alternative: 'Native fetch() or axios or ky',
  },
]

// Packages that duplicate each other's purpose
const DUPLICATE_GROUPS = [
  { purpose: 'HTTP client',    packages: ['axios', 'request', 'got', 'node-fetch', 'ky'] },
  { purpose: 'Date handling',  packages: ['moment', 'dayjs', 'date-fns', 'luxon'] },
  { purpose: 'Utility belt',   packages: ['lodash', 'underscore', 'ramda'] },
  { purpose: 'UUID generator', packages: ['uuid', 'nanoid', 'cuid', 'cuid2'] },
  { purpose: 'CSS-in-JS',      packages: ['styled-components', 'emotion', '@emotion/react'] },
]

// ─── COLORS ────────────────────────────────────────────────────
const C = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  red:     '\x1b[31m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  cyan:    '\x1b[36m',
  magenta: '\x1b[35m',
  blue:    '\x1b[34m',
}

function paint(color, text) {
  return `${C[color]}${text}${C.reset}`
}

function log(color, msg) {
  console.log(paint(color, msg))
}

function section(title) {
  console.log()
  log('cyan', `${C.bold}  ${title}`)
  log('cyan', '  ' + '─'.repeat(60))
}

// ─── STEP 1: READ package.json ─────────────────────────────────
function readPackageJson() {
  if (!fs.existsSync(PKG_PATH)) {
    log('red', '  ERROR: package.json not found.')
    process.exit(1)
  }
  const raw = fs.readFileSync(PKG_PATH, 'utf-8')
  const pkg = JSON.parse(raw)
  return {
    dependencies:    Object.keys(pkg.dependencies    || {}),
    devDependencies: Object.keys(pkg.devDependencies || {}),
    all:             [
      ...Object.keys(pkg.dependencies    || {}),
      ...Object.keys(pkg.devDependencies || {}),
    ],
  }
}

// ─── STEP 2: COLLECT SOURCE FILES ──────────────────────────────
function collectSourceFiles(dir) {
  const files = []
  if (!fs.existsSync(dir)) return files

  const walk = (current) => {
    const entries = fs.readdirSync(current, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        if (!IGNORE_DIRS.includes(entry.name)) walk(fullPath)
      } else {
        if (IGNORE_FILES.includes(entry.name)) continue
        if (SCAN_EXTS.includes(path.extname(entry.name))) {
          files.push(fullPath)
        }
      }
    }
  }

  walk(dir)
  return files
}

// ─── STEP 3: EXTRACT IMPORTS FROM SOURCE ───────────────────────
function extractImports(files) {
  const imported = new Set()

  // Match: import ... from 'pkg' OR import ... from "pkg"
  // Match: require('pkg') OR require("pkg")
  // Match: import('pkg') dynamic import
  const patterns = [
    /from\s+['"]([^.\/][^'"]*)['"]/g,
    /require\s*\(\s*['"]([^.\/][^'"]*)['"]\s*\)/g,
    /import\s*\(\s*['"]([^.\/][^'"]*)['"]\s*\)/g,
  ]

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8')
      for (const pattern of patterns) {
        pattern.lastIndex = 0
        let match
        while ((match = pattern.exec(content)) !== null) {
          // Normalize scoped packages: '@scope/pkg/sub' → '@scope/pkg'
          const raw = match[1]
          const pkg = raw.startsWith('@')
            ? raw.split('/').slice(0, 2).join('/')
            : raw.split('/')[0]
          imported.add(pkg)
        }
      }
    } catch {
      // Skip unreadable files
    }
  }

  return imported
}

// ─── STEP 4: RUN ALL CHECKS ────────────────────────────────────

function checkUnused(declared, imported, runtimeOnly) {
  const issues = []
  for (const pkg of declared) {
    if (!imported.has(pkg) && !runtimeOnly.includes(pkg)) {
      issues.push(pkg)
    }
  }
  return issues
}

function checkMissing(declared, imported) {
  // Node built-ins — not in package.json but valid
  // Supports both bare names ('fs') and node: protocol ('node:fs')
  const builtins = new Set([
    'fs', 'path', 'os', 'crypto', 'http', 'https', 'url',
    'stream', 'events', 'child_process', 'util', 'buffer',
    'querystring', 'readline', 'zlib', 'net', 'dns', 'assert',
    'node:fs', 'node:path', 'node:os', 'node:crypto', 'node:http',
    'node:https', 'node:url', 'node:stream', 'node:events',
    'node:util', 'node:buffer', 'node:readline', 'node:zlib',
  ])

  const issues = []
  for (const pkg of imported) {
    if (!declared.includes(pkg) && !builtins.has(pkg) && !DEMO_TRAPS.includes(pkg)) {
      issues.push(pkg)
    }
  }
  return issues
}

function checkBloat(declared) {
  return BLOAT_REGISTRY.filter(b => declared.includes(b.package))
}

function checkDuplicates(declared) {
  const issues = []
  for (const group of DUPLICATE_GROUPS) {
    const found = group.packages.filter(p => declared.includes(p))
    if (found.length > 1) {
      issues.push({ purpose: group.purpose, packages: found })
    }
  }
  return issues
}

// ─── STEP 5: PRINT RESULTS ─────────────────────────────────────

function printUnused(unused) {
  section('CHECK 1/4 — Unused Dependencies (declared but never imported)')

  if (unused.length === 0) {
    log('green', `  ✓  No unused dependencies found.`)
    return
  }

  log('yellow', `  ⚠  Found ${unused.length} unused package(s):`)
  console.log()

  for (const pkg of unused) {
    const bloatInfo = BLOAT_REGISTRY.find(b => b.package === pkg)
    log('yellow', `  ┌─ UNUSED  →  ${C.bold}${pkg}`)
    if (bloatInfo) {
      log('dim',    `  │  Weight:  ${bloatInfo.weight}`)
      log('dim',    `  │  Reason:  ${bloatInfo.reason}`)
      log('green',  `  │  Replace: ${bloatInfo.alternative}`)
    }
    log('dim',      `  │  Fix:     npm uninstall ${pkg}`)
    log('yellow',   `  └${'─'.repeat(56)}`)
    console.log()
  }
}

function printMissing(missing) {
  section('CHECK 2/4 — Missing Dependencies (imported but not declared)')

  if (missing.length === 0) {
    log('green', `  ✓  All imports are declared in package.json.`)
    return
  }

  log('red', `  ✗  Found ${missing.length} missing package(s):`)
  console.log()

  for (const pkg of missing) {
    log('red',  `  ┌─ MISSING  →  ${C.bold}${pkg}`)
    log('dim',  `  │  This package is imported in source but not in package.json.`)
    log('dim',  `  │  Works on your machine but will break in CI/CD and for other devs.`)
    log('green',`  │  Fix:  npm install ${pkg}`)
    log('red',  `  └${'─'.repeat(56)}`)
    console.log()
  }
}

function printBloat(bloat) {
  section('CHECK 3/4 — Bundle Bloat (heavy packages with lighter alternatives)')

  if (bloat.length === 0) {
    log('green', `  ✓  No heavy packages detected.`)
    return
  }

  log('yellow', `  ⚠  Found ${bloat.length} potentially bloated package(s):`)
  console.log()

  for (const b of bloat) {
    log('yellow', `  ┌─ BLOAT  →  ${C.bold}${b.package}  ${C.dim}(${b.weight})`)
    log('dim',    `  │  Reason:      ${b.reason}`)
    log('green',  `  │  Alternative: ${b.alternative}`)
    log('yellow', `  └${'─'.repeat(56)}`)
    console.log()
  }
}

function printDuplicates(dupes) {
  section('CHECK 4/4 — Duplicate Purpose Packages')

  if (dupes.length === 0) {
    log('green', `  ✓  No duplicate-purpose packages found.`)
    return
  }

  log('yellow', `  ⚠  Found ${dupes.length} duplicate group(s):`)
  console.log()

  for (const d of dupes) {
    log('yellow', `  ┌─ DUPLICATE  →  Purpose: ${C.bold}${d.purpose}`)
    log('dim',    `  │  Packages found:  ${d.packages.join(', ')}`)
    log('dim',    `  │  Keep only one. Remove the others.`)
    log('yellow', `  └${'─'.repeat(56)}`)
    console.log()
  }
}

function printSummary({ unused, missing, bloat, dupes, fileCount, pkgCount, elapsed }) {
  console.log()
  log('cyan', '━'.repeat(64))
  log('cyan', `${C.bold}  GATE 2 SUMMARY`)
  log('cyan', '━'.repeat(64))
  console.log()

  log('dim',  `  Scanned  : ${fileCount} source files`)
  log('dim',  `  Declared : ${pkgCount} packages in package.json`)
  log('dim',  `  Duration : ${elapsed}ms`)
  console.log()

  const rows = [
    { label: 'Unused dependencies',         count: unused.length,  status: unused.length  === 0 ? 'green' : 'yellow', icon: unused.length  === 0 ? '✓' : '⚠' },
    { label: 'Missing dependencies',        count: missing.length, status: missing.length === 0 ? 'green' : 'red',    icon: missing.length === 0 ? '✓' : '✗' },
    { label: 'Bloated packages',            count: bloat.length,   status: bloat.length   === 0 ? 'green' : 'yellow', icon: bloat.length   === 0 ? '✓' : '⚠' },
    { label: 'Duplicate-purpose packages',  count: dupes.length,   status: dupes.length   === 0 ? 'green' : 'yellow', icon: dupes.length   === 0 ? '✓' : '⚠' },
  ]

  for (const r of rows) {
    log(r.status, `  ${r.icon}  ${r.label.padEnd(36)} ${r.count} issue(s)`)
  }

  console.log()

  if (missing.length > 0) {
    log('red',   '━'.repeat(64))
    log('red',   `${C.bold}  GATE 2 BLOCKED — Fix missing dependencies before committing!`)
    log('dim',   `  Missing packages will cause build failures in CI/CD.`)
    log('red',   '━'.repeat(64))
    console.log()
    return 1
  }

  const warnings = unused.length + bloat.length + dupes.length
  if (warnings > 0) {
    log('yellow', '━'.repeat(64))
    log('yellow', `${C.bold}  GATE 2 PASSED with ${warnings} warning(s)`)
    log('dim',    `  Warnings do not block your commit. Please resolve them soon.`)
    log('yellow', '━'.repeat(64))
  } else {
    log('green',  '━'.repeat(64))
    log('green',  `${C.bold}  GATE 2 PASSED — Dependencies are clean!`)
    log('green',  '━'.repeat(64))
  }

  console.log()
  return 0
}

// ─── MAIN ──────────────────────────────────────────────────────
function main() {
  const startTime = Date.now()

  console.log()
  log('cyan', '━'.repeat(64))
  log('cyan', `${C.bold}  DEVOPS-GUARD DEPENDENCY SCANNER v1.0  —  Gate 2`)
  log('cyan', `  ${C.dim}Checking for unused, missing, bloated, and duplicate packages`)
  log('cyan', '━'.repeat(64))
  console.log()

  // 1. Read package.json
  const { dependencies, devDependencies, all: allDeclared } = readPackageJson()
  log('dim', `  package.json — ${dependencies.length} dependencies, ${devDependencies.length} devDependencies`)

  // 2. Collect source files
  const sourceFiles = collectSourceFiles(SRC_DIR)
  log('dim', `  Source files  — ${sourceFiles.length} files found in src/`)
  console.log()

  // 3. Extract all imports from source
  const importedPackages = extractImports(sourceFiles)

  // 4. Run all checks (only check runtime deps for unused, not devDeps like husky/vite)
  const unusedDeps    = checkUnused(dependencies, importedPackages, RUNTIME_ONLY)
  const missingDeps   = checkMissing(allDeclared, importedPackages)
  const bloatedDeps   = checkBloat(allDeclared)
  const duplicateDeps = checkDuplicates(allDeclared)

  // 5. Print results
  printUnused(unusedDeps)
  printMissing(missingDeps)
  printBloat(bloatedDeps)
  printDuplicates(duplicateDeps)

  // 6. Summary + exit code
  const exitCode = printSummary({
    unused:    unusedDeps,
    missing:   missingDeps,
    bloat:     bloatedDeps,
    dupes:     duplicateDeps,
    fileCount: sourceFiles.length,
    pkgCount:  allDeclared.length,
    elapsed:   Date.now() - startTime,
  })

  process.exit(exitCode)
}

main()
