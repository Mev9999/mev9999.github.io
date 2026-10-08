import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createHarness, cookieValue, tokenFromMail, fixtureIds, ORIGIN } from './harness.mjs';

async function login(harness, admin = false) {
  const result = await harness.request('/api/auth/login', { method: 'POST', body: { email: admin ? 'emina@example.test' : 'customer@example.test', password: admin ? 'Testverwaltung2026!' : 'Testgalerie2026!' } });
  assert.equal(result.status, 200, 'fixture login should succeed');
  const cookie = cookieValue(result);
  assert.ok(cookie.includes('liza_session_local='));
  const session = await harness.request('/api/session', { cookie });
  assert.ok(session.data?.csrf, 'authenticated session provides CSRF token');
  return { cookie, csrf: session.data.csrf, user: session.data.user };
}
async function withHarness(callback) { const harness = await createHarness(); try { await callback(harness); } finally { await harness.close(); } }

test('anonymous access reveals no gallery records or private image bytes', () => withHarness(async h => {
  const session = await h.request('/api/session');
  assert.equal(session.status, 200);
  assert.equal(session.data.user, null);
  for (const route of ['/api/galleries', `/api/galleries/${fixtureIds.gallery}`, '/api/images/local-image-1?kind=preview', '/api/images/local-image-1?kind=original', '/api/orders', '/api/admin/galleries']) {
    const result = await h.request(route);
    assert.ok([401, 403].includes(result.status), `${route} is protected`);
    const serialized = await result.text();
    assert.ok(!serialized.includes('Familienmoment 01'));
    assert.ok(!serialized.includes('local-image-fixture'));
  }
}));

test('gallery membership and gallery expiry protect detail, favorites, previews, and originals', () => withHarness(async h => {
  const client = await login(h);
  const galleries = await h.request('/api/galleries', client);
  assert.equal(galleries.status, 200);
  assert.ok(galleries.data.galleries.every(gallery => gallery.id !== fixtureIds.otherGallery && gallery.id !== fixtureIds.expiredGallery));
  for (const galleryId of [fixtureIds.otherGallery, fixtureIds.expiredGallery]) {
    assert.ok([403, 404, 410].includes((await h.request(`/api/galleries/${galleryId}`, client)).status));
    assert.ok([403, 404, 410].includes((await h.request(`/api/galleries/${galleryId}/favorites`, { ...client, method: 'PUT', body: { imageIds: [] } })).status));
  }
  for (const imageId of ['local-foreign-image', 'local-expired-image']) for (const kind of ['preview', 'original']) {
    assert.ok([403, 404, 410].includes((await h.request(`/api/images/${imageId}?kind=${kind}`, client)).status));
  }
  const detail = await h.request(`/api/galleries/${fixtureIds.gallery}`, client);
  assert.equal(detail.status, 200);
  assert.equal(detail.data.images.length, 8);
  assert.ok(detail.data.images.every(image => !Object.keys(image).some(key => /preview_key|original_key|password_hash/.test(key))), 'private storage keys are not returned');
}));

test('favorites persist on the server and cannot include images from another gallery', () => withHarness(async h => {
  const client = await login(h);
  const route = `/api/galleries/${fixtureIds.gallery}/favorites`;
  const saved = await h.request(route, { ...client, method: 'PUT', body: { imageIds: ['local-image-1', 'local-image-3'] } });
  assert.equal(saved.status, 200);
  const detail = await h.request(`/api/galleries/${fixtureIds.gallery}`, client);
  assert.deepEqual([...detail.data.favorites].sort(), ['local-image-1', 'local-image-3']);
  const bad = await h.request(route, { ...client, method: 'PUT', body: { imageIds: ['local-foreign-image'] } });
  assert.ok([400, 403, 404].includes(bad.status));
  assert.deepEqual([...((await h.request(`/api/galleries/${fixtureIds.gallery}`, client)).data.favorites)].sort(), ['local-image-1', 'local-image-3']);
}));

test('authenticated mutations require same-origin requests and CSRF token', () => withHarness(async h => {
  const client = await login(h);
  const route = `/api/galleries/${fixtureIds.gallery}/favorites`;
  for (const options of [
    { cookie: client.cookie, csrf: 'incorrect', origin: ORIGIN },
    { cookie: client.cookie, origin: ORIGIN },
    { ...client, origin: 'https://unrelated.example' },
    { ...client, origin: null },
  ]) assert.ok([400, 403].includes((await h.request(route, { ...options, method: 'PUT', body: { imageIds: [] } })).status));
  const preflight = await h.request('/api/galleries', { method: 'OPTIONS', origin: 'https://unrelated.example' });
  assert.notEqual(preflight.response.headers.get('access-control-allow-origin'), 'https://unrelated.example');
}));

