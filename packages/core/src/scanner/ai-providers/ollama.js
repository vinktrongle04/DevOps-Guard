// ============================================================
// ollama.js — Local Semantic Engine provider (Ollama)
// ============================================================
// Free, local, no consent flow needed — this is the zero-config default.
// ============================================================

import http from 'http'

function queryOllama({ host, port, model, prompt, timeoutMs }) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ model, prompt, stream: false })

    const req = http.request(
      {
        hostname: host,
        port,
        path: '/api/generate',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
        timeout: timeoutMs,
      },
      res => {
        let data = ''
        res.on('data', chunk => (data += chunk))
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data).response)
            } catch (err) {
              reject(err)
            }
          } else {
            reject(new Error(`Ollama returned status ${res.statusCode}`))
          }
        })
      }
    )

    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Ollama timeout'))
    })

    req.write(postData)
    req.end()
  })
}

export function createOllamaProvider(options = {}) {
  const host = options.host || '127.0.0.1'
  const port = options.port || 11434
  const model = options.model || 'llama3'

  return {
    name: 'ollama',
    isCloud: false,

    isConfigured() {
      return true
    },

    async checkAvailability() {
      try {
        await queryOllama({ host, port, model, prompt: 'ping', timeoutMs: 3000 })
        return { available: true }
      } catch (err) {
        return { available: false, reason: err.message }
      }
    },

    estimateCost() {
      return null // local + free
    },

    async verifyOne(prompt) {
      return queryOllama({ host, port, model, prompt, timeoutMs: 3000 })
    },
  }
}
