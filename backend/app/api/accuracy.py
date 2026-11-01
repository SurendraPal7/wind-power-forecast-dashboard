from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Query, HTTPException
from app.services.elexon_client import ElexonClient, ElexonAPIError
from app.services.actual_generation_service import ActualGenerationService
from app.services.forecast_generation_service import ForecastGenerationService
from app.services.data_cleaning_service import DataCleaningService
from app.services.data_matching_service import DataMatchingService
from app.services.forecast_accuracy_service import ForecastAccuracyService
from app.core.decision_cutoff_config import DecisionCutoffPolicy
from app.schemas.accuracy import AccuracyAnalysisResponse

router = APIRouter(prefix="/accuracy", tags=["Forecast Accuracy Analytics"])

client = ElexonClient()
actual_service = ActualGenerationService(client)
forecast_service = ForecastGenerationService(client)
cleaning_service = DataCleaningService()
matching_service = DataMatchingService()
accuracy_service = ForecastAccuracyService()


@router.get("/analytics", response_model=AccuracyAnalysisResponse)
def get_accuracy_analytics(
    start_date: str = Query("2026-01-01", description="Start settlement date (YYYY-MM-DD)"),
    end_date: str = Query("2026-01-03", description="End settlement date (YYYY-MM-DD)"),
    cutoff_time: str = Query("11:00", description="Day-Ahead decision cutoff time in UTC (HH:MM)"),
    policy_name: str = Query("UK_DAY_AHEAD_AUCTION", description="Decision policy identifier")
):
    """
    Run the full quantitative accuracy engine on Day-Ahead wind generation forecasts vs actuals:
      - Mean Absolute Error (MAE in MW)
      - Mean Absolute Percentage Error (MAPE in %)
      - Root Mean Square Error (RMSE in MW)
      - Forecast Bias (MW)
      - Daily trend breakdown
      - 48 settlement period diurnal profile
    """
    try:
        # 1. Fetch actuals
        raw_actuals = actual_service.fetch_actual_wind(start_date=start_date, end_date=end_date)
        clean_actuals, actual_stats = cleaning_service.clean_actual_records(raw_actuals)

        # 2. Fetch forecasts across the observation window
        # To cover Day-Ahead decisions, include forecasts published starting 1 day before start_date
        raw_forecasts = forecast_service.fetch_forecasts_by_publish_window(
            publish_from=f"{start_date}T00:00:00Z",
            publish_to=f"{end_date}T23:59:59Z"
        )
        clean_forecasts, forecast_stats = cleaning_service.clean_forecast_records(raw_forecasts)

        # 3. Match using startTime and Day-Ahead cutoff
        matched = matching_service.match_records(
            actual_records=clean_actuals,
            forecast_records=clean_forecasts,
            day_ahead_only=True,
            cutoff_time_str=cutoff_time
        )

        missing_actuals = max(0, len(clean_forecasts) - len(matched))
        missing_forecasts = max(0, len(clean_actuals) - len(matched))

        # 4. Run accuracy analysis
        result = accuracy_service.run_full_accuracy_analysis(
            matched_records=matched,
            delivery_date_start=start_date,
            delivery_date_end=end_date,
            policy_name=policy_name,
            cutoff_time_utc=cutoff_time,
            missing_actual_count=missing_actuals,
            missing_forecast_count=missing_forecasts
        )

        return result
    except ElexonAPIError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Accuracy calculation error: {str(e)}")
