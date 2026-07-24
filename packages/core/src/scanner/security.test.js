import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { execFileSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'

// NOTE: these tests invoke the CLI as a subprocess (`node cli.js scan --json`)
// rather than importing security.js directly. Importing security.js in-process
// trips a parser bug in Vite/Vitest's import-analysis step (es-module-lexer)
// that's specific to this file's size/content combination — confirmed to be a
// test-tooling limitation, not a real bug (the CLI runs fine standalone, via
// `node cli.js`, and in the pre-commit hook). Subprocess invocation exercises
// the exact same code path a real user hits and sidesteps the issue entirely.

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CLI_PATH = path.join(__dirname, '..', 'cli.js')

let tmpDir

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-security-cli-test-'))
  fs.mkdirSync(path.join(tmpDir, 'src'))
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

function writeSrc(content, filename = 'test.js') {
  fs.writeFileSync(path.join(tmpDir, 'src', filename), content)
}

function scan() {
  try {
    const output = execFileSync(process.execPath, [CLI_PATH, 'scan', '--json'], {
      cwd: tmpDir,
      encoding: 'utf-8',
    })
    return JSON.parse(output.slice(output.indexOf('{')))
  } catch (err) {
    // scan --json exits 1 when a CRITICAL/HIGH violation is found — that's
    // expected for most of these tests, not a test failure. stdout still has
    // the JSON payload.
    const output = err.stdout ?? ''
    return JSON.parse(output.slice(output.indexOf('{')))
  }
}

function idsFrom(report) {
  return report.violations.map(v => v.ruleId)
}

describe('SECURITY_PATTERNS true positives', () => {
  it('detects an AWS Access Key ID (AWS-001)', () => {
    writeSrc('const key = "AKIAIOSFODNN7EXAMPLE";')
    expect(idsFrom(scan())).toContain('AWS-001')
  })

  it('detects a Google API key (GOOG-001)', () => {
    writeSrc('const key = "AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBWY";')
    expect(idsFrom(scan())).toContain('GOOG-001')
  })

  it('detects a Stripe live secret key (PAY-001)', () => {
    writeSrc('const key = "sk_live_51H8xyzABCDEFGHIJKLMNOPQR";')
    expect(idsFrom(scan())).toContain('PAY-001')
  })

  it('detects a GitHub PAT (VCS-001)', () => {
    writeSrc('const token = "ghp_1234567890abcdefghijklmnopqrstuvwxyz";')
    expect(idsFrom(scan())).toContain('VCS-001')
  })

  it('detects a hardcoded JWT (AUTH-001)', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PYVsri8Um0Vc'
    writeSrc(`const token = "${jwt}";`)
    expect(idsFrom(scan())).toContain('AUTH-001')
  })

  it('detects a private key block (AUTH-002)', () => {
    writeSrc('-----BEGIN RSA PRIVATE KEY-----\nMIIEow==\n-----END RSA PRIVATE KEY-----')
    expect(idsFrom(scan())).toContain('AUTH-002')
  })

  it('detects dangerouslySetInnerHTML (XSS-001)', () => {
    writeSrc('<div dangerouslySetInnerHTML={{__html: userInput}} />', 'test.jsx')
    expect(idsFrom(scan())).toContain('XSS-001')
  })

  it('detects direct innerHTML assignment (XSS-002)', () => {
    writeSrc('el.innerHTML = userInput;')
    expect(idsFrom(scan())).toContain('XSS-002')
  })

  it('detects eval() (XSS-003)', () => {
    writeSrc('eval(userInput);')
    expect(idsFrom(scan())).toContain('XSS-003')
  })

  it('detects a VITE_ prefixed server secret (ENV-001)', () => {
    writeSrc('VITE_SECRET_KEY=abc123', 'test.env')
    expect(idsFrom(scan())).toContain('ENV-001')
  })
})

describe('known-safe code does not trigger violations', () => {
  it('does not flag a normal function', () => {
    writeSrc('function add(a, b) {\n  return a + b\n}\n')
    expect(scan().summary.total).toBe(0)
  })

  it('does not flag textContent assignment', () => {
    writeSrc('el.textContent = userInput;')
    expect(idsFrom(scan())).not.toContain('XSS-002')
  })

  it('does not flag reading from process.env', () => {
    writeSrc('const key = process.env.API_KEY;')
    expect(scan().summary.total).toBe(0)
  })
})

describe('entropy gate on GEN-001', () => {
  it('filters out obvious placeholder values', () => {
    writeSrc('const password = "changeme123";')
    expect(idsFrom(scan())).not.toContain('GEN-001')
  })

  it('filters out REPLACE_ME style placeholders', () => {
    writeSrc('const secret = "REPLACE_ME";')
    expect(idsFrom(scan())).not.toContain('GEN-001')
  })

  it('still reports high-entropy values that look like real secrets', () => {
    writeSrc('const token = "xK9mPz2QaLw8VbNc3TfGh1Rj";')
    expect(idsFrom(scan())).toContain('GEN-001')
  })
})

describe('report shape', () => {
  it('reports a stable rule count and a BLOCKED/PASSED status', () => {
    writeSrc('const key = "AKIAIOSFODNN7EXAMPLE";')
    const report = scan()
    expect(report.rulesLoaded).toBeGreaterThan(0)
    expect(['BLOCKED', 'PASSED']).toContain(report.summary.status)
    expect(report.summary.status).toBe('BLOCKED')
  })
})
