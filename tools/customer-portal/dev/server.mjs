import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { Readable } from 'node:stream';
import { LocalD1, LocalR2, LocalMailSink } from './adapters.mjs';
import { seedLocalDemo } from './fixtures.mjs';
import worker from '../backend/worker.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const argument = (key, fallback) => { const index = args.indexOf(key); return index >= 0 ? args[index + 1] : fallback; };
const repo = path.resolve(argument('--root', path.resolve(here, '../../..')));
const siteDirectory = path.resolve(argument('--site-dir', path.resolve(here, '../dist')));
const stateDirectory = path.resolve(argument('--state-dir', path.resolve(here, '../.local-state')));
const port = Number(argument('--port', '8789'));
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Use a local development port between 1024 and 65535.');
await fs.mkdir(stateDirectory, { recursive: true });
await fs.writeFile(path.join(stateDirectory, '.local-only'), 'Local development data. Never deploy or commit.\n');

const DB = new LocalD1(path.join(stateDirectory, 'portal.sqlite'));
await DB.exec(await fs.readFile(path.resolve(here, '../backend/schema.sql'), 'utf8'));
const PHOTOS = new LocalR2(path.join(stateDirectory, 'private-r2'));
const mail = new LocalMailSink();
let pepper;
try { pepper = await fs.readFile(path.join(stateDirectory, 'password-pepper'), 'utf8'); }
catch (error) { if (error.code !== 'ENOENT') throw error; pepper = randomBytes(48).toString('base64url'); await fs.writeFile(path.join(stateDirectory, 'password-pepper'), pepper, { mode: 0o600 }); }
const origin = `http://127.0.0.1:${port}`;
const env = {
  DB, PHOTOS, PASSWORD_PEPPER: pepper, LOCAL_DEV: 'true', PORTAL_ORIGIN: origin,
  PORTAL_PATH: '/galerie/', __TEST_MAIL: mail,
  // Published EPC example, not the photographer's bank account. Never pay this local fixture.
  BANK_RECIPIENT: 'Lokales Testkonto – NICHT ÜBERWEISEN', BANK_IBAN: 'DE71110220330123456789', BANK_BIC: 'BHBLDEHHXXX',
  BUSINESS_NAME: 'LiZa Memories Photography', CONTACT_EMAIL: 'emina@example.test',
};
if (!args.includes('--no-seed')) await seedLocalDemo({ DB, PHOTOS, pepper, repo });

const mimeTypes = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.pdf': 'application/pdf', '.mp4': 'video/mp4', '.txt': 'text/plain; charset=utf-8' };
const pending = new Set();
const ctx = { waitUntil(promise) { pending.add(promise); promise.finally(() => pending.delete(promise)).catch(() => {}); } };

async function requestBody(request) {
  const chunks = []; let length = 0;
  for await (const chunk of request) { length += chunk.length; if (length > 60 * 1024 * 1024) throw new Error('body_too_large'); chunks.push(chunk); }
  return Buffer.concat(chunks);
}
async function forwardResponse(response, output) {
  output.statusCode = response.status;
  for (const [key, value] of response.headers) if (key !== 'set-cookie') output.setHeader(key, value);
  const cookies = response.headers.getSetCookie();
  if (cookies.length) output.setHeader('Set-Cookie', cookies);
  if (!response.body) { output.end(); return; }
  const stream = Readable.fromWeb(response.body);
  stream.on('error', () => output.destroy());
  stream.pipe(output);
}
async function staticResponse(url, request) {
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { return new Response('Bad request', { status: 400 }); }
  if (pathname.includes('\\') || pathname.split('/').some(part => part === '..' || part.startsWith('.')) || /^\/(?:tools|backend|dev|tests|node_modules)(?:\/|$)/.test(pathname)) return new Response('Not found', { status: 404 });
  if (pathname === '/') return Response.redirect(origin + '/galerie/', 302);
  if (pathname === '/galerie' || pathname === '/portal') return Response.redirect(origin + pathname + '/', 302);
  if (pathname.startsWith('/portal/')) pathname = '/galerie/' + pathname.slice('/portal/'.length);
  if (pathname.endsWith('/')) pathname += 'index.html';
  let candidates = [path.join(siteDirectory, pathname), path.join(repo, pathname)];
  if (pathname.startsWith('/galerie/')) candidates = [path.join(siteDirectory, pathname), path.join(siteDirectory, pathname.slice('/galerie/'.length)), path.join(repo, pathname)];
  const extension = path.extname(pathname).toLowerCase();
  if (!mimeTypes[extension]) return new Response('Not found', { status: 404 });
  for (const candidate of candidates) {
    if (!(candidate.startsWith(siteDirectory + path.sep) || candidate.startsWith(repo + path.sep))) continue;
    try {
      const info = await fs.stat(candidate);
      if (!info.isFile()) continue;
      return new Response(request.method === 'HEAD' ? null : await fs.readFile(candidate), { headers: { 'Content-Type': mimeTypes[extension], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
    } catch (error) { if (!['ENOENT', 'ENOTDIR'].includes(error.code)) throw error; }
  }
  return new Response('Not found', { status: 404 });
}
const server = http.createServer(async (request, output) => {
  try {
    // Bind to loopback and also reject mismatched Host values: local helpers must never be reachable through a public proxy.
    const host = request.headers.host || '';
    if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) { output.writeHead(400); output.end('Local development only'); return; }
    const url = new URL(request.url || '/', origin);
    if (url.pathname === '/__dev/mail') {
      if (request.method !== 'GET') { output.writeHead(405); output.end(); return; }
      output.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      output.end(JSON.stringify({ localOnly: true, messages: mail.messages })); return;
    }
    if (url.pathname.startsWith('/api/')) {
      const method = request.method || 'GET';
      const init = { method, headers: request.headers };
      if (!['GET', 'HEAD'].includes(method)) init.body = await requestBody(request);
      const response = await worker.fetch(new Request(url, init), env, ctx);
      await forwardResponse(response, output); return;
    }
    if (!['GET', 'HEAD'].includes(request.method || 'GET')) { output.writeHead(405); output.end(); return; }
    await forwardResponse(await staticResponse(url, request), output);
  } catch (error) {
    // Do not print tokens, submitted data, or body payloads to stdout.
    if (!output.headersSent) output.writeHead(error.message === 'body_too_large' ? 413 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
    output.end('Local request could not be completed.');
  }
});
server.listen(port, '127.0.0.1', () => {
  console.log(`Lokales Kundenportal: ${origin}/galerie/`);
  console.log('Nur lokale Testdaten; kein Mailversand, keine echte Zahlung.');
  console.log(`Lokaler Mail-Eingang: ${origin}/__dev/mail`);
});
const stop = () => server.close(async () => { await Promise.allSettled([...pending]); DB.close(); process.exit(0); });
process.on('SIGINT', stop); process.on('SIGTERM', stop);
