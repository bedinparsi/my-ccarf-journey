/* Architect Handbook · Part 4 (a): explicit criteria (4.1), few-shot prompting (4.2), structured output with tool use and JSON schemas (4.3). */
(function () {
  var H = CCAR.hb, D = H.D;

  /* ------------------------------------------------------------------ 4.1 */
  CCAR.lessons.push({
    id: 'hb-41-explicit-criteria', track: 'handbook', part: 'P4', num: '4.1', order: 401, domain: 'D4',
    objs: ['O30', 'O31'], ts: ['4.1'], minutes: 25,
    title: 'Explicit criteria for precision and fewer false positives',
    summary: 'Replace vague and confidence-based instructions with categorical report/skip criteria, severity definitions backed by code examples, and project conventions as persistent context, then measure precision from developer dismissals.',
    body: function () {
      return `
<p>A review or classification prompt is a specification. When the specification is vague, Claude fills the gaps with its own reasonable but inconsistent judgment, and the result is findings developers did not want. In production this shows up as a false-positive problem: developers stop reading the bot's comments, including the correct ones. The exam probes three ideas: explicit categorical criteria beat vague instructions, "be conservative" and "only high-confidence findings" do not improve precision, and a noisy category damages trust in every category.</p>

<h3>Vague vs explicit criteria</h3>
${H.table(['Vague instruction', 'Explicit criterion', 'What changes'], [
  ['"Check that comments are accurate"', '"Flag a comment only when the behavior it claims contradicts what the code actually does (for example the docstring says it returns null on miss, the code throws)"', 'Stale-but-harmless wording, tone and grammar are out of scope; contradictions are in'],
  ['"Look for security issues"', '"Report: user input reaching SQL, shell, file paths or HTML without parameterization or escaping; secrets in code; missing authorization checks on handlers in <code>routes/</code>"', 'Claude checks a defined list instead of speculating about theoretical risks'],
  ['"Point out performance problems"', '"Report only: queries inside loops over request data, unbounded reads into memory, N+1 ORM access. Skip micro-optimizations"', 'Removes low-value "consider caching this" comments'],
  ['"Be thorough"', '"Review every changed function against the report list below; for each finding give location, issue, severity, suggested fix"', 'Consistency and a checkable output contract']
])}
<p>The principle from the prompting docs: be clear and direct, as if briefing a brilliant new employee with no context, and give the reason behind a rule so Claude can apply it to cases the rule does not name. "Flag X only when Y" works because Y is observable in the code.</p>

<h3>Why "be conservative" and "high-confidence only" fail</h3>
<ul>
<li><b>They do not say what to skip.</b> The model has no definition of which findings are unwanted, so it still reports the same categories, sometimes with softer wording.</li>
<li><b>Self-assessed confidence is poorly calibrated.</b> A style nit can be reported with high confidence; a real race condition can be reported with hedging. Filtering on the model's own confidence removes the wrong things.</li>
<li><b>They move the threshold, not the boundary.</b> Precision improves when a category is defined (report: X, Y; skip: Z), not when the model is told to be more careful about everything.</li>
<li><b>Aggressive emphasis overtriggers.</b> Current models follow instructions precisely; "CRITICAL: only report if you are SURE" tends to produce erratic suppression rather than a clean boundary.</li></ul>
${H.box('rule', 'The pattern:', 'Define categories to <b>report</b> (bugs, security) and categories to <b>skip</b> (minor style, patterns that are local conventions), with a short reason for each. Precision comes from categorical criteria, not from confidence-based filtering.')}

<h3>A report/skip specification</h3>
<pre class="code">&lt;review_criteria&gt;
REPORT (these block or delay a merge):
- Correctness bugs: wrong condition, off-by-one, unhandled null/None on a path the code can reach,
  wrong return type, resource not released.
- Security: untrusted input reaching SQL/shell/file paths/HTML without parameterization or escaping,
  hard-coded secrets, handlers under routes/ without an authorization check.
- Comment contradictions: a comment or docstring claims behavior the code does not have.
- Data loss: writes without transaction where the surrounding module uses transactions.

SKIP (do not comment, even if you would do it differently):
- Formatting, naming, import order (the linter owns these).
- Minor style preferences and "consider refactoring" suggestions.
- Patterns listed in &lt;accepted_patterns&gt; below, and patterns used consistently in the same file
  (local conventions).
- Theoretical issues that need an input the code cannot receive (explain in one line if unsure).

If a finding does not clearly fit a REPORT category, output it with category "unclear" and a one-line
reason instead of choosing a severity. Do not invent a new category.
&lt;/review_criteria&gt;</pre>

<h3>False positives and developer trust</h3>
${D({ w: 760, h: 230, title: 'One noisy category undermines all categories',
  nodes: [
    { id: 'sec', x: 20, y: 20, w: 200, h: 50, label: 'Security findings', sub: 'precision high', kind: 'good' },
    { id: 'bug', x: 20, y: 90, w: 200, h: 50, label: 'Bug findings', sub: 'precision high', kind: 'good' },
    { id: 'sty', x: 20, y: 160, w: 200, h: 50, label: 'Style / naming findings', sub: 'most are dismissed', kind: 'bad' },
    { id: 'pr', x: 290, y: 90, w: 180, h: 50, label: 'PR comment stream', sub: 'developer sees one list', kind: 'agent' },
    { id: 'dev', x: 540, y: 20, w: 200, h: 50, label: 'Developer habit', sub: 'skims, then ignores the bot', kind: 'human' },
    { id: 'miss', x: 540, y: 140, w: 200, h: 60, label: 'Real SQL injection missed', sub: 'correct finding not read', kind: 'bad' }
  ],
  edges: [{ from: 'sec', to: 'pr' }, { from: 'bug', to: 'pr' }, { from: 'sty', to: 'pr', kind: 'bad' }, { from: 'pr', to: 'dev' }, { from: 'dev', to: 'miss', kind: 'bad' }],
  caption: 'Developers judge the tool as a whole. A category with a high false-positive rate teaches them to dismiss every comment, including accurate security and bug findings. Precision per category is a product requirement.' })}
<p>The fix sequence the exam expects:</p>
<ol class="steps">
<li><b>Measure per category.</b> Track which categories developers dismiss or resolve.</li>
<li><b>Temporarily disable the high false-positive categories</b> (move them to SKIP) so the remaining comments are trustworthy again.</li>
<li><b>Improve those categories offline:</b> write explicit criteria, add accepted-pattern examples (4.2), and test against labeled PRs.</li>
<li><b>Re-enable</b> a category only when its measured precision meets your bar.</li></ol>

<h3>Severity definitions with concrete code examples</h3>
<p>"Rate severity as critical, high, medium or low" gives inconsistent labels, because each run invents its own scale. Define each level by consequence and anchor it with a code example, so the model compares new findings to concrete references.</p>
${H.table(['Severity', 'Definition (observable)', 'Anchor example'], [
  ['<b>critical</b>', 'Exploitable security flaw or data loss on a reachable path; must block merge', '<code>db.query("SELECT * FROM users WHERE id = " + req.params.id)</code> (SQL built from request input)'],
  ['<b>high</b>', 'Incorrect behavior users will hit in normal use', '<code>for (i = 0; i &lt;= items.length; i++)</code> reading past the end; <code>if (user.role = "admin")</code>'],
  ['<b>medium</b>', 'Incorrect in edge cases or misleading to maintainers', 'Docstring says "returns None when not found" but the function raises <code>KeyError</code>; missing handling for an empty list that callers can pass'],
  ['<b>low</b>', 'Real but minor: no user impact, worth fixing when nearby', 'Unused parameter kept after a refactor; log message with the wrong function name']
])}
<p class="small muted">Style and naming have no severity level at all: they are in SKIP. A finding that fits no level goes to "unclear".</p>

<h3>Project conventions and accepted patterns as persistent context</h3>
<p>Many false positives are correct by general standards and wrong for this codebase: a custom error wrapper that looks like swallowed exceptions, a deliberate <code>any</code> at an API boundary, raw SQL in a migration folder. Put these in <b>persistent context</b> that every review run loads, not in a one-off prompt.</p>
${H.table(['Where', 'What to put there', 'Why'], [
  ['Project <code>CLAUDE.md</code> (committed)', 'Review standards, report/skip lists, accepted patterns with a one-line reason', 'Loaded in every session, including <code>claude -p</code> in CI and the GitHub Action, where CLAUDE.md defines review standards'],
  ['<code>.claude/rules/*.md</code> with <code>paths</code>', 'Conventions that apply only to some paths (for example <code>migrations/**</code> may use raw SQL)', 'Loaded only when matching files are read, so other reviews stay lean'],
  ['Review prompt / system prompt of a custom reviewer', 'Output contract, severity definitions, "unclear" rule', 'Stable prefix, cacheable across PRs'],
  ['Few-shot examples (4.2)', 'Acceptable pattern vs genuine issue pairs', 'Teaches the boundary so it generalizes to new code']
])}
<pre class="code">## Code review standards (CLAUDE.md excerpt)
Accepted patterns (do not flag):
- errors are wrapped with wrapErr(err, ctx) and re-thrown; this is not swallowing.
- services/legacy/* uses callbacks; do not suggest async/await there.
- migrations/* uses raw SQL by design; still flag string-concatenated user input.
Always report: missing authz check in routes/*, secrets in code, unparameterized SQL outside migrations.</pre>

<h3>Inclusion and exclusion boundaries with an "unclear" fallback</h3>
<p>Every criterion needs both sides: what is in, what is out, and what to do at the edge. Without an edge rule, borderline cases are forced into a severity and show up as noise. With an explicit <code>"unclear"</code> category, you can route them to a lighter channel (a summary note rather than an inline comment) and learn from them.</p>

<h3>Before and after</h3>
<div class="two"><div><h4 class="bad-h">Before</h4><pre class="code">Review this PR. Be conservative and only
report high-confidence issues. Check that
comments are accurate and flag anything
that could be a problem.</pre></div>
<div><h4 class="good-h">After</h4><pre class="code">&lt;review_criteria&gt; REPORT / SKIP lists &lt;/review_criteria&gt;
&lt;severity&gt; 4 levels, each with a code anchor &lt;/severity&gt;
&lt;accepted_patterns&gt; from CLAUDE.md &lt;/accepted_patterns&gt;
For each finding output: location, category,
severity, issue, suggested_fix, detected_pattern.
Borderline: category "unclear" + one-line reason.</pre></div></div>

<h3>Measuring precision</h3>
<ul>
<li><b>Dismissal tracking:</b> record for every finding whether the developer resolved, dismissed or ignored it. Precision per category = resolved / (resolved + dismissed).</li>
<li><b><code>detected_pattern</code> field</b> (links to 4.4): each finding names the code construct that triggered it (for example <code>"string-concat-sql"</code>, <code>"catch-and-rethrow-wrapper"</code>). Grouping dismissals by pattern shows exactly which construct to add to accepted patterns or to fix in the criteria.</li>
<li><b>Labeled PR set:</b> keep 20–50 real PRs with known issues and known non-issues (should-flag and should-not-flag cases) and re-run after every prompt change, so a precision gain does not quietly cost recall.</li></ul>

<h3>Every exam skill, explicitly</h3>
${H.table(['Skill (4.1)', 'How', 'Why'], [
  ['Explicit criteria over vague instructions', '"Flag only when claimed behavior contradicts code"', 'Observable condition, consistent across runs'],
  ['Categorical report/skip lists', 'Report bugs and security; skip minor style and local patterns', 'Confidence filtering does not define what is unwanted'],
  ['Temporarily disable high-FP categories', 'Move the category to SKIP while improving its criteria', 'Restores trust in the accurate categories now'],
  ['Severity with code examples', 'Each level: definition plus anchor snippet', 'Consistent classification instead of per-run scales'],
  ['Conventions as persistent context', 'CLAUDE.md / path rules with accepted patterns', 'Every run, every reviewer sees the same standards']
])}

<h3>Design decisions</h3>
${H.table(['If the situation is', 'Choose', 'Because', 'You give up'], [
  ['One category dominates dismissals', 'Disable it now, fix offline, re-enable on measured precision', 'Trust recovers immediately', 'Temporary recall in that category'],
  ['Findings are right in general but wrong for this repo', 'Accepted patterns in CLAUDE.md or path-scoped rules', 'Persistent, shared, versioned', 'Some context tokens every run'],
  ['Severity labels differ between runs', 'Severity definitions with code anchors', 'Comparison to references is stable', 'Prompt length'],
  ['Boundary cases keep flipping', 'Explicit "unclear" category routed to a summary', 'Keeps noise out of inline comments', 'A second channel to review'],
  ['Criteria are explicit but output format still varies', 'Add few-shot examples (4.2)', 'Examples fix format and edge handling', 'Tokens (cacheable)']
])}

${H.box('real', 'Real-world note:', 'Treat review precision like any product metric: dashboard dismissal rate per category and per <code>detected_pattern</code>, alert when it rises, and version the criteria in git so you can correlate changes. Keep inline comments for REPORT findings only; put low and unclear items in a single collapsible summary to protect attention.')}
${H.box('exam', 'Exam tip:', 'When a stem says developers ignore the bot or dismiss most comments, the answer is categorical criteria and/or temporarily disabling the noisy category, not "tell it to be more conservative", not a confidence threshold, and not a second model to filter results as a first step.')}
${H.box('trap', 'Traps:', '"Only report findings with confidence above 8/10" (self-confidence is poorly calibrated); "be conservative" (no boundary); keeping the noisy category on "because some findings are real" (it poisons the rest); fixing false positives by adding more severity levels; putting accepted patterns in one engineer\'s personal settings instead of the committed project config; "CRITICAL: MUST NOT" emphasis instead of a defined skip list.')}

<h3>Worked scenario</h3>
<p>A CI review bot comments on every PR. Over a month, developers dismiss 70% of its comments; almost all dismissals are naming suggestions and "possible null" warnings on values the framework guarantees are set. Two real authorization bugs were merged despite being flagged, because nobody read the comments. The team proposes adding "only report issues you are highly confident about".</p>
<p><b>Reasoning:</b> the problem is two identifiable categories with high false-positive rates, and the evidence is dismissal data. A confidence instruction does not define either category. <b>Answer:</b> move naming to SKIP (the linter owns it), add the framework guarantee to accepted patterns in CLAUDE.md with a code example, temporarily disable the null-safety category until its criteria ("report only when a value can be null on a reachable path, show the path") pass a labeled PR set, and add <code>detected_pattern</code> to findings so the next dismissal spike is diagnosable.</p>

${H.check([
  ['A reviewer prompt says "check that comments are accurate". It flags typos and outdated wording in comments. What single change improves precision most?', 'Replace it with an explicit criterion: flag a comment only when the behavior it claims contradicts the code. Typos and wording are not contradictions, so they fall out of scope.'],
  ['Why does "only report high-confidence findings" usually fail to reduce false positives?', 'It sets no categorical boundary, and the model\'s self-reported confidence is poorly calibrated, so unwanted categories still come through while some real issues get suppressed.'],
  ['Security findings are 95% accurate, style findings 20%. Developers now ignore all comments. What do you do first?', 'Temporarily disable the style category (move it to SKIP) to restore trust in the accurate categories, then improve its criteria offline and re-enable only on measured precision.'],
  ['Two runs label the same off-by-one bug "medium" and "high". How do you make severity consistent?', 'Define each severity level by observable consequence and anchor it with concrete code examples, including an off-by-one example at its intended level.'],
  ['The bot keeps flagging your error-wrapping helper as swallowed exceptions. Where does the fix belong?', 'In persistent project context: an accepted-pattern entry in the committed CLAUDE.md (or a path-scoped rule), ideally with an acceptable-vs-genuine example pair, so every run and every teammate gets it.'],
  ['How would you find which construct causes most dismissals?', 'Add a <code>detected_pattern</code> field to each finding and group dismissals by it; the top patterns become accepted patterns or sharper criteria.']
])}
${H.src([['Prompting best practices', 'https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices'], ['Claude Code: memory (CLAUDE.md, rules)', 'https://code.claude.com/docs/en/memory'], ['Claude Code GitHub Actions', 'https://code.claude.com/docs/en/github-actions'], ['Demystifying evals for AI agents', 'https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents']])}`;
    }
  });

  /* ------------------------------------------------------------------ 4.2 */
  CCAR.lessons.push({
    id: 'hb-42-few-shot', track: 'handbook', part: 'P4', num: '4.2', order: 402, domain: 'D4',
    objs: ['X09', 'O29'], ts: ['4.2'], minutes: 25,
    title: 'Few-shot prompting for consistency, ambiguity and generalization',
    summary: 'When detailed instructions still give inconsistent output, 2–4 targeted examples fix format, demonstrate ambiguous-case reasoning, separate acceptable patterns from real issues, and teach extraction across varied document structures.',
    body: function () {
      return `
<p>Instructions describe what you want; examples show it. When a prompt already has clear criteria and the output still varies in format, severity or edge-case handling, the exam guide calls few-shot examples the most effective technique for consistent, actionable output. Good examples also teach <b>judgment</b>: Claude generalizes the reasoning they show to cases no rule lists. The exam probes when to reach for examples, how many, what they must contain, and when a different fix (a tool description, a schema, a hook) is the better first step.</p>

<h3>What few-shot examples fix</h3>
${H.table(['Symptom', 'Example type', 'What the example must show'], [
  ['Output format drifts between runs (some findings lack a fix, severity missing)', 'Format examples', 'The exact structure: location, issue, severity, suggested fix'],
  ['Ambiguous requests handled differently each time', 'Ambiguous-case examples', 'The choice made <b>and why</b> it beats the plausible alternative'],
  ['Correct-by-convention code flagged as a bug', 'Acceptable vs genuine pairs', 'Two similar snippets: one is fine (and why), one is a real issue (and why)'],
  ['Extraction misses data when the document is laid out differently', 'Varied-structure examples', 'The same field found in different places (table, narrative, footnote)'],
  ['Required fields come back empty/null although the value is present', 'Format-varied extraction examples', 'The value located in an unusual format and extracted'],
  ['Invented values for vague source text', 'Honest-extraction examples', 'Informal text kept as stated, normalized only when defensible, null otherwise']
])}

${D({ w: 760, h: 200, title: 'From instructions to generalized judgment',
  nodes: [
    { id: 'i', x: 20, y: 70, w: 170, h: 60, label: 'Instructions + criteria', sub: 'what and why (4.1)', kind: 'note' },
    { id: 'e', x: 240, y: 70, w: 180, h: 60, label: '2–4 targeted examples', sub: 'ambiguous cases + reasoning', kind: 'agent' },
    { id: 'k', x: 480, y: 10, w: 260, h: 50, label: 'Known cases', sub: 'handled consistently', kind: 'good' },
    { id: 'n', x: 480, y: 75, w: 260, h: 50, label: 'Novel patterns', sub: 'same reasoning applied', kind: 'good' },
    { id: 'l', x: 480, y: 140, w: 260, h: 50, label: 'Laundry list of rules', sub: 'matches only listed cases', kind: 'bad' }
  ],
  edges: [{ from: 'i', to: 'e' }, { from: 'e', to: 'k' }, { from: 'e', to: 'n' }, { from: 'i', to: 'l', dashed: true, kind: 'bad' }],
  caption: 'Examples that show reasoning let Claude extend the judgment to patterns you never listed. Piling up if-then rules only covers the cases you thought of.' })}

<h3>Ambiguous-case examples: show the choice and the rejected alternative</h3>
<p>Create <b>2–4 targeted examples</b> for the cases that actually cause inconsistency, and in each one state why the chosen action beats the plausible alternative. The reasoning is what transfers.</p>
<pre class="code">&lt;examples&gt;
&lt;example&gt;
Customer: "Check my order #48213, I think it shipped to my old address."
Reasoning: The request is about an order, and an order number is given. lookup_order returns the
shipping address on the order. get_customer would return the profile address, which is not what was
asked and does not show where this order went.
Action: lookup_order(order_id="48213")
&lt;/example&gt;
&lt;example&gt;
Customer: "Update my email and tell me if anything is still on the way."
Reasoning: Two intents. Profile change needs get_customer (verified ID) first; "anything on the way"
needs that customer's orders. Do not guess an order ID.
Action: get_customer(email_on_file) first, then list the open orders for that customer ID.
&lt;/example&gt;
&lt;/examples&gt;</pre>
<p>The same technique applies to <b>branch-level test coverage gaps</b> in test generation: line coverage can be 100% while a branch is never exercised.</p>
<pre class="code">&lt;example&gt;
Code: function fee(amount, isMember) { let f = amount * 0.03; if (isMember &amp;&amp; amount &gt; 100) f = 0; return f; }
Existing tests: fee(200, true) === 0, fee(50, false) === 1.5   (every line runs)
Reasoning: Lines are all covered, but the condition has an untested branch combination:
isMember=true with amount &lt;= 100 (fee should still apply). Boundary 100 itself is also untested.
Gap reported: branch "isMember &amp;&amp; amount &gt; 100" false-because-amount; suggest fee(100, true) === 3.
&lt;/example&gt;</pre>

<h3>Format examples: location, issue, severity, suggested fix</h3>
<p>If downstream code, a PR comment renderer or a human triage queue expects a fixed structure, show it. One or two complete examples do more than a paragraph describing the format.</p>
<pre class="code">&lt;example&gt;
location: src/billing/invoice.ts:88
issue: Discount is applied after tax; the pricing spec requires discount before tax, so customers
       are overcharged by tax x discount.
severity: high
suggested_fix: Move applyDiscount(subtotal) above computeTax(); add a test with a 10% discount.
&lt;/example&gt;</pre>

<h3>Acceptable pattern vs genuine issue</h3>
<p>Pairs of similar snippets teach the boundary itself, so Claude stops flagging the acceptable form and still catches the real problem in forms it has not seen. This complements the accepted-patterns list from 4.1.</p>
<div class="two"><div><h4 class="good-h">Acceptable: do not flag</h4><pre class="code">try { await save(order) }
catch (err) { throw wrapErr(err, { orderId }) }
// Reason: error is re-thrown with context;
// project convention (CLAUDE.md).</pre></div>
<div><h4 class="bad-h">Genuine issue: flag</h4><pre class="code">try { await save(order) }
catch (err) { log.debug(err) }
// Reason: error is swallowed; caller
// believes the save succeeded. severity: high</pre></div></div>

<h3>Varied document structures in extraction</h3>
<p>Extraction prompts often work on the documents they were written against and fail on the rest. Examples should cover the structural variants you actually receive.</p>
${H.table(['Variant pair', 'What the examples demonstrate'], [
  ['Inline citations vs bibliographies', 'An inline "(Chen et al., 2024)" resolved against a references list at the end, and a paper with numbered footnote citations; both produce the same citation record'],
  ['Methodology section vs embedded details', 'Sample size and method taken from a dedicated Methods heading in one example, and from a sentence in the results narrative ("we surveyed 412 clinicians") in another'],
  ['Structured table vs narrative description', 'Line items read from a table, and from prose such as "two licenses at 300 each"'],
  ['Informal measurements', '"about a cup", "a couple of meters": keep the raw text; fill a normalized value only when the conversion is defined, otherwise null']
])}
<pre class="code">&lt;example&gt;
Document excerpt: "...Across the three sites we enrolled 412 participants between March and June..."
(No Methods heading; details are embedded in the Results narrative.)
Output: { "sample_size": 412, "sample_size_source": "results narrative, paragraph 2",
          "study_period": "March-June", "methodology_section_present": false }
&lt;/example&gt;
&lt;example&gt;
Document excerpt: "Add roughly a handful of salt."
Output: { "quantity_raw": "roughly a handful", "quantity_value": null, "unit": null,
          "note": "informal measurement; no defined conversion" }
&lt;/example&gt;</pre>
${H.box('rule', 'Empty/null on required fields:', 'When a required field comes back null although the value is in the document, the model did not recognize the format. Add examples showing correct extraction from the formats it misses (narrative, footnote, table header). When the value is genuinely absent, the field should be nullable in the schema (4.3) so the model is not pushed to invent one. Examples fix recognition; nullable fields fix fabrication.')}

<h3>How few-shot reduces hallucination</h3>
<p>Without examples, a model facing "a couple of weeks" or a missing field tends to produce a precise-looking value because the task seems to demand one. Examples that show the honest behavior (raw text preserved, null when absent, a note explaining why) set the expectation directly. Pair this with a schema that permits null and with semantic validation in code (4.4).</p>

<h3>Example design rules</h3>
${H.table(['Rule', 'Why'], [
  ['<b>Relevant and diverse</b>: vary length, structure, outcome and severity', 'Identical-looking examples teach unintended patterns (every finding "medium", every answer two sentences)'],
  ['<b>Canonical, not a laundry list</b>: a few examples that each represent a class of case', 'Stuffing every edge case into the prompt is brittle and costly; canonical cases generalize'],
  ['<b>Target the ambiguity</b>: pick the cases that actually fail in logs or evals', 'Easy cases add tokens and teach nothing'],
  ['<b>Show reasoning</b> for the chosen action and the rejected alternative', 'The reasoning is what transfers to novel inputs; few-shot also works with thinking'],
  ['<b>Wrap in <code>&lt;example&gt;</code> / <code>&lt;examples&gt;</code> tags</b>', 'Separates examples from instructions and from the real input, so Claude does not treat them as data to process'],
  ['<b>Place consistently</b>: instructions, then examples, then the input; long documents at the top with the query at the end', 'Clear structure; stable examples stay in the cacheable prefix'],
  ['<b>Keep examples consistent with the instructions</b>', 'When they conflict, the model tends to copy the example']
])}

<h3>Few-shot is not the first fix for everything</h3>
${H.table(['Problem', 'First fix', 'Why not few-shot first'], [
  ['Agent picks get_customer instead of lookup_order; both tools have one-line descriptions', 'Expand the <b>tool descriptions</b>: purpose, input formats, example queries, when not to use (sample question 2)', 'Descriptions are the primary selection signal; examples add tokens without fixing the root cause'],
  ['A prerequisite must always run (verify customer before refund)', 'Programmatic gate or hook', 'Examples are probabilistic; compliance needs determinism'],
  ['Output must be valid JSON with a fixed shape', 'Tool use / JSON schema (4.3)', 'Schemas guarantee structure; examples only encourage it'],
  ['Criteria are vague', 'Explicit criteria (4.1)', 'Examples of a boundary nobody has defined still leave it vague'],
  ['Criteria are explicit, yet format and edge handling vary', '<b>Few-shot examples</b>', 'This is exactly their job']
])}

<h3>Every exam skill, explicitly</h3>
${H.table(['Skill (4.2)', 'How', 'Why'], [
  ['2–4 targeted examples for ambiguous scenarios', 'Pick failing cases; show choice + rejected alternative + reasoning', 'Consistency on the hard cases, generalization to new ones'],
  ['Examples for output format', 'Complete findings with location, issue, severity, suggested fix', 'Consistent, actionable, parseable output'],
  ['Acceptable vs genuine examples', 'Paired similar snippets with reasons', 'Cuts false positives without losing recall'],
  ['Varied document structures', 'Inline citations vs bibliographies; methods section vs embedded details', 'Extraction works across layouts'],
  ['Format-varied extraction to fix empty/null required fields', 'Show the field found in the formats being missed', 'Recognition of unusual formats']
])}

<h3>Cost</h3>
<p>Examples are input tokens on every request. Keep them in the stable part of the prompt (system prompt or a fixed examples block) so prompt caching serves them at a fraction of the price after the first request; prompts below the model's minimum cacheable length (512 tokens on Opus 5.5, Sonnet 5.5, Fable 5.1; 4,096 on Haiku 4.5) are not cached. Four sharp examples usually beat twelve generic ones on both quality and cost.</p>

${H.box('real', 'Real-world note:', 'Source examples from production failures (dismissed findings, human-corrected extractions), keep them in version control next to the prompt, and re-run your labeled eval set whenever you change them. Watch for overfitting: if a new example fixes its own case but breaks others, it is teaching a surface pattern. Rotate in new canonical cases as document types change.')}
${H.box('exam', 'Exam tip:', 'Few-shot is the answer when the stem says detailed instructions already exist and output is still inconsistent, or ambiguous cases are handled differently. It is a distractor when the root cause is a minimal tool description (fix the description first), when a rule must hold every time (use code), or when examples are proposed as "5–8 examples of the obvious case" instead of targeted ambiguous cases.')}
${H.box('trap', 'Traps:', 'Dozens of examples covering every case (laundry list, cost, brittleness); examples without reasoning (copying without judgment); all examples with the same structure or outcome (unintended pattern); examples that contradict the instructions; examples placed where they look like input; using few-shot to enforce a mandatory step; fixing fabricated values with examples alone while the schema still forces a required non-null field.')}

<h3>Worked scenario</h3>
<p>A research pipeline extracts <code>sample_size</code>, <code>methodology</code> and citations from papers. The prompt has clear field definitions. On journal articles with a Methods heading and a bibliography, accuracy is high. On conference papers, <code>sample_size</code> is null 40% of the time and citations are missing, although reviewers find the values in the text. Inspection shows these papers embed the sample size in the results narrative and use inline author-year citations with a short references list.</p>
<p><b>Reasoning:</b> instructions are already explicit; the failure is format recognition on a specific structural variant. <b>Answer:</b> add two or three examples showing extraction from embedded methodology details and from inline citations resolved against a references list, each with a source note. Keep <code>sample_size</code> nullable for papers that truly lack it, and track null rate per document type to confirm the fix.</p>

${H.check([
  ['Your review prompt has explicit criteria, but findings sometimes omit the suggested fix and severity. What do you add?', 'One or two complete few-shot examples showing the exact format (location, issue, severity, suggested fix). Examples are the most effective way to get consistent format when instructions alone vary.'],
  ['Why should an ambiguous-case example explain why the alternative was rejected?', 'The reasoning is what Claude generalizes. Showing only the answer teaches a surface match; showing the comparison teaches the judgment for novel cases.'],
  ['The agent confuses two tools whose descriptions are one line each. A teammate proposes 8 routing examples. Better first step?', 'Expand the tool descriptions (purpose, input formats, example queries, boundaries). Descriptions are the primary selection mechanism; examples add tokens without fixing the root cause.'],
  ['Extraction returns null for a required field on narrative-style documents where the value is present. Fix?', 'Add few-shot examples showing correct extraction from narrative formats (and other formats being missed). If the value can be genuinely absent, make the field nullable so the model does not fabricate.'],
  ['All your examples happen to be "medium" severity. What risk does that create?', 'An unintended pattern: the model skews toward "medium". Vary severity, length and outcome across examples.'],
  ['How do you keep the cost of examples down?', 'Use a few canonical examples, keep them in the stable cacheable prefix, and drop examples that do not move your eval results.']
])}
${H.src([['Prompting best practices (examples, XML tags)', 'https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices'], ['Effective context engineering for AI agents', 'https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents'], ['Define tools', 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools'], ['Prompt caching', 'https://platform.claude.com/docs/en/build-with-claude/prompt-caching']])}`;
    }
  });

  /* ------------------------------------------------------------------ 4.3 */
  CCAR.lessons.push({
    id: 'hb-43-structured-output', track: 'handbook', part: 'P4', num: '4.3', order: 403, domain: 'D4',
    objs: ['O25', 'O26', 'O27', 'O28', 'O29'], ts: ['4.3'], minutes: 35,
    title: 'Structured output with tool use and JSON schemas',
    summary: 'The reliability ladder for structured output, extraction tools and reading tool_use input, tool_choice auto/any/forced (and the 400 on the newest models), schema design that represents missing and ambiguous data honestly, normalization rules, SDK validation, and fixing truncation by splitting and merging.',
    body: function () {
      return `
<p>Structured output is the contract between Claude and the deterministic code downstream: a database insert, a routing rule, a PR comment renderer. If the JSON does not parse, the pipeline stops; if it parses but a value is invented or misplaced, the pipeline silently writes bad data. The exam probes which mechanism is most reliable, how <code>tool_choice</code> guarantees a call, what schemas can and cannot prevent, and how to design fields so the model never has to fabricate. In production you also need to know what changed on the newest models.</p>

<h3>The reliability ladder</h3>
${H.table(['Rank', 'Mechanism', 'Guarantees', 'Weakness'], [
  ['1', '<b>Strict tool use</b> (<code>strict: true</code>) or <b>JSON outputs</b> (<code>output_config.format</code>, type <code>json_schema</code>)', 'Constrained decoding: always valid JSON, required fields present, correct types', 'No semantic guarantee; some JSON Schema constraints unsupported'],
  ['2', 'Tool use with an <code>input_schema</code> (the exam guide\'s "tool use with JSON schemas")', 'Output arrives as a parsed <code>tool_use.input</code> object; the exam treats this as the most reliable approach and as eliminating syntax errors', 'Without strict mode, schema conformance is very likely but not constrained'],
  ['3', 'Prompt-only JSON ("respond only with JSON like this...")', 'Nothing', 'Preambles, trailing prose, missing braces, wrong types'],
  ['4', 'Prefill the assistant turn with <code>{</code>', 'Nothing, and <b>400 error on Claude 4.6 and later</b>', 'Only on older models'],
  ['5', 'Regex or "repair the JSON" post-processing', 'Nothing', 'Treats symptoms; silently corrupts data']
])}
<div class="spectrum"><div class="sp bad">Prompt JSON, prefill, repair scripts: hope</div><div class="sp good">Tool use + schema, strict mode, JSON outputs: structural guarantee</div><div class="sp bad">Assuming the schema also guarantees correct values</div></div>

<h3>Defining an extraction tool and reading the result</h3>
<p>An extraction "tool" is not something you execute. Its <code>input_schema</code> is the output schema: Claude "calls" it with the extracted data, and your code reads <code>tool_use.input</code>.</p>
<pre class="code">import anthropic
client = anthropic.Anthropic()

extract_invoice = {
    "name": "extract_invoice",
    "description": "Record the fields of ONE supplier invoice exactly as found in the document. "
                   "Use null for any field the document does not contain; never guess. "
                   "Keep raw text alongside normalized values. Do not compute totals the document "
                   "does not state, except total_calculated.",
    "input_schema": INVOICE_SCHEMA,      # full schema below
    "strict": True,                      # schema-valid input guaranteed
}

resp = client.messages.create(
    model=MODEL, max_tokens=4096,
    system=NORMALIZATION_RULES,          # format rules live next to the schema
    tools=[extract_invoice],
    tool_choice={"type": "tool", "name": "extract_invoice"},   # exam pattern; see callout
    messages=[{"role": "user", "content": [pdf_block, {"type": "text", "text": "Extract this invoice."}]}],
)

if resp.stop_reason == "max_tokens":
    raise TruncatedOutput(resp.id)       # incomplete input: split the work, do not parse
block = next(b for b in resp.content if b.type == "tool_use" and b.name == "extract_invoice")
invoice = block.input                    # already a dict, no json.loads, no regex</pre>
<p>Always check <code>stop_reason</code> before trusting the input: a truncated tool call is incomplete even when strict mode shaped what was generated.</p>

<h3>tool_choice: auto, any, forced</h3>
${H.table(['Setting', 'Behavior', 'Use it when'], [
  ['<code>{"type": "auto"}</code>', 'Claude may call a tool <b>or reply in text</b>', 'Agents and conversations; not enough when downstream code breaks on a text reply'],
  ['<code>{"type": "any"}</code>', 'Must call a tool, chooses which', '<b>Several extraction schemas exist and the document type is unknown</b> (extract_invoice, extract_receipt, extract_contract): a structured result is guaranteed and Claude picks the matching schema'],
  ['<code>{"type": "tool", "name": "extract_metadata"}</code>', 'Must call that named tool', '<b>A particular extraction must run before enrichment steps</b>: force extract_metadata first, then continue with other tools in later turns'],
  ['<code>{"type": "none"}</code>', 'No tool calls', 'A final prose summary turn']
])}
${D({ w: 760, h: 200, title: 'Forced first step, then type-specific extraction',
  nodes: [
    { id: 'doc', x: 20, y: 70, w: 120, h: 56, label: 'Document', sub: 'type unknown', kind: 'store' },
    { id: 'meta', x: 180, y: 70, w: 170, h: 56, label: 'extract_metadata', sub: 'forced: type, date, parties', kind: 'agent' },
    { id: 'any', x: 390, y: 70, w: 160, h: 56, label: 'Type-specific extract', sub: '"any" over 3 schemas', kind: 'agent' },
    { id: 'val', x: 590, y: 20, w: 150, h: 50, label: 'Validate in code', sub: 'sums, dates, enums', kind: 'tool' },
    { id: 'enr', x: 590, y: 120, w: 150, h: 50, label: 'Enrichment', sub: 'lookups, CRM match', kind: 'sub' }
  ],
  edges: [{ from: 'doc', to: 'meta' }, { from: 'meta', to: 'any' }, { from: 'any', to: 'val' }, { from: 'val', to: 'enr' }],
  caption: 'Forced selection guarantees the metadata step runs first; "any" guarantees structured output when the right schema depends on the document. Validation in code sits between extraction and anything that acts on the data.' })}
${H.box('exam', 'Exam vs current docs:', 'The exam guide teaches <code>tool_choice: "any"</code> for unknown document types and <code>{"type": "tool", "name": "extract_metadata"}</code> to force a step, and those are the exam answers. In current docs, <b>Claude Opus 5.5, Sonnet 5.5 and Fable 5.1 return HTTP 400 for <code>any</code> and <code>tool</code></b>. On those models use <code>auto</code> plus strict tool use (<code>strict: true</code>) for schema-valid inputs, JSON outputs via <code>output_config.format</code> when you need one fixed JSON response, and code for ordering (for example expose only <code>extract_metadata</code> on the first call). Prompting still steers which tool <code>auto</code> picks. Haiku 4.5 and older models still accept forced choice. Also: with <code>any</code>/<code>tool</code> the API prefills the assistant turn, so no text precedes the tool call, and manual extended thinking cannot be combined with them.')}
<pre class="code">// Current-docs alternative on Opus 5.5 / Sonnet 5.5 / Fable 5.1: JSON outputs, no tools needed
{
  "model": "...", "max_tokens": 4096,
  "output_config": { "format": { "type": "json_schema", ... } },   // your schema; response arrives in a text block
  "messages": [ ... ]
}</pre>

<h3>Syntax errors vs semantic errors</h3>
${H.table(['Error', 'Example', 'Prevented by schema?', 'Caught by'], [
  ['Syntax', 'Missing brace, trailing prose, unquoted key', 'Yes (tool use, strict, JSON outputs)', 'Not needed'],
  ['Type / shape', '"quantity": "two", missing required key', 'Yes with strict / JSON outputs', 'Schema validation for non-strict tools'],
  ['Semantic: arithmetic', 'Line items sum to 1,180; total says 1,250', 'No', 'Code: compare <code>total_calculated</code> to <code>total_stated</code>'],
  ['Semantic: wrong field', 'Vendor tax ID placed in invoice_number', 'No', 'Format checks (regex per field), cross-field rules'],
  ['Semantic: fabrication', 'Due date invented because the field was required', 'No; the schema can <b>cause</b> it', 'Nullable fields, few-shot (4.2), validation']
])}

<h3>Schema design that represents reality honestly</h3>
${H.table(['Pattern', 'Schema', 'Prevents'], [
  ['<b>Required vs optional</b>', 'Require only what every document has. For the rest, make the value nullable (<code>"type": ["string", "null"]</code>) or omit it from <code>required</code>', 'Invented values to satisfy a required field'],
  ['<b>Nullable for may-be-absent</b>', '<code>"due_date": {"type": ["string", "null"], "description": "null if not printed"}</code>', 'Fabricated due dates and tax IDs'],
  ['<b>Enum + "other" + detail</b>', '<code>"category": {"enum": ["hardware", "software", "services", "other"]}</code> plus <code>"category_detail": ["string", "null"]</code>', 'Forcing new categories into the wrong bucket; lets you discover new categories'],
  ['<b>"unclear" value</b>', 'Add <code>"unclear"</code> to enums where the source can be ambiguous', 'Confident wrong choices on ambiguous text; routes cases to review'],
  ['<b>Raw + normalized</b>', '<code>date_raw: "3/4/26"</code> and <code>date: null</code> if day/month order is ambiguous', 'Silent normalization mistakes; keeps an audit trail'],
  ['<b>Calculated vs stated</b>', '<code>total_stated</code> (as printed) and <code>total_calculated</code> (sum of lines + tax)', 'Hidden arithmetic discrepancies; enables self-correction checks (4.4)'],
  ['<b>No free-form catch-alls</b>', '<code>"additionalProperties": false</code>', 'Unexpected keys downstream']
])}

<h3>Format normalization rules alongside the schema</h3>
<p>The schema says <i>what type</i> a field has; it cannot say how to turn "Mar 4th '26", "04.03.2026" or "EUR 1.250,00" into your canonical form. Put normalization rules in the prompt next to the schema.</p>
<pre class="code">&lt;normalization_rules&gt;
- Dates: output ISO 8601 (YYYY-MM-DD). If day/month order cannot be determined from the document
  (e.g. 03/04/26 with no locale clue), set the normalized field to null and keep the raw text.
- Amounts: numbers without thousands separators, decimal point ".", e.g. "1.250,00 EUR" -&gt; 1250.00.
- Currency: ISO 4217 code if printed or unambiguous from the symbol; "$" alone is "unclear".
- Percentages: 0-100 as numbers, "7,5 %" -&gt; 7.5.
- Never fill a field from general knowledge; only from the document.
&lt;/normalization_rules&gt;</pre>

<h3>JSON Schema limitations and SDK helpers</h3>
<ul>
<li>Constrained decoding does not support every JSON Schema keyword; numeric <code>minimum</code>/<code>maximum</code>, <code>minLength</code> and similar constraints are among the unsupported ones.</li>
<li>The SDK helpers handle this for you: Python <code>client.messages.parse()</code> with a Pydantic model, and Zod schemas in TypeScript, <b>transform</b> the schema (strip unsupported constraints, move them into descriptions) and <b>validate</b> the response against the full model afterwards.</li>
<li>Validation failures after parsing are semantic or constraint errors: feed them back in a retry with the specific error (4.4). In the Agent SDK, repeated structured-output validation failure ends with result subtype <code>error_max_structured_output_retries</code>. In Claude Code print mode, <code>--json-schema</code> gives validated structured output.</li></ul>
<pre class="code">from pydantic import BaseModel, Field, model_validator
from typing import Literal, Optional

class LineItem(BaseModel):
    description: str
    quantity: Optional[float] = None
    unit_price: Optional[float] = None
    amount: float

class Invoice(BaseModel):
    invoice_number: str
    document_type: Literal["invoice", "credit_note", "proforma", "other", "unclear"]
    due_date: Optional[str] = Field(None, description="ISO 8601; null if not printed")
    line_items: list[LineItem]
    total_stated: Optional[float] = None
    total_calculated: float

    @model_validator(mode="after")
    def totals_agree(self):              # semantic check the schema cannot express
        if self.total_stated is not None and abs(self.total_stated - self.total_calculated) &gt; 0.01:
            raise ValueError(f"total_stated {self.total_stated} != total_calculated {self.total_calculated}")
        return self

invoice = Invoice.model_validate(block.input)   # or let client.messages.parse() build and validate it</pre>

<h3>Full schema example: invoice</h3>
<pre class="code">INVOICE_SCHEMA = {
  "type": "object",
  "properties": {
    "document_type":   { "type": "string", "enum": ["invoice", "credit_note", "proforma", "other", "unclear"] },
    "document_type_detail": { "type": ["string", "null"], "description": "Required when other/unclear" },
    "invoice_number":  { "type": "string", "description": "As printed, including prefixes" },
    "invoice_date_raw":{ "type": ["string", "null"], "description": "Exactly as printed" },
    "invoice_date":    { "type": ["string", "null"], "description": "YYYY-MM-DD; null if absent or ambiguous" },
    "due_date":        { "type": ["string", "null"], "description": "YYYY-MM-DD; null if not printed. Do not derive from terms" },
    "vendor_name":     { "type": "string" },
    "vendor_tax_id":   { "type": ["string", "null"] },
    "currency":        { "type": "string", "enum": ["USD", "EUR", "GBP", "other", "unclear"] },
    "currency_detail": { "type": ["string", "null"] },
    "payment_terms":   { "type": "string", "enum": ["net_15", "net_30", "net_60", "due_on_receipt", "other", "not_stated"] },
    "payment_terms_detail": { "type": ["string", "null"] },
    "line_items": { "type": "array", "items": {
        "type": "object",
        "properties": {
          "description": { "type": "string" },
          "quantity":    { "type": ["number", "null"] },
          "unit_price":  { "type": ["number", "null"] },
          "amount":      { "type": "number" } },
        "required": ["description", "quantity", "unit_price", "amount"],
        "additionalProperties": false } },
    "subtotal_stated": { "type": ["number", "null"] },
    "tax_stated":      { "type": ["number", "null"] },
    "total_stated":    { "type": ["number", "null"], "description": "Grand total as printed" },
    "total_calculated":{ "type": "number", "description": "Sum of line amounts plus tax_stated (0 if null)" }
  },
  "required": ["document_type", "document_type_detail", "invoice_number", "invoice_date_raw", "invoice_date",
               "due_date", "vendor_name", "vendor_tax_id", "currency", "currency_detail", "payment_terms",
               "payment_terms_detail", "line_items", "subtotal_stated", "tax_stated", "total_stated",
               "total_calculated"],
  "additionalProperties": false
}</pre>
<p class="small muted">Every key is required but many values are nullable: the model must address each field explicitly, and "absent" is a valid, visible answer rather than a missing key or an invented value.</p>

<h3>Truncation: split into scoped calls and merge</h3>
<p>When a long document produces more structured output than fits, generation stops with <code>stop_reason: "max_tokens"</code> and the JSON or tool input is incomplete. Retrying the same request fails the same way. Raising <code>max_tokens</code> hits model output ceilings, and one huge output also dilutes attention across the whole document.</p>
<ol class="steps">
<li><b>Scope:</b> split by natural boundaries (pages, sections, clauses, files), with the same schema per call.</li>
<li><b>Extract:</b> one call per scope; check each <code>stop_reason</code>; split further any scope that still truncates.</li>
<li><b>Merge in code:</b> concatenate arrays, dedupe by a natural key (line number, clause ID), keep source location per record.</li>
<li><b>Boundary checks:</b> overlap chunks slightly or pass the previous chunk's last item so records spanning a boundary are not lost or duplicated; verify counts (for example "items 1–212" all present) and totals (sum of merged line items vs stated grand total).</li></ol>
${H.box('rule', 'O28 in one line:', 'Structured output truncated at max_tokens → split into smaller scoped calls with the same schema and merge programmatically with boundary and total checks; do not just raise max_tokens and do not retry the identical request.')}

<h3>Every exam skill, explicitly</h3>
${H.table(['Skill (4.3)', 'How', 'Why'], [
  ['Extraction tools with JSON schemas; read tool_use', '<code>input_schema</code> as output schema; read <code>block.input</code>', 'Structured object, no parsing of prose'],
  ['<code>tool_choice: "any"</code> for unknown types', 'Offer one tool per schema; require a call', 'Guaranteed structured output, model picks the schema'],
  ['Force <code>extract_metadata</code>', '<code>{"type": "tool", "name": "extract_metadata"}</code> before enrichment', 'Guarantees ordering of a prerequisite extraction'],
  ['Nullable optional fields', '<code>"type": ["string", "null"]</code> for may-be-absent data', 'Stops fabrication to satisfy required fields'],
  ['"unclear" and "other" + detail', 'Enum escape hatches with a detail string', 'Honest ambiguity, extensible categories'],
  ['Normalization rules with the schema', 'Prompt rules for dates, amounts, currencies', 'Inconsistent source formatting'],
  ['Know schema limits', 'Syntax guaranteed, semantics not', 'Validate sums and field placement in code']
])}

<h3>Design decisions</h3>
${H.table(['If the situation is', 'Choose', 'Because', 'You give up'], [
  ['Downstream code breaks on any non-JSON reply', 'Tool use with schema; forced/any (exam) or strict + JSON outputs (current models)', 'Structural guarantee', 'Free-text commentary'],
  ['One fixed output shape, no tool semantics needed', 'JSON outputs (<code>output_config.format</code>)', 'Simplest guaranteed JSON', 'Multiple schema choice in one call'],
  ['Several possible document types', 'One extraction tool per type, <code>any</code> (exam) or <code>auto</code> + strict tools + instructions', 'Right schema per document', 'Slightly more prompt/tool tokens'],
  ['Field often absent from source', 'Nullable field', 'No fabrication', 'Downstream must handle null'],
  ['Category list will grow', 'Enum + "other" + detail', 'No forced misfiling; discover new values', 'Periodic enum maintenance'],
  ['Output truncates', 'Split into scoped calls, merge in code', 'Complete, verifiable output', 'More calls and merge logic']
])}

${H.box('real', 'Real-world note:', 'Log per field: null rate, "unclear"/"other" rate, and validation failure rate, segmented by document type. A rising "other" rate is a signal to extend the enum; a null rate that jumps for one supplier usually means a new layout that needs a few-shot example. Version schemas and keep old parsers until every consumer migrates. For high volume, run extraction through the Batches API with <code>custom_id</code> per document.')}
${H.box('trap', 'Traps:', '"Strict schema guarantees the totals are right" (only syntax/shape); making every field required and non-null (fabrication); "raise max_tokens" or "retry" for truncation; prompt-only JSON or prefill as the reliable option (prefill 400s on 4.6+); <code>auto</code> when a text reply would break the pipeline (exam answer: any/forced); regex repair of broken JSON; putting normalization rules only in field descriptions of a schema whose keywords get stripped, without prompt rules or validation.')}

<h3>Worked scenario</h3>
<p>A pipeline receives invoices, receipts and contracts through one inbox; the document type is not known in advance. The current prompt asks for "JSON only". About 3% of responses contain a sentence before the JSON, and the loader crashes. Separately, 11% of receipts have an invented <code>due_date</code>, and for multi-page invoices with 200+ lines the output stops mid-array.</p>
<p><b>Reasoning and answer:</b> (1) Replace prompt JSON with one extraction tool per document type and <code>tool_choice: "any"</code> (exam answer); on Opus 5.5 or Sonnet 5.5 use <code>auto</code> with strict tools and an instruction to always call one, or JSON outputs with a discriminated schema. (2) Make <code>due_date</code> nullable with "null if not printed; do not derive from terms", keep <code>payment_terms</code> as enum + other + detail. (3) Detect <code>stop_reason: "max_tokens"</code>, split long invoices by page range, merge line items in code, and check the merged sum against <code>total_stated</code>.</p>

${H.check([
  ['Which is the most reliable way to guarantee schema-compliant JSON: prompt instructions with an example, prefill with "{", or tool use with a JSON schema?', 'Tool use with a JSON schema (with strict mode or JSON outputs for constrained decoding). Prompt JSON gives no guarantee, and prefill returns 400 on Claude 4.6 and later.'],
  ['Documents may be invoices, receipts or contracts, and you have three extraction tools. Which tool_choice does the exam expect, and what do you use on Opus 5.5?', '<code>{"type": "any"}</code>: a tool call is guaranteed and Claude picks the schema. On Opus 5.5 any/tool return 400, so use <code>auto</code> with strict tools and clear instructions, or JSON outputs.'],
  ['Strict tool use is on, yet line items do not add up to the total. Why, and what do you add?', 'Schemas eliminate syntax and shape errors, not semantic ones. Extract <code>total_calculated</code> alongside <code>total_stated</code> and validate in code, retrying with the specific error when they differ.'],
  ['The model fills <code>vendor_tax_id</code> with plausible values for receipts that have none. Fix?', 'Make the field nullable ("null if not printed") so absence is a valid answer; optionally add a few-shot example of a receipt with null tax ID.'],
  ['A contract extraction stops mid-array with stop_reason "max_tokens". Two teammates suggest raising max_tokens or retrying. What do you do?', 'Split the contract into scoped calls (sections or page ranges) with the same schema, merge in code with dedupe and boundary checks. Retrying is deterministic, and raising max_tokens hits ceilings and dilutes attention.'],
  ['Why keep both <code>invoice_date_raw</code> and <code>invoice_date</code>?', 'The normalized field can be null when the format is ambiguous (03/04/26), while the raw text preserves what was printed for audit and human review.']
])}
${H.src([['Structured outputs', 'https://platform.claude.com/docs/en/build-with-claude/structured-outputs'], ['Define tools (tool_choice)', 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools'], ['Tool use overview', 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview'], ['Agent SDK: agent loop (result subtypes)', 'https://code.claude.com/docs/en/agent-sdk/agent-loop'], ['CLI reference (--json-schema)', 'https://code.claude.com/docs/en/cli-reference']])}`;
    }
  });
})();
