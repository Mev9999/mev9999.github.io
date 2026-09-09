(() => {
  const LANGUAGE_KEY = 'lizaLanguage';
  const DEFAULT_LANG = 'de';
  const supportedLangs = ['de', 'en', 'bs'];
  const SITE_ORIGIN = 'https://liza-memories-photography.com/';
  const BUSINESS_MAP_URL = 'https://maps.app.goo.gl/Absk5FRMgyCuUwxe9';
  const BUSINESS_OPENING_HOURS = [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: [
        'https://schema.org/Monday',
        'https://schema.org/Tuesday',
        'https://schema.org/Wednesday',
        'https://schema.org/Thursday',
        'https://schema.org/Friday'
      ],
      opens: '16:00',
      closes: '18:00'
    },
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: [
        'https://schema.org/Saturday',
        'https://schema.org/Sunday'
      ],
      opens: '08:00',
      closes: '18:00'
    }
  ];
  const LANGUAGE_SUFFIX_PATTERN = /-(en|bs)\.html$/i;
  const HOME_PROMO_SCRIPT_ID = 'homePromoScript';

  const pageByFile = {
    'ueber-mich.html': 'about',
    'portraitfotografie-graz.html': 'portrait',
    'babybauch-shooting-graz.html': 'babybauch',
    'babybauch-und-neugeborenen-shooting-graz.html': 'combo',
    'newborn-fotografie-graz.html': 'newborn',
    'familienfotografie-graz.html': 'familie',
    'hochzeitsfotograf-graz.html': 'hochzeit'
  };
  const serviceLinks = [
    { key: 'maternity', href: 'babybauch-shooting-graz.html' },
    { key: 'newborn', href: 'newborn-fotografie-graz.html' },
    { key: 'combo', href: 'babybauch-und-neugeborenen-shooting-graz.html' },
    { key: 'family', href: 'familienfotografie-graz.html' },
    { key: 'wedding', href: 'hochzeitsfotograf-graz.html' },
    { key: 'portrait', href: 'portraitfotografie-graz.html' }
  ];
  const priceAnchorByPage = {
    portrait: 'portrait',
    babybauch: 'babybauch',
    newborn: 'neugeborene',
    familie: 'familie',
    combo: 'kombi',
    hochzeit: 'hochzeit'
  };

  function stripLanguageSuffix(fileName){
    return fileName.replace(LANGUAGE_SUFFIX_PATTERN, '.html');
  }

  function normalizeHtmlPath(fileName){
    return (fileName || '').replace(/^\/+/, '') || 'index.html';
  }

  function getLanguageFromFile(fileName){
    const match = normalizeHtmlPath(fileName).match(LANGUAGE_SUFFIX_PATTERN);
    return match ? match[1].toLowerCase() : DEFAULT_LANG;
  }

  function isHomeFile(fileName){
    return stripLanguageSuffix(normalizeHtmlPath(fileName)).toLowerCase() === 'index.html';
  }

  function buildLocalizedFileName(fileName, lang){
    const normalizedFile = stripLanguageSuffix(normalizeHtmlPath(fileName));
    if(isHomeFile(normalizedFile)){
      return lang === DEFAULT_LANG ? 'index.html' : `index-${lang}.html`;
    }
    if(lang === DEFAULT_LANG){
      return normalizedFile;
    }
    return normalizedFile.replace(/\.html$/i, `-${lang}.html`);
  }

  function buildLocalizedHref(fileName, lang){
    if(isHomeFile(fileName)){
      return lang === DEFAULT_LANG ? '/' : `index-${lang}.html`;
    }
    return buildLocalizedFileName(fileName, lang);
  }

  function buildAbsoluteUrlForLanguage(fileName, lang){
    return new URL(buildLocalizedHref(fileName, lang), SITE_ORIGIN).toString();
  }

  function buildAbsoluteUrl(fileName){
    return buildAbsoluteUrlForLanguage(fileName, getLanguageFromFile(fileName));
  }

  const currentFileName = window.location.pathname.split('/').pop() || 'babybauch-shooting-graz.html';
  const baseFileName = stripLanguageSuffix(currentFileName);
  const urlLanguage = getLanguageFromFile(currentFileName);
  const staticLang = (document.documentElement.getAttribute('data-static-lang') || '').toLowerCase();
  const pageKey = pageByFile[baseFileName];

  function ensureHomePromoScript(){
    if(document.getElementById(HOME_PROMO_SCRIPT_ID)){
      return;
    }

    const script = document.createElement('script');
    script.id = HOME_PROMO_SCRIPT_ID;
    script.src = 'scripts/home-promo.js';
    script.defer = true;
    document.head.appendChild(script);
  }

  ensureHomePromoScript();

  if(!pageKey){
    return;
  }

  const menuLabels = {
    de: 'Men\u00fc \u00f6ffnen',
    en: 'Open menu',
    bs: 'Otvori meni'
  };

  const siteHeaderNav = document.querySelector('.site-header .nav');
  const mobileNav = siteHeaderNav?.querySelector('.nav-links');

  function ensureServiceLinks(){
    const lang = supportedLangs.includes(staticLang) ? staticLang : urlLanguage || DEFAULT_LANG;
    const menu = mobileNav?.querySelector('.services-dropdown .nav-dropdown-menu');
    if(menu){
      menu.replaceChildren(...serviceLinks.map((service) => {
        const link = document.createElement('a');
        link.href = buildLocalizedHref(service.href, lang);
        link.textContent = common[lang].services[service.key];
        link.dataset.serviceKey = service.key;
        return link;
      }));
    }

    const footerLinks = document.querySelector('.footer-primary-links');
    if(footerLinks){
      const portfolio = footerLinks.querySelector('a');
      const links = serviceLinks.map((service) => {
        const link = document.createElement('a');
        link.href = buildLocalizedHref(service.href, lang);
        link.textContent = common[lang].services[service.key];
        link.dataset.serviceKey = service.key;
        return link;
      });
      footerLinks.replaceChildren(...(portfolio ? [portfolio, ...links] : links));
    }
  }



  if(siteHeaderNav && mobileNav){
    mobileNav.id = mobileNav.id || 'mobile-nav';
    mobileNav.classList.add('primary');

    const servicesDropdown = mobileNav.querySelector('.services-dropdown');
    if(servicesDropdown && !mobileNav.querySelector('.service-page-link')){
      const servicesFragment = document.createDocumentFragment();
      servicesDropdown.querySelectorAll('.nav-dropdown-menu a').forEach((link) => {
        const clone = link.cloneNode(true);
        clone.classList.add('service-page-link');
        servicesFragment.appendChild(clone);
      });
      servicesDropdown.after(servicesFragment);
    }

    const portfolioDropdown = mobileNav.querySelector('.portfolio-dropdown');
    if(portfolioDropdown && !mobileNav.querySelector('.portfolio-page-link')){
      const portfolioFragment = document.createDocumentFragment();
      portfolioDropdown.querySelectorAll('.nav-dropdown-menu a').forEach((link) => {
        const clone = link.cloneNode(true);
        clone.classList.add('portfolio-page-link');
        portfolioFragment.appendChild(clone);
      });
      portfolioDropdown.after(portfolioFragment);
    }

    if(!document.getElementById('burger')){
      const burger = document.createElement('button');
      burger.className = 'burger';
      burger.id = 'burger';
      burger.type = 'button';
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-controls', mobileNav.id);
      burger.setAttribute('aria-label', menuLabels[urlLanguage] || menuLabels[DEFAULT_LANG]);
      burger.innerHTML = '<span></span><span></span><span></span>';
      const brand = siteHeaderNav.querySelector('.brand');
      siteHeaderNav.insertBefore(burger, brand || mobileNav);
    }
  }

  const common = {
    de: {
      languageLabel: 'Sprache wählen',
      nav: { home: 'Home', about: 'Über mich', services: 'Leistungen', portfolio: 'Portfolio', gallery1: 'Babybauch Galerie', gallery2: 'Neugeborenen Galerie', gallery3: 'Familien Galerie', gallery4: 'Hochzeits Galerie', pricing: 'Preise', faq: 'Häufige Fragen', contact: 'Kontakt' },
      services: { portrait: 'Porträt', maternity: 'Babybauch', newborn: 'Neugeborene', family: 'Familie', combo: 'Babybauch & Neugeborene', wedding: 'Hochzeit' },
      breadcrumbs: { aria: 'Breadcrumb', home: 'Startseite', services: 'Leistungen' },
      contact: { email: 'E-Mail', phone: 'Telefon', location: 'Standort', more: 'Weitere Leistungen', locationValue: '8054 Graz' },
      footer: {
        portfolio: 'Portfolio',
        service1: 'Babybauch',
        service2: 'Neugeborene',
        service3: 'Familie',
        service4: 'Hochzeit',
        cta: 'Jetzt anfragen',
        contact: 'Kontakt',
        imprint: 'Impressum',
        privacy: 'Datenschutz',
        terms: 'AGB',
        copyright: '© {year} LiZa Memories Photography. Alle Rechte vorbehalten.'
      }
    },
    en: {
      languageLabel: 'Choose language',
      nav: { home: 'Home', about: 'About', services: 'Services', portfolio: 'Portfolio', gallery1: 'Maternity Gallery', gallery2: 'Newborn Gallery', gallery3: 'Family Gallery', gallery4: 'Wedding Gallery', pricing: 'Pricing', faq: 'FAQs', contact: 'Contact' },
      services: { portrait: 'Portrait', maternity: 'Maternity', newborn: 'Newborn', family: 'Family', combo: 'Maternity & Newborn', wedding: 'Wedding' },
      breadcrumbs: { aria: 'Breadcrumb', home: 'Home', services: 'Services' },
      contact: { email: 'Email', phone: 'Phone', location: 'Location', more: 'More services', locationValue: '8054 Graz' },
      footer: {
        portfolio: 'Portfolio',
        service1: 'Maternity',
        service2: 'Newborn',
        service3: 'Family',
        service4: 'Wedding',
        cta: 'Inquire now',
        contact: 'Contact',
        imprint: 'Imprint',
        privacy: 'Privacy',
        terms: 'Terms',
        copyright: '© {year} LiZa Memories Photography. All rights reserved.'
      }
    },
    bs: {
      languageLabel: 'Odaberi jezik',
      nav: { home: 'Početna', about: 'O meni', services: 'Usluge', portfolio: 'Portfolio', gallery1: 'Trudnička galerija', gallery2: 'Galerija novorođenčadi', gallery3: 'Porodična galerija', gallery4: 'Galerija vjenčanja', pricing: 'Cijene', faq: 'Česta pitanja', contact: 'Kontakt' },
      services: { portrait: 'Portret', maternity: 'Trudničko', newborn: 'Novorođenčad', family: 'Porodica', combo: 'Trudničko & novorođenče', wedding: 'Vjenčanje' },
      breadcrumbs: { aria: 'Breadcrumb', home: 'Početna', services: 'Usluge' },
      contact: { email: 'E-mail', phone: 'Telefon', location: 'Lokacija', more: 'Ostale usluge', locationValue: '8054 Graz' },
      footer: {
        portfolio: 'Portfolio',
        service1: 'Trudničko',
        service2: 'Novorođenčad',
        service3: 'Porodica',
        service4: 'Vjenčanje',
        cta: 'Pošalji upit',
        contact: 'Kontakt',
        imprint: 'Impresum',
        privacy: 'Zaštita podataka',
        terms: 'Uslovi',
        copyright: '© {year} LiZa Memories Photography. Sva prava zadržana.'
      }
    }
  };

  ensureServiceLinks();

  const pages = {};

  const refs = {
    siteHeaderNav,
    burger: document.getElementById('burger'),
    mobileNav,
    navLinks: document.querySelectorAll('.nav-links > a:not(.nav-icon-link):not(.service-page-link):not(.portfolio-page-link):not(.price-page-link):not(.faq-page-link), .nav-links > .nav-dropdown > a'),
    servicesMenuLinks: document.querySelectorAll('.services-dropdown .nav-dropdown-menu a'),
    portfolioMenuLinks: document.querySelectorAll('.portfolio-dropdown .nav-dropdown-menu a'),
    mobileServiceLinks: document.querySelectorAll('.service-page-link'),
    mobilePortfolioLinks: document.querySelectorAll('.portfolio-page-link'),
    breadcrumbs: document.querySelector('.breadcrumbs'),
    breadcrumbLinks: document.querySelectorAll('.breadcrumbs a'),
    breadcrumbCurrent: document.querySelector('.breadcrumbs li[aria-current="page"]'),
    heroEyebrow: document.querySelector('.hero .eyebrow'),
    heroTitle: document.querySelector('.hero h1'),
    heroLead: document.querySelector('.hero .lead'),
    heroButtons: document.querySelectorAll('.hero .hero-actions a'),
    heroPoints: document.querySelectorAll('.hero-points div'),
    heroImage: document.querySelector('.hero-visual img'),
    section1Head: document.querySelector('[data-section-head="section1"]') || document.querySelectorAll('.section-head')[0],
    section2Head: document.querySelector('[data-section-head="section2"]') || document.querySelectorAll('.section-head')[1],
    galleryTitle: document.querySelector('[data-gallery-title]'),
    gallerySub: document.querySelector('[data-gallery-sub]'),
    cards: document.querySelectorAll('.grid-2 .card'),
    aboutStoryCard: document.querySelector('.about-story-card'),
    faqItems: document.querySelectorAll('.faq-item'),
    ctaTitle: document.querySelector('.cta-band h2'),
    ctaText: document.querySelector('.cta-band p'),
    ctaButtons: document.querySelectorAll('.cta-band .hero-actions a'),
    contactTitle: document.querySelector('.contact-card h2'),
    contactDetails: document.querySelectorAll('.contact-detail'),
    headerCta: document.querySelector('[data-header-cta]'),
    footerCopy: document.querySelector('[data-footer-copy]'),
    footerPrimaryLinks: document.querySelectorAll('.footer-primary-links a'),
    footerSecondaryLinks: document.querySelectorAll('.footer-secondary-links a'),
    footerCta: document.querySelector('[data-footer-cta]'),
    titleTag: document.querySelector('title'),
    metaDescription: document.querySelector('meta[name="description"]'),
    ogTitle: document.querySelector('meta[property="og:title"]'),
    ogDescription: document.querySelector('meta[property="og:description"]'),
    ogUrl: document.querySelector('meta[property="og:url"]'),
    canonicalLink: document.querySelector('link[rel="canonical"]'),
    langSwitch: document.getElementById('langSwitch'),
    langBtn: document.getElementById('langBtn'),
    langCurrent: document.getElementById('langCurrent'),
    langMenu: document.getElementById('langMenu'),
    langOptions: document.querySelectorAll('.lang-option'),
    primarySchema: document.querySelector('script[type="application/ld+json"]')
  };

  function setText(node, value){
    if(node && typeof value === 'string'){
      node.textContent = value;
    }
  }

  function setHTML(node, value){
    if(node && typeof value === 'string'){
      node.innerHTML = value;
    }
  }

  function setMeta(node, value){
    if(node && value){
      node.setAttribute('content', value);
    }
  }

  function setBurgerLabel(lang){
    if(refs.burger){
      refs.burger.setAttribute('aria-label', menuLabels[lang] || menuLabels[DEFAULT_LANG]);
    }
  }

  function closeMobileNavigation(){
    if(refs.mobileNav){
      refs.mobileNav.classList.remove('open');
    }
    if(refs.burger){
      refs.burger.classList.remove('active');
      refs.burger.setAttribute('aria-expanded', 'false');
    }
  }

  function toggleMobileNavigation(){
    if(!refs.mobileNav || !refs.burger){
      return;
    }
    refs.mobileNav.classList.toggle('open');
    refs.burger.classList.toggle('active');
    refs.burger.setAttribute('aria-expanded', refs.mobileNav.classList.contains('open') ? 'true' : 'false');
  }

  function localizeHref(href, lang){
    if(!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')){
      return href;
    }

    const [pathAndQuery, hashFragment] = href.split('#', 2);
    const [pathName, queryString] = pathAndQuery.split('?', 2);
    const normalizedPath = normalizeHtmlPath(pathName);

    if(pathName === '/' || isHomeFile(normalizedPath)){
      const localizedPath = buildLocalizedHref('index.html', lang);
      const queryPart = queryString ? `?${queryString}` : '';
      const hashPart = hashFragment ? `#${hashFragment}` : '';
      return `${localizedPath}${queryPart}${hashPart}`;
    }

    if(!/\.html$/i.test(pathName)){
      return href;
    }

    const localizedPath = buildLocalizedHref(pathName, lang);
    const queryPart = queryString ? `?${queryString}` : '';
    const hashPart = hashFragment ? `#${hashFragment}` : '';
    return `${localizedPath}${queryPart}${hashPart}`;
  }

  function updateInternalLinks(lang){
    document.querySelectorAll('a[href]').forEach((link) => {
      if(link.classList.contains('lang-option')){
        return;
      }
      const href = link.getAttribute('href');
      const localizedHref = localizeHref(href, lang);
      if(localizedHref !== href){
        link.setAttribute('href', localizedHref);
      }
    });
  }

  function ensureAlternateLink(lang, href){
    let link = document.querySelector(`link[rel="alternate"][hreflang="${lang}"]`);
    if(!link){
      link = document.createElement('link');
      link.setAttribute('rel', 'alternate');
      link.setAttribute('hreflang', lang);
      document.head.appendChild(link);
    }
    link.setAttribute('href', href);
  }

  function updateCanonicalAndAlternates(lang){
    const currentUrl = buildAbsoluteUrlForLanguage(baseFileName, lang);

    if(refs.canonicalLink){
      refs.canonicalLink.setAttribute('href', currentUrl);
    }
    setMeta(refs.ogUrl, currentUrl);

    ensureAlternateLink('de', buildAbsoluteUrlForLanguage(baseFileName, 'de'));
    ensureAlternateLink('en', buildAbsoluteUrlForLanguage(baseFileName, 'en'));
    ensureAlternateLink('bs', buildAbsoluteUrlForLanguage(baseFileName, 'bs'));
    ensureAlternateLink('x-default', buildAbsoluteUrlForLanguage(baseFileName, 'de'));
  }

  function setJsonLdScript(key, payload){
    let script = document.querySelector(`script[data-schema-key="${key}"]`);
    if(!script){
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.dataset.schemaKey = key;
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(payload);
  }

  function updateStructuredData(lang, pageStrings, commonStrings){
    const currentUrl = buildAbsoluteUrlForLanguage(baseFileName, lang);
    const businessSchema = {
      '@context': 'https://schema.org',
      '@type': pageKey === 'about' ? 'Person' : 'Service',
      ...(pageKey === 'about'
        ? {
            name: 'Emina',
            jobTitle: lang === 'en' ? 'Photographer' : lang === 'bs' ? 'Fotografkinja' : 'Fotografin',
            image: 'https://liza-memories-photography.com/about.webp',
            url: currentUrl,
              worksFor: {
                '@type': 'ProfessionalService',
                name: 'LiZa Memories Photography',
                url: SITE_ORIGIN,
                hasMap: BUSINESS_MAP_URL,
                openingHoursSpecification: BUSINESS_OPENING_HOURS
              },
              description: pageStrings.metaDescription
            }
        : {
            name: pageStrings.metaTitle.split('|')[0].trim(),
              provider: {
                '@type': 'ProfessionalService',
                name: 'LiZa Memories Photography',
                url: SITE_ORIGIN,
                hasMap: BUSINESS_MAP_URL,
                openingHoursSpecification: BUSINESS_OPENING_HOURS
              },
            areaServed: 'Graz',
            serviceType: pageStrings.breadcrumbCurrent,
            url: currentUrl,
            description: pageStrings.metaDescription
          })
    };

    if(refs.primarySchema){
      refs.primarySchema.dataset.schemaKey = 'primary';
      refs.primarySchema.textContent = JSON.stringify(businessSchema);
    }

    const breadcrumbItems = [
      {
        '@type': 'ListItem',
        position: 1,
        name: commonStrings.breadcrumbs.home,
        item: buildAbsoluteUrlForLanguage('index.html', lang)
      }
    ];

    if(pageKey !== 'about'){
      breadcrumbItems.push({
        '@type': 'ListItem',
        position: 2,
        name: commonStrings.breadcrumbs.services,
        item: `${buildAbsoluteUrlForLanguage('index.html', lang)}#services`
      });
    }

    breadcrumbItems.push({
      '@type': 'ListItem',
      position: breadcrumbItems.length + 1,
      name: pageStrings.breadcrumbCurrent,
      item: currentUrl
    });

    setJsonLdScript('breadcrumbs', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbItems
    });

    const faqItems = Array.from(document.querySelectorAll('#faq .faq-item'))
      .map((item) => {
        const question = item.querySelector('.faq-question > span:first-child, h3')?.textContent.trim();
        const answer = item.querySelector('.faq-answer p, p')?.textContent.trim();
        if(!question || !answer){
          return null;
        }
        return {
          '@type': 'Question',
          name: question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: answer
          }
        };
      })
      .filter(Boolean);

    if(faqItems.length){
      setJsonLdScript('faq', {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqItems
      });
    }
  }

  function updateLegalLinks(lang){
    if(refs.footerSecondaryLinks.length < 4){
      return;
    }

    const imprintLink = refs.footerSecondaryLinks[1];
    const privacyLink = refs.footerSecondaryLinks[2];
    const termsLink = refs.footerSecondaryLinks[3];

    imprintLink.href = buildLocalizedFileName('impressum.html', lang);
    privacyLink.href = buildLocalizedFileName('datenschutz.html', lang);
    termsLink.href = buildLocalizedFileName('agb.html', lang);
  }

  function applyLanguage(lang){
    const pageStrings = pages[pageKey][lang] || pages[pageKey][DEFAULT_LANG];
    const commonStrings = common[lang] || common[DEFAULT_LANG];

    document.documentElement.lang = lang;

    if(refs.titleTag){
      refs.titleTag.textContent = pageStrings.metaTitle;
    }
    setMeta(refs.metaDescription, pageStrings.metaDescription);
    setMeta(refs.ogTitle, pageStrings.ogTitle);
    setMeta(refs.ogDescription, pageStrings.ogDescription);
    updateCanonicalAndAlternates(lang);

    if(refs.breadcrumbs){
      refs.breadcrumbs.setAttribute('aria-label', commonStrings.breadcrumbs.aria);
    }

    setText(refs.navLinks[0], commonStrings.nav.home);
    setText(refs.navLinks[1], commonStrings.nav.about);
    setText(refs.navLinks[2], commonStrings.nav.services);
    setText(refs.navLinks[3], commonStrings.nav.portfolio);
    setText(refs.navLinks[4], commonStrings.nav.pricing);
    setText(refs.navLinks[5], commonStrings.nav.faq);
    setText(refs.navLinks[6], commonStrings.nav.contact);

    refs.servicesMenuLinks.forEach((link) => {
      setText(link, commonStrings.services[link.dataset.serviceKey] || '');
    });

    refs.mobileServiceLinks.forEach((link) => {
      setText(link, commonStrings.services[link.dataset.serviceKey] || '');
    });

    if(refs.portfolioMenuLinks.length >= 4){
      setText(refs.portfolioMenuLinks[0], commonStrings.nav.gallery1);
      setText(refs.portfolioMenuLinks[1], commonStrings.nav.gallery2);
      setText(refs.portfolioMenuLinks[2], commonStrings.nav.gallery3);
      setText(refs.portfolioMenuLinks[3], commonStrings.nav.gallery4);
    }

    if(refs.mobilePortfolioLinks.length >= 4){
      setText(refs.mobilePortfolioLinks[0], commonStrings.nav.gallery1);
      setText(refs.mobilePortfolioLinks[1], commonStrings.nav.gallery2);
      setText(refs.mobilePortfolioLinks[2], commonStrings.nav.gallery3);
      setText(refs.mobilePortfolioLinks[3], commonStrings.nav.gallery4);
    }

    setText(refs.breadcrumbLinks[0], commonStrings.breadcrumbs.home);
    setText(refs.breadcrumbLinks[1], commonStrings.breadcrumbs.services);
    setText(refs.breadcrumbCurrent, pageStrings.breadcrumbCurrent);

    setText(refs.heroEyebrow, pageStrings.hero.eyebrow);
    setText(refs.heroTitle, pageStrings.hero.title);
    setText(refs.heroLead, pageStrings.hero.lead);
    setText(refs.heroButtons[0], pageStrings.hero.primary);
    setText(refs.heroButtons[1], pageStrings.hero.secondary);
    if(refs.heroButtons[0]){
      refs.heroButtons[0].setAttribute('href', 'index.html#contact-form-card');
    }
    if(refs.heroButtons[1]){
      refs.heroButtons[1].setAttribute('href', 'index.html#portfolio');
    }
    if(refs.heroImage){
      refs.heroImage.alt = pageStrings.hero.imageAlt;
    }

    pageStrings.hero.points.forEach((point, index) => {
      const card = refs.heroPoints[index];
      if(!card){
        return;
      }
      setText(card.querySelector('strong'), point.label);
      setText(card.querySelector('span'), point.value);
    });

    const firstHead = refs.section1Head;
    const secondHead = refs.section2Head;

    if(firstHead){
      setText(firstHead.querySelector('h2'), pageStrings.section1.title);
      setText(firstHead.querySelector('p'), pageStrings.section1.sub);
    }

    if(secondHead){
      setText(secondHead.querySelector('h2'), pageStrings.section2.title);
      setText(secondHead.querySelector('p'), pageStrings.section2.sub);
    }

    if(refs.galleryTitle && pageStrings.gallery){
      setText(refs.galleryTitle, pageStrings.gallery.title);
    }

    if(refs.gallerySub && pageStrings.gallery){
      setText(refs.gallerySub, pageStrings.gallery.sub);
    }

    const firstCard = refs.cards[0];
    const secondCard = refs.cards[1];

    if(firstCard){
      setText(firstCard.querySelector('h3'), pageStrings.section1.card1.title);
      const firstCardParagraph = firstCard.querySelector('.card-copy') || firstCard.querySelector('p');
      if(firstCardParagraph){
        if(pageStrings.section1.card1.html){
          setHTML(firstCardParagraph, pageStrings.section1.card1.html);
        }else if(pageStrings.section1.card1.text){
          setText(firstCardParagraph, pageStrings.section1.card1.text);
        }
      }
      const firstCardList = firstCard.querySelector('.list');
      const firstCardItems = firstCard.querySelectorAll('li');
      const card1Items = pageStrings.section1.card1.items || [];
      if(firstCardList){
        firstCardList.style.display = card1Items.length ? '' : 'none';
      }
      card1Items.forEach((item, index) => {
        setText(firstCardItems[index], item);
      });
    }

    if(secondCard){
      setText(secondCard.querySelector('h3'), pageStrings.section1.card2.title);
      const secondCardParagraph = secondCard.querySelector('p');
      if(secondCardParagraph && pageStrings.section1.card2.text){
        setText(secondCardParagraph, pageStrings.section1.card2.text);
      }
      const stepTexts = secondCard.querySelectorAll('.timeline .step div');
      (pageStrings.section1.card2.steps || []).forEach((item, index) => {
        setText(stepTexts[index], item);
      });
    }

    if(refs.aboutStoryCard){
      setText(refs.aboutStoryCard.querySelector('h3'), pageStrings.section1.card1.title);
      const aboutCopy = refs.aboutStoryCard.querySelector('.card-copy') || refs.aboutStoryCard.querySelector('p');
      if(aboutCopy){
        if(pageStrings.section1.card1.html){
          setHTML(aboutCopy, pageStrings.section1.card1.html);
        }else if(pageStrings.section1.card1.text){
          setText(aboutCopy, pageStrings.section1.card1.text);
        }
      }
    }

  }

  function persistLanguage(lang){
    try{
      localStorage.setItem(LANGUAGE_KEY, lang);
    }catch(_error){}
  }

  function setupFaqAccordion(){
    const faqItems = Array.from(document.querySelectorAll('.faq-list .faq-item'));

    faqItems.forEach((item, index) => {
      const button = item.querySelector('.faq-question');
      const answer = item.querySelector('.faq-answer');
      if(!button || !answer){
        return;
      }

      const answerId = answer.id || `service-faq-answer-${index + 1}`;
      answer.id = answerId;
      button.setAttribute('aria-controls', answerId);
      button.setAttribute('aria-expanded', 'false');

      button.addEventListener('click', () => {
        const wasOpen = item.classList.contains('open');

        faqItems.forEach((other) => {
          other.classList.remove('open');
          const otherButton = other.querySelector('.faq-question');
          const otherAnswer = other.querySelector('.faq-answer');
          otherButton?.setAttribute('aria-expanded', 'false');
          if(otherAnswer){
            otherAnswer.style.maxHeight = '';
          }
        });

        if(!wasOpen){
          item.classList.add('open');
          button.setAttribute('aria-expanded', 'true');
          answer.style.maxHeight = `${answer.scrollHeight}px`;
        }
      });
    });
  }

  function setupGalleryLightbox(){
    const items = [];
    const triggerEntries = [];
    const itemIndexBySrc = new Map();
    const galleryFigures = Array.from(document.querySelectorAll('.gallery-item'));
    const heroVisual = document.querySelector('.hero-visual');
    const heroImage = heroVisual ? heroVisual.querySelector('img') : null;

    function registerTrigger(trigger, image){
      if(!trigger || !image){
        return;
      }

      const src = image.getAttribute('src');
      const key = src || `image-${items.length}`;
      let index = itemIndexBySrc.get(key);

      if(index === undefined){
        index = items.length;
        items.push(image);
        itemIndexBySrc.set(key, index);
      }

      triggerEntries.push({ trigger, image, index });
    }

    if(heroVisual && heroImage){
      heroVisual.classList.add('hero-visual--lightbox');
      registerTrigger(heroVisual, heroImage);
    }

    galleryFigures.forEach((figure) => {
      registerTrigger(figure, figure.querySelector('img'));
    });

    if(!items.length){
      return;
    }

    let lightbox = document.getElementById('lightbox');
    if(!lightbox){
      document.body.insertAdjacentHTML('beforeend', `
        <div class="lightbox" id="lightbox" aria-hidden="true">
          <button type="button" class="close" aria-label="Bild schließen">×</button>
          <button type="button" class="prev" aria-label="Vorheriges Bild">‹</button>
          <img src="" alt="">
          <button type="button" class="next" aria-label="Nächstes Bild">›</button>
        </div>
      `);
      lightbox = document.getElementById('lightbox');
    }

    const lbImg = lightbox.querySelector('img');
    const prev = lightbox.querySelector('.prev');
    const next = lightbox.querySelector('.next');
    const close = lightbox.querySelector('.close');
    let currentIndex = -1;

    function openLightbox(index){
      currentIndex = index;
      const activeImage = items[index];
      if(!activeImage){
        return;
      }
      lbImg.setAttribute('src', activeImage.getAttribute('src'));
      lbImg.setAttribute('alt', activeImage.getAttribute('alt') || '');
      lightbox.classList.add('open');
      lightbox.setAttribute('aria-hidden', 'false');
    }

    function closeLightbox(){
      lightbox.classList.remove('open');
      lightbox.setAttribute('aria-hidden', 'true');
    }

    function prevImg(){
      if(currentIndex <= 0){
        currentIndex = items.length;
      }
      openLightbox((currentIndex - 1) % items.length);
    }

    function nextImg(){
      openLightbox((currentIndex + 1) % items.length);
    }

    triggerEntries.forEach(({ trigger, image, index }) => {
      trigger.setAttribute('tabindex', '0');
      trigger.setAttribute('role', 'button');
      const openLabel = { de: 'Bild vergr\u00f6\u00dfern', en: 'Enlarge photo', bs: 'Uve\u0107aj fotografiju' }[document.documentElement.lang] || 'Enlarge photo';
      trigger.setAttribute('aria-label', openLabel + ': ' + (image.getAttribute('alt') || ''));
      trigger.addEventListener('click', () => openLightbox(index));
      trigger.addEventListener('keydown', (event) => {
        if(event.key === 'Enter' || event.key === ' '){
          event.preventDefault();
          openLightbox(index);
        }
      });
    });

    if(items.length < 2){
      prev.hidden = true;
      next.hidden = true;
    }

    close.addEventListener('click', closeLightbox);
    prev.addEventListener('click', prevImg);
    next.addEventListener('click', nextImg);
    lightbox.addEventListener('click', (event) => {
      if(event.target === lightbox){
        closeLightbox();
      }
    });

    document.addEventListener('keydown', (event) => {
      if(!lightbox.classList.contains('open')){
        return;
      }
      if(event.key === 'Escape'){
        closeLightbox();
      }
      if(event.key === 'ArrowLeft' && !prev.hidden){
        prevImg();
      }
      if(event.key === 'ArrowRight' && !next.hidden){
        nextImg();
      }
    });
  }

  setupFaqAccordion();
  setupGalleryLightbox();

  if(refs.burger && refs.mobileNav){
    refs.burger.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleMobileNavigation();
    });

    refs.mobileNav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        closeMobileNavigation();
      });
    });

    window.addEventListener('resize', () => {
      if(window.innerWidth > 640){
        closeMobileNavigation();
      }
    });
  }

  if(refs.langBtn && refs.langMenu){
    refs.langBtn.addEventListener('click', () => {
      const isOpen = refs.langMenu.classList.contains('open');
      refs.langMenu.classList.toggle('open');
      refs.langBtn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    });
  }

  refs.langOptions.forEach((option) => {
    option.addEventListener('click', (event) => {
      const selectedLang = option.dataset.lang;
      if(!supportedLangs.includes(selectedLang)){
        return;
      }
      const targetHref = option.getAttribute('href') || buildLocalizedHref(baseFileName, selectedLang);
      const targetPath = targetHref.split('#', 2)[0];
      const targetHash = ''; // A language change opens the page at its beginning.

      event.preventDefault();
      persistLanguage(selectedLang);
      window.location.href = `${targetPath}${targetHash}`;
    });
  });

  document.addEventListener('click', (event) => {
    if(refs.mobileNav && refs.burger && refs.siteHeaderNav && !refs.siteHeaderNav.contains(event.target)){
      closeMobileNavigation();
    }

    if(!refs.langSwitch || !refs.langMenu || !refs.langBtn){
      return;
    }
    if(!refs.langSwitch.contains(event.target)){
      refs.langMenu.classList.remove('open');
      refs.langBtn.setAttribute('aria-expanded', 'false');
    }
  });
})();
