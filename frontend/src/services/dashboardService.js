import api, { withRetry } from './api';

/**
 * Dashboard & Analytics Services
 * Interacts with FastAPI /api/v1/dashboard/* and /api/v1/filters endpoints.
 */

/**
 * Fetch executive KPI summary (Averages, MAE, MAPE, RMSE, Bias, Matched/Missing counts).
 * GET /api/v1/dashboard/summary
 *
 * @param {Object} params - { start_date, end_date, cutoff_time, policy_name }
 * @returns {Promise<Object>} DashboardSummaryResponse
 */
export async function getDashboardSummary(params = {}) {
  return withRetry(async () => {
    const response = await api.get('/dashboard/summary', { params });
    return response.data;
  });
}

/**
 * Fetch granular settlement period comparison records for charting.
 * GET /api/v1/dashboard/comparison
 *
 * @param {Object} params - { start_date, end_date, cutoff_time, policy_name, limit }
 * @returns {Promise<Object>} DashboardComparisonResponse
 */
export async function getDashboardComparison(params = {}) {
  return withRetry(async () => {
    const response = await api.get('/dashboard/comparison', { params });
    return response.data;
  });
}

/**
 * Fetch daily aggregated generation totals and error metrics.
 * GET /api/v1/dashboard/daily
 *
 * @param {Object} params - { start_date, end_date, cutoff_time, policy_name }
 * @returns {Promise<Object>} DashboardDailyResponse
 */
export async function getDashboardDaily(params = {}) {
  return withRetry(async () => {
    const response = await api.get('/dashboard/daily', { params });
    return response.data;
  });
}

/**
 * Fetch available filter metadata (supported dates, default cutoffs, policies).
 * GET /api/v1/filters
 *
 * @returns {Promise<Object>} FiltersMetadataResponse
 */
export async function getFilters() {
  return withRetry(async () => {
    const response = await api.get('/filters');
    return response.data;
  });
}
