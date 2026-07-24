import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { signFile, verifySignature } from './audit.js'

let tmpDir
let filePath

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-audit-test-'))
  filePath = path.join(tmpDir, 'scan-history.json')
  fs.writeFileSync(filePath, JSON.stringify([{ scan: 1 }]))
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('signFile / verifySignature', () => {
  it('returns true (nothing to verify) when the file does not exist', () => {
    expect(verifySignature(path.join(tmpDir, 'missing.json'))).toBe(true)
  })

  it('fails verification when a file exists but was never signed', () => {
    expect(verifySignature(filePath)).toBe(false)
  })

  it('verifies successfully right after signing', () => {
    expect(signFile(filePath)).toBe(true)
    expect(verifySignature(filePath)).toBe(true)
  })

  it('detects tampering after the file is modified post-signing', () => {
    signFile(filePath)
    fs.writeFileSync(filePath, JSON.stringify([{ scan: 1 }, { scan: 2 }]))
    expect(verifySignature(filePath)).toBe(false)
  })

  it('generates a random signing key rather than using a hardcoded one', () => {
    signFile(filePath)
    const keyPath = path.join(tmpDir, '.audit-key')
    expect(fs.existsSync(keyPath)).toBe(true)
    const key = fs.readFileSync(keyPath, 'utf-8').trim()
    expect(key).toMatch(/^[0-9a-f]{64}$/) // 32 random bytes, hex-encoded
  })

  it('uses a different key per directory (no shared hardcoded secret)', () => {
    signFile(filePath)
    const key1 = fs.readFileSync(path.join(tmpDir, '.audit-key'), 'utf-8').trim()

    const otherDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-audit-test-2-'))
    const otherFile = path.join(otherDir, 'scan-history.json')
    fs.writeFileSync(otherFile, JSON.stringify([{ scan: 1 }]))
    signFile(otherFile)
    const key2 = fs.readFileSync(path.join(otherDir, '.audit-key'), 'utf-8').trim()
    fs.rmSync(otherDir, { recursive: true, force: true })

    expect(key1).not.toBe(key2)
  })
})
