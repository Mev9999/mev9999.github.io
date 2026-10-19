import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import worker from '../backend/worker.mjs';
import { createHarness, cookieValue, tokenFromMail, fixtureIds } from './harness.mjs';

async function withHarness(callback) { const h = await createHarness(); try { await callback(h); } finally { await h.close(); } }
async function login(h, admin = false) {
  const result = await h.request('/api/auth/login', { method: 'POST', body: { email: admin ? 'emina@example.test' : 'customer@example.test', password: admin ? 'Testverwaltung2026!' : 'Testgalerie2026!' } });
  assert.equal(result.status, 200);
  return { cookie: cookieValue(result), csrf: result.data.csrf };
}
const galleryRoute = `/api/admin/galleries/${fixtureIds.gallery}`;
const release = (h, admin, imageIds = ['local-image-3']) => h.request(`${galleryRoute}/release`, { ...admin, method: 'POST', body: { userId: fixtureIds.customer, imageIds } });
const downloads = h => h.mail.messages.filter(message => message.idempotencyKey?.startsWith('download-ready/'));
async function uploadInvoice(h, admin, content = '%PDF-1.4\nLOCAL INVOICE A\n%%EOF', userId = fixtureIds.customer) {
  const form = new FormData(); form.set('userId', userId); form.set('file', new Blob([content], { type: 'application/pdf' }), 'Rechnung-Ä.pdf');
  return h.request(`${galleryRoute}/invoice`, { ...admin, method: 'POST', body: form });
}
async function order(h, customer) {
  return h.request('/api/orders', { ...customer, method: 'POST', body: { galleryId: fixtureIds.gallery, imageIds: ['local-image-3'], packageId: fixtureIds.singlePackage, paymentMethod: 'transfer', termsAccepted: true, digitalConsent:true,earlyStartConsent:true,consentVersion:'portal-digital-2026-10-19-consent-v4',consentLanguage:'de' } });
}

test('customer favorite summaries include only active current customer members and never leak in customer or preview responses', () => withHarness(async h => {
  const admin = await login(h, true); const customer = await login(h);
  await h.DB.prepare('DELETE FROM favorites').run();
  await h.DB.prepare('INSERT INTO favorites(user_id,image_id) VALUES (?,?)').bind(fixtureIds.customer, 'local-image-3').run();
  await h.DB.prepare('INSERT INTO favorites(user_id,image_id) VALUES (?,?)').bind(fixtureIds.secondCustomer, 'local-image-4').run();
  await h.DB.prepare('INSERT INTO favorites(user_id,image_id) VALUES (?,?)').bind(fixtureIds.admin, 'local-image-3').run();
  await h.DB.prepare('INSERT INTO gallery_members(gallery_id,user_id) VALUES (?,?)').bind(fixtureIds.gallery, fixtureIds.admin).run();
  const detail = (await h.request(galleryRoute, admin)).data;
  const summary = detail.customerFavorites;
  assert.equal(summary.count, 1);
  assert.deepEqual(summary.customers.map(member => member.id).sort(), [fixtureIds.customer, fixtureIds.newCustomer].sort());
  assert.deepEqual(summary.images.find(image => image.imageId === 'local-image-3').customers, [{ id: fixtureIds.customer, name: 'Beispielkunde', email: 'customer@example.test' }]);
  assert.equal(summary.customers.find(member => member.id === fixtureIds.newCustomer).count, 0);
  await h.DB.prepare('UPDATE users SET disabled=1 WHERE id=?').bind(fixtureIds.newCustomer).run();
  assert.equal((await h.request(galleryRoute, admin)).data.customerFavorites.customers.length, 1);
  for (const response of [await h.request(`/api/galleries/${fixtureIds.gallery}`, customer), await h.request(`/api/galleries/${fixtureIds.gallery}?customerView=1`, admin)]) {
    assert.equal(response.status, 200);
    for (const field of ['customerFavorites', 'members', 'notificationStatus', 'invoices']) assert.equal(field in response.data, false);
    assert.ok(!JSON.stringify(response.data).includes('other@example.test'));
  }
  const preview = (await h.request(`/api/galleries/${fixtureIds.gallery}?customerView=1`, admin)).data;
  assert.deepEqual(preview.favorites, []);
  assert.ok(preview.images.every(image => image.downloadAllowed === false));
  // Preview mode changes presentation only; the administrator retains normal API authority.
  assert.equal((await h.request('/api/images/local-image-3?kind=original', admin)).status, 200);
}));

