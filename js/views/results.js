/* Results report (score-report style) and per-question review. */
(function () {
  var ui = CCAR.ui, esc = ui.esc, E = CCAR.engine, C = CCAR.charts;
  var LETTERS = 'ABCDEF';

  CCAR.views.results = function (el, params) {
    var st = CCAR.store.load();
    var a = st.attempts[params[0]];
    if (!a) { el.innerHTML = '<p>Attempt not found.</p>'; return; }
    if (a.status !== 'submitted') { location.hash = '#/attempt/' + a.id; return; }
    var r = a.result || E.score(a);
    var ix = E.qIndex();
    var filter = 'wrong';

    var domRows = CCAR.DOMAINS.filter(function (d) { return r.byDomain[d.id]; }).map(function (d) {
      var x = r.byDomain[d.id];
      return { label: d.id + ' ' + d.name, values: [{ v: CCAR.prevDomainPct(d.id), name: 'Sept 22 (approx.)', color: '#c2453a' }, { v: ui.pct(x.c, x.n), name: 'This attempt', color: d.color }] };
    });
    var scenRows = Object.keys(r.byScen).map(function (s) { var x = r.byScen[s]; return { label: s + ' ' + CCAR.SCENARIOS[s].short, values: [{ v: ui.pct(x.c, x.n) }] }; });

    function header() {
      return '<div class="hero"><div><h1>' + esc(a.title) + ': ' + (r.pass ? 'PASS' : 'FAIL') + '</h1>' +
        '<p>' + r.correct + ' of ' + r.total + ' correct (' + ui.pct(r.correct, r.total) + '%) · time used ' + ui.fmtTime(a.elapsedSec) + (a.timed ? ' of ' + ui.fmtTime(a.durationSec) : '') + ' · ' + ui.fmtDate(a.submittedAt) + '</p>' +
        '<p class="small" style="margin-top:8px">Scaled score uses a linear 100–1000 approximation, so 72% raw ≈ 748 here. The real exam equates forms, so aim for 80% or higher to have a margin.</p>' +
        '<div class="row" style="margin-top:12px"><button class="btn primary" id="retry-missed"' + (r.correct === r.total ? ' disabled' : '') + '>Retry the ' + (r.total - r.correct) + ' missed</button><a class="btn" href="#/exams">Exams</a><a class="btn" href="#/report">Score report analysis</a></div></div>' +
        C.gauge(r.scaled, { caption: 'scaled (pass 720)' }) + '</div>';
    }

    function objTable() {
      var ids = Object.keys(r.byObj).sort(function (x, y) { return ui.pct(r.byObj[x].c, r.byObj[x].n) - ui.pct(r.byObj[y].c, r.byObj[y].n); });
      return '<table class="tbl obj-tbl"><thead><tr><th>Objective</th><th>This attempt</th><th>Sept 22</th><th></th></tr></thead><tbody>' + ids.map(function (id) {
        var o = CCAR.objectiveById(id), x = r.byObj[id], p = ui.pct(x.c, x.n), l = CCAR.lessonForObj(id);
        return '<tr><td><b>' + id + '</b> ' + esc(o.t) + '</td><td class="n"><span class="cell ' + ui.scoreClass(p) + '">' + p + '%</span> <span class="small muted">' + x.c + '/' + x.n + '</span></td>' +
          '<td class="n">' + (o.prev === null ? '<span class="cell na">n/a</span>' : '<span class="cell ' + ui.scoreClass(o.prev) + '">' + o.prev + '%</span>') + '</td>' +
          '<td>' + (l ? '<a class="btn sm ghost" href="#/lesson/' + l.id + '">Study</a>' : '') + '</td></tr>';
      }).join('') + '</tbody></table>';
    }

    function review() {
      var items = a.qids.map(function (id, i) { return { q: ix[id], i: i, ok: E.isCorrect(ix[id], a.answers[id]), ch: a.answers[id] || [] }; });
      var shown = items.filter(function (it) { return filter === 'all' || (filter === 'wrong' && !it.ok) || (filter === 'flag' && a.flags[it.q.id]); });
      return '<div class="row"><h2 style="margin:0">Question review</h2><span class="spacer"></span>' +
        ['wrong', 'flag', 'all'].map(function (f) { return '<button class="btn sm ' + (filter === f ? 'primary' : '') + '" data-filter="' + f + '">' + { wrong: 'Incorrect (' + items.filter(function (x) { return !x.ok; }).length + ')', flag: 'Flagged', all: 'All' }[f] + '</button>'; }).join('') + '</div>' +
        (shown.length ? '' : '<p class="muted">Nothing to show for this filter.</p>') +
        shown.map(function (it) {
          var q = it.q, order = a.optOrder[q.id], o = CCAR.objectiveById(q.obj);
          return '<div class="card" style="margin-top:12px"><div class="row small"><b>Q' + (it.i + 1) + '</b><span class="pill">' + q.scenario + ' · ' + esc(CCAR.SCENARIOS[q.scenario].short) + '</span><span class="pill">' + q.domain + '</span>' +
            '<span class="pill ' + (CCAR.isWeak(q.obj) ? 'weak' : '') + '">' + q.obj + '</span>' + (a.flags[q.id] ? '<span class="pill">🚩</span>' : '') +
            '<span class="spacer"></span><b class="' + (it.ok ? 'good-t' : 'bad-t') + '">' + (it.ok ? '✅ Correct' : (it.ch.length ? '✖ Incorrect' : '— Unanswered')) + '</b></div>' +
            '<div class="stem">' + q.stem + '</div>' + (q.type === 'multi' ? '<p class="small warn-t"><b>Select ' + q.select + '</b></p>' : '') +
            '<ul class="opts">' + order.map(function (orig, pos) {
              var sel = it.ch.indexOf(orig) >= 0, right = q.answer.indexOf(orig) >= 0;
              return '<li><div class="opt' + (right ? ' correct' : sel ? ' wrong' : '') + '" style="cursor:default"><span class="letter">' + LETTERS[pos] + '.</span><span>' + q.options[orig] +
                (sel ? ' <span class="pill">your answer</span>' : '') + '<div class="why">' + (right ? '✅ ' : '✖ ') + q.rationales[orig] + '</div></span></div></li>';
            }).join('') + '</ul>' +
            '<div class="explain"><b>Why:</b> ' + q.explanation + '<p class="small"><b>Trap:</b> ' + esc(q.trap || '') + ' · <b>Objective:</b> ' + esc(o ? o.t : q.obj) + '</p></div></div>';
        }).join('');
    }

    function render() {
      el.innerHTML = header() +
        '<div class="grid g2" style="margin-top:16px"><div class="card"><h2 style="margin-top:0">By domain</h2><div class="legend"><span><i style="background:#c2453a"></i>Sept 22 (approx.)</span><span><i style="background:var(--accent)"></i>This attempt</span></div>' + C.hbars(domRows, { labelW: 250 }) + '</div>' +
        '<div class="card"><h2 style="margin-top:0">By scenario</h2>' + C.hbars(scenRows, { labelW: 190 }) + '</div></div>' +
        '<div class="card" style="margin-top:16px"><h2 style="margin-top:0">By objective (weakest first)</h2>' + objTable() + '</div>' +
        '<div style="margin-top:18px">' + review() + '</div>';
      ui.$all('[data-filter]', el).forEach(function (b) { b.addEventListener('click', function () { filter = b.dataset.filter; render(); }); });
      var rm = ui.$('#retry-missed', el);
      rm && rm.addEventListener('click', function () {
        var missed = a.qids.filter(function (id) { return !E.isCorrect(ix[id], a.answers[id]); });
        location.hash = '#/attempt/' + E.createAttempt({ kind: 'drill', qids: missed, title: 'Retry missed: ' + a.title, timed: false, feedback: 'instant' }).id;
      });
    }
    render();
  };
})();
