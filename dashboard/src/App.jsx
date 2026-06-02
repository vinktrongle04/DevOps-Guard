// ============================================================
// App.jsx — DevOps-Guard Dashboard
// 
// SECURITY TRAP FILE: This file intentionally contains
// hardcoded secrets so Gate 1 (Security Scanner) can detect
// and block the commit during the demo.
// ============================================================

import { useState, useContext, useRef } from 'react'
import UserProfile        from './components/UserProfile.jsx'
import NotificationPanel  from './components/NotificationPanel.jsx'
import SearchBar          from './components/SearchBar.jsx'
import MetricsCard        from './components/MetricsCard.jsx'
import ViolationsPanel    from './components/ViolationsPanel.jsx'
import TrendSparkline     from './components/TrendSparkline.jsx'
import KnowledgeGraphView from './components/KnowledgeGraphView.jsx'
import { ThemeProvider, ThemeContext } from './contexts/ThemeContext.jsx'
import { useScannerData } from './hooks/useScannerData.js'
import { useScanHistory } from './hooks/useScanHistory.js'
import './App.css'

// Demo preparation: The hardcoded secrets have been removed to provide a clean baseline.

// ─── STATIC GATE INFO (non-data parts of the pipeline cards) ───
const QUALITY_GATES = [
  {
    id: 'gate-1', name: 'Security Gate',    icon: '🔐',
    description: 'Scans 28 patterns across 12 OWASP-mapped categories. Hard-blocks on CRITICAL/HIGH.',
    details: ['GOOG-001: Google API Key', 'AI-001: OpenAI Key', 'PAY-001: Stripe Live Key', 'VCS-001: GitHub PAT', 'AWS-001: AWS Access Key', 'DB-001: MongoDB URI', 'XSS-001..003: Injection', 'LOG-001: console.log'],
    action: 'npm run security:scan',
  },
  {
    id: 'gate-2', name: 'Dependency Gate',  icon: '📦',
    description: 'Checks for unused, missing, bloated, and duplicate packages.',
    details: ['lodash — declared but never imported', 'axios — declared but never imported', 'moment — declared but never imported', 'uuid — declared but never imported'],
    action: 'npm run dep:scan',
  },
  {
    id: 'gate-3', name: 'Refactor Engine', icon: '⚛️',
    description: '4 components using React 18 legacy patterns to migrate to React 19.',
    details: ['UserProfile.jsx — forwardRef + useContext', 'NotificationPanel.jsx — forwardRef + useContext', 'SearchBar.jsx — forwardRef + useContext', 'MetricsCard.jsx — useContext'],
    action: 'Agent: forwardRef → ref prop, useContext → use()',
  },
  {
    id: 'gate-4', name: 'Docs Engine',     icon: '📝',
    description: '6 components and utilities missing API documentation.',
    details: ['NotificationPanel — undocumented', 'SearchBar — undocumented', 'MetricsCard — undocumented', 'apiClient.js — undocumented', 'database.js — undocumented', 'auth.js — undocumented'],
    action: 'Agent appends to API_DOCUMENTATION.md (append-only)',
  },
  {
    id: 'gate-5', name: 'Commit Engine',   icon: '📋',
    description: 'Auto-generates Conventional Commits messages from git diff.',
    details: ['feat(scope): new feature description', 'fix(scope): bug fix description', 'refactor(scope): code restructure', 'security(scope): security hardening'],
    action: 'Agent: analyze git diff → generate message',
  },
]

function getStatusColor(s) {
  return s === 'critical' ? '#ef4444' : s === 'warning' ? '#f59e0b' : s === 'info' ? '#6366f1' : '#94a3b8'
}
function getStatusLabel(s) {
  return s === 'critical' ? 'CRITICAL' : s === 'warning' ? 'WARNING' : s === 'info' ? 'READY' : 'UNKNOWN'
}