test('first gallery invitation supplies one short-lived setup link and completion opens the intended authorized gallery', () => withHarness(async h => {
  const admin = await login(h, true);
  assert.equal((await h.request(`${galleryRoute}/invite`, { ...admin, method: 'POST', body: { email: 'new@example.test' } })).status, 200);
  const invitation = h.mail.messages.at(-1); const token = tokenFromMail(invitation);
  const tokenRecord = await h.DB.prepare('SELECT * FROM auth_tokens WHERE user_id=?').bind(fixtureIds.newCustomer).first();
  assert.equal(tokenRecord.purpose, 'setup'); assert.equal(tokenRecord.gallery_id, fixtureIds.gallery);
  assert.equal(tokenRecord.expires_at - tokenRecord.created_at, 30 * 60_000);
  assert.notEqual(tokenRecord.token_hash, token);
  assert.ok(invitation.text.includes(`gallery=${fixtureIds.gallery}`));
  assert.ok(invitation.html.includes('Passwort festlegen'));
  const complete = await h.request('/api/auth/complete', { method: 'POST', body: { token, password: 'PersoenlichesTestpasswort2026!' } });
  assert.equal(complete.status, 200); assert.equal(complete.data.galleryId, fixtureIds.gallery);
  assert.equal((await h.request(`/api/galleries/${fixtureIds.gallery}`, { cookie: cookieValue(complete) })).status, 200);
  assert.equal((await h.request('/api/auth/complete', { method: 'POST', body: { token, password: 'EinAnderesTestpasswort2026!' } })).status, 400);
  h.mail.clear();
  assert.equal((await h.request(`${galleryRoute}/invite`, { ...admin, method: 'POST', body: { email: 'new@example.test' } })).status, 200);
  assert.ok(!h.mail.messages[0].text.includes('?token='), 'established accounts get ordinary gallery links');
  assert.equal((await h.DB.prepare('SELECT COUNT(*) AS count FROM auth_tokens').first()).count, 0);
}));

test('expired invitation setup has safe public recovery, and removed memberships cannot redirect completion into a gallery', () => withHarness(async h => {
  const admin = await login(h, true);
  await h.request(`${galleryRoute}/invite`, { ...admin, method: 'POST', body: { email: 'new@example.test' } });
  const expired = tokenFromMail(h.mail.messages.at(-1));
  await h.DB.prepare('UPDATE auth_tokens SET expires_at=?').bind(Date.now() - 1).run();
  assert.equal((await h.request('/api/auth/complete', { method: 'POST', body: { token: expired, password: 'NeuesTestpasswort2026!' } })).status, 400);
  const known = await h.request('/api/auth/request', { method: 'POST', body: { email: 'new@example.test', purpose: 'setup', galleryId: fixtureIds.gallery } });
  const unknown = await h.request('/api/auth/request', { method: 'POST', body: { email: 'missing@example.test', purpose: 'setup', galleryId: fixtureIds.gallery } });
  assert.deepEqual(known.data, unknown.data);
  const recovery = tokenFromMail(h.mail.messages.at(-1));
  await h.DB.prepare('DELETE FROM gallery_members WHERE gallery_id=? AND user_id=?').bind(fixtureIds.gallery, fixtureIds.newCustomer).run();
  const completed = await h.request('/api/auth/complete', { method: 'POST', body: { token: recovery, password: 'NeuesTestpasswort2026!' } });
  assert.equal(completed.status, 200); assert.equal(completed.data.galleryId, null);
  assert.equal((await h.request(`/api/galleries/${fixtureIds.gallery}`, { cookie: cookieValue(completed) })).status, 404);
}));

