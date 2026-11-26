import { setStatus, deleteListing, getListing, readForm } from '../_lib/db.js';

// Publish, unpublish, or delete from the list page.
export async function onRequestPost({ request, env }) {
  const form = await request.formData();
  const slug = String(form.get('slug') || '');
  const action = String(form.get('action') || '');
  const back = (msg) => new Response(null, { status: 303, headers: { Location: `/admin?msg=${msg}` } });
  const l = await getListing(env, slug);
  if (!l) return back('deleted');
  if (action === 'delete') { await deleteListing(env, slug); return back('deleted'); }
  if (action === 'unpublish') { await setStatus(env, slug, 'draft'); return back('unpublished'); }
  if (action === 'publish') {
    // Same completeness check as the form's Publish button.
    const f = new FormData();
    f.set('title', l.title); f.set('type', l.type);
    const known = l.format === 'App' || l.format === '3D print';
    f.set('formatChoice', known ? l.format : 'Other'); f.set('formatOther', known ? '' : l.format);
    f.set('descriptor', l.descriptor); f.set('price', l.price);
    f.set('buttonText', l.buttonText); f.set('buttonUrl', l.buttonUrl);
    const { errors } = readForm(f, { existing: l, intent: 'publish' });
    if (errors.length) {
      return new Response(null, { status: 303, headers: { Location: `/admin/listing/${slug}?incomplete=1` } });
    }
    await setStatus(env, slug, 'published');
    return back('published');
  }
  return back('deleted');
}
