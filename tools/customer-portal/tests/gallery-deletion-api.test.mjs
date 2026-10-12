import test from 'node:test';
import assert from 'node:assert/strict';
import { createHarness, cookieValue, fixtureIds } from './harness.mjs';

const galleryRoute = `/api/admin/galleries/${fixtureIds.gallery}`;
async function deletionApiFixture(t) {
  const h = await createHarness(); t.after(() => h.close());
  for (const [key,email,password] of [['admin','emina@example.test','Testverwaltung2026!'],['customer','customer@example.test','Testgalerie2026!']]) {
    const r = await h.request('/api/auth/login', { method: 'POST', body: { email, password } });
    assert.equal(r.status, 200); h[key] = { cookie: cookieValue(r), csrf: r.data.csrf };
  }
  h.name = (await h.DB.prepare('SELECT name FROM galleries WHERE id=?').bind(fixtureIds.gallery).first()).name;
  h.confirmation = { confirmed: true, confirmName: h.name };
  h.remove = (extra = {}) => h.request(galleryRoute, { ...h.admin, method: 'DELETE', body: h.confirmation, ...extra });
  return h;
}

test('gallery DELETE API enforces authentication, administrator role, CSRF and typed-name confirmation', async t => {
  const h = await deletionApiFixture(t);
  assert.equal((await h.remove({ cookie: undefined, csrf: undefined })).status, 401);
  assert.equal((await h.remove(h.customer)).status, 403);
  assert.equal((await h.remove({ csrf: undefined })).status, 403);
  assert.equal((await h.remove({ origin: 'https://foreign.example.test' })).status, 403);
  for (const body of [{}, { confirmed: true }, { confirmName: h.name }, { confirmed: true, confirmName: 'Different gallery' }]) {
    const result = await h.remove({ body }); assert.equal(result.status, 400); assert.equal(result.data.code, 'deletion_confirmation_required');
  }
  assert.equal((await h.request(galleryRoute, h.admin)).status, 200);
  const accepted = await h.remove(); assert.equal(accepted.status, 200); assert.equal(accepted.data.deleted, true);
  assert.equal((await h.request(galleryRoute, h.admin)).status, 404);
});

test('deleted galleries vanish from customer/admin lists and library, and all photo/galley access is denied', async t => {
  const h = await deletionApiFixture(t);
  assert.equal((await h.remove()).status, 200);
  for (const [route, user] of [['/api/galleries',h.customer],['/api/galleries',h.admin],['/api/admin/galleries',h.admin]]) {
    const result = await h.request(route,user); assert.equal(result.status,200);
    assert.equal(result.data.galleries.some(g => g.id === fixtureIds.gallery),false);
  }
  const library = await h.request('/api/admin/images',h.admin); assert.equal(library.status,200);
  assert.equal(library.data.images.some(image => image.galleryId === fixtureIds.gallery),false);
  for (const user of [h.admin,h.customer]) {
    assert.equal((await h.request(`/api/galleries/${fixtureIds.gallery}`,user)).status,404);
    for (const kind of ['preview','original']) for (const method of ['GET','HEAD']) {
      assert.equal((await h.request(`/api/images/local-image-1?kind=${kind}`,{...user,method})).status,404);
    }
    assert.equal((await h.request(`/api/galleries/${fixtureIds.gallery}/invoice?userId=${fixtureIds.customer}`,user)).status,404);
  }
  assert.equal((await h.request(`${galleryRoute}/release`,{...h.admin,method:'POST',body:{userId:fixtureIds.customer,imageIds:['local-image-1']}})).status,404);
  assert.equal((await h.request(`${galleryRoute}/members`,{...h.admin,method:'POST',body:{name:'New client',email:'new-client@example.test'}})).status,404);
  assert.equal((await h.request(galleryRoute,{...h.admin,method:'PATCH',body:{published:true}})).status,404);
  assert.equal((await h.request(`/api/galleries/${fixtureIds.gallery}/favorites`,{...h.customer,method:'PUT',body:{imageIds:['local-image-1']}})).status,404);
  const order = await h.request('/api/orders',{...h.customer,method:'POST',body:{galleryId:fixtureIds.gallery,imageIds:['local-image-1'],packageId:fixtureIds.singlePackage,paymentMethod:'transfer',termsAccepted:true,digitalConsent:true}});
  assert.equal(order.status,404);
});

test('deletion retains order receipts and invoice snapshots but cannot grant or pay for missing images', async t => {
  const h = await deletionApiFixture(t);
  const invoice = new FormData(); invoice.set('userId',fixtureIds.customer); invoice.set('file',new Blob(['%PDF-1.4\nINVOICE-RETAINED'],{type:'application/pdf'}),'Rechnung.pdf');
  assert.equal((await h.request(`${galleryRoute}/invoice`,{...h.admin,method:'POST',body:invoice})).status,201);
  const created = await h.request('/api/orders',{...h.customer,method:'POST',body:{galleryId:fixtureIds.gallery,imageIds:['local-image-3'],packageId:fixtureIds.singlePackage,paymentMethod:'transfer',termsAccepted:true,digitalConsent:true}});
  assert.equal(created.status,201); const orderId = created.data.order.id;
  const before = await h.DB.prepare('SELECT * FROM orders WHERE id=?').bind(orderId).first();
  h.mail.clear(); assert.equal((await h.remove()).status,200);
  assert.deepEqual(await h.DB.prepare('SELECT * FROM orders WHERE id=?').bind(orderId).first(),before);
  for (const user of [h.customer,h.admin]) {
    const orders = await h.request(user === h.admin ? '/api/admin/orders' : '/api/orders',user);
    assert.equal(orders.status,200); assert.ok(orders.data.orders.some(order => order.id === orderId));
    const receipt = await h.request(`/api/orders/${orderId}/receipt`,user); assert.equal(receipt.status,200);
    const document = await h.request(`/api/orders/${orderId}/invoice`,user); assert.equal(document.status,200); assert.match(await document.text(),/INVOICE-RETAINED/);
  }
  const paid = await h.request(`/api/admin/orders/${orderId}/paid`,{...h.admin,method:'POST',body:{}});
  assert.ok([404,409].includes(paid.status));
  assert.equal((await h.DB.prepare('SELECT status FROM orders WHERE id=?').bind(orderId).first()).status,'pending');
  assert.equal(h.mail.messages.length,0);
});

