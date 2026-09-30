/* Practice Exam 4 — Scenario S4: Developer Productivity (Rust + Node.js estate; MCP for Jira, Confluence, service catalog) */
CCAR.addQuestions('exam4', [
  {
    id: 'e4-S4-01', scenario: 'S4', domain: 'D1', obj: 'O06', type: 'single', select: 1,
    stem: 'A platform team\'s onboarding agent spawns a <code>dependency-mapper</code> subagent to list which services a Rust service calls at runtime. The coordinator itself successfully uses the internal service-catalog MCP server, which is configured in the <code>mcpServers</code> option of <code>query()</code>. The subagent always answers "I cannot access the service catalog; based on Cargo.toml the service appears to depend on..." and misses runtime HTTP dependencies. Its definition:<pre>"dependency-mapper": {\n  description: "Maps upstream and downstream runtime dependencies of one service using the service catalog and the code.",\n  prompt: MAPPER_PROMPT, // tells it to call the catalog first\n  tools: ["Read", "Grep", "Glob"]\n}</pre>What is the best fix?',
    options: [
      'Add the catalog server to the project <code>.mcp.json</code> as well, because subagents only discover MCP servers from file-based configuration.',
      'Add the specific catalog tools it needs, such as <code>mcp__catalog__get_dependencies</code>, to the subagent\'s <code>tools</code> list.',
      'Strengthen <code>MAPPER_PROMPT</code> so it states that the catalog must be queried before any files are read, and include an example call.',
      'Remove the <code>tools</code> field entirely so the subagent inherits every tool the coordinator has, including all catalog and Jira tools.'
    ],
    answer: [1],
    explanation: 'A subagent can call only the tools in its tools list. The catalog server is connected (the coordinator uses it), but its tools, named mcp__catalog__&lt;tool&gt;, are not in dependency-mapper\'s list, so the subagent falls back to reading Cargo.toml. Add only the catalog tools the role needs. Removing the list would also make the call possible but violates least privilege by exposing unrelated Jira and Confluence tools.',
    rationales: [
      'The server is already connected and working for the coordinator; where it is configured is not the problem.',
      'Correct. The subagent\'s tool allow-list is what blocks the catalog calls.',
      'The prompt already tells it to use the catalog; no instruction lets an agent call a tool it lacks.',
      'Works mechanically but over-provisions the subagent with dozens of tools outside its role.'
    ],
    trap: 'Subagent tools list missing the MCP tool its role needs'
  },
  {
    id: 'e4-S4-02', scenario: 'S4', domain: 'D1', obj: 'O06', type: 'multi', select: 2,
    stem: 'The platform coordinator has two subagents. Engineers asking "how does billing-ledger reconcile refunds?" get either inline exploration by the coordinator or, worse, the <code>scaffolder</code> subagent, which once generated an unrequested <code>refund_reconciler.rs</code>. The <code>legacy-explainer</code> subagent is almost never used.<pre>agents: {\n  "legacy-explainer": {\n    description: "Helper agent.",\n    prompt: "Use me whenever an engineer asks how existing code works. You trace request flows read-only and explain them with file:line references...",\n    tools: ["Read", "Grep", "Glob"]\n  },\n  "scaffolder": {\n    description: "Use for any request about a service: explaining it, generating code, or changing it.",\n    prompt: SCAFFOLD_PROMPT,\n    tools: ["Read", "Write", "Bash"]\n  }\n}</pre>Which two changes fix the routing? (Select 2)',
    options: [
      'Move the routing guidance into <code>legacy-explainer</code>\'s <code>description</code>: explains how existing code works, read-only, with file:line references.',
      'Keep <code>legacy-explainer</code>\'s description as is and add more detail to its <code>prompt</code> about exactly when it should be selected.',
      'Set <code>model: "opus"</code> on <code>legacy-explainer</code> so that the coordinator ranks it as the more capable choice for explanation requests.',
      'Narrow <code>scaffolder</code>\'s description to generating new boilerplate from templates, and state that it does not handle explanation requests.',
      'Add "Task" to <code>legacy-explainer</code>\'s tools so that the coordinator becomes able to spawn it for explanation requests.'
    ],
    answer: [0, 3],
    explanation: 'The coordinator routes on each AgentDefinition\'s description; the prompt field is the subagent\'s own system prompt and is only used once the subagent has been spawned. "Helper agent." gives the coordinator nothing to match, and the routing text sits in the wrong field. Meanwhile scaffolder\'s description claims every request type, so it wins explanation requests. Both descriptions must be specific and non-overlapping.',
    rationales: [
      'Correct. The description is the field the coordinator uses to decide when to delegate.',
      'The prompt is invisible to the coordinator\'s routing decision, so more detail there changes nothing.',
      'Model choice does not drive routing; the coordinator matches tasks to descriptions.',
      'Correct. Removing the overlap stops scaffolder from capturing explanation requests.',
      'Task belongs in the coordinator\'s allowedTools; on a subagent it only lets that subagent spawn others.'
    ],
    trap: 'Routing text in prompt instead of description; overlapping descriptions'
  },
  {
    id: 'e4-S4-03', scenario: 'S4', domain: 'D1', obj: 'O08', type: 'single', select: 1,
    stem: 'Three requests arrive for the platform team\'s Claude-based agent this week:<br>(1) A Rust handler in <code>payments-gw</code> returns page 2 twice; a failing test and stack trace point at one <code>offset</code> calculation.<br>(2) Replace the deprecated in-house <code>acme-log</code> library with OpenTelemetry across 38 Node.js services; two approaches are viable (a compatibility shim or direct SDK adoption), and platform leads must approve the choice before code changes land.<br>(3) Generate a new Node.js service skeleton from the team\'s documented template.<br>Which execution approach fits each request?',
    options: [
      '(1) plan mode, since payment code is high-risk; (2) direct execution, one service at a time; (3) direct execution from the template.',
      '(1) direct execution; (2) direct execution starting with the smallest services so the right approach emerges from real migrations; (3) plan mode.',
      '(1) direct execution; (2) plan mode for the whole task, including every edit, so leads see each change; (3) plan mode.',
      '(1) direct execution; (2) plan mode to map usages and propose an approach for sign-off, then direct execution in batches; (3) direct execution.'
    ],
    answer: [3],
    explanation: 'Plan mode fits large, multi-file work with several valid approaches and an approval gate; once the approach is approved, implementation proceeds by direct execution. A single-location bug with a failing test and stack trace, and template-driven boilerplate, are well scoped and suit direct execution. The business criticality of a domain alone does not turn a one-line fix into an architectural task.',
    rationales: [
      'Plan mode is unnecessary for a pinpointed bug, and direct execution for (2) skips the required approval and risks rework across 38 services.',
      'Letting the approach "emerge" commits code before leads choose; plan mode for a documented template adds no value.',
      'Plan mode is read-only exploration and design; staying in it means the migration is never implemented.',
      'Correct. Plan for the architectural, approval-gated migration, then execute; direct execution for the well-scoped tasks.'
    ],
    trap: 'Plan mode by domain risk instead of task scope'
  },
  {
    id: 'e4-S4-04', scenario: 'S4', domain: 'D1', obj: 'O03', type: 'single', select: 1,
    stem: 'While exploring the monorepo, the coordinator identified the seven services that still call the deprecated <code>auth-v1</code> token endpoint, including two that reach it through a wrapper-crate alias <code>legacy_auth::fetch</code>, with file paths and line numbers. It then spawns a <code>migration-drafter</code> subagent with: "Draft migration PRs for the services identified above that call auth-v1." The drafter spends 20 minutes re-grepping the repo and drafts PRs for only five services. What is the most effective change?',
    options: [
      'Put the full list in the Task prompt: each service, file path, line number and call pattern, including the <code>legacy_auth::fetch</code> aliases.',
      'Add guidance to the drafter\'s system prompt telling it to always search for wrapper crates and aliases before deciding which services are affected.',
      'Raise the drafter\'s <code>maxTurns</code> so that it has enough turns to complete a full search of the monorepo, including every wrapper crate.',
      'Spawn one drafter per service in parallel, each told to "find and migrate any auth-v1 usage in your assigned service directory."'
    ],
    answer: [0],
    explanation: 'Subagents do not see the coordinator\'s conversation, so "identified above" is meaningless to the drafter. It rediscovers usages with a naive search and misses the alias call sites. Passing the complete findings as structured data in the Task prompt lets the subagent start from verified results instead of redoing, and degrading, the coordinator\'s work.',
    rationales: [
      'Correct. Explicit, complete context removes the round-trip rediscovery and the missed alias sites.',
      'Improves rediscovery odds but still wastes the work already done and remains probabilistic.',
      'More turns give more time to repeat work the coordinator already finished; the context gap remains.',
      'Parallel drafters still receive no findings, so each repeats discovery and may miss the aliases.'
    ],
    trap: 'Subagent expected to see context not in its prompt'
  },
  {
    id: 'e4-S4-05', scenario: 'S4', domain: 'D1', obj: 'O04', type: 'single', select: 1,
    stem: 'The coordinator delegates legacy-system questions with prompts like "Look into the billing-ledger service and tell me about it." The explorer subagent reads over 200 files, returns 6,000 words of loosely organized notes, and the coordinator cannot tell whether the refund path, the nightly reconciliation job, or the Postgres schema were ever examined. A teammate proposes replacing the prompt with a fixed 12-step file-reading procedure. What delegation approach is best?',
    options: [
      'Adopt the teammate\'s fixed 12-step file-reading procedure so every exploration covers the same files in the same order and can be audited.',
      'Keep the open-ended prompt but cap the explorer at 15 turns and tell it to keep its answer under 500 words so the coordinator gets a digest.',
      'State the question, the areas that must be covered, what is out of scope, and an output format listing what was and was not examined.',
      'Have the coordinator read the entry-point files itself first and then delegate only the leftover files, so it keeps control of the exploration.'
    ],
    answer: [2],
    explanation: 'Effective delegation specifies goals, coverage criteria, boundaries and output format, while leaving the search strategy to the subagent. A vague prompt yields sprawling, unauditable output; a rigid procedure breaks on services that do not match it (generated code, macros, unusual layouts). A structured "examined / not examined" section gives the coordinator the visibility to decide on follow-up delegation.',
    rationales: [
      'Procedural scripts remove the subagent\'s ability to adapt to each service\'s actual structure.',
      'Caps and word limits shrink the output but still do not say what must be covered or reported.',
      'Correct. Goal-oriented instructions with explicit coverage and reporting keep both adaptivity and visibility.',
      'Pulls verbose exploration into the coordinator\'s context and fragments the investigation.'
    ],
    trap: 'Swinging from vague delegation to rigid procedure'
  },
  {
    id: 'e4-S4-06', scenario: 'S4', domain: 'D2', obj: 'O17', type: 'single', select: 1,
    stem: 'An engineer asks the agent to find every caller of <code>retry_with_backoff</code> in a 1.1M-line Rust workspace before changing its signature. Grep for <code>retry_with_backoff</code> finds only 3 call sites, but the engineer believes there are about 40. The function lives in the <code>platform-http</code> crate, whose <code>lib.rs</code> and <code>prelude.rs</code> contain several <code>pub use</code> statements. What should the agent do next?',
    options: [
      'Glob for files whose names contain "retry" across the whole workspace and Read each of them to find the remaining call sites.',
      'Grep for the broader regex <code>retry</code> across the entire workspace and Read every file that contains at least one match.',
      'Read every <code>Cargo.toml</code> to find crates depending on <code>platform-http</code>, then Read all of those crates\' source files.',
      'Read the wrapper modules to list every re-export and alias of the function, then Grep the workspace for each of those names.'
    ],
    answer: [3],
    explanation: 'When a function is re-exported under other names (for example pub use retry_with_backoff as with_retries), searching for the original name misses callers. First enumerate the exported names by reading the wrapper modules, then Grep for each; this builds understanding incrementally without flooding the context. File-name globbing, broad regexes and reading whole dependent crates are either blind to aliases or far too noisy.',
    rationales: [
      'Callers are rarely in files named after the function, and Glob matches paths, not content.',
      'A bare "retry" regex matches thousands of unrelated lines yet still misses an alias like with_retries.',
      'Reading every dependent crate in full exhausts context long before the call sites are found.',
      'Correct. Enumerate aliases from the wrapper, then search precisely for each name.'
    ],
    trap: 'Searching only the original name across re-exports'
  },
  {
    id: 'e4-S4-07', scenario: 'S4', domain: 'D2', obj: 'O17', type: 'single', select: 1,
    stem: 'An engineer new to the estate asks: "When <code>orders-api</code> (Node.js) publishes an <code>order.settled</code> event, what does <code>ledger-svc</code> (Rust) do with it, and which tables does it write?" Both repositories are large, and the Confluence architecture page for this flow was last edited in 2023. Which exploration approach should the agent follow?',
    options: [
      'Grep both repos for the topic name to find the producer and consumer, Read those files, then follow the handler\'s calls to the database.',
      'Glob every <code>*.rs</code> and <code>*.ts</code> file in both repositories and Read them in directory order to build a complete model first.',
      'Fetch the Confluence architecture page through MCP and answer from it, since it describes this exact flow and avoids reading any code.',
      'Run <code>grep -rn -C 50 "order" .</code> through Bash in both repositories and review all of the combined output in a single pass.'
    ],
    answer: [0],
    explanation: 'Systematic exploration starts from a precise anchor (the topic string), uses Grep to locate entry points, then uses Read to follow imports and calls, building understanding incrementally within context limits. Reading everything upfront or dumping huge grep output exhausts context, and a design page that is years old may no longer match the code, so it can guide but not replace reading the code.',
    rationales: [
      'Correct. Precise Grep anchors, then targeted Reads that follow the actual call path.',
      'Reading all files upfront wastes context on irrelevant code and degrades later answers.',
      'Stale documentation may describe a flow that has since changed; the question is about current behavior.',
      'A broad pattern with 50 lines of context floods the window with unrelated matches.'
    ],
    trap: 'Reading everything upfront or trusting stale docs'
  },
  {
    id: 'e4-S4-08', scenario: 'S4', domain: 'D2', obj: 'O17', type: 'single', select: 1,
    stem: 'The agent is asked to inventory how each of 60 Rust crates in a workspace handles configuration (environment variables, config files, feature flags). Working alone, it reaches 85% context usage after 28 crates; its later answers describe "typical config patterns" rather than the specific structs it found, and it contradicts an earlier finding about <code>ledger-core</code>. What should the design change to?',
    options: [
      'Move the agent to a model with a larger context window so that all 60 crates can be explored in one session without degradation.',
      'Delegate crate groups to exploration subagents returning structured summaries, record findings in a scratchpad file, and coordinate from those.',
      'Instruct the agent to Read only each crate\'s <code>Cargo.toml</code>, since the feature flags and dependencies there reveal the configuration approach.',
      'Run <code>/compact</code> after every crate so older exploration output is summarized, and continue the whole inventory in the same context.'
    ],
    answer: [1],
    explanation: 'Long single-context exploration degrades: answers drift toward generic patterns and earlier specifics are lost or contradicted. Isolating verbose exploration in subagents that return concise structured findings, and persisting key facts in a scratchpad file, lets the main agent reason over recorded results instead of fading context. A larger window does not fix attention dilution, Cargo.toml alone misses the code that reads env vars and files, and compacting repeatedly summarizes away specifics.',
    rationales: [
      'More room does not restore attention to early findings; degradation continues as the window fills.',
      'Correct. Subagent isolation plus a scratchpad keeps specifics durable and the main context small.',
      'Manifests show dependencies and features, not how the code actually loads configuration.',
      'Helpful as a tactic, but alone it keeps compressing the very specifics the inventory needs.'
    ],
    trap: 'Bigger context window for context degradation'
  },
  {
    id: 'e4-S4-09', scenario: 'S4', domain: 'D2', obj: 'O33', type: 'single', select: 1,
    stem: 'The platform agent is a single agent with Read, Write, Edit, Bash, Grep and Glob plus three MCP servers: Jira (14 tools), Confluence (9 tools) and the service catalog (6 tools), 35 tools in total. It often calls Confluence search when a catalog lookup would answer the question, and once used Jira <code>transition_issue</code> when only asked to summarize a ticket. The catalog is needed on almost every request. Which redesign is best?',
    options: [
      'Keep the single agent with all 35 tools and rewrite every tool description so that similar tools clearly differ in purpose and boundaries.',
      'Create subagents for code, tickets and docs, each given all 35 tools so that any of them can finish a request without further delegation.',
      'Split into code, ticket and docs subagents with only their role\'s tools, and give the coordinator Task plus read-only catalog lookups.',
      'Disconnect the Confluence server, since it overlaps most with the catalog, and keep the remaining 26 tools on the single agent.'
    ],
    answer: [2],
    explanation: 'Tool-selection reliability drops as the number of tools grows. Scope each subagent to its role (read-only Jira tools for summaries, Confluence read tools for docs, Read/Grep/Glob for code) and give a limited cross-role tool where it is needed on most requests, here catalog lookup on the coordinator. Better descriptions help, but 35 tools on one agent still dilute selection, and giving every subagent every tool recreates the problem.',
    rationales: [
      'Descriptions help selection among similar tools but do not remove the decision complexity of 35 options or the write-capable tools.',
      'Giving each subagent everything reproduces the original misuse in three places.',
      'Correct. Role-scoped tool sets plus a scoped high-frequency cross-role tool.',
      'Removes a needed capability and still leaves 26 tools, including the Jira write tools, on one agent.'
    ],
    trap: 'All tools "for flexibility"'
  },
  {
    id: 'e4-S4-10', scenario: 'S4', domain: 'D2', obj: 'O32', type: 'single', select: 1,
    stem: 'An engineer asks the agent to do three things in the <code>ledger-svc</code> repo: (a) list every <code>.proto</code> file under <code>services/</code>; (b) find every file that references <code>LedgerEntryV2</code>; (c) bump <code>tokio = "1.28"</code> to <code>"1.38"</code> in <code>Cargo.toml</code>, where an Edit call failed with "old_string is not unique" because the identical line appears under both <code>[dependencies]</code> and <code>[dev-dependencies]</code>, and both must change. Which tool choices are correct?',
    options: [
      '(a) Glob <code>services/**/*.proto</code>; (b) Grep for <code>LedgerEntryV2</code>; (c) Read the full <code>Cargo.toml</code>, then Write it back with both lines updated.',
      '(a) Grep for <code>\\.proto</code> under <code>services/</code>; (b) Glob <code>**/*LedgerEntryV2*</code>; (c) retry the same Edit call until it succeeds.',
      '(a) Glob <code>services/**/*.proto</code>; (b) Grep for <code>LedgerEntryV2</code>; (c) Bash <code>sed -i</code> across every <code>Cargo.toml</code> found anywhere in the repository.',
      '(a) Bash <code>find services -name "*.proto"</code>, then Read each result; (b) Grep; (c) delete the dev-dependency line and Edit the remaining one.'
    ],
    answer: [0],
    explanation: 'Glob matches file paths by pattern, Grep searches file contents, and when Edit cannot find a unique anchor, the reliable fallback is to Read the full file and Write it back with the intended changes. Grep is the wrong tool for finding files by extension, Glob cannot search contents, retrying a non-unique Edit fails identically, and a repo-wide sed modifies files nobody asked to change.',
    rationales: [
      'Correct. Each operation uses the tool built for it, with Read + Write as the fallback for a non-unique Edit.',
      'Swaps Grep and Glob, and an identical Edit call fails the same way every time.',
      'Right for (a) and (b), but a repo-wide sed edits other crates\' manifests without review.',
      'Reading each proto file is unnecessary to list them, and deleting the dev-dependency changes the build.'
    ],
    trap: 'Confusing Grep and Glob; unsafe fallback for non-unique Edit'
  },
  {
    id: 'e4-S4-11', scenario: 'S4', domain: 'D2', obj: 'O34', type: 'single', select: 1,
    stem: 'Traces show the platform agent making 20–40 calls to the catalog MCP server\'s <code>list_services</code> and <code>get_service</code> tools at the start of most sessions, just to work out which of 1,400 services owns a repo, its tier, and its on-call team. The catalog changes a few times a day. What is the most effective improvement?',
    options: [
      'Paste the full catalog export into the agent\'s system prompt at startup so that ownership questions can be answered without any tool calls.',
      'Add pagination and a <code>page_size</code> parameter to <code>list_services</code> so that each exploratory call returns a smaller set of services.',
      'Record the answers the agent discovers in CLAUDE.md so that later sessions can look up owners there instead of calling the catalog.',
      'Expose the catalog index (service, repo, owner, tier, on-call) as an MCP resource, keeping tools for targeted lookups.'
    ],
    answer: [3],
    explanation: 'MCP resources expose content catalogs so an agent can see what data exists without exploratory tool calls, while tools remain for targeted queries and actions. A resource served by the catalog stays current. Pasting 1,400 services into the prompt wastes context and goes stale within hours, pagination still requires exploration, and hand-maintained CLAUDE.md entries drift from the source of truth.',
    rationales: [
      'Large, always-loaded, and stale as soon as the catalog changes.',
      'Smaller pages mean even more exploratory calls, not fewer.',
      'A manually accreted copy drifts from the catalog and is loaded into every session regardless of need.',
      'Correct. A resource gives current catalog visibility without exploration.'
    ],
    trap: 'Tools for catalog discovery instead of resources'
  },
  {
    id: 'e4-S4-12', scenario: 'S4', domain: 'D2', obj: 'O35', type: 'multi', select: 2,
    stem: 'The platform team commits this <code>.mcp.json</code>. A security scan flags it, and new engineers report that the Confluence tools a teammate demoed are missing from their sessions; that teammate had added Confluence with <code>claude mcp add confluence -- npx -y @acme/confluence-mcp</code>.<pre>{\n  "mcpServers": {\n    "jira": {\n      "command": "npx",\n      "args": ["-y", "@acme/jira-mcp"],\n      "env": { "JIRA_TOKEN": "atl_9f3c1e...e21" }\n    },\n    "catalog": {\n      "command": "./tools/catalog-mcp",\n      "env": { "CATALOG_URL": "https://catalog.internal" }\n    }\n  }\n}</pre>Which two changes should the team make? (Select 2)',
    options: [
      'Move all three servers into each engineer\'s <code>~/.claude.json</code> so that tokens never appear anywhere in the repository.',
      'Replace the literal token with <code>"${JIRA_TOKEN}"</code> so each engineer\'s environment supplies it at connection time.',
      'Add <code>.mcp.json</code> to <code>.gitignore</code> and share the file with new engineers through the team wiki instead.',
      'Write the Confluence server command and its token into the project CLAUDE.md so that every session knows how to connect.',
      'Add Confluence at project scope, e.g. <code>claude mcp add --scope project ...</code>, so it lands in the committed <code>.mcp.json</code>.'
    ],
    answer: [1, 4],
    explanation: 'Team-shared servers belong in the committed project .mcp.json, with credentials supplied through environment-variable expansion rather than literals. claude mcp add defaults to local scope, which is private to one user\'s project, so teammates never received Confluence. Moving everything to user scope or gitignoring the file stops sharing the team tooling, and CLAUDE.md is context, not MCP configuration. The exposed token should also be rotated.',
    rationales: [
      'User scope is for personal or experimental servers; the team would lose shared, versioned configuration.',
      'Correct. Env-var expansion keeps secrets out of version control while the config stays shared.',
      'Un-versioned copies drift and defeat the purpose of project-scoped configuration.',
      'CLAUDE.md does not configure MCP servers, and it would commit another secret.',
      'Correct. Project scope writes the server to .mcp.json so every clone gets it.'
    ],
    trap: 'Default local scope for team tooling; committed secrets'
  },
  {
    id: 'e4-S4-13', scenario: 'S4', domain: 'D3', obj: 'O16', type: 'single', select: 1,
    stem: 'The platform team wants three behaviors from Claude Code across the Rust + Node.js monorepo: (a) the agent must never run <code>cargo publish</code> or <code>npm publish</code>, even if asked; (b) Rust code must follow the error-handling convention (<code>thiserror</code> in library crates, <code>anyhow</code> in binaries), with <code>.rs</code> files spread across 60 crates in many directories; (c) a multi-step "new service" scaffolding workflow that engineers run on demand a few times a month. Which mechanisms fit?',
    options: [
      '(a) a "never publish" rule in the project CLAUDE.md; (b) a <code>.claude/rules/</code> file with <code>paths: ["**/*.rs"]</code>; (c) a skill in <code>.claude/skills/</code>.',
      '(a) publish deny rules in <code>.claude/settings.json</code>; (b) a <code>.claude/rules/</code> file with <code>paths: ["**/*.rs"]</code>; (c) a project skill.',
      '(a) deny rules for the publish commands in <code>.claude/settings.json</code>; (b) a CLAUDE.md in each of the 60 crate directories; (c) a section in root CLAUDE.md.',
      '(a) a PreToolUse hook in <code>~/.claude/settings.json</code>; (b) a <code>.claude/rules/</code> file with <code>paths: ["**/*.rs"]</code>; (c) a PostToolUse hook.'
    ],
    answer: [1],
    explanation: 'Match the mechanism to the requirement. A guaranteed block needs deterministic enforcement, such as permission deny rules (e.g. Bash(cargo publish *)) or a PreToolUse hook, in shared project configuration. Conventions for a file type spread across many directories fit path-scoped rules. An occasional multi-step workflow fits an on-demand skill. CLAUDE.md is advisory context, 60 per-directory CLAUDE.md files do not scale, and a hook in one user\'s home settings protects nobody else.',
    rationales: [
      'CLAUDE.md is probabilistic guidance; "even if asked" requires enforcement.',
      'Correct. Deny rules for the guarantee, path-scoped rules for spread-out file types, a skill for the on-demand workflow.',
      'Per-crate CLAUDE.md files are hard to maintain, and a workflow in root CLAUDE.md loads into every session.',
      'User-level settings are not shared with the team, and a PostToolUse hook is not a workflow mechanism.'
    ],
    trap: 'CLAUDE.md for a guarantee; user-level config for team needs'
  },
  {
    id: 'e4-S4-14', scenario: 'S4', domain: 'D3', obj: 'X07', type: 'single', select: 1,
    stem: 'Two engineers run Claude Code on the same repository commit. For Priya it follows the team\'s Node.js error-handling conventions; for Tomás it ignores them. The root CLAUDE.md contains <code>@docs/standards/node.md</code>, and Tomás recently cleaned out his home directory and deleted his <code>CLAUDE.local.md</code>. Before changing any configuration, what is the best first step?',
    options: [
      'Have Tomás copy the root CLAUDE.md into <code>~/.claude/CLAUDE.md</code> so that the conventions load for him from both project and user scope.',
      'Have Tomás start sessions with <code>--bare</code> so that stale personal configuration is skipped and only project files are applied.',
      'Run <code>/memory</code> in both sessions and compare which memory files and imports are actually loaded for each engineer.',
      'Move the Node.js conventions into <code>.claude/settings.json</code> so they are enforced for every engineer regardless of memory files.'
    ],
    answer: [2],
    explanation: 'When behavior differs between sessions, first verify what each session actually loaded; /memory (and /context in current versions) shows the memory files in effect. The difference could be a personal file Priya has that Tomás deleted, an import that is not resolving, or a path problem, and the fix depends on which. Duplicating content into user scope hides the cause, --bare skips CLAUDE.md discovery entirely, and settings.json holds permissions and configuration, not conventions.',
    rationales: [
      'Masks the cause and creates a personal copy that will drift from the project file.',
      '--bare skips auto-discovery of CLAUDE.md, so it would remove the conventions for Tomás entirely.',
      'Correct. Diagnose which memory files are loaded before changing anything.',
      'Settings files do not carry coding conventions; this confuses configuration with context.'
    ],
    trap: 'Changing config before diagnosing what is loaded'
  },
  {
    id: 'e4-S4-15', scenario: 'S4', domain: 'D3', obj: 'X12', type: 'single', select: 1,
    stem: 'A developer wrote an <code>explain-service</code> skill at <code>~/.claude/skills/explain-service/SKILL.md</code>:<pre>---\nname: explain-service\ndescription: Explains how a named service works, with file:line references.\n---\nExplain the service $ARGUMENTS ...</pre>The team wants it to (1) be available to everyone who clones the repo, (2) prompt for the service name when invoked without arguments (today it explores the whole monorepo), and (3) be unable to modify files while it runs. Which change meets all three?',
    options: [
      'Move it to <code>.claude/skills/explain-service/</code> in the repo, and add <code>argument-hint: "&lt;service-name&gt;"</code> and <code>allowed-tools: Read, Grep, Glob</code>.',
      'Keep it in <code>~/.claude/skills/</code>, ask every engineer to copy the folder into their own home directory, and add <code>argument-hint</code> and <code>allowed-tools: Read, Grep, Glob</code>.',
      'Move it to <code>.claude/skills/explain-service/</code>, add <code>context: fork</code>, and add "only read files; ask for a service name" to the skill body.',
      'Move it to <code>.claude/commands/explain-service.md</code>, and add <code>argument-hint</code> together with <code>disable-model-invocation: true</code>.'
    ],
    answer: [0],
    explanation: 'Project skills in .claude/skills/ are shared through version control; argument-hint tells developers which parameter to supply; allowed-tools in frontmatter limits the skill to read-only tools while it runs (exam-guide framing; current docs describe allowed-tools as pre-approving tools and disallowed-tools as removing them). Personal copies drift, instructions in the body are only guidance, and disable-model-invocation controls who can trigger a skill, not which tools it may use.',
    rationales: [
      'Correct. Project scope, an argument hint, and a read-only tool restriction satisfy all three requirements.',
      'Manual copying is not team distribution and copies drift from each other.',
      'context: fork isolates output but does not restrict tools, and body text is not enforcement.',
      'Commands are shareable, but nothing here restricts tools, so the skill could still modify files.'
    ],
    trap: 'Personal scope for team skills; body text instead of frontmatter'
  }
]);
