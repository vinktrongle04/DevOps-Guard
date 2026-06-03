// ============================================================
// knowledge/query.js — Knowledge Graph Query Engine
// ============================================================
// Reads from .devops-guard/ and answers structured questions
// about the project's security posture, violations, compliance,
// and dependency health.
//
// Usage:
//   devops-guard query                         → show help
//   devops-guard query files-by-risk           → top risky files
//   devops-guard query violations              → all open violations
//   devops-guard query violations --severity CRITICAL
//   devops-guard query compliance              → compliance exposure map
//   devops-guard query rules                   → rule hit statistics
//   devops-guard query deps                    → dependency health
//   devops-guard query summary                 → quick health snapshot
//   devops-guard query graph                   → knowledge graph stats
//   devops-guard query history                 → scan trend over time
// ============================================================

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { log, paint, section, divider, COLORS } from '../utils/colors.js'

const __dirname  = path.dirname(fileURLToPath(import.meta.url))
const TARGET_DIR = process.cwd()
const DG_DIR     = path.join(TARGET_DIR, '.devops-guard')

// ─── DATA LOADERS ─────────────────────────────────────────────

function loadScanReport() {
  const p = path.join(DG_DIR, 'scan-report.json')
  if (!fs.existsSync(p)) return null
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')) } catch { return null }
}

function loadProjectState() {
  const p = path.join(DG_DIR, 'kb', 'project-state.json')
  if (!fs.existsSync(p)) return null
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')) } catch { return null }
}

function loadGraph() {
  const candidates = [
    path.join(DG_DIR, 'knowledge-graph.json'),
    path.join(DG_DIR, 'kb', 'knowledge-graph.json'),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try { return JSON.parse(fs.readFileSync(p, 'utf-8')) } catch { }
    }
  }
  return null
}

function loadHistory() {
  const p = path.join(DG_DIR, 'scan-history.json')
  if (!fs.existsSync(p)) return []
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')) } catch { return [] }
}

function requireData(label) {
  log('red', `\n  ✗ No ${label} found in .devops-guard/`)
  log('dim', `  Run:  devops-guard kb   to generate data first.\n`)
  process.exit(1)
}

// ─── SEVERITY COLORS ──────────────────────────────────────────

const SEV_COLOR = {
  CRITICAL: 'red',
  HIGH:     'yellow',
  MEDIUM:   'cyan',
  LOW:      'dim',
}

function paintSev(sev) {
  return paint(SEV_COLOR[sev] || 'white', sev)
}

function severityWeight(sev) {
  return { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }[sev] || 0
}

// ─── QUERY HANDLERS ───────────────────────────────────────────

// ── files-by-risk ────────────────────────────────────────────
function queryFilesByRisk(args) {
  const state = loadProjectState() ?? requireData('project-state.json')
  const limit = parseInt(args.find(a => a.startsWith('--top='))?.split('=')[1] ?? '10')

  section('Files by Risk Score')

  const files = Object.entries(state.files ?? {})
    .sort(([, a], [, b]) => b.riskScore - a.riskScore)
    .slice(0, limit)

  if (files.length === 0) {
    log('green', '  ✅ No risky files found — project is clean!')
    return
  }

  for (const [filePath, data] of files) {
    const bar  = '█'.repeat(Math.round(data.riskScore / 10)) + '░'.repeat(10 - Math.round(data.riskScore / 10))
    const risk = data.riskScore >= 80 ? 'red' : data.riskScore >= 40 ? 'yellow' : 'green'
    console.log()
    log(risk,  `  ${COLORS.bold}${filePath}`)
    log('dim',  `  Risk: [${bar}] ${data.riskScore}/100   Violations: ${data.violations?.length ?? 0}`)
    if (data.complianceAtRisk?.length > 0) {
      log('dim', `  Compliance at risk: ${data.complianceAtRisk.join(', ')}`)
    }
  }
  console.log()
}

