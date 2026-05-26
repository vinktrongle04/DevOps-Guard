# 📖 DevOps-Guard API Documentation

> Tài liệu này được quản lý tự động bởi DevOps-Guard Docs Engine.  
> ⚠️ **QUY TẮC: DO NOT OVERWRITE** — Chỉ được append nội dung mới vào cuối file.

---

## [2026-05-23 23:35:00] — Khởi tạo tài liệu bởi Setup Agent

### Tổng quan dự án
- **Tên**: DevOps-Guard Demo Project
- **Phiên bản**: 1.0.0
- **Framework**: React 18.3.1 + Vite 6.0
- **Mục đích**: Dự án mẫu để demo khả năng tự động hóa DevOps

### Components

#### `<UserProfile />`
| Prop       | Type     | Default       | Mô tả                     |
|------------|----------|---------------|----------------------------|
| `name`     | `string` | *required*    | Tên đầy đủ của người dùng |
| `email`    | `string` | *required*    | Địa chỉ email             |
| `role`     | `string` | `'Developer'` | Vai trò hiển thị          |
| `avatarUrl`| `string` | `undefined`   | URL ảnh đại diện (tùy chọn)|

#### `<App />`
- Component gốc chứa layout chính và demo cards.
- ⚠️ **Lưu ý bảo mật**: Hiện đang chứa API Key hardcoded — cần xử lý!

---

*Cuối tài liệu — Append nội dung mới bên dưới dòng này.*
