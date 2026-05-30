# Code Snapshots

Thư mục này chứa các snapshot trạng thái code theo thời gian, giúp agent hiểu ngữ cảnh lịch sử.

## Tệp đặt tên
`YYYY-MM-DD-HH-MM-SS_{commit-hash}.json`

## Cấu trúc JSON
```json
{
  "id": "uuid",
  "timestamp": "ISO 8601",
  "git": {
    "commitHash": "",
    "branch": "",
    "message": "",
    "author": ""
  },
  "codeState": {
    "files": [
      {
        "path": "src/App.jsx",
        "hash": "sha256",
        "size": 1234,
        "lastModified": "ISO 8601",
        "violations": []
      }
    ],
    "summary": {
      "totalFiles": 10,
      "totalLines": 1000,
      "violationsBySeverity": {}
    }
  },
  "metrics": {
    "securityScore": 85,
    "dependencyHealth": 90,
    "codeQuality": 75
  },
  "agentActions": []
}
```
