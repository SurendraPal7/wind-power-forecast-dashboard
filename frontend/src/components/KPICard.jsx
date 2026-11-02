import React from 'react';

export default function KPICard({
  title,
  value,
  unit = '',
  subtitle,
  icon: Icon,
  badge,
  badgeType = 'neutral', // 'positive' | 'negative' | 'warning' | 'info' | 'neutral'
  tooltip,
}) {
  const badgeStyles = {
    positive: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    negative: 'bg-rose-50 text-rose-700 border-rose-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <div
      className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm hover:shadow transition-shadow flex flex-col justify-between"
      title={tooltip}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-600">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="flex items-baseline space-x-1.5">
        <span className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
          {value !== null && value !== undefined ? value : '—'}
        </span>
        {unit && (
          <span className="text-xs font-semibold text-slate-500">
            {unit}
          </span>
        )}
      </div>

      {(subtitle || badge) && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          {subtitle && <span className="text-slate-500 text-[11px] truncate">{subtitle}</span>}
          {badge && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                badgeStyles[badgeType] || badgeStyles.neutral
              }`}
            >
              {badge}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
