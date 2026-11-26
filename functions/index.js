import { renderHome } from '../src/render.mjs';
import site from '../data/site.json';
import { publishedListings } from './_lib/db.js';

export async function onRequestGet({ env }) {
  const listings = await publishedListings(env);
  return new Response(renderHome(listings, site), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
