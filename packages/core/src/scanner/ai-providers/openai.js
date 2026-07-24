// ============================================================
// openai.js — Cloud AI Verifier provider (OpenAI API)
// ============================================================
// Same shape and same "never ping a paid API" rule as anthropic.js —
// see that file for the reasoning.
// ============================================================

import https from 'https'

const DEFAULT_MODEL = 'gpt-4o-mini'
// Rough per-call estimate for the default model, for the consent banner only.
const EST_USD_PER_CALL = 0.0003

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
            reject(new Error(`OpenAI API returned status ${res.statusCode}: ${data.slice(0, 200)}`))
          }
        })
      }
    )
    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('OpenAI API timeout'))
    })
    req.write(postData)
    req.end()
  })
}

export function createOpenAiProvider(options = {}) {
  const apiKey = options.apiKey
  const model = options.model || DEFAULT_MODEL

  return {
    name: 'openai',
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
        hostname: 'api.openai.com',
        path: '/v1/chat/completions',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: {
          model,
          max_tokens: 8,
          messages: [{ role: 'user', content: prompt }],
        },
        timeoutMs: 20000,
      })
      return response?.choices?.[0]?.message?.content ?? ''
    },
  }
}
