'use client';
import React, { useState } from 'react';
import { useInfiniteFeed } from '../../hooks/useInfiniteFeed';
import { FeedTabs, InfiniteFeedBoundary } from '../common/InfiniteFeed';
import { ComplaintCard } from './ComplaintCard';
import type { BackendComplaint } from '../../types/complaint';
export const ComplaintsList: React.FC<{ selectedRequest?: string | null }> = ({ selectedRequest }) => {
  const [tab, setTab] = useState('active');
  const feed = useInfiniteFeed<BackendComplaint>('/complaints/my/page', { tab });
  const isAlreadyInFeed = Boolean(selectedRequest) && feed.items.some(item => item.id === selectedRequest);
  const detail = useInfiniteFeed<BackendComplaint>('/complaints/my/page', { recordId: selectedRequest || undefined, limit: 1 }, Boolean(selectedRequest) && !isAlreadyInFeed);
  return <div id="my-complaints-list"><FeedTabs label="Helpdesk filters" value={tab} onChange={setTab} tabs={[{ value: 'active', label: 'Active requests' }, { value: 'completed', label: 'Completed requests' }, { value: 'all', label: 'All' }]} />{detail.items[0] && !feed.items.some(item => item.id === detail.items[0].id) && <ComplaintCard complaint={detail.items[0]} initiallyExpanded />}{feed.items.map(complaint => <ComplaintCard key={complaint.id} complaint={complaint} initiallyExpanded={complaint.id === selectedRequest} />)}<InfiniteFeedBoundary feed={feed} label="Helpdesk requests" /></div>;
};
