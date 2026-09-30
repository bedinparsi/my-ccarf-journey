/* Exam engine: builds attempts, shuffles, scores, and aggregates stats. */
(function () {
  var ui = CCAR.ui;
  var EXAM_SECONDS = 120 * 60;

  // ---- question index ----
  var index = null;
  function qIndex() {
    if (index) return index;
    index = {};
    Object.keys(CCAR.exams).forEach(function (examId) {
      CCAR.exams[examId].forEach(function (q) { q.examId = examId; index[q.id] = q; });
    });
    return index;
  }
  function allQuestions() { var ix = qIndex(); return Object.keys(ix).map(function (k) { return ix[k]; }); }

  function newId() { return 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  /* Build an attempt.
     kind: 'exam' (full form), 'drill' (custom set), 'retry' (missed questions).
     Questions are grouped by scenario (as on the real exam); scenario order, item order and option order are shuffled. */
  function createAttempt(opts) {
    var st = CCAR.store.load();
    var seed = Math.floor(Math.random() * 1e9);
    var rand = ui.rng(seed);
    var qs = opts.qids.map(function (id) { return qIndex()[id]; }).filter(Boolean);
    var byScen = {};
    qs.forEach(function (q) { (byScen[q.scenario] = byScen[q.scenario] || []).push(q.id); });
    var scenOrder = ui.shuffle(Object.keys(byScen), rand);
    var ordered = [];
    scenOrder.forEach(function (s) { ordered = ordered.concat(opts.keepOrder ? byScen[s] : ui.shuffle(byScen[s], rand)); });
    var optOrder = {};
    ordered.forEach(function (id) {
      var q = qIndex()[id];
      optOrder[id] = ui.shuffle(q.options.map(function (_, i) { return i; }), rand);
    });
    var a = {
      id: newId(), kind: opts.kind, formId: opts.formId || null, title: opts.title,
      qids: ordered, optOrder: optOrder, answers: {}, flags: {}, current: 0,
      timed: opts.timed !== false, durationSec: opts.durationSec || (opts.kind === 'exam' ? EXAM_SECONDS : Math.round(ordered.length * 120)),
      elapsedSec: 0, startedAt: Date.now(), status: 'in_progress', feedback: opts.feedback || 'end'
    };
    st.attempts[a.id] = a;
    CCAR.store.save(true);
    return a;
  }

  function isCorrect(q, chosen) {
    if (!chosen || chosen.length !== q.answer.length) return false;
    var a = q.answer.slice().sort().join(','), c = chosen.slice().sort().join(',');
    return a === c;
  }

  function scaled(p) { return Math.round(100 + 900 * p); } // linear approximation of the 100–1000 scale

  function score(attempt) {
    var ix = qIndex();
    var res = { total: 0, correct: 0, byDomain: {}, byObj: {}, byScen: {}, items: [] };
    attempt.qids.forEach(function (id) {
      var q = ix[id]; if (!q) return;
      var ok = isCorrect(q, attempt.answers[id]);
      res.total++; if (ok) res.correct++;
      [['byDomain', q.domain], ['byObj', q.obj], ['byScen', q.scenario]].forEach(function (p) {
        var m = res[p[0]]; m[p[1]] = m[p[1]] || { n: 0, c: 0 }; m[p[1]].n++; if (ok) m[p[1]].c++;
      });
      res.items.push({ id: id, ok: ok, answered: !!(attempt.answers[id] && attempt.answers[id].length) });
    });
    res.pct = res.total ? res.correct / res.total : 0;
    res.scaled = scaled(res.pct);
    res.pass = res.scaled >= CCAR.PASS_SCALED;
    return res;
  }

  function submit(attempt) {
    var st = CCAR.store.load();
    if (attempt.status === 'submitted') return attempt.result;
    attempt.status = 'submitted';
    attempt.submittedAt = Date.now();
    attempt.result = score(attempt);
    // per-question history (for weak-question drills)
    attempt.result.items.forEach(function (it) {
      var qs = st.qstats[it.id] = st.qstats[it.id] || { seen: 0, correct: 0, wrongStreak: 0 };
      qs.seen++; if (it.ok) { qs.correct++; qs.wrongStreak = 0; } else { qs.wrongStreak++; }
      qs.lastCorrect = it.ok; qs.lastAt = attempt.submittedAt;
    });
    CCAR.store.save(true);
    return attempt.result;
  }

  function attempts(filter) {
    var st = CCAR.store.load();
    return Object.keys(st.attempts).map(function (k) { return st.attempts[k]; })
      .filter(function (a) { return !filter || filter(a); })
      .sort(function (a, b) { return (b.submittedAt || b.startedAt) - (a.submittedAt || a.startedAt); });
  }

  /* Aggregate mastery per objective / domain from the most recent answer to each question. */
  function mastery() {
    var st = CCAR.store.load(), ix = qIndex();
    var byObj = {}, byDomain = {};
    Object.keys(st.qstats).forEach(function (id) {
      var q = ix[id], s = st.qstats[id]; if (!q) return;
      var o = byObj[q.obj] = byObj[q.obj] || { n: 0, c: 0 };
      o.n++; if (s.lastCorrect) o.c++;
      var d = byDomain[q.domain] = byDomain[q.domain] || { n: 0, c: 0 };
      d.n++; if (s.lastCorrect) d.c++;
    });
    return { byObj: byObj, byDomain: byDomain, answered: Object.keys(st.qstats).length };
  }

  function questionsFor(filter) { return allQuestions().filter(filter); }

  CCAR.engine = {
    EXAM_SECONDS: EXAM_SECONDS, qIndex: qIndex, allQuestions: allQuestions, createAttempt: createAttempt,
    isCorrect: isCorrect, score: score, submit: submit, attempts: attempts, mastery: mastery, questionsFor: questionsFor, scaled: scaled
  };
})();
