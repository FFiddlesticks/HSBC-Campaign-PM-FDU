# HSBC-Campaign-PM-FDU

POC code for PDF ingestion, OCR, and structured extraction.

## Backend Setup

### MacOS

```bash
brew install python3 python3-pip poppler
export OPENAI_API_KEY="your_openai_compatible_key"
```

### Linux 

```bash
sudo apt-get update
sudo apt-get install -y poppler-utils python3-dev python3-venv python3 python3-pip
export OPENAI_API_KEY="your_openai_compatible_key"
```

#### Help to setup pip

```bash
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

## Query Service (FastAPI)

提供内存缓存查询接口 (`src/backend/query_service.py`) ，可按公司名、标题、ID、日期范围检索并返回匹配的文件路径与记录。

## 一键脚本（根目录 `package.json`）
现在可以在项目根目录用 npm 脚本统一管理：

初始化前端：
```bash
npm run frontend:open
```

启动查询服务（自动检测虚拟环境是否已创建）：
```bash
npm run backend:query
```

执行 PDF 解析主流程：
```bash
npm run backend:parse
```

### 示例查询（按公司名模糊匹配 & 签署日期范围）
```bash
curl "http://127.0.0.1:8000/search?customer_name=上海&sign_date_from=2025-09-01&sign_date_to=2025-10-31"
```

### 单条匹配 /get （任意标签匹配）
`/get` 支持用任意一个字段（OR 逻辑）检索并返回所有匹配的记录（增加 `limit` 控制最大条数，默认 1000）：

按标题：
```bash
curl -G --data-urlencode "title=保证金担保合同" http://127.0.0.1:8000/get
```

按文档编号：
```bash
curl "http://127.0.0.1:8000/get?id=SCBC-BZJDB-2025-00128"
```

按公司名：
```bash
curl -G --data-urlencode "customer_name=上海盈通科技发展有限公司" http://127.0.0.1:8000/get

curl "http://127.0.0.1:8000/get?title=%E4%BF%9D%E8%AF%81%E9%87%91%E6%8B%85%E4%BF%9D%E5%90%88%E5%90%8C"
```

按签署日期：
```bash
curl "http://127.0.0.1:8000/get?sign_date=2025-10-07"
```

按截止日期：
```bash
curl "http://127.0.0.1:8000/get?deadline=2035-10-07"
```

按时间戳：
```bash
curl "http://127.0.0.1:8000/get?timestamp=1763614207"
```

如果没有匹配，会返回 404：
```json
{"detail":"No matching document"}
```

示例（返回多个文档时 `data` 为多条；下面仅展示一条格式）：
```json
{
  "success": true,
  "data": [
    {
      "title": "保证金担保合同",
      "id": "SCBC-BZJDB-2025-00128",
      "customer_name": "上海盈通科技发展有限公司",
      "sign_date": "2025-10-07",
      "deadline": "2035-10-07",
      "source_path": "doc/mock_data/保证金担保合同1.pdf",
      "timestamp": 1763614207
    }
  ]
}
```

### 可用查询参数
- `customer_name` 公司名（模糊匹配）
- `title` 标题（模糊匹配）
- `id` 文档编号（模糊匹配）
- `sign_date_from` / `sign_date_to` 签署日期范围
- `deadline_from` / `deadline_to` 截止日期范围
