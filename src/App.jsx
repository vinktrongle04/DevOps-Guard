// ============================================================
// 🚨 BẪY BẢO MẬT (SECURITY LEAK TRAP)
// File này CỐ TÌNH chứa nhiều loại API Key lộ thiên để demo
// Security Gate v2.0 — 25 rules × 9 categories.
// DevOps-Guard sẽ phát hiện TẤT CẢ và chặn commit.
// ============================================================

import { useState, useContext, useRef, createContext } from 'react'
import UserProfile from './components/UserProfile.jsx'
import NotificationPanel from './components/NotificationPanel.jsx'
import SearchBar from './components/SearchBar.jsx'
import MetricsCard from './components/MetricsCard.jsx'
import { ThemeProvider, ThemeContext } from './contexts/ThemeContext.jsx'
import './App.css'

// ═══════════════════════════════════════════════════════════════
// ❌ HARDCODED SECRETS — MỖI DÒNG LÀ MỘT VI PHẠM BẢO MẬT
// ═══════════════════════════════════════════════════════════════

// 🔴 [GOOG-001] Google API Key
const apiKey = "AIzaSyDFj3kLm9Qw2xRtBvN8HpO5YzA1cE7gX0a"

// 🔴 [AI-001] OpenAI API Key
const OPENAI_KEY = "sk-proj-FAKE00000000000000000000000000000000000000000000"

// 🔴 [PAY-001] Stripe Live Secret Key  
const STRIPE_KEY_SECRET = "rk_live_DEMO_51NxBqRtY8mKvL3dF9wQzXcV7bA0"

// 🔴 [VCS-001] GitHub Personal Access Token
const GITHUB_TOKEN = "github_pat_FAKE0000000000000000000000000000000"

// 🔴 [AWS-001] AWS Access Key
const AWS_ACCESS_KEY = "AKIAIOSFODNN7EXAMPLE"

// 🟠 [COM-001] Twilio API Key
const TWILIO_KEY = "SK00000000000000000000000000000000"

// 🟠 [COM-002] SendGrid API Key
const SENDGRID_KEY = "SG.FAKE0000000000000000000.FAKE000000000000000000000000000000000000000000"

// 🔴 [DB-001] Database Connection String
const DATABASE_URL = "mongodb+srv://admin:SuperSecret123@cluster0.abc123.mongodb.net/production"

// ─── QUALITY GATES STATUS DATA ───────────────────────────────
const QUALITY_GATES = [
  {
    id: 'gate-1',
    name: 'Security Gate',
    icon: '🔐',
    status: 'critical',
    description: '8 secrets lộ thiên trong App.jsx + 7 secrets trong service files',
    details: [
      'Google API Key (GOOG-001)',
      'OpenAI Key (AI-001)',
      'Stripe Live Key (PAY-001)',
      'GitHub PAT (VCS-001)',
      'AWS Access Key (AWS-001)',
      'MongoDB URI (DB-001)',
      'JWT Token (AUTH-001)',
      'Private Key (AUTH-002)',
    ],
    action: 'Chạy: npm run security:scan',
  },
  {
    id: 'gate-2',
    name: 'Dependency Gate',
    icon: '📦',
    status: 'warning',
    description: '4 thư viện khai báo nhưng không import: lodash, axios, moment, uuid',
    details: [
      'lodash@4.17.21 — Không file nào import',
      'axios@1.7.9 — Dùng fetch() thay vì axios',
      'moment@2.30.1 — Dùng Date native',
      'uuid@11.1.0 — Không sử dụng',
    ],
    action: 'Agent quét package.json vs imports',
  },
  {
    id: 'gate-3',
    name: 'Refactor Engine',
    icon: '⚛️',
    status: 'warning',
    description: '4 components dùng cú pháp React 18 cũ cần migrate lên React 19',
    details: [
      'UserProfile.jsx — forwardRef + useContext',
      'NotificationPanel.jsx — forwardRef + useContext',
      'SearchBar.jsx — forwardRef + useContext',
      'MetricsCard.jsx — useContext',
    ],
    action: 'Agent refactor: forwardRef → ref prop, useContext → use()',
  },
  {
    id: 'gate-4',
    name: 'Docs Engine',
    icon: '📝',
    status: 'info',
    description: '6 components/utils chưa có tài liệu API đầy đủ',
    details: [
      'NotificationPanel — Chưa document',
      'SearchBar — Chưa document',
      'MetricsCard — Chưa document',
      'apiClient.js — Chưa document',
      'database.js — Chưa document',
      'auth.js — Chưa document',
    ],
    action: 'Agent append vào API_DOCUMENTATION.md',
  },
  {
    id: 'gate-5',
    name: 'Commit Engine',
    icon: '📋',
    status: 'info',
    description: 'Tự động sinh commit message chuẩn Conventional Commits',
    details: [
      'feat(scope): mô tả tính năng mới',
      'fix(scope): mô tả bug fix',
      'refactor(scope): tái cấu trúc code',
      'security(scope): sửa lỗi bảo mật',
    ],
    action: 'Agent phân tích git diff → sinh message',
  },
]

// ─── METRICS DATA ────────────────────────────────────────────
const METRICS = [
  { title: 'Secrets phát hiện', value: 15, unit: 'vi phạm', trend: 'down', icon: '🔐' },
  { title: 'Thư viện rác', value: 4, unit: 'packages', trend: 'down', icon: '📦' },
  { title: 'React 18 patterns', value: 4, unit: 'components', trend: 'down', icon: '⚛️' },
  { title: 'Thời gian tiết kiệm', value: 28, unit: 'phút/commit', trend: 'up', icon: '⏱️' },
]

