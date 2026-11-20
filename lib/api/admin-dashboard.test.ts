import assert from 'node:assert/strict';
import { societyDateKey } from '../calendar';
import { pageNumbers } from '../../components/common/Pagination';
import apiClient from './client';
import { getMenuPage } from './role-admin-menu.api';
import { cancelMyAmenityBooking, getAmenityAvailability, updateAmenityBookingStatus } from './amenities.api';
import { amenityDateAvailability, amenitySlotRange, amenityTimeSlots, formatAmenitySlot, isAmenitySlotBooked } from '../../types/amenity';
import { authenticatedAdminName } from '../display';
import { useAuthStore } from '../../store/useAuthStore';
import { useAuditStore } from '../../store/useAuditStore';
import { useReportStore } from '../../store/useReportStore';
import { useComplaintStore } from '../../store/useComplaintStore';

const memory = new Map<string, string>();
(globalThis as any).sessionStorage = { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => memory.set(key, value), removeItem: (key: string) => memory.delete(key) };
(globalThis as any).window = { addEventListener() {}, location: { pathname: '/admin' } };
const org = '11111111-1111-4111-8111-111111111111';
const user = { id: 'user-a', mobileNumber: '+919111111111', fullName: 'Real Administrator' };
const permissions = ['complaint:manage', 'report:read', 'audit:read'];
function authenticate() {
  useAuthStore.setState({ isAuthenticated: true, backendUser: user, accessToken: 'test-access', organizationId: org, roles: ['SOCIETY_ADMIN'], permissions });
}
function response(config: any, data: unknown) { return { data, status: 200, statusText: 'OK', headers: {}, config }; }
async function tick() { await new Promise(resolve => setTimeout(resolve, 0)); }
let passed = 0;
async function test(name: string, work: () => void | Promise<void>) { await work(); passed++; process.stdout.write(`PASS ${name}\n`); }

