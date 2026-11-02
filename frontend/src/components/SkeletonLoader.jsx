import React from 'react';

/**
 * Skeleton Loader Component
 * Provides smooth animated placeholder blocks for cards, charts, and tables
 * during asynchronous backend queries.
 */
export default function SkeletonLoader({ type = 'card', count = 1 }) {
  if (type === 'card') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: count }).map((_, idx) => (
          <div
            key={idx}
            className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm animate-pulse space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-16 bg-slate-200 rounded" />
              <div className="h-6 w-6 bg-slate-200 rounded-lg" />
            </div>
            <div className="h-7 w-24 bg-slate-200 rounded" />
            <div className="h-2 w-20 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'chart') {
    return (
      <div className="w-full bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm animate-pulse space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="space-y-1.5">
            <div className="h-4 w-48 bg-slate-200 rounded" />
            <div className="h-3 w-32 bg-slate-100 rounded" />
          </div>
          <div className="h-6 w-36 bg-slate-200 rounded-lg" />
        </div>
        <div className="h-72 w-full bg-slate-50 rounded-lg flex items-end p-6 gap-2">
          {Array.from({ length: 16 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-slate-200 rounded-t"
              style={{ height: `${20 + (i % 5) * 15}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="w-full bg-white rounded-xl border border-slate-200/80 shadow-sm animate-pulse overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <div className="h-4 w-40 bg-slate-200 rounded" />
          <div className="h-8 w-48 bg-slate-100 rounded-lg" />
        </div>
        <div className="divide-y divide-slate-100">
          {Array.from({ length: count || 6 }).map((_, i) => (
            <div key={i} className="p-3.5 flex items-center justify-between gap-4">
              <div className="h-3 w-32 bg-slate-200 rounded" />
              <div className="h-3 w-20 bg-slate-100 rounded" />
              <div className="h-3 w-24 bg-slate-200 rounded" />
              <div className="h-3 w-24 bg-slate-200 rounded" />
              <div className="h-4 w-16 bg-slate-100 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-32 w-full bg-slate-100 animate-pulse rounded-xl" />
  );
}
