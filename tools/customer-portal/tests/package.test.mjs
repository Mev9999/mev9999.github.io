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
