import assert from 'node:assert/strict';

export function validateImageLoading(cache) {
  let heroes = 0;
  for (const [file, { document }] of cache) {
    const hero = document.querySelector('.hero-visual img, .hero .art img');
    if (!hero) continue;
    heroes++;
    const preloads = document.querySelectorAll('link[rel="preload"][as="image"]');
    assert.equal(preloads.length, 1, file + ': exactly one image preload');
    const preload = preloads[0];
    assert.equal(preload.getAttribute('href'), hero.getAttribute('src'), file + ': preload the visible hero, not a gallery image');
    assert.equal(preload.getAttribute('imagesrcset'), hero.getAttribute('srcset'), file + ': matching responsive sources');
    assert.equal(preload.getAttribute('imagesizes'), hero.getAttribute('sizes'), file + ': matching preload slot sizes');
    assert.equal(hero.getAttribute('loading'), 'eager', file + ': hero must not be lazy');
    assert.equal(hero.getAttribute('fetchpriority'), 'high', file + ': hero fetch priority');
    assert.equal(preload.getAttribute('fetchpriority'), 'high', file + ': preload fetch priority');
    const originalWidth = Number(hero.getAttribute('width'));
    const originalHeight = Number(hero.getAttribute('height'));
    assert(hero.getAttribute('srcset').split(',').some(candidate => candidate.trim() === hero.getAttribute('src') + ' ' + originalWidth + 'w'), file + ': retain full-size source for high pixel densities');
    if (hero.closest('.hero-visual')) {
      const ratio = hero.style.aspectRatio.match(/^auto\s+(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
      assert(ratio, file + ': reserve intrinsic hero geometry before image decode');
      assert.equal(Number(ratio[1]) / Number(ratio[2]), originalWidth / originalHeight, file + ': reserve the actual image aspect ratio');
      assert(!/36vw/.test(hero.sizes), file + ': do not grow desktop source size with unbounded viewport width');
    }
    for (const image of document.querySelectorAll('.masonry img')) {
      assert(!image.hasAttribute('data-responsive-sizes'), file + ': no legacy pre-scaled gallery hint');
      assert(image.srcset && image.sizes, file + ': keep responsive gallery sources');
    }
  }
  assert.equal(heroes, 24, 'Validate every homepage, about and service hero in all languages');
  console.log('Image loading checks passed: 24 heroes, matching single preloads, intrinsic geometry, bounded desktop hints and original sources.');
}
