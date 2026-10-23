import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHarness,cookieValue} from './harness.mjs';

const address={name:'Beschenkte Testperson',street:'Testgasse 4/2',postalCode:'8010',city:'Graz',country:'AT'};
const input=(values={})=>({amountCents:10000,buyerName:'Testkäuferin',buyerEmail:'postal@example.test',buyerAddress:'Andere Straße 2, 8020 Graz',language:'de',termsAccepted:true,idempotencyKey:crypto.randomUUID(),deliveryMethod:'post',shippingAddress:{...address},...values});
async function setup(fn){const h=await createHarness();try{await fn(h);}finally{await h.close();}}
const order=(h,body=input())=>h.request('/api/vouchers/orders',{method:'POST',body});
async function admin(h){const login=await h.request('/api/auth/login',{method:'POST',body:{email:'emina@example.test',password:'Testverwaltung2026!'}});return {cookie:cookieValue(login),csrf:login.data.csrf};}
const action=(h,id,actor,kind,body={})=>h.request(`/api/admin/vouchers/${id}/${kind}`,{...actor,method:'POST',body});

test('postal order separates face value, server-priced postage and payment total and persists the address',()=>setup(async h=>{
  const body=input(),bought=await order(h,body);assert.equal(bought.status,201,bought.data?.error);
  const {order:saved,transfer}=bought.data;
  assert.equal(saved.amountCents,10000);assert.equal(saved.balanceCents,10000);assert.equal(saved.shippingCents,480);assert.equal(saved.totalCents,10480);assert.equal(saved.deliveryMethod,'post');assert.equal(saved.shippedAt,null);assert.equal(transfer.amountCents,10480);assert.deepEqual(saved.shippingAddress,address);assert.notEqual(saved.buyerAddress,address.street);
  assert.match(saved.contractText,/Postversand innerhalb Österreichs: (?:€\s*)?4,80/);assert.match(saved.contractText,/Gesamtbetrag: (?:€\s*)?104,80/);assert.match(saved.contractText,/14 Tage ab Erhalt/);assert.match(saved.contractText,/Standard-Versandkosten/);assert.ok(saved.contractText.includes(address.street));assert.doesNotMatch(saved.contractText,/Kein Versandentgelt/);
  const mail=h.mail.messages[0];assert.match(mail.text,/Gesamtbetrag: 104,80/);assert.match(mail.text,/Betrag: 104,80/);assert.match(mail.text,/Gutscheinwert: 100,00/);assert.ok(mail.text.includes(address.street));assert.ok(mail.html.includes(address.street));
  const repeat=await order(h,body);assert.equal(repeat.status,200);assert.equal(repeat.data.order.id,saved.id);assert.equal(h.mail.messages.length,2);
  for(const changed of [{...body,shippingAddress:{...address,city:'Wien'}},{...body,deliveryMethod:'email'}])assert.equal((await order(h,changed)).status,409);
  assert.equal((await h.DB.prepare('SELECT COUNT(*) AS n FROM voucher_shipping').first()).n,1);
}));

test('postal input rejects other countries, malformed addresses and client postage or totals',()=>setup(async h=>{
  const invalid=[{deliveryMethod:'express'},{shippingAddress:{...address,country:'DE'}},{shippingAddress:{...address,postalCode:'08010'}},{shippingAddress:{...address,postalCode:'ABCD'}},{shippingAddress:{...address,name:''}},{shippingAddress:{...address,street:'Test\nInjected'}},{shippingCents:0},{totalCents:10000}];
  for(const values of invalid){const response=await order(h,input(values));assert.equal(response.status,400,response.data?.error);}
  assert.equal((await h.DB.prepare('SELECT COUNT(*) AS n FROM gift_vouchers').first()).n,0);
  assert.equal((await h.DB.prepare('SELECT COUNT(*) AS n FROM voucher_shipping').first()).n,0);
}));

