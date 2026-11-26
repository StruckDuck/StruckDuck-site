import { getListing } from '../../_lib/db.js';
import { renderListing } from '../../../src/render.mjs';
import site from '../../../data/site.json';

// Shows a listing exactly as visitors would see it, including drafts. Admin only (see _middleware).
export async function onRequestGet({ params, env }) {
  const l = await getListing(env, String(params.slug || ''));
  if (!l) return new Response('Not found', { status: 404 });
  return new Response(renderListing(l, site), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
  });
}
