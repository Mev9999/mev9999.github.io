// Build-time enhancements. Copy and component structure are maintained here.
const services = {
 'babybauch-shooting-graz.html':'maternity','newborn-fotografie-graz.html':'newborn',
 'familienfotografie-graz.html':'family','portraitfotografie-graz.html':'portrait',
 'hochzeitsfotograf-graz.html':'wedding','babybauch-und-neugeborenen-shooting-graz.html':'combo'
};
const words = {
 de:{skip:'Zum Hauptinhalt',gallery:'Bilder ansehen',prices:'Pakete & Preise',faq:'Fragen zum Shooting',combo:'Babybauch & Neugeborene als Kombipaket',more:'Weitere Bilder ansehen',optional:'Nachricht (optional)',placeholder:'Wenn du möchtest: Erzähle mir kurz von deinen Wünschen.',core:['Babybauchfotografie in Graz','Neugeborenenfotografie in Graz','Familienfotografie in Graz'],titles:['Babybauchfotografie in Graz – ganz entspannt vor der Kamera','Neugeborenenfotografie in Graz – in ruhiger Studioatmosphäre','Familienfotografie in Graz – Zeit für echte gemeinsame Momente']},
 en:{skip:'Skip to main content',gallery:'View photos',prices:'Packages & pricing',faq:'Questions about your shoot',combo:'Maternity & newborn combined package',more:'View more photos',optional:'Message (optional)',placeholder:'If you like, tell me a little about your wishes.',core:['Maternity photography in Graz','Newborn photography in Graz','Family photography in Graz'],titles:['Maternity photography in Graz – feel at ease in front of the camera','Newborn photography in Graz – in a calm studio setting','Family photography in Graz – time for real moments together']},
 bs:{skip:'Preskoči na glavni sadržaj',gallery:'Pogledaj fotografije',prices:'Paketi i cijene',faq:'Pitanja o fotografisanju',combo:'Kombinovani paket za trudnice i novorođenčad',more:'Pogledaj još fotografija',optional:'Poruka (opcionalno)',placeholder:'Ako želiš, napiši mi ukratko svoje želje.',core:['Fotografisanje trudnica u Grazu','Fotografisanje novorođenčadi u Grazu','Porodično fotografisanje u Grazu'],titles:['Fotografisanje trudnica u Grazu – opušteno pred objektivom','Fotografisanje novorođenčadi u Grazu – u mirnoj atmosferi studija','Porodično fotografisanje u Grazu – vrijeme za iskrene zajedničke trenutke']}
};
export function improveSite(document,file){
 const lang=file.match(/-(en|bs)\.html$/)?.[1]||'de',t=words[lang];
 const base=file.replace(/-(en|bs)\.html$/,'.html'),service=services[base],home=base==='index.html';
 const local=f=>lang==='de'?f:f.replace('.html',`-${lang}.html`);
 const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;};
 const link=(href,text)=>{const a=node('a','',text);a.href=href;return a;};
 const main=document.querySelector('main')||document.querySelector('#home');
 if(main){main.id ||= 'main-content';main.setAttribute('tabindex','-1');let skip=document.querySelector('.skip-link');if(!skip){skip=link('#'+main.id,t.skip);skip.className='skip-link';document.body.prepend(skip);}skip.textContent=t.skip;}
 if(!document.querySelector('header'))return;
 for(const [tag,attr,src] of [['link','href','scripts/site-improvements.css'],['script','src','scripts/contact-flow.js']]){
  let e=document.querySelector(`${tag}[${attr}^="${src}"]`);if(!e){e=node(tag);e.setAttribute(attr,src+'?v=20260910');if(tag==='link')e.rel='stylesheet';else e.defer=true;}document.head.append(e);
 }
 const promos=[...document.querySelectorAll('script[src*="home-promo.js"]')];promos.slice(1).forEach(e=>e.remove());if(promos[0])promos[0].id='homePromoScript';
 const headerStyles=[...document.querySelectorAll('style')].filter(e=>e.textContent.includes('header.scroll-aware-header {transition:transform'));
 headerStyles.slice(1).forEach(e=>e.remove());if(headerStyles[0])headerStyles[0].id='scroll-header-style';
 document.querySelectorAll('img[src="logo-liza.png"]').forEach(img=>{img.src='logo-liza.webp';img.setAttribute('srcset','logo-liza.webp 640w');img.setAttribute('sizes','(max-width:640px) 120px, 250px');});
 document.querySelectorAll('video source[src^="Video_Hompage_hinter_den_Kulissen.mp4"]').forEach(source=>source.src='Video_Hompage_hinter_den_Kulissen.mp4?v=20260910');
 if(home){
  let schema=document.getElementById('website-schema');if(!schema){schema=node('script');schema.id='website-schema';schema.type='application/ld+json';document.head.append(schema);}schema.textContent=JSON.stringify({'@context':'https://schema.org','@type':'WebSite','@id':'https://liza-memories-photography.com/#website',url:'https://liza-memories-photography.com/',name:'LiZa Memories Photography',alternateName:'LiZa Memories',inLanguage:['de','en','bs']});
  const msg=document.querySelector('#msg');msg?.removeAttribute('required');if(msg){msg.placeholder=t.placeholder;msg.removeAttribute('data-i18n-placeholder');const label=document.querySelector('label[for="msg"]');label.textContent=t.optional;label.removeAttribute('data-i18n');}
 }
 const grid=document.querySelector('.hero-grid');
 if(grid&&(home||service)&&!grid.classList.contains('early-photo')){
  const copy=home?grid.querySelector('.hero-copy'):grid.firstElementChild;
  const photo=grid.querySelector(home?'.hero-side':'.hero-visual');
  if(copy&&photo){const intro=node('div','hero-intro');const details=node('div','hero-details');[...copy.children].forEach(e=>(e.matches('h1,.chip,.eyebrow')?intro:details).append(e));copy.remove();grid.prepend(intro,photo,details);grid.classList.add('early-photo');}
 }
 if(home&&!document.querySelector('.core-service-links')){
  const paths=node('nav','service-paths core-service-links');paths.setAttribute('aria-label',({de:'Shootings in Graz',en:'Photo sessions in Graz',bs:'Fotografisanje u Grazu'})[lang]);
  ['babybauch-shooting-graz.html','newborn-fotografie-graz.html','familienfotografie-graz.html'].forEach((f,i)=>paths.append(link(local(f),t.core[i])));
  document.querySelector('.hero-details')?.append(paths);
 }else if(home){document.querySelectorAll('.core-service-links a').forEach((a,i)=>{a.textContent=t.core[i];a.href=local(Object.keys(services)[i]);});}
 if(service){
  const index=['maternity','newborn','family'].indexOf(service),h1=document.querySelector('.hero h1');
  if(index>=0&&h1){let emotion=document.querySelector('.hero-emotion');if(!emotion){emotion=node('p','hero-emotion',h1.textContent);document.querySelector('.hero-details')?.prepend(emotion);}h1.textContent=t.titles[index];}
  const gallery=document.querySelector('#gallery-showcase');
  if(gallery){document.querySelectorAll('.hero-actions a').forEach(a=>{if(/#portfolio$/.test(a.getAttribute('href')||''))a.href='#gallery-showcase';});}
  const info=document.querySelector('main>.hero+section');if(info&&!info.id)info.id='shooting-details';
  document.querySelector('.service-quick-links')?.remove();
  if(!document.querySelector('.service-quick-links')){
   const paths=node('nav','service-paths service-quick-links');paths.setAttribute('aria-label',t.prices);
   if(gallery)paths.append(link('#gallery-showcase',t.gallery));
   if(info)paths.append(link('#'+info.id,({de:'Ablauf & Vorbereitung',en:'How to prepare & what to expect',bs:'Priprema i tok fotografisanja'})[lang]));
   const anchors={maternity:'babybauch',newborn:'neugeborene',family:'familie',portrait:'portrait',wedding:'hochzeit',combo:'kombi'};
   paths.append(link(local('preise.html')+'#'+anchors[service],t.prices));if(document.querySelector('#faq'))paths.append(link('#faq',t.faq));
   if(['maternity','newborn'].includes(service))paths.append(link(local('babybauch-und-neugeborenen-shooting-graz.html'),t.combo));
   document.querySelector('.hero-details')?.append(paths);
  }
  const galleryGrid=gallery?.querySelector('.gallery-grid');
  if(galleryGrid&&!gallery.querySelector('.service-gallery-more')){
   const items=[...galleryGrid.children];if(items.length>18){const more=node('details','service-gallery-more'),summary=node('summary','',`${t.more} (${items.length-15})`),rest=node('div','gallery-grid');more.append(summary,rest);items.slice(15).forEach(e=>rest.append(e));galleryGrid.after(more);}
  }
  document.querySelectorAll('a[href*="#contact-form-card"]').forEach(a=>{const u=new URL(a.getAttribute('href'),'https://liza-memories-photography.com/');u.searchParams.set('service',service);u.searchParams.set('source',file);a.href=local('index.html')+u.search+'#contact-form-card';});
 }
 // Keep anchors and source attribution even on generic pricing inquiry links.
 if(base==='preise.html')document.querySelectorAll('a[href*="#contact-form-card"]').forEach(a=>{const u=new URL(a.getAttribute('href'),'https://liza-memories-photography.com/');u.searchParams.set('source',file);a.href=local('index.html')+u.search+'#contact-form-card';});
}
