const fs = require('node:fs'), path = require('node:path');
const { createRequire } = require('node:module');
const { spawnSync } = require('node:child_process');
const root = path.resolve(process.argv[2] || path.join(__dirname, '../..'));
const dir = path.resolve(process.argv[3] || path.join(root, 'galerie'));
const { JSDOM } = createRequire(path.join(root, 'package.json'))('jsdom');
const errors = [];
function assert(ok, message) { if (!ok) errors.push(message); }
for (const [lang, file] of Object.entries({ de:'index.html',en:'en.html',bs:'bs.html' })) {
  const source = fs.readFileSync(path.join(dir,file),'utf8');
  const d = new JSDOM(source).window.document;
  assert(d.documentElement.lang === lang, `${file}: wrong language`);
  assert(d.querySelector('meta[name="robots"]')?.content.includes('noindex'), `${file}: missing noindex`);
  assert(d.querySelector('meta[name="referrer"]')?.content === 'no-referrer', `${file}: referrer leak`);
  assert(d.querySelector('header.site #langMenu') && d.querySelector('footer .footer-secondary-links'), `${file}: missing website shell`);
  const homepage = new JSDOM(fs.readFileSync(path.join(root, lang==='de'?'index.html':`index-${lang}.html`),'utf8')).window.document;
  // Header and footer must use the same shared stylesheet bytes as the main site.
  for (const link of homepage.querySelectorAll('link[rel="stylesheet"]')) {
    const ref=link.getAttribute('href').split('?')[0];
    if (/fonts|reviews|giveaway-notice/.test(ref)) continue;
    const copied=path.join(dir,'assets',path.basename(ref));
    assert(fs.existsSync(copied) && fs.readFileSync(copied).equals(fs.readFileSync(path.join(root,ref))), `${file}: outdated website styles ${ref}`);
  }
  assert(d.querySelector('[data-portal-redirect]')?.getAttribute('src')==='portal-redirect.js', `${file}: redirect must work with strict script CSP`);
  assert([...d.querySelectorAll('script:not([src])')].every(s=>s.type==='application/ld+json'||s.type==='application/json'), `${file}: executable inline script blocked by CSP`);
  assert(!/customer@example\.test|Testgalerie2026|PASSWORD_PEPPER|BANK_IBAN/.test(source), `${file}: private config or demo data in HTML`);
  for (const el of d.querySelectorAll('script[src],link[href],img[src]')) {
    const url = el.getAttribute('src') || el.getAttribute('href');
    if (/^(https?:|data:|mailto:|#)/.test(url)) continue;
    assert(fs.existsSync(path.join(dir,url.split('?')[0])), `${file}: missing ${url}`);
  }
  for (const el of d.querySelectorAll('.lang-option')) assert(fs.existsSync(path.join(dir,el.getAttribute('href'))), `${file}: language link broken`);
}
const staticHeaders=fs.readFileSync(path.join(dir,'_headers'),'utf8');
assert(staticHeaders.includes("script-src 'self';") && staticHeaders.includes("frame-ancestors 'none'"), 'Pages static security headers missing');
assert(fs.existsSync(path.join(dir,'assets/logo-liza.png')), 'Email PNG logo missing from package');
function walk(folder) { return fs.readdirSync(folder,{withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(path.join(folder,e.name)) : [path.join(folder,e.name)]); }
for (const filename of walk(dir)) {
  assert(!/portal\.sqlite|password-pepper|\.dev\.vars|admin-bootstrap|worker\.mjs|fixtures\.mjs|\.local-state/.test(filename), `Private deployment file: ${filename}`);
  if (/\.js$/.test(filename)) {
    const result = spawnSync(process.execPath,['--check',filename],{encoding:'utf8'});
    assert(result.status === 0, `${filename}: ${result.stderr}`);
  }
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('Portal: DE/EN/BS, lokale Assets, Navigation, JavaScript und öffentliche Ausgabe geprüft.');
