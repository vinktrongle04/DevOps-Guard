# 📜 DevOps-Guard — Project Rules (Rule Engine)
# ==============================================
# File này định nghĩa bộ quy tắc "não bộ" cho Tác tử DevOps-Guard.
# Mọi hành động tự động của agent đều phải tuân thủ các quy tắc dưới đây.

---

## 1. 🚫 QUY TẮC CẤM THÊM THƯ VIỆN MỚI (Dependency Lock)

- **KHÔNG ĐƯỢC** thêm bất kỳ thư viện mới nào vào `dependencies` hoặc `devDependencies` trong `package.json` mà không có sự phê duyệt rõ ràng từ Tech Lead.
- **CHỈ ĐƯỢC** sử dụng các thư viện đã tồn tại trong `package.json` hiện tại.
- Nếu phát hiện thư viện nào được khai báo nhưng **không được import** trong bất kỳ file mã nguồn nào → Đánh dấu là **"Thư viện rác"** và đề xuất gỡ bỏ.
- Lệnh cấm: `npm install`, `yarn add`, `pnpm add` chỉ được thực thi sau khi có phê duyệt.

---

## 2. 📝 QUY TẮC CONVENTIONAL COMMITS (Commit Message Standard)

Mọi commit message **BẮT BUỘC** phải tuân theo chuẩn [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Các type hợp lệ:
| Type       | Mô tả                                           |
|------------|--------------------------------------------------|
| `feat`     | Tính năng mới                                    |
| `fix`      | Sửa lỗi                                         |
| `docs`     | Thay đổi tài liệu                                |
| `style`    | Thay đổi format (không ảnh hưởng logic)          |
| `refactor` | Tái cấu trúc code (không thêm feature/fix bug)  |
| `perf`     | Cải thiện hiệu năng                              |
| `test`     | Thêm/sửa test                                    |
| `chore`    | Công việc bảo trì (build, CI, deps)              |
| `security` | Sửa lỗi bảo mật                                 |

### Ví dụ:
```
feat(auth): thêm xác thực hai yếu tố cho trang đăng nhập

- Tích hợp TOTP qua thư viện otplib
- Thêm QR code generator cho setup ban đầu
- Cập nhật UI form đăng nhập

Closes #142
```

---

## 3. 🔒 QUY TẮC "DO NOT OVERWRITE" — Chỉ Append (Immutable Docs)

> **QUAN TRỌNG**: Đây là quy tắc ưu tiên cao nhất!

- Đối với các file tài liệu (`.md`, `.txt`, `.log`):
  - **KHÔNG ĐƯỢC** ghi đè (overwrite) nội dung hiện có.
  - **CHỈ ĐƯỢC** thêm nội dung mới vào **cuối file** (append-only).
  - Mỗi lần cập nhật phải kèm **timestamp** theo format: `[YYYY-MM-DD HH:mm:ss]`.
  
- Đặc biệt áp dụng cho:
  - `API_DOCUMENTATION.md` — Tài liệu API tự sinh
  - `CHANGELOG.md` — Nhật ký thay đổi
  - `SECURITY_AUDIT.md` — Báo cáo kiểm tra bảo mật

### Ví dụ append hợp lệ:
```markdown
---
## [2026-05-23 23:30:00] — Cập nhật bởi DevOps-Guard Agent

### Endpoint mới: POST /api/v2/users
- Method: POST
- Auth: Bearer Token required
- Body: { name: string, email: string }
- Response: 201 Created
```

---

## 4. 🛡️ QUY TẮC BẢO MẬT (Security Rules)

- **TUYỆT ĐỐI CẤM** hardcode bất kỳ giá trị bí mật nào trong mã nguồn:
  - API Keys, Secret Keys, Tokens
  - Passwords, Database connection strings  
  - Private keys, Certificates
- Tất cả secrets phải được lưu trong biến môi trường (`.env`) và KHÔNG được commit `.env` lên repository.
- File `.gitignore` phải chứa: `.env`, `.env.local`, `.env.*.local`

---

## 5. ⚛️ QUY TẮC REFACTOR REACT (React Modernization)

Khi phát hiện cú pháp React 18 cũ, agent phải tự động refactor:

| React 18 (Cũ)                     | React 19 (Mới)                        |
|------------------------------------|---------------------------------------|
| `forwardRef((props, ref) => ...)` | `function Component({ ref, ...props })` |
| `useContext(SomeContext)`          | `use(SomeContext)`                     |
| `<Context.Provider value={...}>`   | `<Context value={...}>`               |

---

## 6. 📊 QUY TẮC TÀI LIỆU TỰ ĐỘNG (Auto Documentation)

- Sau mỗi lần refactor hoặc thêm feature, agent phải tự động cập nhật `API_DOCUMENTATION.md`.
- Format tài liệu phải theo chuẩn Markdown với các section rõ ràng.
- Tuân thủ quy tắc **DO NOT OVERWRITE** — chỉ append.

---

*File này được quản lý bởi DevOps-Guard Agent. Cập nhật lần cuối: 2026-05-23*
