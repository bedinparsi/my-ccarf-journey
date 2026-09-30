/* Local persistence (localStorage). Everything lives under one versioned key so it can be exported/imported. */
(function () {
  var KEY = 'ccarf.progress.v1';
  var state = null;

  function blank() {
    return {
      version: 1,
      createdAt: Date.now(),
      attempts: {},      // attemptId -> attempt
      qstats: {},        // qid -> { seen, correct, lastCorrect, lastAt, wrongStreak }
      lessonsDone: {},   // lessonId -> timestamp
      cards: {},         // flashcard id -> { known: bool, at }
      settings: { examFeedback: 'end' }
    };
  }

  function load() {
    if (state) return state;
    try {
      var raw = localStorage.getItem(KEY);
      state = raw ? JSON.parse(raw) : blank();
      var b = blank();
      Object.keys(b).forEach(function (k) { if (state[k] === undefined) state[k] = b[k]; });
    } catch (e) {
      console.warn('Progress could not be read; starting fresh.', e);
      state = blank();
    }
    return state;
  }

  var saveTimer = null;
  function save(immediate) {
    if (!state) return;
    var write = function () {
      try { localStorage.setItem(KEY, JSON.stringify(state)); }
      catch (e) { console.error('Could not save progress', e); CCAR.ui && CCAR.ui.toast('Could not save progress: storage is full or blocked.'); }
    };
    if (immediate) { clearTimeout(saveTimer); write(); return; }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(write, 250);
  }

  function exportJSON() { return JSON.stringify(load(), null, 2); }

  function importJSON(text) {
    var data = JSON.parse(text);
    if (!data || data.version !== 1 || typeof data.attempts !== 'object') throw new Error('Not a CCAR-F progress file.');
    state = data;
    save(true);
  }

  function reset() { state = blank(); save(true); }

  window.addEventListener('beforeunload', function () { save(true); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) save(true); });

  CCAR.store = { load: load, save: save, exportJSON: exportJSON, importJSON: importJSON, reset: reset, KEY: KEY };
})();
