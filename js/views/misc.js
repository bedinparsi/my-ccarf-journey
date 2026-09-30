/* History, flashcards, and settings views. */
(function () {
  var ui = CCAR.ui, esc = ui.esc, E = CCAR.engine, C = CCAR.charts;

  CCAR.views.history = function (el) {
    var all = E.attempts();
    var exams = all.filter(function (a) { return a.kind === 'exam' && a.status === 'submitted'; }).reverse();
    var pts = [{ x: 'Real exam ' + CCAR.PREVIOUS_ATTEMPT.date, short: 'Real', y: CCAR.PREVIOUS_ATTEMPT.scaled }].concat(exams.map(function (a, i) {
      return { x: a.title + ' · ' + ui.fmtDate(a.submittedAt), short: 'P' + (i + 1), y: a.result.scaled };
    }));
    el.innerHTML = '<h1>History</h1><div class="card"><h2 style="margin-top:0">Scaled score trend (timed exams)</h2>' + C.line(pts) +
      '<p class="small muted">The first point is your real Sept 22 exam (656). Green points are at or above 720.</p></div>' +
      '<div class="card" style="margin-top:16px"><h2 style="margin-top:0">All attempts</h2>' +
      (all.length ? '<table class="tbl"><thead><tr><th>When</th><th>Attempt</th><th>Type</th><th>Result</th><th></th></tr></thead><tbody>' + all.map(function (a) {
        var res = a.status === 'submitted' ? '<span class="cell ' + (a.result.pass ? 'good' : 'bad') + '">' + a.result.scaled + '</span> <span class="small muted">' + a.result.correct + '/' + a.result.total + '</span>' : '<span class="pill">in progress · ' + Object.keys(a.answers).length + '/' + a.qids.length + '</span>';
        return '<tr><td class="small">' + ui.fmtDate(a.submittedAt || a.startedAt) + '</td><td>' + esc(a.title) + '</td><td>' + a.kind + '</td><td>' + res + '</td><td style="white-space:nowrap">' +
          '<a class="btn sm" href="#/' + (a.status === 'submitted' ? 'results/' : 'attempt/') + a.id + '">' + (a.status === 'submitted' ? 'Review' : 'Resume') + '</a> <button class="btn sm ghost" data-del="' + a.id + '" aria-label="Delete attempt">🗑</button></td></tr>';
      }).join('') + '</tbody></table>' : '<p class="muted">No attempts yet. <a href="#/exams">Start one</a>.</p>') + '</div>';
    ui.$all('[data-del]', el).forEach(function (b) {
      b.addEventListener('click', function () {
        ui.confirm('Delete attempt?', '<p>This removes the attempt from history. Per-question stats already recorded are kept.</p>', 'Delete', true).then(function (ok) {
          if (!ok) return; var st = CCAR.store.load(); delete st.attempts[b.dataset.del]; CCAR.store.save(true); CCAR.views.history(el);
        });
      });
    });
  };

  CCAR.views.flashcards = function (el) {
    var st = CCAR.store.load();
    var weakOnly = true, unknownOnly = false, deck = [], i = 0, flipped = false;
    function build() {
      deck = ui.shuffle(CCAR.flashcards.filter(function (c) {
        return (!weakOnly || CCAR.isWeak(c.obj)) && (!unknownOnly || !(st.cards[c.id] && st.cards[c.id].known));
      }), ui.rng(Date.now() % 1e9));
      i = 0; flipped = false;
    }
    function render() {
      var c = deck[i];
      var known = CCAR.flashcards.filter(function (x) { return st.cards[x.id] && st.cards[x.id].known; }).length;
      el.innerHTML = '<h1>Flashcards</h1><div class="row"><label><input type="checkbox" id="fw"' + (weakOnly ? ' checked' : '') + '> Weak objectives only</label>' +
        '<label><input type="checkbox" id="fu"' + (unknownOnly ? ' checked' : '') + '> Hide cards I know</label><span class="spacer"></span><span class="small muted">' + known + ' / ' + CCAR.flashcards.length + ' marked known</span></div>' +
        (c ? '<div class="card flash" id="card" tabindex="0" role="button" aria-label="Flip card" style="margin-top:14px"><div class="face"><div class="small muted">' + (i + 1) + ' / ' + deck.length + ' · ' + c.obj + ' ' + (CCAR.isWeak(c.obj) ? '<span class="pill weak">weak</span>' : '') + '</div>' +
          '<p><b>' + c.q + '</b></p>' + (flipped ? '<div class="answer">' + c.a + '</div>' : '<p class="small muted">Click or press Space to reveal</p>') + '</div></div>' +
          '<div class="row" style="margin-top:12px"><button class="btn" id="fp">← Prev</button><button class="btn" id="fx">✖ Still learning</button><button class="btn primary" id="fk">✓ I know this</button><button class="btn" id="fn">Next →</button></div>'
          : '<p class="muted" style="margin-top:14px">No cards match the filter. Nice work.</p>');
      var w = ui.$('#fw', el), u = ui.$('#fu', el);
      w.addEventListener('change', function () { weakOnly = w.checked; build(); render(); });
      u.addEventListener('change', function () { unknownOnly = u.checked; build(); render(); });
      if (!c) return;
      var card = ui.$('#card', el);
      var flip = function () { flipped = !flipped; render(); ui.$('#card', el).focus(); };
      card.addEventListener('click', flip);
      card.addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); } });
      var mark = function (k) { st.cards[c.id] = { known: k, at: Date.now() }; CCAR.store.save(); step(1); };
      ui.$('#fk', el).addEventListener('click', function () { mark(true); });
      ui.$('#fx', el).addEventListener('click', function () { mark(false); });
      ui.$('#fn', el).addEventListener('click', function () { step(1); });
      ui.$('#fp', el).addEventListener('click', function () { step(-1); });
    }
    function step(d) { i = (i + d + deck.length) % deck.length; flipped = false; render(); }
    build(); render();
  };

  CCAR.views.settings = function (el) {
    var st = CCAR.store.load();
    var size = (localStorage.getItem(CCAR.store.KEY) || '').length;
    var total = E.allQuestions().length;
    el.innerHTML = '<h1>Progress &amp; settings</h1>' +
      '<div class="card"><h2 style="margin-top:0">Where your progress lives</h2><p>Everything is saved automatically in this browser\'s <b>localStorage</b> under the key <code>' + CCAR.store.KEY + '</code> (' + Math.round(size / 1024) + ' KB). It stays on this computer. Clearing browsing data for this site, or using InPrivate mode, erases it, so export a backup now and then.</p>' +
      '<p class="small muted">Microsoft Edge keeps localStorage per origin. If you open the app from a different folder path or URL, it gets a separate store; use Export/Import to move progress between them.</p>' +
      '<div class="row"><button class="btn primary" id="exp">⬇ Export progress (JSON)</button><label class="btn">⬆ Import progress<input type="file" id="imp" accept="application/json,.json" hidden></label><button class="btn danger" id="rst">Reset all progress</button></div></div>' +
      '<div class="card" style="margin-top:16px"><h2 style="margin-top:0">Question bank</h2><p>' + total + ' questions across ' + CCAR.EXAM_FORMS.length + ' forms · ' + CCAR.lessons.length + ' lessons · ' + CCAR.flashcards.length + ' flashcards. Answered at least once: ' + Object.keys(st.qstats).length + '.</p></div>' +
      '<div class="card" style="margin-top:16px"><h2 style="margin-top:0">Sources</h2><ul class="small">' +
      '<li>CCAR-F Exam Guide v1.0 (July 2026): blueprint, task statements, sample questions</li>' +
      '<li><a href="https://code.claude.com/docs" target="_blank" rel="noopener">Claude Code docs</a> (CLI reference, memory &amp; rules, skills, hooks, settings, Agent SDK)</li>' +
      '<li><a href="https://platform.claude.com/docs" target="_blank" rel="noopener">Claude Developer Platform docs</a> (tool use, structured outputs, batches)</li>' +
      '<li><a href="https://www.anthropic.com/engineering/multi-agent-research-system" target="_blank" rel="noopener">Anthropic Engineering: How we built our multi-agent research system</a></li>' +
      '<li><a href="https://anthropic.skilljar.com" target="_blank" rel="noopener">Anthropic Academy (Skilljar)</a>: Claude Code in Action, Building with the Claude API, Intro to MCP, subagents, agent skills</li></ul>' +
      '<p class="small muted">All practice questions are original and written against the published objectives. They are not actual exam items.</p></div>';

    ui.$('#exp', el).addEventListener('click', function () {
      var blob = new Blob([CCAR.store.exportJSON()], { type: 'application/json' });
      var link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'ccarf-progress-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
    });
    ui.$('#imp', el).addEventListener('change', function (e) {
      var f = e.target.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        ui.confirm('Import progress?', '<p>This replaces the progress currently stored in this browser.</p>', 'Import', true).then(function (ok) {
          if (!ok) return;
          try { CCAR.store.importJSON(rd.result); ui.toast('Progress imported.'); CCAR.app.applyTheme(); CCAR.views.settings(el); }
          catch (err) { ui.toast('Import failed: ' + err.message); }
        });
      };
      rd.readAsText(f);
    });
    ui.$('#rst', el).addEventListener('click', function () {
      ui.confirm('Reset all progress?', '<p>This permanently deletes every attempt, stat, and lesson checkmark in this browser. Export first if you want a backup.</p>', 'Delete everything', true).then(function (ok) {
        if (ok) { CCAR.store.reset(); ui.toast('Progress reset.'); CCAR.views.settings(el); }
      });
    });
  };
})();
