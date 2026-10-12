import test from 'node:test';
import assert from 'node:assert/strict';
import { createHarness, fixtureIds } from './harness.mjs';
import { deleteGallery, purgeDeletedGalleryMedia } from '../backend/gallery-deletion.mjs';

async function deletionFixture(t) {
  const h = await createHarness(); t.after(() => h.close());
  const columns = (await h.DB.prepare('PRAGMA table_info(galleries)').all()).results.map(row => row.name);
  for (const name of ['deleted_at', 'media_deleted_at']) {
    if (!columns.includes(name)) await h.DB.exec(`ALTER TABLE galleries ADD COLUMN ${name} INTEGER;`);
  }
  h.gallery = await h.DB.prepare('SELECT * FROM galleries WHERE id=?').bind(fixtureIds.gallery).first();
  h.actor = { id: fixtureIds.admin, role: 'admin' };
  h.confirmation = { confirmed: true, confirmName: h.gallery.name };
  h.remove = (confirmation = h.confirmation, actor = h.actor) => deleteGallery(h.env, h.gallery.id, actor, confirmation);
  return h;
}

test('gallery deletion requires an active administrator and both explicit confirmations', async t => {
  const h = await deletionFixture(t);
  for (const confirmation of [undefined, {}, { confirmed: true }, { confirmName: h.gallery.name }, { confirmed: 'true', confirmName: h.gallery.name }, { confirmed: true, confirmName: h.gallery.name + ' wrong' }]) {
    await assert.rejects(h.remove(confirmation === undefined ? null : confirmation), error => error.status === 400 && error.code === 'deletion_confirmation_required');
  }
  for (const actor of [{ id: fixtureIds.customer, role: 'customer' }, { id: fixtureIds.customer, role: 'admin' }, { id: 'missing-admin', role: 'admin' }]) {
    await assert.rejects(h.remove(h.confirmation, actor), error => error.status === 403);
  }
  await h.DB.prepare('UPDATE users SET disabled=1 WHERE id=?').bind(fixtureIds.admin).run();
  await assert.rejects(h.remove(), error => error.status === 403);
  assert.equal((await h.DB.prepare('SELECT deleted_at FROM galleries WHERE id=?').bind(h.gallery.id).first()).deleted_at, null);
  const image = await h.DB.prepare('SELECT original_key FROM images WHERE gallery_id=? LIMIT 1').bind(h.gallery.id).first();
  assert.ok(await h.PHOTOS.head(image.original_key));
});

