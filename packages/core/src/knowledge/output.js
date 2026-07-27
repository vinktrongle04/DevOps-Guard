#!/usr/bin/env node
// ============================================================
// SCANNER OUTPUT EXPORTER
// Runs both Gate 1 (security) and Gate 2 (dependency) scanners
// and writes a combined JSON report to:
import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { SECURITY_PATTERNS } from '../scanner/security.js'
import { loadConfig } from '../utils/config.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)
const TARGET_DIR = process.cwd()

// ─── CONFIGURATION ─────────────────────────────────────────
// Output directory: .devops-guard/ (gitignored, project-local)
const OUT_DIR     = path.join(TARGET_DIR, '.devops-guard')
const OUTPUT_PATH = path.join(OUT_DIR, 'scan-report.json')
const SRC_DIR     = path.join(TARGET_DIR, 'src')
const PKG_PATH    = path.join(TARGET_DIR, 'package.json')
const SCAN_EXTS   = ['.js', '.jsx', '.ts', '.tsx', '.mjs']
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', 'dashboard-dist', '.husky', '.github', 'coverage', 'public', 'kb', '.knowledge-base', '.gemini', 'docs', '.devops-guard']
const IGNORE_FILES = [
  'dependency-scanner.js', 'security-scanner.js',
  'scanner-output.js', 'vite.config.js', 'eslint.config.js',
  'scan-report.json', 'scan-history.json', 'graph-builder.js',
  'graph-query.js', 'kb-summary.js', 'security-autofix.js', '.env.example',
  '.devops-guard-ignore.json'
]

// Security patterns are imported from scanner/security.js (the canonical
// rule set) rather than kept as a second hand-copied list here — a prior
// drifted copy was missing GOOG-004 entirely and had a corrupted `name`
// field, so anything relying on this file (dashboard, KB, compliance
// queries) silently under-reported relative to `devops-guard scan`.

const BLOAT_REGISTRY = [
  { package: 'moment',    weight: 67,   weightStr: '67 kB',  alternative: 'Day.js (7 kB) or native Intl API' },
  { package: 'lodash',    weight: 71,   weightStr: '71 kB',  alternative: 'Native ES2022 array/object methods' },
  { package: 'axios',     weight: 13,   weightStr: '13 kB',  alternative: 'Native fetch() or ky (4 kB)' },
  { package: 'uuid',      weight: 1.8,  weightStr: '1.8 kB', alternative: 'crypto.randomUUID() — zero cost' },
  { package: 'underscore',weight: 16,   weightStr: '16 kB',  alternative: 'Native JS methods' },
  { package: 'jquery',    weight: 88,   weightStr: '88 kB',  alternative: 'React refs and state' },
  { package: 'request',   weight: 182,  weightStr: '182 kB', alternative: 'Native fetch()' },
]
const NODE_BUILTINS = new Set([
  'fs','path','os','crypto','http','https','url','stream','events',
  'child_process','util','buffer','querystring','readline','zlib','net',
  'node:fs','node:path','node:os','node:crypto','node:http','node:https',
  'node:url','node:stream','node:events','node:util','node:buffer',
])

// ─── HELPERS ──────────────────────────────────────────────────
function collectFiles(dir, exts, ignoreDirs, ignoreFiles) {
  const results = []
  const walk = (current) => {
    try {
      const entries = fs.readdirSync(current, { withFileTypes: true })
      for (const e of entries) {
        const full = path.join(current, e.name)
        if (e.isDirectory() && !ignoreDirs.includes(e.name)) { walk(full); continue }
        if (!e.isDirectory() && !ignoreFiles.includes(e.name) && exts.includes(path.extname(e.name))) {
          results.push(full)
        }
      }
    } catch { /* skip */ }
  }
  walk(dir)
  return results
}

// ─── GATE 1: SECURITY SCAN ────────────────────────────────────
function runSecurityScan() {
  const allFiles = collectFiles(TARGET_DIR, ['.js','.jsx','.ts','.tsx','.json','.env','.yml','.yaml','.md'], IGNORE_DIRS, [...IGNORE_FILES,'package-lock.json','yarn.lock'])
  const violations = []

  for (const file of allFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8')
      const lines   = content.split('\n')
      for (const pattern of SECURITY_PATTERNS) {
        // security.js nests `owasp` inside `compliance`; keep this file's
        // report shape (a top-level `owasp` alongside a separate
        // `compliance` object) unchanged for existing consumers.
        const { owasp, ...complianceRest } = pattern.compliance || {}
        for (let i = 0; i < lines.length; i++) {
          pattern.regex.lastIndex = 0
          if (lines[i].match(pattern.regex)) {
            violations.push({
              ruleId:      pattern.id,
              ruleName:    pattern.name,
              severity:    pattern.severity,
              category:    pattern.category,
              owasp,
              compliance:  complianceRest,
              file:        path.relative(TARGET_DIR, file).replace(/\\/g, '/'),
              line:        i + 1,
              snippet:     lines[i].trim().substring(0, 80),
            })
          }
        }
      }
    } catch { /* skip */ }
  }
  return violations
}

