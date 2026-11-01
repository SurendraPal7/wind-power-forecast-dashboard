import pytest
from datetime import datetime, timezone
from app.core.decision_cutoff_config import DecisionCutoffPolicy
from app.services.forecast_selection_service import ForecastSelectionService


@pytest.fixture
def policy():
    # Day-Ahead cutoff: 11:00 UTC on Day D-1
    return DecisionCutoffPolicy(
        policy_name="TEST_DAY_AHEAD_1100",
        cutoff_time_utc="11:00",
        day_offset=1
    )


@pytest.fixture
def service(policy):
    return ForecastSelectionService(default_policy=policy)


# 1. Forecast published before the cutoff -> SELECTED
def test_forecast_published_before_cutoff(service, policy):
    # Delivery on 2026-01-02: Cutoff is 2026-01-01T11:00:00Z
    forecasts = [
        {"startTime": "2026-01-02T12:00:00Z", "publishTime": "2026-01-01T09:30:00Z", "generation": 10500.0}
    ]
    res = service.select_forecasts_for_delivery_day(forecasts, delivery_date="2026-01-02", policy=policy)
    selected = [f for f in res.selected_forecasts if f["startTime"] == "2026-01-02T12:00:00Z"]

    assert len(selected) == 1
    assert selected[0]["generation"] == 10500.0
    assert selected[0]["publishTime"] == "2026-01-01T09:30:00Z"
    assert selected[0]["decisionCutoffUTC"] == "2026-01-01T11:00:00Z"


# 2. Forecast published exactly at the cutoff -> ELIGIBLE & SELECTED
def test_forecast_published_exactly_at_cutoff(service, policy):
    # Cutoff is 2026-01-01T11:00:00Z
    forecasts = [
        {"startTime": "2026-01-02T12:00:00Z", "publishTime": "2026-01-01T11:00:00Z", "generation": 11000.0}
    ]
    res = service.select_forecasts_for_delivery_day(forecasts, delivery_date="2026-01-02", policy=policy)
    selected = [f for f in res.selected_forecasts if f["startTime"] == "2026-01-02T12:00:00Z"]

    assert len(selected) == 1
    assert selected[0]["generation"] == 11000.0
    assert selected[0]["publishTime"] == "2026-01-01T11:00:00Z"


# 3. Forecast published after the cutoff -> NEVER SELECTED
def test_forecast_published_after_cutoff(service, policy):
    # Cutoff is 2026-01-01T11:00:00Z; Forecast published at 11:30:00Z (post-cutoff)
    forecasts = [
        {"startTime": "2026-01-02T12:00:00Z", "publishTime": "2026-01-01T11:30:00Z", "generation": 12500.0}
    ]
    res = service.select_forecasts_for_delivery_day(forecasts, delivery_date="2026-01-02", policy=policy)
    selected = [f for f in res.selected_forecasts if f["startTime"] == "2026-01-02T12:00:00Z"]
    unavailable = [u for u in res.unavailable_intervals if u["startTime"] == "2026-01-02T12:00:00Z"]

    assert len(selected) == 0
    assert len(unavailable) == 1
    assert unavailable[0]["status"] == "UNAVAILABLE"
    assert unavailable[0]["postCutoffCandidatesCount"] == 1


# 4. Multiple forecasts for the same target interval -> LATEST ELIGIBLE SELECTED
def test_multiple_forecasts_same_target_interval(service, policy):
    forecasts = [
        # Vintage 1: Very early (06:00 UTC) -> Eligible
        {"startTime": "2026-01-02T12:00:00Z", "publishTime": "2026-01-01T06:00:00Z", "generation": 9000.0},
        # Vintage 2: Closer to cutoff (10:30 UTC) -> Eligible and latest pre-cutoff
        {"startTime": "2026-01-02T12:00:00Z", "publishTime": "2026-01-01T10:30:00Z", "generation": 9800.0},
        # Vintage 3: Post-cutoff (14:00 UTC) -> INELIGIBLE
        {"startTime": "2026-01-02T12:00:00Z", "publishTime": "2026-01-01T14:00:00Z", "generation": 10200.0},
        # Vintage 4: Delivery day intra-day (2026-01-02T08:00:00Z) -> INELIGIBLE
        {"startTime": "2026-01-02T12:00:00Z", "publishTime": "2026-01-02T08:00:00Z", "generation": 11500.0},
    ]
    res = service.select_forecasts_for_delivery_day(forecasts, delivery_date="2026-01-02", policy=policy)
    selected = [f for f in res.selected_forecasts if f["startTime"] == "2026-01-02T12:00:00Z"]

    assert len(selected) == 1
    # Must pick Vintage 2 (10:30 UTC, 9800 MW)
    assert selected[0]["publishTime"] == "2026-01-01T10:30:00Z"
    assert selected[0]["generation"] == 9800.0
    assert selected[0]["eligibleVintagesCount"] == 2
    assert selected[0]["totalVintagesEvaluated"] == 4


