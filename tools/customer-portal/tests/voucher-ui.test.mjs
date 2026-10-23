import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {ORDER_CONSENT_VERSION,orderConsent} from '../frontend/order-consent.js';
const portalSource=await readFile(new URL('../frontend/portal.js',import.meta.url),'utf8');
const translationSource=await readFile(new URL('../frontend/translations.js',import.meta.url),'utf8');
const voucherFixture=(overrides={})=>({id:'v1',reference:'LZ-G-1234',status:'active',paymentStatus:'paid',amountCents:10000,balanceCents:10000,reservedCents:0,availableCents:10000,code:'LIZA-TEST-1234',buyerName:'Anna Beispiel',buyerEmail:'anna@example.test',giftTo:'Max',giftFrom:'Anna',message:'Alles Liebe!',createdAt:'2026-10-23T12:00:00Z',reservations:[],ledger:[{id:'l1',kind:'paid',amountCents:10000,createdAt:'2026-10-23T12:00:00Z'}],...overrides});
function harness({lang='de',vouchers=[voucherFixture()]}={}){
 const dom=new JSDOM(`<html lang="${lang}"><body><main class="portal-content" id="main-content"><div id="portal-app"></div></main><div id="portal-toast" hidden></div></body></html>`,{url:'https://portal.test/galerie/',runScripts:'outside-only'}),window=dom.window,requests=[];let mutation=null;
 window.HTMLElement.prototype.scrollIntoView=function(){};window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};window.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new window.Event('close'));};
 window.fetch=async(path,options={})=>{const body=options.body?JSON.parse(options.body):undefined;requests.push({path,method:options.method||'GET',headers:options.headers,body});let data;
  if(path==='/api/session')data={user:{id:'admin',name:'Emina',role:'admin'},csrf:'test-csrf',capabilities:{transferConfigured:true}};
  else if(path==='/api/admin/vouchers')data={vouchers};
  else if(/^\/api\/admin\/vouchers\/[^/]+\/delete-preview$/.test(path))data={voucher:vouchers.find(item=>item.id===path.split('/').at(-2)),deleteSnapshot:'snapshot-v1'};
  else if(/^\/api\/admin\/vouchers\/[^/]+$/.test(path)){if(options.method==='DELETE'){if(mutation)return mutation(path,options,body);vouchers=vouchers.filter(item=>item.id!==path.split('/').at(-1));data={ok:true,deleted:true};}else data={voucher:vouchers.find(item=>item.id===path.split('/').at(-1))};}
  else if(/^\/api\/admin\/vouchers\/[^/]+\//.test(path)){if(mutation)return mutation(path,options,body);data={ok:true,voucher:vouchers.find(item=>item.id===path.split('/').at(-2)),emailSent:true};}
  else if(path==='/api/admin/galleries')data={galleries:[]};else if(path==='/api/admin/orders')data={orders:[]};else if(path==='/api/admin/settings')data={settings:{}};else if(path==='/api/admin/activity')data={activities:[]};else data={ok:true};
  return {ok:true,status:200,json:async()=>structuredClone(data)};
 };
 window.eval(translationSource.replace('export const translations =','window.portalTranslations ='));window.orderConsent=orderConsent;window.ORDER_CONSENT_VERSION=ORDER_CONSENT_VERSION;
 window.eval(portalSource.replace("import { ORDER_CONSENT_VERSION, orderConsent } from './order-consent.js';",'const {ORDER_CONSENT_VERSION,orderConsent}=window;').replace("import { translations } from './translations.js';",'const translations=window.portalTranslations;').replace(/initialise\(\);\s*$/,'window.ui={state,loadSession,loadAdmin,onAction,onSubmit,onChange,showVoucherDetails,voucherOperationDialog,voucherAmountCents};'));
 const ui=window.ui,action=async(name,attrs={})=>{const target=[...window.document.querySelectorAll(`[data-action="${name}"]`)].find(node=>Object.entries(attrs).every(([key,value])=>node.dataset[key]===value));assert.ok(target,'Missing action '+name);await ui.onAction({target,preventDefault(){}});};
 return {dom,window,ui,requests,action,get vouchers(){return vouchers;},set mutation(value){mutation=value;},async start(){await ui.loadSession();ui.state.adminTab='vouchers';await ui.loadAdmin();},async submit(values={}){const form=window.document.querySelector('#portal-voucher-operation, #portal-voucher-delete');for(const[name,value]of Object.entries(values)){const field=form.elements.namedItem(name);if(field.type==='checkbox')field.checked=value;else field.value=value;}await ui.onSubmit({target:form,preventDefault(){}});return form;}};
}
function response(data,status=200){return {ok:status<400,status,json:async()=>structuredClone(data)};}

