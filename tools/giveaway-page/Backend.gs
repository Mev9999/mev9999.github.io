// Only the entry endpoint is public. Keep the Google spreadsheet restricted.
const SHEET_ID = '1IbP5murCkSfThFUa38PvIdXx-oyxZh2ffS7VnLIdsMk';
const START = Date.parse('2026-10-01T00:00:00+02:00');
const END = Date.parse('2026-10-14T23:59:59+02:00');
const TEXT_VERSION = '2026-09-25-v3';
const ORIGINS = ['https://liza-memories-photography.com', 'https://www.liza-memories-photography.com', 'http://127.0.0.1:8771', 'http://127.0.0.1:8772'];
const INSTAGRAM_HEADERS = ['Instagram-Name','Folgt (Prüfstatus)','Kommentar (Prüfstatus)','Geteilt (Prüfstatus)','Instagram geprüft am'];
function instagramKey_(value) { return String(value || '').trim().replace(/^@/, '').toLowerCase(); }
function ensureInstagramColumns_(sheet) { sheet.getRange(1, 13, 1, INSTAGRAM_HEADERS.length).setValues([INSTAGRAM_HEADERS]); }
function aktualisiereInstagramSpalten() { const sheet=SpreadsheetApp.openById(SHEET_ID).getSheetByName('Teilnahmen'); if(!sheet)throw Error('Missing sheet'); ensureInstagramColumns_(sheet); SpreadsheetApp.flush(); }
function doGet() { return HtmlService.createHtmlOutput('LiZa Memories Photography – Anmeldung über die Gewinnspielseite.'); }
function emailKey_(value) {
  const parts = value.trim().toLowerCase().split('@');
  if (parts.length !== 2) return value;
  if (parts[1] === 'gmail.com' || parts[1] === 'googlemail.com') return parts[0].split('+')[0].replace(/\./g, '') + '@gmail.com';
  return parts.join('@');
}
function nameKey_(value) { return value.normalize('NFKC').trim().toLocaleLowerCase('de').replace(/\s+/g, ' '); }
function safeCell_(value) { return /^[=+@\-]/.test(value) ? "'" + value : value; }
function doPost(e) { return processEntry_(e, new Date(), 'Teilnahmen'); }
function processEntry_(e, now, sheetName) {
  const p = e && e.parameter || {};
  if (+now < START || +now > END) return reply_(p, false, 'Die Teilnahme ist vom 1. Oktober bis 14. Oktober 2026 möglich.');
  if (e.postData && e.postData.length > 12000) return reply_(p, false, 'Die Anfrage ist zu groß. Bitte prüfe deine Angaben.');
  const name = String(p.name || '').trim(), email = String(p.email || '').trim().toLowerCase();
  if (!ORIGINS.includes(p.parent_origin) || !/^[a-f0-9]{32}$/.test(p.request_id || '') || p.website ||
      name.length < 3 || name.length > 120 || !/\S+\s+\S+/.test(name) || /[\x00-\x1f]/.test(name) ||
      email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      p.eligibility !== 'on' || p.terms !== 'on' || p.text_version !== TEXT_VERSION) {
    return reply_(p, false, 'Bitte gib deinen vollständigen Namen und eine gültige E-Mail-Adresse ein und bestätige die Teilnahmevoraussetzungen.');
  }
  const instagram = instagramKey_(p.instagram);
  if (!/^[a-z0-9_]+(?:[.][a-z0-9_]+)*$/.test(instagram) || instagram.length > 30) return reply_(p, false, 'Bitte gib einen gültigen Instagram-Benutzernamen ein.');
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return reply_(p, false, 'Bitte versuche es in einer Minute erneut.');
  try {
    const cache = CacheService.getScriptCache(), key = 'minute-' + Math.floor(+now / 60000), requests = Number(cache.get(key) || 0);
    if (requests >= 60) return reply_(p, false, 'Gerade kommen sehr viele Anmeldungen an. Bitte versuche es in einer Minute erneut.');
    cache.put(key, String(requests + 1), 120);
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(sheetName);
    if (!sheet) throw new Error('Missing sheet');
    ensureInstagramColumns_(sheet);
    const last = sheet.getLastRow(), rows = last > 1 ? sheet.getRange(2, 1, last - 1, 17).getValues() : [];
    const duplicate = rows.some(row => emailKey_(String(row[3]).replace(/^'/, '')) === emailKey_(email));
    if (!duplicate) {
      const sameName = rows.some(row => nameKey_(String(row[2]).replace(/^'/, '')) === nameKey_(name));
      const sameInstagram=rows.some(row => instagramKey_(row[12]) === instagram);
      sheet.appendRow([Utilities.getUuid(), now, safeCell_(name), safeCell_(email), true, true,
        p.marketing === 'on', p.photo_publication === 'on', p.newsletter === 'on', TEXT_VERSION,
        sameInstagram ? 'Instagram-Mehrfachangabe prüfen' : sameName ? 'Namensgleichheit prüfen' : 'Instagram-Prüfung offen',
        sameName ? 'Gleicher Name vorhanden – kein automatischer Ausschluss. Identität vor Gewinnvergabe prüfen.' : 'Identität und E-Mail nicht geprüft', instagram, 'ungeprüft', 'ungeprüft', 'ungeprüft', '']);
      SpreadsheetApp.flush();
    }
    // No disclosure of whether somebody else's email was already registered.
    return reply_(p, true, 'Vielen Dank! Deine Teilnahme ist erfasst oder war mit dieser E-Mail-Adresse bereits vorhanden. Jede Person darf einmal teilnehmen. Falls du gewinnst, melde ich mich persönlich per E-Mail bei dir. Viel Glück!');
  } catch (error) {
    return reply_(p, false, 'Deine Teilnahme konnte nicht bestätigt werden. Bitte versuche es später erneut. Mit derselben E-Mail-Adresse entsteht kein doppelter Eintrag.');
  } finally { lock.releaseLock(); }
}
function reply_(p, ok, message) {
  const origin = ORIGINS.includes(p.parent_origin) ? p.parent_origin : ORIGINS[0];
  const requestId = /^[a-f0-9]{32}$/.test(p.request_id || '') ? p.request_id : '';
  const data = JSON.stringify({type:'liza-giveaway-result',requestId:requestId,ok:ok,message:message}).replace(/</g, '\\u003c');
  return ContentService.createTextOutput(data).setMimeType(ContentService.MimeType.JSON);
}

// Owner-only editor test. Not called by the public endpoint; uses synthetic data in a separate sheet.
function pruefeVerbindung() {
  const book = SpreadsheetApp.openById(SHEET_ID);
  const sheetName = 'Techniktest';
  const sheet = book.getSheetByName(sheetName) || book.insertSheet(sheetName);
  if (!sheet.getLastRow()) sheet.appendRow(['Teilnahme-ID','Eingang','Name','E-Mail','Berechtigt','Bedingungen','Werbung','Fotos','Newsletter','Textversion','Status','Anmerkung']);
  const before = sheet.getLastRow();
  const address = 'test-' + Utilities.getUuid() + '@example.invalid';
  const event = {parameter:{name:'Technischer Test',email:address,instagram:'liza_techniktest',eligibility:'on',terms:'on',parent_origin:ORIGINS[2],request_id:'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',text_version:TEXT_VERSION}};
  const first = processEntry_(event, new Date('2026-10-02T12:00:00+02:00'), sheetName).getContent();
  const second = processEntry_(event, new Date('2026-10-02T12:00:00+02:00'), sheetName).getContent();
  if (!first.includes('"ok":true') || !second.includes('"ok":true') || sheet.getLastRow() !== before + 1) throw new Error('Speicher-/Duplikattest fehlgeschlagen');
  sheet.getRange(sheet.getLastRow(), 12).setValue('TECHNIKTEST – keine Teilnahme, kein Versand, nicht auslosen');
  console.log('BESTANDEN: Google speichert eine Testzeile; erneute identische Einsendung erzeugt keine zweite. Echte Teilnahmen unverändert.');
}
