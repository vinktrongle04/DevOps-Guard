#!/usr/bin/env node
// ============================================================
// graph-builder.js — Knowledge Graph Builder (Level 2)
// ============================================================
// Reads kb/project-state.json + kb/event-log.jsonl, then
// builds kb/knowledge-graph.json as a graph of nodes + edges.
//
// Node types:  file | violation | rule | standard | event | dependency
// Edge types:  HAS_VIOLATION | MATCHES_RULE | MAPS_TO |
//              RESOLVES | TRIGGERED | HAS_DEP
//
// Usage:
//   node graph-builder.js           → build from current KB
//   node graph-builder.js --reset   → rebuild from scratch (drop history)
// ============================================================

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const KB_DIR    = path.join(TARGET_DIR, 'kb')
const STATE     = path.join(KB_DIR, 'project-state.json')
const EVENTS    = path.join(KB_DIR, 'event-log.jsonl')
const GRAPH_OUT = path.join(KB_DIR, 'knowledge-graph.json')

const RESET = process.argv.includes('--reset')

// ─── COMPLIANCE STANDARD DISPLAY NAMES ────────────────────────
const STD_META = {
  'A.9.4.3':   { framework: 'ISO-27001', label: 'ISO 27001 A.9.4.3 — Access to source code' },
  'A.9.2.3':   { framework: 'ISO-27001', label: 'ISO 27001 A.9.2.3 — Privileged access rights' },
  'A.10.1.1':  { framework: 'ISO-27001', label: 'ISO 27001 A.10.1.1 — Encryption policy' },
  'A.12.1.2':  { framework: 'ISO-27001', label: 'ISO 27001 A.12.1.2 — Change management' },
  'A.12.4.1':  { framework: 'ISO-27001', label: 'ISO 27001 A.12.4.1 — Event logging' },
  'A.14.2.5':  { framework: 'ISO-27001', label: 'ISO 27001 A.14.2.5 — Secure development principles' },
  'CC6.1':     { framework: 'SOC-2',     label: 'SOC 2 CC6.1 — Logical access security' },
  'CC6.6':     { framework: 'SOC-2',     label: 'SOC 2 CC6.6 — Logical access restrictions' },
  'CC7.2':     { framework: 'SOC-2',     label: 'SOC 2 CC7.2 — System monitoring' },
  'CC8.1':     { framework: 'SOC-2',     label: 'SOC 2 CC8.1 — Change management' },
  'Req 3.2':   { framework: 'PCI-DSS',   label: 'PCI-DSS Req 3.2 — Store cardholder data' },
  'Req 3.4':   { framework: 'PCI-DSS',   label: 'PCI-DSS Req 3.4 — Cryptographic key management' },
  'Req 6.3':   { framework: 'PCI-DSS',   label: 'PCI-DSS Req 6.3 — Known vulnerabilities' },
  'Req 6.5':   { framework: 'PCI-DSS',   label: 'PCI-DSS Req 6.5 — Injection attacks' },
  'Req 8.2':   { framework: 'PCI-DSS',   label: 'PCI-DSS Req 8.2 — User identification' },
  'Req 10.2':  { framework: 'PCI-DSS',   label: 'PCI-DSS Req 10.2 — Audit log events' },
  '§164.308':  { framework: 'HIPAA',     label: 'HIPAA §164.308 — Administrative safeguards' },
  '§164.312':  { framework: 'HIPAA',     label: 'HIPAA §164.312 — Technical safeguards' },
}

// ─── HELPERS ──────────────────────────────────────────────────
function safeId(str) {
  return str.replace(/[^a-zA-Z0-9_\-:.\/]/g, '_')
}

function loadState() {
  if (!fs.existsSync(STATE)) {
    console.error('[graph-builder] kb/project-state.json not found. Run npm run kb:build first.')
    process.exit(1)
  }
  return JSON.parse(fs.readFileSync(STATE, 'utf-8'))
}

