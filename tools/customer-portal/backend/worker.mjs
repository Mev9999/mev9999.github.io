/** LiZa Memories private photo portal. No customer data is stored in public assets. */
import { renderPortalEmail, renderPortalDocument, renderWithdrawalEmail } from './mail-templates.mjs';
import { deleteGallery, GalleryDeletionError } from './gallery-deletion.mjs';
const encoder = new TextEncoder();
const DAY = 86_400_000;
const AUTH_MESSAGE = 'Wenn ein Zugang hinterlegt ist, erhältst du eine E-Mail mit den nächsten Schritten.';
const COOKIE = '__Host-liza_session';
const LOCAL_COOKIE = 'liza_session_local';
const TERMS_VERSION = 'portal-digital-2026-10-07';
const JSON_LIMIT = 32_768;
const MAX_IMAGES = 500;
const MAX_GALLERY_IMAGES = 5000;
const optionalSchemaCache = new WeakMap();
const DUMMY_HASH = 'pbkdf2$100000$0000000000000000000000000000000000000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000';

class ApiError extends Error {
  constructor(status, message, code = 'request_failed') { super(message); this.status = status; this.code = code; }
}
const fail = (status, message, code) => { throw new ApiError(status, message, code); };
const hex = bytes => Array.from(new Uint8Array(bytes), x => x.toString(16).padStart(2, '0')).join('');
function unhex(value) {
  if (!/^[0-9a-f]+$/i.test(value) || value.length % 2) throw new Error('Invalid digest');
  return Uint8Array.from(value.match(/.{2}/g), x => parseInt(x, 16));
}
const randomToken = () => hex(crypto.getRandomValues(new Uint8Array(32)));
const id = () => crypto.randomUUID();
export async function sha256(value) { return hex(await crypto.subtle.digest('SHA-256', encoder.encode(value))); }
export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  let difference = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) difference |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return difference === 0;
}
async function hmac(secret, value) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}
async function derivePassword(password, pepper, salt, iterations) {
  // Workers Web Crypto supports PBKDF2 up to 100,000 iterations. A separately held
  // server pepper means a D1-only leak does not suffice for offline password guesses.
  const input = await hmac(pepper, password);
  const key = await crypto.subtle.importKey('raw', unhex(input), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: unhex(salt), iterations, hash: 'SHA-256' }, key, 256));
}
export async function hashPassword(password, pepper) {
  const salt = randomToken();
  return `pbkdf2$100000$${salt}$${await derivePassword(password, pepper, salt, 100000)}`;
}
export async function verifyPassword(password, stored, pepper) {
  const [algorithm, iterations, salt, digest] = (stored || DUMMY_HASH).split('$');
  if (algorithm !== 'pbkdf2' || Number(iterations) !== 100000 || !/^[a-f0-9]{64}$/.test(salt || '') || !/^[a-f0-9]{64}$/.test(digest || '')) return false;
  return safeEqual(await derivePassword(password, pepper, salt, 100000), digest);
}

