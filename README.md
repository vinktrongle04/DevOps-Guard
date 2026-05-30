<div align="center">

# 🛡️ DevOps-Guard

**Autonomous DevSecOps Governance Platform with AI Knowledge Graph**

*Powered by TRAE SOLO — Unbound Creativity Hackathon 2026 @ Vietnam*

[![CI](https://github.com/vinktrongle04/DevOps-Guard/actions/workflows/deploy.yml/badge.svg)](https://github.com/vinktrongle04/DevOps-Guard/actions)
![Version](https://img.shields.io/badge/Scanner-v3.1-6366f1)
![Knowledge Graph](https://img.shields.io/badge/Knowledge%20Graph-Enabled-8b5cf6)
![Standards](https://img.shields.io/badge/Compliance-OWASP%20%7C%20ISO%2027001%20%7C%20SOC%202%20%7C%20PCI--DSS%20%7C%20HIPAA-22c55e)
![License](https://img.shields.io/badge/License-MIT-f59e0b)

</div>

---

## What is DevOps-Guard?

DevOps-Guard transforms the TRAE SOLO editor into an **autonomous CI/CD governance brain**. 

Most security tools (Snyk, GitGuardian, SonarQube) operate *after* code is committed to a repository—when it's already too late. DevOps-Guard uses a **Shift-Left** approach, enforcing strict Quality Gates *before* the commit happens on the developer's local machine. 

Furthermore, it builds a self-updating **Knowledge Graph** of your project's security posture, allowing AI agents to intelligently navigate the codebase, understand compliance risks, and auto-remediate violations.

---

## The Architecture

DevOps-Guard operates in three core layers:

### 1. The Execution Layer (5 Quality Gates)
A Git `pre-commit` hook that automatically runs before every commit:
- **Gate 1: Security Scanner** (28 rules mapped to OWASP, PCI-DSS, SOC 2, HIPAA). Hard blocks on `CRITICAL` or `HIGH` violations.
- **Gate 2: Dependency Scanner** (Detects bloat and unused packages).
- **Gate 3: Refactor** (Auto-upgrades legacy code).
- **Gate 4: Docs** (Auto-generates API documentation).
- **Gate 5: Commit** (Auto-formats conventional commit messages).

### 2. The Intelligence Layer (Knowledge Base & Graph)
Instead of just printing errors to the terminal, DevOps-Guard ingests scan results into a permanent `kb/` directory:
- **Level 1 (Structured JSON):** `project-state.json`, `event-log.jsonl`. Captures a snapshot of project health and telemetry.
- **Level 2 (Knowledge Graph):** `knowledge-graph.json`. A relational graph connecting files, violations, rules, and compliance standards (160+ nodes, 260+ edges). 

### 3. The Orchestration Layer (AI Agent Context)
TRAE reads the generated `docs/core-rules/PROJECT_STATE.md` to understand the project's real-time state. When a developer asks TRAE to *"fix security issues"*, TRAE queries the Knowledge Graph to prioritize fixes that maximize compliance impact.

---

## Knowledge Graph Query Engine

You can interact with the Knowledge Graph directly via CLI to answer complex security questions:

```bash
# First, update the Knowledge Base & Graph
npm run knowledge:update

# Q: Which files are the most dangerous?
npm run kb:ask -- files-by-risk

# Q: What is the compliance impact of fixing a specific file?
npm run kb:ask -- fix-impact --file src/App.jsx

# Q: How exposed are we to a specific compliance framework?
npm run kb:ask -- compliance-exposure --framework PCI-DSS

# Q: Which security rule is violated the most?
npm run kb:ask -- rule-coverage
```

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/vinktrongle04/DevOps-Guard.git
cd DevOps-Guard

# 2. Install dependencies (auto-installs Husky git hooks)
npm install

# 3. Run full pipeline to generate Knowledge Graph and UI data
npm run knowledge:update

# 4. Start the interactive UI Dashboard
npm run dev
# → Open http://localhost:5173
```

---

## Project Structure

```
DevOps-Guard/
├── kb/                         # 🧠 The Knowledge Base
│   ├── project-state.json      # Level 1: Structured health state
│   ├── event-log.jsonl         # Level 1: Historical scan events
│   ├── kb-index.json           # Level 1: Fast lookup indexes
│   └── knowledge-graph.json    # Level 2: Graph of violations, rules, files
├── docs/core-rules/            # 🤖 AI Agent Context
│   ├── AGENT_CONTEXT.md        # Routing map for TRAE
│   ├── project_rules.md        # Pipeline order + behaviors
│   ├── security_rules.md       # 28 rules mapped to ISO/SOC2/PCI-DSS/HIPAA
│   └── PROJECT_STATE.md        # Auto-generated summary from KB
├── public/                     # 📊 Dashboard Data
│   ├── scan-report.json        # Live scanner output
│   └── scan-history.json       # Telemetry for trend charts
├── security-scanner.js         # Gate 1: Security engine
├── dependency-scanner.js       # Gate 2: Dependency engine
├── scanner-output.js           # KB Level 1 builder
├── graph-builder.js            # KB Level 2 (Graph) builder
├── graph-query.js              # Graph CLI query engine
└── kb-summary.js               # PROJECT_STATE.md generator
```

---

## NPM Scripts Reference

| Script | Description |
|---|---|
| `npm run knowledge:update` | **Core:** Run scans, build KB, build Graph, generate Markdown |
| `npm run kb:ask -- <query>` | Query the Knowledge Graph (e.g. `files-by-risk`, `summary`) |
| `npm run security:scan` | Gate 1: Scan for secrets & vulnerabilities (Terminal) |
| `npm run dep:scan` | Gate 2: Scan for bloated/unused dependencies (Terminal) |
| `npm run fix:dry` | Preview auto-fixable violations without modifying files |
| `npm run dev` | Open the UI Dashboard (React, Vite) |
| `npm run build` | Build the UI Dashboard for production |

---

## CI/CD Portability

DevOps-Guard is not locked to local environments. It outputs industry-standard formats for traditional CI/CD pipelines:

```bash
# Machine-readable JSON → Jenkins / GitLab CI / Splunk
npm run security:json > report.json

# SARIF 2.1.0 → GitHub Code Scanning / Azure DevOps
npm run security:sarif > results.sarif
```

---

## License

MIT © 2026 DevOps-Guard Team — Unbound Creativity Hackathon
