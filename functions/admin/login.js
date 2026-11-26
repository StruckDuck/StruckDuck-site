import { isConfigured, passwordMatches, isAuthed, sessionCookie, isLockedOut, recordFail, clearFails } from '../_lib/auth.js';
import { adminPage } from '../_lib/html.js';

function form(message) {
  return `<h1>Admin</h1>
<p>Sign in to manage StruckDuck listings.</p>
${message ? `<p class="err">${message}</p>` : ''}
<form method="post" action="/admin/login" autocomplete="on">
<label for="pw">Password</label>
<input id="pw" name="password" type="password" autocomplete="current-password" required autofocus>
<button class="btn-go" type="submit">Sign in</button>
</form>`;
}

export async function onRequestGet({ request, env }) {
  if (!isConfigured(env)) {
    return adminPage('Admin', '<h1>Admin</h1><p class="err">Admin is not set up yet.</p>', 503);
  }
  if (await isAuthed(request, env)) {
    return new Response(null, { status: 302, headers: { Location: '/admin' } });
  }
  return adminPage('Sign in', form(''));
}

export async function onRequestPost({ request, env }) {
  if (!isConfigured(env)) {
    return adminPage('Admin', '<h1>Admin</h1><p class="err">Admin is not set up yet.</p>', 503);
  }
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (await isLockedOut(env, ip)) {
    return adminPage('Sign in', form('Too many tries. Wait 15 minutes and try again.'), 429);
  }
  let password = '';
  try { password = String((await request.formData()).get('password') || ''); } catch {}
  if (!(await passwordMatches(env, password))) {
    await recordFail(env, ip);
    return adminPage('Sign in', form('That password is not right.'), 401);
  }
  await clearFails(env, ip);
  return new Response(null, {
    status: 302,
    headers: { Location: '/admin', 'Set-Cookie': await sessionCookie(env), 'Cache-Control': 'no-store' },
  });
}
