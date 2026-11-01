import logging
from typing import List, Dict, Any, Optional, Union
from datetime import datetime, timedelta, time
from app.utils.datetime_utils import to_utc_datetime, to_iso_utc_string
from app.core.config import settings

logger = logging.getLogger(__name__)


class DataMatchingService:
    """
    Matches actual and forecast wind generation records by target settlement interval (startTime).
    Enforces temporal integrity:
      - Never matches based on array position.
      - Never substitutes missing actuals or forecasts with zero.
      - Enforces day-ahead decision cutoff rules so forecasts published after decisions are never used.
    """

    def __init__(self, default_cutoff_time: Optional[str] = None):
        self.default_cutoff_time = default_cutoff_time or settings.DEFAULT_DECISION_CUTOFF_TIME

    def _parse_cutoff_time(self, cutoff_str: str) -> time:
        """Parse HH:MM string to datetime.time."""
        parts = cutoff_str.strip().split(":")
        return time(hour=int(parts[0]), minute=int(parts[1]))

    def get_day_ahead_decision_cutoff(
        self,
        target_delivery_dt: datetime,
        cutoff_time_str: Optional[str] = None
    ) -> datetime:
        """
        Calculate the decision cutoff timestamp for a given delivery datetime.
        For delivery on Day D, the day-ahead auction cutoff is Day D-1 at cutoff_time (e.g. 11:00 UTC).
        """
        c_time = self._parse_cutoff_time(cutoff_time_str or self.default_cutoff_time)
        day_ahead_date = target_delivery_dt.date() - timedelta(days=1)
        return datetime(
            day_ahead_date.year,
            day_ahead_date.month,
            day_ahead_date.day,
            c_time.hour,
            c_time.minute,
            0,
            tzinfo=target_delivery_dt.tzinfo
        )

    def select_day_ahead_forecasts(
        self,
        forecast_records: List[Dict[str, Any]],
        cutoff_time_str: Optional[str] = None
    ) -> Dict[str, Dict[str, Any]]:
        """
        For each unique target delivery startTime:
        Select the latest forecast published at or before the Day-Ahead decision cutoff.
        Returns a dictionary mapping startTime -> best forecast record.
        """
        selected_by_start_time: Dict[str, Dict[str, Any]] = {}
        cutoff_str = cutoff_time_str or self.default_cutoff_time

        # Group forecasts by startTime
        forecasts_by_start: Dict[str, List[Dict[str, Any]]] = {}
        for fc in forecast_records:
            st = fc.get("startTime")
            if not st:
                continue
            forecasts_by_start.setdefault(st, []).append(fc)

        for start_iso, fcs in forecasts_by_start.items():
            start_dt = to_utc_datetime(start_iso)
            cutoff_dt = self.get_day_ahead_decision_cutoff(start_dt, cutoff_str)

            # Filter forecasts published on or before cutoff
            valid_candidates = []
            for fc in fcs:
                pub_iso = fc.get("publishTime")
                if not pub_iso:
                    continue
                pub_dt = to_utc_datetime(pub_iso)
                if pub_dt <= cutoff_dt:
                    valid_candidates.append((pub_dt, fc))

            if valid_candidates:
                # Pick the latest forecast vintage prior to cutoff
                valid_candidates.sort(key=lambda x: x[0], reverse=True)
                selected_by_start_time[start_iso] = valid_candidates[0][1]

        logger.info(
            f"Selected day-ahead forecasts for {len(selected_by_start_time)} settlement intervals "
            f"using cutoff assumption {cutoff_str} UTC (Day-Ahead)"
        )
        return selected_by_start_time

    def match_records(
        self,
        actual_records: List[Dict[str, Any]],
        forecast_records: List[Dict[str, Any]],
        day_ahead_only: bool = True,
        cutoff_time_str: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Match actual wind generation and forecast wind generation by target startTime.
        
        Guarantees:
          - Pure key-based (startTime) hash join.
          - Excludes intervals where either actual or forecast is missing (no zero fabrication).
          - Calculates absolute error, signed error, and percentage error.
          - Standard internal format guaranteed.
        """
        # Map actuals by startTime
        actuals_by_start: Dict[str, Dict[str, Any]] = {}
        for act in actual_records:
            st = act.get("startTime")
            if st and act.get("generation") is not None:
                actuals_by_start[st] = act

        matched_records: List[Dict[str, Any]] = []

        if day_ahead_only:
            # Select Day-Ahead vintage forecasts
            best_forecasts = self.select_day_ahead_forecasts(
                forecast_records=forecast_records,
                cutoff_time_str=cutoff_time_str
            )

            for start_iso, fc in best_forecasts.items():
                act = actuals_by_start.get(start_iso)
                if act is None:
                    # No actual available for this interval: do not fabricate zero!
                    continue

                act_gen = float(act["generation"])
                fc_gen = float(fc["generation"])
                abs_err = round(abs(fc_gen - act_gen), 3)
                err = round(fc_gen - act_gen, 3)
                pct_err = round((abs_err / act_gen) * 100, 2) if act_gen > 0 else None

                matched_records.append({
                    "startTime": start_iso,
                    "publishTime": fc["publishTime"],
                    "forecastGeneration": fc_gen,
                    "actualGeneration": act_gen,
                    "absoluteError": abs_err,
                    "error": err,
                    "percentageError": pct_err,
                    "settlementDate": act.get("settlementDate"),
                    "settlementPeriod": act.get("settlementPeriod"),
                })
        else:
            # Multi-vintage matching: match every valid forecast with actual by startTime
            for fc in forecast_records:
                st = fc.get("startTime")
                act = actuals_by_start.get(st)
                if act is None:
                    continue

                act_gen = float(act["generation"])
                fc_gen = float(fc["generation"])
                abs_err = round(abs(fc_gen - act_gen), 3)
                err = round(fc_gen - act_gen, 3)
                pct_err = round((abs_err / act_gen) * 100, 2) if act_gen > 0 else None

                matched_records.append({
                    "startTime": st,
                    "publishTime": fc["publishTime"],
                    "forecastGeneration": fc_gen,
                    "actualGeneration": act_gen,
                    "absoluteError": abs_err,
                    "error": err,
                    "percentageError": pct_err,
                    "settlementDate": act.get("settlementDate"),
                    "settlementPeriod": act.get("settlementPeriod"),
                })

        # Sort chronologically by startTime
        matched_records.sort(key=lambda x: (x["startTime"], x["publishTime"]))
        logger.info(f"Successfully matched {len(matched_records)} records using target startTime.")
        return matched_records
