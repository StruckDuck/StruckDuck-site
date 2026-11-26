import { clearCookie } from '../_lib/auth.js';

export async function onRequestPost() {
  return new Response(null, {
    status: 302,
    headers: { Location: '/admin/login', 'Set-Cookie': clearCookie(), 'Cache-Control': 'no-store' },
  });
}
