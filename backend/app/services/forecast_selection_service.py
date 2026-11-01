import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, date, timedelta, timezone
from app.core.decision_cutoff_config import DecisionCutoffPolicy, DEFAULT_POLICY
from app.utils.datetime_utils import to_utc_datetime, to_iso_utc_string

logger = logging.getLogger(__name__)


class ForecastSelectionResult:
    """Standardized result envelope for Day-Ahead forecast selection."""
    def __init__(
        self,
        delivery_date: str,
        policy: DecisionCutoffPolicy,
        cutoff_datetime_utc: str,
        selected_forecasts: List[Dict[str, Any]],
        unavailable_intervals: List[Dict[str, Any]],
        total_intervals: int,
    ):
        self.delivery_date = delivery_date
        self.policy = policy
        self.cutoff_datetime_utc = cutoff_datetime_utc
        self.selected_forecasts = selected_forecasts
        self.unavailable_intervals = unavailable_intervals
        self.total_intervals = total_intervals

    def to_dict(self) -> Dict[str, Any]:
        return {
            "deliveryDate": self.delivery_date,
            "policy": {
                "name": self.policy.policy_name,
                "cutoffTimeUTC": self.policy.cutoff_time_utc,
                "dayOffset": self.policy.day_offset,
                "description": self.policy.description
            },
            "decisionCutoffUTC": self.cutoff_datetime_utc,
            "totalIntervalsExpected": self.total_intervals,
            "availableCount": len(self.selected_forecasts),
            "unavailableCount": len(self.unavailable_intervals),
            "selectedForecasts": self.selected_forecasts,
            "unavailableIntervals": self.unavailable_intervals
        }


