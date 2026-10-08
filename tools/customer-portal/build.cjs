const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const args = process.argv.slice(2);
function arg(name, fallback) { const i = args.indexOf(name); return i < 0 ? fallback : args[i + 1]; }
const root = path.resolve(arg('--root', path.join(__dirname, '../..')));
const output = path.resolve(arg('--out', path.join(root, 'galerie')));
const { JSDOM } = createRequire(path.join(root, 'package.json'))('jsdom');
const site = 'https://liza-memories-photography.com/';
fs.mkdirSync(output, { recursive: true });
const assetDir = path.join(output, 'assets');
fs.mkdirSync(assetDir, { recursive: true });
fs.cpSync(path.join(root, 'fonts'), path.join(assetDir, 'fonts'), { recursive: true });
const labels = { de: 'Kundenportal', en: 'Client portal', bs: 'Portal za klijente' };
const files = { de: 'index.html', en: 'en.html', bs: 'bs.html' };
const staticText = {
 de: {skip:'Zum Inhalt',loading:'Dein Kundenportal wird geladen …',title:'Dein Kundenportal',enable:'Bitte aktiviere JavaScript, um dich sicher anzumelden und deine Galerie zu öffnen.',contact:'Bei Fragen melde dich gerne bei mir.',description:'Dein persönlicher Zugang zu deinen Bildern bei LiZa Memories Photography. Geschützte Fotogalerien, Bildauswahl und Downloads.'},
 en: {skip:'Skip to content',loading:'Your client portal is loading …',title:'Your client portal',enable:'Please enable JavaScript to sign in securely and open your gallery.',contact:'Get in touch if you need help.',description:'Your personal access to your images at LiZa Memories Photography. Private galleries, favourites and downloads.'},
 bs: {skip:'Pređi na sadržaj',loading:'Tvoj portal se učitava …',title:'Tvoj portal za klijente',enable:'Uključi JavaScript za sigurnu prijavu i otvaranje galerije.',contact:'Javi mi se ako trebaš pomoć.',description:'Lični pristup fotografijama kod LiZa Memories Photography. Zaštićene galerije, izbor i preuzimanje.'}
};
for (const [lang, file] of Object.entries(files)) {
  const suffix = lang === 'de' ? '' : '-' + lang;
  const source = new JSDOM(fs.readFileSync(path.join(root, 'index' + suffix + '.html'), 'utf8')).window.document;
  const doc = new JSDOM(fs.readFileSync(path.join(__dirname, 'frontend/index.html'), 'utf8')).window.document;
  doc.documentElement.lang = lang;
  doc.documentElement.dataset.staticLang = lang;
  doc.body.classList.add('home-refreshed', 'client-portal');
  doc.title = labels[lang] + ' | LiZa Memories Photography';
  doc.querySelector('.skip-link').textContent = staticText[lang].skip;
  doc.querySelector('.portal-loading p').textContent = staticText[lang].loading;
  doc.querySelector('meta[name="description"]').content = staticText[lang].description;
  // A noscript element is raw text when scripts are disabled; replace its content explicitly.
  doc.querySelector('noscript').innerHTML = `<section class="portal-card portal-noscript"><h1>${staticText[lang].title}</h1><p>${staticText[lang].enable}</p><a href="mailto:info@liza-memories-photography.com">${staticText[lang].contact}</a></section>`;
  if (!doc.querySelector('meta[name="robots"]')) { const n = doc.createElement('meta'); n.name = 'robots'; doc.head.append(n); }
  doc.querySelector('meta[name="robots"]').content = 'noindex, nofollow, noarchive';
  let referrer = doc.querySelector('meta[name="referrer"]');
  if (!referrer) { referrer = doc.createElement('meta'); referrer.name = 'referrer'; doc.head.append(referrer); }
  referrer.content = 'no-referrer';
  doc.querySelectorAll('link[rel="canonical"],link[rel="alternate"]').forEach(n => n.remove());
  // Keep old website URLs usable while the protected app runs on its own host.
  // Local previews and the Cloudflare deployment must stay on their current host.
  const redirect = doc.createElement('script');
  redirect.dataset.portalRedirect = '';
  const livePath = lang === 'de' ? '' : file;
  redirect.textContent = `if(['liza-memories-photography.com','www.liza-memories-photography.com','mev9999.github.io'].includes(location.hostname)){location.replace('https://portal.liza-memories-photography.com/${livePath}'+location.search+location.hash);}`;
  doc.head.prepend(redirect);
  function fragment(selector) {
    const copy = source.querySelector(selector).cloneNode(true);
    copy.querySelectorAll('[href]').forEach(n => {
      const href = n.getAttribute('href');
      if (n.matches('.lang-option[data-lang]')) { n.href = files[n.dataset.lang]; return; }
      if (!href || /^(mailto:|tel:|https?:)/.test(href)) return;
      n.href = new URL(href, site + (lang === 'de' ? '' : 'index' + suffix + '.html')).href;
    });
    copy.querySelectorAll('[src],[srcset]').forEach(n => {
      function localAsset(ref) {
        if (/^(data:|https?:)/.test(ref)) return ref;
        const original = ref.split('?')[0].replace(/^\//, '');
        const name = path.basename(original);
        fs.copyFileSync(path.join(root, original), path.join(assetDir, name));
        return 'assets/' + name;
      }
      if (n.hasAttribute('src')) n.setAttribute('src', localAsset(n.getAttribute('src')));
      if (n.hasAttribute('srcset')) n.setAttribute('srcset', n.getAttribute('srcset').split(',').map(item => { const [ref, ...sizes] = item.trim().split(/\s+/); return localAsset(ref) + ' ' + sizes.join(' '); }).join(', '));
    });
    copy.querySelectorAll('.active,[aria-current]').forEach(n => { n.classList.remove('active'); n.removeAttribute('aria-current'); });
    copy.querySelectorAll('[data-giveaway-notice]').forEach(n => n.remove());
    return copy;
  }
  const header = fragment('header.site');
  const footer = fragment('footer');
  header.querySelector('#langCurrent').textContent = lang.toUpperCase();
  header.querySelector('#langBtn').dataset.lang = lang;
  header.querySelectorAll('.lang-option').forEach(n => n.classList.toggle('active', n.dataset.lang === lang));
  const portalLink = footer.querySelector('[data-portal-link]') || doc.createElement('a');
  portalLink.dataset.portalLink = '';
  portalLink.href = file;
  portalLink.textContent = labels[lang];
  (footer.querySelector('.footer-secondary-links') || footer).prepend(portalLink);
  const privacyButton = footer.querySelector('[data-privacy-settings]');
  if (privacyButton) {
    const privateLink = doc.createElement('a');
    privateLink.className = 'privacy-settings-link';
    privateLink.href = 'privacy' + suffix + '.html';
    privateLink.textContent = { de:'Datenschutz im Portal', en:'Portal privacy', bs:'Privatnost portala' }[lang];
    privacyButton.replaceWith(privateLink);
  }
  doc.querySelector('header').replaceWith(header);
  doc.querySelector('footer').replaceWith(footer);
  const ownStyles = [...doc.querySelectorAll('link[rel="stylesheet"]')];
  ownStyles.forEach(n => n.remove());
  const fontLink = doc.createElement('link'); fontLink.rel = 'stylesheet'; fontLink.href = 'assets/fonts/fonts.css'; doc.head.append(fontLink);
  const copiedStyles = new Set();
  source.querySelectorAll('link[rel="stylesheet"]').forEach(n => {
    const ref = n.getAttribute('href').split('?')[0];
    if (/fonts|reviews|giveaway-notice/.test(ref) || copiedStyles.has(ref)) return;
    copiedStyles.add(ref);
    const filename = path.basename(ref);
    fs.copyFileSync(path.join(root, ref), path.join(assetDir, filename));
    const copy = n.cloneNode(); copy.href = 'assets/' + filename; doc.head.append(copy);
  });
  const css = doc.createElement('link'); css.rel = 'stylesheet'; css.href = 'portal.css'; doc.head.append(css);
  const shellCss = doc.createElement('link'); shellCss.rel = 'stylesheet'; shellCss.href = 'shell.css'; doc.head.append(shellCss);
  for (const filename of ['accessibility-menu.js']) {
    const code = fs.readFileSync(path.join(root, 'scripts', filename), 'utf8');
    fs.writeFileSync(path.join(assetDir, filename), code);
    const s = doc.createElement('script'); s.src = 'assets/' + filename; s.defer = true; doc.head.append(s);
  }
  const shellScript = doc.createElement('script'); shellScript.src = 'shell.js'; shellScript.defer = true; doc.head.append(shellScript);
  fs.writeFileSync(path.join(output, file), '<!doctype html>\n' + doc.documentElement.outerHTML);
}
for (const name of fs.readdirSync(path.join(__dirname, 'frontend'))) {
  if (name === 'index.html' || !/\.(js|css|svg)$/.test(name)) continue;
  fs.copyFileSync(path.join(__dirname, 'frontend', name), path.join(output, name));
}
fs.copyFileSync(path.join(__dirname, 'shell.js'), path.join(output, 'shell.js'));
fs.copyFileSync(path.join(__dirname, 'shell.css'), path.join(output, 'shell.css'));
fs.copyFileSync(path.join(__dirname, 'THIRD-PARTY.txt'), path.join(output, 'THIRD-PARTY.txt'));
if (fs.existsSync(path.join(__dirname, 'legal'))) fs.cpSync(path.join(__dirname, 'legal'), output, { recursive: true });
fs.writeFileSync(path.join(output, '_headers'), '/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n  Referrer-Policy: no-referrer\n  X-Content-Type-Options: nosniff\n');
console.log('Kundenportal DE/EN/BS: ' + output);
if (!args.includes('--out')) {
  const deployDir = path.join(__dirname, 'dist');
  fs.mkdirSync(deployDir, { recursive: true });
  for (const name of fs.readdirSync(output)) fs.cpSync(path.join(output,name),path.join(deployDir,name),{recursive:true});
}

