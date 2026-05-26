#!/usr/bin/env node
// ============================================================
// 🛡️ SECURITY SCANNER v2.0 - DevOps-Guard Quality Gate
// Quét toàn bộ mã nguồn để phát hiện rò rỉ khóa bảo mật.
// Hỗ trợ 20+ loại API Key & Secret patterns.
// Được kích hoạt tự động qua Husky pre-commit hook.
// Nếu phát hiện vi phạm → process.exit(1) → chặn commit.
// ============================================================

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ─── CẤU HÌNH CÁC PATTERN NGUY HIỂM (20+ RULES) ──────────────
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
    description: 'Google API Key lộ thiên — có thể bị lạm dụng tạo chi phí lớn',
    remediation: 'Chuyển vào biến môi trường VITE_GOOGLE_API_KEY trong file .env',
  },
  {
    id: 'GOOG-002',
    name: 'Firebase Config Value',
    regex: /firebase[A-Za-z]*\s*[:=]\s*["'][A-Za-z0-9_-]{20,}["']/gi,
    severity: 'HIGH',
    category: 'Google Cloud',
    description: 'Firebase config value lộ thiên',
    remediation: 'Sử dụng biến môi trường VITE_FIREBASE_* trong .env',
  },
  {
    id: 'GOOG-003',
    name: 'Google OAuth Client Secret',
    regex: /GOCSPX-[A-Za-z0-9_-]{28,}/g,
    severity: 'CRITICAL',
    category: 'Google Cloud',
    description: 'Google OAuth Client Secret — cho phép giả mạo xác thực',
    remediation: 'Lưu trong server-side env, KHÔNG bao giờ đưa vào client code',
  },
  {
    id: 'GOOG-004',
    name: 'Google Service Account Key',
    regex: /"type"\s*:\s*"service_account"/g,
    severity: 'CRITICAL',
    category: 'Google Cloud',
    description: 'Google Service Account JSON Key — full access vào GCP project',
    remediation: 'KHÔNG commit file service account. Dùng Workload Identity Federation',
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
    description: 'AWS Access Key ID — có thể truy cập toàn bộ tài nguyên AWS',
    remediation: 'Dùng AWS IAM Roles hoặc lưu trong AWS Secrets Manager',
  },
  {
    id: 'AWS-002',
    name: 'AWS Secret Access Key',
    regex: /(?:aws_secret_access_key|aws_secret)\s*[:=]\s*["']?[A-Za-z0-9/+=]{40}["']?/gi,
    severity: 'CRITICAL',
    category: 'AWS',
    description: 'AWS Secret Access Key lộ thiên',
    remediation: 'Xóa ngay và rotate key trong AWS IAM Console',
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
    description: 'OpenAI API Key — có thể bị lạm dụng gây hóa đơn khổng lồ',
    remediation: 'Lưu trong OPENAI_API_KEY env var, thiết lập usage limit',
  },
  {
    id: 'AI-002',
    name: 'OpenAI Legacy Key',
    regex: /sk-[A-Za-z0-9]{48}/g,
    severity: 'CRITICAL',
    category: 'AI Services',
    description: 'OpenAI Legacy API Key format',
    remediation: 'Rotate key ngay tại platform.openai.com/api-keys',
  },
  {
    id: 'AI-003',
    name: 'Anthropic API Key',
    regex: /sk-ant-[A-Za-z0-9_-]{40,}/g,
    severity: 'CRITICAL',
    category: 'AI Services',
    description: 'Anthropic (Claude) API Key lộ thiên',
    remediation: 'Lưu trong ANTHROPIC_API_KEY env var',
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
    description: 'Stripe Live Secret/Restricted Key — có thể thực hiện giao dịch thật',
    remediation: 'CHỈ dùng sk_test_ trong dev. Lưu sk_live_ trong server env',
  },
  {
    id: 'PAY-002',
    name: 'Stripe Publishable Key (Live)',
    regex: /pk_live_[0-9a-zA-Z]{24,}/g,
    severity: 'MEDIUM',
    category: 'Payment',
    description: 'Stripe Live Publishable Key — nên giới hạn domain',
    remediation: 'Dùng VITE_STRIPE_PK env var, restrict domain trong Stripe Dashboard',
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
    description: 'Twilio API Key — có thể gửi SMS/gọi điện trái phép',
    remediation: 'Lưu trong TWILIO_API_KEY env var',
  },
  {
    id: 'COM-002',
    name: 'SendGrid API Key',
    regex: /SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}/g,
    severity: 'HIGH',
    category: 'Communication',
    description: 'SendGrid API Key — có thể gửi email hàng loạt',
    remediation: 'Lưu trong SENDGRID_API_KEY env var',
  },
  {
    id: 'COM-003',
    name: 'Slack Bot/Webhook Token',
    regex: /xox[baprs]-[0-9A-Za-z-]{10,}/g,
    severity: 'HIGH',
    category: 'Communication',
    description: 'Slack Token lộ thiên — truy cập workspace trái phép',
    remediation: 'Lưu trong SLACK_BOT_TOKEN env var',
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
    description: 'GitHub PAT — toàn quyền truy cập repo/org',
    remediation: 'Dùng fine-grained PAT với quyền tối thiểu, lưu trong GitHub Secrets',
  },
  {
    id: 'VCS-002',
    name: 'GitHub OAuth Access Token',
    regex: /gho_[A-Za-z0-9]{36}/g,
    severity: 'HIGH',
    category: 'Version Control',
    description: 'GitHub OAuth Token lộ thiên',
    remediation: 'Lưu trong server env, không commit vào repo',
  },
  {
    id: 'VCS-003',
    name: 'GitLab Token',
    regex: /glpat-[A-Za-z0-9_-]{20,}/g,
    severity: 'CRITICAL',
    category: 'Version Control',
    description: 'GitLab Personal Access Token',
    remediation: 'Rotate token tại GitLab Settings > Access Tokens',
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
    description: 'Database connection string chứa credentials',
    remediation: 'Lưu trong DATABASE_URL env var, dùng connection pooling',
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
    description: 'JWT Token hardcoded — có thể chứa thông tin nhạy cảm',
    remediation: 'JWT phải được tạo runtime, không hardcode trong source',
  },
  {
    id: 'AUTH-002',
    name: 'Private Key Block',
    regex: /-----BEGIN\s+(RSA|EC|DSA|OPENSSH)?\s*PRIVATE KEY-----/g,
    severity: 'CRITICAL',
    category: 'Authentication',
    description: 'Private Key trong mã nguồn — toàn quyền giải mã/ký',
    remediation: 'Lưu key trong vault (HashiCorp Vault, AWS KMS). KHÔNG bao giờ commit',
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
    description: 'Chuỗi secret/token/password hardcoded trong source',
    remediation: 'Chuyển tất cả secrets vào file .env và thêm .env vào .gitignore',
  },
  {
    id: 'GEN-002',
    name: 'Environment File Committed',
    regex: /^(?:DB_PASSWORD|SECRET_KEY|API_SECRET|PRIVATE_KEY)\s*=\s*.{3,}/gm,
    severity: 'CRITICAL',
    category: 'Generic',
    description: 'File .env chứa secrets đang bị commit',
    remediation: 'Thêm .env vào .gitignore NGAY, rotate tất cả secrets bị lộ',
  },
  {
    id: 'GEN-003',
    name: 'Hardcoded IP with Port',
    regex: /(?:https?:\/\/)?(?:\d{1,3}\.){3}\d{1,3}:\d{2,5}/g,
    severity: 'MEDIUM',
    category: 'Generic',
    description: 'IP address với port hardcoded — lộ hạ tầng nội bộ',
    remediation: 'Dùng biến env hoặc service discovery thay vì hardcode IP',
  },
]

