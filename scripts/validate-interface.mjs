import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

export async function validateInterface(cache){
 const dom=new JSDOM('<header class="site"></header>',{runScripts:'outside-only'}),w=dom.window;
 let scheduled,delay,y=0;
 Object.defineProperty(w,'scrollY',{get:()=>y});w.setTimeout=(callback,ms)=>{scheduled=callback;delay=ms;return 1;};w.clearTimeout=()=>{};
 w.eval(await fs.readFile('scripts/scroll-header.js','utf8'));
 const header=w.document.querySelector('header');
 y=500;w.dispatchEvent(new w.Event('scroll'));assert.equal(delay,900);scheduled();assert(header.classList.contains('header-idle-hidden'));
 y=400;w.dispatchEvent(new w.Event('scroll'));assert.equal(delay,4500);assert(!header.classList.contains('header-idle-hidden'));scheduled();assert(header.classList.contains('header-idle-hidden'));
 y=420;w.dispatchEvent(new w.Event('scroll'));assert.equal(delay,900);
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
   assert.equal(hero.sizes,preload.getAttribute('imagesizes'));assert(hero.sizes.endsWith('468px'));assert(hero.srcset.includes('1600w'));
  }
  d.querySelectorAll('.hero a.btn').forEach(a=>{if(/#(?:portfolio|gallery-showcase|shooting-video)$/.test(a.getAttribute('href')))assert(a.classList.contains('media-cta'));});
 }
 console.log('Interface checks passed: scroll direction timing, metal/hover/link contrast, hero preload sizes and media actions.');
}
