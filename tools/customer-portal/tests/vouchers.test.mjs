import test from 'node:test';
import assert from 'node:assert/strict';
import { createHarness, cookieValue, ORIGIN } from './harness.mjs';

const orderInput = (overrides={}) => ({amountCents:10000,buyerName:'Lokale Testkäuferin',buyerEmail:'gift@example.test',buyerAddress:'Teststraße 1\n8010 Graz',giftTo:'Željka',giftFrom:'Emina',message:'Viel Freude mit deinen Erinnerungen!',language:'de',termsAccepted:true,idempotencyKey:crypto.randomUUID(),...overrides});
async function withVoucher(callback) {const h=await createHarness();try {await callback(h);} finally {await h.close();}}
async function admin(h) {const logged=await h.request('/api/auth/login',{method:'POST',body:{email:'emina@example.test',password:'Testverwaltung2026!'}});assert.equal(logged.status,200);return {cookie:cookieValue(logged),csrf:logged.data.csrf};}
async function buy(h,values={}) {const input=orderInput(values);const result=await h.request('/api/vouchers/orders',{method:'POST',body:input});assert.equal(result.status,201,result.data?.error);return {...result.data,input};}
async function paid(h,order,actor) {const result=await h.request(`/api/admin/vouchers/${order.id}/paid`,{...actor,method:'POST',body:{}});assert.equal(result.status,200,result.data?.error);return result.data;}
const mutate=(h,id,actor,action,values)=>h.request(`/api/admin/vouchers/${id}/${action}`,{...actor,method:'POST',body:{idempotencyKey:crypto.randomUUID(),...values}});

test('anonymous purchase is server-priced, token protected, immutable and idempotent',()=>withVoucher(async h=>{
  const input=orderInput();const created=await h.request('/api/vouchers/orders',{method:'POST',body:input});assert.equal(created.status,201,created.data?.error);
  const {order,accessToken,statusUrl,transfer}=created.data;
  assert.equal(order.amountCents,10000);assert.equal(order.status,'pending');assert.equal(order.code,null);assert.equal(created.data.voucher,null);assert.equal(transfer.reference,order.reference);assert.equal(transfer.amountCents,10000);assert.ok(statusUrl.includes('gutscheine-kaufen.html#order='));assert.ok(statusUrl.includes(accessToken));
  const row=await h.DB.prepare('SELECT * FROM gift_vouchers WHERE id=?').bind(order.id).first();assert.equal(row.access_hash.length,64);assert.notEqual(row.access_hash,accessToken);assert.equal(row.code,null);assert.ok(row.contract_text.includes('14 Tagen'));assert.ok(row.contract_text.includes('Wertgutschein'));
  const retried=await h.request('/api/vouchers/orders',{method:'POST',body:input});assert.equal(retried.status,200);assert.equal(retried.data.order.id,order.id);assert.equal(retried.data.accessToken,accessToken);assert.equal(h.mail.messages.filter(m=>m.subject.includes(order.reference)).length,1);
  const changed=await h.request('/api/vouchers/orders',{method:'POST',body:{...input,amountCents:20000}});assert.equal(changed.status,409);
  assert.equal((await h.request(`/api/vouchers/orders/${order.id}?token=${accessToken}`)).status,200);
  assert.equal((await h.request(`/api/vouchers/orders/${order.id}?token=${'0'.repeat(64)}`)).status,404);
  assert.equal((await h.request(`/api/vouchers/orders/${order.id}/pdf?token=${accessToken}`)).status,409);
}));

test('public purchase rejects foreign origin, invalid amount and missing agreement',()=>withVoucher(async h=>{
  for (const values of [{amountCents:999},{amountCents:200001},{amountCents:1000.5},{amountCents:'10000'},{termsAccepted:false}]) assert.equal((await h.request('/api/vouchers/orders',{method:'POST',body:orderInput(values)})).status,400);
  assert.equal((await h.request('/api/vouchers/orders',{method:'POST',origin:'https://hostile.example',body:orderInput()})).status,403);
  assert.equal((await h.request('/api/vouchers/orders',{method:'POST',origin:null,body:orderInput()})).status,403);
  assert.equal((await h.DB.prepare('SELECT COUNT(*) AS n FROM gift_vouchers').first()).n,0);
}));

