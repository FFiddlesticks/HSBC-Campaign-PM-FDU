import os
import json
import time
from typing import Any, Dict, List
import model

DATABASE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "database", "data.json"))
SOURCE_PDF = "/path/.pdf"


def _load_existing(path: str) -> List[Dict[str, Any]]:
    if not os.path.exists(path):
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read().strip()
            if not content:
                return []
            data = json.loads(content)
            # Allow single object -> wrap to list
            if isinstance(data, dict):
                return [data]
            if isinstance(data, list):
                return data
    except Exception as e:
        print(f"Warning: failed to parse existing database file: {e}; starting fresh.")
    return []


def _append_record(path: str, record: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    data = _load_existing(path)
    data.append(record)
    # Atomic write: write to temp then replace
    tmp_path = path + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp_path, path)


def exec_parse_pdf():
    ret = model.parse_pdf(SOURCE_PDF)
    print(ret)
    # Parse returned JSON string
    try:
        parsed = json.loads(ret) if ret else {}
    except Exception as e:
        print(f"Failed to parse result JSON: {e}")
        return
    _append_record(DATABASE_PATH, parsed)
    print(f"Record appended to {DATABASE_PATH}")


if __name__ == '__main__':
    exec_parse_pdf()
