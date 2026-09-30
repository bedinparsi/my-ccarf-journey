# Architect Handbook: authoring spec (for every handbook chapter)

Audience: a solution architect preparing for the CCAR-F retake (scored 656/720) who wants ONE resource to depend on, for the exam AND real production work. Chapters must be complete, precise, and dense. No filler. Plain, direct sentences. No em dashes (use commas, colons or parentheses). No exclamation marks. No hyperbole.

## Sources (strict)
1. Read `docs/_ref/exam-guide.txt` §6 for the task statement(s) you cover: EVERY "Knowledge of" and "Skills in" bullet must be explicitly taught in your chapter (use the same concrete examples the guide uses: e.g. process_refund blocked until get_customer returns verified ID; $500 refund threshold; 18 vs 4-5 tools; verify_fact; fetch_url→load_document; extract_metadata; analyze_content→extract_web_results; 45+ file migration; 4-hour windows / 30h SLA; 14-file PR; 97% aggregate; etc.). Also read §9 sample questions for style.
2. Facts: use ONLY facts in `docs/_ref/facts.md` and `docs/_ref/handbook-facts.md`, plus general, uncontroversial software-architecture knowledge. Do NOT invent CLI flags, API fields, config keys, numbers, product names or version numbers. If unsure, describe the concept without the specific name.
3. Where exam guide and current docs differ, teach both with a purple callout: `H.box('exam', 'Exam vs current docs:', '...')`. Key divergences: Task tool (exam) = Agent tool (current); /memory (exam) vs /context; skill allowed-tools (exam: restricts; docs: pre-approves, disallowed-tools removes); tool_choice any/forced (exam) vs 400 error on Opus 5.5 / Sonnet 5.5 / Fable 5.1 (use auto + strict tool use or output_config.format; Haiku 4.5 and older still support forced); prefill unsupported on 4.6+; fork_session naming.
4. Existing retake lessons (js/data/lessons/lessons-1..4.js) show the prior treatment. You may read them for consistency; do not edit them. Your chapters must be MORE complete than them and self-contained.

## File format (classic script, no modules)
```js
/* Architect Handbook · Part N (x): <topics>. */
(function () {
  var H = CCAR.hb, D = H.D;

  CCAR.lessons.push({
    id: 'hb-11-agentic-loop', track: 'handbook', part: 'P1', num: '1.1', order: 101, domain: 'D1',
    objs: ['X01'], ts: ['1.1'], minutes: 30,
    title: '...', summary: '... one or two sentences ...',
    body: function () {
      return `
<p>...</p>
${H.table(['Col A', 'Col B'], [['cell', 'cell'], ['cell', 'cell']])}
${D({ w: 760, h: 220, title: '...', nodes: [...], edges: [...], caption: '...' })}
${H.box('rule', 'Title:', 'html')}
${H.check([['Question?', 'Answer html'], ...])}
${H.src([['Doc title', 'https://...'], ...])}`;
    }
  });
})();
```
- Bodies are **template literals** (backticks). Inside them, apostrophes are fine. You MUST escape a literal `${` as `\${` (e.g. `"\${GITHUB_TOKEN}"`) and a literal backtick as `` \` ``. In JSON shown inside `<pre class="code">`, write `\\"` for an escaped quote you want displayed as `\"`.
- Arguments to H.table / H.box / H.check are normal JS single-quoted strings: escape apostrophes as `\'`, or use double-quoted JS strings.
- Escape `<` and `>` that are meant as literal text in code samples: use `&lt;` `&gt;` (e.g. `&lt;session-name&gt;`, arrow functions `=&gt;`).
- `objs` must be IDs from `CCAR.OBJECTIVES` in js/data/blueprint.js (O01–O37, X01–X12) that relate to the chapter (enables the "Drill" button). `ts` = exam task statement IDs covered (e.g. '1.3').

## Helpers (js/data/handbook.js)
- `H.table(headArrayOrNull, rowsArrayOfArrays, extraClass?)` → `<table class="tbl">`.
- `H.box(kind, boldTitle, html)` kinds: `rule` (green: the right pattern), `trap` (red: distractors), `real` (blue: real-world production note), `exam` (purple: exam vs current docs / exam tip), `decision` (orange: decision rule), `weak` (amber).
- `H.check([[q, a], ...])` → "Check yourself" section with collapsible answers. 4–6 questions per chapter, scenario-style, answers explain WHY.
- `H.src([[title, url], ...])` → sources line. Use official Anthropic URLs from facts files (code.claude.com/docs/en/..., platform.claude.com/docs/en/..., anthropic.com/engineering/..., modelcontextprotocol.io/...).
- `D(spec)` → SVG diagram: `{ w: 760, h: <=340, title, nodes: [{id, x, y, w, h, label, sub, kind}], edges: [{from, to, label, dashed, both, kind:'bad', dx, dy}], groups: [{x,y,w,h,label,kind:'soft'|'hard'}], caption: 'html' }`. Node kinds: agent, sub, tool, store, human, bad, good, note. Keep labels short (<= 26 chars; sub <= 36 chars); keep nodes inside w×h; avoid overlapping nodes. 1–2 diagrams per chapter.
- Other HTML available: `<h3>`, `<h4>`, `<ul>`, `<ol class="steps">`, `<pre class="code">`, `<code>`, `<div class="two"><div>..</div><div>..</div></div>` (side by side), `<div class="spectrum"><div class="sp bad">..</div><div class="sp good">..</div><div class="sp bad">..</div></div>`, `<h4 class="bad-h">`, `<h4 class="good-h">`.

## Chapter structure (every chapter)
1. Opening paragraph: what this is, why it matters in production, what the exam probes.
2. Core concepts and mechanics: tables, diagrams, concrete config/code (Agent SDK TypeScript or Python, Claude Code settings/frontmatter/CLI, API JSON, MCP JSON).
3. Every exam-guide Knowledge/Skills bullet for the task statement, taught explicitly (you can use a table "Skill → how to do it → why").
4. Design decisions and trade-offs: an explicit decision table ("If the situation is X → choose Y, because Z; you give up W").
5. Real-world notes (`H.box('real', ...)`): production concerns beyond the exam (cost, observability, security, failure handling, testing/evals).
6. Exam vs current docs note where relevant.
7. Traps (`H.box('trap', ...)`): the distractor patterns and why each is wrong.
8. A "Worked scenario" `<h3>` with a realistic situation, the reasoning and the answer.
9. `H.check([...])` 4–6 questions.
10. `H.src([...])`.
Target size per chapter: 9–16 KB of HTML. Dense tables beat long prose.

## Writing procedure (important: avoid one giant write)
1. `fs_write` the file with the header comment, `(function () {`, the `var H...` line, and the FIRST chapter's full `CCAR.lessons.push({...});`.
2. `fs_append` each further chapter as its own `CCAR.lessons.push({...});` block.
3. `fs_append` the closing `})();`.
4. Run `node --check <file>` and `node tools/check-lessons.js` (it prints WARN lines for your chapter ids if HTML tags are unbalanced, objectives unknown, or template expressions leak). Fix until your chapters produce no WARN/RENDER FAIL/LOAD FAIL lines (ignore MISSING lines for other parts' files not yet written, and ignore WARN lines for chapters that are not yours).
5. Do not edit any other file.