test('postal voucher details show separate fees and a dispatch action requiring confirmation',async t=>{
 const voucher=voucherFixture({deliveryMethod:'post',shippingCents:480,totalCents:10480,shippedAt:null,shippingAddress:{name:'<img src=x>',street:'Geschenkweg 2',postalCode:'1010',city:'Wien',country:'AT'}}),h=harness({vouchers:[voucher]});t.after(()=>h.dom.window.close());await h.start();assert.match(h.window.document.querySelector('[data-voucher-id]').textContent,/Noch zu verschicken/);await h.action('voucher-open',{id:'v1'});
 let modal=h.window.document.querySelector('dialog');assert.equal(modal.querySelector('address img'),null);assert.match(modal.textContent,/104,80/);assert.match(modal.textContent,/Geschenkweg 2/);await h.action('voucher-operation',{operation:'shipped'});await h.submit();assert.equal(h.requests.some(row=>row.path.endsWith('/shipped')),false);
 h.mutation=()=>response({ok:true,voucher:{...voucher,shippedAt:'2026-10-23T15:00:00Z'}});await h.submit({confirmed:true});const request=h.requests.find(row=>row.path.endsWith('/shipped'));assert.equal(request.body.confirmed,true);assert.equal(request.headers['X-CSRF-Token'],'test-csrf');modal=h.window.document.querySelector('dialog');assert.match(modal.textContent,/Verschickt/);assert.match(modal.querySelector('[data-operation="shipped"]').textContent,/Versandbestätigung senden/);
});
test('digital or unpaid orders cannot be marked posted and postal refunds include the fee',async t=>{
 for(const overrides of [{deliveryMethod:'email'},{deliveryMethod:'post',status:'pending',paymentStatus:'unpaid'}]){const h=harness({vouchers:[voucherFixture(overrides)]});await h.start();await h.action('voucher-open',{id:'v1'});assert.equal(h.window.document.querySelector('[data-operation="shipped"]'),null);h.dom.window.close();}
 const h=harness({vouchers:[voucherFixture({deliveryMethod:'post',shippingCents:480,totalCents:10480})]});t.after(()=>h.dom.window.close());await h.start();await h.action('voucher-open',{id:'v1'});await h.action('voucher-operation',{operation:'refund'});assert.match(h.window.document.querySelector('dialog').textContent,/104,80/);
});

test('admin vouchers load only on their tab and display distinct available, reserved and balance amounts',async t=>{
 const h=harness({vouchers:[voucherFixture({balanceCents:8000,reservedCents:3000,availableCents:5000})]});t.after(()=>h.dom.window.close());await h.ui.loadSession();await h.ui.loadAdmin();assert.equal(h.requests.some(row=>row.path==='/api/admin/vouchers'),false);await h.action('admin-tab',{tab:'vouchers'});
 const card=h.window.document.querySelector('[data-voucher-id="v1"]');assert.ok(card);assert.deepEqual([...card.querySelectorAll('dt')].map(row=>row.textContent),['Ursprünglicher Wert','Restguthaben','Davon reserviert','Frei verfügbar']);assert.match(card.querySelectorAll('dd')[0].textContent,/100,00/);assert.match(card.querySelectorAll('dd')[3].textContent,/50,00/);
});

test('search accepts code, name and email and status filtering keeps input focus',async t=>{
 const h=harness({vouchers:[voucherFixture(),voucherFixture({id:'v2',reference:'LZ-G-2222',buyerName:'Emir',buyerEmail:'emir@example.test',code:null,status:'pending',paymentStatus:'unpaid'})]});t.after(()=>h.dom.window.close());await h.start();const input=h.window.document.querySelector('[name="voucherSearch"]');input.focus();
 for(const value of ['liza-test','Anna','ANNA@EXAMPLE']){input.value=value;input.dispatchEvent(new h.window.Event('input',{bubbles:true}));assert.equal(h.window.document.querySelectorAll('[data-voucher-id]').length,1);assert.equal(h.window.document.activeElement,input);}
 input.value='';h.ui.onChange({target:input});const filter=h.window.document.querySelector('[name="voucherFilter"]');filter.value='pending';h.ui.onChange({target:filter});assert.deepEqual([...h.window.document.querySelectorAll('[data-voucher-id]')].map(row=>row.dataset.voucherId),['v2']);assert.equal(h.requests.filter(row=>row.path==='/api/admin/vouchers').length,1);
});

