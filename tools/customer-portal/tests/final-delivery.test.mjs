import test from 'node:test';
import assert from 'node:assert/strict';
import {createHarness,cookieValue,fixtureIds} from './harness.mjs';
const route=`/api/admin/galleries/${fixtureIds.gallery}`;
const imageIds=['local-image-3','local-image-4','local-image-5'];
const jpg=label=>Uint8Array.from([255,216,255,...Buffer.from(label)]);
const form=(label='FINAL',protection=null)=>{const f=new FormData();f.set('original',new Blob([jpg(label)],{type:'image/jpeg'}),'DSC-test.jpg');f.set('preview',new Blob([jpg('PREVIEW '+label)],{type:'image/jpeg'}),'preview.jpg');f.set('width','1200');f.set('height','800');if(protection){f.set('protectedPreview',new Blob([jpg('WATERMARK '+label)],{type:'image/jpeg'}),'protected.jpg');f.set('watermarkFingerprint',protection.fingerprint);}return f;};
const query=(h,sql,...p)=>h.DB.prepare(sql).bind(...p);
async function setup(t){const h=await createHarness();t.after(()=>h.close());for(const [key,email,password] of [['admin','emina@example.test','Testverwaltung2026!'],['client','customer@example.test','Testgalerie2026!']]){const r=await h.request('/api/auth/login',{method:'POST',body:{email,password}});h[key]={cookie:cookieValue(r),csrf:r.data.csrf};}const set=await h.request(route,{...h.admin,method:'PATCH',body:{requireFinalDelivery:true}});assert.equal(set.status,200,JSON.stringify(set.data));return h;}
const buy=(h,selected=imageIds)=>h.request('/api/orders',{...h.client,method:'POST',body:{galleryId:fixtureIds.gallery,packageId:selected.length===1?fixtureIds.singlePackage:fixtureIds.threePackage,imageIds:selected,paymentMethod:'transfer',termsAccepted:true,digitalConsent:true,earlyStartConsent:true,consentVersion:'portal-digital-2026-10-19-consent-v4',consentLanguage:'de'}});
const finish=(h,id,label=id,options={})=>h.request(`${route}/images/${id}/final`,{...h.admin,method:'POST',body:form(label),...options});
const pay=(h,id)=>h.request(`/api/admin/orders/${id}/paid`,{...h.admin,method:'POST',body:{}});
const original=(h,id,method='GET')=>h.request(`/api/images/${id}?kind=original`,{...h.client,method});

test('paid proofs stay locked until every selected final is ready; then exact final bytes and one email become available',async t=>{
 const h=await setup(t);const order=(await buy(h)).data.order;const before=await query(h,'SELECT receipt_text,receipt_email_json,pricing_json FROM orders WHERE id=?',order.id).first();h.mail.clear();
 const paid=await pay(h,order.id);assert.equal(paid.status,200);assert.equal(paid.data.order.deliveryPending,true);assert.equal(paid.data.order.requireFinalDelivery,true);assert.equal(h.mail.messages.length,0);
 for(const id of imageIds)for(const method of ['GET','HEAD'])assert.equal((await original(h,id,method)).status,403);
 for(const id of imageIds.slice(0,2)){const r=await finish(h,id);assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.image.finalReady,true);for(const selected of imageIds)assert.equal((await original(h,selected)).status,403);assert.equal(h.mail.messages.length,0);}
 assert.equal((await finish(h,imageIds[2])).status,200);assert.equal(h.mail.messages.length,1);assert.match(h.mail.messages[0].subject,/bereit|Download/i);
 for(const id of imageIds){const r=await original(h,id);assert.equal(r.status,200);assert.deepEqual(new Uint8Array(await r.response.arrayBuffer()),jpg(id));}
 assert.equal((await original(h,'local-image-6')).status,403);
 const listed=(await h.request('/api/orders',h.client)).data.orders[0];assert.equal(listed.deliveryPending,false);assert.equal(listed.finalReadyCount,3);assert.equal(listed.finalImageCount,3);
 assert.deepEqual(await query(h,'SELECT receipt_text,receipt_email_json,pricing_json FROM orders WHERE id=?',order.id).first(),before);
 assert.equal((await finish(h,imageIds[0],'REPLACED FINAL')).status,200);await pay(h,order.id);assert.equal(h.mail.messages.length,1);
});

