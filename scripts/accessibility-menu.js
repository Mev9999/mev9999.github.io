(() => {
  const header = document.querySelector('header.site, header.site-header');
  const nav = header?.querySelector('nav.primary, .nav-links.primary');
  const burger = header?.querySelector('#burger');
  if (!header || !nav || !burger) return;
  const mobile = matchMedia('(max-width:640px)');
  const measure = () => header.style.setProperty('--actual-header-height', `${header.getBoundingClientRect().height}px`);
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(header);
  else window.addEventListener('resize', measure);
  window.visualViewport?.addEventListener('resize', measure);
  measure();
  nav.id ||= 'mobile-nav';
  burger.setAttribute('aria-controls', nav.id);
  const groups = [];
  for (const [group, itemClass] of [
    ['services', 'service-page-link'], ['portfolio', 'portfolio-page-link'],
    ['price', 'price-page-link'], ['faq', 'faq-page-link']
  ]) {
    const row = nav.querySelector(`.${group}-dropdown`);
    const links = [...nav.querySelectorAll(`.${itemClass}`)];
    if (!row || !links.length) continue;
    let toggle = row.querySelector('.mobile-submenu-toggle');
    if (!toggle) {
      toggle = document.createElement('button');
      toggle.type = 'button';toggle.className = 'mobile-submenu-toggle';row.append(toggle);
    }
    const prefix = ({de:'Untermenü',en:'Submenu',bs:'Podmeni'})[document.documentElement.lang] || 'Submenu';
    toggle.setAttribute('aria-label', `${prefix}: ${row.querySelector('a').textContent.trim()}`);
    links.forEach((link, index) => {
      link.id ||= `mobile-${group}-${index}`;
      link.classList.add('mobile-group-link');
    });
    toggle.setAttribute('aria-controls', links.map(link => link.id).join(' '));
    function setExpanded(expanded) {
      toggle.setAttribute('aria-expanded', String(expanded));
      toggle.textContent = expanded ? '−' : '+';
      links.forEach(link => {link.hidden = mobile.matches && !expanded;});
    }
    toggle.addEventListener('click', () => setExpanded(toggle.getAttribute('aria-expanded') !== 'true'));
    groups.push(setExpanded);
    setExpanded(false);
  }
  function closeMenu(returnFocus) {
    nav.classList.remove('open');burger.classList.remove('active');
    burger.setAttribute('aria-expanded', 'false');
    groups.forEach(setExpanded => setExpanded(false));
    if (returnFocus) burger.focus({preventScroll:true});
  }
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && mobile.matches && nav.classList.contains('open') && !document.querySelector('dialog[open]')) {
      event.preventDefault();closeMenu(true);
    }
  });
  new MutationObserver(() => {
    if (burger.getAttribute('aria-expanded') === 'false') groups.forEach(setExpanded => setExpanded(false));
  }).observe(burger, {attributes:true, attributeFilter:['aria-expanded']});
  mobile.addEventListener('change', () => {closeMenu(false);measure();});
})();
