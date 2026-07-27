# Contributing to DevOps-Guard

Thanks for considering a contribution. Participation in this project is governed by our
[Code of Conduct](CODE_OF_CONDUCT.md).

This is an npm workspaces monorepo:

```
DevOps-Guard/
├── packages/core/   # the "devops-guard" CLI package (scanner, fixer, MCP server, knowledge graph)
└── dashboard/        # React + Vite visualization UI (beta/optional — see README)
```

## Getting set up

```bash
git clone https://github.com/vinktrongle04/DevOps-Guard.git
cd DevOps-Guard
npm install
```

## Before opening a PR

- `npm run lint` — must pass with no errors in both the root and `dashboard/` workspaces.
- `npm test` — the Vitest suite covering the scanner, dependency checker, fixer, and
  audit-trail logic must pass. Add or update tests for any behavior change.
- `npm run scan` / `npm run dep` — run the tool against this repo itself as a smoke test.
- Keep changes scoped: prefer several small, reviewable PRs over one large one.

## Adding a new security rule

New rules live in `packages/core/src/scanner/security.js`'s `SECURITY_PATTERNS` array. Each
rule needs an `id`, a precise `regex` (avoid over-broad generic patterns — see the entropy
gate on `GEN-001` for how false positives are kept in check), a `severity`, and a `compliance`
mapping. Add a corresponding fixture test case in `packages/core/src/scanner/security.test.js`
(a true-positive sample and, if relevant, a known-safe sample that must NOT trigger).

## Releasing a dashboard change

`packages/core/dashboard-dist/` is a pre-built copy of `dashboard/`, checked into git so the
published npm package can serve the dashboard without requiring consumers to build it
themselves — `dashboard/vite.config.js` builds directly into that directory. If you change
anything under `dashboard/src/`, rebuild and commit the result before merging:

```bash
npm run build --workspace=devops-guard-dashboard
```

Don't run this if you *haven't* touched the dashboard — it changes the built bundle's content
hash and adds unrelated diff noise to your PR.

## Reporting bugs / requesting features

Use the issue templates under `.github/ISSUE_TEMPLATE/`. For security vulnerabilities in
DevOps-Guard itself, please avoid filing a public issue — see [SECURITY.md](SECURITY.md).

## Code style

- Plain modern JS (ESM, `type: module`), no TypeScript, no new runtime dependencies unless
  there's a strong reason (this project intentionally keeps its own dependency footprint small).
- No behavior described in `guard.config.js`'s documented schema should be silently unimplemented
  — if you add a config key, wire it up in the same PR.
