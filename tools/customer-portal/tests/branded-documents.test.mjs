import { ORDER_CONSENT_VERSION, orderConsent } from '../frontend/order-consent.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createHarness, cookieValue, fixtureIds } from './harness.mjs';

async function login(h, email = 'customer@example.test', password = 'Testgalerie2026!') {
  const response = await h.request('/api/auth/login', { method: 'POST', body: { email, password } });
  assert.equal(response.status, 200);
  return { cookie: cookieValue(response), csrf: response.data.csrf };
}
async function ordered(h, customer) {
  const response = await h.request('/api/orders', { ...customer, method: 'POST', body: { galleryId: fixtureIds.gallery, packageId: fixtureIds.threePackage, imageIds: ['local-image-1', 'local-image-2', 'local-image-3'], paymentMethod: 'transfer', termsAccepted: true, digitalConsent:true,earlyStartConsent:true,consentVersion:'portal-digital-2026-10-19-consent-v4',consentLanguage:'de' } });
  assert.equal(response.status, 201);
  return response.data.order;
}
function document(html) { return new JSDOM(html).window.document; }

test('receipt download is a branded offline document matching the email attachment and immutable snapshot', async () => {
  const h = await createHarness();
  try {
    const customer = await login(h);
    const order = await ordered(h, customer);
    const saved = await h.DB.prepare('SELECT receipt_text,receipt_email_json FROM orders WHERE id=?').bind(order.id).first();
    const message = h.mail.messages.find(m => m.idempotencyKey === `order-receipt/${order.id}`);
    const attachment = message.attachments.find(file => file.content_type.startsWith('text/html'));
    const route = `/api/orders/${order.id}/receipt`;
    assert.equal((await h.request(route)).status, 401);
    const other = await login(h, 'other@example.test');
    assert.equal((await h.request(route, other)).status, 404);
    await h.DB.prepare('UPDATE galleries SET name=? WHERE id=?').bind('Changed gallery', fixtureIds.gallery).run();
    await h.DB.prepare('UPDATE images SET title=? WHERE id=?').bind('Changed photo', 'local-image-1').run();
    h.env.BANK_RECIPIENT = 'Changed account';
    const response = await h.request(route, customer);
    assert.equal(response.status, 200);
    assert.match(response.response.headers.get('content-disposition'), /attachment; filename="LiZa-Vertragsbestaetigung-[^"]+\.html"/);
    assert.equal(response.response.headers.get('content-type'), 'text/html; charset=utf-8');
    assert.match(response.response.headers.get('cache-control'), /no-store/);
    assert.match(response.response.headers.get('content-security-policy'), /default-src 'none'/);
    const html = await response.text();
    assert.equal(html, Buffer.from(attachment.content, 'base64').toString('utf8'));
    assert.equal(document(html).querySelector('[data-contract-text]').textContent, saved.receipt_text);
    assert.deepEqual(await h.DB.prepare('SELECT receipt_text,receipt_email_json FROM orders WHERE id=?').bind(order.id).first(), saved);
    const admin = await login(h, 'emina@example.test', 'Testverwaltung2026!');
    assert.equal((await h.request(route, admin)).status, 200);
  } finally { await h.close(); }
});

test('legacy receipt renders beautifully without replacing saved contract or resend snapshot', async () => {
  const h = await createHarness();
  try {
    const customer = await login(h), order = await ordered(h, customer);
    const legacyText = 'BESTELLBESTÄTIGUNG\nBestellnummer: Bestand\n\nBESTELLBEDINGUNGEN (ALT)\nUnveränderte Bedingungen & Preise <3\n\nRÜCKTRITTSBELEHRUNG\nAlte Belehrung.\n';
    await h.DB.prepare('UPDATE orders SET receipt_text=? WHERE id=?').bind(legacyText, order.id).run();
    const before = await h.DB.prepare('SELECT receipt_text,receipt_email_json FROM orders WHERE id=?').bind(order.id).first();
    const response = await h.request(`/api/orders/${order.id}/receipt`, customer);
    const doc = document(await response.text());
    assert.equal(doc.querySelector('[data-contract-text]').textContent, legacyText);
    assert.equal(doc.querySelectorAll('h2').length, 2);
    assert.match(doc.querySelector('img').src, /^data:image\/png;base64,/);
    assert.deepEqual(await h.DB.prepare('SELECT receipt_text,receipt_email_json FROM orders WHERE id=?').bind(order.id).first(), before);
  } finally { await h.close(); }
});