// ── violations ───────────────────────────────────────────────
function queryViolations(args) {
  const report = loadScanReport() ?? requireData('scan-report.json')
  const sevFilter = args.find(a => a.startsWith('--severity='))?.split('=')[1]?.toUpperCase()
                 || args[args.indexOf('--severity') + 1]?.toUpperCase()

  let violations = report.gate1?.violations ?? []
  if (sevFilter) violations = violations.filter(v => v.severity === sevFilter)

  section(`Open Violations${sevFilter ? ` [${sevFilter}]` : ''}  (${violations.length} total)`)

  if (violations.length === 0) {
    log('green', '  ✅ No violations found.')
    return
  }

  // Group by file
  const byFile = {}
  for (const v of violations) {
    if (!byFile[v.file]) byFile[v.file] = []
    byFile[v.file].push(v)
  }

  for (const [file, vs] of Object.entries(byFile)) {
    console.log()
    log('white', `  ${COLORS.bold}📄 ${file}`)
    for (const v of vs.sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity))) {
      const sev    = paintSev(v.severity)
      const ruleId = paint('cyan', v.ruleId)
      console.log(`  ${sev.padEnd(12)}  ${ruleId}  L${v.line}  — ${v.ruleName}`)
      if (v.snippet) log('dim', `              ${v.snippet.substring(0, 70)}`)
    }
  }
  console.log()
}

// ── compliance ───────────────────────────────────────────────
function queryCompliance(args) {
  const state = loadProjectState() ?? requireData('project-state.json')

  section('Compliance Exposure Map')

  const exposure = Object.entries(state.complianceExposure ?? {})
    .sort(([, a], [, b]) => b.openViolations - a.openViolations)

  if (exposure.length === 0) {
    log('green', '  ✅ No compliance violations — fully compliant!')
    return
  }

  const FRAMEWORK_ORDER = ['OWASP', 'PCI-DSS', 'ISO-27001', 'ISO27001', 'SOC-2', 'SOC2', 'HIPAA']
  const grouped = {}
  for (const [ctrl, data] of exposure) {
    const framework = data.framework ?? inferFramework(ctrl)
    if (!grouped[framework]) grouped[framework] = []
    grouped[framework].push([ctrl, data])
  }

  const orderedKeys = [
    ...FRAMEWORK_ORDER.filter(f => grouped[f]),
    ...Object.keys(grouped).filter(f => !FRAMEWORK_ORDER.includes(f))
  ]

  for (const fw of orderedKeys) {
    if (!grouped[fw]) continue
    console.log()
    log('magenta', `  ${COLORS.bold}▸ ${fw}`)
    for (const [ctrl, data] of grouped[fw]) {
      const bar = data.openViolations >= 5 ? paint('red', '●●●●●') :
                  data.openViolations >= 3 ? paint('yellow', '●●●  ') :
                                             paint('cyan',   '●    ')
      log('white', `    ${bar}  ${ctrl.padEnd(20)} ${data.openViolations} violation(s)  [${data.violatingRules.join(', ')}]`)
    }
  }
  console.log()
}

function inferFramework(ctrl) {
  if (ctrl.startsWith('A.'))          return 'ISO-27001'
  if (ctrl.startsWith('CC') || ctrl.startsWith('C7') || ctrl.startsWith('C8')) return 'SOC-2'
  if (ctrl.startsWith('Req'))         return 'PCI-DSS'
  if (ctrl.startsWith('§'))           return 'HIPAA'
  if (ctrl.startsWith('A0'))          return 'OWASP'
  // Also check via exposure data framework field
  return 'OTHER'
}

