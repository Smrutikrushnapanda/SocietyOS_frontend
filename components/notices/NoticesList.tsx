'use client';
import React, { useState } from 'react';
import { useInfiniteFeed } from '../../hooks/useInfiniteFeed';
import { FeedTabs, InfiniteFeedBoundary } from '../common/InfiniteFeed';
import { NoticeCard } from './NoticeCard';
import type { BackendNotice } from '../../types/notice';
const displayNotice = (notice: BackendNotice): BackendNotice => ({ ...notice, description: notice.content, type: notice.priority === 'EMERGENCY' ? 'Emergency' : 'Circular', displayDate: new Date(notice.published_at || notice.created_at).toLocaleDateString('en-IN') });
export const NoticesList: React.FC<{ selectedNoticeId?: string | null }> = ({ selectedNoticeId }) => {
  const [priority, setPriority] = useState('all');
  const feed = useInfiniteFeed<BackendNotice>('/notices/page', { priority });
  const isAlreadyInFeed = Boolean(selectedNoticeId) && feed.items.some(item => item.id === selectedNoticeId);
  const detail = useInfiniteFeed<BackendNotice>('/notices/page', { recordId: selectedNoticeId || undefined, limit: 1 }, Boolean(selectedNoticeId) && !isAlreadyInFeed);
  return <div id="resident-notices-list"><FeedTabs label="Notice filters" value={priority} onChange={setPriority} tabs={[{ value: 'all', label: 'All' }, { value: 'NORMAL', label: 'Circulars' }, { value: 'IMPORTANT', label: 'Important' }, { value: 'EMERGENCY', label: 'Emergency' }]} />{detail.items[0] && !feed.items.some(item => item.id === detail.items[0].id) && <NoticeCard notice={displayNotice(detail.items[0])} highlighted />}{feed.items.map(notice => <NoticeCard key={notice.id} notice={displayNotice(notice)} highlighted={notice.id === selectedNoticeId} />)}<InfiniteFeedBoundary feed={feed} label="Notices" /></div>;
};
