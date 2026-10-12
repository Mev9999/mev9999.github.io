import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHarness, cookieValue, fixtureIds } from './harness.mjs';

async function withHarness(callback) { const h = await createHarness(); try { await callback(h); } finally { await h.close(); } }
async function login(h, admin = true) {
  const response = await h.request('/api/auth/login', { method: 'POST', body: { email: admin ? 'emina@example.test' : 'customer@example.test', password: admin ? 'Testverwaltung2026!' : 'Testgalerie2026!' } });
  assert.equal(response.status, 200); return { cookie: cookieValue(response), csrf: response.data.csrf };
}
const route = `/api/admin/galleries/${fixtureIds.gallery}`;
const palettes = ['warm', 'light', 'dark', 'cream', 'rose', 'blush', 'sand', 'clay', 'sage', 'olive', 'forest', 'sea', 'sky', 'lavender', 'slate'];
const layouts = ['overlay', 'split', 'editorial', 'split-reverse', 'card', 'arch', 'polaroid', 'minimal'];
const decorations = ['none', 'frame', 'stripe', 'double-frame', 'corners', 'underline', 'soft-shadow', 'rounded'];
const selectDesign = ({ theme, coverLayout, coverDecoration, coverHeight, coverHeightMobile, coverFit, coverFitMobile }) => ({ theme, coverLayout, coverDecoration, coverHeight, coverHeightMobile, coverFit, coverFitMobile });
const patch = (h, admin, body) => h.request(route, { ...admin, method: 'PATCH', body });

test('all expanded palettes, cover layouts and accents survive storage and customer reads without changing legacy constraints', () => withHarness(async h => {
  const admin = await login(h); const customer = await login(h, false);
  for (const [key, values] of Object.entries({ theme: palettes, coverLayout: layouts, coverDecoration: decorations })) {
    for (const value of values) {
      const response = await patch(h, admin, { [key]: value });
      assert.equal(response.status, 200, `${key}=${value}`);
      assert.equal(response.data.gallery[key], value);
      assert.equal((await h.request(route, admin)).data.gallery[key], value);
      assert.equal((await h.request(`/api/galleries/${fixtureIds.gallery}`, customer)).data.gallery[key], value);
      const stored = await h.DB.prepare('SELECT theme,cover_layout,cover_decoration,appearance_json FROM galleries WHERE id=?').bind(fixtureIds.gallery).first();
      assert.ok(['warm', 'light', 'dark'].includes(stored.theme));
      assert.ok(['overlay', 'split', 'editorial'].includes(stored.cover_layout));
      assert.ok(['none', 'frame', 'stripe'].includes(stored.cover_decoration));
      assert.equal(JSON.parse(stored.appearance_json)[key], value);
    }
  }
  assert.equal((await h.request('/api/galleries', customer)).data.galleries.find(gallery => gallery.id === fixtureIds.gallery).theme, 'slate');
}));

test('desktop and mobile settings remain independent, partial edits retain design, and invalid settings never mutate the gallery', () => withHarness(async h => {
  const admin = await login(h);
  const initial = (await h.request(route, admin)).data.gallery;
  assert.deepEqual([initial.coverHeightMobile, initial.coverFit, initial.coverFitMobile], ['standard', 'contain', 'cover']);
  const design = { theme: 'lavender', coverLayout: 'arch', coverDecoration: 'corners', coverHeight: 'large', coverHeightMobile: 'compact', coverFit: 'cover', coverFitMobile: 'contain' };
  assert.equal((await patch(h, admin, design)).status, 200);
  assert.deepEqual(selectDesign((await patch(h, admin, { name: 'Name only' })).data.gallery), design);
  const mobileChanged = await patch(h, admin, { coverHeightMobile: 'large' });
  assert.deepEqual(selectDesign(mobileChanged.data.gallery), { ...design, coverHeightMobile: 'large' });
  assert.equal((await patch(h, admin, { coverHeight: 'compact' })).data.gallery.coverHeightMobile, 'large');
  const before = await h.DB.prepare('SELECT * FROM galleries WHERE id=?').bind(fixtureIds.gallery).first();
  for (const key of ['theme', 'coverLayout', 'coverDecoration', 'coverHeightMobile', 'coverFit', 'coverFitMobile']) {
    for (const value of ['bogus', '', null, 1, true, {}, []]) {
      const response = await patch(h, admin, { name: 'Must not save', [key]: value });
      assert.equal(response.status, 400, `${key}=${JSON.stringify(value)}`);
      assert.equal(response.data.code, 'invalid_gallery_settings');
    }
  }
  assert.deepEqual(await h.DB.prepare('SELECT * FROM galleries WHERE id=?').bind(fixtureIds.gallery).first(), before);
}));

