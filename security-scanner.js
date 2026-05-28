#!/usr/bin/env node
// ============================================================
// 🛡️ SECURITY SCANNER v3.0 - DevOps-Guard Quality Gate
// Scans all source files for leaked secrets, API keys, 
// XSS vulnerabilities, and environment misconfigurations.
// Supports 28 rules across 12 categories (OWASP Top 10 mapped).
// Triggered automatically via the Husky pre-commit hook.
// On CRITICAL/HIGH violation → process.exit(1) → commit blocked.
// ============================================================

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ─── CẤU HÌNH CÁC PATTERN NGUY HIỂM (28 RULES) ──────────────
const SECURITY_PATTERNS = [
  // ═══════════════════════════════════════════════════════════
  // CATEGORY 1: GOOGLE / FIREBASE
  // ═══════════════════════════════════════════════════════════
  {
    id: 'GOOG-001',
    name: 'Google API Key',
    regex: /AIzaSy[0-9A-Za-z_-]{33}/g,
    severity: 'CRITICAL',
    category: 'Google Cloud',
    description: 'Google API Key found — can be abused for unauthorized cost generation',
    remediation: 'Use environment variables (e.g., VITE_GOOGLE_API_KEY) in .env',
  },
  {
    id: 'GOOG-002',
    name: 'Firebase Config Value',
    regex: /firebase[A-Za-z]*\s*[:=]\s*["'][A-Za-z0-9_-]{20,}["']/gi,
    severity: 'HIGH',
    category: 'Google Cloud',
    description: 'Firebase configuration key exposed',
    remediation: 'Use environment variables VITE_FIREBASE_* in .env',
  },
  {
    id: 'GOOG-003',
    name: 'Google OAuth Client Secret',
    regex: /GOCSPX-[A-Za-z0-9_-]{28,}/g,
    severity: 'CRITICAL',
    category: 'Google Cloud',
    description: 'Google OAuth Client Secret exposed — allows authentication bypass',
    remediation: 'Keep in server-side env, never expose in client code',
  },
  {
    id: 'GOOG-004',
    name: 'Google Service Account Key',
    regex: /"type"\s*:\s*"service_account"/g,
    severity: 'CRITICAL',
    category: 'Google Cloud',
    description: 'Google Service Account JSON key — grants broad GCP access',
    remediation: 'Use Workload Identity Federation instead of static JSON keys',
  },

  // ═══════════════════════════════════════════════════════════
  // CATEGORY 2: AWS
  // ═══════════════════════════════════════════════════════════
  {
    id: 'AWS-001',
    name: 'AWS Access Key ID',
    regex: /AKIA[0-9A-Z]{16}/g,
    severity: 'CRITICAL',
    category: 'AWS',
    description: 'AWS Access Key ID exposed — potential unauthorized cloud resource access',
    remediation: 'Use AWS IAM roles or AWS Secrets Manager',
  },
  {
    id: 'AWS-002',
    name: 'AWS Secret Access Key',
    regex: /(?:aws_secret_access_key|aws_secret)\s*[:=]\s*["']?[A-Za-z0-9/+=]{40}["']?/gi,
    severity: 'CRITICAL',
    category: 'AWS',
    description: 'AWS Secret Access Key exposed',
    remediation: 'Revoke and rotate immediately in AWS IAM Console',
  },

  // ═══════════════════════════════════════════════════════════
  // CATEGORY 3: OPENAI / AI SERVICES
  // ═══════════════════════════════════════════════════════════
  {
    id: 'AI-001',
    name: 'OpenAI API Key',
    regex: /sk-proj-[A-Za-z0-9]{20,}/g,
    severity: 'CRITICAL',
    category: 'AI Services',
    description: 'OpenAI API Key found — risks unauthorized usage costs',
    remediation: 'Use environment variable OPENAI_API_KEY with usage limits',
  },
  {
    id: 'AI-002',
    name: 'OpenAI Legacy Key',
    regex: /sk-[A-Za-z0-9]{48}/g,
    severity: 'CRITICAL',
    category: 'AI Services',
    description: 'OpenAI Legacy API Key format detected',
    remediation: 'Rotate key at platform.openai.com/api-keys',
  },
  {
    id: 'AI-003',
    name: 'Anthropic API Key',
    regex: /sk-ant-[A-Za-z0-9_-]{40,}/g,
    severity: 'CRITICAL',
    category: 'AI Services',
    description: 'Anthropic (Claude) API Key exposed',
    remediation: 'Store in ANTHROPIC_API_KEY environment variable',
  },

  // ═══════════════════════════════════════════════════════════
  // CATEGORY 4: PAYMENT / FINTECH
  // ═══════════════════════════════════════════════════════════
  {
    id: 'PAY-001',
    name: 'Stripe Secret/Restricted Key',
    regex: /(?:sk_live_|rk_live_)[0-9a-zA-Z_]{20,}/g,
    severity: 'CRITICAL',
    category: 'Payment',
    description: 'Stripe Live Secret Key detected — permits real financial transactions',
    remediation: 'Use sk_test_ for development. Store live keys in server-side env',
  },
  {
    id: 'PAY-002',
    name: 'Stripe Publishable Key (Live)',
    regex: /pk_live_[0-9a-zA-Z]{24,}/g,
    severity: 'MEDIUM',
    category: 'Payment',
    description: 'Stripe Live Publishable Key exposed',
    remediation: 'Use VITE_STRIPE_PK and restrict allowed domains in Stripe Dashboard',
  },

  // ═══════════════════════════════════════════════════════════
  // CATEGORY 5: COMMUNICATION SERVICES
  // ═══════════════════════════════════════════════════════════
  {
    id: 'COM-001',
    name: 'Twilio API Key',
    regex: /SK[0-9a-fA-F]{32}/g,
    severity: 'HIGH',
    category: 'Communication',
    description: 'Twilio API Key exposed — potential for unauthorized SMS/Calls',
    remediation: 'Store in TWILIO_API_KEY environment variable',
  },
  {
    id: 'COM-002',
    name: 'SendGrid API Key',
    regex: /SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}/g,
    severity: 'HIGH',
    category: 'Communication',
    description: 'SendGrid API Key exposed — potential unauthorized email sending',
    remediation: 'Store in SENDGRID_API_KEY environment variable',
  },
  {
    id: 'COM-003',
    name: 'Slack Bot/Webhook Token',
    regex: /xox[baprs]-[0-9A-Za-z-]{10,}/g,
    severity: 'HIGH',
    category: 'Communication',
    description: 'Slack Token exposed — unauthorized workspace access',
    remediation: 'Store in SLACK_BOT_TOKEN environment variable',
  },

  // ═══════════════════════════════════════════════════════════
  // CATEGORY 6: VERSION CONTROL / CI-CD
  // ═══════════════════════════════════════════════════════════
  {
    id: 'VCS-001',
    name: 'GitHub Personal Access Token',
    regex: /(?:ghp_|github_pat_)[A-Za-z0-9_]{20,}/g,
    severity: 'CRITICAL',
    category: 'Version Control',
    description: 'GitHub PAT detected — potential repo/org-wide access',
    remediation: 'Use fine-grained PATs with minimal scope, store in GitHub Secrets',
  },
  {
    id: 'VCS-002',
    name: 'GitHub OAuth Access Token',
    regex: /gho_[A-Za-z0-9]{36}/g,
    severity: 'HIGH',
    category: 'Version Control',
    description: 'GitHub OAuth Token exposed',
    remediation: 'Store in server-side environment variables',
  },
  {
    id: 'VCS-003',
    name: 'GitLab Token',
    regex: /glpat-[A-Za-z0-9_-]{20,}/g,
    severity: 'CRITICAL',
    category: 'Version Control',
    description: 'GitLab Personal Access Token exposed',
    remediation: 'Rotate token in GitLab Settings > Access Tokens',
  },

  // ═══════════════════════════════════════════════════════════
  // CATEGORY 7: DATABASE
  // ═══════════════════════════════════════════════════════════
  {
    id: 'DB-001',
    name: 'Database Connection String',
    regex: /(?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|redis):\/\/[^\s"']{10,}/gi,
    severity: 'CRITICAL',
    category: 'Database',
    description: 'Database connection string containing credentials detected',
    remediation: 'Use DATABASE_URL environment variable',
  },

  // ═══════════════════════════════════════════════════════════
  // CATEGORY 8: CRYPTO / AUTH
  // ═══════════════════════════════════════════════════════════
  {
    id: 'AUTH-001',
    name: 'JWT Token',
    regex: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
    severity: 'HIGH',
    category: 'Authentication',
    description: 'JWT Token hardcoded in source code',
    remediation: 'JWTs must be generated at runtime, never hardcoded',
  },
  {
    id: 'AUTH-002',
    name: 'Private Key Block',
    regex: /-----BEGIN\s+(RSA|EC|DSA|OPENSSH)?\s*PRIVATE KEY-----/g,
    severity: 'CRITICAL',
    category: 'Authentication',
    description: 'Private Key block detected in source',
    remediation: 'Use a secret manager (HashiCorp Vault, AWS KMS). Never commit keys',
  },

  // ═══════════════════════════════════════════════════════════
  // CATEGORY 9: GENERIC PATTERNS
  // ═══════════════════════════════════════════════════════════
  {
    id: 'GEN-001',
    name: 'Hardcoded Secret/Token/Password',
    regex: /(?:secret|token|password|passwd|pwd|api_key|apikey|access_key)\s*[:=]\s*["'][^"']{8,}["']/gi,
    severity: 'HIGH',
    category: 'Generic',
    description: 'Hardcoded credentials found in source',
    remediation: 'Move all secrets to .env file and add .env to .gitignore',
  },
  {
    id: 'GEN-002',
    name: 'Environment File Committed',
    regex: /^(?:DB_PASSWORD|SECRET_KEY|API_SECRET|PRIVATE_KEY)\s*=\s*.{3,}/gm,
    severity: 'CRITICAL',
    category: 'Generic',
    description: '.env variables found directly in codebase',
    remediation: 'Remove from git, add .env to .gitignore, and rotate secrets',
  },
  {
    id: 'GEN-003',
    name: 'Hardcoded IP with Port',
    regex: /(?:https?:\/\/)?(?:\d{1,3}\.){3}\d{1,3}:\d{2,5}/g,
    severity: 'MEDIUM',
    category: 'Generic',
    description: 'Hardcoded infrastructure IP/Port identified',
    remediation: 'Use environment variables or service discovery',
  },
  // ═══════════════════════════════════════════════════════════
  // CATEGORY 10: ENV VAR MISCONFIGURATION [OWASP A05]
  // ═══════════════════════════════════════════════════════════
  {
    id: 'ENV-001',
    name: 'VITE_ Prefix on Server Secret',
    regex: /VITE_(?:SECRET|KEY|PASSWORD|TOKEN|DATABASE|PRIVATE|API)[A-Z_]*\s*=/g,
    severity: 'HIGH',
    category: 'Env Misconfiguration',
    description: 'VITE_ prefix embeds this variable into the client JS bundle — server secrets become publicly readable in the browser',
    remediation: 'Remove VITE_ prefix. Access via process.env.VAR_NAME in server-side code only.',
  },

  // ═══════════════════════════════════════════════════════════
  // CATEGORY 11: XSS / INJECTION [OWASP A03]
  // ═══════════════════════════════════════════════════════════
  {
    id: 'XSS-001',
    name: 'React dangerouslySetInnerHTML',
    regex: /dangerouslySetInnerHTML\s*=\s*\{\{/g,
    severity: 'HIGH',
    category: 'XSS / Injection',
    description: 'dangerouslySetInnerHTML bypasses React DOM sanitization — enables XSS if value contains user input',
    remediation: 'Use DOMPurify.sanitize() on the value, or render as plain text: <div>{content}</div>',
  },
  {
    id: 'XSS-002',
    name: 'Direct DOM innerHTML / document.write',
    regex: /\.innerHTML\s*=|document\.write\s*\(/g,
    severity: 'HIGH',
    category: 'XSS / Injection',
    description: 'Direct innerHTML or document.write() enables XSS when user data is injected',
    remediation: 'Use element.textContent for plain text. Use DOMPurify for trusted HTML.',
  },
  {
    id: 'XSS-003',
    name: 'eval() / new Function() Code Injection',
    regex: /\beval\s*\(|new\s+Function\s*\(/g,
    severity: 'CRITICAL',
    category: 'XSS / Injection',
    description: 'eval() and new Function(string) execute arbitrary code — critical code injection risk',
    remediation: 'Never pass user input to eval(). Use JSON.parse() for data. Use a sandboxed evaluator for expressions.',
  },

  // ═══════════════════════════════════════════════════════════
  // CATEGORY 12: SECURITY LOGGING [OWASP A09]
  // ═══════════════════════════════════════════════════════════
  {
    id: 'LOG-001',
    name: 'console.log in Source',
    regex: /console\.log\s*\(/g,
    severity: 'LOW',
    category: 'Security Logging',
    description: 'console.log can leak sensitive runtime data (tokens, user objects) in production',
    remediation: 'Remove debug logs before committing. Use a structured logger with log levels.',
  },
]

// ─── IGNORED DIRECTORIES AND FILES ─────────────────────────
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', '.husky', '.github', 'coverage']
const IGNORE_FILES = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'security-scanner.js']
const SCAN_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.json', '.env', '.yml', '.yaml', '.md', '.toml', '.cfg', '.ini', '.conf']

// ─── UTILITIES ─────────────────────────────────────────────────────
const COLORS = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  underline: '\x1b[4m',
  reset: '\x1b[0m',
}

const SEVERITY_ICON = {
  CRITICAL: '🔴',
  HIGH: '🟠',
  MEDIUM: '🟡',
  LOW: '🟢',
}

function log(color, ...args) {
  console.log(`${COLORS[color]}${args.join(' ')}${COLORS.reset}`)
}

// ─── THU THẬP FILE ĐỆ QUY ────────────────────────────────────
function collectFiles(dir) {
  const results = []
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (!IGNORE_DIRS.includes(entry.name)) {
          results.push(...collectFiles(fullPath))
        }
      } else {
        if (IGNORE_FILES.includes(entry.name)) continue
        const ext = path.extname(entry.name).toLowerCase()
        if (SCAN_EXTENSIONS.includes(ext) || entry.name.startsWith('.env')) {
          results.push(fullPath)
        }
      }
    }
  } catch {
  }
  return results
}

// ─── QUÉT MỘT FILE ───────────────────────────────────────────
function scanFile(filePath) {
  const violations = []
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')

    for (const pattern of SECURITY_PATTERNS) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        pattern.regex.lastIndex = 0
        const matches = line.match(pattern.regex)
        if (matches) {
          violations.push({
            id: pattern.id,
            file: path.relative(__dirname, filePath),
            line: i + 1,
            pattern: pattern.name,
            severity: pattern.severity,
            category: pattern.category,
            description: pattern.description,
            remediation: pattern.remediation,
            match: matches[0].substring(0, 24) + '...',
            content: line.trim().substring(0, 100),
          })
        }
      }
    }
  } catch {
  }
  return violations
}

