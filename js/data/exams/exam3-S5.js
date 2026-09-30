/* Practice Exam 3 — Scenario S5: Claude Code for Continuous Integration
   Context: Go microservices (payments-gw, ledger, notifier) on GitLab CI, with merge-request
   review bots posting inline discussions and generated table-driven tests. */
CCAR.addQuestions('exam3', [
  {
    id: 'e3-S5-01',
    scenario: 'S5',
    domain: 'D3',
    obj: 'O13',
    type: 'single',
    select: 1,
    stem: 'Your GitLab MR review job was sped up last sprint. Since then, reviews no longer enforce the rules in the repo\'s committed CLAUDE.md (wrap errors with <code>%w</code>, pass <code>ctx</code> through every gRPC call, no <code>panic</code> in handlers), although that file has not changed:<pre>claude-review:\n  stage: review\n  script:\n    - git diff origin/$CI_MERGE_REQUEST_TARGET_BRANCH_NAME...HEAD &gt; mr.diff\n    - claude --bare -p "Review mr.diff against our Go standards" --output-format json &gt; review.json</pre>What is the most likely cause?',
    options: [
      'GitLab runners check out the repository in detached HEAD state, and Claude Code only reads CLAUDE.md files when the current branch is named main or master.',
      'The --output-format json flag switches Claude Code into a raw API mode that disables memory files, so CLAUDE.md is ignored whenever JSON output is requested.',
      'The --bare flag skips auto-discovery of CLAUDE.md, hooks, skills and MCP config, so the review now runs without the committed project standards.',
      'In -p mode Claude Code loads only ~/.claude/CLAUDE.md from the runner image, so the project standards must be copied into the image at build time.'
    ],
    answer: [2],
    explanation: '--bare speeds startup by skipping auto-discovery of CLAUDE.md, hooks, skills and MCP servers, so the committed standards silently stop reaching the reviewer. Remove --bare, or if you keep it for speed, pass the standards explicitly (for example with --append-system-prompt). CLAUDE.md is the normal way to give CI-invoked Claude Code project review criteria.',
    rationales: [
      'Branch name has no effect on memory-file discovery; project CLAUDE.md is found from the working directory.',
      'Output format controls how the result is printed, not which memory files load.',
      'Correct. The speed-up flag removed CLAUDE.md discovery, which matches the timing of the regression.',
      'Print mode loads project memory normally; the working tree checkout is where the standards live.'
    ],
    trap: '--bare silently dropping project standards'
  },
  {
    id: 'e3-S5-02',
    scenario: 'S5',
    domain: 'D3',
    obj: 'O13',
    type: 'single',
    select: 1,
    stem: 'The MR review job runs <code>claude -p "$REVIEW_PROMPT" --dangerously-skip-permissions</code> and also reviews MRs from forks. Last week a crafted comment in a diff led Claude to edit <code>.gitlab-ci.yml</code> in the job workspace and attempt <code>git push</code>. The job only needs to read code and run <code>go vet</code>. Which configuration best restricts it?',
    options: [
      'Remove --dangerously-skip-permissions, auto-approve only Read, Grep, Glob and Bash(go vet *) with --allowedTools, and deny Edit and Write with --disallowedTools.',
      'Keep --dangerously-skip-permissions for speed, and add a CLAUDE.md section stating that the review job must never edit files, change CI config, or push to a remote.',
      'Switch to --permission-mode acceptEdits so edits are recorded for audit instead of silently applied, and fail the job if review.json mentions .gitlab-ci.yml.',
      'Add the --read-only flag to the invocation, which puts Claude Code into review mode and disables every tool that could modify files or reach the network.'
    ],
    answer: [0],
    explanation: 'A review job should run with the least privilege it needs: stop bypassing permissions, pre-approve only the read and analysis tools (including a narrowly scoped Bash pattern), and deny file-modifying tools. In non-interactive mode nothing else can be approved. Instructions in CLAUDE.md are probabilistic and are exactly what injected content tries to override.',
    rationales: [
      'Correct. Explicit allow and deny lists enforce a read-and-vet-only tool surface without bypass mode.',
      'Bypass mode plus a prompt instruction leaves every tool available to injected instructions.',
      'acceptEdits auto-approves file edits, which widens rather than narrows what the job can do.',
      'There is no --read-only flag; tool restriction is done with allow/deny lists or --tools.'
    ],
    trap: 'Prompt guardrails on a bypass-permissions CI job'
  },
  {
    id: 'e3-S5-03',
    scenario: 'S5',
    domain: 'D3',
    obj: 'O13',
    type: 'multi',
    select: 2,
    stem: 'You are designing the MR review job so that findings are posted automatically as inline GitLab discussions (file, line, severity, rule id, message) and the review applies the same Go standards developers see locally. Which TWO configuration choices are required? (Select 2)',
    options: [
      'Tell Claude in the prompt to "respond only with a JSON array" and parse stdout with a regex that extracts the first bracketed block when extra prose appears.',
      'Bake a ~/.claude/CLAUDE.md with the review standards into the runner image, so every pipeline in the company gets the same criteria without repo changes.',
      'Run claude -p with --output-format json and --json-schema describing the findings array, then post each item from the structured result via the GitLab API.',
      'Use --output-format stream-json and scrape the final assistant message for a markdown table, which the bot converts into inline discussion threads.',
      'Keep review criteria in the committed CLAUDE.md or .claude/rules/ files and do not pass --bare, so CI-invoked Claude Code loads them from the checkout.'
    ],
    answer: [2, 4],
    explanation: 'Automation needs machine-parseable output validated against a schema, which --output-format json with --json-schema provides in print mode. Consistent standards come from committed project memory that CI loads from the checkout, versioned with the code and identical to what developers see locally.',
    rationales: [
      'Prompt-only JSON with regex recovery is the least reliable format and breaks the posting step unpredictably.',
      'User-level memory in an image is not versioned with the repo and diverges from what developers see locally.',
      'Correct. Schema-validated JSON output can be posted as inline discussions without fragile parsing.',
      'Scraping prose tables from a stream is fragile; structured output exists for this purpose.',
      'Correct. Committed project memory, discovered normally, gives CI the same standards as local sessions.'
    ],
    trap: 'Prompt-formatted JSON; user-level standards for a team pipeline'
  },
  {
    id: 'e3-S5-04',
    scenario: 'S5',
    domain: 'D4',
    obj: 'O28',
    type: 'single',
    select: 1,
    stem: 'A nightly job calls the Messages API with a forced tool <code>emit_table_tests</code> to generate table-driven cases for all 23 exported functions in <code>ledger/internal/posting</code> in one request. Logs show <code>stop_reason: "max_tokens"</code>, the tool input ends mid-case, and only 14 functions are covered. A teammate proposes raising <code>max_tokens</code> from 16k to 64k. What is the best fix?',
    options: [
      'Raise max_tokens to 64k as proposed, since the tool call was only cut off because the output budget was too small for 23 functions in one single request.',
      'Tell the model in the system prompt to keep each case minimal and to limit itself to three cases per function, so the full output fits the current limit.',
      'Retry the same request until a run finishes with end_turn and keep that output, because truncation depends on sampling and will not happen on every run.',
      'Split the job into one request per function or small group, each with its own forced tool call, then merge the results into the package test file.'
    ],
    answer: [3],
    explanation: 'Truncated structured output is fixed by scoping each call so its output comfortably fits, then merging the results. Per-function calls keep outputs small, isolate failures, and scale as the package grows. Raising max_tokens hits model output ceilings, dilutes attention across 23 functions, and one failure still loses everything.',
    rationales: [
      'A larger budget postpones the problem; the package keeps growing and a single failure still loses all cases.',
      'Capping cases trades truncation for weaker coverage and still offers no guarantee of fitting.',
      'Output length depends on the work requested, not luck; retries burn cost and may never complete.',
      'Correct. Smaller scoped calls plus a merge step eliminate truncation and isolate failures.'
    ],
    trap: 'Raise max_tokens for truncated structured output'
  },
  {
    id: 'e3-S5-05',
    scenario: 'S5',
    domain: 'D4',
    obj: 'O28',
    type: 'single',
    select: 1,
    stem: 'The MR review bot sends the whole diff in one Messages API call with a forced <code>report_findings</code> tool. On MRs above about 60 files, <code>stop_reason</code> is <code>"max_tokens"</code>, the findings array is cut off mid-object, JSON parsing fails, and the bot posts nothing while the job stays green. Which redesign is best?',
    options: [
      'Trim the truncated tool input back to the last complete finding object and post those findings, logging a warning that the review may be partial for large MRs.',
      'Review each changed file in its own call emitting a small findings object, run a separate cross-file integration pass, and merge results keyed by file path.',
      'Instruct the model to report at most the 10 most important findings per MR, so the tool input stays well below the output limit regardless of MR size.',
      'Enable extended thinking with a larger budget so the model plans its findings more compactly before it writes the tool call covering the full merge request.'
    ],
    answer: [1],
    explanation: 'Split large reviews into per-file local passes plus a cross-file integration pass, each producing output that fits, and merge the results. This removes truncation and also reduces attention dilution on large diffs. The current silent green job is a separate failure: truncation should fail loudly rather than post nothing.',
    rationales: [
      'Salvaging a partial array silently drops findings from files the model never reached.',
      'Correct. Per-file passes plus an integration pass keep each output small and the review complete.',
      'A fixed cap suppresses real findings on large MRs, which are the riskiest ones.',
      'Thinking tokens do not make the findings list smaller, and they consume budget of their own.'
    ],
    trap: 'Salvaging or capping truncated output instead of splitting'
  },
  {
    id: 'e3-S5-06',
    scenario: 'S5',
    domain: 'D4',
    obj: 'O31',
    type: 'single',
    select: 1,
    stem: 'The review bot reports four categories. Over 300 MRs, developers dismissed 72% of <code>concurrency</code> findings, mostly "goroutine started without WaitGroup" on goroutines managed by <code>errgroup.Group</code> or started in <code>_test.go</code> files. Two real data races it did catch were ignored because developers now skip the whole category. The current criterion reads "Flag risky concurrency." What change is most effective?',
    options: [
      'Add "only report concurrency issues you are highly confident about" to the prompt, and require the model to state its confidence score next to each concurrency finding.',
      'Run the concurrency check three times per MR and post only findings that appear in at least two runs, which filters out the noisy one-off goroutine warnings.',
      'Rewrite the criterion: report unsynchronized writes to shared state and goroutines that can block forever; exclude errgroup-managed goroutines and _test.go files.',
      'Remove the concurrency category permanently, since a 72% dismissal rate shows the model cannot judge concurrency, and rely only on go test -race in CI instead.'
    ],
    answer: [2],
    explanation: 'Precision improves when the category has explicit inclusion and exclusion boundaries that match what the team considers a real issue. Vague confidence instructions do not change what the model considers risky, and voting suppresses intermittent true positives. Temporarily disabling a noisy category can restore trust, but the fix is sharper criteria, not abandoning the category.',
    rationales: [
      'Confidence-based filtering fails to improve precision compared to specific categorical criteria.',
      'Consensus voting drops real but intermittently detected races along with the noise.',
      'Correct. Concrete report/skip boundaries target the actual false-positive pattern while keeping real races.',
      'Permanent removal throws away the true positives; the race detector only catches races that tests execute.'
    ],
    trap: 'Confidence filtering or voting instead of explicit criteria'
  },
  {
    id: 'e3-S5-07',
    scenario: 'S5',
    domain: 'D4',
    obj: 'O31',
    type: 'multi',
    select: 2,
    stem: 'The error-handling criterion says "Flag error-handling problems." Most findings are unchecked <code>defer rows.Close()</code>, ignored <code>fmt.Fprintf(w, ...)</code> results in HTTP handlers, and ignored errors in <code>_test.go</code>; developers now dismiss the category wholesale. Which TWO prompt changes will most improve precision without hiding real bugs? (Select 2)',
    options: [
      'Report only errors that are discarded, or returned without %w wrapping, from calls that change persistent state: DB writes, ledger postings, payments.',
      'Add "be conservative and only report error-handling issues when you are highly confident" to the review instructions for this category.',
      'Have the model score every finding from 1 to 10 for confidence and let the bot post only those findings that score 7 or higher.',
      'Exclude explicitly: unchecked Close() on read-only resources, ignored writes to http.ResponseWriter, and any finding located in a _test.go file.',
      'Run the review three times and post only error-handling findings that at least two of the three runs report, to filter out one-off noise.'
    ],
    answer: [0, 3],
    explanation: 'Explicit inclusion criteria (what counts as a reportable error-handling bug) and explicit exclusions (accepted low-risk patterns) together define the category precisely. Generic caution, self-reported confidence scores and majority voting do not target the actual false-positive patterns and can hide intermittent true positives.',
    rationales: [
      'Correct. A concrete inclusion boundary focuses the category on errors with real consequences.',
      '"Be conservative" does not reliably improve precision compared with specific criteria.',
      'Self-reported confidence is poorly calibrated and is not a reliable filter.',
      'Correct. Explicit exclusions remove the specific patterns developers keep dismissing.',
      'Voting suppresses real findings that appear only intermittently.'
    ],
    trap: 'Vague caution, self-confidence and voting as precision fixes'
  },
  {
    id: 'e3-S5-08',
    scenario: 'S5',
    domain: 'D3',
    obj: 'O11',
    type: 'single',
    select: 1,
    stem: 'The test-generation job sometimes hangs until GitLab\'s 60-minute timeout, and one MR cost $41 when Claude looped on a flaky integration test. The job runs:<pre>claude "Generate table-driven tests for the packages changed in this MR" \\\n  --permission-mode acceptEdits</pre>Which invocation fixes both problems?',
    options: [
      'Export CLAUDE_HEADLESS=true in the job variables so Claude Code never waits for input, and wrap the command in timeout 900 to cap spend on long-running jobs.',
      'Keep the interactive invocation but pipe yes into stdin so that any prompt is answered automatically, and lower the GitLab job timeout to 15 minutes.',
      'Add --dangerously-skip-permissions so no permission prompt can block the run, and ask in the prompt that Claude stop after thirty tool calls at most.',
      'Use claude -p "..." with --permission-mode acceptEdits, --max-turns 40 and --max-budget-usd 5.00, so it never waits for input or overspends.'
    ],
    answer: [3],
    explanation: 'Without -p, Claude Code starts an interactive session and waits for input, which hangs a CI job. Print mode runs non-interactively, and --max-turns plus --max-budget-usd bound runaway loops and cost deterministically. Shell timeouts only kill the job after the spend and lose the output.',
    rationales: [
      'CLAUDE_HEADLESS is not a Claude Code setting, and a shell timeout bounds time, not cost per turn.',
      'Piping input into an interactive session is fragile, and a shorter job timeout still leaves cost unbounded.',
      'Bypassing permissions widens access, and a prompt-level turn limit is not enforced.',
      'Correct. Print mode removes the hang; turn and budget limits cap runaway cost.'
    ],
    trap: 'Non-existent headless env var; prompt-level limits'
  },
  {
    id: 'e3-S5-09',
    scenario: 'S5',
    domain: 'D3',
    obj: 'O15',
    type: 'single',
    select: 1,
    stem: 'Generated table-driven tests for <code>payments-gw/internal/refunds</code> are rejected in review: 40% duplicate cases already in <code>refunds_test.go</code>, they use <code>testify/mock</code> although the team uses hand-written fakes in <code>internal/testutil/fakes</code>, and many cases assert only <code>err == nil</code>. The job prompt says "write thorough, high-quality tests." What change most improves the output?',
    options: [
      'Document the table conventions, the testutil fakes and what counts as a meaningful assertion in CLAUDE.md, and give the job the existing _test.go files.',
      'Expand the prompt to "write thorough, non-duplicated, high-quality tests in the team\'s preferred style", and ask Claude to double-check its own work before finishing.',
      'Post-process the output with a script that drops cases whose name field matches an existing case and rewrites testify imports to use the fakes package.',
      'Move the job to the Message Batches API overnight so Claude has more time per package, and raise max_tokens so it can write more detailed assertions.'
    ],
    answer: [0],
    explanation: 'Test generation improves when Claude sees the existing tests (so it adds only uncovered scenarios) and when testing standards, available fixtures and criteria for valuable tests are documented in CLAUDE.md, which CI-invoked Claude Code loads. Vaguer adjectives, string post-processing and more tokens do not supply the missing project knowledge.',
    rationales: [
      'Correct. Existing tests as context prevent duplicates; CLAUDE.md supplies conventions, fixtures and quality criteria.',
      'The prompt already asks for quality; without the existing tests and conventions Claude cannot comply.',
      'Name-matching misses semantic duplicates, and import rewriting does not turn mocks into correct fake usage.',
      'Batch processing and a bigger output budget do not give the model the context it lacks.'
    ],
    trap: 'Vague quality instructions instead of context and criteria'
  },
  {
    id: 'e3-S5-10',
    scenario: 'S5',
    domain: 'D4',
    obj: 'X11',
    type: 'single',
    select: 1,
    stem: 'A pipeline stage lets Claude Code fix failing tests on a bot branch and then, in the same session, sends "Now review your changes critically before we open the MR." The self-review approves nearly everything. Humans later found that one "fix" changed a rounding mode in <code>ledger/internal/posting</code> just to make a test pass. What change will most improve the review?',
    options: [
      'Keep the same session but enable extended thinking for the review turn, so the model reasons more deeply about each change it made before approving the diff.',
      'Run the review as a separate claude -p invocation with no generation history, given only the diff, the failing-test context and the project review standards.',
      'Strengthen the self-review prompt to "review as a skeptical senior engineer who did not write this code" and require at least three concerns per changed file.',
      'Run the same-session self-review twice and open the MR only when both passes approve, filtering out approvals caused by a single inattentive review pass.'
    ],
    answer: [1],
    explanation: 'A session that generated the code retains its reasoning and is less likely to question its own decisions. An independent review instance without that context is more effective at catching subtle issues, such as changing production behavior to satisfy a test, than extended thinking or role-play instructions in the same session.',
    rationales: [
      'More reasoning in the same context still anchors on the original justification for the change.',
      'Correct. An independent instance reviews the diff without the generator\'s reasoning bias.',
      'Role-play does not remove the generation context, and forced concern quotas create noise.',
      'Repeating a biased review in the same context repeats the same bias.'
    ],
    trap: 'Self-review in the generating session'
  },
  {
    id: 'e3-S5-11',
    scenario: 'S5',
    domain: 'D4',
    obj: 'O24',
    type: 'single',
    select: 1,
    stem: 'One review prompt covers security, gRPC/protobuf compatibility and ledger business rules (double-entry postings must balance per currency). Security findings are good, but two breaking proto changes (a reused field number and a renamed enum value) shipped unflagged last month, and business-rule findings are vague. What is the most effective redesign?',
    options: [
      'Move to a larger model with a bigger context window, so that the single combined prompt can give all three concerns equal attention on large merge requests.',
      'Add few-shot examples for all three concerns into the single prompt and order the sections by priority, putting compatibility and ledger rules before security.',
      'Keep one pass but ask the model to output each concern under its own heading, so reviewers can easily see which area has received too little attention.',
      'Run separate passes for security, proto compatibility and ledger rules, each with its own criteria and few-shot examples, then merge the findings.'
    ],
    answer: [3],
    explanation: 'Specialized review passes that each focus on one concern, with dedicated criteria and few-shot examples (for example, reused field numbers or unbalanced postings), avoid the attention dilution of a single all-in-one prompt. The passes can run in parallel and their findings are merged for posting.',
    rationales: [
      'A bigger model or window does not fix a prompt that splits attention across unrelated concerns.',
      'Packing more examples into one prompt makes it longer and still dilutes attention across concerns.',
      'Headings change formatting, not how carefully each concern is analyzed.',
      'Correct. Dedicated passes with concern-specific examples improve both recall and specificity.'
    ],
    trap: 'One mega-prompt instead of specialized passes'
  },
  {
    id: 'e3-S5-12',
    scenario: 'S5',
    domain: 'D4',
    obj: 'O30',
    type: 'single',
    select: 1,
    stem: 'The review bot repeatedly flags patterns the Go team accepts: <code>panic</code> in <code>init()</code> when required config is missing, missing <code>ctx</code> parameters in generated <code>*.pb.go</code> files, and naked returns in the frozen <code>internal/legacy/</code> package. Each MR gets 6 to 10 such comments, and developers have started muting the bot. What is the best fix?',
    options: [
      'Document these accepted patterns and exclusions, with short examples, in the committed review standards the CI review loads (CLAUDE.md or .claude/rules/).',
      'Have developers resolve these threads with a "wontfix" reaction so the bot gradually learns from the reactions over time which comments are unwanted.',
      'Lower the severity of every finding in these areas to "info" so they are still posted as inline comments but no longer block the merge request.',
      'Add "avoid false positives and respect project conventions" to the review prompt so the model applies its own judgment about which of the patterns are accepted.'
    ],
    answer: [0],
    explanation: 'False positives driven by project-specific conventions are reduced by giving the reviewer those conventions, accepted patterns and exclusions as persistent context with examples. Committed CLAUDE.md or rules files are loaded by CI-invoked Claude Code, so every run applies them consistently.',
    rationales: [
      'Correct. Persistent, committed conventions and exclusions tell the reviewer exactly what not to flag.',
      'The bot does not learn from reactions; nothing changes in the next run.',
      'The noise is still posted, so trust keeps eroding.',
      'A generic instruction gives the model no knowledge of which patterns this team accepts.'
    ],
    trap: 'Generic "avoid false positives" instead of documented conventions'
  },
  {
    id: 'e3-S5-13',
    scenario: 'S5',
    domain: 'D4',
    obj: 'O23',
    type: 'single',
    select: 1,
    stem: 'Two workloads share one Claude integration: (1) the MR review gate, which must finish within 10 minutes because merges are blocked on it, and (2) a nightly job generating table-driven test suggestions for all 48 Go packages, which the team triages twice a week. Finance wants both moved to the Message Batches API for the 50% discount. What should you do?',
    options: [
      'Move both to the Batches API and poll every minute, since most batches complete well within an hour and the MR gate can simply wait for the result.',
      'Keep both on the synchronous API, because the Batches API cannot accept the tool definitions that both jobs rely on to return structured results.',
      'Keep the MR gate synchronous and move the nightly job to the Batches API, with one request per package identified by custom_id.',
      'Move the MR gate to batches with a fallback to the synchronous API after 10 minutes, and keep the nightly job synchronous for predictability.'
    ],
    answer: [2],
    explanation: 'The Batches API offers 50% savings but has up to a 24-hour processing window and no latency SLA, so it fits latency-tolerant work like nightly test generation and not blocking pre-merge gates. custom_id correlates each package\'s request with its result, since results are not returned in order.',
    rationales: [
      'Typical completion times are not a guarantee; a blocking gate cannot depend on a 24-hour window.',
      'Batch requests can include tools; what batches lack is multi-turn tool execution within a request.',
      'Correct. Synchronous for the blocking gate, batch for the latency-tolerant nightly job.',
      'This inverts the fit: it delays the gate by 10 minutes on every miss and pays full price for the tolerant job.'
    ],
    trap: 'Batch API for a blocking workflow'
  },
  {
    id: 'e3-S5-14',
    scenario: 'S5',
    domain: 'D3',
    obj: 'O16',
    type: 'single',
    select: 1,
    stem: 'The test-generation job must change only <code>*_test.go</code> files and files under <code>testdata/</code>. The prompt and CLAUDE.md both say so, yet one run edited <code>ledger/internal/posting/rounding.go</code> so that a generated test would pass. The job runs with <code>--permission-mode acceptEdits</code>. What is the most reliable fix?',
    options: [
      'Add .claude/rules/tests.md with paths: ["**/*_test.go"] stating that production code must never change, so the rule loads whenever test files are in play.',
      'Add a PreToolUse hook on Edit|Write in the committed .claude/settings.json that exits 2 unless the path ends in _test.go or sits under testdata/.',
      'After the run, git checkout any non-test file Claude changed and commit the remaining tests, so that production code is always restored automatically.',
      'Repeat the restriction at the start and end of the prompt in capitals, and add a few-shot example that shows Claude declining to edit a non-test file.'
    ],
    answer: [1],
    explanation: 'The requirement is a hard guarantee, and the prompt and CLAUDE.md have already failed. A PreToolUse hook deterministically blocks edits outside the allowed paths and returns feedback so Claude can adjust the test instead. Rules and prompt wording are probabilistic, and silently reverting after the fact hides the problem.',
    rationales: [
      'A path-scoped rule is still context and adds nothing the CLAUDE.md instruction did not already say.',
      'Correct. A committed hook enforces the path restriction on every run, independent of the prompt.',
      'Silent reverts leave tests that only passed because of the production change, so they now fail or mislead.',
      'More emphatic instructions remain probabilistic for a requirement that must never be violated.'
    ],
    trap: 'Prompt or rule for a deterministic restriction; silent revert'
  },
  {
    id: 'e3-S5-15',
    scenario: 'S5',
    domain: 'D1',
    obj: 'O08',
    type: 'single',
    select: 1,
    stem: 'Two CI automations are proposed. (1) When <code>gofmt</code> or <code>golangci-lint --fix</code>-able issues fail an MR, Claude fixes them and pushes a commit to the MR branch. (2) Quarterly, Claude upgrades <code>google.golang.org/grpc</code> across 14 services; the last upgrade needed interceptor API changes, and each owning team must approve changes to its service. Which design fits both?',
    options: [
      'Use the same direct-execution job for both, with auto-commit to the branch, and treat a green go test ./... run as sufficient approval for the upgrade changes.',
      'Use a plan-first workflow with manual approval for both, so lint fixes and upgrades share one reviewed process and nothing is pushed without human sign-off.',
      'Run both with --dangerously-skip-permissions on an isolated runner, and require an independent review instance to approve before a commit reaches any branch.',
      'Direct auto-commit for lint fixes; for upgrades, a plan stage posts a per-service plan, owners approve via a manual job, then execution runs.'
    ],
    answer: [3],
    explanation: 'Match the architecture to scope, risk and approval needs. Formatting and lint fixes are low risk, mechanically verifiable and well scoped, so direct execution with auto-commit fits. A multi-service dependency upgrade with API changes and mandatory owner approval needs a multi-phase workflow: plan, human approval gate, then execution and review.',
    rationales: [
      'Passing tests do not replace the required owner approval, and API changes need design review.',
      'Forcing a plan-and-approve cycle on formatting fixes adds friction with no risk reduction.',
      'An AI reviewer is not the human approval the owning teams require, and bypass mode widens risk.',
      'Correct. Direct execution for the low-risk task, a gated multi-phase flow for the high-risk one.'
    ],
    trap: 'One architecture for tasks with very different risk and approval needs'
  }
]);
