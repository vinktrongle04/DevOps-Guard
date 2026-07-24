// ============================================================
// anthropic.js — Cloud AI Verifier provider (Anthropic API)
// ============================================================
// A paid, opt-in provider. isConfigured() only checks for an API key —
// it never makes a network call on its own, since even a "ping" to a
// paid API is itself an unconsented paid call. Reachability is only
// discovered on the first real verifyOne() call, which by construction
// only happens after the cost/consent flow in consent.js has run.
// ============================================================

import https from 'https'

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001'
// Rough per-call estimate for the default model, for the consent banner only.
const EST_USD_PER_CALL = 0.0006

function postJson({ hostname, path, headers, body, timeoutMs }) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body)
    const req = https.request(
      {
        hostname,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          ...headers,
        },
        timeout: timeoutMs,
      },
      res => {
        let data = ''
        res.on('data', chunk => (data += chunk))
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data))
            } catch (err) {
              reject(err)
            }
          } else {
            reject(new Error(`Anthropic API returned status ${res.statusCode}: ${data.slice(0, 200)}`))
          }
        })
      }
    )
    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Anthropic API timeout'))
    })
    req.write(postData)
    req.end()
  })
}

export function createAnthropicProvider(options = {}) {
  const apiKey = options.apiKey
  const model = options.model || DEFAULT_MODEL

  return {
    name: 'anthropic',
    isCloud: true,

    isConfigured() {
      return Boolean(apiKey)
    },

    async checkAvailability() {
      return { available: this.isConfigured() }
    },

    estimateCost(callCount) {
      return { calls: callCount, estimatedUsd: callCount * EST_USD_PER_CALL, model }
    },

    async verifyOne(prompt) {
      const response = await postJson({
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: {
          model,
          max_tokens: 8,
          messages: [{ role: 'user', content: prompt }],
        },
        timeoutMs: 20000,
      })
      return response?.content?.[0]?.text ?? ''
    },
  }
}
