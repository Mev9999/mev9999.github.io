/** Static, dependency-free German email templates for the private LiZa portal. */
import { contractLogoDataUrl } from './document-brand.mjs';
const mailDefaultBusiness = 'LiZa Memories Photography';
const mailKinds = new Set(['invite', 'setup', 'reset', 'order', 'download']);
const mailWebsite = 'https://liza-memories-photography.com/';
const mailLogo = 'https://portal.liza-memories-photography.com/assets/logo-liza.png';
const mailFooterLinks = [
  ['Homepage', mailWebsite],
  ['Instagram', 'https://instagram.com/liza.memories.photography'],
  ['WhatsApp', 'https://wa.me/4368181942780'],
  ['Flyer & Partner', `${mailWebsite}partner/`],
];

function mailEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}
function mailLine(value) {
  return String(value ?? '').replace(/[\r\n\u2028\u2029]+/g, ' ').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim();
}
function mailUrl(value, field) {
  if (value == null || value === '') return '';
  if (typeof value !== 'string' || /[\u0000-\u0020\u007f]/.test(value)) throw new TypeError(`${field} muss eine HTTP(S)-URL sein.`);
  try {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) throw new Error('Unsafe URL');
    return parsed.href;
  } catch { throw new TypeError(`${field} muss eine HTTP(S)-URL sein.`); }
}
function mailMoney(amountCents, currency) {
  if (amountCents == null) return '';
  if (!Number.isSafeInteger(amountCents) || amountCents < 0) throw new TypeError('amountCents muss eine nichtnegative ganze Zahl sein.');
  const code = mailLine(currency || 'EUR').toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) throw new TypeError('currency muss ein dreistelliger Währungscode sein.');
  const number = new Intl.NumberFormat('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amountCents / 100);
  return `${number} ${code === 'EUR' ? '€' : code}`;
}
function mailParagraph(content, subtle = false) {
  return `<p style="margin:0 0 18px;color:${subtle ? '#755f53' : '#4e382d'};font-family:Arial,Helvetica,sans-serif;font-size:${subtle ? '14' : '16'}px;line-height:1.65">${content}</p>`;
}
function mailButton(label, url) {
  if (!url) return '';
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:6px 0 22px;max-width:100%"><tr><td align="center" bgcolor="#704331" style="border-radius:6px"><a class="mail-action" href="${mailEscape(url)}" style="display:inline-block;box-sizing:border-box;padding:14px 24px;border:1px solid #704331;border-radius:6px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;line-height:22px;text-align:center;text-decoration:none">${mailEscape(label)}</a></td></tr></table>`;
}
function mailRows(rows, bank = false) {
  // A label above its value also works in mail clients that strip media queries.
  // In particular, the IBAN must never be squeezed into half a phone screen.
  return `<table class="${bank ? 'mail-bank' : 'mail-summary'}" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${bank ? '#f8eee6' : '#faf7f3'}" style="width:100%;table-layout:fixed;margin:6px 0 22px;border:1px solid ${bank ? '#ead4c3' : '#ede4da'};border-radius:8px"><tbody>${rows.filter(row => row[1] !== '').map(([label, value], index) => `<tr><td valign="top" style="padding:11px 16px;${index ? 'border-top:1px solid #ede4da;' : ''}font-family:Arial,Helvetica,sans-serif;line-height:1.5"><p style="margin:0 0 3px;color:#755f53;font-size:12px;line-height:1.4">${mailEscape(label)}</p><p style="margin:0;color:#4e382d;font-size:15px;font-weight:bold;line-height:1.5;word-wrap:break-word;overflow-wrap:break-word">${mailEscape(value)}</p></td></tr>`).join('')}</tbody></table>`;
}
function mailShell(subject, title, content) {
  const footer = mailFooterLinks.map(([label, url]) => `<a href="${mailEscape(url)}" style="color:#704331;text-decoration:underline;white-space:nowrap">${mailEscape(label)}</a>`);
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="format-detection" content="telephone=no,date=no,address=no,email=no"><title>${mailEscape(subject)}</title><style>@media only screen and (max-width:480px){.mail-outer{padding:12px 8px!important}.mail-content{padding:24px 20px!important}.mail-title{font-size:22px!important;line-height:1.3!important}.mail-header{padding:22px 20px!important}.mail-logo{width:240px!important}.mail-footer{padding:18px 16px!important}}</style></head>
<body style="margin:0;padding:0;background-color:#f4eee8;color:#4e382d;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f4eee8" style="width:100%;background-color:#f4eee8"><tr><td class="mail-outer" align="center" style="padding:28px 12px">
<!--[if mso]><table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#fffdfa" style="width:100%;max-width:600px;background-color:#fffdfa;border:1px solid #e7dbcf;border-radius:12px"><tr><td class="mail-header" align="center" bgcolor="#f3e4dc" style="padding:26px 32px;border-bottom:1px solid #ecdfd3;background-color:#f3e4dc;border-radius:12px 12px 0 0"><img class="mail-logo" src="${mailLogo}" width="280" alt="LiZa Memories Photography" style="display:block;width:280px;max-width:100%;height:auto;border:0;color:#704331;font-family:Arial,Helvetica,sans-serif;font-size:18px"></td></tr>
<tr><td class="mail-content" style="padding:30px 32px"><h1 class="mail-title" style="margin:0 0 22px;color:#5b392c;font-family:Georgia,'Times New Roman',serif;font-size:27px;font-weight:normal;line-height:1.3;letter-spacing:-0.3px">${mailEscape(title)}</h1>${content}<p style="margin:24px 0 0;color:#4e382d;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6">Liebe Grüße,<br><span style="font-family:Georgia,'Times New Roman',serif;font-size:21px;color:#704331">Emina</span></p></td></tr>
<tr><td class="mail-footer" align="center" style="padding:18px 24px;border-top:1px solid #ecdfd3"><p style="margin:0;color:#755f53;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.9">${footer.slice(0, 3).join(' &nbsp;·&nbsp; ')}<br>${footer[3]}</p></td></tr></table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`;
}
function mailBase64(content) {
  const bytes = new TextEncoder().encode(content);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
function contractFilename(orderId) {
  const safeId = (orderId || 'Bestellung').normalize('NFKD').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'Bestellung';
  return `LiZa-Vertragsbestaetigung-${safeId}.html`;
}
function contractMarkup(receiptText) {
  // Every source character, including CRLF and whitespace, stays in the document.
  // Only markup is inserted. Historical prices, consent and terms are never rebuilt.
  const escape = value => mailEscape(value).replace(/\r/g, '&#13;');
  const lines = receiptText.split(/(\r\n|\n|\r)/);
  let html = '', inImages = false;
  const closeImages = () => { if (inImages) { html += '</div>'; inImages = false; } };
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (/^(?:\r\n|\n|\r)$/.test(line)) { html += escape(line); continue; }
    if (!line) { html += ''; continue; }
    if (line.startsWith('- ')) {
      if (!inImages) { html += '<div class="contract-images">'; inImages = true; }
      html += `<p class="contract-image">${escape(line)}</p>`;
      continue;
    }
    closeImages();
    if (line === 'BESTELLBESTÄTIGUNG') html += `<h1>${escape(line)}</h1>`;
    else if (/^(?:BESTELLBEDINGUNGEN(?: \(.*\))?|DEINE AUSDRÜCKLICHE ERKLÄRUNG ZUR DIGITALEN BEREITSTELLUNG|RÜCKTRITTSBELEHRUNG|MUSTER-RÜCKTRITTSFORMULAR|ÜBERWEISUNGSDATEN)$/.test(line)) html += `<h2>${escape(line)}</h2>`;
    else if (line === 'Bilder:') html += `<h3>${escape(line)}</h3>`;
    else {
      const field = line.match(/^(Bestellnummer|Bestellt am|Kunde|E-Mail|Galerie|Paket|Gesamtbetrag|Zahlungsart|Empfänger|IBAN|BIC|Betrag|Zahlungsreferenz|Vertragspartner|Adresse|Lieferablauf|Telefon|An|Name|Anschrift|Datum|Unterschrift): (.*)$/);
      if (field) html += `<p class="contract-field${['Gesamtbetrag', 'Betrag'].includes(field[1]) ? ' contract-total' : ''}"><span>${escape(field[1] + ': ')}</span><strong>${escape(field[2])}</strong></p>`;
      else {
        const previous=lines.slice(0,index).filter(value=>value.trim()).at(-1)||'';
        const label=line.startsWith('Keine Versandkosten.')?'Kosten:':line.startsWith('Hiermit trete ich')?'Erklärung:':previous.startsWith('Vertragspartner:')?'Adresse:':'';
        html += label ? '<p class="contract-field"><span class="contract-generated-label" data-label="'+escape(label)+'"></span><strong>'+escape(line)+'</strong></p>' : '<p class="contract-paragraph">'+escape(line)+'</p>';
      }
    }
  }
  closeImages();
  return html;
}

/** Self-contained printable document, derived exclusively from the saved receipt text. */
export function renderPortalDocument({ receiptText, orderId = '' }) {
  if (typeof receiptText !== 'string' || !receiptText.length) throw new TypeError('Eine gespeicherte Vertragsbestätigung ist erforderlich.');
  const content = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>Vertragsbestätigung${orderId ? ` · ${mailEscape(mailLine(orderId))}` : ''}</title><style>
*{box-sizing:border-box}body{margin:0;padding:32px 18px;background:#f4eee8;color:#4e382d;font:15px/1.7 Arial,Helvetica,sans-serif}main{max-width:800px;margin:auto;background:#fffdfa;border:1px solid #e7dbcf;border-radius:14px;overflow:hidden}header{padding:28px 32px;text-align:center;background:#f3e4dc;border-bottom:1px solid #ead9cf}header img{display:block;width:280px;max-width:100%;height:auto;margin:auto}.contract-body{padding:32px 40px 36px}.document-note{margin:0 0 28px;color:#80695c;font-size:12px;line-height:1.6}h1,h2,h3{color:#5b392c;line-height:1.3;break-after:avoid}h1,h2{font-family:Georgia,'Times New Roman',serif;font-weight:normal;text-transform:none}h1{font-size:32px;margin:0 0 12px}h2{font-size:23px;padding-top:24px;margin:28px 0 16px;border-top:1px solid #e7dbcf}h3{font-size:13px;margin:20px 0 8px}.contract-field{display:grid;grid-template-columns:145px minmax(0,1fr);gap:4px 16px;padding:10px 14px;margin:0;background:#faf5f0;border-bottom:1px solid #ecdfd3;break-inside:avoid;white-space:pre-wrap;overflow-wrap:anywhere}.contract-field span{font-size:12px;color:#80695c}.contract-field strong{font-size:14px;font-weight:600;line-height:1.6}.contract-total{background:#f3e4dc}.contract-total strong{font-size:18px}.contract-paragraph{margin:12px 0;white-space:pre-wrap;overflow-wrap:anywhere}.contract-images{columns:2;column-gap:22px;padding:12px 14px;background:#faf5f0;border:1px solid #ecdfd3;border-radius:8px}.contract-image{margin:0 0 6px;font-size:11px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere;break-inside:avoid}.document-footer{padding:18px 24px;border-top:1px solid #ecdfd3;text-align:center;color:#80695c;font-size:12px;line-height:1.7}.document-footer a{color:#704331;text-decoration:underline}
@media(max-width:480px){body{padding:12px 8px}.contract-body{padding:24px 20px}header{padding:22px 20px}header img{width:240px}h1{font-size:25px}h2{font-size:21px}.contract-field{grid-template-columns:1fr;gap:0;padding:10px 12px}.contract-images{columns:1}}
@page{size:A4;margin:16mm}@media print{body{padding:0;background:#fff;color:#222;font-size:10pt}main{max-width:none;margin:0;border:0;border-radius:0;overflow:visible}header{padding:0 0 18px;background:#fff;break-inside:avoid;break-after:avoid}header img{width:210px}.contract-body{padding:22px 0}.document-note{font-size:9pt}h1{font-size:23pt}h2{font-size:16pt}.contract-field{grid-template-columns:125px minmax(0,1fr);padding:7px 10px}.contract-field strong{font-size:10pt}.contract-field span{font-size:9pt}.contract-total strong{font-size:12pt}.contract-images{columns:2}.document-footer{break-inside:avoid}a{color:inherit;text-decoration:none}}
/* Consistent document rows; source text remains unchanged, including historical receipts. */
.contract-field,.contract-total,.contract-images,.contract-paragraph,[data-contract-text]>h3{background:#faf5f0;border:0;border-bottom:1px solid #ecdfd3;border-radius:0;margin:0;padding:12px 14px}
.contract-field span,.contract-field strong,.contract-image,.contract-total strong,.contract-paragraph,[data-contract-text]>h3{font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6}
.contract-field strong{font-weight:500}.contract-images{columns:1}.contract-image{margin:0;padding:4px 0;font-weight:500}.contract-paragraph{font-weight:400}.contract-generated-label::before{content:attr(data-label)}[data-contract-text]>h3{font-weight:400;color:#80695c;padding-bottom:4px;border-bottom:0}
@media print{.contract-field span,.contract-field strong,.contract-image,.contract-total strong,.contract-paragraph,[data-contract-text]>h3{font-size:10pt}.contract-images{columns:1}}
</style></head><body><main><header><img src="${contractLogoDataUrl}" width="280" alt="LiZa Memories Photography"></header><div class="contract-body"><p class="document-note">Für deine Unterlagen · Die Angaben, Bestellbedingungen und Erklärungen entsprechen dem gespeicherten Stand deiner Bestellung. Du kannst diese Datei aufbewahren und über die Druckfunktion als PDF speichern.</p><div data-contract-text>${contractMarkup(receiptText)}</div></div><footer class="document-footer"><a href="${mailWebsite}">LiZa Memories Photography</a><br>Deine vollständige Vertragsbestätigung · Bitte bewahre sie auf.</footer></main></body></html>`;
  return { filename: contractFilename(orderId), html: content, contentType: 'text/html; charset=utf-8' };
}
function mailContractAttachment(receiptText, orderId) {
  const document = renderPortalDocument({ receiptText, orderId });
  return { filename: document.filename, content: mailBase64(document.html), content_type: document.contentType };
}

