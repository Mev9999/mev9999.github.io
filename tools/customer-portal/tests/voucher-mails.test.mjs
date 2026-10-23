import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { renderPortalEmail, renderPortalDocument, renderVoucherEmail } from '../backend/mail-templates.mjs';
import { createHarness, cookieValue } from './harness.mjs';

const sample = { language: 'de', customerName: 'Anna Müller', customerEmail: 'anna@example.test', reference: 'LZ-GTEST123', amountCents: 15000, giftTo: 'Sarah', code: 'LZ-12345-ABCDE-67890-FABCD', actionUrl: 'https://portal.example.test/gutscheine-kaufen.html#order=test&token=private', bank: { recipient: 'LiZa Memories Photography', iban: 'AT611904300234573201', bic: 'BKAUATWW' }, notice: 'Deine Rücktrittserklärung ist eingegangen. Dies bestätigt den Eingang, noch keine ausgeführte Rückzahlung.' };
const doc = html => new JSDOM(html).window.document;

test('every voucher email shares the actual gallery email frame, buttons, logo and footer', () => {
  const baseline = doc(renderPortalEmail({ kind: 'order', actionUrl: sample.actionUrl, amountCents: 15000 }).html);
  for (const kind of ['confirmation', 'gift', 'withdrawal']) {
    const rendered = renderVoucherEmail({ ...sample, kind });
    const document = doc(rendered.html);
    for (const selector of ['.mail-header', '.mail-footer', 'style']) assert.equal(document.querySelector(selector).outerHTML, baseline.querySelector(selector).outerHTML);
    assert.equal(document.querySelector('.mail-content').getAttribute('style'), baseline.querySelector('.mail-content').getAttribute('style'));
    assert.equal(document.querySelector('.mail-action').getAttribute('style'), baseline.querySelector('.mail-action').getAttribute('style'));
    assert.equal(document.querySelector('.mail-action').href, sample.actionUrl);
    assert.equal(document.querySelectorAll('img').length, 1);
    assert.equal(document.querySelectorAll('script, iframe, object, embed, pre').length, 0);
  }
});

test('confirmation gives complete payment details while paid voucher never requests a second transfer', () => {
  const pending = renderVoucherEmail({ ...sample, kind: 'confirmation' });
  for (const value of [sample.reference, sample.bank.recipient, sample.bank.iban, sample.bank.bic, '150,00 €']) {
    assert.ok(pending.text.includes(value));
    assert.ok(doc(pending.html).body.textContent.includes(value));
  }
  assert.equal(doc(pending.html).querySelectorAll('.mail-bank').length, 1);
  const paid = renderVoucherEmail({ ...sample, kind: 'gift' });
  assert.equal(doc(paid.html).querySelector('.mail-bank'), null);
  assert.ok(paid.text.includes(sample.code));
  assert.match(paid.text, /PDF im Anhang/);
  assert.doesNotMatch(paid.text, /IBAN|BIC|Deine Überweisung|Bitte überweise/);
});

test('all languages have localized headings and signatures in buyer and studio messages', () => {
  for (const [language, signature] of [['de', 'Liebe Grüße,'], ['en', 'Warm wishes,'], ['bs', 'Srdačan pozdrav,']]) {
    for (const kind of ['confirmation', 'gift', 'withdrawal']) {
      const message = renderVoucherEmail({ ...sample, kind, language });
      assert.equal(doc(message.html).documentElement.lang, language);
      assert.ok(doc(message.html).body.textContent.includes(signature));
      assert.ok(message.text.includes(signature));
    }
    const admin = renderVoucherEmail({ ...sample, kind: 'withdrawal', language, admin: true });
    assert.ok(admin.text.includes(sample.customerEmail));
    assert.ok(admin.text.includes(sample.notice));
    assert.ok(doc(admin.html).body.textContent.includes(sample.notice));
  }
});

