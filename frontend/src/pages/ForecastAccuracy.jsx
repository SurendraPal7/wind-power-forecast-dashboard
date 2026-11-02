import React from 'react';
import { useDashboard } from '../context/DashboardContext';
import DateRangeFilter from '../components/DateRangeFilter';
import KPICard from '../components/KPICard';
import AccuracyChart from '../components/AccuracyChart';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import { Target, Percent, TrendingUp, AlertCircle, Info, ShieldCheck } from 'lucide-react';

export default function ForecastAccuracy() {
  const { summary, accuracy, daily, loading, error, refreshData } = useDashboard();

  if (loading && !accuracy) {
    return <LoadingState message="Calculating quantitative accuracy metrics..." />;
  }

  if (error && !accuracy) {
    return <ErrorState error={error} onRetry={refreshData} />;
  }

  const explanations = accuracy?.metricExplanations || {};

  return (
    <div className="space-y-6">
      <DateRangeFilter />

      {/* Accuracy Metric Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Mean Absolute Error (MAE)"
          value={summary?.maeMW !== undefined ? summary.maeMW.toLocaleString() : '—'}
          unit="MW"
          icon={Target}
          subtitle="Expected volume mismatch"
          badge="VOLUME RISK"
          badgeType="warning"
        />

        <KPICard
          title="Mean Abs Percentage (MAPE)"
          value={summary?.mapePercent !== null && summary?.mapePercent !== undefined ? summary.mapePercent : '—'}
          unit="%"
          icon={Percent}
          subtitle={`${summary?.zeroActualCount || 0} zero actuals excluded`}
          badge="RELATIVE RISK"
          badgeType="neutral"
        />

        <KPICard
          title="Root Mean Sq Error (RMSE)"
          value={summary?.rmseMW !== undefined ? summary.rmseMW.toLocaleString() : '—'}
          unit="MW"
          icon={AlertCircle}
          subtitle="Large error penalty"
          badge="PEAK RISK"
          badgeType="negative"
        />

        <KPICard
          title="Forecast Bias (Mean Signed)"
          value={summary?.forecastBiasMW !== undefined ? (summary.forecastBiasMW > 0 ? `+${summary.forecastBiasMW}` : summary.forecastBiasMW) : '—'}
          unit="MW"
          icon={TrendingUp}
          subtitle={summary?.forecastBiasMW > 0 ? 'Over-forecast tendency' : 'Under-forecast tendency'}
          badge={summary?.forecastBiasMW > 0 ? 'OVER-HEDGE' : 'UNDER-HEDGE'}
          badgeType={summary?.forecastBiasMW > 0 ? 'info' : 'warning'}
        />
      </div>

      {/* Accuracy Charts */}
      <AccuracyChart
        dailyMetrics={daily?.dailyMetrics || []}
        diurnalProfile={accuracy?.diurnalProfile || []}
        height={380}
      />

      {/* Daily Metrics Breakdown Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h4 className="text-sm font-bold text-slate-900">Daily Forecast Accuracy Performance</h4>
          <p className="text-xs text-slate-500 mt-0.5">Summary of error metrics aggregated by delivery day</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
              <tr>
                <th className="py-2.5 px-4">Delivery Date</th>
                <th className="py-2.5 px-3 text-right">Periods</th>
                <th className="py-2.5 px-3 text-right">Avg Forecast (MW)</th>
                <th className="py-2.5 px-3 text-right">Avg Actual (MW)</th>
                <th className="py-2.5 px-3 text-right">MAE (MW)</th>
                <th className="py-2.5 px-3 text-right">MAPE (%)</th>
                <th className="py-2.5 px-3 text-right">RMSE (MW)</th>
                <th className="py-2.5 px-4 text-right">Forecast Bias (MW)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {(daily?.dailyMetrics || []).map((d, i) => (
                <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-4 font-bold text-slate-900">{d.date}</td>
                  <td className="py-2.5 px-3 text-right text-slate-500">{d.observationCount}</td>
                  <td className="py-2.5 px-3 text-right font-medium text-sky-700">{Math.round(d.averageForecastMW).toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right font-medium text-emerald-700">{Math.round(d.averageActualMW).toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-amber-700">{d.maeMW.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right text-slate-700">{d.mapePercent !== null ? `${d.mapePercent}%` : '—'}</td>
                  <td className="py-2.5 px-3 text-right text-slate-600">{d.rmseMW.toLocaleString()}</td>
                  <td className={`py-2.5 px-4 text-right font-semibold ${d.biasMW > 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                    {d.biasMW > 0 ? `+${d.biasMW}` : d.biasMW}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Metric Definitions & Methodology Guide */}
      <div className="bg-slate-900 text-slate-100 rounded-xl p-6 shadow-md border border-slate-800 space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <Info className="w-5 h-5 text-sky-400" />
          <h4 className="text-sm font-bold text-white">Quantitative Analytics Methodology</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
          {Object.entries(explanations).map(([key, item]) => (
            <div key={key} className="p-3.5 rounded-lg bg-slate-800/80 border border-slate-700/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sky-400 text-xs">{item.name}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-700 text-slate-300 font-mono">
                  {item.unit}
                </span>
              </div>
              <p className="font-mono text-[11px] text-slate-300 bg-slate-950 px-2 py-1 rounded">
                Formula: {item.formula}
              </p>
              <p className="text-slate-400 text-[11px] leading-relaxed">{item.interpretation}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