test('finals uploaded before payment stay watermarked; payment releases only the ordered selection',async t=>{
 const h=await setup(t);assert.equal((await h.request(route,{...h.admin,method:'PATCH',body:{watermarkMode:'on'}})).status,200);
 const detail=(await h.request(route,h.admin)).data;const order=(await buy(h,['local-image-3'])).data.order;h.mail.clear();
 const final=await finish(h,'local-image-3','FULL QUALITY',{body:form('FULL QUALITY',detail.previewSettings)});assert.equal(final.status,200,JSON.stringify(final.data));
 assert.equal((await original(h,'local-image-3')).status,403);
 const protectedR=await h.request('/api/images/local-image-3?kind=preview',h.client);assert.deepEqual(new Uint8Array(await protectedR.response.arrayBuffer()),jpg('WATERMARK FULL QUALITY'));
 assert.equal(h.mail.messages.length,0);const paid=await pay(h,order.id);assert.equal(paid.status,200);assert.equal(paid.data.order.deliveryPending,false);assert.equal(h.mail.messages.length,1);
 const clean=await h.request('/api/images/local-image-3?kind=preview',h.client);assert.deepEqual(new Uint8Array(await clean.response.arrayBuffer()),jpg('PREVIEW FULL QUALITY'));
 assert.equal((await original(h,'local-image-4')).status,403);
});

test('final endpoint enforces auth, CSRF, image/gallery scope and file validation before replacing originals',async t=>{
 const h=await setup(t);const old=await query(h,'SELECT * FROM images WHERE id=?','local-image-3').first();
 assert.equal((await finish(h,'local-image-3','FINAL',h.client)).status,403);assert.equal((await finish(h,'local-image-3','FINAL',{csrf:undefined})).status,403);
 assert.equal((await finish(h,'unknown')).status,404);
 const invalid=form();invalid.set('original',new Blob(['<svg/>'],{type:'image/svg+xml'}),'bad.svg');assert.equal((await finish(h,'local-image-3','FINAL',{body:invalid})).status,415);
 const missing=form();missing.delete('preview');assert.equal((await finish(h,'local-image-3','FINAL',{body:missing})).status,400);
 assert.deepEqual(await query(h,'SELECT * FROM images WHERE id=?','local-image-3').first(),old);
 const final=await finish(h,'local-image-3');assert.equal(final.status,200);const row=await query(h,'SELECT * FROM images WHERE id=?','local-image-3').first();assert.equal(row.title,old.title);assert.equal(row.id,old.id);assert.equal(row.position,old.position);assert.equal(await h.PHOTOS.get(old.original_key),null);
});

test('preexisting manual grants never release proof originals in final-delivery mode and become usable only for that final',async t=>{
 const h=await setup(t);for(const id of ['local-image-1','local-image-2'])assert.equal((await original(h,id)).status,403);
 h.mail.clear();assert.equal((await finish(h,'local-image-1')).status,200);assert.equal((await original(h,'local-image-1')).status,200);assert.equal((await original(h,'local-image-2')).status,403);assert.equal(h.mail.messages.length,1);
 assert.equal((await finish(h,'local-image-1','LATER FINAL')).status,200);assert.equal(h.mail.messages.length,1);
});

test('explicit download blocks survive final uploads and repeat payment callbacks',async t=>{
 const h=await setup(t);const order=(await buy(h,['local-image-3'])).data.order;await pay(h,order.id);
 assert.equal((await h.request(route+'/release',{...h.admin,method:'DELETE',body:{userId:fixtureIds.customer,imageIds:['local-image-3']}})).status,200);
 h.mail.clear();assert.equal((await finish(h,'local-image-3')).status,200);await pay(h,order.id);assert.equal((await original(h,'local-image-3')).status,403);assert.equal(h.mail.messages.length,0);
});

test('proof uploads preserve immutable filename for batch final matching across display renames',async t=>{
 const h=await setup(t);const f=form('PROOF');f.set('title','Display name');f.set('original',new Blob([jpg('PROOF')],{type:'image/jpeg'}),'DSC00123.JPG');
 const upload=await h.request(route+'/images',{...h.admin,method:'POST',body:f});assert.equal(upload.status,201);const id=upload.data.image.id;assert.equal(upload.data.image.finalReady,false);
 const admin=(await h.request(route,h.admin)).data;assert.equal(admin.images.find(i=>i.id===id).sourceFilename,'DSC00123.JPG');
 await h.request(`${route}/images/${id}`,{...h.admin,method:'PATCH',body:{title:'Changed display name'}});assert.equal((await finish(h,id)).status,200);
 const current=(await h.request(route,h.admin)).data.images.find(i=>i.id===id);assert.equal(current.sourceFilename,'DSC00123.JPG');assert.equal(current.title,'Changed display name');assert.equal(current.finalReady,true);
});

