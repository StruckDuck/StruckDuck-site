// Pure page renderers. They take plain data and return HTML strings, so the same
// code can run at build time now and inside Cloudflare Pages Functions later.

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const YT_ID = /^[\w-]{6,20}$/;
const isYoutube = (m) => m && m.kind === 'youtube' && YT_ID.test(m.id || '');
const ytThumb = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
const thumbSrc = (m) => (isYoutube(m) ? ytThumb(m.id) : m.src);
const validMedia = (l) => (l.media || []).filter((m) => (m.kind === 'image' && /^(\/|https:\/\/)/.test(m.src || '')) || isYoutube(m));
// Links only go to http(s), same-site paths, or in-page anchors.
const safeUrl = (u) => (/^(https?:\/\/|\/|#)/i.test(String(u || '')) ? String(u) : '#');

export const isPrint = (l) => /print/i.test(l.format || '');
export const tagText = (l) => `${l.type} · ${l.format}`.toUpperCase();
const filterKey = (l) => String(l.type || '').toLowerCase();
const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const formatKey = (l) => slug(l.format);
const plural = (s) => (/s$/i.test(s) ? s : s + 's');

// One pill per format in use: App and 3D print first, anything custom after.
function formatPills(listings) {
  const seen = new Map();
  for (const l of listings) {
    const f = String(l.format || '').trim();
    if (f && !seen.has(slug(f))) seen.set(slug(f), f);
  }
  const rank = (k) => (k === 'app' ? 0 : k === '3d-print' ? 1 : 2);
  return [...seen.entries()]
    .sort((a, b) => rank(a[0]) - rank(b[0]))
    .map(([key, f]) => ({ key, label: plural(f), hash: slug(plural(f)) }));
}

const chevron =
  '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F28A30" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"></path></svg>';

const FILTERS = [
  { hash: 'tools', label: 'Tools', key: 'tool' },
  { hash: 'tricks', label: 'Tricks', key: 'trick' },
  { hash: 'amusements', label: 'Amusements', key: 'amusement' },
];

export function layout({ title, description, body }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta name="theme-color" content="#00272E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bree+Serif&family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css">
</head>
<body>
${body}
<script src="/app.js" defer></script>
</body>
</html>
`;
}

function header() {
  return `<header class="site-header">
  <a href="/" class="brand" aria-label="StruckDuck home"><img class="brand-foot" src="/img/foot-logo.png" alt="" width="36" height="56"><img src="/img/wordmark.png" alt="StruckDuck" width="243" height="36"></a>
  <nav class="site-nav" aria-label="Main">
    ${FILTERS.map((f) => `<a href="/#${f.hash}" data-filter="${f.key}">${f.label}</a>`).join('\n    ')}
    <a href="#signup" class="btn btn-primary btn-small">Get new tools</a>
  </nav>
  <button class="menu-open" type="button" aria-label="Open menu" data-menu-open>
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"></path></svg>
  </button>
</header>`;
}

function menu() {
  return `<div class="menu" id="menu" hidden>
  <div class="menu-top">
    <a href="/" class="brand" aria-label="StruckDuck home"><img class="brand-foot" src="/img/foot-logo.png" alt="" width="36" height="56"><img src="/img/wordmark.png" alt="StruckDuck" width="243" height="36"></a>
    <button class="menu-close" type="button" aria-label="Close menu" data-menu-close>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"></path></svg>
    </button>
  </div>
  <nav class="menu-links" aria-label="Menu">
    ${FILTERS.map((f) => `<a href="/#${f.hash}" data-filter="${f.key}"><span>${f.label}</span>${chevron}</a>`).join('\n    ')}
  </nav>
  <div class="menu-bottom">
    <p>Get a note when something new is released.</p>
    <a href="#signup" class="btn btn-primary">Get new tools</a>
  </div>
</div>`;
}

function signupForm() {
  return `<form class="signup-form" data-signup novalidate>
        <div class="signup-row">
          <input type="email" name="email" placeholder="Your email address" autocomplete="email" aria-label="Your email address" required>
          <button type="submit" class="btn btn-primary">Sign up</button>
        </div>
        <p class="signup-note" data-msg>We'll email you to confirm. Unsubscribe anytime.</p>
      </form>`;
}

function signup(variant) {
  if (variant === 'compact') {
    return `<footer class="signup signup-compact" id="signup">
  <div class="wrap signup-inner">
    <p class="serif">Get a note when something new is released.</p>
    ${signupForm()}
  </div>
</footer>`;
  }
  return `<footer class="signup signup-big" id="signup">
  <div class="wrap signup-inner">
    <img src="/img/foot.png" alt="" class="signup-foot" width="97" height="150">
    <div class="signup-copy">
      <h2 class="serif">Get a note when something new is released.</h2>
      <p>New tools, tricks, and amusements for magicians.</p>
    </div>
    ${signupForm()}
  </div>
</footer>`;
}

function cardCover(l) {
  const first = validMedia(l)[0];
  const img = first ? `<img src="${esc(thumbSrc(first))}" alt="" loading="lazy">` : '';
  return `<div class="card-img">${img}<span class="chip">${esc(tagText(l))}</span></div>`;
}

function card(l) {
  return `<a class="card" href="/${esc(l.slug)}" data-type="${esc(filterKey(l))}" data-format="${esc(formatKey(l))}">
      ${cardCover(l)}
      <h2>${esc(l.title)}</h2>
      <p>${esc(l.descriptor)}</p>
      <div class="price">${esc(l.price)}</div>
    </a>`;
}

function introHtml(text) {
  const paras = String(text || '').split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean);
  if (!paras.length) return '';
  return `<section class="wrap intro" aria-label="About StruckDuck">
  ${paras.map((t) => `<p>${esc(t).replace(/\n/g, '<br>')}</p>`).join('\n  ')}
</section>`;
}

function heroPhotosHtml(photos) {
  const slides = photos.map((p, i) => `<img class="slide${i === 0 ? ' on' : ''}" src="${esc(p.src)}" alt="" width="1600" height="900"${i === 0 ? ' fetchpriority="high"' : ' loading="lazy"'}>`).join('\n      ');
  const dots = photos.length > 1
    ? `<div class="dots">${photos.map((_, i) => `<button type="button" data-dot="${i}" class="${i === 0 ? 'on' : ''}" aria-label="Show photo ${i + 1}"></button>`).join('')}</div>`
    : '';
  return `<section class="hero hero-photos" id="top">
  ${header()}
  <h1 class="sr-only">Tools, tricks, and amusements for magicians.</h1>
  <div class="stage-wrap">
    <div class="stage" data-rotator>
      ${slides}
      ${dots}
    </div>
  </div>
</section>`;
}

export function renderHome(listings, site, intro = '', heroPhotos = []) {
  const cults = safeUrl(site.cultsUrl);
  const formats = formatPills(listings);
  const body = `${menu()}
${heroPhotos.length ? heroPhotosHtml(heroPhotos) : `<section class="hero" id="top">
  ${header()}
  <div class="hero-inner">
    <div class="hero-text">
      <h1 class="serif">Tools, tricks,<br>and amusements<br>for magicians.</h1>
    </div>
    <img class="hero-art" src="/img/hero.webp" alt="A hand holding a wooden impossible triangle" width="317" height="475">
  </div>
  <a class="scroll-cue" href="#shelf">Scroll<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"></path></svg></a>
</section>`}
${introHtml(intro)}
<main class="wrap shelf" id="shelf">
  <div class="filters scroll-x" role="group" aria-label="Filter projects">
    <a href="/#all" class="pill active" data-group="all" aria-pressed="true">All</a>
    ${FILTERS.map((f) => `<a href="/#${f.hash}" class="pill" data-group="type" data-key="${f.key}" data-hash="${f.hash}" aria-pressed="false">${f.label}</a>`).join('\n    ')}
    ${formats.length ? '<span class="pill-sep" aria-hidden="true"></span>' : ''}
    ${formats.map((f) => `<a href="/#${esc(f.hash)}" class="pill" data-group="format" data-key="${esc(f.key)}" data-hash="${esc(f.hash)}" aria-pressed="false">${esc(f.label)}</a>`).join('\n    ')}
  </div>
  <div class="grid">
    ${listings.map(card).join('\n    ')}
  </div>
  <p class="empty" data-empty hidden>Nothing here yet.</p>
  <p class="cults-link"><a href="${esc(cults)}" rel="noopener">See everything on Cults3D</a></p>
</main>
${signup('big')}`;
  return layout({
    title: 'StruckDuck: tools, tricks, and amusements for magicians',
    description: "Personal projects I'm sharing at little to no cost.",
    body,
  });
}

function galleryHtml(l) {
  const media = validMedia(l);
  if (!media.length) return `<section class="gallery"><div class="viewer viewer-empty"></div></section>`;
  const first = media[0];
  const viewerInner = isYoutube(first)
    ? ytFacade(first.id, first.alt || l.title)
    : `<img src="${esc(first.src)}" alt="${esc(first.alt || l.title)}">`;
  const thumbs =
    media.length > 1
      ? `<div class="thumbs scroll-x">
      ${media
        .map((m, i) => {
          const label = m.alt || (isYoutube(m) ? 'Video' : `Image ${i + 1}`);
          return `<button type="button" class="thumb${i === 0 ? ' current' : ''}" data-thumb data-kind="${esc(m.kind)}" ${
            isYoutube(m) ? `data-id="${esc(m.id)}"` : `data-src="${esc(m.src)}"`
          } data-alt="${esc(label)}" aria-label="${esc(label)}" aria-current="${i === 0}"><img src="${esc(thumbSrc(m))}" alt="" loading="lazy">${
            isYoutube(m) ? '<span class="play-badge" aria-hidden="true"></span>' : ''
          }</button>`;
        })
        .join('\n      ')}
    </div>`
      : '';
  return `<section class="gallery" data-gallery>
    <div class="viewer" data-viewer>${viewerInner}</div>
    ${thumbs}
  </section>`;
}

function ytFacade(id, label) {
  return `<button type="button" class="yt" data-yt="${esc(id)}" aria-label="Play video: ${esc(label)}"><img src="${ytThumb(id)}" alt=""><span class="play-big" aria-hidden="true"></span></button>`;
}

export function renderListing(l, site) {
  const cults = safeUrl(site.cultsUrl);
  const buttonUrl = safeUrl(l.buttonUrl);
  const external = /^https?:/i.test(buttonUrl);
  const about = (l.description || []).length
    ? `<section class="about">
    <h2 class="serif">About</h2>
    ${(l.description || []).map((p) => `<p>${esc(p)}</p>`).join('\n    ')}
  </section>`
    : '';
  const body = `${menu()}
${header()}
<main class="wrap listing-page">
  <a class="back" href="/">← All projects</a>
  <div class="listing">
    <div class="area-gallery">${galleryHtml(l)}</div>
    <aside class="area-aside">
      <span class="chip chip-static">${esc(tagText(l))}</span>
      <h1 class="serif">${esc(l.title)}</h1>
      <p class="descriptor">${esc(l.descriptor)}</p>
      <div class="price">${esc(l.price)}</div>
      <a class="btn btn-primary" href="${esc(buttonUrl)}"${external ? ' target="_blank" rel="noopener"' : ''}>${esc(l.buttonText || 'Open')}</a>
      <a class="btn btn-outline" href="#signup">Get new tools by email</a>
    </aside>
    <div class="area-about">${about}</div>
  </div>
  ${isPrint(l) ? `<p class="cults-all"><a class="btn btn-outline-orange" href="${esc(cults)}" rel="noopener">See all 3D prints on Cults3D</a></p>` : ''}
</main>
${signup('compact')}`;
  return layout({
    title: `${l.title} | StruckDuck`,
    description: l.descriptor,
    body,
  });
}

export function renderNotFound() {
  const body = `${menu()}
${header()}
<main class="wrap listing-page">
  <h1 class="serif" style="font-size:40px">That page isn't here.</h1>
  <p class="descriptor" style="margin-top:12px"><a href="/" style="text-decoration:underline">Back to all projects</a></p>
</main>
${signup('compact')}`;
  return layout({ title: 'Not found | StruckDuck', description: 'Page not found.', body });
}
