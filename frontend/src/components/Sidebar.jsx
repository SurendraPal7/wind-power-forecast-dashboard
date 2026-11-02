import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Wind,
  LineChart,
  BarChart3,
  History,
  Database,
  Sliders,
  ExternalLink,
  ShieldCheck,
  X
} from 'lucide-react';

const navItems = [
  { name: 'Overview', path: '/', icon: LayoutDashboard },
  { name: 'Generation Forecast', path: '/forecast', icon: Wind },
  { name: 'Actual vs Forecast', path: '/comparison', icon: LineChart },
  { name: 'Forecast Accuracy', path: '/accuracy', icon: BarChart3 },
  { name: 'Forecast History', path: '/history', icon: History },
  { name: 'Data Explorer', path: '/explorer', icon: Database },
];

export default function Sidebar({ isOpen, onClose, onOpenSettings }) {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col justify-between border-r border-slate-800 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Logo / Header */}
          <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800/80">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-sky-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-sky-950">
                <Wind className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight text-white leading-none">
                  UK Wind Analytics
                </h1>
                <span className="text-[10px] text-sky-400 font-medium tracking-wide uppercase">
                  Wholesale Trading BI
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scope Indicator */}
          <div className="px-4 pt-4 pb-2">
            <div className="px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-medium text-slate-200">Scope: Jan 2026</span>
              </div>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/50">
                LIVE
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 py-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-sky-600/15 text-sky-400 border border-sky-500/20 font-semibold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer Info */}
        <div className="p-4 border-t border-slate-800/80 space-y-3">
          <button
            onClick={() => {
              if (onOpenSettings) onOpenSettings();
              if (onClose) onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-slate-400" />
              Decision Policy Settings
            </span>
          </button>

          <div className="text-[11px] text-slate-400 px-3">
            <div className="flex items-center justify-between mb-1">
              <span>Elexon BMRS API</span>
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              Datasets: FUELHH & WINDFOR
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
