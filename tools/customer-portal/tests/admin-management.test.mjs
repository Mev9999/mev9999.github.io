import test from 'node:test';
import assert from 'node:assert/strict';
import { createHarness, cookieValue, fixtureIds } from './harness.mjs';
async function login(h, role = 'admin') {
 const r=await h.request('/api/auth/login',{method:'POST',body:{email:role==='admin'?'emina@example.test':'customer@example.test',password:role==='admin'?'Testverwaltung2026!':'Testgalerie2026!'}});
 assert.equal(r.status,200); const cookie=cookieValue(r); return {cookie,csrf:(await h.request('/api/session',{cookie})).data.csrf};
}
async function use(fn) { const h=await createHarness();try {await fn(h,await login(h),await login(h,'customer'));}finally{await h.close();} }
const buy=(h,c)=>h.request('/api/orders',{...c,method:'POST',body:{galleryId:fixtureIds.gallery,packageId:fixtureIds.singlePackage,imageIds:['local-image-3'],paymentMethod:'transfer',termsAccepted:true,digitalConsent:true}});
const deletion=(h,a,o,extra={})=>h.request(`/api/admin/orders/${o.id}`,{...a,method:'DELETE',body:{confirmed:true,testOrder:true,confirmReference:o.reference,...extra}});
const query=(h,sql,...params)=>h.DB.prepare(sql).bind(...params);

test('activity read uses server snapshot and ignores client clock skew while retaining newer events',()=>use(async(h,a,c)=>{
 const now=Date.now();
 await query(h,"INSERT INTO customer_activity(id,kind,user_id,gallery_id,created_at) VALUES('old','favorite_added',?,?,?)",fixtureIds.customer,fixtureIds.gallery,now-1000).run();
 const page=await h.request('/api/admin/activity',a);assert.equal(page.status,200);assert.ok(Number.isSafeInteger(page.data.readThrough));
 await query(h,"INSERT INTO customer_activity(id,kind,user_id,gallery_id,created_at) VALUES('new','favorite_added',?,?,?)",fixtureIds.customer,fixtureIds.gallery,page.data.readThrough+1).run();
 assert.equal((await h.request('/api/admin/activity/read',{...c,method:'POST',body:{readThrough:page.data.readThrough}})).status,403);
 assert.equal((await h.request('/api/admin/activity/read',{cookie:a.cookie,method:'POST',body:{readThrough:page.data.readThrough}})).status,403);
 assert.equal((await h.request('/api/admin/activity/read',{...a,method:'POST',body:{readThrough:page.data.readThrough}})).status,200);
 assert.ok((await query(h,"SELECT read_at FROM customer_activity WHERE id='old'").first()).read_at);
 assert.equal((await query(h,"SELECT read_at FROM customer_activity WHERE id='new'").first()).read_at,null);
 assert.equal((await h.request('/api/admin/activity/read',{...a,method:'POST',body:{before:Date.now()+86400000}})).status,200);
 assert.equal((await h.request('/api/admin/activity/read',{...a,method:'POST',body:{readThrough:-1}})).status,400);
}));

test('test order deletion requires admin, CSRF, test attestation and exact reference; retains snapshots and revokes only its rights',()=>use(async(h,a,c)=>{
 const created=await buy(h,c); assert.equal(created.status,201,JSON.stringify(created.data));const o=created.data.order;
 await query(h,"UPDATE orders SET status='paid' WHERE id=?",o.id).run();
 assert.equal((await h.request('/api/images/local-image-3?kind=original',c)).status,200);
 assert.equal((await deletion(h,c,o)).status,403);assert.equal((await deletion(h,{cookie:a.cookie},o)).status,403);
 assert.equal((await deletion(h,a,o,{testOrder:false})).status,400);assert.equal((await deletion(h,a,o,{confirmReference:'wrong'})).status,400);
 const before=await query(h,'SELECT status,receipt_text,receipt_email_json,amount_cents FROM orders WHERE id=?',o.id).first();const mails=h.mail.messages.length;
 assert.equal((await deletion(h,a,o)).status,200);assert.equal((await deletion(h,a,o)).status,200);
 assert.deepEqual(await query(h,'SELECT status,receipt_text,receipt_email_json,amount_cents FROM orders WHERE id=?',o.id).first(),before);
 assert.equal(h.mail.messages.length,mails);assert.equal((await query(h,"SELECT COUNT(*) n FROM audit_events WHERE action='test_order_deleted'").first()).n,1);
 assert.equal((await h.request('/api/admin/orders',a)).data.orders.length,0);assert.equal((await h.request('/api/orders',c)).data.orders.length,0);
 assert.equal((await h.request('/api/images/local-image-3?kind=original',c)).status,403);
 for(const path of ['receipt','invoice']) assert.equal((await h.request(`/api/orders/${o.id}/${path}`,c)).status,404);
 for(const path of ['paid','refunded','receipt','notifications/retry']) assert.equal((await h.request(`/api/admin/orders/${o.id}/${path}`,{...a,method:'POST',body:{}})).status,404);
 assert.equal((await h.request(`/api/orders/${o.id}/withdraw`,{...c,method:'POST',body:{confirmed:true}})).status,404);
 await query(h,'INSERT INTO manual_releases(user_id,image_id,released_at,released_by) VALUES(?,?,?,?)',fixtureIds.customer,'local-image-3',Date.now(),fixtureIds.admin).run();
 assert.equal((await h.request('/api/images/local-image-3?kind=original',c)).status,200);
 
}));

