// Image uploads stored in R2. Files are checked by their actual bytes, never by name or claimed type.
export const MAX_BYTES = 10 * 1024 * 1024;

export function detectImage(buf) {
  const b = new Uint8Array(buf.slice(0, 12));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: 'jpg', type: 'image/jpeg' };
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { ext: 'png', type: 'image/png' };
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return { ext: 'gif', type: 'image/gif' };
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return { ext: 'webp', type: 'image/webp' };
  return null;
}

export const KEY = /^[a-f0-9]{32}\.(jpg|png|gif|webp)$/;
const SRC = /^\/img\/u\/([a-f0-9]{32}\.(?:jpg|png|gif|webp))$/;

export const newKey = (ext) => crypto.randomUUID().replace(/-/g, '') + '.' + ext;

// Which media items are files we stored (as opposed to links to other sites)
// Includes the uncropped original kept for re-cropping.
export const uploadedKeys = (media) => [...new Set(
  (media || []).flatMap((m) => (m.kind === 'image' ? [m.src, m.original] : []))
    .map((u) => (SRC.exec(u || '') || [])[1]).filter(Boolean))];

export async function deleteUploads(env, keys) {
  if (!env.IMAGES || !keys.length) return;
  try { await env.IMAGES.delete(keys.map((k) => 'u/' + k)); } catch { /* leftovers are harmless */ }
}