test('new galleries accept expanded design on creation and ordinary creation retains safe independent defaults', () => withHarness(async h => {
  const admin = await login(h);
  const design = { theme: 'sea', coverLayout: 'split-reverse', coverDecoration: 'double-frame', coverHeight: 'large', coverHeightMobile: 'standard', coverFit: 'contain', coverFitMobile: 'cover' };
  const created = await h.request('/api/admin/galleries', { ...admin, method: 'POST', body: { name: 'Design', date: '2026-10-09', ...design } });
  assert.equal(created.status, 201); assert.deepEqual(selectDesign(created.data.gallery), design);
  const plain = await h.request('/api/admin/galleries', { ...admin, method: 'POST', body: { name: 'Plain', date: '2026-10-09' } });
  assert.equal(plain.status, 201);
  assert.deepEqual(selectDesign(plain.data.gallery), { theme: 'warm', coverLayout: 'overlay', coverDecoration: 'none', coverHeight: 'standard', coverHeightMobile: 'standard', coverFit: 'contain', coverFitMobile: 'cover' });
}));

test('a deployed pre-design database keeps its old flows and reports migration_required for new features before any write', () => withHarness(async h => {
  const admin = await login(h);
  await h.DB.exec('ALTER TABLE galleries DROP COLUMN appearance_json;');
  const saved = await patch(h, admin, { theme: 'dark', coverLayout: 'editorial', coverHeight: 'large', coverDecoration: 'stripe' });
  assert.equal(saved.status, 200);
  assert.deepEqual(selectDesign(saved.data.gallery), { theme: 'dark', coverLayout: 'editorial', coverDecoration: 'stripe', coverHeight: 'large', coverHeightMobile: 'standard', coverFit: 'contain', coverFitMobile: 'cover' });
  assert.equal((await patch(h, admin, { name: 'Old flow still works' })).status, 200);
  const before = await h.DB.prepare('SELECT * FROM galleries WHERE id=?').bind(fixtureIds.gallery).first();
  for (const body of [{ theme: 'rose' }, { coverLayout: 'card' }, { coverDecoration: 'rounded' }, { coverHeightMobile: 'standard' }, { coverFit: 'contain' }, { coverFitMobile: 'cover' }]) {
    const response = await patch(h, admin, { name: 'Must not change', ...body });
    assert.equal(response.status, 503); assert.equal(response.data.code, 'migration_required');
  }
  assert.deepEqual(await h.DB.prepare('SELECT * FROM galleries WHERE id=?').bind(fixtureIds.gallery).first(), before);
  const count = (await h.DB.prepare('SELECT COUNT(*) AS total FROM galleries').first()).total;
  const blocked = await h.request('/api/admin/galleries', { ...admin, method: 'POST', body: { name: 'Blocked', date: '2026-10-09', theme: 'sage' } });
  assert.equal(blocked.status, 503); assert.equal(blocked.data.code, 'migration_required');
  assert.equal((await h.DB.prepare('SELECT COUNT(*) AS total FROM galleries').first()).total, count);
  assert.equal((await h.request('/api/admin/galleries', { ...admin, method: 'POST', body: { name: 'Legacy', date: '2026-10-09' } })).status, 201);
}));

test('the standalone additive production migration preserves every existing table row and legacy design', () => withHarness(async h => {
  await h.DB.exec('ALTER TABLE galleries DROP COLUMN appearance_json;');
  await h.DB.prepare("UPDATE galleries SET theme='dark',cover_layout='editorial',cover_height='large',cover_decoration='stripe' WHERE id=?").bind(fixtureIds.gallery).run();
  const tableNames = (await h.DB.prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name").all()).results.map(row => row.name);
  const snapshot = async () => Object.fromEntries(await Promise.all(tableNames.map(async name => [name, (await h.DB.prepare(`SELECT * FROM ${name} ORDER BY rowid`).all()).results.map(row => { const { appearance_json, ...original } = row; return original; })])));
  const before = await snapshot();
  await h.DB.exec(await readFile(new URL('../backend/migrations/2026-10-09-gallery-design.sql', import.meta.url), 'utf8'));
  assert.deepEqual(await snapshot(), before);
  assert.equal((await h.DB.prepare('PRAGMA foreign_key_check').all()).results.length, 0);
  const admin = await login(h);
  const gallery = (await h.request(route, admin)).data.gallery;
  assert.deepEqual(selectDesign(gallery), { theme: 'dark', coverLayout: 'editorial', coverDecoration: 'stripe', coverHeight: 'large', coverHeightMobile: 'standard', coverFit: 'contain', coverFitMobile: 'cover' });
  await assert.rejects(h.DB.prepare('UPDATE galleries SET appearance_json=? WHERE id=?').bind('not json', fixtureIds.gallery).run());
  assert.equal((await patch(h, admin, { theme: 'sky' })).data.gallery.theme, 'sky');
}));
