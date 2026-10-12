import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { renderPortalEmail, renderPortalDocument, renderWithdrawalEmail } from '../backend/mail-templates.mjs';

const mailFixture = {
  customerName: 'Anna Müller', galleryName: 'Unsere Familienmomente', galleryUrl: 'https://photos.example.test/galerie/?gallery=family&from=email',
  orderId: 'liza-order-1234567890', packageName: 'Gold · Digitale Bilder', imageCount: 8, amountCents: 12900,
  bank: { recipient: 'Emina Huremovic', iban: 'AT61 1904 3002 3457 3201', bic: 'BKAUATWW' },
};
const mailDocument = html => new JSDOM(html).window.document;

test('new-customer invitation combines ready gallery and one password setup action', () => {
  const setupUrl = 'https://photos.example.test/galerie/?setup=one-time-token';
  const message = renderPortalEmail({ ...mailFixture, kind: 'invite', setupUrl });
  const document = mailDocument(message.html);
  const button = document.querySelector('a[style*="display:inline-block"]');
  assert.equal(document.querySelectorAll('a[style*="display:inline-block"]').length, 1);
  assert.equal(button.href, setupUrl);
  assert.match(button.textContent, /Passwort festlegen/);
  assert.match(message.subject, /Deine Bilder sind fertig/);
  assert.match(message.text, /30 Minuten/);
  assert.match(message.text, /einmal verwendbar/);
  assert.match(message.text, /Zugang einrichten/);
  assert.equal(document.querySelector('a:not([style*="display:inline-block"])').href, mailFixture.galleryUrl);
  assert.equal(message.attachments, undefined);
});

test('existing-customer invitation opens the gallery without setup instructions', () => {
  const message = renderPortalEmail({ ...mailFixture, kind: 'invite' });
  const document = mailDocument(message.html);
  assert.equal(document.querySelectorAll('.mail-action').length, 1);
  assert.equal(document.querySelector('.mail-action').href, mailFixture.galleryUrl);
  assert.equal(document.querySelector('.mail-action').textContent, 'Deine Galerie öffnen');
  assert.doesNotMatch(message.text, /30 Minuten|Passwort festlegen|Zugang einrichten/);
});

test('pending order has a short summary with exact bank fields and full transfer reference', () => {
  const message = renderPortalEmail({ ...mailFixture, kind: 'order', paymentStatus: 'pending' });
  const visible = mailDocument(message.html).body.textContent;
  for (const value of [mailFixture.packageName, '8 Bilder', '129,00 €', mailFixture.bank.recipient, mailFixture.bank.iban, mailFixture.bank.bic, mailFixture.orderId]) {
    assert.ok(visible.includes(value), `HTML includes ${value}`);
    assert.ok(message.text.includes(value), `text includes ${value}`);
  }
  assert.match(visible, /Verwendungszweck/);
  assert.ok(message.text.length < 1300);
  assert.equal(message.attachments, undefined);
});

