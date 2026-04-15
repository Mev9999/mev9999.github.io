(() => {
  // Update future homepage promotions here.
  const HOME_PROMO_CONFIG = {
    startsAt: '2026-04-08T12:00:00+02:00',
    endsAt: '2026-06-08T23:59:59+02:00',
    messages: {
      de: {
        badge: 'Neukundenrabat',
        text: '\u{1F337} Exklusives Willkommensangebot: 50 % Rabatt auf dein erstes Shooting. Nur begrenzte Plätze verfügbar. \u2728'
      },
      en: {
        badge: 'New customer discount',
        text: '\u{1F337} Exclusive welcome offer: 50% off your first shoot. Limited spots available. \u2728'
      },
      bs: {
        badge: 'Popust za nove klijente',
        text: '\u{1F337} Ekskluzivna ponuda dobrodošlice: 50% popusta na tvoje prvo fotografisanje. Ograničen broj termina dostupno \u2728'
      }
    }
  };

  const PROMO_STYLE_ID = 'homePromoStyles';
  const PROMO_BANNER_ID = 'homePromoBanner';
  let promoTimerId = null;

  function getCurrentLang() {
    const staticLang = (document.documentElement.getAttribute('data-static-lang') || '').toLowerCase();
    const htmlLang = (document.documentElement.lang || '').toLowerCase();

    if (HOME_PROMO_CONFIG.messages[staticLang]) {
      return staticLang;
    }
    if (HOME_PROMO_CONFIG.messages[htmlLang]) {
      return htmlLang;
    }
    return 'de';
  }

  function injectStyles() {
    if (document.getElementById(PROMO_STYLE_ID)) {
      return;
    }

    const style = document.createElement('style');
    style.id = PROMO_STYLE_ID;
    style.textContent = `
      .promo-banner-wrap {
        background: linear-gradient(90deg, rgba(237, 202, 176, 0.96) 0%, rgba(231, 188, 165, 0.96) 52%, rgba(220, 169, 154, 0.96) 100%);
        border-top: 1px solid rgba(201, 141, 122, 0.16);
        border-bottom: 1px solid rgba(201, 141, 122, 0.18);
        box-shadow: 0 12px 24px rgba(181, 132, 113, 0.12);
      }

      .promo-banner-wrap[hidden] {
        display: none !important;
      }

      .promo-banner {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.85rem;
        flex-wrap: wrap;
        padding: 0.72rem 1rem;
        text-align: center;
        color: #5f453d;
      }

      .promo-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.35rem 0.8rem;
        border-radius: 999px;
        background: rgba(255, 250, 247, 0.82);
        border: 1px solid rgba(255, 255, 255, 0.55);
        box-shadow: 0 8px 18px rgba(169, 118, 100, 0.12);
        color: #a05f51;
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        white-space: nowrap;
      }

      .promo-banner-text {
        margin: 0;
        font-size: 0.95rem;
        font-weight: 600;
        line-height: 1.45;
        max-width: 980px;
      }

      @media (max-width: 640px) {
        .promo-banner {
          gap: 0.5rem;
          padding: 0.78rem 1rem;
        }

        .promo-badge {
          font-size: 0.66rem;
          letter-spacing: 0.11em;
          padding: 0.32rem 0.68rem;
        }

        .promo-banner-text {
          font-size: 0.84rem;
          line-height: 1.5;
          max-width: 34ch;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function ensureBanner() {
    let banner = document.getElementById(PROMO_BANNER_ID);
    if (banner) {
      return banner;
    }

    const header = document.querySelector('header.site, header.site-header');
    if (!header) {
      return null;
    }

    banner = document.createElement('div');
    banner.id = PROMO_BANNER_ID;
    banner.className = 'promo-banner-wrap';
    banner.hidden = true;
    banner.innerHTML = [
      '<div class="promo-banner site-shell" role="status" aria-live="polite">',
      '  <span class="promo-badge" id="homePromoBadge"></span>',
      '  <p class="promo-banner-text" id="homePromoText"></p>',
      '</div>'
    ].join('');

    header.insertAdjacentElement('afterend', banner);
    return banner;
  }

  function renderBanner() {
    const banner = ensureBanner();
    if (!banner) {
      return;
    }

    const lang = getCurrentLang();
    const message = HOME_PROMO_CONFIG.messages[lang] || HOME_PROMO_CONFIG.messages.de;
    const badge = banner.querySelector('#homePromoBadge');
    const text = banner.querySelector('#homePromoText');

    if (badge) {
      badge.textContent = message.badge;
    }

    if (text) {
      text.textContent = message.text;
    }
  }

  function syncBannerVisibility() {
    const banner = ensureBanner();
    if (!banner) {
      return;
    }

    if (promoTimerId) {
      window.clearTimeout(promoTimerId);
      promoTimerId = null;
    }

    const now = new Date();
    const startsAt = HOME_PROMO_CONFIG.startsAt ? new Date(HOME_PROMO_CONFIG.startsAt) : null;
    const endsAt = HOME_PROMO_CONFIG.endsAt ? new Date(HOME_PROMO_CONFIG.endsAt) : null;
    const isVisible = (!startsAt || now >= startsAt) && (!endsAt || now <= endsAt);

    banner.hidden = !isVisible;

    const nextChanges = [startsAt, endsAt]
      .filter(date => date instanceof Date && !Number.isNaN(date.getTime()) && date.getTime() > now.getTime())
      .map(date => date.getTime());

    if (nextChanges.length) {
      const nextDelay = Math.max(1000, Math.min(...nextChanges) - now.getTime() + 1000);
      promoTimerId = window.setTimeout(syncBannerVisibility, nextDelay);
    }
  }

  function observeLanguageChanges() {
    const observer = new MutationObserver(() => {
      renderBanner();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang', 'data-static-lang']
    });
  }

  function init() {
    injectStyles();
    renderBanner();
    syncBannerVisibility();
    observeLanguageChanges();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