// ─── CÁC THƯ MỤC / FILE BỎ QUA ──────────────────────────────
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', '.husky', '.github', 'coverage']
const IGNORE_FILES = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'security-scanner.js']
const SCAN_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.json', '.env', '.yml', '.yaml', '.md', '.toml', '.cfg', '.ini', '.conf']

// ─── TIỆN ÍCH ─────────────────────────────────────────────────
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
        // Cũng quét file không có extension (như .env files)
        if (SCAN_EXTENSIONS.includes(ext) || entry.name.startsWith('.env')) {
          results.push(fullPath)
        }
      }
    }
  } catch {
    // skip inaccessible dirs
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
        // Reset regex lastIndex cho global flag
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
    // skip unreadable files
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

  log('cyan', `${COLORS.bold}  📊 THỐNG KÊ VI PHẠM`)
  console.log()

  log('dim', '  Theo mức độ:')
  for (const [sev, count] of Object.entries(bySeverity).sort()) {
    const icon = SEVERITY_ICON[sev] || '⚪'
    const color = sev === 'CRITICAL' ? 'red' : sev === 'HIGH' ? 'yellow' : 'dim'
    log(color, `    ${icon} ${sev}: ${count} vi phạm`)
  }
  console.log()

  log('dim', '  Theo danh mục:')
  for (const [cat, count] of Object.entries(byCategory).sort()) {
    log('dim', `    📁 ${cat}: ${count} vi phạm`)
  }
  console.log()
}

// ─── CHƯƠNG TRÌNH CHÍNH ──────────────────────────────────────
function main() {
  const startTime = Date.now()

  console.log()
  log('cyan', '━'.repeat(64))
  log('cyan', `${COLORS.bold}  🛡️  DEVOPS-GUARD SECURITY SCANNER v2.0`)
  log('cyan', `  ${COLORS.dim}${SECURITY_PATTERNS.length} security rules loaded`)
  log('cyan', '━'.repeat(64))
  console.log()

  const projectDir = __dirname
  log('dim', `  📂 Quét thư mục: ${projectDir}`)

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
