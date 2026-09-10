export function applyPrivacy(document,fileName){
  const lang=fileName.match(/-(en|bs)\.html$/)?.[1]||'de';
  const title={de:'Datenschutzeinstellungen',en:'Privacy settings',bs:'Postavke privatnosti'}[lang];
  document.querySelectorAll('link[href*="fonts.googleapis.com"],link[href*="fonts.gstatic.com"]').forEach(e=>e.remove());
  if(document.querySelector('header')&&!document.querySelector('link[href^="fonts/fonts.css"]')){
    const link=document.createElement('link');link.rel='stylesheet';link.href='fonts/fonts.css?v=20260910';document.head.querySelector('meta[charset]')?.after(link);
  }
  document.querySelectorAll('script[src*="cloudflareinsights.com"]').forEach(script=>{
    if(script.hasAttribute('data-cf-beacon')){
      let config=document.getElementById('cloudflare-analytics-config');if(!config){config=document.createElement('script');config.type='application/json';config.id='cloudflare-analytics-config';document.head.append(config);}
      config.textContent=script.getAttribute('data-cf-beacon');
    }
    script.remove();
  });
  document.querySelectorAll('link[href*="cloudflareinsights.com"]').forEach(e=>e.remove());
  for(const [tag,attr,file] of [['link','href','privacy-consent.css'],['script','src','privacy-consent.js']]){
    let node=document.querySelector(`${tag}[${attr}^="scripts/${file}"]`);
    if(!node){node=document.createElement(tag);node.setAttribute(attr,`scripts/${file}?v=20260910`);if(tag==='link')node.rel='stylesheet';else node.defer=true;document.head.append(node);}
  }
  let button=document.querySelector('footer [data-privacy-settings]');
  if(!button){button=document.createElement('button');button.type='button';button.className='privacy-settings-link';button.setAttribute('data-privacy-settings','');let footer=document.querySelector('.footer-secondary-links')||document.querySelector('footer');if(!footer){footer=document.createElement('footer');footer.className='privacy-footer';document.body.append(footer);}footer.append(button);}
  button.textContent=title;
  button.setAttribute('aria-haspopup','dialog');
  // Never serialize an auto-open runtime dialog into generated HTML.
  document.getElementById('privacy-dialog')?.remove();
}
