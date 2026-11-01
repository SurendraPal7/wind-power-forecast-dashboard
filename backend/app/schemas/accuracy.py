from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class IntervalAccuracyRecord(BaseModel):
    """Granular error breakdown for a single 30-minute settlement interval."""
    startTime: str = Field(..., description="Settlement interval start time (UTC ISO-8601)")
    publishTime: Optional[str] = Field(None, description="Day-ahead forecast publication timestamp (UTC ISO-8601)")
    settlementDate: Optional[str] = Field(None, description="Settlement date (YYYY-MM-DD)")
    settlementPeriod: Optional[int] = Field(None, description="Settlement period index (1 to 48/50)")
    actualGeneration: float = Field(..., description="Actual wind generation in MW")
    forecastGeneration: float = Field(..., description="Selected day-ahead forecast generation in MW")
    absoluteError: float = Field(..., description="Absolute forecast error |actual - forecast| in MW")
    error: float = Field(..., description="Signed forecast error (forecast - actual) in MW; positive = over-forecast")
    percentageError: Optional[float] = Field(None, description="Absolute percentage error (|actual - forecast| / actual) * 100; None if actual is zero")
    isZeroActual: bool = Field(False, description="Flag indicating if actual generation was zero")


class MetricSummary(BaseModel):
    """Overall aggregate accuracy metrics for a given observation period."""
    totalObservations: int = Field(..., description="Number of valid matched 30-min settlement intervals")
    maeMW: float = Field(..., description="Mean Absolute Error in MW (sum(|actual - forecast|) / N)")
    mapePercent: Optional[float] = Field(None, description="Mean Absolute Percentage Error in % (excluding zero actuals)")
    rmseMW: float = Field(..., description="Root Mean Square Error in MW (sqrt(mean((actual - forecast)^2)))")
    biasMW: float = Field(..., description="Forecast Bias in MW (mean(forecast - actual)); positive = over-forecast")
    averageActualMW: float = Field(..., description="Mean actual wind generation across valid intervals in MW")
    averageForecastMW: float = Field(..., description="Mean day-ahead forecast generation across valid intervals in MW")
    maxAbsoluteErrorMW: float = Field(..., description="Maximum absolute error recorded in MW")
    minAbsoluteErrorMW: Optional[float] = Field(None, description="Minimum absolute error recorded in MW")
    zeroActualCount: int = Field(..., description="Settlement intervals where actual generation was 0 MW (excluded from MAPE)")
    missingActualCount: int = Field(0, description="Target intervals missing actual generation data")
    missingForecastCount: int = Field(0, description="Target intervals missing eligible forecast data")
    dataCompletenessPercent: float = Field(..., description="Percentage of expected settlement intervals successfully matched")
    metricExplanations: Optional[Dict[str, str]] = Field(None, description="Human-readable mathematical definitions and business interpretations")


class DailyAccuracyMetric(BaseModel):
    """Daily aggregated accuracy metrics for trend analysis."""
    date: str = Field(..., description="Settlement date (YYYY-MM-DD)")
    observationCount: int = Field(..., description="Number of valid matched intervals for the day")
    maeMW: float = Field(..., description="Daily Mean Absolute Error in MW")
    mapePercent: Optional[float] = Field(None, description="Daily Mean Absolute Percentage Error in %")
    rmseMW: float = Field(..., description="Daily Root Mean Square Error in MW")
    biasMW: float = Field(..., description="Daily Forecast Bias in MW (forecast - actual)")
    averageActualMW: float = Field(..., description="Daily average actual generation in MW")
    averageForecastMW: float = Field(..., description="Daily average forecast generation in MW")
    zeroActualCount: int = Field(0, description="Settlement intervals with zero actual generation excluded from MAPE")
    missingActualCount: int = Field(0, description="Expected intervals missing actual generation data")
    missingForecastCount: int = Field(0, description="Expected intervals missing eligible forecast data")


class SettlementPeriodProfile(BaseModel):
    """Diurnal accuracy profile across the 48 half-hourly settlement periods."""
    settlementPeriod: int = Field(..., description="Half-hourly period index (1 to 48)")
    timeLabel: str = Field(..., description="Settlement interval window label (e.g. '00:00 - 00:30')")
    observationCount: int = Field(..., description="Number of historical days aggregated for this period")
    maeMW: float = Field(..., description="Period Mean Absolute Error in MW")
    mapePercent: Optional[float] = Field(None, description="Period Mean Absolute Percentage Error in %")
    rmseMW: float = Field(..., description="Period Root Mean Square Error in MW")
    biasMW: float = Field(..., description="Period Forecast Bias in MW")
    averageActualMW: float = Field(..., description="Period average actual generation in MW")
    averageForecastMW: float = Field(..., description="Period average forecast generation in MW")
    zeroActualCount: int = Field(0, description="Count of zero-actual intervals in this settlement period")


class AccuracyAnalysisResponse(BaseModel):
    """Full quantitative analytics response envelope."""
    periodStart: str
    periodEnd: str
    decisionCutoffPolicy: str
    decisionCutoffTimeUTC: str
    summary: MetricSummary
    dailyMetrics: List[DailyAccuracyMetric]
    diurnalProfile: List[SettlementPeriodProfile]
    matchedIntervalsCount: int
    metricExplanations: Optional[Dict[str, str]] = None
    records: Optional[List[IntervalAccuracyRecord]] = None