test('deleting a gallery permanently removes only its photo objects and preserves complete financial records', async t => {
  const h = await deletionFixture(t); const now = Date.now();
  const image = await h.DB.prepare('SELECT * FROM images WHERE gallery_id=? LIMIT 1').bind(h.gallery.id).first();
  await h.PHOTOS.put('delete-test/protected-preview', 'watermarked');
  await h.DB.prepare('UPDATE images SET protected_preview_key=? WHERE id=?').bind('delete-test/protected-preview', image.id).run();
  await h.PHOTOS.put('delete-test/invoice.pdf', 'PRIVATE-INVOICE');
  await h.DB.prepare('INSERT INTO gallery_invoices(id,gallery_id,user_id,r2_key,filename,size,uploaded_at,uploaded_by) VALUES(?,?,?,?,?,?,?,?)').bind('delete-invoice', h.gallery.id, fixtureIds.customer, 'delete-test/invoice.pdf', 'Rechnung.pdf', 15, now, fixtureIds.admin).run();
  await h.DB.prepare("INSERT INTO orders(id,user_id,gallery_id,package_id,package_name,amount_cents,currency,status,payment_method,terms_version,consent_at,created_at,receipt_text,receipt_email_json,receipt_sent_at) VALUES(?,?,?,?,?,1000,'EUR','paid','transfer','test-terms',?,?,?, ?,?)")
    .bind('delete-paid-order', fixtureIds.customer, h.gallery.id, fixtureIds.singlePackage, 'Ein Lieblingsbild', now, now, 'Original contractual receipt', '{"invoice":{"key":"delete-test/invoice.pdf"}}', now).run();
  await h.DB.prepare('INSERT INTO order_images(order_id,image_id) VALUES(?,?)').bind('delete-paid-order', image.id).run();
  await h.DB.prepare('INSERT INTO favorites(user_id,image_id) VALUES(?,?)').bind(fixtureIds.customer, image.id).run();
  await h.DB.prepare("INSERT INTO auth_tokens(token_hash,user_id,purpose,gallery_id,expires_at,created_at) VALUES('delete-token',?,'setup',?,?,?)").bind(fixtureIds.customer, h.gallery.id, now + 60000, now).run();
  await h.DB.prepare("INSERT INTO download_notifications(id,user_id,gallery_id,order_id,image_ids_json,created_at) VALUES('delete-pending-notice',?,?,?, ?,?)").bind(fixtureIds.customer, h.gallery.id, 'delete-paid-order', JSON.stringify([image.id]), now).run();
  const orderBefore = await h.DB.prepare('SELECT * FROM orders WHERE id=?').bind('delete-paid-order').first();
  const actualDelete = h.PHOTOS.delete.bind(h.PHOTOS);
  h.PHOTOS.delete = async keys => {
    const deleted = await h.DB.prepare('SELECT deleted_at,published FROM galleries WHERE id=?').bind(h.gallery.id).first();
    assert.ok(deleted.deleted_at); assert.equal(deleted.published, 0);
    await actualDelete(keys);
  };
  assert.deepEqual(await h.remove(), { deleted: true, cleanupPending: false, remainingMedia: 0 });
  const after = await h.DB.prepare('SELECT * FROM galleries WHERE id=?').bind(h.gallery.id).first();
  assert.ok(after.deleted_at); assert.ok(after.media_deleted_at); assert.equal(after.cover_image_id, null);
  for (const row of (await h.DB.prepare('SELECT * FROM images WHERE gallery_id=?').bind(h.gallery.id).all()).results) {
    for (const key of [row.original_key, row.preview_key, row.protected_preview_key].filter(Boolean)) assert.equal(await h.PHOTOS.head(key), null);
  }
  assert.deepEqual(await h.DB.prepare('SELECT * FROM orders WHERE id=?').bind('delete-paid-order').first(), orderBefore);
  assert.equal((await h.DB.prepare('SELECT COUNT(*) AS n FROM order_images WHERE order_id=?').bind('delete-paid-order').first()).n, 1);
  assert.equal(await (await h.PHOTOS.get('delete-test/invoice.pdf')).text(), 'PRIVATE-INVOICE');
  assert.equal((await h.DB.prepare('SELECT COUNT(*) AS n FROM gallery_members WHERE gallery_id=?').bind(h.gallery.id).first()).n, 0);
  assert.equal((await h.DB.prepare('SELECT COUNT(*) AS n FROM packages WHERE gallery_id=? AND active=1').bind(h.gallery.id).first()).n, 0);
  assert.equal((await h.DB.prepare("SELECT COUNT(*) AS n FROM auth_tokens WHERE token_hash='delete-token'").first()).n, 0);
  assert.ok((await h.DB.prepare("SELECT cancelled_at FROM download_notifications WHERE id='delete-pending-notice'").first()).cancelled_at);
  const unrelated = await h.DB.prepare("SELECT original_key FROM images WHERE id='local-foreign-image'").first();
  assert.ok(await h.PHOTOS.head(unrelated.original_key));
  assert.equal((await h.DB.prepare('SELECT deleted_at FROM galleries WHERE id=?').bind(fixtureIds.otherGallery).first()).deleted_at, null);
  assert.equal(h.mail.messages.length, 0);
});

test('storage failure leaves access revoked and a retry safely completes permanent photo cleanup', async t => {
  const h = await deletionFixture(t); const actualDelete = h.PHOTOS.delete.bind(h.PHOTOS);
  h.PHOTOS.delete = async () => { throw new Error('Storage unavailable'); };
  const first = await h.remove();
  assert.equal(first.deleted, true); assert.equal(first.cleanupPending, true); assert.ok(first.remainingMedia > 0);
  const before = await h.DB.prepare('SELECT deleted_at,media_deleted_at FROM galleries WHERE id=?').bind(h.gallery.id).first();
  assert.ok(before.deleted_at); assert.equal(before.media_deleted_at, null);
  h.PHOTOS.delete = actualDelete;
  assert.deepEqual(await h.remove(), { deleted: true, cleanupPending: false, remainingMedia: 0 });
  assert.deepEqual(await h.remove(), { deleted: true, cleanupPending: false, remainingMedia: 0 });
  const after = await h.DB.prepare('SELECT deleted_at,media_deleted_at FROM galleries WHERE id=?').bind(h.gallery.id).first();
  assert.equal(after.deleted_at, before.deleted_at); assert.ok(after.media_deleted_at);
  assert.equal((await h.DB.prepare("SELECT COUNT(*) AS n FROM audit_events WHERE action='gallery_deleted' AND target_id=?").bind(h.gallery.id).first()).n, 1);
});

