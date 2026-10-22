import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createHarness, cookieValue, fixtureIds } from './harness.mjs';
import { runSchoolRetention, recordSchoolDeliveryRetention, sixCalendarMonthsAfter } from '../backend/school-retention.mjs';

const DAY = 86400000;
const query = (h, sql, ...values) => h.DB.prepare(sql).bind(...values);
async function setup(t) {
  const h = await createHarness(); t.after(() => h.close());
  h.start = Date.now() - 220 * DAY; h.gallery = 'retention-gallery'; h.pack = 'retention-package';
  await query(h, "INSERT INTO galleries(id,name,shooting_date,published,created_at,updated_at,shooting_type,pricing_mode,require_final_delivery,retention_policy,retention_started_at,expires_at) VALUES(?,'Nursery','2026-01-01',1,?,?,'school','images',1,'school-v1',?,?)", h.gallery, h.start, h.start, h.start, h.start + 90 * DAY).run();
  await query(h, "INSERT INTO packages(id,gallery_id,name,image_count,price_cents,currency) VALUES(?,?,'Ein Bild',1,1000,'EUR')", h.pack, h.gallery).run();
  for (const user of [fixtureIds.customer, fixtureIds.secondCustomer]) await query(h, 'INSERT INTO gallery_members(gallery_id,user_id) VALUES(?,?)', h.gallery, user).run();
  h.image = async (id, final = true) => {
    const prefix = `galleries/${h.gallery}/${id}/`;
    await h.PHOTOS.put(prefix + 'original', 'ORIGINAL'); await h.PHOTOS.put(prefix + 'preview', 'PREVIEW');
    await query(h, "INSERT INTO images(id,gallery_id,title,preview_key,original_key,preview_type,original_type,width,height,position,created_at,final_ready) VALUES(?,?,?, ?,?,'image/jpeg','image/jpeg',100,100,0,?,?)", id, h.gallery, id, prefix + 'preview', prefix + 'original', h.start, Number(final)).run();
    return prefix;
  };
  h.order = async (id, imageIds, { user = fixtureIds.customer, status = 'paid', ready = null } = {}) => {
    await query(h, "INSERT INTO orders(id,user_id,gallery_id,package_id,package_name,amount_cents,currency,status,payment_method,terms_version,consent_at,created_at,receipt_sent_at,receipt_text,delivery_ready_at,delivery_delete_at) VALUES(?,?,?,?,'Ein Bild',1000,'EUR',?,'transfer','test',?,?,?,'Immutable receipt',?,?)", id, user, h.gallery, h.pack, status, h.start, h.start, h.start, ready, ready == null ? null : sixCalendarMonthsAfter(ready)).run();
    for (const image of imageIds) await query(h, 'INSERT INTO order_images(order_id,image_id) VALUES(?,?)', id, image).run();
  };
  h.login = async (kind = 'admin') => {
    const r = await h.request('/api/auth/login', { method: 'POST', body: kind === 'admin' ? { email: 'emina@example.test', password: 'Testverwaltung2026!' } : { email: 'customer@example.test', password: 'Testgalerie2026!' } });
    assert.equal(r.status, 200); return { cookie: cookieValue(r), csrf: r.data.csrf };
  };
  return h;
}