test('withdrawal sends branded customer and admin acknowledgements once without claiming a refund', async () => {
  const h = await createHarness();
  try {
    const customer = await login(h), order = await ordered(h, customer);
    const route = `/api/orders/${order.id}/withdraw`;
    h.mail.clear();
    const result = await h.request(route, { ...customer, method: 'POST', body: { confirmed: true } });
    assert.equal(result.status, 200);
    assert.equal(h.mail.messages.length, 2);
    for (const message of h.mail.messages) {
      const doc = document(message.html);
      assert.ok(message.text.includes(result.data.message));
      assert.ok(doc.body.textContent.includes(result.data.message));
      assert.match(message.html, /mail-header/);
      assert.match(doc.querySelector('img').src, /logo-liza\.png$/);
      assert.match(message.text, /noch keine Bestätigung einer Erstattung/);
      assert.match(message.idempotencyKey, /^withdrawal-(customer|admin)\//);
    }
    assert.equal((await h.request(route, { ...customer, method: 'POST', body: { confirmed: true } })).status, 200);
    assert.equal(h.mail.messages.length, 2);
    assert.equal((await h.DB.prepare('SELECT status FROM orders WHERE id=?').bind(order.id).first()).status, 'pending');
  } finally { await h.close(); }
});


test('new orders store the exact declarations and language in the durable receipt, with no retroactive additions',async()=>{
 for(const lang of ['de','en','bs']){const h=await createHarness();try{const c=await login(h);const result=await h.request('/api/orders',{...c,method:'POST',body:{galleryId:fixtureIds.gallery,packageId:fixtureIds.singlePackage,imageIds:['local-image-3'],paymentMethod:'transfer',termsAccepted:true,earlyStartConsent:true,digitalConsent:true,consentVersion:ORDER_CONSENT_VERSION,consentLanguage:lang}});assert.equal(result.status,201);const saved=await h.DB.prepare('SELECT terms_version,consent_at,receipt_text,receipt_email_json FROM orders WHERE id=?').bind(result.data.order.id).first();assert.equal(saved.terms_version,ORDER_CONSENT_VERSION+':'+lang);assert.ok(saved.consent_at>0);assert.ok(saved.receipt_text.includes(orderConsent[lang].compensation));assert.ok(saved.receipt_text.includes(orderConsent[lang].start));assert.ok(saved.receipt_text.includes(orderConsent[lang].loss));const message=h.mail.messages.find(m=>m.idempotencyKey==='order-receipt/'+result.data.order.id);assert.ok(message);const attachment=message.attachments.find(f=>f.content_type.startsWith('text/html'));assert.equal(document(Buffer.from(attachment.content,'base64').toString('utf8')).querySelector('[data-contract-text]').textContent,saved.receipt_text);
 await h.DB.prepare('UPDATE orders SET terms_version=?,receipt_text=? WHERE id=?').bind('portal-digital-2026-10-07','BESTELLBESTÄTIGUNG\nAlte Erklärung.',result.data.order.id).run();const historical=await h.request('/api/orders/'+result.data.order.id+'/receipt',c);assert.equal(document(await historical.text()).querySelector('[data-contract-text]').textContent,'BESTELLBESTÄTIGUNG\nAlte Erklärung.');
 }finally{await h.close();}}
});
