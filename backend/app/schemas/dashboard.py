from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from app.schemas.accuracy import MetricSummary, DailyAccuracyMetric, SettlementPeriodProfile
from app.schemas.generation import ActualGenerationRecord, ForecastGenerationRecord


class HealthStatusResponse(BaseModel):
    status: str = Field(..., description="Service status (ok)")
    service: str = Field(..., description="Service name")
    environment: str = Field(..., description="Active environment")
    timestamp_utc: str = Field(..., description="Current UTC timestamp")
    version: str = Field(..., description="API Version")


class ActualGenerationListResponse(BaseModel):
    dataset: str = "FUELHH"
    fuelType: str = "WIND"
    startDate: str
    endDate: str
    count: int
    records: List[ActualGenerationRecord]


class ForecastGenerationListResponse(BaseModel):
    dataset: str = "WINDFOR"
    deliveryDate: str
    decisionCutoffUTC: str
    policy: str
    count: int
    unavailableCount: int
    records: List[Dict[str, Any]]


class DashboardSummaryResponse(BaseModel):
    periodStart: str
    periodEnd: str
    decisionCutoffPolicy: str
    decisionCutoffTimeUTC: str
    averageForecastMW: float = Field(..., description="Average day-ahead wind forecast in MW")
    averageActualMW: float = Field(..., description="Average actual wind generation in MW")
    maeMW: float = Field(..., description="Mean Absolute Error in MW")
    mapePercent: Optional[float] = Field(None, description="Mean Absolute Percentage Error in %")
    rmseMW: float = Field(..., description="Root Mean Square Error in MW")
    forecastBiasMW: float = Field(..., description="Forecast Bias in MW (mean(forecast - actual))")
    totalMatchedObservations: int = Field(..., description="Total valid matched 30-min settlement intervals")
    missingActualCount: int = Field(0, description="Settlement intervals missing actual generation")
    missingForecastCount: int = Field(0, description="Settlement intervals missing day-ahead forecast")
    zeroActualCount: int = Field(0, description="Settlement intervals with 0 MW actuals (excluded from MAPE)")
    dataCompletenessPercent: float = Field(..., description="Percentage of expected intervals matched")


class ComparisonRecord(BaseModel):
    startTime: str = Field(..., description="Settlement start time (UTC ISO-8601)")
    publishTime: str = Field(..., description="Selected forecast publication vintage (UTC ISO-8601)")
    settlementDate: Optional[str] = None
    settlementPeriod: Optional[int] = None
    actualGeneration: float = Field(..., description="Actual wind generation in MW")
    forecastGeneration: float = Field(..., description="Day-ahead forecasted generation in MW")
    absoluteError: float = Field(..., description="|actual - forecast| in MW")
    error: float = Field(..., description="forecast - actual in MW (positive = over-forecast)")
    percentageError: Optional[float] = Field(None, description="Absolute error as percentage of actual generation")


class DashboardComparisonResponse(BaseModel):
    periodStart: str
    periodEnd: str
    decisionCutoffTimeUTC: str
    totalRecords: int
    records: List[ComparisonRecord]


class DashboardAccuracyResponse(BaseModel):
    periodStart: str
    periodEnd: str
    summary: MetricSummary
    diurnalProfile: List[SettlementPeriodProfile]
    metricExplanations: Dict[str, Dict[str, str]]


class DashboardDailyResponse(BaseModel):
    periodStart: str
    periodEnd: str
    totalDays: int
    dailyMetrics: List[DailyAccuracyMetric]


class VintageHistoryRecord(BaseModel):
    startTime: str
    publishTime: str
    generation: float
    decisionCutoffUTC: str
    isEligible: bool
    isSelected: bool
    status: str
    leadTimeHours: float


class ForecastHistoryResponse(BaseModel):
    targetStartTime: str
    decisionCutoffUTC: str
    totalVintages: int
    vintages: List[VintageHistoryRecord]


class FiltersMetadataResponse(BaseModel):
    scopeDescription: str
    defaultStartDate: str
    defaultEndDate: str
    availableDateRange: Dict[str, str]
    defaultCutoffTimeUTC: str
    availableCutoffTimes: List[str]
    defaultPolicy: str
    availablePolicies: List[Dict[str, str]]
    settlementPeriodsPerDay: int
