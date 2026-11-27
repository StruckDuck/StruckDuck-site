import { esc } from '../../src/render.mjs';

// Gallery pieces shared by the listing form and the hero photos page.
// Only our own JPG, PNG and WebP uploads can be cropped (not GIFs, videos, or other sites' images).
export const croppable = (m) => m.kind === 'image' && /^\/img\/u\/[a-f0-9]{32}\.(jpg|png|webp)$/.test(m.original || m.src || '');

export function mediaItem(m) {
  const src = m.kind === 'youtube' ? `https://i.ytimg.com/vi/${m.id}/hqdefault.jpg` : m.src;
  return `<div class="mi"><img src="${esc(src)}" alt=""><span class="cover-tag">COVER</span>${m.kind === 'youtube' ? '<span class="yt">VIDEO</span>' : ''}<span class="mv"><button type="button" data-move="-1" aria-label="Move earlier">←</button><button type="button" data-move="1" aria-label="Move later">→</button></span><div class="mbar"><label><input type="checkbox" name="keep" value="${esc(JSON.stringify(m))}" checked> Keep</label>${croppable(m) ? '<button type="button" class="crop-btn" data-crop>Crop</button>' : ''}</div></div>`;
}

export const CROP_DIALOG = `<dialog class="cropper" data-cropper aria-label="Crop image">
  <div class="cp-head"><b>Crop image</b>
    <div class="cp-ratios" role="group" aria-label="Shape">
      <button type="button" data-ratio="free">Free</button>
      <button type="button" data-ratio="wide">16:9</button>
      <button type="button" data-ratio="card">Card</button>
    </div>
  </div>
  <div class="cp-stage" data-cp-stage><img data-cp-img alt=""><div class="cp-box" data-cp-box>
    <i class="cp-h" data-h="nw"></i><i class="cp-h" data-h="ne"></i><i class="cp-h" data-h="sw"></i><i class="cp-h" data-h="se"></i>
  </div></div>
  <p class="hint" data-cp-info></p>
  <div class="cp-foot"><button type="button" class="btn-quiet" data-cp-reset>Reset to original</button><span style="flex:1"></span><button type="button" class="btn-quiet" data-cp-cancel>Cancel</button><button type="button" class="btn-go" data-cp-apply>Apply</button></div>
</dialog>`;
