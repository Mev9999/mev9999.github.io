import test from 'node:test';
import assert from 'node:assert/strict';
import { createHarness, cookieValue, fixtureIds } from './harness.mjs';

async function withHarness(callback) { const h = await createHarness(); try { await callback(h); } finally { await h.close(); } }
async function login(h, role = 'customer') {
  const result = await h.request('/api/auth/login', { method: 'POST', body: { email: role === 'admin' ? 'emina@example.test' : role === 'other' ? 'other@example.test' : 'customer@example.test', password: role === 'admin' ? 'Testverwaltung2026!' : 'Testgalerie2026!' } });
  assert.equal(result.status, 200);
  return { cookie: cookieValue(result), csrf: result.data.csrf };
}
const gallery = `/api/admin/galleries/${fixtureIds.gallery}`;
const activityCount = async h => (await h.DB.prepare('SELECT COUNT(*) AS count FROM customer_activity').first()).count;

test('studio settings, full image library and activity remain admin-only; mutations require CSRF and same origin', () => withHarness(async h => {
  const admin = await login(h, 'admin'); const customer = await login(h);
  for (const route of ['/api/admin/settings', '/api/admin/images', '/api/admin/activity']) {
    assert.equal((await h.request(route)).status, 401);
    assert.equal((await h.request(route, customer)).status, 403);
  }
  const changes = [
    ['/api/admin/settings', 'PATCH', { watermark: { enabled: true } }],
    ['/api/admin/activity/read', 'POST', {}],
    [`${gallery}/images/local-image-3`, 'PATCH', { title: 'Illegitimate rename' }],
    [`${gallery}/images/local-image-3`, 'DELETE', {}],
  ];
  for (const [route, method, body] of changes) {
    assert.equal((await h.request(route, { ...customer, method, body })).status, 403);
    assert.equal((await h.request(route, { cookie: admin.cookie, method, body })).status, 403);
    assert.equal((await h.request(route, { ...admin, method, body, origin: 'https://attacker.example.test' })).status, 403);
  }
  assert.equal((await h.request('/api/admin/settings', admin)).data.settings.watermark.enabled, false);
  assert.equal((await h.DB.prepare('SELECT title FROM images WHERE id=?').bind('local-image-3').first()).title, 'Familienmoment 03');
  assert.equal(await activityCount(h), 0);
}));

test('unpaid callers cannot bypass protected previews through query flags, original variants or stale watermark fingerprints', () => withHarness(async h => {
  const admin = await login(h, 'admin'); const customer = await login(h); const other = await login(h, 'other');
  assert.equal((await h.request('/api/admin/settings', { ...admin, method: 'PATCH', body: { watermark: { enabled: true } } })).status, 200);
  const settings = (await h.request(gallery, admin)).data.previewSettings;
  const key = 'security-test/protected-preview';
  await h.PHOTOS.put(key, new TextEncoder().encode('PROTECTED_PIXELS'), { httpMetadata: { contentType: 'image/webp' } });
  await h.DB.prepare('UPDATE images SET protected_preview_key=?,protected_preview_type=?,watermark_fingerprint=? WHERE id=?').bind(key, 'image/webp', settings.fingerprint, 'local-image-3').run();
  for (const suffix of ['?kind=preview', '?kind=preview&customerView=1', '?kind=preview&watermark=0', '?kind=preview&watermark=1', '?kind=preview&watermark=off&released=true&admin=1', '?kind=preview&key=original']) {
    const response = await h.request(`/api/images/local-image-3${suffix}`, customer);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), 'PROTECTED_PIXELS');
    assert.match(response.response.headers.get('cache-control'), /private, no-store/);
  }
  for (const method of ['GET', 'HEAD']) assert.equal((await h.request('/api/images/local-image-3?kind=original&downloadAllowed=true', { ...customer, method })).status, 403);
  assert.equal((await h.request('/api/images/local-image-3?kind=clean', customer)).status, 400);
  assert.equal((await h.request('/api/images/local-image-3?kind=preview', other)).status, 404);
  assert.equal((await h.request('/api/images/local-image-3?kind=preview')).status, 401);
  assert.equal(await activityCount(h), 0);
  await h.request('/api/admin/settings', { ...admin, method: 'PATCH', body: { watermark: { text: 'Changed watermark' } } });
  const stale = await h.request('/api/images/local-image-3?kind=preview', customer);
  assert.equal(stale.status, 200);
  assert.equal(stale.response.headers.get('x-liza-preview'), 'pending');
  assert.doesNotMatch(await stale.text(), /PROTECTED_PIXELS|local-image-fixture/);
  const adminOriginal = await h.request('/api/images/local-image-3?kind=original', admin);
  assert.equal(adminOriginal.status, 200);
  assert.equal(await adminOriginal.text(), 'local-image-fixture-3');
  assert.equal(await activityCount(h), 0, 'administrative preview regeneration does not create customer activity');
  await h.DB.prepare('DELETE FROM gallery_members WHERE gallery_id=? AND user_id=?').bind(fixtureIds.gallery, fixtureIds.customer).run();
  assert.equal((await h.request('/api/images/local-image-1?kind=original', customer)).status, 404, 'membership removal revokes even previously released images');
}));

