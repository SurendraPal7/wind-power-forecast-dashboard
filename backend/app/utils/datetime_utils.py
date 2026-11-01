from datetime import datetime, date, timezone
from typing import Union
import re


def to_utc_datetime(dt_input: Union[str, datetime, date]) -> datetime:
    """
    Parse an input date or timestamp into a timezone-aware UTC datetime.
    
    Accepts:
      - datetime object (naive converted to UTC, aware converted to UTC)
      - date object (assumed 00:00:00 UTC)
      - ISO string (e.g. '2026-01-01', '2026-01-01T12:00:00Z', '2026-01-01T12:00:00+00:00')
    """
    if isinstance(dt_input, datetime):
        if dt_input.tzinfo is None:
            return dt_input.replace(tzinfo=timezone.utc)
        return dt_input.astimezone(timezone.utc)
    
    if isinstance(dt_input, date):
        return datetime(dt_input.year, dt_input.month, dt_input.day, 0, 0, 0, tzinfo=timezone.utc)
    
    if isinstance(dt_input, str):
        clean_str = dt_input.strip()
        # Handle 'Z' suffix for Python 3.10
        if clean_str.endswith("Z"):
            clean_str = clean_str[:-1] + "+00:00"
        
        # Check if only date is provided 'YYYY-MM-DD'
        if re.match(r"^\d{4}-\d{2}-\d{2}$", clean_str):
            d = date.fromisoformat(clean_str)
            return datetime(d.year, d.month, d.day, 0, 0, 0, tzinfo=timezone.utc)
        
        dt = datetime.fromisoformat(clean_str)
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    
    raise ValueError(f"Cannot convert type {type(dt_input)} to UTC datetime")


def to_iso_utc_string(dt_input: Union[str, datetime, date]) -> str:
    """Format datetime as ISO 8601 UTC string ending in 'Z'."""
    dt = to_utc_datetime(dt_input)
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def is_in_january_2026(dt_input: Union[str, datetime, date]) -> bool:
    """Check if the provided datetime falls within January 2026."""
    dt = to_utc_datetime(dt_input)
    return dt.year == 2026 and dt.month == 1
