import { log } from '../utils/colors.js'
import { resolveProvider, mapLimit, confirmCloudUsage } from './ai-providers/index.js'

// ============================================================================
// AI Semantic Engine — pluggable verification layer
//
// Takes violations found by the static regex scanner and asks an LLM
// (local via Ollama, or a cloud provider the user explicitly configures
// and pays for) to double-check them against surrounding code context,
// e.g. "Is this a real secret or a mock test key?"
//
// Default behavior (no aiVerifier config) is unchanged from before this
// module was pluggable: try local Ollama, degrade silently if it's not
// running. Cloud providers only ever run after an explicit cost/consent
// step — see ai-providers/consent.js.
// ============================================================================

function buildPrompt(ruleId, contextCode) {
  return `
You are a senior DevSecOps engineer. Look at the following code snippet which triggered a security rule for: ${ruleId}.
Code snippet:
\`\`\`
${contextCode}
\`\`\`
Analyze the context. Is this a REAL security vulnerability (e.g., an actual secret, hardcoded password) or is it a FAKE/MOCK/TEST variable meant to be ignored?
If it's FAKE or clearly meant for testing only, reply with exactly the word "FAKE".
If it's a REAL vulnerability, reply with exactly the word "REAL".
Do not explain. Only output FAKE or REAL.
`.trim()
}

/**
 * Classifies a single code snippet as REAL or FAKE using the given provider.
 * Shared by the batch scan path and the MCP server's analyze_snippet_security tool.
 */
export async function classifySnippet(provider, { ruleId, contextCode }) {
  const prompt = buildPrompt(ruleId, contextCode)
  const response = await provider.verifyOne(prompt)
  const text = String(response ?? '').trim().toUpperCase()
  return text.includes('FAKE') ? 'FAKE' : 'REAL'
}

/**
 * Verifies a list of violations using the configured AI provider.
 * Modifies the array in-place, adding `.isFalsePositive = true` if the AI
 * determines the code is just a test mock. Degrades to a no-op (all
 * violations left unmodified) if no provider is configured/reachable, or
 * if the user declines a cloud provider's cost/consent prompt.
 */
export async function verifyViolationsWithAI(violations, fileContentsCache, config = {}, { quiet = false } = {}) {
  if (!violations || violations.length === 0) return violations

  const provider = resolveProvider(config.aiVerifier)
  if (!provider) return violations // 'off', or a cloud provider with no API key configured

  const availability = await provider.checkAvailability()
  if (!availability.available) {
    // Local Ollama not running, or (rare) a configured cloud key rejected —
    // degrade gracefully to plain regex results, same as always.
    return violations
  }

  if (provider.isCloud) {
    const confirmed = await confirmCloudUsage(provider, violations.length, {
      autoConfirm: config.aiVerifier?.autoConfirm,
      quiet,
    })
    if (!confirmed) return violations
  }

  if (!quiet) {
    log('dim', `  🧠 ${provider.isCloud ? 'Cloud' : 'Local'} Semantic Engine (${provider.name}) active. Verifying ${violations.length} violation(s)...`)
  }

  const concurrency = config.aiVerifier?.concurrency ?? 5

  await mapLimit(violations, concurrency, async v => {
    const fileLines = fileContentsCache[v.file]
    if (!fileLines) return

    // Provide 2 lines of context above and below
    const start = Math.max(0, v.line - 3)
    const end = Math.min(fileLines.length, v.line + 2)
    const contextCode = fileLines.slice(start, end).join('\n')

    try {
      const verdict = await classifySnippet(provider, { ruleId: v.id, contextCode })
      if (verdict === 'FAKE') {
        v.isFalsePositive = true
        v.aiReason = 'Semantic Engine determined this is a mock/test variable.'
      } else {
        v.isFalsePositive = false
      }
    } catch {
      // If AI fails for this specific query, assume it's REAL to be safe
      v.isFalsePositive = false
    }
  })

  return violations
}
