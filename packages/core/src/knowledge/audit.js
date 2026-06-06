import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { log } from '../utils/colors.js'

// ============================================================================
// Immutable Audit Trail (Cryptographic Hashing)
//
// Ensures that security scan logs and histories cannot be tampered with.
// Uses SHA-256 HMAC or plain hashing to sign critical files.
// ============================================================================

const SECRET_SALT = 'devops-guard-immutable-salt-v3'

/**
 * Computes a SHA-256 hash for a given file and writes it to a .sig file.
 */
export function signFile(filePath) {
  if (!fs.existsSync(filePath)) return false
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const hash = crypto.createHmac('sha256', SECRET_SALT)
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
    const content = fs.readFileSync(filePath, 'utf-8')
    const storedHash = fs.readFileSync(sigPath, 'utf-8').trim()
    
    const computedHash = crypto.createHmac('sha256', SECRET_SALT)
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
