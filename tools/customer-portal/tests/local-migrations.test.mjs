import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { LocalD1 } from '../dev/adapters.mjs';
import { applyLocalPortalUpgrades, initializeLocalPortalDatabase } from '../dev/migrations.mjs';

const schema = await readFile(new URL('../backend/schema.sql', import.meta.url), 'utf8');

test('retention upgrade preserves old school galleries and stays stable across repeated server starts', async () => {
  const DB = new LocalD1();
  try {
    const previous = schema
      .replace(/^  (?:retention_policy|retention_started_at|retention_purge_started_at|retention_purged_at|retention_checked_at|delivery_ready_at|delivery_delete_at)[^\n]*\n/gm, '')
      .replace(/^CREATE INDEX IF NOT EXISTS (?:galleries_retention|images_retention_purge)[^\n]*\n/gm, '')
      .replace(/CREATE TABLE IF NOT EXISTS (?:manual_delivery_retention|school_retention_uploads) \([\s\S]*?\n\);/g, '');
    await DB.exec(previous);
    await DB.prepare("INSERT INTO galleries(id,name,shooting_date,shooting_type,published,expires_at,created_at,updated_at) VALUES('old-school','Existing school','2026-01-01','school',1,123456789,1,1)").run();
    await initializeLocalPortalDatabase(DB);
    await initializeLocalPortalDatabase(DB);
    const old = await DB.prepare("SELECT retention_policy,retention_started_at,published,expires_at FROM galleries WHERE id='old-school'").first();
    assert.deepEqual(old, { retention_policy: null, retention_started_at: null, published: 1, expires_at: 123456789 });
    assert.equal((await DB.prepare('PRAGMA table_info(images)').all()).results.filter(row => row.name === 'retention_purge_started_at').length, 1);
    assert.equal((await DB.prepare('SELECT COUNT(*) AS n FROM manual_delivery_retention').first()).n, 0);
    assert.equal((await DB.prepare('SELECT COUNT(*) AS n FROM school_retention_uploads').first()).n, 0);
  } finally { DB.close(); }
});

test('local preview upgrade preserves existing users, galleries and passwords across repeated starts', async () => {
  const DB = new LocalD1();
  try {
    const previousSchema = schema.replace(/^  position INTEGER NOT NULL DEFAULT 0,\n/gm, '').replace(/^  (?:require_final_delivery|final_ready|source_filename|deleted_at|media_deleted_at|is_required|pricing_json|watermark_override|appearance_json|cover_layout|cover_height|grid_density|grid_gap|show_filenames|watermark_mode|typography|cover_decoration|protected_preview_key|protected_preview_type|watermark_fingerprint|payment_reference|receipt_email_json|gallery_id TEXT REFERENCES galleries\(id\) ON DELETE SET NULL)[^\n]*\n/gm, '')
      .replace(/^CREATE UNIQUE INDEX IF NOT EXISTS (?:orders_pending_selection|orders_payment_reference|packages_one_active_required|orders_required_booking)[^\n]*\n/gm, '')
      .split('CREATE TABLE IF NOT EXISTS gallery_invoices')[0];
    await DB.exec(previousSchema);
    await DB.prepare('INSERT INTO users(id,email,name,password_hash,created_at) VALUES(?,?,?,?,?)').bind('existing', 'existing@example.test', 'Existing', 'keep-this-hash', 1).run();
    await DB.prepare('INSERT INTO galleries(id,name,shooting_date,created_at,updated_at) VALUES(?,?,?,?,?)').bind('existing-gallery', 'Keep this gallery', '2026-10-08', 1, 1).run();
    await applyLocalPortalUpgrades(DB);
    await applyLocalPortalUpgrades(DB);
    assert.equal((await DB.prepare('SELECT password_hash FROM users WHERE id=?').bind('existing').first()).password_hash, 'keep-this-hash');
    const gallery = await DB.prepare('SELECT * FROM galleries WHERE id=?').bind('existing-gallery').first();
    assert.equal(gallery.name, 'Keep this gallery');
    assert.equal(gallery.deleted_at, null);
    assert.equal(gallery.media_deleted_at, null);
    assert.equal(gallery.cover_layout, 'overlay');
    assert.equal(gallery.grid_gap, 16);
    assert.equal(gallery.show_filenames, 0);
    assert.equal(gallery.watermark_mode, 'inherit');
    assert.equal(gallery.typography, 'serif');
    assert.equal(gallery.cover_decoration, 'none');
    assert.equal(gallery.appearance_json, null);
    assert.ok((await DB.prepare('PRAGMA table_info(images)').all()).results.some(column => column.name === 'protected_preview_key'));
    assert.ok((await DB.prepare('PRAGMA table_info(images)').all()).results.some(column => column.name === 'watermark_override'));
    assert.equal((await DB.prepare("SELECT COUNT(*) AS n FROM image_download_blocks").first()).n, 0);
    assert.ok((await DB.prepare('PRAGMA table_info(orders)').all()).results.some(column => column.name === 'payment_reference'));
    assert.ok((await DB.prepare('PRAGMA table_info(orders)').all()).results.some(column => column.name === 'pricing_json'));
    assert.ok((await DB.prepare('PRAGMA table_info(packages)').all()).results.some(column => column.name === 'is_required'));
    assert.ok((await DB.prepare('PRAGMA table_info(auth_tokens)').all()).results.some(column => column.name === 'gallery_id'));
    assert.ok((await DB.prepare('PRAGMA table_info(orders)').all()).results.some(column => column.name === 'receipt_email_json'));
    assert.equal((await DB.prepare("SELECT COUNT(*) AS total FROM sqlite_schema WHERE type='table' AND name IN ('gallery_invoices','download_notifications')").first()).total, 2);
  } finally { DB.close(); }
});

