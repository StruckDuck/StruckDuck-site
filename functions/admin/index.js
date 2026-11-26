import { isAuthed } from '../_lib/auth.js';
import { adminPage } from '../_lib/html.js';

export async function onRequestGet({ request, env }) {
  if (!(await isAuthed(request, env))) {
    return new Response(null, { status: 302, headers: { Location: '/admin/login' } });
  }
  return adminPage('Admin', `<h1>You're signed in</h1>
<p>The listing editor goes here next.</p>
<form method="post" action="/admin/logout"><button class="btn-quiet" type="submit">Sign out</button></form>`);
}
