/* Practice Exam 6, Scenario S5 (Claude Code for Continuous Integration), items 09-15 */
CCAR.addQuestions('exam6', [
  {
    id: 'e6-S5-09', scenario: 'S5', domain: 'D1', obj: 'O10', type: 'single', select: 1,
    stem: `<p>Granite Cloud runs an automated review on every pull request to its public SDKs. Four review concerns are handled by separate Claude Code passes, each with its own prompt and few-shot examples: security, performance, API compatibility and test adequacy. Today they run as a sequential chain inside one CI job:</p>
<pre>step                       median   needs
extract changed symbols    1m 40s   diff only
security review            6m 10s   diff, standards
performance review         5m 50s   diff, standards
API compatibility review   6m 30s   diff, changed public symbols
test adequacy review       5m 40s   diff, test files
post comments              0m 20s   all review findings
total                     26m 10s</pre>
<p>Developers want review comments within 10 minutes of opening a pull request, and the platform team confirms that CI can run up to eight jobs in parallel for each pull request. The API compatibility pass cannot start without the list of changed public symbols. The four review passes never read one another's findings, but the posting step has to de-duplicate comments, because the security and performance passes sometimes flag the same line. Last quarter the team also moved the performance pass from Opus 5.5 to Sonnet 5.5.</p>
<p>Which orchestration meets the 10-minute target while respecting the dependencies?</p>`,
    options: [
      `Merge the four review concerns into one combined prompt that covers security, performance, API compatibility and test adequacy in a single pass, so the whole review needs one Claude Code invocation.`,
      `Keep the sequential chain but move every review pass to a faster model, so that each step finishes sooner and the total time of the chain falls from 26 minutes to under the 10-minute target.`,
      `Run the symbol extraction first, then the four review passes in parallel with the symbol list passed to the API pass, and finish with an aggregation step that de-duplicates and posts.`,
      `Start all six steps in parallel as soon as the pull request opens, including symbol extraction and posting, so that the total time is bounded by the slowest step at about six and a half minutes.`
    ],
    answer: [2],
    explanation: `Orchestration should follow the dependency graph: parallelize independent work and sequence only what depends on earlier output. The four review passes are independent of one another, so they can run concurrently on separate runners. Only API compatibility needs the extracted symbol list, and posting needs every pass's findings. Running extraction first (1m 40s), then the four passes in parallel (bounded by the slowest, API compatibility at 6m 30s), then aggregation and posting (20s) takes about 8.5 minutes, inside the target, and the aggregation step handles the known overlap between security and performance findings. One combined prompt dilutes attention across four concerns and discards the specialized few-shot examples. Faster models keep the times additive, and the performance pass already moved to a faster model without solving the problem. Starting everything at once gives the API pass no symbol list and lets posting run before findings exist. The Sonnet 5.5 move itself is noise.`,
    rationales: [
      `One combined pass dilutes attention across four concerns and drops each pass's specialized examples, trading the latency problem for less consistent and less thorough findings.`,
      `The chain's times stay additive, so even much faster passes struggle to bring 26 minutes under 10, and the performance pass already moved to a faster model without fixing it.`,
      `Correct. Extraction, then four parallel passes, then aggregation takes about 1m 40s plus 6m 30s plus 20s, roughly 8.5 minutes, and keeps both real dependencies intact.`,
      `Starting everything together ignores the dependencies: the API pass has no symbol list to check, and posting runs before any review findings exist.`
    ],
    trap: `Merging concerns, faster models or ignored dependencies instead of dependency-aware parallelism`,
    signals: `Decisive: the four review passes are independent, only API compatibility needs the extracted symbols, posting needs all findings, and CI allows eight parallel jobs. Noise: the performance pass's move to Sonnet 5.5.`
  },
  {
    id: 'e6-S5-10', scenario: 'S5', domain: 'D1', obj: 'O09', type: 'single', select: 1,
    stem: `<p>Beacon Freight runs a nightly CI job that uses Claude Code to generate missing unit tests for its 600-module Java routing platform. The job walks the modules in alphabetical order, calls <code>claude -p</code> once per module, and commits the new tests to a branch. The CI runner kills any job after six hours, and the job always reaches about module 350 before it is killed. Every night it starts again from module 1, so modules after about 350 have never received tests, while the first 350 are regenerated even when their code has not changed, producing noisy diffs that reviewers dislike.</p>
<p>Each module run is independent and takes 30 to 90 seconds. The runner is ephemeral, but the pipeline can store and restore build artifacts between nights. Last week the team upgraded the runner image to JDK 21, and generated tests pass on their first run 94% of the time.</p>
<p>Which change best ensures that every module eventually gets tests without redundant work?</p>`,
    options: [
      `Save the Claude Code session ID at the end of each night and start the next night's job with <code>--resume</code> on that ID, so the session continues from the module where the last run was killed.`,
      `Persist a manifest artifact (module, source hash, status, test path, result); each night load it, skip modules finished with an unchanged hash, and re-run failed, in-progress and pending ones.`,
      `Move every module run to a faster model so that the whole job finishes within the six-hour limit, which means every module is processed each night without keeping any state between runs.`,
      `Process the modules in a random order each night instead of alphabetical order, so that over several nights every module has a good chance of being reached before the runner kills the job.`
    ],
    answer: [1],
    explanation: `Long pipelines need structured state that survives interruption: a manifest that records each unit's status and artifacts and is loaded at the start of every run. Recording each module's source hash, status, test file path and result lets the next night skip modules that already have tests for unchanged code, re-run anything in progress when the runner killed the job, retry failures, and continue with modules never reached. The backlog clears within a few nights, and unchanged modules stop producing noisy diffs. Resuming a session fails on an ephemeral runner, and a transcript is not a reliable record of which modules finished. A faster model might fit tonight's run in six hours, but it still regenerates every module and breaks again as the codebase grows. Random order leaves coverage to chance and still redoes finished work. The JDK 21 upgrade and the pass rate are noise.`,
    rationales: [
      `Runners are ephemeral, so local session files disappear with each job, and a conversation transcript is not a dependable record of which modules were completed.`,
      `Correct. The manifest makes the job resumable: finished modules with unchanged hashes are skipped, interrupted ones re-run, and coverage grows every night.`,
      `A faster run might squeeze under six hours today, but it still regenerates all 600 modules, keeps the noisy diffs and fails again as the platform grows.`,
      `Random order leaves coverage to chance, still regenerates modules that already have tests, and gives reviewers no record of what has been done.`
    ],
    trap: `Session resumption, speed or luck instead of a persisted manifest`,
    signals: `Decisive: the job is killed around module 350 every night and restarts from module 1, module runs are independent, and artifacts persist between nights. Noise: the JDK 21 upgrade and the 94% first-run pass rate.`
  },
  {
    id: 'e6-S5-11', scenario: 'S5', domain: 'D4', obj: 'O31', type: 'single', select: 1,
    stem: `<p>Silverline Bank's CI runs a Claude Code review on every pull request to its online-banking services and posts findings in four categories: security, correctness, performance and style. After three months, developers resolve 81% of security findings and 74% of correctness findings, but only 30% of performance findings. The other 70% are dismissed as wrong, typically warnings about "inefficient loops" over lists that never exceed 20 items, or suggestions to cache values that are read once. A survey shows developers now skim or dismiss all bot comments, and last month a correctly flagged SQL injection sat unaddressed for nine days because its author assumed it was another false alarm.</p>
<p>The performance section of the review prompt currently says "flag code that could be slow." The team lead wants trust restored quickly while keeping the security coverage that the bank's auditors rely on. The bot also moved from a single summary comment to inline comments in May, and review runs finish in about four minutes.</p>
<p>Which approach best restores trust?</p>`,
    options: [
      `Add "only report findings you are highly confident about" to the performance prompt, so the reviewer holds back uncertain performance comments while every category keeps posting as it does today.`,
      `Raise the confidence threshold for posting to 0.9 in every category, so that only the reviewer's most certain findings appear on pull requests and developers see far fewer comments overall.`,
      `Run the review three times on each pull request and post only findings that appear in at least two of the three runs, so that one-off performance comments are filtered out before posting.`,
      `Pause the performance category while its prompt is rewritten with explicit report and skip criteria plus examples, and keep security and correctness findings posting as they do today.`
    ],
    answer: [3],
    explanation: `High false-positive categories undermine trust in the accurate ones, and the exam guide's remedy is to disable the offending category temporarily while improving its prompt with explicit criteria. The performance category's 70% dismissal rate is dragging down the whole bot, to the point that a correct SQL injection finding was ignored. Pausing performance comments restores the signal immediately, and replacing the vague "could be slow" instruction with categorical criteria (for example, report N+1 database queries and unbounded loops over user-controlled input; skip loops over small fixed collections and one-time reads), each with examples, fixes the category before it returns. Security and correctness keep running, so auditors keep their coverage. "Only report high-confidence findings" is a general instruction that does not improve precision. A global threshold suppresses true security findings along with bad performance ones. Consensus voting suppresses intermittent true positives and triples cost. The inline-comment change and the runtime are noise.`,
    rationales: [
      `General instructions such as "only report high-confidence findings" do not improve precision; the vague "could be slow" criterion still produces the dismissed comments.`,
      `A global threshold also suppresses accurate security and correctness findings, weakening the coverage auditors rely on without fixing why the performance comments are wrong.`,
      `Voting triples cost and suppresses real issues that appear in only one run, while a consistently wrong performance criterion can still pass two of three runs.`,
      `Correct. Pausing the noisy category restores trust at once, explicit report and skip criteria fix it before it returns, and security coverage continues unchanged.`
    ],
    trap: `Confidence filters or voting instead of pausing the noisy category and writing explicit criteria`,
    signals: `Decisive: only the performance category is noisy (70% dismissed), its criterion is the vague "flag code that could be slow", and developers now ignore accurate security findings. Noise: the move to inline comments and the four-minute runtime.`
  },
  {
    id: 'e6-S5-12', scenario: 'S5', domain: 'D4', obj: 'X11', type: 'single', select: 1,
    stem: `<p>Driftwood Games uses Claude Code in CI to write database migrations for its player-profile service. A pipeline step gives Claude a ticket, and Claude writes the migration and updates the data-access code. In the same session, the pipeline then sends a second prompt: "Review your changes critically and list any risks before we open the pull request." Over the last quarter this self-review approved every migration it was shown.</p>
<p>Two weeks ago it approved a migration that dropped the <code>last_login_region</code> column. The generating session had reasoned that the column was unused because no service code referenced it, but a nightly reporting job in a separate repository reads it directly with SQL, and the job failed for three nights before anyone noticed. The platform team now proposes forking the generating session with <code>--fork-session</code> and running the review in the fork, because the fork "already knows the context." The reporting repository's queries are available to CI, and the team recently moved generation to Opus 5.5.</p>
<p>Which review design best catches this kind of issue?</p>`,
    options: [
      `Run the review as a separate Claude Code invocation that sees only the diff, the schema, the reporting job's queries and the review standards, not the generator's reasoning.`,
      `Keep the review in the generating session but raise its effort setting for the review prompt, so that Claude reasons more deeply about each change before it approves the migration.`,
      `Fork the generating session with <code>--fork-session</code> and run the review in the fork, so the reviewer starts from the full context of how and why the migration was written.`,
      `Ask the generating session to review its changes twice in a row, telling the second pass to look for anything the first pass missed, before the pipeline opens the pull request.`
    ],
    answer: [0],
    explanation: `A model reviewing its own work in the same session keeps the reasoning that produced it, so it is unlikely to question its own conclusions; an independent instance without that context is more effective at catching subtle issues. The failure here follows that pattern: the generator concluded the column was unused, and its self-review inherited the same conclusion, approving every migration for a quarter. A fork inherits the parent conversation, including that reasoning, so it is self-review under another session ID. More reasoning effort (the exam guide speaks of extended thinking) or a second pass in the same session re-examines the change through the same assumption. A fresh invocation that receives the diff, the current schema, the reporting job's queries and the review standards has no stake in the earlier conclusion and can see that a dropped column is still read elsewhere. The Opus 5.5 move is noise.`,
    rationales: [
      `Correct. A fresh instance without the generator's reasoning has no stake in the unused-column conclusion, and with the reporting queries in view it can see the column is still read.`,
      `Deeper reasoning in the same session still starts from the conclusion that the column was unused, so more effort re-examines the change through the same assumption.`,
      `A fork inherits the generating conversation, including the reasoning that declared the column unused, so it is self-review with a new session ID.`,
      `A second self-review pass in the same session repeats the same blind spot, which is why this approach approved every migration for a full quarter.`
    ],
    trap: `Self-review, more effort or a fork instead of an independent review instance`,
    signals: `Decisive: the review runs in the session that reasoned the column was unused, it approved every migration for a quarter, and a fork would inherit that same reasoning. Noise: the move of generation to Opus 5.5.`
  },
  {
    id: 'e6-S5-13', scenario: 'S5', domain: 'D4', obj: 'O28', type: 'single', select: 1,
    stem: `<p>Pelican Health's review service calls the Claude Messages API directly from CI. It sends the full diff of a pull request with a <code>report_findings</code> tool whose input schema is an array of findings (file, line, severity, message), and a parser posts the findings as inline comments. For pull requests under about 40 files it works well. For larger ones, about 15% of pull requests and usually generated-client updates or dependency bumps, the logs look like this:</p>
<pre>pr=4812 files=63  stop_reason=max_tokens  tool_input=truncated  findings_posted=0
pr=4830 files=47  stop_reason=max_tokens  tool_input=truncated  findings_posted=0
pr=4851 files=112 stop_reason=max_tokens  tool_input=truncated  findings_posted=0</pre>
<p>Because the tool input is cut off mid-array, the parser rejects the whole response, and developers get no review at all on the pull requests that most need one. <code>max_tokens</code> is already set to the model's maximum output. Reviewers also want the service to keep catching cross-file problems, such as a changed function signature whose callers in other files were not updated. The service moved from a Python 3.10 to a 3.12 runtime last month, and median latency on small pull requests is 70 seconds.</p>
<p>Which change best fixes the missing reviews?</p>`,
    options: [
      `Switch to a model with a larger output limit and raise <code>max_tokens</code> again, so the <code>report_findings</code> array for even the largest pull requests fits in one response without truncation.`,
      `Add an instruction asking Claude to keep each finding's message under 15 words, so that the findings array stays short enough to fit within <code>max_tokens</code> on large pull requests.`,
      `Review each file, or a small group of related files, in its own scoped call and merge the findings in code, then run a separate integration pass focused on cross-file changes.`,
      `Retry any response that ends with <code>max_tokens</code> up to three times with the same request, since a later attempt may produce a shorter findings array that fits within the limit.`
    ],
    answer: [2],
    explanation: `When structured output is truncated because a task produces more output than one call allows, the fix is to split the work into smaller scoped calls and merge the results, not to raise <code>max_tokens</code>. Here the limit is already at the model's maximum, and output grows with the size of the pull request, so any single-call design fails again on the next large diff. Reviewing each file or small group of files in its own call keeps every response well under the limit and gives each file full attention instead of diluting it across 100 files. Merging in code rebuilds the complete set of inline comments, and a separate integration pass examines cross-file data flow, such as callers not updated for a changed signature, which reviewers still want. Terser messages shrink output a little, but the number of findings still grows with the pull request. Retrying the same request reproduces the truncation. The runtime move and small-PR latency are noise.`,
    rationales: [
      `The limit is already at the model's maximum and output grows with the pull request, so the next large diff truncates again, and one call still spreads attention across 100 files.`,
      `Shorter messages trim each finding, but a 112-file pull request still produces too many findings for one response, and terse comments are less useful to developers.`,
      `Correct. Scoped per-file calls keep every response within the limit, merging in code restores the full set of comments, and the integration pass keeps the cross-file checks.`,
      `Resending the same request reproduces the same output size, so it truncates again while multiplying cost and delaying the review developers are waiting for.`
    ],
    trap: `Raising limits, terser output or retries instead of splitting into scoped calls`,
    signals: `Decisive: <code>stop_reason</code> is max_tokens with truncated tool input on large pull requests, <code>max_tokens</code> is already at the model maximum, and reviewers still need cross-file checks. Noise: the Python 3.12 runtime move and the 70-second latency on small pull requests.`
  },
  {
    id: 'e6-S5-14', scenario: 'S5', domain: 'D4', obj: 'O23', type: 'single', select: 1,
    stem: `<p>Summit Retail's engineering organization runs two Claude-powered workloads in CI, both on the synchronous Messages API today. The first is a pre-merge check on every pull request that looks for leaked credentials and unsafe logging; developers cannot merge until it reports, and the median check takes 40 seconds. The second is a compliance scan that reviews every commit landing on the main branches of 1,200 repositories against the company's data-handling policy. Commits land around the clock, about 9,000 a day, and the policy says each commit's scan results must be available within 36 hours of the commit landing. The scan results feed a weekly compliance dashboard.</p>
<p>Finance wants to move both workloads to the Message Batches API for its 50% discount. The platform team notes that a batch can take up to 24 hours to process, that some failed requests will need to be resubmitted, and that the scan requests do not use tools. Separately, the dashboard is being migrated to a new BI tool next quarter.</p>
<p>Which plan best meets the requirements?</p>`,
    options: [
      `Move both workloads to the Batches API and have the pre-merge check poll its batch until the results arrive, so that every Claude call in the organization receives the 50% discount.`,
      `Keep the pre-merge check synchronous, and move the compliance scan to the Batches API, submitting the commits accumulated every 8 hours so the worst case stays within 36 hours.`,
      `Keep the pre-merge check synchronous, and move the compliance scan to the Batches API with one submission each day at midnight, since a single daily batch keeps the scheduling simple.`,
      `Keep both workloads on the synchronous API, because batch results come back in a different order from the requests and cannot be matched to the commits they belong to.`
    ],
    answer: [1],
    explanation: `The Message Batches API halves cost but can take up to 24 hours with no latency guarantee, so it fits latency-tolerant work, not blocking checks. The pre-merge check blocks developers, so it stays synchronous. The compliance scan is latency-tolerant and uses no tools, so it suits batching, and the submission interval follows from the SLA. A commit's worst-case wait is the time until the next submission plus up to 24 hours of processing. Submitting every 8 hours gives at most 8 + 24 = 32 hours, leaving a 4-hour buffer to resubmit failed requests by <code>custom_id</code> and still meet 36. A daily submission gives up to 24 + 24 = 48 hours, which breaks the SLA for commits that land just after midnight. Polling a batch from a blocking check could leave developers waiting most of a day. Result order is no obstacle, because <code>custom_id</code> matches each result to its request. The BI migration is noise.`,
    rationales: [
      `A batch can take up to 24 hours with no latency SLA, so a polling pre-merge check could block merges for most of a day; the discount is not worth that.`,
      `Correct. The blocking check stays synchronous, and an 8-hour submission interval gives a worst case of 8 + 24 = 32 hours, leaving time to resubmit failures within 36.`,
      `A commit landing just after midnight waits almost 24 hours to be submitted and up to 24 more to be processed, about 48 hours in total, which breaks the 36-hour requirement.`,
      `Results can be matched to requests through each request's <code>custom_id</code>, so out-of-order results are no reason to give up the discount on the latency-tolerant scan.`
    ],
    trap: `Batching a blocking check or ignoring worst-case batch latency in the SLA math`,
    signals: `Decisive: the pre-merge check blocks merges, the scan has a 36-hour SLA, commits land continuously, a batch can take up to 24 hours, and failures need resubmission. Noise: the weekly dashboard and its migration to a new BI tool.`
  },
  {
    id: 'e6-S5-15', scenario: 'S5', domain: 'D2', obj: 'O33', type: 'single', select: 1,
    stem: `<p>Nimbus Labs runs a CI triage agent on the Claude Agent SDK. When an integration test fails on the main branch, the agent investigates and reports: it comments on the pull request that introduced the failure, files a Jira issue if the failure looks like a regression, and checks Datadog monitors for related production alerts. It is connected to three MCP servers, GitHub, Jira and Datadog, which together expose 26 tools, and the agent can use all of them.</p>
<p>A review of 200 recent runs found two recurring mistakes. In 23 runs the agent created a Jira issue when the expected action was a comment on the pull request, choosing <code>jira_create_issue</code> over <code>github_create_review_comment</code>. In 17 runs it queried the wrong Datadog monitor, often a similarly named staging monitor. Each tool has a clear, specific description, and the traces show the agent weighing many unrelated tools at every step. The team upgraded the Jira MCP server last month, and runs cost about $0.40 each.</p>
<p>Which change most improves tool selection?</p>`,
    options: [
      `Move the triage agent to a larger and more capable model, so that it can keep all 26 tool descriptions in mind at once and choose the right tool for each step of the investigation.`,
      `Rename all 26 tools with longer, more explicit names and list them in alphabetical order, so the agent can scan the list more easily and tell similar tools apart when it chooses one.`,
      `Add a table to the system prompt describing when to use each of the 26 tools, with an example situation for every tool, so the agent can look up the correct choice at each step.`,
      `Split triage into role-specific subagents for PR comments, issue filing and telemetry lookup, each given only the 4 to 6 tools its role needs, with a coordinator routing the work.`
    ],
    answer: [3],
    explanation: `Giving one agent many tools degrades selection, because every decision has more plausible candidates; the exam guide contrasts 18 tools with 4 to 5. The descriptions here are already clear, and the traces show the agent weighing many unrelated tools at every step, so the number of choices, not their wording, is the problem. Splitting the work into role-specific subagents gives each a small tool set that matches its job: the commenting role sees GitHub review tools, the issue role sees Jira tools, and the telemetry role sees Datadog query tools. The coordinator decides which role a failure needs, and each subagent chooses among a handful of relevant tools. A larger model still faces the same crowded decision. Longer names and alphabetical order do not reduce the number of candidates. A 26-row lookup table adds context to every request and depends on the agent consulting it correctly. The Jira server upgrade and the run cost are noise.`,
    rationales: [
      `A stronger model still chooses among 26 tools at every step; the problem is decision complexity from the tool count, not a lack of reasoning ability.`,
      `Names and ordering do not reduce the number of plausible candidates, and the descriptions are already clear, so similar tools would stay confusable.`,
      `A 26-row table adds tokens to every request and is guidance the agent must follow, while the crowded tool list that causes the mistakes stays unchanged.`,
      `Correct. Each subagent chooses among a few tools that fit its role, so Jira issues and PR comments are no longer competing options in the same decision.`
    ],
    trap: `Bigger model or better labels instead of scoping tools to roles`,
    signals: `Decisive: one agent holds all 26 tools from three servers, the descriptions are already clear, and traces show it weighing unrelated tools at every step. Noise: last month's Jira server upgrade and the $0.40 cost per run.`
  },
]);
