// Uses disposable Chrome and intercepts every API call; sends no real messages.
import assert from 'node:assert/strict';
const frontend = process.env.SOCIETYOS_TEST_FRONTEND_URL || 'http://localhost:3000';
const debugging = process.env.SOCIETYOS_TEST_CHROME_URL || 'http://127.0.0.1:9229';
const target = await fetch(`${debugging}/json/new?about:blank`, { method: 'PUT' }).then(r => r.json());
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
let sequence = 0;
const pending = new Map();
const errors = [];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function command(method, params = {}) {
  const id = ++sequence;
  return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
}
const org = '11111111-1111-4111-8111-111111111111';
const actor = '22222222-2222-4222-8222-222222222222';
const permissions = ['building:read', 'floor:read', 'flat:read', 'resident:read', 'notice:read'];
const labels = ['Master WhatsApp Notifications', 'Visitor Arrival & Entry Alerts', 'Maintenance Due & Overdue Reminders', 'Payment Confirmations', 'Complaint Updates', 'Society Notices & Circulars'];
const keys = ['isEnabled', 'notifyVisitor', 'notifyMaintenance', 'notifyPayment', 'notifyComplaint', 'notifyNotice'];
let settings = Object.fromEntries(keys.map(key => [key, true]));
let gatewayStatus = 'WORKING';
let settingsFail = false;
let savingFail = false;
let saveDelay = 0;
let statusReads = 0;
const patches = [];
async function intercept(event) {
  const path = new URL(event.request.url).pathname.replace('/api/v1', '');
  let body = [];
  let responseCode = 200;
  if (event.request.method === 'OPTIONS') body = {};
  else if (path === '/auth/me') body = { user: { id: actor, mobileNumber: '+919111111111', fullName: 'WhatsApp Test Admin' }, memberships: [{ role: 'SOCIETY_ADMIN', organizationId: org, permissions }] };
  else if (path === '/menu-master/hierarchy') body = [];
  else if (path === '/admin/whatsapp/status') {
    statusReads++;
    body = { status: gatewayStatus, provider: 'waha', sessionName: 'test-session', accountInfo: gatewayStatus === 'WORKING' ? { id: '+91 91****1111', pushName: 'Test Account' } : null, lastChecked: new Date().toISOString(), error: gatewayStatus === 'FAILED' ? 'WhatsApp session failed inside the gateway.' : undefined };
  } else if (path === '/admin/whatsapp/settings') {
    if (event.request.method === 'PUT') {
      assert.equal(event.request.headers['X-Organization-Id'] ?? event.request.headers['x-organization-id'], org);
      const patch = JSON.parse(event.request.postData);
      patches.push(patch);
      if (saveDelay) await delay(saveDelay);
      if (savingFail) { responseCode = 503; body = { success: false, message: 'Settings unavailable' }; }
      else { settings = { ...settings, ...patch }; body = settings; }
    } else if (settingsFail) { responseCode = 503; body = { success: false, message: 'Settings unavailable' }; }
    else body = settings;
  } else if (path === '/admin/whatsapp/test-message') {
    assert.deepEqual(JSON.parse(event.request.postData), { recipientNumber: '9876543210' });
    body = { success: true, messageId: 'test-message-id' };
  } else if (path === '/resident') body = {};
  else if (path.includes('actionable-count')) body = { count: 0 };
  const wrapped = body && !Array.isArray(body) && 'success' in body ? body : { success: true, data: body };
  await command('Fetch.fulfillRequest', { requestId: event.requestId, responseCode, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: frontend }, { name: 'Access-Control-Allow-Headers', value: '*' }, { name: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, OPTIONS' }], body: Buffer.from(JSON.stringify(wrapped)).toString('base64') });
}
ws.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (message.id) { const task = pending.get(message.id); pending.delete(message.id); if (message.error) task?.reject(Error(message.error.message)); else task?.resolve(message.result); }
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
  throw Error(`Timeout: ${label}\n${await evaluate('document.body.innerText.slice(-2000)')}\n${JSON.stringify(errors)}`);
}
const selector = i => `document.querySelector('input[aria-label="${labels[i]}"]')`;
async function toggle(i, value) {
  await wait(`${selector(i)} && !${selector(i)}.disabled`, `toggle ready ${labels[i]}`);
  const before = patches.length;
  await evaluate(`${selector(i)}.click()`);
  await wait(`!${selector(i)}.disabled && ${selector(i)}.checked === ${value}`, `saved ${labels[i]}`);
  assert.deepEqual(patches[before], { [keys[i]]: value });
  assert.equal(settings[keys[i]], value);
}
async function clickButton(text) {
  await evaluate(`[...document.querySelectorAll('button')].find(node => node.textContent.includes(${JSON.stringify(text)})).click()`);
}
async function navigate() {
  await command('Page.navigate', { url: `${frontend}/admin?section=whatsapp` });
  await wait(`Boolean(document.querySelector('#section-whatsapp'))`, 'WhatsApp section');
}
try {
  await command('Page.enable'); await command('Runtime.enable');
  await command('Fetch.enable', { patterns: [{ urlPattern: '*/api/v1/*', requestStage: 'Request' }] });
  const session = { societyos_session_auth: JSON.stringify({ id: actor, name: 'Test Admin', role: 'admin', societyId: org }), societyos_access_token: 'test-token', societyos_refresh_token: 'test-refresh', societyos_roles: JSON.stringify(['SOCIETY_ADMIN']), societyos_permissions: JSON.stringify(permissions), societyos_memberships: JSON.stringify([{ role: 'SOCIETY_ADMIN', organizationId: org, permissions }]), societyos_organization_id: org };
  await command('Page.addScriptToEvaluateOnNewDocument', { source: `for (const [key,value] of Object.entries(${JSON.stringify(session)})) sessionStorage.setItem(key,value);` });
  await navigate();
  await wait(`${selector(0)} && !${selector(0)}.disabled`, 'preferences loaded');
  assert.equal(await evaluate(`document.querySelectorAll('#section-whatsapp input[type=checkbox]').length`), 6);
  await wait(`document.body.innerText.includes('WORKING')`, 'connected status');
  console.log('PASS status displays actual connected account');
  for (let i = 1; i < 6; i++) { await toggle(i, false); await toggle(i, true); }
  await toggle(0, false);
  assert.equal(await evaluate(`[...document.querySelectorAll('#section-whatsapp input[type=checkbox]')].slice(1).every(node => node.disabled)`), true);
  await toggle(0, true);
  console.log('PASS all six controls persist off/on and master disables categories');
  await toggle(5, false); await navigate();
  await wait(`${selector(5)} && !${selector(5)}.disabled && !${selector(5)}.checked`, 'persisted reload');
  console.log('PASS saved category survives reload');
  savingFail = true;
  const beforeFailure = patches.length;
  await evaluate(`${selector(1)}.click()`);
  await wait(`!${selector(1)}.disabled && ${selector(1)}.checked && document.body.innerText.includes('Failed to save settings.')`, 'save rollback');
  assert.equal(patches.length, beforeFailure + 1);
  savingFail = false;
  console.log('PASS failed save rolls back switch');
  settingsFail = true; await navigate();
  await wait(`Boolean(document.querySelector('#section-whatsapp [role=alert]'))`, 'load failure');
  assert.equal(await evaluate(`[...document.querySelectorAll('#section-whatsapp input[type=checkbox]')].every(node => node.disabled)`), true);
  settingsFail = false; await clickButton('Retry');
  await wait(`!${selector(0)}.disabled && !document.querySelector('#section-whatsapp [role=alert]')`, 'settings retry');
  console.log('PASS failed load blocks edits until successful retry');
  gatewayStatus = 'FAILED'; await clickButton('Refresh Connection Status');
  await wait(`document.body.innerText.includes('WhatsApp session failed inside the gateway.')`, 'failed status cause');
  gatewayStatus = 'WORKING'; await clickButton('Refresh Connection Status');
  await wait(`document.body.innerText.includes('WORKING') && !document.body.innerText.includes('WhatsApp session failed inside the gateway.')`, 'reconnected status');
  console.log('PASS refresh recovers failed session display');
  await evaluate(`(() => { const input=document.querySelector('#section-whatsapp input[type=tel]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'9876543210'); input.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await wait(`![...document.querySelectorAll('button')].find(node => node.textContent === 'Send Test').disabled`, 'test input ready');
  const readsBefore = statusReads; await clickButton('Send Test');
  await wait(`document.body.innerText.includes('Gateway accepted test message.')`, 'accepted test');
  assert.ok(statusReads > readsBefore);
  console.log('PASS test result shows provider acceptance and refreshes connection');
  assert.deepEqual(errors, []);
} finally { await command('Page.close').catch(() => {}); ws.close(); }
