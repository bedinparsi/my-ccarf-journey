/* Small DOM + formatting helpers shared by all views. */
(function () {
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function toast(msg, ms) {
    var el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { el.classList.add('show'); }, 10);
    setTimeout(function () { el.classList.remove('show'); setTimeout(function () { el.remove(); }, 300); }, ms || 2600);
  }

  /* Accessible confirm dialog built on <dialog>. Returns a Promise<boolean>. */
  function confirmDialog(title, body, okLabel, danger) {
    return new Promise(function (resolve) {
      var d = document.createElement('dialog');
      d.className = 'dialog';
      d.innerHTML = '<h2>' + esc(title) + '</h2><div class="dialog-body">' + body + '</div>' +
        '<div class="dialog-actions"><button class="btn ghost" value="cancel">Cancel</button>' +
        '<button class="btn ' + (danger ? 'danger' : 'primary') + '" value="ok">' + esc(okLabel || 'OK') + '</button></div>';
      document.body.appendChild(d);
      d.addEventListener('click', function (e) {
        if (e.target.tagName === 'BUTTON') { d.close(e.target.value); }
      });
      d.addEventListener('close', function () { resolve(d.returnValue === 'ok'); d.remove(); });
      d.showModal();
      var ok = d.querySelector('button[value="ok"]'); ok && ok.focus();
    });
  }

  function pct(n, d) { return d ? Math.round((n / d) * 100) : 0; }
  function fmtTime(sec) {
    sec = Math.max(0, Math.round(sec));
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0');
  }
  function fmtDate(ts) {
    return new Date(ts).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  function scoreClass(p) { return p >= 80 ? 'good' : p >= 70 ? 'ok' : p >= 50 ? 'warn' : 'bad'; }

  /* Seeded PRNG so an attempt's shuffles are stable across reloads. */
  function rng(seed) {
    var s = seed >>> 0;
    return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function shuffle(arr, rand) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rand() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  CCAR.ui = { esc: esc, $: $, $all: $all, toast: toast, confirm: confirmDialog, pct: pct, fmtTime: fmtTime, fmtDate: fmtDate, scoreClass: scoreClass, rng: rng, shuffle: shuffle };
})();
