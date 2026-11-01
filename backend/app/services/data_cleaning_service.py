import logging
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime
from app.services.data_normalization_service import DataNormalizationService
from app.utils.datetime_utils import to_utc_datetime

logger = logging.getLogger(__name__)


class DataCleaningService:
    """
    Cleans, deduplicates, and filters actual and forecast wind generation records.
    Ensures that missing values are not fabricated as zeros and all records meet domain constraints.
    """

    def __init__(self, normalizer: Optional[DataNormalizationService] = None):
        self.normalizer = normalizer or DataNormalizationService()

    def clean_actual_records(
        self,
        raw_records: List[Dict[str, Any]],
        filter_january_2026: bool = False
    ) -> Tuple[List[Dict[str, Any]], Dict[str, int]]:
        """
        Clean actual generation records from FUELHH:
          - Normalizes timestamps and types
          - Discards records with missing or non-numeric generation
          - Deduplicates records matching identical startTime
          - Optionally filters only January 2026 settlement periods
        """
        cleaned_records: List[Dict[str, Any]] = []
        seen_start_times = set()
        stats = {
            "total_raw": len(raw_records),
            "valid": 0,
            "missing_or_invalid_generation": 0,
            "invalid_timestamp": 0,
            "duplicates_removed": 0,
            "outside_scope_removed": 0,
        }

        for r in raw_records:
            norm_rec = self.normalizer.normalize_actual_record(r)
            if not norm_rec:
                if not self.normalizer.normalize_timestamp(r.get("startTime")):
                    stats["invalid_timestamp"] += 1
                else:
                    stats["missing_or_invalid_generation"] += 1
                continue

            start_iso = norm_rec["startTime"]

            # Filter January 2026 if requested
            if filter_january_2026:
                dt = to_utc_datetime(start_iso)
                if not (dt.year == 2026 and dt.month == 1):
                    stats["outside_scope_removed"] += 1
                    continue

            # Deduplication: for actuals, there should be exactly one generation figure per settlement period
            if start_iso in seen_start_times:
                stats["duplicates_removed"] += 1
                continue

            seen_start_times.add(start_iso)
            cleaned_records.append(norm_rec)

        # Sort chronologically by startTime
        cleaned_records.sort(key=lambda x: x["startTime"])
        stats["valid"] = len(cleaned_records)

        logger.info(f"Cleaned actual records: {stats}")
        return cleaned_records, stats

    def clean_forecast_records(
        self,
        raw_records: List[Dict[str, Any]],
        filter_january_2026: bool = False
    ) -> Tuple[List[Dict[str, Any]], Dict[str, int]]:
        """
        Clean forecast generation records from WINDFOR:
          - Normalizes timestamps (startTime & publishTime)
          - Discards records with missing/non-numeric generation
          - Deduplicates records matching the exact composite key (startTime, publishTime)
          - Preserves distinct publication vintages
        """
        cleaned_records: List[Dict[str, Any]] = []
        seen_keys = set()
        stats = {
            "total_raw": len(raw_records),
            "valid": 0,
            "missing_or_invalid_generation": 0,
            "invalid_timestamp": 0,
            "duplicates_removed": 0,
            "outside_scope_removed": 0,
        }

        for r in raw_records:
            norm_rec = self.normalizer.normalize_forecast_record(r)
            if not norm_rec:
                if not (self.normalizer.normalize_timestamp(r.get("startTime")) and 
                        self.normalizer.normalize_timestamp(r.get("publishTime"))):
                    stats["invalid_timestamp"] += 1
                else:
                    stats["missing_or_invalid_generation"] += 1
                continue

            start_iso = norm_rec["startTime"]
            pub_iso = norm_rec["publishTime"]

            # Filter January 2026 target startTime if requested
            if filter_january_2026:
                dt = to_utc_datetime(start_iso)
                if not (dt.year == 2026 and dt.month == 1):
                    stats["outside_scope_removed"] += 1
                    continue

            # Composite key for forecast vintage uniqueness: (startTime, publishTime)
            key = (start_iso, pub_iso)
            if key in seen_keys:
                stats["duplicates_removed"] += 1
                continue

            seen_keys.add(key)
            cleaned_records.append(norm_rec)

        # Sort chronologically by startTime then publishTime
        cleaned_records.sort(key=lambda x: (x["startTime"], x["publishTime"]))
        stats["valid"] = len(cleaned_records)

        logger.info(f"Cleaned forecast records: {stats}")
        return cleaned_records, stats
