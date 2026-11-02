import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Filter, RotateCcw, Check, AlertCircle } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';

export default function DateRangeFilter() {
  const {
    startDate,
    endDate,
    cutoffTime,
    intervalMode,
    setIntervalMode,
    applyFilters,
    resetFilters,
    filterMeta,
    loading,
  } = useDashboard();

  // Local draft state for explicit Apply / Reset interaction
  const [draftStart, setDraftStart] = useState(startDate);
  const [draftEnd, setDraftEnd] = useState(endDate);
  const [draftCutoff, setDraftCutoff] = useState(cutoffTime);
  const [validationError, setValidationError] = useState(null);

  // Keep draft in sync with external context updates (e.g., resets or presets)
  useEffect(() => {
    setDraftStart(startDate);
    setDraftEnd(endDate);
    setDraftCutoff(cutoffTime);
    setValidationError(null);
  }, [startDate, endDate, cutoffTime]);

  // Validate dates
  useEffect(() => {
    if (draftStart && draftEnd && draftStart > draftEnd) {
      setValidationError('Start date must be on or before end date.');
    } else {
      setValidationError(null);
    }
  }, [draftStart, draftEnd]);

  const hasChanges =
    draftStart !== startDate || draftEnd !== endDate || draftCutoff !== cutoffTime;

  const handleApply = (e) => {
    e?.preventDefault();
    if (validationError) return;
    applyFilters({
      startDate: draftStart,
      endDate: draftEnd,
      cutoffTime: draftCutoff,
    });
  };

  const handleReset = () => {
    resetFilters();
  };

  const presets = [
    { label: 'Jan 1–3', start: '2026-01-01', end: '2026-01-03' },
    { label: 'Jan 1–7 (Week 1)', start: '2026-01-01', end: '2026-01-07' },
    { label: 'Jan 1–15 (Mid-Month)', start: '2026-01-01', end: '2026-01-15' },
    { label: 'Jan 1–31 (Full Month)', start: '2026-01-01', end: '2026-01-31' },
  ];

  const cutoffTimes = filterMeta?.availableCutoffTimes || ['09:00', '10:00', '11:00', '12:00', '14:00'];

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-sm space-y-3.5">
      <form onSubmit={handleApply} className="flex flex-wrap items-center justify-between gap-4">
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
              value={draftStart}
              onChange={(e) => setDraftStart(e.target.value)}
              disabled={loading}
              className="text-xs font-mono px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              min="2026-01-01"
              max="2026-01-31"
              value={draftEnd}
              onChange={(e) => setDraftEnd(e.target.value)}
              disabled={loading}
              className="text-xs font-mono px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Cutoff & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Decision Cutoff Selector */}
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-sky-600" />
            <label htmlFor="cutoff-select" className="text-xs font-semibold text-slate-700">
              Cutoff:
            </label>
            <select
              id="cutoff-select"
              value={draftCutoff}
              onChange={(e) => setDraftCutoff(e.target.value)}
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
              type="button"
              onClick={() => setIntervalMode('30min')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                intervalMode === '30min'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30-Min
            </button>
            <button
              type="button"
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

          {/* Apply & Reset Buttons */}
          <div className="flex items-center space-x-2">
            <button
              type="submit"
              disabled={loading || !!validationError || !hasChanges}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shadow-xs ${
                hasChanges && !validationError
                  ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-sm ring-2 ring-sky-300'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              Apply Filter
            </button>

            <button
              type="button"
              onClick={handleReset}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 transition-colors"
              title="Reset to default (Jan 1-3, 11:00 UTC)"
            >
              <RotateCcw className="w-3 h-3 text-slate-400" />
              Reset
            </button>
          </div>
        </div>
      </form>

      {/* Validation alert */}
      {validationError && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Preset Pills */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
        <span className="text-[11px] font-medium text-slate-400 mr-1 flex items-center gap-1">
          <Filter className="w-3 h-3" /> Quick Presets:
        </span>
        {presets.map((preset) => {
          const isActive = startDate === preset.start && endDate === preset.end;
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setDraftStart(preset.start);
                setDraftEnd(preset.end);
                applyFilters({
                  startDate: preset.start,
                  endDate: preset.end,
                  cutoffTime: draftCutoff,
                });
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
