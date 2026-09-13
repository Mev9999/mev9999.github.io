(() => {
 for(const box of document.querySelectorAll('.customer-reviews')) {
  if(box.dataset.initialized)continue;box.dataset.initialized='true';
  const slides=[...box.querySelectorAll('.review-slide')],controls=box.querySelector('.review-controls'),pause=box.querySelector('.review-pause'),count=box.querySelector('.review-count');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let index=0,playing=!reduced.matches,hover=false,visible=false,timer;
  const show=(n,announce=false)=>{index=(n+slides.length)%slides.length;slides.forEach((s,i)=>{s.classList.toggle('is-active',i===index);s.inert=i!==index;s.setAttribute('aria-hidden',String(i!==index));});count.setAttribute('aria-live',announce?'polite':'off');count.textContent=slides[index].dataset.label;};
  const schedule=()=>{clearTimeout(timer);pause.textContent=playing?pause.dataset.pause:pause.dataset.play;pause.setAttribute('aria-label',pause.textContent);if(playing&&!hover&&visible&&!document.hidden)timer=setTimeout(()=>{show(index+1);schedule();},9000);};
  const manual=delta=>{playing=false;show(index+delta,true);schedule();};
  box.querySelector('.review-prev').addEventListener('click',()=>manual(-1));box.querySelector('.review-next').addEventListener('click',()=>manual(1));
  pause.addEventListener('click',()=>{playing=!playing;schedule();});
  box.addEventListener('focusin',()=>{playing=false;schedule();});
  box.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();manual(e.key==='ArrowLeft'?-1:1);}});
  box.addEventListener('mouseenter',()=>{hover=true;schedule();});box.addEventListener('mouseleave',()=>{hover=false;schedule();});
  document.addEventListener('visibilitychange',schedule);
  reduced.addEventListener('change',()=>{if(reduced.matches)playing=false;schedule();});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;schedule();}).observe(box);
  window.addEventListener('pagehide',()=>clearTimeout(timer));window.addEventListener('pageshow',schedule);
  show(0);box.classList.add('reviews-ready');controls.hidden=slides.length<2;schedule();
 }
})();