test('voucher personal text and code are escaped and PDF uses the authenticated admin endpoint',async t=>{
 const h=harness({vouchers:[voucherFixture({buyerName:'<img src=x onerror=alert(1)>',message:'<script>bad()</script>',giftTo:'<b>Max</b>',code:'<svg/onload=bad()>'})]});t.after(()=>h.dom.window.close());await h.start();await h.action('voucher-open',{id:'v1'});const modal=h.window.document.querySelector('dialog');assert.equal(modal.querySelector('script'),null);assert.equal(modal.querySelector('img'),null);assert.match(modal.textContent,/<script>bad\(\)<\/script>/);const link=modal.querySelector('a');assert.equal(link.getAttribute('href'),'/api/admin/vouchers/v1/pdf');assert.equal(link.rel,'noopener');
});

test('pending vouchers require bank verification before paid confirmation, pass CSRF and show mail failure honestly',async t=>{
 const h=harness({vouchers:[voucherFixture({status:'pending',paymentStatus:'unpaid',code:null})]});t.after(()=>h.dom.window.close());await h.start();await h.action('voucher-open',{id:'v1'});assert.equal(h.window.document.querySelector('dialog a'),null);await h.action('voucher-operation',{operation:'paid'});const form=h.window.document.querySelector('form#portal-voucher-operation');assert.match(form.parentElement.textContent,/Kontoprüfung/);await h.submit();assert.equal(h.requests.filter(row=>row.path.endsWith('/paid')).length,0);
 h.mutation=()=>response({ok:true,voucher:voucherFixture(),emailSent:false});await h.submit({confirmed:true});const request=h.requests.find(row=>row.path.endsWith('/paid'));assert.equal(request.headers['X-CSRF-Token'],'test-csrf');assert.equal(typeof request.body.idempotencyKey,'string');assert.match(h.window.document.querySelector('#portal-toast').textContent,/noch nicht versendet/);assert.ok(h.window.document.querySelector('dialog a[href$="/pdf"]'));
});

test('reserve submits cents and booking reference while a retry reuses the same operation key',async t=>{
 const h=harness();t.after(()=>h.dom.window.close());await h.start();await h.action('voucher-open',{id:'v1'});await h.action('voucher-operation',{operation:'reserve'});let attempt=0;h.mutation=()=>++attempt===1?response({error:'temporarily_unavailable'},503):response({ok:true,voucher:voucherFixture({reservedCents:2500,availableCents:7500,reservations:[{id:'r1',amountCents:2500,bookingReference:'Shooting Max',status:'active',createdAt:'2026-10-23'}]})});await h.submit({amount:'25.00',bookingReference:'Shooting Max',confirmed:true});assert.ok(h.window.document.querySelector('.portal-form-message'));await h.submit();const mutations=h.requests.filter(row=>row.path.endsWith('/reserve'));assert.equal(mutations.length,2);assert.equal(mutations[0].body.amountCents,2500);assert.equal(mutations[0].body.bookingReference,'Shooting Max');assert.equal(mutations[0].body.idempotencyKey,mutations[1].body.idempotencyKey);assert.match(h.window.document.querySelector('dialog').textContent,/Shooting Max/);
});

test('direct redemption posts the actual amount while remaining credit is server-owned',async t=>{
 const h=harness();t.after(()=>h.dom.window.close());await h.start();await h.action('voucher-open',{id:'v1'});await h.action('voucher-operation',{operation:'redeem'});h.mutation=()=>response({ok:true,voucher:voucherFixture({balanceCents:2000,availableCents:2000})});await h.submit({amount:'80.00',bookingReference:'RE-100',confirmed:true});const request=h.requests.find(row=>row.path.endsWith('/redeem'));assert.equal(request.body.amountCents,8000);assert.equal(request.body.reservationId,undefined);assert.match(h.window.document.querySelectorAll('dialog dd')[3].textContent,/20,00/);assert.equal(h.ui.state.adminVouchers[0].availableCents,2000);
});

