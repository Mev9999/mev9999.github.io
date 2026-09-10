(() => {
  'use strict';
  if (window.__LIZA_STATIC_BUILD) return;
  if (window.lizaPrivacy) return;
  const KEY = 'lizaPrivacyConsent';
  const VERSION = 1;
  const LIFETIME = 180 * 24 * 60 * 60 * 1000;
  const lang = ['de','en','bs'].includes(document.documentElement.lang) ? document.documentElement.lang : 'de';
  const policy = lang === 'de' ? 'datenschutz.html' : `datenschutz-${lang}.html`;
  const text = {
    de: {title:'Datenschutzeinstellungen',intro:'Die Website funktioniert ohne Statistik. Wenn du möchtest, erlaubst du uns cookie-freie Besuchs- und Performance-Messungen mit Cloudflare Web Analytics. Deine Auswahl kannst du jederzeit im Footer ändern.',accept:'Alle akzeptieren',reject:'Nur notwendige',settings:'Einstellungen',save:'Auswahl speichern',close:'Ohne Änderung schließen',privacy:'Datenschutzerklärung',necessary:'Notwendig',statistics:'Statistik',details:'Dienste und Details',provider:'Anbieter',purpose:'Zweck',technology:'Technologie',duration:'Speicherdauer',necessaryPurpose:'Website bereitstellen, deine Datenschutzauswahl merken und von dir abgesendete Anfragen übermitteln.',necessaryTech:'Lokale Dateien über HTTPS. lizaPrivacyConsent im LocalStorage enthält nur Version, Auswahl und Ablaufdatum. Formspree wird erst beim Absenden kontaktiert.',necessaryDuration:'Datenschutzauswahl: 180 Tage. Anfragen: bis zur Erledigung, vorbehaltlich gesetzlicher Pflichten. Hosting-Protokolle nach den Vorgaben des Anbieters.',statsPurpose:'Cookie-freie Statistik zu Seitenbesuchen, Ladezeiten und Stabilität. Keine Formulareingaben werden an die Statistik übermittelt.',statsTech:'Cloudflare-JavaScript liest Browser-Performance-Daten und übermittelt Messwerte. Keine Analytics-Cookies, kein LocalStorage und keine dauerhafte Nutzerkennung durch den Beacon.',statsDuration:'Seitenbezogene Messdaten im Arbeitsspeicher. Laut Anbieter sind Auswertungen bis zu sechs Monate abrufbar; keine Analytics-Cookies auf deinem Gerät.',note:'Statistik ist freiwillig und standardmäßig aus. Widerruf jederzeit über „Datenschutzeinstellungen“. Bereits erfolgte Übermittlungen werden dadurch nicht rückgängig gemacht.',storageError:'Dein Browser konnte die Auswahl nicht speichern. Sie gilt deshalb nur für diese Seite.'},
    en: {title:'Privacy settings',intro:'The website works without statistics. If you wish, you can allow cookie-free visit and performance measurement with Cloudflare Web Analytics. You can change your choice in the footer at any time.',accept:'Accept all',reject:'Necessary only',settings:'Settings',save:'Save selection',close:'Close without changes',privacy:'Privacy policy',necessary:'Necessary',statistics:'Statistics',details:'Services and details',provider:'Provider',purpose:'Purpose',technology:'Technology',duration:'Retention',necessaryPurpose:'Deliver the website, remember your privacy choice and transmit inquiries you choose to submit.',necessaryTech:'Local files over HTTPS. lizaPrivacyConsent in LocalStorage contains only the version, choice and expiry date. Formspree is contacted only when you submit the form.',necessaryDuration:'Privacy choice: 180 days. Inquiries: until handled, subject to legal duties. Hosting logs follow the provider’s retention rules.',statsPurpose:'Cookie-free statistics about page visits, loading speed and stability. No form contents are sent to analytics.',statsTech:'Cloudflare JavaScript reads browser performance data and transmits measurements. The beacon uses no analytics cookies, LocalStorage or persistent visitor identifier.',statsDuration:'Page-specific measurements in memory. The provider makes reports available for up to six months; no analytics cookies on your device.',note:'Statistics are optional and off by default. Withdraw at any time through “Privacy settings”. This does not undo transmissions that have already taken place.',storageError:'Your browser could not save this choice. It applies only to this page.'},
    bs: {title:'Postavke privatnosti',intro:'Stranica radi i bez statistike. Ako želiš, možeš dozvoliti mjerenje posjeta i performansi bez kolačića putem usluge Cloudflare Web Analytics. Izbor možeš promijeniti u podnožju stranice u bilo kojem trenutku.',accept:'Prihvati sve',reject:'Samo neophodno',settings:'Postavke',save:'Sačuvaj izbor',close:'Zatvori bez izmjena',privacy:'Politika privatnosti',necessary:'Neophodno',statistics:'Statistika',details:'Usluge i detalji',provider:'Pružalac usluge',purpose:'Svrha',technology:'Tehnologija',duration:'Vrijeme čuvanja',necessaryPurpose:'Prikaz stranice, pamćenje postavki privatnosti i slanje upita koje samostalno pošalješ.',necessaryTech:'Lokalne datoteke putem HTTPS-a. lizaPrivacyConsent u LocalStorageu sadrži samo verziju, izbor i datum isteka. Formspree se kontaktira tek pri slanju obrasca.',necessaryDuration:'Izbor privatnosti: 180 dana. Upiti: do završetka obrade, uz zakonske obaveze čuvanja. Pravila pružaoca usluge određuju čuvanje zapisa hostinga.',statsPurpose:'Statistika bez kolačića o posjetama, brzini učitavanja i stabilnosti. Sadržaj obrasca se ne šalje statistici.',statsTech:'Cloudflare JavaScript čita podatke o performansama preglednika i prenosi mjerenja. Beacon ne koristi analitičke kolačiće, LocalStorage niti trajni identifikator posjetilaca.',statsDuration:'Mjerenja pojedinačne stranice u radnoj memoriji. Prema pružaocu usluge, izvještaji su dostupni do šest mjeseci; bez analitičkih kolačića na uređaju.',note:'Statistika je dobrovoljna i početno isključena. Saglasnost možeš povući kroz „Postavke privatnosti“. Raniji prijenosi podataka time se ne poništavaju.',storageError:'Preglednik nije mogao sačuvati izbor. Izbor vrijedi samo za ovu stranicu.'}
  }[lang];
  const parse = raw => {
    try {const value=JSON.parse(raw);return value?.version===VERSION && typeof value.statistics==='boolean' && Number.isFinite(value.expiresAt) && value.expiresAt>Date.now() && value.expiresAt<=Date.now()+LIFETIME+60000 ? value : null;} catch {return null;}
  };
  const read = () => {try{return parse(localStorage.getItem(KEY));}catch{return null;}};
  let choice=read(), active=false, opener=null, dialog=null, expiryTimer;
  let consentAllowed=choice?.statistics===true;
  const pending=new Set();
  const isAnalytics = value => {try{const u=new URL(value,location.href);return u.hostname==='cloudflareinsights.com'||u.hostname==='static.cloudflareinsights.com'||(u.origin===location.origin&&u.pathname.startsWith('/cdn-cgi/rum'));}catch{return false;}};
  // Stop the already-loaded beacon from sending on pagehide during revocation.
  // Other requests (including Formspree) retain their normal behavior.
  function installNetworkGate(){
    const XHR=window.XMLHttpRequest,open=XHR.prototype.open,send=XHR.prototype.send;
    const targets=new WeakMap();
    XHR.prototype.open=function(method,url,...rest){targets.set(this,isAnalytics(url));return open.call(this,method,url,...rest);};
    XHR.prototype.send=function(...args){if(targets.get(this)){if(!consentAllowed)return;pending.add(this);this.addEventListener('loadend',()=>pending.delete(this),{once:true});}return send.apply(this,args);};
    if(navigator.sendBeacon){const sendBeacon=navigator.sendBeacon.bind(navigator);navigator.sendBeacon=(url,data)=>isAnalytics(url)&&!consentAllowed?false:sendBeacon(url,data);}
    if(window.fetch){const fetch=window.fetch.bind(window);window.fetch=(input,init)=>isAnalytics(typeof input==='string'||input instanceof URL?input:input.url)&&!consentAllowed?Promise.reject(new DOMException('Analytics consent withdrawn','AbortError')):fetch(input,init);}
  }
  function startAnalytics(){
    if(!consentAllowed||active)return;
    const config=document.getElementById('cloudflare-analytics-config');if(!config)return;
    let parsed;try{parsed=JSON.parse(config.textContent);}catch{return;}
    if(!parsed.token||typeof parsed.token!=='string')return;
    installNetworkGate();active=true;
    const script=document.createElement('script');script.id='consented-cloudflare-beacon';script.src='https://static.cloudflareinsights.com/beacon.min.js';script.defer=true;script.setAttribute('data-cf-beacon',JSON.stringify(parsed));document.head.append(script);
  }
  function apply(next,reloadOnRevoke=true){
    const wasActive=active;choice=next;consentAllowed=next?.statistics===true;
    clearTimeout(expiryTimer);
    if(next)expiryTimer=setTimeout(()=>apply(next.expiresAt>Date.now()?next:null),Math.min(next.expiresAt-Date.now(),2147483647));
    if(consentAllowed){startAnalytics();return;}
    pending.forEach(request=>request.abort());pending.clear();
    if(wasActive){document.getElementById('consented-cloudflare-beacon')?.remove();if(reloadOnRevoke)location.reload();}
  }
  function create(){
    if(dialog)return;
    dialog=document.createElement('dialog');dialog.className='privacy-dialog';dialog.id='privacy-dialog';dialog.setAttribute('aria-labelledby','privacy-title');dialog.setAttribute('aria-describedby','privacy-intro');
    dialog.innerHTML=`<h2 id="privacy-title" tabindex="-1">${text.title}</h2><p id="privacy-intro">${text.intro}</p>
      <div class="privacy-details" hidden>
        <section class="privacy-category"><label><input type="checkbox" checked disabled> ${text.necessary}</label><details><summary>${text.details}</summary><dl><dt>${text.provider}</dt><dd>LiZa Memories Photography · GitHub, Inc. · Formspree, Inc.</dd><dt>${text.purpose}</dt><dd>${text.necessaryPurpose}</dd><dt>${text.technology}</dt><dd>${text.necessaryTech}</dd><dt>${text.duration}</dt><dd>${text.necessaryDuration}</dd></dl><a href="${policy}#necessary">${text.privacy}</a></details></section>
        <section class="privacy-category"><label><input id="privacy-statistics" type="checkbox"> ${text.statistics}</label><details><summary>Cloudflare Web Analytics · ${text.details}</summary><dl><dt>${text.provider}</dt><dd>Cloudflare, Inc.</dd><dt>${text.purpose}</dt><dd>${text.statsPurpose}</dd><dt>${text.technology}</dt><dd>${text.statsTech}</dd><dt>${text.duration}</dt><dd>${text.statsDuration}</dd></dl><a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer">Cloudflare · ${text.privacy}</a></details></section>
        <p class="privacy-note">${text.note}</p>
      </div>
      <div class="privacy-actions"><button type="button" class="privacy-button" data-privacy-accept>${text.accept}</button><button type="button" class="privacy-button" data-privacy-reject>${text.reject}</button><button type="button" class="privacy-button secondary privacy-settings-action" aria-expanded="false" aria-controls="privacy-details">${text.settings}</button><button type="button" class="privacy-button privacy-save" hidden>${text.save}</button><button type="button" class="privacy-button secondary privacy-close" hidden>${text.close}</button></div>
      <p class="privacy-note"><a href="${policy}">${text.privacy}</a></p>`;
    document.body.append(dialog);
    const details=dialog.querySelector('.privacy-details');details.id='privacy-details';
    dialog.querySelector('[data-privacy-accept]').addEventListener('click',()=>save(true));
    dialog.querySelector('[data-privacy-reject]').addEventListener('click',()=>save(false));
    dialog.querySelector('.privacy-settings-action').addEventListener('click',()=>{details.hidden=false;dialog.querySelector('.privacy-save').hidden=false;dialog.querySelector('.privacy-close').hidden=false;dialog.querySelector('.privacy-settings-action').setAttribute('aria-expanded','true');dialog.querySelector('#privacy-statistics').focus();});
    dialog.querySelector('.privacy-save').addEventListener('click',()=>save(dialog.querySelector('#privacy-statistics').checked));
    dialog.querySelector('.privacy-close').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('cancel',event=>{event.preventDefault();dialog.close();});
    dialog.addEventListener('close',()=>{opener?.focus({preventScroll:true});});
    dialog.addEventListener('keydown',event=>{
      if(event.key!=='Tab')return;
      const controls=[...dialog.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),summary')].filter(e=>e.getClientRects().length);
      const first=controls[0],last=controls[controls.length-1];
      if(event.shiftKey&&(document.activeElement===first||document.activeElement.id==='privacy-title')){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    });
  }
  function show(trigger){
    create();opener=trigger||document.activeElement;
    dialog.querySelector('#privacy-statistics').checked=choice?.statistics===true;
    dialog.querySelector('.privacy-details').hidden=true;dialog.querySelector('.privacy-save').hidden=true;dialog.querySelector('.privacy-close').hidden=true;dialog.querySelector('.privacy-settings-action').setAttribute('aria-expanded','false');
    if(!dialog.open){dialog.showModal();dialog.querySelector('#privacy-title').focus();}
  }
  function save(statistics){
    const next={version:VERSION,statistics,expiresAt:Date.now()+LIFETIME};
    let stored=true;try{localStorage.setItem(KEY,JSON.stringify(next));}catch{stored=false;}
    dialog.close();apply(next,stored);
    if(!stored){let status=document.getElementById('privacy-storage-status');if(!status){status=document.createElement('p');status.id='privacy-storage-status';status.setAttribute('role','status');document.querySelector('.privacy-settings-link')?.parentElement.append(status);}status.textContent=text.storageError;}
  }
  document.querySelectorAll('[data-privacy-settings]').forEach(button=>button.addEventListener('click',()=>show(button)));
  window.addEventListener('storage',event=>{if(event.key===KEY||event.key===null){apply(read());if(dialog?.open)dialog.querySelector('#privacy-statistics').checked=consentAllowed;}});
  window.addEventListener('pageshow',event=>{if(event.persisted)apply(read());});
  window.lizaPrivacy={open:show};
  apply(choice);
  if(!choice&&!/^datenschutz(?:-(en|bs))?\.html$/.test(location.pathname.split('/').pop()))show();
})();
