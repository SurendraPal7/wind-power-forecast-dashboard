import React, { useState, useMemo } from 'react';
import {
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  AlertCircle,
  Eye,
} from 'lucide-react';
import EmptyState from './EmptyState';

export default function DataTable({
  records = [],
  title = 'Settlement Interval Analytics',
  showPublishTime = true,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'MATCHED' | 'OVER_FORECAST' | 'UNDER_FORECAST' | 'ZERO_ACTUAL'
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

    // Status filter
    if (statusFilter === 'MATCHED') {
      result = result.filter(
        (r) =>
          r.actualGeneration !== undefined &&
          r.actualGeneration !== null &&
          r.forecastGeneration !== undefined &&
          r.forecastGeneration !== null
      );
    } else if (statusFilter === 'OVER_FORECAST') {
      result = result.filter((r) => r.error > 0);
    } else if (statusFilter === 'UNDER_FORECAST') {
      result = result.filter((r) => r.error < 0);
    } else if (statusFilter === 'ZERO_ACTUAL') {
      result = result.filter((r) => r.actualGeneration === 0);
    }

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (r) =>
          (r.startTime && r.startTime.toLowerCase().includes(term)) ||
          (r.publishTime && r.publishTime.toLowerCase().includes(term)) ||
          (r.settlementPeriod && String(r.settlementPeriod).includes(term)) ||
          (r.actualGeneration !== undefined && String(r.actualGeneration).includes(term)) ||
          (r.forecastGeneration !== undefined && String(r.forecastGeneration).includes(term))
      );
    }

    // Sort
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
  }, [records, searchTerm, statusFilter, sortField, sortDirection]);

  // Pagination calculations
  const totalRecords = records.length;
  const filteredCount = filteredAndSortedRecords.length;
  const totalPages = Math.ceil(filteredCount / pageSize) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedRecords = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredAndSortedRecords.slice(start, start + pageSize);
  }, [filteredAndSortedRecords, safeCurrentPage, pageSize]);

  // Export to CSV
  const handleExportCSV = () => {
    if (!filteredAndSortedRecords.length) return;
    const headers = [
      'Settlement Date',
      'Period',
      'Delivery Start Time (UTC)',
      'Publish Time (UTC)',
      'Forecast Generation (MW)',
      'Actual Generation (MW)',
      'Absolute Error (MW)',
      'Signed Error (MW)',
      'Error (%)',
    ];
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
    link.setAttribute('download', `elexon_wind_data_${new Date().toISOString().slice(0, 10)}.csv`);
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
            Displaying <span className="font-semibold text-slate-800">{filteredCount}</span> of{' '}
            <span className="font-semibold text-slate-800">{totalRecords}</span> matched records
            {statusFilter !== 'ALL' && ` (Filtered: ${statusFilter})`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status / Missing Data Filter */}
          <div className="flex items-center space-x-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="ALL">All Records ({totalRecords})</option>
              <option value="MATCHED">Valid Matched</option>
              <option value="OVER_FORECAST">Over-Forecast (Bias +)</option>
              <option value="UNDER_FORECAST">Under-Forecast (Bias -)</option>
              <option value="ZERO_ACTUAL">Zero Actuals (0 MW)</option>
            </select>
          </div>

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
              className="text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white w-44"
            />
          </div>

          {/* Page size */}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={48}>48 (1 day)</option>
            <option value={100}>100 / page</option>
          </select>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            disabled={!filteredCount}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200 disabled:opacity-50"
            title="Download active records as CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
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
                  Delivery Interval (UTC)
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-3">Period</th>
              {showPublishTime && (
                <th
                  onClick={() => handleSort('publishTime')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100"
                >
                  <div className="flex items-center gap-1">
                    Forecast Published
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
              )}
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
              <th className="py-3 px-4 text-center">Bias Evaluation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {paginatedRecords.length === 0 ? (
              <tr>
                <td colSpan={showPublishTime ? 8 : 7} className="py-12">
                  <EmptyState
                    title="No Matching Records"
                    description={`No records found matching status "${statusFilter}" or search "${searchTerm}".`}
                    actionLabel="Reset Table Filters"
                    onAction={() => {
                      setStatusFilter('ALL');
                      setSearchTerm('');
                    }}
                  />
                </td>
              </tr>
            ) : (
              paginatedRecords.map((r, idx) => {
                const isOver = r.error > 0;
                const isUnder = r.error < 0;

                return (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      {r.startTime ? r.startTime.replace('T', ' ').replace('Z', '') : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {r.settlementPeriod ? `SP ${r.settlementPeriod}` : '—'}
                    </td>
                    {showPublishTime && (
                      <td className="py-2.5 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                        {r.publishTime ? r.publishTime.replace('T', ' ').replace('Z', '') : '—'}
                      </td>
                    )}
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
                      {isOver ? (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-sans font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          Over (+{r.error} MW)
                        </span>
                      ) : isUnder ? (
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
      <div className="p-3 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-600 font-sans">
        <div>
          Showing {(safeCurrentPage - 1) * pageSize + (paginatedRecords.length > 0 ? 1 : 0)} to{' '}
          {Math.min(safeCurrentPage * pageSize, filteredCount)} of {filteredCount} entries
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={safeCurrentPage === 1}
            className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
            title="First Page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safeCurrentPage === 1}
            className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-2 font-mono">
            Page {safeCurrentPage} of {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safeCurrentPage === totalPages}
            className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={safeCurrentPage === totalPages}
            className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
            title="Last Page"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
