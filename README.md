# 🛡️ DevOps-Guard — Demo Project

> **Cuộc thi**: Unbound Creativity with TRAE SOLO @ Vietnam  
> **Mô tả**: Trợ lý Quản trị Git và DevOps tự trị — hoạt động ngầm ngay trong TRAE SOLO

---

## 🎯 Vấn đề giải quyết

Lập trình viên thường:
- 😴 **Lười viết tài liệu** API (API Docs)
- 💩 **Commit sơ sài** không theo chuẩn
- 🔓 **Lộ API Key** trong mã nguồn
- 📦 **Thư viện rác** không sử dụng nhưng vẫn tồn tại

## 🚀 Giải pháp: DevOps-Guard Agent

Tác tử tự động quét và xử lý **5 Quality Gates** trước mỗi lần commit:

| Gate | Chức năng | Trạng thái |
|------|-----------|------------|
| 🔐 Security Gate | Quét rò rỉ API keys & secrets | ✅ Active |
| 📦 Dependency Gate | Phát hiện & gỡ thư viện rác | ✅ Active |
| ⚛️ Refactor Engine | Nâng cấp React 18 → 19 | ✅ Active |
| 📝 Docs Engine | Auto-generate API docs | ✅ Active |
| 📋 Commit Engine | Conventional Commits | ✅ Active |

## 🏗️ Cấu trúc dự án

```
DevOps-Guard/
├── .github/workflows/
│   └── deploy.yml          # CI/CD Pipeline (GitHub Actions → Vercel)
├── .husky/
│   └── pre-commit          # Husky hook → Security Scanner
├── src/
│   ├── components/
│   │   └── UserProfile.jsx # 🪤 Bẫy: React 18 cũ (forwardRef + useContext)
│   ├── App.jsx             # 🪤 Bẫy: API Key lộ thiên
│   ├── App.css
│   ├── index.css
│   └── main.jsx
├── security-scanner.js     # 🛡️ Security Gate scanner
├── project_rules.md        # 📜 Rule Engine (não bộ tác tử)
├── API_DOCUMENTATION.md    # 📖 Tài liệu tự sinh (append-only)
├── package.json            # 🪤 Bẫy: lodash không được import
└── vite.config.js
```

## 📊 Mục tiêu ROI

| Metric | Trước | Sau | Cải thiện |
|--------|-------|-----|-----------|
| Thời gian quy trình | 30 phút | 2 phút | **93.3%** |
| Lỗi bảo mật lọt lưới | ~5/tháng | 0 | **100%** |
| Tài liệu API | Thủ công | Tự động | **∞** |

---

## 🛠️ Cài đặt & Chạy

```bash
# Cài đặt dependencies
npm install

# Chạy dev server
npm run dev

# Chạy security scanner
npm run security:scan
```

---

*Powered by DevOps-Guard Agent — Cuộc thi Unbound Creativity with TRAE SOLO @ Vietnam 2026*
