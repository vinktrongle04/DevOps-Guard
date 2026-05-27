# 📋 DevOps-Guard — Kịch bản Demo Live (3 Phút)

> **Mục tiêu**: Demo mượt mà, không gặp lỗi, thể hiện rõ tính năng chặn lỗi (Husky) và Tự phục hồi (TRAE Agent).  
> **Người thực hiện**: M3 (DevOps/QA) hoặc người thuyết trình chính.

---

## Chuẩn bị trước khi Demo
1. Mở sẵn TRAE SOLO IDE.
2. Mở sẵn Terminal ở thư mục dự án `D:\Project\DevOps-Guard`.
3. Chạy sẵn `npm run dev` ở 1 tab để mở giao diện UI Dashboard cực ngầu.
4. Mở file `src/App.jsx` ra màn hình chính của IDE.

---

## 🎬 BƯỚC 1: Lập trình viên "bất cẩn" (45 giây)

**Thoại**: *"Bây giờ, hãy thử đóng vai một lập trình viên. Tôi vừa code xong tính năng và vô tình để quên Google API Key và Stripe Key trong mã nguồn. Tôi sẽ thử commit đoạn code này lên GitHub."*

**Hành động**:
1. Vào Terminal.
2. Gõ: `git add .`
3. Gõ: `git commit -m "update app"`

**Kết quả mong đợi**:
- Terminal hiển thị màu đỏ chót.
- Báo lỗi: `CRITICAL — Google API Key` ở Line 17.
- Dòng cuối: `🚫 COMMIT BỊ CHẶN — Xóa secrets trước khi commit!`

**Thoại**: *"Ngay lập tức, Gate số 1 (Security Scanner) chạy cục bộ đã chặn đứng hành động này. Mã nguồn bẩn chưa hề rời khỏi máy của tôi. Zero-day leak được ngăn chặn!"*

---

## 🎬 BƯỚC 2: Cầu cứu AI Agent (1 Phút)

**Thoại**: *"Thay vì phải tự đi dò từng lỗi, dọn dẹp thư viện rác, tôi chỉ việc gọi DevOps-Guard Agent ngay trong TRAE SOLO."*

**Hành động**:
1. Mở tab Chat của TRAE SOLO.
2. Gõ Prompt: 
   > *"Dọn dẹp các thư viện rác, xử lý API Key trong App.jsx, refactor ThemeContext lên React 19 và cập nhật tài liệu API cho tôi."*

**Kết quả mong đợi (Agent tự chạy)**:
- Agent phát hiện `lodash`, `axios` thừa → gỡ bỏ.
- Agent chuyển `apiKey` thành `import.meta.env.VITE_GOOGLE_API_KEY`.
- Agent đổi `<ThemeContext.Provider>` thành `<ThemeContext>` (React 19).
- Agent chèn đoạn docs mới vào cuối file `API_DOCUMENTATION.md`.

**Thoại**: *"Agent không chỉ dọn rác, mà nó hiểu chính xác chuẩn React 19 để refactor code, và quan trọng nhất là tuân thủ quy tắc 'Chỉ Append' khi ghi tài liệu, không đè docs cũ của team."*

---

## 🎬 BƯỚC 3: Commit thành công & Tự sinh Message (45 giây)

**Thoại**: *"Bây giờ code đã sạch. Tôi sẽ commit lại, nhưng lần này tôi lười viết commit message. Agent sẽ làm thay."*

**Hành động**:
1. Trong TRAE Chat, gõ: *"Sinh commit message cho các thay đổi vừa rồi."*
2. Agent trả về chuẩn Conventional Commits:
   ```
   security(core): remove hardcoded API keys
   refactor(context): migrate ThemeContext to React 19
   chore(deps): remove unused lodash and axios
   docs(api): append new endpoints
   ```
3. Copy message này, paste vào Terminal: `git commit -m "..."`
4. Lệnh chạy thành công! Hiển thị màu xanh: `✅ Tất cả Quality Gates đã pass! Commit được phép.`

**Thoại**: *"Commit thành công. Mã nguồn sạch sẽ, an toàn, chuẩn syntax, có docs đầy đủ. Từ 30 phút rà soát nay chỉ còn 3 phút với DevOps-Guard trên TRAE SOLO. Xin cảm ơn!"*