async function run() {
  authenticate();
  await test('Society calendar handles IST midnight, previous dates and invalid dates', () => {
    assert.equal(societyDateKey('2026-10-25T18:29:59Z'), '2026-10-25');
    assert.equal(societyDateKey('2026-10-25T18:30:00Z'), '2026-10-26');
    assert.equal(societyDateKey('2026-10-26T18:30:00Z'), '2026-10-27');
    assert.equal(societyDateKey('invalid'), null);
  });
  await test('Numbered pagination includes first/last and bounds large page lists', () => {
    assert.deepEqual(pageNumbers(1, 1), [1]);
    assert.deepEqual(pageNumbers(2, 4), [1, 2, 3, 4]);
    assert.deepEqual(pageNumbers(5, 100), [1, 'gap-4', 4, 5, 6, 'gap-100', 100]);
    assert.deepEqual(pageNumbers(100, 100), [1, 'gap-99', 99, 100]);
  });
  await test('Reset report filters performs one API request and resets page', async () => {
    let calls = 0;
    apiClient.defaults.adapter = async config => { calls++; return response(config, { buildings: [], totals: {} }); };
    useReportStore.setState({ activeTab: 'occupancy', filters: { from: '2026-10-01', to: '2026-10-26' }, page: 3 });
    useReportStore.getState().clearFilters(); await tick();
    assert.equal(calls, 1); assert.equal(useReportStore.getState().page, 1); assert.deepEqual(useReportStore.getState().filters, {});
  });
  await test('Audit detail failure retains list and retry target', async () => {
    const log = { id: 'event-a' } as any;
    useAuditStore.setState({ auditLogs: [log], error: null });
    apiClient.defaults.adapter = async () => { throw new Error('detail unavailable'); };
    await useAuditStore.getState().fetchAuditLogDetail('event-a');
    assert.deepEqual(useAuditStore.getState().auditLogs, [log]);
    assert.equal(useAuditStore.getState().error, null);
    assert.equal(useAuditStore.getState().selectedLogId, 'event-a');
    assert.ok(useAuditStore.getState().detailError);
    useAuditStore.getState().setSelectedLog(null);
    assert.equal(useAuditStore.getState().selectedLogId, null);
  });
  await test('Admin name uses authenticated profile, trims blanks, and handles missing data', () => {
    assert.equal(authenticatedAdminName(user), 'Real Administrator');
    assert.equal(authenticatedAdminName({ fullName: '  Updated Name  ' }), 'Updated Name');
    assert.equal(authenticatedAdminName(null), 'Admin');
    assert.equal(authenticatedAdminName({ fullName: '  ' }), 'Admin');
    useAuthStore.getState().setAuthContext({ user: { ...user, fullName: 'Updated Name' }, memberships: [{ organizationId: org, role: 'SOCIETY_ADMIN', permissions }] });
    assert.equal(authenticatedAdminName(useAuthStore.getState().backendUser), 'Updated Name');
  });
  await test('Booking slots follow configured hours and duration without fabricated availability', () => {
    assert.deepEqual(amenityTimeSlots({ openTime: '06:00', closeTime: '08:00', slotDuration: '60 mins' }), ['06:00 - 07:00', '07:00 - 08:00']);
    assert.deepEqual(amenityTimeSlots({ openTime: '06:00', closeTime: '10:00', slotDuration: '2 Hours' }), ['06:00 - 08:00', '08:00 - 10:00']);
    assert.deepEqual(amenityTimeSlots({ openTime: '06:00', closeTime: '08:00', slotDuration: 'invalid' }), []);
    assert.deepEqual(amenitySlotRange('06:00 - 08:00'), [360, 480]);
    assert.deepEqual(amenitySlotRange('6:00 AM - 8:00 AM'), [360, 480]);
    assert.equal(formatAmenitySlot('13:00 - 14:00'), '1:00 PM - 2:00 PM');
    assert.equal(amenitySlotRange('invalid'), null);
    assert.equal(isAmenitySlotBooked('06:00 - 07:00', ['6:30 AM - 8:00 AM']), true);
    assert.equal(amenityDateAvailability(['06:00 - 07:00', '07:00 - 08:00'], ['06:00 - 08:00']), 'full');
    assert.equal(amenityDateAvailability(['06:00 - 07:00', '07:00 - 08:00'], ['06:00 - 07:00']), 'partial');
    assert.equal(amenityDateAvailability(['06:00 - 07:00'], []), 'open');
  });
  await test('Amenity availability uses current organization and requested month range', async () => {
    const calls: any[] = [];
    apiClient.defaults.adapter = async config => { calls.push(config); return response(config, []); };
    await getAmenityAvailability('amenity-1', '2026-10-01', '2026-10-31');
    assert.equal(calls[0].url, '/amenities/amenity-1/availability');
    assert.deepEqual(calls[0].params, { from: '2026-10-01', to: '2026-10-31' });
    assert.equal(calls[0].headers['X-Organization-Id'], org);
  });
  await test('Menu page sizes and search reach backend with organization header', async () => {
    const calls: any[] = [];
    apiClient.defaults.adapter = async config => { calls.push(config); return response(config, { items: [], total: 0, page: 1, limit: config.params.limit, totalPages: 1 }); };
    for (const limit of [10, 20, 50]) await getMenuPage(1, limit, 'Residents');
    assert.deepEqual(calls.map(call => call.params.limit), [10, 20, 50]);
    assert.ok(calls.every(call => call.url === '/menu-master/page' && call.params.search === 'Residents' && call.headers['X-Organization-Id'] === org));
  });
  await test('Resident cancellation uses ownership route while admin rejection retains Rejected', async () => {
    const calls: any[] = [];
    apiClient.defaults.adapter = async config => { calls.push(config); return response(config, {}); };
    await cancelMyAmenityBooking('booking');
    await updateAmenityBookingStatus('booking', 'Rejected');
    assert.equal(calls[0].url, '/amenities/bookings/booking/cancel');
    assert.deepEqual(JSON.parse(calls[1].data), { status: 'Rejected' });
  });
  await test('Old organization report response cannot repopulate cleared state', async () => {
    let complete: (value: any) => void = () => {};
    apiClient.defaults.adapter = config => new Promise(resolve => { complete = data => resolve(response(config, data)); });
    useReportStore.getState().reset();
    const request = useReportStore.getState().fetchCurrentReport();
    await tick();
    useAuthStore.setState({ organizationId: 'org-b' });
    useReportStore.getState().reset();
    complete({ buildings: [{ name: 'Other society' }], totals: { total_flats: 100 } });
    await request;
    assert.equal(useReportStore.getState().occupancyData, null);
    assert.equal(useReportStore.getState().isLoading, false);
    authenticate();
  });
  await test('Latest report request wins when responses arrive out of order', async () => {
    const completions: ((data: any) => void)[] = [];
    apiClient.defaults.adapter = config => new Promise(resolve => completions.push(data => resolve(response(config, data))));
    useReportStore.getState().reset();
    const older = useReportStore.getState().fetchCurrentReport(); await tick();
    const newer = useReportStore.getState().fetchCurrentReport(); await tick();
    completions[1]({ buildings: [], totals: { total_flats: 2 } }); await newer;
    completions[0]({ buildings: [], totals: { total_flats: 99 } }); await older;
    assert.equal(useReportStore.getState().occupancyData?.totals.total_flats, 2);
  });
  await test('Report API failure releases loading and clears stale metrics', async () => {
    apiClient.defaults.adapter = async () => { throw new Error('offline'); };
    await useReportStore.getState().fetchCurrentReport();
    assert.equal(useReportStore.getState().isLoading, false);
    assert.equal(useReportStore.getState().occupancyData, null);
    assert.ok(useReportStore.getState().error);
  });
  await test('Audit defaults to ten rows and preserves real empty API results', async () => {
    useAuditStore.getState().reset();
    assert.equal(useAuditStore.getState().limit, 10);
    apiClient.defaults.adapter = async config => response(config, { items: [], total: 0, page: 1, limit: 10, totalPages: 0 });
    await useAuditStore.getState().fetchAuditLogs();
    assert.deepEqual(useAuditStore.getState().auditLogs, []);
    assert.equal(useAuditStore.getState().total, 0);
    assert.equal(useAuditStore.getState().isLoading, false);
  });
  await test('Badge uses real count, caches ordinary refreshes, and preserves zero', async () => {
    useComplaintStore.getState().reset();
    let requests = 0;
    let count = 5;
    apiClient.defaults.adapter = async config => { requests++; return response(config, { count }); };
    await useComplaintStore.getState().loadActionableCount();
    assert.equal(useComplaintStore.getState().actionableCount, 5);
    await useComplaintStore.getState().loadActionableCount();
    assert.equal(requests, 1);
    count = 0;
    await useComplaintStore.getState().loadActionableCount(true);
    assert.equal(useComplaintStore.getState().actionableCount, 0);
    assert.equal(requests, 2);
  });
  await test('Missing complaint permissions skip the count API', async () => {
    let calls = 0;
    apiClient.defaults.adapter = async config => { calls++; return response(config, { count: 9 }); };
    useAuthStore.setState({ permissions: [] });
    await useComplaintStore.getState().loadActionableCount(true);
    assert.equal(calls, 0);
  });
  process.stdout.write(`${passed} admin dashboard API/store tests passed.\n`);
}
run().catch(error => { process.stderr.write(`${error.stack}\n`); process.exitCode = 1; });