test('redeeming a reservation preserves its ID and complete amount; releasing never deducts credit',async t=>{
 const voucher=voucherFixture({reservedCents:4000,availableCents:6000,reservations:[{id:'r1',amountCents:4000,bookingReference:'RE-20',status:'active',createdAt:'2026-10-23'}]});
 for(const operation of ['redeem','release']){const h=harness({vouchers:[voucher]});t.after(()=>h.dom.window.close());await h.start();await h.action('voucher-open',{id:'v1'});await h.action('voucher-operation',{operation,reservation:'r1'});if(operation==='redeem'){const input=h.window.document.querySelector('[name="amount"]');assert.equal(input.readOnly,true);assert.equal(input.value,'40.00');}await h.submit({confirmed:true});const request=h.requests.find(row=>row.path.endsWith('/'+operation));assert.equal(request.body.reservationId,'r1');assert.equal(request.body.amountCents,operation==='redeem'?4000:undefined);}
});

test('refund records an already completed external bank transfer and is absent after spend or reservation',async t=>{
 const h=harness();t.after(()=>h.dom.window.close());await h.start();await h.action('voucher-open',{id:'v1'});await h.action('voucher-operation',{operation:'refund'});const dialog=h.window.document.querySelector('dialog');assert.match(dialog.textContent,/Portal überweist kein Geld/);assert.match(dialog.textContent,/bereits außerhalb des Portals zurückgezahlt/);await h.submit({confirmed:true,reason:'Banküberweisung am 23.10.'});const request=h.requests.find(row=>row.path.endsWith('/refund'));assert.equal(request.body.confirmed,true);assert.equal(request.body.reason,'Banküberweisung am 23.10.');
 for(const override of [{reservedCents:1000,availableCents:9000},{balanceCents:5000,availableCents:5000}]){h.ui.showVoucherDetails(voucherFixture(override));assert.equal(h.window.document.querySelector('[data-operation="refund"]'),null);}
});

test('withdrawal request blocks spending and resending but allows a qualified external refund record',async t=>{
 const h=harness({vouchers:[voucherFixture({status:'withdrawal_requested'})]});t.after(()=>h.dom.window.close());await h.start();await h.action('voucher-open',{id:'v1'});assert.equal(h.window.document.querySelector('[data-operation="reserve"]'),null);assert.equal(h.window.document.querySelector('[data-operation="redeem"]'),null);assert.equal(h.window.document.querySelector('[data-operation="resend"]'),null);assert.ok(h.window.document.querySelector('[data-operation="refund"]'));assert.match(h.window.document.querySelector('dialog').textContent,/Rücktrittsanfrage gesperrt/);
});

test('euro parsing rejects hidden rounding, negative and non-finite amounts',async t=>{const h=harness();t.after(()=>h.dom.window.close());assert.equal(h.ui.voucherAmountCents('25,10'),2510);assert.equal(h.ui.voucherAmountCents('0.01'),1);for(const value of ['1.005','-10','NaN','Infinity','1e3','0','99999999999999999999999'])assert.throws(()=>h.ui.voucherAmountCents(value));});

test('busy mutations prevent duplicate submit, cancellation and navigation until complete',async t=>{
 const h=harness();t.after(()=>h.dom.window.close());await h.start();await h.action('voucher-open',{id:'v1'});await h.action('voucher-operation',{operation:'reserve'});let finish;h.mutation=()=>new Promise(resolve=>{finish=()=>resolve(response({ok:true,voucher:voucherFixture()}));});const submission=h.submit({confirmed:true,amount:'10.00',bookingReference:'RE-10'});await new Promise(resolve=>setTimeout(resolve,0));await h.submit();await h.action('voucher-back');assert.ok(h.window.document.querySelector('#portal-voucher-operation'));await h.action('close-dialog');assert.ok(h.window.document.querySelector('#portal-voucher-operation'));assert.equal(h.requests.filter(row=>row.path.endsWith('/reserve')).length,1);finish();await submission;assert.equal(h.ui.state.adminBusy,false);
});

test('voucher controls and operation explanations are translated in all supported languages',async t=>{for(const lang of ['de','en','bs']){const h=harness({lang});t.after(()=>h.dom.window.close());await h.start();await h.action('voucher-open',{id:'v1'});await h.action('voucher-operation',{operation:'refund'});assert.doesNotMatch(h.window.document.body.textContent,/voucherStatus_|voucherLedger_|voucherAdminIntro|voucherRefundHint/);}});