test('setup links are sent only to recorded accounts and can be used only once', () => withHarness(async h => {
  const unknown = await h.request('/api/auth/request', { method: 'POST', body: { email: 'not-present@example.test', purpose: 'setup' } });
  const requested = await h.request('/api/auth/request', { method: 'POST', body: { email: 'new@example.test', purpose: 'setup' } });
  assert.equal(unknown.status, requested.status, 'account existence is not signalled by HTTP status');
  assert.deepEqual(unknown.data, requested.data, 'account existence is not signalled by response body');
  assert.equal(h.mail.messages.length, 1);
  assert.equal(h.mail.messages[0].to, 'new@example.test');
  const token = tokenFromMail(h.mail.messages[0]);
  const complete = await h.request('/api/auth/complete', { method: 'POST', body: { token, password: 'NeuesTestpasswort2026!' } });
  assert.equal(complete.status, 200);
  const replay = await h.request('/api/auth/complete', { method: 'POST', body: { token, password: 'AnderesTestpasswort2026!' } });
  assert.ok([400, 401, 403, 410].includes(replay.status));
  assert.equal((await h.request('/api/auth/login', { method: 'POST', body: { email: 'new@example.test', password: 'NeuesTestpasswort2026!' } })).status, 200);
  const user = await h.DB.prepare('SELECT password_hash FROM users WHERE email=?').bind('new@example.test').first();
  assert.ok(!user.password_hash.includes('NeuesTestpasswort2026!'));
}));

test('reset revokes old sessions, old password, and stale reset tokens', () => withHarness(async h => {
  const client = await login(h);
  await h.request('/api/auth/request', { method: 'POST', body: { email: 'customer@example.test', purpose: 'reset' } });
  const firstToken = tokenFromMail(h.mail.messages.at(-1));
  await h.request('/api/auth/request', { method: 'POST', body: { email: 'customer@example.test', purpose: 'reset' } });
  const token = tokenFromMail(h.mail.messages.at(-1));
  assert.notEqual(firstToken, token);
  assert.ok([400, 401, 403, 410].includes((await h.request('/api/auth/complete', { method: 'POST', body: { token: firstToken, password: 'NeuesTestpasswort2026!' } })).status));
  assert.equal((await h.request('/api/auth/complete', { method: 'POST', body: { token, password: 'NeuesTestpasswort2026!' } })).status, 200);
  assert.ok([401, 403].includes((await h.request('/api/galleries', client)).status));
  assert.ok([400, 401, 403].includes((await h.request('/api/auth/login', { method: 'POST', body: { email: 'customer@example.test', password: 'Testgalerie2026!' } })).status));
  assert.equal((await h.request('/api/auth/login', { method: 'POST', body: { email: 'customer@example.test', password: 'NeuesTestpasswort2026!' } })).status, 200);
}));

test('download release is enforced server-side and limited to selected paid pictures', () => withHarness(async h => {
  const client = await login(h);
  const admin = await login(h, true);
  assert.equal((await h.request('/api/images/local-image-1?kind=original', client)).status, 200, 'manually released sample is downloadable');
  assert.equal((await h.request('/api/images/local-image-3?kind=preview', client)).status, 200);
  assert.equal((await h.request('/api/images/local-image-3?kind=original', client)).status, 403);
  const created = await h.request('/api/orders', { ...client, method: 'POST', body: { galleryId: fixtureIds.gallery, imageIds: ['local-image-3'], packageId: fixtureIds.singlePackage, paymentMethod: 'transfer', termsAccepted: true, digitalConsent: true } });
  assert.ok([200, 201].includes(created.status));
  const order = await h.DB.prepare('SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC LIMIT 1').bind(fixtureIds.customer).first();
  assert.equal(order.status, 'pending');
  assert.equal((await h.request('/api/images/local-image-3?kind=original', client)).status, 403);
  assert.equal((await h.request(`/api/admin/orders/${order.id}/paid`, { ...admin, method: 'POST', body: {} })).status, 200);
  assert.equal((await h.request('/api/images/local-image-3?kind=original', client)).status, 200);
  assert.equal((await h.request('/api/images/local-image-4?kind=original', client)).status, 403);
}));

test('order totals are determined by the server and reject invalid count, duplicates, and cross-gallery images', () => withHarness(async h => {
  const client = await login(h);
  const base = { galleryId: fixtureIds.gallery, imageIds: ['local-image-3'], packageId: fixtureIds.singlePackage, paymentMethod: 'transfer', termsAccepted: true, digitalConsent: true };
  const created = await h.request('/api/orders', { ...client, method: 'POST', body: { ...base, amountCents: 1, priceCents: 1, currency: 'USD' } });
  assert.ok([200, 201].includes(created.status));
  const order = await h.DB.prepare('SELECT amount_cents,currency FROM orders WHERE user_id=?').bind(fixtureIds.customer).first();
  assert.equal(order.amount_cents, 1000); assert.equal(order.currency, 'EUR');
  for (const body of [
    { ...base, packageId: fixtureIds.threePackage, imageIds: ['local-image-3', 'local-image-4'] },
    { ...base, packageId: fixtureIds.threePackage, imageIds: ['local-image-3', 'local-image-3', 'local-image-3'] },
    { ...base, imageIds: ['local-foreign-image'] },
    { ...base, termsAccepted: false },
    { ...base, digitalConsent: false },
  ]) assert.ok([400, 403, 404, 422].includes((await h.request('/api/orders', { ...client, method: 'POST', body })).status));
  assert.equal((await h.DB.prepare('SELECT COUNT(*) AS count FROM orders').first()).count, 1);
}));

test('customers cannot call administrative read, write, release, or payment-confirmation routes', () => withHarness(async h => {
  const client = await login(h);
  for (const [route, method, body] of [
    ['/api/admin/galleries', 'GET'], ['/api/admin/orders', 'GET'],
    ['/api/admin/galleries', 'POST', { name: 'Tampered', shootingDate: '2026-10-07' }],
    [`/api/admin/galleries/${fixtureIds.gallery}`, 'PATCH', { published: true }],
    [`/api/admin/galleries/${fixtureIds.gallery}/release`, 'POST', { userId: fixtureIds.customer, imageIds: ['local-image-3'] }],
    ['/api/admin/orders/fictional-order/paid', 'POST', {}],
  ]) assert.equal((await h.request(route, { ...client, method, body })).status, 403);
}));

