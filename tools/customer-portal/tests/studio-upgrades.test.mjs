import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHarness, cookieValue, fixtureIds } from './harness.mjs';

async function withHarness(callback) { const h = await createHarness(); try { await callback(h); } finally { await h.close(); } }
async function login(h, admin = false) {
  const result = await h.request('/api/auth/login', { method: 'POST', body: { email: admin ? 'emina@example.test' : 'customer@example.test', password: admin ? 'Testverwaltung2026!' : 'Testgalerie2026!' } });
  assert.equal(result.status, 200); return { cookie: cookieValue(result), csrf: result.data.csrf };
}
const galleryRoute = `/api/admin/galleries/${fixtureIds.gallery}`;
const imageRoute = `${galleryRoute}/images/local-image-3`;
const setSettings = (h, admin, body) => h.request('/api/admin/settings', { ...admin, method: 'PATCH', body });
const order = (h, customer, imageId = 'local-image-3') => h.request('/api/orders', { ...customer, method: 'POST', body: { galleryId: fixtureIds.gallery, imageIds: [imageId], packageId: fixtureIds.singlePackage, paymentMethod: 'transfer', termsAccepted: true, digitalConsent:true,earlyStartConsent:true,consentVersion:'portal-digital-2026-10-19-consent-v4',consentLanguage:'de' } });
function imageBlob(text) { return new Blob([new Uint8Array([0xff, 0xd8, 0xff]), text], { type: 'image/jpeg' }); }
function previews(fingerprint, withProtected = true, original = false) {
  const form = new FormData(); form.set('preview', imageBlob('CLEAN-REDUCED'), 'preview.jpg');
  if (withProtected) form.set('protectedPreview', imageBlob('WATERMARK-REDUCED'), 'protected.jpg');
  if (fingerprint) form.set('watermarkFingerprint', fingerprint);
  if (original) { form.set('original', imageBlob('HIGH-RES-ORIGINAL'), 'Original.jpg'); form.set('width', '4000'); form.set('height', '3000'); form.set('title', 'Testfoto'); }
  return form;
}
const fingerprint = async (h, admin) => (await h.request(galleryRoute, admin)).data.previewSettings.fingerprint;

test('global and gallery appearance settings roundtrip, validate safely, and email custom text is escaped', () => withHarness(async h => {
  const admin = await login(h, true);
  assert.equal((await h.request('/api/admin/settings', admin)).data.settings.watermark.enabled, false);
  const changed = await setSettings(h, admin, { watermark: { enabled: true, text: 'Mein Studio', size: 32, opacity: 0.25, position: 'center' }, emails: { invite: { subject: 'Deine fertige Galerie', intro: '<b>Persönlicher Text</b>' } } });
  assert.equal(changed.status, 200);
  assert.equal(changed.data.settings.watermark.text, 'Mein Studio');
  for (const body of [{ watermark: { enabled: 'true' } }, { watermark: { size: 0 } }, { watermark: { opacity: 0 } }, { watermark: { text: '' } }, { watermark: { position: 'unknown' } }, { emails: { order: { html: '<script>' } } }, { emails: { order: { subject: 'one\ntwo' } } }]) assert.equal((await setSettings(h, admin, body)).status, 400);
  const gallery = await h.request(galleryRoute, { ...admin, method: 'PATCH', body: { watermarkMode: 'off', typography: 'sans', coverDecoration: 'frame' } });
  assert.equal(gallery.status, 200); assert.equal(gallery.data.gallery.watermarkMode, 'off'); assert.equal(gallery.data.gallery.coverDecoration, 'frame');
  assert.equal((await h.request(galleryRoute, admin)).data.previewSettings.enabled, false);
  assert.equal((await h.request(galleryRoute, { ...admin, method: 'PATCH', body: { typography: 'comic' } })).status, 400);
  await h.request(`${galleryRoute}/invite`, { ...admin, method: 'POST', body: { email: 'new@example.test' } });
  assert.equal(h.mail.messages.at(-1).subject, 'Deine fertige Galerie');
  assert.ok(h.mail.messages.at(-1).html.includes('&lt;b&gt;Persönlicher Text&lt;/b&gt;'));
}));

