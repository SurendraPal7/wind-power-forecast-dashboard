from typing import Optional, List, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Query, HTTPException, status
from app.core.config import settings
from app.core.decision_cutoff_config import DecisionCutoffPolicy
from app.services.elexon_client import ElexonClient, ElexonAPIError
from app.services.actual_generation_service import ActualGenerationService
from app.services.forecast_generation_service import ForecastGenerationService
from app.services.data_cleaning_service import DataCleaningService
from app.services.data_matching_service import DataMatchingService
from app.services.forecast_selection_service import ForecastSelectionService
from app.services.forecast_accuracy_service import ForecastAccuracyService, METRIC_EXPLANATIONS
from app.schemas.dashboard import (
    HealthStatusResponse,
    ActualGenerationListResponse,
    ForecastGenerationListResponse,
    DashboardSummaryResponse,
    DashboardComparisonResponse,
    DashboardAccuracyResponse,
    DashboardDailyResponse,
    ForecastHistoryResponse,
    FiltersMetadataResponse,
    ComparisonRecord,
)

router = APIRouter(tags=["Dashboard & Analytics API"])

# Shared service instances
client = ElexonClient()
actual_service = ActualGenerationService(client)
forecast_service = ForecastGenerationService(client)
cleaning_service = DataCleaningService()
matching_service = DataMatchingService()
selection_service = ForecastSelectionService()
accuracy_service = ForecastAccuracyService(
    selection_service=selection_service,
    matching_service=matching_service
)


def _validate_date_order(start_date: str, end_date: str) -> None:
    """Validate that start_date does not exceed end_date."""
    try:
        d_start = datetime.fromisoformat(start_date.strip())
        d_end = datetime.fromisoformat(end_date.strip())
        if d_start > d_end:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"start_date ({start_date}) cannot be later than end_date ({end_date})"
            )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid date format (expected YYYY-MM-DD): {str(e)}"
        )


def _get_matched_data(start_date: str, end_date: str, cutoff_time: str):
    """Helper to fetch, clean, and match actual vs day-ahead forecast records."""
    _validate_date_order(start_date, end_date)
    raw_actuals = actual_service.fetch_actual_wind(start_date=start_date, end_date=end_date)
    clean_actuals, actual_stats = cleaning_service.clean_actual_records(raw_actuals)

    raw_forecasts = forecast_service.fetch_forecasts_by_publish_window(
        publish_from=f"{start_date}T00:00:00Z",
        publish_to=f"{end_date}T23:59:59Z"
    )
    clean_forecasts, forecast_stats = cleaning_service.clean_forecast_records(raw_forecasts)

    matched = matching_service.match_records(
        actual_records=clean_actuals,
        forecast_records=clean_forecasts,
        day_ahead_only=True,
        cutoff_time_str=cutoff_time
    )
    return clean_actuals, clean_forecasts, matched, actual_stats, forecast_stats


# 1. GET /api/v1/health
@router.get("/health", response_model=HealthStatusResponse)
def get_health():
    """Return backend health and operational status."""
    return {
        "status": "ok",
        "service": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "timestamp_utc": datetime.utcnow().isoformat() + "Z",
        "version": "1.0.0"
    }


# 2. GET /api/v1/actual-generation
@router.get("/actual-generation", response_model=ActualGenerationListResponse)
def get_actual_generation(
    start_date: str = Query("2026-01-01", description="Settlement start date (YYYY-MM-DD)"),
    end_date: str = Query("2026-01-01", description="Settlement end date (YYYY-MM-DD)"),
    limit: Optional[int] = Query(48, ge=1, le=1500, description="Max records to return")
):
    """Return actual national wind generation records from Elexon FUELHH stream."""
    _validate_date_order(start_date, end_date)
    try:
        raw_records = actual_service.fetch_actual_wind(start_date=start_date, end_date=end_date)
        cleaned, _ = cleaning_service.clean_actual_records(raw_records)
        selected = cleaned[:limit] if limit else cleaned
        return {
            "dataset": "FUELHH",
            "fuelType": "WIND",
            "startDate": start_date,
            "endDate": end_date,
            "count": len(selected),
            "records": selected
        }
    except ElexonAPIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Actual generation error: {str(e)}")


