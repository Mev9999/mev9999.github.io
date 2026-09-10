(() => {
  if (window.lizaContactFlowReady) return;
  window.lizaContactFlowReady = true;
  const services = {portrait:'Portrait',maternity:'Babybauch',newborn:'Newborn',family:'Familie',combo:'Babybauch + Newborn Kombi',wedding:'Standesamt / kleine Feier'};
  const files = ['index','preise','ueber-mich','portraitfotografie-graz','babybauch-shooting-graz','newborn-fotografie-graz','familienfotografie-graz','hochzeitsfotograf-graz','babybauch-und-neugeborenen-shooting-graz'];
  const validSource = value => files.some(file => ['.html','-en.html','-bs.html'].some(suffix => value === file+suffix));
  const lang = ['de','en','bs'].includes(document.documentElement.lang) ? document.documentElement.lang : 'de';
  const params = new URLSearchParams(location.search);
  const pageServices = {'portraitfotografie-graz.html':'portrait','babybauch-shooting-graz.html':'maternity','newborn-fotografie-graz.html':'newborn','familienfotografie-graz.html':'family','hochzeitsfotograf-graz.html':'wedding','babybauch-und-neugeborenen-shooting-graz.html':'combo'};
  const baseFile=(location.pathname.split('/').pop()||'index.html').replace(/-(en|bs)\.html$/,'.html');
  const service = Object.hasOwn(services, params.get('service')) ? params.get('service') : (pageServices[baseFile] || '');
  const tier = service && ['bronze','silver','gold'].includes(params.get('package')) ? params.get('package') : '';
  const file = location.pathname.split('/').pop() || 'index.html';
  const source = validSource(params.get('source')) ? params.get('source') : (validSource(file) ? file : 'index.html');
  const copy = {
    de:{sending:'Sende…',success:'Danke! Ich melde mich bald.',error:'Etwas ist schiefgelaufen. Bitte schreib an info@liza-memories-photography.com.',network:'Netzwerkfehler. Bitte später erneut versuchen.',selected:'Deine Auswahl',package:'Paket',tiers:{bronze:'Bronze',silver:'Silber',gold:'Gold'}},
    en:{sending:'Sending…',success:'Thank you! I will get back to you soon.',error:'Something went wrong. Please write to info@liza-memories-photography.com.',network:'Network error. Please try again later.',selected:'Your selection',package:'Package',tiers:{bronze:'Bronze',silver:'Silver',gold:'Gold'}},
    bs:{sending:'Šaljem…',success:'Hvala! Javiću se uskoro.',error:'Nešto je pošlo po zlu. Pišite na info@liza-memories-photography.com.',network:'Greška u mreži. Pokušajte kasnije.',selected:'Tvoj izbor',package:'Paket',tiers:{bronze:'Bronza',silver:'Srebro',gold:'Zlato'}}
  }[lang];
  // Local, allowlisted events only. An approved analytics adapter can subscribe
  // to liza:conversion. Never forward URLs, referrers or form contents.
  const emit = (event, selectedService = '', selectedPackage = '') => document.dispatchEvent(new CustomEvent('liza:conversion', {detail:{event,service:Object.hasOwn(services,selectedService)?selectedService:'',package:['bronze','silver','gold'].includes(selectedPackage)?selectedPackage:'',language:lang,source_page:source}}));
  document.addEventListener('click', event => {
    const a=event.target.closest('a[href]');if(!a)return;
    if(a.getAttribute('href').startsWith('tel:'))emit('phone_click',service,tier);
    if(/^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(a.href))emit('whatsapp_click',service,tier);
  });
  const form=document.getElementById('contact-form-card');if(!form)return;
  const select=form.querySelector('[name="service"]'),button=form.querySelector('[type="submit"]'),status=document.getElementById('formStatus');
  const hidden=(name,value)=>{let input=form.querySelector(`input[name="${name}"]`);if(!input){input=document.createElement('input');input.type='hidden';input.name=name;form.append(input);}input.value=value;return input;};
  hidden('source_page',source);hidden('language',lang);
  const serviceInput=hidden('service_id',service),packageInput=hidden('package',tier);
  let note=form.querySelector('.inquiry-selection');if(!note){note=document.createElement('p');note.className='inquiry-selection';note.setAttribute('role','status');form.prepend(note);}
  if(service){select.value=services[service];[...select.options].forEach(o=>o.defaultSelected=o.value===services[service]);}
  const refresh=()=>{serviceInput.value=Object.keys(services).find(id=>services[id]===select.value)||'';note.hidden=!serviceInput.value;note.textContent=`${copy.selected}: ${select.selectedOptions[0]?.textContent || ''}${packageInput.value ? ' · '+copy.package+' '+copy.tiers[packageInput.value] : ''}`;};
  refresh();select.addEventListener('change',()=>{packageInput.value='';refresh();});
  // A language change keeps only validated inquiry context, never arbitrary URL data.
  document.querySelectorAll('.lang-option').forEach(a=>a.addEventListener('click',event=>{
    if(!serviceInput.value)return;
    event.preventDefault();event.stopImmediatePropagation();
    const next=a.dataset.lang;const target=new URL(next==='de'?'index.html':`index-${next}.html`,location.href);
    target.searchParams.set('service',serviceInput.value);if(packageInput.value)target.searchParams.set('package',packageInput.value);target.searchParams.set('source',source);target.hash='contact-form-card';location.href=target.href;
  },true));
  let sending=false;
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(sending||!form.reportValidity())return;
    sending=true;button.disabled=true;button.setAttribute('aria-busy','true');form.setAttribute('aria-busy','true');
    const label=button.textContent;button.textContent=copy.sending;status.textContent=copy.sending;
    const selectedService=serviceInput.value,selectedPackage=packageInput.value;
    try{
      const response=await fetch(form.action,{method:'POST',body:new FormData(form),headers:{Accept:'application/json'}});
      if(response.ok){status.textContent=copy.success;emit('lead_success',selectedService,selectedPackage);form.reset();hidden('source_page',source);hidden('language',lang);packageInput.value=selectedPackage;refresh();}
      else status.textContent=copy.error;
    }catch{status.textContent=copy.network;}
    finally{sending=false;button.disabled=false;button.removeAttribute('aria-busy');form.removeAttribute('aria-busy');button.textContent=label;}
  });
})();