test('protected preview regeneration never exposes clean or original bytes until release; stale versions fail closed', () => withHarness(async h => {
  const admin = await login(h, true); const customer = await login(h);
  await setSettings(h, admin, { watermark: { enabled: true } });
  const blocked = await h.request('/api/images/local-image-3?kind=preview', customer);
  assert.equal(blocked.status, 200); assert.equal(blocked.response.headers.get('X-LiZa-Preview'), 'pending');
  assert.ok(!(await blocked.text()).includes('local-image-fixture'));
  const fp = await fingerprint(h, admin);
  assert.equal((await h.request(`${imageRoute}/previews`, { ...admin, method: 'POST', body: previews(fp, false) })).status, 400);
  assert.equal((await h.request(`${imageRoute}/previews`, { ...admin, method: 'POST', body: previews('wrong') })).status, 409);
  assert.equal((await h.request(`${imageRoute}/previews`, { ...admin, method: 'POST', body: previews(fp) })).status, 200);
  assert.ok((await (await h.request('/api/images/local-image-3?kind=preview', customer)).text()).includes('WATERMARK-REDUCED'));
  assert.ok((await (await h.request('/api/images/local-image-3?kind=preview', admin)).text()).includes('CLEAN-REDUCED'));
  assert.equal((await h.request('/api/images/local-image-3?kind=original', customer)).status, 403);
  await setSettings(h, admin, { watermark: { text: 'New text' } });
  assert.equal((await h.request('/api/images/local-image-3?kind=preview', customer)).response.headers.get('X-LiZa-Preview'), 'pending');
  await h.request(`${galleryRoute}/release`, { ...admin, method: 'POST', body: { userId: fixtureIds.customer, imageIds: ['local-image-3'] } });
  assert.ok((await (await h.request('/api/images/local-image-3?kind=preview', customer)).text()).includes('CLEAN-REDUCED'));
  assert.equal(await (await h.request('/api/images/local-image-3?kind=original', customer)).text(), 'local-image-fixture-3');
}));

test('admins can inspect current protected previews while missing and stale versions fail closed and originals remain unchanged', () => withHarness(async h => {
  const admin = await login(h, true); const customer = await login(h);
  await setSettings(h, admin, { watermark: { enabled: true } });
  const previewUrl = '/api/images/local-image-3?kind=preview&watermark=1';
  const pending = await h.request(previewUrl, admin);
  assert.equal(pending.status, 200); assert.equal(pending.response.headers.get('X-LiZa-Preview'), 'pending');
  assert.doesNotMatch(await pending.text(), /local-image-fixture|CLEAN-REDUCED/);
  await h.request(`${imageRoute}/previews`, { ...admin, method: 'POST', body: previews(await fingerprint(h, admin)) });
  const protectedImage = await h.request(previewUrl, admin);
  assert.equal(protectedImage.status, 200); assert.match(await protectedImage.text(), /WATERMARK-REDUCED/);
  assert.match(protectedImage.response.headers.get('Cache-Control'), /private, no-store/);
  const head = await h.request(previewUrl, { ...admin, method: 'HEAD' });
  assert.equal(head.status, 200); assert.equal(head.response.headers.get('Content-Type'), 'image/jpeg'); assert.equal(await head.text(), '');
  assert.match(await (await h.request('/api/images/local-image-3?kind=preview', admin)).text(), /CLEAN-REDUCED/);
  assert.equal(await (await h.request('/api/images/local-image-3?kind=original&watermark=1', admin)).text(), 'local-image-fixture-3');
  assert.equal((await h.request('/api/images/local-image-3?kind=original&watermark=1', customer)).status, 403);
  await setSettings(h, admin, { watermark: { text: 'Ein neues Wasserzeichen' } });
  const stale = await h.request(previewUrl, admin);
  assert.equal(stale.response.headers.get('X-LiZa-Preview'), 'pending');
  assert.doesNotMatch(await stale.text(), /WATERMARK-REDUCED|CLEAN-REDUCED/);
  await h.request(galleryRoute, { ...admin, method: 'PATCH', body: { watermarkMode: 'off' } });
  const disabled = await h.request(previewUrl, admin);
  assert.equal(disabled.response.headers.get('X-LiZa-Preview'), null); assert.match(await disabled.text(), /CLEAN-REDUCED/);
  assert.equal((await h.request('/api/images/local-image-3?kind=original', customer)).status, 403);
}));

