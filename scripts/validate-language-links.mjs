import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { localizeHomepageLinks } from './site-refresh.mjs';

const ORIGIN = 'https://liza-memories-photography.com';
const languageOf = file => /-(en|bs)\.html$/.exec(file)?.[1] || 'de';

export function validateLanguageLinkTransform() {
 for (const language of ['de', 'en', 'bs']) {
  const file = language === 'de' ? 'index.html' : 'index-' + language + '.html';
  const suffix = language === 'de' ? '' : '-' + language;
  const home = language === 'de' ? '/' : '/index-' + language + '.html';
  const cases = [
   ['index-en.html', language === 'de' ? '/' : 'index-' + language + '.html'],
   ['?service=family&package=gold#contact-form-card', '?service=family&package=gold#contact-form-card'],
   ['ueber-mich.html', 'ueber-mich' + suffix + '.html'],
   ['/preise-bs.html#neugeborene', '/preise' + suffix + '.html#neugeborene'],
   ['babybauch-shooting-graz-en.html?service=maternity&package=silver&source=home#gallery-showcase', 'babybauch-shooting-graz' + suffix + '.html?service=maternity&package=silver&source=home#gallery-showcase'],
   ['/?service=newborn&package=bronze&source=home#contact-form-card', home + '?service=newborn&package=bronze&source=home#contact-form-card'],
   [ORIGIN + '/familienfotografie-graz.html#faq', ORIGIN + '/familienfotografie-graz' + suffix + '.html#faq'],
   ['//liza-memories-photography.com/hochzeitsfotograf-graz.html', '//liza-memories-photography.com/hochzeitsfotograf-graz' + suffix + '.html'],
   ['#portfolio', '#portfolio'],
   ['mailto:info@liza-memories-photography.com', 'mailto:info@liza-memories-photography.com'],
   ['tel:+4368181942780', 'tel:+4368181942780'],
   ['https://example.com/preise.html?service=newborn#faq', 'https://example.com/preise.html?service=newborn#faq'],
   ['//example.com/index.html', '//example.com/index.html'],
   ['shooting-video.mp4', 'shooting-video.mp4'],
   ['downloads/guide.html', 'downloads/guide.html'],
   ['unknown.html', 'unknown.html']
  ];
  const dom = new JSDOM('<main></main>');
  const d = dom.window.document;
  for (const [href] of cases) { const link = d.createElement('a'); link.setAttribute('href', href); d.querySelector('main').append(link); }
  const languages = d.createElement('nav'); languages.id = 'langMenu';
  languages.innerHTML = '<a class="lang-option" data-lang="de" href="/">DE</a><a class="lang-option" data-lang="en" href="index-en.html">EN</a><a class="lang-option" data-lang="bs" href="index-bs.html">BS</a>';
  d.body.append(languages);
  const languageMarkup = languages.outerHTML;
  localizeHomepageLinks(d, file);
  [...d.querySelectorAll('main a')].forEach((a, index) => assert.equal(a.getAttribute('href'), cases[index][1], language + ': ' + cases[index][0]));
  assert.equal(languages.outerHTML, languageMarkup, 'Explicit language destinations must remain unchanged');
  const first = d.body.innerHTML;
  localizeHomepageLinks(d, file);
  assert.equal(d.body.innerHTML, first, 'Repeated builds must not add another language suffix');
  dom.window.close();
 }
}

export async function validateLanguageLinks(cache) {
 validateLanguageLinkTransform();
 for (const file of ['index.html', 'index-en.html', 'index-bs.html']) {
  const document = cache.get(file)?.document;
  assert(document, file + ': homepage must exist');
  const language = languageOf(file);
  const pageUrl = ORIGIN + '/' + (file === 'index.html' ? '' : file);
  for (const link of document.querySelectorAll('a[href]')) {
   if (link.matches('.lang-option, [hreflang], [data-lang]') || link.closest('#langMenu')) continue;
   const href = link.getAttribute('href');
   let url;
   try { url = new URL(href, pageUrl); } catch { continue; }
   if (url.origin !== ORIGIN) continue;
   const target = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
   if (cache.has(target)) assert.equal(languageOf(target), language, file + ': wrong language destination ' + href);
  }
  for (const link of document.querySelectorAll('.lang-option[data-lang]')) {
   const expected = link.dataset.lang === 'de' ? '/' : '/index-' + link.dataset.lang + '.html';
   assert.equal(new URL(link.getAttribute('href'), pageUrl).pathname, expected, file + ': changed language selector');
  }
 }
 console.log('Homepage language links validated for DE, EN and BS.');
}
