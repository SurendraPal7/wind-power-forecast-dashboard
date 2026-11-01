import math
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from app.utils.datetime_utils import to_utc_datetime

logger = logging.getLogger(__name__)

METRIC_EXPLANATIONS = {
    "MAE": {
        "name": "Mean Absolute Error",
        "unit": "MW",
        "formula": "sum(|actual - forecast|) / N",
        "interpretation": "Average magnitude of forecast error in Megawatts regardless of direction. Directly represents expected volume mismatch per settlement period. Lower is better."
    },
    "MAPE": {
        "name": "Mean Absolute Percentage Error",
        "unit": "%",
        "formula": "mean(|actual - forecast| / actual) * 100",
        "interpretation": "Relative error percentage scaled against actual generation. Critical rule: Periods with zero actual generation are safely excluded to prevent division-by-zero, and the exclusion count is explicitly recorded."
    },
    "RMSE": {
        "name": "Root Mean Square Error",
        "unit": "MW",
        "formula": "sqrt(mean((actual - forecast)^2))",
        "interpretation": "Root mean squared error giving extra weight to large forecast blunders. Highly valuable for power trading desks assessing severe imbalance cash-out risks."
    },
    "BIAS": {
        "name": "Forecast Bias (Mean Signed Error)",
        "unit": "MW",
        "formula": "mean(forecast - actual)",
        "interpretation": "Directional tendency of forecasts. Positive bias (+MW) indicates systematic over-forecasting (risk of being long in the market); negative bias (-MW) indicates systematic under-forecasting (risk of being short)."
    },
    "INTERVAL_ERROR_PCT": {
        "name": "Interval Error Percentage",
        "unit": "%",
        "formula": "(|actual - forecast| / actual) * 100",
        "interpretation": "Relative forecast error for a specific 30-minute delivery period. Defined only when actual generation > 0 MW."
    }
}