# 3. GET /api/v1/forecast-generation
@router.get("/forecast-generation", response_model=ForecastGenerationListResponse)
def get_forecast_generation(
    delivery_date: str = Query("2026-01-02", description="Target delivery date (YYYY-MM-DD)"),
    cutoff_time: str = Query("11:00", description="Day-Ahead decision cutoff time in UTC (HH:MM)"),
    policy_name: str = Query("UK_DAY_AHEAD_AUCTION", description="Decision cutoff policy identifier")
):
    """Return Day-Ahead wind forecast records with explicit publication timestamps."""
    try:
        policy = DecisionCutoffPolicy(policy_name=policy_name, cutoff_time_utc=cutoff_time, day_offset=1)
        raw_forecasts = forecast_service.fetch_forecasts_for_target_day(target_date=delivery_date, lookback_days=1)
        clean_forecasts, _ = cleaning_service.clean_forecast_records(raw_forecasts)

        selection = selection_service.select_forecasts_for_delivery_day(
            forecast_records=clean_forecasts,
            delivery_date=delivery_date,
            policy=policy
        )

        return {
            "dataset": "WINDFOR",
            "deliveryDate": delivery_date,
            "decisionCutoffUTC": selection.cutoff_datetime_utc,
            "policy": policy.policy_name,
            "count": len(selection.selected_forecasts),
            "unavailableCount": len(selection.unavailable_intervals),
            "records": selection.selected_forecasts
        }
    except ElexonAPIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Forecast generation error: {str(e)}")


# 4. GET /api/v1/dashboard/summary
@router.get("/dashboard/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    start_date: str = Query("2026-01-01", description="Start settlement date (YYYY-MM-DD)"),
    end_date: str = Query("2026-01-03", description="End settlement date (YYYY-MM-DD)"),
    cutoff_time: str = Query("11:00", description="Day-Ahead decision cutoff time in UTC (HH:MM)"),
    policy_name: str = Query("UK_DAY_AHEAD_AUCTION", description="Policy identifier")
):
    """
    Return high-level summary KPIs for the purchasing desk:
    Average actual, average forecast, MAE, MAPE, RMSE, Bias, and completeness.
    """
    try:
        clean_actuals, clean_forecasts, matched, _, _ = _get_matched_data(start_date, end_date, cutoff_time)
        missing_actuals = max(0, len(clean_forecasts) - len(matched))
        missing_forecasts = max(0, len(clean_actuals) - len(matched))

        agg = accuracy_service.calculate_aggregate_metrics(
            matched_records=matched,
            missing_actual_count=missing_actuals,
            missing_forecast_count=missing_forecasts
        )

        return {
            "periodStart": start_date,
            "periodEnd": end_date,
            "decisionCutoffPolicy": policy_name,
            "decisionCutoffTimeUTC": cutoff_time,
            "averageForecastMW": agg["averageForecastMW"],
            "averageActualMW": agg["averageActualMW"],
            "maeMW": agg["maeMW"],
            "mapePercent": agg["mapePercent"],
            "rmseMW": agg["rmseMW"],
            "forecastBiasMW": agg["biasMW"],
            "totalMatchedObservations": agg["totalObservations"],
            "missingActualCount": agg["missingActualCount"],
            "missingForecastCount": agg["missingForecastCount"],
            "zeroActualCount": agg["zeroActualCount"],
            "dataCompletenessPercent": agg["dataCompletenessPercent"]
        }
    except ElexonAPIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Dashboard summary error: {str(e)}")


# 5. GET /api/v1/dashboard/comparison
@router.get("/dashboard/comparison", response_model=DashboardComparisonResponse)
def get_dashboard_comparison(
    start_date: str = Query("2026-01-01", description="Start settlement date (YYYY-MM-DD)"),
    end_date: str = Query("2026-01-03", description="End settlement date (YYYY-MM-DD)"),
    cutoff_time: str = Query("11:00", description="Day-Ahead decision cutoff time in UTC (HH:MM)"),
    limit: Optional[int] = Query(200, ge=1, le=1500, description="Max comparison points")
):
    """Return chronological actual vs forecast time-series points for dashboard charts."""
    try:
        _, _, matched, _, _ = _get_matched_data(start_date, end_date, cutoff_time)
        selected = matched[:limit] if limit else matched
        return {
            "periodStart": start_date,
            "periodEnd": end_date,
            "decisionCutoffTimeUTC": cutoff_time,
            "totalRecords": len(matched),
            "records": selected
        }
    except ElexonAPIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Comparison error: {str(e)}")


# 6. GET /api/v1/dashboard/accuracy
@router.get("/dashboard/accuracy", response_model=DashboardAccuracyResponse)
def get_dashboard_accuracy(
    start_date: str = Query("2026-01-01", description="Start settlement date (YYYY-MM-DD)"),
    end_date: str = Query("2026-01-03", description="End settlement date (YYYY-MM-DD)"),
    cutoff_time: str = Query("11:00", description="Day-Ahead decision cutoff time in UTC (HH:MM)")
):
    """Return detailed accuracy metrics including diurnal 48-period error profile and explanations."""
    try:
        clean_actuals, clean_forecasts, matched, _, _ = _get_matched_data(start_date, end_date, cutoff_time)
        missing_actuals = max(0, len(clean_forecasts) - len(matched))
        missing_forecasts = max(0, len(clean_actuals) - len(matched))

        summary = accuracy_service.calculate_aggregate_metrics(
            matched_records=matched,
            missing_actual_count=missing_actuals,
            missing_forecast_count=missing_forecasts
        )
        diurnal = accuracy_service.calculate_settlement_period_profile(matched)

        return {
            "periodStart": start_date,
            "periodEnd": end_date,
            "summary": summary,
            "diurnalProfile": diurnal,
            "metricExplanations": METRIC_EXPLANATIONS
        }
    except ElexonAPIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Accuracy error: {str(e)}")


