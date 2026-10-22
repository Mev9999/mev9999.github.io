import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';

// One idempotent integration pass, also used after the existing page generators.
// Only run inside the working copy that should receive the new service.
const copy = {
  de: {
    service: 'Krippen- & Kindergartenfotografie', short: 'Krippe & Kindergarten', gallery: 'Kinderfotos · Einblicke',
    title: 'Kleine Persönlichkeiten. Große Erinnerungen.',
    text: 'Ein entspannter Fototag in eurer Krippe oder eurem Kindergarten. Eltern wählen die Bilder ihres Kindes in einer persönlichen Galerie aus und erhalten ihre Lieblingsbilder als Download.',
    more: 'Ablauf & Bilder ansehen', inquire: 'Fototag unverbindlich anfragen', prices: 'Digitale Bilder & Preise',
    one: 'Ein Bild', three: 'Drei Bilder', detail: 'Einzelporträts und verfügbare Gruppenbilder frei kombinieren. Je drei Bilder kosten 25 €, weitere Einzelbilder jeweils 10 €.',
    examples: 'Zum Beispiel: 2 Bilder 20 € · 4 Bilder 35 € · 6 Bilder 50 €.',
    scope: 'Bis zu drei unterschiedliche Einzelporträts pro Kind, dazu vereinbarte Gruppenbilder, auf denen das eigene Kind zu sehen ist. Die Auswahl hängt davon ab, welche Aufnahmen am Fototag entstehen.',
    digital: 'Fertig bearbeitet · hohe Auflösung · selbst ausdrucken', family: 'Persönliche Familiengalerie', institution: 'Bestellung direkt bei Emina',
    note: 'Diese Bildpreise gelten für organisierte Fototage in Krippen und Kindergärten. Der Termin und mögliche Kosten der Einrichtung werden vorab vereinbart. Eltern bestellen freiwillig.',
    extras: 'Die Zusatzbildpreise dieser Übersicht betreffen die regulären Shootings. Für Krippen- und Kindergartenfototage gelten die eigenen Bildpreise oben.',
    contact: 'Ihr plant einen Fototag in einer Krippe oder einem Kindergarten?',
    contactAction: 'Alle Informationen für eure Einrichtung',
    faq: 'Krippe & Kindergarten',
    about: 'Mein Schwerpunkt liegt auf Babybauch-, Neugeborenen- und Familienfotografie. Auch Porträt- und Produktfotografie gehören zu meinem Angebot. Zusätzlich begleite ich standesamtliche Trauungen, Hochzeiten und Feiern. Für Krippen und Kindergärten biete ich liebevoll begleitete Fototage mit persönlicher Onlinegalerie an. Immobilien- und Mitarbeiterfotografie sind ebenfalls auf Anfrage möglich.',
    photoAlt: 'Kinderporträt mit einer kleinen Blume aus Eminas Familienfotografie'
  },
  en: {
    service: 'Nursery & kindergarten photography', short: 'Nursery & kindergarten', gallery: 'Children’s photos · Examples',
    title: 'Little personalities. Lasting memories.',
    text: 'A relaxed photo day at your nursery or kindergarten. Parents choose photographs of their child in a personal gallery and receive their favourites as downloads.',
    more: 'See the process & photos', inquire: 'Enquire about a photo day', prices: 'Digital images & prices',
    one: 'One image', three: 'Three images', detail: 'Mix individual portraits and available group photos. Each set of three images costs €25; additional individual images cost €10 each.',
    examples: 'For example: 2 images €20 · 4 images €35 · 6 images €50.',
    scope: 'Up to three different individual portraits per child, plus agreed group photographs featuring your own child. The selection depends on the photographs created on the day.',
    digital: 'Carefully edited · high resolution · print yourself', family: 'Personal family gallery', institution: 'Order directly with Emina',
    note: 'These image prices apply to organised nursery and kindergarten photo days. The date and any charges to the institution are agreed in advance. Parents are free to decide whether to buy.',
    extras: 'The additional-image rates in this overview apply to regular sessions. Nursery and kindergarten photo days have their own image prices above.',
    contact: 'Planning a photo day for your nursery or kindergarten?', contactAction: 'Information for your institution', faq: 'Nursery & kindergarten',
    about: 'My focus is on maternity, newborn and family photography. I also offer portrait and product photography, and cover civil ceremonies, weddings and celebrations. For nurseries and kindergartens I offer gently guided photo days with personal online galleries. Property and staff photography is also available on request.',
    photoAlt: 'Child holding a small flower in a portrait from Emina’s family photography'
  },
  bs: {
    service: 'Fotografisanje u jaslicama i vrtiću', short: 'Jaslice i vrtić', gallery: 'Dječije fotografije · Primjeri',
    title: 'Male ličnosti. Velike uspomene.',
    text: 'Opušten dan fotografisanja u vašim jaslicama ili vrtiću. Roditelji biraju fotografije svog djeteta u ličnoj galeriji i preuzimaju omiljene fotografije u digitalnom obliku.',
    more: 'Pogledajte tok i fotografije', inquire: 'Pošaljite neobavezujući upit', prices: 'Digitalne fotografije i cijene',
    one: 'Jedna fotografija', three: 'Tri fotografije', detail: 'Slobodno kombinujte pojedinačne portrete i dostupne grupne fotografije. Svake tri fotografije koštaju 25 €, a dodatne pojedinačne fotografije po 10 €.',
    examples: 'Na primjer: 2 fotografije 20 € · 4 fotografije 35 € · 6 fotografija 50 €.',
    scope: 'Do tri različita pojedinačna portreta po djetetu, uz dogovorene grupne fotografije na kojima se nalazi vaše dijete. Izbor zavisi od fotografija nastalih na dan fotografisanja.',
    digital: 'Pažljivo obrađene · visoka rezolucija · samostalna štampa', family: 'Lična porodična galerija', institution: 'Narudžbe direktno kod Emine',
    note: 'Ove cijene važe za organizovane dane fotografisanja u jaslicama i vrtićima. Termin i eventualni troškovi ustanove dogovaraju se unaprijed. Roditelji slobodno odlučuju o kupovini.',
    extras: 'Cijene dodatnih fotografija u ovom pregledu važe za redovna fotografisanja. Za jaslice i vrtiće važe posebne cijene fotografija navedene iznad.',
    contact: 'Planirate fotografisanje u jaslicama ili vrtiću?', contactAction: 'Informacije za vašu ustanovu', faq: 'Jaslice i vrtić',
    about: 'Moj fokus je na fotografisanju trudnica, novorođenčadi i porodica. Nudim i fotografisanje portreta i proizvoda te pratim građanska vjenčanja, svadbe i proslave. Za jaslice i vrtiće nudim pažljivo vođene dane fotografisanja s ličnim online galerijama. Fotografisanje nekretnina i zaposlenih moguće je na upit.',
    photoAlt: 'Dječiji portret s malim cvijetom iz Eminog porodičnog fotografisanja'
  }
};
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const imageAttributes = (base, width, height, sizes, prefix='') => {
  const src = `${prefix}${base}.webp`;
  const candidates = [320,480,640,800,960,1200].filter(size=>size<width).map(size=>`${prefix}responsive/${base}-${size}w.webp ${size}w`);
  candidates.push(`${src} ${width}w`);
  return `src="${src}" width="${width}" height="${height}" srcset="${candidates.join(', ')}" sizes="${sizes}" data-responsive-sizes="${sizes}"`;
};
const langOf = file => /(?:-en|\/en)\.html$/.test(file) ? 'en' : /(?:-bs|\/bs)\.html$/.test(file) ? 'bs' : 'de';
const suffix = (file,lang) => lang === 'de' ? file : file.replace(/\.html$/, `-${lang}.html`);

