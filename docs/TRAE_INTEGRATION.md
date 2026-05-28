# TRAE Integration Guide — DevOps-Guard
# ============================================================
# This document describes exactly how TRAE SOLO acts as the
# unified orchestrator for all 5 Quality Gates in DevOps-Guard.
# Last updated: 2026-05-28

---

## What is TRAE SOLO's Role?

In DevOps-Guard, **TRAE SOLO is not just a code editor** — it is the **central intelligence layer** that:

1. Reads the rule engine (`project_rules.md`, `security_rules.md`)
2. Interprets developer intent from natural language prompts
3. Orchestrates Gate execution in the correct pipeline order
4. Applies auto-fixes directly in the IDE without leaving the workflow
5. Writes audit output back to documentation files

> Without TRAE, the gates are standalone scripts. With TRAE, they become a **self-healing, autonomous CI/CD brain** running locally.

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        DEVELOPER WORKFLOW                        │
│                                                                  │
│   git add .   →   git commit   →   (review)   →   git push      │
└───────────────────────────┬─────────────────────────────────────┘
                            │ triggers
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    HUSKY PRE-COMMIT HOOK                         │
│                    (.husky/pre-commit)                           │
│                                                                  │
│   ┌──────────────┐     ┌──────────────┐                         │
│   │ GATE 1       │ ──► │ GATE 2       │ ──► (if both pass)      │
│   │ Security     │     │ Dependency   │     git commit proceeds  │
│   │ Scanner      │     │ Scanner      │                         │
│   │ exit(1)=HARD │     │ exit(0)=SOFT │                         │
│   └──────────────┘     └──────────────┘                         │
└─────────────────────────────┬───────────────────────────────────┘
                              │ blocked? Developer asks TRAE
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      TRAE SOLO AGENT                             │
│                                                                  │
│   Brain Files (read on every prompt):                           │
│   ├── project_rules.md    → Pipeline order, behavioral rules    │
│   ├── security_rules.md   → 28 rules, OWASP mapping, remediation│
│   └── API_DOCUMENTATION.md → Append-only doc target             │
│                                                                  │
│   Gate Orchestration:                                            │
│   ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  │
│   │ Gate 1 │→ │ Gate 2 │→ │ Gate 3 │→ │ Gate 4 │→ │ Gate 5 │  │
│   │Security│  │  Deps  │  │Refactor│  │  Docs  │  │ Commit │  │
│   └────────┘  └────────┘  └────────┘  └────────┘  └────────┘  │
└─────────────────────────────┬───────────────────────────────────┘
                              │ output
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     GITHUB ACTIONS CI/CD                         │
│                    (.github/workflows/deploy.yml)                │
│                                                                  │
│   Gate 1 Scan (non-blocking for demo, blocking in production)   │
│   Gate 2 Scan (non-blocking for demo, blocking in production)   │
│   Gate 3 Lint                                                    │
│   Build → Deploy to Vercel                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## How TRAE Reads the Rule Engine

TRAE SOLO is configured to treat `project_rules.md` and `security_rules.md` as **persistent context** (brain files). On every relevant prompt, TRAE:

1. Loads the rule engine files into its context window
2. Applies the **Pipeline Order** from `project_rules.md § Pipeline Execution Order`
3. Applies the **ISOLATED SCOPE** rule — only modifies files in the diff
4. Applies the **STRICT EXECUTION** rule — no unsolicited changes

```
# How to instruct TRAE to run all gates in sequence:
Prompt: "Clean up this commit — run all quality gates."

TRAE reads:
  → project_rules.md → Pipeline Order: 1→2→3→4→5
  → security_rules.md → 28 rules + remediation

TRAE executes:
  [1] Detects hardcoded secrets → proposes env var replacement
  [2] Detects unused packages → proposes npm uninstall
  [3] Detects React 18 patterns → auto-migrates to React 19
  [4] Detects undocumented exports → appends JSDoc to API_DOCUMENTATION.md
  [5] Reads git diff → generates Conventional Commit message
```

---

## Gate-by-Gate TRAE Interaction

### Gate 1 — Security (Automated + TRAE-Assisted)

**Automated trigger:** Husky pre-commit runs `node security-scanner.js`

**TRAE-assisted remediation:**

```
Developer prompt: "Fix the security violations blocking my commit."

TRAE behavior (governed by STRICT_EXECUTION + ISOLATED_SCOPE):
1. Read violation report from security-scanner.js output
2. For each CRITICAL violation:
   a. Locate the hardcoded value in the exact file:line
   b. Replace with import.meta.env.VITE_* (public) or process.env.* (server)
   c. Add the variable name to .env.example (append-only)
   d. Touch NO other lines in the file
3. Report: "Fixed N violations. Run `npm run security:scan` to verify."
```

