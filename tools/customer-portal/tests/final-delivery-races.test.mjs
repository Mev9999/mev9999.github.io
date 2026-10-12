import test from 'node:test';
import assert from 'node:assert/strict';
import { createHarness, cookieValue, fixtureIds } from './harness.mjs';

const imageId = 'local-image-3';
const galleryRoute = `/api/admin/galleries/${fixtureIds.gallery}`;
const imageRoute = `${galleryRoute}/images/${imageId}`;
const originalRoute = `/api/images/${imageId}?kind=original`;
const jpeg = marker => new Blob([new Uint8Array([255, 216, 255]), marker], { type: 'image/jpeg' });

function finalForm(marker) {
  const form = new FormData();
  form.set('original', jpeg(`${marker}-ORIGINAL`), `${marker}.jpg`);
  form.set('preview', jpeg(`${marker}-PREVIEW`), 'preview.jpg');
  form.set('width', '6000'); form.set('height', '4000');
  return form;
}

async function raceFixture(t) {
  const h = await createHarness(); t.after(() => h.close());
  for (const [name, email, password] of [
    ['admin', 'emina@example.test', 'Testverwaltung2026!'],
    ['customer', 'customer@example.test', 'Testgalerie2026!'],
  ]) {
    const result = await h.request('/api/auth/login', { method: 'POST', body: { email, password } });
    assert.equal(result.status, 200);
    h[name] = { cookie: cookieValue(result), csrf: result.data.csrf };
  }
  const enabled = await h.request(galleryRoute, { ...h.admin, method: 'PATCH', body: { requireFinalDelivery: true } });
  assert.equal(enabled.status, 200, JSON.stringify(enabled.data));
  const created = await h.request('/api/orders', { ...h.customer, method: 'POST', body: {
    galleryId: fixtureIds.gallery, imageIds: [imageId], packageId: fixtureIds.singlePackage,
    paymentMethod: 'transfer', termsAccepted: true, digitalConsent: true,
  } });
  assert.equal(created.status, 201, JSON.stringify(created.data));
  h.orderId = created.data.order.id;
  const paid = await h.request(`/api/admin/orders/${h.orderId}/paid`, { ...h.admin, method: 'POST', body: {} });
  assert.equal(paid.status, 200, JSON.stringify(paid.data));
  assert.equal((await h.request(originalRoute, h.customer)).status, 403);
  h.mail.clear();
  h.row = () => h.DB.prepare('SELECT * FROM images WHERE id=?').bind(imageId).first();
  h.finalize = marker => h.request(`${imageRoute}/final`, { ...h.admin, method: 'POST', body: finalForm(marker) });
  return h;
}

// Introduce an actual committed replacement between two awaits in serveImage.
// Keeping the obsolete object available simulates delayed R2 cleanup; merely
// obtaining a 404 for a stale key would not prove the permission boundary safe.
test('finalizing between the initial image read and grant check cannot serve the old proof original', async t => {
  const h = await raceFixture(t); const proof = await h.row();
  await h.PHOTOS.put(proof.original_key, 'UNEDITED-PROOF-MUST-NOT-BE-DELIVERED');
  const actualDelete = h.PHOTOS.delete.bind(h.PHOTOS);
  h.PHOTOS.delete = keys => actualDelete((Array.isArray(keys) ? keys : [keys]).filter(key => key !== proof.original_key));
  const actualPrepare = h.DB.prepare.bind(h.DB); let replaced = false;
  h.DB.prepare = sql => {
    const decorate = statement => {
      const actualBind = statement.bind.bind(statement);
      statement.bind = (...values) => decorate(actualBind(...values));
      const actualFirst = statement.first.bind(statement);
      statement.first = async (...args) => {
        const row = await actualFirst(...args);
        if (!replaced && sql === 'SELECT * FROM images WHERE id=?' && row?.id === imageId) {
          replaced = true;
          const result = await h.finalize('READY');
          assert.equal(result.status, 200, JSON.stringify(result.data));
        }
        return row;
      };
      return statement;
    };
    return decorate(actualPrepare(sql));
  };
  const result = await h.request(originalRoute, h.customer);
  assert.equal(replaced, true); assert.equal(result.status, 200);
  const bytes = await result.text();
  assert.match(bytes, /READY-ORIGINAL/); assert.doesNotMatch(bytes, /UNEDITED-PROOF/);
  assert.ok(await h.PHOTOS.head(proof.original_key), 'stale proof remains available to expose an incorrect key read');
  assert.equal(h.mail.messages.filter(mail => mail.idempotencyKey === `download-ready/order-${h.orderId}`).length, 1);
});