test('manual release is durable on email failure; retries and repeated releases send one notification for new downloads', () => withHarness(async h => {
  const admin = await login(h, true); const customer = await login(h); const send = h.mail.send.bind(h.mail);
  h.mail.send = async message => { if (message.idempotencyKey?.startsWith('download-ready/')) throw new Error('simulated mail failure'); return send(message); };
  const released = await release(h, admin);
  assert.equal(released.status, 200); assert.equal(released.data.notification.status, 'pending');
  assert.equal(released.data.notification.pendingCount, 1);
  assert.equal((await h.request('/api/images/local-image-3?kind=original', customer)).status, 200);
  assert.equal(downloads(h).length, 0);
  assert.equal((await release(h, admin)).status, 200);
  assert.equal((await h.DB.prepare('SELECT COUNT(*) AS count FROM download_notifications').first()).count, 1);
  h.mail.send = send;
  const retried = await h.request(`${galleryRoute}/notifications/retry`, { ...admin, method: 'POST', body: {} });
  assert.equal(retried.data.notification.status, 'sent'); assert.equal(downloads(h).length, 1);
  await release(h, admin); await h.request(`${galleryRoute}/notifications/retry`, { ...admin, method: 'POST', body: {} });
  assert.equal(downloads(h).length, 1, 'no-op retries do not duplicate download notifications');
  await release(h, admin, ['local-image-4']); assert.equal(downloads(h).length, 2, 'new grant produces a new notice');
}));

test('concurrent releases atomically enqueue and deliver one notification', () => withHarness(async h => {
  const admin = await login(h, true);
  const results = await Promise.all([release(h, admin), release(h, admin)]);
  assert.ok(results.every(result => result.status === 200));
  assert.equal((await h.DB.prepare('SELECT COUNT(*) AS count FROM download_notifications').first()).count, 1);
  assert.equal(downloads(h).length, 1);
}));

test('download mail waits for an accessible gallery and never bypasses revoked access', () => withHarness(async h => {
  const admin = await login(h, true); const customer = await login(h);
  await h.DB.prepare('UPDATE galleries SET published=0 WHERE id=?').bind(fixtureIds.gallery).run();
  const released = await release(h, admin);
  assert.equal(released.data.notification.status, 'pending'); assert.equal(downloads(h).length, 0);
  assert.equal((await h.request('/api/images/local-image-3?kind=original', customer)).status, 404);
  await h.DB.prepare('UPDATE galleries SET published=1,expires_at=? WHERE id=?').bind(Date.now() - 1, fixtureIds.gallery).run();
  await h.request(`${galleryRoute}/notifications/retry`, { ...admin, method: 'POST', body: {} }); assert.equal(downloads(h).length, 0);
  await h.DB.prepare('UPDATE galleries SET expires_at=NULL WHERE id=?').bind(fixtureIds.gallery).run();
  await h.DB.prepare('DELETE FROM gallery_members WHERE gallery_id=? AND user_id=?').bind(fixtureIds.gallery, fixtureIds.customer).run();
  await h.request(`${galleryRoute}/notifications/retry`, { ...admin, method: 'POST', body: {} }); assert.equal(downloads(h).length, 0);
  await h.DB.prepare('INSERT INTO gallery_members(gallery_id,user_id) VALUES (?,?)').bind(fixtureIds.gallery, fixtureIds.customer).run();
  await h.request(`${galleryRoute}/notifications/retry`, { ...admin, method: 'POST', body: {} }); assert.equal(downloads(h).length, 1);
}));

test('confirmed payment survives receipt failure while downloads remain gated; recovery sends receipt then one ready email', () => withHarness(async h => {
  const customer = await login(h); const admin = await login(h, true); const created = await order(h, customer); const orderId = created.data.order.id;
  await h.DB.prepare('UPDATE orders SET receipt_sent_at=NULL WHERE id=?').bind(orderId).run();
  const send = h.mail.send.bind(h.mail); h.mail.clear(); h.mail.send = async () => { throw new Error('simulated mail failure'); };
  const paid = await h.request(`/api/admin/orders/${orderId}/paid`, { ...admin, method: 'POST', body: {} });
  assert.equal(paid.status, 200); assert.equal(paid.data.order.status, 'paid'); assert.equal(paid.data.notification.receiptPending, true);
  assert.equal((await h.request('/api/images/local-image-3?kind=original', customer)).status, 403);
  assert.equal((await h.DB.prepare('SELECT COUNT(*) AS count FROM download_notifications').first()).count, 0);
  h.mail.send = send;
  const retry = await h.request(`/api/admin/orders/${orderId}/notifications/retry`, { ...admin, method: 'POST', body: {} });
  assert.equal(retry.status, 200); assert.equal(retry.data.order.receiptSent, true); assert.equal(retry.data.notification.status, 'sent');
  assert.equal(h.mail.messages.length, 2); assert.equal(downloads(h).length, 1);
  assert.equal((await h.request('/api/images/local-image-3?kind=original', customer)).status, 200);
  await h.request(`/api/admin/orders/${orderId}/paid`, { ...admin, method: 'POST', body: {} }); assert.equal(h.mail.messages.length, 2);
}));

