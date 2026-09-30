/* Study guide: Architect Handbook (complete coverage) + Retake focus lessons, and the lesson reader. */
(function () {
  var ui = CCAR.ui, esc = ui.esc;

  function domainOf(id) { return CCAR.DOMAINS.find(function (d) { return d.id === id; }); }

  function objPills(objs) {
    return (objs || []).map(function (id) {
      var o = CCAR.objectiveById(id); if (!o) return '';
      var cls = o.prev === null ? '' : CCAR.isWeak(id) ? 'weak' : 'good';
      return '<span class="pill ' + cls + '" title="' + esc(o.t) + '">' + id + (o.prev === null ? '' : ' · ' + o.prev + '%') + '</span>';
    }).join(' ');
  }
  function tsPills(ts) {
    return (ts || []).map(function (id) {
      var t = CCAR.TASK_STATEMENTS.find(function (x) { return x.id === id; });
      return '<span class="pill" title="' + esc(t ? t.t : '') + '">TS ' + esc(id) + '</span>';
    }).join(' ');
  }
  function sequenceFor(l) { return CCAR.isHandbook(l) ? CCAR.handbookLessons() : CCAR.retakeLessons(); }

  function chapterCard(l, st, num) {
    return '<div class="card"><div class="row"><h3>' + (num ? '<span class="hb-num">' + esc(num) + '</span>' : '') +
      '<a href="#/lesson/' + l.id + '">' + esc(l.title) + '</a></h3><span class="spacer"></span>' +
      (st.lessonsDone[l.id] ? '<span class="pill good">✓ done</span>' : '') + '</div>' +
      '<div class="small muted">' + esc(l.summary) + '</div>' +
      '<div>' + tsPills(l.ts) + ' ' + objPills(l.objs) + '</div>' +
      '<div class="small muted">≈ ' + l.minutes + ' min</div></div>';
  }

  CCAR.views.study = function (el, params) {
    var st = CCAR.store.load();
    var tab = (params && params[0]) === 'retake' ? 'retake' : 'handbook';
    var hb = CCAR.handbookLessons(), rt = CCAR.retakeLessons();
    var hbDone = hb.filter(function (l) { return st.lessonsDone[l.id]; }).length;
    var rtDone = rt.filter(function (l) { return st.lessonsDone[l.id]; }).length;
    var hbMin = hb.reduce(function (s, l) { return s + (l.minutes || 0); }, 0);

    var head = '<h1>Study guide</h1>' +
      '<div class="track-tabs" role="tablist">' +
      '<a role="tab" aria-selected="' + (tab === 'handbook') + '" class="btn ' + (tab === 'handbook' ? 'primary' : '') + '" href="#/study">📚 Architect Handbook · complete (' + hbDone + '/' + hb.length + ')</a>' +
      '<a role="tab" aria-selected="' + (tab === 'retake') + '" class="btn ' + (tab === 'retake' ? 'primary' : '') + '" href="#/study/retake">🎯 Retake focus lessons (' + rtDone + '/' + rt.length + ')</a></div>';

    if (tab === 'retake') {
      var groups = CCAR.DOMAINS.concat([{ id: 'ALL', name: 'Exam strategy', color: '#888' }]);
      el.innerHTML = head + '<p>Short, targeted lessons built from your Sept 22 score report. Red pills mark objectives where you scored under 70%. The Architect Handbook covers the same ground in full depth.</p>' +
        groups.map(function (d) {
          var ls = rt.filter(function (l) { return l.domain === d.id; });
          if (!ls.length) return '';
          return '<h2><span class="dom" style="background:' + d.color + '"></span>' + esc(d.name) + (d.weight ? ' <span class="small muted">(' + d.weight + '% of exam)</span>' : '') + '</h2>' +
            '<div class="grid g2 lesson-list">' + ls.map(function (l) { return chapterCard(l, st); }).join('') + '</div>';
        }).join('');
      return;
    }

    var n = 0;
    el.innerHTML = head +
      '<p>The complete reference: every task statement in the exam guide, the platform fundamentals underneath them, scenario playbooks, and the hard design decisions you meet in real work. Read it in order, or jump to a part. About ' + Math.round(hbMin / 60) + ' hours in total.</p>' +
      CCAR.HANDBOOK_PARTS.map(function (p) {
        var ls = hb.filter(function (l) { return l.part === p.id; });
        if (!ls.length) return '';
        var d = p.domain ? domainOf(p.domain) : null;
        return '<section class="hb-part"><h2>' + (d ? '<span class="dom" style="background:' + d.color + '"></span>' : '') + esc(p.name) + '</h2><p class="small muted">' + esc(p.blurb) + '</p>' +
          '<div class="grid g2 lesson-list">' + ls.map(function (l) { n++; return chapterCard(l, st, l.num || String(n)); }).join('') + '</div></section>';
      }).join('');
  };

  CCAR.views.lesson = function (el, params) {
    var id = params[0];
    var l = CCAR.lessons.find(function (x) { return x.id === id; });
    if (!l) { el.innerHTML = '<p>Lesson not found. <a href="#/study">Back</a></p>'; return; }
    var seq = sequenceFor(l);
    var idx = seq.indexOf(l);
    var st = CCAR.store.load();
    var d = domainOf(l.domain);
    var part = l.part ? CCAR.HANDBOOK_PARTS.find(function (p) { return p.id === l.part; }) : null;
    var weak = (l.objs || []).filter(CCAR.isWeak);
    var qCount = (l.objs && l.objs.length) ? CCAR.engine.questionsFor(function (q) { return l.objs.indexOf(q.obj) >= 0; }).length : 0;
    var prev = seq[idx - 1], next = seq[idx + 1];
    var back = CCAR.isHandbook(l) ? '#/study' : '#/study/retake';

    el.innerHTML = '<p class="small"><a href="' + back + '">← ' + (CCAR.isHandbook(l) ? 'Architect Handbook' : 'Retake focus lessons') + '</a></p>' +
      '<div class="row">' + (part ? '<span class="pill">' + esc(part.name) + '</span>' : '<span class="pill">' + (d ? esc(d.id + ' · ' + d.name) : 'All domains') + '</span>') +
      '<span class="small muted">≈ ' + l.minutes + ' min</span></div>' +
      '<h1>' + (l.num ? '<span class="hb-num">' + esc(l.num) + '</span>' : '') + esc(l.title) + '</h1>' +
      (weak.length ? '<div class="callout weak"><b>Focus area from your score report:</b><ul>' + weak.map(function (oid) {
        var o = CCAR.objectiveById(oid); return '<li><b>' + o.prev + '%</b>: ' + esc(o.t) + '</li>'; }).join('') + '</ul></div>' : '') +
      ((l.ts && l.ts.length) || (l.objs && l.objs.length) ? '<div class="small">Covers: ' + tsPills(l.ts) + ' ' + objPills(l.objs) + '</div>' : '') +
      '<article class="lesson-body">' + l.body() + '</article>' +
      '<div class="card" style="margin-top:22px"><div class="row">' +
      '<button class="btn ' + (st.lessonsDone[l.id] ? '' : 'primary') + '" id="done-btn">' + (st.lessonsDone[l.id] ? '✓ Completed (click to undo)' : 'Mark lesson complete') + '</button>' +
      (qCount ? '<button class="btn" id="drill-btn">Drill these objectives (' + Math.min(qCount, 15) + ' of ' + qCount + ' questions)</button>' : '') +
      '<span class="spacer"></span>' +
      (prev ? '<a class="btn ghost" href="#/lesson/' + prev.id + '" title="' + esc(prev.title) + '">← Previous</a>' : '') +
      (next ? '<a class="btn ghost" href="#/lesson/' + next.id + '" title="' + esc(next.title) + '">Next →</a>' : '') + '</div></div>';

    ui.$('#done-btn', el).addEventListener('click', function () {
      if (st.lessonsDone[l.id]) delete st.lessonsDone[l.id]; else st.lessonsDone[l.id] = Date.now();
      CCAR.store.save(true); CCAR.views.lesson(el, params);
    });
    var db = ui.$('#drill-btn', el);
    db && db.addEventListener('click', function () {
      CCAR.actions.startDrill({ title: 'Drill: ' + l.title, filter: function (q) { return l.objs.indexOf(q.obj) >= 0; }, n: 15 });
    });
    window.scrollTo && window.scrollTo(0, 0);
  };
})();
