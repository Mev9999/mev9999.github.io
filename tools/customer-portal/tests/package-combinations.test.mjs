import test from 'node:test';
import assert from 'node:assert/strict';
import { createHarness, cookieValue, fixtureIds } from './harness.mjs';

const SINGLE = fixtureIds.singlePackage;
const FIVE = 'combination-five';
const TEN = 'combination-ten';
const ALL = 'combination-all';
const images = count => Array.from({ length: count }, (_, index) => `local-image-${index + 1}`);

async function login(h, admin = false) {
  const result = await h.request('/api/auth/login', { method: 'POST', body: { email: admin ? 'emina@example.test' : 'customer@example.test', password: admin ? 'Testverwaltung2026!' : 'Testgalerie2026!' } });
  assert.equal(result.status, 200);
  const cookie = cookieValue(result);
  const session = await h.request('/api/session', { cookie });
  return { cookie, csrf: session.data.csrf };
}
async function withPrices(callback) {
  const h = await createHarness();
  try {
    await h.DB.prepare('UPDATE packages SET price_cents=1500,name=? WHERE id=?').bind('Ein Bild', SINGLE).run();
    await h.DB.prepare('UPDATE packages SET active=0 WHERE id=?').bind(fixtureIds.threePackage).run();
    for (const [id, name, count, price] of [[FIVE, 'Fünfer-Paket', 5, 6000], [TEN, 'Zehner-Paket', 10, 10000], [ALL, 'Alle Bilder', 0, 25000]]) {
      await h.DB.prepare('INSERT INTO packages(id,gallery_id,name,image_count,price_cents,currency) VALUES(?,?,?,?,?,?)').bind(id, fixtureIds.gallery, name, count, price, 'EUR').run();
    }
    for (let index = 9; index <= 17; index++) {
      await h.DB.prepare('INSERT INTO images(id,gallery_id,title,preview_key,original_key,preview_type,original_type,width,height,position,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)')
        .bind(`local-image-${index}`, fixtureIds.gallery, `Testfoto ${index}`, `test-preview-${index}`, `test-original-${index}`, 'image/webp', 'image/webp', 100, 100, index, Date.now()).run();
    }
    await callback(h, await login(h));
  } finally { await h.close(); }
}
function buy(h, client, packageId, count, extra = {}) {
  return h.request('/api/orders', { ...client, method: 'POST', body: { galleryId: fixtureIds.gallery, packageId, imageIds: images(count), paymentMethod: 'transfer', termsAccepted: true, digitalConsent: true, ...extra } });
}

test('every selection uses the cheapest exact combination containing the selected package and ignores forged prices', () => withPrices(async (h, client) => {
  const cases = [
    [SINGLE, 1, 1500, 1], [SINGLE, 4, 6000, 4], [SINGLE, 9, 12000, 4],
    [FIVE, 5, 6000, 1], [FIVE, 6, 7500, 1], [FIVE, 9, 12000, 1],
    [FIVE, 10, 12000, 2], [TEN, 10, 10000, 1], [TEN, 11, 11500, 1], [TEN, 12, 13000, 1],
    [FIVE, 15, 16000, 1], [TEN, 15, 16000, 1], [TEN, 17, 19000, 1],
  ];
  for (const [packageId, count, amount, quantity] of cases) {
    const result = await buy(h, client, packageId, count, { amountCents: 1, packageQuantity: 900, extraQuantity: 0, singlePriceCents: 0, expectedAmountCents: amount });
    assert.equal(result.status, 201, `${packageId} with ${count} photos`);
    assert.equal(result.data.order.amountCents, amount);
    assert.equal(result.data.order.packageQuantity, quantity);
    assert.equal(result.data.order.imageIds.length, count);
  }
  const six = (await h.request('/api/orders', client)).data.orders.find(order => order.packageId === FIVE && order.imageIds.length === 6);
  assert.equal(six.packageName, 'Fünfer-Paket (60,00 €) + Ein Bild (15,00 €)');
  const nine = (await h.request('/api/orders', client)).data.orders.find(order => order.packageId === FIVE && order.imageIds.length === 9);
  assert.equal(nine.packageName, 'Fünfer-Paket (60,00 €) + 4 × Ein Bild (je 15,00 € = 60,00 €)');
}));

