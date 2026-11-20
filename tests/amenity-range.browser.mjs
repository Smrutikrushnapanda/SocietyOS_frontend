// Disposable Chrome, mocked APIs, no actual bookings or messages.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { parseDate } from '@internationalized/date';
const frontend = process.env.SOCIETYOS_TEST_FRONTEND_URL || 'http://localhost:3000';
const debugging = process.env.SOCIETYOS_TEST_CHROME_URL || 'http://127.0.0.1:9229';
const target = await fetch(`${debugging}/json/new?about:blank`, { method: 'PUT' }).then(response => response.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
let sequence = 0, failAvailability = false, attempts = 0, delayBookings = false;
const pending = new Map(), errors = [], reads = [], writes = [];
const org = '11111111-1111-4111-8111-111111111111', actor = '22222222-2222-4222-8222-222222222222', gym = '33333333-3333-4333-8333-333333333333';
const flexibleGym = '44444444-4444-4444-8444-444444444444', hall = '55555555-5555-4555-8555-555555555555';
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const date = offset => new Date(Date.parse(`${today}T00:00:00Z`) + offset * 86400000).toISOString().slice(0, 10);
const rangeEnd = parseDate(today).add({ months: 1 }).subtract({ days: 1 }).toString();
const rangeCount = (Date.parse(rangeEnd) - Date.parse(today)) / 86400000 + 1;
let saved = [];
let ticket = null, failTicket = true;
const ticketWrites = [];
const permissions = ['resident:my', 'amenity:read', 'visitor:my', 'notice:read', 'poll:read', 'notification:read', 'complaint:my', 'payment:my'];
function command(method, params = {}) {
  const id = ++sequence;
  return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
}
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function intercept(event) {
  const url = new URL(event.request.url), path = url.pathname.replace('/api/v1', ''), method = event.request.method;
  let body = [], status = 200;
  if (method === 'OPTIONS') body = {};
  else if (path === '/auth/refresh-token') body = { accessToken: 'resident-token' };
  else if (path === '/auth/me') body = { user: { id: actor, mobileNumber: '9000000000' }, memberships: [{ role: 'RESIDENT', organizationId: org, permissions }] };
  else if (path === '/residents/me') body = { id: actor, user_id: actor, organization_id: org, name: 'Test Resident', flat_id: 'flat', flat: { flat_identifier: 'A-101' }, isActive: true, app_access_status: true };
  else if (path === '/society-settings/public') body = { name: 'Test Society', address: 'Test address', emergencyContacts: [], branding: {}, profile: {} };
  else if (path === '/amenities') body = [
    { id: gym, organization_id: org, name: 'Fitness Centre', code: 'GYM', icon: 'gym', open_time: '06:00', close_time: '09:00', slot_duration: '1 Hour', capacity: 20, price: 100, guest_fee: 0, status: 'Active' },
    { id: flexibleGym, organization_id: org, name: 'Actual Fitness Center', code: 'OPEN-GYM', open_time: '05:30', close_time: '22:30', slot_duration: 'Open Access', capacity: 30, price: 0, guest_fee: 0, status: 'Active' },
    { id: hall, organization_id: org, name: 'Clubhouse Party Hall', code: 'HALL', open_time: '09:00', close_time: '23:30', slot_duration: 'Full Day / Evening', capacity: 150, price: 2000, guest_fee: 0, status: 'Active' },
  ];
  else if (path.endsWith('/availability')) {
    const from = url.searchParams.get('from'), to = url.searchParams.get('to');
    reads.push({ from, to });
    assert.ok((Date.parse(to) - Date.parse(from)) / 86400000 < 62);
    if (failAvailability) { status = 503; body = { message: 'Availability temporarily unavailable' }; }
    else body = [{ date: date(12), slots: ['06:00 - 07:00'] }, { date: date(20), slots: ['07:00 - 08:00'] }].filter(day => day.date >= from && day.date <= to);
  } else if (path === '/amenities/bookings' && method === 'GET') body = saved;
  else if (path === '/amenities/bookings/range') {
    const input = JSON.parse(event.request.postData); writes.push(input); attempts++;
    if (attempts === 1) { status = 409; body = { message: `${date(12)}: New conflict. No bookings were created.` }; }
    else {
      const created = [];
      for (let day = Date.parse(input.date_from); day <= Date.parse(input.date_to); day += 86400000) {
        const booking = { ...input, id: `booking-${saved.length}`, date: new Date(day).toISOString().slice(0, 10), status: 'Pending', resident: 'Test Resident', flat: 'A-101' };
        saved.push(booking); created.push(booking);
      }
      body = created;
    }
    if (delayBookings) await delay(500);
  } else if (path === '/complaints/priorities') body = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'].map((priority, index) => ({ id: `priority-${index}`, priority, name: `${priority} priority`, status: 'Active', response_deadline_minutes: 60, order_severity: index }));
  else if (path === '/complaints' && method === 'POST') {
    const input = JSON.parse(event.request.postData); ticketWrites.push(input);
    assert.equal(input.priority, 'MEDIUM');
    assert.equal(input.flat_id, undefined);
    if (failTicket) { status = 400; body = { message: 'Ticket service rejected this request' }; }
    else { ticket = { ...input, id: '66666666-6666-4666-8666-666666666666', resident_id: actor, organization_id: org, status: 'OPEN', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }; body = ticket; }
  } else if (path === '/complaints/my/page') {
    const items = ticket && url.searchParams.get('tab') !== 'completed' ? [ticket] : [];
    body = { items, page: 1, limit: 10, total: items.length, totalPages: 1 };
  } else if (path.endsWith('/history')) body = { history: [] };
  else if (path === '/visitor-visits/my/page') body = { items: [{ id: '77777777-7777-4777-8777-777777777777', visitor_id: 'visitor', visit_status: 'CONFIRMED', expected_entry_time: '2026-11-20T10:00:00+05:30', createdAt: new Date().toISOString(), visitor: { name: 'Dated Guest Pass', mobile: '9000000000' } }], page: 1, total: 1, totalPages: 1 };
  else if (path.endsWith('/page')) body = { items: [], page: 1, limit: 10, total: 0, totalPages: 1 };
  else if (path.includes('actionable-count') || path.includes('unread-count')) body = { count: 0 };
  await command('Fetch.fulfillRequest', { requestId: event.requestId, responseCode: status, responseHeaders: [
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
  throw Error(`${label}: ${await evaluate('document.body.innerText.slice(-2200)')} ${errors.join(', ')}`);
}
const click = text => evaluate(`[...document.querySelectorAll('#amenities-modal button')].find(button => button.textContent.trim() === ${JSON.stringify(text)}).click()`);
const slots = `document.querySelectorAll('#amenities-modal .slot-pill')`;
async function pointerClick(selector) {
  await evaluate(`(${selector}).scrollIntoView({block:'center',inline:'nearest'})`);
  await delay(150);
  const point = await evaluate(`(() => { const node = ${selector}; const rect = node.getBoundingClientRect(); const x = rect.left + rect.width/2, y = rect.top + rect.height/2; return {x,y,hit:node.contains(document.elementFromPoint(x,y))}; })()`);
  assert.equal(point.hit, true, `click target is unobstructed: ${selector}`);
  await command('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
  await command('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
}
async function fillTime(id, value) {
  await evaluate(`(() => { const input = document.getElementById('${id}'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'${value}'); input.dispatchEvent(new Event('input',{bubbles:true})); })()`);
}
async function dismissSuccess() {
  await wait(`Boolean(document.querySelector('.swal-confirm-btn'))`, 'success confirmation');
  await pointerClick(`document.querySelector('.swal-confirm-btn')`);
  await wait(`!document.querySelector('.swal-toast-backdrop')`, 'confirmation dismissed');
}
try {
  await command('Page.enable'); await command('Runtime.enable');
  await command('Emulation.setTimezoneOverride', { timezoneId: 'Asia/Kolkata' });
  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await command('Fetch.enable', { patterns: [{ urlPattern: '*/api/v1/*', requestStage: 'Request' }] });
  await command('Page.addScriptToEvaluateOnNewDocument', { source: 'localStorage.clear(); sessionStorage.clear();' });
  await command('Page.navigate', { url: `${frontend}/resident` });
  await wait(`Boolean(document.querySelector('#qa-amenities'))`, 'resident home');
  await evaluate(`document.querySelector('#qa-amenities').click()`);
  await wait(`${slots}.length === 3 && !${slots}[0].disabled`, 'initial day availability');
  assert.ok(await evaluate(`document.querySelector('#amenity-booking-submit').form === document.querySelector('#amenities-modal form')`));
  assert.equal(await evaluate(`document.querySelectorAll('.amenity-pick-icon svg rect').length`), 3);
  await pointerClick(`document.querySelector('#amenity-booking-submit')`);
  await wait(`document.querySelector('#amenity-booking-error')?.textContent.includes('Choose a time slot')`, 'missing slot is explained');
  assert.equal(writes.length, 0);
  await click('1 month');
  await wait(`${slots}[0].disabled && ${slots}[1].disabled && !${slots}[2].disabled`, 'month checks every date');
  assert.ok(await evaluate(`document.querySelector('[aria-label="Booking range summary"]').innerText.includes('₹${(100 * rangeCount).toLocaleString('en-IN')}')`));
  console.log('PASS month preset checks all dates and shows daily count/total');
  assert.ok(await evaluate(`document.querySelectorAll('#amenity-date [role="spinbutton"]').length >= 3`));
  await evaluate(`document.querySelector('button[aria-label="Choose valid until"]').click()`);
  await wait(`Boolean(document.querySelector('[role="grid"]'))`, 'shared end calendar');
  const targetMonth = date(61).slice(0, 7);
  const monthDifference = (Number(targetMonth.slice(0, 4)) - Number(rangeEnd.slice(0, 4))) * 12 + Number(targetMonth.slice(5)) - Number(rangeEnd.slice(5, 7));
  for (let month = 0; month < monthDifference; month++) {
    await evaluate(`[...document.querySelectorAll('[role="dialog"] button')].find(button => button.textContent.trim() === '›').click()`);
    await delay(100);
  }
  const heading = new Date(`${targetMonth}-01T12:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  await wait(`document.querySelector('[role="dialog"] h2')?.textContent.includes(${JSON.stringify(heading)})`, 'target month');
  await evaluate(`[...document.querySelectorAll('[role="gridcell"] [role="button"]')].find(cell => !cell.hasAttribute('data-outside-month') && cell.textContent.trim() === '${Number(date(61).slice(-2))}').click()`);
  await wait(`!document.querySelector('[role="grid"]')`, 'shared calendar date selection');
  await wait(`document.querySelector('[aria-label="Booking range summary"]').innerText.includes('62 daily bookings') && !${slots}[2].disabled`, '62-day range');
  assert.ok(reads.some(read => read.from === today && read.to === date(61)));
  console.log('PASS shared calendar selects 62-day range with bounded availability reads');
  failAvailability = true;
  await click('7 days');
  await wait(`document.body.innerText.includes('Availability temporarily unavailable')`, 'availability failure');
  assert.ok(await evaluate(`[...${slots}].every(button => button.disabled)`));
  failAvailability = false;
  await click('Retry availability');
  await wait(`!${slots}[0].disabled`, 'availability retry');
  console.log('PASS failed availability disables requests and supports retry');
  await click('1 month');
  await wait(`!${slots}[2].disabled && ${slots}[0].disabled`, 'monthly availability restored');
  await evaluate(`${slots}[2].click()`);
  for (const width of [320, 390]) {
    await command('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: true });
    assert.ok(await evaluate(`(() => { const node = document.querySelector('#amenities-modal .mobile-bottom-sheet'); return node.scrollWidth <= node.clientWidth; })()`), `width ${width}`);
  }
  const screenshot = await command('Page.captureScreenshot', { format: 'png' });
  await writeFile('/private/tmp/societyos-amenity-range-preview.png', Buffer.from(screenshot.data, 'base64'));
  await click(`Request ${rangeCount} days`);
  await wait(`document.body.innerText.includes('New conflict')`, 'conflict reported');
  assert.equal(saved.length, 0);
  await wait(`Boolean(document.querySelector('#amenities-modal')) && ![...document.querySelectorAll('#amenities-modal button')].find(button => button.textContent.trim() === 'Request ${rangeCount} days').disabled`, 'retry request after recheck');
  await click(`Request ${rangeCount} days`);
  await wait(`!document.querySelector('#amenities-modal')`, 'successful monthly request');
  assert.equal(writes.length, 2);
  assert.equal(writes[1].date_from, today);
  assert.equal(writes[1].date_to, rangeEnd);
  assert.equal(writes[1].slot, '08:00 - 09:00');
  assert.equal(saved.length, rangeCount);
  await dismissSuccess();
  await command('Page.navigate', { url: `${frontend}/amenities/bookings` });
  await wait(`document.querySelectorAll('#my-amenity-bookings .amenity-history-card').length === ${rangeCount}`, 'separate daily status history');
  assert.equal(await evaluate(`Boolean(document.querySelector('#amenities-modal'))`), false);
  await pointerClick(`document.querySelector('#my-amenity-bookings button.btn-primary')`);
  await wait(`Boolean(document.querySelector('#amenities-modal .amenity-pick-card'))`, 'booking form reopened');
  assert.equal(await evaluate(`Boolean(document.querySelector('#amenities-modal [aria-label="My amenity bookings"]'))`), false);
  console.log('PASS conflict creates nothing; successful month persists all dates and reloads history');
  await pointerClick(`[...document.querySelectorAll('.amenity-pick-card')].find(button=>button.textContent.includes('Actual Fitness Center'))`);
  await wait(`${slots}.length > 1`, 'open access slot pills');
  assert.equal(await evaluate(`Boolean(document.querySelector('#amenity-start-time'))`), false);
  await click('Custom time');
  await wait(`Boolean(document.querySelector('#amenity-start-time'))`, 'optional custom time fields');
  await pointerClick(`document.querySelector('#amenity-booking-submit')`);
  await wait(`document.querySelector('#amenity-booking-error')?.textContent.includes('Choose a daily start time')`, 'missing flexible times explained');
  assert.equal(writes.length, 2);
  await fillTime('amenity-start-time', '07:00'); await fillTime('amenity-end-time', '06:00');
  await pointerClick(`document.querySelector('#amenity-booking-submit')`);
  await wait(`document.querySelector('#amenity-booking-error')?.textContent.includes('end time after the start')`, 'reversed times rejected');
  assert.equal(writes.length, 2);
  await fillTime('amenity-start-time', '06:00'); await fillTime('amenity-end-time', '07:00');
  await click('7 days');
  await wait(`[...${slots}].some(button => button.textContent.includes('6:00 AM - 7:00 AM') && !button.disabled)`, 'open access range available');
  delayBookings = true;
  await pointerClick(`document.querySelector('#amenity-booking-submit')`);
  await wait(`document.querySelector('#amenity-booking-submit')?.disabled && document.body.innerText.includes('Submitting your booking request')`, 'submission progress');
  await evaluate(`document.querySelector('#amenities-modal form').requestSubmit()`);
  await wait(`!document.querySelector('#amenities-modal')`, 'gym booking submitted by pointer');
  assert.equal(writes.length, 3);
  assert.equal(writes[2].amenity_id, flexibleGym);
  assert.equal(writes[2].slot, '06:00 - 07:00');
  assert.equal(saved.length, rangeCount + 7);
  delayBookings = false;
  await dismissSuccess();
  await pointerClick(`document.querySelector('#my-amenity-bookings button.btn-primary')`);
  await pointerClick(`[...document.querySelectorAll('.amenity-pick-card')].find(button=>button.textContent.includes('Clubhouse Party Hall'))`);
  await wait(`${slots}.length > 1 && !${slots}[0].disabled`, 'full day hall pill available');
  await pointerClick(`${slots}[0]`);
  await pointerClick(`document.querySelector('#amenity-booking-submit')`);
  await wait(`!document.querySelector('#amenities-modal')`, 'hall booking submitted by pointer');
  assert.equal(writes.length, 4);
  assert.equal(writes[3].amenity_id, hall);
  assert.equal(writes[3].slot, '09:00 - 23:30');
  console.log('PASS actual gym/hall duration formats submit via real clicks; validation and duplicate-submit protection work');
  await dismissSuccess();
  await pointerClick(`document.querySelector('[data-tab="complaints"]')`);
  await wait(`Boolean(document.querySelector('#my-complaints-list'))`, 'helpdesk view');
  await evaluate(`[...document.querySelectorAll('#my-complaints-list button')].find(button=>button.textContent==='Completed requests').click()`);
  await pointerClick(`[...document.querySelectorAll('#screen-complaints button')].find(button=>button.textContent.trim()==='+ Ticket')`);
  await wait(`Boolean(document.querySelector('#complaint-modal form'))`, 'facility ticket form');
  await pointerClick(`document.querySelector('#complaint-modal button[type=submit]')`);
  await wait(`document.querySelector('#complaint-modal [role=alert]')?.textContent.includes('short title')`, 'required ticket title');
  await evaluate(`(() => { const input=document.querySelector('#complaint-title-input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Repair clubhouse light'); input.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await pointerClick(`document.querySelector('#complaint-modal button[type=submit]')`);
  await wait(`document.querySelector('#complaint-modal [role=alert]')?.textContent.includes('describe the problem')`, 'required ticket details');
  assert.equal(ticketWrites.length, 0);
  await evaluate(`(() => { const input=document.querySelector('#complaint-desc-input'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,'Ceiling light near the entrance is flickering.'); input.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  assert.equal(await evaluate(`[...document.querySelectorAll('#complaint-modal .priority-pill')].some(button=>button.textContent.includes('URGENT'))`), false);
  await pointerClick(`document.querySelector('#complaint-modal button[type=submit]')`);
  await wait(`document.querySelector('#complaint-modal [role=alert]')?.textContent.includes('Ticket service rejected')`, 'ticket failure stays inline');
  assert.ok(await evaluate(`Boolean(document.querySelector('#complaint-modal'))`));
  failTicket = false;
  await pointerClick(`document.querySelector('#complaint-modal button[type=submit]')`);
  await wait(`!document.querySelector('#complaint-modal') && document.querySelector('#my-complaints-list')?.innerText.includes('Repair clubhouse light')`, 'ticket closes and appears in helpdesk');
  assert.equal(ticketWrites.length, 2);
  assert.equal(await evaluate(`document.querySelector('#my-complaints-list [aria-selected=true]').textContent`), 'Active requests');
  console.log('PASS ticket validation, failure feedback, successful close and active helpdesk refresh');
  await dismissSuccess();
  await pointerClick(`document.querySelector('[data-tab="visitors"]')`);
  await wait(`document.querySelector('#visitors-list-screen .visitor-card-date')?.innerText.includes('20 Nov 2026')`, 'date on visitor pass card');
  console.log('PASS visitor pass cards show visit dates');
  assert.deepEqual(errors, []);
} finally { await command('Page.close').catch(() => {}); socket.close(); }
