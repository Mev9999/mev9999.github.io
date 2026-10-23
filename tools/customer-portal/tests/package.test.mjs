import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHarness, ORIGIN } from './harness.mjs';
const { bundleWorker, bundleCleanupWorker } = createRequire(import.meta.url)('../bundle-worker.cjs');

test('dashboard worker is self-contained and sends the same styled reset email through real API code', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'liza-worker-package-'));
  const h = await createHarness();
  try {
    const code = bundleWorker();
    assert.doesNotMatch(code, /^\s*import\s/m);
    const filename = path.join(directory, 'worker.mjs');
    await writeFile(filename, code);
    const { default: bundled } = await import(pathToFileURL(filename).href);
    const pending = [];
    const request = new Request(ORIGIN + '/api/auth/request', {
      method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'emina@example.test', purpose: 'reset' }),
    });
    const response = await bundled.fetch(request, h.env, { waitUntil(p) { pending.push(p); } });
    await Promise.all(pending);
    assert.equal(response.status, 200);
    assert.equal(h.mail.messages.length, 1);
    const message = h.mail.messages[0];
    assert.equal(message.to, 'emina@example.test');
    assert.match(message.html, /<table\b/);
    assert.match(message.text, /\?token=/);
    assert.doesNotMatch(message.html, /<script|onerror=/i);
  } finally {
    await h.close();
    // Only remove the verified, task-created temp directory.
    assert.equal(path.dirname(directory), os.tmpdir());
    assert.ok(path.basename(directory).startsWith('liza-worker-package-'));
    await rm(directory, { recursive: true, force: true });
  }
});

test('dashboard cleanup bundle closes and purges only opted-in school photos without touching receipts', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'liza-cleanup-package-'));
  const h = await createHarness();
  try {
    const code = bundleCleanupWorker();
    assert.doesNotMatch(code, /^\s*import\s/m);
    const filename = path.join(directory, 'cleanup.mjs');
    await writeFile(filename, code);
    const { default: bundled } = await import(pathToFileURL(filename).href);
    const now = Date.now(), started = now - 121 * 86_400_000;
    await h.DB.prepare("INSERT INTO galleries(id,name,shooting_date,published,retention_policy,retention_started_at,expires_at,created_at,updated_at) VALUES('retention-bundle','School test','2026-01-01',1,'school-v1',?,?,?,?)").bind(started, started + 90 * 86_400_000, started, started).run();
    const prefix = 'galleries/retention-bundle/bundle-image/';
    await h.DB.prepare("INSERT INTO images(id,gallery_id,title,preview_key,original_key,preview_type,original_type,width,height,created_at) VALUES('bundle-image','retention-bundle','Test',?,?,'image/jpeg','image/jpeg',1,1,?)").bind(prefix + 'preview.jpg', prefix + 'original.jpg', started).run();
    await h.PHOTOS.put(prefix + 'preview.jpg', new Uint8Array([1]));
    await h.PHOTOS.put(prefix + 'original.jpg', new Uint8Array([2]));
    await h.PHOTOS.put(prefix + 'old-version.jpg', new Uint8Array([3]));
    await h.PHOTOS.put('invoices/retention-bundle/receipt.pdf', new Uint8Array([4]));
    await h.PHOTOS.put('galleries/legacy/other/photo.jpg', new Uint8Array([5]));
    await bundled.scheduled({}, h.env);
    assert.equal((await h.DB.prepare("SELECT published FROM galleries WHERE id='retention-bundle'").first()).published, 0);
    assert.ok((await h.DB.prepare("SELECT retention_purged_at FROM images WHERE id='bundle-image'").first()).retention_purged_at);
    assert.equal((await h.PHOTOS.list({ prefix })).objects.length, 0);
    assert.ok(await h.PHOTOS.head('invoices/retention-bundle/receipt.pdf'));
    assert.ok(await h.PHOTOS.head('galleries/legacy/other/photo.jpg'));
    const publicResponse = await bundled.fetch(new Request('https://cleanup.example.test/'));
    assert.equal(publicResponse.status, 404);
  } finally {
    await h.close();
    assert.equal(path.dirname(directory), os.tmpdir());
    assert.ok(path.basename(directory).startsWith('liza-cleanup-package-'));
    await rm(directory, { recursive: true, force: true });
  }
});

