# 📑 DevOps-Guard — Product Requirements Document (PRD)

## 1. Tóm tắt Sản phẩm (Executive Summary)
- **Tên dự án**: DevOps-Guard
- **Tagline**: Agentic Git & CI/CD Guard trên TRAE SOLO.
- **Vấn đề**: Các lập trình viên thường bỏ sót lỗi bảo mật (leak secrets), tích lũy thư viện rác, viết code không chuẩn và lười viết tài liệu trước khi đẩy code lên hệ thống chung.
- **Giải pháp**: Xây dựng một Tác tử (Agent) chạy trực tiếp trên máy cục bộ (Local IDE - TRAE) để phân tích, tự động sửa lỗi và chặn đứng các sai sót *trước khi* chúng kịp biến thành commit.

## 2. Kiến trúc 5 Cổng Kiểm Định (The 5 Quality Gates)
Giải pháp vận hành qua 5 lớp phòng thủ (Gates) đặt tại vòng đời Pre-commit:

1. **Gate 1: Security Scanner**: Quét regex tốc độ cao (>20 rules) phát hiện API Key, Secret lộ lọt. Chặn đứng lệnh `git commit` nếu phát hiện lỗi CRITICAL.
2. **Gate 2: Dependency Cleaner**: Agent phân tích `package.json` và mã nguồn để tìm ra các thư viện "có khai báo nhưng không dùng" (bloat dependencies).
3. **Gate 3: React Modernization Refactor**: Quét cú pháp cũ (React 18 như `forwardRef`, `useContext`) và tự động migrate sang chuẩn React 19.
4. **Gate 4: Auto-Documentation**: Tự động sinh tài liệu API (Markdown) cho các component/hàm mới, tuân thủ nghiêm ngặt nguyên tắc **Chỉ chèn thêm (Append-only)** để không ghi đè tài liệu cũ.
5. **Gate 5: Conventional Commits**: Sinh commit message tự động dựa trên Git Diff.

## 3. Chân dung Người dùng (User Personas)
- **M1 (Leader / Tech Lead)**: Người thiết lập luật lệ (`project_rules.md`, `security_rules.md`) để rèn tính kỷ luật cho team.
- **M2 (AI Engineer / Developer)**: Người sử dụng TRAE hàng ngày, cần công cụ giúp họ dọn rác và refactor code tự động để tập trung vào logic kinh doanh.
- **M3 (DevOps / QA)**: Người yên tâm cấu hình CI/CD vì biết rằng code đẩy lên từ local đã "sạch 99%".

## 4. Các Yêu cầu Phi chức năng (Non-Functional Requirements)
- **Zero-Infrastructure**: Không cần cài đặt server hay database ngoài. Toàn bộ rule engine chạy trực tiếp trên thư mục local.
- **Tính riêng tư (Privacy)**: Không gửi mã nguồn chứa secret ra các API scan bên ngoài. Scan nội bộ (Local regex).
- **Trải nghiệm mượt mà**: Không làm gián đoạn luồng làm việc của dev. Báo lỗi rõ ràng kèm theo đề xuất cách fix (Remediation).
