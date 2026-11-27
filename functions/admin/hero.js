import { shell } from '../_lib/html.js';
import { getHeroPhotos, setSetting, cleanHeroPhotos, HERO_MAX } from '../_lib/settings.js';
import { uploadedKeys, deleteUploads } from '../_lib/uploads.js';
import { mediaItem, CROP_DIALOG } from '../_lib/gallery.js';
import { esc } from '../../src/render.mjs';

function page(photos, { notice = '', error = '', status = 200 } = {}) {
  const body = `<form method="post" action="/admin/hero" data-listing-form>
<div class="a-title">
  <div><a class="back" href="/admin">← All listings</a><h1>Hero photos</h1></div>
  <div style="display:flex;gap:12px;flex-wrap:wrap">
    <a class="btn-line" href="/" target="_blank" rel="noopener">View site</a>
    <button class="btn-orange" type="submit">Save</button>
  </div>
</div>
${notice ? `<p class="banner">${esc(notice)}</p>` : ''}
${error ? `<p class="problems">${esc(error)}</p>` : ''}
<div class="cols"><div class="main">
  <section class="sec"><h2>Photos at the top of the home page</h2>
   <div class="media hero" data-media data-hero>${photos.map(mediaItem).join('')}</div>
   <span class="hint" data-empty-hint${photos.length ? ' hidden' : ''}>No photos yet. Until you add some, the home page shows the triangle and headline.</span>
   <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap"><button type="button" class="btn-line" data-add-images>+ Photos</button><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden data-file><span class="hint" data-upload-status role="status"></span></div>
   <span class="hint">They fade from one to the next in this order, up to ${HERO_MAX}. Use the arrows to reorder, Crop to trim, and uncheck Keep to remove one. They show in a 16:9 frame, so 16:9 photos (1920 × 1080) fit with no cropping. Changes are saved when you press Save.</span>
  </section>
</div></div>
</form>
${CROP_DIALOG}`;
  return shell('Hero photos', body, { active: 'hero', status });
}

export async function onRequestGet({ request, env }) {
  const notice = new URL(request.url).searchParams.get('saved') ? 'Saved.' : '';
  return page(await getHeroPhotos(env), { notice });
}

export async function onRequestPost({ request, env }) {
  const form = await request.formData();
  const raw = [];
  for (const v of form.getAll('keep')) { try { raw.push(JSON.parse(String(v))); } catch { /* skip */ } }
  const photos = cleanHeroPhotos(raw);
  if (photos.length > HERO_MAX) return page(photos, { error: `Up to ${HERO_MAX} photos. Uncheck Keep on ${photos.length - HERO_MAX} of them.`, status: 422 });
  const before = await getHeroPhotos(env);
  try {
    await setSetting(env, 'hero_photos', JSON.stringify(photos));
  } catch {
    return page(photos, { error: "Couldn't save. The database isn't connected.", status: 500 });
  }
  const kept = new Set(uploadedKeys(photos));
  await deleteUploads(env, uploadedKeys(before).filter((k) => !kept.has(k)));
  return new Response(null, { status: 303, headers: { Location: '/admin/hero?saved=1' } });
}
