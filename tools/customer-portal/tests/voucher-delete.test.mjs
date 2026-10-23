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
 const preview=()=>h.request(`/api/admin/vouchers/${order.id}/delete-preview`,actor);
 const removeWithUsage=async(overrides={})=>{const state=await preview();assert.equal(state.status,200);return remove({body:{...body,testUsageOnly:true,deleteSnapshot:state.data.deleteSnapshot},...overrides});};
 const operation=(kind,values={})=>h.request(`/api/admin/vouchers/${order.id}/${kind}`,{...actor,method:'POST',body:{idempotencyKey:crypto.randomUUID(),...values}});
 await fn({h,actor,order,accessToken,body,remove,preview,removeWithUsage,operation});
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
 const busy=await remove();assert.equal(busy.status,409);assert.equal(busy.data.code,'voucher_delete_busy');
 await h.env.DB.prepare('UPDATE gift_vouchers SET gift_lease_at=? WHERE id=?').bind(Date.now()-11*60000,order.id).run();
 assert.equal((await remove()).status,200);
}));

test('deletion preview requires administrator and test usage requires a complete current snapshot',()=>setup(async({h,order,body,remove,preview,operation})=>{
 assert.equal((await h.request(`/api/admin/vouchers/${order.id}/delete-preview`)).status,401);
 const customer=await h.request('/api/auth/login',{method:'POST',body:{email:'customer@example.test',password:'Testgalerie2026!'}});
 assert.equal((await h.request(`/api/admin/vouchers/${order.id}/delete-preview`,{cookie:cookieValue(customer)})).status,403);
 await operation('paid');await operation('redeem',{amountCents:2000,bookingReference:'Test'});
 const current=await preview();assert.equal(current.status,200);assert.equal(current.data.voucher.balanceCents,8000);
 const snapshot=JSON.parse(current.data.deleteSnapshot);assert.equal(snapshot.operation_count,1);
 for(const deleteSnapshot of [undefined,null,{},'invalid','{}',JSON.stringify({...snapshot,id:'different'}),JSON.stringify({...snapshot,operation_count:-1}),JSON.stringify({...snapshot,paid_at:'wrong'})]) {
  const rejected=await remove({body:{...body,testUsageOnly:true,deleteSnapshot}});assert.equal(rejected.status,400);assert.equal(rejected.data.code,'voucher_delete_confirmation_required');
 }
 for(const missing of [{...body,testOnly:false},{...body,confirmed:false},{...body,reference:'wrong'}]) {
  assert.equal((await remove({body:{...missing,testUsageOnly:true,deleteSnapshot:current.data.deleteSnapshot}})).status,400);
 }
 assert.equal((await remove({csrf:undefined,body:{...body,testUsageOnly:true,deleteSnapshot:current.data.deleteSnapshot}})).status,403);
 assert.equal((await remove({body:{...body,deleteSnapshot:current.data.deleteSnapshot}})).data.code,'voucher_in_use');
 assert.equal((await preview()).data.voucher.balanceCents,8000);
}));

