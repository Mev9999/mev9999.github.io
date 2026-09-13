import fs from 'node:fs';
const sections=JSON.parse(fs.readFileSync(new URL('./about-moved-sections.json',import.meta.url),'utf8'));
export function updateHomeAboutLayout(d,file){
 const lang=file.match(/-(en|bs)\.html$/)?.[1]||'de',i=['de','en','bs'].indexOf(lang),base=file.replace(/-(en|bs)\.html$/,'.html'),home=base==='index.html',about=base==='ueber-mich.html';
 const local=f=>lang==='de'?f:f.replace('.html',`-${lang}.html`);
 const el=(tag,cls,text)=>{const e=d.createElement(tag);e.className=cls;if(text)e.textContent=text;return e;};
 if(home){
  d.querySelectorAll('#editorial-moments,#process,#services').forEach(e=>e.remove());
  const lead=d.querySelector('.hero .lead');lead.textContent=['Vom Babybauch über die ersten Babyfotos bis zu euren Familienfotos begleite ich euch und halte eure besonderen Momente liebevoll, emotional und zeitlos fest.','From maternity portraits and your baby’s first photos to family photographs, I’m here to capture your special moments with warmth, emotion and a timeless feel.','Od trudničkih fotografija i prvih fotografija vaše bebe do porodičnih fotografija, pratim vas i bilježim vaše posebne trenutke s ljubavlju, emocijom i bezvremenskim stilom.'][i];lead.removeAttribute('data-i18n');
  const portfolio=d.querySelector('[data-i18n=portfolio_sub],[data-layout-key=portfolio_sub]');if(portfolio){portfolio.textContent=['Eine Auswahl aus Babybauchfotos, Neugeborenenbildern und Familienfotos.','A selection of maternity, newborn and family photos.','Izbor trudničkih fotografija, fotografija novorođenčadi i porodičnih fotografija.'][i];portfolio.removeAttribute('data-i18n');portfolio.dataset.layoutKey='portfolio_sub';}
  const address=d.querySelector('[data-refresh-key=hero_proof_value_1]');if(address){const lines=address.textContent.split('\n');address.replaceChildren();const desktop=el('span','desktop-address',lines.shift()),mobile=el('span','mobile-address','Mela-Spira-Str. 32b · 8054 Graz-Straßgang');address.append(desktop,mobile,d.createTextNode('\n'+lines.join('\n')));}
  const links=d.querySelector('.shooting-service-links');if(links){links.classList.add('compact-home-links');const labels=[['Babybauchshooting','Neugeborenenshooting','Familienshooting','Hochzeitsshooting'],['Maternity session','Newborn session','Family session','Wedding photography'],['Trudničko fotografisanje','Fotografisanje beba','Porodično fotografisanje','Fotografisanje vjenčanja']][i];[...links.children].forEach((a,n)=>{const full=el('span','desktop-link-label',a.textContent),short=el('span','mobile-link-label',labels[n]);a.replaceChildren(full,short);});}
  const notes=d.querySelector('.aside-top');if(notes){notes.classList.add('contact-intro-panels');const blocks=notes.querySelectorAll('.aside-copy-block');blocks.forEach((block,n)=>{block.querySelector('.contact-intro-label')?.remove();block.prepend(el('h4','contact-intro-label',[['Euer Shooting','Wünsche & Termine'],['Your session','Requests & appointments'],['Vaše fotografisanje','Želje i termini']][i][n]));});}
 }
 if(about){
  d.querySelectorAll('#process,#services').forEach(e=>e.remove());
  const faq=d.querySelector('.faq-grid')?.closest('section');
  if(faq){const template=d.createElement('template');template.innerHTML=sections[lang];faq.after(template.content);}
 }
 // Keep navigation to the relocated content valid on every language page.
 for(const a of d.querySelectorAll('a[href]')){const raw=a.getAttribute('href');try{const url=new URL(raw,'https://liza-memories-photography.com/'+file);if(url.origin!=='https://liza-memories-photography.com')continue;if(['#services','#process'].includes(url.hash)&&/^\/(?:index(?:-(?:en|bs))?\.html)?$/.test(url.pathname))a.href=local('ueber-mich.html')+url.hash;if(url.hash==='#editorial-moments')a.href=local('index.html')+'#portfolio';}catch{}}
 if(base==='familienfotografie-graz.html')d.body.classList.add('family-mobile-focus');
 if(['familienfotografie-graz.html','babybauch-shooting-graz.html'].includes(base))d.body.classList.add('desktop-full-hero');
 if(base==='preise.html'){const p=d.querySelector('.price-note p');if(p){const text=p.textContent,cut=text.indexOf('. ');if(cut>=0){const first=text.slice(0,cut+1),rest=text.slice(cut+2);p.replaceChildren(el('span','extra-image-sentence',first),el('span','extra-image-bundles',rest));}}}
 if(home||about||base==='preise.html'||base==='familienfotografie-graz.html'||base==='babybauch-shooting-graz.html'){
  let css=d.querySelector('link[data-home-layout]');if(!css){css=el('link','');css.rel='stylesheet';css.dataset.homeLayout='';d.head.append(css);}css.href='scripts/home-about-layout.css?v=20260913b';d.head.append(css);
 }
}