test('admin metadata follows each gallery watermark mode and customer-view image and cover URLs inspect actual protected previews', () => withHarness(async h => {
  const admin = await login(h, true); const customer = await login(h);
  await setSettings(h, admin, { watermark: { enabled: true } });
  await h.request(`/api/admin/galleries/${fixtureIds.otherGallery}`, { ...admin, method: 'PATCH', body: { watermarkMode: 'off' } });
  await h.request(`/api/admin/galleries/${fixtureIds.expiredGallery}`, { ...admin, method: 'PATCH', body: { watermarkMode: 'on' } });
  await h.request(`${imageRoute}/previews`, { ...admin, method: 'POST', body: previews(await fingerprint(h, admin)) });
  await h.DB.prepare('UPDATE galleries SET cover_image_id=? WHERE id=?').bind('local-image-3', fixtureIds.gallery).run();
  const detail = (await h.request(galleryRoute, admin)).data;
  const image = detail.images.find(value => value.id === 'local-image-3');
  assert.equal(image.previewUrl, '/api/images/local-image-3?kind=preview');
  assert.equal(image.protectedPreviewUrl, '/api/images/local-image-3?kind=preview&watermark=1');
  assert.equal(image.watermarkEnabled, true); assert.equal(image.protectedPreviewReady, true);
  assert.equal(image.downloadAllowed, true);
  const library = (await h.request('/api/admin/images', admin)).data.images;
  assert.equal(library.find(value => value.id === 'local-image-3').watermarkEnabled, true);
  assert.equal(library.find(value => value.id === 'local-image-3').protectedPreviewReady, true);
  assert.equal(library.find(value => value.id === 'local-foreign-image').watermarkEnabled, false);
  assert.equal(library.find(value => value.id === 'local-expired-image').watermarkEnabled, true);
  assert.ok(library.every(value => value.protectedPreviewUrl.endsWith('&watermark=1')));
  const customerView = (await h.request(`/api/galleries/${fixtureIds.gallery}?customerView=1`, admin)).data;
  assert.equal(customerView.gallery.coverUrl, image.protectedPreviewUrl);
  assert.equal(customerView.images.find(value => value.id === image.id).previewUrl, image.protectedPreviewUrl);
  assert.ok(customerView.images.every(value => value.downloadAllowed === false));
  assert.match(await (await h.request(customerView.gallery.coverUrl, admin)).text(), /WATERMARK-REDUCED/);
  const actualCustomer = (await h.request(`/api/galleries/${fixtureIds.gallery}?customerView=1`, customer)).data;
  assert.ok(actualCustomer.images.every(value => !('protectedPreviewUrl' in value) && !('watermarkEnabled' in value)));
  assert.equal(actualCustomer.previewSettings, undefined); assert.equal(actualCustomer.members, undefined);
  await setSettings(h, admin, { watermark: { enabled: false } });
  const changedLibrary = (await h.request('/api/admin/images', admin)).data.images;
  assert.equal(changedLibrary.find(value => value.id === 'local-image-3').watermarkEnabled, false);
  assert.equal(changedLibrary.find(value => value.id === 'local-foreign-image').watermarkEnabled, false);
  assert.equal(changedLibrary.find(value => value.id === 'local-expired-image').watermarkEnabled, true);
}));

