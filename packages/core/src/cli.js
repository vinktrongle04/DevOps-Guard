#!/usr/bin/env node
// ============================================================
// devops-guard CLI — Unified Entry Point
// ============================================================
// Usage:
//   devops-guard scan            → Run security scanner
//   devops-guard dep             → Run dependency scanner
//   devops-guard fix             → Run security autofix (dry-run)
//   devops-guard fix --apply     → Apply all autofixes
//   devops-guard kb              → Rebuild knowledge graph & summary
//   devops-guard help            → Show this help
//
// Shorthand (after npm install -g devops-guard):
//   dg scan
//   dg dep
//   dg fix --apply
// ============================================================

import path   from 'path'
import { fileURLToPath } from 'url'
import { log, divider, COLORS } from './utils/colors.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const args      = process.argv.slice(2)
const command   = args[0]

// ─── HELP ────────────────────────────────────────────────────
function printHelp() {
  console.log()
  divider('cyan')
  log('cyan',  `${COLORS.bold}  🛡️  DevOps-Guard — Autonomous DevOps Security Agent v2.0`)
  log('cyan',  `  ${COLORS.dim}27 rules • OWASP + ISO 27001 + SOC 2 + PCI-DSS + HIPAA`)
  divider('cyan')
  console.log()
  log('white', `  ${COLORS.bold}USAGE${COLORS.reset}`)
  console.log()
  log('dim',   '  devops-guard <command> [options]')
  console.log()
  log('white', `  ${COLORS.bold}COMMANDS${COLORS.reset}`)
  console.log()
  log('green',  '  scan                 Run security scanner (Gate 1)')
  log('dim',    '                       Options: --json, --sarif, --min-severity <level>')
  log('green',  '  dep                  Run dependency scanner (Gate 2)')
  log('green',  '  fix                  Auto-fix security violations (dry-run)')
  log('dim',    '                       Options: --apply, --src <dir>')
  log('green',  '  kb                   Rebuild knowledge graph and summary')
  log('green',  '  query <cmd>          Query the knowledge graph (security intelligence)')
  log('dim',    '                       Commands: summary, violations, files-by-risk, compliance, rules, deps, graph, history')
  log('green',  '  all                  Run scan + dep in sequence')
  log('green',  '  init                 One-time project setup (husky, pre-commit, config)')
  log('green',  '  help                 Show this help message')
  console.log()
  log('white', `  ${COLORS.bold}EXAMPLES${COLORS.reset}`)
  console.log()
  log('dim',    '  devops-guard scan')
  log('dim',    '  devops-guard scan --json > report.json')
  log('dim',    '  devops-guard fix --apply')
  log('dim',    '  devops-guard dep')
  console.log()
  log('white', `  ${COLORS.bold}SETUP (one-time, adds pre-commit hook)${COLORS.reset}`)
  console.log()
  log('dim',    '  npx devops-guard init')
  console.log()
  divider('cyan')
  console.log()
}

// ─── COMMAND ROUTING ─────────────────────────────────────────
async function main() {
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHelp()
    process.exit(0)
  }

  const passthrough = args.slice(1)

  // Inject command args into process.argv so the sub-scripts see them correctly
  process.argv = [process.argv[0], process.argv[1], ...passthrough]

  switch (command) {
    case 'scan': {
      const { main: run } = await import('./scanner/security.js')
      await run()
      break
    }
    case 'dep':
    case 'dep:scan': {
      const { main: run } = await import('./scanner/dependency.js')
      await run()
      break
    }
    case 'fix': {
      const { main: run } = await import('./fixer/security.js')
      await run()
      break
    }
    case 'kb':
    case 'kb:build': {
      const { main: runOutput  } = await import('./knowledge/output.js')
      const { main: runGraph   } = await import('./knowledge/graph.js')
      const { main: runSummary } = await import('./knowledge/summary.js')
      await runOutput()
      await runGraph()
      await runSummary()
      break
    }
    case 'all': {
      const { spawnSync } = await import('child_process')
      const nodePath = process.argv[0]
      const scriptPath = process.argv[1]
      
      const secRes = spawnSync(nodePath, [scriptPath, 'scan'], { stdio: 'inherit' })
      if (secRes.status !== 0) process.exit(secRes.status)
      
      const depRes = spawnSync(nodePath, [scriptPath, 'dep'], { stdio: 'inherit' })
      process.exit(depRes.status)
      break
    }
    case 'init': {
      const { runInit } = await import('./init.js')
      await runInit()
      break
    }
    case 'query':
    case 'q': {
      // Pass the sub-command and remaining args through
      process.argv = [process.argv[0], process.argv[1], ...passthrough]
      const { main: run } = await import('./knowledge/query.js')
      await run()
      break
    }
    default: {
      log('red', `\n  ✗ Unknown command: "${command}"`)
      log('dim', '  Run devops-guard help to see available commands.\n')
      process.exit(1)
    }
  }
}

main().catch(err => {
  log('red', `\n  ✗ Fatal error: ${err.message}\n`)
  process.exit(1)
})
