<div align="center">

# 🛡️ DevOps-Guard

**Autonomous DevSecOps Governance Platform with AI Knowledge Graph**

[![CI](https://github.com/vinktrongle04/DevOps-Guard/actions/workflows/deploy.yml/badge.svg)](https://github.com/vinktrongle04/DevOps-Guard/actions)
![Version](https://img.shields.io/badge/Scanner-v3.1-6366f1)
![Knowledge Graph](https://img.shields.io/badge/Knowledge%20Graph-Enabled-8b5cf6)
![Standards](https://img.shields.io/badge/Compliance-OWASP%20%7C%20ISO%2027001%20%7C%20SOC%202%20%7C%20PCI--DSS%20%7C%20HIPAA-22c55e)
![License](https://img.shields.io/badge/License-MIT-f59e0b)

</div>

---

## What is DevOps-Guard?

DevOps-Guard is an **autonomous CI/CD governance brain** built as a monorepo. 

Most security tools (Snyk, GitGuardian, SonarQube) operate *after* code is committed to a repository—when it's already too late. DevOps-Guard uses a **Shift-Left** approach, enforcing strict Quality Gates *before* the commit happens on the developer's local machine via Git hooks.

Furthermore, it builds a self-updating **Knowledge Graph** of your project's security posture, allowing AI agents to intelligently navigate the codebase, understand compliance risks, and auto-remediate violations.

---

## The Architecture

DevOps-Guard operates in three core layers:

### 1. The Execution Layer (Quality Gates)
A Git `pre-commit` hook that automatically runs before every commit:
- **Gate 1: Security Scanner** (28 rules mapped to OWASP, PCI-DSS, SOC 2, HIPAA). Hard blocks on `CRITICAL` or `HIGH` violations.
- **Gate 2: Dependency Scanner** (Detects bloat, unused, and missing packages).
- *(Future Gates: Refactor, Docs, Commit)*

### 2. The Intelligence Layer (Knowledge Base)
Instead of just printing errors to the terminal, DevOps-Guard ingests scan results into a permanent state machine:
- **Structured JSON & Event Logs:** Captures a snapshot of project health and telemetry.
- **Knowledge Graph:** A relational graph connecting files, violations, rules, and compliance standards.

### 3. The Visualization Layer (Dashboard)
A modern React + Vite dashboard that provides real-time visibility into the project's security posture, knowledge graph, and historical trends.

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/vinktrongle04/DevOps-Guard.git
cd DevOps-Guard

# 2. Install dependencies (auto-installs Husky git hooks)
npm install

# 3. Run full pipeline to generate Knowledge Graph and UI data
npm run all
npm run kb

# 4. Start the interactive UI Dashboard
npm run dev
# 🚀 Open http://localhost:5173
```

---

## Project Structure

DevOps-Guard is structured as an NPM workspaces monorepo:

```
DevOps-Guard/
├── packages/
│   └── core/                      # 📦 NPM Package "devops-guard"
│       ├── package.json           # CLI bin: { "devops-guard": "cli.js" }
│       └── src/
│           ├── cli.js             # Unified CLI entry point
│           ├── index.js           # Public JS API
│           ├── scanner/           # Security & Dependency scanners
│           ├── fixer/             # Auto-remediation engine
│           └── knowledge/         # Graph & KB builders
│
├── dashboard/                     # 📊 React+Vite UI (frontend)
│   ├── package.json
│   └── src/                       # Dashboard components
│
└── package.json                   # Workspace root
```

---

## CLI Commands

The `devops-guard` CLI is the core interaction layer.

| Command | Description |
|---|---|
| `devops-guard scan` | **Gate 1:** Scan for secrets & vulnerabilities |
| `devops-guard dep` | **Gate 2:** Scan for bloated/unused dependencies |
| `devops-guard kb` | Build KB, Knowledge Graph, and Markdown summary |
| `devops-guard fix --apply` | Apply auto-remediation to violations |
| `devops-guard all` | Run all gates sequentially |

*If you are running from the workspace root via npm, you can use `npm run scan`, `npm run dep`, etc.*

---

## CI/CD Portability

DevOps-Guard is not locked to local environments. It outputs industry-standard formats for traditional CI/CD pipelines:

```bash
# Machine-readable JSON ➡️ Jenkins / GitLab CI / Splunk
devops-guard scan --json > report.json

# SARIF 2.1.0 ➡️ GitHub Code Scanning / Azure DevOps
devops-guard scan --sarif > results.sarif
```

---

## License

MIT © 2026 DevOps-Guard