class ForecastAccuracyService:
    """
    Dedicated calculation engine for quantitative wind forecast accuracy evaluation.
    
    Metrics implemented:
      1. Absolute Error (MW): |actual - forecast|
      2. Mean Absolute Error (MAE in MW): sum(|actual - forecast|) / N
      3. Mean Absolute Percentage Error (MAPE in %): mean(|actual - forecast| / actual) * 100
         (Excludes records where actual == 0 to prevent division by zero, and reports zero count)
      4. Forecast Bias (MW): mean(forecast - actual)
         (Positive bias indicates over-forecasting; negative indicates under-forecasting)
      5. Root Mean Square Error (RMSE in MW): sqrt(mean((actual - forecast)^2))
      6. Interval Error Percentage (%): (|actual - forecast| / actual) * 100 for each interval
    """

    def __init__(
        self,
        selection_service: Optional[Any] = None,
        matching_service: Optional[Any] = None
    ):
        self.selection_service = selection_service
        self.matching_service = matching_service

    @staticmethod
    def calculate_interval_errors(
        actual_gen: float,
        forecast_gen: float
    ) -> Dict[str, Optional[float]]:
        """
        Calculate error metrics for a single 30-minute settlement interval.
        """
        abs_err = abs(actual_gen - forecast_gen)
        signed_err = forecast_gen - actual_gen  # Forecast - Actual
        sq_err = (actual_gen - forecast_gen) ** 2
        
        # Percentage error relative to actual generation
        pct_err = None
        if actual_gen > 0:
            pct_err = round((abs_err / actual_gen) * 100.0, 3)

        return {
            "absoluteError": round(abs_err, 3),
            "signedError": round(signed_err, 3),
            "squaredError": round(sq_err, 3),
            "percentageError": pct_err
        }

    def calculate_aggregate_metrics(
        self,
        matched_records: List[Dict[str, Any]],
        expected_intervals_count: Optional[int] = None,
        missing_actual_count: int = 0,
        missing_forecast_count: int = 0
    ) -> Dict[str, Any]:
        """
        Compute aggregate forecast accuracy metrics across all valid matched observations.
        """
        n_obs = len(matched_records)
        if n_obs == 0:
            return {
                "totalObservations": 0,
                "maeMW": 0.0,
                "mapePercent": None,
                "rmseMW": 0.0,
                "biasMW": 0.0,
                "averageActualMW": 0.0,
                "averageForecastMW": 0.0,
                "maxAbsoluteErrorMW": 0.0,
                "zeroActualCount": 0,
                "mapeObservationsEvaluated": 0,
                "missingActualCount": missing_actual_count,
                "missingForecastCount": missing_forecast_count,
                "dataCompletenessPercent": 0.0,
                "description": "No valid matched observations found for accuracy calculation."
            }

        total_abs_err = 0.0
        total_signed_err = 0.0
        total_sq_err = 0.0
        total_actual = 0.0
        total_forecast = 0.0
        max_abs_err = 0.0

        pct_errors: List[float] = []
        zero_actual_count = 0

        for r in matched_records:
            act = float(r["actualGeneration"])
            fc = float(r["forecastGeneration"])

            errs = self.calculate_interval_errors(act, fc)
            abs_e = errs["absoluteError"]
            signed_e = errs["signedError"]
            sq_e = errs["squaredError"]

            total_abs_err += abs_e
            total_signed_err += signed_e
            total_sq_err += sq_e
            total_actual += act
            total_forecast += fc

            if abs_e > max_abs_err:
                max_abs_err = abs_e

            # Safe handling of zero actual values for MAPE
            if act == 0.0:
                zero_actual_count += 1
            else:
                pct_errors.append(abs_e / act)

        mae = round(total_abs_err / n_obs, 3)
        bias = round(total_signed_err / n_obs, 3)
        rmse = round(math.sqrt(total_sq_err / n_obs), 3)
        avg_act = round(total_actual / n_obs, 3)
        avg_fc = round(total_forecast / n_obs, 3)

        # MAPE calculation
        mape = None
        if len(pct_errors) > 0:
            mape = round((sum(pct_errors) / len(pct_errors)) * 100.0, 3)

        expected = expected_intervals_count or (n_obs + missing_actual_count + missing_forecast_count)
        completeness = round((n_obs / expected) * 100.0, 2) if expected > 0 else 100.0

        return {
            "totalObservations": n_obs,
            "maeMW": mae,
            "mapePercent": mape,
            "rmseMW": rmse,
            "biasMW": bias,
            "averageActualMW": avg_act,
            "averageForecastMW": avg_fc,
            "maxAbsoluteErrorMW": round(max_abs_err, 3),
            "zeroActualCount": zero_actual_count,
            "mapeObservationsEvaluated": len(pct_errors),
            "missingActualCount": missing_actual_count,
            "missingForecastCount": missing_forecast_count,
            "dataCompletenessPercent": completeness
        }

    def calculate_daily_metrics(
        self,
        matched_records: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Group matched records by settlement date (YYYY-MM-DD) and compute daily accuracy metrics.
        """
        records_by_day: Dict[str, List[Dict[str, Any]]] = {}
        for r in matched_records:
            st = r.get("startTime", "")
            settlement_date = r.get("settlementDate") or (st[:10] if len(st) >= 10 else "UNKNOWN")
            records_by_day.setdefault(settlement_date, []).append(r)

        daily_results: List[Dict[str, Any]] = []
        for day in sorted(records_by_day.keys()):
            day_records = records_by_day[day]
            agg = self.calculate_aggregate_metrics(day_records, expected_intervals_count=48)
            daily_results.append({
                "date": day,
                "observationCount": agg["totalObservations"],
                "maeMW": agg["maeMW"],
                "mapePercent": agg["mapePercent"],
                "rmseMW": agg["rmseMW"],
                "biasMW": agg["biasMW"],
                "averageActualMW": agg["averageActualMW"],
                "averageForecastMW": agg["averageForecastMW"],
                "zeroActualCount": agg["zeroActualCount"],
                "maxAbsoluteErrorMW": agg["maxAbsoluteErrorMW"]
            })

        return daily_results

    def calculate_settlement_period_profile(
        self,
        matched_records: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Group matched records by half-hourly settlement period (1 to 48)
        to identify diurnal accuracy patterns (e.g. morning vs evening peak errors).
        """
        records_by_period: Dict[int, List[Dict[str, Any]]] = {}
        for r in matched_records:
            period = r.get("settlementPeriod")
            if period is None and "startTime" in r:
                try:
                    dt = to_utc_datetime(r["startTime"])
                    period = (dt.hour * 2) + (1 if dt.minute < 30 else 2)
                except Exception:
                    period = 1
            if period:
                records_by_period.setdefault(period, []).append(r)

        diurnal_profile: List[Dict[str, Any]] = []
        for p in range(1, 49):
            p_records = records_by_period.get(p, [])
            start_min = (p - 1) * 30
            h1, m1 = divmod(start_min, 60)
            end_min = start_min + 30
            h2, m2 = divmod(end_min, 60)
            time_label = f"{h1:02d}:{m1:02d} - {h2:02d}:{m2:02d}"

            if not p_records:
                diurnal_profile.append({
                    "settlementPeriod": p,
                    "timeLabel": time_label,
                    "observationCount": 0,
                    "maeMW": 0.0,
                    "mapePercent": None,
                    "rmseMW": 0.0,
                    "biasMW": 0.0,
                    "averageActualMW": 0.0,
                    "averageForecastMW": 0.0
                })
                continue

            agg = self.calculate_aggregate_metrics(p_records)
            diurnal_profile.append({
                "settlementPeriod": p,
                "timeLabel": time_label,
                "observationCount": agg["totalObservations"],
                "maeMW": agg["maeMW"],
                "mapePercent": agg["mapePercent"],
                "rmseMW": agg["rmseMW"],
                "biasMW": agg["biasMW"],
                "averageActualMW": agg["averageActualMW"],
                "averageForecastMW": agg["averageForecastMW"]
            })

        return diurnal_profile

    def run_full_accuracy_analysis(
        self,
        matched_records: List[Dict[str, Any]],
        delivery_date_start: str,
        delivery_date_end: str,
        policy_name: str = "UK_DAY_AHEAD_AUCTION",
        cutoff_time_utc: str = "11:00",
        missing_actual_count: int = 0,
        missing_forecast_count: int = 0
    ) -> Dict[str, Any]:
        """
        Execute full end-to-end quantitative analysis:
          - Aggregate summary
          - Daily breakdown
          - Diurnal settlement period profile (1-48)
        """
        summary = self.calculate_aggregate_metrics(
            matched_records=matched_records,
            missing_actual_count=missing_actual_count,
            missing_forecast_count=missing_forecast_count
        )
        daily_metrics = self.calculate_daily_metrics(matched_records)
        diurnal_profile = self.calculate_settlement_period_profile(matched_records)

        return {
            "periodStart": delivery_date_start,
            "periodEnd": delivery_date_end,
            "decisionCutoffPolicy": policy_name,
            "decisionCutoffTimeUTC": cutoff_time_utc,
            "summary": summary,
            "dailyMetrics": daily_metrics,
            "diurnalProfile": diurnal_profile,
            "matchedIntervalsCount": len(matched_records)
        }