// ── rules ────────────────────────────────────────────────────
function queryRules(args) {
  const state  = loadProjectState() ?? requireData('project-state.json')
  const report = loadScanReport()

  section('Rule Hit Statistics')

  const rules = Object.entries(state.rules ?? {})
    .sort(([, a], [, b]) => b.openCount - a.openCount)

  if (rules.length === 0) {
    log('green', '  ✅ No rules triggered — project is clean!')
    return
  }

  // Get severity from report for each ruleId
  const ruleIdToSev = {}
  for (const v of report?.gate1?.violations ?? []) {
    ruleIdToSev[v.ruleId] = v.severity
  }

  console.log()
  console.log(`  ${'Rule ID'.padEnd(12)} ${'Severity'.padEnd(10)} ${'Hits'.padEnd(6)} Files  Name`)
  console.log(`  ${'─'.repeat(72)}`)

  for (const [ruleId, data] of rules) {
    const sev     = paintSev(ruleIdToSev[ruleId] || 'LOW')
    const hitBar  = '█'.repeat(Math.min(data.openCount, 10))
    const files   = data.affectedFiles?.length ?? 0
    console.log(`  ${paint('cyan', ruleId).padEnd(20)} ${sev.padEnd(22)} ${String(data.openCount).padEnd(6)} ${String(files).padEnd(6)} ${data.name}`)
  }
  console.log()
}

// ── deps ─────────────────────────────────────────────────────
function queryDeps(args) {
  const state  = loadProjectState() ?? requireData('project-state.json')
  const report = loadScanReport()

  section('Dependency Health')

  const unused   = state.dependencies?.unused   ?? report?.gate2?.unused  ?? []
  const bloat    = state.dependencies?.bloat    ?? report?.gate2?.bloat   ?? []
  const missing  = report?.gate2?.missing ?? []

  console.log()

  if (unused.length > 0) {
    log('yellow', `  ⚠  Unused Dependencies (${unused.length})`)
    for (const p of unused) log('dim', `     • ${p}   → npm uninstall ${p}`)
    console.log()
  } else {
    log('green', '  ✓ No unused dependencies')
  }

  if (missing.length > 0) {
    log('red', `  ✗  Missing Dependencies (${missing.length})  — BLOCKS COMMIT`)
    for (const p of missing) log('dim', `     • ${p}   → npm install ${p}`)
    console.log()
  } else {
    log('green', '  ✓ No missing dependencies')
  }

  if (bloat.length > 0) {
    log('cyan', `  ℹ  Bloated Packages (${bloat.length})`)
    for (const b of bloat) {
      log('dim', `     • ${b.package} (${b.sizeKb ?? b.weight}kB)  →  ${b.alternative}`)
    }
    console.log()
  } else {
    log('green', '  ✓ No bloated packages detected')
  }

  const totalBloat = state.dependencies?.totalBloatKb ?? 0
  if (totalBloat > 0) log('dim', `  Total bloat: ${totalBloat} kB`)
  console.log()
}

// ── summary ──────────────────────────────────────────────────
function querySummary(args) {
  const state  = loadProjectState() ?? requireData('project-state.json')
  const h      = state.currentHealth

  divider('cyan')
  log('cyan', `${COLORS.bold}  🛡️  DevOps-Guard — Project Health Snapshot`)
  log('dim',  `  Generated: ${new Date(state.meta.generatedAt).toLocaleString()}`)
  divider('cyan')
  console.log()

  // Gate status
  const g1color = h.gate1Status === 'PASSED' ? 'green' : 'red'
  const g2color = h.gate2Status === 'PASSED' ? 'green' : h.gate2Status === 'WARNING' ? 'yellow' : 'red'
  log(g1color, `  Gate 1 (Security):    ${h.gate1Status}`)
  log(g2color, `  Gate 2 (Dependency):  ${h.gate2Status}`)
  console.log()

  // Violations breakdown
  log('white', `  ${COLORS.bold}Security Violations`)
  console.log(`  ${paint('red',    `CRITICAL  ${h.bySeverity.CRITICAL}`).padEnd(28)}  ${paint('yellow', `HIGH      ${h.bySeverity.HIGH}`)}`)
  console.log(`  ${paint('cyan',   `MEDIUM    ${h.bySeverity.MEDIUM}`).padEnd(28)}  ${paint('dim',    `LOW       ${h.bySeverity.LOW}`)}`)
  console.log()

  // Risk score
  const riskColor = h.riskScore >= 70 ? 'red' : h.riskScore >= 40 ? 'yellow' : 'green'
  const bar = '█'.repeat(Math.round(h.riskScore / 10)) + '░'.repeat(10 - Math.round(h.riskScore / 10))
  log(riskColor, `  Risk Score:  [${bar}] ${h.riskScore}/100`)

  // Trend
  const trendIcon = h.trend === 'improving' ? '↓ improving' : h.trend === 'degrading' ? '↑ degrading' : '→ unchanged'
  const trendColor = h.trend === 'improving' ? 'green' : h.trend === 'degrading' ? 'red' : 'dim'
  log(trendColor, `  Trend:       ${trendIcon} (Δ ${h.trendDelta > 0 ? '+' : ''}${h.trendDelta} vs last scan)`)
  console.log()

  // Top risk files
  const topFiles = Object.entries(state.files ?? {})
    .sort(([, a], [, b]) => b.riskScore - a.riskScore)
    .slice(0, 3)
  if (topFiles.length > 0) {
    log('white', `  ${COLORS.bold}Top Risk Files`)
    for (const [f, d] of topFiles) {
      log('dim', `  ${String(d.riskScore).padStart(3)}/100  ${f}`)
    }
    console.log()
  }

  divider('cyan')
  console.log()
}