test('withdrawal keeps a reservation releasable so an unused gift can subsequently be refunded',async t=>{const h=harness({vouchers:[voucherFixture({status:'withdrawal_requested',reservedCents:4000,availableCents:0,reservations:[{id:'r1',amountCents:4000,bookingReference:'RE-20',status:'active',createdAt:'2026-10-23'}]})]});t.after(()=>h.dom.window.close());await h.start();await h.action('voucher-open',{id:'v1'});assert.equal(h.window.document.querySelector('[data-operation="redeem"]'),null);assert.equal(h.window.document.querySelector('[data-operation="refund"]'),null);await h.action('voucher-operation',{operation:'release',reservation:'r1'});await h.submit({confirmed:true});assert.equal(h.requests.find(row=>row.path.endsWith('/release')).body.reservationId,'r1');});

test('admin search queries the server for older vouchers without posting or changing credit',async t=>{const h=harness();t.after(()=>h.dom.window.close());await h.start();const search=h.window.document.querySelector('[name="voucherSearch"]');search.value='Ältere Käuferin';h.ui.onChange({target:search});const form=h.window.document.querySelector('#portal-voucher-search');await h.ui.onSubmit({target:form,preventDefault(){}});assert.ok(h.requests.some(row=>row.path==='/api/admin/vouchers?q='+encodeURIComponent('Ältere Käuferin')&&row.method==='GET'));assert.equal(h.requests.some(row=>row.method==='POST'),false);});

test('late payment for a withdrawn order is recorded without claiming an active voucher was sent',async t=>{const h=harness({vouchers:[voucherFixture({status:'withdrawal_requested',paymentStatus:'unpaid',code:null,availableCents:0})]});t.after(()=>h.dom.window.close());await h.start();await h.action('voucher-open',{id:'v1'});await h.action('voucher-operation',{operation:'paid'});assert.match(h.window.document.querySelector('dialog').textContent,/Code bleibt gesperrt/);h.mutation=()=>response({ok:true,voucher:voucherFixture({status:'withdrawal_requested',availableCents:0}),emailSent:false});await h.submit({confirmed:true});assert.match(h.window.document.querySelector('#portal-toast').textContent,/bleibt wegen des Rücktritts gesperrt/);assert.equal(h.window.document.querySelector('[data-operation="redeem"]'),null);});


test('test voucher deletion can be cancelled without making a mutation',async t=>{
 const h=harness();t.after(()=>h.dom.window.close());await h.start();await h.action('voucher-open',{id:'v1'});await h.action('voucher-delete',{id:'v1'});
 const dialog=h.window.document.querySelector('dialog');assert.match(dialog.textContent,/ohne tatsächliche Kundenzahlung/);assert.match(dialog.textContent,/nicht rückgängig/);
 await h.action('voucher-back',{id:'v1'});assert.equal(h.requests.some(row=>row.method==='DELETE'),false);assert.ok(h.window.document.querySelector('[data-action="voucher-delete"]'));assert.equal(h.ui.state.adminVouchers.length,1);
});

test('deletion requires the test acknowledgement and an exact reference then removes only that voucher',async t=>{
 for(const paid of [false,true]){
  const h=harness({vouchers:[voucherFixture({status:paid?'active':'pending',paymentStatus:paid?'paid':'unpaid'}),voucherFixture({id:'v2',reference:'LZ-G-2222'})]});t.after(()=>h.dom.window.close());await h.start();await h.action('voucher-open',{id:'v1'});await h.action('voucher-delete',{id:'v1'});
  await h.submit({reference:'LZ-G-1234'});assert.equal(h.requests.some(row=>row.method==='DELETE'),false);
  await h.submit({reference:'LZ-G-wrong',testOnly:true,testUsageOnly:true});assert.equal(h.requests.some(row=>row.method==='DELETE'),false);assert.match(h.window.document.querySelector('.portal-form-message').textContent,/Bestellnummer genau/);
  await h.submit({reference:'LZ-G-1234',testUsageOnly:false});assert.equal(h.requests.some(row=>row.method==='DELETE'),false);
  await h.submit({testUsageOnly:true});const request=h.requests.find(row=>row.method==='DELETE');assert.equal(request.path,'/api/admin/vouchers/v1');assert.equal(request.headers['X-CSRF-Token'],'test-csrf');assert.deepEqual(request.body,{confirmed:true,testOnly:true,testUsageOnly:true,reference:'LZ-G-1234',deleteSnapshot:'snapshot-v1'});
  assert.equal(h.window.document.querySelector('dialog'),null);assert.deepEqual([...h.window.document.querySelectorAll('[data-voucher-id]')].map(row=>row.dataset.voucherId),['v2']);assert.equal(h.ui.state.adminVouchers.length,1);assert.match(h.window.document.querySelector('#portal-toast').textContent,/Testgutschein gelöscht/);
 }
});

