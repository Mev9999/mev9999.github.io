import fs from 'node:fs';
const reviews = JSON.parse(fs.readFileSync(new URL('./reviews-data.json', import.meta.url), 'utf8'));
// Populate with the owner's selected original reviews: {name,text,rating,lang}.
// Empty data deliberately produces no empty panel or invented testimonials.
export function addReviewCarousel(d, lang, entries = reviews) {
 d.querySelectorAll('.customer-reviews').forEach(e=>e.remove());
 d.querySelectorAll('[data-review-asset]').forEach(e=>e.remove());
 if(!entries.length)return;
 if(entries.length>10)throw new Error('Select at most ten reviews.');
 const copy={de:['Das sagen meine Kunden','Ausgewählte Google-Rezensionen · im Originalwortlaut','Vorherige Rezension','Nächste Rezension','Automatischen Wechsel pausieren','Automatischen Wechsel starten','Rezensionen','Rezension','von','Auf Google lesen'],en:['What my clients say','Selected Google reviews · original wording','Previous review','Next review','Pause automatic rotation','Start automatic rotation','Reviews','Review','of','Read on Google'],bs:['Šta kažu moji klijenti','Odabrane Google recenzije · izvorni tekst','Prethodna recenzija','Sljedeća recenzija','Pauziraj automatsku izmjenu','Pokreni automatsku izmjenu','Recenzije','Recenzija','od','Pročitaj na Googleu']}[lang];
 const container=d.querySelector('#testimonials>.container');if(!container)return;
 const el=(tag,cls,text)=>{const e=d.createElement(tag);e.className=cls;if(text)e.textContent=text;return e;};
 const box=el('div','customer-reviews');box.setAttribute('role','region');box.setAttribute('aria-labelledby','customer-reviews-title');
 const h=el('h3','',copy[0]);h.id='customer-reviews-title';box.append(h,el('p','review-intro',copy[1]));
 const controls=el('div','review-controls');controls.hidden=true;
 const button=(cls,label,text)=>{const b=el('button',cls,text);b.type='button';b.setAttribute('aria-label',label);return b;};
 const previous=button('review-prev',copy[2],'←'),next=button('review-next',copy[3],'→'),pause=button('review-pause',copy[4],copy[4]),count=el('span','review-count');
 pause.dataset.pause=copy[4];pause.dataset.play=copy[5];
 count.setAttribute('role','status');count.setAttribute('aria-live','polite');
 controls.append(previous,count,next,pause);box.append(controls);
 const track=el('div','review-track');
 entries.forEach((r,n)=>{
  if(!r.name||!r.text||!Number.isInteger(r.rating)||r.rating<1||r.rating>5||!['de','en','bs'].includes(r.lang))throw new Error('Incomplete original review');
  const article=el('article','review-slide');article.dataset.label=`${copy[7]} ${n+1} ${copy[8]} ${entries.length}`;
  article.setAttribute('aria-label',article.dataset.label);
  const stars=el('div','review-stars','★'.repeat(r.rating));stars.setAttribute('aria-hidden','true');
  const rating=el('span','review-rating',`${r.rating}/5`);
  const quote=el('blockquote','',r.text);quote.lang=r.lang;
  const name=el('p','review-author',r.name),link=el('a','review-source',copy[9]);link.href='https://maps.app.goo.gl/Absk5FRMgyCuUwxe9';link.target='_blank';link.rel='noopener noreferrer';
  article.append(stars,rating,quote,name,link);track.append(article);
 });
 box.append(track);container.append(box);
 const css=el('link','');css.rel='stylesheet';css.href='scripts/reviews-carousel.css?v=20260913';css.dataset.reviewAsset='';d.head.append(css);
 const script=el('script','');script.src='scripts/reviews-carousel.js?v=20260913';script.defer=true;script.dataset.reviewAsset='';d.head.append(script);
}
