import { isAuthed } from '../_lib/auth.js';

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  if (url.pathname === '/admin/login' || url.pathname === '/admin/login/') return next();
  if (!(await isAuthed(request, env))) {
    return new Response(null, { status: 302, headers: { Location: '/admin/login', 'Cache-Control': 'no-store' } });
  }
  const res = await next();
  const out = new Response(res.body, res);
  out.headers.set('Cache-Control', 'no-store');
  out.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return out;
}
