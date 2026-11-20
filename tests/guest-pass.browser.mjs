// Isolated Chrome; API responses are fixtures and no messages are sent.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const frontend = process.env.SOCIETYOS_TEST_FRONTEND_URL || 'http://localhost:3000';
const debugging = process.env.SOCIETYOS_TEST_CHROME_URL || 'http://127.0.0.1:9229';
const target = await fetch(`${debugging}/json/new?about:blank`, { method: 'PUT' }).then(response => response.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
let sequence = 0;
const pending = new Map(), errors = [], writes = [], reads = [];
const org = '11111111-1111-4111-8111-111111111111', actor = '22222222-2222-4222-8222-222222222222';
const now = new Date(), past = new Date(now.getTime() - 86400000).toISOString(), future = new Date(now.getTime() + 86400000).toISOString();
const permissions = ['resident:my', 'visitor:my', 'visitor:approve', 'visitor:read', 'amenity:read', 'notice:read', 'poll:read', 'notification:read', 'complaint:my', 'payment:my'];
function command(method, params = {}) {
  const id = ++sequence;
  return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
}
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const visit = (id, status, date, pass) => ({ id, visit_status: status, expected_entry_time: date, createdAt: date,
  visitor_id: id, organization_id: org, visitor: { name: id, mobile: '9000000000' }, pass });
const visits = [visit('Yesterday guest', 'CONFIRMED', past), visit('Tomorrow guest', 'CONFIRMED', future),
  visit('Expired guest', 'CONFIRMED', now.toISOString(), { pass_status: 'EXPIRED', validity_start: past, validity_end: future }),
  visit('Completed guest', 'COMPLETED', now.toISOString()), visit('Denied guest', 'CANCELLED', now.toISOString()),
  visit('Pending today', 'PENDING', now.toISOString()), visit('Approved today', 'CONFIRMED', now.toISOString())];
let created;
async function intercept(event) {
  const url = new URL(event.request.url), path = url.pathname.replace('/api/v1', ''), method = event.request.method;
  reads.push({ path, query: Object.fromEntries(url.searchParams) });
  let body = [];
  if (method === 'OPTIONS') body = {};
  else if (path === '/auth/refresh-token') body = { accessToken: 'mock-resident-token' };
  else if (path === '/auth/me') body = { user: { id: actor, mobileNumber: '9000000000', fullName: 'Test Resident' }, memberships: [{ role: 'RESIDENT', organizationId: org, permissions }] };
  else if (path === '/residents/me') body = { id: actor, user_id: actor, organization_id: org, name: 'Test Resident', flat_id: 'flat', flat: { flat_identifier: 'A-101' }, isActive: true, app_access_status: true };
  else if (path === '/society-settings/public') body = { name: 'Test Society', address: 'Test address', emergencyContacts: [], branding: {}, profile: {} };
  else if (path === '/visitor-visits/my/page') body = { items: visits, page: 1, limit: 10, total: visits.length, totalPages: 1 };
  else if (path.endsWith('/page')) body = { items: [], page: 1, limit: 5, total: 0, totalPages: 1 };
  else if (path === '/visitor-visits/pre-approve') {
    created = JSON.parse(event.request.postData); writes.push(created);
    body = { id: '33333333-3333-4333-8333-333333333333', visit_status: 'CONFIRMED' };
  } else if (path.endsWith('/pass')) body = { passId: '12345678-1111-4111-8111-111111111111', passCode: '12345678-1111-4111-8111-111111111111', qrToken: 'SOC-PASS-12345678-1111-4111-8111-111111111111', passStatus: 'ACTIVE',
    validityStart: created.expected_entry_time, validityEnd: created.validity_end, visitId: '33333333-3333-4333-8333-333333333333', visitorName: 'UI Test Guest', visitorPhone: '9000000000', status: 'CONFIRMED', flat: 'A-101' };
  else if (path.includes('actionable-count') || path.includes('unread-count')) body = { count: 0 };
  await command('Fetch.fulfillRequest', { requestId: event.requestId, responseCode: 200, responseHeaders: [
    { name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: frontend },
    { name: 'Access-Control-Allow-Credentials', value: 'true' },
    { name: 'Access-Control-Allow-Headers', value: 'authorization,x-organization-id,x-portal-role,x-session-mode,content-type,accept' },
    { name: 'Access-Control-Allow-Methods', value: 'GET,POST,PATCH,OPTIONS' },
  ], body: Buffer.from(JSON.stringify(body)).toString('base64') });
}
socket.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (message.id) { const task = pending.get(message.id); pending.delete(message.id); message.error ? task?.reject(Error(message.error.message)) : task?.resolve(message.result); }
  else if (message.method === 'Fetch.requestPaused') intercept(message.params).catch(error => errors.push(error.message));
  else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
});
async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
async function wait(expression, label) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) { if (await evaluate(expression)) return; await delay(100); }
  throw Error(`${label}: ${await evaluate('document.body?.innerText.slice(-2000)')} ${errors.join(', ')}`);
}
const click = text => evaluate(`[...document.querySelectorAll('button')].find(button => button.textContent.trim() === ${JSON.stringify(text)}).click()`);
try {
  await command('Page.enable'); await command('Runtime.enable');
  await command('Emulation.setTimezoneOverride', { timezoneId: 'Asia/Kolkata' });
  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await command('Fetch.enable', { patterns: [{ urlPattern: '*/api/v1/*', requestStage: 'Request' }] });
  await command('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.clear(); sessionStorage.clear(); localStorage.setItem('societyos_gates_${org}', JSON.stringify([{name:'North Gate',status:'Active'},{name:'Service Gate',status:'Active'},{name:'Closed Gate',status:'Inactive'}]));` });
  await command('Page.navigate', { url: `${frontend}/resident` });
  await wait(`document.body?.innerText.includes('Pending today') && document.body?.innerText.includes('Approved today')`, 'current approvals');
  for (const name of ['Yesterday guest', 'Tomorrow guest', 'Expired guest', 'Completed guest', 'Denied guest']) assert.equal(await evaluate(`document.body?.innerText.includes(${JSON.stringify(name)})`), false, name);
  assert.ok(reads.some(read => read.path === '/visitor-visits/my/page' && read.query.tab === 'gate-approvals' && read.query.dayStart && read.query.dayEnd));
  console.log('PASS today pending/approved filtering before preview limit');
  await evaluate(`(() => {
    window.__guestRealDate = Date;
    const tomorrow = Date.now() + 86400000;
    window.Date = class extends window.__guestRealDate {
      constructor(...args) { super(...(args.length ? args : [tomorrow])); }
      static now() { return tomorrow; }
    };
    window.dispatchEvent(new Event('focus'));
  })()`);
  await wait(`!document.body?.innerText.includes('Approved today') && document.body?.innerText.includes('Tomorrow guest')`, 'expired day clears without reload');
  await evaluate(`window.Date = window.__guestRealDate; window.dispatchEvent(new Event('focus'));`);
  await wait(`document.body?.innerText.includes('Pending today')`, 'current day restored');
  console.log('PASS old approvals disappear and next-day approvals appear after rollover');
  await evaluate(`document.querySelector('[data-tab="visitors"]').click()`);
  await wait(`Boolean([...document.querySelectorAll('button')].find(button => button.textContent.trim() === '+ Pass'))`, 'visitors tab');
  await click('+ Pass');
  await wait(`Boolean(document.querySelector('#guest-start-date'))`, 'guest modal');
  assert.ok(await evaluate(`document.querySelectorAll('#guest-start-date [role="spinbutton"]').length >= 3`));
  await evaluate(`document.querySelector('button[aria-label="Choose valid from"]').click()`);
  await wait(`Boolean(document.querySelector('[role="grid"]'))`, 'calendar opens');
  assert.ok(await evaluate(`document.querySelectorAll('[role="gridcell"] [data-disabled]').length > 0`));
  await evaluate(`(() => {
    const cells = [...document.querySelectorAll('[role="gridcell"] [role="button"]')];
    const next = cells[cells.findIndex(cell => cell.hasAttribute('data-today')) + 1];
    next.click();
  })()`);
  await wait(`!document.querySelector('[role="grid"]')`, 'calendar date selected');
  await evaluate(`document.querySelector('button[aria-label="Choose valid until"]').click()`);
  await wait(`Boolean(document.querySelector('[role="grid"]'))`, 'end calendar opens');
  await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
  await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' });
  await wait(`!document.querySelector('[role="grid"]')`, 'calendar closes on Escape');
  console.log('PASS calendar selects dates, disables invalid dates, and closes with Escape');
  await click('2 Days');
  await evaluate(`document.querySelector('#guest-gate-select').click()`);
  await wait(`Boolean(document.querySelector('[role="listbox"]'))`, 'gate dropdown');
  assert.equal(await evaluate(`document.querySelector('[role="listbox"]').innerText.includes('Closed Gate')`), false);
  await evaluate(`[...document.querySelectorAll('[role="option"]')].find(option => option.textContent.includes('North Gate')).click()`);
  await wait(`document.querySelector('#guest-gate-select').innerText.includes('North Gate')`, 'gate selected');
  console.log('PASS library gate dropdown only offers active gates');
  for (const width of [320, 390]) {
    await command('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: true });
    assert.equal(await evaluate(`(() => { const node = document.querySelector('#preapprove-modal'); return node.scrollWidth <= node.clientWidth; })()`), true, `layout ${width}`);
  }
  const screenshot = await command('Page.captureScreenshot', { format: 'png' });
  await writeFile('/private/tmp/societyos-guest-pass-preview.png', Buffer.from(screenshot.data, 'base64'));
  await evaluate(`(() => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    for (const [id, value] of [['guest-name-input','UI Test Guest'],['guest-phone-input','9000000000']]) { const input = document.getElementById(id); set.call(input, value); input.dispatchEvent(new Event('input', {bubbles:true})); } })()`);
  await evaluate(`document.querySelector('#btn-submit-preapprove').click()`);
  await wait(`Boolean(document.querySelector('.qr-digital-pass-card'))`, 'server pass shown');
  assert.equal(writes.length, 1);
  assert.ok(Date.parse(created.validity_end) > Date.parse(created.expected_entry_time) + 24 * 3600000);
  assert.equal(await evaluate(`document.querySelector('.qr-digital-pass-card').innerText.includes('North Gate')`), true);
  console.log('PASS selected date range reaches server, gate appears on ticket, mobile widths fit');
  assert.deepEqual(errors, []);
} finally { await command('Page.close').catch(() => {}); socket.close(); }
