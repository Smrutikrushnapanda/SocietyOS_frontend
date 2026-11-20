/** Run against a local dev server and disposable Chrome remote-debugging profile.
 * All /api/v1 requests are intercepted. Never uses a real login or live API.
 * node tests/admin-dashboard.browser.mjs
 */
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

const frontend = process.env.SOCIETYOS_TEST_FRONTEND_URL || 'http://localhost:3000';
const debugging = process.env.SOCIETYOS_TEST_CHROME_URL || 'http://127.0.0.1:9229';
const target = await fetch(`${debugging}/json/new?about:blank`, { method: 'PUT' }).then(res => res.json());
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
let sequence = 0;
const pending = new Map();
const errors = [];
const browserLog = [];
function command(method, params = {}) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const org = '11111111-1111-4111-8111-111111111111';
const actor = '22222222-2222-4222-8222-222222222222';
const permissions = ['visitor:read', 'visitor:manage', 'notice:read', 'notice:publish', 'poll:read', 'poll:manage', 'report:export', 'building:read', 'floor:read', 'flat:read', 'resident:read', 'resident:manage', 'resident:verify', 'staff:read', 'amenity:read', 'amenity:manage', 'complaint:manage', 'file:read', 'file:upload', 'file:manage', 'report:read', 'audit:read', 'menu_master:read', 'menu_master:manage', 'role_master:read', 'admin_user:read'];
let fullName = 'Test Administrator';
let badgeCount = 12;
let reportFails = false;
let menusFail = false;
let reportDelay = 0;
let auditAction = null;
let populatedAudit = false;
let detailFails = false;
let uploadedDocument = null;
let uploadBody = '';
const collectionQueries = [];
const auditRecord = { id: 'audit-a', action: 'UPDATE', entity_type: 'FLAT', entity_id: org, actor_user_id: actor, created_at: new Date().toISOString(), old_values: { flat: '101' }, new_values: { flat: '102' } };
const today = new Date().toISOString();
const yesterday = new Date(Date.now() - 86400000).toISOString();
const tomorrow = new Date(Date.now() + 86400000).toISOString();
const visitor = { id: actor, organization_id: org, name: 'Visitor Fixture', mobile: '9111111111', active: true };
const visits = [
  { id: 'visit-today', organization_id: org, visitor_id: actor, visit_status: 'CONFIRMED', expected_entry_time: today, createdAt: yesterday },
  { id: 'visit-yesterday', organization_id: org, visitor_id: actor, visit_status: 'COMPLETED', expected_entry_time: yesterday, actual_entry_time: yesterday, createdAt: yesterday },
  { id: 'visit-tomorrow', organization_id: org, visitor_id: actor, visit_status: 'CONFIRMED', expected_entry_time: tomorrow, createdAt: today },
  { id: 'visit-arrived', organization_id: org, visitor_id: actor, visit_status: 'CONFIRMED', expected_entry_time: yesterday, actual_entry_time: today, createdAt: yesterday },
];
let residentsMenuMode = 'missing';
let omitResidentPermission = false;
let residentReadOnly = false;
let residentReads = 0;
let residentsFail = false;
let residentMutationFails = false;
const originalResidents = [
  { id: 'resident-one', name: 'Test Resident', user: { id: 'user-one', mobileNumber: '9111111111' }, resident_type: 'OWNER', is_primary: true, organization_id: org, flat_id: 'flat', profile_photo_file_id: 'good-photo', kyc_status: 'VERIFIED', app_access_status: true },
  { id: 'resident-two', name: 'Fallback Resident', user: { id: 'user-two', mobileNumber: '9222222222' }, resident_type: 'OWNER', organization_id: org, flat_id: 'flat', profile_photo_file_id: 'bad-photo', kyc_status: 'PENDING', app_access_status: false },
];
let residentRecords = originalResidents.map(resident => ({ ...resident }));
let hierarchyRequests = 0;
let hierarchyResponses = 0;
let authRequests = 0;
let releaseInitialHierarchy;
const initialHierarchy = new Promise(resolve => { releaseInitialHierarchy = resolve; });
const booking = { id: '33333333-3333-4333-8333-333333333333', organization_id: org, amenity: 'Clubhouse', resident: 'Test Resident', flat: '101', date: '2099-01-01', slot: '06:00 AM - 08:00 AM', guests: 2, amount: 0, status: 'Pending' };
const menu = (name, section, order = 0) => ({ id: section, menuName: name, menuPath: `/admin/${section}`, isActive: true, orderIndex: order });
const menus = Array.from({ length: 55 }, (_, index) => menu(`Registered ${index + 1}`, `registered-${index + 1}`, index));
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j1ioAAAAASUVORK5CYII=';
const paths = [];
async function intercept(event) {
  const url = new URL(event.request.url);
  const path = url.pathname.replace('/api/v1', '');
  paths.push(path);
  let body = [];
  let status = 200;
  let contentType = 'application/json';
  let raw;
  if (event.request.method === 'OPTIONS') {
    body = {};
  } else if (path === '/auth/me') {
    authRequests++;
    const grantedPermissions = permissions.filter(permission => !(omitResidentPermission && permission === 'resident:read') && !(residentReadOnly && permission === 'resident:manage'));
    body = { user: { id: actor, mobileNumber: '+919111111111', fullName }, memberships: [{ role: 'SOCIETY_ADMIN', organizationId: org, permissions: grantedPermissions }] };
  }
  else if (path === '/menu-master/hierarchy') {
    hierarchyRequests++;
    assert.equal(url.searchParams.get('includeInactive'), 'true');
    const residentLink = menu('Residents & App Access', 'residents');
    if (residentsMenuMode === 'disabled') residentLink.isActive = false;
    if (residentsMenuMode === 'restricted') residentLink.role = { name: 'RESIDENT' };
    const children = [menu('Overview', 'overview'), menu('Society & Buildings', 'societies'), menu('Helpdesk & AMC', 'complaints'), menu('Clubhouse & Amenities', 'amenities'), menu('Documents & Flat Vaults', 'documents'), menu('Reports & Analytics', 'reports'), menu('Audit Logs', 'audit'), menu('Role Master', 'role-master'), menu('People & Staff', 'staff')];
    if (residentsMenuMode !== 'missing') children.splice(2, 0, residentLink);
    body = [{ ...menu('Operations', '', 0), menuPath: null, children }];
    await initialHierarchy;
    hierarchyResponses++;
  }
  else if (path === '/complaints/actionable-count') body = { count: badgeCount };
  else if (path === '/role-master') body = [];
  else if (path === '/admin-users') body = [];
  else if (path === '/menu-master') body = menus;
  else if (path === '/menu-master/page') {
    if (menusFail) { status = 500; body = { message: 'Menu query unavailable' }; }
    else {
      const limit = Number(url.searchParams.get('limit') || 10);
      const filtered = menus.filter(menu => menu.menuName.toLowerCase().includes((url.searchParams.get('search') || '').toLowerCase()));
      const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
      const page = Math.min(Number(url.searchParams.get('page') || 1), totalPages);
      body = { items: filtered.slice((page - 1) * limit, page * limit), page, limit, total: filtered.length, totalPages };
    }
  } else if (path === '/amenities') body = [{ id: 'amenity', name: 'Clubhouse', code: 'HALL', capacity: 20, open_time: '06:00', close_time: '22:00', slot_duration: '60 mins', price: 0, guest_fee: 0, status: 'Active' }];
  else if (path === '/amenities/bookings') body = [booking];
  else if (path.includes('/amenities/bookings/') && path.endsWith('/status')) { booking.status = JSON.parse(event.request.postData).status; body = booking; }
  else if (path === '/reports/occupancy') {
    if (reportDelay) await delay(reportDelay);
    if (reportFails) { status = 500; body = { message: 'Report temporarily unavailable' }; }
    else body = { buildings: [], totals: { buildings: 0, floors: 0, total_flats: 0, occupied_flats: 0, vacant_flats: 0, occupancy_percentage: 0 } };
  } else if (path === '/audit-logs') {
    auditAction = url.searchParams.get('action');
    body = { items: populatedAudit ? [auditRecord] : [], total: populatedAudit ? 51 : 0, page: Number(url.searchParams.get('page') || 1), limit: Number(url.searchParams.get('limit') || 10), totalPages: populatedAudit ? 6 : 0 };
  } else if (path === '/audit-logs/audit-a') {
    if (detailFails) { status = 500; body = { message: 'Detail temporarily unavailable' }; } else body = auditRecord;
  } else if (path === '/reports/residents') {
    const page = Number(url.searchParams.get('page') || 1);
    body = { items: [{ resident_id: actor, kyc_status: 'VERIFIED', app_access_status: true, is_active: true, flat: { flat_identifier: '101' }, building: { name: 'Tower A' }, floor: null }], total: 35, page, limit: 15, totalPages: 3 };
  } else if (path === '/visitors') body = [visitor];
  else if (path === '/visitor-visits') body = visits;
  else if (path.startsWith('/visitor-visits/')) {
    const record = visits.find(visit => visit.id === path.split('/')[2]);
    const update = JSON.parse(event.request.postData || '{}');
    if (update.check_in) record.actual_entry_time = today;
    if (update.visit_status) record.visit_status = update.visit_status;
    body = record;
  }
  else if (path === '/visitor-passes') body = [];
  else if (path === '/notices/capabilities') body = { scheduledPublication: false, deliveryWorker: false, pushDispatch: false };
  else if (path === '/notices/page' || path === '/polls/page') {
    const page = Number(url.searchParams.get('page') || 1);
    const limit = Number(url.searchParams.get('limit') || 10);
    collectionQueries.push({ path, page, limit });
    const items = Array.from({ length: Math.min(limit, 95 - (page - 1) * limit) }, (_, index) => {
      const number = (page - 1) * limit + index + 1;
      return { id: `collection-${number}`, title: `${path.includes('notices') ? 'Notice' : 'Poll'} record ${number}`, content: 'Society update', status: 'DRAFT', created_at: today, starts_at: today, ends_at: tomorrow };
    });
    body = { items, total: 95, page, limit, totalPages: 10 };
  } else if (path === '/files/upload') {
    uploadBody = event.request.postData || (await command('Network.getRequestPostData', { requestId: event.networkId })).postData;
    uploadedDocument = { id: 'document-a', original_filename: 'architecture.txt', mime_type: 'text/plain', size_bytes: 26, document_scope: 'SOCIETY', category: 'Architecture & Plans', status: 'ACTIVE', created_at: today };
    body = uploadedDocument;
  } else if (path === '/files/document-a') {
    contentType = 'text/plain'; raw = Buffer.from('Society architecture plans').toString('base64');
  } else if (path === '/buildings') body = [{ id: 'building', name: 'Tower A', organization_id: org, isActive: true, totalFloors: 1 }];
  else if (path === '/floors') body = [{ id: 'floor', building_id: 'building', floor_number: 1 }];
  else if (path === '/flats') body = [{ id: 'flat', building_id: 'building', floor_id: 'floor', flat_identifier: '101', flat_type: '2 BHK', isActive: true }];
  else if (path === '/residents') {
    residentReads++;
    if (residentsFail) { status = 500; body = { message: 'Residents unavailable' }; }
    else body = residentRecords;
  }
  else if (path.startsWith('/residents/')) {
    const id = path.split('/')[2];
    const resident = residentRecords.find(record => record.id === id);
    if (residentMutationFails) { status = 500; body = { message: 'Update unavailable' }; }
    else if (!resident) { status = 404; body = { message: 'Resident not found' }; }
    else if (event.request.method === 'DELETE') {
      residentRecords = residentRecords.filter(record => record.id !== id);
      body = resident;
    } else {
      Object.assign(resident, JSON.parse(event.request.postData || '{}'));
      body = resident;
    }
  }
  else if (path === '/files/good-photo') { raw = png; contentType = 'image/png'; }
  else if (path === '/files/bad-photo') { raw = Buffer.from('broken-image').toString('base64'); contentType = 'image/png'; }
  else if (path === '/files/stats') body = { total: uploadedDocument ? 1 : 0, societyCount: uploadedDocument ? 1 : 0, flatCount: 0, pendingReviewCount: 0 };
  else if (path === '/files') body = { data: uploadedDocument ? [uploadedDocument] : [], total: uploadedDocument ? 1 : 0, page: 1, limit: 10 };
  else if (path.includes('folder')) body = { data: [], total: 0 };
  await command('Fetch.fulfillRequest', { requestId: event.requestId, responseCode: status, responseHeaders: [{ name: 'Content-Type', value: contentType }, { name: 'Access-Control-Allow-Origin', value: '*' }, { name: 'Access-Control-Allow-Headers', value: 'authorization,x-organization-id,content-type,accept' }, { name: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,PATCH,DELETE,OPTIONS' }], body: raw || Buffer.from(JSON.stringify(body)).toString('base64') });
}
ws.addEventListener('message', async event => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const task = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) task?.reject(new Error(message.error.message)); else task?.resolve(message.result);
  } else if (message.method === 'Fetch.requestPaused') {
    intercept(message.params).catch(error => errors.push(error.message));
  } else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
  else if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') browserLog.push(message.params.args.map(arg => arg.value).join(' '));
});
async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
async function wait(expression, label, timeout = 20000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) { if (await evaluate(expression)) return; await delay(100); }
  throw new Error(`Timeout: ${label}\n${await evaluate('document.body.innerText.slice(-1500)')}\nErrors: ${JSON.stringify(errors)}\nConsole: ${JSON.stringify(browserLog)}\nRequests: ${JSON.stringify(paths.slice(-15))}`);
}
async function waitForHierarchy() {
  const deadline = Date.now() + 10000;
  await delay(100);
  while (hierarchyResponses !== hierarchyRequests && Date.now() < deadline) await delay(50);
  assert.ok(hierarchyRequests > 0 && hierarchyResponses === hierarchyRequests, 'Saved hierarchy completed');
  await delay(100);
}
async function navigate(section) {
  await command('Page.navigate', { url: `${frontend}/admin?section=${section}` });
  await wait(`Boolean(document.querySelector('#section-${section === 'role_master' ? 'role-master' : section}')) || document.body?.innerText?.includes(${JSON.stringify(section === 'residents' ? 'Registered Residents Directory' : section === 'role_master' ? 'Role Master' : 'never-match')})`, section);
}
async function clickText(text) {
  await wait(`Boolean([...document.querySelectorAll('button')].find(node => node.textContent.trim() === ${JSON.stringify(text)} && !node.disabled && !node.closest('[inert]')))`, `button ready: ${text}`);
  const clicked = await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find(node => node.textContent.trim() === ${JSON.stringify(text)}); if (!button || button.disabled) return false; button.click(); return true; })()`);
  assert.ok(clicked, `Button available: ${text}`);
}
let checks = 0;
const check = label => { checks++; process.stdout.write(`PASS ${label}\n`); };
try {
  await command('Page.enable'); await command('Runtime.enable');
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await command('Fetch.enable', { patterns: [{ urlPattern: '*/api/v1/*', requestStage: 'Request' }] });
  const session = { societyos_session_auth: JSON.stringify({ id: actor, name: 'Stale Wrong Name', role: 'admin', societyId: org }), societyos_access_token: 'test-token', societyos_refresh_token: 'test-refresh', societyos_roles: JSON.stringify(['SOCIETY_ADMIN']), societyos_permissions: JSON.stringify(permissions), societyos_memberships: JSON.stringify([{ role: 'SOCIETY_ADMIN', organizationId: org, permissions }]), societyos_organization_id: org };
  await command('Page.addScriptToEvaluateOnNewDocument', { source: `for (const [key,value] of Object.entries(${JSON.stringify(session)})) sessionStorage.setItem(key,value);` });
  await navigate('amenities');
  await wait(`document.body?.innerText?.includes('Test Administrator') && !document.querySelector('.admin-loading-overlay')`, 'profile and amenities ready');
  assert.equal(await evaluate(`document.querySelectorAll('.user-name')[0].textContent.trim()`), fullName);
  assert.equal(await evaluate(`document.body?.innerText?.includes('Stale Wrong Name')`), false);
  check('Authenticated name renders in header/sidebar without cached identity');
  assert.equal(await evaluate(`document.querySelectorAll('[aria-label="Residents & App Access"]').length`), 1);
  assert.equal(await evaluate(`document.querySelectorAll('.sidebar-link')[3].textContent.trim()`), 'People & Staff');
  releaseInitialHierarchy();
  await waitForHierarchy();
  assert.equal(await evaluate(`document.querySelectorAll('[aria-label="Residents & App Access"]').length`), 1);
  assert.equal(await evaluate(`document.querySelectorAll('.sidebar-link')[3].textContent.trim()`), 'People & Staff');
  check('Residents stays visible when delayed saved hierarchy omits its record');
  const menusBeforeFocus = hierarchyRequests;
  const authBeforeFocus = authRequests;
  await evaluate('window.dispatchEvent(new Event("focus"))');
  for (let attempt = 0; attempt < 40 && authRequests === authBeforeFocus; attempt++) await delay(50);
  assert.ok(authRequests > authBeforeFocus);
  await delay(300);
  assert.equal(hierarchyRequests, menusBeforeFocus);
  assert.equal(await evaluate(`document.querySelectorAll('[aria-label="Residents & App Access"]').length`), 1);
  check('Profile refresh does not reload or clear menu hierarchy');
  assert.equal(await evaluate(`(() => { const links=[...document.querySelectorAll('.sidebar-link')]; return links.findIndex(node=>node.getAttribute('aria-label')==='Residents & App Access')===links.findIndex(node=>node.getAttribute('aria-label')==='Society & Buildings')+1; })()`), true);
  assert.equal(await evaluate(`document.querySelector('.complaint-badge').textContent`), '9+');
  check('Dynamic menu ordering and 9+ complaint badge');
  badgeCount = 5; fullName = 'Updated Administrator';
  await navigate('amenities');
  await wait(`document.querySelector('.user-name')?.textContent.trim() === 'Updated Administrator' && document.querySelector('.complaint-badge')?.textContent === '5'`, 'updated profile and badge');
  check('Profile changes and count from one through nine update after refresh');
  badgeCount = 0;
  await navigate('amenities');
  await wait(`document.querySelector('.user-name')?.textContent.trim() === 'Updated Administrator' && !document.querySelector('.admin-loading-overlay')`, 'zero count response');
  assert.equal(await evaluate(`document.querySelector('.complaint-badge') === null`), true);
  check('Zero actionable complaints hides badge');
  await evaluate(`document.querySelector('#sidebarToggle').click()`);
  await wait(`Math.round(document.querySelector('.admin-sidebar').getBoundingClientRect().width) === 76`, 'sidebar collapse transition');
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.sidebar-link svg')).display !== 'none' && getComputedStyle(document.querySelector('.sidebar-link-label')).display === 'none'`), true);
  await command('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 38, y: await evaluate(`document.querySelector('.sidebar-link').getBoundingClientRect().top + 20`) });
  await wait(`Boolean(document.querySelector('[role=tooltip]'))`, 'collapsed tooltip');
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('[role=tooltip]')).position`), 'fixed');
  check('Collapsed icons, labels, hover tooltip, and sidebar width');
  await evaluate(`document.querySelector('#sidebarToggle').click()`);
  await clickText('Booking Approvals (1)'); await clickText('Reject');
  await wait(`document.querySelector('.statement-table tbody').innerText.includes('Rejected')`, 'rejection');
  assert.equal(booking.status, 'Rejected'); check('Reject submits Rejected and updates booking row');
  booking.status = 'Approved';
  await navigate('amenities'); await clickText('Booking Approvals (1)');
  await evaluate('window.confirm = () => false'); await clickText('Revoke'); assert.equal(booking.status, 'Approved');
  await evaluate('window.confirm = () => true'); await clickText('Revoke');
  await wait(`document.querySelector('.statement-table tbody').innerText.includes('Revoked')`, 'revocation');
  assert.equal(booking.status, 'Revoked'); check('Revocation confirmation and persisted API response');
  booking.status = 'Approved'; booking.date = '2000-01-01';
  await navigate('amenities'); await clickText('Booking Approvals (1)');
  await wait(`document.querySelector('.statement-table tbody')?.innerText.includes('Approved')`, 'past approved booking');
  assert.equal(await evaluate(`[...document.querySelectorAll('.statement-table button')].some(button => button.textContent.trim() === 'Revoke')`), false);
  check('Past approved bookings retain approval without a revoke action');
  booking.date = '2099-01-01';

  await navigate('role_master'); await wait(`Boolean([...document.querySelectorAll('button')].find(node => node.textContent.trim() === 'Menu Master (55)'))`, 'menu tab'); await clickText('Menu Master (55)');
  await wait(`Boolean(document.querySelector('[aria-label="Menus per page"]')) && !document.querySelector('.admin-loading-overlay')`, 'menu table');
  for (const size of [10, 20, 50]) {
    await evaluate(`(() => { const node=document.querySelector('[aria-label="Menus per page"]'); node.value='${size}'; node.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    await wait(`document.querySelectorAll('.rbac-matrix-table tbody tr').length === ${size} && !document.querySelector('.admin-loading-overlay')`, `${size} menu rows`);
  }
  check('Registered Menus renders 10/20/50 server-paginated rows');
  await clickText('Next'); await wait(`document.querySelector('.table-pagination').innerText.includes('Page 2') && !document.querySelector('.admin-loading-overlay')`, 'next menu page');
  assert.equal(await evaluate(`document.querySelectorAll('.rbac-matrix-table tbody tr').length`), 5);
  check('Menu next page, final row count, and totals');
  menusFail = true; await clickText('Previous');
  await wait(`Boolean(document.querySelector('[role=alert]')) && !document.querySelector('.admin-loading-overlay')`, 'menu failure');
  menusFail = false; await clickText('Retry');
  await wait(`document.querySelectorAll('.rbac-matrix-table tbody tr').length === 50 && !document.querySelector('.admin-loading-overlay')`, 'menu retry');
  check('Menu API error, overlay cleanup, and retry');
  await evaluate(`(() => { const input=document.querySelector('input[placeholder="Search menus..."]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Registered 55'); input.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await wait(`document.querySelectorAll('.rbac-matrix-table tbody tr').length === 1 && document.querySelector('.table-pagination').innerText.includes('Page 1 of 1') && !document.querySelector('.admin-loading-overlay')`, 'menu search reset');
  check('Menu search filters server records and resets pagination');
  reportDelay = 800; await navigate('reports');
  await wait(`Boolean(document.querySelector('.admin-loading-overlay'))`, 'report overlay');
  assert.equal(await evaluate(`document.querySelectorAll('.admin-loading-overlay').length`), 1);
  assert.equal(await evaluate(`Boolean(document.querySelector('[inert]'))`), true);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.admin-loading-overlay')).backdropFilter.includes('blur')`), true);
  assert.equal(await evaluate(`(() => { const area=document.querySelector('.admin-loading-overlay').getBoundingClientRect(); const status=document.querySelector('.admin-loading-status').getBoundingClientRect(); return Math.abs(area.left+area.width/2-status.left-status.width/2)<2 && Math.abs(area.top+area.height/2-status.top-status.height/2)<2; })()`), true);
  await wait(`!document.querySelector('.admin-loading-overlay') && document.body?.innerText?.includes('No building records found')`, 'empty occupancy');
  check('Single blocking overlay, success cleanup, and real empty report state');
  reportFails = true; await navigate('reports');
  await wait(`document.body?.innerText?.includes('Failed to load report') && !document.querySelector('.admin-loading-overlay')`, 'report error');
  reportFails = false; await clickText('Retry');
  await wait(`document.body?.innerText?.includes('No building records found') && !document.querySelector('.admin-loading-overlay')`, 'report retry');
  check('Report error and retry release loading overlay');
  await navigate('audit');
  await wait(`document.body?.innerText?.includes('No audit records match') && !document.querySelector('.admin-loading-overlay')`, 'empty audit');
  assert.equal(await evaluate(`document.querySelector('[aria-label="Audit records per page"]').value`), '10');
  await evaluate(`(() => { const node=document.querySelector('select'); node.value='CREATE'; node.dispatchEvent(new Event('change',{bubbles:true})); })()`);
  await delay(300); assert.equal(auditAction, 'CREATE');
  check('Audit empty state, default 10, and valid backend action filter');
  await navigate('residents');
  await wait(`location.pathname === '/admin/residents' && Boolean(document.querySelector('#section-residents')) && !document.querySelector('.admin-loading-overlay')`, 'dedicated Residents route');
  assert.equal(await evaluate(`document.querySelector('[aria-label="Residents & App Access"]').getAttribute('href')`), '/admin/residents');
  assert.equal(await evaluate(`document.body.innerText.includes('Society Architecture & Infrastructure') || Boolean(document.querySelector('.module-subnav'))`), false);
  check('Legacy Residents tab redirects to dedicated page without Buildings interface');
  await wait(`document.querySelectorAll('.resident-directory-photo').length === 1 && Boolean(document.querySelector('.resident-directory-avatar'))`, 'private resident image and fallback');
  assert.equal(await evaluate(`document.querySelector('.resident-directory-photo').naturalWidth`), 1);
  assert.equal(await evaluate(`document.querySelector('.resident-directory-avatar').textContent`), 'FR');
  check('Authenticated resident photo and failed-image initials fallback');
  if (process.env.SOCIETYOS_TEST_RESIDENTS_SCREENSHOT) {
    const screenshot = await command('Page.captureScreenshot', { format: 'png' });
    await writeFile(process.env.SOCIETYOS_TEST_RESIDENTS_SCREENSHOT, Buffer.from(screenshot.data, 'base64'));
  }
  await evaluate(`(() => { const input=document.querySelector('[aria-label="Search residents"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'no matching resident'); input.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await wait(`document.body.innerText.includes('No residents match your search.')`, 'resident search empty state');
  await evaluate(`(() => { const input=document.querySelector('[aria-label="Search residents"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'9111111111'); input.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await wait(`document.querySelectorAll('#section-residents tbody tr').length === 1 && document.querySelector('#section-residents tbody').innerText.includes('Test Resident')`, 'resident phone search');
  check('Resident search uses real phone data and displays no-match state');
  residentRecords = [...originalResidents.map(resident => ({ ...resident })), ...Array.from({ length: 49 }, (_, index) => ({ ...originalResidents[1], id: `resident-extra-${index}`, name: `ZZ Resident ${String(index).padStart(2, '0')}`, profile_photo_file_id: null }))];
  await command('Page.navigate', { url: `${frontend}/admin/residents` });
  await wait(`Boolean(document.querySelector('[aria-label="Residents per page"]')) && !document.querySelector('.admin-loading-overlay')`, 'resident pagination ready');
  for (const size of [10, 20, 50]) {
    await evaluate(`(() => { const node=document.querySelector('[aria-label="Residents per page"]'); node.value='${size}'; node.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    await wait(`document.querySelectorAll('#section-residents tbody tr').length === ${size}`, `${size} resident rows`);
  }
  await clickText('Next');
  await wait(`document.querySelector('.resident-directory-pagination').innerText.includes('Page 2 of 2') && document.querySelectorAll('#section-residents tbody tr').length === 1`, 'last resident page');
  assert.equal(await evaluate(`document.querySelector('#section-residents tbody td').textContent`), '51');
  await evaluate('window.confirm = () => false'); await clickText('Delete');
  assert.equal(residentRecords.length, 51);
  await evaluate('window.confirm = () => true'); await clickText('Delete');
  await wait(`document.querySelector('.resident-directory-pagination').innerText.includes('Page 1 of 1') && document.querySelectorAll('#section-residents tbody tr').length === 50`, 'resident page clamps after deletion');
  check('Resident pagination 10/20/50, last-page serials, delete confirmation and page clamp');
  await evaluate(`(() => { const node=document.querySelector('[aria-label="Sort residents"]'); node.value='name:desc'; node.dispatchEvent(new Event('change',{bubbles:true})); })()`);
  await wait(`document.querySelector('#section-residents tbody tr').innerText.includes('ZZ Resident 47')`, 'descending resident sort');
  check('Resident sorting matches displayed data');
  residentRecords = originalResidents.map(resident => ({ ...resident }));
  await command('Page.navigate', { url: `${frontend}/admin/residents` });
  await wait(`document.querySelectorAll('#section-residents tbody tr').length === 2 && !document.querySelector('.admin-loading-overlay')`, 'resident actions ready');
  await clickText('Disable Access');
  await wait(`!document.querySelector('#section-residents tbody tr:last-child').innerText.includes('Disable Access')`, 'access updated');
  assert.equal(residentRecords.find(resident => resident.id === 'resident-one').app_access_status, false);
  await command('Page.reload');
  await wait(`document.querySelectorAll('#section-residents tbody tr').length === 2 && !document.querySelector('.admin-loading-overlay')`, 'access reload');
  assert.equal(await evaluate(`document.querySelector('#section-residents tbody tr:last-child').innerText.includes('Disabled')`), true);
  residentMutationFails = true;
  await clickText('Enable Access');
  await wait(`document.body.innerText.includes('The server encountered an error.')`, 'resident mutation error');
  assert.equal(residentRecords.every(resident => resident.app_access_status === false), true);
  residentMutationFails = false;
  check('App access persists after reload; failed action preserves existing status');
  await evaluate(`[...document.querySelectorAll('#section-residents tbody tr')].find(row=>row.innerText.includes('Test Resident')).querySelector('button').click()`);
  await wait(`Boolean(document.querySelector('[aria-label="Edit resident profile"]'))`, 'resident edit wizard');
  assert.equal(await evaluate(`document.querySelector('[placeholder="e.g. Riya Patel"]').value`), 'Test Resident');
  await evaluate(`(() => { const input=document.querySelector('[placeholder="e.g. Riya Patel"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Updated Resident'); input.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await clickText('Continue'); await clickText('Continue'); await clickText('Continue'); await clickText('Save Changes');
  await wait(`!document.querySelector('[role="dialog"]') && document.querySelector('#section-residents tbody').innerText.includes('Updated Resident') && !document.querySelector('.admin-loading-overlay')`, 'saved resident edit');
  await command('Page.reload');
  await wait(`document.querySelector('#section-residents tbody')?.innerText.includes('Updated Resident') && !document.querySelector('.admin-loading-overlay')`, 'saved edit reload');
  check('Existing edit wizard saves profile and directory stays correct after reload');
  await clickText('+ Add Resident');
  await wait(`Boolean(document.querySelector('[aria-label="Onboard new resident"]'))`, 'onboarding wizard');
  assert.equal(await evaluate(`document.querySelector('[placeholder="e.g. Riya Patel"]').value`), '');
  await clickText('Cancel');
  check('Add Resident opens existing onboarding flow without stale edit values');
  residentsFail = true;
  await command('Page.reload');
  await wait(`Boolean(document.querySelector('#section-residents [role="alert"]')) && !document.querySelector('.admin-loading-overlay')`, 'resident fetch error');
  residentsFail = false;
  await clickText('Retry');
  await wait(`document.querySelectorAll('#section-residents tbody tr').length === 2 && !document.querySelector('.admin-loading-overlay')`, 'resident fetch retry');
  check('Residents API error and retry release loading overlay');
  residentRecords = [];
  await command('Page.reload');
  await wait(`document.body.innerText.includes('No residents registered in this organization yet.') && !document.querySelector('.admin-loading-overlay')`, 'resident empty dataset');
  check('Residents page handles empty dataset');
  residentRecords = originalResidents.map(resident => ({ ...resident }));
  await evaluate(`document.querySelector('[aria-label="Clubhouse & Amenities"]').click()`);
  await wait(`location.pathname === '/admin' && document.querySelector('#section-amenities') && !document.querySelector('.admin-loading-overlay')`, 'navigation away from Residents');
  const pathsBeforeResidents = paths.length;
  const readsBeforeResidents = residentReads;
  await evaluate(`document.querySelector('[aria-label="Residents & App Access"]').click()`);
  await wait(`location.pathname === '/admin/residents' && document.querySelectorAll('#section-residents tbody tr').length === 2 && !document.querySelector('.admin-loading-overlay')`, 'Residents sidebar navigation');
  assert.ok(residentReads > readsBeforeResidents);
  assert.equal(paths.slice(pathsBeforeResidents).some(path => path.startsWith('/staff')), false);
  assert.equal(await evaluate(`document.querySelector('[aria-label="Residents & App Access"]').classList.contains('active')`), true);
  check('Sidebar opens dedicated Residents page with active state and no staff requests');
  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await command('Page.reload');
  await wait(`document.querySelectorAll('#section-residents tbody tr').length === 2 && !document.querySelector('.admin-loading-overlay')`, 'mobile Residents page');
  assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('#section-residents .statement-table').parentElement).overflowX`), 'auto');
  check('Residents mobile layout contains table scrolling without page overflow');
  await navigate('amenities');
  await wait(`document.querySelector('.admin-sidebar').classList.contains('closed')`, 'mobile menu closed');
  await evaluate(`document.querySelector('#sidebarToggle').click()`);
  await wait(`Math.round(document.querySelector('.admin-sidebar').getBoundingClientRect().left) === 0`, 'mobile drawer transition');
  await evaluate(`document.querySelector('[aria-label="Reports & Analytics"]').click()`);
  await wait(`document.querySelector('.admin-sidebar').classList.contains('closed')`, 'mobile navigation closes drawer');
  check('Mobile menu opens and closes after navigation');
  assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true);
  check('Mobile navigation produces no horizontal overflow');
  for (const mode of ['disabled', 'restricted']) {
    residentsMenuMode = mode;
    const before = hierarchyRequests;
    await navigate('amenities');
    for (let attempt = 0; attempt < 40 && hierarchyRequests === before; attempt++) await delay(50);
    await waitForHierarchy();
    assert.equal(await evaluate(`document.querySelectorAll('[aria-label="Residents & App Access"]').length`), 0);
    check(`Explicitly ${mode} Residents menu is respected`);
  }
  residentsMenuMode = 'missing';
  omitResidentPermission = true;
  await navigate('amenities');
  await waitForHierarchy();
  assert.equal(await evaluate(`document.querySelectorAll('[aria-label="Residents & App Access"]').length`), 0);
  check('Missing resident permission never adds resident navigation');
  await command('Page.navigate', { url: `${frontend}/admin/residents` });
  await wait(`document.body.innerText.includes('Access denied. Resident read permission is required.') && !document.querySelector('.admin-loading-overlay')`, 'direct Residents permission denial');
  assert.equal(await evaluate(`Boolean(document.querySelector('#resident-directory'))`), false);
  check('Direct Residents route denies missing resident-read permission');
  omitResidentPermission = false;
  residentReadOnly = true;
  await command('Page.navigate', { url: `${frontend}/admin/residents` });
  await wait(`document.querySelectorAll('#section-residents tbody tr').length === 2 && !document.querySelector('.admin-loading-overlay') && ![...document.querySelectorAll('button')].some(button => button.textContent.trim() === '+ Add Resident')`, 'read-only Residents directory');
  assert.equal(await evaluate(`document.querySelectorAll('#section-residents tbody button').length`), 0);
  check('Read-only Residents permission displays records without management actions');
  residentReadOnly = false;
  await navigate('residents');
  await waitForHierarchy();
  assert.equal(await evaluate(`document.querySelectorAll('[aria-label="Residents & App Access"]').length`), 1);
  check('Resident directory and menu survive refresh with legacy saved configuration');

  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate('staff'); await waitForHierarchy();
  assert.equal(await evaluate(`document.querySelectorAll('.sidebar-link')[3].textContent.trim()`), 'People & Staff');
  check('People & Staff stays fourth before hierarchy load and after navigation');
  await navigate('overview');
  await wait(`document.querySelectorAll('#section-overview .kpi-value')[1]?.textContent === '2'`, 'only current society date visitors');
  assert.equal(await evaluate(`document.querySelectorAll('#section-overview .kpi-sub')[1].textContent.includes('1 Inside')`), true);
  assert.equal(await evaluate(`document.body.innerText.includes('Automatic Number Plate Recognition') && document.body.innerText.includes('not connected to this system')`), true);
  assert.equal(await evaluate(`document.body.innerText.includes('ANPR RADAR: ACTIVE') || document.body.innerText.includes('Gate Normal')`), false);
  await clickText('Gate Operations');
  await wait(`Boolean(document.querySelector('#section-visitors'))`, 'gate operations navigation');
  const visitorReads = () => paths.filter(path => ['/visitors', '/visitor-visits', '/visitor-passes'].includes(path)).length;
  await delay(500); const beforeIdle = visitorReads();
  await delay(31500); assert.equal(visitorReads(), beforeIdle);
  check('Dashboard counts today only; gate controls explain hardware; Security Access makes no idle 30-second requests');
  await clickText('Check In at Gate');
  await wait(`document.querySelector('#count-checkedin')?.textContent.trim() === '2'`, 'manual gate check-in');
  await clickText('Record Exit & Check Out');
  await wait(`document.querySelector('#count-checkedin')?.textContent.trim() === '1' && document.querySelector('#count-checkedout')?.textContent.trim() === '2'`, 'manual gate checkout');
  check('Normal gate check-in and checkout persist through API and update pipeline');


  await navigate('notices');
  await wait(`document.querySelectorAll('#section-notices h3').length === 10`, 'ten notices');
  await evaluate(`document.querySelector('[aria-label="Notices pagination"] [aria-label="Page 10"]').click()`);
  await wait(`document.querySelectorAll('#section-notices h3').length === 5 && document.body.innerText.includes('Notice record 95')`, 'last notices page');
  assert.ok(collectionQueries.some(query => query.path === '/notices/page' && query.page === 10 && query.limit === 10));
  await clickText('Community Polls & Voting');
  await wait(`Boolean(document.querySelector('[aria-label="Polls pagination"]')) && document.body.innerText.includes('Poll record 1')`, 'poll page');
  await evaluate(`document.querySelector('[aria-label="Polls pagination"] [aria-label="Page 10"]').click()`);
  await wait(`document.body.innerText.includes('Poll record 95')`, 'last polls page');
  assert.ok(collectionQueries.some(query => query.path === '/polls/page' && query.page === 10 && query.limit === 10));
  check('Notices and polls use ten-row server pages with first/last navigation');

  reportFails = false; await navigate('reports');
  await clickText('Residents');
  await wait(`document.querySelector('#section-reports tbody')?.innerText.includes('Tower A') && !document.querySelector('.admin-loading-overlay')`, 'resident report');
  assert.equal(await evaluate(`document.querySelector('#section-reports tbody').innerText.includes('undefined')`), false);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('#section-reports .module-tab-btn.active')).borderBottomColor !== 'rgba(0, 0, 0, 0)'`), true);
  await evaluate(`document.querySelector('[aria-label="Report records pagination"] [aria-label="Page 3"]').click()`);
  await wait(`document.querySelector('[aria-label="Report records pagination"]')?.innerText.includes('31–35') && !document.querySelector('.admin-loading-overlay')`, 'report numbered page');
  check('Report table, missing-floor fallback and numbered server pagination work');
  const reportShot = await command('Page.captureScreenshot', { format: 'png' }); await writeFile('/tmp/societyos-reports-desktop.png', Buffer.from(reportShot.data, 'base64'));

  populatedAudit = true; detailFails = true; await navigate('audit');
  await wait(`document.querySelector('#section-audit tbody')?.innerText.includes('UPDATE') && !document.querySelector('.admin-loading-overlay')`, 'audit records');
  await clickText('Inspect');
  await wait(`document.querySelector('[role="dialog"]')?.innerText.includes('Retry details')`, 'audit detail error');
  assert.equal(await evaluate(`document.querySelector('#section-audit tbody').innerText.includes('UPDATE')`), true);
  detailFails = false; await clickText('Retry details');
  await wait(`document.querySelector('[role="dialog"]')?.innerText.includes('102')`, 'audit detail retry');
  await clickText('Close');
  await evaluate(`document.querySelector('[aria-label="Audit events pagination"] [aria-label="Page 6"]').click()`);
  await wait(`document.querySelector('[aria-label="Audit events pagination"]')?.innerText.includes('51–51') && !document.querySelector('.admin-loading-overlay')`, 'audit final page');
  check('Audit list, detail failure/retry and last-page navigation work');
  const auditShot = await command('Page.captureScreenshot', { format: 'png' }); await writeFile('/tmp/societyos-audit-desktop.png', Buffer.from(auditShot.data, 'base64'));

  await navigate('documents');
  await wait(`!document.querySelector('.admin-loading-overlay')`, 'document vault');
  await clickText('Upload Document');
  await evaluate(`(() => { const input=document.querySelector('#upload-file-input'); const transfer=new DataTransfer(); transfer.items.add(new File(['Society architecture plans'], 'architecture.txt', { type:'text/plain' })); input.files=transfer.files; input.dispatchEvent(new Event('change',{bubbles:true})); const category=[...document.querySelectorAll('.modal-card select')].find(node=>[...node.options].some(option=>option.value==='Architecture & Plans')); category.value='Architecture & Plans'; category.dispatchEvent(new Event('change',{bubbles:true})); })()`);
  await clickText('Confirm Upload');
  await wait(`document.querySelector('.doc-table')?.innerText.includes('architecture.txt') && !document.querySelector('.admin-loading-overlay')`, 'uploaded document displayed');
  assert.ok(uploadBody.includes('DOCUMENT')); assert.ok(uploadBody.includes('Architecture & Plans'));
  await evaluate(`document.querySelector('button[aria-label="Actions for architecture.txt"]').click()`);
  await wait(`Boolean(document.querySelector('[aria-label="Preview"]'))`, 'document actions');
  await evaluate(`document.querySelector('[aria-label="Preview"]').click()`);
  await wait(`document.querySelector('.modal-card pre')?.textContent === 'Society architecture plans'`, 'authorized document preview');
  check('Architecture document uploads with explicit classification, appears in vault and previews actual content');
  assert.deepEqual(errors, []);
  process.stdout.write(`${checks} browser checks passed.\n`);
} finally {
  await command('Page.close').catch(() => {});
  ws.close();
}
