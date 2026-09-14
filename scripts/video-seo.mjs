// Duration measured from the actual MP4; publication date requires owner confirmation.
export function applyVideoSeo(d,file){
 if(!/^index(?:-(?:en|bs))?\.html$/.test(file))return;
 const lang=d.documentElement.lang,i=['de','en','bs'].indexOf(lang),v=d.querySelector('#shooting-video video');if(!v)return;
 d.querySelector('#shooting-video-schema')?.remove();
 const name=['Fotoshooting bei LiZa Memories Photography in Graz – Einblicke hinter die Kulissen','Photoshoot at LiZa Memories Photography in Graz – behind the scenes','Fotografisanje u LiZa Memories Photography u Grazu – iza kulisa'][i];
 const description=['Ein Blick hinter die Kulissen eines Fotoshootings bei LiZa Memories Photography in Graz. Lernt die persönliche Atmosphäre für Babybauchfotos, Neugeborenenfotos und Familienfotos kennen.','A behind-the-scenes look at a photoshoot at LiZa Memories Photography in Graz and the personal atmosphere for maternity, newborn and family photos.','Pogled iza kulisa fotografisanja u LiZa Memories Photography u Grazu i lična atmosfera za trudničke fotografije, fotografije novorođenčadi i porodice.'][i];
 const origin='https://liza-memories-photography.com/';
 const schema={'@context':'https://schema.org','@type':'VideoObject','@id':origin+'#behind-the-scenes-video',name,description,thumbnailUrl:new URL(v.getAttribute('poster'),origin).href,duration:'PT1M16.333S',contentUrl:new URL(v.querySelector('source').getAttribute('src'),origin).href};
 // Owner confirmed first publication of this version on 2026-09-10; time unknown.
 schema.uploadDate='2026-09-10';
 const script=d.createElement('script');script.type='application/ld+json';script.id='shooting-video-schema';script.textContent=JSON.stringify(schema);d.head.append(script);
}
