/** Run against a local dev server and disposable Chrome remote-debugging profile.
 * All /api/v1 requests are intercepted. Never uses a real login or live API.
 * node tests/smart-island.browser.mjs
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

const paths = [];
const org = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';
const permissions = ['complaint:my', 'notification:read', 'visitor:my'];
const notification = (id, type = 'GENERAL') => ({ id, organization_id: org, recipient_user_id: userId, type, title: `Update ${id}`, body: `Message ${id}`, data: null, is_read: false, created_at: '2026-10-01T10:00:00Z' });
let records = [notification('one')];
let requests = [];
let visits = [];
let notices = [];
let fail = false;
let inboxDelay = 800;
async function intercept(event) {
  const url = new URL(event.request.url);
  const path = url.pathname.replace('/api/v1', '');
  const method = event.request.method;
  paths.push(path);
  let body = [];
  let status = 200;
  if (path === '/auth/me') body = { user: { id: userId, mobileNumber: '9111111111' }, memberships: [{ role: 'RESIDENT', organizationId: org, permissions }] };
  else if (path === '/residents/me') body = { id: 'resident', user_id: userId, organization_id: org, name: 'Test Resident', flat_id: null, isActive: true, app_access_status: true, kyc_status: 'VERIFIED' };
  else if (path === '/complaints/my') body = requests;
  else if (path === '/visitor-visits/my') body = visits;
  else if (path === '/notices') body = notices;
  else if (method === 'PATCH' && /^\/visitor-visits\/my\/[^/]+\/decision$/.test(path)) {
    const payload = JSON.parse(event.request.postData || '{}');
    const visit = visits.find(item => path.includes(item.id));
    if (!visit) { status = 404; body = { message: 'Visitor visit not found' }; }
    else {
      visit.visit_status = payload.decision === 'APPROVED' ? 'CONFIRMED' : 'CANCELLED';
      body = visit;
    }
  }
  else if (path === '/notifications/page') {
    if (inboxDelay) await delay(inboxDelay);
    if (fail) { status = 500; body = { message: 'Unavailable' }; }
    else { const filtered = records.filter(record => url.searchParams.get('unread') !== 'true' || !record.is_read); body = { items: filtered, total: filtered.length, page: 1, totalPages: 1 }; }
  } else if (path.startsWith('/notifications/') && path.endsWith('/read')) {
    const record = records.find(record => path.includes(record.id));
    if (record) { record.is_read = true; body = record; }
  } else if (path === '/notifications') body = records;
  await command('Fetch.fulfillRequest', { requestId: event.requestId, responseCode: status, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' }, { name: 'Access-Control-Allow-Headers', value: 'authorization,x-organization-id,content-type,accept' }, { name: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,PATCH,DELETE,OPTIONS' }], body: Buffer.from(JSON.stringify(body)).toString('base64') });
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

let checks = 0;
const check = label => { checks++; process.stdout.write(`PASS ${label}\n`); };
const title = () => evaluate("document.querySelector('.island-toggle')?.dataset.eventId");
const refresh = () => evaluate("window.dispatchEvent(new Event('focus'))");
const islandBounds = () => evaluate("document.querySelector('.society-smart-island').getBoundingClientRect().toJSON()");
async function activate(selector, touch = true) {
  const point = await evaluate(`(() => {
    const button = document.querySelector(${JSON.stringify(selector)});
    const bounds = button.getBoundingClientRect();
    const x = bounds.left + bounds.width / 2;
    const y = bounds.top + bounds.height / 2;
    return { x, y, reachable: button.contains(document.elementFromPoint(x, y)) };
  })()`);
  assert.equal(point.reachable, true, `${selector} must be visible and receive input`);
  if (touch) {
    await command('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: point.x, y: point.y }] });
    await command('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } else {
    await command('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
    await command('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
    await command('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1, y: 1 });
  }
}
async function assertTopIsland() {
  assert.equal(await evaluate(`(() => {
    const island = document.querySelector('.society-smart-island');
    const bounds = island.getBoundingClientRect();
    const screen = document.querySelector('.phone-screen').getBoundingClientRect();
    const header = document.querySelector('.phone-header').getBoundingClientRect();
    const clock = document.querySelector('.phone-status-bar > span').getBoundingClientRect();
    const icons = document.querySelector('.status-bar-icons').getBoundingClientRect();
    return document.querySelectorAll('.society-smart-island').length === 1
      && Math.abs(bounds.top - screen.top - 8) < 1
      && Math.abs(bounds.left + bounds.width / 2 - screen.left - screen.width / 2) < 1
      && bounds.bottom <= header.top
      && bounds.left > clock.right && bounds.right < icons.left
      && getComputedStyle(island).backgroundColor === 'rgb(0, 0, 0)'
      && getComputedStyle(document.querySelector('.device-notch')).display === 'none'
      && getComputedStyle(document.querySelector('.phone-body')).paddingBottom === '84px';
  })()`), true, 'One black top island replaces the notch, clears status icons/header, and removes bottom-pill space');
}
async function screenshot(name) {
  const { data } = await command('Page.captureScreenshot', { format: 'png' });
  await writeFile(`/tmp/societyos-island-top-${name}.png`, Buffer.from(data, 'base64'));
}
try {
  await command('Page.enable'); await command('Runtime.enable');
  await command('Fetch.enable', { patterns: [{ urlPattern: '*/api/v1/*', requestStage: 'Request' }] });
  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await command('Emulation.setTouchEmulationEnabled', { enabled: true });
  const session = { societyos_session_auth: JSON.stringify({ id: userId, name: 'Test Resident', role: 'resident', societyId: org }), societyos_access_token: 'test-token', societyos_refresh_token: 'test-refresh', societyos_roles: JSON.stringify(['RESIDENT']), societyos_permissions: JSON.stringify(permissions), societyos_memberships: JSON.stringify([{ role: 'RESIDENT', organizationId: org, permissions }]), societyos_organization_id: org };
  await command('Page.addScriptToEvaluateOnNewDocument', { source: `for (const [key,value] of Object.entries(${JSON.stringify(session)})) sessionStorage.setItem(key,value);` });
  await command('Page.navigate', { url: `${frontend}/complaints` });
  await wait("!document.querySelector('.society-smart-island')", 'hide island during initial loading');
  await delay(150);
  assert.equal(await evaluate("document.body.innerText.includes('Loading updates')"), false);
  check('Initial update fetch stays in the background without loading text');
  inboxDelay = 0;
  await wait("document.querySelector('.island-toggle')?.dataset.eventId", 'one event');
  await delay(450);
  assert.equal(await evaluate("document.querySelector('.island-toggle').textContent.trim()"), '1');
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.island-toggle')).height"), '40px');
  assert.equal(await evaluate("Boolean(document.querySelector('.island-toggle').querySelector('svg'))"), true);
  check('Compact island displays only a colored SVG icon, unread total, and control affordance at 40px');
  await assertTopIsland();
  check('Notification occupies the black top island; decorative notch and bottom pill are absent');
  const first = await title(); await delay(3300); assert.equal(await title(), first);
  check('One event stays stable without rotating');
  records = [notification('one'), notification('two'), notification('three')]; await refresh();
  await wait("document.querySelector('.island-toggle').dataset.eventId && document.querySelector('.island-toggle').getAttribute('aria-label').includes('3 unread')", 'three events');
  const before = await title();
  const beforeRotation = await islandBounds();
  await delay(3200); assert.notEqual(await title(), before);
  assert.deepEqual(await islandBounds(), beforeRotation);
  check('Three events rotate automatically after three seconds');
  check('Icon and title rotate without moving or resizing the top island');
  const selected = await title();
  records.push(notification('four'), notification('five')); await refresh();
  await wait("document.querySelector('.island-toggle').getAttribute('aria-label').includes('5 unread')", 'five events');
  assert.equal(await title(), selected);
  check('New events join five-event queue without resetting selection');
  const compactBounds = await islandBounds();
  await activate('.island-toggle');
  await wait("document.querySelectorAll('.island-event').length === 5 && document.querySelector('.society-smart-island').dataset.expanded === 'true' && document.querySelector('.society-smart-island').getBoundingClientRect().height > 100", 'full expanded list');
  assert.equal((await islandBounds()).top, compactBounds.top);
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.island-event p')).color"), 'rgb(255, 255, 255)');
  check('Touch expands the same top island downward with readable event details');
  assert.match(await evaluate("getComputedStyle(document.querySelector('.society-smart-island')).transitionDuration"), /0\.8s/);
  check('Island expansion uses smooth 700ms/800ms transitions');
  const paused = await title(); await delay(3300); assert.equal(await title(), paused);
  check('Expanded panel shows every event and pauses rotation');
  await evaluate("document.querySelector('.island-panel-header button').click()");
  await delay(3200); assert.notEqual(await title(), paused);
  check('Collapse resumes rotation');
  records.push(notification('emergency', 'EMERGENCY')); await refresh();
  await wait("document.querySelector('.society-smart-island').dataset.emergency === 'true'", 'critical alert');
  await delay(3300); assert.equal(await evaluate("document.querySelector('.society-smart-island').dataset.emergency"), 'true');
  assert.equal((await islandBounds()).height, compactBounds.height);
  assert.match(await evaluate("document.querySelector('.island-toggle').getAttribute('aria-label')"), /critical alert available/);
  check('Critical alert indicator stays visible across rotations');
  await command('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.society-smart-island')).transitionDuration"), '0s');
  check('Reduced motion disables sliding animation');
  assert.equal(await evaluate("(() => { const island=document.querySelector('.society-smart-island').getBoundingClientRect();const nav=document.querySelector('.phone-bottom-nav').getBoundingClientRect();return island.bottom<=nav.top && island.left>=0 && island.right<=innerWidth; })()"), true);
  check('Mobile top island stays inside viewport and clears bottom navigation');
  await evaluate("document.querySelector('.island-toggle').click()");
  await wait("document.querySelector('.society-smart-island').dataset.expanded === 'true'", 'critical panel expanded');
  await wait("document.querySelectorAll('.island-event').length === 6 && document.querySelector('.society-smart-island').dataset.expanded === 'true' && document.querySelector('.society-smart-island').getBoundingClientRect().height > 100", 'expanded critical list');
  await evaluate("[...document.querySelectorAll('.island-event')][0].querySelector('button:last-child').click()");
  await wait("document.querySelectorAll('.island-event').length === 5 && document.querySelector('.island-toggle').getAttribute('aria-label').includes('5 unread')", 'mark read removes event');
  assert.equal(records.find(record => record.id === 'emergency').is_read, true);
  check('Read action succeeds on server before removing event');
  records = [notification('same'), notification('same')]; await refresh();
  await wait("document.querySelectorAll('.island-event').length === 1 && document.querySelector('.island-toggle').getAttribute('aria-label').includes('2 unread')", 'deduplicated list');
  check('Duplicate delivery produces a single event');
  fail = true; await refresh();
  await wait("document.querySelector('.smart-island-details')?.textContent.includes('could not be refreshed')", 'API failure');
  assert.equal(await evaluate("document.querySelectorAll('.island-event').length"), 1);
  check('API errors retain last known queue and display status');
  await evaluate("Object.defineProperty(navigator,'onLine',{configurable:true,value:false});window.dispatchEvent(new Event('offline'))");
  await wait("document.querySelector('.smart-island-details')?.textContent.includes('Offline')", 'offline state');
  check('Offline state keeps cached updates available');
  fail = false; records = []; requests = [];
  await evaluate("Object.defineProperty(navigator,'onLine',{configurable:true,value:true});window.dispatchEvent(new Event('online'))");
  await wait("document.querySelector('.smart-island-details')?.textContent.includes('No active updates.')", 'reconnect empty');
  await evaluate("document.querySelector('.island-panel-header button').click()");
  await wait("!document.querySelector('.society-smart-island')", 'empty hidden island');
  check('Reconnect retrieves missed changes; empty collapsed island hides');
  requests = [{ id: 'request-one', organization_id: org, resident_id: 'resident', subject: 'Leaking tap', description: 'Kitchen tap', status: 'IN_PROGRESS', priority: 'HIGH', category: 'MAINTENANCE', created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-01T10:00:00Z' }];
  await refresh();
  await wait("document.querySelector('.island-toggle').dataset.eventId.includes('request-one')", 'active maintenance');
  requests[0].status = 'RESOLVED'; await refresh();
  await wait("!document.querySelector('.society-smart-island')", 'resolved request removed');
  check('Resolved maintenance leaves active rotation');
  const pendingVisitId = '77777777-7777-4777-8777-777777777777';
  visits = [{ id: pendingVisitId, organization_id: org, visitor_id: '88888888-8888-4888-8888-888888888888', visit_status: 'PENDING', visit_purpose: 'Delivery', createdAt: '2026-10-01T10:00:00Z', visitor: { id: '88888888-8888-4888-8888-888888888888', organization_id: org, name: 'Ravi', mobile: '9000000000', active: true } }];
  await refresh();
  await wait("document.querySelector('.island-toggle').dataset.eventId.includes('visit:')", 'visitor event');
  assert.equal(await evaluate("document.querySelectorAll('.society-smart-island').length"), 1);
  await evaluate("document.querySelector('.island-toggle').click()");
  await wait("document.querySelector('.society-smart-island').dataset.expanded === 'true' && document.querySelector('.society-smart-island').getBoundingClientRect().height > 100", 'visitor panel expanded');
  await evaluate("document.querySelector('.island-event-link').click()");
  await wait("Boolean(document.querySelector('#screen-visitors'))", 'visitor navigation');
  check('Single island opens existing visitor workflow');
  await wait(`document.activeElement?.id === 'visitor-${pendingVisitId}'`, 'matching visitor focused');
  check('Visitor event opens and focuses the matching real visit');
  await evaluate("[...document.querySelectorAll('#visitors-list-screen button')].find(button => button.textContent.trim() === 'Approve').click()");
  await wait("!document.body.innerText.includes('Visitor approval: Ravi')", 'visitor decision refresh');
  assert.equal(visits[0].visit_status, 'CONFIRMED');
  check('Resident visitor approval persists before leaving Smart Island');
  visits = [];
  notices = [
    { id: '99999999-9999-4999-8999-999999999999', organization_id: org, title: 'Water shutdown', content: 'Tuesday morning', status: 'PUBLISHED', published_at: '2026-10-01T10:00:00Z', expires_at: '2026-12-01T10:00:00Z', created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-01T10:00:00Z' },
    { id: 'aaaaaaaa-9999-4999-8999-999999999999', organization_id: org, title: 'Lift inspection', content: 'Thursday afternoon', status: 'PUBLISHED', published_at: '2026-10-02T10:00:00Z', expires_at: '2026-12-02T10:00:00Z', created_at: '2026-10-02T10:00:00Z', updated_at: '2026-10-02T10:00:00Z' },
  ];
  records = [{ ...notification('notice'), title: 'Water shutdown', data: { noticeId: notices[0].id, expiresAt: notices[0].expires_at } }];
  await refresh();
  await wait("document.querySelector('.island-toggle').dataset.eventId.includes('notice')", 'notice event');
  await evaluate("document.querySelector('.island-toggle').click()");
  await wait("document.querySelector('.society-smart-island').dataset.expanded === 'true' && document.querySelector('.society-smart-island').getBoundingClientRect().height > 100", 'notice panel expanded');
  await wait("Boolean(document.querySelector('.island-event-link'))", 'notice event expanded');
  await evaluate("document.querySelector('.island-event-link').click()");
  await wait("Boolean(document.querySelector('#screen-notices'))", 'notice navigation');
  await wait(`document.activeElement?.id === 'notice-${notices[0].id}'`, 'matching notice focused');
  assert.equal(await evaluate("document.querySelectorAll('#resident-notices-list .card').length"), 2);
  check('Resident Circulars & Notices renders both published notices from the API');
  check('Published notice opens and focuses its real notice record');
  visits = []; records = [{ ...notification('expires'), data: { expiresAt: new Date(Date.now() + 60000).toISOString() } }];
  await refresh();
  await wait("document.querySelector('.island-toggle').dataset.eventId.includes('expires')", 'expiring notification');
  records[0].data.expiresAt = new Date(Date.now() - 1).toISOString(); await refresh();
  await wait("!document.querySelector('.society-smart-island')", 'expired notification removed');
  check('Expired event leaves rotation after refresh');
  records = [notification('routine-security', 'SECURITY')]; await refresh();
  await wait("document.querySelector('.island-toggle').dataset.eventId.includes('routine-security')", 'routine security');
  assert.equal(await evaluate("document.querySelector('.island-critical').getAttribute('aria-hidden')"), 'true');
  assert.equal(await evaluate("document.querySelector('.society-smart-island').dataset.emergency"), 'false');
  assert.equal(records[0].is_read, false);
  check('Routine security is not promoted to critical and display never marks read');
  records = [notification('center-one'), notification('center-two')]; await refresh();
  await wait("document.querySelector('.island-toggle').getAttribute('aria-label').includes('2 unread')", 'notification center setup');
  await wait("document.querySelector('.notif-dot')", 'unread bell indicator');
  await evaluate("document.querySelector('.island-toggle').click()");
  await wait("document.querySelector('.society-smart-island').dataset.expanded === 'true' && document.querySelector('.society-smart-island').getBoundingClientRect().height > 100", 'notification panel expanded');
  await evaluate("[...document.querySelectorAll('.smart-island-details > button')].find(button => button.textContent.includes('notification center')).click()");
  await wait("Boolean(document.querySelector('#notifications-modal .card'))", 'paginated notification center');
  await evaluate("[...document.querySelectorAll('#notifications-modal .card')].find(card => card.textContent.includes('center-one')).click()");
  await wait("!document.querySelector('#notifications-modal')?.textContent.includes('Loading notifications')", 'center read refresh');
  assert.equal(records.find(record => record.id === 'center-one').is_read, true);
  check('Notification center read action refreshes persisted per-recipient state');
  await evaluate("[...document.querySelectorAll('#notifications-modal .card')].find(card => card.textContent.includes('center-two')).click()");
  await wait("!document.querySelector('.notif-dot') && !document.querySelector('.island-toggle').getAttribute('aria-label').includes('unread')", 'zero unread state');
  assert.equal(records.every(record => record.is_read), true);
  check('Reading final notification removes island count and resident bell dot');
  assert.equal(await evaluate("Boolean(document.querySelector('.society-smart-island'))"), false);
  check('Top island yields to notification dialogs without overlapping controls');
  await evaluate("document.querySelector('#notifications-modal [aria-label=Close]').click()");
  await wait("Boolean(document.querySelector('.society-smart-island'))", 'island restored after modal');
  records = [notification('top-notice'), notification('parcel', 'PARCEL_RECEIVED')];
  requests = [{ id: 'top-request', subject: 'Maintenance progress', status: 'IN_PROGRESS', priority: 'HIGH', updated_at: '2026-10-24T10:00:00Z' }];
  visits = [{ id: pendingVisitId, organization_id: org, visit_status: 'PENDING', visit_purpose: 'Delivery' }];
  await refresh();
  await wait("document.querySelector('.island-toggle').getAttribute('aria-label').includes('4 unread')", 'four event types in top island');
  for (const [width, height, mobile] of [[320, 568, true], [390, 844, true], [414, 896, true], [1280, 1000, false]]) {
    await command('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
    await command('Emulation.setTouchEmulationEnabled', { enabled: mobile });
    await assertTopIsland();
    const compact = await islandBounds();
    await evaluate("document.querySelector('.phone-body').scrollTop = 200");
    assert.deepEqual(await islandBounds(), compact);
    assert.equal(await evaluate("(() => { const body=document.querySelector('.phone-body');return body.scrollTop===200 && getComputedStyle(body).overflowY==='auto' && getComputedStyle(body).scrollbarWidth==='none'; })()"), true);
    if (width === 390 || !mobile) await screenshot(`${mobile ? 'mobile' : 'desktop'}-compact`);
    await activate('.island-toggle', mobile);
    await wait("document.querySelectorAll('.island-event').length === 4 && document.querySelector('.society-smart-island').getBoundingClientRect().height > 100", 'shared expanded event list');
    const expanded = await islandBounds();
    assert.equal(expanded.top, compact.top);
    assert.equal(await evaluate(`(() => {
      const island = document.querySelector('.society-smart-island').getBoundingClientRect();
      const screen = document.querySelector('.phone-screen').getBoundingClientRect();
      const nav = document.querySelector('.phone-bottom-nav').getBoundingClientRect();
      return island.left >= screen.left && island.right <= screen.right && island.bottom <= nav.top;
    })()`), true);
    if (width === 390 || !mobile) await screenshot(`${mobile ? 'mobile' : 'desktop'}-expanded`);
    await activate('.island-panel-header button', mobile);
    await wait("document.querySelector('#smart-island-panel')?.getAttribute('aria-hidden') === 'true' && document.querySelector('.society-smart-island').getBoundingClientRect().height <= 40", 'collapse from top panel');
    assert.deepEqual(await islandBounds(), compact);
    check(`${width}px layout: one shared top island, no bottom overlay, stable scroll, reachable expanded controls`);
  }
  await evaluate("document.querySelector('.island-toggle').focus(); document.querySelector('.island-toggle').click()");
  await wait("document.querySelector('#smart-island-panel')?.getAttribute('aria-hidden') === 'false'", 'keyboard expanded panel');
  await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  assert.equal(await evaluate("document.querySelector('#smart-island-panel').getAttribute('aria-hidden') === 'true' && document.activeElement === document.querySelector('.island-toggle')"), true);
  check('Escape collapses the top island and restores keyboard focus');
  assert.deepEqual(errors, []);
  process.stdout.write(`${checks} Smart Island browser checks passed.\n`);
} finally { await command('Page.close').catch(() => {}); ws.close(); }
