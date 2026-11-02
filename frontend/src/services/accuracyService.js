import api, { withRetry } from './api';

/**
 * Accuracy & Quantitative Analysis Services
 * Interacts with /api/v1/dashboard/accuracy and provides analytical formatting.
 */

/**
 * Fetch comprehensive accuracy analytics including MAE, MAPE, RMSE, Bias, and 48-period diurnal profile.
 * GET /api/v1/dashboard/accuracy
 *
 * @param {Object} params - { start_date, end_date, cutoff_time, policy_name }
 * @returns {Promise<Object>} DashboardAccuracyResponse
 */
export async function getDashboardAccuracy(params = {}) {
  return withRetry(async () => {
    const response = await api.get('/dashboard/accuracy', { params });
    return response.data;
  });
}

/**
 * Calculate client-side error classification badge.
 *
 * @param {number} mape
 * @returns {{ label: string, color: string }}
 */
export function getAccuracyGrade(mape) {
  if (mape === null || mape === undefined) return { label: 'UNKNOWN', color: 'neutral' };
  if (mape < 10) return { label: 'EXCELLENT (<10%)', color: 'positive' };
  if (mape < 20) return { label: 'GOOD (10-20%)', color: 'info' };
  if (mape < 30) return { label: 'MODERATE (20-30%)', color: 'warning' };
  return { label: 'HIGH VOLATILITY (>30%)', color: 'negative' };
}