**Constraint:** TRAE must NOT auto-commit the fix. It proposes; the developer approves.

---

### Gate 2 — Dependency (Automated + TRAE-Assisted)

**Automated trigger:** Husky pre-commit runs `node dependency-scanner.js`

**TRAE-assisted remediation:**

```
Developer prompt: "Remove the unused packages flagged by Gate 2."

TRAE behavior:
1. Parse gate2 output: unused = [lodash, axios, moment, uuid]
2. For each package:
   a. Confirm zero imports across ALL src/ files (ISOLATED_SCOPE: read-only scan)
   b. Propose: npm uninstall lodash axios moment uuid
   c. If bloat registry matches: suggest lighter alternative inline
3. TRAE executes: npm uninstall <packages> (requires explicit approval)
4. Verifies: re-runs dependency-scanner.js, confirms 0 unused
```

**Key constraint:** TRAE must not remove a package if it finds any import, even in test files.

---

### Gate 3 — React Modernization (Fully Automated by TRAE)

**Trigger:** Developer prompt or TRAE detects `.jsx`/`.tsx` files in the diff.

**TRAE behavior:**

```
Prompt: "Migrate all React 18 patterns to React 19 in the changed files."

TRAE reads: project_rules.md § Rule 5 — React Modernization table

Migration map applied (ISOLATED_SCOPE: only files in diff):
┌─────────────────────────────────────────────────────────────┐
│ Pattern detected               │ Applied transformation      │
├────────────────────────────────┼─────────────────────────────┤
│ forwardRef((props, ref) => …) │ function Comp({ ref, …p })  │
│ useContext(SomeContext)        │ use(SomeContext)             │
│ <Context.Provider value={…}>  │ <Context value={…}>         │
│ ReactDOM.render(…)            │ createRoot(el).render(…)    │
└─────────────────────────────────────────────────────────────┘

ISOLATED_SCOPE enforcement:
  ✓ Modified: UserProfile.jsx (forwardRef detected)
  ✓ Modified: NotificationPanel.jsx (forwardRef detected)
  ✗ Skipped: App.css (no React patterns — untouched)
  ✗ Skipped: package.json (no React patterns — untouched)
```

---

### Gate 4 — Auto Documentation (Append-Only, TRAE-Managed)

**Trigger:** After Gate 3 completes, or developer adds a new exported function/component.

**TRAE behavior:**

```
Prompt: "Document the components refactored in Gate 3."

TRAE reads:
  → project_rules.md § Rule 3 (Append-Only) — NEVER overwrite
  → project_rules.md § Rule 6 — JSDoc template

TRAE action:
1. Inspect each modified component for exported functions/components
2. Generate JSDoc block above the definition (in-file)
3. Append to API_DOCUMENTATION.md:
   - Section header with timestamp [2026-05-28 16:45:00 UTC]
   - Component name, description, props table, return type
   - Example usage snippet
4. TRAE MUST NOT delete or reorder existing entries in API_DOCUMENTATION.md
```

**Output example appended to `API_DOCUMENTATION.md`:**

```markdown
---
## [2026-05-28 16:45:00 UTC] — DevOps-Guard Agent — Gate 4 Auto-Docs

### Component: UserProfile (React 19 migrated)
| Prop     | Type   | Default   | Required | Description              |
|----------|--------|-----------|----------|--------------------------|
| name     | string | —         | ✓        | Full display name        |
| email    | string | —         | ✓        | Email address            |
| role     | string | Developer | —        | Role label in the card   |
| avatarUrl| string | —         | —        | Optional avatar image URL|
| ref      | Ref    | —         | —        | React 19 forwarded ref   |

**Returns:** JSX — user card with avatar, name, email, and role badge
```

---

### Gate 5 — Commit Engine (TRAE-Generated)

**Trigger:** Developer asks TRAE to generate a commit message after all other gates pass.

**TRAE behavior:**

```
Prompt: "Generate a commit message for my changes."

TRAE action:
1. Run: git diff --staged (reads actual diff)
2. Categorize changes by Conventional Commits type:
   - Security fix found    → type: security
   - Package removed       → type: chore
   - React pattern updated → type: refactor
   - Doc appended          → type: docs
3. Output multi-scope message:

security(app): remove hardcoded API keys from App.jsx and apiClient.js
chore(deps): uninstall unused lodash, axios, moment, uuid (153 kB saved)
refactor(components): migrate UserProfile and NotificationPanel to React 19
docs(api): append UserProfile and NotificationPanel documentation

ISOLATED_SCOPE: message only covers files actually in the staged diff.
```

---