test('missing postal migration fails closed only for post; applying it twice preserves digital orders',()=>setup(async h=>{
  await h.DB.exec('DROP TABLE voucher_shipping;');
  const rejected=await order(h);assert.equal(rejected.status,503);assert.equal(rejected.data.code,'voucher_post_not_configured');
  const body=input({deliveryMethod:undefined,shippingAddress:undefined}),digital=await order(h,body);assert.equal(digital.status,201,digital.data?.error);assert.equal(digital.data.order.deliveryMethod,'email');assert.equal(digital.data.order.totalCents,10000);assert.equal(digital.data.order.shippingCents,0);assert.equal(digital.data.order.shippingAddress,null);
  const migration=await readFile(new URL('../backend/migrations/2026-10-23-voucher-post.sql',import.meta.url),'utf8');await h.DB.exec(migration);await h.DB.exec(migration);
  const repeat=await order(h,{...body,deliveryMethod:'email'});assert.equal(repeat.status,200);assert.equal(repeat.data.order.id,digital.data.order.id);assert.equal(repeat.data.order.contractText,digital.data.order.contractText);
  assert.equal((await h.DB.prepare('SELECT COUNT(*) AS n FROM voucher_shipping').first()).n,0);
  assert.equal((await order(h)).status,201);
}));

test('postal payment keeps email PDF and face value while postage is not redeemable credit',()=>setup(async h=>{
  const bought=await order(h),id=bought.data.order.id,actor=await admin(h);
  const paid=await action(h,id,actor,'paid');assert.equal(paid.status,200);assert.equal(paid.data.voucher.availableCents,10000);assert.equal(paid.data.voucher.totalCents,10480);assert.equal(paid.data.voucher.withdrawUntil,null);
  const gift=h.mail.messages.find(m=>m.attachments?.some(a=>a.content_type==='application/pdf'));assert.ok(gift);assert.match(gift.text,/PDF und Druckgutschein verwenden denselben Code/);assert.doesNotMatch(gift.text,/Deine Überweisung/);
  const overspend=await action(h,id,actor,'redeem',{amountCents:10480,bookingReference:'Test',idempotencyKey:crypto.randomUUID()});assert.equal(overspend.status,409);
  const listed=await h.request('/api/admin/vouchers',actor);assert.deepEqual(listed.data.vouchers[0].shippingAddress,address);assert.equal(listed.data.vouchers[0].totalCents,10480);
}));

test('dispatch marking requires admin, CSRF, actual-send confirmation and a paid active postal order',()=>setup(async h=>{
  const bought=await order(h),id=bought.data.order.id,actor=await admin(h);
  assert.equal((await action(h,id,{},'shipped',{confirmed:true})).status,401);
  assert.equal((await action(h,id,{cookie:actor.cookie},'shipped',{confirmed:true})).status,403);
  assert.equal((await action(h,id,actor,'shipped',{confirmed:true})).status,409);
  await action(h,id,actor,'paid');assert.equal((await action(h,id,actor,'shipped',{})).status,400);
  const mailCount=h.mail.messages.length;
  const concurrent=await Promise.all([action(h,id,actor,'shipped',{confirmed:true}),action(h,id,actor,'shipped',{confirmed:true})]);
  assert.deepEqual(concurrent.map(r=>r.status),[200,200]);const first=concurrent[0].data.voucher.shippedAt;assert.ok(first);assert.equal(concurrent[1].data.voucher.shippedAt,first);
  assert.equal((await action(h,id,actor,'shipped',{confirmed:true})).data.voucher.shippedAt,first);assert.equal(h.mail.messages.length,mailCount+1);
  const dispatch=h.mail.messages.at(-1);assert.match(dispatch.subject,/per Post unterwegs/);assert.ok(dispatch.text.includes(address.street));assert.match(dispatch.text,/zwei bis drei Werktagen/);assert.equal(dispatch.attachments,undefined);
  assert.equal((await h.DB.prepare("SELECT COUNT(*) AS n FROM audit_events WHERE action='voucher_shipped' AND target_id=?").bind(id).first()).n,1);
  const digital=await order(h,input({deliveryMethod:'email'})),digitalId=digital.data.order.id;await action(h,digitalId,actor,'paid');assert.equal((await action(h,digitalId,actor,'shipped',{confirmed:true})).status,409);
  await h.request(`/api/vouchers/orders/${id}/withdraw`,{method:'POST',body:{token:bought.data.accessToken,confirmed:true}});
  assert.equal((await action(h,id,actor,'shipped',{confirmed:true})).status,409);
}));

