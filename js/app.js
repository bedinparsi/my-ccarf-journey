/* SPA shell: hash router, navigation, theme. */
(function () {
  CCAR.views = CCAR.views || {};
  var cleanup = null;

  var ROUTES = [
    { re: /^#?\/?$/, view: 'dashboard', nav: 'dashboard' },
    { re: /^#\/report$/, view: 'report', nav: 'report' },
    { re: /^#\/study(?:\/(retake))?$/, view: 'study', nav: 'study' },
    { re: /^#\/lesson\/([\w-]+)$/, view: 'lesson', nav: 'study' },
    { re: /^#\/exams$/, view: 'exams', nav: 'exams' },
    { re: /^#\/attempt\/(\w+)$/, view: 'runner', nav: 'exams' },
    { re: /^#\/results\/(\w+)$/, view: 'results', nav: 'exams' },
    { re: /^#\/history$/, view: 'history', nav: 'history' },
    { re: /^#\/flashcards$/, view: 'flashcards', nav: 'flashcards' },
    { re: /^#\/settings$/, view: 'settings', nav: 'settings' }
  ];

  function route() {
    var hash = location.hash || '#/';
    var main = document.getElementById('main');
    if (typeof cleanup === 'function') { try { cleanup(); } catch (e) { console.error(e); } }
    cleanup = null;
    for (var i = 0; i < ROUTES.length; i++) {
      var m = hash.match(ROUTES[i].re);
      if (m) {
        setActive(ROUTES[i].nav);
        main.innerHTML = '';
        try { cleanup = CCAR.views[ROUTES[i].view](main, m.slice(1)); }
        catch (e) { console.error(e); main.innerHTML = '<div class="card"><h2>Something went wrong</h2><pre>' + CCAR.ui.esc(e.stack || e) + '</pre></div>'; }
        main.focus({ preventScroll: true });
        window.scrollTo(0, 0);
        document.querySelector('.side').classList.remove('open');
        return;
      }
    }
    location.hash = '#/';
  }

  function setActive(nav) {
    CCAR.ui.$all('.nav a').forEach(function (a) { a.classList.toggle('active', a.dataset.nav === nav); a.setAttribute('aria-current', a.dataset.nav === nav ? 'page' : 'false'); });
  }

  function applyTheme() {
    var st = CCAR.store.load();
    document.documentElement.setAttribute('data-theme', st.settings.theme || 'light');
  }

  function init() {
    applyTheme();
    var weakCount = CCAR.OBJECTIVES.filter(function (o) { return CCAR.isWeak(o.id); }).length;
    var b = document.getElementById('weak-badge'); if (b) b.textContent = weakCount;
    document.querySelector('.menu-btn').addEventListener('click', function () { document.querySelector('.side').classList.toggle('open'); });
    document.getElementById('theme-btn').addEventListener('click', function () {
      var st = CCAR.store.load();
      st.settings.theme = (st.settings.theme === 'dark') ? 'light' : 'dark';
      CCAR.store.save(true); applyTheme();
    });
    window.addEventListener('hashchange', route);
    route();
  }

  CCAR.app = { route: route, applyTheme: applyTheme };
  document.addEventListener('DOMContentLoaded', init);
})();
