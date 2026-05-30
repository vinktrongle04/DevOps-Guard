# DevOps-Guard — Agent Context

> **Purpose:** Single entry point for TRAE SOLO knowledge space.
> Read this file first on every session. Load other files only when the task requires it.
> Last updated: 2026-05-30

---

## What this project is

DevOps-Guard is a hybrid DevSecOps governance platform.
It enforces 5 quality gates at the pre-commit hook (local, fast feedback)
and re-enforces at GitHub Actions CI (cloud, non-bypassable compliance).

**Do not describe this as "local-only" — it is hybrid (local + CI).**

---

## Knowledge Loading Architecture

Files are organized in 3 layers. Load only what the current task requires.

### Layer 0 — Core Brain (always loaded)

These 3 files are always in context. Do not skip them.

| File | Contains |
|---|---|
| `AGENT_CONTEXT.md` | This file — entry point, routing map, quick reference |
| `project_rules.md` | Pipeline order, behavioral rules for all 5 gates |
| `security_rules.md` | 28 security rules with full compliance mapping |

### Layer 1 — Reference (load when task requires explanation)

| Trigger | Load this file |
|---|---|
| "How does TRAE orchestrate the gates?" | `docs/TRAE_INTEGRATION.md` |
| "How were the metrics measured?" | `docs/METHODOLOGY.md` |
| "Explain the hybrid architecture" | `docs/METHODOLOGY.md` |

### Layer 2 — Business Context (load on demand only)

| Trigger | Load this file |
|---|---|
| "Explain ROI / cost savings" | `docs/ROI_METRICS.md` |
| "Enterprise adoption / setup guide" | `docs/ENTERPRISE_ADOPTION.md` |
| "Prepare or run the demo" | `docs/DEMO_SCRIPT.md` |
| "Pitch / presentation slides" | `docs/PITCH_DECK.md` |
| "What components are documented?" | `API_DOCUMENTATION.md` |
| "Product requirements" | `docs/PRD.md` |

> **Rule:** Never load Layer 2 files unless explicitly asked.
> Never load all files simultaneously — context window is finite.

---

## TRAE's Role

TRAE SOLO is the intelligence layer connecting all 5 gates.
`project_rules.md` is TRAE's job description. `security_rules.md` is TRAE's rule engine.

**Default behavior:** When a developer asks to "clean up" or "prepare a commit", TRAE
MUST execute gates in this fixed order: 1 → 2 → 3 → 4 → 5.

---

## Core Rules (memorized — no need to re-read project_rules.md for these)

**Pipeline order:** Gate 1 Security → Gate 2 Dependency → Gate 3 Refactor → Gate 4 Docs → Gate 5 Commit

**Hard constraints:**
- Gate 1: HARD BLOCK — `exit(1)` on CRITICAL or HIGH. No exceptions.
- NEVER use `VITE_` prefix for server-side secrets.
- NEVER overwrite `API_DOCUMENTATION.md` — append only, with timestamp.
- ISOLATED SCOPE — only modify files in the current diff.
- STRICT EXECUTION — only perform actions explicitly requested.

**Architecture:** Hybrid.
- Local pre-commit hook = speed (feedback in < 10 sec)
- GitHub Actions CI = enforcement (cannot bypass, permanent audit trail)

---

## Quick Metrics

| Metric | Value | Source |
|---|---|---|
| Security rules | 28 rules, 12 categories | `security-scanner.js` |
| Compliance standards | OWASP, ISO 27001, SOC 2, PCI-DSS, HIPAA | `security_rules.md` |
| Output formats | Terminal · JSON (`--json`) · SARIF 2.1.0 (`--sarif`) | `security-scanner.js` |
| Time saved per commit | 41 min → ~42 sec (97.9%) | `docs/METHODOLOGY.md §2.2` |
| Annual value (10-dev team) | ~$180,000/year | `docs/METHODOLOGY.md §2.3` |
| License cost eliminated | $3,516/developer/year | `docs/ROI_METRICS.md` |
| Violation trend | Simulated demo data — real: `npm run security:json` | `docs/METHODOLOGY.md §2.1` |

---

## Key Talking Points

**"Why different from Snyk/SonarQube?"**
> Pre-commit hard block before a commit object exists. TRAE auto-fixes, not just detects. Hybrid architecture. $0 cost.

**"Can developers bypass the hook?"**
> Yes with `--no-verify` — that is why GitHub Actions CI is the non-bypassable layer. Local = speed, CI = compliance.

**"How was 97.9% measured?"**
> Task-timing model per gate. Sources: GitGuardian 2024 + Stack Overflow Dev Survey 2023. Conservative (Gates 1–2 only): 75%. Full detail: `docs/METHODOLOGY.md`.

---

## npm Scripts

```bash
npm run security:scan     # Gate 1 — colored terminal
npm run security:json     # Gate 1 — JSON output (CI/CD)
npm run security:sarif    # Gate 1 — SARIF 2.1.0 (GitHub Code Scanning)
npm run dep:scan          # Gate 2 — dependency audit
npm run scan:export       # Gate 1+2 → scan-report.json + scan-history.json
npm run dev               # Dashboard → http://localhost:5173
npm run build             # Production build
```

---

*Entry point only. Keep under 120 lines. Detail lives in the referenced files.*
