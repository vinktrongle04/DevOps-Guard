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
      const cmd = String(args?.command || '').toLowerCase()
      let isSafe = true
      let reason = 'Command looks safe.'

      const dangerousPatterns = [
        /rm\s+-rf/,
        /drop\s+database/i,
        /drop\s+table/i,
        /chmod\s+777/,
        />\s*\.env/,
        /curl.*\|\s*bash/
      ]

      for (const pattern of dangerousPatterns) {
        if (pattern.test(cmd)) {
          isSafe = false
          reason = `BLOCKED by DevOps-Guard: Command matches dangerous pattern (${pattern.toString()}).`
          break
        }
      }

      return jsonContent({ isSafe, reason })
    }

    if (name === 'analyze_snippet_security') {
      const code = String(args?.code || '').trim()
      if (!code) return jsonContent({ status: 'error', error: 'No code provided' })

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