test('paid activates one random code and sends printable PDF once across concurrent retries',()=>withVoucher(async h=>{
  const purchase=await buy(h);const actor=await admin(h);const outputs=await Promise.all([paid(h,purchase.order,actor),paid(h,purchase.order,actor)]);
  assert.equal(outputs[0].voucher.code,outputs[1].voucher.code);assert.match(outputs[0].voucher.code,/^LZ-(?:[A-F0-9]{5}-){3}[A-F0-9]{5}$/);assert.notEqual(outputs[0].voucher.code,purchase.order.reference);
  const giftMails=h.mail.messages.filter(m=>m.attachments?.some(a=>a.content_type==='application/pdf'));assert.equal(giftMails.length,1);const pdf=giftMails[0].attachments.find(a=>a.content_type==='application/pdf');assert.ok(Buffer.from(pdf.content,'base64').subarray(0,5).toString()==='%PDF-');
  const publicPdf=await h.request(`/api/vouchers/orders/${purchase.order.id}/pdf?token=${purchase.accessToken}`);assert.equal(publicPdf.status,200);assert.equal(publicPdf.response.headers.get('content-type'),'application/pdf');
  assert.equal((await h.request(`/api/admin/vouchers/${purchase.order.id}/pdf`,actor)).status,200);
  const saved=await h.DB.prepare('SELECT code,balance_cents FROM gift_vouchers WHERE id=?').bind(purchase.order.id).first();assert.equal(saved.balance_cents,10000);
  assert.equal((await paid(h,purchase.order,actor)).voucher.code,saved.code);
}));

test('admin and CSRF guard protect every money mutation and code lookup',()=>withVoucher(async h=>{
  const purchase=await buy(h);const actor=await admin(h);
  assert.equal((await h.request('/api/admin/vouchers')).status,401);
  assert.equal((await h.request(`/api/admin/vouchers/${purchase.order.id}/paid`,{cookie:actor.cookie,method:'POST',body:{}})).status,403);
  assert.equal((await h.request(`/api/admin/vouchers/${purchase.order.id}/paid`,{...actor,origin:'https://hostile.example',method:'POST',body:{}})).status,403);
  const customer=await h.request('/api/auth/login',{method:'POST',body:{email:'customer@example.test',password:'Testgalerie2026!'}});
  assert.equal((await h.request('/api/admin/vouchers',{cookie:cookieValue(customer)})).status,403);
}));

