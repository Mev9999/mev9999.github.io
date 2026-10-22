import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { LocalD1, LocalR2 } from '../dev/adapters.mjs';

test('D1 local batch is atomic and supports real SQL constraints', async () => {
  const db = new LocalD1();
  try {
    await db.exec('CREATE TABLE items(id TEXT PRIMARY KEY, name TEXT NOT NULL)');
    await db.prepare('INSERT INTO items VALUES (?,?)').bind('1', 'first').run();
    assert.equal((await db.prepare('SELECT name FROM items WHERE id=?').bind('1').first()).name, 'first');
    await assert.rejects(db.batch([
      db.prepare('INSERT INTO items VALUES (?,?)').bind('2', 'second'),
      db.prepare('INSERT INTO items VALUES (?,?)').bind('1', 'duplicate'),
    ]));
    assert.equal(await db.prepare('SELECT name FROM items WHERE id=?').bind('2').first(), null);
    assert.deepEqual(await db.prepare('SELECT id,name FROM items').raw(), [['1', 'first']]);
  } finally { db.close(); }
});

test('R2 local adapter keeps metadata, streams bytes, and refuses path traversal', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'liza-r2-test-'));
  const bucket = new LocalR2(directory);
  try {
    await bucket.put('gallery/original/test.jpg', new Response('private bytes').body, { httpMetadata: { contentType: 'image/jpeg' } });
    const object = await bucket.get('gallery/original/test.jpg');
    assert.equal(object.httpMetadata.contentType, 'image/jpeg');
    assert.equal(await object.text(), 'private bytes');
    assert.equal(await new Response(object.body).text(), 'private bytes');
    assert.equal(await (await bucket.get('gallery/original/test.jpg', { range: { offset: 8, length: 5 } })).text(), 'bytes');
    await assert.rejects(bucket.get('../secret'));
    await assert.rejects(bucket.put('gallery\\secret', 'x'));
    await bucket.delete('gallery/original/test.jpg');
    assert.equal(await bucket.get('gallery/original/test.jpg'), null);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('R2 prefix pagination remains correct while previously listed objects are deleted', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'liza-r2-list-test-'));
  const bucket = new LocalR2(directory);
  try {
    for (const key of ['galleries/one/photo/old.jpg', 'galleries/one/photo/final.jpg', 'galleries/one/photo/preview.jpg', 'galleries/one/other/keep.jpg', 'invoices/keep.pdf']) {
      await bucket.put(key, key);
    }
    const first = await bucket.list({ prefix: 'galleries/one/photo/', limit: 2 });
    assert.deepEqual(first.objects.map(o => o.key), ['galleries/one/photo/final.jpg', 'galleries/one/photo/old.jpg']);
    assert.equal(first.truncated, true);
    await bucket.delete(first.objects.map(o => o.key));
    const next = await bucket.list({ prefix: 'galleries/one/photo/', cursor: first.cursor, limit: 2 });
    assert.deepEqual(next.objects.map(o => o.key), ['galleries/one/photo/preview.jpg']);
    assert.equal(next.truncated, false);
    await bucket.delete(next.objects.map(o => o.key));
    assert.deepEqual((await bucket.list({ prefix: 'galleries/one/photo/' })).objects, []);
    assert.deepEqual((await bucket.list()).objects.map(o => o.key), ['galleries/one/other/keep.jpg', 'invoices/keep.pdf']);
  } finally {
    assert.equal(path.dirname(directory), tmpdir());
    assert.ok(path.basename(directory).startsWith('liza-r2-list-test-'));
    await rm(directory, { recursive: true, force: true });
  }
});