test('private PDF invoices are customer-scoped, validated, and attached to the order confirmation only', () => withHarness(async h => {
  const admin = await login(h, true); const customer = await login(h);
  assert.equal((await uploadInvoice(h, customer)).status, 403);
  assert.equal((await uploadInvoice(h, admin, 'not a PDF')).status, 415);
  assert.equal((await uploadInvoice(h, admin, '%PDF-1.4\nother', fixtureIds.secondCustomer)).status, 400);
  assert.equal((await uploadInvoice(h, admin, '%PDF-1.4\n' + 'x'.repeat(5 * 1024 * 1024))).status, 413);
  const created = await uploadInvoice(h, admin); assert.equal(created.status, 201);
  const ownDetail = (await h.request(`/api/galleries/${fixtureIds.gallery}`, customer)).data;
  assert.equal(ownDetail.invoice.id, created.data.invoice.id); assert.ok(!JSON.stringify(ownDetail).includes('invoices/'));
  assert.equal((await h.request(`/api/galleries/${fixtureIds.gallery}/invoice`)).status, 401);
  assert.equal((await h.request(`/api/galleries/${fixtureIds.gallery}/invoice?userId=${fixtureIds.newCustomer}`, customer)).status, 403);
  const downloaded = await h.request(ownDetail.invoice.url, customer); assert.equal(downloaded.status, 200);
  assert.equal(downloaded.response.headers.get('content-type'), 'application/pdf'); assert.ok(downloaded.response.headers.get('cache-control').includes('no-store'));
  assert.equal(await downloaded.text(), '%PDF-1.4\nLOCAL INVOICE A\n%%EOF');
  const ordered = await order(h, customer); assert.equal(ordered.status, 201);
  const confirmation = h.mail.messages.find(message => message.idempotencyKey?.startsWith('order-receipt/'));
  const attached = confirmation.attachments.find(attachment => attachment.content_type === 'application/pdf');
  assert.equal(Buffer.from(attached.content, 'base64').toString(), '%PDF-1.4\nLOCAL INVOICE A\n%%EOF');
  assert.ok(confirmation.text.includes('Rechnung'));
  await release(h, admin);
  assert.equal(downloads(h)[0].attachments?.length || 0, 0, 'download-ready email contains no invoice PDF');
  await h.request(`${galleryRoute}/invoice`, { ...admin, method: 'DELETE', body: { userId: fixtureIds.customer } });
  assert.equal((await h.request(ownDetail.invoice.url, customer)).status, 404);
}));

test('pending order confirmation retains its original immutable invoice PDF across replacement and resend', () => withHarness(async h => {
  const admin = await login(h, true); const customer = await login(h); const firstPdf = '%PDF-1.4\nINVOICE ORIGINAL\n%%EOF'; const replacementPdf = '%PDF-1.4\nINVOICE REPLACEMENT\n%%EOF';
  await uploadInvoice(h, admin, firstPdf);
  const original = await h.DB.prepare('SELECT * FROM gallery_invoices').first();
  const send = h.mail.send.bind(h.mail); h.mail.send = async () => { throw new Error('simulated mail failure'); };
  assert.equal((await order(h, customer)).status, 500);
  const pending = await h.DB.prepare('SELECT * FROM orders').first();
  const pdfSnapshot = JSON.parse(pending.receipt_email_json).files.find(file => file.content_type === 'application/pdf');
  await uploadInvoice(h, admin, replacementPdf);
  assert.equal(await h.PHOTOS.head(original.r2_key), null, 'replaced gallery PDF is cleaned after copying its order snapshot');
  assert.ok(await h.PHOTOS.head(pdfSnapshot.key), 'pending order preserves its private immutable PDF snapshot');
  h.mail.send = send;
  assert.equal((await order(h, customer)).status, 201);
  const confirmed = h.mail.messages.find(message => message.idempotencyKey?.startsWith('order-receipt/'));
  assert.equal(Buffer.from(confirmed.attachments.find(file => file.content_type === 'application/pdf').content, 'base64').toString(), firstPdf);
  await h.request(`/api/admin/orders/${pending.id}/receipt`, { ...admin, method: 'POST', body: {} });
  assert.equal(Buffer.from(h.mail.messages.at(-1).attachments.find(file => file.content_type === 'application/pdf').content, 'base64').toString(), firstPdf);
  assert.ok(await h.PHOTOS.head(pdfSnapshot.key), 'retained confirmation can be resent without replacing the old invoice');
  const current = await h.DB.prepare('SELECT * FROM gallery_invoices').first(); assert.ok(await h.PHOTOS.head(current.r2_key));
}));

