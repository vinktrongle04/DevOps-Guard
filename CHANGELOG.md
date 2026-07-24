# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-07-24

Initial public open-source release.

### Changed
- Relaunched the project as an installable OSS tool rather than a hackathon demo.
  Unified versioning across the workspace (root, `devops-guard` core package, and
  the dashboard) to `1.0.0`.
- Removed the `DEMO_TRAPS` allowlist from the dependency scanner (Gate 2), which
  previously hid `mongodb`/`pg`/`redis` from the missing-dependency check.

### Removed
- Deleted demo/fixture files that were mixed into the real, shipped dashboard
  source tree (`dashboard/src/components/PaymentDemo.jsx`,
  `dashboard/src/config/database.js`, `dashboard/src/utils/auth.js`,
  `dashboard/src/services/apiClient.js`). One of them contained an actual
  syntax error that broke `eslint .`.

### Fixed
- Corrected the security scanner's advertised rule/category counts (27 active
  rules across 11 categories — `LOG-001` had been commented out, making the
  previous "28 rules / 12 categories" claim stale).
- Fixed corrupted (UTF-16-contaminated) lines in `.gitignore` and untracked
  generated runtime state under `.knowledge-base/` that should never have been
  committed.
- Added the missing `LICENSE` file (MIT) referenced by the README badge.
