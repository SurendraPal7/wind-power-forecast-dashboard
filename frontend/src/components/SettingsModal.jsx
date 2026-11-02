import React from 'react';
import { X, Sliders, Shield, Info, Check } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';

export default function SettingsModal({ isOpen, onClose }) {
  const { cutoffTime, setCutoffTime, policyName, setPolicyName, filterMeta, refreshData } = useDashboard();

  if (!isOpen) return null;

  const policies = filterMeta?.availablePolicies || [
    {
      id: 'UK_DAY_AHEAD_AUCTION',
      name: 'UK Day-Ahead Wholesale Auction (D-1 at 11:00 UTC)',
      description: 'Standard gate-closure assumption for EPEX SPOT and Nord Pool UK Day-Ahead power auctions.',
    },
    {
      id: 'UK_DAY_AHEAD_NOON',
      name: 'UK Day-Ahead Noon Cutoff (D-1 at 12:00 UTC)',
      description: 'Standard physical day-ahead notification cutoff (12:00 CET/11:00 GMT).',
    },
    {
      id: 'UK_EARLY_MORNING',
      name: 'Early Morning Trading Desk Briefing (D-1 at 09:00 UTC)',
      description: 'Early morning forecast vintage for initial hedging and desk briefing.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-sky-100 text-sky-700">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Trading Decision Cutoff Policy</h3>
              <p className="text-xs text-slate-500">Configure market gate closure assumption</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-800 mb-2">Select Active Cutoff Policy:</label>
            <div className="space-y-2">
              {policies.map((p) => {
                const isSelected = policyName === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      setPolicyName(p.id);
                      if (p.id === 'UK_DAY_AHEAD_AUCTION') setCutoffTime('11:00');
                      if (p.id === 'UK_DAY_AHEAD_NOON') setCutoffTime('12:00');
                      if (p.id === 'UK_EARLY_MORNING') setCutoffTime('09:00');
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-sky-500 bg-sky-50/50 ring-1 ring-sky-500'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{p.name}</span>
                      {isSelected && <Check className="w-4 h-4 text-sky-600" />}
                    </div>
                    <p className="text-slate-500 mt-1 leading-relaxed">{p.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start space-x-2.5 text-amber-900">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>Domain Rule:</strong> Changing the decision cutoff triggers automatic re-evaluation of all forecast vintages. Any forecast published after the cutoff will be strictly excluded to preserve look-ahead integrity.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-2">
          <button
            onClick={() => {
              refreshData();
              onClose();
            }}
            className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs transition-colors shadow-sm"
          >
            Apply Policy & Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
