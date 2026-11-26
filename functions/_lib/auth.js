// Password login for the admin area.
// Needs two secrets set in Cloudflare: ADMIN_PASSWORD and SESSION_SECRET.

const enc = new TextEncoder();
const COOKIE = 'sd_admin';
const SESSION_DAYS = 14;
const MAX_FAILS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function b64u(buf) {
  let s = '';
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64u(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

// Admin stays closed unless both secrets exist and are strong enough.
export function isConfigured(env) {
  return typeof env.ADMIN_PASSWORD === 'string' && env.ADMIN_PASSWORD.length >= 12 &&
         typeof env.SESSION_SECRET === 'string' && env.SESSION_SECRET.length >= 24;
}

export async function passwordMatches(env, input) {
  const a = await hmac(env.SESSION_SECRET, String(input));
  const b = await hmac(env.SESSION_SECRET, env.ADMIN_PASSWORD);
  return safeEqual(a, b);
}

function readCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > -1 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return '';
}

export async function isAuthed(request, env) {
  if (!isConfigured(env)) return false;
  const value = readCookie(request, COOKIE);
  const dot = value.indexOf('.');
  if (dot < 1) return false;
  const exp = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  if (!/^\d{10,15}$/.test(exp) || Number(exp) < Date.now()) return false;
  return safeEqual(sig, await hmac(env.SESSION_SECRET, exp));
}

export async function sessionCookie(env) {
  const exp = String(Date.now() + SESSION_DAYS * 86400000);
  const value = exp + '.' + await hmac(env.SESSION_SECRET, exp);
  return `${COOKIE}=${value}; Path=/; Max-Age=${SESSION_DAYS * 86400}; HttpOnly; Secure; SameSite=Strict`;
}

export function clearCookie() {
  return `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

// Failed-login tracking by IP, stored in the database.
async function ensureTable(env) {
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS login_fails (ip TEXT NOT NULL, at INTEGER NOT NULL)').run();
}

export async function isLockedOut(env, ip) {
  await ensureTable(env);
  const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM login_fails WHERE ip = ? AND at > ?')
    .bind(ip, Date.now() - WINDOW_MS).first();
  return (row?.n || 0) >= MAX_FAILS;
}

export async function recordFail(env, ip) {
  await ensureTable(env);
  await env.DB.prepare('INSERT INTO login_fails (ip, at) VALUES (?, ?)').bind(ip, Date.now()).run();
  await env.DB.prepare('DELETE FROM login_fails WHERE at < ?').bind(Date.now() - 86400000).run();
}

export async function clearFails(env, ip) {
  await ensureTable(env);
  await env.DB.prepare('DELETE FROM login_fails WHERE ip = ?').bind(ip).run();
}
