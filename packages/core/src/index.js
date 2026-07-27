// ============================================================
// devops-guard — module exports
// ============================================================
// These re-export each command's CLI entry point for advanced/scripted
// use (e.g. composing your own tooling on top of DevOps-Guard). They are
// NOT a sandboxed programmatic API: each one behaves exactly like running
// the CLI command it backs — it reads `process.cwd()`/`process.argv`
// directly (not a function parameter), prints to the console, and calls
// `process.exit()` when it's done. Only invoke these from a standalone
// script, never from inside a long-running process you don't want to
// exit unexpectedly.
//
// The supported, stable way to use DevOps-Guard is the CLI: `devops-guard scan`.
// ============================================================

export { main as runScan }        from './scanner/security.js'
export { main as runDepScan }     from './scanner/dependency.js'
export { main as runFix }         from './fixer/index.js'
export { main as runGraphBuild }  from './knowledge/graph.js'
export { main as runOutput }      from './knowledge/output.js'
export { main as runSummary }     from './knowledge/summary.js'
export { loadConfig }             from './utils/config.js'
export { log, paint, divider }    from './utils/colors.js'
