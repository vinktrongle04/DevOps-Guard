<div align="center">

# 🛡️ DevOps-Guard

**A pre-commit security scanner that also governs your AI coding agents.**

[![CI](https://github.com/vinktrongle04/DevOps-Guard/actions/workflows/deploy.yml/badge.svg)](https://github.com/vinktrongle04/DevOps-Guard/actions)
![Version](https://img.shields.io/badge/version-1.0.0-6366f1)
![Standards](https://img.shields.io/badge/Compliance-OWASP%20%7C%20ISO%2027001%20%7C%20SOC%202%20%7C%20PCI--DSS%20%7C%20HIPAA-22c55e)
![License](https://img.shields.io/badge/License-MIT-f59e0b)

</div>

---

## Install into your project

```bash
npm install -D devops-guard
npx devops-guard init
```

`init` wires up a Husky pre-commit hook, drops a `guard.config.js` you can customize, and is
safe to re-run (it won't clobber an existing config). From then on, every `git commit` runs:

- **Gate 1 — Security scan**: 27 rules (secrets, keys, tokens, XSS patterns, env misconfig),
  mapped to OWASP/ISO 27001/SOC 2/PCI-DSS/HIPAA. Hard-blocks on `CRITICAL`/`HIGH`.
- **Gate 2 — Dependency check**: unused, missing, bloated, and duplicate-purpose packages.
  Missing dependencies hard-block; the rest are advisory.

```bash
devops-guard scan              # run Gate 1 manually
devops-guard scan --staged      # only scan files staged for commit (what the hook uses)
devops-guard scan --json        # for Jenkins / GitLab CI / Splunk
devops-guard scan --sarif       # for GitHub Code Scanning / Azure DevOps
devops-guard dep                # run Gate 2 manually
devops-guard fix                # preview auto-fixes (dry run)
devops-guard fix --apply        # apply them, in a sandboxed git branch
```

Confirmed a violation is a false positive (mock data, a test fixture)? Suppress it permanently
instead of dismissing it on every scan:

```bash
devops-guard ignore add src/fixtures/mock-keys.js 42 --reason "test fixture, not a real key"
```

This appends a content-based fingerprint to `.devops-guard-ignore.json` (commit it — it's a
shared team baseline, similar to `detect-secrets`' baseline file) — it survives the line moving
around, and doesn't depend on the AI verifier being available.

## Why not just use Gitleaks / TruffleHog?

Those are better, more battle-tested secret scanners — we're not claiming otherwise. What
DevOps-Guard adds is a layer neither of them touches: **governing the AI coding agents now
sitting in most developers' editors.**

| | DevOps-Guard | Gitleaks / TruffleHog / detect-secrets |
|---|---|---|
| Pre-commit secret scanning | ✅ | ✅ |
| SARIF / JSON output for CI | ✅ | ✅ (varies) |
| Auto-injects guardrails into Cursor/Claude Code/Windsurf (`.cursorrules`, `.claudecode`, `.windsurfrules`) | ✅ | ❌ |
| MCP server to intercept dangerous shell commands from AI agents before they run | ✅ | ❌ |
| Sandboxed auto-remediation (git branch + tests + interactive merge) | ✅ | ❌ |
| Regex secret-detection maturity | Good, growing | Excellent, years of hardening |

If your primary need is exhaustive secret detection, run one of those alongside DevOps-Guard.
If you're worried about what an AI coding assistant might do unsupervised in your repo, that's
the problem this project actually focuses on.

---

## The AI-Native layer

- **Universal AI Guardrails** (`devops-guard protect`): writes `.cursorrules`, `.claudecode`,
  `.antigravity`, `.windsurfrules` telling AI IDEs not to read `.env`/`.pem`/`.key` files and to
  confirm before running destructive commands.
- **MCP server** (`devops-guard mcp`): exposes a `check_command` tool over the Model Context
  Protocol that AI coding assistants can call before running a shell command, to check it
  against a deny-list (`rm -rf`, `drop table`, `chmod 777`, `curl | bash`, etc.).
- **Local Semantic Engine**: if you run [Ollama](https://ollama.com) locally, the scanner asks
  it to double-check regex matches against surrounding code context, filtering out
  mock/test-fixture false positives. Entirely optional — if Ollama isn't running, the scanner
  just falls back to plain regex matching.
- **Sandboxed auto-remediation** (`devops-guard fix --apply`): creates a new git branch, applies
  safe fixes (hardcoded secrets → env var references, `==` → `===`, unsafe DOM APIs → safe
  equivalents), runs your test suite, and asks before squash-merging back.

## Knowledge graph & queries

Every scan feeds a local knowledge base under `.devops-guard/` (never committed — see
`.gitignore`): violation history, a file/rule/compliance-standard graph, and a Markdown summary.

```bash
devops-guard kb                  # (re)build the knowledge base + graph
devops-guard query summary        # quick health snapshot
devops-guard query files-by-risk  # which files carry the most risk
devops-guard query compliance     # exposure by OWASP/ISO/SOC2/PCI-DSS/HIPAA
devops-guard query history        # scan trend over time
```

## Dashboard (beta)

```bash
devops-guard dashboard
```

A React + Vite UI for browsing scan results and the knowledge graph visually. This is a
secondary, optional piece — the CLI, pre-commit hook, and MCP server are the supported core.
Expect rougher edges here than in the CLI.

---

## Configuration

Drop a `guard.config.js` in your project root (or let `devops-guard init` generate one):

```js
// guard.config.js
module.exports = {
  ignorePaths: ['node_modules', 'dist', 'build', '.git'],   // directories the scanner skips
  extensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs'],        // extensions the dependency scanner checks
  customRules: [                                             // add your own secret patterns
    {
      id: 'CUSTOM-001',
      name: 'Internal API Key',
      regex: 'INTERNAL_[A-Z0-9]{32}',
      severity: 'HIGH',
    },
  ],
}
```

## Project structure

```
DevOps-Guard/
├── packages/core/          # the "devops-guard" npm package
│   └── src/
│       ├── cli.js          # unified CLI entry point
│       ├── scanner/        # security + dependency scanners, AI verifier
│       ├── fixer/          # sandboxed auto-remediation
│       ├── mcp/            # Model Context Protocol server
│       ├── guardrails/     # AI IDE rules generator
│       └── knowledge/      # knowledge graph, audit trail, KB builders
└── dashboard/               # React + Vite UI (beta, see above)
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Bug reports and feature requests use the templates
under `.github/ISSUE_TEMPLATE/`.

## License

MIT — see [LICENSE](LICENSE).
