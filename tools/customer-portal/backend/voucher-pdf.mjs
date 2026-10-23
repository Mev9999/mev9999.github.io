import { voucherFont } from './voucher-font.mjs';
import { voucherDesignFonts } from './voucher-design-fonts.mjs';
import { voucherBrand } from './voucher-brand.mjs';
import { voucherServiceIconPdf } from './voucher-service-icons.mjs';

const voucherPdfEncoder = new TextEncoder();
const voucherPdfFonts = { sans: voucherDesignFonts.sans, serif: voucherDesignFonts.serif, fallback: { ...voucherFont, name: 'BitstreamVeraSans' } };
const voucherPdfCopyByLanguage = {
 de: { title:'Gutschein',eyebrow:'ETWAS BLEIBENDES SCHENKEN',subtitle:'Gemeinsame Zeit. Erinnerungen, die bleiben.',to:'VON HERZEN FÜR',from:'EIN GESCHENK VON',value:'DEINE AUSZEIT',session:'FÜR DEIN FOTOSHOOTING',code:'DEIN GUTSCHEINCODE',redeem:'Bei deiner Shootinganfrage angeben oder zum Termin mitbringen.',preview:'MUSTER - NICHT EINLÖSBAR',place:'GRAZ · ÖSTERREICH' },
 en: { title:'Gift voucher',eyebrow:'GIVE SOMETHING TO TREASURE',subtitle:'Time together. Memories to keep.',to:'WITH LOVE, FOR',from:'A GIFT FROM',value:'A MOMENT FOR YOU',session:'FOR YOUR PHOTO SESSION',code:'YOUR VOUCHER CODE',redeem:'Include this code with your session enquiry or bring it to your appointment.',preview:'SAMPLE - NOT VALID',place:'GRAZ · AUSTRIA' },
 bs: { title:'Poklon-bon',eyebrow:'POKLONITE NEŠTO ŠTO OSTAJE',subtitle:'Zajedničko vrijeme. Uspomene koje ostaju.',to:'OD SRCA ZA',from:'POKLON OD',value:'VRIJEME ZA VAS',session:'ZA VAŠE FOTOGRAFISANJE',code:'VAŠ KOD POKLON-BONA',redeem:'Navedite kod prilikom upita ili ga ponesite na fotografisanje.',preview:'UZORAK - NIJE VAŽEĆI',place:'GRAZ · AUSTRIJA' },
};
const voucherPdfDetailCopy = {
 de: {
  services:['Babybauch','Neugeborene','Familie','Hochzeit','Porträt & Produkt'],
  serviceLine:'Babybauch · Neugeborene · Familie · Hochzeit · Porträt & Produkt',
  backTitle:'Deine Lieblingsmomente. Deine Wahl.',
  backIntro:'Wertgutschein für reguläre Shootings und vereinbarte zusätzliche Bilder.',
  redeemTitle:'Dein Weg zu schönen Erinnerungen',
  redeemText:'Nenne deinen Code bei der Anfrage, per E-Mail oder beim Shooting. Wir vereinbaren deinen Termin und das passende Paket persönlich. Es gelten die bei der Buchung vereinbarten Preise.',
  creditTitle:'Dein Guthaben bleibt flexibel',
  creditText:'Restguthaben bleibt auf demselben Gutschein erhalten. Kostet dein Shooting mehr, bezahlst du nur die Differenz. Der Gutschein ist übertragbar; bewahre den Code deshalb gut auf.',
  validityTitle:'Gültigkeit',validityShort:'Keine vertragliche Befristung.',validityLaw:'Gesetzliche Verjährung: grundsätzlich 30 Jahre.',
  exclusions:'Organisierte Krippen-, Kindergarten- und Schulfototage sind ausgenommen.',
  cash:'Keine freiwillige Barauszahlung. Gesetzliche Rückzahlungsansprüche bleiben unberührt.',
  issued:'Ausgestellt am',contact:'Termin & Fragen',terms:'Gutscheinbedingungen',
 },
 en: {
  services:['Maternity','Newborn','Family','Wedding','Portrait & product'],
  serviceLine:'Maternity · Newborn · Family · Wedding · Portrait & product',
  backTitle:'Your favourite moments. Your choice.',
  backIntro:'Credit towards regular photo sessions and agreed additional images.',
  redeemTitle:'Your next beautiful memory',
  redeemText:'Share your code with your enquiry, by email or at your session. We will agree on your date and package personally. The prices agreed at the time of booking apply.',
  creditTitle:'Flexible credit for your session',
  creditText:'Any remaining credit stays on the same voucher. If your session costs more, you pay only the difference. The voucher is transferable, so keep its code safe.',
  validityTitle:'Validity',validityShort:'No contractual expiry date.',validityLaw:'Statutory limitation: generally 30 years.',
  exclusions:'Organised nursery, kindergarten and school photo days are excluded.',
  cash:'No voluntary cash payout. Statutory reimbursement rights remain unaffected.',
  issued:'Issued on',contact:'Bookings & questions',terms:'Voucher terms',
 },
 bs: {
  services:['Trudničko','Novorođenčad','Porodica','Vjenčanje','Portret i proizvodi'],
  serviceLine:'Trudničko · Novorođenčad · Porodica · Vjenčanje · Portret i proizvodi',
  backTitle:'Tvoji najdraži trenuci. Tvoj izbor.',
  backIntro:'Vrijednosni bon za redovna fotografisanja i dogovorene dodatne fotografije.',
  redeemTitle:'Tvoj put do lijepih uspomena',
  redeemText:'Navedi kod pri upitu, e-mailom ili na fotografisanju. Termin i odgovarajući paket dogovaramo lično. Primjenjuju se cijene dogovorene prilikom rezervacije.',
  creditTitle:'Fleksibilan iznos za tvoje fotografije',
  creditText:'Preostali iznos ostaje na istom bonu. Ako fotografisanje košta više, plaćaš samo razliku. Bon je prenosiv, zato pažljivo čuvaj njegov kod.',
  validityTitle:'Važenje',validityShort:'Bez ugovorenog roka isteka.',validityLaw:'Zakonski rok zastare: u pravilu 30 godina.',
  exclusions:'Organizovani foto-dani u jaslicama, vrtićima i školama su izuzeti.',
  cash:'Dobrovoljna isplata u gotovini nije predviđena. Zakonska prava na povrat ostaju očuvana.',
  issued:'Izdato',contact:'Termini i pitanja',terms:'Uslovi poklon-bona',
 },
};
const voucherPdfClean = value => String(value ?? '').normalize('NFC').replace(/\r\n?/g,'\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').trim();
const voucherPdfDecode = value => Uint8Array.from(atob(value), c => c.charCodeAt(0));
const voucherPdfBytes = value => typeof value === 'string' ? voucherPdfEncoder.encode(value) : value;
function voucherPdfConcat(parts) { const output = new Uint8Array(parts.reduce((n,p) => n+p.length,0)); let at=0; for(const part of parts){output.set(part,at);at+=part.length;}return output; }
function voucherPdfFaceFor(char, face='sans') { return voucherPdfFonts[face].cmap[char.codePointAt(0)] ? face : voucherPdfFonts.sans.cmap[char.codePointAt(0)] ? 'sans' : 'fallback'; }
function voucherPdfAdvance(char,size,face='sans') { const font=voucherPdfFonts[voucherPdfFaceFor(char,face)]; return (font.widths[char==='Đ'&&!font.cmap[272]?68:char.codePointAt(0)] ?? 320)*size/1000; }
function voucherPdfWidth(value,size,face='sans',tracking=0) { return [...value].reduce((n,c) => n+voucherPdfAdvance(c,size,face),0)+Math.max(0,[...value].length-1)*tracking; }
export function voucherPdfTextSupported(value) { return [...voucherPdfClean(value)].every(c => /\s/.test(c)||c==='Đ'||Boolean(voucherPdfFonts.sans.cmap[c.codePointAt(0)]||voucherFont.cmap[c.codePointAt(0)])); }
function voucherPdfWrap(value,maxWidth,size,face='sans') {
 const lines=[];let line='';
 for(const word of value.replace(/\s+/g,' ').split(' ')){
  if(!word)continue;
  const next=line?line+' '+word:word;
  if(voucherPdfWidth(next,size,face)<=maxWidth){line=next;continue;}
  if(line){lines.push(line);line='';}
  for(const char of word){if(voucherPdfWidth(line+char,size,face)>maxWidth&&line){lines.push(line);line='';}line+=char;}
 }
 if(line)lines.push(line);
 return lines;
}

