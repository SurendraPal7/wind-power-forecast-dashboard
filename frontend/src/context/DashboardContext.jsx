import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getDashboardSummary,
  getDashboardComparison,
  getDashboardDaily,
  getFilters
} from '../services/dashboardService';
import { getDashboardAccuracy } from '../services/accuracyService';

const DashboardContext = createContext();

const DEFAULT_START_DATE = '2026-01-01';
const DEFAULT_END_DATE = '2026-01-03';
const DEFAULT_CUTOFF_TIME = '11:00';
const DEFAULT_POLICY_NAME = 'UK_DAY_AHEAD_AUCTION';

export function DashboardProvider({ children }) {
  // Active applied filter states
  const [startDate, setStartDate] = useState(DEFAULT_START_DATE);
  const [endDate, setEndDate] = useState(DEFAULT_END_DATE);
  const [cutoffTime, setCutoffTime] = useState(DEFAULT_CUTOFF_TIME);
  const [policyName, setPolicyName] = useState(DEFAULT_POLICY_NAME);
  const [intervalMode, setIntervalMode] = useState('30min');

  // Backend metadata & analytics datasets
  const [filterMeta, setFilterMeta] = useState(null);
  const [summary, setSummary] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [daily, setDaily] = useState(null);

  // Loading and Error management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Refresh status tracking: 'idle' | 'refreshing' | 'success' | 'error'
  const [refreshStatus, setRefreshStatus] = useState('idle');
  const [refreshError, setRefreshError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

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

  // Fetch all primary dashboard metrics with auto-retry
  const fetchData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshStatus('refreshing');
      setRefreshError(null);
    } else {
      setLoading(true);
      setError(null);
    }

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

      // Only update lastRefreshed when the API request actually succeeded
      const successTime = new Date().toISOString();
      setLastRefreshed(successTime);
      setError(null);

      if (isManualRefresh) {
        setRefreshStatus('success');
        setTimeout(() => setRefreshStatus('idle'), 4000);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      const userMessage =
        err.normalizedMessage ||
        err.response?.data?.detail ||
        err.message ||
        'Failed to fetch analytics from backend.';

      if (isManualRefresh) {
        setRefreshStatus('error');
        setRefreshError(userMessage);
      } else {
        setError(userMessage);
      }
      // Note: do not claim fresh data or update lastRefreshed when API fails
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, cutoffTime, policyName]);

  // Refetch whenever active applied filters change
  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  // Apply new filter values
  const applyFilters = (newFilters) => {
    if (newFilters.startDate) setStartDate(newFilters.startDate);
    if (newFilters.endDate) setEndDate(newFilters.endDate);
    if (newFilters.cutoffTime) setCutoffTime(newFilters.cutoffTime);
    if (newFilters.policyName) setPolicyName(newFilters.policyName);
  };

  // Reset filters to January default state
  const resetFilters = () => {
    setStartDate(DEFAULT_START_DATE);
    setEndDate(DEFAULT_END_DATE);
    setCutoffTime(DEFAULT_CUTOFF_TIME);
    setPolicyName(DEFAULT_POLICY_NAME);
  };

  // Manual refresh trigger
  const handleManualRefresh = () => {
    fetchData(true);
  };

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
        applyFilters,
        resetFilters,
        filterMeta,
        summary,
        comparison,
        accuracy,
        daily,
        loading,
        error,
        refreshStatus,
        refreshError,
        lastRefreshed,
        refreshData: handleManualRefresh,
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
