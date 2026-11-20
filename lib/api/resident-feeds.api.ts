import apiClient from './client';
import type { FeedPage } from '../../hooks/useInfiniteFeed';
export async function residentPreview<T>(path: string, params: Record<string, string | number> = {}): Promise<T[]> {
  return (await apiClient.get<FeedPage<T>>(path, { params: { page: 1, limit: 5, ...params } })).data.items;
}