test('gallery deletion changes are atomic and database failure never starts object cleanup', async t => {
  const h = await deletionFixture(t); const actualBatch = h.DB.batch.bind(h.DB); let storageCalls = 0;
  h.PHOTOS.delete = async () => { storageCalls++; };
  h.DB.batch = async statements => actualBatch([...statements, h.DB.prepare("INSERT INTO gallery_members(gallery_id,user_id) VALUES('nonexistent','nonexistent')")]);
  await assert.rejects(h.remove());
  const gallery = await h.DB.prepare('SELECT deleted_at,published FROM galleries WHERE id=?').bind(h.gallery.id).first();
  assert.equal(gallery.deleted_at, null); assert.equal(gallery.published, 1); assert.equal(storageCalls, 0);
  assert.ok((await h.DB.prepare('SELECT COUNT(*) AS n FROM gallery_members WHERE gallery_id=?').bind(h.gallery.id).first()).n > 0);
});

test('a concurrent gallery rename invalidates the typed confirmation without changing access or deleting media', async t => {
  const h = await deletionFixture(t); const actualBatch = h.DB.batch.bind(h.DB); let storageCalls = 0;
  h.PHOTOS.delete = async () => { storageCalls++; };
  h.DB.batch = async statements => {
    await h.DB.prepare('UPDATE galleries SET name=? WHERE id=?').bind('Renamed meanwhile',h.gallery.id).run();
    return actualBatch(statements);
  };
  await assert.rejects(h.remove(),error => error.status === 409 && error.code === 'gallery_changed');
  const gallery = await h.DB.prepare('SELECT deleted_at,published FROM galleries WHERE id=?').bind(h.gallery.id).first();
  assert.equal(gallery.deleted_at,null); assert.equal(gallery.published,1); assert.equal(storageCalls,0);
  assert.ok((await h.DB.prepare('SELECT COUNT(*) AS n FROM gallery_members WHERE gallery_id=?').bind(h.gallery.id).first()).n > 0);
  assert.ok((await h.DB.prepare('SELECT COUNT(*) AS n FROM packages WHERE gallery_id=? AND active=1').bind(h.gallery.id).first()).n > 0);
  assert.equal((await h.DB.prepare("SELECT COUNT(*) AS n FROM audit_events WHERE action='gallery_deleted' AND target_id=?").bind(h.gallery.id).first()).n,0);
});

test('media purge refuses live galleries and uses R2 bulk delete batches of at most 1000 keys', async t => {
  const h = await deletionFixture(t);
  await assert.rejects(purgeDeletedGalleryMedia(h.env, h.gallery.id), error => error.code === 'gallery_not_deleted');
  await h.DB.exec(`WITH RECURSIVE numbers(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM numbers WHERE n<1001)
    INSERT INTO images(id,gallery_id,title,preview_key,original_key,preview_type,original_type,width,height,created_at)
    SELECT 'delete-bulk-'||n,'${fixtureIds.gallery}','Bulk','delete-bulk/'||n||'/preview','delete-bulk/'||n||'/original','image/jpeg','image/jpeg',100,100,1 FROM numbers;`);
  const batches = []; h.PHOTOS.delete = async keys => { batches.push(keys); };
  assert.equal((await h.remove()).cleanupPending, false);
  assert.ok(batches.length >= 3); assert.ok(batches.every(keys => keys.length <= 1000));
  assert.equal(new Set(batches.flat()).size, batches.flat().length);
  assert.ok(batches.flat().includes('delete-bulk/1001/original'));
});

test('missing gallery-deletion migration fails before modifying existing galleries', async t => {
  const h = await deletionFixture(t);
  await h.DB.exec('ALTER TABLE galleries DROP COLUMN deleted_at;');
  await assert.rejects(h.remove(), error => error.status === 503 && error.code === 'migration_required');
  assert.equal((await h.DB.prepare('SELECT published FROM galleries WHERE id=?').bind(h.gallery.id).first()).published, 1);
  const image = await h.DB.prepare('SELECT original_key FROM images WHERE gallery_id=? LIMIT 1').bind(h.gallery.id).first();
  assert.ok(await h.PHOTOS.head(image.original_key));
});