test('new uploads require a current protected preview when enabled and preserve separate originals', () => withHarness(async h => {
  const admin = await login(h, true); const customer = await login(h);
  await h.request(galleryRoute, { ...admin, method: 'PATCH', body: { watermarkMode: 'on' } });
  const fp = await fingerprint(h, admin);
  assert.equal((await h.request(`${galleryRoute}/images`, { ...admin, method: 'POST', body: previews(fp, false, true) })).status, 400);
  const created = await h.request(`${galleryRoute}/images`, { ...admin, method: 'POST', body: previews(fp, true, true) });
  assert.equal(created.status, 201); assert.equal(created.data.image.protectedPreviewReady, true);
  const image = created.data.image;
  assert.ok((await (await h.request(image.previewUrl, customer)).text()).includes('WATERMARK-REDUCED'));
  assert.ok((await (await h.request(image.originalUrl, admin)).text()).includes('HIGH-RES-ORIGINAL'));
  assert.equal((await h.request(image.originalUrl, customer)).status, 403);
}));

test('readable payment references are unique and consistent while legacy references and frozen receipts remain unchanged', () => withHarness(async h => {
  const admin = await login(h, true); const customer = await login(h);
  const first = await order(h, customer); const second = await order(h, customer, 'local-image-4');
  assert.equal(first.status, 201); assert.match(first.data.reference, /^LZ-[A-F0-9]{12}$/);
  assert.equal(first.data.reference, first.data.order.reference); assert.notEqual(first.data.reference, second.data.reference);
  const saved = await h.DB.prepare('SELECT * FROM orders WHERE id=?').bind(first.data.order.id).first();
  assert.ok(saved.receipt_text.includes(`Zahlungsreferenz: ${first.data.reference}`));
  assert.ok(JSON.parse(saved.receipt_email_json).message.html.includes(first.data.reference));
  const repeated = await order(h, customer); assert.equal(repeated.data.order.id, first.data.order.id); assert.equal(repeated.data.reference, first.data.reference);
  const legacyId = second.data.order.id;
  await h.DB.prepare('UPDATE orders SET payment_reference=NULL WHERE id=?').bind(legacyId).run();
  const legacy = (await h.request('/api/orders', customer)).data.orders.find(value => value.id === legacyId);
  assert.equal(legacy.reference, legacyId);
  await setSettings(h, admin, { emails: { order: { subject: 'New subject', intro: 'New text' } } });
  await h.request(`/api/admin/orders/${saved.id}/receipt`, { ...admin, method: 'POST', body: {} });
  const resent = h.mail.messages.at(-1);
  assert.equal(resent.subject, JSON.parse(saved.receipt_email_json).message.subject);
  assert.equal(resent.html, JSON.parse(saved.receipt_email_json).message.html);
}));

test('invoice download in orders returns the immutable purchased PDF after gallery invoice replacement or membership removal', () => withHarness(async h => {
  const admin = await login(h, true); const customer = await login(h);
  async function invoice(contents) { const form = new FormData(); form.set('userId', fixtureIds.customer); form.set('file', new Blob([contents], { type: 'application/pdf' }), 'Rechnung.pdf'); return h.request(`${galleryRoute}/invoice`, { ...admin, method: 'POST', body: form }); }
  assert.equal((await invoice('%PDF-1.4\nFIRST INVOICE\n%%EOF')).status, 201);
  const created = await order(h, customer); const url = created.data.order.invoiceUrl;
  assert.equal(url, `/api/orders/${created.data.order.id}/invoice`);
  await invoice('%PDF-1.4\nREPLACEMENT INVOICE\n%%EOF');
  await h.DB.prepare('DELETE FROM gallery_members WHERE gallery_id=? AND user_id=?').bind(fixtureIds.gallery, fixtureIds.customer).run();
  const downloaded = await h.request(url, customer);
  assert.equal(downloaded.status, 200); assert.equal(await downloaded.text(), '%PDF-1.4\nFIRST INVOICE\n%%EOF');
  assert.match(downloaded.response.headers.get('Cache-Control'), /no-store/);
  assert.equal((await h.request(url)).status, 401);
}));

