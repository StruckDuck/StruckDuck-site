import { shell } from '../_lib/html.js';
import { getSetting, setSetting } from '../_lib/settings.js';
import { esc } from '../../src/render.mjs';

export const INTRO_MAX = 1500;
const clean = (s) => String(s || '').replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

function page(text, { notice = '', error = '' } = {}) {
  const body = `<form method="post" action="/admin/intro">
<div class="a-title">
  <div><a class="back" href="/admin">← All listings</a><h1>Intro text</h1></div>
  <div style="display:flex;gap:12px;flex-wrap:wrap">
    <a class="btn-line" href="/" target="_blank" rel="noopener">View site</a>
    <button class="btn-orange" type="submit">Save</button>
  </div>
</div>
${notice ? `<p class="banner">${esc(notice)}</p>` : ''}
${error ? `<p class="problems">${esc(error)}</p>` : ''}
<div class="cols"><div class="main">
  <section class="sec"><h2>Intro paragraph</h2>
   <div class="f"><label for="intro">Shown on the home page, between the top section and the listings</label>
   <textarea id="intro" name="intro" rows="8" maxlength="${INTRO_MAX}" placeholder="Write a short intro to StruckDuck.">${esc(text)}</textarea>
   <span class="hint">Leave a blank line between paragraphs. Leave it empty to show nothing.</span></div>
  </section>
</div></div>
</form>`;
  return shell('Intro text', body, { active: 'intro' });
}

export async function onRequestGet({ request, env }) {
  const notice = new URL(request.url).searchParams.get('saved') ? 'Saved.' : '';
  return page(await getSetting(env, 'intro'), { notice });
}

export async function onRequestPost({ request, env }) {
  const form = await request.formData();
  const text = clean(form.get('intro'));
  if (text.length > INTRO_MAX) return page(text, { error: `That's ${text.length} characters. The limit is ${INTRO_MAX}.` });
  try {
    await setSetting(env, 'intro', text);
  } catch {
    return page(text, { error: "Couldn't save. The database isn't connected." });
  }
  return new Response(null, { status: 303, headers: { Location: '/admin/intro?saved=1' } });
}
