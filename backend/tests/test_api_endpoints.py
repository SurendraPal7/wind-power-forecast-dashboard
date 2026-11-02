import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from app.main import app

client = TestClient(app)


# 1. Test /api/v1/health
def test_get_health_endpoint():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "timestamp_utc" in data
    assert "service" in data


# 2. Test /api/v1/filters
def test_get_filters_endpoint():
    response = client.get("/api/v1/filters")
    assert response.status_code == 200
    data = response.json()
    assert "defaultStartDate" in data
    assert "defaultEndDate" in data
    assert "availablePolicies" in data
    assert len(data["availablePolicies"]) >= 1
    assert data["settlementPeriodsPerDay"] == 48


# 3. Test /api/v1/actual-generation
def test_get_actual_generation_endpoint():
    mock_records = [
        {"startTime": "2026-01-01T00:00:00Z", "generation": 12000.0, "fuelType": "WIND"},
        {"startTime": "2026-01-01T00:30:00Z", "generation": 12500.0, "fuelType": "WIND"},
    ]
    with patch("app.api.dashboard.actual_service.fetch_actual_wind", return_value=mock_records):
        response = client.get("/api/v1/actual-generation?start_date=2026-01-01&end_date=2026-01-01")
        assert response.status_code == 200
        data = response.json()
        assert data["dataset"] == "FUELHH"
        assert data["fuelType"] == "WIND"
        assert data["count"] == 2
        assert len(data["records"]) == 2


# 4. Test /api/v1/actual-generation validation error (start_date > end_date)
def test_get_actual_generation_invalid_date_order():
    response = client.get("/api/v1/actual-generation?start_date=2026-01-05&end_date=2026-01-01")
    assert response.status_code == 400
    assert "cannot be later than end_date" in response.json()["detail"]


# 5. Test /api/v1/forecast-generation
def test_get_forecast_generation_endpoint():
    mock_forecasts = [
        {"startTime": "2026-01-02T00:00:00Z", "publishTime": "2026-01-01T09:30:00Z", "generation": 15000.0}
    ]
    with patch("app.api.dashboard.forecast_service.fetch_forecasts_for_target_day", return_value=mock_forecasts):
        response = client.get("/api/v1/forecast-generation?delivery_date=2026-01-02&cutoff_time=11:00")
        assert response.status_code == 200
        data = response.json()
        assert data["dataset"] == "WINDFOR"
        assert data["deliveryDate"] == "2026-01-02"
        assert data["count"] == 1


# 6. Test /api/v1/dashboard/summary
def test_get_dashboard_summary_endpoint():
    mock_matched = [
        {"startTime": "2026-01-01T00:00:00Z", "actualGeneration": 10000.0, "forecastGeneration": 11000.0, "absoluteError": 1000.0},
        {"startTime": "2026-01-01T00:30:00Z", "actualGeneration": 12000.0, "forecastGeneration": 11500.0, "absoluteError": 500.0},
    ]
    with patch("app.api.dashboard._get_matched_data", return_value=([], [], mock_matched, {}, {})):
        response = client.get("/api/v1/dashboard/summary?start_date=2026-01-01&end_date=2026-01-01")
        assert response.status_code == 200
        data = response.json()
        assert data["totalMatchedObservations"] == 2
        assert data["maeMW"] == 750.0 # (1000 + 500) / 2
        assert "averageActualMW" in data
        assert "averageForecastMW" in data
        assert "rmseMW" in data
        assert "forecastBiasMW" in data


# 7. Test /api/v1/dashboard/comparison
def test_get_dashboard_comparison_endpoint():
    mock_matched = [
        {
            "startTime": "2026-01-01T00:00:00Z",
            "publishTime": "2025-12-31T09:30:00Z",
            "settlementDate": "2026-01-01",
            "settlementPeriod": 1,
            "actualGeneration": 14000.0,
            "forecastGeneration": 14500.0,
            "absoluteError": 500.0,
            "error": 500.0,
            "percentageError": 3.57
        }
    ]
    with patch("app.api.dashboard._get_matched_data", return_value=([], [], mock_matched, {}, {})):
        response = client.get("/api/v1/dashboard/comparison?start_date=2026-01-01&end_date=2026-01-01")
        assert response.status_code == 200
        data = response.json()
        assert data["totalRecords"] == 1
        assert len(data["records"]) == 1
        assert data["records"][0]["forecastGeneration"] == 14500.0


# 8. Test /api/v1/dashboard/accuracy
def test_get_dashboard_accuracy_endpoint():
    mock_matched = [
        {"settlementPeriod": 1, "startTime": "2026-01-01T00:00:00Z", "actualGeneration": 10000.0, "forecastGeneration": 11000.0, "absoluteError": 1000.0}
    ]
    with patch("app.api.dashboard._get_matched_data", return_value=([], [], mock_matched, {}, {})):
        response = client.get("/api/v1/dashboard/accuracy?start_date=2026-01-01&end_date=2026-01-01")
        assert response.status_code == 200
        data = response.json()
        assert "summary" in data
        assert "diurnalProfile" in data
        assert len(data["diurnalProfile"]) == 48
        assert "metricExplanations" in data


# 9. Test /api/v1/dashboard/daily
def test_get_dashboard_daily_endpoint():
    mock_matched = [
        {"settlementDate": "2026-01-01", "startTime": "2026-01-01T00:00:00Z", "actualGeneration": 10000.0, "forecastGeneration": 11000.0, "absoluteError": 1000.0}
    ]
    with patch("app.api.dashboard._get_matched_data", return_value=([], [], mock_matched, {}, {})):
        response = client.get("/api/v1/dashboard/daily?start_date=2026-01-01&end_date=2026-01-01")
        assert response.status_code == 200
        data = response.json()
        assert data["totalDays"] == 1
        assert len(data["dailyMetrics"]) == 1
        assert data["dailyMetrics"][0]["date"] == "2026-01-01"


# 10. Test /api/v1/forecast-history
def test_get_forecast_history_endpoint():
    mock_forecasts = [
        {"startTime": "2026-01-02T12:00:00Z", "publishTime": "2026-01-01T06:00:00Z", "generation": 12000.0},
        {"startTime": "2026-01-02T12:00:00Z", "publishTime": "2026-01-01T09:30:00Z", "generation": 12400.0},
    ]
    with patch("app.api.dashboard.forecast_service.fetch_forecasts_for_target_day", return_value=mock_forecasts):
        response = client.get("/api/v1/forecast-history?start_time=2026-01-02T12:00:00Z&cutoff_time=11:00")
        assert response.status_code == 200
        data = response.json()
        assert data["targetStartTime"] == "2026-01-02T12:00:00Z"
        assert data["totalVintages"] == 2
        assert len(data["vintages"]) == 2
