import { KEY } from '../../_lib/uploads.js';

// Public: serves an uploaded image from R2.
export async function onRequestGet({ params, env, request }) {
  const key = String(params.key || '');
  if (!env.IMAGES || !KEY.test(key)) return new Response('Not found', { status: 404 });
  const obj = await env.IMAGES.get('u/' + key);
  if (!obj) return new Response('Not found', { status: 404 });
  const headers = new Headers({
    'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
    ETag: obj.httpEtag,
  });
  if (request.headers.get('If-None-Match') === obj.httpEtag) return new Response(null, { status: 304, headers });
  return new Response(obj.body, { headers });
}
