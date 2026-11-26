import { isAuthed } from '../_lib/auth.js';
import { shell } from '../_lib/html.js';
import { allListings } from '../_lib/db.js';
import { esc, tagText } from '../../src/render.mjs';

const MESSAGES = { deleted: 'Listing deleted.', published: 'Listing published.', unpublished: 'Listing unpublished.' };

function cover(l) {
  const m = (l.media || [])[0];
  if (!m) return '';
  const src = m.kind === 'youtube' ? `https://i.ytimg.com/vi/${m.id}/hqdefault.jpg` : m.src;
  return `<img src="${esc(src)}" alt="" loading="lazy">`;
}

function row(l) {
  const live = l.status === 'published';
  const view = live
    ? `<a class="soft" href="/${esc(l.slug)}" target="_blank" rel="noopener">View</a>`
    : `<a class="soft" href="/admin/preview/${esc(l.slug)}" target="_blank" rel="noopener">Preview</a>`;
  const toggle = `<form method="post" action="/admin/action"><input type="hidden" name="slug" value="${esc(l.slug)}"><input type="hidden" name="action" value="${live ? 'unpublish' : 'publish'}"><button class="linkbtn soft" type="submit">${live ? 'Unpublish' : 'Publish'}</button></form>`;
  const del = `<form method="post" action="/admin/action" data-confirm="Delete &quot;${esc(l.title)}&quot;? This can't be undone."><input type="hidden" name="slug" value="${esc(l.slug)}"><input type="hidden" name="action" value="delete"><button class="linkbtn danger" type="submit">Delete</button></form>`;
  return `<div class="row" data-row data-status="${live ? 'published' : 'draft'}" data-text="${esc((l.title + ' ' + l.type + ' ' + l.format + ' ' + l.slug).toLowerCase())}">
  <div class="thumb">${cover(l)}</div>
  <div class="who"><b>${esc(l.title)}</b><small>${esc(tagText(l))}</small></div>
  <span class="state"><span class="dot${live ? '' : ' draft'}"></span>${live ? 'Published' : 'Draft'}</span>
  <div class="acts">${view}${toggle}${del}<a class="edit" href="/admin/listing/${esc(l.slug)}">Edit</a></div>
</div>`;
}

export async function onRequestGet({ request, env }) {
  if (!(await isAuthed(request, env))) {
    return new Response(null, { status: 302, headers: { Location: '/admin/login' } });
  }
  const url = new URL(request.url);
  const msg = MESSAGES[url.searchParams.get('msg')] || '';
  let listings = [];
  let problem = '';
  try { listings = await allListings(env); } catch { problem = "The database isn't connected or the listings table is missing."; }
  const pub = listings.filter((l) => l.status === 'published').length;
  const body = `<div class="a-title"><h1>All listings</h1><a class="btn-orange" href="/admin/listing/new">Add listing</a></div>
${msg ? `<p class="banner">${esc(msg)}</p>` : ''}
${problem ? `<p class="problems">${esc(problem)}</p>` : ''}
<div class="tools">
  <div class="pills">
    <button type="button" class="pill on" data-filter="all">All ${listings.length}</button>
    <button type="button" class="pill" data-filter="published">Published ${pub}</button>
    <button type="button" class="pill" data-filter="draft">Drafts ${listings.length - pub}</button>
  </div>
  <input class="search" type="search" placeholder="Search listings" data-search aria-label="Search listings">
</div>
<div class="rows">
${listings.map(row).join('\n')}
<p class="empty" data-empty hidden>No listings match.</p>
${listings.length ? '' : '<p class="empty">No listings yet. Add your first one.</p>'}
</div>`;
  return shell('All listings', body, { active: 'list' });
}