test('postal withdrawal is not expired by PDF sending or dispatch; full refund records paid total including postage',()=>setup(async h=>{
  const bought=await order(h),id=bought.data.order.id,actor=await admin(h);await action(h,id,actor,'paid');await action(h,id,actor,'shipped',{confirmed:true});
  const old=Date.now()-30*86400000;await h.DB.prepare('UPDATE gift_vouchers SET gift_sent_at=? WHERE id=?').bind(old,id).run();await h.DB.prepare('UPDATE voucher_shipping SET shipped_at=? WHERE voucher_id=?').bind(old,id).run();
  const withdrawn=await h.request(`/api/vouchers/orders/${id}/withdraw`,{method:'POST',body:{token:bought.data.accessToken,confirmed:true}});assert.equal(withdrawn.status,200);assert.equal(withdrawn.data.order.withdrawUntil,null);
  const refund=await action(h,id,actor,'refund',{confirmed:true});assert.equal(refund.status,200);assert.equal(refund.data.voucher.status,'refunded');assert.equal(refund.data.voucher.balanceCents,0);assert.equal(refund.data.voucher.ledger.find(item=>item.kind==='refund').amountCents,10480);
  const repeat=await action(h,id,actor,'refund',{confirmed:true});assert.equal(repeat.status,200);assert.equal(repeat.data.operationId,refund.data.operationId);
}));

test('postal deletion snapshots detect concurrent dispatch and cascade only the confirmed test address',()=>setup(async h=>{
  const bought=await order(h),id=bought.data.order.id,actor=await admin(h);await action(h,id,actor,'paid');
  const before=await h.request(`/api/admin/vouchers/${id}/delete-preview`,actor);assert.equal(JSON.parse(before.data.deleteSnapshot).shipped_at,null);
  await action(h,id,actor,'shipped',{confirmed:true});
  const body={confirmed:true,testOnly:true,reference:bought.data.order.reference};
  const remove=(values)=>h.request(`/api/admin/vouchers/${id}`,{...actor,method:'DELETE',body:values});
  assert.equal((await remove(body)).status,409);
  assert.equal((await remove({...body,testUsageOnly:true,deleteSnapshot:before.data.deleteSnapshot})).data.code,'voucher_delete_changed');
  const current=await h.request(`/api/admin/vouchers/${id}/delete-preview`,actor);assert.ok(JSON.parse(current.data.deleteSnapshot).shipped_at);
  assert.equal((await remove({...body,testUsageOnly:true,deleteSnapshot:current.data.deleteSnapshot})).status,200);
  assert.equal((await h.DB.prepare('SELECT COUNT(*) AS n FROM voucher_shipping WHERE voucher_id=?').bind(id).first()).n,0);
}));

test('concurrent retries of postal purchase create exactly one contract, address and confirmation',()=>setup(async h=>{
  const body=input();const responses=await Promise.all([order(h,body),order(h,body)]);assert.deepEqual(responses.map(r=>r.status).sort(),[200,201]);assert.equal(responses[0].data.order.id,responses[1].data.order.id);
  assert.equal((await h.DB.prepare('SELECT COUNT(*) AS n FROM gift_vouchers').first()).n,1);assert.equal((await h.DB.prepare('SELECT COUNT(*) AS n FROM voucher_shipping').first()).n,1);assert.equal(h.mail.messages.length,2);
}));

test('English and Bosnian postal contracts and emails disclose the fee, total and same-code delivery',()=>setup(async h=>{
  for(const language of ['en','bs']){
    const bought=await order(h,input({language,buyerEmail:`post-${language}@example.test`}));assert.equal(bought.status,201,bought.data?.error);
    const contract=bought.data.order.contractText,mail=h.mail.messages.find(m=>m.to===bought.data.order.buyerEmail);
    assert.ok(contract.includes(address.street));assert.match(contract,/104[,.]80/);assert.match(contract,/4[,.]80/);assert.match(mail.text,/104[,.]80/);assert.ok(mail.text.includes(address.street));
    assert.doesNotMatch(contract,/No delivery charge|Bez troškova dostave/);
    assert.match(contract,language==='en'?/receive the physical voucher/:/primitka fizičkog bona/);
  }
}));

