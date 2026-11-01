"""
Root / top-level alias for ForecastAccuracyService.
Re-exports app.services.forecast_accuracy_service for flexible import paths.
"""
import sys
import os

backend_path = os.path.dirname(os.path.abspath(__file__))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.services.forecast_accuracy_service import (
    ForecastAccuracyService,
    METRIC_EXPLANATIONS,
)

__all__ = ["ForecastAccuracyService", "METRIC_EXPLANATIONS"]
