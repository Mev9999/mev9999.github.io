import { renderGiftVoucherPdf, voucherPdfTextSupported } from './voucher-pdf.mjs';
import { renderVoucherEmail, renderPortalDocument } from './mail-templates.mjs';

// Stored balances and reservations are money. Each operation is claimed, applied
// and journaled in one D1 transaction; a retried key can never spend twice.
const VOUCHER_TERMS_VERSION = 'gift-2026-10-23-v2';
const VOUCHER_DAY = 86400000;
const voucherEncoding = new TextEncoder();
const voucherStatement = (env, sql, ...args) => env.DB.prepare(sql).bind(...args);
const voucherFirst = (env, sql, ...args) => voucherStatement(env, sql, ...args).first();
async function voucherRows(env, sql, ...args) { return (await voucherStatement(env, sql, ...args).all()).results || []; }
function voucherMoney(value, language = 'de') { return new Intl.NumberFormat({ de:'de-AT',en:'en-IE',bs:'bs-BA' }[language], { style:'currency',currency:'EUR' }).format(value / 100); }
function voucherDate(value) { return value == null ? null : new Date(value).toISOString(); }
// The first successful gift-mail submission starts the additional online window.
// An order/payment date alone never expires it, and resending never restarts it.
// A later statutory start or extension can still be asserted by contacting us.
function voucherWithdrawalDeadline(row) { return row.gift_sent_at == null ? null : row.gift_sent_at + 14 * VOUCHER_DAY; }
function voucherKey(value, fail) { if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{16,120}$/.test(value)) fail(400, 'Bitte lade die Seite neu und versuche es erneut.', 'invalid_idempotency_key'); return value; }
function voucherAmount(value, fail, purchase = false) { if (!Number.isSafeInteger(value) || value < (purchase ? 1000 : 1) || value > 200000) fail(400, purchase ? 'Bitte wähle einen Gutscheinwert zwischen 10 € und 2.000 €.' : 'Bitte gib einen gültigen Betrag ein.', 'invalid_amount'); return value; }
async function voucherReady(env, fail) {
  const found = await voucherRows(env, "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('gift_vouchers','voucher_operations','voucher_reservations')");
  if (found.length !== 3) fail(503, 'Der Gutscheinkauf ist noch nicht eingerichtet.', 'vouchers_not_configured');
}
function voucherToken(row, env, helpers) { return helpers.hmac(env.PASSWORD_PEPPER, `voucher-access/${row.id}/${row.purchase_key}`); }
async function voucherStatusUrl(row, env, helpers) {
  const suffix = row.language === 'de' ? '' : '-' + row.language;
  return `${helpers.portalOrigin(env)}${helpers.portalPath(env)}gutscheine-kaufen${suffix}.html#order=${encodeURIComponent(row.id)}&token=${await voucherToken(row, env, helpers)}`;
}
async function voucherObject(env, row, admin = false, entries = null) {
  const paid = Boolean(row.paid_at); const active = paid && row.status === 'active';
  const result = { id:row.id, reference:row.reference, status:row.status, paymentStatus:row.status==='refunded'?'refunded':paid?'paid':'unpaid', amountCents:row.amount_cents, balanceCents:row.balance_cents, reservedCents:row.reserved_cents, availableCents:active?row.balance_cents-row.reserved_cents:0, currency:'EUR', buyerName:row.buyer_name, buyerEmail:row.buyer_email, buyerAddress:row.buyer_address, giftTo:row.gift_to, giftFrom:row.gift_from, message:row.gift_message, language:row.language, code:paid?row.code:null, createdAt:voucherDate(row.created_at), paidAt:voucherDate(row.paid_at), firstGiftSentAt:voucherDate(row.gift_sent_at), withdrawUntil:voucherDate(voucherWithdrawalDeadline(row)), withdrawalAt:voucherDate(row.withdrawal_at), refundedAt:voucherDate(row.refunded_at), confirmationSent:Boolean(row.confirmation_sent_at), giftSent:Boolean(row.gift_sent_at), termsVersion:row.terms_version };
  if (admin) {
    result.reservations = (entries?.reservations || await voucherRows(env, 'SELECT * FROM voucher_reservations WHERE voucher_id=? ORDER BY created_at DESC', row.id)).map(item=>({id:item.id,amountCents:item.amount_cents,bookingReference:item.booking_reference,status:item.status,createdAt:voucherDate(item.created_at)}));
    result.ledger = (entries?.ledger || await voucherRows(env, 'SELECT * FROM voucher_operations WHERE voucher_id=? AND applied=1 ORDER BY created_at DESC LIMIT 500', row.id)).map(item=>({id:item.id,kind:item.kind,amountCents:item.amount_cents,bookingReference:item.booking_reference,reservationId:item.reservation_id,createdAt:voucherDate(item.created_at)}));
    result.pdfUrl = paid ? `/api/admin/vouchers/${row.id}/pdf` : null;
  } else result.contractText = row.contract_text;
  return result;
}
async function voucherEnvelope(env, row, helpers) {
  const order = await voucherObject(env,row); const bank = helpers.bankDetails(env);
  return { order, voucher:row.paid_at?{code:row.code,balanceCents:row.balance_cents,availableCents:order.availableCents}:null, statusUrl:await voucherStatusUrl(row,env,helpers), transfer:bank?{...bank,reference:row.reference,amountCents:row.amount_cents}:null };
}
function voucherWithdrawalNotice(language) {
  return {
    de:'Du kannst ohne Angabe von Gründen vom Gutscheinkauf zurücktreten. Vor dem ersten erfolgreichen Versand des freigeschalteten Gutscheins per E-Mail ist dies jederzeit möglich; danach stehen dir mindestens 14 Tage ab diesem Versand zur Verfügung. Eine erneute Zusendung startet die Frist nicht neu. Gesetzliche Verlängerungen oder ein späterer gesetzlicher Fristbeginn bleiben unberührt.',
    en:'You may withdraw from the voucher purchase without giving a reason. You may do so at any time before the activated voucher is first successfully sent by email, and for at least 14 days after that first sending. Resending does not restart the period. Any statutory extension or later statutory start of the period remains unaffected.',
    bs:'Od kupovine bona možeš odustati bez navođenja razloga. To je moguće u bilo kojem trenutku prije prvog uspješnog slanja aktiviranog bona e-poštom, a nakon toga najmanje 14 dana od tog prvog slanja. Ponovno slanje ne pokreće rok iznova. Zakonska produženja ili kasniji zakonski početak roka ostaju nepromijenjeni.'
  }[language];
}
function voucherContract(data, reference, contact) {
  const amount = voucherMoney(data.amountCents,data.language);
  const common = `Bestellt am: ${new Date(data.createdAt).toISOString()}\nLiZa Memories Photography · ${contact.name || 'Emina Huremovic'}\n${contact.address || ''}\n${contact.email}\n\n${reference}\n${data.buyerName}\n${data.buyerEmail}\n${data.buyerAddress}\n\n`;
  const terms = {
    de:`Wertgutschein über ${amount} (EUR), Zahlung per Überweisung. Kein Versandentgelt. Der Gutschein wird nach Bestätigung des Zahlungseingangs als PDF an die angegebene E-Mail-Adresse verschickt.\n\nDer Gutschein kann nach Terminvereinbarung für reguläre Shootings und vereinbarte zusätzliche Bilder bei LiZa Memories Photography verwendet werden. Organisierte Krippen-, Kindergarten- und Schulfototage sind ausgenommen. Restguthaben bleibt erhalten. Eine unverbindliche Anfrage verbraucht kein Guthaben. Es gelten die zum Buchungszeitpunkt vereinbarten Shootingpreise; ein bestimmtes Paket oder Termin wird mit dem Wertgutschein nicht zugesagt. Keine Barauszahlung des Restguthabens, gesetzliche Rückzahlungsansprüche bleiben unberührt. Der Gutschein ist übertragbar; der Code muss deshalb vertraulich aufbewahrt werden. Keine vertragliche Befristung; gesetzliche Verjährung bleibt unberührt.\n\nRücktritt: ${voucherWithdrawalNotice(data.language)} Dafür genügt eine eindeutige Erklärung per E-Mail an ${contact.email} oder über den Rücktritt-Button im geschützten Bestelllink. Du kannst das Muster-Rücktrittsformular verwenden, musst dies aber nicht. Der Versand der PDF allein beendet das Rücktrittsrecht nicht. Ein Rücktritt sperrt den Code sofort für weitere Einlösungen. Eine bereits erfolgte Einlösung muss vor einer Erstattung geprüft werden. Eine gesetzlich geschuldete Rückzahlung erfolgt grundsätzlich binnen 14 Tagen ab Eingang des Rücktritts mit demselben Zahlungsmittel, sofern nicht ausdrücklich etwas anderes vereinbart wurde.\n\nMuster-Rücktrittserklärung: Hiermit trete ich vom Vertrag über den Kauf des Wertgutscheins ${reference} zurück. Name, Anschrift, bestellt am, erhalten am, Datum; Unterschrift nur auf Papier.`,
    en:`Value voucher of ${amount} (EUR), payable by bank transfer. No delivery charge. After payment is confirmed, the voucher PDF is emailed to the buyer.\n\nRedeemable by appointment for regular photo sessions and agreed additional images at LiZa Memories Photography. Organised nursery, kindergarten and school photo days are excluded. Remaining credit is retained. An enquiry does not use the credit. Prices are agreed when booking; the value voucher does not guarantee a particular package or appointment. No cash payment of unused credit, without affecting statutory refund rights. Transferable; keep the code private. No contractual expiry; statutory limitation periods remain applicable.\n\nWithdrawal: ${voucherWithdrawalNotice(data.language)} Send an unequivocal email to ${contact.email} or use the withdrawal button in the private order link. Use of a model form is optional. Sending the PDF alone does not end this right. Withdrawal immediately blocks further redemption. Any previous redemption must be reviewed before refunding. Statutory refunds are generally made within 14 days of receiving withdrawal using the original payment method unless otherwise expressly agreed.\n\nModel withdrawal: I withdraw from my purchase of value voucher ${reference}. Name, address, ordered on, received on, date; signature only on paper.`,
    bs:`Vrijednosni poklon-bon od ${amount} (EUR), uplata na račun. Bez troškova dostave. PDF se šalje kupcu e-poštom nakon potvrde uplate.\n\nVrijedi uz dogovor termina za redovna fotografisanja i dogovorene dodatne fotografije kod LiZa Memories Photography. Organizovani dani fotografisanja u jaslicama, vrtićima i školama nisu uključeni. Preostali iznos ostaje na bonu. Upit ne troši kredit. Cijene se dogovaraju pri rezervaciji; bon ne garantuje određeni paket ili termin. Bez isplate ostatka u gotovini, ne dovodeći u pitanje zakonska prava na povrat. Bon je prenosiv; čuvajte kod. Nema ugovornog roka isteka; zakonska zastara ostaje primjenjiva.\n\nOdustanak: ${voucherWithdrawalNotice(data.language)} Pošalji jasnu poruku na ${contact.email} ili koristi dugme u zaštićenom linku narudžbe. Korištenje obrasca nije obavezno. Samo slanje PDF-a ne ukida pravo na odustanak. Prijava odustanka odmah blokira daljnje korištenje. Ranije iskorišteni iznos provjerava se prije povrata. Zakonski povrat obično se vrši u roku od 14 dana od primitka odustanka istim načinom plaćanja, osim ako je izričito dogovoreno drugačije.\n\nPrimjer izjave: Odustajem od kupovine poklon-bona ${reference}. Ime, adresa, naručeno dana, primljeno dana, datum; potpis samo na papiru.`
  };
  return common + terms[data.language] + `\n\n${VOUCHER_TERMS_VERSION}`;
}
function voucherBase64(bytes) { let binary=''; for (let offset=0;offset<bytes.length;offset+=16384) binary+=String.fromCharCode(...bytes.subarray(offset,offset+16384)); return btoa(binary); }
async function voucherPdf(row) { return renderGiftVoucherPdf({code:row.code,amountCents:row.amount_cents,giftTo:row.gift_to,giftFrom:row.gift_from,message:row.gift_message,issuedAt:row.paid_at,language:row.language}); }
async function voucherSendMail(env,row,kind,helpers,force=false) {
  const gift = kind==='gift'; const sentColumn = gift?'gift_sent_at':'confirmation_sent_at'; const leaseColumn = gift?'gift_lease_at':'confirmation_lease_at';
  if (gift && (!row.paid_at || row.status!=='active')) return false;
  if (!force && row[sentColumn]) return true;
  const now=Date.now();
  const claim=await voucherFirst(env, `UPDATE gift_vouchers SET ${leaseColumn}=? WHERE id=? ${force?'':`AND ${sentColumn} IS NULL`} AND (${leaseColumn} IS NULL OR ${leaseColumn}<?) RETURNING id`,now,row.id,now-10*60000);
  if (!claim) return Boolean((await voucherFirst(env,'SELECT * FROM gift_vouchers WHERE id=?',row.id))[sentColumn]);
  try {
    const statusUrl=await voucherStatusUrl(row,env,helpers);
    const message=renderVoucherEmail({kind,language:row.language,customerName:row.buyer_name,reference:row.reference,amountCents:row.amount_cents,giftTo:row.gift_to,code:row.code,actionUrl:statusUrl,bank:helpers.bankDetails(env),withdrawalNotice:voucherWithdrawalNotice(row.language)});
    // Only presentation changes: the attachment always uses the saved contract.
    const contract=renderPortalDocument({receiptText:row.contract_text,orderId:row.reference,language:row.language});
    const attachments=[{filename:`Bestellbestaetigung-${row.reference}.html`,content_type:contract.contentType,content:voucherBase64(voucherEncoding.encode(contract.html))}];
    if (gift) attachments.unshift({filename:`Gutschein-${row.reference}.pdf`,content_type:'application/pdf',content:voucherBase64(await voucherPdf(row))});
    await helpers.mail(env,{to:row.buyer_email,...message,attachments,idempotencyKey:`voucher-${kind}/${row.id}${force?'/'+now:''}`});
    await voucherStatement(env,`UPDATE gift_vouchers SET ${sentColumn}=COALESCE(${sentColumn},?),${leaseColumn}=NULL WHERE id=? AND ${leaseColumn}=?`,Date.now(),row.id,now).run();
    return true;
  } catch { await voucherStatement(env,`UPDATE gift_vouchers SET ${leaseColumn}=NULL WHERE id=? AND ${leaseColumn}=?`,row.id,now).run(); return false; }
}
async function voucherPurchase(request,env,helpers) {
  helpers.sameOrigin(request,env); const data=await helpers.body(request); const key=voucherKey(data.idempotencyKey,helpers.fail);
  const amountCents=voucherAmount(data.amountCents,helpers.fail,true); const buyerEmail=helpers.normalizeEmail(data.buyerEmail);
  await helpers.authRate(request,env,buyerEmail,'voucher-purchase');
  if (!helpers.bankDetails(env) || !helpers.capabilities(env).email) helpers.fail(503,'Der Gutscheinkauf ist noch nicht vollständig eingerichtet.','vouchers_not_configured');
  if (data.termsAccepted!==true) helpers.fail(400,'Bitte bestätige die Gutscheinbedingungen und die Rücktrittsinformation.','voucher_terms_required');
  const values={amountCents,buyerName:helpers.textField(data.buyerName,120),buyerEmail,buyerAddress:helpers.textField(data.buyerAddress,500),giftTo:helpers.textField(data.giftTo,80,false),giftFrom:helpers.textField(data.giftFrom,80,false),message:helpers.textField(data.message,300,false),language:['de','en','bs'].includes(data.language)?data.language:'de'};
  if (![values.giftTo,values.giftFrom,values.message].every(voucherPdfTextSupported)) helpers.fail(400,'Bitte verwende für den Gutschein Buchstaben, Zahlen und Satzzeichen ohne Emojis.','unsupported_gift_text');
  try { await renderGiftVoucherPdf({...values,code:'LZ-VORSCHAU-VORSCHAU',preview:true}); }
  catch { helpers.fail(400,'Bitte kürze die Namen oder deine persönliche Nachricht etwas, damit alles schön auf den Gutschein passt.','gift_text_too_long'); }
  // Object field order is intentionally stable, so idempotency detects changed orders.
  const purchaseHash=await helpers.sha256(JSON.stringify(values));
  let row=await voucherFirst(env,'SELECT * FROM gift_vouchers WHERE buyer_email=? AND purchase_key=?',buyerEmail,key); let created=false;
  if (!row) {
    const voucherId=crypto.randomUUID(); const reference='LZ-G'+helpers.randomToken().slice(0,12).toUpperCase(); const now=Date.now();
    const draft={id:voucherId,purchase_key:key}; const access=await voucherToken(draft,env,helpers);
    await voucherStatement(env,`INSERT OR IGNORE INTO gift_vouchers(id,reference,access_hash,purchase_key,purchase_hash,amount_cents,balance_cents,buyer_name,buyer_email,buyer_address,gift_to,gift_from,gift_message,language,terms_version,contract_text,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,voucherId,reference,await helpers.sha256(access),key,purchaseHash,amountCents,amountCents,values.buyerName,buyerEmail,values.buyerAddress,values.giftTo,values.giftFrom,values.message,values.language,VOUCHER_TERMS_VERSION,voucherContract({...values,createdAt:now},reference,helpers.businessContact(env)),now).run();
    row=await voucherFirst(env,'SELECT * FROM gift_vouchers WHERE buyer_email=? AND purchase_key=?',buyerEmail,key); created=row.id===voucherId;
  }
  if (!helpers.safeEqual(row.purchase_hash,purchaseHash)) helpers.fail(409,'Diese Bestellung wurde bereits mit anderen Angaben gespeichert. Bitte starte eine neue Bestellung.','idempotency_conflict');
  const emailSent=await voucherSendMail(env,row,'confirmation',helpers);
  return helpers.json({...await voucherEnvelope(env,await voucherFirst(env,'SELECT * FROM gift_vouchers WHERE id=?',row.id),helpers),accessToken:await voucherToken(row,env,helpers),emailSent},created?201:200);
}
async function voucherBuyer(request,env,voucherId,token,helpers) {
  // Rate limit even unsuccessful token probes, without putting secret tokens in keys.
  await helpers.authRate(request,env,null,'voucher-access');
  if (!/^[a-f0-9]{64}$/.test(token || '')) helpers.fail(404,'Dieser Bestelllink ist ungültig.','voucher_not_found');
  const row=await voucherFirst(env,'SELECT * FROM gift_vouchers WHERE id=?',voucherId);
  if (!row || !helpers.safeEqual(row.access_hash,await helpers.sha256(token))) helpers.fail(404,'Dieser Bestelllink ist ungültig.','voucher_not_found');
  return row;
}
async function voucherPdfResponse(row,helpers) {
  if (!row.paid_at || row.status!=='active') helpers.fail(409,'Der Gutschein ist derzeit nicht freigegeben.','voucher_not_active');
  return new Response(await voucherPdf(row),{headers:{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="Gutschein-${row.reference}.pdf"`}});
}
async function voucherWithdraw(request,env,voucherId,helpers) {
  helpers.sameOrigin(request,env); const data=await helpers.body(request); const row=await voucherBuyer(request,env,voucherId,data.token,helpers);
  if (data.confirmed!==true) helpers.fail(400,'Bitte bestätige den Rücktritt.','confirmation_required');
  if (row.status==='refunded') return helpers.json({ok:true,...await voucherEnvelope(env,row,helpers)});
  const deadline=voucherWithdrawalDeadline(row);
  if (!row.withdrawal_at && deadline!==null && Date.now()>deadline) helpers.fail(409,'Die automatische Online-Rücktrittsfrist ist abgelaufen. Gesetzliche längere Fristen bleiben unberührt; bitte wende dich dafür direkt per E-Mail an Emina.','withdrawal_period_ended');
  await voucherStatement(env,"UPDATE gift_vouchers SET status='withdrawal_requested',withdrawal_at=COALESCE(withdrawal_at,?) WHERE id=? AND status IN ('pending','active')",Date.now(),row.id).run();
  const updated=await voucherFirst(env,'SELECT * FROM gift_vouchers WHERE id=?',row.id);
  const receipt={
    de:{subject:'Gutschein: Rücktritt eingegangen',text:`Deine Rücktrittserklärung zur Gutscheinbestellung ${row.reference} ist eingegangen. Der Code ist für weitere Einlösungen gesperrt. Emina prüft die Erstattung und meldet sich bei dir. Dies bestätigt den Eingang, noch keine ausgeführte Rückzahlung.`},
    en:{subject:'Voucher: withdrawal received',text:`Your withdrawal request for voucher order ${row.reference} has been received. The code is blocked from further redemption. Emina will review the refund and contact you. This confirms receipt of your request, not a completed refund.`},
    bs:{subject:'Poklon-bon: zaprimljen odustanak',text:`Tvoja izjava o odustanku od narudžbe poklon-bona ${row.reference} je zaprimljena. Kod je blokiran za daljnje korištenje. Emina će provjeriti povrat i javiti ti se. Ovo potvrđuje prijem izjave, a ne izvršen povrat novca.`}
  }[row.language];
  const text=`${receipt.text}\n\n${helpers.businessContact(env).email}`;
  let emailSent=true;
  for (const recipient of [row.buyer_email,helpers.businessContact(env).email]) {
    const admin=recipient!==row.buyer_email;
    try {
      const message=renderVoucherEmail({kind:'withdrawal',subject:receipt.subject,language:row.language,customerName:row.buyer_name,customerEmail:row.buyer_email,reference:row.reference,notice:text,admin,actionUrl:admin?`${helpers.portalOrigin(env)}${helpers.portalPath(env)}`:await voucherStatusUrl(row,env,helpers)});
      await helpers.mail(env,{to:recipient,...message,idempotencyKey:`voucher-withdrawal/${row.id}/${admin?'studio':'buyer'}`});
    } catch {emailSent=false;}
  }
  return helpers.json({ok:true,message:text,emailSent,...await voucherEnvelope(env,updated,helpers)});
}
async function voucherAtomicOperation(env,row,user,kind,data,helpers) {
  const key=voucherKey(data.idempotencyKey || (kind==='refund'?`refund-${row.id}`:null),helpers.fail);
  let amount=0; let reservation=null; let booking='';
  if (kind==='reserve' || kind==='redeem') { amount=voucherAmount(data.amountCents,helpers.fail); booking=helpers.textField(data.bookingReference,160); }
  if (kind==='release' || (kind==='redeem' && data.reservationId)) {
    reservation=await voucherFirst(env,'SELECT * FROM voucher_reservations WHERE id=? AND voucher_id=?',helpers.textField(data.reservationId,80),row.id);
    if (!reservation) helpers.fail(404,'Die Reservierung wurde nicht gefunden.','reservation_not_found');
    if (kind==='release') {amount=reservation.amount_cents; booking=reservation.booking_reference;}
    if (kind==='redeem' && (amount!==reservation.amount_cents || booking!==reservation.booking_reference)) helpers.fail(409,'Bitte rechne die Reservierung mit ihrem vollständigen Betrag und ihrer Buchungsreferenz ab.','reservation_mismatch');
  }
  if (kind==='refund') { if (data.confirmed!==true) helpers.fail(400,'Bitte bestätige, dass die Rückzahlung bereits außerhalb des Portals erfolgt ist.','confirmation_required'); amount=row.amount_cents; booking=helpers.textField(data.reason,300,false); }
  const payload=await helpers.sha256(JSON.stringify({kind,amount,booking,reservationId:reservation?.id || null}));
  const existing=await voucherFirst(env,'SELECT * FROM voucher_operations WHERE voucher_id=? AND idempotency_key=?',row.id,key);
  if (existing) {if (!helpers.safeEqual(existing.payload_hash,payload)) helpers.fail(409,'Dieser Vorgang wurde mit anderen Angaben bereits gespeichert.','idempotency_conflict');return {operationId:existing.id,reservationId:existing.reservation_id};}
  const operationId=crypto.randomUUID(); const reservationId=kind==='reserve'?crypto.randomUUID():reservation?.id || null; const now=Date.now();
  let condition="status='active' AND paid_at IS NOT NULL";
  if (kind==='reserve' || (kind==='redeem' && !reservation)) condition+=' AND balance_cents-reserved_cents>=?';
  else if (kind==='release' || reservation) condition=`${kind==='release'?"status IN ('active','withdrawal_requested')":condition} AND EXISTS(SELECT 1 FROM voucher_reservations vr WHERE vr.id=? AND vr.voucher_id=gift_vouchers.id AND vr.status='active')`;
  else if (kind==='refund') condition="status IN ('active','withdrawal_requested') AND paid_at IS NOT NULL AND balance_cents=amount_cents AND reserved_cents=0";
  const conditionArgs=(kind==='reserve'||(kind==='redeem'&&!reservation))?[amount]:(kind==='release'||reservation)?[reservation.id]:[];
  const operations=[voucherStatement(env,`INSERT OR IGNORE INTO voucher_operations(id,voucher_id,idempotency_key,payload_hash,kind,amount_cents,booking_reference,reservation_id,actor_id,created_at) SELECT ?,id,?,?,?,?,?,?,?,? FROM gift_vouchers WHERE id=? AND ${condition}`,operationId,key,payload,kind,amount,booking,reservationId,user.id,now,row.id,...conditionArgs)];
  const opGuard="EXISTS(SELECT 1 FROM voucher_operations op WHERE op.id=? AND op.voucher_id=gift_vouchers.id AND op.applied=0)";
  const set=kind==='reserve'?'reserved_cents=reserved_cents+?':kind==='redeem'?`balance_cents=balance_cents-?${reservation?',reserved_cents=reserved_cents-?':''}`:kind==='release'?'reserved_cents=reserved_cents-?':"status='refunded',balance_cents=0,refunded_at=?";
  operations.push(voucherStatement(env,`UPDATE gift_vouchers SET ${set} WHERE id=? AND ${opGuard}`,...(kind==='refund'?[now]:kind==='redeem'&&reservation?[amount,amount]:[amount]),row.id,operationId));
  if (kind==='reserve') operations.push(voucherStatement(env,"INSERT INTO voucher_reservations(id,voucher_id,amount_cents,booking_reference,status,created_at) SELECT reservation_id,voucher_id,amount_cents,booking_reference,'active',created_at FROM voucher_operations WHERE id=? AND applied=0",operationId));
  if (kind==='release'||reservation) operations.push(voucherStatement(env,`UPDATE voucher_reservations SET status=?,finished_at=? WHERE id=? AND EXISTS(SELECT 1 FROM voucher_operations op WHERE op.id=? AND op.applied=0)`,kind==='release'?'released':'redeemed',now,reservation.id,operationId));
  operations.push(voucherStatement(env,'UPDATE voucher_operations SET applied=1 WHERE id=? AND applied=0',operationId));
  await env.DB.batch(operations);
  const applied=await voucherFirst(env,'SELECT * FROM voucher_operations WHERE voucher_id=? AND idempotency_key=?',row.id,key);
  if (!applied) helpers.fail(409,kind==='refund'?'Eine Rückzahlung kann erst nach Klärung aller Einlösungen und Reservierungen erfasst werden.':'Der Gutschein hat nicht genügend freies Guthaben oder der Vorgang ist nicht mehr möglich.','voucher_operation_conflict');
  if (!helpers.safeEqual(applied.payload_hash,payload)) helpers.fail(409,'Der Vorgang wurde bereits mit anderen Angaben gespeichert.','idempotency_conflict');
  return {operationId:applied.id,reservationId:applied.reservation_id};
}
async function voucherDeleteTest(request,env,row,user,helpers) {
  const data=await helpers.body(request);
  if(data.confirmed!==true || data.testOnly!==true || data.reference!==row.reference) helpers.fail(400,'Bitte bestätige die Testbestellung ohne tatsächliche Kundenzahlung und gib ihre Bestellreferenz genau ein.','confirmation_required');
  // Check inside the same D1 transaction as deletion: a concurrent reservation
  // or redemption must never be removed after a stale details view was opened.
  const eligible=`reserved_cents=0 AND (balance_cents=amount_cents OR status='refunded')
    AND NOT EXISTS(SELECT 1 FROM voucher_reservations vr WHERE vr.voucher_id=gift_vouchers.id AND vr.status IN ('active','redeemed'))
    AND NOT EXISTS(SELECT 1 FROM voucher_operations vo WHERE vo.voucher_id=gift_vouchers.id AND vo.kind='redeem' AND vo.applied=1)
    AND (confirmation_lease_at IS NULL OR confirmation_lease_at<?)
    AND (gift_lease_at IS NULL OR gift_lease_at<?)`;
  const now=Date.now(),leaseBefore=now-10*60000;
  const selection=`SELECT id FROM gift_vouchers WHERE id=? AND ${eligible}`;
  const result=await env.DB.batch([
    voucherStatement(env,`INSERT INTO audit_events(id,user_id,action,target_id,created_at) SELECT ?,?,'voucher_test_deleted',id,? FROM gift_vouchers WHERE id=? AND ${eligible}`,crypto.randomUUID(),user.id,now,row.id,leaseBefore,leaseBefore),
    voucherStatement(env,`DELETE FROM voucher_reservations WHERE voucher_id IN (${selection})`,row.id,leaseBefore,leaseBefore),
    voucherStatement(env,`DELETE FROM voucher_operations WHERE voucher_id IN (${selection})`,row.id,leaseBefore,leaseBefore),
    voucherStatement(env,`DELETE FROM gift_vouchers WHERE id=? AND ${eligible} RETURNING id`,row.id,leaseBefore,leaseBefore)
  ]);
  if(!result[3].results?.length) helpers.fail(409,'Der Gutschein wurde bereits eingelöst, ist noch reserviert oder wird gerade per E-Mail verschickt. Bitte lade die Ansicht neu und gib gegebenenfalls die Reservierung frei.','voucher_in_use');
  return helpers.json({ok:true,deleted:true});
}
async function voucherAdmin(request,env,path,helpers) {
  const mutate=!['GET','HEAD'].includes(request.method); const user=await helpers.requireUser(request,env,mutate,true);
  if (path==='/admin/vouchers' && request.method==='GET') {
    const params=new URL(request.url).searchParams; const code=params.get('code'); const q=params.get('q');
    let rows;
    if (code) rows=await voucherRows(env,'SELECT * FROM gift_vouchers WHERE code=?',code.trim().toUpperCase());
    else if(q?.trim()) {
      const value='%'+helpers.textField(q,160).replace(/[\\%_]/g,'\\$&')+'%';
      rows=await voucherRows(env,"SELECT * FROM gift_vouchers WHERE reference LIKE ? ESCAPE '\\' OR code LIKE ? ESCAPE '\\' OR buyer_name LIKE ? ESCAPE '\\' OR buyer_email LIKE ? ESCAPE '\\' OR gift_to LIKE ? ESCAPE '\\' ORDER BY created_at DESC LIMIT 301",value,value,value,value,value);
    } else rows=await voucherRows(env,'SELECT * FROM gift_vouchers ORDER BY created_at DESC LIMIT 301');
    // Bulk-load details so 300 vouchers do not require 600 D1 subqueries.
    const shown=rows.slice(0,300);const selectedIds=JSON.stringify(shown.map(row=>row.id));
    const [reservations,ledger]=await Promise.all([
      voucherRows(env,'SELECT * FROM voucher_reservations WHERE voucher_id IN (SELECT value FROM json_each(?)) ORDER BY created_at DESC',selectedIds),
      voucherRows(env,'SELECT * FROM (SELECT op.*,ROW_NUMBER() OVER(PARTITION BY voucher_id ORDER BY created_at DESC) AS history_position FROM voucher_operations op WHERE applied=1 AND voucher_id IN (SELECT value FROM json_each(?))) WHERE history_position<=50 ORDER BY created_at DESC',selectedIds)
    ]);
    const vouchers=await Promise.all(shown.map(row=>voucherObject(env,row,true,{reservations:reservations.filter(item=>item.voucher_id===row.id),ledger:ledger.filter(item=>item.voucher_id===row.id)})));
    return helpers.json({vouchers,hasMore:rows.length>300});
  }
  const match=path.match(/^\/admin\/vouchers\/([\w-]+)(?:\/(paid|resend|reserve|redeem|release|refund|pdf))?$/);
  if (!match) helpers.fail(404,'Der Gutschein wurde nicht gefunden.','voucher_not_found');
  const row=await voucherFirst(env,'SELECT * FROM gift_vouchers WHERE id=?',match[1]);
  if (!row) helpers.fail(404,'Der Gutschein wurde nicht gefunden.','voucher_not_found');
  const action=match[2];
  if (!action && request.method==='GET') return helpers.json({voucher:await voucherObject(env,row,true)});
  if (!action && request.method==='DELETE') return voucherDeleteTest(request,env,row,user,helpers);
  if (action==='pdf' && request.method==='GET') return voucherPdfResponse(row,helpers);
  if (request.method!=='POST') helpers.fail(405,'Diese Aktion ist nicht verfügbar.');
  const data=await helpers.body(request);
  if (action==='paid') {
    if (!['pending','active','withdrawal_requested'].includes(row.status)) helpers.fail(409,'Dieser Gutschein ist gesperrt. Zahlung und eventuelle Rückzahlung bitte zuerst klären.','voucher_not_active');
    const code='LZ-'+helpers.randomToken().slice(0,20).toUpperCase().match(/.{1,5}/g).join('-');
    await voucherStatement(env,"UPDATE gift_vouchers SET status=CASE WHEN status='pending' THEN 'active' ELSE status END,paid_at=?,code=? WHERE id=? AND status IN ('pending','withdrawal_requested') AND paid_at IS NULL",Date.now(),code,row.id).run();
    const updated=await voucherFirst(env,'SELECT * FROM gift_vouchers WHERE id=?',row.id);
    const emailSent=await voucherSendMail(env,updated,'gift',helpers);
    await helpers.audit(env,user.id,'voucher_paid',row.id);
    return helpers.json({ok:true,emailSent,voucher:await voucherObject(env,await voucherFirst(env,'SELECT * FROM gift_vouchers WHERE id=?',row.id),true)});
  }
  if (action==='resend') {
    await helpers.rate(env,`voucher-resend:${row.id}`,5,60*60000);
    if (!['pending','active'].includes(row.status)) helpers.fail(409,'Der Gutschein ist gesperrt.','voucher_not_active');
    const emailSent=await voucherSendMail(env,row,row.paid_at?'gift':'confirmation',helpers,true);
    return helpers.json({ok:true,emailSent,voucher:await voucherObject(env,await voucherFirst(env,'SELECT * FROM gift_vouchers WHERE id=?',row.id),true)});
  }
  if (['reserve','redeem','release','refund'].includes(action)) {
    const operation=await voucherAtomicOperation(env,row,user,action,data,helpers);
    await helpers.audit(env,user.id,`voucher_${action}`,row.id);
    return helpers.json({ok:true,...operation,voucher:await voucherObject(env,await voucherFirst(env,'SELECT * FROM gift_vouchers WHERE id=?',row.id),true)});
  }
  helpers.fail(404,'Diese Aktion wurde nicht gefunden.');
}
export async function handleVoucherRequest(request,env,path,helpers) {
  await voucherReady(env,helpers.fail);
  if (path.startsWith('/admin/vouchers')) return voucherAdmin(request,env,path,helpers);
  if (path==='/vouchers/orders' && request.method==='POST') return voucherPurchase(request,env,helpers);
  const match=path.match(/^\/vouchers\/orders\/([\w-]+)(?:\/(pdf|withdraw))?$/);
  if (!match) helpers.fail(404,'Die Gutscheinbestellung wurde nicht gefunden.','voucher_not_found');
  if (match[2]==='withdraw' && request.method==='POST') return voucherWithdraw(request,env,match[1],helpers);
  if (request.method!=='GET') helpers.fail(405,'Diese Aktion ist nicht verfügbar.');
  const row=await voucherBuyer(request,env,match[1],new URL(request.url).searchParams.get('token'),helpers);
  if (match[2]==='pdf') return voucherPdfResponse(row,helpers);
  return helpers.json(await voucherEnvelope(env,row,helpers));
}