test('concurrent reservations cannot overspend and retries preserve journal',()=>withVoucher(async h=>{
  const purchase=await buy(h);const actor=await admin(h);await paid(h,purchase.order,actor);
  const values={amountCents:7000,bookingReference:'Familie Test',idempotencyKey:crypto.randomUUID()};
  const results=await Promise.all([mutate(h,purchase.order.id,actor,'reserve',values),mutate(h,purchase.order.id,actor,'reserve',{amountCents:6000,bookingReference:'Andere Buchung'})]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  const first=results.find(r=>r.status===200);const repeat=await mutate(h,purchase.order.id,actor,'reserve',values);assert.equal(repeat.status,200);assert.equal(repeat.data.reservationId,first.data.reservationId);assert.equal(repeat.data.voucher.reservedCents,7000);assert.equal(repeat.data.voucher.ledger.length,1);
  const changed=await mutate(h,purchase.order.id,actor,'reserve',{...values,amountCents:5000});assert.equal(changed.status,409);
  const mismatch=await mutate(h,purchase.order.id,actor,'redeem',{amountCents:6000,bookingReference:'Familie Test',reservationId:first.data.reservationId});assert.equal(mismatch.status,409);
  const redeemed=await mutate(h,purchase.order.id,actor,'redeem',{amountCents:7000,bookingReference:'Familie Test',reservationId:first.data.reservationId});assert.equal(redeemed.status,200);assert.equal(redeemed.data.voucher.balanceCents,3000);assert.equal(redeemed.data.voucher.reservedCents,0);assert.equal(redeemed.data.voucher.reservations[0].status,'redeemed');
  assert.equal((await mutate(h,purchase.order.id,actor,'refund',{confirmed:true})).status,409);
}));

test('concurrent direct redemption spends at most balance and repeated key spends once',()=>withVoucher(async h=>{
  const purchase=await buy(h);const actor=await admin(h);await paid(h,purchase.order,actor);
  const values={amountCents:6000,bookingReference:'Shooting Nr. 1',idempotencyKey:crypto.randomUUID()};
  const same=await Promise.all([mutate(h,purchase.order.id,actor,'redeem',values),mutate(h,purchase.order.id,actor,'redeem',values)]);assert.equal(same[0].status,200);assert.equal(same[1].status,200);assert.equal(same[0].data.operationId,same[1].data.operationId);
  const second=await mutate(h,purchase.order.id,actor,'redeem',{amountCents:5000,bookingReference:'Shooting Nr. 2'});assert.equal(second.status,409);
  assert.equal((await h.DB.prepare('SELECT balance_cents FROM gift_vouchers WHERE id=?').bind(purchase.order.id).first()).balance_cents,4000);
}));

test('withdrawal blocks further spending, release remains possible and refund requires full unspent balance',()=>withVoucher(async h=>{
  const purchase=await buy(h);const actor=await admin(h);await paid(h,purchase.order,actor);
  const reservation=await mutate(h,purchase.order.id,actor,'reserve',{amountCents:5000,bookingReference:'Termin A'});assert.equal(reservation.status,200);
  const withdrawal=await h.request(`/api/vouchers/orders/${purchase.order.id}/withdraw`,{method:'POST',body:{token:purchase.accessToken,confirmed:true}});assert.equal(withdrawal.status,200);assert.equal(withdrawal.data.order.status,'withdrawal_requested');
  assert.equal((await mutate(h,purchase.order.id,actor,'redeem',{amountCents:1000,bookingReference:'Termin B'})).status,409);
  assert.equal((await h.request(`/api/vouchers/orders/${purchase.order.id}/pdf?token=${purchase.accessToken}`)).status,409);
  assert.equal((await mutate(h,purchase.order.id,actor,'refund',{confirmed:true})).status,409);
  const released=await mutate(h,purchase.order.id,actor,'release',{reservationId:reservation.data.reservationId});assert.equal(released.status,200);assert.equal(released.data.voucher.reservedCents,0);
  const refund=await mutate(h,purchase.order.id,actor,'refund',{confirmed:true});assert.equal(refund.status,200);assert.equal(refund.data.voucher.status,'refunded');assert.equal(refund.data.voucher.balanceCents,0);
  assert.equal((await mutate(h,purchase.order.id,actor,'paid',{})).status,409);
}));

test('paid PDF mail failure retains payment and code for a safe retry',()=>withVoucher(async h=>{
  const purchase=await buy(h);const actor=await admin(h);const send=h.env.__TEST_MAIL.send.bind(h.env.__TEST_MAIL);let reject=true;
  h.env.__TEST_MAIL.send=async message=>{if(reject&&message.attachments?.some(a=>a.content_type==='application/pdf')) throw new Error('Local mail unavailable');return send(message);};
  const first=await paid(h,purchase.order,actor);assert.equal(first.emailSent,false);assert.equal(first.voucher.status,'active');assert.ok(first.voucher.code);assert.equal(first.voucher.giftSent,false);
  reject=false;const second=await paid(h,purchase.order,actor);assert.equal(second.emailSent,true);assert.equal(second.voucher.code,first.voucher.code);assert.equal(second.voucher.giftSent,true);
}));

test('missing voucher migration fails closed and does not alter gallery data',()=>withVoucher(async h=>{
  const before=await h.DB.prepare('SELECT COUNT(*) AS n FROM galleries').first();
  await h.DB.exec('DROP TABLE voucher_operations; DROP TABLE voucher_reservations; DROP TABLE gift_vouchers;');
  const missing=await h.request('/api/vouchers/orders',{method:'POST',body:orderInput()});assert.equal(missing.status,503);assert.equal(missing.data.code,'vouchers_not_configured');
  assert.equal((await h.DB.prepare('SELECT COUNT(*) AS n FROM galleries').first()).n,before.n);
}));

test('an old unpaid order remains withdrawable before the first gift delivery',()=>withVoucher(async h=>{
  const purchase=await buy(h);
  await h.DB.prepare('UPDATE gift_vouchers SET created_at=? WHERE id=?').bind(Date.now()-90*86400000,purchase.order.id).run();
  const status=await h.request(`/api/vouchers/orders/${purchase.order.id}?token=${purchase.accessToken}`);
  assert.equal(status.data.order.withdrawUntil,null);assert.equal(status.data.order.firstGiftSentAt,null);
  const withdrawn=await h.request(`/api/vouchers/orders/${purchase.order.id}/withdraw`,{method:'POST',body:{token:purchase.accessToken,confirmed:true}});
  assert.equal(withdrawn.status,200);assert.equal(withdrawn.data.order.status,'withdrawal_requested');
}));

test('English and Bosnian withdrawal receipts use the order language and do not promise a completed refund',()=>withVoucher(async h=>{
  for(const [language,subject,body] of [['en','Voucher: withdrawal received','not a completed refund'],['bs','Poklon-bon: zaprimljen odustanak','a ne izvršen povrat novca']]){
    const purchase=await buy(h,{language,buyerEmail:`withdrawal-${language}@example.test`});
    const withdrawn=await h.request(`/api/vouchers/orders/${purchase.order.id}/withdraw`,{method:'POST',body:{token:purchase.accessToken,confirmed:true}});
    assert.equal(withdrawn.status,200);assert.ok(withdrawn.data.message.includes(body));
    const receipt=h.mail.messages.find(message=>message.to===purchase.order.buyerEmail&&message.subject===`${subject} · ${purchase.order.reference}`);
    assert.ok(receipt);assert.ok(receipt.text.includes(body));assert.ok(receipt.html.includes(body));assert.doesNotMatch(receipt.text,/Deine Rücktrittserklärung/);
  }
}));

test('delayed payment starts the online period at the first successful gift mail without rewriting the contract',()=>withVoucher(async h=>{
  const purchase=await buy(h);const actor=await admin(h);
  const original=await h.DB.prepare('SELECT contract_text FROM gift_vouchers WHERE id=?').bind(purchase.order.id).first();
  assert.match(original.contract_text,/ersten erfolgreichen Versand/);assert.match(original.contract_text,/Gesetzliche Verlängerungen/);assert.doesNotMatch(original.contract_text,/14 Tagen ab Vertragsabschluss/);
  await h.DB.prepare('UPDATE gift_vouchers SET created_at=? WHERE id=?').bind(Date.now()-90*86400000,purchase.order.id).run();
  const activated=await paid(h,purchase.order,actor);const row=await h.DB.prepare('SELECT * FROM gift_vouchers WHERE id=?').bind(purchase.order.id).first();
  assert.equal(activated.voucher.firstGiftSentAt,new Date(row.gift_sent_at).toISOString());
  assert.equal(activated.voucher.withdrawUntil,new Date(row.gift_sent_at+14*86400000).toISOString());
  assert.ok(row.gift_sent_at>=row.paid_at);assert.equal(row.contract_text,original.contract_text);
  const gift=h.mail.messages.find(message=>message.attachments?.some(file=>file.content_type==='application/pdf'));
  assert.match(gift.text,/ersten erfolgreichen Versand/);assert.match(gift.text,/erneute Zusendung startet die Frist nicht neu/);
  const confirmation=gift.attachments.find(file=>file.filename.startsWith('Bestellbestaetigung-'));
  assert.ok(Buffer.from(confirmation.content,'base64').toString().includes(original.contract_text));
  const withdrawn=await h.request(`/api/vouchers/orders/${purchase.order.id}/withdraw`,{method:'POST',body:{token:purchase.accessToken,confirmed:true}});assert.equal(withdrawn.status,200);
}));

test('failed gift delivery never expires withdrawal solely because payment and order are old',()=>withVoucher(async h=>{
  const purchase=await buy(h);const actor=await admin(h);const send=h.env.__TEST_MAIL.send.bind(h.env.__TEST_MAIL);
  h.env.__TEST_MAIL.send=async message=>{if(message.attachments?.some(file=>file.content_type==='application/pdf'))throw new Error('Local mail unavailable');return send(message);};
  const activated=await paid(h,purchase.order,actor);assert.equal(activated.emailSent,false);assert.equal(activated.voucher.withdrawUntil,null);
  await h.DB.prepare('UPDATE gift_vouchers SET created_at=?,paid_at=? WHERE id=?').bind(Date.now()-90*86400000,Date.now()-60*86400000,purchase.order.id).run();
  const status=await h.request(`/api/vouchers/orders/${purchase.order.id}?token=${purchase.accessToken}`);
  assert.equal(status.data.order.withdrawUntil,null);assert.equal(status.data.order.status,'active');
  const withdrawn=await h.request(`/api/vouchers/orders/${purchase.order.id}/withdraw`,{method:'POST',body:{token:purchase.accessToken,confirmed:true}});assert.equal(withdrawn.status,200);
}));

test('resending keeps the first gift-mail timestamp and the existing withdrawal deadline',()=>withVoucher(async h=>{
  const purchase=await buy(h);const actor=await admin(h);await paid(h,purchase.order,actor);
  const firstSent=Date.now()-5*86400000;
  await h.DB.prepare('UPDATE gift_vouchers SET gift_sent_at=? WHERE id=?').bind(firstSent,purchase.order.id).run();
  const before=await h.DB.prepare('SELECT code,paid_at,contract_text FROM gift_vouchers WHERE id=?').bind(purchase.order.id).first();
  const resent=await mutate(h,purchase.order.id,actor,'resend',{});assert.equal(resent.status,200);assert.equal(resent.data.emailSent,true);
  assert.equal(resent.data.voucher.firstGiftSentAt,new Date(firstSent).toISOString());assert.equal(resent.data.voucher.withdrawUntil,new Date(firstSent+14*86400000).toISOString());
  const after=await h.DB.prepare('SELECT code,paid_at,contract_text FROM gift_vouchers WHERE id=?').bind(purchase.order.id).first();assert.deepEqual(after,before);
}));

test('expired window is measured from the first gift mail and an earlier withdrawal receipt remains valid',()=>withVoucher(async h=>{
  const purchase=await buy(h);const actor=await admin(h);await paid(h,purchase.order,actor);
  await h.DB.prepare('UPDATE gift_vouchers SET gift_sent_at=? WHERE id=?').bind(Date.now()-15*86400000,purchase.order.id).run();
  const expired=await h.request(`/api/vouchers/orders/${purchase.order.id}/withdraw`,{method:'POST',body:{token:purchase.accessToken,confirmed:true}});assert.equal(expired.status,409);assert.equal(expired.data.code,'withdrawal_period_ended');
  assert.match(expired.data.error,/Gesetzliche längere Fristen bleiben unberührt/);
  assert.equal((await h.DB.prepare('SELECT status FROM gift_vouchers WHERE id=?').bind(purchase.order.id).first()).status,'active');
  const withdrawalAt=Date.now()-2*86400000;
  await h.DB.prepare("UPDATE gift_vouchers SET status='withdrawal_requested',withdrawal_at=? WHERE id=?").bind(withdrawalAt,purchase.order.id).run();
  const repeated=await h.request(`/api/vouchers/orders/${purchase.order.id}/withdraw`,{method:'POST',body:{token:purchase.accessToken,confirmed:true}});assert.equal(repeated.status,200);assert.equal(repeated.data.order.withdrawalAt,new Date(withdrawalAt).toISOString());
}));

test('admin search escapes wildcards and finds code, buyer and booking reference',()=>withVoucher(async h=>{
  const one=await buy(h,{buyerName:'Alpha % _ Käufer',buyerEmail:'alpha@example.test',giftTo:'Für Ziel'});const two=await buy(h,{buyerEmail:'other@example.test'});const actor=await admin(h);const activated=await paid(h,one.order,actor);
  for(const query of ['Alpha','%','_','alpha@example.test','Für Ziel',one.order.reference,activated.voucher.code]) {
    const found=await h.request('/api/admin/vouchers?q='+encodeURIComponent(query),actor);assert.equal(found.status,200,found.data?.error);assert.equal(found.data.vouchers.length,1,query);assert.equal(found.data.vouchers[0].id,one.order.id);
  }
  const absent=await h.request('/api/admin/vouchers?q='+encodeURIComponent("' OR 1=1 --"),actor);assert.equal(absent.status,200);assert.equal(absent.data.vouchers.length,0);
  const exact=await h.request('/api/admin/vouchers?code='+encodeURIComponent(activated.voucher.code.toLowerCase()),actor);assert.equal(exact.status,200);assert.equal(exact.data.vouchers[0].id,one.order.id);
}));

test('a late bank payment is recorded after withdrawal without reactivating the code',()=>withVoucher(async h=>{
  const purchase=await buy(h);const actor=await admin(h);
  const withdrawal=await h.request(`/api/vouchers/orders/${purchase.order.id}/withdraw`,{method:'POST',body:{token:purchase.accessToken,confirmed:true}});assert.equal(withdrawal.status,200);
  const incoming=await paid(h,purchase.order,actor);assert.equal(incoming.voucher.status,'withdrawal_requested');assert.equal(incoming.voucher.paymentStatus,'paid');assert.ok(incoming.voucher.paidAt);assert.equal(incoming.voucher.availableCents,0);assert.equal(incoming.emailSent,false);
  assert.equal((await mutate(h,purchase.order.id,actor,'reserve',{amountCents:1000,bookingReference:'Blocked'})).status,409);
  assert.equal((await mutate(h,purchase.order.id,actor,'refund',{confirmed:true})).status,200);
}));

test('gift text is validated before storing an order or accepting payment',()=>withVoucher(async h=>{
  for(const values of [{giftTo:'Name 👋'},{message:'🌸 Schöne Fotos'},{giftTo:'A'.repeat(81)},{message:'A'.repeat(301)},{message:'W'.repeat(300)}]) {
    const result=await h.request('/api/vouchers/orders',{method:'POST',body:orderInput(values)});assert.equal(result.status,400,result.data?.error);
  }
  assert.equal((await h.DB.prepare('SELECT COUNT(*) AS n FROM gift_vouchers').first()).n,0);
}));

test('large admin voucher list batches details within D1 query limits',()=>withVoucher(async h=>{
  const purchase=await buy(h);const actor=await admin(h);
  const sample=await h.DB.prepare('SELECT * FROM gift_vouchers WHERE id=?').bind(purchase.order.id).first();
  for(let n=0;n<300;n++) await h.DB.prepare("INSERT INTO gift_vouchers(id,reference,access_hash,purchase_key,purchase_hash,amount_cents,balance_cents,buyer_name,buyer_email,buyer_address,language,terms_version,contract_text,created_at) VALUES(?,?,?,?,?,1000,1000,'Search buyer',?,'Test address','de',?,?,?)").bind('batch-'+n,'BATCH-'+n,sample.access_hash,'purchase-'+n,sample.purchase_hash,'batch-'+n+'@example.test',sample.terms_version,sample.contract_text,n).run();
  const prepare=h.DB.prepare.bind(h.DB);let queries=0;h.DB.prepare=(sql)=>{queries++;return prepare(sql);};
  const result=await h.request('/api/admin/vouchers',actor);assert.equal(result.status,200,result.data?.error);assert.equal(result.data.vouchers.length,300);assert.equal(result.data.hasMore,true);assert.ok(queries<12,`batched list uses ${queries} D1 queries`);
}));