test('proof preview regeneration already in flight cannot overwrite a newly committed final', async t => {
  const h = await raceFixture(t); const actualPut = h.PHOTOS.put.bind(h.PHOTOS);
  const staleKeys = []; let replaced = false;
  h.PHOTOS.put = async (key, ...rest) => {
    const result = await actualPut(key, ...rest);
    if (key.includes('/versions/')) staleKeys.push(key);
    if (!replaced && key.includes('/versions/')) {
      replaced = true;
      const uploaded = await h.finalize('FINAL-WINNER');
      assert.equal(uploaded.status, 200, JSON.stringify(uploaded.data));
    }
    return result;
  };
  const form = new FormData(); form.set('preview', jpeg('STALE-PROOF-PREVIEW'), 'preview.jpg');
  const regeneration = await h.request(`${imageRoute}/previews`, { ...h.admin, method: 'POST', body: form });
  assert.equal(replaced, true); assert.equal(regeneration.status, 409);
  assert.equal(regeneration.data.code, 'image_changed');
  const current = await h.row(); assert.equal(current.final_ready, 1);
  assert.match(await (await h.PHOTOS.get(current.preview_key)).text(), /FINAL-WINNER-PREVIEW/);
  assert.match(await (await h.request(originalRoute, h.customer)).text(), /FINAL-WINNER-ORIGINAL/);
  assert.ok(staleKeys.length > 0);
  for (const key of staleKeys) assert.equal(await h.PHOTOS.head(key), null, 'rejected stale preview must be cleaned up');
  assert.equal(h.mail.messages.filter(mail => mail.idempotencyKey === `download-ready/order-${h.orderId}`).length, 1);
});

test('competing final replacements keep the winning files and send only one delivery notification', async t => {
  const h = await raceFixture(t); const actualPut = h.PHOTOS.put.bind(h.PHOTOS);
  const allNewKeys = []; let nestedStarted = false;
  h.PHOTOS.put = async (key, ...rest) => {
    allNewKeys.push(key);
    const result = await actualPut(key, ...rest);
    if (!nestedStarted && key.includes('/finals/')) {
      nestedStarted = true;
      const winner = await h.finalize('SECOND-WINNER');
      assert.equal(winner.status, 200, JSON.stringify(winner.data));
    }
    return result;
  };
  const loser = await h.finalize('FIRST-LOSER');
  assert.equal(nestedStarted, true); assert.equal(loser.status, 409);
  assert.equal(loser.data.code, 'image_changed');
  const current = await h.row(); assert.equal(current.final_ready, 1);
  assert.match(await (await h.PHOTOS.get(current.original_key)).text(), /SECOND-WINNER-ORIGINAL/);
  assert.match(await (await h.PHOTOS.get(current.preview_key)).text(), /SECOND-WINNER-PREVIEW/);
  const retained = new Set([current.original_key, current.preview_key, current.protected_preview_key]);
  for (const key of allNewKeys) if (!retained.has(key)) assert.equal(await h.PHOTOS.head(key), null, 'losing upload must not leave unused files');
  assert.equal(h.mail.messages.filter(mail => mail.idempotencyKey === `download-ready/order-${h.orderId}`).length, 1);
  assert.equal((await h.DB.prepare('SELECT COUNT(*) AS count FROM download_notifications WHERE order_id=?').bind(h.orderId).first()).count, 1);
  assert.equal((await h.DB.prepare("SELECT COUNT(*) AS count FROM audit_events WHERE action='image_final_uploaded' AND target_id=?").bind(imageId).first()).count, 1);
});