test('dispatch email failure preserves dispatch and allows one safe retry without changing voucher dates or credit',()=>setup(async h=>{
 const bought=await order(h),id=bought.data.order.id,actor=await admin(h);await action(h,id,actor,'paid');
 const before=(await h.request('/api/admin/vouchers/'+id,actor)).data.voucher;
 const send=h.env.__TEST_MAIL.send.bind(h.env.__TEST_MAIL);let reject=true;
 h.env.__TEST_MAIL.send=async message=>{if(reject&&message.subject.includes('per Post unterwegs'))throw new Error('Mail offline');return send(message);};
 const failed=await action(h,id,actor,'shipped',{confirmed:true});assert.equal(failed.status,200);assert.equal(failed.data.emailSent,false);assert.ok(failed.data.voucher.shippedAt);
 reject=false;const retried=await action(h,id,actor,'shipped',{confirmed:true});assert.equal(retried.data.emailSent,true);assert.equal(retried.data.voucher.shippedAt,failed.data.voucher.shippedAt);assert.equal(retried.data.voucher.balanceCents,before.balanceCents);assert.equal(retried.data.voucher.firstGiftSentAt,before.firstGiftSentAt);assert.equal(retried.data.voucher.paidAt,before.paidAt);
 assert.equal((await action(h,id,actor,'shipped',{confirmed:true})).data.emailSent,true);assert.equal(h.mail.messages.filter(m=>m.subject.includes('per Post unterwegs')).length,1);
}));

test('shipping confirmation shares the portal mail design in DE EN BS and never requests payment again',()=>setup(async h=>{
 const actor=await admin(h);
 for(const language of ['de','en','bs']){
  const bought=await order(h,input({language})),id=bought.data.order.id;await action(h,id,actor,'paid');
  const result=await action(h,id,actor,'shipped',{confirmed:true});assert.equal(result.data.emailSent,true);
  const mail=h.mail.messages.at(-1);assert.match(mail.html,/LiZa/);assert.ok(mail.text.includes(address.street));assert.ok(mail.text.includes(bought.data.order.reference));assert.doesNotMatch(mail.html,/<script/);assert.equal(mail.attachments,undefined);
  assert.match(mail.text,language==='de'?/zwei bis drei Werktagen/:language==='en'?/two to three working days/:/dva do tri radna dana/);
  assert.doesNotMatch(mail.text,/Deine Überweisung|Your bank transfer|Tvoja uplata/);
 }
}));

test('new voucher orders notify the configured studio once without sharing buyer access tokens',()=>setup(async h=>{
 h.env.CONTACT_EMAIL='studio@example.test';
 for(const deliveryMethod of ['email','post']){
  const body=input({deliveryMethod}),responses=await Promise.all([order(h,body),order(h,body)]);assert.deepEqual(responses.map(r=>r.status).sort(),[200,201]);const purchase=responses[0].data;
  await order(h,body);
  const notices=h.mail.messages.filter(m=>m.to==='studio@example.test'&&m.subject.includes(purchase.order.reference));assert.equal(notices.length,1);const mail=notices[0];
  assert.match(mail.subject,/Neue Gutscheinbestellung eingegangen/);assert.ok(mail.text.includes(body.buyerEmail));assert.ok(mail.html.includes('mail-action'));assert.ok(mail.html.includes('mail-logo'));assert.ok(mail.html.includes('mail-footer'));assert.equal(mail.attachments,undefined);assert.ok(!mail.html.includes(purchase.accessToken));assert.ok(!mail.text.includes(purchase.accessToken));
  assert.match(mail.text,deliveryMethod==='post'?/104,80/:/100,00/);assert.match(mail.text,deliveryMethod==='post'?/mit Umschlag per Post/:/PDF per E-Mail/);
 }
}));

test('failed studio notification does not lose the order or buyer confirmation and safely retries',()=>setup(async h=>{
 const original=h.env.__TEST_MAIL.send.bind(h.env.__TEST_MAIL);let fail=true;
 h.env.__TEST_MAIL.send=async mail=>{if(fail&&mail.subject.includes('Neue Gutscheinbestellung'))throw new Error('Studio mail unavailable');return original(mail);};
 const body=input(),created=await order(h,body);assert.equal(created.status,201);assert.equal(created.data.emailSent,true);assert.equal(created.data.adminNotified,false);
 fail=false;const retried=await order(h,body);assert.equal(retried.status,200);assert.equal(retried.data.adminNotified,true);assert.equal(retried.data.order.id,created.data.order.id);
 await order(h,body);assert.equal(h.mail.messages.filter(m=>m.subject.includes('Neue Gutscheinbestellung')).length,1);assert.equal(h.mail.messages.filter(m=>m.to===body.buyerEmail).length,1);
}));
