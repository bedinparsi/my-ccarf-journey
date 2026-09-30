/* Dependency-free SVG charts and architecture diagrams (works offline from file://). */
(function () {
  var esc = function (s) { return CCAR.ui.esc(s); };
  function color(p) {
    if (p === null || p === undefined) return 'var(--muted-2)';
    return p >= 80 ? 'var(--good)' : p >= 70 ? 'var(--ok)' : p >= 50 ? 'var(--warn)' : 'var(--bad)';
  }

  /* Grouped horizontal bars: rows [{label, values:[{v, name, color}]}], values 0-100 */
  function hbars(rows, opts) {
    opts = opts || {};
    var labelW = opts.labelW || 250, barW = opts.barW || 380, rowH = opts.rowH || 34, pad = 8;
    var series = rows[0] ? rows[0].values.length : 1;
    var h = rows.length * rowH + 34;
    var w = labelW + barW + 60;
    var s = '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + esc(opts.title || 'Bar chart') + '">';
    // gridlines
    [0, 25, 50, 72, 100].forEach(function (g) {
      var x = labelW + barW * g / 100;
      s += '<line x1="' + x + '" y1="4" x2="' + x + '" y2="' + (h - 24) + '" class="' + (g === 72 ? 'grid pass' : 'grid') + '"/>';
      s += '<text x="' + x + '" y="' + (h - 8) + '" class="axis" text-anchor="middle">' + (g === 72 ? '72 (pass)' : g + '%') + '</text>';
    });
    rows.forEach(function (r, i) {
      var y = i * rowH + 6;
      s += '<text x="' + (labelW - 8) + '" y="' + (y + rowH / 2) + '" class="lbl" text-anchor="end" dominant-baseline="middle">' + esc(r.label) + '</text>';
      var bh = (rowH - pad) / series;
      r.values.forEach(function (v, j) {
        var val = v.v === null || v.v === undefined ? 0 : v.v;
        var bw = Math.max(1, barW * val / 100);
        var by = y + j * bh;
        s += '<rect x="' + labelW + '" y="' + by + '" width="' + bw + '" height="' + (bh - 2) + '" rx="3" fill="' + (v.color || color(val)) + '"><title>' + esc((v.name ? v.name + ': ' : '') + (v.v === null ? 'n/a' : val + '%')) + '</title></rect>';
        s += '<text x="' + (labelW + bw + 4) + '" y="' + (by + bh / 2) + '" class="val" dominant-baseline="middle">' + (v.v === null || v.v === undefined ? '–' : val + '%') + '</text>';
      });
    });
    return s + '</svg>';
  }

  /* Radar chart for 5 domains. series: [{name, color, values:[0-100 x n]}] */
  function radar(labels, series, opts) {
    opts = opts || {};
    var size = opts.size || 360, c = size / 2, r = size / 2 - 70, n = labels.length;
    var pt = function (i, v) { var a = -Math.PI / 2 + i * 2 * Math.PI / n; return [c + Math.cos(a) * r * v / 100, c + Math.sin(a) * r * v / 100]; };
    var s = '<svg class="chart radar" viewBox="0 0 ' + size + ' ' + size + '" role="img" aria-label="Domain radar chart">';
    [25, 50, 72, 100].forEach(function (lv) {
      var pts = labels.map(function (_, i) { return pt(i, lv).join(','); }).join(' ');
      s += '<polygon points="' + pts + '" class="' + (lv === 72 ? 'ring pass' : 'ring') + '"/>';
    });
    labels.forEach(function (l, i) {
      var p = pt(i, 100), q = pt(i, 122);
      s += '<line x1="' + c + '" y1="' + c + '" x2="' + p[0] + '" y2="' + p[1] + '" class="spoke"/>';
      s += '<text x="' + q[0] + '" y="' + q[1] + '" class="lbl" text-anchor="middle" dominant-baseline="middle">' + esc(l) + '</text>';
    });
    series.forEach(function (se) {
      var pts = se.values.map(function (v, i) { return pt(i, v || 0).join(','); }).join(' ');
      s += '<polygon points="' + pts + '" fill="' + se.color + '" fill-opacity="0.18" stroke="' + se.color + '" stroke-width="2"><title>' + esc(se.name) + '</title></polygon>';
      se.values.forEach(function (v, i) { var p = pt(i, v || 0); s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3" fill="' + se.color + '"/>'; });
    });
    return s + '</svg>';
  }

  /* Score history line chart. points: [{x:label, y:scaled 100-1000}] */
  function line(points, opts) {
    opts = opts || {};
    var w = 640, h = 240, l = 46, b = 30, t = 12, rgt = 12;
    var min = 100, max = 1000;
    var X = function (i) { return l + (points.length <= 1 ? (w - l - rgt) / 2 : i * (w - l - rgt) / (points.length - 1)); };
    var Y = function (v) { return t + (h - t - b) * (1 - (v - min) / (max - min)); };
    var s = '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="Score history">';
    [100, 400, 720, 1000].forEach(function (g) {
      s += '<line x1="' + l + '" x2="' + (w - rgt) + '" y1="' + Y(g) + '" y2="' + Y(g) + '" class="' + (g === 720 ? 'grid pass' : 'grid') + '"/>';
      s += '<text x="' + (l - 6) + '" y="' + Y(g) + '" class="axis" text-anchor="end" dominant-baseline="middle">' + g + '</text>';
    });
    if (points.length) {
      s += '<polyline fill="none" stroke="var(--accent)" stroke-width="2.5" points="' + points.map(function (p, i) { return X(i) + ',' + Y(p.y); }).join(' ') + '"/>';
      points.forEach(function (p, i) {
        s += '<circle cx="' + X(i) + '" cy="' + Y(p.y) + '" r="4.5" fill="' + (p.y >= 720 ? 'var(--good)' : 'var(--bad)') + '"><title>' + esc(p.x + ': ' + p.y) + '</title></circle>';
        s += '<text x="' + X(i) + '" y="' + (h - 10) + '" class="axis" text-anchor="middle">' + esc(p.short || String(i + 1)) + '</text>';
      });
    }
    return s + '</svg>';
  }

  /* Score gauge (semi-circle) for scaled score */
  function gauge(score, opts) {
    opts = opts || {};
    var w = 240, h = 140, c = 120, r = 95;
    var frac = Math.max(0, Math.min(1, (score - 100) / 900));
    var passFrac = (720 - 100) / 900;
    var arc = function (f0, f1, cls) {
      var a0 = Math.PI * (1 - f0), a1 = Math.PI * (1 - f1);
      var x0 = c + r * Math.cos(a0), y0 = 125 - r * Math.sin(a0), x1 = c + r * Math.cos(a1), y1 = 125 - r * Math.sin(a1);
      return '<path d="M' + x0 + ' ' + y0 + ' A' + r + ' ' + r + ' 0 0 1 ' + x1 + ' ' + y1 + '" class="' + cls + '"/>';
    };
    var s = '<svg class="chart gauge" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="Scaled score ' + score + '">';
    s += arc(0, 1, 'g-track') + arc(0, frac, score >= 720 ? 'g-fill good' : 'g-fill bad');
    var pa = Math.PI * (1 - passFrac);
    s += '<line x1="' + (c + (r - 14) * Math.cos(pa)) + '" y1="' + (125 - (r - 14) * Math.sin(pa)) + '" x2="' + (c + (r + 12) * Math.cos(pa)) + '" y2="' + (125 - (r + 12) * Math.sin(pa)) + '" class="g-pass"/>';
    s += '<text x="' + c + '" y="112" text-anchor="middle" class="g-num">' + score + '</text>';
    s += '<text x="' + c + '" y="134" text-anchor="middle" class="axis">' + esc(opts.caption || 'pass line at 720') + '</text>';
    return s + '</svg>';
  }

  /* Architecture diagram from a node/edge spec.
     spec = { w, h, title, nodes:[{id,x,y,w,h,label,sub,kind}], edges:[{from,to,label,dashed,kind}] }
     kind: 'agent' | 'sub' | 'tool' | 'store' | 'human' | 'bad' | 'good' | 'note' */
  function diagram(spec) {
    var nodes = {};
    spec.nodes.forEach(function (n) { n.w = n.w || 150; n.h = n.h || 52; nodes[n.id] = n; });
    function border(n, tx, ty) {
      var cx = n.x + n.w / 2, cy = n.y + n.h / 2, dx = tx - cx, dy = ty - cy;
      if (dx === 0 && dy === 0) return [cx, cy];
      var sx = (n.w / 2) / Math.abs(dx || 1e-9), sy = (n.h / 2) / Math.abs(dy || 1e-9), k = Math.min(sx, sy);
      return [cx + dx * k, cy + dy * k];
    }
    var id = 'm' + Math.random().toString(36).slice(2, 8);
    var s = '<figure class="diagram"><svg viewBox="0 0 ' + spec.w + ' ' + spec.h + '" role="img" aria-label="' + esc(spec.title || 'Architecture diagram') + '">';
    s += '<defs><marker id="' + id + '" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="arrowhead"/></marker></defs>';
    (spec.groups || []).forEach(function (g) {
      s += '<rect x="' + g.x + '" y="' + g.y + '" width="' + g.w + '" height="' + g.h + '" rx="10" class="grp ' + (g.kind || '') + '"/>';
      s += '<text x="' + (g.x + 10) + '" y="' + (g.y + 16) + '" class="grp-lbl">' + esc(g.label) + '</text>';
    });
    (spec.edges || []).forEach(function (e) {
      var a = nodes[e.from], b = nodes[e.to];
      var p0 = border(a, b.x + b.w / 2, b.y + b.h / 2), p1 = border(b, a.x + a.w / 2, a.y + a.h / 2);
      s += '<line x1="' + p0[0] + '" y1="' + p0[1] + '" x2="' + p1[0] + '" y2="' + p1[1] + '" class="edge ' + (e.dashed ? 'dashed ' : '') + (e.kind || '') + '" marker-end="url(#' + id + ')"' + (e.both ? ' marker-start="url(#' + id + ')"' : '') + '/>';
      if (e.label) {
        var mx = (p0[0] + p1[0]) / 2 + (e.dx || 0), my = (p0[1] + p1[1]) / 2 + (e.dy || -6);
        s += '<text x="' + mx + '" y="' + my + '" class="edge-lbl" text-anchor="middle">' + esc(e.label) + '</text>';
      }
    });
    spec.nodes.forEach(function (n) {
      s += '<g class="node ' + (n.kind || 'agent') + '"><rect x="' + n.x + '" y="' + n.y + '" width="' + n.w + '" height="' + n.h + '" rx="' + (n.kind === 'store' ? 4 : 9) + '"/>';
      var lines = String(n.label).split('\n');
      var baseY = n.y + n.h / 2 - (lines.length - 1) * 8 - (n.sub ? 7 : 0);
      lines.forEach(function (ln, i) { s += '<text x="' + (n.x + n.w / 2) + '" y="' + (baseY + i * 16) + '" class="n-lbl" text-anchor="middle" dominant-baseline="middle">' + esc(ln) + '</text>'; });
      if (n.sub) s += '<text x="' + (n.x + n.w / 2) + '" y="' + (baseY + lines.length * 16 + 1) + '" class="n-sub" text-anchor="middle" dominant-baseline="middle">' + esc(n.sub) + '</text>';
      s += '</g>';
    });
    s += '</svg>' + (spec.caption ? '<figcaption>' + spec.caption + '</figcaption>' : '') + '</figure>';
    return s;
  }

  CCAR.charts = { hbars: hbars, radar: radar, line: line, gauge: gauge, diagram: diagram, color: color };
})();
