import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHarness, cookieValue, fixtureIds } from './harness.mjs';

const base = `/api/admin/galleries/${fixtureIds.gallery}`;
const photo = id => `${base}/images/${id}`;
const imageUrl = (id, kind = 'original') => `/api/images/${id}?kind=${kind}`;
async function setup(t) {
  const h = await createHarness(); t.after(() => h.close());
  async function login(email) {
    const r = await h.request('/api/auth/login', { method: 'POST', body: { email, password: email === 'emina@example.test' ? 'Testverwaltung2026!' : 'Testgalerie2026!' } });
    assert.equal(r.status, 200); return { cookie: cookieValue(r), csrf: r.data.csrf };
  }
  h.admin = await login('emina@example.test'); h.customer = await login('customer@example.test');
  h.access = (method, imageIds, userId = fixtureIds.customer) => h.request(`${base}/release`, { ...h.admin, method, body: { userId, ...(imageIds === 'all' ? { all: true } : { imageIds }) } });
  h.detail = async () => (await h.request(base, h.admin)).data;
  h.mode = (id, mode) => h.request(photo(id), { ...h.admin, method: 'PATCH', body: { watermarkOverride: mode } });
  h.protect = async id => {
    const form = new FormData();
    const jpeg = value => new Blob([new Uint8Array([255,216,255]), value], { type: 'image/jpeg' });
    form.set('preview', jpeg('CLEAN-' + id), 'preview.jpg'); form.set('protectedPreview', jpeg('MARKED-' + id), 'protected.jpg');
    form.set('watermarkFingerprint', (await h.detail()).previewSettings.fingerprint);
    const r = await h.request(`${photo(id)}/previews`, { ...h.admin, method: 'POST', body: form }); assert.equal(r.status, 200);
  };
  return h;
}

test('revocation is per customer and image, blocks direct GET/HEAD, and can be explicitly restored', async t => {
  const h = await setup(t);
  await h.DB.prepare('INSERT OR IGNORE INTO gallery_members(gallery_id,user_id) VALUES(?,?)').bind(fixtureIds.gallery, fixtureIds.secondCustomer).run();
  assert.equal((await h.access('POST', ['local-image-3','local-image-4'])).status, 200);
  await h.access('POST', ['local-image-3'], fixtureIds.secondCustomer);
  assert.equal((await h.access('DELETE', ['local-image-3'])).status, 200);
  assert.equal((await h.request(imageUrl('local-image-3'), h.customer)).status, 403);
  assert.equal((await h.request(imageUrl('local-image-3'), { ...h.customer, method: 'HEAD' })).status, 403);
  assert.equal((await h.request(imageUrl('local-image-4'), h.customer)).status, 200);
  const d = await h.detail();
  assert.equal(d.imageControlsReady, true);
  assert.ok(d.downloadAccess.blocks.some(row => row.userId === fixtureIds.customer && row.imageId === 'local-image-3'));
  assert.ok(d.downloadAccess.releases.some(row => row.userId === fixtureIds.secondCustomer && row.imageId === 'local-image-3'));
  const customerDetail = (await h.request(`/api/galleries/${fixtureIds.gallery}`, h.customer)).data;
  assert.equal(customerDetail.downloadAccess, undefined); assert.equal(customerDetail.imageControlsReady, undefined);
  assert.equal(customerDetail.images.find(i => i.id === 'local-image-3').downloadAllowed, false);
  assert.equal((await h.access('POST', ['local-image-3'])).status, 200);
  assert.equal((await h.request(imageUrl('local-image-3'), h.customer)).status, 200);
  assert.equal((await h.detail()).downloadAccess.blocks.length, 0);
});

