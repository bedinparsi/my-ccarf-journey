/* Architect Handbook · Part 5 (b): codebase exploration context (5.4), human review and calibration (5.5), provenance in synthesis (5.6). */
(function () {
  var H = CCAR.hb, D = H.D;

  /* ------------------------------------------------------------------ 5.4 */
  CCAR.lessons.push({
    id: 'hb-54-codebase-context', track: 'handbook', part: 'P5', num: '5.4', order: 504, domain: 'D5',
    objs: ['O20', 'O17', 'O09'], ts: ['5.4'], minutes: 30,
    title: 'Context management in large codebase exploration',
    summary: 'Recognize context degradation, persist findings in scratchpad files, isolate verbose exploration in subagents, pass phase summaries forward, recover from crashes with manifests, and use /compact and just-in-time retrieval deliberately.',
    body: function () {
      return `
<p>Exploring a large, unfamiliar codebase is the fastest way to fill a context window. Every Grep hit, every file read and every stack trace stays in the conversation, and the docs are blunt about the consequence: the context fills fast and performance degrades as it fills. In production this shows up as an agent that confidently describes code it no longer "remembers". The exam probes whether you can recognize the symptom, and whether you reach for the structural fixes (scratchpad files, subagent isolation, phase summaries, manifests, compaction with instructions) instead of "use a bigger model" or "tell it to be careful".</p>

<h3>Context degradation: the signature</h3>
<p>Anthropic calls the underlying effect <b>context rot</b>: recall degrades as token count grows, because context is a finite attention budget. The goal is the smallest set of high-signal tokens that lets the agent do the next step.</p>
${H.table(['Symptom in a transcript', 'What it means', 'Structural fix'], [
  ['Early on: "Refunds go through <code>RefundOrchestrator.execute()</code> in <code>billing/refunds/orchestrator.py:88</code>". Two hours later: "refunds typically follow a service-layer pattern"', 'Specific findings from early turns are no longer attended to; the model falls back to <b>"typical patterns"</b> instead of the specific classes it discovered', 'Persist file:line facts in a scratchpad file; re-read it before answering'],
  ['Two answers about the same module contradict each other', '<b>Inconsistent answers</b>: the earlier finding is buried under later tool output', 'Scratchpad as single source of truth; subagents for verbose reads'],
  ['The agent re-reads files it already analyzed, or re-runs the same Grep', 'It lost track of what it already knows', 'NOTES.md "files analyzed" list; manifest of completed areas'],
  ['Most of the context is raw Grep output and full-file reads', 'Verbose discovery output crowds out reasoning', 'Delegate discovery to subagents; <code>/compact</code> with instructions'],
  ['Answer quality drops right after an auto-compaction', 'Compaction summarized away specifics (it is lossy)', 'Write facts to files <i>before</i> compaction; give compaction instructions']
])}
${H.box('rule', 'Diagnosis rule:', 'When the stem says the agent "starts referencing typical patterns rather than the specific classes it found earlier", the answer is context management (scratchpad files, subagent delegation, phase summaries, /compact), not a prompt that asks for more care and not a larger context window.')}

${D({ w: 760, h: 320, title: 'Exploration architecture that survives long sessions',
  groups: [{ x: 440, y: 10, w: 310, h: 230, label: 'ISOLATED SUBAGENT CONTEXTS', kind: 'soft' }],
  nodes: [
    { id: 'u', x: 20, y: 30, w: 150, h: 46, label: 'Developer question', sub: 'how do refunds work?', kind: 'human' },
    { id: 'm', x: 210, y: 110, w: 190, h: 60, label: 'Main agent', sub: 'coordinates, keeps high level', kind: 'agent' },
    { id: 's1', x: 470, y: 40, w: 250, h: 50, label: 'Explorer: find test files', sub: 'Glob/Grep/Read, returns summary', kind: 'sub' },
    { id: 's2', x: 470, y: 110, w: 250, h: 50, label: 'Explorer: trace refund flow', sub: 'call chain with file:line', kind: 'sub' },
    { id: 's3', x: 470, y: 180, w: 250, h: 50, label: 'Explorer: phase 2 question', sub: 'starts with phase 1 summary', kind: 'sub' },
    { id: 'n', x: 20, y: 200, w: 170, h: 56, label: 'NOTES.md scratchpad', sub: 'file:line facts, ruled out', kind: 'store' },
    { id: 'mf', x: 220, y: 250, w: 200, h: 56, label: 'state/manifest.json', sub: 'status, artifact paths, scope', kind: 'store' },
    { id: 'f', x: 470, y: 260, w: 250, h: 46, label: 'state/findings/*.json', sub: 'each agent writes here', kind: 'store' }
  ],
  edges: [{ from: 'u', to: 'm' }, { from: 'm', to: 's1', label: 'Task' }, { from: 'm', to: 's2' }, { from: 'm', to: 's3' }, { from: 'm', to: 'n', both: true, label: 'write / re-read' }, { from: 'm', to: 'mf', both: true }, { from: 's2', to: 'f', dashed: true }, { from: 'f', to: 'mf', dashed: true }],
  caption: 'Verbose output stays inside subagent contexts; only condensed summaries return. Durable facts live in files (NOTES.md, findings, manifest) that outlive any context window, compaction or crash.' })}

<h3>Scratchpad files: persist findings outside the context</h3>
<p>A scratchpad is a plain file the agent writes as it learns and re-reads before answering later questions. Anthropic describes this as <b>structured note-taking</b> (NOTES.md, progress files): the notes survive compaction, a <code>/clear</code>, a new session or a crash, and they cost tokens only when read. The format matters: record <b>specific, verifiable facts</b> (paths, symbols, line numbers), not impressions.</p>
<pre class="code"># NOTES.md: refund flow investigation (updated after each finding)

## Confirmed facts (file:line)
- Entry point: api/routes/refunds.py:42  POST /refunds -&gt; RefundController.create()
- RefundController.create() validates via billing/refunds/validators.py:17 (max 500.00 per refund)
- Orchestration: billing/refunds/orchestrator.py:88  RefundOrchestrator.execute()
  calls PaymentGateway.reverse() (payments/gateway.py:203) then LedgerWriter.post() (ledger/writer.py:61)
- Idempotency key built at orchestrator.py:95 from order_id + amount

## Ruled out (do not re-investigate)
- legacy/refund_v1.py: dead code, no importers (grep "refund_v1" = 0 hits outside file)
- Celery task refunds.retry_failed: disabled in config/tasks.yaml:12

## Open questions
- Who consumes the "refund.posted" event? (grep in services/ pending)

## Files analyzed
api/routes/refunds.py, billing/refunds/*.py, payments/gateway.py</pre>
${H.table(['Section', 'Why it is there'], [
  ['Confirmed facts with file:line', 'Lets later answers cite specific classes instead of "typical patterns"; a human can verify each line'],
  ['Ruled out hypotheses', 'Prevents the agent (or the next session) from re-exploring dead ends after context loss'],
  ['Open questions', 'The work queue for the next phase or the next subagent'],
  ['Files analyzed', 'Stops redundant re-reads; tells a resumed session where the frontier is']
])}
<p>Instruct the behavior explicitly, for example in CLAUDE.md or the task prompt: "After each confirmed finding, append it to NOTES.md with file:line. Before answering any question about the architecture, re-read NOTES.md and cite from it."</p>

<h3>Subagent delegation for verbose exploration</h3>
<p>A subagent runs in its own context. It can read forty files and grep the whole repo, and only its final message returns to the main agent (Anthropic suggests condensed summaries of roughly 1,000 to 2,000 tokens). The main agent keeps the high-level map and the decisions. Good delegation targets are specific, bounded questions such as "find all test files" or "trace refund flow dependencies".</p>
<pre class="code">// Agent SDK (TypeScript): a read-only explorer the main agent delegates to
const options = {
  allowedTools: ["Read", "Grep", "Glob", "Agent"],   // exam guide: "Task"
  agents: {
    "code-explorer": {
      description: "Use for bounded codebase questions that need many file reads or searches, " +
                   "e.g. 'find all test files for billing' or 'trace refund flow dependencies'.",
      prompt: "You investigate one question in this repository. Use Glob and Grep to locate " +
              "candidates, then Read only the relevant ranges. Return at most 40 lines: " +
              "findings as file:line facts, the call chain if asked, ruled-out paths, open questions. " +
              "Do not return raw file contents.",
      tools: ["Read", "Grep", "Glob"],   // read-only
      model: "haiku",                     // cheap, fast lookups; confirm with your evals
      effort: "low",
      maxTurns: 30
    }
  }
};</pre>
${H.box('rule', 'Remember what a subagent does not get:', 'A non-fork subagent receives its own prompt, the Agent (Task) prompt string, project CLAUDE.md, its tool definitions and listed skills. It does <b>not</b> see the parent conversation or earlier tool results. Everything it needs from earlier phases must be written into the prompt it is spawned with.')}

<h3>Phase summaries injected into the next phase</h3>
<p>Multi-phase exploration (map the modules, then trace one flow, then assess a migration) works when each phase ends with a <b>summary of key findings</b> and the coordinator injects that summary into the <b>initial context</b> of the next phase's subagents. Without it, phase 2 subagents rediscover phase 1 or contradict it.</p>
<pre class="code">Task prompt for phase 2 subagent (built by the coordinator):

&lt;phase_1_findings&gt;
- Refund entry: api/routes/refunds.py:42 -&gt; RefundController.create()
- Orchestrator: billing/refunds/orchestrator.py:88 calls PaymentGateway.reverse(), LedgerWriter.post()
- Ruled out: legacy/refund_v1.py (dead code)
&lt;/phase_1_findings&gt;

Goal: find every consumer of the "refund.posted" event under services/ and explain
what each does with it. Scope: services/ only. Return file:line facts, max 30 lines.</pre>

<h3>Crash recovery with structured state exports</h3>
<p>Long explorations and multi-agent analyses die: a laptop sleeps, a CI runner times out, a process is killed at hour four. If findings lived only in the coordinator's context, they are gone. The exam's pattern: <b>each agent exports its state to a known location</b>, the coordinator keeps a <b>manifest</b>, and on resume the coordinator <b>loads the manifest and injects completed findings into agent prompts</b>.</p>
<pre class="code">// state/manifest.json (written by the coordinator after every status change)
{
  "run_id": "refund-audit-0412",
  "repo_commit": "9f3c2e1",
  "tasks": [
    { "id": "t1", "scope": "map billing/ modules",          "status": "complete",
      "artifact": "state/findings/t1.json", "input_hash": "sha256:4be1..." },
    { "id": "t2", "scope": "trace refund flow dependencies", "status": "in_progress",
      "artifact": "state/findings/t2.partial.json" },
    { "id": "t3", "scope": "find all test files for billing", "status": "pending" }
  ]
}</pre>
<ol class="steps">
<li>Each subagent writes its findings to its artifact path (atomically: write a temp file, then rename) before the coordinator flips status to <code>complete</code>.</li>
<li>On restart the coordinator reads the manifest first. <code>complete</code> tasks are skipped and their artifacts loaded; <code>in_progress</code> and <code>pending</code> tasks are re-dispatched with the <b>recorded scope</b>.</li>
<li>Downstream prompts get completed findings injected (for example t1's module map into t2's prompt), so no subagent depends on a context that no longer exists.</li>
<li>If <code>repo_commit</code> or an <code>input_hash</code> changed, re-run the affected tasks instead of trusting stale findings.</li></ol>
${H.box('trap', 'Resume traps:', 'Merging a <code>.partial</code> artifact as final; resuming the old coordinator transcript and saying "continue" (in-flight subagent results are not in it and it is bloated); keeping findings "in context" and relying on /compact (dies with the process); re-running everything and deduplicating afterwards (pays twice).')}

<h3>/compact during extended exploration</h3>
<p><code>/compact</code> replaces the conversation so far with a summary, freeing room when the context is full of verbose discovery output. Claude Code and the Agent SDK also auto-compact near the limit (the SDK emits a <code>compact_boundary</code> message). Use it deliberately:</p>
${H.table(['Practice', 'Detail'], [
  ['Give instructions', '<code>/compact Keep every file:line fact about the refund flow, the ruled-out list and open questions; drop raw grep output</code>. Standing compaction instructions can also go in CLAUDE.md.'],
  ['Persist first', 'Compaction is lossy: specifics (line numbers, exact values, early instructions) can disappear. Write them to NOTES.md before compacting.'],
  ['Rely on re-injection for rules', 'Project-root CLAUDE.md is re-injected after compaction, so persistent rules belong there, not in an early chat message.'],
  ['Archive if needed', 'A <code>PreCompact</code> hook can archive the full transcript before it is summarized.'],
  ['Know the alternatives', '<code>/clear</code> between unrelated tasks; starting a fresh session that reads the progress files can beat compaction for multi-window work.']
])}

<h3>Just-in-time retrieval instead of loading everything</h3>
<p>Do not paste the repository into context. Keep <b>lightweight identifiers</b> (paths, symbol names, queries) and load content on demand. Claude Code is a hybrid: CLAUDE.md loads up front; Grep and Glob find things just in time.</p>
${H.table(['Step', 'Tool', 'Why'], [
  ['Find candidate files by name pattern', '<code>Glob</code> (<code>**/*refund*.py</code>, <code>tests/**/test_*.py</code>)', 'Cheap: returns paths, not contents'],
  ['Find definitions and call sites', '<code>Grep</code> for the symbol (<code>RefundOrchestrator</code>, <code>"refund.posted"</code>)', 'Locates exactly where to read'],
  ['Read only what matters', '<code>Read</code> the relevant file or range', 'Content enters context only when needed'],
  ['Follow the chain', 'Grep the next symbol from what you just read', 'Builds understanding incrementally within limits'],
  ['Record', 'Append the fact to NOTES.md', 'Keeps the result after the raw reads are gone']
])}

<h3>Long-running harness practices (multi-session work)</h3>
<p>Anthropic's guidance for agents that work across many context windows applies directly to large-codebase work:</p>
<ul>
<li><b>First window sets up the framework</b>: an initializer creates a setup script (for example <code>init.sh</code>), a progress file (for example <code>claude-progress.txt</code>), a feature or test list, and an initial git commit.</li>
<li><b>Track tests in a structured file</b> (for example <code>tests.json</code> with a status per test) and <b>use git for state</b>: each session makes incremental progress on one item and leaves a clean, committed state.</li>
<li><b>Each new session starts by reading</b> the progress file, the test list and <code>git log</code>, rather than relying on a compacted summary.</li>
<li>Failure modes this prevents: trying to one-shot everything, and a later session declaring the job done prematurely.</li></ul>

<h3>Every exam skill, mapped</h3>
${H.table(['Exam skill (5.4)', 'How to do it', 'Why it works'], [
  ['Spawn subagents for specific questions ("find all test files", "trace refund flow dependencies")', 'Bounded Task/Agent calls with a read-only explorer; summary-only return format', 'Verbose output stays in the subagent; main agent keeps coordination'],
  ['Maintain scratchpad files and reference them later', 'NOTES.md with file:line facts, ruled-out list; instruct "re-read before answering"', 'Counteracts degradation; survives compaction and restarts'],
  ['Summarize a phase before spawning next-phase subagents', 'Coordinator writes a phase summary and injects it into each new subagent prompt', 'Subagents do not inherit parent context'],
  ['Crash recovery via structured state exports', 'Agents write to known paths; coordinator manifest with status, scope, artifact; load on resume and inject', 'Resume without repeating completed work or losing findings'],
  ['Use /compact when context fills with discovery output', '<code>/compact &lt;instructions&gt;</code> after persisting facts', 'Frees attention budget while keeping what matters']
])}

<h3>Design decisions</h3>
${H.table(['If the situation is', 'Choose', 'Because', 'You give up'], [
  ['One quick question in a known area', 'Direct Grep/Read in the main session', 'Delegation overhead is not worth it', 'Nothing much'],
  ['Question needs dozens of file reads or broad search', 'Subagent with summary-only return', 'Keeps raw output out of the main context', 'Subagent cannot see your earlier findings unless you pass them'],
  ['Several independent areas (tests, refunds, config)', 'Parallel subagents in one turn', 'Wall-clock time and isolation', 'More total tokens; you must merge results'],
  ['Session is long and answers are getting vague', 'Update NOTES.md, then <code>/compact</code> with instructions, or start fresh from notes', 'Restores specific facts to attention', 'Some conversational nuance'],
  ['Multi-hour or multi-agent analysis that must not be lost', 'Manifest plus per-agent artifacts', 'Crash recovery and auditability', 'Engineering effort for atomic writes and status handling'],
  ['Work spans many days or sessions', 'Progress file, tests.json, git commits per increment', 'Fresh sessions resume from durable state', 'Discipline: every session must update the files']
])}

${H.box('real', 'Real-world notes:', 'Cap delegation: set <code>maxTurns</code> per subagent and <code>maxBudgetUsd</code> per run (it includes subagent spend); newer models delegate readily. Put NOTES.md and state/ under version control or at least in the workspace so reviewers can audit the reasoning. Scratchpads can capture secrets from config files: tell agents to record key names, not values. Measure: tokens per answered question and re-read counts show whether your context strategy is working.')}
${H.box('exam', 'Exam vs current docs:', 'The exam guide spawns subagents with the <b>Task</b> tool and requires "Task" in the coordinator\'s <code>allowedTools</code>; the current SDK calls it the <b>Agent</b> tool. The built-in <b>Explore</b> subagent is read-only and one-shot (it cannot be resumed by agentId), which fits bounded discovery questions.')}
${H.box('trap', 'Distractors for 5.4:', '"Switch to a model with a larger context window" (degradation still happens; cost grows). "Add an instruction to remember earlier findings" (probabilistic, does not restore attention). "Load the whole repo up front so nothing is missed" (maximizes context rot). "Rely on auto-compaction" (lossy, no instructions, specifics lost). "Have subagents return full file contents so the coordinator has everything" (defeats isolation). "Restart from scratch after a crash" (repeats work, loses findings).')}

<h3>Worked scenario</h3>
<p>A team uses Claude Code to understand a 900-file payments monolith before a migration. After about three hours the agent's answers about the refund path contradict what it said earlier, and it describes "a typical repository pattern" where it had previously named <code>LedgerWriter.post()</code>. The context is mostly Grep output. Later, the laptop reboots mid-analysis.</p>
<ol class="steps">
<li><b>Diagnose:</b> classic context degradation from verbose discovery output. Not a model capability issue.</li>
<li><b>Recover facts:</b> have the agent write every confirmed file:line fact and ruled-out path to NOTES.md, then <code>/compact</code> with instructions to keep those facts and drop raw search output.</li>
<li><b>Restructure:</b> the main agent delegates "find all test files for billing" and "trace refund flow dependencies" to read-only explorer subagents that return summaries and write findings to <code>state/findings/</code>.</li>
<li><b>Phase handoff:</b> before phase 2 (event consumers), the coordinator injects the phase 1 summary into each new subagent prompt.</li>
<li><b>Crash:</b> on restart the coordinator loads <code>state/manifest.json</code>, skips complete tasks, re-dispatches the in-progress trace with its recorded scope, and injects completed findings.</li></ol>
<p>Answer pattern for the exam: scratchpad plus subagent delegation for the degradation, manifest-based resume for the crash.</p>

${H.check([
  ['After two hours an exploration session starts saying "services typically validate input in a middleware layer" when it earlier cited <code>validators.py:17</code>. What is the first fix?', 'Persist key findings to a scratchpad (NOTES.md with file:line facts) and have the agent re-read it before answering; move further verbose searches into subagents. The symptom is context degradation, not a missing instruction or a model limit.'],
  ['You spawn a subagent for phase 2 and it re-investigates modules phase 1 already mapped. Why, and what fixes it?', 'Subagents do not inherit the parent conversation or earlier tool results. Summarize phase 1 findings and inject them into the phase 2 subagent\'s initial prompt.'],
  ['A four-hour multi-agent analysis crashes. Which design lets it resume without repeating work?', 'Each agent exports its findings to a known location; the coordinator maintains a manifest (status, scope, artifact path, input hash), loads it on resume, skips complete tasks, re-runs in-progress/pending ones with the recorded scope and injects completed findings into prompts.'],
  ['Why write facts to NOTES.md before running <code>/compact</code>?', 'Compaction is a lossy summary; exact paths, line numbers and early instructions can be dropped. Files survive compaction and can be re-read; compaction instructions reduce but do not eliminate loss.'],
  ['The main agent needs to know which test files cover billing. Should it Glob and Read them itself?', 'Delegate to a read-only explorer subagent ("find all test files for billing") that returns a condensed list. The raw listing and file reads stay out of the main context, which keeps coordinating.']
])}
${H.src([['Effective context engineering for AI agents', 'https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents'], ['Effective harnesses for long-running agents', 'https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents'], ['Claude Code best practices', 'https://code.claude.com/docs/en/best-practices'], ['Agent SDK: subagents', 'https://code.claude.com/docs/en/agent-sdk/subagents'], ['Multi-agent research system', 'https://www.anthropic.com/engineering/multi-agent-research-system']])}`;
    }
  });

  /* ------------------------------------------------------------------ 5.5 */
  CCAR.lessons.push({
    id: 'hb-55-human-review', track: 'handbook', part: 'P5', num: '5.5', order: 505, domain: 'D5',
    objs: ['O22'], ts: ['5.5'], minutes: 30,
    title: 'Human review workflows and confidence calibration',
    summary: 'Why a 97% aggregate is not a license to automate, how to validate by document type and field, calibrate field-level confidence with labeled data, route and prioritize human review, and keep measuring with stratified sampling.',
    body: function () {
      return `
<p>Extraction pipelines (invoices, claims, contracts, lab reports) reach a point where someone asks: "accuracy is 97%, can we stop reviewing?" The architect's job is to answer with segment-level evidence, not with the headline number. In production the cost of a wrong automation decision is silent: bad values flow into ledgers and nobody looks. The exam probes four ideas: aggregates hide weak segments, confidence must be <b>field-level and calibrated</b> against labeled data, humans get the <b>low-confidence and ambiguous/contradictory</b> cases, and <b>stratified random sampling</b> of high-confidence output continues after automation.</p>

<h3>Why 97% can be the wrong number to trust</h3>
<p>A worked example. Overall accuracy on a month of documents is 97.4%, which is reported as "97%". Broken down:</p>
${H.table(['Document type', 'Share of volume', 'Field-level accuracy', 'Contribution'], [
  ['Typed PDF invoices', '70%', '99.2%', '69.4 pts'],
  ['Scanned invoices', '20%', '96.5%', '19.3 pts'],
  ['Handwritten claim forms', '7%', '<b>88.0%</b>', '6.2 pts'],
  ['Multi-currency invoices', '3%', '<b>84.0%</b>', '2.5 pts'],
  ['<b>Aggregate</b>', '100%', '<b>97.4%</b>', 'dominated by the easy 70%']
])}
${H.table(['Field (all types)', 'Accuracy', 'Impact of an error'], [
  ['invoice_number', '99.6%', 'Duplicate detection fails'],
  ['vendor_name', '99.1%', 'Wrong payee lookup'],
  ['total_amount', '98.9%', 'Direct financial loss'],
  ['currency', '96.0% (84% on multi-currency)', 'Amount wrong by the exchange rate'],
  ['due_date', '93.0%', 'Late fees or early payment'],
  ['date_of_loss (claim forms)', '<b>79.0%</b>', 'Coverage decision on the wrong policy period']
])}
<p>The aggregate is a volume-weighted average, so a large easy segment hides small hard ones. Automating "everything above the 97% bar" would auto-accept a field that is wrong one time in five.</p>
${H.box('rule', 'Validate by segment before automating:', 'Break accuracy down by <b>document type</b> and by <b>field</b> (and by their combination where volumes allow). Only automate segments that meet the target individually, with enough labeled examples per segment to trust the estimate. Keep weak segments (handwritten forms, multi-currency, date_of_loss) in human review until they improve.')}

<h3>Field-level confidence, and why it must be calibrated</h3>
<p>Have the model return a confidence per field, next to the value and the evidence it used. Document-level confidence hides which field is at risk.</p>
<pre class="code">{
  "document_type": "invoice_multicurrency",
  "fields": {
    "total_amount": { "value": 18450.00, "confidence": 0.93, "evidence": "p.2 'Total due EUR 18.450,00'" },
    "currency":     { "value": "EUR",    "confidence": 0.71, "evidence": "header shows USD, total line shows EUR" },
    "due_date":     { "value": "2026-10-15", "confidence": 0.88, "evidence": "p.1 'Payment due 15/10/2026'" }
  },
  "conflicts": [ { "field": "currency", "detail": "header USD vs total line EUR" } ]
}</pre>
<p>A raw score of 0.93 is not a probability of being right. Models are often over- or under-confident, and differently so per field. <b>Calibration</b> maps raw scores to observed accuracy using a <b>labeled validation set</b> (documents with human-verified ground truth):</p>
<ol class="steps">
<li><b>Collect labels:</b> a validation set that covers every document type and field, including the rare ones.</li>
<li><b>Bucket scores:</b> per field, group predictions into score bands (for example 0.95–1.00, 0.90–0.95, 0.80–0.90, below 0.80).</li>
<li><b>Measure actual accuracy per bucket</b> against the labels. Plotted as predicted confidence vs observed accuracy, this is a <b>reliability diagram</b>: a calibrated field lies on the diagonal; points below it mean overconfidence.</li>
<li><b>Pick a threshold per field</b> so that items at or above it meet that field's target error rate (for example at most 0.5% errors on total_amount, 2% on due_date).</li>
<li><b>Route</b> everything below the threshold to review; re-run calibration when the model, prompt or document mix changes.</li></ol>
${H.table(['total_amount score band', 'Items (labeled)', 'Observed accuracy', 'Decision (target: 99.5%)'], [
  ['0.95–1.00', '4,120', '99.7%', 'Auto-accept'],
  ['0.90–0.95', '1,310', '98.4%', 'Review (below target despite high raw score)'],
  ['0.80–0.90', '640', '91.0%', 'Review'],
  ['below 0.80', '230', '72.0%', 'Review, high priority']
])}
<p>Here the calibrated threshold for total_amount is 0.95, not 0.90. A different field (vendor_name, with a looser target) might accept 0.85. One global threshold would be too strict for some fields and too loose for others.</p>
<pre class="code"># Python sketch: pick the lowest threshold per field that meets its target accuracy
def pick_threshold(scored, target):            # scored: list of (confidence, is_correct) for ONE field
    for t in [0.80, 0.85, 0.90, 0.95, 0.98]:
        kept = [ok for conf, ok in scored if conf &gt;= t]
        if len(kept) &gt;= 200 and sum(kept) / len(kept) &gt;= target:
            return t
    return None                                 # no safe threshold: keep the field in human review</pre>
<p class="small muted">The minimum sample size per bucket (200 here) is a design choice: small buckets give unreliable accuracy estimates.</p>

<h3>What goes to a human</h3>
${H.table(['Route to review when', 'Example', 'Why confidence alone is not enough'], [
  ['Calibrated confidence below the field threshold', 'total_amount at 0.91', 'The core routing signal'],
  ['Source document is <b>ambiguous or contradictory</b>', 'Stated total differs from the sum of line items; header currency differs from total line; two bank accounts; two different dates of loss', 'The model can be confident about one reading of a document that is itself inconsistent'],
  ['Deterministic validation fails', 'Due date before invoice date; VAT number fails checksum', 'Code catches semantic errors the schema cannot'],
  ['Segment not yet validated for automation', 'New vendor layout, handwritten form type', 'No evidence the segment meets target'],
  ['Required value absent from the document', '"See attached PO" with no PO', 'Nobody can extract it; a human must fetch it']
])}

${D({ w: 760, h: 330, title: 'Review routing with calibration and ongoing sampling',
  nodes: [
    { id: 'doc', x: 20, y: 30, w: 140, h: 46, label: 'Documents', sub: 'many types and layouts', kind: 'store' },
    { id: 'ex', x: 200, y: 30, w: 170, h: 56, label: 'Extraction', sub: 'value + field confidence', kind: 'agent' },
    { id: 'val', x: 200, y: 120, w: 170, h: 50, label: 'Validation checks', sub: 'sums, dates, conflicts', kind: 'tool' },
    { id: 'cal', x: 20, y: 200, w: 160, h: 56, label: 'Calibration', sub: 'labeled set, per-field cutoffs', kind: 'tool' },
    { id: 'rt', x: 230, y: 210, w: 150, h: 56, label: 'Router', sub: 'threshold + segment + flags', kind: 'agent' },
    { id: 'q', x: 440, y: 30, w: 290, h: 56, label: 'Human review queue', sub: 'ordered by risk x value, conflicts first', kind: 'human' },
    { id: 'ok', x: 440, y: 130, w: 290, h: 46, label: 'Auto-accepted', sub: 'high confidence, validated segments', kind: 'good' },
    { id: 'smp', x: 440, y: 210, w: 290, h: 50, label: 'Stratified random sample', sub: 'per type x field x band, to humans', kind: 'note' },
    { id: 'fb', x: 440, y: 280, w: 290, h: 40, label: 'Feedback store', sub: 'corrections to evals, examples', kind: 'store' }
  ],
  edges: [{ from: 'doc', to: 'ex' }, { from: 'ex', to: 'val' }, { from: 'val', to: 'rt' }, { from: 'cal', to: 'rt', label: 'thresholds' }, { from: 'rt', to: 'q', label: 'low / ambiguous' }, { from: 'rt', to: 'ok', label: 'high' }, { from: 'ok', to: 'smp', label: 'sample' }, { from: 'smp', to: 'fb', dashed: true }, { from: 'fb', to: 'cal', dashed: true, label: 'recalibrate' }],
  caption: 'Routing uses calibrated per-field thresholds plus document-level flags. Auto-accepted output is still sampled, stratified by segment, so error rates stay measured and new failure patterns surface. Reviewer corrections flow back into calibration, prompts, few-shot examples and evals.' })}

<h3>Prioritizing limited reviewer capacity</h3>
<p>Reviewer hours are finite, so the queue needs an order, not just a filter. A practical priority combines <b>probability of error</b> (1 minus calibrated confidence), <b>impact</b> (amount, regulatory or coverage-deciding fields) and <b>deadline</b> (SLA age).</p>
${H.table(['Queue tier', 'Contents', 'Reason'], [
  ['1', 'Contradictory documents on high-impact fields; low confidence on large amounts', 'Highest expected loss'],
  ['2', 'Below-threshold high-impact fields (total_amount, date_of_loss)', 'Likely errors that matter'],
  ['3', 'Below-threshold low-impact fields; unvalidated new layouts', 'Needed, lower cost of delay'],
  ['4', 'Stratified audit sample of auto-accepted items', 'Measurement; small fixed daily quota so it is never starved']
])}
<p>Show reviewers only the flagged fields with the evidence excerpt and page, not the whole document to re-key. Field-level routing is what makes review capacity go further.</p>

<h3>Stratified random sampling of high-confidence output</h3>
<p>Automation does not end measurement. A random sample of auto-accepted extractions goes to humans so you keep an <b>ongoing error-rate estimate</b> and catch <b>novel error patterns</b> (a vendor changed its template, a new form version appeared).</p>
${H.table(['Design', 'Auto-accepted per day', 'Sample', 'Multi-currency items reviewed', 'Result'], [
  ['Uniform 1%', '10,000', '100', 'about 3', 'Error rate for rare segments is unmeasurable; a new failure in a 3% segment can go unseen for weeks'],
  ['Stratified by type x field x confidence band', '10,000', '~100 (e.g. 12 per stratum)', '12', 'Every segment gets a usable estimate; weight strata back by volume for the overall rate']
])}
<ul>
<li><b>Strata:</b> document type, field group, confidence band, and optionally source (vendor, channel). Oversample small or high-impact strata.</li>
<li><b>Random within strata:</b> still random, so the estimate is unbiased for each stratum. Hand-picked "interesting" items are not.</li>
<li><b>Two purposes:</b> estimating error per segment (is the threshold still right?) and discovery (reviewers tag new error patterns).</li></ul>

<h3>Drift monitoring and feedback loops</h3>
${H.table(['Signal', 'Watch for', 'Action'], [
  ['Sampled error rate per stratum', 'A stratum exceeds its target', 'Raise that field\'s threshold or return the segment to full review; investigate'],
  ['Confidence distribution per field', 'Shift in the score histogram', 'Input mix or layouts changed; recalibrate'],
  ['New layouts / vendors / form versions', 'Unrecognized document traits', 'Route to review until validated'],
  ['Model or prompt change', 'Any change', 'Re-run the labeled validation set and recalibrate before switching traffic']
])}
<p>Reviewer corrections are the best training signal you have. Record them structurally (field, extracted value, corrected value, error pattern) and feed them into: few-shot examples for the failing layouts, normalization rules in the prompt, the regression eval set, and the calibration data. Keep the calibration set built from random samples: the review queue alone over-represents low-confidence items and would bias the estimate.</p>

<h3>Every exam skill, mapped</h3>
${H.table(['Exam skill (5.5)', 'How to do it', 'Why'], [
  ['Stratified random sampling of high-confidence extractions', 'Sample auto-accepted items per stratum (type, field, band) for human verification', 'Ongoing error rate per segment; novel pattern detection'],
  ['Analyze accuracy by document type and field before reducing review', 'Segment tables like the ones above, with sample sizes', 'Aggregates hide weak segments'],
  ['Field-level confidence, thresholds calibrated on labeled validation sets', 'Per-field bucket accuracy, per-field threshold meeting target error', 'Raw scores are not probabilities'],
  ['Route low-confidence and ambiguous/contradictory documents to humans, prioritizing capacity', 'Router on threshold + validation + conflict flags; queue ordered by risk and value', 'Human attention goes where errors are likely and costly']
])}

<h3>Design decisions</h3>
${H.table(['If the situation is', 'Choose', 'Because', 'You give up'], [
  ['Aggregate looks great, segments unknown', 'Segment analysis on labeled data first', 'Automation needs per-segment evidence', 'Time before cost savings'],
  ['One field is weak, others strong', 'Field-level routing: auto-accept strong fields, review the weak one', 'Review only what is at risk', 'More complex review UI'],
  ['Reviewer capacity is fixed and short', 'Risk x value queue ordering plus a small fixed audit quota', 'Maximizes errors caught per hour while keeping measurement', 'Low-impact items wait longer'],
  ['Segment is rare but high impact', 'Oversample it in the audit strata', 'Otherwise its error rate is unmeasurable', 'Sample is not proportional (reweight for totals)'],
  ['Model or prompt upgrade', 'Recalibrate on the labeled set before rollout', 'Calibration is model- and prompt-specific', 'An extra validation run']
])}

${H.box('real', 'Real-world notes:', 'Use human reviewers as the gold standard to calibrate any model-based grader you add, and measure inter-reviewer agreement on a subset (humans disagree too). Log per-field decisions with thresholds and model version for audit. Use strict tool use or structured outputs so confidence fields are always present and typed, and validate semantics in code. Watch reviewer fatigue: a queue padded with easy items trains people to click "approve".')}
${H.box('exam', 'Exam note:', 'The exam guide says "having models output field-level confidence scores, then calibrating review thresholds using labeled validation sets". The key words are field-level and calibrated. Elsewhere (5.2) the guide calls self-reported confidence an unreliable escalation proxy; raw and uncalibrated is the problem, not the existence of a score.')}
${H.box('trap', 'Distractors for 5.5:', '<b>Uniform random 5% sample as the routing rule</b> (fine for measurement, wastes reviewers on easy documents and misses rare segments). <b>Raw self-reported confidence as the threshold</b> (uncalibrated, differs per field). <b>Document-level confidence</b> (hides which field is wrong). <b>Agreement across three runs means correct</b> (consistent errors agree too). <b>Automate because the aggregate passed</b> (weak segments hidden). <b>Stop sampling after accuracy is confirmed</b> (drift and new layouts go unnoticed). <b>Route by crude proxies</b> such as page count or sentiment (not related to extraction error).')}

<h3>Worked scenario</h3>
<p>An insurer extracts claim data from typed forms, scanned forms and handwritten forms. Overall accuracy on a 5,000-document labeled set is 97%. Leadership wants to remove human review for all extractions with confidence above 0.9. Reviewers can handle about 800 documents a day out of 12,000.</p>
<ol class="steps">
<li><b>Segment:</b> typed forms 99.4%, scanned 97%, handwritten 88%; the field date_of_loss is 79% on handwritten forms.</li>
<li><b>Calibrate per field:</b> on handwritten forms, date_of_loss items with raw confidence 0.90–0.95 are only 86% correct. The 0.9 global threshold is unsafe; set per-field thresholds from the bucket tables, and keep handwritten date_of_loss in review.</li>
<li><b>Route:</b> below-threshold fields, forms where two dates of loss appear, and failed validation checks go to review, with high-value claims first.</li>
<li><b>Audit:</b> a stratified daily sample of auto-accepted items (by form type, field and band) fills a fixed slice of reviewer capacity.</li>
<li><b>Feedback:</b> corrections update few-shot examples for handwritten layouts and the eval set; recalibrate monthly or on any model change.</li></ol>
<p>Answer pattern: segment-level validation, calibrated per-field thresholds, targeted routing including contradictory documents, and continued stratified sampling. Not a global threshold on the aggregate.</p>

${H.check([
  ['Accuracy is 97% overall. The team proposes to auto-approve every extraction. What must you check first?', 'Accuracy by document type and by field on a labeled set. A volume-weighted aggregate can hide a weak segment (for example 79% on date_of_loss). Automate only segments that meet the target individually.'],
  ['The model reports confidence 0.93 on a field. Can you use 0.9 as the auto-accept threshold?', 'Not without calibration. Bucket scores per field on a labeled validation set, measure actual accuracy per bucket, and pick a per-field threshold that meets that field\'s target error rate. In the example, 0.90–0.95 was only 98.4% accurate for total_amount.'],
  ['Why stratified rather than uniform random sampling for auditing auto-accepted output?', 'Uniform sampling mirrors volume, so rare segments get a handful of items and their error rates (and novel failures) are invisible. Stratifying by type, field and confidence band gives every segment a usable estimate; reweight for the overall rate.'],
  ['A high-confidence invoice has a stated total that differs from the sum of its line items. Where does it go?', 'Human review. Contradictory source documents are a routing trigger regardless of confidence; the model may confidently extract one reading of an inconsistent document.'],
  ['Three independent runs return the same value for a field. Is that enough to skip review?', 'No. Consistent errors (a misread layout, a wrong normalization rule) agree across runs. Agreement is not calibrated accuracy.'],
  ['Six months after automation, what keeps the system trustworthy?', 'Continued stratified sampling with per-stratum error tracking, confidence-distribution drift monitoring, recalibration on model/prompt changes, and reviewer corrections fed into examples, prompts and evals.']
])}
${H.src([['CCAR-F Exam Guide v1.0, task 5.5 (docs/_ref/exam-guide.txt)', '#/study'], ['Demystifying evals for AI agents', 'https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents'], ['Structured outputs', 'https://platform.claude.com/docs/en/build-with-claude/structured-outputs'], ['Prompting best practices', 'https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices']])}`;
    }
  });

  /* ------------------------------------------------------------------ 5.6 */
  CCAR.lessons.push({
    id: 'hb-56-provenance', track: 'handbook', part: 'P5', num: '5.6', order: 506, domain: 'D5',
    objs: ['O19', 'X10', 'O18'], ts: ['5.6'], minutes: 30,
    title: 'Provenance and uncertainty in multi-source synthesis',
    summary: 'Keep claim-source mappings intact from subagent to final report, annotate conflicting statistics instead of picking or averaging, carry dates so time differences are not read as contradictions, and structure and verify the report.',
    body: function () {
      return `
<p>Multi-agent research systems compress information at every hop: search subagents summarize pages, analysis subagents summarize documents, the synthesis agent summarizes summaries. Each compression is a chance to lose <b>which source said what</b>, <b>when</b>, and <b>how it was measured</b>. In production that produces reports nobody can audit, confident numbers that no source actually reported, and "contradictions" that are really two different years. The exam probes whether you design provenance into the data flow (structured claim-source mappings, dates, conflict annotations, a report structure that separates established from contested findings) rather than bolting citations on at the end.</p>

<h3>How attribution gets lost</h3>
<div class="two"><div><h4 class="bad-h">Summary-shaped handoff</h4><pre class="code">{
  "summary": "Studies suggest grid battery costs fell
    20-40% recently, with further declines expected.",
  "sources": ["https://.../lab-report-2024",
              "https://.../analyst-note"]
}</pre><p class="small">Which source says 20%? Which says 40%? Over what period? Observed or projected? No later step can recover it.</p></div>
<div><h4 class="good-h">Claim-level handoff</h4><pre class="code">{
  "claim_id": "c-017",
  "claim": "4-hour Li-ion system cost fell 22% (2022 to 2024)",
  "value": 22, "unit": "%", "metric": "installed cost per kWh",
  "claim_type": "observed",
  "source": {
    "url": "https://example.org/lab-report-2024",
    "document_name": "Utility-Scale Storage Cost Report 2024",
    "page": 14,
    "excerpt": "installed costs declined 22% between 2022 and 2024",
    "published": "2024-06",
    "data_period": "2022-2024"
  },
  "method": "survey of 38 commissioned projects"
}</pre></div></div>
<p>The rule: <b>compress prose, never compress the mapping</b>. Every claim that reaches the report carries its own source record.</p>

${D({ w: 760, h: 320, title: 'Provenance-preserving research pipeline',
  nodes: [
    { id: 'c', x: 20, y: 130, w: 150, h: 60, label: 'Coordinator', sub: 'plans, reconciles', kind: 'agent' },
    { id: 's1', x: 210, y: 20, w: 170, h: 50, label: 'Web search subagent', sub: 'claim records + dates', kind: 'sub' },
    { id: 's2', x: 210, y: 90, w: 170, h: 50, label: 'Document analysis', sub: 'conflicts annotated', kind: 'sub' },
    { id: 's3', x: 210, y: 160, w: 170, h: 50, label: 'Data subagent', sub: 'tables with periods', kind: 'sub' },
    { id: 'st', x: 210, y: 240, w: 170, h: 56, label: 'Claim store', sub: 'claim_id, sources[], dates', kind: 'store' },
    { id: 'rc', x: 420, y: 130, w: 150, h: 60, label: 'Reconciliation', sub: 'coordinator decides', kind: 'tool' },
    { id: 'sy', x: 600, y: 40, w: 140, h: 56, label: 'Synthesis', sub: 'preserves + merges maps', kind: 'sub' },
    { id: 'cv', x: 600, y: 130, w: 140, h: 56, label: 'Citation check', sub: 'excerpt supports claim', kind: 'good' },
    { id: 'r', x: 600, y: 230, w: 140, h: 56, label: 'Report', sub: 'established vs contested', kind: 'good' }
  ],
  edges: [{ from: 'c', to: 's1' }, { from: 'c', to: 's2' }, { from: 'c', to: 's3' }, { from: 's1', to: 'st', dashed: true }, { from: 's3', to: 'st', dashed: true }, { from: 'st', to: 'rc' }, { from: 'rc', to: 'sy' }, { from: 'sy', to: 'cv' }, { from: 'cv', to: 'r' }],
  caption: 'Subagents write claim records (not prose) to a shared store and pass references. Conflicts arrive annotated; the coordinator decides how to reconcile before synthesis. A citation verification step checks each claim against its excerpt before the report is released.' })}

<h3>The claim-source mapping: fields and why</h3>
${H.table(['Field', 'Purpose', 'Failure it prevents'], [
  ['<code>claim</code>, <code>value</code>, <code>unit</code>, <code>metric</code>', 'The assertion in atomic, comparable form', 'Merging "cost" figures that measure different things'],
  ['<code>source.url</code> / <code>document_name</code> / <code>page</code>', 'Where to check it', 'Unverifiable report; lost attribution'],
  ['<code>source.excerpt</code>', 'The exact supporting text', 'Paraphrase drift; enables citation verification'],
  ['<code>published</code> and <code>data_period</code> (collection date)', 'When it was said and what period it describes', 'Time differences misread as contradictions'],
  ['<code>method</code>, <code>claim_type</code> (observed, modeled, projected)', 'How the number was produced', 'A projection presented as a measurement; a hedge hardened into fact'],
  ['<code>characterization</code> (source\'s own wording: "preliminary", "estimate")', 'Keeps the source\'s confidence level', 'Synthesis upgrading tentative findings'],
  ['<code>subagent</code>, <code>retrieved_at</code>', 'Lineage for debugging', 'Cannot trace which worker introduced an error']
])}

<h3>Synthesis must preserve and merge, not flatten</h3>
<p>When several subagents report the same fact, synthesis merges them into one claim with <b>all</b> supporting sources. When they report different values, it keeps both. Merging needs explicit keys:</p>
<pre class="code">// Merge key: normalized (entity, metric, data_period, unit)
// Same key + compatible values  -&gt; one claim, sources[] = union (dedupe by url + page)
// Same key + different values   -&gt; one claim marked conflict_detected, every value kept with its source
// Different data_period         -&gt; separate claims (a time series, not a conflict)
{
  "key": { "entity": "grid-scale Li-ion (4h)", "metric": "installed cost change", "data_period": "2022-2024", "unit": "%" },
  "values": [
    { "value": 22, "source_ref": "c-017", "method": "survey of 38 projects", "published": "2024-06" },
    { "value": 35, "source_ref": "c-041", "method": "modeled from pack prices", "published": "2024-09" }
  ],
  "conflict_detected": true,
  "conflict_note": "Survey of installed projects vs model based on battery pack prices; different scope",
  "coordinator_decision": "present_both_in_contested_section"
}</pre>

<h3>Conflicting statistics from credible sources</h3>
<p>Two credible sources disagree: one reports 22%, another 35%. The correct behavior is to <b>annotate the conflict with attribution</b> and the methodological context that explains it, not to choose silently.</p>
${H.table(['Wrong strategy', 'Why it fails'], [
  ['Pick one value (most recent, most authoritative, first found)', 'Arbitrary tie-break; discards a credible alternative and hides that a disagreement exists'],
  ['Average them ("about 28%")', 'Produces a number neither source reported and obscures a difference in scope or method'],
  ['Majority vote across sources or runs', 'Suppresses legitimate minority evidence; sources may share one upstream origin'],
  ['Drop both as "uncertain"', 'Throws away sourced evidence the reader needs'],
  ['Report a range with no attribution ("22-35%")', 'Reader cannot tell who says what or why'],
  ['Add "may" to every claim', 'Uniform hedging makes a meta-analysis look as weak as a blog post'],
  ['Ask the model for a 1-10 confidence per claim instead', 'Uncalibrated, and restores neither attribution nor dates']
])}
${H.box('rule', 'Right:', 'Keep every value with its source, method, scope and date; set <code>conflict_detected</code> with a short note on the likely cause; let the <b>coordinator</b> (or a human) decide the reconciliation; present it in a contested section that shows each value with its source\'s characterization.')}

<h3>Temporal data: dates stop false contradictions</h3>
${H.table(['Apparent conflict', 'With dates', 'Correct presentation'], [
  ['Market size $4.1B vs $6.3B', '2021 figure (published 2022) vs 2024 figure (published 2025)', 'Growth over time, a series, not a conflict'],
  ['Adoption 18% vs 31%', 'Survey collected Q1 2023 vs Q3 2024', 'Change between collection periods'],
  ['Forecast 2030: 120 GW vs 150 GW', 'Forecast issued 2022 vs revised forecast issued 2025', 'Forecast revision; cite both with issue dates'],
  ['Price $120 vs $95', 'List price 2023 vs net price 2024', 'Different definitions and periods; both are correct']
])}
<p>Require subagents to output <code>published</code> and <code>data_period</code> (or collection date) as fields. Without them, synthesis cannot tell a trend from a contradiction, and the reader cannot either.</p>

<h3>Document analysis completes with conflicts annotated; the coordinator reconciles</h3>
<p>A document analysis subagent that finds two values for the same figure (a 10-K table says one number, the narrative says another) should <b>finish its analysis</b> and return both values, each with page and excerpt, marked as a conflict. It should not stop, and it should not choose. The coordinator has the wider picture (other sources, the research question, the user's needs) and decides before synthesis:</p>
${H.table(['Coordinator option', 'When'], [
  ['Present both in the contested section with context', 'Credible sources with different methods or scopes'],
  ['Dispatch a targeted follow-up (find the methodology note, a third source)', 'The conflict is material and resolvable'],
  ['Apply an explicit, documented rule (for example, same definition and period only)', 'The values are not actually comparable; record the rule in the report'],
  ['Escalate to a human', 'High-stakes decision depends on the value']
])}

<h3>Report structure</h3>
<pre class="code"># Grid-scale storage costs: synthesis (research cutoff 2026-09)

## 1. Well-established findings        (multiple independent sources agree)
- Installed 4h Li-ion cost declined 2022-2024 [c-017 Lab report 2024 p.14; c-052 Regulator filing 2025 p.3]

## 2. Contested findings                 (credible sources disagree; each value attributed)
| Figure | Value | Source | Method | Data period |
| Cost decline 2022-2024 | 22% | Lab report 2024, p.14 ("survey of commissioned projects") | observed | 2022-2024 |
| Cost decline 2022-2024 | 35% | Analyst note 2024-09 ("modeled estimate") | modeled from pack prices | 2022-2024 |
Why they differ: installed-system survey vs battery-pack price model.

## 3. Trends over time                   (dated figures, not contradictions)
## 4. Emerging / preliminary             (sources describe themselves as preliminary)
## 5. Coverage gaps                      (sodium-ion: no sources; one database unavailable, see 5.3)
## 6. Sources                            (claim_id to full citation)</pre>
<p>Preserve <b>original characterizations</b> ("the authors call this a preliminary estimate") and <b>methodological context</b> (sample size, modeled vs observed). A contested section without the "why they differ" line is only half the job.</p>

<h3>Render by content type</h3>
${H.table(['Content type', 'Render as', 'Why'], [
  ['Financial data (revenue, costs by year, segment figures)', 'Tables with units, periods and a source column', 'Comparison across rows and years is the point'],
  ['News and events', 'Short prose with dates and attribution in the sentence', 'Sequence and context matter more than cells'],
  ['Technical findings (specs, test results, requirements)', 'Structured lists with parameters and conditions', 'Scannable and precise'],
  ['Contested figures', 'Side-by-side table with method and period', 'Makes the disagreement and its cause visible']
])}
<p>Converting everything into one uniform format (all bullets, or all prose) loses structure the reader needs: tables flattened into sentences hide comparisons, and news forced into tables loses narrative.</p>

<h3>Citation verification</h3>
<p>Anthropic's research system ends with a dedicated citation pass that attributes claims to sources. Make it a verification step as well:</p>
<ol class="steps">
<li>Every claim in the report has at least one <code>claim_id</code>; no orphan sentences with numbers.</li>
<li>The excerpt exists in the stored source text (a code check on the saved document).</li>
<li>The excerpt actually supports the claim as worded, including the number, unit and period (a model-based check with an "unsupported" outcome allowed).</li>
<li>Dates and characterizations in the report match the source record.</li>
<li>Failures return to the coordinator as structured issues; do not silently drop or reword the claim.</li></ol>

<h3>Every exam skill, mapped</h3>
${H.table(['Exam skill (5.6)', 'How to do it', 'Why'], [
  ['Subagents output structured claim-source mappings (URLs, document names, excerpts) preserved through synthesis', 'Output schema with a source record per claim; synthesis merges by key and keeps all sources', 'Summaries lose attribution'],
  ['Report sections for well-established vs contested findings, with original characterizations and methods', 'Fixed report template; contested table with method, period, source wording', 'Reader sees the real state of evidence'],
  ['Document analysis completes with conflicts included and annotated; coordinator reconciles', '<code>conflict_detected</code> with all values; coordinator decision recorded before synthesis', 'The agent with the widest view makes the call'],
  ['Subagents include publication or collection dates', '<code>published</code>, <code>data_period</code> required in the schema', 'Temporal differences are not contradictions'],
  ['Render content types appropriately', 'Tables for financial, prose for news, lists for technical', 'Uniform formatting hides structure']
])}

<h3>Design decisions</h3>
${H.table(['If the situation is', 'Choose', 'Because', 'You give up'], [
  ['Subagents return long prose and URL lists', 'Claim-level schema with excerpts and dates', 'Attribution survives every hop', 'More output tokens per finding'],
  ['Synthesis agent has a tight context budget', 'Compact claim records plus file references to full documents', 'Keeps provenance without page dumps', 'An extra read if detail is needed'],
  ['Two credible values conflict', 'Annotate, coordinator decides, contested section', 'Honest and auditable', 'A single clean headline number'],
  ['Values differ only by period', 'Present as a time series', 'It is change, not conflict', 'Nothing'],
  ['High-stakes report (regulatory, investment)', 'Citation verification pass plus human sign-off on contested items', 'Catches unsupported claims before release', 'Latency and cost']
])}

${H.box('real', 'Real-world notes:', 'Store fetched source text (or a hash and a snapshot) at retrieval time: pages change, and verification needs the version the claim came from. Check whether "independent" sources share one upstream origin before calling a finding well-established. Treat fetched web content as untrusted input (it can contain prompt injection) and keep excerpts as data, not instructions. Evaluate with a rubric that checks attribution correctness, and read transcripts where the synthesis changed a value.')}
${H.box('exam', 'Exam note:', 'Pair 5.6 with 5.3: the report\'s coverage-gap section is where structured errors from failed subagents surface ("database unavailable, sodium-ion not covered"). The exam guide spawns subagents with the <b>Task</b> tool; current SDK name is <b>Agent</b>. Either way, a subagent sees only its prompt, so the synthesis prompt must contain the claim records themselves or paths to them.')}
${H.box('trap', 'Distractors for 5.6:', '"Have the synthesis agent add citations at the end from the source list" (mapping already lost). "Use the most recent value" or "average the values" (arbitrary; hides method differences). "Stop the document analysis when conflicting values are found" (the coordinator needs the complete analysis). "Let the analysis subagent pick the more reliable value" (it lacks the wider view). "Normalize everything into bullet points for consistency" (loses table and narrative structure). "Treat the 2021 and 2024 figures as a contradiction" (missing dates).')}

<h3>Worked scenario</h3>
<p>A research system produces a market brief. The final report says "the market is about $5.2B" and cites five URLs at the bottom. A reviewer finds that one source reported $4.1B for 2021, another $6.3B for 2024, and nobody reported $5.2B. Separately, a document analysis subagent stopped early after finding two different revenue figures in one annual report.</p>
<ol class="steps">
<li><b>Root cause:</b> subagents returned prose summaries with URL lists, so synthesis could not tell which figure came from where or when; it averaged two dated figures into an invented number.</li>
<li><b>Fix the schema:</b> subagents output claim records with url, document name, page, excerpt, published date and data period.</li>
<li><b>Fix synthesis:</b> merge by (entity, metric, period, unit); the two market figures become a dated series, not a single value.</li>
<li><b>Fix document analysis:</b> complete the analysis and return both revenue figures with pages and excerpts, flagged as a conflict; the coordinator checks the definitions (segment vs consolidated revenue) and decides before synthesis.</li>
<li><b>Fix the report:</b> established, contested (with methods) and trend sections; financial figures in tables; a citation verification pass before release.</li></ol>

${H.check([
  ['A synthesis report cites sources only as a list at the end, and reviewers cannot trace individual numbers. What change fixes this at the root?', 'Require subagents to output structured claim-source mappings (claim, value, URL, document name, page, excerpt, dates) and require synthesis to preserve and merge them. Attribution is lost when findings are compressed into prose; it cannot be reconstructed at the end.'],
  ['Two credible sources report 22% and 35% for the same metric and period. What should the report do?', 'Show both values in a contested section, each with its source, method and characterization, and explain the likely cause (observed survey vs modeled estimate). Do not average, pick the newest, or drop them.'],
  ['One source says adoption is 18%, another 31%. The analyst flags a contradiction. What was missing?', 'Publication and data-collection dates. With them (Q1 2023 vs Q3 2024) this is change over time. Require dates in subagent output so synthesis interprets temporal differences correctly.'],
  ['A document analysis subagent finds two conflicting revenue figures in one filing. What should it do?', 'Complete the analysis and return both values with page and excerpt, marked as a conflict. The coordinator, which has the wider context, decides how to reconcile before synthesis.'],
  ['Why not format the whole report as bullet points for consistency?', 'Content types need different rendering: financial data as tables (comparisons), news as prose (sequence and context), technical findings as structured lists. A uniform format hides structure.'],
  ['What does a citation verification step check?', 'That every claim has a claim_id, the excerpt exists in the stored source, the excerpt supports the claim as worded (number, unit, period), and dates and characterizations match. Failures go back to the coordinator as structured issues.']
])}
${H.src([['Multi-agent research system', 'https://www.anthropic.com/engineering/multi-agent-research-system'], ['Prompting best practices (long context, grounding in quotes)', 'https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices'], ['Agent SDK: subagents', 'https://code.claude.com/docs/en/agent-sdk/subagents'], ['CCAR-F Exam Guide v1.0, task 5.6 (docs/_ref/exam-guide.txt)', '#/study']])}`;
    }
  });
})();
