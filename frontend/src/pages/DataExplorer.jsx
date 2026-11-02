import React from 'react';
import { useDashboard } from '../context/DashboardContext';
import DateRangeFilter from '../components/DateRangeFilter';
import DataTable from '../components/DataTable';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

export default function DataExplorer() {
  const { comparison, loading, error, refreshData } = useDashboard();

  if (loading && !comparison) {
    return <LoadingState message="Loading settlement interval dataset..." />;
  }

  if (error && !comparison) {
    return <ErrorState error={error} onRetry={refreshData} />;
  }

  return (
    <div className="space-y-6">
      <DateRangeFilter />

      <DataTable
        records={comparison?.records || []}
        title="Complete Elexon Wind Generation & Forecast Records (January 2026)"
      />
    </div>
  );
}
