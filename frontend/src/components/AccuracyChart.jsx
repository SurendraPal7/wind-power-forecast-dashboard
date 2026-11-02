import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

export default function AccuracyChart({ dailyMetrics = [], diurnalProfile = [], height = 350 }) {
  const [activeTab, setActiveTab] = useState('daily'); // 'daily' | 'diurnal'

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between mb-4 pb-3 border-b border-slate-100 gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            {activeTab === 'daily' ? 'Daily Forecast Accuracy (MAE & MAPE)' : 'Diurnal 48-Period Accuracy Profile'}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeTab === 'daily'
              ? 'Daily aggregated volume error (MW) and relative error percentage (%)'
              : 'Half-hourly error distribution across the 24-hour trading day'}
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-medium">
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-3 py-1 rounded-md transition-colors ${
              activeTab === 'daily' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Daily Trends
          </button>
          <button
            onClick={() => setActiveTab('diurnal')}
            className={`px-3 py-1 rounded-md transition-colors ${
              activeTab === 'diurnal' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Diurnal Profile (1–48)
          </button>
        </div>
      </div>

      <div style={{ width: '100%', height }}>
        {activeTab === 'daily' ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyMetrics} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                tickFormatter={(v) => `${(v / 1000).toFixed(1)}k MW`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                formatter={(value, name) => [
                  name.includes('%') ? `${value}%` : `${Number(value).toLocaleString()} MW`,
                  name,
                ]}
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8, color: '#fff', fontSize: 12, fontFamily: 'monospace' }}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 12 }} />
              <Bar yAxisId="left" dataKey="maeMW" name="Mean Absolute Error (MW)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="left" dataKey="rmseMW" name="RMSE (MW)" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="mapePercent" name="MAPE (%)" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4 }} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={diurnalProfile} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="timeLabel"
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                interval={3}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                tickFormatter={(v) => `${v} MW`}
              />
              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="2 2" />
              <Tooltip
                formatter={(value, name) => [`${Number(value).toLocaleString()} MW`, name]}
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8, color: '#fff', fontSize: 12, fontFamily: 'monospace' }}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="maeMW" name="Period MAE (MW)" stroke="#f59e0b" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="biasMW" name="Period Bias (MW)" stroke="#6366f1" strokeWidth={2} strokeDasharray="3 3" dot={false} />
              <Line type="monotone" dataKey="rmseMW" name="Period RMSE (MW)" stroke="#94a3b8" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
