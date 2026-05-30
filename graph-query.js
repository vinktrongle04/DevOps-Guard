#!/usr/bin/env node
// ============================================================
// graph-query.js — Knowledge Graph Query Engine (Level 2)
// ============================================================
// Traverses kb/knowledge-graph.json to answer structured
// questions about the project's security posture.
//
// Usage:
//   node graph-query.js --ask <query>  [--format json|text]
//   npm run kb:ask -- <query>
//
// Available queries:
//   files-by-risk            Top files sorted by riskScore
//   unresolved-critical      CRITICAL violations with no fix
//   compliance-exposure      All standards + open violation count
//   compliance-exposure --framework PCI-DSS
//   fix-impact --file <path> How many standards resolved by fixing this file
//   rule-coverage            Rules ranked by violation count
//   dependency-risk          Unused + bloated packages
//   summary                  One-line project health summary
//   graph-stats              Node/edge counts by type
// ============================================================

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const GRAPH_PATH = path.join(__dirname, 'kb', 'knowledge-graph.json')

// ─── CLI ARGS ─────────────────────────────────────────────────
const args       = process.argv.slice(2)
const askIdx     = args.indexOf('--ask')
const QUERY      = askIdx !== -1 ? args[askIdx + 1] : args[0]
const FORMAT     = args.includes('--format') ? args[args.indexOf('--format') + 1] : 'text'
const FRAMEWORK  = args.includes('--framework') ? args[args.indexOf('--framework') + 1] : null
const FILE_ARG   = args.includes('--file') ? args[args.indexOf('--file') + 1] : null

// ─── COLORS ───────────────────────────────────────────────────
const C = {
  red:    s => `\x1b[31m${s}\x1b[0m`,
  yellow: s => `\x1b[33m${s}\x1b[0m`,
  green:  s => `\x1b[32m${s}\x1b[0m`,
  cyan:   s => `\x1b[36m${s}\x1b[0m`,
  dim:    s => `\x1b[2m${s}\x1b[0m`,
  bold:   s => `\x1b[1m${s}\x1b[0m`,
}

const SEVERITY_COLOR = { CRITICAL: C.red, HIGH: C.yellow, MEDIUM: C.cyan, LOW: C.dim }

// ─── LOAD GRAPH ───────────────────────────────────────────────
function loadGraph() {
  if (!fs.existsSync(GRAPH_PATH)) {
    console.error('[graph-query] kb/knowledge-graph.json not found. Run npm run graph:build first.')
    process.exit(1)
  }
  return JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf-8'))
}

// ─── GRAPH TRAVERSAL HELPERS ──────────────────────────────────
function outEdges(graph, nodeId, type = null) {
  return graph.edges.filter(e =>
    e.from === nodeId && (type === null || e.type === type)
  )
}

function inEdges(graph, nodeId, type = null) {
  return graph.edges.filter(e =>
    e.to === nodeId && (type === null || e.type === type)
  )
}

function nodesByType(graph, type) {
  return Object.values(graph.nodes).filter(n => n.type === type)
}

function getNode(graph, id) {
  return graph.nodes[id] || null
}

// ─── QUERIES ──────────────────────────────────────────────────

/** Q1: Files ranked by riskScore */
function queryFilesByRisk(graph) {
  const files = nodesByType(graph, 'file')
    .sort((a, b) => b.riskScore - a.riskScore)

  if (FORMAT === 'json') return JSON.stringify(files, null, 2)

  const lines = [C.bold('\n  Files by Risk Score\n')]
  for (const f of files) {
    const color = f.riskScore >= 80 ? C.red : f.riskScore >= 50 ? C.yellow : C.green
    lines.push(`  ${color(`[${f.riskScore}/100]`)} ${f.path}`)
    lines.push(C.dim(`    ${f.violationCount} violation(s) | compliance at risk: ${(f.complianceAtRisk || []).slice(0, 3).join(', ') || 'none'}`))
  }
  return lines.join('\n')
}

