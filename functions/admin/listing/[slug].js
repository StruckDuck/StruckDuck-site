import { shell } from '../../_lib/html.js';
import { TYPES, getListing, insertListing, updateListing, readForm } from '../../_lib/db.js';
import { esc } from '../../../src/render.mjs';
import { uploadedKeys, deleteUploads } from '../../_lib/uploads.js';
import { mediaItem, CROP_DIALOG } from '../../_lib/gallery.js';

const radio = (name, value, checked, id) =>
  `<label class="pillopt"><input type="radio" name="${name}" value="${esc(value)}"${id ? ` id="${id}"` : ''}${checked ? ' checked' : ''}><span>${esc(value)}</span></label>`;



function formPage(l, { isNew, errors = [], notice = '', status = 200 }) {
  const known = l.format === 'App' || l.format === '3D print';
  const formatChoice = !l.format ? '' : known ? l.format : 'Other';
  const live = l.status === 'published';
  const action = isNew ? '/admin/listing/new' : `/admin/listing/${esc(l.slug)}`;
  const primary = live ? ['save', 'Save changes'] : ['publish', 'Publish'];
  const secondary = live ? ['unpublish', 'Unpublish'] : ['save', 'Save draft'];
  const body = `<form method="post" action="${action}" data-listing-form>
<div class="a-title">
  <div><a class="back" href="/admin">← All listings</a><h1>${isNew ? 'Add listing' : 'Edit listing'}</h1></div>
  <div style="display:flex;gap:12px;flex-wrap:wrap">
    <button class="btn-line" type="submit" name="intent" value="${secondary[0]}">${secondary[1]}</button>
    <button class="btn-orange" type="submit" name="intent" value="${primary[0]}">${primary[1]}</button>
  </div>
</div>
${notice ? `<p class="banner">${esc(notice)}</p>` : ''}
${errors.length ? `<div class="problems"><b>Not saved yet</b><ul>${errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></div>` : ''}
<div class="cols">
 <div class="main">
  <section class="sec"><h2>Basics</h2>
   <div class="f"><label for="title">Title</label><input id="title" name="title" type="text" value="${esc(l.title)}" placeholder="[Listing title]" required></div>
   <div class="f"><span class="lab">Type</span><div class="opts">${TYPES.map((t) => radio('type', t, l.type === t)).join('')}</div></div>
   <div class="f fmt"><span class="lab">Format</span>
    <div class="opts">${radio('formatChoice', 'App', formatChoice === 'App')}${radio('formatChoice', '3D print', formatChoice === '3D print')}${radio('formatChoice', 'Other', formatChoice === 'Other', 'fmt-other')}</div>
    <div class="f fmt-other" style="margin-top:6px"><input name="formatOther" type="text" value="${esc(formatChoice === 'Other' ? l.format : '')}" placeholder="[Define the format]" aria-label="Define the format"></div>
   </div>
   <div class="f"><label for="price">Price label</label><input id="price" name="price" type="text" value="${esc(l.price)}" placeholder="[FREE / $5 / FREE BETA]"></div>
  </section>
  <section class="sec"><h2>Main button</h2>
   <div class="f"><label for="buttonText">Button text</label><input id="buttonText" name="buttonText" type="text" value="${esc(l.buttonText)}" placeholder="[Button text]"></div>
   <div class="f"><label for="buttonUrl">Link</label><input id="buttonUrl" name="buttonUrl" type="url" value="${esc(l.buttonUrl)}" placeholder="https://"></div>
  </section>
  <section class="sec"><h2>Text</h2>
   <div class="f"><label for="descriptor">One-sentence descriptor</label><input id="descriptor" name="descriptor" type="text" value="${esc(l.descriptor)}" placeholder="[One plain sentence about what it is.]"></div>
   <div class="f"><label for="description">Description</label><textarea id="description" name="description" rows="9" placeholder="[Longer description. What it is, how it works, and how you use it.]">${esc((l.description || []).join('\n\n'))}</textarea><span class="hint">Leave a blank line between paragraphs.</span></div>
  </section>
  <section class="sec"><h2>Gallery</h2>
   <div class="media" data-media>${(l.media || []).map(mediaItem).join('')}</div>
   <span class="hint" data-empty-hint${(l.media || []).length ? ' hidden' : ''}>No images or videos yet.</span>
   <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap"><button type="button" class="btn-line" data-add-images>+ Images</button><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden data-file><span class="hint" data-upload-status role="status"></span></div>
   <span class="hint">The first item is the cover. Use the arrows to reorder, Crop to trim a photo, and uncheck Keep to remove one. Changes are saved when you press Save or Publish.</span>
   <div class="f"><label for="addYoutube">Add YouTube videos</label><textarea id="addYoutube" name="addYoutube" rows="2" placeholder="Paste a YouTube link (one per line)"></textarea></div>
  </section>
 </div>
 <aside class="side">
  <section class="sec"><h2>Publishing</h2>
   <div class="f"><span class="lab">Status</span><span class="status-line"><span class="dot${live ? '' : ' draft'}"></span>${live ? 'Published' : 'Draft'}</span></div>
   <div class="f"><label for="slug">Page address</label><input id="slug" name="slug" type="text" value="${esc(l.slug)}"${isNew ? ' placeholder="made from the title"' : ' readonly'} autocapitalize="off" spellcheck="false"><span class="hint">${isNew ? 'Lowercase letters, numbers, dashes. Can\'t be changed later.' : 'This can\'t be changed after the listing exists.'}</span></div>
   ${isNew ? '' : `<a class="btn-line" style="text-align:center" href="${live ? `/${esc(l.slug)}` : `/admin/preview/${esc(l.slug)}`}" target="_blank" rel="noopener">${live ? 'View live page' : 'Preview page'}</a>`}
  </section>
 </aside>
</div>
</form>
${CROP_DIALOG}`;
  return shell(isNew ? 'Add listing' : 'Edit listing', body, { status });
}

const blank = () => ({ slug: '', status: 'draft', type: '', format: '', title: '', descriptor: '', price: '', buttonText: 'Open web app', buttonUrl: '', description: [], media: [] });

export async function onRequestGet({ params, request, env }) {
  const slug = String(params.slug || '');
  if (slug === 'new') return formPage(blank(), { isNew: true });
  const l = await getListing(env, slug);
  if (!l) return new Response(null, { status: 302, headers: { Location: '/admin' } });
  const q = new URL(request.url).searchParams;
  const notice = q.get('saved') ? 'Saved.' : '';
  const errors = q.get('incomplete') ? ['Fill in everything required before publishing, then press Publish.'] : [];
  return formPage(l, { isNew: false, notice, errors });
}

export async function onRequestPost({ params, request, env }) {
  const slug = String(params.slug || '');
  const isNew = slug === 'new';
  const existing = isNew ? null : await getListing(env, slug);
  if (!isNew && !existing) return new Response(null, { status: 302, headers: { Location: '/admin' } });
  const form = await request.formData();
  const intent = String(form.get('intent') || 'save');
  const { listing, errors } = readForm(form, { existing, intent });
  if (errors.length) {
    // Keep what was typed; don't change the saved status.
    listing.status = existing ? existing.status : 'draft';
    return formPage(listing, { isNew, errors, status: 422 });
  }
  if (isNew) {
    try { await insertListing(env, listing); }
    catch { return formPage({ ...listing, status: 'draft' }, { isNew, errors: ['That page address is already used. Pick a different one.'], status: 422 }); }
  } else {
    await updateListing(env, listing);
    const kept = new Set(uploadedKeys(listing.media));
    await deleteUploads(env, uploadedKeys(existing.media).filter((k) => !kept.has(k)));
  }
  return new Response(null, { status: 303, headers: { Location: `/admin/listing/${listing.slug}?saved=1` } });
}