test('new school galleries opt in, start only on first publication, and cannot reset or change expiry', async t => {
  const h = await setup(t), admin = await h.login();
  const create = await h.request('/api/admin/galleries', { ...admin, method: 'POST', body: { name: 'New school', date: '2026-10-22', shootingType: 'school' } });
  assert.equal(create.status, 201, JSON.stringify(create.data));
  const id = create.data.gallery.id; assert.equal(create.data.gallery.retention.startedAt, null); assert.equal(create.data.gallery.expiresAt, null);
  const route = `/api/admin/galleries/${id}`;
  const first = await h.request(route, { ...admin, method: 'PATCH', body: { published: true } });
  assert.equal(first.status, 200, JSON.stringify(first.data));
  const policy = first.data.gallery.retention;
  assert.equal(Date.parse(policy.closesAt) - Date.parse(policy.startedAt), 90 * DAY);
  assert.equal(Date.parse(policy.unboughtDeleteAt) - Date.parse(policy.startedAt), 120 * DAY);
  await h.request(route, { ...admin, method: 'PATCH', body: { published: false } });
  const again = await h.request(route, { ...admin, method: 'PATCH', body: { published: true, shootingType: 'family' } });
  assert.deepEqual(again.data.gallery.retention, policy);
  assert.equal((await h.request(route, { ...admin, method: 'PATCH', body: { expiresAt: '2030-01-01T00:00:00Z' } })).status, 400);
  await query(h, 'UPDATE galleries SET retention_started_at=?,expires_at=? WHERE id=?', h.start, h.start + 90 * DAY, id).run();
  assert.equal((await h.request(route, { ...admin, method: 'PATCH', body: { published: true } })).status, 409);
  const legacy = await h.request(`/api/admin/galleries/${fixtureIds.gallery}`, admin);
  assert.equal(legacy.data.gallery.retention, null);
  const other = await h.request('/api/admin/galleries', { ...admin, method: 'POST', body: { name: 'Family', date: '2026-10-22', shootingType: 'family' } });
  assert.equal(other.data.gallery.retention, null);
});

test('school creation fails closed when the retention migration is missing', async t => {
  const h = await createHarness(); t.after(() => h.close());
  await h.DB.exec('DROP TABLE manual_delivery_retention');
  const login = await h.request('/api/auth/login', { method: 'POST', body: { email: 'emina@example.test', password: 'Testverwaltung2026!' } });
  const r = await h.request('/api/admin/galleries', { cookie: cookieValue(login), csrf: login.data.csrf, method: 'POST', body: { name: 'Missing migration', date: '2026-10-22', shootingType: 'school' } });
  assert.equal(r.status, 503); assert.equal(r.data.code, 'migration_required');
  assert.equal(await query(h, "SELECT id FROM galleries WHERE name='Missing migration'").first(), null);
});

test('six calendar months clamp month ends and preserve UTC time across leap years', () => {
  assert.equal(new Date(sixCalendarMonthsAfter(Date.parse('2026-08-31T14:12:23.456Z'))).toISOString(), '2027-02-28T14:12:23.456Z');
  assert.equal(new Date(sixCalendarMonthsAfter(Date.parse('2027-08-31T14:12:23.456Z'))).toISOString(), '2028-02-29T14:12:23.456Z');
});

test('gallery closes at 90 days, unpaid files and orphan versions are purged, receipts and legacy galleries remain', async t => {
  const h = await setup(t), prefix = await h.image('unbought');
  await h.PHOTOS.put(prefix + 'versions/old/preview', 'OLD'); await h.PHOTOS.put('invoices/retention-test.pdf', 'INVOICE');
  await h.order('pending', ['unbought'], { status: 'pending' });
  const before = await query(h, 'SELECT * FROM orders WHERE id=?', 'pending').first();
  await runSchoolRetention(h.env, h.start + 90 * DAY - 1);
  assert.ok(await h.PHOTOS.head(prefix + 'original'));
  await runSchoolRetention(h.env, h.start + 90 * DAY);
  assert.ok(await h.PHOTOS.head(prefix + 'original'));
  await runSchoolRetention(h.env, h.start + 97 * DAY - 1);
  assert.ok(await h.PHOTOS.head(prefix + 'original'));
  await runSchoolRetention(h.env, h.start + 97 * DAY);
  const gallery = await query(h, 'SELECT published FROM galleries WHERE id=?', h.gallery).first(); assert.equal(gallery.published, 0);
  assert.equal((await h.PHOTOS.list({ prefix })).objects.length, 0);
  assert.deepEqual(await query(h, 'SELECT * FROM orders WHERE id=?', 'pending').first(), before);
  assert.ok(await h.PHOTOS.head('invoices/retention-test.pdf'));
  const legacy = await query(h, 'SELECT original_key FROM images WHERE id=?', 'local-image-3').first(); assert.ok(await h.PHOTOS.head(legacy.original_key));
  const admin = await h.login();
  assert.equal((await h.request('/api/images/unbought?kind=original', admin)).status, 404);
  assert.equal((await h.request('/api/admin/orders/pending/paid', { ...admin, method: 'POST', body: {} })).status, 409);
  assert.equal((await query(h, 'SELECT status FROM orders WHERE id=?', 'pending').first()).status, 'pending');
});

