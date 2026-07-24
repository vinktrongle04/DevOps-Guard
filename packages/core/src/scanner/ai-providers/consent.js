// ============================================================
// consent.js — cost/consent flow before any paid AI call
// ============================================================
// Called once per scan run, before any violation is sent to a cloud
// provider. Ollama (local, free) never goes through this — only
// providers with isCloud === true do.
//
// Resolution order (first match wins):
//   1. autoConfirm (--yes flag / config.aiVerifier.autoConfirm / env var)
//   2. Non-TTY stdin with no autoConfirm → skip, never hang
//   3. Interactive TTY → real prompt
// ============================================================

import { log } from '../../utils/colors.js'

export async function confirmCloudUsage(provider, violationCount, { autoConfirm = false, quiet = false } = {}) {
  const costInfo = provider.estimateCost(violationCount)
  const say = quiet ? () => {} : (color, msg) => log(color, msg)

  if (!quiet) console.log()
  if (costInfo) {
    say('yellow', `  ⚠  AI verification will send ${violationCount} code snippet(s) to ${provider.name} (${costInfo.model}).`)
    const perCall = violationCount > 0 ? costInfo.estimatedUsd / violationCount : 0
    say('dim', `     Rough estimate: ~$${costInfo.estimatedUsd.toFixed(4)} USD (${violationCount} calls × ~$${perCall.toFixed(4)}/call — not a bill, just an estimate).`)
    say('dim', `     This uses your configured API key and is billed to your account.`)
  }

  const autoConfirmed = autoConfirm || process.env.DEVOPS_GUARD_YES === '1'
  if (autoConfirmed) {
    say('dim', `  AI verification auto-confirmed (--yes).`)
    return true
  }

  if (!process.stdin.isTTY) {
    say('yellow', `  Non-interactive shell detected and no --yes flag — skipping cloud AI verification to avoid unintended API costs.`)
    say('dim', `  Pass --yes, or set aiVerifier.autoConfirm: true in guard.config.js, to allow this in CI.`)
    return false
  }

  // A machine-output run (--json/--sarif) must never emit an interactive
  // prompt — stdout has to stay pure JSON/SARIF. isTTY is already false in
  // virtually every such invocation, but this is the explicit backstop.
  if (quiet) return false

  const readline = await import('readline/promises')
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  try {
    const answer = await rl.question(`  Continue and send these snippets to ${provider.name}? (y/N): `)
    return /^y(es)?$/i.test(answer.trim())
  } finally {
    rl.close()
  }
}
