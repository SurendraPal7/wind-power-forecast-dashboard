import pytest
from app.services.data_normalization_service import DataNormalizationService
from app.services.data_cleaning_service import DataCleaningService
from app.services.data_matching_service import DataMatchingService
from app.utils.datetime_utils import to_utc_datetime, to_iso_utc_string


@pytest.fixture
def normalizer():
    return DataNormalizationService()


@pytest.fixture
def cleaner(normalizer):
    return DataCleaningService(normalizer)


@pytest.fixture
def matcher():
    return DataMatchingService(default_cutoff_time="11:00")


# --- 1. Missing Records & Non-Fabrication ---
def test_missing_generation_not_substituted_with_zero(cleaner):
    raw_actuals = [
        {"startTime": "2026-01-01T00:00:00Z", "generation": None},
        {"startTime": "2026-01-01T00:30:00Z", "generation": ""},
        {"startTime": "2026-01-01T01:00:00Z", "generation": "invalid_number"},
        {"startTime": "2026-01-01T01:30:00Z", "generation": 1450.5},
    ]
    cleaned, stats = cleaner.clean_actual_records(raw_actuals)
    # Only the record with 1450.5 is valid
    assert len(cleaned) == 1
    assert stats["valid"] == 1
    assert stats["missing_or_invalid_generation"] == 3
    assert cleaned[0]["startTime"] == "2026-01-01T01:30:00Z"
    assert cleaned[0]["generation"] == 1450.5


# --- 2. Duplicate Records ---
def test_duplicate_records_handling(cleaner):
    raw_actuals = [
        {"startTime": "2026-01-01T00:00:00Z", "generation": 1000},
        {"startTime": "2026-01-01T00:00:00Z", "generation": 1000},  # duplicate
        {"startTime": "2026-01-01T00:30:00Z", "generation": 1100},
    ]
    cleaned, stats = cleaner.clean_actual_records(raw_actuals)
    assert len(cleaned) == 2
    assert stats["duplicates_removed"] == 1
    assert stats["valid"] == 2


# --- 3. Invalid Timestamps ---
def test_invalid_timestamps_handling(cleaner):
    raw_records = [
        {"startTime": "not-a-timestamp", "generation": 1200},
        {"startTime": None, "generation": 1300},
        {"startTime": "2026-01-01T00:00:00Z", "generation": 1400},
    ]
    cleaned, stats = cleaner.clean_actual_records(raw_records)
    assert len(cleaned) == 1
    assert stats["invalid_timestamp"] == 2
    assert cleaned[0]["generation"] == 1400


# --- 4. Timezone Handling ---
def test_timezone_normalization_to_utc(normalizer):
    # Offset +01:00 should normalize to UTC Z
    ts_plus_one = "2026-01-01T12:00:00+01:00"
    normalized = normalizer.normalize_timestamp(ts_plus_one)
    assert normalized == "2026-01-01T11:00:00Z"

    # Already UTC Z
    ts_z = "2026-01-01T11:00:00Z"
    assert normalizer.normalize_timestamp(ts_z) == "2026-01-01T11:00:00Z"


# --- 5. Different Publication Times (Vintages) ---
def test_forecast_vintages_preservation(cleaner):
    raw_forecasts = [
        # Two forecasts for the same target delivery startTime, but published at different times
        {"startTime": "2026-01-02T12:00:00Z", "publishTime": "2026-01-01T06:00:00Z", "generation": 8000},
        {"startTime": "2026-01-02T12:00:00Z", "publishTime": "2026-01-01T10:00:00Z", "generation": 8500},
        # Duplicate of the second vintage
        {"startTime": "2026-01-02T12:00:00Z", "publishTime": "2026-01-01T10:00:00Z", "generation": 8500},
    ]
    cleaned, stats = cleaner.clean_forecast_records(raw_forecasts)
    assert len(cleaned) == 2
    assert stats["duplicates_removed"] == 1
    assert cleaned[0]["publishTime"] == "2026-01-01T06:00:00Z"
    assert cleaned[1]["publishTime"] == "2026-01-01T10:00:00Z"


# --- 6. Matching by startTime & Non-Array-Position Dependency ---
def test_matching_actual_and_forecast_key_based(matcher):
    # Actuals ordered [Period B, Period A]
    actuals = [
        {"startTime": "2026-01-02T01:00:00Z", "generation": 5000, "settlementPeriod": 2},
        {"startTime": "2026-01-02T00:30:00Z", "generation": 4500, "settlementPeriod": 1},
    ]
    # Forecasts in reverse or scrambled order: [Period A, Period B]
    forecasts = [
        {"startTime": "2026-01-02T00:30:00Z", "publishTime": "2026-01-01T10:00:00Z", "generation": 4600},
        {"startTime": "2026-01-02T01:00:00Z", "publishTime": "2026-01-01T10:00:00Z", "generation": 4800},
    ]

    matched = matcher.match_records(actuals, forecasts, day_ahead_only=True)
    assert len(matched) == 2

    # Period A (00:30)
    match_a = next(m for m in matched if m["startTime"] == "2026-01-02T00:30:00Z")
    assert match_a["actualGeneration"] == 4500
    assert match_a["forecastGeneration"] == 4600
    assert match_a["absoluteError"] == 100  # |4600 - 4500|
    assert match_a["error"] == 100          # 4600 - 4500

    # Period B (01:00)
    match_b = next(m for m in matched if m["startTime"] == "2026-01-02T01:00:00Z")
    assert match_b["actualGeneration"] == 5000
    assert match_b["forecastGeneration"] == 4800
    assert match_b["absoluteError"] == 200  # |4800 - 5000|
    assert match_b["error"] == -200         # 4800 - 5000


# --- 7. Decision Cutoff Enforcement ---
def test_day_ahead_decision_cutoff_enforcement(matcher):
    # Delivery on 2026-01-02: Day-Ahead cutoff is 2026-01-01 at 11:00 UTC
    actuals = [
        {"startTime": "2026-01-02T14:00:00Z", "generation": 6000}
    ]
    forecasts = [
        # Vintage published before cutoff (10:00 UTC) -> VALID
        {"startTime": "2026-01-02T14:00:00Z", "publishTime": "2026-01-01T10:00:00Z", "generation": 6200},
        # Vintage published after cutoff (14:00 UTC) -> MUST BE EXCLUDED from day-ahead decision!
        {"startTime": "2026-01-02T14:00:00Z", "publishTime": "2026-01-01T14:00:00Z", "generation": 5900},
    ]

    matched = matcher.match_records(actuals, forecasts, day_ahead_only=True, cutoff_time_str="11:00")
    assert len(matched) == 1
    # Must pick the vintage published before cutoff (10:00), never the post-cutoff one (14:00)
    assert matched[0]["publishTime"] == "2026-01-01T10:00:00Z"
    assert matched[0]["forecastGeneration"] == 6200
    assert matched[0]["actualGeneration"] == 6000
    assert matched[0]["absoluteError"] == 200
