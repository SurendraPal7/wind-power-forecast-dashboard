import api, { withRetry } from './api';

/**
 * Forecast & Generation Services
 * Interacts with Elexon BMRS raw stream endpoints & forecast publication history.
 */

/**
 * Fetch metered actual wind generation records (Elexon FUELHH stream).
 * GET /api/v1/actual-generation
 *
 * @param {Object} params - { start_date, end_date, limit }
 * @returns {Promise<Object>} ActualGenerationListResponse
 */
export async function getActualGeneration(params = {}) {
  return withRetry(async () => {
    const response = await api.get('/actual-generation', { params });
    return response.data;
  });
}

/**
 * Fetch Day-Ahead forecast records selected according to cutoff policy (Elexon WINDFOR stream).
 * GET /api/v1/forecast-generation
 *
 * @param {Object} params - { delivery_date, cutoff_time, policy_name, limit }
 * @returns {Promise<Object>} ForecastGenerationListResponse
 */
export async function getForecastGeneration(params = {}) {
  return withRetry(async () => {
    const response = await api.get('/forecast-generation', { params });
    return response.data;
  });
}

/**
 * Fetch complete audit trail of all forecast publication revisions (vintages) for a specific settlement interval.
 * Audits pre-cutoff vs post-cutoff eligibility.
 * GET /api/v1/forecast-history
 *
 * @param {Object} params - { start_time, cutoff_time, policy_name }
 * @returns {Promise<Object>} ForecastHistoryResponse
 */
export async function getForecastHistory(params = {}) {
  return withRetry(async () => {
    const response = await api.get('/forecast-history', { params });
    return response.data;
  });
}
