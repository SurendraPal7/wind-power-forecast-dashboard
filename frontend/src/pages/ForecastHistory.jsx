import React, { useState, useEffect } from 'react';
import { useDashboard } from '../context/DashboardContext';
import DateRangeFilter from '../components/DateRangeFilter';
import ForecastHistoryTable from '../components/ForecastHistoryTable';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import { getForecastHistory } from '../services/forecastService';
import { History, Calendar, Clock, ArrowRight } from 'lucide-react';

export default function ForecastHistory() {
  const { comparison, cutoffTime } = useDashboard();
  const [selectedInterval, setSelectedInterval] = useState('2026-01-02T12:00:00Z');
  const [vintagesData, setVintagesData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load available target intervals from current comparison records
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
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to fetch vintage history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedInterval) {
      fetchVintages(selectedInterval);
    }
  }, [selectedInterval, cutoffTime]);

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
                Inspect historical forecast updates for a specific settlement delivery interval
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
          <strong>Trading Decision Rule:</strong> The application audits every forecast revision published by Elexon for the selected delivery interval. Only the <em>latest forecast published before the {cutoffTime} UTC Day-Ahead cutoff</em> was eligible for the day-ahead wholesale electricity purchase. Later revisions are labeled <code>POST_CUTOFF_EXCLUDED</code> to prevent look-ahead bias.
        </div>
      </div>

      {loading ? (
        <LoadingState message={`Auditing forecast publication vintages for ${selectedInterval}...`} />
      ) : error ? (
        <ErrorState error={error} onRetry={() => fetchVintages(selectedInterval)} />
      ) : (
        <ForecastHistoryTable
          vintages={vintagesData?.vintages || []}
          targetStartTime={vintagesData?.targetStartTime || selectedInterval}
          decisionCutoffUTC={vintagesData?.decisionCutoffUTC || `${cutoffTime} UTC`}
        />
      )}
    </div>
  );
}
