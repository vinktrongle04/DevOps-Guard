// ============================================================
// devops-guard — Public API
// ============================================================
// You can import individual modules for programmatic use:
//
//   import { runScan } from 'devops-guard'
//   const results = await runScan({ projectRoot: process.cwd() })
//
// Or use the CLI: devops-guard scan
// ============================================================

export { main as runScan }        from './scanner/security.js'
export { main as runDepScan }     from './scanner/dependency.js'
export { main as runFix }         from './fixer/index.js'
export { main as runGraphBuild }  from './knowledge/graph.js'
export { main as runOutput }      from './knowledge/output.js'
export { main as runSummary }     from './knowledge/summary.js'
export { loadConfig }             from './utils/config.js'
export { log, paint, divider }    from './utils/colors.js'
