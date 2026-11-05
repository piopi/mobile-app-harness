/* global document, matchMedia, addEventListener, IntersectionObserver */
// The site's one small script (inlined in <head>; no animation library: CSS does the motion, this only says when).
// - `.reveal` blocks and guide steps rise in as they scroll into view.
// - The landing's search button opens Starlight's search.
// - A guide's progress line fills as its steps pass, and the last step lands the closing line.
// - Clips play on their own, muted and looping, unless the reader asked for less motion; then they wait for a tap.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Before the first paint: what the script reveals starts hidden only when the script runs.
  document.documentElement.classList.add('js');
  const ready = (fn) => (document.readyState === 'loading' ? addEventListener('DOMContentLoaded', fn) : fn());
  ready(() => {
    // Starlight closes its search on any click outside it: stop ours before it reaches the window.
    for (const b of document.querySelectorAll('[data-open-search]')) {
      if (/(Mac|iPhone|iPod|iPad)/i.test(navigator.platform)) b.querySelector('kbd')?.replaceChildren('⌘ K');
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelector('site-search button[data-open-modal]')?.click();
      });
    }

    const seen = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add('in');
          seen.unobserve(e.target);
        }
      },
      { rootMargin: '0px 0px -12% 0px' },
    );
    for (const el of document.querySelectorAll('.reveal, .guide-steps > ol > li, .guide-done')) seen.observe(el);

    const bar = document.querySelector('.guide-progress');
    const steps = [...document.querySelectorAll('.guide-steps > ol > li')];
    if (bar && steps.length) {
      let lit = 0;
      const light = (n) => {
        if (n <= lit) return;
        lit = n;
        bar.style.setProperty('--done', String(n / steps.length));
        if (n === steps.length) document.querySelector('.guide-done')?.classList.add('landed');
      };
      const passed = new IntersectionObserver(
        (entries) => {
          for (const e of entries) if (e.isIntersecting) light(steps.indexOf(e.target) + 1);
        },
        { rootMargin: '-45% 0px -45% 0px' },
      );
      steps.forEach((s) => passed.observe(s));
      addEventListener('beforeprint', () => light(steps.length));
    }

    if (!reduce) for (const v of document.querySelectorAll('video[data-autoplay]')) v.play().catch(() => {});
  });
})();
