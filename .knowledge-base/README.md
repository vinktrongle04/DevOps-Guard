# DevOps-Guard - Temporal Knowledge Base

Hệ thống lưu trữ **toàn diện & có nhận thức thời gian** cho DevOps-Guard, giúp agent hiểu ngữ cảnh lịch sử, trạng thái code, thống kê và các thay đổi.

## Cấu trúc thư mục

```
.knowledge-base/
├── snapshots/          # Trạng thái code theo thời gian (snapshots)
│   └── README.md       # Schema chi tiết
├── agent-context/      # Lưu ngữ cảnh & bộ nhớ agent
│   └── agent-memory.json
├── metrics/            # Thống kê toàn diện
│   └── comprehensive-metrics.json
└── audit-logs/         # Nhật ký kiểm toán
    └── audit-log.json
```

## Tính năng chính

### 1. Snapshots thời gian
- Lưu trạng thái code tại mỗi thời điểm
- Kèm metadata Git (commit hash, branch, message...)
- Hash tệp để phát hiện thay đổi
- Liên kết với các báo cáo quét

### 2. Bộ nhớ agent
- Lưu lịch sử tương tác
- Các mẫu đã học (learned patterns)
- Mục tiêu hiện tại
- Quy tắc dự án

### 3. Metrics toàn diện
- Security metrics
- Dependency metrics
- Code quality metrics
- Team performance metrics
- Temporal metrics (theo ngày/tuần/tháng)

### 4. Nhật ký kiểm toán
- Tất cả hành động hệ thống
- Thay đổi cấu hình
- Kết quả quét

## Cách dùng

### Tạo snapshot
```bash
node snapshot-generator.js
```

### Lấy ngữ cảnh cho agent
Đọc các tệp trong `.knowledge-base/` để agent hiểu lịch sử dự án.

## Định dạng tệp

### Snapshots
Định dạng: `YYYY-MM-DD-HH-MM-SS_{commit-hash}.json`

### Audit logs
Mỗi log có: `id`, `timestamp`, `actor`, `action`, `details`
