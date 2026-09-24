(() => {
 const burger=document.querySelector('#burger'),nav=document.querySelector('nav.primary'),langButton=document.querySelector('#langBtn'),langMenu=document.querySelector('#langMenu');
 function closeNav(){nav.classList.remove('open');burger.classList.remove('active');burger.setAttribute('aria-expanded','false');}
 burger.addEventListener('click',()=>{const open=burger.getAttribute('aria-expanded')!=='true';nav.classList.toggle('open',open);burger.classList.toggle('active',open);burger.setAttribute('aria-expanded',String(open));});
 nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeNav));
 langButton.addEventListener('click',()=>{const open=langMenu.classList.toggle('open');langButton.setAttribute('aria-expanded',String(open));});
 document.addEventListener('click',e=>{if(!e.target.closest('#langSwitch')){langMenu.classList.remove('open');langButton.setAttribute('aria-expanded','false');}});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeNav();langMenu.classList.remove('open');langButton.setAttribute('aria-expanded','false');}});
 // Consent UI links are relative to its original root page; preserve that destination here.
 new MutationObserver(()=>document.querySelectorAll('[href^="datenschutz"]').forEach(a=>a.setAttribute('href','../'+a.getAttribute('href')))).observe(document.body,{childList:true,subtree:true});
})();