test('paid unfinished orders survive cleanup, final copies share the latest purchaser deadline', async t => {
  const h = await setup(t); const unfinished = await h.image('unfinished', false), shared = await h.image('shared');
  await h.order('unfinished-order', ['unfinished']);
  await h.order('early', ['shared'], { ready: h.start + DAY });
  await h.order('later', ['shared'], { user: fixtureIds.secondCustomer, ready: h.start + 70 * DAY });
  const later = sixCalendarMonthsAfter(h.start + 70 * DAY);
  await runSchoolRetention(h.env, later - 1);
  assert.ok(await h.PHOTOS.head(shared + 'original')); assert.ok(await h.PHOTOS.head(unfinished + 'original'));
  await runSchoolRetention(h.env, later);
  assert.equal(await h.PHOTOS.head(shared + 'original'), null); assert.ok(await h.PHOTOS.head(unfinished + 'original'));
  assert.equal((await query(h, 'SELECT delivery_ready_at FROM orders WHERE id=?', 'unfinished-order').first()).delivery_ready_at, null);
});

test('delivery clock waits for final, published and unblocked access, never resets on retries or replacements', async t => {
  const h = await setup(t); await h.image('ready'); await h.order('ready-order', ['ready']);
  await query(h, 'UPDATE galleries SET published=0 WHERE id=?', h.gallery).run();
  await recordSchoolDeliveryRetention(h.env, h.gallery, h.start + DAY);
  assert.equal((await query(h, 'SELECT delivery_ready_at FROM orders WHERE id=?', 'ready-order').first()).delivery_ready_at, null);
  await query(h, 'UPDATE galleries SET published=1 WHERE id=?', h.gallery).run();
  await query(h, 'INSERT INTO image_download_blocks(user_id,image_id,blocked_at,blocked_by) VALUES(?,?,?,?)', fixtureIds.customer, 'ready', h.start, fixtureIds.admin).run();
  await recordSchoolDeliveryRetention(h.env, h.gallery, h.start + 2 * DAY);
  assert.equal((await query(h, 'SELECT delivery_ready_at FROM orders WHERE id=?', 'ready-order').first()).delivery_ready_at, null);
  await query(h, 'DELETE FROM image_download_blocks WHERE image_id=?', 'ready').run();
  await recordSchoolDeliveryRetention(h.env, h.gallery, h.start + 3 * DAY);
  const first = await query(h, 'SELECT delivery_ready_at,delivery_delete_at FROM orders WHERE id=?', 'ready-order').first();
  assert.equal(first.delivery_ready_at, h.start + 3 * DAY);
  await recordSchoolDeliveryRetention(h.env, h.gallery, h.start + 4 * DAY);
  assert.deepEqual(await query(h, 'SELECT delivery_ready_at,delivery_delete_at FROM orders WHERE id=?', 'ready-order').first(), first);
});

test('manual releases receive six-month storage protection independently of portal orders', async t => {
  const h = await setup(t), prefix = await h.image('manual');
  await query(h, 'INSERT INTO manual_releases(user_id,image_id,released_at,released_by) VALUES(?,?,?,?)', fixtureIds.customer, 'manual', h.start, fixtureIds.admin).run();
  await recordSchoolDeliveryRetention(h.env, h.gallery, h.start + DAY);
  const retention = await query(h, 'SELECT * FROM manual_delivery_retention WHERE image_id=?', 'manual').first();
  assert.equal(retention.ready_at, h.start + DAY);
  await runSchoolRetention(h.env, h.start + 120 * DAY); assert.ok(await h.PHOTOS.head(prefix + 'original'));
  await runSchoolRetention(h.env, retention.delete_at); assert.equal(await h.PHOTOS.head(prefix + 'original'), null);
});

