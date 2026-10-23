import fs from 'node:fs/promises';
import path from 'node:path';
import { renderGiftVoucherPdf } from '../customer-portal/backend/voucher-pdf.mjs';

// Offline only: no orders, live voucher codes, payments or emails are created.
const output=path.resolve(process.argv[2]||'output/pdf/gutscheine');
await fs.mkdir(output,{recursive:true});
const sample={language:'de',amountCents:15000,code:'LZ-MUSTER-NICHT-EINLOESBAR',giftTo:'Sarah',giftFrom:'Deiner Familie',message:'Zum Geburtstag schenken wir dir gemeinsame Zeit und Erinnerungen, die bleiben. Von Herzen nur das Beste für dich!',issuedAt:Date.parse('2026-10-23T10:00:00Z'),preview:true};
const samples={
 'Gutschein-Vistaprint-213x98mm':{...sample,stockBlank:true,layout:'press'},
 'Gutschein-E-Mail-A4-Duplex-Muster':sample,
};
for(const [name,input] of Object.entries(samples))await fs.writeFile(path.join(output,name+'.pdf'),await renderGiftVoucherPdf(input));
if(process.argv.includes('--qa')){
 const qa=path.join(output,'qa');await fs.mkdir(qa,{recursive:true});
 const cases={
  'de-card':{...sample,layout:'card'},
  'blank-card':{...sample,stockBlank:true,layout:'card'},
  'empty':{...sample,giftTo:'',giftFrom:'',message:''},
  'en':{...sample,language:'en',amountCents:200000,giftTo:'Charlotte & Alexander',giftFrom:'Your family',message:'A little time together. A whole collection of memories. Happy birthday!'},
  'bs':{...sample,language:'bs',giftTo:'Željka & Đorđe',giftFrom:'Šeherzada i Čedomir',message:'Za naše najdraže ljude: vrijeme za vas i uspomene koje ćete zauvijek čuvati.'},
  'long':{...sample,giftTo:'W'.repeat(80),giftFrom:'M'.repeat(80),message:'W'.repeat(300),amountCents:200000},
  'code':{...sample,preview:false,code:'LZ-12345-ABCDE-67890-FABCD',amountCents:12599},
 };
 for(const [name,input] of Object.entries(cases))await fs.writeFile(path.join(qa,name+'.pdf'),await renderGiftVoucherPdf(input));
}
console.log('Voucher print files saved to '+output);
