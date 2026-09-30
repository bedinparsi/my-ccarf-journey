// Validates question bank files. Usage: node tools/validate.js [examId]
// Loads js/data/blueprint.js and js/data/exams/*.js in a sandbox and checks schema + coverage.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const ctx = { window: {}, console };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data/blueprint.js'), 'utf8'), ctx, { filename: 'blueprint.js' });

const examDir = path.join(root, 'js/data/exams');
const only = process.argv[2];
const files = fs.readdirSync(examDir).filter(f => f.endsWith('.js') && (!only || f.startsWith(only + '-'))).sort();
let errors = 0;
for (const f of files) {
  try { vm.runInContext(fs.readFileSync(path.join(examDir, f), 'utf8'), ctx, { filename: f }); }
  catch (e) { console.error('PARSE ERROR', f, e.message); errors++; }
}
const C = ctx.CCAR;
const objIds = new Set(C.OBJECTIVES.map(o => o.id));
const seenIds = new Set();
const weak0 = ['O06', 'O08', 'O09', 'O10', 'O13', 'O16', 'O18', 'O19', 'O28'];

for (const form of C.EXAM_FORMS) {
  if (only && form.id !== only) continue;
  const qs = C.exams[form.id] || [];
  const dom = {}, obj = {}, scen = {}, pos = [0, 0, 0, 0, 0, 0];
  let multi = 0, weak = 0, longestCorrect = 0;
  qs.forEach((q, i) => {
    const where = `${form.id}[${i}] ${q.id}`;
    const err = m => { console.error('ERR', where, m); errors++; };
    if (!q.id) err('missing id');
    if (seenIds.has(q.id)) err('duplicate id'); seenIds.add(q.id);
    if (!form.scenarios.includes(q.scenario)) err('scenario not in form: ' + q.scenario);
    if (!/^D[1-5]$/.test(q.domain)) err('bad domain');
    if (!objIds.has(q.obj)) err('bad obj ' + q.obj);
    if (!['single', 'multi'].includes(q.type)) err('bad type');
    if (!Array.isArray(q.options)) { err('no options'); return; }
    if (q.type === 'single' && (q.options.length !== 4 || q.select !== 1 || q.answer.length !== 1)) err('single must have 4 options, select 1');
    if (q.type === 'multi' && (q.options.length < 5 || q.select < 2 || q.answer.length !== q.select)) err('multi must have >=5 options and answer.length === select');
    if (!Array.isArray(q.answer) || q.answer.some(a => a < 0 || a >= q.options.length)) err('answer index out of range');
    if (new Set(q.answer).size !== q.answer.length) err('duplicate answers');
    if (!Array.isArray(q.rationales) || q.rationales.length !== q.options.length) err('rationales length mismatch');
    if (!q.stem || q.stem.length < 60) err('stem too short');
    if (!q.explanation || q.explanation.length < 60) err('explanation too short');
    if (q.options.some(o => /\b(all|none) of the above\b|both [a-d] and|option [a-d]\b/i.test(o))) err('option references other options');
    dom[q.domain] = (dom[q.domain] || 0) + 1;
    obj[q.obj] = (obj[q.obj] || 0) + 1;
    scen[q.scenario] = (scen[q.scenario] || 0) + 1;
    if (q.type === 'multi') multi++;
    if (C.isWeak(q.obj)) weak++;
    if (q.type === 'single') {
      const lens = q.options.map(o => o.length); const max = Math.max(...lens);
      if (lens[q.answer[0]] === max) longestCorrect++;
      pos[q.answer[0]]++;
    }
  });
  console.log(`\n== ${form.id}: ${qs.length} items | multi ${multi} | weak-obj items ${weak} | correct-is-longest ${longestCorrect}`);
  console.log('   scenarios', JSON.stringify(scen));
  console.log('   domains  ', JSON.stringify(dom));
  console.log('   answer position (single)', JSON.stringify(pos.slice(0, 4)));
  const missing0 = weak0.filter(o => !obj[o]);
  console.log('   0%-objective counts', weak0.map(o => `${o}:${obj[o] || 0}`).join(' '), missing0.length ? '(missing: ' + missing0.join(',') + ')' : '');
}
console.log(errors ? `\n${errors} error(s)` : '\nOK');
process.exit(errors ? 1 : 0);
