# core-rules/

**Đây là nơi bạn chỉnh rules.**

TRAE SOLO luôn load 3 file trong thư mục này vào context (Layer 0 — Always loaded).

| File | Mục đích | Chỉnh khi nào |
|---|---|---|
| `AGENT_CONTEXT.md` | Entry point — bản đồ điều hướng knowledge space | Thêm file mới, update routing |
| `project_rules.md` | Pipeline order + behavioral rules cho 5 gates | Thay đổi thứ tự gate, thêm rule mới |
| `security_rules.md` | 28 security rules + compliance mapping | Thêm rule bảo mật mới, update compliance |

## Thêm rule mới ở đây như thế nào?

**Thêm security rule mới** → sửa `security_rules.md` + thêm pattern vào `security-scanner.js`

**Thêm behavioral rule** (ví dụ: rule mới về coding style) → sửa `project_rules.md`

**Thêm file mới vào knowledge space** → cập nhật routing table trong `AGENT_CONTEXT.md`
