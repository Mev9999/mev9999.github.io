import { DatabaseSync } from 'node:sqlite';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

/* Small local-only adapters for testing the real Worker with real SQLite and files.
 * Production always uses Cloudflare D1/R2 bindings instead. */
export class LocalD1 {
  constructor(filename = ':memory:') {
    this.db = new DatabaseSync(filename);
    this.db.exec('PRAGMA foreign_keys=ON');
  }
  exec(sql) { this.db.exec(sql); return Promise.resolve({ count: 1, duration: 0 }); }
  prepare(sql) { return new LocalStatement(this.db, sql); }
  async batch(statements) {
    this.db.exec('BEGIN');
    try {
      const results = statements.map(statement => statement.execute());
      this.db.exec('COMMIT');
      return results;
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  close() { this.db.close(); }
}

class LocalStatement {
  constructor(db, sql, values = []) { this.db = db; this.sql = sql; this.values = values; }
  bind(...values) {
    // Match D1's documented per-query bound-parameter limit, so local tests cannot
    // silently accept a selection that would fail once deployed to Cloudflare.
    if (values.length > 100) throw new Error('D1 supports at most 100 bound parameters per query.');
    return new LocalStatement(this.db, this.sql, values.map(value => value === undefined ? null : value));
  }
  async first(column) {
    const row = this.db.prepare(this.sql).get(...this.values);
    return row ? column ? row[column] : { ...row } : null;
  }
  async all() { return this.execute(); }
  async run() { return this.execute(); }
  async raw(options = {}) {
    const prepared = this.db.prepare(this.sql); prepared.setReturnArrays(true);
    const rows = prepared.all(...this.values);
    return options.columnNames ? [prepared.columns().map(column => column.name), ...rows] : rows;
  }
  execute() {
    const statement = this.db.prepare(this.sql);
    const columns = statement.columns();
    if (columns.length) {
      const results = statement.all(...this.values).map(row => ({ ...row }));
      return { success: true, results, meta: { duration: 0, changes: 0, rows_read: results.length } };
    }
    const result = statement.run(...this.values);
    return { success: true, results: [], meta: { duration: 0, changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid), rows_written: Number(result.changes) } };
  }
}

export class LocalR2 {
  constructor(directory) { this.directory = path.resolve(directory); }
  filename(key) {
    if (typeof key !== 'string' || !key || key.includes('\\') || key.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('Invalid object key');
    const filename = path.resolve(this.directory, ...key.split('/'));
    if (!filename.startsWith(this.directory + path.sep)) throw new Error('Object outside local bucket');
    return filename;
  }
  async put(key, value, options = {}) {
    const filename = this.filename(key);
    const bytes = value instanceof Uint8Array ? value : value instanceof ArrayBuffer ? new Uint8Array(value) : typeof value === 'string' ? Buffer.from(value) : new Uint8Array(await new Response(value).arrayBuffer());
    await fs.mkdir(path.dirname(filename), { recursive: true });
    await fs.writeFile(filename, bytes);
    await fs.writeFile(filename + '.r2meta', JSON.stringify({ httpMetadata: options.httpMetadata || {}, customMetadata: options.customMetadata || {}, uploaded: new Date().toISOString() }));
    return this.head(key);
  }
  async get(key, options = {}) {
    let bytes;
    try { bytes = new Uint8Array(await fs.readFile(this.filename(key))); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
    const metadata = await this.metadata(key);
    const allSize = bytes.length;
    if (options.range) {
      const offset = options.range.offset ?? Math.max(0, bytes.length - (options.range.suffix || 0));
      bytes = bytes.slice(offset, options.range.length === undefined ? undefined : offset + options.range.length);
    }
    const response = new Response(bytes);
    return {
      ...metadata, key, size: allSize, body: response.body, bodyUsed: false,
      arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      text: async () => new TextDecoder().decode(bytes),
      json: async () => JSON.parse(new TextDecoder().decode(bytes)),
      writeHttpMetadata(headers) { for (const [name, value] of Object.entries(metadata.httpMetadata)) { const names = { contentType: 'Content-Type', cacheControl: 'Cache-Control', contentDisposition: 'Content-Disposition' }; if (names[name]) headers.set(names[name], value); } },
    };
  }
  async metadata(key) {
    const filename = this.filename(key);
    const bytes = await fs.readFile(filename);
    let metadata = { httpMetadata: {}, customMetadata: {}, uploaded: new Date().toISOString() };
    try { metadata = JSON.parse(await fs.readFile(filename + '.r2meta', 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    const etag = createHash('sha256').update(bytes).digest('hex');
    return { ...metadata, etag, httpEtag: `"${etag}"`, uploaded: new Date(metadata.uploaded) };
  }
  async head(key) { try { return { ...(await this.metadata(key)), key, size: (await fs.stat(this.filename(key))).size }; } catch (error) { if (error.code === 'ENOENT') return null; throw error; } }
  async list({ prefix = '', cursor, limit = 1000 } = {}) {
    if (typeof prefix !== 'string' || !Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error('Invalid R2 list options');
    const after = cursor ? Buffer.from(cursor, 'base64url').toString('utf8') : '';
    const keys = [];
    const visit = async (directory, parent = '') => {
      let entries;
      try { entries = await fs.readdir(directory, { withFileTypes: true }); }
      catch (error) { if (error.code === 'ENOENT') return; throw error; }
      for (const entry of entries) {
        // Never follow links outside the local fixture bucket.
        if (entry.isSymbolicLink()) continue;
        const key = parent + entry.name;
        if (entry.isDirectory()) await visit(path.join(directory, entry.name), key + '/');
        else if (entry.isFile() && !entry.name.endsWith('.r2meta') && key.startsWith(prefix) && key > after) keys.push(key);
      }
    };
    await visit(this.directory);
    keys.sort();
    const selected = keys.slice(0, limit);
    const objects = (await Promise.all(selected.map(key => this.head(key)))).filter(Boolean);
    const truncated = keys.length > limit;
    return { objects, truncated, delimitedPrefixes: [], ...(truncated ? { cursor: Buffer.from(selected.at(-1)).toString('base64url') } : {}) };
  }
  async delete(keys) { for (const key of Array.isArray(keys) ? keys : [keys]) { const filename = this.filename(key); await fs.rm(filename, { force: true }); await fs.rm(filename + '.r2meta', { force: true }); } }
}

export class LocalMailSink {
  constructor() { this.messages = []; }
  async send(message) { this.messages.push({ ...message, receivedAt: new Date().toISOString() }); return { id: `local-${this.messages.length}` }; }
  clear() { this.messages.length = 0; }
}
