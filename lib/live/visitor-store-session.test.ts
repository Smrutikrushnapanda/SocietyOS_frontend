import assert from 'node:assert/strict';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import apiClient from '../api/client';
import { useAuthStore } from '../../store/useAuthStore';
import { useVisitorStore } from '../../store/useVisitorStore';
import type { BackendVisitorVisit } from '../api/visitors.api';

Object.defineProperty(globalThis, 'window', { value: {}, configurable: true });
const org = '11111111-1111-4111-8111-111111111111';
const oldAdapter = apiClient.defaults.adapter;
const snapshot = useAuthStore.getState();
let pending: Array<{ config: InternalAxiosRequestConfig; resolve: (response: AxiosResponse<unknown>) => void }> = [];
const visit: BackendVisitorVisit = { id: 'visit', organization_id: org, visitor_id: 'person', visit_status: 'PENDING', visitor: { id: 'person', organization_id: org, name: 'Test visitor', mobile: '', active: true } };
apiClient.defaults.adapter = config => new Promise<AxiosResponse<unknown>>(resolve => { pending.push({ config, resolve }); });
async function waitForRequests(count: number) {
  for (let i = 0; i < 50 && pending.length < count; ++i) await Promise.resolve();
  assert.equal(pending.length, count);
}
function respond(index: number, data: BackendVisitorVisit[]) {
  const item = pending[index]; item.resolve({ config: item.config, data: { items: data, total: data.length, totalPages: 1, page: 1 }, status: 200, statusText: 'OK', headers: {} });
}
async function run() {
  useAuthStore.setState({ isAuthenticated: true, logoutInProgress: false, accessToken: 'mock-test-token', organizationId: org, backendUser: { id: 'user-a', mobileNumber: '' }, roles: ['RESIDENT'] });
  const first = useVisitorStore.getState().loadMyVisits(); await waitForRequests(1);
  useAuthStore.setState({ backendUser: { id: 'user-b', mobileNumber: '' } });
  respond(0, [visit]); await first;
  assert.equal(useVisitorStore.getState().visitors.length, 0);
  console.log('PASS old account response discarded and store cleared');
  pending = [];
  const older = useVisitorStore.getState().loadMyVisits(); await waitForRequests(1);
  const newer = useVisitorStore.getState().loadMyVisits(); await waitForRequests(2);
  respond(1, [{ ...visit, id: 'newer', visit_status: 'COMPLETED' }]); await newer;
  respond(0, [visit]); await older;
  assert.deepEqual(useVisitorStore.getState().visitors.map(item => item.id), ['newer']);
  console.log('PASS latest snapshot wins over stale response');
  pending = [];
  const oldOrganization = useVisitorStore.getState().loadMyVisits(); await waitForRequests(1);
  useAuthStore.setState({ organizationId: 'other' }); respond(0, [visit]); await oldOrganization;
  assert.equal(useVisitorStore.getState().visitors.length, 0);
  console.log('PASS organization switch clears records and ignores old response');
  useAuthStore.setState({ organizationId: org }); pending = [];
  const loggingOut = useVisitorStore.getState().loadMyVisits(); await waitForRequests(1);
  useAuthStore.setState({ logoutInProgress: true }); respond(0, [visit]); await loggingOut;
  assert.equal(useVisitorStore.getState().visitors.length, 0);
  console.log('PASS logout ignores in-flight responses');
  console.log('4 visitor session tests passed');
}
void run().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => {
  apiClient.defaults.adapter = oldAdapter;
  useAuthStore.setState(snapshot); useVisitorStore.getState().reset();
  Reflect.deleteProperty(globalThis, 'window');
});
