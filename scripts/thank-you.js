(() => {
  const link=document.getElementById('return-link');
  if(!link)return;
  const lang=['de','en','bs'].includes(document.documentElement.lang)?document.documentElement.lang:'de';
  const fallback=lang==='de'?'index.html':'index-'+lang+'.html';
  const from=new URLSearchParams(location.search).get('from');
  const allowed=/^(?:index|preise|ueber-mich|portraitfotografie-graz|babybauch-shooting-graz|newborn-fotografie-graz|familienfotografie-graz|hochzeitsfotograf-graz|babybauch-und-neugeborenen-shooting-graz)(?:-(?:en|bs))?\.html$/;
  const target=new URL(allowed.test(from||'')?from:fallback,location.href);
  target.hash='contact-form-card';
  link.href=target.href;
  link.addEventListener('click',event=>{
    if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    let previous;try{previous=new URL(document.referrer);}catch{return;}
    const previousFile=previous.pathname.split('/').pop()||'index.html';
    if(history.length>1&&previous.origin===location.origin&&previousFile===(allowed.test(from||'')?from:fallback)){
      event.preventDefault();history.back();
    }
  });
})();
