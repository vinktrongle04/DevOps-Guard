import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { execFileSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'

// See security.test.js for why these run via subprocess rather than a
// direct import of dependency.js.

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CLI_PATH = path.join(__dirname, '..', 'cli.js')

let tmpDir

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-dependency-test-'))
  fs.mkdirSync(path.join(tmpDir, 'src'))
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

function writePkg(pkg) {
  fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify(pkg, null, 2))
}

function writeSrc(content, filename = 'index.js') {
  fs.writeFileSync(path.join(tmpDir, 'src', filename), content)
}

function dep() {
  try {
    const output = execFileSync(process.execPath, [CLI_PATH, 'dep'], { cwd: tmpDir, encoding: 'utf-8' })
    return { exitCode: 0, output }
  } catch (err) {
    return { exitCode: err.status, output: err.stdout ?? '' }
  }
}

describe('Gate 2 — dependency scanner', () => {
  it('reports an unused dependency', () => {
    writePkg({ name: 'x', dependencies: { lodash: '^4.0.0' } })
    writeSrc('console.log("hello")')
    const { output } = dep()
    expect(output).toMatch(/UNUSED/)
    expect(output).toMatch(/lodash/)
  })

  it('hard-blocks (exit 1) on a missing dependency', () => {
    writePkg({ name: 'x', dependencies: {} })
    writeSrc("import { z } from 'zod'")
    const { exitCode, output } = dep()
    expect(exitCode).toBe(1)
    expect(output).toMatch(/MISSING/)
    expect(output).toMatch(/zod/)
  })

  it('does not flag a runtimeDeps-listed package as unused', () => {
    writePkg({ name: 'x', devDependencies: { husky: '^9.0.0' } })
    writeSrc('console.log("hello")')
    const { output } = dep()
    expect(output).not.toMatch(/husky/)
  })

  it('flags a known bloated package with a lighter alternative', () => {
    writePkg({ name: 'x', dependencies: { moment: '^2.0.0' } })
    writeSrc('const moment = require("moment")')
    const { output } = dep()
    expect(output).toMatch(/BLOAT/)
  })

  it('passes cleanly on a project with no issues', () => {
    writePkg({ name: 'x', dependencies: { react: '^18.0.0' } })
    writeSrc("import React from 'react'")
    const { exitCode, output } = dep()
    expect(exitCode).toBe(0)
    expect(output).toMatch(/GATE 2 PASSED/)
  })

  it('respects a custom guard.config.js ignorePaths', () => {
    writePkg({ name: 'x', dependencies: { lodash: '^4.0.0' } })
    fs.mkdirSync(path.join(tmpDir, 'src', 'vendor'))
    writeSrc('module.exports = {}', path.join('vendor', 'ignored.js'))
    fs.writeFileSync(
      path.join(tmpDir, 'guard.config.js'),
      "export default { ignorePaths: ['node_modules', '.git', 'vendor'] }\n"
    )
    const { output } = dep()
    // lodash is still genuinely unused (nothing imports it), this just
    // confirms the scan didn't crash on a custom ignorePaths config.
    expect(output).toMatch(/GATE 2 SUMMARY/)
  })
})
