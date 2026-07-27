#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { loadConfig } from '../utils/config.js'
import { resolveProvider } from '../scanner/ai-providers/index.js'
import { classifySnippet } from '../scanner/ai-verifier.js'

function jsonContent(payload) {
  return { content: [{ type: 'text', text: JSON.stringify(payload) }] }
}

// A "snippet" is meant to be a few lines of suspicious code, not an entire
// file. Without a cap, a prompt-injection payload hidden in scanned content
// could induce a connected AI agent to pass much larger — even whole-file —
// content through this tool as a way to smuggle it to a configured cloud AI
// provider (once aiVerifier.autoConfirm is set, every call goes out with no
// further per-call confirmation). Rejecting oversized input keeps this tool
// scoped to what it's actually for.
const MAX_SNIPPET_CHARS = 2000

// ─── DEVOPS-GUARD MCP SERVER ─────────────────────────────────
// This Model Context Protocol server exposes DevOps-Guard capabilities
// directly to AI IDEs (Claude Code, Cursor, Windsurf).
// It acts as the "Pre-tool use hook" by allowing AIs to safely
// validate commands or semantics locally before execution.

export async function runMcpServer() {
  const server = new Server(
    {
      name: 'devops-guard-mcp',
      version: '1.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  )

  // Register Tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'check_command',
          description: 'Validates if a bash/shell command is safe to execute. Use this BEFORE running destructive commands like rm -rf or drop.',
          inputSchema: {
            type: 'object',
            properties: {
              command: {
                type: 'string',
                description: 'The shell command to validate (e.g., "rm -rf node_modules")',
              },
            },
            required: ['command'],
          },
        },
        {
          name: 'analyze_snippet_security',
          description: 'Runs DevOps-Guard semantic analysis on a code snippet to verify if it contains a real security violation.',
          inputSchema: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                description: 'The code snippet to analyze',
              },
            },
            required: ['code'],
          },
        }
      ],
    }
  })

  // Handle Tool Execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params

    if (name === 'check_command') {
      // This is a best-effort advisory check, not an enforcement boundary —
      // nothing stops the calling agent from running the command through a
      // different tool regardless of the verdict, and no fixed pattern list
      // can cover every dangerous command. It exists to catch the common,
      // easy-to-miss cases before an AI agent runs them unsupervised.
      const cmd = String(args?.command || '').toLowerCase()
      let isSafe = true
      let reason = 'Command looks safe (best-effort check — not a guarantee).'

      const dangerousPatterns = [
        /rm\s+-rf/,
        /find\s+.+-delete/,
        /drop\s+database/,
        /drop\s+table/,
        /truncate\s+table/,
        /chmod\s+777/,
        />\s*\.env/,
        /curl[^|]*\|\s*(bash|sh)/,
        /wget[^|]*\|\s*(bash|sh)/,
      ]

      for (const pattern of dangerousPatterns) {
        if (pattern.test(cmd)) {
          isSafe = false
          reason = `BLOCKED by DevOps-Guard: Command matches dangerous pattern (${pattern.toString()}).`
          break
        }
      }

      // `rm -rf` above only catches the combined-flag form — also catch split
      // (`rm -r -f`) and long-form (`--recursive`/`--force`) flags in any order.
      if (isSafe && /\brm\b/.test(cmd)) {
        const hasRecursive = /(^|\s)-[a-z]*r[a-z]*(\s|$)/.test(cmd) || /--recursive\b/.test(cmd)
        const hasForce     = /(^|\s)-[a-z]*f[a-z]*(\s|$)/.test(cmd) || /--force\b/.test(cmd)
        if (hasRecursive && hasForce) {
          isSafe = false
          reason = 'BLOCKED by DevOps-Guard: rm with recursive + force flags (split or long-form) is destructive.'
        }
      }

      // PowerShell equivalent of `rm -rf`.
      if (isSafe && /remove-item\b/.test(cmd) && /-recurse\b/.test(cmd) && /-force\b/.test(cmd)) {
        isSafe = false
        reason = 'BLOCKED by DevOps-Guard: Remove-Item -Recurse -Force is destructive.'
      }

      return jsonContent({ isSafe, reason })
    }

    if (name === 'analyze_snippet_security') {
      const code = String(args?.code || '').trim()
      if (!code) return jsonContent({ status: 'error', error: 'No code provided' })
      if (code.length > MAX_SNIPPET_CHARS) {
        return jsonContent({
          status: 'error',
          error: `Snippet too large (${code.length} chars, max ${MAX_SNIPPET_CHARS}). This tool analyzes short suspicious excerpts, not whole files.`,
        })
      }

      const config = await loadConfig(process.cwd())
      const provider = resolveProvider(config.aiVerifier)
      if (!provider) return jsonContent({ status: 'skipped', reason: 'No AI provider configured' })

      // MCP is a programmatic stdio caller — there's no interactive channel to
      // prompt on. Cloud calls here therefore require PRE-authorization via
      // config/env; unlike the CLI scan path, this never shows a prompt.
      if (provider.isCloud && !config.aiVerifier?.autoConfirm && process.env.DEVOPS_GUARD_YES !== '1') {
        return jsonContent({
          status: 'consent_required',
          reason: 'Cloud AI provider configured but not auto-confirmed. Set aiVerifier.autoConfirm: true in guard.config.js to allow MCP calls to use paid APIs.',
        })
      }

      try {
        const availability = await provider.checkAvailability()
        if (!availability.available) {
          return jsonContent({ status: 'skipped', reason: `Provider "${provider.name}" is not reachable/configured` })
        }
        const verdict = await classifySnippet(provider, { ruleId: 'MCP-SNIPPET', contextCode: code })
        return jsonContent({ status: 'analyzed', verdict, provider: provider.name })
      } catch (err) {
        return jsonContent({ status: 'error', error: err.message })
      }
    }

    throw new Error(`Unknown tool: ${name}`)
  })

  // Start Server via Stdio
  const transport = new StdioServerTransport()
  await server.connect(transport)
  
  // NOTE: MCP Servers communicate via Stdio, so we should NOT console.log
  // unless logging to stderr, otherwise it breaks the JSON-RPC protocol.
  console.error(`[DevOps-Guard] MCP Server running on stdio`)
}
