import { renderListing } from '../src/render.mjs';
import site from '../data/site.json';
import { getPublished } from './_lib/db.js';

// One path segment. If it isn't a published listing, fall through to the static files (or the 404 page).
export async function onRequestGet({ params, env, next }) {
  const slug = String(params.slug || '').toLowerCase();
  if (!/^[a-z0-9-]+$/.test(slug)) return next();
  const l = await getPublished(env, slug);
  if (!l) return next();
  return new Response(renderListing(l, site), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