function local(env) {
  if (env.LOCAL_DEV !== 'true') return false;
  try { const url = new URL(env.PORTAL_ORIGIN); return url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname); }
  catch { return false; }
}
function portalOrigin(env) {
  try {
    const url = new URL(env.PORTAL_ORIGIN);
    if (url.origin !== env.PORTAL_ORIGIN || url.username || url.password || (url.protocol !== 'https:' && !local(env))) return null;
    return url.origin;
  } catch { return null; }
}
function configured(env) { return Boolean(env.DB && env.PHOTOS && portalOrigin(env) && typeof env.PASSWORD_PEPPER === 'string' && env.PASSWORD_PEPPER.length >= 32); }
export function validIban(value) {
  if (typeof value !== 'string' || !/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(value)) return false;
  if (value.startsWith('AT') && value.length !== 20) return false;
  const shifted = value.slice(4) + value.slice(0, 4);
  let remainder = 0;
  for (const character of shifted) {
    const digits = /[A-Z]/.test(character) ? String(character.charCodeAt(0) - 55) : character;
    for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}
function bankDetails(env) {
  const recipient = typeof env.BANK_RECIPIENT === 'string' ? env.BANK_RECIPIENT.trim() : '';
  const iban = typeof env.BANK_IBAN === 'string' ? env.BANK_IBAN.replace(/ /g, '').toUpperCase() : '';
  const bic = typeof env.BANK_BIC === 'string' ? env.BANK_BIC.trim().toUpperCase() : '';
  if (!recipient || recipient.length > 70 || /[\u0000-\u001f\u007f]/.test(env.BANK_RECIPIENT || '') || !validIban(iban) || (bic && !/^[A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?$/.test(bic))) return null;
  return { recipient, iban, bic };
}
function capabilities(env) {
  const enabledMethods = new Set(String(env.PAYMENT_METHODS || 'transfer').split(/[,\s]+/).map(x => x.trim().toLowerCase()));
  const bank = bankDetails(env);
  const transferConfigured = Boolean(enabledMethods.has('transfer') && bank);
  return {
    configured: configured(env),
    email: Boolean((env.EMAIL_API_KEY && env.EMAIL_FROM) || (local(env) && env.__TEST_MAIL?.send)),
    stripe: Boolean(enabledMethods.has('stripe') && env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET),
    paypal: Boolean(enabledMethods.has('paypal') && env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET && ['sandbox', 'live'].includes(env.PAYPAL_ENVIRONMENT)),
    transferConfigured,
    transfer: transferConfigured ? bank : null,
  };
}
function statement(env, sql, ...params) { return env.DB.prepare(sql).bind(...params); }
const first = (env, sql, ...params) => statement(env, sql, ...params).first();
const run = (env, sql, ...params) => statement(env, sql, ...params).run();
async function all(env, sql, ...params) { return (await statement(env, sql, ...params).all()).results || []; }
async function optionalSchema(env) {
  const cached = optionalSchemaCache.get(env.DB);
  if (cached) return cached;
  const tables = new Set((await all(env, "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('download_notifications','gallery_invoices','portal_settings','customer_activity','image_download_blocks')")).map(row => row.name));
  const galleryColumns = new Set((await all(env, 'PRAGMA table_info(galleries)')).map(row => row.name));
  const packageColumns = new Set((await all(env, 'PRAGMA table_info(packages)')).map(row => row.name));
  const imageColumns = new Set((await all(env, 'PRAGMA table_info(images)')).map(row => row.name));
  const orderColumns = new Set((await all(env, 'PRAGMA table_info(orders)')).map(row => row.name));
  const features = { finalDelivery: galleryColumns.has('require_final_delivery') && imageColumns.has('final_ready') && imageColumns.has('source_filename'), orderDeletion: orderColumns.has('deleted_at'), packageOrder: packageColumns.has('position'), galleryDeletion: ['deleted_at','media_deleted_at'].every(name => galleryColumns.has(name)), notifications: tables.has('download_notifications'), invoices: tables.has('gallery_invoices'), studio: tables.has('portal_settings') && tables.has('customer_activity'), imageControls: tables.has('image_download_blocks') && (await all(env, 'PRAGMA table_info(images)')).some(row => row.name === 'watermark_override'), requiredPackages: packageColumns.has('is_required') && orderColumns.has('pricing_json') };
  // A database upgraded while this Worker is warm must become usable without a restart.
  if (features.notifications && features.invoices && features.studio && features.imageControls && features.requiredPackages && features.galleryDeletion && features.orderDeletion && features.packageOrder && features.finalDelivery) optionalSchemaCache.set(env.DB, features);
  return features;
}
async function liveOrder(env, alias = '') { return (await optionalSchema(env)).orderDeletion ? `${alias ? alias + '.' : ''}deleted_at IS NULL` : '1=1'; }
const testOrderEligible = order => order.payment_method === 'transfer' && !order.provider_reference && !order.checkout_url && !order.has_payment_events;
function finalOrderCondition(features, alias = 'o') {
  return features.finalDelivery ? `NOT EXISTS(SELECT 1 FROM galleries fg WHERE fg.id=${alias}.gallery_id AND fg.require_final_delivery=1 AND EXISTS(SELECT 1 FROM order_images foi JOIN images fi ON fi.id=foi.image_id WHERE foi.order_id=${alias}.id AND fi.final_ready<>1))` : '1=1';
}
function finalImageCondition(features, alias = 'i') {
  return features.finalDelivery ? `NOT EXISTS(SELECT 1 FROM galleries fg WHERE fg.id=${alias}.gallery_id AND fg.require_final_delivery=1 AND ${alias}.final_ready<>1)` : '1=1';
}
async function finalizedOrder(env, alias = 'o') { return finalOrderCondition(await optionalSchema(env), alias); }
async function finalizedImage(env, alias = 'i') { return finalImageCondition(await optionalSchema(env), alias); }
const EMAIL_KINDS = ['invite', 'setup', 'reset', 'order', 'download'];
function defaultSettings() {
  return { watermark: { enabled: false, text: 'LiZa Memories Photography', size: 42, opacity: 0.35, position: 'diagonal' }, emails: Object.fromEntries(EMAIL_KINDS.map(kind => [kind, { subject: '', intro: '' }])) };
}
async function portalSettings(env) {
  const defaults = defaultSettings();
  if (!(await optionalSchema(env)).studio) return defaults;
  const row = await first(env, 'SELECT value_json FROM portal_settings WHERE id=1');
  if (!row) return defaults;
  const stored = JSON.parse(row.value_json);
  return { watermark: { ...defaults.watermark, ...stored.watermark }, emails: Object.fromEntries(EMAIL_KINDS.map(kind => [kind, { ...defaults.emails[kind], ...stored.emails?.[kind] }])) };
}
function validateSettings(data, previous) {
  if (Object.keys(data).some(key => !['watermark', 'emails'].includes(key))) fail(400, 'Unbekannte Einstellung.', 'invalid_settings');
  const settings = { watermark: { ...previous.watermark }, emails: structuredClone(previous.emails) };
  if (data.watermark !== undefined) {
    if (!data.watermark || typeof data.watermark !== 'object' || Array.isArray(data.watermark) || Object.keys(data.watermark).some(key => !['enabled', 'text', 'size', 'opacity', 'position'].includes(key))) fail(400, 'Bitte prüfe das Wasserzeichen.', 'invalid_settings');
    const mark = { ...settings.watermark, ...data.watermark };
    if (typeof mark.enabled !== 'boolean' || !Number.isInteger(mark.size) || mark.size < 12 || mark.size > 96 || typeof mark.opacity !== 'number' || !Number.isFinite(mark.opacity) || mark.opacity < 0.1 || mark.opacity > 1 || !['center', 'diagonal', 'bottom-right'].includes(mark.position)) fail(400, 'Bitte prüfe Größe, Deckkraft und Position.', 'invalid_settings');
    mark.text = textField(mark.text, 100);
    if (/[\r\n]/.test(mark.text)) fail(400, 'Das Wasserzeichen muss eine Zeile sein.', 'invalid_settings');
    settings.watermark = mark;
  }
  if (data.emails !== undefined) {
    if (!data.emails || typeof data.emails !== 'object' || Array.isArray(data.emails) || Object.keys(data.emails).some(key => !EMAIL_KINDS.includes(key))) fail(400, 'Unbekannte E-Mail-Vorlage.', 'invalid_settings');
    for (const [kind, value] of Object.entries(data.emails)) {
      if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !['subject', 'intro'].includes(key))) fail(400, 'Bitte prüfe die E-Mail-Texte.', 'invalid_settings');
      for (const key of ['subject', 'intro']) if (value[key] !== undefined) settings.emails[kind][key] = textField(value[key], key === 'subject' ? 160 : 1000, false);
      if (/[\r\n]/.test(settings.emails[kind].subject)) fail(400, 'Der Betreff muss eine Zeile sein.', 'invalid_settings');
    }
  }
  return settings;
}
async function renderConfiguredEmail(env, data) {
  return renderPortalEmail({ ...data, customCopy: (await portalSettings(env)).emails[data.kind] });
}
async function previewSettings(env, gallery) {
  const mark = (await portalSettings(env)).watermark;
  const fingerprint = await sha256(JSON.stringify([mark.text, mark.size, mark.opacity, mark.position]));
  return { ...mark, enabled: watermarkEnabled(mark, gallery), fingerprint };
}
function imageProtection(protection, image) { return { ...protection, enabled: image.watermark_override === 'on' || (image.watermark_override !== 'off' && protection.enabled) }; }
function watermarkEnabled(mark, gallery) { return gallery.watermark_mode === 'on' || (gallery.watermark_mode !== 'off' && mark.enabled); }
const orderReference = order => order.payment_reference || order.id;
function orderInvoice(order) {
  if (!order.receipt_email_json) return null;
  try { return JSON.parse(order.receipt_email_json).files?.find(file => file.content_type === 'application/pdf' && file.key.startsWith(`order-confirmations/${order.id}/`)) || null; }
  catch { return null; }
}
async function recordDownload(env, user, image) {
  if (user.role === 'admin' || !(await optionalSchema(env)).studio) return;
  const now = Date.now();
  await env.DB.batch([
    statement(env, "INSERT OR IGNORE INTO customer_activity(id,kind,user_id,gallery_id,image_id,created_at,dedupe_key) VALUES(?,'download',?,?,?,?,?)", id(), user.id, image.gallery_id, image.id, now, `download:${user.id}:${image.id}:${Math.floor(now / 60_000)}`),
    statement(env, 'DELETE FROM customer_activity WHERE created_at<?', now - 90 * DAY),
  ]);
}
async function audit(env, userId, action, targetId = null) {
  await run(env, 'INSERT INTO audit_events(id,user_id,action,target_id,created_at) VALUES(?,?,?,?,?)', id(), userId, action, targetId, Date.now());
}
function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'Bitte gib eine gültige E-Mail-Adresse ein.', 'invalid_email');
  return email;
}
function textField(value, max = 200, required = true) {
  if (typeof value !== 'string') { if (!required && value === undefined) return ''; fail(400, 'Ein Textfeld fehlt.', 'invalid_input'); }
  const text = value.trim();
  if ((required && !text) || text.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)) fail(400, 'Bitte prüfe die eingegebenen Angaben.', 'invalid_input');
  return text;
}
function ids(value, maximum = MAX_IMAGES) {
  if (!Array.isArray(value) || value.length > maximum || value.some(x => typeof x !== 'string' || !/^[\w-]{1,80}$/.test(x))) fail(400, 'Bitte prüfe die Bildauswahl.', 'invalid_selection');
  if (new Set(value).size !== value.length) fail(400, 'Ein Bild wurde mehrfach ausgewählt.', 'invalid_selection');
  return value;
}
async function body(request, limit = JSON_LIMIT) {
  if (!(request.headers.get('content-type') || '').includes('application/json')) fail(415, 'JSON ist erforderlich.', 'invalid_content_type');
  if (Number(request.headers.get('content-length') || 0) > limit) fail(413, 'Die Anfrage ist zu groß.');
  const raw = await readLimited(request, limit);
  try { const value = JSON.parse(raw); if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error(); return value; }
  catch { fail(400, 'Die Anfrage konnte nicht gelesen werden.', 'invalid_json'); }
}
async function readLimited(request, max) {
  if (!request.body) return '';
  const reader = request.body.getReader();
  let count = 0; const chunks = [];
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    count += value.byteLength; if (count > max) { await reader.cancel(); fail(413, 'Die Anfrage ist zu groß.'); }
    chunks.push(value);
  }
  const data = new Uint8Array(count); let offset = 0;
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.length; }
  return new TextDecoder().decode(data);
}
function json(value, status = 200, extra = {}) { return Response.json(value, { status, headers: extra }); }
function secure(response, isApi = false, env = {}) {
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  if (!local(env)) headers.set('Strict-Transport-Security', 'max-age=31536000');
  if (isApi) headers.set('Cache-Control', 'private, no-store, max-age=0');
  else headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://liza-memories-photography.com; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
function cookieName(env) { return local(env) ? LOCAL_COOKIE : COOKIE; }
function sessionCookie(token, env, maxAge = 7 * 86400) {
  return `${cookieName(env)}=${token}; Path=/; HttpOnly; ${local(env) ? '' : 'Secure; '}SameSite=Lax; Max-Age=${maxAge}`;
}
async function session(request, env) {
  const cookies = request.headers.get('cookie') || '';
  const token = cookies.split(';').map(x => x.trim()).find(x => x.startsWith(cookieName(env) + '='))?.slice(cookieName(env).length + 1);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  return first(env, 'SELECT u.id,u.email,u.name,u.role,s.csrf,s.token_hash FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.disabled=0', await sha256(token), Date.now());
}
function publicUser(user) { return user ? { id: user.id, email: user.email, name: user.name, role: user.role } : null; }
function sameOrigin(request, env) {
  if (request.headers.get('origin') !== portalOrigin(env)) fail(403, 'Diese Anfrage ist nicht erlaubt.', 'invalid_origin');
}
function csrf(request, env, user) {
  sameOrigin(request, env);
  if (!safeEqual(request.headers.get('x-csrf-token'), user.csrf)) fail(403, 'Bitte lade die Seite neu und versuche es erneut.', 'invalid_csrf');
}
async function requireUser(request, env, mutate = false, admin = false) {
  const user = await session(request, env);
  if (!user) fail(401, 'Bitte melde dich an.', 'authentication_required');
  if (admin && user.role !== 'admin') fail(403, 'Für diesen Bereich fehlt die Berechtigung.', 'admin_required');
  if (mutate) csrf(request, env, user);
  return user;
}
async function newSession(env, userId) {
  const token = randomToken(); const csrf = randomToken(); const now = Date.now();
  await run(env, 'INSERT INTO sessions(token_hash,user_id,csrf,expires_at,created_at) VALUES(?,?,?,?,?)', await sha256(token), userId, csrf, now + 7 * DAY, now);
  return { token, csrf };
}
async function rate(env, key, maximum, windowMs) {
  const now = Date.now();
  const result = await first(env, 'INSERT INTO rate_limits(key,count,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset_at<=? THEN 1 ELSE count+1 END,reset_at=CASE WHEN reset_at<=? THEN excluded.reset_at ELSE reset_at END RETURNING count', key, now + windowMs, now, now);
  if (result.count > maximum) fail(429, 'Zu viele Versuche. Bitte warte etwas und versuche es später erneut.', 'rate_limited');
}
async function authRate(request, env, email, prefix) {
  const ip = local(env) ? 'local' : (request.headers.get('cf-connecting-ip') || 'unknown');
  await rate(env, `${prefix}:ip:${await sha256(ip)}`, 30, 15 * 60_000);
  if (email) await rate(env, `${prefix}:email:${await sha256(email)}`, 10, 15 * 60_000);
}
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, x => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[x])); }
function portalPath(env) {
  const path = env.PORTAL_PATH || '/portal/';
  if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(path)) fail(503, 'Die Portal-Adresse ist noch nicht eingerichtet.', 'not_configured');
  return path;
}
async function mail(env, message) {
  if (local(env) && env.__TEST_MAIL?.send) return env.__TEST_MAIL.send(message);
  if (!env.EMAIL_API_KEY || !env.EMAIL_FROM) fail(503, 'Der E-Mail-Versand ist noch nicht eingerichtet.', 'email_not_configured');
  const result = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${env.EMAIL_API_KEY}`, 'Content-Type': 'application/json', ...(message.idempotencyKey ? { 'Idempotency-Key': message.idempotencyKey } : {}) },
    body: JSON.stringify({ from: message.from || env.EMAIL_FROM, to: [message.to], subject: message.subject, html: message.html, text: message.text, ...(message.attachments?.length ? { attachments: message.attachments } : {}) }),
  });
  if (!result.ok) fail(503, 'Die E-Mail konnte gerade nicht verschickt werden. Bitte versuche es später erneut.', 'email_delivery_failed');
}
async function issueAuthToken(env, user, purpose, gallery = null) {
  const token = randomToken(); const now = Date.now();
  const hasTarget = (await all(env, 'PRAGMA table_info(auth_tokens)')).some(column => column.name === 'gallery_id');
  await env.DB.batch([
    statement(env, 'DELETE FROM auth_tokens WHERE user_id=?', user.id),
    hasTarget
      ? statement(env, 'INSERT INTO auth_tokens(token_hash,user_id,purpose,expires_at,created_at,gallery_id) VALUES(?,?,?,?,?,?)', await sha256(token), user.id, purpose, now + 30 * 60_000, now, gallery?.id || null)
      : statement(env, 'INSERT INTO auth_tokens(token_hash,user_id,purpose,expires_at,created_at) VALUES(?,?,?,?,?)', await sha256(token), user.id, purpose, now + 30 * 60_000, now),
  ]);
  const url = successUrl(env, `?token=${token}&purpose=${purpose}${gallery ? `&gallery=${encodeURIComponent(gallery.id)}` : ''}`);
  try { await mail(env, { to: user.email, ...await renderConfiguredEmail(env, { kind: gallery && purpose === 'setup' ? 'invite' : purpose, requiresFinalDelivery: Boolean(gallery?.require_final_delivery), customerName: user.name, galleryName: gallery?.name, galleryUrl: gallery ? successUrl(env, `?gallery=${gallery.id}`) : undefined, setupUrl: purpose === 'setup' ? url : undefined, actionUrl: url, businessName: businessContact(env).name }) }); }
  catch (error) { await run(env, 'DELETE FROM auth_tokens WHERE token_hash=?', await sha256(token)); throw error; }
}
async function auth(request, env, path, context) {
  sameOrigin(request, env);
  const data = await body(request);
  if (path === '/auth/login') {
    const email = normalizeEmail(data.email); const password = typeof data.password === 'string' ? data.password : '';
    if (password.length > 256) fail(400, 'Bitte prüfe dein Passwort.');
    await authRate(request, env, email, 'login');
    const user = await first(env, 'SELECT * FROM users WHERE email=?', email);
    const valid = await verifyPassword(password, user?.password_hash || DUMMY_HASH, env.PASSWORD_PEPPER);
    if (!valid || !user || user.disabled || !user.password_hash) fail(401, 'E-Mail-Adresse oder Passwort stimmen nicht.', 'invalid_credentials');
    const created = await newSession(env, user.id);
    await audit(env, user.id, 'login');
    return json({ user: publicUser(user), csrf: created.csrf, capabilities: capabilities(env) }, 200, { 'Set-Cookie': sessionCookie(created.token, env) });
  }
  if (path === '/auth/request') {
    const email = normalizeEmail(data.email); const purpose = data.purpose === 'setup' ? 'setup' : 'reset';
    await authRate(request, env, email, 'email');
    if (!capabilities(env).email) fail(503, 'Der E-Mail-Versand ist noch nicht eingerichtet.', 'email_not_configured');
    const user = await first(env, 'SELECT * FROM users WHERE email=? AND disabled=0', email);
    if (user && !(purpose === 'setup' && user.password_hash)) {
      const target = typeof data.galleryId === 'string' ? await first(env, 'SELECT g.* FROM galleries g JOIN gallery_members m ON m.gallery_id=g.id WHERE g.id=? AND m.user_id=? AND g.published=1 AND (g.expires_at IS NULL OR g.expires_at>?)', data.galleryId, user.id, Date.now()) : null;
      const delivery = issueAuthToken(env, user, purpose, target).catch(error => {
        // The public reply must not reveal an existing address through delivery errors.
        console.error('portal_auth_email_delivery_failed', { kind: error?.name || 'Error' });
      });
      // Production responds without the email-provider latency exposing account existence.
      // Local tests await their in-memory mail sink so the complete flow stays deterministic.
      if (!local(env) && context?.waitUntil) context.waitUntil(delivery); else await delivery;
    }
    return json({ ok: true, message: AUTH_MESSAGE });
  }
  if (path === '/auth/complete') {
    await authRate(request, env, null, 'token');
    if (!/^[a-f0-9]{64}$/.test(data.token || '')) fail(400, 'Dieser Link ist ungültig oder abgelaufen.', 'invalid_token');
    if (typeof data.password !== 'string' || data.password.length < 12 || data.password.length > 256) fail(400, 'Bitte verwende ein Passwort mit mindestens 12 Zeichen.', 'weak_password');
    const tokenHash = await sha256(data.token);
    const token = await first(env, 'SELECT t.*,u.disabled FROM auth_tokens t JOIN users u ON u.id=t.user_id WHERE t.token_hash=? AND t.expires_at>?', tokenHash, Date.now());
    if (!token || token.disabled) fail(400, 'Dieser Link ist ungültig oder abgelaufen.', 'invalid_token');
    const passwordHash = await hashPassword(data.password, env.PASSWORD_PEPPER);
    // DELETE RETURNING claims the single-use token atomically before changing the password.
    const claimed = await first(env, 'DELETE FROM auth_tokens WHERE token_hash=? AND expires_at>? RETURNING user_id', tokenHash, Date.now());
    if (!claimed) fail(400, 'Dieser Link wurde bereits verwendet.', 'invalid_token');
    await env.DB.batch([
      statement(env, 'UPDATE users SET password_hash=? WHERE id=? AND disabled=0', passwordHash, token.user_id),
      statement(env, 'DELETE FROM sessions WHERE user_id=?', token.user_id),
      statement(env, 'DELETE FROM auth_tokens WHERE user_id=?', token.user_id),
    ]);
    const user = await first(env, 'SELECT * FROM users WHERE id=? AND disabled=0', token.user_id);
    if (!user) fail(401, 'Der Zugang ist nicht mehr aktiv.');
    const created = await newSession(env, user.id);
    await audit(env, user.id, `password_${token.purpose}`);
    const target = token.gallery_id ? await first(env, 'SELECT g.id FROM galleries g JOIN gallery_members m ON m.gallery_id=g.id WHERE g.id=? AND m.user_id=? AND g.published=1 AND (g.expires_at IS NULL OR g.expires_at>?)', token.gallery_id, user.id, Date.now()) : null;
    return json({ user: publicUser(user), csrf: created.csrf, capabilities: capabilities(env), galleryId: target?.id || null }, 200, { 'Set-Cookie': sessionCookie(created.token, env) });
  }
  fail(404, 'Diese Funktion wurde nicht gefunden.');
}

async function galleryAccess(env, galleryId, user) {
  const gallery = await first(env, 'SELECT * FROM galleries WHERE id=?', galleryId);
  if (!gallery || gallery.deleted_at) fail(404, 'Die Galerie wurde nicht gefunden.', 'gallery_not_found');
  if (user.role !== 'admin') {
    if (!gallery.published || (gallery.expires_at && gallery.expires_at <= Date.now())) fail(404, 'Die Galerie ist derzeit nicht verfügbar.', 'gallery_not_found');
    const member = await first(env, 'SELECT 1 AS ok FROM gallery_members WHERE gallery_id=? AND user_id=?', galleryId, user.id);
    if (!member) fail(404, 'Die Galerie wurde nicht gefunden.', 'gallery_not_found');
  }
  return gallery;
}
function galleryJson(gallery) {
  return { id: gallery.id, name: gallery.name, date: gallery.shooting_date, description: gallery.description, shootingType: gallery.shooting_type || 'other', pricingMode: gallery.pricing_mode || 'gallery', requireFinalDelivery: Boolean(gallery.require_final_delivery), ...effectiveGalleryDesign(gallery), gridLayout: gallery.grid_layout || 'masonry', coverPosition: gallery.cover_position ?? 50, coverHeight: gallery.cover_height || 'standard', gridDensity: gallery.grid_density || 'comfortable', gridGap: gallery.grid_gap ?? 16, showFilenames: Boolean(gallery.show_filenames ?? 0), watermarkMode: gallery.watermark_mode || 'inherit', typography: gallery.typography || 'serif', published: Boolean(gallery.published), expiresAt: gallery.expires_at ? new Date(gallery.expires_at).toISOString() : null, coverImageId: gallery.cover_image_id, coverUrl: gallery.cover_image_id ? `/api/images/${gallery.cover_image_id}?kind=preview` : null, imageCount: gallery.image_count ?? undefined };
}
function packageJson(pack) { return { id: pack.id, galleryId: pack.gallery_id, name: pack.name, imageCount: pack.image_count, priceCents: pack.price_cents, currency: pack.currency, active: Boolean(pack.active), position: pack.position ?? 0, isRequired: Boolean(pack.is_required) }; }
async function requiredPackageState(env, galleryId, userId) {
  if (!(await optionalSchema(env)).requiredPackages) return { pack: null, paid: false };
  const pack = await first(env, 'SELECT * FROM packages WHERE gallery_id=? AND active=1 AND is_required=1', galleryId);
  const outstanding = pack && userId ? await first(env, `SELECT id,status,receipt_sent_at FROM orders WHERE gallery_id=? AND user_id=? AND status IN ('pending','paid') AND json_extract(pricing_json,'$.requiredPackageId')=? AND ${await liveOrder(env)} LIMIT 1`, galleryId, userId, pack.id) : null;
  return { pack, paid: Boolean(outstanding?.status === 'paid' && outstanding.receipt_sent_at), outstanding };
}
function requiredBookingConflict(order) {
  if (order.status === 'paid') fail(409, 'Dein gebuchtes Paket ist bereits bezahlt. Die Bestätigung wird noch zugestellt. Bitte warte auf die Freigabe, statt erneut zu bestellen.', 'required_package_processing');
  fail(409, 'Für dein gebuchtes Paket besteht bereits eine Bestellung. Öffne sie unter „Deine Bestellungen“. Wenn du die Bildauswahl ändern möchtest, kontaktiere bitte Emina.', 'required_package_pending');
}
function imageJson(image, allowed = false) {
  return { id: image.id, galleryId: image.gallery_id, finalReady: Boolean(image.final_ready), title: image.title, width: image.width, height: image.height, position: image.position, createdAt: new Date(image.created_at).toISOString(), previewUrl: `/api/images/${image.id}?kind=preview`, originalUrl: `/api/images/${image.id}?kind=original`, downloadAllowed: Boolean(allowed) };
}
function adminImageJson(image, protection) {
  protection = imageProtection(protection, image);
  return { sourceFilename: image.source_filename || null, watermarkOverride: image.watermark_override || 'inherit', ...imageJson(image, true), protectedPreviewUrl: `/api/images/${image.id}?kind=preview&watermark=1`, watermarkEnabled: protection.enabled, protectedPreviewReady: Boolean(image.protected_preview_key && image.watermark_fingerprint === protection.fingerprint) };
}
async function selectedImages(env, galleryId, selected) {
  ids(selected);
  if (!selected.length) return [];
  const found = await all(env, 'SELECT i.* FROM images i JOIN json_each(?) selected ON selected.value=i.id WHERE i.gallery_id=?', JSON.stringify(selected), galleryId);
  if (found.length !== selected.length) fail(400, 'Die Auswahl enthält Bilder außerhalb dieser Galerie.', 'invalid_selection');
  return found;
}
async function releasedIds(env, userId, galleryId) {
  const controls = (await optionalSchema(env)).imageControls;
  const guard = controls ? ' AND NOT EXISTS(SELECT 1 FROM image_download_blocks b WHERE b.image_id=i.id AND b.user_id=?)' : '';
  const rows = await all(env, `SELECT i.id FROM images i WHERE i.gallery_id=? AND (EXISTS(SELECT 1 FROM manual_releases r WHERE r.image_id=i.id AND r.user_id=? AND ${await finalizedImage(env)}) OR EXISTS(SELECT 1 FROM order_images oi JOIN orders o ON o.id=oi.order_id WHERE oi.image_id=i.id AND o.user_id=? AND o.status='paid' AND o.receipt_sent_at IS NOT NULL AND ${await liveOrder(env, 'o')} AND ${await finalizedOrder(env)}))` + guard, galleryId, userId, userId, ...(controls ? [userId] : []));
  return new Set(rows.map(x => x.id));
}
async function imageReleased(env, userId, imageId) {
  if ((await optionalSchema(env)).imageControls && await first(env, 'SELECT 1 AS blocked FROM image_download_blocks WHERE user_id=? AND image_id=?', userId, imageId)) return false;
  const result = await first(env, `SELECT 1 AS allowed FROM images i WHERE i.id=? AND (EXISTS(SELECT 1 FROM manual_releases r WHERE r.user_id=? AND r.image_id=i.id AND ${await finalizedImage(env)}) OR EXISTS(SELECT 1 FROM order_images oi JOIN orders o ON o.id=oi.order_id WHERE oi.image_id=i.id AND o.user_id=? AND o.status='paid' AND o.receipt_sent_at IS NOT NULL AND ${await liveOrder(env, 'o')} AND ${await finalizedOrder(env)}))`, imageId, userId, userId);
  return Boolean(result);
}
async function galleryDetail(env, galleryId, user, customerView = false) {
  const gallery = await galleryAccess(env, galleryId, user);
  const adminView = user.role === 'admin' && !customerView;
  const packageOrder = (await optionalSchema(env)).packageOrder ? 'position,image_count,price_cents,id' : 'image_count,price_cents,id';
  const required = await requiredPackageState(env, galleryId, user.role === 'admin' ? null : user.id);
  const [images, packages, favorites, released] = await Promise.all([
    all(env, 'SELECT * FROM images WHERE gallery_id=? ORDER BY position,created_at,id', galleryId),
    adminView
      ? all(env, `SELECT * FROM packages WHERE gallery_id=? ORDER BY ${packageOrder}`, galleryId)
      : all(env, `SELECT * FROM packages WHERE gallery_id=? AND active=1 AND (?=? OR image_count=0) ORDER BY ${packageOrder}`, galleryId, required.pack ? 'images' : gallery.pricing_mode, 'images'),
    all(env, 'SELECT f.image_id FROM favorites f JOIN images i ON i.id=f.image_id WHERE f.user_id=? AND i.gallery_id=?', user.id, galleryId),
    releasedIds(env, user.id, galleryId),
  ]);
  const members = adminView ? await all(env, 'SELECT u.id,u.email,u.name FROM gallery_members m JOIN users u ON u.id=m.user_id WHERE m.gallery_id=? ORDER BY u.name', galleryId) : undefined;
  const details = { gallery: galleryJson({ ...gallery, image_count: images.length }), images: images.map(x => imageJson(x, !customerView && (adminView || released.has(x.id)))), packages: packages.map(packageJson), favorites: customerView ? [] : favorites.map(x => x.image_id) };
  details.requiredPackageId = required.pack?.id || null;
  details.requiredPackagePaid = required.paid;
  if (required.pack && !details.packages.some(pack => pack.id === required.pack.id)) details.packages.push(packageJson(required.pack));
  if (adminView) {
    details.finalDeliveryReady = (await optionalSchema(env)).finalDelivery;
    details.packageOrderReady = (await optionalSchema(env)).packageOrder;
    details.requiredPackagesReady = (await optionalSchema(env)).requiredPackages;
    details.imageControlsReady = (await optionalSchema(env)).imageControls;
    details.previewSettings = await previewSettings(env, gallery);
    const grants = await all(env, `SELECT r.user_id,r.image_id FROM manual_releases r JOIN images i ON i.id=r.image_id WHERE i.gallery_id=? AND ${await finalizedImage(env)} UNION SELECT o.user_id,oi.image_id FROM orders o JOIN order_images oi ON oi.order_id=o.id WHERE o.gallery_id=? AND o.status='paid' AND o.receipt_sent_at IS NOT NULL AND ${await liveOrder(env, 'o')} AND ${await finalizedOrder(env)}`, galleryId, galleryId);
    const blocks = details.imageControlsReady ? await all(env, 'SELECT b.user_id,b.image_id FROM image_download_blocks b JOIN images i ON i.id=b.image_id WHERE i.gallery_id=?', galleryId) : [];
    const blocked = new Set(blocks.map(row => JSON.stringify([row.user_id,row.image_id])));
    details.downloadAccess = { releases: grants.filter(row => !blocked.has(JSON.stringify([row.user_id,row.image_id]))).map(row => ({ userId: row.user_id, imageId: row.image_id })), blocks: blocks.map(row => ({ userId: row.user_id, imageId: row.image_id })) };
    details.images = images.map(image => adminImageJson(image, details.previewSettings));
    const rows = await all(env, "SELECT u.id,u.name,u.email,f.image_id FROM gallery_members m JOIN users u ON u.id=m.user_id LEFT JOIN favorites f ON f.user_id=u.id AND f.image_id IN (SELECT id FROM images WHERE gallery_id=?) WHERE m.gallery_id=? AND u.role='customer' AND u.disabled=0 ORDER BY u.name,u.id,f.image_id", galleryId, galleryId);
    const customers = new Map(); const perImage = new Map(images.map(image => [image.id, { imageId: image.id, count: 0, customers: [] }]));
    for (const row of rows) {
      if (!customers.has(row.id)) customers.set(row.id, { id: row.id, name: row.name, email: row.email, imageIds: [], count: 0 });
      if (row.image_id) {
        const customer = customers.get(row.id); customer.imageIds.push(row.image_id); customer.count++;
        const image = perImage.get(row.image_id); image.customers.push({ id: row.id, name: row.name, email: row.email }); image.count++;
      }
    }
    details.members = members;
    details.customerFavorites = { customers: [...customers.values()], images: [...perImage.values()], count: [...customers.values()].reduce((sum, customer) => sum + customer.count, 0) };
    details.notificationStatus = await notificationStatus(env, { galleryId });
    details.invoices = (await optionalSchema(env)).invoices ? (await all(env, 'SELECT * FROM gallery_invoices WHERE gallery_id=? ORDER BY uploaded_at DESC', galleryId)).map(invoice => invoiceJson(invoice, true)) : [];
  } else if (customerView && user.role === 'admin') {
    // Admins can inspect the same protected previews that an unpaid customer sees,
    // without changing their original-download permissions or normal admin URLs.
    details.images.forEach(image => { image.previewUrl += '&watermark=1'; });
    if (details.gallery.coverUrl) details.gallery.coverUrl += '&watermark=1';
  } else if (!customerView) {
    details.invoice = (await optionalSchema(env)).invoices ? invoiceJson(await first(env, 'SELECT * FROM gallery_invoices WHERE gallery_id=? AND user_id=?', galleryId, user.id)) : null;
  }
  return details;
}
async function listGalleries(env, user) {
  const deletion = (await optionalSchema(env)).galleryDeletion;
  const rows = user.role === 'admin'
    ? await all(env, `SELECT g.*,(SELECT COUNT(*) FROM images i WHERE i.gallery_id=g.id) AS image_count FROM galleries g ${deletion?'WHERE g.deleted_at IS NULL':''} ORDER BY g.created_at DESC`)
    : await all(env, `SELECT g.*,(SELECT COUNT(*) FROM images i WHERE i.gallery_id=g.id) AS image_count FROM galleries g JOIN gallery_members m ON m.gallery_id=g.id WHERE m.user_id=? AND g.published=1 ${deletion?'AND g.deleted_at IS NULL':''} AND (g.expires_at IS NULL OR g.expires_at>?) ORDER BY g.shooting_date DESC`, user.id, Date.now());
  return { galleries: rows.map(galleryJson), ...(user.role === 'admin' && deletion ? { pendingDeletions: await all(env, 'SELECT id,name FROM galleries WHERE deleted_at IS NOT NULL AND media_deleted_at IS NULL ORDER BY deleted_at') } : {}) };
}
async function serveImage(request, env, imageId, user) {
  let image = await first(env, 'SELECT * FROM images WHERE id=?', imageId);
  if (!image) fail(404, 'Das Bild wurde nicht gefunden.');
  const gallery = await galleryAccess(env, image.gallery_id, user);
  const query = new URL(request.url).searchParams;
  const kind = query.get('kind') || 'preview';
  if (!['preview', 'original'].includes(kind)) fail(400, 'Unbekannte Bildversion.');
  const released = user.role === 'admin' || await imageReleased(env, user.id, image.id);
  // Permission can become ready while a final replaces a proof. Always fetch
  // its current committed keys after the grant check, never serve a stale proof.
  image = await first(env, 'SELECT * FROM images WHERE id=?', imageId);
  if (!image) fail(404, 'Das Bild wurde nicht gefunden.');
  if (kind === 'original' && !released) fail(403, 'Dieses Bild ist noch nicht zum Download freigegeben.', 'download_not_released');
  let previewKey = image.preview_key; let previewType = image.preview_type;
  const adminProtectedPreview = user.role === 'admin' && query.get('watermark') === '1';
  if (kind === 'preview' && (!released || adminProtectedPreview)) {
    const protection = imageProtection(await previewSettings(env, gallery), image);
    if (protection.enabled) {
      if (!image.protected_preview_key || image.watermark_fingerprint !== protection.fingerprint) {
        // Never fall back to the clean image while a protected preview is missing
        // or still uses obsolete settings. This is a static, non-interactive image.
        return new Response(request.method === 'HEAD' ? null : '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="#f3e5dc"/><path d="M275 178v-18a25 25 0 0 1 50 0v18m-60 0h70v58h-70z" fill="none" stroke="#845b48" stroke-width="5"/></svg>', { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'private, no-store, max-age=0', 'X-LiZa-Preview': 'pending' } });
      }
      previewKey = image.protected_preview_key; previewType = image.protected_preview_type;
    }
  }
  const object = await env.PHOTOS.get(kind === 'preview' ? previewKey : image.original_key);
  if (!object) fail(404, 'Die Bilddatei ist nicht verfügbar.');
  const type = kind === 'preview' ? previewType : image.original_type;
  const headers = new Headers({ 'Content-Type': type, 'Cache-Control': 'private, no-store, max-age=0' });
  if (object.size !== undefined) headers.set('Content-Length', String(object.size));
  if (kind === 'original') {
    const extension = type === 'image/jpeg' ? 'jpg' : type === 'image/png' ? 'png' : 'webp';
    const filename = `${image.title.replace(/[\\/\r\n"<>:|?*]/g, '_').slice(0, 100) || 'LiZa-Memories'}-${image.id.slice(0, 8)}.${extension}`;
    headers.set('Content-Disposition', `attachment; filename="foto.${extension}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    if (request.method === 'GET') await recordDownload(env, user, image);
  }
  return new Response(request.method === 'HEAD' ? null : object.body, { headers });
}
async function orderJson(env, order, adminView = false) {
  const features = await optionalSchema(env);
  const delivery = features.finalDelivery ? (Object.hasOwn(order, 'delivery_total') ? { require_final_delivery: order.delivery_required, total: order.delivery_total, ready: order.delivery_ready } : await first(env, 'SELECT g.require_final_delivery,(SELECT COUNT(*) FROM order_images WHERE order_id=?) AS total,(SELECT COUNT(*) FROM order_images oi JOIN images i ON i.id=oi.image_id WHERE oi.order_id=? AND i.final_ready=1) AS ready FROM galleries g WHERE g.id=?', order.id, order.id, order.gallery_id)) : null;
  const blockedCount = order.blocked_count ?? ((await optionalSchema(env)).imageControls && order.status === 'paid' ? (await first(env, 'SELECT COUNT(*) AS n FROM image_download_blocks b JOIN order_images oi ON oi.image_id=b.image_id WHERE oi.order_id=? AND b.user_id=?', order.id, order.user_id)).n : 0);
  const imageIds = order.image_ids_json === undefined
    ? (await all(env, 'SELECT image_id FROM order_images WHERE order_id=? ORDER BY image_id', order.id)).map(x => x.image_id)
    : JSON.parse(order.image_ids_json);
  return { id: order.id, requireFinalDelivery: Boolean(delivery?.require_final_delivery), deliveryPending: Boolean(delivery?.require_final_delivery && order.status === 'paid' && delivery.ready < delivery.total), finalReadyCount: delivery?.ready || 0, finalImageCount: delivery?.total || imageIds.length, reference: orderReference(order), invoiceUrl: orderInvoice(order) ? `/api/orders/${order.id}/invoice` : null, userId: order.user_id, galleryId: order.gallery_id, galleryName: order.gallery_name, customerName: order.customer_name, customerEmail: order.customer_email, packageId: order.package_id, packageName: order.package_name, packageQuantity: order.package_quantity || 1, imageIds, downloadBlockedCount: blockedCount, amountCents: order.amount_cents, currency: order.currency, status: order.status, paymentMethod: order.payment_method, paymentUrl: order.checkout_url || null, createdAt: new Date(order.created_at).toISOString(), paidAt: order.paid_at ? new Date(order.paid_at).toISOString() : null, receiptSent: Boolean(order.receipt_sent_at), receiptUrl: `/api/orders/${order.id}/receipt`, withdrawalRequested: Boolean(order.withdrawal_requested_at), ...(adminView ? { canDeleteTest: (await optionalSchema(env)).orderDeletion && testOrderEligible(order), notificationStatus: order.notification_status || await notificationStatus(env, { orderId: order.id }, order.status === 'paid' && !order.receipt_sent_at) } : {}) };
}
async function getOrder(env, orderId, includeDeleted = false) {
  return first(env, `SELECT o.*,g.name AS gallery_name,u.name AS customer_name,u.email AS customer_email,(SELECT COUNT(*) FROM payment_events WHERE order_id=o.id) AS has_payment_events FROM orders o JOIN galleries g ON g.id=o.gallery_id JOIN users u ON u.id=o.user_id WHERE o.id=? AND ${includeDeleted ? '1=1' : await liveOrder(env, 'o')}`, orderId);
}
async function listOrders(env, user, admin = false) {
  const features = await optionalSchema(env);
  const deliveryFields = features.finalDelivery ? ',g.require_final_delivery AS delivery_required,(SELECT COUNT(*) FROM order_images WHERE order_id=o.id) AS delivery_total,(SELECT COUNT(*) FROM order_images oi JOIN images i ON i.id=oi.image_id WHERE oi.order_id=o.id AND i.final_ready=1) AS delivery_ready' : '';
  const rows = admin ? await all(env, `SELECT o.*${deliveryFields},g.name AS gallery_name,u.name AS customer_name,u.email AS customer_email,(SELECT COUNT(*) FROM payment_events WHERE order_id=o.id) AS has_payment_events,(SELECT COALESCE(json_group_array(image_id),'[]') FROM order_images WHERE order_id=o.id) AS image_ids_json FROM orders o JOIN galleries g ON g.id=o.gallery_id JOIN users u ON u.id=o.user_id WHERE ${await liveOrder(env, 'o')} ORDER BY o.created_at DESC LIMIT 500`)
    : await all(env, `SELECT o.*${deliveryFields},g.name AS gallery_name,(SELECT COALESCE(json_group_array(image_id),'[]') FROM order_images WHERE order_id=o.id) AS image_ids_json FROM orders o JOIN galleries g ON g.id=o.gallery_id WHERE o.user_id=? AND ${await liveOrder(env, 'o')} ORDER BY o.created_at DESC LIMIT 100`, user.id);
  if (admin) {
    const ready = (await optionalSchema(env)).notifications;
    const notices = ready ? await all(env, 'SELECT order_id,COALESCE(SUM(CASE WHEN sent_at IS NOT NULL THEN 1 ELSE 0 END),0) AS sent_count,COALESCE(SUM(CASE WHEN sent_at IS NULL AND cancelled_at IS NULL THEN 1 ELSE 0 END),0) AS pending_count,MAX(CASE WHEN sent_at IS NULL AND cancelled_at IS NULL THEN error_code END) AS error_code FROM download_notifications WHERE order_id IS NOT NULL GROUP BY order_id') : [];
    const byOrder = new Map(notices.map(notice => [notice.order_id, notice]));
    for (const row of rows) {
      const notice = byOrder.get(row.id); const receiptPending = row.status === 'paid' && !row.receipt_sent_at;
      row.notification_status = { status: !ready ? 'unavailable' : notice?.pending_count || receiptPending ? 'pending' : notice?.sent_count ? 'sent' : 'none', pendingCount: notice?.pending_count || 0, ...(!ready ? { code: 'migration_required' } : notice?.error_code ? { code: notice.error_code } : {}), ...(receiptPending ? { receiptPending: true } : {}) };
    }
  }
  const blocks = (await optionalSchema(env)).imageControls && rows.length ? await all(env, 'SELECT o.id,COUNT(*) AS n FROM orders o JOIN order_images oi ON oi.order_id=o.id JOIN image_download_blocks b ON b.user_id=o.user_id AND b.image_id=oi.image_id WHERE o.id IN (SELECT value FROM json_each(?)) GROUP BY o.id', JSON.stringify(rows.map(row => row.id))) : [];
  const counts = new Map(blocks.map(row => [row.id,row.n]));
  rows.forEach(row => { row.blocked_count = counts.get(row.id) || 0; });
  return { orders: await Promise.all(rows.map(x => orderJson(env, x, admin))), ...(admin ? { testOrderDeletionReady: (await optionalSchema(env)).orderDeletion } : {}) };
}
function successUrl(env, suffix) { return `${portalOrigin(env)}${portalPath(env)}${suffix}`; }
function businessContact(env) {
  return { name: env.BUSINESS_NAME || 'Emina Huremovic · LiZa Memories Photography', address: env.BUSINESS_ADDRESS || 'Mela-Spira-Straße 32b, 8054 Graz-Straßgang, Österreich', email: env.CONTACT_EMAIL || 'info@liza-memories-photography.com', phone: env.CONTACT_PHONE || '+43 681 819 427 80' };
}
async function baseOrderReceipt(env, order) {
  const contact = businessContact(env);
  const gallery = await first(env, 'SELECT * FROM galleries WHERE id=?', order.gallery_id);
  const deliveryText = gallery.require_final_delivery ? 'Diese Galerie dient zunächst der Bildauswahl. Nach deiner Bestellung werden die ausgewählten Bilder fertig bearbeitet. Der Download wird erst freigegeben, wenn die Zahlung bestätigt wurde, alle bestellten fertigen Originaldateien hinterlegt sind und diese Vertragsbestätigung per E-Mail versandt wurde. Du erhältst dann eine eigene E-Mail zur Download-Freigabe. Unbearbeitete Auswahlbilder werden nicht zum Download freigegeben.' : 'Bei Überweisung wird der Download nach Prüfung des Zahlungseingangs freigegeben. Bei bestätigter Onlinezahlung erfolgt die Freigabe automatisch, sobald diese Vertragsbestätigung per E-Mail versandt wurde.';
  const images = await all(env, 'SELECT i.id,i.title,i.original_type FROM images i JOIN order_images oi ON oi.image_id=i.id WHERE oi.order_id=? ORDER BY i.title,i.id', order.id);
  const expiryText = gallery.expires_at ? `Die Galerie ist bis ${new Date(gallery.expires_at).toLocaleDateString('de-AT', { timeZone: 'Europe/Vienna' })} erreichbar. Bitte sichere deine Downloads bis dahin.` : 'Bitte sichere heruntergeladene Fotos zusätzlich auf deinem eigenen Gerät.';
  return `BESTELLBESTÄTIGUNG\nLiZa Memories Photography\n\nBestellnummer: ${order.id}\nBestellt am: ${new Date(order.created_at).toISOString()}\nKunde: ${order.customer_name}\nE-Mail: ${order.customer_email}\nGalerie: ${order.gallery_name}\nPaket: ${order.package_name}\nBilder:\n${images.map(x => `- ${x.title} (${x.id})`).join('\n')}\nGesamtbetrag: ${(order.amount_cents / 100).toFixed(2)} EUR\nKeine Versandkosten. Umsatzsteuerfrei aufgrund der österreichischen Kleinunternehmerregelung.\nZahlungsart: ${order.payment_method === 'transfer' ? 'Banküberweisung' : order.payment_method === 'stripe' ? 'Karte über Stripe' : 'PayPal'}${gallery.require_final_delivery ? '\nLieferablauf: Auswahlgalerie mit anschließender Fertigstellung' : ''}\n\nBESTELLBEDINGUNGEN (${order.terms_version})\nVertragspartner: ${contact.name}\n${contact.address}\nE-Mail: ${contact.email}\nTelefon: ${contact.phone}\n\nDu kaufst die oben ausgewählten digitalen Fotografien. Es werden keine Papierabzüge oder physischen Produkte geliefert. Die Dateien im hochgeladenen JPEG-, PNG- oder WebP-Format lassen sich auf gängigen aktuellen Geräten anzeigen, speichern und für eigene private Zwecke ausdrucken. Ein Internetzugang und ausreichend eigener Speicher sind nötig. Die Vorschau kann zum Schutz geringer aufgelöst oder mit einem Wasserzeichen versehen sein; geliefert wird die hinterlegte Originaldatei.\n\nMit dem zahlungspflichtigen Absenden wird die ausgewählte Bestellung zum angegebenen Gesamtpreis abgeschlossen. Der Betrag ist vor Bereitstellung zu zahlen. ${deliveryText} Es entstehen im Portal keine zusätzlichen Lieferkosten. ${expiryText}\n\nDie Fotos sind zur privaten Nutzung und zum privaten Ausdruck bestimmt. Eine kommerzielle Verwendung oder die Übertragung von Urheberrechten ist nicht Teil des Kaufs. Gesetzliche Gewährleistungsrechte bleiben bestehen. Bei fehlenden oder fehlerhaften Dateien kontaktiere bitte ${contact.email}. Es besteht keine wiederkehrende Zahlung und kein Abonnement.\n\nDEINE AUSDRÜCKLICHE ERKLÄRUNG ZUR DIGITALEN BEREITSTELLUNG\nDu hast beim Bestellen gesondert zugestimmt: Ich verlange die Bereitstellung der digitalen Fotos vor Ablauf der gesetzlichen Rücktrittsfrist und nehme zur Kenntnis, dass mein Rücktrittsrecht mit dem Beginn der Bereitstellung der digitalen Inhalte und nach Erhalt dieser Vertragsbestätigung erlischt. Die Erklärung wurde am ${new Date(order.consent_at).toISOString()} gespeichert.\n\nRÜCKTRITTSBELEHRUNG\nSolange die Voraussetzungen für den Verlust des Rücktrittsrechts nicht erfüllt sind, kannst du binnen 14 Tagen ab Vertragsabschluss ohne Angabe von Gründen zurücktreten. Sende dazu eine eindeutige Erklärung an ${contact.name}, ${contact.address}, ${contact.email}, oder verwende die Rücktrittsfunktion deiner Bestellung im Portal. Zur Fristwahrung genügt die rechtzeitige Absendung. Bereits geleistete Zahlungen werden bei einem wirksamen Rücktritt spätestens binnen 14 Tagen ab Eingang der Erklärung grundsätzlich mit demselben Zahlungsmittel erstattet; andere gesetzliche Ansprüche bleiben unberührt.\n\nMUSTER-RÜCKTRITTSFORMULAR\nAn: ${contact.name}, ${contact.address}, ${contact.email}\nHiermit trete ich vom Vertrag über die Bereitstellung der folgenden digitalen Fotos zurück: [Paket / Bestellung ${order.id}]\nBestellt am: [Datum]\nName: [Vor- und Nachname]\nAnschrift: [Anschrift]\nDatum: [Datum]\nUnterschrift: [nur bei Mitteilung auf Papier]\n\nBitte bewahre diese Bestätigung auf.\nEmina\nLiZa Memories Photography`;
}
async function orderReceipt(env, order) {
  const text = await baseOrderReceipt(env, order);
  if (order.payment_method !== 'transfer') return text;
  const bank = bankDetails(env);
  if (!bank) fail(503, 'Die Bankverbindung ist noch nicht vollständig eingerichtet.', 'payment_not_configured');
  const transferText = `\n\nÜBERWEISUNGSDATEN\nEmpfänger: ${bank.recipient}\nIBAN: ${bank.iban}\n${bank.bic ? `BIC: ${bank.bic}\n` : ''}Betrag: ${(order.amount_cents / 100).toFixed(2)} EUR\nZahlungsreferenz: ${orderReference(order)}\nBitte verwende diese Bestellnummer als Zahlungsreferenz. ${text.includes('Lieferablauf: Auswahlgalerie mit anschließender Fertigstellung') ? 'Der Download wird nach bestätigter Zahlung und Fertigstellung aller bestellten Bilder freigegeben. Du erhältst dazu eine eigene E-Mail.' : 'Der Download wird nach Prüfung des Zahlungseingangs freigegeben.'}`;
  return text.replace('\n\nBESTELLBEDINGUNGEN', `${transferText}\n\nBESTELLBEDINGUNGEN`);
}
async function ensureReceipt(env, orderId, resend = false) {
  const order = await getOrder(env, orderId);
  if (!order) fail(404, 'Die Bestellung wurde nicht gefunden.');
  if (order.receipt_sent_at && !resend) return;
  let text = order.receipt_text || await orderReceipt(env, order);
  // Persist the immutable snapshot before mailing. Retry does not silently replace terms.
  if (!order.receipt_text) await run(env, `UPDATE orders SET receipt_text=? WHERE id=? AND receipt_text IS NULL AND ${await liveOrder(env)}`, text, order.id);
  // A concurrent request may have persisted the first snapshot; send that same text.
  text = (await first(env, 'SELECT receipt_text FROM orders WHERE id=?', order.id)).receipt_text;
  const field = label => text.split('\n').find(line => line.startsWith(label + ': '))?.slice(label.length + 2);
  const imageSection = text.split('\nBilder:\n')[1]?.split('\nGesamtbetrag:')[0] || '';
  const amount = Number(field('Gesamtbetrag')?.replace(' EUR', ''));
  const bank = field('IBAN') ? { recipient: field('Empfänger') || '', iban: field('IBAN'), bic: field('BIC') || '' } : null;
  let message;
  let snapshot = order.receipt_email_json ? JSON.parse(order.receipt_email_json) : null;
  if (!snapshot) {
    const invoice = (await optionalSchema(env)).invoices ? await first(env, 'SELECT * FROM gallery_invoices WHERE gallery_id=? AND user_id=?', order.gallery_id, order.user_id) : null;
    message = { to: field('E-Mail') || order.customer_email, ...(env.EMAIL_FROM ? { from: env.EMAIL_FROM } : {}), ...await renderConfiguredEmail(env, { kind: 'order', requiresFinalDelivery: field('Lieferablauf') === 'Auswahlgalerie mit anschließender Fertigstellung', deliveryPending: (await orderJson(env, order)).deliveryPending, customerName: field('Kunde') || order.customer_name, galleryName: field('Galerie') || order.gallery_name, galleryUrl: successUrl(env, `?gallery=${order.gallery_id}`), orderId: order.id, actionUrl: successUrl(env, `?gallery=${order.gallery_id}&order=${order.id}`), paymentReference: field('Zahlungsreferenz') || orderReference(order), packageName: field('Paket') || order.package_name, imageCount: imageSection.split('\n').filter(line => line.startsWith('- ')).length, imageTitles: imageSection.split('\n').filter(line => line.startsWith('- ')).map(line => line.slice(2)), amountCents: Number.isFinite(amount) ? Math.round(amount * 100) : order.amount_cents, currency: order.currency, paymentMethod: order.payment_method, paymentStatus: order.status, bank, receiptText: text, invoiceFilename: invoice?.filename, businessName: field('Vertragspartner') || businessContact(env).name }) };
    if (invoice) {
      const object = await env.PHOTOS.get(invoice.r2_key);
      if (!object) fail(503, 'Die Rechnung ist gerade nicht verfügbar.', 'invoice_attachment_unavailable');
      const bytes = new Uint8Array(await object.arrayBuffer());
      if (bytes.length !== invoice.size || bytes.length > 5 * 1024 * 1024) fail(503, 'Die Rechnung ist gerade nicht verfügbar.', 'invoice_attachment_unavailable');
      message.attachments = [...(message.attachments || []), { filename: invoice.filename, content_type: 'application/pdf', content: base64Bytes(bytes) }];
    }
    if ('receipt_email_json' in order) {
      const { attachments, ...bodySnapshot } = message; const files = [];
      try {
        for (const attachment of attachments || []) {
          const key = `order-confirmations/${order.id}/${id()}.${attachment.content_type === 'application/pdf' ? 'pdf' : 'html'}`;
          files.push({ key, filename: attachment.filename, content_type: attachment.content_type });
          await env.PHOTOS.put(key, Uint8Array.from(atob(attachment.content), character => character.charCodeAt(0)), { httpMetadata: { contentType: attachment.content_type } });
        }
      } catch (error) { await Promise.allSettled(files.map(file => env.PHOTOS.delete(file.key))); throw error; }
      try {
        const stored = await first(env, `UPDATE orders SET receipt_email_json=COALESCE(receipt_email_json,?) WHERE id=? AND ${await liveOrder(env)} RETURNING receipt_email_json`, JSON.stringify({ message: bodySnapshot, files }), order.id);
        snapshot = JSON.parse(stored.receipt_email_json);
      } catch (error) {
        // A lost database response may follow a committed write. Check the saved
        // references before deleting candidates, preserving any committed snapshot.
        try {
          const saved = await first(env, 'SELECT receipt_email_json FROM orders WHERE id=?', order.id);
          const referenced = saved?.receipt_email_json ? JSON.parse(saved.receipt_email_json).files : [];
          await Promise.allSettled(files.filter(file => !referenced.some(item => item.key === file.key)).map(file => env.PHOTOS.delete(file.key)));
        } catch {}
        throw error;
      }
      // Concurrent confirmations use the first snapshot; their unused objects are removed.
      await Promise.allSettled(files.filter(file => !snapshot.files.some(saved => saved.key === file.key)).map(file => env.PHOTOS.delete(file.key)));
    }
  }
  if (snapshot) {
    message = { ...snapshot.message, attachments: [] };
    for (const file of snapshot.files) {
      const object = await env.PHOTOS.get(file.key);
      if (!object) fail(503, 'Die Vertragsbestätigung ist gerade nicht verfügbar.', 'receipt_attachment_unavailable');
      message.attachments.push({ filename: file.filename, content_type: file.content_type, content: base64Bytes(new Uint8Array(await object.arrayBuffer())) });
    }
  }
  if (!await getOrder(env, order.id)) fail(404, 'Die Bestellung wurde nicht gefunden.');
  await mail(env, { ...message, idempotencyKey: `order-receipt/${order.id}${resend ? `/${id()}` : ''}` });
  const features = await optionalSchema(env);
  await env.DB.batch([
    ...(features.notifications && order.status === 'paid' && !order.receipt_sent_at ? [queueGrantNotification(env, features, { galleryId: order.gallery_id, userId: order.user_id, orderId: order.id, receiptTransition: true })] : []),
    statement(env, `UPDATE orders SET receipt_sent_at=COALESCE(receipt_sent_at,?) WHERE id=? AND ${await liveOrder(env)}`, Date.now(), order.id),
  ]);
}

function invoiceJson(invoice, adminView = false) {
  return invoice ? { id: invoice.id, userId: invoice.user_id, filename: invoice.filename, size: invoice.size, uploadedAt: new Date(invoice.uploaded_at).toISOString(), url: `/api/galleries/${invoice.gallery_id}/invoice${adminView ? `?userId=${encodeURIComponent(invoice.user_id)}` : ''}` } : null;
}
const notificationFilter = filter => filter.orderId ? ['order_id=?', filter.orderId] : filter.galleryId ? ['gallery_id=?', filter.galleryId] : ['1=1', null];
async function notificationStatus(env, filter, receiptPending = false) {
  if (!(await optionalSchema(env)).notifications) return { status: 'unavailable', pendingCount: 0, code: 'migration_required', ...(receiptPending ? { receiptPending: true } : {}) };
  const [condition, value] = notificationFilter(filter);
  const row = await first(env, `SELECT COALESCE(SUM(CASE WHEN sent_at IS NOT NULL THEN 1 ELSE 0 END),0) AS sent_count,COALESCE(SUM(CASE WHEN sent_at IS NULL AND cancelled_at IS NULL THEN 1 ELSE 0 END),0) AS pending_count,MAX(CASE WHEN sent_at IS NULL AND cancelled_at IS NULL THEN error_code END) AS error_code FROM download_notifications WHERE ${condition}`, ...(value === null ? [] : [value]));
  return { status: row.pending_count || receiptPending ? 'pending' : row.sent_count ? 'sent' : 'none', pendingCount: row.pending_count, ...(row.error_code ? { code: row.error_code } : {}), ...(receiptPending ? { receiptPending: true } : {}) };
}
function clearBlocksForNewPayment(env, order, features) {
  // Only a real pending -> paid transition may restore access. Repeated payment
  // callbacks must never undo a later administrator revocation.
  return statement(env, `DELETE FROM image_download_blocks WHERE user_id=? AND image_id IN (SELECT image_id FROM order_images WHERE order_id=?) AND EXISTS(SELECT 1 FROM orders WHERE id=? AND status='pending' AND ${features.orderDeletion ? 'deleted_at IS NULL' : '1=1'})`, order.user_id, order.id, order.id);
}
function queueGrantNotification(env, features, { galleryId, userId, orderId = null, imageIds = null, receiptTransition = false, finalTransition = false }) {
  const notificationId = orderId ? `order-${orderId}` : id();
  const params = [notificationId, userId, galleryId, orderId, Date.now()];
  params.push(galleryId, userId, userId, userId);
  if (finalTransition) params.push(orderId);
  let blockCondition = '';
  if (features.imageControls) {
    blockCondition = orderId ? ' AND NOT EXISTS(SELECT 1 FROM image_download_blocks b WHERE b.image_id=i.id AND b.user_id=?)' : ' OR EXISTS(SELECT 1 FROM image_download_blocks b WHERE b.image_id=i.id AND b.user_id=?)';
    params.push(userId);
  }
  let selection = '';
  if (orderId) { selection += ' AND EXISTS(SELECT 1 FROM order_images oi WHERE oi.image_id=i.id AND oi.order_id=?)'; params.push(orderId); }
  if (imageIds) { selection += ' AND i.id IN (SELECT value FROM json_each(?))'; params.push(JSON.stringify(imageIds)); }
  if (orderId) { selection += ` AND EXISTS(SELECT 1 FROM orders o WHERE o.id=? AND ${features.orderDeletion ? 'o.deleted_at IS NULL' : '1=1'} AND ${finalOrderCondition(features)} AND ${finalTransition ? "o.status='paid' AND o.receipt_sent_at IS NOT NULL" : receiptTransition ? "o.status='paid' AND o.receipt_sent_at IS NULL" : "o.status='pending' AND o.receipt_sent_at IS NOT NULL"})`; params.push(orderId); }
  // This statement precedes the grant in the same D1 batch, so only newly granted
  // files enter the durable outbox even when two releases arrive simultaneously.
  return statement(env, `INSERT OR IGNORE INTO download_notifications(id,user_id,gallery_id,order_id,created_at,image_ids_json) SELECT ?,?,?,?,?,grants.image_ids_json FROM (SELECT json_group_array(i.id) AS image_ids_json,COUNT(*) AS count FROM images i WHERE i.gallery_id=? AND ${finalImageCondition(features)} AND EXISTS(SELECT 1 FROM gallery_members m JOIN users u ON u.id=m.user_id WHERE m.gallery_id=i.gallery_id AND m.user_id=? AND u.disabled=0 AND u.role='customer') AND ((${finalTransition ? '1=1 OR ' : ''}NOT EXISTS(SELECT 1 FROM manual_releases r WHERE r.image_id=i.id AND r.user_id=?) AND NOT EXISTS(SELECT 1 FROM order_images oi JOIN orders o ON o.id=oi.order_id WHERE oi.image_id=i.id AND o.user_id=? AND o.status='paid' AND o.receipt_sent_at IS NOT NULL AND ${features.orderDeletion ? 'o.deleted_at IS NULL' : '1=1'} AND ${finalOrderCondition(features)}${finalTransition ? ' AND o.id<>?' : ''}))${blockCondition})${selection}) grants WHERE grants.count>0`, ...params);
}
function base64Bytes(bytes) {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  return btoa(binary);
}
async function cleanupInvoiceObject(env, key) {
  const features = await optionalSchema(env);
  if (!key || !features.invoices) return;
  const used = await first(env, 'SELECT 1 AS used FROM gallery_invoices WHERE r2_key=?', key);
  if (!used) await env.PHOTOS.delete(key);
}
async function deliverNotifications(env, filter = {}, force = false) {
  if (!(await optionalSchema(env)).notifications) return notificationStatus(env, filter);
  const [condition, value] = notificationFilter(filter); const now = Date.now();
  const rows = await all(env, `SELECT id FROM download_notifications WHERE ${condition} AND sent_at IS NULL AND cancelled_at IS NULL AND (lease_at IS NULL OR lease_at<?) ${force ? '' : 'AND next_attempt_at<=?'} ORDER BY created_at LIMIT 3`, ...(value === null ? [] : [value]), now - 5 * 60_000, ...(force ? [] : [now]));
  for (const pending of rows) {
    const claim = await first(env, 'UPDATE download_notifications SET lease_at=?,attempts=attempts+1 WHERE id=? AND sent_at IS NULL AND cancelled_at IS NULL AND (lease_at IS NULL OR lease_at<?) RETURNING *', Date.now(), pending.id, Date.now() - 5 * 60_000);
    if (!claim) continue;
    try {
      const recipient = await first(env, "SELECT u.name,u.email,g.name AS gallery_name FROM users u JOIN gallery_members m ON m.user_id=u.id JOIN galleries g ON g.id=m.gallery_id WHERE u.id=? AND g.id=? AND u.disabled=0 AND u.role='customer' AND g.published=1 AND (g.expires_at IS NULL OR g.expires_at>?)", claim.user_id, claim.gallery_id, Date.now());
      if (!recipient) {
        await run(env, 'UPDATE download_notifications SET lease_at=NULL,next_attempt_at=?,error_code=? WHERE id=?', Date.now() + 60 * 60_000, 'notification_deferred', claim.id);
        continue;
      }
      const controls = (await optionalSchema(env)).imageControls;
      const blockGuard = controls ? ' AND NOT EXISTS(SELECT 1 FROM image_download_blocks b WHERE b.user_id=? AND b.image_id=i.id)' : '';
      const granted = await all(env, `SELECT i.id,i.title FROM images i JOIN json_each(?) selected ON selected.value=i.id WHERE i.gallery_id=? AND (EXISTS(SELECT 1 FROM manual_releases r WHERE r.image_id=i.id AND r.user_id=? AND ${await finalizedImage(env)}) OR EXISTS(SELECT 1 FROM order_images oi JOIN orders o ON o.id=oi.order_id WHERE oi.image_id=i.id AND o.user_id=? AND o.status='paid' AND o.receipt_sent_at IS NOT NULL AND ${await liveOrder(env, 'o')} AND ${await finalizedOrder(env)}))` + blockGuard + ' ORDER BY i.position,i.id', claim.image_ids_json, claim.gallery_id, claim.user_id, claim.user_id, ...(controls ? [claim.user_id] : []));
      if (!granted.length) {
        await run(env, 'UPDATE download_notifications SET cancelled_at=?,lease_at=NULL,error_code=NULL WHERE id=?', Date.now(), claim.id);
        continue;
      }
      let message = claim.email_json ? JSON.parse(claim.email_json) : null;
      if (!message) {
        const candidate = { to: recipient.email, ...(env.EMAIL_FROM ? { from: env.EMAIL_FROM } : {}), ...await renderConfiguredEmail(env, { kind: 'download', customerName: recipient.name, galleryName: recipient.gallery_name, galleryUrl: successUrl(env, `?gallery=${claim.gallery_id}`), imageCount: granted.length, imageTitles: granted.map(image => image.title), orderId: claim.order_id, businessName: businessContact(env).name }) };
        const stored = await first(env, 'UPDATE download_notifications SET email_json=COALESCE(email_json,?) WHERE id=? RETURNING email_json', JSON.stringify(candidate), claim.id);
        message = JSON.parse(stored.email_json);
      }
      if (claim.order_id && !await first(env, `SELECT 1 AS ready FROM orders o WHERE o.id=? AND ${await liveOrder(env, 'o')} AND ${await finalizedOrder(env)}`, claim.order_id)) continue;
      if (!await first(env, 'SELECT 1 AS active FROM download_notifications WHERE id=? AND cancelled_at IS NULL AND sent_at IS NULL', claim.id)) continue;
      await mail(env, { ...message, idempotencyKey: `download-ready/${claim.id}` });
      await run(env, 'UPDATE download_notifications SET sent_at=?,lease_at=NULL,error_code=NULL WHERE id=?', Date.now(), claim.id);
    } catch (error) {
      const code = error instanceof ApiError ? error.code : 'email_delivery_failed';
      await run(env, 'UPDATE download_notifications SET lease_at=NULL,next_attempt_at=?,error_code=? WHERE id=?', Date.now() + Math.min(DAY, 60_000 * 2 ** Math.min(claim.attempts, 10)), code, claim.id);
    }
  }
  return notificationStatus(env, filter);
}
async function completePaidNotifications(env, orderId, force = false) {
  let receiptPending = false;
  try { await ensureReceipt(env, orderId); }
  catch (error) { receiptPending = true; }
  const features = await optionalSchema(env);
  if (!receiptPending && features.finalDelivery && features.notifications) {
    // Pages deployments need a manual recovery path as well as cron. A final
    // metadata write may have committed even when its response was lost.
    const order = await first(env, `SELECT o.* FROM orders o JOIN galleries g ON g.id=o.gallery_id WHERE o.id=? AND g.require_final_delivery=1 AND ${features.galleryDeletion ? 'g.deleted_at IS NULL' : '1=1'} AND o.status='paid' AND o.receipt_sent_at IS NOT NULL AND ${await liveOrder(env, 'o')} AND ${finalOrderCondition(features)}`, orderId);
    if (order) await env.DB.batch([queueGrantNotification(env, features, { galleryId: order.gallery_id, userId: order.user_id, orderId: order.id, finalTransition: true })]);
  }
  const notification = await deliverNotifications(env, { orderId }, force);
  return receiptPending ? { ...notification, status: 'pending', receiptPending: true, code: 'email_delivery_failed' } : notification;
}
async function stripeCheckout(env, order, user, gallery) {
  const params = new URLSearchParams({ mode: 'payment', client_reference_id: order.id, customer_email: user.email, success_url: successUrl(env, `?gallery=${gallery.id}&payment=success`), cancel_url: successUrl(env, `?gallery=${gallery.id}&payment=cancelled`), 'metadata[order_id]': order.id, 'payment_intent_data[metadata][order_id]': order.id, 'line_items[0][price_data][currency]': 'eur', 'line_items[0][price_data][unit_amount]': String(order.amount_cents), 'line_items[0][price_data][product_data][name]': `${order.package_name} · ${gallery.name}`.slice(0, 180), 'line_items[0][quantity]': '1' });
  const result = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': `liza-order-${order.id}` }, body: params });
  if (!result.ok) fail(502, 'Die Kartenzahlung ist gerade nicht erreichbar. Es wurde kein Download freigegeben.', 'payment_provider_error');
  const data = await result.json();
  if (!data.id || !/^https:\/\/checkout\.stripe\.com\//.test(data.url || '')) fail(502, 'Die Zahlungsseite konnte nicht erstellt werden.');
  await run(env, `UPDATE orders SET provider_reference=?,checkout_url=? WHERE id=? AND status=? AND ${await liveOrder(env)}`, data.id, data.url, order.id, 'pending');
  return data.url;
}
const paypalBase = env => env.PAYPAL_ENVIRONMENT === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
async function paypalToken(env) {
  const result = await fetch(`${paypalBase(env)}/v1/oauth2/token`, { method: 'POST', headers: { Authorization: `Basic ${btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials' });
  if (!result.ok) fail(502, 'PayPal ist gerade nicht erreichbar.', 'payment_provider_error');
  const data = await result.json(); if (!data.access_token) fail(502, 'PayPal ist gerade nicht erreichbar.'); return data.access_token;
}
async function paypalCheckout(env, order, gallery) {
  const token = await paypalToken(env);
  const result = await fetch(`${paypalBase(env)}/v2/checkout/orders`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'PayPal-Request-Id': `liza-${order.id}` }, body: JSON.stringify({ intent: 'CAPTURE', purchase_units: [{ reference_id: order.id, custom_id: order.id, amount: { currency_code: 'EUR', value: (order.amount_cents / 100).toFixed(2) }, description: `${order.package_name} · ${gallery.name}`.slice(0, 120) }], payment_source: { paypal: { experience_context: { brand_name: 'LiZa Memories Photography', user_action: 'PAY_NOW', return_url: successUrl(env, `?gallery=${gallery.id}&paypalOrder=${order.id}`), cancel_url: successUrl(env, `?gallery=${gallery.id}&payment=cancelled`) } } } }) });
  if (!result.ok) fail(502, 'Die PayPal-Zahlung konnte nicht gestartet werden.', 'payment_provider_error');
  const data = await result.json();
  const link = data.links?.find(x => ['approve', 'payer-action'].includes(x.rel))?.href;
  if (!data.id || !/^https:\/\/(?:www\.)?(?:sandbox\.)?paypal\.com\//.test(link || '')) fail(502, 'Die PayPal-Zahlungsseite konnte nicht erstellt werden.');
  await run(env, `UPDATE orders SET provider_reference=?,checkout_url=? WHERE id=? AND status=? AND ${await liveOrder(env)}`, data.id, link, order.id, 'pending');
  return link;
}
function combinePackages(base, offers, count) {
  const remainder = count - base.image_count;
  const best = Array(remainder + 1).fill(null);
  best[0] = { amount: 0, units: 0 };
  // Exact unbounded knapsack, not greedy division: 13 photos may be cheapest as
  // one 5-photo and two 4-photo packages even when a 1-photo offer is available.
  // Offers arrive in the same stable order used by the browser price preview.
  for (let selected = 1; selected <= remainder; selected++) {
    for (const offer of offers) {
      if (offer.image_count > selected) continue;
      const previous = best[selected - offer.image_count];
      if (!previous) continue;
      const amount = previous.amount + offer.price_cents;
      const units = previous.units + 1;
      if (!best[selected] || amount < best[selected].amount || (amount === best[selected].amount && units < best[selected].units)) best[selected] = { amount, units, offer };
    }
  }
  if (!best[remainder]) return null;
  const components = new Map([[base.id, { pack: base, quantity: 1 }]]);
  for (let left = remainder; left > 0;) {
    const offer = best[left].offer;
    const component = components.get(offer.id);
    if (component) component.quantity++;
    else components.set(offer.id, { pack: offer, quantity: 1 });
    left -= offer.image_count;
  }
  return { amountCents: base.price_cents + best[remainder].amount, components: [...components.values()].sort((a, b) => b.pack.image_count - a.pack.image_count || a.pack.price_cents - b.pack.price_cents || (a.pack.id < b.pack.id ? -1 : a.pack.id > b.pack.id ? 1 : 0)) };
}
async function createOrder(request, env, user) {
  const data = await body(request);
  if (data.termsAccepted !== true || data.digitalConsent !== true) fail(400, 'Bitte bestätige die Bestellbedingungen und die sofortige digitale Bereitstellung.', 'order_consent_required');
  const gallery = await galleryAccess(env, textField(data.galleryId, 80), user);
  const required = await requiredPackageState(env, gallery.id, user.id);
  const pack = await first(env, "SELECT * FROM packages WHERE id=? AND gallery_id=? AND active=1 AND currency='EUR'", textField(data.packageId, 80), gallery.id);
  if (!pack) fail(400, 'Dieses Paket ist nicht verfügbar.', 'package_not_found');
  if (required.pack && !required.paid && pack.id !== required.pack.id) fail(400, 'Bitte wähle zuerst dein verbindlich gebuchtes Paket. Zusätzliche Bilder werden automatisch dazugerechnet.', 'required_package_missing');
  if (required.paid && pack.is_required) fail(409, 'Dein gebuchtes Paket ist bereits bezahlt. Bitte wähle für weitere Bilder ein Zusatzpaket.', 'required_package_paid');
  if (gallery.pricing_mode !== 'images' && pack.image_count !== 0 && !required.pack) fail(400, 'Für diese Galerie wird der vereinbarte Gesamtbetrag verwendet.', 'invalid_pricing_mode');
  let selected;
  if (data.all === true) {
    if (pack.image_count !== 0) fail(400, 'Die gesamte Galerie kann nur mit einem Gesamtpaket bestellt werden.', 'invalid_selection');
    const rows = await all(env, 'SELECT id FROM images WHERE gallery_id=? ORDER BY id LIMIT 5001', gallery.id);
    if (rows.length > 5000) fail(413, 'Bitte frage für diese sehr große Galerie direkt bei Emina an.', 'gallery_size_limit');
    selected = rows.map(x => x.id);
  } else {
    selected = ids(data.imageIds);
    await selectedImages(env, gallery.id, selected);
  }
  if (!selected.length) fail(400, 'Bitte wähle mindestens ein Bild aus.');
  const available = await first(env, 'SELECT COUNT(*) AS count FROM images WHERE gallery_id=?', gallery.id);
  if (pack.image_count === 0 ? selected.length !== available.count : selected.length < pack.image_count) fail(400, `Bitte wähle ${pack.image_count ? 'mindestens ' : 'alle '}${pack.image_count || available.count} Bilder für dieses Paket aus.`, 'package_image_count');
  const offers = pack.image_count ? (await all(env, "SELECT * FROM packages WHERE gallery_id=? AND active=1 AND image_count>0 AND image_count<=? AND currency='EUR' ORDER BY image_count DESC,price_cents,id", gallery.id, selected.length)).filter(offer => !offer.is_required) : [];
  const pricing = pack.image_count ? combinePackages(pack, offers, selected.length) : { amountCents: pack.price_cents, components: [{ pack, quantity: 1 }] };
  if (!pricing) fail(400, 'Für diese Auswahl fehlt noch eine passende Paketkombination. Bitte passe die Bildanzahl an oder wähle ein anderes Paket.', 'package_selection_unavailable');
  const { amountCents, components } = pricing;
  const quantity = components.find(component => component.pack.id === pack.id).quantity;
  if (!Number.isSafeInteger(amountCents) || amountCents > 1_000_000) fail(400, 'Bitte frage für diese große Bestellung direkt bei Emina an.', 'order_amount_limit');
  if (Object.hasOwn(data, 'expectedAmountCents') && (!Number.isSafeInteger(data.expectedAmountCents) || data.expectedAmountCents !== amountCents)) fail(409, 'Der Preis hat sich geändert. Bitte lade die Pakete neu und prüfe den aktuellen Gesamtbetrag.', 'price_changed');
  const componentName = (item, count) => {
    const euro = cents => `${(cents / 100).toFixed(2).replace('.', ',')} €`;
    return count > 1 ? `${count} × ${item.name} (je ${euro(item.price_cents)} = ${euro(item.price_cents * count)})` : `${item.name} (${euro(item.price_cents)})`;
  };
  // This immutable description is already carried by order, receipt and email;
  // it keeps all component prices even after administrators edit their offers.
  const packageName = components.length > 1 ? components.map(component => componentName(component.pack, component.quantity)).join(' + ') : quantity > 1 ? `${quantity} × ${pack.name}` : pack.name;
  const pricingSnapshot = JSON.stringify({ requiredPackageId: required.pack && !required.paid ? required.pack.id : null, components: components.map(({ pack: item, quantity: count }) => ({ packageId: item.id, name: item.name, imageCount: item.image_count, unitPriceCents: item.price_cents, quantity: count, required: Boolean(item.is_required) })) });
  const method = data.paymentMethod;
  if (!['transfer', 'stripe', 'paypal'].includes(method)) fail(400, 'Bitte wähle eine Zahlungsart.');
  const caps = capabilities(env);
  if (!(method === 'transfer' ? caps.transferConfigured : caps[method])) fail(503, 'Diese Zahlungsart ist noch nicht eingerichtet.', 'payment_not_configured');
  if (!caps.email) fail(503, 'Bestellungen sind erst möglich, wenn der E-Mail-Versand für die Vertragsbestätigung eingerichtet ist.', 'email_not_configured');
  await rate(env, `order:${user.id}`, 20, DAY);
  // A repeated click/retry for the identical unpaid selection reuses the order.
  let order;
  const existing = await all(env, `SELECT * FROM orders WHERE user_id=? AND gallery_id=? AND package_id=? AND payment_method=? AND status='pending' AND amount_cents=? AND ${await liveOrder(env)} ORDER BY created_at DESC LIMIT 20`, user.id, gallery.id, pack.id, method, amountCents);
  for (const candidate of existing) {
    // A pre-existing optional order cannot satisfy a newly mandatory booking.
    if (candidate.pricing_json ? candidate.pricing_json !== pricingSnapshot : required.pack && !required.paid) continue;
    const oldImages = (await all(env, 'SELECT image_id FROM order_images WHERE order_id=? ORDER BY image_id', candidate.id)).map(x => x.image_id);
    if (JSON.stringify(oldImages) === JSON.stringify([...selected].sort())) { order = candidate; break; }
  }
  if (!order) {
    if (required.pack && !required.paid && required.outstanding) requiredBookingConflict(required.outstanding);
    const features = await optionalSchema(env);
    const pendingKey = await sha256(JSON.stringify([user.id, gallery.id, pack.id, method, amountCents, [...selected].sort(), ...(features.requiredPackages ? [pricingSnapshot] : [])]));
    const studio = features.studio;
    for (let attempt = 0; attempt < 3 && !order; attempt++) {
      const candidate = { id: id(), created_at: Date.now() };
      const reference = `LZ-${hex(crypto.getRandomValues(new Uint8Array(6))).toUpperCase()}`;
      await env.DB.batch([
        // Both the pending selection and the readable reference are database-unique.
        // A rare reference collision retries, and concurrent repeat clicks reuse one order.
        statement(env, `INSERT OR IGNORE INTO orders(id,user_id,gallery_id,package_id,package_name,package_quantity,amount_cents,currency,status,payment_method,terms_version,consent_at,created_at,pending_key${studio ? ',payment_reference' : ''}${features.requiredPackages ? ',pricing_json' : ''}) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?${studio ? ',?' : ''}${features.requiredPackages ? ',?' : ''}${features.galleryDeletion ? ' WHERE EXISTS(SELECT 1 FROM galleries WHERE id=? AND deleted_at IS NULL)' : ''}`, candidate.id, user.id, gallery.id, pack.id, packageName, quantity, amountCents, 'EUR', 'pending', method, TERMS_VERSION, candidate.created_at, candidate.created_at, pendingKey, ...(studio ? [reference] : []), ...(features.requiredPackages ? [pricingSnapshot] : []), ...(features.galleryDeletion ? [gallery.id] : [])),
        statement(env, 'INSERT OR IGNORE INTO order_images(order_id,image_id) SELECT ?,selected.value FROM json_each(?) selected WHERE EXISTS(SELECT 1 FROM orders WHERE id=?)', candidate.id, JSON.stringify(selected), candidate.id),
        statement(env, 'INSERT INTO audit_events(id,user_id,action,target_id,created_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM orders WHERE id=?)', id(), user.id, 'order_created', candidate.id, candidate.created_at, candidate.id),
      ]);
      order = await first(env, `SELECT * FROM orders WHERE pending_key=? AND status='pending' AND ${await liveOrder(env)}`, pendingKey);
    }
    if (!order && required.pack && !required.paid) {
      const current = await requiredPackageState(env, gallery.id, user.id);
      if (current.outstanding) requiredBookingConflict(current.outstanding);
    }
    if (!order) fail(409, 'Die Bestellung wurde gerade geändert. Bitte lade die Seite neu.', 'order_changed');
  }
  await galleryAccess(env, gallery.id, user);
  await ensureReceipt(env, order.id);
  let paymentUrl = order.checkout_url || null;
  if (!paymentUrl && ['stripe', 'paypal'].includes(method)) await galleryAccess(env, gallery.id, user);
  if (!paymentUrl && method === 'stripe') paymentUrl = await stripeCheckout(env, order, user, gallery);
  if (!paymentUrl && method === 'paypal') paymentUrl = await paypalCheckout(env, order, gallery);
  return json({ order: await orderJson(env, await getOrder(env, order.id)), paymentUrl, ...(method === 'transfer' ? { transfer: caps.transfer, reference: orderReference(order) } : {}) }, 201);
}
export async function verifyStripeSignature(raw, signature, secret, now = Date.now()) {
  if (typeof signature !== 'string' || !secret) return false;
  const fields = signature.split(',').map(x => x.split('='));
  const timestamp = fields.find(([key]) => key === 't')?.[1];
  if (!/^\d+$/.test(timestamp || '') || Math.abs(now / 1000 - Number(timestamp)) > 300) return false;
  const expected = await hmac(secret, `${timestamp}.${raw}`);
  return fields.filter(([key]) => key === 'v1').some(([,value]) => safeEqual(value, expected));
}
async function stripeWebhook(request, env) {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) fail(503, 'Zahlungen sind noch nicht eingerichtet.');
  const raw = await readLimited(request, 1_000_000);
  if (!await verifyStripeSignature(raw, request.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET)) fail(400, 'Ungültige Zahlungsbestätigung.', 'invalid_webhook');
  let event; try { event = JSON.parse(raw); } catch { fail(400, 'Ungültige Zahlungsbestätigung.'); }
  if (!['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.expired', 'checkout.session.async_payment_failed'].includes(event.type)) return json({ received: true });
  const payment = event.data?.object;
  const order = payment?.metadata?.order_id ? await getOrder(env, payment.metadata.order_id, true) : null;
  if (order?.deleted_at) return json({ received: true });
  if (!order || order.payment_method !== 'stripe' || order.provider_reference !== payment.id) fail(400, 'Die Bestellung konnte nicht zugeordnet werden.', 'invalid_webhook_order');
  const already = await first(env, 'SELECT id FROM payment_events WHERE id=?', `stripe:${event.id}`);
  if (already) return json({ received: true, notification: order.status === 'paid' ? await completePaidNotifications(env, order.id) : undefined });
  if (event.type.includes('expired') || event.type.includes('failed')) {
    await env.DB.batch([
      statement(env, `UPDATE orders SET status='cancelled' WHERE id=? AND status='pending' AND ${await liveOrder(env)}`, order.id),
      statement(env, 'INSERT OR IGNORE INTO payment_events(id,provider,order_id,created_at) VALUES(?,?,?,?)', `stripe:${event.id}`, 'stripe', order.id, Date.now()),
    ]);
    return json({ received: true });
  }
  if (payment.payment_status !== 'paid') return json({ received: true });
  if (payment.amount_total !== order.amount_cents || payment.currency !== 'eur' || payment.client_reference_id !== order.id) fail(400, 'Der Zahlungsbetrag stimmt nicht überein.', 'payment_amount_mismatch');
  const features = await optionalSchema(env);
  await env.DB.batch([
    ...(features.imageControls ? [clearBlocksForNewPayment(env, order, features)] : []),
    ...(features.notifications ? [queueGrantNotification(env, features, { galleryId: order.gallery_id, userId: order.user_id, orderId: order.id })] : []),
    statement(env, `UPDATE orders SET status='paid',paid_at=COALESCE(paid_at,?) WHERE id=? AND status='pending' AND ${await liveOrder(env)}`, Date.now(), order.id),
    statement(env, 'INSERT OR IGNORE INTO payment_events(id,provider,order_id,created_at) VALUES(?,?,?,?)', `stripe:${event.id}`, 'stripe', order.id, Date.now()),
    statement(env, 'INSERT INTO audit_events(id,user_id,action,target_id,created_at) VALUES(?,?,?,?,?)', id(), null, 'stripe_payment_confirmed', order.id, Date.now()),
  ]);
  return json({ received: true, notification: await completePaidNotifications(env, order.id) });
}
async function capturePayPal(request, env, user, orderId) {
  if (!capabilities(env).paypal) fail(503, 'PayPal ist noch nicht eingerichtet.');
  const order = await getOrder(env, orderId);
  if (!order || order.user_id !== user.id || order.payment_method !== 'paypal') fail(404, 'Die Bestellung wurde nicht gefunden.');
  await galleryAccess(env, order.gallery_id, user);
  if (order.status === 'paid') return json({ order: await orderJson(env, order), notification: await completePaidNotifications(env, order.id) });
  if (order.status !== 'pending' || !order.provider_reference) fail(409, 'Diese Bestellung kann nicht bezahlt werden.');
  const token = await paypalToken(env);
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'PayPal-Request-Id': `capture-${order.id}` };
  let result = await fetch(`${paypalBase(env)}/v2/checkout/orders/${encodeURIComponent(order.provider_reference)}/capture`, { method: 'POST', headers, body: '{}' });
  if (!result.ok) result = await fetch(`${paypalBase(env)}/v2/checkout/orders/${encodeURIComponent(order.provider_reference)}`, { headers });
  if (!result.ok) fail(502, 'Die PayPal-Zahlung konnte nicht bestätigt werden.');
  const payment = await result.json();
  const units = payment.purchase_units;
  const capture = units?.length === 1 && units[0].payments?.captures?.length === 1 ? units[0].payments.captures[0] : null;
  if (payment.id !== order.provider_reference || payment.status !== 'COMPLETED' || units?.[0]?.custom_id !== order.id || capture?.status !== 'COMPLETED' || capture.amount?.currency_code !== 'EUR' || capture.amount?.value !== (order.amount_cents / 100).toFixed(2)) fail(409, 'Die Zahlung ist noch nicht vollständig bestätigt.', 'payment_not_confirmed');
  const features = await optionalSchema(env);
  await env.DB.batch([
    ...(features.imageControls ? [clearBlocksForNewPayment(env, order, features)] : []),
    ...(features.notifications ? [queueGrantNotification(env, features, { galleryId: order.gallery_id, userId: order.user_id, orderId: order.id })] : []),
    statement(env, `UPDATE orders SET status='paid',paid_at=COALESCE(paid_at,?) WHERE id=? AND status='pending' AND ${await liveOrder(env)}`, Date.now(), order.id),
    statement(env, 'INSERT OR IGNORE INTO payment_events(id,provider,order_id,created_at) VALUES(?,?,?,?)', `paypal:${capture.id}`, 'paypal', order.id, Date.now()),
    statement(env, 'INSERT INTO audit_events(id,user_id,action,target_id,created_at) VALUES(?,?,?,?,?)', id(), user.id, 'paypal_payment_confirmed', order.id, Date.now()),
  ]);
  return json({ order: await orderJson(env, await getOrder(env, order.id)), notification: await completePaidNotifications(env, order.id) });
}

function shootingDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(`${value}T00:00:00Z`)) || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) fail(400, 'Bitte gib ein gültiges Shootingdatum ein.');
  return value;
}
function enumField(value, allowed, fallback) {
  const selected = value === undefined ? fallback : value;
  if (!allowed.includes(selected)) fail(400, 'Bitte prüfe die Galerie-Einstellungen.', 'invalid_gallery_settings');
  return selected;
}
const SHOOTING_TYPES = ['school', 'maternity', 'newborn', 'family', 'portrait', 'wedding', 'combo', 'other'];
const GALLERY_DESIGN = {
  theme: ['warm', 'light', 'dark', 'cream', 'rose', 'blush', 'sand', 'clay', 'sage', 'olive', 'forest', 'sea', 'sky', 'lavender', 'slate'],
  coverLayout: ['overlay', 'split', 'editorial', 'split-reverse', 'card', 'arch', 'polaroid', 'minimal'],
  coverDecoration: ['none', 'frame', 'stripe', 'double-frame', 'corners', 'underline', 'soft-shadow', 'rounded'],
  coverHeightMobile: ['compact', 'standard', 'large'],
  coverFit: ['contain', 'cover'],
  coverFitMobile: ['contain', 'cover'],
};
const LEGACY_THEMES = ['warm', 'light', 'dark'];
const LEGACY_COVER_LAYOUTS = ['overlay', 'split', 'editorial'];
const LEGACY_COVER_DECORATIONS = ['none', 'frame', 'stripe'];
function effectiveGalleryDesign(gallery = {}) {
  let saved = {};
  try { const value = JSON.parse(gallery.appearance_json || '{}'); if (value && typeof value === 'object' && !Array.isArray(value)) saved = value; } catch { /* Keep readable legacy galleries if stored data is malformed. */ }
  const fallback = { theme: gallery.theme || 'warm', coverLayout: gallery.cover_layout || 'overlay', coverDecoration: gallery.cover_decoration || 'none', coverHeightMobile: 'standard', coverFit: 'contain', coverFitMobile: 'cover' };
  return Object.fromEntries(Object.entries(GALLERY_DESIGN).map(([key, allowed]) => [key, allowed.includes(saved[key]) ? saved[key] : fallback[key]]));
}
function galleryDesign(data, gallery = {}) {
  const current = effectiveGalleryDesign(gallery);
  return Object.fromEntries(Object.entries(GALLERY_DESIGN).map(([key, allowed]) => [key, enumField(data[key], allowed, current[key])]));
}
const legacyTheme = value => LEGACY_THEMES.includes(value) ? value : ['forest', 'slate'].includes(value) ? 'dark' : 'warm';
const legacyCoverLayout = value => LEGACY_COVER_LAYOUTS.includes(value) ? value : value === 'split-reverse' ? 'split' : 'editorial';
const legacyCoverDecoration = value => LEGACY_COVER_DECORATIONS.includes(value) ? value : value === 'double-frame' || value === 'corners' ? 'frame' : 'none';
function coverPosition(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) fail(400, 'Die Cover-Position muss zwischen 0 und 100 liegen.', 'invalid_gallery_settings');
  return value;
}
function galleryAppearance(data, gallery = {}, design = galleryDesign(data, gallery)) {
  const coverLayout = legacyCoverLayout(design.coverLayout);
  const coverHeight = enumField(data.coverHeight, ['compact', 'standard', 'large'], gallery.cover_height || 'standard');
  const gridDensity = enumField(data.gridDensity, ['comfortable', 'compact', 'spacious'], gallery.grid_density || 'comfortable');
  const gridGap = data.gridGap === undefined ? gallery.grid_gap ?? 16 : data.gridGap;
  const showFilenames = data.showFilenames === undefined ? Boolean(gallery.show_filenames ?? 0) : data.showFilenames;
  if (!Number.isInteger(gridGap) || gridGap < 8 || gridGap > 40 || typeof showFilenames !== 'boolean') fail(400, 'Bitte prüfe Bildabstand und Dateinamen-Anzeige.', 'invalid_gallery_settings');
  return [coverLayout, coverHeight, gridDensity, gridGap, showFilenames ? 1 : 0];
}
async function appearanceStatement(env, data, galleryId, gallery = {}) {
  const design = galleryDesign(data, gallery);
  const values = galleryAppearance(data, gallery, design);
  const columns = new Set((await all(env, 'PRAGMA table_info(galleries)')).map(column => column.name));
  const extended = columns.has('appearance_json');
  if (!extended && (!LEGACY_THEMES.includes(design.theme) || !LEGACY_COVER_LAYOUTS.includes(design.coverLayout) || !LEGACY_COVER_DECORATIONS.includes(design.coverDecoration) || ['coverHeightMobile', 'coverFit', 'coverFitMobile'].some(key => data[key] !== undefined))) fail(503, 'Die erweiterten Galerie-Designs benötigen zuerst die neue Datenbank-Erweiterung für die Galeriegestaltung.', 'migration_required');
  const ready = ['cover_layout', 'cover_height', 'grid_density', 'grid_gap', 'show_filenames'].every(column => columns.has(column));
  if (!ready && ['coverLayout', 'coverHeight', 'gridDensity', 'gridGap', 'showFilenames'].some(key => data[key] !== undefined)) fail(503, 'Die neuen Galerie-Einstellungen benötigen zuerst die Datenbank-Erweiterung.', 'migration_required');
  const studio = columns.has('watermark_mode') && columns.has('typography') && columns.has('cover_decoration');
  if (!studio && (data.watermarkMode !== undefined || data.typography !== undefined || data.coverDecoration !== undefined)) fail(503, 'Die Studio-Einstellungen benötigen zuerst die Datenbank-Erweiterung.', 'migration_required');
  const mode = enumField(data.watermarkMode, ['inherit', 'on', 'off'], gallery.watermark_mode || 'inherit');
  const typography = enumField(data.typography, ['serif', 'sans', 'editorial'], gallery.typography || 'serif');
  const decoration = legacyCoverDecoration(design.coverDecoration);
  const sets = []; const bindings = [];
  if (ready) { sets.push('cover_layout=?,cover_height=?,grid_density=?,grid_gap=?,show_filenames=?'); bindings.push(...values); }
  if (studio) { sets.push('watermark_mode=?,typography=?,cover_decoration=?'); bindings.push(mode, typography, decoration); }
  if (data.requireFinalDelivery !== undefined) {
    if (typeof data.requireFinalDelivery !== 'boolean') fail(400, 'Bitte prüfe die Einstellung für fertige Bilder.');
    if (!(await optionalSchema(env)).finalDelivery) fail(503, 'Bitte führe zuerst die Datenbank-Erweiterung aus.', 'migration_required');
    sets.push('require_final_delivery=?'); bindings.push(Number(data.requireFinalDelivery));
  }
  if (extended) { sets.push('appearance_json=?'); bindings.push(JSON.stringify(design)); }
  return sets.length ? statement(env, `UPDATE galleries SET ${sets.join(',')} WHERE id=?`, ...bindings, galleryId) : null;
}
function expiry(value) {
  if (value === null || value === '') return null;
  const number = Date.parse(value);
  if (!Number.isFinite(number)) fail(400, 'Bitte prüfe das Ablaufdatum.'); return number;
}
async function sniffImage(file) {
  const data = new Uint8Array(await file.slice(0, 24).arrayBuffer());
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'image/jpeg';
  if (hex(data.slice(0, 8)) === '89504e470d0a1a0a') return 'image/png';
  if (new TextDecoder().decode(data.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(data.slice(8, 12)) === 'WEBP') return 'image/webp';
  fail(415, 'Bitte lade JPEG-, PNG- oder WebP-Fotos hoch. SVG und andere ausführbare Dateien sind nicht erlaubt.', 'invalid_image_type');
}
async function uploadImage(request, env, user, gallery) {
  const length = Number(request.headers.get('content-length') || 0);
  if (!length && !local(env)) fail(411, 'Die Dateigröße fehlt.');
  if (length > 39 * 1024 * 1024) fail(413, 'Bitte lade Fotos unter 30 MB pro Original hoch.');
  if (!(request.headers.get('content-type') || '').startsWith('multipart/form-data')) fail(415, 'Bitte lade die Bilder als Dateien hoch.');
  const form = await request.formData(); const preview = form.get('preview'); const original = form.get('original');
  const finalReady = form.get('finalReady');
  if (finalReady !== null && !['true', 'false'].includes(finalReady)) fail(400, 'Bitte prüfe die Kennzeichnung als fertig bearbeitetes Bild.', 'invalid_final_ready');
  const uploadFeatures = await optionalSchema(env);
  if (finalReady === 'true' && !uploadFeatures.finalDelivery) fail(503, 'Bitte führe zuerst die Datenbank-Erweiterung für fertige Bilder aus.', 'migration_required');
  if (!preview || !original || typeof preview.stream !== 'function' || typeof original.stream !== 'function') fail(400, 'Vorschau und Originaldatei werden benötigt.');
  if (preview.size <= 0 || original.size <= 0 || preview.size > 4 * 1024 * 1024 || original.size > 30 * 1024 * 1024) fail(413, 'Vorschau maximal 4 MB, Original maximal 30 MB.');
  const [previewType, originalType] = await Promise.all([sniffImage(preview), sniffImage(original)]);
  const protection = await validateProtectedPreview(env, gallery, form);
  const width = Number(form.get('width')); const height = Number(form.get('height'));
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 30000 || height > 30000) fail(400, 'Die Bildabmessungen fehlen.');
  const title = textField(form.get('title') || original.name || 'LiZa Memories', 150);
  const imageId = id(); const base = `galleries/${gallery.id}/${imageId}`;
  const previewKey = `${base}/preview`; const originalKey = `${base}/original`;
  const protectedKey = protection.file ? `${base}/protected-preview` : null;
  try {
    await env.PHOTOS.put(previewKey, preview.stream(), { httpMetadata: { contentType: previewType } });
    await env.PHOTOS.put(originalKey, original.stream(), { httpMetadata: { contentType: originalType } });
    if (protectedKey) await env.PHOTOS.put(protectedKey, protection.file.stream(), { httpMetadata: { contentType: protection.type } });
    const features = await optionalSchema(env);
    const deletionGuard = features.galleryDeletion ? ' AND g.deleted_at IS NULL' : '';
    await env.DB.batch([
      statement(env, `INSERT INTO images(id,gallery_id,title,preview_key,original_key,preview_type,original_type,width,height,position,created_at${features.finalDelivery ? ',source_filename,final_ready' : ''}) SELECT ?,?,?,?,?,?,?,?,?,(SELECT COALESCE(MAX(position),-1)+1 FROM images WHERE gallery_id=g.id),?${features.finalDelivery ? ',?,?' : ''} FROM galleries g WHERE g.id=?${deletionGuard}`, imageId, gallery.id, title, previewKey, originalKey, previewType, originalType, width, height, Date.now(), ...(features.finalDelivery ? [String(original.name || title).slice(0, 255), Number(finalReady === 'true')] : []), gallery.id),
      ...(protection.studio ? [statement(env, 'UPDATE images SET protected_preview_key=?,protected_preview_type=?,watermark_fingerprint=? WHERE id=?', protectedKey, protection.type, protectedKey ? protection.fingerprint : null, imageId)] : []),
      statement(env, 'UPDATE galleries SET cover_image_id=COALESCE(cover_image_id,?),updated_at=? WHERE id=?', imageId, Date.now(), gallery.id),
      statement(env, 'INSERT INTO audit_events(id,user_id,action,target_id,created_at) VALUES(?,?,?,?,?)', id(), user.id, 'image_uploaded', imageId, Date.now()),
    ]);
    if (!await first(env, 'SELECT id FROM images WHERE id=?', imageId)) fail(409, 'Die Galerie wurde während des Hochladens gelöscht.', 'gallery_deleted');
    return json({ image: { ...imageJson(await first(env, 'SELECT * FROM images WHERE id=?', imageId), true), protectedPreviewReady: Boolean(protectedKey) } }, 201);
  } catch (error) {
    await cleanupImageKeys(env, imageId, [previewKey, originalKey, protectedKey]);
    throw error;
  }
}
async function cleanupImageKeys(env, imageId, keys) {
  // R2 and D1 are not transactional together. A lost D1 response must not cause
  // a successfully committed image to be deleted.
  try {
    const current = await first(env, 'SELECT * FROM images WHERE id=?', imageId);
    const used = new Set(current ? [current.preview_key, current.original_key, current.protected_preview_key] : []);
    await Promise.allSettled(keys.filter(key => key && !used.has(key)).map(key => env.PHOTOS.delete(key)));
  } catch {}
}
async function validateProtectedPreview(env, gallery, form, image = {}) {
  const studio = (await optionalSchema(env)).studio;
  const settings = imageProtection(await previewSettings(env, gallery), image); const file = form.get('protectedPreview');
  if (settings.enabled && (!file || typeof file.stream !== 'function')) fail(400, 'Bitte erstelle eine geschützte Vorschau mit den aktuellen Einstellungen.', 'protected_preview_required');
  if (!file) return { studio, file: null, type: null, fingerprint: settings.fingerprint };
  if (!studio) fail(503, 'Die Vorschauen benötigen zuerst die Datenbank-Erweiterung.', 'migration_required');
  if (typeof file.stream !== 'function' || file.size <= 0 || file.size > 4 * 1024 * 1024) fail(413, 'Die geschützte Vorschau darf höchstens 4 MB groß sein.');
  if (form.get('watermarkFingerprint') !== settings.fingerprint) fail(409, 'Die Wasserzeichen-Einstellungen wurden geändert. Bitte lade sie neu und wiederhole den Vorgang.', 'watermark_changed');
  return { studio, file, type: await sniffImage(file), fingerprint: settings.fingerprint };
}
async function regeneratePreviews(request, env, gallery, image, user) {
  if (!(await optionalSchema(env)).studio) fail(503, 'Bitte führe zuerst die Datenbank-Erweiterung aus.', 'migration_required');
  const length = Number(request.headers.get('content-length') || 0);
  if (!length && !local(env)) fail(411, 'Die Dateigröße fehlt.');
  if (length > 9 * 1024 * 1024) fail(413, 'Die Vorschauen sind zu groß.');
  if (!(request.headers.get('content-type') || '').startsWith('multipart/form-data')) fail(415, 'Bitte lade die Vorschauen als Dateien hoch.');
  const form = await request.formData(); const clean = form.get('preview');
  if (!clean || typeof clean.stream !== 'function' || clean.size <= 0 || clean.size > 4 * 1024 * 1024) fail(400, 'Eine verkleinerte Vorschau wird benötigt.');
  const cleanType = await sniffImage(clean); const protection = await validateProtectedPreview(env, gallery, form, image);
  const base = `galleries/${gallery.id}/${image.id}/versions/${id()}`;
  const cleanKey = `${base}/preview`; const protectedKey = protection.file ? `${base}/protected-preview` : null;
  try {
    await env.PHOTOS.put(cleanKey, clean.stream(), { httpMetadata: { contentType: cleanType } });
    if (protectedKey) await env.PHOTOS.put(protectedKey, protection.file.stream(), { httpMetadata: { contentType: protection.type } });
    const changed = await first(env, `UPDATE images SET preview_key=?,preview_type=?,protected_preview_key=?,protected_preview_type=?,watermark_fingerprint=? WHERE id=? AND preview_key=? AND original_key=? ${(await optionalSchema(env)).galleryDeletion?'AND EXISTS(SELECT 1 FROM galleries g WHERE g.id=images.gallery_id AND g.deleted_at IS NULL)':''} RETURNING *`, cleanKey, cleanType, protectedKey, protection.type, protectedKey ? protection.fingerprint : null, image.id, image.preview_key, image.original_key);
    if (!changed) fail(409, 'Das Bild wurde währenddessen geändert. Bitte lade es neu.', 'image_changed');
    await audit(env, user.id, 'image_previews_updated', image.id);
    await cleanupImageKeys(env, image.id, [image.preview_key, image.protected_preview_key]);
    return json({ image: { ...imageJson(changed, true), protectedPreviewReady: Boolean(protectedKey) } });
  } catch (error) { await cleanupImageKeys(env, image.id, [cleanKey, protectedKey]); throw error; }
}
async function readyFinalSetNotifications(env, galleryId, imageIds) {
  const features = await optionalSchema(env);
  if (!features.notifications) return notificationStatus(env, { galleryId });
  const selected = JSON.stringify([...new Set(imageIds)].sort());
  const orders = await all(env, `SELECT o.* FROM orders o WHERE o.gallery_id=? AND o.status='paid' AND o.receipt_sent_at IS NOT NULL AND ${await liveOrder(env, 'o')} AND ${finalOrderCondition(features)} AND EXISTS(SELECT 1 FROM order_images oi WHERE oi.order_id=o.id AND oi.image_id IN (SELECT value FROM json_each(?)))`, galleryId, selected);
  if (orders.length) await env.DB.batch(orders.map(order => queueGrantNotification(env, features, { galleryId, userId: order.user_id, orderId: order.id, finalTransition: true })));
  // Aggregate manual grants per customer, never once per photo. Query the
  // undelivered image set inside each transaction so overlapping retries cannot
  // keep creating notices for the same already queued final files.
  const manual = await all(env, 'SELECT DISTINCT user_id FROM manual_releases WHERE image_id IN (SELECT value FROM json_each(?))', selected);
  if (manual.length) {
    const fingerprint = await sha256(selected);
    await env.DB.batch(manual.map(member => statement(env, `INSERT OR IGNORE INTO download_notifications(id,user_id,gallery_id,created_at,image_ids_json) SELECT ?,?,?,?,grants.image_ids_json FROM (SELECT json_group_array(i.id) AS image_ids_json,COUNT(*) AS count FROM images i JOIN manual_releases r ON r.image_id=i.id WHERE r.user_id=? AND i.gallery_id=? AND i.id IN (SELECT value FROM json_each(?)) AND ${finalImageCondition(features)} AND EXISTS(SELECT 1 FROM gallery_members m JOIN users u ON u.id=m.user_id JOIN galleries g ON g.id=m.gallery_id WHERE m.gallery_id=i.gallery_id AND m.user_id=r.user_id AND u.role='customer' AND u.disabled=0 ${features.galleryDeletion ? 'AND g.deleted_at IS NULL' : ''}) ${features.imageControls ? 'AND NOT EXISTS(SELECT 1 FROM image_download_blocks b WHERE b.user_id=r.user_id AND b.image_id=i.id)' : ''} AND NOT EXISTS(SELECT 1 FROM order_images oi JOIN orders o ON o.id=oi.order_id WHERE oi.image_id=i.id AND o.user_id=r.user_id AND o.status='paid' AND o.receipt_sent_at IS NOT NULL AND ${features.orderDeletion ? 'o.deleted_at IS NULL' : '1=1'} AND ${finalOrderCondition(features)}) AND NOT EXISTS(SELECT 1 FROM download_notifications n JOIN json_each(n.image_ids_json) delivered ON delivered.value=i.id WHERE n.user_id=r.user_id AND n.gallery_id=i.gallery_id AND n.id LIKE 'manual-final-%' AND (n.cancelled_at IS NULL OR n.sent_at IS NOT NULL))) grants WHERE grants.count>0`, `manual-final-${member.user_id}-${fingerprint}`, member.user_id, galleryId, Date.now(), member.user_id, galleryId, selected)));
  }
  return deliverNotifications(env, { galleryId });
}
async function readyFinalNotifications(env, galleryId, imageId) {
  return readyFinalSetNotifications(env, galleryId, [imageId]);
}
async function finalizeExistingImages(request, env, user, gallery) {
  const features = await optionalSchema(env);
  if (!features.finalDelivery) fail(503, 'Bitte führe zuerst die Datenbank-Erweiterung für fertige Bilder aus.', 'migration_required');
  const data = await body(request);
  if (data.confirmed !== true) fail(400, 'Bitte bestätige, dass diese Dateien bereits fertig bearbeitet sind.', 'final_confirmation_required');
  const selected = ids(data.imageIds); if (!selected.length) fail(400, 'Bitte wähle mindestens ein fertig bearbeitetes Bild.', 'invalid_selection');
  await selectedImages(env, gallery.id, selected);
  const encoded = JSON.stringify(selected);
  const guard = `gallery_id=? AND id IN (SELECT value FROM json_each(?)) AND (SELECT COUNT(*) FROM images checked WHERE checked.gallery_id=? AND checked.id IN (SELECT value FROM json_each(?)))=json_array_length(?)${features.galleryDeletion ? ' AND EXISTS(SELECT 1 FROM galleries g WHERE g.id=images.gallery_id AND g.deleted_at IS NULL)' : ''}`;
  const params = [gallery.id, encoded, gallery.id, encoded, encoded];
  const result = await env.DB.batch([
    statement(env, `INSERT INTO audit_events(id,user_id,action,target_id,created_at) SELECT ?,?,'images_marked_final',?,? WHERE EXISTS(SELECT 1 FROM images WHERE ${guard} AND final_ready<>1)`, id(), user.id, gallery.id, Date.now(), ...params),
    statement(env, `UPDATE images SET final_ready=1 WHERE ${guard} RETURNING *`, ...params),
  ]);
  if (result[1].results?.length !== selected.length) fail(409, 'Die Bilder wurden währenddessen geändert. Bitte lade die Galerie neu.', 'image_changed');
  const protection = await previewSettings(env, gallery);
  const notification = await readyFinalSetNotifications(env, gallery.id, selected);
  return json({ images: result[1].results.map(image => adminImageJson(image, protection)), notification });
}
async function uploadFinalImage(request, env, user, gallery, image) {
  const features = await optionalSchema(env);
  if (!features.finalDelivery) fail(503, 'Bitte führe zuerst die Datenbank-Erweiterung für fertige Bilder aus.', 'migration_required');
  const length = Number(request.headers.get('content-length') || 0);
  if (!length && !local(env)) fail(411, 'Die Dateigröße fehlt.');
  if (length > 39 * 1024 * 1024) fail(413, 'Bitte lade Fotos unter 30 MB pro Original hoch.');
  if (!(request.headers.get('content-type') || '').startsWith('multipart/form-data')) fail(415, 'Bitte lade die fertigen Bilder als Dateien hoch.');
  const form = await request.formData(); const original = form.get('original'); const preview = form.get('preview');
  if (!original || !preview || typeof original.stream !== 'function' || typeof preview.stream !== 'function') fail(400, 'Originaldatei und Vorschau werden benötigt.');
  if (original.size <= 0 || original.size > 30 * 1024 * 1024 || preview.size <= 0 || preview.size > 4 * 1024 * 1024) fail(413, 'Vorschau maximal 4 MB, Original maximal 30 MB.');
  const [originalType, previewType] = await Promise.all([sniffImage(original), sniffImage(preview)]);
  const protection = await validateProtectedPreview(env, gallery, form, image);
  const width = Number(form.get('width')); const height = Number(form.get('height'));
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 30000 || height > 30000) fail(400, 'Die Bildabmessungen fehlen.');
  const base = `galleries/${gallery.id}/${image.id}/finals/${id()}`;
  const originalKey = `${base}/original`; const previewKey = `${base}/preview`; const protectedKey = protection.file ? `${base}/protected-preview` : null;
  let changed;
  try {
    await env.PHOTOS.put(originalKey, original.stream(), { httpMetadata: { contentType: originalType } });
    await env.PHOTOS.put(previewKey, preview.stream(), { httpMetadata: { contentType: previewType } });
    if (protectedKey) await env.PHOTOS.put(protectedKey, protection.file.stream(), { httpMetadata: { contentType: protection.type } });
    // ID, source filename, title, customer selections and immutable order
    // snapshots are preserved. Failed/concurrent replacement keeps prior files.
    const result = await env.DB.batch([
      statement(env, `UPDATE images SET original_key=?,original_type=?,preview_key=?,preview_type=?,protected_preview_key=?,protected_preview_type=?,watermark_fingerprint=?,width=?,height=?,final_ready=1 WHERE id=? AND gallery_id=? AND original_key=? AND preview_key=?${features.galleryDeletion ? ' AND EXISTS(SELECT 1 FROM galleries g WHERE g.id=images.gallery_id AND g.deleted_at IS NULL)' : ''} RETURNING *`, originalKey, originalType, previewKey, previewType, protectedKey, protection.type, protectedKey ? protection.fingerprint : null, width, height, image.id, gallery.id, image.original_key, image.preview_key),
      statement(env, "INSERT INTO audit_events(id,user_id,action,target_id,created_at) SELECT ?,?,'image_final_uploaded',?,? WHERE EXISTS(SELECT 1 FROM images WHERE id=? AND original_key=?)", id(), user.id, image.id, Date.now(), image.id, originalKey),
    ]);
    changed = result[0].results?.[0];
    if (!changed) fail(409, 'Das Bild wurde währenddessen geändert. Bitte lade die Galerie neu.', 'image_changed');
  } catch (error) {
    await cleanupImageKeys(env, image.id, [originalKey, previewKey, protectedKey]);
    throw error;
  }
  await cleanupImageKeys(env, image.id, [image.original_key, image.preview_key, image.protected_preview_key]);
  const notification = await readyFinalNotifications(env, gallery.id, image.id);
  return json({ image: adminImageJson(changed, await previewSettings(env, gallery)), notification });
}
async function admin(request, env, path, user) {
  const deletion = path.match(/^\/admin\/galleries\/([\w-]+)$/);
  if (deletion && request.method === 'DELETE') {
    try { return json(await deleteGallery(env, deletion[1], user, await body(request))); }
    catch (error) { if (error instanceof GalleryDeletionError) fail(error.status, error.message, error.code); throw error; }
  }
  if (path === '/admin/settings' && ['GET', 'PATCH'].includes(request.method)) {
    const ready = (await optionalSchema(env)).studio;
    if (request.method === 'GET') return json({ settings: await portalSettings(env), ready });
    if (!ready) fail(503, 'Bitte führe zuerst die Datenbank-Erweiterung aus.', 'migration_required');
    const settings = validateSettings(await body(request), await portalSettings(env));
    await env.DB.batch([
      statement(env, 'INSERT INTO portal_settings(id,value_json,updated_at) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at', JSON.stringify(settings), Date.now()),
      statement(env, 'INSERT INTO audit_events(id,user_id,action,created_at) VALUES(?,?,?,?)', id(), user.id, 'portal_settings_updated', Date.now()),
    ]);
    return json({ settings, ready: true });
  }
  if (path === '/admin/activity' && request.method === 'GET') {
    if (!(await optionalSchema(env)).studio) return json({ activities: [], unreadCount: 0, ready: false });
    const readThrough = Date.now(); const cutoff = readThrough - 90 * DAY;
    await run(env, 'DELETE FROM customer_activity WHERE created_at<?', cutoff);
    const search = new URL(request.url).searchParams;
    const cursor = search.get('cursor')?.match(/^(\d+):([\w-]{1,80})$/);
    if (search.has('cursor') && !cursor) fail(400, 'Ungültige nächste Seite.');
    const before = Number(cursor?.[1] || search.get('before') || readThrough + 1);
    if (!Number.isSafeInteger(before) || before < 0) fail(400, 'Ungültiges Datum.');
    const rows = await all(env, `SELECT a.*,u.name AS customer_name,g.name AS gallery_name,i.title AS image_title FROM customer_activity a JOIN users u ON u.id=a.user_id JOIN galleries g ON g.id=a.gallery_id LEFT JOIN images i ON i.id=a.image_id WHERE (a.created_at<?${cursor ? ' OR (a.created_at=? AND a.id>?)' : ''}) ORDER BY a.created_at DESC,a.id LIMIT 200`, before, ...(cursor ? [before, cursor[2]] : []));
    const unread = await first(env, 'SELECT COUNT(*) AS count FROM customer_activity WHERE read_at IS NULL');
    return json({ activities: rows.map(row => ({ id: row.id, kind: row.kind, userId: row.user_id, customerName: row.customer_name, galleryId: row.gallery_id, galleryName: row.gallery_name, imageId: row.image_id, imageTitle: row.image_title, createdAt: new Date(row.created_at).toISOString(), read: Boolean(row.read_at) })), unreadCount: unread.count, readThrough, nextCursor: rows.length === 200 ? `${rows.at(-1).created_at}:${rows.at(-1).id}` : null, ready: true });
  }
  if (path === '/admin/activity/read' && request.method === 'POST') {
    if (!(await optionalSchema(env)).studio) fail(503, 'Bitte führe zuerst die Datenbank-Erweiterung aus.', 'migration_required');
    const data = await body(request);
    if (data.ids !== undefined) await run(env, 'UPDATE customer_activity SET read_at=COALESCE(read_at,?) WHERE id IN (SELECT value FROM json_each(?))', Date.now(), JSON.stringify(ids(data.ids)));
    else {
      const now = Date.now(); const requested = data.readThrough ?? data.before ?? now;
      const parsed = typeof requested === 'string' ? Date.parse(requested) : requested;
      if (!Number.isSafeInteger(parsed) || parsed < 0) fail(400, 'Ungültiges Datum.', 'invalid_activity_cutoff');
      const before = Math.min(parsed, now);
      await run(env, 'UPDATE customer_activity SET read_at=COALESCE(read_at,?) WHERE created_at<=?', Date.now(), before);
    }
    return json({ ok: true });
  }
  if (path === '/admin/images' && request.method === 'GET') {
    const rows = await all(env, `SELECT i.*,g.name AS gallery_name,g.shooting_date,g.watermark_mode,(SELECT COUNT(*) FROM favorites f JOIN gallery_members m ON m.user_id=f.user_id AND m.gallery_id=i.gallery_id JOIN users u ON u.id=f.user_id WHERE f.image_id=i.id AND u.disabled=0 AND u.role='customer') AS favorite_count FROM images i JOIN galleries g ON g.id=i.gallery_id ${(await optionalSchema(env)).galleryDeletion?'WHERE g.deleted_at IS NULL':''} ORDER BY i.created_at DESC,i.id LIMIT 5001`);
    const mark = await previewSettings(env, {});
    return json({ images: rows.slice(0, 5000).map(row => ({ ...adminImageJson(row, { ...mark, enabled: watermarkEnabled(mark, row) }), galleryName: row.gallery_name, date: row.shooting_date, favoriteCount: row.favorite_count })), truncated: rows.length > 5000 });
  }
  const finalizeRoute = path.match(/^\/admin\/galleries\/([\w-]+)\/images\/finalize$/);
  if (finalizeRoute && request.method === 'POST') {
    const gallery = await galleryAccess(env, finalizeRoute[1], user);
    return finalizeExistingImages(request, env, user, gallery);
  }
  const photoRoute = path.match(/^\/admin\/galleries\/([\w-]+)\/images\/([\w-]+)(?:\/(previews|final))?$/);
  if (photoRoute && (photoRoute[3] || ['PATCH', 'DELETE'].includes(request.method))) {
    const gallery = await galleryAccess(env, photoRoute[1], user);
    const image = await first(env, 'SELECT * FROM images WHERE id=? AND gallery_id=?', photoRoute[2], gallery.id);
    if (!image) fail(404, 'Das Bild wurde nicht gefunden.');
    if (photoRoute[3] === 'final' && request.method === 'POST') return uploadFinalImage(request, env, user, gallery, image);
    if (photoRoute[3] === 'previews' && request.method === 'POST') return regeneratePreviews(request, env, gallery, image, user);
    if (!photoRoute[3] && request.method === 'PATCH') {
      const data = await body(request);
      if (Object.keys(data).some(key => !['title','watermarkOverride'].includes(key))) fail(400, 'Unbekannte Bildeinstellung.');
      const title = data.title === undefined ? image.title : textField(data.title, 150);
      const sets = ['title=?']; const values = [title];
      if (data.watermarkOverride !== undefined) {
        if (!(await optionalSchema(env)).imageControls) fail(503, 'Bitte führe zuerst die neue Datenbank-Erweiterung aus.', 'migration_required');
        const mode = enumField(data.watermarkOverride, ['inherit','on','off'], image.watermark_override || 'inherit');
        const protection = imageProtection(await previewSettings(env, gallery), { watermark_override: mode });
        if (protection.enabled && (!image.protected_preview_key || image.watermark_fingerprint !== protection.fingerprint)) fail(409, 'Bitte aktualisiere zuerst die Wasserzeichen-Vorschau dieses Bildes.', 'protected_preview_required');
        sets.push('watermark_override=?'); values.push(mode);
      }
      await env.DB.batch([
        statement(env, 'UPDATE images SET ' + sets.join(',') + ' WHERE id=?', ...values, image.id),
        statement(env, 'INSERT INTO audit_events(id,user_id,action,target_id,created_at) VALUES(?,?,?,?,?)', id(), user.id, 'image_settings_updated', image.id, Date.now()),
      ]);
      return json({ image: adminImageJson(await first(env, 'SELECT * FROM images WHERE id=?', image.id), await previewSettings(env, gallery)) });
    }
    if (!photoRoute[3] && request.method === 'DELETE') {
      if (await first(env, 'SELECT 1 AS used FROM order_images WHERE image_id=? LIMIT 1', image.id)) fail(409, 'Dieses Bild gehört zu einer Bestellung und bleibt deshalb erhalten.', 'image_ordered');
      try {
        await env.DB.batch([
          statement(env, 'DELETE FROM manual_releases WHERE image_id=?', image.id),
          statement(env, 'DELETE FROM images WHERE id=?', image.id),
          statement(env, 'UPDATE galleries SET cover_image_id=NULL,updated_at=? WHERE id=? AND cover_image_id=?', Date.now(), gallery.id, image.id),
          statement(env, 'INSERT INTO audit_events(id,user_id,action,target_id,created_at) VALUES(?,?,?,?,?)', id(), user.id, 'image_deleted', image.id, Date.now()),
        ]);
      } catch (error) {
        if (await first(env, 'SELECT 1 AS used FROM order_images WHERE image_id=? LIMIT 1', image.id)) fail(409, 'Dieses Bild wurde gerade bestellt und bleibt erhalten.', 'image_ordered');
        throw error;
      }
      await cleanupImageKeys(env, image.id, [image.preview_key, image.original_key, image.protected_preview_key]);
      return json({ ok: true });
    }
    fail(405, 'Diese Aktion ist nicht verfügbar.');
  }
  if (path === '/admin/galleries' && request.method === 'GET') return json(await listGalleries(env, user));
  if (path === '/admin/orders' && request.method === 'GET') return json(await listOrders(env, user, true));
  const deletedOrder = path.match(/^\/admin\/orders\/([\w-]+)$/);
  if (deletedOrder && request.method === 'DELETE') {
    const features = await optionalSchema(env);
    if (!features.orderDeletion) fail(503, 'Bitte führe zuerst die Datenbank-Erweiterung aus.', 'migration_required');
    const data = await body(request);
    const order = await getOrder(env, deletedOrder[1], true);
    if (!order) fail(404, 'Die Bestellung wurde nicht gefunden.');
    if (data.confirmed !== true || data.testOrder !== true || data.confirmReference !== orderReference(order)) fail(400, 'Bestätige die Testbestellung mit ihrer vollständigen Bestellnummer.', 'test_order_confirmation_required');
    if (!testOrderEligible(order)) fail(409, 'Hier können nur Testbestellungen per Überweisung ohne Onlinezahlung gelöscht werden.', 'test_order_not_eligible');
    if (order.deleted_at) return json({ ok: true, deleted: true, orderId: order.id });
    const now = Date.now();
    // Retain the immutable financial/contract snapshot. Only this order's access
    // and visibility are revoked; independent manual/paid grants remain valid.
    const result = await env.DB.batch([
      statement(env, "UPDATE orders SET deleted_at=?,pending_key=NULL WHERE id=? AND deleted_at IS NULL AND payment_method='transfer' AND COALESCE(provider_reference,'')='' AND COALESCE(checkout_url,'')='' AND COALESCE(payment_reference,id)=? AND NOT EXISTS(SELECT 1 FROM payment_events WHERE order_id=orders.id) RETURNING id", now, order.id, data.confirmReference),
      statement(env, "INSERT INTO audit_events(id,user_id,action,target_id,created_at) SELECT ?,?,'test_order_deleted',?,? WHERE EXISTS(SELECT 1 FROM orders WHERE id=? AND deleted_at=?) AND NOT EXISTS(SELECT 1 FROM audit_events WHERE action='test_order_deleted' AND target_id=?)", id(), user.id, order.id, now, order.id, now, order.id),
      ...(features.notifications ? [statement(env, 'UPDATE download_notifications SET cancelled_at=COALESCE(cancelled_at,?),lease_at=NULL,error_code=NULL WHERE order_id=? AND sent_at IS NULL AND EXISTS(SELECT 1 FROM orders WHERE id=? AND deleted_at IS NOT NULL)', now, order.id, order.id)] : []),
    ]);
    if (!result[0].results?.length && !(await getOrder(env, order.id, true))?.deleted_at) fail(409, 'Die Bestellung wurde währenddessen geändert. Bitte lade die Übersicht neu.', 'order_changed');
    return json({ ok: true, deleted: true, orderId: order.id });
  }
  const retry = path.match(/^\/admin\/(orders|galleries)\/([\w-]+)\/notifications\/retry$/);
  if (retry && request.method === 'POST') {
    await body(request);
    if (retry[1] === 'orders') {
      const order = await getOrder(env, retry[2]);
      if (!order) fail(404, 'Die Bestellung wurde nicht gefunden.');
      const notification = order.status === 'paid' ? await completePaidNotifications(env, order.id, true) : await deliverNotifications(env, { orderId: order.id }, true);
      return json({ notification, order: await orderJson(env, await getOrder(env, order.id), true) });
    }
    await galleryAccess(env, retry[2], user);
    return json({ notification: await deliverNotifications(env, { galleryId: retry[2] }, true) });
  }
  const receipt = path.match(/^\/admin\/orders\/([\w-]+)\/receipt$/);
  if (receipt && request.method === 'POST') {
    if (!await getOrder(env, receipt[1])) fail(404, 'Die Bestellung wurde nicht gefunden.');
    await ensureReceipt(env, receipt[1], true);
    await audit(env, user.id, 'order_receipt_resent', receipt[1]);
    return json({ order: await orderJson(env, await getOrder(env, receipt[1]), true), notification: await deliverNotifications(env, { orderId: receipt[1] }) });
  }
  const refunded = path.match(/^\/admin\/orders\/([\w-]+)\/refunded$/);
  if (refunded && request.method === 'POST') {
    const order = await getOrder(env, refunded[1]); if (!order) fail(404, 'Die Bestellung wurde nicht gefunden.');
    if (!['paid', 'refunded'].includes(order.status)) fail(409, 'Nur bezahlte Bestellungen können als erstattet markiert werden.');
    await run(env, `UPDATE orders SET status='refunded' WHERE id=? AND ${await liveOrder(env)}`, order.id);
    await audit(env, user.id, 'refund_recorded_manual', order.id);
    return json({ order: await orderJson(env, await getOrder(env, order.id)) });
  }
  const cancelled = path.match(/^\/admin\/orders\/([\w-]+)\/cancel$/);
  if (cancelled && request.method === 'POST') {
    const data = await body(request);
    if (data.confirmed !== true) fail(400, 'Bitte bestätige, dass die offene Überweisungsbestellung storniert werden soll.', 'order_cancel_confirmation_required');
    const order = await getOrder(env, cancelled[1]);
    if (!order) fail(404, 'Die Bestellung wurde nicht gefunden.');
    if (order.status !== 'pending' || order.payment_method !== 'transfer') fail(409, 'Nur offene Bestellungen per Überweisung können hier storniert werden. Bezahlte Bestellungen und Onlinezahlungen bleiben unverändert.', 'order_cannot_cancel');
    const features = await optionalSchema(env); const now = Date.now();
    const result = await env.DB.batch([
      statement(env, `INSERT INTO audit_events(id,user_id,action,target_id,created_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM orders WHERE id=? AND status='pending' AND payment_method='transfer' AND ${await liveOrder(env)})`, id(), user.id, 'order_cancelled_manual', order.id, now, order.id),
      statement(env, `UPDATE orders SET status='cancelled' WHERE id=? AND status='pending' AND payment_method='transfer' AND ${await liveOrder(env)} RETURNING id`, order.id),
      ...(features.notifications ? [statement(env, "UPDATE download_notifications SET cancelled_at=?,lease_at=NULL,error_code=NULL WHERE order_id=? AND sent_at IS NULL AND cancelled_at IS NULL AND EXISTS(SELECT 1 FROM orders WHERE id=? AND status='cancelled' AND payment_method='transfer')", now, order.id, order.id)] : []),
    ]);
    if (!result[1].results?.length) fail(409, 'Die Bestellung wurde währenddessen geändert und nicht storniert. Bitte lade die Bestellungen neu.', 'order_cannot_cancel');
    return json({ order: await orderJson(env, await getOrder(env, order.id), true) });
  }
  if (path === '/admin/galleries' && request.method === 'POST') {
    const data = await body(request); const galleryId = id(); const now = Date.now();
    const type = enumField(data.shootingType, SHOOTING_TYPES, 'other');
    const mode = enumField(data.pricingMode, ['images', 'gallery'], type === 'school' ? 'images' : 'gallery');
    const theme = legacyTheme(galleryDesign(data).theme);
    const grid = enumField(data.gridLayout, ['masonry', 'grid'], 'masonry');
    const position = coverPosition(data.coverPosition === undefined ? 50 : data.coverPosition);
    const appearance = await appearanceStatement(env, data, galleryId);
    await env.DB.batch([
      statement(env, 'INSERT INTO galleries(id,name,shooting_date,description,published,expires_at,created_at,updated_at,shooting_type,pricing_mode,theme,grid_layout,cover_position) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)', galleryId, textField(data.name), shootingDate(data.date), textField(data.description, 2000, false), data.published === true ? 1 : 0, data.expiresAt ? expiry(data.expiresAt) : null, now, now, type, mode, theme, grid, position),
      ...(appearance ? [appearance] : []),
      ...(type === 'school' && mode === 'images' ? [
        statement(env, 'INSERT INTO packages(id,gallery_id,name,image_count,price_cents,currency) VALUES(?,?,?,?,?,?)', id(), galleryId, 'Ein digitales Foto', 1, 1000, 'EUR'),
        statement(env, 'INSERT INTO packages(id,gallery_id,name,image_count,price_cents,currency) VALUES(?,?,?,?,?,?)', id(), galleryId, 'Drei digitale Fotos', 3, 2500, 'EUR'),
      ] : []),
      statement(env, 'INSERT INTO audit_events(id,user_id,action,target_id,created_at) VALUES(?,?,?,?,?)', id(), user.id, 'gallery_created', galleryId, now),
    ]);
    return json({ gallery: galleryJson(await galleryAccess(env, galleryId, user)) }, 201);
  }
  const paid = path.match(/^\/admin\/orders\/([\w-]+)\/paid$/);
  if (paid && request.method === 'POST') {
    const order = await getOrder(env, paid[1]); if (!order) fail(404, 'Die Bestellung wurde nicht gefunden.');
    if (order.payment_method !== 'transfer') fail(409, 'Onlinezahlungen werden ausschließlich vom Zahlungsanbieter bestätigt.');
    if (!['pending', 'paid'].includes(order.status)) fail(409, 'Diese Bestellung ist nicht mehr offen.');
    await galleryAccess(env, order.gallery_id, user);
    const features = await optionalSchema(env);
    const activeOrder = features.orderDeletion ? ' AND deleted_at IS NULL' : '';
    const activeGallery = features.galleryDeletion ? ' AND EXISTS(SELECT 1 FROM galleries g WHERE g.id=orders.gallery_id AND g.deleted_at IS NULL)' : '';
    await env.DB.batch([
      ...(features.imageControls ? [clearBlocksForNewPayment(env, order, features)] : []),
      ...(features.notifications ? [queueGrantNotification(env, features, { galleryId: order.gallery_id, userId: order.user_id, orderId: order.id })] : []),
      statement(env, `UPDATE orders SET status='paid',paid_at=COALESCE(paid_at,?) WHERE id=? AND status='pending' AND ${await liveOrder(env)}` + activeGallery, Date.now(), order.id),
      statement(env, "INSERT INTO audit_events(id,user_id,action,target_id,created_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM orders WHERE id=? AND status='paid'" + activeOrder + activeGallery + ')', id(), user.id, 'transfer_payment_confirmed', order.id, Date.now(), order.id),
    ]);
    // A deletion may have committed after the initial access check. Do not mark
    // a pending transfer as paid or send a release notice for a deleted gallery.
    await galleryAccess(env, order.gallery_id, user);
    if ((await getOrder(env, order.id))?.status !== 'paid') fail(409, 'Diese Bestellung ist nicht mehr offen.', 'order_changed');
    const notification = await completePaidNotifications(env, order.id);
    return json({ order: await orderJson(env, await getOrder(env, order.id), true), notification });
  }
  const ordering = path.match(/^\/admin\/galleries\/([\w-]+)\/images\/order$/);
  if (ordering && request.method === 'POST') {
    const gallery = await galleryAccess(env, ordering[1], user);
    const data = await body(request, 450_000); const selected = ids(data.imageIds, MAX_GALLERY_IMAGES);
    const existing = await all(env, 'SELECT id FROM images WHERE gallery_id=?', gallery.id);
    if (existing.length !== selected.length || existing.some(image => !selected.includes(image.id))) fail(400, 'Bitte übermittle alle Bilder dieser Galerie genau einmal.', 'invalid_image_order');
    if (selected.length) {
      const results = await env.DB.batch([
        statement(env, 'WITH ordered AS (SELECT value AS image_id,CAST(key AS INTEGER) AS position FROM json_each(?)) UPDATE images SET position=(SELECT position FROM ordered WHERE image_id=images.id) WHERE gallery_id=? AND (SELECT COUNT(*) FROM images WHERE gallery_id=?)=? AND NOT EXISTS(SELECT 1 FROM ordered LEFT JOIN images i ON i.id=ordered.image_id AND i.gallery_id=? WHERE i.id IS NULL) RETURNING id', JSON.stringify(selected), gallery.id, gallery.id, selected.length, gallery.id),
        statement(env, 'UPDATE galleries SET updated_at=? WHERE id=?', Date.now(), gallery.id),
        statement(env, 'INSERT INTO audit_events(id,user_id,action,target_id,created_at) VALUES(?,?,?,?,?)', id(), user.id, 'images_reordered', gallery.id, Date.now()),
      ]);
      if (results[0].results?.length !== selected.length) fail(409, 'Die Galerie wurde währenddessen geändert. Bitte lade die Bilder neu.', 'gallery_changed');
    }
    return json({ images: (await all(env, 'SELECT * FROM images WHERE gallery_id=? ORDER BY position,created_at,id', gallery.id)).map(image => imageJson(image, true)) });
  }
  const invoiceRoute = path.match(/^\/admin\/galleries\/([\w-]+)\/invoice$/);
  if (invoiceRoute && ['POST', 'DELETE'].includes(request.method)) {
    const gallery = await galleryAccess(env, invoiceRoute[1], user);
    if (!(await optionalSchema(env)).invoices) fail(503, 'Rechnungen benötigen zuerst die Datenbank-Erweiterung.', 'migration_required');
    let memberId; let file;
    if (request.method === 'POST') {
      if (!(request.headers.get('content-type') || '').startsWith('multipart/form-data')) fail(415, 'Bitte lade die Rechnung als PDF-Datei hoch.');
      if (Number(request.headers.get('content-length') || 0) > 5 * 1024 * 1024 + 32768) fail(413, 'Eine Rechnung darf höchstens 5 MB groß sein.');
      const form = await request.formData(); memberId = textField(form.get('userId'), 80); file = form.get('file');
      if (!file || typeof file.arrayBuffer !== 'function' || file.size < 5 || file.size > 5 * 1024 * 1024) fail(413, 'Bitte lade eine PDF-Rechnung mit höchstens 5 MB hoch.');
      if (new TextDecoder().decode(await file.slice(0, 5).arrayBuffer()) !== '%PDF-') fail(415, 'Bitte lade eine PDF-Datei hoch.', 'invalid_invoice_type');
    } else { memberId = textField((await body(request)).userId, 80); }
    if (request.method === 'POST' && !await first(env, "SELECT 1 AS ok FROM gallery_members m JOIN users u ON u.id=m.user_id WHERE m.gallery_id=? AND m.user_id=? AND u.role='customer' AND u.disabled=0", gallery.id, memberId)) fail(400, 'Der Kunde gehört nicht zu dieser Galerie.', 'invalid_invoice_member');
    const previous = await first(env, 'SELECT * FROM gallery_invoices WHERE gallery_id=? AND user_id=?', gallery.id, memberId);
    if (request.method === 'DELETE') {
      const removed = await first(env, 'DELETE FROM gallery_invoices WHERE gallery_id=? AND user_id=? RETURNING r2_key', gallery.id, memberId);
      if (removed) await cleanupInvoiceObject(env, removed.r2_key);
      await audit(env, user.id, 'invoice_removed', gallery.id);
      return json({ ok: true });
    }
    const invoiceId = id(); const key = `invoices/${gallery.id}/${memberId}/${invoiceId}.pdf`;
    const filename = `${String(file.name || 'Rechnung.pdf').replace(/[\\/\r\n"<>:|?*\u0000-\u001f]/g, '_').slice(0, 140).replace(/\.pdf$/i, '') || 'Rechnung'}.pdf`;
    try {
      await env.PHOTOS.put(key, file.stream(), { httpMetadata: { contentType: 'application/pdf' } });
      const results = await env.DB.batch([
        statement(env, 'INSERT INTO gallery_invoices(id,gallery_id,user_id,r2_key,filename,size,uploaded_at,uploaded_by) SELECT ?,?,?,?,?,?,?,? WHERE (? IS NULL AND NOT EXISTS(SELECT 1 FROM gallery_invoices WHERE gallery_id=? AND user_id=?)) OR EXISTS(SELECT 1 FROM gallery_invoices WHERE gallery_id=? AND user_id=? AND id=?) ON CONFLICT(gallery_id,user_id) DO UPDATE SET id=excluded.id,r2_key=excluded.r2_key,filename=excluded.filename,size=excluded.size,uploaded_at=excluded.uploaded_at,uploaded_by=excluded.uploaded_by WHERE gallery_invoices.id=? RETURNING id', invoiceId, gallery.id, memberId, key, filename, file.size, Date.now(), user.id, previous?.id || null, gallery.id, memberId, gallery.id, memberId, previous?.id || null, previous?.id || null),
        statement(env, 'INSERT INTO audit_events(id,user_id,action,target_id,created_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM gallery_invoices WHERE id=?)', id(), user.id, 'invoice_uploaded', gallery.id, Date.now(), invoiceId),
      ]);
      if (!results[0].results?.length) fail(409, 'Die Rechnung wurde inzwischen geändert. Bitte lade die Galerie neu und versuche es erneut.', 'invoice_changed');
    } catch (error) { try { await cleanupInvoiceObject(env, key); } catch {} throw error; }
    if (previous) await cleanupInvoiceObject(env, previous.r2_key);
    return json({ invoice: invoiceJson(await first(env, 'SELECT * FROM gallery_invoices WHERE gallery_id=? AND user_id=?', gallery.id, memberId), true) }, 201);
  }
  const match = path.match(/^\/admin\/galleries\/([\w-]+)(?:\/(members|packages|images|release|invite)(?:\/([\w-]+))?)?$/);
  if (!match) fail(404, 'Diese Verwaltungsfunktion wurde nicht gefunden.');
  const gallery = await galleryAccess(env, match[1], user); const action = match[2]; const resourceId = match[3];
  if (!action && request.method === 'GET') return json(await galleryDetail(env, gallery.id, user));
  if (!action && request.method === 'PATCH') {
    const data = await body(request);
    const name = data.name === undefined ? gallery.name : textField(data.name);
    const date = data.date === undefined ? gallery.shooting_date : shootingDate(data.date);
    const description = data.description === undefined ? gallery.description : textField(data.description, 2000, false);
    const published = data.published === undefined ? gallery.published : data.published === true ? 1 : 0;
    const expiresAt = data.expiresAt === undefined ? gallery.expires_at : expiry(data.expiresAt);
    const type = enumField(data.shootingType, SHOOTING_TYPES, gallery.shooting_type || 'other');
    const mode = enumField(data.pricingMode, ['images', 'gallery'], gallery.pricing_mode || 'gallery');
    const theme = legacyTheme(galleryDesign(data, gallery).theme);
    const grid = enumField(data.gridLayout, ['masonry', 'grid'], gallery.grid_layout || 'masonry');
    const position = coverPosition(data.coverPosition === undefined ? gallery.cover_position ?? 50 : data.coverPosition);
    const appearance = await appearanceStatement(env, data, gallery.id, gallery);
    let coverId = gallery.cover_image_id;
    if (data.coverImageId !== undefined) {
      if (data.coverImageId !== null) await selectedImages(env, gallery.id, ids([data.coverImageId]));
      coverId = data.coverImageId;
    }
    await env.DB.batch([
      statement(env, 'UPDATE galleries SET name=?,shooting_date=?,description=?,published=?,expires_at=?,cover_image_id=?,updated_at=?,shooting_type=?,pricing_mode=?,theme=?,grid_layout=?,cover_position=? WHERE id=?', name, date, description, published, expiresAt, coverId, Date.now(), type, mode, theme, grid, position, gallery.id),
      ...(appearance ? [appearance] : []),
    ]);
    await audit(env, user.id, 'gallery_updated', gallery.id);
    return json({ gallery: galleryJson(await galleryAccess(env, gallery.id, user)) });
  }
  if (action === 'images' && !resourceId && request.method === 'POST') return uploadImage(request, env, user, gallery);
  if (action === 'members' && !resourceId && request.method === 'POST') {
    const data = await body(request); const email = normalizeEmail(data.email); const name = textField(data.name, 150);
    const existing = await first(env, 'SELECT * FROM users WHERE email=?', email);
    if (existing?.disabled) fail(409, 'Dieser Zugang ist gesperrt.');
    const memberId = existing?.id || id();
    await env.DB.batch([
      statement(env, 'INSERT INTO users(id,email,name,created_at) VALUES(?,?,?,?) ON CONFLICT(email) DO NOTHING', memberId, email, name, Date.now()),
      statement(env, 'INSERT OR IGNORE INTO gallery_members(gallery_id,user_id) SELECT ?,id FROM users WHERE email=?', gallery.id, email),
      statement(env, 'INSERT INTO audit_events(id,user_id,action,target_id,created_at) VALUES(?,?,?,?,?)', id(), user.id, 'gallery_member_added', gallery.id, Date.now()),
    ]);
    return json({ user: publicUser(await first(env, 'SELECT * FROM users WHERE email=?', email)) }, 201);
  }
  if (action === 'members' && resourceId && request.method === 'DELETE') {
    const features = await optionalSchema(env);
    await env.DB.batch([
      statement(env, 'DELETE FROM gallery_members WHERE gallery_id=? AND user_id=?', gallery.id, resourceId),
      ...(features.notifications ? [statement(env, 'UPDATE download_notifications SET cancelled_at=?,lease_at=NULL,error_code=NULL WHERE gallery_id=? AND user_id=? AND sent_at IS NULL AND cancelled_at IS NULL', Date.now(), gallery.id, resourceId)] : []),
    ]);
    await audit(env, user.id, 'gallery_member_removed', gallery.id); return json({ ok: true });
  }
  if (action === 'packages' && resourceId === 'order' && request.method === 'PUT') {
    const features = await optionalSchema(env);
    if (!features.packageOrder) fail(503, 'Bitte führe zuerst die Datenbank-Erweiterung aus.', 'migration_required');
    const data = await body(request); const selected = ids(data.packageIds);
    const packages = await all(env, 'SELECT id FROM packages WHERE gallery_id=?', gallery.id);
    if (selected.length !== packages.length || packages.some(pack => !selected.includes(pack.id))) fail(400, 'Bitte übermittle alle Pakete dieser Galerie genau einmal.', 'invalid_package_order');
    const encoded = JSON.stringify(selected);
    // Validate the complete set again inside the atomic update. Concurrent
    // additions or gallery deletion cannot create a partly saved order.
    const guard = `gallery_id=? AND (SELECT COUNT(*) FROM packages WHERE gallery_id=?)=json_array_length(?) AND NOT EXISTS(SELECT 1 FROM json_each(?) chosen WHERE NOT EXISTS(SELECT 1 FROM packages p WHERE p.id=chosen.value AND p.gallery_id=?))${features.galleryDeletion ? ' AND EXISTS(SELECT 1 FROM galleries WHERE id=packages.gallery_id AND deleted_at IS NULL)' : ''}`;
    const changed = await first(env, `UPDATE packages SET position=(SELECT CAST(key AS INTEGER) FROM json_each(?) chosen WHERE chosen.value=packages.id) WHERE ${guard} RETURNING id`, encoded, gallery.id, gallery.id, encoded, encoded, gallery.id);
    if (selected.length && !changed) fail(409, 'Die Pakete wurden währenddessen geändert. Bitte lade die Galerie neu.', 'package_order_changed');
    await audit(env, user.id, 'package_order_updated', gallery.id);
    return json({ packages: (await all(env, 'SELECT * FROM packages WHERE gallery_id=? ORDER BY position,image_count,price_cents,id', gallery.id)).map(packageJson) });
  }
  if (action === 'packages' && ['POST', 'PATCH'].includes(request.method)) {
    const data = await body(request); const packageId = resourceId || id();
    if (request.method === 'POST' && resourceId) fail(405, 'Zum Bearbeiten eines Pakets ist PATCH erforderlich.');
    const previous = request.method === 'PATCH' && resourceId ? await first(env, 'SELECT * FROM packages WHERE id=? AND gallery_id=?', resourceId, gallery.id) : null;
    if (request.method === 'PATCH' && !previous) fail(404, 'Dieses Paket wurde nicht gefunden.');
    const name = textField(data.name, 150); const count = Number(data.imageCount); const price = Number(data.priceCents);
    if (!Number.isSafeInteger(count) || count < 0 || count > MAX_IMAGES || !Number.isSafeInteger(price) || price < 1 || price > 1_000_000) fail(400, 'Bitte prüfe Bildanzahl und Preis in Cent.');
    const active = data.active === false ? 0 : 1;
    if (Object.hasOwn(data, 'isRequired') && typeof data.isRequired !== 'boolean') fail(400, 'Bitte prüfe die Einstellung für das Pflichtpaket.', 'invalid_required_package');
    const required = Object.hasOwn(data, 'isRequired') ? Number(data.isRequired) : previous?.is_required || 0;
    const packageFeatures = await optionalSchema(env); const ready = packageFeatures.requiredPackages;
    if (required && !ready) fail(503, 'Bitte führe zuerst die Datenbank-Erweiterung für Pflichtpakete aus.', 'migration_required');
    if (required && !active) fail(400, 'Ein Pflichtpaket muss aktiv sein. Entferne zuerst die Pflicht-Auswahl.', 'invalid_required_package');
    await env.DB.batch([
      ...(ready && required ? [statement(env, 'UPDATE packages SET is_required=0 WHERE gallery_id=? AND id<>?', gallery.id, packageId)] : []),
      statement(env, `INSERT INTO packages(id,gallery_id,name,image_count,price_cents,currency,active${ready ? ',is_required' : ''}${packageFeatures.packageOrder ? ',position' : ''}) VALUES(?,?,?,?,?,?,?${ready ? ',?' : ''}${packageFeatures.packageOrder ? ',(SELECT COALESCE(MAX(position),-1)+1 FROM packages WHERE gallery_id=?)' : ''}) ON CONFLICT(id) DO UPDATE SET name=excluded.name,image_count=excluded.image_count,price_cents=excluded.price_cents,active=excluded.active${ready ? ',is_required=excluded.is_required' : ''}`, packageId, gallery.id, name, count, price, 'EUR', active, ...(ready ? [required] : []), ...(packageFeatures.packageOrder ? [gallery.id] : [])),
    ]);
    await audit(env, user.id, 'package_updated', packageId);
    return json({ package: packageJson(await first(env, 'SELECT * FROM packages WHERE id=?', packageId)) }, request.method === 'POST' ? 201 : 200);
  }
  if (action === 'release' && request.method === 'DELETE') {
    if (!(await optionalSchema(env)).imageControls) fail(503, 'Bitte führe zuerst die neue Datenbank-Erweiterung aus.', 'migration_required');
    const data = await body(request); const memberId = textField(data.userId, 80);
    if (!await first(env, "SELECT 1 AS ok FROM gallery_members m JOIN users u ON u.id=m.user_id WHERE m.gallery_id=? AND m.user_id=? AND u.role='customer' AND u.disabled=0", gallery.id, memberId)) fail(400, 'Der Kunde gehört nicht zu dieser Galerie.');
    const selected = data.all === true ? (await all(env, 'SELECT id FROM images WHERE gallery_id=?', gallery.id)).map(row => row.id) : ids(data.imageIds);
    if (data.all !== true) await selectedImages(env, gallery.id, selected);
    if (!selected.length) fail(400, 'Bitte wähle mindestens ein Bild.');
    const selection = JSON.stringify(selected);
    const features = await optionalSchema(env);
    await env.DB.batch([
      statement(env, 'INSERT INTO image_download_blocks(user_id,image_id,blocked_at,blocked_by) SELECT ?,selected.value,?,? FROM json_each(?) selected WHERE 1 ON CONFLICT(user_id,image_id) DO UPDATE SET blocked_at=excluded.blocked_at,blocked_by=excluded.blocked_by', memberId, Date.now(), user.id, selection),
      statement(env, 'DELETE FROM manual_releases WHERE user_id=? AND image_id IN (SELECT value FROM json_each(?))', memberId, selection),
      ...(features.notifications ? [statement(env, 'UPDATE download_notifications SET cancelled_at=?,lease_at=NULL WHERE user_id=? AND gallery_id=? AND sent_at IS NULL AND cancelled_at IS NULL AND EXISTS(SELECT 1 FROM json_each(download_notifications.image_ids_json) notified JOIN json_each(?) selected ON selected.value=notified.value)', Date.now(), memberId, gallery.id, selection)] : []),
      statement(env, 'INSERT INTO audit_events(id,user_id,action,target_id,created_at) VALUES(?,?,?,?,?)', id(), user.id, 'downloads_revoked', gallery.id, Date.now()),
    ]);
    return json({ ok: true });
  }
  if (action === 'release' && request.method === 'POST') {
    const data = await body(request); const memberId = textField(data.userId, 80);
    if (!await first(env, "SELECT 1 AS ok FROM gallery_members m JOIN users u ON u.id=m.user_id WHERE m.gallery_id=? AND m.user_id=? AND u.role='customer' AND u.disabled=0", gallery.id, memberId)) fail(400, 'Der Kunde gehört nicht zu dieser Galerie.');
    const features = await optionalSchema(env);
    if (data.all === true) {
      await env.DB.batch([
        ...(features.notifications ? [queueGrantNotification(env, features, { galleryId: gallery.id, userId: memberId })] : []),
        ...(features.imageControls ? [statement(env, 'DELETE FROM image_download_blocks WHERE user_id=? AND image_id IN (SELECT id FROM images WHERE gallery_id=?)', memberId, gallery.id)] : []),
        statement(env, 'INSERT OR IGNORE INTO manual_releases(user_id,image_id,released_at,released_by) SELECT ?,i.id,?,? FROM images i WHERE i.gallery_id=?', memberId, Date.now(), user.id, gallery.id),
      ]);
    } else {
      const selected = ids(data.imageIds);
      await selectedImages(env, gallery.id, selected);
      if (selected.length) await env.DB.batch([
        ...(features.notifications ? [queueGrantNotification(env, features, { galleryId: gallery.id, userId: memberId, imageIds: selected })] : []),
        ...(features.imageControls ? [statement(env, 'DELETE FROM image_download_blocks WHERE user_id=? AND image_id IN (SELECT value FROM json_each(?))', memberId, JSON.stringify(selected))] : []),
        statement(env, 'INSERT OR IGNORE INTO manual_releases(user_id,image_id,released_at,released_by) SELECT ?,selected.value,?,? FROM json_each(?) selected', memberId, Date.now(), user.id, JSON.stringify(selected)),
      ]);
    }
    await audit(env, user.id, 'downloads_released', gallery.id); return json({ ok: true, notification: await deliverNotifications(env, { galleryId: gallery.id }) });
  }
  if (action === 'invite' && request.method === 'POST') {
    const data = await body(request); const email = normalizeEmail(data.email);
    const member = await first(env, 'SELECT u.* FROM users u JOIN gallery_members m ON m.user_id=u.id WHERE m.gallery_id=? AND u.email=? AND u.disabled=0', gallery.id, email);
    if (!member) fail(404, 'Der Kunde wurde dieser Galerie noch nicht zugeordnet.');
    if (!gallery.published || (gallery.expires_at && gallery.expires_at <= Date.now())) fail(409, 'Bitte veröffentliche zuerst die Galerie und prüfe das Ablaufdatum.');
    await rate(env, `invite:${member.id}`, 5, 60 * 60_000);
    if (!member.password_hash) await issueAuthToken(env, member, 'setup', gallery);
    else await mail(env, { to: member.email, ...await renderConfiguredEmail(env, { kind: 'invite', requiresFinalDelivery: Boolean(gallery.require_final_delivery), customerName: member.name, galleryName: gallery.name, galleryUrl: successUrl(env, `?gallery=${gallery.id}`), businessName: businessContact(env).name }) });
    await audit(env, user.id, 'gallery_invitation_sent', gallery.id); return json({ ok: true });
  }
  fail(405, 'Diese Aktion ist nicht verfügbar.');
}