test('paid action releases originals, clears watermark for that buyer and sends one download email', () => withHarness(async h => {
  const admin = await login(h, true); const customer = await login(h);
  await setSettings(h, admin, { watermark: { enabled: true } });
  const created = await order(h, customer);
  const paid = await h.request(`/api/admin/orders/${created.data.order.id}/paid`, { ...admin, method: 'POST', body: {} });
  assert.equal(paid.status, 200); assert.equal(paid.data.order.status, 'paid'); assert.equal(paid.data.notification.status, 'sent');
  assert.equal((await h.request('/api/images/local-image-3?kind=original', customer)).status, 200);
  assert.equal(await (await h.request('/api/images/local-image-3?kind=preview', customer)).text(), 'local-image-fixture-3');
  assert.equal(await (await h.request('/api/images/local-image-3?kind=preview&watermark=1', customer)).text(), 'local-image-fixture-3');
  assert.equal(h.mail.messages.filter(message => message.idempotencyKey?.startsWith('download-ready/')).length, 1);
  await h.request(`/api/admin/orders/${created.data.order.id}/paid`, { ...admin, method: 'POST', body: {} });
  assert.equal(h.mail.messages.filter(message => message.idempotencyKey?.startsWith('download-ready/')).length, 1);
}));

test('image rename and library work, deleting unordered photos removes objects, and ordered photos are retained', () => withHarness(async h => {
  const admin = await login(h, true); const customer = await login(h);
  assert.equal((await h.request(imageRoute, { ...admin, method: 'PATCH', body: { title: 'Neuer Name' } })).status, 200);
  const library = (await h.request('/api/admin/images', admin)).data.images;
  assert.equal(library.find(image => image.id === 'local-image-3').title, 'Neuer Name');
  assert.equal(library.find(image => image.id === 'local-image-3').galleryId, fixtureIds.gallery);
  const image = await h.DB.prepare('SELECT * FROM images WHERE id=?').bind('local-image-3').first();
  await order(h, customer);
  assert.equal((await h.request(imageRoute, { ...admin, method: 'DELETE' })).status, 409);
  assert.ok(await h.PHOTOS.get(image.original_key));
  const other = await h.DB.prepare('SELECT * FROM images WHERE id=?').bind('local-image-8').first();
  assert.equal((await h.request(`${galleryRoute}/images/local-image-8`, { ...admin, method: 'DELETE' })).status, 200);
  assert.equal(await h.PHOTOS.get(other.original_key), null); assert.equal(await h.PHOTOS.get(other.preview_key), null);
}));

test('9 October migration upgrades the actual previous schema without altering customer data or old order references', () => withHarness(async h => {
  await h.DB.exec('DROP TABLE portal_settings; DROP TABLE customer_activity; DROP INDEX orders_payment_reference; ALTER TABLE orders DROP COLUMN payment_reference; ALTER TABLE galleries DROP COLUMN watermark_mode; ALTER TABLE galleries DROP COLUMN typography; ALTER TABLE galleries DROP COLUMN cover_decoration; ALTER TABLE images DROP COLUMN protected_preview_key; ALTER TABLE images DROP COLUMN protected_preview_type; ALTER TABLE images DROP COLUMN watermark_fingerprint;');
  const admin = await login(h, true); const customer = await login(h);
  const old = await order(h, customer); assert.equal(old.status, 201); assert.equal(old.data.reference, old.data.order.id);
  const saved = await h.DB.prepare('SELECT receipt_text FROM orders WHERE id=?').bind(old.data.order.id).first();
  assert.equal((await setSettings(h, admin, { watermark: { enabled: true } })).status, 503);
  await h.DB.exec(await readFile(new URL('../backend/migrations/2026-10-09-portal-studio.sql', import.meta.url), 'utf8'));
  assert.equal((await h.request('/api/admin/settings', admin)).data.ready, true);
  const upgraded = (await h.request('/api/orders', customer)).data.orders.find(value => value.id === old.data.order.id);
  assert.equal(upgraded.reference, old.data.order.id);
  assert.equal((await h.DB.prepare('SELECT receipt_text FROM orders WHERE id=?').bind(old.data.order.id).first()).receipt_text, saved.receipt_text);
  const created = await order(h, customer, 'local-image-4'); assert.match(created.data.reference, /^LZ-[A-F0-9]{12}$/);
  assert.equal(await (await h.request('/api/images/local-image-3?kind=preview', customer)).text(), 'local-image-fixture-3');
}));
