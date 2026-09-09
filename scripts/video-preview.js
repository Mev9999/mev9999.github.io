(() => {
  const frame = document.querySelector('.shooting-video-frame');
  const video = frame?.querySelector('video');
  if (!video) return;
  let button = frame.querySelector('.video-center-play');
  if (!button) {
    button = document.createElement('button');
    button.className = 'video-center-play';
    button.type = 'button';
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 3v18l16-9Z"/></svg>';
    frame.append(button);
  }
  const lang = document.documentElement.lang;
  button.setAttribute('aria-label', ({de:'Shooting-Video abspielen',en:'Play the session video',bs:'Pokreni video fotografisanja'})[lang] || 'Play video');
  const sync = () => { button.hidden = !video.paused && !video.ended; };
  button.addEventListener('click', async () => {
    try {
      await video.play();
    } catch {
      // Native controls stay available if playback cannot start.
    }
    sync();
  });
  video.addEventListener('play', sync);
  video.addEventListener('pause', sync);
  video.addEventListener('ended', sync);
  sync();
})();
