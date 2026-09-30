/* Architect Handbook · Part 2: tool interfaces, structured MCP errors, tool distribution and tool_choice, MCP integration, built-in tools. */
(function () {
  var H = CCAR.hb, D = H.D;

  /* ------------------------------------------------------------------ 2.1 */
  CCAR.lessons.push({
    id: 'hb-21-tool-interfaces', track: 'handbook', part: 'P2', num: '2.1', order: 201, domain: 'D2',
    objs: ['O36'], ts: ['2.1'], minutes: 30,
    title: 'Tool interfaces: descriptions, boundaries and naming',
    summary: 'Why the tool description is the model\'s primary selection signal, how to write one that separates similar tools, when to rename, split or consolidate tools, how system prompt wording can override good descriptions, and how to design tool responses.',
    body: function () {
      return `
<p>A tool is a contract between a deterministic system and a non-deterministic agent. Claude sees only a <b>name</b>, a <b>description</b> and an <b>input schema</b>; the docs call the description "by far the most important factor" in tool performance. Most wrong-tool incidents trace back to thin or overlapping descriptions. The exam probes whether you fix that root cause first (sample question 2) and when to rename, split or consolidate.</p>

<h3>What Claude uses to choose a tool</h3>
${H.table(['Signal', 'Design rule'], [
  ['<b>Description</b>', 'Primary selection mechanism. 3–4+ sentences: what, when and when not, each parameter, caveats. Write it like onboarding a new hire.'],
  ['<b>Name</b>', 'Verb + object (<code>lookup_order</code>). Namespace by service when servers coexist (<code>github_list_prs</code>, <code>slack_send_message</code>).'],
  ['<b>input_schema</b>', 'Unambiguous names (<code>user_id</code> not <code>user</code>), enums, formats. Optional <code>input_examples</code> for tricky formats.']
])}

<h3>Anatomy of a good description</h3>
${H.table(['Element', 'Example fragment'], [
  ['Purpose', '"Retrieves one order by order number: items, status, tracking."'],
  ['Inputs and formats', '"order_id: ORD-12345 or a bare 5-digit number."'],
  ['Example queries', '"Use for \'where is my order #12345\', \'has 4417 shipped\'."'],
  ['Edge cases', '"No match returns found: false (not an error)."'],
  ['Boundaries vs similar tools', '"Not for account details or addresses: use get_customer."'],
  ['What it does not return', '"No payment card data or refund history; use list_refunds."']
])}

<h3>Before and after: get_customer vs lookup_order</h3>
<p>Logs show the agent calls <code>get_customer</code> when users ask "check my order #12345". Both descriptions are one line and both accept similar identifiers, so the model has nothing to separate them.</p>
<div class="two"><div>
<h4 class="bad-h">Before</h4>
<pre class="code">{ "name": "get_customer",
  "description": "Retrieves customer information" }
{ "name": "lookup_order",
  "description": "Retrieves order details" }</pre>
</div><div>
<h4 class="good-h">After</h4>
<pre class="code">{ "name": "lookup_order",
  "description": "Look up ONE order by its order number.
  Use when the user mentions an order, shipment,
  delivery or a number like #12345 / ORD-12345.
  Input order_id: digits with or without ORD- prefix.
  Returns status, items, tracking, order total.
  Returns found:false if no match. Not for account
  or profile questions: use get_customer." }
{ "name": "get_customer",
  "description": "Look up a customer ACCOUNT by email
  or customer ID (CUST-...). Use for identity
  verification, profile, addresses, loyalty tier.
  Does not return orders: use lookup_order." }</pre>
</div></div>
${H.box('exam', 'Sample question 2:', 'Expanding descriptions is the answer: root cause, low effort. Few-shot examples add tokens without fixing the tools; a keyword routing layer is over-engineered; consolidating into <code>lookup_entity</code> is valid architecture but more than a first step.')}

<h3>Overlap causes misrouting: rename and re-scope</h3>
<p><code>analyze_content</code> and <code>analyze_document</code> have near-identical descriptions ("Analyzes content and returns insights"), so calls split unpredictably. The exam fix: <b>rename</b> <code>analyze_content</code> to <code>extract_web_results</code> with a <b>web-specific description</b> (input: search results or fetched pages; output: title, URL, snippet, date per result). Different names and inputs remove the overlap.</p>

<h3>Split a generic tool into purpose-specific tools</h3>
<p>A single <code>analyze_document(document, instructions)</code> forces the model to encode intent in free text and gives downstream code no stable output shape. Split it into tools with defined input/output contracts:</p>
${H.table(['Tool', 'Input', 'Output'], [
  ['<code>extract_data_points</code>', '<code>document_id</code>, <code>fields[]</code> (enum)', 'Per field: value or null, page, quoted evidence'],
  ['<code>summarize_content</code>', '<code>document_id</code>, <code>max_words</code>, <code>focus</code>', 'Summary text, sections covered'],
  ['<code>verify_claim_against_source</code>', '<code>claim</code>, <code>document_id</code>', '<code>verdict</code> (supported | contradicted | not_found), quote, location']
])}


<h3>Consolidate or split: the docs and the exam agree once you see the axis</h3>
${H.box('exam', 'Exam vs current docs:', 'The tool-use docs recommend <b>consolidating related operations</b> into fewer tools (for example one tool with an <code>action</code> parameter) to reduce selection ambiguity, and the engineering guidance says build a few thoughtful tools for high-impact workflows (<code>schedule_event</code>, <code>get_customer_context</code>) rather than wrapping every endpoint. The exam guide teaches <b>splitting</b> overlapping generic tools (<code>analyze_document</code>) into purpose-specific ones. Both reduce ambiguity: consolidate operations that share one purpose and one object; split tools whose single name hides several different purposes.')}
${H.table(['If the situation is', 'Choose', 'You give up'], [
  ['One generic tool hides several intents with different outputs', '<b>Split</b> into purpose-specific tools', 'More tools; keep the per-agent total small'],
  ['Many thin endpoint wrappers on one resource (<code>list_x</code>, <code>get_x</code>)', '<b>Consolidate</b> into one workflow tool or an <code>action</code> param', 'Longer descriptions'],
  ['Two tools with near-identical descriptions', '<b>Rename + rewrite</b>', 'Nothing significant'],
  ['Minimal descriptions, wrong-tool calls in logs', '<b>Expand descriptions first</b>', 'Some tokens per request'],
  ['Several servers with similar tool names', '<b>Namespace</b> (<code>jira_search</code>, <code>asana_search</code>)', 'Longer names']
])}

${D({ w: 760, h: 200, title: 'From ambiguous to purpose-specific',
  nodes: [
    { id: 'u', x: 20, y: 75, w: 140, h: 50, label: 'User request', sub: '"check order #12345"', kind: 'human' },
    { id: 'a', x: 220, y: 20, w: 220, h: 50, label: 'get_customer', sub: '"Retrieves customer info"', kind: 'bad' },
    { id: 'b', x: 220, y: 130, w: 220, h: 50, label: 'lookup_order', sub: '"Retrieves order details"', kind: 'bad' },
    { id: 'c', x: 510, y: 75, w: 230, h: 50, label: 'lookup_order (rewritten)', sub: 'formats, examples, boundaries', kind: 'good' }
  ],
  edges: [{ from: 'u', to: 'a', label: 'misroute', kind: 'bad' }, { from: 'u', to: 'b', dashed: true }, { from: 'b', to: 'c', label: 'rewrite' }],
  caption: 'One-line descriptions leave two plausible tools. With formats, example queries and boundaries, the order query has one good match.' })}

<h3>System prompt wording can override good descriptions</h3>
<p>"Always check the customer record first" or "When the user says <i>return</i>, use create_return" create keyword associations: the model calls <code>get_customer</code> every turn, or <code>create_return</code> when the user only asked about the policy, whatever the descriptions say. When selection is wrong despite good descriptions, <b>review the system prompt</b> for keyword-triggered tool instructions and rewrite them as conditions ("verify identity with get_customer before any account change").</p>
${H.box('rule', 'Debugging order for wrong-tool calls:', '1) read the transcripts; 2) check both descriptions for overlap and missing boundaries; 3) search the system prompt for tool names and trigger words; 4) only then consider few-shot examples, consolidation or routing code.')}

<h3>Response design: what the tool gives back</h3>
${H.table(['Practice', 'Example'], [
  ['Return only high-signal fields (every token stays in context)', 'Order: status, items, total, tracking; not 40 internal columns'],
  ['Semantic, stable identifiers over opaque UUIDs', '<code>"customer": "Dana Lee (CUST-2291)"</code>'],
  ['<code>response_format</code> enum (<code>concise</code> | <code>detailed</code>); concise is about a third of the tokens', 'Concise for triage, detailed before a refund decision'],
  ['Pagination, filtering, truncation with defaults (Claude Code caps tool responses at 25,000 tokens by default)', '"Showing 20 of 312. Narrow with status or date_from."'],
  ['Actionable error text, not tracebacks (see 2.2)', '"order_id must be 5 digits; received \'12-345\'."']
])}
<p><b>Evaluate tools</b> with realistic multi-call tasks: track accuracy, tool calls, tool errors, tokens and runtime, read transcripts to see where the model hesitated, and keep a held-out task set so you do not overfit descriptions.</p>

${H.box('real', 'Real-world notes:', 'Tool definitions sit at the start of the cache prefix, so any edit invalidates the whole prompt cache: batch description changes and ship them with an eval run. Keep the tool list in a deterministic order. Put selection guidance in the description, not the system prompt, so it travels with the tool.')}
${H.box('trap', 'Traps:', '<b>Few-shot routing examples as the first fix</b> (tokens, overlap remains). <b>Keyword routing layer</b> (over-engineered). <b>"Consolidate into lookup_entity"</b> as a first step (valid later, too heavy now). <b>"IMPORTANT: use lookup_order for orders" in the system prompt</b> (another keyword rule; aggressive wording over-triggers). <b>Wrapping every API endpoint</b> as a tool.')}

<h3>Worked scenario</h3>
<p>A research system has <code>analyze_content</code> and <code>analyze_document</code>. Uploaded PDFs sometimes go to <code>analyze_content</code>, synthesis cannot parse output that is a summary one time and bullet facts the next, and the system prompt says "Always analyze content before answering." Fix: rename <code>analyze_content</code> to <code>extract_web_results</code> (web-only input); split <code>analyze_document</code> into <code>extract_data_points</code>, <code>summarize_content</code> and <code>verify_claim_against_source</code> with fixed output shapes; rewrite the keyword instruction as "for uploaded documents, choose the tool that matches the question"; re-run the task suite and compare wrong-tool rate and parse failures.</p>

${H.check([
  ['Logs show <code>get_customer</code> called for "where is order #12345". Both tools have one-line descriptions. Most effective first step?', 'Expand both descriptions with input formats, example queries, edge cases and "use X instead" boundaries: the root cause at the lowest cost.'],
  ['Descriptions are now excellent, yet the agent still calls <code>create_return</code> whenever a user types "return". Where do you look?', 'The system prompt. A keyword-sensitive line such as "when the user says return, use create_return" overrides the descriptions. Rewrite it as a condition on intent.'],
  ['Why rename <code>analyze_content</code> rather than only editing its description?', 'The name is a selection signal; two "analyze" names look interchangeable.'],
  ['The docs say consolidate; the exam says split. How do you reconcile them?', 'Both target ambiguity. Split a tool that hides several purposes; consolidate thin tools serving one purpose. On the exam, split overlapping generic tools.'],
  ['A search tool returns 300 rows × 30 columns and the agent loses track. Two fixes in the tool?', 'High-signal fields only (<code>concise</code> by default), and pagination or truncation with a hint to narrow filters.']
])}
${H.src([['Define tools', 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools'], ['Writing effective tools for agents', 'https://www.anthropic.com/engineering/writing-tools-for-agents'], ['MCP tools specification', 'https://modelcontextprotocol.io/specification/latest'], ['CCAR-F Exam Guide v1.0 (task 2.1, sample Q2)', '#/study']])}`;
    }
  });

  /* ------------------------------------------------------------------ 2.2 */
  CCAR.lessons.push({
    id: 'hb-22-structured-errors', track: 'handbook', part: 'P2', num: '2.2', order: 202, domain: 'D2',
    objs: ['X04', 'X06'], ts: ['2.2'], minutes: 25,
    title: 'Structured error responses for MCP tools',
    summary: 'The isError flag, protocol errors vs tool execution errors, the four error categories and their recovery paths, retryable metadata, local recovery in subagents, and why an empty result must never be confused with an access failure.',
    body: function () {
      return `
<p>When a tool fails, the agent can only recover as well as the error lets it. A bare "Operation failed" leaves the model guessing, and it often burns retries on a permanent failure or tells a customer something untrue. Structured errors turn failure into information the agent can act on. The exam tests the <code>isError</code> pattern, the four categories, retryable metadata, local recovery with propagation, and the difference between "nothing found" and "could not look".</p>

<h3>Two error channels in MCP</h3>
${H.table(['Channel', 'Used for', 'Shape', 'Who sees it'], [
  ['<b>Protocol error</b>', 'Unknown tool, malformed request, invalid JSON-RPC', 'JSON-RPC <code>error</code> object', 'The client/host; usually not a model-recoverable situation'],
  ['<b>Tool execution error</b>', 'API failure, timeout, input validation, business rule, permission', 'Normal tool result with <code>isError: true</code> and content blocks', 'The model, so it can self-correct or change course']
])}
<p>The spec says tool execution errors should be reported inside the result so the model can see them. Your server decides what goes in the content; that is where structure pays off.</p>

<h3>The four categories and how to recover</h3>
${H.table(['errorCategory', 'Examples', 'isRetryable', 'Correct agent behavior'], [
  ['<b>transient</b>', 'Timeout, 503, rate limit, connection reset', 'true', 'Retry with backoff (honor <code>retryAfter</code>); after limited attempts, report as unresolved'],
  ['<b>validation</b>', 'Bad format, missing field, value out of range', 'false as-is (true after correcting input)', 'Fix the input using the message, or ask the user for the correct value; do not resend unchanged'],
  ['<b>business</b>', 'Refund outside 30-day window, amount over policy limit, order already shipped', 'false', 'Do not retry. Explain to the customer using the customer-safe message; offer alternatives or escalate'],
  ['<b>permission</b>', 'Token lacks scope, account locked, role not allowed', 'false', 'Do not retry. Escalate or route to a human/role that has access']
])}

<h3>Recommended error payload</h3>
<pre class="code">{
  "isError": true,
  "content": [{ "type": "text", "text": "{
    \\"errorCategory\\": \\"transient\\",
    \\"isRetryable\\": true,
    \\"retryAfter\\": 30,
    \\"message\\": \\"Payment gateway timed out after 10s (attempt 1 of 3).\\",
    \\"customerMessage\\": \\"I am having trouble reaching our payment system. One moment.\\"
  }" }]
}</pre>
${H.table(['Field', 'Purpose'], [
  ['<code>isError</code>', 'Marks a failed execution, not data'],
  ['<code>errorCategory</code>', 'Selects the recovery path'],
  ['<code>isRetryable</code>', 'Stops wasted retries on permanent failures'],
  ['<code>message</code>', 'Specific cause: what failed, which input, what to change'],
  ['<code>customerMessage</code>', 'Safe wording for business-rule denials; no internal codes'],
  ['<code>retryAfter</code>', 'Seconds to wait (transient only)']
])}
<p class="small muted">Field names beyond <code>isError</code> are a convention you define in your server (the exam guide uses errorCategory and isRetryable), not part of the MCP spec. Document them in the tool description so the model knows to read them.</p>

<h3>One example per category</h3>
<div class="two"><div>
<h4>validation</h4>
<pre class="code">{ "isError": true, "content": [{ "type": "text",
  "text": "{\\"errorCategory\\":\\"validation\\",
  \\"isRetryable\\":false,
  \\"message\\":\\"order_id must be 5 digits;
   received 12-345. Ask the customer to
   confirm the number.\\"}" }] }</pre>
<h4>permission</h4>
<pre class="code">{ "isError": true, "content": [{ "type": "text",
  "text": "{\\"errorCategory\\":\\"permission\\",
  \\"isRetryable\\":false,
  \\"message\\":\\"Refunds above $500 require
   the supervisor role.\\"}" }] }</pre>
</div><div>
<h4>business</h4>
<pre class="code">{ "isError": true, "content": [{ "type": "text",
  "text": "{\\"errorCategory\\":\\"business\\",
  \\"isRetryable\\":false,
  \\"message\\":\\"Order ORD-4417 delivered 41
   days ago; refund window is 30 days.\\",
  \\"customerMessage\\":\\"This order is past
   our 30-day refund window, but I can
   offer store credit or a repair.\\"}" }] }</pre>
<h4>valid empty result (NOT an error)</h4>
<pre class="code">{ "isError": false, "content": [{ "type": "text",
  "text": "{\\"matches\\":[],
  \\"searched\\":\\"charges 2026-09-01..09-28\\"}"
}] }</pre>
</div></div>

<h3>Why generic errors break recovery</h3>
<p>With a uniform "Operation failed" the agent guesses: it retries a policy violation three times, or gives up on a timeout that would have succeeded. A raw stack trace is worse: it may be paraphrased to the customer and still carries no recovery signal. Category + retryable flag + specific message lets the agent choose retry, fix input, explain, or escalate, predictably and auditably.</p>

<h3>Local recovery in subagents, propagate only what is unresolved</h3>
${D({ w: 760, h: 230, title: 'Where errors are handled',
  nodes: [
    { id: 'c', x: 290, y: 15, w: 190, h: 50, label: 'Coordinator', sub: 'decides: retry path, gap, escalate', kind: 'agent' },
    { id: 's', x: 290, y: 115, w: 190, h: 50, label: 'Search subagent', sub: 'retries transient locally', kind: 'sub' },
    { id: 't', x: 40, y: 165, w: 170, h: 50, label: 'MCP tool', sub: 'isError + category', kind: 'tool' },
    { id: 'r', x: 540, y: 115, w: 200, h: 90, label: 'Propagated report', sub: 'category, attempts, partial results, alternatives', kind: 'note' }
  ],
  edges: [{ from: 'c', to: 's', label: 'task' }, { from: 's', to: 't', both: true, label: 'retry x3' }, { from: 's', to: 'r', dashed: true }, { from: 'r', to: 'c', label: 'only if unresolved' }],
  caption: 'The subagent absorbs transient failures itself. It escalates only what it could not resolve, with enough context for the coordinator to choose a different source, annotate a coverage gap, or retry later.' })}
<pre class="code">{
  "status": "partial",
  "completed": [{ "source": "journal-db", "findings": 7 }],
  "failed": [{
    "source": "news-api",
    "errorCategory": "transient",
    "attempts": 3,
    "lastError": "503 Service Unavailable",
    "alternatives": ["archive-search", "retry after 10 min"]
  }],
  "coverageNote": "No news coverage after 2026-06; academic sources only."
}</pre>
${H.box('rule', 'Propagation rule:', 'Handle locally what you can (transient retries, obvious input fixes). Propagate the rest with <b>what failed, its category, what was attempted, partial results, and possible alternatives</b>. Never silently return an empty success, and never let one failed source terminate the whole workflow.')}

<h3>Empty result vs access failure</h3>
<p>The most expensive error bug is a failure that looks like a successful "no match". A billing tool times out and the wrapper returns <code>{"charges": []}</code>. The agent tells the customer "I found no duplicate charge on your card", confidently and wrongly. The customer disputes the charge with the bank.</p>
${H.table(['Case', 'isError', 'Agent should'], [
  ['Query ran, nothing matched', 'false, with <code>matches: []</code> and what was searched', 'Report "no duplicate charge found for Sept 1–28"'],
  ['Query could not run (timeout, auth, 5xx)', 'true, with category and retryable flag', 'Retry, or say it could not check yet and escalate; never claim "none found"']
])}

<h3>Claude API is_error vs MCP isError</h3>
${H.table(['Layer', 'Flag', 'Where'], [
  ['Claude Messages API', '<code>is_error: true</code>', 'On the <code>tool_result</code> block your code sends back in the user turn'],
  ['MCP', '<code>isError: true</code>', 'On the tool call result the server returns; the harness (Claude Code, Agent SDK) maps it into a tool_result for the model']
])}
<pre class="code">{ "role": "user", "content": [{
  "type": "tool_result", "tool_use_id": "toolu_01A",
  "is_error": true,
  "content": "{\\"errorCategory\\":\\"business\\",\\"isRetryable\\":false,\\"message\\":\\"Refund window expired\\"}"
}] }</pre>

${H.box('real', 'Real-world notes:', 'Log errors by category: a spike in transient errors is an outage, a spike in validation errors is a description or schema problem. Make side-effecting tools idempotent (idempotency key per refund) so a retry after a timeout cannot double-charge. Cap retries with backoff and jitter. Keep customer-facing denial text in the server, reviewed like any copy.')}
${H.box('trap', 'Traps:', '<b>Returning empty results on failure</b> "to keep the agent going" (turns an outage into false facts). <b>Uniform "Operation failed"</b> (no recovery signal). <b>Retrying business or permission errors</b> (cannot succeed). <b>Terminating the whole workflow</b> on one subagent failure. <b>Propagating every transient blip to the coordinator</b> (floods context; subagent should retry locally). <b>Using a protocol error</b> for a business rule (hides it from the model).')}

<h3>Worked scenario</h3>
<p>A support agent calls <code>process_refund</code>. The payment API returns: first a 503, then success on retry for one customer; for another, "refund exceeds 30-day window". Today the server returns "Operation failed" in both cases, and the agent retries the policy case three times, then tells the customer "a technical issue occurred".</p>
<ol class="steps">
<li>Map the 503 to <code>transient</code>, <code>isRetryable: true</code>, <code>retryAfter</code>; the agent retries with backoff.</li>
<li>Map the window violation to <code>business</code>, <code>isRetryable: false</code>, with a <code>customerMessage</code> offering store credit.</li>
<li>Describe the error fields in the tool description so the model reads them.</li>
<li>Result: no wasted retries, accurate customer explanation, escalation only when the customer asks for an exception.</li></ol>

${H.check([
  ['A <code>lookup_charges</code> tool times out and returns <code>{"charges": []}</code>. What goes wrong and how do you fix it?', 'The agent treats the failure as a valid empty result and tells the customer there is no duplicate charge. Return <code>isError: true</code> with <code>errorCategory: "transient"</code> and <code>isRetryable: true</code>; reserve empty arrays for queries that actually ran.'],
  ['Which categories should normally have <code>isRetryable: false</code>, and why does it matter?', 'Validation (as sent), business and permission. Retrying cannot change the outcome; the flag prevents wasted attempts and pushes the agent to fix input, explain, or escalate.'],
  ['A web-search subagent hits three 503s on one source but succeeded on two others. What should it return?', 'Partial results from the two sources plus a structured failure record: source, category transient, attempts 3, last error, alternatives, and a coverage note. It should not return empty success or abort the whole task.'],
  ['What is the difference between a JSON-RPC protocol error and <code>isError: true</code>?', 'Protocol errors cover unknown tools or malformed requests at the protocol layer. <code>isError</code> reports a tool that ran and failed (API, validation, business), inside the result, so the model can see and react.'],
  ['Why include a separate customer-friendly message for business errors?', 'The agent relays accurate policy wording without internal codes and without improvising promises the policy does not allow.']
])}
${H.src([['MCP specification: tools and errors', 'https://modelcontextprotocol.io/specification/latest'], ['Define tools / handling tool results', 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools'], ['Writing effective tools for agents', 'https://www.anthropic.com/engineering/writing-tools-for-agents'], ['CCAR-F Exam Guide v1.0 (task 2.2)', '#/study']])}`;
    }
  });

  /* ------------------------------------------------------------------ 2.3 */
  CCAR.lessons.push({
    id: 'hb-23-tool-distribution', track: 'handbook', part: 'P2', num: '2.3', order: 203, domain: 'D2',
    objs: ['O33', 'O37', 'O27'], ts: ['2.3'], minutes: 30,
    title: 'Tool distribution across agents and tool_choice',
    summary: 'Why 18 tools degrade selection, scoped tool sets per role, narrow cross-role tools such as verify_fact, constrained replacements for generic tools, and tool_choice auto/any/forced, including why forced choice returns 400 on the newest models and what to use instead.',
    body: function () {
      return `
<p>Every tool you give an agent is one more option to rule out on every turn and one more thing to misuse. Tool distribution is least privilege for multi-agent systems: each agent gets its role\'s tools, plus a narrow cross-role tool where a frequent need would otherwise cost round trips. The second half is <code>tool_choice</code>: making sure a tool is called at all, or a specific one first. You scored 50% on distribution last time.</p>

<h3>Too many tools, and tools outside the role</h3>
${H.table(['Symptom', 'Fix'], [
  ['An agent with <b>18 tools</b> picks near-miss tools or chains unnecessary calls (decision complexity, overlapping descriptions)', 'Give each agent <b>4–5 role-relevant tools</b>; move the rest to other agents'],
  ['The <b>synthesis agent runs web searches</b> and cites unvetted pages (tools outside its specialization)', 'Remove search tools; add a scoped verification tool'],
  ['A read-only reviewer edits files (write tools inherited by default)', 'Explicit <code>tools</code> list; <code>disallowedTools</code> for writes'],
  ['A generic <code>fetch_url</code> pulls arbitrary pages', 'Constrained tool (<code>load_document</code>)']
])}

<h3>Scoped access per role: the research system</h3>
${H.table(['Agent', 'Tools', 'Deliberately not given'], [
  ['<b>Coordinator</b>', 'Task (Agent) to spawn subagents, a plan/memory store', 'Search and document tools (it delegates)'],
  ['<b>Web search agent</b>', '<code>web_search</code>, <code>extract_web_results</code>, <code>load_document</code>', 'Write/report tools'],
  ['<b>Document analysis agent</b>', '<code>extract_data_points</code>, <code>summarize_content</code>, <code>verify_claim_against_source</code>', 'Web search'],
  ['<b>Synthesis agent</b>', 'Read findings, write draft, <b><code>verify_fact</code></b> (scoped)', 'Full web search toolset'],
  ['<b>Report agent</b>', 'Read draft, format/citation tools, Write', 'Search, fetch']
])}
${D({ w: 760, h: 230, title: 'Least privilege with one scoped cross-role tool',
  nodes: [
    { id: 'c', x: 290, y: 12, w: 180, h: 48, label: 'Coordinator', sub: 'Task · plan store', kind: 'agent' },
    { id: 'w', x: 20, y: 110, w: 220, h: 56, label: 'Web search agent', sub: 'web_search · load_document', kind: 'sub' },
    { id: 's', x: 280, y: 110, w: 200, h: 56, label: 'Synthesis agent', sub: 'read · write · verify_fact', kind: 'sub' },
    { id: 'd', x: 520, y: 110, w: 220, h: 56, label: 'Doc analysis agent', sub: 'extract · summarize · verify', kind: 'sub' },
    { id: 'v', x: 280, y: 190, w: 200, h: 32, label: 'verify_fact: 85% simple', kind: 'good' }
  ],
  edges: [{ from: 'c', to: 'w' }, { from: 'c', to: 's' }, { from: 'c', to: 'd' }, { from: 's', to: 'c', dashed: true, label: '15% complex', dx: 40 }],
  caption: 'Simple fact checks stay in synthesis; deep ones go via the coordinator to the web search agent.' })}

<h3>The verify_fact reasoning (sample question 9)</h3>
<p>Every fact check goes synthesis → coordinator → web search agent → synthesis: 2–3 round trips per task, 40% extra latency. 85% are simple (dates, names, statistics); 15% need investigation.</p>
${H.table(['Option', 'Verdict', 'Why'], [
  ['Give synthesis a scoped <code>verify_fact</code> for simple lookups; complex checks still go through the coordinator', '<b>Correct</b>', 'Least privilege for the 85% case, existing coordination for the 15%'],
  ['Batch all verification needs to the end of the pass', 'Wrong', 'Later synthesis steps depend on earlier verified facts; creates blocking dependencies'],
  ['Give synthesis all web search tools', 'Wrong', 'Over-provisioning; cross-specialization misuse'],
  ['Have search pre-cache extra context speculatively', 'Wrong', 'Cannot predict what will need verifying']
])}

<h3>Constrained replacements for generic tools</h3>
<p><code>fetch_url(url)</code> can fetch anything; <code>load_document(url)</code> validates that the URL is a document from an allowed source, rejects the rest with a validation error, and returns cleaned text with metadata. Selection gets easier and the blast radius shrinks. Same move elsewhere: <code>run_sql</code> → <code>get_order_history(customer_id)</code>.</p>

<h3>Tool sets in the Agent SDK</h3>
<pre class="code">const options = {
  allowedTools: ["Task", "Read"],        // exam wiring: coordinator must include Task (Agent in current SDK)
  agents: {
    "web-search": {
      description: "Finds and loads web sources for a research sub-question.",
      prompt: "You search the web and return sources with URLs, dates and key quotes.",
      tools: ["WebSearch", "mcp__docs__load_document"],   // explicit list: nothing else
      model: "sonnet"
    },
    "synthesis": {
      description: "Combines findings into a draft with citations.",
      prompt: "Merge findings. Use verify_fact only for single dates, names or figures.",
      tools: ["Read", "Write", "mcp__research__verify_fact"],
      disallowedTools: ["WebSearch", "WebFetch", "mcp__web__*"]  // belt and braces
    }
  }
};</pre>
<p>Omitting <code>tools</code> means the subagent inherits all tools. <code>disallowedTools</code> blocks regardless of other settings and supports <code>mcp__server__*</code>. SDK <code>allowedTools</code> auto-approves; it does not restrict.</p>

<h3>tool_choice: auto, any, forced</h3>
${H.table(['Setting', 'Behavior'], [
  ['<code>{"type": "auto"}</code>', 'Default with tools; may call a tool or answer in text'],
  ['<code>{"type": "any"}</code>', 'Must call some tool; no text-only reply'],
  ['<code>{"type": "tool", "name": "extract_metadata"}</code>', 'Must call that tool (prerequisite first)'],
  ['<code>{"type": "none"}</code>', 'No tool calls (default without tools)']
])}
<p>With <code>any</code> or forced tool the API prefills the assistant turn, so no text precedes the <code>tool_use</code> block. Exam ordering pattern: <b>force <code>extract_metadata</code> first</b>, then run enrichment in <b>follow-up turns</b>, so enrichment always has the metadata it needs.</p>
<pre class="code">// Turn 1: prerequisite forced (exam pattern)
{ "tools": [extract_metadata, lookup_citations, classify_topic],
  "tool_choice": { "type": "tool", "name": "extract_metadata" }, ... }
// Turn 2+: model chooses among enrichment tools
{ "tool_choice": { "type": "auto" }, ... }</pre>

${H.box('exam', 'Exam vs current docs:', 'The exam guide teaches <code>"any"</code> to guarantee a tool call and forced <code>{"type":"tool"}</code> for a specific first tool; answer exam questions that way. Current docs: <b>Opus 5.5, Sonnet 5.5 and Fable 5.1 return 400 for tool_choice any/tool</b>; Haiku 4.5 and older still support them (manual extended thinking is incompatible with both). On the newest models: <b>auto + strict tool use</b> (<code>strict: true</code>), <b>structured outputs</b> (<code>output_config.format</code>) for a fixed JSON response, <b>expose only the prerequisite tool</b> on the first call, and <b>programmatic gating</b>. Prompting still steers which tool auto picks.')}
${H.table(['Goal', 'Exam answer', 'Current models (Opus 5.5 / Sonnet 5.5 / Fable 5.1)'], [
  ['Never get a text-only reply', '<code>tool_choice: "any"</code>', 'Structured outputs, or auto + strict tool use with prompting; validate in code'],
  ['Specific tool first', 'Forced <code>{"type":"tool"}</code>', 'First request lists only that tool; or a gate/hook blocks others until it has run'],
  ['Schema-valid tool input', 'Tool with JSON schema', '<code>strict: true</code> on the tool']
])}

<h3>Decision table</h3>
${H.table(['If', 'Choose', 'You give up'], [
  ['A subagent frequently needs one small capability of another role', 'Scoped cross-role tool (<code>verify_fact</code>)', 'One more tool to maintain'],
  ['Another role\'s capability is needed occasionally, for complex work', 'Route through the coordinator', 'A round trip of latency'],
  ['A generic tool reaches more than the role needs', 'Constrained replacement', 'Flexibility for odd inputs'],
  ['One agent has 15+ tools', 'Split into specialist subagents', 'Coordination overhead'],
  ['A tool must run before others', 'Forced first call (exam); only-tool-exposed or code gate (current)', 'An extra turn']
])}

${H.box('real', 'Real-world notes:', 'Least privilege is a security control: a prompt-injected page read by the web agent cannot trigger payments or writes if that agent has no such tools. Log off-role call attempts; they reveal weak role boundaries. For headless agents, <code>permissionMode: "dontAsk"</code> gives a fixed tool surface with hard denies.')}
${H.box('trap', 'Traps:', '<b>"Give every agent all tools for flexibility."</b> <b>"Tell the synthesis agent in its prompt never to search"</b> (probabilistic; remove the tool). <b>Batching verifications</b> to the end (blocking dependencies). <b>Merging all agents into one</b> with every tool. <b>Relying on <code>allowedTools</code> to restrict</b> in the SDK (it auto-approves). <b>Using <code>auto</code> and hoping</b> when the exam asks to guarantee a call.')}

<h3>Worked scenario</h3>
<p>An extraction pipeline sometimes gets a friendly text reply ("Here is what I found…") instead of a tool call, and enrichment tools sometimes run before <code>extract_metadata</code>, failing on missing IDs. The exam asks for the configuration that guarantees correct order and a tool call every time.</p>
<p><b>Exam answer:</b> force <code>extract_metadata</code> on the first request with <code>{"type":"tool","name":"extract_metadata"}</code>, then use <code>tool_choice: "any"</code> in follow-up turns so the model must call an enrichment tool rather than reply in text. <b>In production on Opus 5.5:</b> send only <code>extract_metadata</code> (with <code>strict: true</code>) on the first request, then the enrichment tools with <code>auto</code>, and have your code reject enrichment calls lacking a metadata ID.</p>

${H.check([
  ['The synthesis agent round-trips through the coordinator for every fact check (40% latency). 85% are simple lookups. Best fix?', 'A scoped <code>verify_fact</code> tool on the synthesis agent for simple checks; complex ones still go via the coordinator to the web search agent. Least privilege for the common case, coordination preserved for the rest.'],
  ['An agent has 18 tools and picks the wrong one about 1 in 10 calls. First structural fix?', 'Reduce its set to the 4–5 tools its role needs and move the others to specialist subagents; overlapping options and decision complexity drive the errors.'],
  ['Why replace <code>fetch_url</code> with <code>load_document</code>?', 'It validates document URLs in code: clearer selection, less reach for misuse or injection.'],
  ['On the exam, how do you guarantee the model calls a tool instead of replying in text? And on Sonnet 5.5 in production?', 'Exam: <code>tool_choice: "any"</code>. Sonnet 5.5 returns 400 for any/tool, so use structured outputs (<code>output_config.format</code>) or auto + strict tool use with prompting, and validate in code.'],
  ['A subagent definition has no <code>tools</code> field. What does it get, and why is that risky?', 'All tools, including off-role ones, inviting misuse. List tools explicitly.']
])}
${H.src([['Define tools and tool_choice', 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools'], ['Structured outputs', 'https://platform.claude.com/docs/en/build-with-claude/structured-outputs'], ['Agent SDK subagents', 'https://code.claude.com/docs/en/agent-sdk/subagents'], ['Multi-agent research system', 'https://www.anthropic.com/engineering/multi-agent-research-system'], ['CCAR-F Exam Guide v1.0 (task 2.3, sample Q9)', '#/study']])}`;
    }
  });

  /* ------------------------------------------------------------------ 2.4 */
  CCAR.lessons.push({
    id: 'hb-24-mcp-integration', track: 'handbook', part: 'P2', num: '2.4', order: 204, domain: 'D2',
    objs: ['O34', 'O35'], ts: ['2.4'], minutes: 30,
    title: 'Integrating MCP servers into Claude Code and agents',
    summary: 'Project, user and local scopes, .mcp.json with environment variable expansion, simultaneous tool discovery and mcp__server__tool naming, descriptions that beat Grep, community vs custom servers, resources as content catalogs, per-agent servers in the Agent SDK, and a troubleshooting table.',
    body: function () {
      return `
<p>MCP is how external systems (Jira, GitHub, your order database, internal docs) become usable by Claude Code and Agent SDK agents. The exam questions are practical: where configuration lives so the right people get it, how credentials stay out of git, what the agent sees once servers connect, build vs reuse, and when data belongs in a resource instead of a tool. Wrong scope: teammates never see the server. Wrong secrets handling: a token lands in git history.</p>

<h3>Scopes: who gets the server</h3>
${H.table(['Scope', 'Stored in', 'Shared?', 'Use for', 'Command'], [
  ['<b>Project</b>', '<code>.mcp.json</code> at the repo root (committed)', 'Yes, everyone who clones the repo', 'Team tooling: Jira, GitHub, the team\'s docs server', '<code>claude mcp add --scope project …</code>'],
  ['<b>User</b>', '<code>~/.claude.json</code>', 'No; personal, across all your projects', 'Personal or experimental servers you use everywhere', '<code>claude mcp add --scope user …</code>'],
  ['<b>Local</b> (default)', '<code>~/.claude.json</code>, for this project only', 'No; you, in this project', 'Trying a server in one repo before sharing it', '<code>claude mcp add …</code> or <code>--scope local</code>']
])}
<pre class="code"># team server, written to .mcp.json so it is committed and shared
claude mcp add --scope project jira -- &lt;jira-server-command&gt;

# personal experiment, available in every project, never committed
claude mcp add --scope user scratch-notes -- &lt;notes-server-command&gt;

# no --scope: local scope (only you, only this project)
claude mcp add db-explorer -- &lt;db-server-command&gt;</pre>
<p>Same name at several scopes: local overrides project, which overrides user. Project servers require workspace trust in interactive sessions.</p>

<h3>.mcp.json with environment variable expansion</h3>
<pre class="code">{
  "mcpServers": {
    "github": {
      "command": "&lt;github-server-command&gt;",
      "env": { "GITHUB_TOKEN": "\${GITHUB_TOKEN}" }
    },
    "team-docs": {
      "command": "node",
      "args": ["./tools/docs-mcp/server.js"],
      "env": {
        "DOCS_API_KEY": "\${DOCS_API_KEY}",
        "DOCS_BASE_URL": "\${DOCS_BASE_URL:-https://docs.internal.example}"
      }
    }
  }
}</pre>
<ul>
<li><code>\${GITHUB_TOKEN}</code> is expanded from each developer\'s environment at launch, so the committed file contains no secret.</li>
<li><code>\${VAR:-default}</code> supplies a default when the variable is unset (good for non-secret settings like a base URL; never put a real secret in the default).</li>
<li><b>Never commit literal tokens.</b> If one was committed, rotate it: removing it in a later commit leaves it in history.</li></ul>

<h3>What the agent sees after connection</h3>
${D({ w: 760, h: 210, title: 'All configured servers, one tool surface',
  nodes: [
    { id: 'cc', x: 290, y: 20, w: 190, h: 50, label: 'Claude Code / agent', sub: 'discovers tools at connection', kind: 'agent' },
    { id: 'g', x: 20, y: 130, w: 220, h: 60, label: 'github server', sub: 'mcp__github__search_issues', kind: 'tool' },
    { id: 'j', x: 270, y: 130, w: 220, h: 60, label: 'jira server', sub: 'mcp__jira__get_issue', kind: 'tool' },
    { id: 'r', x: 520, y: 130, w: 220, h: 60, label: 'team-docs server', sub: 'resources: docs index', kind: 'store' }
  ],
  edges: [{ from: 'cc', to: 'g', both: true }, { from: 'cc', to: 'j', both: true }, { from: 'cc', to: 'r', both: true }],
  caption: 'Tools from every configured server are discovered at connection and available simultaneously, alongside built-in tools. Server prefixes prevent name collisions.' })}
${H.table(['Fact', 'Consequence'], [
  ['All servers\' tools are available at the same time', 'The agent chooses among MCP and built-in tools every turn; descriptions decide'],
  ['Names follow <code>mcp__&lt;server&gt;__&lt;tool&gt;</code>', 'Permission rules and hooks target them: <code>mcp__github__*</code>, <code>mcp__jira__get_issue</code>'],
  ['Claude Code loads tool names at start, schemas on demand', 'Many servers fit; vague descriptions hurt'],
  ['Servers are not security-audited by Anthropic', 'Only connect servers you trust; use permission rules for sensitive tools']
])}
<pre class="code">// .claude/settings.json (project)
{ "permissions": {
    "allow": ["mcp__jira__get_issue", "mcp__github__*"],
    "deny":  ["mcp__github__delete_repository"]
} }</pre>

<h3>Descriptions that stop the agent defaulting to Grep</h3>
<p>A team exposes <code>search_code_index</code> (semantic search across all services, with owners and call graphs). The agent keeps using Grep, because the MCP tool\'s description says only "Searches code". Built-in tools are familiar and well described; an MCP tool has to <b>explain its capabilities and outputs in detail</b> to win the choice.</p>
<div class="two"><div>
<h4 class="bad-h">Before</h4>
<pre class="code">"description": "Searches code."</pre>
</div><div>
<h4 class="good-h">After</h4>
<pre class="code">"description": "Semantic search over the indexed
monorepo AND the 40 service repos not checked out
locally. Returns file path, symbol, owning team and
callers for each hit. Prefer this over Grep for
'where is X implemented', cross-service usage and
ownership questions. Use Grep only for exact text
in files already in the working tree."</pre>
</div></div>

<h3>Build or reuse</h3>
${H.table(['Integration', 'Choose'], [
  ['Standard systems (Jira, GitHub)', '<b>Existing community server</b>: maintained, handles auth and pagination, less code to own'],
  ['Team-specific workflow (deploy approvals, internal order API rules)', '<b>Custom server</b>: encodes rules no public server knows'],
  ['Community server lacks one workflow', 'Community server + a small custom server for the gap']
])}

<h3>Resources: catalogs instead of exploratory calls</h3>
<p>Tools are model-controlled actions. <b>Resources</b> expose data by URI, driven by the application or user. Use them for <b>content catalogs</b>: issue summaries, a documentation hierarchy, database schemas. The agent sees what exists up front instead of spending dozens of list and search calls discovering it.</p>
${H.table(['Catalog as resource', 'Replaces', 'Then the tool does'], [
  ['<code>docs://index</code>: documentation hierarchy with titles and paths', 'Repeated <code>list_pages</code> / <code>search_docs</code> probes', '<code>get_page(path)</code> for the one page needed'],
  ['<code>jira://sprint/current</code>: issue keys, titles, status', 'Paging through issues to find the right one', '<code>get_issue(key)</code> for details'],
  ['<code>db://schema</code>: tables, columns, relations', 'Trial queries to learn the schema', 'A targeted, correct query first time']
])}

<h3>MCP in the Agent SDK</h3>
<pre class="code">const options = {
  mcpServers: {
    orders: { command: "node", args: ["./mcp/orders.js"],
              env: { ORDERS_API_KEY: process.env.ORDERS_API_KEY } }
  },
  agents: {
    "billing-agent": {
      description: "Answers billing and refund questions.",
      prompt: "You handle billing questions using the orders tools.",
      mcpServers: ["orders"],                       // only this subagent gets the server
      tools: ["mcp__orders__lookup_order", "mcp__orders__list_charges"]
    }
  }
};</pre>
<p>A subagent that needs an MCP server must have it listed in its <code>mcpServers</code>; a missing entry is a common reason a subagent "cannot find" a tool that works in the parent.</p>
<p class="small muted">Exact <code>mcpServers</code> value shapes vary by SDK language and version; check the SDK reference before copying.</p>

<h3>Troubleshooting</h3>
${H.table(['Symptom', 'Likely cause', 'Fix'], [
  ['Teammates do not see the server you added', 'Added with default <b>local</b> scope (or user scope)', 'Re-add with <code>--scope project</code> so it is written to <code>.mcp.json</code>; commit it'],
  ['A token appears in <code>.mcp.json</code> in git history', 'Literal secret instead of <code>\${VAR}</code>', 'Rotate the token; replace with <code>\${VAR}</code>; each developer sets the variable'],
  ['Tool "not found" in a subagent', 'Server not in the subagent\'s <code>mcpServers</code>, or tool not in its <code>tools</code> list, or wrong <code>mcp__server__tool</code> name', 'Add the server and exact tool name to the agent definition'],
  ['Auth errors on calls', 'Variable unset in shell or CI', 'Set it where Claude Code runs'],
  ['Project servers not loading in a new clone', 'Workspace not trusted', 'Accept the trust prompt after reviewing <code>.mcp.json</code>']
])}

${H.box('real', 'Real-world notes:', 'Review <code>.mcp.json</code> changes like dependency changes: a new server is new code with access to your data. Use least-privilege credentials. In CI, pass <code>--mcp-config</code> (plus <code>--strict-mcp-config</code> to use only that config). Headless runs never show a trust dialog, so restrict setting sources for untrusted repos.')}
${H.box('trap', 'Traps:', '<b>User scope for a team need</b> (nobody else gets it). <b>Committing literal tokens</b> "because the repo is private". <b>Building a custom Jira server</b> when a community one exists. <b>Exposing a catalog only through tools</b>, forcing 20–40 exploratory calls. <b>Assuming tools must be enabled one server at a time</b> (all are available at once). <b>Blaming the model</b> when it prefers Grep over a thinly described MCP tool.')}

<h3>Worked scenario</h3>
<p>A platform team wants every developer to use the GitHub server and an internal docs server; one developer also wants to try an experimental metrics server. Last week someone committed <code>.mcp.json</code> with a real token, and the docs agent spends 30 calls per task listing pages.</p>
<ol class="steps">
<li>Project scope for GitHub and docs in <code>.mcp.json</code>, credentials as <code>\${GITHUB_TOKEN}</code> and <code>\${DOCS_API_KEY}</code>; rotate the leaked token.</li>
<li>User scope (<code>~/.claude.json</code>) for the metrics experiment.</li>
<li>Use the community GitHub server; keep the custom server only for internal docs.</li>
<li>Expose the docs hierarchy as a resource so the agent reads the index once, then fetches the right page.</li>
<li>Rewrite the docs search tool description so the agent prefers it over Grep for documentation questions.</li></ol>

${H.check([
  ['You ran <code>claude mcp add jira …</code>. It works for you, but a teammate who pulled the repo does not have it. Why?', 'Without <code>--scope</code> the server is added at local scope (your <code>~/.claude.json</code>, this project only). Re-add with <code>--scope project</code> so it goes into the committed <code>.mcp.json</code>.'],
  ['How do you share a server that needs a GitHub token without committing the token?', 'Put <code>"GITHUB_TOKEN": "\${GITHUB_TOKEN}"</code> in the server\'s <code>env</code> in <code>.mcp.json</code>; each developer (and CI) provides the variable.'],
  ['An agent makes 25 list calls to learn which docs exist before answering. What MCP feature fixes this?', 'Expose the documentation hierarchy as a resource (a content catalog), so the agent sees what exists without exploratory tool calls.'],
  ['The team needs Jira ticket access plus a custom release-approval flow. Build or reuse?', 'Use the community Jira server for the standard integration and build a custom server only for the team-specific approval workflow.'],
  ['What is the permission rule to allow all tools from the github server?', '<code>mcp__github__*</code>, because MCP tools are named <code>mcp__&lt;server&gt;__&lt;tool&gt;</code>.']
])}
${H.src([['Claude Code MCP', 'https://code.claude.com/docs/en/mcp'], ['Claude Code settings and permissions', 'https://code.claude.com/docs/en/settings'], ['Agent SDK MCP', 'https://code.claude.com/docs/en/agent-sdk/mcp'], ['MCP specification', 'https://modelcontextprotocol.io/specification/latest'], ['CCAR-F Exam Guide v1.0 (task 2.4)', '#/study']])}`;
    }
  });

  /* ------------------------------------------------------------------ 2.5 */
  CCAR.lessons.push({
    id: 'hb-25-builtin-tools', track: 'handbook', part: 'P2', num: '2.5', order: 205, domain: 'D2',
    objs: ['O32', 'O17'], ts: ['2.5'], minutes: 30,
    title: 'Built-in tools: Read, Write, Edit, Bash, Grep, Glob and incremental exploration',
    summary: 'Which built-in tool fits which operation, Edit\'s unique-anchor rule and the Read + Write fallback, and how to build codebase understanding incrementally (Grep for entry points, Read, follow imports, trace wrappers) instead of reading everything up front.',
    body: function () {
      return `
<p>Claude Code and the Agent SDK share the same built-in tools. Picking the right one is partly about correctness (Edit needs a unique match) and mostly about context: every file read and every search result lands in a finite window, and performance degrades as it fills. The exam checks tool fit (Grep for content, Glob for paths), the Edit fallback, and above all <b>incremental exploration</b>: find entry points, read what matters, follow the references. You scored 60% on the exploration objective, so the worked sequences below are the core of this chapter.</p>

<h3>Tool selection</h3>
${H.table(['Tool', 'Does', 'Use for', 'Not for'], [
  ['<b>Grep</b>', 'Searches file <b>contents</b> for a pattern', 'Callers of a function, where an error message is raised, import statements, config keys', 'Finding files by name'],
  ['<b>Glob</b>', 'Matches file <b>paths</b> by pattern', '<code>**/*.test.tsx</code>, <code>src/api/**/*.ts</code>, <code>**/migrations/*.sql</code>', 'Searching inside files'],
  ['<b>Read</b>', 'Loads a file\'s contents', 'Understanding a file found by Grep/Glob; before any Write or Edit', 'Bulk-loading a directory "to be safe"'],
  ['<b>Write</b>', 'Writes a whole file', 'New files; full rewrites; fallback when Edit cannot match uniquely', 'Small changes in large files (easy to clobber content)'],
  ['<b>Edit</b>', 'Replaces an exact, <b>unique</b> text match', 'Targeted changes: one function, one config line', 'Text that occurs several times without enough context'],
  ['<b>Bash</b>', 'Runs shell commands', 'Tests, builds, linters, git, package scripts', 'Searching or reading code (use Grep/Glob/Read)']
])}
${H.box('rule', 'Content vs path:', 'If the question is "which files <i>contain</i> X", use Grep. If it is "which files are <i>named</i> like X", use Glob. Most wrong answers swap the two.')}

<h3>Grep patterns you should recognize</h3>
<pre class="code">Grep  "calculateDiscount\\("               # all callers of a function
Grep  "Payment method declined"           # where a user-facing error is raised
Grep  "from ['\\"]@/lib/billing['\\"]"      # every importer of a module
Grep  "FEATURE_NEW_CHECKOUT"              # every use of a flag or env var
Glob  "**/*.test.tsx"                     # all React component tests
Glob  "services/*/src/**/handler.ts"      # one file per service</pre>
<p>Specific patterns (a symbol name, an exact message) return a handful of hits. Broad ones ("post", "retry", "error") return thousands and flood the context.</p>

<h3>Edit, and the Read + Write fallback</h3>
<p>Edit replaces <code>old text</code> with <code>new text</code> and fails if the old text is not found or is <b>not unique</b> in the file. Repetitive code (the same <code>return null;</code> in six branches, identical config blocks) is where it fails.</p>
<ol class="steps">
<li><b>Widen the anchor:</b> include surrounding lines (function signature, a nearby comment) so the match is unique.</li>
<li><b>If no unique anchor exists:</b> <b>Read</b> the full file, make the change in the content, and <b>Write</b> the whole file back.</li>
<li>Re-read or run tests to confirm only the intended change happened.</li></ol>
<div class="two"><div>
<h4 class="bad-h">Fails: appears 3 times</h4>
<pre class="code">old: "  timeout: 30,"
new: "  timeout: 60,"</pre>
</div><div>
<h4 class="good-h">Works: unique context</h4>
<pre class="code">old: "payments: {\\n    retries: 2,\\n    timeout: 30,"
new: "payments: {\\n    retries: 2,\\n    timeout: 60,"</pre>
</div></div>

<h3>Incremental understanding vs reading everything</h3>
${D({ w: 760, h: 200, title: 'Incremental exploration loop',
  nodes: [
    { id: 'q', x: 20, y: 70, w: 130, h: 56, label: 'Question', sub: 'what must I learn?', kind: 'human' },
    { id: 'g', x: 180, y: 70, w: 130, h: 56, label: 'Grep', sub: 'entry points', kind: 'tool' },
    { id: 'r', x: 340, y: 70, w: 130, h: 56, label: 'Read', sub: 'the hits only', kind: 'tool' },
    { id: 'f', x: 500, y: 70, w: 130, h: 56, label: 'Follow', sub: 'imports and calls', kind: 'tool' },
    { id: 'n', x: 650, y: 70, w: 100, h: 56, label: 'Notes', sub: 'file:line facts', kind: 'store' },
    { id: 'bad', x: 180, y: 150, w: 450, h: 36, label: 'Glob **/* and read everything: context full, recall drops', kind: 'bad' }
  ],
  edges: [{ from: 'q', to: 'g' }, { from: 'g', to: 'r' }, { from: 'r', to: 'f' }, { from: 'f', to: 'n' }, { from: 'f', to: 'g', dashed: true, label: 'new symbol', dy: -30 }],
  caption: 'Each step narrows what to load next. The context holds the files that matter plus short notes, not the whole repository.' })}
${H.table(['Approach', 'Context cost', 'Result'], [
  ['Read every file in the module up front', 'Very high; much of it irrelevant', 'Attention dilutes; details from early files get lost; slow'],
  ['Glob all files, read alphabetically or by size', 'High', 'Order has nothing to do with relevance'],
  ['<b>Grep for entry points → Read hits → follow imports</b>', 'Proportional to the question', 'Focused understanding, evidence with file:line']
])}

<h3>Tracing through wrapper modules</h3>
<p>Grepping the original function name misses callers that go through a wrapper or re-export. <code>billing/index.ts</code> re-exports <code>createInvoice</code> as <code>makeInvoice</code>, and <code>legacy/api.ts</code> wraps it as <code>issueInvoice</code>. A Grep for <code>createInvoice</code> alone finds a fraction of the real usage.</p>
<ol class="steps">
<li>Grep the definition, then Grep imports of its module to find wrappers and barrels.</li>
<li><b>Read each wrapper and list every exported name or alias</b> that leads to the function (<code>makeInvoice</code>, <code>issueInvoice</code>, default exports, namespace imports such as <code>billing.createInvoice</code>).</li>
<li><b>Grep each name</b> across the codebase and merge the results.</li>
<li>Note dynamic access (string keys, dependency injection) that text search cannot see, and say so in your findings.</li></ol>

<h3>Worked exploration: "where is the discount applied at checkout?"</h3>
<pre class="code">1  Grep "applyDiscount"                      → src/pricing/discount.ts:12 (definition), 2 importers
2  Read src/pricing/discount.ts              → exported as applyDiscount; re-exported by src/pricing/index.ts
3  Read src/pricing/index.ts                 → export { applyDiscount as withPromo }
4  Grep "withPromo|applyDiscount"            → src/checkout/cart.ts:88, src/api/quote.ts:41, src/jobs/reprice.ts:17
5  Read src/checkout/cart.ts (relevant part) → called in computeTotals() after tax (bug candidate)
6  Glob "src/checkout/**/*.test.ts"          → cart.test.ts, totals.test.ts
7  Read src/checkout/totals.test.ts          → no test covers discount-after-tax order
8  Bash "npm test -- totals"                 → run the tests after the change</pre>
<p>Eight calls, five files read, every conclusion tied to a line. Steps 1 and 6 find; steps 2, 3, 5 and 7 understand; step 4 catches the alias; step 8 verifies.</p>

<h3>Context budget per tool</h3>
${H.table(['Tool', 'Typical cost', 'Keep it small by'], [
  ['Grep', 'Low to very high, depending on the pattern', 'Specific patterns, restricting to a path or file type, listing files before showing matching lines'],
  ['Glob', 'Low (paths only)', 'Narrow patterns; do not Glob <code>**/*</code>'],
  ['Read', 'Whole file into context', 'Read hits, not directories; for very large files read the relevant range'],
  ['Bash', 'Command output; test logs can be huge', 'Run targeted tests, filter output; tool responses are capped at 25,000 tokens by default'],
  ['Write / Edit', 'Low output, but Write needs full content', 'Prefer Edit for small changes']
])}
<p>For breadth (a 45+ file migration, a whole-repo survey), delegate exploration to a subagent such as the built-in read-only Explore agent so only its summary returns to the main context. Read-only tools (Read, Glob, Grep) run in parallel; Edit, Write and Bash run sequentially.</p>
${H.box('real', 'Real-world notes:', 'Code intelligence plugins can add language-aware navigation (definitions and references) on top of text search, which helps with aliases and overloaded names; still verify with Grep and tests. Keep a scratchpad of confirmed facts (file:line) during long investigations so compaction or a fresh session does not lose them. Give Claude a verification command (test, build, linter) for every change.')}
${H.box('trap', 'Traps:', '<b>Glob to search contents</b> or <b>Grep to find files by name</b>. <b>Reading all files up front</b> "for complete context". <b>Bash <code>cat</code>/<code>find</code>/<code>grep</code></b> instead of the dedicated tools. <b>Repeating a failed Edit</b> unchanged, or <b>repo-wide sed</b> as the fallback (use a unique anchor or Read + Write). <b>Grepping only the original name</b> when wrappers re-export it. <b>Broad regexes</b> like "retry". <b>Trusting stale docs</b> over the code.')}

<h3>Worked scenario</h3>
<p>A developer asks Claude Code to find every place that sends a password-reset email, in a large monorepo, and change the link expiry from 1 hour to 30 minutes. The first attempt used Glob <code>**/*.ts</code> and began reading files alphabetically; the second tried Edit on <code>expiresIn: 3600</code>, which occurs in 4 places in one config file.</p>
<ol class="steps">
<li>Grep the email template ID or subject string to find the sender; Read that file.</li>
<li>List its exported names and any wrapper (<code>notify.passwordReset</code>); Grep each one.</li>
<li>Edit with an anchor that includes the enclosing <code>passwordReset: {</code> key; if still not unique, Read + Write the config file.</li>
<li>Bash the relevant tests.</li></ol>

${H.check([
  ['You need every component test file in a React repo. Which tool and pattern?', 'Glob with <code>**/*.test.tsx</code>: it matches paths. Grep searches contents and is the wrong tool for names.'],
  ['You need every caller of <code>formatCurrency</code>. Which tool?', 'Grep for the function name (and then for any aliases found in wrapper or index modules). It searches contents across the codebase.'],
  ['Edit fails because the target line appears three times. What next?', 'Widen the anchor with surrounding unique context; if none exists, Read the whole file and Write it back with the change. Do not retry the same Edit or run a repo-wide replace.'],
  ['Why is "read the whole module first" worse than Grep → Read → follow imports?', 'It fills the context with irrelevant code and dilutes attention, so details get lost. Incremental exploration loads only what the question needs and ties findings to specific lines.'],
  ['Grep for <code>createInvoice</code> finds 3 callers, but production logs show 11 call sites. Likely cause and fix?', 'Callers use wrapper or re-exported names. Read the wrapper modules, list all exported names and aliases, then Grep each name across the codebase.'],
  ['When is Bash the right built-in tool?', 'To run things: tests, builds, linters, git and scripts. Not for searching or reading code, where Grep, Glob and Read are cheaper and clearer.']
])}
${H.src([['Claude Code best practices', 'https://code.claude.com/docs/en/best-practices'], ['Agent SDK overview (built-in tools)', 'https://code.claude.com/docs/en/agent-sdk/overview'], ['Effective context engineering for AI agents', 'https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents'], ['CCAR-F Exam Guide v1.0 (task 2.5)', '#/study']])}`;
    }
  });
})();
