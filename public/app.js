(function () {
  'use strict';

  // ---- Phone menu ----
  var menu = document.getElementById('menu');
  function closeMenu() {
    if (!menu) return;
    menu.hidden = true;
    document.body.style.overflow = '';
  }
  document.querySelectorAll('[data-menu-open]').forEach(function (b) {
    b.addEventListener('click', function () {
      menu.hidden = false;
      document.body.style.overflow = 'hidden';
    });
  });
  document.querySelectorAll('[data-menu-close]').forEach(function (b) {
    b.addEventListener('click', closeMenu);
  });
  if (menu) {
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closeMenu);
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMenu();
  });

  // ---- Home page filters (Tools, Tricks, Amusements) ----
  var cards = Array.prototype.slice.call(document.querySelectorAll('.card[data-type]'));
  var hashToKey = { all: 'all', tools: 'tool', tricks: 'trick', amusements: 'amusement' };
  function applyFilter(key) {
    cards.forEach(function (c) {
      c.hidden = !(key === 'all' || c.getAttribute('data-type') === key);
    });
    document.querySelectorAll('.pill').forEach(function (p) {
      var on = p.getAttribute('data-filter') === key;
      p.classList.toggle('active', on);
      p.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  if (cards.length) {
    document.querySelectorAll('a[data-filter]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var key = a.getAttribute('data-filter');
        applyFilter(key);
        var hash = a.getAttribute('href').split('#')[1] || 'all';
        if (history.replaceState) history.replaceState(null, '', '#' + hash);
        var shelf = document.getElementById('shelf');
        if (shelf) shelf.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
    var initial = hashToKey[(location.hash || '').replace('#', '')];
    if (initial) {
      applyFilter(initial);
      if (initial !== 'all') {
        var shelf0 = document.getElementById('shelf');
        if (shelf0) shelf0.scrollIntoView();
      }
    }
  }

  // ---- Gallery (images and YouTube videos) ----
  var YT_ID = /^[\w-]{6,20}$/;
  function playVideo(viewer, id, label) {
    if (!YT_ID.test(id)) return;
    var f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.allowFullscreen = true;
    f.title = label || 'Video';
    viewer.textContent = '';
    viewer.appendChild(f);
  }
  function facade(viewer, id, label) {
    viewer.textContent = '';
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'yt';
    b.setAttribute('aria-label', 'Play video: ' + label);
    var img = document.createElement('img');
    img.alt = '';
    img.src = 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg';
    var p = document.createElement('span');
    p.className = 'play-big';
    p.setAttribute('aria-hidden', 'true');
    b.appendChild(img);
    b.appendChild(p);
    b.addEventListener('click', function () { playVideo(viewer, id, label); });
    viewer.appendChild(b);
  }
  document.querySelectorAll('[data-gallery]').forEach(function (g) {
    var viewer = g.querySelector('[data-viewer]');
    var thumbs = Array.prototype.slice.call(g.querySelectorAll('[data-thumb]'));
    var firstYt = viewer.querySelector('[data-yt]');
    if (firstYt) {
      var fid = firstYt.getAttribute('data-yt');
      firstYt.addEventListener('click', function () { playVideo(viewer, fid, 'Video'); });
    }
    function show(i) {
      var t = thumbs[i];
      if (!t) return;
      thumbs.forEach(function (x, n) {
        x.classList.toggle('current', n === i);
        x.setAttribute('aria-current', n === i ? 'true' : 'false');
      });
      var label = t.getAttribute('data-alt') || '';
      if (t.getAttribute('data-kind') === 'youtube') {
        facade(viewer, t.getAttribute('data-id'), label);
      } else {
        viewer.textContent = '';
        var img = document.createElement('img');
        img.src = t.getAttribute('data-src');
        img.alt = label;
        viewer.appendChild(img);
      }
    }
    thumbs.forEach(function (t, i) {
      t.addEventListener('click', function () { show(i); });
    });
    g.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      var cur = thumbs.findIndex(function (x) { return x.classList.contains('current'); });
      var next = e.key === 'ArrowRight' ? Math.min(cur + 1, thumbs.length - 1) : Math.max(cur - 1, 0);
      if (next !== cur) {
        show(next);
        thumbs[next].focus();
      }
    });
  });

  // ---- Email signup ----
  document.querySelectorAll('form[data-signup]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = form.querySelector('[data-msg]');
      var email = (form.elements.email.value || '').trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        msg.textContent = 'Enter a valid email address.';
        return;
      }
      msg.textContent = 'Sending...';
      fetch('/api/subscribe', { method: 'POST', body: new FormData(form) })
        .then(function (r) {
          if (!r.ok) throw new Error('not ok');
          form.textContent = '';
          var done = document.createElement('p');
          done.className = 'serif';
          done.style.fontSize = '24px';
          done.textContent = 'Check your email to confirm.';
          form.appendChild(done);
        })
        .catch(function () {
          msg.textContent = "Signup isn't connected yet.";
        });
    });
  });
})();