// ─── DASHBOARD CONTENT ──────────────────────────────────────────
// ❌ React 18 pattern: useContext — React 19 uses use(ThemeContext)
function DashboardContent() {
  useContext(ThemeContext)
  const [activeGate,  setActiveGate]  = useState(null)
  const [activeTab,   setActiveTab]   = useState('list')
  const searchRef = useRef(null)
  const notifRef  = useRef(null)

  // ── Real scanner data ──────────────────────────────────────
  const { data, metrics, status, error, refresh, lastFetch } = useScannerData()
  const { history, trend, totalImproved } = useScanHistory()

  // ── Derive gate statuses from real data ───────────────────
  const gate1Status = metrics
    ? (metrics.criticalCount > 0 ? 'critical' : metrics.highCount > 0 ? 'warning' : 'info')
    : 'info'
  const gate2Status = metrics
    ? (metrics.unusedDeps > 0 ? 'warning' : 'info')
    : 'info'

  const gatesWithStatus = QUALITY_GATES.map(g =>
    g.id === 'gate-1' ? { ...g, status: gate1Status }
    : g.id === 'gate-2' ? { ...g, status: gate2Status }
    : { ...g, status: 'info' }
  )

  // ── Live metrics from real data ───────────────────────────
  const LIVE_METRICS = metrics ? [
    { title: 'Security Violations', value: metrics.totalViolations,  unit: 'violations',   trend: 'down', icon: '🔐' },
    { title: 'Critical Issues',     value: metrics.criticalCount,    unit: 'CRITICAL',      trend: 'down', icon: '🔴' },
    { title: 'Unused Packages',     value: metrics.unusedDeps,       unit: 'packages',      trend: 'down', icon: '📦' },
    { title: 'Time Saved',          value: metrics.timeSaved,        unit: 'min/commit',    trend: 'up',   icon: '⏱️' },
  ] : [
    { title: 'Security Violations', value: '…', unit: 'scanning', trend: 'down', icon: '🔐' },
    { title: 'Critical Issues',     value: '…', unit: 'scanning', trend: 'down', icon: '🔴' },
    { title: 'Unused Packages',     value: '…', unit: 'scanning', trend: 'down', icon: '📦' },
    { title: 'Time Saved',          value: 28,  unit: 'min/commit', trend: 'up', icon: '⏱️' },
  ]

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="app-container">
      {/* HEADER */}
      <header className="app-header">
        <div className="header-badge">TRAE SOLO × Unbound Creativity Hackathon 2026</div>
        <h1>🛡️ DevOps-Guard</h1>
        <p className="subtitle">
          Agentic Git &amp; CI/CD Guard — Autonomous DevOps Assistant
        </p>
        <p className="subtitle-detail">
          5 Quality Gates × {metrics?.rulesLoaded ?? 28} Security Rules × React 19 Auto-Migration × OWASP Top 10
        </p>
      </header>

      {/* SEARCH BAR */}
      <SearchBar ref={searchRef} placeholder="Search gates, rules, violations…" />

      {/* METRICS ROW — live data */}
      <section className="metrics-row">
        {LIVE_METRICS.map((metric, idx) => (
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

      {/* TREND SECTION — only show if we have history */}
      {history.length >= 2 && (
        <section className="trend-section">
          <div className="trend-section__inner">
            <div className="trend-section__label">
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0' }}>Violation Trend</span>
              <span style={{
                fontSize: '0.75rem', fontWeight: 600,
                color: totalImproved > 0 ? '#22c55e' : totalImproved < 0 ? '#ef4444' : '#94a3b8',
                marginLeft: '0.75rem',
              }}>
                {totalImproved > 0 ? `▼ ${totalImproved} fixed` : totalImproved < 0 ? `▲ ${Math.abs(totalImproved)} added` : 'No change'}
              </span>
              <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: '0.5rem' }}>
                ({history.length} scans)
              </span>
            </div>
            <TrendSparkline
              history={history}
              field="total"
              width={320}
              height={48}
              color={totalImproved > 0 ? '#22c55e' : '#6366f1'}
            />
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
              {[
                { label: 'First scan', value: history[0]?.total ?? '…', color: '#64748b' },
                { label: 'Latest',     value: history[history.length-1]?.total ?? '…', color: '#e2e8f0' },
                { label: 'CRITICAL',   value: history[history.length-1]?.critical ?? 0,  color: '#ef4444' },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{item.label}</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: item.color }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* MAIN GRID */}
      <main className="main-grid">
        {/* LEFT: Quality Gates pipeline */}
        <section className="gates-panel">
          <h2 className="section-title">
            <span className="section-icon">🏗️</span>
            Quality Gates Pipeline
          </h2>

          <div className="gates-list">
            {gatesWithStatus.map((gate) => (
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
                      {/* Live count badge on Gate 1 */}
                      {gate.id === 'gate-1' && metrics && (
                        <span style={{ marginLeft: '0.35rem', opacity: 0.8 }}>
                          ({metrics.totalViolations})
                        </span>
                      )}
                      {/* Live count badge on Gate 2 */}
                      {gate.id === 'gate-2' && metrics && (
                        <span style={{ marginLeft: '0.35rem', opacity: 0.8 }}>
                          ({metrics.unusedDeps} unused)
                        </span>
                      )}
                    </span>
                  </div>
                </div>
                <p className="gate-card__desc">{gate.description}</p>

                {activeGate === gate.id && (
                  <div className="gate-card__details">
                    <ul>
                      {gate.details.map((d, i) => <li key={i}>{d}</li>)}
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
          {/* ── LIVE VIOLATIONS PANEL & KNOWLEDGE GRAPH ───── */}
          <div className="sidebar-section violations-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', background: '#0f172a', padding: '0.35rem', borderRadius: '0.5rem', border: '1px solid #1e293b' }}>
              <button 
                onClick={() => setActiveTab('list')}
                style={{ flex: 1, padding: '0.5rem', borderRadius: '0.35rem', border: 'none', background: activeTab === 'list' ? '#3b82f6' : 'transparent', color: activeTab === 'list' ? '#fff' : '#64748b', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', transition: 'all 0.2s' }}
              >
                📋 Violations List
              </button>
              <button 
                onClick={() => setActiveTab('graph')}
                style={{ flex: 1, padding: '0.5rem', borderRadius: '0.35rem', border: 'none', background: activeTab === 'graph' ? '#8b5cf6' : 'transparent', color: activeTab === 'graph' ? '#fff' : '#64748b', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', transition: 'all 0.2s' }}
              >
                🕸️ AI Knowledge Graph
              </button>
            </div>

            <div style={{ flex: 1, minHeight: '600px' }}>
              {activeTab === 'list' ? (
                <ViolationsPanel
                  data={data}
                  metrics={metrics}
                  status={status}
                  error={error}
                  refresh={refresh}
                  lastFetch={lastFetch}
                />
              ) : (
                <KnowledgeGraphView width={520} height={600} />
              )}
            </div>
          </div>

          {/* ── NOTIFICATIONS ───────────────────────────── */}
          <NotificationPanel ref={notifRef} />

          {/* ── TEAM ────────────────────────────────────── */}
          <div className="sidebar-section">
            <h2 className="section-title">
              <span className="section-icon">👥</span>
              Team Members
            </h2>
            <UserProfile name="Vinh Le"      email="vinh@devops-guard.dev"  role="Team Leader / PM" />
            <UserProfile name="HuyenDieu13"  email="m2@devops-guard.dev"    role="AI Agent Engineer" />
            <UserProfile name="QA Specialist"email="m3@devops-guard.dev"    role="DevOps / QA" />
          </div>

          {/* ── ARCHITECTURE ────────────────────────────── */}
          <div className="sidebar-section architecture-card">
            <h2 className="section-title">
              <span className="section-icon">🏛️</span>
              System Architecture
            </h2>
            <div className="arch-flow">
              {[
                { icon: '👨‍💻', label: 'Developer' },
                { icon: '🪝', label: 'Git Hook' },
                { icon: '🤖', label: 'TRAE Agent' },
                { icon: '🚀', label: 'Deploy' },
              ].map((step, i, arr) => (
                <span key={step.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div className="arch-step">
                    <span className="arch-step__icon">{step.icon}</span>
                    <span className="arch-step__label">{step.label}</span>
                  </div>
                  {i < arr.length - 1 && <div className="arch-arrow">→</div>}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </main>

      {/* FOOTER */}
      <footer className="app-footer">
        <p>DevOps-Guard © 2026 — Unbound Creativity with TRAE SOLO @ Vietnam</p>
        <p className="footer-tech">
          React 18 + Vite 6 + Husky 9 + GitHub Actions + OWASP Top 10 Mapped
          {metrics && ` | Last scan: ${metrics.scanMs}ms`}
        </p>
      </footer>
    </div>
  )
}

// ─── ROOT ──────────────────────────────────────────────────────
// ❌ React 18 pattern: ThemeProvider wraps Context.Provider
function App() {
  return (
    <ThemeProvider>
      <DashboardContent />
    </ThemeProvider>
  )
}

export default App
