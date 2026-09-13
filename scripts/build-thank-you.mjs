import fs from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {applyPrivacy} from './privacy-build.mjs';
const translations={
de:{title:'Danke für deine Anfrage!',body:'Deine Nachricht wurde erfolgreich gesendet. Ich melde mich spätestens innerhalb von 24 Stunden bei dir zurück.',spam:'Bitte prüfe auch deinen Spam-Ordner, da meine Antwort gelegentlich dort landen kann.',questions:'Bei Fragen erreichst du mich jederzeit telefonisch oder über WhatsApp.',phone:'Anrufen',ok:'OK – zurück zur Website',privacy:'Datenschutz',legal:'Impressum'},
en:{title:'Thank you for your enquiry!',body:'Your message has been sent successfully. I will get back to you within 24 hours.',spam:'Please also check your spam folder, as my reply may occasionally end up there.',questions:'If you have any questions, you are welcome to contact me by phone or WhatsApp at any time.',phone:'Call me',ok:'OK – back to the website',privacy:'Privacy policy',legal:'Legal notice'},
bs:{title:'Hvala na upitu!',body:'Tvoja poruka je uspješno poslana. Javit ću ti se u roku od 24 sata.',spam:'Molim te, provjeri i folder za neželjenu poštu, jer moj odgovor ponekad može završiti tamo.',questions:'Ako imaš pitanja, slobodno mi se javi telefonom ili putem WhatsAppa.',phone:'Nazovi me',ok:'OK – nazad na stranicu',privacy:'Politika privatnosti',legal:'Pravne informacije'}
};
for(const [lang,t] of Object.entries(translations)){
 const suffix=lang==='de'?'':'-'+lang,file='danke'+suffix+'.html',home='index'+suffix+'.html';
 const html=`<!DOCTYPE html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${t.title} | LiZa Memories Photography</title><meta name="description" content="${t.body}"><meta name="robots" content="noindex,follow">
<link rel="canonical" href="https://liza-memories-photography.com/${file}">
<link rel="icon" href="favicon-camera.png"><link rel="stylesheet" href="fonts/fonts.css?v=20260910"><link rel="stylesheet" href="scripts/site-refresh.css?v=20260912-seo1"><link rel="stylesheet" href="scripts/thank-you.css?v=20260913"><script defer src="scripts/thank-you.js?v=20260913"></script></head>
<body><a class="brand" href="${home}" aria-label="LiZa Memories Photography"><img src="logo-liza.webp" width="640" height="190" alt="LiZa Memories Photography"></a>
<main class="confirmation" id="main-content"><div class="success-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4L19 6"/></svg></div>
<h1>${t.title}</h1><p>${t.body}</p><p>${t.spam}</p><p class="follow-up">${t.questions}</p>
<div class="contact-links"><a href="tel:+4368181942780">${t.phone}</a><a href="https://wa.me/4368181942780" target="_blank" rel="noopener noreferrer">WhatsApp</a></div>
<a id="return-link" class="return-button" href="${home}#contact-form-card">${t.ok}</a></main>
<footer><a href="datenschutz${suffix}.html">${t.privacy}</a><a href="impressum${suffix}.html">${t.legal}</a></footer></body></html>`;
 const dom=new JSDOM(html);applyPrivacy(dom.window.document,file);await fs.writeFile(file,dom.serialize(),'utf8');dom.window.close();
}
