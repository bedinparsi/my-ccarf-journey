/* Architect Handbook · Part 3 (b): plan mode vs direct execution, iterative refinement, Claude Code in CI/CD. */
(function () {
  var H = CCAR.hb, D = H.D;

  /* ------------------------------------------------------------------ 3.4 */
  CCAR.lessons.push({
    id: 'hb-34-plan-mode', track: 'handbook', part: 'P3', num: '3.4', order: 304, domain: 'D3',
    objs: ['O08', 'X12'], ts: ['3.4'], minutes: 25,
    title: 'Plan mode vs direct execution (and multi-phase workflows)',
    summary: 'When to explore and design read-only before touching code, when to just make the change, how the Explore subagent protects context, and how to chain plan, approval and execution into one workflow.',
    body: function () {
      return `
<p>Claude Code can either act immediately (direct execution) or first explore the codebase read-only and produce a plan you approve (plan mode). The choice decides how much rework you pay for. A wrong guess on a monolith split costs days; a plan-mode ceremony for a one-line null check wastes minutes and attention. The exam probes whether you read the <b>scope signals in the stem</b>: size, number of valid approaches, architectural impact, and whether the complexity is already known. It also tests the Explore subagent and the "plan, then execute" combination.</p>

<h3>The two modes, precisely</h3>
${H.table(['', 'Plan mode', 'Direct execution'], [
  ['What Claude does', 'Reads, searches and reasons about the code, then proposes an approach. Does not edit files or run modifying commands.', 'Reads and edits files, runs commands, iterates on tests'],
  ['Output', 'A plan: affected files, sequence of changes, decisions and open questions, risks', 'Code changes (checkpointed, so reversible with Esc+Esc or <code>/rewind</code>)'],
  ['Designed for', 'Large-scale changes, multiple valid approaches, architectural decisions, multi-file modifications', 'Simple, well-scoped changes whose fix is already clear'],
  ['Main benefit', 'Safe exploration and design <b>before</b> committing to changes, so dependencies surface before code exists', 'Speed; no ceremony for work that needs none'],
  ['Main risk if misused', 'Overhead and delay on trivial fixes', 'Costly rework when dependencies or boundaries are discovered late']
])}

<h3>How you enter plan mode</h3>
${H.table(['Surface', 'How', 'Note'], [
  ['Interactive Claude Code', '<b>Shift+Tab</b> cycles the permission modes; stop on plan mode', 'The current mode is shown in the interface. Cycle again to leave plan mode and execute.'],
  ['CLI launch', '<code>claude --permission-mode plan</code>', 'Same flag works with <code>-p</code> for a plan-only CI job'],
  ['Agent SDK', '<code>permissionMode: "plan"</code> (TS) / <code>permission_mode="plan"</code> (Python)', 'Useful for a "planner" step in your own product'],
  ['Built-in Plan subagent', 'Claude can delegate planning research to the built-in Plan agent', 'One-shot; returns a result, not a resumable agent']
])}
<p>Plan mode is one of the permission modes: <code>default</code> (labeled Manual), <code>acceptEdits</code>, <code>plan</code>, <code>auto</code>, <code>dontAsk</code>, <code>bypassPermissions</code>. It is a permission posture (read-only) rather than a separate model or product, which is why the same flag serves interactive, CLI and SDK use.</p>

${D({ w: 760, h: 300, title: 'Plan mode or direct execution?',
  nodes: [
    { id: 'q1', x: 270, y: 10, w: 220, h: 54, label: 'Complexity stated upfront?', sub: 'many files, boundaries, options', kind: 'tool' },
    { id: 'q2', x: 30, y: 110, w: 220, h: 54, label: 'Scope clear and local?', sub: 'one file, stack trace, known fix', kind: 'tool' },
    { id: 'pm', x: 510, y: 110, w: 230, h: 54, label: 'Plan mode', sub: 'read-only explore + design', kind: 'agent' },
    { id: 'd', x: 20, y: 225, w: 160, h: 54, label: 'Direct execution', sub: 'then run the tests', kind: 'good' },
    { id: 'ex', x: 200, y: 225, w: 170, h: 54, label: 'Explore, then decide', sub: 'Explore subagent summary', kind: 'sub' },
    { id: 'gt', x: 395, y: 225, w: 160, h: 54, label: 'Human approval', sub: 'lead review / CI gate', kind: 'human' },
    { id: 'ee', x: 580, y: 225, w: 160, h: 54, label: 'Execute the plan', sub: 'direct, then independent review', kind: 'good' }
  ],
  edges: [
    { from: 'q1', to: 'q2', label: 'no' }, { from: 'q1', to: 'pm', label: 'yes' },
    { from: 'q2', to: 'd', label: 'yes' }, { from: 'q2', to: 'ex', label: 'unsure' },
    { from: 'ex', to: 'pm', dashed: true, label: 'complex' }, { from: 'pm', to: 'gt', label: 'if required' },
    { from: 'gt', to: 'ee' }, { from: 'pm', to: 'ee', dashed: true }
  ],
  caption: 'Read the stem for stated complexity first. If the task already names dozens of files, service boundaries or competing approaches, plan mode is the answer now, not "later if it gets hard". Direct execution is for work whose fix is known.' })}

<h3>Every exam-guide bullet, taught</h3>
${H.table(['Guide bullet', 'How to apply it', 'Why'], [
  ['Plan mode for large-scale changes, multiple valid approaches, architectural decisions, multi-file modifications', 'Enter plan mode, have Claude map dependencies and propose options with trade-offs, approve one', 'Decisions made before code exists are cheap to change'],
  ['Direct execution for simple, well-scoped changes (adding a single validation check to one function)', 'State the change and the verification ("add the check, run the unit tests")', 'Planning adds nothing when there is one obvious approach'],
  ['Plan mode enables safe exploration and design, preventing costly rework', 'Explore read-only first; only after approval does any file change', 'Late-discovered dependencies are the main source of rework'],
  ['Explore subagent isolates verbose discovery and returns summaries', '"Use the Explore subagent to find every caller of X and summarize by module"', 'Hundreds of grep hits stay in the subagent\'s context; the main session gets a short summary'],
  ['Plan mode for architectural tasks: microservice restructuring, library migrations affecting 45+ files, choosing between integration approaches with different infrastructure requirements', 'Plan mode, with explicit questions: boundaries, migration order, infra each option needs', 'Several valid designs exist and the choice is expensive to reverse'],
  ['Direct execution for well-understood changes: a single-file bug fix with a clear stack trace, adding a date validation conditional', 'Point Claude at the file and line, describe the fix, require the failing test to pass', 'The stack trace already did the exploration'],
  ['Explore subagent for verbose discovery phases to prevent context exhaustion in multi-phase tasks', 'Delegate each discovery phase; keep the plan and decisions in the main session', 'Main context stays available for design and implementation'],
  ['Combine plan mode for investigation with direct execution for implementation (plan a library migration, then execute it)', 'Plan mode → approve → switch mode (Shift+Tab) → execute in batches with tests', 'You get the safety of planning and the speed of execution']
])}

<h3>Signals in the stem</h3>
${H.table(['Signal', 'Choose', 'Reason'], [
  ['"Restructure the monolith into microservices", "decisions about service boundaries"', '<b>Plan mode</b>', 'Architectural, dozens of files, several valid designs'],
  ['"Migrate from library A to B; 45+ files use it"', '<b>Plan mode</b>, then direct execution of the approved plan', 'Migration order, adapter vs rewrite, shared helpers'],
  ['"Two ways to integrate: webhook receiver vs polling worker with a queue"', '<b>Plan mode</b>', 'Different infrastructure requirements; choice is costly to reverse'],
  ['"NullPointerException at OrderService.java:212, stack trace attached"', '<b>Direct execution</b>', 'Location and cause are known; one file'],
  ['"Add a check that end_date is after start_date"', '<b>Direct execution</b>', 'One conditional, one obvious approach'],
  ['"Business-critical service, a teammate wants plan mode for safety" on a one-line fix', '<b>Direct execution</b> + tests', 'Criticality does not create architectural complexity; tests and review give safety'],
  ['Started direct; discovery shows the fix changes a cross-service API contract', '<b>Stop and switch to plan mode</b>', 'Scope changed; now there are consumers and options'],
  ['Discovery output floods context; answers turn generic ("typical patterns")', '<b>Explore subagent</b> for discovery, summaries back to main', 'Context exhaustion, not model quality, is the cause'],
  ['"Tech lead must approve the approach before any code changes"', '<b>Multi-phase workflow</b> with an approval gate between plan and execute', 'The gate is a process requirement, enforced outside the model']
])}

<h3>The Explore subagent</h3>
<p>Explore is a built-in, read-only subagent tuned for fast discovery. It runs in its own context window, so its file reads and search results never enter the main conversation; only its final summary returns. Built-in Explore and Plan agents are one-shot (no agent ID to resume later), so ask for everything you need in one delegation.</p>
<pre class="code">Use the Explore subagent to find every import of legacy-http in src/ and packages/.
Return: a table of file, function, usage type (GET/POST/streaming/retry wrapper),
and any custom wrappers around it. Do not include file contents, only the summary.</pre>
${H.box('exam', 'Exam vs current docs:', 'The exam guide calls the subagent-spawning tool <b>Task</b>; current Claude Code and the Agent SDK call it <b>Agent</b>. The Explore subagent behaves the same under either name. If a question asks how to stop discovery output from exhausting context during a multi-phase task, "Explore subagent" is the expected answer.')}

<h3>Plan, then execute: the combined workflow</h3>
<ol class="steps">
<li><b>Explore</b> (plan mode, Explore subagent for bulk discovery): usages, dependencies, tests that cover them.</li>
<li><b>Plan</b>: Claude proposes options and a sequence ("adapter first, migrate module by module, delete adapter last"), with risks and open questions. You edit or approve.</li>
<li><b>Implement</b> (leave plan mode): execute the approved plan in batches, running tests after each batch.</li>
<li><b>Verify and commit</b>: tests, lint, build; an independent review instance for large changes; commit per batch so rollback is cheap.</li></ol>
<p>This is the docs\' recommended explore → plan → implement → commit loop. The plan is also an artifact: save it to a file (for example <code>MIGRATION_PLAN.md</code>) so a fresh session or a CI job can execute it without the exploration history.</p>

<h3>Multi-phase workflows with human approval gates</h3>
<p>When the stem requires human sign-off, put the gate <b>between phases</b> and enforce it with process, not with a prompt. In CI this is separate jobs: a plan job (<code>claude -p --permission-mode plan</code>) publishes the plan as an artifact or PR comment; a protected execution job runs only after a reviewer approves (for example a CI environment with required reviewers); an independent review job checks the result.</p>
${H.table(['Phase', 'Permission posture', 'Output', 'Gate'], [
  ['1. Plan', '<code>plan</code> (read-only)', 'Plan file / PR comment', 'Human approves the plan'],
  ['2. Execute', '<code>acceptEdits</code> with a restricted tool list, or interactive default', 'Commits on a branch', 'Tests and build must pass'],
  ['3. Review', 'Read-only tools, fresh session', 'Structured findings', 'Human merges']
])}

<h3>Design decisions and trade-offs</h3>
${H.table(['If the situation is', 'Choose', 'Because', 'You give up'], [
  ['Complexity is stated upfront (dozens of files, boundaries, competing designs)', 'Plan mode first', 'Rework avoided; dependencies known before edits', 'Some upfront time'],
  ['Fix is known and local', 'Direct execution', 'Fast; tests verify', 'Nothing meaningful'],
  ['Unclear scope, small task', 'Quick Explore delegation, then decide', 'Cheap discovery without polluting context', 'One extra delegation'],
  ['Large plan must survive a long execution', 'Write the plan to a file; execute in a fresh session', 'Clean context for implementation', 'Exploration nuance not in the file'],
  ['Approval is mandatory', 'Multi-phase with an enforced gate', 'Deterministic process control', 'Latency waiting for a human'],
  ['Mixed batch of fixes (lint, local null checks, cross-module changes)', 'Route per item: direct for mechanical and local, plan + approval for cross-module', 'Effort matches risk', 'Routing logic to maintain']
])}

${H.box('real', 'Real-world notes:', 'Plans are only as good as their verification: require each plan step to name the test or command that proves it. Keep execution batches small enough to review and commit separately. On long migrations, track progress in a file (done, in progress, blocked) so a restarted session resumes without re-exploring. Plan mode is read-only, but it still reads files: in untrusted repos, plan mode is not a security boundary against prompt injection in file contents.')}

${H.box('trap', 'Traps:', '<b>"Start direct and let implementation reveal the boundaries"</b> (rework when dependencies surface late). <b>"Direct execution with comprehensive upfront instructions"</b> (assumes you already know the right structure without exploring). <b>"Begin direct, switch to plan only if complexity appears"</b> when the complexity is already stated. <b>"Plan mode for safety"</b> on a one-line, stack-traced fix. <b>"Stay in plan mode and implement"</b>: plan mode does not edit. <b>"Put discovery in the main session and compact later"</b> instead of an Explore subagent.')}

<h3>Worked scenario: sample question 5</h3>
<p>You must restructure a monolith into microservices, touching dozens of files, with decisions about service boundaries and module dependencies. Options: (A) plan mode to explore, understand dependencies and design first; (B) direct execution, letting implementation reveal boundaries; (C) direct execution with comprehensive upfront instructions; (D) direct, switching to plan mode if complexity appears.</p>
<p><b>Reasoning.</b> Every plan-mode signal is present: large-scale, multi-file, multiple valid designs, architectural decisions. B discovers dependencies after code exists, which is the rework plan mode prevents. C presumes the right structure is known before exploring. D ignores that the complexity is already in the requirements. <b>Answer: A.</b> In practice you would add: Explore subagent for the dependency map, a written plan approved by the lead, then direct execution service by service with tests.</p>

${H.check([
  ['A production incident gives you a stack trace pointing at one function that divides by a possibly zero count. The service is critical. Plan mode or direct?', 'Direct execution, plus a regression test. The fix is known and local; criticality raises the verification bar, not the need for architectural exploration.'],
  ['You are migrating date handling from moment to a new library across 52 files. What is the workflow?', 'Plan mode (with the Explore subagent mapping usages and wrappers), approve the plan, then leave plan mode and execute in batches with tests after each. That is the guide\'s "plan the migration, then execute the planned approach".'],
  ['During a direct-execution bug fix, Claude finds the fix requires changing a response field that three other services consume. Next step?', 'Stop and switch to plan mode. The scope has changed to a cross-service contract change with consumers and several possible approaches (versioning, dual-write, coordinated release).'],
  ['In a long planning session, Claude\'s answers become generic after it read hundreds of files. What should you have done?', 'Delegated the verbose discovery to the Explore subagent so only summaries entered the main context; now, summarize findings to a file and continue in a fresh session.'],
  ['Policy says a lead approves every schema-changing plan before code is written. How do you guarantee that in CI?', 'Split into jobs: a plan-only job (<code>--permission-mode plan</code>) publishes the plan, a protected execute job runs only after a required reviewer approves. A prompt saying "wait for approval" is not enforcement.']
])}
${H.src([['Claude Code best practices', 'https://code.claude.com/docs/en/best-practices'], ['Permissions and permission modes', 'https://code.claude.com/docs/en/permissions'], ['Subagents', 'https://code.claude.com/docs/en/sub-agents'], ['CLI reference', 'https://code.claude.com/docs/en/cli-reference'], ['Agent SDK permissions', 'https://code.claude.com/docs/en/agent-sdk/permissions']])}`;
    }
  });

  /* ------------------------------------------------------------------ 3.5 */
  CCAR.lessons.push({
    id: 'hb-35-iterative-refinement', track: 'handbook', part: 'P3', num: '3.5', order: 305, domain: 'D3',
    objs: ['O12', 'O15'], ts: ['3.5'], minutes: 25,
    title: 'Iterative refinement: examples, tests first, interviews and batched feedback',
    summary: 'How to converge quickly when the first result is wrong: concrete input/output examples, test-driven iteration, the interview pattern, one message for interacting issues, and when to reset the session.',
    body: function () {
      return `
<p>The first output is rarely final. What separates a fast team from a slow one is the <b>feedback signal</b> they give Claude on the second and third turn. Vague corrections ("make it handle names better") produce drift; concrete signals (examples, failing tests, a written spec) produce convergence. The exam probes which refinement technique fits which symptom: inconsistent interpretation of prose, missed edge cases, unfamiliar domains, and several problems at once.</p>

<h3>Symptom → technique</h3>
${H.table(['Symptom', 'Technique', 'Why it works'], [
  ['Prose description is interpreted differently each run', '<b>2–3 concrete input/output examples</b>', 'Examples remove ambiguity that words leave open; the most effective way to communicate a transformation'],
  ['Implementation "looks right" but behavior is unverified', '<b>Tests first</b>, then iterate by sharing failures', 'Tests are an objective target and a verification loop Claude can run itself'],
  ['Unfamiliar domain; you do not know what you have not considered', '<b>Interview pattern</b>: Claude asks, you answer, Claude writes a spec', 'Surfaces design questions (cache invalidation, failure modes) before code exists'],
  ['One edge case keeps failing (nulls in a migration)', '<b>Specific test case</b> with example input and expected output', 'Names the exact failing condition instead of "handle edge cases"'],
  ['Several problems whose fixes affect each other', '<b>One detailed message</b> covering all of them', 'Claude designs one coherent fix instead of oscillating'],
  ['Several independent problems', '<b>Sequential</b> iteration, one at a time', 'Each fix is verifiable and attributable'],
  ['Two corrections failed; context full of dead ends', '<b>/clear</b> and re-prompt with what you learned', 'Failed attempts in context keep steering the model']
])}

${D({ w: 760, h: 250, title: 'The refinement loop',
  nodes: [
    { id: 'sp', x: 20, y: 30, w: 180, h: 60, label: 'Specify', sub: 'examples · tests · SPEC.md', kind: 'store' },
    { id: 'im', x: 290, y: 30, w: 180, h: 60, label: 'Implement', sub: 'Claude changes the code', kind: 'agent' },
    { id: 've', x: 560, y: 30, w: 180, h: 60, label: 'Verify', sub: 'run tests, build, lint', kind: 'tool' },
    { id: 'fb', x: 290, y: 150, w: 180, h: 60, label: 'Precise feedback', sub: 'failing output, verbatim', kind: 'human' },
    { id: 'rs', x: 20, y: 150, w: 180, h: 60, label: '/clear + better prompt', sub: 'after 2 failed corrections', kind: 'bad' },
    { id: 'ok', x: 560, y: 150, w: 180, h: 60, label: 'Done', sub: 'all tests green, reviewed', kind: 'good' }
  ],
  edges: [
    { from: 'sp', to: 'im' }, { from: 'im', to: 've' }, { from: 've', to: 'ok', label: 'pass' },
    { from: 've', to: 'fb', label: 'fail' }, { from: 'fb', to: 'im', dashed: true }, { from: 'fb', to: 'rs', label: 'stuck', kind: 'bad' },
    { from: 'rs', to: 'sp', dashed: true }
  ],
  caption: 'Refinement converges when each loop gives Claude an objective signal it can check itself. When it stops converging, reset the context rather than piling on corrections.' })}

<h3>1. Concrete input/output examples</h3>
<p>When "split full names into first, middle and last" keeps producing different results for "Smith, John A." and "María de la Cruz", more prose will not help. Show 2–3 pairs that cover the ambiguous cases, including one edge case. Wrap them in tags so they are clearly examples, not data.</p>
<pre class="code">Convert each customer name to JSON with first, middle, last.
&lt;examples&gt;
&lt;example&gt;in: "Smith, John A."      out: {"first":"John","middle":"A.","last":"Smith"}&lt;/example&gt;
&lt;example&gt;in: "María de la Cruz"    out: {"first":"María","middle":null,"last":"de la Cruz"}&lt;/example&gt;
&lt;example&gt;in: "Prince"              out: {"first":"Prince","middle":null,"last":null}&lt;/example&gt;
&lt;/examples&gt;
Apply the same rules to the rest of the file. If a name fits none of these patterns, keep it in "unparsed".</pre>
<p>Choose examples that differ along the dimension Claude got wrong (comma order, particles, single names). Three near-identical examples teach nothing. Once the examples work, turn them into test cases so the behavior stays fixed.</p>

<h3>2. Test-driven iteration</h3>
<ol class="steps">
<li>Ask Claude to write tests first, covering <b>expected behavior, edge cases and performance requirements</b>. Review the tests: they are the specification.</li>
<li>Run them and confirm they fail for the right reason (no implementation yet).</li>
<li>Ask for the implementation, and tell Claude not to modify the tests.</li>
<li>Run the suite. Share the failures verbatim (test name, assertion, actual vs expected), not a paraphrase.</li>
<li>Repeat until green; commit.</li></ol>
<pre class="code"># tests/test_migrate_customers.py   (written before the migration script)
def test_maps_legacy_status_codes():
    assert migrate_row({"id": 1, "status": "A"})["status"] == "active"

def test_null_email_is_preserved_not_stringified():
    # edge case: legacy rows with NULL email must stay None, never "None" or ""
    assert migrate_row({"id": 2, "status": "A", "email": None})["email"] is None

def test_missing_status_goes_to_review_queue():
    out = migrate_row({"id": 3, "status": None})
    assert out["status"] == "needs_review"

def test_100k_rows_under_time_budget(benchmark_rows):
    # performance requirement stated as a test, not as a hope
    assert run_migration(benchmark_rows).elapsed_seconds &lt; 60</pre>
<p>The null-email test is the guide\'s "specific test case with example input and expected output to fix edge case handling (null values in migration scripts)". "Please handle nulls properly" leaves Claude to guess what "properly" means; the test states it.</p>
${H.box('rule', 'Give Claude a way to verify its own work:', 'Tests, build exit codes, linters and screenshots let Claude check results without you. Options, from soft to hard: say the verification command in the prompt; set a completion condition; a <b>Stop hook</b> that blocks finishing until the suite passes (deterministic); a verification subagent with fresh context.')}

<h3>3. The interview pattern</h3>
<p>For work in a domain you know less well, have Claude interview you before it writes code. It asks about things you may not have anticipated; you answer; it writes a spec; you implement in a <b>fresh session</b> from the spec, so the implementation context is clean.</p>
<pre class="code">I want to add a read-through cache in front of the pricing service.
Before writing any code, interview me with the AskUserQuestion tool. Cover:
cache invalidation (price changes, promotions, TTL vs event-driven), failure modes
(cache down, stale reads, thundering herd), consistency needs per endpoint,
and how we will test it. Ask one topic at a time. When done, write SPEC.md.</pre>
<p>Then <code>/clear</code> (or start a new session) and prompt: "Implement SPEC.md. Write the tests in section 5 first." The spec carries the decisions; the interview transcript does not need to.</p>

<h3>4. One message or several?</h3>
${H.table(['Issues are', 'Example', 'Send', 'Why'], [
  ['<b>Interacting</b>: fixing one changes the right fix for another', 'Date format change affects the sort order and the dedup key; a new retry policy changes the timeout and the idempotency check', 'All issues in <b>one detailed message</b>, with how they relate', 'Sequential fixes would each be locally correct and jointly inconsistent, causing oscillation'],
  ['<b>Independent</b>', 'A typo in a log message, a missing index in an unrelated query, a wrong default in the CLI help', '<b>Sequentially</b>, verifying each', 'Smaller diffs, clear attribution, easy rollback']
])}

<h3>5. When refinement stops converging</h3>
<p>If you have corrected the same thing twice and it is still wrong, the context is now full of failed approaches that keep influencing the output. Run <code>/clear</code> and write a better first prompt that includes what you learned (the examples, the failing test, the constraint you forgot). Other session tools: <b>Esc</b> stops Claude mid-action; <b>Esc+Esc</b> or <code>/rewind</code> restores the conversation, the code, or both to a checkpoint; <code>/clear</code> between unrelated tasks; <code>/btw</code> for side questions that should not enter history.</p>

<h3>Design decisions and trade-offs</h3>
${H.table(['If the situation is', 'Choose', 'Because', 'You give up'], [
  ['Output format or transformation is misread', 'Examples, then encode them as tests', 'Removes ambiguity; tests keep it fixed', 'Time to pick representative examples'],
  ['New feature with clear behavior', 'Tests first', 'Objective, self-checkable target', 'Upfront test writing'],
  ['Unfamiliar domain or unclear requirements', 'Interview → spec → fresh session', 'Surfaces unknowns before code; clean context', 'A slower start'],
  ['Many interacting defects', 'One comprehensive message', 'One coherent design', 'A larger diff to review'],
  ['Many independent defects', 'One at a time', 'Attribution and easy rollback', 'More turns'],
  ['Two failed corrections', '/clear and re-prompt', 'Removes misleading context', 'The conversation history']
])}

${H.box('real', 'Real-world notes:', 'Review generated tests as carefully as code: tests that assert the implementation\'s current output ("snapshot whatever it returns") lock in bugs. Keep tests and examples in the repo, not in chat, so the next session and CI inherit them. When the same correction repeats across sessions, it belongs in CLAUDE.md (mistake twice → CLAUDE.md). Watch for Claude "fixing" a failing test by weakening the assertion; say explicitly that tests are fixed and review diffs to test files.')}

${H.box('trap', 'Traps:', '<b>"Rewrite the instructions in more detail"</b> when examples are the fix for inconsistent interpretation. <b>"Add CRITICAL / MUST in capitals"</b>: current models over-trigger on aggressive emphasis. <b>"Ask Claude to handle edge cases better"</b> without a concrete case. <b>"Fix interacting issues one per message"</b> (oscillation). <b>"Keep correcting in the same session"</b> after repeated failure. <b>"Let Claude write the tests after the implementation"</b> when the goal is test-driven iteration: tests written afterwards describe what the code does, not what it should do.')}

<h3>Worked scenario</h3>
<p>A developer asks Claude to write a script migrating 2 million legacy customer rows. Run one: nulls in <code>email</code> become the string "None", and rows with an unknown status are silently dropped. The developer replies "handle nulls and bad statuses correctly". Run two converts nulls to "" and maps unknown statuses to "active". Also, the date conversion changed to UTC, which now breaks the dedup key built from <code>signup_date</code>.</p>
<p><b>Reasoning.</b> The vague correction left "correctly" to interpretation, twice. The fix is specific test cases with example input and expected output: null email stays null; unknown status goes to a review queue; include one example row per case. The UTC change and the dedup key interact, so describe both in <b>one</b> message ("dates are now UTC; the dedup key must use the UTC date; add a test with a row near midnight"). Since two corrections already failed, <code>/clear</code>, then start with the tests plus a short spec. <b>Answer:</b> tests-first with concrete edge cases, interacting issues in one message, fresh session.</p>

${H.check([
  ['Claude formats changelog entries inconsistently even after you rewrote the formatting paragraph twice. Most effective next step?', 'Give 2–3 concrete input/output examples covering the cases it gets wrong. Examples are the most effective way to communicate a transformation when prose is interpreted inconsistently.'],
  ['You are building a rate limiter in a domain you know little about. How do you start?', 'Interview pattern: ask Claude to interview you (burst handling, distributed state, failure modes, clock skew), have it write a spec, then implement in a fresh session, tests first.'],
  ['Three review comments: a wrong variable name in one module, a misleading log line in another, and a missing test for a third. One message or three?', 'Sequential. They are independent, so fixing one at a time keeps each change small and verifiable.'],
  ['Changing the pagination cursor format also requires changing the cache key and the API docs example. One message or three?', 'One detailed message. The fixes interact; sending them separately invites each change to be made against assumptions the next one breaks.'],
  ['Why write performance requirements as a test?', 'A test makes the requirement objective and checkable by Claude on every iteration; prose like "make it fast" is not verifiable and gets traded away silently.'],
  ['You have corrected Claude\'s approach to error handling twice in the same session and it keeps reverting. What now?', '<code>/clear</code> and re-prompt with a better initial prompt that includes the constraint and a failing test. The failed attempts in context are steering the output.']
])}
${H.src([['Claude Code best practices', 'https://code.claude.com/docs/en/best-practices'], ['Prompting best practices', 'https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices'], ['Hooks', 'https://code.claude.com/docs/en/hooks']])}`;
    }
  });

  /* ------------------------------------------------------------------ 3.6 */
  CCAR.lessons.push({
    id: 'hb-36-cicd', track: 'handbook', part: 'P3', num: '3.6', order: 306, domain: 'D3',
    objs: ['O11', 'O13', 'O15', 'X11'], ts: ['3.6'], minutes: 40,
    title: 'Claude Code in CI/CD pipelines',
    summary: 'Non-interactive runs with -p, validated JSON findings for inline PR comments, tool and budget limits, CLAUDE.md as CI context, independent reviewers, incremental re-reviews, test generation, GitHub Actions, untrusted code and batch vs synchronous workloads.',
    body: function () {
      return `
<p>In CI, nobody is at the keyboard. Claude Code must run without prompting, stay inside a fixed tool surface and budget, load the team\'s standards from the repository, and emit output a script can parse and post. A misconfigured job either hangs, costs too much, ignores the project\'s review criteria, floods the PR with duplicate comments, or (in public repos) runs untrusted code with your secrets. This whole scenario ("Claude Code for Continuous Integration") is one of the exam\'s six, and you are expected to know the exact flags and which ones do not exist.</p>

${D({ w: 760, h: 300, title: 'A correct CI review job',
  nodes: [
    { id: 'tr', x: 20, y: 20, w: 150, h: 54, label: 'PR opened / new commit', sub: 'pull_request event', kind: 'human' },
    { id: 'co', x: 200, y: 20, w: 170, h: 54, label: 'Checkout', sub: 'CLAUDE.md + .claude/rules', kind: 'store' },
    { id: 'pf', x: 200, y: 140, w: 170, h: 54, label: 'Prior findings', sub: 'last run artifact / comments', kind: 'store' },
    { id: 'cl', x: 405, y: 70, w: 185, h: 70, label: 'claude -p reviewer', sub: 'fresh session, read-only tools', kind: 'agent' },
    { id: 'lm', x: 405, y: 210, w: 185, h: 54, label: 'Limits', sub: '--max-turns · --max-budget-usd', kind: 'tool' },
    { id: 'js', x: 615, y: 20, w: 130, h: 54, label: 'JSON findings', sub: '--json-schema validated', kind: 'good' },
    { id: 'po', x: 615, y: 125, w: 130, h: 54, label: 'Poster script', sub: 'inline PR comments', kind: 'sub' },
    { id: 'hu', x: 615, y: 230, w: 130, h: 54, label: 'Human merges', sub: 'findings are advisory', kind: 'human' }
  ],
  edges: [{ from: 'tr', to: 'co' }, { from: 'co', to: 'cl' }, { from: 'pf', to: 'cl', label: 'new/unaddressed' }, { from: 'lm', to: 'cl' }, { from: 'cl', to: 'js' }, { from: 'js', to: 'po' }, { from: 'po', to: 'hu' }],
  caption: 'Print mode for no hang; project CLAUDE.md for standards; restricted tools for a read-only reviewer; schema-validated JSON for automation; prior findings so re-runs report only what is new; hard limits for cost.' })}

<h3>The flags that matter (and only real ones)</h3>
${H.table(['Flag', 'What it does', 'CI use', 'Pitfall'], [
  ['<code>-p</code> / <code>--print</code>', 'Non-interactive: runs the prompt, prints the result, exits', 'Every CI invocation', 'Without it the job waits for input and hangs (sample question 10)'],
  ['<code>--output-format text|json|stream-json</code>', 'Plain text; one JSON result envelope with metadata; streamed JSON events', '<code>json</code> for scripts; <code>stream-json</code> for live logs', '<code>json</code> alone does not validate the shape of your findings'],
  ['<code>--json-schema \'&lt;schema&gt;\'</code>', 'Validated structured output matching your JSON Schema (print mode)', 'Machine-parseable findings for inline PR comments', 'Validates structure, not truth: a wrong line number is still schema-valid'],
  ['<code>--max-turns N</code>', 'Caps agentic turns (print mode)', 'Runaway loop protection', 'A rail, not a design; tune per job'],
  ['<code>--max-budget-usd 5.00</code>', 'Caps spend for the run (print mode)', 'Cost ceiling per PR', 'Check the result for a budget stop rather than treating it as success'],
  ['<code>--tools "Read,Grep,Glob"</code>', 'Restricts which built-in tools exist', 'Read-only reviewer', 'Forgetting Bash when the prompt needs <code>git diff</code>'],
  ['<code>--allowedTools "Bash(git diff *)" "Read"</code>', 'Auto-approves matching calls without prompting', 'Narrow, pre-approved commands', 'Auto-approve is not restriction; pair with <code>--tools</code> or <code>--disallowedTools</code>'],
  ['<code>--disallowedTools "Edit" "Write"</code>', 'Removes / denies tools', 'Guarantee the reviewer cannot modify files', ''],
  ['<code>--permission-mode dontAsk</code>', 'Anything not pre-approved is denied, no prompt', 'Fixed, explicit tool surface for headless runs', '<code>bypassPermissions</code> / <code>--dangerously-skip-permissions</code> only in isolated, disposable environments'],
  ['<code>--append-system-prompt "..."</code>', 'Adds instructions to the default system prompt', 'Role ("read-only reviewer"), output rules, or standards when CLAUDE.md cannot be loaded', '<code>--system-prompt</code> replaces the default prompt entirely'],
  ['<code>--bare</code>', 'Skips auto-discovery of CLAUDE.md, hooks, skills, MCP', 'Untrusted code; minimal, reproducible runs', 'On your own repo it silently drops your review standards'],
  ['<code>--mcp-config</code> / <code>--strict-mcp-config</code>', 'Load MCP servers from a file; use only that config', 'Pin exactly which servers a job may use', ''],
  ['<code>--resume</code> / <code>--continue</code> / <code>--fork-session</code>', 'Continue or branch a prior session', 'Multi-step jobs that must share context', 'Never resume the generating session to review its own output']
])}
${H.box('trap', 'Flags and settings that do not exist:', '<code>--batch</code>, <code>--headless</code>, <code>CLAUDE_HEADLESS=true</code>, <code>--non-interactive</code>, <code>--ci</code>, <code>--max-cost</code>, a <code>.claude/config.json</code> commands array. Redirecting stdin from <code>/dev/null</code> is a Unix workaround, not the documented mode. The answer to "the job hangs waiting for input" is always <code>-p</code>.')}

<h3>Structured findings for inline PR comments</h3>
<p>Inline comments need a file, a line and a message per finding, every time. Prompt-only "respond in JSON" breaks the parser some fraction of runs. <code>--output-format json</code> gives a JSON envelope around the result, and <code>--json-schema</code> makes the structured result conform to your schema. Put the schema in the repo:</p>
<pre class="code">// .github/review-schema.json
{
  "type": "object",
  "properties": {
    "findings": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "file":     { "type": "string", "description": "Repo-relative path" },
          "line":     { "type": "integer", "description": "Line in the new version of the file" },
          "severity": { "type": "string", "enum": ["critical", "high", "medium", "low"] },
          "category": { "type": "string", "enum": ["bug", "security", "performance", "test_gap"] },
          "status":   { "type": "string", "enum": ["new", "still_open"] },
          "message":  { "type": "string", "description": "What is wrong and why, one paragraph" },
          "suggestion": { "type": "string" }
        },
        "required": ["file", "line", "severity", "category", "status", "message"]
      }
    },
    "resolved_prior": { "type": "array", "items": { "type": "string" }, "description": "IDs of prior findings now fixed" }
  },
  "required": ["findings", "resolved_prior"]
}</pre>
<p>Enums keep severity and category machine-routable (block merge on <code>critical</code>, label on <code>security</code>). The poster script still validates semantics in code: the file is in the diff, the line exists, and the finding is not a duplicate.</p>
<pre class="code">claude -p "Review the changes on this branch (git diff origin/main...HEAD) against the
review criteria in CLAUDE.md. Read each changed file in full. prior-findings.json lists
findings already posted on this PR: report only issues that are new or still unaddressed,
and list the IDs of prior findings that are now fixed." \\
  --output-format json \\
  --json-schema "$(cat .github/review-schema.json)" \\
  --tools "Read,Grep,Glob,Bash" \\
  --allowedTools "Bash(git diff *)" "Read" "Grep" "Glob" \\
  --permission-mode dontAsk \\
  --append-system-prompt "You are a read-only reviewer. Report only bugs, security issues, performance regressions and missing tests. Skip style." \\
  --max-turns 25 --max-budget-usd 3.00 &gt; review.json

node .github/scripts/post-inline-comments.js review.json   # validates, dedups, posts</pre>

<h3>CLAUDE.md as the CI project context</h3>
<p>A CI run of <code>claude -p</code> in the checkout loads the project <code>CLAUDE.md</code> and <code>.claude/rules/</code> like an interactive session. That is where the guide wants <b>testing standards, fixture conventions and review criteria</b>: versioned with the code, shared by humans and CI, and reviewed in PRs.</p>
<pre class="code"># CLAUDE.md (excerpt)
## Review criteria
- Report: bugs, security issues (authz, injection, secrets), data loss, perf regressions on hot paths.
- Skip: formatting, naming preferences, patterns used consistently elsewhere in this repo.
- A comment is wrong only when the claimed behavior contradicts the code.

## Testing standards
- pytest; one behavior per test; name tests test_&lt;behavior&gt;_&lt;condition&gt;.
- Use fixtures in tests/fixtures/ (db_session, fake_clock, sample_orders); never hit the network.
- Valuable tests: business rules, edge cases (nulls, empty, boundaries), error paths, regressions.
- Low-value tests (do not write): getters/setters, framework behavior, snapshot of whatever the code returns.</pre>
${H.box('trap', 'The --bare pitfall:', '<code>--bare</code> skips CLAUDE.md, hooks, skills and MCP discovery. Added "to make CI faster", it makes the reviewer ignore every standard above, and reviews turn generic. On your own repo, do not use it (or pass the standards explicitly with <code>--append-system-prompt</code>). Standards in someone\'s <code>~/.claude/CLAUDE.md</code> or baked into a runner image are not shared, not versioned, and absent on other runners.')}

<h3>Session isolation: an independent reviewer</h3>
<p>The session that generated code carries its own reasoning: why it chose each approach, what it assumed. Asked to review, it tends to confirm that reasoning rather than question it. An <b>independent instance</b> without that context reviews the diff as a stranger would and catches more. Extended thinking or "please be critical" does not remove this bias.</p>
${H.table(['Reviewer', 'Independent?', 'Use'], [
  ['Same session that wrote the code ("now review your changes")', 'No', 'Quick self-check only; never the gate'],
  ['<code>--resume</code> or <code>--fork-session</code> of the generating session', 'No: a fork inherits the whole conversation', 'Exploring alternatives, not review'],
  ['New <code>claude -p</code> run on the diff, read-only tools', '<b>Yes</b>', 'The CI review gate (writer/reviewer pattern)'],
  ['Fresh review subagent inside a session', '<b>Yes</b> (own context; only the prompt passes in)', 'Adversarial review before commit']
])}
<p>For large PRs, independence is not enough: the 14-file PR in sample question 12 gets inconsistent depth in one pass. Split into <b>per-file passes</b> for local issues plus a separate <b>integration pass</b> for cross-file data flow (chapter 4.6).</p>

<h3>Re-running reviews after new commits</h3>
<p>On every push, a naive job re-reviews the whole PR and re-posts the same comments. Developers stop reading. Instead: load prior findings (the previous run\'s artifact or the bot\'s existing comments), include them in context with stable IDs, and instruct Claude to report only <b>new or still-unaddressed</b> issues and to list prior findings that are now fixed. The <code>status</code> enum and <code>resolved_prior</code> array in the schema make this checkable; the poster script resolves fixed threads and skips duplicates by file, category and message fingerprint.</p>

<h3>Test generation in CI</h3>
${H.table(['Guide skill', 'How', 'Why'], [
  ['Provide existing test files in context', 'Tell Claude to read the existing tests for the changed modules (or list them in the prompt) before proposing new ones', 'Avoids suggesting scenarios the suite already covers'],
  ['Document testing standards, valuable-test criteria, fixtures in CLAUDE.md', 'Sections like the excerpt above', 'Generated tests use real fixtures and target behavior instead of trivial assertions'],
  ['Measure value, not count', 'Review generated tests; reject tests that snapshot current output', 'Coverage quotas reward low-value tests']
])}
<pre class="code">claude -p "For each module changed in this PR, read its existing tests in tests/ first.
Propose tests only for behaviors and edge cases not already covered. Follow the testing
standards and fixtures in CLAUDE.md. Write new tests to tests/generated/ and run pytest on them." \\
  --tools "Read,Grep,Glob,Write,Bash" --allowedTools "Bash(pytest *)" "Write(tests/generated/**)" \\
  --permission-mode dontAsk --max-turns 40 --max-budget-usd 5.00</pre>

<h3>GitHub Actions: anthropics/claude-code-action@v1</h3>
${H.table(['Aspect', 'Fact', 'Architect note'], [
  ['Setup', 'Quick setup with <code>/install-github-app</code> from Claude Code', 'Or add the workflow and secret manually'],
  ['Interactive mode', 'Responds to <code>@claude</code> mentions in PRs and issues; no <code>prompt</code> input', 'On-demand help: "@claude fix the failing test"'],
  ['Automation mode', 'A <code>prompt</code> input runs on any event, including <code>schedule</code>', 'Review on every PR, nightly jobs'],
  ['<code>claude_args</code>', 'Passes CLI flags: <code>--max-turns</code>, <code>--model</code>, <code>--allowedTools</code>, <code>--mcp-config</code>, <code>--append-system-prompt</code>', 'Same flags as the CLI, same rules'],
  ['Credentials', 'Secrets <code>ANTHROPIC_API_KEY</code> or <code>CLAUDE_CODE_OAUTH_TOKEN</code>; OIDC / workload identity federation, or Bedrock, Vertex, Foundry, to avoid static credentials', 'Never commit keys; prefer short-lived credentials'],
  ['Who can trigger', 'Only users with write access; bots blocked unless listed in <code>allowed_bots</code>', 'Keeps drive-by commenters from spending your budget'],
  ['Standards', 'Reads the repo\'s CLAUDE.md for review standards', 'Same file as local development'],
  ['Cost controls', '<code>--max-turns</code>, workflow timeouts, concurrency limits', 'Cancel superseded runs on new pushes']
])}
<pre class="code"># .github/workflows/claude-review.yml
name: claude-pr-review
on:
  pull_request:
    types: [opened, synchronize]
permissions:
  contents: read
  pull-requests: write
  id-token: write              # only if you authenticate with OIDC
concurrency:
  group: claude-review-\${{ github.event.pull_request.number }}
  cancel-in-progress: true     # a new push cancels the superseded review
jobs:
  review:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: \${{ secrets.ANTHROPIC_API_KEY }}
          prompt: |
            Review PR #\${{ github.event.pull_request.number }} against the review
            criteria in CLAUDE.md. Report only bugs and security issues, as inline comments.
            Do not repeat issues you already commented on that are still unchanged.
          claude_args: |
            --max-turns 15
            --allowedTools "Read,Grep,Glob,Bash(git diff *)"
            --append-system-prompt "You are a read-only reviewer."</pre>

<h3>Untrusted code and fork PRs</h3>
<p>Interactive Claude Code asks you to trust a new workspace before project allow rules and <code>.mcp.json</code> servers apply. <code>claude -p</code> and the SDK never show that dialog. So a job that runs on a stranger\'s code would load <b>their</b> <code>.claude/settings.json</code> hooks, permissions and MCP servers.</p>
${H.table(['Control', 'Effect'], [
  ['<code>--setting-sources user</code>', 'Ignore project and local settings from the checked-out repo'],
  ['<code>--bare</code>', 'Skip discovery of the repo\'s CLAUDE.md, hooks, skills and MCP (here the "pitfall" is the point)'],
  ['<code>--settings \'{"disableAllHooks": true}\'</code>', 'No hook from any source runs'],
  ['Read-only <code>--tools</code>, <code>dontAsk</code>, sandbox or container', 'Limit what injected instructions in file contents could make Claude do'],
  ['No secrets on fork PRs', 'On public repos, GitHub does not pass secrets to workflows from fork PRs; do not work around that by running fork code in a privileged context']
])}

<h3>Batch vs synchronous for CI workloads</h3>
${H.table(['Workload', 'API / mode', 'Why'], [
  ['Blocking pre-merge review or check', 'Synchronous: <code>claude -p</code> or the Messages API', 'A developer is waiting; batches have no latency SLA (up to 24h)'],
  ['Overnight technical-debt report, weekly audit, nightly test-gap analysis over pre-gathered content', '<b>Message Batches API</b> (50% cheaper), correlate by <code>custom_id</code>', 'Nobody is blocked; results are unordered, so match by ID'],
  ['Nightly job that must explore the repo with tools (multi-turn)', 'Scheduled <code>claude -p</code> (automation mode on <code>schedule</code>)', 'Batches cannot run your client tools mid-request']
])}
${H.box('exam', 'Exam note (sample question 11):', 'Manager proposes moving both the pre-merge check and the overnight debt report to batches. Correct: batch only the overnight report. "Batch with a timeout fallback" adds complexity; "keep both real-time because of ordering" is wrong because <code>custom_id</code> solves correlation. Claude Code itself has no <code>--batch</code> flag; batching is a Claude API feature.')}

<h3>Design decisions and trade-offs</h3>
${H.table(['If the situation is', 'Choose', 'Because', 'You give up'], [
  ['Findings feed automation (comments, dashboards, gates)', '<code>--output-format json</code> + <code>--json-schema</code>', 'Parseable every run', 'Schema maintenance'],
  ['Reviewer must never change code', '<code>--tools</code> read-only and/or <code>--disallowedTools "Edit" "Write"</code>, <code>dontAsk</code>', 'Enforced, not requested', 'Cannot auto-fix'],
  ['Standards must apply in CI', 'Committed CLAUDE.md / rules, no <code>--bare</code>', 'Same standards as local work', 'Slightly more context per run'],
  ['Code was generated by Claude in the same pipeline', 'Separate reviewer invocation', 'Avoids self-review bias', 'A second run\'s cost'],
  ['PR gets many pushes', 'Prior findings in context, report new/unaddressed only; cancel superseded runs', 'No duplicate comments; lower cost', 'State to carry between runs'],
  ['Code from forks or unknown contributors', '<code>--setting-sources user</code>, <code>--bare</code>, hooks disabled, no secrets, sandbox', 'Repo cannot configure your agent', 'Project conveniences'],
  ['Non-blocking heavy analysis', 'Batches (single-shot) or scheduled <code>-p</code> (agentic)', '50% or off-peak cost', 'Latency']
])}

${H.box('real', 'Real-world notes:', 'Track false-positive rate per category: one noisy category makes developers ignore the accurate ones, so disable or tighten it rather than tell Claude to "be conservative". Log the JSON envelope (cost, turns, session ID) per run for spend dashboards. Treat budget or turn-limit stops as failures, not as empty reviews. Keep the review advisory at first; make only <code>critical</code> findings merge-blocking once precision is measured. Pin the action major version and review workflow changes like code.')}

${H.box('trap', 'Traps:', '<b>CLAUDE_HEADLESS / --batch / stdin redirect</b> for a hang (use <code>-p</code>). <b>"Respond only in JSON" + regex</b> instead of <code>--json-schema</code>. <b><code>--output-format json</code> alone</b> as schema enforcement. <b>"Do not edit files" in the prompt</b> as the read-only control. <b>Same session reviews its own code</b>, or a fork of it. <b>Re-review everything each push</b> without prior findings. <b>Standards in <code>~/.claude</code> on one runner.</b> <b><code>--dangerously-skip-permissions</code> to stop prompts</b> in a shared runner. <b>Batch for the pre-merge gate.</b>')}

<h3>Worked scenario</h3>
<p>A team\'s pipeline: job 1 has Claude generate a fix for a failing test; job 2 then runs <code>claude --resume $SESSION "Review your changes and output findings as JSON"</code>; a script parses the text with a regex and posts comments. Problems: job 2 occasionally hangs, about 1 run in 10 breaks the parser, every push re-posts the same five comments, and the review approves nearly everything job 1 produced.</p>
<p><b>Reasoning and answer.</b> Hang: no <code>-p</code>. Parser: prompt-only JSON; use <code>--output-format json --json-schema</code> with enums and required <code>file</code>/<code>line</code>. Rubber-stamping: the reviewer resumes the generating session, inheriting its reasoning; run a new, independent <code>claude -p</code> with read-only tools on the diff. Duplicates: pass the prior findings and ask only for new or still-unaddressed issues, with a <code>status</code> field the poster uses to dedup. Add <code>--max-turns</code> and <code>--max-budget-usd</code>, and keep the review criteria in the committed CLAUDE.md.</p>

${H.check([
  ['Your CI step runs <code>claude "Analyze this PR for security issues"</code> and hangs. Logs show it is waiting for input. Fix?', 'Add <code>-p</code>: <code>claude -p "Analyze this PR for security issues"</code>. <code>CLAUDE_HEADLESS</code> and <code>--batch</code> do not exist; redirecting stdin is a workaround, not the documented mode.'],
  ['The review job output is sometimes wrapped in Markdown and breaks the comment poster. Most reliable fix?', '<code>--output-format json</code> with <code>--json-schema</code> defining findings (file, line, enum severity). Prompt instructions and fence-stripping remain probabilistic.'],
  ['CI reviews became generic after someone added <code>--bare</code> to speed up the job. Why?', '<code>--bare</code> skips auto-discovery of CLAUDE.md, rules, hooks, skills and MCP, so the committed review criteria are never loaded. Remove it on your own repo (or pass the standards via <code>--append-system-prompt</code>).'],
  ['Why is a fresh <code>claude -p</code> reviewer better than asking the generating session to review?', 'The generating session keeps its reasoning context and tends to confirm its own choices. An independent instance sees only the diff and the criteria, so it questions assumptions. Forking does not help: a fork inherits the conversation.'],
  ['Generated tests duplicate existing ones and use ad-hoc mocks. Two changes?', 'Put the existing test files in context before generation (so covered scenarios are skipped), and document fixtures, testing standards and valuable-test criteria in CLAUDE.md.'],
  ['A public repo wants Claude to review PRs from forks. What must the job not do?', 'Run with secrets or load the fork\'s project settings, hooks or MCP config. Fork PRs do not receive secrets on public repos; for untrusted code use <code>--setting-sources user</code>, <code>--bare</code>, <code>disableAllHooks</code>, read-only tools and a sandbox.']
])}
${H.src([['CLI reference', 'https://code.claude.com/docs/en/cli-reference'], ['Claude Code GitHub Actions', 'https://code.claude.com/docs/en/github-actions'], ['Claude Code security', 'https://code.claude.com/docs/en/security'], ['Claude Code best practices', 'https://code.claude.com/docs/en/best-practices'], ['Batch processing', 'https://platform.claude.com/docs/en/build-with-claude/batch-processing']])}`;
    }
  });
})();
