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

## Knowledge Space Structure

```
docs/
├── core-rules/        ← CHỈNH RULE Ở ĐÂY — TRAE always loads these
│   ├── AGENT_CONTEXT.md     (this file)
│   ├── project_rules.md     pipeline order + behavioral rules
│   ├── security_rules.md    28 security rules + compliance mapping
│   └── PROJECT_STATE.md     auto-generated KB summary (violations, risk, trends)
│
kb/                    ← Knowledge Base Level 1 (auto-generated, committed to git)
│   ├── project-state.json   structured current state (files, rules, compliance)
│   ├── event-log.jsonl      append-only scan event log
│   └── kb-index.json        fast lookup (rule→files, file→rules, compliance→rules)
│
├── how-it-works/      ← HIỂU KIẾN TRÚC Ở ĐÂY — load when explaining
│   ├── TRAE_INTEGRATION.md  how TRAE orchestrates all 5 gates
│   └── METHODOLOGY.md       hybrid architecture + metrics methodology
│
└── business-case/     ← PITCH & ROI Ở ĐÂY — load on demand only
    ├── DEMO_SCRIPT.md       3-minute live demo walkthrough
    ├── PITCH_DECK.md        8-slide presentation outline
    ├── ROI_METRICS.md       cost savings analysis with sources
    ├── ENTERPRISE_ADOPTION.md  setup guide + compliance story
    └── PRD.md               product requirements document
```

---

## File Routing — Load Only What the Task Needs

| Task | File to load |
|---|---|
| Understand pipeline or behavioral rules | `docs/core-rules/project_rules.md` |
| Look up a security rule or compliance standard | `docs/core-rules/security_rules.md` |
| Explain how TRAE orchestrates the 5 gates | `docs/how-it-works/TRAE_INTEGRATION.md` |
| Explain hybrid architecture or validate metrics | `docs/how-it-works/METHODOLOGY.md` |
| Explain ROI or cost savings | `docs/business-case/ROI_METRICS.md` |
| Prepare or run a live demo | `docs/business-case/DEMO_SCRIPT.md` |
| Answer enterprise adoption questions | `docs/business-case/ENTERPRISE_ADOPTION.md` |
| Prepare a pitch or presentation | `docs/business-case/PITCH_DECK.md` |
| Explain product requirements | `docs/business-case/PRD.md` |
| Check current project health, trends, recent events | `docs/core-rules/PROJECT_STATE.md` |

> **Rule:** Load `core-rules/` files always. Load others only when explicitly needed.
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
| Compliance standards | OWASP, ISO 27001, SOC 2, PCI-DSS, HIPAA | `core-rules/security_rules.md` |
| Output formats | Terminal · JSON (`--json`) · SARIF 2.1.0 (`--sarif`) | `security-scanner.js` |
| Time saved per commit | 41 min → ~42 sec (97.9%) | `how-it-works/METHODOLOGY.md §2.2` |
| Annual value (10-dev team) | ~$180,000/year | `how-it-works/METHODOLOGY.md §2.3` |
| License cost eliminated | $3,516/developer/year | `business-case/ROI_METRICS.md` |
| Violation trend | Simulated demo — real: `npm run security:json` | `how-it-works/METHODOLOGY.md §2.1` |

---

## Key Talking Points

**"Why different from Snyk/SonarQube?"**
> Pre-commit hard block before a commit object exists. TRAE auto-fixes, not just detects. Hybrid architecture. $0 cost.

**"Can developers bypass the hook?"**
> Yes with `--no-verify` — that is why GitHub Actions CI is the non-bypassable layer. Local = speed, CI = compliance.

**"How was 97.9% measured?"**
> Task-timing model per gate. Sources: GitGuardian 2024 + Stack Overflow Dev Survey 2023. Conservative (Gates 1–2 only): 75%. See `how-it-works/METHODOLOGY.md`.

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
npm run kb:build          # Alias for scan:export (also writes kb/)
npm run kb:summary        # Generate docs/core-rules/PROJECT_STATE.md from KB
npm run knowledge:update  # Full KB refresh: scan + summary
```

---

*Entry point only. Keep under 130 lines. Detail lives in the referenced files.*
*To add a new file: put it in the right folder, then update the routing table above.*
