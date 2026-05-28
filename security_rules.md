# DevOps-Guard — Security Rules Reference
# ============================================================
# Standardized security rule definitions for the agent (v3.0)
# The agent MUST reference this file when scanning, analyzing,
# and auto-remediating security violations in source code.
# Last updated: 2026-05-28

---

## Overview

| Metric | Value |
|--------|-------|
| Total rules | 30 |
| Categories | 11 |
| OWASP Top 10 (2021) mapped | Yes |
| Severity levels | CRITICAL / HIGH / MEDIUM / LOW |
| Hard-block threshold | Any CRITICAL or HIGH violation → `exit(1)` |

---

## OWASP Top 10 (2021) Mapping

All rules in this document are mapped to the [OWASP Top 10 2021](https://owasp.org/Top10/) standard:

| OWASP ID | Category Name | Mapped Rules |
|----------|---------------|--------------|
| A02 | Cryptographic Failures | GOOG-001..004, AWS-001..002, AI-001..003, PAY-001..002, VCS-001..003, DB-001, AUTH-001..002, GEN-001..003 |
| A03 | Injection (XSS) | XSS-001, XSS-002, XSS-003 |
| A05 | Security Misconfiguration | ENV-001 (VITE_ server secrets), GEN-002 |
| A07 | Identification & Auth Failures | AUTH-001, AUTH-002, GEN-001 |
| A09 | Security Logging Failures | LOG-001 (console.log in production) |

---

## Severity Reference

| Level | Symbol | Behavior | Exit Code |
|-------|--------|----------|-----------|
| CRITICAL | 🔴 | Blocks commit immediately | 1 |
| HIGH | 🟠 | Blocks commit immediately | 1 |
| MEDIUM | 🟡 | Warning logged, commit allowed | 0 |
| LOW | 🟢 | Advisory only, no interruption | 0 |

---

## Category 1 — Google Cloud (4 rules)

| Rule ID | Severity | Name | Regex Pattern |
|---------|----------|------|---------------|
| GOOG-001 | 🔴 CRITICAL | Google API Key | `AIzaSy[0-9A-Za-z_-]{33}` |
| GOOG-002 | 🟠 HIGH | Firebase Config Value | `firebase[A-Za-z]*\s*[:=]\s*["'][A-Za-z0-9_-]{20,}["']` |
| GOOG-003 | 🔴 CRITICAL | Google OAuth Client Secret | `GOCSPX-[A-Za-z0-9_-]{28,}` |
| GOOG-004 | 🔴 CRITICAL | Google Service Account Key | `"type"\s*:\s*"service_account"` |

**OWASP:** A02 — Cryptographic Failures

**Remediation:** Move to server-side environment variables. Never expose in client bundles. Use `VITE_` prefix only for non-sensitive public config (e.g., Maps public key with domain restriction).

---

## Category 2 — AWS (2 rules)

| Rule ID | Severity | Name | Regex Pattern |
|---------|----------|------|---------------|
| AWS-001 | 🔴 CRITICAL | AWS Access Key ID | `AKIA[0-9A-Z]{16}` |
| AWS-002 | 🔴 CRITICAL | AWS Secret Access Key | `aws_secret_access_key\s*[:=]\s*["']?[A-Za-z0-9/+=]{40}` |

**OWASP:** A02 — Cryptographic Failures

**Remediation:** Use AWS IAM Roles with least-privilege policy. Store keys in AWS Secrets Manager or Parameter Store. Rotate immediately if exposed.

---

## Category 3 — AI Services (3 rules)

| Rule ID | Severity | Name | Regex Pattern |
|---------|----------|------|---------------|
| AI-001 | 🔴 CRITICAL | OpenAI API Key | `sk-proj-[A-Za-z0-9]{20,}` |
| AI-002 | 🔴 CRITICAL | OpenAI Legacy Key | `sk-[A-Za-z0-9]{48}` |
| AI-003 | 🔴 CRITICAL | Anthropic API Key | `sk-ant-[A-Za-z0-9_-]{40,}` |

**OWASP:** A02 — Cryptographic Failures

**Remediation:** Store in server-side env var (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`). Set usage limits and billing alerts. Never prefix with `VITE_`.

---

## Category 4 — Payment (2 rules)

| Rule ID | Severity | Name | Regex Pattern |
|---------|----------|------|---------------|
| PAY-001 | 🔴 CRITICAL | Stripe Secret/Restricted Key | `(?:sk_live_\|rk_live_)[0-9a-zA-Z_]{20,}` |
| PAY-002 | 🟡 MEDIUM | Stripe Publishable Key (Live) | `pk_live_[0-9a-zA-Z]{24,}` |

**OWASP:** A02 — Cryptographic Failures

**Remediation:** `sk_live_` must live in server-side env only. `pk_live_` may use `VITE_STRIPE_PUBLISHABLE_KEY` but must be domain-restricted in Stripe Dashboard. Never use `sk_test_` in production.

---

## Category 5 — Communication Services (3 rules)

| Rule ID | Severity | Name | Regex Pattern |
|---------|----------|------|---------------|
| COM-001 | 🟠 HIGH | Twilio API Key | `SK[0-9a-fA-F]{32}` |
| COM-002 | 🟠 HIGH | SendGrid API Key | `SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}` |
| COM-003 | 🟠 HIGH | Slack Bot/Webhook Token | `xox[baprs]-[0-9A-Za-z-]{10,}` |

**OWASP:** A02 — Cryptographic Failures

**Remediation:** Store in server-side env vars (`TWILIO_API_KEY`, `SENDGRID_API_KEY`, `SLACK_BOT_TOKEN`). Never prefix with `VITE_`.

---

## Category 6 — Version Control (3 rules)

| Rule ID | Severity | Name | Regex Pattern |
|---------|----------|------|---------------|
| VCS-001 | 🔴 CRITICAL | GitHub PAT | `(?:ghp_\|github_pat_)[A-Za-z0-9_]{20,}` |
| VCS-002 | 🟠 HIGH | GitHub OAuth Token | `gho_[A-Za-z0-9]{36}` |
| VCS-003 | 🔴 CRITICAL | GitLab Token | `glpat-[A-Za-z0-9_-]{20,}` |

**OWASP:** A02 — Cryptographic Failures

**Remediation:** Use fine-grained PATs with minimal scope. Store in GitHub/GitLab Secrets for CI. Rotate immediately if exposed. Never prefix with `VITE_`.

---

## Category 7 — Database (1 rule)

| Rule ID | Severity | Name | Regex Pattern |
|---------|----------|------|---------------|
| DB-001 | 🔴 CRITICAL | Database Connection String | `(?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|redis)://[^\s"']{10,}` |

**OWASP:** A02 — Cryptographic Failures

**Remediation:** Store in `DATABASE_URL` env var. Use connection pooling. Never prefix with `VITE_` — database URLs must never reach the browser.

---

## Category 8 — Authentication (2 rules)

| Rule ID | Severity | Name | Regex Pattern |
|---------|----------|------|---------------|
| AUTH-001 | 🟠 HIGH | Hardcoded JWT Token | `eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}` |
| AUTH-002 | 🔴 CRITICAL | Private Key Block | `-----BEGIN\s+(RSA\|EC\|DSA\|OPENSSH)?\s*PRIVATE KEY-----` |

**OWASP:** A07 — Identification and Authentication Failures

**Remediation:** JWTs must be generated at runtime from a secret signing key. Private keys must be stored in a secrets vault (HashiCorp Vault, AWS KMS). Never commit to repository.

---

## Category 9 — Generic Secrets (3 rules)

| Rule ID | Severity | Name | Regex Pattern |
|---------|----------|------|---------------|
| GEN-001 | 🟠 HIGH | Hardcoded Secret/Password | `(?:secret\|token\|password\|api_key\|access_key)\s*[:=]\s*["'][^"']{8,}["']` |
| GEN-002 | 🔴 CRITICAL | Env File Committed | `^(?:DB_PASSWORD\|SECRET_KEY\|API_SECRET\|PRIVATE_KEY)\s*=\s*.{3,}` |
| GEN-003 | 🟡 MEDIUM | Hardcoded IP with Port | `(?:\d{1,3}\.){3}\d{1,3}:\d{2,5}` |

**OWASP:** A02 — Cryptographic Failures / A05 — Security Misconfiguration

**Remediation:** Move all secrets to `.env`. Add `.env` to `.gitignore`. Use `import.meta.env.VITE_*` for public client config only.

---

## Category 10 — Environment Variable Misconfiguration (1 rule) ← NEW

| Rule ID | Severity | Name | Regex Pattern |
|---------|----------|------|---------------|
| ENV-001 | 🟠 HIGH | VITE_ Prefix on Server Secret | `VITE_(?:SECRET\|KEY\|PASSWORD\|TOKEN\|DATABASE\|PRIVATE\|API)[A-Z_]*\s*=` |

**OWASP:** A05 — Security Misconfiguration

**Description:** Variables prefixed with `VITE_` are statically embedded into the client-side JavaScript bundle by Vite at build time. Any secret using this prefix is **publicly readable** in the browser via DevTools → Sources or by downloading the JS bundle.

**Rule:**
```
✅ VITE_GOOGLE_MAPS_KEY        → Public key, safe for browser
✅ VITE_APP_VERSION            → Non-sensitive config, safe
✅ VITE_STRIPE_PUBLISHABLE_KEY → Public key (with domain restriction)

❌ VITE_OPENAI_API_KEY         → Server secret — FORBIDDEN
❌ VITE_DATABASE_URL           → Server credential — FORBIDDEN
❌ VITE_STRIPE_SECRET_KEY      → Server secret — FORBIDDEN
❌ VITE_PRIVATE_KEY            → Private key — FORBIDDEN
```

**Remediation:** Remove `VITE_` prefix. Access via `process.env.VAR_NAME` in server-side code (Node, API routes, serverless functions).

---

## Category 11 — XSS / Injection Vulnerabilities (3 rules) ← NEW

**OWASP:** A03 — Injection (Cross-Site Scripting)

| Rule ID | Severity | Name | Regex Pattern |
|---------|----------|------|---------------|
| XSS-001 | 🟠 HIGH | React dangerouslySetInnerHTML | `dangerouslySetInnerHTML\s*=\s*\{\{` |
| XSS-002 | 🟠 HIGH | Direct DOM Manipulation | `\.innerHTML\s*=\|document\.write\s*\(` |
| XSS-003 | 🔴 CRITICAL | eval() / Function() Injection | `\beval\s*\(\|new\s+Function\s*\(` |

### XSS-001 — React dangerouslySetInnerHTML

React's `dangerouslySetInnerHTML` bypasses React's DOM sanitization. If the value contains user input, it enables stored or reflected XSS.

```jsx
// ❌ VULNERABLE — user content rendered as raw HTML
<div dangerouslySetInnerHTML={{ __html: userComment }} />

// ✅ SAFE — use a sanitizer library first
import DOMPurify from 'dompurify'
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userComment) }} />

// ✅ PREFERRED — render as text, let React escape it
<div>{userComment}</div>
```

### XSS-002 — Direct DOM Manipulation

Direct assignment to `innerHTML` or `document.write()` bypasses the browser's XSS defenses.

```js
// ❌ VULNERABLE
element.innerHTML = userData
document.write('<script>' + userData + '</script>')

// ✅ SAFE
element.textContent = userData
```

### XSS-003 — eval() / new Function()

`eval()` and `new Function(string)` execute arbitrary code strings, enabling code injection attacks.

```js
// ❌ CRITICAL — never pass user input to eval
eval(userInput)
new Function('return ' + userExpression)()

// ✅ SAFE alternatives
JSON.parse(jsonString)       // for data parsing
// Use a proper expression evaluator library for math/formulas
```

---

## Category 12 — Security Logging (1 rule) ← NEW

| Rule ID | Severity | Name | Regex Pattern |
|---------|----------|------|---------------|
| LOG-001 | 🟢 LOW | console.log in Source | `console\.log\s*\(` |

**OWASP:** A09 — Security Logging and Monitoring Failures

**Description:** `console.log` statements left in production code can leak sensitive data (user objects, tokens, internal state) to the browser console and server logs. They also degrade performance.

**Rule:** Warn (do not block) on any `console.log` found outside of test files.

```js
// ❌ Should be removed before production
console.log('user data:', user)
console.log('token:', authToken)

// ✅ Use a proper logger with log levels
import { logger } from './utils/logger'
logger.debug('user loaded', { userId: user.id })  // stripped in production
```

> **Note:** `console.error` and `console.warn` are permitted — they are appropriate for runtime error reporting.

---

## Agent Remediation Workflow

When a violation is detected, the agent MUST:

```
1. STOP    → Do not allow the commit to proceed (for CRITICAL/HIGH)
2. REPORT  → Display: Rule ID, Severity, File:Line, description, fix suggestion
3. PROPOSE → Generate the corrected code snippet
4. VERIFY  → Re-run scanner on the patched file before marking as resolved
```

### Auto-fix template

```js
// BEFORE (violation)
const apiKey = "AIzaSyDFj3kLm9Qw2xRtBvN8HpO5YzA1cE7gX0a"

// AFTER (auto-fixed by agent)
const apiKey = import.meta.env.VITE_GOOGLE_API_KEY  // public key only
// OR for server secrets:
const apiKey = process.env.GOOGLE_API_KEY            // server-side only
```

### .env.example template (auto-generated by agent)

```env
# Public keys — safe for VITE_ prefix (bundled to client)
VITE_GOOGLE_MAPS_KEY=your_google_maps_public_key_here
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here

# Server secrets — MUST NOT use VITE_ prefix
OPENAI_API_KEY=your_openai_key_here
DATABASE_URL=your_database_url_here
STRIPE_SECRET_KEY=sk_test_your_key_here
GITHUB_TOKEN=your_github_pat_here
```

---

## Files That Must Always Be in .gitignore

```gitignore
# Environment secrets
.env
.env.local
.env.*.local
.env.development
.env.production
.env.staging

# Service account / credential files
*-service-account*.json
*credentials*.json
*-key.json

# Private keys and certificates
*.pem
*.key
*.p12
*.pfx

# IDE-specific secrets
.idea/dataSources/
.vscode/settings.json
```

---

*Security Rules v3.0 — DevOps-Guard Agent | Updated: 2026-05-28*
