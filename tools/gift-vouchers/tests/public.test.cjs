'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{webcrypto}=require('node:crypto');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'../../..'),script=fs.readFileSync(path.join(__dirname,'../public-page.js'),'utf8');
function fixture({url='http://127.0.0.1:8791/gutscheine-kaufen.html',fetch}={}){
 const dom=new JSDOM(fs.readFileSync(path.join(root,'gutscheine-kaufen.html'),'utf8'),{url,runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;Object.defineProperty(w,'crypto',{value:webcrypto});w.TextEncoder=TextEncoder;w.fetch=fetch||(()=>Promise.reject(Error('Unexpected request')));w.HTMLElement.prototype.scrollIntoView=function(){};w.LizaBankQr={draw(){}};w.eval(script);return dom;
}
function fill(w){for(const [name,value] of Object.entries({buyerName:'Gutschein Test',buyerEmail:'buyer@example.test',street:'Testweg 1',postal:'8054',city:'Graz',country:'Österreich'}))w.document.querySelector('[name="'+name+'"]').value=value;w.document.querySelector('#termsAccepted').checked=true;}
const next=()=>new Promise(resolve=>setTimeout(resolve,30));
const order={id:'test-order',reference:'LZ-G-TEST',status:'pending',paymentStatus:'unpaid',amountCents:10000,withdrawUntil:new Date(Date.now()+86400000).toISOString(),giftTo:'Someone',giftFrom:'Test',message:'Hello'};
test('shared language switch keeps buyer access local and never adds it to website navigation',async()=>{
 const dom=fixture({url:'https://portal.liza-memories-photography.com/gutscheine-kaufen.html#order=test-order&token=buyer-secret',fetch:async()=>({ok:true,json:async()=>({order})})}),w=dom.window;
 await next();
 const links=[...w.document.querySelectorAll('header .lang-option[data-lang]')];assert.equal(links.length,3);
 for(const link of links){const url=new URL(link.href);assert.equal(url.origin,w.location.origin);assert.equal(new URLSearchParams(url.hash.slice(1)).get('token'),'buyer-secret');}
 for(const link of w.document.querySelectorAll('header a:not(.lang-option),footer a'))assert.ok(!link.href.includes('buyer-secret'),link.href);
 assert.equal(w.document.querySelector('header a[data-gift-nav]').href,'https://liza-memories-photography.com/gutscheine.html');
 dom.window.close();
});
test('decimal-comma amounts update all totals and reject an amount above the agreed maximum',()=>{
 const dom=fixture(),w=dom.window,input=w.document.querySelector('#amount');input.value='123,45';input.dispatchEvent(new w.Event('input',{bubbles:true}));
 assert.match(w.document.querySelector('[data-total]').textContent,/123,45/);assert.equal(input.validationMessage,'');
 input.value='2000,01';input.dispatchEvent(new w.Event('input',{bubbles:true}));assert.notEqual(input.validationMessage,'');assert.equal(w.document.querySelector('[data-total]').textContent,'—');dom.window.close();
});
test('personal gift text remains text rather than executing markup',()=>{
 const dom=fixture(),w=dom.window,input=w.document.querySelector('#message');input.value='<img src=x onerror=alert(1)>';input.dispatchEvent(new w.Event('input',{bubbles:true}));
 assert.equal(w.document.querySelector('[data-preview-message]').textContent,input.value);assert.equal(w.document.querySelector('[data-preview-message] img'),null);dom.window.close();
});
test('an order retry reuses its idempotency key and shows pending payment without an active code',async()=>{
 const requests=[];let fail=true;
 const dom=fixture({fetch:async(url,options)=>{const body=JSON.parse(options.body);requests.push({url,body});if(fail){fail=false;throw Error('Connection interrupted');}return {ok:true,json:async()=>({order,accessToken:'secret-buyer-token',voucher:null,transfer:{recipient:'Testkonto',iban:'DE71110220330123456789',bic:'BHBLDEHHXXX',amountCents:10000,reference:'LZ-G-TEST'},emailSent:false})};}}),w=dom.window;fill(w);
 const form=w.document.querySelector('#voucher-order-form');form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await next();await next();assert.equal(requests.length,1);form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await next();await next();
 assert.equal(requests.length,2);assert.equal(requests[0].body.idempotencyKey,requests[1].body.idempotencyKey);assert.equal(requests[1].body.amountCents,10000);assert.equal(requests[1].body.termsAccepted,true);assert.equal(typeof requests[1].body.buyerAddress,'string');
 assert.equal(w.document.querySelector('#voucher-purchase').hidden,true);assert.match(w.location.hash,/token=secret-buyer-token/);assert.equal(w.location.search,'');assert.equal(w.document.querySelector('#voucher-pdf'),null);assert.match(w.document.querySelector('#voucher-status').textContent,/noch nicht gesendet/);dom.window.close();
});
test('secure buyer status exposes the PDF only after actual payment and withdrawal blocks it',async()=>{
 let withdrawn=false;const requests=[];
 const dom=fixture({url:'http://127.0.0.1:8791/gutscheine-kaufen.html#order=test-order&token=buyer-secret',fetch:async(url,options)=>{requests.push(url);if(options.method==='POST')withdrawn=true;return {ok:true,json:async()=>({order:{...order,status:withdrawn?'withdrawal_requested':'active',paymentStatus:'paid'},voucher:withdrawn?null:{code:'LZG-TEST-CODE',balanceCents:10000}})};}}),w=dom.window;await next();
 assert.match(w.document.querySelector('#voucher-pdf').getAttribute('href'),/\/test-order\/pdf\?token=buyer-secret/);assert.match(w.document.querySelector('.gv-code').textContent,/LZG-TEST-CODE/);
 const withdraw=w.document.querySelector('#voucher-withdraw-form');withdraw.querySelector('input').checked=true;withdraw.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await next();assert.equal(w.document.querySelector('#voucher-pdf'),null);assert.equal(w.document.querySelector('.gv-code'),null);assert.match(w.document.querySelector('#voucher-status').textContent,/Rücktritt ist eingegangen/);assert.ok(requests.some(url=>url.endsWith('/withdraw')));dom.window.close();
});
test('missing buyer token does not silently load or create an order',()=>{
 const dom=fixture({url:'http://127.0.0.1:8791/gutscheine-kaufen.html#order=test-order'});assert.match(dom.window.document.querySelector('#voucher-status').textContent,/unvollständig/);assert.equal(dom.window.document.querySelector('#voucher-purchase').hidden,true);dom.window.close();
});

test('withdrawal remains available before successful gift email even for an active paid voucher',async()=>{
 for(const active of [false,true]){
  const dom=fixture({url:'http://127.0.0.1:8791/gutscheine-kaufen.html#order=test-order&token=buyer-secret',fetch:async()=>({ok:true,json:async()=>({order:{...order,status:active?'active':'pending',paymentStatus:active?'paid':'unpaid',withdrawUntil:null},voucher:active?{code:'LZG-TEST-CODE',balanceCents:10000}:null})})});
  await next();assert.ok(dom.window.document.querySelector('#voucher-withdraw-form'));dom.window.close();
 }
});

test('an elapsed automatic withdrawal deadline keeps the email contact route visible',async()=>{
 const dom=fixture({url:'http://127.0.0.1:8791/gutscheine-kaufen.html#order=test-order&token=buyer-secret',fetch:async()=>({ok:true,json:async()=>({order:{...order,status:'active',paymentStatus:'paid',withdrawUntil:new Date(Date.now()-86400000).toISOString()},voucher:{code:'LZG-TEST-CODE',balanceCents:10000}})})});
 await next();assert.equal(dom.window.document.querySelector('#voucher-withdraw-form'),null);assert.ok(dom.window.document.querySelector('#voucher-status a[href^="mailto:"]'));dom.window.close();
});
