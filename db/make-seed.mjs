// Makes db/seed.sql from data/listings.json. Run: node db/make-seed.mjs
import { readFile, writeFile } from 'node:fs/promises';
const listings = JSON.parse(await readFile(new URL('../data/listings.json', import.meta.url), 'utf8'));
const q = (v) => `'${String(v ?? '').replace(/'/g, "''")}'`;
const rows = listings.map((l, i) =>
  `(${[l.slug, l.status, l.type, l.format, l.title, l.descriptor, l.price, l.buttonText, l.buttonUrl,
      JSON.stringify(l.description || []), JSON.stringify(l.media || [])].map(q).join(', ')}, ${(i + 1) * 10})`);
const sql = `INSERT OR IGNORE INTO listings (slug, status, type, format, title, descriptor, price, button_text, button_url, description, media, sort_order) VALUES\n${rows.join(',\n')};\n`;
await writeFile(new URL('./seed.sql', import.meta.url), sql);
console.log(`Wrote db/seed.sql with ${rows.length} listings`);
