(() => {
  const burger = document.querySelector('#burger');
  const nav = document.querySelector('nav.primary');
  const langButton = document.querySelector('#langBtn');
  const langMenu = document.querySelector('#langMenu');
  const closeNav = () => { nav?.classList.remove('open'); burger?.classList.remove('active'); burger?.setAttribute('aria-expanded', 'false'); };
  burger?.addEventListener('click', () => { const open = burger.getAttribute('aria-expanded') !== 'true'; nav?.classList.toggle('open', open); burger.classList.toggle('active', open); burger.setAttribute('aria-expanded', String(open)); });
  nav?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeNav));
  langButton?.addEventListener('click', () => { const open = langMenu.classList.toggle('open'); langButton.setAttribute('aria-expanded', String(open)); });
  document.addEventListener('click', e => { if (!e.target.closest('#langSwitch')) { langMenu?.classList.remove('open'); langButton?.setAttribute('aria-expanded', 'false'); } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeNav(); langMenu?.classList.remove('open'); langButton?.setAttribute('aria-expanded', 'false'); } });
  document.querySelectorAll('.lang-option[data-lang]').forEach(a => {
    const target = new URL(a.href);
    for (const name of ['gallery', 'token', 'purpose', 'payment', 'order', 'paypalOrder', 'paypalReturn', 'paypalCancel', 'PayerID']) if (new URL(location.href).searchParams.has(name)) target.searchParams.set(name, new URL(location.href).searchParams.get(name));
    target.hash = location.hash;
    a.href = target.href;
  });
})();