test('failed final storage and a lost committed database response never destroy the current file set',async t=>{
 const h=await setup(t);const old=await query(h,'SELECT * FROM images WHERE id=?','local-image-3').first();const put=h.PHOTOS.put.bind(h.PHOTOS);let written=[];
 h.PHOTOS.put=async(key,...args)=>{written.push(key);if(key.endsWith('/preview'))throw new Error('storage down');return put(key,...args);};
 assert.equal((await finish(h,'local-image-3')).status,500);assert.equal((await query(h,'SELECT original_key FROM images WHERE id=?','local-image-3').first()).original_key,old.original_key);for(const key of written)assert.equal(await h.PHOTOS.get(key),null);
 h.PHOTOS.put=put;const batch=h.DB.batch.bind(h.DB);h.DB.batch=async statements=>{const r=await batch(statements);if(statements.some(s=>s.sql.includes('final_ready=1')))throw new Error('lost response');return r;};
 assert.equal((await finish(h,'local-image-3')).status,500);const committed=await query(h,'SELECT * FROM images WHERE id=?','local-image-3').first();assert.equal(committed.final_ready,1);assert.ok(await h.PHOTOS.get(committed.original_key));assert.ok(await h.PHOTOS.get(committed.preview_key));
});

test('overlapping paid orders independently wait for their full selected final set and each notify once',async t=>{
 const h=await setup(t);const a=(await buy(h,['local-image-3','local-image-4','local-image-5'])).data.order;const b=(await buy(h,['local-image-5','local-image-6','local-image-7'])).data.order;
 await pay(h,a.id);await pay(h,b.id);h.mail.clear();
 for(const id of ['local-image-3','local-image-4','local-image-5'])assert.equal((await finish(h,id)).status,200);
 assert.equal(h.mail.messages.length,1);assert.equal((await original(h,'local-image-5')).status,200);assert.equal((await original(h,'local-image-6')).status,403);
 for(const id of ['local-image-6','local-image-7'])assert.equal((await finish(h,id)).status,200);
 assert.equal(h.mail.messages.length,2);assert.equal((await query(h,'SELECT COUNT(*) n FROM download_notifications WHERE order_id IN (?,?) AND sent_at IS NOT NULL',a.id,b.id).first()).n,2);
});

test('cron recovers a committed final with no outbox after a lost response and never mails twice',async t=>{
 const h=await setup(t);const order=(await buy(h,['local-image-3'])).data.order;await pay(h,order.id);h.mail.clear();
 const batch=h.DB.batch.bind(h.DB);h.DB.batch=async statements=>{const result=await batch(statements);if(statements.some(s=>s.sql.includes('final_ready=1')))throw new Error('lost metadata response');return result;};
 assert.equal((await finish(h,'local-image-3')).status,500);assert.equal(h.mail.messages.length,0);h.DB.batch=batch;
 const worker=(await import('../backend/worker.mjs')).default;await worker.scheduled({},h.env);assert.equal(h.mail.messages.length,1);await worker.scheduled({},h.env);assert.equal(h.mail.messages.length,1);assert.equal((await original(h,'local-image-3')).status,200);
});

test('admin notification retry and repeated paid action recover missing final outbox without cron or duplicates',async t=>{
 const h=await setup(t);const order=(await buy(h,['local-image-3'])).data.order;await pay(h,order.id);h.mail.clear();
 const batch=h.DB.batch.bind(h.DB);h.DB.batch=async statements=>{const result=await batch(statements);if(statements.some(s=>s.sql.includes('final_ready=1')))throw new Error('lost metadata response');return result;};
 assert.equal((await finish(h,'local-image-3')).status,500);assert.equal(h.mail.messages.length,0);h.DB.batch=batch;
 const retry=()=>h.request(`/api/admin/orders/${order.id}/notifications/retry`,{...h.admin,method:'POST',body:{}});
 assert.equal((await retry()).status,200);assert.equal(h.mail.messages.length,1);assert.equal((await pay(h,order.id)).status,200);assert.equal((await retry()).status,200);assert.equal(h.mail.messages.length,1);
 // A separate completed upload can be recovered directly by the repeated paid action.
 const other=(await buy(h,['local-image-4'])).data.order;await pay(h,other.id);h.mail.clear();
 h.DB.batch=async statements=>{const result=await batch(statements);if(statements.some(s=>s.sql.includes('final_ready=1')))throw new Error('lost metadata response');return result;};
 assert.equal((await finish(h,'local-image-4')).status,500);h.DB.batch=batch;assert.equal((await pay(h,other.id)).status,200);assert.equal(h.mail.messages.length,1);assert.equal((await pay(h,other.id)).status,200);assert.equal(h.mail.messages.length,1);
});

