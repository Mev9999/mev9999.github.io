const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const config=JSON.parse(fs.readFileSync(__dirname+'/source/gewinnspiel-config.json','utf8'));
let now=0,refresh;const banner={hidden:true,dataset:{starts:config.startsAt,ends:config.endsAt,ready:'true'}};
const handlers={};const context={Date:{parse:Date.parse,now:()=>now},Number,document:{querySelector:()=>banner,addEventListener:(event,fn)=>{handlers[event]=fn}},window:{addEventListener:(event,fn)=>{handlers[event]=fn}},setInterval:fn=>{refresh=fn}};
vm.runInNewContext(fs.readFileSync(__dirname+'/source/giveaway-notice.js','utf8'),context);
const start=Date.parse(config.startsAt),end=Date.parse(config.endsAt);
for(const [time,visible] of [[start-1,false],[start,true],[start+86400000,true],[end,true],[end+1,false]]){now=time;refresh();assert.equal(!banner.hidden,visible);}
now=start;banner.dataset.ready='false';refresh();assert.equal(banner.hidden,true);
banner.dataset.ready='true';handlers.pageshow();assert.equal(banner.hidden,false);now=end+1;handlers.visibilitychange();assert.equal(banner.hidden,true);
console.log('PASS: vor Start verborgen, Start/Ende korrekt, automatisches Ausblenden, Tab-Rückkehr und deaktivierte Kampagne.');
