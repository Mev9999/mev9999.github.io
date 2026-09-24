const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'gewinnspiel');
(async()=>{
for(const [lang,file] of Object.entries({de:'index.html',en:'en.html',bs:'bs.html'})){
 const dom=new JSDOM(fs.readFileSync(path.join(out,file),'utf8'),{url:'https://liza-memories-photography.com/gewinnspiel/'+(lang==='de'?'':file),runScripts:'outside-only'}),w=dom.window,d=w.document;
 assert.equal(d.documentElement.lang,lang);assert.equal(d.querySelectorAll('header.site').length,1);assert.equal(d.querySelectorAll('footer').length,1);
 assert.deepEqual([...d.querySelectorAll('.lang-option')].map(a=>a.getAttribute('href')),['index.html','en.html','bs.html']);
 assert.equal(d.querySelectorAll('[name=photo_publication]').length,1);assert.equal(d.querySelector('[name=photo_publication]').required,false);
 assert.equal(d.querySelector('#bildnutzung .small-tag').textContent,{de:'Bildnutzung',en:'Use of photographs',bs:'Korištenje fotografija'}[lang]);
 for(const el of d.querySelectorAll('[href],[src]')){let u=el.getAttribute('href')||el.getAttribute('src');if(!u||/^(https?:|mailto:|tel:|data:|#)/.test(u))continue;assert.ok(fs.existsSync(path.resolve(out,u.split(/[?#]/)[0])),u);}
 w.eval(d.querySelector('script:not([src])').textContent);
 const config=JSON.parse(fs.readFileSync(path.join(out,'gewinnspiel-config.json'),'utf8'));config.startsAt='2020-01-01';config.endsAt='2099-01-01';let shared,posted;
 w.fetch=async(url,opts)=>opts?.method==='POST'?{ok:true,json:async()=>{posted=opts.body;return {type:'liza-giveaway-result',requestId:opts.body.get('request_id'),ok:true,message:'Deine Teilnahme wurde bestätigt.'};}}:{ok:true,json:async()=>config};
 w.AbortController=AbortController;w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};Object.defineProperty(w.navigator,'share',{value:async data=>{shared=data}});
 w.eval(fs.readFileSync(path.join(out,'gewinnspiel.js'),'utf8'));const tick=()=>new Promise(r=>setTimeout(r,10));await tick();
 d.querySelector('[data-share]').click();await tick();assert.equal(shared.url,d.querySelector('link[rel=canonical]').href+'#mitmachen');
 d.querySelector('a[href="#bildnutzung"]').click();assert.equal(d.querySelector('#bedingungen').open,true);
 const form=d.querySelector('form');form.elements.name.value='Test Person';form.elements.email.value='test@example.invalid';form.elements.terms.checked=true;
 form.dispatchEvent(new w.Event('submit',{cancelable:true}));await tick();assert.ok(d.querySelector('#success-dialog').open);assert.equal(posted.has('photo_publication'),false);assert.equal(posted.has('marketing'),false);
 assert.equal(d.querySelector('#success-message').textContent,lang==='de'?'Deine Teilnahme wurde bestätigt.':w.GIVEAWAY_MESSAGES['Deine Teilnahme wurde bestätigt.']);
 dom.window.close();console.log('PASS '+lang+': shell, links, consent, share destination, expanded photo details, localized success and entry without optional consents.');
}
})().catch(e=>{console.error(e);process.exitCode=1});
