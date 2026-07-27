# Security Policy

DevOps-Guard is a security tool, so we hold its own code to the same bar it
holds yours. If you find a vulnerability in DevOps-Guard itself, please
report it privately rather than opening a public issue.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting for this repository:

1. Go to the [Security tab](https://github.com/vinktrongle04/DevOps-Guard/security).
2. Click **Report a vulnerability**.
3. Include what you found, the affected version/commit, and — if possible —
   a minimal reproduction.

This opens a private discussion visible only to the maintainers until a fix
is ready, instead of disclosing the issue publicly.

## Supported versions

DevOps-Guard is currently pre-1.x-stable; the latest published release on
[npm](https://www.npmjs.com/package/devops-guard) is the only version that
receives security fixes.

## Scope

In scope: the `devops-guard` CLI, its MCP server, the auto-fixer, and the
GitHub Action (everything under `packages/core/`).

The dashboard (`dashboard/`) is explicitly a beta/optional component (see
[README.md](README.md#dashboard-beta)) — bugs there are welcome as regular
issues, but it's lower priority for security triage since it binds to
`127.0.0.1` only and is not designed for exposure to untrusted networks.

## What counts as a real finding here

Given this tool's own threat model (documented in
[README.md](README.md#configuration)), please note two things that are
**by design**, not vulnerabilities:

- `guard.config.js` is loaded via a plain JS `import()` — like
  `eslint.config.js`/`vite.config.js`, it is executed, not sandboxed data.
  A malicious `guard.config.js` running arbitrary code is a trust-boundary
  fact about JS config files in general, not a DevOps-Guard-specific bug.
- The MCP `check_command` tool is an advisory, best-effort check — it has
  no way to force an AI agent to actually consult it before running a
  command. Reports that it can be "bypassed" by not calling it, or by a
  command outside its deny-list, are a known, documented limitation
  rather than a new finding — though concrete deny-list gaps are still
  welcome.

Everything else — the scanner, the fixer's file/git handling, the audit
trail, the AI provider integrations, the dashboard's local HTTP server —
is fair game.
