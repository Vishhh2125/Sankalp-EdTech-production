import { createAuthenticatedApi } from './api';
import { API_BASE_URL } from '../constants/config';

// Dedicated axios instance for /api/content (packages routes use this prefix, NOT /api/v1)
const contentApi = createAuthenticatedApi({
  baseURL: API_BASE_URL + '/api/content',
});

export const packageApi = {
  // Get active packages (for Home row list)
  getActivePackages: () =>
    contentApi.get('/packages/active'),

  // Get detailed info for a single package (individual price sum, owned status, membership check)
  getPackageDetail: (packageId) =>
    contentApi.get(`/packages/${packageId}/detail`),

  // Buy a package with user coins
  buyPackage: (packageId) =>
    contentApi.post(`/packages/${packageId}/buy`),
};
