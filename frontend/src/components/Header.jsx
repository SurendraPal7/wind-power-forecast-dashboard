import React from 'react';
import { Menu, RefreshCw, Radio, Clock, Calendar } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';

export default function Header({ title, onToggleSidebar }) {
  const { startDate, endDate, cutoffTime, lastRefreshed, loading, refreshData } = useDashboard();

  const formattedRefresh = lastRefreshed
    ? new Date(lastRefreshed).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '--:--';

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 px-6 flex items-center justify-between shadow-sm">
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
              Cutoff: {cutoffTime} UTC
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Source status badge */}
        <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
          <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
          <span>Elexon Live Stream</span>
        </div>

        {/* Last refreshed */}
        <div className="hidden md:block text-right">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Updated</p>
          <p className="text-xs font-mono font-medium text-slate-600">{formattedRefresh} UTC</p>
        </div>

        {/* Refresh button */}
        <button
          onClick={refreshData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 transition-colors shadow-sm disabled:opacity-50"
          title="Query Elexon BMRS for fresh updates"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>
    </header>
  );
}
