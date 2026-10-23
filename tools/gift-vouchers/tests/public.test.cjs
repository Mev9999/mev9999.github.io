'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{webcrypto}=require('node:crypto');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'../../..'),script=fs.readFileSync(path.join(__dirname,'../public-page.js'),'utf8');
function fixture({url='http://127.0.0.1:8791/gutscheine-kaufen.html',fetch,clipboard,execCopy}={}){
 const dom=new JSDOM(fs.readFileSync(path.join(root,'gutscheine-kaufen.html'),'utf8'),{url,runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;Object.defineProperty(w,'crypto',{value:webcrypto});Object.defineProperty(w.navigator,'clipboard',{value:clipboard});if(execCopy)w.document.execCommand=execCopy;
 w.document.getElementById('voucher-copy').textContent=JSON.stringify({lang:'de',...require('../copy-de.cjs')});
 w.TextEncoder=TextEncoder;w.fetch=fetch||(()=>Promise.reject(Error('Unexpected request')));w.HTMLElement.prototype.scrollIntoView=function(){};w.LizaBankQr={draw(){}};w.eval(script);return dom;
}
function fill(w){for(const [name,value] of Object.entries({buyerName:'Gutschein Test',buyerEmail:'buyer@example.test',street:'Testweg 1',postal:'8054',city:'Graz',country:'Österreich'}))w.document.querySelector('[name="'+name+'"]').value=value;w.document.querySelector('#termsAccepted').checked=true;}
const next=()=>new Promise(resolve=>setTimeout(resolve,30));
const order={id:'test-order',reference:'LZ-G-TEST',status:'pending',paymentStatus:'unpaid',amountCents:10000,withdrawUntil:new Date(Date.now()+86400000).toISOString(),giftTo:'Someone',giftFrom:'Test',message:'Hello'};
test('postal delivery adds only postage, preserves face value and conditionally requires an Austrian address',()=>{
 const dom=fixture(),w=dom.window,checkbox=w.document.querySelector('#postDelivery'),address=w.document.querySelector('#voucher-shipping-address');
 assert.equal(checkbox.checked,false);assert.equal(address.hidden,true);assert.ok([...address.querySelectorAll('input')].every(field=>field.disabled&&!field.required));
 checkbox.click();assert.equal(address.hidden,false);assert.equal(w.document.querySelector('#voucher-post-preview').hidden,false);assert.equal(w.document.querySelectorAll('#voucher-post-preview img').length,4);assert.match(w.document.querySelector('#voucher-post-preview').textContent,/21 × 9,5 cm/);assert.ok([...address.querySelectorAll('input')].every(field=>!field.disabled&&field.required));
 assert.match(w.document.querySelector('[data-total]').textContent,/104,80/);assert.match(w.document.querySelector('[data-credit]').textContent,/100,00/);assert.match(w.document.querySelector('[data-preview-amount]').textContent,/100/);assert.doesNotMatch(w.document.querySelector('[data-preview-amount]').textContent,/104/);
 const postal=w.document.querySelector('#shippingPostal');postal.value='80540';postal.dispatchEvent(new w.Event('input',{bubbles:true}));assert.notEqual(postal.validationMessage,'');checkbox.click();assert.equal(w.document.querySelector('#voucher-post-preview').hidden,true);assert.equal(postal.disabled,true);assert.equal(postal.required,false);assert.equal(postal.validationMessage,'');assert.match(w.document.querySelector('[data-total]').textContent,/100,00/);dom.window.close();
});
test('postal purchase submits a separate address in Austria and keeps shipping price server-owned',async()=>{
 const requests=[],dom=fixture({fetch:async(url,options)=>{requests.push(JSON.parse(options.body));return {ok:true,json:async()=>({order,accessToken:'test-token'})};}}),w=dom.window;fill(w);w.document.querySelector('#postDelivery').click();
 const form=w.document.querySelector('#voucher-order-form');form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await next();assert.equal(requests.length,0);
 for(const [key,value]of Object.entries({shippingName:'Beschenkte Person',shippingStreet:'Andere Straße 12',shippingPostal:'1010',shippingCity:'Wien'}))form.elements.namedItem(key).value=value;
 form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await next();await next();assert.equal(requests.length,1);const payload=requests[0];assert.equal(payload.amountCents,10000);assert.equal(payload.deliveryMethod,'post');assert.deepEqual(payload.shippingAddress,{name:'Beschenkte Person',street:'Andere Straße 12',postalCode:'1010',city:'Wien',country:'AT'});assert.match(payload.buyerAddress,/Testweg 1/);assert.equal(payload.shippingCents,undefined);assert.equal(payload.totalCents,undefined);dom.window.close();
});
test('postal order status uses server totals, escapes its address and keeps receipt-based withdrawal visible',async()=>{
 const dom=fixture({url:'http://127.0.0.1:8791/gutscheine-kaufen.html#order=test-order&token=buyer-secret',fetch:async()=>({ok:true,json:async()=>({order:{...order,status:'active',paymentStatus:'paid',deliveryMethod:'post',shippingCents:480,totalCents:10480,withdrawUntil:null,shippedAt:'2026-10-23T12:00:00Z',shippingAddress:{name:'<img src=x>',street:'Testweg 2',postalCode:'1010',city:'Wien',country:'AT'}},voucher:{code:'LZG-TEST-CODE',balanceCents:10000}})})}),w=dom.window;await next();
 const panel=w.document.querySelector('.gv-shipping-status');assert.match(panel.textContent,/104,80/);assert.match(panel.textContent,/per Post verschickt/);assert.equal(panel.querySelector('img'),null);assert.match(panel.querySelector('address').textContent,/<img src=x>/);assert.match(w.document.querySelector('.gv-withdrawal').textContent,/tatsächlichen Erhalt/);dom.window.close();
});
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

const transfer={recipient:'Emina Test',iban:'AT61 1904 3002 3457 3201',bic:'BKAUATWW',amountCents:12345,reference:'LZ-G-TEST'};
const buyerStatus={url:'http://127.0.0.1:8791/gutscheine-kaufen.html#order=test-order&token=buyer-secret',fetch:async()=>({ok:true,json:async()=>({order,transfer})})};
test('buyer can copy the IBAN and complete payment details without copying their secret access token',async()=>{
 const values=[],dom=fixture({...buyerStatus,clipboard:{writeText:async value=>values.push(value)}}),w=dom.window;await next();
 w.document.querySelector('#voucher-copy-iban').click();await next();w.document.querySelector('#voucher-copy-bank').click();await next();
 assert.equal(values[0],transfer.iban);assert.match(values[1],/Empfängerin: Emina Test/);assert.match(values[1],/IBAN: AT61 1904 3002 3457 3201/);assert.match(values[1],/BIC: BKAUATWW/);assert.match(values[1],/Gesamtbetrag: [^\n]*123,45/);assert.match(values[1],/Verwendungszweck: LZ-G-TEST/);assert.ok(!values[1].includes('buyer-secret'));
 assert.equal(w.document.querySelector('#voucher-bank-copy-feedback').textContent,'Kopiert');assert.equal(w.document.querySelector('#voucher-bank-copy-field').hidden,true);dom.window.close();
});
test('blocked clipboard leaves payment details selected with truthful manual-copy guidance',async()=>{
 const dom=fixture({...buyerStatus,clipboard:{writeText:async()=>{throw Error('Denied');}},execCopy:()=>false}),w=dom.window;await next();w.document.querySelector('#voucher-copy-bank').click();await next();
 const field=w.document.querySelector('#voucher-bank-copy-field');assert.equal(field.hidden,false);assert.equal(w.document.activeElement,field);assert.equal(field.selectionStart,0);assert.equal(field.selectionEnd,field.value.length);assert.match(field.value,/Verwendungszweck: LZ-G-TEST/);assert.match(w.document.querySelector('#voucher-bank-copy-feedback').textContent,/markierten Text/);assert.doesNotMatch(w.document.querySelector('#voucher-bank-copy-feedback').textContent,/Kopiert/);dom.window.close();
});
test('contact keeps the valid email action and provides copying independently of an installed mail app',async()=>{
 const values=[],dom=fixture({...buyerStatus,clipboard:{writeText:async value=>values.push(value)}}),w=dom.window;await next();
 const link=new URL(w.document.querySelector('#voucher-contact-email').href);assert.equal(link.protocol,'mailto:');assert.equal(link.pathname,'info@liza-memories-photography.com');assert.equal(link.searchParams.get('subject'),'Bestellnummer LZ-G-TEST');assert.ok(!link.href.includes('buyer-secret'));
 w.document.querySelector('#voucher-copy-email').click();await next();assert.deepEqual(values,['info@liza-memories-photography.com']);assert.equal(w.document.querySelector('#voucher-email-copy-feedback').textContent,'Kopiert');dom.window.close();
});
test('email copy supports legacy clipboard and selectable fallback when clipboard APIs are unavailable',async()=>{
 for(const legacyWorks of [true,false]){
  let command;const dom=fixture({...buyerStatus,execCopy:value=>{command=value;return legacyWorks;}}),w=dom.window;await next();w.document.querySelector('#voucher-copy-email').click();await next();
  assert.equal(command,'copy');const field=w.document.querySelector('#voucher-email-copy-field');assert.equal(field.value,'info@liza-memories-photography.com');assert.equal(field.hidden,legacyWorks);
  if(legacyWorks)assert.equal(w.document.querySelector('#voucher-email-copy-feedback').textContent,'Kopiert');else{assert.equal(field.selectionStart,0);assert.equal(field.selectionEnd,field.value.length);assert.match(w.document.querySelector('#voucher-email-copy-feedback').textContent,/markierten Text/);}
  dom.window.close();
 }
});
