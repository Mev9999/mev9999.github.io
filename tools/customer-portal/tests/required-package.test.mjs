import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHarness, cookieValue, fixtureIds } from './harness.mjs';

const BASE = 'booking-base';
const FIVE = 'booking-five';
const TEN = 'booking-ten';
const ALL = 'booking-all';
const route = `/api/admin/galleries/${fixtureIds.gallery}/packages`;
const images = count => Array.from({ length: count }, (_, index) => `local-image-${index + 1}`);
async function login(h, role = 'customer') {
  const result = await h.request('/api/auth/login', { method: 'POST', body: { email: role === 'admin' ? 'emina@example.test' : role === 'other' ? 'other@example.test' : 'customer@example.test', password: role === 'admin' ? 'Testverwaltung2026!' : 'Testgalerie2026!' } });
  assert.equal(result.status, 200);
  const cookie = cookieValue(result);
  return { cookie, csrf: (await h.request('/api/session', { cookie })).data.csrf };
}
async function withBooking(callback) {
  const h = await createHarness();
  try {
    await h.DB.prepare('UPDATE packages SET price_cents=1500 WHERE id=?').bind(fixtureIds.singlePackage).run();
    await h.DB.prepare('UPDATE packages SET active=0 WHERE id=?').bind(fixtureIds.threePackage).run();
    for (const [id, name, count, cents, required] of [[BASE, 'Gebuchtes Shooting', 5, 20000, 1], [FIVE, 'Fünf Zusatzbilder', 5, 6000, 0], [TEN, 'Zehn Zusatzbilder', 10, 10000, 0], [ALL, 'Alle Bilder', 0, 25000, 0]]) {
      await h.DB.prepare('INSERT INTO packages(id,gallery_id,name,image_count,price_cents,is_required) VALUES(?,?,?,?,?,?)').bind(id, fixtureIds.gallery, name, count, cents, required).run();
    }
    for (let index = 9; index <= 30; index++) await h.DB.prepare('INSERT INTO images(id,gallery_id,title,preview_key,original_key,preview_type,original_type,width,height,position,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(`local-image-${index}`, fixtureIds.gallery, `Testfoto ${index}`, `booking/p/${index}`, `booking/o/${index}`, 'image/png', 'image/png', 1, 1, index, Date.now()).run();
    await callback(h, await login(h), await login(h, 'admin'));
  } finally { await h.close(); }
}
const buy = (h, client, count, extra = {}) => h.request('/api/orders', { ...client, method: 'POST', body: { galleryId: fixtureIds.gallery, packageId: BASE, imageIds: images(count), paymentMethod: 'transfer', termsAccepted: true, digitalConsent:true,earlyStartConsent:true,consentVersion:'portal-digital-2026-10-19-consent-v4',consentLanguage:'de', ...extra } });
const update = (h, admin, packageId, extra = {}) => h.request(`${route}/${packageId}`, { ...admin, method: 'PATCH', body: { name: 'Buchung', imageCount: 5, priceCents: 20000, active: true, ...extra } });

test('required booking is charged once and only extra photos use the cheapest exact additional packages', () => withBooking(async (h, client) => {
  for (const [count, total, extraCounts] of [[5, 20000, []], [7, 23000, [[1, 2]]], [12, 29000, [[5, 1], [1, 2]]], [17, 33000, [[10, 1], [1, 2]]], [20, 36000, [[10, 1], [5, 1]]]]) {
    const result = await buy(h, client, count, { expectedAmountCents: total, amountCents: 1, packageQuantity: 8, requiredPackagePaid: true });
    assert.equal(result.status, 201, JSON.stringify(result.data));
    assert.equal(result.data.order.amountCents, total);
    assert.equal(result.data.order.packageQuantity, 1);
    const stored = await h.DB.prepare('SELECT pricing_json,receipt_text FROM orders WHERE id=?').bind(result.data.order.id).first();
    const snapshot = JSON.parse(stored.pricing_json);
    assert.equal(snapshot.requiredPackageId, BASE);
    assert.equal(snapshot.components.find(pack => pack.required).quantity, 1);
    assert.deepEqual(snapshot.components.filter(pack => !pack.required).map(pack => [pack.imageCount, pack.quantity]), extraCounts);
    assert.ok(stored.receipt_text.includes('Gebuchtes Shooting'));
    await h.DB.prepare("UPDATE orders SET status='cancelled' WHERE id=?").bind(result.data.order.id).run();
  }
}));

test('base requirement cannot be bypassed by ordinary/all packages, forged paid flags or insufficient selections', () => withBooking(async (h, client) => {
  for (const packageId of [fixtureIds.singlePackage, FIVE, TEN, ALL]) {
    const result = await buy(h, client, 30, { packageId, requiredPackagePaid: true, requiredPackageId: null });
    assert.equal(result.data.code, 'required_package_missing');
  }
  for (const count of [1, 4]) assert.equal((await buy(h, client, count)).data.code, 'package_image_count');
  assert.equal((await buy(h, client, 7, { expectedAmountCents: 20000 })).data.code, 'price_changed');
  assert.equal(h.mail.messages.length, 0);
  assert.equal((await h.DB.prepare('SELECT COUNT(*) AS n FROM orders').first()).n, 0);
  await h.DB.prepare('UPDATE packages SET active=0 WHERE id=?').bind(fixtureIds.singlePackage).run();
  assert.equal((await buy(h, client, 7)).data.code, 'package_selection_unavailable');
  assert.equal((await buy(h, client, 10)).data.order.amountCents, 26000);
  await h.DB.exec("UPDATE orders SET status='cancelled' WHERE status='pending';");
  await h.DB.prepare('UPDATE packages SET price_cents=1 WHERE id=?').bind(BASE).run();
  assert.equal((await buy(h, client, 10)).data.order.amountCents, 6001, 'required package cannot repeat as a cheap extra');
}));

test('only a paid booking with delivered confirmation fulfills the customer booking; further orders exclude it', () => withBooking(async (h, client, admin) => {
  const created = await buy(h, client, 5);
  assert.equal(created.status, 201);
  const orderId = created.data.order.id;
  assert.equal((await h.request(`/api/galleries/${fixtureIds.gallery}`, client)).data.requiredPackagePaid, false);
  assert.equal((await buy(h, client, 7, { packageId: FIVE })).data.code, 'required_package_missing');
  await h.DB.prepare("UPDATE orders SET status='paid',receipt_sent_at=NULL WHERE id=?").bind(orderId).run();
  assert.equal((await h.request(`/api/galleries/${fixtureIds.gallery}`, client)).data.requiredPackagePaid, false);
  await h.DB.prepare('UPDATE orders SET receipt_sent_at=? WHERE id=?').bind(Date.now(), orderId).run();
  const detail = (await h.request(`/api/galleries/${fixtureIds.gallery}`, client)).data;
  assert.equal(detail.requiredPackageId, BASE);
  assert.equal(detail.requiredPackagePaid, true);
  await h.DB.prepare('INSERT INTO gallery_members(gallery_id,user_id) VALUES(?,?)').bind(fixtureIds.gallery, fixtureIds.secondCustomer).run();
  const other = await login(h, 'other');
  assert.equal((await h.request(`/api/galleries/${fixtureIds.gallery}`, other)).data.requiredPackagePaid, false, 'another customer cannot borrow a paid booking');
  assert.equal((await buy(h, other, 7, { packageId: FIVE })).data.code, 'required_package_missing');
  assert.equal((await buy(h, client, 5)).data.code, 'required_package_paid');
  const extras = await buy(h, client, 12, { packageId: TEN, expectedAmountCents: 13000 });
  assert.equal(extras.status, 201);
  assert.equal(JSON.parse((await h.DB.prepare('SELECT pricing_json FROM orders WHERE id=?').bind(extras.data.order.id).first()).pricing_json).requiredPackageId, null);
  assert.equal((await h.request(`/api/galleries/${fixtureIds.gallery}?customerView=1`, admin)).data.requiredPackagePaid, false);
  await h.DB.prepare("UPDATE orders SET status='refunded' WHERE id=?").bind(orderId).run();
  assert.equal((await h.request(`/api/galleries/${fixtureIds.gallery}`, client)).data.requiredPackagePaid, false);
}));

test('required-package snapshots persist after offer changes and retries do not send duplicate confirmations', () => withBooking(async (h, client, admin) => {
  const first = await buy(h, client, 12);
  const id = first.data.order.id;
  const snapshot = await h.DB.prepare('SELECT pricing_json,package_name,amount_cents,receipt_text FROM orders WHERE id=?').bind(id).first();
  const retries = await Promise.all([buy(h, client, 12), buy(h, client, 12, { imageIds: images(12).reverse() })]);
  assert.ok(retries.every(result => result.status === 201 && result.data.order.id === id));
  assert.equal(h.mail.messages.length, 1);
  await update(h, admin, BASE, { name: 'Neuer Name', priceCents: 24000, isRequired: true });
  assert.deepEqual(await h.DB.prepare('SELECT pricing_json,package_name,amount_cents,receipt_text FROM orders WHERE id=?').bind(id).first(), snapshot);
  assert.equal((await buy(h, client, 12, { expectedAmountCents: 29000 })).data.code, 'price_changed');
}));

test('required-package admin setting is authorized, typed and atomically unique per gallery', () => withBooking(async (h, client, admin) => {
  assert.equal((await update(h, client, FIVE, { isRequired: true })).status, 403);
  assert.equal((await update(h, { cookie: admin.cookie }, FIVE, { isRequired: true })).status, 403);
  assert.equal((await update(h, admin, FIVE, { isRequired: 'false' })).data.code, 'invalid_required_package');
  assert.equal((await update(h, admin, BASE, { isRequired: true, active: false })).data.code, 'invalid_required_package');
  const changed = await update(h, admin, FIVE, { isRequired: true });
  assert.equal(changed.status, 200);
  assert.equal(changed.data.package.isRequired, true);
  assert.equal((await h.DB.prepare('SELECT is_required FROM packages WHERE id=?').bind(BASE).first()).is_required, 0);
  await assert.rejects(h.DB.prepare('UPDATE packages SET is_required=1 WHERE id=?').bind(BASE).run());
  const detail = (await h.request(`/api/admin/galleries/${fixtureIds.gallery}`, admin)).data;
  assert.equal(detail.requiredPackagesReady, true);
  assert.equal(detail.requiredPackageId, FIVE);
  assert.equal((await update(h, admin, FIVE, { isRequired: false, active: false })).status, 200);
  assert.equal((await h.request(`/api/galleries/${fixtureIds.gallery}`, client)).data.requiredPackageId, null);
}));

test('an all-image booking needs the full actual gallery and no alternative can undercut it', () => withBooking(async (h, client, admin) => {
  assert.equal((await update(h, admin, ALL, { imageCount: 0, priceCents: 25000, isRequired: true })).status, 200);
  assert.equal((await buy(h, client, 29, { packageId: ALL })).data.code, 'package_image_count');
  assert.equal((await buy(h, client, 30, { packageId: TEN })).data.code, 'required_package_missing');
  const whole = await buy(h, client, 0, { packageId: ALL, all: true, expectedAmountCents: 25000 });
  assert.equal(whole.status, 201);
  assert.equal(whole.data.order.imageIds.length, 30);
  assert.equal(whole.data.order.amountCents, 25000);
}));

test('a prior optional order does not become a required booking merely by matching its amount and package ID', () => withBooking(async (h, client, admin) => {
  await update(h, admin, BASE, { isRequired: false });
  const optional = await buy(h, client, 5);
  await update(h, admin, BASE, { isRequired: true });
  const required = await buy(h, client, 5);
  assert.equal(required.status, 201);
  assert.notEqual(required.data.order.id, optional.data.order.id);
  await h.DB.prepare("UPDATE orders SET status='paid' WHERE id=?").bind(optional.data.order.id).run();
  assert.equal((await h.request(`/api/galleries/${fixtureIds.gallery}`, client)).data.requiredPackagePaid, false);
  assert.equal((await buy(h, client, 5)).data.order.id, required.data.order.id);
}));

test('required-package migration preserves rows and enables a warm worker while older schema still serves regular orders', async () => {
  const h = await createHarness();
  try {
    await h.DB.exec('DROP INDEX packages_one_active_required; DROP INDEX orders_required_booking; ALTER TABLE packages DROP COLUMN is_required; ALTER TABLE orders DROP COLUMN pricing_json;');
    const client = await login(h); const admin = await login(h, 'admin');
    assert.equal((await h.request(`/api/admin/galleries/${fixtureIds.gallery}`, admin)).data.requiredPackagesReady, false);
    assert.equal((await update(h, admin, fixtureIds.singlePackage, { imageCount: 1, isRequired: true })).data.code, 'migration_required');
    const original = await buy(h, client, 1, { packageId: fixtureIds.singlePackage });
    assert.equal(original.status, 201);
    const old = await h.DB.prepare('SELECT receipt_text,amount_cents FROM orders WHERE id=?').bind(original.data.order.id).first();
    await h.DB.exec(await readFile(new URL('../backend/migrations/2026-10-12-required-package.sql', import.meta.url), 'utf8'));
    assert.deepEqual(await h.DB.prepare('SELECT receipt_text,amount_cents FROM orders WHERE id=?').bind(original.data.order.id).first(), old);
    assert.equal((await h.request(`/api/admin/galleries/${fixtureIds.gallery}`, admin)).data.requiredPackagesReady, true);
    assert.equal((await update(h, admin, fixtureIds.singlePackage, { imageCount: 1, isRequired: true })).status, 200);
    assert.equal((await h.request(`/api/galleries/${fixtureIds.gallery}`, client)).data.requiredPackageId, fixtureIds.singlePackage);
  } finally { await h.close(); }
});

test('different pending bookings cannot double-charge the required base even with parallel submissions', () => withBooking(async (h, client, admin) => {
  const results = await Promise.all([buy(h, client, 7), buy(h, client, 12)]);
  const created = results.find(result => result.status === 201);
  const conflict = results.find(result => result.status === 409);
  assert.ok(created); assert.equal(conflict.data.code, 'required_package_pending');
  assert.equal((await h.DB.prepare('SELECT COUNT(*) AS n FROM orders').first()).n, 1);
  assert.equal(h.mail.messages.length, 1);
  const count = created.data.order.imageIds.length;
  const repeat = await buy(h, client, count);
  assert.equal(repeat.data.order.id, created.data.order.id);
  assert.equal(h.mail.messages.length, 1);
  const cancelled = await h.request(`/api/admin/orders/${created.data.order.id}/cancel`, { ...admin, method: 'POST', body: { confirmed: true } });
  assert.equal(cancelled.status, 200); assert.equal(cancelled.data.order.status, 'cancelled');
  const replacement = await buy(h, client, 12);
  assert.equal(replacement.status, 201, 'admin cancellation permits a replacement booking');
  await h.DB.prepare("UPDATE orders SET status='paid',receipt_sent_at=NULL WHERE id=?").bind(replacement.data.order.id).run();
  assert.equal((await buy(h, client, 7)).data.code, 'required_package_processing');
  assert.equal((await h.DB.prepare('SELECT COUNT(*) AS n FROM orders').first()).n, 2);
}));

test('admin cancellation requires confirmation, preserves snapshots and stops only unsent order notices', () => withBooking(async (h, client, admin) => {
  const created = await buy(h, client, 7); const orderId = created.data.order.id;
  const target = `/api/admin/orders/${orderId}/cancel`;
  const before = await h.DB.prepare('SELECT pricing_json,receipt_text,receipt_email_json,amount_cents FROM orders WHERE id=?').bind(orderId).first();
  const messageCount = h.mail.messages.length;
  assert.equal((await h.request(target, { ...client, method: 'POST', body: { confirmed: true } })).status, 403);
  assert.equal((await h.request(target, { cookie: admin.cookie, method: 'POST', body: { confirmed: true } })).status, 403);
  for (const confirmed of [false, 'true', undefined]) assert.equal((await h.request(target, { ...admin, method: 'POST', body: { confirmed } })).data.code, 'order_cancel_confirmation_required');
  assert.equal((await h.DB.prepare('SELECT status FROM orders WHERE id=?').bind(orderId).first()).status, 'pending');
  for (const [id, sentAt] of [['cancel-pending-notice', null], ['cancel-sent-notice', Date.now()]]) await h.DB.prepare('INSERT INTO download_notifications(id,user_id,gallery_id,order_id,image_ids_json,created_at,sent_at) VALUES(?,?,?,?,?,?,?)').bind(id,fixtureIds.customer,fixtureIds.gallery,id==='cancel-pending-notice'?orderId:null,JSON.stringify(images(7)),Date.now(),sentAt).run();
  const result = await h.request(target, { ...admin, method: 'POST', body: { confirmed: true } });
  assert.equal(result.status, 200);assert.equal(result.data.order.status, 'cancelled');
  assert.deepEqual(await h.DB.prepare('SELECT pricing_json,receipt_text,receipt_email_json,amount_cents FROM orders WHERE id=?').bind(orderId).first(), before);
  assert.equal(h.mail.messages.length, messageCount);
  assert.ok((await h.DB.prepare('SELECT cancelled_at FROM download_notifications WHERE id=?').bind('cancel-pending-notice').first()).cancelled_at);
  assert.equal((await h.DB.prepare('SELECT cancelled_at FROM download_notifications WHERE id=?').bind('cancel-sent-notice').first()).cancelled_at, null);
  assert.equal((await h.DB.prepare("SELECT COUNT(*) AS n FROM audit_events WHERE action='order_cancelled_manual' AND target_id=?").bind(orderId).first()).n, 1);
  assert.equal((await h.request(target, { ...admin, method: 'POST', body: { confirmed: true } })).data.code, 'order_cannot_cancel');
}));

test('admin cancellation refuses paid or online orders and guards a status change immediately before its transaction', () => withBooking(async (h, client, admin) => {
  const created = await buy(h, client, 5); const orderId = created.data.order.id;
  const cancel = () => h.request(`/api/admin/orders/${orderId}/cancel`, { ...admin, method: 'POST', body: { confirmed: true } });
  for (const [status, method] of [['paid','transfer'],['pending','stripe'],['pending','paypal']]) {
    await h.DB.prepare('UPDATE orders SET status=?,payment_method=? WHERE id=?').bind(status,method,orderId).run();
    assert.equal((await cancel()).data.code, 'order_cannot_cancel');
    assert.deepEqual(await h.DB.prepare('SELECT status,payment_method FROM orders WHERE id=?').bind(orderId).first(), {status,payment_method:method});
  }
  await h.DB.prepare("UPDATE orders SET status='pending',payment_method='transfer' WHERE id=?").bind(orderId).run();
  const actualBatch=h.DB.batch.bind(h.DB);
  h.DB.batch=async statements=>{
    if(statements.some(statement=>statement.sql.includes("SET status='cancelled'")))await h.DB.prepare("UPDATE orders SET status='paid' WHERE id=?").bind(orderId).run();
    return actualBatch(statements);
  };
  assert.equal((await cancel()).data.code,'order_cannot_cancel');
  assert.equal((await h.DB.prepare('SELECT status FROM orders WHERE id=?').bind(orderId).first()).status,'paid');
  assert.equal((await h.DB.prepare("SELECT COUNT(*) AS n FROM audit_events WHERE action='order_cancelled_manual' AND target_id=?").bind(orderId).first()).n,0);
}));
