// Real QR artifact from disposable backend test; HTTP responses are intercepted. No provider sends.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
const pass = JSON.parse(await readFile('/private/tmp/societyos-qr-test-pass.json', 'utf8'));
const frontend = process.env.SOCIETYOS_TEST_FRONTEND_URL || 'http://localhost:3000';
const debugging = process.env.SOCIETYOS_TEST_CHROME_URL || 'http://127.0.0.1:9229';
const target = await fetch(`${debugging}/json/new?about:blank`, { method: 'PUT' }).then(response => response.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
let sequence = 0, role = 'RESIDENT', validationError = '', entryError = '', reads = [], entries = [], errors = [], externalQrRequests = 0;
const pending = new Map();
const org = '11111111-1111-4111-8111-111111111111', actor = '22222222-2222-4222-8222-222222222222';
const permissions = ['visitor:read', 'visitor:manage', 'visitor:my', 'visitor:preapprove', 'resident:my', 'notification:read', 'amenity:read', 'notice:read', 'poll:read', 'complaint:my'];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function command(method, params = {}) {
  const id = ++sequence;
  return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
}
async function intercept(event) {
  const url = new URL(event.request.url), path = url.pathname.replace('/api/v1', ''), method = event.request.method;
  let body = [], status = 200;
  if (url.hostname === 'api.qrserver.com') { externalQrRequests++; await command('Fetch.failRequest', { requestId: event.requestId, errorReason: 'BlockedByClient' }); return; }
  if (method === 'OPTIONS') body = {};
  else if (path === '/auth/refresh-token') body = { accessToken: 'qr-test-token' };
  else if (path === '/auth/me') body = { user: { id: actor, mobileNumber: '9000000000' }, memberships: [{ role, organizationId: org, permissions }] };
  else if (path === '/residents/me') body = { id: actor, user_id: actor, organization_id: org, name: 'Host Resident', flat_id: 'flat', flat: { flat_identifier: 'A-101' }, isActive: true, app_access_status: true };
  else if (path === '/society-settings/public') body = { name: 'Test Society', emergencyContacts: [], branding: {}, profile: {} };
  else if (path.endsWith('/page')) body = { items: [], total: 0, totalPages: 0, page: 1, limit: 10 };
  else if (path === '/visitor-visits/pre-approve') body = { id: pass.visitId, visit_status: 'CONFIRMED' };
  else if (path.endsWith('/pass')) body = pass;
  else if (path === '/visitor-visits/validate-pass') {
    const input = JSON.parse(event.request.postData); reads.push({ input, headers: event.request.headers });
    if (validationError) { status = 409; body = { message: validationError }; }
    else body = { ...pass, residentName: 'Host Resident', flat: 'A-101' };
  } else if (method === 'PATCH' && path.startsWith('/visitor-visits/')) {
    entries.push({ path, input: JSON.parse(event.request.postData), headers: event.request.headers });
    if (entryError) { status = 409; body = { message: entryError }; }
    else body = { id: pass.visitId, visit_status: 'CONFIRMED', actual_entry_time: new Date().toISOString() };
  } else if (path.includes('count')) body = { count: 0 };
  await command('Fetch.fulfillRequest', { requestId: event.requestId, responseCode: status, responseHeaders: [
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
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) { if (await evaluate(expression)) return; await delay(100); }
  throw Error(`${label}: ${await evaluate('document.body.innerText.slice(-1800)')} ${errors.join(', ')}`);
}
const click = text => evaluate(`[...document.querySelectorAll('button')].find(button => button.textContent.trim() === ${JSON.stringify(text)}).click()`);
async function upload(file = '/private/tmp/societyos-qr-test-pass.png') {
  const document = await command('DOM.getDocument');
  const input = await command('DOM.querySelector', { nodeId: document.root.nodeId, selector: 'input[type=file]' });
  await command('DOM.setFileInputFiles', { nodeId: input.nodeId, files: [file] });
}
let cameraScript;
async function navigate(path, camera = false) {
  if (cameraScript) await command('Page.removeScriptToEvaluateOnNewDocument', { identifier: cameraScript });
  const script = await command('Page.addScriptToEvaluateOnNewDocument', { source: `
    localStorage.clear(); sessionStorage.clear();
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => {
      if (!${camera}) throw new Error('Test camera disabled; use QR image');
      const image = new Image(); image.src = ${JSON.stringify(pass.qrImageData)}; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 640;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0,0,640,640); ctx.drawImage(image,70,70,500,500);
      const timer = setInterval(() => ctx.drawImage(image,70,70,500,500), 100);
      window.addEventListener('pagehide', () => clearInterval(timer), { once: true });
      return canvas.captureStream(10);
    }, configurable: true });
  ` });
  cameraScript = script.identifier;
  await command('Page.navigate', { url: `${frontend}${path}` });
}
try {
  await command('Page.enable'); await command('Runtime.enable');
  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await command('Fetch.enable', { patterns: [{ urlPattern: '*/api/v1/*', requestStage: 'Request' }, { urlPattern: '*api.qrserver.com*', requestStage: 'Request' }] });
  await navigate('/resident');
  await wait(`Boolean(document.querySelector('[data-tab="visitors"]'))`, 'resident ready');
  await evaluate(`document.querySelector('[data-tab="visitors"]').click()`);
  await wait(`Boolean([...document.querySelectorAll('button')].find(button => button.textContent.trim() === '+ Pass'))`, 'visitor tab');
  await click('+ Pass');
  await wait(`Boolean(document.querySelector('#guest-name-input'))`, 'preapprove form');
  await evaluate(`(() => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
    for (const [id,value] of [['guest-name-input','QR Guest'],['guest-phone-input','9000000000']]) { const node = document.getElementById(id); setter.call(node,value); node.dispatchEvent(new Event('input',{bubbles:true})); } })()`);
  await click('Create guest pass');
  await wait(`Boolean(document.querySelector('.qr-digital-pass-card img')?.complete)`, 'rendered resident QR');
  assert.equal(await evaluate(`document.querySelector('.qr-digital-pass-card img').src`), pass.qrImageData);
  assert.equal(await evaluate(`document.querySelector('.qr-digital-pass-card img').naturalWidth`), 500);
  assert.equal(externalQrRequests, 0);
  const screenshot = await command('Page.captureScreenshot', { format: 'png' });
  await writeFile('/private/tmp/societyos-qr-resident-card.png', Buffer.from(screenshot.data, 'base64'));
  console.log('PASS resident renders actual backend-generated QR without external image service');
  await evaluate(`Object.defineProperty(navigator, 'canShare', { configurable: true, value: value => value.files?.length === 1 });
    Object.defineProperty(navigator, 'share', { configurable: true, value: async value => {
      window.__sharedGuestQr = { text: value.text, type: value.files[0].type,
        data: btoa(String.fromCharCode(...new Uint8Array(await value.files[0].arrayBuffer()))) };
    } });
    [...document.querySelectorAll('a')].find(link => link.textContent.includes('Send from My Own WhatsApp App')).click();`);
  await wait(`Boolean(window.__sharedGuestQr)`, 'native file share');
  const shared = await evaluate('window.__sharedGuestQr');
  assert.equal(shared.data, pass.qrImageData.split(',')[1]); assert.equal(shared.type, 'image/png');
  assert.ok(shared.text.includes(pass.qrToken));
  console.log('PASS manual file sharing passes exact QR PNG and full token to browser sharing API');


  role = 'GUARD';
  await navigate('/guard/scan', true);
  await wait(`document.body.innerText.includes('Host Resident') && document.body.innerText.includes('A-101')`, 'live camera decode and backend validation');
  assert.equal(reads.at(-1).input.token, pass.qrToken);
  await click('Confirm entry');
  await wait(`location.pathname === '/guard'`, 'standalone scanner persists entry');
  assert.equal(entries.length, 1); assert.equal(entries[0].path, `/visitor-visits/${pass.visitId}`);
  assert.equal(entries[0].input.pass_token, pass.qrToken); assert.equal(entries[0].input.check_in, true);
  const header = (headers, name) => Object.entries(headers).find(([key]) => key.toLowerCase() === name)?.[1];
  for (const entry of [reads[0], entries[0]]) { assert.equal(header(entry.headers, 'authorization'), 'Bearer qr-test-token'); assert.equal(header(entry.headers, 'x-organization-id'), org); }
  console.log('PASS camera frame decoded, correct token/auth/society sent, standalone route checks in correct visit');

  await navigate('/guard/scan');
  await wait(`Boolean(document.querySelector('input[type=file]'))`, 'image scanner ready');
  const blank = await evaluate(`(() => { const canvas = document.createElement('canvas'); canvas.width = 200; canvas.height = 200; const context = canvas.getContext('2d'); context.fillStyle = '#fff'; context.fillRect(0,0,200,200); return canvas.toDataURL('image/png'); })()`);
  await writeFile('/private/tmp/societyos-qr-blank.png', Buffer.from(blank.split(',')[1], 'base64'));
  const beforeBlank = reads.length;
  await upload('/private/tmp/societyos-qr-blank.png');
  await wait(`document.body.innerText.includes('No QR code found in this image')`, 'blank image rejected');
  assert.equal(reads.length, beforeBlank);
  console.log('PASS unreadable image does not trigger validation or entry');

  for (const message of ['Guest pass has expired', 'Guest pass is revoked', 'Guest pass has already been used', 'Guest visit is not approved or has been cancelled']) {
    validationError = message;
    await navigate('/guard/scan');
    await wait(`Boolean(document.querySelector('input[type=file]'))`, 'image scanner ready');
    await upload();
    await wait(`document.body.innerText.includes(${JSON.stringify(message)})`, message);
    assert.equal(await evaluate(`Boolean([...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Confirm entry'))`), false);
  }
  validationError = ''; entryError = 'Guest pass has already been used';
  await navigate('/guard');
  await wait(`Boolean(document.querySelector('.fastpass-quick-scan-strip'))`, 'guard queue ready');
  await evaluate(`document.querySelector('.fastpass-quick-scan-strip').click()`);
  await wait(`Boolean(document.querySelector('input[type=file]'))`, 'inline scanner ready');
  await upload();
  await wait(`document.body.innerText.includes('Host Resident')`, 'image decoded');
  const before = entries.length;
  await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Confirm entry'); button.click(); button.click(); })()`);
  await wait(`document.body.innerText.includes('Guest pass has already been used')`, 'entry race error surfaced');
  assert.equal(entries.length, before + 1); assert.equal(await evaluate(`Boolean(document.querySelector('.guard-scanner-page'))`), true);
  assert.equal(await evaluate(`document.body.innerText.includes('Guest entry recorded.')`), false);
  console.log('PASS image decode, expired/revoked/used/cancelled rejection, duplicate clicks, failed entry stays scanner');

  entryError = '';
  await navigate('/guard');
  await wait(`Boolean(document.querySelector('.fastpass-quick-scan-strip'))`, 'queue ready');
  await evaluate(`document.querySelector('.fastpass-quick-scan-strip').click()`);
  await wait(`Boolean(document.querySelector('input[type=file]'))`, 'scanner ready');
  await upload(); await wait(`document.body.innerText.includes('Host Resident')`, 'verified image');
  await click('Confirm entry');
  await wait(`!document.querySelector('.guard-scanner-page')`, 'successful inline check-in');
  assert.equal(entries.at(-1).input.pass_token, pass.qrToken);
  assert.equal(externalQrRequests, 0); assert.deepEqual(errors, []);
  console.log('PASS inline guard entry completes only after backend success');
} finally { await command('Page.close').catch(() => {}); socket.close(); }
