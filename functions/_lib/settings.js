// Small key/value store for site text that is edited in the admin (D1).
// The table is created on first use, so nothing needs to be run by hand.
const ensure = (env) => env.DB.prepare('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)').run();

// Public pages must never fail because of this, so a read problem just means "no text".
export async function getSetting(env, key) {
  try {
    const r = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first();
    return r ? String(r.value) : '';
  } catch {
    return '';
  }
}

export async function setSetting(env, key, value) {
  await ensure(env);
  await env.DB.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .bind(key, value).run();
}

// Hero photos: a JSON list of { kind:'image', src, link?, original?, crop? }, our own uploads only.
// link is the page address (slug) of the listing the photo opens.
export const HERO_MAX = 10;
const OWN = /^\/img\/u\/[a-f0-9]{32}\.(jpg|png|webp|gif)$/;

export function cleanHeroPhotos(list) {
  const out = [];
  for (const m of Array.isArray(list) ? list : []) {
    if (!m || m.kind !== 'image' || !OWN.test(m.src || '')) continue;
    const item = { kind: 'image', src: m.src, alt: '' };
    if (typeof m.link === 'string' && /^[a-z0-9-]{1,60}$/.test(m.link)) item.link = m.link;
    if (m.original && OWN.test(m.original) && m.original !== m.src) {
      item.original = m.original;
      const c = m.crop;
      if (c && [c.x, c.y, c.w, c.h].every((n) => typeof n === 'number' && n >= 0 && n <= 1) && c.w > 0.01 && c.h > 0.01) {
        item.crop = { x: c.x, y: c.y, w: c.w, h: c.h, r: ['free', 'wide', 'card'].includes(c.r) ? c.r : 'wide' };
      }
    }
    out.push(item);
  }
  return out;
}

export async function getHeroPhotos(env) {
  try { return cleanHeroPhotos(JSON.parse(await getSetting(env, 'hero_photos') || '[]')); } catch { return []; }
}

// Seconds each hero photo stays up.
export const clampSeconds = (n) => Math.min(60, Math.max(2, Math.round(Number(n) || 5)));
export async function getHeroSeconds(env) {
  return clampSeconds(await getSetting(env, 'hero_seconds') || 5);
}