for(const amountCents of [2000,10000])test(`explicitly confirmed test redemption (${amountCents} cents) can be deleted without sending mail`,()=>setup(async({h,actor,order,accessToken,operation,removeWithUsage})=>{
 const paid=await operation('paid');const code=paid.data.voucher.code;
 assert.equal((await operation('redeem',{amountCents,bookingReference:'Nur Test'})).status,200);
 const before=h.mail.messages.length;assert.equal((await removeWithUsage()).status,200);assert.equal(h.mail.messages.length,before);
 for(const table of ['gift_vouchers','voucher_operations','voucher_reservations']) {
  assert.equal((await h.DB.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ${table==='gift_vouchers'?'id':'voucher_id'}=?`).bind(order.id).first()).n,0);
 }
 for(const suffix of ['','/pdf'])assert.equal((await h.request(`/api/vouchers/orders/${order.id}${suffix}?token=${accessToken}`)).status,404);
 assert.equal((await h.request(`/api/admin/vouchers/${order.id}/pdf`,actor)).status,404);
 assert.equal((await h.request('/api/admin/vouchers?code='+code,actor)).data.vouchers.length,0);
 assert.equal((await operation('resend')).status,404);
 assert.equal((await h.DB.prepare("SELECT COUNT(*) AS n FROM audit_events WHERE action='voucher_test_deleted' AND target_id=?").bind(order.id).first()).n,1);
 assert.equal((await h.DB.prepare("SELECT COUNT(*) AS n FROM audit_events WHERE action='voucher_refund' AND target_id=?").bind(order.id).first()).n,0);
}));

test('explicitly confirmed active and redeemed reservations are removed only for the selected test voucher',()=>setup(async({h,actor,order,operation,removeWithUsage})=>{
 await operation('paid');const used=await operation('reserve',{amountCents:2000,bookingReference:'Test used'});
 assert.equal((await operation('redeem',{amountCents:2000,bookingReference:'Test used',reservationId:used.data.reservationId})).status,200);
 assert.equal((await operation('reserve',{amountCents:3000,bookingReference:'Test active'})).status,200);
 const other=await h.request('/api/vouchers/orders',{method:'POST',body:{amountCents:5000,buyerName:'Other test',buyerEmail:'other@example.test',buyerAddress:'Testweg 2',language:'de',termsAccepted:true,idempotencyKey:crypto.randomUUID()}});
 const otherId=other.data.order.id;
 assert.equal((await h.request(`/api/admin/vouchers/${otherId}/paid`,{...actor,method:'POST',body:{}})).status,200);
 assert.equal((await h.request(`/api/admin/vouchers/${otherId}/reserve`,{...actor,method:'POST',body:{amountCents:1000,bookingReference:'Other booking',idempotencyKey:crypto.randomUUID()}})).status,200);
 const otherBefore=await h.DB.prepare('SELECT * FROM gift_vouchers WHERE id=?').bind(otherId).first();
 assert.equal((await removeWithUsage()).status,200);
 for(const table of ['voucher_operations','voucher_reservations']) {
  assert.equal((await h.DB.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE voucher_id=?`).bind(order.id).first()).n,0);
  assert.equal((await h.DB.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE voucher_id=?`).bind(otherId).first()).n,1);
 }
 assert.deepEqual(await h.DB.prepare('SELECT * FROM gift_vouchers WHERE id=?').bind(otherId).first(),otherBefore);
}));

test('history changes after preview block deletion even when balances return to their previous values',()=>setup(async({h,order,body,preview,remove,operation})=>{
 await operation('paid');const state=await preview();
 const reserved=await operation('reserve',{amountCents:1000,bookingReference:'Later test'});
 await operation('release',{reservationId:reserved.data.reservationId});
 const result=await remove({body:{...body,testUsageOnly:true,deleteSnapshot:state.data.deleteSnapshot}});
 assert.equal(result.status,409);assert.equal(result.data.code,'voucher_delete_changed');
 assert.equal((await h.DB.prepare('SELECT balance_cents,reserved_cents FROM gift_vouchers WHERE id=?').bind(order.id).first()).balance_cents,10000);
 assert.equal((await h.DB.prepare('SELECT COUNT(*) AS n FROM voucher_operations WHERE voucher_id=?').bind(order.id).first()).n,2);
 assert.equal((await h.DB.prepare("SELECT COUNT(*) AS n FROM audit_events WHERE action='voucher_test_deleted' AND target_id=?").bind(order.id).first()).n,0);
}));

test('confirmed usage deletion rechecks a concurrent redemption inside the transaction',()=>setup(async({h,order,body,preview,remove,operation})=>{
 await operation('paid');const state=await preview();const batch=h.DB.batch.bind(h.DB);let interleaved=false;
 h.DB.batch=async statements=>{
  if(!interleaved&&statements.some(s=>s.sql.includes('voucher_test_deleted'))){interleaved=true;assert.equal((await operation('redeem',{amountCents:1000,bookingReference:'Concurrent'})).status,200);}
  return batch(statements);
 };
 const result=await remove({body:{...body,testUsageOnly:true,deleteSnapshot:state.data.deleteSnapshot}});
 assert.equal(result.status,409);assert.equal(result.data.code,'voucher_delete_changed');assert.equal(interleaved,true);
 assert.equal((await h.DB.prepare('SELECT balance_cents FROM gift_vouchers WHERE id=?').bind(order.id).first()).balance_cents,9000);
 assert.equal((await h.DB.prepare('SELECT COUNT(*) AS n FROM voucher_operations WHERE voucher_id=?').bind(order.id).first()).n,1);
}));

test('current email leases block confirmed test usage deletion and preserve its history',()=>setup(async({h,order,operation,removeWithUsage})=>{
 await operation('paid');await operation('redeem',{amountCents:1000,bookingReference:'Test'});
 for(const column of ['gift_lease_at','confirmation_lease_at']) {
  await h.DB.prepare(`UPDATE gift_vouchers SET ${column}=? WHERE id=?`).bind(Date.now(),order.id).run();
  const busy=await removeWithUsage();assert.equal(busy.status,409);assert.equal(busy.data.code,'voucher_delete_busy');
  assert.equal((await h.DB.prepare('SELECT COUNT(*) AS n FROM voucher_operations WHERE voucher_id=?').bind(order.id).first()).n,1);
  await h.DB.prepare(`UPDATE gift_vouchers SET ${column}=NULL WHERE id=?`).bind(order.id).run();
 }
 assert.equal((await removeWithUsage()).status,200);
}));
