const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'../..');
for(const file of ['index.html','en.html','bs.html']){
 const doc=new JSDOM(fs.readFileSync(path.join(root,'partner',file),'utf8')).window.document;
 assert.equal(doc.querySelectorAll('header.site').length,1);assert.equal(doc.querySelectorAll('footer .footer-shell').length,1);
 assert.equal(doc.querySelectorAll('header .nav-icon-link').length,3);
 for(const el of doc.querySelectorAll('[href],[src]')){const u=el.getAttribute('href')||el.getAttribute('src');if(!u||/^(https?:|mailto:|tel:|data:|#)/.test(u))continue;let target=path.resolve(root,'partner',u.split(/[?#]/)[0]);assert.ok(fs.existsSync(target),u);}
 assert.deepEqual([...doc.querySelectorAll('.lang-option')].map(a=>a.getAttribute('href')),['index.html','en.html','bs.html']);
}
console.log('PASS: Partner shell DE/EN/BS, language destinations and local assets/links.');
(async()=>{
 const dom=new JSDOM(fs.readFileSync(path.join(__dirname,'source/index.html'),'utf8'),{url:'https://liza-memories-photography.com/gewinnspiel/',runScripts:'outside-only'}),w=dom.window,d=w.document;
 const config=JSON.parse(fs.readFileSync(path.join(__dirname,'source/gewinnspiel-config.json'),'utf8'));config.startsAt='2020-01-01';config.endsAt='2099-01-01';
 let outcome=true,copied='';
 w.fetch=async(url,opts)=>opts?.method==='POST'?{ok:true,json:async()=>{assert.equal(opts.body.get('terms'),'on');assert.equal(opts.body.get('eligibility'),'on');assert.equal(opts.body.has('marketing'),false);return {type:'liza-giveaway-result',requestId:opts.body.get('request_id'),ok:outcome,message:outcome?'Danke':'Testfehler'};}}:{ok:true,json:async()=>config};
 w.AbortController=AbortController;w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')};Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async text=>{copied=text}}});
 w.eval(fs.readFileSync(path.join(__dirname,'source/gewinnspiel.js'),'utf8'));
 const tick=()=>new Promise(r=>setTimeout(r,10));await tick();
 assert.equal(d.querySelectorAll('input[type=checkbox][required]').length,1);assert.equal(d.querySelector('.optional-consents').open,false);
 async function submit(){d.querySelector('#name').value='Test Person';d.querySelector('#instagram').value='@test.person';d.querySelector('#email').value='test@example.invalid';d.querySelector('[name=terms]').checked=true;d.querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true}));await tick();}
 await submit();assert.ok(d.querySelector('#success-dialog').hasAttribute('open'));d.querySelector('#close-success').click();outcome=false;await submit();assert.equal(d.querySelector('#form-status').textContent,'Testfehler');assert.equal(d.querySelector('#success-dialog').hasAttribute('open'),false);
 d.querySelector('#copy').click();await tick();assert.equal(copied,'https://liza-memories-photography.com/gewinnspiel/#mitmachen');
 dom.window.close();console.log('PASS: Combined eligibility/terms, optional unchecked consents, confirmed success/error, form deep link.');
})().catch(e=>{console.error(e);process.exitCode=1});
