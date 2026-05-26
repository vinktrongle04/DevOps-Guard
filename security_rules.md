# 🔐 DevOps-Guard — Security Rules Reference
# Bảng quy tắc bảo mật chuẩn hóa cho Agent (v2.0)
# =================================================
# File này là "brain" bảo mật cho Tác tử DevOps-Guard.
# Agent PHẢI tham chiếu file này khi quét, phân tích, và remediate code.

---

## 📋 TỔNG QUAN

- **Tổng số rules**: 25
- **Phân loại**: 9 categories
- **Mức độ**: CRITICAL / HIGH / MEDIUM / LOW
- **Hành vi**: Nếu phát hiện ≥1 vi phạm CRITICAL → `process.exit(1)` → chặn commit

---

## 🔴 SEVERITY: CRITICAL — Chặn commit ngay lập tức

| Rule ID  | Tên                            | Regex Pattern                                           | Category         |
|----------|--------------------------------|---------------------------------------------------------|------------------|
| GOOG-001 | Google API Key                 | `AIzaSy[0-9A-Za-z_-]{33}`                              | Google Cloud     |
| GOOG-003 | Google OAuth Client Secret     | `GOCSPX-[A-Za-z0-9_-]{28,}`                            | Google Cloud     |
| GOOG-004 | Google Service Account Key     | `"type"\s*:\s*"service_account"`                        | Google Cloud     |
| AWS-001  | AWS Access Key ID              | `AKIA[0-9A-Z]{16}`                                     | AWS              |
| AWS-002  | AWS Secret Access Key          | `aws_secret.*[:=]\s*["']?[A-Za-z0-9/+=]{40}`           | AWS              |
| AI-001   | OpenAI API Key                 | `sk-proj-[A-Za-z0-9]{20,}`                              | AI Services      |
| AI-002   | OpenAI Legacy Key              | `sk-[A-Za-z0-9]{48}`                                    | AI Services      |
| AI-003   | Anthropic API Key              | `sk-ant-[A-Za-z0-9_-]{40,}`                             | AI Services      |
| PAY-001  | Stripe Live Secret Key         | `sk_live_[0-9a-zA-Z]{24,}`                              | Payment          |
| VCS-001  | GitHub PAT                     | `ghp_[A-Za-z0-9]{36}`                                   | Version Control  |
| VCS-003  | GitLab Token                   | `glpat-[A-Za-z0-9_-]{20,}`                              | Version Control  |
| DB-001   | Database Connection String     | `(mongodb|postgres|mysql|redis)://[^\s"']{10,}`         | Database         |
| AUTH-002 | Private Key Block              | `-----BEGIN.*PRIVATE KEY-----`                           | Authentication   |
| GEN-002  | Environment Secrets Committed  | `^(DB_PASSWORD\|SECRET_KEY\|API_SECRET)=.{3,}`          | Generic          |

---

## 🟠 SEVERITY: HIGH — Cảnh báo mạnh, nên sửa trước khi commit

| Rule ID  | Tên                            | Regex Pattern                                           | Category         |
|----------|--------------------------------|---------------------------------------------------------|------------------|
| GOOG-002 | Firebase Config Value          | `firebase[A-Za-z]*\s*[:=]\s*["'][A-Za-z0-9_-]{20,}`    | Google Cloud     |
| COM-001  | Twilio API Key                 | `SK[0-9a-fA-F]{32}`                                     | Communication    |
| COM-002  | SendGrid API Key               | `SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}`             | Communication    |
| COM-003  | Slack Token                    | `xox[baprs]-[0-9A-Za-z-]{10,}`                          | Communication    |
| VCS-002  | GitHub OAuth Token             | `gho_[A-Za-z0-9]{36}`                                   | Version Control  |
| AUTH-001 | JWT Token                      | `eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+` | Authentication  |
| GEN-001  | Hardcoded Secret/Password      | `(secret\|token\|password\|api_key)[:=]\s*["'][^"']{8,}` | Generic         |

---

## 🟡 SEVERITY: MEDIUM — Cảnh báo, không chặn commit

| Rule ID  | Tên                            | Regex Pattern                                           | Category         |
|----------|--------------------------------|---------------------------------------------------------|------------------|
| PAY-002  | Stripe Publishable Key (Live)  | `pk_live_[0-9a-zA-Z]{24,}`                              | Payment          |
| GEN-003  | Hardcoded IP with Port         | `\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d{2,5}`          | Generic          |

---

## 🛡️ QUY TẮC HÀNH VI CHO AGENT

### Khi phát hiện vi phạm, Agent PHẢI:

1. **Dừng ngay** — không cho phép commit đi qua (`exit code 1`)
2. **Báo cáo chi tiết** — hiển thị:
   - Rule ID + Severity
   - File path + Line number
   - Đoạn code vi phạm (masked: chỉ hiện 24 ký tự đầu)
   - Mô tả rủi ro bằng tiếng Việt
   - Hướng dẫn khắc phục (remediation)
3. **Đề xuất fix tự động**:
   - Tạo file `.env.example` với placeholder
   - Thay thế hardcoded value bằng `process.env.VAR_NAME` hoặc `import.meta.env.VITE_VAR`
   - Cập nhật `.gitignore` để bao gồm `.env*`

### Remediation Template (Agent tự sinh):

```javascript
// ❌ TRƯỚC (vi phạm)
const apiKey = "AIzaSyDFj3kLm9Qw2xRtBvN8HpO5YzA1cE7gX0a"

// ✅ SAU (đã fix)
const apiKey = import.meta.env.VITE_GOOGLE_API_KEY
```

```env
# .env.example (Agent tạo tự động)
VITE_GOOGLE_API_KEY=your_google_api_key_here
VITE_OPENAI_KEY=your_openai_key_here
VITE_STRIPE_SECRET=your_stripe_key_here
VITE_DATABASE_URL=your_database_url_here
```

---

## 📁 CÁC FILE LUÔN PHẢI CÓ TRONG .gitignore

```gitignore
# Secrets & Environment
.env
.env.local
.env.*.local
.env.development
.env.production

# Service Account Keys
*-service-account*.json
*credentials*.json

# Private Keys
*.pem
*.key
*.p12
*.pfx

# IDE secrets
.idea/dataSources/
.vscode/settings.json
```

---

## 🔄 QUY TRÌNH XỬ LÝ KHI PHÁT HIỆN SECRET

```mermaid
graph TD
    A[Scan Source Code] -->|Match Pattern| B{Severity?}
    B -->|CRITICAL| C[🚫 Block Commit]
    B -->|HIGH| D[⚠️ Cảnh báo mạnh]
    B -->|MEDIUM| E[💡 Gợi ý sửa]
    C --> F[Hiển thị Remediation]
    D --> F
    E --> F
    F --> G[Agent tạo .env.example]
    G --> H[Agent thay thế hardcoded → env var]
    H --> I[Agent cập nhật .gitignore]
    I --> J[Re-scan để verify]
```

---

*Security Rules v2.0 — DevOps-Guard Agent | Cập nhật: 2026-05-26*