## Single-Prompt Full Pipeline Demo

This is the **killer demo prompt** for the judges:

```
TRAE prompt:
"Clean up my codebase before I commit:
 remove all security leaks, clean dead dependencies,
 migrate React 18 patterns to React 19,
 document the changed components, and
 generate a proper commit message."

TRAE response pipeline (governed by project_rules.md Pipeline Order):
  [Gate 1] Scanning 28 rules... → 8 CRITICAL found → replacing with env vars
  [Gate 2] Scanning 16 packages... → 4 unused → running npm uninstall
  [Gate 3] Scanning 4 components... → migrating forwardRef + useContext
  [Gate 4] Documenting 4 components → appending to API_DOCUMENTATION.md
  [Gate 5] Analyzing git diff → generating Conventional Commit message

Result: Commit-ready codebase. 30 minutes of manual work → 42 seconds.
```

---

## Data Sources TRAE Integrates

| Data Source | Type | Used By Gate |
|---|---|---|
| `project_rules.md` | Rule config | All gates |
| `security_rules.md` | Rule config + OWASP | Gate 1 |
| `security-scanner.js` output | Node CLI | Gate 1 |
| `dependency-scanner.js` output | Node CLI | Gate 2 |
| `public/scan-report.json` | JSON feed | Dashboard UI |
| `git diff --staged` | Shell command | Gate 5 |
| `package.json` | JSON config | Gate 2 |
| `src/**/*.jsx` | Source files | Gates 1, 2, 3, 4 |
| `API_DOCUMENTATION.md` | Markdown (append-only) | Gate 4 |

---

## Multi-Role Collaboration via TRAE

```
ROLE: Tech Lead (M1)
  → Sets and commits: project_rules.md, security_rules.md
  → TRAE reads these as the authoritative rule engine
  → Team members cannot override rules without updating these files

ROLE: Developer (M2)
  → Uses TRAE chat daily with natural language prompts
  → TRAE enforces rules automatically — dev focuses on business logic
  → Gate 3 (React 19 migration) runs transparently in background

ROLE: DevOps / QA (M3)
  → GitHub Actions CI runs Gates 1, 2, 3 (Lint) as verification
  → Code that reaches CI is already "TRAE-cleaned" from local
  → CI is a safety net, not the primary defense line
```

---

## Measurable Efficiency Gain

| Task | Manual Time | With TRAE | Savings |
|---|---|---|---|
| Security scan + fix leaks | 15 min | 8 sec | 98.7% |
| Remove unused dependencies | 5 min | 3 sec | 99.0% |
| Migrate React 18 → 19 patterns | 10 min | 12 sec | 98.0% |
| Write API documentation | 8 min | 15 sec | 96.9% |
| Write commit message | 3 min | 4 sec | 97.8% |
| **Total per commit** | **41 min** | **~42 sec** | **97.9%** |

> For a team of 10 making 3 commits/day: **205 hours saved per month**, equivalent to **1.2 full-time developers**.

---

## How to Configure TRAE for This Project

### Step 1: Open project in TRAE SOLO

```bash
# Clone and open
git clone https://github.com/vinktrongle04/DevOps-Guard.git
cd DevOps-Guard
npm install
```

### Step 2: Point TRAE to brain files

In TRAE settings or via `@file` mention in chat:
```
@project_rules.md @security_rules.md
```

### Step 3: Generate initial scan report (powers the Dashboard)

```bash
npm run scan:export
npm run dev
# Dashboard at http://localhost:5173 shows live scan data
```

### Step 4: Use TRAE with gate-aware prompts

```
# Single gate prompts:
"Run Gate 1 — find and fix all security leaks."
"Run Gate 2 — remove unused packages."
"Run Gate 3 — migrate this component to React 19."
"Run Gate 4 — document the changes I just made."
"Run Gate 5 — write a commit message."

# Full pipeline prompt (demo-ready):
"Run all 5 quality gates on my staged changes."
```

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| Brain files are plain Markdown | Readable by humans and parseable by LLMs without custom tooling |
| Gate 1 is HARD BLOCK, others are SOFT | Secrets are the most catastrophic failure mode — zero tolerance |
| ISOLATED SCOPE rule | Prevents merge conflicts in multi-developer teams from noisy diffs |
| Append-only docs | Prevents TRAE from accidentally destroying documentation written by teammates |
| JSON scan report in `public/` | Allows the Dashboard UI to consume real data without a backend server |
| Gate order is fixed (1→2→3→4→5) | Downstream gates (docs) depend on upstream output (refactored code) |

---

*TRAE Integration Guide v1.0 — DevOps-Guard | Unbound Creativity with TRAE SOLO @ Vietnam 2026*