/** Q2: Unresolved CRITICAL violations */
function queryUnresolvedCritical(graph) {
  // Find violations that have no RESOLVES edge pointing to them
  const fixedIds = new Set(
    graph.edges.filter(e => e.type === 'RESOLVES').map(e => e.to)
  )
  const violations = nodesByType(graph, 'violation')
    .filter(v => !fixedIds.has(v.id) && v.status !== 'fixed')

  // Enrich with rule info
  const enriched = violations.map(v => {
    const ruleEdge = outEdges(graph, v.id, 'MATCHES_RULE')[0]
    const rule = ruleEdge ? getNode(graph, ruleEdge.to) : null
    return { ...v, ruleName: rule?.name || v.ruleId }
  })

  // Sort by file then ruleId
  enriched.sort((a, b) => a.file.localeCompare(b.file) || a.ruleId.localeCompare(b.ruleId))

  if (FORMAT === 'json') return JSON.stringify(enriched, null, 2)

  const lines = [C.bold(`\n  Unresolved Violations — ${enriched.length} open\n`)]
  let currentFile = null
  for (const v of enriched) {
    if (v.file !== currentFile) {
      currentFile = v.file
      lines.push(`\n  ${C.cyan(v.file)}`)
    }
    lines.push(`    ${C.red(`[${v.ruleId}]`)} line ${v.line} — ${v.ruleName}`)
  }
  return lines.join('\n')
}

/** Q3: Compliance exposure */
function queryComplianceExposure(graph, framework = null) {
  const standards = nodesByType(graph, 'standard')
  const fixedIds  = new Set(graph.edges.filter(e => e.type === 'RESOLVES').map(e => e.to))

  const result = {}
  for (const std of standards) {
    if (framework && std.framework !== framework) continue

    // Traverse: standard ← MAPS_TO ← rule ← MATCHES_RULE ← violation
    const ruleEdges = inEdges(graph, std.id, 'MAPS_TO')
    let openViolations = 0
    const affectedRules = new Set()

    for (const re of ruleEdges) {
      const ruleId = re.from
      affectedRules.add(ruleId)
      const violEdges = inEdges(graph, ruleId, 'MATCHES_RULE')
      for (const ve of violEdges) {
        if (!fixedIds.has(ve.from) && getNode(graph, ve.from)?.status !== 'fixed') {
          openViolations++
        }
      }
    }

    result[std.control] = {
      framework:      std.framework,
      label:          std.label,
      affectedRules:  [...affectedRules].map(r => r.replace('rule:', '')),
      openViolations,
    }
  }

  // Sort by openViolations desc
  const sorted = Object.entries(result).sort(([, a], [, b]) => b.openViolations - a.openViolations)

  if (FORMAT === 'json') return JSON.stringify(Object.fromEntries(sorted), null, 2)

  const header = framework ? `Compliance Exposure — ${framework}` : 'Compliance Exposure — All Frameworks'
  const lines = [C.bold(`\n  ${header}\n`)]
  for (const [ctrl, data] of sorted) {
    const color = data.openViolations > 10 ? C.red : data.openViolations > 0 ? C.yellow : C.green
    lines.push(`  ${color(`${data.framework} ${ctrl}`)}`)
    lines.push(C.dim(`    ${data.label}`))
    lines.push(`    Open violations: ${color(data.openViolations)} | Rules: ${data.affectedRules.join(', ')}`)
    lines.push('')
  }
  return lines.join('\n')
}

