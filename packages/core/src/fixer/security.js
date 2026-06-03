#!/usr/bin/env node
// ============================================================
// security-autofix.js — Gate 1 Auto-Remediation Engine
// ============================================================
// Reads scan output, groups violations by file, then applies
// targeted fixes in reverse-line-order to preserve correctness.
//
// Fix strategies:
//   FIXABLE:
//     - Hardcoded secrets/keys → env var reference
//     - Weak equality (==) → strict equality (===)
//     - console.log with sensitive data → remove line
//     - dangerouslySetInnerHTML with literal string → safe alternative
//   ADVISORY (report + remediation guide, no auto-change):
//     - Multi-line private key blocks
//     - Dynamic XSS patterns (need context)
//     - ENV_ misconfiguration (need config file context)
//
// Usage:
//   node security-autofix.js              → dry-run (shows what would change)
//   node security-autofix.js --apply      → apply all fixes to source files
//   node security-autofix.js --apply --src src/   → limit to specific dir
// ============================================================

import fs    from 'fs'
import path  from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TARGET_DIR = process.cwd()

// ─── CLI ARGS ─────────────────────────────────────────────────
const args    = process.argv.slice(2)
const APPLY   = args.includes('--apply')
const SRC_DIR = (() => {
  const idx = args.indexOf('--src')
  return idx !== -1 ? args[idx + 1] : null
})()

// ─── COLORS ───────────────────────────────────────────────────
const C = {
  red:    s => `\x1b[31m${s}\x1b[0m`,
  yellow: s => `\x1b[33m${s}\x1b[0m`,
  green:  s => `\x1b[32m${s}\x1b[0m`,
  cyan:   s => `\x1b[36m${s}\x1b[0m`,
  dim:    s => `\x1b[2m${s}\x1b[0m`,
  bold:   s => `\x1b[1m${s}\x1b[0m`,
}

// ─── ENV VAR NAME GENERATOR ───────────────────────────────────
const RULE_ENV_PREFIX = {
  'GOOG-001': 'GOOGLE_API_KEY',       'GOOG-002': 'GOOGLE_OAUTH_SECRET',
  'GOOG-003': 'GOOGLE_SERVICE_ACCOUNT','GOOG-004': 'FIREBASE_TOKEN',
  'AWS-001':  'AWS_ACCESS_KEY_ID',    'AWS-002':  'AWS_SECRET_ACCESS_KEY',
  'AI-001':   'OPENAI_API_KEY',       'AI-002':   'ANTHROPIC_API_KEY',
  'AI-003':   'HUGGINGFACE_TOKEN',
  'PAY-001':  'STRIPE_SECRET_KEY',    'PAY-002':  'PAYPAL_SECRET',
  'COM-001':  'TWILIO_AUTH_TOKEN',    'COM-002':  'SENDGRID_API_KEY',
  'COM-003':  'SLACK_BOT_TOKEN',
  'VCS-001':  'GITHUB_TOKEN',         'VCS-002':  'GITLAB_TOKEN',
  'VCS-003':  'BITBUCKET_APP_PASSWORD',
  'DB-001':   'DATABASE_URL',
  'AUTH-001': 'JWT_SECRET',           'AUTH-002': 'RSA_PRIVATE_KEY',
  'GEN-001':  'SECRET_KEY',           'GEN-002':  'DEBUG_MODE',
  'ENV-001':  'ENV_CONFIG',
}

function getEnvVarName(ruleId, lineContent) {
  // Try to extract variable name from source line
  const varMatch = lineContent.match(
    /(?:const|let|var)\s+([A-Z_a-z]\w*)\s*=|([A-Z_a-z]\w*)\s*[:=]/
  )
  const sourceVar = varMatch
    ? (varMatch[1] || varMatch[2]).replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase()
    : null

  // Use rule-based prefix, append source var if informative
  const base = RULE_ENV_PREFIX[ruleId] || 'SECRET'
  if (sourceVar && sourceVar !== 'CONST' && sourceVar !== 'LET' && sourceVar !== 'VAR') {
    // If source var is more specific than rule prefix, prefer it
    return sourceVar.length > 3 ? sourceVar : base
  }
  return base
}

