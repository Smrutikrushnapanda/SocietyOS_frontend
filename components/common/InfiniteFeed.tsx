'use client';
import { useEffect, useRef } from 'react';
export function FeedTabs({ value, onChange, tabs, label }: { value: string; onChange: (value: string) => void; tabs: { value: string; label: string }[]; label: string }) {
  return <div className="mobile-pipeline-strip resident-feed-tabs" role="tablist" aria-label={label}>{tabs.map(tab => <button key={tab.value} className={`pipeline-chip ${value === tab.value ? 'active' : ''}`} role="tab" aria-selected={value === tab.value} onClick={() => onChange(tab.value)}>{tab.label}</button>)}</div>;
}

function FeedSkeleton({ label, count }: { label: string; count: number }) {
  const variant = label === 'Payments' ? 'payment' : label === 'Visitor passes' ? 'visitor' : label === 'Helpdesk requests' ? 'helpdesk' : 'notice';
  return <div className={`resident-feed-skeleton resident-feed-skeleton--${variant}`} role="status" aria-label={`Loading ${label.toLowerCase()}`} aria-busy="true">
    {Array.from({ length: count }, (_, index) => <div className="card resident-feed-skeleton-card" key={index} aria-hidden="true">
      <div className="resident-feed-skeleton-heading">
        <div className="resident-feed-skeleton-copy">
          <span className="resident-feed-skeleton-line resident-feed-skeleton-title" />
          <span className="resident-feed-skeleton-line resident-feed-skeleton-meta" />
        </div>
        <span className="resident-feed-skeleton-line resident-feed-skeleton-badge" />
      </div>
      {variant !== 'payment' && <div className="resident-feed-skeleton-body">
        <span className="resident-feed-skeleton-line" />
        <span className="resident-feed-skeleton-line" />
      </div>}
      <div className="resident-feed-skeleton-footer">
        <span className="resident-feed-skeleton-line" />
        <span className="resident-feed-skeleton-line" />
      </div>
    </div>)}
  </div>;
}
export function InfiniteFeedBoundary({ feed, label }: { feed: { items: unknown[]; total: number; hasMore: boolean; isLoading: boolean; error: string | null; loadMore: () => void; retry: () => void }; label: string }) {
  const { hasMore, isLoading, error, loadMore } = feed;
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sentinel.current || !hasMore || isLoading || error || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) loadMore(); }, { rootMargin: '160px 0px', threshold: 0.01 });
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [hasMore, isLoading, error, loadMore]);
  return <div className="infinite-feed-boundary" ref={sentinel} aria-label={`${label} pagination`}>
    {feed.error ? <div role="alert"><p>{feed.error}</p><button className="btn btn-sm btn-ghost" onClick={feed.retry}>Retry loading</button></div> : feed.isLoading ? <FeedSkeleton label={label} count={feed.items.length ? 1 : 3} /> : feed.items.length === 0 ? <p>No {label.toLowerCase()} found for this tab.</p> : <p>{feed.items.length} of {feed.total} {label.toLowerCase()}</p>}
    {feed.hasMore && !feed.error && <button className="btn btn-sm btn-ghost" disabled={feed.isLoading} onClick={feed.loadMore}>Load more {label.toLowerCase()}</button>}
  </div>;
}
