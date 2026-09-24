const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const code = fs.readFileSync(__dirname + '/Backend.gs', 'utf8');
let now=Date.parse('2026-09-27T12:00:00+02:00'), rows=[],fail=false,requests=new Map();
class Clock extends Date {constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
const context = {Date:Clock,ContentService:{MimeType:{JSON:"json"},createTextOutput:html=>({html,setMimeType(){return this;}})},HtmlService:{XFrameOptionsMode:{ALLOWALL:'allow'},createHtmlOutput:html=>({html,setXFrameOptionsMode(){return this;}})},
LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},CacheService:{getScriptCache:()=>({get:k=>requests.get(k),put:(k,v)=>requests.set(k,v)})},
Utilities:{getUuid:()=>`id-${rows.length+1}`},SpreadsheetApp:{flush(){},openById(){if(fail)throw Error('storage unavailable');return {getSheetByName:()=>({getLastRow:()=>rows.length+1,getRange:()=>({getValues:()=>rows}),appendRow:r=>rows.push(r)})};}}};
vm.createContext(context);
vm.runInContext(code, context);
function submit(overrides={}){const p={name:'Test Person',email:'test.person@gmail.com',eligibility:'on',terms:'on',parent_origin:'http://127.0.0.1:8771',request_id:'a'.repeat(32),text_version:'2026-09-24-v2',...overrides};const html=context.doPost({parameter:p}).html;return JSON.parse(html);}
assert.equal(submit().ok,true);assert.equal(rows.length,1);assert.equal(rows[0][6],false);assert.equal(rows[0][7],false);
assert.equal(submit({email:'t.e.s.t.person+promo@googlemail.com'}).ok,true);assert.equal(rows.length,1);
assert.equal(submit({email:'different@example.org'}).ok,true);assert.equal(rows.length,2);assert.equal(rows[1][10],'Namensgleichheit prüfen');
assert.equal(submit({name:'Fake'}).ok,false);assert.equal(submit({terms:''}).ok,false);assert.equal(submit({website:'bot'}).ok,false);
now=Date.parse('2026-09-25T12:00:00+02:00');assert.equal(submit().ok,false);
now=Date.parse('2026-10-25T00:00:00+02:00');assert.equal(submit().ok,false);
now=Date.parse('2026-09-27T12:00:00+02:00');fail=true;assert.equal(submit({email:'new@example.org'}).ok,false);fail=false;
requests.set('minute-'+Math.floor(now/60000),'60');assert.equal(submit().ok,false);
assert.equal(context.safeCell_('=IMPORTXML(1)'), "'=IMPORTXML(1)");
assert.equal(context.safeCell_('Emina'), 'Emina');
assert.ok(!context.doGet().html.includes('Teilnahme-ID'));
console.log('PASS: Speicherung, optionale Einwilligungen, Duplikate/Gmail-Aliase, Namenshinweis, Pflichtfelder, Bot-Feld, Zeitraum, Fehlerantwort, Rate-Limit, Formel-Injection-Schutz, privater GET.');