// ─── FIX STRATEGIES ───────────────────────────────────────────

/**
 * Secrets: replace the quoted/template-literal value with an env var reference.
 * Handles: "value", 'value', `value`, multi-word patterns.
 */
function fixSecret(lineContent, ruleId, envVarName, filePath) {
  const isVite = filePath.includes('src') || filePath.endsWith('.jsx') || filePath.endsWith('.tsx')
  const envRef = isVite
    ? `import.meta.env.${envVarName}`
    : `process.env.${envVarName}`

  // Pattern: replace quoted/template value on the assignment RHS
  // Matches: = "...", = '...', = `...`, : "..."
  const patterns = [
    /=\s*"[^"]{4,}"/g,
    /=\s*'[^']{4,}'/g,
    /=\s*`[^`]{4,}`/g,
    /:\s*"[^"]{4,}"/g,
  ]

  let fixed = lineContent
  for (const pat of patterns) {
    const match = pat.exec(lineContent)
    if (match) {
      const separator = match[0].startsWith(':') ? ': ' : ' = '
      fixed = lineContent.slice(0, match.index) + separator + envRef + lineContent.slice(match.index + match[0].length)
      return { fixed: true, result: fixed, envRef }
    }
  }
  return { fixed: false, reason: 'Could not isolate the secret value for safe replacement' }
}

/**
 * XSS: replace innerHTML/document.write with safe alternatives.
 */
function fixXSS(lineContent, ruleId) {
  let result = lineContent

  if (ruleId === 'XSS-001') {
    // innerHTML = x → textContent = x
    result = result.replace(/\.innerHTML\s*=/, '.textContent =')
    if (result !== lineContent) return { fixed: true, result, note: 'innerHTML → textContent' }
    // dangerouslySetInnerHTML with literal string
    result = lineContent.replace(
      /dangerouslySetInnerHTML=\{\{__html:\s*["'`][^"'`]*["'`]\}\}/,
      match => `/* SECURITY: ${match} → use DOMPurify.sanitize() */`
    )
    if (result !== lineContent) return { fixed: true, result, note: 'dangerouslySetInnerHTML flagged' }
  }

  if (ruleId === 'XSS-002') {
    // document.write → advisory comment
    result = result.replace(/document\.write\s*\(/, 'console.error("SECURITY: DOM API blocked"); /* API removed */(')
    if (result !== lineContent) return { fixed: true, result, note: 'document.write commented out' }
  }

  if (ruleId === 'XSS-003') {
    // eval() → advisory
    result = result.replace(/\beval\s*\(/, 'console.error("SECURITY: Code Injection blocked"); /* function removed */(')
    if (result !== lineContent) return { fixed: true, result, note: 'eval() flagged' }
  }

  return { fixed: false, reason: 'Dynamic XSS pattern — manual review required' }
}

/**
 * Logging: remove console.log lines that contain sensitive keywords.
 */
function fixLogging(lineContent) {
  if (/console\.(log|debug|info)\s*\(.*?(password|secret|token|key|credential)/i.test(lineContent)) {
    const indent = lineContent.match(/^(\s*)/)[1]
    return {
      fixed: true,
      result: `${indent}// SECURITY: removed console.log with sensitive data`,
      note: 'Sensitive console.log removed',
    }
  }
  return { fixed: false, reason: 'Log content unclear — manual review' }
}

/**
 * Weak auth: == → ===
 */
function fixWeakAuth(lineContent) {
  const result = lineContent.replace(/([^=!])={2}([^=])/g, '$1===$2')
  if (result !== lineContent) return { fixed: true, result, note: '== → === (strict equality)' }
  return { fixed: false, reason: 'Pattern unclear — manual review' }
}

// ─── ROUTE VIOLATION TO FIX STRATEGY ─────────────────────────
function applyFix(violation, envVarsCollected) {
  const { ruleId, lineContent, file } = violation
  const envVarName = getEnvVarName(ruleId, lineContent)

  // Secret rules
  const secretRules = [
    'GOOG-001','GOOG-002','GOOG-003','GOOG-004',
    'AWS-001','AWS-002',
    'AI-001','AI-002','AI-003',
    'PAY-001','PAY-002',
    'COM-001','COM-002','COM-003',
    'VCS-001','VCS-002','VCS-003',
    'DB-001','GEN-001',
  ]

  if (secretRules.includes(ruleId)) {
    const result = fixSecret(lineContent, ruleId, envVarName, file)
    if (result.fixed) {
      envVarsCollected.push({ name: envVarName, ruleId, file, line: violation.line })
    }
    return result
  }

  if (ruleId === 'AUTH-001') return fixWeakAuth(lineContent)
  if (ruleId === 'AUTH-002') {
    return { fixed: false, reason: 'Private key block — delete the file, rotate the key, use a secret manager (HashiCorp Vault, AWS KMS)' }
  }
  if (ruleId.startsWith('XSS-')) return fixXSS(lineContent, ruleId)
  if (ruleId === 'LOG-001')     return fixLogging(lineContent)
  if (ruleId === 'GEN-002')     return { fixed: false, reason: 'Debug mode flag — set via NODE_ENV, not hardcoded' }
  if (ruleId === 'ENV-001')     return { fixed: false, reason: 'ENV misconfiguration — check .env loading order' }

  return { fixed: false, reason: 'No auto-fix strategy for this rule type' }
}

// ─── APPLY ALL FIXES TO A SINGLE FILE ─────────────────────────
function fixFile(filePath, violations, envVarsCollected, dryRun) {
  const absPath = path.resolve(TARGET_DIR, filePath)
  if (!fs.existsSync(absPath)) {
    return { skipped: true, reason: 'File not found' }
  }

  const original = fs.readFileSync(absPath, 'utf-8')
  const lines    = original.split('\n')
  const results  = []

  // Process violations in reverse line order to preserve line numbers
  const sorted = [...violations].sort((a, b) => b.line - a.line)

  for (const v of sorted) {
    const lineIdx = v.line - 1
    if (lineIdx < 0 || lineIdx >= lines.length) continue

    const currentLine = lines[lineIdx]
    const fixResult   = applyFix({ ...v, lineContent: currentLine }, envVarsCollected)

    results.push({
      line:    v.line,
      ruleId:  v.ruleId,
      ...fixResult,
    })

    if (fixResult.fixed && !dryRun) {
      lines[lineIdx] = fixResult.result
    }
  }

  if (!dryRun) {
    const updated = lines.join('\n')
    if (updated !== original) {
      fs.writeFileSync(absPath, updated, 'utf-8')
    }
  }

  return { results }
}

// ─── GENERATE .env.example ────────────────────────────────────
function writeEnvExample(envVars, dryRun) {
  if (envVars.length === 0) return

  const envPath = path.join(TARGET_DIR, '.env.example')
  const existing = fs.existsSync(envPath)
    ? fs.readFileSync(envPath, 'utf-8')
    : ''

  const lines = ['# Generated by security-autofix.js', '# Copy to .env and fill in real values', '']
  const seen = new Set()

  // Keep existing lines
  if (existing) {
    lines.push(...existing.split('\n').filter(l => !l.startsWith('# Generated')))
  }

  for (const v of envVars) {
    if (seen.has(v.name)) continue
    seen.add(v.name)
    if (!existing.includes(v.name)) {
      lines.push(`${v.name}=your_${v.name.toLowerCase()}_here`)
    }
  }

  if (!dryRun) {
    fs.writeFileSync(envPath, lines.join('\n'), 'utf-8')
  }

  return lines.filter(l => l && !l.startsWith('#'))
}

// ─── ENSURE .gitignore COVERS .env ────────────────────────────
function ensureGitignore(dryRun) {
  const gitignorePath = path.join(TARGET_DIR, '.gitignore')
  if (!fs.existsSync(gitignorePath)) return

  const content = fs.readFileSync(gitignorePath, 'utf-8')
  const needed  = ['.env', '.env.local', '.env.*.local']
  const missing = needed.filter(e => !content.includes(e))

  if (missing.length > 0 && !dryRun) {
    fs.appendFileSync(gitignorePath, '\n# Security — secret files\n' + missing.join('\n') + '\n')
  }
  return missing
}

async function loadViolations() {
  function mapViolation(v) {
    return {
      ...v,
      file: v.file || (v.location && v.location.file),
      line: v.line || (v.location && v.location.line),
    }
  }

  // Fallback: read from .devops-guard/scan-report.json or public/scan-report.json
  const candidates = [
    path.join(TARGET_DIR, '.devops-guard', 'scan-report.json'),
    path.join(TARGET_DIR, 'public', 'scan-report.json'),
  ]
  for (const reportPath of candidates) {
    if (fs.existsSync(reportPath)) {
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'))
      const violations = report?.gate1?.violations || []
      return violations.map(v => {
        const mapped = mapViolation(v)
        return { ...mapped, lineContent: readLine(mapped.file, mapped.line) }
      })
    }
  }

  // Run security scanner programmatically and collect violations
  try {
    const { collectFiles, SECURITY_PATTERNS, IGNORE_DIRS, IGNORE_FILES } = await import('../scanner/security.js')
    console.log(C.dim('  Running security scanner programmatically...\n'))
  } catch {
    // scanner doesn't export those — just warn
  }

  console.error(C.red('  No scan report found. Run `devops-guard scan` first, then `devops-guard fix`.'))
  process.exit(1)
}

function readLine(filePath, lineNumber) {
  try {
    const absPath = path.resolve(TARGET_DIR, filePath)
    const lines   = fs.readFileSync(absPath, 'utf-8').split('\n')
    return lines[lineNumber - 1] || ''
  } catch { return '' }
}

// ─── MAIN ─────────────────────────────────────────────────────
async function main() {
  const DRY_RUN = !APPLY

  console.log()
  console.log(C.cyan('━'.repeat(64)))
  console.log(C.bold(C.cyan('  DevOps-Guard — Auto-Remediation Engine')))
  console.log(C.dim(`  Mode: ${DRY_RUN ? 'DRY RUN (pass --apply to write changes)' : 'APPLY — writing fixes to disk'}`))
  console.log(C.cyan('━'.repeat(64)))
  console.log()

  // Load violations
  const allViolations = await loadViolations()
  console.log(C.dim(`  Loaded ${allViolations.length} violations from scan report\n`))

  // Filter by --src if specified
  const violations = SRC_DIR
    ? allViolations.filter(v => v.file.startsWith(SRC_DIR))
    : allViolations

  // Skip documentation and generated files
  const SKIP_PATHS = ['docs/', 'node_modules/', 'dist/', 'public/scan-', '.json']
  const filtered = violations.filter(v =>
    v.file && !SKIP_PATHS.some(skip => v.file.includes(skip))
  )

  console.log(C.dim(`  Processing ${filtered.length} violations (${allViolations.length - filtered.length} in docs/node_modules skipped)\n`))

  // Group by file
  const byFile = {}
  for (const v of filtered) {
    if (!byFile[v.file]) byFile[v.file] = []
    byFile[v.file].push(v)
  }

  // Process each file
  const envVarsCollected = []
  const summary = { fixed: 0, advisory: 0, skipped: 0 }
  const advisoryList = []

  for (const [file, fileViolations] of Object.entries(byFile)) {
    console.log(C.bold(`  📄 ${file}`) + C.dim(` (${fileViolations.length} violation${fileViolations.length > 1 ? 's' : ''})`))

    const { results, skipped } = fixFile(file, fileViolations, envVarsCollected, DRY_RUN)

    if (skipped) {
      console.log(C.dim(`     ⊘ Skipped — ${skipped.reason}`))
      summary.skipped += fileViolations.length
      continue
    }

    for (const r of results) {
      if (r.fixed) {
        summary.fixed++
        console.log(C.green(`     ✓ Line ${r.line} [${r.ruleId}] → ${r.result?.trim().substring(0, 60)}${r.result?.length > 60 ? '…' : ''}`))
        if (r.note) console.log(C.dim(`       ${r.note}`))
      } else {
        summary.advisory++
        console.log(C.yellow(`     ⚠ Line ${r.line} [${r.ruleId}] — ${r.reason}`))
        advisoryList.push({ file, line: r.line, ruleId: r.ruleId, reason: r.reason })
      }
    }
    console.log()
  }

  // Write .env.example
  const envLines = writeEnvExample(envVarsCollected, DRY_RUN)
  const gitignoreMissing = ensureGitignore(DRY_RUN)

  // ─── SUMMARY ────────────────────────────────────────────────
  console.log(C.cyan('━'.repeat(64)))
  console.log(C.bold('  Remediation Summary'))
  console.log(C.cyan('━'.repeat(64)))
  console.log(C.green(`  ✓ Auto-fixed:      ${summary.fixed} violations`))
  console.log(C.yellow(`  ⚠ Advisory:        ${summary.advisory} violations (manual review)`))
  console.log(C.dim(`  ⊘ Skipped:         ${summary.skipped} violations`))
  console.log()

  if (envVarsCollected.length > 0) {
    const unique = [...new Set(envVarsCollected.map(e => e.name))]
    console.log(C.cyan(`  📋 Env vars to create in .env:`))
    for (const name of unique) {
      console.log(C.dim(`     ${name}=<your_value>`))
    }
    if (!DRY_RUN) {
      console.log(C.green(`\n  ✓ .env.example updated (${unique.length} var${unique.length > 1 ? 's' : ''} added)`))
    }
    console.log()
  }

  if (gitignoreMissing?.length > 0 && !DRY_RUN) {
    console.log(C.green(`  ✓ .gitignore updated: added ${gitignoreMissing.join(', ')}`))
    console.log()
  }

  if (advisoryList.length > 0) {
    console.log(C.yellow('  Violations requiring manual attention:'))
    console.log()
    for (const a of advisoryList) {
      console.log(C.yellow(`  [${a.ruleId}] ${a.file}:${a.line}`))
      console.log(C.dim(`    → ${a.reason}`))
    }
    console.log()
  }

  if (DRY_RUN) {
    console.log(C.bold(C.cyan('  DRY RUN COMPLETE — no files were modified.')))
    console.log(C.dim('  Run with --apply to write fixes to disk:'))
    console.log(C.dim('  node security-autofix.js --apply'))
    console.log(C.dim('  node security-autofix.js --apply --src src/  (limit to src/ only)'))
  } else {
    console.log(C.bold(C.green(`  ✓ ${summary.fixed} fixes applied. Run 'npm run security:scan' to verify.`)))
  }

  console.log()
  console.log(C.cyan('━'.repeat(64)))
  console.log()
}

export { main }

// Run directly via node or via devops-guard CLI
if (process.argv[1] && (process.argv[1].endsWith('security.js') || process.argv[1].endsWith('dependency.js') || process.argv[1].endsWith('fixer/security.js') || process.argv[1].endsWith('graph.js') || process.argv[1].endsWith('output.js') || process.argv[1].endsWith('summary.js'))) {
  main()
}