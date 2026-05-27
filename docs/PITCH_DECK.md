# 📊 DevOps-Guard — Slide Pitch Deck Outline

> **Mục tiêu**: Trình bày ấn tượng trong 5-7 phút tại Hackathon.  
> **Key Message**: DevOps-Guard biến TRAE SOLO thành người gác cổng tự động, giải quyết triệt để "The Last Mile Problem" (Vùng chết trước khi commit).

---

## Slide 1: Title & Hook (15s)
- **Tiêu đề**: DevOps-Guard — Agentic Git & CI/CD Guard
- **Subtitle**: Ngăn chặn 100% rò rỉ bảo mật & tự động hóa Code Quality ngay tại máy Local bằng TRAE SOLO.
- **Hook**: "Các bạn có biết, năm ngoái có 12.8 triệu secrets bị lộ công khai trên GitHub? Chi phí trung bình cho mỗi vụ rò rỉ dữ liệu là 1.2 triệu USD. Tại sao điều này vẫn xảy ra dù chúng ta có CI/CD?"

## Slide 2: Vấn đề "The Last Mile" (Vùng Chết) (45s)
- **Visual**: Sơ đồ [Developer viết code] → ☠️ (Vùng chết) → [Push lên GitHub] → [CI/CD chạy]
- **Nội dung**: 
  - CI/CD thường chỉ chạy **SAU KHI** code đã được push lên server. Quá muộn! Nếu secret đã bị push, lịch sử Git đã lưu lại.
  - Developer lười dọn dẹp thư viện rác, lười nâng cấp syntax (React 18 vs 19), lười viết API Docs và commit message.
  - Hậu quả: Tech debt phình to, lộ lọt bảo mật, conflict khi merge.

## Slide 3: Giải pháp của chúng tôi — DevOps-Guard (45s)
- **Nội dung**: Đưa bảo mật và kiểm định về **TRƯỚC KHI COMMIT (Shift-Left)**.
- **Vai trò của TRAE**: TRAE SOLO không chỉ là công cụ code, mà trở thành **Trung tâm Điều phối (Central Hub)** điều hành 5 Quality Gates Tự Trị.
- **Visual**: Icon 5 Gates (Security 🔐, Dependency 📦, Refactor ⚛️, Docs 📝, Commit 📋).

## Slide 4: Kiến trúc Hệ thống (Event-Driven) (1 min)
- **Visual**: Sơ đồ kiến trúc (đã có trong `implementation_plan.md` Trụ cột 3).
- **Giải thích**: 
  1. Developer gõ `git commit`.
  2. Local Git Hook (Husky) bắt sự kiện, kích hoạt **Security Scanner**.
  3. Nếu an toàn → pass. Nếu có lỗi → block.
  4. TRAE Agent nhảy vào hỗ trợ: dọn rác, refactor, viết docs, sinh message.

## Slide 5: Gate 1 — Security Scanner V2.0 (45s)
- **Highlight**: Không phụ thuộc API bên ngoài, chạy Regex siêu tốc cục bộ.
- **Tính năng**: Quét 25 rules, 9 danh mục (Google, AWS, Stripe, JWT, Private Keys...).
- **Demo Screenshot**: Chụp màn hình Terminal khi báo đỏ "CRITICAL — Stripe Secret lộ thiên" và chặn commit.

## Slide 6: Gate 2 & 3 — Clean & Refactor Engine (45s)
- **Gate 2 (Dependency Bloat)**: Quét `package.json` và cross-check với `import` statements. Gỡ ngay thư viện rác (như `lodash`, `axios` không dùng tới).
- **Gate 3 (React 19)**: Tự động migrate `forwardRef` → `ref` prop, `useContext` → `use()`. Không cần Dev phải làm tay.

## Slide 7: Gate 4 & 5 — Docs & Commit Tự Động (45s)
- **Gate 4**: Nguyên tắc "DO NOT OVERWRITE" (Chỉ Append). Tự sinh API documentation format chuẩn Markdown.
- **Gate 5**: Quét Git Diff và dùng AI sinh commit message chuẩn Conventional Commits (ví dụ: `security(auth): remove hardcoded JWT token`).

## Slide 8: Tính Toán ROI (Return on Investment) (45s)
- **Visual**: Các con số lớn (Tiết kiệm thời gian, Giảm rủi ro).
- **Metrics**:
  - Tiết kiệm **~30 phút/commit** cho khâu code review & fix docs.
  - Ngăn chặn **100% rủi ro** lộ secret lên remote (Zero-Day Secret Leak).
  - Tăng độ phủ tài liệu API từ 30% lên 100%.

## Slide 9: Tại sao chọn nền tảng TRAE SOLO? (30s)
- Tích hợp sâu vào IDE (Nơi developer sống 8 tiếng/ngày).
- Tốc độ xử lý Context nhanh, phân tích Git Diff thời gian thực.
- Phù hợp hoàn hảo cho Enterprise: Data không bị đẩy ra ngoài nếu chạy Local Agent.

## Slide 10: Live Demo (Hoặc Video Demo) (1.5 min)
- Mở màn hình TRAE SOLO (Giao diện Dashboard cực đẹp đã build).
- Cho xem code có hardcode Google API Key.
- Bấm `git commit` → Console báo đỏ chót, Blocked!
- Mở Chat của TRAE, gõ *"Refactor và fix lỗi"* → TRAE chuyển Key ra `.env`, xóa thư viện rác, sinh docs.
- Commit lại → Thành công (Push lên Vercel).

## Slide 11: Q&A & Đội ngũ (15s)
- Lời cảm ơn Ban Giám Khảo.
- Hiển thị thông tin team M1 (PM), M2 (AI Engineer), M3 (DevOps).
