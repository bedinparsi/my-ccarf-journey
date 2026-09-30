/* Practice Exam 6, Scenario S5 (Claude Code for Continuous Integration), items 01-08 */
CCAR.addQuestions('exam6', [
  {
    id: 'e6-S5-01', scenario: 'S5', domain: 'D3', obj: 'O13', type: 'single', select: 1,
    stem: `<p>Brightwater Payroll runs an automated review on every pull request to its TypeScript payroll engine (about 310k lines, 40 developers). The review standards live in the repository: CLAUDE.md lists what to report and what to skip, and three files in <code>.claude/rules/</code> cover error handling, API versioning and logging. One rule says functions return the internal <code>Result&lt;T, E&gt;</code> type instead of throwing, and that reviewers must not flag this pattern. To keep the build workspace clean, the platform team wrote this job step:</p>
<pre>WORK=/tmp/review-\${PR_NUMBER}
mkdir -p "$WORK"
git diff origin/main...HEAD &gt; "$WORK/pr.diff"
git diff --name-only origin/main...HEAD | xargs -I{} cp --parents {} "$WORK"
cd "$WORK"
claude -p "Review pr.diff and the changed files. Return findings as JSON." \\
  --output-format json --max-turns 15 &gt; findings.json
node "$CI_TOOLS/post-comments.js" findings.json</pre>
<p>For six weeks, 30 to 40 percent of posted findings have told developers to replace <code>Result</code> returns with exceptions, and several contradict the logging rule. When a developer runs the same prompt locally from the repository, the output respects every documented standard. Job logs show each run ending in 8 to 11 turns, and the comment poster parses <code>findings.json</code> without errors.</p>
<p>Four weeks ago the team moved the job from Opus 5.5 to Sonnet 5.5 to cut cost. The runner image is shared by 60 repositories and rebuilt once a quarter, and the security team wants review standards to change only through the repository's own code review.</p>
<p>Which change fixes the root cause of the ignored standards?</p>`,
    options: [
      `Add <code>--append-system-prompt "Follow the team's documented review standards"</code> to the invocation, so the reviewer is explicitly told on every run to apply the conventions the team has agreed on.`,
      `Raise <code>--max-turns</code> from 15 to 40, so that Claude has enough turns to locate and read the CLAUDE.md and rule files before it starts reviewing the diff and changed files.`,
      `Copy the repository's CLAUDE.md into <code>~/.claude/CLAUDE.md</code> in the shared runner image, so every review job loads the team's standards as user-level memory when it starts.`,
      `Run <code>claude -p</code> from the repository root instead of the copied directory, reading changed files in place and passing the diff as input, so the project CLAUDE.md and rules load.`
    ],
    answer: [3],
    explanation: `Claude Code finds project memory, CLAUDE.md and <code>.claude/rules/</code>, relative to the directory it starts in. The job changes into <code>/tmp/review-\${PR_NUMBER}</code>, which holds only the diff and copies of changed files, so no standards load and the reviewer falls back to generic advice such as preferring exceptions over <code>Result</code>. Local runs work because they start inside the repository. Running from the repository root, reading changed files in place and passing the diff as input restores CLAUDE.md as the way CI-invoked Claude Code receives its review criteria, and the standards stay under the repository's code review. A copy baked into the runner image would act as user-level memory for 60 unrelated repositories, go stale between quarterly rebuilds and still omit the rule files. The Sonnet 5.5 move is noise: it came two weeks after the symptom started, and no model can apply standards it never receives.`,
    rationales: [
      `The instruction asks Claude to follow standards it cannot see: the run starts in a directory with no CLAUDE.md or rule files, so the accepted <code>Result</code> pattern is still unknown.`,
      `Runs already end after 8 to 11 of 15 turns, so turns are not the limit, and the standards files were never copied into the review directory for Claude to find.`,
      `User-level memory on an image shared by 60 repositories applies payroll rules everywhere, goes stale between quarterly rebuilds, bypasses repository review and still omits the three rule files.`,
      `Correct. Starting inside the repository lets Claude Code discover CLAUDE.md and <code>.claude/rules/</code>, which is exactly why the local runs follow the <code>Result</code> and logging standards.`
    ],
    trap: `Restating standards in the prompt instead of starting where project memory loads`,
    signals: `Decisive: the script runs <code>cd "$WORK"</code> into a temporary directory that holds only the diff and copied files, while local runs from the repository follow every standard. Noise: the Sonnet 5.5 move, which came two weeks after the symptom began, the turn counts well under the cap, and the working JSON parser.`
  },
  {
    id: 'e6-S5-02', scenario: 'S5', domain: 'D3', obj: 'O13', type: 'multi', select: 2,
    stem: `<p>Tessellate Robotics reviews every pull request to the Go control software for its warehouse robots with Claude Code. A poster script turns each finding into an inline comment and rejects any input that does not validate against the team's <code>findings.schema.json</code> (file, line, severity, category, message). After the review, the same workspace is packaged into the firmware build, so the platform lead has set two requirements: every run must produce findings that validate against the schema, and the review must never modify the workspace. The current step:</p>
<pre>claude -p "$(cat .ci/review-prompt.md)" \\
  --output-format json \\
  --permission-mode acceptEdits \\
  --max-turns 20 &gt; review.json
node .ci/post-findings.js review.json</pre>
<p>The prompt file, which the pipeline fills with the diff, already ends with "Return only a JSON array that matches findings.schema.json." Even so, the poster rejects about 7% of runs because the <code>result</code> text opens with a sentence of prose or holds a Markdown table. Twice this month the review also corrected a typo it had flagged, and the edited file shipped inside a firmware image. Some runs log permission denials when Claude tries to run <code>go vet</code>. The job recently moved to larger runners, which cut its median duration from six minutes to four.</p>
<p>Which two changes together satisfy both requirements? (Select 2.)</p>`,
    options: [
      `Switch to <code>--output-format stream-json</code> so each finding arrives as its own JSON event, which lets the poster parse findings one at a time and skip any event that is malformed.`,
      `Rewrite the prompt's last line to demand a raw JSON array matching findings.schema.json with no prose, tables or code fences, and have the poster strip any text around the array.`,
      `Keep <code>--output-format json</code> and add <code>--json-schema</code> with the contents of <code>findings.schema.json</code>, so the CLI returns output that is validated against the team's schema.`,
      `Add <code>--dangerously-skip-permissions</code> so tool calls such as <code>go vet</code> are no longer denied and the review can finish every run without stopping at permission checks.`,
      `Replace <code>--permission-mode acceptEdits</code> with a read-only tool set, for example <code>--tools "Read,Grep,Glob"</code>, so the review has no tool that can change a file.`
    ],
    answer: [2, 4],
    explanation: `Each requirement needs a control the CLI enforces rather than a request in the prompt. <code>--output-format json</code> only wraps the reply in a JSON envelope; the <code>result</code> text inside stays free-form, which is why an instruction already in the prompt still fails on 7% of runs. Adding <code>--json-schema</code> with the findings schema makes the output validated structured data that the poster can turn into inline comments. The never-modify requirement is about tool access: <code>acceptEdits</code> auto-approves edits, which is how a typo fix reached a firmware image. Restricting built-ins with <code>--tools "Read,Grep,Glob"</code> removes Edit, Write and Bash, and the <code>go vet</code> denials stop mattering because the diff arrives in the prompt and the review does not need to run commands. Skipping permissions does the opposite of what the lead asked, and <code>stream-json</code> changes how output is delivered, not whether findings match the schema. The faster runners are noise.`,
    rationales: [
      `stream-json delivers output as a series of events while the run progresses; nothing checks a finding against findings.schema.json, so prose and tables still reach the poster.`,
      `The prompt already asks for schema-matching JSON and still fails on 7% of runs; stronger wording plus text stripping stays probabilistic and cannot guarantee valid findings.`,
      `Correct. <code>--json-schema</code> validates the output against the findings schema, turning a request in the prompt into a contract the CLI enforces for the inline-comment poster.`,
      `Bypassing permissions would let the review edit files and run any command, which breaks the requirement that the firmware workspace is never modified.`,
      `Correct. With only Read, Grep and Glob available, no Edit, Write or Bash call can happen, so a flagged typo can never again be fixed inside the build workspace.`
    ],
    trap: `Prompt requests and permission bypass instead of schema validation and tool restriction`,
    signals: `Decisive: the prompt already asks for schema-matching JSON yet 7% of results fail validation, and <code>--permission-mode acceptEdits</code> is what let a typo fix reach a firmware image. Noise: the <code>go vet</code> permission denials, which tempt a permissions bypass, and the move to faster runners.`
  },
  {
    id: 'e6-S5-03', scenario: 'S5', domain: 'D3', obj: 'O13', type: 'single', select: 1,
    stem: `<p>Halcyon Grid, an energy-trading startup, runs a Claude Code review on its Python settlement service each time a commit is pushed to an open pull request. Runners are ephemeral containers that are destroyed after every job. Each run writes <code>findings.json</code>, which the pipeline keeps as a build artifact for 30 days, and a poster script turns the findings into inline comments.</p>
<p>Developers have stopped reading the bot. On a typical pull request with five pushes, the bot posts the same 11 comments after every push, and the 2 genuinely new findings from the last commit are buried under 44 repeats. Reviewers often reply in a comment thread to explain that a flagged pattern is intentional, and the compliance team requires those threads to be kept for audit. A sample of the repeats shows that only 3 of the 11 keep their exact wording from run to run; the rest describe the same issue in new words or point a few lines lower after the latest commit.</p>
<p>Two weeks ago the team added a <code>severity</code> field to the findings schema, and the median review takes about three minutes.</p>
<p>Which change best stops the repeated comments while still surfacing new issues?</p>`,
    options: [
      `Load the previous run's findings artifact into the new review's prompt and instruct Claude to report only new or still-unaddressed issues, marking earlier findings the new commits resolved.`,
      `Save each run's session ID as a build artifact and start the next review with <code>--resume</code> on that ID, so that Claude continues its earlier review and remembers which comments it posted.`,
      `Have the poster compare each new finding's message with the bot's existing comments on the pull request and skip any finding whose text exactly matches a comment that was already posted.`,
      `Have the poster delete every earlier bot comment before it posts, so that each push leaves one clean and current set of findings on the pull request instead of an accumulating history.`
    ],
    answer: [0],
    explanation: `When a review re-runs after new commits, it needs the earlier findings in its context and an instruction to report only new or still-unaddressed issues. Here every run starts from nothing, so it rediscovers the same 11 issues and posts them again. The findings artifact already survives for 30 days, so the next run can load it without new infrastructure, and Claude can recognize a repeat even when the wording or line number has changed. Exact-text matching would catch only 3 of the 11 repeats. Resuming a session fails on ephemeral runners, because the local session files are destroyed with the container, and old tool results would be stale after the new commits anyway. Deleting and reposting erases the reply threads that compliance must keep and still repeats every issue. The severity field and the three-minute review time are noise.`,
    rationales: [
      `Correct. With the prior findings in context, Claude recognizes repeats despite reworded messages and shifted lines, and the 30-day artifact already exists, so no session state is needed.`,
      `Runners are destroyed after each job, so the saved ID points to session files that no longer exist; even if resumed, the old tool results would be stale after new commits.`,
      `Only 3 of the 11 repeats keep their exact wording between runs, so text matching lets most duplicates through and the 2 new findings stay buried.`,
      `Deleting comments destroys the reply threads that compliance requires for audit, and the next run would still re-post all 11 issues as if they were new.`
    ],
    trap: `Session resumption or text de-duplication instead of prior findings in context`,
    signals: `Decisive: runners are ephemeral, the previous findings.json survives as an artifact, and only 3 of 11 repeats keep their wording, which rules out resuming and text matching; the audit rule on reply threads rules out delete-and-repost. Noise: the new severity field and the three-minute review time.`
  },
  {
    id: 'e6-S5-04', scenario: 'S5', domain: 'D3', obj: 'O16', type: 'single', select: 1,
    stem: `<p>Quillfeather Insurance runs a nightly "upkeep" job that invokes <code>claude -p</code> on its TypeScript monorepo to apply codemods: replacing deprecated APIs, renaming shared types and updating call sites. When Claude finishes, the job pushes a branch and opens a pull request. Any pull request that fails lint blocks the merge queue for about 40 minutes before it is ejected, so the platform team wants a guarantee that the job never finishes with lint errors.</p>
<p>The project CLAUDE.md says: "Always run pnpm lint before finishing and fix every error." Over the last 120 runs, 10 opened pull requests that failed lint, about 1 in 12. The log from one of them:</p>
<pre>[upkeep] run 2291  task: replace legacy http() with fetchJson()
[claude] Edit packages/billing/src/client.ts
[claude] Edit packages/billing/src/retry.ts
[claude] Edit packages/claims/src/api.ts
[claude] Done: replaced 23 call sites across 3 packages.
[upkeep] pushed upkeep/2291, opened PR #8812
[ci]     pnpm lint: 4 errors (no-unused-vars, import/no-unresolved)</pre>
<p>Multi-file changes routinely pass through states that fail lint: renaming an exported type can touch 30 files, and imports stay broken until the last one is updated. The guarantee must live in the repository so that developers who run the job locally get the same behavior. Last month the team migrated to the ESLint flat config format, and a full lint run takes about 40 seconds.</p>
<p>Which mechanism provides the guarantee without disrupting multi-file changes?</p>`,
    options: [
      `Add a PostToolUse hook on Edit and Write to the project <code>.claude/settings.json</code> that runs the linter after each change and returns a blocking error to Claude whenever any lint error remains.`,
      `Create a project skill at <code>.claude/skills/lint-fix/SKILL.md</code> that runs <code>pnpm lint</code> and fixes each reported error, and change the job's prompt to invoke /lint-fix before finishing.`,
      `Add a Stop hook to the project <code>.claude/settings.json</code> that runs <code>pnpm lint</code> when Claude tries to finish and, while errors remain, blocks completion and returns the lint output.`,
      `Move the lint instruction to the top of CLAUDE.md, mark it IMPORTANT, and explain that lint failures block the merge queue for 40 minutes, so Claude treats the step as mandatory on every run.`
    ],
    answer: [2],
    explanation: `A requirement that must hold on every run needs a deterministic check, and the check must run at the right moment. A Stop hook fires when Claude tries to finish; if <code>pnpm lint</code> still reports errors, the hook blocks completion (exit code 2) and its output goes back to Claude, which keeps fixing until the workspace is clean. Because it runs only at the end, the broken intermediate states of a 30-file rename are never interrupted, and because it sits in the committed <code>.claude/settings.json</code>, local runs behave the same. A PostToolUse hook fires after every edit and pushes Claude to repair states that are meant to be temporary. The CLAUDE.md line already fails in 1 of 12 runs, and a skill or IMPORTANT wording still depends on the model choosing to comply. The ESLint migration and lint duration are noise: the log shows Claude declaring Done without ever running lint.`,
    rationales: [
      `Linting after every edit fires during the broken intermediate states of a 30-file rename, pushing Claude to patch temporary errors instead of completing the change it was asked to make.`,
      `The job would still depend on Claude choosing to invoke /lint-fix, the same probabilistic step that the CLAUDE.md instruction already misses in about 1 of 12 runs.`,
      `Correct. The check runs only when Claude tries to finish, blocks completion while lint fails, and lives in committed project settings, so local runs of the job behave the same.`,
      `Emphasis might lower the miss rate, but CLAUDE.md is context, not enforcement; the log shows Claude reporting Done without running lint despite the existing instruction.`
    ],
    trap: `Instruction or per-edit hook instead of an end-of-run gate`,
    signals: `Decisive: the log shows Claude reporting Done without running lint, the requirement is a guarantee at the end of the run, and intermediate states legitimately fail lint. Noise: the ESLint flat-config migration and the 40-second lint time, neither of which explains why lint is skipped.`
  },
  {
    id: 'e6-S5-05', scenario: 'S5', domain: 'D3', obj: 'O11', type: 'single', select: 1,
    stem: `<p>Vantage Clinics runs a nightly job that asks Claude Code to diagnose and fix flaky tests in 14 repositories, one CI matrix job per repository, each with a 360-minute job timeout. Every matrix job runs this step:</p>
<pre>cd "work/$REPO"
claude -p "$(cat "$CI_DIR/fix-flaky.md")" \\
  --output-format json \\
  --allowedTools "Read" "Edit" "Bash(npm test *)" \\
  &gt; "$OUT/$REPO.json"
"$CI_DIR/open-fix-pr.sh" "$OUT/$REPO.json"</pre>
<p>Last Tuesday the job for the <code>payments-ledger</code> repository reran the same failing integration suite for almost six hours, until the job timeout killed it. That single run cost $412. Because the process was killed, the JSON report was never produced and the pull request step never ran. The same night, a Datadog alert reported high disk usage on the runner pool, which the infrastructure team traced to cached Docker layers.</p>
<p>Normal runs take 10 to 25 minutes, but the two largest repositories legitimately need 45 to 70. Finance wants a hard spending ceiling on each repository's run, and the team wants a stuck run to end by itself so that the later steps still execute.</p>
<p>Which change best meets these requirements?</p>`,
    options: [
      `Add <code>--max-cost 5</code> to the <code>claude -p</code> invocation, so that the CLI stops a repository's run once it has spent five dollars and exits normally with the partial report written.`,
      `Add <code>--max-turns</code> and <code>--max-budget-usd</code>, with limits set above what normal runs need, so that a looping run stops cleanly at a bounded cost instead of being killed.`,
      `Use <code>--append-system-prompt</code> to tell Claude to stop and summarize its progress after 20 tool calls, so that a run that is not converging ends before it becomes expensive.`,
      `Lower the matrix job timeout from 360 to 30 minutes, so that a runaway run is killed early before it can cost much, and rerun any repository whose job was killed on the next night.`
    ],
    answer: [1],
    explanation: `Runaway protection for CI belongs in the invocation itself. <code>--max-turns</code> caps how many agentic turns a print-mode run can take and <code>--max-budget-usd</code> caps what it can spend, so a run that keeps rerunning the same failing suite stops at a known cost instead of being killed, and the following steps get a chance to run. Setting both limits above what the 45 to 70 minute repositories need keeps legitimate runs intact while giving finance its ceiling. A 30-minute timeout would kill those legitimate runs and, like the 360-minute timeout, would kill the process before anything is written. An instruction to stop after 20 tool calls is probabilistic, and a looping run is exactly where instructions stop working. <code>--max-cost</code> is not a Claude Code flag; the spending cap is <code>--max-budget-usd</code>. The Datadog disk alert is unrelated noise.`,
    rationales: [
      `Claude Code has no <code>--max-cost</code> flag; the real spending cap is <code>--max-budget-usd</code>, so this change adds no ceiling to a run like the six-hour payments-ledger loop.`,
      `Correct. Turn and budget caps stop a looping run from inside the CLI at a bounded cost, and limits sized above normal runs leave the 45 to 70 minute repositories unaffected.`,
      `A prompt instruction is probabilistic, and six hours of rerunning one failing suite shows the run was not following its plan; nothing would enforce the ceiling finance wants.`,
      `A 30-minute timeout kills the two large repositories' legitimate runs and, like today's timeout, kills the process before the report and pull request steps can run.`
    ],
    trap: `Timeouts, prompt limits or an invented flag instead of built-in turn and budget caps`,
    signals: `Decisive: the job timeout killed the process so nothing was written, legitimate runs need up to 70 minutes, and finance wants a ceiling per run, which together point to caps inside the claude -p invocation. Noise: the Datadog disk alert on the runner pool, traced to cached Docker layers.`
  },
  {
    id: 'e6-S5-06', scenario: 'S5', domain: 'D3', obj: 'O15', type: 'multi', select: 2,
    stem: `<p>Stackline Pharmacy runs nightly test generation for the Django services behind its prescription-refill app. For each module changed that day, a CI job calls <code>claude -p</code> with the module's source and the prompt "Write thorough pytest tests for this module," then opens a pull request with the new test file. The project CLAUDE.md contains only build commands. Model objects are meant to be built with the factories in <code>tests/fixtures/factories.py</code>, and every module already has a hand-written test file next to it.</p>
<p>Reviewers now reject 64% of generated tests. In a sample of 50 rejections, 22 re-created scenarios that the module's existing tests already cover, 15 built model objects by hand instead of using the factories, and 13 asserted getters, default values or <code>__str__</code> output. Line coverage of the target modules averages 71%.</p>
<p>The team moved the job to Sonnet 5.5 in March, which cut generation time from 50 to 30 minutes, and upgraded pytest to version 8 last week. The job must stay within its current nightly budget and finish before 7 a.m.</p>
<p>Which two changes address the causes of the rejections? (Select 2.)</p>`,
    options: [
      `Include the module's existing test files in the generation context and ask Claude to add only scenarios they do not already cover, so it stops re-creating cases the suite already has.`,
      `Require in the prompt that the new tests raise each module's line coverage from the existing 71% to at least 90%, so that Claude writes enough tests to exercise every branch.`,
      `Switch the job to Fable 5.1 so the stronger model infers the team's factories and fixture conventions and judges on its own which scenarios deserve a test, with no prompt changes.`,
      `Add testing standards to the project CLAUDE.md: the factories in tests/fixtures and when to use them, plus criteria for valuable tests, such as behavior and edge cases over trivial accessors.`,
      `Move generation to the Message Batches API, which suits nightly workloads and halves the cost, and use the savings to request several candidate test files for each changed module.`
    ],
    answer: [0, 3],
    explanation: `Generated tests improve when Claude sees what already exists and what the team values. The sample maps to two gaps in context. Duplicates (22 of 50) happen because the prompt contains only the module source; putting the existing test files in context lets Claude skip covered scenarios. Hand-built objects (15) and trivial assertions (13) happen because nothing tells Claude about the factories or about what counts as a valuable test; CLAUDE.md is the mechanism that gives CI-invoked Claude Code this project context on every run. A 90% coverage target rewards exactly the cheap getter tests reviewers reject. No model, however capable, can infer factories and review criteria it never sees, and Fable 5.1 would strain the fixed budget. The Batch API lowers cost but changes none of the inputs behind the rejections. The Sonnet 5.5 move and the pytest upgrade are noise.`,
    rationales: [
      `Correct. 22 of the 50 rejections re-created covered scenarios because the prompt holds only the module source; with the existing tests in context, Claude can target real gaps.`,
      `A coverage target rewards the cheapest lines to cover, which are exactly the getters, defaults and <code>__str__</code> assertions behind 13 of the sampled rejections.`,
      `No model can infer factories or review criteria that appear nowhere in its context, and a costlier model strains the fixed nightly budget without fixing what Claude is given.`,
      `Correct. CLAUDE.md gives every CI run the fixture conventions and valuable-test criteria, which addresses the 15 hand-built objects and the 13 trivial assertions at their source.`,
      `Batch processing cuts cost but changes nothing Claude sees, so duplicates, hand-built objects and trivial tests would continue, now multiplied across several candidates per module.`
    ],
    trap: `Coverage targets, bigger models or cheaper APIs instead of better context`,
    signals: `Decisive: the prompt holds only the module source, CLAUDE.md contains only build commands, and the rejection sample splits into duplicates, ignored factories and trivial assertions. Noise: the 71% coverage figure, which tempts a coverage target, plus the Sonnet 5.5 move and the pytest 8 upgrade.`
  },
  {
    id: 'e6-S5-07', scenario: 'S5', domain: 'D1', obj: 'O08', type: 'single', select: 1,
    stem: `<p>Tidewater Mutual, a regional insurer, runs an "upgrade bot" in CI that uses Claude Code to move services onto new versions of internal libraries. The next job is the largest yet: version 4 of the in-house HTTP client, <code>tw-http</code>, changes how retries are configured, makes interceptors asynchronous and alters the signature of the token-refresh hook. Nine services and about 70 files are affected. Early greps show three usage styles: direct calls, a retry wrapper that five services copied, and two services that subclass the client. The shared <code>libs/auth-session</code> package wraps the interceptor API.</p>
<p>Engineering policy says the platform owner must approve the approach before any change to shared authentication code. Service teams have no capacity this quarter, which is why the bot exists, and each service must keep passing its own test suite. The last minor upgrade, from 3.2 to 3.4, was handled by one direct-execution job in 11 minutes. The bot's runners moved to ARM instances last month.</p>
<p>Which workflow should the bot use for this migration?</p>`,
    options: [
      `Run one direct-execution job with <code>--permission-mode bypassPermissions</code> and a detailed prompt listing every breaking change and test command, so the whole migration lands in one reviewable pull request.`,
      `Run the analysis with <code>--permission-mode plan</code>, publish the resulting plan to the platform owner, and have each service team implement the approved changes by hand in its own services.`,
      `Start about 70 parallel direct-execution jobs, one per affected file, each given the breaking-change notes, so that the work finishes quickly and every diff stays small and easy to review.`,
      `Run a first job with <code>--permission-mode plan</code> that maps every usage and publishes a migration plan for approval, then a second job that applies the approved plan per service with tests.`
    ],
    answer: [3],
    explanation: `Plan mode suits changes with architectural implications, several valid approaches and many files; direct execution suits well-scoped work. This migration has every planning trigger: breaking changes in three areas, about 70 files, three usage styles and a shared auth package. The policy adds a human gate, so the workflow needs a phase boundary. A plan-mode job (<code>--permission-mode plan</code>) explores and proposes without editing, the platform owner approves, and a second job carries out the approved plan with direct execution per service, using each test suite as verification. This combines plan mode for investigation with direct execution for implementation and keeps the automation that service teams depend on this quarter. A single bypassPermissions job would edit <code>libs/auth-session</code> before anyone approved the approach, and 70 per-file jobs would each improvise their own handling of the copied retry wrapper and the subclasses. The quick 3.2 to 3.4 upgrade had no breaking changes, and the ARM runners are noise.`,
    rationales: [
      `Planning and editing in one bypassPermissions run changes <code>libs/auth-session</code> before the platform owner has approved an approach, and a detailed prompt cannot settle three usage styles nobody has analyzed.`,
      `It satisfies the approval policy but hands about 70 files of mechanical work back to service teams that have no capacity this quarter, which defeats the reason the bot exists.`,
      `Per-file jobs share no plan, so the copied retry wrapper and the two subclasses get inconsistent treatment, and auth-session edits happen before anyone approves the approach.`,
      `Correct. The plan-mode job gives the owner an approach to approve before any auth code changes, and the second job keeps the work automated while each service's tests verify it.`
    ],
    trap: `Single-phase execution or manual implementation when the task needs plan, approve, execute`,
    signals: `Decisive: breaking changes across about 70 files with three usage styles, a policy that requires approval before shared auth code changes, and service teams with no capacity to implement by hand. Noise: the quick 3.2 to 3.4 upgrade, which had no breaking changes, and the move to ARM runners.`
  },
  {
    id: 'e6-S5-08', scenario: 'S5', domain: 'D1', obj: 'O06', type: 'single', select: 1,
    stem: `<p>Oriel Commerce, which sells furniture online, added two specialist reviewers to the pull request check for its Rails storefront three weeks ago, hoping to catch security and performance problems that the single general review kept missing. The job step and the agent definitions:</p>
<pre>claude -p "$(cat .ci/review.md)" \\
  --tools "Read,Grep,Glob,Bash" \\
  --allowedTools "Bash(git diff *)" \\
  --agents "$(cat .ci/agents.json)" \\
  --output-format json --max-turns 25

# .ci/agents.json (excerpt)
{ "security-reviewer": {
    "description": "Reviews diffs for injection, authorization and secret-handling flaws. Use for changes under app/controllers or config/.",
    "prompt": "You are a security reviewer...", "tools": ["Read", "Grep", "Glob"] },
  "perf-reviewer": {
    "description": "Reviews diffs for N+1 queries, missing indexes and blocking calls in request paths.",
    "prompt": "You are a performance reviewer...", "tools": ["Read", "Grep"] } }</pre>
<p>Since the change, job logs have never shown a subagent starting. The main session performs the whole review itself, finishing in about 19 turns, and its findings are shallow: it missed an N+1 query on the order history page that the performance prompt describes in detail. When a developer loads the same <code>agents.json</code> into an interactive session on her laptop and asks for a review, both specialists run. Last week the team also shortened <code>review.md</code> from 90 lines to 40 to reduce noise in the comments.</p>
<p>What is the most likely reason the specialists never run in CI?</p>`,
    options: [
      `<code>--tools</code> restricts the session to the four listed built-ins, so the Task tool that spawns subagents is missing and the agents in <code>agents.json</code> can never be started.`,
      `Neither agent in <code>agents.json</code> sets a <code>model</code> field, so in print mode the CLI cannot choose a model for them and skips both subagents, leaving the main session to review alone.`,
      `The two descriptions say what each agent reviews but lack wording such as "use proactively", so in an unattended print-mode run Claude never judges delegation worthwhile for a routine review.`,
      `With <code>--output-format json</code> the CLI must return a single serializable result, so it disables subagents whose transcripts cannot be nested and the main session performs every step.`
    ],
    answer: [0],
    explanation: `In the CLI, <code>--tools</code> restricts which built-in tools exist in the session. Subagents are started through the Task tool (named Agent in current Claude Code releases), and it is not in the list, so Claude cannot delegate, however good the definitions are. This is the CLI form of the exam guide's rule that a coordinator's tool list must include Task. The laptop session confirms the definitions work: it has the full built-in tool set, and both specialists run. The fix is to add the subagent tool to <code>--tools</code>. The <code>model</code> field is optional (a subagent without one uses the default model), and JSON output shapes the final result without disabling delegation. The shortened <code>review.md</code> is noise: the problem began three weeks ago, before that edit, and 19 turns is well under the 25-turn cap.`,
    rationales: [
      `Correct. The subagent-spawning tool is missing from the <code>--tools</code> list, which explains why no subagent ever starts in CI while the laptop session, with every built-in, uses both.`,
      `The model field is optional; a subagent without one uses the default model, and the same definitions with no model field run fine in the developer's interactive session.`,
      `Both descriptions state their scope and triggers, and the laptop session delegates with exactly the same wording, so description phrasing cannot explain a failure that happens only in CI.`,
      `JSON output shapes the final result; it does not disable delegation. The CI session lacks the spawning tool itself, which is the difference from the laptop run that matters.`
    ],
    trap: `Blaming agent definitions or output format when the spawning tool is excluded`,
    signals: `Decisive: the <code>--tools</code> line lists only Read, Grep, Glob and Bash, and the same agents.json delegates in an interactive session that has every built-in tool. Noise: the shortened review.md, edited two weeks after the problem began, and the 19-turn runs that stay under the 25-turn cap.`
  }
]);