/** Q4: Fix impact — how many compliance standards does fixing a file resolve? */
function queryFixImpact(graph, filePath) {
  if (!filePath) return C.red('  Error: --file <path> is required for fix-impact query')

  const fileId = `file:${filePath.replace(/[^a-zA-Z0-9_\-:.\/]/g, '_')}`
  const fileNode = getNode(graph, fileId)

  if (!fileNode) {
    // Try partial match
    const match = Object.keys(graph.nodes).find(id =>
      id.startsWith('file:') && graph.nodes[id].path?.includes(filePath)
    )
    if (!match) return C.red(`  File not found in graph: ${filePath}`)
    return queryFixImpact(graph, graph.nodes[match].path)
  }

  // Traverse: file → violations → rules → standards
  const violEdges   = outEdges(graph, fileId, 'HAS_VIOLATION')
  const standards   = new Set()
  const rules       = new Set()
  let violCount     = 0

  for (const ve of violEdges) {
    violCount++
    const ruleEdges = outEdges(graph, ve.to, 'MATCHES_RULE')
    for (const re of ruleEdges) {
      rules.add(re.to.replace('rule:', ''))
      const stdEdges = outEdges(graph, re.to, 'MAPS_TO')
      for (const se of stdEdges) {
        const std = getNode(graph, se.to)
        if (std) standards.add(`${std.framework} ${std.control}`)
      }
    }
  }

  const result = {
    file:                filePath,
    riskScore:           fileNode.riskScore,
    violationsToResolve: violCount,
    rulesAddressed:      [...rules],
    complianceResolved:  [...standards],
    impactScore:         violCount * standards.size,
  }

  if (FORMAT === 'json') return JSON.stringify(result, null, 2)

  return [
    C.bold(`\n  Fix Impact — ${filePath}\n`),
    `  Risk score:          ${C.red(fileNode.riskScore + '/100')}`,
    `  Violations resolved: ${violCount}`,
    `  Rules addressed:     ${rules.size} (${[...rules].join(', ')})`,
    `  Compliance resolved: ${standards.size} standard${standards.size !== 1 ? 's' : ''}`,
    ...[...standards].map(s => `    ${C.yellow('→')} ${s}`),
    `  Impact score:        ${C.bold(result.impactScore)} (violations × standards)`,
    C.dim('\n  Recommendation: Fix this file to maximize compliance coverage.'),
  ].join('\n')
}

/** Q5: Rules ranked by violation count */
function queryRuleCoverage(graph) {
  const rules = nodesByType(graph, 'rule')
    .filter(r => r.openCount > 0)
    .sort((a, b) => (b.openCount || 0) - (a.openCount || 0))

  if (FORMAT === 'json') return JSON.stringify(rules, null, 2)

  const lines = [C.bold('\n  Rule Coverage — Ranked by Violations\n')]
  for (const r of rules) {
    const stdEdges = outEdges(graph, r.id, 'MAPS_TO')
    const stds = stdEdges.map(e => getNode(graph, e.to)?.framework).filter(Boolean)
    const uniq = [...new Set(stds)]
    lines.push(`  ${C.yellow(`[${r.ruleId}]`)} ${r.name}`)
    lines.push(C.dim(`    ${r.openCount} open violation(s) | ${r.affectedFiles?.length || 0} file(s) | compliance: ${uniq.join(', ') || 'none'}`))
  }
  return lines.join('\n')
}

/** Q6: Dependency risk */
function queryDependencyRisk(graph) {
  const deps = nodesByType(graph, 'dependency')
  const unused = deps.filter(d => d.status === 'unused')
  const bloat  = deps.filter(d => d.status === 'bloat')

  if (FORMAT === 'json') return JSON.stringify({ unused, bloat }, null, 2)

  const lines = [C.bold('\n  Dependency Risk\n')]
  if (bloat.length) {
    lines.push(C.yellow(`  Bloated packages (${bloat.length}):`))
    for (const d of bloat) {
      lines.push(`    ${C.yellow(d.name)} — ${d.sizeKb} kB`)
      lines.push(C.dim(`      Alternative: ${d.alternative}`))
    }
    lines.push('')
  }
  if (unused.length) {
    lines.push(C.dim(`  Unused packages (${unused.length}): ${unused.map(d => d.name).join(', ')}`))
  }
  return lines.join('\n')
}

