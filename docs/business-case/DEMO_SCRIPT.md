# DevOps-Guard — Demo Script

> **Knowledge Layer: 2 — Load only when preparing or delivering a live demo.**

---

## Pre-Demo Checklist

- [ ] TRAE SOLO open with DevOps-Guard project loaded
- [ ] Terminal open at project root
- [ ] `npm run dev` running — Dashboard visible at `http://localhost:5173`
- [ ] `src/App.jsx` open in the editor (the file with intentional demo traps)

---

## Step 1 — The Careless Developer (45 seconds)

**Narration:**
> "Let's say a developer just finished a payment feature and accidentally left a Google API Key and a Stripe secret key in the source code. They're about to push this to GitHub."

**Actions:**

```bash
git add .
git commit -m "feat: add payment endpoint"
```

**Expected result:**

```
DEVOPS-GUARD SECURITY SCANNER v3.1
28 rules · OWASP + ISO 27001 + SOC 2 + PCI-DSS + HIPAA
────────────────────────────────────────────────────────────────

[GOOG-001] CRITICAL — Google API Key
  Line 17: const apiKey = "AIzaSyFakeKey..."
  OWASP A02 | ISO 27001 A.9.4.3 | PCI-DSS Req 6.3

[PAY-001] CRITICAL — Stripe Secret Key
  Line 23: const stripeKey = "sk_live_..."
  OWASP A02 | PCI-DSS Req 3.2

COMMIT BLOCKED — Remove all secrets before committing.
```

**Narration:**
> "Gate 1 blocked the commit instantly — locally, before anything left the machine. The secret never entered git history."

---

## Step 2 — TRAE Resolves the Entire Pipeline (60 seconds)

**Narration:**
> "Instead of manually hunting down each violation, the developer describes the goal in plain English to TRAE SOLO."

**TRAE prompt:**

```
Clean up my codebase before I commit:
remove all security leaks, clean unused dependencies,
migrate React 18 patterns to React 19,
document the changed components, and generate a commit message.
```

**What TRAE executes (governed by project_rules.md Pipeline Order 1→2→3→4→5):**

| Gate | Action | Result |
|---|---|---|
| Gate 1 | Replace hardcoded keys with `import.meta.env.*` | 0 violations |
| Gate 2 | Uninstall unused: lodash, axios, moment, uuid | −153 kB bundle |
| Gate 3 | Migrate `forwardRef` → ref prop, `useContext` → `use()` | React 19 compliant |
| Gate 4 | Append JSDoc + prop tables to API_DOCUMENTATION.md | Docs updated |
| Gate 5 | Read `git diff --staged` → generate commit message | Ready to commit |

**Narration:**
> "TRAE reads `project_rules.md` as its job description. It knows the exact execution order, applies ISOLATED SCOPE — touching only files in the diff — and proposes each change for developer approval before applying."

---

## Step 3 — Clean Commit (45 seconds)

**Narration:**
> "The code is clean. Let's commit — but instead of writing the message by hand, Gate 5 generates it."

**TRAE output (Gate 5):**

```
security(app): replace hardcoded API keys with environment variables
chore(deps): remove unused lodash, axios, moment, uuid — saves 153 kB
refactor(components): migrate UserProfile and NotificationPanel to React 19
docs(api): append component documentation to API_DOCUMENTATION.md
```

```bash
git commit -m "security(app): replace hardcoded API keys..."
# → All Quality Gates passed. Commit created.
git push origin main
# → GitHub Actions CI runs verification (Gate 1 + Gate 2 + Build)
```

**Narration:**
> "41 minutes of manual review compressed into 42 seconds. Clean code, zero secrets, React 19 compliant, with full documentation and a proper commit message — all from one TRAE prompt."

---

## Dashboard Walkthrough (30 seconds, optional)

Open `http://localhost:5173` and point to:

1. **Violation count** — 57 total across 12 categories
2. **Compliance badges** — click any violation to see OWASP, ISO 27001, SOC 2, PCI-DSS, HIPAA mapping
3. **Trend chart** — 10-day sparkline showing 89 → 57 violations (36% improvement)
4. **Gate status cards** — live BLOCKED / WARNING / PASSED indicators

---

*Last updated: 2026-05-30*
