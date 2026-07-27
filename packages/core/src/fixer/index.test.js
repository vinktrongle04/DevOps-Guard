import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { execFileSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import { signFile } from '../knowledge/audit.js'

// See scanner/security.test.js for why these run via subprocess rather than
// a direct import of fixer/index.js.

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CLI_PATH = path.join(__dirname, '..', 'cli.js')

let tmpDir

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-fixer-test-'))
  fs.mkdirSync(path.join(tmpDir, '.devops-guard'))
  fs.mkdirSync(path.join(tmpDir, 'src'))
  execFileSync('git', ['init', '-q'], { cwd: tmpDir })
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: tmpDir })
  execFileSync('git', ['config', 'user.name', 'test'], { cwd: tmpDir })
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

function writeScanReport(violations) {
  const reportPath = path.join(tmpDir, '.devops-guard', 'scan-report.json')
  fs.writeFileSync(
    reportPath,
    JSON.stringify({ gate1: { violations }, gate2: { unused: [], missing: [] } })
  )
  // The fixer now refuses to trust a scan-report.json without a valid audit
  // signature (see fixer/index.js's loadViolations) — sign it here the same
  // way a real `devops-guard kb` run would, so these tests exercise the fixer
  // itself rather than the signature gate.
  signFile(reportPath)
}

function commitAll(message = 'init') {
  execFileSync('git', ['add', '-A'], { cwd: tmpDir })
  execFileSync('git', ['commit', '-q', '-m', message], { cwd: tmpDir })
}

function runFix(args) {
  try {
    const output = execFileSync(process.execPath, [CLI_PATH, 'fix', ...args], {
      cwd: tmpDir,
      encoding: 'utf-8',
      input: '',
    })
    return { exitCode: 0, output }
  } catch (err) {
    return { exitCode: err.status, output: (err.stdout ?? '') + (err.stderr ?? '') }
  }
}

describe('fix (dry run)', () => {
  it('does not modify files without --apply', () => {
    const original = 'const key = "AKIAIOSFODNN7EXAMPLE";\n'
    fs.writeFileSync(path.join(tmpDir, 'src', 'secret.js'), original)
    commitAll()
    writeScanReport([{ ruleId: 'AWS-001', location: { file: 'src/secret.js', line: 1 } }])

    runFix([])

    expect(fs.readFileSync(path.join(tmpDir, 'src', 'secret.js'), 'utf-8')).toBe(original)
  })
})

describe('fix --apply', () => {
  it('replaces a hardcoded secret with an env var reference', () => {
    fs.writeFileSync(path.join(tmpDir, 'src', 'secret.js'), 'const key = "AKIAIOSFODNN7EXAMPLE";\n')
    commitAll()
    writeScanReport([{ ruleId: 'AWS-001', location: { file: 'src/secret.js', line: 1 } }])

    runFix(['--apply', '--yes'])

    const fixed = fs.readFileSync(path.join(tmpDir, 'src', 'secret.js'), 'utf-8')
    expect(fixed).toMatch(/env\.AWS_ACCESS_KEY_ID/)
    expect(fixed).not.toMatch(/AKIAIOSFODNN7EXAMPLE/)
  })

  it('routes a JWT violation (AUTH-001) through the secret fixer, not a no-op', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PYVsri8Um0Vc'
    fs.writeFileSync(path.join(tmpDir, 'src', 'token.js'), `const token = "${jwt}";\n`)
    commitAll()
    writeScanReport([{ ruleId: 'AUTH-001', location: { file: 'src/token.js', line: 1 } }])

    runFix(['--apply', '--yes'])

    const fixed = fs.readFileSync(path.join(tmpDir, 'src', 'token.js'), 'utf-8')
    expect(fixed).toMatch(/env\.(JWT_SECRET|TOKEN)/)
    expect(fixed).not.toMatch(jwt)
  })

  it('generates a .env.example entry for the new variable', () => {
    fs.writeFileSync(path.join(tmpDir, 'src', 'secret.js'), 'const key = "AKIAIOSFODNN7EXAMPLE";\n')
    commitAll()
    writeScanReport([{ ruleId: 'AWS-001', location: { file: 'src/secret.js', line: 1 } }])

    runFix(['--apply', '--yes'])

    const envExample = fs.readFileSync(path.join(tmpDir, '.env.example'), 'utf-8')
    expect(envExample).toMatch(/AWS_ACCESS_KEY_ID=/)
  })

  it('creates a sandboxed patch branch with a valid (non-dotted) git ref name', () => {
    fs.writeFileSync(path.join(tmpDir, 'src', 'secret.js'), 'const key = "AKIAIOSFODNN7EXAMPLE";\n')
    commitAll()
    writeScanReport([{ ruleId: 'AWS-001', location: { file: 'src/secret.js', line: 1 } }])

    // No --yes: the merge prompt should skip (non-TTY) but branch creation
    // must still have succeeded.
    runFix(['--apply'])

    const branches = execFileSync('git', ['branch', '--list'], { cwd: tmpDir, encoding: 'utf-8' })
    expect(branches).toMatch(/devops-guard-patch-\d+/)
    expect(branches).not.toMatch(/\.devops-guard-patch/)
  })

  it('auto-merges the patch into the original branch with --yes', () => {
    fs.writeFileSync(path.join(tmpDir, 'src', 'secret.js'), 'const key = "AKIAIOSFODNN7EXAMPLE";\n')
    commitAll()
    writeScanReport([{ ruleId: 'AWS-001', location: { file: 'src/secret.js', line: 1 } }])

    runFix(['--apply', '--yes'])

    const currentBranch = execFileSync('git', ['branch', '--show-current'], { cwd: tmpDir, encoding: 'utf-8' }).trim()
    expect(currentBranch).not.toMatch(/devops-guard-patch/)

    const status = execFileSync('git', ['status', '--short'], { cwd: tmpDir, encoding: 'utf-8' })
    // Squash-merge stages the change but doesn't auto-commit it — that's
    // intentional, so it shows up as a staged modification here.
    expect(status).toMatch(/secret\.js/)
  })

  it('does not hang when --apply runs with no --yes and non-interactive stdin', () => {
    fs.writeFileSync(path.join(tmpDir, 'src', 'secret.js'), 'const key = "AKIAIOSFODNN7EXAMPLE";\n')
    commitAll()
    writeScanReport([{ ruleId: 'AWS-001', location: { file: 'src/secret.js', line: 1 } }])

    const { exitCode } = runFix(['--apply'])
    expect(exitCode).toBe(0)
  })
})
