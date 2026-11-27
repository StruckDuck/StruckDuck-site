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

  // ---- Home page filters: one type and one format, combined ----
  var cards = Array.prototype.slice.call(document.querySelectorAll('.card[data-type]'));
  var pills = Array.prototype.slice.call(document.querySelectorAll('.pill[data-group]'));
  var emptyMsg = document.querySelector('[data-empty]');
  var state = { type: null, format: null };
  function pillFor(group, key) {
    return pills.filter(function (p) {
      return p.getAttribute('data-group') === group && p.getAttribute('data-key') === key;
    })[0];
  }
  function writeHash() {
    var parts = [];
    ['type', 'format'].forEach(function (g) {
      var p = state[g] && pillFor(g, state[g]);
      if (p) parts.push(p.getAttribute('data-hash'));
    });
    var h = parts.length ? parts.join('+') : 'all';
    if (history.replaceState) history.replaceState(null, '', '#' + h);
  }
  function applyFilter() {
    var shown = 0;
    cards.forEach(function (c) {
      var ok = (!state.type || c.getAttribute('data-type') === state.type) &&
               (!state.format || c.getAttribute('data-format') === state.format);
      c.hidden = !ok;
      if (ok) shown++;
    });
    pills.forEach(function (p) {
      var g = p.getAttribute('data-group');
      var on = g === 'all' ? !state.type && !state.format : state[g] === p.getAttribute('data-key');
      p.classList.toggle('active', on);
      p.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    if (emptyMsg) emptyMsg.hidden = shown !== 0;
  }
  function readHash() {
    state = { type: null, format: null };
    (location.hash || '').replace('#', '').split('+').forEach(function (t) {
      pills.forEach(function (p) {
        if (p.getAttribute('data-hash') === t) state[p.getAttribute('data-group')] = p.getAttribute('data-key');
      });
    });
  }
  if (cards.length) {
    pills.forEach(function (p) {
      p.addEventListener('click', function (e) {
        e.preventDefault();
        var g = p.getAttribute('data-group');
        if (g === 'all') {
          state = { type: null, format: null };
        } else {
          var k = p.getAttribute('data-key');
          state[g] = state[g] === k ? null : k;
        }
        applyFilter();
        writeHash();
      });
    });
    // Header and menu links pick a type on its own.
    document.querySelectorAll('a[data-filter]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        state = { type: a.getAttribute('data-filter'), format: null };
        applyFilter();
        writeHash();
        var shelf = document.getElementById('shelf');
        if (shelf) shelf.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
    readHash();
    applyFilter();
    if (state.type || state.format) {
      var shelf0 = document.getElementById('shelf');
      if (shelf0) shelf0.scrollIntoView();
    }
  }

  // ---- Hero photo rotator ----
  var rot = document.querySelector('[data-rotator]');
  if (rot) {
    var slides = [].slice.call(rot.querySelectorAll('.slide'));
    var dots = [].slice.call(rot.querySelectorAll('[data-dot]'));
    var idx = 0, timer = null, held = false;
    var secs = Math.min(60, Math.max(2, Number(rot.getAttribute('data-seconds')) || 5));
    var show = function (n) {
      idx = (n + slides.length) % slides.length;
      slides.forEach(function (sl, i) { sl.classList.toggle('on', i === idx); });
      dots.forEach(function (d, i) { d.classList.toggle('on', i === idx); });
    };
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var stop = function () { if (timer) { clearInterval(timer); timer = null; } };
    var start = function () {
      stop();
      if (slides.length < 2 || reduce || held || document.hidden) return;
      timer = setInterval(function () { show(idx + 1); }, secs * 1000);
    };
    dots.forEach(function (d) {
      d.addEventListener('click', function () { show(Number(d.getAttribute('data-dot'))); start(); });
    });
    rot.addEventListener('mouseenter', function () { held = true; stop(); });
    rot.addEventListener('mouseleave', function () { held = false; start(); });
    rot.addEventListener('focusin', function () { held = true; stop(); });
    rot.addEventListener('focusout', function () { held = false; start(); });
    document.addEventListener('visibilitychange', start);
    var x0 = null;
    rot.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    rot.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 40) { show(idx + (dx < 0 ? 1 : -1)); start(); }
    }, { passive: true });
    start();
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
