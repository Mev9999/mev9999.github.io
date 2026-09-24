'use strict';
const form = document.querySelector('#giveaway-form');
const button = form.querySelector('[type="submit"]');
const status = document.querySelector('#form-status');
const dialog = document.querySelector('#success-dialog');
let config, pending = null, timeout;
function availability() {
  if (!config || !config.submissionEndpoint || config.status !== 'ready') return 'Die Teilnahme wird gerade vorbereitet. Bitte schau später noch einmal vorbei.';
  if (Date.now() < Date.parse(config.startsAt)) return 'Die Teilnahme startet am 26. September 2026.';
  if (Date.now() > Date.parse(config.endsAt)) return 'Das Gewinnspiel ist beendet. Vielen Dank fürs Mitmachen!';
  return '';
}
function refresh() {
  const note = availability();
  button.disabled = !!note || !!pending;
  button.textContent = pending ? 'Wird gesendet …' : note ? 'Teilnahme derzeit geschlossen' : 'Jetzt teilnehmen ♡';
  document.querySelector('#campaign-status').textContent = note || 'Jetzt teilnehmen · bis 24. Oktober 2026';
}
fetch('gewinnspiel-config.json', {cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(c=>{
  if(c.submissionEndpoint && !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(c.submissionEndpoint))throw Error();
  config=c; if(c.submissionEndpoint)form.action=c.submissionEndpoint; refresh();
}).catch(()=>{status.textContent='Das Formular konnte nicht geladen werden. Bitte lade die Seite erneut.';refresh();});
setInterval(refresh,30000);
form.addEventListener('submit',async event=>{
  event.preventDefault();
  const note=availability();
  if(note||pending){event.preventDefault();status.textContent=note||'Bitte warte auf die Bestätigung.';return;}
  if(!/\S+\s+\S+/.test(form.elements.name.value.trim())){event.preventDefault();status.textContent='Bitte gib deinen vollständigen Vor- und Nachnamen ein.';form.elements.name.focus();return;}
  pending=Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
  form.elements.request_id.value=pending;form.elements.parent_origin.value=location.origin;
  status.textContent='Deine Teilnahme wird gespeichert …';refresh();
  const controller = new AbortController();
  timeout=setTimeout(()=>controller.abort(),45000);
  try {
    const response=await fetch(config.submissionEndpoint,{method:'POST',body:new URLSearchParams(new FormData(form)),credentials:'omit',redirect:'follow',signal:controller.signal});
    if(!response.ok)throw Error('response');
    const result=await response.json();
    if(!result||result.type!=='liza-giveaway-result'||result.requestId!==pending||typeof result.ok!=='boolean'||typeof result.message!=='string')throw Error('confirmation');
    if(result.ok){status.textContent='Deine Teilnahme wurde bestätigt.';document.querySelector('#success-message').textContent=result.message;form.reset();dialog.showModal();}
    else status.textContent=result.message;
  } catch(error) {
    status.textContent='Wir haben keine Speicherbestätigung erhalten. Bitte versuche es erneut. Mit derselben E-Mail-Adresse entsteht kein doppelter Eintrag.';
  } finally {clearTimeout(timeout);pending=null;refresh();}
});
document.querySelector('#close-success').addEventListener('click',()=>dialog.close());
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',()=>{const target=document.getElementById(a.getAttribute('href').slice(1));if(target?.tagName==='DETAILS')target.open=true;}));
async function copyLink(){try{await navigator.clipboard.writeText((config?.canonicalUrl||'https://liza-memories-photography.com/gewinnspiel/')+'#mitmachen');document.querySelector('#share-status').textContent='Link kopiert.';}catch{document.querySelector('#share-status').textContent='Der Link lautet: https://liza-memories-photography.com/gewinnspiel/#mitmachen';}}
document.querySelector('#copy').addEventListener('click',copyLink);
document.querySelector('#share').addEventListener('click',async()=>{if(!navigator.share)return copyLink();try{await navigator.share({title:'Ein Shooting gewinnen – LiZa Memories Photography',url:(config?.canonicalUrl||'https://liza-memories-photography.com/gewinnspiel/')+'#mitmachen'});}catch(error){if(error.name!=='AbortError')await copyLink();}});

const extras=document.querySelector('.optional-consents');
extras.addEventListener('change',()=>{const count=extras.querySelectorAll('input:checked').length;extras.querySelector('.optional-count').textContent=count?count+' ausgewählt':'Angebote & Fotos';});
form.addEventListener('reset',()=>{extras.open=false;extras.querySelector('.optional-count').textContent='Angebote & Fotos';});
