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
})();
