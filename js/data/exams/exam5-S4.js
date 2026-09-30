/* Practice Exam 5 — Scenario S4: Developer Productivity with Claude
   Context: onboarding agent for the Helix Python ML monorepo (helix/features, helix/training, helix/serving,
   legacy/scripts) with internal MCP servers for docs and the feature store. */
CCAR.addQuestions('exam5', [
  {
    id: 'e5-S4-01',
    scenario: 'S4',
    domain: 'D2',
    obj: 'O17',
    type: 'single',
    select: 1,
    stem: 'A new ML engineer asks Helix\'s onboarding agent: "How is <code>user_ltv_30d</code> computed and served?" The monorepo has about 9,000 Python files. The agent currently starts by running Glob <code>**/*.py</code>, then Reads files in <code>helix/features/</code> alphabetically; it hits its context limit after about 120 files without finding the feature. Which exploration strategy should the agent use?',
    options: [
      'Grep for user_ltv_30d to find its definition and references, Read the defining module, then follow imports and calls outward, recording confirmed file:line facts.',
      'Glob helix/features/**/*ltv*.py and Read every match in full, then Read the entire helix/serving/ package so that the serving path is fully covered before answering the question.',
      'Read the top-level README and every package\'s __init__.py first to build a complete architectural map of the monorepo, and only then start searching for the specific feature.',
      'Use Bash to concatenate all Python files under helix/ into one large output so the agent can search the whole codebase in a single pass without making repeated tool calls.'
    ],
    answer: [0],
    explanation: 'Incremental exploration starts with Grep to find entry points for the specific symbol, then uses Read to follow imports and trace the flow (transform, materialization, serving lookup). This spends context only on relevant files, and recording confirmed facts protects them from later context pressure.',
    rationales: [
      'Correct. Grep for the symbol, then targeted Reads along the traced flow, is the context-efficient approach.',
      'Filename globbing guesses at names and then reads whole packages, repeating the context blow-up.',
      'Building a full map before searching front-loads large amounts of irrelevant context.',
      'Dumping the codebase into one output exhausts context immediately.'
    ],
    trap: 'Reading everything upfront instead of Grep-then-Read'
  },
  {
    id: 'e5-S4-02',
    scenario: 'S4',
    domain: 'D2',
    obj: 'O17',
    type: 'single',
    select: 1,
    stem: 'An engineer asks which pipelines still call the legacy <code>compute_embeddings</code> function. Grep for <code>compute_embeddings(</code> returns 3 hits, but the team believes about 20 pipelines depend on it. The agent then reads <code>helix/embeddings/__init__.py</code>:<pre>from ._legacy import compute_embeddings as embed_batch\nfrom ._stream import embed_stream   # wraps compute_embeddings\n__all__ = ["embed_batch", "embed_stream"]</pre>Many modules use <code>import helix.embeddings as emb</code> and call <code>emb.embed_batch(...)</code>. What should the agent do next?',
    options: [
      'Report that 3 pipelines use the function, since Grep is exhaustive for the literal function name and any genuine call site would have matched the search pattern anyway.',
      'Read every file in helix/pipelines/ one by one and look for calls to anything embedding-related, since aliasing makes text search unreliable for this question.',
      'List every exported name that aliases or wraps it (embed_batch, embed_stream), Grep for each including attribute forms like .embed_batch(, and Read the matches.',
      'Glob **/*embed*.py to find the files that most likely use embeddings, then Read each of those files and check whether they reference the legacy implementation.'
    ],
    answer: [2],
    explanation: 'To trace usage through wrapper modules, first identify all exported names that alias or wrap the target, then search for each name across the codebase, including attribute-access forms, and confirm with targeted Reads. A literal search for the original name misses re-exports.',
    rationales: [
      'The re-export shows the literal name is not how most callers reference it.',
      'Aliases are searchable once identified; reading every pipeline file wastes context.',
      'Correct. Enumerate exported names first, then Grep each and confirm with Read.',
      'Filenames do not reveal call sites; callers can have any name.'
    ],
    trap: 'Missing indirect usage through re-exports'
  },
  {
    id: 'e5-S4-03',
    scenario: 'S4',
    domain: 'D2',
    obj: 'O33',
    type: 'single',
    select: 1,
    stem: 'The onboarding agent has a coordinator and three subagents: <code>code-explorer</code> (explains how code works), <code>docs-researcher</code> (queries the internal docs MCP server), and <code>scaffolder</code> (generates boilerplate for new feature pipelines). Each subagent currently has Read, Write, Edit, Bash, Grep, Glob, plus 11 MCP tools from the docs and featurestore servers. Observed: code-explorer sometimes "fixes" typos it notices while exploring; docs-researcher often greps the repo instead of searching docs and returns code snippets. Which tool distribution is best?',
    options: [
      'Keep every tool on every subagent for flexibility, but add a paragraph to each system prompt describing the role\'s boundaries and listing the tools it is expected to prefer.',
      'code-explorer: Read, Grep, Glob. docs-researcher: docs search/get tools only. scaffolder: Read, Glob, Write, plus the featurestore schema lookup. Coordinator: Task.',
      'Give every subagent read-only tools only, and have the coordinator itself perform all file writes after it reviews each subagent\'s proposed changes in its own context window.',
      'Merge docs-researcher into code-explorer so one agent can compare documentation with code directly, and give that merged agent the full set of built-in and MCP tools.'
    ],
    answer: [1],
    explanation: 'Each agent should have only the tools its role requires. Read-only exploration tools stop code-explorer from editing, docs-only tools force docs-researcher to use the docs server instead of Grep, and scaffolder gets write access plus one scoped cross-role lookup it needs frequently. Seventeen tools per agent degrades selection and invites cross-specialization misuse.',
    rationales: [
      'Prompt boundaries do not remove the temptation or the option; both observed misuses would continue.',
      'Correct. Role-scoped tool sets remove the misuse paths while keeping each role effective.',
      'Moving writes to the coordinator bloats its context and removes the scaffolder\'s ability to do its actual job.',
      'A merged agent with every tool increases decision complexity and makes misrouting more likely.'
    ],
    trap: 'All tools on every agent'
  },
  {
    id: 'e5-S4-04',
    scenario: 'S4',
    domain: 'D1',
    obj: 'O06',
    type: 'single',
    select: 1,
    stem: 'Two weeks of logs show <code>feature-tracer</code> has never been invoked; feature-lineage questions all go to <code>code-explorer</code>, which returns shallow answers.<pre>const agents = {\n  "feature-tracer": {\n    description: "Helper agent",\n    prompt: "You trace how a Helix feature is computed, from source tables through transforms to serving. Return file:line evidence.",\n    tools: ["Read", "Grep", "Glob"]\n  },\n  "code-explorer": {\n    description: "Explores the Helix monorepo to answer questions about how code works, including features, training and serving.",\n    prompt: "...",\n    tools: ["Read", "Grep", "Glob"]\n  }\n};\nquery({ prompt: question,\n  options: { allowedTools: ["Task", "Read", "Grep", "Glob"], agents } });</pre>What is the root cause?',
    options: [
      'feature-tracer does not include the Task tool in its own tools list, so the coordinator is unable to spawn it even though it is registered correctly in the agents option.',
      'Both agents declare identical tool lists, so the SDK deduplicates them and keeps only the agent that appears last in the agents object for routing purposes.',
      'feature-tracer has no model field, and agents without an explicit model are registered but skipped whenever a broader agent can also handle the request.',
      'feature-tracer\'s description gives the coordinator nothing to route on while code-explorer\'s broad description covers features, so every lineage question matches it.'
    ],
    answer: [3],
    explanation: 'The coordinator chooses subagents from their descriptions. A vague description ("Helper agent") combined with an overlapping, broad description on another agent means the coordinator will always pick the broad one. Write a specific description for feature-tracer (feature lineage from source tables through transforms to serving) and narrow code-explorer\'s scope.',
    rationales: [
      'A subagent does not need Task to be spawned; only the coordinator needs Task, which it has.',
      'There is no deduplication by tool list; many agents legitimately share tools.',
      'model is optional and defaults sensibly; it does not affect routing.',
      'Correct. Routing depends on descriptions, and this one is empty of meaning while the other overlaps.'
    ],
    trap: 'Vague subagent description preventing routing'
  },
  {
    id: 'e5-S4-05',
    scenario: 'S4',
    domain: 'D1',
    obj: 'O06',
    type: 'single',
    select: 1,
    stem: 'The coordinator (allowedTools includes "Task") invokes <code>feature-analyst</code> correctly, but the subagent replies "I don\'t have access to feature store tools" and falls back to grepping stale YAML definitions in the repo.<pre>agents: {\n  "feature-analyst": {\n    description: "Looks up feature definitions, owners, freshness SLAs and online/offline parity in the Helix feature store.",\n    prompt: "Use the feature store tools to answer ...",\n    tools: ["Read", "Grep",\n            "mcp__featurestore__get_feature",\n            "mcp__featurestore__list_feature_views"]\n  }\n},\nmcpServers: { docs: docsServer }</pre>What is the root cause?',
    options: [
      'Inside an AgentDefinition, MCP tool names must omit the mcp__ prefix, so the entries should be written as featurestore__get_feature and featurestore__list_feature_views.',
      'The subagent\'s prompt must name the MCP server explicitly (for example, "use the featurestore server") before the SDK attaches that server\'s tools to the subagent.',
      'Only the docs server is configured in mcpServers, so the mcp__featurestore__* tools listed for the subagent do not exist in the session; add the featurestore server.',
      'Subagents cannot call MCP tools at all; only the coordinator can, so it must call the feature store itself and pass the results to feature-analyst in the Task prompt.'
    ],
    answer: [2],
    explanation: 'MCP tools exist only when their server is configured and connected; listing mcp__featurestore__* names in a subagent\'s tools does not create them. The session has only the docs server, so the subagent correctly reports it lacks feature store tools. Add the featurestore server (or scope it to the subagent via its mcpServers) and keep the tool names in mcp__server__tool form.',
    rationales: [
      'The mcp__<server>__<tool> form is the correct naming convention.',
      'Prompt wording does not attach servers; configuration does.',
      'Correct. The referenced server is not configured, so its tools are never discovered.',
      'Subagents can use MCP tools that are configured and included in their tool set.'
    ],
    trap: 'MCP server missing from configuration'
  },
  {
    id: 'e5-S4-06',
    scenario: 'S4',
    domain: 'D1',
    obj: 'O10',
    type: 'single',
    select: 1,
    stem: 'The agent produces a "Team Primer" for new hires: a map of the team\'s packages, key data flows, ownership and runbooks from the docs server, and open deprecations in legacy scripts. Teams own between 2 and 14 packages. The current fixed sequential pipeline explores each package in turn, then docs, then deprecations, and takes 38 minutes; the stages do not depend on each other, only the final primer needs all of them. Which orchestration pattern fits best?',
    options: [
      'A coordinator reads the team\'s package list, spawns one explorer per package plus docs and deprecation workers in a single response, then synthesizes and fills gaps.',
      'Keep the sequential pipeline but cache each package\'s exploration result, so that the second and later runs for the same team finish much faster than the first run did.',
      'Use one agent with every tool that explores all packages, docs, and deprecations in a single long session, compacting its context whenever the window starts to fill.',
      'Use a fixed fan-out of exactly six package workers for every team, and concatenate their raw outputs directly into the primer without a separate synthesis step at the end.'
    ],
    answer: [0],
    explanation: 'Independent subtasks whose number varies by input call for coordinator-worker with parallel fan-out: the coordinator decides how many workers to spawn, emits them together, and synthesizes the results, re-delegating when coverage has gaps. Sequential execution adds latency without a dependency reason.',
    rationales: [
      'Correct. Dynamic fan-out sized to the team plus coordinator synthesis minimizes latency and preserves coverage.',
      'Caching helps repeats but leaves the first run slow and sequential for no reason.',
      'A single long session suffers context pressure and loses the parallelism.',
      'A fixed count over- or under-provisions for teams with 2 or 14 packages, and skipping synthesis yields a fragmented primer.'
    ],
    trap: 'Sequential pipeline for independent, variable-width work'
  },
  {
    id: 'e5-S4-07',
    scenario: 'S4',
    domain: 'D1',
    obj: 'O09',
    type: 'single',
    select: 1,
    stem: 'A legacy audit analyzes 340 scripts in <code>legacy/scripts/</code> (purpose, tables touched, whether still scheduled) using a coordinator and analyzer subagents in batches of 20. The run died during batch 11 after an API outage. On restart it re-analyzed everything from script 1, because findings for batches 1-10 existed only in the coordinator\'s context, and the rerun cost $140. Which design is best?',
    options: [
      'Resume the coordinator\'s SDK session by ID after any crash so its conversation, including all findings from earlier batches, is restored and processing can continue.',
      'Analyzers write findings to per-script state files; the coordinator keeps a manifest of status, output path, and content hash, and on restart skips completed scripts.',
      'Increase the batch size from 20 to 60 scripts so there are fewer batches in total, which reduces the number of batch boundaries at which a failure can interrupt the run.',
      'Have the coordinator write a prose summary of all findings into its own context every five batches, so a restart only needs to reread the most recent summary block.'
    ],
    answer: [1],
    explanation: 'Crash recovery for multi-agent pipelines relies on structured state exports: each agent persists results to a known location, and the coordinator maintains a manifest it loads on resume to skip completed work and inject prior findings where needed. Conversation state is neither durable nor compact enough to be the source of truth.',
    rationales: [
      'Session resumption depends on a huge conversation and cannot confirm which in-flight work completed; it is not a durable manifest.',
      'Correct. Persisted per-script outputs and a manifest make resumption skip finished work without losing findings.',
      'Larger batches mean more work lost per failure and do not add persistence.',
      'Summaries held in context are still lost on a crash, and prose loses detail.'
    ],
    trap: 'Conversation context as the only state store'
  },
  {
    id: 'e5-S4-08',
    scenario: 'S4',
    domain: 'D5',
    obj: 'O09',
    type: 'multi',
    select: 2,
    stem: 'You are designing the manifest for the resumable legacy-script audit. Engineers continue committing to <code>legacy/scripts/</code> while audits run, and some audits span several days. Which TWO fields must the manifest contain so that a resumed run neither repeats valid work nor trusts stale findings? (Select 2)',
    options: [
      'The full raw transcript of every subagent\'s tool calls, so that the coordinator can replay each analysis step exactly as it happened before the crash.',
      'A single "last completed batch number" counter, since batches always run in order and everything before that number can safely be treated as done.',
      'Per-script status (pending, in_progress, done, failed) with a pointer to that script\'s persisted findings file.',
      'The coordinator\'s self-reported confidence score for each batch, so that batches with low confidence are automatically redone after the restart.',
      'A content hash or commit SHA for each analyzed script, so scripts changed since analysis are re-queued instead of reusing their findings.'
    ],
    answer: [2, 4],
    explanation: 'A resumable manifest needs per-item status with pointers to persisted outputs (so completed work is skipped and findings can be injected) and a version marker for each input (so changed inputs are re-analyzed rather than trusted). Together they avoid both repeated work and stale results.',
    rationales: [
      'Raw transcripts are bulky and replaying them is neither needed nor reliable; persisted findings are the useful state.',
      'A single counter cannot represent failed or partially completed scripts within a batch, nor changed scripts.',
      'Correct. Status plus output pointer lets the coordinator skip done items and load their findings.',
      'Self-reported confidence is not a reliable signal for what needs redoing.',
      'Correct. Content hashes detect scripts modified since analysis so stale findings are not reused.'
    ],
    trap: 'Manifest without per-item status or input versioning'
  },
  {
    id: 'e5-S4-09',
    scenario: 'S4',
    domain: 'D5',
    obj: 'O18',
    type: 'single',
    select: 1,
    stem: 'Parallel exploration subagents return results to a coordinator that assembles onboarding answers. A typical result today is:<pre>{ "summary": "The ranking service loads features via a client in helix/serving and falls back to defaults when the store is slow. It seems the TTL is around 5 minutes." }</pre>Downstream problems: answers cannot cite code, hedged guesses ("seems") are restated as facts, and overlapping findings from different explorers cannot be merged. Which output schema best fixes these?',
    options: [
      'Keep the prose summary field but require at least 500 words, so that each explorer preserves enough detail for the coordinator to cite and merge findings itself.',
      '{ "summary": string, "files_read": [string], "tokens_used": number, "duration_ms": number } so the coordinator knows which files each explorer looked at and at what cost.',
      '{ "findings": [{ "claim": string }], "confidence": number } with one overall confidence value for the run, so the coordinator can discard runs that fall below a threshold.',
      '{ "findings": [{ "claim", "evidence": [{ "path", "line_start", "line_end" }], "status": "confirmed | inferred", "symbols": [] }], "open_questions": [] }'
    ],
    answer: [3],
    explanation: 'Subagent outputs consumed by synthesis should separate claims from their provenance (file and line ranges), mark verification status so inferred statements are not presented as facts, and carry keys (symbols) that allow merging overlapping findings. Open questions make coverage gaps explicit for re-delegation.',
    rationales: [
      'Longer prose worsens context use and still lacks structured provenance or status.',
      'A file list does not tie individual claims to evidence, and cost metrics do not help synthesis.',
      'A single run-level confidence cannot distinguish confirmed from inferred claims and lacks provenance.',
      'Correct. Per-claim evidence, status, and merge keys directly address all three problems.'
    ],
    trap: 'Prose summaries instead of structured findings with provenance'
  },
  {
    id: 'e5-S4-10',
    scenario: 'S4',
    domain: 'D5',
    obj: 'O18',
    type: 'multi',
    select: 2,
    stem: 'The coordinator combines output from <code>code-explorer</code> and <code>docs-researcher</code>. Internal docs are frequently out of date relative to the code (for example, a doc says the churn features refresh daily; the code schedules hourly runs since March). Which TWO output-schema requirements best support accurate synthesis? (Select 2)',
    options: [
      'Both subagents drop any claim they cannot fully verify, so that only certain facts reach the coordinator and the synthesis never has to deal with uncertainty.',
      'docs-researcher returns each claim with the page ID or URL, section, and the page\'s last-updated date.',
      'Both subagents return a single merged prose paragraph, so the coordinator can paste their answers directly into the response for the new engineer.',
      'code-explorer returns each claim with file path, line range, and the commit SHA or date of the code it read.',
      'Both subagents attach a 1-10 self-rated reliability score to each claim, which the coordinator uses to discard low-scored claims before synthesis.'
    ],
    answer: [1, 3],
    explanation: 'Synthesis can only reason about staleness and conflicts if each claim carries its source and a date. Doc claims with last-updated dates and code claims with file, line, and commit information let the coordinator see that the doc predates the scheduling change and present the discrepancy accurately instead of choosing arbitrarily.',
    rationales: [
      'Dropping unverified claims hides gaps and conflicts; they should be kept and marked.',
      'Correct. Source and last-updated date let synthesis weigh documentation staleness.',
      'Merged prose loses claim-source mappings needed for citation and conflict handling.',
      'Correct. File, line, and commit metadata ground code claims and date them against the docs.',
      'Self-rated reliability is poorly calibrated and discards information rather than attributing it.'
    ],
    trap: 'Dropping or self-scoring claims instead of carrying provenance and dates'
  },
  {
    id: 'e5-S4-11',
    scenario: 'S4',
    domain: 'D1',
    obj: 'O03',
    type: 'single',
    select: 1,
    stem: 'In phase 1, code-explorer established that the <code>churn_risk</code> pipeline lives in <code>helix/features/churn/</code>, that <code>churn_daily.py:88</code> joins events with <code>accounts_v2</code>, and that the online store keys on <code>account_id</code> as a string while training uses an int. In phase 2 the coordinator spawns scaffolder with: "Generate a new feature pipeline for churn_risk_v2 following existing conventions." The scaffolder spends 25 turns re-exploring, then uses an int key and the deprecated <code>accounts</code> table. What is the best fix?',
    options: [
      'Have the scaffolder inherit the coordinator\'s conversation by reusing the coordinator\'s session ID, so it can see everything code-explorer found during phase 1.',
      'Give the scaffolder the same Grep and Read tools as code-explorer and raise its maxTurns, so it can rediscover the existing churn conventions more completely on its own.',
      'Put the phase-1 findings in the scaffolder\'s Task prompt as structured data: tables, join location, key name and type per store, files to mirror, and expected output.',
      'Write the phase-1 findings into the project CLAUDE.md so that every agent in the system automatically picks up the churn pipeline conventions from then on.'
    ],
    answer: [2],
    explanation: 'Subagents receive only what is in their Task prompt. Passing the prior phase\'s findings as structured data, including exact locations and types, removes the rediscovery cost and the errors that come with it. CLAUDE.md is for durable universal standards, not task-specific findings.',
    rationales: [
      'Subagents do not inherit the coordinator\'s conversation by sharing an ID.',
      'More tools and turns pay for rediscovery and still risk the same mistakes.',
      'Correct. Complete, structured findings in the prompt give the scaffolder exactly what it needs.',
      'Task-specific findings in CLAUDE.md pollute every session and are not how context is passed to a subagent.'
    ],
    trap: 'Expecting subagents to see prior findings'
  },
  {
    id: 'e5-S4-12',
    scenario: 'S4',
    domain: 'D1',
    obj: 'O04',
    type: 'single',
    select: 1,
    stem: 'The coordinator delegates to a <code>legacy-explainer</code> subagent with: "1. Open the script. 2. Read the first 200 lines. 3. List its imports. 4. Grep for each import. 5. Write a 3-sentence summary." This works for small scripts but fails on scripts that dispatch <code>argparse</code> subcommands to functions at the bottom of 1,500-line files or that call other scripts via <code>subprocess</code>; those summaries miss the main behavior. Which revision is best?',
    options: [
      'State the goal (production behavior: entry points, inputs, outputs, side effects, external calls), require file:line evidence and an output schema, and let it choose how to explore.',
      'Extend the procedure to read the first 200 and the last 200 lines of each script, then Grep specifically for argparse and subprocess calls before writing the three-sentence summary.',
      'Remove every instruction except "Explain this script," giving the subagent complete freedom over both how it explores the code and what it reports back to the coordinator.',
      'Have the coordinator read each script in full itself and pass the complete text to the subagent along with the same five steps, so nothing is missed by partial reading.'
    ],
    answer: [0],
    explanation: 'Goal-oriented delegation with clear quality criteria lets the subagent adapt its exploration to each script\'s structure, while a required schema and evidence standard keep the coordinator\'s visibility and control. Patching the procedure only handles the patterns already seen, and removing all guidance loses the output contract.',
    rationales: [
      'Correct. Goal, quality bar, and output schema enable adaptive exploration with coordinator control.',
      'Each new pattern would need another procedural patch; the approach stays brittle.',
      'No goal or output contract means inconsistent, unmergeable results.',
      'Loading full scripts into the coordinator wastes its context and keeps the brittle steps.'
    ],
    trap: 'Procedural delegation for open-ended analysis'
  },
  {
    id: 'e5-S4-13',
    scenario: 'S4',
    domain: 'D1',
    obj: 'O08',
    type: 'single',
    select: 1,
    stem: 'The agent can now "adopt" legacy scripts into scheduled packages under <code>helix/pipelines/</code>. Requests range from "rename a CLI flag in one script" to "migrate the 14 billing scripts that share a DB connection helper into one package and delete the originals." The platform team requires human approval before any change that touches more than 3 files or deletes files. Which workflow architecture best satisfies these constraints?',
    options: [
      'Run every request in direct execution mode and have the requesting engineer review the full diff afterwards, reverting anything that violates the approval policy.',
      'Require a written plan and explicit human approval for every request, including single-flag renames, so the process is uniform and easy to audit for the platform team.',
      'Run every request in read-only plan mode only, and have engineers implement all resulting changes by hand so the agent itself never modifies or deletes any files.',
      'Classify scope first: small single-file changes run directly; multi-file or deleting changes get a read-only plan, human approval, then execution of that plan.'
    ],
    answer: [3],
    explanation: 'Choose the workflow by scope and risk: direct execution for small, well-scoped changes and a multi-phase flow (plan, human approval, execute) for broad or destructive changes. This meets the approval requirement exactly where it applies without slowing trivial work.',
    rationales: [
      'Post-hoc review violates the requirement that approval happen before risky changes.',
      'Uniform heavy process wastes time on trivial changes the policy does not cover.',
      'Plan-only removes the agent\'s value for implementation, even for safe small changes.',
      'Correct. Scope-based routing applies the approval gate precisely where risk requires it.'
    ],
    trap: 'One workflow for every scope and risk level'
  },
  {
    id: 'e5-S4-14',
    scenario: 'S4',
    domain: 'D2',
    obj: 'O34',
    type: 'single',
    select: 1,
    stem: 'The internal docs MCP server exposes two tools, <code>search_docs(query)</code> and <code>get_page(id)</code>. Logs show the onboarding agent making 12-30 search_docs calls per question, guessing terms like "feature store onboarding," "fs onboarding," and "helix fs" before landing on the right page. Many questions only require knowing which docs exist for a given team. What change is most effective?',
    options: [
      'Increase the search_docs result page size from 10 to 100 results, so each search returns more candidate pages and the agent needs fewer attempts overall.',
      'Expose the documentation hierarchy (spaces, page titles, owners, last-updated dates) as MCP resources so the agent sees what exists and fetches pages directly.',
      'Add a system prompt instruction limiting the agent to at most three search_docs calls per question, after which it must answer with the best result it has found.',
      'Replace the docs MCP server with a nightly export of all docs into the repository, and let the agent use Grep over the exported files instead of the MCP tools.'
    ],
    answer: [1],
    explanation: 'MCP resources expose content catalogs so an agent can see what is available without exploratory tool calls. Publishing the doc hierarchy as resources turns guess-and-search loops into a single lookup followed by a direct get_page.',
    rationales: [
      'Bigger result pages flood context and still depend on guessing the right terms.',
      'Correct. A resource catalog removes exploratory searching.',
      'Capping searches lowers cost but increases wrong or missing answers.',
      'Grep over an export loses freshness and structure and still requires guessing.'
    ],
    trap: 'Tool-call tuning instead of exposing a resource catalog'
  },
  {
    id: 'e5-S4-15',
    scenario: 'S4',
    domain: 'D4',
    obj: 'O31',
    type: 'single',
    select: 1,
    stem: 'The legacy audit labels scripts <code>safe_to_delete</code> using the instruction "Mark a script safe_to_delete if it looks unused or outdated." It flagged 61 scripts; engineers found 19 still invoked by cron on a batch host or imported by other scripts. Trust has collapsed, and engineers now ignore every audit label, including accurate ones. What is the best fix?',
    options: [
      'Change the instruction to "Only mark safe_to_delete when you are highly confident," and require the model to report a confidence of at least 0.9 before it applies the label to any script.',
      'Add three few-shot examples of scripts that were successfully deleted last quarter, so the model learns what a deletable script looks like from the team\'s own history.',
      'Define criteria: no repo references (imports, subprocess, shell wrappers), absent from schedules, unmodified 18 months; exclude prod writers (needs_owner_review); else unknown.',
      'Remove the safe_to_delete label permanently and report only style-related "outdated code" observations, which carry much less risk if the model gets them wrong.'
    ],
    answer: [2],
    explanation: 'Vague criteria like "looks unused" produce false positives that destroy trust in all categories. Explicit, checkable inclusion and exclusion criteria (reference search, scheduling configs, recency, production writes) plus an explicit fallback category make the label precise; while the criteria are validated, the category can be disabled temporarily to restore trust.',
    rationales: [
      'Confidence-based filtering does not define what "unused" means and is poorly calibrated.',
      'A few past examples do not encode the checks (cron, imports) that caused the misses.',
      'Correct. Categorical inclusion and exclusion boundaries with a safe fallback fix precision at the source.',
      'Permanently removing the category abandons a valuable output; the fix is precise criteria.'
    ],
    trap: 'Confidence filtering instead of explicit criteria'
  }
]);
