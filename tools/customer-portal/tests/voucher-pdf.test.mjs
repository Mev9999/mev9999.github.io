import test from 'node:test';
import assert from 'node:assert/strict';
import {renderGiftVoucherPdf} from '../backend/voucher-pdf.mjs';

const input={amountCents:10000,code:'LZ-12345-ABCDE-67890-FABCD',giftTo:'Sarah',giftFrom:'Deiner Familie',message:'Erinnerungen, die bleiben.',issuedAt:Date.parse('2026-10-23T12:00:00Z')};
const boxes=(source,key)=>[...source.matchAll(new RegExp('/'+key+' \\[([^\\]]+)\\]','g'))].map(match=>match[1].split(' ').map(Number));
const mm=points=>points*25.4/72;
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<.001,`${actual} != ${expected}`);

test('emailed cards have identical centered trim positions on two A4 landscape sheets',async()=>{
 const source=Buffer.from(await renderGiftVoucherPdf(input)).toString('latin1');
 const media=boxes(source,'MediaBox'),trim=boxes(source,'TrimBox');
 assert.equal(media.length,2);assert.deepEqual(media[0],media[1]);assert.deepEqual(trim[0],trim[1]);
 close(mm(media[0][2]),297);close(mm(media[0][3]),210);
 close(mm(trim[0][2]-trim[0][0]),210);close(mm(trim[0][3]-trim[0][1]),95);
 close(trim[0][0],(media[0][2]-(trim[0][2]-trim[0][0]))/2);
 close(trim[0][1],(media[0][3]-(trim[0][3]-trim[0][1]))/2);
 assert.match(source,/\/PrintScaling \/None/);assert.match(source,/\/Duplex \/DuplexFlipShortEdge/);
 assert.equal([...source.matchAll(/\/FontFile2 /g)].length,3);
});

test('press export matches Vistaprint unperforated 1.5 mm bleed; card export is exact trim size',async()=>{
 for(const [layout,width,height,inset] of [['press',213,98,1.5],['card',210,95,0]]){
  const source=Buffer.from(await renderGiftVoucherPdf({...input,layout,stockBlank:true})).toString('latin1');
  const media=boxes(source,'MediaBox')[0],trim=boxes(source,'TrimBox')[0];
  close(mm(media[2]),width);close(mm(media[3]),height);close(mm(trim[0]),inset);close(mm(trim[1]),inset);
  close(mm(trim[2]-trim[0]),210);close(mm(trim[3]-trim[1]),95);
 }
});

test('supported long dedication and DE/EN/BS characters fit without dropping the two-sided layout',async()=>{
 for(const language of ['de','en','bs']){
  for(const values of [{giftTo:'Željka & Đorđe',giftFrom:'Šeherzada',message:'Freude · Uspomene · Memories'},{giftTo:'W'.repeat(80),giftFrom:'M'.repeat(80),message:'W'.repeat(300)}]){
   const pdf=await renderGiftVoucherPdf({...input,...values,language,amountCents:200000});
   assert.match(Buffer.from(pdf).toString('latin1'),/\/Type \/Pages \/Kids \[3 0 R 5 0 R\] \/Count 2/);
  }
 }
 await assert.rejects(renderGiftVoucherPdf({...input,layout:'unknown'}));
});
