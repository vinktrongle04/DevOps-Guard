// ============================================================
// ViolationsPanel — Real-time violation list from scanner data
// Displays Gate 1 security violations and Gate 2 dependency
// issues with filtering, severity badges, and OWASP labels.
// ============================================================

import { useState, useContext } from 'react'
import { ThemeContext } from '../contexts/ThemeContext'

const SEVERITY_CONFIG = {
  CRITICAL: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   glow: 'rgba(239,68,68,0.2)',   label: 'CRITICAL', order: 0 },
  HIGH:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  glow: 'rgba(245,158,11,0.2)',  label: 'HIGH',     order: 1 },
  MEDIUM:   { color: '#6366f1', bg: 'rgba(99,102,241,0.08)',  glow: 'rgba(99,102,241,0.2)',  label: 'MEDIUM',   order: 2 },
  LOW:      { color: '#22c55e', bg: 'rgba(34,197,94,0.08)',   glow: 'rgba(34,197,94,0.2)',   label: 'LOW',      order: 3 },
}

const GATE2_SEVERITY = {
  unused:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  label: 'UNUSED' },
  missing: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   label: 'MISSING' },
  bloat:   { color: '#f97316', bg: 'rgba(249,115,22,0.08)',  label: 'BLOAT' },
}

function SeverityBadge({ severity, style }) {
  const cfg = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.LOW
  return (
    <span style={{
      fontSize: '0.6rem',
      fontWeight: 700,
      letterSpacing: '0.08em',
      padding: '0.15rem 0.45rem',
      borderRadius: '999px',
      border: `1px solid ${cfg.color}`,
      color: cfg.color,
      background: cfg.bg,
      textTransform: 'uppercase',
      flexShrink: 0,
      ...style,
    }}>
      {cfg.label}
    </span>
  )
}

function OwaspBadge({ owasp }) {
  if (!owasp) return null
  return (
    <span style={{
      fontSize: '0.58rem',
      fontWeight: 600,
      padding: '0.1rem 0.4rem',
      borderRadius: '4px',
      background: 'rgba(99,102,241,0.12)',
      color: '#818cf8',
      border: '1px solid rgba(99,102,241,0.2)',
      flexShrink: 0,
    }}>
      OWASP {owasp}
    </span>
  )
}

