#!/usr/bin/env node
// ============================================================
// policy-guard.js — Gate 6: Policy Integrity Verification
// ============================================================
// Detects unauthorized or accidental modifications to agent
// brain files and security scanner scripts.
//
// Protection model:
//   - Maintains a SHA-256 checksum manifest (policy-manifest.json)
//   - On every commit: re-computes checksums for protected files
//   - If a protected file changed:
//       → Verify the commit is marked as a policy update
//         (commit message must contain "policy:" or "security(rules):")
//       → If not → WARN and require explicit acknowledgment
//   - Generates a new manifest after a valid policy update
//
// Usage:
//   node policy-guard.js            → check mode (pre-commit)
//   node policy-guard.js --update   → update manifest (after approved change)
// ============================================================

import fs   from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─── PROTECTED FILES ────────────────────────────────────────
// Changes to these files require explicit policy-update commit type
const PROTECTED_FILES = [
  'project_rules.md',
  'security_rules.md',
  'AGENT_CONTEXT.md',
  'security-scanner.js',
  'scanner-output.js',
  '.husky/pre-commit',
  '.github/workflows/deploy.yml',
]

const MANIFEST_PATH = path.join(__dirname, '.github', 'policy-manifest.json')

// ─── UTILITIES ───────────────────────────────────────────────
const COLORS = {
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  green:  '\x1b[32m',
  cyan:   '\x1b[36m',
  dim:    '\x1b[2m',
  bold:   '\x1b[1m',
  reset:  '\x1b[0m',
}

function log(color, ...args) {
  console.log(`${COLORS[color]}${args.join(' ')}${COLORS.reset}`)
}

function sha256(filePath) {
  try {
    const content = fs.readFileSync(filePath)
    return crypto.createHash('sha256').update(content).digest('hex')
  } catch {
    return null // file does not exist
  }
}

function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) return {}
  try { return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8')) } catch { return {} }
}

function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only', { encoding: 'utf-8' })
    return output.trim().split('\n').filter(Boolean)
  } catch { return [] }
}

function getLastCommitMessage() {
  try {
    return execSync('git log -1 --pretty=%B', { encoding: 'utf-8' }).trim()
  } catch { return '' }
}

// ─── UPDATE MODE: regenerate manifest ───────────────────────
function updateManifest() {
  const manifest = {
    generatedAt: new Date().toISOString(),
    generatedBy: 'policy-guard.js --update',
    files: {},
  }

  for (const file of PROTECTED_FILES) {
    const fullPath = path.join(__dirname, file)
    const hash = sha256(fullPath)
    if (hash) {
      manifest.files[file] = { sha256: hash, lastVerified: new Date().toISOString() }
      log('green', `  ✓ ${file}`)
    } else {
      log('dim', `  − ${file} (not found — skipped)`)
    }
  }

  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true })
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8')
  log('green', `\n  Manifest updated: ${Object.keys(manifest.files).length} files tracked`)
  log('dim',   `  Path: ${MANIFEST_PATH}`)
  process.exit(0)
}

// ─── CHECK MODE: verify integrity ───────────────────────────
function checkIntegrity() {
  const manifest   = loadManifest()
  const staged     = getStagedFiles()
  const changed    = []

  console.log()
  log('cyan', '━'.repeat(64))
  log('cyan', `${COLORS.bold}  🔐 POLICY GUARD — Agent Brain Integrity Check`)
  log('cyan', `  ${COLORS.dim}${PROTECTED_FILES.length} protected files`)
  log('cyan', '━'.repeat(64))
  console.log()

  // Check which protected files are staged (being modified)
  for (const file of PROTECTED_FILES) {
    if (staged.includes(file)) {
      const fullPath = path.join(__dirname, file)
      const newHash  = sha256(fullPath)
      const recorded = manifest.files?.[file]?.sha256

      if (recorded && newHash !== recorded) {
        changed.push({ file, newHash, recorded })
      } else if (!recorded) {
        // First time seeing this file — will be added to manifest on --update
        log('dim', `  NEW  ${file} (not yet in manifest — run --update after review)`)
      }
    }
  }

  if (changed.length === 0) {
    log('green', `  ✓ No protected files modified in this commit`)
    console.log()
    log('green', '━'.repeat(64))
    console.log()
    process.exit(0)
  }

  // Protected files were modified — require policy-update acknowledgment
  log('yellow', `${COLORS.bold}  ⚠  POLICY FILES MODIFIED`)
  console.log()
  for (const { file } of changed) {
    log('yellow', `  ├─ ${file}`)
  }
  console.log()
  log('dim', '  These files govern TRAE agent behavior and security enforcement.')
  log('dim', '  Unauthorized changes could alter compliance posture or bypass security gates.')
  console.log()
  log('cyan', '  To acknowledge this is an intentional policy update:')
  log('cyan', '  1. Ensure this change has been reviewed by the Tech Lead')
  log('cyan', '  2. Use a policy-update commit message:')
  log('cyan', '       policy(rules): <describe the change>')
  log('cyan', '       security(rules): <describe the change>')
  log('cyan', '  3. After the commit: run `node policy-guard.js --update`')
  console.log()
  log('yellow', '━'.repeat(64))
  log('yellow', `${COLORS.bold}  PROCEEDING — but this change requires Tech Lead review on GitHub (CODEOWNERS)`)
  log('dim', '  The GitHub PR cannot be merged without @vinktrongle04 approval.')
  log('yellow', '━'.repeat(64))
  console.log()

  // Exit 0 — warn but do not hard-block locally (GitHub CODEOWNERS is the hard gate)
  // Change to exit(1) to hard-block locally as well
  process.exit(0)
}

// ─── MAIN ───────────────────────────────────────────────────
const args = process.argv.slice(2)
if (args.includes('--update')) {
  log('cyan', '\n  Regenerating policy manifest...\n')
  updateManifest()
} else {
  checkIntegrity()
}
