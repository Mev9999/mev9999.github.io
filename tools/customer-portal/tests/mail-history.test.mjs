import test from 'node:test';
import assert from 'node:assert/strict';
import {createHarness,cookieValue,fixtureIds} from './harness.mjs';
import {recordMailHistory,readMailHistory,checkMailHistory,mailHistorySnapshot} from '../backend/mail-history.mjs';

test('mail audit redacts login tokens, excludes attachments, deduplicates retries and scopes records by recipient',async t=>{
 const h=await createHarness();t.after(()=>h.close());
 const message={to:'Customer@example.test',subject:'Hi',text:'https://portal.test/?token=secret&gallery=g',html:'<a href="https://portal.test/?gallery=g&amp;token=secret">Login</a>',attachments:[{content:'secret-attachment'}],idempotencyKey:'test-key'};
 const snapshot=mailHistorySnapshot(message);assert.doesNotMatch(JSON.stringify(snapshot),/secret/);assert.equal(snapshot.attachments,undefined);
 await recordMailHistory(h.env,message,'provider-id','sent');await recordMailHistory(h.env,message,null,'failed');
 const history=await readMailHistory(h.env,'customer@example.test');assert.equal(history.messages.length,1);assert.equal(history.messages[0].status,'sent');assert.equal(history.messages[0].canCheck,true);assert.equal((await readMailHistory(h.env,'other@example.test')).messages.length,0);
 assert.equal((await checkMailHistory(h.env,'other@example.test','test-key')).status,'unavailable');
});
test('mail audit is optional and cannot break delivery when the table is absent',async t=>{
 const h=await createHarness();t.after(()=>h.close());await h.DB.exec('DROP TABLE mail_history');await recordMailHistory(h.env,{to:'x@example.test'},null,'sent');assert.equal((await readMailHistory(h.env,'x@example.test')).ready,false);
});
test('existing order email snapshots are visible only to admin without sending anything',async t=>{
 const h=await createHarness();t.after(()=>h.close());
 async function login(email,password){const r=await h.request('/api/auth/login',{method:'POST',body:{email,password}});return {cookie:cookieValue(r),csrf:r.data.csrf};}
 const admin=await login('emina@example.test','Testverwaltung2026!'),client=await login('customer@example.test','Testgalerie2026!');
 const purchase=await h.request('/api/orders',{...client,method:'POST',body:{galleryId:fixtureIds.gallery,packageId:fixtureIds.singlePackage,imageIds:['local-image-3'],paymentMethod:'transfer',termsAccepted:true,digitalConsent:true,earlyStartConsent:true,consentVersion:'portal-digital-2026-10-19-consent-v4',consentLanguage:'de'}});
 assert.equal(purchase.status,201);const path='/api/admin/orders/'+purchase.data.order.id+'/emails',count=h.mail.messages.length;
 const history=await h.request(path,admin);assert.equal(history.status,200);assert.ok(history.data.messages.some(message=>message.id==='receipt'));assert.equal((await h.request(path,client)).status,403);assert.equal(h.mail.messages.length,count);
 const receipt=await h.request('/api/orders/'+purchase.data.order.id+'/receipt',admin);assert.equal(receipt.status,200);
});
test('provider lookup is bounded, scopes recipient, and distinguishes failure from delivery',async t=>{
 const h=await createHarness();t.after(()=>h.close());h.env.EMAIL_API_KEY='test-only';await recordMailHistory(h.env,{to:'a@example.test',idempotencyKey:'key'},'provider','sent');
 const original=globalThis.fetch;t.after(()=>globalThis.fetch=original);let calls=0;
 globalThis.fetch=async(url,options)=>{calls++;assert.equal(url,'https://api.resend.com/emails/provider');assert.ok(options.signal);return new Response(JSON.stringify({last_event:'delivered'}));};
 assert.equal((await checkMailHistory(h.env,'a@example.test','key')).status,'delivered');assert.equal((await checkMailHistory(h.env,'b@example.test','key')).status,'unavailable');assert.equal(calls,1);
 globalThis.fetch=async()=>new Response('{}',{status:403});assert.equal((await checkMailHistory(h.env,'a@example.test','key')).status,'unavailable');
});

test('new order sends record provider ID and exact content through the real mail adapter',async t=>{
 const h=await createHarness();t.after(()=>h.close());const login=await h.request('/api/auth/login',{method:'POST',body:{email:'customer@example.test',password:'Testgalerie2026!'}});delete h.env.__TEST_MAIL;h.env.EMAIL_API_KEY='test-key';h.env.EMAIL_FROM='studio@example.test';
 const original=globalThis.fetch;t.after(()=>globalThis.fetch=original);globalThis.fetch=async(url)=>{assert.equal(url,'https://api.resend.com/emails');return new Response(JSON.stringify({id:'provider-order'}));};
 const purchase=await h.request('/api/orders',{cookie:cookieValue(login),csrf:login.data.csrf,method:'POST',body:{galleryId:fixtureIds.gallery,packageId:fixtureIds.singlePackage,imageIds:['local-image-3'],paymentMethod:'transfer',termsAccepted:true,digitalConsent:true,earlyStartConsent:true,consentVersion:'portal-digital-2026-10-19-consent-v4',consentLanguage:'de'}});assert.equal(purchase.status,201);const history=await readMailHistory(h.env,'customer@example.test');assert.equal(history.messages.length,1);assert.equal(history.messages[0].canCheck,true);assert.equal(history.messages[0].status,'sent');assert.ok(history.messages[0].html.includes('LiZa'));
});
