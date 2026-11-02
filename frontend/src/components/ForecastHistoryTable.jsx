import React from 'react';
import { CheckCircle2, Clock, AlertCircle, ArrowRight } from 'lucide-react';

export default function ForecastHistoryTable({
  vintages = [],
  targetStartTime,
  decisionCutoffUTC,
  selectedVintageIndex,
  onSelectVintage,
}) {
  if (!vintages || vintages.length === 0) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500">
        No publication vintages loaded. Select a target delivery interval to audit revisions.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-slate-900">
            Audit Trail of All Publication Vintages ({vintages.length} Revisions Recorded)
          </h4>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">
            Target Delivery Interval: <span className="font-semibold text-slate-800">{targetStartTime}</span>
          </p>
        </div>

        <div className="text-xs font-mono bg-sky-50 text-sky-800 px-3 py-1 rounded-lg border border-sky-200">
          Decision Gate Closure: <span className="font-bold">{decisionCutoffUTC}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
            <tr>
              <th className="py-2.5 px-4">Publication Vintage (UTC)</th>
              <th className="py-2.5 px-3">Lead Time Prior to Delivery</th>
              <th className="py-2.5 px-3 text-right">Forecast (MW)</th>
              <th className="py-2.5 px-4 text-center">Eligibility at Cutoff</th>
              <th className="py-2.5 px-4 text-center">Purchasing Decision</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {vintages.map((v, i) => {
              const isSelected = v.isSelected;
              const isEligible = v.isEligible;

              return (
                <tr
                  key={i}
                  onClick={() => onSelectVintage && onSelectVintage(v)}
                  className={`transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-sky-50/90 font-semibold border-l-4 border-l-sky-600'
                      : 'hover:bg-slate-50/80'
                  }`}
                >
                  <td className="py-2.5 px-4 text-slate-900 whitespace-nowrap">
                    {v.publishTime ? v.publishTime.replace('T', ' ').replace('Z', ' UTC') : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">
                    {v.leadTimeHours !== undefined ? `${v.leadTimeHours}h prior` : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-sky-700">
                    {Number(v.generation).toLocaleString()} MW
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    {isEligible ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-sans font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        Pre-Cutoff (Eligible)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-sans font-medium bg-rose-50 text-rose-700 border border-rose-200">
                        <AlertCircle className="w-3 h-3 text-rose-500" />
                        Post-Cutoff (Excluded)
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    {isSelected ? (
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-sans font-bold bg-sky-600 text-white shadow-xs">
                        SELECTED FOR PURCHASE
                      </span>
                    ) : isEligible ? (
                      <span className="text-[10px] text-slate-400 font-sans">
                        Superseded by later pre-cutoff
                      </span>
                    ) : (
                      <span className="text-[10px] text-rose-500 font-sans font-medium">
                        Look-ahead bias prevented
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
