(() => {
  // The October 2026 campaign is closed, including on cached pages.
  const banner = document.querySelector('[data-giveaway-notice]');
  if (banner) banner.hidden = true;
})();
