'use strict';
const os=require('node:os'),path=require('node:path');
function loadPreviewConfig(env=process.env){
 const url=new URL(env.LIZA_VOUCHER_PREVIEW_URL||'http://127.0.0.1:8791');
 const loopback=new Set(['localhost','127.0.0.1','[::1]']);
 if(!['http:','https:'].includes(url.protocol)||!loopback.has(url.hostname)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('Voucher preview scripts may run only against a loopback origin, for example http://127.0.0.1:8791.');
 const base=url.origin;
 function localUrl(value){const target=new URL(value,base);if(target.origin!==base||!loopback.has(target.hostname))throw new Error('Refusing a voucher preview request outside the configured loopback origin.');return target.href;}
 return {base,localUrl,out:path.resolve(env.LIZA_VOUCHER_ARTIFACT_DIR||path.join(os.tmpdir(),'liza-voucher-preview')),playwrightModule:env.LIZA_PLAYWRIGHT_MODULE||'playwright',browserOptions:{headless:true,...(env.LIZA_CHROME_EXECUTABLE?{executablePath:env.LIZA_CHROME_EXECUTABLE}:{channel:'chrome'})}};
}
module.exports={loadPreviewConfig};
