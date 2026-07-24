# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-07-24

Initial public open-source release — a relaunch from a hackathon demo into an
installable, tested tool.

### Added
- A pluggable AI verifier backend (`aiVerifier` in `guard.config.js`): local
  Ollama (default, free, zero-config) or a cloud provider (Anthropic/OpenAI)
  the user explicitly configures and pays for. Cloud providers never
  auto-ping — sending violations to a paid API always goes through a
  cost/consent step first (skipped safely, never hanging, in non-interactive/CI
  shells without `--yes`).
- `devops-guard scan --staged`, scanning only `git diff --cached` files instead
  of the whole repo, so the pre-commit hook stays fast regardless of repo size.
- `devops-guard ignore add <file> <line> [--reason]` — a permanent,
  content-fingerprinted false-positive baseline (`.devops-guard-ignore.json`)
  that survives line-number drift and doesn't depend on the AI verifier.
- Entropy scoring on the generic secret rule (`GEN-001`), filtering out
  obvious placeholders (`changeme123`, `REPLACE_ME`) before they're reported.
- A real MCP integration: `analyze_snippet_security` now returns an actual
  AI verdict instead of a static stub.
- A Vitest test suite covering the security/dependency scanners, the fixer's
  rule-to-fix-strategy routing, the audit trail, and AI provider selection.
- `LICENSE` (MIT), `CHANGELOG.md`, `CONTRIBUTING.md`, and GitHub issue templates.

### Changed
- Unified versioning to `1.0.0` across the workspace, the CLI banner, and
  scanner JSON/SARIF output (previously disagreed across 4+ places).
- Consolidated `guard.config.js` loading: both scanners now share one loader
  (`utils/config.js`) instead of duplicating it inline. Split the previously
  overloaded `extensions` key into `extensions` (dependency scanning) and
  `secretExtensions` (security scanning) — widening one no longer silently
  narrows the other.
- Wired up config keys that were documented but silently ignored:
  `failOnSeverity`, `minSeverity`, `runtimeDeps`, `srcDir`.
- Rewrote the README around "install into your project" instead of
  instructions for working inside this repo's own source, and added an
  honest comparison against Gitleaks/TruffleHog/detect-secrets.

### Fixed
- **The sandboxed auto-remediation branch never actually worked**: its name
  (`.devops-guard-patch-<timestamp>`) started with a dot, which git rejects
  as an invalid ref name, so `fix --apply` always silently fell back to
  applying fixes directly on the current branch.
- **The merge-confirmation prompt could hang forever** in CI/piped
  invocations — it never checked `process.stdin.isTTY`. Now skips cleanly
  with a clear message, and supports `--yes`/`DEVOPS_GUARD_YES=1` for
  automated use.
- **`--json`/`--sarif` output could be corrupted by a stray `console.log`**
  ("Ollama ping failed...") whenever Ollama wasn't running — which, for most
  users, was every time. All AI-verifier output is now silenced in quiet mode.
- The AI verifier was building prompts from `v.ruleId`, a field that doesn't
  exist on violation objects (the real field is `v.id`) — every prompt asked
  about rule "undefined".
- Violations reported file paths relative to wherever `security.js` itself
  lives on disk (e.g. deep inside `node_modules/` for a real consumer)
  instead of the project root.
- The fixer routed JWT violations (`AUTH-001`) through a `==` → `===`
  "weak equality" fix that doesn't apply to hardcoded tokens, so they were
  never actually fixed — despite an env-var mapping (`JWT_SECRET`) already
  existing for exactly this rule. Now routed through the same secret-rewrite
  path as other credential rules.
- The HMAC "immutable audit trail" signed files with a salt hardcoded in
  source, which defeats the point (anyone reading the code could recompute a
  valid signature). Now generates a random key locally on first use.
- Corrected the security scanner's advertised rule/category counts (27 active
  rules across 11 categories — `LOG-001` had been commented out, making the
  previous "28 rules / 12 categories" claim stale).
- Fixed corrupted (UTF-16-contaminated) lines in `.gitignore` and untracked
  generated runtime state under `.knowledge-base/` that should never have been
  committed.
- Added a root `eslint.config.js` — `npm run lint` at the workspace root had
  never actually run (no config file existed).
- Excluded test files from the published npm package.

### Removed
- Deleted demo/fixture files that were mixed into the real, shipped dashboard
  source tree (`dashboard/src/components/PaymentDemo.jsx`,
  `dashboard/src/config/database.js`, `dashboard/src/utils/auth.js`,
  `dashboard/src/services/apiClient.js`). One of them contained an actual
  syntax error that broke `eslint .`.
- Removed the `DEMO_TRAPS` allowlist from the dependency scanner (Gate 2),
  which previously hid `mongodb`/`pg`/`redis` from the missing-dependency check.
- Removed `docs/` from the tracked tree — hackathon pitch material citing
  fabricated ROI figures against features that were never implemented.
