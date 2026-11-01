from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Query, HTTPException
from app.services.elexon_client import ElexonClient, ElexonAPIError
from app.services.actual_generation_service import ActualGenerationService
from app.services.forecast_generation_service import ForecastGenerationService
from app.services.data_cleaning_service import DataCleaningService
from app.services.data_matching_service import DataMatchingService
from app.schemas.generation import ConnectivityStatus, MatchedRecord

router = APIRouter(prefix="/elexon", tags=["Elexon BMRS Integration"])

client = ElexonClient()
actual_service = ActualGenerationService(client)
forecast_service = ForecastGenerationService(client)
cleaning_service = DataCleaningService()
matching_service = DataMatchingService()


@router.get("/connectivity", response_model=ConnectivityStatus)
def test_connectivity():
    """
    Test live connectivity to the official Elexon Insights Solution (BMRS) API.
    Performs a lightweight probe against /datasets/FUELHH/stream and returns real latency and sample.
    """
    try:
        return client.ping()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to connect to Elexon API: {str(e)}")


@router.get("/actual")
def get_actual_wind(
    start_date: str = Query("2026-01-01", description="Settlement start date (YYYY-MM-DD)"),
    end_date: str = Query("2026-01-01", description="Settlement end date (YYYY-MM-DD)"),
    clean: bool = Query(True, description="Apply data cleaning and deduplication"),
    limit: Optional[int] = Query(48, description="Maximum number of records to return"),
    force_refresh: bool = Query(False, description="Bypass local cache and query Elexon directly")
):
    """
    Fetch and return real actual wind generation records from Elexon FUELHH stream.
    """
    try:
        raw_records = actual_service.fetch_actual_wind(
            start_date=start_date,
            end_date=end_date,
            force_refresh=force_refresh
        )
        if clean:
            cleaned, stats = cleaning_service.clean_actual_records(raw_records)
            return {
                "dataset": "FUELHH",
                "fuelType": "WIND",
                "stats": stats,
                "count": len(cleaned),
                "records": cleaned[:limit] if limit else cleaned
            }
        return {
            "dataset": "FUELHH",
            "fuelType": "WIND",
            "count": len(raw_records),
            "records": raw_records[:limit] if limit else raw_records
        }
    except ElexonAPIError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


@router.get("/forecast")
def get_forecast_wind(
    target_date: str = Query("2026-01-01", description="Target delivery date (YYYY-MM-DD)"),
    clean: bool = Query(True, description="Apply data cleaning and deduplication"),
    limit: Optional[int] = Query(50, description="Maximum number of records to return"),
    force_refresh: bool = Query(False, description="Bypass local cache and query Elexon directly")
):
    """
    Fetch and return real forecast wind generation records from Elexon WINDFOR stream.
    """
    try:
        raw_records = forecast_service.fetch_forecasts_for_target_day(
            target_date=target_date,
            force_refresh=force_refresh
        )
        if clean:
            cleaned, stats = cleaning_service.clean_forecast_records(raw_records)
            return {
                "dataset": "WINDFOR",
                "targetDate": target_date,
                "stats": stats,
                "count": len(cleaned),
                "records": cleaned[:limit] if limit else cleaned
            }
        return {
            "dataset": "WINDFOR",
            "targetDate": target_date,
            "count": len(raw_records),
            "records": raw_records[:limit] if limit else raw_records
        }
    except ElexonAPIError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


@router.get("/matched")
def get_matched_wind_data(
    delivery_date: str = Query("2026-01-02", description="Delivery settlement date (YYYY-MM-DD)"),
    cutoff_time: str = Query("11:00", description="Day-Ahead purchasing decision cutoff time (HH:MM UTC)"),
    day_ahead_only: bool = Query(True, description="Enforce strict day-ahead decision cutoff"),
    limit: Optional[int] = Query(48, description="Maximum number of matched intervals to return")
):
    """
    Process and return matched actual vs forecast records for a delivery date.
    Integrates actual generation, forecast publication vintages, and decision cutoff.
    """
    try:
        # 1. Fetch actuals for delivery date
        raw_actuals = actual_service.fetch_actual_wind(start_date=delivery_date, end_date=delivery_date)
        clean_actuals, actual_stats = cleaning_service.clean_actual_records(raw_actuals)

        # 2. Fetch forecasts relevant for delivery date
        raw_forecasts = forecast_service.fetch_forecasts_for_target_day(target_date=delivery_date, lookback_days=1)
        clean_forecasts, forecast_stats = cleaning_service.clean_forecast_records(raw_forecasts)

        # 3. Match using target startTime
        matched = matching_service.match_records(
            actual_records=clean_actuals,
            forecast_records=clean_forecasts,
            day_ahead_only=day_ahead_only,
            cutoff_time_str=cutoff_time
        )

        return {
            "deliveryDate": delivery_date,
            "decisionCutoffTimeUTC": cutoff_time,
            "dayAheadOnly": day_ahead_only,
            "matchedCount": len(matched),
            "actualStats": actual_stats,
            "forecastStats": forecast_stats,
            "records": matched[:limit] if limit else matched
        }
    except ElexonAPIError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Matching pipeline error: {str(e)}")
