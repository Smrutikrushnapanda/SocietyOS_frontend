import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const origin = process.env.SOCIETYOS_TEST_FRONTEND_URL || 'http://localhost:3000';
const profile = mkdtempSync(join(tmpdir(), 'societyos-polls-'));
const chrome = spawn(process.env.SOCIETYOS_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--remote-debugging-pipe', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-background-networking', 'about:blank',
], { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] });
let sequence = 0, buffer = '', sessionId;
const pending = new Map(), errors = [], creates = [], ballots = [], patches = [];
const org = '11111111-1111-4111-8111-111111111111', actor = '22222222-2222-4222-8222-222222222222';
let role = 'SOCIETY_ADMIN';
let existingVotes = false;
const permissions = ['poll:read', 'poll:manage', 'poll:vote', 'resident:my', 'notice:read', 'notification:read'];
const polls = ['SINGLE', 'MULTIPLE'].map((type, index) => ({ id: `33333333-3333-4333-8333-33333333333${index}`, organization_id: org, title: `${type} browser ballot`, status: 'PUBLISHED', poll_type: type, starts_at: '2026-01-01T00:00:00Z', ends_at: '2099-01-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z' }));
const options = poll => [0, 1, 2].map(index => ({ id: `44444444-4444-4444-8444-${poll.poll_type === 'SINGLE' ? '0' : '1'}0000000000${index}`, option_text: `Answer ${index + 1}`, display_order: index + 1, vote_count: 0 }));
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
function send(method, params = {}, targetSession = sessionId) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 30000);
    pending.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject: error => { clearTimeout(timer); reject(error); } });
    chrome.stdio[3].write(JSON.stringify({ id, method, params, ...(targetSession ? { sessionId: targetSession } : {}) }) + '\0');
  });
}
async function intercept({ requestId, request }) {
  if (!request.url.includes('/api/v1/')) {
    return send(request.url.startsWith(origin + '/') ? 'Fetch.continueRequest' : 'Fetch.failRequest', request.url.startsWith(origin + '/') ? { requestId } : { requestId, errorReason: 'BlockedByClient' });
  }
  const path = new URL(request.url).pathname.replace('/api/v1', '');
  if (request.method === 'OPTIONS') return send('Fetch.fulfillRequest', { requestId, responseCode: 204, responseHeaders: [
    { name: 'Access-Control-Allow-Origin', value: origin }, { name: 'Access-Control-Allow-Headers', value: 'authorization,content-type,x-organization-id,x-portal-role,accept' }, { name: 'Access-Control-Allow-Methods', value: 'GET,POST,PATCH,OPTIONS' },
  ] });
  let body = [];
  if (path === '/auth/me') body = { user: { id: actor, fullName: 'Browser fixture' }, memberships: [{ role, organizationId: org, permissions }] };
  else if (path === '/residents/me') body = { id: actor, user_id: actor, name: 'Browser fixture', organization_id: org, app_access_status: true };
  else if (path.startsWith('/society-settings')) body = { organizationId: org, name: 'Browser fixture', branding: {}, emergencyContacts: [] };
  else if (path === '/polls' && request.method === 'POST') {
    const input = JSON.parse(request.postData); creates.push(input);
    body = { ...input, id: actor, organization_id: org, status: 'DRAFT', created_at: new Date().toISOString() };
  } else if (path === '/polls/page') body = { items: polls, total: 2, totalPages: 1, page: 1, limit: 20 };
  else if (path.startsWith('/polls/') && request.method === 'PATCH') { const input = JSON.parse(request.postData); patches.push(input); body = { ...polls.find(poll => path.includes(poll.id)), ...input }; }
  else if (path.endsWith('/results')) body = options(polls.find(poll => path.includes(poll.id)) || polls[0]).map((option,index)=>({...option,vote_count:existingVotes ? [3,1,0][index] : 0}));
  else if (path.endsWith('/vote')) { ballots.push(JSON.parse(request.postData)); body = { success: true }; }
  else if (path.startsWith('/polls/')) body = polls.find(poll => path.includes(poll.id)) || null;
  else if (path === '/notifications/page') body = { items: [{ id: actor, type: 'POLL', title: 'New community poll', body: 'Open the community ballot to vote.', is_read: false, created_at: new Date().toISOString(), data: { pollId: polls[0].id } }], total: 1, totalPages: 1, page: 1 };
  else if (path.endsWith('/page')) body = { items: [], total: 0, totalPages: 1, page: 1, limit: 20 };
  else if (path.includes('count')) body = { count: 0 };
  await send('Fetch.fulfillRequest', { requestId, responseCode: request.method === 'OPTIONS' ? 204 : 200,
    responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: origin }, { name: 'Access-Control-Allow-Headers', value: 'authorization,content-type,x-organization-id,x-portal-role,accept' }, { name: 'Access-Control-Allow-Methods', value: 'GET,POST,PATCH,OPTIONS' }],
    ...(request.method === 'OPTIONS' ? {} : { body: Buffer.from(JSON.stringify({ success: true, data: body })).toString('base64') }),
  });
}
chrome.stdio[4].on('data', data => {
  buffer += data;
  let end;
  while ((end = buffer.indexOf('\0')) !== -1) {
    const message = JSON.parse(buffer.slice(0, end)); buffer = buffer.slice(end + 1);
    const task = pending.get(message.id);
    if (task) { pending.delete(message.id); message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result); }
    else if (message.method === 'Fetch.requestPaused') void intercept(message.params).catch(error => errors.push(error.message));
    else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
  }
});
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
async function wait(expression, label) {
  for (let attempt = 0; attempt < 200; attempt++) { if (await evaluate(expression)) return; await pause(100); }
  throw new Error(`Timeout: ${label}; ballots=${JSON.stringify(ballots)}; errors=${JSON.stringify(errors)}; ${await evaluate('document.body.innerText.slice(-1500)')}`);
}
async function input(selector, value) {
  await evaluate(`(() => {const element=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(element.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(element,${JSON.stringify(value)});element.dispatchEvent(new Event('input',{bubbles:true}));})()`);
}
let seedScript;
async function seed() {
  if (seedScript) await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: seedScript });
  const session = { societyos_session_auth: JSON.stringify({ id: actor, name: 'Browser fixture', role: role === 'RESIDENT' ? 'resident' : 'admin', societyId: org }), societyos_access_token: 'fixture-access', societyos_refresh_token: 'fixture-refresh', societyos_roles: JSON.stringify([role]), societyos_permissions: JSON.stringify(permissions), societyos_memberships: JSON.stringify([{ role, organizationId: org, permissions }]), societyos_organization_id: org };
  ({ identifier: seedScript } = await send('Page.addScriptToEvaluateOnNewDocument', { source: `sessionStorage.clear();for(const[key,value]of Object.entries(${JSON.stringify(session)}))sessionStorage.setItem(key,value);` }));
}
try {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' }, null);
  ({ sessionId } = await send('Target.attachToTarget', { targetId, flatten: true }, null));
  await send('Page.enable'); await send('Runtime.enable');
  await send('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }] });
  await seed();
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 650, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: origin + '/admin?section=notices' });
  await wait("[...document.querySelectorAll('button')].some(button=>button.textContent.includes('Community Polls & Voting'))", 'polls tab');
  await evaluate("[...document.querySelectorAll('button')].find(button=>button.textContent.includes('Community Polls & Voting')).click()");
  await wait("[...document.querySelectorAll('button')].some(button=>button.textContent.includes('+ Create Poll'))", 'admin polls');
  assert.equal(await evaluate("document.querySelectorAll('.admin-main > .society-help-button').length"), 0, 'SOS strip removed above admin header');
  for (const type of ['MULTIPLE', 'SINGLE']) {
    await evaluate("[...document.querySelectorAll('button')].find(button=>button.textContent.includes('+ Create Poll')).click()");
    await wait("!!document.querySelector('.poll-create-dialog')", 'create modal');
    if (type === 'MULTIPLE') {
      await evaluate("document.querySelector('input[value=MULTIPLE]').click();for(let i=0;i<18;i++)[...document.querySelectorAll('button')].find(button=>button.textContent.includes('+ Add Option')).click()");
      await wait("document.querySelectorAll('.poll-create-dialog input[placeholder^=Option]').length === 20", '20 options');
    }
    const bounds = await evaluate(`(()=>{const dialog=document.querySelector('.poll-create-dialog'),body=dialog.querySelector('.modal-body'),footer=dialog.querySelector('.modal-footer');body.scrollTop=body.scrollHeight;return{scrollable:body.scrollHeight>body.clientHeight,scrollTop:body.scrollTop,footerBottom:footer.getBoundingClientRect().bottom,height:innerHeight,lastBottom:[...body.querySelectorAll('input')].at(-1).getBoundingClientRect().bottom,bodyBottom:body.getBoundingClientRect().bottom}})()`);
    assert(bounds.scrollable && bounds.scrollTop > 0, 'Poll body scrolls');
    assert(bounds.footerBottom <= bounds.height, 'Footer stays inside viewport');
    assert(bounds.lastBottom <= bounds.bodyBottom, 'Final option reachable');
    await input('.poll-create-dialog input[type=text]', `${type} creation fixture`);
    await input('.poll-create-dialog input[type=date]', '2026-10-27');
    await evaluate("(()=>{const input=[...document.querySelectorAll('.poll-create-dialog input[type=date]')][1];Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'2026-10-29');input.dispatchEvent(new Event('input',{bubbles:true}))})()");
    const count = type === 'MULTIPLE' ? 20 : 2;
    for (let i = 0; i < count; i++) await input(`.poll-create-dialog input[placeholder="Option ${i + 1}"]`, `Answer ${i + 1}`);
    await evaluate("document.querySelector('.poll-create-dialog form').requestSubmit()");
    await wait("!document.querySelector('.poll-create-dialog')", 'created poll');
    assert.equal(creates.at(-1).poll_type, type);
    assert.equal(creates.at(-1).options.length, count);
    console.log(`PASS ${type}: modal scrolls, final option and footer reachable, correct creation payload`);
  }
  const editButton = "[...document.querySelectorAll('button')].find(button=>button.textContent==='Edit Poll')";
  await evaluate(`${editButton}.click()`);
  await wait("document.querySelector('#poll-create-title')?.textContent==='Edit Society Poll'", 'edit poll');
  await input('.poll-create-dialog input[type=text]', 'Updated poll question');
  await input('.poll-create-dialog input[placeholder="Option 1"]', 'Updated answer');
  await evaluate("document.querySelector('.poll-create-dialog form').requestSubmit()");
  await wait("!document.querySelector('.poll-create-dialog')", 'saved edit');
  assert.equal(patches[0].title, 'Updated poll question');
  assert.equal(patches[0].options[0].id, options(polls[0])[0].id);
  assert.equal(patches[0].options[0].option_text, 'Updated answer');
  existingVotes = true;
  await evaluate(`${editButton}.click()`);
  await wait("!!document.querySelector('.poll-create-dialog input[readonly]')", 'vote-protected edit');
  assert.equal(await evaluate("document.querySelector('.poll-create-dialog input[type=text]').readOnly"), true);
  await input('.poll-create-dialog textarea', 'Updated description after voting');
  await evaluate("document.querySelector('.poll-create-dialog form').requestSubmit()");
  await wait("!document.querySelector('.poll-create-dialog')", 'saved safe edit');
  assert.equal(patches[1].description, 'Updated description after voting');
  assert.equal('options' in patches[1], false);
  assert.equal('title' in patches[1], false);
  console.log('PASS edit modal updates unvoted questions/options and protects recorded votes');
  role = 'RESIDENT'; await seed();
  await send('Page.navigate', { url: origin + '/resident?tab=notices' });
  await wait("!!document.querySelector('.phone-bottom-nav')", 'resident navigation');
  await evaluate("[...document.querySelectorAll('.phone-bottom-nav button')].find(button=>button.textContent.includes('Notices')).click()");
  await wait("[...document.querySelectorAll('button')].some(button=>button.textContent.includes('Community Polls'))", 'resident notices');
  await evaluate("[...document.querySelectorAll('button')].find(button=>button.textContent.includes('Community Polls')).click()");
  await wait("document.querySelectorAll('#resident-polls-list input').length === 6", 'resident ballots');
  const card = type => `[...document.querySelectorAll('#resident-polls-list .card')].find(card=>card.innerText.includes('${type} browser ballot'))`;
  assert(await evaluate(`${card('SINGLE')}.innerText.includes('75%') && ${card('SINGLE')}.innerText.includes('25%')`), 'Resident sees percentages before voting');
  assert.equal(await evaluate(`${card('SINGLE')}.querySelectorAll('[role=progressbar]').length`), 3);
  assert(await evaluate(`(()=>{const sample=document.createElement('span');sample.style.color='var(--pine)';document.body.append(sample);const theme=getComputedStyle(sample).color;sample.remove();return getComputedStyle(${card('MULTIPLE')}.querySelector('input')).accentColor===theme})()`), 'Checkbox matches theme color');
  await evaluate(`(()=>{const inputs=${card('SINGLE')}.querySelectorAll('input');inputs[0].click();inputs[1].click()})()`);
  assert.equal(await evaluate(`${card('SINGLE')}.querySelectorAll('input:checked').length`), 1);
  await evaluate(`${card('SINGLE')}.querySelector('button').click()`);
  await wait(`${card('SINGLE')}.innerText.includes('You have cast your vote')`, 'single ballot');
  assert.deepEqual(ballots[0], { poll_id: polls[0].id, option_id: options(polls[0])[1].id });
  await evaluate(`(()=>{const inputs=${card('MULTIPLE')}.querySelectorAll('input');inputs[0].click();inputs[1].click()})()`);
  assert.equal(await evaluate(`${card('MULTIPLE')}.querySelectorAll('input:checked').length`), 2);
  await evaluate(`${card('MULTIPLE')}.querySelector('button').click()`);
  await wait(`${card('MULTIPLE')}.innerText.includes('You have cast your vote')`, 'multiple ballot');
  assert.deepEqual(ballots[1], { poll_id: polls[1].id, option_ids: options(polls[1]).slice(0, 2).map(option => option.id) });
  console.log('PASS resident single-choice radios and multiple-choice checkboxes submit one complete ballot');
  await evaluate("document.querySelector('.notif-bell-btn').click()");
  await wait("[...document.querySelectorAll('#notifications-modal button')].some(button=>button.textContent==='Open Poll')", 'in-app poll notification');
  await evaluate("[...document.querySelectorAll('#notifications-modal button')].find(button=>button.textContent==='Open Poll').click()");
  await wait("!document.querySelector('#notifications-modal') && !!document.querySelector('#resident-polls-list')", 'open poll from notification');
  console.log('PASS in-app poll notification opens authorized Community Polls screen');
  assert.deepEqual(errors, []);
} finally {
  try { await send('Browser.close', {}, null); } catch { chrome.kill('SIGTERM'); }
  await new Promise(resolve => chrome.exitCode !== null ? resolve() : chrome.once('exit', resolve));
  rmSync(profile, { recursive: true, force: true });
}
