import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { log } from '../utils/colors.js'

// ============================================================================
// Audit Trail (Cryptographic Hashing)
//
// Detects accidental or casual tampering with security scan logs by HMAC-
// signing them with a key generated locally on first use (never hardcoded
// in source — a signing key baked into public source code would let
// anyone recompute a valid signature, defeating the whole point). The key
// lives at .devops-guard/.audit-key, next to what it signs, and is never
// committed (the whole .devops-guard/ directory is gitignored) — so this
// protects against a casual git-history edit or hand-edited log file, not
// against someone with full filesystem/local access to regenerate the key.
// ============================================================================

function getAuditKeyPath(signedFilePath) {
  return path.join(path.dirname(signedFilePath), '.audit-key')
}

function getOrCreateAuditKey(signedFilePath) {
  const keyPath = getAuditKeyPath(signedFilePath)
  if (fs.existsSync(keyPath)) {
    return fs.readFileSync(keyPath, 'utf-8').trim()
  }
  const key = crypto.randomBytes(32).toString('hex')
  fs.mkdirSync(path.dirname(keyPath), { recursive: true })
  try {
    // Exclusive create ('wx') instead of a plain write: if two processes
    // both reach this point for the first time concurrently (e.g. a
    // pre-commit hook and a manually-run `devops-guard kb` firing close
    // together), only one of them actually creates the key file. Without
    // this, both would generate different random keys and race to write
    // last, and whichever one loses would later fail its own signature
    // verification with a false "tampering detected" alarm.
    fs.writeFileSync(keyPath, key, { encoding: 'utf-8', flag: 'wx', mode: 0o600 })
    return key
  } catch (err) {
    if (err.code === 'EEXIST') {
      return fs.readFileSync(keyPath, 'utf-8').trim()
    }
    throw err
  }
}

/**
 * Computes a SHA-256 HMAC for a given file and writes it to a .sig file.
 */
export function signFile(filePath) {
  if (!fs.existsSync(filePath)) return false

  try {
    const key = getOrCreateAuditKey(filePath)
    const content = fs.readFileSync(filePath, 'utf-8')
    const hash = crypto.createHmac('sha256', key)
                       .update(content)
                       .digest('hex')

    fs.writeFileSync(`${filePath}.sig`, hash, 'utf-8')
    return true
  } catch (err) {
    log('red', `[Audit] Failed to sign file ${filePath}: ${err.message}`)
    return false
  }
}

/**
 * Verifies that the file matches its .sig signature.
 * Returns true if valid, false if tampered or missing.
 */
export function verifySignature(filePath) {
  const sigPath = `${filePath}.sig`

  if (!fs.existsSync(filePath)) return true // Nothing to verify

  if (!fs.existsSync(sigPath)) {
    // If file exists but signature doesn't, that's a violation of immutability
    log('red', `[Audit] Missing signature for ${path.basename(filePath)}. File may have been tampered with.`)
    return false
  }

  try {
    const key = getOrCreateAuditKey(filePath)
    const content = fs.readFileSync(filePath, 'utf-8')
    const storedHash = fs.readFileSync(sigPath, 'utf-8').trim()

    const computedHash = crypto.createHmac('sha256', key)
                               .update(content)
                               .digest('hex')

    if (computedHash !== storedHash) {
      log('red', `[Audit] 🚨 TAMPERING DETECTED! Signature mismatch for ${path.basename(filePath)}.`)
      return false
    }

    return true
  } catch (err) {
    log('red', `[Audit] Verification error for ${filePath}: ${err.message}`)
    return false
  }
}