test('local migration is also safe on the current fresh schema', async () => {
  const DB = new LocalD1();
  try {
    await DB.exec(schema);
    await applyLocalPortalUpgrades(DB);
    assert.equal((await DB.prepare('PRAGMA table_info(galleries)').all()).results.filter(column => column.name === 'grid_gap').length, 1);
    assert.equal((await DB.prepare('PRAGMA table_info(galleries)').all()).results.filter(column => column.name === 'appearance_json').length, 1);
  } finally { DB.close(); }
});

test('actual server initialization migrates an October 8 database before creating the new reference index', async () => {
  const DB = new LocalD1();
  try {
    const previousSchema = schema.replace(/^  position INTEGER NOT NULL DEFAULT 0,\n/gm, '').replace(/^  (?:require_final_delivery|final_ready|source_filename|deleted_at|media_deleted_at|is_required|pricing_json|appearance_json|watermark_mode|typography|cover_decoration|protected_preview_key|protected_preview_type|watermark_fingerprint|payment_reference)[^\n]*\n/gm, '')
      .replace(/^CREATE UNIQUE INDEX IF NOT EXISTS (?:orders_pending_selection|orders_payment_reference|packages_one_active_required|orders_required_booking)[^\n]*\n/gm, '')
      .split('CREATE TABLE IF NOT EXISTS portal_settings')[0];
    await DB.exec(previousSchema);
    await DB.prepare('INSERT INTO users(id,email,name,password_hash,created_at) VALUES(?,?,?,?,?)').bind('kept', 'kept@example.test', 'Keep', 'existing-password', 1).run();
    await DB.prepare('INSERT INTO galleries(id,name,shooting_date,created_at,updated_at) VALUES(?,?,?,?,?)').bind('gallery', 'Existing gallery', '2026-10-08', 1, 1).run();
    await DB.prepare('INSERT INTO packages(id,gallery_id,name,image_count,price_cents) VALUES(?,?,?,?,?)').bind('pack', 'gallery', 'Existing package', 0, 1000).run();
    await DB.prepare('INSERT INTO orders(id,user_id,gallery_id,package_id,package_name,amount_cents,currency,status,payment_method,terms_version,consent_at,created_at,receipt_text) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('order', 'kept', 'gallery', 'pack', 'Existing package', 1000, 'EUR', 'pending', 'transfer', 'keep-terms', 1, 1, 'Original confirmation').run();
    await initializeLocalPortalDatabase(DB);
    await initializeLocalPortalDatabase(DB);
    assert.equal((await DB.prepare('SELECT password_hash FROM users WHERE id=?').bind('kept').first()).password_hash, 'existing-password');
    const order = await DB.prepare('SELECT * FROM orders WHERE id=?').bind('order').first();
    assert.equal(order.receipt_text, 'Original confirmation');
    assert.equal(order.payment_reference, null, 'old payment reference falls back to its unchanged UUID');
    assert.equal(order.pricing_json, null, 'old orders retain their original agreed pricing');
    assert.equal((await DB.prepare('SELECT is_required FROM packages WHERE id=?').bind('pack').first()).is_required, 0);
    assert.ok((await DB.prepare('PRAGMA index_list(orders)').all()).results.some(index => index.name === 'orders_payment_reference' && index.unique === 1));
  } finally { DB.close(); }
});

test('actual server initialization supports an empty database and a partially created old local fixture', async () => {
  for (const partial of [false, true]) {
    const DB = new LocalD1();
    try {
      if (partial) {
        const users = schema.match(/CREATE TABLE IF NOT EXISTS users \([\s\S]*?\n\);/)[0];
        const galleries = schema.match(/CREATE TABLE IF NOT EXISTS galleries \([\s\S]*?\n\);/)[0]
          .replace(/^  (?:watermark_override|appearance_json|cover_layout|cover_height|grid_density|grid_gap|show_filenames|watermark_mode|typography|cover_decoration)[^\n]*\n/gm, '');
        await DB.exec(users + galleries);
        await DB.prepare('INSERT INTO users(id,email,name,created_at) VALUES(?,?,?,?)').bind('partial', 'partial@example.test', 'Keep partial', 1).run();
      }
      await initializeLocalPortalDatabase(DB);
      await initializeLocalPortalDatabase(DB);
      assert.ok((await DB.prepare('PRAGMA table_info(galleries)').all()).results.some(column => column.name === 'watermark_mode'));
      assert.ok((await DB.prepare('PRAGMA table_info(galleries)').all()).results.some(column => column.name === 'appearance_json'));
      assert.ok((await DB.prepare('PRAGMA table_info(images)').all()).results.some(column => column.name === 'protected_preview_key'));
    assert.ok((await DB.prepare('PRAGMA table_info(images)').all()).results.some(column => column.name === 'watermark_override'));
    assert.equal((await DB.prepare("SELECT COUNT(*) AS n FROM image_download_blocks").first()).n, 0);
      assert.ok((await DB.prepare('PRAGMA index_list(orders)').all()).results.some(index => index.name === 'orders_payment_reference'));
      if (partial) assert.equal((await DB.prepare('SELECT name FROM users WHERE id=?').bind('partial').first()).name, 'Keep partial');
    } finally { DB.close(); }
  }
});
