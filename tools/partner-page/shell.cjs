const fs=require('fs'),path=require('path');
const {JSDOM}=require('jsdom');
module.exports=function addShell(html,root,lang){
 const suffix=lang==='de'?'':'-'+lang, home='../index'+suffix+'.html';
 const source=new JSDOM(fs.readFileSync(path.join(root,'index'+suffix+'.html'),'utf8')).window.document;
 const doc=new JSDOM(html).window.document;
 function local(url){if(!url||/^(https?:|mailto:|tel:|data:)/.test(url))return url;if(url.startsWith('#'))return home+url;if(url==='/')return home;return '../'+url.replace(/^\//,'');}
 function fragment(selector){const node=source.querySelector(selector).cloneNode(true);node.querySelectorAll('[href],[src],[srcset]').forEach(el=>{for(const a of ['href','src'])if(el.hasAttribute(a))el.setAttribute(a,local(el.getAttribute(a)));if(el.hasAttribute('srcset'))el.setAttribute('srcset',el.getAttribute('srcset').split(',').map(v=>{const [u,...tail]=v.trim().split(/\s+/);return local(u)+' '+tail.join(' ')}).join(', '));});return node;}
 const header=fragment('header.site'),footer=fragment('footer');
 header.querySelectorAll('.active').forEach(n=>n.classList.remove('active'));
 header.querySelectorAll('.lang-option').forEach(n=>{n.href={de:'index.html',en:'en.html',bs:'bs.html'}[n.dataset.lang];n.classList.toggle('active',n.dataset.lang===lang);});
 header.querySelector('#langCurrent').textContent=lang.toUpperCase();header.querySelector('#langBtn').dataset.lang=lang;
 header.removeAttribute('style');
 doc.querySelector('header').replaceWith(header);doc.querySelector('footer').replaceWith(footer);
 doc.documentElement.dataset.staticLang=lang;doc.body.className='home-refreshed partner-page';
 const wrap=doc.createElement('div');wrap.className='partner-content';doc.querySelector('main').before(wrap);wrap.append(doc.querySelector('main'),doc.querySelector('#flyer-dialog'));
 doc.querySelector('.skip').className='skip-link';doc.querySelector('main').id='main-content';doc.querySelector('.skip-link').href='#main-content';
 // Use the same generated header/footer and styling as the localized homepage.
 const original=doc.querySelector('link[href="partner.css"]');original.remove();
 source.querySelectorAll('link[rel="stylesheet"]').forEach(n=>{if(/fonts|reviews/.test(n.getAttribute('href')))return;const copy=n.cloneNode(true);copy.setAttribute('href',local(n.getAttribute('href')));doc.head.append(copy);});
 const own=doc.createElement('link');own.rel='stylesheet';own.href='partner-scoped.css';doc.head.append(own);
 const shellScript=doc.createElement('script');shellScript.src='shell.js';shellScript.defer=true;doc.head.append(shellScript);
 const menuScript=doc.createElement('script');menuScript.src='../scripts/accessibility-menu.js';menuScript.defer=true;doc.head.append(menuScript);
 const menuStyle=doc.createElement('link');menuStyle.rel='stylesheet';menuStyle.href='../scripts/accessibility-fixes.css';doc.head.append(menuStyle);
 const privacy=doc.createElement('script');privacy.src='../scripts/privacy-consent.js';privacy.defer=true;doc.head.append(privacy);
 return '<!doctype html>'+doc.documentElement.outerHTML;
};
module.exports.scopeCss=function(css){
 const doc=new JSDOM('<style>'+css+'</style>').window.document;
 function rules(list){return Array.from(list).map(r=>{if(r.type===1){const selectors=r.selectorText.split(',').map(s=>{s=s.trim();return s===':root'||s==='body'?'.partner-content':'.partner-content '+s;});return selectors.join(',')+'{'+r.style.cssText+'}';}if(r.type===4)return '@media '+r.conditionText+'{'+rules(r.cssRules)+'}';return r.cssText;}).join('\n');}
 return rules(doc.styleSheets[0].cssRules)+'\n.partner-content main{padding:0}.partner-content .section-head{display:block}.partner-content{--ink:#3a2e2a;--muted:#76645a;--rose:#d9a79a;--line:#e8d4c9;--cream:#fcf8f5}.partner-content main>section{scroll-margin-top:100px}.partner-content .intro{padding:78px 0 70px}.partner-content .partners{padding:0}.partner-content .invitation{padding:75px 0}.partner-content .flyer-section{padding:50px}.partner-content dialog{margin:auto}.partner-content .section-head h2{max-width:none}@media(max-width:700px){.partner-content .intro{padding:45px 0}.partner-content .flyer-section{padding:30px 22px}.partner-content .invitation{padding:50px 0}}';
};
