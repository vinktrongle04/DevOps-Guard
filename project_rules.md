# DevOps-Guard — Project Rules

> **This file is the single source of truth for all agent behavior.**  
> Every automated action MUST comply with the rules defined here.  
> Last updated: 2026-05-30


## Pipeline Execution Order

When multiple gates apply simultaneously, the agent MUST execute them in this fixed order.
A HARD-BLOCK gate stops the pipeline; subsequent gates do not run.

```
┌─────────────────────────────────────────────────────────┐
│  GATE 1 → Security       [HARD BLOCK]  exit(1) on fail  │
│  GATE 2 → Dependency     [SOFT BLOCK]  warn, allow pass │
│  GATE 3 → Refactor       [AUTO FIX]    independent      │
│  GATE 4 → Docs           [AUTO GEN]    runs after Gate 3 │
│  GATE 5 → Commit         [AUTO GEN]    runs last         │
└─────────────────────────────────────────────────────────┘
```

**Rationale:** If a secret leak exists, no amount of refactoring or documentation matters — the commit must be blocked immediately. Docs depend on Refactor output, so Gate 4 always follows Gate 3.

---

## Rule 1 — Dependency Lock (Gate 2)

**Trigger:** `package.json` modified or agent detects unused imports.

- Do NOT add any new package to `dependencies` or `devDependencies` without explicit Tech Lead approval.
- Only use packages already present in the current `package.json`.
- Flag any package declared in `package.json` but **not imported anywhere** in source as **"dead dependency"** and propose removal.
- Prohibited commands (require approval): `npm install <pkg>`, `yarn add <pkg>`, `pnpm add <pkg>`.

### Dead Code Scan (in-file)

The agent MUST scan for unused symbols within each modified file:

```
Unused import   → import X from '...' where X never appears in file body
Unused variable → const x = ... where x is never referenced
Unused function → function x() {...} where x is never called in file
```

> **Scope limitation:** In-file analysis only. Cross-file dead code requires `ts-prune` or `eslint/no-unused-vars` and is out of agent scope.

---

## Rule 2 — Conventional Commits (Gate 5)

**Trigger:** Every commit. Agent auto-generates message from Git diff.

Format:
```
<type>(<scope>): <description>

[optional body — explain WHY, not WHAT]

[optional footer — Closes #issue, BREAKING CHANGE: ...]
```

Valid types:

| Type       | When to use                                      |
|------------|--------------------------------------------------|
| `feat`     | New feature                                      |
| `fix`      | Bug fix                                          |
| `docs`     | Documentation changes only                       |
| `style`    | Formatting only — no logic change                |
| `refactor` | Code restructure — no feature added, no bug fixed |
| `perf`     | Performance improvement                          |
| `test`     | Adding or updating tests                         |
| `chore`    | Build process, CI config, dependency updates     |
| `security` | Security fix or hardening                        |

---

## Rule 3 — Immutable Docs / Append-Only (Gate 4)

> **Highest priority rule for documentation files.**

For all `.md`, `.txt`, and `.log` files:

- NEVER overwrite existing content.
- ONLY append new content to the **end of file**.
- Every append MUST include a timestamp: `[YYYY-MM-DD HH:mm:ss UTC]`.

Applies strictly to:
- `API_DOCUMENTATION.md` — auto-generated API docs
- `CHANGELOG.md` — change log
- `SECURITY_AUDIT.md` — security scan report

### Valid append format:

```markdown
---
## [2026-05-28 16:00:00 UTC] — DevOps-Guard Agent

### Component: UserProfile
- **Props:** name (string, required), email (string, required), role (string, default: "Developer"), avatarUrl (string, optional), ref (Ref, React 19 style)
- **Returns:** JSX — user card with avatar, name, email, role badge
- **Notes:** Uses ThemeContext via use() hook (React 19 pattern)
```

---

## Rule 4 — Security

> Full security rule reference: [security_rules.md](./security_rules.md)

**Summary of hard constraints:**

- NEVER hardcode any secret, credential, token, or key in source code.
- NEVER use `VITE_` prefix for server-side secrets — `VITE_` variables are bundled into client JavaScript and are publicly readable in the browser.

