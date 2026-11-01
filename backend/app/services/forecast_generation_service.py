import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from app.services.elexon_client import ElexonClient
from app.utils.datetime_utils import to_iso_utc_string, to_utc_datetime

logger = logging.getLogger(__name__)


class ForecastGenerationService:
    """
    Service responsible for retrieving national wind generation forecasts
    from the Elexon WINDFOR stream.
    """

    def __init__(self, client: Optional[ElexonClient] = None):
        self.client = client or ElexonClient()

    def fetch_forecasts_by_publish_window(
        self,
        publish_from: str,
        publish_to: str,
        use_cache: bool = True,
        force_refresh: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Fetch forecast records published within a given time window.
        """
        p_from_iso = to_iso_utc_string(publish_from)
        p_to_iso = to_iso_utc_string(publish_to)
        
        params = {
            "publishDateTimeFrom": p_from_iso,
            "publishDateTimeTo": p_to_iso
        }
        
        raw_records = self.client.fetch_stream(
            dataset="WINDFOR",
            params=params,
            use_cache=use_cache,
            force_refresh=force_refresh
        )
        
        forecast_records: List[Dict[str, Any]] = []
        for r in raw_records:
            forecast_records.append({
                "dataset": "WINDFOR",
                "startTime": r.get("startTime"),
                "publishTime": r.get("publishTime"),
                "generation": r.get("generation"),
                "rawRecord": r
            })
            
        logger.info(f"Retrieved {len(forecast_records)} forecast records published between {p_from_iso} and {p_to_iso}")
        return forecast_records

    def fetch_forecasts_for_target_day(
        self,
        target_date: str = "2026-01-01",
        lookback_days: int = 1,
        use_cache: bool = True,
        force_refresh: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Fetch forecasts relevant for a target delivery day.
        
        To capture day-ahead and intra-day forecasts for target delivery on `target_date`,
        we query publication times spanning from (target_date - lookback_days) up to the end of target_date.
        """
        target_dt = to_utc_datetime(target_date)
        pub_start = target_dt - timedelta(days=lookback_days)
        pub_end = target_dt + timedelta(days=1, seconds=-1)
        
        return self.fetch_forecasts_by_publish_window(
            publish_from=to_iso_utc_string(pub_start),
            publish_to=to_iso_utc_string(pub_end),
            use_cache=use_cache,
            force_refresh=force_refresh
        )

    def fetch_forecast_range(
        self,
        start_date: str,
        end_date: str,
        lookback_days: int = 1,
        use_cache: bool = True,
        force_refresh: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Fetch forecast vintages covering a multi-day target delivery date range.
        Pub window spans from (start_date - lookback_days) to (end_date 23:59:59Z).
        """
        start_dt = to_utc_datetime(start_date)
        end_dt = to_utc_datetime(end_date)
        pub_start = start_dt - timedelta(days=lookback_days)
        pub_end = end_dt + timedelta(days=1, seconds=-1)

        return self.fetch_forecasts_by_publish_window(
            publish_from=to_iso_utc_string(pub_start),
            publish_to=to_iso_utc_string(pub_end),
            use_cache=use_cache,
            force_refresh=force_refresh
        )

    def fetch_january_2026_forecasts(
        self,
        use_cache: bool = True,
        force_refresh: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Retrieve forecast records relevant for January 2026 electricity purchasing.
        Publication window spans from 2025-12-31T00:00:00Z to 2026-01-31T23:59:59Z.
        """
        return self.fetch_forecasts_by_publish_window(
            publish_from="2025-12-31T00:00:00Z",
            publish_to="2026-01-31T23:59:59Z",
            use_cache=use_cache,
            force_refresh=force_refresh
        )
