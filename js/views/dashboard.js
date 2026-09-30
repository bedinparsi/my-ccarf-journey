/* Dashboard and score-report analysis views. */
(function () {
  var ui = CCAR.ui, esc = ui.esc, C = CCAR.charts;

  function lessonForObj(objId) { return (CCAR.lessons || []).find(function (l) { return l.objs.indexOf(objId) >= 0; }); }
  CCAR.lessonForObj = lessonForObj;

  function prevDomainPct(d) {
    var os = CCAR.OBJECTIVES.filter(function (o) { return o.d === d && o.prev !== null; });
    if (!os.length) return null;
    return Math.round(os.reduce(function (s, o) { return s + o.prev; }, 0) / os.length);
  }
  CCAR.prevDomainPct = prevDomainPct;

  function examAttempts() { return CCAR.engine.attempts(function (a) { return a.kind === 'exam' && a.status === 'submitted'; }); }

  CCAR.views.dashboard = function (el) {
    var st = CCAR.store.load();
    var m = CCAR.engine.mastery();
    var exams = examAttempts();
    var latest = exams[0];
    var best = exams.reduce(function (b, a) { return Math.max(b, a.result.scaled); }, 0);
    var inProgress = CCAR.engine.attempts(function (a) { return a.status === 'in_progress'; });
    var weakObjs = CCAR.OBJECTIVES.filter(function (o) { return CCAR.isWeak(o.id); });
    var weakAnswered = weakObjs.reduce(function (acc, o) { var x = m.byObj[o.id]; if (x) { acc.n += x.n; acc.c += x.c; } return acc; }, { n: 0, c: 0 });
    var rtL = CCAR.retakeLessons(), hbL = CCAR.handbookLessons();
    var lessonsDone = rtL.filter(function (l) { return st.lessonsDone[l.id]; }).length, lessonsTotal = rtL.length;
    var hbDone = hbL.filter(function (l) { return st.lessonsDone[l.id]; }).length;
    var formsDone = {}; exams.forEach(function (a) { formsDone[a.formId] = true; });

    var nextSteps = [];
    var firstWeakLesson = rtL.find(function (l) { return !st.lessonsDone[l.id] && l.objs.some(CCAR.isWeak); });
    if (firstWeakLesson) nextSteps.push('<a class="btn primary" href="#/lesson/' + firstWeakLesson.id + '">Study: ' + esc(firstWeakLesson.title) + '</a>');
    var nextForm = CCAR.EXAM_FORMS.find(function (f) { return !formsDone[f.id]; });
    if (nextForm) nextSteps.push('<a class="btn" href="#/exams">Take ' + esc(nextForm.title) + ' (timed, 60 items)</a>');
    nextSteps.push('<button class="btn" id="weak-drill">Drill 20 weak-objective questions</button>');

    var radarLabels = CCAR.DOMAINS.map(function (d) { return d.id + ' ' + d.name.split(' ')[0]; });
    var series = [{ name: 'Sept 22 exam (avg objective %)', color: '#c2453a', values: CCAR.DOMAINS.map(function (d) { return prevDomainPct(d.id) || 0; }) }];
    if (m.answered) series.push({ name: 'Your practice now', color: '#3f8f5b', values: CCAR.DOMAINS.map(function (d) { var x = m.byDomain[d.id]; return x ? ui.pct(x.c, x.n) : 0; }) });

    el.innerHTML =
      '<section class="hero"><div><h1>Pass the CCAR-F retake</h1>' +
      '<p>Last attempt on ' + esc(CCAR.PREVIOUS_ATTEMPT.date) + ': <b>' + CCAR.PREVIOUS_ATTEMPT.scaled + '</b> (pass is ' + CCAR.PASS_SCALED + '). That\'s roughly 5–6 more correct answers out of 60. ' +
      weakObjs.length + ' objectives scored below 70%, and 9 of them scored 0%. This plan targets them first.</p>' +
      '<div class="row" style="margin-top:14px">' + nextSteps.join('') + '</div></div>' +
      '<div class="row">' + C.gauge(CCAR.PREVIOUS_ATTEMPT.scaled, { caption: 'Sept 22 (real exam)' }) +
      (latest ? C.gauge(latest.result.scaled, { caption: 'latest practice' }) : '') + '</div></section>' +
      (inProgress.length ? '<div class="card" style="margin-top:16px;border-color:var(--warn)"><div class="row"><b>In progress:</b> ' + esc(inProgress[0].title) +
        ' <span class="muted small">' + Object.keys(inProgress[0].answers).length + '/' + inProgress[0].qids.length + ' answered</span><span class="spacer"></span><a class="btn primary sm" href="#/attempt/' + inProgress[0].id + '">Resume</a></div></div>' : '') +
      '<div class="grid g4" style="margin-top:16px">' +
      kpi('Practice exams taken', exams.length + ' <span class="small muted">/ ' + CCAR.EXAM_FORMS.length + ' forms</span>') +
      kpi('Best practice score', best ? '<span class="' + (best >= 720 ? 'good-t' : 'bad-t') + '">' + best + '</span>' : '–') +
      kpi('Weak-objective accuracy', weakAnswered.n ? ui.pct(weakAnswered.c, weakAnswered.n) + '%' : '–', weakAnswered.n + ' answers') +
      kpi('Lessons completed', lessonsDone + ' <span class="small muted">/ ' + lessonsTotal + ' retake</span>', '<a href="#/study">Architect Handbook</a>: ' + hbDone + ' / ' + hbL.length + ' chapters') + '</div>' +
      '<div class="grid g2" style="margin-top:16px">' +
      '<div class="card"><h2 style="margin-top:0">Domain profile</h2>' + C.radar(radarLabels, series) +
      '<div class="legend">' + series.map(function (s) { return '<span><i style="background:' + s.color + '"></i>' + esc(s.name) + '</span>'; }).join('') + '<span><i style="background:var(--accent)"></i>dashed = 72%</span></div>' +
      '<p class="small muted">The Sept 22 values average the per-objective percentages on your score report, so treat them as approximate.</p></div>' +
      '<div class="card"><h2 style="margin-top:0">Exam blueprint vs your weak spots</h2>' + blueprintTable() + '</div></div>' +
      '<div class="card" style="margin-top:16px"><h2 style="margin-top:0">Study plan (in priority order)</h2>' + planList(st) + '</div>';

    function kpi(label, val, sub) { return '<div class="card"><div class="kpi-label">' + label + '</div><div class="kpi">' + val + '</div>' + (sub ? '<div class="small muted">' + sub + '</div>' : '') + '</div>'; }

    var wd = document.getElementById('weak-drill');
    wd && wd.addEventListener('click', function () { CCAR.actions.weakDrill(20); });
  };

  function blueprintTable() {
    return '<table class="tbl"><thead><tr><th>Domain</th><th>Weight</th><th>≈ items</th><th>Weak objectives</th></tr></thead><tbody>' +
      CCAR.DOMAINS.map(function (d) {
        var weak = CCAR.OBJECTIVES.filter(function (o) { return o.d === d.id && CCAR.isWeak(o.id); });
        return '<tr><td><span class="dom" style="background:' + d.color + '"></span>' + esc(d.name) + '</td><td>' + d.weight + '%</td><td>' + Math.round(d.weight * 0.6) + '</td><td>' +
          (weak.length ? weak.map(function (o) { return '<span class="pill weak" title="' + esc(o.t) + '">' + o.id + ' · ' + o.prev + '%</span>'; }).join(' ') : '<span class="pill good">none</span>') + '</td></tr>';
      }).join('') + '</tbody></table>';
  }

  function planList(st) {
    var order = CCAR.retakeLessons().slice().sort(function (a, b) {
      var wa = a.objs.filter(CCAR.isWeak).length, wb = b.objs.filter(CCAR.isWeak).length;
      var za = a.objs.some(function (o) { var x = CCAR.objectiveById(o); return x && x.prev === 0; }) ? 1 : 0;
      var zb = b.objs.some(function (o) { var x = CCAR.objectiveById(o); return x && x.prev === 0; }) ? 1 : 0;
      return (zb - za) || (wb - wa);
    });
    return '<ol class="steps">' + order.map(function (l) {
      var done = st.lessonsDone[l.id];
      var weak = l.objs.filter(CCAR.isWeak);
      return '<li><a href="#/lesson/' + l.id + '">' + esc(l.title) + '</a> ' + (done ? '<span class="pill good">done</span> ' : '') +
        weak.map(function (o) { return '<span class="pill weak">' + o + ' ' + CCAR.objectiveById(o).prev + '%</span>'; }).join(' ') +
        ' <span class="small muted">· ' + l.minutes + ' min</span></li>';
    }).join('') + '<li>Work through the <a href="#/study">Architect Handbook</a> (complete coverage of every task statement, including your strong areas), one part per sitting.</li><li>Take Practice Exams 1–5 under timed conditions. Review every miss, then run a "missed questions" drill.</li><li>Target 80% or higher on two consecutive forms before you rebook.</li></ol>';
  }

  /* ---------- Score report analysis ---------- */
  CCAR.views.report = function (el) {
    var m = CCAR.engine.mastery();
    var all = CCAR.engine.allQuestions();
    var counts = {}; all.forEach(function (q) { counts[q.obj] = (counts[q.obj] || 0) + 1; });
    var reportObjs = CCAR.OBJECTIVES.filter(function (o) { return o.prev !== null; });
    var weak = reportObjs.filter(function (o) { return CCAR.isWeak(o.id); }).sort(function (a, b) { return a.prev - b.prev; });

    var rows = weak.map(function (o) {
      var x = m.byObj[o.id];
      return { label: o.id + ' · ' + shortT(o.t), values: [{ v: o.prev, name: 'Sept 22', color: '#c2453a' }, { v: x ? ui.pct(x.c, x.n) : null, name: 'Practice now', color: '#3f8f5b' }] };
    });

    el.innerHTML = '<h1>Score report analysis</h1>' +
      '<p>These are the <b>' + reportObjs.length + '</b> objectives from your ' + esc(CCAR.PREVIOUS_ATTEMPT.date) + ' score report, set against your practice accuracy (the most recent answer to each question). Items below 70% are marked weak and get extra practice in every exam form.</p>' +
      '<div class="card"><h2 style="margin-top:0">Weak objectives: then vs now</h2><div class="legend"><span><i style="background:#c2453a"></i>Sept 22 exam</span><span><i style="background:#3f8f5b"></i>Your practice now</span></div>' +
      C.hbars(rows, { labelW: 330, barW: 360, title: 'Weak objectives' }) + '</div>' +
      '<div class="card" style="margin-top:16px"><h2 style="margin-top:0">All objectives</h2>' +
      '<table class="tbl obj-tbl"><thead><tr><th>ID</th><th>Objective</th><th>Domain</th><th>Sept 22</th><th>Practice now</th><th>Questions</th><th></th></tr></thead><tbody>' +
      CCAR.OBJECTIVES.map(function (o) {
        var x = m.byObj[o.id], now = x ? ui.pct(x.c, x.n) : null, l = lessonForObj(o.id);
        return '<tr><td><b>' + o.id + '</b></td><td>' + esc(o.t) + ' <span class="small muted">(task ' + o.ts + ')</span></td><td>' + o.d + '</td>' +
          '<td class="n">' + (o.prev === null ? '<span class="cell na">n/a</span>' : '<span class="cell ' + ui.scoreClass(o.prev) + '">' + o.prev + '%</span>') + '</td>' +
          '<td class="n">' + (now === null ? '<span class="cell na">–</span>' : '<span class="cell ' + ui.scoreClass(now) + '">' + now + '%</span> <span class="small muted">' + x.c + '/' + x.n + '</span>') + '</td>' +
          '<td class="n">' + (counts[o.id] || 0) + '</td><td style="white-space:nowrap">' +
          (l ? '<a class="btn sm ghost" href="#/lesson/' + l.id + '">Study</a> ' : '') +
          (counts[o.id] ? '<button class="btn sm" data-drill="' + o.id + '">Drill</button>' : '') + '</td></tr>';
      }).join('') + '</tbody></table><p class="small muted">X-objectives are blueprint task statements that didn\'t appear as separate lines on your report. They are still tested.</p></div>';

    ui.$all('[data-drill]', el).forEach(function (b) {
      b.addEventListener('click', function () { CCAR.actions.objectiveDrill(b.dataset.drill); });
    });
  };

  function shortT(t) { return t.length > 46 ? t.slice(0, 44) + '…' : t; }
})();
