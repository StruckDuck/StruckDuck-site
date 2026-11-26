import { detectImage, MAX_BYTES, newKey } from '../_lib/uploads.js';

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

// Admin only (see _middleware). Takes one image, stores it in R2, returns its public path.
export async function onRequestPost({ request, env }) {
  if (!env.IMAGES) return json({ error: 'Image storage is not connected.' }, 503);
  let file;
  try { file = (await request.formData()).get('file'); } catch { return json({ error: 'Could not read the upload.' }, 400); }
  if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function') return json({ error: 'No file received.' }, 400);
  if (file.size > MAX_BYTES) return json({ error: 'That image is over 10 MB.' }, 413);
  const buf = await file.arrayBuffer();
  const kind = detectImage(buf);
  if (!kind) return json({ error: 'Use a JPG, PNG, WebP, or GIF image.' }, 415);
  const key = newKey(kind.ext);
  await env.IMAGES.put('u/' + key, buf, { httpMetadata: { contentType: kind.type } });
  return json({ src: '/img/u/' + key });
}