// ─── BÁO CÁO THỐNG KÊ ──────────────────────────────────────
function printSummary(violations) {
  const bySeverity = {}
  const byCategory = {}
  for (const v of violations) {
    bySeverity[v.severity] = (bySeverity[v.severity] || 0) + 1
    byCategory[v.category] = (byCategory[v.category] || 0) + 1
  }

  log('cyan', `${COLORS.bold}  📊 VIOLATION SUMMARY`)
  console.log()

  log('dim', '  By Severity:')
  for (const [sev, count] of Object.entries(bySeverity).sort()) {
    const icon = SEVERITY_ICON[sev] || '⚪'
    const color = sev === 'CRITICAL' ? 'red' : sev === 'HIGH' ? 'yellow' : 'dim'
    log(color, `    ${icon} ${sev}: ${count} violations`)
  }
  console.log()

  log('dim', '  By Category:')
  for (const [cat, count] of Object.entries(byCategory).sort()) {
    log('dim', `    📁 ${cat}: ${count} violations`)
  }
  console.log()
}

// ─── CHƯƠNG TRÌNH CHÍNH ──────────────────────────────────────
function main() {
  const startTime = Date.now()

  console.log()
  log('cyan', '━'.repeat(64))
  log('cyan', `${COLORS.bold}  🛡️  DEVOPS-GUARD SECURITY SCANNER v3.0`)
  log('cyan', `  ${COLORS.dim}${SECURITY_PATTERNS.length} security rules loaded`)
  log('cyan', '━'.repeat(64))
  console.log()

  const projectDir = __dirname
  log('dim', `  📂 Scanning directory: ${projectDir}`)

  const files = collectFiles(projectDir)
  log('dim', `  📄 Tìm thấy ${files.length} file cần quét`)
  log('dim', `  🔍 Áp dụng ${SECURITY_PATTERNS.length} quy tắc bảo mật`)
  console.log()

  let allViolations = []

  for (const file of files) {
    const violations = scanFile(file)
    allViolations.push(...violations)
  }

  const elapsed = Date.now() - startTime

  if (allViolations.length > 0) {
    log('red', `${COLORS.bold}  ❌ CẢNH BÁO BẢO MẬT: Phát hiện ${allViolations.length} vi phạm!`)
    console.log()

    // Nhóm theo file
    const byFile = {}
    for (const v of allViolations) {
      if (!byFile[v.file]) byFile[v.file] = []
      byFile[v.file].push(v)
    }

    for (const [file, violations] of Object.entries(byFile)) {
      log('magenta', `${COLORS.bold}  📄 ${file}`)
      for (const v of violations) {
        const sevColor = v.severity === 'CRITICAL' ? 'red' : v.severity === 'HIGH' ? 'yellow' : 'dim'
        const icon = SEVERITY_ICON[v.severity]
        log(sevColor,  `  ┌─ ${icon} [${v.id}] ${v.severity} — ${v.pattern}`)
        log('dim',     `  │  📍 Line ${v.line}: ${v.content}`)
        log('dim',     `  │  📝 ${v.description}`)
        log('green',   `  │  💡 ${v.remediation}`)
        log(sevColor,  `  └${'─'.repeat(56)}`)
      }
      console.log()
    }

    // Thống kê
    printSummary(allViolations)

    log('red', '━'.repeat(64))
    log('red', `${COLORS.bold}  🚫 COMMIT BỊ CHẶN — Xóa secrets trước khi commit!`)
    log('dim', `  ⏱️  Quét hoàn tất trong ${elapsed}ms`)
    log('red', '━'.repeat(64))
    console.log()

    process.exit(1)
  } else {
    log('green', `${COLORS.bold}  ✅ AN TOÀN: Không phát hiện rò rỉ bảo mật`)
    log('green', `  📄 Đã quét ${files.length} file × ${SECURITY_PATTERNS.length} rules`)
    log('dim',   `  ⏱️  Hoàn tất trong ${elapsed}ms`)
    console.log()
    log('green', '━'.repeat(64))
    console.log()
    process.exit(0)
  }
}

main()
