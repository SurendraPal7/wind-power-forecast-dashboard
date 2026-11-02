import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getDashboardSummary,
  getDashboardComparison,
  getDashboardDaily,
  getFilters
} from '../services/dashboardService';
import { getDashboardAccuracy } from '../services/accuracyService';

const DashboardContext = createContext();

export function DashboardProvider({ children }) {
  // Default to January 2026 data range (Jan 1 - Jan 3)
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-01-03');
  const [cutoffTime, setCutoffTime] = useState('11:00');
  const [policyName, setPolicyName] = useState('UK_DAY_AHEAD_AUCTION');
  const [intervalMode, setIntervalMode] = useState('30min');

  const [filterMeta, setFilterMeta] = useState(null);
  const [summary, setSummary] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [daily, setDaily] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(new Date().toISOString());

  // Load backend filter metadata once on mount
  useEffect(() => {
    getFilters()
      .then((meta) => {
        setFilterMeta(meta);
        if (meta?.defaultCutoffTimeUTC) {
          setCutoffTime(meta.defaultCutoffTimeUTC);
        }
      })
      .catch((err) => {
        console.warn('Could not load filters metadata:', err?.normalizedMessage || err.message);
      });
  }, []);

  // Fetch all primary dashboard metrics concurrently with auto-retry
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        start_date: startDate,
        end_date: endDate,
        cutoff_time: cutoffTime,
        policy_name: policyName,
      };

      const [sumRes, compRes, accRes, dailyRes] = await Promise.all([
        getDashboardSummary(params),
        getDashboardComparison({ ...params, limit: 300 }),
        getDashboardAccuracy(params),
        getDashboardDaily(params),
      ]);

      setSummary(sumRes);
      setComparison(compRes);
      setAccuracy(accRes);
      setDaily(dailyRes);
      setLastRefreshed(new Date().toISOString());
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      const userMessage = err.normalizedMessage || err.response?.data?.detail || err.message || 'Failed to fetch analytics from backend.';
      setError(userMessage);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, cutoffTime, policyName]);

  // Refetch whenever filters change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <DashboardContext.Provider
      value={{
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        cutoffTime,
        setCutoffTime,
        policyName,
        setPolicyName,
        intervalMode,
        setIntervalMode,
        filterMeta,
        summary,
        comparison,
        accuracy,
        daily,
        loading,
        error,
        lastRefreshed,
        refreshData: fetchData,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}
