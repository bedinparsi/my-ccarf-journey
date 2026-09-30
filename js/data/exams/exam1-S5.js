/* Practice Exam 1 — Scenario S5: Claude Code for CI (fintech payments monorepo: TypeScript services + Java settlement engine on GitHub Actions; PR review bot, test generation, security review passes) */
CCAR.addQuestions('exam1', [
  {
    id: 'e1-S5-01', scenario: 'S5', domain: 'D3', obj: 'O13', type: 'single', select: 1,
    stem: 'A staff engineer built the PR-review bot for the payments monorepo on her laptop, where it correctly accepts the team\'s <code>BigDecimal.compareTo</code> equality idiom and flags any new endpoint that lacks an idempotency key. In GitHub Actions the same command, <code>claude -p "$REVIEW_PROMPT" --output-format json --json-schema "$(cat review.schema.json)"</code>, flags the <code>compareTo</code> idiom on every PR and never mentions idempotency. The review standards live in <code>~/.claude/CLAUDE.md</code> on her laptop; the repository\'s root <code>CLAUDE.md</code> contains only build commands. What is the best fix?',
    options: [
      'Copy her <code>~/.claude/CLAUDE.md</code> into the home directory of the runner image during the workflow setup step, so CI sessions load exactly what her laptop loads today.',
      'Move the review standards into the committed project <code>CLAUDE.md</code> or <code>.claude/rules/</code> files, so every CI run and teammate loads the same conventions.',
      'Pass the standards with <code>--append-system-prompt "$(cat ~/.claude/CLAUDE.md)"</code> in the workflow, keeping her personal file as the single source of truth for the rules.',
      'Add <code>--add-dir ~/.claude</code> to the CI invocation so that Claude Code discovers the user-level memory directory on the runner and loads the review standards from it.'
    ],
    answer: [1],
    explanation: 'Team-wide review standards belong in project-scoped memory (root CLAUDE.md or .claude/rules/), which is committed to version control and loaded by every session that runs in the repository, including CI. ~/.claude/CLAUDE.md is user-level memory: it is personal, not shared, and absent from the runner. Copying or referencing the personal file keeps the standards outside version control, so they drift and other developers never get them.',
    rationales: [
      'Makes CI depend on one person\'s untracked file; it drifts from what teammates use and is not reviewed like code.',
      'Correct. Project-level memory is version-controlled and loaded by CI and every teammate alike.',
      'The file does not exist on the runner, and the standards would still live outside the repository.',
      '--add-dir grants access to extra directories; it is not how memory files are loaded, and the file is not on the runner anyway.'
    ],
    trap: 'User-level config for a team-wide need'
  },
  {
    id: 'e1-S5-02', scenario: 'S5', domain: 'D3', obj: 'O16', type: 'single', select: 1,
    stem: 'The monorepo\'s root <code>CLAUDE.md</code> has grown to 380 lines. About 140 of them are TypeScript money-handling conventions (use the <code>Money</code> type with <code>bigint</code> minor units, never <code>number</code> for amounts, round with <code>roundHalfEven</code> from <code>@pay/money</code>). They apply only to files matching <code>services/*/src/**/pricing/**</code>, <code>services/*/src/**/ledger/**</code> and <code>packages/checkout-sdk/src/amounts/**</code>, spread across nine services. Reviews of the Java settlement engine carry all of these lines in context, and reviewers have seen TypeScript rules applied to Java code. Which mechanism should hold these conventions?',
    options: [
      'A <code>CLAUDE.md</code> file in each of the nine service directories, each holding a copy of the money conventions that apply to that service\'s pricing and ledger code.',
      'A money-conventions skill in <code>.claude/skills/</code> whose description tells Claude to invoke it whenever a review touches currency amounts.',
      'A PreToolUse hook that blocks Edit and Write calls on amount-handling files unless the new file content imports <code>@pay/money</code> somewhere.',
      'A <code>.claude/rules/money-ts.md</code> file with <code>paths</code> frontmatter listing the three glob patterns, removed from the root CLAUDE.md.'
    ],
    answer: [3],
    explanation: 'Conventions that apply to a file pattern spread across many directories are what path-scoped rules are for: a .claude/rules/ file with a paths glob list loads only when Claude reads matching files, so Java reviews no longer carry TypeScript rules. Per-service CLAUDE.md copies duplicate content and miss the checkout-sdk path, a skill depends on the model choosing to invoke it, and a hook enforces one narrow check rather than supplying review guidance.',
    rationales: [
      'Nine copies drift, and subdirectory CLAUDE.md files do not map cleanly onto cross-cutting glob patterns such as packages/checkout-sdk.',
      'Skills are on-demand; a review may never invoke it, so conventions that must apply to matching files become optional.',
      'Deterministic but wrong tool: the review bot does not edit files, and an import check is not the same as the conventions.',
      'Correct. paths-scoped rules load conditionally for exactly the matching files and remove the bloat from root memory.'
    ],
    trap: 'Subdirectory CLAUDE.md or skill instead of path-scoped rules'
  },
  {
    id: 'e1-S5-03', scenario: 'S5', domain: 'D1', obj: 'O08', type: 'single', select: 1,
    stem: 'A CVE in the JSON library used by the Java settlement engine forces a move from <code>LegacyJsonMapper</code> to a new serializer. The change touches about 70 files across <code>settlement-engine/</code> and three shared libraries, and there are two valid strategies (an adapter shim or direct replacement) with different rollback risk. Compliance policy for payment-path code requires a named engineer to approve the approach before any code changes. The platform team wants Claude Code in GitHub Actions to do the work. Which architecture best fits?',
    options: [
      'Phase 1 runs in plan mode and posts a migration plan with the chosen strategy for approval; phase 2, triggered by that approval, executes the plan directly and is followed by an independent review job.',
      'One direct-execution run with <code>--permission-mode acceptEdits</code> performs the migration and opens a PR, and the normal PR review of the finished diff serves as the compliance approval of the approach.',
      'One plan-mode run is told to pause and ask the approving engineer for a decision in the job log before editing, and then continue with the edits in that same run once the engineer has answered.',
      'Direct execution is split into 70 parallel per-file jobs, each choosing whichever migration strategy fits its own file best, and their changes are merged into one pull request at the end.'
    ],
    answer: [0],
    explanation: 'Large, multi-file changes with several valid approaches and a required human decision call for a multi-phase workflow: plan mode investigates and proposes without editing, a human approves the approach, and a separate direct-execution phase implements the approved plan, followed by an independent review. Approving only the final diff skips the required approval of the approach, a -p run cannot pause for interactive input, and per-file jobs choosing strategies independently produce an inconsistent migration.',
    rationales: [
      'Correct. Plan for investigation and approval, then direct execution of the approved plan, then independent review.',
      'Compliance requires approval before code changes; reviewing a finished 70-file diff is approval after the fact.',
      'A non-interactive CI run cannot wait for a person to answer mid-run; the approval gate must sit between jobs.',
      'Strategy is a cross-cutting decision; letting each file choose independently yields a mixed, inconsistent migration.'
    ],
    trap: 'Single-phase execution when scope and approval needs require multi-phase'
  },
  {
    id: 'e1-S5-04', scenario: 'S5', domain: 'D3', obj: 'O11', type: 'single', select: 1,
    stem: 'The test-generation step runs:<pre>claude -p "Generate Jest tests for the files changed in this PR under services/ledger-api" \\\n  --output-format json &gt; out.json</pre>The job succeeds but no test files appear. <code>out.json</code> contains:<pre>{"type":"result","subtype":"success","num_turns":9,\n "result":"I wasn\'t able to create the test files because I don\'t have permission...",\n "permission_denials":[\n   {"tool_name":"Write","tool_input":{"file_path":"services/ledger-api/__tests__/fees.test.ts"}},\n   {"tool_name":"Bash","tool_input":{"command":"npx jest services/ledger-api"}}]}</pre>The runner also holds a deploy token for the staging payment gateway. What is the best change?',
    options: [
      'Add <code>--dangerously-skip-permissions</code> so that no tool call made at any point during the job can ever be blocked by a permission check again.',
      'Add <code>--non-interactive</code> so that Claude Code automatically approves every tool call that it would otherwise stop and prompt the user for.',
      'Add <code>--permission-mode acceptEdits</code> and <code>--allowedTools "Bash(npx jest *)"</code> to pre-approve file writes and the test command.',
      'Pipe <code>yes</code> into the command\'s standard input so that every permission prompt raised during the run is answered affirmatively.'
    ],
    answer: [2],
    explanation: 'In print mode nobody can answer permission prompts, so tools that need approval are denied and reported in permission_denials. The proportionate fix pre-approves exactly what the job needs: acceptEdits for file writes and an allowedTools rule for the Jest command. Bypassing all permissions on a runner that holds a deploy token grants far more than needed, --non-interactive is not a Claude Code flag, and piping stdin does not answer permission checks in -p mode.',
    rationales: [
      'Works, but removes every guardrail on a runner with live credentials; least privilege is the better design.',
      'Not a real Claude Code flag; -p is already the non-interactive mode.',
      'Correct. Scoped pre-approval for edits and the one Bash command the job needs.',
      'Print mode does not read permission answers from stdin; the denials would remain.'
    ],
    trap: 'Over-broad permission bypass or non-existent flag'
  },
  {
    id: 'e1-S5-05', scenario: 'S5', domain: 'D3', obj: 'O15', type: 'single', select: 1,
    stem: 'Nightly test generation for <code>services/ledger-api</code> uses the prompt "Write thorough unit tests for the changed files." An audit of 200 generated Jest tests found that 38% duplicate scenarios already covered in <code>__tests__/</code>, 25% open a real Postgres connection with <code>new Pool()</code> instead of the team\'s <code>createTestLedger()</code> fixture from <code>test/fixtures/</code>, and many assert only that a mock was called. Which change most effectively improves test quality?',
    options: [
      'Require at least 90% line coverage for each changed file, so that Claude writes more comprehensive tests that exercise every branch of the code.',
      'Switch the job to a larger model with extended thinking so that it reasons more carefully about which scenarios are actually worth testing.',
      'Keep the prompt as it is and delete, in a post-processing step, any generated test that does not raise coverage before the pull request is opened.',
      'Document the testing standards, valuable-test criteria and available fixtures in CLAUDE.md, and include the module\'s existing tests in context.'
    ],
    answer: [3],
    explanation: 'Test generation improves when Claude knows what already exists and what a valuable test looks like here. Existing test files in context prevent duplicate scenarios, and CLAUDE.md documentation of fixtures and test criteria steers it to createTestLedger() and to behavior assertions instead of mock-call checks. Coverage targets reward low-value tests, a bigger model still lacks the project knowledge, and coverage-based deletion keeps tests that misuse fixtures or assert trivially.',
    rationales: [
      'A coverage quota encourages more shallow tests; it does not tell Claude about fixtures or existing scenarios.',
      'The failures come from missing project context, not reasoning capacity.',
      'Filters after the fact; tests that open real DB connections or assert only on mocks can still raise coverage.',
      'Correct. Existing tests plus documented standards and fixtures address all three failure types at the source.'
    ],
    trap: 'Coverage quotas or bigger model instead of project test context'
  },
  {
    id: 'e1-S5-06', scenario: 'S5', domain: 'D3', obj: 'O12', type: 'single', select: 1,
    stem: 'CI uses Claude Code to generate JUnit tests for <code>FxAmountRounder</code> in the settlement engine. The prompt describes the rules in prose: "Round half-even to the currency\'s ISO 4217 minor-unit exponent; JPY has 0 decimals, BHD has 3; negative amounts round symmetrically." About 30% of the generated expected values are wrong, mostly for JPY, BHD and negative half-unit amounts. The team has already reworded the prose twice with no improvement. What is the best next step?',
    options: [
      'Expand the prose into a full ISO 4217 table listing every currency\'s exponent, plus a paragraph explaining half-even rounding and why banks and card networks use it.',
      'Add a few concrete input-to-expected-output pairs for the failing cases, such as <code>JPY 1234.5 → 1234</code> and <code>USD -0.125 → -0.12</code>.',
      'Generate each test class three times and keep only the expected values that all three runs agree on, discarding the assertions that disagree.',
      'Tell Claude to double-check every expected value with extended reasoning before writing each assertion, and to skip cases where it is unsure.'
    ],
    answer: [1],
    explanation: 'When prose descriptions keep being interpreted inconsistently, concrete input/output examples are the most effective way to communicate the expected transformation, especially for edge cases such as zero-decimal currencies and negative half-unit values. More prose repeats the approach that has already failed twice, consensus voting keeps only the easy cases and drops coverage of the hard ones, and asking the model to double-check lets it skip exactly the tests the team needs.',
    rationales: [
      'More of the same prose; two rewordings already showed that description alone does not fix the edge cases.',
      'Correct. Concrete examples pin down the exact behavior for the cases that keep failing.',
      'Agreement across runs is not correctness, and discarding disagreements removes the hard-case tests.',
      'Self-checking without examples leaves the misunderstanding in place and invites skipping the difficult cases.'
    ],
    trap: 'More prose or self-checking instead of concrete I/O examples'
  },
  {
    id: 'e1-S5-07', scenario: 'S5', domain: 'D3', obj: 'O13', type: 'single', select: 1,
    stem: 'The settlement review step is:<pre>- run: |\n    git diff origin/main...HEAD -- settlement-engine/ \\\n      | claude -p "Review this diff against our settlement standards. Report findings only." \\\n          --output-format json --json-schema "$(cat .github/review.schema.json)"</pre>and the team\'s rule file is:<pre># .claude/rules/settlement-java.md\n---\npaths: ["settlement-engine/**/*.java"]\n---\n- Monetary values use MinorUnits (long), never double\n- Every ledger posting goes through PostingService.post()</pre>Reviews miss violations of these rules and have even suggested <code>double</code> arithmetic. The job output shows <code>"num_turns": 1</code> and no tool calls. In interactive sessions, the rule loads as soon as a developer opens a settlement Java file. What is the cause?',
    options: [
      'The <code>paths</code> glob is resolved relative to the rule file\'s own directory, so it must be written as <code>../../settlement-engine/**/*.java</code> to match.',
      'Files in <code>.claude/rules/</code> load only in interactive sessions; print-mode runs read the root CLAUDE.md and ignore the rules directory.',
      'Path-scoped rules load when Claude reads a matching file; the job pipes only diff text, so no <code>.java</code> file is read and the rule never loads.',
      'Supplying <code>--json-schema</code> replaces project context with the schema, so rules and CLAUDE.md content are dropped for structured-output runs.'
    ],
    answer: [2],
    explanation: 'A rule with a paths field is loaded only when Claude reads a file that matches the glob. This job pipes the diff on stdin and Claude answers in one turn without reading any file, so the settlement rules never enter context. Fix it by having the review read the changed files (pass the file list and let it Read them) or by supplying the review standards explicitly for this job, for example with --append-system-prompt or an unscoped review rule.',
    rationales: [
      'paths globs are written relative to the project root; the existing pattern is correct and works interactively.',
      'Print mode loads memory and rules the same way; the trigger condition is the issue.',
      'Correct. No matching file is read, so the conditional rule is never triggered.',
      '--json-schema constrains the output shape; it does not remove project memory.'
    ],
    trap: 'Misattributing a path-rule trigger condition to flags or glob syntax'
  },
  {
    id: 'e1-S5-08', scenario: 'S5', domain: 'D4', obj: 'O28', type: 'single', select: 1,
    stem: 'A Python orchestrator runs the security pass through the Messages API, sending every changed file in one request and forcing the <code>report_security_findings</code> tool. On PRs with more than about 25 files it fails:<pre>pr=4471 files=38 input_tokens=91204 output_tokens=8192\nstop_reason=max_tokens\ntool_use.input: {"findings":[{"file":"services/payment-gateway/src/webhooks/verify.ts","line":88, ...\n  ... {"file":"settlement-engine/src/main/java/com/pay/settle/Batch\njson.decoder.JSONDecodeError: Unterminated string starting at char 30871</pre>Which fix is most effective?',
    options: [
      'Run the pass per file or per small group of related files, each call returning its own findings through the tool, then merge and dedupe the findings in code before posting.',
      'Raise <code>max_tokens</code> to 32,000 so the findings for large PRs fit, and keep a single call so that the cross-file context stays available to the model for every finding.',
      'Instruct the model to keep each finding\'s description under 20 words, so the complete findings array fits within the current output budget on every PR.',
      'Catch the <code>JSONDecodeError</code> and retry the identical request up to three times, posting whatever findings parse successfully on the final attempt.'
    ],
    answer: [0],
    explanation: 'stop_reason max_tokens means the tool input was cut off mid-generation. The robust fix is to scope each call to less work (per file or small file group) so every structured output completes, then merge the results in code; a separate integration pass can cover cross-file data flow. Raising max_tokens only moves the ceiling and keeps attention diluted across 38 files, terser descriptions still fail on the next larger PR, and identical retries truncate at the same point.',
    rationales: [
      'Correct. Smaller scoped calls complete within the output limit and are merged deterministically.',
      'Moves the ceiling without removing it, and one pass over 38 files still suffers attention dilution.',
      'Buys a little headroom but still fails as PR size grows, and loses useful detail in each finding.',
      'The same request hits the same limit; retries cannot fix a structural output-size problem.'
    ],
    trap: 'Raise max_tokens instead of splitting into scoped calls'
  },
  {
    id: 'e1-S5-09', scenario: 'S5', domain: 'D4', obj: 'O31', type: 'single', select: 1,
    stem: 'The security pass has a "sensitive data exposure" category driven by the instruction "Flag any code that might expose sensitive payment data." Over three weeks, 61% of its findings were dismissed: <code>logger.info({ panLast4 })</code>, <code>log.debug("token={}", maskPan(pan))</code>, and Stripe test card numbers in <code>__fixtures__/cards.ts</code>. Developers now skip the whole category, and two real findings where a raw CVV reached a log line went unaddressed. Which change best restores precision without losing those real findings?',
    options: [
      'Add "Only report sensitive-data findings when you are highly confident they are real, and be especially conservative with this category" to the review prompt.',
      'Have the model output a confidence score for every finding and post only those sensitive-data findings scored above 0.85 to the pull request.',
      'Remove the sensitive-data category from the pass permanently and rely on the quarterly PCI audit to catch data exposure issues in the codebase.',
      'Define it explicitly: report raw PAN, CVV or track data reaching logs, responses or storage without <code>maskPan()</code>; skip last-4, tokens, fixtures.'
    ],
    answer: [3],
    explanation: 'Precision comes from explicit categorical criteria that say what to report and what to skip, not from vague instructions such as "be conservative" or confidence thresholds. Naming the sensitive fields, the sinks and the sanctioned masking functions, and excluding last-4 digits, tokens and fixtures, removes the dismissed patterns while keeping raw-CVV logging in scope. Permanently removing the category would drop the real findings entirely.',
    rationales: [
      'General caution instructions do not tell the model which cases are benign; precision barely changes.',
      'Self-reported confidence is poorly calibrated and can filter out the real CVV findings along with the noise.',
      'Loses the true positives; temporary disabling while fixing criteria is reasonable, permanent removal is not.',
      'Correct. Explicit inclusion and exclusion boundaries target exactly the false-positive patterns.'
    ],
    trap: 'Confidence filtering and "be conservative" instead of explicit criteria'
  },
  {
    id: 'e1-S5-10', scenario: 'S5', domain: 'D4', obj: 'O24', type: 'multi', select: 2,
    stem: 'One review prompt covers security, ledger business logic (double-entry balance, idempotency) and REST API design, with six few-shot examples that are mostly about endpoint naming. API naming comments now dominate the output, security findings are generic ("validate input"), and the bot missed a webhook handler that skipped HMAC signature verification and a refund path that posted a debit without a matching credit. Which two changes best address this? (Select 2)',
    options: [
      'Split the review into separate passes for security, ledger business logic and API design, each with its own focused criteria and output.',
      'Run the existing combined prompt three times and post only the findings that appear in at least two of the three runs, to cut noise.',
      'Merge all three categories\' criteria into one longer prompt that tells the model to prioritize security first, then business logic, then API.',
      'Give each pass dedicated few-shot examples from this codebase, such as an unverified webhook signature or an unbalanced ledger posting.',
      'Switch the review to the largest available model with a bigger context window so that it gives every category adequate attention at once.'
    ],
    answer: [0, 3],
    explanation: 'Mixing unrelated concerns in one pass lets the best-illustrated category crowd out the others. Specialized passes give each concern focused attention and criteria, and dedicated few-shot examples per pass show the model what a real security or ledger defect looks like in this codebase, which is what the generic findings lacked. Majority voting suppresses intermittent true positives, a longer combined prompt keeps the dilution, and a bigger model does not fix unfocused instructions.',
    rationales: [
      'Correct. Separate passes stop API naming from crowding out security and ledger analysis.',
      'Consensus filtering removes exactly the findings that are caught only intermittently, such as the missed HMAC check.',
      'Priority wording inside one prompt does not remove the attention competition or the skewed examples.',
      'Correct. Pass-specific examples teach what real security and ledger defects look like here.',
      'Context size is not the constraint; the prompt structure and examples are.'
    ],
    trap: 'Consensus voting or bigger model instead of specialized passes'
  },
  {
    id: 'e1-S5-11', scenario: 'S5', domain: 'D4', obj: 'O30', type: 'single', select: 1,
    stem: 'The review bot keeps flagging three things the team considers correct: <code>@SuppressWarnings("unchecked")</code> in <code>settlement-engine/build/generated-sources/jooq/**</code>, <code>any</code> in <code>packages/api-types/src/generated/*.d.ts</code> produced by openapi-typescript, and <code>catch (e) { throw new SettlementRetryableException(e); }</code>, the sanctioned retry wrapper described in ADR-014. Engineers reply "intended, see ADR-014" on each PR, yet the same comments reappear on the next PR. What is the best fix?',
    options: [
      'Ask engineers to add a "known false positives" section to each PR description, so that the bot can read the exclusions that apply to that specific change.',
      'Record the accepted patterns and exclusions, with the ADR-014 rationale, in the project CLAUDE.md or rules files that the CI review loads on every run.',
      'Post-process the bot\'s output and drop any comment whose text matches a regex built from the wording of previously dismissed review comments.',
      'Feed every earlier PR\'s "intended, see ADR-014" reply threads into each new review so that the bot gradually learns from past dismissals.'
    ],
    answer: [1],
    explanation: 'Accepted patterns and exclusions are durable project knowledge, so they belong in persistent context that every CI review loads: generated-code paths to skip and sanctioned idioms with their rationale. That removes the false positives at the source and generalizes to new instances of the same pattern. Per-PR descriptions depend on each author, regex filters break when the wording changes, and piling old reply threads into context is noisy and unbounded.',
    rationales: [
      'Pushes the burden onto every author and is forgotten on most PRs.',
      'Correct. Persistent project context with rationale prevents the same false positives on every run.',
      'Model wording varies between runs, so text-matching filters miss rephrased duplicates and may hide real issues.',
      'Unstructured, growing history is costly and less reliable than stating the convention once.'
    ],
    trap: 'Per-PR or post-filter fixes instead of persistent conventions'
  },
  {
    id: 'e1-S5-12', scenario: 'S5', domain: 'D4', obj: 'X11', type: 'single', select: 1,
    stem: 'An <code>@claude fix</code> workflow has Claude Code generate a patch for a failing idempotency test in <code>services/payment-gateway</code>. In the same session the workflow then sends "Now review your changes for security and correctness" before opening the PR. The self-review approves 96% of patches. Human reviewers later found an approved patch that cached idempotency keys in process memory, which breaks when the gateway runs as multiple replicas. Which change most improves the review step?',
    options: [
      'Continue the generating session with <code>--continue</code> and a stricter review prompt that lists common concurrency and multi-replica pitfalls to check.',
      'Use <code>--fork-session</code> on the generator\'s session so the review runs in a separate branch of the conversation that has its own session ID.',
      'Run the review as a separate <code>claude -p</code> invocation that receives only the diff and relevant standards, without the generator\'s reasoning.',
      'Enable extended thinking for the self-review turn and require the model to report a confidence score for each change that it decides to approve.'
    ],
    answer: [2],
    explanation: 'A session that generated a change retains its own reasoning and is less likely to question its decisions. An independent instance that sees only the diff and the standards reviews the code without that bias and is more likely to catch assumptions such as per-process state. Continuing or forking the session carries the generator\'s context along, and extended thinking or confidence scores do not remove the self-review bias.',
    rationales: [
      'Same context, same blind spots; a checklist helps little when the reviewer shares the generator\'s assumptions.',
      'A fork inherits the conversation history, so the generator\'s reasoning is still in context.',
      'Correct. An independent instance without generation context is the effective reviewer.',
      'More reasoning in the same context and self-reported confidence do not provide independence.'
    ],
    trap: 'Self-review or forked session instead of an independent instance'
  },
  {
    id: 'e1-S5-13', scenario: 'S5', domain: 'D4', obj: 'O23', type: 'single', select: 1,
    stem: 'Three Claude workloads run against the monorepo: (1) a required pre-merge security check that blocks merging until it passes; (2) nightly test generation that writes tests, runs them with Jest and Gradle, and iterates on failures; (3) a weekly dependency-risk audit that sends each service\'s lockfile and SBOM for a single-response analysis read on Monday morning. Finance proposes moving all three to the Message Batches API for the 50% discount. What is the best evaluation?',
    options: [
      'Batch only the weekly audit; keep the pre-merge check synchronous, and keep test generation as an agent run, since a batch request cannot execute tools mid-request.',
      'Batch both the nightly test generation and the weekly audit because both run outside working hours, and keep only the blocking pre-merge check on the synchronous API.',
      'Batch all three and poll every minute, falling back to the synchronous API for the pre-merge check whenever its batch has been running for more than ten minutes.',
      'Keep all three workloads on the synchronous API, because batch results come back unordered and cannot be reliably matched to the service or PR that produced them.'
    ],
    answer: [0],
    explanation: 'Batches suit latency-tolerant, single-request work such as the weekly audit, and are wrong for blocking checks because there is no latency SLA within the 24-hour window. Nightly test generation looks latency-tolerant, but it depends on executing tools and iterating, and a batch request cannot run tools mid-request and continue. Ordering is not a blocker because custom_id correlates each result with its request.',
    rationales: [
      'Correct. Matches each workload to the API by latency needs and by whether it needs multi-turn tool execution.',
      'Overlooks that test generation must run tests and iterate, which one batch request cannot do.',
      'Adds complexity and still leaves a blocking check exposed to unpredictable batch latency.',
      'custom_id correlates results with requests, so ordering does not rule out batching the audit.'
    ],
    trap: 'Batching an overnight workload that needs multi-turn tool execution'
  },
  {
    id: 'e1-S5-14', scenario: 'S5', domain: 'D3', obj: 'O16', type: 'single', select: 1,
    stem: 'A developer added this hook, and on his machine every Java file Claude edits is formatted immediately:<pre># .claude/settings.local.json   (listed in .gitignore)\n{\n  "hooks": {\n    "PostToolUse": [\n      { "matcher": "Edit|Write",\n        "hooks": [{ "type": "command", "command": "./gradlew -q spotlessApply" }] }\n    ]\n  }\n}</pre>In the CI test-generation job, about 40% of the Java files Claude writes fail <code>spotlessCheck</code>. The team wants formatting guaranteed after every edit in every session, including teammates\' sessions and CI. What should they do?',
    options: [
      'Add "Always run ./gradlew spotlessApply after editing Java files" to the project CLAUDE.md so that CI sessions follow the same step as local ones.',
      'Move the hook into <code>~/.claude/settings.json</code> in the CI runner image so it applies to every Claude Code session that runs on the runners.',
      'Create a format-java skill whose description says it must be used after editing Java, so that Claude invokes it automatically in every session.',
      'Move the hook block into the committed <code>.claude/settings.json</code> so the same hook runs in every session in the repo, CI included.'
    ],
    answer: [3],
    explanation: 'settings.local.json is personal and gitignored, so the hook exists only on the author\'s machine. A deterministic guarantee for the whole team belongs in the committed project .claude/settings.json, which every session in the repository loads, including CI. CLAUDE.md instructions and skills are probabilistic, and a user-level file baked into the runner image covers CI but not teammates, and lives outside the repository.',
    rationales: [
      'An instruction can be skipped; the team asked for a guarantee.',
      'Covers the runners only; teammates\' sessions still lack the hook, and the config drifts from the repo.',
      'Skill invocation is up to the model, so formatting would still be skipped some of the time.',
      'Correct. Project-scoped settings share the deterministic hook with every session.'
    ],
    trap: 'Local or user-level settings for a team-wide guarantee'
  },
  {
    id: 'e1-S5-15', scenario: 'S5', domain: 'D3', obj: 'O13', type: 'multi', select: 2,
    stem: 'A security pass runs on every PR, including PRs from external contributors\' forks. The workflow writes the diff to <code>pr.diff</code> beforehand. Requirements: findings are uploaded as code-scanning annotations by a script that expects <code>{file, line, cwe, severity, message}</code> objects; the pass must not modify the checkout; and it must not be able to run commands or make network requests, because the runner environment holds a deploy token. The current command is <code>claude -p "Security review of pr.diff" --output-format json</code>. Which two changes meet the requirements? (Select 2)',
    options: [
      'Add "Do not edit files, run commands or access the network; output only JSON with file, line, cwe, severity, message" to the prompt.',
      'Add <code>--json-schema</code> with the findings schema so that the output is validated against the structure the upload script expects.',
      'Add <code>--permission-mode plan</code> so that the pass runs read-only and returns its findings as a structured plan the script can parse.',
      'Switch to <code>--output-format stream-json</code> so that each finding arrives as a separate JSON event the upload script can consume.',
      'Add <code>--tools "Read,Grep,Glob"</code> so that the pass has only read-only file tools, with no Edit, Write, Bash or web tools available.'
    ],
    answer: [1, 4],
    explanation: 'Automation needs machine-parseable output, which --json-schema provides on top of --output-format json. Safety requirements need deterministic tool restriction: limiting built-in tools to Read, Grep and Glob removes editing, shell and web access entirely, which matters when untrusted fork code is under review. Prompt instructions are probabilistic, plan mode neither produces the findings schema nor removes shell access, and stream-json changes the transport rather than the shape of the findings.',
    rationales: [
      'Probabilistic for both output format and safety; a prompt cannot guarantee either.',
      'Correct. Schema-validated output is what the upload script needs.',
      'Plan mode is for proposing changes; it does not enforce the findings schema or remove shell access.',
      'stream-json streams events, but nothing constrains each finding to the required fields.',
      'Correct. Restricting the available tools deterministically removes edit, shell and network capability.'
    ],
    trap: 'Prompt or plan mode instead of schema output and tool restriction'
  }
]);
