import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {integrateVoucherLegal} from '../../scripts/voucher-legal-integration.mjs';
const require=createRequire(import.meta.url),{JSDOM}=require('jsdom');
const text={
 de:{label:'Gutscheine',kicker:'Von Herzen schenken',title:'Erinnerungen verschenken.',copy:'Ein Fotogutschein mit deinem Wunschbetrag und persönlichen Worten. Für Lieblingsmenschen und ihre besonderen Momente.',button:'Gutscheine entdecken'},
 en:{label:'Gift vouchers',kicker:'Give a little happiness',title:'Give memories that stay.',copy:'A photography voucher with your chosen value and a personal message. For your favourite people and their special moments.',button:'Explore gift vouchers'},
 bs:{label:'Poklon-bonovi',kicker:'Poklon od srca',title:'Pokloni uspomene.',copy:'Poklon-bon za fotografisanje s iznosom po tvom izboru i ličnom porukom. Za drage ljude i njihove posebne trenutke.',button:'Pogledaj poklon-bonove'}
};
export function integrateGiftVouchers(doc,relative){
 integrateVoucherLegal(doc,relative);
 const lang=/(?:-en|\/en)\.html$/.test(relative)?'en':/(?:-bs|\/bs)\.html$/.test(relative)?'bs':'de',t=text[lang],suffix=lang==='de'?'':'-'+lang,prefix=relative.includes('/')?'../':'';
 const landing=prefix+'gutscheine'+suffix+'.html';
 if(doc.body.classList.contains('client-portal')||relative.startsWith('galerie/')||relative.startsWith('tools/'))return;
 // Keep one direct entry between the FAQ group and Contact on desktop and mobile.
 doc.querySelectorAll('header .price-dropdown [data-gift-nav],header #mobile-price-gift').forEach(n=>n.remove());
 const priceToggle=doc.querySelector('.price-dropdown .mobile-submenu-toggle');
 if(priceToggle)priceToggle.setAttribute('aria-controls',(priceToggle.getAttribute('aria-controls')||'').split(/\s+/).filter(id=>id&&id!=='mobile-price-gift').join(' '));
 const nav=doc.querySelector('header nav.primary');
 if(nav){
  const existing=[...nav.querySelectorAll(':scope > [data-gift-nav]')];let a=existing.shift();existing.forEach(n=>n.remove());
  if(!a)a=doc.createElement('a');a.href=landing;a.textContent=t.label;a.dataset.giftNav='direct';a.className='gift-nav-link';
  const contact=[...nav.children].find(n=>n.tagName==='A'&&/direct-contact-card|contact-form-card|#contact$/.test(n.getAttribute('href')||''));
  if(contact)contact.before(a);else nav.append(a);
 }
 const foot=doc.querySelector('footer .footer-secondary-links');
 if(foot&&!foot.querySelector('[data-gift-nav]')){const a=doc.createElement('a');a.href=landing;a.textContent=t.label;a.dataset.giftNav='';const contact=foot.querySelector('[data-i18n="footer_contact"]');if(contact)contact.before(a);else foot.prepend(a);}
 // An independent gift section is not a seventh shooting/service card.
 if(/^index(?:-(?:en|bs))?\.html$/.test(relative)){
  let block=doc.querySelector('[data-gift-home-section]');
  if(!block){block=doc.createElement('section');block.className='gv-home-gift';block.dataset.giftHomeSection='';block.setAttribute('aria-labelledby','gift-home-title');block.innerHTML='<div><p class="gv-home-gift-kicker"></p><h2 id="gift-home-title"></h2><p class="gv-home-gift-text"></p></div><a></a>';const target=doc.querySelector('#direct-contact-card')?.closest('section')||doc.querySelector('#contact')||doc.querySelector('main')?.lastElementChild;if(target)target.before(block);}
  if(block){block.querySelector('.gv-home-gift-kicker').textContent=t.kicker;block.querySelector('h2').textContent=t.title;block.querySelector('.gv-home-gift-text').textContent=t.copy;const a=block.querySelector('a');a.href=landing;a.textContent=t.button+' ↗';}
  if(!doc.querySelector('link[data-gift-styles]')){const css=doc.createElement('link');css.rel='stylesheet';css.href='gutscheine.css?v=20261023';css.dataset.giftStyles='';doc.head.append(css);}
 }
}
export async function applyGiftVoucherIntegrations(root){
 const entries=await fs.readdir(root,{withFileTypes:true}),files=entries.filter(n=>n.isFile()&&n.name.endsWith('.html')).map(n=>n.name);
 for(const folder of ['partner']){try{for(const name of await fs.readdir(path.join(root,folder)))if(name.endsWith('.html'))files.push(folder+'/'+name);}catch{}}
 const changed=[];
 for(const relative of files){const target=path.join(root,relative),before=await fs.readFile(target,'utf8'),doc=new JSDOM(before).window.document,oldDom=doc.documentElement.outerHTML;integrateGiftVouchers(doc,relative);if(doc.documentElement.outerHTML===oldDom)continue;const after='<!DOCTYPE html>\n'+doc.documentElement.outerHTML;await fs.writeFile(target,after);changed.push(relative);}
 // Also support the focused voucher build, which does not rebuild the whole site.
 const sitemapPath=path.join(root,'sitemap.xml');
 const sitemapBefore=await fs.readFile(sitemapPath,'utf8');
 const origin='https://liza-memories-photography.com/';
 const variants=[['de','gutscheine.html'],['en','gutscheine-en.html'],['bs','gutscheine-bs.html'],['x-default','gutscheine.html']];
 const alternates=variants.map(([lang,file])=>`    <xhtml:link rel="alternate" hreflang="${lang}" href="${origin}${file}" />`).join('\n');
 const sitemapEntries=variants.slice(0,3).map(([,file])=>`  <url>\n    <loc>${origin}${file}</loc>\n${alternates}\n  </url>`).join('\n');
 const sitemapAfter=sitemapBefore.replace(/\s*<url>\s*<loc>https:\/\/liza-memories-photography\.com\/gutscheine(?:-(?:en|bs))?\.html<\/loc>[\s\S]*?<\/url>/g,'').replace(/\s*<\/urlset>/,`\n${sitemapEntries}\n</urlset>`);
 if(sitemapAfter!==sitemapBefore){await fs.writeFile(sitemapPath,sitemapAfter);changed.push('sitemap.xml');}
 return changed;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const root=process.env.LIZA_SITE_ROOT||path.resolve(path.dirname(process.argv[1]),'../..');console.log('Gutschein-Verweise lokal integriert:',(await applyGiftVoucherIntegrations(root)).length);}
