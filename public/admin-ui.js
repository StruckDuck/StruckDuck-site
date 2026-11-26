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
  // Gallery: reorder and upload
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
      var lab = document.createElement('label');
      var cb = document.createElement('input');
      cb.type = 'checkbox'; cb.name = 'keep'; cb.checked = true;
      cb.value = JSON.stringify({ kind: 'image', src: src, alt: '' });
      lab.appendChild(cb); lab.appendChild(document.createTextNode(' Keep'));
      d.appendChild(img); d.appendChild(cover); d.appendChild(mv); d.appendChild(lab);
      media.appendChild(d);
      if (emptyHint) emptyHint.hidden = true;
    };

    var uploadOne = function (file) {
      return prepare(file).then(function (f) {
        var fd = new FormData();
        fd.append('file', f, f.name || 'image');
        return fetch('/admin/upload', { method: 'POST', body: fd, credentials: 'same-origin' });
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok || !j.src) throw new Error(j.error || (r.status === 302 || r.redirected ? 'You were signed out. Sign in again.' : 'Upload failed.'));
          addItem(j.src);
        });
      });
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
  }
})();
