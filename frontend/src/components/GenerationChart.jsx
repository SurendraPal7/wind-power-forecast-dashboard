import React, { useState } from 'react';
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
import EmptyState from './EmptyState';
import { Eye, EyeOff } from 'lucide-react';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  const actualMW = data.actualGeneration;
  const forecastMW = data.forecastGeneration;
  const absError = data.absoluteError;
  const signedError = data.error;

  return (
    <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-2xl border border-slate-700/80 text-xs font-mono space-y-2 z-50 min-w-[240px]">
      <div className="font-bold border-b border-slate-700/80 pb-1.5 flex items-center justify-between text-slate-300">
        <span>{data.startTime ? data.startTime.replace('T', ' ').replace('Z', ' UTC') : label}</span>
        {data.settlementPeriod && (
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-sky-400 font-sans font-semibold">
            SP {data.settlementPeriod}
          </span>
        )}
      </div>

      <div className="space-y-1.5 pt-0.5">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            Metered Actual:
          </span>
          <span className="font-bold text-white">
            {actualMW !== undefined && actualMW !== null ? `${Number(actualMW).toLocaleString()} MW` : 'N/A'}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-sky-400">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" />
            Day-Ahead Forecast:
          </span>
          <span className="font-bold text-white">
            {forecastMW !== undefined && forecastMW !== null ? `${Number(forecastMW).toLocaleString()} MW` : 'N/A'}
          </span>
        </div>
      </div>

      {absError !== undefined && (
        <div className="pt-2 border-t border-slate-800/80 space-y-1 text-[11px]">
          <div className="flex items-center justify-between gap-4">
            <span className="text-amber-400">Absolute Error:</span>
            <span className="font-bold text-amber-300">
              {Number(absError).toLocaleString()} MW
              {data.percentageError !== null && data.percentageError !== undefined && ` (${data.percentageError}%)`}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 text-[10px] text-slate-400">
            <span>Signed Error (FC - Act):</span>
            <span className={signedError > 0 ? 'text-blue-400 font-semibold' : 'text-rose-400 font-semibold'}>
              {signedError > 0 ? `+${signedError}` : signedError} MW
            </span>
          </div>
        </div>
      )}

      {data.publishTime && (
        <div className="text-[10px] text-slate-400 pt-1.5 border-t border-slate-800 flex items-center justify-between">
          <span>Published At:</span>
          <span className="text-slate-300">{data.publishTime.replace('T', ' ').replace('Z', ' UTC')}</span>
        </div>
      )}
    </div>
  );
}

export default function GenerationChart({ data = [], height = 400 }) {
  // Legend toggling state
  const [showActual, setShowActual] = useState(true);
  const [showForecast, setShowForecast] = useState(true);

  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="No Time-Series Records Loaded"
        description="Select a valid date window in January 2026 to render generation vs forecast curves."
      />
    );
  }

  // Format formattedTime for x-axis ticks
  const chartData = data.map((d) => ({
    ...d,
    timeTick: d.startTime ? d.startTime.slice(5, 16).replace('T', ' ') : '',
  }));

  const handleLegendClick = (e) => {
    if (e.dataKey === 'actualGeneration') {
      setShowActual((prev) => !prev);
    } else if (e.dataKey === 'forecastGeneration') {
      setShowForecast((prev) => !prev);
    }
  };

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between mb-4 pb-3 border-b border-slate-100 gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">National Wind Generation: Actual vs Day-Ahead Forecast</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Half-hourly electricity delivery (MW) matched with pre-cutoff publication vintages
          </p>
        </div>

        {/* Interactive Series Toggle Buttons */}
        <div className="flex items-center space-x-2 text-xs font-medium">
          <button
            onClick={() => setShowActual(!showActual)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all ${
              showActual
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold'
                : 'bg-slate-50 text-slate-400 border-slate-200 opacity-60 line-through'
            }`}
            title="Click to toggle Actual generation curve"
          >
            {showActual ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Actual (FUELHH)</span>
          </button>

          <button
            onClick={() => setShowForecast(!showForecast)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all ${
              showForecast
                ? 'bg-sky-50 text-sky-700 border-sky-300 font-semibold'
                : 'bg-slate-50 text-slate-400 border-slate-200 opacity-60 line-through'
            }`}
            title="Click to toggle Forecast generation curve"
          >
            {showForecast ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Forecast (WINDFOR)</span>
          </button>
        </div>
      </div>

      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 25, left: 20, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="timeTick"
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              minTickGap={35}
              label={{ value: 'Delivery Interval (UTC)', position: 'insideBottom', offset: -15, fontSize: 11, fill: '#94a3b8' }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k MW`}
              domain={['auto', 'auto']}
              label={{ value: 'Generation (MW)', angle: -90, position: 'insideLeft', offset: -5, fontSize: 11, fill: '#94a3b8' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              height={36}
              onClick={handleLegendClick}
              wrapperStyle={{ fontSize: 12, cursor: 'pointer' }}
            />

            {/* Shaded Area for Actual Generation */}
            {showActual && (
              <Area
                type="monotone"
                dataKey="actualGeneration"
                name="Actual Generation"
                fill="#10b981"
                fillOpacity={0.15}
                stroke="#10b981"
                strokeWidth={2.5}
                activeDot={{ r: 5 }}
              />
            )}

            {/* Dashed Line for Day-Ahead Forecast */}
            {showForecast && (
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
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
