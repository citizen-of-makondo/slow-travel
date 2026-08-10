// Slow Travel — progressive enhancement only.
// Nothing here is required for the page to be readable or navigable.

const REVEAL_THRESHOLD = 0.16;
const STUCK_OFFSET_PX = 8;

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Arms the .reveal styles. Without it the CSS keeps everything fully visible.
document.documentElement.classList.add('js');

function initReveal() {
  const targets = document.querySelectorAll('.reveal');
  if (!targets.length) return;

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    },
    { threshold: REVEAL_THRESHOLD, rootMargin: '0px 0px -8% 0px' }
  );

  targets.forEach((el) => observer.observe(el));
}

function initMasthead() {
  const masthead = document.getElementById('masthead');
  if (!masthead) return;

  const sentinel = document.createElement('div');
  sentinel.setAttribute('aria-hidden', 'true');
  sentinel.style.cssText = `position:absolute;top:${STUCK_OFFSET_PX}px;height:1px;width:1px;`;
  document.body.prepend(sentinel);

  if (!('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver(
    ([entry]) => masthead.classList.toggle('is-stuck', !entry.isIntersecting),
    { threshold: 0 }
  );

  observer.observe(sentinel);
}

function initCurrentYear() {
  const slot = document.querySelector('[data-current-year]');
  if (slot) slot.textContent = String(new Date().getFullYear());
}

initReveal();
initMasthead();
initCurrentYear();
