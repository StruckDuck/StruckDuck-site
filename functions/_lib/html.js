import { esc } from '../../src/render.mjs';

const HEAD = (title) => `<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${esc(title)} | StruckDuck</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bree+Serif&family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/admin.css">`;

function respond(html, status, extra) {
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', ...extra },
  });
}

// Plain centered page (login, setup messages)
export function adminPage(title, body, status = 200, extra = {}) {
  return respond(`<!doctype html><html lang="en"><head>${HEAD(title)}</head><body><main class="box">${body}</main></body></html>`, status, extra);
}

// Full admin page with the header
export function shell(title, body, { active = '', status = 200 } = {}) {
  const nav = `<nav class="a-nav"><a href="/admin"${active === 'list' ? ' class="on"' : ''}>All listings</a><a href="/admin/intro"${active === 'intro' ? ' class="on"' : ''}>Intro text</a><a href="/admin/hero"${active === 'hero' ? ' class="on"' : ''}>Hero photos</a>
<form method="post" action="/admin/logout"><button class="linkbtn" type="submit">Sign out</button></form></nav>`;
  return respond(`<!doctype html><html lang="en"><head>${HEAD(title)}</head><body>
<div class="admin">
<header class="a-head"><div class="a-brand"><a href="/"><img src="/img/wordmark.png" alt="StruckDuck"></a><span>ADMIN</span></div>${nav}</header>
${body}
</div>
<script src="/admin-ui.js" defer></script>
</body></html>`, status);
}
