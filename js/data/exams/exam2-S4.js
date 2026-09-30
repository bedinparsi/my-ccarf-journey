/* Practice Exam 2 — Scenario S4: Developer Productivity with Claude
   Context: 15-year-old Java/Spring banking codebase with a COBOL bridge (CICS), plus internal MCP servers. */
CCAR.addQuestions('exam2', [
  {
    id: 'e2-S4-01',
    scenario: 'S4',
    domain: 'D2',
    obj: 'O17',
    type: 'single',
    select: 1,
    stem: 'An engineer asks the productivity agent: "How does a card payment reach the COBOL ledger?" The repository has 6,400 Java files. The agent\'s first move is to Glob <code>**/*.java</code> and Read files alphabetically; it exhausts its context after ~180 files, still inside <code>com/northbridge/admin</code>. What exploration strategy should the agent\'s prompt direct?',
    options: [
      'Grep for entry points (the card-payment controller mapping, <code>CicsBridgeClient</code> usages), Read those files, then follow imports and calls, noting findings as it goes.',
      'Glob all Java files, then Read them in order of file size, smallest first, so that more files fit before the context fills and overall coverage of the codebase is maximized.',
      'Read every file under <code>com/northbridge/payments</code> in full first, then every file under <code>com/northbridge/bridge</code> in full, and only then attempt to answer the question.',
      'Run <code>cat $(find . -name "*.java")</code> once through Bash, so the entire codebase arrives in a single tool result instead of thousands of separate Read calls.'
    ],
    answer: [0],
    explanation: 'Systematic exploration builds understanding incrementally: Grep locates the entry points and integration seams relevant to the question, Read loads only those files, and following imports and calls traces the actual flow. This keeps context for relevant code and a running record of findings. Reading everything, in any order, spends the budget on unrelated files.',
    rationales: [
      'Correct. Targeted Grep for entry points, then Read and trace, is the context-efficient way to answer a flow question.',
      'Size ordering is unrelated to relevance; it still reads thousands of irrelevant files.',
      'Better targeted than alphabetical, but reading whole packages upfront is still broad and may miss the path through other modules.',
      'Dumping 6,400 files into one tool result overflows context immediately and is the opposite of incremental exploration.'
    ],
    trap: 'Reading all files upfront instead of Grep → Read → trace'
  },
  {
    id: 'e2-S4-02',
    scenario: 'S4',
    domain: 'D2',
    obj: 'O17',
    type: 'single',
    select: 1,
    stem: 'You need every caller of the legacy <code>LedgerGateway.postTransaction()</code> before it is retired. Grep for <code>postTransaction(</code> finds only 3 call sites, but production traces show at least 40 services posting to the ledger. You then discover that <code>LegacyPostingAdapter</code> wraps the gateway behind six public methods with different names (<code>postDebit</code>, <code>postCredit</code>, <code>reverse</code>, …), and a Spring bean alias <code>ledgerPoster</code> injects the adapter elsewhere. What is the most reliable next step?',
    options: [
      'Read the 40 services named in the production traces one by one and scan each file manually for anything that looks like a call that posts to the ledger.',
      'Grep far more loosely for <code>post</code> across the whole repository and have the agent Read every match in order to decide which ones are genuine ledger calls.',
      'Read <code>LegacyPostingAdapter</code> and the bean config to list every exported method and alias, then Grep for each of those names across the codebase.',
      'Conclude that the three direct call sites are the real callers, because the adapter methods are thin delegations that will be removed along with the gateway.'
    ],
    answer: [2],
    explanation: 'Tracing usage through wrapper modules requires first identifying every name the wrapper exports (methods, bean aliases), then searching for each one across the codebase. This turns an incomplete single-pattern Grep into a complete, targeted set of searches. Traces show only what ran recently, and loose patterns drown the signal.',
    rationales: [
      'Production traces cover only exercised paths and may miss batch or rarely used callers; manual scanning is also unreliable.',
      'A loose pattern returns thousands of false matches and wastes context reading them.',
      'Correct. Enumerate the wrapper\'s exported names, then Grep for each, to find indirect callers.',
      'The adapter\'s callers are exactly the indirect callers that retirement must migrate; ignoring them causes breakage.'
    ],
    trap: 'Stopping at direct call sites when a wrapper re-exports the function'
  },
  {
    id: 'e2-S4-03',
    scenario: 'S4',
    domain: 'D2',
    obj: 'O32',
    type: 'single',
    select: 1,
    stem: 'The agent is asked to change the error handling in one <code>return null;</code> branch of <code>AccountStatementService.java</code> (3,100 lines). Its Edit call fails with "old_string is not unique in the file: found 27 matches". It retries twice with the same anchor, then proposes Bash <code>sed -i \'s/return null;/throw new StatementNotFoundException();/\'</code>, which would rewrite all 27 occurrences. What should the agent do?',
    options: [
      'Run the <code>sed</code> command, then revert the 26 unintended replacements with a second <code>sed</code> that targets each of the other line numbers individually.',
      'Keep retrying Edit with the same anchor, since Edit disambiguates repeated matches on retry by choosing the occurrence closest to the most recent Read offset.',
      'Use Write to replace the whole file with a regenerated version reconstructed from memory of the parts of the class that it has seen earlier in the session.',
      'Read the file, then Edit with a longer anchor that is unique (surrounding method lines), or if none is reliable, Write back the full modified contents.'
    ],
    answer: [3],
    explanation: 'Edit needs anchor text that matches exactly once. When the short anchor is ambiguous, the agent should Read the file and either widen the anchor with unique surrounding context or, if that is not reliable, fall back to Read + Write of the full modified file. Blind global replacement and writing from memory both risk corrupting a 3,100-line banking class.',
    rationales: [
      'Global replacement followed by manual reversal is error-prone and can leave the file in an inconsistent state.',
      'Edit does not change behavior on retry; the same non-unique anchor fails the same way.',
      'Writing from partial memory without a fresh Read will drop or alter code the agent never saw.',
      'Correct. Read, then a unique anchor or a full Read + Write fallback gives a reliable targeted change.'
    ],
    trap: 'Bash sed or blind retries when Edit anchors are not unique'
  },
  {
    id: 'e2-S4-04',
    scenario: 'S4',
    domain: 'D2',
    obj: 'O33',
    type: 'single',
    select: 1,
    stem: 'The single productivity agent now has 26 tools: the built-ins plus tools from four MCP servers (<code>mainframe</code>, <code>change-request</code>, <code>schema-catalog</code>, <code>build-farm</code>). Since the last two servers were added, wrong-tool calls rose from 3% to 17%; for example, it calls <code>schema-catalog</code> search when asked to find Java code, and triggers a <code>build-farm</code> job when asked to "check the build config". What is the best architectural fix?',
    options: [
      'Add a system-prompt paragraph listing all 26 tools with one-line summaries and a priority order, so that the model can pick the right tool correctly in each case.',
      'Split the work into specialized subagents (code exploration, mainframe, change requests, builds), each with only the 4–6 tools its role needs, under a coordinator.',
      'Switch the agent to the largest available model, since picking correctly among many similar tools is a reasoning capability that improves with model size.',
      'Keep all 26 tools and set <code>tool_choice: {"type": "any"}</code>, so that the agent is always forced to pick some tool and stops answering from memory instead.'
    ],
    answer: [1],
    explanation: 'Tool selection reliability degrades as an agent\'s tool count grows, because every decision has more plausible options. Distributing tools across role-specific subagents gives each one a small, relevant set, and the coordinator routes by task. This fixes the cause (decision complexity), whereas prompts or bigger models only partially compensate for it.',
    rationales: [
      'A long tool list in the prompt adds tokens but leaves the same 26-way decision on every call.',
      'Correct. Scoped subagents with 4–6 role-relevant tools reduce selection complexity and misuse.',
      'Bigger models do not remove the underlying selection ambiguity; the fix is in the architecture.',
      'Forcing a tool call makes misselection more frequent, not less, and does nothing about which tool is chosen.'
    ],
    trap: 'Too many tools on one agent; bigger model as a non-fix'
  },
  {
    id: 'e2-S4-05',
    scenario: 'S4',
    domain: 'D2',
    obj: 'O33',
    type: 'single',
    select: 1,
    stem: 'A "legacy explainer" subagent\'s role is read-only: answer questions about how the COBOL bridge works. Its AgentDefinition omits <code>tools</code>, so it inherits everything. Twice this week it "helpfully" edited <code>BridgeRecordMapper.java</code> to fix what it thought was a bug and ran <code>mvn -q install</code>, breaking a teammate\'s local build. What change best fits the subagent\'s role?',
    options: [
      'Set its <code>tools</code> to read-only discovery tools (Read, Grep, Glob, plus the copybook lookup) so it cannot edit files or run builds.',
      'Add "You are read-only; never edit files or run Maven" to its prompt, and keep inheriting all tools in case an unusual question needs them.',
      'Keep full inheritance but add a Stop hook that runs <code>git checkout .</code> after each explainer session to undo any edits the subagent made.',
      'Remove the subagent and let the coordinator answer every bridge question directly, since the coordinator is already trusted with write access.'
    ],
    answer: [0],
    explanation: 'An omitted <code>tools</code> field means the subagent inherits every tool, so an explainer role ends up with edit and shell access it never needs. Restricting its tools to read-only discovery tools enforces the role boundary deterministically. Prompt rules are probabilistic, and cleanup hooks undo damage after the fact (and could discard the engineer\'s own uncommitted work).',
    rationales: [
      'Correct. Least-privilege, role-appropriate tools make edits and builds impossible for the explainer.',
      'The instruction can be ignored while the tools remain available, which is what already happened.',
      'Reverting after the fact is destructive: it can wipe the engineer\'s own uncommitted changes and does not stop the Maven run.',
      'Moves bridge exploration into the coordinator\'s context and gives the work to an agent with even broader access.'
    ],
    trap: 'Inherited full tool set on a read-only role'
  },
  {
    id: 'e2-S4-06',
    scenario: 'S4',
    domain: 'D1',
    obj: 'O06',
    type: 'multi',
    select: 2,
    stem: 'The coordinator never spawns the copybook subagent, and when engineers invoke the subagent on its own in a test harness it replies that it has no way to fetch copybooks.<pre>const copybookAgent: AgentDefinition = {\n  description: \'Resolves COBOL copybook layouts (PIC, REDEFINES, OCCURS) for fields \' +\n    \'passed across the Java-COBOL bridge. Use for record-layout and field-offset questions.\',\n  prompt: \'You analyze copybooks. Always fetch the copybook with get_copybook before answering.\',\n  tools: [\'Read\', \'Grep\', \'Glob\'],\n  model: \'sonnet\'\n};\n\nquery({ prompt: question, options: {\n  allowedTools: [\'Read\', \'Grep\', \'Glob\', \'mcp__mainframe__get_copybook\'],\n  mcpServers: { mainframe: mainframeServer },\n  agents: { \'copybook-analyst\': copybookAgent }\n}});</pre>Which TWO changes are required? (Select 2)',
    options: [
      'Change the subagent\'s <code>model</code> from <code>\'sonnet\'</code> to <code>\'opus\'</code> so that it reliably recognizes when it should call the copybook tool.',
      'Add <code>\'Task\'</code> to the coordinator\'s <code>allowedTools</code> so it is able to spawn the copybook-analyst subagent at all.',
      'Shorten the subagent\'s <code>description</code> to "Copybook questions" so that the coordinator matches it to a wider range of user questions.',
      'Add a sentence to the coordinator\'s prompt telling it to delegate all record-layout questions to the copybook-analyst subagent.',
      'Add <code>\'mcp__mainframe__get_copybook\'</code> to the subagent\'s <code>tools</code>, which currently excludes the tool its prompt requires.'
    ],
    answer: [1, 4],
    explanation: 'There are two independent wiring faults. The coordinator cannot spawn any subagent because its <code>allowedTools</code> lacks "Task" (the Agent tool in the current SDK). Separately, the subagent\'s explicit <code>tools</code> list replaces inheritance and omits <code>mcp__mainframe__get_copybook</code>, so even when spawned it cannot do its job. The description is already specific, and model or prompt changes cannot supply missing tools.',
    rationales: [
      'Model capability is irrelevant when the tool is not in the subagent\'s tool list.',
      'Correct. Without "Task" in allowedTools the coordinator has no way to spawn subagents.',
      'The current description is specific and useful for routing; making it vaguer would hurt selection.',
      'A prompt instruction cannot be followed without the Task tool; it does not fix spawning.',
      'Correct. The explicit tools list must include the MCP tool the subagent\'s role depends on.'
    ],
    trap: 'Prompt/model fixes for missing Task permission and missing subagent tool'
  },
  {
    id: 'e2-S4-07',
    scenario: 'S4',
    domain: 'D1',
    obj: 'O06',
    type: 'single',
    select: 1,
    stem: 'The coordinator (whose <code>allowedTools</code> includes "Task") has two subagents:<pre>agents: {\n  \'code-explorer\': {\n    description: \'Helps with code questions\',\n    prompt: \'You explore the Java codebase...\',\n    tools: [\'Read\', \'Grep\', \'Glob\']\n  },\n  \'bridge-analyst\': {\n    description: \'Helps with code\',\n    prompt: \'You are an expert on the Java-COBOL bridge, CICS transactions and copybooks...\',\n    tools: [\'Read\', \'Grep\', \'Glob\', \'mcp__mainframe__get_copybook\']\n  }\n}</pre>Across 50 test questions about the bridge (e.g. "What does transaction BRG-PAYMT return on a stale balance?"), the coordinator delegated 46 to <code>code-explorer</code>, which answered from Java code alone and missed copybook details. What is the best fix?',
    options: [
      'Add <code>mcp__mainframe__get_copybook</code> to <code>code-explorer</code>\'s tools, so whichever subagent is chosen can read copybooks when a question requires it.',
      'Add a coordinator prompt rule: "If the question contains the word COBOL, delegate to bridge-analyst", so that bridge questions route reliably by keyword.',
      'Remove <code>code-explorer</code> so that every code question goes to <code>bridge-analyst</code>, which has a superset of the tools and can handle Java questions as well.',
      'Rewrite both descriptions to state each agent\'s domain and when to use it instead of the other (e.g. CICS, copybooks, <code>com.northbridge.bridge</code>).'
    ],
    answer: [3],
    explanation: 'The coordinator chooses subagents from their <code>description</code> fields, so near-identical, vague descriptions make routing effectively arbitrary. Descriptions should state each agent\'s domain, inputs, and when to prefer it over similar agents. Keyword rules are brittle (the example question never says "COBOL"), and spreading tools across roles hides the routing problem instead of fixing it.',
    rationales: [
      'Gives cross-role tools to the wrong agent and still leaves routing arbitrary; the specialized prompt goes unused.',
      'Keyword-sensitive routing misses questions phrased around transactions or copybooks without the word COBOL.',
      'Collapses the specialization and burdens one agent with every question; the underlying description problem remains.',
      'Correct. Distinct, boundary-setting descriptions are what the coordinator uses to route to the right subagent.'
    ],
    trap: 'Vague overlapping AgentDefinition descriptions'
  },
  {
    id: 'e2-S4-08',
    scenario: 'S4',
    domain: 'D1',
    obj: 'O09',
    type: 'single',
    select: 1,
    stem: 'An overnight job maps all 41 Maven modules for the modernization team: a coordinator spawns an analysis subagent per module and assembles a dependency and risk report. Runs take ~7 hours. Last week a node eviction at hour 5 lost everything, and the full rerun missed the morning architecture review. What design gives reliable resumption without repeating work or losing findings?',
    options: [
      'Resume the coordinator session with <code>--resume</code> after an eviction and ask it to carry on, since its transcript already contains every subagent result it received.',
      'Launch all 41 subagents in a single coordinator response so the job finishes much faster and the window in which a node eviction can interrupt the overnight run becomes far smaller.',
      'Subagents write findings to per-module state files and a manifest tracks module status; on restart the coordinator loads it, skips completed modules, and injects saved findings.',
      'Keep all findings in the coordinator\'s context and run <code>/compact</code> after every five modules, so the session stays small enough to restart quickly after a failure.'
    ],
    answer: [2],
    explanation: 'Crash recovery for multi-agent pipelines relies on structured state exports: each agent writes its results to a known location, and a manifest records which units are complete. On restart the coordinator loads the manifest, schedules only unfinished modules, and injects saved findings where later steps need them. Transcripts and in-context state disappear or go stale exactly when the process dies.',
    rationales: [
      'A session transcript is not a structured record of completed work, may be incomplete at the moment of eviction, and brings stale, bloated context.',
      'Parallelism shortens runs but gives no recovery; an eviction still loses everything completed so far.',
      'Correct. Per-module state files plus a manifest let the job resume exactly where it stopped.',
      'Compacted in-memory state is still lost on eviction, and compaction also discards detail.'
    ],
    trap: 'Relying on session transcript or in-context state for crash recovery'
  },
  {
    id: 'e2-S4-09',
    scenario: 'S4',
    domain: 'D1',
    obj: 'O09',
    type: 'single',
    select: 1,
    stem: 'The module-mapping job now persists state:<pre>// state/manifest.json  (updated by the coordinator as subagents start and finish)\n{ "run": "modmap-1004",\n  "modules": [\n    { "name": "ledger-core",  "status": "complete",    "findings": "state/ledger-core.json" },\n    { "name": "cobol-bridge", "status": "in_progress", "findings": "state/cobol-bridge.json" },\n    { "name": "fx-rates",     "status": "pending",     "findings": null } ] }\n\n// resume.ts\nconst todo = manifest.modules.filter(m =&gt; m.status === \'pending\');\nconst done = manifest.modules.filter(m =&gt; m.findings !== null);</pre>After a crash during <code>cobol-bridge</code>, the resumed run finished quickly, but the report\'s COBOL-bridge section is missing about half of the bridge programs. What is the defect?',
    options: [
      'The manifest is maintained by the coordinator rather than by each subagent, so its status values are unreliable and should be ignored on resume in favor of a full rerun.',
      'Resume never re-queues <code>in_progress</code> modules yet merges their partial findings; re-run all non-complete modules and merge only <code>complete</code> ones.',
      'Findings are stored as file paths rather than inline JSON, so the coordinator cannot load them on resume; the manifest should embed every module\'s full findings directly.',
      'The manifest has no timestamps, so the resume logic cannot detect stale modules; add a <code>startedAt</code> field and re-run any module that was started over an hour ago.'
    ],
    answer: [1],
    explanation: 'A manifest only enables correct resumption if the resume logic honors its statuses. Here <code>in_progress</code> is neither re-queued (not "pending") nor excluded from merging (its findings path is non-null), so a half-written findings file is treated as complete. Only <code>complete</code> entries should be merged; everything else must be re-run, ideally with findings written atomically before status flips to complete.',
    rationales: [
      'Who writes the manifest is not the defect; discarding it forfeits the resumption the design exists to provide.',
      'Correct. Interrupted modules fall through both filters, so partial output is silently merged as final.',
      'Paths to state files are the recommended lightweight reference; the files are loadable, the filter logic is wrong.',
      'Timestamps can help detect hung work, but the bug is that in_progress is treated as done regardless of age.'
    ],
    trap: 'Manifest exists but resume logic mishandles in-progress work'
  },
  {
    id: 'e2-S4-10',
    scenario: 'S4',
    domain: 'D3',
    obj: 'O16',
    type: 'single',
    select: 1,
    stem: 'COBOL copybooks (<code>*.cpy</code>) live in <code>bridge/copybooks/</code> and <code>legacy/batch/copy/</code>. After any edit, <code>./tools/cpy-validate &lt;file&gt;</code> must run and its errors must be fed back to Claude so it fixes them. A root CLAUDE.md instruction to "always run cpy-validate after editing a copybook" is followed in roughly 70% of sessions. The team wants this to happen after every copybook edit, for everyone. Which mechanism should you use?',
    options: [
      'A <code>PostToolUse</code> hook on <code>Edit|Write</code> in the committed <code>.claude/settings.json</code> that validates <code>.cpy</code> paths and returns errors to Claude.',
      'A <code>.claude/rules/copybooks.md</code> file with <code>paths: ["**/*.cpy"]</code> containing the validation instruction, so it is loaded whenever a copybook is opened.',
      'A <code>PreToolUse</code> hook on <code>Edit|Write</code> in the committed <code>.claude/settings.json</code> that runs the validator on the target <code>.cpy</code> file and blocks on errors.',
      'A project skill named <code>cpy-validate</code> whose description says to use it after any copybook edit, so that Claude invokes it automatically whenever it changes one.'
    ],
    answer: [0],
    explanation: 'An action that must follow every edit is a deterministic side effect, which is what hooks provide. A PostToolUse hook runs after the edit completes, can check that the path is a copybook, run the validator on the new content, and surface errors to Claude (e.g., exit code 2 with stderr). Rules and skills are loaded as context or chosen by the model, so compliance stays probabilistic.',
    rationales: [
      'Correct. PostToolUse runs deterministically after each edit and can feed validation errors back to Claude.',
      'Path-scoped rules improve when the instruction is loaded but still rely on the model choosing to run the validator.',
      'Deterministic but the wrong event: before the edit, the validator would check the old file content, not the change.',
      'Skill invocation by description is a model decision, so it remains probabilistic, like the CLAUDE.md line.'
    ],
    trap: 'Rules/skills for a deterministic post-edit action; wrong hook event'
  },
  {
    id: 'e2-S4-11',
    scenario: 'S4',
    domain: 'D3',
    obj: 'O13',
    type: 'single',
    select: 1,
    stem: 'A nightly job runs Claude Code headlessly to review changes under <code>bridge/</code> and posts findings to a risk dashboard:<pre>claude -p "Review today\'s changes under bridge/ and list findings as JSON:\n[{file, line, severity, rule, message}]" --output-format json &gt; out.json\nnode post-to-dashboard.js out.json</pre>About 1 run in 8 breaks the dashboard parser: the <code>result</code> text sometimes holds a Markdown-fenced array, sometimes a prose preamble followed by JSON, and severities vary (<code>"High"</code>, <code>"high"</code>, <code>"P1"</code>). What is the best fix?',
    options: [
      'Add "Output raw JSON only, with no Markdown, and severity must be lowercase" to the prompt, and strip any code fences in <code>post-to-dashboard.js</code> before parsing.',
      'Switch to <code>--output-format stream-json</code> so that each finding arrives as its own separate JSON line that the dashboard parser can consume incrementally.',
      'Add a retry loop to the job that reruns the entire review whenever <code>JSON.parse</code> fails, up to three attempts, before paging the on-call engineer.',
      'Pass <code>--json-schema</code> with a findings schema whose severity is an enum, alongside <code>--output-format json</code>, and read the structured output.'
    ],
    answer: [3],
    explanation: '<code>--output-format json</code> wraps the run\'s result in a JSON envelope, but the result itself is still model-written text. Adding <code>--json-schema</code> makes Claude Code return structured output validated against the schema, and an enum for severity removes the vocabulary drift. That turns an automation contract from a prompt request into a validated guarantee.',
    rationales: [
      'Prompt wording plus fence stripping reduces failures but does not guarantee structure or a fixed severity vocabulary.',
      'stream-json streams session events, not per-finding records; the findings text is still unvalidated.',
      'Retries spend another full review on the same unconstrained output and still miss wrong-but-parseable severities.',
      'Correct. Schema-validated output with an enumerated severity gives the dashboard a reliable contract.'
    ],
    trap: 'Treating --output-format json as schema enforcement'
  },
  {
    id: 'e2-S4-12',
    scenario: 'S4',
    domain: 'D2',
    obj: 'O35',
    type: 'multi',
    select: 2,
    stem: 'The team adds two MCP servers to the banking repo. (1) <code>change-request</code>: an internal server every engineer needs; it authenticates with each engineer\'s personal token. (2) <code>trace-sandbox</code>: an experimental server that one engineer, Dana, is evaluating across several of her repositories. Which TWO configurations are correct? (Select 2)',
    options: [
      'Add <code>change-request</code> to the committed <code>.mcp.json</code> with the shared service-account token pasted in, so nobody needs any local setup.',
      'Have each engineer add <code>change-request</code> with <code>claude mcp add</code> at the default local scope, following a wiki page with the server command.',
      'Add <code>change-request</code> to the committed <code>.mcp.json</code> with <code>"env": { "CR_TOKEN": "${CR_TOKEN}" }</code>, each engineer exporting their own token.',
      'Dana adds <code>trace-sandbox</code> to the committed <code>.mcp.json</code> and asks teammates to decline its approval prompt until her evaluation is done.',
      'Dana adds <code>trace-sandbox</code> with <code>claude mcp add --scope user</code>, so it is stored in her <code>~/.claude.json</code> and available in all her projects.'
    ],
    answer: [2, 4],
    explanation: 'Shared team tooling belongs in project-scoped <code>.mcp.json</code>, committed to version control, with environment-variable expansion so each engineer supplies credentials without secrets entering the repo. Personal or experimental servers belong in user scope (<code>~/.claude.json</code>), which follows the individual across projects without affecting teammates.',
    rationales: [
      'Committing a credential leaks a secret into version control and removes per-engineer accountability.',
      'Local scope is per-user and per-project, so the team configuration drifts and is not version-controlled.',
      'Correct. Project scope shares the server; <code>${CR_TOKEN}</code> keeps each engineer\'s token out of the repo.',
      'Committing an experiment pushes it on the whole team and relies on everyone declining a prompt.',
      'Correct. User scope suits a personal, cross-project experiment without affecting teammates.'
    ],
    trap: 'Project vs user MCP scope; secrets in .mcp.json'
  },
  {
    id: 'e2-S4-13',
    scenario: 'S4',
    domain: 'D2',
    obj: 'O34',
    type: 'single',
    select: 1,
    stem: 'The <code>schema-catalog</code> MCP server exposes tools <code>list_schemas</code>, <code>list_tables(schema)</code>, and <code>describe_table(table)</code> for the core banking database (14 schemas, ~1,900 tables). Traces show that for a question like "which table stores standing orders?", the agent makes 25–40 exploratory list/describe calls before finding the right table, and sometimes gives up. What change most directly reduces these exploratory calls?',
    options: [
      'Add a <code>search_everything</code> tool that runs full-text search over all table definitions and returns every matching column with its complete DDL.',
      'Raise the agent\'s turn limit and instruct it to call <code>list_schemas</code> first and then drill down schema by schema until it locates the table.',
      'Expose the catalog (schemas, tables, one-line purposes) as an MCP resource the agent reads up front, and keep <code>describe_table</code> as a tool for detail.',
      'Replace the MCP server with a Bash tool that runs <code>psql \\d+</code> commands directly, so the agent can query the catalog without any MCP overhead.'
    ],
    answer: [2],
    explanation: 'MCP resources expose content catalogs (schemas, documentation hierarchies, issue summaries) so the agent can see what exists without making exploratory tool calls. A compact catalog resource lets the agent identify candidate tables in one read and use <code>describe_table</code> only for the few it needs. Tools remain the right primitive for targeted actions and detail.',
    rationales: [
      'Returning every matching column with full DDL floods context and still requires trial-and-error queries.',
      'Allows more of the same exploration rather than removing the need for it.',
      'Correct. A catalog resource gives up-front visibility and cuts exploratory list/describe calls.',
      'Raw shell access to the production database is a security regression and still requires exploratory queries.'
    ],
    trap: 'More tool calls instead of exposing a catalog as an MCP resource'
  },
  {
    id: 'e2-S4-14',
    scenario: 'S4',
    domain: 'D2',
    obj: 'O36',
    type: 'single',
    select: 1,
    stem: 'The internal <code>code-intel</code> MCP server provides <code>find_references</code>, backed by a cross-repository semantic index that resolves Spring bean injection, XML-wired beans, and COBOL program calls via CICS <code>LINK</code>. Its description is: "Finds references." Traces show the agent almost always uses built-in Grep instead, missing bean-injected and XML-wired callers. What is the most effective first step?',
    options: [
      'Remove Grep from the agent\'s tools so it has no option other than <code>find_references</code> for every search, including simple plain-text searches.',
      'Expand the description: what the index resolves (bean injection, XML wiring, CICS LINK), input format, output fields, and when to prefer it over Grep.',
      'Add a PreToolUse hook that rewrites every Grep call into a <code>find_references</code> call, so the semantic index is always used for any code search.',
      'Add ten few-shot examples to the system prompt that each show a question being answered with <code>find_references</code> and never with Grep.'
    ],
    answer: [1],
    explanation: 'Tool descriptions are the primary signal the model uses to choose between tools. A two-word description gives no reason to prefer the MCP tool over a familiar built-in, so the agent defaults to Grep. Describing its capabilities, inputs, outputs, and when to use it instead of Grep is the low-effort, high-leverage first step.',
    rationales: [
      'Removing Grep breaks legitimate text searches (log messages, config keys) that the semantic index is not designed for.',
      'Correct. A detailed, differentiating description lets the model pick the more capable tool when it applies.',
      'Blind rewriting forces semantic lookups for text searches and bypasses the model\'s judgment entirely.',
      'Few-shot examples add tokens and over-correct toward never using Grep, without explaining the tool\'s actual capability.'
    ],
    trap: 'Agent prefers built-in Grep over an under-described MCP tool'
  },
  {
    id: 'e2-S4-15',
    scenario: 'S4',
    domain: 'D2',
    obj: 'X04',
    type: 'single',
    select: 1,
    stem: 'The <code>mainframe</code> MCP tool <code>get_account_history</code> wraps a CICS transaction. During the nightly batch window the transaction times out, and the tool currently returns:<pre>{ "content": [{ "type": "text", "text": "[]" }] }</pre>The agent then tells an engineer "account 88-4410 has no postings in March", which is wrong. What should the tool return in this situation?',
    options: [
      '<code>isError: true</code> with metadata such as <code>errorCategory: "transient"</code>, <code>isRetryable: true</code>, and a message naming the timeout.',
      'The same empty array, plus a system-prompt rule telling the agent that empty results between 01:00 and 03:00 may be unreliable and should be double-checked.',
      'A generic <code>isError: true</code> result with the text "Operation failed", so that the agent knows not to trust the data without exposing any mainframe internals.',
      'An exception that propagates to the top level and terminates the agent session, so that no answer is ever given based on data from a failed mainframe call.'
    ],
    answer: [0],
    explanation: 'An access failure must not look like a valid empty result. Returning <code>isError: true</code> with an error category, a retryable flag, and a descriptive message lets the agent retry or explain the delay instead of asserting "no postings". Generic errors hide the information needed for recovery, and terminating the session discards the whole interaction for a transient fault.',
    rationales: [
      'Correct. Structured, categorized error metadata distinguishes a transient failure from a genuinely empty history.',
      'Pushes a tool-contract problem into a time-based prompt heuristic the agent may ignore; the result still looks like success.',
      'Signals failure but gives no category or retryability, so the agent cannot choose an appropriate recovery.',
      'Whole-session termination is an overreaction to a transient, retryable error.'
    ],
    trap: 'Access failure disguised as an empty result'
  }
]);
