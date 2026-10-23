'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {loadPreviewConfig}=require('./preview-config.cjs');
const {base,out,localUrl,playwrightModule,browserOptions}=loadPreviewConfig();
const {chromium}=require(playwrightModule);
(async()=>{
 fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch(browserOptions);
 const context=await browser.newContext({viewport:{width:1440,height:1100},deviceScaleFactor:1});
 await context.route('**/*',route=>{try{localUrl(route.request().url());return route.continue();}catch{return route.abort();}});
 const localRequest=(method,url,options={})=>context.request[method](localUrl(url),{...options,maxRedirects:0});
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 const metrics=[];
 async function shot(name,fullPage=true){await page.evaluate(()=>document.fonts.ready);const m=await page.evaluate(()=>({path:location.pathname,width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));metrics.push(m);assert.ok(m.scrollWidth<=m.width+1,JSON.stringify(m));await page.screenshot({path:path.join(out,name+'.png'),fullPage});}
 await page.goto(base+'/gutscheine.html',{waitUntil:'networkidle'});const necessary=page.getByRole('button',{name:'Nur notwendige',exact:true});if(await necessary.count())await necessary.click();await shot('Gutscheine-Desktop');
 await page.setViewportSize({width:390,height:844});await shot('Gutscheine-Handy');
 await page.setViewportSize({width:1440,height:1100});await page.goto(base+'/gutscheine-kaufen.html?amount=150',{waitUntil:'networkidle'});
 for(const [name,value] of Object.entries({giftTo:'Sarah',giftFrom:'Deiner Familie',message:'Für gemeinsame Zeit und Erinnerungen, die bleiben. Alles Liebe zum Geburtstag!',buyerName:'Gutschein Vorschau',buyerEmail:'gutschein-vorschau@example.test',street:'Teststraße 1',postal:'8054',city:'Graz',country:'Österreich'}))await page.locator('[name="'+name+'"]').fill(value);
 await shot('Gutschein-Bestellung-Desktop');await page.setViewportSize({width:390,height:844});await shot('Gutschein-Bestellung-Handy');
 await page.locator('#termsAccepted').check();
 const resultPromise=page.waitForResponse(response=>response.url().endsWith('/api/vouchers/orders')&&response.request().method()==='POST');
 await page.locator('.gv-submit').click();const result=await resultPromise;const created=await result.json();assert.equal(result.status(),201,JSON.stringify(created));await page.locator('#voucher-bank-qr').waitFor();assert.equal(await page.locator('#voucher-pdf').count(),0);assert.ok(await page.locator('#voucher-bank-qr').evaluate(canvas=>canvas.width>100));await shot('Gutschein-Zahlung-Handy');
 const buyerUrl=page.url();await page.setViewportSize({width:1440,height:1100});await shot('Gutschein-Zahlung-Desktop');
 // This is exclusively the isolated local fixture admin and local mail sink.
 const login=await localRequest('post',base+'/api/auth/login',{headers:{Origin:base},data:{email:'emina@example.test',password:'Testverwaltung2026!'}});assert.equal(login.status(),200,await login.text());
 const session=await login.json();
 const paid=await localRequest('post',base+'/api/admin/vouchers/'+created.order.id+'/paid',{headers:{Origin:base,'X-CSRF-Token':session.csrf},data:{idempotencyKey:randomUUID()}});assert.equal(paid.status(),200,await paid.text());
 await page.locator('#voucher-refresh').click();await page.locator('#voucher-pdf').waitFor();await shot('Gutschein-Bereit-Desktop');
 const pdf=await localRequest('get',new URL(await page.locator('#voucher-pdf').getAttribute('href'),base).href);assert.equal(pdf.status(),200);assert.match(pdf.headers()['content-type'],/application\/pdf/);const pdfBytes=await pdf.body();assert.ok(pdfBytes.length>1000);fs.writeFileSync(path.join(out,'Gutschein-Aus-dem-Kaufablauf.pdf'),pdfBytes);
 await page.goto(base+'/galerie/',{waitUntil:'networkidle'});await page.locator('[data-action="toggle-admin"]').click();await page.locator('[data-action="admin-tab"][data-tab="vouchers"]').click();await page.locator('.portal-voucher-card').first().waitFor();await shot('Gutscheine-Verwaltung-Desktop');
 // Confirm that the isolated status link also works after reopening a fresh page.
 await page.goto(buyerUrl,{waitUntil:'networkidle'});await page.locator('#voucher-pdf').waitFor();
 // A second local order checks real withdrawal; leave the first paid gift for the user to inspect.
 const second=await localRequest('post',base+'/api/vouchers/orders',{headers:{Origin:base},data:{amountCents:5000,buyerName:'Rücktritt Vorschau',buyerEmail:'ruecktritt-vorschau@example.test',buyerAddress:'Testweg 2\n8054 Graz\nÖsterreich',giftTo:'',giftFrom:'',message:'',language:'de',termsAccepted:true,idempotencyKey:randomUUID()}});assert.equal(second.status(),201,await second.text());const other=await second.json();
 const withdrawal=await localRequest('post',base+'/api/vouchers/orders/'+other.order.id+'/withdraw',{headers:{Origin:base},data:{token:other.accessToken,confirmed:true}});assert.equal(withdrawal.status(),200,await withdrawal.text());assert.equal((await withdrawal.json()).order.status,'withdrawal_requested');
 for(const lang of ['en','bs']){await page.goto(base+'/gutscheine-'+lang+'.html',{waitUntil:'networkidle'});await page.setViewportSize({width:390,height:844});await shot('Gutscheine-Handy-'+lang);await page.goto(base+'/gutscheine-kaufen-'+lang+'.html',{waitUntil:'networkidle'});await shot('Gutschein-Bestellung-Handy-'+lang);}
 assert.deepEqual(errors,[]);const report={localOnly:true,orderReference:created.order.reference,orderId:created.order.id,metrics,pdfBytes:pdfBytes.length,pageErrors:errors};fs.writeFileSync(path.join(out,'Pruefung.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});
