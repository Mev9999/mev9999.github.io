// A paid gift voucher is payment credit; partner codes remain a separate discount field.
export function addGiftInquiryField(document, lang='de') {
  const form=document.querySelector('#contact-form-card');
  if(!form || form.querySelector('[name="geschenkgutschein"]'))return;
  const text={de:['Geschenkgutschein (optional)','Deinen Gutscheincode eingeben','Ich prüfe dein Guthaben bei der Buchung. Deine Anfrage verbraucht noch kein Guthaben.'],en:['Gift voucher (optional)','Enter your gift voucher code','I will check your credit when booking. Sending an enquiry does not use your credit.'],bs:['Poklon-bon (opcionalno)','Unesi kod poklon-bona','Provjeravam iznos prilikom rezervacije. Slanje upita ne troši sredstva.']}[lang]||[];
  const field=document.createElement('div');field.className='gift-inquiry-field';
  const label=document.createElement('label');label.htmlFor='gift-voucher-code';label.textContent=text[0];
  const input=document.createElement('input');input.id='gift-voucher-code';input.name='geschenkgutschein';input.type='text';input.maxLength=64;input.autocomplete='off';input.setAttribute('autocapitalize','characters');input.spellcheck=false;input.placeholder=text[1];
  const hint=document.createElement('p');hint.className='contact-field-hint';hint.id='gift-voucher-hint';hint.textContent=text[2];input.setAttribute('aria-describedby',hint.id);field.append(label,input,hint);
  const partner=form.querySelector('[name="partner_vorteilscode"]')?.parentElement;
  if(partner)partner.after(field);else form.querySelector('textarea')?.parentElement.before(field);
}