// ─── DASHBOARD CONTENT ──────────────────────────────────────
// ❌ React 18 pattern: useContext (React 19 dùng use(ThemeContext))
function DashboardContent() {
  const theme = useContext(ThemeContext)
  const [activeGate, setActiveGate] = useState(null)
  const searchRef = useRef(null)
  const notifRef = useRef(null)

  // ❌ Sử dụng API Key trực tiếp (anti-pattern)
  const fetchData = async () => {
    const response = await fetch(
      `https://api.example.com/data?key=${apiKey}`
    )
    return response.json()
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'critical': return '#ef4444'
      case 'warning': return '#f59e0b'
      case 'info': return '#6366f1'
      default: return '#94a3b8'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'critical': return 'CRITICAL'
      case 'warning': return 'WARNING'
      case 'info': return 'READY'
      default: return 'UNKNOWN'
    }
  }

  return (
    <div className="app-container">
      {/* ─── HEADER ─────────────────────────────────────────── */}
      <header className="app-header">
        <div className="header-badge">TRAE SOLO × Hackathon 2026</div>
        <h1>🛡️ DevOps-Guard</h1>
        <p className="subtitle">
          Agentic Git & CI/CD Guard — Trợ lý Quản trị DevOps Tự trị
        </p>
        <p className="subtitle-detail">
          5 Quality Gates × 25 Security Rules × React 19 Auto-Migration
        </p>
      </header>

      {/* ─── SEARCH BAR ─────────────────────────────────────── */}
      <SearchBar ref={searchRef} placeholder="Tìm kiếm Quality Gate, rule, component..." />

      {/* ─── METRICS ROW ────────────────────────────────────── */}
      <section className="metrics-row">
        {METRICS.map((metric, idx) => (
          <MetricsCard
            key={idx}
            title={metric.title}
            value={metric.value}
            unit={metric.unit}
            trend={metric.trend}
            icon={metric.icon}
          />
        ))}
      </section>

      {/* ─── MAIN GRID ──────────────────────────────────────── */}
      <main className="main-grid">
        {/* LEFT: Quality Gates */}
        <section className="gates-panel">
          <h2 className="section-title">
            <span className="section-icon">🏗️</span>
            Quality Gates Pipeline
          </h2>

          <div className="gates-list">
            {QUALITY_GATES.map((gate) => (
              <div
                key={gate.id}
                className={`gate-card ${activeGate === gate.id ? 'gate-card--active' : ''}`}
                onClick={() => setActiveGate(activeGate === gate.id ? null : gate.id)}
              >
                <div className="gate-card__header">
                  <span className="gate-card__icon">{gate.icon}</span>
                  <div className="gate-card__title-group">
                    <h3 className="gate-card__title">{gate.name}</h3>
                    <span
                      className="gate-card__status"
                      style={{ color: getStatusColor(gate.status), borderColor: getStatusColor(gate.status) }}
                    >
                      {getStatusLabel(gate.status)}
                    </span>
                  </div>
                </div>
                <p className="gate-card__desc">{gate.description}</p>

                {activeGate === gate.id && (
                  <div className="gate-card__details">
                    <ul>
                      {gate.details.map((detail, i) => (
                        <li key={i}>{detail}</li>
                      ))}
                    </ul>
                    <div className="gate-card__action">
                      <code>{gate.action}</code>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* RIGHT: Sidebar */}
        <aside className="sidebar-panel">
          {/* Notifications */}
          <NotificationPanel ref={notifRef} />

          {/* Team Profile */}
          <div className="sidebar-section">
            <h2 className="section-title">
              <span className="section-icon">👥</span>
              Team Members
            </h2>
            <UserProfile name="Vinh Le" email="vinh@devops-guard.dev" role="Team Leader / PM" />
            <UserProfile name="AI Engineer" email="m2@devops-guard.dev" role="AI Agent Engineer" />
            <UserProfile name="QA Specialist" email="m3@devops-guard.dev" role="DevOps / QA" />
          </div>

          {/* Architecture Info */}
          <div className="sidebar-section architecture-card">
            <h2 className="section-title">
              <span className="section-icon">🏛️</span>
              Kiến trúc hệ thống
            </h2>
            <div className="arch-flow">
              <div className="arch-step">
                <span className="arch-step__icon">👨‍💻</span>
                <span className="arch-step__label">Developer</span>
              </div>
              <div className="arch-arrow">→</div>
              <div className="arch-step">
                <span className="arch-step__icon">🪝</span>
                <span className="arch-step__label">Git Hook</span>
              </div>
              <div className="arch-arrow">→</div>
              <div className="arch-step">
                <span className="arch-step__icon">🤖</span>
                <span className="arch-step__label">TRAE Agent</span>
              </div>
              <div className="arch-arrow">→</div>
              <div className="arch-step">
                <span className="arch-step__icon">🚀</span>
                <span className="arch-step__label">Deploy</span>
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* ─── FOOTER ─────────────────────────────────────────── */}
      <footer className="app-footer">
        <p>DevOps-Guard © 2026 — Cuộc thi Unbound Creativity with TRAE SOLO @ Vietnam</p>
        <p className="footer-tech">React 18.3 + Vite 6 + Husky 9 + GitHub Actions + Vercel</p>
      </footer>
    </div>
  )
}

// ─── APP WRAPPER WITH THEME PROVIDER ────────────────────────
// ❌ React 18 pattern: Context.Provider nằm trong ThemeProvider component
function App() {
  return (
    <ThemeProvider>
      <DashboardContent />
    </ThemeProvider>
  )
}

export default App
