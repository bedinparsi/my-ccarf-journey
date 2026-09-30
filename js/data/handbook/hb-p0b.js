/* Architect Handbook · Part 0 (b): Agent SDK, Claude Code as an architecture, MCP, prompt engineering fundamentals. */
(function () {
  var H = CCAR.hb, D = H.D;

  /* ------------------------------------------------------------------ 0.4 */
  CCAR.lessons.push({
    id: 'hb-04-agent-sdk', track: 'handbook', part: 'P0', num: '0.4', order: 4, domain: 'ALL', objs: ['O05', 'O06', 'X03', 'O02'], ts: ['1.1', '1.3', '1.5', '1.7'], minutes: 35,
    title: 'The Claude Agent SDK: loop, options, permissions, sessions, hooks and subagents',
    summary: 'The Claude Code harness as a library: query() and its options, the message stream and result subtypes, built-in tools, the permission model, compaction, sessions, hooks and subagents, with the exam\'s Task-tool terminology mapped to today\'s Agent tool.',
    body: function () {
      return `
<p>The Agent SDK gives you Claude Code's agent loop, built-in tools, context management, permissions, sessions, hooks and subagents as a Python or TypeScript library. You configure an agent instead of writing a loop. Domain 1 (27% of the exam) is written against this SDK: stems show you an <code>AgentDefinition</code>, an <code>allowedTools</code> list or a hook and ask what is misconfigured. In production it is the default choice for agent products where you want Claude Code's harness in your own process.</p>

<h3>Which harness: SDK vs CLI vs Client SDK vs Managed Agents</h3>
${H.table(['Option', 'What it is', 'Choose it when', 'You own'], [
  ['<b>Agent SDK</b>', 'Claude Code\'s loop, tools and context management as a library (Python, TypeScript)', 'You ship an agent (support, research, internal dev tool) inside your own service', 'Options: tools, agents, hooks, permission mode, budgets, session storage, hosting'],
  ['<b>Claude Code CLI</b>', 'Interactive terminal/IDE agent, or <code>claude -p</code> non-interactive', 'Humans develop with it, or a CI job runs it', 'Repo config: CLAUDE.md, settings, skills, hooks, .mcp.json'],
  ['<b>Client SDK</b>', 'Raw Claude API; you write the loop (or use Tool Runner)', 'Single-shot extraction, classification, batch jobs, a loop you must control step by step', 'Loop, tool execution, context, retries, caching'],
  ['<b>Managed Agents</b>', 'Anthropic-hosted agent harness', 'You want the harness without running the infrastructure yourself', 'Configuration and integration, not hosting']
])}

<h3>query(): one call, a stream of messages</h3>
<pre class="code">import { query } from "@anthropic-ai/claude-agent-sdk";

let sessionId: string | null = null;

const run = query({
  prompt: "Customer C-1042 reports order 4417 arrived damaged. Resolve it.",
  options: {
    systemPrompt: "You are Acme's support agent. Verify the customer before any refund...",
    allowedTools: ["Read", "Grep", "Agent",                 // auto-approved (NOT a whitelist)
                   "mcp__orders__get_customer", "mcp__orders__lookup_order"],
    disallowedTools: ["Bash", "WebSearch"],                 // blocked regardless of mode
    permissionMode: "dontAsk",                              // headless: unlisted = hard deny
    mcpServers: { orders: { type: "http", url: "https://orders.internal.example/mcp" } },
    agents: {
      "policy-checker": {
        description: "Checks a proposed resolution against the refund policy. Use before any refund.",
        prompt: "You check resolutions against policy docs in ./policy. Return a verdict and the clause.",
        tools: ["Read", "Grep"], model: "haiku", effort: "low"
      }
    },
    hooks: { PreToolUse: [{ matcher: "mcp__orders__process_refund", hooks: [refundLimitHook] }] },
    maxTurns: 30,                 // safety rail on tool-use turns, not the stop condition
    maxBudgetUsd: 2.0,            // includes subagent spend
    effort: "medium",
    settingSources: ["project"],  // load project settings and CLAUDE.md
    // resume: savedId, forkSession: true   // continue or branch a prior session
  }
});

for await (const msg of run) {                    // iterate to completion
  if (msg.type === "system" &amp;&amp; msg.subtype === "init") sessionId = msg.session_id;
  if (msg.type === "result") {
    if (msg.subtype === "success") console.log(msg.result, msg.total_cost_usd, msg.num_turns);
    else console.error("stopped:", msg.subtype);    // error_max_turns, error_max_budget_usd, ...
  }
}</pre>
<p class="small muted">Python uses the same concepts with snake_case names (for example <code>fork_session</code>). Server URL and agent names are illustrative.</p>

<h3>The message stream</h3>
${D({ w: 760, h: 200, title: 'Agent SDK loop as a message stream',
  nodes: [
    { id: 'i', x: 10, y: 70, w: 120, h: 56, label: 'SystemMessage', sub: 'init: session_id, tools', kind: 'note' },
    { id: 'a', x: 160, y: 70, w: 140, h: 56, label: 'AssistantMessage', sub: 'text / tool_use blocks', kind: 'agent' },
    { id: 't', x: 330, y: 70, w: 120, h: 56, label: 'Tools run', sub: 'hooks + permissions', kind: 'tool' },
    { id: 'u', x: 480, y: 70, w: 130, h: 56, label: 'UserMessage', sub: 'tool results', kind: 'store' },
    { id: 'r', x: 640, y: 70, w: 110, h: 56, label: 'ResultMessage', sub: 'subtype, cost, turns', kind: 'good' }
  ],
  edges: [{ from: 'i', to: 'a' }, { from: 'a', to: 't' }, { from: 't', to: 'u' }, { from: 'u', to: 'a', dashed: true, label: 'repeat while tool calls', dy: 50 }, { from: 'a', to: 'r', dashed: true, label: 'no tool calls', dy: -50 }],
  caption: 'The SDK runs the stop_reason loop for you: it continues while Claude requests tools and ends when a response contains no tool calls. You consume messages; you do not parse text to decide when it is done.' })}
${H.table(['Message', 'When', 'What to do with it'], [
  ['<b>SystemMessage</b> <code>init</code>', 'First message', 'Capture <code>session_id</code>; log the tool and MCP server list for debugging'],
  ['<b>AssistantMessage</b>', 'Each model turn', 'Show progress; text may accompany tool calls, so it is not a completion signal'],
  ['<b>UserMessage</b>', 'After tools run', 'Carries tool results back into the conversation (how the model "sees" results)'],
  ['<b>StreamEvent</b>', 'Only when partial streaming is enabled', 'Token-level UI updates'],
  ['<b>SystemMessage</b> <code>compact_boundary</code>', 'After automatic compaction', 'Mark that earlier turns were summarized; audit what may have been lost'],
  ['<b>ResultMessage</b>', 'Last message', '<code>subtype</code>, <code>result</code> (success only), <code>usage</code>, <code>total_cost_usd</code>, <code>num_turns</code>, <code>session_id</code>, <code>stop_reason</code>']
])}
${H.table(['ResultMessage subtype', 'Meaning', 'Handling'], [
  ['<code>success</code>', 'Claude finished; <code>result</code> holds the final text', 'Deliver; still check <code>stop_reason</code> ("refusal" means Claude declined)'],
  ['<code>error_max_turns</code>', '<code>maxTurns</code> hit (counts tool-use turns)', 'Task too big or looping: decompose, or resume with a higher cap if progress was real'],
  ['<code>error_max_budget_usd</code>', '<code>maxBudgetUsd</code> hit (includes subagents)', 'Investigate cost drivers (context bloat, over-delegation) before raising the budget'],
  ['<code>error_during_execution</code>', 'Error inside the run (API, tool, process)', 'Retry transient causes; surface the rest with the session_id for resumption'],
  ['<code>error_max_structured_output_retries</code>', 'Structured output validation kept failing', 'Fix the schema or the prompt; the data may not contain what the schema requires']
])}
${H.box('rule', 'Iterate the stream to completion.', 'Breaking out on the first AssistantMessage that "looks final" loses the ResultMessage (cost, subtype, session_id) and can leave work half done. This is the SDK form of the exam\'s 1.1 anti-patterns: never parse natural-language "I\'m done", never treat assistant text as completion, never use an iteration cap as the primary stop. <code>maxTurns</code> and <code>maxBudgetUsd</code> are safety rails; a budget is a good production default.')}

<h3>Model-driven loop vs decision tree (1.1)</h3>
<p>Inside the loop Claude chooses the next tool from the accumulated context (tool results are appended as UserMessages, so each result informs the next decision). That is model-driven decision-making. A pre-configured decision tree hard-codes the sequence. Use the agent loop for open-ended work; when a step must always happen in a fixed order (verify identity before refund), do not rely on the model's choice: enforce it with a hook or gate (1.4, 1.5).</p>

<h3>Built-in tools</h3>
${H.table(['Tool', 'Purpose', 'Runs'], [
  ['<code>Read</code>, <code>Glob</code>, <code>Grep</code>', 'Read files; find files by path pattern; search contents', 'Concurrently (read-only)'],
  ['<code>Edit</code>, <code>Write</code>', 'Targeted edit by unique match; full-file write', 'Sequentially'],
  ['<code>Bash</code>', 'Shell commands', 'Sequentially'],
  ['<code>WebSearch</code>, <code>WebFetch</code>', 'Search the web; fetch a URL', 'Read-only'],
  ['<code>ToolSearch</code>', 'Discover deferred tool definitions (MCP schemas are deferred by default)', 'On demand'],
  ['<code>Agent</code>', 'Spawn a subagent (exam guide: <b>Task</b>)', 'Several in one response run in parallel'],
  ['<code>Skill</code>', 'Invoke a skill (full content loads on use)', 'On demand'],
  ['<code>AskUserQuestion</code>', 'Ask the user a clarifying question', 'Needs a UI to answer'],
  ['<code>TaskCreate</code> / <code>TaskUpdate</code>', 'Track a task list during long work', 'Bookkeeping']
])}
<p>Read-only tools (Read, Glob, Grep, and MCP tools annotated <code>readOnlyHint</code>) run in parallel; state-modifying tools run one at a time. Custom tools run sequentially unless annotated read-only. You can define your own tools in your code and expose them to the agent through an in-process SDK MCP server; they then appear as <code>mcp__&lt;server&gt;__&lt;tool&gt;</code> like any other MCP tool.</p>

<h3>Permissions: who may run what</h3>
${H.table(['Control', 'What it actually does', 'Common mistake'], [
  ['<code>allowedTools</code>', '<b>Auto-approves</b> listed tools. Unlisted tools remain available and fall through to <code>permissionMode</code> / <code>canUseTool</code>', 'Treating it as a whitelist that hides other tools'],
  ['<code>disallowedTools</code>', 'Blocks tools regardless of mode. A bare name (<code>"Bash"</code>) removes the tool from context; a scoped rule (<code>"Bash(rm *)"</code>) blocks matching calls', 'Using prompt text ("never run rm") instead'],
  ['<code>permissionMode</code>', 'Default behavior for anything not decided by rules', 'Using bypassPermissions outside a sandbox'],
  ['<code>canUseTool</code>', 'Your callback decides allow/deny for calls that would otherwise prompt (custom approval UI)', 'Forgetting it in an interactive product, so calls hang or deny'],
  ['Hooks (PreToolUse)', 'Run first; can deny or rewrite input deterministically', 'Expecting a hook "allow" to override a deny rule (it cannot)']
])}
${H.table(['permissionMode', 'Behavior', 'Use for'], [
  ['<code>default</code>', 'Unapproved tools go to <code>canUseTool</code> / prompt', 'Interactive products with an approval UI'],
  ['<code>acceptEdits</code>', 'File edits auto-approved', 'Trusted coding sessions'],
  ['<code>plan</code>', 'Explore and plan, no changes', 'Design before execution'],
  ['<code>dontAsk</code>', 'Anything not pre-approved is denied, no prompt', 'Headless agents with a fixed, explicit tool surface'],
  ['<code>auto</code>', 'A classifier reviews actions', 'Long autonomous runs with a safety net'],
  ['<code>bypassPermissions</code>', 'Everything runs (TS needs <code>allowDangerouslySkipPermissions</code>)', 'Only isolated, disposable environments']
])}
${H.box('rule', 'Evaluation order:', 'PreToolUse hooks run first (exit code 2 / deny blocks even if an allow rule matches). Then permission rules in the order <b>deny → ask → allow</b>; the first match wins and specificity does not matter, so an allow can never carve an exception out of a deny. Deny at any scope beats allow anywhere; managed settings cannot be overridden. Whatever is still undecided goes to the permission mode and <code>canUseTool</code>.')}

<h3>Context: what costs tokens</h3>
${H.table(['Item', 'Cost'], [
  ['System prompt, CLAUDE.md (loaded via <code>settingSources</code>)', 'Every request (cached as a stable prefix)'],
  ['Tool definitions', 'Every request; MCP schemas deferred behind tool search by default'],
  ['Skill descriptions', 'Every request; full skill body only when invoked'],
  ['Conversation history, tool results', 'Grows every turn; the main driver of cost and context rot'],
  ['Hooks', 'Zero (run in your process) unless they return output to Claude'],
  ['Subagents', 'Isolated context; only the final message returns to the parent']
])}
<p>Near the context limit the SDK <b>compacts automatically</b>: older turns are summarized and a <code>compact_boundary</code> system message is emitted. Early instructions and exact values can be lost in the summary, so <b>persistent rules belong in CLAUDE.md</b> (re-injected after compaction), and critical case facts belong in a block you re-send or store outside the history (5.1). A PreCompact hook can archive the full transcript first.</p>

<h3>Sessions: resume and fork (1.7)</h3>
${H.table(['Need', 'Mechanism', 'Note'], [
  ['Continue the same conversation later', 'Capture <code>session_id</code> from init/result; pass <code>resume</code>', 'Restores full context, including old tool results'],
  ['Explore two approaches from one baseline', '<code>resume</code> + <code>forkSession: true</code> (Python <code>fork_session</code>)', 'New session ID; the original stays untouched'],
  ['Stateless or serverless host', 'Session store adapter persists transcripts outside local disk', 'Any instance can resume'],
  ['CLI equivalent', '<code>--resume &lt;id|name&gt;</code>, <code>-n/--name</code>, <code>--continue</code>, <code>--fork-session</code>', 'Named sessions: <code>--resume &lt;session-name&gt;</code>']
])}
${H.box('decision', 'Resume or start fresh?', 'Resume when prior context is mostly valid, and tell the agent exactly what changed ("auth.ts and session.ts were edited since your analysis; re-read only those"), so it re-analyzes those files rather than re-exploring everything. Start a new session with an injected structured summary when prior tool results are stale (large refactor, new data): stale results in history are treated as current facts and mislead the model.')}

<h3>Hooks (1.5)</h3>
<p>Hooks are callbacks in your process on lifecycle events: PreToolUse, PostToolUse, UserPromptSubmit, Stop, SubagentStart/SubagentStop, PreCompact, SessionStart and more. They cost no context and they always run, which makes them the enforcement layer.</p>
<pre class="code">// PreToolUse: block refunds above the $500 policy limit and redirect to a human
const refundLimitHook = async (input) =&gt; {
  if (input.tool_input.amount &gt; 500) {
    return { hookSpecificOutput: { hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "Refunds over $500 need human approval. Call escalate_to_human with a case summary." } };
  }
  return {};
};
// PostToolUse (registered the same way) can replace a tool result before Claude sees it,
// e.g. normalize Unix timestamps, ISO 8601 strings and numeric status codes from different
// MCP tools into one format.</pre>
${H.table(['Hook', 'Exam pattern', 'Why a hook'], [
  ['PreToolUse', 'Block <code>process_refund</code> above $500 and redirect to escalation; block it until <code>get_customer</code> returned a verified ID', 'A prompt rule has a non-zero failure rate; financial and compliance rules need guarantees'],
  ['PostToolUse', 'Normalize heterogeneous formats (Unix epoch, ISO 8601, status 3 → "shipped"); trim 40-field results to the 5 that matter', 'Clean, consistent data before the model reasons over it; less context'],
  ['Stop / SubagentStop', 'Deterministic "done" gate (tests must pass)', 'Model self-assessment is not verification']
])}

<h3>Subagents (1.3)</h3>
${H.table(['AgentDefinition field', 'Meaning'], [
  ['<code>description</code> (required)', 'When to use this agent; drives automatic delegation, so make it specific'],
  ['<code>prompt</code> (required)', 'The subagent\'s system prompt: role, constraints, output format'],
  ['<code>tools</code>', 'Allowed tools; <b>omit = inherit all</b> (usually too many)'],
  ['<code>disallowedTools</code>', 'Remove tools; supports <code>mcp__server__*</code>'],
  ['<code>model</code>', '<code>fable</code> | <code>opus</code> | <code>sonnet</code> | <code>haiku</code> | <code>inherit</code> | model ID'],
  ['<code>effort</code>, <code>maxTurns</code>, <code>permissionMode</code>', 'Per-agent reasoning depth, turn cap (partial output is marked), permissions'],
  ['<code>skills</code>, <code>mcpServers</code>, <code>memory</code>', 'Preloaded skills, MCP servers this agent may use, memory'],
  ['<code>background</code>, <code>initialPrompt</code>, <code>omitClaudeMd</code> (TS)', 'Execution mode, starting prompt, skip project CLAUDE.md']
])}
${H.table(['A (non-fork) subagent receives', 'It does NOT receive'], [
  ['Its own <code>prompt</code> plus the prompt string the parent writes in the Agent call', 'The parent\'s conversation history'],
  ['Project CLAUDE.md (unless <code>omitClaudeMd</code>)', 'The parent\'s tool results'],
  ['Its tool definitions and listed skills', 'The parent\'s system prompt']
])}
<ul>
<li><b>Context is explicit.</b> Everything the subagent needs goes into the Agent-call prompt: complete prior findings (for a synthesis agent, the web search results and document analysis), in structured form that separates content from metadata (source URL, document name, page), so attribution survives. Forks are the exception: a fork inherits the parent conversation.</li>
<li><b>Only the final message returns</b> to the parent. Messages from inside a subagent carry <code>parent_tool_use_id</code> for tracing.</li>
<li><b>Parallelism:</b> the coordinator emits several Agent calls in <b>one</b> response. Subagents default to background execution; Claude sets <code>run_in_background: false</code> when it needs the result before continuing.</li>
<li><b>Coordinator prompts</b> state goals and quality criteria, not step-by-step procedures, so subagents can adapt.</li>
<li><b>Definition sources:</b> the programmatic <code>agents</code> option (recommended; overrides a filesystem agent with the same name), <code>.claude/agents/*.md</code>, and the built-in general-purpose agent. Built-in Explore and Plan are one-shot; resume custom agents via session resume plus agentId.</li>
<li><b>Caps:</b> spawn depth 3 (<code>CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH</code>), 20 concurrent (<code>CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS</code>), and <code>maxBudgetUsd</code> covering subagent spend. Opus 5 models delegate readily, so set limits. For dozens to hundreds of agents, script-driven dynamic workflows fit better than ad hoc subagents.</li></ul>

${H.box('exam', 'Exam vs current docs:', 'The exam guide spawns subagents with the <b>Task</b> tool and says the coordinator\'s <code>allowedTools</code> must include <code>"Task"</code>; on the exam, a coordinator that never delegates with "Task" missing from allowedTools is the expected diagnosis. In the current SDK the tool is <b>Agent</b>, and <code>allowedTools</code> only auto-approves: to actually restrict availability you use <code>tools</code> / <code>disallowedTools</code> (and <code>dontAsk</code> makes unlisted tools hard-denied). Also: exam <code>fork_session</code> = SDK <code>forkSession</code> (TS) / <code>fork_session</code> (Python) = CLI <code>--fork-session</code>.')}

${H.table(['Symptom', 'Likely misconfiguration (O06)'], [
  ['Coordinator never delegates', '"Task"/Agent not allowed for the coordinator; vague or overlapping <code>description</code>; agent defined but not passed in <code>agents</code>'],
  ['Subagent "cannot" search', 'Its <code>tools</code> omits WebSearch, or its MCP server is not in its <code>mcpServers</code>'],
  ['Synthesis agent web-searches instead of synthesizing', '<code>tools</code> omitted, so it inherited everything'],
  ['Subagent asks for facts the coordinator already found', 'Findings were not included in the Agent-call prompt'],
  ['Parallel research runs serially', 'Agent calls emitted across separate turns instead of one response']
])}

${H.box('real', 'Real-world notes:', 'Log the ResultMessage per run (subtype, <code>total_cost_usd</code>, <code>num_turns</code>, session_id) and per-agent usage; alert on error subtypes. Use <code>dontAsk</code> plus an explicit tool list for headless services, and a sandbox or container for anything with Bash. Persist session IDs with your case records so a support conversation can resume after a deploy. Test hooks as ordinary code with unit tests: they are your compliance layer.')}
${H.box('trap', 'Traps:', '"Add a system-prompt rule so it never refunds over $500" (probabilistic; use a PreToolUse hook). "Put the tool in allowedTools to restrict the agent to it" (auto-approve only). "The subagent can see what the coordinator found earlier" (it cannot, unless forked or passed in the prompt). "Raise maxTurns until it finishes" (cap is a rail, not a fix). "Omit tools so the subagent has what it needs" (inherits everything, misuse).')}

<h3>Worked scenario</h3>
<p>A research coordinator has subagents <code>web-searcher</code>, <code>doc-analyst</code> and <code>synthesizer</code>. Reports lack citations and run slowly; traces show the synthesizer calling WebSearch, and searches running one per turn. <b>Reasoning:</b> the synthesizer's AgentDefinition omits <code>tools</code>, so it inherited WebSearch and is doing work outside its role; the coordinator passes it prose summaries without source metadata, so citations are lost; the coordinator spawns searchers in separate turns. <b>Fix:</b> give the synthesizer <code>tools: ["Read"]</code> (plus a narrow verify_fact tool if it often needs a check), pass findings as structured records (claim, source URL, document, page, date), and instruct the coordinator to issue all independent searcher calls in one response. Set <code>maxBudgetUsd</code> because parallel delegation multiplies spend.</p>

${H.check([
  ['An SDK support agent has <code>allowedTools: ["mcp__orders__lookup_order"]</code> and permissionMode <code>default</code>, yet it calls <code>process_refund</code> after a user approval prompt. Why?', '<code>allowedTools</code> only auto-approves. Unlisted tools are still available and fall to the permission mode, which prompted. To remove the tool, use <code>disallowedTools</code> (bare name) or <code>dontAsk</code> with an explicit list.'],
  ['Your run ends with ResultMessage subtype <code>error_max_turns</code>. Raise maxTurns?', 'Only if the trace shows real progress. Usually the task is too broad or looping: decompose it, trim tool output, or resume the session with a targeted instruction. The cap is a safety rail.'],
  ['Refunds above $500 must never execute automatically. System prompt rule or hook?', 'PreToolUse hook that denies <code>process_refund</code> when amount exceeds 500 and tells Claude to escalate. Hooks are deterministic; prompts have a non-zero failure rate.'],
  ['You resume yesterday\'s investigation session, but a teammate refactored three of the files it analyzed. What do you do?', 'If most context is still valid, resume and state exactly which files changed so it re-reads only those. If much of it is stale, start a new session with a structured summary of still-valid findings.'],
  ['A long agent run forgets a formatting rule given in the first user message. Why, and where should the rule live?', 'Automatic compaction summarized early turns (a <code>compact_boundary</code> was emitted) and the rule was lost. Persistent rules belong in CLAUDE.md (re-injected) or the system prompt.'],
  ['On the exam, a coordinator with AgentDefinitions never spawns subagents. Its <code>allowedTools</code> is <code>["Read","Grep"]</code>. Answer?', 'Add "Task" to the coordinator\'s allowedTools (exam wording). In the current SDK the tool is named Agent.']
])}
${H.src([['Agent SDK overview', 'https://code.claude.com/docs/en/agent-sdk/overview'], ['Agent SDK: agent loop', 'https://code.claude.com/docs/en/agent-sdk/agent-loop'], ['Agent SDK: permissions', 'https://code.claude.com/docs/en/agent-sdk/permissions'], ['Agent SDK: sessions', 'https://code.claude.com/docs/en/agent-sdk/sessions'], ['Agent SDK: hooks', 'https://code.claude.com/docs/en/agent-sdk/hooks'], ['Agent SDK: subagents', 'https://code.claude.com/docs/en/agent-sdk/subagents']])}`;
    }
  });

  /* ------------------------------------------------------------------ 0.5 */
  CCAR.lessons.push({
    id: 'hb-05-claude-code', track: 'handbook', part: 'P0', num: '0.5', order: 5, domain: 'ALL', objs: ['X07', 'X12', 'O16', 'O11'], ts: ['3.1', '3.2', '3.4', '3.6'], minutes: 35,
    title: 'Claude Code as an architecture: context, extensions, modes and daily workflow',
    summary: 'The one constraint that explains Claude Code (context fills and quality drops), the workflow built around it, every extension point with when it loads and what it costs, permission modes and settings scopes, session hygiene, parallelism and headless basics.',
    body: function () {
      return `
<p>Claude Code is an agent harness with a configuration surface: memory files, rules, skills, subagents, hooks, MCP servers, settings and plugins. Domain 3 (20%) asks you to pick the right one of these for a requirement and to diagnose why a team's configuration does not behave. Production teams get the same value from this chapter: most "Claude ignored our rule" problems are a rule placed in the wrong layer.</p>

<h3>The core constraint</h3>
<p>The context window fills fast, and <b>performance degrades as it fills</b>. Every file read, command output and side question stays in context. Almost every best practice follows from this: plan before reading everything, isolate verbose work in subagents, clear between tasks, keep CLAUDE.md short, and load conventions only when relevant.</p>

<h3>The daily workflow: explore → plan → implement → commit</h3>
<ol class="steps">
<li><b>Explore</b> in plan mode: Claude reads and asks, no edits. Delegate verbose discovery to the <b>Explore</b> subagent so the main context gets a summary, not 40 file dumps.</li>
<li><b>Plan</b>: have Claude write the plan (files, approach, risks); you edit it. For unfamiliar domains use the <b>interview pattern</b>: Claude interviews you and writes a spec, then you implement in a fresh session.</li>
<li><b>Implement</b> in normal or acceptEdits mode, with a way to <b>verify</b> (below).</li>
<li><b>Commit</b> with a descriptive message; open a PR.</li></ol>
${H.table(['Task', 'Mode', 'Why (3.4)'], [
  ['Library migration touching 45+ files; microservice restructuring; choosing between integration approaches with different infrastructure', '<b>Plan mode</b>, then execute the plan', 'Large scale, multiple valid approaches, architectural decisions: exploring first prevents costly rework'],
  ['Single-file bug fix with a clear stack trace; adding a date validation conditional', '<b>Direct execution</b>', 'Scope is clear; planning adds cost without reducing risk'],
  ['Multi-phase task whose discovery is verbose', 'Plan mode + Explore subagent', 'Discovery output stays out of the main context'],
  ['Investigation done, approach agreed', 'Switch from plan mode to direct execution of the plan', 'Combine: plan for investigation, execute for implementation']
])}

<h3>Give Claude a way to verify its work</h3>
${H.table(['Mechanism', 'How', 'Strength'], [
  ['In the prompt', '"Run the test suite and fix failures before finishing"', 'Easy; probabilistic'],
  ['<code>/goal</code> condition', 'State the completion condition for the session', 'Keeps the target explicit'],
  ['Stop hook', 'Deterministic gate: blocks finishing while tests or build fail', 'Guaranteed'],
  ['Verification subagent', 'Fresh context reviews the result', 'No self-review bias from the generating context']
])}
<p>Tests, build exit codes, linters and screenshots are all verification signals. Without one, Claude's "done" is a self-assessment.</p>

<h3>The extension layer</h3>
${D({ w: 760, h: 230, title: 'When each extension enters the context',
  groups: [{ x: 10, y: 30, w: 230, h: 190, label: 'SESSION START', kind: 'soft' }, { x: 260, y: 30, w: 230, h: 190, label: 'ON DEMAND', kind: 'soft' }, { x: 510, y: 30, w: 240, h: 190, label: 'OUTSIDE THE CONTEXT', kind: 'hard' }],
  nodes: [
    { id: 'c', x: 25, y: 55, w: 200, h: 44, label: 'CLAUDE.md + rules', sub: 'no paths: every request', kind: 'store' },
    { id: 'sd', x: 25, y: 110, w: 200, h: 44, label: 'Skill descriptions', sub: 'body loads on use', kind: 'note' },
    { id: 'm', x: 25, y: 165, w: 200, h: 44, label: 'MCP tool names', sub: 'schemas via tool search', kind: 'tool' },
    { id: 'p', x: 275, y: 55, w: 200, h: 44, label: 'Path rules, subdir CLAUDE.md', sub: 'when matching files are read', kind: 'store' },
    { id: 'sk', x: 275, y: 110, w: 200, h: 44, label: 'Skill body', sub: 'when invoked (or forked)', kind: 'note' },
    { id: 'sa', x: 275, y: 165, w: 200, h: 44, label: 'Subagent result', sub: 'only the final summary', kind: 'sub' },
    { id: 'h', x: 525, y: 55, w: 210, h: 44, label: 'Hooks', sub: 'zero cost unless they output', kind: 'good' },
    { id: 'sx', x: 525, y: 110, w: 210, h: 44, label: 'Subagent work', sub: 'isolated context window', kind: 'sub' },
    { id: 'st', x: 525, y: 165, w: 210, h: 44, label: 'Settings / permissions', sub: 'enforced by the harness', kind: 'good' }
  ],
  edges: [],
  caption: 'Put always-true, short guidance at session start; task-specific knowledge on demand; guarantees and isolation outside the context.' })}
${H.table(['Extension', 'What it is for', 'Loads', 'Context cost'], [
  ['<b>CLAUDE.md</b>', 'Commands Claude cannot guess, non-default conventions, architecture decisions, gotchas', 'Session start (subdirectory files when Claude reads there)', 'Every request'],
  ['<b>.claude/rules/*.md</b>', 'Topic files (testing.md, api-conventions.md, deployment.md); <code>paths</code> globs make them conditional', 'No paths: at start. With paths: when matching files are read', 'Every request, or only when relevant'],
  ['<b>Skills</b> (SKILL.md)', 'Reusable playbooks and task workflows', 'Description at start; body on invocation', 'Description every request; <code>disable-model-invocation</code> hides it until invoked'],
  ['<b>Commands</b> (.claude/commands/*.md)', 'Older slash-command format, still works', 'On invocation', 'Low; a skill with the same name wins'],
  ['<b>Subagents</b> (.claude/agents/*.md)', 'Isolated workers (Explore, reviewers)', 'On delegation', 'Only the returned summary'],
  ['<b>Hooks</b>', 'Things that must happen every time (block, format, gate)', 'On lifecycle events', 'Zero unless they return output'],
  ['<b>MCP servers</b>', 'Live access to external systems', 'Tool names at start', 'Schemas deferred via tool search'],
  ['<b>Output styles</b>', 'Role, tone, format for a session (not facts)', 'Session', 'System-prompt level'],
  ['<b>Plugins</b>', 'Bundle skills, hooks, subagents and MCP servers for reuse; skills namespaced <code>/plugin:skill</code>', 'Per installed component', 'Sum of components'],
  ['<b>Dynamic workflows</b>', 'Script-driven orchestration of dozens to hundreds of agents', 'When run', 'Per agent, isolated']
])}
${H.table(['Layering rule', 'Behavior'], [
  ['CLAUDE.md files', '<b>Additive</b>: concatenated, not overriding; more specific files are read later'],
  ['Skills with the same name', 'Override: managed &gt; user &gt; project (personal beats project, so give personal variants different names)'],
  ['Subagents with the same name', 'Override: managed &gt; CLI flag &gt; project &gt; user &gt; plugin'],
  ['MCP servers with the same name', 'Override: local &gt; project &gt; user'],
  ['Hooks', '<b>Merge</b>: all matching hooks fire'],
  ['Settings', 'managed &gt; CLI args &gt; local &gt; project &gt; user; permission arrays merge; deny wins']
])}

<h3>CLAUDE.md hierarchy and modular organization (3.1)</h3>
${H.table(['File', 'Scope', 'Shared?'], [
  ['Managed policy CLAUDE.md', 'Whole organization', 'Deployed by admins'],
  ['<code>~/.claude/CLAUDE.md</code>', 'You, all projects', '<b>No</b>: teammates never see it'],
  ['<code>./CLAUDE.md</code> or <code>./.claude/CLAUDE.md</code>', 'Project', 'Yes, via version control'],
  ['<code>./CLAUDE.local.md</code>', 'You, this project', 'No (gitignored)'],
  ['<code>packages/api/CLAUDE.md</code>', 'Directory', 'Yes; loads when Claude reads files there']
])}
<ul>
<li><b>Diagnosis pattern:</b> a new team member does not get the conventions because they live in someone's user-level file. Move them to project CLAUDE.md or <code>.claude/rules/</code>.</li>
<li><b>@import:</b> <code>@docs/testing-standards.md</code>, relative to the importing file, up to four hops. Each package's CLAUDE.md imports only the standards its maintainers consider relevant. Imports still load at launch: organization, not context savings.</li>
<li><b>.claude/rules/:</b> split a monolithic CLAUDE.md into topic files. Add <code>paths</code> frontmatter (<code>paths: ["**/*.test.tsx"]</code>, <code>paths: ["terraform/**/*"]</code>) so a rule loads only when matching files are touched, including files spread across many directories, which a subdirectory CLAUDE.md cannot do.</li>
<li><b>Verify what loaded:</b> <code>/memory</code> (exam answer) lists and opens memory files; <code>/context</code> shows exactly what is in context. <code>/doctor</code> can propose cuts.</li></ul>
<pre class="code"># CLAUDE.md  (keep under ~200 lines; every line costs context on every request)

## Commands
- Build: pnpm build        - Test one file: pnpm vitest run path/to/file.test.ts
- Lint + types: pnpm check (must pass before any commit)

## Architecture
- apps/web (Next.js) calls services only through packages/api-client; never import services directly.
- Money is integer cents everywhere (type Cents). Never use floats for amounts.

## Conventions that differ from defaults
- Errors: return Result&lt;T, AppError&gt;; do not throw across package boundaries.
- Tests: use fixtures in test/fixtures (customerFixture, orderFixture); no network in unit tests.

## Gotchas
- Run pnpm db:migrate after pulling if packages/db/migrations changed.

## Imports
@docs/testing-standards.md</pre>
${H.box('rule', 'What belongs in CLAUDE.md:', 'commands Claude cannot guess, non-default style rules, test instructions, repo etiquette, architecture decisions, environment quirks and gotchas. Leave out what the code already shows, standard language conventions, long documentation (link or import it) and fast-changing information. Bloat makes Claude ignore rules; use "IMPORTANT" sparingly. If Claude makes the same mistake twice, add a line.')}

<h3>Skills and commands (3.2)</h3>
<pre class="code">---                                   # .claude/skills/analyze-module/SKILL.md (project, shared)
name: analyze-module
description: Maps a module's structure, entry points and dependencies. Use before refactoring a module.
argument-hint: [module-path]          # prompts for the parameter when invoked without one
context: fork                         # run in an isolated subagent; only the summary returns
agent: Explore
allowed-tools: Read, Grep, Glob
---
Analyze $ARGUMENTS. Return: entry points, public exports, inbound callers, risky couplings.</pre>
${H.table(['Requirement', 'Choose', 'Why'], [
  ['Team-wide slash command', '<code>.claude/commands/</code> or <code>.claude/skills/</code> in the repo', 'Shared via version control'],
  ['Personal command', '<code>~/.claude/commands/</code> or <code>~/.claude/skills/</code>', 'Only you'],
  ['Customize a team skill for yourself', 'Personal skill with a <b>different name</b>', 'Same name would shadow the project skill for you'],
  ['Skill output is verbose (codebase analysis) or exploratory (brainstorming)', '<code>context: fork</code>', 'Keeps the main session clean'],
  ['Standard applies to every task', 'CLAUDE.md', 'Always loaded'],
  ['Workflow needed only sometimes', 'Skill', 'On-demand; description costs little']
])}
${H.box('exam', 'Exam vs current docs:', 'The exam guide says skill <code>allowed-tools</code> <b>restricts</b> tool access during the skill (for example limit to file writes to prevent destructive actions); answer that way on the exam. Current docs: <code>allowed-tools</code> <b>pre-approves</b> the listed tools and <code>disallowed-tools</code> removes tools. Similarly, the exam uses <code>/memory</code> to verify loaded memory files; today <code>/context</code> shows everything that is loaded.')}

<h3>Adoption triggers: when to add which extension</h3>
${H.table(['Trigger', 'Add'], [
  ['Claude made the same mistake twice', 'A CLAUDE.md line (or a path rule)'],
  ['You type the same prompt repeatedly', 'A user-invocable skill'],
  ['You paste the same playbook a third time', 'A skill'],
  ['You copy data from a system into the chat', 'An MCP server'],
  ['A side task floods the context', 'A subagent'],
  ['It must happen every time, no exceptions', 'A hook (guardrails live in hooks)'],
  ['A second repo needs the same setup', 'A plugin']
])}

<h3>Permission modes and settings scopes</h3>
${H.table(['Mode', 'Behavior'], [
  ['<code>default</code> (labeled Manual)', 'Asks before edits and commands that are not pre-approved'],
  ['<code>acceptEdits</code>', 'File edits auto-approved; commands still governed by rules'],
  ['<code>plan</code>', 'Read and plan only'],
  ['<code>auto</code>', 'A classifier reviews actions'],
  ['<code>dontAsk</code>', 'Only pre-approved tools run; the rest are denied without prompting'],
  ['<code>bypassPermissions</code>', 'No checks (<code>--dangerously-skip-permissions</code>); isolated environments only. Admins can disable it (<code>permissions.disableBypassPermissionsMode</code>) and auto mode (<code>disableAutoMode</code>) via managed settings']
])}
<p>Settings live in <code>~/.claude/settings.json</code> (user), <code>.claude/settings.json</code> (project, committed), <code>.claude/settings.local.json</code> (personal, gitignored; "Yes, don't ask again" saves here) and managed settings (organization, highest). Rules look like <code>Bash(npm run test *)</code>, <code>Read(./.env)</code>, <code>Edit(src/**)</code>, <code>mcp__github__*</code>; evaluation is deny → ask → allow.</p>

<h3>Session hygiene</h3>
${H.table(['Action', 'Use it when'], [
  ['<b>Esc</b>', 'Stop Claude mid-action and redirect'],
  ['<b>Esc Esc</b> / <code>/rewind</code>', 'Restore a checkpoint (conversation, code or both; or summarize from a point). Checkpoints snapshot files before each change'],
  ['<code>/clear</code>', 'Between unrelated tasks; after two failed corrections, clear and write a better prompt'],
  ['<code>/compact &lt;instructions&gt;</code>', 'Summarize while telling it what to keep ("keep the API decisions and failing test names")'],
  ['<code>/btw</code>', 'Side question that should not enter the history'],
  ['<code>--continue</code> / <code>--resume &lt;name&gt;</code>, <code>-n</code>', 'Continue the latest or a named session; name sessions for multi-day investigations']
])}

<h3>Parallelism</h3>
<ul>
<li><b>Git worktrees:</b> several Claude sessions on separate checkouts, no file collisions.</li>
<li><b>Writer / reviewer:</b> one session writes, a separate session (or fresh subagent) reviews; the reviewer has no generator bias. The bundled <code>/code-review</code> skill fits here.</li>
<li><b>Fan-out:</b> loop <code>claude -p</code> over a file list, or <code>/batch</code> (5–30 subagents in worktrees) for large mechanical changes.</li></ul>

<h3>Non-interactive basics (3.6 in depth in Part 3)</h3>
<pre class="code">claude -p "Review the diff against CLAUDE.md review criteria. Report only new or unaddressed issues." \\
  --output-format json --json-schema "$(cat review-schema.json)" \\
  --allowedTools "Read" "Grep" "Bash(git diff *)" --max-turns 15 --max-budget-usd 3.00</pre>
<ul>
<li><code>-p</code> prevents the interactive hang in CI. <code>--output-format json</code> + <code>--json-schema</code> gives machine-parseable findings to post as inline PR comments.</li>
<li>CI gets project context from <b>CLAUDE.md</b>: testing standards, fixtures, what a valuable test is, review criteria.</li>
<li>Re-runs after new commits: include prior findings and ask for only new or still-unaddressed issues (no duplicate comments). For test generation, include existing tests so it does not propose covered scenarios.</li>
<li>Review in an <b>independent instance</b>, not the session that generated the code.</li></ul>

<h3>Security</h3>
${H.table(['Control', 'Protects against'], [
  ['Permission rules and modes', 'Unapproved actions; network commands (curl, wget) are not auto-approved'],
  ['<code>/sandbox</code> (OS-level filesystem + network isolation for Bash)', 'Prompt injection turning into damage; defense in depth with permissions'],
  ['Workspace trust', 'Project allow rules and .mcp.json servers need trust in interactive sessions. <code>claude -p</code> and the SDK show no trust dialog, so for untrusted repos use <code>--setting-sources user</code>, <code>--bare</code>, or <code>--settings \'{"disableAllHooks": true}\'</code>'],
  ['WebFetch in a separate context window; command-injection detection', 'Injected instructions in fetched content'],
  ['Trusted MCP servers only', 'Anthropic does not security-audit MCP servers']
])}

${H.box('real', 'Real-world notes:', 'Treat .claude/ as code: review CLAUDE.md and settings changes in PRs, keep CLAUDE.md short and measured (does a line change behavior?), commit hooks with tests, and enforce org-wide denies in managed settings. Run agents that browse the web or open untrusted repos in a VM or sandbox. Name long-running sessions and keep progress notes in files so work survives /clear.')}
${H.box('trap', 'Traps:', '"Put the rule in ~/.claude/CLAUDE.md so the team gets it" (user-level, not shared). "Use a subdirectory CLAUDE.md for test conventions" when tests are spread everywhere (use a <code>paths</code> glob rule). "Add IMPORTANT in capitals" to force behavior (use a hook or deny rule). "Plan mode for a one-line fix" (overhead). "Same session reviews its own code" (self-review bias). "Name your personal skill the same as the team\'s to customize it" (shadows theirs for you).')}

<h3>Worked scenario</h3>
<p>A platform team reports that Claude follows the API conventions for one developer but not for a new hire; test files across 30 directories ignore the testing conventions; and a verbose "analyze dependencies" workflow leaves sessions sluggish. <b>Reasoning:</b> the API conventions are in the original developer's <code>~/.claude/CLAUDE.md</code>, which is not shared; conventions for scattered test files need glob scoping; the analysis workflow floods the main context. <b>Answer:</b> move API conventions to project <code>.claude/rules/api-conventions.md</code>; create <code>.claude/rules/testing.md</code> with <code>paths: ["**/*.test.tsx"]</code>; turn the analysis into a skill with <code>context: fork</code>. Have the new hire run <code>/memory</code> to confirm what loads.</p>

${H.check([
  ['Your team must migrate a logging library used in 45+ files, with two viable adapter designs. Plan mode or direct execution?', 'Plan mode: large scale, multiple valid approaches, architectural choice. Explore (ideally via the Explore subagent), agree the plan, then execute it directly.'],
  ['A security rule "never read .env" is in CLAUDE.md, yet Claude read it during a debugging session. What is the right fix?', 'CLAUDE.md is guidance. Add a deny rule <code>Read(./.env)</code> in project or managed settings, or a PreToolUse hook. Deny rules win at any scope.'],
  ['Which layering rule applies when both project and user define a skill named <code>deploy</code>?', 'Skills override by name with managed &gt; user &gt; project, so your personal one wins for you. Use a different name for personal variants.'],
  ['A CI job running <code>claude</code> hangs indefinitely. Fix?', 'Run it with <code>-p</code> (print, non-interactive), and add <code>--max-turns</code> / <code>--max-budget-usd</code> as runaway protection.'],
  ['You corrected Claude twice on the same misunderstanding in one session and it still goes wrong. Next step?', '<code>/clear</code> and start again with a better prompt that includes what you learned. The failed attempts pollute the context.'],
  ['Where do you put a "run the formatter after every edit" requirement?', 'A PostToolUse hook on edits: it must happen every time and costs no context.']
])}
${H.src([['Claude Code best practices', 'https://code.claude.com/docs/en/best-practices'], ['Features overview', 'https://code.claude.com/docs/en/features-overview'], ['Memory (CLAUDE.md)', 'https://code.claude.com/docs/en/memory'], ['Skills', 'https://code.claude.com/docs/en/skills'], ['Permissions', 'https://code.claude.com/docs/en/permissions'], ['Security', 'https://code.claude.com/docs/en/security']])}`;
    }
  });

  /* ------------------------------------------------------------------ 0.6 */
  CCAR.lessons.push({
    id: 'hb-06-mcp', track: 'handbook', part: 'P0', num: '0.6', order: 6, domain: 'ALL', objs: ['O34', 'O35', 'X04', 'O36'], ts: ['2.1', '2.2', '2.4'], minutes: 30,
    title: 'Model Context Protocol: architecture, primitives, transports, errors and security',
    summary: 'Host, client and server; tools vs resources vs prompts and the client features; stdio vs Streamable HTTP; tool definitions with annotations and structured output; the two error channels and structured error payloads; Claude Code configuration scopes; and the security duties on each side.',
    body: function () {
      return `
<p>MCP is the open protocol that connects agents to external systems. One MCP server for your order system works in Claude Code, the Agent SDK, the Claude API's MCP connector and any other MCP host. Domain 2 (18%) tests MCP from three angles: how tools describe themselves (2.1), how they report failure (2.2) and how servers are configured and exposed (2.4). In production, MCP servers are also where your security boundary with external data lives.</p>

<h3>Architecture</h3>
${D({ w: 760, h: 230, title: 'MCP roles',
  groups: [{ x: 10, y: 20, w: 330, h: 200, label: 'HOST (Claude Code, your SDK app)', kind: 'soft' }],
  nodes: [
    { id: 'llm', x: 30, y: 50, w: 140, h: 50, label: 'Agent + model', sub: 'decides tool calls', kind: 'agent' },
    { id: 'c1', x: 190, y: 50, w: 130, h: 50, label: 'MCP client 1', sub: 'one per server', kind: 'tool' },
    { id: 'c2', x: 190, y: 150, w: 130, h: 50, label: 'MCP client 2', sub: 'one per server', kind: 'tool' },
    { id: 's1', x: 420, y: 50, w: 170, h: 50, label: 'Local server', sub: 'stdio subprocess', kind: 'store' },
    { id: 's2', x: 420, y: 150, w: 170, h: 50, label: 'Remote server', sub: 'Streamable HTTP', kind: 'store' },
    { id: 'sys', x: 620, y: 100, w: 130, h: 50, label: 'Jira, DB, APIs', sub: 'real systems', kind: 'human' }
  ],
  edges: [{ from: 'llm', to: 'c1' }, { from: 'llm', to: 'c2' }, { from: 'c1', to: 's1', label: 'JSON-RPC', both: true }, { from: 'c2', to: 's2', label: 'JSON-RPC', both: true }, { from: 's1', to: 'sys' }, { from: 's2', to: 'sys' }],
  caption: 'The host is the LLM application. It runs one MCP client per server connection. Servers expose capabilities and talk to the real systems. All messages are JSON-RPC 2.0.' })}

<h3>Primitives: who controls what</h3>
${H.table(['Primitive', 'Side', 'Controlled by', 'What it is'], [
  ['<b>Tools</b>', 'Server', 'Model', 'Functions the model decides to call: <code>get_customer</code>, <code>create_issue</code>'],
  ['<b>Resources</b>', 'Server', 'Application / user', 'Data and context addressed by URI (<code>docs://api/index</code>); <b>resource templates</b> (RFC 6570) such as <code>jira://issue/{key}</code>; optional subscriptions to changes'],
  ['<b>Prompts</b>', 'Server', 'User', 'Templated messages or workflows the user explicitly invokes'],
  ['<b>Elicitation</b>', 'Client', 'User', 'Server asks the user for information through the client (form or URL mode)'],
  ['<b>Sampling</b>', 'Client', 'Client, with a human in the loop', 'Server requests an LLM completion via the client instead of holding its own model key'],
  ['<b>Roots</b>', 'Client', 'Client / user', '<code>file://</code> boundaries the server may operate within']
])}
${H.table(['If you want to expose...', 'Use', 'Because'], [
  ['An action with side effects or a parameterized query (create ticket, refund, search)', '<b>Tool</b>', 'The model decides when to call it'],
  ['A content catalog: issue summaries, documentation hierarchy, database schema', '<b>Resource</b>', 'Gives the agent visibility into what exists without exploratory tool calls (2.4)'],
  ['A large document the user picks for this conversation', '<b>Resource</b>', 'Application or user attaches it as context'],
  ['A repeatable workflow the user starts ("triage this incident")', '<b>Prompt</b>', 'User-invoked template'],
  ['A missing parameter only the user knows, mid-operation', '<b>Elicitation</b>', 'Server asks through the client UI'],
  ['Server-side reasoning (summarize a log) without its own API key', '<b>Sampling</b>', 'Client keeps control and the human in the loop']
])}

<h3>Transports</h3>
${H.table(['Transport', 'How it works', 'Pick it when'], [
  ['<b>stdio</b>', 'The client launches the server as a subprocess; newline-delimited JSON-RPC over stdin/stdout', 'Local tools, per-developer servers, filesystem or CLI wrappers; no network exposure'],
  ['<b>Streamable HTTP</b>', 'Client POSTs to one endpoint; the reply is JSON or a request-scoped SSE stream', 'Shared or remote services, many users, central auth, scaling behind a load balancer']
])}
<p>The latest spec revision is <b>stateless per request</b>: each request carries the protocol version and client capabilities in <code>_meta</code>. Earlier revisions used an <code>initialize</code> handshake and a connection session; clients fall back to that for older servers. Consequence for design: do not rely on hidden connection state (see stateful handles below).</p>

<h3>Tool definition and results</h3>
<pre class="code">{
  "name": "search_issues",
  "title": "Search Jira issues",
  "description": "Full-text and JQL search over Jira issues in projects the caller can access.
    Use for questions about bugs, tickets, sprint work. Input: plain text ('login timeout')
    or JQL ('project = PAY AND status = Open'). Returns up to 20 issues: key, title, status,
    assignee, updated. Does NOT return comments; call get_issue for full detail.
    Prefer this over grepping the repo for ticket IDs.",
  "inputSchema": { "type": "object",
    "properties": { "query": { "type": "string" }, "limit": { "type": "integer" } },
    "required": ["query"] },
  "outputSchema": { "type": "object", "properties": { "issues": { "type": "array" } } },
  "annotations": { "readOnlyHint": true, "destructiveHint": false,
                   "idempotentHint": true, "openWorldHint": true }
}

// result
{ "content": [ { "type": "text", "text": "{\\"issues\\":[{\\"key\\":\\"PAY-212\\", ...}]}" } ],
  "structuredContent": { "issues": [ { "key": "PAY-212", "title": "Login timeout", "status": "Open" } ] },
  "isError": false }</pre>
<ul>
<li><b>inputSchema</b> is JSON Schema (2020-12 by default). <b>outputSchema</b> is optional; if present, <code>structuredContent</code> must conform, and you should also serialize it into a text block for older clients.</li>
<li><b>Content blocks:</b> text, image, audio, resource_link, embedded resource.</li>
<li><b>Annotations are hints</b> (read-only, destructive, idempotent, open-world). Treat them as untrusted unless the server is trusted. The Agent SDK uses <code>readOnlyHint</code> to run tools in parallel.</li>
<li>Return the tool list in a <b>deterministic order</b> (helps prompt caching); servers can notify <code>listChanged</code>.</li></ul>

<h3>Descriptions drive selection (2.1)</h3>
${H.table(['Skill', 'How', 'Why'], [
  ['Differentiate similar tools', 'State purpose, inputs, outputs, and when to use it versus the neighbor', 'Minimal descriptions make selection among similar tools unreliable'],
  ['Include formats, example queries, edge cases, boundaries', 'As in <code>search_issues</code> above: input forms, limits, what it does NOT return', 'The model can only use what the description tells it'],
  ['Remove overlap', 'Rename <code>analyze_content</code> to <code>extract_web_results</code> with a web-specific description, distinct from <code>analyze_document</code>', 'Near-identical descriptions cause misrouting'],
  ['Split generic tools', '<code>analyze_document</code> → <code>extract_data_points</code>, <code>summarize_content</code>, <code>verify_claim_against_source</code>, each with its own input/output contract', 'One vague tool invites misuse'],
  ['Beat the built-in default', 'Explain the MCP tool\'s capabilities and outputs in detail', 'Otherwise the agent prefers Grep over a more capable MCP search tool'],
  ['Audit the system prompt', 'Look for keyword-sensitive lines ("always search the docs") that create unintended tool associations', 'System prompt wording can override good descriptions']
])}

<h3>Two error channels (2.2)</h3>
${H.table(['Channel', 'Used for', 'Who sees it'], [
  ['<b>Protocol error</b> (JSON-RPC <code>error</code>)', 'Unknown tool, malformed request', 'The client/host; a bug in the integration'],
  ['<b>Tool execution error</b> (<code>isError: true</code> in the result)', 'API failure, timeout, input validation, business rule, permission', '<b>The model</b>, so it can self-correct, retry or explain']
])}
<pre class="code">{ "isError": true,
  "content": [ { "type": "text", "text": "{
    \\"errorCategory\\": \\"business\\",
    \\"isRetryable\\": false,
    \\"message\\": \\"Refund exceeds the 30-day return window (delivered 2026-08-14).\\",
    \\"customerMessage\\": \\"This order is past the 30-day return window, so I can't refund it directly. I can pass it to a specialist.\\"
  }" } ] }</pre>
${H.table(['errorCategory', 'Example', 'isRetryable', 'Agent should'], [
  ['<code>transient</code>', 'Timeout, service unavailable', 'true', 'Retry with backoff (locally, inside the subagent)'],
  ['<code>validation</code>', 'Bad order ID format', 'false as-is', 'Fix the input and call again'],
  ['<code>business</code>', 'Policy violation, return window passed', 'false', 'Explain with the customer-friendly message; escalate if needed'],
  ['<code>permission</code>', 'Caller lacks access', 'false', 'Stop; escalate or ask for authorization']
])}
<ul>
<li>A uniform "Operation failed" hides the category, so the agent cannot choose between retry, fix, explain and escalate, and wastes retries on non-retryable errors.</li>
<li><b>Empty is not failure.</b> "No orders match" is a successful query with zero results (<code>isError: false</code>, empty list). A timeout is an access failure (<code>isError: true</code>, transient). Conflating them makes the agent conclude "customer has no orders" from an outage.</li>
<li>Subagents handle transient errors locally and propagate to the coordinator only what they cannot resolve, with partial results and what was attempted.</li></ul>

<h3>Stateful tools without sessions</h3>
<p>There is no protocol-level session to hang state on. Return an explicit handle (<code>basket_id</code>, <code>draft_id</code>) and accept it on later calls; validate authorization on every call; state the handle's lifetime in the description; return a tool execution error when a handle has expired.</p>

<h3>Configuring MCP in Claude Code (2.4)</h3>
${H.table(['Scope', 'Stored in', 'Use for'], [
  ['<b>project</b>', '<code>.mcp.json</code> in the repo (committed)', 'Shared team tooling'],
  ['<b>user</b>', '<code>~/.claude.json</code>', 'Personal or experimental servers across all projects'],
  ['<b>local</b> (default of <code>claude mcp add</code>)', '<code>~/.claude.json</code>, this project only', 'Personal servers for one project']
])}
<pre class="code">// .mcp.json (committed; no secrets in the file)
{
  "mcpServers": {
    "issues": {
      "type": "http",
      "url": "https://mcp.example.internal/issues",
      "headers": { "Authorization": "Bearer \${ISSUES_TOKEN}" }
    },
    "inventory": {
      "command": "node",
      "args": ["./tools/mcp/inventory-server.js"],
      "env": { "DB_URL": "\${INVENTORY_DB_URL:-postgres://localhost/inventory}" }
    }
  }
}

claude mcp add --scope user scratch-notes -- node ~/mcp/notes.js   # personal, all projects</pre>
<ul>
<li><b>Env var expansion</b> (<code>\${VAR}</code>, <code>\${VAR:-default}</code>) keeps tokens out of version control; each developer sets them locally.</li>
<li><b>Same-name precedence:</b> local &gt; project &gt; user.</li>
<li><b>Discovery:</b> tools from all configured servers are discovered at connection and available simultaneously, named <code>mcp__&lt;server&gt;__&lt;tool&gt;</code> (for example <code>mcp__issues__search_issues</code>); permission rules use the same names (<code>mcp__issues__*</code>).</li>
<li><b>Context:</b> Claude Code loads tool names up front and defers schemas behind tool search, so many servers do not flood the context.</li>
<li><b>Trust:</b> project .mcp.json servers require workspace trust in interactive sessions.</li></ul>
${H.box('decision', 'Community or custom server?', 'For standard integrations (Jira, GitHub) use an existing community or vendor server: maintained, documented, no code to own. Build a custom server for team-specific workflows (your refund policy, internal catalog). You give up some control with community servers, so vet them: Anthropic does not security-audit MCP servers.')}

<h3>Security duties</h3>
${H.table(['Party', 'Must / should'], [
  ['<b>Server</b>', 'Validate all inputs; enforce access control per call; rate limit; sanitize outputs'],
  ['<b>Client / host</b>', 'Get user consent before invoking tools or exposing data; confirm sensitive operations; show tool inputs; validate results; apply timeouts; keep audit logs'],
  ['<b>You, choosing servers</b>', 'Install only trusted servers. Tool descriptions and results are text the model reads: a malicious or compromised server can plant instructions there (tool poisoning), and annotations can lie. Treat third-party descriptions, annotations and outputs as untrusted input; restrict with permission rules and sandboxing']
])}

${H.box('real', 'Real-world notes:', 'Version tool descriptions like code and evaluate changes on realistic multi-call tasks (accuracy, tool calls, tokens, errors). Log every tool call with inputs, category and latency. Keep responses lean (pagination, filtering, concise vs detailed formats) and return semantic identifiers. Put OAuth or short-lived tokens behind remote HTTP servers rather than long-lived secrets on laptops.')}
${H.box('exam', 'Exam note:', 'The exam guide calls the retry flag <code>isRetryable</code> in one place and <code>retriable: false</code> in another; both mean the same thing. It names categories transient, validation, business and permission. The MCP spec itself defines only <code>isError</code>; the category payload is the recommended convention inside the result content.')}
${H.box('trap', 'Traps:', '"Return an empty list when the API times out" (hides failure). "Throw a JSON-RPC protocol error for a policy violation" (the model never sees it; use <code>isError</code>). "Commit the token in .mcp.json" (use <code>\${VAR}</code>). "Put a personal experimental server in .mcp.json" (user scope). "Build a custom Jira server" (use the community one). "Make it a tool so the agent can list all docs" when a resource catalog removes the exploratory calls.')}

<h3>Worked scenario</h3>
<p>A dev team added a documentation MCP server. Claude keeps grepping the repo instead of calling <code>mcp__docs__search</code>, calls <code>list_pages</code> five times per question to see what exists, and retries a "page is access-restricted" failure three times. <b>Reasoning:</b> the search tool's description is one line, so Grep looks equivalent; there is no catalog, so the agent explores; the error is a generic string without category. <b>Answer:</b> rewrite the search description (what it indexes, input forms, outputs, when to prefer it over Grep); expose the documentation hierarchy as a <b>resource</b>; return <code>isError: true</code> with <code>errorCategory: "permission"</code>, <code>isRetryable: false</code> and a clear message. Keep the server in project <code>.mcp.json</code> with <code>\${DOCS_TOKEN}</code>.</p>

${H.check([
  ['An order lookup returns <code>[]</code> both when no orders exist and when the database is down. What breaks, and what is the fix?', 'The agent cannot tell a valid empty result from an access failure, so it tells customers they have no orders during outages. Return empty success for no matches, and <code>isError: true</code> with <code>errorCategory: "transient"</code>, <code>isRetryable: true</code> for the outage.'],
  ['Where do you configure a GitHub MCP server the whole team uses, and how do you handle the token?', 'Project-scoped <code>.mcp.json</code> committed to the repo, with <code>"Bearer \${GITHUB_TOKEN}"</code> expansion so each developer supplies their own token.'],
  ['Your agent makes many exploratory calls just to learn which database tables exist. Which primitive helps?', 'Expose the schema as an MCP resource (a content catalog), so the agent sees what exists without exploratory tool calls.'],
  ['<code>analyze_content</code> and <code>analyze_document</code> have near-identical descriptions and get misrouted. First fix?', 'Rename and re-describe to remove overlap, for example <code>extract_web_results</code> with a web-specific description; split generic tools into purpose-specific ones with clear contracts.'],
  ['A local stdio server works for you but a teammate\'s session never sees its tools. Likely cause?', 'You added it with <code>claude mcp add</code> at the default local (or user) scope, stored in your <code>~/.claude.json</code>. Move it to project scope (<code>.mcp.json</code>).'],
  ['A third-party server marks a delete tool <code>readOnlyHint: true</code>. Should your host trust it?', 'No. Annotations are hints and untrusted unless the server is trusted. Apply your own permission rules and confirmation for destructive operations.']
])}
${H.src([['MCP specification (latest)', 'https://modelcontextprotocol.io/specification/latest'], ['Claude Code: MCP', 'https://code.claude.com/docs/en/mcp'], ['Writing tools for agents', 'https://www.anthropic.com/engineering/writing-tools-for-agents'], ['Define tools', 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools']])}`;
    }
  });

  /* ------------------------------------------------------------------ 0.7 */
  CCAR.lessons.push({
    id: 'hb-07-prompting', track: 'handbook', part: 'P0', num: '0.7', order: 7, domain: 'ALL', objs: ['X09', 'O31', 'O30', 'O29'], ts: ['4.1', '4.2', '5.1'], minutes: 30,
    title: 'Prompt engineering fundamentals for current Claude models',
    summary: 'Clear and direct instructions with motivation, XML structure, roles, few-shot examples, long-context layout, precise instruction following, explicit categorical criteria, context engineering at the right altitude, an agent system-prompt template, and a before/after rewrite.',
    body: function () {
      return `
<p>Current Claude models follow instructions precisely: they do what you say, not what you meant. That makes prompts cheaper to get right and easier to get subtly wrong. Domain 4 (20%) tests whether you reach for the right technique (explicit criteria, few-shot examples, structure) instead of vague exhortation, and Domain 5 tests how you lay out context so critical facts survive. In production, the prompt is a versioned artifact you improve with evals, not a one-off.</p>

<h3>The fundamentals</h3>
${H.table(['Technique', 'How', 'Why it works'], [
  ['<b>Clear and direct</b>', 'Write for a brilliant new employee with no context. Golden rule: if a colleague would be confused by the prompt, Claude will be too', 'Claude has no implicit knowledge of your norms, audience or goal'],
  ['<b>Context and motivation</b>', '"Keep answers under 3 sentences because they are read aloud on a phone line"', 'Knowing why lets Claude generalize to cases the rule did not list'],
  ['<b>Sequential steps</b>', 'Numbered list when order matters', 'Removes ambiguity about sequence'],
  ['<b>XML structure</b>', 'Separate <code>&lt;instructions&gt;</code>, <code>&lt;context&gt;</code>, <code>&lt;examples&gt;</code>, <code>&lt;input&gt;</code>; refer to tags by name', 'Prevents instructions and data from blending; easy to parse outputs'],
  ['<b>Role</b>', 'Set a role in the system prompt ("You are a senior payments engineer reviewing...")', 'Focuses expertise, tone and priorities'],
  ['<b>Say what to do</b>', '"Write in flowing prose paragraphs" instead of "Do not use markdown"', 'Positive instructions are followed more reliably; match prompt style to desired output'],
  ['<b>Implement vs suggest</b>', '"Change this function to..." rather than "Can you suggest changes?"', 'Precise followers take "suggest" literally and only suggest']
])}
${H.box('rule', 'Dial back the shouting.', 'Older prompts used "CRITICAL: you MUST always use the search tool". Current models respond strongly to system prompts, so aggressive language now causes <b>overtriggering</b> (the tool gets used when it should not). Use a calm, normal instruction with the reason, and save emphasis for the rare rule that really needs it.')}

<h3>Examples (few-shot) (4.2)</h3>
<p>When detailed instructions still produce inconsistent output, examples are the most effective fix. They show format, and they show judgment on ambiguous cases, which lets Claude generalize to patterns you never listed.</p>
${H.table(['Guideline', 'Detail'], [
  ['Relevant', 'Mirror real inputs, including messy ones'],
  ['Diverse', 'Cover different cases so Claude does not copy one surface pattern'],
  ['Tagged', 'Wrap in <code>&lt;example&gt;</code> inside <code>&lt;examples&gt;</code>'],
  ['2–4 targeted examples for ambiguity', 'Pick the cases where plausible alternatives exist, and <b>show the reasoning</b> for why one action beat the others'],
  ['Show reasoning with thinking', 'Few-shot works with adaptive thinking; examples can include the reasoning pattern']
])}
${H.table(['Exam use of few-shot', 'Example content'], [
  ['Consistent, actionable review output', 'Each finding as location, issue, severity, suggested fix'],
  ['Fewer false positives', 'An acceptable pattern that looks suspicious vs a genuine issue, with why'],
  ['Ambiguous tool selection', 'A request that could go to two tools, with the reasoning for the choice'],
  ['Branch-level test coverage gaps', 'A function where line coverage is full but a branch is untested'],
  ['Extraction across varied formats', 'Inline citations vs bibliography; methodology section vs details embedded in text; informal measurements ("about two cups")'],
  ['Empty or null required fields', 'An example where the value exists but in an unusual place, and one where it is truly absent (null, not invented)']
])}
<pre class="code">&lt;examples&gt;
  &lt;example&gt;
    &lt;request&gt;Customer: "I was charged twice for order 4417"&lt;/request&gt;
    &lt;reasoning&gt;Mentions an order, but the problem is a duplicate charge, not delivery.
      lookup_order shows status only; get_billing_history shows charges.&lt;/reasoning&gt;
    &lt;action&gt;get_billing_history(customer_id)&lt;/action&gt;
  &lt;/example&gt;
  &lt;example&gt;
    &lt;request&gt;Customer: "Order 4417 still hasn't arrived"&lt;/request&gt;
    &lt;reasoning&gt;Delivery status question; charges are irrelevant.&lt;/reasoning&gt;
    &lt;action&gt;lookup_order(order_id="4417")&lt;/action&gt;
  &lt;/example&gt;
&lt;/examples&gt;</pre>

<h3>Explicit categorical criteria beat "be conservative" (4.1)</h3>
${H.table(['Vague (fails)', 'Explicit (works)'], [
  ['"Check that comments are accurate"', '"Flag a comment only when its claimed behavior contradicts what the code actually does"'],
  ['"Be conservative" / "only report high-confidence findings"', '"Report: bugs that change behavior, security issues (injection, authz bypass, secrets). Skip: minor style, naming, patterns used consistently in this repo"'],
  ['"Rate severity"', 'Severity levels each defined with a concrete code example (critical: SQL built from request input; low: unused import)']
])}
<ul>
<li>Confidence-based filtering does not raise precision; categorical report/skip criteria do.</li>
<li>False positives cost trust across <b>all</b> categories: developers who see noisy style findings start ignoring accurate security findings. <b>Temporarily disable</b> a high-false-positive category to restore trust while you improve its criteria.</li>
<li>Persistent project context (conventions, accepted patterns, explicit exclusions in CLAUDE.md or the system prompt) reduces false positives in every run.</li></ul>

<h3>Long context: layout matters (5.1)</h3>
${D({ w: 760, h: 200, title: 'Long-context prompt layout',
  nodes: [
    { id: 'd', x: 20, y: 40, w: 240, h: 120, label: 'Documents at the TOP', sub: '<document> + source metadata', kind: 'store' },
    { id: 'k', x: 290, y: 40, w: 180, h: 50, label: 'Key findings summary', sub: 'first in aggregated input', kind: 'good' },
    { id: 'i', x: 290, y: 110, w: 180, h: 50, label: 'Instructions', sub: 'criteria, output contract', kind: 'agent' },
    { id: 'q', x: 500, y: 40, w: 240, h: 120, label: 'Query at the END', sub: 'quote relevant parts first', kind: 'human' }
  ],
  edges: [{ from: 'd', to: 'k' }, { from: 'k', to: 'i' }, { from: 'i', to: 'q' }],
  caption: 'For 20k+ token inputs, long documents go first and the question last. Models process the start and end of long inputs most reliably ("lost in the middle"), so key findings go at the beginning and details sit under explicit section headers.' })}
<pre class="code">&lt;documents&gt;
  &lt;document index="1"&gt;
    &lt;source&gt;Q3-earnings.pdf, p. 4 (published 2026-07-30)&lt;/source&gt;
    &lt;document_content&gt;...&lt;/document_content&gt;
  &lt;/document&gt;
  &lt;document index="2"&gt; ... &lt;/document&gt;
&lt;/documents&gt;

First, quote the passages relevant to the question in &lt;quotes&gt; tags with their document index.
Then answer in &lt;answer&gt; tags using only the quoted passages. If sources conflict, report both.

Question: How did gross margin change quarter over quarter?</pre>
${H.table(['5.1 skill', 'How'], [
  ['Preserve transactional facts', 'A persistent "case facts" block (amounts, dates, order IDs, statuses, what the customer expects) in every prompt, outside summarized history; progressive summarization turns "$247.50 on 2026-09-12" into "a recent charge"'],
  ['Multi-issue sessions', 'A separate structured layer per issue (order ID, amount, status)'],
  ['Trim verbose tool output', 'Keep the 5 relevant fields of a 40-field order record before it enters context (a PostToolUse hook can do this)'],
  ['Mitigate position effects', 'Key findings summary first; detailed results under explicit headers'],
  ['Carry metadata downstream', 'Subagents return dates, source locations and methodological context in structured output'],
  ['Respect downstream limits', 'Upstream agents return key facts, citations and relevance scores, not verbose reasoning chains'],
  ['Coherence', 'Send the complete conversation history each request; the API is stateless']
])}

<h3>Thinking and self-checks</h3>
<ul>
<li>Prefer general guidance ("think thoroughly about edge cases before answering") over a hand-written reasoning script; Claude's own approach is usually better than a prescribed one.</li>
<li>Ask for a self-check against explicit criteria before finishing ("verify each total equals the sum of its line items"). Opus 5 models tend to over-verify, so test whether the extra check pays off.</li>
<li>Effort, not prompt text, is the main lever on how much Claude thinks (0.1).</li></ul>

<h3>Context engineering: the right altitude</h3>
<div class="spectrum"><div class="sp bad"><b>Too low:</b> brittle if-else logic hard-coded in the prompt ("if the customer says X and Y then do Z"). Breaks on the first unlisted case; grows forever.</div><div class="sp good"><b>Right altitude:</b> specific enough to guide behavior, flexible enough to leave room for judgment: clear principles, priorities, criteria, and a few canonical examples.</div><div class="sp bad"><b>Too high:</b> vague guidance ("be helpful, use good judgment") that assumes shared context Claude does not have.</div></div>
<p>The system prompt also shapes tool selection. A line such as "always check the knowledge base first" can pull Claude toward one tool even when another fits; review keyword-sensitive instructions whenever routing looks wrong (2.1). Context is a finite attention budget: aim for the smallest set of high-signal tokens.</p>

<h3>Anatomy of an agent system prompt</h3>
<pre class="code">&lt;role&gt;You are the refunds agent for Acme's customer support.&lt;/role&gt;

&lt;background&gt;Customers reach you by chat. Orders ship from 3 warehouses. Refunds post in 3-5 days.
Why this matters: incorrect refunds are unrecoverable costs; slow refunds drive churn.&lt;/background&gt;

&lt;instructions&gt;
1. Identify the customer with get_customer before discussing any account detail.
2. Look up each order the customer mentions; handle several issues one by one, then summarize.
3. Resolve within policy (see &lt;policy&gt;). Implement the resolution; do not just propose it.
&lt;/instructions&gt;

&lt;tool_guidance&gt;lookup_order: delivery and return eligibility. get_billing_history: charges and
duplicates. Prefer one call per order; results include only the fields you need.&lt;/tool_guidance&gt;

&lt;output_contract&gt;Reply in 2-4 plain sentences. State amounts and dates exactly.&lt;/output_contract&gt;

&lt;escalation&gt;Escalate with escalate_to_human when: the customer asks for a person; policy does not
cover the case; the refund exceeds $500. Include customer ID, root cause, amount, recommended action.
&lt;/escalation&gt;

&lt;examples&gt; 2-4 ambiguous cases with reasoning &lt;/examples&gt;</pre>
<p class="small muted">The $500 rule is also enforced by a PreToolUse hook (0.4); the prompt explains it so Claude plans around it instead of hitting the block.</p>

<h3>Before and after</h3>
<div class="two"><div>
<h4 class="bad-h">Before</h4>
<pre class="code">You are a code reviewer. Review this PR.
Be conservative and only report important
issues. CRITICAL: You MUST NOT report
style issues!!! Don't use markdown.</pre>
</div><div>
<h4 class="good-h">After</h4>
<pre class="code">You review pull requests for a payments service;
developers act on every finding, so false
positives waste their time.

Report: behavior-changing bugs, security issues
(injection, authz bypass, secrets), data loss.
Skip: naming, formatting, patterns used
consistently in this repo.

Severity: critical = exploitable or corrupts money
(e.g. amount parsed as float); high = wrong result
on a common path; low = edge case.

For each finding give location, issue, severity,
suggested fix, as plain-text lines.
&lt;examples&gt;...2-3 findings incl. one skipped
pattern and why...&lt;/examples&gt;</pre>
</div></div>
<p>The rewrite adds motivation, replaces "be conservative" with categorical report/skip criteria, defines severity with concrete examples, states the format positively, and adds few-shot examples, including one that shows an acceptable pattern.</p>

${H.table(['Situation', 'Choose', 'Because', 'You give up'], [
  ['Output format varies run to run', 'Few-shot examples of the exact format', 'Most effective for consistency', 'Tokens per request (cache them)'],
  ['Too many false positives', 'Explicit report/skip criteria + examples of acceptable patterns', 'Categorical boundaries raise precision', 'Some recall in skipped categories'],
  ['A rule must hold every time', 'Hook, gate or schema, plus a prompt explanation', 'Prompts are probabilistic', 'Engineering effort'],
  ['Long documents + question', 'Docs top, query end, quote first', 'Position effects and grounding', 'Slightly longer outputs'],
  ['Unlisted cases keep breaking', 'Principles and reasons instead of more if-else rules', 'Generalization', 'Less literal control']
])}
${H.box('real', 'Real-world notes:', 'Keep prompts in version control, test every change against an eval set (20–50 tasks from real failures is enough to start, with should and should-not cases), and read transcripts rather than only scores. Put stable instructions and examples first so they are cached. When a prompt grows a new rule for every incident, step back to principles.')}
${H.box('exam', 'Exam note:', 'The guide treats prefill as a weaker structured-output option; on Claude 4.6 and later, prefilling the last assistant turn is not supported (400). Use structured outputs or tool schemas instead.')}
${H.box('trap', 'Traps:', '"Tell it to be conservative / only high-confidence" (does not raise precision). "Add MUST in capitals" (overtriggering, still probabilistic). "Put the question before a 100-page document" (worse recall). "One example for a nuanced judgment" (Claude copies it; use 2–4 diverse ones with reasoning). "Summarize the conversation to save tokens" without a case-facts block (loses amounts and dates). "Ask Claude to suggest changes" when you want them made.')}

<h3>Worked scenario</h3>
<p>An automated reviewer flags 40 issues per PR; developers ignore it, including its real SQL-injection findings. The prompt says "be thorough but conservative". <b>Reasoning:</b> precision is the problem, and vague confidence language does not fix it; the noise comes mostly from style and "comment accuracy" findings. <b>Answer:</b> temporarily disable the high-false-positive categories; rewrite criteria as report/skip categories ("flag a comment only when it contradicts the code's behavior"); define severity with a code example per level; add 2–4 examples including an accepted repo pattern that must not be flagged; measure precision per category on a labeled set before re-enabling.</p>

${H.check([
  ['Your extraction prompt says "extract the dosage" and returns null for documents that write "take two tablets twice daily". Best fix?', 'Add few-shot examples showing correct extraction from varied formats (informal and embedded values) and an example of a truly absent value returned as null. Instructions alone did not convey the pattern.'],
  ['Why does "CRITICAL: ALWAYS call search_kb" hurt a current model?', 'Current models follow system prompts closely; aggressive wording causes overtriggering, so search_kb is used when another tool fits. State the rule calmly with its reason.'],
  ['A 60-page contract and a question: in what order do you put them, and what else improves accuracy?', 'Contract at the top in document tags with source metadata, question at the end; ask Claude to quote the relevant clauses first and answer from the quotes.'],
  ['After 30 turns, a support agent refers to "your recent refund" instead of "$247.50 refunded on 12 September". Why and fix?', 'Progressive summarization compressed exact values. Keep a persistent case-facts block with amounts, dates, IDs and statuses in every prompt, outside the summarized history.'],
  ['You want Claude to rewrite a function, but it only lists ideas. What changed in your prompt design?', 'Nothing is broken: you asked it to "suggest". Current models follow instructions precisely; say "rewrite the function to..." to get the implementation.'],
  ['When is a longer list of if-else rules in the prompt the wrong fix?', 'When unlisted cases keep failing. That prompt is at too low an altitude; replace rules with principles, reasons and a few canonical examples so Claude can generalize.']
])}
${H.src([['Prompting best practices', 'https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices'], ['Effective context engineering for AI agents', 'https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents'], ['Demystifying evals for AI agents', 'https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents']])}`;
    }
  });
})();
