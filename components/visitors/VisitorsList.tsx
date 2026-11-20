'use client';
import React from 'react';
import { useVisitorStore, useModalStore } from '../../store';
import { mapMyVisitsToVisitors } from '../../store/useVisitorStore';
import { useInfiniteFeed } from '../../hooks/useInfiniteFeed';
import type { BackendVisitorVisit } from '../../lib/api/visitors.api';
import { InfiniteFeedBoundary } from '../common/InfiniteFeed';
import { VisitorCard } from './VisitorCard';
export const VisitorsList: React.FC<{ selectedVisitorId?: string | null }> = ({ selectedVisitorId }) => {
  const filter = useVisitorStore(state => state.filter);
  const openModal = useModalStore(state => state.openModal);
  const feed = useInfiniteFeed<BackendVisitorVisit>('/visitor-visits/my/page', { tab: filter });
  const isAlreadyInFeed = Boolean(selectedVisitorId) && feed.items.some(item => item.id === selectedVisitorId);
  const detail = useInfiniteFeed<BackendVisitorVisit>('/visitor-visits/my/page', { recordId: selectedVisitorId || undefined, limit: 1 }, Boolean(selectedVisitorId) && !isAlreadyInFeed);
  const visitors = mapMyVisitsToVisitors(feed.items);
  return <div id="visitors-list-screen">{detail.items[0] && !feed.items.some(item => item.id === detail.items[0].id) && <VisitorCard visitor={mapMyVisitsToVisitors(detail.items)[0]} highlighted />}{visitors.map(visitor => <VisitorCard key={visitor.id} visitor={visitor} highlighted={visitor.id === selectedVisitorId} />)}<InfiniteFeedBoundary feed={feed} label="Visitor passes" />{!feed.isLoading && visitors.length === 0 && <button className="btn btn-sm btn-primary" onClick={() => openModal('preApproveGuest')}>+ Pre-Approve Visitor</button>}</div>;
};
