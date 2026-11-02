import React from 'react';
import { Menu, RefreshCw, Radio, Clock, Calendar, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';

export default function Header({ title, onToggleSidebar }) {
  const {
    startDate,
    endDate,
    cutoffTime,
    lastRefreshed,
    refreshStatus,
    refreshError,
    refreshData,
  } = useDashboard();

  const isRefreshing = refreshStatus === 'refreshing';
  const isSuccess = refreshStatus === 'success';
  const isError = refreshStatus === 'error';

  const formattedRefresh = lastRefreshed
    ? new Date(lastRefreshed).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'UTC',
      }) + ' UTC'
    : 'Pending first sync';

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 px-6 flex items-center justify-between shadow-xs">
      <div className="flex items-center space-x-4">
        {/* Mobile menu button */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-base font-bold text-slate-900 leading-tight">
            {title}
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="flex items-center gap-1 font-mono">
              <Calendar className="w-3 h-3 text-slate-400" />
              {startDate} → {endDate}
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3 text-slate-400" />
              Cutoff: {cutoffTime} UTC (D-1)
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Data Source Transparency Badge */}
        <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium">
          <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
          <span>Elexon BMRS Stream</span>
        </div>

        {/* Last Successful Refresh Timestamp */}
        <div className="hidden md:block text-right">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
            Last Sync
          </p>
          <p className="text-xs font-mono font-medium text-slate-700">
            {formattedRefresh}
          </p>
        </div>

        {/* Manual Refresh Button with Progress & Result Status */}
        <div className="relative">
          <button
            onClick={refreshData}
            disabled={isRefreshing}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shadow-xs ${
              isSuccess
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                : isError
                ? 'bg-rose-50 text-rose-700 border border-rose-300'
                : 'bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200'
            } disabled:opacity-60`}
            title={
              isError
                ? `Refresh failed: ${refreshError || 'Network error'}`
                : 'Query Elexon BMRS for fresh updates'
            }
          >
            {isRefreshing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-600" />
            ) : isSuccess ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : isError ? (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 text-sky-600" />
            )}

            <span className="hidden sm:inline">
              {isRefreshing
                ? 'Refreshing...'
                : isSuccess
                ? 'Synced'
                : isError
                ? 'Retry Sync'
                : 'Refresh'}
            </span>
          </button>

          {/* Error tooltip popover if refresh fails */}
          {isError && refreshError && (
            <div className="absolute right-0 top-10 mt-1 w-64 p-2 bg-slate-900 text-rose-300 text-[11px] rounded-lg shadow-xl border border-rose-800/60 z-50 animate-in fade-in">
              <p className="font-bold text-white flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-rose-400" /> Sync Failed
              </p>
              <p className="text-slate-300 text-[10px] mt-0.5">{refreshError}</p>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
