import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import cleanupWorker from './cleanup-worker.mjs';
import { LocalD1 } from '../dev/adapters.mjs';

const NOW = Date.UTC(2026, 9, 8, 3, 17);
const DAY = 86_400_000;
const TEMPORARY = new Set(['sessions', 'auth_tokens', 'rate_limits']);

async function fixture(t) {
  const DB = new LocalD1();
  t.after(() => DB.close());
  await DB.exec(await readFile(new URL('./schema.sql', import.meta.url), 'utf8'));
  await DB.exec(`
    INSERT INTO users(id,email,name,role,created_at) VALUES
      ('admin','admin@example.test','Test admin','admin',1),
      ('customer','customer@example.test','Test customer','customer',1);
    INSERT INTO galleries(id,name,shooting_date,published,expires_at,cover_image_id,created_at,updated_at)
      VALUES('gallery','Expired test gallery','2026-01-01',1,1,'image',1,1);
    INSERT INTO gallery_members(gallery_id,user_id) VALUES('gallery','customer');
    INSERT INTO images(id,gallery_id,title,preview_key,original_key,preview_type,original_type,width,height,created_at)
      VALUES('image','gallery','Test image','test/preview.jpg','test/original.jpg','image/jpeg','image/jpeg',100,100,1);
    INSERT INTO favorites(user_id,image_id) VALUES('customer','image');
    INSERT INTO packages(id,gallery_id,name,image_count,price_cents)
      VALUES('package','gallery','Test package',1,100);
    INSERT INTO orders(id,user_id,gallery_id,package_id,package_name,amount_cents,currency,status,payment_method,terms_version,consent_at,created_at,receipt_text)
      VALUES('order','customer','gallery','package','Test package',100,'EUR','paid','transfer','test',1,1,'Retained test receipt');
    INSERT INTO order_images(order_id,image_id) VALUES('order','image');
    INSERT INTO manual_releases(user_id,image_id,released_at,released_by) VALUES('customer','image',1,'admin');
    INSERT INTO payment_events(id,provider,order_id,created_at) VALUES('payment','test','order',1);
    INSERT INTO audit_events(id,user_id,action,target_id,created_at) VALUES('audit','admin','test','gallery',1);
  `);
  const statements = [];
  for (const [label, expires] of [['past', NOW - 1], ['boundary', NOW], ['future', NOW + DAY]]) {
    statements.push(DB.prepare('INSERT INTO sessions VALUES(?,?,?,?,?)').bind(`session-${label}`, 'customer', 'test-csrf', expires, 1));
    statements.push(DB.prepare('INSERT INTO auth_tokens VALUES(?,?,?,?,?)').bind(`auth-${label}`, 'customer', 'reset', expires, 1));
  }
  for (const [label, reset] of [['old', NOW - DAY - 1], ['boundary', NOW - DAY], ['recent', NOW - 1], ['future', NOW + DAY]]) {
    statements.push(DB.prepare('INSERT INTO rate_limits VALUES(?,?,?)').bind(`rate-${label}`, 2, reset));
  }
  await DB.batch(statements);
  return DB;
}

async function snapshot(DB, permanentOnly = false) {
  const tables = (await DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all()).results;
  const result = {};
  for (const { name } of tables) {
    if (permanentOnly && TEMPORARY.has(name)) continue;
    result[name] = (await DB.prepare(`SELECT * FROM "${name}" ORDER BY rowid`).all()).results;
  }
  return result;
}

test('cron removes only expired credentials and rate limits older than one day', async t => {
  const DB = await fixture(t);
  t.mock.method(Date, 'now', () => NOW);
  const permanent = await snapshot(DB, true);
  await cleanupWorker.scheduled({ cron: '17 3 * * *', scheduledTime: NOW }, { DB });
  assert.deepEqual((await DB.prepare('SELECT token_hash FROM sessions ORDER BY token_hash').all()).results, [{ token_hash: 'session-future' }]);
  assert.deepEqual((await DB.prepare('SELECT token_hash FROM auth_tokens ORDER BY token_hash').all()).results, [{ token_hash: 'auth-future' }]);
  assert.deepEqual((await DB.prepare('SELECT key FROM rate_limits ORDER BY key').all()).results, [
    { key: 'rate-boundary' }, { key: 'rate-future' }, { key: 'rate-recent' },
  ]);
  assert.deepEqual(await snapshot(DB, true), permanent, 'expired galleries, users, orders, image keys and all related rows are retained');
  const afterFirstRun = await snapshot(DB);
  await cleanupWorker.scheduled({}, { DB });
  assert.deepEqual(await snapshot(DB), afterFirstRun, 'repeating cleanup is harmless');
});

test('public requests always return 404 without accessing or changing the database', async t => {
  const DB = await fixture(t);
  const before = await snapshot(DB);
  const inaccessible = new Proxy(DB, { get() { throw new Error('HTTP must never access DB'); } });
  for (const method of ['GET', 'POST', 'DELETE']) {
    for (const path of ['/', '/cleanup', '/scheduled', '/cdn-cgi/local/scheduled']) {
      const response = await cleanupWorker.fetch(new Request(`https://cleanup.example.test${path}`, { method }), { DB: inaccessible });
      assert.equal(response.status, 404);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal(await response.text(), 'Not found');
    }
  }
  assert.deepEqual(await snapshot(DB), before);
  assert.equal((await cleanupWorker.fetch(new Request('https://cleanup.example.test/'), {})).status, 404);
});

test('scheduled execution fails visibly if the D1 binding is missing', async () => {
  for (const env of [undefined, {}, { DB: null }]) {
    await assert.rejects(cleanupWorker.scheduled({}, env), /requires the DB D1 binding/);
  }
});

test('database errors reject the scheduled event and roll back the cleanup batch', async t => {
  const DB = await fixture(t);
  t.mock.method(Date, 'now', () => NOW);
  await DB.exec('DROP TABLE auth_tokens');
  const before = await snapshot(DB);
  await assert.rejects(cleanupWorker.scheduled({}, { DB }), /auth_tokens/);
  assert.deepEqual(await snapshot(DB), before, 'the preceding session deletion is rolled back');
});