test('server refusal of a reserved or redeemed voucher leaves the voucher and confirmation visible',async t=>{
 const h=harness();t.after(()=>h.dom.window.close());await h.start();await h.action('voucher-open',{id:'v1'});await h.action('voucher-delete',{id:'v1'});
 h.mutation=()=>response({error:'voucher_in_use'},409);await h.submit({reference:'LZ-G-1234',testOnly:true,testUsageOnly:true});assert.ok(h.window.document.querySelector('#portal-voucher-delete'));assert.ok(h.window.document.querySelector('[data-voucher-id="v1"]'));assert.match(h.window.document.querySelector('.portal-form-message').textContent,/bereits eingelöst oder hat eine aktive Reservierung/);assert.equal(h.ui.state.adminBusy,false);
});

test('deletion prevents repeat submission and cancellation while awaiting the server',async t=>{
 const h=harness();t.after(()=>h.dom.window.close());await h.start();await h.action('voucher-open',{id:'v1'});await h.action('voucher-delete',{id:'v1'});let finish;
 h.mutation=()=>new Promise(resolve=>{finish=()=>resolve(response({ok:true,deleted:true}));});const submission=h.submit({reference:'LZ-G-1234',testOnly:true,testUsageOnly:true});await new Promise(resolve=>setTimeout(resolve,0));await h.submit();await h.action('voucher-back');await h.action('close-dialog');assert.ok(h.window.document.querySelector('#portal-voucher-delete'));assert.equal(h.requests.filter(row=>row.method==='DELETE').length,1);finish();await submission;assert.equal(h.ui.state.adminBusy,false);assert.equal(h.window.document.querySelector('dialog'),null);
});

test('test deletion controls and safety wording are translated in DE, EN and BS',async t=>{
 for(const [lang,label,phrase] of [['de','Testgutschein löschen','ohne tatsächliche Kundenzahlung'],['en','Delete test voucher','without an actual customer payment'],['bs','Obriši testni bon','bez stvarne uplate kupca']]){
  const h=harness({lang});t.after(()=>h.dom.window.close());await h.start();await h.action('voucher-open',{id:'v1'});await h.action('voucher-delete',{id:'v1'});const dialog=h.window.document.querySelector('dialog');assert.ok(dialog.textContent.includes(label));assert.ok(dialog.textContent.includes(phrase));assert.doesNotMatch(dialog.textContent,/voucherDelete/);
 }
});

test('deletion refreshes the voucher and includes explicit test-use confirmation for spent credit',async t=>{
 const h=harness();t.after(()=>h.dom.window.close());await h.start();await h.action('voucher-open',{id:'v1'});
 h.vouchers[0]={...h.vouchers[0],balanceCents:0,availableCents:0,ledger:[{id:'r1',kind:'redeem',amountCents:10000,createdAt:'2026-10-23T13:00:00Z'}]};
 await h.action('voucher-delete',{id:'v1'});
 assert.ok(h.requests.some(row=>row.path==='/api/admin/vouchers/v1/delete-preview'&&row.method==='GET'));
 assert.equal(h.ui.state.adminVouchers[0].balanceCents,0);
 assert.match(h.window.document.querySelectorAll('dialog dd')[1].textContent,/0,00/);
 assert.equal(h.window.document.querySelector('[name="testUsageOnly"]').checked,false);
 await h.submit({reference:'LZ-G-1234',testOnly:true});assert.equal(h.requests.some(row=>row.method==='DELETE'),false);
 await h.submit({testUsageOnly:true});assert.equal(h.requests.find(row=>row.method==='DELETE').body.deleteSnapshot,'snapshot-v1');
 assert.equal(h.ui.state.adminVouchers.length,0);
});

test('changed voucher and ongoing email errors explain the actual reason without removing data',async t=>{
 for(const [code,phrase] of [['voucher_delete_changed','zwischenzeitlich geändert'],['voucher_delete_busy','gerade eine E-Mail verschickt']]){
  const h=harness();t.after(()=>h.dom.window.close());await h.start();await h.action('voucher-open',{id:'v1'});await h.action('voucher-delete',{id:'v1'});
  h.mutation=()=>response({error:code},409);await h.submit({reference:'LZ-G-1234',testOnly:true,testUsageOnly:true});
  assert.match(h.window.document.querySelector('.portal-form-message').textContent,new RegExp(phrase));
  assert.equal(h.ui.state.adminVouchers.length,1);assert.ok(h.window.document.querySelector('#portal-voucher-delete'));
 }
});
