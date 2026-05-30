# DevOps-Guard — Agent Context

> **Purpose:** Single entry point for TRAE SOLO knowledge space.
> Read this file first. Navigate to referenced files only when the task requires it.
> Last updated: 2026-05-30

---

## What this project is

DevOps-Guard is a hybrid DevSecOps governance platform.
It enforces 5 quality gates at the pre-commit hook (local, fast feedback)
and re-enforces at GitHub Actions CI (cloud, non-bypassable compliance).

**Do not describe this as "local-only" or "zero infrastructure" — it is hybrid.**

---

## TRAE's role

TRAE SOLO is the intelligence layer connecting all 5 gates.
It reads `project_rules.md` as its job description and `security_rules.md` as its rule engine.

**Default behavior:** When a developer asks to "clean up" or "prepare a commit", TRAE
MUST execute gates in this fixed order: 1 → 2 → 3 → 4 → 5.

---

## Knowledge file map

Load these files based on the task at hand. Do not load all at once.

| Task | File to read |
|---|---|
| Understand pipeline order and behavioral rules | `project_rules.md` |
| Look up a specific security rule or compliance standard | `security_rules.md` |
| Explain how TRAE orchestrates the gates | `docs/TRAE_INTEGRATION.md` |
| Answer questions about architecture or metrics methodology | `docs/METHODOLOGY.md` |
| Explain ROI or cost savings to a stakeholder | `docs/ROI_METRICS.md` |
| Prepare or deliver a demo | `docs/DEMO_SCRIPT.md` |
| Answer enterprise adoption questions | `docs/ENTERPRISE_ADOPTION.md` |
| Present a pitch or elevator pitch | `docs/PITCH_DECK.md` |
| Check what components are documented | `API_DOCUMENTATION.md` |

---

## Core rules (memorize these — do not need to re-read project_rules.md for these)

**Pipeline order:** Security → Dependency → Refactor → Docs → Commit

**Hard constraints:**
- Gate 1 is a HARD BLOCK: exit(1) on CRITICAL or HIGH violation. No exceptions.
- NEVER use `VITE_` prefix for server-side secrets.
- NEVER overwrite `API_DOCUMENTATION.md` — append only, with timestamp.
- ISOLATED SCOPE: only modify files in the current diff.
- STRICT EXECUTION: only perform actions explicitly requested.

**Architecture:** Hybrid — local pre-commit hook (speed) + GitHub Actions CI (enforcement).
The CI layer re-runs Gates 1–2 on every push. A developer cannot bypass both layers simultaneously.

---

## Quick metrics (for when you need to quote numbers)

| Metric | Value | Source |
|---|---|---|
| Security rules | 28 rules across 12 categories | `security-scanner.js` |
| Compliance standards | 5: OWASP, ISO 27001, SOC 2, PCI-DSS, HIPAA | `security_rules.md` |
| Output formats | Terminal, JSON (`--json`), SARIF 2.1.0 (`--sarif`) | `security-scanner.js` |
| Time saved per commit | 41 min → ~42 sec (97.9%) | `docs/METHODOLOGY.md §2.2` |
| Annual value (10-dev team) | ~$180,000/year | `docs/METHODOLOGY.md §2.3` |
| License cost eliminated | $3,516/developer/year | `docs/ROI_METRICS.md` |
| Violation trend data | Simulated demo — real count from `npm run security:json` | `docs/METHODOLOGY.md §2.1` |

---

## Key talking points for judges

**"Why is this different from Snyk/SonarQube?"**
> Pre-commit hard block before a commit object exists + TRAE auto-fixes, not just detects + hybrid architecture + $0 cost.

**"Can developers bypass the hook?"**
> Yes with `--no-verify` — that is why the GitHub Actions CI is the non-bypassable layer.
> Defense in depth: local = speed, CI = compliance.

**"How did you measure the 97.9% savings?"**
> Task-timing model per gate, anchored to GitGuardian 2024 and Stack Overflow Dev Survey 2023.
> Conservative estimate (Gates 1–2 only): still 75% reduction.
> Full methodology: `docs/METHODOLOGY.md`.

---

## npm scripts reference

```bash
npm run security:scan     # Gate 1 — colored terminal output
npm run security:json     # Gate 1 — JSON output for CI/CD
npm run security:sarif    # Gate 1 — SARIF 2.1.0 for GitHub Code Scanning
npm run dep:scan          # Gate 2 — dependency audit
npm run scan:export       # Gate 1+2 → writes public/scan-report.json + scan-history.json
npm run dev               # Dashboard at http://localhost:5173
npm run build             # Production build
```

---

*This file is the knowledge space entry point. Keep it under 150 lines.*
*Detail lives in the referenced files — not here.*