/** A photo-free 210 × 95 mm card; the default two-page A4 layout is ready for duplex printing. */
export async function renderGiftVoucherPdf(input) {
 const copy=voucherPdfCopyByLanguage[input.language]||voucherPdfCopyByLanguage.de;
 const details=voucherPdfDetailCopy[input.language]||voucherPdfDetailCopy.de;
 const issuedDate=Number.isFinite(input.issuedAt)&&input.issuedAt>0?new Intl.DateTimeFormat(input.language==='en'?'en-GB':input.language==='bs'?'bs-BA':'de-AT',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'Europe/Vienna'}).format(new Date(input.issuedAt)):'';
 const stockBlank=input.stockBlank===true;
 const layout=input.layout||'a4';
 if(!['a4','card','press'].includes(layout))throw new Error('Invalid voucher PDF layout.');
 const code=stockBlank?'':voucherPdfClean(input.code),giftTo=stockBlank?'':voucherPdfClean(input.giftTo),giftFrom=stockBlank?'':voucherPdfClean(input.giftFrom),message=stockBlank?'':voucherPdfClean(input.message);
 if(!Number.isSafeInteger(input.amountCents)||input.amountCents<1000||input.amountCents>200000)throw new Error('Invalid voucher value.');
 if(giftTo.length>80||giftFrom.length>80||message.length>300||code.length>64)throw new Error('Invalid gift voucher text length.');
 for(const value of [code,giftTo,giftFrom,message])if(!voucherPdfTextSupported(value))throw new Error('Unsupported gift voucher text.');
 const amount=(input.amountCents/100).toLocaleString(input.language==='en'?'en-IE':'de-AT',{minimumFractionDigits:input.amountCents%100?2:0,maximumFractionDigits:2}).replace(/\s/g,' ')+' €';
 const website='liza-memories-photography.com';
 const issuer='LiZa Memories Photography · Emina Huremovic';
 const address='Mela-Spira-Straße 32b · 8054 Graz-Straßgang · Österreich';
 const email='info@liza-memories-photography.com',phone='+43 681 819 427 80';
 const termsUrl='portal.liza-memories-photography.com/gutscheinbedingungen'+(['en','bs'].includes(input.language)?'-'+input.language:'')+'.html';
 const printCopy = input.language==='en' ? ['Front','Back','Print on A4 landscape at 100% / actual size.','Duplex: flip on the short edge. Cut along the marks.'] : input.language==='bs' ? ['Prednja strana','Poleđina','Štampa: A4 vodoravno, 100% / stvarna veličina.','Obostrano: okretanje po kraćoj ivici. Izrežite po oznakama.'] : ['Vorderseite','Rückseite','Drucken: A4 quer, 100 % / tatsächliche Größe.','Beidseitig: an der kurzen Kante spiegeln. An den Markierungen ausschneiden.'];
 const chars=[...new Set([...printCopy,...Object.values(copy),...Object.values(details).flat(),code,giftTo,giftFrom,message,amount,website,issuer,address,email,phone,termsUrl,issuedDate,': ',' · '].join('').replace(/\s/g,' ').split(''))];
 const cid=new Map(chars.map((c,i)=>[c,i+1]));
 const encode=value=>[...value].map(c=>(cid.get(c)||cid.get(' ')||0).toString(16).padStart(4,'0')).join('');
 const color={paper:'0.984 0.969 0.949',ink:'0.227 0.176 0.157',muted:'0.451 0.365 0.329',rose:'0.627 0.416 0.353',line:'0.827 0.706 0.639',light:'0.965 0.906 0.851',soft:'0.812 0.686 0.612'};

 const mm=72/25.4,W=210*mm,H=95*mm;
 // Vistaprint, unperforated: 213 × 98 mm full bleed, 210 × 95 mm trim.
 const bleed=layout==='press'?1.5*mm:0;
 const pageW=layout==='a4'?297*mm:W+2*bleed,pageH=layout==='a4'?210*mm:H+2*bleed;
 const offsetX=(pageW-W)/2,offsetY=(pageH-H)/2;
 const commands=[];
 const text=(value,x,y,size=10,face='sans',ink=color.ink,tracking=0)=>{
  let cursor=x;
  for(const char of value){
   const key=voucherPdfFaceFor(char,face),fontName={sans:'VS',serif:'VT',fallback:'VF'}[key];
   commands.push(`BT /${fontName} ${size.toFixed(3)} Tf ${ink} rg 1 0 0 1 ${cursor.toFixed(3)} ${y.toFixed(3)} Tm <${encode(char)}> Tj ET`);
   if(char==='Đ'&&key==='fallback')commands.push(`q ${ink} RG ${(size*.075).toFixed(3)} w ${(cursor+size*.02).toFixed(3)} ${(y+size*.34).toFixed(3)} m ${(cursor+size*.42).toFixed(3)} ${(y+size*.34).toFixed(3)} l S Q`);
   cursor+=voucherPdfAdvance(char,size,face)+tracking;
  }
 };
 const line=(x,y,x2,y2,ink=color.line,stroke=.5)=>commands.push(`q ${ink} RG ${stroke} w ${x} ${y} m ${x2} ${y2} l S Q`);
 const centered=(value,x,y,size,face='sans',ink=color.ink,tracking=0)=>text(value,x-voucherPdfWidth(value,size,face,tracking)/2,y,size,face,ink,tracking);
 const para=(value,x,y,width,size=7.5,leading=10)=>{
  const lines=voucherPdfWrap(value,width,size,'sans');lines.forEach((part,i)=>text(part,x,y-i*leading,size,'sans',color.muted));return y-lines.length*leading;
 };
 const logoAt=(x,y,width)=>commands.push(`q ${width} 0 0 ${(width*voucherBrand.height/voucherBrand.width).toFixed(3)} ${x} ${y} cm /Logo Do Q`);
 const background=(front=false)=>{
  commands.push(`q ${color.paper} rg ${-bleed} ${-bleed} ${W+2*bleed} ${H+2*bleed} re f Q`);
  if(front)commands.push(`q ${color.ink} rg 421 ${-bleed} ${W-421+bleed} ${H+2*bleed} re f Q`);
  line(12,12,front?409:W-12,12);line(12,12,12,H-12);line(12,H-12,front?409:W-12,H-12);
  if(!front)line(W-12,12,W-12,H-12);
  else {line(433,12,W-12,12,color.rose);line(W-12,12,W-12,H-12,color.rose);line(433,H-12,W-12,H-12,color.rose);}
 };
 const finish=(side)=>{
  const card=commands.splice(0);
  // Both faces have exactly the same translation, orientation and cut geometry.
  commands.push(`q 1 0 0 1 ${offsetX} ${offsetY} cm`,...card,'Q');
  if(layout==='a4'){
   const x=offsetX,y=offsetY,right=x+W,top=y+H,gap=3*mm,length=4*mm;
   for(const a of [x,right])for(const b of [y,top]){
    const direction=a===x?-1:1,vertical=b===y?-1:1;
    line(a+direction*gap,b,a+direction*(gap+length),b,'0.55 0.55 0.55',.35);
    line(a,b+vertical*gap,a,b+vertical*(gap+length),'0.55 0.55 0.55',.35);
   }
   centered(printCopy[side],pageW/2,top+30,11,'serif',color.muted);
   centered(printCopy[2],pageW/2,y-33,8,'sans',color.muted);
   centered(printCopy[3],pageW/2,y-47,8,'sans',color.muted);
  }
  return commands.splice(0);
 };

 background(true);
 const dense=!stockBlank&&(giftTo.length+giftFrom.length+message.length>220);
 logoAt(28,dense?224:211,dense?120:158);
 if(!dense)text(copy.eyebrow,29,198,5.8,'sans',color.rose,1.3);
 let titleSize=dense?44:52;while(voucherPdfWidth(copy.title,titleSize,'serif')>365)titleSize-=.5;
 text(copy.title,26,dense?178:151,titleSize,'serif');
 text(copy.subtitle,29,dense?164:136,8.2,'sans',color.muted);

 if(stockBlank||(!giftTo&&!giftFrom&&!message)){
  text(copy.to,29,109,6.2,'sans',color.rose,1);line(29,78,392,78);
  text(copy.from,29,60,6.2,'sans',color.rose,1);line(29,29,392,29);
 }else{
  const dedication=[];
  if(giftTo)dedication.push({label:copy.to,value:giftTo,base:22,min:8.8});
  if(message)dedication.push({value:message,base:11,min:8.4});
  if(giftFrom)dedication.push({label:copy.from,value:giftFrom,base:16,min:8.8});
  const top=dense?152:119,available=top-20,gap=dense?5:9;
  let blocks=[],height=Infinity;
  for(let step=0;step<=35;step++){
   const scale=1-step*.025;
   blocks=dedication.map(block=>{const size=Math.max(block.min,block.base*scale),lines=voucherPdfWrap(block.value,365,size,'serif'),leading=size*1.08;return {...block,size,lines,leading,height:(block.label?10:0)+lines.length*leading};});
   height=blocks.reduce((n,b)=>n+b.height,0)+(blocks.length-1)*gap;
   if(height<=available)break;
  }
  if(height>available)throw new Error('Personal message is too long for the gift voucher.');
  let y=top;
  for(const block of blocks){
   if(block.label){text(block.label,29,y,5.9,'sans',color.rose,1);y-=10;}
   for(const part of block.lines){text(part,29,y-block.size*.78,block.size,'serif',block.label?color.ink:color.muted);y-=block.leading;}
   y-=gap;
  }
 }

 const cx=(421+W)/2,cy=213,r=22,inner=11;
 commands.push(`q ${color.rose} RG 0.6 w ${cx+r+7} ${cy} m ${cx+r+7} ${cy+16.02} ${cx+16.02} ${cy+r+7} ${cx} ${cy+r+7} c ${cx-16.02} ${cy+r+7} ${cx-r-7} ${cy+16.02} ${cx-r-7} ${cy} c ${cx-r-7} ${cy-16.02} ${cx-16.02} ${cy-r-7} ${cx} ${cy-r-7} c ${cx+16.02} ${cy-r-7} ${cx+r+7} ${cy-16.02} ${cx+r+7} ${cy} c S Q`);
 const points=Array.from({length:6},(_,i)=>{const a=(i*60+30)*Math.PI/180;return [cx+r*Math.cos(a),cy+r*Math.sin(a)];});
 const core=Array.from({length:6},(_,i)=>{const a=i*60*Math.PI/180;return [cx+inner*Math.cos(a),cy+inner*Math.sin(a)];});
 for(let i=0;i<6;i++){line(...core[i],...core[(i+1)%6],color.soft,.65);line(...core[i],...points[(i+1)%6],color.rose,.65);}
 centered(copy.value,cx,171,6,'sans',color.soft,1.1);
 if(stockBlank){
  commands.push(`q ${color.paper} rg 444 123 128 35 re f Q`);text('€',550,132,20,'serif',color.rose);
 }else{
  let size=45;while(voucherPdfWidth(amount,size,'serif')>142)size-=.5;
  centered(amount,cx,134,size,'serif',color.light);
 }
 centered(copy.session,cx,112,5.8,'sans',color.soft,.6);
 line(441,99,W-20,99,color.rose);
 centered(copy.code,cx,85,5.8,'sans',color.soft,.7);
 if(stockBlank){commands.push(`q ${color.paper} rg 439 55 ${W-457} 23 re f Q`);}
 else {
  const codeLabel=input.preview?copy.preview:code;
  let size=7.9;while(voucherPdfWidth(codeLabel,size,'sans')>142&&size>4)size-=.1;
  centered(codeLabel,cx,68,size,'sans',color.light);
 }
 if(stockBlank){text(details.issued+':',441,37,6.2,'sans',color.soft);commands.push(`q ${color.paper} rg 498 28 74 16 re f Q`);}
 else if(issuedDate)centered(details.issued+': '+issuedDate,cx,38,6.2,'sans',color.soft);
 centered(copy.place,cx,20,5.5,'sans',color.soft,1);
 const frontCommands=finish(0);

 background();
 text(details.backTitle,28,233,24,'serif');
 text(details.backIntro,29,218,7.8,'sans',color.muted);
 const serviceKinds=['maternity','newborn','family','wedding','camera'];
 details.services.forEach((label,index)=>{
  const x=79+index*109;
  commands.push(voucherServiceIconPdf(serviceKinds[index],x,187,30,color.rose));
  let size=8;while(voucherPdfWidth(label,size,'sans')>104)size-=.1;
  centered(label,x,162,size,'sans');
 });
 line(29,150,W-29,150);
 text(details.redeemTitle,29,132,13.5,'serif');
 para(details.redeemText,29,119,255,7.3,9.6);
 text(details.creditTitle,312,132,13.5,'serif');
 para(details.creditText,312,119,255,7.3,9.6);
 text(details.validityTitle+': '+details.validityShort+' '+details.validityLaw,29,80,7.3,'sans',color.ink);
 text(details.exclusions,29,68,6.5,'sans',color.muted);
 text(details.cash,29,58,6.5,'sans',color.muted);
 line(29,49,W-29,49);
 text(issuer,29,36,6.4,'sans');
 text(address,29,25,6.2,'sans',color.muted);
 text(email,312,36,6.4,'sans');
 text(website+' · '+phone,312,25,6.1,'sans',color.muted);
 const reverseCommands=finish(1);

 // Explicit PDF objects keep the Worker dependency-free and every font embedded.
 const objects=[];const reserve=()=>{objects.push(null);return objects.length;};
 const add=value=>{objects.push(voucherPdfBytes(value));return objects.length;};
 const set=(id,value)=>{objects[id-1]=voucherPdfBytes(value);};
 const stream=(dictionary,data)=>voucherPdfConcat([voucherPdfBytes(`<<${dictionary} /Length ${data.length}>>\nstream\n`),data,voucherPdfBytes('\nendstream')]);
 const catalog=add('<< /Type /Catalog /Pages 2 0 R /ViewerPreferences << /PrintScaling /None /Duplex /DuplexFlipShortEdge >> >>');
 add('<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>');
 const page=reserve();const content=add(stream('',voucherPdfBytes(frontCommands.join('\n'))));
 const reversePage=reserve();const reverseContent=add(stream('',voucherPdfBytes(reverseCommands.join('\n'))));
 const pairs=chars.map((c,i)=>`<${(i+1).toString(16).padStart(4,'0')}> <${c.codePointAt(0).toString(16).padStart(4,'0')}>`);
 const cmap=['/CIDInit /ProcSet findresource begin','12 dict begin','begincmap','/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def','/CMapName /VoucherUnicode def','/CMapType 2 def','1 begincodespacerange','<0000> <FFFF>','endcodespacerange'];
 for(let i=0;i<pairs.length;i+=90){const chunk=pairs.slice(i,i+90);cmap.push(chunk.length+' beginbfchar',...chunk,'endbfchar');}
 cmap.push('endcmap','CMapName currentdict /CMap defineresource pop','end','end');
 const unicode=add(stream('',voucherPdfBytes(cmap.join('\n'))));
 const fontReferences={};
 for(const [key,font] of Object.entries(voucherPdfFonts)){
  const type=reserve(),descendant=reserve(),descriptor=reserve();
  const fontBytes=voucherPdfDecode(font.font),file=add(stream(` /Length1 ${fontBytes.length}`,fontBytes));
  const glyphs=new Uint8Array((chars.length+1)*2);
  const codepoint=c=>c==='Đ'&&!font.cmap[272]?68:c.codePointAt(0);
  chars.forEach((c,i)=>{const glyph=font.cmap[codepoint(c)]||0;glyphs[(i+1)*2]=glyph>>8;glyphs[(i+1)*2+1]=glyph&255;});
  const map=add(stream('',glyphs));
  const widths=chars.map((c,i)=>`${i+1} [${font.widths[codepoint(c)]||320}]`).join(' ');
  set(type,`<< /Type /Font /Subtype /Type0 /BaseFont /${font.name} /Encoding /Identity-H /DescendantFonts [${descendant} 0 R] /ToUnicode ${unicode} 0 R >>`);
  set(descendant,`<< /Type /Font /Subtype /CIDFontType2 /BaseFont /${font.name} /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${descriptor} 0 R /DW 600 /W [${widths}] /CIDToGIDMap ${map} 0 R >>`);
  set(descriptor,`<< /Type /FontDescriptor /FontName /${font.name} /Flags ${key==='serif'?34:32} /FontBBox [${font.bbox.join(' ')}] /ItalicAngle 0 /Ascent ${font.ascent} /Descent ${font.descent} /CapHeight 730 /StemV 80 /FontFile2 ${file} 0 R >>`);
  fontReferences[key]=type;
 }
 const alpha=add(stream(` /Type /XObject /Subtype /Image /Width ${voucherBrand.width} /Height ${voucherBrand.height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode`,voucherPdfDecode(voucherBrand.alpha)));
 const logo=add(stream(` /Type /XObject /Subtype /Image /Width ${voucherBrand.width} /Height ${voucherBrand.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /SMask ${alpha} 0 R`,voucherPdfDecode(voucherBrand.rgb)));
 set(page,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /TrimBox [${offsetX} ${offsetY} ${offsetX+W} ${offsetY+H}] /Resources << /Font << /VS ${fontReferences.sans} 0 R /VT ${fontReferences.serif} 0 R /VF ${fontReferences.fallback} 0 R >> /XObject << /Logo ${logo} 0 R >> >> /Contents ${content} 0 R >>`);
 set(reversePage,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /TrimBox [${offsetX} ${offsetY} ${offsetX+W} ${offsetY+H}] /Resources << /Font << /VS ${fontReferences.sans} 0 R /VT ${fontReferences.serif} 0 R /VF ${fontReferences.fallback} 0 R >> /XObject << /Logo ${logo} 0 R >> >> /Contents ${reverseContent} 0 R >>`);
 const header=voucherPdfBytes('%PDF-1.7\n%LiZaVoucher\n');const offsets=[0],chunks=[header];let offset=header.length;
 objects.forEach((object,i)=>{offsets.push(offset);const chunk=voucherPdfConcat([voucherPdfBytes(`${i+1} 0 obj\n`),object,voucherPdfBytes('\nendobj\n')]);chunks.push(chunk);offset+=chunk.length;});
 const xref=['xref',`0 ${objects.length+1}`,'0000000000 65535 f ',...offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n '),'trailer',`<< /Size ${objects.length+1} /Root ${catalog} 0 R >>`,'startxref',String(offset),'%%EOF'];
 chunks.push(voucherPdfBytes(xref.join('\n')+'\n'));return voucherPdfConcat(chunks);
}
