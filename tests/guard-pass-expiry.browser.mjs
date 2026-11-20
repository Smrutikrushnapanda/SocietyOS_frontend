// Local frontend with intercepted APIs; no society data or messages are changed.
import assert from 'node:assert/strict';
const frontend = process.env.SOCIETYOS_TEST_FRONTEND_URL || 'http://localhost:3000';
const debugging = process.env.SOCIETYOS_TEST_CHROME_URL || 'http://127.0.0.1:9229';
const target = await fetch(`${debugging}/json/new?about:blank`, { method: 'PUT' }).then(response => response.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
let sequence = 0, scenario = 'queue', expiry = 0;
const pending = new Map(), requests = [], errors = [];
const org = '11111111-1111-4111-8111-111111111111', user = '22222222-2222-4222-8222-222222222222';
const passId = '33333333-3333-4333-8333-333333333333';
const token = `SOC-PASS-${passId}`;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function command(method, params = {}) {
  const id = ++sequence;
  return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
}
const visitor = (id, name) => ({ id, name, mobile: '9000000000', organization_id: org, active: true });
function pass() {
  expiry ||= Date.now() + 6000;
  return { id: passId, organization_id: org, visitor_id: 'active-person', visitor_visit_id: 'active-visit',
    pass_status: 'ACTIVE', validity_start: new Date(Date.now() - 3600000).toISOString(), validity_end: new Date(expiry).toISOString() };
}
async function intercept(event) {
  const path = new URL(event.request.url).pathname.replace('/api/v1', ''), method = event.request.method;
  requests.push({ path, method });
  let body = [];
  if (method === 'OPTIONS') body = {};
  else if (path === '/auth/refresh-token') body = { accessToken: 'expiry-test-token' };
  else if (path === '/auth/me') body = { user: { id: user, mobileNumber: '9000000000', fullName: 'Test Guard' }, memberships: [{ role: 'GUARD', organizationId: org, permissions: ['visitor:read', 'visitor:manage', 'notice:read'] }] };
  else if (path === '/society-settings/public') body = { name: 'Test Society', emergencyContacts: [], branding: {}, profile: {} };
  else if (path === '/visitors') body = [visitor('active-person', 'Expiring Guest'), visitor('expired-person', 'Expired Guest'), visitor('walkin-person', 'Waiting Walk-in')];
  else if (path === '/visitor-visits') body = [
    { id: 'active-visit', organization_id: org, visitor_id: 'active-person', visit_status: 'CONFIRMED' },
    { id: 'expired-visit', organization_id: org, visitor_id: 'expired-person', visit_status: 'CONFIRMED' },
    ...(scenario === 'queue' ? [{ id: 'walkin-visit', organization_id: org, visitor_id: 'walkin-person', visit_status: 'PENDING' }] : []),
  ];
  else if (path === '/visitor-passes') body = [pass(), { ...pass(), id: '44444444-4444-4444-8444-444444444444', visitor_id: 'expired-person', visitor_visit_id: 'expired-visit', validity_end: new Date(Date.now() - 1000).toISOString() }];
  else if (path === '/visitor-visits/validate-pass') {
    assert.equal(JSON.parse(event.request.postData).token, token);
    const value = pass();
    body = { passId, passCode: passId.toUpperCase(), qrToken: token, visitId: 'active-visit', visitorName: 'Expiring Guest', visitorPhone: '9000000000', residentName: 'Test Host', flat: 'A-101', purpose: 'Guest', passStatus: 'ACTIVE', status: 'CONFIRMED', validityStart: value.validity_start, validityEnd: value.validity_end };
  } else if (path.endsWith('/page')) body = { items: [], total: 0, totalPages: 0, page: 1, limit: 10 };
  else if (path.includes('count')) body = { count: 0 };
  await command('Fetch.fulfillRequest', { requestId: event.requestId, responseCode: 200, responseHeaders: [
    { name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: frontend },
    { name: 'Access-Control-Allow-Credentials', value: 'true' },
    { name: 'Access-Control-Allow-Headers', value: 'authorization,content-type,x-organization-id,x-portal-role,x-session-mode' },
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
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) { if (await evaluate(expression)) return; await delay(50); }
  throw Error(`${label}: ${await evaluate('document.body?.innerText')} ${errors.join(', ')}`);
}
async function navigate(mode) {
  scenario = mode; expiry = 0;
  await command('Page.navigate', { url: `${frontend}/guard` });
  await wait(`document.querySelector('.guard-card')?.textContent.includes('Expiring Guest')`, 'active guest shown');
}
const snapshotRequests = () => requests.filter(request => ['/visitors', '/visitor-visits', '/visitor-passes'].includes(request.path)).length;
try {
  await command('Page.enable'); await command('Runtime.enable');
  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await command('Fetch.enable', { patterns: [{ urlPattern: '*/api/v1/*', requestStage: 'Request' }] });
  await command('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.clear(); sessionStorage.clear(); navigator.mediaDevices.getUserMedia = async () => { throw new Error('Camera disabled in expiry test'); };` });
  await navigate('queue');
  assert.equal(await evaluate(`document.querySelector('#guard-queue-list').textContent.includes('Expired Guest')`), false);
  assert.equal(await evaluate(`document.querySelector('.guard-queue-counter strong').textContent`), '2');
  await delay(200);
  const before = snapshotRequests();
  await wait(`!document.querySelector('#guard-queue-list').textContent.includes('Expiring Guest')`, 'expired guest disappears without refresh');
  assert.equal(await evaluate(`document.querySelector('.guard-queue-counter strong').textContent`), '1');
  assert.ok(await evaluate(`document.body.innerText.includes('Waiting Approval (1)') && document.body.innerText.includes('Ready to Check-in (0)')`));
  assert.ok(await evaluate(`document.querySelector('#guard-queue-list').textContent.includes('Waiting Walk-in')`));
  assert.equal(snapshotRequests(), before);
  console.log('PASS expired guest hidden on load; automatic expiry removes active guest and updates all counts without polling; walk-in remains');

  await navigate('scanner');
  await evaluate(`document.querySelector('.fastpass-quick-scan-strip').click()`);
  await wait(`Boolean([...document.querySelectorAll('button')].find(button => button.textContent.includes('Expiring Guest')))`, 'scanner pass listed');
  await wait(`document.body.innerText.includes('No Pre-Approved Passes Available')`, 'scanner pass automatically disappears');
  assert.equal(await evaluate(`Boolean([...document.querySelectorAll('button')].find(button => button.textContent.includes('Expiring Guest')))`), false);
  console.log('PASS scanner available-pass list removes expired pass without refresh');

  await navigate('selected');
  await evaluate(`document.querySelector('.fastpass-quick-scan-strip').click()`);
  await wait(`Boolean([...document.querySelectorAll('button')].find(button => button.textContent.includes('Expiring Guest')))`, 'pass ready for validation');
  await evaluate(`[...document.querySelectorAll('button')].find(button => button.textContent.includes('Expiring Guest')).click()`);
  await wait(`document.body.innerText.includes('Test Host')`, 'validated pass selected');
  await wait(`document.body.innerText.includes('Guest pass has expired') && !document.body.innerText.includes('Test Host')`, 'expired selected pass removed');
  assert.equal(await evaluate(`Boolean([...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Confirm entry'))`), false);
  assert.ok(await evaluate(`Boolean(document.querySelector('.guard-mobile-alert--error'))`));
  assert.equal(requests.filter(request => request.method === 'PATCH').length, 0);
  assert.deepEqual(errors, []);
  console.log('PASS selected pass closes on expiry with error alert; no entry request sent');
} finally { await command('Page.close').catch(() => {}); socket.close(); }
