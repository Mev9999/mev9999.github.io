import fs from 'node:fs';
const sections=JSON.parse(fs.readFileSync(new URL('./about-moved-sections.json',import.meta.url),'utf8'));
export function updateHomeAboutLayout(d,file){
 const lang=file.match(/-(en|bs)\.html$/)?.[1]||'de',i=['de','en','bs'].indexOf(lang),base=file.replace(/-(en|bs)\.html$/,'.html'),home=base==='index.html',about=base==='ueber-mich.html';
 const local=f=>lang==='de'?f:f.replace('.html',`-${lang}.html`);
 const el=(tag,cls,text)=>{const e=d.createElement(tag);e.className=cls;if(text)e.textContent=text;return e;};
 if(home){
  const address=d.querySelector('[data-refresh-key=aside_location_value]');
  if(address){const box=address.parentElement;box.classList.add('studio-route-card');box.querySelector('.studio-route-link')?.remove();const a=el('a','studio-route-link',['Route planen ↗','Get directions ↗','Upute za dolazak ↗'][i]);a.href='https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent('Mela-Spira-Straße 32b, 8054 Graz, Österreich');a.target='_blank';a.rel='noopener noreferrer';a.setAttribute('aria-label',['Route zum Studio mit Google Maps planen (öffnet einen neuen Tab)','Plan your route to the studio with Google Maps (opens a new tab)','Planirajte put do studija putem Google Maps (otvara novu karticu)'][i]);box.prepend(a);}
 }
 if(home){
  d.querySelectorAll('#editorial-moments,#process,#services').forEach(e=>e.remove());
  const lead=d.querySelector('.hero .lead');lead.textContent=['Vom Babybauch über die ersten Babyfotos bis zu euren Familienfotos begleite ich euch und halte eure besonderen Momente liebevoll, emotional und zeitlos fest.','From maternity portraits and your baby’s first photos to family photographs, I’m here to capture your special moments with warmth, emotion and a timeless feel.','Od trudničkih fotografija i prvih fotografija vaše bebe do porodičnih fotografija, pratim vas i bilježim vaše posebne trenutke s ljubavlju, emocijom i bezvremenskim stilom.'][i];lead.removeAttribute('data-i18n');
  const portfolio=d.querySelector('[data-i18n=portfolio_sub],[data-layout-key=portfolio_sub]');if(portfolio){portfolio.textContent=['Eine Auswahl aus Babybauchfotos, Neugeborenenfotos und Familienfotos.','A selection of maternity, newborn and family photos.','Izbor trudničkih fotografija, fotografija novorođenčadi i porodičnih fotografija.'][i];portfolio.removeAttribute('data-i18n');portfolio.dataset.layoutKey='portfolio_sub';}
  const address=d.querySelector('[data-refresh-key=hero_proof_value_1]');if(address){const lines=address.textContent.split('\n');address.replaceChildren();const desktop=el('span','desktop-address',lines.shift()),mobile=el('span','mobile-address','Mela-Spira-Str. 32b\n8054 Graz-Straßgang');address.append(desktop,mobile,d.createTextNode('\n'+lines.join('\n')));}
  const compactProof=[
   ['Mela-Spira-Straße 32b · 8054 Graz-Straßgang\nShootings in gemütlicher Atmosphäre bei mir. Outdoor oder Wunschlocation sind nach Absprache auch möglich.',null,null,'Ich wähle eure schönsten Fotos aus und bearbeite sie liebevoll. Meist sind sie nach wenigen Tagen in eurer Online-Galerie. Dort könnt ihr in Ruhe zusätzliche Bilder auswählen.'],
   ['Mela-Spira-Straße 32b · 8054 Graz-Straßgang\nRelaxed sessions at my studio. Outdoor sessions or your preferred location are also possible by arrangement.',null,null,'I select and carefully edit your loveliest photos. They are usually ready within days in your personal online gallery, where you can take your time choosing extra images.'],
   ['Mela-Spira-Straße 32b · 8054 Graz-Straßgang\nFotografisanje kod mene u ugodnoj atmosferi. Na otvorenom ili na željenoj lokaciji moguće je po dogovoru.',null,null,'Biram i pažljivo obrađujem vaše najljepše fotografije. Obično su za nekoliko dana u vašoj online galeriji, gdje možete u miru odabrati dodatne fotografije.']
  ][i];
  compactProof.forEach((copy,n)=>{const value=d.querySelector('[data-refresh-key=hero_proof_value_'+(n+1)+']');if(!copy||!value)return;const mobile=el('span','mobile-proof-copy');while(value.firstChild)mobile.append(value.firstChild);value.append(el('span','desktop-proof-copy',copy),mobile);});
  const links=d.querySelector('.shooting-service-links');if(links){links.classList.add('compact-home-links');const labels=[['Babybauchshooting','Neugeborenenshooting','Familienshooting','Hochzeitsshooting'],['Maternity session','Newborn session','Family session','Wedding photography'],['Trudničko fotografisanje','Fotografisanje beba','Porodično fotografisanje','Fotografisanje vjenčanja']][i];[...links.children].forEach((a,n)=>{const full=el('span','desktop-link-label',a.textContent),short=el('span','mobile-link-label',labels[n]);a.replaceChildren(full,short);});}
  const contactSentence=d.querySelector('[data-refresh-key=aside_text_new_1]');
  if(contactSentence){contactSentence.replaceChildren(el('span','desktop-contact-sentence',['Für weitere Wünsche erstelle ich euch gerne ein individuelles Angebot.','I am happy to provide a personalised quote for other requests.','Za druge fotografske želje rado ću pripremiti individualnu ponudu.'][i]),el('span','mobile-contact-sentence',['Gerne erstelle ich für andere Leistungswünsche auch ein individuelles Angebot.','I am also happy to prepare a personalised quote for other photography requests.','Za druge fotografske želje rado ću pripremiti individualnu ponudu.'][i]));}
  const notes=d.querySelector('.aside-top');if(notes){notes.classList.add('contact-intro-panels');const blocks=notes.querySelectorAll('.aside-copy-block');blocks.forEach((block,n)=>{block.querySelector('.contact-intro-label')?.remove();block.prepend(el('h4','contact-intro-label',[['Euer Shooting','Wünsche & Termine'],['Your session','Requests & appointments'],['Vaše fotografisanje','Želje i termini']][i][n]));});}
 }
 if(about){
  d.querySelectorAll('#process,#services').forEach(e=>e.remove());
  const faq=d.querySelector('.faq-grid')?.closest('section');
  if(faq){const template=d.createElement('template');template.innerHTML=sections[lang];faq.after(template.content);}
 }
 d.querySelectorAll('header .price-dropdown > a').forEach(a=>a.setAttribute('href',local('index.html')+'#pricing'));
 d.querySelectorAll('.footer-secondary-links').forEach(footer=>{let a=footer.querySelector('[data-partner-link]');if(!a){a=d.createElement('a');a.setAttribute('data-partner-link','');footer.prepend(a);}a.href='partner/'+(lang==='de'?'':lang+'.html');a.textContent=['Flyer & Partner','Flyer & Partners','Letak i partneri'][i];});
 // Keep navigation to the relocated content valid on every language page.
 for(const a of d.querySelectorAll('a[href]')){const raw=a.getAttribute('href');try{const url=new URL(raw,'https://liza-memories-photography.com/'+file);if(url.origin!=='https://liza-memories-photography.com')continue;if(['#services','#process'].includes(url.hash)&&/^\/(?:index(?:-(?:en|bs))?\.html)?$/.test(url.pathname))a.href=local('ueber-mich.html')+url.hash;if(url.hash==='#editorial-moments')a.href=local('index.html')+'#portfolio';}catch{}}
 if(base==='familienfotografie-graz.html')d.body.classList.add('family-mobile-focus');
 d.body.classList.remove('desktop-full-hero');
 if(['familienfotografie-graz.html','babybauch-shooting-graz.html'].includes(base)){
  const img=d.querySelector('.hero-visual img');
  let picture=img.closest('picture');if(!picture){picture=d.createElement('picture');img.before(picture);picture.append(img);}
  picture.querySelectorAll('source[data-desktop-hero]').forEach(e=>e.remove());
  const source=d.createElement('source');source.dataset.desktopHero='';source.media='(min-width: 901px)';source.type='image/webp';source.srcset=base==='babybauch-shooting-graz.html'?'galerie-babybauch-dsc01322.webp':'portfolio-familie-18-20260906.webp';picture.prepend(source);
 }

 if(base==='preise.html'){const p=d.querySelector('.price-note p');if(p){const text=p.textContent,cut=text.indexOf('. ');if(cut>=0){const first=['Zusatzbild: 15 € pro Bild.','Extra photo: €15 per image.','Dodatna fotografija: 15 €.'][i],rest=text.slice(cut+2);p.replaceChildren(el('span','extra-image-sentence',first),el('span','extra-image-bundles',rest));}}}
 if(about||base==='preise.html'){
  d.querySelectorAll('.partner-context-link').forEach(e=>e.remove());
  const note=el('p','container partner-context-link');
  const a=el('a','');a.href='partner/'+(lang==='de'?'':lang+'.html');
  if(about){a.textContent=['Meine Kooperationspartner kennenlernen','Meet my cooperation partners','Upoznajte moje partnere'][i];note.append(a);d.querySelector('.faq-grid')?.after(note);}
  else{note.append(d.createTextNode(['Ihr habt einen Partnercode? ','Have a partner code? ','Imate partnerski kod? '][i]));a.textContent=['Entdeckt euren 10-%-Partnervorteil.','Discover your 10% partner benefit.','Otkrijte svoju partnersku pogodnost od 10%.'][i];note.append(a);d.querySelector('.price-note-grid')?.after(note);}
 }
 if(home||about||base==='preise.html'||base==='familienfotografie-graz.html'||base==='babybauch-shooting-graz.html'){
  let css=d.querySelector('link[data-home-layout]');if(!css){css=el('link','');css.rel='stylesheet';css.dataset.homeLayout='';d.head.append(css);}css.href='scripts/home-about-layout.css?v=20260913f';d.head.append(css);
 }
}
