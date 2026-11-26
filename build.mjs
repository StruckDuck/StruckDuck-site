// Builds the static part of the site into ./dist (styles, scripts, images, the 404 page).
// Home and listing pages are rendered on request by the Functions in ./functions, from the database.
import { rm, mkdir, cp, writeFile } from 'node:fs/promises';
import { renderNotFound } from './src/render.mjs';

const out = new URL('./dist', import.meta.url);
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(new URL('./public', import.meta.url), out, { recursive: true });
await writeFile(new URL('./dist/404.html', import.meta.url), renderNotFound());
console.log('Built static files + 404 into dist/');