test('insufficient selection and impossible combinations are rejected while exact bundles need no single price', () => withPrices(async (h, client) => {
  for (const count of [1, 4]) {
    const result = await buy(h, client, FIVE, count);
    assert.equal(result.status, 400);
    assert.equal(result.data.code, 'package_image_count');
  }
  await h.DB.prepare('UPDATE packages SET active=0 WHERE id=?').bind(SINGLE).run();
  await h.DB.prepare('INSERT INTO packages(id,gallery_id,name,image_count,price_cents,currency) VALUES(?,?,?,?,?,?)').bind('foreign-single', fixtureIds.otherGallery, 'Fremdes Einzelbild', 1, 1, 'EUR').run();
  assert.equal((await buy(h, client, FIVE, 5)).status, 201);
  assert.equal((await buy(h, client, FIVE, 10)).status, 201);
  for (const count of [6, 9]) {
    const result = await buy(h, client, FIVE, count, { singlePackageId: 'foreign-single' });
    assert.equal(result.status, 400);
    assert.equal(result.data.code, 'package_selection_unavailable');
  }
  assert.equal((await h.DB.prepare('SELECT COUNT(*) AS n FROM orders').first()).n, 2);
  assert.equal(h.mail.messages.length, 2);
  await h.DB.prepare('INSERT INTO packages(id,gallery_id,name,image_count,price_cents,currency) VALUES(?,?,?,?,?,?)').bind('combination-four', fixtureIds.gallery, 'Vierer-Paket', 4, 5000, 'EUR').run();
  const withoutSingle = await buy(h, client, FIVE, 9);
  assert.equal(withoutSingle.status, 201, 'five plus four is possible even without an active single-photo offer');
  assert.equal(withoutSingle.data.order.amountCents, 11000);
}));

test('remainder uses the cheapest active single from its own gallery with a stable ID tie-break', () => withPrices(async (h, client) => {
  for (const [id, name, price, active, gallery] of [
    ['z-single', 'Zweiter günstiger Preis', 1400, 1, fixtureIds.gallery],
    ['a-single', 'Erster günstiger Preis', 1400, 1, fixtureIds.gallery],
    ['disabled-single', 'Deaktivierter Preis', 1, 0, fixtureIds.gallery],
    ['foreign-single', 'Fremder Preis', 1, 1, fixtureIds.otherGallery],
  ]) await h.DB.prepare('INSERT INTO packages(id,gallery_id,name,image_count,price_cents,currency,active) VALUES(?,?,?,?,?,?,?)').bind(id, gallery, name, 1, price, 'EUR', active).run();
  const result = await buy(h, client, FIVE, 6, { singlePackageId: 'disabled-single' });
  assert.equal(result.status, 201);
  assert.equal(result.data.order.amountCents, 7400);
  assert.equal(result.data.order.packageName, 'Fünfer-Paket (60,00 €) + Erster günstiger Preis (14,00 €)');
  assert.equal((await buy(h, client, 'disabled-single', 1)).data.code, 'package_not_found');
  assert.equal((await buy(h, client, 'foreign-single', 1)).data.code, 'package_not_found');
}));

test('whole-gallery package requires every actual image and cannot be satisfied with duplicates or foreign images', () => withPrices(async (h, client) => {
  for (const count of [1, 16]) {
    const result = await buy(h, client, ALL, count);
    assert.equal(result.status, 400);
    assert.equal(result.data.code, 'package_image_count');
  }
  const duplicate = await buy(h, client, ALL, 17, { imageIds: [...images(16), 'local-image-1'] });
  assert.equal(duplicate.data.code, 'invalid_selection');
  const foreign = await buy(h, client, ALL, 17, { imageIds: [...images(16), 'local-foreign-image'] });
  assert.equal(foreign.data.code, 'invalid_selection');
  const complete = await buy(h, client, ALL, 17);
  assert.equal(complete.status, 201);
  assert.equal(complete.data.order.amountCents, 25000);
  const all = await buy(h, client, ALL, 0, { all: true });
  assert.equal(all.status, 201);
  assert.equal(all.data.order.id, complete.data.order.id);
  assert.equal(all.data.order.imageIds.length, 17);
  assert.equal((await buy(h, client, FIVE, 12, { all: true })).data.code, 'invalid_selection');
}));

test('repeated and parallel combination submissions reuse one pending order and preserve their snapshots', () => withPrices(async (h, client) => {
  const first = await buy(h, client, FIVE, 9);
  assert.equal(first.status, 201);
  const orderId = first.data.order.id;
  const snapshot = await h.DB.prepare('SELECT package_name,amount_cents,receipt_text,receipt_email_json FROM orders WHERE id=?').bind(orderId).first();
  assert.ok(snapshot.receipt_text.includes('Paket: Fünfer-Paket (60,00 €) + 4 × Ein Bild (je 15,00 € = 60,00 €)'));
  assert.ok(snapshot.receipt_text.includes('Gesamtbetrag: 120.00 EUR'));
  const retried = await Promise.all([buy(h, client, FIVE, 9), buy(h, client, FIVE, 9, { imageIds: images(9).reverse() })]);
  assert.ok(retried.every(result => result.status === 201 && result.data.order.id === orderId));
  assert.equal((await h.DB.prepare('SELECT COUNT(*) AS n FROM orders').first()).n, 1);
  assert.equal(h.mail.messages.length, 1, 'ordinary retry must not send another confirmation');
  await h.DB.prepare('UPDATE packages SET name=?,price_cents=9999 WHERE id=?').bind('Neuer Paketname', FIVE).run();
  await h.DB.prepare('UPDATE packages SET name=?,price_cents=2000 WHERE id=?').bind('Neuer Einzelpreis', SINGLE).run();
  const customerOrder = (await h.request('/api/orders', client)).data.orders[0];
  assert.equal(customerOrder.packageName, snapshot.package_name);
  assert.equal(customerOrder.amountCents, 12000);
  const admin = await login(h, true);
  const adminOrder = (await h.request('/api/admin/orders', admin)).data.orders.find(order => order.id === orderId);
  assert.equal(adminOrder.packageName, snapshot.package_name);
  assert.equal((await h.request(`/api/admin/orders/${orderId}/receipt`, { ...admin, method: 'POST', body: {} })).status, 200);
  assert.deepEqual(await h.DB.prepare('SELECT package_name,amount_cents,receipt_text,receipt_email_json FROM orders WHERE id=?').bind(orderId).first(), snapshot);
  assert.equal(h.mail.messages.at(-1).html, h.mail.messages[0].html);
}));