test('failed storage cleanup revokes access, keeps admin favorites usable, retries and removes late upload keys', async t => {
  const h = await setup(t), prefix = await h.image('retry');
  await query(h, 'INSERT INTO favorites(user_id,image_id) VALUES(?,?)', fixtureIds.customer, 'retry').run();
  const remove = h.PHOTOS.delete.bind(h.PHOTOS); h.PHOTOS.delete = async () => { throw new Error('Storage unavailable'); };
  await assert.rejects(runSchoolRetention(h.env, h.start + 90 * DAY), /pending storage cleanup/);
  const claimed = await query(h, 'SELECT * FROM images WHERE id=?', 'retry').first(); assert.ok(claimed.retention_purge_started_at); assert.equal(claimed.retention_purged_at, null);
  const admin = await h.login(); const detail = await h.request(`/api/admin/galleries/${h.gallery}`, admin);
  assert.equal(detail.status, 200, JSON.stringify(detail.data)); assert.equal(detail.data.images.length, 0); assert.equal(detail.data.customerFavorites.count, 0);
  h.PHOTOS.delete = remove; await runSchoolRetention(h.env, h.start + 91 * DAY);
  assert.equal((await h.PHOTOS.list({ prefix })).objects.length, 0);
  await h.PHOTOS.put(prefix + 'finals/late/preview', 'LATE UNCOMMITTED UPLOAD');
  await runSchoolRetention(h.env, h.start + 92 * DAY);
  assert.equal((await h.PHOTOS.list({ prefix })).objects.length, 0);
});

test('failed retry backlog cannot starve newly eligible cleanup', async t => {
  const h = await setup(t); await h.image('bad'); const good = await h.image('good');
  await query(h, 'UPDATE images SET retention_purge_started_at=? WHERE id=?', h.start + 90 * DAY, 'bad').run();
  const remove = h.PHOTOS.delete.bind(h.PHOTOS); h.PHOTOS.delete = async keys => { if ([keys].flat().some(key => key.includes('/bad/'))) throw new Error('Single object failed'); return remove(keys); };
  await assert.rejects(runSchoolRetention(h.env, h.start + 91 * DAY, 1), /pending storage cleanup/);
  assert.equal(await h.PHOTOS.head(good + 'original'), null);
});

const uploadForm = () => {
  const data = new FormData(), jpg = Uint8Array.from([255,216,255,1,2,3]);
  for (const name of ['original','preview']) data.set(name, new Blob([jpg], { type: 'image/jpeg' }), name + '.jpg');
  data.set('width', '100'); data.set('height', '100'); return data;
};
test('an in-flight final upload cannot resurrect a purged image, even when immediate object cleanup fails', async t => {
  const h = await setup(t), prefix = await h.image('upload-race'), admin = await h.login();
  const put = h.PHOTOS.put.bind(h.PHOTOS), remove = h.PHOTOS.delete.bind(h.PHOTOS); let raced = false;
  h.PHOTOS.put = async (key, ...args) => {
    if (!raced && key.includes('/finals/')) {
      raced = true; await runSchoolRetention(h.env, h.start + 91 * DAY);
      h.PHOTOS.delete = async () => { throw new Error('Immediate cleanup failed'); };
    }
    return put(key, ...args);
  };
  const r = await h.request(`/api/admin/galleries/${h.gallery}/images/upload-race/final`, { ...admin, method: 'POST', body: uploadForm() });
  assert.equal(r.status, 409, JSON.stringify(r.data));
  assert.ok((await query(h, 'SELECT retention_purge_started_at FROM images WHERE id=?', 'upload-race').first()).retention_purge_started_at);
  h.PHOTOS.delete = remove; await runSchoolRetention(h.env, h.start + 92 * DAY);
  assert.equal((await h.PHOTOS.list({ prefix })).objects.length, 0);
});

test('failed first uploads are durably tracked and removed after expiry without an image row', async t => {
  const h = await setup(t), admin = await h.login();
  await query(h, 'UPDATE galleries SET retention_started_at=?,expires_at=? WHERE id=?', Date.now(), Date.now() + 90 * DAY, h.gallery).run();
  const put = h.PHOTOS.put.bind(h.PHOTOS), remove = h.PHOTOS.delete.bind(h.PHOTOS); let prefix;
  h.PHOTOS.put = async (key, ...args) => {
    prefix = key.slice(0, key.lastIndexOf('/') + 1);
    if (key.endsWith('/original')) await query(h, 'UPDATE galleries SET retention_started_at=?,expires_at=? WHERE id=?', h.start, h.start + 90 * DAY, h.gallery).run();
    return put(key, ...args);
  };
  h.PHOTOS.delete = async () => { throw new Error('Immediate cleanup failed'); };
  const r = await h.request(`/api/admin/galleries/${h.gallery}/images`, { ...admin, method: 'POST', body: uploadForm() });
  assert.equal(r.status, 409, JSON.stringify(r.data));
  assert.equal((await query(h, 'SELECT COUNT(*) AS n FROM school_retention_uploads WHERE gallery_id=?', h.gallery).first()).n, 1);
  assert.equal((await query(h, 'SELECT COUNT(*) AS n FROM images WHERE gallery_id=?', h.gallery).first()).n, 0);
  assert.ok((await h.PHOTOS.list({ prefix })).objects.length);
  h.PHOTOS.delete = remove; await runSchoolRetention(h.env, Date.now());
  assert.equal((await h.PHOTOS.list({ prefix })).objects.length, 0);
});