function loadEvents() {
  if (!fs.existsSync(EVENTS)) return []
  return fs.readFileSync(EVENTS, 'utf-8')
    .split('\n').filter(Boolean)
    .map(l => { try { return JSON.parse(l) } catch { return null } })
    .filter(Boolean)
}

function loadExistingGraph() {
  if (RESET || !fs.existsSync(GRAPH_OUT)) return { nodes: {}, edges: [] }
  try { return JSON.parse(fs.readFileSync(GRAPH_OUT, 'utf-8')) } catch { return { nodes: {}, edges: [] } }
}

// ─── BUILD GRAPH ──────────────────────────────────────────────
function buildGraph() {
  const state  = loadState()
  const events = loadEvents()
  const prev   = loadExistingGraph()

  // nodes is a Map by id for dedup
  const nodes = new Map(Object.entries(prev.nodes || {}))
  // edges: use Set of signatures to dedup
  const edgeSig = new Set((prev.edges || []).map(e => `${e.from}|${e.type}|${e.to}`))
  const edges   = [...(prev.edges || [])]

  function addNode(id, data) {
    nodes.set(id, { ...nodes.get(id), ...data, id, updatedAt: state.meta.generatedAt })
  }

  function addEdge(from, to, type, meta = {}) {
    const sig = `${from}|${type}|${to}`
    if (!edgeSig.has(sig)) {
      edgeSig.add(sig)
      edges.push({ from, to, type, ts: state.meta.generatedAt, ...meta })
    }
  }

  // ── 1. FILE NODES ─────────────────────────────────────────
  for (const [filePath, fileData] of Object.entries(state.files || {})) {
    const fileId = `file:${safeId(filePath)}`
    addNode(fileId, {
      type: 'file',
      path: filePath,
      riskScore: fileData.riskScore,
      violationCount: fileData.violations?.length || 0,
      complianceAtRisk: fileData.complianceAtRisk || [],
      lastScan: fileData.lastScan,
    })

    // ── 2. VIOLATION NODES + HAS_VIOLATION edges ──────────────
    for (const vRef of fileData.violations || []) {
      // vRef format: "RULE-ID:Lnn"
      const vId = `violation:${safeId(filePath)}:${vRef}`
      const [ruleId, lineRef] = vRef.split(':')
      const lineNum = lineRef ? parseInt(lineRef.replace('L', '')) : 0

      addNode(vId, {
        type:      'violation',
        ruleId,
        file:      filePath,
        line:      lineNum,
        severity:  state.rules?.[ruleId] ? 'UNKNOWN' : 'UNKNOWN',
        openSince: state.meta.generatedAt,
        status:    'open',
      })

      addEdge(fileId, vId, 'HAS_VIOLATION', { line: lineNum })

      // ── 3. RULE NODES + MATCHES_RULE edges ─────────────────
      const ruleNodeId = `rule:${ruleId}`
      const ruleData   = state.rules?.[ruleId]
      if (ruleData) {
        addNode(ruleNodeId, {
          type:          'rule',
          ruleId,
          name:          ruleData.name,
          openCount:     ruleData.openCount,
          affectedFiles: ruleData.affectedFiles || [],
          compliance:    ruleData.compliance || [],
        })
      } else {
        addNode(ruleNodeId, { type: 'rule', ruleId, name: ruleId })
      }

      addEdge(vId, ruleNodeId, 'MATCHES_RULE')

      // ── 4. STANDARD NODES + MAPS_TO edges ─────────────────
      const compliance = ruleData?.compliance || []
      for (const ctrl of compliance) {
        const stdMeta  = STD_META[ctrl] || { framework: 'UNKNOWN', label: ctrl }
        const stdId    = `std:${safeId(ctrl)}`
        addNode(stdId, {
          type:      'standard',
          control:   ctrl,
          framework: stdMeta.framework,
          label:     stdMeta.label,
        })
        addEdge(ruleNodeId, stdId, 'MAPS_TO')
      }
    }
  }

  // ── 5. DEPENDENCY NODES ───────────────────────────────────
  for (const dep of state.dependencies?.unused || []) {
    const depId = `dep:${dep}`
    addNode(depId, { type: 'dependency', name: dep, status: 'unused' })
    addEdge('dep:unused-pool', depId, 'CONTAINS')
  }
  for (const bloat of state.dependencies?.bloat || []) {
    const depId = `dep:${bloat.package}`
    addNode(depId, {
      type:        'dependency',
      name:        bloat.package,
      status:      'bloat',
      sizeKb:      bloat.sizeKb,
      alternative: bloat.alternative,
    })
  }

  // ── 6. EVENT NODES from event-log.jsonl ──────────────────
  for (const ev of events) {
    const evId = `event:${ev.event}:${ev.ts.replace(/[:.]/g, '-')}`

    if (ev.event === 'scan') {
      addNode(evId, {
        type:     'event',
        kind:     'scan',
        ts:       ev.ts,
        total:    ev.total,
        critical: ev.critical,
        high:     ev.high,
        gate1:    ev.gate1,
        gate2:    ev.gate2,
        by:       ev.by || 'unknown',
      })
    }

    if (ev.event === 'fix') {
      const fixId     = `fix:${ev.ruleId}:${ev.ts.replace(/[:.]/g, '-')}`
      const targetVId = `violation:${safeId(ev.file || '')}:${ev.ruleId}:L${ev.line || 0}`
      addNode(fixId, {
        type:   'fix',
        ruleId: ev.ruleId,
        file:   ev.file,
        line:   ev.line,
        by:     ev.by || 'unknown',
        method: ev.method,
        ts:     ev.ts,
      })
      addEdge(fixId, targetVId, 'RESOLVES', { ts: ev.ts })
      // Mark violation as fixed
      if (nodes.has(targetVId)) {
        const v = nodes.get(targetVId)
        nodes.set(targetVId, { ...v, status: 'fixed', fixedAt: ev.ts })
      }
    }

    if (ev.event === 'gate_block') {
      addNode(evId, {
        type:   'event',
        kind:   'gate_block',
        ts:     ev.ts,
        gate:   ev.gate,
        reason: ev.reason,
        by:     ev.by || 'pre-commit',
      })
    }

    if (ev.event === 'bypass') {
      addNode(evId, {
        type:   'event',
        kind:   'bypass',
        ts:     ev.ts,
        method: ev.method,
        by:     ev.by || 'unknown',
      })
    }
  }

  // ── 7. META NODE (graph root) ────────────────────────────
  addNode('meta:devops-guard', {
    type:        'meta',
    projectName: 'DevOps-Guard',
    updatedAt:   state.meta.generatedAt,
    nodeCount:   nodes.size,
    edgeCount:   edges.length,
    kbVersion:   '2.0',
  })

  // Serialize
  const graph = {
    meta: {
      version:     '2.0',
      builtAt:     state.meta.generatedAt,
      nodeCount:   nodes.size,
      edgeCount:   edges.length,
      kbScanCount: state.meta.scanCount,
    },
    nodes: Object.fromEntries(nodes),
    edges,
  }

  fs.mkdirSync(KB_DIR, { recursive: true })
  fs.writeFileSync(GRAPH_OUT, JSON.stringify(graph, null, 2), 'utf-8')
  console.log(`[graph-builder] knowledge-graph.json built`)

  // Also save a copy to public/ for the UI dashboard to fetch
  const PUBLIC_OUTPUT_PATH = path.join(TARGET_DIR, 'public', 'knowledge-graph.json')
  fs.writeFileSync(PUBLIC_OUTPUT_PATH, JSON.stringify(graph, null, 2), 'utf-8')

  console.log(`[graph-builder] ${nodes.size} nodes | ${edges.length} edges`)

  // Print node type breakdown
  const typeCounts = {}
  for (const n of nodes.values()) typeCounts[n.type] = (typeCounts[n.type] || 0) + 1
  for (const [t, c] of Object.entries(typeCounts)) {
    console.log(`[graph-builder]   ${t.padEnd(12)} ${c} node${c > 1 ? 's' : ''}`)
  }
}

buildGraph()