class ForecastSelectionService:
    """
    Core domain engine that selects wind generation forecasts strictly based on
    the electricity purchasing team's decision cutoff policy.
    
    Guarantees:
      - Temporal Integrity: Never selects any forecast published after cutoff.
      - Latest Pre-Cutoff: Selects the most recent forecast vintage available at decision time.
      - Missing Value Honesty: Reports intervals without eligible forecasts as UNAVAILABLE
        rather than inventing data or leaking post-cutoff forecasts.
      - Independent Architecture: Keeps vintage selection fully decoupled from actual data.
    """

    def __init__(self, default_policy: Optional[DecisionCutoffPolicy] = None):
        self.default_policy = default_policy or DEFAULT_POLICY

    @staticmethod
    def generate_expected_settlement_periods(delivery_date_str: str) -> List[str]:
        """
        Generate the 48 standard UK half-hourly settlement intervals (00:00 to 23:30 UTC)
        for a given delivery date.
        """
        d = to_utc_datetime(delivery_date_str).date()
        intervals = []
        for i in range(48):
            dt = datetime(d.year, d.month, d.day, 0, 0, 0, tzinfo=timezone.utc) + timedelta(minutes=30 * i)
            intervals.append(dt.strftime("%Y-%m-%dT%H:%M:%SZ"))
        return intervals

    def select_forecasts_for_delivery_day(
        self,
        forecast_records: List[Dict[str, Any]],
        delivery_date: str,
        policy: Optional[DecisionCutoffPolicy] = None
    ) -> ForecastSelectionResult:
        """
        For a given delivery date, select the single appropriate forecast for each settlement interval
        strictly respecting the configured decision cutoff policy.
        """
        active_policy = policy or self.default_policy
        cutoff_dt = active_policy.calculate_cutoff_datetime(delivery_date)
        cutoff_iso = to_iso_utc_string(cutoff_dt)
        expected_intervals = self.generate_expected_settlement_periods(delivery_date)

        # Group candidate forecasts by target startTime
        forecasts_by_start: Dict[str, List[Dict[str, Any]]] = {}
        for fc in forecast_records:
            st = fc.get("startTime")
            if not st:
                continue
            forecasts_by_start.setdefault(st, []).append(fc)

        selected_forecasts: List[Dict[str, Any]] = []
        unavailable_intervals: List[Dict[str, Any]] = []

        for period_idx, target_start in enumerate(expected_intervals, start=1):
            candidates = forecasts_by_start.get(target_start, [])

            # Filter candidates published on or before cutoff
            eligible_candidates = []
            for fc in candidates:
                pub_raw = fc.get("publishTime")
                if not pub_raw:
                    continue
                pub_dt = to_utc_datetime(pub_raw)

                # STRICT RULE: Never select forecasts published after the cutoff
                if pub_dt <= cutoff_dt:
                    eligible_candidates.append((pub_dt, fc))

            if not eligible_candidates:
                # Missing forecast: report as UNAVAILABLE rather than leaking later forecasts
                unavailable_intervals.append({
                    "settlementPeriod": period_idx,
                    "startTime": target_start,
                    "status": "UNAVAILABLE",
                    "reason": f"No forecast published on or before decision cutoff ({cutoff_iso})",
                    "postCutoffCandidatesCount": len(candidates)
                })
                continue

            # Select the latest eligible forecast published by cutoff
            eligible_candidates.sort(key=lambda x: x[0], reverse=True)
            chosen_pub_dt, chosen_fc = eligible_candidates[0]

            lead_hours = round((to_utc_datetime(target_start) - chosen_pub_dt).total_seconds() / 3600.0, 1)

            selected_forecasts.append({
                "settlementPeriod": period_idx,
                "startTime": target_start,
                "publishTime": chosen_fc["publishTime"],
                "generation": float(chosen_fc["generation"]),
                "leadTimeHours": lead_hours,
                "decisionCutoffUTC": cutoff_iso,
                "policyApplied": active_policy.policy_name,
                "eligibleVintagesCount": len(eligible_candidates),
                "totalVintagesEvaluated": len(candidates)
            })

        logger.info(
            f"Forecast selection completed for {delivery_date}: "
            f"{len(selected_forecasts)} available, {len(unavailable_intervals)} unavailable "
            f"(Cutoff: {cutoff_iso})"
        )

        return ForecastSelectionResult(
            delivery_date=delivery_date,
            policy=active_policy,
            cutoff_datetime_utc=cutoff_iso,
            selected_forecasts=selected_forecasts,
            unavailable_intervals=unavailable_intervals,
            total_intervals=len(expected_intervals)
        )

    def get_vintage_audit_trail(
        self,
        forecast_records: List[Dict[str, Any]],
        target_startTime: str,
        policy: Optional[DecisionCutoffPolicy] = None
    ) -> List[Dict[str, Any]]:
        """
        Inspect all historical forecast vintages for a specific delivery interval.
        Classifies each vintage as eligible or post-cutoff, identifying the selected vintage.
        """
        active_policy = policy or self.default_policy
        cutoff_dt = active_policy.calculate_cutoff_datetime(target_startTime)
        cutoff_iso = to_iso_utc_string(cutoff_dt)

        target_iso = to_iso_utc_string(target_startTime)
        candidates = [fc for fc in forecast_records if fc.get("startTime") == target_iso]

        # Sort candidates chronologically by publishTime
        candidates.sort(key=lambda x: to_utc_datetime(x["publishTime"]))

        # Identify latest eligible vintage
        eligible_candidates = [
            fc for fc in candidates if to_utc_datetime(fc["publishTime"]) <= cutoff_dt
        ]
        selected_pub = eligible_candidates[-1]["publishTime"] if eligible_candidates else None

        audit_trail: List[Dict[str, Any]] = []
        for fc in candidates:
            pub_dt = to_utc_datetime(fc["publishTime"])
            is_eligible = pub_dt <= cutoff_dt
            is_selected = (fc["publishTime"] == selected_pub)

            audit_trail.append({
                "startTime": target_iso,
                "publishTime": fc["publishTime"],
                "generation": float(fc["generation"]),
                "decisionCutoffUTC": cutoff_iso,
                "isEligible": is_eligible,
                "isSelected": is_selected,
                "status": "SELECTED" if is_selected else ("ELIGIBLE_SUPERSEDED" if is_eligible else "POST_CUTOFF_EXCLUDED"),
                "leadTimeHours": round((to_utc_datetime(target_iso) - pub_dt).total_seconds() / 3600.0, 1)
            })

        return audit_trail
