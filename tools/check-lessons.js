/* Renders every lesson body in Node (no browser) and reports errors, size, and basic HTML sanity.
   Usage: node tools/check-lessons.js [--list] */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1])
  .filter(s => /data\/|core\/(ui|charts)\.js/.test(s) && !/exams\//.test(s));
const ctx = { console, document: { addEventListener() {}, querySelector() { return null; } }, localStorage: { getItem() { return null; }, setItem() {} } };
ctx.window = ctx; vm.createContext(ctx);
let failed = 0;
for (const s of scripts) {
  const p = path.join(root, s);
  if (!fs.existsSync(p)) { console.log('MISSING', s); failed++; continue; }
  try { vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: s }); } catch (e) { console.log('LOAD FAIL', s, e.message); failed++; }
}
const C = ctx.CCAR, ids = new Set(); let total = 0;
for (const l of C.lessons) {
  if (ids.has(l.id)) { console.log('DUPLICATE id', l.id); failed++; }
  ids.add(l.id);
  let out;
  try { out = l.body(); } catch (e) { console.log('RENDER FAIL', l.id, e.message); failed++; continue; }
  total += out.length;
  const probs = [];
  if (/\$\{\s*(H\.|D\(|[a-z(])/.test(out)) probs.push('unrendered ${expr}');
  if (/undefined|\[object Object\]/.test(out.replace(/<code>undefined<\/code>/g, ''))) probs.push('undefined/[object]');
  for (const t of ['table', 'pre', 'details', 'ul', 'ol', 'div']) {
    const o = (out.match(new RegExp('<' + t + '[\\s>]', 'g')) || []).length, c = (out.match(new RegExp('</' + t + '>', 'g')) || []).length;
    if (o !== c) probs.push(`<${t}> ${o} open / ${c} close`);
  }
  (l.objs || []).forEach(o => { if (!C.objectiveById(o)) probs.push('unknown obj ' + o); });
  (l.ts || []).forEach(t => { if (C.TASK_STATEMENTS && !C.TASK_STATEMENTS.find(x => x.id === t)) probs.push('unknown ts ' + t); });
  if (probs.length) { console.log('WARN', l.id, probs.join('; ')); failed++; }
  if (process.argv.includes('--list')) console.log((l.track || 'retake').padEnd(9), (l.num || '').padEnd(5), l.id.padEnd(34), String(Math.round(out.length / 1024)).padStart(4) + 'KB', l.minutes + 'min');
}
if (C.TASK_STATEMENTS) {
  const hb = C.lessons.filter(l => l.track === 'handbook');
  const missing = C.TASK_STATEMENTS.filter(t => !hb.some(l => (l.ts || []).includes(t.id)));
  console.log(`handbook chapters: ${hb.length}; task statements without a handbook chapter: ${missing.map(t => t.id).join(', ') || 'none'}`);
}
console.log(`lessons: ${C.lessons.length}, total HTML ${Math.round(total / 1024)} KB`);
console.log(failed ? `FAILED (${failed})` : 'OK');
process.exit(failed ? 1 : 0);