```
# ALLOWED — public values safe for the browser
VITE_GOOGLE_MAPS_KEY=...     ✅ Public API key with domain restriction
VITE_APP_NAME=...            ✅ Non-sensitive config

# FORBIDDEN — server secrets must NOT use VITE_ prefix
VITE_OPENAI_API_KEY=...      ❌ Bundled into client JS — exposed!
VITE_DATABASE_URL=...        ❌ Bundled into client JS — exposed!
VITE_STRIPE_SECRET=...       ❌ Bundled into client JS — exposed!
```

- All secrets must live in `.env` files that are listed in `.gitignore`.
- `.gitignore` must include: `.env`, `.env.local`, `.env.*.local`.

---

## Rule 5 — React Modernization (Gate 3)

**Trigger:** Any `.jsx` or `.tsx` file in the diff.

When legacy React 18 patterns are detected, the agent MUST auto-migrate to React 19:

| Pattern | React 18 (Legacy) | React 19 (Target) |
|---------|-------------------|-------------------|
| Ref forwarding | `forwardRef((props, ref) => ...)` | `function Component({ ref, ...props })` |
| Context consumption | `useContext(SomeContext)` | `use(SomeContext)` |
| Context provider | `<Context.Provider value={...}>` | `<Context value={...}>` |
| Async resources | `useEffect` + `useState` for data fetch | `use(promise)` or React Server Components |
| Memoization | Manual `React.memo()` wrapping | React Compiler handles automatically |
| Legacy render | `ReactDOM.render(<App />, el)` | `createRoot(el).render(<App />)` |
| Lazy loading | `React.lazy()` with `<Suspense>` | Retained — but prefer async components |
| StrictMode | Optional | Required in all environments |

---

## Rule 6 — Auto Documentation (Gate 4)

**Trigger:** After Gate 3 (Refactor) completes, or when a new component/function is added.

### Documentation is REQUIRED for:
- Every exported React component
- Every exported function or hook
- Every exported TypeScript type or interface

### Required format — JSDoc block above the definition:

```js
/**
 * @component ComponentName
 * @description One clear sentence describing what this component renders.
 *
 * @param {Type}   propName          - Description. Required/Optional.
 * @param {Type}   [optionalProp]    - Description. Default: value.
 * @returns {JSX.Element}
 *
 * @example
 * <ComponentName propName="value" />
 */
```

```js
/**
 * @function functionName
 * @description One clear sentence describing what this function does.
 *
 * @param {Type}   paramName  - Description.
 * @returns {Type}            - Description of return value.
 *
 * @throws {Error}            - When (condition).
 */
```

### What MUST be documented in `API_DOCUMENTATION.md`:
- Component name, description, full props table (name / type / default / required / description)
- Function name, parameters, return type, thrown errors
- Side effects, dependencies, known limitations

### What must NOT appear in documentation:
- "TODO" or "FIXME" comments
- Commented-out code blocks
- Vague descriptions like "handles the thing"

---

## Rule 7 — Strict Execution & Isolated Scope

> This rule governs HOW the agent acts, not what it detects.

### STRICT EXECUTION

The agent MUST only perform actions explicitly required by the triggered gate:

- Do NOT add logic that was not requested.
- Do NOT refactor code that is not in the current diff.
- Do NOT add comments, logs, or console statements unless explicitly instructed.
- Do NOT install packages as a "side effect" of another task.

### ISOLATED SCOPE

The agent MUST minimize the blast radius of every change:

- Only modify files that contain the violation being fixed.
- Do NOT change code style (quotes, semicolons, trailing commas, whitespace) in lines unrelated to the fix.
- Do NOT rename variables, reorder imports, or restructure blocks unless directly required.
- Each fix must produce the **smallest possible diff** — if a fix can be made in 1 line, it must not touch 10 lines.

**Why this matters:** Noisy diffs cause unnecessary merge conflicts in multi-developer teams and make code review harder.

```diff
# BAD — agent changed quotes everywhere (noise)
- const name = "Alice"
- const role = "admin"
+ const name = 'Alice'
+ const role = 'admin'

# GOOD — agent only fixed the actual violation
- const apiKey = "AIzaSy..."
+ const apiKey = import.meta.env.VITE_GOOGLE_API_KEY
```

---

*Last updated: 2026-05-30*
