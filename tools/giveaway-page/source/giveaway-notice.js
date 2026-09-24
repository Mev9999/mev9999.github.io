(() => {
  const banner=document.querySelector('[data-giveaway-notice]');
  if(!banner)return;
  const starts=Date.parse(banner.dataset.starts),ends=Date.parse(banner.dataset.ends);
  const update=()=>{const now=Date.now();banner.hidden=!(Number.isFinite(starts)&&Number.isFinite(ends)&&now>=starts&&now<=ends&&banner.dataset.ready==='true');};
  update();
  setInterval(update,1000);
  document.addEventListener('visibilitychange',update);
  window.addEventListener('pageshow',update);
})();
