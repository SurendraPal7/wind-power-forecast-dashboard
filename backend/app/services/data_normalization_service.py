import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from app.utils.datetime_utils import to_utc_datetime, to_iso_utc_string

logger = logging.getLogger(__name__)


class DataNormalizationService:
    """
    Normalizes raw data payloads into consistent, timezone-aware UTC representations
    with strictly validated numeric types.
    """

    @staticmethod
    def normalize_timestamp(ts_input: Any) -> Optional[str]:
        """Convert timestamp input into standard ISO 8601 UTC string (YYYY-MM-DDTHH:MM:SSZ)."""
        if ts_input is None:
            return None
        try:
            return to_iso_utc_string(ts_input)
        except Exception as e:
            logger.debug(f"Failed to normalize timestamp '{ts_input}': {e}")
            return None

    @staticmethod
    def normalize_numeric_generation(val: Any) -> Optional[float]:
        """Validate and cast generation to a float."""
        if val is None:
            return None
        try:
            num = float(val)
            # Generation cannot be NaN, infinite, or physically negative
            if num != num or num == float("inf") or num == float("-inf") or num < 0:
                return None
            return round(num, 3)
        except (ValueError, TypeError):
            return None

    def normalize_actual_record(self, raw_record: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Normalize a single actual generation record from FUELHH."""
        raw_start = raw_record.get("startTime")
        norm_start = self.normalize_timestamp(raw_start)
        if not norm_start:
            return None

        raw_gen = raw_record.get("generation")
        norm_gen = self.normalize_numeric_generation(raw_gen)
        if norm_gen is None:
            return None

        norm_publish = self.normalize_timestamp(raw_record.get("publishTime"))

        return {
            "dataset": "FUELHH",
            "fuelType": "WIND",
            "startTime": norm_start,
            "originalStartTime": str(raw_start),
            "publishTime": norm_publish,
            "generation": norm_gen,
            "settlementDate": raw_record.get("settlementDate"),
            "settlementPeriod": raw_record.get("settlementPeriod"),
            "rawRecord": raw_record
        }

    def normalize_forecast_record(self, raw_record: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Normalize a single forecast generation record from WINDFOR."""
        raw_start = raw_record.get("startTime")
        norm_start = self.normalize_timestamp(raw_start)
        if not norm_start:
            return None

        raw_publish = raw_record.get("publishTime")
        norm_publish = self.normalize_timestamp(raw_publish)
        if not norm_publish:
            return None

        raw_gen = raw_record.get("generation")
        norm_gen = self.normalize_numeric_generation(raw_gen)
        if norm_gen is None:
            return None

        return {
            "dataset": "WINDFOR",
            "startTime": norm_start,
            "originalStartTime": str(raw_start),
            "publishTime": norm_publish,
            "originalPublishTime": str(raw_publish),
            "generation": norm_gen,
            "rawRecord": raw_record
        }
