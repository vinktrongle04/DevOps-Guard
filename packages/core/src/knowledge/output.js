#!/usr/bin/env node
// ============================================================
// SCANNER OUTPUT EXPORTER
// Runs both Gate 1 (security) and Gate 2 (dependency) scanners
// and writes a combined JSON report to:
//   public/scan-report.json
//
// This file is called by `npm run scan:export` which the
// Dashboard UI fetches at runtime to display real violations.
// ============================================================

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

const TARGET_DIR = process.cwd()

// ─── CONFIGURATION ─────────────────────────────────────────
const OUTPUT_PATH = path.join(TARGET_DIR, 'public', 'scan-report.json')
const SRC_DIR     = path.join(TARGET_DIR, 'src')
const PKG_PATH    = path.join(TARGET_DIR, 'package.json')
const SCAN_EXTS   = ['.js', '.jsx', '.ts', '.tsx', '.mjs']
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', 'coverage', 'kb', '.knowledge-base', 'public', 'docs']
const IGNORE_FILES = [
  'dependency-scanner.js', 'security-scanner.js',
  'scanner-output.js', 'vite.config.js', 'eslint.config.js',
  'scan-report.json', 'scan-history.json', 'graph-builder.js',
  'graph-query.js', 'kb-summary.js', 'security-autofix.js', '.env.example'
]

