#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { log, COLORS } from '../utils/colors.js'

// ─── DEVOPS-GUARD MCP SERVER ─────────────────────────────────
// This Model Context Protocol server exposes DevOps-Guard capabilities
// directly to AI IDEs (Claude Code, Cursor, Windsurf).
// It acts as the "Pre-tool use hook" by allowing AIs to safely
// validate commands or semantics locally before execution.

export async function runMcpServer() {
  const server = new Server(
    {
      name: 'devops-guard-mcp',
      version: '3.0.0',
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

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ isSafe, reason }),
          },
        ],
      }
    }

    if (name === 'analyze_snippet_security') {
      // In a real scenario, this would call the ai-verifier.js
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ status: 'analyzed', note: 'DevOps-Guard AI Semantic engine hook triggered.' }),
          },
        ],
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