# 7. GET /api/v1/dashboard/daily
@router.get("/dashboard/daily", response_model=DashboardDailyResponse)
def get_dashboard_daily(
    start_date: str = Query("2026-01-01", description="Start settlement date (YYYY-MM-DD)"),
    end_date: str = Query("2026-01-03", description="End settlement date (YYYY-MM-DD)"),
    cutoff_time: str = Query("11:00", description="Day-Ahead decision cutoff time in UTC (HH:MM)")
):
    """Return day-by-day generation totals and forecast accuracy metrics."""
    try:
        _, _, matched, _, _ = _get_matched_data(start_date, end_date, cutoff_time)
        daily_list = accuracy_service.calculate_daily_metrics(matched)
        return {
            "periodStart": start_date,
            "periodEnd": end_date,
            "totalDays": len(daily_list),
            "dailyMetrics": daily_list
        }
    except ElexonAPIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Daily metrics error: {str(e)}")


# 8. GET /api/v1/forecast-history
@router.get("/forecast-history", response_model=ForecastHistoryResponse)
def get_forecast_history(
    start_time: str = Query("2026-01-02T12:00:00Z", description="Target delivery interval (ISO UTC)"),
    cutoff_time: str = Query("11:00", description="Decision cutoff time in UTC (HH:MM)")
):
    """Audit all historical forecast vintages published for a specific settlement interval."""
    try:
        delivery_date = start_time[:10]
        policy = DecisionCutoffPolicy(cutoff_time_utc=cutoff_time, day_offset=1)
        raw_forecasts = forecast_service.fetch_forecasts_for_target_day(target_date=delivery_date, lookback_days=1)
        clean_forecasts, _ = cleaning_service.clean_forecast_records(raw_forecasts)

        audit_trail = selection_service.get_vintage_audit_trail(
            forecast_records=clean_forecasts,
            target_startTime=start_time,
            policy=policy
        )

        cutoff_iso = policy.calculate_cutoff_datetime(start_time).strftime("%Y-%m-%dT%H:%M:%SZ")

        return {
            "targetStartTime": start_time,
            "decisionCutoffUTC": cutoff_iso,
            "totalVintages": len(audit_trail),
            "vintages": audit_trail
        }
    except ElexonAPIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Forecast history error: {str(e)}")


# 9. GET /api/v1/filters
@router.get("/filters", response_model=FiltersMetadataResponse)
def get_filter_metadata():
    """Return available date ranges, configurable cutoff times, and metadata for UI controls."""
    return {
        "scopeDescription": "UK National Wind Generation Forecast & Accuracy Analytics (January 2026)",
        "defaultStartDate": "2026-01-01",
        "defaultEndDate": "2026-01-03",
        "availableDateRange": {
            "minDate": "2026-01-01",
            "maxDate": "2026-01-31"
        },
        "defaultCutoffTimeUTC": settings.DEFAULT_DECISION_CUTOFF_TIME,
        "availableCutoffTimes": [
            "09:00",
            "10:00",
            "11:00",
            "12:00",
            "14:00"
        ],
        "defaultPolicy": "UK_DAY_AHEAD_AUCTION",
        "availablePolicies": [
            {
                "id": "UK_DAY_AHEAD_AUCTION",
                "name": "UK Day-Ahead Wholesale Auction (D-1 at 11:00 UTC)",
                "description": "Gate closure assumption for EPEX SPOT and Nord Pool UK Day-Ahead hourly/half-hourly power auctions."
            },
            {
                "id": "UK_DAY_AHEAD_NOON",
                "name": "UK Day-Ahead Noon Cutoff (D-1 at 12:00 UTC)",
                "description": "Standard European physical day-ahead notification cutoff (12:00 CET/11:00 GMT standard or 12:00 UTC)."
            },
            {
                "id": "UK_EARLY_MORNING",
                "name": "Early Morning Trading Desk Briefing (D-1 at 09:00 UTC)",
                "description": "Initial morning forecast available when traders conduct early positioning reviews."
            }
        ],
        "settlementPeriodsPerDay": 48
    }