// ─── SECURITY PATTERNS (subset — same as security-scanner.js) ──
const SECURITY_PATTERNS = [
  { id: 'GOOG-001', name: 'Google API Key',            regex: /AIzaSy[0-9A-Za-z_-]{33}/g,           severity: 'CRITICAL', category: 'Google Cloud',       owasp: 'A02', compliance: { iso27001: 'A.9.4.3', soc2: 'CC6.1', pciDss: 'Req 6.3',  hipaa: null        } },
  { id: 'GOOG-002', name: 'Firebase Config Value',     regex: /firebase[A-Za-z]*\s*[:=]\s*["'][A-Za-z0-9_-]{20,}["']/gi, severity: 'HIGH', category: 'Google Cloud', owasp: 'A02', compliance: { iso27001: 'A.9.4.3', soc2: 'CC6.1', pciDss: 'Req 6.3',  hipaa: null        } },
  { id: 'GOOG-003', name: 'Google OAuth Client Secret',regex: /GOCSPX-[A-Za-z0-9_-]{28,}/g,        severity: 'CRITICAL', category: 'Google Cloud',       owasp: 'A07', compliance: { iso27001: 'A.9.2.3', soc2: 'CC6.1', pciDss: 'Req 8.2',  hipaa: null        } },
  { id: 'AWS-001',  name: 'AWS Access Key ID',         regex: /AKIA[0-9A-Z]{16}/g,                  severity: 'CRITICAL', category: 'AWS',                owasp: 'A02', compliance: { iso27001: 'A.9.4.3', soc2: 'CC6.1', pciDss: 'Req 6.3',  hipaa: null        } },
  { id: 'AWS-002',  name: 'AWS Secret Access Key',     regex: /aws_secret_access_key\s*[:=]\s*["']?[A-Za-z0-9/+=]{40}["']?/gi, severity: 'CRITICAL', category: 'AWS', owasp: 'A02', compliance: { iso27001: 'A.9.4.3', soc2: 'CC6.1', pciDss: 'Req 6.3',  hipaa: null        } },
  { id: 'AI-001',   name: 'OpenAI API Key',            regex: /sk-proj-[A-Za-z0-9]{20,}/g,          severity: 'CRITICAL', category: 'AI Services',        owasp: 'A02', compliance: { iso27001: 'A.9.4.3', soc2: 'CC6.6', pciDss: null,        hipaa: null        } },
  { id: 'AI-002',   name: 'OpenAI Legacy Key',         regex: /sk-[A-Za-z0-9]{48}/g,                severity: 'CRITICAL', category: 'AI Services',        owasp: 'A02', compliance: { iso27001: 'A.9.4.3', soc2: 'CC6.6', pciDss: null,        hipaa: null        } },
  { id: 'AI-003',   name: 'Anthropic API Key',         regex: /sk-ant-[A-Za-z0-9_-]{40,}/g,        severity: 'CRITICAL', category: 'AI Services',        owasp: 'A02', compliance: { iso27001: 'A.9.4.3', soc2: 'CC6.6', pciDss: null,        hipaa: null        } },
  { id: 'PAY-001',  name: 'Stripe Secret/Restricted Key', regex: /(?:sk_live_|rk_live_)[0-9a-zA-Z_]{20,}/g, severity: 'CRITICAL', category: 'Payment',   owasp: 'A02', compliance: { iso27001: 'A.9.4.3', soc2: 'CC6.1', pciDss: 'Req 3.2',  hipaa: null        } },
  { id: 'PAY-002',  name: 'Stripe Publishable Key',    regex: /pk_live_[0-9a-zA-Z]{24,}/g,          severity: 'MEDIUM',   category: 'Payment',            owasp: 'A02', compliance: { iso27001: 'A.9.4.3', soc2: 'CC6.1', pciDss: 'Req 3.2',  hipaa: null        } },
  { id: 'COM-001',  name: 'Twilio API Key',            regex: /SK[0-9a-fA-F]{32}/g,                 severity: 'HIGH',     category: 'Communication',      owasp: 'A02', compliance: { iso27001: 'A.9.4.3', soc2: 'CC6.6', pciDss: null,        hipaa: null        } },
  { id: 'COM-002',  name: 'SendGrid API Key',          regex: /SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}/g, severity: 'HIGH', category: 'Communication', owasp: 'A02', compliance: { iso27001: 'A.9.4.3', soc2: 'CC6.6', pciDss: null,        hipaa: null        } },
  { id: 'COM-003',  name: 'Slack Bot/Webhook Token',   regex: /xox[baprs]-[0-9A-Za-z-]{10,}/g,     severity: 'HIGH',     category: 'Communication',      owasp: 'A02', compliance: { iso27001: 'A.9.4.3', soc2: 'CC6.6', pciDss: null,        hipaa: null        } },
  { id: 'VCS-001',  name: 'GitHub PAT',                regex: /(?:ghp_|github_pat_)[A-Za-z0-9_]{20,}/g, severity: 'CRITICAL', category: 'Version Control', owasp: 'A02', compliance: { iso27001: 'A.9.2.3', soc2: 'CC6.1', pciDss: 'Req 6.3',  hipaa: null        } },
  { id: 'VCS-002',  name: 'GitHub OAuth Token',        regex: /gho_[A-Za-z0-9]{36}/g,              severity: 'HIGH',     category: 'Version Control',    owasp: 'A02', compliance: { iso27001: 'A.9.2.3', soc2: 'CC6.1', pciDss: 'Req 6.3',  hipaa: null        } },
  { id: 'VCS-003',  name: 'GitLab Token',              regex: /glpat-[A-Za-z0-9_-]{20,}/g,        severity: 'CRITICAL', category: 'Version Control',    owasp: 'A02', compliance: { iso27001: 'A.9.2.3', soc2: 'CC6.1', pciDss: 'Req 6.3',  hipaa: null        } },
  { id: 'DB-001',   name: 'Database Connection String',regex: /(?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|redis):\/\/[^\s"']{10,}/gi, severity: 'CRITICAL', category: 'Database', owasp: 'A02', compliance: { iso27001: 'A.9.4.3', soc2: 'CC6.1', pciDss: 'Req 6.3',  hipaa: '§164.312'  } },
  { id: 'AUTH-001', name: 'JWT Token',                 regex: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, severity: 'HIGH', category: 'Authentication', owasp: 'A07', compliance: { iso27001: 'A.9.4.2', soc2: 'CC6.1', pciDss: 'Req 8.2',  hipaa: '§164.312'  } },
  { id: 'AUTH-002', name: 'Private Key Block',         regex: /-----BEGIN\s+(RSA|EC|DSA|OPENSSH)?\s*PRIVATE KEY-----/g, severity: 'CRITICAL', category: 'Authentication', owasp: 'A02', compliance: { iso27001: 'A.10.1.1', soc2: 'CC6.1', pciDss: 'Req 3.4', hipaa: '§164.312'  } },
  { id: 'GEN-001',  name: 'Hardcoded Secret/Password', regex: /(?:secret|token|password|passwd|pwd|api_key|apikey|access_key)\s*[:=]\s*["'][^"']{8,}["']/gi, severity: 'HIGH', category: 'Generic', owasp: 'A02', compliance: { iso27001: 'A.9.4.3', soc2: 'CC6.1', pciDss: 'Req 6.3',  hipaa: '§164.308'  } },
  { id: 'GEN-002',  name: 'Environment File Committed',regex: /^(?:DB_PASSWORD|SECRET_KEY|API_SECRET|PRIVATE_KEY)\s*=\s*.{3,}/gm, severity: 'CRITICAL', category: 'Generic', owasp: 'A05', compliance: { iso27001: 'A.12.1.2', soc2: 'CC6.6', pciDss: 'Req 6.3', hipaa: '§164.308'  } },
  { id: 'GEN-003',  name: 'Hardcoded IP with Port',    regex: /(?:\d{1,3}\.){3}\d{1,3}:\d{2,5}/g, severity: 'MEDIUM',   category: 'Generic',            owasp: 'A05', compliance: { iso27001: 'A.12.1.2', soc2: 'CC7.2', pciDss: null,        hipaa: null        } },
  { id: 'ENV-001',  name: 'VITE_ Prefix on Server Secret', regex: /VITE_(?:SECRET|KEY|PASSWORD|TOKEN|DATABASE|PRIVATE|API)[A-Z_]*\s*=/g, severity: 'HIGH', category: 'Env Misconfiguration', owasp: 'A05', compliance: { iso27001: 'A.14.2.5', soc2: 'CC6.6', pciDss: 'Req 6.3', hipaa: null        } },
  { id: 'XSS-001',  name: 'React dangerouslySetInnerHTML', regex: /dangerouslySetInnerHTML\s*=\s*\{\{/g, severity: 'HIGH', category: 'XSS / Injection',   owasp: 'A03', compliance: { iso27001: 'A.14.2.5', soc2: 'CC8.1', pciDss: 'Req 6.5',  hipaa: null        } },
  { id: 'XSS-002',  name: 'Direct DOM innerHTML',      regex: /\.innerHTML\s*=|document\.write\s*\(/g, severity: 'HIGH', category: 'XSS / Injection',   owasp: 'A03', compliance: { iso27001: 'A.14.2.5', soc2: 'CC8.1', pciDss: 'Req 6.5',  hipaa: null        } },
  { id: 'XSS-003',  name: '/* SECURITY: /* SECURITY: /* SECURITY: eval() is dangerous */ eval() is dangerous */ eval() is dangerous */ eval() / new Function()',   regex: /\beval\s*\(|new\s+Function\s*\(/g,  severity: 'CRITICAL', category: 'XSS / Injection',   owasp: 'A03', compliance: { iso27001: 'A.14.2.5', soc2: 'CC8.1', pciDss: 'Req 6.5',  hipaa: null        } },
  // { id: 'LOG-001',  name: 'console.log in Source',     regex: /console\.log\s*\(/g,                 severity: 'LOW',      category: 'Security Logging',   owasp: 'A09', compliance: { iso27001: 'A.12.4.1', soc2: 'CC7.2', pciDss: 'Req 10.2', hipaa: '§164.312'  } },
]

const BLOAT_REGISTRY = [
  { package: 'moment',    weight: 67,   weightStr: '67 kB',  alternative: 'Day.js (7 kB) or native Intl API' },
  { package: 'lodash',    weight: 71,   weightStr: '71 kB',  alternative: 'Native ES2022 array/object methods' },
  { package: 'axios',     weight: 13,   weightStr: '13 kB',  alternative: 'Native fetch() or ky (4 kB)' },
  { package: 'uuid',      weight: 1.8,  weightStr: '1.8 kB', alternative: 'crypto.randomUUID() — zero cost' },
  { package: 'underscore',weight: 16,   weightStr: '16 kB',  alternative: 'Native JS methods' },
  { package: 'jquery',    weight: 88,   weightStr: '88 kB',  alternative: 'React refs and state' },
  { package: 'request',   weight: 182,  weightStr: '182 kB', alternative: 'Native fetch()' },
]
const RUNTIME_ONLY = ['husky', 'vite', 'eslint']
const DEMO_TRAPS   = ['mongodb', 'pg', 'redis']
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
  const allFiles = collectFiles(__dirname, ['.js','.jsx','.ts','.tsx','.json','.env','.yml','.yaml','.md'], IGNORE_DIRS, [...IGNORE_FILES,'package-lock.json','yarn.lock'])
  const violations = []

  for (const file of allFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8')
      const lines   = content.split('\n')
      for (const pattern of SECURITY_PATTERNS) {
        for (let i = 0; i < lines.length; i++) {
          pattern.regex.lastIndex = 0
          if (lines[i].match(pattern.regex)) {
            violations.push({
              ruleId:      pattern.id,
              ruleName:    pattern.name,
              severity:    pattern.severity,
              category:    pattern.category,
              owasp:       pattern.owasp,
              compliance:  pattern.compliance,
              file:        path.relative(__dirname, file).replace(/\\/g, '/'),
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
function runDependencyScan() {
  const pkg    = JSON.parse(fs.readFileSync(PKG_PATH, 'utf-8'))
  const deps   = Object.keys(pkg.dependencies    || {})
  const devDeps= Object.keys(pkg.devDependencies || {})
  const allDeps= [...deps, ...devDeps]

  const srcFiles = collectFiles(SRC_DIR, SCAN_EXTS, IGNORE_DIRS, IGNORE_FILES)
  const imported = new Set()
  const importPatterns = [
    /from\s+['"]([^.\/][^'"]*)['"]/g,
    /require\s*\(\s*['"]([^.\/][^'"]*)['"]\s*\)/g,
  ]
  for (const file of srcFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8')
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

  const unused  = deps.filter(p => !imported.has(p) && !RUNTIME_ONLY.includes(p))
  const missing = [...imported].filter(p => !allDeps.includes(p) && !NODE_BUILTINS.has(p) && !DEMO_TRAPS.includes(p))
  const bloat   = BLOAT_REGISTRY.filter(b => allDeps.includes(b.package))
  const totalBloatKb = bloat.reduce((sum, b) => sum + b.weight, 0)

  return { unused, missing, bloat, totalBloatKb, srcFileCount: srcFiles.length, totalPackages: allDeps.length }
}

// ─── ASSEMBLE REPORT ──────────────────────────────────────────
function buildReport() {
  const startTime = Date.now()
  const secViolations  = runSecurityScan()
  const depReport      = runDependencyScan()

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
      version:      '3.1',
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

  // Ensure public/ directory exists
  const publicDir = path.join(TARGET_DIR, 'public')
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true })

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2), 'utf-8')
  console.log(`[scanner-output] Report written to: ${path.relative(__dirname, OUTPUT_PATH)}`)
  console.log(`[scanner-output] Security violations: ${secViolations.length} | Unused deps: ${depReport.unused.length} | Bloat: ${bloatKb} kB`)

  // ─── APPEND TO SCAN HISTORY ─────────────────────────────────
  const HISTORY_PATH = path.join(TARGET_DIR, 'public', 'scan-history.json')
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

  // ─── WRITE KNOWLEDGE BASE (Level 1) ─────────────────────────
  const KB_DIR = path.join(TARGET_DIR, 'kb')
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

buildReport()
