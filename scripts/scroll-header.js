(() => {
  const header = document.querySelector('header.site, header.site-header');
  if (!header) return;
  const style = document.getElementById('scroll-header-style') || document.createElement('style');
  style.id = 'scroll-header-style';
  style.textContent = `
    header.scroll-aware-header {transition:transform .22s ease,opacity .22s ease}
    header.scroll-aware-header.header-idle-hidden {transform:translateY(-110%);opacity:0;pointer-events:none}
    @media(prefers-reduced-motion:reduce){header.scroll-aware-header {transition:none}}
  `;
  document.head.append(style);
  header.classList.add('scroll-aware-header');
  let timer;
  let pointerInside = false;
  const show = () => header.classList.remove('header-idle-hidden');
  const inUse = () => pointerInside || header.querySelector('[aria-expanded="true"], :focus-visible');
  function scheduleHide() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (window.scrollY > 24 && !inUse()) header.classList.add('header-idle-hidden');
    }, 900);
  }
  window.addEventListener('scroll', () => {
    show();
    scheduleHide();
  }, {passive:true});
  header.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'mouse') return;
    pointerInside = true;
    clearTimeout(timer);
    show();
  });
  header.addEventListener('pointerleave', () => {pointerInside = false; scheduleHide();});
  header.addEventListener('focusin', () => {show(); scheduleHide();});
  header.addEventListener('focusout', scheduleHide);
  new MutationObserver(() => {show(); scheduleHide();}).observe(header, {
    subtree:true, attributes:true, attributeFilter:['aria-expanded']
  });
  window.addEventListener('pageshow', () => {show(); scheduleHide();});
  scheduleHide();
})();