test('names, reference and bank fields remain plain text; unsafe action URLs fail closed', () => {
  const attack = '<img src=x onerror=alert(1)> & "';
  const message = renderVoucherEmail({ ...sample, kind: 'confirmation', customerName: attack, giftTo: attack, reference: attack + '\nBcc: other@example.test', bank: { recipient: attack, iban: attack } });
  const document = doc(message.html);
  assert.equal(document.querySelectorAll('img').length, 1);
  assert.equal(document.querySelectorAll('script, [onerror]').length, 0);
  assert.ok(document.body.textContent.includes(attack));
  assert.doesNotMatch(message.subject, /[\r\n]/);
  for (const actionUrl of ['javascript:alert(1)', 'https://user:pass@example.test', '/relative', '']) assert.throws(() => renderVoucherEmail({ ...sample, kind: 'gift', actionUrl }), /HTTP\(S\)/);
});

test('branded contract document preserves every stored character and uses self-contained logo in all languages', () => {
  const receiptText = 'Bestellt am: 2026-10-23\r\n\r\nŽeljka & Sarah <3\n  unverändert  \n<script>nicht ausführen</script>\n';
  for (const language of ['de', 'en', 'bs']) {
    const first = renderPortalDocument({ receiptText, orderId: sample.reference, language });
    const second = renderPortalDocument({ receiptText, orderId: sample.reference, language });
    assert.equal(first.html, second.html);
    const document = doc(first.html);
    assert.equal(document.documentElement.lang, language);
    assert.equal(document.querySelector('[data-contract-text]').textContent, receiptText);
    assert.match(document.querySelector('img').src, /^data:image\/png;base64,/);
    assert.equal(document.querySelectorAll('script, link, iframe, object, embed').length, 0);
  }
});

test('real voucher purchase, activation, resend and both withdrawal recipients use shared design and saved contract', async () => {
  const h = await createHarness();
  try {
    const purchase = await h.request('/api/vouchers/orders', { method: 'POST', body: { amountCents: 15000, buyerName: sample.customerName, buyerEmail: sample.customerEmail, buyerAddress: 'Teststraße 1\n8010 Graz', giftTo: sample.giftTo, language: 'de', termsAccepted: true, idempotencyKey: crypto.randomUUID() } });
    assert.equal(purchase.status, 201);
    assert.equal(purchase.data.emailSent, true);
    const { order, accessToken } = purchase.data;
    const login = await h.request('/api/auth/login', { method: 'POST', body: { email: 'emina@example.test', password: 'Testverwaltung2026!' } });
    const actor = { cookie: cookieValue(login), csrf: login.data.csrf, method: 'POST', body: {} };
    assert.equal((await h.request(`/api/admin/vouchers/${order.id}/paid`, actor)).data.emailSent, true);
    assert.equal((await h.request(`/api/admin/vouchers/${order.id}/resend`, actor)).data.emailSent, true);
    const saved = await h.DB.prepare('SELECT contract_text FROM gift_vouchers WHERE id=?').bind(order.id).first();
    const beforeWithdrawal = h.mail.messages.filter(message => message.to === sample.customerEmail);
    assert.equal(beforeWithdrawal.length, 3);
    for (const message of beforeWithdrawal) {
      const contract = message.attachments.find(file => file.content_type.startsWith('text/html'));
      const document = doc(Buffer.from(contract.content, 'base64').toString('utf8'));
      assert.equal(document.querySelector('[data-contract-text]').textContent, saved.contract_text);
    }
    assert.equal(beforeWithdrawal[1].attachments.filter(file => file.content_type === 'application/pdf').length, 1);
    assert.equal(beforeWithdrawal[2].attachments.filter(file => file.content_type === 'application/pdf').length, 1);
    assert.deepEqual(beforeWithdrawal[1].attachments, beforeWithdrawal[2].attachments);
    const result = await h.request(`/api/vouchers/orders/${order.id}/withdraw`, { method: 'POST', body: { token: accessToken, confirmed: true } });
    assert.equal(result.data.emailSent, true);
    assert.equal(h.mail.messages.length, 5);
    for (const message of h.mail.messages) {
      assert.ok(doc(message.html).querySelector('.mail-logo'));
      assert.ok(doc(message.html).querySelector('.mail-action'));
      assert.ok(doc(message.html).querySelector('.mail-footer'));
    }
    const studio = h.mail.messages.at(-1);
    assert.ok(studio.text.includes(sample.customerEmail));
    assert.ok(!studio.html.includes(accessToken), 'studio uses admin portal, never buyer access token');
  } finally { await h.close(); }
});
