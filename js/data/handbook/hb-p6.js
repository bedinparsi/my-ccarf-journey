/* Architect Handbook · Part 6: scenario playbooks (S1–S6) as reference architectures. */
(function () {
  var H = CCAR.hb, D = H.D;

  /* ------------------------------------------------------------------ 6.1 */
  CCAR.lessons.push({
    id: 'hb-61-support-agent', track: 'handbook', part: 'P6', num: '6.1', order: 601, domain: 'ALL',
    objs: ['X02', 'X03', 'X05', 'O22', 'X04'], ts: ['1.4', '1.5', '2.2', '5.1', '5.2'], minutes: 30,
    title: 'Playbook: customer support resolution agent (S1)',
    summary: 'A reference design for the support agent scenario: four MCP tools behind prerequisite gates and a $500 refund hook, a persistent case-facts block, multi-concern handling, calibrated escalation, structured errors and handoffs, and the failure signatures the exam describes.',
    body: function () {
      return `
${H.box('real', 'Scenario 1 (exam guide, verbatim):', '<i>You are building a customer support resolution agent using the Claude Agent SDK. The agent handles high-ambiguity requests like returns, billing disputes, and account issues. It has access to your backend systems through custom Model Context Protocol (MCP) tools (get_customer, lookup_order, process_refund, escalate_to_human). Your target is 80%+ first-contact resolution while knowing when to escalate.</i>')}
<p><b>Domains tested:</b> Agentic Architecture &amp; Orchestration (enforcement, hooks, handoffs: 1.4, 1.5), Tool Design &amp; MCP Integration (descriptions, structured errors: 2.1, 2.2), Context Management &amp; Reliability (case facts, escalation, multiple matches: 5.1, 5.2). The tension the exam keeps returning to is in the last sentence: resolve as much as possible (80% first-contact resolution) <b>and</b> escalate the right cases. Every question is a variant of "which layer should own this rule: the prompt, a tool description, a hook, or a human?"</p>

<h3>Reference architecture</h3>
${D({ w: 760, h: 320, title: 'Support resolution agent',
  groups: [{ x: 570, y: 10, w: 180, h: 300, label: 'MCP SERVER: support', kind: 'hard' }, { x: 370, y: 10, w: 190, h: 300, label: 'HOOKS (your process)', kind: 'soft' }],
  nodes: [
    { id: 'c', x: 15, y: 40, w: 120, h: 50, label: 'Customer', sub: 'chat / email', kind: 'human' },
    { id: 'a', x: 160, y: 30, w: 190, h: 76, label: 'Support agent (SDK)', sub: 'criteria + few-shot escalation', kind: 'agent' },
    { id: 'f', x: 160, y: 150, w: 190, h: 60, label: 'Case facts block', sub: 'IDs, amounts, dates, asks', kind: 'store' },
    { id: 'pre', x: 380, y: 40, w: 170, h: 60, label: 'PreToolUse', sub: 'verified-ID gate · $500 cap', kind: 'good' },
    { id: 'post', x: 380, y: 150, w: 170, h: 60, label: 'PostToolUse', sub: 'normalize, trim, record ID', kind: 'good' },
    { id: 'hq', x: 160, y: 250, w: 190, h: 54, label: 'Human agent queue', sub: 'structured handoff only', kind: 'human' },
    { id: 't1', x: 585, y: 36, w: 150, h: 44, label: 'get_customer', kind: 'tool' },
    { id: 't2', x: 585, y: 100, w: 150, h: 44, label: 'lookup_order', kind: 'tool' },
    { id: 't3', x: 585, y: 164, w: 150, h: 44, label: 'process_refund', kind: 'tool' },
    { id: 't4', x: 585, y: 238, w: 150, h: 44, label: 'escalate_to_human', kind: 'tool' }
  ],
  edges: [{ from: 'c', to: 'a', both: true }, { from: 'a', to: 'pre' }, { from: 'pre', to: 't2' }, { from: 'pre', to: 't3' }, { from: 't1', to: 'post', dashed: true }, { from: 'post', to: 'f' }, { from: 'f', to: 'a', label: 'every turn' }, { from: 't4', to: 'hq' }],
  caption: 'The model decides what to do; code decides what is allowed. Hooks sit between the agent and the MCP tools: PreToolUse enforces ordering and limits, PostToolUse normalizes results and records verified facts. Escalations leave as a structured payload because the human never sees the transcript.' })}
${H.table(['Component', 'Responsibility', 'Chapter'], [
  ['System prompt', 'Role, resolution scope, explicit escalation criteria with 2 to 4 few-shot cases, multi-concern procedure, "ask for another identifier on multiple matches"', '5.2, 4.2'],
  ['Tool descriptions', 'Differentiate <code>get_customer</code> from <code>lookup_order</code>: accepted identifiers, example queries, what each does not return', '2.1'],
  ['PreToolUse hooks', 'Block <code>lookup_order</code> / <code>process_refund</code> until a verified customer ID exists; deny refunds above $500 and redirect to escalation', '1.4, 1.5'],
  ['PostToolUse hook', 'Normalize timestamps and status codes, trim 40+ order fields to the 5 that matter, write verified IDs and amounts into case facts', '1.5, 5.1'],
  ['MCP server', 'Structured <code>isError</code> results with <code>errorCategory</code>, <code>isRetryable</code>, customer-safe message; empty result is a success', '2.2'],
  ['Case facts block', 'Transactional facts kept verbatim outside summarized history and re-sent every turn', '5.1'],
  ['Escalation payload', 'customer ID, root cause, amount, what was tried, recommended action', '1.4']
])}

<h3>Design decisions you must be able to defend</h3>
${H.table(['Decision', 'Recommended choice', 'Why', 'Common wrong answer'], [
  ['Identity before order/refund operations', 'Programmatic prerequisite: hook denies <code>lookup_order</code> and <code>process_refund</code> until <code>get_customer</code> returned a verified ID', 'Financial consequence; prompt compliance has a non-zero failure rate', '"Make verification MANDATORY in the system prompt"; few-shot examples of calling get_customer first'],
  ['Refund limit ($500)', 'PreToolUse hook denies above the limit, reason tells Claude to call <code>escalate_to_human</code>', 'Deterministic, and the redirect keeps the conversation moving', 'Prompt rule; letting the agent split a $740 refund into two'],
  ['Misrouted tool selection', 'Expand tool descriptions (formats, examples, edge cases, when to use the other tool)', 'Descriptions are the primary selection mechanism; low effort, high leverage', 'Keyword router; 5 to 8 few-shot examples; merging into <code>lookup_entity</code> as a first step'],
  ['Escalation calibration', 'Explicit criteria plus few-shot examples in the system prompt', 'Root cause is unclear decision boundaries', 'Self-reported confidence 1 to 10; sentiment threshold; separate classifier'],
  ['Customer asks for a human', 'Escalate immediately, no investigation first', 'Honor explicit requests', '"Try to resolve first to protect FCR"'],
  ['Frustrated, issue is simple', 'Acknowledge, offer the resolution; escalate if the customer reiterates', 'Frustration is not complexity', 'Escalate on negative sentiment'],
  ['Policy silent (competitor price match)', 'Escalate as a policy gap', 'Agent must not invent policy', 'Apply the nearest own-site rule'],
  ['Multiple customer matches', 'Ask for another identifier (email, order number, postcode)', 'Heuristic picks refund the wrong account', 'Pick the most recent or most active account'],
  ['Long conversations', 'Case facts block outside summarized history; trim tool results', 'Summaries turn $187.40 into "a refund"', 'Bigger context window; summarize everything'],
  ['Multi-concern message', 'Decompose into items, investigate in parallel with shared context, one unified reply', 'Nothing dropped, fewer turns', 'Answer the first concern and wait']
])}

<h3>Configuration sketch</h3>
<pre class="code">// TypeScript, Agent SDK. Tool names are mcp__&lt;server&gt;__&lt;tool&gt;.
const verified = new Map();   // session_id -&gt; { customerId }   (use your session store in production)

const recordVerified = async (input) =&gt; {            // PostToolUse on get_customer
  const r = parseToolJson(input.tool_response);        // your helper
  if (r?.matches?.length === 1 &amp;&amp; r.matches[0].verified) {
    verified.set(input.session_id, { customerId: r.matches[0].customer_id });
  }
  return {};
};

const requireVerified = async (input) =&gt; {           // PreToolUse on lookup_order | process_refund
  const v = verified.get(input.session_id);
  if (!v) return deny("No verified customer yet. Call get_customer first; if it returns several " +
                      "matches, ask the customer for an email or order number. Do not guess.");
  if (input.tool_input.customer_id &amp;&amp; input.tool_input.customer_id !== v.customerId)
    return deny("customer_id does not match the verified customer for this conversation.");
  return {};
};

const refundCap = async (input) =&gt; {                 // PreToolUse on process_refund
  if (Number(input.tool_input.amount) &gt; 500)
    return deny("Refunds over 500 USD need human approval. Do not split the refund. Call " +
                "escalate_to_human with customer_id, order_id, amount, root_cause, recommended_action.");
  return {};
};

const deny = (reason) =&gt; ({ hookSpecificOutput: {
  hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: reason } });

const options = {
  systemPrompt: SUPPORT_PROMPT,                        // role, criteria, few-shot escalation cases
  mcpServers: { support: { command: "node", args: ["servers/support-mcp.js"] } },
  allowedTools: ["mcp__support__get_customer", "mcp__support__lookup_order",
                 "mcp__support__process_refund", "mcp__support__escalate_to_human"],
  disallowedTools: ["Bash", "Write", "Edit", "WebFetch", "WebSearch"],   // customer-facing: no dev tools
  permissionMode: "dontAsk",                           // fixed tool surface, hard deny, never prompts
  maxTurns: 25, maxBudgetUsd: 1.0,                     // safety rails, not the stop condition
  hooks: {
    PreToolUse: [
      { matcher: "mcp__support__(lookup_order|process_refund)", hooks: [requireVerified] },
      { matcher: "mcp__support__process_refund", hooks: [refundCap] } ],
    PostToolUse: [
      { matcher: "mcp__support__get_customer", hooks: [recordVerified] },
      { matcher: "mcp__support__.*", hooks: [normalizeAndTrim] } ]   // ISO dates, status names, 5 fields
  }
};</pre>
<div class="two"><div>
<h4>Structured tool error (MCP result)</h4>
<pre class="code">// tool result: isError + serialized payload
{ "isError": true,
  "content": [{ "type": "text",
                "text": "&lt;payload below as JSON&gt;" }] }

// payload
{ "errorCategory": "business",
  "isRetryable": false,
  "message": "Order 4417 is outside the 30-day
    return window (delivered 2026-08-12).",
  "customerMessage": "This order is past our
    30-day return period." }</pre>
<p class="small">Transient (timeout) → <code>isRetryable: true</code>. Validation → fix input. Permission → escalate. A search with no matches is <b>not</b> an error: return success with an empty list.</p>
</div><div>
<h4>Escalation handoff payload</h4>
<pre class="code">escalate_to_human({
  "customer_id": "C-20931",
  "verified": true,
  "issue_items": [
    { "order_id": "4417", "type": "refund",
      "amount": 740.00, "status": "blocked_over_limit" } ],
  "root_cause": "Item arrived damaged; photo provided",
  "attempted": ["verified identity", "confirmed order"],
  "customer_expectation": "Full refund to card",
  "recommended_action": "Approve 740.00 refund",
  "reason_for_escalation": "amount_over_limit" })</pre>
</div></div>
${H.box('exam', 'Exam vs current docs:', 'Some distractors propose forcing <code>get_customer</code> with <code>tool_choice</code>. On the exam, forced tool choice guarantees a specific first call, but it does not stop later out-of-order calls, so the prerequisite gate is still the answer for ordering. In current docs, Opus 5.5, Sonnet 5.5 and Fable 5.1 return 400 for forced or <code>any</code> tool choice; gate in code (hooks, or expose only <code>get_customer</code> until verification succeeds).')}

<h3>Failure signatures → root cause → fix</h3>
${H.table(['Symptom (as the exam phrases it)', 'Root cause', 'Fix'], [
  ['"In 12% of cases the agent skips get_customer and calls lookup_order using the stated name"', 'Ordering enforced only by prompt', 'Programmatic prerequisite gate (1.4)'],
  ['"Agent calls get_customer when users say check my order #12345"', 'Minimal, overlapping descriptions', 'Expand both descriptions with formats, examples, boundaries (2.1)'],
  ['"55% FCR: escalates standard damage replacements with photo evidence, handles policy exceptions alone"', 'No explicit escalation boundaries', 'Explicit criteria plus few-shot examples (5.2)'],
  ['"A $740 refund went through although the prompt states a $500 limit"', 'Business rule in the prompt', 'PreToolUse hook: deny and redirect to escalate_to_human (1.5)'],
  ['"Refund applied to the wrong J. Smith"', 'Heuristic choice among multiple matches', 'Ask for an additional identifier; gate requires exactly one verified match (5.2)'],
  ['"Late in long chats the agent says the refund is around a hundred dollars"', 'Progressive summarization lost the exact amount', 'Case facts block outside summarized history (5.1)'],
  ['"Context fills after a few order lookups; each returns 40+ fields"', 'Untrimmed tool results', 'PostToolUse trim to return-relevant fields (5.1, 1.5)'],
  ['"Agent misjudges the return window; one tool returns Unix time, another ISO 8601"', 'Heterogeneous formats reach the model', 'PostToolUse normalization (1.5)'],
  ['"Agent retries a rejected refund five times" or "tells the customer there was a system error"', 'Uniform "Operation failed" errors', '<code>errorCategory: business</code>, <code>isRetryable: false</code>, customer-safe message (2.2)'],
  ['"Agent tells the customer they have no orders during an order-service outage"', 'Timeout returned as empty success', 'Timeout is <code>isError</code> transient; empty list only for real no-match (2.2)'],
  ['"Human agents re-ask the customer everything after escalation"', 'Unstructured or missing handoff', 'Structured handoff summary (1.4)'],
  ['"Customer asks for a manager; agent keeps troubleshooting"', 'Agent overrides an explicit request', 'Honor human requests immediately (5.2)']
])}

<h3>Metrics and evals in production</h3>
${H.table(['Metric', 'How to measure', 'Why it matters'], [
  ['First-contact resolution', 'Resolved without escalation and no recontact on the same issue within a set window', 'The scenario target (80%+); count only true resolutions'],
  ['Escalation precision and recall', 'Label a sample: should-escalate vs should-resolve; compare to agent decisions', 'FCR can be gamed by never escalating; recall protects customers'],
  ['Hook denials by rule', 'Count PreToolUse denies (gate, $500 cap) per 1,000 conversations', 'A rising rate means the prompt or descriptions regressed, even though the hook caught it'],
  ['Wrong-account and policy incidents', 'Audit refunds against verified IDs and limits', 'Must be zero; any incident means a gate is missing'],
  ['Handoff completeness', 'Human agents rate payloads; fields present; re-asks per escalation', 'Measures whether humans can act without the transcript'],
  ['Tool errors by category', 'transient / validation / business / permission rates', 'Separates backend health from agent behavior'],
  ['Cost and turns per resolution', '<code>total_cost_usd</code>, <code>num_turns</code> from ResultMessage', 'Budget rails and model choice'],
  ['Consistency (pass^k)', 'Run each eval task k times; all must pass', 'Customers see every trial, not the best one']
])}
<p>Build the eval suite from real transcripts: balanced should-escalate and should-resolve cases, multi-concern messages, multiple-match lookups, over-limit refunds, policy gaps. Grade outcomes in the environment (refund row with the right amount and customer, escalation ticket with required fields), not what the agent says it did. Calibrate any model-based grader for tone or empathy against human ratings (7.2, 5.5).</p>

<h3>Exam question patterns for this scenario</h3>
<ul>
<li><b>"Most effective way to guarantee X always happens"</b> (verification, limits) → hook or prerequisite gate, never a stronger prompt.</li>
<li><b>"Most effective first step"</b> for misrouting → better tool descriptions; for bad escalation → explicit criteria plus few-shot.</li>
<li><b>Confidence or sentiment as an escalation trigger</b> → wrong; they are poor proxies for case complexity.</li>
<li><b>Explicit request for a human</b> → escalate now. <b>Frustrated but simple</b> → offer resolution first.</li>
<li><b>Policy does not cover it</b> → escalate; do not extrapolate.</li>
<li><b>Several matching customers</b> → ask for another identifier.</li>
<li><b>Long session loses numbers</b> → case facts block; <b>40-field results</b> → trim in PostToolUse.</li>
<li><b>Errors</b> → structured category and retryability; empty is not failure.</li>
<li><b>Escalation to a human without transcript access</b> → structured summary with ID, root cause, amount, recommended action.</li>
<li><b>Three-issue message</b> → decompose, investigate in parallel with shared context, synthesize one answer.</li></ul>

${H.check([
  ['A customer writes: "Refund order 4417, update my shipping address, and why was I charged twice in August?" The agent answers the refund and stops. What design change fixes this?', 'Instruct (and show with an example) multi-concern decomposition: list the distinct items, investigate each (in parallel where independent, sharing the verified customer context), track them in the case facts block, then send one unified resolution covering all three. Answering sequentially and waiting drops concerns and costs contacts.'],
  ['<code>get_customer</code> returns three records for "Jordan Lee". What should the agent do, and what should the gate do?', 'The agent asks for an additional identifier (email, order number, postcode) instead of picking one. The gate records a verified ID only when exactly one verified match exists, so <code>process_refund</code> stays blocked until the ambiguity is resolved.'],
  ['The team proposes routing any conversation with negative sentiment to humans to raise CSAT. Evaluate.', 'Sentiment does not track complexity: it escalates frustrated customers with simple, resolvable issues (hurting FCR) and misses calm customers with policy exceptions. Use explicit criteria: explicit human request, policy gap or exception, inability to make progress, over-limit amounts. Acknowledge frustration and offer resolution; escalate if the customer reiterates.'],
  ['During a billing-service outage the agent tells customers "you have no charges on record". What is wrong in the tool layer?', 'The MCP tool converts a timeout into an empty successful result. Return <code>isError: true</code> with <code>errorCategory: "transient"</code> and <code>isRetryable: true</code>, so the agent can retry or tell the customer the system is temporarily unavailable. Reserve empty success for a real query with no matches.'],
  ['A $620 refund is correct per policy but above the automation limit. Walk through what happens in the reference design.', 'The agent calls <code>process_refund</code>; the PreToolUse hook denies it with a reason instructing escalation and forbidding splitting. The agent calls <code>escalate_to_human</code> with customer ID, order, amount, root cause, what was verified and a recommended action, and tells the customer a specialist will approve it. The limit holds regardless of how persuasive the conversation was.']
])}
${H.src([['Agent SDK hooks', 'https://code.claude.com/docs/en/agent-sdk/hooks'], ['Agent SDK permissions', 'https://code.claude.com/docs/en/agent-sdk/permissions'], ['Agent SDK MCP', 'https://code.claude.com/docs/en/agent-sdk/mcp'], ['Define tools', 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools'], ['MCP specification', 'https://modelcontextprotocol.io/specification/latest'], ['Writing tools for agents', 'https://www.anthropic.com/engineering/writing-tools-for-agents'], ['Demystifying evals for AI agents', 'https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents']])}`;
    }
  });

  /* ------------------------------------------------------------------ 6.2 */
  CCAR.lessons.push({
    id: 'hb-62-claude-code-dev', track: 'handbook', part: 'P6', num: '6.2', order: 602, domain: 'ALL',
    objs: ['O16', 'X07', 'X12', 'O14', 'O08', 'O12'], ts: ['3.1', '3.2', '3.3', '3.4', '3.5'], minutes: 30,
    title: 'Playbook: code generation with Claude Code (S2)',
    summary: 'A reference team setup for Claude Code: the repo layout of CLAUDE.md, rules, skills, commands, settings, hooks and .mcp.json, how to pick the right mechanism, when to plan and when to execute, iterative refinement, and the failure signatures the exam uses.',
    body: function () {
      return `
${H.box('real', 'Scenario 2 (exam guide, verbatim):', '<i>You are using Claude Code to accelerate software development. Your team uses it for code generation, refactoring, debugging, and documentation. You need to integrate it into your development workflow with custom slash commands, CLAUDE.md configurations, and understand when to use plan mode vs direct execution.</i>')}
<p><b>Domains tested:</b> Claude Code Configuration &amp; Workflows (CLAUDE.md hierarchy, commands and skills, path rules, plan mode, refinement: 3.1 to 3.5) and Context Management &amp; Reliability (context degradation in long sessions, Explore subagent, /compact: 5.4). Almost every question is a mechanism-selection question: "where does this instruction or behavior belong so that the right people get it, at the right time, with the right strength?"</p>

<h3>Reference architecture</h3>
${D({ w: 760, h: 320, title: 'Team Claude Code setup: what loads where',
  groups: [{ x: 380, y: 10, w: 185, h: 300, label: 'IN CONTEXT', kind: 'soft' }, { x: 580, y: 10, w: 170, h: 300, label: 'OUTSIDE CONTEXT', kind: 'hard' }],
  nodes: [
    { id: 'dev', x: 15, y: 40, w: 140, h: 50, label: 'Developer', sub: 'terminal / IDE', kind: 'human' },
    { id: 's', x: 175, y: 30, w: 185, h: 76, label: 'Claude Code session', sub: 'plan mode, then direct execution', kind: 'agent' },
    { id: 'ex', x: 175, y: 150, w: 185, h: 56, label: 'Explore subagent', sub: 'verbose discovery → summary', kind: 'sub' },
    { id: 'mcp', x: 15, y: 240, w: 150, h: 56, label: '.mcp.json servers', sub: 'shared, env-var auth', kind: 'store' },
    { id: 'cm', x: 390, y: 35, w: 165, h: 54, label: 'CLAUDE.md + @imports', sub: 'every request, under 200 lines', kind: 'store' },
    { id: 'ru', x: 390, y: 100, w: 165, h: 54, label: '.claude/rules/*.md', sub: 'paths globs load on match', kind: 'store' },
    { id: 'sk', x: 390, y: 165, w: 165, h: 54, label: 'Skills / commands', sub: 'description always, body on use', kind: 'store' },
    { id: 'sc', x: 390, y: 235, w: 165, h: 54, label: 'Subdir CLAUDE.md', sub: 'when files there are read', kind: 'store' },
    { id: 'hk', x: 590, y: 35, w: 150, h: 60, label: 'Hooks', sub: 'format, block, gate: 0 tokens', kind: 'good' },
    { id: 'pm', x: 590, y: 120, w: 150, h: 60, label: 'Permissions', sub: 'allow / ask / deny', kind: 'good' },
    { id: 'vf', x: 590, y: 205, w: 150, h: 60, label: 'Verification', sub: 'tests, lint, Stop hook', kind: 'good' }
  ],
  edges: [{ from: 'dev', to: 's', both: true }, { from: 's', to: 'ex' }, { from: 'mcp', to: 's', dashed: true }, { from: 's', to: 'cm' }],
  caption: 'Anything in the IN CONTEXT column is guidance that competes for attention. Anything in the OUTSIDE CONTEXT column is enforcement that runs in code and costs no tokens. Choose the column first, then the file.' })}

<h4>Team repository layout</h4>
<pre class="code">repo/
├── CLAUDE.md                        # team standards, build/test commands, gotchas (&lt;200 lines)
├── CLAUDE.local.md                  # personal, per project, gitignored
├── .mcp.json                        # shared MCP servers; tokens via \${JIRA_TOKEN}
├── .claude/
│   ├── settings.json                # permissions + hooks, committed
│   ├── settings.local.json          # personal overrides, gitignored
│   ├── rules/
│   │   ├── testing.md               # paths: ["**/*.test.tsx"]
│   │   ├── api-conventions.md       # paths: ["src/api/**/*"]
│   │   └── terraform.md             # paths: ["terraform/**/*"]
│   ├── commands/
│   │   └── review.md                # /review for everyone who clones the repo
│   ├── skills/
│   │   └── codebase-analysis/SKILL.md   # context: fork, argument-hint
│   ├── agents/
│   │   └── security-reviewer.md     # project subagent
│   └── hooks/
│       └── protect-migrations.sh
├── packages/payments/CLAUDE.md      # @../../docs/standards/pci.md
└── docs/standards/*.md

~/.claude/CLAUDE.md                  # personal preferences only, NOT shared
~/.claude/skills/review-terse/       # personal variant, different name from the team skill</pre>

<h3>Design decisions you must be able to defend</h3>
${H.table(['Decision', 'Recommended choice', 'Why', 'Common wrong answer'], [
  ['Standards every teammate must get', 'Project <code>CLAUDE.md</code> (or <code>.claude/CLAUDE.md</code>), committed', 'Shared via version control, loaded every session', '<code>~/.claude/CLAUDE.md</code> (user only)'],
  ['Conventions for files spread across directories (tests)', '<code>.claude/rules/testing.md</code> with <code>paths: ["**/*.test.tsx"]</code>', 'Loads by glob regardless of directory; no tokens otherwise', 'Sections in root CLAUDE.md; a CLAUDE.md in every folder; a skill'],
  ['Package-specific standards', 'Package CLAUDE.md that <code>@import</code>s only the relevant standards files', 'Modular, maintained by domain owners', 'One giant root file'],
  ['Team-wide <code>/review</code>', '<code>.claude/commands/review.md</code> (or a project skill)', 'Available on clone or pull', '<code>~/.claude/commands/</code>; a commands array in <code>.claude/config.json</code> (does not exist)'],
  ['Skill with verbose output', '<code>context: fork</code>', 'Runs in an isolated subagent; only the result returns', 'Run it inline and /compact afterwards'],
  ['Skill needs a parameter', '<code>argument-hint</code> frontmatter', 'Prompts the developer for the missing argument', 'Hope the developer remembers'],
  ['Must never happen (edit migrations, read .env)', 'Permission <code>deny</code> or PreToolUse hook', 'Deterministic', '"NEVER edit migrations" in CLAUDE.md'],
  ['Must happen after every edit (format)', 'PostToolUse hook', 'Runs every time, zero context', 'CLAUDE.md reminder'],
  ['Monolith to microservices; library migration across 45+ files', 'Plan mode, then direct execution of the approved plan', 'Architectural decisions and multi-file impact; avoids costly rework', 'Start direct and switch "if it gets complex"'],
  ['Single-file bug with a clear stack trace; add a date check', 'Direct execution', 'Well-scoped, clear', 'Plan mode for everything'],
  ['Prose spec interpreted inconsistently', '2 to 3 concrete input/output examples', 'Examples disambiguate transformations', 'Longer prose, capital letters'],
  ['Unfamiliar domain (cache invalidation)', 'Interview pattern before implementing', 'Surfaces considerations you did not anticipate', 'Implement and see']
])}

<h3>Configuration sketch</h3>
<div class="two"><div>
<pre class="code"># .claude/rules/testing.md
---
paths: ["**/*.test.tsx", "**/*.test.ts"]
---
- Use the factories in test/fixtures, not inline objects.
- One behavior per test; name it "does X when Y".
- Mock the network with msw; never call real APIs.</pre>
<pre class="code"># .claude/skills/codebase-analysis/SKILL.md
---
name: codebase-analysis
description: Map entry points, modules and dependencies
  of one directory. Use before refactors or migrations.
argument-hint: [directory]
context: fork
agent: Explore
allowed-tools: Read, Grep, Glob
---
Analyze $ARGUMENTS. Return: entry points, public
exports, inbound callers, external dependencies,
risky areas. Max 40 lines. Cite file paths.</pre>
</div><div>
<pre class="code">// .claude/settings.json (committed)
{
  "permissions": {
    "allow": ["Bash(npm run test *)", "Bash(npm run lint)"],
    "deny":  ["Read(./.env)", "Edit(db/migrations/**)"]
  },
  "hooks": {
    "PostToolUse": [
      { "matcher": "Edit|Write",
        "hooks": [{ "type": "command",
                    "command": ".claude/hooks/format.sh" }] }
    ]
  }
}</pre>
<pre class="code">// .mcp.json (committed; secret stays in the env)
{
  "mcpServers": {
    "jira": {
      "command": "npx",
      "args": ["-y", "&lt;community-jira-server&gt;"],
      "env": { "JIRA_TOKEN": "\${JIRA_TOKEN}" }
    }
  }
}</pre>
</div></div>
${H.box('exam', 'Exam vs current docs:', 'Verifying loaded memory files: the exam answer is <code>/memory</code>; current docs also offer <code>/context</code> to show exactly what is loaded. Skill <code>allowed-tools</code>: the exam says it restricts tools during the skill; current docs say it pre-approves them and <code>disallowed-tools</code> removes tools. Commands in <code>.claude/commands/</code> still work; skills are the newer format and win on a name clash.')}

<h3>Plan vs direct: the decision in one table</h3>
${H.table(['Signal in the stem', 'Mode', 'Follow-up'], [
  ['"Dozens of files", "service boundaries", "multiple valid approaches", "different infrastructure requirements"', 'Plan mode', 'Approve plan, then implement directly; Explore subagent for verbose discovery'],
  ['"Clear stack trace", "one function", "add a validation check"', 'Direct execution', 'Verify with the failing test'],
  ['Open-ended ("add tests to legacy code")', 'Plan: map structure, find high-impact areas, prioritize', 'Adapt as dependencies appear (1.6)'],
  ['Exploration fills the context', 'Explore subagent or <code>context: fork</code> skill', '/compact with instructions, or /clear and restart with a summary']
])}

<h3>Failure signatures → root cause → fix</h3>
${H.table(['Symptom (as the exam phrases it)', 'Root cause', 'Fix'], [
  ['"A new team member does not get the team conventions"', 'Instructions live in a user-level <code>~/.claude/CLAUDE.md</code>', 'Move to project CLAUDE.md; confirm with <code>/memory</code> (3.1)'],
  ['"Behavior differs between sessions and developers"', 'Unclear which memory files load', '<code>/memory</code> (exam) or <code>/context</code> to inspect loaded files (3.1)'],
  ['"Test files in many folders do not follow the test conventions"', 'Conventions in root sections or directory-bound CLAUDE.md', 'Path-scoped rule with <code>**/*.test.tsx</code> (3.3)'],
  ['"Claude ignores rules in our 600-line CLAUDE.md"', 'Bloat dilutes attention', 'Trim below ~200 lines, move topics to <code>.claude/rules/</code>, workflows to skills (3.1)'],
  ['"/review works on one laptop only"', 'Command stored in <code>~/.claude/commands/</code>', 'Move to <code>.claude/commands/</code> in the repo (3.2)'],
  ['"The analysis skill floods the main conversation"', 'Skill runs inline', '<code>context: fork</code> (3.2)'],
  ['"Developers run the skill without the directory and get generic output"', 'No argument prompt', '<code>argument-hint</code> (3.2)'],
  ['"A developer tweaked the shared skill for personal taste and changed it for everyone"', 'Edited the project skill', 'Personal variant in <code>~/.claude/skills/</code> with a different name (3.2)'],
  ['"Claude edited a migration although CLAUDE.md says never to"', 'CLAUDE.md is guidance, not enforcement', 'Permission deny rule or PreToolUse hook (3.1, 1.5)'],
  ['"Midway through a 45-file migration Claude discovers a dependency and redoes work"', 'Direct execution on an architectural task', 'Plan mode first, then execute the plan (3.4)'],
  ['"After a long exploration answers cite typical patterns, not our classes"', 'Context degradation', 'Explore subagent, scratchpad notes, /compact; /clear between tasks (5.4)'],
  ['"Each fix breaks another requirement"', 'Interacting issues sent one at a time', 'Describe all interacting issues in one message; independent ones sequentially (3.5)']
])}

<h3>Metrics and evals in production</h3>
${H.table(['Metric', 'How to measure', 'Why it matters'], [
  ['First-pass acceptance', 'Share of tasks merged without human rework', 'Headline productivity signal'],
  ['Corrections per task', 'Count of follow-up correction prompts; two failed corrections → /clear and re-prompt', 'High counts point to missing CLAUDE.md content or unclear specs'],
  ['Rule adherence by area', 'Review sample of diffs per path (tests, API, Terraform)', 'Shows which rule file is not loading or not working'],
  ['CLAUDE.md token cost', '<code>/context</code> breakdown; line count', 'Bloat lowers adherence everywhere'],
  ['Hook and deny events', 'Blocked edits, formatter runs', 'Enforcement is working; frequent blocks mean guidance should improve'],
  ['Verification pass rate', 'Tests and lint green on first run', 'Claude needs a way to check its own work'],
  ['Cost per task', 'Session usage; subagent spend', 'Plan mode and subagents cost tokens; measure the trade']
])}
<p>Treat configuration like code: when you change CLAUDE.md or a rule, re-run a small suite of representative repo tasks graded by tests and build exit codes, and compare adherence before and after. Adopt mechanisms by trigger: a mistake made twice goes into CLAUDE.md, a prompt typed repeatedly becomes a skill, anything that must happen every time becomes a hook.</p>

<h3>Exam question patterns for this scenario</h3>
<ul>
<li><b>"Available to every developer when they clone"</b> → project scope (<code>.claude/commands/</code>, <code>.claude/skills/</code>, project CLAUDE.md, <code>.mcp.json</code>).</li>
<li><b>"Only for me" or "experimental"</b> → user scope (<code>~/.claude/...</code>, <code>~/.claude.json</code> for MCP).</li>
<li><b>"Automatically apply conventions by file type across the codebase"</b> → <code>.claude/rules/</code> with <code>paths</code> globs.</li>
<li><b>"Must always" or "must never"</b> → hooks or permissions, not CLAUDE.md.</li>
<li><b>"Verbose output pollutes the session"</b> → <code>context: fork</code> or Explore subagent.</li>
<li><b>"Architectural, many files, several approaches"</b> → plan mode; <b>"clear, single file"</b> → direct.</li>
<li><b>"Prose produces inconsistent results"</b> → 2 to 3 input/output examples; <b>"edge case keeps failing"</b> → a specific test case with expected output.</li>
<li><b>"Unfamiliar domain"</b> → interview pattern; <b>"write tests first, share failures"</b> → test-driven iteration.</li>
<li><b>Non-existent config</b> (<code>.claude/config.json</code> commands array) → always wrong.</li></ul>

${H.check([
  ['API handlers need async/await with a specific error envelope, React components need hooks, and tests anywhere need the fixture factories. How do you configure this?', 'Path-scoped rules: <code>api-conventions.md</code> with <code>paths: ["src/api/**/*"]</code>, <code>react.md</code> with a component glob, <code>testing.md</code> with <code>**/*.test.tsx</code>. Each loads only when matching files are touched, and the test rule applies regardless of directory. Root CLAUDE.md keeps only universal standards.'],
  ['You are asked to migrate from one ORM to another across roughly 50 files, with two viable approaches. What workflow do you use?', 'Plan mode: explore (delegating verbose discovery to the Explore subagent), compare the approaches, produce a plan and get it approved. Then switch to direct execution to implement the plan in steps, verifying with tests. Starting directly risks late discovery of dependencies and rework.'],
  ['A teammate says the new <code>/deploy-check</code> skill ran with no directory argument and produced a vague answer. Two fixes?', 'Add <code>argument-hint: [service-directory]</code> so the developer is prompted, and make the skill body reference <code>$ARGUMENTS</code> explicitly with the expected output. If its output is long, add <code>context: fork</code> so it does not fill the main session.'],
  ['Claude keeps writing <code>console.log</code> debugging into committed code although CLAUDE.md says not to. What is the proportionate fix, and what would guarantee it?', 'First check that the instruction is loaded (<code>/memory</code>) and specific, and that CLAUDE.md is short enough to be followed. If it must never reach a commit, enforce it deterministically: a hook (for example on Edit/Write or a Stop-time lint gate) that fails on the pattern. Guidance shapes behavior; hooks guarantee it.'],
  ['Your prose description of a date-format conversion gets implemented three different ways. What do you give Claude?', 'Two or three concrete input/output pairs, including an edge case (for example null or a two-digit year), ideally as test cases. Examples communicate transformations more reliably than more prose, and a failing test gives targeted feedback for the next iteration.']
])}
${H.src([['Claude Code memory (CLAUDE.md, rules)', 'https://code.claude.com/docs/en/memory'], ['Skills', 'https://code.claude.com/docs/en/skills'], ['Settings', 'https://code.claude.com/docs/en/settings'], ['Hooks', 'https://code.claude.com/docs/en/hooks'], ['Permissions', 'https://code.claude.com/docs/en/permissions'], ['Features overview', 'https://code.claude.com/docs/en/features-overview'], ['Best practices', 'https://code.claude.com/docs/en/best-practices'], ['MCP in Claude Code', 'https://code.claude.com/docs/en/mcp']])}`;
    }
  });

  /* ------------------------------------------------------------------ 6.3 */
  CCAR.lessons.push({
    id: 'hb-63-research-system', track: 'handbook', part: 'P6', num: '6.3', order: 603, domain: 'ALL',
    objs: ['O10', 'O06', 'O03', 'O04', 'O18', 'O19', 'X06', 'O33'], ts: ['1.2', '1.3', '2.3', '5.3', '5.6'], minutes: 35,
    title: 'Playbook: multi-agent research system (S3)',
    summary: 'A reference design for the coordinator plus web search, document analysis, synthesis and report agents: AgentDefinitions and wiring, tool distribution, structured context passing, parallel spawning, the refinement loop, error propagation, provenance and crash-safe state.',
    body: function () {
      return `
${H.box('real', 'Scenario 3 (exam guide, verbatim):', '<i>You are building a multi-agent research system using the Claude Agent SDK. A coordinator agent delegates to specialized subagents: one searches the web, one analyzes documents, one synthesizes findings, and one generates reports. The system researches topics and produces comprehensive, cited reports.</i>')}
<p><b>Domains tested:</b> Agentic Architecture &amp; Orchestration (hub-and-spoke, decomposition, spawning, context passing: 1.2, 1.3), Tool Design &amp; MCP Integration (tool distribution, scoped cross-role tools: 2.3), Context Management &amp; Reliability (error propagation, provenance, state: 5.3, 5.6, 5.4). Two words in the scenario carry the exam: <b>comprehensive</b> (coverage: decomposition, partitioning, refinement loops, coverage gaps) and <b>cited</b> (provenance: claim-source mappings that survive every hop).</p>

<h3>Reference architecture</h3>
${D({ w: 760, h: 330, title: 'Coordinator-worker research system',
  nodes: [
    { id: 'u', x: 10, y: 140, w: 100, h: 50, label: 'User query', kind: 'human' },
    { id: 'pl', x: 135, y: 15, w: 190, h: 56, label: 'Research plan', sub: 'coverage checklist, saved', kind: 'store' },
    { id: 'c', x: 135, y: 115, w: 190, h: 96, label: 'Coordinator', sub: 'decompose · delegate · evaluate', kind: 'agent' },
    { id: 'st', x: 135, y: 255, w: 190, h: 60, label: 'Artifacts + manifest', sub: 'findings JSON, per-agent state', kind: 'store' },
    { id: 'w', x: 385, y: 15, w: 190, h: 60, label: 'Web search agent', sub: 'WebSearch, WebFetch', kind: 'sub' },
    { id: 'd', x: 385, y: 95, w: 190, h: 60, label: 'Document analysis agent', sub: 'load_document, Read', kind: 'sub' },
    { id: 's', x: 385, y: 175, w: 190, h: 60, label: 'Synthesis agent', sub: 'Read + scoped verify_fact', kind: 'sub' },
    { id: 'r', x: 385, y: 255, w: 190, h: 60, label: 'Report agent', sub: 'Read, Write: cited report', kind: 'sub' },
    { id: 'web', x: 620, y: 15, w: 130, h: 60, label: 'Web', sub: 'search + fetch', kind: 'tool' },
    { id: 'pap', x: 620, y: 95, w: 130, h: 60, label: 'papers MCP', sub: 'validated URLs', kind: 'tool' },
    { id: 'vf', x: 620, y: 175, w: 130, h: 60, label: 'verify_fact', sub: 'dates, names, stats', kind: 'tool' }
  ],
  edges: [{ from: 'u', to: 'c', both: true }, { from: 'c', to: 'pl', both: true }, { from: 'c', to: 'w', label: 'Task' }, { from: 'c', to: 'd' }, { from: 'c', to: 's' }, { from: 'c', to: 'r' }, { from: 'w', to: 'web' }, { from: 'd', to: 'pap' }, { from: 's', to: 'vf' }, { from: 'c', to: 'st', both: true, dashed: true }],
  caption: 'Hub-and-spoke: every subagent result returns to the coordinator, which routes it onward, handles errors and decides the next step. Subagents never talk to each other. Findings travel as structured artifacts with source metadata; the manifest makes the run resumable.' })}
${H.table(['Agent', 'Owns', 'Tools (least privilege)', 'Returns'], [
  ['Coordinator', 'Plan, decomposition, partitioning, routing, error recovery, gap evaluation, stop decision', '<code>Agent</code> (exam: Task), Read, Write (plan, manifest)', 'Final report to the user'],
  ['Web search', 'One assigned subtopic or source type', 'WebSearch, WebFetch', 'Findings: claim, excerpt, URL, publisher, publication date, relevance'],
  ['Document analysis', 'Assigned papers / reports', '<code>load_document</code> (validates document URLs), Read', 'Findings with document name, page, method notes, conflicts flagged'],
  ['Synthesis', 'Merge findings; established vs contested; coverage gaps', 'Read, <code>verify_fact</code> (simple lookups only)', 'Structured synthesis with claim-source map and coverage annotations'],
  ['Report', 'Render: tables for financial data, prose for news, lists for technical findings', 'Read, Write', 'Cited report file']
])}

<h3>Design decisions you must be able to defend</h3>
${H.table(['Decision', 'Recommended choice', 'Why', 'Common wrong answer'], [
  ['Communication topology', 'Hub-and-spoke through the coordinator', 'Observability, consistent error handling, controlled information flow', 'Subagents calling each other directly'],
  ['How many subagents', 'Coordinator scales to query complexity (simple fact: one agent; comparison: a few; broad topic: many)', 'Multi-agent costs about 15x chat tokens', 'Always run the full pipeline'],
  ['Decomposition', 'Enumerate the topic dimensions first (creative industries: visual arts, music, writing, film, ...) and check coverage against them', 'Narrow decomposition is the most common coverage failure', 'Blame the search or synthesis agent'],
  ['Partitioning', 'Distinct subtopics or source types per subagent', 'Minimizes duplicated searches', 'Same broad brief to three agents'],
  ['Spawning', 'Several Task calls in <b>one</b> coordinator response', 'They run in parallel', 'One Task call per turn'],
  ['Delegation style', 'Goal, scope boundaries, output format, quality criteria, source guidance', 'Subagents adapt; coordinator keeps control through the contract', 'Step-by-step procedural scripts, or a vague "research X"'],
  ['Context passing', 'Complete prior findings in the Task prompt, as structured data with metadata', 'Subagents inherit nothing from the coordinator', 'Assume the synthesis agent can see earlier results'],
  ['Tool distribution', '4 to 5 role tools; <code>load_document</code> instead of generic <code>fetch_url</code>', 'Many tools (18) degrade selection; off-role tools get misused', 'Give every agent every tool'],
  ['Synthesis needs facts checked', 'Scoped <code>verify_fact</code> for the 85% simple checks; complex ones via coordinator', 'Cuts round trips, keeps least privilege', 'Full web tools for synthesis; batching all checks to the end'],
  ['Subagent failure', 'Local retry for transient errors; propagate structured context (type, query, partial results, alternatives)', 'Coordinator can choose retry, reroute or proceed with gaps', 'Generic "search unavailable"; empty success; abort the run'],
  ['Conflicting statistics', 'Keep both with attribution and dates; coordinator decides reconciliation', 'Credible sources disagree for reasons (method, year)', 'Pick one, or average'],
  ['Crash recovery', 'Each agent writes state to a known location; coordinator loads the manifest and injects it on resume', 'No repeated work, no lost findings', 'Restart from scratch; rely on the conversation']
])}

<h3>Configuration sketch</h3>
<pre class="code">// TypeScript, Agent SDK
for await (const msg of query({
  prompt: "Research the impact of AI on creative industries (2023-2026). Produce a cited report.",
  options: {
    systemPrompt: COORDINATOR_PROMPT,     // goals, coverage checklist, quality bar, stop criteria
    allowedTools: ["Agent", "Read", "Write"],          // exam wording: allowedTools must include "Task"
    mcpServers: {
      papers:    { command: "node", args: ["servers/papers.js"] },     // load_document
      factcheck: { command: "node", args: ["servers/factcheck.js"] }   // verify_fact
    },
    maxBudgetUsd: 8.0,                                 // includes subagent spend
    agents: {                                          // every subagent must be registered here
      "web-researcher": {
        description: "Searches the public web for news, industry reports and statistics on ONE assigned " +
                     "subtopic. Use for recent or non-academic sources. Not for PDFs of papers.",
        prompt: WEB_PROMPT,                            // output schema below, date required
        tools: ["WebSearch", "WebFetch"],
        model: "sonnet", maxTurns: 20
      },
      "document-analyst": {
        description: "Analyzes academic papers and long reports given as URLs or files. Extracts claims " +
                     "with page numbers and methodology. Flags conflicting values instead of choosing.",
        prompt: DOC_PROMPT,
        tools: ["Read", "mcp__papers__load_document"],
        mcpServers: ["papers"],
        model: "sonnet"
      },
      "synthesizer": {
        description: "Merges structured findings into established vs contested conclusions with a " +
                     "claim-source map and coverage gaps. Only verifies simple facts itself.",
        prompt: SYNTH_PROMPT,
        tools: ["Read", "mcp__factcheck__verify_fact"],
        mcpServers: ["factcheck"],
        model: "opus"
      },
      "report-writer": {
        description: "Renders the final cited report from the synthesis file.",
        prompt: REPORT_PROMPT,
        tools: ["Read", "Write"],
        model: "sonnet", effort: "low"
      }
    }
  }
})) { if (msg.type === "result") handleResult(msg); }</pre>
<div class="two"><div>
<h4>Subagent output contract (per finding)</h4>
<pre class="code">{
  "claim": "Share of musicians using AI tools rose to 35%",
  "value": 0.35,
  "excerpt": "...35% of surveyed musicians reported...",
  "source_url": "https://example.org/report-2025",
  "source_name": "Example Music Survey",
  "page": 12,
  "published": "2025-03-10",
  "data_collected": "2024-Q4",
  "method": "online survey, n=2,100",
  "relevance": 0.9,
  "conflicts_with": ["F-017"]
}</pre>
</div><div>
<h4>Structured error context and manifest</h4>
<pre class="code">// subagent result when it cannot recover locally
{ "status": "partial",
  "failure_type": "timeout",
  "attempted": ["AI film VFX adoption 2025"],
  "retries": 2,
  "partial_results": ["F-031", "F-032"],
  "alternatives": ["trade press sources", "narrower query"] }

// artifacts/manifest.json
{ "run_id": "r-118", "plan": "artifacts/plan.json",
  "agents": {
    "web-researcher:music": { "state": "done", "out": "artifacts/music.json" },
    "web-researcher:film":  { "state": "partial", "out": "artifacts/film.json" } } }</pre>
</div></div>
${H.box('exam', 'Exam vs current docs:', 'The exam calls the spawning mechanism the <b>Task</b> tool and requires "Task" in the coordinator\'s <code>allowedTools</code>. Current SDK docs name it the <b>Agent</b> tool (renamed from Task). Same concept: no spawning tool, no delegation. Messages from inside a subagent carry <code>parent_tool_use_id</code>, which is how you attribute traces to a subagent.')}

<h3>The refinement loop</h3>
<ol class="steps">
<li>Coordinator writes the plan and a coverage checklist (dimensions, required source types, date range).</li>
<li>Spawns search and document subagents in parallel with disjoint scopes.</li>
<li>Passes all structured findings to synthesis in the Task prompt, key findings first, clear section headers (mitigates lost-in-the-middle).</li>
<li>Evaluates the synthesis against the checklist: gaps, thin support, unresolved conflicts.</li>
<li>Re-delegates targeted queries for the gaps only, then re-invokes synthesis; stops when coverage criteria are met or the budget is reached, and annotates any remaining gaps.</li></ol>

<h3>Failure signatures → root cause → fix</h3>
${H.table(['Symptom (as the exam phrases it)', 'Root cause', 'Fix'], [
  ['"All subagents succeed but the report covers only visual arts; coordinator logs show digital art, graphic design, photography"', 'Coordinator decomposition too narrow', 'Coordinator enumerates dimensions and checks coverage (1.2)'],
  ['"Two web agents return the same articles"', 'Overlapping assignments', 'Partition by subtopic or source type (1.2)'],
  ['"The coordinator never delegates"', '<code>allowedTools</code> lacks Task (Agent), or agents not registered in <code>agents</code>', 'Wire the spawning tool and register definitions (1.3)'],
  ['"The document agent is never chosen"', 'Vague or overlapping <code>description</code>', 'Specific description of when to use it; name it in the prompt (1.3)'],
  ['"Document agent cannot call load_document"', 'Tool missing from its <code>tools</code> or server not available to it', 'Add the MCP tool and server to the AgentDefinition (1.3)'],
  ['"Synthesis says it has no findings" or asks for earlier results', 'Subagents do not inherit context', 'Put complete findings in the Task prompt (1.3)'],
  ['"Research takes four times longer than expected; one Task call per turn"', 'Sequential spawning', 'Emit multiple Task calls in one response (1.3)'],
  ['"Final report has claims without sources"', 'Findings compressed to prose; claim-source map lost', 'Structured findings with URL, excerpt, page, date; synthesis must preserve and merge them (5.6)'],
  ['"Synthesis agent starts running web searches"', 'Off-role tools available', 'Restrict tools; scoped <code>verify_fact</code> for simple checks (2.3)'],
  ['"Report states there is no data on film" after a search timeout', 'Failure returned as empty success', 'Structured error context and coverage annotations (5.3)'],
  ['"Report picks 35% and drops the 22% figure from another survey"', 'Conflict collapsed', 'Keep both with attribution, dates and method; contested section (5.6)'],
  ['"After a crash the rerun repeats every search"', 'No state persistence', 'Per-agent state exports plus manifest loaded on resume (5.4)']
])}

<h3>Metrics and evals in production</h3>
${H.table(['Metric', 'How to measure', 'Why it matters'], [
  ['Coverage', 'Share of checklist dimensions with supported findings; human-built reference outlines per eval topic', '"Comprehensive" is the product promise'],
  ['Citation accuracy', 'Sample claims; check the cited excerpt supports the claim (model grader calibrated on human labels)', '"Cited" is the other promise'],
  ['Conflict preservation', 'Seed eval topics with known conflicting sources; check both appear with attribution', 'Detects silent collapsing'],
  ['Error transparency', 'Inject tool failures; check coverage annotations appear', 'Detects suppressed failures'],
  ['Cost, latency, tokens by agent', '<code>total_cost_usd</code>, per-agent usage, wall-clock', 'Multi-agent is expensive; tier models by role'],
  ['Refinement iterations', 'Loops per run and gap closure per loop', 'Detects runaway loops or a weak first plan']
])}
<p>Grade the end state (the report and its citations), not the exact path; different runs can reasonably take different search routes. Start with 20 to 50 topics drawn from real requests and failures, read transcripts, and keep a regression set once scores saturate.</p>

<h3>Exam question patterns for this scenario</h3>
<ul>
<li><b>Logs show the coordinator\'s subtasks</b> → the answer is about what the coordinator assigned, not the subagents that executed correctly.</li>
<li><b>Latency with sequential Task calls</b> → multiple Task calls in one response.</li>
<li><b>Missing context in a subagent</b> → include complete, structured findings in its prompt.</li>
<li><b>Misconfigured spawning</b> → "Task" in allowedTools, registered AgentDefinition, right <code>tools</code>, clear <code>description</code>.</li>
<li><b>Frequent simple checks cause round trips</b> → scoped cross-role tool (<code>verify_fact</code>), complex cases through the coordinator.</li>
<li><b>Generic tool misused</b> → constrained replacement (<code>fetch_url</code> → <code>load_document</code>).</li>
<li><b>Timeout handling</b> → structured error context with partial results and alternatives; never empty success, never abort all.</li>
<li><b>Conflicting credible sources</b> → annotate with attribution; separate established from contested.</li>
<li><b>Apparent contradiction across years</b> → require publication and collection dates.</li>
<li><b>Resume after interruption</b> → manifest of per-agent state, injected into prompts on resume.</li></ul>

${H.check([
  ['The synthesis agent\'s output is coherent but cites nothing, although the web agent returned URLs. Where did attribution get lost, and how do you fix it?', 'Between agents: the coordinator passed a prose summary to synthesis, dropping the claim-source mapping. Pass findings as structured records (claim, excerpt, URL, document, page, date) in the Task prompt, and require synthesis to carry source IDs through to every conclusion.'],
  ['Traces show the coordinator emits one Task call, waits for the result, then emits the next, for four independent subtopics. Fix?', 'Instruct the coordinator to spawn independent subtasks together: several Task (Agent) calls in a single response run in parallel. Keep sequential calls only where one result determines the next task.'],
  ['One survey says 35% of musicians use AI tools (2025), another says 22% (2023). What should the report contain?', 'Both values, each with source, collection date and method, in a contested or context section. Explain that the difference may be temporal or methodological rather than choosing one. Dates in the finding schema prevent misreading change over time as contradiction.'],
  ['A web search subagent times out after two retries. What does it return to the coordinator, and what does the final report show?', 'A structured error context: failure type, attempted queries, retries done, partial results and alternative approaches. The coordinator can reroute (other source types, narrower query) or proceed; if the gap remains, the synthesis and report carry a coverage annotation stating which area is thinly supported and why.'],
  ['The team wants to give the synthesis agent WebSearch "to save round trips". Evaluate.', 'Over-provisioning: the synthesis agent would drift into research and tool selection would degrade. If 85% of its verification needs are simple facts, give it a scoped <code>verify_fact</code> tool and keep complex investigation routed through the coordinator to the web agent.']
])}
${H.src([['Agent SDK subagents', 'https://code.claude.com/docs/en/agent-sdk/subagents'], ['Agent SDK overview', 'https://code.claude.com/docs/en/agent-sdk/overview'], ['How we built our multi-agent research system', 'https://www.anthropic.com/engineering/multi-agent-research-system'], ['Building effective agents', 'https://www.anthropic.com/engineering/building-effective-agents'], ['Effective context engineering', 'https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents'], ['Demystifying evals for AI agents', 'https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents']])}`;
    }
  });

  /* ------------------------------------------------------------------ 6.4 */
  CCAR.lessons.push({
    id: 'hb-64-dev-productivity', track: 'handbook', part: 'P6', num: '6.4', order: 604, domain: 'ALL',
    objs: ['O17', 'O32', 'O34', 'O35', 'O20', 'O07'], ts: ['2.4', '2.5', '5.4', '1.6'], minutes: 30,
    title: 'Playbook: developer productivity agent (S4)',
    summary: 'A reference design for an Agent SDK tool that explores unfamiliar and legacy codebases, generates boilerplate and automates repetitive work: built-in tool selection, incremental exploration, subagents and scratchpads, MCP servers, resources vs tools, and adaptive decomposition.',
    body: function () {
      return `
${H.box('real', 'Scenario 4 (exam guide, verbatim):', '<i>You are building developer productivity tools using the Claude Agent SDK. The agent helps engineers explore unfamiliar codebases, understand legacy systems, generate boilerplate code, and automate repetitive tasks. It uses the built-in tools (Read, Write, Bash, Grep, Glob) and integrates with Model Context Protocol (MCP) servers.</i>')}
<p><b>Domains tested:</b> Tool Design &amp; MCP Integration (built-in tool selection, MCP scopes, resources, descriptions: 2.4, 2.5), Claude Code Configuration &amp; Workflows (the same harness and files), Agentic Architecture &amp; Orchestration (decomposition, subagents: 1.6, 1.3), and in practice Context Management (5.4). The exam angle: <b>pick the right tool for the operation</b> and <b>keep the context window healthy</b> while understanding grows step by step.</p>

<h3>Reference architecture</h3>
${D({ w: 760, h: 320, title: 'Developer productivity agent',
  groups: [{ x: 395, y: 10, w: 165, h: 300, label: 'BUILT-IN TOOLS', kind: 'soft' }, { x: 575, y: 10, w: 175, h: 300, label: 'MCP SERVERS', kind: 'hard' }],
  nodes: [
    { id: 'e', x: 15, y: 40, w: 130, h: 50, label: 'Engineer', sub: 'question or task', kind: 'human' },
    { id: 'a', x: 170, y: 30, w: 205, h: 80, label: 'Productivity agent', sub: 'Agent SDK, keeps the big picture', kind: 'agent' },
    { id: 'n', x: 170, y: 145, w: 205, h: 56, label: 'Scratchpad NOTES.md', sub: 'findings, paths, open questions', kind: 'store' },
    { id: 'x', x: 170, y: 240, w: 205, h: 60, label: 'Explorer subagents', sub: 'one question each, summary back', kind: 'sub' },
    { id: 'g', x: 405, y: 30, w: 145, h: 54, label: 'Grep', sub: 'content: callers, errors', kind: 'tool' },
    { id: 'gl', x: 405, y: 96, w: 145, h: 54, label: 'Glob', sub: 'paths: **/*.test.tsx', kind: 'tool' },
    { id: 'rw', x: 405, y: 162, w: 145, h: 54, label: 'Read · Edit · Write', sub: 'Edit needs a unique anchor', kind: 'tool' },
    { id: 'b', x: 405, y: 236, w: 145, h: 54, label: 'Bash', sub: 'build, test, git', kind: 'tool' },
    { id: 'rs', x: 585, y: 30, w: 155, h: 60, label: 'Resources', sub: 'schemas, doc tree, issues', kind: 'store' },
    { id: 'tl', x: 585, y: 120, w: 155, h: 60, label: 'Tools', sub: 'jira_search, db_query', kind: 'tool' },
    { id: 'cf', x: 585, y: 215, w: 155, h: 60, label: '.mcp.json / ~/.claude.json', sub: 'project vs user scope', kind: 'note' }
  ],
  edges: [{ from: 'e', to: 'a', both: true }, { from: 'a', to: 'n', both: true }, { from: 'a', to: 'x', label: 'Task' }, { from: 'a', to: 'g' }, { from: 'x', to: 'rw', dashed: true }],
  caption: 'The main agent coordinates and records conclusions in a scratchpad; subagents absorb verbose discovery and return summaries. Built-in tools do local work; MCP resources show what data exists without exploratory calls, and MCP tools act on external systems.' })}

<h3>Built-in tool selection</h3>
${H.table(['Operation', 'Tool', 'Example', 'Not this'], [
  ['Search file <b>contents</b>', 'Grep', 'All callers of <code>calculateRefund</code>; where "ERR_LEDGER_LOCK" is raised; import statements', 'Glob (matches paths only)'],
  ['Find files by <b>name/path</b>', 'Glob', '<code>**/*.test.tsx</code>, <code>src/**/migrations/*.sql</code>', 'Grep, or <code>Bash(find)</code>'],
  ['Load a whole file', 'Read', 'Follow an import to its definition', 'Reading every file up front'],
  ['Targeted change', 'Edit', 'Replace one unique block', 'Write for a one-line change'],
  ['Edit fails: anchor text not unique', 'Read + Write', 'Load the full file, write the corrected version', 'Retrying the same Edit'],
  ['Create a new file', 'Write', 'Generated boilerplate', ''],
  ['Run something', 'Bash', 'Build, tests, linters, git', 'Bash for searching when Grep/Glob exist']
])}
<p><b>Incremental exploration:</b> Grep for entry points (route names, main functions, error messages), Read those files, follow imports with further Reads, and write conclusions to the scratchpad. <b>Wrapper modules:</b> when a function is re-exported under other names, first list every exported name from the wrapper, then Grep for each name across the codebase; searching only for the original name misses callers.</p>

<h3>Design decisions you must be able to defend</h3>
${H.table(['Decision', 'Recommended choice', 'Why', 'Common wrong answer'], [
  ['Understand an unfamiliar service', 'Grep entry points → Read along imports → notes', 'Builds understanding within context limits', 'Read all files first'],
  ['Several independent questions ("find all test files", "trace refund flow dependencies")', 'One explorer subagent per question, summaries back', 'Verbose output stays out of the main context', 'Do it all in the main session'],
  ['Multi-hour exploration', 'Scratchpad file of key findings, referenced for later questions; /compact when full', 'Counters context degradation', 'Rely on the model remembering early findings'],
  ['Multi-phase work', 'Summarize phase 1 findings and inject them into phase 2 subagent prompts', 'Subagents start with nothing', 'Let phase 2 rediscover'],
  ['Crash or interruption', 'Agents export state to a known location; coordinator loads the manifest on resume', 'Resume without repeating work', 'Start over'],
  ['Team-wide Jira/GitHub access', 'Existing community MCP server in project <code>.mcp.json</code>, token via <code>\${JIRA_TOKEN}</code>', 'Shared, no secrets in git, no custom maintenance', 'Custom server for a standard integration; hard-coded token'],
  ['Personal or experimental server', 'User scope (<code>~/.claude.json</code>)', 'Does not affect teammates', 'Commit it to <code>.mcp.json</code>'],
  ['Agent ignores a capable MCP tool and uses Grep', 'Rewrite the MCP tool description: capabilities, outputs, when to prefer it', 'Descriptions drive selection', 'Remove Grep'],
  ['Agent makes many exploratory list calls', 'Expose the catalog (schemas, doc hierarchy, issue summaries) as MCP resources', 'Visibility without tool calls', 'More list tools'],
  ['"Add comprehensive tests to a legacy codebase"', 'Map structure, identify high-impact areas, prioritized plan that adapts as dependencies appear', 'Open-ended task needs dynamic decomposition', 'Fixed file-by-file pipeline from A to Z'],
  ['Boilerplate generation', 'Skill with an exemplar from the repo plus <code>argument-hint</code>; verify with build and tests; formatter hook', 'Matches house style, verified', 'Generic template from memory'],
  ['Same change across hundreds of files', 'Scripted loop of <code>claude -p</code> per file (or batch fan-out) with a fixed prompt and verification', 'Isolated context per item, repeatable', 'One giant interactive session']
])}

<h3>Configuration sketch</h3>
<pre class="code">// TypeScript, Agent SDK
const options = {
  settingSources: ["project"],                     // load the repo's CLAUDE.md and settings
  allowedTools: ["Read", "Grep", "Glob", "Agent",
                 "Bash(npm run test *)", "Bash(npm run build)", "mcp__jira__*"],
  disallowedTools: ["WebFetch"],
  permissionMode: "acceptEdits",                   // edits auto-approved; other risky calls still gated
  mcpServers: {
    jira: { command: "npx", args: ["-y", "&lt;community-jira-server&gt;"], env: { JIRA_TOKEN: process.env.JIRA_TOKEN } },
    dbdocs: { command: "node", args: ["servers/dbdocs.js"] }   // exposes schema resources + db_query tool
  },
  agents: {
    explorer: {
      description: "Answers ONE focused codebase question (find files, trace a call path, list usages). " +
                   "Returns a summary of at most 30 lines with file paths and line numbers.",
      prompt: "Use Glob for file names, Grep for contents, Read to follow imports. Do not edit files.",
      tools: ["Read", "Grep", "Glob"],
      model: "haiku", effort: "low"
    }
  },
  maxBudgetUsd: 3.0
};</pre>
<div class="two"><div>
<h4>Scratchpad (NOTES.md)</h4>
<pre class="code"># Refund flow (legacy billing)
- Entry: src/api/refunds.ts:postRefund (L41)
- Calls LedgerService.reverse (src/ledger/svc.ts:118)
- Re-exported as reverseTxn from src/compat/index.ts
  -&gt; 7 callers, list in notes/callers.md
- Gotcha: amounts stored in cents in ledger_v1
Open: who consumes refund.completed event?</pre>
</div><div>
<h4>MCP resources vs tools</h4>
<pre class="code">// resources/list (catalog, no exploratory tool calls)
schema://billing/tables
schema://billing/tables/{table}     // resource template
docs://architecture/index
jira://project/BILL/open-summaries

// tools (actions, model-controlled)
db_query(sql, max_rows)
jira_search(jql)</pre>
</div></div>
${H.box('exam', 'Exam vs current docs:', 'The exam guide names user-scoped MCP servers as living in <code>~/.claude.json</code>, and current docs agree; note that current docs also have a <b>local</b> scope (the default for <code>claude mcp add</code>, stored in <code>~/.claude.json</code> for one project). Subagents are spawned with the Task tool in exam wording, the Agent tool in current docs.')}

<h3>Failure signatures → root cause → fix</h3>
${H.table(['Symptom (as the exam phrases it)', 'Root cause', 'Fix'], [
  ['"The agent reads dozens of files before answering and runs out of context"', 'Reading everything up front', 'Grep for entry points, Read incrementally along imports (2.5)'],
  ['"The agent uses content search to find all test files"', 'Wrong tool for path matching', 'Glob with <code>**/*.test.tsx</code> (2.5)'],
  ['"Edit keeps failing because the text appears several times"', 'Non-unique anchor', 'Read the file, then Write the full corrected content (2.5)'],
  ['"The impact analysis missed callers that import the function through a compat module"', 'Searched only the original name', 'List the wrapper\'s exported names, Grep each (2.5)'],
  ['"After a long session answers mention typical patterns instead of our classes"', 'Context degradation', 'Scratchpad of findings, explorer subagents, /compact (5.4)'],
  ['"Discovery output fills the main conversation"', 'Verbose exploration inline', 'Delegate specific questions to subagents (5.4)'],
  ['"Phase 2 subagents repeat phase 1 discovery"', 'Findings not passed on', 'Summarize phase 1 and inject into phase 2 prompts (5.4)'],
  ['"After a crash the tool re-analyzes the whole repository"', 'No state export', 'Per-agent state files plus manifest loaded on resume (5.4)'],
  ['"The agent uses Grep instead of the code-intelligence MCP tool"', 'MCP tool description too thin', 'Describe capabilities and outputs in detail (2.4)'],
  ['"The agent calls list_tables and describe_table dozens of times"', 'Catalog only reachable through tools', 'Expose schemas as MCP resources (2.4)'],
  ['"New teammates do not see the Jira tools" or "a token was committed"', 'Server in local/user scope, or literal secret', 'Project <code>.mcp.json</code> with <code>\${JIRA_TOKEN}</code> expansion (2.4)'],
  ['"The test-generation agent covers trivial getters and skips payment logic"', 'No structure map or prioritization', 'Map, rank by impact, plan that adapts (1.6)']
])}

<h3>Metrics and evals in production</h3>
${H.table(['Metric', 'How to measure', 'Why it matters'], [
  ['Answer accuracy on codebase questions', 'Eval set of questions with expert reference answers (callers, data flow, owners)', 'Wrong answers about legacy code are expensive'],
  ['Tool calls and tokens per question', 'Trace per run', 'Shows over-reading and poor tool choice'],
  ['Tool error rate', 'Edit failures, MCP errors, Bash non-zero exits', 'Edit failure spikes point to anchor problems'],
  ['Boilerplate pass rate', 'Generated code builds, lints and passes tests first time', 'Verification is the real acceptance test'],
  ['Time saved', 'Before/after for onboarding tasks and repetitive changes', 'Adoption decisions'],
  ['Context health', 'Compactions per session; subagent share of tokens', 'Healthy sessions push verbose work into subagents']
])}
<p>Eval tasks should be run in clean checkouts with graded outcomes (tests pass, correct file list, correct callers), with a balance of questions where the right answer is "not found" to catch fabricated call paths.</p>

<h3>Exam question patterns for this scenario</h3>
<ul>
<li><b>"Find all files named/ending with"</b> → Glob. <b>"Find all usages/callers/error text"</b> → Grep.</li>
<li><b>Edit fails on non-unique text</b> → Read + Write.</li>
<li><b>Build understanding of unfamiliar code</b> → Grep entry points, then Read to follow imports; never read everything first.</li>
<li><b>Re-exported functions</b> → enumerate exported names, search each.</li>
<li><b>Long exploration degrades</b> → scratchpad, subagents, /compact; inject phase summaries.</li>
<li><b>Shared vs personal MCP</b> → <code>.mcp.json</code> with env-var expansion vs <code>~/.claude.json</code>.</li>
<li><b>Standard integration</b> → community server; custom only for team-specific workflows.</li>
<li><b>Agent prefers built-ins over MCP tool</b> → better MCP description.</li>
<li><b>Too many exploratory calls</b> → resources for catalogs.</li>
<li><b>Open-ended legacy task</b> → dynamic, adaptive decomposition.</li></ul>

${H.check([
  ['An engineer asks "what breaks if we change the signature of <code>formatCurrency</code>?" The function is exported from <code>utils/money.ts</code> and re-exported by <code>lib/index.ts</code> as <code>fmt</code> and <code>money</code>. How should the agent search?', 'Grep for the definition and read the wrapper to enumerate every exported alias (<code>formatCurrency</code>, <code>fmt</code>, <code>money</code>), then Grep each name across the repo, Read the call sites that matter, and record the caller list in the scratchpad. Searching only for the original name misses aliased callers.'],
  ['The agent spends 40 tool calls listing and describing database tables before writing a query. What MCP change helps most?', 'Expose the schema catalog as MCP resources (a table list and a per-table resource template). The agent sees what exists without exploratory tool calls and uses the <code>db_query</code> tool only to act.'],
  ['A four-hour legacy exploration session starts giving vague, generic answers. What do you change for the next session?', 'Keep a scratchpad of key findings and consult it for later questions; delegate specific questions to explorer subagents that return short summaries; use /compact with instructions when the context fills, or start fresh with the scratchpad summary injected.'],
  ['Your team wants Jira access for the agent. One developer proposes writing a custom Jira MCP server; another adds an existing community server to their local config. What do you recommend?', 'Use the existing community Jira server (standard integration, no maintenance) and configure it in the project <code>.mcp.json</code> with <code>\${JIRA_TOKEN}</code> so every teammate gets it without committing secrets. Reserve custom servers for team-specific workflows.'],
  ['Task: "add comprehensive tests to this legacy module". The agent starts writing tests alphabetically by file. What decomposition should it use?', 'Adaptive: first map the structure (Glob, Grep, explorer subagents), identify high-impact areas (payment paths, frequently changed code, untested branches), write a prioritized plan, and revise it as dependencies are discovered. A fixed alphabetical pipeline spends effort on low-value code.']
])}
${H.src([['Agent SDK overview', 'https://code.claude.com/docs/en/agent-sdk/overview'], ['Agent SDK MCP', 'https://code.claude.com/docs/en/agent-sdk/mcp'], ['Agent SDK subagents', 'https://code.claude.com/docs/en/agent-sdk/subagents'], ['MCP in Claude Code', 'https://code.claude.com/docs/en/mcp'], ['MCP specification', 'https://modelcontextprotocol.io/specification/latest'], ['Effective context engineering', 'https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents'], ['Best practices', 'https://code.claude.com/docs/en/best-practices']])}`;
    }
  });

  /* ------------------------------------------------------------------ 6.5 */
  CCAR.lessons.push({
    id: 'hb-65-ci-cd', track: 'handbook', part: 'P6', num: '6.5', order: 605, domain: 'ALL',
    objs: ['O11', 'O13', 'O15', 'O24', 'O30', 'O31', 'O23', 'X11'], ts: ['3.6', '4.1', '4.5', '4.6'], minutes: 30,
    title: 'Playbook: Claude Code in CI/CD (S5)',
    summary: 'A reference pipeline for automated PR review and test generation: non-interactive runs, schema-validated findings posted as inline comments, explicit criteria against false positives, re-review without duplicates, multi-pass and independent review, and batch for nightly work.',
    body: function () {
      return `
${H.box('real', 'Scenario 5 (exam guide, verbatim):', '<i>You are integrating Claude Code into your Continuous Integration/Continuous Deployment (CI/CD) pipeline. The system runs automated code reviews, generates test cases, and provides feedback on pull requests. You need to design prompts that provide actionable feedback and minimize false positives.</i>')}
<p><b>Domains tested:</b> Claude Code Configuration &amp; Workflows (CI flags, CLAUDE.md as project context, session isolation: 3.6) and Prompt Engineering &amp; Structured Output (explicit criteria, few-shot, structured output, batch vs sync, multi-pass review: 4.1, 4.2, 4.3, 4.5, 4.6). The two scenario phrases to anchor on: <b>actionable feedback</b> (location, issue, severity, fix, in a machine-readable shape) and <b>minimize false positives</b> (developer trust is the product).</p>

<h3>Reference architecture</h3>
${D({ w: 760, h: 330, title: 'Claude Code in the PR pipeline',
  groups: [{ x: 180, y: 10, w: 370, h: 180, label: 'REVIEW JOB (synchronous, blocking)', kind: 'soft' }],
  nodes: [
    { id: 'pr', x: 15, y: 40, w: 145, h: 50, label: 'PR opened / new commit', kind: 'human' },
    { id: 'ci', x: 15, y: 130, w: 145, h: 60, label: 'CI workflow', sub: 'claude-code-action or -p', kind: 'agent' },
    { id: 'ng', x: 15, y: 250, w: 145, h: 56, label: 'Nightly schedule', sub: 'tech debt, test gaps', kind: 'note' },
    { id: 'pf', x: 195, y: 40, w: 160, h: 56, label: 'Per-file passes', sub: 'local issues, in parallel', kind: 'agent' },
    { id: 'ip', x: 195, y: 118, w: 160, h: 56, label: 'Integration pass', sub: 'cross-file data flow', kind: 'agent' },
    { id: 'cx', x: 375, y: 40, w: 160, h: 56, label: 'Context in', sub: 'CLAUDE.md, diff, prior findings', kind: 'store' },
    { id: 'js', x: 375, y: 118, w: 160, h: 56, label: 'JSON findings', sub: '--json-schema validated', kind: 'good' },
    { id: 'tg', x: 195, y: 205, w: 160, h: 52, label: 'Test generation job', sub: 'existing tests + fixtures', kind: 'sub' },
    { id: 'bt', x: 195, y: 270, w: 160, h: 50, label: 'Message Batches API', sub: '50% cost, custom_id', kind: 'tool' },
    { id: 'po', x: 590, y: 118, w: 160, h: 56, label: 'Comment poster', sub: 'dedupe by fingerprint', kind: 'tool' },
    { id: 'pc', x: 590, y: 205, w: 160, h: 52, label: 'PR inline comments', sub: 'location, severity, fix', kind: 'human' },
    { id: 'rp', x: 590, y: 270, w: 160, h: 50, label: 'Morning report', kind: 'store' }
  ],
  edges: [{ from: 'pr', to: 'ci' }, { from: 'ci', to: 'pf' }, { from: 'pf', to: 'ip' }, { from: 'cx', to: 'pf', dashed: true }, { from: 'ip', to: 'js' }, { from: 'js', to: 'po' }, { from: 'po', to: 'pc' }, { from: 'ci', to: 'tg' }, { from: 'ng', to: 'bt' }, { from: 'bt', to: 'rp' }],
  caption: 'The blocking review runs synchronously and independently of whatever session wrote the code. It emits schema-validated findings that a script posts as inline comments. Nightly, latency-tolerant analysis goes through the Message Batches API.' })}

<h3>Design decisions you must be able to defend</h3>
${H.table(['Decision', 'Recommended choice', 'Why', 'Common wrong answer'], [
  ['Run without a human', '<code>claude -p</code> (or the GitHub Action, which runs headless)', 'Prevents interactive input hangs', '<code>CLAUDE_HEADLESS=true</code>, <code>--batch</code>, <code>&lt; /dev/null</code> (none work)'],
  ['Machine-readable findings', '<code>--output-format json</code> with <code>--json-schema</code>', 'Poster script can place inline comments reliably', 'Parse prose with regexes'],
  ['Project standards in CI', 'Project CLAUDE.md: review criteria, testing standards, fixtures, accepted patterns', 'CI-invoked Claude Code loads it like a developer session', 'Paste standards into every workflow prompt'],
  ['Reviewer permissions', 'Read-only tool set; deny Edit/Write; <code>--max-turns</code>, <code>--max-budget-usd</code>, job timeout', 'Least privilege and runaway protection', 'bypassPermissions in CI'],
  ['Who reviews generated code', 'Independent instance without the generator\'s reasoning context', 'Self-review keeps its own assumptions; extended thinking does not remove this', '"Ask the same session to double-check"'],
  ['Large PR (14 files)', 'Per-file local passes plus a separate integration pass', 'Avoids attention dilution and contradictions', 'Bigger model/context; 2-of-3 consensus; make developers split PRs'],
  ['Re-review after new commits', 'Include prior findings; report only new or still-unaddressed issues', 'No duplicate comments', 'Fresh review each push'],
  ['False positives', 'Explicit report/skip categories, accepted patterns as persistent context, few-shot acceptable vs genuine', 'Categorical criteria beat "be conservative"', '"Only report high-confidence findings"'],
  ['A category with many false positives', 'Temporarily disable it while improving its criteria', 'Restores trust in the accurate categories', 'Leave it on; add a disclaimer'],
  ['Severity consistency', 'Severity definitions with a concrete code example per level', 'Consistent classification', 'Severity left to judgment'],
  ['Test generation', 'Existing test files in context; CLAUDE.md lists fixtures and what makes a test valuable', 'Avoids duplicates and low-value tests', '"Write thorough tests"'],
  ['Pre-merge vs nightly', 'Sync for blocking pre-merge; batch for nightly debt reports and test-gap analysis', 'Batch has up to 24h latency, no SLA', 'Batch everything for 50%']
])}

<h3>Configuration sketch</h3>
<pre class="code"># .github/workflows/claude-review.yml
name: claude-review
on:
  pull_request:
    types: [opened, synchronize]
concurrency:
  group: claude-review-\${{ github.event.pull_request.number }}
  cancel-in-progress: true
jobs:
  review:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    permissions: { contents: read, pull-requests: write }
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: anthropics/claude-code-action@v1       # automation mode: prompt input
        with:
          anthropic_api_key: \${{ secrets.ANTHROPIC_API_KEY }}
          prompt: |
            Review this PR using the review criteria in CLAUDE.md.
            Prior findings are in .ci/prior-findings.json: report only new or still-unaddressed issues.
          claude_args: |
            --max-turns 15
            --allowedTools "Read,Grep,Glob,Bash(git diff *)"</pre>
<p>The same job as a plain script step, when you want to control posting yourself:</p>
<pre class="code">claude -p "$(cat .ci/review-prompt.md)" \\
  --output-format json \\
  --json-schema "$(cat .ci/review-schema.json)" \\
  --allowedTools "Read" "Grep" "Glob" "Bash(git diff *)" \\
  --disallowedTools "Edit" "Write" \\
  --permission-mode dontAsk \\
  --max-turns 15 --max-budget-usd 2.00 &gt; findings.json
node .ci/post-inline-comments.js findings.json     # reads the validated structured result</pre>
<div class="two"><div>
<h4>Finding schema (excerpt)</h4>
<pre class="code">{ "type": "object", "required": ["findings"],
  "properties": { "findings": { "type": "array", "items": {
    "type": "object",
    "required": ["file", "line", "category", "severity",
                 "issue", "suggested_fix", "status"],
    "properties": {
      "file": { "type": "string" },
      "line": { "type": "integer" },
      "category": { "enum": ["bug", "security",
                    "data_loss", "api_contract"] },
      "severity": { "enum": ["critical", "major", "minor"] },
      "issue": { "type": "string" },
      "suggested_fix": { "type": "string" },
      "detected_pattern": { "type": "string" },
      "status": { "enum": ["new", "still_open"] } } } } } }</pre>
</div><div>
<h4>Review criteria (in CLAUDE.md)</h4>
<pre class="code">## Review criteria
Report: behavior-changing logic bugs; security
(injection, missing authz, secrets); data loss;
breaking API contract changes.
Skip: style, naming, formatting; anything listed
under "Accepted patterns"; TODOs; test helpers.
Comments: flag only when the claimed behavior
contradicts what the code does.
Severity: critical = exploitable or data loss on a
production path (example: unparameterized SQL in
src/api); major = wrong result for valid input;
minor = edge case with a safe failure.

## Accepted patterns
- Raw SQL in db/reports/* (read-only replica)
- any-typed props in legacy/ components</pre>
</div></div>
${H.box('exam', 'Exam vs current docs:', 'The exam covers <code>-p</code>, <code>--output-format json</code> and <code>--json-schema</code>; all exist in the current CLI reference. The GitHub Action (<code>anthropics/claude-code-action@v1</code>) passes CLI flags through <code>claude_args</code>, uses <code>ANTHROPIC_API_KEY</code> or <code>CLAUDE_CODE_OAUTH_TOKEN</code> secrets, and only users with write access can trigger it. Fork PRs on public repos do not receive secrets. Distractor flags such as <code>--batch</code>, <code>--headless</code>, <code>--ci</code> and <code>--max-cost</code> do not exist.')}

<h3>Failure signatures → root cause → fix</h3>
${H.table(['Symptom (as the exam phrases it)', 'Root cause', 'Fix'], [
  ['"The pipeline hangs; logs show Claude Code waiting for interactive input"', 'Interactive invocation', 'Add <code>-p</code> (3.6)'],
  ['"The comment-posting script fails to parse the review output"', 'Free-form text output', '<code>--output-format json</code> + <code>--json-schema</code> (3.6)'],
  ['"Developers ignore the bot; most style and comment-accuracy findings are dismissed"', 'Vague criteria, high-FP categories drown accurate ones', 'Explicit report/skip criteria; disable the noisy category while fixing it (4.1)'],
  ['"We told it to be conservative and only report high-confidence issues; false positives did not drop"', 'Confidence-based filtering', 'Specific categorical criteria and few-shot examples (4.1, 4.2)'],
  ['"Each push re-posts the same comments"', 'No memory of prior findings', 'Include prior findings; report only new or unaddressed (3.6)'],
  ['"14-file PR: deep feedback on some files, superficial on others, contradictory verdicts"', 'Attention dilution in one pass', 'Per-file passes plus integration pass (4.6)'],
  ['"The session that generated the code reviewed it and missed a subtle bug"', 'Self-review bias', 'Independent review instance without generator context (4.6)'],
  ['"Generated tests duplicate scenarios the suite already covers"', 'Existing tests not in context', 'Provide existing test files (3.6)'],
  ['"Generated tests are trivial and ignore our fixtures"', 'Standards not documented', 'CLAUDE.md: valuable-test criteria and available fixtures (3.6)'],
  ['"CI review ignores the conventions developers see locally"', 'Standards live in user-level config', 'Project CLAUDE.md committed to the repo (3.1, 3.6)'],
  ['"Same pattern rated critical in one PR and minor in another"', 'No severity definitions', 'Severity criteria with code examples per level (4.1)'],
  ['"Manager proposes moving the pre-merge check to batch for 50% savings"', 'Latency requirement ignored', 'Keep pre-merge synchronous; batch only overnight work (4.5)']
])}

<h3>Metrics and evals in production</h3>
${H.table(['Metric', 'How to measure', 'Why it matters'], [
  ['Precision by category', 'Accepted or fixed vs dismissed findings per category', 'Decides which categories stay enabled'],
  ['Dismissal patterns', 'Group dismissals by <code>detected_pattern</code>', 'Turns false positives into new skip rules or accepted patterns'],
  ['Recall on seeded bugs', 'Replay a set of historical PRs with known defects', 'Precision work must not silently kill recall'],
  ['Duplicate comment rate', 'Same fingerprint posted twice on a PR', 'Checks the re-review logic'],
  ['Time to feedback and cost per PR', 'Job duration; usage per run; turn count', 'Blocking checks must stay fast; caps prevent runaways'],
  ['Test value', 'Generated tests kept after review; new branches covered; flaky rate', 'Counts useful tests, not test count']
])}
<p>Keep a regression suite of past PRs (true issues and known false-positive traps) and run it whenever CLAUDE.md criteria, few-shot examples or the model change. A drop in precision on the trap set is a release blocker for the review bot.</p>

<h3>Exam question patterns for this scenario</h3>
<ul>
<li><b>Hangs in CI</b> → <code>-p</code>. Non-existent flags and env vars are distractors.</li>
<li><b>Inline PR comments</b> → <code>--output-format json</code> + <code>--json-schema</code>.</li>
<li><b>Project context for CI</b> (standards, fixtures, criteria) → CLAUDE.md.</li>
<li><b>False positives</b> → explicit categories and exclusions, accepted patterns, few-shot; never "be conservative" or confidence thresholds alone.</li>
<li><b>Noisy category hurting trust</b> → disable temporarily, fix criteria.</li>
<li><b>Duplicate comments on new commits</b> → prior findings in context, new or still-open only.</li>
<li><b>Large PR inconsistency</b> → per-file plus integration passes.</li>
<li><b>Reviewing generated code</b> → independent instance.</li>
<li><b>Specialized concerns</b> (security, business logic, API design) → separate passes, each with its own examples.</li>
<li><b>Batch or sync</b> → blocking means sync; overnight means batch.</li></ul>

${H.check([
  ['After adding "only report issues you are highly confident about" to the review prompt, false positives stay the same. What should you change?', 'Replace confidence language with explicit categorical criteria: what to report (bugs, security, data loss, contract breaks) and what to skip (style, accepted patterns, local conventions), plus few-shot examples contrasting acceptable code with genuine issues. Models do not filter reliably on self-assessed confidence.'],
  ['A developer pushes three fix commits; each push re-posts all eight original comments. Design the re-review.', 'Pass the prior findings (from the last run or the PR comments) into the review context and instruct Claude to report only new issues or prior issues still unaddressed, with a status field. The poster also deduplicates by a fingerprint (file, line range, category) as a safety net.'],
  ['Claude generated a module in one CI step and the same session is asked to review it. Why is this weak, and what replaces it?', 'The generating session keeps its reasoning context and is unlikely to question its own decisions; more thinking does not fix that. Run a separate, independent Claude instance (fresh session, read-only tools) with only the diff, standards and criteria.'],
  ['Security, business-logic and API-design feedback get mixed and shallow in a single review prompt. What architecture helps?', 'Specialized review passes, one per concern, each with its own criteria and few-shot examples, run in parallel and merged by the poster. For large PRs combine with per-file local passes plus one integration pass.'],
  ['The test-generation job proposes tests that already exist and ignores the team fixtures. Two changes?', 'Give the job the existing test files for the module so it avoids duplicate scenarios, and document testing standards in CLAUDE.md: available fixtures and factories, what makes a test valuable (behavior, edge cases, error paths), and what to skip (trivial getters).']
])}
${H.src([['Claude Code GitHub Actions', 'https://code.claude.com/docs/en/github-actions'], ['CLI reference', 'https://code.claude.com/docs/en/cli-reference'], ['Claude Code security', 'https://code.claude.com/docs/en/security'], ['Best practices', 'https://code.claude.com/docs/en/best-practices'], ['Batch processing', 'https://platform.claude.com/docs/en/build-with-claude/batch-processing'], ['Prompting best practices', 'https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices']])}`;
    }
  });

  /* ------------------------------------------------------------------ 6.6 */
  CCAR.lessons.push({
    id: 'hb-66-data-extraction', track: 'handbook', part: 'P6', num: '6.6', order: 606, domain: 'ALL',
    objs: ['O25', 'O26', 'O27', 'O28', 'O29', 'X08', 'O22', 'O23'], ts: ['4.3', '4.4', '4.5', '5.5'], minutes: 30,
    title: 'Playbook: structured data extraction (S6)',
    summary: 'A reference extraction pipeline: honest schemas, tool use and structured outputs (with the current-model tool_choice divergence), normalization and few-shot for varied formats, semantic validation with targeted retries, truncation splitting, batch processing, calibrated human review and clean downstream integration.',
    body: function () {
      return `
${H.box('real', 'Scenario 6 (exam guide, verbatim):', '<i>You are building a structured data extraction system using Claude. The system extracts information from unstructured documents, validates the output using JavaScript Object Notation (JSON) schemas, and maintains high accuracy. It must handle edge cases gracefully and integrate with downstream systems.</i>')}
<p><b>Domains tested:</b> Prompt Engineering &amp; Structured Output (schemas, tool use, tool_choice, few-shot, validation-retry, batch: 4.2 to 4.5) and Context Management &amp; Reliability (human review, confidence calibration, segment accuracy: 5.5). The scenario words map to decisions: <b>validates</b> (schema for syntax, code for semantics), <b>high accuracy</b> (measured per field and document type), <b>edge cases gracefully</b> (nullable fields, "unclear" values, routing to humans instead of guessing), <b>downstream systems</b> (stable typed contract, correlation IDs).</p>

<h3>Reference architecture</h3>
${D({ w: 760, h: 330, title: 'Extraction pipeline',
  nodes: [
    { id: 'doc', x: 15, y: 30, w: 150, h: 56, label: 'Documents', sub: 'invoices, contracts, scans', kind: 'store' },
    { id: 'rt', x: 15, y: 135, w: 150, h: 56, label: 'Router', sub: 'sync if someone waits', kind: 'note' },
    { id: 'bt', x: 15, y: 245, w: 150, h: 60, label: 'Message Batches', sub: 'custom_id, resubmit failures', kind: 'tool' },
    { id: 'ex', x: 195, y: 30, w: 180, h: 70, label: 'Extraction call', sub: 'tool + JSON schema, few-shot', kind: 'agent' },
    { id: 'tr', x: 195, y: 140, w: 180, h: 56, label: 'Truncation check', sub: 'max_tokens → split + merge', kind: 'note' },
    { id: 'va', x: 405, y: 30, w: 170, h: 70, label: 'Validator (code)', sub: 'sums, dates, enums, conflicts', kind: 'good' },
    { id: 're', x: 405, y: 140, w: 170, h: 56, label: 'Retry with errors', sub: 'doc + failed output + errors', kind: 'sub' },
    { id: 'cf', x: 405, y: 250, w: 170, h: 56, label: 'Field confidence', sub: 'calibrated on labeled set', kind: 'store' },
    { id: 'ds', x: 600, y: 30, w: 150, h: 70, label: 'Downstream system', sub: 'typed, nulls honored', kind: 'good' },
    { id: 'hr', x: 600, y: 140, w: 150, h: 56, label: 'Human review', sub: 'low conf, ambiguous, conflicts', kind: 'human' },
    { id: 'sm', x: 600, y: 250, w: 150, h: 56, label: 'Stratified sampling', sub: 'audit high-confidence output', kind: 'note' }
  ],
  edges: [{ from: 'doc', to: 'rt' }, { from: 'rt', to: 'ex', label: 'sync' }, { from: 'rt', to: 'bt', label: 'backlog' }, { from: 'ex', to: 'va' }, { from: 'ex', to: 'tr', dashed: true }, { from: 'va', to: 're', label: 'fixable' }, { from: 're', to: 'ex', dashed: true }, { from: 'va', to: 'cf' }, { from: 'cf', to: 'ds', label: 'high' }, { from: 'cf', to: 'hr', label: 'low' }, { from: 'cf', to: 'sm', dashed: true }],
  caption: 'The schema guarantees shape; code guarantees meaning. Only fixable errors are retried, with specific feedback. Confidence decides the route, and high-confidence output is still sampled so that new error patterns surface.' })}

<h3>Design decisions you must be able to defend</h3>
${H.table(['Decision', 'Recommended choice', 'Why', 'Common wrong answer'], [
  ['Output mechanism', 'Tool use with a JSON schema (strict), or JSON outputs via <code>output_config.format</code>', 'Eliminates syntax errors and missing required fields', 'Prompt "return JSON"; prefill'],
  ['Guarantee a structured call (exam)', '<code>tool_choice: "any"</code> when several schemas exist and the type is unknown; forced <code>{"type":"tool","name":"extract_metadata"}</code> to run one extraction first', 'Model cannot answer in text', '<code>auto</code> and hope'],
  ['Information may be absent', 'Nullable fields', 'Required non-null fields invite fabrication', 'Make everything required'],
  ['Ambiguous or open categories', 'Enum with <code>"unclear"</code>, and <code>"other"</code> + detail string', 'Honest representation; extensible', 'Closed enum that forces a wrong bucket'],
  ['Inconsistent source formats', 'Normalization rules in the prompt (ISO dates, ISO 4217 currency, units) plus code normalization', 'Schema alone does not define formats', 'Downstream cleans it up'],
  ['Varied layouts, empty required fields', '2 to 4 few-shot examples across formats (tables vs prose, inline vs appendix)', 'Few-shot reduces nulls and hallucination on unfamiliar structures', 'Longer instructions only'],
  ['Semantic correctness', 'Validator in code: <code>calculated_total</code> vs <code>stated_total</code>, <code>conflict_detected</code>, date order', 'Schemas do not catch wrong sums or misplaced values', 'Trust schema-valid output'],
  ['Validation failures', 'Retry with the document, the failed extraction and the specific errors', 'Targeted feedback converges', 'Blind retry; retry forever'],
  ['Information not in the document', 'Stop retrying; null plus a flag, or route to review', 'Retries cannot create absent data', 'Retry with "try harder"'],
  ['Output truncated (<code>stop_reason: "max_tokens"</code>)', 'Split into scoped calls (sections, page ranges, line-item chunks) and merge', 'Ceilings and attention dilution', 'Raise <code>max_tokens</code>'],
  ['Backlog of 40,000 documents', 'Message Batches (50%), <code>custom_id</code> per document, refine prompt on a sample first', 'Nobody waits; failures correlate by ID', 'Synchronous loop; whole-batch reruns'],
  ['Reduce human review', 'Segment accuracy by document type and field; calibrated field confidence; stratified sampling of high-confidence items', '97% aggregate can hide a weak segment', 'Cut review because aggregate is 97%']
])}

<h3>Configuration sketch</h3>
<pre class="code">// Extraction tool (input_schema = your output contract)
{
  "name": "extract_invoice",
  "description": "Record the fields of ONE invoice or credit note. Use null when a field is not present in the document. Never infer values from other documents.",
  "strict": true,
  "input_schema": {
    "type": "object", "additionalProperties": false,
    "required": ["document_type", "document_type_detail", "vendor_name", "invoice_date", "po_number",
                 "currency", "line_items", "stated_total", "calculated_total", "conflict_detected", "field_confidence"],
    "properties": {
      "document_type":        { "enum": ["invoice", "credit_note", "receipt", "unclear", "other"] },
      "document_type_detail": { "type": ["string", "null"], "description": "Required when document_type is other" },
      "vendor_name":          { "type": ["string", "null"] },
      "invoice_date":         { "type": ["string", "null"], "description": "YYYY-MM-DD; null if absent" },
      "po_number":            { "type": ["string", "null"], "description": "null if the document has none" },
      "currency":             { "type": ["string", "null"], "description": "ISO 4217 code, e.g. EUR" },
      "line_items": { "type": "array", "items": { "type": "object", "additionalProperties": false,
        "required": ["description", "quantity", "unit_price", "amount"],
        "properties": { "description": { "type": "string" }, "quantity": { "type": ["number", "null"] },
                        "unit_price": { "type": ["number", "null"] }, "amount": { "type": "number" } } } },
      "stated_total":      { "type": ["number", "null"], "description": "Total as printed" },
      "calculated_total":  { "type": ["number", "null"], "description": "Sum of line item amounts" },
      "conflict_detected": { "type": "boolean", "description": "True if the document contradicts itself" },
      "field_confidence":  { "type": "object", "additionalProperties": { "enum": ["high", "medium", "low"] } }
    }
  }
}</pre>
<pre class="code"># Python: validate, retry only what a retry can fix, route the rest
def validate(x):
    errors = []
    s = round(sum(li["amount"] for li in x["line_items"]), 2)
    if x["stated_total"] is not None and abs(s - x["stated_total"]) &gt; 0.01:
        errors.append(f"line_items sum to {s} but stated_total is {x['stated_total']}; re-read the totals section")
    if x["document_type"] == "other" and not x["document_type_detail"]:
        errors.append("document_type is other but document_type_detail is empty")
    return errors

result = extract(doc)                                  # one tool call, schema-valid
if result.stop_reason == "max_tokens":                 # truncated: never just raise max_tokens
    result = merge([extract(part) for part in split_by_section(doc)])
for attempt in range(2):
    errs = validate(result.data)
    if not errs: break
    result = extract(doc, previous=result.data, errors=errs)   # doc + failed output + specific errors
route(result, errs)    # remaining errors, low confidence, conflict_detected, "unclear" -&gt; human review</pre>
<pre class="code">// One Message Batches request line (JSONL); results come back unordered, keyed by custom_id
{"custom_id": "inv-2026-09-000123",
 "params": {"model": "&lt;model-id&gt;", "max_tokens": 4096,
            "tools": [ /* extract_invoice */ ],
            "tool_choice": {"type": "tool", "name": "extract_invoice"},   // exam pattern; see note below
            "messages": [{"role": "user", "content": [ /* document block + instructions */ ]}]}}</pre>
${H.box('exam', 'Exam vs current docs:', 'The exam teaches <code>tool_choice: "any"</code> and forced tool selection to guarantee structured output, and that is the exam answer. In current docs, <b>Claude Opus 5.5, Sonnet 5.5 and Fable 5.1 return 400 for <code>any</code> and forced tool choice</b>. On those models use <code>auto</code> with <code>strict: true</code> tools (prompting steers the call), or JSON outputs via <code>output_config.format</code> for a fixed response shape; Haiku 4.5 and older still accept forced choice. Prefilling the assistant turn returns 400 from Claude 4.6 onward. Structured outputs do not support some JSON Schema constraints (for example min/max); the SDKs strip them and you validate afterwards. A single-turn extraction works in batch because you never have to return a tool result.')}

<h3>Failure signatures → root cause → fix</h3>
${H.table(['Symptom (as the exam phrases it)', 'Root cause', 'Fix'], [
  ['"The downstream parser occasionally fails on malformed JSON"', 'Prompt-only JSON', 'Tool use with a JSON schema or structured outputs (4.3)'],
  ['"Sometimes the model replies in prose instead of calling the extraction tool"', '<code>tool_choice: "auto"</code>', '<code>"any"</code> (exam); current models: structured outputs or strict tool plus prompting (4.3)'],
  ['"Enrichment tools run before metadata is extracted"', 'No forced first step', 'Force <code>extract_metadata</code>, then enrichment in follow-up turns (4.3, 2.3)'],
  ['"PO numbers appear for documents that have none"', 'Required non-nullable field', 'Nullable field; instruct null when absent (4.3)'],
  ['"Unusual document types are forced into invoice"', 'Closed enum', '<code>"unclear"</code> and <code>"other"</code> + detail (4.3)'],
  ['"Dates arrive as 03/04/25, 4 March 2025 and 2025-03-04"', 'No normalization rules', 'Normalization rules in the prompt alongside the schema (4.3)'],
  ['"Required fields come back null for documents with a different layout"', 'No examples of varied structures', '2 to 4 few-shot examples across formats (4.2)'],
  ['"Output is schema-valid but line items do not sum to the total"', 'Semantic error; schemas cannot catch it', '<code>calculated_total</code> vs <code>stated_total</code> check; retry with the specific error (4.4)'],
  ['"Retries never fix the missing payment terms, which are in a referenced master agreement"', 'Information absent from the source', 'Stop retrying; null plus flag or human review (4.4)'],
  ['"Long contracts fail with stop_reason max_tokens and invalid output"', 'Output ceiling in one call', 'Split into scoped calls and merge (4.3, 4.6)'],
  ['"3% of a nightly batch failed; the team resubmits the whole batch"', 'No failure isolation', 'Resubmit only failed <code>custom_id</code>s, chunking oversized documents (4.5)'],
  ['"97% overall accuracy, so the team proposes removing human review"', 'Aggregate hides weak segments', 'Measure by document type and field; route by calibrated confidence; stratified sampling (5.5)']
])}

<h3>Metrics and evals in production</h3>
${H.table(['Metric', 'How to measure', 'Why it matters'], [
  ['Field accuracy by document type', 'Labeled validation set, per field and per segment', 'The only honest basis for automation decisions'],
  ['Fabrication vs correct-null rate', 'Fields present in output but absent in source; nulls where the value exists', 'Shows whether nullable design works'],
  ['Semantic validation failure rate', 'Validator errors per 1,000 documents, by rule', 'Where prompts or few-shot need work'],
  ['Retry effectiveness', 'Share of retries that fix the error, by error type', 'Retries on absent data should be zero'],
  ['Confidence calibration', 'Actual accuracy per confidence level on the labeled set', 'Thresholds come from calibration, not self-report'],
  ['Review load and agreement', 'Share routed to humans; reviewer corrections; inter-reviewer agreement', 'Capacity planning and label quality'],
  ['High-confidence audit error rate', 'Stratified random sample of auto-accepted items', 'Detects novel error patterns and drift'],
  ['Cost, throughput, SLA', 'Cost per document; batch completion time; SLA misses', 'Batch windows: submit every 4 hours for a 30-hour SLA']
])}
<p>Before any large batch, refine the prompt on a representative sample to raise first-pass success. Re-run the labeled set whenever the schema, examples or model change, and version the schema so downstream consumers can migrate deliberately.</p>

<h3>Exam question patterns for this scenario</h3>
<ul>
<li><b>Most reliable structured output</b> → tool use with JSON schema (strict), not prompts or prefill.</li>
<li><b>Model sometimes answers in text</b> → <code>tool_choice: "any"</code>; <b>one extraction must run first</b> → forced tool.</li>
<li><b>Fabricated values</b> → nullable fields; <b>ambiguous categories</b> → "unclear", "other" + detail.</li>
<li><b>Inconsistent formats</b> → normalization rules; <b>varied layouts</b> → few-shot across formats.</li>
<li><b>Valid JSON, wrong numbers</b> → semantic validation in code plus retry with specific errors.</li>
<li><b>Retry will not help</b> → information absent from the provided document.</li>
<li><b>Truncation</b> → split and merge, never "raise max_tokens".</li>
<li><b>Overnight or backlog volume</b> → Message Batches with <code>custom_id</code>; resubmit only failures; SLA math.</li>
<li><b>Reduce human review</b> → segment accuracy, calibrated field confidence, stratified sampling; route ambiguous and contradictory documents to humans.</li></ul>

${H.check([
  ['Extraction from supplier contracts often returns a <code>termination_notice_days</code> value even when the contract has no such clause. What schema and prompt change fixes this?', 'Make the field nullable and instruct Claude to return null when the clause is absent (optionally with a <code>"not_found"</code> style flag). A required non-null field pressures the model to invent a plausible number. Add a few-shot example of a contract without the clause.'],
  ['A validator finds that line items sum to 1,240.00 while the stated total is 1,420.00. What should the retry contain, and when should you stop retrying?', 'The original document, the failed extraction and the specific error ("line items sum to 1,240.00 but stated_total is 1,420.00; re-read the totals and line items"). If the discrepancy persists after one or two targeted retries, the document may genuinely contradict itself: set <code>conflict_detected</code> and route it to human review.'],
  ['A 180-page contract extraction ends with <code>stop_reason: "max_tokens"</code> and incomplete JSON. A teammate proposes doubling <code>max_tokens</code>. Your recommendation?', 'Split the work into scoped calls (by section or page range, or by clause type), extract each into the same schema, then merge and validate in code. Raising the ceiling postpones the failure and dilutes attention across a huge output.'],
  ['You need 60,000 historical invoices processed with a 30-hour SLA per document. Design the submission cadence.', 'Use the Message Batches API with a <code>custom_id</code> per invoice. Worst case is wait time plus 24 hours of processing, so submit at least every 4 hours (4 + 24 = 28 hours, leaving 2 hours to resubmit failures). Pilot the prompt on a sample first; resubmit only failed IDs, chunking oversized documents.'],
  ['Accuracy is 97% overall, but handwritten delivery notes make up 6% of volume. What must you check before reducing human review, and how do you keep watch afterwards?', 'Accuracy by document type and by field: handwritten notes might be at 80% on quantities while typed invoices are near 99%. Route by field-level confidence calibrated on a labeled set, send ambiguous or contradictory documents to reviewers, and keep a stratified random sample of high-confidence items under audit to measure error rates and catch new patterns.']
])}
${H.src([['Structured outputs', 'https://platform.claude.com/docs/en/build-with-claude/structured-outputs'], ['Define tools (tool_choice)', 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools'], ['Batch processing', 'https://platform.claude.com/docs/en/build-with-claude/batch-processing'], ['Prompting best practices', 'https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices'], ['Demystifying evals for AI agents', 'https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents']])}`;
    }
  });
})();
