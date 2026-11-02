import React, { useState, useMemo } from 'react';
import { Download, Search, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';

export default function DataTable({ records = [], title = 'Settlement Interval Analytics' }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortField, setSortField] = useState('startTime');
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedRecords = useMemo(() => {
    let result = [...records];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (r) =>
          (r.startTime && r.startTime.toLowerCase().includes(term)) ||
          (r.publishTime && r.publishTime.toLowerCase().includes(term)) ||
          (r.settlementPeriod && String(r.settlementPeriod).includes(term))
      );
    }

    result.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      return sortDirection === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });

    return result;
  }, [records, searchTerm, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedRecords.slice(start, start + pageSize);
  }, [filteredAndSortedRecords, currentPage, pageSize]);

  // Export to CSV
  const handleExportCSV = () => {
    if (!records.length) return;
    const headers = ['Settlement Date', 'Period', 'Delivery Start Time (UTC)', 'Publish Time (UTC)', 'Forecast Generation (MW)', 'Actual Generation (MW)', 'Absolute Error (MW)', 'Signed Error (MW)', 'Error (%)'];
    const rows = filteredAndSortedRecords.map((r) => [
      r.settlementDate || (r.startTime ? r.startTime.slice(0, 10) : ''),
      r.settlementPeriod || '',
      r.startTime || '',
      r.publishTime || '',
      r.forecastGeneration !== undefined ? r.forecastGeneration : '',
      r.actualGeneration !== undefined ? r.actualGeneration : '',
      r.absoluteError !== undefined ? r.absoluteError : '',
      r.error !== undefined ? r.error : '',
      r.percentageError !== null && r.percentageError !== undefined ? r.percentageError : '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `uk_wind_analytics_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Table Header Controls */}
      <div className="p-4 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Showing {filteredAndSortedRecords.length} matched intervals (30-minute settlement resolution)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search time or period..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white w-48"
            />
          </div>

          {/* Page size */}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value={25}>25 / page</option>
            <option value={48}>48 (1 day)</option>
            <option value={100}>100 / page</option>
          </select>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            disabled={!records.length}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Table Element */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
            <tr>
              <th
                onClick={() => handleSort('startTime')}
                className="py-3 px-4 cursor-pointer hover:bg-slate-100"
              >
                <div className="flex items-center gap-1">
                  Target Time (UTC)
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-3">Period</th>
              <th
                onClick={() => handleSort('publishTime')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-100"
              >
                <div className="flex items-center gap-1">
                  Forecast Published
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('forecastGeneration')}
                className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100"
              >
                <div className="flex items-center justify-end gap-1">
                  Forecast (MW)
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('actualGeneration')}
                className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100"
              >
                <div className="flex items-center justify-end gap-1">
                  Actual (MW)
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('absoluteError')}
                className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100"
              >
                <div className="flex items-center justify-end gap-1">
                  Abs Error (MW)
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('percentageError')}
                className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100"
              >
                <div className="flex items-center justify-end gap-1">
                  Error %
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-4 text-center">Bias Direction</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {paginatedRecords.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400 font-sans text-xs">
                  No records match the current filter or search criteria.
                </td>
              </tr>
            ) : (
              paginatedRecords.map((r, idx) => {
                const isOverForecast = r.error > 0;
                const isUnderForecast = r.error < 0;

                return (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      {r.startTime ? r.startTime.replace('T', ' ').replace('Z', '') : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {r.settlementPeriod ? `SP ${r.settlementPeriod}` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                      {r.publishTime ? r.publishTime.replace('T', ' ').replace('Z', '') : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-sky-700 whitespace-nowrap">
                      {r.forecastGeneration !== undefined ? Number(r.forecastGeneration).toLocaleString() : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-emerald-700 whitespace-nowrap">
                      {r.actualGeneration !== undefined ? Number(r.actualGeneration).toLocaleString() : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-amber-700 whitespace-nowrap">
                      {r.absoluteError !== undefined ? Number(r.absoluteError).toLocaleString() : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-600 whitespace-nowrap">
                      {r.percentageError !== null && r.percentageError !== undefined
                        ? `${r.percentageError}%`
                        : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {isOverForecast ? (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-sans font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          Over (+{r.error} MW)
                        </span>
                      ) : isUnderForecast ? (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-sans font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          Under ({r.error} MW)
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-sans font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Exact Match
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="p-3 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500 font-sans">
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
