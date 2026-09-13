(() => {
 for(const box of document.querySelectorAll('.customer-reviews')) {
  if(box.dataset.initialized)continue;box.dataset.initialized='true';
  const slides=[...box.querySelectorAll('.review-slide')],controls=box.querySelector('.review-controls'),dots=[...box.querySelectorAll('.review-dot')],count=box.querySelector('.review-count');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');let index=0,visible=false,timer;
  const show=(n,manual=false)=>{index=(n+slides.length)%slides.length;slides.forEach((s,i)=>{s.classList.toggle('is-active',i===index);s.inert=i!==index;s.setAttribute('aria-hidden',String(i!==index));});dots.forEach((dot,i)=>dot.setAttribute('aria-current',String(i===index)));count.setAttribute('aria-live',manual?'polite':'off');count.textContent=slides[index].dataset.label;};
  const schedule=()=>{clearTimeout(timer);if(visible&&!document.hidden&&!reduced.matches&&slides.length>1)timer=setTimeout(()=>{show(index+1);schedule();},12000);};
  const manual=n=>{show(n,true);schedule();};
  box.querySelector('.review-prev').addEventListener('click',()=>manual(index-1));box.querySelector('.review-next').addEventListener('click',()=>manual(index+1));dots.forEach((dot,i)=>dot.addEventListener('click',()=>manual(i)));
  box.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();manual(index+(e.key==='ArrowLeft'?-1:1));}});
  document.addEventListener('visibilitychange',schedule);reduced.addEventListener('change',schedule);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;schedule();}).observe(box);
  window.addEventListener('pagehide',()=>clearTimeout(timer));window.addEventListener('pageshow',schedule);
  show(0);box.classList.add('reviews-ready');controls.hidden=slides.length<2;box.querySelector('.review-dots').hidden=slides.length<2;schedule();
 }
})();