// ─── GATE 2: DEPENDENCY SCAN ──────────────────────────────────
async function runDependencyScan() {
  const config = await loadConfig(TARGET_DIR)
  const pkg    = JSON.parse(fs.readFileSync(PKG_PATH, 'utf-8'))
  const deps   = Object.keys(pkg.dependencies    || {})
  const devDeps= Object.keys(pkg.devDependencies || {})
  const allDeps= [...deps, ...devDeps]

  // Test files routinely contain fixture strings like
  // `writeSrc("import React from 'react'")` to exercise the scanners
  // themselves — extracting "imports" from those would misreport whatever
  // package names the fixtures happen to mention as actually used.
  const srcFiles = collectFiles(SRC_DIR, SCAN_EXTS, IGNORE_DIRS, IGNORE_FILES)
    .filter(f => !/\.test\.(js|jsx|ts|tsx|mjs)$/.test(f))
  const imported = new Set()
  const importPatterns = [
    /from\s+['"]([^./][^'"]*)['"]/g,
    /require\s*\(\s*['"]([^./][^'"]*)['"]\s*\)/g,
  ]
  for (const file of srcFiles) {
    try {
      // Strip comments first — doc comments/usage examples routinely show
      // `import x from 'pkg'`-shaped text that isn't a real import.
      const content = fs.readFileSync(file, 'utf-8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '')
      for (const pat of importPatterns) {
        pat.lastIndex = 0
        let m
        while ((m = pat.exec(content)) !== null) {
          const raw = m[1]
          const pkg = raw.startsWith('@') ? raw.split('/').slice(0,2).join('/') : raw.split('/')[0]
          imported.add(pkg)
        }
      }
    } catch { /* skip */ }
  }

  const unused  = deps.filter(p => !imported.has(p) && !config.runtimeDeps.includes(p))
  const missing = [...imported].filter(p => !allDeps.includes(p) && !NODE_BUILTINS.has(p))
  const bloat   = BLOAT_REGISTRY.filter(b => allDeps.includes(b.package))
  const totalBloatKb = bloat.reduce((sum, b) => sum + b.weight, 0)

  return { unused, missing, bloat, totalBloatKb, srcFileCount: srcFiles.length, totalPackages: allDeps.length }
}

// ─── ASSEMBLE REPORT ──────────────────────────────────────────
async function buildReport() {
  const startTime = Date.now()
  const secViolations  = runSecurityScan()
  const depReport      = await runDependencyScan()

  const bySeverity = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 }
  for (const v of secViolations) bySeverity[v.severity] = (bySeverity[v.severity] || 0) + 1

  const byCategory = {}
  for (const v of secViolations) byCategory[v.category] = (byCategory[v.category] || 0) + 1

  const timeSavedMin = 28 // per commit baseline vs manual review
  const bloatKb = Math.round(depReport.totalBloatKb)

  const report = {
    meta: {
      generatedAt:  new Date().toISOString(),
      scanDurationMs: Date.now() - startTime,
      version:      '1.0.0',
      rulesLoaded:  SECURITY_PATTERNS.length,
    },
    summary: {
      totalSecurityViolations: secViolations.length,
      bySeverity,
      byCategory,
      unusedDependencies:     depReport.unused.length,
      missingDependencies:    depReport.missing.length,
      bloatedPackages:        depReport.bloat.length,
      totalBloatKb:           bloatKb,
      srcFilesScanned:        depReport.srcFileCount,
      packagesAnalyzed:       depReport.totalPackages,
      gate1Status:            secViolations.filter(v => ['CRITICAL','HIGH'].includes(v.severity)).length > 0 ? 'BLOCKED' : 'PASSED',
      gate2Status:            depReport.missing.length > 0 ? 'BLOCKED' : depReport.unused.length > 0 ? 'WARNING' : 'PASSED',
      timeSavedPerCommitMin:  timeSavedMin,
    },
    gate1: {
      name:       'Security Gate',
      violations: secViolations,
    },
    gate2: {
      name:             'Dependency Gate',
      unused:           depReport.unused,
      missing:          depReport.missing,
      bloat:            depReport.bloat,
      totalBloatKb:     bloatKb,
    },
  }

  // Ensure .devops-guard/ output directory exists
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2), 'utf-8')
  console.log(`[scanner-output] Report written to: ${path.relative(TARGET_DIR, OUTPUT_PATH)}`)
  console.log(`[scanner-output] Security violations: ${secViolations.length} | Unused deps: ${depReport.unused.length} | Bloat: ${bloatKb} kB`)

  // -- Immutable Audit Trail -- the fixer trusts this report's file/line
  // locations enough to rewrite files based on them, so it must be signed
  // the same way scan-history.json already is below.
  import('./audit.js').then(({ signFile }) => {
    if (signFile(OUTPUT_PATH)) {
      console.log(`[scanner-output] Report cryptographically signed (Immutable Audit Trail)`)
    }
  }).catch(() => {})

  // ─── APPEND TO SCAN HISTORY ─────────────────────────────────
  const HISTORY_PATH = path.join(OUT_DIR, 'scan-history.json')
  const MAX_HISTORY  = 30 // keep last 30 snapshots

  const snapshot = {
    date:        new Date().toISOString().split('T')[0],
    timestamp:   report.meta.generatedAt,
    scanMs:      report.meta.scanDurationMs,
    critical:    report.summary.bySeverity.CRITICAL || 0,
    high:        report.summary.bySeverity.HIGH     || 0,
    medium:      report.summary.bySeverity.MEDIUM   || 0,
    low:         report.summary.bySeverity.LOW      || 0,
    total:       report.summary.totalSecurityViolations,
    unusedDeps:  report.summary.unusedDependencies,
    bloatKb:     report.summary.totalBloatKb,
    gate1Status: report.summary.gate1Status,
    gate2Status: report.summary.gate2Status,
  }

  let history = []
  if (fs.existsSync(HISTORY_PATH)) {
    try { history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8')) } catch { history = [] }
  }

  // Avoid duplicate entries for the same day (keep the latest)
  history = history.filter(h => h.date !== snapshot.date)
  history.push(snapshot)

  // Keep only the last MAX_HISTORY snapshots
  if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY)

  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2), 'utf-8')
  console.log(`[scanner-output] History updated: ${history.length} snapshot(s) in scan-history.json`)

  // -- Immutable Audit Trail (Phase 3) --
  import('./audit.js').then(({ signFile }) => {
    if (signFile(HISTORY_PATH)) {
      console.log(`[scanner-output] History cryptographically signed (Immutable Audit Trail)`)
    }
  }).catch(() => {})

  // ─── WRITE KNOWLEDGE BASE (Level 1) ─────────────────────────
  const KB_DIR = path.join(OUT_DIR, 'kb')
  if (!fs.existsSync(KB_DIR)) fs.mkdirSync(KB_DIR, { recursive: true })

  // 1. project-state.json — structured current state
  const fileMap = {}
  for (const v of secViolations) {
    const f = v.file
    if (!fileMap[f]) fileMap[f] = { violations: [], riskScore: 0, complianceAtRisk: new Set(), daysOpenMax: 0 }
    fileMap[f].violations.push(`${v.ruleId}:L${v.line}`)
    const w = v.severity === 'CRITICAL' ? 40 : v.severity === 'HIGH' ? 20 : v.severity === 'MEDIUM' ? 10 : 2
    fileMap[f].riskScore = Math.min(100, fileMap[f].riskScore + w)
    if (v.compliance) {
      Object.entries(v.compliance).forEach(([k, val]) => { if (val) fileMap[f].complianceAtRisk.add(val) })
    }
  }
  // Serialize Sets
  const filesObj = {}
  for (const [f, d] of Object.entries(fileMap)) {
    filesObj[f] = { ...d, complianceAtRisk: [...d.complianceAtRisk], lastScan: report.meta.generatedAt }
  }

  const rulesMap = {}
  for (const v of secViolations) {
    if (!rulesMap[v.ruleId]) rulesMap[v.ruleId] = { name: v.ruleName, openCount: 0, affectedFiles: new Set(), compliance: [] }
    rulesMap[v.ruleId].openCount++
    rulesMap[v.ruleId].affectedFiles.add(v.file)
    if (v.compliance) {
      const vals = Object.values(v.compliance).filter(Boolean)
      rulesMap[v.ruleId].compliance = [...new Set([...rulesMap[v.ruleId].compliance, ...vals])]
    }
  }
  const rulesObj = {}
  for (const [id, d] of Object.entries(rulesMap)) {
    rulesObj[id] = { ...d, affectedFiles: [...d.affectedFiles] }
  }

  // Compliance exposure
  const compExposure = {}
  for (const v of secViolations) {
    if (!v.compliance) continue
    for (const [std, ctrl] of Object.entries(v.compliance)) {
      if (!ctrl) continue
      const key = std.toUpperCase().replace('PCIDSS', 'PCI-DSS').replace('ISO27001','ISO-27001').replace('SOC2','SOC-2')
      if (!compExposure[key]) compExposure[key] = { violatingRules: new Set(), openViolations: 0 }
      compExposure[key].violatingRules.add(v.ruleId)
      compExposure[key].openViolations++
    }
  }
  const compObj = {}
  for (const [k, d] of Object.entries(compExposure)) {
    compObj[k] = { violatingRules: [...d.violatingRules], openViolations: d.openViolations }
  }

  const projectState = {
    meta: { generatedAt: report.meta.generatedAt, version: '1.0', scanCount: history.length },
    currentHealth: {
      totalViolations: secViolations.length,
      bySeverity: report.summary.bySeverity,
      byCategory: report.summary.byCategory,
      riskScore: Math.min(100, Math.round((report.summary.bySeverity.CRITICAL * 40 + report.summary.bySeverity.HIGH * 20) / 10)),
      trend: history.length >= 2
        ? (secViolations.length < history[history.length - 2]?.total ? 'improving' : 'degrading')
        : 'unknown',
      trendDelta: history.length >= 2
        ? secViolations.length - history[history.length - 2].total
        : 0,
      gate1Status: report.summary.gate1Status,
      gate2Status: report.summary.gate2Status,
    },
    files: filesObj,
    rules: rulesObj,
    complianceExposure: compObj,
    dependencies: {
      unused: depReport.unused,
      bloat: depReport.bloat.map(b => ({ package: b.package, sizeKb: b.weight, alternative: b.alternative })),
      totalBloatKb: bloatKb,
    },
  }

  const STATE_PATH = path.join(KB_DIR, 'project-state.json')
  fs.writeFileSync(STATE_PATH, JSON.stringify(projectState, null, 2), 'utf-8')
  // SECURITY: removed console.log with sensitive data

  // 2. event-log.jsonl — append-only event log
  const EVENT_LOG_PATH = path.join(KB_DIR, 'event-log.jsonl')
  const scanEvent = JSON.stringify({
    ts:          report.meta.generatedAt,
    event:       'scan',
    total:       secViolations.length,
    critical:    report.summary.bySeverity.CRITICAL,
    high:        report.summary.bySeverity.HIGH,
    medium:      report.summary.bySeverity.MEDIUM,
    low:         report.summary.bySeverity.LOW,
    gate1:       report.summary.gate1Status,
    gate2:       report.summary.gate2Status,
    unusedDeps:  depReport.unused.length,
    bloatKb,
    by:          'scanner-output',
  })
  fs.appendFileSync(EVENT_LOG_PATH, scanEvent + '\n', 'utf-8')
  console.log(`[kb] event-log.jsonl appended`)

  // 3. kb-index.json — fast lookup
  const kbIndex = {
    updatedAt: report.meta.generatedAt,
    ruleToFiles: {},
    fileToRules: {},
    complianceToRules: {},
    criticalFiles: Object.entries(filesObj)
      .filter(([, d]) => d.violations.some(v => v.startsWith('CRIT') || secViolations.find(sv => `${sv.ruleId}:L${sv.line}` === v && sv.severity === 'CRITICAL')))
      .map(([f]) => f),
  }
  for (const v of secViolations) {
    if (!kbIndex.ruleToFiles[v.ruleId]) kbIndex.ruleToFiles[v.ruleId] = []
    if (!kbIndex.ruleToFiles[v.ruleId].includes(v.file)) kbIndex.ruleToFiles[v.ruleId].push(v.file)
    if (!kbIndex.fileToRules[v.file]) kbIndex.fileToRules[v.file] = []
    if (!kbIndex.fileToRules[v.file].includes(v.ruleId)) kbIndex.fileToRules[v.file].push(v.ruleId)
    if (v.compliance) {
      for (const [, ctrl] of Object.entries(v.compliance)) {
        if (!ctrl) continue
        if (!kbIndex.complianceToRules[ctrl]) kbIndex.complianceToRules[ctrl] = []
        if (!kbIndex.complianceToRules[ctrl].includes(v.ruleId)) kbIndex.complianceToRules[ctrl].push(v.ruleId)
      }
    }
  }
  // Simpler criticalFiles based on bySeverity
  kbIndex.criticalFiles = [...new Set(secViolations.filter(v => v.severity === 'CRITICAL').map(v => v.file))]

  const INDEX_PATH = path.join(KB_DIR, 'kb-index.json')
  fs.writeFileSync(INDEX_PATH, JSON.stringify(kbIndex, null, 2), 'utf-8')
  console.log(`[kb] kb-index.json written`)
}

export async function main() {
  await buildReport()
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
