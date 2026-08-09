import axiosClient from './axiosClient';
import recordService from './recordService';
import permitService from './permitService';
import reviewService from './reviewService';
import { getNewsletters } from '../features/newsletters/newsletterApi';

function settledValue(result, select) {
  if (result.status === 'fulfilled') {
    return { value: select(result.value), error: false };
  }
  return { value: null, error: true };
}

async function loadOverview() {
  const [records, permits, reviews, updates, health] = await Promise.allSettled([
    recordService.list({ page: 1, limit: 1 }),
    permitService.list({ page: 1, limit: 1 }),
    reviewService.list({ status: 'PENDING' }),
    getNewsletters(),
    permitService.healthSummary(),
  ]);

  return {
    metrics: {
      records: settledValue(records, (result) => result.pagination?.total ?? 0),
      permits: settledValue(
        permits,
        (result) => (result.statusCounts?.DRAFT ?? 0) + (result.statusCounts?.PUBLISHED ?? 0),
      ),
      reviews: settledValue(reviews, (result) => result.length),
      updates: settledValue(updates, (result) => result.length),
    },
    health: health.status === 'fulfilled' ? health.value : null,
    healthError: health.status === 'rejected',
  };
}

function loadActivity(limit = 6) {
  return axiosClient
    .get('/audit-logs', { params: { page: 1, limit } })
    .then((response) => response.data.data ?? []);
}

export default { loadOverview, loadActivity };