test('manual release of files already accessible through payment produces no second ready email', () => withHarness(async h => {
  const admin = await login(h, true); const customer = await login(h); const created = await order(h, customer);
  await h.request(`/api/admin/orders/${created.data.order.id}/paid`, { ...admin, method: 'POST', body: {} }); assert.equal(downloads(h).length, 1);
  await release(h, admin); assert.equal(downloads(h).length, 1);
  assert.equal((await h.DB.prepare('SELECT COUNT(*) AS count FROM download_notifications').first()).count, 1);
}));

test('appearance controls preserve safe defaults and validate enum, integer, and boolean values', () => withHarness(async h => {
  const admin = await login(h, true);
  const initial = (await h.request(galleryRoute, admin)).data.gallery;
  assert.deepEqual([initial.coverLayout, initial.coverHeight, initial.gridDensity, initial.gridGap, initial.showFilenames], ['overlay', 'standard', 'comfortable', 16, false]);
  const body = { coverLayout: 'editorial', coverHeight: 'large', gridDensity: 'spacious', gridGap: 40, showFilenames: true };
  const changed = await h.request(galleryRoute, { ...admin, method: 'PATCH', body }); assert.equal(changed.status, 200);
  for (const [key, value] of Object.entries(body)) assert.equal(changed.data.gallery[key], value);
  for (const invalid of [{ coverLayout: 'bogus' }, { coverHeight: 'giant' }, { gridDensity: 'tight' }, { gridGap: 7 }, { gridGap: 41 }, { gridGap: 8.5 }, { gridGap: '16' }, { showFilenames: 1 }]) assert.equal((await h.request(galleryRoute, { ...admin, method: 'PATCH', body: invalid })).status, 400);
  assert.equal((await h.request(galleryRoute, { ...admin, method: 'PATCH', body: { name: 'Andere Beschreibung' } })).data.gallery.coverLayout, 'editorial');
}));