test('preview regeneration rejects customer writes, wrong-gallery image IDs, stale settings and executable images', () => withHarness(async h => {
  const admin = await login(h, 'admin'); const customer = await login(h);
  await h.request('/api/admin/settings', { ...admin, method: 'PATCH', body: { watermark: { enabled: true } } });
  const settings = (await h.request(gallery, admin)).data.previewSettings;
  const clean = new Uint8Array([0xff, 0xd8, 0xff, 0, 0]);
  const form = (protectedBytes = clean, fingerprint = settings.fingerprint) => {
    const value = new FormData(); value.set('preview', new Blob([clean]), 'clean.jpg');
    value.set('protectedPreview', new Blob([protectedBytes]), 'protected.jpg'); value.set('watermarkFingerprint', fingerprint);
    return value;
  };
  const route = `${gallery}/images/local-image-3/previews`;
  assert.equal((await h.request(route, { ...customer, method: 'POST', body: form() })).status, 403);
  assert.equal((await h.request(`/api/admin/galleries/${fixtureIds.otherGallery}/images/local-image-3/previews`, { ...admin, method: 'POST', body: form() })).status, 404);
  assert.equal((await h.request(route, { ...admin, method: 'POST', body: form(clean, 'forged') })).status, 409);
  assert.equal((await h.request(route, { ...admin, method: 'POST', body: form('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>') })).status, 415);
  assert.equal((await h.DB.prepare('SELECT protected_preview_key FROM images WHERE id=?').bind('local-image-3').first()).protected_preview_key, null);
}));

test('original GET activity excludes previews, HEADs, failed authorization and administrators, and deduplicates retries', () => withHarness(async h => {
  const admin = await login(h, 'admin'); const customer = await login(h);
  await h.request('/api/images/local-image-1?kind=preview', customer);
  await h.request('/api/images/local-image-1?kind=original', { ...customer, method: 'HEAD' });
  await h.request('/api/images/local-image-3?kind=original', customer);
  await h.request('/api/images/local-foreign-image?kind=original', customer);
  await h.request('/api/images/local-image-1?kind=original', admin);
  assert.equal(await activityCount(h), 0);
  await h.request('/api/images/local-image-1?kind=original', customer);
  const originalNow = Date.now;
  // Remain in the first request's time bucket even at a real minute boundary.
  const event = await h.DB.prepare('SELECT * FROM customer_activity').first();
  Date.now = () => event.created_at;
  try { await h.request('/api/images/local-image-1?kind=original', customer); } finally { Date.now = originalNow; }
  assert.equal(await activityCount(h), 1);
  assert.equal(event.kind, 'download');
  assert.equal(event.user_id, fixtureIds.customer);
}));

test('activity pagination retains simultaneous favorites and customer data stays private', () => withHarness(async h => {
  const admin = await login(h, 'admin'); const customer = await login(h);
  const timestamp = Date.now() - 1000;
  const records = Array.from({ length: 450 }, (_, index) => h.DB.prepare('INSERT INTO customer_activity(id,kind,user_id,gallery_id,image_id,created_at) VALUES(?,?,?,?,?,?)').bind(`simultaneous-${String(index).padStart(4, '0')}`, 'favorite_added', fixtureIds.customer, fixtureIds.gallery, 'local-image-3', timestamp));
  await h.DB.batch(records);
  const seen = new Set(); let cursor = null;
  for (let page = 0; page < 3; page++) {
    const result = await h.request(`/api/admin/activity${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`, admin);
    assert.equal(result.status, 200);
    for (const event of result.data.activities) { assert.ok(!seen.has(event.id)); seen.add(event.id); }
    cursor = result.data.nextCursor;
  }
  assert.equal(seen.size, 450); assert.equal(cursor, null);
  assert.equal((await h.request('/api/admin/activity?cursor=0%3A%27%20OR%201%3D1', admin)).status, 400);
  assert.equal((await h.request('/api/admin/activity', customer)).status, 403);
  for (const route of ['/api/session', `/api/galleries/${fixtureIds.gallery}`]) {
    const data = (await h.request(route, customer)).data;
    assert.ok(!JSON.stringify(data).includes('simultaneous-'));
  }
  await h.request('/api/admin/activity/read', { ...admin, method: 'POST', body: { ids: ['simultaneous-0000'] } });
  assert.equal((await h.request('/api/admin/activity', admin)).data.unreadCount, 449);
}));