/** Q7: One-line summary */
function querySummary(graph) {
  const files = nodesByType(graph, 'file')
  const viols = nodesByType(graph, 'violation')
  const fixedCount = graph.edges.filter(e => e.type === 'RESOLVES').length
  const stds  = nodesByType(graph, 'standard')

  if (FORMAT === 'json') {
    return JSON.stringify({
      files: files.length,
      violations: viols.length,
      fixed: fixedCount,
      open: viols.length - fixedCount,
      standards: stds.length,
      nodes: graph.meta.nodeCount,
      edges: graph.meta.edgeCount,
    }, null, 2)
  }

  return [
    C.bold('\n  Graph Summary\n'),
    `  Files:       ${files.length}`,
    `  Violations:  ${viols.length} total | ${viols.length - fixedCount} open | ${fixedCount} fixed`,
    `  Standards:   ${stds.length} compliance controls in graph`,
    `  Graph size:  ${graph.meta.nodeCount} nodes | ${graph.meta.edgeCount} edges`,
    `  Built at:    ${graph.meta.builtAt}`,
  ].join('\n')
}

/** Q8: Graph statistics */
function queryGraphStats(graph) {
  const typeCounts = {}
  for (const n of Object.values(graph.nodes)) {
    typeCounts[n.type] = (typeCounts[n.type] || 0) + 1
  }
  const edgeCounts = {}
  for (const e of graph.edges) {
    edgeCounts[e.type] = (edgeCounts[e.type] || 0) + 1
  }

  if (FORMAT === 'json') return JSON.stringify({ nodes: typeCounts, edges: edgeCounts }, null, 2)

  return [
    C.bold('\n  Knowledge Graph Statistics\n'),
    C.cyan('  Node types:'),
    ...Object.entries(typeCounts).map(([t, c]) => `    ${t.padEnd(14)} ${c}`),
    '',
    C.cyan('  Edge types:'),
    ...Object.entries(edgeCounts).map(([t, c]) => `    ${t.padEnd(16)} ${c}`),
    `\n  Total: ${graph.meta.nodeCount} nodes | ${graph.meta.edgeCount} edges`,
  ].join('\n')
}

// ─── HELP ─────────────────────────────────────────────────────
function showHelp() {
  return [
    C.bold('\n  graph-query.js — Knowledge Graph Query Engine\n'),
    '  Usage: node graph-query.js --ask <query> [options]\n',
    C.cyan('  Queries:'),
    '    files-by-risk                    Files ranked by riskScore',
    '    unresolved-critical              All open violations (not yet fixed)',
    '    compliance-exposure              All compliance standards + exposure',
    '    compliance-exposure --framework PCI-DSS',
    '    fix-impact --file src/App.jsx    Impact of fixing a specific file',
    '    rule-coverage                    Rules ranked by violation count',
    '    dependency-risk                  Unused + bloated packages',
    '    summary                          One-line health summary',
    '    graph-stats                      Node/edge breakdown',
    '',
    C.cyan('  Options:'),
    '    --format json                    Output as JSON (default: text)',
    '    --framework <name>               Filter compliance by framework',
    '    --file <path>                    Target file for fix-impact',
    '',
    '  npm run kb:ask -- files-by-risk',
    '  npm run kb:ask -- compliance-exposure --framework HIPAA',
    '',
  ].join('\n')
}

// ─── ROUTER ───────────────────────────────────────────────────
function run() {
  if (!QUERY || QUERY === '--help' || QUERY === '-h') {
    console.log(showHelp())
    return
  }

  const graph = loadGraph()

  let output = ''
  switch (QUERY) {
    case 'files-by-risk':         output = queryFilesByRisk(graph);               break
    case 'unresolved-critical':   output = queryUnresolvedCritical(graph);        break
    case 'compliance-exposure':   output = queryComplianceExposure(graph, FRAMEWORK); break
    case 'fix-impact':            output = queryFixImpact(graph, FILE_ARG);       break
    case 'rule-coverage':         output = queryRuleCoverage(graph);              break
    case 'dependency-risk':       output = queryDependencyRisk(graph);            break
    case 'summary':               output = querySummary(graph);                   break
    case 'graph-stats':           output = queryGraphStats(graph);                break
    default:
      output = C.red(`\n  Unknown query: "${QUERY}"\n`) + showHelp()
  }

  console.log(output)
  console.log()
}

run()
