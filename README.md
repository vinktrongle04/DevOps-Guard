<div align="center">

# 🛡️ DevOps-Guard

**A pre-commit security scanner that also governs your AI coding agents.**

[![CI](https://github.com/vinktrongle04/DevOps-Guard/actions/workflows/ci.yml/badge.svg)](https://github.com/vinktrongle04/DevOps-Guard/actions)
![Version](https://img.shields.io/badge/version-1.0.0-6366f1)
![Standards](https://img.shields.io/badge/Compliance-OWASP%20%7C%20ISO%2027001%20%7C%20SOC%202%20%7C%20PCI--DSS%20%7C%20HIPAA-22c55e)
![License](https://img.shields.io/badge/License-MIT-f59e0b)

</div>

---

## Install into your project

Requires Node.js ≥18 and a git repository.

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
| MCP server exposing an advisory deny-list check for AI agents to self-check shell commands | ✅ | ❌ |
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
- **MCP server** (`devops-guard mcp`): exposes `check_command` (an advisory deny-list check
  against `rm -rf`, `drop table`, `chmod 777`, `curl | bash`, etc. — best-effort, not an
  enforcement boundary) and `analyze_snippet_security` (asks the configured AI verifier below
  whether a flagged snippet is a real violation) over the Model Context Protocol.

  Point your MCP client at it:

  ```json
  {
    "mcpServers": {
      "devops-guard": { "command": "npx", "args": ["devops-guard", "mcp"] }
    }
  }
  ```

  (`.mcp.json` for Claude Code; the same shape works for Cursor's/Windsurf's MCP config.)

- **Pluggable AI verifier**: double-checks regex matches against surrounding code context to
  filter out mock/test-fixture false positives, before they ever reach you or the AI verifier
  cost gate below.
  - `ollama` (default) — local, free, zero-config. If [Ollama](https://ollama.com) isn't
    running, the scanner just falls back to plain regex matching; nothing breaks.
  - `anthropic` / `openai` — your own API key, your own cost. **You explicitly opt in and pay
    for your own usage** — DevOps-Guard never bundles or proxies API access. Before the first
    cloud call in a run, it prints a cost banner (call count, rough estimate, which env var is
    billed) and asks for confirmation; pass `--yes` / set `aiVerifier.autoConfirm: true` /
    `DEVOPS_GUARD_YES=1` to skip the prompt in CI. In a non-interactive shell with no
    auto-confirm, it skips cloud verification entirely rather than hanging.
- **Sandboxed auto-remediation** (`devops-guard fix --apply`): creates a new git branch, applies
  safe fixes (hardcoded secrets → env var references, unsafe DOM APIs → safe equivalents), runs
  your test suite, and asks before squash-merging back.

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

Drop a `guard.config.js` in your project root (or let `devops-guard init` generate one — the
generated file only includes the keys you're likely to actually touch; everything below is the
full schema, defaults shown):

```js
// guard.config.js
module.exports = {
  // Directories skipped by both scanners (matched by name, at any depth)
  ignorePaths: ['node_modules', '.git', 'dist', 'build', 'dashboard-dist', '.husky', '.github',
                'coverage', 'public', 'kb', '.knowledge-base', '.gemini', 'docs', '.devops-guard'],

  // Extensions the dependency scanner reads for import/require extraction
  extensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs'],

  // Extensions the security scanner reads for secrets — kept separate from `extensions` above
  // on purpose: widening one must not silently narrow the other (secrets leak into
  // .env/.json/.yaml just as often as .js).
  secretExtensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.env', '.yml', '.yaml', '.md',
                     '.toml', '.cfg', '.ini', '.conf'],

  // Additional secret-detection rules, merged with the built-in 27
  customRules: [
    { id: 'CUSTOM-001', name: 'Internal API Key', regex: 'INTERNAL_[A-Z0-9]{32}', severity: 'HIGH' },
  ],

  // Dependency scanner's source dir (relative to project root). null = auto-detect: the
  // project root's own src/, or — in an npm/yarn workspaces monorepo with no root src/ — the
  // first workspace listed that has one.
  srcDir: null,

  // Packages always considered "used", even if never imported in src/ (tooling invoked only
  // via package.json scripts, not import/require)
  runtimeDeps: ['husky', 'vite', 'eslint', 'prettier', 'typescript', 'devops-guard'],

  // Only show violations at or above this level: CRITICAL | HIGH | MEDIUM | LOW
  minSeverity: 'LOW',

  // Severity that hard-blocks a commit/CI run
  failOnSeverity: 'HIGH',

  // AI verifier — see "The AI-Native layer" above for the cost-consent flow
  aiVerifier: {
    provider: 'ollama',       // 'ollama' | 'anthropic' | 'openai' | 'off'
    model: null,              // null = provider-specific default
    apiKey: null,             // or set ANTHROPIC_API_KEY / OPENAI_API_KEY in your environment
    autoConfirm: false,       // skip the cloud-cost consent prompt (also settable via --yes)
    concurrency: 5,           // bounded parallel verification calls
    ollama: { host: '127.0.0.1', port: 11434 },
  },
}
```

`guard.config.js` is loaded with a plain JS `import()`, the same way `eslint.config.js`/`vite.config.js` are — it is *executed*, not parsed as data. Treat it like any other repo config file: if you'd review a change to `eslint.config.js` in a PR, review changes to this file too. DevOps-Guard's scanning/blocking logic only gets a chance to run *after* this file has already loaded.

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

See [CONTRIBUTING.md](CONTRIBUTING.md) and our [Code of Conduct](CODE_OF_CONDUCT.md). Bug
reports and feature requests use the templates under `.github/ISSUE_TEMPLATE/`.

## Security

Found a vulnerability in DevOps-Guard itself? Please don't open a public issue — see
[SECURITY.md](SECURITY.md) for how to report it privately.

## License

MIT — see [LICENSE](LICENSE).
