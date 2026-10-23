import test from 'node:test';
import assert from 'node:assert/strict';
import {createHarness,cookieValue} from './harness.mjs';

async function setup(fn){const h=await createHarness();try{
 const login=await h.request('/api/auth/login',{method:'POST',body:{email:'emina@example.test',password:'Testverwaltung2026!'}});
 const actor={cookie:cookieValue(login),csrf:login.data.csrf};
 const purchase=await h.request('/api/vouchers/orders',{method:'POST',body:{amountCents:10000,buyerName:'Test',buyerEmail:'delete@example.test',buyerAddress:'Testweg 1, Graz',language:'de',termsAccepted:true,idempotencyKey:crypto.randomUUID()}});
 assert.equal(purchase.status,201); const {order,accessToken}=purchase.data;
 const body={confirmed:true,testOnly:true,reference:order.reference};
 const remove=(overrides={})=>h.request('/api/admin/vouchers/'+order.id,{...actor,method:'DELETE',body,...overrides});
 const operation=(kind,values={})=>h.request(`/api/admin/vouchers/${order.id}/${kind}`,{...actor,method:'POST',body:{idempotencyKey:crypto.randomUUID(),...values}});
 await fn({h,actor,order,accessToken,body,remove,operation});
}finally{await h.close();}}

test('test deletion requires administrator, CSRF, explicit test confirmation and exact reference',()=>setup(async({h,order,actor,body,remove})=>{
 assert.equal((await remove({cookie:undefined,csrf:undefined})).status,401);
 assert.equal((await remove({csrf:undefined})).status,403);
 const customer=await h.request('/api/auth/login',{method:'POST',body:{email:'customer@example.test',password:'Testgalerie2026!'}});
 assert.equal((await remove({cookie:cookieValue(customer),csrf:customer.data.csrf})).status,403);
 for(const incomplete of [{confirmed:true,reference:order.reference},{testOnly:true,reference:order.reference},{...body,reference:'wrong'}])assert.equal((await remove({body:incomplete})).status,400);
 assert.equal((await h.request('/api/admin/vouchers/'+order.id,actor)).status,200);
 assert.equal((await remove()).status,200);
 assert.equal((await h.request('/api/admin/vouchers/'+order.id,actor)).status,404);
 assert.equal((await h.env.DB.prepare("SELECT COUNT(*) AS n FROM audit_events WHERE action='voucher_test_deleted' AND target_id=?").bind(order.id).first()).n,1);
}));

test('paid test deletion revokes code, buyer link and PDF without sending an email',()=>setup(async({h,actor,order,accessToken,remove,operation})=>{
 const payment=await operation('paid');assert.equal(payment.status,200);const code=payment.data.voucher.code;
 const before=h.mail.messages.length; assert.equal((await remove()).status,200);assert.equal(h.mail.messages.length,before);
 for(const suffix of ['', '/pdf'])assert.equal((await h.request(`/api/vouchers/orders/${order.id}${suffix}?token=${accessToken}`)).status,404);
 assert.equal((await h.request('/api/admin/vouchers?code='+code,actor)).data.vouchers.length,0);
 assert.equal((await operation('resend')).status,404);
}));

test('active reservations and redemptions block deletion; released test reservations can be removed',()=>setup(async({h,order,remove,operation})=>{
 await operation('paid');const reservation=await operation('reserve',{amountCents:3000,bookingReference:'Testtermin'});assert.equal(reservation.status,200);
 assert.equal((await remove()).status,409);
 assert.equal((await operation('release',{reservationId:reservation.data.reservationId})).status,200);
 assert.equal((await remove()).status,200);
 for(const table of ['voucher_reservations','voucher_operations'])assert.equal((await h.env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE voucher_id=?`).bind(order.id).first()).n,0);
}));

test('a redeemed voucher and its operation history are preserved',()=>setup(async({h,order,remove,operation})=>{
 await operation('paid');assert.equal((await operation('redeem',{amountCents:2000,bookingReference:'Buchung'})).status,200);
 const result=await remove();assert.equal(result.status,409);assert.equal(result.data.code,'voucher_in_use');
 assert.equal((await h.env.DB.prepare('SELECT balance_cents FROM gift_vouchers WHERE id=?').bind(order.id).first()).balance_cents,8000);
 assert.equal((await h.env.DB.prepare('SELECT COUNT(*) AS n FROM voucher_operations WHERE voucher_id=?').bind(order.id).first()).n,1);
}));

test('deletion rechecks a concurrent reservation inside the transaction',()=>setup(async({h,order,remove,operation})=>{
 await operation('paid');const batch=h.env.DB.batch.bind(h.env.DB);let interleaved=false;
 h.env.DB.batch=async statements=>{
  if(!interleaved&&statements.some(s=>s.sql.includes('voucher_test_deleted'))){interleaved=true;assert.equal((await operation('reserve',{amountCents:1000,bookingReference:'Concurrent'})).status,200);}
  return batch(statements);
 };
 assert.equal((await remove()).status,409);assert.equal(interleaved,true);
 assert.equal((await h.env.DB.prepare('SELECT reserved_cents FROM gift_vouchers WHERE id=?').bind(order.id).first()).reserved_cents,1000);
}));

test('an ongoing email send blocks deletion until its lease expires',()=>setup(async({h,order,remove})=>{
 await h.env.DB.prepare('UPDATE gift_vouchers SET gift_lease_at=? WHERE id=?').bind(Date.now(),order.id).run();
 assert.equal((await remove()).status,409);
 await h.env.DB.prepare('UPDATE gift_vouchers SET gift_lease_at=? WHERE id=?').bind(Date.now()-11*60000,order.id).run();
 assert.equal((await remove()).status,200);
}));
