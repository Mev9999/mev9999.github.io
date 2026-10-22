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
    more: 'Ablauf & Bilder ansehen', learnMore: 'Mehr erfahren', moreService: 'Mehr zur Leistung', inquire: 'Fototag unverbindlich anfragen', prices: 'Digitale Bilder & Preise',
    singleTitle: 'Ein Lieblingsmoment', bundleTitle: 'Drei Lieblingsmomente', combine: 'Einfach kombinieren', combineLabel: 'So rechnet es sich',
    oneReady: 'Eine fertig bearbeitete digitale Datei', threeReady: 'Drei fertig bearbeitete digitale Dateien', mix: 'Porträts und Gruppenbilder frei kombinieren', ownPrints: 'Hohe Auflösung für eigene Ausdrucke',
    combinations: ['2 Bilder · 20 €', '4 Bilder · 35 €', '6 Bilder · 50 €'], combineNote: 'Je drei Bilder kosten 25 €. Einzelne übrige Bilder kosten jeweils 10 €.',
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
    more: 'See the process & photos', learnMore: 'Learn more', moreService: 'More about this service', inquire: 'Enquire about a photo day', prices: 'Digital images & prices',
    singleTitle: 'One favourite moment', bundleTitle: 'Three favourite moments', combine: 'Mix and match', combineLabel: 'How it adds up',
    oneReady: 'One carefully edited digital file', threeReady: 'Three carefully edited digital files', mix: 'Mix individual portraits and group photos', ownPrints: 'High resolution for your own prints',
    combinations: ['2 images · €20', '4 images · €35', '6 images · €50'], combineNote: 'Every three images cost €25. Each remaining individual image costs €10.',
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
    more: 'Pogledajte tok i fotografije', learnMore: 'Saznajte više', moreService: 'Više o usluzi', inquire: 'Pošaljite neobavezujući upit', prices: 'Digitalne fotografije i cijene',
    singleTitle: 'Jedan omiljeni trenutak', bundleTitle: 'Tri omiljena trenutka', combine: 'Slobodno kombinujte', combineLabel: 'Kako se računa cijena',
    oneReady: 'Jedna pažljivo obrađena digitalna datoteka', threeReady: 'Tri pažljivo obrađene digitalne datoteke', mix: 'Kombinujte portrete i grupne fotografije', ownPrints: 'Visoka rezolucija za vlastitu štampu',
    combinations: ['2 fotografije · 20 €', '4 fotografije · 35 €', '6 fotografija · 50 €'], combineNote: 'Svake tri fotografije koštaju 25 €. Svaka preostala pojedinačna fotografija košta 10 €.',
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
  const linkFor = (kind) => kind==='services' ? [landing,t.service] : kind==='portfolio' ? [landing+'#gallery-showcase',t.short] : kind==='price' ? [pricesPage+'#kindergarten',t.short] : [landing+'#faq',t.faq];
  const isKindergartenLink = (node,kind) => {
    if(node.hasAttribute('data-kindergarten-link')||node.dataset.serviceKey==='kindergarten')return true;
    let url;try{url=new URL(node.getAttribute('href')||'',`https://liza-memories-photography.com/${file}`);}catch{return false;}
    if(url.origin!=='https://liza-memories-photography.com')return false;
    const target=path.posix.basename(url.pathname).replace(/-(en|bs)\.html$/,'.html');
    if(target==='kindergartenfotografie-graz.html'){
      if(kind==='services')return !url.hash;
      if(kind==='portfolio')return url.hash==='#gallery-showcase';
      if(kind==='faq')return url.hash==='#faq';
      if(kind==='price')return url.hash==='#preise';
    }
    return kind==='price'&&target==='preise.html'&&url.hash==='#kindergarten';
  };

  for(const kind of ['services','portfolio','price','faq']) {
    const drop=document.querySelector(`.${kind}-dropdown`); if(!drop)continue;
    const [href,label]=linkFor(kind);
    drop.querySelectorAll('.nav-dropdown-menu a').forEach(n=>{if(isKindergartenLink(n,kind))n.remove();});
    const link=a(href,label);link.dataset.kindergartenLink=kind;
    if(kind==='services')link.dataset.serviceKey='kindergarten';
    drop.querySelector('.nav-dropdown-menu')?.append(link);
    const id=`mobile-${kind}-kindergarten`;
    const mobileClass=`${kind==='services'?'service':kind}-page-link`;
    document.querySelectorAll(`a.mobile-group-link.${mobileClass}`).forEach(n=>{if(isKindergartenLink(n,kind))n.remove();});
    document.getElementById(id)?.remove();
    document.getElementById(`mobile-${kind}-kita`)?.remove();
    const mobile=a(href,label,`${mobileClass} mobile-group-link`);mobile.id=id;mobile.dataset.kindergartenLink=kind;
    let last=drop;while(last.nextElementSibling?.classList.contains('mobile-group-link'))last=last.nextElementSibling;
    last.after(mobile);
    const toggle=drop.querySelector('.mobile-submenu-toggle');
    if(toggle)toggle.setAttribute('aria-controls',[...(toggle.getAttribute('aria-controls')||'').split(/\s+/).filter(x=>x&&x!==id&&document.getElementById(x)),id].join(' '));
  }
  const footer=document.querySelector('.footer-primary-links');
  if(footer){
    footer.classList.add('kindergarten-footer-links');
    footer.querySelectorAll('a').forEach(n=>{if(isKindergartenLink(n,'services'))n.remove();});
    const n=a(landing,t.short);n.dataset.serviceKey='kindergarten';footer.append(n);
    const order=['babybauch-shooting-graz','newborn-fotografie-graz','babybauch-und-neugeborenen-shooting-graz','familienfotografie-graz','hochzeitsfotograf-graz','portraitfotografie-graz','kindergartenfotografie-graz'];
    const links=[...footer.querySelectorAll('a')].sort((left,right)=>order.findIndex(key=>left.getAttribute('href').includes(key))-order.findIndex(key=>right.getAttribute('href').includes(key)));
    footer.replaceChildren(...links);
  }
  document.querySelectorAll('.contact-detail').forEach(card=>{
    const span=card.querySelector('span');
    if(!span?.querySelector('a[href*="portraitfotografie-graz"],a[href*="babybauch-shooting-graz"]'))return;
    span.querySelectorAll('a').forEach(n=>{if(isKindergartenLink(n,'services'))n.remove();});
    const n=a(landing,t.service);n.dataset.kindergartenLink='contact';
    const links=[...span.querySelectorAll('a'),n];
    const order=['babybauch-shooting-graz','newborn-fotografie-graz','familienfotografie-graz','hochzeitsfotograf-graz','portraitfotografie-graz','babybauch-und-neugeborenen-shooting-graz','kindergartenfotografie-graz'];
    links.sort((left,right)=>order.findIndex(key=>left.getAttribute('href').includes(key))-order.findIndex(key=>right.getAttribute('href').includes(key)));
    span.replaceChildren(...links);
  });
  document.querySelectorAll('.core-service-links,.shooting-service-links').forEach(paths=>{
    paths.querySelectorAll('[data-kindergarten-link]').forEach(n=>n.remove());const n=a(landing,'');n.dataset.kindergartenLink='core';
    n.innerHTML=`<span class="desktop-link-label">${escape(t.service)}</span><span class="mobile-link-label">${escape(t.short)}</span>`;paths.append(n);
  });
  const select=document.querySelector('#contact-form-card select[name="service"]');
  if(select){let option=select.querySelector('option[value="Krippe / Kindergarten"]');if(!option){option=el('option');option.value='Krippe / Kindergarten';select.append(option);}option.textContent=t.service;option.dataset.i18n='opt_kindergarten';}
  document.querySelectorAll('.faq-links,.faq-topic-links').forEach(faqLinks=>{
    faqLinks.querySelectorAll('a').forEach(n=>{if(isKindergartenLink(n,'faq'))n.remove();});
    const n=a(landing+'#faq',t.faq);n.dataset.kindergartenLink='faq';faqLinks.append(n);
  });

  if(base==='ueber-mich.html') {
    const grid=document.querySelector('.signature-grid');
    grid?.querySelector('.kindergarten-service-card')?.remove();
    if(grid){const card=a(landing,'','signature-card kindergarten-service-card');card.innerHTML=`<span class="signature-kicker">${escape(t.service)}</span><h3>${escape(t.title)}</h3><p>${escape(t.text)}</p><div class="signature-meta"><span>${escape(t.family)}</span><span>${escape(t.institution)}</span></div><div class="signature-arrow">${escape(t.learnMore)}</div>`;grid.append(card);}
    document.querySelectorAll('.faq-answer p').forEach(p=>{if(/Mein Schwerpunkt|My focus is on|Moj fokus/.test(p.textContent))p.textContent=t.about;});
  }
  if(base==='index.html') {
    const intro=document.querySelector('[data-i18n="pricing_fast_new"]');if(intro)intro.textContent={de:'Eure Shootingpakete und die digitalen Bildpreise für Krippe und Kindergarten im Überblick. Über die jeweilige Leistung findet ihr alle Details.',en:'An overview of our session packages and digital image prices for nursery and kindergarten photo days. Open the relevant service for all details.',bs:'Pregled paketa fotografisanja i cijena digitalnih fotografija za jaslice i vrtić. Sve detalje pronaći ćete uz odgovarajuću uslugu.'}[lang];
    document.getElementById('kindergarten-feature')?.remove();
    document.querySelector('#pricing .kindergarten-price-feature')?.remove();
    document.querySelector('#pricing .pricing')?.insertAdjacentHTML('beforeend',`<article class="card price kindergarten-price-feature"><div><span class="chip">${escape(t.service)}</span><h3>${escape(t.prices)}</h3><p>${escape(t.detail)}</p><p class="kindergarten-price-examples">${escape(t.examples)}</p></div><div class="kindergarten-price-actions"><div class="kindergarten-price-pair"><span><strong>10 €</strong>${escape(t.one)}</span><span><strong>25 €</strong>${escape(t.three)}</span></div><div class="price-links"><a class="btn brand" href="${landing}#preise">${escape(t.prices)}</a><a class="price-more" href="${landing}">${escape(t.moreService)}</a></div></div></article>`);
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
    section.innerHTML=`<div class="container"><div class="package-section-head"><div><h2>${escape(t.service)}</h2><p>${escape(t.detail)}</p><a class="service-detail-link" href="${landing}">${escape(t.moreService)} →</a></div></div><div class="package-grid kindergarten-price-grid"><article class="package-card package-card--bronze"><span class="package-tier">${escape(t.one)}</span><h3>${escape(t.singleTitle)}</h3><div class="num">10 €</div><ul class="package-details"><li>${escape(t.oneReady)}</li><li>${escape(t.mix)}</li><li>${escape(t.ownPrints)}</li></ul></article><article class="package-card package-card--silver"><span class="package-tier">${escape(t.three)}</span><h3>${escape(t.bundleTitle)}</h3><div class="num">25 €</div><ul class="package-details"><li>${escape(t.threeReady)}</li><li>${escape(t.mix)}</li><li>${escape(t.ownPrints)}</li></ul></article><aside class="kindergarten-combination-card"><span class="package-tier">${escape(t.combineLabel)}</span><h3>${escape(t.combine)}</h3><ul class="package-details">${t.combinations.map(text=>`<li>${escape(text)}</li>`).join('')}</ul><p>${escape(t.combineNote)}</p></aside></div><p>${escape(t.scope)}</p><p class="kindergarten-price-note">${escape(t.note)}</p><a class="btn primary" href="${landing}#anfrage">${escape(t.inquire)}</a></div>`;
    document.querySelector('.price-notes')?.before(section);
    document.querySelector('.price-notes .kindergarten-extras-note')?.remove();document.querySelector('.price-notes .section-head')?.insertAdjacentHTML('beforeend',`<p class="kindergarten-extras-note">${escape(t.extras)}</p>`);
    const schema=document.querySelector('script[data-schema-key="primary"]');
    if(schema){try{const data=JSON.parse(schema.textContent);if(data['@type']==='OfferCatalog'){data.itemListElement=data.itemListElement.filter(x=>x.identifier!=='kindergarten');data.itemListElement.push({'@type':'OfferCatalog',identifier:'kindergarten',name:t.service,itemListElement:[{'@type':'Offer',name:t.one,price:10,priceCurrency:'EUR',url:'https://liza-memories-photography.com/'+suffix('preise.html',lang)+'#kindergarten'},{'@type':'Offer',name:t.three,price:25,priceCurrency:'EUR',url:'https://liza-memories-photography.com/'+suffix('preise.html',lang)+'#kindergarten'}]});schema.textContent=JSON.stringify(data);}}catch{}}
  }
  let css=document.querySelector('link[href*="kindergarten-integrations.css"]');
  if(!css){css=el('link');css.rel='stylesheet';document.head.append(css);}
  css.href=prefix+'scripts/kindergarten-integrations.css?v=20261022b';
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
