import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { NoticeCard } from '../../components/notices/NoticeCard';
import { activeEmergencyNotices, noticeScheduleISO, validateNoticeSelection } from './policy';
import { useAuthStore } from '../../store/useAuthStore';
import { useNoticeStore } from '../../store/useNoticeStore';
import apiClient from '../api/client';
import { createNotice, updateNotice, scheduleNotice, cancelNoticeSchedule, getNoticeAttachments, uploadNoticeAttachment, publishNotice, downloadNoticeAttachment } from '../api/notices.api';
import { parsePush } from '../../public/societyos-push';
import { authorizedPushDestination } from '../firebase/resident-push';
import type { BackendNotice } from '../../types/notice';
const org = '11111111-1111-4111-8111-111111111111';
const id = '22222222-2222-4222-8222-222222222222';
const current = Date.now();
const notice: BackendNotice = { id, organization_id: org, title: 'Water supply interrupted', content: 'Service resumes tomorrow', status: 'PUBLISHED', priority: 'EMERGENCY', published_at: new Date(current - 1000).toISOString(), expires_at: new Date(current + 86400000).toISOString(), created_at: new Date(current).toISOString(), updated_at: new Date(current).toISOString(), attachment_ids: [] };
const authBefore = useAuthStore.getState(), adapterBefore = apiClient.defaults.adapter;
const hadWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
Object.defineProperty(globalThis, 'window', { value: {}, configurable: true });
useAuthStore.setState({ isAuthenticated: true, logoutInProgress: false, organizationId: org, backendUser: { id: 'test-admin', mobileNumber: '' }, accessToken: 'mock-access', roles: ['SOCIETY_ADMIN'] });
const calls: InternalAxiosRequestConfig[] = [];
apiClient.defaults.adapter = config => {
  calls.push(config);
  const data = config.url === '/notices' && config.method === 'get' ? [notice] : config.url?.endsWith('/attachments') && config.method === 'get' ? [{ id: 'file', original_filename: 'notice.pdf', mime_type: 'application/pdf', size_bytes: 20 }] : notice;
  return Promise.resolve({ config, data, status: 200, statusText: 'OK', headers: {} });
};
let passed = 0;
async function check(name: string, run: () => void | Promise<void>) { await run(); ++passed; console.log(`PASS ${name}`); }
async function run() {
  await check('local/offset publication input is persisted as UTC', () => { assert.equal(noticeScheduleISO('2030-02-01T12:30:00+05:30', undefined, 0), '2030-02-01T07:00:00.000Z'); });
  await check('rejects missing, past and post-expiry schedules', () => { for (const input of ['', 'invalid', '2000-01-01T00:00:00Z']) assert.throws(() => noticeScheduleISO(input)); assert.throws(() => noticeScheduleISO('2030-02-01T12:30:00Z', '2030-02-01T11:00:00Z', 0)); });
  await check('file picker validates size, type, extension and total count', () => {
    validateNoticeSelection([{ name: 'image.PNG', type: 'image/png', size: 1024 }], 4);
    for (const file of [{ name: 'x.svg', type: 'image/svg+xml', size: 20 }, { name: 'x.pdf', type: 'image/png', size: 20 }, { name: 'x.pdf', type: 'application/pdf', size: 0 }, { name: 'x.pdf', type: 'application/pdf', size: 2 * 1024 * 1024 + 1 }]) assert.throws(() => validateNoticeSelection([file], 0));
    assert.throws(() => validateNoticeSelection([{ name: 'x.pdf', type: 'application/pdf', size: 10 }], 5));
  });
  await check('only active, published organization emergencies become banners', () => {
    const values = [notice, { ...notice, id: 'foreign', organization_id: 'other' }, { ...notice, id: 'draft', status: 'DRAFT' as const }, { ...notice, id: 'scheduled', status: 'SCHEDULED' as const }, { ...notice, id: 'expired', expires_at: new Date(current - 100).toISOString() }, { ...notice, id: 'normal', priority: 'NORMAL' as const }];
    assert.deepEqual(activeEmergencyNotices(values, org, current).map(value => value.id), [id]);
  });
  await check('emergency notice card renders red text and escapes active content', () => {
    const html = renderToStaticMarkup(<NoticeCard notice={{ ...notice, title: '<script>bad()</script>', description: '<img onerror=bad()>' }} />);
    assert.ok(html.includes('#b91c1c')); assert.ok(html.includes('EMERGENCY')); assert.ok(!html.includes('<script>')); assert.ok(!html.includes('<img onerror'));
  });
  await check('new drafts retain selected priority in the creation contract', async () => {
    await createNotice({ title: 'Water outage', content: 'Service update', priority: 'EMERGENCY' }); assert.equal(calls.at(-1)?.method, 'post'); assert.equal(calls.at(-1)?.url, '/notices'); assert.equal(JSON.parse(String(calls.at(-1)?.data)).priority, 'EMERGENCY');
  });
  await check('draft edit uses the scoped update endpoint and priority', async () => {
    await updateNotice(id, { title: 'Power outage', priority: 'EMERGENCY' }); const last = calls.at(-1);
    assert.equal(last?.url, `/notices/${id}`); assert.equal(last?.method, 'put'); assert.equal(last?.headers.get('X-Organization-Id'), org); assert.deepEqual(JSON.parse(String(last?.data)), { title: 'Power outage', priority: 'EMERGENCY' });
  });
  await check('schedule, cancellation and emergency publication use explicit contracts', async () => {
    await scheduleNotice(id, '2030-02-01T07:00:00.000Z', true); assert.deepEqual(JSON.parse(String(calls.at(-1)?.data)), { publishAt: '2030-02-01T07:00:00.000Z', confirmEmergency: true });
    await cancelNoticeSchedule(id); assert.equal(calls.at(-1)?.method, 'delete');
    await publishNotice(id, true); assert.deepEqual(JSON.parse(String(calls.at(-1)?.data)), { confirmEmergency: true });
  });
  await check('attachments use notice-scoped multipart and listing routes', async () => {
    await uploadNoticeAttachment(id, new File(['%PDF-1.7\n%%EOF'], 'notice.pdf', { type: 'application/pdf' })); assert.equal(calls.at(-1)?.url, `/notices/${id}/attachments`); assert.ok(calls.at(-1)?.data instanceof FormData);
    assert.equal((await getNoticeAttachments(id))[0].original_filename, 'notice.pdf');
  });
  await check('store preserves emergency priority instead of replacing it', async () => { await useNoticeStore.getState().loadNotices(); assert.equal(useNoticeStore.getState().notices[0].priority, 'EMERGENCY'); });
  await check('emergency push is recognized and requires authorized notice lookup', async () => {
    const push = { deliveryId: org, referenceId: id, category: 'EMERGENCY' };
    assert.deepEqual(parsePush(push), push); assert.deepEqual(await authorizedPushDestination(push, 'scope', () => 'scope', async () => true), { screen: 'notices', referenceId: id });
    assert.equal(await authorizedPushDestination(push, 'scope', () => 'scope', async () => false), null);
  });
  await check('account switching discards an in-flight attachment download', async () => {
    let complete: ((value: AxiosResponse<Blob>) => void) | undefined;
    let config: InternalAxiosRequestConfig | undefined;
    apiClient.defaults.adapter = input => { config = input; return new Promise<AxiosResponse<Blob>>(resolve => { complete = resolve; }); };
    const download = downloadNoticeAttachment(id, { id: 'file', original_filename: 'notice.pdf', mime_type: 'application/pdf', size_bytes: 20 });
    for (let i = 0; i < 50 && !complete; i++) await Promise.resolve();
    if (!complete || !config) throw new Error('Expected mocked request');
    useAuthStore.setState({ organizationId: 'other' }); complete({ config, data: new Blob(['test']), status: 200, statusText: 'OK', headers: {} }); await download;
    // No DOM is provided: stale download would throw if it attempted to create/click a link.
    assert.equal(config.responseType, 'blob');
  });
  console.log(`${passed} notice workflow checks passed`);
}
void run().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => { apiClient.defaults.adapter = adapterBefore; useAuthStore.setState(authBefore); useNoticeStore.getState().reset(); if (hadWindow) Object.defineProperty(globalThis, 'window', hadWindow); else Reflect.deleteProperty(globalThis, 'window'); });
