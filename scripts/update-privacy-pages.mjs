import fs from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { privacySections } from './privacy-policy-content.mjs';
import { applyPrivacy } from './privacy-build.mjs';
export async function updatePrivacyPages(){
 for(const lang of ['de','en','bs']){
  const file=lang==='de'?'datenschutz.html':`datenschutz-${lang}.html`;
  const dom=new JSDOM(await fs.readFile(file,'utf8'));const d=dom.window.document;
  const title={de:'Datenschutzerklärung',en:'Privacy policy',bs:'Politika privatnosti'}[lang];
  d.body.innerHTML=`<main><h1>${title}</h1><p>${{de:'Stand: 10. September 2026',en:'Updated: 10 September 2026',bs:'Ažurirano: 10. septembra 2026.'}[lang]}</p>${privacySections[lang].map(([heading,body,id],i)=>`<section${id?` id="${id}"`:''}><h2>${i+1}. ${heading}</h2>${body}</section>`).join('')}</main>`;
  const style=d.createElement('style');style.id='privacy-policy-style';style.textContent='body a{color:#704331}body a:focus-visible,body button:focus-visible{outline:3px solid #704331;outline-offset:3px}';d.getElementById(style.id)?.remove();d.head.append(style);
  applyPrivacy(d,file);
  await fs.writeFile(file,'<!DOCTYPE html>\n'+d.documentElement.outerHTML+'\n');dom.window.close();
 }
}
