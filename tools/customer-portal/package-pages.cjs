// Optional Pages packaging: permits the portal subdomain to remain with an external DNS provider.
const fs=require('node:fs'),path=require('node:path');
const source=path.resolve(process.argv[2]||path.join(__dirname,'../../galerie'));
const output=path.join(__dirname,'dist-pages');
fs.mkdirSync(output,{recursive:true});
for(const name of fs.readdirSync(source)) fs.cpSync(path.join(source,name),path.join(output,name),{recursive:true});
fs.writeFileSync(path.join(output,'_worker.js'),require('./bundle-worker.cjs').bundleWorker());
fs.writeFileSync(path.join(output,'_routes.json'),JSON.stringify({version:1,include:['/api/*'],exclude:[]},null,2));
console.log('Cloudflare Pages Paket: '+output+' (keine Demo-Daten)');