test('image ordering requires the exact full gallery set, stays within D1 bind limits, and uploads append after reordered positions', () => withHarness(async h => {
  const admin = await login(h, true); const customer = await login(h);
  const route = `${galleryRoute}/images/order`;
  const allImages = (await h.request(galleryRoute, admin)).data.images.map(image => image.id);
  assert.equal((await h.request(route, { ...customer, method: 'POST', body: { imageIds: allImages } })).status, 403);
  for (const imageIds of [allImages.slice(1), [...allImages, allImages[0]], [...allImages.slice(1), 'local-foreign-image']]) assert.equal((await h.request(route, { ...admin, method: 'POST', body: { imageIds } })).status, 400);
  const reversed = [...allImages].reverse(); const saved = await h.request(route, { ...admin, method: 'POST', body: { imageIds: reversed } });
  assert.equal(saved.status, 200); assert.deepEqual(saved.data.images.map(image => image.id), reversed); assert.deepEqual(saved.data.images.map(image => image.position), reversed.map((_, index) => index));
  const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aVxIAAAAASUVORK5CYII=', 'base64');
  const form = new FormData(); form.set('title', 'Append'); form.set('width', '1'); form.set('height', '1'); form.set('preview', new Blob([pixel]), 'preview.png'); form.set('original', new Blob([pixel]), 'original.png');
  const added = await h.request(`${galleryRoute}/images`, { ...admin, method: 'POST', body: form }); assert.equal(added.status, 201); assert.equal(added.data.image.position, allImages.length);
  for (let index = 0; index < 120; index++) await h.DB.prepare('INSERT INTO images(id,gallery_id,title,preview_key,original_key,preview_type,original_type,width,height,position,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(`reorder-${index}`, fixtureIds.gallery, `Order ${index}`, `order/p/${index}`, `order/o/${index}`, 'image/png', 'image/png', 1, 1, index + 100, Date.now()).run();
  const expanded = (await h.request(galleryRoute, admin)).data.images.map(image => image.id).reverse();
  assert.equal((await h.request(route, { ...admin, method: 'POST', body: { imageIds: expanded } })).status, 200);
}));

test('the old production schema still supports release/payment and additive migration preserves customer data', () => withHarness(async h => {
  await h.DB.exec('DROP TABLE download_notifications; DROP TABLE gallery_invoices; ALTER TABLE auth_tokens DROP COLUMN gallery_id; ALTER TABLE orders DROP COLUMN receipt_email_json; ALTER TABLE galleries DROP COLUMN cover_layout; ALTER TABLE galleries DROP COLUMN cover_height; ALTER TABLE galleries DROP COLUMN grid_density; ALTER TABLE galleries DROP COLUMN grid_gap; ALTER TABLE galleries DROP COLUMN show_filenames;');
  const admin = await login(h, true); const customer = await login(h);
  assert.equal((await h.request(galleryRoute, admin)).data.gallery.gridGap, 16);
  assert.equal((await h.request(galleryRoute, { ...admin, method: 'PATCH', body: { name: 'Vor Migration' } })).status, 200);
  assert.equal((await h.request(galleryRoute, { ...admin, method: 'PATCH', body: { gridGap: 20 } })).status, 503);
  const released = await release(h, admin); assert.equal(released.status, 200); assert.equal(released.data.notification.status, 'unavailable');
  assert.equal((await h.request('/api/images/local-image-3?kind=original', customer)).status, 200);
  const oldOrder = await order(h, customer); assert.equal(oldOrder.status, 201);
  const oldPaid = await h.request(`/api/admin/orders/${oldOrder.data.order.id}/paid`, { ...admin, method: 'POST', body: {} });
  assert.equal(oldPaid.status, 200); assert.equal(oldPaid.data.order.status, 'paid'); assert.equal(oldPaid.data.notification.status, 'unavailable');
  const before = await h.DB.prepare('SELECT COUNT(*) AS count FROM users').first();
  await h.DB.exec(await readFile(new URL('../backend/migrations/2026-10-08-gallery-upgrades.sql', import.meta.url), 'utf8'));
  assert.equal((await h.DB.prepare('SELECT COUNT(*) AS count FROM users').first()).count, before.count);
  assert.equal((await h.request(galleryRoute, { ...admin, method: 'PATCH', body: { gridGap: 20 } })).status, 200);
  assert.equal((await release(h, admin, ['local-image-4'])).data.notification.status, 'sent');
}));

test('scheduled retries deliver a failed notice once without changing the grant', () => withHarness(async h => {
  const admin = await login(h, true); const send = h.mail.send.bind(h.mail); h.mail.send = async () => { throw new Error('simulated mail failure'); };
  await release(h, admin); h.mail.send = send;
  await h.DB.prepare('UPDATE download_notifications SET next_attempt_at=0').run();
  await worker.scheduled({}, h.env); assert.equal(downloads(h).length, 1);
  await worker.scheduled({}, h.env); assert.equal(downloads(h).length, 1);
}));

test('ambiguous accepted download mail retries use an identical persisted provider payload despite later edits', () => withHarness(async h => {
  const admin = await login(h, true); const send = h.mail.send.bind(h.mail); const accepted = new Map();
  h.env.EMAIL_FROM = 'Original Sender <original@example.test>';
  await uploadInvoice(h, admin);
  h.mail.send = async message => {
    const serialized = JSON.stringify(message);
    if (!accepted.has(message.idempotencyKey)) { accepted.set(message.idempotencyKey, serialized); throw new Error('provider accepted but response was lost'); }
    assert.equal(serialized, accepted.get(message.idempotencyKey), 'stable idempotency key always has exactly the same request body');
    return send(message);
  };
  const released = await release(h, admin); assert.equal(released.data.notification.status, 'pending');
  await h.DB.prepare('UPDATE galleries SET name=? WHERE id=?').bind('Changed Gallery', fixtureIds.gallery).run();
  await h.DB.prepare('UPDATE users SET name=?,email=? WHERE id=?').bind('Changed Customer', 'changed@example.test', fixtureIds.customer).run();
  h.env.BUSINESS_NAME = 'Changed Business'; h.env.EMAIL_FROM = 'Changed Sender <changed@example.test>';
  await uploadInvoice(h, admin, '%PDF-1.4\nNEW INVOICE\n%%EOF');
  const retried = await h.request(`${galleryRoute}/notifications/retry`, { ...admin, method: 'POST', body: {} });
  assert.equal(retried.data.notification.status, 'sent'); assert.equal(downloads(h).length, 1);
  assert.equal(downloads(h)[0].to, 'customer@example.test'); assert.equal(downloads(h)[0].from, 'Original Sender <original@example.test>');
}));

test('ambiguous contract mail retries freeze sender, customer, summary and attachment before a later payment confirmation', () => withHarness(async h => {
  const admin = await login(h, true); const customer = await login(h); const send = h.mail.send.bind(h.mail); let accepted;
  h.env.EMAIL_FROM = 'Original Sender <original@example.test>';
  h.mail.send = async message => {
    if (!message.idempotencyKey?.startsWith('order-receipt/')) return send(message);
    if (!accepted) { accepted = JSON.stringify(message); throw new Error('provider accepted but response was lost'); }
    assert.equal(JSON.stringify(message), accepted, 'later paid status and edited fields cannot change an existing receipt payload');
    return send(message);
  };
  assert.equal((await order(h, customer)).status, 500);
  const saved = await h.DB.prepare('SELECT * FROM orders').first(); assert.ok(saved.receipt_email_json); assert.equal(saved.receipt_sent_at, null);
  await h.DB.prepare('UPDATE galleries SET name=? WHERE id=?').bind('Changed Gallery', fixtureIds.gallery).run();
  await h.DB.prepare('UPDATE users SET name=?,email=? WHERE id=?').bind('Changed Customer', 'changed@example.test', fixtureIds.customer).run();
  h.env.BANK_RECIPIENT = 'Changed Bank Recipient'; h.env.EMAIL_FROM = 'Changed Sender <changed@example.test>'; h.env.BUSINESS_NAME = 'Changed Business';
  const confirmed = await h.request(`/api/admin/orders/${saved.id}/paid`, { ...admin, method: 'POST', body: {} });
  assert.equal(confirmed.status, 200); assert.equal(confirmed.data.order.receiptSent, true);
  assert.equal(h.mail.messages.filter(message => message.idempotencyKey.startsWith('order-receipt/')).length, 1);
  assert.equal(downloads(h).length, 1);
}));

test('overlapping invoice replacements use a compare-and-swap and clean the losing upload', () => withHarness(async h => {
  const admin = await login(h, true); await uploadInvoice(h, admin, '%PDF-1.4\nORIGINAL\n%%EOF');
  const put = h.PHOTOS.put.bind(h.PHOTOS); const candidateKeys = []; let entered; let unblock;
  const blocked = new Promise(resolve => { unblock = resolve; }); const started = new Promise(resolve => { entered = resolve; }); let first = true;
  h.PHOTOS.put = async (key, content, options) => {
    candidateKeys.push(key);
    if (first) { first = false; entered(); await blocked; }
    return put(key, content, options);
  };
  const later = uploadInvoice(h, admin, '%PDF-1.4\nBLOCKED SECOND\n%%EOF');
  await started;
  const winner = await uploadInvoice(h, admin, '%PDF-1.4\nWINNING FIRST\n%%EOF'); assert.equal(winner.status, 201);
  unblock(); assert.equal((await later).status, 409);
  const current = await h.DB.prepare('SELECT * FROM gallery_invoices').first(); assert.equal(current.id, winner.data.invoice.id);
  for (const key of candidateKeys) assert.equal(Boolean(await h.PHOTOS.head(key)), key === current.r2_key);
}));

test('member removal cancels unsent notifications and preserves administrator invoice access', () => withHarness(async h => {
  const admin = await login(h, true); const customer = await login(h);
  await uploadInvoice(h, admin); const original = await h.DB.prepare('SELECT * FROM gallery_invoices').first();
  h.mail.send = async () => { throw new Error('simulated mail failure'); }; await release(h, admin);
  const replacement = await uploadInvoice(h, admin, '%PDF-1.4\nREPLACEMENT\n%%EOF'); assert.equal(replacement.status, 201);
  assert.equal(await h.PHOTOS.head(original.r2_key), null);
  const removed = await h.request(`${galleryRoute}/members/${fixtureIds.customer}`, { ...admin, method: 'DELETE', body: {} }); assert.equal(removed.status, 200);
  assert.equal(await h.PHOTOS.head(original.r2_key), null);
  const notification = await h.DB.prepare('SELECT * FROM download_notifications').first(); assert.ok(notification.cancelled_at); assert.equal(notification.sent_at, null);
  assert.equal((await h.request(galleryRoute, admin)).data.notificationStatus.status, 'none');
  assert.equal((await h.request(replacement.data.invoice.url, admin)).status, 200);
  assert.equal((await h.request(`/api/galleries/${fixtureIds.gallery}/invoice`, customer)).status, 404);
  assert.equal((await h.request(`${galleryRoute}/invoice`, { ...admin, method: 'DELETE', body: { userId: fixtureIds.customer } })).status, 200);
}));

test('a later invoice is never silently added to an existing order confirmation snapshot', () => withHarness(async h => {
  const admin = await login(h, true); const customer = await login(h);
  await uploadInvoice(h, admin, '%PDF-1.4\nOTHER CUSTOMER ONLY\n%%EOF', fixtureIds.newCustomer);
  const created = await order(h, customer); assert.equal(created.status, 201);
  const first = h.mail.messages.at(-1); assert.equal(first.attachments.length, 1, 'another gallery member invoice is not attached');
  await uploadInvoice(h, admin);
  await h.request(`/api/admin/orders/${created.data.order.id}/receipt`, { ...admin, method: 'POST', body: {} });
  assert.deepEqual(h.mail.messages.at(-1).attachments, first.attachments, 'later upload cannot change old order attachments');
}));

test('failed receipt snapshot persistence removes candidate R2 objects without losing the stored contract', () => withHarness(async h => {
  const customer = await login(h); const prepare = h.DB.prepare.bind(h.DB); const put = h.PHOTOS.put.bind(h.PHOTOS); const candidates = []; let failOnce = true;
  h.PHOTOS.put = async (key, bytes, options) => { if (key.startsWith('order-confirmations/')) candidates.push(key); return put(key, bytes, options); };
  h.DB.prepare = sql => {
    const query = prepare(sql); const bind = query.bind.bind(query);
    query.bind = (...values) => {
      const bound = bind(...values);
      if (sql.startsWith('UPDATE orders SET receipt_email_json') && failOnce) { failOnce = false; bound.first = async () => { throw new Error('simulated database write failure'); }; }
      return bound;
    };
    return query;
  };
  assert.equal((await order(h, customer)).status, 500);
  assert.ok((await h.DB.prepare('SELECT receipt_text FROM orders').first()).receipt_text);
  for (const key of candidates) assert.equal(await h.PHOTOS.head(key), null);
  assert.equal((await order(h, customer)).status, 201, 'normal retry completes the same pending order');
}));

test('invoice deletion cleans the actual removed PDF if another upload replaces the earlier read', () => withHarness(async h => {
  const admin = await login(h, true); await uploadInvoice(h, admin);
  const prepare = h.DB.prepare.bind(h.DB); let entered; let unblock; let pauseOnce = true;
  const started = new Promise(resolve => { entered = resolve; }); const barrier = new Promise(resolve => { unblock = resolve; });
  h.DB.prepare = sql => {
    const query = prepare(sql); const bind = query.bind.bind(query);
    query.bind = (...values) => {
      const bound = bind(...values);
      if (sql.startsWith('SELECT * FROM gallery_invoices WHERE gallery_id=') && pauseOnce) {
        pauseOnce = false; const first = bound.first.bind(bound);
        bound.first = async () => { const record = await first(); entered(); await barrier; return record; };
      }
      return bound;
    };
    return query;
  };
  const deletion = h.request(`${galleryRoute}/invoice`, { ...admin, method: 'DELETE', body: { userId: fixtureIds.customer } });
  await started;
  const replacement = await uploadInvoice(h, admin, '%PDF-1.4\nRACING REPLACEMENT\n%%EOF'); assert.equal(replacement.status, 201);
  const current = await h.DB.prepare('SELECT r2_key FROM gallery_invoices').first(); unblock();
  assert.equal((await deletion).status, 200);
  assert.equal((await h.DB.prepare('SELECT COUNT(*) AS count FROM gallery_invoices').first()).count, 0);
  assert.equal(await h.PHOTOS.head(current.r2_key), null, 'DELETE RETURNING identifies and cleans the real displaced PDF');
}));
