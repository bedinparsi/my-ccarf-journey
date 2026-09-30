/* Exam / drill runner with timer, palette, flags, keyboard shortcuts, and optional instant feedback. */
(function () {
  var ui = CCAR.ui, esc = ui.esc, E = CCAR.engine;
  var LETTERS = 'ABCDEF';

  CCAR.views.runner = function (el, params) {
    var st = CCAR.store.load();
    var a = st.attempts[params[0]];
    if (!a) { el.innerHTML = '<p>Attempt not found. <a href="#/exams">Back to exams</a></p>'; return; }
    if (a.status === 'submitted') { location.hash = '#/results/' + a.id; return; }
    a.checked = a.checked || {};
    var ix = E.qIndex();
    var timerId = null, lastTick = Date.now(), dirty = 0;

    function q() { return ix[a.qids[a.current]]; }
    function remaining() { return a.durationSec - a.elapsedSec; }

    function render() {
      var cur = q();
      var scen = CCAR.SCENARIOS[cur.scenario];
      var chosen = a.answers[cur.id] || [];
      var order = a.optOrder[cur.id];
      var checked = a.feedback === 'instant' && a.checked[cur.id];
      var firstOfScen = a.current === 0 || ix[a.qids[a.current - 1]].scenario !== cur.scenario;
      var answeredN = Object.keys(a.answers).filter(function (k) { return a.answers[k] && a.answers[k].length; }).length;

      el.innerHTML =
        '<div class="exam-top"><div class="row"><b>' + esc(a.title) + '</b><span class="muted small">Question ' + (a.current + 1) + ' of ' + a.qids.length + ' · ' + answeredN + ' answered</span><span class="spacer"></span>' +
        (a.timed ? '<span class="timer" id="timer" role="timer" aria-live="off">' + ui.fmtTime(remaining()) + '</span>' : '<span class="pill">untimed</span>') +
        '<button class="btn sm" id="pause">Save &amp; exit</button><button class="btn sm primary" id="submit">Review &amp; submit</button></div></div>' +
        '<div class="exam-layout"><div>' +
        '<details class="scenario-box"' + (firstOfScen ? ' open' : '') + '><summary>Scenario ' + cur.scenario.slice(1) + ': ' + esc(scen.name) + '</summary><p style="margin:.5em 0 0">' + esc(scen.text) + '</p></details>' +
        '<div class="card"><div class="row small muted"><span>' + (cur.type === 'multi' ? '<b class="warn-t">Choose ' + cur.select + ' answers.</b>' : 'Choose 1 answer.') + '</span><span class="spacer"></span>' +
        '<button class="btn sm ghost" id="flag" aria-pressed="' + !!a.flags[cur.id] + '">' + (a.flags[cur.id] ? '🚩 Flagged' : '⚑ Flag for review') + '</button></div>' +
        '<div class="stem">' + cur.stem + '</div>' +
        '<ul class="opts" role="' + (cur.type === 'multi' ? 'group' : 'radiogroup') + '" aria-label="Answer options">' +
        order.map(function (orig, pos) {
          var sel = chosen.indexOf(orig) >= 0;
          var cls = 'opt' + (sel ? ' sel' : '');
          if (checked) { if (cur.answer.indexOf(orig) >= 0) cls += ' correct'; else if (sel) cls += ' wrong'; }
          return '<li><label class="' + cls + '"><input type="' + (cur.type === 'multi' ? 'checkbox' : 'radio') + '" name="opt" value="' + orig + '"' + (sel ? ' checked' : '') + (checked ? ' disabled' : '') + '>' +
            '<span><span class="letter">' + LETTERS[pos] + '.</span> ' + cur.options[orig] +
            (checked ? '<div class="why">' + (cur.answer.indexOf(orig) >= 0 ? '✅ ' : '✖ ') + cur.rationales[orig] + '</div>' : '') + '</span></label></li>';
        }).join('') + '</ul>' +
        (checked ? feedbackBox(cur, chosen) : '') +
        '<div class="row">' +
        '<button class="btn" id="prev"' + (a.current === 0 ? ' disabled' : '') + '>← Previous</button>' +
        (a.feedback === 'instant' && !checked ? '<button class="btn primary" id="check"' + (chosen.length ? '' : ' disabled') + '>Check answer</button>' : '') +
        '<span class="spacer"></span>' +
        (a.current < a.qids.length - 1 ? '<button class="btn ' + (a.feedback !== 'instant' || checked ? 'primary' : '') + '" id="next">Next →</button>' : '<button class="btn primary" id="submit2">Finish</button>') +
        '</div><p class="small muted" style="margin-bottom:0">Keys: <span class="kbd">1</span>–<span class="kbd">6</span> select · <span class="kbd">←</span>/<span class="kbd">→</span> navigate · <span class="kbd">F</span> flag' + (a.feedback === 'instant' ? ' · <span class="kbd">Enter</span> check' : '') + '</p></div></div>' +
        '<aside class="card" aria-label="Question navigator"><b>Navigator</b>' + palette() +
        '<div class="legend" style="margin-top:10px"><span><i style="background:#e5eef8;border:1px solid var(--info)"></i>answered</span><span><i style="box-shadow:inset 0 -3px 0 var(--warn);border:1px solid var(--line)"></i>flagged</span></div></aside></div>';
      bind();
    }

    function feedbackBox(cur, chosen) {
      var ok = E.isCorrect(cur, chosen);
      var o = CCAR.objectiveById(cur.obj);
      return '<div class="explain" role="status"><b class="' + (ok ? 'good-t' : 'bad-t') + '">' + (ok ? '✅ Correct' : '✖ Incorrect') + '</b> <span class="small muted">· ' + cur.obj + ' ' + esc(o ? o.t : '') + '</span>' +
        '<p>' + cur.explanation + '</p>' +
        (cur.signals ? '<p class="small"><b>Reading the scenario:</b> ' + cur.signals + '</p>' : '') +
        '<p class="small"><b>Trap tested:</b> ' + esc(cur.trap || '') + '</p>' + lessonLink(cur.obj) + '</div>';
    }
    function lessonLink(obj) { var l = CCAR.lessonForObj(obj); return l ? '<p class="small">Review: <a href="#/lesson/' + l.id + '" target="_self">' + esc(l.title) + '</a></p>' : ''; }

    function palette() {
      var html = '', lastS = null;
      a.qids.forEach(function (id, i) {
        var qq = ix[id];
        if (qq.scenario !== lastS) { if (lastS) html += '</div>'; html += '<div class="small muted" style="margin:8px 0 4px">' + qq.scenario + ' · ' + esc(CCAR.SCENARIOS[qq.scenario].short) + '</div><div class="palette">'; lastS = qq.scenario; }
        var cls = [];
        if (a.answers[id] && a.answers[id].length) cls.push('ans');
        if (a.flags[id]) cls.push('flag');
        if (i === a.current) cls.push('cur');
        if (a.feedback === 'instant' && a.checked[id]) cls.push(E.isCorrect(qq, a.answers[id]) ? 'ok' : 'no');
        html += '<button data-go="' + i + '" class="' + cls.join(' ') + '" aria-label="Question ' + (i + 1) + (a.flags[id] ? ', flagged' : '') + '">' + (i + 1) + '</button>';
      });
      return html + '</div>';
    }

    function choose(orig) {
      var cur = q();
      if (a.feedback === 'instant' && a.checked[cur.id]) return;
      var ch = (a.answers[cur.id] || []).slice();
      if (cur.type === 'multi') {
        var k = ch.indexOf(orig);
        if (k >= 0) ch.splice(k, 1);
        else { if (ch.length >= cur.select) { ui.toast('Choose only ' + cur.select + '. Deselect one first.'); render(); return; } ch.push(orig); }
      } else ch = [orig];
      a.answers[cur.id] = ch;
      CCAR.store.save();
      render();
    }

    function goTo(i) { if (i < 0 || i >= a.qids.length) return; a.current = i; CCAR.store.save(); render(); }

    function doSubmit(auto) {
      var unanswered = a.qids.filter(function (id) { return !(a.answers[id] && a.answers[id].length); }).length;
      var flagged = Object.keys(a.flags).filter(function (k) { return a.flags[k]; }).length;
      var finish = function () { stop(); E.submit(a); location.hash = '#/results/' + a.id; };
      if (auto) { ui.toast('Time is up. Your exam was submitted.'); finish(); return; }
      ui.confirm('Submit ' + a.title + '?', '<p>' + unanswered + ' unanswered · ' + flagged + ' flagged.</p><p class="small muted">You can\'t change answers after submitting.</p>', 'Submit').then(function (ok) { if (ok) finish(); });
    }

    function bind() {
      ui.$all('.opts input', el).forEach(function (inp) {
        inp.addEventListener('change', function () { choose(parseInt(inp.value, 10)); });
      });
      ui.$all('[data-go]', el).forEach(function (b) { b.addEventListener('click', function () { goTo(parseInt(b.dataset.go, 10)); }); });
      var p = ui.$('#prev', el); p && p.addEventListener('click', function () { goTo(a.current - 1); });
      var n = ui.$('#next', el); n && n.addEventListener('click', function () { goTo(a.current + 1); });
      var c = ui.$('#check', el); c && c.addEventListener('click', check);
      ui.$('#flag', el).addEventListener('click', toggleFlag);
      ui.$('#submit', el).addEventListener('click', function () { doSubmit(false); });
      var s2 = ui.$('#submit2', el); s2 && s2.addEventListener('click', function () { doSubmit(false); });
      ui.$('#pause', el).addEventListener('click', function () { CCAR.store.save(true); location.hash = '#/exams'; ui.toast('Saved. Resume it from the dashboard.'); });
    }

    function check() {
      var cur = q();
      if (!(a.answers[cur.id] && a.answers[cur.id].length)) return;
      if (cur.type === 'multi' && a.answers[cur.id].length !== cur.select) { ui.toast('Choose ' + cur.select + ' answers first.'); return; }
      a.checked[cur.id] = true; CCAR.store.save(); render();
    }
    function toggleFlag() { var id = q().id; a.flags[id] = !a.flags[id]; CCAR.store.save(); render(); }

    function onKey(e) {
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) && e.target.type !== 'radio' && e.target.type !== 'checkbox') return;
      if (document.querySelector('dialog[open]')) return;
      var cur = q(), order = a.optOrder[cur.id];
      var k = e.key;
      if (/^[1-6]$/.test(k) && order[+k - 1] !== undefined) { e.preventDefault(); choose(order[+k - 1]); }
      else if (/^[a-fA-F]$/.test(k) && k.toLowerCase() !== 'f' && order[LETTERS.indexOf(k.toUpperCase())] !== undefined) { e.preventDefault(); choose(order[LETTERS.indexOf(k.toUpperCase())]); }
      else if (k === 'ArrowRight') { e.preventDefault(); goTo(a.current + 1); }
      else if (k === 'ArrowLeft') { e.preventDefault(); goTo(a.current - 1); }
      else if (k === 'f' || k === 'F') { e.preventDefault(); toggleFlag(); }
      else if (k === 'Enter' && a.feedback === 'instant' && !a.checked[cur.id]) { e.preventDefault(); check(); }
    }

    function tick() {
      var now = Date.now();
      // Time keeps running in background tabs (like the real exam); cap each step so a sleeping laptop doesn't burn the clock.
      a.elapsedSec += Math.min(60, (now - lastTick) / 1000);
      lastTick = now;
      var t = document.getElementById('timer');
      if (t) { t.textContent = ui.fmtTime(remaining()); t.classList.toggle('low', remaining() < 600); }
      if (++dirty % 5 === 0) CCAR.store.save();
      if (a.timed && remaining() <= 0) doSubmit(true);
    }
    function stop() { clearInterval(timerId); document.removeEventListener('keydown', onKey); CCAR.store.save(true); }

    document.addEventListener('keydown', onKey);
    timerId = setInterval(tick, 1000);
    render();
    return stop;
  };
})();
