import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {JSDOM, VirtualConsole} from 'jsdom';

export async function validatePrivacy(cache, report) {
  const code=await fs.readFile('scripts/privacy-consent.js','utf8');
  let count=0;
  for(const [file,{document}] of cache){
    if(document.querySelector('script[src^="https:"],iframe,link[href*="fonts.googleapis.com"],link[href*="fonts.gstatic.com"]'))report(file,'Unexpected external executable resource');
    if(!document.querySelector('footer [data-privacy-settings]')||!document.querySelector('script[src^="scripts/privacy-consent.js"]'))report(file,'Missing privacy controls');
    if(document.querySelector('#cloudflare-analytics-config'))count++;
  }
  assert.equal(count,3,'Only the three homepages configure analytics');
  const css=await fs.readFile('fonts/fonts.css','utf8');
  assert(!/https?:/.test(css));
  for(const match of css.matchAll(/url\(([^)]+)\)/g))await fs.access('fonts/'+match[1].replace(/["']/g,''));
  const key='lizaPrivacyConsent';
  const valid=statistics=>JSON.stringify({version:1,statistics,expiresAt:Date.now()+86400000});
  function page(lang='de',saved=null){
    const dom=new JSDOM(`<html lang="${lang}"><head><script id="cloudflare-analytics-config" type="application/json">{"token":"test"}</script></head><body><footer><button data-privacy-settings class="privacy-settings-link">Open</button></footer></body></html>`,{url:'https://example.com/',runScripts:'outside-only',virtualConsole:new VirtualConsole()});
    const w=dom.window;let transmissions=0;
    w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
    w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
    w.XMLHttpRequest.prototype.open=function(){};
    w.XMLHttpRequest.prototype.send=function(){transmissions++;};
    w.XMLHttpRequest.prototype.abort=function(){};
    w.navigator.sendBeacon=()=>{transmissions++;return true;};
    w.fetch=()=>{transmissions++;return Promise.resolve({ok:true});};
    if(saved!==null)w.localStorage.setItem(key,saved);
    w.eval(code);
    return {dom,w,d:w.document,click:s=>w.document.querySelector(s).click(),sent:()=>transmissions};
  }
  for(const lang of ['de','en','bs']){
    let p=page(lang);assert(p.d.querySelector('#privacy-banner'));assert(!p.d.querySelector('dialog'));assert.equal(p.d.activeElement,p.d.body);assert(!p.d.querySelector('script[src]'));assert.equal(p.w.localStorage.getItem(key),null);
    p.click('[data-banner-settings]');assert(p.d.querySelector('dialog').open);assert(p.d.querySelector('#privacy-banner').hidden);assert(!p.d.querySelector('#privacy-statistics').checked);p.d.querySelector('dialog').dispatchEvent(new p.w.Event('cancel',{cancelable:true}));assert(!p.d.querySelector('#privacy-banner').hidden);assert(p.d.activeElement.matches('[data-banner-settings]'));p.click('[data-privacy-reject]');assert.equal(JSON.parse(p.w.localStorage.getItem(key)).statistics,false);assert(!p.d.querySelector('script[src]'));p.dom.window.close();
    p=page(lang,valid(false));assert(!p.d.querySelector('dialog'));assert(!p.d.querySelector('script[src]'));p.click('[data-privacy-settings]');p.click('[data-privacy-accept]');assert.equal(p.d.querySelectorAll('script[src]').length,1);assert.equal(JSON.parse(p.w.localStorage.getItem(key)).statistics,true);
    assert(p.w.navigator.sendBeacon('https://cloudflareinsights.com/cdn-cgi/rum','x'));assert.equal(p.sent(),1);
    p.click('[data-privacy-settings]');p.click('[data-privacy-reject]');assert(!p.d.querySelector('script[src]'));assert.equal(p.w.navigator.sendBeacon('https://cloudflareinsights.com/cdn-cgi/rum','x'),false);
    const xhr=new p.w.XMLHttpRequest();xhr.open('POST','https://cloudflareinsights.com/cdn-cgi/rum');xhr.send();assert.equal(p.sent(),1);
    await assert.rejects(p.w.fetch('https://cloudflareinsights.com/cdn-cgi/rum'));
    await p.w.fetch('https://formspree.io/f/test');assert.equal(p.sent(),2);
    p.click('[data-privacy-settings]');p.d.querySelector('dialog').dispatchEvent(new p.w.Event('cancel',{cancelable:true}));assert(!p.d.querySelector('dialog').open);assert(p.d.activeElement.matches('[data-privacy-settings]'));p.dom.window.close();
  }
  for(const raw of ['bad','{}',JSON.stringify({version:1,statistics:true,expiresAt:1})]){const p=page('de',raw);assert(!p.d.querySelector('script[src]'));assert(p.d.querySelector('#privacy-banner'));p.dom.window.close();}
  const p=page('de',valid(true));assert(p.d.querySelector('script[src]'));p.w.localStorage.setItem(key,valid(false));p.w.dispatchEvent(new p.w.StorageEvent('storage',{key}));assert(!p.d.querySelector('script[src]'));p.dom.window.close();
  console.log('Privacy checks passed: all pages, local fonts, DE/EN/BS, default denial, persistence, expiry, withdrawal, cross-tab changes and isolated Formspree requests.');
}
