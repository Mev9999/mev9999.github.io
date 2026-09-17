const fs=require('fs'),path=require('path');
const dir=__dirname;
const assets=[1,2,3,4,5,6].map(i=>'data:image/webp;base64,'+fs.readFileSync(path.join(dir,'assets',`panel-${i}.webp`)).toString('base64'));
const font=fs.readFileSync(path.join(dir,'assets','Antonio-Regular.ttf')).toString('base64');
const html=fs.readFileSync(path.join(dir,'viewer.template.html'),'utf8').replace('__ASSETS__',JSON.stringify(assets)).replace('__ANTONIO__',font).replace('__FONTLICENSE__',JSON.stringify(fs.readFileSync(path.join(dir,'Antonio-OFL.txt'),'utf8')));
const out=path.resolve(dir,'../../flyer');
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'index.html'),html);
console.log('Flyer updated: '+(Buffer.byteLength(html)/1024/1024).toFixed(2)+' MiB');