// ── graph ────────────────────────────────────────────────────
function queryGraph(args) {
  const graph = loadGraph() ?? requireData('knowledge-graph.json')

  section('Knowledge Graph Statistics')
  console.log()

  const { meta, nodes, edges } = graph
  log('white', `  ${COLORS.bold}Overview`)
  log('dim',   `  Built:   ${new Date(meta.builtAt).toLocaleString()}`)
  log('dim',   `  Version: ${meta.version}  |  Scan count: ${meta.kbScanCount ?? '—'}`)
  console.log()
  log('white', `  ${COLORS.bold}Nodes  (${meta.nodeCount})`)

  // Count by type
  const typeCounts = {}
  for (const n of Object.values(nodes)) {
    typeCounts[n.type] = (typeCounts[n.type] || 0) + 1
  }
  for (const [type, count] of Object.entries(typeCounts).sort(([,a],[,b]) => b - a)) {
    const bar = '▌'.repeat(Math.min(count, 20))
    log('dim', `  ${type.padEnd(14)} ${String(count).padStart(4)}  ${paint('cyan', bar)}`)
  }

  console.log()
  log('white', `  ${COLORS.bold}Edges  (${meta.edgeCount})`)

  const edgeCounts = {}
  for (const e of edges) {
    edgeCounts[e.type] = (edgeCounts[e.type] || 0) + 1
  }
  for (const [type, count] of Object.entries(edgeCounts).sort(([,a],[,b]) => b - a)) {
    log('dim', `  ${type.padEnd(20)} ${count}`)
  }

  // Top connected nodes
  const connectivity = {}
  for (const e of edges) {
    connectivity[e.from] = (connectivity[e.from] || 0) + 1
    connectivity[e.to]   = (connectivity[e.to]   || 0) + 1
  }
  const topNodes = Object.entries(connectivity)
    .sort(([,a],[,b]) => b - a)
    .slice(0, 5)

  if (topNodes.length > 0) {
    console.log()
    log('white', `  ${COLORS.bold}Most Connected Nodes`)
    for (const [id, count] of topNodes) {
      const node = nodes[id]
      log('dim', `  ${String(count).padStart(3)} edges  ${paint('cyan', id)}  ${node?.name ?? node?.path ?? ''}`)
    }
  }
  console.log()
}