test('full immutable contract is attached once and never expanded into the email body', () => {
  const receiptText = 'BESTELLBESTÄTIGUNG\r\nKunde: Anna Müller & Familie <3\r\n\r\nDEINE AUSDRÜCKLICHE ERKLÄRUNG ZUR DIGITALEN BEREITSTELLUNG\nIch verlange die Bereitstellung vor Ablauf der Frist.\n\nRÜCKTRITTSBELEHRUNG\nMUSTER-RÜCKTRITTSFORMULAR\n  Einrückung und Leerzeichen bleiben.  \n\n<script>alert("nicht ausführen")</script>\nGrüße aus Österreich 🌷\n';
  const message = renderPortalEmail({ ...mailFixture, kind: 'order', paymentStatus: 'pending', receiptText });
  assert.equal(message.attachments.length, 1);
  const attachment = message.attachments[0];
  assert.equal(attachment.filename, `LiZa-Vertragsbestaetigung-${mailFixture.orderId}.html`);
  assert.equal(attachment.content_type, 'text/html; charset=utf-8');
  const content = Buffer.from(attachment.content, 'base64').toString('utf8');
  const document = mailDocument(content);
  assert.equal(document.querySelector('[data-contract-text]').textContent, receiptText);
  assert.equal(document.querySelectorAll('script,iframe,object,embed,link').length, 0);
  assert.equal(document.querySelectorAll('img').length, 1);
  assert.match(document.querySelector('img').src, /^data:image\/png;base64,/);
  assert.match(content, /@media print/);
  assert.match(content, /@page\{size:A4/);
  assert.match(content, /Vertragsbestätigung/);
  for (const marker of ['DEINE AUSDRÜCKLICHE ERKLÄRUNG', 'RÜCKTRITTSBELEHRUNG', 'MUSTER-RÜCKTRITTSFORMULAR']) {
    assert.doesNotMatch(message.text, new RegExp(marker));
    assert.doesNotMatch(message.html, new RegExp(marker));
  }
  assert.equal(mailDocument(message.html).querySelector('pre'), null);
  assert.match(message.text, /im Anhang/);
  assert.ok(message.text.length < 1500);
});

test('resending the same receipt produces the same attachment and Unicode is intact', () => {
  const data = { ...mailFixture, kind: 'order', receiptText: '\nÄÖÜäöüß € 😊 & < > " \'\n\n' };
  const first = renderPortalEmail(data);
  const second = renderPortalEmail(data);
  assert.deepEqual(first.attachments, second.attachments);
  assert.equal(mailDocument(Buffer.from(first.attachments[0].content, 'base64').toString('utf8')).querySelector('[data-contract-text]').textContent, data.receiptText);
});

test('paid order confirms payment and avoids requesting another transfer', () => {
  const actionUrl = 'https://photos.example.test/galerie/?order=123';
  const message = renderPortalEmail({ ...mailFixture, kind: 'order', paymentStatus: 'paid', actionUrl });
  assert.match(message.text, /Zahlung ist bestätigt/);
  assert.doesNotMatch(message.text, /Bitte überweise|Deine Überweisung|IBAN|BIC/);
  assert.equal(mailDocument(message.html).querySelector('a').href, actionUrl);
});

test('download message stays brief and explains refreshing an already open gallery', () => {
  const message = renderPortalEmail({ ...mailFixture, kind: 'download' });
  assert.equal(message.subject, 'Deine Bilder sind zum Download bereit');
  assert.equal(mailDocument(message.html).querySelector('a').textContent, 'Bilder herunterladen');
  assert.match(message.text, /Lade die Seite einmal neu/);
  assert.ok(message.text.length < 800);
  assert.equal(message.attachments, undefined);
});

test('only the order confirmation mentions an attached invoice when one is supplied', () => {
  const note = 'Deine Rechnung findest du im Anhang und bei deiner Bestellung im Portal.';
  const without = renderPortalEmail({ ...mailFixture, kind: 'order' });
  assert.ok(!without.text.includes(note));
  const withInvoice = renderPortalEmail({ ...mailFixture, kind: 'order', invoiceFilename: '<script>Rechnung.pdf</script>' });
  assert.ok(withInvoice.text.includes(note));
  assert.ok(mailDocument(withInvoice.html).body.textContent.includes(note));
  assert.equal(mailDocument(withInvoice.html).querySelector('script'), null);
  assert.ok(!withInvoice.html.includes('Rechnung.pdf'), 'filename is unnecessary in the short body');
  assert.ok(withInvoice.text.length < 1400);
  assert.equal(withInvoice.attachments, undefined, 'backend attaches the uploaded PDF');
  const download = renderPortalEmail({ ...mailFixture, kind: 'download', invoiceFilename: 'Rechnung.pdf' });
  assert.ok(!download.text.includes(note));
  assert.doesNotMatch(download.html, /Rechnung/);
});

test('setup and reset email links expire after thirty minutes and remain separate actions', () => {
  const actionUrl = 'https://photos.example.test/galerie/?reset=token';
  for (const kind of ['setup', 'reset']) {
    const message = renderPortalEmail({ ...mailFixture, kind, actionUrl });
    assert.equal(mailDocument(message.html).querySelector('a').href, actionUrl);
    assert.match(message.text, /30 Minuten gültig und einmal verwendbar/);
    assert.match(message.text, /nicht angefordert/);
  }
});

test('HTML data is escaped, header newlines are removed, and filenames cannot escape a directory', () => {
  const attack = '<img src=x onerror="alert(1)"><script>alert(2)</script> & \' "';
  const message = renderPortalEmail({ ...mailFixture, kind: 'order', customerName: attack, galleryName: `${attack}\r\nBcc: other@example.test`, packageName: attack, businessName: attack, orderId: '../../evil\r\nname<>', bank: { recipient: attack, iban: attack, bic: attack }, receiptText: attack });
  const document = mailDocument(message.html);
  assert.equal(document.querySelectorAll('script,img:not(.mail-logo),iframe,object,embed').length, 0);
  assert.ok(document.body.textContent.includes(attack));
  assert.doesNotMatch(message.subject, /[\r\n]/);
  assert.match(message.html, /&lt;img/);
  assert.match(message.attachments[0].filename, /^LiZa-Vertragsbestaetigung-[A-Za-z0-9_-]+\.html$/);
  assert.equal(mailDocument(Buffer.from(message.attachments[0].content, 'base64').toString('utf8')).querySelector('[data-contract-text]').textContent, attack);
});

test('URLs reject scripts, non-web protocols, relative links, control characters, and credentials', () => {
  for (const value of ['javascript:alert(1)', 'data:text/html,<script>x</script>', 'file:///secret', '//photos.example.test', '/galerie/', 'https://photos.example.test/\nfoo', 'https://user:password@photos.example.test']) {
    for (const field of ['galleryUrl', 'setupUrl', 'actionUrl']) assert.throws(() => renderPortalEmail({ ...mailFixture, kind: 'invite', [field]: value }), /HTTP\(S\)/);
  }
  const message = renderPortalEmail({ ...mailFixture, kind: 'invite', galleryUrl: 'https://photos.example.test/?a=1&x=%22%3E%3Cscript%3E' });
  const document = mailDocument(message.html);
  assert.equal(document.querySelectorAll('.mail-action').length, 1);
  assert.equal(document.querySelector('script'), null);
  assert.match(message.html, /a=1&amp;x=/);
});

test('email layout has fluid mobile tables and only the fixed first-party logo image', () => {
  for (const kind of ['invite', 'setup', 'reset', 'order', 'download']) {
    const message = renderPortalEmail({ ...mailFixture, kind, actionUrl: 'https://photos.example.test/?token=123' });
    const document = mailDocument(message.html);
    assert.equal(document.documentElement.lang, 'de');
    assert.equal(document.querySelector('meta[name="viewport"]').content, 'width=device-width,initial-scale=1');
    assert.equal(document.querySelectorAll('h1').length, 1);
    assert.match(document.querySelector('h1').getAttribute('style'), /Georgia/);
    assert.equal(document.querySelectorAll('table:not([role="presentation"])').length, 0);
    assert.match(message.html, /width:100%;max-width:600px/);
    assert.match(message.html, /max-width:480px/);
    assert.ok(document.querySelector('a[style*="padding:14px 24px"]'));
    assert.equal(document.querySelectorAll('script,link,iframe,object,embed').length, 0);
    assert.equal(document.querySelectorAll('img').length, 1);
    assert.equal(document.querySelector('img').src, 'https://portal.liza-memories-photography.com/assets/logo-liza.png');
    assert.equal(document.querySelector('img').alt, 'LiZa Memories Photography');
    assert.doesNotMatch(message.html, /@import|url\(|<pre/);
  }
});

test('selected image titles are concise and complete legal detail remains in the attachment', () => {
  const titles = Array.from({ length: 100 }, (_, index) => `Bild ${index + 1}`);
  const message = renderPortalEmail({ ...mailFixture, kind: 'order', imageTitles: titles });
  assert.match(message.text, /Bild 1, Bild 2, Bild 3 und 97 weitere/);
  assert.doesNotMatch(message.text, /Bild 99/);
  assert.ok(message.text.length < 1400);
});

test('all emails use a logo, one concise heading, a personal signature and the real social links', () => {
  for (const kind of ['invite', 'setup', 'reset', 'order', 'download']) {
    const message = renderPortalEmail({ ...mailFixture, kind, actionUrl: 'https://photos.example.test/?token=123' });
    const document = mailDocument(message.html);
    const visible = document.body.textContent;
    assert.match(visible, /Liebe Grüße,/);
    assert.doesNotMatch(visible, /Herzlich,|DEINE ERINNERUNGEN|Für immer bei dir|Emina Huremovic · LiZa/);
    assert.ok(document.querySelector('h1').textContent.length <= 30);
    assert.equal(document.querySelector('a[href="https://instagram.com/liza.memories.photography"]').textContent, 'Instagram');
    assert.equal(document.querySelector('a[href="https://wa.me/4368181942780"]').textContent, 'WhatsApp');
    assert.equal(document.querySelector('a[href="https://liza-memories-photography.com/partner/"]').textContent, 'Flyer & Partner');
  }
  assert.equal(mailDocument(renderPortalEmail({ ...mailFixture, kind: 'invite' }).html).querySelector('h1').textContent, 'Deine Bilder sind fertig!');
});

test('bank rows stack labels over exact values even when the email client ignores responsive styles', () => {
  const document = mailDocument(renderPortalEmail({ ...mailFixture, kind: 'order', paymentReference: 'LIZA-A3B7C9D2' }).html);
  const rows = [...document.querySelectorAll('.mail-bank tr')];
  assert.equal(rows.length, 5);
  for (const row of rows) {
    assert.equal(row.children.length, 1);
    assert.equal(row.querySelectorAll('p').length, 2);
  }
  assert.equal(rows[1].querySelector('p:last-child').textContent, mailFixture.bank.iban);
  assert.equal(rows[4].querySelector('p:last-child').textContent, 'LIZA-A3B7C9D2');
  assert.match(document.body.textContent, /mit einem Klick kopieren/);
  assert.equal(document.querySelectorAll('button,[onclick],script').length, 0, 'copying is offered in the portal, not through unsupported email JavaScript');
});

test('short payment references are displayed while original contract and legacy references are preserved', () => {
  const receiptText = `Originalvertrag\nBestellung: ${mailFixture.orderId}\n`;
  const message = renderPortalEmail({ ...mailFixture, kind: 'order', paymentReference: 'LIZA-A3B7C9D2', receiptText });
  const visible = mailDocument(message.html).body.textContent;
  assert.match(visible, /LIZA-A3B7C9D2/);
  assert.match(message.subject, /LIZA-A3B7C9D2/);
  assert.ok(!visible.includes(mailFixture.orderId));
  assert.equal(mailDocument(Buffer.from(message.attachments[0].content, 'base64').toString('utf8')).querySelector('[data-contract-text]').textContent, receiptText);
  const legacy = renderPortalEmail({ ...mailFixture, kind: 'order' });
  assert.ok(legacy.text.includes(`Verwendungszweck: ${mailFixture.orderId}`));
});

test('internal image UUID suffixes are removed only from the short customer-facing selection', () => {
  const id = '55815def-5428-4de7-ac28-4aa18ca86af4';
  const receiptText = `Bild: Babybauch 01 (${id})`;
  const message = renderPortalEmail({ ...mailFixture, kind: 'order', imageTitles: [`Babybauch 01 (${id})`, 'Familie (Sommer).jpg'], receiptText });
  assert.match(message.text, /Deine Auswahl: Babybauch 01, Familie \(Sommer\)\.jpg\./);
  assert.doesNotMatch(message.html, new RegExp(id));
  assert.equal(mailDocument(Buffer.from(message.attachments[0].content, 'base64').toString('utf8')).querySelector('[data-contract-text]').textContent, receiptText);
});

test('editable subjects and introductions remain plain text and retain operational and contract information', () => {
  const intro = '<img src=x onerror="alert(1)"> Deine Momente sind bereit!';
  const setup = renderPortalEmail({ ...mailFixture, kind: 'invite', setupUrl: 'https://photos.example.test/?setup=token', customCopy: { subject: 'Eine Nachricht\r\nBcc: injected@example.test', intro } });
  assert.doesNotMatch(setup.subject, /[\r\n]/);
  assert.equal(mailDocument(setup.html).querySelectorAll('img').length, 1);
  assert.match(mailDocument(setup.html).body.textContent, /<img src=x onerror="alert\(1\)">/);
  assert.match(setup.text, /30 Minuten gültig und einmal verwendbar/);
  assert.equal(mailDocument(setup.html).querySelector('.mail-action').href, 'https://photos.example.test/?setup=token');
  const receiptText = 'VERTRAG\nDieser gespeicherte Inhalt darf sich nicht ändern.';
  const order = renderPortalEmail({ ...mailFixture, kind: 'order', receiptText, customCopy: { subject: 'S'.repeat(200), intro: 'I'.repeat(1100) } });
  assert.equal(order.subject.length, 160);
  assert.ok(!order.text.includes('I'.repeat(1001)));
  assert.match(order.text, /Verwendungszweck:/);
  assert.equal(mailDocument(Buffer.from(order.attachments[0].content, 'base64').toString('utf8')).querySelector('[data-contract-text]').textContent, receiptText);
  const defaults = renderPortalEmail({ ...mailFixture, kind: 'invite', customCopy: { subject: ' \n ', intro: ' ' } });
  assert.match(defaults.subject, /Deine Bilder sind fertig/);
  assert.match(defaults.text, /Viel Freude/);
});

test('invalid templates, absent action URLs, and invalid amounts fail before delivery', () => {
  assert.throws(() => renderPortalEmail({ ...mailFixture, kind: 'unknown' }), /Unbekannte/);
  assert.throws(() => renderPortalEmail({ kind: 'invite' }), /HTTP\(S\)/);
  for (const amountCents of [NaN, Infinity, -1, 12.5, '12900']) assert.throws(() => renderPortalEmail({ ...mailFixture, kind: 'order', amountCents }), /amountCents/);
});

test('branded contract preserves every historical byte while structuring headings, amounts and images offline', () => {
  const receiptText = 'BESTELLBESTÄTIGUNG\r\nLiZa Memories Photography\r\n\r\nBestellnummer: old-123\r\nPaket: Reserviertes Paket (60,00 €) + 2 × Einzelbild (je 15,00 € = 30,00 €)\r\nBilder:\r\n- Foto A & B (<script>alert(1)</script>)\r\n- Familie 02.jpg\r\nGesamtbetrag: 90.00 EUR\r\n\r\nBESTELLBEDINGUNGEN (historisch-1)\r\n  Alle bestehenden Bedingungen bleiben unverändert.  \r\n\r\nDEINE AUSDRÜCKLICHE ERKLÄRUNG ZUR DIGITALEN BEREITSTELLUNG\r\nGespeicherte Einwilligung.\r\n\r\nRÜCKTRITTSBELEHRUNG\r\nBestehende Rücktrittsbelehrung.\r\n\r\nMUSTER-RÜCKTRITTSFORMULAR\r\nName: [Name]\r\n';
  const result = renderPortalDocument({ receiptText, orderId: '../../unsafe\r\nheader' });
  const doc = mailDocument(result.html);
  assert.equal(doc.querySelector('[data-contract-text]').textContent, receiptText);
  assert.equal(doc.querySelectorAll('h2').length, 4);
  assert.equal(doc.querySelectorAll('.contract-image').length, 2);
  assert.match(doc.querySelector('.contract-total').textContent, /90.00 EUR/);
  assert.match(doc.querySelector('img').src, /^data:image\/png;base64,/);
  assert.equal(doc.querySelectorAll('script,iframe,object,embed,link,[onclick]').length, 0);
  assert.match(doc.querySelector('meta[http-equiv="Content-Security-Policy"]').content, /default-src 'none'/);
  assert.match(result.filename, /^LiZa-Vertragsbestaetigung-[A-Za-z0-9_-]+\.html$/);
  assert.equal(result.contentType, 'text/html; charset=utf-8');
  assert.deepEqual(result, renderPortalDocument({ receiptText, orderId: '../../unsafe\r\nheader' }));
});

test('withdrawal customer and admin emails use the existing brand and preserve the acknowledgement wording', () => {
  const notice = 'Deine Rücktrittserklärung ist eingegangen. Sie wird von Emina geprüft. Dies ist eine Eingangsbestätigung, noch keine Bestätigung einer Erstattung. Falls digitale Inhalte bereits bereitgestellt wurden, kann das Rücktrittsrecht bereits erloschen sein. Bei Fragen: contact@example.test';
  for (const admin of [false, true]) {
    const result = renderWithdrawalEmail({ ...mailFixture, notice, customerEmail: 'anna@example.test', paymentReference: 'LIZA-AB12CD34', actionUrl: mailFixture.galleryUrl, admin });
    const doc = mailDocument(result.html);
    assert.ok(result.text.includes(notice));
    assert.ok(doc.body.textContent.includes(notice));
    assert.equal(doc.querySelector('img').src, 'https://portal.liza-memories-photography.com/assets/logo-liza.png');
    assert.equal(doc.querySelector('.mail-action').href, mailFixture.galleryUrl);
    assert.match(doc.body.textContent, /Liebe Grüße,/);
    assert.match(result.subject, /LIZA-AB12CD34/);
    assert.equal(result.attachments, undefined);
    assert.equal(doc.querySelector('script'), null);
    if (admin) assert.ok(doc.body.textContent.includes('anna@example.test'));
    else assert.ok(!doc.body.textContent.includes('anna@example.test'));
  }
  const attack = '<img src=x onerror=alert(1)> & <script>x</script>';
  const safe = renderWithdrawalEmail({ ...mailFixture, notice: attack, actionUrl: mailFixture.galleryUrl });
  assert.equal(mailDocument(safe.html).querySelectorAll('img').length, 1);
  assert.ok(mailDocument(safe.html).body.textContent.includes(attack));
  assert.throws(() => renderWithdrawalEmail({ ...mailFixture, notice, actionUrl: 'javascript:alert(1)' }), /HTTP\(S\)/);
});


test('proof gallery invitation and final delivery orders do not promise unfinished downloads', () => {
  const invite = renderPortalEmail({ ...mailFixture, kind: 'invite', requiresFinalDelivery: true });
  assert.match(invite.subject, /Galerie ist bereit/);
  assert.doesNotMatch(invite.text, /Bilder sind fertig/);
  const paid = renderPortalEmail({ ...mailFixture, kind: 'order', paymentStatus: 'paid', requiresFinalDelivery: true, deliveryPending: true });
  for (const body of [paid.text, mailDocument(paid.html).body.textContent]) {
    assert.match(body, /Zahlung ist bestätigt/);
    assert.match(body, /Downloads bleiben bis zur Fertigstellung aller bestellten Bilder gesperrt/);
    assert.match(body, /bearbeiteten Originaldateien in voller Qualität/);
    assert.doesNotMatch(body, /Bitte überweise/);
  }
  assert.equal(mailDocument(paid.html).querySelector('.mail-action').textContent, 'Bestellung ansehen');
  const pending = renderPortalEmail({ ...mailFixture, kind: 'order', paymentStatus: 'pending', requiresFinalDelivery: true });
  assert.match(pending.text, /Bitte überweise/);
  assert.match(pending.text, /Sobald alle bestellten Bilder bereit sind/);
  assert.doesNotMatch(pending.text, /Nach der Zahlungsbestätigung werden deine Downloads freigegeben/);
  const custom = renderPortalEmail({ ...mailFixture, kind: 'order', paymentStatus: 'paid', requiresFinalDelivery: true, deliveryPending: true, customCopy: { intro: 'Danke für deine Auswahl!' } });
  assert.match(custom.text, /Danke für deine Auswahl!/);
  assert.match(custom.text, /Downloads bleiben bis zur Fertigstellung aller bestellten Bilder gesperrt/);
  const ready = renderPortalEmail({ ...mailFixture, kind: 'order', paymentStatus: 'paid', requiresFinalDelivery: true, deliveryPending: false });
  assert.match(ready.text, /Alle bestellten Bilder sind fertiggestellt/);
  assert.doesNotMatch(ready.text, /werden jetzt fertiggestellt|Downloads bleiben/);
});