test('Stripe refuses invalid signatures and never trusts the success return URL', () => withHarness(async h => {
  const client = await login(h);
  const event = { id: 'evt_fake', type: 'checkout.session.completed', data: { object: { metadata: { orderId: 'does-not-exist' }, amount_total: 1, currency: 'eur', payment_status: 'paid' } } };
  h.env.STRIPE_SECRET_KEY = 'sk_test_local_only_no_network';
  const hook = await h.request('/api/payments/stripe/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Stripe-Signature': `t=${Math.floor(Date.now()/1000)},v1=${'0'.repeat(64)}` }, body: JSON.stringify(event), origin: null });
  assert.ok([400, 401, 403, 503].includes(hook.status));
  assert.equal((await h.DB.prepare('SELECT COUNT(*) AS count FROM payment_events').first()).count, 0);
  assert.equal((await h.DB.prepare("SELECT COUNT(*) AS count FROM orders WHERE status='paid'").first()).count, 0);
  assert.ok([400, 404].includes((await h.request('/api/orders/success?orderId=does-not-exist&paid=true', client)).status));
}));

test('production never permits local mail interception or insecure session cookies', () => withHarness(async h => {
  h.env.LOCAL_DEV = 'true';
  h.env.PORTAL_ORIGIN = 'https://portal.liza-memories-photography.com';
  // This check deliberately uses the production Origin while leaving the test sink in env.
  const result = await h.request(h.env.PORTAL_ORIGIN + '/api/auth/login', { origin: h.env.PORTAL_ORIGIN, method: 'POST', body: { email: 'customer@example.test', password: 'Testgalerie2026!' } });
  assert.equal(result.status, 200);
  assert.ok(result.cookies.every(cookie => /;\s*Secure(?:;|$)/i.test(cookie)), 'real domains must always use Secure cookies');
  assert.ok(result.cookies.every(cookie => /^__Host-liza_session=/.test(cookie)), 'production session is tied to the exact host');
  const before = h.mail.messages.length;
  await h.request(h.env.PORTAL_ORIGIN + '/api/auth/request', { origin: h.env.PORTAL_ORIGIN, method: 'POST', body: { email: 'new@example.test', purpose: 'setup' } });
  assert.equal(h.mail.messages.length, before, 'local sink is disabled for production origins');
}));

test('verified Stripe events require matching amount, persist once, and send a durable order receipt', () => withHarness(async h => {
  const client = await login(h);
  const result = await h.request('/api/orders', { ...client, method: 'POST', body: { galleryId: fixtureIds.gallery, imageIds: ['local-image-3'], packageId: fixtureIds.singlePackage, paymentMethod: 'transfer', termsAccepted: true, digitalConsent: true } });
  assert.equal(result.status, 201);
  const order = await h.DB.prepare('SELECT * FROM orders LIMIT 1').first();
  await h.DB.prepare("UPDATE orders SET payment_method='stripe', provider_reference=? WHERE id=?").bind('cs_local_test_only', order.id).run();
  h.env.STRIPE_SECRET_KEY = 'sk_test_local_only_no_network';
  const payment = { id: 'cs_local_test_only', metadata: { order_id: order.id }, amount_total: 1000, currency: 'eur', client_reference_id: order.id, payment_status: 'paid' };
  async function postSigned(object, id) {
    const raw = JSON.stringify({ id, type: 'checkout.session.completed', data: { object } });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createHmac('sha256', h.env.STRIPE_WEBHOOK_SECRET).update(timestamp + '.' + raw).digest('hex');
    return h.request('/api/payments/stripe/webhook', { method: 'POST', origin: null, body: raw, headers: { 'Content-Type': 'application/json', 'Stripe-Signature': `t=${timestamp},v1=${signature}` } });
  }
  assert.equal((await postSigned({ ...payment, amount_total: 1 }, 'evt_wrong_amount')).status, 400);
  assert.equal((await h.DB.prepare('SELECT status FROM orders WHERE id=?').bind(order.id).first()).status, 'pending');
  assert.equal((await postSigned(payment, 'evt_local_paid')).status, 200);
  assert.equal((await h.DB.prepare('SELECT status FROM orders WHERE id=?').bind(order.id).first()).status, 'paid');
  assert.equal((await h.request('/api/images/local-image-3?kind=original', client)).status, 200);
  const receiptCount = h.mail.messages.length;
  assert.ok(receiptCount >= 1, 'durable order confirmation sent');
  assert.ok(h.mail.messages.some(message => message.to === 'customer@example.test' && (message.text || '').includes(order.id)), 'receipt belongs to the purchasing customer');
  assert.equal((await postSigned(payment, 'evt_local_paid')).status, 200);
  assert.equal((await h.DB.prepare('SELECT COUNT(*) AS count FROM payment_events').first()).count, 1);
  assert.equal(h.mail.messages.length, receiptCount, 'webhook retry does not duplicate receipt');
}));

