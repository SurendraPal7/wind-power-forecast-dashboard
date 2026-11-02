import React from 'react';
import { useDashboard } from '../context/DashboardContext';
import DateRangeFilter from '../components/DateRangeFilter';
import KPICard from '../components/KPICard';
import GenerationChart from '../components/GenerationChart';
import AccuracyChart from '../components/AccuracyChart';
import DataTable from '../components/DataTable';
import SkeletonLoader from '../components/SkeletonLoader';
import ErrorState from '../components/ErrorState';
import { Wind, Activity, Target, Percent, TrendingUp, CheckCircle } from 'lucide-react';

export default function Overview() {
  const { summary, comparison, accuracy, daily, loading, error, refreshData } = useDashboard();

  if (loading && !summary) {
    return (
      <div className="space-y-6">
        <DateRangeFilter />
        <SkeletonLoader type="card" count={6} />
        <SkeletonLoader type="chart" />
        <SkeletonLoader type="table" count={6} />
      </div>
    );
  }

  if (error && !summary) {
    return <ErrorState error={error} onRetry={refreshData} />;
  }

  const isPositiveBias = summary?.forecastBiasMW > 0;

  return (
    <div className="space-y-6">
      {/* Date & Policy Filter Bar */}
      <DateRangeFilter />

      {/* KPI Cards Grid (6 Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard
          title="Avg Forecast"
          value={summary?.averageForecastMW !== undefined ? summary.averageForecastMW.toLocaleString() : '—'}
          unit="MW"
          icon={Wind}
          subtitle="Day-Ahead Volume"
          tooltip="Average Day-Ahead wind forecast for purchasing commitment"
        />

        <KPICard
          title="Avg Actual"
          value={summary?.averageActualMW !== undefined ? summary.averageActualMW.toLocaleString() : '—'}
          unit="MW"
          icon={Activity}
          subtitle="Metered Generation"
          badge="FUELHH"
          badgeType="positive"
          tooltip="Average actual wind generation metered by Elexon"
        />

        <KPICard
          title="MAE"
          value={summary?.maeMW !== undefined ? summary.maeMW.toLocaleString() : '—'}
          unit="MW"
          icon={Target}
          subtitle="Mean Absolute Error"
          tooltip="Average absolute volume mismatch per 30-min settlement period"
        />

        <KPICard
          title="MAPE"
          value={summary?.mapePercent !== null && summary?.mapePercent !== undefined ? summary.mapePercent : '—'}
          unit="%"
          icon={Percent}
          subtitle={`${summary?.zeroActualCount || 0} zero actuals excluded`}
          tooltip="Mean Absolute Percentage Error relative to non-zero actuals"
        />

        <KPICard
          title="Forecast Bias"
          value={summary?.forecastBiasMW !== undefined ? (isPositiveBias ? `+${summary.forecastBiasMW}` : summary.forecastBiasMW) : '—'}
          unit="MW"
          icon={TrendingUp}
          subtitle={isPositiveBias ? 'Over-forecasting risk' : 'Under-forecasting risk'}
          badge={isPositiveBias ? 'LONG BIAS' : 'SHORT BIAS'}
          badgeType={isPositiveBias ? 'info' : 'warning'}
          tooltip="Mean signed error (Forecast - Actual). Positive indicates systematic over-forecast"
        />

        <KPICard
          title="Matched Periods"
          value={summary?.totalMatchedObservations || 0}
          unit="SP"
          icon={CheckCircle}
          subtitle={`${summary?.dataCompletenessPercent || 100}% completeness`}
          badge={`${summary?.missingForecastCount || 0} missing`}
          badgeType={summary?.missingForecastCount ? 'warning' : 'positive'}
          tooltip="Total valid 30-min settlement intervals matched without zero fabrication"
        />
      </div>

      {/* Primary Generation Comparison Chart */}
      <GenerationChart data={comparison?.records || []} height={420} />

      {/* Accuracy Charts Section */}
      <div className="grid grid-cols-1 gap-6">
        <AccuracyChart
          dailyMetrics={daily?.dailyMetrics || []}
          diurnalProfile={accuracy?.diurnalProfile || []}
          height={340}
        />
      </div>

      {/* Data Table */}
      <DataTable
        records={comparison?.records || []}
        title="Half-Hourly Settlement Delivery & Accuracy Records"
      />
    </div>
  );
}