// ─── SINGLE SECURITY VIOLATION ROW ────────────────────────────
function ViolationRow({ v, isExpanded, onToggle }) {
  const cfg = SEVERITY_CONFIG[v.severity] || SEVERITY_CONFIG.LOW

  return (
    <div
      onClick={onToggle}
      style={{
        padding: '0.6rem 0.875rem',
        borderRadius: '8px',
        border: `1px solid ${isExpanded ? cfg.color + '50' : 'rgba(255,255,255,0.05)'}`,
        background: isExpanded ? cfg.bg : 'rgba(255,255,255,0.02)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        marginBottom: '0.4rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <SeverityBadge severity={v.severity} />
        <OwaspBadge owasp={v.owasp} />
        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#e2e8f0', flex: 1, minWidth: 0 }}>
          [{v.ruleId}] {v.ruleName}
        </span>
        <span style={{ fontSize: '0.65rem', color: '#6366f1', flexShrink: 0 }}>
          {isExpanded ? '▲' : '▼'}
        </span>
      </div>

      <div style={{ marginTop: '0.3rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'var(--font-mono, monospace)' }}>
          {v.file}:{v.line}
        </span>
      </div>

      {isExpanded && (
        <div style={{ marginTop: '0.6rem', padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', animation: 'slideDown 0.2s ease' }}>
          <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.72rem', color: cfg.color, marginBottom: '0.35rem', wordBreak: 'break-all' }}>
            {v.snippet || '(no snippet)'}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
            Category: <span style={{ color: '#e2e8f0' }}>{v.category}</span>
          </div>
          {v.compliance && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.35rem' }}>
              {[
                v.compliance.owasp   && { label: `OWASP ${v.compliance.owasp}`,   bg: 'rgba(239,68,68,0.1)',   color: '#fca5a5' },
                v.compliance.iso27001&& { label: `ISO 27001 ${v.compliance.iso27001}`, bg: 'rgba(99,102,241,0.1)', color: '#a5b4fc' },
                v.compliance.soc2    && { label: `SOC 2 ${v.compliance.soc2}`,    bg: 'rgba(34,197,94,0.1)',  color: '#86efac' },
                v.compliance.pciDss  && { label: `PCI-DSS ${v.compliance.pciDss}`, bg: 'rgba(245,158,11,0.1)', color: '#fcd34d' },
                v.compliance.hipaa   && { label: `HIPAA ${v.compliance.hipaa}`,   bg: 'rgba(168,85,247,0.1)', color: '#d8b4fe' },
              ].filter(Boolean).map(tag => (
                <span key={tag.label} style={{
                  fontSize: '0.6rem', fontWeight: 600, padding: '0.1rem 0.4rem',
                  borderRadius: '4px', background: tag.bg, color: tag.color,
                  border: `1px solid ${tag.color}30`,
                }}>{tag.label}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── DEPENDENCY ISSUE ROW ──────────────────────────────────────
function DepRow({ type, pkg, bloatInfo }) {
  const cfg = GATE2_SEVERITY[type]
  return (
    <div style={{
      padding: '0.5rem 0.875rem',
      borderRadius: '8px',
      border: '1px solid rgba(255,255,255,0.05)',
      background: 'rgba(255,255,255,0.02)',
      marginBottom: '0.35rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      flexWrap: 'wrap',
    }}>
      <span style={{
        fontSize: '0.6rem', fontWeight: 700, padding: '0.12rem 0.4rem',
        borderRadius: '999px', border: `1px solid ${cfg.color}`,
        color: cfg.color, background: cfg.bg, textTransform: 'uppercase', flexShrink: 0,
      }}>{cfg.label}</span>
      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0', fontFamily: 'var(--font-mono, monospace)', flex: 1 }}>
        {typeof pkg === 'string' ? pkg : pkg.package}
      </span>
      {bloatInfo && (
        <span style={{ fontSize: '0.68rem', color: '#f97316' }}>{bloatInfo.weightStr}</span>
      )}
    </div>
  )
}

// ─── MAIN VIOLATIONS PANEL ────────────────────────────────────
/**
 * @component ViolationsPanel
 * @description Displays real-time scan results from Gate 1 (Security) and Gate 2 (Dependency).
 * Reads data from the useScannerData hook and renders filterable violation lists.
 *
 * @param {Object}   data      - Full scan report from useScannerData hook
 * @param {Object}   metrics   - Derived metrics (criticalCount, unusedDeps, etc.)
 * @param {string}   status    - 'idle' | 'loading' | 'ready' | 'error'
 * @param {string}   [error]   - Error message if status === 'error'
 * @param {Function} refresh   - Callback to manually trigger a re-scan
 * @param {Date}     lastFetch - Timestamp of last successful fetch
 */
export default function ViolationsPanel({ data, metrics, status, error, refresh, lastFetch }) {
  useContext(ThemeContext)
  const [activeTab,     setActiveTab]     = useState('security') // 'security' | 'deps'
  const [filterSeverity,setFilterSeverity]= useState('ALL')
  const [expandedId,    setExpandedId]    = useState(null)

  const tabs = [
    { id: 'security', label: 'Gate 1 — Security', count: metrics?.totalViolations ?? '…' },
    { id: 'deps',     label: 'Gate 2 — Dependencies', count: (metrics ? metrics.unusedDeps + (data?.gate2?.missing?.length || 0) + (data?.gate2?.bloat?.length || 0) : '…') },
  ]

  const severityFilters = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

  const secViolations = data?.gate1?.violations ?? []
  const filtered = filterSeverity === 'ALL'
    ? secViolations
    : secViolations.filter(v => v.severity === filterSeverity)

  const sorted = [...filtered].sort((a, b) =>
    (SEVERITY_CONFIG[a.severity]?.order ?? 9) - (SEVERITY_CONFIG[b.severity]?.order ?? 9)
  )

  // ─── Loading state ─────────────────────────────────────────
  if (status === 'loading' && !data) {
    return (
      <div className="violations-panel" style={{ textAlign: 'center', padding: '2rem' }}>
        <div className="scanner-pulse">⟳</div>
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.75rem' }}>
          Running security scan…
        </p>
      </div>
    )
  }

  // ─── Error state ───────────────────────────────────────────
  if (status === 'error') {
    return (
      <div className="violations-panel" style={{ padding: '1.5rem' }}>
        <div style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
          ⚠ Could not load scan report
        </div>
        <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '1rem', fontFamily: 'monospace' }}>
          {error}
        </div>
        <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '1rem' }}>
          Run <code style={{ background: 'rgba(255,255,255,0.05)', padding: '0.1rem 0.4rem', borderRadius: '4px', color: '#22c55e' }}>npm run scan:export</code> to generate the report.
        </div>
        <button onClick={refresh} style={{ fontSize: '0.78rem', padding: '0.4rem 1rem' }}>
          Retry
        </button>
      </div>
    )
  }

  // ─── Ready state ───────────────────────────────────────────
  return (
    <div className="violations-panel">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h2 className="section-title" style={{ margin: 0 }}>
          <span className="section-icon">🔍</span>
          Live Scan Results
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {lastFetch && (
            <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
              {lastFetch.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={refresh}
            style={{ fontSize: '0.72rem', padding: '0.3rem 0.75rem', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}
            title="Re-run scanner"
          >
            ⟳ Refresh
          </button>
        </div>
      </div>

      {/* Scanner metadata */}
      {data && (
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {[
            { label: 'Rules', value: metrics.rulesLoaded },
            { label: 'Files', value: metrics.scannedFiles },
            { label: 'Scan time', value: `${metrics.scanMs}ms` },
          ].map(item => (
            <div key={item.label} style={{
              padding: '0.25rem 0.6rem',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '6px',
              fontSize: '0.68rem',
              color: '#64748b',
            }}>
              {item.label}: <span style={{ color: '#94a3b8', fontWeight: 600 }}>{item.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Gate status pills */}
      {metrics && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          {[
            { label: 'Gate 1', status: metrics.gate1Status },
            { label: 'Gate 2', status: metrics.gate2Status },
          ].map(g => {
            const isBlocked = g.status === 'BLOCKED'
            const isWarn    = g.status === 'WARNING'
            const color = isBlocked ? '#ef4444' : isWarn ? '#f59e0b' : '#22c55e'
            return (
              <div key={g.label} style={{
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.25rem 0.65rem',
                borderRadius: '999px',
                border: `1px solid ${color}40`,
                background: `${color}10`,
                fontSize: '0.7rem', fontWeight: 700, color,
              }}>
                <span>{isBlocked ? '🚫' : isWarn ? '⚠' : '✓'}</span>
                {g.label}: {g.status}
              </div>
            )
          })}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.3rem 0.75rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              background: activeTab === tab.id ? 'rgba(99,102,241,0.15)' : 'transparent',
              border: `1px solid ${activeTab === tab.id ? 'rgba(99,102,241,0.4)' : 'transparent'}`,
              color: activeTab === tab.id ? '#818cf8' : '#64748b',
              borderRadius: '6px',
              transition: 'all 0.15s ease',
              cursor: 'pointer',
            }}
          >
            {tab.label}
            <span style={{
              marginLeft: '0.4rem',
              padding: '0.05rem 0.35rem',
              background: activeTab === tab.id ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.06)',
              borderRadius: '999px',
              fontSize: '0.65rem',
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── SECURITY TAB ──────────────────────────────────────── */}
      {activeTab === 'security' && (
        <div>
          {/* Severity breakdown pills */}
          <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            {severityFilters.map(sev => {
              const cfg  = SEVERITY_CONFIG[sev]
              const count = sev === 'ALL'
                ? secViolations.length
                : secViolations.filter(v => v.severity === sev).length
              const active = filterSeverity === sev
              return (
                <button
                  key={sev}
                  onClick={() => setFilterSeverity(sev)}
                  style={{
                    padding: '0.2rem 0.55rem',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    background: active ? (cfg?.bg || 'rgba(255,255,255,0.08)') : 'transparent',
                    border: `1px solid ${active ? (cfg?.color || '#94a3b8') : 'rgba(255,255,255,0.08)'}`,
                    color: active ? (cfg?.color || '#e2e8f0') : '#64748b',
                    borderRadius: '999px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {sev === 'ALL' ? `All (${count})` : `${sev} (${count})`}
                </button>
              )
            })}
          </div>

          {/* Violation list */}
          <div style={{ maxHeight: '340px', overflowY: 'auto', paddingRight: '2px' }}>
            {sorted.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.82rem' }}>
                No violations for this filter.
              </div>
            ) : (
              sorted.map((v, i) => {
                const id = `${v.ruleId}-${v.file}-${v.line}-${i}`
                return (
                  <ViolationRow
                    key={id}
                    v={v}
                    isExpanded={expandedId === id}
                    onToggle={() => setExpandedId(expandedId === id ? null : id)}
                  />
                )
              })
            )}
          </div>
        </div>
      )}

      {/* ── DEPENDENCY TAB ───────────────────────────────────── */}
      {activeTab === 'deps' && data?.gate2 && (
        <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '2px' }}>
          {/* Bloat summary */}
          {data.gate2.bloat?.length > 0 && (
            <div style={{ padding: '0.5rem 0.875rem', marginBottom: '0.5rem', borderRadius: '8px', background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)', fontSize: '0.75rem', color: '#f97316' }}>
              Total removable bloat: <strong>{data.gate2.totalBloatKb} kB</strong> across {data.gate2.bloat.length} package(s)
            </div>
          )}

          {data.gate2.missing?.length > 0 && (
            <>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#ef4444', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Missing — Will break CI/CD
              </div>
              {data.gate2.missing.map(pkg => <DepRow key={pkg} type="missing" pkg={pkg} />)}
            </>
          )}

          {data.gate2.unused?.length > 0 && (
            <>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f59e0b', margin: '0.75rem 0 0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Unused — Dead weight
              </div>
              {data.gate2.unused.map(pkg => {
                const bloatInfo = data.gate2.bloat?.find(b => b.package === pkg)
                return <DepRow key={pkg} type="unused" pkg={pkg} bloatInfo={bloatInfo} />
              })}
            </>
          )}

          {data.gate2.bloat?.length > 0 && (
            <>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f97316', margin: '0.75rem 0 0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Heavy packages — Consider replacing
              </div>
              {data.gate2.bloat.map(b => (
                <div key={b.package} style={{ padding: '0.5rem 0.875rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', marginBottom: '0.35rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: '999px', border: '1px solid #f97316', color: '#f97316', background: 'rgba(249,115,22,0.08)' }}>BLOAT</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0', fontFamily: 'monospace', flex: 1 }}>{b.package}</span>
                    <span style={{ fontSize: '0.7rem', color: '#f97316', fontWeight: 700 }}>{b.weightStr}</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', paddingLeft: '0.25rem' }}>
                    → {b.alternative}
                  </div>
                </div>
              ))}
            </>
          )}

          {!data.gate2.unused?.length && !data.gate2.missing?.length && !data.gate2.bloat?.length && (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#22c55e', fontSize: '0.82rem' }}>
              ✓ All dependencies are clean!
            </div>
          )}
        </div>
      )}
    </div>
  )
}
