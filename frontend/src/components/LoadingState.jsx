import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingState({ message = 'Loading electricity analytics...' }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 min-h-[300px] w-full text-center bg-white rounded-xl border border-slate-200 shadow-sm">
      <Loader2 className="w-8 h-8 text-sky-600 animate-spin mb-3" />
      <p className="text-sm font-medium text-slate-700">{message}</p>
      <p className="text-xs text-slate-400 mt-1">Processing Elexon BMRS generation streams</p>
    </div>
  );
}
