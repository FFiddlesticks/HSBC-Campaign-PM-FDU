from __future__ import annotations
import os
import json
from datetime import date, datetime
from typing import List, Optional

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Path to data.json (same logic as main.py)
DATABASE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "database", "data.json"))

class Document(BaseModel):
    title: str = Field("")
    id: str = Field("")
    customer_name: str = Field("")
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

@app.get("/health")
def health():
    return {"status": "ok", "cached": len(_CACHE)}

@app.post("/reload")
def reload_cache():
    global _CACHE
    _CACHE = _load_cache()
    return {"status": "reloaded", "cached": len(_CACHE)}

@app.get("/get", response_model=DataResponse)
def get_document(
    title: Optional[str] = Query(None, description="标题 (模糊匹配)"),
    id: Optional[str] = Query(None, description="文档编号 (模糊匹配)"),
    customer_name: Optional[str] = Query(None, description="客户名称 (模糊匹配)"),
    sign_date: Optional[date] = Query(None, description="签署日期 精确匹配 YYYY-MM-DD"),
    deadline: Optional[date] = Query(None, description="截止日期 精确匹配 YYYY-MM-DD"),
    timestamp: Optional[int] = Query(None, description="时间戳 精确匹配"),
    limit: int = Query(1000, ge=1, le=5000, description="最大返回条数 (针对多匹配场景)")
):
    """Return ALL records whose ANY of the provided fields matches (OR semantics).

    Previously this endpoint returned only the first match; now it aggregates all
    matches up to `limit`. If no documents match, return 404.
    """
    if not any([title, id, customer_name, sign_date, deadline, timestamp]):
        raise HTTPException(status_code=400, detail="At least one query parameter required")

    def fuzzy(field: Optional[str], pattern: Optional[str]) -> bool:
        if pattern is None:
            return False
        if not field:
            return False
        return pattern.lower() in field.lower()

    matches: List[Document] = []
    for doc in _CACHE:
        if (
            fuzzy(doc.title, title)
            or fuzzy(doc.id, id)
            or fuzzy(doc.customer_name, customer_name)
            or (sign_date and doc.sign_date == sign_date)
            or (deadline and doc.deadline == deadline)
            or (timestamp and doc.timestamp == timestamp)
        ):
            matches.append(doc)
            if len(matches) >= limit:
                break

    if not matches:
        raise HTTPException(status_code=404, detail="No matching document")
    return DataResponse(data=matches)

@app.get("/search", response_model=DataResponse)
def search(
    customer_name: Optional[str] = Query(None, description="客户名称 (模糊匹配, case-insensitive)"),
    title: Optional[str] = Query(None, description="文档标题 (模糊匹配)"),
    doc_id: Optional[str] = Query(None, alias="id", description="文档编号 (模糊匹配)"),
    sign_date_from: Optional[date] = Query(None, description="签署开始日期 YYYY-MM-DD"),
    sign_date_to: Optional[date] = Query(None, description="签署结束日期 YYYY-MM-DD"),
    deadline_from: Optional[date] = Query(None, description="截止开始日期 YYYY-MM-DD"),
    deadline_to: Optional[date] = Query(None, description="截止结束日期 YYYY-MM-DD"),
    limit: int = Query(200, ge=1, le=1000, description="最大返回记录数")
):
    if limit <= 0:
        raise HTTPException(status_code=400, detail="limit must be > 0")

    def match_text(field: Optional[str], pattern: Optional[str]) -> bool:
        if pattern is None:
            return True
        if not field:
            return False
        return pattern.lower() in field.lower()

    results: List[Document] = []
    for doc in _CACHE:
        if not match_text(doc.customer_name, customer_name):
            continue
        if not match_text(doc.title, title):
            continue
        if not match_text(doc.id, doc_id):
            continue
        # Date range checks
        if sign_date_from and (doc.sign_date is None or doc.sign_date < sign_date_from):
            continue
        if sign_date_to and (doc.sign_date is None or doc.sign_date > sign_date_to):
            continue
        if deadline_from and (doc.deadline is None or doc.deadline < deadline_from):
            continue
        if deadline_to and (doc.deadline is None or doc.deadline > deadline_to):
            continue
        results.append(doc)
        if len(results) >= limit:
            break

    return DataResponse(data=results)

if __name__ == "__main__":
    # Convenience local run
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
