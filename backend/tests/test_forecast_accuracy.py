import pytest
import math
from app.services.forecast_accuracy_service import ForecastAccuracyService


@pytest.fixture
def service():
    return ForecastAccuracyService()


# --- 1. Interval Level Error Calculations ---
def test_interval_errors_exact_math(service):
    # Over-forecast case
    res1 = service.calculate_interval_errors(actual_gen=1000.0, forecast_gen=1100.0)
    assert res1["absoluteError"] == 100.0
    assert res1["signedError"] == 100.0    # Forecast - Actual = +100
    assert res1["squaredError"] == 10000.0
    assert res1["percentageError"] == 10.0 # (100 / 1000) * 100

    # Under-forecast case
    res2 = service.calculate_interval_errors(actual_gen=2000.0, forecast_gen=1800.0)
    assert res2["absoluteError"] == 200.0
    assert res2["signedError"] == -200.0   # Forecast - Actual = -200
    assert res2["squaredError"] == 40000.0
    assert res2["percentageError"] == 10.0 # (200 / 2000) * 100

    # Zero actual generation case: percentageError must be None
    res3 = service.calculate_interval_errors(actual_gen=0.0, forecast_gen=50.0)
    assert res3["absoluteError"] == 50.0
    assert res3["signedError"] == 50.0
    assert res3["percentageError"] is None


# --- 2. Known Hand-Calculated Aggregate Metrics ---
def test_aggregate_metrics_known_values(service):
    """
    Test with 4 known records:
      1: Actual 1000, Forecast 1100 -> abs=100, signed=+100, sq=10000, pct=10%
      2: Actual 2000, Forecast 1800 -> abs=200, signed=-200, sq=40000, pct=10%
      3: Actual 1500, Forecast 1500 -> abs=0,   signed=0,    sq=0,     pct=0%
      4: Actual 500,  Forecast 700  -> abs=200, signed=+200, sq=40000, pct=40%

    Expected:
      MAE = 500 / 4 = 125.0 MW
      Bias = 100 / 4 = +25.0 MW
      RMSE = sqrt(90000 / 4) = sqrt(22500) = 150.0 MW
      MAPE = (10 + 10 + 0 + 40) / 4 = 15.0 %
    """
    records = [
        {"actualGeneration": 1000.0, "forecastGeneration": 1100.0},
        {"actualGeneration": 2000.0, "forecastGeneration": 1800.0},
        {"actualGeneration": 1500.0, "forecastGeneration": 1500.0},
        {"actualGeneration": 500.0,  "forecastGeneration": 700.0},
    ]

    metrics = service.calculate_aggregate_metrics(records)

    assert metrics["totalObservations"] == 4
    assert metrics["maeMW"] == 125.0
    assert metrics["biasMW"] == 25.0
    assert metrics["rmseMW"] == 150.0
    assert metrics["mapePercent"] == 15.0
    assert metrics["maxAbsoluteErrorMW"] == 200.0
    assert metrics["zeroActualCount"] == 0
    assert metrics["averageActualMW"] == 1250.0
    assert metrics["averageForecastMW"] == 1275.0


# --- 3. Zero Actual Values Safe Handling in MAPE ---
def test_mape_excludes_zero_actuals(service):
    """
    Test safe exclusion of zero actuals from MAPE:
      Record 1: actual=0, forecast=100 -> abs=100 (excluded from MAPE)
      Record 2: actual=200, forecast=250 -> abs=50, pct=25%
      Record 3: actual=400, forecast=340 -> abs=60, pct=15%
    
    Expected:
      zeroActualCount = 1
      MAPE = (25% + 15%) / 2 = 20.0%
      MAE = (100 + 50 + 60) / 3 = 70.0 MW
    """
    records = [
        {"actualGeneration": 0.0, "forecastGeneration": 100.0},
        {"actualGeneration": 200.0, "forecastGeneration": 250.0},
        {"actualGeneration": 400.0, "forecastGeneration": 340.0},
    ]

    metrics = service.calculate_aggregate_metrics(records)

    assert metrics["totalObservations"] == 3
    assert metrics["zeroActualCount"] == 1
    assert metrics["mapeObservationsEvaluated"] == 2
    assert metrics["mapePercent"] == 20.0
    assert metrics["maeMW"] == 70.0


