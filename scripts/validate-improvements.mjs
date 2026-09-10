import fs from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import assert from 'node:assert/strict';

export async function validateImprovements(cache,report){
 for(const [file,{document:d}] of cache){
  if(!d.querySelector('header'))continue;
  const seen=new Set();for(const script of d.querySelectorAll('script[src]')){const key=script.getAttribute('src').split('?')[0];if(seen.has(key))report(file,`duplicate script ${key}`);seen.add(key);}
  if(!d.querySelector('.skip-link'))report(file,'missing skip link');
  const lang=file.match(/-(en|bs)\.html$/)?.[1]||'de';
  if(d.documentElement.lang!==lang)report(file,'incorrect document language');
  if(d.querySelectorAll('h1').length!==1)report(file,'expected exactly one main heading');
  const canonical=d.querySelector('link[rel="canonical"]')?.href;
  const expected='https://liza-memories-photography.com/'+(file==='index.html'?'':file);
  if(canonical!==expected)report(file,'unexpected canonical URL');
  if(d.querySelectorAll('link[rel="alternate"][hreflang]').length!==4)report(file,'missing language alternates');
  const gallery=d.querySelector('#gallery-showcase>.container>.gallery-grid')||d.querySelector('#gallery-showcase .gallery-grid');
  if(gallery&&gallery.children.length>18)report(file,'gallery preview exceeds 18 images');
  if(d.querySelector('#gallery-showcase')&&d.querySelector('.hero-actions a[href$="#portfolio"]'))report(file,'hero portfolio link leaves the service gallery');
  const modal=d.querySelector('#lightbox');if(modal&&modal.tagName!=='DIALOG')report(file,'lightbox is not a native dialog');
  if(/^index/.test(file)){
   for(const img of d.querySelectorAll('.masonry img,.story-band-grid img'))if(!img.hasAttribute('srcset')||!img.hasAttribute('sizes'))report(file,'content image lacks responsive sources');
   if(d.querySelector('#msg[required]'))report(file,'message must be optional');
  }
  for(const a of d.querySelectorAll('.package-card a')){const u=new URL(a.href,'https://example.test');if(!u.searchParams.get('service')||!u.searchParams.get('package'))report(file,'package inquiry loses selection');}
 }
 const script=await fs.readFile('scripts/contact-flow.js','utf8');
 for(const lang of ['de','en','bs']){
  const file=lang==='de'?'index.html':`index-${lang}.html`;
  const dom=new JSDOM(cache.get(file).html,{url:`https://example.test/${file}?service=newborn&package=bronze&source=preise.html`,runScripts:'outside-only'});
  const w=dom.window,d=w.document,events=[];let calls=0,resolve;
  w.fetch=()=>{calls++;return new Promise(r=>{resolve=r;});};
  d.addEventListener('liza:conversion',e=>events.push(e.detail));w.eval(script);
  const form=d.querySelector('form.contact');form.reportValidity=()=>true;
  assert.equal(d.querySelector('#service').value,'Newborn');assert.equal(form.elements.package.value,'bronze');
  assert.equal(form.elements.language.value,lang);assert.equal(form.elements.source_page.value,'preise.html');
  form.elements.name.value='PRIVATE_NAME';form.elements.email.value='private@example.test';
  const submit=()=>form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  submit();submit();assert.equal(calls,1);assert.equal(form.querySelector('[type=submit]').disabled,true);assert.equal(events.length,0);
  resolve({ok:true});await new Promise(r=>setTimeout(r,0));
  assert.equal(events.length,1);assert.equal(events[0].event,'lead_success');assert(!JSON.stringify(events).includes('PRIVATE'));assert(!JSON.stringify(events).includes('private@'));assert.equal(form.querySelector('[type=submit]').disabled,false);
  submit();resolve({ok:false});await new Promise(r=>setTimeout(r,0));assert.equal(events.length,1);
  w.fetch=()=>Promise.reject(new Error('offline'));submit();await new Promise(r=>setTimeout(r,0));assert.equal(events.length,1);assert.equal(form.querySelector('[type=submit]').disabled,false);
  d.querySelector('#service').value='Familie';d.querySelector('#service').dispatchEvent(new w.Event('change'));assert.equal(form.elements.package.value,'');assert.equal(form.elements.service_id.value,'family');
  dom.window.close();
 }
 const invalid=new JSDOM(cache.get('index.html').html,{url:'https://example.test/?service=evil&package=gold&source=https://evil.test/private',runScripts:'outside-only'});
 invalid.window.eval(script);assert.equal(invalid.window.document.querySelector('[name=package]').value,'');assert.equal(invalid.window.document.querySelector('[name=source_page]').value,'index.html');invalid.window.close();
 console.log('Inquiry tests passed: DE/EN/BS, allowlists, duplicate submission, success, server error, network error and event privacy.');
}
