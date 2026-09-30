/* Practice Exam 4 — Scenario S5: Claude Code for CI (Kotlin Android + Swift iOS PR reviews, nightly test generation) */
CCAR.addQuestions('exam4', [
  {
    id: 'e4-S5-01', scenario: 'S5', domain: 'D3', obj: 'O13', type: 'single', select: 1,
    stem: 'A mobile team\'s PR-review job runs:<pre>claude -p "Review this PR against our Kotlin and Swift standards and list problems" \\\n  --output-format json</pre>The poster script expects an array of findings with <code>file</code>, <code>line</code>, <code>severity</code> and <code>message</code>, but the <code>result</code> field contains prose or Markdown tables that vary from run to run. On two occasions Claude also edited a <code>.kt</code> file on the runner while "fixing" a finding. Which change best fixes both problems?',
    options: [
      'Append "Respond only with a JSON array of findings and never modify files" to the prompt, and parse the <code>result</code> field with a tolerant JSON parser.',
      'Add <code>--json-schema</code> with the findings schema, and <code>--disallowedTools "Edit" "Write"</code> so the review job cannot change files.',
      'Switch to <code>--output-format stream-json</code> and run with <code>--permission-mode plan</code> so that output is streamed as JSON events.',
      'Add <code>--max-turns 3</code> so that Claude has no turns left over to edit files, and extract the findings with a regular expression.'
    ],
    answer: [1],
    explanation: '--output-format json wraps the response in a JSON envelope but does not constrain what the result contains; --json-schema validates the output against the findings schema so the poster can parse it reliably. File modification should be removed deterministically by disallowing the Edit and Write tools, not requested in the prompt. Turn caps and regex extraction are fragile stand-ins for both.',
    rationales: [
      'Both halves are probabilistic: the prompt can be ignored, and a tolerant parser cannot recover a missing structure.',
      'Correct. Schema-validated output for automation plus a deterministic tool restriction for a read-only review.',
      'stream-json changes the transport, not the shape of the findings; nothing enforces the schema.',
      'A turn cap may cut the review short and does not guarantee no edits; regex parsing of prose is brittle.'
    ],
    trap: 'Prompt instructions for output format and tool restrictions'
  },
  {
    id: 'e4-S5-02', scenario: 'S5', domain: 'D3', obj: 'O13', type: 'single', select: 1,
    stem: 'To speed up CI, a platform engineer changed the iOS review job to:<pre>claude -p --bare "Review the diff in ios/ for defects" \\\n  --output-format json --json-schema "$(cat review.schema.json)"</pre>Since then, reviews flag force-unwraps in XCTest targets and <code>@MainActor</code> usages that the team explicitly allows. Those conventions live in <code>ios/CLAUDE.md</code> and <code>.claude/rules/swift-tests.md</code>, and neither file has changed. What is the root cause?',
    options: [
      'The JSON schema replaces the system prompt, so project memory files are ignored whenever <code>--json-schema</code> is supplied to the command.',
      'Subdirectory CLAUDE.md files are never read in non-interactive <code>-p</code> mode, so the iOS conventions must move into the root CLAUDE.md.',
      '<code>--bare</code> skips auto-discovery of CLAUDE.md files, rules, hooks, skills and MCP servers, so the standards are no longer loaded.',
      'The rules file lacks a <code>paths</code> field for XCTest files, so the model cannot tell which conventions apply to test targets in the diff.'
    ],
    answer: [2],
    explanation: '--bare starts Claude Code without auto-discovering CLAUDE.md, rules, hooks, skills or MCP configuration; it is meant for fully specified scripted runs. The review therefore lost the accepted-pattern exclusions that had kept false positives down. Remove --bare, or pass the required standards explicitly (for example with --append-system-prompt), so CI reviews apply the project\'s conventions.',
    rationales: [
      '--json-schema constrains output shape; it does not replace or disable project memory.',
      'Print mode still loads memory files, and subdirectory CLAUDE.md files load when Claude reads files there.',
      'Correct. The only change was --bare, which disables loading of the project standards.',
      'A rule without paths loads at launch unconditionally; nothing about it changed when the problem began.'
    ],
    trap: 'Flag that silently removes project context'
  },
  {
    id: 'e4-S5-03', scenario: 'S5', domain: 'D3', obj: 'O13', type: 'multi', select: 2,
    stem: 'The PR-review job re-runs on every push. Developers complain that (1) after they push fixes, the bot re-posts the same 11 comments plus 2 new ones, and (2) the poster script mis-places inline comments because findings arrive as paragraphs such as "In the login view model, around the retry logic...". Which two changes address these complaints? (Select 2)',
    options: [
      'Run each re-review with <code>--continue</code> so it resumes whatever session last ran on the CI runner and remembers what it posted.',
      'Have the poster script skip any comment whose text exactly matches a comment that is already present on the pull request.',
      'Pass the prior findings and their status into the re-review prompt and instruct Claude to report only new or still-unaddressed issues.',
      'Run the review only on the first push of each pull request and rely on human reviewers for every commit pushed after that.',
      'Use <code>--output-format json</code> with a <code>--json-schema</code> that requires <code>file</code>, <code>line</code>, <code>severity</code> and <code>message</code>.'
    ],
    answer: [2, 4],
    explanation: 'Re-reviews should include prior findings in context with an instruction to report only new or unresolved issues, which prevents duplicates even when the wording of a finding changes. Inline posting needs machine-parseable findings with exact locations, which --output-format json with --json-schema provides. Exact-text dedupe fails on reworded findings, --continue on ephemeral runners resumes an unrelated or missing session, and reviewing only the first push misses defects in later commits.',
    rationales: [
      'Ephemeral runners have no reliable prior session, and the most recent session may belong to a different PR.',
      'Model wording varies between runs, so exact-match dedupe lets most duplicates through.',
      'Correct. Prior findings in context let Claude report only what is new or still open.',
      'Removes automated coverage from exactly the commits that change code after review.',
      'Correct. Structured findings with file and line are what inline posting requires.'
    ],
    trap: 'Text dedupe and session resumption instead of prior findings in context'
  },
  {
    id: 'e4-S5-04', scenario: 'S5', domain: 'D3', obj: 'O16', type: 'single', select: 1,
    stem: 'Nightly test generation for the Android app runs Claude Code in CI. Localized strings in <code>android/**/res/values*/strings.xml</code> are managed by an external translation system, and any edit there breaks the next sync. The project CLAUDE.md says "Never edit strings.xml files," yet roughly once a week a generated-test commit includes a <code>strings.xml</code> change. What should the team do?',
    options: [
      'Add a <code>.claude/rules/strings.md</code> file with <code>paths: ["**/strings.xml"]</code> stating that these files are generated and must not be edited.',
      'Rewrite the CLAUDE.md instruction in capitals, move it to the top of the file, and explain exactly why the translation sync breaks after edits.',
      'Add an <code>Edit(**/strings.xml)</code> deny rule to <code>~/.claude/settings.json</code> on each developer\'s laptop so that the rule is enforced.',
      'Add deny rules such as <code>Edit(android/**/strings.xml)</code> to the committed <code>.claude/settings.json</code> used by the CI job.'
    ],
    answer: [3],
    explanation: 'A requirement that must never be violated needs deterministic enforcement, not more persuasive context. Permission deny rules in committed project settings apply to every session that uses the repo, including CI, and block the tool call regardless of what the model decides. Path-scoped rules and CLAUDE.md are both probabilistic context, and user settings on laptops do not affect the CI runner.',
    rationales: [
      'A path-scoped rule is still guidance loaded into context; it can be ignored just like CLAUDE.md.',
      'Emphasis and rationale may lower the rate but cannot guarantee zero edits.',
      'User-level settings on laptops never reach the CI runner where the edits happen.',
      'Correct. Project-level deny rules deterministically block the edits in CI.'
    ],
    trap: 'Probabilistic context for a deterministic requirement'
  },
  {
    id: 'e4-S5-05', scenario: 'S5', domain: 'D3', obj: 'O16', type: 'single', select: 1,
    stem: 'The team added this file as <code>.claude/rules/kotlin-tests.md</code>:<pre>---\nglobs: ["**/src/test/**/*.kt", "**/src/androidTest/**/*.kt"]\n---\n# Kotlin test conventions\n- Use Turbine for Flow assertions; use FakeClock, never Thread.sleep\n- ...</pre>Swift-only nightly runs for the iOS app now carry these Kotlin conventions in context, and some generated XCTest files contain comments about Turbine. What is the cause and fix?',
    options: [
      'The frontmatter key must be <code>paths</code>; without a recognized <code>paths</code> field the rule loads unconditionally at launch.',
      'Rules in <code>.claude/rules/</code> always load for every session; the conventions must move into CLAUDE.md files inside each Android module.',
      'Glob patterns in rule frontmatter must start with <code>./</code>; without it they match nothing and the rule falls back to always loading.',
      'Path-scoped rules only apply in interactive sessions; CI runs using <code>-p</code> need these conventions passed with <code>--append-system-prompt</code>.'
    ],
    answer: [0],
    explanation: '.claude/rules files are loaded conditionally only through a paths frontmatter field containing glob patterns; a rule without paths loads at launch like CLAUDE.md. The unrecognized globs key leaves the rule unscoped, so Kotlin conventions reach Swift sessions. Renaming the key to paths restores conditional loading for test files spread across all the Gradle modules.',
    rationales: [
      'Correct. paths is the frontmatter field that scopes a rule; globs is not recognized.',
      'Path-scoped rules exist precisely to avoid this; per-module CLAUDE.md files would also miss files spread across modules.',
      'Patterns like **/src/test/**/*.kt are valid without a ./ prefix.',
      'Rules load the same way in print mode; the problem is the frontmatter key.'
    ],
    trap: 'Wrong rules frontmatter field'
  },
  {
    id: 'e4-S5-06', scenario: 'S5', domain: 'D3', obj: 'O11', type: 'single', select: 1,
    stem: 'The nightly test-generation job runs <code>claude -p "$PROMPT" --permission-mode acceptEdits</code>. Twice last month a run got stuck in a generate–fail–regenerate cycle on a flaky Espresso test, running for over three hours and spending about $40 before the CI job timed out with nothing saved. Which change gives the best runaway protection?',
    options: [
      'Add <code>--max-cost 5</code> so that Claude Code stops any single run once its spend reaches five dollars and returns the partial output.',
      'Lower the CI job timeout to 30 minutes so that any stuck run is killed by the runner well before it can consume a large budget.',
      'Add <code>--max-turns 40</code> and <code>--max-budget-usd 5.00</code> so the CLI stops the run itself when either limit is reached.',
      'Lower <code>max_tokens</code> for each response so that every turn costs less and a long retry cycle stays within an acceptable budget.'
    ],
    answer: [2],
    explanation: 'In print mode, --max-turns caps agentic turns and --max-budget-usd caps spend, so the CLI ends a runaway run cleanly with its output. --max-cost is not a Claude Code flag. A shorter CI timeout kills the process abruptly, losing work and cutting off healthy long runs too, and smaller responses do not stop an unbounded loop.',
    rationales: [
      'Not a real flag; the budget flag is --max-budget-usd.',
      'A blunt kill discards everything and cannot distinguish a stuck run from a legitimately long one.',
      'Correct. Built-in turn and budget limits stop runaway loops from inside the CLI.',
      'Cheaper turns still repeat indefinitely; the loop itself is the problem.'
    ],
    trap: 'Non-existent flag; external timeouts instead of CLI limits'
  },
  {
    id: 'e4-S5-07', scenario: 'S5', domain: 'D3', obj: 'O11', type: 'single', select: 1,
    stem: 'A new nightly job generates XCTest and JUnit tests. It runs <code>claude -p "$PROMPT"</code> on an ephemeral runner that also holds app-signing credentials. The job reports success every night, but logs show every Write to a test file and every <code>./gradlew test</code> call was denied for lack of permission, so no tests are written or run. Which configuration is most appropriate?',
    options: [
      'Add <code>--dangerously-skip-permissions</code> so the job never stops for permissions and can write tests and run any command it needs.',
      'Use <code>--permission-mode acceptEdits</code> with <code>--allowedTools "Bash(./gradlew test *)" "Bash(xcodebuild test *)"</code>.',
      'Use <code>--permission-mode plan</code> so that Claude can explore the codebase and design the tests without asking for write permissions.',
      'Drop the <code>-p</code> flag so the runner surfaces the permission prompts, and have the job script auto-answer them through stdin.'
    ],
    answer: [1],
    explanation: 'Grant exactly what the job needs: acceptEdits auto-approves file edits, and scoped allowedTools rules pre-approve only the test commands. Bypassing all permissions on a runner that holds signing credentials gives the agent unrestricted command execution. Plan mode is read-only and cannot write tests, and interactive mode in CI is what -p exists to avoid.',
    rationales: [
      'Over-broad: any command becomes possible on a runner with sensitive credentials.',
      'Correct. Least-privilege approvals for edits and the two test commands.',
      'Plan mode does not write files, so the job still produces no tests.',
      'Interactive prompts in CI hang or require fragile scripting; -p is the supported non-interactive mode.'
    ],
    trap: 'Bypassing all permissions instead of scoped approvals'
  },
  {
    id: 'e4-S5-08', scenario: 'S5', domain: 'D3', obj: 'O15', type: 'single', select: 1,
    stem: 'Nightly test generation for the Android <code>checkout</code> module produces 40 new tests per night. Reviewers reject most: 60% duplicate scenarios already covered in <code>CheckoutViewModelTest.kt</code>, and many build raw Mockito mocks although the team maintains <code>FakePaymentRepository</code> and a <code>MainDispatcherRule</code> fixture. What change will most improve the value of generated tests?',
    options: [
      'Ask for 80 tests per night and have a script keep only the tests whose names do not already appear in the existing test files.',
      'Add "write high-quality, non-duplicative tests that follow team conventions" to the prompt and ask Claude to self-review before finishing.',
      'Switch the job to a more capable model so it can infer the fixture conventions from the production code without additional context.',
      'Include each target class\'s existing tests as context, and document the fixtures, fakes and valuable-test criteria in CLAUDE.md.'
    ],
    answer: [3],
    explanation: 'Test generation improves when Claude sees the existing tests, so it can avoid covered scenarios, and when CLAUDE.md documents available fixtures, fakes and what makes a test valuable. Name-based filtering misses duplicates with different names, generic quality instructions do not tell Claude what already exists, and a stronger model cannot use fixtures it is never shown.',
    rationales: [
      'More output plus a name filter still lets differently named duplicates through and wastes tokens.',
      'Generic instructions do not reveal which scenarios exist or which fixtures to use.',
      'Fixtures live in test code the model has not seen; capability does not substitute for context.',
      'Correct. Existing tests prevent duplication, and documented fixtures and criteria shape quality.'
    ],
    trap: 'Generic quality instructions instead of concrete context'
  },
  {
    id: 'e4-S5-09', scenario: 'S5', domain: 'D3', obj: 'O14', type: 'single', select: 1,
    stem: 'Developers invoke a project skill, <code>/module-graph</code>, before asking Claude Code to review cross-module changes in the Android app. The skill runs Gradle dependency reports for 14 modules and prints about 9,000 lines; after it runs, the follow-up review in the same session misses issues and references modules that were not in the PR. Only the skill\'s final summary is needed for the review. What is the best change?',
    options: [
      'Add <code>context: fork</code> to the skill\'s frontmatter so it runs in an isolated subagent context and returns only its summary.',
      'Add <code>allowed-tools: Bash(./gradlew *)</code> to the skill so it can only run Gradle commands and produces less extraneous output.',
      'Tell developers to run <code>/compact</code> after the skill finishes and before they ask for the cross-module review in that session.',
      'Add <code>disable-model-invocation: true</code> so the skill runs only when explicitly invoked and never loads into other sessions.'
    ],
    answer: [0],
    explanation: 'context: fork runs a skill in an isolated subagent context, so its verbose intermediate output stays out of the main conversation and only the result returns. Restricting tools does not shrink Gradle\'s output, compacting afterwards summarizes noise together with signal and depends on developers remembering, and disable-model-invocation controls who can trigger the skill, not where its output goes.',
    rationales: [
      'Correct. Forked execution isolates the 9,000 lines and returns just the summary.',
      'The output volume comes from the Gradle reports themselves, not from extra tools.',
      'A manual, lossy cleanup step that must be remembered every time.',
      'Controls invocation, not context pollution; the output still lands in the session.'
    ],
    trap: 'Tool restriction or /compact instead of context: fork'
  },
  {
    id: 'e4-S5-10', scenario: 'S5', domain: 'D1', obj: 'O08', type: 'single', select: 1,
    stem: 'The team wants nightly CI test generation for the legacy iOS <code>Payments</code> module: 120 Swift files, 0% coverage, heavy use of singletons, and a known risk that tests written against the wrong seams will need rewriting once the planned dependency-injection refactor lands. An iOS lead must approve the testing approach before it is rolled out to other modules. Which workflow design fits best?',
    options: [
      'A single direct-execution run that writes tests for all 120 files in alphabetical order and opens one PR with everything for the lead to review.',
      'Three independent direct runs over the full module, keeping only the tests that at least two of the three runs generated.',
      'A multi-phase workflow: map structure and seams, write a prioritized plan for lead approval, then generate tests per area and adapt.',
      'Run in plan mode every night so that Claude explores the module and produces test designs without ever writing test files to the repository.'
    ],
    answer: [2],
    explanation: 'Open-ended, higher-risk work with an approval gate fits a multi-phase workflow: explore and map first, identify high-impact areas and test seams, get the plan approved, then implement incrementally and adapt as dependencies surface. A single direct pass over 120 files dilutes attention and commits to seams before anyone checks them; consensus across runs discards valid tests; permanent plan mode never delivers tests.',
    rationales: [
      'Commits to an unreviewed approach at full scale and produces an unreviewable PR.',
      'Voting filters by consistency, not correctness, and discards valid but less common tests.',
      'Correct. Exploration, an approved prioritized plan, then adaptive implementation.',
      'Plan mode alone is read-only; the job would never produce tests.'
    ],
    trap: 'Direct execution at full scale for open-ended, approval-gated work'
  },
  {
    id: 'e4-S5-11', scenario: 'S5', domain: 'D1', obj: 'O08', type: 'single', select: 1,
    stem: 'The review bot currently only comments. Leads want it to push fix-up commits where safe. Last month\'s findings split into: ktlint/SwiftFormat violations on changed lines (48%), missing null-checks with an obvious local fix (22%), and findings whose fix spans several modules or changes a public API, such as moving token refresh out of <code>AuthInterceptor</code> (30%). Which policy best balances automation against risk?',
    options: [
      'Auto-commit fixes for every category using <code>bypassPermissions</code>, relying on the CI test suite to catch any fix that turns out to be wrong.',
      'Generate a plan for every finding, including formatting violations, and push commits only after a lead approves each plan on the PR.',
      'Keep comment-only mode for all categories until the bot\'s fixes can be shown to be correct for the cross-module and API-changing findings.',
      'Directly commit formatter and obvious local fixes; for cross-module or API-changing fixes, post a proposed plan and await approval.'
    ],
    answer: [3],
    explanation: 'Choose the execution style by scope and risk: well-scoped mechanical or local fixes suit direct execution, while multi-file or API-changing fixes involve design choices and need a plan approved by a human before implementation. Auto-committing everything removes the approval gate exactly where it matters; planning formatter fixes adds friction without value; waiting for the hardest category forfeits the safe 70%.',
    rationales: [
      'Tests do not catch design regressions such as a poorly placed API change; no human approves the risky 30%.',
      'Approval for mechanical formatting fixes is pure overhead and slows every PR.',
      'Blocks the low-risk majority because of the high-risk minority.',
      'Correct. Direct execution where scope is clear; plan plus approval where fixes are architectural.'
    ],
    trap: 'One execution mode for all risk levels'
  },
  {
    id: 'e4-S5-12', scenario: 'S5', domain: 'D4', obj: 'O28', type: 'single', select: 1,
    stem: 'A release-branch PR touches 62 Kotlin and Swift files. The single review call returns <code>stop_reason: "max_tokens"</code> with a findings array cut off mid-object at file 41, and the CI step fails schema validation. Raising <code>max_tokens</code> from 8k to 16k last week moved the cut-off from file 23 to file 41. What is the right fix?',
    options: [
      'Raise <code>max_tokens</code> to the model\'s maximum output limit so that the findings for all 62 files fit into a single response.',
      'Review each file or small group of files in its own call with the same schema, merge the findings, then run a cross-file pass.',
      'Instruct Claude to shorten each finding\'s message to under 20 words so the findings for all 62 files fit within the current budget.',
      'On truncation, send a follow-up "continue" message and concatenate the partial JSON strings from both responses before validating them.'
    ],
    answer: [1],
    explanation: 'Truncated structured output is fixed by splitting the work into smaller scoped calls and merging the results. Per-file passes also improve review depth by avoiding attention dilution, and a separate integration pass catches cross-file issues. Raising the ceiling only moves the cut-off and fails again on bigger PRs, compressing messages removes actionable detail, and stitching partial JSON is fragile.',
    rationales: [
      'Postpones the failure to the next larger PR and does nothing for attention across 62 files.',
      'Correct. Scoped calls stay within output limits, and merging plus an integration pass keeps coverage.',
      'Loses the detail developers need to act on findings and still fails on larger PRs.',
      'Concatenating partial JSON across turns is error-prone and bypasses the schema guarantee.'
    ],
    trap: 'Raising max_tokens for truncation'
  },
  {
    id: 'e4-S5-13', scenario: 'S5', domain: 'D4', obj: 'O31', type: 'multi', select: 2,
    stem: 'The mobile review bot has a 71% dismissal rate. Of the dismissed comments, 58% are "possible memory leak" flags on coroutines launched in <code>viewModelScope</code> or <code>lifecycleScope</code>, and 19% are "force unwrap" flags in XCTest targets, which the team allows. Genuine findings, such as unscoped <code>GlobalScope.launch</code> calls or <code>self</code> captured strongly in escaping closures stored on <code>self</code>, are being ignored along with the noise. Which two changes should the team make first? (Select 2)',
    options: [
      'Temporarily disable the memory-leak category in production reviews while its criteria are rewritten and tested against the dismissed cases.',
      'Add "only report findings you are highly confident about" to the review prompt so that low-confidence leak and unwrap flags are suppressed.',
      'Run the review three times and post only the findings that appear in at least two of the runs, filtering out inconsistent flags.',
      'Define report/skip criteria: report GlobalScope launches and strong self captures; skip lifecycle-scoped launches and force-unwraps in tests.',
      'Raise the posting threshold so that only findings rated critical are posted, which removes most leak and unwrap comments from PRs.'
    ],
    answer: [0, 3],
    explanation: 'Precision comes from explicit categorical criteria that state what to report and what to skip, not from confidence-based filtering. Temporarily disabling a high false-positive category restores developer trust in the remaining categories while that category\'s criteria are fixed. "High confidence" instructions do not reliably change precision, consensus voting suppresses intermittent true positives, and a critical-only threshold hides real non-critical bugs.',
    rationales: [
      'Correct. Pausing the noisiest category protects trust in the accurate ones during the rework.',
      'The model is already "confident" about these false positives; vague confidence language does not define the boundary.',
      'Consistent false positives survive voting, while real but intermittently detected bugs are dropped.',
      'Correct. Explicit inclusion and exclusion boundaries target exactly the patterns causing dismissals.',
      'Severity thresholds hide genuine medium-severity issues without fixing the misclassification.'
    ],
    trap: 'Confidence filtering and voting instead of explicit criteria'
  },
  {
    id: 'e4-S5-14', scenario: 'S5', domain: 'D4', obj: 'O23', type: 'single', select: 1,
    stem: 'The nightly test-generation job runs an agentic loop per module: generate tests, run <code>./gradlew :module:test</code>, read the failures, revise, and repeat (6–10 turns on average). Finance proposes moving the whole job to the Message Batches API for the 50% discount because "nobody waits for it overnight." What is the best assessment?',
    options: [
      'Move the whole job to batches, since overnight work is latency-tolerant and each module\'s results can be matched back to it through its <code>custom_id</code>.',
      'Keep the whole job synchronous, because batch results come back in an unpredictable order and cannot be matched reliably to their modules.',
      'Batch requests cannot run tools mid-request, so only single-shot steps such as first drafts can be batched; the run-and-fix loop stays synchronous.',
      'Submit each turn of every module\'s loop as its own batch, polling between turns, so the entire loop runs at the discounted rate.'
    ],
    answer: [2],
    explanation: 'The Message Batches API suits latency-tolerant work but does not support multi-turn tool calling within a request: Claude cannot run the test suite and continue within one batch request. Single-shot steps can be batched, while the iterative verify-and-fix loop must stay synchronous. Submitting each turn as a batch makes each of 6–10 turns wait up to 24 hours, and custom_id solves ordering, so ordering is no reason to avoid batches.',
    rationales: [
      'Latency tolerance is necessary but not sufficient; the loop needs tool execution between turns.',
      'custom_id reliably correlates results regardless of order.',
      'Correct. Batch the single-shot parts; keep the tool-driven loop on the synchronous API.',
      'Each turn could take up to 24 hours, turning a nightly job into a multi-day one.'
    ],
    trap: 'Batch API for multi-turn tool loops'
  },
  {
    id: 'e4-S5-15', scenario: 'S5', domain: 'D4', obj: 'X11', type: 'single', select: 1,
    stem: 'After generating tests, the nightly job asks the same session: "Now review the tests you wrote and fix any weaknesses." It almost always approves its own work, yet mutation testing later shows that 35% of generated tests still pass when the code under test is broken (for example, asserting only that a Flow emits something). What is the most effective change to the review step?',
    options: [
      'Run the review in a fresh, independent Claude instance that sees the code and tests but not the generator\'s reasoning, using explicit criteria.',
      'Keep the same session but instruct it to be highly critical and to assume that every test it wrote contains at least one serious flaw it must find.',
      'Enable extended thinking in the generating session so it reasons more carefully about assertion strength before approving its own tests.',
      'Have the generator self-report a confidence score for each test and send only the tests scoring below 7 to a human reviewer.'
    ],
    answer: [0],
    explanation: 'A model reviewing within the same session retains its generation reasoning and is less likely to question its own decisions. An independent instance without that context, given explicit criteria (assertions must fail when behavior breaks), catches weak tests more reliably. Stronger wording and extended thinking in the same session keep the bias, and self-reported confidence is poorly calibrated.',
    rationales: [
      'Correct. Independent review without the generator\'s context avoids self-confirmation.',
      'Harsher instructions do not remove the shared reasoning context that biases self-review.',
      'More reasoning in the same context still reasons from the same assumptions.',
      'The generator is already confident in the weak tests; its self-scores will not flag them.'
    ],
    trap: 'Self-review in the generating session'
  }
]);
