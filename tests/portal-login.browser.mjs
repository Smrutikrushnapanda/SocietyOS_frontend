// Disposable Chrome session; every API request is mocked.
import assert from 'node:assert/strict';

const frontend = process.env.SOCIETYOS_TEST_FRONTEND_URL || 'http://localhost:3000';
const debugging = process.env.SOCIETYOS_TEST_CHROME_URL || 'http://127.0.0.1:9229';
const target = await fetch(`${debugging}/json/new?about:blank`, { method: 'PUT' }).then(response => response.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
let sequence = 0;
const pending = new Map();
const errors = [];
let scenario;
let logouts = 0;
let logins = 0;
const organizationId = '11111111-1111-4111-8111-111111111111';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function command(method, params = {}) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function intercept(event) {
  const path = new URL(event.request.url).pathname.replace('/api/v1', '');
  const requestedPortal = event.request.headers['X-Portal-Role'] || event.request.headers['x-portal-role'];
  let status = 200;
  let body = [];
  if (event.request.method === 'OPTIONS') body = {};
  else if (path === '/auth/refresh-token') {
    if (scenario.mode === 'restore-mismatch') body = { accessToken: 'mock-access' };
    else { status = 401; body = { message: 'No saved session' }; }
  } else if (path === '/auth/login') {
    logins++;
    assert.equal(requestedPortal, scenario.portal.toUpperCase());
    if (scenario.mode === 'backend-reject') {
      status = 401;
      body = { message: `This account cannot sign in to the ${scenario.portal} portal. Check your access with your society administrator.` };
    } else body = { user: { id: 'portal-user', mobileNumber: '9000000000' }, accessToken: 'mock-access' };
  } else if (path === '/auth/me') {
    const role = scenario.mode === 'success' ? (scenario.portal === 'admin' ? 'SOCIETY_ADMIN' : scenario.portal.toUpperCase())
      : scenario.portal === 'resident' ? 'GUARD' : 'RESIDENT';
    body = { user: { id: 'portal-user', mobileNumber: '9000000000', fullName: 'Portal Test' }, memberships: [{ role, organizationId, permissions: [] }] };
  } else if (path === '/auth/logout') { logouts++; body = { success: true }; }
  else if (path.includes('actionable-count')) body = { count: 0 };
  const data = status === 200 ? { success: true, data: body } : { success: false, ...body };
  await command('Fetch.fulfillRequest', {
    requestId: event.requestId, responseCode: status,
    responseHeaders: [
      { name: 'Content-Type', value: 'application/json' },
      { name: 'Access-Control-Allow-Origin', value: frontend },
      { name: 'Access-Control-Allow-Credentials', value: 'true' },
      { name: 'Access-Control-Allow-Headers', value: 'authorization, content-type, x-portal-role, x-session-mode, x-organization-id' },
      { name: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
    ], body: Buffer.from(JSON.stringify(data)).toString('base64'),
  });
}
socket.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const task = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) task?.reject(Error(message.error.message));
    else task?.resolve(message.result);
  } else if (message.method === 'Fetch.requestPaused') {
    intercept(message.params).catch(error => errors.push(error.message));
  }
});
async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
async function wait(expression, label) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (await evaluate(expression)) return;
    await delay(100);
  }
  throw Error(`${label}: ${await evaluate('document.body.innerText.slice(-1800)')} ${errors.join(', ')}`);
}
try {
  await command('Page.enable');
  await command('Runtime.enable');
  await command('Fetch.enable', { patterns: [{ urlPattern: '*/api/v1/*', requestStage: 'Request' }] });
  await command('Page.addScriptToEvaluateOnNewDocument', { source: 'localStorage.clear(); sessionStorage.clear();' });
  for (const portal of ['admin', 'resident', 'guard']) {
    for (const mode of ['backend-reject', 'frontend-reject', 'restore-mismatch', 'success']) {
      scenario = { portal, mode };
      logouts = 0;
      logins = 0;
      const loginPath = `/${portal}/login`;
      await command('Page.navigate', { url: `${frontend}${loginPath}` });
      await wait(`Boolean(document.querySelector('input[type="tel"]'))`, `${portal} form hydrated`);
      if (mode === 'restore-mismatch') {
        assert.equal(logouts, 1);
        assert.equal(await evaluate('location.pathname'), loginPath);
      } else {
        await evaluate('[...document.querySelectorAll("button")].find(button => button.textContent.includes("Password Login")).click()');
        await wait('Boolean(document.querySelector("input[type=password]"))', 'password mode');
        await evaluate(`(() => {
          const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
          for (const [selector, value] of [['input[type=tel]', '9000000000'], ['input[type=password]', 'Mock-password-123']]) {
            const input = document.querySelector(selector);
            setter.call(input, value);
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }
        })()`);
        await wait('!document.querySelector("button[type=submit]").disabled', 'submit enabled');
        await evaluate('document.querySelector("button[type=submit]").click()');
        if (mode === 'success') {
          await wait(`location.pathname === '/${portal}'`, `${portal} valid login navigation`);
          assert.equal(logins, 1);
          assert.equal(logouts, 0);
        } else {
          await wait('document.body.innerText.includes("This account cannot sign in")', `${portal} inline rejection`);
          assert.equal(await evaluate('location.pathname'), loginPath);
          assert.equal(logouts, mode === 'frontend-reject' ? 1 : 0);
          assert.equal(await evaluate('document.body.innerText.includes("Authenticated successfully.")'), false);
        }
      }
      assert.equal(await evaluate('document.body.innerText.includes("Access Denied (403)")'), false);
      console.log(`PASS ${portal}: ${mode}`);
    }
  }
  assert.deepEqual(errors, []);
} finally {
  await command('Fetch.disable');
  socket.close();
  await fetch(`${debugging}/json/close/${target.id}`);
}
