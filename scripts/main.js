// Slow Travel — progressive enhancement only.
// Nothing here is required for the page to be readable or navigable.

const REVEAL_THRESHOLD = 0.16;
const STUCK_OFFSET_PX = 8;

// Umami — бескуки́йная аналитика, поэтому баннер согласия не нужен.
// Вставьте website ID из панели Umami вместо заглушки: до этого момента
// скрипт не подключается и в консоль ничего не сыпется.
const ANALYTICS = {
  websiteId: 'PASTE-UMAMI-WEBSITE-ID',
  scriptSrc: 'https://cloud.umami.is/script.js',
  // Считаем только боевой домен, чтобы локальная разработка не портила статистику
  domains: 'citizen-of-makondo.github.io'
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

function initAnalytics() {
  if (!UUID_PATTERN.test(ANALYTICS.websiteId)) return;

  const script = document.createElement('script');
  script.src = ANALYTICS.scriptSrc;
  script.defer = true;
  script.dataset.websiteId = ANALYTICS.websiteId;
  script.dataset.domains = ANALYTICS.domains;
  document.head.append(script);
}

function initCurrentYear() {
  const slot = document.querySelector('[data-current-year]');
  if (slot) slot.textContent = String(new Date().getFullYear());
}

initReveal();
initMasthead();
initCurrentYear();
initAnalytics();
