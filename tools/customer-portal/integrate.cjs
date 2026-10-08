// Run after the existing site build; idempotently adds a discreet portal footer link.
const fs = require('node:fs'), path = require('node:path');
const { createRequire } = require('node:module');
const root = path.resolve(process.argv[2] || path.join(__dirname, '../..'));
const { JSDOM } = createRequire(path.join(root, 'package.json'))('jsdom');
const targets = fs.readdirSync(root).filter(n => n.endsWith('.html')).map(n => path.join(root, n));
for (const dir of ['partner', 'gewinnspiel']) if (fs.existsSync(path.join(root, dir))) for (const name of ['index.html', 'en.html', 'bs.html']) if (fs.existsSync(path.join(root, dir, name))) targets.push(path.join(root, dir, name));
for (const file of targets) {
  const old = fs.readFileSync(file, 'utf8');
  const d = new JSDOM(old).window.document;
  const links = d.querySelector('footer .footer-secondary-links');
  if (!links) continue;
  const lang = d.documentElement.lang;
  const link = d.querySelector('[data-portal-link]') || d.createElement('a');
  link.dataset.portalLink = '';
  const dest = { de: '', en: 'en.html', bs: 'bs.html' }[lang] || '';
  link.href = 'https://portal.liza-memories-photography.com/' + dest;
  link.textContent = { de: 'Kundenportal', en: 'Client portal', bs: 'Portal za klijente' }[lang] || 'Kundenportal';
  if (!link.parentElement) links.prepend(link);
  // Preserve existing formatting/JSON/inline scripts by inserting only the one link.
  const serialized = link.outerHTML;
  const next = /<a\b[^>]*data-portal-link[^>]*>[\s\S]*?<\/a>/.test(old) ? old.replace(/<a\b[^>]*data-portal-link[^>]*>[\s\S]*?<\/a>/, serialized) : old.replace(/(<div\b[^>]*class="footer-secondary-links"[^>]*>)/, '$1' + serialized);
  if (next !== old) fs.writeFileSync(file, next);
}
console.log('Kundenportal im gemeinsamen Footer verlinkt.');
