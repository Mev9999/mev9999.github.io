(() => {
  'use strict';
  const lang = ['de', 'en', 'bs'].includes(document.documentElement.lang) ? document.documentElement.lang : 'de';
  const labels = {
    de: {set: 'Dreierpaket', sets: 'Dreierpakete', single: 'Einzelbild', singles: 'Einzelbilder', sending: 'Anfrage wird gesendet …', sent: 'Anfrage gesendet', success: 'Vielen Dank! Deine Anfrage wurde übermittelt. Ich melde mich persönlich bei dir. Ein Termin ist damit noch nicht verbindlich gebucht.', error: 'Die Anfrage konnte nicht gesendet werden. Deine Angaben bleiben erhalten. Bitte versuche es erneut oder schreibe an info@liza-memories-photography.com.', network: 'Der Versand konnte nicht bestätigt werden. Bitte prüfe deine Internetverbindung und versuche es erneut oder schreibe an info@liza-memories-photography.com.'},
    en: {set: 'set of three', sets: 'sets of three', single: 'single image', singles: 'single images', sending: 'Sending enquiry …', sent: 'Enquiry sent', success: 'Thank you! Your enquiry has been submitted. I will get back to you personally. This does not yet constitute a confirmed booking.', error: 'Your enquiry could not be sent. Your details have been kept in the form. Please try again or email info@liza-memories-photography.com.', network: 'We could not confirm that your enquiry was sent. Please check your connection and try again, or email info@liza-memories-photography.com.'},
    bs: {set: 'paket od tri', sets: 'paketa od tri', single: 'pojedinačna fotografija', singles: 'pojedinačne fotografije', sending: 'Upit se šalje …', sent: 'Upit je poslan', success: 'Hvala! Vaš upit je proslijeđen. Javit ću vam se lično. Termin time još nije obavezujuće rezervisan.', error: 'Upit nije poslan. Vaši podaci su ostali u obrascu. Pokušajte ponovo ili pišite na info@liza-memories-photography.com.', network: 'Slanje upita nije moglo biti potvrđeno. Provjerite internetsku vezu i pokušajte ponovo ili pišite na info@liza-memories-photography.com.'}
  }[lang];
  const burger = document.getElementById('burger');
  const nav = document.getElementById('mobile-nav');
  burger?.addEventListener('click', () => {
    const open = !nav.classList.contains('open');
    nav.classList.toggle('open', open);
    burger.classList.toggle('active', open);
    burger.setAttribute('aria-expanded', String(open));
  });
  nav?.addEventListener('click', e => {
    if (!e.target.closest('a')) return;
    nav.classList.remove('open');
    burger?.classList.remove('active');
    burger?.setAttribute('aria-expanded', 'false');
  });
  const langBtn = document.getElementById('langBtn');
  const langMenu = document.getElementById('langMenu');
  langBtn?.addEventListener('click', () => {
    const open = !langMenu.classList.contains('open');
    langMenu.classList.toggle('open', open);
    langBtn.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', e => {
    if (e.target.closest('#langSwitch')) return;
    langMenu?.classList.remove('open');
    langBtn?.setAttribute('aria-expanded', 'false');
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && langMenu?.classList.contains('open')) {
      langMenu.classList.remove('open');
      langBtn.setAttribute('aria-expanded', 'false');
      langBtn.focus();
    }
  });
  const count = document.getElementById('kita-count');
  const total = document.getElementById('kita-total');
  const calculation = document.getElementById('kita-calculation');
  const updatePrice = () => {
    const n = Math.max(1, Math.min(6, Number(count?.value) || 1));
    const triples = Math.floor(n / 3), singles = n % 3;
    total.textContent = `${triples * 25 + singles * 10} €`;
    calculation.textContent = [triples ? `${triples} ${triples === 1 ? labels.set : labels.sets}` : '', singles ? `${singles} ${singles === 1 ? labels.single : labels.singles}` : ''].filter(Boolean).join(' + ');
  };
  count?.addEventListener('change', updatePrice);
  if (count) updatePrice();
  const form = document.getElementById('kita-inquiry-form');
  if (!form) return;
  const status = document.getElementById('kita-form-status');
  const submit = form.querySelector('button[type="submit"]');
  const submitLabel = submit.innerHTML;
  let sending = false;
  let submitted = false;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending || submitted || !form.reportValidity()) return;
    sending = true;
    submit.disabled = true;
    submit.setAttribute('aria-busy', 'true');
    form.setAttribute('aria-busy', 'true');
    submit.textContent = labels.sending;
    status.textContent = labels.sending;
    status.hidden = false;
    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: {Accept: 'application/json'}
      });
      if (!response.ok) {
        status.textContent = labels.error;
        return;
      }
      submitted = true;
      status.textContent = labels.success;
      form.reset();
      document.dispatchEvent(new CustomEvent('liza:conversion', {detail: {
        event: 'lead_success', service: 'kindergarten', package: '', language: lang,
        source_page: lang === 'de' ? 'kindergartenfotografie-graz.html' : `kindergartenfotografie-graz-${lang}.html`
      }}));
    } catch {
      status.textContent = labels.network;
    } finally {
      sending = false;
      submit.disabled = submitted;
      submit.removeAttribute('aria-busy');
      form.removeAttribute('aria-busy');
      if (submitted) submit.textContent = labels.sent;
      else submit.innerHTML = submitLabel;
    }
  });
})();
