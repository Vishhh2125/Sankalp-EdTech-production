import axios from 'axios';
import { API_BASE_URL } from '../constants/config';

const cmsApiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1/cms`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Fetch list of published CMS pages
 */
export async function fetchPublishedCmsPages() {
  try {
    const response = await cmsApiClient.get('/pages');
    return response.data?.data || [];
  } catch (error) {
    console.error('Failed to fetch published CMS pages:', error);
    return [];
  }
}

/**
 * Fetch detailed content of a published CMS page by slug
 */
export async function fetchCmsPageBySlug(slug) {
  try {
    const response = await cmsApiClient.get(`/pages/${slug}`);
    return response.data?.data || null;
  } catch (error) {
    console.error(`Failed to fetch CMS page '${slug}':`, error);
    throw error;
  }
}