test('payment releases exactly eight purchased originals without watermarks; later revocation survives repeated paid actions', async t => {
  const h = await setup(t);
  const selected = [];
  for (let n = 0; n < 8; n++) {
    const id = `purchase-photo-${n}`; selected.push(id);
    await h.DB.prepare("INSERT INTO images(id,gallery_id,title,original_key,preview_key,original_type,preview_type,width,height,created_at) SELECT ?,gallery_id,?,original_key||?,preview_key||?,original_type,preview_type,width,height,created_at FROM images WHERE id='local-image-3'").bind(id,id,id,id).run();
    const img = await h.DB.prepare('SELECT * FROM images WHERE id=?').bind(id).first();
    await h.PHOTOS.put(img.original_key, 'HIGH-RES-UNCHANGED-' + n); await h.PHOTOS.put(img.preview_key, 'CLEAN-' + id);
  }
  await h.request('/api/admin/settings', { ...h.admin, method:'PATCH', body:{watermark:{enabled:true}} });
  await h.protect(selected[0]); await h.mode(selected[0], 'on');
  await h.access('DELETE', selected);
  const created = await h.request('/api/orders', { ...h.customer, method:'POST', body:{galleryId:fixtureIds.gallery,imageIds:selected,packageId:fixtureIds.singlePackage,paymentMethod:'transfer',termsAccepted:true,digitalConsent:true} });
  assert.equal(created.status, 201);
  const orderId = created.data.order.id; const paid = () => h.request(`/api/admin/orders/${orderId}/paid`, { ...h.admin, method:'POST', body:{} });
  assert.equal((await paid()).status, 200);
  for (const [n,id] of selected.entries()) {
    assert.equal(await (await h.request(imageUrl(id), h.customer)).text(), 'HIGH-RES-UNCHANGED-' + n);
    assert.match(await (await h.request(imageUrl(id,'preview'), h.customer)).text(), /^\xff\xd8\xffCLEAN-|CLEAN-/);
  }
  assert.equal((await h.request(imageUrl('local-image-4'), h.customer)).status, 403);
  assert.equal(h.mail.messages.filter(m => m.idempotencyKey?.startsWith('download-ready/')).length, 1);
  const before = await h.DB.prepare('SELECT status,amount_cents,receipt_text FROM orders WHERE id=?').bind(orderId).first();
  await h.access('DELETE', [selected[0]]); await paid();
  assert.equal((await h.request('/api/orders',h.customer)).data.orders.find(o=>o.id===orderId).downloadBlockedCount,1);
  assert.equal((await h.request('/api/admin/orders',h.admin)).data.orders.find(o=>o.id===orderId).downloadBlockedCount,1);
  assert.equal((await h.request(imageUrl(selected[0]), h.customer)).status, 403);
  assert.match(await (await h.request(imageUrl(selected[0],'preview'), h.customer)).text(), /MARKED-/);
  assert.deepEqual(await h.DB.prepare('SELECT status,amount_cents,receipt_text FROM orders WHERE id=?').bind(orderId).first(), before);
  assert.equal(h.mail.messages.filter(m => m.idempotencyKey?.startsWith('download-ready/')).length, 1);
  await h.access('POST', [selected[0]]);
  assert.equal((await h.request(imageUrl(selected[0]), h.customer)).status, 200);
  assert.equal(h.mail.messages.filter(m => m.idempotencyKey?.startsWith('download-ready/')).length, 2);
});

test('image watermark overrides beat gallery defaults, protect admin previews, and never unlock original downloads', async t => {
  const h = await setup(t);
  await h.protect('local-image-3'); await h.protect('local-image-4');
  assert.equal((await h.mode('local-image-3','on')).status,200);
  assert.match(await (await h.request(imageUrl('local-image-3','preview'),h.customer)).text(),/MARKED-/);
  assert.match(await (await h.request(imageUrl('local-image-4','preview'),h.customer)).text(),/CLEAN-/);
  assert.match(await (await h.request(imageUrl('local-image-3','preview')+'&watermark=1',h.admin)).text(),/MARKED-/);
  await h.request(base,{...h.admin,method:'PATCH',body:{watermarkMode:'on'}});
  assert.equal((await h.mode('local-image-4','off')).status,200);
  assert.match(await (await h.request(imageUrl('local-image-4','preview'),h.customer)).text(),/CLEAN-/);
  assert.equal((await h.request(imageUrl('local-image-4'),h.customer)).status,403);
  const d=await h.detail();
  assert.equal(d.images.find(i=>i.id==='local-image-3').watermarkOverride,'on');
  assert.equal(d.images.find(i=>i.id==='local-image-4').watermarkEnabled,false);
  const library=(await h.request('/api/admin/images',h.admin)).data.images;
  assert.equal(library.find(i=>i.id==='local-image-4').watermarkEnabled,false);
  assert.equal((await h.mode('local-image-4','inherit')).status,200);
  assert.match(await (await h.request(imageUrl('local-image-4','preview'),h.customer)).text(),/MARKED-/);
  await h.request(base,{...h.admin,method:'PATCH',body:{watermarkMode:'off'}});
  assert.match(await (await h.request(imageUrl('local-image-3','preview'),h.customer)).text(),/MARKED-/);
  assert.match(await (await h.request(imageUrl('local-image-4','preview'),h.customer)).text(),/CLEAN-/);
  assert.equal(await (await h.request(imageUrl('local-image-3'),h.admin)).text(),'local-image-fixture-3');
});

