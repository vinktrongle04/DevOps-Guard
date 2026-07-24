// ============================================================
// ignore-list.js — Permanent false-positive baseline
// ============================================================
// Lets a confirmed false positive be suppressed permanently instead of
// re-verified by the AI Semantic Engine (or manually dismissed) on every
// single scan. Fingerprints are keyed on rule + file + trimmed line content
// (not the line number) so they survive unrelated edits shifting line
// numbers around.
// ============================================================

import fs     from 'fs'
import path   from 'path'
import crypto from 'crypto'

const IGNORE_FILE_NAME = '.devops-guard-ignore.json'

export function computeFingerprint(ruleId, file, lineContent) {
  const key = `${ruleId}|${file.replace(/\\/g, '/')}|${lineContent.trim()}`
  return crypto.createHash('sha256').update(key).digest('hex').slice(0, 16)
}

export function loadIgnoreList(targetDir) {
  const ignorePath = path.join(targetDir, IGNORE_FILE_NAME)
  if (!fs.existsSync(ignorePath)) return []
  try {
    const parsed = JSON.parse(fs.readFileSync(ignorePath, 'utf-8'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function loadIgnoreSet(targetDir) {
  return new Set(loadIgnoreList(targetDir).map(entry => entry.fingerprint))
}

export function addToIgnoreList(targetDir, fingerprint, reason) {
  const ignorePath = path.join(targetDir, IGNORE_FILE_NAME)
  const entries = loadIgnoreList(targetDir)
  if (entries.some(e => e.fingerprint === fingerprint)) return { added: false, entries }
  entries.push({ fingerprint, reason: reason || null, addedAt: new Date().toISOString() })
  fs.writeFileSync(ignorePath, JSON.stringify(entries, null, 2) + '\n', 'utf-8')
  return { added: true, entries }
}
