export function adminPage(title, body, status = 200, extraHeaders = {}) {
  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${title} | StruckDuck</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bree+Serif&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css">
<style>
.box{max-width:420px;margin:0 auto;padding:96px 24px}
.box h1{font-family:'Bree Serif',Georgia,serif;font-weight:400;font-size:34px;margin-bottom:8px}
.box p{color:var(--soft);margin-bottom:20px}
.box label{display:block;font-weight:600;margin-bottom:6px}
.box input[type=password]{width:100%;padding:12px 14px;border-radius:8px;border:1px solid var(--line);background:rgba(255,255,255,.06);color:#fff;font:inherit;margin-bottom:16px}
.box .btn-go{background:var(--orange);color:var(--ink);border:0;border-radius:8px;padding:12px 20px;font-weight:700;cursor:pointer}
.box .btn-quiet{background:none;border:1px solid var(--line);border-radius:8px;padding:10px 16px;cursor:pointer}
.box .err{color:#FFB38A;font-weight:600}
</style>
</head><body><main class="box">${body}</main></body></html>`;
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      ...extraHeaders,
    },
  });
}
