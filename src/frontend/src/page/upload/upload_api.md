## 一、文件拆分接口
POST /api/v1/files/split
Method: POST
Content-Type: multipart/form-data
Response 200:
{
  "status": "ok",
  "sourceFile": {
    "id": "file_src_001",
    "name": "merged.pdf",
    "size": "123KB"
  },
  "parts": [
    {
      "fileId": "file_001",
      "name": "merged_part_1.pdf",
      "size": "234KB",
      "pages": {"start": 1, "end": 5},
      "downloadUrl": "https://.../files/file_001/download",
    },
    {
      "fileId": "file_002",
      "name": "merged_part_2.pdf",
      "size": "345KB",
      "pages": {"start": 6, "end": 10},
      "downloadUrl": "https://.../files/file_002/download"
    }
  ],
  "message": "split complete"
}


## 二、文件解析接口
POST /api/v1/files/parse
Method: POST
Content-Type: multipart/form-data
Response 200:
{
  "status": "ok",
  "sourceFile": {
    "id": "parse_f_001", 
    "name": "uploaded.pdf",
    "size": "345KB",
    "downloadUrl": "https://.../files/file_003/download"
  },
  "candidates": {
    "suggestedFileName": "客户A-保证金担保-20231107.pdf",
    "fileType": "保证金担保",
    // "fileId": "F-20231107-001",
    "customerName": "客户A",
    "pledgor": "出质人A",
    "debtor": "债务人A",
    "signDate": "2023-11-07",
    "expiryDate": "2024-11-07"
  },
  "message": "parse successful"
}


## 三、保存标签接口
POST /api/v1/files/savetags
Method: POST
Content-Type: application/json
Resquest Body:
{
  "fileId": "parse_f_001",
  "originalFileName": "uploaded.pdf",
  "savedFileName": "客户A-保证金担保-20231107.pdf",
  "customerName": "客户A",
  "pledgor": "出质人A",
  "debtor": "债务人A",
  "fileType": "保证金担保",
  "signDate": "2023-11-07",
  "expiryDate": "2024-11-07"
}
Response 200:
{ "status": "ok", "fileId": "parse_f_001", "message": "saved" }