export function integrateKindergarten(document, file, available = new Set()) {
  const lang = langOf(file), t = copy[lang], nested = file.includes('/'), prefix = nested ? '../' : '';
  const variant = suffix('kindergartenfotografie-graz.html',lang);
  const landing = prefix + (available.has(variant) ? variant : 'kindergartenfotografie-graz.html');
  const pricesPage = prefix + suffix('preise.html',lang);
  const base = path.posix.basename(file).replace(/-(en|bs)\.html$/,'.html');
  const el = (tag, cls, text) => { const n=document.createElement(tag); if(cls)n.className=cls; if(text)n.textContent=text; return n; };
  const a = (href, text, cls='') => { const n=el('a',cls,text); n.setAttribute('href',href); return n; };
  const linkFor = (kind) => kind==='services' ? [landing,t.service] : kind==='portfolio' ? [landing+'#gallery-showcase',t.gallery] : kind==='price' ? [pricesPage+'#kindergarten',t.short] : [landing+'#faq',t.faq];

  for(const kind of ['services','portfolio','price','faq']) {
    const drop=document.querySelector(`.${kind}-dropdown`); if(!drop)continue;
    const [href,label]=linkFor(kind);
    drop.querySelectorAll('[data-kindergarten-link],[data-service-key="kindergarten"],a[href*="kindergartenfotografie-graz"],a[href$="#kindergarten"]').forEach(n=>n.remove());
    const link=a(href,label);link.dataset.kindergartenLink=kind;
    if(kind==='services')link.dataset.serviceKey='kindergarten';
    drop.querySelector('.nav-dropdown-menu')?.append(link);
    const id=`mobile-${kind}-kindergarten`;
    document.getElementById(id)?.remove();
    const mobile=a(href,label,`${kind==='services'?'service':kind}-page-link mobile-group-link`);mobile.id=id;mobile.dataset.kindergartenLink=kind;
    let last=drop;while(last.nextElementSibling?.classList.contains('mobile-group-link'))last=last.nextElementSibling;
    last.after(mobile);
    const toggle=drop.querySelector('.mobile-submenu-toggle');
    if(toggle)toggle.setAttribute('aria-controls',[...(toggle.getAttribute('aria-controls')||'').split(/\s+/).filter(Boolean).filter(x=>x!==id),id].join(' '));
  }
  const footer=document.querySelector('.footer-primary-links');
  if(footer){footer.querySelectorAll('[data-service-key="kindergarten"],a[href*="kindergartenfotografie-graz"]').forEach(n=>n.remove()); const n=a(landing,t.service);n.dataset.serviceKey='kindergarten';footer.append(n);}
  document.querySelectorAll('.contact-detail').forEach(card=>{
    const span=card.querySelector('span');
    if(!span?.querySelector('a[href*="portraitfotografie-graz"],a[href*="babybauch-shooting-graz"]') || span.querySelector('[data-kindergarten-link]'))return;
    span.append(document.createTextNode(' · '));const n=a(landing,t.service);n.dataset.kindergartenLink='contact';span.append(n);
  });
  document.querySelectorAll('.core-service-links,.shooting-service-links').forEach(paths=>{
    paths.querySelectorAll('[data-kindergarten-link]').forEach(n=>n.remove());const n=a(landing,'');n.dataset.kindergartenLink='core';
    n.innerHTML=`<span class="desktop-link-label">${escape(t.service)}</span><span class="mobile-link-label">${escape(t.short)}</span>`;paths.append(n);
  });
  const select=document.querySelector('#contact-form-card select[name="service"]');
  if(select){let option=select.querySelector('option[value="Krippe / Kindergarten"]');if(!option){option=el('option');option.value='Krippe / Kindergarten';select.append(option);}option.textContent=t.service;option.dataset.i18n='opt_kindergarten';}
  const faqLinks=document.querySelector('.faq-links');
  if(faqLinks&&!faqLinks.querySelector('[data-kindergarten-link]')){const n=a(landing+'#faq',t.faq);n.dataset.kindergartenLink='faq';faqLinks.append(n);}

  if(base==='ueber-mich.html') {
    const grid=document.querySelector('.signature-grid');
    grid?.querySelector('.kindergarten-service-card')?.remove();
    if(grid){const card=a(landing,'','signature-card kindergarten-service-card');card.innerHTML=`<img ${imageAttributes('galerie-familie-dsc02524',1425,1900,'(max-width: 700px) calc(100vw - 88px), (max-width: 1000px) 30vw, 300px',prefix)} loading="lazy" decoding="async" alt="${escape(t.photoAlt)}"><div class="kindergarten-service-copy"><span class="signature-kicker">${escape(t.service)}</span><h3>${escape(t.title)}</h3><p>${escape(t.text)}</p><div class="signature-meta"><span>${escape(t.family)}</span><span>${escape(t.institution)}</span></div><span class="signature-arrow">${escape(t.more)} →</span></div>`;grid.append(card);}
    document.querySelectorAll('.faq-answer p').forEach(p=>{if(/Mein Schwerpunkt|My focus is on|Moj fokus/.test(p.textContent))p.textContent=t.about;});
  }
  if(base==='index.html') {
    const intro=document.querySelector('[data-i18n="pricing_fast_new"]');if(intro)intro.textContent={de:'Eure Shootingpakete und die digitalen Bildpreise für Krippe und Kindergarten im Überblick. Über die jeweilige Leistung findet ihr alle Details.',en:'An overview of our session packages and digital image prices for nursery and kindergarten photo days. Open the relevant service for all details.',bs:'Pregled paketa fotografisanja i cijena digitalnih fotografija za jaslice i vrtić. Sve detalje pronaći ćete uz odgovarajuću uslugu.'}[lang];
    document.getElementById('kindergarten-feature')?.remove();
    const feature=el('section','kindergarten-home-feature');feature.id='kindergarten-feature';
    feature.innerHTML=`<div class="container"><div class="kindergarten-feature-card"><img ${imageAttributes('galerie-familie-dsc02410-2',1600,1657,'(max-width: 700px) calc(100vw - 88px), (max-width: 1200px) 36vw, 400px')} alt="${escape(lang==='de'?'Kinderporträt mit Seifenblasen aus meiner Familienfotografie':lang==='en'?'Child with soap bubbles from my family photography':'Dječiji portret s balončićima iz mog porodičnog fotografisanja')}" loading="lazy" decoding="async"><div><span class="kindergarten-eyebrow">${escape(t.service)}</span><h2>${escape(t.title)}</h2><p>${escape(t.text)}</p><div class="kindergarten-feature-actions"><a class="btn brand" href="${landing}">${escape(t.more)}</a><a class="kindergarten-text-link" href="${landing}#anfrage">${escape(t.inquire)} →</a></div></div></div></div>`;
    const anchor=document.getElementById('shooting-video')||document.getElementById('pricing');anchor?.before(feature);
    document.querySelector('#pricing .kindergarten-price-feature')?.remove();
    document.querySelector('#pricing .pricing')?.insertAdjacentHTML('beforeend',`<article class="card price kindergarten-price-feature"><div><span class="chip">${escape(t.service)}</span><h3>${escape(t.prices)}</h3><p>${escape(t.detail)}</p><p class="kindergarten-price-examples">${escape(t.examples)}</p></div><div class="kindergarten-price-actions"><div class="kindergarten-price-pair"><span><strong>10 €</strong>${escape(t.one)}</span><span><strong>25 €</strong>${escape(t.three)}</span></div><a class="btn brand" href="${landing}#preise">${escape(t.prices)}</a></div></article>`);
    document.querySelector('#direct-contact-card .kindergarten-contact-link')?.remove();
    const contact=document.querySelector('#direct-contact-card .aside-top');if(contact)contact.insertAdjacentHTML('beforeend',`<div class="aside-copy-block kindergarten-contact-link"><h4 class="contact-intro-label">${escape(t.short)}</h4><p>${escape(t.contact)}</p><a href="${landing}">${escape(t.contactAction)} →</a></div>`);
    document.querySelector('.price-extras .kindergarten-extras-note')?.remove();
    document.querySelector('.price-extras')?.insertAdjacentHTML('beforeend',`<p class="kindergarten-extras-note">${escape(t.extras)}</p>`);
  }
  if(base==='preise.html') {
    const lead=document.querySelector('.pricing-hero .lead');if(lead)lead.textContent={de:'Vergleicht die Pakete für euer persönliches Shooting oder entdeckt die digitalen Bildpreise für organisierte Fototage in Krippen und Kindergärten. Alle Leistungen und Preise findet ihr hier im Überblick.',en:'Compare packages for your personal session or explore digital image prices for organised nursery and kindergarten photo days. Find all inclusions and prices below.',bs:'Uporedite pakete za svoje fotografisanje ili pogledajte cijene digitalnih fotografija za organizovane dane fotografisanja u jaslicama i vrtićima. Sve usluge i cijene pronaći ćete u nastavku.'}[lang];
    document.querySelectorAll('[data-kindergarten-pricing]').forEach(n=>n.remove());
    document.querySelector('.price-overview')?.insertAdjacentHTML('beforeend',`<article class="price-overview-card kindergarten-overview" data-kindergarten-pricing><span class="label">${escape(t.one)}</span><h3>${escape(t.service)}</h3><div class="num">10 €</div><a href="#kindergarten">${escape(t.prices)} →</a></article>`);
    const jump=a('#kindergarten',t.short);jump.dataset.kindergartenPricing='';document.querySelector('.price-jump')?.append(jump);
    const section=el('section','package-section kindergarten-package-section');section.id='kindergarten';section.dataset.kindergartenPricing='';
    section.innerHTML=`<div class="container"><div class="package-section-head"><div><h2>${escape(t.service)}</h2><p>${escape(t.detail)}</p><a class="service-detail-link" href="${landing}">${escape(t.more)} →</a></div></div><div class="kindergarten-price-grid"><article class="package-card"><span class="package-tier">${escape(t.one)}</span><div class="num">10 €</div><p>${escape(t.digital)}</p></article><article class="package-card"><span class="package-tier">${escape(t.three)}</span><div class="num">25 €</div><p>${escape(t.digital)}</p></article></div><p class="kindergarten-price-examples">${escape(t.examples)}</p><p>${escape(t.scope)}</p><p class="kindergarten-price-note">${escape(t.note)}</p><a class="btn primary" href="${landing}#anfrage">${escape(t.inquire)}</a></div>`;
    document.querySelector('.price-notes')?.before(section);
    document.querySelector('.price-notes .kindergarten-extras-note')?.remove();document.querySelector('.price-notes .section-head')?.insertAdjacentHTML('beforeend',`<p class="kindergarten-extras-note">${escape(t.extras)}</p>`);
    const schema=document.querySelector('script[data-schema-key="primary"]');
    if(schema){try{const data=JSON.parse(schema.textContent);if(data['@type']==='OfferCatalog'){data.itemListElement=data.itemListElement.filter(x=>x.identifier!=='kindergarten');data.itemListElement.push({'@type':'OfferCatalog',identifier:'kindergarten',name:t.service,itemListElement:[{'@type':'Offer',name:t.one,price:10,priceCurrency:'EUR',url:'https://liza-memories-photography.com/'+suffix('preise.html',lang)+'#kindergarten'},{'@type':'Offer',name:t.three,price:25,priceCurrency:'EUR',url:'https://liza-memories-photography.com/'+suffix('preise.html',lang)+'#kindergarten'}]});schema.textContent=JSON.stringify(data);}}catch{}}
  }
  if(!document.querySelector('link[href*="kindergarten-integrations.css"]')) {const css=el('link');css.rel='stylesheet';css.href=prefix+'scripts/kindergarten-integrations.css?v=20261021';document.head.append(css);}
}

export async function applyKindergartenIntegrations(root=process.cwd(),{includeLanding=false}={}) {
  const rootFiles=(await fs.readdir(root)).filter(f=>f.endsWith('.html'));
  const available=new Set(rootFiles);
  const files=rootFiles.filter(f=>includeLanding||!f.startsWith('kindergartenfotografie-graz'));
  for(const folder of ['partner']) {try{for(const file of await fs.readdir(path.join(root,folder)))if(file.endsWith('.html'))files.push(folder+'/'+file);}catch{}}
  for(const file of files){const target=path.join(root,file),source=await fs.readFile(target,'utf8'),dom=new JSDOM(source.trimEnd());integrateKindergarten(dom.window.document,file,available);const output='<!DOCTYPE html>\n'+dom.window.document.documentElement.outerHTML+'\n';if(output!==source)await fs.writeFile(target,output);dom.window.close();}
  return files.length;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)console.log('Kindergarten integrations:',await applyKindergartenIntegrations(process.cwd(),{includeLanding:process.argv.includes('--include-landing')}),'pages');