test('API deletion retry can purge failed storage even though the gallery is no longer browseable', async t => {
  const h = await deletionApiFixture(t); const actualDelete = h.PHOTOS.delete.bind(h.PHOTOS);
  h.PHOTOS.delete = async () => { throw new Error('R2 temporarily unavailable'); };
  const initial = await h.remove(); assert.equal(initial.status,200); assert.equal(initial.data.cleanupPending,true);
  assert.equal((await h.request(galleryRoute,h.admin)).status,404);
  const pending = await h.request('/api/admin/galleries',h.admin);
  assert.ok(pending.data.pendingDeletions.some(gallery => gallery.id === fixtureIds.gallery && gallery.name === h.name));
  assert.equal((await h.request('/api/galleries',h.customer)).data.pendingDeletions,undefined);
  h.PHOTOS.delete = actualDelete;
  const retry = await h.remove(); assert.equal(retry.status,200); assert.equal(retry.data.cleanupPending,false);
  assert.equal((await h.request('/api/admin/galleries',h.admin)).data.pendingDeletions.some(gallery => gallery.id === fixtureIds.gallery),false);
  assert.equal((await h.remove()).status,200);
  assert.equal((await h.DB.prepare("SELECT COUNT(*) AS n FROM audit_events WHERE action='gallery_deleted' AND target_id=?").bind(fixtureIds.gallery).first()).n,1);
});

test('API deletion without migration reports the required update and leaves existing gallery access working', async t => {
  const h = await deletionApiFixture(t);
  await h.DB.exec('ALTER TABLE galleries DROP COLUMN deleted_at;');
  const result = await h.remove(); assert.equal(result.status,503); assert.equal(result.data.code,'migration_required');
  assert.equal((await h.request(galleryRoute,h.admin)).status,200);
  assert.equal((await h.request(`/api/galleries/${fixtureIds.gallery}`,h.customer)).status,200);
});

test('an upload or preview generation already in flight cannot recreate media after gallery deletion', async t => {
  for (const mode of ['upload','preview']) {
    const h = await deletionApiFixture(t); const actualPut = h.PHOTOS.put.bind(h.PHOTOS); const createdKeys = []; let removed = false;
    const beforeCount = (await h.DB.prepare('SELECT COUNT(*) AS n FROM images WHERE gallery_id=?').bind(fixtureIds.gallery).first()).n;
    h.PHOTOS.put = async (key,...rest) => {
      createdKeys.push(key); const result = await actualPut(key,...rest);
      if (!removed) { removed=true; assert.equal((await h.remove()).status,200); }
      return result;
    };
    const jpeg = () => new Blob([new Uint8Array([255,216,255]),'LOCAL-TEST'],{type:'image/jpeg'});
    const form = new FormData(); form.set('preview',jpeg(),'preview.jpg');
    if (mode === 'upload') { form.set('original',jpeg(),'original.jpg'); form.set('width','100'); form.set('height','100'); }
    const response = await h.request(mode === 'upload' ? `${galleryRoute}/images` : `${galleryRoute}/images/local-image-3/previews`,{...h.admin,method:'POST',body:form});
    assert.ok([404,409].includes(response.status),`${mode}: ${response.status}`);
    for (const key of createdKeys) assert.equal(await h.PHOTOS.head(key),null,`${mode} left an uploaded object behind`);
    assert.equal((await h.DB.prepare('SELECT COUNT(*) AS n FROM images WHERE gallery_id=?').bind(fixtureIds.gallery).first()).n,beforeCount);
  }
});

test('deletion between the manual-payment access check and transaction cannot mark a transfer paid', async t => {
  const h = await deletionApiFixture(t);
  const created = await h.request('/api/orders',{...h.customer,method:'POST',body:{galleryId:fixtureIds.gallery,imageIds:['local-image-3'],packageId:fixtureIds.singlePackage,paymentMethod:'transfer',termsAccepted:true,digitalConsent:true}});
  assert.equal(created.status,201); const orderId = created.data.order.id; h.mail.clear();
  const actualBatch = h.DB.batch.bind(h.DB); let removed = false;
  h.DB.batch = async statements => {
    if (!removed && statements.some(statement => statement.sql.includes("UPDATE orders SET status='paid'"))) {
      removed = true; assert.equal((await h.remove()).status,200);
    }
    return actualBatch(statements);
  };
  const paid = await h.request(`/api/admin/orders/${orderId}/paid`,{...h.admin,method:'POST',body:{}});
  assert.equal(removed,true); assert.ok([404,409].includes(paid.status));
  assert.equal((await h.DB.prepare('SELECT status FROM orders WHERE id=?').bind(orderId).first()).status,'pending');
  assert.equal((await h.DB.prepare("SELECT COUNT(*) AS n FROM audit_events WHERE action='transfer_payment_confirmed' AND target_id=?").bind(orderId).first()).n,0);
  assert.equal((await h.DB.prepare('SELECT COUNT(*) AS n FROM download_notifications WHERE order_id=? AND cancelled_at IS NULL').bind(orderId).first()).n,0);
  assert.equal(h.mail.messages.length,0);
});
