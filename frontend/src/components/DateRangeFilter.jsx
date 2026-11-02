import React from 'react';
import { Calendar, Clock, Filter, Layers } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';

export default function DateRangeFilter() {
  const {
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    cutoffTime,
    setCutoffTime,
    intervalMode,
    setIntervalMode,
    filterMeta,
    loading,
  } = useDashboard();

  const presets = [
    { label: 'Jan 1–3', start: '2026-01-01', end: '2026-01-03' },
    { label: 'Jan 1–7', start: '2026-01-01', end: '2026-01-07' },
    { label: 'Jan 1–15', start: '2026-01-01', end: '2026-01-15' },
    { label: 'Full Month (Jan 1–31)', start: '2026-01-01', end: '2026-01-31' },
  ];

  const cutoffTimes = filterMeta?.availableCutoffTimes || ['09:00', '10:00', '11:00', '12:00', '14:00'];

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Date Inputs */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-sky-600" />
            <span className="text-xs font-semibold text-slate-700">Delivery Window:</span>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="date"
              min="2026-01-01"
              max="2026-01-31"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={loading}
              className="text-xs font-mono px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              min={startDate || '2026-01-01'}
              max="2026-01-31"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={loading}
              className="text-xs font-mono px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Cutoff Time & Resolution */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Decision Cutoff Selector */}
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-sky-600" />
            <label htmlFor="cutoff-select" className="text-xs font-semibold text-slate-700">
              Auction Cutoff:
            </label>
            <select
              id="cutoff-select"
              value={cutoffTime}
              onChange={(e) => setCutoffTime(e.target.value)}
              disabled={loading}
              className="text-xs font-mono px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
            >
              {cutoffTimes.map((t) => (
                <option key={t} value={t}>
                  {t} UTC (Day D-1)
                </option>
              ))}
            </select>
          </div>

          {/* Granularity Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setIntervalMode('30min')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                intervalMode === '30min'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30-Min (HH)
            </button>
            <button
              onClick={() => setIntervalMode('daily')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                intervalMode === 'daily'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daily
            </button>
          </div>
        </div>
      </div>

      {/* Preset Pills */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
        <span className="text-[11px] font-medium text-slate-400 mr-1 flex items-center gap-1">
          <Filter className="w-3 h-3" /> Quick Scopes:
        </span>
        {presets.map((preset) => {
          const isActive = startDate === preset.start && endDate === preset.end;
          return (
            <button
              key={preset.label}
              onClick={() => {
                setStartDate(preset.start);
                setEndDate(preset.end);
              }}
              disabled={loading}
              className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                isActive
                  ? 'bg-sky-50 border-sky-300 text-sky-700 font-semibold'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
