// ============================================================
// ai-providers/index.js — provider selection
// ============================================================
// Default provider is 'ollama' when aiVerifier is unset in
// guard.config.js — the one load-bearing backward-compat rule: every
// existing zero-config user sees identical behavior to before this
// module existed (silent local-only check, silent skip if unreachable).
// 'off' is an explicit opt-out. Cloud providers resolve their API key
// from config first, then the matching environment variable.
// ============================================================

import { log } from '../../utils/colors.js'
import { createOllamaProvider } from './ollama.js'
import { createAnthropicProvider } from './anthropic.js'
import { createOpenAiProvider } from './openai.js'

const PROVIDER_ENV_MAP = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
}

export function resolveProvider(aiVerifierConfig = {}) {
  const provider = aiVerifierConfig?.provider ?? 'ollama'

  if (provider === 'off') return null

  if (provider === 'ollama') {
    return createOllamaProvider({
      host: aiVerifierConfig?.ollama?.host,
      port: aiVerifierConfig?.ollama?.port,
      model: aiVerifierConfig?.model,
    })
  }

  if (provider === 'anthropic' || provider === 'openai') {
    const envVar = PROVIDER_ENV_MAP[provider]
    const apiKey = aiVerifierConfig?.apiKey || process.env[envVar] || null
    if (!apiKey) {
      log('dim', `  aiVerifier.provider is '${provider}' but no ${envVar} found in config or environment — skipping AI verification.`)
      return null
    }
    const factory = provider === 'anthropic' ? createAnthropicProvider : createOpenAiProvider
    return factory({ apiKey, model: aiVerifierConfig?.model })
  }

  log('dim', `  Unknown aiVerifier.provider "${provider}" — skipping AI verification.`)
  return null
}

export { mapLimit } from './concurrency.js'
export { confirmCloudUsage } from './consent.js'
