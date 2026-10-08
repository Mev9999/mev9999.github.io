import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import worker from '../backend/worker.mjs';
import { LocalD1, LocalR2, LocalMailSink } from '../dev/adapters.mjs';
import { seedLocalDemo, fixtureIds } from '../dev/fixtures.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ORIGIN = 'http://127.0.0.1:8789';
export { fixtureIds };

export async function createHarness() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'liza-portal-integration-'));
  const DB = new LocalD1();
  const PHOTOS = new LocalR2(path.join(directory, 'private-r2'));
  const mail = new LocalMailSink();
  await DB.exec(await fs.readFile(path.resolve(here, '../backend/schema.sql'), 'utf8'));
  const env = {
    DB, PHOTOS, PASSWORD_PEPPER: randomBytes(48).toString('base64url'), LOCAL_DEV: 'true',
    PORTAL_ORIGIN: ORIGIN, PORTAL_PATH: '/galerie/', __TEST_MAIL: mail,
    BANK_RECIPIENT: 'Lokales Testkonto – NICHT ÜBERWEISEN', BANK_IBAN: 'DE71110220330123456789', BANK_BIC: 'BHBLDEHHXXX',
    BUSINESS_NAME: 'LiZa Memories Photography', CONTACT_EMAIL: 'emina@example.test',
    STRIPE_WEBHOOK_SECRET: randomBytes(32).toString('hex'),
    PAYMENT_METHODS: 'transfer,stripe,paypal',
  };
  await seedLocalDemo({ DB, PHOTOS, pepper: env.PASSWORD_PEPPER, repo: path.join(directory, 'no-real-customer-photos') });
  const pending = [];
  const ctx = { waitUntil(promise) { pending.push(promise); } };
  async function request(route, { method = 'GET', body, cookie, csrf, origin = ORIGIN, headers = {} } = {}) {
    const requestHeaders = new Headers(headers);
    if (origin !== null) requestHeaders.set('Origin', origin);
    if (cookie) requestHeaders.set('Cookie', cookie);
    if (csrf) requestHeaders.set('X-CSRF-Token', csrf);
    if (body !== undefined && !(body instanceof FormData) && typeof body !== 'string' && !(body instanceof Uint8Array)) { body = JSON.stringify(body); requestHeaders.set('Content-Type', 'application/json'); }
    const response = await worker.fetch(new Request(/^https?:\/\//.test(route) ? route : ORIGIN + route, { method, body, headers: requestHeaders }), env, ctx);
    await Promise.allSettled(pending.splice(0));
    let data = null;
    if ((response.headers.get('content-type') || '').includes('application/json')) data = await response.clone().json();
    return { response, data, status: response.status, cookies: response.headers.getSetCookie(), text: () => response.text() };
  }
  return { DB, PHOTOS, mail, env, request, async close() { await Promise.allSettled(pending); DB.close(); await fs.rm(directory, { force: true, recursive: true }); } };
}

export function cookieValue(result) { return result.cookies.map(value => value.split(';')[0]).join('; '); }
export function tokenFromMail(mail) {
  const text = mail.text || mail.html || '';
  const match = text.match(/https?:\/\/[^\s<>"']+/g)?.map(value => new URL(value.replace(/&amp;/g, '&'))).find(url => url.searchParams.has('token'));
  if (!match) throw new Error('The local mail did not contain a setup/reset link.');
  return match.searchParams.get('token');
}