# --- 4. Systematic Negative Bias (Under-forecasting) ---
def test_systematic_under_forecast_bias(service):
    records = [
        {"actualGeneration": 5000.0, "forecastGeneration": 4000.0}, # -1000
        {"actualGeneration": 6000.0, "forecastGeneration": 5500.0}, # -500
    ]
    metrics = service.calculate_aggregate_metrics(records)
    assert metrics["biasMW"] == -750.0
    assert metrics["maeMW"] == 750.0


# --- 5. Empty Records Handling ---
def test_empty_records_handling(service):
    metrics = service.calculate_aggregate_metrics(
        [],
        missing_actual_count=5,
        missing_forecast_count=3
    )
    assert metrics["totalObservations"] == 0
    assert metrics["maeMW"] == 0.0
    assert metrics["mapePercent"] is None
    assert metrics["missingActualCount"] == 5
    assert metrics["missingForecastCount"] == 3
    assert metrics["dataCompletenessPercent"] == 0.0


# --- 6. Daily Metrics Breakdown ---
def test_daily_metrics_breakdown(service):
    records = [
        # Day 1: 2026-01-01
        {"startTime": "2026-01-01T00:00:00Z", "settlementDate": "2026-01-01", "actualGeneration": 1000.0, "forecastGeneration": 1100.0},
        {"startTime": "2026-01-01T00:30:00Z", "settlementDate": "2026-01-01", "actualGeneration": 1200.0, "forecastGeneration": 1100.0},
        # Day 2: 2026-01-02
        {"startTime": "2026-01-02T00:00:00Z", "settlementDate": "2026-01-02", "actualGeneration": 2000.0, "forecastGeneration": 2200.0},
    ]

    daily = service.calculate_daily_metrics(records)
    assert len(daily) == 2

    d1 = next(d for d in daily if d["date"] == "2026-01-01")
    assert d1["observationCount"] == 2
    assert d1["maeMW"] == 100.0 # (|100| + |100|) / 2 = 100

    d2 = next(d for d in daily if d["date"] == "2026-01-02")
    assert d2["observationCount"] == 1
    assert d2["maeMW"] == 200.0


# --- 7. Settlement Period Diurnal Profile (1 to 48) ---
def test_settlement_period_diurnal_profile(service):
    records = [
        # Period 1 (00:00)
        {"settlementPeriod": 1, "actualGeneration": 3000.0, "forecastGeneration": 3300.0},
        {"settlementPeriod": 1, "actualGeneration": 3500.0, "forecastGeneration": 3600.0},
        # Period 2 (00:30)
        {"settlementPeriod": 2, "actualGeneration": 4000.0, "forecastGeneration": 4200.0},
    ]

    profile = service.calculate_settlement_period_profile(records)
    assert len(profile) == 48

    p1 = profile[0]
    assert p1["settlementPeriod"] == 1
    assert p1["timeLabel"] == "00:00 - 00:30"
    assert p1["observationCount"] == 2
    assert p1["maeMW"] == 200.0 # (300 + 100) / 2 = 200.0
    assert p1["biasMW"] == 200.0

    p2 = profile[1]
    assert p2["settlementPeriod"] == 2
    assert p2["observationCount"] == 1
    assert p2["maeMW"] == 200.0

    # Unpopulated period (e.g. Period 48)
    p48 = profile[47]
    assert p48["settlementPeriod"] == 48
    assert p48["observationCount"] == 0
    assert p48["maeMW"] == 0.0
