from __future__ import annotations
import os
import json
from datetime import date, datetime
from typing import List, Optional

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Path to data.json (same logic as main.py)
DATABASE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "database", "data_all.json"))

def getFileTypeStr(type_name: str) -> str:
    type_mapping = {
        '安慰函': '1',
        '保证金担保合同': '2',
        '个人保证书': '3',
        '公司保证书': '4',
        '应收账款质押协议': '5'
    }
    return type_mapping[type_name]

class Document(BaseModel):
    title: str = Field("")
    id: str = Field("")
    customer_name: str = Field("")
    file_type: str = Field("") 
    sign_date: Optional[date] = None
    deadline: Optional[date] = None
    source_path: Optional[str] = None
    timestamp: Optional[int] = None

    @classmethod
    def from_raw(cls, raw: dict):
        # Convert date strings to date objects if present
        def parse_date(val: Optional[str]):
            if not val:
                return None
            try:
                return datetime.strptime(val, "%Y-%m-%d").date()
            except Exception:
                return None
        return cls(
            title=raw.get("title", ""),
            id=raw.get("id", ""),
            file_type = getFileTypeStr(raw.get("type", "")),
            customer_name=raw.get("customer_name", ""),
            sign_date=parse_date(raw.get("sign_date")),
            deadline=parse_date(raw.get("deadline")),
            source_path=raw.get("source_path"),
            timestamp=raw.get("timestamp"),
        )

class DataResponse(BaseModel):
    success: bool = True
    data: List[Document]

# In-memory cache
_CACHE: List[Document] = []

app = FastAPI(title="Document Query Service", version="0.1.0")

# Allow local frontend (vite default port 5173) & all for simplicity
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Consider restricting in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def _load_cache() -> List[Document]:
    if not os.path.exists(DATABASE_PATH):
        return []
    try:
        with open(DATABASE_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, dict):
                data = [data]
            docs = [Document.from_raw(r) for r in data if isinstance(r, dict)]
            return docs
    except Exception as e:
        print(f"Failed to load database: {e}")
    return []

@app.on_event("startup")
def startup_event():
    global _CACHE
    _CACHE = _load_cache()
    print(f"Loaded {len(_CACHE)} documents into cache from {DATABASE_PATH}")

@app.get("/get", response_model=DataResponse)
def get_document(
    title: Optional[str] = Query(None, description="标题 (模糊匹配)"),
    id: Optional[str] = Query(None, description="文档编号 (模糊匹配)"),
    customer_name: Optional[str] = Query(None, description="客户名称 (模糊匹配)"),
    fileType: Optional[str] = Query(None, description="文件类型 (精确匹配)"),
    sign_date: Optional[date] = Query(None, description="签署日期 精确匹配 YYYY-MM-DD"),
    deadline: Optional[date] = Query(None, description="截止日期 精确匹配 YYYY-MM-DD"),
    timestamp: Optional[int] = Query(None, description="时间戳 精确匹配"),
    limit: int = Query(1000, ge=1, le=5000, description="最大返回条数")
):
    if not any([title, id, customer_name, fileType, sign_date, deadline, timestamp]):
        return DataResponse(data=_CACHE)

    def fuzzy(field: Optional[str], pattern: Optional[str]) -> bool:
        if pattern is None:
            return True
        if not field:
            return False
        return pattern.lower() in field.lower()

    matches: List[Document] = []
    for storage in _CACHE:
        deadline_match = True
        if deadline is not None:
            if storage.deadline is not None and storage.deadline > deadline:
                deadline_match = False
        if (fuzzy(storage.title, title) and
            fuzzy(storage.id, id) and
            fuzzy(storage.customer_name, customer_name) and
            (fileType is None or storage.file_type == fileType) and
            (sign_date is None or storage.sign_date == sign_date) and
            deadline_match and
            (timestamp is None or storage.timestamp == timestamp)):
                matches.append(storage)
                if len(matches) >= limit:
                    break

    if not matches:
        raise HTTPException(status_code=404, detail="No matching document")
    return DataResponse(data=matches)

if __name__ == "__main__":
    # Convenience local run
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
