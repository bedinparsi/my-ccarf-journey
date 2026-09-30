/* Architect Handbook · Part 1 (a): agentic loops, coordinator-subagent orchestration, subagent configuration, enforcement and handoffs (task statements 1.1–1.4). */
(function () {
  var H = CCAR.hb, D = H.D;

  /* ------------------------------------------------------------------ 1.1 */
  CCAR.lessons.push({
    id: 'hb-11-agentic-loop', track: 'handbook', part: 'P1', num: '1.1', order: 101, domain: 'D1',
    objs: ['X01'], ts: ['1.1'], minutes: 30,
    title: 'Agentic loops: stop_reason control flow, tool results, and model-driven decisions',
    summary: 'A complete, production-grade agent loop on the Client SDK: every stop_reason, full history appends, per-tool error handling, idempotent side effects and safety rails, plus when a fixed workflow beats an agent and what the Agent SDK does for you.',
    body: function () {
      return `
<p>An agent is a loop: send the conversation to Claude, read <code>stop_reason</code>, run the tools Claude asked for, append the results, and call again until Claude ends its turn. Every agent product you build (support bots, research systems, CI reviewers) sits on this loop, whether you write it or the Agent SDK runs it for you. The exam probes three things: that you terminate on the right signal, that tool results go back into history correctly, and that you know the difference between Claude choosing the next step and your code choosing it.</p>

<h3>The lifecycle</h3>
${D({ w: 760, h: 260, title: 'One iteration of the agentic loop',
  nodes: [
    { id: 'm', x: 20, y: 100, w: 150, h: 60, label: 'messages[]', sub: 'full history, re-sent', kind: 'store' },
    { id: 'api', x: 210, y: 100, w: 160, h: 60, label: 'messages.create', sub: 'system + tools + messages', kind: 'agent' },
    { id: 'sr', x: 410, y: 100, w: 150, h: 60, label: 'stop_reason?', sub: 'the only loop signal', kind: 'tool' },
    { id: 'run', x: 410, y: 196, w: 150, h: 50, label: 'Run every tool', sub: 'catch errors per tool', kind: 'sub' },
    { id: 'end', x: 610, y: 30, w: 130, h: 50, label: 'Deliver answer', sub: '"end_turn"', kind: 'good' },
    { id: 'oth', x: 610, y: 130, w: 130, h: 60, label: 'Other reasons', sub: 'max_tokens · refusal · pause', kind: 'note' }
  ],
  edges: [{ from: 'm', to: 'api' }, { from: 'api', to: 'sr' }, { from: 'sr', to: 'end', label: 'end_turn' }, { from: 'sr', to: 'oth' }, { from: 'sr', to: 'run', label: 'tool_use' },
    { from: 'run', to: 'm', label: 'append assistant turn + ALL tool_results', dy: 16 }],
  caption: 'The API is stateless. The only thing that carries the model\'s progress between iterations is the history you append and re-send. Iteration caps and budgets sit outside this cycle as safety rails.' })}

${H.table(['Step', 'What your code does', 'Why it matters'], [
  ['1. Request', 'Send system prompt, tool definitions and the full <code>messages</code> array', 'Claude sees nothing you do not send; the stable prefix (tools, system) is what you prompt-cache'],
  ['2. Append assistant turn', 'Push the <b>entire</b> <code>response.content</code> (text, thinking, tool_use blocks) as one <code>assistant</code> message, unchanged', 'Every <code>tool_result</code> must answer a <code>tool_use</code> id that exists in history; thinking blocks must be passed back as they came'],
  ['3. Branch on stop_reason', '<code>"tool_use"</code> → execute; <code>"end_turn"</code> → finish; anything else → its own handler', 'The model states its intent structurally; do not infer it from text'],
  ['4. Execute tools', 'Run each requested call, catching failures <b>per tool</b>', 'One failing lookup must not kill the loop or hide the other results'],
  ['5. Append results', 'One <code>user</code> message containing <b>all</b> <code>tool_result</code> blocks, each with its <code>tool_use_id</code>', 'This is how new information enters Claude\'s reasoning for the next decision'],
  ['6. Rails', 'Check turn count, spend and wall-clock limits', 'Stop runaways; they are a secondary stop, never the primary one']
])}

<h3>A complete loop (Client SDK, TypeScript)</h3>
<pre class="code">// Client SDK (TypeScript). MODEL, SYSTEM, TOOLS, REGISTRY defined elsewhere.
type LoopResult = { status: string; answer?: string; messages: MessageParam[] };

async function runAgent(userText: string, rails = { maxTurns: 25, maxUsd: 2.0, maxMs: 120_000 }): Promise&lt;LoopResult&gt; {
  const messages: MessageParam[] = [{ role: "user", content: userText }];
  const started = Date.now();
  let turns = 0, spentUsd = 0;

  while (true) {
    const res = await createWithRetry({ model: MODEL, max_tokens: 4096, system: SYSTEM, tools: TOOLS, messages });
    spentUsd += costOf(res.usage);

    // Append the FULL assistant turn: text, thinking and tool_use blocks, unmodified.
    messages.push({ role: "assistant", content: res.content });

    switch (res.stop_reason) {
      case "tool_use": {
        const calls = res.content.filter(b =&gt; b.type === "tool_use");
        const results = [];
        // Read-only calls may run concurrently; state-changing calls run one at a time, in order.
        const reads = calls.filter(c =&gt; REGISTRY[c.name]?.readOnly);
        const writes = calls.filter(c =&gt; !REGISTRY[c.name]?.readOnly);
        results.push(...await Promise.all(reads.map(runToolSafely)));
        for (const c of writes) results.push(await runToolSafely(c));
        // ALL results in ONE user message, one tool_result per tool_use id.
        messages.push({ role: "user", content: results });
        break;                                   // loop again: Claude decides the next step
      }
      case "end_turn":
        return { status: "done", answer: textOf(res.content), messages };
      case "pause_turn":
        break;                                   // server-tool turn paused: content already appended, call again to resume
      case "max_tokens":
        // Output was cut off. Never execute a truncated tool_use. Split the task or narrow the request.
        return { status: "truncated", messages };
      case "stop_sequence":
        return { status: "stop_sequence", answer: textOf(res.content), messages };
      case "refusal":
        return { status: "refused", messages };   // surface or route to a human; do not blindly retry
      default:
        throw new Error("Unhandled stop_reason: " + res.stop_reason);   // fail loudly on new values
    }

    // Safety rails: secondary stop conditions for runaways, checked after the primary signal.
    turns++;
    if (turns &gt;= rails.maxTurns) return { status: "max_turns", messages };
    if (spentUsd &gt;= rails.maxUsd) return { status: "budget_exceeded", messages };
    if (Date.now() - started &gt;= rails.maxMs) return { status: "timeout", messages };
  }
}</pre>

<h3>Per-tool error handling and idempotency</h3>
<pre class="code">async function runToolSafely(call: ToolUseBlock): Promise&lt;ToolResultBlockParam&gt; {
  const tool = REGISTRY[call.name];
  if (!tool) return errorResult(call.id, "validation", false, "Unknown tool " + call.name);
  const check = tool.validate(call.input);            // schema + business preconditions in code
  if (!check.ok) return errorResult(call.id, "validation", false, check.message);
  try {
    // Business-level idempotency key: a re-issued refund for the same order and amount is a no-op.
    const key = tool.sideEffect ? tool.idempotencyKey(call.input) : null;   // e.g. "refund:4417:42.50"
    const out = await withTimeout(tool.run(call.input, { idempotencyKey: key }), tool.timeoutMs);
    return { type: "tool_result", tool_use_id: call.id, content: JSON.stringify(tool.trim(out)) };
  } catch (e) {
    return errorResult(call.id, categorize(e), isTransient(e), customerSafeMessage(e));
  }
}

function errorResult(id, errorCategory, isRetryable, message) {
  return { type: "tool_result", tool_use_id: id, is_error: true,
           content: JSON.stringify({ errorCategory, isRetryable, message }) };
}</pre>
${H.table(['Concern', 'Rule', 'Reason'], [
  ['Tool throws or times out', 'Return <code>is_error: true</code> with category, retryability and an actionable message; keep looping', 'Claude can retry, try another tool, ask the user or explain. A crash loses the whole run; a silent empty success makes Claude state false facts'],
  ['Unknown tool or invalid input', 'Validation error result, not an exception', 'The model self-corrects on the next turn'],
  ['Transient API errors (429, 5xx) on the Claude call itself', 'Retry the request with exponential backoff and jitter inside <code>createWithRetry</code>', 'Transient; the same history is still valid'],
  ['400 from the Claude API', 'Fix the request; do not retry unchanged', 'Deterministic: same request, same error'],
  ['Side effects (refunds, tickets, emails)', 'Idempotency key derived from the business operation, plus a ledger check', 'A retried request or a re-issued tool call must not refund twice; the tool_use id changes when Claude re-issues a call, so it is not enough on its own'],
  ['Verbose results', 'Trim to the fields the task needs before appending', 'Every appended token is re-sent on every later turn']
])}
${H.box('rule', 'The two invariants:', 'every assistant turn is appended in full, and every <code>tool_use</code> gets exactly one matching <code>tool_result</code> in the very next user message, with all results for that turn together. Break either and the API rejects the request or Claude loses track of what happened.')}

<h3>Model-driven decisions vs pre-configured decision trees</h3>
<p>In an agentic loop Claude decides which tool to call next from the context it has: the user\'s request, prior tool results, errors. A pre-configured decision tree (or fixed tool sequence) is code that decides: step A, then B, then C, with branches you wrote. Anthropic\'s "Building effective agents" draws the same line: <b>workflows</b> orchestrate LLM calls and tools through predefined code paths; <b>agents</b> let the model direct its own process and tool use. Start with the simplest thing that works and add autonomy only when the task needs it.</p>
${H.table(['Choose', 'When', 'You gain', 'You give up'], [
  ['<b>Fixed workflow</b> (chain, routing, fixed fan-out)', 'Steps are known and stable; every run follows the same shape (extract → validate → store); strict latency or cost budgets; auditors want a predictable path', 'Predictability, lower cost and latency, easy testing and debugging', 'Adaptation when an input does not fit the script'],
  ['<b>Model-driven loop</b>', 'Open-ended tasks where the number and order of steps depends on what is found (debugging, research, multi-issue support)', 'Adapts to results, recovers from errors, handles novel cases', 'More tokens and latency, less predictable paths; needs evals and rails'],
  ['<b>Hybrid</b>', 'Mostly open-ended, but some ordering is non-negotiable (identity before refund)', 'Flexibility plus guarantees', 'Engineering of gates and hooks (chapter 1.4)']
])}
${H.box('decision', 'Decision rule:', 'if you can draw the flowchart and it rarely changes, write the workflow. If the next step depends on what the last tool returned, let the model drive, and enforce only the steps that must always happen in code.')}

<h3>Anti-patterns</h3>
${H.table(['Anti-pattern', 'Why it breaks', 'Correct approach'], [
  ['Stop when the response contains text', 'Claude often writes "Let me check that order" alongside a <code>tool_use</code> block; the loop exits before the tool runs', 'Branch on <code>stop_reason</code>'],
  ['Parse natural language ("I\'m done", "FINAL ANSWER:", "anything else?")', 'Phrasing varies; false positives end early, false negatives loop forever', '<code>stop_reason === "end_turn"</code>'],
  ['Iteration cap as the <b>primary</b> stop (for example always 5 turns)', 'Complex cases are cut off mid-task; simple cases waste nothing but the cap hides the real signal', 'Primary: stop_reason. Secondary: generous cap and budget that report a distinct status'],
  ['Appending only the text of the assistant turn', 'The <code>tool_result</code> refers to a <code>tool_use</code> id that is no longer in history', 'Append <code>response.content</code> unchanged'],
  ['One tool_result per user message across several calls', 'Breaks the pairing and teaches the model not to parallelize', 'All results in one user message'],
  ['Throwing on a tool error and aborting the run', 'One timeout kills a 20-step task', 'Structured <code>is_error</code> result; let Claude recover'],
  ['Returning an empty success for a failure', 'Claude reports "no charges found" when the service was down', 'Distinguish empty results from errors'],
  ['Hard-coding the next tool after each result inside a "loop"', 'You have built a brittle decision tree and pay agent costs for it', 'Either write an explicit workflow or let the model choose']
])}

<h3>What the Agent SDK does for you</h3>
<p>The Agent SDK runs this loop (Claude Code\'s harness as a library): it sends requests, executes built-in and custom tools, appends results, manages context and emits messages as it goes: a <code>SystemMessage</code> (init), <code>AssistantMessage</code>s, <code>UserMessage</code>s carrying tool results, and finally one <code>ResultMessage</code>. The client SDKs also offer a Tool Runner that executes your tools and feeds results back if you want less than the full harness.</p>
<pre class="code">// Agent SDK (TypeScript): the loop is inside query(); you configure rails and read the result.
for await (const msg of query({ prompt, options: { allowedTools: ["Read", "Grep", "mcp__shop__lookup_order"],
                                                   maxTurns: 30, maxBudgetUsd: 3.0 } })) {
  if (msg.type !== "result") continue;          // iterate the stream to completion
  switch (msg.subtype) {
    case "success":                              log(msg.num_turns, msg.total_cost_usd); deliver(msg.result); break;
    case "error_max_turns":                      resumeOrEscalate(msg.session_id); break;
    case "error_max_budget_usd":                 alertAndStop(msg.session_id); break;
    case "error_during_execution":               retryOrPage(msg.session_id); break;
    case "error_max_structured_output_retries":  fallbackToReview(msg.session_id); break;
  }
}</pre>
${H.table(['ResultMessage field / subtype', 'Meaning'], [
  ['<code>success</code>', 'Claude produced a final response with no further tool calls; <code>result</code> holds the text (present only on success)'],
  ['<code>error_max_turns</code>', '<code>maxTurns</code> reached (it counts tool-use turns)'],
  ['<code>error_max_budget_usd</code>', '<code>maxBudgetUsd</code> reached; the budget includes subagent spend'],
  ['<code>error_during_execution</code>', 'The run failed (API or execution error)'],
  ['<code>error_max_structured_output_retries</code>', 'Structured output validation kept failing'],
  ['<code>usage</code>, <code>total_cost_usd</code>, <code>num_turns</code>, <code>session_id</code>, <code>stop_reason</code>', 'Observability and resumption; a <code>"refusal"</code> stop_reason detects refusals']
])}

${H.box('real', 'Real-world notes:', 'Log every iteration (stop_reason, tool names, latency, tokens, errors) keyed by a run ID so you can replay failures. Set a budget on every production agent, and treat a rail hit as a signal to investigate, not as normal completion. Test the loop with scripted fake responses (tool_use with two parallel calls, a tool timeout, max_tokens mid-tool, refusal) before you test prompts. Watch token growth per turn: long loops get slower and pricier because history is re-sent, so trim tool outputs and prompt-cache the stable prefix.')}
${H.box('exam', 'Exam vs current docs:', 'The exam guide frames loop control as <code>"tool_use"</code> (continue) vs <code>"end_turn"</code> (stop), and that is what items test. Current docs also list <code>max_tokens</code>, <code>stop_sequence</code>, <code>pause_turn</code> (server-tool turns) and <code>refusal</code>; a production loop handles all of them. Do not assume every assistant turn begins with a thinking block on current models.')}
${H.box('trap', 'Distractor patterns:', '"Check whether the response has text content", "stop after N iterations to be safe", "look for a completion phrase in the reply", "stop when no new information was returned", "retry the whole conversation when one tool fails". Each replaces the structural signal with a guess or turns a local failure into a global one.')}

<h3>Worked scenario</h3>
<p>A support agent built on the Client SDK resolves simple cases but leaves about 18% of multi-issue cases unfinished. The loop is <code>for (i = 0; i &lt; 5; i++)</code> and also breaks early if <code>response.content</code> contains a text block. Logs show the agent writing "I\'ll look up both orders" together with two <code>tool_use</code> blocks, then the session ends. A teammate proposes adding "Say FINAL ANSWER when you are done" to the system prompt and breaking on that phrase.</p>
<ol class="steps">
<li><b>Root cause 1:</b> the text check ends the loop on a turn whose <code>stop_reason</code> is <code>"tool_use"</code>. The two lookups never run.</li>
<li><b>Root cause 2:</b> a 5-iteration cap is the primary stop; multi-issue cases need more turns.</li>
<li><b>Why not the phrase:</b> it is natural-language parsing, which fails whenever Claude phrases it differently or mentions the phrase mid-task.</li>
<li><b>Fix:</b> loop on <code>stop_reason</code> (continue on <code>"tool_use"</code>, finish on <code>"end_turn"</code>), append the full assistant turn and both results in one user message, and keep a generous turn cap plus a dollar budget as rails that return a distinct "max_turns" status routed to review.</li></ol>

${H.check([
  ['Claude returns two <code>tool_use</code> blocks; <code>lookup_order</code> succeeds and <code>get_billing</code> times out. What does the next user message contain?', 'Both <code>tool_result</code> blocks in one message: the order data, and for billing <code>is_error: true</code> with a transient category, <code>isRetryable: true</code> and a clear message. Claude can then retry billing or tell the customer, instead of the run crashing or treating the timeout as "no billing issues".'],
  ['Your loop appends only the text of each assistant turn to save tokens. What error or behavior do you expect?', 'The next request contains <code>tool_result</code> blocks whose <code>tool_use_id</code> has no matching <code>tool_use</code> in history, which the API rejects; and Claude loses the record of what it asked for. Append <code>response.content</code> unchanged and trim tool results instead.'],
  ['When is a pre-configured decision tree the better design than a model-driven loop?', 'When the steps are known, stable and identical on every run (an invoice pipeline: extract, validate, store) or when predictability, latency and cost matter more than adaptation. Model-driven loops pay off when the next step depends on what was just found.'],
  ['A Claude call returns <code>stop_reason: "max_tokens"</code> and the last block is a partial <code>tool_use</code>. Do you execute it?', 'No. The input is truncated and cannot be trusted. Treat the turn as incomplete: narrow or split the request (smaller scope per call) rather than executing partial input.'],
  ['Why is the idempotency key for <code>process_refund</code> derived from order and amount rather than the tool_use id?', 'If a retry or a confused turn makes Claude issue the same refund again, it arrives with a new tool_use id. A business-level key (plus a ledger check) makes the second call a no-op.'],
  ['Your Agent SDK run returns <code>subtype: "error_max_budget_usd"</code>. Is <code>result</code> available, and what spend counts toward the budget?', '<code>result</code> is present only on success. The budget includes subagent spend. Log <code>session_id</code> and cost, then decide to resume with a higher budget, escalate, or stop.']
])}
${H.src([['Agent SDK: agent loop', 'https://code.claude.com/docs/en/agent-sdk/agent-loop'], ['Tool use overview', 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview'], ['Building effective agents', 'https://www.anthropic.com/engineering/building-effective-agents'], ['Writing tools for agents', 'https://www.anthropic.com/engineering/writing-tools-for-agents']])}`;
    }
  });

  /* ------------------------------------------------------------------ 1.2 */
  CCAR.lessons.push({
    id: 'hb-12-coordinator', track: 'handbook', part: 'P1', num: '1.2', order: 102, domain: 'D1',
    objs: ['O10', 'O07'], ts: ['1.2'], minutes: 35,
    title: 'Coordinator-subagent orchestration: hub-and-spoke, decomposition, partitioning and refinement loops',
    summary: 'Why all traffic routes through one coordinator, what the coordinator owns, how to scale effort to query complexity, partition scope without duplication, run evaluate-and-re-delegate loops with stopping criteria, and choose among the five workflow patterns (or no multi-agent at all).',
    body: function () {
      return `
<p>A coordinator-subagent system splits one large task across several Claude instances, each with a fresh context, and puts one agent in charge of planning, delegation and synthesis. It is how Anthropic\'s research system works, and it is the default shape of the exam\'s multi-agent research scenario. The exam probes four skills: recognizing that the coordinator (not a subagent) caused a coverage failure, partitioning work so agents do not duplicate each other, scaling effort to the query, and running a refinement loop that closes gaps instead of shipping them.</p>

<h3>Hub-and-spoke</h3>
${D({ w: 760, h: 300, title: 'Coordinator as the hub of all communication',
  nodes: [
    { id: 'u', x: 20, y: 124, w: 110, h: 50, label: 'User query', kind: 'human' },
    { id: 'c', x: 185, y: 110, w: 170, h: 78, label: 'Coordinator', sub: 'plan · delegate · judge · merge', kind: 'agent' },
    { id: 'w1', x: 420, y: 16, w: 170, h: 50, label: 'Web search agent', sub: 'subtopics A, B', kind: 'sub' },
    { id: 'w2', x: 420, y: 86, w: 170, h: 50, label: 'Web search agent', sub: 'subtopics C, D', kind: 'sub' },
    { id: 'w3', x: 420, y: 156, w: 170, h: 50, label: 'Document analyst', sub: 'internal PDFs only', kind: 'sub' },
    { id: 's', x: 420, y: 236, w: 170, h: 50, label: 'Synthesis agent', sub: 'findings + metadata in prompt', kind: 'sub' },
    { id: 'fs', x: 630, y: 86, w: 120, h: 60, label: 'Artifact store', sub: 'files, referenced by path', kind: 'store' },
    { id: 'r', x: 630, y: 236, w: 120, h: 50, label: 'Cited report', kind: 'good' }
  ],
  edges: [{ from: 'u', to: 'c' }, { from: 'c', to: 'w1', both: true }, { from: 'c', to: 'w2', both: true }, { from: 'c', to: 'w3', both: true }, { from: 'c', to: 's', both: true },
    { from: 'w2', to: 'fs', dashed: true, label: 'write' }, { from: 's', to: 'r' }],
  caption: 'Subagents never message each other. Each receives its task from the coordinator and returns only its final message to it. Large outputs can live in files, but the handoff (which file, what it means) still goes through the hub.' })}
${H.table(['Benefit of routing everything through the coordinator', 'What it looks like in practice', 'What goes wrong without it'], [
  ['<b>Observability</b>', 'One place logs every delegation, prompt, result, cost and error; you can trace a claim back to the subagent that produced it', 'Peer-to-peer messages scatter state; nobody can reconstruct why the report says what it says'],
  ['<b>Consistent error handling</b>', 'The coordinator receives structured failures, decides to retry, re-scope, proceed with partial results or annotate a gap', 'A subagent silently swallows a timeout, or one failure halts the pipeline'],
  ['<b>Controlled information flow</b>', 'The coordinator decides exactly which findings each agent sees (curated, attributed)', 'Agents overwrite shared state, pass unverified claims along ("game of telephone"), or leak irrelevant context']
])}

<h3>Isolated context</h3>
<p>Each subagent starts with a fresh context window: its own system prompt, its tools, and the task prompt the coordinator writes. It does <b>not</b> inherit the coordinator\'s conversation, earlier tool results or the other subagents\' work. Only its final message returns. That isolation is the point (parallel, clean contexts that do not fill each other up), and it is also the most common bug: anything a subagent needs must be written into its task prompt (chapter 1.3).</p>

<h3>What the coordinator owns</h3>
${H.table(['Responsibility', 'Concretely', 'Failure signature when it is done badly'], [
  ['<b>Analyze the query</b>', 'Classify complexity and required dimensions before delegating', 'Full pipeline for "what year was X founded"'],
  ['<b>Decompose</b>', 'Break the topic into subtasks that together cover the whole scope', 'Report covers one slice; every subagent "succeeded"'],
  ['<b>Delegate</b>', 'Choose which subagents to invoke, write complete task prompts with objective, boundaries, output format and source guidance', 'Duplicated work, vague results, "which reports?"'],
  ['<b>Aggregate</b>', 'Merge results, keep attribution, preserve conflicts', 'Unsourced claims; one of two conflicting figures silently dropped'],
  ['<b>Evaluate and iterate</b>', 'Check synthesis against the coverage plan, re-delegate targeted queries', 'Known gaps shipped as if complete'],
  ['<b>Handle errors</b>', 'Retry transient failures, re-scope, or annotate coverage gaps', 'Silent partial results or a full-run abort']
])}

<h3>Dynamic selection: scale effort to the query</h3>
<p>A good coordinator does not run every subagent on every query. Anthropic embeds effort-scaling rules in the lead agent\'s prompt because agents are poor at judging appropriate effort on their own.</p>
${H.table(['Query type', 'Effort', 'Example'], [
  ['Simple fact-finding', '1 agent, about 3–10 tool calls', '"When did the EU AI Act enter into force?"'],
  ['Direct comparison', '2–4 subagents', '"Compare three vector databases on cost and latency"'],
  ['Complex, broad research', '10+ subagents with clearly divided responsibilities', '"Impact of AI on creative industries"']
])}
<pre class="code">// Coordinator system prompt excerpt (goal and criteria, not a script)
Before delegating, classify the request:
- Simple fact: answer with at most one search subagent. Do not invoke analysis or synthesis agents.
- Comparison: one subagent per option being compared, then synthesis.
- Broad topic: list the major dimensions of the topic first (write them in the plan), then assign
  each dimension to exactly one subagent. Invoke the document analyst only if internal documents
  are relevant. Always invoke synthesis for multi-source answers.
Launch independent subagents in the same response so they run in parallel.</pre>

<h3>Overly narrow decomposition</h3>
<p>The exam\'s canonical case: the topic is "impact of AI on creative industries". The coordinator decomposes it into "AI in digital art creation", "AI in graphic design" and "AI in photography". Every subagent does its job well, synthesis is coherent, and the report covers only visual arts, missing music, writing and film. The coordinator\'s logs show the root cause directly: the decomposition. Blaming the search agent\'s queries, the analyst\'s filters or synthesis\'s gap detection fixes the wrong layer.</p>
${H.table(['Fix at the coordinator', 'How'], [
  ['Enumerate dimensions before assigning', 'Prompt the coordinator to list the topic\'s major sectors or facets and check the list for breadth (visual arts, music, writing, film and TV, games, performing arts) before creating subtasks'],
  ['Write the plan down', 'Persist the plan and coverage checklist (Anthropic\'s lead agent saves its plan to memory because very long contexts get truncated)'],
  ['Make coverage checkable', 'The checklist becomes the yardstick for the refinement loop']
])}

<h3>Partitioning scope to minimize duplication</h3>
<p>Parallel subagents given overlapping briefs ("research AI in music", "research AI in audio production") return the same sources and leave other areas empty. Partition along one clean axis and state boundaries explicitly.</p>
${H.table(['Partition by', 'Example assignment', 'Boundary line in each prompt'], [
  ['<b>Subtopic</b>', 'Agent 1: music and audio. Agent 2: writing and publishing. Agent 3: film, TV and games. Agent 4: visual arts and design', '"Film and games are covered by another agent; do not research them"'],
  ['<b>Source type</b>', 'Web agent: news and industry reports. Document analyst: the 11 internal PDFs. Academic agent: peer-reviewed papers', '"Do not search the web; work only from the documents listed below"'],
  ['<b>Time or geography</b>', '2020–2023 vs 2024–2026; EU vs US regulation', '"Only sources dated 2024 or later"']
])}
${H.box('rule', 'Every subagent brief contains:', 'an objective, an output format, guidance on tools and sources, and clear task boundaries. Anthropic found that short briefs such as "research the semiconductor shortage" caused subagents to duplicate each other and misread the task.')}

<h3>The iterative refinement loop</h3>
${D({ w: 760, h: 200, title: 'Evaluate, re-delegate, re-synthesize',
  nodes: [
    { id: 'p', x: 20, y: 70, w: 130, h: 56, label: 'Plan + checklist', sub: 'dimensions to cover', kind: 'store' },
    { id: 'd', x: 185, y: 70, w: 130, h: 56, label: 'Delegate', sub: 'parallel subagents', kind: 'sub' },
    { id: 's', x: 350, y: 70, w: 130, h: 56, label: 'Synthesize', sub: 'claims + sources', kind: 'sub' },
    { id: 'e', x: 515, y: 70, w: 110, h: 56, label: 'Evaluate', sub: 'gaps vs checklist', kind: 'agent' },
    { id: 'o', x: 650, y: 70, w: 100, h: 56, label: 'Report', sub: 'gaps annotated', kind: 'good' }
  ],
  edges: [{ from: 'p', to: 'd' }, { from: 'd', to: 's' }, { from: 's', to: 'e' }, { from: 'e', to: 'o', label: 'done' }, { from: 'e', to: 'd', dashed: true, label: 'targeted re-delegation', dy: 46 }],
  caption: 'The coordinator judges coverage; subagents do not decide whether the whole job is finished.' })}
<pre class="code">let findings = await delegateParallel(plan.subtasks);      // several Task calls in ONE response
let report = await synthesize(findings);
for (let round = 1; round &lt;= 3; round++) {                 // hard cap: a rail, not the goal
  const review = await coordinatorEvaluate(report, plan.checklist);   // which dimensions are thin or missing?
  if (review.gaps.length === 0) break;                     // primary stop: coverage sufficient
  const extra = await delegateParallel(review.gaps.map(g =&gt; ({
    agent: g.needsInternalDocs ? "doc-analyst" : "web-search",
    prompt: targetedBrief(g)                               // narrow query, boundaries, output format
  })));
  if (extra.every(f =&gt; f.newSources === 0)) break;          // diminishing returns: stop searching
  findings = findings.concat(extra);
  report = await synthesize(findings);                     // re-invoke synthesis with ALL findings
}
return annotateCoverage(report, remainingGaps);            // declare what is still missing</pre>
${H.table(['Stopping criterion', 'Type'], [
  ['Every checklist dimension has sourced findings at the required depth', 'Primary (quality)'],
  ['A round produced no new sources or claims', 'Diminishing returns'],
  ['Round cap or token budget reached', 'Safety rail; ship with gaps explicitly annotated']
])}

<h3>Workflow patterns and when to use each</h3>
${H.table(['Pattern', 'Shape', 'Use when', 'Avoid when'], [
  ['<b>Prompt chaining</b>', 'A → B → C with checks between steps', 'Fixed, dependent steps (outline → check → draft)', 'Steps vary per input'],
  ['<b>Routing</b>', 'Classify, then send to a specialized handler', 'Distinct request types with different handling or models', 'Most requests span several types'],
  ['<b>Parallelization: sectioning</b>', 'Independent fixed parts run at once, then join', 'Known independent parts (per document, per file, per check)', 'Parts depend on each other'],
  ['<b>Parallelization: voting</b>', 'Same task several times, aggregate', 'You want diverse attempts or higher confidence on a judgment', 'Intermittent true findings would be outvoted; cost matters'],
  ['<b>Orchestrator-workers</b>', 'Coordinator decides subtasks at runtime, delegates, synthesizes', 'Open-ended, breadth-first work where subtasks cannot be known up front', 'Tightly coupled work, simple queries'],
  ['<b>Evaluator-optimizer</b>', 'Generate, critique against criteria, revise', 'Clear evaluation criteria and measurable gains from iteration', 'No criteria; the evaluator shares the generator\'s blind spots']
])}

<h3>Cost and when multi-agent is the wrong answer</h3>
<ul>
<li>Multi-agent systems use about <b>15x</b> the tokens of a chat interaction. The value of the task must justify that.</li>
<li>Best fit: breadth-first, parallelizable, high-value research where information exceeds one context window. Anthropic\'s lead agent spawns 3–5 subagents in parallel and subagents use 3+ tools in parallel, cutting research time by up to 90% for complex queries.</li>
<li>Poor fit: <b>tightly coupled tasks</b> where agents must share context or coordinate in real time, which includes most coding. One agent with good context (or subagents only for isolated side tasks such as searching the codebase) beats a swarm editing the same modules.</li>
<li>Use model tiering: a strong coordinator with cheaper subagents for narrow retrieval, verified per role with evals.</li></ul>

<h3>Artifacts on the filesystem, lightweight references</h3>
<p>Routing every byte through the coordinator\'s context is expensive and lossy. Anthropic\'s pattern: subagents write substantial outputs (code, reports, data) to external storage and return a lightweight reference plus a short summary. The coordinator stays the hub for control (it knows every artifact and hands references to the next agent) without re-copying content, which also avoids the "game of telephone" distortion of repeated summarization. A separate citation step attributes claims to sources at the end.</p>

${H.table(['If the situation is', 'Choose', 'Because', 'You give up'], [
  ['Simple lookup', 'Single agent, few tool calls', 'Multi-agent overhead buys nothing', 'Nothing meaningful'],
  ['Broad research, many independent facets', 'Orchestrator-workers with partitioned subagents', 'Parallel fresh contexts, breadth', '~15x tokens, coordination engineering'],
  ['Known fixed stages with dependencies', 'Prompt chain / fixed pipeline with gates', 'Predictable and testable', 'Adaptation'],
  ['Coverage uncertain', 'Add evaluate → re-delegate loop', 'Gaps get closed, not shipped', 'Extra rounds of cost and latency'],
  ['Refactoring tightly coupled code', 'One agent, subagents only for isolated exploration', 'Shared context matters more than parallelism', 'Wall-clock speed']
])}
${H.box('real', 'Real-world notes:', 'Trace every delegation (prompt, subagent type, tokens, duration, outcome) so you can evaluate decomposition quality separately from subagent quality. Put a budget on the whole run, because subagent spend adds up fast. Errors compound in long multi-agent runs: checkpoint progress so a failure resumes from the last good state instead of restarting. Evaluate end-state outcomes (did the report cover the checklist, are claims sourced) with a rubric grader calibrated against human review.')}
${H.box('exam', 'Exam vs current docs:', 'The exam guide says the coordinator spawns subagents with the <b>Task</b> tool; current Agent SDK docs call it the <b>Agent</b> tool. Same mechanism, both names. The exam also frames the refinement loop in terms of "search and analysis subagents" and a "synthesis subagent", so expect those role names.')}
${H.box('trap', 'Distractor patterns:', 'Blaming a downstream agent that did its assigned job well when the coordinator\'s decomposition was narrow; "let subagents message each other directly to save time"; "run the full pipeline for every query for consistency"; "majority vote across three runs" (suppresses intermittent true findings, triples cost); "one giant agent with all tools and a bigger context window"; "concatenate independent per-topic pipelines" (loses cross-topic synthesis and gap evaluation).')}

<h3>Worked scenario</h3>
<p>Your research system produces a report on "impact of AI on creative industries" that covers only visual arts. Each subagent succeeded; the coordinator log shows three subtasks: digital art, graphic design, photography. The next week, a different query ("renewable storage technologies") produces a report in which two web agents returned 70% of the same sources and nothing on thermal storage.</p>
<ol class="steps">
<li><b>First failure:</b> coordinator decomposition too narrow. Fix the coordinator: enumerate the topic\'s dimensions (music, writing, film, games, visual arts, performing arts) and assign each to exactly one subagent.</li>
<li><b>Second failure:</b> overlapping briefs. Partition by subtopic (batteries, pumped hydro, thermal, hydrogen) or by source type, and state "X is covered by another agent" in each brief.</li>
<li><b>Guard for both:</b> a refinement loop that evaluates the synthesis against the written checklist, re-delegates targeted queries for thin dimensions and re-synthesizes, stopping when coverage is sufficient or rounds stop producing new sources, and annotating any remaining gap.</li></ol>

${H.check([
  ['The report on "AI in creative industries" misses music and film. Logs show the coordinator created three visual-arts subtasks. Which component do you change?', 'The coordinator\'s decomposition. Subagents executed their assignments correctly; changing search queries, analyst filters or synthesis instructions treats a symptom downstream of the root cause.'],
  ['A user asks "What year was the company founded?" and the system runs search, analysis and synthesis agents for 90 seconds. What coordinator behavior is missing?', 'Dynamic selection by query complexity: a simple fact needs one agent and a handful of tool calls. Put explicit effort-scaling rules in the coordinator\'s prompt.'],
  ['Why route a subagent\'s failure back through the coordinator instead of letting the search agent ask the analyst for help directly?', 'The hub gives one place for observability, consistent error handling (retry, re-scope, annotate the gap) and controlled information flow. Peer-to-peer calls scatter state and let unverified claims propagate.'],
  ['What are the stopping criteria of a good refinement loop?', 'Primary: every checklist dimension has sourced coverage. Secondary: a round yields no new sources (diminishing returns). Rail: round cap or budget, after which remaining gaps are declared in the report rather than hidden.'],
  ['Your team wants five subagents to refactor one tightly coupled payments module in parallel. Good idea?', 'Usually not. Multi-agent costs about 15x chat tokens and fits breadth-first parallel work; tightly coupled code needs shared context. Use one agent with good context, and subagents only for isolated exploration.'],
  ['Subagents return 40-page analyses into the coordinator\'s context, which fills up. What pattern fixes this without losing the hub?', 'Have subagents write artifacts to the filesystem and return a path plus a short summary. The coordinator passes references onward and stays in control of the flow.']
])}
${H.src([['How we built our multi-agent research system', 'https://www.anthropic.com/engineering/multi-agent-research-system'], ['Building effective agents', 'https://www.anthropic.com/engineering/building-effective-agents'], ['Agent SDK: subagents', 'https://code.claude.com/docs/en/agent-sdk/subagents']])}`;
    }
  });

  /* ------------------------------------------------------------------ 1.3 */
  CCAR.lessons.push({
    id: 'hb-13-subagent-config', track: 'handbook', part: 'P1', num: '1.3', order: 103, domain: 'D1',
    objs: ['O01', 'O03', 'O04', 'O05', 'O06'], ts: ['1.3'], minutes: 40,
    title: 'Subagent invocation, context passing and spawning',
    summary: 'The Task (Agent) tool and its wiring, every AgentDefinition field, what a subagent does and does not inherit, complete and attributed task prompts, parallel spawning, goal-based delegation, the misconfiguration ladder, forks, filesystem agents and spawn caps.',
    body: function () {
      return `
<p>Chapter 1.2 decided <i>what</i> to delegate. This chapter is the wiring: how a coordinator actually spawns a subagent, what the subagent can see, and why a correctly designed system still fails when one field is wrong. Exam items here usually show a <code>query()</code> config or an AgentDefinition plus a symptom and ask for the root cause, or show a coordinator\'s Task prompt and ask what is missing. You scored lowest on the misconfiguration objective last time, so the diagnostic ladder below is the part to know cold.</p>

<h3>How a subagent is spawned</h3>
${D({ w: 760, h: 260, title: 'Spawning path and what crosses the boundary',
  nodes: [
    { id: 'q', x: 20, y: 20, w: 200, h: 60, label: 'query() options', sub: 'allowedTools · agents · mcpServers', kind: 'store' },
    { id: 'c', x: 280, y: 20, w: 190, h: 60, label: 'Coordinator', sub: 'has the Task / Agent tool', kind: 'agent' },
    { id: 't', x: 280, y: 150, w: 190, h: 60, label: 'Task call', sub: 'agent type + prompt string', kind: 'tool' },
    { id: 's', x: 540, y: 150, w: 200, h: 60, label: 'Subagent', sub: 'own prompt, tools, fresh context', kind: 'sub' },
    { id: 'x', x: 540, y: 20, w: 200, h: 60, label: 'Not passed', sub: 'parent history, tool results', kind: 'bad' },
    { id: 'r', x: 20, y: 150, w: 200, h: 60, label: 'Final message only', sub: 'returned as the tool result', kind: 'good' }
  ],
  edges: [{ from: 'q', to: 'c', label: 'config' }, { from: 'c', to: 't', label: 'routes by description' }, { from: 't', to: 's', label: 'the only channel' },
    { from: 'x', to: 's', dashed: true, kind: 'bad', label: 'never inherited' }, { from: 's', to: 'r', dashed: true, dy: 40 }],
  caption: 'The coordinator picks a subagent type from the <code>description</code> fields it can see, writes a prompt string, and gets back only the subagent\'s final message. Messages produced inside the subagent carry <code>parent_tool_use_id</code> in the SDK stream, so you can attribute them in traces.' })}

${H.box('exam', 'Exam vs current docs:', 'The exam guide calls the spawning mechanism the <b>Task</b> tool and states that the coordinator\'s <code>allowedTools</code> must include <code>"Task"</code>. Current Agent SDK docs call it the <b>Agent</b> tool (renamed from Task). Also note that in the current SDK <code>allowedTools</code> is an auto-approve list, while availability is restricted with <code>tools</code> / <code>disallowedTools</code>. On the exam, apply the guide\'s rule: no "Task" in the coordinator\'s allowedTools means no delegation.')}

<h3>AgentDefinition fields</h3>
${H.table(['Field', 'Required', 'What it does', 'Typical mistake'], [
  ['<code>description</code>', 'Yes', 'Tells the <b>coordinator</b> when to use this agent (routing text)', 'Vague ("helper agent") or overlapping with a sibling; role rules pasted here'],
  ['<code>prompt</code>', 'Yes', 'The <b>subagent\'s</b> system prompt: role, rules, output contract', 'Generic one-liner while the real rules sit in <code>description</code> (swapped)'],
  ['<code>tools</code>', 'No', 'Explicit tool list. <b>Omitted = inherits all available tools</b>', 'Missing the one tool the role needs; omitted entirely on a read-only role'],
  ['<code>disallowedTools</code>', 'No', 'Removes tools, supports patterns such as <code>mcp__server__*</code>', 'Relying on a prompt line instead'],
  ['<code>model</code>', 'No', '<code>\'fable\'</code>, <code>\'opus\'</code>, <code>\'sonnet\'</code>, <code>\'haiku\'</code>, <code>\'inherit\'</code> or a model ID', 'Distractor: "missing model prevents routing" (it does not)'],
  ['<code>effort</code>', 'No', 'Reasoning effort for this agent (for example <code>"low"</code> for lookups)', 'Max effort on trivial retrieval'],
  ['<code>mcpServers</code>', 'No', 'MCP servers available to this agent', 'MCP tool listed, server not configured'],
  ['<code>skills</code>', 'No', 'Skills preloaded into the subagent', 'Expecting it to see the parent\'s skills'],
  ['<code>maxTurns</code>', 'No', 'Turn cap for the subagent; partial output is marked', 'No cap on an open-ended searcher'],
  ['<code>background</code>, <code>permissionMode</code>, <code>memory</code>, <code>initialPrompt</code>, <code>omitClaudeMd</code> (TS)', 'No', 'Execution mode, permissions, memory, initial prompt, skip project CLAUDE.md', 'Loading a large CLAUDE.md into a tiny lookup agent']
])}

<h3>A complete configuration</h3>
<pre class="code">// Agent SDK (TypeScript). Exam wording: "Task" in allowedTools. Current SDK name: "Agent".
const run = query({
  prompt: "Produce a sourced brief on AI adoption in music, publishing and film (2024-2026).",
  options: {
    allowedTools: ["Agent", "Read", "Write"],          // coordinator: delegate, read artifacts, write report
    mcpServers: { papers: { command: "node", args: ["servers/papers.js"] } },   // must exist for mcp__papers__* tools
    maxBudgetUsd: 5.0,                                  // includes subagent spend
    agents: {                                           // every subagent the coordinator may use is registered here
      "web-researcher": {
        description: "Searches the public web for recent news, industry reports and statistics on ONE assigned "
          + "subtopic. Use for external sources. Not for internal PDFs (use doc-analyst).",
        prompt: "You research exactly the subtopic you are given. Prefer primary, dated sources. Return JSON: "
          + "claims[] with claim, evidence_excerpt, source_url, publisher, published_date; plus not_covered[].",
        tools: ["WebSearch", "WebFetch"],
        model: "sonnet", effort: "low", maxTurns: 20
      },
      "doc-analyst": {
        description: "Analyzes the internal PDF library via the papers server. Use when the question needs internal "
          + "reports or page-level citations. Does not search the web.",
        prompt: "Extract findings with document name and page number for each claim. Never paraphrase numbers.",
        tools: ["Read", "mcp__papers__search", "mcp__papers__get_document"],
        model: "sonnet"
      },
      "synthesizer": {
        description: "Combines findings supplied in the prompt into a cited report. Use after research is complete.",
        prompt: "Use only the findings provided. Keep every source attribution. Flag conflicting figures, do not average them.",
        tools: ["Read", "Write"]                        // no search tools: synthesis must not re-research
      }
    }
  }
});</pre>

<h3>What a subagent inherits (and what it does not)</h3>
${H.table(['Receives (non-fork subagent)', 'Does NOT receive'], [
  ['Its own <code>prompt</code> (system prompt) plus the Task/Agent prompt string', 'The parent\'s conversation history'],
  ['Project CLAUDE.md (unless <code>omitClaudeMd</code>)', 'The parent\'s tool calls and tool results'],
  ['Definitions of its tools', 'The parent\'s system prompt'],
  ['Skills listed in <code>skills</code>', 'Memory of its own previous invocations (each call starts fresh unless you resume it)']
])}
<p><b>Forks are the exception:</b> a forked subagent inherits the parent conversation. That is useful when the whole transcript genuinely matters, but it brings everything, including raw tool dumps, so it is not the curated context most delegation needs.</p>

<h3>Put complete findings in the prompt</h3>
<p>The Task prompt is the only channel. "Synthesize the findings above" means nothing to a subagent that never saw them. When the synthesis agent runs after web search and document analysis, the coordinator pastes those results (or references to their files) into the synthesis prompt, with the metadata needed to cite them.</p>
<div class="two"><div>
<h4 class="bad-h">Incomplete</h4>
<pre class="code">Synthesize what the research agents found about
AI in music and write the report. Make sure to cite
sources.</pre></div><div>
<h4 class="good-h">Self-sufficient</h4>
<pre class="code">Goal: 600-word brief on AI adoption in music, 2024-2026,
for a label executive.
Findings (JSON below): 14 claims from web-researcher,
6 from doc-analyst. Use only these.
Criteria: every sentence with a figure cites its source;
conflicting figures shown side by side with sources.
Output: markdown report + "gaps" list.
&lt;findings&gt; ... &lt;/findings&gt;</pre></div></div>

<h3>Separate content from metadata</h3>
<pre class="code">{
  "findings": [
    { "claim": "Share of surveyed producers using AI mastering tools",
      "value": "38%", "evidence_excerpt": "38% of respondents reported ...",
      "source": { "type": "web", "url": "https://example.org/report-2025", "publisher": "Example Assoc.",
                  "published_date": "2025-03-14" } },
    { "claim": "Share of surveyed producers using AI mastering tools",
      "value": "22%", "evidence_excerpt": "Roughly one in five ...",
      "source": { "type": "document", "document": "Q2-market-study.pdf", "page": 17, "published_date": "2024-11-02" } }
  ],
  "not_covered": ["live performance", "royalty distribution"]
}</pre>
<p>Keeping claims, excerpts and source metadata in separate fields means attribution survives synthesis, conflicting values stay visible with their sources and dates, and a citation step can check every claim. Prose summaries ("studies show about 30%") lose the URL, the page and the disagreement.</p>

<h3>Spawn in parallel: one response, many Task calls</h3>
${H.table(['Pattern', 'What happens', 'Latency (4 independent subtasks, ~60 s each)'], [
  ['<b>Several Task calls in one coordinator response</b>', 'The subagents run concurrently; results return together', '≈ 60 s plus one coordinator turn'],
  ['One Task call per coordinator turn', 'Each waits for the previous one; the coordinator re-reads growing history each turn', '≈ 240 s plus four coordinator turns']
])}
<p>If one subtask depends on another\'s output, launch the independent ones together, then spawn the dependent one with the result in its prompt. Prompt the coordinator explicitly to launch independent subagents in the same response.</p>

<h3>Delegate goals and criteria, not procedures</h3>
<div class="spectrum"><div class="sp bad"><b>Rigid procedure</b><br>"1. Search X. 2. Open the top 3 results. 3. Copy the table."<br><i>Breaks on paywalls, odd formats, better sources</i></div>
<div class="sp good"><b>Goal + quality criteria + boundaries + output contract</b><br>"Find adoption figures for AI tools in music production since 2024. Prefer dated primary surveys. Publishing is covered elsewhere. Return claims with source metadata and a not_covered list."</div>
<div class="sp bad"><b>Unbounded</b><br>"Research AI and music."<br><i>Duplication, gaps, no control</i></div></div>
<p>Goals let the subagent adapt when a path fails; criteria and the output contract keep the coordinator\'s visibility and control.</p>

<h3>Misconfiguration diagnostic ladder</h3>
${H.table(['#', 'Symptom', 'Root cause', 'Fix'], [
  ['1', 'No subagent is ever spawned; the coordinator does all the work itself and its context balloons', 'Coordinator lacks <code>"Task"</code> (Agent) in <code>allowedTools</code>', 'Add it; usually also remove the coordinator\'s own research tools'],
  ['2', 'Error that the agent type is not available', 'Definition written but not passed in the <code>agents</code> option', 'Register it in <code>agents</code>'],
  ['3', 'Subagent spawns, then says it cannot access a tool', 'Its explicit <code>tools</code> list omits that tool (it does not borrow the coordinator\'s)', 'Add the tool to the <b>subagent\'s</b> <code>tools</code>'],
  ['4', 'Read-only reviewer edits files or runs builds', '<code>tools</code> omitted entirely, so it inherits everything', 'Explicit least-privilege list'],
  ['5', 'MCP tool is listed but "not available"', 'The MCP server is not configured (in <code>mcpServers</code>)', 'Configure the server for the run or the agent'],
  ['6', 'Wrong agent chosen, or one agent never chosen', 'Vague or overlapping <code>description</code>s', 'Specific, non-overlapping descriptions: purpose, inputs, when to prefer over the sibling'],
  ['7', 'Subagent ignores its rules and also receives odd tasks', '<code>description</code> and <code>prompt</code> swapped', 'Rules into <code>prompt</code>; routing sentence into <code>description</code>'],
  ['8', 'Subagent asks "which documents?" or redoes finished work', 'Context not in the Task prompt', 'Pass complete findings and metadata']
])}
<pre class="code">// Spot both faults
const coordinatorOptions = {
  allowedTools: ["Read", "Grep", "mcp__mainframe__get_copybook"],   // (a) no "Task" / "Agent": nothing can be delegated
  mcpServers: { mainframe },
  agents: { "copybook-analyst": {
    description: "Resolves COBOL copybook layouts for a given program.",
    prompt: "Always fetch the copybook with get_copybook before answering.",
    tools: ["Read", "Grep", "Glob"] } }                              // (b) missing mcp__mainframe__get_copybook
};</pre>
${H.box('trap', 'Wiring distractors:', '"Add Task to the subagent\'s tools so the coordinator can reach it" (backwards: Task on a subagent only lets it spawn its own children); "subagent tools must be a subset of the coordinator\'s" (no such rule); "prompt the coordinator to delegate more" when the tool is missing (a prompt cannot grant a tool); "set model so the agent becomes routable" (optional field); "enable shared memory so the subagent sees the parent conversation" (non-fork subagents never do).')}

<h3>Forks for divergent approaches</h3>
<p>When you want to compare two approaches from the same analysis (two refactoring strategies, two test strategies), fork the session: the fork gets a new session ID and the full shared history up to that point; the original is unchanged.</p>
<pre class="code">// Capture the baseline session, then branch twice
const baselineId = resultMsg.session_id;
query({ prompt: "Plan approach A: strangler pattern.", options: { resume: baselineId, forkSession: true } });
query({ prompt: "Plan approach B: big-bang rewrite.",   options: { resume: baselineId, forkSession: true } });
// CLI equivalent: claude --resume &lt;session&gt; --fork-session</pre>

<h3>Filesystem definitions, precedence and caps</h3>
<pre class="code"># .claude/agents/doc-analyst.md  (project, shared via git; ~/.claude/agents/ for personal)
---
name: doc-analyst
description: Analyzes internal PDF reports with page-level citations. Use for internal documents, not web research.
tools: Read, Grep, Glob
model: sonnet
---
You extract findings from internal reports. Cite document and page for every claim.</pre>
${H.table(['Item', 'Fact'], [
  ['Ways to define subagents', 'Programmatic <code>agents</code> option (recommended in the SDK), filesystem <code>.claude/agents/*.md</code>, built-in general-purpose'],
  ['Name clash', 'Programmatic definitions override filesystem ones with the same name. In Claude Code: managed > CLI flag > project > user > plugin'],
  ['Execution', 'Subagents default to background execution; Claude runs them in the foreground when it needs the result. Built-in Explore and Plan are one-shot; custom agents can be resumed via session resume plus agent ID'],
  ['Spawn depth', '<code>CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH</code>, default 3'],
  ['Concurrency', '<code>CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS</code>, default 20'],
  ['Spend', '<code>maxBudgetUsd</code> covers subagents too. Current models delegate readily, so set limits'],
  ['Not delegating?', 'Mention the subagent by name in the request and make its description specific']
])}

${H.table(['If', 'Choose', 'Because', 'You give up'], [
  ['Subagent needs curated prior results', 'Non-fork subagent with findings in the prompt', 'Smallest high-signal context', 'Prompt-writing effort'],
  ['Branch needs the entire conversation', 'Fork', 'Full shared baseline', 'Context size and noise'],
  ['Role is read-only', 'Explicit <code>tools</code> list', 'Least privilege', 'Nothing'],
  ['Simple lookup subagent', '<code>model: "haiku"</code> or <code>"sonnet"</code>, <code>effort: "low"</code>', 'Cost and latency', 'Depth on hard cases (verify with evals)']
])}
${H.box('real', 'Real-world notes:', 'Log each Task call (agent type, prompt, returned message, tokens) using <code>parent_tool_use_id</code> to group subagent messages. Version agent definitions like code and test each against its own eval slice. Keep subagent outputs structured and short (a condensed summary, often 1,000–2,000 tokens) or written to files, so the coordinator\'s context does not fill up.')}

<h3>Worked scenario</h3>
<p>A coordinator has <code>allowedTools: ["Task", "WebSearch"]</code> and an <code>agents</code> map with a synthesis agent whose <code>tools</code> are <code>["Read"]</code>. Reports cite no sources, and traces show the coordinator\'s Task prompt is "Write the final report from the research." Separately, research subtasks take four times longer than expected; traces show one Task call per coordinator turn.</p>
<ol class="steps">
<li><b>No citations:</b> the synthesis agent never saw the findings or their metadata. Pass the complete findings in structured form (claim, excerpt, URL, document, page, date) in the Task prompt.</li>
<li><b>Slow research:</b> subtasks are spawned across turns. Instruct the coordinator to emit all independent Task calls in one response.</li>
<li><b>Hardening:</b> remove WebSearch from the coordinator so it delegates rather than researching itself, and keep synthesis without search tools so it cannot re-research.</li></ol>

${H.check([
  ['A coordinator never spawns subagents and instead searches the web itself. Its options include <code>agents</code> with three good definitions. First thing to check?', 'Whether <code>allowedTools</code> includes <code>"Task"</code> (Agent tool in the current SDK). Without it the coordinator cannot delegate, regardless of how good the definitions are.'],
  ['A subagent reports "No such tool available: mcp__jira__search" although the coordinator can use it. Why?', 'Subagents do not borrow the coordinator\'s tools. Its explicit <code>tools</code> list must include the MCP tool, and the jira server must be configured for the run.'],
  ['Why pass findings as JSON with separate source fields rather than as a prose summary?', 'Separate metadata (URL, document, page, date) survives synthesis, keeps conflicting values attributable, and lets a citation step verify each claim. Prose loses attribution.'],
  ['Four independent research subtasks take four coordinator turns. How do you cut latency?', 'Have the coordinator emit all four Task calls in a single response so they run in parallel; spawn dependent work afterwards with results in its prompt.'],
  ['You want to compare two migration strategies from the same completed codebase analysis. Mechanism?', 'Fork the session from the analysis baseline (<code>forkSession</code> with resume, or <code>--fork-session</code>): each branch gets the shared history and its own new session ID.'],
  ['A read-only code reviewer subagent modified files during review. Its definition has description and prompt but no tools field. Root cause?', 'Omitting <code>tools</code> inherits all available tools, including Edit and Write. Give it an explicit list such as Read, Grep, Glob.']
])}
${H.src([['Agent SDK: subagents', 'https://code.claude.com/docs/en/agent-sdk/subagents'], ['Claude Code: subagents', 'https://code.claude.com/docs/en/sub-agents'], ['Agent SDK: sessions', 'https://code.claude.com/docs/en/agent-sdk/sessions'], ['Multi-agent research system', 'https://www.anthropic.com/engineering/multi-agent-research-system']])}`;
    }
  });
  /* ------------------------------------------------------------------ 1.4 */
  CCAR.lessons.push({
    id: 'hb-14-enforcement-handoff', track: 'handbook', part: 'P1', num: '1.4', order: 104, domain: 'D1',
    objs: ['X02', 'X05'], ts: ['1.4'], minutes: 30,
    title: 'Multi-step workflows: programmatic enforcement, prerequisite gates and structured handoffs',
    summary: 'Why prompt-only ordering has a non-zero failure rate, how to build a prerequisite gate that blocks lookup_order and process_refund until get_customer returns a verified ID, how to decompose multi-concern requests and investigate them in parallel, and how to hand off to a human who never saw the transcript.',
    body: function () {
      return `
<p>Many agent workflows have steps that must happen in a fixed order: verify identity, then look up orders, then refund. Claude follows such instructions most of the time, which is exactly the problem: "most of the time" in a financial workflow means some refunds go to the wrong account. This chapter covers the three patterns task statement 1.4 tests: <b>programmatic enforcement</b> of ordering (prerequisite gates), <b>decomposition</b> of multi-concern requests into items investigated in parallel and synthesized into one answer, and <b>structured handoffs</b> when a case must move to a human mid-process. Hook mechanics (event types, return shapes, fail-closed design) are covered in chapter 1.5; here the focus is the workflow design that uses them.</p>

<h3>Prompt guidance vs programmatic enforcement</h3>
${H.table(['', 'Prompt-based guidance', 'Programmatic enforcement (hooks, prerequisite gates)'], [
  ['Where the rule lives', 'System prompt, few-shot examples, tool descriptions, CLAUDE.md', 'Your code: PreToolUse hook callback, tool wrapper, permission rules'],
  ['Compliance', 'Probabilistic: high but never 100%. Drifts with long context, adversarial users, model changes', 'Deterministic: the call cannot execute until the condition holds'],
  ['What happens on violation', 'The wrong call executes; you find out in audits', 'The call is blocked; Claude receives a reason and a next step'],
  ['Context cost', 'Tokens on every request', 'None, unless the hook returns text'],
  ['Right for', 'Preferred order, style, judgment, soft conventions', 'Identity before financial operations, approvals before writes, anything a regulator or auditor would ask about']
])}
${H.box('rule', 'The 1.4 principle:', 'When deterministic compliance is required (identity verification before a refund, KYC before account changes), prompt instructions alone have a non-zero failure rate. Keep the prompt for explanation quality, and put the ordering rule in code that sits between Claude and the tool.')}
<p>Probability arithmetic makes this concrete. If Claude skips verification in 1 of 200 conversations and the agent handles 20,000 conversations a month, that is about 100 unverified financial operations a month. No prompt wording changes the fact that the rate is above zero; a gate makes it zero for that failure mode.</p>

<h3>Sample question 1, dissected</h3>
<p>Production data shows that in 12% of cases the agent skips <code>get_customer</code> and calls <code>lookup_order</code> with only the customer's stated name, occasionally causing misidentified accounts and incorrect refunds.</p>
${H.table(['Option', 'Verdict', 'Why'], [
  ['A. Programmatic prerequisite that blocks <code>lookup_order</code> and <code>process_refund</code> until <code>get_customer</code> has returned a verified customer ID', '<b>Correct</b>', 'Critical business ordering with financial consequences needs a deterministic guarantee'],
  ['B. System prompt says verification via <code>get_customer</code> is mandatory', 'Wrong', 'Still probabilistic; the prompt very likely already implies this and the agent skipped it 12% of the time'],
  ['C. Few-shot examples always calling <code>get_customer</code> first', 'Wrong', 'Improves the rate, cannot guarantee it; errors with money attached need zero, not fewer'],
  ['D. Routing classifier that enables only the tool subset for each request type', 'Wrong', 'Solves tool <i>availability</i>, not tool <i>ordering</i>. A refund request legitimately needs all three tools, so the classifier enables them and the skip still happens']
])}

<h3>Designing the prerequisite gate</h3>
<p>Model the workflow as a small state machine held by your code (not by Claude). Each state defines which tools may execute.</p>
${H.table(['State', 'Entered when', 'Allowed tools', 'Blocked (with reason)'], [
  ['<b>UNVERIFIED</b>', 'Session starts', '<code>get_customer</code>, <code>escalate_to_human</code>', '<code>lookup_order</code>, <code>process_refund</code>: "verify the customer first"'],
  ['<b>VERIFIED(customer_id)</b>', '<code>get_customer</code> returned <code>verified: true</code> with a customer ID', '<code>lookup_order</code> for that customer, <code>get_customer</code>, <code>escalate_to_human</code>', '<code>process_refund</code> until the order was looked up for this customer'],
  ['<b>ORDER_LOADED(customer_id, order_ids)</b>', '<code>lookup_order</code> returned orders owned by the verified customer', '<code>process_refund</code> for those orders only (subject to the 1.5 amount hook)', 'Refunds for any other customer or order'],
  ['<b>ESCALATED</b>', '<code>escalate_to_human</code> succeeded', 'Read-only tools', '<code>process_refund</code>: "a human owns this case now"']
])}
<p>Three details separate a real gate from a checkbox:</p>
<ul>
<li><b>Key the gate to the entity.</b> "Some <code>get_customer</code> call succeeded" is not enough. If the customer mentions a second account, a verified flag for account A must not unlock refunds on account B. Compare <code>tool_input.customer_id</code> (and the order's owner) with the verified ID.</li>
<li><b>Set state from tool results, not from Claude's claims.</b> A PostToolUse hook (or the tool wrapper) records the verified ID from the actual <code>get_customer</code> response. Claude saying "I have verified the customer" changes nothing.</li>
<li><b>Deny reasons must say what to do.</b> "Blocked" invites retries and workarounds. "Call get_customer with the email or phone the customer provided, then retry" moves the workflow forward.</li></ul>

<pre class="code">// TypeScript, Agent SDK: prerequisite gate keyed to the verified customer
type CaseState = { verifiedCustomerId?: string; orderIds: Set&lt;string&gt;; escalated: boolean };
const cases = new Map&lt;string, CaseState&gt;();           // production: durable store keyed by session id
const stateFor = (sid: string) =&gt; {
  if (!cases.has(sid)) cases.set(sid, { orderIds: new Set(), escalated: false });
  return cases.get(sid)!;
};
const deny = (reason: string) =&gt; ({ hookSpecificOutput: {
  hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: reason } });

// PostToolUse: record facts from real tool results
const recordState = async (input: any) =&gt; {
  const s = stateFor(input.session_id);
  const data = parseToolJson(input.tool_response);       // your helper
  if (input.tool_name.endsWith("__get_customer") &amp;&amp; data?.verified === true) {
    s.verifiedCustomerId = data.customer_id;
    s.orderIds.clear();                                  // new identity: previous orders no longer valid
  }
  if (input.tool_name.endsWith("__lookup_order") &amp;&amp; data?.customer_id === s.verifiedCustomerId) {
    s.orderIds.add(data.order_id);
  }
  if (input.tool_name.endsWith("__escalate_to_human")) s.escalated = true;
  return {};
};

// PreToolUse: block downstream calls until prerequisites hold
const prerequisiteGate = async (input: any) =&gt; {
  const s = stateFor(input.session_id);
  const args = input.tool_input;
  if (!s.verifiedCustomerId) {
    return deny("Customer identity is not verified. Call get_customer with the identifier the " +
      "customer provided (email or phone). Do not look up orders by name.");
  }
  if (args.customer_id !== s.verifiedCustomerId) {
    return deny("This call targets a different customer than the one verified (" + s.verifiedCustomerId +
      "). Verify that customer with get_customer first.");
  }
  if (input.tool_name.endsWith("__process_refund")) {
    if (s.escalated) return deny("This case was escalated; a human agent owns refunds now.");
    if (!s.orderIds.has(args.order_id)) {
      return deny("Order " + args.order_id + " was not loaded for the verified customer. Call lookup_order first.");
    }
  }
  return {};                                             // no opinion: amount hook (1.5) and permissions still apply
};

const options = {
  hooks: {
    PreToolUse:  [{ matcher: "mcp__support__(lookup_order|process_refund)", hooks: [prerequisiteGate] }],
    PostToolUse: [{ matcher: "mcp__support__(get_customer|lookup_order|escalate_to_human)", hooks: [recordState] }],
  },
};</pre>
<p><b>Tool wrapper alternative.</b> If you run your own loop on the Client SDK, apply the same check inside the function that executes tool calls: before dispatching <code>process_refund</code>, read the session state; if the prerequisite is missing, do not call the backend and return a <code>tool_result</code> with <code>is_error: true</code> and the same actionable message. Hooks and wrappers are equivalent in guarantee; hooks keep policy separate from tool code, wrappers work without the Agent SDK. The strongest version also enforces it in the backend: the refund service rejects requests that lack a verification token issued by the identity service.</p>
${H.box('exam', 'Exam vs current docs:', 'The exam guide also teaches forcing the first call with <code>tool_choice</code> (<code>{"type": "tool", "name": "get_customer"}</code> or <code>"any"</code>) so a prerequisite runs first. On Claude Opus 5.5, Sonnet 5.5 and Fable 5.1 forced and any tool choice return a 400 error; Haiku 4.5 and older models still support them. Current equivalent: gate programmatically, for example expose only <code>get_customer</code> until it returns a verified ID, or use a PreToolUse gate as above. For exam answers, recognize forced tool choice as the guide\'s mechanism for "guarantee this tool is called first", and the prerequisite gate as the answer for "guarantee nothing downstream runs before it".')}

<h3>Multi-concern requests: decompose, investigate in parallel, synthesize</h3>
<p>"I was charged twice for order 4471, the blender in order 4502 arrived broken, and please update my address." Handled as one blob, the agent answers the first concern well and the others vaguely, or loses one entirely. The guide\'s pattern:</p>
<ol class="steps">
<li><b>Decompose</b> the message into distinct items, each with its own identifier and success condition (item 1: duplicate charge on 4471; item 2: damaged item on 4502; item 3: address change).</li>
<li><b>Establish shared context once</b>: verify the customer, load the account. Every item uses the same verified customer ID, so the gate is satisfied once and no item re-asks for identity.</li>
<li><b>Investigate in parallel</b>: independent lookups (billing records, order and shipment data, address record) are emitted in one response as parallel tool calls, or delegated to subagents with the shared context in their prompts.</li>
<li><b>Synthesize one unified resolution</b>: one reply that addresses every item, notes interactions (a replacement ships to the new address), and states what is done, what is pending and what needs a human.</li></ol>
${D({ w: 760, h: 280, title: 'Decompose, investigate in parallel with shared context, synthesize',
  groups: [{ x: 350, y: 15, w: 200, h: 245, label: 'PARALLEL INVESTIGATION', kind: 'soft' }],
  nodes: [
    { id: 'req', x: 20, y: 105, w: 140, h: 56, label: 'Customer message', sub: 'three concerns', kind: 'human' },
    { id: 'dec', x: 185, y: 105, w: 140, h: 56, label: 'Decompose', sub: 'distinct issue items', kind: 'agent' },
    { id: 'ctx', x: 185, y: 200, w: 140, h: 50, label: 'Shared case context', sub: 'verified customer_id', kind: 'store' },
    { id: 'i1', x: 365, y: 40, w: 170, h: 50, label: 'Item 1: double charge', sub: 'billing records', kind: 'sub' },
    { id: 'i2', x: 365, y: 115, w: 170, h: 50, label: 'Item 2: damaged item', sub: 'order + shipment', kind: 'sub' },
    { id: 'i3', x: 365, y: 190, w: 170, h: 50, label: 'Item 3: address change', sub: 'account record', kind: 'sub' },
    { id: 'syn', x: 585, y: 105, w: 155, h: 56, label: 'Synthesize', sub: 'one unified resolution', kind: 'good' }
  ],
  edges: [{ from: 'req', to: 'dec' }, { from: 'dec', to: 'i1' }, { from: 'dec', to: 'i2' }, { from: 'dec', to: 'i3' },
    { from: 'ctx', to: 'i3', dashed: true, label: 'shared' }, { from: 'i1', to: 'syn' }, { from: 'i2', to: 'syn' }, { from: 'i3', to: 'syn' }],
  caption: 'Identity is established once and shared by every item. Items are investigated concurrently, then merged into one reply that covers all of them and their interactions.' })}
${H.table(['Choice', 'Use when', 'Avoid when'], [
  ['Parallel tool calls in one turn', 'Items need a few independent lookups', 'One lookup depends on another result'],
  ['Subagents per item (with shared context in each prompt)', 'Items need deep, multi-step investigation', 'Simple lookups: extra latency and tokens'],
  ['Sequential handling', 'A later item depends on an earlier outcome (refund decision depends on the charge investigation)', 'Items are independent: it only adds latency']
])}

<h3>Structured handoffs to humans</h3>
<p>When a case escalates mid-process (refund above the limit, policy gap, customer asks for a person), the human agent usually works in a ticketing queue and <b>does not see the conversation transcript</b>. A handoff that says "customer upset about refund, please help" forces the human to re-verify, re-investigate and re-ask the customer. The handoff must be a self-contained case file. When to escalate (explicit criteria, honoring requests for a human, policy gaps) is chapter 5.2; this is what to send.</p>
<pre class="code">{
  "name": "escalate_to_human",
  "description": "Hands the case to a human support agent who cannot see this conversation. Use when a refund exceeds the automatic limit, policy does not cover the request, data conflicts cannot be resolved, or the customer asks for a human. The summary must be complete on its own: include every issue, what you already did, and what you recommend. Do not use for questions you can answer with the other tools. Returns a ticket id; tell the customer a person will follow up.",
  "strict": true,
  "input_schema": {
    "type": "object",
    "additionalProperties": false,
    "required": ["customer_id", "verification_status", "issues", "recommended_action", "urgency", "customer_summary"],
    "properties": {
      "customer_id": { "type": "string" },
      "verification_status": { "type": "string", "enum": ["verified", "partially_verified", "unverified"] },
      "customer_summary": { "type": "string", "description": "What the customer wants, in two or three sentences" },
      "issues": { "type": "array", "items": {
        "type": "object", "additionalProperties": false,
        "required": ["item", "order_id", "status", "root_cause", "actions_attempted"],
        "properties": {
          "item": { "type": "string" },
          "order_id": { "type": "string" },
          "status": { "type": "string", "enum": ["resolved", "pending_human", "blocked_by_policy", "needs_investigation"] },
          "root_cause": { "type": "string", "description": "Finding with evidence, or 'unknown' plus what was checked" },
          "actions_attempted": { "type": "array", "items": { "type": "string" } },
          "refund_amount": { "type": "number", "description": "USD requested or proposed, if any" },
          "policy_references": { "type": "array", "items": { "type": "string" } }
        } } },
      "contested_data": { "type": "array", "items": { "type": "string" },
        "description": "Conflicting facts with their sources, e.g. carrier says delivered, customer says not received" },
      "recommended_action": { "type": "string" },
      "urgency": { "type": "string", "enum": ["low", "normal", "high"] }
    }
  }
}</pre>
${H.table(['Field', 'Why the human needs it'], [
  ['<code>customer_id</code> + <code>verification_status</code>', 'No re-verification; the human knows whether identity is trustworthy'],
  ['<code>issues[]</code> with per-item <code>status</code>', 'Multi-concern cases stay separated; resolved items are not redone'],
  ['<code>root_cause</code>', 'The investigation is not repeated; "unknown, checked X and Y" is still useful'],
  ['<code>actions_attempted</code>', 'Avoids duplicate refunds or repeated failed steps'],
  ['<code>refund_amount</code>, <code>policy_references</code>', 'The approval decision can be made directly against the rule that triggered escalation'],
  ['<code>contested_data</code>', 'Conflicts are surfaced with sources instead of silently resolved by the agent'],
  ['<code>recommended_action</code>, <code>urgency</code>', 'Queue prioritization and a fast yes/no decision']
])}
${H.box('rule', 'Handoff checklist:', 'Customer ID, verified status, each issue with root cause and actions taken, amounts, policy references, conflicting data with sources, recommended action, urgency. Strict tool use guarantees the fields exist and have the right types; it does not guarantee they are true, so fill IDs and amounts from session state in code where possible and validate the rest.')}

<h3>Design decisions</h3>
${H.table(['If the situation is', 'Choose', 'Because', 'You give up'], [
  ['A step must precede another for financial, legal or safety reasons', 'Prerequisite gate (PreToolUse hook or tool wrapper)', 'Deterministic ordering, auditable denies', 'Some engineering; legitimate edge cases need an explicit path'],
  ['Order is a preference (search docs before asking the user)', 'Prompt guidance or tool descriptions', 'Flexibility; a gate would block valid variations', 'Guarantee'],
  ['A value must stay under a limit', 'PreToolUse amount hook with escalation redirect (1.5)', 'Blocks before money moves', 'Nothing relevant'],
  ['Gate must survive restarts and resumed sessions', 'Durable state store keyed by session or case id', 'In-memory state is lost with the process', 'A store to operate'],
  ['Request has several independent concerns', 'Decompose, parallel investigation, single synthesis', 'Coverage and latency', 'A synthesis step'],
  ['Human takes over mid-case', 'Structured handoff via a strict-schema tool', 'Human acts without the transcript', 'Schema maintenance']
])}

${H.box('real', 'Real-world notes:', '<ul><li><b>Audit log:</b> record every gate decision (session id, tool, input, state, decision, reason). Auditors ask "prove no refund ran without verification"; a deny log plus the refund ledger answers that. A rising deny rate is also an early signal of a prompt or model regression.</li><li><b>Idempotency keys:</b> pass a key such as case id + order id + amount to <code>process_refund</code> so a retry after a timeout cannot refund twice. The gate controls <i>whether</i> a call may run; idempotency controls <i>how many times</i> it takes effect.</li><li><b>State storage and resumption:</b> gate state lives in your process, not in Claude\'s conversation. When a session is resumed (possibly on another host, or with a session store adapter on serverless), reload the case state from the store; never rebuild it from what Claude says in the transcript. Consider expiring verification after a time window.</li><li><b>Defense in depth:</b> the agent-side gate plus a backend check (refund API requires a verification token) means a bug in one layer is not an incident.</li><li><b>Testing:</b> unit-test the gate for each transition: refund before verification, refund for another customer, refund for an unloaded order, refund after escalation. Add should-block and should-allow cases to regression evals and grade the outcome (ledger state), not what the agent claims.</li><li><b>Handoff quality:</b> sample escalations and ask the human agents whether they needed to re-ask the customer anything; each "yes" is a missing field.</li></ul>')}

${H.box('trap', 'Distractors and why they fail:', '<ul><li><b>"Make verification mandatory in the system prompt" / "add IMPORTANT"</b>: probabilistic; the failure rate stays above zero.</li><li><b>"Few-shot examples of verifying first"</b>: better rate, no guarantee.</li><li><b>"Routing classifier that limits tools per request type"</b>: availability, not ordering.</li><li><b>"Gate on a boolean verified flag"</b> not tied to the customer ID: account B can be refunded after verifying account A.</li><li><b>"Trust the agent\'s statement that it verified"</b>: state must come from the tool result.</li><li><b>"Check after the refund with PostToolUse"</b>: the money already moved.</li><li><b>"Handoff = paste the full transcript"</b> or <b>"one-line summary"</b>: the first buries the facts, the second omits them; send structured fields.</li><li><b>"Handle multi-concern requests one message at a time"</b> or <b>"answer only the first concern"</b>: loses items; decompose and synthesize.</li></ul>')}

<h3>Worked scenario</h3>
<p>A support agent handles "I was double-charged $320 on order 8812 and my headphones from order 8830 ($640) never arrived." Current design: a system prompt says to verify first; refunds above $500 require a human. Audits show 4% of sessions called <code>lookup_order</code> before <code>get_customer</code>, and human agents complain that escalations say only "customer wants refund for missing item".</p>
<ol class="steps">
<li><b>Ordering:</b> add the prerequisite gate. <code>lookup_order</code> and <code>process_refund</code> are denied until <code>get_customer</code> returns a verified ID, and the gate checks that each call targets that ID and a loaded order. The prompt rule stays, for explanation quality only.</li>
<li><b>Decompose:</b> two items. After verification, look up billing for 8812 and shipment status for 8830 in parallel.</li>
<li><b>Item 1:</b> duplicate charge confirmed, $320 is under the limit; the gate and amount hook allow the refund, sent with an idempotency key.</li>
<li><b>Item 2:</b> $640 exceeds $500. The amount hook (1.5) denies <code>process_refund</code> and redirects to <code>escalate_to_human</code>. The carrier shows "delivered", the customer says not received: that goes in <code>contested_data</code>.</li>
<li><b>Handoff:</b> customer ID, verified, item 1 resolved (refund $320, reference), item 2 pending_human with refund_amount 640, the $500 policy reference, root cause "carrier shows delivered, customer disputes", actions attempted, recommended action "approve replacement or refund after carrier trace", urgency normal.</li>
<li><b>Synthesis:</b> one reply to the customer covering both items: the $320 refund is done; the headphones case is with a specialist, and what happens next.</li></ol>

${H.check([
  ['An agent calls <code>lookup_order</code> by customer name in 12% of sessions despite a system prompt requiring <code>get_customer</code> first. Best fix?', 'A programmatic prerequisite that blocks <code>lookup_order</code> and <code>process_refund</code> until <code>get_customer</code> has returned a verified customer ID. Prompt and few-shot fixes remain probabilistic; a routing classifier addresses which tools exist, not their order.'],
  ['Your gate stores <code>verified = true</code> after any successful <code>get_customer</code>. What can go wrong, and how do you fix it?', 'A customer verifies account A, then asks for a refund on account B, and the flag unlocks it. Store the verified customer ID from the tool result and require every downstream call\'s customer_id (and the order\'s owner) to match it.'],
  ['What should the deny reason from the gate contain?', 'The rule that was violated and the next step: which tool to call with which input ("Call get_customer with the email or phone the customer provided, then retry"). Vague reasons lead to retries or workarounds.'],
  ['A customer raises three unrelated problems in one message. How should the agent handle it?', 'Split it into distinct items, verify identity once as shared context, investigate independent items in parallel (parallel tool calls or subagents with the shared context in their prompts), then send one unified resolution covering every item and their interactions.'],
  ['A $700 refund is escalated. The human queue shows only "customer wants a refund". What must the handoff contain?', 'Customer ID and verification status, each issue with root cause and actions attempted, the refund amount, the policy reference that triggered escalation, conflicting data with sources, a recommended action and urgency. The human cannot see the transcript.'],
  ['The support service restarts and a session is resumed. Refunds are now blocked for a verified customer, or worse, allowed without verification. Root cause?', 'Gate state was held in memory. Persist case state in a durable store keyed by session or case id and reload it on resume; never infer it from the conversation.']
])}
${H.src([['Agent SDK: hooks', 'https://code.claude.com/docs/en/agent-sdk/hooks'], ['Claude Code hooks reference', 'https://code.claude.com/docs/en/hooks'], ['Agent SDK: sessions', 'https://code.claude.com/docs/en/agent-sdk/sessions'], ['Define tools', 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools'], ['Structured outputs', 'https://platform.claude.com/docs/en/build-with-claude/structured-outputs'], ['Writing tools for agents', 'https://www.anthropic.com/engineering/writing-tools-for-agents']])}`;
    }
  });
})();
