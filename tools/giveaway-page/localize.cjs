const fs=require('fs'),path=require('path'),{JSDOM}=require('jsdom');
const files={de:'index.html',en:'en.html',bs:'bs.html'};
const base='https://liza-memories-photography.com';
module.exports=function(root,source,out){
 const catalog=require('./translations.json'),runtime=require('./runtime-translations.json');
 const original=fs.readFileSync(path.join(source,'index.html'),'utf8');
 for(const lang of ['de','en','bs']){
  const doc=new JSDOM(original).window.document,idx=lang==='en'?0:1;
  if(lang!=='de'){
   const walker=doc.createTreeWalker(doc.body,4);let node;
   while(node=walker.nextNode()) {const key=node.textContent.trim();if(!key)continue;if(catalog[key])node.textContent=node.textContent.replace(key,catalog[key][idx]);else if(/[a-zA-ZäöüÄÖÜß]/.test(key)&&!['Graz-Straßgang','info@liza-memories-photography.com','OK'].includes(key))throw Error('Missing translation: '+key);}
   const attrs={
    'Schwangere Frau im rosafarbenen Kleid':['Pregnant woman in a pink dress','Trudnica u ružičastoj haljini'],
    'Schwangere Frau mit buntem Blumenstrauß und Jeans':['Pregnant woman holding a colourful bouquet and wearing jeans','Trudnica s raznobojnim buketom u farmerkama'],
    "Werdende Eltern in hellblauer Kleidung halten einander und den Babybauch":["Expectant parents in light blue clothing holding each other and the baby bump","Budući roditelji u svijetloplavoj odjeći drže jedno drugo i trudnički stomak"],
    "Vater legt sein Gesicht und seine Hand an den Babybauch vor dunklem Hintergrund":["Father resting his face and hand against the baby bump against a dark background","Otac prislanja lice i ruku uz trudnički stomak ispred tamne pozadine"],
    "Kleinkind spielt zwischen Seifenblasen mit Eltern und Schwester im Hintergrund":["Toddler playing among soap bubbles with parents and sister in the background","Malo dijete se igra među balončićima sapunice, s roditeljima i sestrom u pozadini"],
    "Mutter und Neugeborenes berühren sich sanft mit der Nase":["Mother and newborn gently touching noses","Majka i novorođenče nježno dodiruju noseve"],
    'Vor- und Nachname laut Ausweis':['Full name as shown on your ID','Ime i prezime kao na ličnom dokumentu'],
    '@dein.name':['@your.name','@tvoje.ime'],
    'du@beispiel.at':['you@example.at','ti@primjer.at'],
    'Eltern halten ihre zwei lachenden Kinder auf dem Arm im Grünen':['Parents holding their two smiling children outdoors','Roditelji drže svoje dvoje nasmijane djece u prirodi'],
    'Schlafendes Baby mit Stoffhäschen in einem Korb auf rosafarbenen Decken':['Sleeping baby with a toy bunny in a basket on pink blankets','Beba spava s plišanim zečićem u korpi na ružičastim dekama'],
    'Werdende Eltern halten gemeinsam kleine Babyschuhe neben dem Babybauch':['Expectant parents holding tiny baby shoes beside the baby bump','Budući roditelji zajedno drže male cipelice uz trudnički stomak'],
    'Vorschau des aufgeklappten LiZa Memories Flyers mit Babybauch- und Hochzeitsfotografie':['Preview of the unfolded LiZa Memories flyer with maternity and wedding photography','Pregled otvorenog LiZa Memories letka s trudničkim i vjenčanim fotografijama'],
    'Das Gewinnspiel auf einen Blick':['Giveaway at a glance','Nagradna igra ukratko'],
    'Weitere Informationen':['More information','Dodatne informacije'],
    'LiZa Memories Photography – Startseite':['LiZa Memories Photography – Home','LiZa Memories Photography – Početna']
   };
   doc.querySelectorAll('[alt],[placeholder],[aria-label]').forEach(el=>{for(const attr of ['alt','placeholder','aria-label']){const value=el.getAttribute(attr);if(attrs[value])el.setAttribute(attr,attrs[value][idx]);}});
   // Localized destinations already exist in the main site and partner section.
   doc.querySelectorAll('a[href]').forEach(a=>{let u=a.getAttribute('href');u=u.replace(base+'/partner/',base+'/partner/'+files[lang]);u=u.replace(base+'/#',base+'/index-'+lang+'.html#');u=u.replace(/\/(preise|datenschutz|impressum)\.html/, '/$1-'+lang+'.html');a.setAttribute('href',u);});
  }
  doc.documentElement.lang=lang;doc.documentElement.dataset.staticLang=lang;doc.body.className='home-refreshed giveaway-page';
  const titles={de:'Ein Shooting. Eure Erinnerungen. | LiZa Memories Photography',en:'Win a photo session | LiZa Memories Photography',bs:'Osvoji fotografisanje | LiZa Memories Photography'};
  const desc={de:'Gewinne ein Fotoshooting bei LiZa Memories Photography in Graz – für dich oder als Geschenk für einen Herzensmenschen.',en:'Win a photo session with LiZa Memories Photography in Graz – for yourself or as a gift for someone special.',bs:'Osvoji fotografisanje uz LiZa Memories Photography u Grazu – za sebe ili kao poklon dragoj osobi.'};
  doc.title=titles[lang];doc.querySelector('meta[name=description]').content=desc[lang];doc.querySelector('meta[property="og:title"]').content=titles[lang];doc.querySelector('meta[property="og:description"]').content=desc[lang];
  const url=base+'/gewinnspiel/'+(lang==='de'?'':files[lang]);doc.querySelector('link[rel=canonical]').href=url;doc.querySelector('meta[property="og:url"]').content=url;
  for(const code of ['de','en','bs','x-default']){const a=doc.createElement('link');a.rel='alternate';a.hreflang=code;a.href=base+'/gewinnspiel/'+(code==='de'||code==='x-default'?'':files[code]);doc.head.append(a);}
  const homepage=new JSDOM(fs.readFileSync(path.join(root,'index'+(lang==='de'?'':'-'+lang)+'.html'),'utf8')).window.document;
  function local(u){if(!u||/^(https?:|mailto:|tel:|data:)/.test(u))return u;const home='../index'+(lang==='de'?'':'-'+lang)+'.html';if(u.startsWith('#'))return home+u;if(u==='/')return home;return '../'+u.replace(/^\//,'');}
  function fragment(selector){const el=homepage.querySelector(selector).cloneNode(true);el.querySelectorAll('[href],[src],[srcset]').forEach(n=>{for(const a of ['href','src'])if(n.hasAttribute(a))n.setAttribute(a,local(n.getAttribute(a)));if(n.hasAttribute('srcset'))n.setAttribute('srcset',n.getAttribute('srcset').split(',').map(s=>{const [u,...rest]=s.trim().split(/\s+/);return local(u)+' '+rest.join(' ')}).join(', '));});return el;}
  const header=fragment('header.site');header.removeAttribute('style');header.querySelectorAll('.active').forEach(e=>e.classList.remove('active'));
  header.querySelectorAll('.lang-option').forEach(a=>{a.href=files[a.dataset.lang];a.classList.toggle('active',a.dataset.lang===lang);});header.querySelector('#langCurrent').textContent=lang.toUpperCase();header.querySelector('#langBtn').dataset.lang=lang;
  if(lang!=='de'){header.querySelector('.header-cta').textContent=lang==='en'?'Inquire now':'Pošalji upit';header.querySelector('#langBtn').setAttribute('aria-label',lang==='en'?'Choose language':'Odaberi jezik');header.querySelector('#burger').setAttribute('aria-label',lang==='en'?'Open menu':'Otvori meni');header.querySelector('.brand').setAttribute('aria-label',lang==='en'?'Home':'Početna');}
  doc.querySelector('header').replaceWith(header);doc.querySelector('footer').replaceWith(fragment('footer'));
  const wrapper=doc.createElement('div');wrapper.className='giveaway-content';header.after(wrapper);wrapper.append(doc.querySelector('#campaign-status'),doc.querySelector('main'),doc.querySelector('#success-dialog'));
  doc.querySelector('.skip').className='skip-link';doc.querySelector('main').id='main-content';doc.querySelector('.skip-link').href='#main-content';
  const top=doc.createElement('div');top.className='form-heading';const eyebrow=doc.querySelector('.form-card>.eyebrow');eyebrow.before(top);top.append(eyebrow);
  const share=doc.createElement('button');share.type='button';share.className='form-share';share.dataset.share='';share.setAttribute('aria-label',{de:'Gewinnspiel teilen',en:'Share giveaway',bs:'Podijeli nagradnu igru'}[lang]);share.textContent={de:'Teilen ↗',en:'Share ↗',bs:'Podijeli ↗'}[lang];top.append(share);
  const feedback=doc.createElement('p');feedback.dataset.shareStatus='';feedback.className='form-share-status';feedback.setAttribute('role','status');top.after(feedback);
  doc.querySelector('link[href="gewinnspiel.css"]').remove();
  homepage.querySelectorAll('link[rel=stylesheet]').forEach(el=>{if(/fonts|reviews/.test(el.getAttribute('href')))return;const copy=el.cloneNode(true);copy.href=local(el.getAttribute('href'));doc.head.append(copy);});
  for(const href of ['../scripts/accessibility-fixes.css','gewinnspiel-scoped.css?v=20260925-steps-art']){const el=doc.createElement('link');el.rel='stylesheet';el.href=href;doc.head.append(el);}
  for(const src of ['../partner/shell.js','../scripts/accessibility-menu.js','../scripts/privacy-consent.js']){const el=doc.createElement('script');el.src=src;el.defer=true;doc.head.append(el);}
  const messages=doc.createElement('script');messages.textContent='window.GIVEAWAY_MESSAGES='+JSON.stringify(lang==='de'?{}:Object.fromEntries(Object.entries(runtime).map(([k,v])=>[k,v[idx]]))).replace(/</g,'\\u003c')+';';doc.head.prepend(messages);
  if(lang!=='de'){doc.querySelectorAll('[aria-label="Zur Startseite"]').forEach(el=>el.setAttribute('aria-label',lang==='en'?'Home':'Početna'));}
  // Keep typographic dashes horizontal even in the display serif and italic text.
  const dashWalker=doc.createTreeWalker(wrapper,4),dashNodes=[];let dashNode;
  while(dashNode=dashWalker.nextNode())if(/[-‐‑‒–—]/.test(dashNode.textContent)&&!dashNode.parentElement.closest('script,style,svg'))dashNodes.push(dashNode);
  for(const node of dashNodes){const fragment=doc.createDocumentFragment();for(const part of node.textContent.split(/([-‐‑‒–—])/)){if(/^[-‐‑‒–—]$/.test(part)){const dash=doc.createElement('span');dash.className='straight-dash';dash.textContent=part;fragment.append(dash);}else fragment.append(doc.createTextNode(part));}node.replaceWith(fragment);}
  fs.writeFileSync(path.join(out,files[lang]),'<!doctype html>'+doc.documentElement.outerHTML);
 }
 const css=fs.readFileSync(path.join(source,'gewinnspiel.css'),'utf8');
 const doc=new JSDOM('<style>'+css+'</style>').window.document;
 function rules(list){return Array.from(list).map(r=>{if(r.type===1)return r.selectorText.split(',').map(s=>{s=s.trim();return s===':root'||s==='body'?'.giveaway-content':s==='html'?'html':'.giveaway-content '+s;}).join(',')+'{'+r.style.cssText+'}';if(r.type===4)return '@media '+r.conditionText+'{'+rules(r.cssRules)+'}';return r.cssText;}).join('\n');}
 fs.writeFileSync(path.join(out,'gewinnspiel-scoped.css'),rules(doc.styleSheets[0].cssRules)+`
 html{scroll-padding-top:110px}.giveaway-content main{padding:0}.giveaway-content .hero{min-height:0}.giveaway-content .entry-section,.giveaway-content details,.giveaway-content #bildnutzung{scroll-margin-top:110px}.giveaway-content dialog{margin:auto}.giveaway-content .form-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}.giveaway-content .form-heading .eyebrow{margin:0}.giveaway-content .form-share{flex-shrink:0;border:1px solid #b7806e;border-radius:24px;background:#eed5c9;color:#593c31;font:600 12px/1.3 Manrope,Arial,sans-serif;padding:11px 14px;min-height:44px;cursor:pointer}.giveaway-content .form-share:hover{background:#e1b7a7}.giveaway-content .form-share-status{font-size:12px;overflow-wrap:anywhere}.giveaway-content .form-share-status:empty{display:none}.giveaway-content .newsletter p{font-size:13px}.giveaway-content .form-card{min-width:0}@media(max-width:700px){.giveaway-content .form-heading{flex-wrap:nowrap;gap:8px}.giveaway-content .form-heading .eyebrow{font-size:9px;letter-spacing:.8px;max-width:145px}.giveaway-content .form-share{padding:10px 12px;font-size:12px}}
 `);
};
