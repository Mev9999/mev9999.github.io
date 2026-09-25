'use strict';
const t = text => window.GIVEAWAY_MESSAGES?.[text] || text;
const shareUrl = () => { const url = new URL(document.querySelector('link[rel=canonical]')?.href || location.href); url.hash = 'mitmachen'; url.search = ''; return url.href; };

const form = document.querySelector('#giveaway-form');
const button = form.querySelector('[type="submit"]');
const status = document.querySelector('#form-status');
const dialog = document.querySelector('#success-dialog');
let config, pending = null, timeout;
function availability() {
  if (!config || !config.submissionEndpoint || config.status !== 'ready') return t("Die Teilnahme wird gerade vorbereitet. Bitte schau später noch einmal vorbei.");
  if (Date.now() < Date.parse(config.startsAt)) return t("Die Teilnahme startet am 1. Oktober 2026.");
  if (Date.now() > Date.parse(config.endsAt)) return t("Das Gewinnspiel ist beendet. Vielen Dank fürs Mitmachen!");
  return '';
}
function refresh() {
  const note = availability();
  button.disabled = !!note || !!pending;
  button.textContent = pending ? t("Wird gesendet …") : note ? t("Teilnahme derzeit geschlossen") : t("Jetzt teilnehmen ♡");
  document.querySelector('#campaign-status').textContent = note || t("Jetzt teilnehmen · bis 14. Oktober 2026");
}
fetch('gewinnspiel-config.json', {cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(c=>{
  if(c.submissionEndpoint && !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(c.submissionEndpoint))throw Error();
  config=c;
  const campaignLinks=document.querySelectorAll('[data-instagram-campaign]');
  const candidate=c.instagramPostUrl||c.instagramReelUrl;
  if(candidate){try{const u=new URL(candidate);if(u.protocol==='https:'&&['instagram.com','www.instagram.com'].includes(u.hostname))campaignLinks.forEach(link=>link.href=u.href);}catch{}}
  if(c.submissionEndpoint)form.action=c.submissionEndpoint; refresh();
}).catch(()=>{status.textContent=t("Das Formular konnte nicht geladen werden. Bitte lade die Seite erneut.");refresh();});
setInterval(refresh,30000);
form.addEventListener('submit',async event=>{
  event.preventDefault();
  const note=availability();
  if(note||pending){event.preventDefault();status.textContent=note||t("Bitte warte auf die Bestätigung.");return;}
  if(!/\S+\s+\S+/.test(form.elements.name.value.trim())){event.preventDefault();status.textContent=t("Bitte gib deinen vollständigen Vor- und Nachnamen ein.");form.elements.name.focus();return;}
  const instagram=form.elements.instagram.value.trim().replace(/^@/,'').toLowerCase();
  if(!/^[a-z0-9_]+(?:[.][a-z0-9_]+)*$/.test(instagram)||instagram.length>30){status.textContent=t("Bitte gib einen gültigen Instagram-Benutzernamen ein.");form.elements.instagram.focus();return;}
  form.elements.instagram.value=instagram;
  pending=Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
  form.elements.request_id.value=pending;form.elements.parent_origin.value=location.origin;
  status.textContent=t("Deine Teilnahme wird gespeichert …");refresh();
  const controller = new AbortController();
  timeout=setTimeout(()=>controller.abort(),45000);
  try {
    const response=await fetch(config.submissionEndpoint,{method:'POST',body:new URLSearchParams(new FormData(form)),credentials:'omit',redirect:'follow',signal:controller.signal});
    if(!response.ok)throw Error('response');
    const result=await response.json();
    if(!result||result.type!=='liza-giveaway-result'||result.requestId!==pending||typeof result.ok!=='boolean'||typeof result.message!=='string')throw Error('confirmation');
    if(result.ok){status.textContent=t("Deine Teilnahme wurde bestätigt.");document.querySelector('#success-message').textContent=t(result.message);form.reset();dialog.showModal();}
    else status.textContent=t(result.message);
  } catch(error) {
    status.textContent=t("Wir haben keine Speicherbestätigung erhalten. Bitte versuche es erneut. Mit derselben E-Mail-Adresse entsteht kein doppelter Eintrag.");
  } finally {clearTimeout(timeout);pending=null;refresh();}
});
document.querySelector('#close-success').addEventListener('click',()=>dialog.close());
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',()=>{const target=document.getElementById(a.getAttribute('href').slice(1));if(target){let section=target.closest('details');while(section){section.open=true;section=section.parentElement?.closest('details');}}}));
async function copyLink(){try{await navigator.clipboard.writeText(shareUrl());document.querySelectorAll('[data-share-status], #share-status').forEach(el=>el.textContent=t("Link kopiert."));}catch{document.querySelectorAll('[data-share-status], #share-status').forEach(el=>el.textContent=t('Der Link lautet: ')+shareUrl());}}
document.querySelector('#copy').addEventListener('click',copyLink);
document.querySelectorAll('#share, [data-share]').forEach(shareButton=>shareButton.addEventListener('click',async()=>{if(!navigator.share)return copyLink();try{await navigator.share({title:t("Ein Shooting gewinnen – LiZa Memories Photography"),url:shareUrl()});}catch(error){if(error.name!=='AbortError')await copyLink();}}));

const extras=document.querySelector('.optional-consents');
extras.addEventListener('change',()=>{const count=extras.querySelectorAll('input:checked').length;extras.querySelector('.optional-count').textContent=count?count+t(" ausgewählt"):t("E-Mail-Angebote");});
form.addEventListener('reset',()=>{extras.open=false;extras.querySelector('.optional-count').textContent=t("E-Mail-Angebote");});
