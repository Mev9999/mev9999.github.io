// Offline fictional preview generated from the production templates and a local test order.
// The harness uses temporary SQLite/R2 and an in-memory mail sink; nothing is sent.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPortalEmail, renderPortalDocument, renderWithdrawalEmail } from './backend/mail-templates.mjs';
import { createHarness, cookieValue, fixtureIds } from './tests/harness.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const output = process.argv[2] || path.join(root, 'tools/customer-portal/.private/mail-preview.html');
const logo = `data:image/png;base64,${(await readFile(path.join(root, 'logo-liza.png'))).toString('base64')}`;
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
let receiptText, finalReceiptText, notice;
const harness = await createHarness();
try {
  await harness.DB.prepare('UPDATE users SET name=? WHERE id=?').bind('Anna Beispiel', fixtureIds.customer).run();
  await harness.DB.prepare('UPDATE galleries SET name=? WHERE id=?').bind('Unsere Familienmomente', fixtureIds.gallery).run();
  const login = await harness.request('/api/auth/login', { method: 'POST', body: { email: 'customer@example.test', password: 'Testgalerie2026!' } });
  const customer = { cookie: cookieValue(login), csrf: login.data.csrf };
  const result = await harness.request('/api/orders', { ...customer, method: 'POST', body: { galleryId: fixtureIds.gallery, packageId: fixtureIds.threePackage, imageIds: ['local-image-3','local-image-4','local-image-5'], paymentMethod: 'transfer', termsAccepted: true, digitalConsent: true } });
  if (result.status !== 201) throw new Error('Fictional preview order failed: '+JSON.stringify(result.data));
  const orderId = result.data.order.id;
  receiptText = (await harness.DB.prepare('SELECT receipt_text FROM orders WHERE id=?').bind(orderId).first()).receipt_text;
  const withdrawal = await harness.request(`/api/orders/${orderId}/withdraw`, { ...customer, method: 'POST', body: { confirmed: true } });
  if (withdrawal.status !== 200) throw new Error('Fictional preview acknowledgement failed.');
  notice = withdrawal.data.message;
  await harness.DB.prepare('UPDATE galleries SET require_final_delivery=1 WHERE id=?').bind(fixtureIds.gallery).run();
  const finalOrder = await harness.request('/api/orders', { ...customer, method: 'POST', body: { galleryId: fixtureIds.gallery, packageId: fixtureIds.threePackage, imageIds: ['local-image-3','local-image-4','local-image-6'], paymentMethod: 'transfer', termsAccepted: true, digitalConsent: true } });
  if (finalOrder.status !== 201) throw new Error('Fictional final-delivery preview order failed: '+JSON.stringify(finalOrder.data));
  finalReceiptText = (await harness.DB.prepare('SELECT receipt_text FROM orders WHERE id=?').bind(finalOrder.data.order.id).first()).receipt_text;

} finally { await harness.close(); }
const field = name => receiptText.split('\n').find(line => line.startsWith(name+': '))?.slice(name.length+2);
const sample = {
  customerName:field('Kunde'), customerEmail:field('E-Mail'), galleryName:field('Galerie'), galleryUrl:'https://example.test/galerie',
  orderId:field('Bestellnummer'), paymentReference:field('Zahlungsreferenz'),
  packageName:field('Paket'), imageCount:3, amountCents:2500, currency:'EUR',
  bank:{recipient:field('Empfänger'),iban:field('IBAN'),bic:field('BIC')},
  imageTitles:['Familie-01.jpg','Familie-02.jpg','Familie-03.jpg'], invoiceFilename:'Musterrechnung.pdf', receiptText,
};
const finalField = name => finalReceiptText.split('\n').find(line => line.startsWith(name+': '))?.slice(name.length+2);
const finalSample = {receiptText:finalReceiptText,orderId:finalField('Bestellnummer'),paymentReference:finalField('Zahlungsreferenz')};
const kinds = [
  ['invite','Einladung mit Passwortlink',{setupUrl:'https://example.test/passwort'}],
  ['invite','Einladung – Zugang besteht bereits',{}],
  ['setup','Zugang einrichten',{setupUrl:'https://example.test/passwort'}],
  ['reset','Passwort zurücksetzen',{actionUrl:'https://example.test/passwort'}],
  ['order','Bestellbestätigung – Überweisung',{paymentStatus:'pending',actionUrl:'https://example.test/bestellung'}],
  ['order','Bestellbestätigung – bereits bezahlt',{paymentStatus:'paid',actionUrl:'https://example.test/bestellung'}],
  ['invite','Auswahlgalerie – Einladung',{requiresFinalDelivery:true}],
  ['order','Auswahlgalerie – Bestellung vor Zahlung',{paymentStatus:'pending',requiresFinalDelivery:true,actionUrl:'https://example.test/bestellung'}],
  ['order','Auswahlgalerie – bezahlt, Bilder in Bearbeitung',{paymentStatus:'paid',requiresFinalDelivery:true,deliveryPending:true,actionUrl:'https://example.test/bestellung'}],
  ['order','Auswahlgalerie – bezahlt, Bilder bereits fertig',{paymentStatus:'paid',requiresFinalDelivery:true,deliveryPending:false,actionUrl:'https://example.test/bestellung'}],
  ['download','Download freigegeben',{}],
];
const previews = kinds.map(([kind,label,extra]) => {
  const message = renderPortalEmail({...sample,...extra,...(extra.requiresFinalDelivery ? finalSample : {}),kind});
  return {label,subject:message.subject,html:message.html};
});
for (const admin of [false,true]) {
  const message = renderWithdrawalEmail({...sample,notice,actionUrl:'https://example.test/bestellung',admin});
  previews.push({label:admin?'Rücktritt – Nachricht an die Verwaltung':'Rücktritt – Eingangsbestätigung für Kunden',subject:message.subject,html:message.html});
}
previews.push({label:'Bestätigung zum Herunterladen / E-Mail-Anhang',subject:'Vollständige Vertragsbestätigung · als HTML speicherbar und als PDF druckbar',html:renderPortalDocument(sample).html});
previews.push({label:'Auswahlgalerie – Vertragsbestätigung mit Fertigstellung',subject:'Muster · Bestellung, Bearbeitung und automatische Auslieferung',html:renderPortalDocument({...sample,...finalSample}).html});
for (const preview of previews) {
  preview.html=preview.html.replace('https://portal.liza-memories-photography.com/assets/logo-liza.png',logo).replaceAll(/href="[^"]*"/g,'href="#"');
}
await mkdir(path.dirname(output), {recursive:true});
await writeFile(output, `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LiZa – Portal-Nachrichten und Bestätigungen</title><style>body{margin:0;background:#f9f3ef;color:#3a2e2a;font:15px/1.6 Arial,sans-serif}header{padding:24px;max-width:1080px;margin:auto}h1{font:normal 30px/1.3 Georgia,serif;margin:0 0 12px}p{max-width:82ch;margin:12px 0}.controls{display:flex;flex-wrap:wrap;gap:12px;align-items:center}select,button{font:inherit;border:1px solid #d8b8a8;border-radius:8px;background:#fffaf7;padding:10px;max-width:100%}button{cursor:pointer}label{min-width:0}select{width:100%}main{margin:0 auto 40px;width:840px;max-width:100%}iframe{display:block;width:100%;height:calc(100vh - 300px);min-height:700px;border:0;background:#f4eee8}small{display:block}#subject{margin:12px 0}.note{color:#80695c;font-size:13px}@media(max-width:480px){header{padding:20px}h1{font-size:25px}iframe{min-height:900px}}</style><header><h1>Deine Portal-Nachrichten</h1><p>Alle Vorlagen in einer Ansicht: E-Mails und die vollständige Bestätigung zum Herunterladen mit Logo, Bestellübersicht und den gespeicherten Bedingungen.</p><p class="note">Muster mit erfundenen Daten. Kein E-Mail-Versand und keine echte Bestellung. Links sind in dieser Vorschau deaktiviert. E-Mail-Programme können Farben und Schrift leicht anders darstellen.</p><div class="controls"><label>Vorlage <select id="kind">${previews.map((p,i)=>`<option value="${i}">${escape(p.label)}</option>`).join('')}</select></label><button data-width="375">Handy · 375 px</button><button data-width="840">Desktop · 840 px</button></div><small id="subject"></small></header><main><iframe title="Nachrichten-Vorschau" sandbox srcdoc="${escape(previews[0].html)}"></iframe></main><script>const samples=${JSON.stringify(previews).replaceAll('<','\\u003c')};const selector=document.querySelector('#kind');function show(){const p=samples[Number(selector.value)];document.querySelector('iframe').srcdoc=p.html;document.querySelector('#subject').textContent=p.subject;}selector.addEventListener('change',show);document.querySelectorAll('[data-width]').forEach(b=>b.addEventListener('click',()=>document.querySelector('main').style.width=b.dataset.width+'px'));show();</script></html>`);
console.log('Nachrichten-Vorschau erstellt: '+output);
