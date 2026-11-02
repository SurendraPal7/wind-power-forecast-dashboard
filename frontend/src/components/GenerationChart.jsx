import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl border border-slate-700 text-xs font-mono space-y-1.5 z-50">
      <div className="font-bold border-b border-slate-700 pb-1 text-slate-300">
        {data.startTime ? data.startTime.replace('T', ' ').replace('Z', ' UTC') : label}
        {data.settlementPeriod && (
          <span className="ml-2 text-sky-400 font-normal">Period {data.settlementPeriod}</span>
        )}
      </div>

      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5 text-emerald-400">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
          Actual:
        </span>
        <span className="font-bold text-white">
          {data.actualGeneration !== undefined ? `${data.actualGeneration.toLocaleString()} MW` : 'N/A'}
        </span>
      </div>

      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5 text-sky-400">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" />
          Day-Ahead Forecast:
        </span>
        <span className="font-bold text-white">
          {data.forecastGeneration !== undefined ? `${data.forecastGeneration.toLocaleString()} MW` : 'N/A'}
        </span>
      </div>

      {data.absoluteError !== undefined && (
        <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800 text-[11px]">
          <span className="text-amber-300">Absolute Error:</span>
          <span className="font-bold text-amber-300">
            {data.absoluteError.toLocaleString()} MW
            {data.percentageError !== null && ` (${data.percentageError}%)`}
          </span>
        </div>
      )}

      {data.publishTime && (
        <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800">
          Published: {data.publishTime.replace('T', ' ').replace('Z', ' UTC')}
        </div>
      )}
    </div>
  );
}

export default function GenerationChart({ data = [], height = 400 }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-slate-50 border border-dashed border-slate-300 rounded-xl text-xs text-slate-500">
        No matched generation records available for the selected parameters.
      </div>
    );
  }

  // Format formattedTime for x-axis ticks
  const chartData = data.map((d) => ({
    ...d,
    timeTick: d.startTime ? d.startTime.slice(5, 16).replace('T', ' ') : '',
  }));

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between mb-4 pb-3 border-b border-slate-100 gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900">National Wind Generation: Actual vs Day-Ahead Forecast</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Half-hourly electricity delivery (MW) with pre-decision cutoff forecasts
          </p>
        </div>

        <div className="flex items-center space-x-4 text-xs font-medium">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
            <span className="text-slate-700">Actual (FUELHH)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-blue-600 inline-block" />
            <span className="text-slate-700">Day-Ahead Forecast (WINDFOR)</span>
          </div>
        </div>
      </div>

      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="timeTick"
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              minTickGap={30}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k MW`}
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 12 }} />

            {/* Shaded Area for Actual */}
            <Area
              type="monotone"
              dataKey="actualGeneration"
              name="Actual Generation"
              fill="#10b981"
              fillOpacity={0.12}
              stroke="#10b981"
              strokeWidth={2.5}
              activeDot={{ r: 5 }}
            />

            {/* Line for Day-Ahead Forecast */}
            <Line
              type="monotone"
              dataKey="forecastGeneration"
              name="Day-Ahead Forecast"
              stroke="#2563eb"
              strokeWidth={2}
              strokeDasharray="4 2"
              dot={false}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