test('stale or malformed quoted totals cannot create an order or email and an absent quote remains compatible', () => withPrices(async (h, client) => {
  await h.DB.prepare('UPDATE packages SET price_cents=1600 WHERE id=?').bind(SINGLE).run();
  for (const quote of [7500, '7600', null, 7600.5, -1]) {
    const result = await buy(h, client, FIVE, 6, { expectedAmountCents: quote });
    assert.equal(result.status, 409);
    assert.equal(result.data.code, 'price_changed');
  }
  assert.equal((await h.DB.prepare('SELECT COUNT(*) AS n FROM orders').first()).n, 0);
  assert.equal(h.mail.messages.length, 0);
  const compatible = await buy(h, client, FIVE, 6);
  assert.equal(compatible.status, 201);
  assert.equal(compatible.data.order.amountCents, 7600);
  const quoted = await buy(h, client, FIVE, 6, { expectedAmountCents: 7600 });
  assert.equal(quoted.data.order.id, compatible.data.order.id);
}));

test('combination checkout preserves gallery pricing mode, access checks, and the order limit', () => withPrices(async (h, client) => {
  const foreign = await buy(h, client, FIVE, 6, { galleryId: fixtureIds.otherGallery });
  assert.ok([403, 404].includes(foreign.status));
  await h.DB.prepare('UPDATE galleries SET pricing_mode=? WHERE id=?').bind('gallery', fixtureIds.gallery).run();
  assert.equal((await buy(h, client, FIVE, 6)).data.code, 'invalid_pricing_mode');
  assert.equal((await buy(h, client, ALL, 17)).status, 201);
  await h.DB.prepare('UPDATE galleries SET pricing_mode=? WHERE id=?').bind('images', fixtureIds.gallery).run();
  await h.DB.prepare('UPDATE packages SET price_cents=1000000 WHERE id=?').bind(FIVE).run();
  assert.equal((await buy(h, client, FIVE, 6)).data.code, 'order_amount_limit');
}));

test('exact optimization avoids greedy repetition and resolves equally priced combinations with fewer packages', () => withPrices(async (h, client) => {
  await h.DB.prepare('UPDATE packages SET price_cents=4000 WHERE id=?').bind(FIVE).run();
  await h.DB.prepare('INSERT INTO packages(id,gallery_id,name,image_count,price_cents,currency) VALUES(?,?,?,?,?,?)').bind('combination-four', fixtureIds.gallery, 'Vierer-Paket', 4, 3000, 'EUR').run();
  const nongreedy = await buy(h, client, FIVE, 13);
  assert.equal(nongreedy.status, 201);
  assert.equal(nongreedy.data.order.amountCents, 10000, 'one five and two fours, instead of two fives and three singles');
  assert.equal(nongreedy.data.order.packageQuantity, 1);
  assert.equal(nongreedy.data.order.packageName, 'Fünfer-Paket (40,00 €) + 2 × Vierer-Paket (je 30,00 € = 60,00 €)');
  await h.DB.prepare('UPDATE packages SET price_cents=6000 WHERE id=?').bind(FIVE).run();
  await h.DB.prepare('UPDATE packages SET price_cents=3000 WHERE id=?').bind('combination-four').run();
  const tie = await buy(h, client, FIVE, 9);
  assert.equal(tie.data.order.amountCents, 9000);
  assert.ok(tie.data.order.packageName.includes('Vierer-Paket (30,00 €)'), 'one four beats four singles if their total price is tied');
  await h.DB.prepare('UPDATE packages SET price_cents=750 WHERE id=?').bind(SINGLE).run();
  const tiedAgain = await buy(h, client, FIVE, 9, { imageIds: images(10).slice(1) });
  assert.equal(tiedAgain.data.order.amountCents, 9000);
  assert.ok(tiedAgain.data.order.packageName.includes('Vierer-Paket (30,00 €)'));
}));
