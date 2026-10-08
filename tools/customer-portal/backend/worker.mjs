/** LiZa Memories private photo portal. No customer data is stored in public assets. */
const encoder = new TextEncoder();
const DAY = 86_400_000;
const AUTH_MESSAGE = 'Wenn ein Zugang hinterlegt ist, erhältst du eine E-Mail mit den nächsten Schritten.';
const COOKIE = '__Host-liza_session';
const LOCAL_COOKIE = 'liza_session_local';
const TERMS_VERSION = 'portal-digital-2026-10-07';
const JSON_LIMIT = 32_768;
const MAX_IMAGES = 500;
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
async function body(request) {
  if (!(request.headers.get('content-type') || '').includes('application/json')) fail(415, 'JSON ist erforderlich.', 'invalid_content_type');
  if (Number(request.headers.get('content-length') || 0) > JSON_LIMIT) fail(413, 'Die Anfrage ist zu groß.');
  const raw = await readLimited(request, JSON_LIMIT);
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
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [message.to], subject: message.subject, html: message.html, text: message.text }),
  });
  if (!result.ok) fail(503, 'Die E-Mail konnte gerade nicht verschickt werden. Bitte versuche es später erneut.', 'email_delivery_failed');
}
async function issueAuthToken(env, user, purpose) {
  const token = randomToken(); const now = Date.now();
  await env.DB.batch([
    statement(env, 'DELETE FROM auth_tokens WHERE user_id=?', user.id),
    statement(env, 'INSERT INTO auth_tokens(token_hash,user_id,purpose,expires_at,created_at) VALUES(?,?,?,?,?)', await sha256(token), user.id, purpose, now + 30 * 60_000, now),
  ]);
  const url = `${portalOrigin(env)}${portalPath(env)}?token=${token}&purpose=${purpose}`;
  const label = purpose === 'setup' ? 'Deinen Galerie-Zugang einrichten' : 'Dein Passwort zurücksetzen';
  const text = `Hallo ${user.name},\n\n${label}:\n${url}\n\nDer Link ist 30 Minuten gültig und kann einmal verwendet werden. Falls du diese Nachricht nicht erwartet hast, kannst du sie ignorieren. Dein bisheriger Zugang bleibt bis zur erfolgreichen Änderung unverändert.\n\nEmina\nLiZa Memories Photography`;
  try { await mail(env, { to: user.email, subject: `${label} · LiZa Memories Photography`, text, html: `<p>Hallo ${escapeHtml(user.name)},</p><p><a href="${escapeHtml(url)}">${label}</a></p><p>Der Link ist 30 Minuten gültig und kann einmal verwendet werden. Falls du diese Nachricht nicht erwartet hast, kannst du sie ignorieren.</p><p>Emina<br>LiZa Memories Photography</p>` }); }
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
      const delivery = issueAuthToken(env, user, purpose).catch(error => {
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
    return json({ user: publicUser(user), csrf: created.csrf, capabilities: capabilities(env) }, 200, { 'Set-Cookie': sessionCookie(created.token, env) });
  }
  fail(404, 'Diese Funktion wurde nicht gefunden.');
}

async function galleryAccess(env, galleryId, user) {
  const gallery = await first(env, 'SELECT * FROM galleries WHERE id=?', galleryId);
  if (!gallery) fail(404, 'Die Galerie wurde nicht gefunden.', 'gallery_not_found');
  if (user.role !== 'admin') {
    if (!gallery.published || (gallery.expires_at && gallery.expires_at <= Date.now())) fail(404, 'Die Galerie ist derzeit nicht verfügbar.', 'gallery_not_found');
    const member = await first(env, 'SELECT 1 AS ok FROM gallery_members WHERE gallery_id=? AND user_id=?', galleryId, user.id);
    if (!member) fail(404, 'Die Galerie wurde nicht gefunden.', 'gallery_not_found');
  }
  return gallery;
}
function galleryJson(gallery) {
  return { id: gallery.id, name: gallery.name, date: gallery.shooting_date, description: gallery.description, shootingType: gallery.shooting_type || 'other', pricingMode: gallery.pricing_mode || 'gallery', theme: gallery.theme || 'warm', gridLayout: gallery.grid_layout || 'masonry', coverPosition: gallery.cover_position ?? 50, published: Boolean(gallery.published), expiresAt: gallery.expires_at ? new Date(gallery.expires_at).toISOString() : null, coverImageId: gallery.cover_image_id, coverUrl: gallery.cover_image_id ? `/api/images/${gallery.cover_image_id}?kind=preview` : null, imageCount: gallery.image_count ?? undefined };
}
function packageJson(pack) { return { id: pack.id, galleryId: pack.gallery_id, name: pack.name, imageCount: pack.image_count, priceCents: pack.price_cents, currency: pack.currency, active: Boolean(pack.active) }; }
function imageJson(image, allowed = false) {
  return { id: image.id, galleryId: image.gallery_id, title: image.title, width: image.width, height: image.height, position: image.position, previewUrl: `/api/images/${image.id}?kind=preview`, originalUrl: `/api/images/${image.id}?kind=original`, downloadAllowed: Boolean(allowed) };
}
async function selectedImages(env, galleryId, selected) {
  ids(selected);
  if (!selected.length) return [];
  const found = await all(env, 'SELECT i.* FROM images i JOIN json_each(?) selected ON selected.value=i.id WHERE i.gallery_id=?', JSON.stringify(selected), galleryId);
  if (found.length !== selected.length) fail(400, 'Die Auswahl enthält Bilder außerhalb dieser Galerie.', 'invalid_selection');
  return found;
}
async function releasedIds(env, userId, galleryId) {
  const rows = await all(env, "SELECT i.id FROM images i WHERE i.gallery_id=? AND (EXISTS(SELECT 1 FROM manual_releases r WHERE r.image_id=i.id AND r.user_id=?) OR EXISTS(SELECT 1 FROM order_images oi JOIN orders o ON o.id=oi.order_id WHERE oi.image_id=i.id AND o.user_id=? AND o.status='paid' AND o.receipt_sent_at IS NOT NULL))", galleryId, userId, userId);
  return new Set(rows.map(x => x.id));
}
async function imageReleased(env, userId, imageId) {
  const result = await first(env, "SELECT 1 AS allowed WHERE EXISTS(SELECT 1 FROM manual_releases WHERE user_id=? AND image_id=?) OR EXISTS(SELECT 1 FROM order_images oi JOIN orders o ON o.id=oi.order_id WHERE oi.image_id=? AND o.user_id=? AND o.status='paid' AND o.receipt_sent_at IS NOT NULL)", userId, imageId, imageId, userId);
  return Boolean(result);
}
async function galleryDetail(env, galleryId, user) {
  const gallery = await galleryAccess(env, galleryId, user);
  const [images, packages, favorites, released] = await Promise.all([
    all(env, 'SELECT * FROM images WHERE gallery_id=? ORDER BY position,created_at,id', galleryId),
    user.role === 'admin'
      ? all(env, 'SELECT * FROM packages WHERE gallery_id=? ORDER BY active DESC,image_count,price_cents', galleryId)
      : all(env, 'SELECT * FROM packages WHERE gallery_id=? AND active=1 AND (?=? OR image_count=0) ORDER BY image_count,price_cents', galleryId, gallery.pricing_mode, 'images'),
    all(env, 'SELECT f.image_id FROM favorites f JOIN images i ON i.id=f.image_id WHERE f.user_id=? AND i.gallery_id=?', user.id, galleryId),
    releasedIds(env, user.id, galleryId),
  ]);
  const members = user.role === 'admin' ? await all(env, 'SELECT u.id,u.email,u.name FROM gallery_members m JOIN users u ON u.id=m.user_id WHERE m.gallery_id=? ORDER BY u.name', galleryId) : undefined;
  return { gallery: galleryJson({ ...gallery, image_count: images.length }), images: images.map(x => imageJson(x, user.role === 'admin' || released.has(x.id))), packages: packages.map(packageJson), favorites: favorites.map(x => x.image_id), ...(members ? { members } : {}) };
}
async function listGalleries(env, user) {
  const rows = user.role === 'admin'
    ? await all(env, 'SELECT g.*,(SELECT COUNT(*) FROM images i WHERE i.gallery_id=g.id) AS image_count FROM galleries g ORDER BY g.created_at DESC')
    : await all(env, 'SELECT g.*,(SELECT COUNT(*) FROM images i WHERE i.gallery_id=g.id) AS image_count FROM galleries g JOIN gallery_members m ON m.gallery_id=g.id WHERE m.user_id=? AND g.published=1 AND (g.expires_at IS NULL OR g.expires_at>?) ORDER BY g.shooting_date DESC', user.id, Date.now());
  return { galleries: rows.map(galleryJson) };
}
async function serveImage(request, env, imageId, user) {
  const image = await first(env, 'SELECT * FROM images WHERE id=?', imageId);
  if (!image) fail(404, 'Das Bild wurde nicht gefunden.');
  await galleryAccess(env, image.gallery_id, user);
  const kind = new URL(request.url).searchParams.get('kind') || 'preview';
  if (!['preview', 'original'].includes(kind)) fail(400, 'Unbekannte Bildversion.');
  if (kind === 'original' && user.role !== 'admin' && !await imageReleased(env, user.id, image.id)) fail(403, 'Dieses Bild ist noch nicht zum Download freigegeben.', 'download_not_released');
  const object = await env.PHOTOS.get(kind === 'preview' ? image.preview_key : image.original_key);
  if (!object) fail(404, 'Die Bilddatei ist nicht verfügbar.');
  const type = kind === 'preview' ? image.preview_type : image.original_type;
  const headers = new Headers({ 'Content-Type': type, 'Cache-Control': 'private, no-store, max-age=0' });
  if (object.size !== undefined) headers.set('Content-Length', String(object.size));
  if (kind === 'original') {
    const extension = type === 'image/jpeg' ? 'jpg' : type === 'image/png' ? 'png' : 'webp';
    const filename = `${image.title.replace(/[\\/\r\n"<>:|?*]/g, '_').slice(0, 100) || 'LiZa-Memories'}-${image.id.slice(0, 8)}.${extension}`;
    headers.set('Content-Disposition', `attachment; filename="foto.${extension}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
  }
  return new Response(request.method === 'HEAD' ? null : object.body, { headers });
}
async function orderJson(env, order) {
  const imageIds = order.image_ids_json === undefined
    ? (await all(env, 'SELECT image_id FROM order_images WHERE order_id=? ORDER BY image_id', order.id)).map(x => x.image_id)
    : JSON.parse(order.image_ids_json);
  return { id: order.id, userId: order.user_id, galleryId: order.gallery_id, galleryName: order.gallery_name, customerName: order.customer_name, customerEmail: order.customer_email, packageId: order.package_id, packageName: order.package_name, packageQuantity: order.package_quantity || 1, imageIds, amountCents: order.amount_cents, currency: order.currency, status: order.status, paymentMethod: order.payment_method, paymentUrl: order.checkout_url || null, createdAt: new Date(order.created_at).toISOString(), paidAt: order.paid_at ? new Date(order.paid_at).toISOString() : null, receiptSent: Boolean(order.receipt_sent_at), receiptUrl: `/api/orders/${order.id}/receipt`, withdrawalRequested: Boolean(order.withdrawal_requested_at) };
}
async function getOrder(env, orderId) {
  return first(env, 'SELECT o.*,g.name AS gallery_name,u.name AS customer_name,u.email AS customer_email FROM orders o JOIN galleries g ON g.id=o.gallery_id JOIN users u ON u.id=o.user_id WHERE o.id=?', orderId);
}
async function listOrders(env, user, admin = false) {
  const rows = admin ? await all(env, "SELECT o.*,g.name AS gallery_name,u.name AS customer_name,u.email AS customer_email,(SELECT COALESCE(json_group_array(image_id),'[]') FROM order_images WHERE order_id=o.id) AS image_ids_json FROM orders o JOIN galleries g ON g.id=o.gallery_id JOIN users u ON u.id=o.user_id ORDER BY o.created_at DESC LIMIT 500")
    : await all(env, "SELECT o.*,g.name AS gallery_name,(SELECT COALESCE(json_group_array(image_id),'[]') FROM order_images WHERE order_id=o.id) AS image_ids_json FROM orders o JOIN galleries g ON g.id=o.gallery_id WHERE o.user_id=? ORDER BY o.created_at DESC LIMIT 100", user.id);
  return { orders: await Promise.all(rows.map(x => orderJson(env, x))) };
}
function successUrl(env, suffix) { return `${portalOrigin(env)}${portalPath(env)}${suffix}`; }
function businessContact(env) {
  return { name: env.BUSINESS_NAME || 'Emina Huremovic · LiZa Memories Photography', address: env.BUSINESS_ADDRESS || 'Mela-Spira-Straße 32b, 8054 Graz-Straßgang, Österreich', email: env.CONTACT_EMAIL || 'info@liza-memories-photography.com', phone: env.CONTACT_PHONE || '+43 681 819 427 80' };
}
async function baseOrderReceipt(env, order) {
  const contact = businessContact(env);
  const gallery = await first(env, 'SELECT expires_at FROM galleries WHERE id=?', order.gallery_id);
  const images = await all(env, 'SELECT i.id,i.title,i.original_type FROM images i JOIN order_images oi ON oi.image_id=i.id WHERE oi.order_id=? ORDER BY i.title,i.id', order.id);
  const expiryText = gallery.expires_at ? `Die Galerie ist bis ${new Date(gallery.expires_at).toLocaleDateString('de-AT', { timeZone: 'Europe/Vienna' })} erreichbar. Bitte sichere deine Downloads bis dahin.` : 'Bitte sichere heruntergeladene Fotos zusätzlich auf deinem eigenen Gerät.';
  return `BESTELLBESTÄTIGUNG\nLiZa Memories Photography\n\nBestellnummer: ${order.id}\nBestellt am: ${new Date(order.created_at).toISOString()}\nKunde: ${order.customer_name}\nE-Mail: ${order.customer_email}\nGalerie: ${order.gallery_name}\nPaket: ${order.package_name}\nBilder:\n${images.map(x => `- ${x.title} (${x.id})`).join('\n')}\nGesamtbetrag: ${(order.amount_cents / 100).toFixed(2)} EUR\nKeine Versandkosten. Umsatzsteuerfrei aufgrund der österreichischen Kleinunternehmerregelung.\nZahlungsart: ${order.payment_method === 'transfer' ? 'Banküberweisung' : order.payment_method === 'stripe' ? 'Karte über Stripe' : 'PayPal'}\n\nBESTELLBEDINGUNGEN (${order.terms_version})\nVertragspartner: ${contact.name}\n${contact.address}\nE-Mail: ${contact.email}\nTelefon: ${contact.phone}\n\nDu kaufst die oben ausgewählten digitalen Fotografien. Es werden keine Papierabzüge oder physischen Produkte geliefert. Die Dateien im hochgeladenen JPEG-, PNG- oder WebP-Format lassen sich auf gängigen aktuellen Geräten anzeigen, speichern und für eigene private Zwecke ausdrucken. Ein Internetzugang und ausreichend eigener Speicher sind nötig. Die Vorschau kann zum Schutz geringer aufgelöst oder mit einem Wasserzeichen versehen sein; geliefert wird die hinterlegte Originaldatei.\n\nMit dem zahlungspflichtigen Absenden wird die ausgewählte Bestellung zum angegebenen Gesamtpreis abgeschlossen. Der Betrag ist vor Bereitstellung zu zahlen. Bei Überweisung wird der Download nach Prüfung des Zahlungseingangs freigegeben. Bei bestätigter Onlinezahlung erfolgt die Freigabe automatisch, sobald diese Vertragsbestätigung per E-Mail versandt wurde. Es entstehen im Portal keine zusätzlichen Lieferkosten. ${expiryText}\n\nDie Fotos sind zur privaten Nutzung und zum privaten Ausdruck bestimmt. Eine kommerzielle Verwendung oder die Übertragung von Urheberrechten ist nicht Teil des Kaufs. Gesetzliche Gewährleistungsrechte bleiben bestehen. Bei fehlenden oder fehlerhaften Dateien kontaktiere bitte ${contact.email}. Es besteht keine wiederkehrende Zahlung und kein Abonnement.\n\nDEINE AUSDRÜCKLICHE ERKLÄRUNG ZUR DIGITALEN BEREITSTELLUNG\nDu hast beim Bestellen gesondert zugestimmt: Ich verlange die Bereitstellung der digitalen Fotos vor Ablauf der gesetzlichen Rücktrittsfrist und nehme zur Kenntnis, dass mein Rücktrittsrecht mit dem Beginn der Bereitstellung der digitalen Inhalte und nach Erhalt dieser Vertragsbestätigung erlischt. Die Erklärung wurde am ${new Date(order.consent_at).toISOString()} gespeichert.\n\nRÜCKTRITTSBELEHRUNG\nSolange die Voraussetzungen für den Verlust des Rücktrittsrechts nicht erfüllt sind, kannst du binnen 14 Tagen ab Vertragsabschluss ohne Angabe von Gründen zurücktreten. Sende dazu eine eindeutige Erklärung an ${contact.name}, ${contact.address}, ${contact.email}, oder verwende die Rücktrittsfunktion deiner Bestellung im Portal. Zur Fristwahrung genügt die rechtzeitige Absendung. Bereits geleistete Zahlungen werden bei einem wirksamen Rücktritt spätestens binnen 14 Tagen ab Eingang der Erklärung grundsätzlich mit demselben Zahlungsmittel erstattet; andere gesetzliche Ansprüche bleiben unberührt.\n\nMUSTER-RÜCKTRITTSFORMULAR\nAn: ${contact.name}, ${contact.address}, ${contact.email}\nHiermit trete ich vom Vertrag über die Bereitstellung der folgenden digitalen Fotos zurück: [Paket / Bestellung ${order.id}]\nBestellt am: [Datum]\nName: [Vor- und Nachname]\nAnschrift: [Anschrift]\nDatum: [Datum]\nUnterschrift: [nur bei Mitteilung auf Papier]\n\nBitte bewahre diese Bestätigung auf.\nEmina\nLiZa Memories Photography`;
}
async function orderReceipt(env, order) {
  const text = await baseOrderReceipt(env, order);
  if (order.payment_method !== 'transfer') return text;
  const bank = bankDetails(env);
  if (!bank) fail(503, 'Die Bankverbindung ist noch nicht vollständig eingerichtet.', 'payment_not_configured');
  const transferText = `\n\nÜBERWEISUNGSDATEN\nEmpfänger: ${bank.recipient}\nIBAN: ${bank.iban}\n${bank.bic ? `BIC: ${bank.bic}\n` : ''}Betrag: ${(order.amount_cents / 100).toFixed(2)} EUR\nZahlungsreferenz: ${order.id}\nBitte verwende diese Bestellnummer als Zahlungsreferenz. Der Download wird nach Prüfung des Zahlungseingangs freigegeben.`;
  return text.replace('\n\nBESTELLBEDINGUNGEN', `${transferText}\n\nBESTELLBEDINGUNGEN`);
}
async function ensureReceipt(env, orderId, resend = false) {
  const order = await getOrder(env, orderId);
  if (order.receipt_sent_at && !resend) return;
  let text = order.receipt_text || await orderReceipt(env, order);
  // Persist the immutable snapshot before mailing. Retry does not silently replace terms.
  if (!order.receipt_text) await run(env, 'UPDATE orders SET receipt_text=? WHERE id=? AND receipt_text IS NULL', text, order.id);
  // A concurrent request may have persisted the first snapshot; send that same text.
  text = (await first(env, 'SELECT receipt_text FROM orders WHERE id=?', order.id)).receipt_text;
  await mail(env, { to: order.customer_email, subject: `Deine Fotobestellung ${order.id.slice(0, 8)} · LiZa Memories Photography`, text, html: `<pre style="white-space:pre-wrap;font:16px/1.6 sans-serif">${escapeHtml(text)}</pre>`, idempotencyKey: `order-receipt/${order.id}${resend ? `/${id()}` : ''}` });
  await run(env, 'UPDATE orders SET receipt_sent_at=? WHERE id=?', Date.now(), order.id);
}
async function stripeCheckout(env, order, user, gallery) {
  const params = new URLSearchParams({ mode: 'payment', client_reference_id: order.id, customer_email: user.email, success_url: successUrl(env, `?gallery=${gallery.id}&payment=success`), cancel_url: successUrl(env, `?gallery=${gallery.id}&payment=cancelled`), 'metadata[order_id]': order.id, 'payment_intent_data[metadata][order_id]': order.id, 'line_items[0][price_data][currency]': 'eur', 'line_items[0][price_data][unit_amount]': String(order.amount_cents), 'line_items[0][price_data][product_data][name]': `${order.package_name} · ${gallery.name}`.slice(0, 180), 'line_items[0][quantity]': '1' });
  const result = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': `liza-order-${order.id}` }, body: params });
  if (!result.ok) fail(502, 'Die Kartenzahlung ist gerade nicht erreichbar. Es wurde kein Download freigegeben.', 'payment_provider_error');
  const data = await result.json();
  if (!data.id || !/^https:\/\/checkout\.stripe\.com\//.test(data.url || '')) fail(502, 'Die Zahlungsseite konnte nicht erstellt werden.');
  await run(env, 'UPDATE orders SET provider_reference=?,checkout_url=? WHERE id=? AND status=?', data.id, data.url, order.id, 'pending');
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
  await run(env, 'UPDATE orders SET provider_reference=?,checkout_url=? WHERE id=? AND status=?', data.id, link, order.id, 'pending');
  return link;
}
async function createOrder(request, env, user) {
  const data = await body(request);
  if (data.termsAccepted !== true || data.digitalConsent !== true) fail(400, 'Bitte bestätige die Bestellbedingungen und die sofortige digitale Bereitstellung.', 'order_consent_required');
  const gallery = await galleryAccess(env, textField(data.galleryId, 80), user);
  const pack = await first(env, 'SELECT * FROM packages WHERE id=? AND gallery_id=? AND active=1', textField(data.packageId, 80), gallery.id);
  if (!pack) fail(400, 'Dieses Paket ist nicht verfügbar.', 'package_not_found');
  if (gallery.pricing_mode !== 'images' && pack.image_count !== 0) fail(400, 'Für diese Galerie wird der vereinbarte Gesamtbetrag verwendet.', 'invalid_pricing_mode');
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
  if (pack.image_count === 0 ? selected.length !== available.count : selected.length % pack.image_count !== 0) fail(400, `Bitte wähle ${pack.image_count || available.count} Bilder${pack.image_count ? ' oder ein Vielfaches davon' : ''} für dieses Paket aus.`, 'package_image_count');
  const quantity = pack.image_count ? selected.length / pack.image_count : 1;
  const amountCents = pack.price_cents * quantity;
  if (!Number.isSafeInteger(amountCents) || amountCents > 1_000_000) fail(400, 'Bitte frage für diese große Bestellung direkt bei Emina an.', 'order_amount_limit');
  const packageName = quantity > 1 ? `${quantity} × ${pack.name}` : pack.name;
  const method = data.paymentMethod;
  if (!['transfer', 'stripe', 'paypal'].includes(method)) fail(400, 'Bitte wähle eine Zahlungsart.');
  const caps = capabilities(env);
  if (!(method === 'transfer' ? caps.transferConfigured : caps[method])) fail(503, 'Diese Zahlungsart ist noch nicht eingerichtet.', 'payment_not_configured');
  if (!caps.email) fail(503, 'Bestellungen sind erst möglich, wenn der E-Mail-Versand für die Vertragsbestätigung eingerichtet ist.', 'email_not_configured');
  await rate(env, `order:${user.id}`, 20, DAY);
  // A repeated click/retry for the identical unpaid selection reuses the order.
  let order;
  const existing = await all(env, "SELECT * FROM orders WHERE user_id=? AND gallery_id=? AND package_id=? AND payment_method=? AND status='pending' AND amount_cents=? ORDER BY created_at DESC LIMIT 20", user.id, gallery.id, pack.id, method, amountCents);
  for (const candidate of existing) {
    const oldImages = (await all(env, 'SELECT image_id FROM order_images WHERE order_id=? ORDER BY image_id', candidate.id)).map(x => x.image_id);
    if (JSON.stringify(oldImages) === JSON.stringify([...selected].sort())) { order = candidate; break; }
  }
  if (!order) {
    const pendingKey = await sha256(JSON.stringify([user.id, gallery.id, pack.id, method, amountCents, [...selected].sort()]));
    order = { id: id(), user_id: user.id, gallery_id: gallery.id, package_id: pack.id, package_name: packageName, package_quantity: quantity, amount_cents: amountCents, currency: 'EUR', status: 'pending', payment_method: method, created_at: Date.now() };
    await env.DB.batch([
      // A database-enforced unique selection protects retries across Worker instances.
      // Losing requests must not insert image rows for their discarded random order ID.
      statement(env, 'INSERT OR IGNORE INTO orders(id,user_id,gallery_id,package_id,package_name,package_quantity,amount_cents,currency,status,payment_method,terms_version,consent_at,created_at,pending_key) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)', order.id, user.id, gallery.id, pack.id, packageName, quantity, amountCents, 'EUR', 'pending', method, TERMS_VERSION, order.created_at, order.created_at, pendingKey),
      statement(env, 'INSERT OR IGNORE INTO order_images(order_id,image_id) SELECT ?,selected.value FROM json_each(?) selected WHERE EXISTS(SELECT 1 FROM orders WHERE id=?)', order.id, JSON.stringify(selected), order.id),
      statement(env, 'INSERT INTO audit_events(id,user_id,action,target_id,created_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM orders WHERE id=?)', id(), user.id, 'order_created', order.id, order.created_at, order.id),
    ]);
    order = await first(env, "SELECT * FROM orders WHERE pending_key=? AND status='pending'", pendingKey);
    if (!order) fail(409, 'Die Bestellung wurde gerade geändert. Bitte lade die Seite neu.', 'order_changed');
  }
  await ensureReceipt(env, order.id);
  let paymentUrl = order.checkout_url || null;
  if (!paymentUrl && method === 'stripe') paymentUrl = await stripeCheckout(env, order, user, gallery);
  if (!paymentUrl && method === 'paypal') paymentUrl = await paypalCheckout(env, order, gallery);
  return json({ order: await orderJson(env, await getOrder(env, order.id)), paymentUrl, ...(method === 'transfer' ? { transfer: caps.transfer, reference: order.id } : {}) }, 201);
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
  const order = payment?.metadata?.order_id ? await getOrder(env, payment.metadata.order_id) : null;
  if (!order || order.payment_method !== 'stripe' || order.provider_reference !== payment.id) fail(400, 'Die Bestellung konnte nicht zugeordnet werden.', 'invalid_webhook_order');
  const already = await first(env, 'SELECT id FROM payment_events WHERE id=?', `stripe:${event.id}`);
  if (already) return json({ received: true });
  if (event.type.includes('expired') || event.type.includes('failed')) {
    await env.DB.batch([
      statement(env, "UPDATE orders SET status='cancelled' WHERE id=? AND status='pending'", order.id),
      statement(env, 'INSERT OR IGNORE INTO payment_events(id,provider,order_id,created_at) VALUES(?,?,?,?)', `stripe:${event.id}`, 'stripe', order.id, Date.now()),
    ]);
    return json({ received: true });
  }
  if (payment.payment_status !== 'paid') return json({ received: true });
  if (payment.amount_total !== order.amount_cents || payment.currency !== 'eur' || payment.client_reference_id !== order.id) fail(400, 'Der Zahlungsbetrag stimmt nicht überein.', 'payment_amount_mismatch');
  await env.DB.batch([
    statement(env, "UPDATE orders SET status='paid',paid_at=COALESCE(paid_at,?) WHERE id=? AND status='pending'", Date.now(), order.id),
    statement(env, 'INSERT OR IGNORE INTO payment_events(id,provider,order_id,created_at) VALUES(?,?,?,?)', `stripe:${event.id}`, 'stripe', order.id, Date.now()),
    statement(env, 'INSERT INTO audit_events(id,user_id,action,target_id,created_at) VALUES(?,?,?,?,?)', id(), null, 'stripe_payment_confirmed', order.id, Date.now()),
  ]);
  return json({ received: true });
}
async function capturePayPal(request, env, user, orderId) {
  if (!capabilities(env).paypal) fail(503, 'PayPal ist noch nicht eingerichtet.');
  const order = await getOrder(env, orderId);
  if (!order || order.user_id !== user.id || order.payment_method !== 'paypal') fail(404, 'Die Bestellung wurde nicht gefunden.');
  await galleryAccess(env, order.gallery_id, user);
  if (order.status === 'paid') return json({ order: await orderJson(env, order) });
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
  await env.DB.batch([
    statement(env, "UPDATE orders SET status='paid',paid_at=COALESCE(paid_at,?) WHERE id=? AND status='pending'", Date.now(), order.id),
    statement(env, 'INSERT OR IGNORE INTO payment_events(id,provider,order_id,created_at) VALUES(?,?,?,?)', `paypal:${capture.id}`, 'paypal', order.id, Date.now()),
    statement(env, 'INSERT INTO audit_events(id,user_id,action,target_id,created_at) VALUES(?,?,?,?,?)', id(), user.id, 'paypal_payment_confirmed', order.id, Date.now()),
  ]);
  return json({ order: await orderJson(env, await getOrder(env, order.id)) });
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
function coverPosition(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) fail(400, 'Die Cover-Position muss zwischen 0 und 100 liegen.', 'invalid_gallery_settings');
  return value;
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
  if (length > 35 * 1024 * 1024) fail(413, 'Bitte lade Fotos unter 30 MB pro Original hoch.');
  if (!(request.headers.get('content-type') || '').startsWith('multipart/form-data')) fail(415, 'Bitte lade die Bilder als Dateien hoch.');
  const form = await request.formData(); const preview = form.get('preview'); const original = form.get('original');
  if (!preview || !original || typeof preview.stream !== 'function' || typeof original.stream !== 'function') fail(400, 'Vorschau und Originaldatei werden benötigt.');
  if (preview.size <= 0 || original.size <= 0 || preview.size > 4 * 1024 * 1024 || original.size > 30 * 1024 * 1024) fail(413, 'Vorschau maximal 4 MB, Original maximal 30 MB.');
  const [previewType, originalType] = await Promise.all([sniffImage(preview), sniffImage(original)]);
  const width = Number(form.get('width')); const height = Number(form.get('height'));
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 30000 || height > 30000) fail(400, 'Die Bildabmessungen fehlen.');
  const title = textField(form.get('title') || original.name || 'LiZa Memories', 150);
  const imageId = id(); const base = `galleries/${gallery.id}/${imageId}`;
  const previewKey = `${base}/preview`; const originalKey = `${base}/original`;
  try {
    await env.PHOTOS.put(previewKey, preview.stream(), { httpMetadata: { contentType: previewType } });
    await env.PHOTOS.put(originalKey, original.stream(), { httpMetadata: { contentType: originalType } });
    const count = await first(env, 'SELECT COALESCE(MAX(position),-1)+1 AS position FROM images WHERE gallery_id=?', gallery.id);
    await env.DB.batch([
      statement(env, 'INSERT INTO images(id,gallery_id,title,preview_key,original_key,preview_type,original_type,width,height,position,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)', imageId, gallery.id, title, previewKey, originalKey, previewType, originalType, width, height, count.position, Date.now()),
      statement(env, 'UPDATE galleries SET cover_image_id=COALESCE(cover_image_id,?),updated_at=? WHERE id=?', imageId, Date.now(), gallery.id),
      statement(env, 'INSERT INTO audit_events(id,user_id,action,target_id,created_at) VALUES(?,?,?,?,?)', id(), user.id, 'image_uploaded', imageId, Date.now()),
    ]);
    return json({ image: imageJson(await first(env, 'SELECT * FROM images WHERE id=?', imageId), true) }, 201);
  } catch (error) {
    await Promise.allSettled([env.PHOTOS.delete(previewKey), env.PHOTOS.delete(originalKey)]);
    throw error;
  }
}
async function admin(request, env, path, user) {
  if (path === '/admin/galleries' && request.method === 'GET') return json(await listGalleries(env, user));
  if (path === '/admin/orders' && request.method === 'GET') return json(await listOrders(env, user, true));
  const receipt = path.match(/^\/admin\/orders\/([\w-]+)\/receipt$/);
  if (receipt && request.method === 'POST') {
    if (!await getOrder(env, receipt[1])) fail(404, 'Die Bestellung wurde nicht gefunden.');
    await ensureReceipt(env, receipt[1], true);
    await audit(env, user.id, 'order_receipt_resent', receipt[1]);
    return json({ order: await orderJson(env, await getOrder(env, receipt[1])) });
  }
  const refunded = path.match(/^\/admin\/orders\/([\w-]+)\/refunded$/);
  if (refunded && request.method === 'POST') {
    const order = await getOrder(env, refunded[1]); if (!order) fail(404, 'Die Bestellung wurde nicht gefunden.');
    if (!['paid', 'refunded'].includes(order.status)) fail(409, 'Nur bezahlte Bestellungen können als erstattet markiert werden.');
    await run(env, "UPDATE orders SET status='refunded' WHERE id=?", order.id);
    await audit(env, user.id, 'refund_recorded_manual', order.id);
    return json({ order: await orderJson(env, await getOrder(env, order.id)) });
  }
  if (path === '/admin/galleries' && request.method === 'POST') {
    const data = await body(request); const galleryId = id(); const now = Date.now();
    const type = enumField(data.shootingType, SHOOTING_TYPES, 'other');
    const mode = enumField(data.pricingMode, ['images', 'gallery'], type === 'school' ? 'images' : 'gallery');
    const theme = enumField(data.theme, ['warm', 'light', 'dark'], 'warm');
    const grid = enumField(data.gridLayout, ['masonry', 'grid'], 'masonry');
    const position = coverPosition(data.coverPosition === undefined ? 50 : data.coverPosition);
    await env.DB.batch([
      statement(env, 'INSERT INTO galleries(id,name,shooting_date,description,published,expires_at,created_at,updated_at,shooting_type,pricing_mode,theme,grid_layout,cover_position) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)', galleryId, textField(data.name), shootingDate(data.date), textField(data.description, 2000, false), data.published === true ? 1 : 0, data.expiresAt ? expiry(data.expiresAt) : null, now, now, type, mode, theme, grid, position),
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
    await ensureReceipt(env, order.id);
    await env.DB.batch([
      statement(env, "UPDATE orders SET status='paid',paid_at=COALESCE(paid_at,?) WHERE id=? AND status='pending'", Date.now(), order.id),
      statement(env, 'INSERT INTO audit_events(id,user_id,action,target_id,created_at) VALUES(?,?,?,?,?)', id(), user.id, 'transfer_payment_confirmed', order.id, Date.now()),
    ]);
    return json({ order: await orderJson(env, await getOrder(env, order.id)) });
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
    const theme = enumField(data.theme, ['warm', 'light', 'dark'], gallery.theme || 'warm');
    const grid = enumField(data.gridLayout, ['masonry', 'grid'], gallery.grid_layout || 'masonry');
    const position = coverPosition(data.coverPosition === undefined ? gallery.cover_position ?? 50 : data.coverPosition);
    let coverId = gallery.cover_image_id;
    if (data.coverImageId !== undefined) {
      if (data.coverImageId !== null) await selectedImages(env, gallery.id, ids([data.coverImageId]));
      coverId = data.coverImageId;
    }
    await run(env, 'UPDATE galleries SET name=?,shooting_date=?,description=?,published=?,expires_at=?,cover_image_id=?,updated_at=?,shooting_type=?,pricing_mode=?,theme=?,grid_layout=?,cover_position=? WHERE id=?', name, date, description, published, expiresAt, coverId, Date.now(), type, mode, theme, grid, position, gallery.id);
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
    await run(env, 'DELETE FROM gallery_members WHERE gallery_id=? AND user_id=?', gallery.id, resourceId);
    await audit(env, user.id, 'gallery_member_removed', gallery.id); return json({ ok: true });
  }
  if (action === 'packages' && ['POST', 'PATCH'].includes(request.method)) {
    const data = await body(request); const packageId = resourceId || id();
    if (request.method === 'POST' && resourceId) fail(405, 'Zum Bearbeiten eines Pakets ist PATCH erforderlich.');
    if (request.method === 'PATCH' && (!resourceId || !await first(env, 'SELECT id FROM packages WHERE id=? AND gallery_id=?', resourceId, gallery.id))) fail(404, 'Dieses Paket wurde nicht gefunden.');
    const name = textField(data.name, 150); const count = Number(data.imageCount); const price = Number(data.priceCents);
    if (!Number.isSafeInteger(count) || count < 0 || count > MAX_IMAGES || !Number.isSafeInteger(price) || price < 1 || price > 1_000_000) fail(400, 'Bitte prüfe Bildanzahl und Preis in Cent.');
    const active = data.active === false ? 0 : 1;
    await run(env, 'INSERT INTO packages(id,gallery_id,name,image_count,price_cents,currency,active) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,image_count=excluded.image_count,price_cents=excluded.price_cents,active=excluded.active', packageId, gallery.id, name, count, price, 'EUR', active);
    await audit(env, user.id, 'package_updated', packageId);
    return json({ package: packageJson(await first(env, 'SELECT * FROM packages WHERE id=?', packageId)) }, request.method === 'POST' ? 201 : 200);
  }
  if (action === 'release' && request.method === 'POST') {
    const data = await body(request); const memberId = textField(data.userId, 80);
    if (!await first(env, 'SELECT 1 AS ok FROM gallery_members WHERE gallery_id=? AND user_id=?', gallery.id, memberId)) fail(400, 'Der Kunde gehört nicht zu dieser Galerie.');
    if (data.all === true) {
      await run(env, 'INSERT OR IGNORE INTO manual_releases(user_id,image_id,released_at,released_by) SELECT ?,i.id,?,? FROM images i WHERE i.gallery_id=?', memberId, Date.now(), user.id, gallery.id);
    } else {
      const selected = ids(data.imageIds);
      await selectedImages(env, gallery.id, selected);
      if (selected.length) await run(env, 'INSERT OR IGNORE INTO manual_releases(user_id,image_id,released_at,released_by) SELECT ?,selected.value,?,? FROM json_each(?) selected', memberId, Date.now(), user.id, JSON.stringify(selected));
    }
    await audit(env, user.id, 'downloads_released', gallery.id); return json({ ok: true });
  }
  if (action === 'invite' && request.method === 'POST') {
    const data = await body(request); const email = normalizeEmail(data.email);
    const member = await first(env, 'SELECT u.* FROM users u JOIN gallery_members m ON m.user_id=u.id WHERE m.gallery_id=? AND u.email=? AND u.disabled=0', gallery.id, email);
    if (!member) fail(404, 'Der Kunde wurde dieser Galerie noch nicht zugeordnet.');
    if (!gallery.published || (gallery.expires_at && gallery.expires_at <= Date.now())) fail(409, 'Bitte veröffentliche zuerst die Galerie und prüfe das Ablaufdatum.');
    await rate(env, `invite:${member.id}`, 5, 60 * 60_000);
    const url = successUrl(env, `?gallery=${gallery.id}`);
    const text = `Hallo ${member.name},\n\ndeine Bilder sind fertig! Deine Galerie „${gallery.name}“ wartet auf dich:\n${url}\n\nBeim ersten Besuch klickst du auf „Zugang einrichten“. Du erhältst einen Bestätigungslink an diese E-Mail-Adresse und kannst dein eigenes Passwort festlegen. Wenn du schon einen Zugang hast, verwende dein bestehendes Passwort.\n\nIch wünsche dir viel Freude mit deinen Erinnerungen!\nEmina\nLiZa Memories Photography`;
    await mail(env, { to: member.email, subject: `Deine Bilder sind fertig · ${gallery.name}`, text, html: `<p>Hallo ${escapeHtml(member.name)},</p><p>deine Bilder sind fertig!</p><p><a href="${escapeHtml(url)}">Deine Galerie „${escapeHtml(gallery.name)}“ öffnen</a></p><p>Beim ersten Besuch klickst du auf „Zugang einrichten“. Du erhältst einen Bestätigungslink und legst dein eigenes Passwort fest. Wenn du schon einen Zugang hast, verwende dein bestehendes Passwort.</p><p>Viel Freude mit deinen Erinnerungen!<br>Emina<br>LiZa Memories Photography</p>` });
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
  if (gallery && request.method === 'GET') return json(await galleryDetail(env, gallery[1], user));
  const favorites = path.match(/^\/galleries\/([\w-]+)\/favorites$/);
  if (favorites && request.method === 'PUT') {
    await galleryAccess(env, favorites[1], user);
    const data = await body(request); const selected = ids(data.imageIds);
    await selectedImages(env, favorites[1], selected);
    await env.DB.batch([
      statement(env, 'DELETE FROM favorites WHERE user_id=? AND image_id IN (SELECT id FROM images WHERE gallery_id=?)', user.id, favorites[1]),
      statement(env, 'INSERT INTO favorites(user_id,image_id) SELECT ?,selected.value FROM json_each(?) selected', user.id, JSON.stringify(selected)),
    ]);
    return json({ favorites: selected });
  }
  const image = path.match(/^\/images\/([\w-]+)$/);
  if (image && ['GET', 'HEAD'].includes(request.method)) return serveImage(request, env, image[1], user);
  if (path === '/orders' && request.method === 'POST') return createOrder(request, env, user);
  if (path === '/orders' && request.method === 'GET') return json(await listOrders(env, user));
  const receipt = path.match(/^\/orders\/([\w-]+)\/receipt$/);
  if (receipt && request.method === 'GET') {
    const order = await getOrder(env, receipt[1]);
    if (!order || (user.role !== 'admin' && order.user_id !== user.id)) fail(404, 'Die Bestellung wurde nicht gefunden.');
    if (!order.receipt_text) fail(409, 'Die Vertragsbestätigung wurde noch nicht erstellt.');
    return new Response(order.receipt_text, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': `attachment; filename="LiZa-Bestellung-${order.id}.txt"` } });
  }
  const withdrawal = path.match(/^\/orders\/([\w-]+)\/withdraw$/);
  if (withdrawal && request.method === 'POST') {
    const order = await getOrder(env, withdrawal[1]);
    if (!order || order.user_id !== user.id) fail(404, 'Die Bestellung wurde nicht gefunden.');
    const data = await body(request);
    if (data.confirmed !== true) fail(400, 'Bitte bestätige, dass du den Rücktritt erklären möchtest.');
    if (!['pending', 'paid'].includes(order.status)) fail(409, 'Für diese Bestellung ist kein weiterer Rücktritt erforderlich.');
    const receivedAt = order.withdrawal_requested_at || Date.now();
    await run(env, 'UPDATE orders SET withdrawal_requested_at=COALESCE(withdrawal_requested_at,?) WHERE id=?', receivedAt, order.id);
    const contact = businessContact(env);
    const notice = `Deine Rücktrittserklärung zur Bestellung ${order.id} ist am ${new Date(receivedAt).toISOString()} eingegangen. Sie wird von Emina geprüft. Dies ist eine Eingangsbestätigung, noch keine Bestätigung einer Erstattung. Falls digitale Inhalte bereits mit deiner ausdrücklichen Zustimmung und nach Vertragsbestätigung bereitgestellt wurden, kann das Rücktrittsrecht bereits erloschen sein. Bei Fragen: ${contact.email}`;
    if (!order.withdrawal_acknowledged_at) {
      await mail(env, { to: order.customer_email, subject: `Eingang deiner Rücktrittserklärung · ${order.id.slice(0, 8)}`, text: notice, html: `<p>${escapeHtml(notice)}</p>` });
      await mail(env, { to: contact.email, subject: `Rücktrittserklärung · ${order.id}`, text: `${notice}\n\nKunde: ${order.customer_name}\nE-Mail: ${order.customer_email}`, html: `<p>${escapeHtml(notice)}</p><p>${escapeHtml(order.customer_name)} · ${escapeHtml(order.customer_email)}</p>` });
      await run(env, 'UPDATE orders SET withdrawal_acknowledged_at=? WHERE id=?', Date.now(), order.id);
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
    ]);
  },
};