test('deleted pending/paid required test orders no longer block replacement or satisfy booking',()=>use(async(h,a,c)=>{
 await query(h,'UPDATE packages SET is_required=1 WHERE id=?',fixtureIds.singlePackage).run();
 const first=await buy(h,c);assert.equal(first.status,201);const o=first.data.order;
 await query(h,"UPDATE orders SET status='paid' WHERE id=?",o.id).run();
 assert.equal((await h.request(`/api/galleries/${fixtureIds.gallery}`,c)).data.requiredPackagePaid,true);
 assert.equal((await deletion(h,a,o)).status,200);
 assert.equal((await h.request(`/api/galleries/${fixtureIds.gallery}`,c)).data.requiredPackagePaid,false);
 const second=await buy(h,c);assert.equal(second.status,201,JSON.stringify(second.data));assert.notEqual(second.data.order.id,o.id);
 assert.equal((await deletion(h,a,second.data.order)).status,200);
 const third=await buy(h,c);assert.equal(third.status,201);assert.notEqual(third.data.order.id,second.data.order.id);
}));

test('online provider evidence prevents test deletion even for mislabeled transfer rows',()=>use(async(h,a,c)=>{
 const o=(await buy(h,c)).data.order;
 for(const [sql,args] of [["UPDATE orders SET provider_reference='provider' WHERE id=?",[o.id]],["UPDATE orders SET provider_reference=NULL,checkout_url='https://example.test/payment' WHERE id=?",[o.id]]]){
  await query(h,sql,...args).run();assert.equal((await deletion(h,a,o)).status,409);assert.equal((await h.request('/api/admin/orders',a)).data.orders[0].canDeleteTest,false);
 }
 await query(h,'UPDATE orders SET checkout_url=NULL WHERE id=?',o.id).run();
 await query(h,"INSERT INTO payment_events(id,provider,order_id,created_at) VALUES('payment','stripe',?,?)",o.id,Date.now()).run();
 assert.equal((await deletion(h,a,o)).status,409);
}));

test('persistent package order is gallery scoped, complete, authenticated and independent of price calculation',()=>use(async(h,a,c)=>{
 const route=`/api/admin/galleries/${fixtureIds.gallery}/packages`;
 const before=(await h.request(`/api/admin/galleries/${fixtureIds.gallery}`,a)).data;assert.equal(before.packageOrderReady,true);
 const ordered=before.packages.map(p=>p.id).reverse();
 const reorder=(auth,ids)=>h.request(route+'/order',{...auth,method:'PUT',body:{packageIds:ids}});
 assert.equal((await reorder(c,ordered)).status,403);assert.equal((await reorder({cookie:a.cookie},ordered)).status,403);
 for(const invalid of [ordered.slice(1),[...ordered,ordered[0]],['foreign-package',...ordered.slice(1)]]) assert.equal((await reorder(a,invalid)).status,400);
 assert.equal((await reorder(a,ordered)).status,200);
 assert.deepEqual((await h.request(`/api/galleries/${fixtureIds.gallery}`,c)).data.packages.map(p=>p.id),ordered);
 const added=await h.request(route,{...a,method:'POST',body:{name:'New last',imageCount:5,priceCents:4000}});assert.equal(added.status,201);assert.equal(added.data.package.position,ordered.length);
 const after=(await h.request(`/api/admin/galleries/${fixtureIds.gallery}`,a)).data;assert.equal(after.packages.at(-1).id,added.data.package.id);
 const bought=await buy(h,c);assert.equal(bought.status,201);assert.equal(bought.data.order.amountCents,1000);
}));

