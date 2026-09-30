/* Exams list, drill builder, and actions that create attempts. */
(function () {
  var ui = CCAR.ui, esc = ui.esc, E = CCAR.engine;

  function go(a) { location.hash = '#/attempt/' + a.id; }

  /* Prefer unseen and previously missed questions, then fill randomly. */
  function pickQuestions(pool, n) {
    var st = CCAR.store.load();
    var rand = ui.rng(Date.now() % 1e9);
    var score = function (q) { var s = st.qstats[q.id]; if (!s) return 0; if (!s.lastCorrect) return 1; return 2; };
    var sh = ui.shuffle(pool, rand);
    sh.sort(function (a, b) { return score(a) - score(b); });
    return sh.slice(0, n).map(function (q) { return q.id; });
  }

  var actions = {
    startExam: function (formId, practice) {
      var f = CCAR.EXAM_FORMS.find(function (x) { return x.id === formId; });
      var qids = (CCAR.exams[formId] || []).map(function (q) { return q.id; });
      var existing = E.attempts(function (a) { return a.status === 'in_progress' && a.formId === formId; })[0];
      var begin = function () {
        go(E.createAttempt({ kind: practice ? 'drill' : 'exam', formId: formId, qids: qids, title: f.title + (practice ? ' (practice mode)' : ''), timed: !practice, feedback: practice ? 'instant' : 'end' }));
      };
      if (existing) {
        ui.confirm('Attempt in progress', '<p>You already have an unfinished attempt of ' + esc(f.title) + '. Resume it, or start a new one? Starting new keeps the old attempt in history.</p>', 'Start new').then(function (ok) { if (ok) begin(); else go(existing); });
      } else begin();
    },
    startDrill: function (o) {
      var pool = E.questionsFor(o.filter);
      if (!pool.length) { ui.toast('No questions match that selection.'); return; }
      var qids = pickQuestions(pool, Math.min(o.n || 15, pool.length));
      go(E.createAttempt({ kind: 'drill', qids: qids, title: o.title, timed: !!o.timed, feedback: o.feedback || 'instant' }));
    },
    weakDrill: function (n) { actions.startDrill({ title: 'Weak-objective drill', filter: function (q) { return CCAR.isWeak(q.obj); }, n: n || 20 }); },
    objectiveDrill: function (objId) {
      var o = CCAR.objectiveById(objId);
      actions.startDrill({ title: 'Drill ' + objId + ': ' + o.t.slice(0, 60), filter: function (q) { return q.obj === objId; }, n: 12 });
    },
    missedDrill: function () {
      var st = CCAR.store.load();
      actions.startDrill({ title: 'Missed-questions drill', filter: function (q) { var s = st.qstats[q.id]; return s && !s.lastCorrect; }, n: 25 });
    }
  };
  CCAR.actions = actions;

  CCAR.views.exams = function (el) {
    var st = CCAR.store.load();
    var missed = Object.keys(st.qstats).filter(function (k) { return !st.qstats[k].lastCorrect; }).length;
    el.innerHTML = '<h1>Exams &amp; drills</h1>' +
      '<p>Each practice exam mirrors the real format: <b>60 items, 120 minutes, 4 of the 6 scenarios</b>, a mix of single-answer and "select 2" items, scored on the 100–1000 scale with 720 to pass. Scenario order, question order and option order are shuffled on every attempt. About 40% of each form targets your weak objectives.</p>' +
      '<div class="grid g2">' + CCAR.EXAM_FORMS.map(function (f) {
        var qs = CCAR.exams[f.id] || [];
        var done = E.attempts(function (a) { return a.formId === f.id && a.status === 'submitted' && a.kind === 'exam'; });
        var best = done.reduce(function (b, a) { return Math.max(b, a.result.scaled); }, 0);
        return '<div class="card"><div class="row"><h2 style="margin:0">' + esc(f.title) + '</h2><span class="spacer"></span>' +
          (done.length ? '<span class="pill ' + (best >= 720 ? 'good' : 'weak') + '">best ' + best + '</span>' : '<span class="pill">not taken</span>') + '</div>' +
          '<p class="small">' + f.scenarios.map(function (s) { return '<span class="pill">' + s + ' · ' + esc(CCAR.SCENARIOS[s].short) + '</span>'; }).join(' ') + '</p>' +
          '<p class="small muted">Focus: ' + esc(f.focus) + '. ' + qs.length + ' items.</p>' +
          '<div class="row"><button class="btn primary" data-exam="' + f.id + '">Start timed exam</button>' +
          '<button class="btn" data-practice="' + f.id + '">Practice mode (instant feedback)</button></div></div>';
      }).join('') + '</div>' +
      '<h2>Targeted drills</h2><div class="grid g3">' +
      '<div class="card"><h3 style="margin-top:0">Weak objectives</h3><p class="small muted">20 questions from the objectives you scored under 70% on. Unseen and missed questions come first.</p><button class="btn primary" id="d-weak">Start</button></div>' +
      '<div class="card"><h3 style="margin-top:0">Missed questions</h3><p class="small muted">Questions whose most recent answer was wrong (' + missed + ').</p><button class="btn" id="d-missed"' + (missed ? '' : ' disabled') + '>Start</button></div>' +
      '<div class="card"><h3 style="margin-top:0">Zero-percent objectives</h3><p class="small muted">Only O06, O08, O09, O10, O13, O16, O18, O19, O28.</p><button class="btn" id="d-zero">Start 20</button></div></div>' +
      '<div class="card" style="margin-top:16px"><h3 style="margin-top:0">Custom drill builder</h3>' +
      '<div class="grid g3"><fieldset><legend>Domains</legend>' + CCAR.DOMAINS.map(function (d) { return '<label><input type="checkbox" name="dom" value="' + d.id + '" checked> ' + d.id + ' ' + esc(d.name) + '</label><br>'; }).join('') + '</fieldset>' +
      '<fieldset><legend>Scenarios</legend>' + Object.keys(CCAR.SCENARIOS).map(function (s) { return '<label><input type="checkbox" name="scn" value="' + s + '" checked> ' + s + ' ' + esc(CCAR.SCENARIOS[s].short) + '</label><br>'; }).join('') + '</fieldset>' +
      '<fieldset><legend>Options</legend><label><input type="checkbox" id="c-weak"> Weak objectives only</label><br><label><input type="checkbox" id="c-multi"> "Select 2/3" items only</label><br>' +
      '<label>Questions <input type="number" id="c-n" min="5" max="120" value="20"></label><br><label><input type="checkbox" id="c-timed"> Timed (2 min/question)</label><br>' +
      '<label>Feedback <select id="c-fb"><option value="instant">After each question</option><option value="end">At the end</option></select></label></fieldset></div>' +
      '<button class="btn primary" id="c-go" style="margin-top:10px">Build drill</button></div>';

    ui.$all('[data-exam]', el).forEach(function (b) { b.addEventListener('click', function () { actions.startExam(b.dataset.exam, false); }); });
    ui.$all('[data-practice]', el).forEach(function (b) { b.addEventListener('click', function () { actions.startExam(b.dataset.practice, true); }); });
    ui.$('#d-weak', el).addEventListener('click', function () { actions.weakDrill(20); });
    ui.$('#d-missed', el).addEventListener('click', actions.missedDrill);
    ui.$('#d-zero', el).addEventListener('click', function () {
      actions.startDrill({ title: 'Zero-percent objectives drill', filter: function (q) { var o = CCAR.objectiveById(q.obj); return o && o.prev === 0; }, n: 20 });
    });
    ui.$('#c-go', el).addEventListener('click', function () {
      var doms = ui.$all('input[name=dom]:checked', el).map(function (i) { return i.value; });
      var scns = ui.$all('input[name=scn]:checked', el).map(function (i) { return i.value; });
      var weak = ui.$('#c-weak', el).checked, multi = ui.$('#c-multi', el).checked;
      var n = Math.max(5, Math.min(120, parseInt(ui.$('#c-n', el).value, 10) || 20));
      actions.startDrill({
        title: 'Custom drill', n: n, timed: ui.$('#c-timed', el).checked, feedback: ui.$('#c-fb', el).value,
        filter: function (q) { return doms.indexOf(q.domain) >= 0 && scns.indexOf(q.scenario) >= 0 && (!weak || CCAR.isWeak(q.obj)) && (!multi || q.type === 'multi'); }
      });
    });
  };
})();
