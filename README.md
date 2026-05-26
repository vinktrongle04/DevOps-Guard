# DevOps-Guard

An autonomous Git and DevOps assistant that runs silently inside TRAE SOLO. It intercepts every commit with a pipeline of automated **Quality Gates** — scanning for leaked secrets, detecting unused dependencies, refactoring legacy React code, generating API documentation, and enforcing Conventional Commits — reducing a 30-minute manual review process down to ~2 minutes.

> Built for the **Unbound Creativity with TRAE SOLO @ Vietnam** hackathon.

---

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [Quality Gates](#quality-gates)
- [Security Scanner — Rules Reference](#security-scanner--rules-reference)
- [CI/CD Pipeline](#cicd-pipeline)
- [Environment Variables](#environment-variables)
- [Project Rules (Agent Brain)](#project-rules-agent-brain)
- [ROI Metrics](#roi-metrics)
- [License](#license)

---

## Architecture

```
Developer Workstation
        |
        |--- git commit ---> Husky pre-commit hook
                                    |
                                    v
                      TRAE SOLO CORE (DevOps-Guard)
                      ┌─────────────────────────────┐
                      │ 1. Security Gate             │  Regex-based secret scanner
                      │ 2. Dependency Gate           │  Unused package detection
                      │ 3. Refactor Engine           │  React 18 → 19 migration
                      │ 4. Docs Engine               │  Auto-gen API_DOCUMENTATION.md
                      │ 5. Commit Engine              │  Conventional Commits
                      └─────────────────────────────┘
                                    |
                                    v
                          DiffView Approval
                                    |
                                    v
              Push to GitHub (main) ---> CI/CD (Vercel Auto-Deploy)
```

---

## Tech Stack

| Layer          | Technology                         | Version  |
|----------------|------------------------------------|----------|
| Runtime        | Node.js                            | >= 20    |
| UI Framework   | React                              | 18.3.x   |
| Build Tool     | Vite                               | 6.x      |
| Linting        | ESLint (Flat Config)               | 9.x      |
| Git Hooks      | Husky                              | 9.x      |
| CI/CD          | GitHub Actions + Vercel            | —        |
| Security       | Custom regex-based scanner (ES Module) | v2.0 |

---

## Project Structure

```
DevOps-Guard/
├── .github/workflows/
│   └── deploy.yml              # CI/CD pipeline (GitHub Actions → Vercel)
├── .husky/
│   └── pre-commit              # Husky hook → triggers security-scanner.js
├── src/
│   ├── components/
│   │   └── UserProfile.jsx     # Demo component (React 18 legacy patterns)
│   ├── App.jsx                 # Main app (contains intentional secret leaks)
│   ├── App.css                 # Application styles
│   ├── index.css               # Global reset & typography
│   └── main.jsx                # React entry point
├── security-scanner.js         # Quality Gate: secret leak scanner (23 rules)
├── security_rules.md           # Standardized security rules for the agent
├── project_rules.md            # Agent brain: behavioral rule engine
├── API_DOCUMENTATION.md        # Auto-generated docs (append-only)
├── package.json                # Deps include intentional unused `lodash`
├── eslint.config.js            # ESLint flat config for React
├── vite.config.js              # Vite bundler configuration
└── index.html                  # HTML entry point
```

---

## Prerequisites

- **Node.js** >= 20.x
- **npm** >= 10.x
- **Git** >= 2.x

---

## Installation

```bash
# Clone the repository
git clone https://github.com/vinktrongle04/DevOps-Guard.git
cd DevOps-Guard

# Install dependencies (includes lodash as an intentional unused trap)
npm install

# Husky hooks are configured automatically via the `prepare` script.
```

---

## Usage

### Start the development server

```bash
npm run dev
```

### Run the security scanner manually

```bash
npm run security:scan
```

Expected output when secrets are detected:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  DEVOPS-GUARD SECURITY SCANNER v2.0
  23 security rules loaded
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  CRITICAL — Google API Key
    File: src/App.jsx:17
    Remediation: Move to VITE_GOOGLE_API_KEY in .env

  CRITICAL — Stripe Secret/Restricted Key
    File: src/App.jsx:23
    Remediation: Use sk_test_ in dev. Store sk_live_ in server env

  COMMIT BLOCKED — Remove secrets before committing!
```

### Build for production

```bash
npm run build
```

### Lint the codebase

```bash
npm run lint
```

---

## Quality Gates

The agent enforces five sequential gates before any commit reaches the remote:

| #  | Gate              | Trigger         | Failure Behavior             |
|----|-------------------|-----------------|------------------------------|
| 1  | Security Gate     | `pre-commit`    | `process.exit(1)` — blocks commit |
| 2  | Dependency Gate   | Agent scan      | Flags unused packages for removal |
| 3  | Refactor Engine   | Agent scan      | Auto-migrates React 18 → 19 syntax |
| 4  | Docs Engine       | Post-refactor   | Appends to `API_DOCUMENTATION.md`  |
| 5  | Commit Engine     | Pre-push        | Rewrites message to Conventional Commits |

---

## Security Scanner — Rules Reference

The scanner ships with **23 rules** across **9 categories**. Each rule includes a unique ID, regex pattern, severity level, and actionable remediation guidance.

### Severity Levels

| Level    | Action                  | Exit Code |
|----------|-------------------------|-----------|
| CRITICAL | Blocks commit immediately | 1       |
| HIGH     | Strong warning, should fix | 1       |
| MEDIUM   | Advisory, does not block | 0        |

### Rule Categories

| Category         | Rule Count | Example Patterns                              |
|------------------|------------|-----------------------------------------------|
| Google Cloud     | 4          | `AIzaSy...`, `GOCSPX-...`, Service Account    |
| AWS              | 2          | `AKIA...`, `aws_secret_access_key`             |
| AI Services      | 3          | `sk-proj-...`, `sk-ant-...`                    |
| Payment          | 2          | `sk_live_...` / `rk_live_...`, `pk_live_...`   |
| Communication    | 3          | Twilio `SK...`, SendGrid `SG....`, Slack `xox...` |
| Version Control  | 3          | `ghp_...`, `github_pat_...`, `glpat-...`       |
| Database         | 1          | `mongodb://`, `postgres://`, `redis://`        |
| Authentication   | 2          | JWT tokens, `-----BEGIN PRIVATE KEY-----`      |
| Generic          | 3          | Hardcoded secrets, `.env` leaks, IP addresses  |

Full rule definitions with regex patterns are in [`security_rules.md`](./security_rules.md).

---

## CI/CD Pipeline

Defined in [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml). Triggered on push or PR to `main`.

```
quality-gates (ubuntu-latest)
  ├── Checkout
  ├── Setup Node.js 20
  ├── npm ci
  ├── Security Scan (node security-scanner.js)
  ├── Lint (npm run lint)
  └── Build (npm run build)

deploy (depends on quality-gates, push to main only)
  ├── Checkout
  ├── Setup Node.js 20
  ├── npm ci
  ├── Build production bundle
  └── Deploy to Vercel (amondnet/vercel-action@v25)
```

---

## Environment Variables

The project requires the following secrets configured in **GitHub Repository Settings > Secrets**:

| Variable             | Required | Description                       |
|----------------------|----------|-----------------------------------|
| `VERCEL_TOKEN`       | Yes      | Vercel personal access token      |
| `VERCEL_ORG_ID`      | Yes      | Vercel organization/team ID       |
| `VERCEL_PROJECT_ID`  | Yes      | Vercel project ID                 |

For local development, create a `.env` file based on the example below:

```bash
# .env.example
VITE_GOOGLE_API_KEY=your_google_api_key_here
VITE_OPENAI_KEY=your_openai_key_here
VITE_STRIPE_SECRET=your_stripe_key_here
VITE_DATABASE_URL=your_database_url_here
VITE_GITHUB_TOKEN=your_github_pat_here
```

> **Important:** Never commit `.env` files. The `.gitignore` is pre-configured to exclude them.

---

## Project Rules (Agent Brain)

The agent operates under a strict rule engine defined in [`project_rules.md`](./project_rules.md). Key constraints:

1. **Dependency Lock** — No new packages may be added without explicit approval. Unused packages must be flagged and removed.
2. **Conventional Commits** — All commit messages must follow the `<type>(<scope>): <description>` format.
3. **Append-Only Docs** — Documentation files (`*.md`) must never be overwritten. New content is appended with a timestamp.
4. **Zero Hardcoded Secrets** — All credentials must reside in environment variables.
5. **React Modernization** — `forwardRef` → ref-as-prop, `useContext()` → `use()`, `<Context.Provider>` → `<Context>`.

---

## Intentional Traps (Demo Purposes)

This project contains deliberate issues to demonstrate the agent's detection capabilities:

| Trap                     | Location                          | Gate Triggered   |
|--------------------------|-----------------------------------|------------------|
| Unused `lodash` dependency | `package.json`                  | Dependency Gate  |
| `forwardRef` + `useContext` | `src/components/UserProfile.jsx` | Refactor Engine |
| 8 hardcoded API keys     | `src/App.jsx`                     | Security Gate    |

These traps are safe — all keys are fake/demo values that do not grant access to any real service.

---

## ROI Metrics

| Metric                    | Before  | After   | Improvement |
|---------------------------|---------|---------|-------------|
| Review cycle time         | 30 min  | 2 min   | **93.3%**   |
| Leaked secrets per month  | ~5      | 0       | **100%**    |
| API documentation         | Manual  | Auto    | —           |
| Commit message compliance | ~40%    | 100%    | **+60pp**   |

---

## License

This project was built for the **Unbound Creativity with TRAE SOLO @ Vietnam** hackathon and is provided as-is for demonstration purposes.