test('admin can create, upload, publish, invite, release, and revoke a gallery', () => withHarness(async h => {
  const admin = await login(h, true);
  const client = await login(h);
  const created = await h.request('/api/admin/galleries', { ...admin, method: 'POST', body: { name: 'Lokale Testserie', date: '2026-10-07', description: 'Keine echten Kundendaten.', shootingType: 'school', published: false } });
  assert.equal(created.status, 201);
  const galleryId = created.data.gallery.id;
  assert.equal((await h.request(`/api/admin/galleries/${galleryId}/members`, { ...admin, method: 'POST', body: { email: 'customer@example.test', name: 'Beispielkunde' } })).status, 201);
  assert.equal((await h.request(`/api/galleries/${galleryId}`, client)).status, 404, 'draft galleries are hidden');
  const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aVxIAAAAASUVORK5CYII=', 'base64');
  const form = new FormData();
  form.set('title', 'Ein Testbild'); form.set('width', '1'); form.set('height', '1');
  form.set('preview', new Blob([pixel], { type: 'image/png' }), 'preview.png');
  form.set('original', new Blob([pixel], { type: 'image/png' }), 'original.png');
  const uploaded = await h.request(`/api/admin/galleries/${galleryId}/images`, { ...admin, method: 'POST', body: form });
  assert.equal(uploaded.status, 201);
  const imageId = uploaded.data.image.id;
  const invalid = new FormData();
  invalid.set('title', 'Invalid executable image'); invalid.set('width', '1'); invalid.set('height', '1');
  invalid.set('preview', new Blob(['<svg onload="alert(1)"></svg>'], { type: 'image/png' }), 'fake.png');
  invalid.set('original', new Blob(['<svg></svg>'], { type: 'image/png' }), 'fake.png');
  assert.equal((await h.request(`/api/admin/galleries/${galleryId}/images`, { ...admin, method: 'POST', body: invalid })).status, 415);
  assert.equal((await h.request(`/api/admin/galleries/${galleryId}`, { ...admin, method: 'PATCH', body: { published: true, coverImageId: imageId } })).status, 200);
  const detail = await h.request(`/api/galleries/${galleryId}`, client);
  assert.equal(detail.status, 200); assert.equal(detail.data.images.length, 1); assert.equal(detail.data.packages.length, 2);
  assert.equal((await h.request(`/api/admin/galleries/${galleryId}/invite`, { ...admin, method: 'POST', body: { email: 'customer@example.test' } })).status, 200);
  assert.equal(h.mail.messages.at(-1).to, 'customer@example.test');
  assert.equal((await h.request(`/api/images/${imageId}?kind=original`, client)).status, 403);
  assert.equal((await h.request(`/api/admin/galleries/${galleryId}/release`, { ...admin, method: 'POST', body: { userId: fixtureIds.customer, imageIds: [imageId] } })).status, 200);
  assert.equal((await h.request(`/api/images/${imageId}?kind=original`, client)).status, 200);
  assert.equal((await h.request(`/api/admin/galleries/${galleryId}/members/${fixtureIds.customer}`, { ...admin, method: 'DELETE', body: {} })).status, 200);
  assert.equal((await h.request(`/api/images/${imageId}?kind=original`, client)).status, 404);
}));

test('expired sessions, expired setup links, and disabled accounts cannot grant access', () => withHarness(async h => {
  const client = await login(h);
  await h.DB.prepare('UPDATE sessions SET expires_at=? WHERE user_id=?').bind(Date.now() - 1, fixtureIds.customer).run();
  assert.equal((await h.request('/api/galleries', client)).status, 401);
  await h.request('/api/auth/request', { method: 'POST', body: { email: 'new@example.test', purpose: 'setup' } });
  const token = tokenFromMail(h.mail.messages.at(-1));
  await h.DB.prepare('UPDATE auth_tokens SET expires_at=?').bind(Date.now() - 1).run();
  assert.ok([400, 401, 403, 410].includes((await h.request('/api/auth/complete', { method: 'POST', body: { token, password: 'NeuesTestpasswort2026!' } })).status));
  await h.DB.prepare('UPDATE users SET disabled=1 WHERE id=?').bind(fixtureIds.customer).run();
  assert.equal((await h.request('/api/auth/login', { method: 'POST', body: { email: 'customer@example.test', password: 'Testgalerie2026!' } })).status, 401);
}));

test('one setup token permits exactly one concurrent password setup', () => withHarness(async h => {
  await h.request('/api/auth/request', { method: 'POST', body: { email: 'new@example.test', purpose: 'setup' } });
  const token = tokenFromMail(h.mail.messages.at(-1));
  const attempts = await Promise.all([
    h.request('/api/auth/complete', { method: 'POST', body: { token, password: 'ConcurrentFirst2026!' } }),
    h.request('/api/auth/complete', { method: 'POST', body: { token, password: 'ConcurrentSecond2026!' } }),
  ]);
  assert.equal(attempts.filter(attempt => attempt.status === 200).length, 1);
  assert.equal((await h.DB.prepare('SELECT COUNT(*) AS count FROM sessions WHERE user_id=?').bind(fixtureIds.newCustomer).first()).count, 1);
}));

