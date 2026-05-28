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

// ─── CONFIGURATION ─────────────────────────────────────────
const OUTPUT_PATH = path.join(__dirname, 'public', 'scan-report.json')
const SRC_DIR     = path.join(__dirname, 'src')
const PKG_PATH    = path.join(__dirname, 'package.json')
const SCAN_EXTS   = ['.js', '.jsx', '.ts', '.tsx', '.mjs']
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', 'coverage']
const IGNORE_FILES = [
  'dependency-scanner.js', 'security-scanner.js',
  'scanner-output.js', 'vite.config.js', 'eslint.config.js',
]

// ─── SECURITY PATTERNS (subset — same as security-scanner.js) ──
const SECURITY_PATTERNS = [
  { id: 'GOOG-001', name: 'Google API Key',            regex: /AIzaSy[0-9A-Za-z_-]{33}/g,           severity: 'CRITICAL', category: 'Google Cloud', owasp: 'A02' },
  { id: 'GOOG-002', name: 'Firebase Config Value',     regex: /firebase[A-Za-z]*\s*[:=]\s*["'][A-Za-z0-9_-]{20,}["']/gi, severity: 'HIGH', category: 'Google Cloud', owasp: 'A02' },
  { id: 'GOOG-003', name: 'Google OAuth Client Secret',regex: /GOCSPX-[A-Za-z0-9_-]{28,}/g,        severity: 'CRITICAL', category: 'Google Cloud', owasp: 'A02' },
  { id: 'AWS-001',  name: 'AWS Access Key ID',         regex: /AKIA[0-9A-Z]{16}/g,                  severity: 'CRITICAL', category: 'AWS',          owasp: 'A02' },
  { id: 'AWS-002',  name: 'AWS Secret Access Key',     regex: /aws_secret_access_key\s*[:=]\s*["']?[A-Za-z0-9/+=]{40}["']?/gi, severity: 'CRITICAL', category: 'AWS', owasp: 'A02' },
  { id: 'AI-001',   name: 'OpenAI API Key',            regex: /sk-proj-[A-Za-z0-9]{20,}/g,          severity: 'CRITICAL', category: 'AI Services',  owasp: 'A02' },
  { id: 'AI-002',   name: 'OpenAI Legacy Key',         regex: /sk-[A-Za-z0-9]{48}/g,                severity: 'CRITICAL', category: 'AI Services',  owasp: 'A02' },
  { id: 'AI-003',   name: 'Anthropic API Key',         regex: /sk-ant-[A-Za-z0-9_-]{40,}/g,        severity: 'CRITICAL', category: 'AI Services',  owasp: 'A02' },
  { id: 'PAY-001',  name: 'Stripe Secret/Restricted Key', regex: /(?:sk_live_|rk_live_)[0-9a-zA-Z_]{20,}/g, severity: 'CRITICAL', category: 'Payment', owasp: 'A02' },
  { id: 'PAY-002',  name: 'Stripe Publishable Key',    regex: /pk_live_[0-9a-zA-Z]{24,}/g,          severity: 'MEDIUM',   category: 'Payment',      owasp: 'A02' },
  { id: 'COM-001',  name: 'Twilio API Key',            regex: /SK[0-9a-fA-F]{32}/g,                 severity: 'HIGH',     category: 'Communication',owasp: 'A02' },
  { id: 'COM-002',  name: 'SendGrid API Key',          regex: /SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}/g, severity: 'HIGH', category: 'Communication', owasp: 'A02' },
  { id: 'COM-003',  name: 'Slack Bot/Webhook Token',   regex: /xox[baprs]-[0-9A-Za-z-]{10,}/g,     severity: 'HIGH',     category: 'Communication',owasp: 'A02' },
  { id: 'VCS-001',  name: 'GitHub PAT',                regex: /(?:ghp_|github_pat_)[A-Za-z0-9_]{20,}/g, severity: 'CRITICAL', category: 'Version Control', owasp: 'A02' },
  { id: 'VCS-002',  name: 'GitHub OAuth Token',        regex: /gho_[A-Za-z0-9]{36}/g,              severity: 'HIGH',     category: 'Version Control', owasp: 'A02' },
  { id: 'VCS-003',  name: 'GitLab Token',              regex: /glpat-[A-Za-z0-9_-]{20,}/g,        severity: 'CRITICAL', category: 'Version Control', owasp: 'A02' },
  { id: 'DB-001',   name: 'Database Connection String',regex: /(?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|redis):\/\/[^\s"']{10,}/gi, severity: 'CRITICAL', category: 'Database', owasp: 'A02' },
  { id: 'AUTH-001', name: 'JWT Token',                 regex: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, severity: 'HIGH', category: 'Authentication', owasp: 'A07' },
  { id: 'AUTH-002', name: 'Private Key Block',         regex: /-----BEGIN\s+(RSA|EC|DSA|OPENSSH)?\s*PRIVATE KEY-----/g, severity: 'CRITICAL', category: 'Authentication', owasp: 'A07' },
  { id: 'GEN-001',  name: 'Hardcoded Secret/Password', regex: /(?:secret|token|password|passwd|pwd|api_key|apikey|access_key)\s*[:=]\s*["'][^"']{8,}["']/gi, severity: 'HIGH', category: 'Generic', owasp: 'A02' },
  { id: 'GEN-002',  name: 'Environment File Committed',regex: /^(?:DB_PASSWORD|SECRET_KEY|API_SECRET|PRIVATE_KEY)\s*=\s*.{3,}/gm, severity: 'CRITICAL', category: 'Generic', owasp: 'A05' },
  { id: 'GEN-003',  name: 'Hardcoded IP with Port',    regex: /(?:\d{1,3}\.){3}\d{1,3}:\d{2,5}/g, severity: 'MEDIUM',   category: 'Generic',      owasp: 'A05' },
  { id: 'ENV-001',  name: 'VITE_ Prefix on Server Secret', regex: /VITE_(?:SECRET|KEY|PASSWORD|TOKEN|DATABASE|PRIVATE|API)[A-Z_]*\s*=/g, severity: 'HIGH', category: 'Env Misconfiguration', owasp: 'A05' },
  { id: 'XSS-001',  name: 'React dangerouslySetInnerHTML', regex: /dangerouslySetInnerHTML\s*=\s*\{\{/g, severity: 'HIGH', category: 'XSS / Injection', owasp: 'A03' },
  { id: 'XSS-002',  name: 'Direct DOM innerHTML',      regex: /\.innerHTML\s*=|document\.write\s*\(/g, severity: 'HIGH', category: 'XSS / Injection', owasp: 'A03' },
  { id: 'XSS-003',  name: 'eval() / new Function()',   regex: /\beval\s*\(|new\s+Function\s*\(/g,  severity: 'CRITICAL', category: 'XSS / Injection', owasp: 'A03' },
  { id: 'LOG-001',  name: 'console.log in Source',     regex: /console\.log\s*\(/g,                 severity: 'LOW',      category: 'Security Logging', owasp: 'A09' },
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
      version:      '3.0',
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
  const publicDir = path.join(__dirname, 'public')
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true })

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2), 'utf-8')
  console.log(`[scanner-output] Report written to: ${path.relative(__dirname, OUTPUT_PATH)}`)
  console.log(`[scanner-output] Security violations: ${secViolations.length} | Unused deps: ${depReport.unused.length} | Bloat: ${bloatKb} kB`)
}

buildReport()
