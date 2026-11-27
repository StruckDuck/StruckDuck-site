// Small helpers for the admin pages. Everything works without this except these conveniences.
(function () {
  // List page: filter pills and search
  var rows = [].slice.call(document.querySelectorAll('[data-row]'));
  if (rows.length) {
    var pills = [].slice.call(document.querySelectorAll('[data-filter]'));
    var search = document.querySelector('[data-search]');
    var empty = document.querySelector('[data-empty]');
    var filter = 'all';
    var apply = function () {
      var q = (search && search.value || '').toLowerCase().trim();
      var shown = 0;
      rows.forEach(function (r) {
        var ok = (filter === 'all' || r.dataset.status === filter) && (!q || r.dataset.text.indexOf(q) > -1);
        r.hidden = !ok;
        if (ok) shown++;
      });
      if (empty) empty.hidden = shown > 0;
    };
    pills.forEach(function (p) {
      p.addEventListener('click', function () {
        filter = p.dataset.filter;
        pills.forEach(function (x) { x.classList.toggle('on', x === p); });
        apply();
      });
    });
    if (search) search.addEventListener('input', apply);
  }

  // Delete confirmation
  document.addEventListener('submit', function (e) {
    var msg = e.target.getAttribute('data-confirm');
    if (msg && !window.confirm(msg)) e.preventDefault();
  });

  // Form: button text follows the format, page address follows the title
  var form = document.querySelector('[data-listing-form]');
  if (form) {
    var btn = form.elements.buttonText;
    var defaults = { 'App': 'Open web app', '3D print': 'Get it on Cults3D' };
    var isDefault = function (v) { return !v || v === defaults['App'] || v === defaults['3D print']; };
    [].slice.call(form.querySelectorAll('input[name=formatChoice]')).forEach(function (r) {
      r.addEventListener('change', function () {
        if (defaults[r.value] && btn && isDefault(btn.value.trim())) btn.value = defaults[r.value];
        else if (r.value === 'Other' && btn && isDefault(btn.value.trim())) btn.value = '';
      });
    });
    var slug = form.elements.slug;
    var title = form.elements.title;
    if (slug && !slug.readOnly && title) {
      var touched = !!slug.value;
      slug.addEventListener('input', function () { touched = true; });
      title.addEventListener('input', function () {
        if (touched) return;
        slug.value = title.value.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
      });
    }
  }
  // Gallery: reorder, upload, crop
  var media = document.querySelector('[data-media]');
  if (media && form) {
    var emptyHint = document.querySelector('[data-empty-hint]');
    var status = document.querySelector('[data-upload-status]');
    var fileInput = document.querySelector('[data-file]');
    var addBtn = document.querySelector('[data-add-images]');
    var busy = 0;
    var setBusy = function (n) {
      busy += n;
      [].slice.call(form.querySelectorAll('button[type=submit]')).forEach(function (b) { b.disabled = busy > 0; });
    };

    media.addEventListener('click', function (e) {
      var b = e.target.closest('[data-move]');
      if (!b) return;
      var item = b.closest('.mi');
      var dir = Number(b.dataset.move);
      if (dir < 0 && item.previousElementSibling) media.insertBefore(item, item.previousElementSibling);
      if (dir > 0 && item.nextElementSibling) media.insertBefore(item.nextElementSibling, item);
    });

    // Shrink big photos in the browser first: faster upload, lighter pages for visitors.
    var prepare = function (file) {
      return new Promise(function (resolve) {
        if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return resolve(file);
        var url = URL.createObjectURL(file);
        var img = new Image();
        img.onload = function () {
          URL.revokeObjectURL(url);
          var scale = Math.min(1, 2000 / Math.max(img.naturalWidth, img.naturalHeight));
          if (scale === 1 && file.size < 1.5 * 1024 * 1024) return resolve(file);
          var c = document.createElement('canvas');
          c.width = Math.round(img.naturalWidth * scale);
          c.height = Math.round(img.naturalHeight * scale);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          c.toBlob(function (blob) {
            if (!blob || blob.size >= file.size) return resolve(file);
            resolve(new File([blob], 'image', { type: blob.type }));
          }, 'image/webp', 0.86);
        };
        img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
        img.src = url;
      });
    };

    var postFile = function (f) {
      var fd = new FormData();
      fd.append('file', f, f.name || 'image');
      return fetch('/admin/upload', { method: 'POST', body: fd, credentials: 'same-origin' }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok || !j.src) throw new Error(j.error || (r.status === 302 || r.redirected ? 'You were signed out. Sign in again.' : 'Upload failed.'));
          return j.src;
        });
      });
    };

    var addItem = function (src) {
      var d = document.createElement('div');
      d.className = 'mi';
      var img = document.createElement('img');
      img.src = src; img.alt = '';
      var cover = document.createElement('span');
      cover.className = 'cover-tag'; cover.textContent = 'COVER';
      var mv = document.createElement('span');
      mv.className = 'mv';
      mv.innerHTML = '<button type="button" data-move="-1" aria-label="Move earlier">←</button><button type="button" data-move="1" aria-label="Move later">→</button>';
      var bar = document.createElement('div');
      bar.className = 'mbar';
      var lab = document.createElement('label');
      var cb = document.createElement('input');
      cb.type = 'checkbox'; cb.name = 'keep'; cb.checked = true;
      cb.value = JSON.stringify({ kind: 'image', src: src, alt: '' });
      lab.appendChild(cb); lab.appendChild(document.createTextNode(' Keep'));
      bar.appendChild(lab);
      if (/\.(jpg|png|webp)$/.test(src)) {
        var cr = document.createElement('button');
        cr.type = 'button'; cr.className = 'crop-btn'; cr.setAttribute('data-crop', ''); cr.textContent = 'Crop';
        bar.appendChild(cr);
      }
      d.appendChild(img); d.appendChild(cover); d.appendChild(mv); d.appendChild(bar);
      media.appendChild(d);
      if (emptyHint) emptyHint.hidden = true;
    };

    var uploadOne = function (file) {
      return prepare(file).then(postFile).then(addItem);
    };

    if (addBtn && fileInput) {
      addBtn.addEventListener('click', function () { fileInput.click(); });
      fileInput.addEventListener('change', function () {
        var files = [].slice.call(fileInput.files);
        fileInput.value = '';
        if (!files.length) return;
        var done = 0, failed = [];
        status.textContent = 'Uploading 1 of ' + files.length + '...';
        setBusy(1);
        files.reduce(function (p, f) {
          return p.then(function () {
            return uploadOne(f).then(function () { done++; }, function (err) { failed.push(f.name + ': ' + err.message); })
              .then(function () { status.textContent = 'Uploading ' + Math.min(done + failed.length + 1, files.length) + ' of ' + files.length + '...'; });
          });
        }, Promise.resolve()).then(function () {
          setBusy(-1);
          status.textContent = (done ? done + ' added. ' : '') + (failed.length ? failed.join(' ') : '');
        });
      });
    }

    // ---- Crop ----
    var dlg = document.querySelector('[data-cropper]');
    if (dlg && typeof dlg.showModal === 'function') {
      var stage = dlg.querySelector('[data-cp-stage]');
      var cimg = dlg.querySelector('[data-cp-img]');
      var box = dlg.querySelector('[data-cp-box]');
      var info = dlg.querySelector('[data-cp-info]');
      var applyBtn = dlg.querySelector('[data-cp-apply]');
      var resetBtn = dlg.querySelector('[data-cp-reset]');
      var ratioBtns = [].slice.call(dlg.querySelectorAll('[data-ratio]'));
      var RATIOS = { free: null, wide: 16 / 9, card: 2.2 };
      var MIN = 40;
      var cur = null; // { item, cb, data, original }
      var W = 0, H = 0, natW = 0, natH = 0, rect = null, ratioKey = 'free', drag = null;
      var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

      var draw = function () {
        box.style.left = rect.x + 'px'; box.style.top = rect.y + 'px';
        box.style.width = rect.w + 'px'; box.style.height = rect.h + 'px';
        var k = natW / W;
        var ow = Math.round(rect.w * k), oh = Math.round(rect.h * k);
        var m = Math.max(ow, oh) / 2000;
        if (m > 1) { ow = Math.round(ow / m); oh = Math.round(oh / m); }
        info.textContent = 'Result: ' + ow + ' × ' + oh + ' px' + (RATIOS[ratioKey] ? '' : '. Drag the corners to resize, drag inside to move.');
      };

      var fitRatio = function () {
        var r = RATIOS[ratioKey];
        if (!r) return;
        var cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2, w = rect.w, h = rect.h;
        if (w / h > r) w = h * r; else h = w / r;
        if (w > W) { w = W; h = w / r; }
        if (h > H) { h = H; w = h * r; }
        rect = { x: clamp(cx - w / 2, 0, W - w), y: clamp(cy - h / 2, 0, H - h), w: w, h: h };
      };

      var setRatio = function (key) {
        ratioKey = key;
        ratioBtns.forEach(function (b) { b.classList.toggle('on', b.dataset.ratio === key); });
        fitRatio(); draw();
      };

      var open = function (item) {
        var cb = item.querySelector('input[name=keep]');
        var data;
        try { data = JSON.parse(cb.value); } catch (e) { return; }
        cur = { item: item, cb: cb, data: data, original: data.original || data.src };
        resetBtn.hidden = !data.original;
        applyBtn.disabled = true; info.textContent = 'Loading...';
        cimg.onload = function () {
          natW = cimg.naturalWidth; natH = cimg.naturalHeight;
          var maxW = Math.min(760, window.innerWidth - 80), maxH = Math.max(220, window.innerHeight * 0.55);
          var k = Math.min(maxW / natW, maxH / natH, 1);
          W = Math.round(natW * k); H = Math.round(natH * k);
          stage.style.width = W + 'px'; stage.style.height = H + 'px';
          var c = data.crop;
          ratioKey = c && RATIOS.hasOwnProperty(c.r) ? c.r : (item === media.firstElementChild && !media.hasAttribute('data-hero') ? 'card' : 'wide');
          ratioBtns.forEach(function (b) { b.classList.toggle('on', b.dataset.ratio === ratioKey); });
          if (c) rect = { x: c.x * W, y: c.y * H, w: c.w * W, h: c.h * H };
          else { rect = { x: W * 0.05, y: H * 0.05, w: W * 0.9, h: H * 0.9 }; fitRatio(); }
          applyBtn.disabled = false; draw();
        };
        cimg.onerror = function () { info.textContent = 'Could not load that image.'; };
        cimg.src = cur.original;
        if (!dlg.open) dlg.showModal();
      };

      media.addEventListener('click', function (e) {
        var b = e.target.closest('[data-crop]');
        if (b) open(b.closest('.mi'));
      });

      box.addEventListener('pointerdown', function (e) {
        var h = e.target.getAttribute('data-h');
        drag = { mode: h || 'move', sx: e.clientX, sy: e.clientY, r0: { x: rect.x, y: rect.y, w: rect.w, h: rect.h } };
        box.setPointerCapture(e.pointerId);
        e.preventDefault();
      });
      box.addEventListener('pointermove', function (e) {
        if (!drag) return;
        var dx = e.clientX - drag.sx, dy = e.clientY - drag.sy, r0 = drag.r0;
        if (drag.mode === 'move') {
          rect.x = clamp(r0.x + dx, 0, W - r0.w); rect.y = clamp(r0.y + dy, 0, H - r0.h);
        } else {
          var m = drag.mode, sx = m.indexOf('e') > -1 ? 1 : -1, sy = m.indexOf('s') > -1 ? 1 : -1;
          var ax = sx > 0 ? r0.x : r0.x + r0.w, ay = sy > 0 ? r0.y : r0.y + r0.h;
          var cx = (sx > 0 ? r0.x + r0.w : r0.x) + dx, cy = (sy > 0 ? r0.y + r0.h : r0.y) + dy;
          var maxX = sx > 0 ? W - ax : ax, maxY = sy > 0 ? H - ay : ay;
          var w, h, r = RATIOS[ratioKey];
          if (r) {
            w = Math.max(sx * (cx - ax), sy * (cy - ay) * r);
            w = clamp(w, Math.max(MIN, MIN * r), Math.min(maxX, maxY * r));
            h = w / r;
          } else {
            w = clamp(sx * (cx - ax), MIN, maxX); h = clamp(sy * (cy - ay), MIN, maxY);
          }
          rect = { x: sx > 0 ? ax : ax - w, y: sy > 0 ? ay : ay - h, w: w, h: h };
        }
        draw();
      });
      var endDrag = function () { drag = null; };
      box.addEventListener('pointerup', endDrag);
      box.addEventListener('pointercancel', endDrag);

      ratioBtns.forEach(function (b) { b.addEventListener('click', function () { setRatio(b.dataset.ratio); }); });
      dlg.querySelector('[data-cp-cancel]').addEventListener('click', function () { dlg.close(); });

      resetBtn.addEventListener('click', function () {
        if (!cur || !cur.data.original) return;
        var d = cur.data;
        d.src = d.original; delete d.original; delete d.crop;
        cur.cb.value = JSON.stringify(d);
        cur.item.querySelector('img').src = d.src;
        dlg.close();
      });

      applyBtn.addEventListener('click', function () {
        if (!cur) return;
        var k = natW / W;
        var sx = Math.round(rect.x * k), sy = Math.round(rect.y * k);
        var sw = Math.min(natW - sx, Math.round(rect.w * k)), sh = Math.min(natH - sy, Math.round(rect.h * k));
        var scale = Math.min(1, 2000 / Math.max(sw, sh));
        var c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(sw * scale)); c.height = Math.max(1, Math.round(sh * scale));
        c.getContext('2d').drawImage(cimg, sx, sy, sw, sh, 0, 0, c.width, c.height);
        applyBtn.disabled = true; info.textContent = 'Saving crop...';
        var target = cur;
        c.toBlob(function (blob) {
          if (!blob) { info.textContent = 'Could not crop that image.'; applyBtn.disabled = false; return; }
          postFile(new File([blob], 'crop', { type: blob.type })).then(function (src) {
            var d = target.data;
            d.original = target.original; d.src = src;
            var rd = function (n) { return Math.round(n * 10000) / 10000; };
            d.crop = { x: rd(rect.x / W), y: rd(rect.y / H), w: rd(rect.w / W), h: rd(rect.h / H), r: ratioKey };
            target.cb.value = JSON.stringify(d);
            target.item.querySelector('img').src = src;
            dlg.close();
          }).catch(function (err) { info.textContent = err.message; applyBtn.disabled = false; });
        }, 'image/webp', 0.92);
      });
    }
  }
})();
