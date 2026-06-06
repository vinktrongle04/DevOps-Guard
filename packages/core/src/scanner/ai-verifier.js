import http from 'http'
import { log } from '../utils/colors.js'

// ============================================================================
// Local Semantic Engine (Ollama Integration)
//
// This module acts as the AI verification layer. It takes violations
// found by the static Regex scanner and passes them to a local LLM to 
// understand the context (e.g. "Is this a real secret or a mock test key?").
// ============================================================================

const OLLAMA_HOST = '127.0.0.1'
const OLLAMA_PORT = 11434
const MODEL_NAME  = 'llama3' // Can be configured later

/**
 * Sends a prompt to Ollama.
 */
function queryOllama(prompt) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: MODEL_NAME,
      prompt: prompt,
      stream: false
    })

    const options = {
      hostname: OLLAMA_HOST,
      port: OLLAMA_PORT,
      path: '/api/generate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 3000 // 3 seconds timeout so we don't hang the CI if Ollama is slow
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(data)
            resolve(parsed.response)
          } catch (e) {
            reject(e)
          }
        } else {
          reject(new Error(`Ollama returned status ${res.statusCode}`))
        }
      })
    })

    req.on('error', (e) => reject(e))
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Ollama timeout'))
    })
    
    req.write(postData)
    req.end()
  })
}

/**
 * Verifies a list of violations using the Local Semantic Engine.
 * Modifies the array in-place, adding `.isFalsePositive = true` if the AI
 * determines the code is just a test mock.
 */
export async function verifyViolationsWithAI(violations, fileContentsCache) {
  // If no violations, return early
  if (!violations || violations.length === 0) return violations

  let ollamaAvailable = true

  // Try pinging Ollama first
  try {
    await queryOllama('ping')
  } catch (e) {
    console.log('Ollama ping failed:', e.message)
    ollamaAvailable = false
  }

  if (!ollamaAvailable) {
    // If Ollama is not running, we degrade gracefully to standard Regex behavior
    // No false-positive filtering will occur.
    return violations
  }

  log('dim', `  🧠 Local Semantic Engine active. Verifying ${violations.length} violations...`)

  for (const v of violations) {
    const fileLines = fileContentsCache[v.file]
    if (!fileLines) continue
    
    // Provide 2 lines of context above and below
    const start = Math.max(0, v.line - 3)
    const end = Math.min(fileLines.length, v.line + 2)
    const contextCode = fileLines.slice(start, end).join('\n')

    const prompt = `
You are a senior DevSecOps engineer. Look at the following code snippet which triggered a security rule for: ${v.ruleId}.
Code snippet:
\`\`\`
${contextCode}
\`\`\`
Analyze the context. Is this a REAL security vulnerability (e.g., an actual secret, hardcoded password) or is it a FAKE/MOCK/TEST variable meant to be ignored?
If it's FAKE or clearly meant for testing only, reply with exactly the word "FAKE".
If it's a REAL vulnerability, reply with exactly the word "REAL".
Do not explain. Only output FAKE or REAL.
`.trim()

    try {
      const response = await queryOllama(prompt)
      const text = response.trim().toUpperCase()
      
      if (text.includes('FAKE')) {
        v.isFalsePositive = true
        v.aiReason = "Semantic Engine determined this is a mock/test variable."
      } else {
        v.isFalsePositive = false
      }
    } catch (err) {
      // If AI fails for this specific query, assume it's REAL to be safe
      v.isFalsePositive = false
    }
  }

  return violations
}
