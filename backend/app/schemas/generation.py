from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class ActualGenerationRecord(BaseModel):
    startTime: str = Field(..., description="Target settlement start time (UTC ISO-8601)")
    generation: float = Field(..., description="Actual wind generation in MW")
    fuelType: str = Field("WIND", description="Fuel type identifier (WIND)")
    publishTime: Optional[str] = Field(None, description="Actual data publication time (UTC ISO-8601)")
    settlementDate: Optional[str] = Field(None, description="Settlement date (YYYY-MM-DD)")
    settlementPeriod: Optional[int] = Field(None, description="Half-hourly settlement period (1-50)")
    rawRecord: Optional[Dict[str, Any]] = Field(None, description="Original raw record for auditing")


class ForecastGenerationRecord(BaseModel):
    startTime: str = Field(..., description="Target generation start time (UTC ISO-8601)")
    publishTime: str = Field(..., description="Forecast publication vintage time (UTC ISO-8601)")
    generation: float = Field(..., description="Forecasted wind generation in MW")
    dataset: str = Field("WINDFOR", description="Elexon dataset identifier")
    rawRecord: Optional[Dict[str, Any]] = Field(None, description="Original raw record for auditing")


class MatchedRecord(BaseModel):
    startTime: str = Field(..., description="Target generation interval start time (UTC ISO-8601)")
    publishTime: str = Field(..., description="Forecast publication time (UTC ISO-8601)")
    forecastGeneration: float = Field(..., description="Forecasted generation in MW")
    actualGeneration: float = Field(..., description="Actual generation in MW")
    absoluteError: float = Field(..., description="Absolute forecast error |forecast - actual| in MW")
    error: Optional[float] = Field(None, description="Signed error (forecast - actual) in MW")
    percentageError: Optional[float] = Field(None, description="Absolute percentage error relative to actual")
    settlementDate: Optional[str] = None
    settlementPeriod: Optional[int] = None


class ConnectivityStatus(BaseModel):
    status: str
    targetUrl: str
    latencyMs: float
    message: str
    sampleRecord: Optional[Dict[str, Any]] = None


class DatasetSummary(BaseModel):
    dataset: str
    totalRecords: int
    validRecords: int
    invalidOrDroppedRecords: int
    dateRange: Dict[str, Optional[str]]
