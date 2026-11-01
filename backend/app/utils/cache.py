import os
import json
import hashlib
from typing import Any, Optional
from pathlib import Path

CACHE_DIR = Path(__file__).resolve().parent.parent.parent / "data_cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)


def _get_cache_path(key: str) -> Path:
    safe_key = hashlib.sha256(key.encode("utf-8")).hexdigest()
    return CACHE_DIR / f"{safe_key}.json"


def get_cached(key: str) -> Optional[Any]:
    path = _get_cache_path(key)
    if path.exists():
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return None
    return None


def set_cached(key: str, data: Any) -> None:
    path = _get_cache_path(key)
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f)
    except Exception:
        pass
