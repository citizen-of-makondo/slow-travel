#!/usr/bin/env node
// Собирает блоки туров и журнала из data/*.json в index.html.
// Детерминированно: один и тот же JSON всегда даёт один и тот же HTML.
// Рутина правит только JSON — разметку генерирует этот скрипт.
//
//   node scripts/build.mjs          собрать
//   node scripts/build.mjs --check  проверить данные и что index.html уже собран

import { readFile, writeFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = join(ROOT, 'index.html');

const STATUSES = new Set(['open', 'few', 'none']);
const TG_POST = /^https:\/\/t\.me\/slowtour\/\d+$/;
const THREADS_POST = /^https:\/\/www\.threads\.com\/@_slow_travel\/post\/[A-Za-z0-9_-]+$/;
const SLUG = /^[a-z0-9-]+$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const MAX_TOURS = 12;
const MAX_ENTRIES = 6;
const REVEAL_STEP_MS = 80;
const JOURNAL_REVEAL_STEP_MS = 100;

const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
];

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const fail = (message) => {
  throw new Error(message);
};

async function exists(relativePath) {
  try {
    await access(join(ROOT, relativePath));
    return true;
  } catch {
    return false;
  }
}

function formatDate(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  return `${day} ${MONTHS[month - 1]}`;
}

async function validateTours(tours) {
  if (!Array.isArray(tours) || tours.length === 0) fail('tours.json: нужен непустой массив');
  if (tours.length > MAX_TOURS) fail(`tours.json: больше ${MAX_TOURS} туров — вероятно, ошибка разбора`);

  const slugs = new Set();
  for (const [i, tour] of tours.entries()) {
    const at = `tours.json[${i}]`;
    if (!SLUG.test(tour.slug ?? '')) fail(`${at}: slug должен быть kebab-case`);
    if (slugs.has(tour.slug)) fail(`${at}: slug "${tour.slug}" повторяется`);
    slugs.add(tour.slug);

    if (!tour.title?.trim()) fail(`${at}: пустой title`);
    if (!tour.dates?.trim()) fail(`${at}: пустой dates`);
    if (!tour.summary?.trim()) fail(`${at}: пустой summary`);
    if (tour.summary.length > 200) fail(`${at}: summary длиннее 200 символов`);
    if (!STATUSES.has(tour.status)) fail(`${at}: status должен быть open | few | none`);
    if (!tour.statusLabel?.trim()) fail(`${at}: пустой statusLabel`);
    if (!TG_POST.test(tour.post ?? '')) fail(`${at}: post должен быть https://t.me/slowtour/<id>`);

    if (tour.photo && !(await exists(tour.photo))) {
      fail(`${at}: файла ${tour.photo} нет в репозитории`);
    }
    if (tour.photo && !tour.photoAlt?.trim()) fail(`${at}: у фото нет photoAlt`);
  }
}

function validateJournal(entries) {
  if (!Array.isArray(entries) || entries.length === 0) fail('journal.json: нужен непустой массив');
  if (entries.length > MAX_ENTRIES) fail(`journal.json: больше ${MAX_ENTRIES} записей`);

  for (const [i, entry] of entries.entries()) {
    const at = `journal.json[${i}]`;
    if (!SLUG.test(entry.slug ?? '')) fail(`${at}: slug должен быть kebab-case`);
    if (!ISO_DATE.test(entry.date ?? '')) fail(`${at}: date должна быть YYYY-MM-DD`);
    if (Number.isNaN(Date.parse(entry.date))) fail(`${at}: несуществующая дата`);
    if (!entry.tag?.trim()) fail(`${at}: пустой tag`);
    if (!entry.title?.trim()) fail(`${at}: пустой title`);
    if (entry.title.length > 60) fail(`${at}: title длиннее 60 символов — не влезет в карточку`);
    if (!entry.text?.trim()) fail(`${at}: пустой text`);
    if (entry.text.length > 280) fail(`${at}: text длиннее 280 символов — карточки разъедутся`);
    if (!THREADS_POST.test(entry.post ?? '')) fail(`${at}: post должен вести на конкретный пост в Threads`);
  }
}

function renderTour(tour, index) {
  const delay = index === 0 ? '' : ` style="--reveal-delay: ${index * REVEAL_STEP_MS}ms"`;
  const media = tour.photo
    ? `<div class="tour__media">
                <img
                  src="${escapeHtml(tour.photo)}"
                  alt="${escapeHtml(tour.photoAlt)}"
                  width="480"
                  height="320"
                  loading="lazy"
                  decoding="async"
                />
              </div>`
    : `<div class="tour__media tour__media--empty" aria-hidden="true"></div>`;

  return `            <li class="tour reveal"${delay}>
              <span class="tour__index" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
              ${media}
              <h3 class="tour__title">
                <a
                  href="${escapeHtml(tour.post)}"
                  rel="noopener"
                  data-umami-event="tour-${escapeHtml(tour.slug)}"
                  >${escapeHtml(tour.title)}</a
                >
                <span class="tour__dates">${escapeHtml(tour.dates)}</span>
              </h3>
              <p class="tour__detail">${escapeHtml(tour.summary)}</p>
              <span class="tour__status" data-status="${tour.status}">${escapeHtml(tour.statusLabel)}</span>
            </li>`;
}

function renderEntry(entry, index) {
  const delay = index === 0 ? '' : ` style="--reveal-delay: ${index * JOURNAL_REVEAL_STEP_MS}ms"`;

  return `            <article class="journal__entry reveal"${delay}>
              <div class="journal__meta">
                <span class="journal__tag">${escapeHtml(entry.tag)}</span>
                <time datetime="${entry.date}">${formatDate(entry.date)}</time>
              </div>
              <h3 class="journal__title">${escapeHtml(entry.title)}</h3>
              <p class="journal__text">${escapeHtml(entry.text)}</p>
              <a
                class="journal__link"
                href="${escapeHtml(entry.post)}"
                rel="noopener"
                data-umami-event="journal-${escapeHtml(entry.slug)}"
              >
                Читать в Threads →
              </a>
            </article>`;
}

function replaceBlock(html, name, body) {
  const open = `<!-- build:${name} -->`;
  const close = `<!-- /build:${name} -->`;
  const start = html.indexOf(open);
  const end = html.indexOf(close);
  if (start === -1 || end === -1) fail(`index.html: не найдены маркеры ${open} … ${close}`);
  return html.slice(0, start + open.length) + '\n' + body + '\n' + html.slice(end);
}

const readJson = async (name) => JSON.parse(await readFile(join(ROOT, 'data', name), 'utf8'));

const tours = await readJson('tours.json');
const journal = await readJson('journal.json');

await validateTours(tours);
validateJournal(journal);

const current = await readFile(INDEX, 'utf8');
let next = replaceBlock(current, 'tours', tours.map(renderTour).join('\n\n'));
next = replaceBlock(next, 'journal', journal.map(renderEntry).join('\n\n'));
next = replaceBlock(next, 'tour-count', `              <div class="hero__stat"><dt>${tours.length}</dt><dd>ближайших маршрута</dd></div>`);

const isCheck = process.argv.includes('--check');

if (isCheck) {
  if (next !== current) fail('index.html не соответствует данным — запустите node scripts/build.mjs');
  console.log(`check ok: ${tours.length} туров, ${journal.length} записей журнала`);
} else if (next === current) {
  console.log('без изменений');
} else {
  await writeFile(INDEX, next);
  console.log(`собрано: ${tours.length} туров, ${journal.length} записей журнала`);
}
