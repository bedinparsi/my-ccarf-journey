// Validates question bank files.
// Usage:
//   node tools/validate.js [examId]           all forms (or one form): schema + coverage stats
//   node tools/validate.js --file <path.js>   item-level checks for a single exam file only
// Loads js/data/blueprint.js and the exam files in a sandbox.
// Forms with `minStemWords` (long-scenario forms such as exam6) get extra checks: stem prose length
// (words outside <pre> blocks), a `signals` field, fuller explanation and rationales, no em dashes,
// plain-text trap labels, and ids of the form e<N>-S<n>-NN matching the item's scenario.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const ctx = { console };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data/blueprint.js'), 'utf8'), ctx, { filename: 'blueprint.js' });

const args = process.argv.slice(2);
let only = null, fileArg = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--file') fileArg = args[++i];
  else only = args[i];
}

const examDir = path.join(root, 'js/data/exams');
const files = fileArg
  ? [path.resolve(fileArg)]
  : fs.readdirSync(examDir).filter(f => f.endsWith('.js') && (!only || f.startsWith(only + '-'))).sort().map(f => path.join(examDir, f));
let errors = 0, warnings = 0;
for (const f of files) {
  try { vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: path.basename(f) }); }
  catch (e) { console.error('PARSE ERROR', path.basename(f), e.message); errors++; }
}
const C = ctx.CCAR;
const objIds = new Set(C.OBJECTIVES.map(o => o.id));
const seenIds = new Set();
const weak0 = ['O06', 'O08', 'O09', 'O10', 'O13', 'O16', 'O18', 'O19', 'O28'];
const prose = s => String(s || '').replace(/<pre[\s\S]*?<\/pre>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ');
const words = s => prose(s).split(/\s+/).filter(Boolean).length;
const avg = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0;

for (const form of C.EXAM_FORMS) {
  if (only && form.id !== only) continue;
  const qs = C.exams[form.id] || [];
  if (fileArg && !qs.length) continue;
  const long = !!form.minStemWords;
  const dom = {}, obj = {}, scen = {}, pos = [0, 0, 0, 0, 0, 0];
  const stemW = [], optW = [];
  let multi = 0, weak = 0, longestCorrect = 0, singles = 0;
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
    if (long) {
      const m = /^e\d+-(S[1-6])-\d{2}$/.exec(q.id || '');
      if (!m || m[1] !== q.scenario) err('id must look like e6-' + q.scenario + '-NN');
      const sw = words(q.stem);
      if (sw < form.minStemWords) err(`stem prose is ${sw} words (< ${form.minStemWords})`);
      if (!q.signals || String(q.signals).length < 60) err('missing or short signals');
      if (String(q.explanation || '').length < 350) err('explanation shorter than 350 characters');
      if ((q.rationales || []).some(r => String(r).length < 50)) err('a rationale is shorter than 50 characters');
      const texts = [q.stem, q.explanation, q.signals, q.trap].concat(q.options, q.rationales || []);
      if (texts.some(t => /\u2014/.test(String(t || '')))) err('em dash found (use commas, colons or parentheses)');
      if (/[<>]/.test(String(q.trap || ''))) err('trap must be plain text (it is HTML-escaped when shown)');
      if (!q.trap) err('missing trap');
    }
    stemW.push(words(q.stem));
    optW.push(avg(q.options.map(words)));
    dom[q.domain] = (dom[q.domain] || 0) + 1;
    obj[q.obj] = (obj[q.obj] || 0) + 1;
    scen[q.scenario] = (scen[q.scenario] || 0) + 1;
    if (q.type === 'multi') multi++;
    if (C.isWeak(q.obj)) weak++;
    if (q.type === 'single') {
      singles++;
      const lens = q.options.map(o => o.length); const max = Math.max(...lens);
      if (lens[q.answer[0]] === max) longestCorrect++;
      pos[q.answer[0]]++;
    }
  });
  console.log(`\n== ${form.id}${fileArg ? ' (' + path.basename(fileArg) + ')' : ''}: ${qs.length} items | multi ${multi} | weak-obj items ${weak} | correct-is-longest ${longestCorrect}/${singles}`);
  console.log('   scenarios', JSON.stringify(scen));
  console.log('   domains  ', JSON.stringify(dom));
  console.log('   answer position (single)', JSON.stringify(pos.slice(0, 4)));
  console.log(`   stem prose words avg ${avg(stemW)} (min ${Math.min(...stemW)}, max ${Math.max(...stemW)}) | option words avg ${avg(optW)}`);
  if (!fileArg) {
    const missing0 = weak0.filter(o => !obj[o]);
    console.log('   0%-objective counts', weak0.map(o => `${o}:${obj[o] || 0}`).join(' '), missing0.length ? '(missing: ' + missing0.join(',') + ')' : '');
  }
  if (long && singles && longestCorrect / singles > 0.3) {
    console.warn(`WARN ${form.id}: the keyed option is the longest in ${longestCorrect} of ${singles} single-answer items (keep it at or under 30%)`);
    warnings++;
  }
}
console.log(errors ? `\n${errors} error(s)` : `\nOK${warnings ? ' (' + warnings + ' warning(s))' : ''}`);
process.exit(errors ? 1 : 0);
