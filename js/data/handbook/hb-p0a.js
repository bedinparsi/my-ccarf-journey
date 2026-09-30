/* Architect Handbook · Part 0 (a): orientation, Claude API & models, cost/latency levers, tool-use mechanics. */
(function () {
  var H = CCAR.hb, D = H.D;

  /* ------------------------------------------------------------------ 0.0 */
  CCAR.lessons.push({
    id: 'hb-00-roadmap', track: 'handbook', part: 'P0', num: '0.0', order: 0, domain: 'ALL', objs: [], ts: [], minutes: 20,
    title: 'How to use this handbook: the stack, the principles, and the coverage map',
    summary: 'A mental model of the whole Claude platform, the eight principles behind almost every correct answer, and a map from every exam task statement to the chapters that teach it.',
    body: function () {
      var rows = CCAR.TASK_STATEMENTS.map(function (t) {
        var hb = CCAR.handbookLessons().filter(function (l) { return (l.ts || []).indexOf(t.id) >= 0; });
        var rt = CCAR.retakeLessons().filter(function (l) { return CCAR.lessonTS(l).indexOf(t.id) >= 0; });
        var link = function (l) { return '<a href="#/lesson/' + l.id + '">' + (l.num ? l.num + ' ' : '') + CCAR.ui.esc(l.title) + '</a>'; };
        return [t.id, CCAR.ui.esc(t.t), hb.length ? hb.map(link).join('<br>') : '<span class="muted">—</span>', rt.length ? rt.map(link).join('<br>') : '<span class="muted">—</span>'];
      });
      return `
<p>This handbook is the complete study path for the <b>Claude Certified Architect – Foundations</b> exam and for the architecture work behind it. It covers every task statement in the official exam guide (v1.0), the platform fundamentals those task statements assume, the six exam scenarios as reference architectures, and the design trade-offs you face in production. The shorter <a href="#/study/retake">Retake focus lessons</a> stay as they are; this handbook goes deeper and also covers the areas you already scored well on.</p>

<h3>How each chapter is built</h3>
<ol class="steps">
<li><b>What it is and why it matters</b>: the concept in plain terms, and what the exam is actually probing.</li>
<li><b>Mechanics</b>: tables, diagrams, config and code you can recognize on sight.</li>
<li><b>Design decisions</b>: when to use what, and what you give up.</li>
<li><b>Real-world notes</b> (blue) and <b>exam vs current docs</b> notes (purple) where the exam guide and today's documentation differ.</li>
<li><b>Traps</b> (red): the distractor patterns the exam uses.</li>
<li><b>Check yourself</b>: short questions with hidden answers. Answer out loud before you open them.</li></ol>

<h3>The stack in one picture</h3>
${D({ w: 760, h: 330, title: 'Claude platform layers',
  groups: [{ x: 10, y: 10, w: 740, h: 70, label: 'YOUR APPLICATION / TEAM WORKFLOW', kind: 'soft' }, { x: 10, y: 250, w: 740, h: 70, label: 'MODEL', kind: 'hard' }],
  nodes: [
    { id: 'app', x: 30, y: 32, w: 200, h: 40, label: 'Support bot, pipeline, CI job', kind: 'human' },
    { id: 'dev', x: 520, y: 32, w: 210, h: 40, label: 'Developers in a terminal / IDE', kind: 'human' },
    { id: 'csdk', x: 30, y: 110, w: 200, h: 56, label: 'Client SDK', sub: 'you write the loop (or Tool Runner)', kind: 'tool' },
    { id: 'asdk', x: 280, y: 110, w: 200, h: 56, label: 'Agent SDK', sub: 'Claude Code harness as a library', kind: 'agent' },
    { id: 'cc', x: 530, y: 110, w: 200, h: 56, label: 'Claude Code', sub: 'CLI · IDE · -p in CI', kind: 'agent' },
    { id: 'mcp', x: 280, y: 190, w: 200, h: 44, label: 'MCP servers', sub: 'tools · resources · prompts', kind: 'store' },
    { id: 'api', x: 240, y: 268, w: 280, h: 44, label: 'Claude API (Messages, Batches)', sub: 'Opus 5.5 · Sonnet 5.5 · Haiku 4.5 · Fable 5.1', kind: 'good' }
  ],
  edges: [{ from: 'app', to: 'csdk' }, { from: 'app', to: 'asdk' }, { from: 'dev', to: 'cc' }, { from: 'csdk', to: 'api' }, { from: 'asdk', to: 'api' }, { from: 'cc', to: 'api' }, { from: 'asdk', to: 'mcp' }, { from: 'cc', to: 'mcp' }],
  caption: 'The Agent SDK and Claude Code share one harness: the same agent loop, built-in tools, permissions, sessions, hooks, subagents, skills and CLAUDE.md loading. The Client SDK is the raw API, where you own the loop. MCP is the protocol that plugs external systems into either harness.' })}

${H.table(['Layer', 'You choose it when', 'You own'], [
  ['Claude API + Client SDK', 'You need full control of every request: extraction pipelines, classification, custom loops, batch jobs', 'The loop, tool execution, retries, context management, caching strategy'],
  ['Agent SDK', 'You are building an agent product (support agent, research system, dev tool) and want Claude Code\'s loop, tools, permissions, sessions and hooks in your own process', 'Configuration: tools, agents, hooks, permission mode, budgets, session storage'],
  ['Claude Code', 'Humans develop with Claude interactively, or a pipeline runs <code>claude -p</code>', 'CLAUDE.md, rules, skills, hooks, settings, MCP config in the repo'],
  ['MCP', 'An external system (Jira, a database, your order API) must be usable by agents', 'Server: tool/resource design, errors, auth, security']
])}

<h3>Eight principles behind most correct answers</h3>
${H.table(['#', 'Principle', 'What it looks like in a question'], [
  ['1', '<b>Deterministic beats probabilistic when it must always hold.</b> Prompts, CLAUDE.md and few-shot examples are guidance. Hooks, prerequisite gates, permission rules and schemas are enforcement.', '"Must never", "financial", "compliance", "guarantee"'],
  ['2', '<b>Context is a finite attention budget.</b> Curate the smallest set of high-signal tokens; isolate verbose work in subagents; persist facts outside the conversation.', 'Long sessions, "typical patterns", missed middle findings, 40-field tool results'],
  ['3', '<b>Least privilege.</b> Each agent gets only the tools and scopes its role needs, plus narrowly scoped cross-role tools for frequent needs.', '18 tools, synthesis agent web-searching, read-only reviewer that edits'],
  ['4', '<b>Fix the layer the evidence points to.</b> Logs and traces in the stem name the root cause.', 'Coordinator decomposed badly but options blame subagents'],
  ['5', '<b>Structure at every boundary.</b> Agent-to-agent, agent-to-human and agent-to-system handoffs use structured data with metadata, not prose.', 'Handoffs to humans, synthesis inputs, CI output for PR comments'],
  ['6', '<b>Proportionate first step.</b> Fix descriptions, criteria and examples before building classifiers, routers or new infrastructure.', '"Most effective first step"'],
  ['7', '<b>Never hide uncertainty or failure.</b> Keep conflicts with attribution, annotate coverage gaps, distinguish empty results from errors.', 'Conflicting statistics, timeouts returned as success'],
  ['8', '<b>Measure by segment, not aggregate.</b> 97% overall can hide a 79% field. Calibrate with labeled data and keep sampling.', 'Reducing human review, automation decisions']
])}

<h3>Exam scope vs real-work depth</h3>
<p>The exam guide's appendix lists what is tested and what is not. This handbook covers both, because production work needs both, but spend exam-prep time accordingly. Sections that go beyond exam scope are marked with a blue <b>Real-world</b> callout or a "beyond exam scope" note.</p>
<div class="two"><div>
<h4 class="good-h">Explicitly in scope</h4>
<ul class="small">
<li>Agentic loop control via stop_reason, tool results, termination (1.1)</li>
<li>Coordinator-subagent orchestration, decomposition, parallel subagents, refinement loops (1.2, 1.3, 1.6)</li>
<li>Explicit context passing, state persistence, crash recovery with manifests (1.3, 1.7, 5.4)</li>
<li>Tool descriptions, splitting vs consolidating, naming (2.1)</li>
<li>MCP resources vs tools, server scopes, env var expansion, multi-server access (2.4)</li>
<li>Structured errors: transient / business / permission, local recovery (2.2, 5.3)</li>
<li>Escalation criteria, honoring customer preferences, policy gaps (5.2)</li>
<li>CLAUDE.md hierarchy, @import, .claude/rules/ globs (3.1, 3.3)</li>
<li>Commands and skills: scope, context: fork, allowed-tools, argument-hint (3.2)</li>
<li>Plan mode vs direct execution (3.4); iterative refinement (3.5)</li>
<li>Structured output via tool_use, tool_choice, nullable fields (4.3)</li>
<li>Few-shot prompting (4.2); batch processing (4.5)</li>
<li>Context optimization: trimming, fact extraction, position-aware ordering (5.1)</li>
<li>Human review: calibration, stratified sampling, segmentation (5.5)</li>
<li>Provenance: claim-source maps, temporal data, conflicts, coverage gaps (5.6)</li></ul>
</div><div>
<h4 class="bad-h">Out of scope for the exam</h4>
<ul class="small">
<li>Fine-tuning or training models; model internals, RLHF, Constitutional AI</li>
<li>API authentication, billing, account management; OAuth, key rotation</li>
<li>Deploying or hosting MCP servers (infrastructure, networking, containers)</li>
<li>Embeddings and vector database details</li>
<li>Computer use; vision/image analysis</li>
<li><b>Streaming / server-sent events</b> implementation</li>
<li><b>Rate limiting, quotas, API pricing calculations</b></li>
<li>Cloud provider configurations (AWS, GCP, Azure)</li>
<li>Benchmarking and model comparison metrics</li>
<li><b>Prompt caching implementation details</b> (beyond knowing it exists)</li>
<li>Token counting and tokenization specifics</li></ul>
<p class="small">Chapters 0.1 and 0.2 include some of these (pricing, caching, streaming) for real-world architecture. Know them for work; do not over-study them for the exam.</p>
</div></div>

<h3>Exam guide vs current docs: know both names</h3>
<p>The exam guide was written against a snapshot of the platform. The docs have moved on in places. Answer the exam in its own terms, and build real systems with the current behavior. Each chapter flags these where they matter; the full list is in chapter 8.2.</p>
${H.table(['Topic', 'Exam guide says', 'Current docs'], [
  ['Spawning subagents', '<b>Task</b> tool; coordinator\'s <code>allowedTools</code> must include "Task"', '<b>Agent</b> tool (renamed from Task)'],
  ['Verify loaded memory', '<code>/memory</code>', '<code>/memory</code> lists/opens memory files; <code>/context</code> shows what is loaded'],
  ['Forcing a tool call', '<code>tool_choice: "any"</code> or <code>{"type":"tool","name":…}</code>', 'Still valid on Haiku 4.5 and older models. <b>Opus 5.5, Sonnet 5.5 and Fable 5.1 return 400</b> for any/tool; use <code>auto</code> with strict tool use, or structured outputs'],
  ['Structured output via prefill', 'Listed among weaker options', 'Prefilling the last assistant turn returns 400 on Claude 4.6 and later'],
  ['Skill <code>allowed-tools</code>', 'Restricts tools during the skill', 'Pre-approves tools; <code>disallowed-tools</code> removes them'],
  ['Forking', '<code>fork_session</code>', '<code>--fork-session</code> (CLI), <code>forkSession</code> / <code>fork_session</code> (SDK)']
])}

<h3>Coverage map: every task statement → chapters</h3>
<p class="small muted">Generated from the chapters themselves, so it stays accurate as content grows.</p>
${H.table(['TS', 'Task statement', 'Handbook chapters', 'Retake lessons'], rows, 'cov-tbl')}

<h3>Suggested schedule</h3>
<ul>
<li><b>Week 1:</b> Part 0 (foundations) and Part 1 (D1, the heaviest domain at 27%).</li>
<li><b>Week 2:</b> Parts 2–5. After each part, run the chapter drills.</li>
<li><b>Week 3:</b> Part 6 playbooks and Part 7 casebook, then two timed practice exams.</li>
<li><b>Final days:</b> Part 8 reference sheets, missed-question drills, and the retake focus lessons for your 0% objectives.</li></ul>
${H.src([['CCAR-F Exam Guide v1.0 (docs/_ref/exam-guide.txt)', '#/study'], ['Agent SDK overview', 'https://code.claude.com/docs/en/agent-sdk/overview'], ['Models overview', 'https://platform.claude.com/docs/en/about-claude/models/overview']])}`;
    }
  });

  /* ------------------------------------------------------------------ 0.1 */
  CCAR.lessons.push({
    id: 'hb-01-api-models', track: 'handbook', part: 'P0', num: '0.1', order: 1, domain: 'ALL', objs: ['X01'], ts: ['1.1', '5.1'], minutes: 30,
    title: 'The Claude API and the model lineup',
    summary: 'Request and response anatomy, content blocks, every stop_reason, usage accounting, streaming, errors, model selection, effort and adaptive thinking.',
    body: function () {
      return `
<p>Everything in the exam eventually becomes a Messages API call. If you can read a request and a response fluently, you can debug loops, truncation, tool calls and cost problems from a trace, which is exactly what many exam stems give you.</p>

<h3>The API is stateless</h3>
<p>The model keeps no memory between calls. <b>Every request carries the full conversation</b> you want Claude to see: system prompt, tool definitions and the <code>messages</code> array. "Memory" in any agent is something your code (or the harness) re-sends or re-loads. This is why the exam guide stresses passing complete conversation history for coherence, and why context grows with every turn.</p>

<h3>Request anatomy</h3>
<pre class="code">POST /v1/messages
{
  "model": "claude-opus-5-5",            // pick a model ID or alias from the Models overview
  "max_tokens": 4096,                     // hard ceiling on OUTPUT tokens for this call
  "system": "You are the refunds agent for Acme…",   // role, rules, output contract
  "tools": [ { "name": "lookup_order", "description": "…", "input_schema": { … } } ],
  "tool_choice": { "type": "auto" },      // auto | any | tool | none (see 0.3)
  "output_config": { "effort": "medium" },// reasoning effort; also holds "format" for JSON outputs
  "messages": [
    { "role": "user", "content": "Where is order 4417?" }
  ]
}</pre>
<p class="small muted">Model IDs are illustrative; copy real IDs from the Models overview page. Aliases point to the latest snapshot, so pin a snapshot ID where reproducibility matters.</p>

${H.table(['Field', 'What it controls', 'Architect note'], [
  ['<code>system</code>', 'Role, rules, tone, output contract, tool guidance', 'Stable across turns, so it is the first thing to prompt-cache. Keyword-heavy lines here can override good tool descriptions (2.1).'],
  ['<code>messages</code>', 'Alternating <code>user</code> / <code>assistant</code> turns made of content blocks', 'Tool results travel in <code>user</code> turns. You append the assistant turn and the tool results every iteration.'],
  ['<code>max_tokens</code>', 'Maximum output tokens this call may generate', 'Hitting it gives <code>stop_reason: "max_tokens"</code> and truncated output (4.3, 4.6 split pattern).'],
  ['<code>tools</code> / <code>tool_choice</code>', 'Which functions Claude may call and whether it must', 'Tool definitions cost tokens on every request and are part of the cache prefix.'],
  ['<code>output_config</code>', '<code>effort</code> level; <code>format</code> for JSON outputs', 'Changing effort invalidates cached message blocks.']
])}

<h3>Content blocks you will see</h3>
${H.table(['Block', 'Direction', 'Used for'], [
  ['<code>text</code>', 'both', 'Instructions, answers, commentary before a tool call'],
  ['<code>image</code>, <code>document</code> (PDF)', 'user', 'Vision and document inputs (scans, invoices, contracts)'],
  ['<code>tool_use</code> {id, name, input}', 'assistant', 'Claude asks your code to run a client tool'],
  ['<code>tool_result</code> {tool_use_id, content, is_error}', 'user', 'Your code returns the result; <code>is_error: true</code> marks a failed execution'],
  ['<code>thinking</code>', 'assistant', 'Adaptive reasoning. Not every turn has one; pass thinking blocks back unchanged in tool loops'],
  ['server tool blocks', 'assistant', 'Results of Anthropic-run tools such as web search, returned in the same response']
])}

<h3>Every stop_reason and what your code does next</h3>
${H.table(['stop_reason', 'Meaning', 'Correct handling'], [
  ['<code>"tool_use"</code>', 'Claude wants one or more client tools run', 'Execute every requested tool, append all <code>tool_result</code> blocks in <b>one</b> user message, call again'],
  ['<code>"end_turn"</code>', 'Claude finished its turn', 'Loop ends; deliver the answer'],
  ['<code>"max_tokens"</code>', 'Output ceiling reached mid-generation', 'Output is incomplete. For structured output, split the work into smaller scoped calls (4.3)'],
  ['<code>"stop_sequence"</code>', 'A custom stop sequence was produced', 'Handle as your protocol defines'],
  ['<code>"pause_turn"</code>', 'A long-running server-tool turn was paused', 'Send the paused assistant content back to let it continue'],
  ['<code>"refusal"</code>', 'Claude declined the request', 'Do not retry blindly; surface or route it']
])}
${H.box('trap', 'Loop-control traps (1.1):', 'Stopping because the response "contains text" (text often accompanies tool_use), parsing phrases like "I\'m done", or using an iteration cap as the <i>primary</i> stop condition. The stop signal is <code>stop_reason</code>. Caps (<code>maxTurns</code>, <code>maxBudgetUsd</code>) are safety rails.')}

<h3>Usage accounting</h3>
<pre class="code">"usage": {
  "input_tokens": 1840,                  // uncached input after the last cache breakpoint
  "cache_creation_input_tokens": 0,      // written to cache this call (1.25x price, 5-min TTL)
  "cache_read_input_tokens": 21500,      // served from cache (0.1x on most models)
  "output_tokens": 612
}</pre>
<p>If both cache fields are 0 on a prompt you meant to cache, it was below the model's minimum cacheable length or the prefix changed (0.2).</p>

<h3>Streaming</h3>
<p class="small muted">Beyond exam scope (streaming and pricing are listed as out of scope); included for real-world design.</p>
<p>With <code>stream: true</code> the API sends server-sent events (<code>message_start</code>, <code>content_block_start</code>, <code>content_block_delta</code>, <code>content_block_stop</code>, <code>message_delta</code>, <code>message_stop</code>). Streaming improves <b>perceived</b> latency for users; total generation time is unchanged. Batch requests cannot stream.</p>

<h3>Errors and retries</h3>
<ul>
<li><b>400 invalid_request</b>: fix the request (for example prefill on a 4.6+ model, forced tool_choice on Opus 5.5). Retrying the same request fails the same way.</li>
<li><b>429 rate limit</b>, <b>5xx / overloaded</b>: transient. Retry with exponential backoff and jitter; respect retry headers.</li>
<li>Keep an idempotency story for side effects your tools perform (refunds, tickets), because a retried turn may re-request a tool call.</li></ul>

<h3>The current model lineup (Sept 2026)</h3>
${H.table(['Model', 'Positioning', 'Price in / out per MTok', 'Context · max output', 'Thinking'], [
  ['<b>Claude Fable 5.1</b>', 'Demanding reasoning and long-horizon agentic work', '$10 / $50', '1M · 128K', 'Adaptive, always on'],
  ['<b>Claude Opus 5.5</b>', 'Recommended starting point; long-running agentic coding and knowledge work', '$4 / $20', '1M · 128K', 'Adaptive, always on'],
  ['<b>Claude Sonnet 5.5</b>', 'Best combination of speed and intelligence', '$2 / $10', '1M · 128K', 'Adaptive'],
  ['<b>Claude Haiku 4.5</b>', 'Fastest, near-frontier', '$1 / $5', '200K · 64K', 'Manual extended thinking']
])}
<p>The docs recommend starting with Opus 5.5 and moving to Fable 5.1 when your evals at higher effort still fall short. Query the Models API for <code>max_input_tokens</code>, <code>max_tokens</code> and capabilities rather than hard-coding them.</p>
${H.table(['Workload', 'Reasonable default', 'Why'], [
  ['Coordinator of a research system, complex refactor planning', 'Opus 5.5 (Fable 5.1 if evals demand)', 'Decomposition quality drives everything downstream'],
  ['Subagents doing narrow lookups, classification, routing', 'Sonnet 5.5 or Haiku 4.5, low effort', 'High volume, simple decisions, latency-sensitive'],
  ['High-volume extraction with a strict schema', 'Sonnet 5.5 or Haiku 4.5, validated on a labeled sample', 'Cost scales with documents; measure accuracy per field'],
  ['Live support agent', 'Balance latency and judgment; test Sonnet 5.5 vs Opus 5.5 on your eval set', 'First-contact resolution and escalation calibration are the metrics']
])}
${H.box('real', 'Real-world note:', 'Model choice is an eval decision, not a vibe. Keep a task suite (7.2) and re-run it on each new model; teams with evals upgrade in days, teams without them take weeks.')}

<h3>Effort and adaptive thinking</h3>
<p>Current models decide per request whether and how much to think. <code>effort</code> (<code>low</code>, <code>medium</code>, <code>high</code>, <code>xhigh</code>, <code>max</code>) is the main lever: higher effort thinks more readily and more deeply, at more tokens and latency. The default is <code>high</code> on most models and <code>medium</code> on Opus 5.5. Thinking interleaves with tool calls automatically.</p>
<ul>
<li>Do not assume every assistant turn starts with a thinking block.</li>
<li>Manual <code>budget_tokens</code> is deprecated on 4.6 and returns 400 on Claude 4.7 and later. Use effort, with <code>max_tokens</code> as the hard ceiling.</li>
<li>In the Agent SDK set <code>effort</code> per query or per subagent (for example <code>"low"</code> for a file-listing subagent).</li></ul>
${H.box('exam', 'Exam note:', 'The guide says extended thinking does not remove self-review bias (4.6). An independent instance without the generator\'s reasoning context is still the answer, whatever the effort level.')}

${H.check([
  ['Your loop stops early whenever Claude says "Let me look that up" before a tool call. What is wrong?', 'The loop treats the presence of text as completion. Text can accompany <code>tool_use</code> blocks. Continue while <code>stop_reason === "tool_use"</code> and stop on <code>"end_turn"</code>.'],
  ['A structured extraction returns invalid JSON with <code>stop_reason: "max_tokens"</code>. Is retrying the same request useful?', 'No. It is deterministic for the same request. Split the work into smaller scoped calls and merge in code (4.3 / 4.6).'],
  ['Why does a support agent "forget" the order number the customer gave 20 turns ago after you started summarizing history?', 'The API is stateless; what you re-send is all it sees. Summaries lose specifics. Keep a persistent case-facts block outside the summarized history (5.1).'],
  ['Which model would you try first for a new long-running coding agent, and how would you confirm it?', 'Opus 5.5 per the docs, confirmed on your own eval suite; move to Fable 5.1 only if evals at higher effort still fall short.']
])}
${H.src([['Models overview', 'https://platform.claude.com/docs/en/about-claude/models/overview'], ['Steering thinking / effort', 'https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking'], ['Agent SDK: agent loop', 'https://code.claude.com/docs/en/agent-sdk/agent-loop']])}`;
    }
  });

  /* ------------------------------------------------------------------ 0.2 */
  CCAR.lessons.push({
    id: 'hb-02-cost-latency', track: 'handbook', part: 'P0', num: '0.2', order: 2, domain: 'ALL', objs: ['O23'], ts: ['4.5', '5.1'], minutes: 30,
    title: 'Cost, latency and throughput levers: caching, batching, effort, model tiering',
    summary: 'The levers an architect pulls when a system is too slow or too expensive, with prompt caching mechanics, the numbers that matter and worked cost math.',
    body: function () {
      return `
<p>Most production conversations about Claude systems eventually become "it works, but it costs too much" or "it is too slow". Each lever below has a specific cost, and the wrong one can break correctness. Know which symptom each one fixes.</p>
${H.box('exam', 'Exam scope:', 'The exam tests the <b>Batch vs synchronous</b> decision (4.5) and expects you to know prompt caching exists. Caching implementation details, pricing calculations and rate limits are listed as out of scope. The caching mechanics and cost math below are for real-world design.')}

${H.table(['Lever', 'Saves', 'Costs you', 'Use when'], [
  ['<b>Prompt caching</b>', 'Up to ~90% of input cost and latency on repeated prefixes', 'Prompt must be structured stable-first; 1.25x on cache writes', 'Long system prompts, tool sets, documents, multi-turn agents'],
  ['<b>Message Batches API</b>', '50% of all tokens', 'Up to 24h latency, no SLA, no client-tool round trips mid-request', 'Overnight, weekly, backfills: nobody is waiting'],
  ['<b>Model tiering</b>', 'Large per-token savings on simple subtasks', 'Quality risk; needs evals per role', 'Subagents doing lookups, classification, formatting'],
  ['<b>Lower effort</b>', 'Thinking tokens and latency', 'Depth on hard steps', 'Routine, well-scoped steps'],
  ['<b>Trim tool outputs / context editing</b>', 'Input tokens every later turn', 'Engineering work; risk of dropping needed fields', 'Verbose tool results (40+ fields when 5 matter)'],
  ['<b>Parallelization</b>', 'Wall-clock time', 'More concurrent tokens; coordination', 'Independent subtasks (parallel Task calls, parallel tool calls)'],
  ['<b>Streaming</b>', 'Perceived latency', 'Nothing on cost', 'User-facing responses'],
  ['<b>Fewer agents</b>', 'Tokens (multi-agent ≈ 15x chat)', 'Breadth and parallelism', 'Tightly coupled tasks, simple queries']
])}

<h3>Prompt caching, precisely</h3>
${D({ w: 760, h: 170, title: 'Cache prefix hierarchy',
  nodes: [
    { id: 't', x: 20, y: 50, w: 150, h: 60, label: 'tools', sub: 'change → all invalid', kind: 'tool' },
    { id: 's', x: 200, y: 50, w: 170, h: 60, label: 'system', sub: 'change → system + msgs', kind: 'agent' },
    { id: 'm', x: 400, y: 50, w: 170, h: 60, label: 'messages', sub: 'history, documents', kind: 'store' },
    { id: 'n', x: 600, y: 50, w: 140, h: 60, label: 'new turn', sub: 'uncached', kind: 'note' }
  ],
  edges: [{ from: 't', to: 's' }, { from: 's', to: 'm' }, { from: 'm', to: 'n', dashed: true, label: 'breakpoint' }],
  caption: 'The cache key is a hash of the prefix up to a breakpoint, in the order tools → system → messages. Any change at or before the breakpoint means a miss.' })}
<ul>
<li><b>Breakpoints:</b> up to 4 explicit <code>cache_control</code> markers, or one top-level <code>cache_control</code> for automatic caching (the breakpoint moves to the last cacheable block as a conversation grows). The system looks back up to 20 blocks for a prior write.</li>
<li><b>TTL:</b> 5 minutes by default, refreshed free on every hit. A 1-hour TTL costs 2x base input to write; use it when requests arrive less often than every 5 minutes but more often than hourly.</li>
<li><b>Prices:</b> 5-minute writes 1.25x base input; reads 0.1x on most models (0.05x on Opus 5.5, 0.025x on Fable 5.1).</li>
<li><b>Minimum length:</b> 512 tokens on Opus 5.5, Sonnet 5.5 and Fable 5.1; 4,096 on Haiku 4.5. Below that, nothing is cached and no error is raised.</li>
<li><b>Invalidators:</b> tool definitions (everything), system changes (system and messages), and <code>tool_choice</code>, images, thinking configuration or effort changes (message blocks).</li>
<li><b>Parallel fan-out:</b> a cache entry exists only once the first response begins. Send one request first, then fan out, or pre-warm with <code>max_tokens: 0</code>.</li>
<li>Cache hits do not count against rate limits, so caching also raises effective throughput.</li></ul>
${H.box('trap', 'The most common caching bug:', 'A timestamp, request ID or the user\'s message inside the block that carries the breakpoint. The hash changes every request, so every call pays for a cache write and never gets a read. Put the breakpoint on the <b>last block that is identical across requests</b>.')}

<h3>Worked cost example</h3>
<p>A support agent sends a 20,000-token system prompt plus tool definitions on each of 1,000 requests per hour, on Sonnet 5.5 ($2/MTok input, $0.20/MTok cache read, $2.50/MTok 5-minute write).</p>
${H.table(['', 'Uncached', 'Cached'], [
  ['Prefix tokens per hour', '20M × $2/MTok = <b>$40.00</b>', '1 write: 20k × $2.50/MTok = $0.05; 999 reads: 19.98M × $0.20/MTok = $4.00 → <b>≈ $4.05</b>'],
  ['Effect', '', '≈ 90% lower prefix cost, lower time-to-first-token']
])}
<p class="small muted">Assumes traffic keeps the 5-minute cache warm. Output tokens and per-request user text are unchanged.</p>

<h3>Batch vs synchronous</h3>
${H.table(['Question', 'Synchronous Messages API', 'Message Batches API'], [
  ['Is someone or something blocked waiting?', 'Yes → sync', 'No → batch'],
  ['Latency guarantee', 'Interactive', 'None; most finish within 1 hour, expire at 24 hours'],
  ['Price', 'Standard', '50% of standard (stacks with caching; batch cache hits are best effort)'],
  ['Client tools mid-request', 'Yes, your loop runs them', 'No: you cannot execute your own tools mid-request and continue. Server tools do run.'],
  ['Correlation', 'Response is the reply', '<code>custom_id</code> per request; results unordered, .jsonl, kept 29 days'],
  ['Failure handling', 'Retry the call', 'Resubmit only errored or expired <code>custom_id</code>s, fixed (chunk oversized documents)']
])}
${H.box('rule', 'SLA math:', 'worst-case latency = wait for the next submission + 24h processing + retry buffer. With a 30-hour SLA, submit at least every 4 hours (4 + 24 = 28, leaving 2 hours to resubmit failures). Plan on the worst case, never on "usually finishes in an hour".')}

<h3>Model tiering inside one system</h3>
<p>Multi-agent systems let you match models to roles: a stronger coordinator that decomposes and judges, cheaper subagents for narrow retrieval. Anthropic\'s research system used an Opus lead with Sonnet subagents. Verify each role on its own eval slice; a cheap subagent that silently misses findings costs more than it saves.</p>

${H.box('real', 'Real-world note:', 'Measure before optimizing: log <code>usage</code> per call and <code>total_cost_usd</code> / <code>modelUsage</code> per Agent SDK run, broken down by agent role. The biggest waste is usually context bloat (untrimmed tool results, re-read files) rather than model price.')}
${H.box('trap', 'Traps:', '"Move the pre-merge check to batch to save 50%" (someone is blocked); "raise max_tokens to cut retries" (does not fix truncation); "use a bigger context window so we can skip trimming" (attention dilution, cost); "cache the user message" (changes every call).')}

${H.check([
  ['Your cache hit rate is 0% although <code>cache_control</code> is set on the system prompt. The system prompt starts with "Current time: 14:02:11". Fix?', 'Move the timestamp out of the cached prefix (after the breakpoint, for example into the user turn) so the cached block is identical across requests.'],
  ['A nightly job extracts 40,000 documents; the report is read at 9am. Which API?', 'Message Batches: 50% cheaper, nobody is blocked, correlate with <code>custom_id</code>, resubmit only failures. Submit early enough that 24h worst case still meets the deadline, or split into several batches.'],
  ['You fan out 30 parallel requests sharing a 50k-token prefix and see 30 cache writes. Why?', 'The cache entry is available only once the first response begins. Send one request (or a <code>max_tokens: 0</code> pre-warm) first, then fan out.'],
  ['When does a 1-hour cache TTL pay off?', 'When the same prefix is reused less often than every 5 minutes but within an hour (for example long-running subagents or users who reply slowly), or to improve rate-limit utilization.']
])}
${H.src([['Prompt caching', 'https://platform.claude.com/docs/en/build-with-claude/prompt-caching'], ['Batch processing', 'https://platform.claude.com/docs/en/build-with-claude/batch-processing'], ['Multi-agent research system', 'https://www.anthropic.com/engineering/multi-agent-research-system']])}`;
    }
  });

  /* ------------------------------------------------------------------ 0.3 */
  CCAR.lessons.push({
    id: 'hb-03-tool-mechanics', track: 'handbook', part: 'P0', num: '0.3', order: 3, domain: 'ALL', objs: ['X01', 'O27', 'O37'], ts: ['1.1', '2.3', '4.3'], minutes: 30,
    title: 'Tool use mechanics end to end',
    summary: 'Client vs server tools, the tool_use / tool_result round trip, parallel calls, is_error, strict tool use, tool_choice (and why forced choice fails on the newest models), and large tool libraries.',
    body: function () {
      return `
<p>Tools are how Claude acts. The exam assumes you know the wire format well enough to spot a broken loop or a mis-wired result, and to pick the right mechanism for guaranteeing a tool call.</p>

<h3>Where a tool runs</h3>
${H.table(['Kind', 'Examples', 'Who executes', 'What you see'], [
  ['<b>User-defined client tools</b>', '<code>lookup_order</code>, <code>process_refund</code>, your MCP tools via a harness', 'Your code', '<code>stop_reason: "tool_use"</code> and <code>tool_use</code> blocks; you return <code>tool_result</code>'],
  ['<b>Anthropic-schema client tools</b>', 'bash, text_editor, memory, computer use', 'Your code (Anthropic publishes and trains on the schema)', 'Same round trip'],
  ['<b>Server tools</b>', 'web_search, web_fetch, code_execution, tool_search, MCP connector', 'Anthropic', 'Results arrive in the same response; long turns may pause (<code>pause_turn</code>)']
])}

<h3>The round trip</h3>
${D({ w: 760, h: 210, title: 'Client tool round trip',
  nodes: [
    { id: 'a', x: 20, y: 20, w: 170, h: 56, label: 'Request 1', sub: 'tools + user message', kind: 'store' },
    { id: 'b', x: 230, y: 20, w: 200, h: 56, label: 'Response', sub: 'text? + tool_use {id, name, input}', kind: 'agent' },
    { id: 'c', x: 470, y: 20, w: 150, h: 56, label: 'Your code', sub: 'runs the tool', kind: 'tool' },
    { id: 'd', x: 230, y: 130, w: 390, h: 56, label: 'Request 2', sub: 'history + assistant turn + user turn [tool_result {tool_use_id, content, is_error}]', kind: 'store' },
    { id: 'e', x: 650, y: 130, w: 100, h: 56, label: 'Answer', sub: 'end_turn', kind: 'good' }
  ],
  edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }, { from: 'c', to: 'd' }, { from: 'd', to: 'e' }] })}
<pre class="code">// assistant turn (from the response)
{ "role": "assistant", "content": [
  { "type": "text", "text": "I'll check both orders." },
  { "type": "tool_use", "id": "toolu_01A", "name": "lookup_order", "input": { "order_id": "4417" } },
  { "type": "tool_use", "id": "toolu_01B", "name": "lookup_order", "input": { "order_id": "4420" } } ] }

// next user turn: ALL results together, tool_result blocks first
{ "role": "user", "content": [
  { "type": "tool_result", "tool_use_id": "toolu_01A", "content": "{\\"status\\":\\"shipped\\",\\"eta\\":\\"2026-10-02\\"}" },
  { "type": "tool_result", "tool_use_id": "toolu_01B", "is_error": true,
    "content": "{\\"errorCategory\\":\\"transient\\",\\"isRetryable\\":true,\\"message\\":\\"Order service timeout\\"}" } ] }</pre>
<ul>
<li>Every <code>tool_use</code> needs a matching <code>tool_result</code> (same id) in the <b>next</b> user message. Put all results for a parallel batch in <b>one</b> message; splitting them across messages teaches the model to stop parallelizing.</li>
<li><code>is_error: true</code> tells Claude the execution failed, so it can retry, change approach or explain. The content should be specific and actionable (2.2), not a stack trace.</li>
<li>Claude often writes a short text before tool calls. Your code must not treat that text as the final answer.</li></ul>

<h3>Tool definitions</h3>
<pre class="code">{
  "name": "lookup_order",                     // ^[a-zA-Z0-9_-]{1,128}$ ; namespace by service if many
  "description": "Returns status, items, ship date and return eligibility for ONE order. Use when the
    customer gives an order number (formats: 4-8 digits, or ACME-XXXXXX). Does NOT return payment
    details; use get_billing_history for charges. Returns not_found if the ID does not exist.",
  "input_schema": {
    "type": "object",
    "properties": { "order_id": { "type": "string", "description": "Order number without #" } },
    "required": ["order_id"], "additionalProperties": false },
  "input_examples": [ { "order_id": "4417" } ],   // optional, schema-validated examples
  "strict": true                                   // optional: guarantee schema-valid inputs
}</pre>
<p>The docs call the description "by far the most important factor" in tool performance: what it does, when to use it and when not, what each parameter means, and what it does not return. Aim for at least 3–4 sentences. Part 2 goes deep on tool design.</p>

<h3>tool_choice</h3>
${H.table(['Setting', 'Behavior', 'Typical use'], [
  ['<code>{"type":"auto"}</code>', 'Claude decides whether to call a tool (default when tools are present)', 'Agents; conversational turns'],
  ['<code>{"type":"any"}</code>', 'Must call some tool, its choice', 'Guarantee structured output when several extraction schemas exist (exam 4.3)'],
  ['<code>{"type":"tool","name":"X"}</code>', 'Must call X', 'Force a prerequisite step first, such as extract_metadata (exam 2.3, 4.3)'],
  ['<code>{"type":"none"}</code>', 'No tool calls (default when no tools)', 'Final summarization turn']
])}
<p>With <code>any</code> or <code>tool</code>, the API prefills the assistant turn, so there is no natural-language text before the tool_use block. Manual extended thinking cannot be combined with <code>any</code> or <code>tool</code>.</p>
${H.box('exam', 'Exam vs current docs:', 'The exam guide teaches <code>tool_choice: "any"</code> and forced tool selection as the way to guarantee a call, and that is the answer on the exam. In current docs, <b>Claude Opus 5.5, Sonnet 5.5 and Fable 5.1 return a 400 error for <code>any</code> and <code>tool</code></b>. On those models: use <code>auto</code> with <code>strict: true</code> for schema-valid inputs, structured outputs (<code>output_config.format</code>) when you need a fixed JSON shape, and programmatic control (for example expose only the prerequisite tool on the first call, or gate later tools in code). Haiku 4.5 and older models still accept forced choice.')}

<h3>Guaranteeing structure: three mechanisms</h3>
${H.table(['Mechanism', 'Guarantees', 'Does not guarantee'], [
  ['Strict tool use (<code>strict: true</code>)', 'Tool name and input match the schema', 'That Claude calls the tool at all under <code>auto</code>; semantic correctness'],
  ['JSON outputs (<code>output_config.format</code>)', 'The response text is valid JSON for your schema', 'Semantic correctness (sums, right field)'],
  ['Forced <code>tool_choice</code> (older models)', 'A tool call happens', 'Semantic correctness']
])}
<p>All three eliminate syntax errors. None stop a line-item total that does not add up or a value in the wrong field. Validate semantics in code (4.4).</p>

<h3>Parallel tool calls</h3>
<p>Current models issue independent tool calls in parallel by default (several reads, several searches). The Agent SDK runs read-only tools concurrently and state-changing tools (Edit, Write, Bash) sequentially; custom tools run sequentially unless annotated <code>readOnlyHint</code>. For subagents, the same idea applies at the orchestration level: several Task/Agent calls in one coordinator response run in parallel (1.3).</p>

<h3>Large tool libraries</h3>
<ul>
<li>Every definition costs context on every request, and more tools make selection harder (18 tools vs 4–5 is the exam\'s example).</li>
<li>Scope tools per agent (2.3). For genuinely large libraries, tool search lets Claude discover and load definitions on demand (<code>defer_loading</code>); Claude Code defers MCP tool schemas by default.</li>
<li>Consolidate related operations and namespace names by service (<code>github_list_prs</code>, <code>jira_search</code>).</li></ul>

${H.box('real', 'Real-world note:', 'If you do not need a custom loop, the client SDKs\' Tool Runner executes your tools and feeds results back for you, and the Agent SDK gives you the full Claude Code loop. Hand-written loops are for when you need control over every step.')}
${H.box('trap', 'Traps:', 'Sending each tool_result in its own message; dropping the assistant turn that contained the tool_use; returning an empty success for a timeout; "prompt harder" instead of a structural guarantee; assuming <code>strict</code> or JSON schemas catch wrong values.')}

${H.check([
  ['Claude issued three tool_use blocks. Your code returns one result per user message over three calls. What breaks?', 'The API expects all results for that assistant turn in the next user message; spreading them out breaks the pairing and discourages parallel calls. Send all three tool_result blocks together.'],
  ['On Opus 5.5 you set <code>tool_choice: {"type":"tool","name":"extract_invoice"}</code> and get HTTP 400. What do you do?', 'Use <code>auto</code> with a strict extraction tool and a clear instruction, or use JSON outputs via <code>output_config.format</code>. If a specific step must run first, enforce order in code. (On the exam, forced tool choice is still the expected answer.)'],
  ['Your extraction tool has <code>strict: true</code>, yet totals are wrong. Why?', 'Strict mode guarantees schema shape, not semantic correctness. Add calculated_total vs stated_total checks and a validation-retry loop.'],
  ['Why mark a custom read-only tool with <code>readOnlyHint</code> in the Agent SDK?', 'So the SDK can run it concurrently with other read-only calls; custom tools run sequentially by default.']
])}
${H.src([['Tool use overview', 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview'], ['Define tools (tool_choice)', 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools'], ['Structured outputs', 'https://platform.claude.com/docs/en/build-with-claude/structured-outputs']])}`;
    }
  });
})();
