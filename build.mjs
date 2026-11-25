// Builds the static site into ./dist
// Usage: node build.mjs [--fixture]
//   --fixture adds a sample listing with a gallery and a video (preview only).
import { readFile, writeFile, mkdir, rm, cp } from 'node:fs/promises';
import { renderHome, renderListing, renderNotFound } from './src/render.mjs';

const useFixture = process.argv.includes('--fixture');
const readJson = async (p) => JSON.parse(await readFile(new URL(p, import.meta.url), 'utf8'));

const site = await readJson('./data/site.json');
let listings = await readJson('./data/listings.json');
if (useFixture) listings = listings.concat(await readJson('./test/fixture.json'));

// Validate
const problems = [];
const seen = new Set();
const TYPES = ['Tool', 'Trick', 'Amusement'];
for (const l of listings) {
  if (!/^[a-z0-9-]+$/.test(l.slug || '')) problems.push(`Bad slug: "${l.slug}"`);
  if (seen.has(l.slug)) problems.push(`Duplicate slug: "${l.slug}"`);
  seen.add(l.slug);
  if (!TYPES.includes(l.type)) problems.push(`${l.slug}: type must be one of ${TYPES.join(', ')}`);
  for (const k of ['title', 'format', 'descriptor', 'price']) if (!l[k]) problems.push(`${l.slug}: missing ${k}`);
}
if (problems.length) {
  console.error('Build stopped:\n - ' + problems.join('\n - '));
  process.exit(1);
}

const published = listings.filter((l) => l.status === 'published');
const textOf = (l) => [l.title, l.descriptor, l.price, l.buttonText, ...(l.description || [])].join(' ');
const placeholders = published.filter((l) => /\[[^\]]+\]/.test(textOf(l)));

await rm(new URL('./dist', import.meta.url), { recursive: true, force: true });
await mkdir(new URL('./dist', import.meta.url), { recursive: true });
await cp(new URL('./public', import.meta.url), new URL('./dist', import.meta.url), { recursive: true });
if (useFixture) {
  await cp(new URL('./test/img', import.meta.url), new URL('./dist/img/sample', import.meta.url), { recursive: true });
}

await writeFile(new URL('./dist/index.html', import.meta.url), renderHome(published, site));
for (const l of published) {
  await mkdir(new URL(`./dist/${l.slug}`, import.meta.url), { recursive: true });
  await writeFile(new URL(`./dist/${l.slug}/index.html`, import.meta.url), renderListing(l, site));
}
await writeFile(new URL('./dist/404.html', import.meta.url), renderNotFound());

console.log(`Built ${published.length} listing page(s) + home + 404 into dist/`);
if (!site.cultsUrl) console.log('Note: data/site.json has no cultsUrl yet, so Cults3D links point to "#".');
if (placeholders.length) console.log(`Note: ${placeholders.length} listing(s) still contain [bracketed] placeholder text.`);