test('simultaneous duplicate order submissions are idempotent', () => withHarness(async h => {
  const client = await login(h);
  const body = { galleryId: fixtureIds.gallery, imageIds: ['local-image-3'], packageId: fixtureIds.singlePackage, paymentMethod: 'transfer', termsAccepted: true, digitalConsent: true };
  // Hold both deduplication reads at the same point to reproduce separate Worker
  // requests seeing an empty pending-order list before either transaction commits.
  const prepare = h.DB.prepare.bind(h.DB); let readers = 0; let release;
  const barrier = new Promise(resolve => { release = resolve; });
  h.DB.prepare = sql => {
    const statement = prepare(sql); const bind = statement.bind.bind(statement);
    statement.bind = (...values) => {
      const bound = bind(...values);
      if (/SELECT \* FROM orders WHERE user_id=.*status='pending'/.test(sql)) {
        const all = bound.all.bind(bound);
        bound.all = async () => { const result = await all(); readers++; if (readers === 2) release(); await barrier; return result; };
      }
      return bound;
    };
    return statement;
  };
  const results = await Promise.all([
    h.request('/api/orders', { ...client, method: 'POST', body }),
    h.request('/api/orders', { ...client, method: 'POST', body }),
  ]);
  assert.ok(results.every(result => [200, 201].includes(result.status)));
  assert.equal((await h.DB.prepare('SELECT COUNT(*) AS count FROM orders').first()).count, 1, 'a double click must not create two payable orders');
  assert.equal(results[0].data.order.id, results[1].data.order.id);
}));

test('request host must match the configured portal, even with a matching Origin header', () => withHarness(async h => {
  const client = await login(h);
  for (const route of ['http://localhost:8789/api/session', 'https://unrelated.example/api/galleries']) {
    assert.equal((await h.request(route, { ...client, origin: ORIGIN })).status, 403);
  }
}));

test('paid status alone does not allow original downloads without durable contract confirmation', () => withHarness(async h => {
  const client = await login(h);
  const body = { galleryId: fixtureIds.gallery, imageIds: ['local-image-3'], packageId: fixtureIds.singlePackage, paymentMethod: 'transfer', termsAccepted: true, digitalConsent: true };
  assert.equal((await h.request('/api/orders', { ...client, method: 'POST', body })).status, 201);
  await h.DB.prepare("UPDATE orders SET status='paid',receipt_sent_at=NULL").run();
  assert.equal((await h.request('/api/images/local-image-3?kind=original', client)).status, 403);
}));

test('PayPal verification rejects foreign orders, wrong amounts, and wrong currencies', () => withHarness(async h => {
  const client = await login(h);
  const body = { galleryId: fixtureIds.gallery, imageIds: ['local-image-3'], packageId: fixtureIds.singlePackage, paymentMethod: 'transfer', termsAccepted: true, digitalConsent: true };
  assert.equal((await h.request('/api/orders', { ...client, method: 'POST', body })).status, 201);
  const order = await h.DB.prepare('SELECT * FROM orders LIMIT 1').first();
  await h.DB.prepare("UPDATE orders SET payment_method='paypal',provider_reference=? WHERE id=?").bind('LOCAL_PAYPAL_ONLY', order.id).run();
  Object.assign(h.env, { PAYPAL_CLIENT_ID: 'local-client-only', PAYPAL_CLIENT_SECRET: 'local-secret-only', PAYPAL_ENVIRONMENT: 'sandbox' });
  const originalFetch = globalThis.fetch;
  try {
    let payment;
    globalThis.fetch = async (url) => {
      const endpoint = String(url);
      if (endpoint.endsWith('/v1/oauth2/token')) return Response.json({ access_token: 'local-only-token' });
      if (!endpoint.startsWith('https://api-m.sandbox.paypal.com/')) throw new Error('Unexpected network request in test');
      return Response.json(payment);
    };
    const base = { id: 'LOCAL_PAYPAL_ONLY', status: 'COMPLETED', purchase_units: [{ custom_id: order.id, payments: { captures: [{ id: 'LOCAL_CAPTURE', status: 'COMPLETED', amount: { currency_code: 'EUR', value: '10.00' } }] } }] };
    for (const alter of [
      p => { p.id = 'FOREIGN_ORDER'; },
      p => { p.purchase_units[0].custom_id = 'foreign-order'; },
      p => { p.purchase_units[0].payments.captures[0].amount.value = '0.01'; },
      p => { p.purchase_units[0].payments.captures[0].amount.currency_code = 'USD'; },
    ]) {
      payment = structuredClone(base); alter(payment);
      const captured = await h.request(`/api/orders/${order.id}/capture`, { ...client, method: 'POST', body: {} });
      assert.equal(captured.status, 409);
      assert.equal((await h.DB.prepare('SELECT status FROM orders WHERE id=?').bind(order.id).first()).status, 'pending');
      assert.equal((await h.request('/api/images/local-image-3?kind=original', client)).status, 403);
    }
    payment = structuredClone(base);
    assert.equal((await h.request(`/api/orders/${order.id}/capture`, { ...client, method: 'POST', body: {} })).status, 200);
    assert.equal((await h.request('/api/images/local-image-3?kind=original', client)).status, 200);
  } finally { globalThis.fetch = originalFetch; }
}));

