/* The voucher buyer has a separate protected link; no gallery account is required. */
(() => {
 'use strict';
 const config=document.getElementById('voucher-copy');if(!config)return;
 const t=JSON.parse(config.textContent),lang=t.lang;
 const loopback=['127.0.0.1','localhost','[::1]'].includes(location.hostname);
 const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const filename=(base,l=lang)=>base+(l==='de'?'':'-'+l)+'.html';
 const money=cents=>new Intl.NumberFormat(lang==='en'?'en-IE':lang==='bs'?'bs-BA':'de-AT',{style:'currency',currency:'EUR'}).format(cents/100);
 const amountCents=value=>{
  const text=String(value).trim().replace(',','.');
  if(!/^\d{1,4}(?:\.\d{1,2})?$/.test(text))return null;
  const [whole,fraction='']=text.split('.'),cents=Number(whole)*100+Number(fraction.padEnd(2,'0'));
  return Number.isSafeInteger(cents)&&cents>=1000&&cents<=200000?cents:null;
 };
 document.querySelectorAll('[data-voucher-checkout]').forEach(a=>{
  if(loopback)a.href=filename('gutscheine-kaufen');
  if(a.dataset.amount){const u=new URL(a.href,location.href);u.searchParams.set('amount',a.dataset.amount);a.href=u.href;}
 });
 document.querySelectorAll('[data-voucher-home]').forEach(a=>{if(loopback)a.href='/'+filename('gutscheine');});
 const burger=document.querySelector('#burger'),nav=document.querySelector('nav.primary');
 if(burger&&nav){
  function closeNav(){nav.classList.remove('open');burger.classList.remove('active');burger.setAttribute('aria-expanded','false');}
  burger.addEventListener('click',()=>{const open=burger.getAttribute('aria-expanded')!=='true';nav.classList.toggle('open',open);burger.classList.toggle('active',open);burger.setAttribute('aria-expanded',String(open));});
  nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeNav));
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeNav();});
 }
 const langButton=document.querySelector('#langBtn'),langMenu=document.querySelector('#langMenu');
 if(langButton&&langMenu){
  langButton.addEventListener('click',()=>{const open=langMenu.classList.toggle('open');langButton.setAttribute('aria-expanded',String(open));});
  document.addEventListener('click',event=>{if(!event.target.closest('#langSwitch')){langMenu.classList.remove('open');langButton.setAttribute('aria-expanded','false');}});
 }
 const form=document.getElementById('voucher-order-form');if(!form)return;
 // The public homepage never accepts payment or buyer tokens on its own origin.
 if(['liza-memories-photography.com','www.liza-memories-photography.com','mev9999.github.io'].includes(location.hostname)){
  location.replace('https://portal.liza-memories-photography.com/'+filename('gutscheine-kaufen')+location.search+location.hash);return;
 }
 const purchase=document.getElementById('voucher-purchase'),status=document.getElementById('voucher-status'),error=document.getElementById('voucher-order-error');
 document.getElementById('voucher-preview-notice').hidden=!loopback;
 let access=null,lastResponse=null;
 const input=name=>form.elements.namedItem(name);
 function updatePreview(){
  const cents=amountCents(input('amount').value),post=input('postDelivery').checked,shippingCents=post?480:0;
  document.querySelectorAll('[data-total]').forEach(n=>{n.textContent=cents===null?'—':money(cents+shippingCents);});
  document.querySelectorAll('[data-credit]').forEach(n=>{n.textContent=cents===null?'—':money(cents);});
  document.querySelectorAll('[data-shipping-row]').forEach(n=>{n.hidden=!post;});
  document.querySelectorAll('[data-delivery]').forEach(n=>{n.textContent=post?t.postDelivery:t.pdfDelivery;});
  const address=document.getElementById('voucher-shipping-address');address.hidden=!post;
  address.querySelectorAll('input').forEach(field=>{field.disabled=!post;field.required=post;});
  input('shippingPostal').setCustomValidity(post&&input('shippingPostal').value&&!/^[1-9]\d{3}$/.test(input('shippingPostal').value.trim())?t.shippingPostalError:'');
  const previewAmount=cents===null?'—':new Intl.NumberFormat(lang==='en'?'en-IE':lang==='bs'?'bs-BA':'de-AT',{style:'currency',currency:'EUR',minimumFractionDigits:cents%100?2:0,maximumFractionDigits:2}).format(cents/100);
  document.querySelectorAll('[data-preview-amount]').forEach(n=>{n.textContent=previewAmount;n.dataset.compact=String(previewAmount.length>7);});
  for(const [name,selector,fallback] of [['giftTo','[data-preview-to]',t.previewTo],['giftFrom','[data-preview-from]',t.previewFrom],['message','[data-preview-message]',t.previewMessage]])document.querySelectorAll(selector).forEach(n=>{n.textContent=input(name).value.trim()||fallback;});
  document.querySelectorAll('[data-gift-amount]').forEach(button=>button.setAttribute('aria-pressed',String(cents===Number(button.dataset.giftAmount)*100)));
  input('amount').setCustomValidity(cents===null?t.amountError:'');
 }
 const preselected=new URLSearchParams(location.search).get('amount');if(preselected&&amountCents(preselected)!==null)input('amount').value=preselected;
 form.addEventListener('input',()=>{updatePreview();error.textContent='';});
 form.querySelectorAll('[data-gift-amount]').forEach(button=>button.addEventListener('click',()=>{input('amount').value=button.dataset.giftAmount;updatePreview();}));
 updatePreview();
 async function api(path,options={}){
  const response=await fetch('/api/vouchers/orders'+path,{credentials:'same-origin',cache:'no-store',referrerPolicy:'no-referrer',...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});
  let data;try{data=await response.json();}catch{throw new Error(t.genericError);}
  if(!response.ok){const messageKey={invalid_delivery_method:'shippingError',invalid_shipping_address:'shippingError',invalid_shipping_price:'shippingPricingError',voucher_post_not_configured:'shippingNotReady'}[data.code];throw new Error(messageKey?t[messageKey]:typeof data.error==='string'?data.error:t.genericError);}
  return data;
 }
 function alertError(message,target=error){target.textContent=message;target.focus();}
 async function copyText(value,button,field,feedback){
  let copied=false;feedback.textContent='';
  try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(value);copied=true;}}catch{}
  if(!copied){
   field.value=value;field.hidden=false;field.focus();field.select();field.setSelectionRange(0,value.length);
   try{copied=document.execCommand?.('copy')===true;}catch{}
  }
  if(copied){field.hidden=true;button.focus();feedback.textContent=t.copied;}
  else feedback.textContent=t.copyManual;
 }
 function secureLink(){const u=new URL(location.href);u.search='';u.hash=new URLSearchParams({order:access.id,token:access.token}).toString();return u.href;}
 function rememberAccess(data){
  const id=data.order?.id,token=data.accessToken||access?.token;
  if(typeof id!=='string'||typeof token!=='string'||!token)throw new Error(t.genericError);
  access={id,token};history.replaceState(null,'',secureLink());
  document.querySelectorAll('header .lang-option[data-lang]').forEach(a=>{
   const u=new URL(a.href);
   if(u.origin!==location.origin||!u.pathname.endsWith('/'+filename('gutscheine-kaufen',a.dataset.lang)))return;
   u.search='';u.hash=new URLSearchParams({order:id,token}).toString();a.href=u.href;
  });
 }
 function withdrawalDeadline(order){
  if(order.withdrawUntil){const n=typeof order.withdrawUntil==='number'?order.withdrawUntil:Date.parse(order.withdrawUntil);return n<1e12?n*1000:n;}
  return null;
 }
 function showOrder(data){
  lastResponse=data;rememberAccess(data);const o=data.order,v=data.voucher;
  purchase.hidden=true;status.hidden=false;
  const active=o.status==='active'&&o.paymentStatus==='paid';
  const requested=o.status==='withdrawal_requested',refunded=o.status==='refunded';
  const title=refunded?t.refundedTitle:requested?t.withdrawnTitle:active?t.activeTitle:t.statusTitle;
  const text=refunded?t.refundedText:requested?t.withdrawnText:active?t.activeText:t.pendingText;
  const until=withdrawalDeadline(o),mayWithdraw=!requested&&!refunded&&(until===null||until>=Date.now());
  let body=`<p class="gv-kicker">${e(t.ref)} ${e(o.reference)}</p><h1 tabindex="-1">${e(title)}</h1><p>${e(text)}</p><div class="gv-error" id="voucher-status-error" role="alert" tabindex="-1"></div>`;
  if(o.deliveryMethod==='post'){
   const address=o.shippingAddress||{},shippingState=o.shippedAt?t.postSent:active?t.postPreparing:t.postPending;
   body+=`<section class="gv-shipping-status"><h2>${e(t.shippingAddressLabel)}</h2><address>${[address.name,address.street,[address.postalCode,address.city].filter(Boolean).join(' '),t.shippingAustria].map(e).join('<br>')}</address>${!requested&&!refunded?`<p>${e(shippingState)}</p>`:''}<div class="gv-summary-line"><span>${e(t.credit)}</span><strong>${e(money(o.amountCents))}</strong></div><div class="gv-summary-line"><span>${e(t.shippingFee)}</span><strong>${e(money(o.shippingCents??480))}</strong></div><div class="gv-summary-line gv-summary-line--total"><span>${e(t.total)}</span><strong>${e(money(o.totalCents??o.amountCents+(o.shippingCents??480)))}</strong></div><p class="gv-micro">${e(t.postHint)}</p></section>`;
  }
  if(data.emailSent===false)body+=`<div class="gv-alert">${e(t.mailFailed)}</div>`;
  if(active&&v&&v.code){
   body+=`<p class="gv-micro">${e(t.code)}</p><div class="gv-code">${e(v.code)}</div><div class="gv-summary-line"><span>${e(t.balance)}</span><strong>${e(money(v.balanceCents))}</strong></div><div class="gv-status-actions"><a class="gv-button" id="voucher-pdf" href="/api/vouchers/orders/${encodeURIComponent(access.id)}/pdf?token=${encodeURIComponent(access.token)}" referrerpolicy="no-referrer" download>${e(t.download)} ↓</a></div>`;
  }else if(!requested&&!refunded&&o.paymentStatus!=='paid'){
   const transfer=data.transfer;
   if(transfer){body+=`<div class="gv-status-grid"><div class="gv-bank-details"><dl class="gv-transfer">${[[t.recipient,transfer.recipient],[t.iban,transfer.iban],[t.bic,transfer.bic],[t.total,money(transfer.amountCents)],[t.reference,transfer.reference]].map(([label,value])=>`<div><dt>${e(label)}</dt><dd>${e(value)}</dd></div>`).join('')}</dl><div class="gv-copy-actions"><button type="button" id="voucher-copy-iban" class="gv-button gv-button--light">${e(t.copyIban)}</button><button type="button" id="voucher-copy-bank" class="gv-button gv-button--light">${e(t.copyBank)}</button></div><textarea id="voucher-bank-copy-field" class="gv-copy-selection" readonly rows="5" aria-label="${e(t.copyBank)}" hidden></textarea><p id="voucher-bank-copy-feedback" class="gv-copy-feedback gv-micro" role="status"></p></div><div class="gv-qr"><canvas id="voucher-bank-qr" role="img" aria-label="${e(t.qrHint)}"></canvas><p id="voucher-qr-hint">${e(t.qrHint)}</p></div></div>`;}
  }
  body+=`<div class="gv-status-actions"><button type="button" id="voucher-refresh" class="gv-button gv-button--light">${e(t.refresh)}</button><a id="voucher-contact-email" class="gv-text-link" href="mailto:info@liza-memories-photography.com?subject=${encodeURIComponent(t.ref+' '+o.reference)}">${e(t.statusEmail)}</a></div><div class="gv-contact-fallback"><p class="gv-micro">${e(t.emailFallback)}</p><div class="gv-copy-actions"><span class="gv-contact-address">info@liza-memories-photography.com</span><button type="button" id="voucher-copy-email" class="gv-button gv-button--light">${e(t.copyEmail)}</button></div><input id="voucher-email-copy-field" class="gv-copy-selection" readonly aria-label="${e(t.copyEmail)}" hidden><p id="voucher-email-copy-feedback" class="gv-copy-feedback gv-micro" role="status"></p></div><div class="gv-secure-link"><strong>${e(t.secureTitle)}</strong><p class="gv-micro">${e(t.secureText)}</p><input readonly id="voucher-order-link" aria-label="${e(t.secureTitle)}" value="${e(secureLink())}"><button type="button" id="voucher-copy-link" class="gv-button gv-button--light">${e(t.copyLink)}</button></div>`;
  if(mayWithdraw){
   body+=`<details class="gv-withdrawal"><summary>${e(t.withdrawTitle)}</summary><p>${e(o.deliveryMethod==='post'?t.postWithdrawText:t.withdrawText)}</p><form id="voucher-withdraw-form"><label class="gv-checkbox"><input type="checkbox" name="confirmed" required><span>${e(t.withdrawConfirm)}</span></label><button type="submit" class="gv-button">${e(t.withdrawSubmit)}</button></form></details>`;
  }else if(!requested&&!refunded){body+=`<p class="gv-micro">${e(t.expiredWithdraw)}</p>`;}
  status.innerHTML=body;
  const canvas=document.getElementById('voucher-bank-qr');if(canvas){try{globalThis.LizaBankQr.draw(canvas,data.transfer);}catch{canvas.hidden=true;document.getElementById('voucher-qr-hint').textContent=t.qrError;}}
  document.getElementById('voucher-refresh').addEventListener('click',refresh);
  document.getElementById('voucher-copy-email').addEventListener('click',event=>copyText('info@liza-memories-photography.com',event.currentTarget,document.getElementById('voucher-email-copy-field'),document.getElementById('voucher-email-copy-feedback')));
  for(const [id,value] of data.transfer?[
   ['voucher-copy-iban',data.transfer.iban],
   ['voucher-copy-bank',[[t.recipient,data.transfer.recipient],[t.iban,data.transfer.iban],[t.bic,data.transfer.bic],[t.total,money(data.transfer.amountCents)],[t.reference,data.transfer.reference]].map(([label,value])=>label+': '+value).join('\n')]
  ]:[])document.getElementById(id)?.addEventListener('click',event=>copyText(value,event.currentTarget,document.getElementById('voucher-bank-copy-field'),document.getElementById('voucher-bank-copy-feedback')));
  document.getElementById('voucher-copy-link').addEventListener('click',async event=>{const button=event.currentTarget;try{await navigator.clipboard.writeText(secureLink());button.textContent=t.copied;}catch{const field=document.getElementById('voucher-order-link');field.focus();field.select();}});
  document.getElementById('voucher-withdraw-form')?.addEventListener('submit',async event=>{
   event.preventDefault();const button=event.currentTarget.querySelector('button');if(!event.currentTarget.reportValidity())return;button.disabled=true;
   try{const result=await api('/'+encodeURIComponent(access.id)+'/withdraw',{method:'POST',body:JSON.stringify({token:access.token,confirmed:true})});if(result.order)showOrder(result);else await refresh();}
   catch(failure){alertError(failure.message,document.getElementById('voucher-status-error'));button.disabled=false;}
  });
 }
 async function refresh(){
  const button=document.getElementById('voucher-refresh');if(button)button.disabled=true;
  try{showOrder(await api('/'+encodeURIComponent(access.id)+'?token='+encodeURIComponent(access.token)));}
  catch(failure){const target=document.getElementById('voucher-status-error');if(target)alertError(failure.message,target);else status.innerHTML='<div class="gv-error">'+e(failure.message)+'</div><a href="mailto:info@liza-memories-photography.com">'+e(t.statusEmail)+'</a>';}
  finally{if(button?.isConnected)button.disabled=false;}
 }
 async function idempotencyKey(payload){
  const bytes=new TextEncoder().encode(JSON.stringify(payload)),digest=await crypto.subtle.digest('SHA-256',bytes),signature=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
  let previous;try{previous=JSON.parse(sessionStorage.getItem('liza-gift-submit')||'null');}catch{}
  if(previous?.signature===signature&&typeof previous.key==='string')return previous.key;
  const key=crypto.randomUUID();try{sessionStorage.setItem('liza-gift-submit',JSON.stringify({signature,key}));}catch{}
  return key;
 }
 form.addEventListener('submit',async event=>{
  event.preventDefault();updatePreview();if(!form.reportValidity())return;
  const button=form.querySelector('[type="submit"]');button.disabled=true;button.textContent=t.sending;error.textContent='';
  const buyerAddress=[input('street').value.trim(),input('postal').value.trim()+' '+input('city').value.trim(),input('country').value.trim()].join('\n');
  const payload={amountCents:amountCents(input('amount').value),buyerName:input('buyerName').value.trim(),buyerEmail:input('buyerEmail').value.trim(),buyerAddress,giftTo:input('giftTo').value.trim(),giftFrom:input('giftFrom').value.trim(),message:input('message').value.trim(),language:lang,termsAccepted:input('termsAccepted').checked};
  payload.deliveryMethod=input('postDelivery').checked?'post':'email';
  if(payload.deliveryMethod==='post')payload.shippingAddress={name:input('shippingName').value.trim(),street:input('shippingStreet').value.trim(),postalCode:input('shippingPostal').value.trim(),city:input('shippingCity').value.trim(),country:'AT'};
  try{
   payload.idempotencyKey=await idempotencyKey(payload);
   const data=await api('',{method:'POST',body:JSON.stringify(payload)});showOrder(data);
   try{sessionStorage.removeItem('liza-gift-submit');}catch{}
   status.querySelector('h1')?.focus();status.scrollIntoView({behavior:'smooth',block:'start'});
  }catch(failure){alertError(failure.message);}
  finally{button.disabled=false;button.textContent=t.submit;}
 });
 function readLink(){
  const params=new URLSearchParams(location.hash.slice(1)),id=params.get('order'),token=params.get('token');
  if(!id&&!token)return;
  purchase.hidden=true;status.hidden=false;
  if(!id||!token){status.innerHTML='<div class="gv-error">'+e(t.noSession)+'</div>';return;}
  access={id,token};status.textContent=t.loading;refresh();
 }
 readLink();
})();
