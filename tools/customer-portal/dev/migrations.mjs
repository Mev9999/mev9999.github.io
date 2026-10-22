import { readFile } from 'node:fs/promises';

const sqlStatements = sql => sql.replace(/^\s*--.*$/gm, '').split(';').map(value => value.trim()).filter(Boolean);

// Shared by the actual development server and its startup regression tests.
// CREATE TABLE IF NOT EXISTS cannot add columns to an old table. Consequently
// schema indexes that reference newly added columns must run AFTER migrations.
export async function initializeLocalPortalDatabase(DB) {
  const schema = sqlStatements(await readFile(new URL('../backend/schema.sql', import.meta.url), 'utf8'));
  const base = []; const indexes = [];
  for (const statement of schema) {
    if (/^CREATE (?:UNIQUE )?INDEX IF NOT EXISTS\s/i.test(statement)) indexes.push(statement);
    else if (/^(?:PRAGMA foreign_keys\s*=|CREATE TABLE IF NOT EXISTS\s)/i.test(statement)) base.push(statement);
    else throw new Error('Unsupported local schema statement.');
  }
  // This also repairs partially created local fixtures by first creating missing
  // base tables. All existing tables, rows, passwords and image keys stay intact.
  await DB.exec(base.join(';\n') + ';');
  await applyLocalPortalUpgrades(DB);
  await DB.exec(indexes.join(';\n') + ';');
}

// Local preview only: upgrade an existing SQLite fixture without deleting its data.
// Production migrations remain explicit Cloudflare D1 operations.
export async function applyLocalPortalUpgrades(DB) {
  const sql = (await Promise.all(['2026-10-08-gallery-upgrades.sql', '2026-10-09-portal-studio.sql', '2026-10-09-gallery-design.sql', '2026-10-11-image-controls.sql', '2026-10-12-required-package.sql', '2026-10-12-gallery-deletion.sql', '2026-10-12-admin-management.sql', '2026-10-12-final-delivery.sql', '2026-10-22-school-retention.sql'].map(name => readFile(new URL(`../backend/migrations/${name}`, import.meta.url), 'utf8')))).join('\n');
  const statements = sqlStatements(sql);
  const pending = [];
  const packageOrderExists = (await DB.prepare('PRAGMA table_info(packages)').all()).results.some(column => column.name === 'position');
  for (const statement of statements) {
    const added = /^ALTER TABLE ([a-z_]+) ADD COLUMN ([a-z_]+)\s/i.exec(statement);
    if (added) {
      const [, table, column] = added;
      const { results } = await DB.prepare(`PRAGMA table_info(${table})`).all();
      if (!results.length) throw new Error(`Local portal table is missing: ${table}`);
      if (results.some(value => value.name === column)) continue;
    } else if (/^UPDATE packages SET position=\(SELECT COUNT\(\*\) FROM packages prior WHERE /.test(statement)) {
      // Backfill only when adding the new column. Preserve custom sorting on restart.
      if (packageOrderExists) continue;
    } else if (/^DROP INDEX IF EXISTS orders_(?:required_booking|pending_selection)$/.test(statement)) {
      // These two known indexes are recreated in this same transaction.
    } else if (!/^CREATE (?:TABLE|(?:UNIQUE )?INDEX) IF NOT EXISTS\s/i.test(statement)) {
      throw new Error('Unsupported local migration statement.');
    }
    pending.push(statement);
  }
  if (pending.length) await DB.exec(`BEGIN;\n${pending.join(';\n')};\nCOMMIT;`);
}