test('large photo selections stay within D1 Free query and parameter limits', () => withHarness(async h => {
  const client = await login(h);
  const imageIds = [];
  for (let index = 0; index < 120; index++) {
    const imageId = `bulk-local-image-${index}`; imageIds.push(imageId);
    await h.DB.prepare('INSERT INTO images (id,gallery_id,title,preview_key,original_key,preview_type,original_type,width,height,position,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
      .bind(imageId, fixtureIds.gallery, `Testbild ${index}`, `bulk/preview/${index}`, `bulk/original/${index}`, 'image/webp', 'image/webp', 100, 100, index + 10, Date.now()).run();
  }
  await h.DB.prepare('INSERT INTO packages (id,gallery_id,name,image_count,price_cents,currency) VALUES (?,?,?,?,?,?)').bind('bulk-package', fixtureIds.gallery, '120 Testbilder', 120, 35000, 'EUR').run();
  const prepare = h.DB.prepare.bind(h.DB); const batch = h.DB.batch.bind(h.DB); let queryCount = 0;
  const charge = count => { queryCount += count; if (queryCount > 50) throw new Error('D1 Free permits at most 50 queries per Worker invocation.'); };
  h.DB.prepare = sql => {
    const statement = prepare(sql); const bind = statement.bind.bind(statement);
    statement.bind = (...values) => {
      const bound = bind(...values);
      for (const method of ['all', 'first', 'run', 'raw']) {
        const execute = bound[method].bind(bound);
        bound[method] = (...args) => { charge(1); return execute(...args); };
      }
      return bound;
    };
    return statement;
  };
  h.DB.batch = statements => { charge(statements.length); return batch(statements); };
  queryCount = 0;
  const favorite = await h.request(`/api/galleries/${fixtureIds.gallery}/favorites`, { ...client, method: 'PUT', body: { imageIds } });
  assert.equal(favorite.status, 200, '120 favorite selections must work on the deployed D1 Free tier');
  assert.ok(queryCount <= 50);
  queryCount = 0;
  const ordered = await h.request('/api/orders', { ...client, method: 'POST', body: { galleryId: fixtureIds.gallery, imageIds, packageId: 'bulk-package', paymentMethod: 'transfer', termsAccepted: true, digitalConsent: true } });
  assert.equal(ordered.status, 201, '120 image order must work on the deployed D1 Free tier');
  assert.ok(queryCount <= 50);
}));

test('single-photo and three-photo packs calculate quantities from the actual selection', () => withHarness(async h => {
  const client = await login(h);
  const base = { galleryId: fixtureIds.gallery, paymentMethod: 'transfer', termsAccepted: true, digitalConsent: true, packageQuantity: 1, amountCents: 1 };
  const two = await h.request('/api/orders', { ...client, method: 'POST', body: { ...base, packageId: fixtureIds.singlePackage, imageIds: ['local-image-3', 'local-image-4'] } });
  assert.equal(two.status, 201);
  assert.equal(two.data.order.amountCents, 2000);
  assert.equal(two.data.order.packageQuantity, 2);
  const six = await h.request('/api/orders', { ...client, method: 'POST', body: { ...base, packageId: fixtureIds.threePackage, imageIds: ['local-image-3', 'local-image-4', 'local-image-5', 'local-image-6', 'local-image-7', 'local-image-8'] } });
  assert.equal(six.status, 201);
  assert.equal(six.data.order.amountCents, 5000);
  assert.equal(six.data.order.packageQuantity, 2);
  assert.equal((await h.request('/api/orders', { ...client, method: 'POST', body: { ...base, packageId: fixtureIds.threePackage, imageIds: ['local-image-3', 'local-image-4', 'local-image-5', 'local-image-6'] } })).status, 400);
}));

test('personal galleries use a custom total, hide per-image packs, and allow manual release', () => withHarness(async h => {
  const admin = await login(h, true);
  const client = await login(h);
  const created = await h.request('/api/admin/galleries', { ...admin, method: 'POST', body: { name: 'Persönliche Familiengalerie', date: '2026-10-07', shootingType: 'family', published: true } });
  assert.equal(created.status, 201);
  const galleryId = created.data.gallery.id;
  assert.equal(created.data.gallery.pricingMode, 'gallery');
  assert.equal(created.data.gallery.shootingType, 'family');
  assert.equal((await h.request(`/api/admin/galleries/${galleryId}`, admin)).data.packages.length, 0, 'a personal gallery must not inherit school-photo prices');
  await h.request(`/api/admin/galleries/${galleryId}/members`, { ...admin, method: 'POST', body: { email: 'customer@example.test', name: 'Beispielkunde' } });
  const imageIds = ['personal-local-1', 'personal-local-2'];
  for (const [index, imageId] of imageIds.entries()) {
    const previewKey = `${galleryId}/preview/${imageId}`; const originalKey = `${galleryId}/original/${imageId}`;
    await h.PHOTOS.put(previewKey, 'local personal preview'); await h.PHOTOS.put(originalKey, 'local personal original');
    await h.DB.prepare('INSERT INTO images (id,gallery_id,title,preview_key,original_key,preview_type,original_type,width,height,position,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
      .bind(imageId, galleryId, `Persönlicher Moment ${index + 1}`, previewKey, originalKey, 'image/webp', 'image/webp', 100, 100, index, Date.now()).run();
  }
  const total = await h.request(`/api/admin/galleries/${galleryId}/packages`, { ...admin, method: 'POST', body: { name: 'Vereinbartes Familienshooting', imageCount: 0, priceCents: 18900, active: true } });
  assert.equal(total.status, 201);
  const schoolPrice = await h.request(`/api/admin/galleries/${galleryId}/packages`, { ...admin, method: 'POST', body: { name: 'Unpassendes Einzelbildpaket', imageCount: 1, priceCents: 1000, active: true } });
  assert.equal(schoolPrice.status, 201);
  const detail = await h.request(`/api/galleries/${galleryId}`, client);
  assert.equal(detail.data.packages.length, 1);
  assert.equal(detail.data.packages[0].imageCount, 0);
  const base = { galleryId, imageIds, paymentMethod: 'transfer', termsAccepted: true, digitalConsent: true, amountCents: 1000 };
  assert.equal((await h.request('/api/orders', { ...client, method: 'POST', body: { ...base, packageId: schoolPrice.data.package.id } })).status, 400, 'stored school prices cannot bypass personal-gallery mode');
  assert.equal((await h.request('/api/orders', { ...client, method: 'POST', body: { ...base, packageId: total.data.package.id, imageIds: [imageIds[0]] } })).status, 400, 'complete-gallery package requires all images');
  const ordered = await h.request('/api/orders', { ...client, method: 'POST', body: { ...base, packageId: total.data.package.id } });
  assert.equal(ordered.status, 201);
  assert.equal(ordered.data.order.amountCents, 18900);
  assert.equal(ordered.data.order.packageQuantity, 1);
  assert.equal((await h.request(`/api/images/${imageIds[0]}?kind=original`, client)).status, 403);
  assert.equal((await h.request(`/api/admin/galleries/${galleryId}/release`, { ...admin, method: 'POST', body: { userId: fixtureIds.customer, imageIds: [imageIds[0]] } })).status, 200);
  assert.equal((await h.request(`/api/images/${imageIds[0]}?kind=original`, client)).status, 200, 'previously paid shooting may be released manually');
  assert.equal((await h.request(`/api/images/${imageIds[1]}?kind=original`, client)).status, 403);
  assert.equal((await h.request(`/api/admin/orders/${ordered.data.order.id}/paid`, { ...admin, method: 'POST', body: {} })).status, 200);
  assert.equal((await h.request(`/api/images/${imageIds[1]}?kind=original`, client)).status, 200);
}));

test('gallery appearance settings persist and reject invalid values and foreign cover images', () => withHarness(async h => {
  const admin = await login(h, true);
  const route = `/api/admin/galleries/${fixtureIds.gallery}`;
  const saved = await h.request(route, { ...admin, method: 'PATCH', body: { shootingType: 'newborn', pricingMode: 'gallery', theme: 'dark', gridLayout: 'grid', coverPosition: 24, coverImageId: 'local-image-3' } });
  assert.equal(saved.status, 200);
  assert.deepEqual({ type: saved.data.gallery.shootingType, mode: saved.data.gallery.pricingMode, theme: saved.data.gallery.theme, grid: saved.data.gallery.gridLayout, position: saved.data.gallery.coverPosition }, { type: 'newborn', mode: 'gallery', theme: 'dark', grid: 'grid', position: 24 });
  for (const body of [
    { shootingType: 'bogus' }, { pricingMode: 'free' }, { theme: 'neon' }, { gridLayout: 'bogus' },
    { coverPosition: -1 }, { coverPosition: 101 }, { coverPosition: 'not-a-number' }, { coverImageId: 'local-foreign-image' },
  ]) assert.equal((await h.request(route, { ...admin, method: 'PATCH', body })).status, 400);
  const persisted = (await h.request(route, admin)).data.gallery;
  assert.equal(persisted.theme, 'dark'); assert.equal(persisted.coverPosition, 24); assert.equal(persisted.coverImageId, 'local-image-3');
  assert.equal((await h.request(route, { ...admin, method: 'PATCH', body: { coverPosition: 0 } })).status, 200);
  assert.equal((await h.request(route, { ...admin, method: 'PATCH', body: { coverPosition: 100 } })).status, 200);
}));

test('transfer remains the default even when card and PayPal credentials are configured', () => withHarness(async h => {
  delete h.env.PAYMENT_METHODS;
  Object.assign(h.env, { STRIPE_SECRET_KEY: 'sk_test_local_only_no_network', PAYPAL_CLIENT_ID: 'local-only', PAYPAL_CLIENT_SECRET: 'local-only', PAYPAL_ENVIRONMENT: 'sandbox' });
  const client = await login(h);
  const caps = (await h.request('/api/session', client)).data.capabilities;
  assert.equal(caps.transferConfigured, true); assert.equal(caps.stripe, false); assert.equal(caps.paypal, false);
  const base = { galleryId: fixtureIds.gallery, imageIds: ['local-image-3'], packageId: fixtureIds.singlePackage, termsAccepted: true, digitalConsent: true };
  for (const paymentMethod of ['stripe', 'paypal']) assert.equal((await h.request('/api/orders', { ...client, method: 'POST', body: { ...base, paymentMethod } })).status, 503);
  assert.equal((await h.DB.prepare('SELECT COUNT(*) AS count FROM orders').first()).count, 0);
  assert.equal((await h.request('/api/orders', { ...client, method: 'POST', body: { ...base, paymentMethod: 'transfer' } })).status, 201);
}));

test('invalid bank details disable transfer on the server before any payable order is created', () => withHarness(async h => {
  const client = await login(h);
  const correct = { recipient: h.env.BANK_RECIPIENT, iban: h.env.BANK_IBAN, bic: h.env.BANK_BIC };
  for (const changes of [
    { BANK_IBAN: 'AT00000000000000000000' },
    { BANK_IBAN: 'DE72110220330123456789' },
    { BANK_RECIPIENT: 'Testkonto\nAngreifer' },
    { BANK_RECIPIENT: 'x'.repeat(71) },
    { BANK_BIC: 'NOT-A-BIC' },
  ]) {
    Object.assign(h.env, { BANK_RECIPIENT: correct.recipient, BANK_IBAN: correct.iban, BANK_BIC: correct.bic }, changes);
    assert.equal((await h.request('/api/session', client)).data.capabilities.transferConfigured, false);
    const ordered = await h.request('/api/orders', { ...client, method: 'POST', body: { galleryId: fixtureIds.gallery, imageIds: ['local-image-3'], packageId: fixtureIds.singlePackage, paymentMethod: 'transfer', termsAccepted: true, digitalConsent: true } });
    assert.equal(ordered.status, 503);
  }
  assert.equal((await h.DB.prepare('SELECT COUNT(*) AS count FROM orders').first()).count, 0);
}));

test('600-photo galleries can be ordered and released as a whole without accepting client-supplied foreign images', () => withHarness(async h => {
  const client = await login(h); const admin = await login(h, true);
  await h.DB.prepare("UPDATE galleries SET pricing_mode='gallery',shooting_type='wedding' WHERE id=?").bind(fixtureIds.gallery).run();
  for (let index = 0; index < 592; index++) {
    await h.DB.prepare('INSERT INTO images (id,gallery_id,title,preview_key,original_key,preview_type,original_type,width,height,position,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
      .bind(`full-local-image-${index}`, fixtureIds.gallery, `Hochzeitsmoment ${index}`, `full/preview/${index}`, `full/original/${index}`, 'image/webp', 'image/webp', 100, 100, index + 10, Date.now()).run();
  }
  await h.DB.prepare('INSERT INTO packages (id,gallery_id,name,image_count,price_cents,currency) VALUES (?,?,?,?,?,?)').bind('full-gallery-package', fixtureIds.gallery, 'Vereinbartes Hochzeitspaket', 0, 59900, 'EUR').run();
  const body = { galleryId: fixtureIds.gallery, packageId: 'full-gallery-package', all: true, imageIds: ['local-foreign-image'], paymentMethod: 'transfer', termsAccepted: true, digitalConsent: true, amountCents: 1 };
  const ordered = await h.request('/api/orders', { ...client, method: 'POST', body });
  assert.equal(ordered.status, 201);
  assert.equal(ordered.data.order.amountCents, 59900);
  assert.equal(ordered.data.order.imageIds.length, 600);
  assert.ok(!ordered.data.order.imageIds.includes('local-foreign-image'));
  assert.equal((await h.DB.prepare('SELECT COUNT(*) AS count FROM order_images WHERE order_id=?').bind(ordered.data.order.id).first()).count, 600);
  assert.equal((await h.request('/api/orders', { ...client, method: 'POST', body: { ...body, galleryId: fixtureIds.otherGallery } })).status, 404);
  assert.equal((await h.request('/api/images/local-image-3?kind=original', client)).status, 403);
  const receipt = h.mail.messages.find(message => (message.text || '').includes(ordered.data.order.id));
  assert.ok(receipt);
  assert.ok(receipt.text.includes('Hochzeitsmoment 591'));
  assert.ok(receipt.text.includes('Gesamtbetrag: 599.00 EUR'));
  assert.ok(receipt.text.includes('IBAN: DE71110220330123456789'));
  assert.ok(receipt.text.includes('BIC: BHBLDEHHXXX'));
  assert.ok(receipt.text.includes(`Zahlungsreferenz: ${ordered.data.order.id}`));
  const releaseRoute = `/api/admin/galleries/${fixtureIds.gallery}/release`;
  assert.equal((await h.request(releaseRoute, { ...client, method: 'POST', body: { userId: fixtureIds.customer, all: true } })).status, 403);
  assert.equal((await h.request(releaseRoute, { ...admin, method: 'POST', body: { userId: fixtureIds.secondCustomer, all: true } })).status, 400);
  assert.equal((await h.DB.prepare('SELECT COUNT(*) AS count FROM manual_releases WHERE user_id=?').bind(fixtureIds.secondCustomer).first()).count, 0);
  assert.equal((await h.request(releaseRoute, { ...admin, method: 'POST', body: { userId: fixtureIds.customer, all: true } })).status, 200);
  assert.equal((await h.DB.prepare('SELECT COUNT(*) AS count FROM manual_releases WHERE user_id=?').bind(fixtureIds.customer).first()).count, 600);
  assert.equal((await h.request('/api/images/local-image-3?kind=original', client)).status, 200);
  assert.equal((await h.request('/api/images/local-foreign-image?kind=original', client)).status, 404);
  // A durable confirmation must not change when the photographer edits a gallery later.
  await h.DB.prepare('UPDATE galleries SET name=? WHERE id=?').bind('Später geänderter Titel', fixtureIds.gallery).run();
  await h.DB.prepare('UPDATE packages SET price_cents=? WHERE id=?').bind(99900, 'full-gallery-package').run();
  await h.DB.prepare('UPDATE images SET title=? WHERE id=?').bind('Später geänderter Bildtitel', 'full-local-image-591').run();
  h.env.BANK_RECIPIENT = 'Später geänderter Empfänger';
  const savedReceipt = await h.request(`/api/orders/${ordered.data.order.id}/receipt`, client);
  assert.equal(savedReceipt.status, 200);
  assert.equal(await savedReceipt.text(), receipt.text, 'stored contract and bank details are immutable');
  const resent = await h.request(`/api/admin/orders/${ordered.data.order.id}/receipt`, { ...admin, method: 'POST', body: {} });
  assert.equal(resent.status, 200);
  assert.equal(h.mail.messages.at(-1).text, receipt.text, 'resending uses the stored contract');
}));
