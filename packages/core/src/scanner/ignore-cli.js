// ============================================================
// ignore-cli.js — `devops-guard ignore add <file> <line>`
// ============================================================
// Computes the fingerprint(s) for whatever rule(s) currently match a given
// file:line and appends them to .devops-guard-ignore.json, so a confirmed
// false positive stops being reported (and stops being sent to the AI
// verifier) on every future scan.
// ============================================================

import fs   from 'fs'
import path from 'path'
import { log } from '../utils/colors.js'
import { SECURITY_PATTERNS } from './security.js'
import { computeFingerprint, addToIgnoreList } from './ignore-list.js'

export async function runIgnoreAdd(file, lineArg, reason) {
  const TARGET_DIR = process.cwd()
  const lineNumber = parseInt(lineArg, 10)

  if (!file || !Number.isInteger(lineNumber) || lineNumber < 1) {
    log('red', '  Usage: devops-guard ignore add <file> <line> [--reason "..."]')
    process.exit(1)
  }

  const absPath = path.resolve(TARGET_DIR, file)
  if (!fs.existsSync(absPath)) {
    log('red', `  ✗ File not found: ${file}`)
    process.exit(1)
  }

  const lines = fs.readFileSync(absPath, 'utf-8').split('\n')
  const lineContent = lines[lineNumber - 1]
  if (lineContent === undefined) {
    log('red', `  ✗ Line ${lineNumber} does not exist in ${file} (file has ${lines.length} lines)`)
    process.exit(1)
  }

  const relFile = path.relative(TARGET_DIR, absPath).replace(/\\/g, '/')
  const trimmedContent = lineContent.trim().substring(0, 100)

  const matchedRules = []
  for (const pattern of SECURITY_PATTERNS) {
    pattern.regex.lastIndex = 0
    if (pattern.regex.test(lineContent)) matchedRules.push(pattern.id)
  }

  if (matchedRules.length === 0) {
    log('yellow', `  ⚠ No security rule currently matches ${relFile}:${lineNumber} — nothing to ignore.`)
    process.exit(0)
  }

  let addedCount = 0
  for (const ruleId of matchedRules) {
    const fingerprint = computeFingerprint(ruleId, relFile, trimmedContent)
    const { added } = addToIgnoreList(TARGET_DIR, fingerprint, reason)
    if (added) addedCount++
  }

  console.log()
  if (addedCount > 0) {
    log('green', `  ✓ Added ${addedCount} fingerprint(s) to .devops-guard-ignore.json`)
  } else {
    log('dim', `  Already ignored — no new fingerprints added.`)
  }
  log('dim', `    ${relFile}:${lineNumber}`)
  log('dim', `    Rule(s): ${matchedRules.join(', ')}`)
  if (reason) log('dim', `    Reason: ${reason}`)
  console.log()
}
