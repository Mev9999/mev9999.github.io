(() => {
 for(const box of document.querySelectorAll('.customer-reviews')) {
  if(box.dataset.initialized)continue;box.dataset.initialized='true';
  const slides=[...box.querySelectorAll('.review-slide')],controls=box.querySelector('.review-controls'),dots=[...box.querySelectorAll('.review-dot')],count=box.querySelector('.review-count');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');let index=0,visible=false,timer;
  const show=(n,manual=false)=>{index=(n+slides.length)%slides.length;slides.forEach((s,i)=>{s.classList.toggle('is-active',i===index);s.inert=i!==index;s.setAttribute('aria-hidden',String(i!==index));});dots.forEach((dot,i)=>dot.setAttribute('aria-current',String(i===index)));count.setAttribute('aria-live',manual?'polite':'off');count.textContent=slides[index].dataset.label;};
  const schedule=()=>{clearTimeout(timer);if(visible&&!document.hidden&&!reduced.matches&&slides.length>1)timer=setTimeout(()=>{show(index+1);schedule();},12000);};
  const manual=n=>{
   show(n,true);schedule();
   // Align after the new slide has changed the layout, including browser scroll anchoring.
   requestAnimationFrame(()=>{
    const heading=box.querySelector('h3');
    const header=document.querySelector('header');
    const inset=(header?header.getBoundingClientRect().height:0)+16;
    window.scrollTo({top:Math.max(0,window.scrollY+heading.getBoundingClientRect().top-inset),behavior:'instant'});
   });
  };
  const track=box.querySelector('.review-track');let gesture=null;
  track.addEventListener('touchstart',e=>{
   gesture=e.touches.length===1?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null;
  },{passive:true});
  track.addEventListener('touchend',e=>{
   if(!gesture)return;
   const touch=e.changedTouches[0],dx=touch.clientX-gesture.x,dy=touch.clientY-gesture.y;gesture=null;
   if(Math.abs(dx)>=50&&Math.abs(dx)>Math.abs(dy)*1.5)manual(index+(dx<0?1:-1));
  },{passive:true});
  track.addEventListener('touchcancel',()=>{gesture=null;},{passive:true});
  box.querySelector('.review-prev').addEventListener('click',()=>manual(index-1));box.querySelector('.review-next').addEventListener('click',()=>manual(index+1));dots.forEach((dot,i)=>dot.addEventListener('click',()=>manual(i)));
  box.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();manual(index+(e.key==='ArrowLeft'?-1:1));}});
  document.addEventListener('visibilitychange',schedule);reduced.addEventListener('change',schedule);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;schedule();}).observe(box);
  window.addEventListener('pagehide',()=>clearTimeout(timer));window.addEventListener('pageshow',schedule);
  show(0);box.classList.add('reviews-ready');controls.hidden=slides.length<2;box.querySelector('.review-dots').hidden=slides.length<2;schedule();
 }
})();