// ── history ──────────────────────────────────────────────────
function queryHistory(args) {
  const history = loadHistory()

  section(`Scan History  (${history.length} snapshot${history.length !== 1 ? 's' : ''})`)

  if (history.length === 0) {
    log('dim', '  No scan history yet. Run devops-guard kb to generate.')
    return
  }

  console.log()
  console.log(`  ${'Date'.padEnd(12)} ${'Total'.padEnd(7)} ${'CRIT'.padEnd(6)} ${'HIGH'.padEnd(6)} Gate1`)
  console.log(`  ${'─'.repeat(48)}`)

  const snapshots = [...history].reverse().slice(0, 20)
  for (const s of snapshots) {
    const g1color  = s.gate1Status === 'PASSED' ? 'green' : 'red'
    const totColor = s.total > 0 ? 'yellow' : 'green'
    console.log(
      `  ${s.date.padEnd(12)} ` +
      `${paint(totColor, String(s.total).padEnd(6))} ` +
      `${paint('red',    String(s.critical).padEnd(5))} ` +
      `${paint('yellow', String(s.high).padEnd(5))} ` +
      `${paint(g1color,  s.gate1Status)}`
    )
  }

  // Sparkline trend
  if (history.length >= 2) {
    console.log()
    const totals = history.slice(-20).map(s => s.total)
    const maxVal = Math.max(...totals, 1)
    const spark  = totals.map(v => {
      const h = Math.round((v / maxVal) * 6)
      return ['▁','▂','▃','▄','▅','▆','▇'][h] ?? '█'
    }).join('')
    log('dim', `  Trend (last ${totals.length}):  ${paint('cyan', spark)}`)
    const delta = totals[totals.length - 1] - totals[0]
    const trendMsg = delta < 0 ? paint('green', `↓ ${Math.abs(delta)} fewer violations`) :
                     delta > 0 ? paint('red',   `↑ ${delta} more violations`)   :
                                 paint('dim',   '→ no change')
    log('dim', `  Overall change:      ${trendMsg}`)
  }
  console.log()
}

// ─── HELP ─────────────────────────────────────────────────────
function printQueryHelp() {
  console.log()
  divider('cyan')
  log('cyan', `${COLORS.bold}  🔍 DevOps-Guard Query Engine`)
  log('dim',  '  Query the Knowledge Graph for security & compliance intelligence.')
  divider('cyan')
  console.log()
  log('white', `  ${COLORS.bold}USAGE`)
  log('dim',   '  devops-guard query <command> [options]')
  console.log()
  log('white', `  ${COLORS.bold}COMMANDS`)
  console.log()
  log('green', '  summary            Quick health snapshot')
  log('green', '  violations         List all open violations')
  log('dim',   '    --severity=<level>   Filter by CRITICAL|HIGH|MEDIUM|LOW')
  log('green', '  files-by-risk      Files ranked by risk score')
  log('dim',   '    --top=<n>            Show top N files (default: 10)')
  log('green', '  compliance         Compliance framework exposure map')
  log('green', '  rules              Rule trigger statistics')
  log('green', '  deps               Dependency health report')
  log('green', '  graph              Knowledge graph statistics')
  log('green', '  history            Scan trend over time')
  console.log()
  log('white', `  ${COLORS.bold}EXAMPLES`)
  log('dim',   '  devops-guard query summary')
  log('dim',   '  devops-guard query violations --severity=CRITICAL')
  log('dim',   '  devops-guard query files-by-risk --top=5')
  log('dim',   '  devops-guard query compliance')
  log('dim',   '  devops-guard query history')
  divider('cyan')
  console.log()
}

// ─── MAIN ─────────────────────────────────────────────────────
export async function main() {
  const args    = process.argv.slice(2)
  const command = args[0]
  const rest    = args.slice(1)

  switch (command) {
    case 'summary':        querySummary(rest);       break
    case 'violations':     queryViolations(rest);    break
    case 'files-by-risk':  queryFilesByRisk(rest);   break
    case 'compliance':     queryCompliance(rest);    break
    case 'rules':          queryRules(rest);         break
    case 'deps':           queryDeps(rest);          break
    case 'graph':          queryGraph(rest);         break
    case 'history':        queryHistory(rest);       break
    default:               printQueryHelp();         break
  }
}

if (process.argv[1]?.endsWith('query.js')) main()
