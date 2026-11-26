// Listing storage (Cloudflare D1) plus validation of what the admin form sends.
import fallback from '../../data/listings.json';

export const TYPES = ['Tool', 'Trick', 'Amusement'];
const RESERVED = new Set(['admin', 'api', 'img', 'new', 'login', 'logout', 'assets', 'robots', 'sitemap', 'favicon', 'style', 'app']);
const YT_ID = /^[\w-]{6,20}$/;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const parseJson = (s, dflt) => { try { const v = JSON.parse(s); return Array.isArray(v) ? v : dflt; } catch { return dflt; } };

export function rowToListing(r) {
  return {
    slug: r.slug, status: r.status, type: r.type, format: r.format, title: r.title,
    descriptor: r.descriptor, price: r.price, buttonText: r.button_text, buttonUrl: r.button_url,
    description: parseJson(r.description, []), media: parseJson(r.media, []),
  };
}

const ORDER = 'ORDER BY sort_order ASC, created_at ASC, slug ASC';

// Public pages: if the database can't be read, fall back to the listings bundled with the site.
export async function publishedListings(env) {
  try {
    const { results } = await env.DB.prepare(`SELECT * FROM listings WHERE status = 'published' ${ORDER}`).all();
    return results.map(rowToListing);
  } catch {
    return fallback.filter((l) => l.status === 'published');
  }
}

export async function getPublished(env, slug) {
  try {
    const r = await env.DB.prepare(`SELECT * FROM listings WHERE slug = ? AND status = 'published'`).bind(slug).first();
    return r ? rowToListing(r) : null;
  } catch {
    return fallback.find((l) => l.slug === slug && l.status === 'published') || null;
  }
}

export async function allListings(env) {
  const { results } = await env.DB.prepare(`SELECT * FROM listings ${ORDER}`).all();
  return results.map(rowToListing);
}

export async function getListing(env, slug) {
  const r = await env.DB.prepare('SELECT * FROM listings WHERE slug = ?').bind(slug).first();
  return r ? rowToListing(r) : null;
}

export async function setStatus(env, slug, status) {
  await env.DB.prepare(`UPDATE listings SET status = ?, updated_at = datetime('now') WHERE slug = ?`).bind(status, slug).run();
}

export async function deleteListing(env, slug) {
  await env.DB.prepare('DELETE FROM listings WHERE slug = ?').bind(slug).run();
}

export async function insertListing(env, l) {
  await env.DB.prepare(
    `INSERT INTO listings (slug, status, type, format, title, descriptor, price, button_text, button_url, description, media, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 10 FROM listings))`
  ).bind(l.slug, l.status, l.type, l.format, l.title, l.descriptor, l.price, l.buttonText, l.buttonUrl,
         JSON.stringify(l.description), JSON.stringify(l.media)).run();
}

export async function updateListing(env, l) {
  await env.DB.prepare(
    `UPDATE listings SET status = ?, type = ?, format = ?, title = ?, descriptor = ?, price = ?,
       button_text = ?, button_url = ?, description = ?, media = ?, updated_at = datetime('now') WHERE slug = ?`
  ).bind(l.status, l.type, l.format, l.title, l.descriptor, l.price, l.buttonText, l.buttonUrl,
         JSON.stringify(l.description), JSON.stringify(l.media), l.slug).run();
}

export function slugify(s) {
  return String(s || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

export function youtubeId(input) {
  const s = String(input || '').trim();
  if (!s) return '';
  if (YT_ID.test(s)) return s;
  try {
    const u = new URL(s);
    const host = u.hostname.replace(/^www\./, '');
    let id = '';
    if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
    else if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
      id = u.searchParams.get('v') || '';
      if (!id) { const m = u.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]+)/); if (m) id = m[1]; }
    }
    return YT_ID.test(id) ? id : '';
  } catch { return ''; }
}

const okUrl = (u) => /^https?:\/\/\S+$/i.test(u);
const okImage = (u) => /^\/img\/[\w./-]+$/.test(u) || /^https:\/\/\S+$/i.test(u);

// Turns the submitted form into a listing and a list of problems.
// intent: "save" (keep current status, new listings become drafts), "publish", "unpublish"
export function readForm(form, { existing, intent }) {
  const get = (k) => String(form.get(k) ?? '').trim();
  const errors = [];

  const title = get('title');
  const type = get('type');
  const formatChoice = get('formatChoice');
  const format = formatChoice === 'Other' ? get('formatOther') : formatChoice;
  const description = get('description').split(/\r?\n\s*\r?\n/).map((p) => p.replace(/\s*\r?\n\s*/g, ' ').trim()).filter(Boolean);

  let slug = existing ? existing.slug : get('slug').toLowerCase();
  if (!existing) {
    if (!slug) slug = slugify(title);
    if (!slug) errors.push('Add a title.');
    else if (!SLUG.test(slug) || slug.length > 60) errors.push('The page address can only use lowercase letters, numbers, and dashes.');
    else if (RESERVED.has(slug)) errors.push(`"${slug}" is reserved. Pick a different page address.`);
  }

  const media = [];
  for (const raw of form.getAll('keep')) {
    try {
      const m = JSON.parse(String(raw));
      if (m.kind === 'youtube' && YT_ID.test(m.id || '')) media.push({ kind: 'youtube', id: m.id, alt: String(m.alt || '') });
      else if (m.kind === 'image' && okImage(m.src || '')) media.push({ kind: 'image', src: m.src, alt: String(m.alt || '') });
    } catch { /* skip */ }
  }
  for (const line of get('addYoutube').split(/\r?\n/).map((x) => x.trim()).filter(Boolean)) {
    const id = youtubeId(line);
    if (id) media.push({ kind: 'youtube', id, alt: '' });
    else errors.push(`That isn't a YouTube link: ${line.slice(0, 60)}`);
  }

  const l = {
    slug, type, format, title,
    descriptor: get('descriptor'), price: get('price'),
    buttonText: get('buttonText'), buttonUrl: get('buttonUrl'),
    description, media,
    status: intent === 'publish' ? 'published' : intent === 'unpublish' ? 'draft' : (existing?.status || 'draft'),
  };

  if (!title) errors.push('Add a title.');
  if (l.buttonUrl && !okUrl(l.buttonUrl)) errors.push('The button link must start with https://');
  if (l.type && !TYPES.includes(l.type)) errors.push('Pick a type.');
  if (l.status === 'published') {
    if (!TYPES.includes(l.type)) errors.push('Pick a type before publishing.');
    if (!l.format) errors.push('Pick a format before publishing.' + (formatChoice === 'Other' ? ' Fill in the "Define the format" box.' : ''));
    if (!l.descriptor) errors.push('Add the one-sentence descriptor before publishing.');
    if (!l.price) errors.push('Add the price label before publishing.');
    if (!l.buttonText) errors.push('Add the button text before publishing.');
    if (!l.buttonUrl) errors.push('Add the button link before publishing.');
  }
  // Drafts may be incomplete, but the table needs a value in these.
  if (!TYPES.includes(l.type)) l.type = existing?.type || 'Tool';
  if (!l.format) l.format = existing?.format || 'App';
  return { listing: l, errors: [...new Set(errors)] };
}