test('self-contained dashboard bundle creates and activates a voucher with an embedded-font PDF', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'liza-voucher-package-'));
  const h = await createHarness();
  try {
    const code = bundleWorker();
    assert.doesNotMatch(code, /^\s*import\s/m);
    const filename = path.join(directory, 'voucher-worker.mjs');
    await writeFile(filename, code);
    const { default: bundled } = await import(pathToFileURL(filename).href);
    const pending = [];
    const context = { waitUntil(promise) { pending.push(promise); } };
    async function request(route, { method = 'GET', body, cookie, csrf } = {}) {
      const headers = new Headers({ Origin: ORIGIN });
      if (cookie) headers.set('Cookie', cookie);
      if (csrf) headers.set('X-CSRF-Token', csrf);
      if (body !== undefined) headers.set('Content-Type', 'application/json');
      const response = await bundled.fetch(new Request(ORIGIN + route, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }), h.env, context);
      await Promise.all(pending.splice(0));
      const data = (response.headers.get('content-type') || '').includes('application/json') ? await response.clone().json() : null;
      return { response, data, status: response.status };
    }
    const created = await request('/api/vouchers/orders', { method: 'POST', body: {
      amountCents: 15000, buyerName: 'Lokale Paket-Testkäuferin', buyerEmail: 'voucher-package@example.test',
      buyerAddress: 'Teststraße 2\n8010 Graz', giftTo: 'Željka & Đorđe', giftFrom: 'Emina',
      message: 'Für schöne Erinnerungen. Sretno fotografisanje!', language: 'bs', termsAccepted: true, idempotencyKey: crypto.randomUUID(),
    } });
    assert.equal(created.status, 201, created.data?.error);
    const { order, accessToken } = created.data;
    assert.equal(order.status, 'pending');
    assert.equal(order.code, null);
    const pdfRoute = `/api/vouchers/orders/${order.id}/pdf?token=${accessToken}`;
    assert.equal((await request(pdfRoute)).status, 409, 'unpaid buyer cannot receive a redeemable PDF');
    const logged = await request('/api/auth/login', { method: 'POST', body: { email: 'emina@example.test', password: 'Testverwaltung2026!' } });
    assert.equal(logged.status, 200);
    const cookie = logged.response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
    const activated = await request(`/api/admin/vouchers/${order.id}/paid`, { method: 'POST', body: {}, cookie, csrf: logged.data.csrf });
    assert.equal(activated.status, 200, activated.data?.error);
    assert.equal(activated.data.emailSent, true);
    assert.equal(activated.data.voucher.status, 'active');
    assert.ok(activated.data.voucher.code);
    const mail = h.mail.messages.find(message => message.to === 'voucher-package@example.test' && message.attachments?.some(file => file.content_type === 'application/pdf'));
    assert.ok(mail, 'only the local mail sink receives the paid gift PDF');
    const attachment = mail.attachments.find(file => file.content_type === 'application/pdf');
    const attached = Buffer.from(attachment.content, 'base64');
    assert.equal(attached.subarray(0, 5).toString(), '%PDF-');
    assert.ok(attached.includes(Buffer.from('/FontFile2')), 'printable PDF embeds its font');
    assert.ok(attached.includes(Buffer.from('/ToUnicode')), 'accented gift text has Unicode extraction mapping');
    const downloaded = await request(pdfRoute);
    assert.equal(downloaded.status, 200);
    assert.equal(downloaded.response.headers.get('content-type'), 'application/pdf');
    assert.match(downloaded.response.headers.get('cache-control'), /no-store/);
    const downloadedBytes = Buffer.from(await downloaded.response.arrayBuffer());
    assert.deepEqual(downloadedBytes, attached, 'buyer download and mailed voucher are the same document');
    assert.equal((await request(`/api/vouchers/orders/${order.id}/pdf?token=${'0'.repeat(64)}`)).status, 404);
  } finally {
    await h.close();
    assert.equal(path.dirname(directory), os.tmpdir());
    assert.ok(path.basename(directory).startsWith('liza-voucher-package-'));
    await rm(directory, { recursive: true, force: true });
  }
});