/** The existing legal acknowledgement is styled without changing its wording. */
export function renderWithdrawalEmail({ notice, customerName, customerEmail, galleryName, orderId, paymentReference, actionUrl, admin = false }) {
  if (typeof notice !== 'string' || !notice) throw new TypeError('Die gespeicherte Rücktrittserklärung ist erforderlich.');
  const url = mailUrl(actionUrl, 'actionUrl');
  if (!url) throw new TypeError('Für diese E-Mail ist eine passende HTTP(S)-URL erforderlich.');
  const name = mailLine(customerName), reference = mailLine(paymentReference) || mailLine(orderId);
  const subject = admin ? `Rücktrittserklärung · ${reference}` : `Eingang deiner Rücktrittserklärung · ${reference}`;
  const title = admin ? 'Neue Rücktrittserklärung' : 'Dein Rücktritt ist eingegangen';
  const greeting = admin ? 'Hallo Emina,' : name ? `Hallo ${name},` : 'Hallo,';
  const rows = [['Bestellung', reference], ['Galerie', mailLine(galleryName)], ...(admin ? [['Kunde', name], ['E-Mail', mailLine(customerEmail)]] : [])];
  const noticeParagraphs = notice.split(/ (?=Sie wird von Emina geprüft\.|Dies ist eine Eingangsbestätigung|Falls digitale Inhalte|Bei Fragen:)/);
  const content = mailParagraph(mailEscape(greeting)) + mailRows(rows) + noticeParagraphs.map((paragraph, index) => mailParagraph(mailEscape(paragraph + (index < noticeParagraphs.length - 1 ? ' ' : '')))).join('') + mailButton(admin ? 'Bestellung prüfen' : 'Bestellung ansehen', url);
  return { subject: mailLine(subject), text: [greeting, '', ...rows.filter(row => row[1]).map(([label, value]) => `${label}: ${value}`), '', notice, '', `Bestellung ansehen: ${url}`, '', 'Liebe Grüße,', 'Emina', '', ...mailFooterLinks.map(([label, link]) => `${label}: ${link}`)].join('\n'), html: mailShell(subject, title, content) };
}

