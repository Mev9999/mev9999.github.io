const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const config=JSON.parse(fs.readFileSync(__dirname+'/source/gewinnspiel-config.json','utf8'));
let now=0,refresh;const banner={hidden:true,dataset:{starts:config.startsAt,ends:config.endsAt,ready:'true'}};
const handlers={};const context={Date:{parse:Date.parse,now:()=>now},Number,document:{querySelector:()=>banner,addEventListener:(event,fn)=>{handlers[event]=fn}},window:{addEventListener:(event,fn)=>{handlers[event]=fn}},setInterval:fn=>{refresh=fn}};
vm.runInNewContext(fs.readFileSync(__dirname+'/source/giveaway-notice.js','utf8'),context);
assert.equal(banner.hidden,true);
console.log('PASS: Ended campaign notice is hidden even on previously cached ready pages.');
