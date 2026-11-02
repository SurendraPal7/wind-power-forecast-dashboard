import React, { useState, useEffect } from 'react';
import { useDashboard } from '../context/DashboardContext';
import DateRangeFilter from '../components/DateRangeFilter';
import DataTable from '../components/DataTable';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import { getActualGeneration, getForecastGeneration } from '../services/forecastService';
import { Database, Activity, Wind, Layers } from 'lucide-react';

export default function DataExplorer() {
  const { comparison, startDate, endDate, cutoffTime, policyName, loading: mainLoading, error: mainError, refreshData } = useDashboard();
  
  const [activeTab, setActiveTab] = useState('matched'); // 'matched' | 'actuals' | 'forecasts'
  const [rawActuals, setRawActuals] = useState(null);
  const [rawForecasts, setRawForecasts] = useState(null);
  const [tabLoading, setTabLoading] = useState(false);
  const [tabError, setTabError] = useState(null);

  // Load raw actuals when activeTab is 'actuals'
  useEffect(() => {
    if (activeTab === 'actuals') {
      setTabLoading(true);
      setTabError(null);
      getActualGeneration({ start_date: startDate, end_date: endDate, limit: 200 })
        .then((data) => setRawActuals(data))
        .catch((err) => setTabError(err.normalizedMessage || err.message))
        .finally(() => setTabLoading(false));
    }
  }, [activeTab, startDate, endDate]);

  // Load raw forecasts when activeTab is 'forecasts'
  useEffect(() => {
    if (activeTab === 'forecasts') {
      setTabLoading(true);
      setTabError(null);
      getForecastGeneration({ delivery_date: startDate, cutoff_time: cutoffTime, policy_name: policyName, limit: 100 })
        .then((data) => setRawForecasts(data))
        .catch((err) => setTabError(err.normalizedMessage || err.message))
        .finally(() => setTabLoading(false));
    }
  }, [activeTab, startDate, cutoffTime, policyName]);

  if (mainLoading && !comparison) {
    return <LoadingState message="Loading settlement interval dataset..." />;
  }

  if (mainError && !comparison) {
    return <ErrorState error={mainError} onRetry={refreshData} />;
  }

  return (
    <div className="space-y-6">
      <DateRangeFilter />

      {/* Dataset View Mode Tabs */}
      <div className="flex border-b border-slate-200 space-x-4">
        <button
          onClick={() => setActiveTab('matched')}
          className={`flex items-center space-x-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'matched'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Matched Observations ({comparison?.records?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('actuals')}
          className={`flex items-center space-x-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'actuals'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Metered Actuals FUELHH ({rawActuals?.count || (activeTab === 'actuals' ? '...' : 'Stream')})</span>
        </button>

        <button
          onClick={() => setActiveTab('forecasts')}
          className={`flex items-center space-x-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'forecasts'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Wind className="w-4 h-4" />
          <span>Day-Ahead WINDFOR ({rawForecasts?.count || (activeTab === 'forecasts' ? '...' : 'Stream')})</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'matched' && (
        <DataTable
          records={comparison?.records || []}
          title="Matched Actual Wind vs Selected Day-Ahead Forecast Records"
        />
      )}

      {activeTab === 'actuals' && (
        tabLoading ? (
          <LoadingState message="Fetching raw FUELHH metered stream from Elexon..." />
        ) : tabError ? (
          <ErrorState error={tabError} onRetry={() => setActiveTab('actuals')} />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Elexon FUELHH Metered Actual Wind Generation</h4>
                <p className="text-xs text-slate-500">Dataset: FUELHH | FuelType: WIND | Total Records: {rawActuals?.count || 0}</p>
              </div>
              <span className="px-2.5 py-1 text-xs rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                Live Elexon Stream
              </span>
            </div>
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase sticky top-0">
                  <tr>
                    <th className="py-2.5 px-4">Start Time (UTC)</th>
                    <th className="py-2.5 px-3 text-right">Settlement Period</th>
                    <th className="py-2.5 px-3 text-right">Settlement Date</th>
                    <th className="py-2.5 px-4 text-right">Actual Generation (MW)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {(rawActuals?.records || []).map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-2 px-4 font-bold text-slate-900">{r.startTime}</td>
                      <td className="py-2 px-3 text-right text-slate-500">{r.settlementPeriod}</td>
                      <td className="py-2 px-3 text-right text-slate-600">{r.settlementDate}</td>
                      <td className="py-2 px-4 text-right font-bold text-emerald-700">
                        {Math.round(r.generationMW).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {activeTab === 'forecasts' && (
        tabLoading ? (
          <LoadingState message="Fetching raw WINDFOR stream and evaluating cutoff..." />
        ) : tabError ? (
          <ErrorState error={tabError} onRetry={() => setActiveTab('forecasts')} />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Selected Day-Ahead Wind Forecast Records</h4>
                <p className="text-xs text-slate-500">
                  Target Date: {rawForecasts?.deliveryDate} | Cutoff: {rawForecasts?.decisionCutoffUTC} | Matched: {rawForecasts?.count || 0}
                </p>
              </div>
              <span className="px-2.5 py-1 text-xs rounded-full bg-sky-100 text-sky-800 font-semibold">
                Cutoff Filtered
              </span>
            </div>
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase sticky top-0">
                  <tr>
                    <th className="py-2.5 px-4">Start Time (UTC)</th>
                    <th className="py-2.5 px-3">Selected Publish Vintage</th>
                    <th className="py-2.5 px-3 text-right">Period</th>
                    <th className="py-2.5 px-4 text-right">Forecast (MW)</th>
                    <th className="py-2.5 px-4 text-center">Cutoff Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {(rawForecasts?.records || []).map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-2 px-4 font-bold text-slate-900">{r.startTime}</td>
                      <td className="py-2 px-3 text-sky-700">{r.publishTime || '—'}</td>
                      <td className="py-2 px-3 text-right text-slate-500">{r.settlementPeriod}</td>
                      <td className="py-2 px-4 text-right font-bold text-sky-700">
                        {Math.round(r.generationMW || r.forecastMW || 0).toLocaleString()}
                      </td>
                      <td className="py-2 px-4 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          PRE_CUTOFF_LATEST
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
}
