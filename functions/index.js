import { renderHome } from '../src/render.mjs';
import site from '../data/site.json';
import { publishedListings } from './_lib/db.js';
import { getSetting, getHeroPhotos } from './_lib/settings.js';

export async function onRequestGet({ env }) {
  const [listings, intro, photos] = await Promise.all([publishedListings(env), getSetting(env, 'intro'), getHeroPhotos(env)]);
  return new Response(renderHome(listings, site, intro, photos), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