test('late real provider payments remain recorded but cannot send a download-ready email for expired files', async t => {
  const h = await setup(t); await h.image('late-payment'); await h.order('late-order', ['late-payment'], { status: 'pending' });
  await query(h, "UPDATE orders SET payment_method='stripe',provider_reference='checkout-late' WHERE id='late-order'").run();
  await runSchoolRetention(h.env, h.start + 120 * DAY);
  h.env.STRIPE_SECRET_KEY = 'test-only'; h.mail.clear();
  const payload = JSON.stringify({ id: 'late-paid-event', type: 'checkout.session.completed', data: { object: { id: 'checkout-late', metadata: { order_id: 'late-order' }, payment_status: 'paid', amount_total: 1000, currency: 'eur', client_reference_id: 'late-order' } } });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac('sha256', h.env.STRIPE_WEBHOOK_SECRET).update(`${timestamp}.${payload}`).digest('hex');
  const r = await h.request('/api/payments/stripe/webhook', { method: 'POST', body: payload, headers: { 'stripe-signature': `t=${timestamp},v1=${signature}` } });
  assert.equal(r.status, 200, JSON.stringify(r.data)); assert.equal(r.data.notification.code, 'image_files_expired');
  assert.equal((await query(h, "SELECT status FROM orders WHERE id='late-order'").first()).status, 'paid');
  assert.ok(await query(h, "SELECT id FROM payment_events WHERE id='stripe:late-paid-event'").first());
  assert.ok(await query(h, "SELECT id FROM audit_events WHERE action='payment_after_retention'").first());
  assert.equal(h.mail.messages.length, 0);
});

test('expired galleries reject new manual grants instead of creating an unbounded retention hold', async t => {
  const h = await setup(t); await h.image('not-granted'); const admin = await h.login();
  const r = await h.request(`/api/admin/galleries/${h.gallery}/release`, { ...admin, method: 'POST', body: { userId: fixtureIds.customer, imageIds: ['not-granted'] } });
  assert.equal(r.status, 409);
  assert.equal(await query(h, 'SELECT image_id FROM manual_releases WHERE image_id=?', 'not-granted').first(), null);
});

test('an order racing gallery expiry cannot commit after the initial access check', async t => {
  const h = await setup(t); await h.image('selection'); const client = await h.login('customer');
  await query(h, 'UPDATE galleries SET retention_started_at=?,expires_at=? WHERE id=?', Date.now(), Date.now() + 90 * DAY, h.gallery).run();
  const batch = h.DB.batch.bind(h.DB);
  h.DB.batch = async statements => {
    if (statements.some(statement => statement.sql.startsWith('INSERT OR IGNORE INTO orders('))) {
      await query(h, 'UPDATE galleries SET retention_started_at=?,expires_at=? WHERE id=?', h.start, h.start + 90 * DAY, h.gallery).run();
    }
    return batch(statements);
  };
  const r = await h.request('/api/orders', { ...client, method: 'POST', body: { galleryId: h.gallery, packageId: h.pack, imageIds: ['selection'], paymentMethod: 'transfer', termsAccepted: true, digitalConsent: true, earlyStartConsent: true, consentVersion: 'portal-digital-2026-10-19-consent-v4', consentLanguage: 'de' } });
  assert.equal(r.status, 409, JSON.stringify(r.data));
  assert.equal((await query(h, 'SELECT COUNT(*) AS n FROM orders WHERE gallery_id=?', h.gallery).first()).n, 0);
});
