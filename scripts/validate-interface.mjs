import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

export async function validateInterface(cache){
 const dom=new JSDOM('<header class="site"></header>',{runScripts:'outside-only'}),w=dom.window;
 let scheduled,delay,y=0;
 Object.defineProperty(w,'scrollY',{get:()=>y});w.setTimeout=(callback,ms)=>{scheduled=callback;delay=ms;return 1;};w.clearTimeout=()=>{};
 w.eval(await fs.readFile('scripts/scroll-header.js','utf8'));
 const header=w.document.querySelector('header');
 y=500;w.dispatchEvent(new w.Event('scroll'));assert.equal(delay,4000);scheduled();assert(header.classList.contains('header-idle-hidden'));
 y=400;w.dispatchEvent(new w.Event('scroll'));assert.equal(delay,4000);assert(!header.classList.contains('header-idle-hidden'));scheduled();assert(header.classList.contains('header-idle-hidden'));
 y=420;w.dispatchEvent(new w.Event('scroll'));assert.equal(delay,4000);
 y=0;w.dispatchEvent(new w.Event('scroll'));scheduled();assert(!header.classList.contains('header-idle-hidden'));
 dom.window.close();
 const luminance=hex=>hex.match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
 const contrast=(a,b)=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
 for(const bg of ['cba98b','bd9779','cbd0d1','b7bfc1','d9c17c','c9ad62'])assert(contrast('3a2e2a',bg)>=4.5);
 assert(contrast('704331','fffaf7')>=4.5);
 for(const [file,{document:d}] of cache){
  if(/^impressum/.test(file)){assert(!d.querySelector('style').textContent.includes('#d99882'));assert(d.querySelector('style').textContent.includes(':focus-visible'));}
  if(/^index(?:-(en|bs))?\.html$/.test(file)){
   const hero=d.querySelector('.hero .art img'),preload=d.querySelector('link[rel=preload][as=image]');
   assert.equal(hero.sizes,preload.getAttribute('imagesizes'));assert(hero.sizes.endsWith('614px'));assert(hero.srcset.includes('1600w'));
  }
  d.querySelectorAll('.hero a.btn').forEach(a=>{if(/#(?:portfolio|gallery-showcase|shooting-video)$/.test(a.getAttribute('href')))assert(a.classList.contains('media-cta'));});
 }
 for(const [file,{document:d}] of cache){
  assert(d.querySelector('link[href^="scripts/site-refresh.css"]'),file+' refresh styles');
  assert(!d.documentElement.textContent.includes('\uFFFD'),file+' encoding');
  const contact=d.querySelector('.contact-grid');
  if(contact){const cards=contact.querySelectorAll('.contact-detail');assert(cards[2].textContent.includes('Mela-Spira-Straße 32b'),file+' address');assert.equal(cards[3].querySelectorAll('a').length,file.startsWith('ueber-mich')?6:5,file+' service links');assert(!cards[3].querySelector('a[href="'+file+'"]'),file+' self link');}
  if(/^index(?:-(en|bs))?\.html$/.test(file)){
   assert(d.querySelector('.hero .art .hero-caption'),file+' image caption');
   assert(d.querySelector('.mobile-hero-logo'),file+' mobile logo');
   assert(d.querySelector('.mobile-services-toggle>summary'),file+' services disclosure');
   assert(d.querySelector('.home-price-notes p'),file+' price notes');
   assert(d.querySelector('[data-refresh-key="google_review_text"]').textContent.includes('\n'),file+' review line break');
   assert.equal(d.querySelector('.media-action-pair').children.length,2);
   for(const image of d.querySelectorAll('.masonry img,.story-band-grid img'))assert(image.srcset&&image.sizes,file+' responsive preview');
  }
  if(d.body.classList.contains('service-refreshed')){
   assert(d.querySelector('.hero-grid.early-photo'),file+' image order');
   assert(!d.querySelector('.hero-emotion'),file+' redundant introduction');
   assert.equal(d.querySelector('.hero .media-action-pair')?.children.length,2,file+' adjacent media actions');
  }
  if(file.startsWith('babybauch-und-neugeborenen-shooting-graz'))for(const src of ['galerie-neugeborene-dsc03433.webp','DSC02081.webp'])assert(d.querySelector('#gallery-showcase img[src="'+src+'"]'),file+' added image');
  d.querySelectorAll('a.btn[href$="#portfolio"],a.btn[href$="#gallery-showcase"],a.btn[href$="#shooting-video"]').forEach(a=>assert(a.classList.contains('media-cta'),file+' shared media styling'));
 }
 console.log('Refresh checks passed: translated components, addresses, gallery sources, image order, disclosures and shared actions.');
 console.log('Interface checks passed: scroll direction timing, metal/hover/link contrast, hero preload sizes and media actions.');
}