test('missing and stale protected previews cannot activate an override or fall back to clean customer bytes', async t => {
  const h=await setup(t);
  assert.equal((await h.mode('local-image-3','on')).status,409);
  assert.equal((await h.detail()).images.find(i=>i.id==='local-image-3').watermarkOverride,'inherit');
  await h.protect('local-image-3'); await h.mode('local-image-3','on');
  await h.request('/api/admin/settings',{...h.admin,method:'PATCH',body:{watermark:{text:'Changed watermark'}}});
  const stale=await h.request(imageUrl('local-image-3','preview'),h.customer);
  assert.equal(stale.response.headers.get('X-LiZa-Preview'),'pending'); assert.doesNotMatch(await stale.text(),/CLEAN-|MARKED-|local-image-fixture/);
  const form=new FormData();form.set('preview',new Blob([new Uint8Array([255,216,255]),'CLEAN'],{type:'image/jpeg'}),'preview.jpg');
  assert.equal((await h.request(photo('local-image-3')+'/previews',{...h.admin,method:'POST',body:form})).status,400);
  await h.protect('local-image-3');
  assert.match(await (await h.request(imageUrl('local-image-3','preview'),h.customer)).text(),/MARKED-/);
});

test('only same-origin administrators may revoke or change image overrides; foreign selections change nothing', async t => {
  const h=await setup(t);
  const before=await h.detail();
  assert.equal((await h.request(`${base}/release`,{...h.customer,method:'DELETE',body:{userId:fixtureIds.customer,imageIds:['local-image-3']}})).status,403);
  assert.equal((await h.request(photo('local-image-3'),{...h.customer,method:'PATCH',body:{watermarkOverride:'off'}})).status,403);
  assert.equal((await h.request(`${base}/release`,{...h.admin,csrf:undefined,method:'DELETE',body:{userId:fixtureIds.customer,imageIds:['local-image-3']}})).status,403);
  assert.equal((await h.access('DELETE',['local-image-3','unknown-photo'])).status,400);
  assert.equal((await h.access('DELETE',['local-image-3'],'unknown-customer')).status,400);
  assert.equal((await h.access('DELETE',[])).status,400);
  assert.equal((await h.mode('local-image-3','invalid')).status,400);
  assert.equal((await h.mode('local-image-3',null)).status,400);
  assert.deepEqual((await h.detail()).downloadAccess,before.downloadAccess);
});

test('revoke-all cancels unsent download notices and repeated restore does not duplicate mail', async t => {
  const h=await setup(t); const send=h.mail.send.bind(h.mail); h.mail.send=async()=>{throw new Error('temporary mail failure');};
  await h.access('POST',['local-image-3','local-image-4']);
  assert.ok((await h.DB.prepare('SELECT COUNT(*) AS n FROM download_notifications WHERE sent_at IS NULL AND cancelled_at IS NULL').first()).n>0);
  assert.equal((await h.access('DELETE','all')).status,200);
  assert.equal((await h.DB.prepare('SELECT COUNT(*) AS n FROM download_notifications WHERE sent_at IS NULL AND cancelled_at IS NULL').first()).n,0);
  h.mail.send=send;
  await h.access('POST',['local-image-3']); await h.access('POST',['local-image-3']);
  assert.equal((await h.request(imageUrl('local-image-3'),h.customer)).status,200);
  assert.equal((await h.request(imageUrl('local-image-4'),h.customer)).status,403);
  assert.equal(h.mail.messages.filter(m=>m.idempotencyKey?.startsWith('download-ready/')).length,1);
});

test('additive image-controls migration preserves old rows and works without restarting a warm worker', async t => {
  const h=await setup(t);
  await h.DB.exec('DROP TABLE image_download_blocks; ALTER TABLE images DROP COLUMN watermark_override;');
  const before=await h.DB.prepare('SELECT id,original_key,preview_key FROM images ORDER BY id').all();
  assert.equal((await h.detail()).imageControlsReady,false);
  assert.equal((await h.access('DELETE',['local-image-3'])).status,503);
  assert.equal((await h.mode('local-image-3','off')).status,503);
  await h.DB.exec(await readFile(new URL('../backend/migrations/2026-10-11-image-controls.sql',import.meta.url),'utf8'));
  assert.equal((await h.detail()).imageControlsReady,true);
  assert.deepEqual(await h.DB.prepare('SELECT id,original_key,preview_key FROM images ORDER BY id').all(),before);
  assert.equal((await h.mode('local-image-3','off')).status,200);
  assert.equal((await h.access('DELETE',['local-image-3'])).status,200);
});
