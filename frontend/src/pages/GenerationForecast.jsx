import React from 'react';
import { useDashboard } from '../context/DashboardContext';
import DateRangeFilter from '../components/DateRangeFilter';
import KPICard from '../components/KPICard';
import GenerationChart from '../components/GenerationChart';
import DataTable from '../components/DataTable';
import SkeletonLoader from '../components/SkeletonLoader';
import ErrorState from '../components/ErrorState';
import { Wind, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function GenerationForecast() {
  const { summary, comparison, loading, error, refreshData } = useDashboard();

  if (loading && !comparison) {
    return (
      <div className="space-y-6">
        <DateRangeFilter />
        <SkeletonLoader type="card" count={3} />
        <SkeletonLoader type="chart" />
        <SkeletonLoader type="table" count={5} />
      </div>
    );
  }

  if (error && !comparison) {
    return <ErrorState error={error} onRetry={refreshData} />;
  }

  const avgFc = summary?.averageForecastMW || 0;
  const avgAct = summary?.averageActualMW || 0;
  const variance = Math.round(avgFc - avgAct);

  return (
    <div className="space-y-6">
      <DateRangeFilter />

      {/* Generation Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          title="Day-Ahead Forecast Power"
          value={avgFc.toLocaleString()}
          unit="MW"
          icon={Wind}
          subtitle="Average expected volume"
          badge="WINDFOR"
          badgeType="info"
        />

        <KPICard
          title="Metered Actual Wind"
          value={avgAct.toLocaleString()}
          unit="MW"
          icon={Activity}
          subtitle="Average delivered volume"
          badge="FUELHH"
          badgeType="positive"
        />

        <KPICard
          title="Net Volume Variance"
          value={`${variance > 0 ? '+' : ''}${variance.toLocaleString()}`}
          unit="MW"
          icon={variance > 0 ? ArrowUpRight : ArrowDownRight}
          subtitle={variance > 0 ? 'Net forecast surplus' : 'Net forecast deficit'}
          badge={variance > 0 ? 'SURPLUS' : 'DEFICIT'}
          badgeType={variance > 0 ? 'info' : 'warning'}
        />
      </div>

      {/* Large Generation Chart */}
      <GenerationChart data={comparison?.records || []} height={450} />

      {/* Detailed Settlement Breakdown */}
      <DataTable
        records={comparison?.records || []}
        title="Day-Ahead Forecast vs Delivery Table"
      />
    </div>
  );
}
