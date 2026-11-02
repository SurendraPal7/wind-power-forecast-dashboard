import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.services.elexon_client import ElexonClient, ElexonAPIError
from app.services.actual_generation_service import ActualGenerationService
from app.services.data_cleaning_service import DataCleaningService
from app.services.forecast_accuracy_service import ForecastAccuracyService

client = TestClient(app)


def test_actual_generation_service_fuel_filtering():
    """Verify that ActualGenerationService filters exclusively for WIND fuelType."""
    mock_elexon = MagicMock()
    mock_elexon.fetch_stream.return_value = [
        {"startTime": "2026-01-01T00:00:00Z", "fuelType": "WIND", "generation": 12000.0},
        {"startTime": "2026-01-01T00:00:00Z", "fuelType": "CCGT", "generation": 18000.0},
        {"startTime": "2026-01-01T00:00:00Z", "fuelType": "NUCLEAR", "generation": 5000.0},
        {"startTime": "2026-01-01T00:30:00Z", "fuelType": "WIND", "generation": 12500.0},
    ]

    service = ActualGenerationService(client=mock_elexon)
    records = service.fetch_actual_wind(start_date="2026-01-01", end_date="2026-01-01")

    assert len(records) == 2
    for r in records:
        assert r["fuelType"] == "WIND"


def test_elexon_client_invalid_json_payload():
    """Verify ElexonClient handles malformed or unexpected responses gracefully."""
    elexon = ElexonClient(max_retries=1)
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.text = "<html>502 Bad Gateway</html>"
    mock_resp.json.side_effect = ValueError("Invalid JSON")

    with patch.object(elexon, "_get_client") as mock_get_client:
        mock_http = MagicMock()
        mock_http.get.return_value = mock_resp
        mock_get_client.return_value.__enter__.return_value = mock_http

        with pytest.raises(ElexonAPIError) as exc_info:
            elexon.fetch_stream("FUELHH", use_cache=False)
        assert "Malformed JSON received from Elexon" in str(exc_info.value)


def test_accuracy_all_zero_actuals_mape_none():
    """When all actual generation records are 0 MW, MAPE must return None (not divide by zero)."""
    acc_service = ForecastAccuracyService()
    records = [
        {"actualGeneration": 0.0, "forecastGeneration": 50.0},
        {"actualGeneration": 0.0, "forecastGeneration": 120.0},
    ]
    res = acc_service.calculate_aggregate_metrics(records)
    assert res["totalObservations"] == 2
    assert res["zeroActualCount"] == 2
    assert res["mapeObservationsEvaluated"] == 0
    assert res["mapePercent"] is None
    assert res["maeMW"] == 85.0 # (50 + 120) / 2
    assert res["biasMW"] == 85.0


def test_api_invalid_date_format():
    """Test endpoint validation on non-ISO date string."""
    response = client.get("/api/v1/actual-generation?start_date=01-01-2026&end_date=2026-01-02")
    assert response.status_code == 400
    assert "Invalid date format" in response.json()["detail"]


def test_api_comparison_limit_parameter():
    """Verify limit parameter is enforced in comparison endpoint."""
    mock_matched = [
        {
            "startTime": f"2026-01-01T{i:02d}:00:00Z",
            "publishTime": "2025-12-31T09:00:00Z",
            "actualGeneration": 1000.0,
            "forecastGeneration": 1100.0,
            "absoluteError": 100.0,
            "error": 100.0,
            "percentageError": 10.0
        }
        for i in range(10)
    ]
    with patch("app.api.dashboard._get_matched_data", return_value=([], [], mock_matched, {}, {})):
        response = client.get("/api/v1/dashboard/comparison?start_date=2026-01-01&end_date=2026-01-01&limit=3")
        assert response.status_code == 200
        data = response.json()
        assert len(data["records"]) == 3
        assert data["totalRecords"] == 10
