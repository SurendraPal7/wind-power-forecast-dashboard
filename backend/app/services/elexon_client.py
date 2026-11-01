import time
import logging
from typing import Dict, Any, List, Optional
import httpx
from app.core.config import settings
from app.utils.cache import get_cached, set_cached

logger = logging.getLogger(__name__)


class ElexonAPIError(Exception):
    """Raised when Elexon BMRS API returns an error or malformed payload."""
    def __init__(self, message: str, status_code: Optional[int] = None, response_text: Optional[str] = None):
        super().__init__(message)
        self.status_code = status_code
        self.response_text = response_text


class ElexonClient:
    """
    Production-grade HTTP client for the official Elexon Insights Solution (BMRS) API.
    Features:
      - Exponential backoff retries for transient failures (429, 500, 502, 503, 504)
      - Configurable timeout and connection pooling
      - Robust payload parsing supporting list and wrapped JSON objects
      - Seamless caching to avoid repetitive heavy queries
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        timeout: float = 60.0,
        max_retries: int = 3,
        backoff_factor: float = 1.0,
    ):
        self.base_url = (base_url or settings.ELEXON_BASE_URL).rstrip("/")
        self.timeout = timeout
        self.max_retries = max_retries
        self.backoff_factor = backoff_factor

    def _get_client(self) -> httpx.Client:
        return httpx.Client(
            base_url=self.base_url,
            timeout=httpx.Timeout(self.timeout, connect=15.0),
            headers={
                "Accept": "application/json",
                "User-Agent": "UK-Wind-Energy-Analytics-Dashboard/1.0"
            },
            follow_redirects=True,
        )

    def fetch_stream(
        self,
        dataset: str,
        params: Optional[Dict[str, Any]] = None,
        use_cache: bool = True,
        force_refresh: bool = False,
    ) -> List[Dict[str, Any]]:
        """
        Fetch records from /datasets/{dataset}/stream with query parameters and retry logic.
        """
        endpoint = f"/datasets/{dataset}/stream"
        clean_params = {k: v for k, v in (params or {}).items() if v is not None}
        cache_key = f"{dataset}_{sorted(clean_params.items())}"

        if use_cache and not force_refresh:
            cached_data = get_cached(cache_key)
            if cached_data is not None:
                logger.info(f"Loaded {len(cached_data)} records for {dataset} from local cache.")
                return cached_data

        url = f"{self.base_url}{endpoint}"
        last_exception = None

        with self._get_client() as client:
            for attempt in range(1, self.max_retries + 1):
                try:
                    logger.info(f"Querying Elexon {endpoint} (Attempt {attempt}/{self.max_retries}) params={clean_params}")
                    response = client.get(endpoint, params=clean_params)

                    if response.status_code == 200:
                        try:
                            payload = response.json()
                        except Exception as e:
                            raise ElexonAPIError(
                                f"Malformed JSON received from Elexon for {dataset}: {str(e)}",
                                status_code=response.status_code,
                                response_text=response.text[:500]
                            )

                        # Parse list or wrapped object
                        if isinstance(payload, list):
                            records = payload
                        elif isinstance(payload, dict):
                            # Some endpoints wrap records in 'data' or 'items'
                            records = payload.get("data") or payload.get("items") or [payload]
                        else:
                            raise ElexonAPIError(
                                f"Unexpected payload type '{type(payload).__name__}' from Elexon API",
                                status_code=response.status_code
                            )

                        if use_cache and records:
                            set_cached(cache_key, records)

                        return records

                    # Retryable HTTP status codes
                    if response.status_code in (429, 500, 502, 503, 504):
                        sleep_time = self.backoff_factor * (2 ** (attempt - 1))
                        logger.warning(
                            f"Elexon {dataset} returned HTTP {response.status_code}. Retrying in {sleep_time}s..."
                        )
                        time.sleep(sleep_time)
                        continue

                    # Non-retryable HTTP client error
                    raise ElexonAPIError(
                        f"Elexon API error {response.status_code}: {response.text[:300]}",
                        status_code=response.status_code,
                        response_text=response.text
                    )

                except (httpx.ConnectTimeout, httpx.ReadTimeout, httpx.ConnectError) as exc:
                    last_exception = exc
                    sleep_time = self.backoff_factor * (2 ** (attempt - 1))
                    logger.warning(f"Connection error on attempt {attempt}: {exc}. Retrying in {sleep_time}s...")
                    time.sleep(sleep_time)

        raise ElexonAPIError(
            f"Failed to fetch {dataset} stream after {self.max_retries} attempts: {last_exception}"
        )

    def ping(self) -> Dict[str, Any]:
        """
        Perform a lightweight connectivity probe against Elexon BMRS API.
        """
        start_time = time.time()
        endpoint = "/datasets/FUELHH/stream"
        test_params = {
            "publishDateTimeFrom": "2026-01-01T00:00:00Z",
            "publishDateTimeTo": "2026-01-01T00:30:00Z",
            "fuelType": "WIND"
        }
        with self._get_client() as client:
            response = client.get(endpoint, params=test_params)
            latency_ms = (time.time() - start_time) * 1000
            
            if response.status_code != 200:
                raise ElexonAPIError(
                    f"Elexon connectivity check failed with status {response.status_code}",
                    status_code=response.status_code
                )
            
            data = response.json()
            return {
                "status": "connected",
                "targetUrl": f"{self.base_url}{endpoint}",
                "latencyMs": round(latency_ms, 2),
                "message": "Successfully reached official Elexon BMRS stream endpoint",
                "sampleRecord": data[0] if isinstance(data, list) and data else None
            }
