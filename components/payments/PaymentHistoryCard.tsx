'use client';
import React, { useState } from 'react';
import { useModalStore, useSocietyStore } from '../../store';
import { useInfiniteFeed } from '../../hooks/useInfiniteFeed';
import type { BackendPayment } from '../../lib/api/maintenance.api';
import { FeedTabs, InfiniteFeedBoundary } from '../common/InfiniteFeed';
export const PaymentHistoryCard: React.FC = () => {
  const [tab, setTab] = useState('all');
  const feed = useInfiniteFeed<BackendPayment>('/maintenance/payments/my/page', { tab });
  const openModal = useModalStore(state => state.openModal);
  const currency = useSocietyStore(state => state.society.currency);
  return <section id="resident-payment-history"><div className="resident-feed-heading"><h4>Payment History</h4><button className="btn btn-xs btn-ghost" onClick={feed.refresh}>Refresh</button></div><FeedTabs label="Payment filters" value={tab} onChange={setTab} tabs={[{ value: 'all', label: 'All' }, { value: 'COMPLETED', label: 'Completed' }, { value: 'PENDING', label: 'Pending' }, { value: 'FAILED', label: 'Failed' }]} />{feed.items.map(payment => <div className="card resident-payment-row" key={payment.id}><div><strong>{currency}{Number(payment.amount).toLocaleString('en-IN')}</strong><p>{new Date(payment.payment_date).toLocaleDateString('en-IN')} · {payment.payment_method}</p><span className={`badge ${payment.payment_status === 'COMPLETED' ? 'badge-success' : 'badge-neutral'}`}>{payment.payment_status}</span></div>{payment.payment_status === 'COMPLETED' && <button className="btn btn-xs btn-ghost" onClick={() => openModal('receipt', { receiptNo: payment.transaction_id || payment.id, flat: payment.flat_id || '—', residentName: 'Resident', amount: Number(payment.amount), date: new Date(payment.payment_date).toLocaleDateString('en-IN'), method: payment.payment_method, period: '', refNo: payment.id })}>Receipt</button>}</div>)}<InfiniteFeedBoundary feed={feed} label="Payments" /></section>;
};
