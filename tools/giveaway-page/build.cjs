const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const out = path.join(root, 'gewinnspiel');
const source = path.join(__dirname, 'source');
fs.mkdirSync(out, {recursive:true});
for (const file of ['index.html','gewinnspiel.css','gewinnspiel.js','gewinnspiel-config.json']) fs.copyFileSync(path.join(source,file),path.join(out,file));
fs.cpSync(path.join(source,'assets'),path.join(out,'assets'),{recursive:true});
console.log('Gewinnspielseite erstellt.');

require('./notice.cjs')(root,source);