test('first receipt email retry preserves final-delivery terms frozen before an attachment failure and gallery mode change',async t=>{
 const h=await setup(t);const put=h.PHOTOS.put.bind(h.PHOTOS);h.PHOTOS.put=async(key,...args)=>{if(key.startsWith('order-confirmations/'))throw new Error('receipt attachment unavailable');return put(key,...args);};
 assert.equal((await buy(h,['local-image-3'])).status,500);const stored=await query(h,'SELECT * FROM orders').first();assert.match(stored.receipt_text,/Lieferablauf: Auswahlgalerie mit anschließender Fertigstellung/);assert.equal(stored.receipt_email_json,null);assert.equal(h.mail.messages.length,0);
 h.PHOTOS.put=put;await query(h,'UPDATE galleries SET require_final_delivery=0 WHERE id=?',fixtureIds.gallery).run();
 const retry=await h.request(`/api/admin/orders/${stored.id}/receipt`,{...h.admin,method:'POST',body:{}});assert.equal(retry.status,200);assert.match(h.mail.messages[0].text,/Nach Zahlungseingang werden deine ausgewählten Bilder fertiggestellt/);assert.equal((await query(h,'SELECT receipt_text FROM orders WHERE id=?',stored.id).first()).receipt_text,stored.receipt_text);
});

test('cash-paid existing finals can be marked in one confirmed batch without reupload, byte changes or duplicate notices',async t=>{
 const h=await setup(t);const selected=['local-image-3','local-image-4','local-image-5'];const order=(await buy(h,selected)).data.order;await pay(h,order.id);h.mail.clear();
 const rows=await query(h,'SELECT * FROM images WHERE id IN (SELECT value FROM json_each(?))',JSON.stringify(selected)).all();
 const originalBytes=await Promise.all(rows.results.map(async row=>new Uint8Array(await (await h.PHOTOS.get(row.original_key)).arrayBuffer())));
 const finalize=(extra={})=>h.request(route+'/images/finalize',{...h.admin,method:'POST',body:{imageIds:selected,confirmed:true},...extra});
 assert.equal((await finalize(h.client)).status,403);assert.equal((await finalize({csrf:undefined})).status,403);assert.equal((await finalize({body:{imageIds:selected}})).data.code,'final_confirmation_required');
 for(const ids of [[],['other-image'],[selected[0],selected[0]]])assert.equal((await finalize({body:{imageIds:ids,confirmed:true}})).status,400);
 const accepted=await finalize();assert.equal(accepted.status,200,JSON.stringify(accepted.data));assert.equal(accepted.data.images.length,3);assert.ok(accepted.data.images.every(i=>i.finalReady));assert.equal(h.mail.messages.length,1);
 for(let i=0;i<rows.results.length;i++){const row=await query(h,'SELECT * FROM images WHERE id=?',rows.results[i].id).first();assert.deepEqual({...row,final_ready:0},rows.results[i]);assert.deepEqual(new Uint8Array(await (await original(h,row.id)).response.arrayBuffer()),originalBytes[i]);}
 assert.equal((await original(h,'local-image-6')).status,403);assert.equal((await finalize()).status,200);assert.equal(h.mail.messages.length,1);assert.equal((await query(h,"SELECT COUNT(*) n FROM audit_events WHERE action='images_marked_final'").first()).n,1);
});

test('existing files marked final before payment wait for payment and keep explicitly blocked files locked',async t=>{
 const h=await setup(t);const order=(await buy(h,['local-image-3'])).data.order;h.mail.clear();
 assert.equal((await h.request(route+'/images/finalize',{...h.admin,method:'POST',body:{imageIds:['local-image-3'],confirmed:true}})).status,200);
 assert.equal((await original(h,'local-image-3')).status,403);assert.equal(h.mail.messages.length,0);assert.equal((await pay(h,order.id)).status,200);assert.equal((await original(h,'local-image-3')).status,200);assert.equal(h.mail.messages.length,1);
 await h.request(route+'/release',{...h.admin,method:'DELETE',body:{userId:fixtureIds.customer,imageIds:['local-image-3']}});h.mail.clear();
 await h.request(route+'/images/finalize',{...h.admin,method:'POST',body:{imageIds:['local-image-3'],confirmed:true}});assert.equal((await original(h,'local-image-3')).status,403);assert.equal(h.mail.messages.length,0);
});

