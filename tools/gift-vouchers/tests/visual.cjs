const {loadPreviewConfig}=require('./preview-config.cjs');
const {base,out,localUrl,playwrightModule,browserOptions}=loadPreviewConfig();
const {chromium}=require(playwrightModule);
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
(async()=>{fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch(browserOptions),context=await browser.newContext();await context.route('**/*',r=>{try{localUrl(r.request().url());return r.continue();}catch{return r.abort();}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const measurements=[];
 for(const lang of ['de','en','bs'])for(const width of lang==='de'?[320,390,540,900,1280,1440]:[390,1440]){
  await page.setViewportSize({width,height:1000});const suffix=lang==='de'?'':'-'+lang;
  await page.goto(base+'/gutscheine'+suffix+'.html',{waitUntil:'networkidle'});
  const necessary=page.getByRole('button',{name:/^(Nur notwendige|Only necessary|Samo neophodni)$/});if(await necessary.count())await necessary.first().click();await page.evaluate(()=>document.fonts.ready);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  const bounds=await page.evaluate(()=>{
   const heading=document.querySelector('.gv-hero-title'),box=heading.getBoundingClientRect(),rangeRect=n=>{const r=document.createRange();r.selectNodeContents(n);return r.getBoundingClientRect();};
   const lines=[...heading.children].map(n=>{const r=rangeRect(n);return {text:n.textContent,y:r.top,width:r.width,right:r.right};});
   const caption=document.querySelector('.gv-hero-art .gv-voucher-meta>span'),voucher=caption.closest('.gv-voucher'),oldTransform=voucher.style.transform;
   voucher.style.transform='none';const captionRect=rangeRect(caption);voucher.style.transform=oldTransform;
   const photo=document.querySelector('.gv-hero-photo'),p=photo.getBoundingClientRect();
   const nav=[...document.querySelector('header nav.primary').children].filter(n=>n.tagName==='A'&&!n.classList.contains('mobile-group-link')).map(n=>n.textContent.trim());
   return {width:innerWidth,headingWidth:box.width,headingRight:box.right,lines,captionHeight:captionRect.height,captionLineHeight:parseFloat(getComputedStyle(caption).lineHeight),photoRatio:p.width/p.height,naturalRatio:photo.naturalWidth/photo.naturalHeight,nav};
  });
  assert.equal(bounds.lines.length,3);assert.equal(new Set(bounds.lines.map(n=>n.y)).size,3);for(const line of bounds.lines)assert.ok(line.right<=bounds.headingRight+1,JSON.stringify(bounds));
  assert.ok(bounds.captionHeight<=bounds.captionLineHeight+1,JSON.stringify(bounds));assert.ok(Math.abs(bounds.photoRatio-bounds.naturalRatio)<.01);assert.ok(bounds.nav.indexOf(lang==='de'?'Gutscheine':lang==='en'?'Gift vouchers':'Poklon-bonovi')>=0,JSON.stringify(bounds));
  if(width===390){const burger=page.locator('#burger');await burger.click();assert.equal(await burger.getAttribute('aria-expanded'),'true');await burger.click();assert.equal(await burger.getAttribute('aria-expanded'),'false');}
  measurements.push({lang,...bounds});const key=width===390?'Handy':width===1440?'Desktop':String(width);
  await page.screenshot({path:path.join(out,'Gutscheine-'+key+suffix+'.png'),fullPage:true});if(lang==='de'&&width===390)await page.screenshot({path:path.join(out,'Gutscheine-Handy-Hero.png')});
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'Layout-Pruefung.json'),JSON.stringify(measurements,null,2));console.log('Three headline lines, one-line preview recipient, uncropped family photo and no overflow at every tested width.');await browser.close();})().catch(e=>{console.error(e);process.exit(1)});