async function api(request, env, path, context) {
  if (path === '/session' && request.method === 'GET') {
    const user = configured(env) ? await session(request, env) : null;
    return json({ user: publicUser(user), csrf: user?.csrf || null, capabilities: capabilities(env) });
  }
  if (!configured(env)) fail(503, 'Das private Kundenportal ist noch nicht mit dem Server verbunden.', 'not_configured');
  if (path === '/payments/stripe/webhook' && request.method === 'POST') return stripeWebhook(request, env);
  if (['/auth/login', '/auth/request', '/auth/complete'].includes(path) && request.method === 'POST') return auth(request, env, path, context);
  const mutate = !['GET', 'HEAD'].includes(request.method);
  const user = await requireUser(request, env, mutate, path.startsWith('/admin/'));
  if (path === '/auth/logout' && request.method === 'POST') {
    await run(env, 'DELETE FROM sessions WHERE token_hash=?', user.token_hash);
    return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie('', env, 0) });
  }
  if (path.startsWith('/admin/')) return admin(request, env, path, user);
  if (path === '/galleries' && request.method === 'GET') return json(await listGalleries(env, user));
  const gallery = path.match(/^\/galleries\/([\w-]+)$/);
  if (gallery && request.method === 'GET') return json(await galleryDetail(env, gallery[1], user, user.role === 'admin' && new URL(request.url).searchParams.get('customerView') === '1'));
  const invoice = path.match(/^\/galleries\/([\w-]+)\/invoice$/);
  if (invoice && ['GET', 'HEAD'].includes(request.method)) {
    await galleryAccess(env, invoice[1], user);
    if (!(await optionalSchema(env)).invoices) fail(404, 'Für diese Galerie ist keine Rechnung hinterlegt.');
    const requestedUser = new URL(request.url).searchParams.get('userId');
    if (user.role !== 'admin' && requestedUser && requestedUser !== user.id) fail(403, 'Für diese Rechnung fehlt die Berechtigung.');
    const memberId = user.role === 'admin' ? textField(requestedUser, 80) : user.id;
    const document = user.role === 'admin'
      ? await first(env, 'SELECT * FROM gallery_invoices WHERE gallery_id=? AND user_id=?', invoice[1], memberId)
      : await first(env, 'SELECT v.* FROM gallery_invoices v JOIN gallery_members m ON m.gallery_id=v.gallery_id AND m.user_id=v.user_id WHERE v.gallery_id=? AND v.user_id=?', invoice[1], memberId);
    if (!document) fail(404, 'Für diese Galerie ist keine Rechnung hinterlegt.');
    const object = await env.PHOTOS.get(document.r2_key);
    if (!object) fail(404, 'Die Rechnung ist gerade nicht verfügbar.');
    return new Response(request.method === 'HEAD' ? null : object.body, { headers: { 'Content-Type': 'application/pdf', 'Content-Length': String(object.size), 'Content-Disposition': `attachment; filename="Rechnung.pdf"; filename*=UTF-8''${encodeURIComponent(document.filename)}` } });
  }
  const favorites = path.match(/^\/galleries\/([\w-]+)\/favorites$/);
  if (favorites && request.method === 'PUT') {
    await galleryAccess(env, favorites[1], user);
    if (user.role !== 'admin') await rate(env, `favorites:${user.id}`, 120, 60_000);
    const data = await body(request); const selected = ids(data.imageIds);
    await selectedImages(env, favorites[1], selected);
    const activity = user.role !== 'admin' && (await optionalSchema(env)).studio;
    await env.DB.batch([
      // Compare against the current selection inside the same transaction. Retried
      // identical requests create no duplicate notifications or extra activity.
      ...(activity ? [
        statement(env, "INSERT INTO customer_activity(id,kind,user_id,gallery_id,image_id,created_at) SELECT lower(hex(randomblob(16))),'favorite_added',?,?,selected.value,? FROM json_each(?) selected WHERE NOT EXISTS(SELECT 1 FROM favorites f WHERE f.user_id=? AND f.image_id=selected.value)", user.id, favorites[1], Date.now(), JSON.stringify(selected), user.id),
        statement(env, "INSERT INTO customer_activity(id,kind,user_id,gallery_id,image_id,created_at) SELECT lower(hex(randomblob(16))),'favorite_removed',?,?,f.image_id,? FROM favorites f JOIN images i ON i.id=f.image_id WHERE f.user_id=? AND i.gallery_id=? AND f.image_id NOT IN (SELECT value FROM json_each(?))", user.id, favorites[1], Date.now(), user.id, favorites[1], JSON.stringify(selected)),
        statement(env, 'DELETE FROM customer_activity WHERE created_at<?', Date.now() - 90 * DAY),
      ] : []),
      statement(env, 'DELETE FROM favorites WHERE user_id=? AND image_id IN (SELECT id FROM images WHERE gallery_id=?)', user.id, favorites[1]),
      statement(env, 'INSERT INTO favorites(user_id,image_id) SELECT ?,selected.value FROM json_each(?) selected', user.id, JSON.stringify(selected)),
    ]);
    return json({ favorites: selected });
  }
  const image = path.match(/^\/images\/([\w-]+)$/);
  if (image && ['GET', 'HEAD'].includes(request.method)) return serveImage(request, env, image[1], user);
  if (path === '/orders' && request.method === 'POST') return createOrder(request, env, user);
  if (path === '/orders' && request.method === 'GET') return json(await listOrders(env, user));
  const orderInvoiceRoute = path.match(/^\/orders\/([\w-]+)\/invoice$/);
  if (orderInvoiceRoute && ['GET', 'HEAD'].includes(request.method)) {
    const order = await getOrder(env, orderInvoiceRoute[1]);
    if (!order || (user.role !== 'admin' && order.user_id !== user.id)) fail(404, 'Die Bestellung wurde nicht gefunden.');
    const invoice = orderInvoice(order);
    if (!invoice) fail(404, 'Für diese Bestellung wurde keine Rechnung hinterlegt.');
    const object = await env.PHOTOS.get(invoice.key);
    if (!object) fail(404, 'Die Rechnung ist gerade nicht verfügbar.');
    return new Response(request.method === 'HEAD' ? null : object.body, { headers: { 'Content-Type': 'application/pdf', 'Content-Length': String(object.size), 'Content-Disposition': `attachment; filename="Rechnung.pdf"; filename*=UTF-8''${encodeURIComponent(invoice.filename)}` } });
  }
  const receipt = path.match(/^\/orders\/([\w-]+)\/receipt$/);
  if (receipt && request.method === 'GET') {
    const order = await getOrder(env, receipt[1]);
    if (!order || (user.role !== 'admin' && order.user_id !== user.id)) fail(404, 'Die Bestellung wurde nicht gefunden.');
    if (!order.receipt_text) fail(409, 'Die Vertragsbestätigung wurde noch nicht erstellt.');
    const document = renderPortalDocument({ receiptText: order.receipt_text, orderId: order.id });
    return new Response(document.html, { headers: { 'Content-Type': document.contentType, 'Content-Disposition': `attachment; filename="${document.filename}"`, 'Content-Security-Policy': "default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" } });
  }
  const withdrawal = path.match(/^\/orders\/([\w-]+)\/withdraw$/);
  if (withdrawal && request.method === 'POST') {
    const order = await getOrder(env, withdrawal[1]);
    if (!order || order.user_id !== user.id) fail(404, 'Die Bestellung wurde nicht gefunden.');
    const data = await body(request);
    if (data.confirmed !== true) fail(400, 'Bitte bestätige, dass du den Rücktritt erklären möchtest.');
    if (!['pending', 'paid'].includes(order.status)) fail(409, 'Für diese Bestellung ist kein weiterer Rücktritt erforderlich.');
    const receivedAt = order.withdrawal_requested_at || Date.now();
    await run(env, `UPDATE orders SET withdrawal_requested_at=COALESCE(withdrawal_requested_at,?) WHERE id=? AND ${await liveOrder(env)}`, receivedAt, order.id);
    const contact = businessContact(env);
    const notice = `Deine Rücktrittserklärung zur Bestellung ${order.id} ist am ${new Date(receivedAt).toISOString()} eingegangen. Sie wird von Emina geprüft. Dies ist eine Eingangsbestätigung, noch keine Bestätigung einer Erstattung. Falls digitale Inhalte bereits mit deiner ausdrücklichen Zustimmung und nach Vertragsbestätigung bereitgestellt wurden, kann das Rücktrittsrecht bereits erloschen sein. Bei Fragen: ${contact.email}`;
    if (!await getOrder(env, order.id)) fail(404, 'Die Bestellung wurde nicht gefunden.');
    if (!order.withdrawal_acknowledged_at) {
      const details = { notice, customerName: order.customer_name, customerEmail: order.customer_email, galleryName: order.gallery_name, orderId: order.id, paymentReference: orderReference(order), actionUrl: successUrl(env, `?gallery=${order.gallery_id}&order=${order.id}`) };
      await mail(env, { to: order.customer_email, ...renderWithdrawalEmail(details), idempotencyKey: `withdrawal-customer/${order.id}` });
      await mail(env, { to: contact.email, ...renderWithdrawalEmail({ ...details, admin: true }), idempotencyKey: `withdrawal-admin/${order.id}` });
      await run(env, `UPDATE orders SET withdrawal_acknowledged_at=? WHERE id=? AND ${await liveOrder(env)}`, Date.now(), order.id);
    }
    await audit(env, user.id, 'withdrawal_requested', order.id);
    return json({ ok: true, message: notice, order: await orderJson(env, await getOrder(env, order.id)) });
  }
  const capture = path.match(/^\/orders\/([\w-]+)\/capture$/);
  if (capture && request.method === 'POST') return capturePayPal(request, env, user, capture[1]);
  fail(404, 'Diese Funktion wurde nicht gefunden.');
}

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url); const isApi = url.pathname.startsWith('/api/');
    try {
      // Accept the configured host only: recovery-email targets never use request Host.
      if (portalOrigin(env) && url.origin !== portalOrigin(env)) fail(403, 'Dieses Portal ist unter einer anderen Adresse eingerichtet.', 'invalid_host');
      if (isApi) return secure(await api(request, env, url.pathname.slice(4), context), true, env);
      if (!env.ASSETS) return secure(json({ error: 'Die Portal-Oberfläche ist noch nicht eingerichtet.', code: 'assets_not_configured' }, 503), false, env);
      return secure(await env.ASSETS.fetch(request), false, env);
    } catch (error) {
      // Provider response bodies, customer data, passwords and tokens never reach logs.
      if (!(error instanceof ApiError)) console.error('portal_request_failed', { path: url.pathname, kind: error?.name || 'Error' });
      return secure(json({ error: error instanceof ApiError ? error.message : 'Die Anfrage konnte gerade nicht abgeschlossen werden. Bitte versuche es später erneut.', code: error instanceof ApiError ? error.code : 'internal_error' }, error instanceof ApiError ? error.status : 500), isApi, env);
    }
  },
  async scheduled(controller, env) {
    if (!env.DB) return;
    const now = Date.now();
    await env.DB.batch([
      statement(env, 'DELETE FROM sessions WHERE expires_at<=?', now),
      statement(env, 'DELETE FROM auth_tokens WHERE expires_at<=?', now),
      statement(env, 'DELETE FROM rate_limits WHERE reset_at<?', now - DAY),
      ...((await optionalSchema(env)).studio ? [statement(env, 'DELETE FROM customer_activity WHERE created_at<?', now - 90 * DAY)] : []),
    ]);
    // Delivery retries are durable and do not change completed grants or payments.
    if (configured(env)) {
      const unpaidReceipts = await all(env, `SELECT id FROM orders WHERE status='paid' AND receipt_sent_at IS NULL AND ${await liveOrder(env)} ORDER BY paid_at LIMIT 1`);
      for (const order of unpaidReceipts) { try { await ensureReceipt(env, order.id); } catch {} }
      const features = await optionalSchema(env);
      if (features.finalDelivery && features.notifications) {
        const readyOrders = await all(env, `SELECT o.id,o.user_id,o.gallery_id FROM orders o JOIN galleries g ON g.id=o.gallery_id WHERE g.require_final_delivery=1 AND g.published=1 AND ${features.galleryDeletion ? 'g.deleted_at IS NULL' : '1=1'} AND o.status='paid' AND o.receipt_sent_at IS NOT NULL AND ${await liveOrder(env, 'o')} AND ${finalOrderCondition(features)} AND NOT EXISTS(SELECT 1 FROM download_notifications n WHERE n.order_id=o.id) ORDER BY o.paid_at LIMIT 3`);
        if (readyOrders.length) await env.DB.batch(readyOrders.map(order => queueGrantNotification(env, features, { galleryId: order.gallery_id, userId: order.user_id, orderId: order.id, finalTransition: true })));
      }
      await deliverNotifications(env);
    }
  },
};
