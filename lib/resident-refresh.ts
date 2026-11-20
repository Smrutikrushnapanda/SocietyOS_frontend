export const RESIDENT_FEED_REFRESH = 'resident:refresh-feeds';
export const RESIDENT_COMPLAINT_CREATED = 'societyos:complaint-created';
export type ResidentFeedRefresh = CustomEvent<{ jobs: Promise<void>[] }>;

export function refreshResidentFeeds(): Promise<void>[] {
  const jobs: Promise<void>[] = [];
  window.dispatchEvent(new CustomEvent(RESIDENT_FEED_REFRESH, { detail: { jobs } }));
  return jobs;
}