# 5. No eligible forecast -> REPORTED AS UNAVAILABLE (NO ZERO FABRICATION)
def test_no_eligible_forecast(service, policy):
    # Only forecast for target interval was published post-cutoff
    forecasts = [
        {"startTime": "2026-01-02T04:00:00Z", "publishTime": "2026-01-01T18:00:00Z", "generation": 7000.0}
    ]
    res = service.select_forecasts_for_delivery_day(forecasts, delivery_date="2026-01-02", policy=policy)
    unavailable = [u for u in res.unavailable_intervals if u["startTime"] == "2026-01-02T04:00:00Z"]

    assert len(unavailable) == 1
    assert "No forecast published on or before decision cutoff" in unavailable[0]["reason"]


# 6. Missing delivery intervals -> REPORTED AS UNAVAILABLE
def test_missing_delivery_intervals_detection(service, policy):
    # Empty forecast input
    res = service.select_forecasts_for_delivery_day([], delivery_date="2026-01-02", policy=policy)
    # Standard UK delivery day has exactly 48 half-hourly settlement intervals
    assert res.total_intervals == 48
    assert len(res.selected_forecasts) == 0
    assert len(res.unavailable_intervals) == 48
    # All intervals 1 to 48 flagged unavailable
    assert [u["settlementPeriod"] for u in res.unavailable_intervals] == list(range(1, 49))


# 7. Different delivery dates -> CALCULATES CORRECT D-1 CUTOFF FOR EACH
def test_different_delivery_dates(service):
    # Test Policy 12:00 UTC cutoff
    custom_policy = DecisionCutoffPolicy(cutoff_time_utc="12:00", day_offset=1)

    # Delivery Date 1: 2026-01-10 -> Cutoff: 2026-01-09T12:00:00Z
    cutoff_1 = custom_policy.calculate_cutoff_datetime("2026-01-10")
    assert cutoff_1.strftime("%Y-%m-%dT%H:%M:%SZ") == "2026-01-09T12:00:00Z"

    # Delivery Date 2: 2026-01-25 -> Cutoff: 2026-01-24T12:00:00Z
    cutoff_2 = custom_policy.calculate_cutoff_datetime("2026-01-25")
    assert cutoff_2.strftime("%Y-%m-%dT%H:%M:%SZ") == "2026-01-24T12:00:00Z"


# 8. Vintage Audit Trail
def test_vintage_audit_trail(service, policy):
    target_start = "2026-01-02T18:00:00Z"
    forecasts = [
        {"startTime": target_start, "publishTime": "2026-01-01T04:00:00Z", "generation": 14000.0},
        {"startTime": target_start, "publishTime": "2026-01-01T10:00:00Z", "generation": 14800.0},
        {"startTime": target_start, "publishTime": "2026-01-01T16:00:00Z", "generation": 15200.0},
    ]
    audit = service.get_vintage_audit_trail(forecasts, target_start, policy=policy)
    assert len(audit) == 3

    # Vintage 04:00 -> Eligible, superseded
    assert audit[0]["publishTime"] == "2026-01-01T04:00:00Z"
    assert audit[0]["isEligible"] is True
    assert audit[0]["status"] == "ELIGIBLE_SUPERSEDED"

    # Vintage 10:00 -> Eligible, SELECTED
    assert audit[1]["publishTime"] == "2026-01-01T10:00:00Z"
    assert audit[1]["isEligible"] is True
    assert audit[1]["isSelected"] is True
    assert audit[1]["status"] == "SELECTED"

    # Vintage 16:00 -> Post-cutoff, EXCLUDED
    assert audit[2]["publishTime"] == "2026-01-01T16:00:00Z"
    assert audit[2]["isEligible"] is False
    assert audit[2]["isSelected"] is False
    assert audit[2]["status"] == "POST_CUTOFF_EXCLUDED"
