import { voucherFont } from './voucher-font.mjs';
import { voucherLogoJpeg } from './voucher-logo.mjs';
const voucherPdfEncoder = new TextEncoder();
const voucherPdfCopy = {
 de: {title:'Gutschein',eyebrow:'ERINNERUNGEN VERSCHENKEN',subtitle:'Zeit füreinander. Lieblingsbilder für immer.',to:'Für',from:'Von',code:'Dein Gutscheincode',redeem:'Bei deiner Shootinganfrage angeben oder zum Termin mitbringen.',footer:'Wertgutschein für persönliche Shootings. Restguthaben bleibt erhalten.',preview:'MUSTER - NICHT EINLÖSBAR'},
 en: {title:'Gift voucher',eyebrow:'GIVE THE GIFT OF MEMORIES',subtitle:'Time together. Photographs to treasure.',to:'For',from:'From',code:'Your voucher code',redeem:'Include this code with your session enquiry or bring it to your appointment.',footer:'Credit for personal photo sessions. Any remaining credit stays available.',preview:'SAMPLE - NOT VALID'},
 bs: {title:'Poklon-bon',eyebrow:'POKLONITE USPOMENE',subtitle:'Vrijeme za vas. Fotografije koje ostaju.',to:'Za',from:'Od',code:'Vaš kod poklon-bona',redeem:'Navedite kod prilikom upita ili ga ponesite na fotografisanje.',footer:'Vrijednosni bon za lična fotografisanja. Preostali iznos ostaje dostupan.',preview:'UZORAK - NIJE VAŽEĆI'}
};
function voucherPdfClean(value) { return String(value ?? '').normalize('NFC').replace(/\r\n?/g,'\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').trim(); }
export function voucherPdfTextSupported(value) { return [...voucherPdfClean(value)].every(c => /\s/.test(c) || Object.hasOwn(voucherFont.cmap, c.codePointAt(0))); }
function voucherPdfDecode(value) { return Uint8Array.from(atob(value), c => c.charCodeAt(0)); }
function voucherPdfConcat(parts) { const total=parts.reduce((n,p)=>n+p.length,0);const result=new Uint8Array(total);let at=0;for(const part of parts){result.set(part,at);at+=part.length;}return result; }
function voucherPdfBytes(value) { return typeof value==='string'?voucherPdfEncoder.encode(value):value; }
function voucherPdfWidth(value,size) { return [...value].reduce((n,c)=>n+(voucherFont.widths[c.codePointAt(0)]||320),0)*size/1000; }
function voucherPdfWrap(value,maxWidth,size,maxLines=5) {
 const lines=[];let line='';
 for(const word of value.replace(/\s+/g,' ').split(' ')){if(!word)continue;const next=line?line+' '+word:word;if(voucherPdfWidth(next,size)<=maxWidth){line=next;continue;}if(voucherPdfWidth(word,size)>maxWidth){if(line)line+=' ';for(const c of word){if(voucherPdfWidth(line+c,size)>maxWidth){lines.push(line.trimEnd());line='';}line+=c;}}else{if(line)lines.push(line);line=word;}}
 if(line)lines.push(line);if(lines.length>maxLines)throw new Error('Personal message is too long for the gift voucher.');return lines;
}
/** Dependency-free, embedded-font PDF for Cloudflare Workers. Contains no buyer information. */
export async function renderGiftVoucherPdf(input) {
 const copy=voucherPdfCopy[input.language]||voucherPdfCopy.de;
 const code=voucherPdfClean(input.code),giftTo=voucherPdfClean(input.giftTo),giftFrom=voucherPdfClean(input.giftFrom),message=voucherPdfClean(input.message);
 if(!Number.isSafeInteger(input.amountCents)||input.amountCents<1000||input.amountCents>200000)throw new Error('Invalid voucher value.');
 if(giftTo.length>80||giftFrom.length>80||message.length>300||code.length>64)throw new Error('Invalid gift voucher text length.');
 for(const value of [code,giftTo,giftFrom,message])if(!voucherPdfTextSupported(value))throw new Error('Unsupported gift voucher text.');
 const amount=(input.amountCents/100).toLocaleString(input.language==='en'?'en-IE':'de-AT',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
 const all=[...Object.values(copy),code,giftTo,giftFrom,message,amount,': ','LiZa Memories Photography','liza-memories-photography.com'];
 const chars=[...new Set(all.join('').replace(/\s/g,' ').split(''))];const cid=new Map(chars.map((c,i)=>[c,i+1]));
 const encode=value=>[...value].map(c=>(cid.get(c)||cid.get(' ')||0).toString(16).padStart(4,'0')).join('');
 const color={ink:'0.227 0.180 0.165',muted:'0.451 0.380 0.353',rose:'0.835 0.631 0.565',line:'0.878 0.784 0.729'};
 const commands=['q 0.988 0.973 0.953 rg 0 0 595.28 419.53 re f Q',`q ${color.line} RG 0.8 w 20 20 555.28 379.53 re S Q`];
 const text=(value,x,y,size=10,ink=color.ink)=>commands.push(`BT /VF ${size} Tf ${ink} rg 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm <${encode(value)}> Tj ET`);
 const centered=(value,y,size=10,ink=color.ink)=>text(value,(595.28-voucherPdfWidth(value,size))/2,y,size,ink);
 commands.push('q 172 0 0 44.7 211.64 348 cm /Logo Do Q');
 centered(copy.eyebrow,326,7.6,color.muted);
 commands.push(`BT /Title 40 Tf ${color.ink} rg 1 0 0 1 ${input.language==='en'?195:input.language==='bs'?204:213} 280 Tm (${copy.title}) Tj ET`);
 centered(copy.subtitle,258,10.2,color.muted);centered(amount,207,36);
 if(giftTo||giftFrom){
  const to=(giftTo?copy.to+': '+giftTo:'');const from=(giftFrom?copy.from+': '+giftFrom:'');
  for(const [value,x] of [[to,48],[from,314]]){let size=10.4;while(size>8&&voucherPdfWidth(value,size)>650)size-=.2;voucherPdfWrap(value,233,size,3).forEach((line,i)=>text(line,x,177-i*11,size));}
 }
 const messageLines=voucherPdfWrap(message,485,9.5,5);messageLines.forEach((line,i)=>centered(line,136-i*12,9.5,color.muted));
 commands.push(`q 0.956 0.913 0.876 rg 101 47 393.28 36 re f Q`);
 centered(copy.code,88,7.8,color.muted);centered(input.preview?copy.preview:code,59,13.2);
 centered(copy.redeem,34,7.1,color.muted);
 // Terms and order documents are supplied separately; the gift remains a clean one-page print.
 const objects=[];const add=value=>{objects.push(voucherPdfBytes(value));return objects.length;};
 const stream=(dictionary,data)=>voucherPdfConcat([voucherPdfBytes(`<<${dictionary} /Length ${data.length}>>\nstream\n`),data,voucherPdfBytes('\nendstream')]);
 const catalog=add('<< /Type /Catalog /Pages 2 0 R >>');
 add('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
 add('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 419.53] /Resources << /Font << /VF 5 0 R /Title 11 0 R >> /XObject << /Logo 12 0 R >> >> /Contents 4 0 R >>');
 add(stream('',voucherPdfBytes(commands.join('\n'))));
 add('<< /Type /Font /Subtype /Type0 /BaseFont /BitstreamVeraSans /Encoding /Identity-H /DescendantFonts [6 0 R] /ToUnicode 10 0 R >>');
 const widths=chars.map((c,i)=>`${i+1} [${voucherFont.widths[c.codePointAt(0)]||320}]`).join(' ');
 add(`<< /Type /Font /Subtype /CIDFontType2 /BaseFont /BitstreamVeraSans /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor 7 0 R /DW 600 /W [${widths}] /CIDToGIDMap 9 0 R >>`);
 add(`<< /Type /FontDescriptor /FontName /BitstreamVeraSans /Flags 32 /FontBBox [${voucherFont.bbox.join(' ')}] /ItalicAngle 0 /Ascent ${voucherFont.ascent} /Descent ${voucherFont.descent} /CapHeight 730 /StemV 80 /FontFile2 8 0 R >>`);
 const fontBytes=voucherPdfDecode(voucherFont.font);add(stream(` /Length1 ${fontBytes.length}`,fontBytes));
 const glyphs=new Uint8Array((chars.length+1)*2);chars.forEach((c,i)=>{const g=voucherFont.cmap[c.codePointAt(0)]||0;glyphs[(i+1)*2]=g>>8;glyphs[(i+1)*2+1]=g&255;});add(stream('',glyphs));
 const pairs=chars.map((c,i)=>`<${(i+1).toString(16).padStart(4,'0')}> <${c.codePointAt(0).toString(16).padStart(4,'0')}>`);
 const cmap=['/CIDInit /ProcSet findresource begin','12 dict begin','begincmap','/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def','/CMapName /VeraUnicode def','/CMapType 2 def','1 begincodespacerange','<0000> <FFFF>','endcodespacerange'];
 for(let i=0;i<pairs.length;i+=90){const chunk=pairs.slice(i,i+90);cmap.push(chunk.length+' beginbfchar',...chunk,'endbfchar');}cmap.push('endcmap','CMapName currentdict /CMap defineresource pop','end','end');add(stream('',voucherPdfBytes(cmap.join('\n'))));
 add('<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>');
 add(stream(' /Type /XObject /Subtype /Image /Width 500 /Height 130 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode',voucherPdfDecode(voucherLogoJpeg)));
 const header=voucherPdfBytes('%PDF-1.7\n%LiZaVoucher\n');const offsets=[0];const chunks=[header];let offset=header.length;
 objects.forEach((object,i)=>{offsets.push(offset);const chunk=voucherPdfConcat([voucherPdfBytes(`${i+1} 0 obj\n`),object,voucherPdfBytes('\nendobj\n')]);chunks.push(chunk);offset+=chunk.length;});
 const xref=['xref',`0 ${objects.length+1}`,'0000000000 65535 f ',...offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n '),'trailer',`<< /Size ${objects.length+1} /Root ${catalog} 0 R >>`,'startxref',String(offset),'%%EOF'];chunks.push(voucherPdfBytes(xref.join('\n')+'\n'));return voucherPdfConcat(chunks);
}
