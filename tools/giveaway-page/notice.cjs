const fs=require('node:fs'),path=require('node:path');
module.exports=function(root,source){
 const config=JSON.parse(fs.readFileSync(path.join(source,'gewinnspiel-config.json'),'utf8'));
 const copies={de:['Gewinne ein Shooting-Paket deiner Wahl','Kostenlos mitmachen · 01.10.–14.10.2026','Jetzt teilnehmen'],en:['Win a photography package of your choice','Free entry · 1 Oct–14 Oct 2026','Enter the giveaway'],bs:['Osvoji paket fotografisanja po svom izboru','Besplatno učešće · 01.10.–14.10.2026.','Učestvuj']};
 for(const ext of ['css','js'])fs.copyFileSync(path.join(source,'giveaway-notice.'+ext),path.join(root,'scripts','giveaway-notice.'+ext));
 const files=fs.readdirSync(root).filter(f=>/^(index|ueber-mich|portraitfotografie-graz|babybauch-shooting-graz|newborn-fotografie-graz|familienfotografie-graz|hochzeitsfotograf-graz|babybauch-und-neugeborenen-shooting-graz|preise)(-en|-bs)?\.html$/.test(f)).concat(['partner/index.html','partner/en.html','partner/bs.html']);
 for(const file of files){
  const target=path.join(root,file);if(!fs.existsSync(target))continue;
  let html=fs.readFileSync(target,'utf8');
  const lang=html.match(/<html[^>]+lang="(de|en|bs)"/)?.[1]||'de',t=copies[lang],prefix=file.startsWith('partner/')?'../':'';
  html=html.replace(/<!-- giveaway-notice:start -->[\s\S]*?<!-- giveaway-notice:end -->/g,'').replace(/<(?:link|script)\b[^>]*data-giveaway-asset[^>]*>(?:<\/script>)?/g,'');
  const ready=config.status==='ready'&&!!config.submissionEndpoint;
  const banner=`<!-- giveaway-notice:start --><aside class="giveaway-notice" data-giveaway-notice data-starts="${config.startsAt}" data-ends="${config.endsAt}" data-ready="${ready}" aria-label="${lang==='de'?'Gewinnspiel':lang==='en'?'Giveaway':'Nagradna igra'}" hidden><div class="giveaway-notice__inner"><div class="giveaway-notice__copy"><strong>${t[0]}</strong><span class="giveaway-notice__date">${t[1]}</span></div><a class="giveaway-notice__link" href="${prefix}gewinnspiel/#mitmachen">${t[2]} <span aria-hidden="true">&nbsp;↗</span></a></div></aside><!-- giveaway-notice:end -->`;
  if(!html.includes('</header>'))throw Error('Missing header: '+file);
  html=html.replace('</header>','</header>'+banner).replace('</head>',`<link rel="stylesheet" href="${prefix}scripts/giveaway-notice.css" data-giveaway-asset><script defer src="${prefix}scripts/giveaway-notice.js" data-giveaway-asset></script></head>`);
  fs.writeFileSync(target,html);
 }
 console.log('Zeitgesteuerter Gewinnspielhinweis: '+files.length+' Seiten.');
};
