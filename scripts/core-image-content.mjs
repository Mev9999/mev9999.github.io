import fs from 'node:fs';
const content=JSON.parse(fs.readFileSync(new URL('./core-image-content.json',import.meta.url),'utf8'));
export const coreImageAliases=content.filenames;
const reverse=Object.fromEntries(Object.entries(coreImageAliases).map(([source,target])=>[target,source]));
export function coreImageScope(file){return ['index.html','babybauch-shooting-graz.html','newborn-fotografie-graz.html','familienfotografie-graz.html'].includes(file.replace(/-(en|bs)\.html$/,'.html'));}

// The reviewed descriptions are the source of truth for generated HTML and lightboxes.
// Original public files stay available; aliases only improve names used by these pages.
export function applyCoreImageContent(document,file){
 if(!coreImageScope(file))return;
 const lang=file.match(/-(en|bs)\.html$/)?.[1]||'de';
 const open={de:'Bild vergrößern',en:'Enlarge photo',bs:'Uvećaj fotografiju'}[lang];
 for(const image of document.querySelectorAll('img[src]')){
  const src=image.getAttribute('src'),original=reverse[src]||src,description=content.descriptions[original];
  if(!description)continue;
  image.alt=description[lang];
  if(coreImageAliases[original])image.setAttribute('src',coreImageAliases[original]);
  const trigger=image.closest('[role="button"]');
  if(trigger)trigger.setAttribute('aria-label',`${open}: ${image.alt}`);
 }
 // This repeated mobile wordmark adds no information beyond the adjacent brand heading.
 document.querySelectorAll('img.mobile-hero-logo').forEach(image=>{image.alt='';});
}
