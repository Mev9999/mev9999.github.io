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

/** A photo-free A5 gift certificate with a service-and-information reverse, rendered in the Worker. */
export async function renderGiftVoucherPdf(input) {
 const copy=voucherPdfCopyByLanguage[input.language]||voucherPdfCopyByLanguage.de;
 const details=voucherPdfDetailCopy[input.language]||voucherPdfDetailCopy.de;
 const issuedDate=Number.isFinite(input.issuedAt)&&input.issuedAt>0?new Intl.DateTimeFormat(input.language==='en'?'en-GB':input.language==='bs'?'bs-BA':'de-AT',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'Europe/Vienna'}).format(new Date(input.issuedAt)):'';
 const code=voucherPdfClean(input.code),giftTo=voucherPdfClean(input.giftTo),giftFrom=voucherPdfClean(input.giftFrom),message=voucherPdfClean(input.message);
 if(!Number.isSafeInteger(input.amountCents)||input.amountCents<1000||input.amountCents>200000)throw new Error('Invalid voucher value.');
 if(giftTo.length>80||giftFrom.length>80||message.length>300||code.length>64)throw new Error('Invalid gift voucher text length.');
 for(const value of [code,giftTo,giftFrom,message])if(!voucherPdfTextSupported(value))throw new Error('Unsupported gift voucher text.');
 const amount=(input.amountCents/100).toLocaleString(input.language==='en'?'en-IE':'de-AT',{minimumFractionDigits:input.amountCents%100?2:0,maximumFractionDigits:2}).replace(/\s/g,' ')+' €';
 const website='liza-memories-photography.com';
 const issuer='LiZa Memories Photography · Emina Huremovic';
 const address='Mela-Spira-Straße 32b · 8054 Graz-Straßgang · Österreich';
 const email='info@liza-memories-photography.com',phone='+43 681 819 427 80';
 const termsUrl='portal.liza-memories-photography.com/gutscheinbedingungen'+(['en','bs'].includes(input.language)?'-'+input.language:'')+'.html';
 const chars=[...new Set([...Object.values(copy),...Object.values(details).flat(),code,giftTo,giftFrom,message,amount,website,issuer,address,email,phone,termsUrl,issuedDate,': ',' · '].join('').replace(/\s/g,' ').split(''))];
 const cid=new Map(chars.map((c,i)=>[c,i+1]));
 const encode=value=>[...value].map(c=>(cid.get(c)||cid.get(' ')||0).toString(16).padStart(4,'0')).join('');
 const color={paper:'0.984 0.969 0.949',ink:'0.227 0.176 0.157',muted:'0.451 0.365 0.329',rose:'0.627 0.416 0.353',line:'0.827 0.706 0.639',light:'0.965 0.906 0.851',soft:'0.812 0.686 0.612'};
 const commands=[`q ${color.paper} rg 0 0 595.28 419.53 re f ${color.ink} rg 408 0 187.28 419.53 re f Q`];
 const text=(value,x,y,size=10,face='sans',ink=color.ink,tracking=0)=>{
  let cursor=x;
  // Per-character positioning preserves Unicode fallback widths and deliberate tracking.
  for(const char of value){
   const key=voucherPdfFaceFor(char,face),fontName={sans:'VS',serif:'VT',fallback:'VF'}[key];
   commands.push(`BT /${fontName} ${size.toFixed(3)} Tf ${ink} rg 1 0 0 1 ${cursor.toFixed(3)} ${y.toFixed(3)} Tm <${encode(char)}> Tj ET`);
   if(char==='Đ'&&key==='fallback')commands.push(`q ${ink} RG ${(size*.075).toFixed(3)} w ${(cursor+size*.02).toFixed(3)} ${(y+size*.34).toFixed(3)} m ${(cursor+size*.42).toFixed(3)} ${(y+size*.34).toFixed(3)} l S Q`);
   cursor+=voucherPdfAdvance(char,size,face)+tracking;
  }
 };
 const center=(value,y,size=10,face='sans',ink=color.light,tracking=0)=>text(value,501.64-voucherPdfWidth(value,size,face,tracking)/2,y,size,face,ink,tracking);
 const line=(x,y,x2,y2,ink=color.line,stroke=.5)=>commands.push(`q ${ink} RG ${stroke} w ${x} ${y} m ${x2} ${y2} l S Q`);
 // Fine inset rules are part of the composition, not a coupon/form border.
 line(17,17,391,17);line(17,17,17,402.53);line(17,402.53,391,402.53);
 line(425,17,578.28,17,color.rose);line(578.28,17,578.28,402.53,color.rose);line(425,402.53,578.28,402.53,color.rose);
 commands.push(`q 183 0 0 ${(183*voucherBrand.height/voucherBrand.width).toFixed(3)} 36 344 cm /Logo Do Q`);
 text(copy.eyebrow,38,318,6.4,'sans',color.rose,1.55);
 let titleSize=input.language==='en'?58:64;
 while(voucherPdfWidth(copy.title,titleSize,'serif')>334)titleSize-=.5;
 text(copy.title,34,262,titleSize,'serif');
 text(copy.subtitle,38,242,9.3,'sans',color.muted);
 let servicesSize=7;while(voucherPdfWidth(details.serviceLine,servicesSize,'sans')>334)servicesSize-=.1;
 text(details.serviceLine,38,228,servicesSize,'sans',color.rose);
 line(38,218,71,218,color.rose,.8);

 // Set the dedication as a personal note, with type and spacing adapting to long names.
 const dedication=[];
 if(giftTo)dedication.push({kind:'name',label:copy.to,value:giftTo,base:26});
 if(message)dedication.push({kind:'message',value:message,base:12.4});
 if(giftFrom)dedication.push({kind:'sender',label:copy.from,value:giftFrom,base:18});
 let scale=1,blocks=[],height=0;
 do{
  blocks=dedication.map(block=>{const size=Math.max(block.kind==='message'?8.4:8.8,block.base*scale);const lines=voucherPdfWrap(block.value,334,size,'serif');const leading=size*(block.kind==='message'?1.18:1.04);return {...block,size,lines,leading,height:(block.label?14:0)+lines.length*leading};});
  height=blocks.reduce((total,block)=>total+block.height,0)+Math.max(0,blocks.length-1)*12;
  if(height<=170)break;
  scale-=.025;
 }while(scale>=.3);
 if(height>170)throw new Error('Personal message is too long for the gift voucher.');
 let y=209;
 if(!dedication.length){
  // Keep the unpersonalised version intentional, with space for a handwritten note.
  text(copy.to,38,196,6.1,'sans',color.rose,1.2);line(38,153,372,153);
  text(copy.from,38,117,6.1,'sans',color.rose,1.2);line(38,74,372,74);
 }else for(const block of blocks){
  if(block.label){text(block.label,38,y,6.1,'sans',color.rose,1.15);y-=14;}
  block.lines.forEach(value=>{text(value,38,y-block.size*.75,block.size,'serif',block.kind==='message'?color.muted:color.ink);y-=block.leading;});
  y-=12;
 }
 text(website,38,31,6.3,'sans',color.muted,.15);
 if(issuedDate){const issued=details.issued+': '+issuedDate;text(issued,372-voucherPdfWidth(issued,6.3,'sans'),31,6.3,'sans',color.muted);}

 // An original line-drawn aperture gives a photographic signature without client images.
 const cx=501.64,cy=339,r=38,inner=20;
 const points=Array.from({length:6},(_,i)=>{const angle=(i*60+30)*Math.PI/180;return [cx+r*Math.cos(angle),cy+r*Math.sin(angle)];});
 const core=Array.from({length:6},(_,i)=>{const angle=(i*60)*Math.PI/180;return [cx+inner*Math.cos(angle),cy+inner*Math.sin(angle)];});
 commands.push(`q ${color.rose} RG 0.7 w ${cx+r+9} ${cy} m ${cx+r+9} ${cy+25.96} ${cx+25.96} ${cy+r+9} ${cx} ${cy+r+9} c ${cx-25.96} ${cy+r+9} ${cx-r-9} ${cy+25.96} ${cx-r-9} ${cy} c ${cx-r-9} ${cy-25.96} ${cx-25.96} ${cy-r-9} ${cx} ${cy-r-9} c ${cx+25.96} ${cy-r-9} ${cx+r+9} ${cy-25.96} ${cx+r+9} ${cy} c S Q`);
 for(let i=0;i<6;i++){
  line(...core[i],...core[(i+1)%6],color.soft,.65);
  line(...core[i],...points[(i+1)%6],color.rose,.65);
 }
 center(copy.value,265,6.2,'sans',color.soft,1.35);
 let amountSize=57;while(voucherPdfWidth(amount,amountSize,'serif')>140)amountSize-=.5;
 center(amount,211,amountSize,'serif');
 center(copy.session,187,5.9,'sans',color.soft,.8);
 line(436,161,567.28,161,color.rose,.55);
 center(copy.code,139,5.7,'sans',color.soft,1.1);
 const codeLabel=input.preview?copy.preview:code;
 let codeSize=8.8;while(voucherPdfWidth(codeLabel,codeSize,'sans',.1)>143&&codeSize>4)codeSize-=.1;
 center(codeLabel,120,codeSize,'sans',color.light,.1);
 const redeemLines=voucherPdfWrap(copy.redeem,134,7.0,'sans');
 redeemLines.forEach((value,i)=>center(value,94-i*10.1,7,'sans',color.soft));
 center(details.validityTitle,65,6.3,'sans',color.light,.5);
 center(details.validityShort,55,5.7,'sans',color.soft);
 let lawSize=5.7;while(voucherPdfWidth(details.validityLaw,lawSize,'sans')>145)lawSize-=.1;
 center(details.validityLaw,46,lawSize,'sans',color.soft);
 center(copy.place,31,5.7,'sans',color.soft,1.1);

 // A separate reverse keeps the approved gift face airy and all practical details readable.
 const frontCommands=commands.splice(0);
 commands.push(`q ${color.paper} rg 0 0 595.28 419.53 re f Q`);
 line(17,17,578.28,17);line(17,17,17,402.53);line(17,402.53,578.28,402.53);line(578.28,17,578.28,402.53);
 commands.push(`q 134 0 0 ${(134*voucherBrand.height/voucherBrand.width).toFixed(3)} 38 350 cm /Logo Do Q`);
 const backCode=input.preview?copy.preview:code;
 text(backCode,557-voucherPdfWidth(backCode,6.8,'sans'),369,6.8,'sans',color.muted);
 if(issuedDate){const issued=details.issued+': '+issuedDate;text(issued,557-voucherPdfWidth(issued,6.5,'sans'),355,6.5,'sans',color.muted);}
 text(details.backTitle,38,319,28,'serif');
 text(details.backIntro,38,300,9,'sans',color.muted);
 const serviceKinds=['maternity','newborn','family','wedding','camera'];
 details.services.forEach((label,index)=>{
  const x=90+index*104;
  commands.push(voucherServiceIconPdf(serviceKinds[index],x,263,34,color.rose));
  let size=8.6;while(voucherPdfWidth(label,size,'sans')>98)size-=.1;
  text(label,x-voucherPdfWidth(label,size,'sans')/2,233,size,'sans',color.ink);
 });
 line(38,214,557,214);
 const paragraph=(value,x,y,maxWidth,size=8.3,leading=12)=>{const lines=voucherPdfWrap(value,maxWidth,size,'sans');lines.forEach((value,i)=>text(value,x,y-i*leading,size,'sans',color.muted));return y-lines.length*leading;};
 text(details.redeemTitle,38,195,15.5,'serif');
 paragraph(details.redeemText,38,178,241);
 text(details.creditTitle,315,195,15.5,'serif');
 paragraph(details.creditText,315,178,242);
 text(details.validityTitle,38,109,8.3,'sans',color.rose,.5);
 paragraph(details.validityShort+' '+details.validityLaw,38,96,519,8.1,11);
 paragraph(details.exclusions,38,82,519,7,10);
 paragraph(details.cash,38,71,519,7,10);
 line(38,61,557,61);
 text(issuer,38,49,7,'sans',color.ink);
 text(address,38,38,6.4,'sans',color.muted);
 text(email+' · '+phone,315,49,6.5,'sans',color.ink);
 text(details.terms+': '+termsUrl,315,38,5.8,'sans',color.muted);

 // Explicit PDF objects keep the Worker dependency-free and every font embedded.
 const objects=[];const reserve=()=>{objects.push(null);return objects.length;};
 const add=value=>{objects.push(voucherPdfBytes(value));return objects.length;};
 const set=(id,value)=>{objects[id-1]=voucherPdfBytes(value);};
 const stream=(dictionary,data)=>voucherPdfConcat([voucherPdfBytes(`<<${dictionary} /Length ${data.length}>>\nstream\n`),data,voucherPdfBytes('\nendstream')]);
 const catalog=add('<< /Type /Catalog /Pages 2 0 R >>');
 add('<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>');
 const page=reserve();const content=add(stream('',voucherPdfBytes(frontCommands.join('\n'))));
 const reversePage=reserve();const reverseContent=add(stream('',voucherPdfBytes(commands.join('\n'))));
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
 set(page,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 419.53] /Resources << /Font << /VS ${fontReferences.sans} 0 R /VT ${fontReferences.serif} 0 R /VF ${fontReferences.fallback} 0 R >> /XObject << /Logo ${logo} 0 R >> >> /Contents ${content} 0 R >>`);
 set(reversePage,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 419.53] /Resources << /Font << /VS ${fontReferences.sans} 0 R /VT ${fontReferences.serif} 0 R /VF ${fontReferences.fallback} 0 R >> /XObject << /Logo ${logo} 0 R >> >> /Contents ${reverseContent} 0 R >>`);
 const header=voucherPdfBytes('%PDF-1.7\n%LiZaVoucher\n');const offsets=[0],chunks=[header];let offset=header.length;
 objects.forEach((object,i)=>{offsets.push(offset);const chunk=voucherPdfConcat([voucherPdfBytes(`${i+1} 0 obj\n`),object,voucherPdfBytes('\nendobj\n')]);chunks.push(chunk);offset+=chunk.length;});
 const xref=['xref',`0 ${objects.length+1}`,'0000000000 65535 f ',...offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n '),'trailer',`<< /Size ${objects.length+1} /Root ${catalog} 0 R >>`,'startxref',String(offset),'%%EOF'];
 chunks.push(voucherPdfBytes(xref.join('\n')+'\n'));return voucherPdfConcat(chunks);
}