test('order invoices require actual order ownership even for another member of the same gallery', () => withHarness(async h => {
  const admin = await login(h, 'admin'); const customer = await login(h); const other = await login(h, 'other');
  const form = new FormData(); form.set('userId', fixtureIds.customer); form.set('file', new Blob(['%PDF-1.4\nOWNER INVOICE\n%%EOF'], { type: 'application/pdf' }), 'Rechnung.pdf');
  assert.equal((await h.request(`${gallery}/invoice`, { ...admin, method: 'POST', body: form })).status, 201);
  const created = await h.request('/api/orders', { ...customer, method: 'POST', body: { galleryId: fixtureIds.gallery, imageIds: ['local-image-3'], packageId: fixtureIds.singlePackage, paymentMethod: 'transfer', termsAccepted: true, digitalConsent: true } });
  assert.equal(created.status, 201);
  await h.DB.prepare('INSERT INTO gallery_members(gallery_id,user_id) VALUES(?,?)').bind(fixtureIds.gallery, fixtureIds.secondCustomer).run();
  const url = created.data.order.invoiceUrl;
  for (const method of ['GET', 'HEAD']) {
    assert.equal((await h.request(url, { ...other, method })).status, 404);
    assert.equal((await h.request(`${url}?userId=${fixtureIds.customer}&admin=true`, { ...other, method })).status, 404);
  }
  assert.equal((await h.request(`${url}?userId=${fixtureIds.secondCustomer}`, customer)).status, 200, 'query parameters cannot change the authenticated owner');
  assert.equal((await h.request(url, admin)).status, 200);
  const otherOrders = (await h.request('/api/orders', other)).data;
  assert.ok(!JSON.stringify(otherOrders).includes(created.data.order.id));
  await h.DB.prepare('UPDATE users SET disabled=1 WHERE id=?').bind(fixtureIds.customer).run();
  assert.equal((await h.request(url, customer)).status, 401);
}));

test('favorite activity write amplification has a per-customer budget and rate rejection changes no selection', () => withHarness(async h => {
  const customer = await login(h); const other = await login(h, 'other');
  await h.DB.prepare('INSERT INTO favorites(user_id,image_id) VALUES(?,?)').bind(fixtureIds.customer, 'local-image-3').run();
  await h.DB.prepare('INSERT INTO rate_limits(key,count,reset_at) VALUES(?,?,?)').bind(`favorites:${fixtureIds.customer}`, 120, Date.now() + 60_000).run();
  const rejected = await h.request(`/api/galleries/${fixtureIds.gallery}/favorites`, { ...customer, method: 'PUT', body: { imageIds: ['local-image-4'] } });
  assert.equal(rejected.status, 429);
  assert.deepEqual((await h.DB.prepare('SELECT image_id FROM favorites WHERE user_id=?').bind(fixtureIds.customer).all()).results.map(row => row.image_id), ['local-image-3']);
  assert.equal(await activityCount(h), 0);
  const independent = await h.request(`/api/galleries/${fixtureIds.otherGallery}/favorites`, { ...other, method: 'PUT', body: { imageIds: ['local-foreign-image'] } });
  assert.equal(independent.status, 200, 'another customer has an independent activity budget');
  await h.DB.prepare('UPDATE rate_limits SET reset_at=? WHERE key=?').bind(Date.now() - 1, `favorites:${fixtureIds.customer}`).run();
  assert.equal((await h.request(`/api/galleries/${fixtureIds.gallery}/favorites`, { ...customer, method: 'PUT', body: { imageIds: ['local-image-4'] } })).status, 200);
}));
