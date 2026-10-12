// Dashboard Direct Upload accepts one self-contained _worker.js file.
// Local helpers deliberately use dependency-free modules and distinct names.
const fs = require('node:fs');
const path = require('node:path');

function bundleWorker(backend = path.join(__dirname, 'backend')) {
  const root = path.resolve(backend);
  const included = new Set(), pending = new Set(), chunks = [];
  const importPattern = /^[ \t]*import\s*\{([^}]+)\}\s*from\s*['"]\.\/([A-Za-z0-9_-]+\.mjs)['"];?[ \t]*\r?$/gm;
  function visit(filename, entry = false) {
    if (pending.has(filename)) throw new Error('Cyclic local worker dependency: ' + filename);
    if (included.has(filename)) return;
    pending.add(filename);
    let source = fs.readFileSync(path.join(root, filename), 'utf8');
    for (const imported of source.matchAll(importPattern)) {
      const names = imported[1].split(',').map(name => name.trim()).filter(Boolean);
      if (!names.length || names.some(name => !/^[A-Za-z_$][\w$]*$/.test(name))) throw new Error('Only plain named helper imports are supported.');
      const helper = fs.readFileSync(path.join(root, imported[2]), 'utf8');
      for (const name of names) {
        if (!new RegExp('^export\\s+(?:async\\s+)?(?:function|const|let)\\s+' + name + '\\b', 'm').test(helper)) throw new Error('Missing named helper export: ' + name);
      }
      visit(imported[2]);
    }
    source = source.replace(importPattern, '');
    if (/^\s*import\s/m.test(source)) throw new Error('Unbundled dependency in ' + filename);
    if (!entry) {
      source = source.replace(/^export\s+(?=(?:async\s+)?function\s|(?:const|let)\s)/gm, '');
      if (/^\s*export\s/m.test(source)) throw new Error('Unsupported helper export in ' + filename);
    }
    chunks.push('// Source: backend/' + filename + '\n' + source);
    pending.delete(filename); included.add(filename);
  }
  visit('worker.mjs', true);
  return '// Generated from dependency-free backend modules.\n' + chunks.join('\n');
}

module.exports = { bundleWorker };
