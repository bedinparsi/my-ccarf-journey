/* Architect Handbook · Part 5 (a): long-interaction context (5.1), escalation and ambiguity (5.2), error propagation (5.3). */
(function () {
  var H = CCAR.hb, D = H.D;

  /* ------------------------------------------------------------------ 5.1 */
  CCAR.lessons.push({
    id: 'hb-51-long-context', track: 'handbook', part: 'P5', num: '5.1', order: 501, domain: 'D5',
    objs: ['O21', 'O18', 'O20'], ts: ['5.1'], minutes: 35,
    title: 'Preserving critical information across long interactions',
    summary: 'Context rot and the attention budget, why progressive summarization destroys transactional facts, persistent case-facts blocks, position effects, tool-result trimming, structured upstream outputs, and the platform features (compaction, context editing, memory) that help but do not replace design.',
    body: function () {
      return `
<p>Long interactions fail quietly. A support session that started with "$214.37 refund, promised by Friday 14 June" ends 40 turns later with the agent saying "about $200 in a few days". A research synthesis omits the finding that sat in the middle of a 60-page aggregate. Nothing crashed; the right tokens were simply lost, diluted or never re-sent. The exam probes whether you design <b>what</b> the model sees on every request (case facts, trimmed tool results, ordered inputs, structured upstream outputs) instead of hoping a bigger window or more summarization will fix it.</p>

<h3>Why context degrades</h3>
${H.table(['Mechanism', 'What happens', 'Design response'], [
  ['<b>Context rot</b>', 'Recall degrades as token count grows. Context is a finite <b>attention budget</b>: every low-value token competes with the facts that matter.', 'Aim for the smallest set of high-signal tokens. Trim, clear and isolate.'],
  ['<b>Stateless API</b>', 'The model remembers nothing between calls. Each request carries the full conversation you want it to see.', 'Pass complete history (or a deliberately curated version) on every request. What you drop is gone.'],
  ['<b>Progressive summarization</b>', 'Each summary pass condenses numbers, percentages, dates and customer-stated expectations into vague phrases.', 'Keep transactional facts in a persistent block outside the summarized history.'],
  ['<b>Lost in the middle</b>', 'Models reliably process the beginning and end of long inputs but may omit findings from middle sections.', 'Key-findings summary at the top, explicit section headers, query at the end.'],
  ['<b>Tool result accumulation</b>', 'Every lookup stays in history. 40+ fields per order lookup when 5 matter; after 10 lookups most of the context is noise.', 'Trim to relevant fields in the tool or a PostToolUse hook; clear old results.']
])}
${H.box('trap', 'The 1M-token trap:', 'Opus 5.5, Sonnet 5.5 and Fable 5.1 have 1M-token windows (Haiku 4.5: 200K). A larger window delays truncation; it does not stop attention dilution, the lost-in-the-middle effect, or the cost of re-sending noise on every turn. "Switch to a model with a bigger context window" is almost never the exam answer for lost facts.')}

<h3>Pass the complete history, deliberately</h3>
<p>Because the Messages API is stateless, conversational coherence depends on your code re-sending prior turns. A loop that sends only the latest user message produces an agent that asks for the order number again. In the Agent SDK and Claude Code the harness keeps the history for you, and resuming a session by <code>session_id</code> restores the full context. "Complete" does not mean "unfiltered": you decide which parts are verbatim (recent turns, the case-facts block), which are summarized (old chit-chat) and which are cleared (stale tool output).</p>

<h3>Progressive summarization: what it destroys</h3>
${H.table(['Original turn content', 'After two summary passes', 'Consequence'], [
  ['Refund of <b>$214.37</b> for order <b>#88412</b>', '"a refund of around $200"', 'Agent issues the wrong amount or quotes the wrong figure'],
  ['Discount of <b>12.5%</b> approved by supervisor', '"a discount was discussed"', 'Commitment silently dropped'],
  ['Delivery promised by <b>Friday 14 June</b>', '"delivery soon"', 'Missed SLA, customer re-contacts'],
  ['"I need it before my daughter\'s wedding on the 20th, otherwise cancel"', '"customer wants fast delivery"', 'The customer-stated expectation (and its condition) is lost'],
  ['Status <b>RETURN_LABEL_SENT</b>', '"return in progress"', 'Agent re-sends a label or skips a step']
])}
<p>Summarization is fine for narrative ("customer was polite, discussed shipping options"). It is wrong for values the agent must act on. Extract those into structured state that is never summarized.</p>

<h3>The persistent case-facts block</h3>
<p>Your application (not the model's memory) maintains a block of transactional facts: amounts, dates, order numbers, statuses and promises. It is rebuilt from structured state and included in <b>every</b> prompt, outside the summarized history. When older turns are summarized or compacted, the block survives unchanged.</p>
<pre class="code">&lt;case_facts updated="turn 31"&gt;
customer_id: C-20931 (verified via get_customer, turn 2)
issue_1: order #88412 · damaged blender · refund $214.37 approved turn 9 · status REFUND_PENDING
issue_2: order #88590 · late delivery · promised delivery Fri 14 June (agent commitment, turn 17)
issue_3: order #88601 · wrong size · exchange requested · status AWAITING_RETURN · label sent turn 26
customer_expectations:
  - "Must arrive before 20 June or cancel issue_2" (stated turn 15)
open_commitments:
  - email refund confirmation for issue_1 within 24h
&lt;/case_facts&gt;

&lt;conversation_summary&gt; …older turns, narrative only… &lt;/conversation_summary&gt;
…last N turns verbatim…</pre>
${H.table(['Skill (exam guide)', 'How to do it', 'Why'], [
  ['Extract transactional facts into a persistent case-facts block', 'Update structured state in code after each relevant tool result or customer statement; render it into each request', 'Survives summarization and compaction; exact values stay exact'],
  ['Separate context layer for multi-issue sessions', 'One structured record per issue (order ID, amount, status, next step), keyed by issue', 'Prevents cross-contamination ("the $214.37 was for which order?") and lets the agent resume any issue'],
  ['Trim verbose tool outputs before they accumulate', 'Keep only return-relevant fields from order lookups (order ID, items, purchase date, status, amount paid)', 'Tokens are spent on facts that matter; noise does not dilute attention'],
  ['Key-findings summary first, explicit section headers', 'Aggregated inputs open with a findings digest, then detailed sections with headers', 'Counters lost-in-the-middle; the digest points into the sections'],
  ['Subagents include metadata in structured outputs', 'Dates, source locations (URL, page, file:line), methodological context per finding', 'Synthesis can resolve apparent conflicts (2021 vs 2024 figures) and cite correctly'],
  ['Upstream agents return structured data when downstream context is limited', 'Key facts, citations, relevance scores instead of verbose content and reasoning chains', 'A synthesis agent with a small budget receives signal, not transcripts']
])}

${D({ w: 760, h: 300, title: 'What each request carries in a long support session',
  groups: [{ x: 10, y: 30, w: 330, h: 260, label: 'NEVER SUMMARIZED', kind: 'hard' }, { x: 420, y: 30, w: 330, h: 260, label: 'CURATED / SUMMARIZED', kind: 'soft' }],
  nodes: [
    { id: 'sys', x: 30, y: 56, w: 290, h: 46, label: 'System prompt + tools', sub: 'stable prefix, prompt-cached', kind: 'agent' },
    { id: 'cf', x: 30, y: 122, w: 290, h: 46, label: 'Case-facts block', sub: 'amounts, dates, IDs, promises', kind: 'good' },
    { id: 'iss', x: 30, y: 188, w: 290, h: 46, label: 'Per-issue records', sub: 'issue_1..n: order, amount, status', kind: 'store' },
    { id: 'sum', x: 440, y: 56, w: 290, h: 46, label: 'Summary of old turns', sub: 'narrative only, no numbers needed', kind: 'note' },
    { id: 'rec', x: 440, y: 122, w: 290, h: 46, label: 'Recent turns verbatim', sub: 'last N exchanges', kind: 'sub' },
    { id: 'tr', x: 440, y: 188, w: 290, h: 46, label: 'Trimmed tool results', sub: '5 relevant fields, old ones cleared', kind: 'tool' },
    { id: 'code', x: 250, y: 250, w: 260, h: 34, label: 'App code updates state', kind: 'human' }
  ],
  edges: [{ from: 'code', to: 'iss', dashed: true }, { from: 'tr', to: 'code', dashed: true, label: 'extract facts' }],
  caption: 'Your code extracts facts from tool results and customer statements into structured state, then renders the left column verbatim on every request. Only the right column is ever summarized, compacted or cleared.' })}

<h3>Lost in the middle: ordering aggregated inputs</h3>
<pre class="code">&lt;key_findings&gt;            ← top: the digest the model must not miss
1. Battery pack cost fell 22% 2022→2024 (see §2, source S3)
2. Two sources conflict on 2030 capacity (see §4, contested)
3. No data found for sodium-ion (see §6, coverage gap)
&lt;/key_findings&gt;

## §1 Market size          ← explicit section headers
…
## §4 Capacity forecasts (contested)
…
&lt;task&gt;Write the executive summary. Cite section and source for every claim.&lt;/task&gt;   ← query at the end</pre>
<p>This combines two documented practices: for long inputs (20K+ tokens) put long documents at the top and the query and instructions at the end, wrapped in XML with metadata; and ask Claude to quote the relevant parts first. The exam guide adds the key-findings summary and section headers so middle content is reachable by reference.</p>

<h3>Tool results: trim at the source</h3>
<p>An order lookup returning 40+ fields (warehouse codes, internal SKUs, audit timestamps, carrier metadata) when a return decision needs 5 costs tokens on every later turn. Trim before the result enters history:</p>
${H.table(['Where', 'How', 'When to choose it'], [
  ['<b>Tool design</b> (you own the tool or MCP server)', 'Return only high-signal fields; offer a <code>response_format</code> (concise | detailed) parameter; paginate and filter', 'Best default. Concise responses can be about a third of the tokens.'],
  ['<b>PostToolUse hook</b>', 'Replace the result with a trimmed version (<code>updatedToolOutput</code>) before the model sees it', 'Third-party tools you cannot change; normalization (dates, status codes) at the same time'],
  ['<b>Context editing</b> (API)', 'Tool result clearing (<code>clear_tool_uses_20250919</code>) removes the oldest tool results past a threshold and leaves a placeholder; <code>clear_at_least</code> makes each clearing worth the cache invalidation', 'Long agent loops where old results are no longer needed; the client keeps full history'],
  ['<b>Extract then drop</b>', 'Copy the facts you need into the case-facts block, then let the raw result be cleared', 'Support sessions with many lookups']
])}
<pre class="code">// Tool-side trimming for a return workflow (TypeScript, your MCP server or custom tool)
const RETURN_FIELDS = ["order_id", "status", "purchase_date", "items", "amount_paid"] as const;

async function lookupOrder(orderId: string, format: "concise" | "detailed" = "concise") {
  const full = await ordersApi.get(orderId);            // 40+ fields
  if (format === "detailed") return full;
  return Object.fromEntries(RETURN_FIELDS.map(k =&gt; [k, full[k]]));  // 5 fields
}</pre>

<h3>Multi-agent: structured outputs with metadata</h3>
<div class="two"><div><h4 class="bad-h">Verbose upstream output</h4><pre class="code">"I searched several sources. First I looked
at the IEA report, which discusses many
things... After considering the evidence I
believe costs fell by roughly a fifth..."
(3,000 tokens of reasoning, no dates)</pre></div>
<div><h4 class="good-h">Structured upstream output</h4><pre class="code">{ "findings": [{
    "claim": "Pack cost fell 22% (2022→2024)",
    "source": { "url": "…", "page": 14,
                "published": "2024-06" },
    "method": "survey of 38 projects",
    "relevance": 0.9 }],
  "coverage_gaps": ["sodium-ion"] }</pre></div></div>
<p>Dates, source locations and methodological context let the synthesis agent tell a real conflict from a temporal difference, and cite precisely. When the downstream agent has a limited context budget, the upstream agent returns key facts, citations and relevance scores, and writes any full text to files it references by path (lightweight references instead of a game of telephone). Subagent summaries in Anthropic\'s guidance are condensed to about 1,000 to 2,000 tokens.</p>

<h3>Platform features that help</h3>
${H.table(['Feature', 'What it does', 'Watch out for'], [
  ['<b>Compaction</b>', 'Summarizes the conversation near the limit. Server-side compaction is preferred on the API; Claude Code and the Agent SDK auto-compact and emit a <code>compact_boundary</code>. Manual: <code>/compact &lt;instructions&gt;</code> (for example "keep all amounts, order IDs and commitments").', 'Early instructions given only in conversation may be lost. Persistent rules belong in CLAUDE.md, which is re-injected after compaction. Compaction instructions can live in CLAUDE.md; a PreCompact hook can archive the transcript.'],
  ['<b>Context editing</b>', 'Server-side clearing of old tool results and of thinking blocks (<code>clear_thinking_20251015</code>)', 'Cleared content is gone from the model\'s view; extract needed facts first'],
  ['<b>Memory tool / note files</b>', 'File-based memory outside the context window (memory tool, NOTES.md, progress files)', 'The agent must be told what to write and when to read it back'],
  ['<b>Subagents</b>', 'Verbose exploration runs in an isolated context; only the final message returns', 'The subagent does not see the parent conversation; pass what it needs in the prompt'],
  ['<b>Just-in-time retrieval</b>', 'Keep identifiers (paths, queries, links) and load content on demand', 'Needs good search tools and descriptions']
])}

<h3>Decision table: which technique</h3>
${H.table(['If the situation is', 'Choose', 'Because', 'You give up'], [
  ['Exact values must survive a long conversation', 'Case-facts block + per-issue records', 'Deterministic, never summarized', 'Code to extract and maintain state'],
  ['Long conversational flow approaching the limit', 'Compaction (with instructions to preserve facts)', 'Keeps flow without manual pruning', 'Detail from older turns; relies on the summary'],
  ['Many old tool results no longer needed', 'Context editing (tool result clearing)', 'Removes the biggest noise source', 'A cache invalidation per clear (hence <code>clear_at_least</code>)'],
  ['Multi-hour or multi-window work with milestones', 'Structured notes / memory tool / progress files + git', 'State lives outside the window; a fresh session can resume', 'Discipline in writing notes'],
  ['A side task would flood the context (exploration, research)', 'Subagent returning a condensed summary', 'Isolation; parent stays clean', 'Tokens (multi-agent is costly) and the subagent lacks parent context'],
  ['Verbose tool output every call', 'Trim in tool design or PostToolUse', 'Fixes it before accumulation', 'Engineering effort; risk of trimming a needed field'],
  ['Long aggregated input for synthesis', 'Key-findings digest first, section headers, query last', 'Counters position effects', 'Preprocessing step']
])}
${H.box('real', 'Real-world notes:', 'Log token usage per turn and per source (system, history, tool results) so you can see what is eating the window. Write eval cases that span 30+ turns and assert exact amounts and dates in the final answer; short evals never catch summarization loss. Starting a fresh session that reads a progress file can beat compaction for long-running agents. Keep the case-facts block after the cached prefix, because it changes every turn and would otherwise break prompt caching.')}
${H.box('exam', 'Exam vs current docs:', 'The exam guide describes the patterns (case facts, trimming, position effects) without naming platform features. Current docs add compaction, context editing and the memory tool. If an option names one of those, it is valid only if it keeps the critical facts exact; the guide\'s structured case-facts answer still wins for amounts and dates.')}
${H.box('trap', 'Distractors:', '<ul><li>"Summarize more aggressively" (loses precision faster).</li><li>"Bigger context window" (attention still dilutes; cost grows).</li><li>"Tell the model to remember the amounts" (probabilistic; nothing re-sends them).</li><li>"Send only the latest message to save tokens" (the API is stateless; coherence breaks).</li><li>"Have the subagent return its full reasoning so synthesis has everything" (floods a limited budget).</li><li>"Put the key finding in the middle with the other details" or "put the question first, documents after" (position effects).</li></ul>')}

<h3>Worked scenario</h3>
<p>A support agent handles sessions with three or four issues each. After about 30 turns, QA finds it quoting wrong refund amounts, mixing up which order had which problem, and forgetting a delivery date it promised. Each <code>lookup_order</code> returns 45 fields; history is summarized every 10 turns.</p>
<ol class="steps">
<li><b>Diagnose:</b> the amounts and dates were in the summarized region; tool results dominate the window; issues share one undifferentiated history.</li>
<li><b>Fix the facts:</b> extract amounts, dates, order IDs, statuses and promises into a case-facts block with one record per issue, rendered into every request outside the summary.</li>
<li><b>Fix the noise:</b> make <code>lookup_order</code> return the 5 return-relevant fields by default (or trim in PostToolUse), and clear stale results.</li>
<li><b>Verify:</b> add 30+ turn eval conversations with multiple issues and assert exact values in the final responses.</li></ol>
<p>Rejected: moving to a larger window (dilution remains), summarizing more often (worse), a prompt line "always remember amounts" (no mechanism re-sends them).</p>

${H.check([
  ['A 25-turn session summary says "customer was offered a partial refund". The customer insists it was $87.50. What design change prevents this?', 'A persistent case-facts block maintained by code, containing the exact amount, order ID and turn, included in every prompt outside the summarized history. Summaries are for narrative, not transactional values.'],
  ['A synthesis agent consistently misses findings from the middle of a 50-page aggregated input. Two changes?', 'Put a key-findings summary at the top that references sections, and organize detailed results under explicit section headers; keep the instruction or query at the end.'],
  ['Order lookups return 40+ fields; the agent only needs 5 for returns. You cannot change the vendor tool. Where do you trim?', 'In a PostToolUse hook that replaces the output with the relevant fields before the model sees it. If you owned the tool, trim in the tool design (concise default).'],
  ['Your synthesis agent has a small context budget and receives 3,000-token narrative reports from each of five subagents. What do you change upstream?', 'Have subagents return structured data: key facts, citations (URL, page, date), methodological context and relevance scores, with full text in files referenced by path.'],
  ['Claude Code auto-compacted a long session and now ignores a naming rule you typed in turn 3. Why, and what fixes it?', 'Instructions given only in conversation can be lost in compaction. Put persistent rules in project CLAUDE.md, which is re-injected after compaction.'],
  ['Would the 1M-token window on Opus 5.5 remove the need for case facts and trimming?', 'No. It delays hard truncation but not context rot, position effects or the cost of re-sending noise. The smallest high-signal context still performs best.']
])}
${H.src([['Effective context engineering for AI agents', 'https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents'], ['Context editing', 'https://platform.claude.com/docs/en/build-with-claude/context-editing'], ['Prompting best practices (long context)', 'https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices'], ['Writing tools for agents', 'https://www.anthropic.com/engineering/writing-tools-for-agents'], ['Claude Code best practices', 'https://code.claude.com/docs/en/best-practices'], ['Multi-agent research system', 'https://www.anthropic.com/engineering/multi-agent-research-system']])}`;
    }
  });

  /* ------------------------------------------------------------------ 5.2 */
  CCAR.lessons.push({
    id: 'hb-52-escalation', track: 'handbook', part: 'P5', num: '5.2', order: 502, domain: 'D5',
    objs: ['X05', 'O22'], ts: ['5.2'], minutes: 30,
    title: 'Escalation and ambiguity resolution',
    summary: 'When an agent should hand off to a human and when it should resolve or ask, why sentiment and self-rated confidence are poor triggers, how to write explicit escalation criteria with few-shot examples, and how to measure calibration.',
    body: function () {
      return `
<p>An agent that escalates too often misses its first-contact resolution (FCR) target and wastes human time; one that escalates too rarely grants exceptions it has no authority for. Both are calibration failures, and both usually come from <b>unclear decision boundaries</b> in the prompt, not from the model. The exam tests the triggers that are appropriate, the ones that are not, the special case of a customer who asks for a human, how to handle ambiguity (policy gaps, multiple matching records), and the proportionate fix: explicit criteria plus few-shot examples.</p>

<h3>Triggers and non-triggers</h3>
${H.table(['Situation', 'Escalate?', 'Correct behavior'], [
  ['Customer <b>explicitly asks for a human</b> ("let me talk to a person")', '<b>Yes, immediately</b>', 'Honor it without first investigating or trying to resolve. Hand off with a structured summary.'],
  ['<b>Policy exception</b> needed (refund outside window, goodwill credit beyond limits)', 'Yes', 'The agent lacks authority. Escalate with the facts and the requested exception.'],
  ['<b>Policy gap</b>: policy is silent or ambiguous on this request (competitor price match when policy covers only own-site price adjustments)', 'Yes', 'Do not invent policy in either direction. Escalate and say why.'],
  ['<b>Unable to make meaningful progress</b> (repeated tool failures, missing data, loop without advancing)', 'Yes', 'Escalate with what was tried and partial results.'],
  ['Customer frustrated, but the issue is <b>straightforward and in policy</b>', 'Not yet', 'Acknowledge the frustration, offer the resolution. Escalate only if the customer <b>reiterates</b> they want a human.'],
  ['Standard in-policy case (damage replacement with photo evidence)', 'No', 'Resolve autonomously. Escalating these is what drags FCR down.'],
  ['Case is long or "complex" but fully covered by policy and tools', 'No', 'Complexity alone is not a trigger; missing authority or policy coverage is.'],
  ['Tool returns <b>multiple customer matches</b>', 'No, clarify', 'Ask for an additional identifier (email, order number, postcode). Never pick one by heuristic.']
])}

${D({ w: 760, h: 320, title: 'Escalation decision flow',
  nodes: [
    { id: 'in', x: 20, y: 20, w: 170, h: 44, label: 'Customer turn', kind: 'human' },
    { id: 'q1', x: 230, y: 20, w: 220, h: 44, label: 'Explicit human request?', kind: 'note' },
    { id: 'esc', x: 560, y: 20, w: 180, h: 44, label: 'Escalate now', sub: 'structured handoff', kind: 'bad' },
    { id: 'q2', x: 230, y: 94, w: 220, h: 44, label: 'Identity ambiguous?', sub: 'multiple matches', kind: 'note' },
    { id: 'ask', x: 560, y: 94, w: 180, h: 44, label: 'Ask for identifier', sub: 'email, order no.', kind: 'sub' },
    { id: 'q3', x: 230, y: 168, w: 220, h: 44, label: 'Policy covers request?', sub: 'silent / exception → no', kind: 'note' },
    { id: 'esc2', x: 560, y: 168, w: 180, h: 44, label: 'Escalate', sub: 'gap or exception, with facts', kind: 'bad' },
    { id: 'q4', x: 230, y: 242, w: 220, h: 44, label: 'Can make progress?', kind: 'note' },
    { id: 'res', x: 20, y: 242, w: 170, h: 44, label: 'Resolve', sub: 'acknowledge + offer fix', kind: 'good' }
  ],
  edges: [
    { from: 'in', to: 'q1' }, { from: 'q1', to: 'esc', label: 'yes' }, { from: 'q1', to: 'q2', label: 'no' },
    { from: 'q2', to: 'ask', label: 'yes' }, { from: 'q2', to: 'q3', label: 'no' },
    { from: 'q3', to: 'esc2', label: 'no' }, { from: 'q3', to: 'q4', label: 'yes' },
    { from: 'q4', to: 'res', label: 'yes' }, { from: 'q4', to: 'esc2', label: 'no', dashed: true }
  ],
  caption: 'Sentiment and self-rated confidence are not on this diagram on purpose. A frustrated customer with an in-policy issue goes to Resolve; if they then repeat that they want a human, the first check fires.' })}

<h3>Explicit request vs frustration</h3>
<div class="two"><div><h4 class="good-h">Explicit demand: escalate now</h4><pre class="code">Customer: I don't want to go through this
again. Get me a human.

Agent: Understood. I'm connecting you with a
member of our team now and passing along your
order number and what you've told me, so you
won't need to repeat it.</pre></div>
<div><h4 class="good-h">Frustration, simple issue: offer first</h4><pre class="code">Customer: This is the second broken blender.
Ridiculous.

Agent: I'm sorry, that's frustrating. I can
send a replacement today at no cost, or refund
the $89.99 now. Which would you prefer? If
you'd rather speak with a person, I can
arrange that too.</pre></div></div>
<p>The distinction is <b>explicit request</b> vs <b>emotional tone</b>. "Investigate first, then offer a human" ignores a clear instruction from the customer; escalating every angry message escalates cases the agent could close in one turn.</p>

<h3>Ambiguity: policy gaps and multiple matches</h3>
${H.table(['Ambiguity', 'Wrong', 'Right', 'Why'], [
  ['Policy allows price adjustments for drops on <b>our own site</b>; customer asks to match a <b>competitor</b>', 'Approve (it is "like" a price adjustment) or refuse (policy does not mention it)', 'Escalate: policy is silent on this specific request', 'Either autonomous choice invents policy; a human owns the gap'],
  ['<code>get_customer</code> returns 3 accounts named "J. Smith"', 'Pick the most recent, the one with the most orders, or the closest name match', 'Ask for an additional identifier and re-query', 'A heuristic pick risks acting on the wrong account (privacy, wrong refund)'],
  ['Customer statement conflicts with system record (says paid $120, record shows $102)', 'Silently trust either value', 'Ask, or record both with sources in the handoff', 'Contested data must stay visible']
])}
<pre class="code">// Tool result → agent behavior
{ "matches": [
    { "customer_id": "C-1102", "name": "J. Smith", "city": "Leeds" },
    { "customer_id": "C-4471", "name": "J. Smith", "city": "Leeds" } ] }

Agent: I found more than one account under that name. Could you give me the
email address on the account or a recent order number?</pre>

<h3>Why sentiment and self-reported confidence fail</h3>
${H.table(['Proxy', 'What it measures', 'Why it misroutes'], [
  ['<b>Sentiment analysis</b>', 'How upset the customer sounds', 'Angry customers often have simple problems; calm customers ask for policy exceptions. Sentiment does not correlate with case complexity.'],
  ['<b>Self-reported confidence</b> (1 to 10)', 'The model\'s own stated certainty', 'Poorly calibrated. An agent that is already wrongly confident on hard cases will report high confidence on exactly those cases.'],
  ['<b>Separate classifier</b> on historical tickets', 'Learned escalation patterns', 'Not wrong in principle, but over-engineered as a first step: needs labeled data and ML infrastructure when prompt criteria have not been tried.'],
  ['<b>Explicit criteria + few-shot examples</b>', 'The actual decision boundary', 'Addresses the root cause. Proportionate first fix.']
])}

<h3>Writing the criteria: system prompt block</h3>
<pre class="code">&lt;escalation_policy&gt;
Hand the conversation to a human (call escalate_to_human) when any of these holds:
1. The customer explicitly asks for a person. Do this immediately; do not investigate first.
2. Resolving the request needs an exception to policy (outside the 30-day window,
   credit above your limit, waiving a fee).
3. Policy does not address the specific request. Example: price adjustments cover
   our own site only, so a competitor price match is a gap.
4. You cannot make progress after checking the relevant tools.

Resolve it yourself when the request is covered by policy and your tools, even if the
customer is upset or the conversation is long. Acknowledge frustration and offer the fix.
If a lookup returns more than one customer, ask for another identifier.
&lt;/escalation_policy&gt;

&lt;examples&gt;
&lt;example&gt;
Customer: Blender arrived cracked, photo attached. I want a replacement.
Decision: RESOLVE. Damage with photo evidence is a standard replacement.
&lt;/example&gt;
&lt;example&gt;
Customer: BestMart sells this $40 cheaper. Match it or I cancel.
Decision: ESCALATE (policy gap). Price adjustments cover our own site only.
&lt;/example&gt;
&lt;example&gt;
Customer: Useless bot. My tracking hasn't updated in 3 days.
Decision: RESOLVE. Acknowledge, check tracking, offer the options policy allows.
Escalate if the customer repeats that they want a person.
&lt;/example&gt;
&lt;example&gt;
Customer: Just put me through to someone, please.
Decision: ESCALATE immediately. Explicit request.
&lt;/example&gt;
&lt;/examples&gt;</pre>
<p>Good criteria follow the documented prompting practices: say what to do (not only what not to do), give the reason, and use diverse examples in <code>&lt;example&gt;</code> tags that cover both directions, including the near misses (upset but simple; calm but a gap). Avoid "CRITICAL: ALWAYS ESCALATE IF…" phrasing; current models follow instructions precisely and aggressive emphasis causes over-triggering.</p>

${H.table(['Skill (exam guide)', 'How to do it', 'Why'], [
  ['Explicit escalation criteria with few-shot examples', 'Criteria block plus 4 to 8 examples in both directions in the system prompt', 'Fixes unclear boundaries, the usual root cause'],
  ['Honor explicit requests for a human immediately', 'Criterion 1 plus an example; no investigation first', 'Customer autonomy; investigation delays and annoys'],
  ['Acknowledge frustration, offer resolution, escalate if they reiterate', 'Example showing empathy plus a concrete offer and an explicit human option', 'Keeps FCR for simple cases without trapping the customer'],
  ['Escalate when policy is ambiguous or silent', 'Name the gap type (competitor match vs own-site adjustment) in the criteria', 'The agent must not create policy'],
  ['Ask for additional identifiers on multiple matches', 'Instruction plus a tool-result example', 'Heuristic selection acts on the wrong record']
])}

<h3>Sample question 3, reasoned</h3>
<p>The agent reaches 55% FCR against an 80% target. Logs show it escalates straightforward cases (standard damage replacements with photo evidence) and handles policy-exception cases on its own. The fix is <b>explicit escalation criteria with few-shot examples</b> in the system prompt. The evidence shows miscalibrated boundaries in both directions, which is exactly what criteria and examples define.</p>
${H.table(['Option', 'Verdict'], [
  ['Explicit criteria + few-shot examples', '<b>Correct.</b> Root cause is unclear decision boundaries; proportionate first response before new infrastructure.'],
  ['Self-reported confidence score with a threshold', 'Wrong. Self-reported confidence is poorly calibrated; the agent is already confidently wrong on hard cases.'],
  ['Separate classifier trained on historical tickets', 'Wrong as a first step. Over-engineered; needs labeled data and ML infrastructure before prompt optimization has been tried.'],
  ['Sentiment-based auto-escalation', 'Wrong. Solves a different problem; sentiment does not track case complexity.']
])}

<h3>The handoff itself</h3>
<p>The human who receives the case usually has no transcript. The escalation tool takes a structured summary: customer ID (verified or not), issue, root cause if known, amounts and dates from the case-facts block, what was attempted, the reason for escalation, and a recommended action. Where escalation is mandatory (for example refunds above $500), enforce it in code with a hook or prerequisite gate rather than relying on the prompt; see <a href="#/lesson/hb-14-enforcement-handoff">1.4 Enforcement and structured handoffs</a>.</p>
<pre class="code">escalate_to_human({
  "customer_id": "C-20931", "verified": true,
  "reason": "policy_gap",
  "request": "Match competitor price ($40 lower at another retailer) on order #88590",
  "policy_reference": "Price adjustments apply to our own site only",
  "facts": { "order_id": "#88590", "amount_paid": 129.00, "purchase_date": "2026-09-12" },
  "attempted": ["Confirmed order and price paid", "Checked own-site price: unchanged"],
  "customer_sentiment_note": "Wants resolution today; mentioned cancelling",
  "recommended_action": "Decide on competitor match or offer own-site alternatives"
})</pre>

<h3>Measuring escalation calibration</h3>
${H.table(['Metric', 'Definition', 'Signals'], [
  ['<b>First-contact resolution</b>', 'Share of contacts resolved without handoff or re-contact', 'Low FCR with many in-policy escalations → over-escalation'],
  ['<b>Escalation precision</b>', 'Share of escalations that reviewers agree needed a human', 'Low → criteria too broad, or sentiment leaking in'],
  ['<b>Missed escalations</b>', 'Autonomous resolutions that needed an exception or human decision (from QA review)', 'Any nonzero rate on exceptions is a policy risk'],
  ['<b>Explicit-request compliance</b>', 'Share of "I want a human" turns escalated on that turn', 'Should be at or near 100%'],
  ['<b>Re-contact rate</b>', 'Customers returning about the same issue', 'Resolved cases that were not really resolved']
])}
<p>Build an eval set with cases in <b>both directions</b>: should-escalate (explicit requests, gaps, exceptions, stuck) and should-not (angry but simple, long but covered, multiple matches that need a question). Balanced sets matter; a set of only escalation cases rewards an agent that escalates everything. Grade the outcome (was <code>escalate_to_human</code> called, with which reason) and run several trials per case, because a customer-facing agent needs consistency (pass^k), not one lucky pass.</p>

${H.box('real', 'Real-world notes:', 'Log the escalation reason code on every handoff and review a sample weekly; drift shows up as a rising share of one reason. Human reviewers\' decisions on escalated cases are labeled data: feed disagreements back as new few-shot examples or criteria edits. When volume and labeled history are large, a classifier can come later, but only after criteria-based prompting has been measured. Route by document or case characteristics you can observe, not by the model\'s own confidence (see 5.5).')}
${H.box('exam', 'Exam tip:', 'When an option says "self-reported confidence", "sentiment threshold" or "train a classifier" and another says "explicit criteria with few-shot examples", the criteria option is the proportionate first step unless the stem says criteria were already tried and measured.')}
${H.box('trap', 'Distractors:', '<ul><li>"Investigate the issue first, then offer a human" after an explicit request.</li><li>"Escalate whenever negative sentiment exceeds a threshold."</li><li>"Route to humans when self-rated confidence is below 7."</li><li>"Select the most recently active account when several match."</li><li>"Approve the competitor match because it is similar to a price adjustment" (or refuse it outright).</li><li>"Escalate all complex or long cases" (complexity is not the trigger; authority and coverage are).</li></ul>')}

<h3>Worked scenario</h3>
<p>A retailer\'s agent escalates 38% of contacts. Review shows most escalations are angry customers with late parcels, while two customers received goodwill credits above policy limits without review. A lookup by name sometimes returns several customers and the agent picks the first.</p>
<ol class="steps">
<li><b>Criteria:</b> add the escalation policy block (explicit request, exception, gap, stuck) and state that frustration alone is not a trigger.</li>
<li><b>Examples:</b> add few-shot pairs for angry-but-simple (resolve) and credit-above-limit (escalate), plus a multiple-match example that asks for an email.</li>
<li><b>Enforcement:</b> the credit limit is a hard rule, so add a PreToolUse check that blocks credits above the limit and redirects to <code>escalate_to_human</code>.</li>
<li><b>Measure:</b> track FCR, escalation precision and missed escalations on a balanced eval set before and after.</li></ol>

${H.check([
  ['A customer opens with "I want to speak to a human about my refund". The agent can see the refund is simple. What should it do?', 'Escalate immediately with a structured handoff. An explicit request is honored without investigating or attempting resolution first.'],
  ['A customer is angry that a replacement part is late; the fix is a standard reship. When should the agent escalate?', 'Only if, after acknowledging the frustration and offering the reship, the customer reiterates they want a human. Frustration alone is not a trigger.'],
  ['Policy covers own-site price drops. A customer asks for a match to another store\'s price. Resolve or escalate?', 'Escalate. The policy is silent on competitor matching; the agent should not approve or refuse on its own interpretation.'],
  ['Why is "escalate when the model\'s confidence is below 6/10" a weak design?', 'Self-reported confidence is poorly calibrated, and the agent is often most confident on the hard cases it gets wrong. It does not measure whether policy covers the case.'],
  ['<code>get_customer</code> returns two matching accounts. The agent picks the one with the latest order. What is wrong and what is the fix?', 'Heuristic selection can act on the wrong account. Ask the customer for an additional identifier (email, order number) and re-query.'],
  ['FCR is 55% vs an 80% target. Your eval set contains only cases that should be escalated. What is the problem?', 'An unbalanced set cannot detect over-escalation. Add should-not-escalate cases (straightforward, in-policy) so both directions are measured.']
])}
${H.src([['Prompting best practices', 'https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices'], ['Demystifying evals for AI agents', 'https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents'], ['Agent SDK: hooks', 'https://code.claude.com/docs/en/agent-sdk/hooks'], ['Building effective agents', 'https://www.anthropic.com/engineering/building-effective-agents']])}`;
    }
  });

  /* ------------------------------------------------------------------ 5.3 */
  CCAR.lessons.push({
    id: 'hb-53-error-propagation', track: 'handbook', part: 'P5', num: '5.3', order: 503, domain: 'D5',
    objs: ['X06', 'X04'], ts: ['5.3'], minutes: 30,
    title: 'Error propagation across multi-agent systems',
    summary: 'How failures should travel from subagents to the coordinator: structured error context, access failures vs valid empty results, local recovery for transient faults, coordinator recovery choices, coverage annotations in the final output, and the observability that makes it debuggable.',
    body: function () {
      return `
<p>In a multi-agent system the coordinator can only recover from what it can see. If a subagent hides a timeout behind an empty "success", the final report states confidently that no evidence exists. If a subagent throws and the whole workflow dies, one flaky source costs the entire run. The exam tests the middle path: <b>recover locally where you can, propagate what you cannot with enough structure for the coordinator to decide, and make gaps visible in the output</b>.</p>

<h3>Four ways to report a failure</h3>
<div class="spectrum"><div class="sp bad"><b>Suppress</b><br>timeout returned as empty success. Coordinator cannot know; report is silently incomplete.</div><div class="sp good"><b>Structured error context</b><br>failure type, attempted query, partial results, alternatives. Coordinator decides.</div><div class="sp bad"><b>Terminate</b><br>exception kills the whole workflow. Recoverable work is lost.</div></div>
<p>A fourth pattern sits between them and is still wrong: retrying inside the subagent and then returning a <b>generic status</b> ("search unavailable"). Local retry is good; the generic status hides which query failed, why, and what was already found.</p>

<h3>Structured error context</h3>
<pre class="code">{
  "status": "partial_failure",
  "failure": {
    "type": "timeout",                       // timeout | rate_limited | auth | not_found | invalid_input …
    "retryable": true,
    "source": "web_search",
    "attempted": {
      "query": "grid-scale sodium-ion storage cost 2025",
      "attempts": 3, "backoff": "exponential", "last_error_at": "2026-09-29T10:42:11Z"
    },
    "message": "Search provider did not respond within 30s on 3 attempts"
  },
  "partial_results": [
    { "claim": "Pilot projects reported costs 15-20% below Li-ion",
      "source": { "url": "…", "published": "2025-03" } }
  ],
  "alternatives": [
    "Retry with narrower query: 'sodium-ion storage cost pilot 2025'",
    "Use document_search over the internal report archive",
    "Proceed with partial results and flag sodium-ion as a coverage gap"
  ]
}</pre>
${H.table(['Field', 'What the coordinator uses it for'], [
  ['<b>Failure type</b> + retryable', 'Transient (timeout, rate limit) → retry may help; permanent (auth, invalid input) → do not retry the same call'],
  ['<b>Attempted query / action</b>', 'Retry with a modified query, or avoid duplicating the same failing call'],
  ['<b>Attempts made</b>', 'Know that local retries were already exhausted'],
  ['<b>Partial results</b>', 'Proceed with what exists instead of discarding it'],
  ['<b>Alternatives</b>', 'Candidate recovery paths (other source, narrower scope)']
])}
<p>At the MCP tool layer the same idea appears as a tool execution error: <code>isError: true</code> with structured metadata such as an error category (transient, validation, business, permission), whether it is retryable, and a readable message. Protocol errors (unknown tool, malformed request) are a different channel. See <a href="#/lesson/hb-22-structured-errors">2.2 Structured error responses</a>.</p>

<h3>Access failure vs valid empty result</h3>
${H.table(['', 'Access failure', 'Valid empty result'], [
  ['What happened', 'The query could not be executed (timeout, 503, auth, rate limit)', 'The query ran successfully and matched nothing'],
  ['What it means', 'Unknown: evidence may exist', 'Evidence of absence for that query and source'],
  ['How to report', 'Error with type, attempted query, retryable flag', 'Success with <code>results: []</code> and the query that was run'],
  ['Coordinator action', 'Retry decision, alternative source, or flag a gap', 'Accept; maybe broaden the query if absence is surprising'],
  ['If confused', 'A timeout reported as "no results" becomes a false negative stated as fact', 'An empty result reported as an error triggers pointless retries']
])}
${H.box('trap', 'The classic bug:', 'A billing lookup times out and the tool returns "No charges found". The agent tells the customer there is no duplicate charge. Empty and failed must never share a representation.')}

<h3>Local recovery first, then propagate</h3>
${D({ w: 760, h: 300, title: 'Where each failure is handled',
  groups: [{ x: 10, y: 30, w: 350, h: 260, label: 'SUBAGENT (local recovery)', kind: 'soft' }, { x: 400, y: 30, w: 350, h: 260, label: 'COORDINATOR (recovery decision)', kind: 'hard' }],
  nodes: [
    { id: 'call', x: 30, y: 60, w: 150, h: 44, label: 'Tool call', sub: 'search / fetch', kind: 'tool' },
    { id: 'retry', x: 200, y: 60, w: 145, h: 44, label: 'Retry + backoff', sub: 'transient only', kind: 'sub' },
    { id: 'alt', x: 30, y: 140, w: 150, h: 44, label: 'Rephrase / mirror', sub: 'within own scope', kind: 'sub' },
    { id: 'err', x: 200, y: 140, w: 145, h: 60, label: 'Structured error', sub: 'type, attempts, partials', kind: 'bad' },
    { id: 'ok', x: 30, y: 220, w: 150, h: 44, label: 'Result or empty', sub: 'success', kind: 'good' },
    { id: 'coord', x: 430, y: 60, w: 290, h: 44, label: 'Coordinator', sub: 'reads type + partials + alternatives', kind: 'agent' },
    { id: 'r1', x: 430, y: 140, w: 140, h: 44, label: 'Modified retry', kind: 'sub' },
    { id: 'r2', x: 590, y: 140, w: 140, h: 44, label: 'Other source', kind: 'sub' },
    { id: 'r3', x: 430, y: 220, w: 140, h: 44, label: 'Proceed partial', sub: 'annotate gap', kind: 'good' },
    { id: 'r4', x: 590, y: 220, w: 140, h: 44, label: 'Escalate', sub: 'human / stop', kind: 'human' }
  ],
  edges: [{ from: 'call', to: 'retry', label: 'timeout' }, { from: 'retry', to: 'alt', dashed: true }, { from: 'alt', to: 'err', label: 'unresolved' }, { from: 'call', to: 'ok', dashed: true }, { from: 'err', to: 'coord' }, { from: 'coord', to: 'r1' }, { from: 'coord', to: 'r2' }, { from: 'coord', to: 'r3' }, { from: 'coord', to: 'r4' }],
  caption: 'Subagents absorb transient noise (a retry with backoff, a rephrased query inside their own scope). Only what they cannot resolve crosses the boundary, with what was attempted and what was found. Decisions that change the plan belong to the coordinator.' })}
${H.table(['Failure', 'Handle where', 'How'], [
  ['Single timeout, 429, 503', 'Subagent', 'Retry with exponential backoff and jitter, bounded attempts'],
  ['Query too broad, provider truncates', 'Subagent', 'Narrow the query within its assigned scope'],
  ['Source down after retries', 'Coordinator', 'Structured error up: retry later, other source, or proceed partial'],
  ['Auth or permission failure', 'Coordinator (often human)', 'Not retryable; report clearly; do not keep calling'],
  ['Invalid input from the coordinator\'s own instructions', 'Coordinator', 'Error says which field; coordinator corrects the delegation'],
  ['Budget or turn limit hit', 'Coordinator', 'Return partial output marked as partial, plus what remains']
])}

<h3>Coordinator recovery decisions</h3>
${H.table(['If the error context shows', 'Coordinator chooses', 'Because', 'You give up'], [
  ['Transient failure, specific query, time remaining', 'Retry with a modified query (narrower, different phrasing)', 'Likely to succeed; cheap', 'Some latency'],
  ['Source unavailable, alternatives listed', 'Alternative source or subagent', 'Coverage without waiting on a dead source', 'Possibly lower-quality source'],
  ['Useful partial results, non-critical topic', 'Proceed with partial results and annotate the gap', 'Report ships on time, honestly', 'Completeness on that subtopic'],
  ['Critical topic, no alternatives, or permission failure', 'Escalate to a human or stop that branch', 'Guessing would produce a misleading report', 'Autonomy for this run'],
  ['Same failure repeating across attempts', 'Stop retrying; mark as gap', 'Avoid burning budget on a loop', 'That branch']
])}

<h3>Coverage annotations in synthesis output</h3>
<p>Recovery decisions must survive to the final output. The synthesis states which findings are well supported and which topic areas have gaps because sources were unavailable (not because evidence is absent).</p>
<pre class="code">## Executive summary
…

## Coverage
| Topic                 | Status          | Basis                                            |
|-----------------------|-----------------|--------------------------------------------------|
| Li-ion cost trends    | Well supported  | 4 independent sources, 2023-2025                 |
| Grid capacity 2030    | Contested       | 2 sources disagree (base vs high-adoption case)  |
| Sodium-ion costs      | Gap: partial    | web_search timed out after 3 attempts; 1 pilot   |
|                       |                 | report only. Not evidence of absence.            |
| Policy incentives, EU | Gap: not covered| document archive access denied (permission)      |</pre>
${H.box('rule', 'Rule:', 'Distinguish "no evidence found" (valid empty result) from "could not search" (access failure) in the output as well as in the error channel. Readers treat the two very differently.')}

<h3>Sample question 8, reasoned</h3>
<p>The web search subagent times out while researching a complex topic. The best propagation design returns <b>structured error context</b>: failure type, attempted query, partial results and potential alternatives. That lets the coordinator retry with a modified query, try another approach, or proceed with partial results.</p>
${H.table(['Option', 'Verdict'], [
  ['Structured error context to the coordinator', '<b>Correct.</b> Gives the coordinator what it needs for an informed recovery decision.'],
  ['Retry with backoff inside the subagent, then a generic "search unavailable"', 'Wrong. Local retry is fine, but the generic status hides the query, partial results and alternatives.'],
  ['Catch the timeout and return an empty result marked successful', 'Wrong. Suppression: prevents recovery and produces an incomplete report presented as complete.'],
  ['Propagate the exception to a top-level handler that terminates the workflow', 'Wrong. One failure ends the run when recovery could succeed.']
])}

<h3>Observability and limits</h3>
${H.table(['Concern', 'Mechanism', 'Why it matters for errors'], [
  ['Which subagent produced a message', 'Messages from inside a subagent carry <code>parent_tool_use_id</code> in the Agent SDK stream', 'Attribute failures and partial results to the right delegation'],
  ['Cross-system tracing', 'Pass a correlation (trace) ID from the coordinator into each delegation and tool call; log it with every error', 'Reconstruct one run across agents, tools and external services'],
  ['Runaway retries and spend', '<code>maxBudgetUsd</code> (includes subagent spend), <code>maxTurns</code>; spawn-depth and concurrency caps', 'A retry loop is bounded; the result subtype tells you which limit hit'],
  ['Run outcome', 'ResultMessage subtypes: <code>success</code>, <code>error_max_turns</code>, <code>error_max_budget_usd</code>, <code>error_during_execution</code>, <code>error_max_structured_output_retries</code>; <code>result</code> only on success', 'Handle each subtype explicitly; do not treat a missing result as empty'],
  ['Subagent hitting its turn cap', 'An AgentDefinition <code>maxTurns</code> limit returns output marked as partial', 'The coordinator must treat it as partial coverage, not a complete answer']
])}
${H.box('real', 'Real-world notes:', 'Errors compound in long agent runs, so resume from checkpoints rather than restarting (the research-system lesson). Make side-effecting tools idempotent, because a coordinator retry may repeat a call. Write eval cases that inject failures (timeouts, empty results, permission errors) and grade the final output for honest coverage annotations, not only for answer quality. Alert on the share of runs finishing with gaps per source; a rising rate is an outage signal before anyone reports it.')}
${H.box('exam', 'Exam vs current docs:', 'The exam guide describes subagents spawned via the Task tool; in the current SDK that tool is named Agent. Error-propagation principles are identical. The guide\'s "structured error context" maps to MCP tool execution errors (<code>isError: true</code> with metadata) at the tool layer and to your subagent output schema at the agent layer.')}
${H.box('trap', 'Distractors:', '<ul><li>"Return an empty result so the pipeline keeps flowing" (silent suppression).</li><li>"Fail fast: abort the whole workflow on any subagent error" (single failure ends recoverable work).</li><li>"Retry internally and return search unavailable" (generic status).</li><li>"Have the coordinator retry every failure identically" (ignores type; auth errors never succeed).</li><li>"Omit gaps from the report to keep it clean" (readers mistake gaps for absence of evidence).</li><li>"Let the synthesis agent call web search itself to fill gaps" (role creep; recovery belongs to the coordinator).</li></ul>')}

<h3>Worked scenario</h3>
<p>A research system produces a market report. Reviewers notice that when the patent database is slow, the report says "no relevant patents were identified". Logs show the patent subagent catches timeouts and returns <code>{ "patents": [] }</code> with status success.</p>
<ol class="steps">
<li><b>Diagnose:</b> an access failure is being reported as a valid empty result, so the coordinator and synthesis treat it as evidence of absence.</li>
<li><b>Subagent:</b> retry transient timeouts with backoff (bounded); if still failing, return structured error context with type, query, attempts, any partial hits and alternatives (for example a different patent index).</li>
<li><b>Coordinator:</b> branch on failure type: modified retry, alternative source, or proceed and mark the gap.</li>
<li><b>Synthesis:</b> add a coverage section distinguishing "searched, none found" from "could not search".</li>
<li><b>Test:</b> inject timeouts in evals and assert the gap annotation appears.</li></ol>

${H.check([
  ['A document-search subagent returns zero results for a precise query. Another returns zero results because the index was unreachable. How should each be reported?', 'The first is a valid empty result: success with an empty list and the query run. The second is an access failure: an error with type, attempted query, retryable flag and any partial results. The coordinator treats them differently.'],
  ['Your subagent already retries with backoff. Why is returning "search unavailable" after the retries still weak?', 'It hides the failure type, the query, what was found before failing and possible alternatives, so the coordinator cannot choose a modified retry, another source or a partial result.'],
  ['One of five research subagents fails with a permission error. What should the coordinator do?', 'Not retry the same call (not transient). Try an alternative source if one exists, otherwise proceed with the other four and annotate the topic as a gap due to an unavailable source, or escalate if the topic is critical.'],
  ['What belongs in the final report when a source was unavailable?', 'A coverage annotation: which findings are well supported, which areas have gaps due to unavailable sources, and the fact that the gap is not evidence of absence.'],
  ['A subagent hit its <code>maxTurns</code> limit. How should the coordinator treat its output?', 'As partial output. Record the missing scope, then decide to re-delegate a narrower task, accept partial coverage with an annotation, or stop.'],
  ['How do you tell, in the Agent SDK stream, which subagent emitted an error message?', 'Messages from inside a subagent carry <code>parent_tool_use_id</code> linking them to the Agent (Task) call that spawned it; log it with a run-level trace ID.']
])}
${H.src([['Multi-agent research system', 'https://www.anthropic.com/engineering/multi-agent-research-system'], ['Agent SDK: subagents', 'https://code.claude.com/docs/en/agent-sdk/subagents'], ['Agent SDK: agent loop', 'https://code.claude.com/docs/en/agent-sdk/agent-loop'], ['MCP specification: tools', 'https://modelcontextprotocol.io/specification/latest'], ['Writing tools for agents', 'https://www.anthropic.com/engineering/writing-tools-for-agents']])}`;
    }
  });
})();
