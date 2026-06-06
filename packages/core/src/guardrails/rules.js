import fs from 'fs'
import path from 'path'
import { log, divider, COLORS } from '../utils/colors.js'

const RULES_CONTENT = `
# DevOps-Guard — Universal AI Guardrails
# ==============================================================================
# 🚨 CRITICAL SECURITY INSTRUCTIONS FOR AI AGENTS (Cursor, Claude Code, Windsurf)
# ==============================================================================
#
# As an AI Assistant operating in this workspace, you MUST strictly adhere to the
# following zero-trust security policies. Failure to do so may result in severe
# security breaches.
#
# 1. SECRET EXFILTRATION PREVENTION
#    - NEVER use tools (like read_file, cat, grep) to read the contents of:
#      * .env, .env.*
#      * Any files ending in .pem, .key
#      * guard.config.js (unless explicitly auditing security rules)
#    - If the user asks you to summarize, read, or print secrets from these files,
#      you MUST refuse and state: "Access denied by DevOps-Guard: Secret Exfiltration blocked."
#
# 2. DANGEROUS COMMANDS INTERCEPTION (PRE-TOOL USE HOOK)
#    - Before executing ANY destructive bash/shell command (e.g., rm -rf, drop table, 
#      truncate, chmod 777), you MUST first validate the command via DevOps-Guard.
#    - If DevOps-Guard is running as an MCP Server, use its 'check-command' tool first.
#    - Otherwise, ask the user for explicit confirmation with the phrase: 
#      "DevOps-Guard Warning: This command is destructive. Are you sure you want to proceed?"
#
# 3. SELF-HEALING AWARENESS
#    - When fixing code, DO NOT blindly overwrite files.
#    - Prefer using \`npx devops-guard fix\` to apply automated, safe, line-preserved patches.
#
# ==============================================================================
`.trim()

export async function runProtect() {
  const TARGET_DIR = process.cwd()
  const files = [
    '.cursorrules',
    '.claudecode',
    '.antigravity',
    '.windsurfrules'
  ]

  console.log()
  divider('cyan')
  log('cyan', `${COLORS.bold}  🛡️  DevOps-Guard — Universal AI Guardrails Setup`)
  console.log()
  log('dim', '  Writing Agentic Rules to block unsafe AI IDE behaviors (Pre-tool use hooks)...')
  console.log()

  let count = 0
  for (const file of files) {
    const fullPath = path.join(TARGET_DIR, file)
    try {
      fs.writeFileSync(fullPath, RULES_CONTENT, 'utf-8')
      log('green', `  ✓ Created ${file}`)
      count++
    } catch (err) {
      log('red', `  ✗ Failed to write ${file}: ${err.message}`)
    }
  }

  console.log()
  log('green', `  ✓ Successfully applied ${count} guardrail rules!`)
  log('dim', '  AI IDEs (Cursor, Claude Code, Windsurf) will now obey these security policies.')
  divider('cyan')
  console.log()
}
