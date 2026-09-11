(() => {
 const details=document.querySelector('.mobile-services-toggle');if(!details)return;
 const mobile=matchMedia('(max-width:900px)');
 const update=()=>{details.open=!mobile.matches;};update();mobile.addEventListener('change',update);
 details.addEventListener('toggle',()=>{if(!mobile.matches&&!details.open)details.open=true;});
})();
