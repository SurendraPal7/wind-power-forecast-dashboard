import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, date, timedelta
from app.services.elexon_client import ElexonClient
from app.utils.datetime_utils import to_iso_utc_string, to_utc_datetime

logger = logging.getLogger(__name__)


class ActualGenerationService:
    """
    Service responsible for retrieving and isolating actual wind generation data
    from the Elexon FUELHH stream.
    """

    def __init__(self, client: Optional[ElexonClient] = None):
        self.client = client or ElexonClient()

    def fetch_actual_wind(
        self,
        start_date: str = "2026-01-01",
        end_date: str = "2026-01-01",
        use_cache: bool = True,
        force_refresh: bool = False,
    ) -> List[Dict[str, Any]]:
        """
        Fetch actual wind generation records between start_date and end_date.
        
        Uses settlementDateFrom and settlementDateTo to query FUELHH/stream,
        and enforces fuelType = 'WIND'.
        """
        # Ensure UTC date strings
        start_dt = to_utc_datetime(start_date)
        end_dt = to_utc_datetime(end_date)
        
        start_date_str = start_dt.strftime("%Y-%m-%d")
        end_date_str = end_dt.strftime("%Y-%m-%d")
        
        params = {
            "settlementDateFrom": start_date_str,
            "settlementDateTo": end_date_str,
            "fuelType": "WIND"
        }
        
        raw_records = self.client.fetch_stream(
            dataset="FUELHH",
            params=params,
            use_cache=use_cache,
            force_refresh=force_refresh
        )
        
        wind_records: List[Dict[str, Any]] = []
        for r in raw_records:
            # Enforce fuelType = 'WIND' even if API returns others
            if str(r.get("fuelType", "")).upper() != "WIND":
                continue
            
            wind_records.append({
                "dataset": "FUELHH",
                "fuelType": "WIND",
                "startTime": r.get("startTime"),
                "publishTime": r.get("publishTime"),
                "generation": r.get("generation"),
                "settlementDate": r.get("settlementDate"),
                "settlementPeriod": r.get("settlementPeriod"),
                "rawRecord": r
            })
            
        logger.info(f"Retrieved {len(wind_records)} actual WIND records from FUELHH for {start_date_str} to {end_date_str}")
        return wind_records

    def fetch_january_2026_wind(
        self,
        use_cache: bool = True,
        force_refresh: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Convenience method to retrieve actual wind generation for the entire month of January 2026.
        """
        return self.fetch_actual_wind(
            start_date="2026-01-01",
            end_date="2026-01-31",
            use_cache=use_cache,
            force_refresh=force_refresh
        )
