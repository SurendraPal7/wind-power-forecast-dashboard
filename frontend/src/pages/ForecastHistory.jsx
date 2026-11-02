import React, { useState, useEffect } from 'react';
import { useDashboard } from '../context/DashboardContext';
import DateRangeFilter from '../components/DateRangeFilter';
import ForecastHistoryTable from '../components/ForecastHistoryTable';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import SkeletonLoader from '../components/SkeletonLoader';
import { getForecastHistory } from '../services/forecastService';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { History, Clock, ArrowRight, GitCompare, ShieldAlert } from 'lucide-react';

export default function ForecastHistory() {
  const { comparison, cutoffTime } = useDashboard();
  const [selectedInterval, setSelectedInterval] = useState('2026-01-02T12:00:00Z');
  const [vintagesData, setVintagesData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Selected vintages for comparison
  const [compareA, setCompareA] = useState(null);
  const [compareB, setCompareB] = useState(null);

  // Available intervals from active comparison dataset
  const availableIntervals = (comparison?.records || []).slice(0, 48).map((r) => r.startTime);

  const fetchVintages = async (startTime) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getForecastHistory({
        start_time: startTime,
        cutoff_time: cutoffTime,
      });
      setVintagesData(data);

      // Auto-set comparison defaults
      const eligible = (data?.vintages || []).filter((v) => v.isEligible);
      if (eligible.length >= 2) {
        setCompareA(eligible[0]);
        setCompareB(eligible[eligible.length - 1]);
      } else if (eligible.length === 1) {
        setCompareA(eligible[0]);
        setCompareB(null);
      } else {
        setCompareA(null);
        setCompareB(null);
      }
    } catch (err) {
      setError(err.normalizedMessage || err.message || 'Failed to fetch vintage history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedInterval) {
      fetchVintages(selectedInterval);
    }
  }, [selectedInterval, cutoffTime]);

  const vintages = vintagesData?.vintages || [];
  const eligibleVintages = vintages.filter((v) => v.isEligible);

  // Format chart data for vintage progression
  const chartData = vintages.map((v) => ({
    publishLabel: v.publishTime ? v.publishTime.slice(5, 16).replace('T', ' ') : '',
    generation: v.generation,
    isEligible: v.isEligible,
    isSelected: v.isSelected,
    leadTimeHours: v.leadTimeHours,
  }));

  return (
    <div className="space-y-6">
      <DateRangeFilter />

      {/* Target Interval Selector Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-sky-100 text-sky-700">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Forecast Revision & Publication Vintage Audit
              </h3>
              <p className="text-xs text-slate-500">
                Inspect how wind generation forecasts evolved over time leading up to delivery
              </p>
            </div>
          </div>

          {/* Interval Selector */}
          <div className="flex items-center space-x-2">
            <label htmlFor="target-interval-select" className="text-xs font-semibold text-slate-700">
              Target Delivery Interval:
            </label>
            <select
              id="target-interval-select"
              value={selectedInterval}
              onChange={(e) => setSelectedInterval(e.target.value)}
              className="text-xs font-mono px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {availableIntervals.length > 0 ? (
                availableIntervals.map((st) => (
                  <option key={st} value={st}>
                    {st.replace('T', ' ').replace('Z', ' UTC')}
                  </option>
                ))
              ) : (
                <option value="2026-01-02T12:00:00Z">2026-01-02 12:00:00 UTC</option>
              )}
            </select>
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 leading-relaxed">
          <strong>Trading Decision Rule:</strong> Day-Ahead purchasing decisions are committed at{' '}
          <code>{cutoffTime} UTC on Day D-1</code>. Every forecast published <em>before</em> the cutoff is eligible. The engine selects the latest eligible forecast (highlighted in blue). Forecasts published <em>after</em> the cutoff are excluded to guarantee zero look-ahead bias.
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <SkeletonLoader type="chart" />
          <SkeletonLoader type="table" count={5} />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => fetchVintages(selectedInterval)} />
      ) : vintages.length === 0 ? (
        <EmptyState
          title="No Forecast Vintages Found"
          description={`No WINDFOR forecast publications found for target interval ${selectedInterval}.`}
        />
      ) : (
        <>
          {/* Vintage Evolution Chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Forecast Evolution Across Publication Vintages
                </h4>
                <p className="text-xs text-slate-500">
                  Progression of forecasted MW as new meteorological model runs were published
                </p>
              </div>
              <div className="text-xs font-mono px-2.5 py-1 rounded bg-slate-100 text-slate-700">
                Selected for Day-Ahead: <span className="font-bold text-sky-700">{vintagesData?.selectedForecastMW} MW</span>
              </div>
            </div>

            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 15, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="publishLabel"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                    label={{ value: 'Publication Timestamp (UTC)', position: 'insideBottom', offset: -15, fontSize: 11, fill: '#94a3b8' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(1)}k MW`}
                    label={{ value: 'Forecasted Output (MW)', angle: -90, position: 'insideLeft', offset: -5, fontSize: 11, fill: '#94a3b8' }}
                  />
                  <Tooltip
                    formatter={(val, name, item) => [
                      `${Number(val).toLocaleString()} MW (${item.payload.isEligible ? 'Pre-Cutoff' : 'Post-Cutoff'})`,
                      'Forecast',
                    ]}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8, color: '#fff', fontSize: 12, fontFamily: 'monospace' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="generation"
                    name="Forecast MW"
                    stroke="#0284c7"
                    strokeWidth={2.5}
                    dot={(dotProps) => {
                      const { cx, cy, payload } = dotProps;
                      if (payload.isSelected) {
                        return <circle key={cx} cx={cx} cy={cy} r={6} fill="#0284c7" stroke="#fff" strokeWidth={2} />;
                      }
                      if (!payload.isEligible) {
                        return <circle key={cx} cx={cx} cy={cy} r={4} fill="#f43f5e" />;
                      }
                      return <circle key={cx} cx={cx} cy={cy} r={4} fill="#10b981" />;
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Compare Between Eligible Vintages */}
          {eligibleVintages.length >= 2 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                <GitCompare className="w-4 h-4 text-sky-600" />
                <h4 className="text-sm font-bold text-slate-900">
                  Compare Eligible Forecast Vintages Prior to Gate Closure
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Vintage A Selector */}
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2">
                  <span className="text-xs font-semibold text-slate-700">Baseline Vintage:</span>
                  <select
                    value={compareA?.publishTime || ''}
                    onChange={(e) => setCompareA(eligibleVintages.find((v) => v.publishTime === e.target.value))}
                    className="w-full text-xs font-mono p-2 rounded-lg border border-slate-300 bg-white"
                  >
                    {eligibleVintages.map((v) => (
                      <option key={v.publishTime} value={v.publishTime}>
                        {v.publishTime.slice(5, 16).replace('T', ' ')} UTC — {v.generation} MW ({v.leadTimeHours}h lead)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Vintage B Selector */}
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2">
                  <span className="text-xs font-semibold text-slate-700">Compared Vintage:</span>
                  <select
                    value={compareB?.publishTime || ''}
                    onChange={(e) => setCompareB(eligibleVintages.find((v) => v.publishTime === e.target.value))}
                    className="w-full text-xs font-mono p-2 rounded-lg border border-slate-300 bg-white"
                  >
                    {eligibleVintages.map((v) => (
                      <option key={v.publishTime} value={v.publishTime}>
                        {v.publishTime.slice(5, 16).replace('T', ' ')} UTC — {v.generation} MW {v.isSelected ? '(SELECTED)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {compareA && compareB && (
                <div className="p-3 bg-sky-50/60 rounded-lg border border-sky-200 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
                  <div>
                    <span className="text-slate-500">Forecast Revision Delta: </span>
                    <span className={`font-bold ${compareB.generation - compareA.generation >= 0 ? 'text-blue-700' : 'text-rose-700'}`}>
                      {compareB.generation - compareA.generation >= 0 ? '+' : ''}
                      {Math.round(compareB.generation - compareA.generation).toLocaleString()} MW
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500">Lead Time Advance: </span>
                    <span className="font-bold text-slate-800">
                      {Math.abs(compareA.leadTimeHours - compareB.leadTimeHours)} hours closer to delivery
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500">Final Engine Selection: </span>
                    <span className="font-bold text-sky-700">
                      {compareB.isSelected ? 'Compared Vintage' : compareA.isSelected ? 'Baseline Vintage' : 'Later pre-cutoff vintage'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Full Vintages Table */}
          <ForecastHistoryTable
            vintages={vintages}
            targetStartTime={vintagesData?.targetStartTime || selectedInterval}
            decisionCutoffUTC={vintagesData?.decisionCutoffUTC || `${cutoffTime} UTC`}
          />
        </>
      )}
    </div>
  );
}