test('new original uploads can explicitly be final while the default remains proof and data is unmodified',async t=>{
 const h=await setup(t);
 for(const value of [null,'false','true']){const f=form('DIRECT FINAL');if(value!==null)f.set('finalReady',value);const created=await h.request(route+'/images',{...h.admin,method:'POST',body:f});assert.equal(created.status,201,JSON.stringify(created.data));assert.equal(created.data.image.finalReady,value==='true');const row=await query(h,'SELECT * FROM images WHERE id=?',created.data.image.id).first();assert.deepEqual(new Uint8Array(await (await h.PHOTOS.get(row.original_key)).arrayBuffer()),jpg('DIRECT FINAL'));}
 const invalid=form();invalid.set('finalReady','yes');assert.equal((await h.request(route+'/images',{...h.admin,method:'POST',body:invalid})).data.code,'invalid_final_ready');
 const customer=form();customer.set('finalReady','true');assert.equal((await h.request(route+'/images',{...h.client,method:'POST',body:customer})).status,403);
});

test('135 selected existing final files use fewer than 50 D1 queries and one notice per paid order',async t=>{
 const h=await setup(t);const selected=Array.from({length:135},(_,i)=>`local-image-${i+1}`);
 for(let n=9;n<=135;n++)await query(h,'INSERT INTO images(id,gallery_id,title,preview_key,original_key,preview_type,original_type,width,height,position,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)',`local-image-${n}`,fixtureIds.gallery,`Image ${n}`,`proof/p/${n}`,`proof/o/${n}`,'image/jpeg','image/jpeg',1000,800,n,Date.now()).run();
 const order=(await buy(h,selected)).data.order;assert.ok(order);await pay(h,order.id);h.mail.clear();
 const prepare=h.DB.prepare.bind(h.DB);let calls=0;h.DB.prepare=sql=>{calls++;return prepare(sql);};
 const marked=await h.request(route+'/images/finalize',{...h.admin,method:'POST',body:{imageIds:selected,confirmed:true}});h.DB.prepare=prepare;
 assert.equal(marked.status,200,JSON.stringify(marked.data));assert.equal(marked.data.images.length,135);assert.ok(calls<50,`used ${calls} D1 queries`);assert.equal(h.mail.messages.length,1);
 assert.equal((await query(h,'SELECT COUNT(*) n FROM download_notifications WHERE order_id=?',order.id).first()).n,1);
});

test('manual releases of a multi-image final batch generate one aggregated notice per customer',async t=>{
 const h=await setup(t);h.mail.clear();
 const request=()=>h.request(route+'/images/finalize',{...h.admin,method:'POST',body:{imageIds:['local-image-1','local-image-2'],confirmed:true}});
 assert.equal((await request()).status,200);assert.equal(h.mail.messages.length,1);assert.equal((await request()).status,200);assert.equal(h.mail.messages.length,1);
 const notices=(await query(h,"SELECT * FROM download_notifications WHERE id LIKE 'manual-final-%'").all()).results;assert.equal(notices.length,1);assert.equal(JSON.parse(notices[0].image_ids_json).length,2);
});

test('60-order admin and customer lists batch final-delivery metadata within 50 D1 queries',async t=>{
 const h=await setup(t);const created=(await buy(h,['local-image-3'])).data.order;
 for(let n=0;n<60;n++){const id=`list-order-${n}`;await query(h,"INSERT INTO orders(id,user_id,gallery_id,package_id,package_name,amount_cents,currency,status,payment_method,terms_version,consent_at,created_at) SELECT ?,user_id,gallery_id,package_id,package_name,amount_cents,currency,'pending',payment_method,terms_version,consent_at,created_at FROM orders WHERE id=?",id,created.id).run();await query(h,'INSERT INTO order_images(order_id,image_id) VALUES(?,?)',id,'local-image-3').run();}
 for(const [path,auth] of [['/api/admin/orders',h.admin],['/api/orders',h.client]]){const prepare=h.DB.prepare.bind(h.DB);let calls=0;h.DB.prepare=sql=>{calls++;return prepare(sql);};const list=await h.request(path,auth);h.DB.prepare=prepare;assert.equal(list.status,200);assert.equal(list.data.orders.length,61);assert.ok(calls<50,`${path}: ${calls} queries`);assert.ok(list.data.orders.every(o=>o.requireFinalDelivery&&o.finalImageCount===1&&o.finalReadyCount===0));}
});