/**
 * Render a short customer email; order.receiptText is preserved in one attachment.
 * URLs must be absolute HTTP(S) URLs. Attachments use the Resend API shape.
 * Rendering is pure. The only remote image in the email is the public own-site logo.
 */
export function renderPortalEmail(data) {
  if (!data || typeof data !== 'object' || !mailKinds.has(data.kind)) throw new TypeError('Unbekannte E-Mail-Vorlage.');
  const kind = data.kind;
  const customerName = mailLine(data.customerName);
  const galleryName = mailLine(data.galleryName);
  const businessName = mailLine(data.businessName) || mailDefaultBusiness;
  const orderId = mailLine(data.orderId);
  const reference = mailLine(data.paymentReference) || orderId;
  const customCopy = data.customCopy && typeof data.customCopy === 'object' ? data.customCopy : {};
  const customSubject = typeof customCopy.subject === 'string' ? mailLine(customCopy.subject).slice(0, 160) : '';
  const introText = fallback => typeof customCopy.intro === 'string' && mailLine(customCopy.intro) ? mailLine(customCopy.intro).slice(0, 1000) : fallback;
  const galleryUrl = mailUrl(data.galleryUrl, 'galleryUrl');
  const setupUrl = mailUrl(data.setupUrl, 'setupUrl');
  const actionUrl = mailUrl(data.actionUrl, 'actionUrl');
  const greeting = customerName ? `Hallo ${customerName},` : 'Hallo,';
  const textLines = [greeting, ''];
  let content = mailParagraph(mailEscape(greeting));
  let subject, title, buttonLabel, buttonUrl;
  let attachments;
  if (kind === 'invite') {
    subject = `${data.requiresFinalDelivery ? 'Deine Galerie ist bereit' : 'Deine Bilder sind fertig'}${galleryName ? ` · ${galleryName}` : ''}`;
    title = data.requiresFinalDelivery ? 'Deine Galerie ist bereit!' : 'Deine Bilder sind fertig!';
    const intro = introText(galleryName ? `Deine Galerie „${galleryName}“ ist bereit. Viel Freude beim Anschauen und Auswählen!` : 'Deine Galerie ist bereit. Viel Freude beim Anschauen und Auswählen!');
    content += mailParagraph(mailEscape(intro));
    textLines.push(intro, '');
    buttonLabel = setupUrl ? 'Passwort festlegen' : 'Deine Galerie öffnen';
    buttonUrl = setupUrl || galleryUrl;
    content += mailButton(buttonLabel, buttonUrl);
    textLines.push(`${buttonLabel}:`, buttonUrl, '');
    if (setupUrl) {
      const note = 'Lege dein eigenes Passwort fest. Danach öffnet sich deine Galerie. Der Link ist 30 Minuten gültig und einmal verwendbar.';
      content += mailParagraph(mailEscape(note), true);
      textLines.push(note);
      if (galleryUrl) {
        content += mailParagraph(`Link abgelaufen? Öffne <a href="${mailEscape(galleryUrl)}" style="color:#704331;text-decoration:underline">deine Galerie</a> und wähle „Zugang einrichten“.`, true);
        textLines.push(`Link abgelaufen? Öffne deine Galerie und wähle „Zugang einrichten“: ${galleryUrl}`);
      }
    }
  } else if (kind === 'setup' || kind === 'reset') {
    const setup = kind === 'setup';
    subject = setup ? 'Dein Zugang zu deinen Bildern' : 'Dein neues Passwort';
    title = setup ? 'Willkommen in deiner Galerie!' : 'Dein neues Passwort';
    const intro = introText(setup ? 'Lege dein eigenes Passwort fest, um deine Bilder anzusehen.' : 'Über diesen Link kannst du ein neues Passwort festlegen.');
    content += mailParagraph(mailEscape(intro));
    textLines.push(intro, '');
    buttonLabel = setup ? 'Eigenes Passwort festlegen' : 'Neues Passwort festlegen';
    buttonUrl = (setup ? setupUrl : actionUrl) || actionUrl || setupUrl;
    content += mailButton(buttonLabel, buttonUrl);
    textLines.push(`${buttonLabel}:`, buttonUrl, '');
    const note = 'Der Link ist 30 Minuten gültig und einmal verwendbar.';
    content += mailParagraph(mailEscape(note), true);
    textLines.push(note);
    if (setup && galleryUrl) {
      content += mailParagraph(`Link abgelaufen? Öffne <a href="${mailEscape(galleryUrl)}" style="color:#704331;text-decoration:underline">deine Galerie</a> und wähle „Zugang einrichten“.`, true);
      textLines.push(`Link abgelaufen? Öffne deine Galerie und wähle „Zugang einrichten“: ${galleryUrl}`);
    }
    const security = 'Wenn du diese Nachricht nicht angefordert hast, kannst du sie ignorieren.';
    content += mailParagraph(mailEscape(security), true);
    textLines.push(security);
  } else if (kind === 'order') {
    const paid = data.paymentStatus === 'paid';
    subject = `Deine Fotobestellung${reference ? ` · ${reference}` : ''}`;
    title = 'Danke für deine Bestellung!';
    const intro = introText(paid ? (data.deliveryPending ? 'Deine Zahlung ist bestätigt. Deine ausgewählten Bilder werden jetzt fertiggestellt.' : 'Deine Zahlung ist bestätigt. Deine bestellten Bilder findest du in deiner Galerie.') : (data.requiresFinalDelivery ? 'Deine Lieblingsbilder sind bestellt. Bitte überweise den Betrag mit dem unten angegebenen Verwendungszweck.' : 'Deine Lieblingsbilder sind bestellt. Bitte überweise den Betrag mit dem unten angegebenen Verwendungszweck. Nach der Zahlungsbestätigung werden deine Downloads freigegeben.'));
    content += mailParagraph(mailEscape(intro));
    textLines.push(intro, '');
    if (data.requiresFinalDelivery) {
      const deliveryNote = data.deliveryPending
        ? 'Deine Downloads bleiben bis zur Fertigstellung aller bestellten Bilder gesperrt. Sobald deine fertigen Bilder freigegeben sind, erhältst du eine eigene E-Mail. Du lädst dann die bearbeiteten Originaldateien in voller Qualität herunter.'
        : paid
          ? 'Alle bestellten Bilder sind fertiggestellt. Für die Downloadfreigabe erhältst du eine eigene E-Mail. Du lädst die bearbeiteten Originaldateien in voller Qualität herunter.'
          : 'Nach Zahlungseingang werden deine ausgewählten Bilder fertiggestellt. Sobald alle bestellten Bilder bereit sind, erhältst du eine eigene E-Mail zur Downloadfreigabe. Die Auswahlbilder bleiben bis dahin geschützt.';
      content += mailParagraph(mailEscape(deliveryNote), true);
      textLines.push(deliveryNote, '');
    }
    const amount = mailMoney(data.amountCents, data.currency);
    const count = Number.isSafeInteger(data.imageCount) && data.imageCount >= 0 ? `${data.imageCount} ${data.imageCount === 1 ? 'Bild' : 'Bilder'}` : '';
    const summary = [['Galerie', galleryName], ['Paket', mailLine(data.packageName)], ['Auswahl', count], ['Gesamtbetrag', amount]];
    content += mailRows(summary);
    textLines.push(...summary.filter(row => row[1] !== '').map(([label, value]) => `${label}: ${value}`));
    if (Array.isArray(data.imageTitles) && data.imageTitles.length) {
      const titles = data.imageTitles.slice(0, 3).map(value => { const title = mailLine(value).replace(/\s*\([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\)\s*$/i, ''); return title.length > 45 ? `${title.slice(0, 44)}…` : title; }).filter(Boolean);
      const selected = `Deine Auswahl: ${titles.join(', ')}${data.imageTitles.length > 3 ? ` und ${data.imageTitles.length - 3} weitere` : ''}.`;
      content += mailParagraph(mailEscape(selected), true);
      textLines.push(selected);
    }
    if (!paid && data.bank) {
      const bank = [['Empfänger', mailLine(data.bank.recipient)], ['IBAN', mailLine(data.bank.iban)], ['BIC', mailLine(data.bank.bic)], ['Betrag', amount], ['Verwendungszweck', reference]];
      content += '<h2 style="margin:0 0 10px;color:#5b392c;font-family:Georgia,\'Times New Roman\',serif;font-size:22px;font-weight:normal;line-height:1.3">Deine Überweisung</h2>' + mailRows(bank, true);
      textLines.push('', 'Deine Überweisung', ...bank.filter(row => row[1] !== '').map(([label, value]) => `${label}: ${value}`));
    } else if (reference) {
      content += mailParagraph(`Bestellnummer: ${mailEscape(reference)}`, true);
      textLines.push(`Bestellnummer: ${reference}`);
    }
    buttonLabel = paid && !data.deliveryPending ? 'Zu deinen Bildern' : 'Bestellung ansehen';
    buttonUrl = actionUrl || galleryUrl;
    content += mailButton(buttonLabel, buttonUrl);
    textLines.push('', `${buttonLabel}:`, buttonUrl);
    if (!paid && data.bank) {
      const copyNote = 'In deiner Bestellung kannst du die Überweisungsdaten mit einem Klick kopieren.';
      content += mailParagraph(mailEscape(copyNote), true);
      textLines.push('', copyNote);
    }
    if (data.invoiceFilename) {
      const invoiceNote = 'Deine Rechnung findest du im Anhang und bei deiner Bestellung im Portal.';
      content += mailParagraph(mailEscape(invoiceNote), true);
      textLines.push('', invoiceNote);
    }
    if (typeof data.receiptText === 'string' && data.receiptText.length) {
      attachments = [mailContractAttachment(data.receiptText, orderId)];
      const note = 'Deine vollständige Vertragsbestätigung mit den Bestellbedingungen und Rücktrittsinformationen findest du im Anhang. Bitte bewahre sie auf.';
      content += mailParagraph(mailEscape(note), true);
      textLines.push('', note);
    }
  } else {
    subject = 'Deine Bilder sind zum Download bereit';
    title = 'Deine Downloads sind bereit!';
    const intro = introText(galleryName ? `Die Bilder aus deiner Galerie „${galleryName}“ kannst du jetzt herunterladen.` : 'Deine bestellten Bilder kannst du jetzt herunterladen.');
    content += mailParagraph(mailEscape(intro));
    textLines.push(intro, '');
    buttonLabel = 'Bilder herunterladen';
    buttonUrl = actionUrl || galleryUrl;
    content += mailButton(buttonLabel, buttonUrl);
    textLines.push(`${buttonLabel}:`, buttonUrl, '');
    const note = 'Ist deine Galerie schon geöffnet? Lade die Seite einmal neu, damit die Downloads erscheinen.';
    content += mailParagraph(mailEscape(note), true);
    textLines.push(note);
  }
  if (!buttonUrl) throw new TypeError('Für diese E-Mail ist eine passende HTTP(S)-URL erforderlich.');
  subject = customSubject || subject;
  textLines.push('', 'Liebe Grüße,', 'Emina', '', ...mailFooterLinks.map(([label, url]) => `${label}: ${url}`));
  const result = { subject: mailLine(subject), text: textLines.join('\n'), html: mailShell(subject, title, content) };
  if (attachments) result.attachments = attachments;
  return result;
}
