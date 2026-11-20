/* Shared browser/service-worker contract. Payload URLs and display text are never trusted. */
const categories = new Set(['NOTICE', 'EMERGENCY', 'POLL', 'COMPLAINT', 'AMENITY', 'VISITOR_ARRIVAL', 'VISITOR_APPROVAL']);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const pending = new Set();

/** @param {unknown} value */
function parsePush(value) {
  if (typeof value !== 'object' || value === null) return null;
  if (!('deliveryId' in value) || typeof value.deliveryId !== 'string' || !uuid.test(value.deliveryId)) return null;
  if (!('referenceId' in value) || typeof value.referenceId !== 'string' || !uuid.test(value.referenceId)) return null;
  if (!('category' in value) || typeof value.category !== 'string' || !categories.has(value.category)) return null;
  return { deliveryId: value.deliveryId, referenceId: value.referenceId, category: value.category };
}

/** @param {unknown} value */
function pushPath(value) {
  const data = parsePush(value);
  if (!data) return null;
  return `/resident?pushCategory=${encodeURIComponent(data.category)}&pushReference=${encodeURIComponent(data.referenceId)}&pushDelivery=${encodeURIComponent(data.deliveryId)}`;
}

/** @param {string} id */
async function claimDisplay(id) {
  if (!uuid.test(id) || pending.has(id)) return false;
  pending.add(id);
  const run = async () => {
    // Fail closed when durable deduplication storage is unavailable.
    try {
      const cache = await caches.open('societyos-push-display-v1');
      const key = new URL(`/__push_display__/${id}`, globalThis.location.origin).href;
      const previous = await cache.match(key);
      if (previous && Date.now() - Number(await previous.text()) < 7 * 86400000) return false;
      await cache.put(key, new Response(String(Date.now())));
      const keys = await cache.keys();
      await Promise.all(keys.slice(0, Math.max(0, keys.length - 500)).map((request) => cache.delete(request)));
      return true;
    } catch { return false; }
  };
  try {
    if (!globalThis.navigator?.locks) return false;
    return await navigator.locks.request(`societyos-push:${id}`, run);
  } finally { pending.delete(id); }
}

const societyosPush = { parsePush, pushPath, claimDisplay };
if (typeof module === 'object') module.exports = societyosPush;
if (typeof self !== 'undefined') self.SocietyOSPush = societyosPush;
