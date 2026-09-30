/* Architect Handbook · Part 1 (b): Agent SDK hooks (1.5), task decomposition (1.6), sessions, resumption and forking (1.7). */
(function () {
  var H = CCAR.hb, D = H.D;

  /* ------------------------------------------------------------------ 1.5 */
  CCAR.lessons.push({
    id: 'hb-15-sdk-hooks', track: 'handbook', part: 'P1', num: '1.5', order: 105, domain: 'D1',
    objs: ['X03', 'X02'], ts: ['1.5'], minutes: 30,
    title: 'Agent SDK hooks: interception, normalization and guaranteed compliance',
    summary: 'Hook events and what each is for, SDK callback hooks vs Claude Code command hooks, PostToolUse normalization, PreToolUse policy blocks with redirection, how hooks interact with permission rules, and how hooks fail.',
    body: function () {
      return `
<p>A hook is your code running at a fixed point in the agent loop: before a tool call executes, after a result comes back, when a prompt is submitted, when the agent tries to stop. Because the harness calls it every time, a hook turns a business rule from "Claude will usually follow this" into "this cannot happen". In production that is the difference between a refund policy in a system prompt and a refund policy that survives an adversarial customer, a long context and a model upgrade. The exam probes two patterns (PostToolUse normalization and PreToolUse interception) and one judgment: <b>when a rule needs a hook instead of a prompt</b>.</p>

<h3>Where hooks sit in the loop</h3>
${D({ w: 760, h: 250, title: 'Hook points around a tool call',
  groups: [{ x: 200, y: 20, w: 360, h: 210, label: 'YOUR PROCESS (harness + hooks)', kind: 'hard' }],
  nodes: [
    { id: 'm', x: 20, y: 95, w: 150, h: 56, label: 'Claude', sub: 'emits tool_use', kind: 'agent' },
    { id: 'pre', x: 220, y: 50, w: 150, h: 56, label: 'PreToolUse hook', sub: 'allow · deny · ask · rewrite', kind: 'good' },
    { id: 'perm', x: 390, y: 50, w: 150, h: 56, label: 'Permission rules', sub: 'deny → ask → allow', kind: 'tool' },
    { id: 'post', x: 220, y: 150, w: 150, h: 56, label: 'PostToolUse hook', sub: 'normalize · trim · annotate', kind: 'good' },
    { id: 't', x: 600, y: 95, w: 140, h: 56, label: 'Tool / MCP server', sub: 'executes', kind: 'tool' },
    { id: 'esc', x: 600, y: 180, w: 140, h: 44, label: 'Escalation path', sub: 'reason fed to Claude', kind: 'human' }
  ],
  edges: [{ from: 'm', to: 'pre' }, { from: 'pre', to: 'perm' }, { from: 'perm', to: 't' }, { from: 't', to: 'post', label: 'raw result' }, { from: 'post', to: 'm', label: 'clean result' }, { from: 'pre', to: 'esc', dashed: true, kind: 'bad', label: 'deny' }],
  caption: 'PreToolUse sees the proposed call before anything executes. PostToolUse sees the raw result before Claude does. Both run in your process, deterministically, on every matching call.' })}

<h3>Hook events and what they are for</h3>
${H.table(['Event', 'Fires', 'Typical uses', 'Can it block or change things?'], [
  ['<b>PreToolUse</b>', 'Before a tool call executes', 'Policy gates (refund &gt; $500), prerequisite checks, path or command guards, input rewriting, audit of intent', 'Yes: deny, allow, ask, or rewrite input (<code>updatedInput</code>)'],
  ['<b>PostToolUse</b>', 'After a tool succeeds, before Claude sees the result', 'Normalize formats, trim verbose payloads, redact PII, add context, run a linter after an edit', 'Replace the result (<code>updatedToolOutput</code>) or add feedback; the tool already ran'],
  ['<b>PostToolUseFailure</b>', 'After a tool call fails', 'Log and classify failures, add recovery guidance, alert on repeated errors', 'Adds context; cannot un-fail the call'],
  ['<b>UserPromptSubmit</b>', 'When a prompt is submitted, before Claude processes it', 'Inject context (ticket data, policy version), block prompts containing secrets', 'Yes: add context or block'],
  ['<b>Stop</b>', 'When the main agent is about to finish', 'Deterministic "done" gate: tests must pass, required fields present', 'Yes: can keep the agent working with a reason'],
  ['<b>SubagentStart / SubagentStop</b>', 'When a subagent starts / finishes', 'Trace delegation, enforce per-subagent budgets, validate subagent output shape', 'SubagentStop can act as a gate like Stop'],
  ['<b>SessionStart / SessionEnd</b>', 'Session begins (new or resumed) / ends', 'Load environment facts (branch, open incidents); flush logs, clean up temp state', 'Adds context / side effects only'],
  ['<b>PreCompact</b>', 'Before context compaction', 'Archive the full transcript, snapshot case facts before summarization loses them', 'Side effects only'],
  ['<b>PermissionRequest</b>', 'When a permission prompt would be shown', 'Auto-approve or auto-deny known-safe or known-bad requests in unattended runs', 'Yes: decide the request'],
  ['<b>Notification</b>', 'When the harness emits a notification (for example waiting for input)', 'Forward to Slack, pager or a dashboard', 'No']
])}
<p class="small muted">Current docs list more events (for example PostCompact). The ones above are the ones exam scenarios and production designs lean on.</p>

<h3>Two ways to write a hook</h3>
<div class="two"><div>
<h4>Agent SDK callback hooks</h4>
<ul>
<li>Passed in the <code>hooks</code> option of <code>query()</code>: event → list of matchers, each with a <code>matcher</code> (regex on the tool name, for example <code>"mcp__billing__.*"</code> or <code>"Edit|Write"</code>) and a list of async callbacks.</li>
<li>The callback receives the event input (tool name, <code>tool_input</code>, session id and so on) and returns an object. Empty object = no opinion, continue.</li>
<li>PreToolUse returns <code>hookSpecificOutput</code> with <code>permissionDecision</code> (<code>"allow"</code>, <code>"deny"</code>, <code>"ask"</code>; current docs also list <code>"defer"</code>), a <code>permissionDecisionReason</code> that Claude reads, and optionally <code>updatedInput</code>.</li>
<li>Runs in your process: can read your database, call your policy service, keep counters.</li></ul>
</div><div>
<h4>Claude Code command hooks</h4>
<ul>
<li>Declared under the <code>hooks</code> key in settings.json (user, project <code>.claude/settings.json</code>, local), or in skill / agent frontmatter.</li>
<li>A shell command receives the event as JSON on stdin.</li>
<li><b>Exit code 2 = block</b>: for PreToolUse the call does not run and <b>stderr is fed to Claude</b> as the reason. On PostToolUse the tool already ran; exit 2 shows stderr to Claude.</li>
<li>Exit 0 with JSON on stdout can return the same decisions (<code>permissionDecision</code>, <code>updatedInput</code>; PostToolUse <code>updatedToolOutput</code>).</li>
<li>All hooks from all scopes merge: every matching hook fires.</li></ul>
</div></div>

<h3>Pattern 1: PostToolUse normalization of heterogeneous MCP data</h3>
<p>Three MCP tools report the same concepts differently: the legacy CRM returns <code>created: 1700000000</code> (Unix seconds) and <code>status: 2</code>; the billing API returns <code>"2023-11-14T22:13:20Z"</code> (ISO 8601) and <code>"state": "SUSPENDED"</code>; shipping returns milliseconds. Left alone, Claude has to reconcile formats in its head on every turn, and it will sometimes compare a timestamp with a date string or misread <code>2</code>. Normalize once, in code, before the model sees anything.</p>
<pre class="code">// TypeScript, Agent SDK: one PostToolUse hook for every data-returning MCP tool
const STATUS_MAPS = {
  mcp__legacy_crm__get_account: { 1: "active", 2: "suspended", 3: "closed" },
};

function toIso(v) {
  if (typeof v === "number") {
    // 10-digit values are seconds, 13-digit values are milliseconds
    return new Date(v &lt; 1e12 ? v * 1000 : v).toISOString();
  }
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();   // null = unparseable, never guess
}

const normalizeResult = async (input) =&gt; {
  const data = parseToolJson(input.tool_response);        // your helper: extract the JSON payload
  if (!data) return {};                                    // not JSON: leave untouched
  const map = STATUS_MAPS[input.tool_name] || {};
  const out = {
    ...data,
    created_at: toIso(data.created ?? data.created_at ?? data.createdMs),
    status: typeof data.status === "number"
      ? (map[data.status] || "unknown_code_" + data.status)   // keep unknown codes visible
      : String(data.status ?? data.state ?? "").toLowerCase(),
  };
  delete out.created; delete out.createdMs; delete out.state;
  return { hookSpecificOutput: { hookEventName: "PostToolUse", updatedToolOutput: out } };
};

const options = {
  hooks: {
    PostToolUse: [{ matcher: "mcp__(legacy_crm|billing|shipping)__.*", hooks: [normalizeResult] }],
  },
};</pre>
${H.table(['Raw value (source)', 'Normalized', 'Rule'], [
  ['<code>1700000000</code> (CRM, seconds)', '<code>"2023-11-14T22:13:20.000Z"</code>', 'Seconds vs milliseconds by magnitude'],
  ['<code>"2023-11-14T22:13:20Z"</code> (billing)', 'Same instant, same format', 'Parse and re-emit in one canonical format (UTC)'],
  ['<code>status: 2</code> (CRM)', '<code>"suspended"</code>', 'Per-tool code map; codes differ between systems'],
  ['<code>status: 9</code> (unmapped)', '<code>"unknown_code_9"</code>', 'Never silently guess; surface it'],
  ['<code>"SUSPENDED"</code> (billing)', '<code>"suspended"</code>', 'Case-fold enumerations']
])}
${H.box('rule', 'Why PostToolUse and not the prompt:', 'A prompt line such as "treat all timestamps as UTC and map status 2 to suspended" costs tokens every request and works most of the time. The hook works every time, costs no context, and gives Claude a single vocabulary. It is also the right place to trim a 40-field payload to the fields the task needs.')}

<h3>Pattern 2: PreToolUse interception that blocks and redirects</h3>
<p>Policy: refunds above $500 require a human. The hook denies the call and its reason tells Claude what to do instead, so the conversation moves into the escalation workflow instead of dead-ending.</p>
<pre class="code"># Python, Agent SDK
from claude_agent_sdk import ClaudeAgentOptions, HookMatcher

REFUND_LIMIT = 500.00

async def refund_guard(input_data, tool_use_id, context):
    amount = float(input_data["tool_input"].get("amount", 0))
    if amount &gt; REFUND_LIMIT:
        return {"hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": (
                f"Refunds over {REFUND_LIMIT:.0f} USD need human approval. "
                "Do not retry or split the refund. Call escalate_to_human with "
                "customer_id, order_id, amount, reason and your recommended action."),
        }}
    return {}   # no opinion: normal permission flow continues

options = ClaudeAgentOptions(
    hooks={"PreToolUse": [HookMatcher(matcher="mcp__billing__process_refund", hooks=[refund_guard])]},
)</pre>
<p>The same rule as a Claude Code command hook, fail-closed:</p>
<pre class="code">// .claude/settings.json
{
  "hooks": {
    "PreToolUse": [
      { "matcher": "mcp__billing__process_refund",
        "hooks": [ { "type": "command", "command": ".claude/hooks/refund-guard.sh" } ] }
    ]
  }
}

#!/usr/bin/env bash
# .claude/hooks/refund-guard.sh  (event JSON arrives on stdin)
set -euo pipefail
trap 'echo "refund guard failed: blocking as a precaution; escalate to a human" &gt;&amp;2; exit 2' ERR
payload=$(cat)
if echo "$payload" | jq -e '.tool_input.amount &gt; 500' &gt;/dev/null; then
  echo "Refunds over 500 USD need human approval. Call escalate_to_human with a case summary." &gt;&amp;2
  exit 2          # block; stderr goes to Claude
fi
exit 0</pre>

<h4>Cumulative caps need running totals</h4>
<p>A per-call check lets a determined user (or an over-helpful agent) split $900 into two $450 refunds. If the policy is "at most $500 per customer per day" or "$150 in credits per conversation", the hook must check <b>prior refunds plus this one</b>. Read the total from the system of record (the refunds ledger keyed by customer), not from an in-memory counter that dies with the process. If you must count in memory, key by session id, reserve in PreToolUse, and release the reservation in PostToolUseFailure. Add a reason that says "do not split refunds" so Claude does not try the obvious workaround.</p>

<h4>Rewriting instead of blocking: <code>updatedInput</code></h4>
<p>Some rules are better enforced by correcting the call: force <code>currency: "USD"</code>, clamp a <code>limit</code> parameter to 50, add a mandatory <code>dry_run: true</code> in a staging environment, or rewrite a path into the sandbox. Return <code>permissionDecision: "allow"</code> (or <code>"ask"</code>) together with <code>updatedInput</code>. Rewrite only when the corrected call is unambiguously what the policy intends; otherwise deny with a reason so Claude (and the log) sees the conflict.</p>

<h3>Hooks vs prompts: deterministic vs probabilistic</h3>
${H.table(['Requirement', 'Mechanism', 'Why'], [
  ['Must never happen (refund above threshold, write to prod, read <code>.env</code>)', '<b>PreToolUse hook</b> or permission deny rule', 'Guaranteed on every call; a prompt has a non-zero failure rate'],
  ['Must always happen before X (identity verified before refund)', '<b>Prerequisite gate</b> in a PreToolUse hook (1.4)', 'Ordering is enforced by code, not by Claude remembering'],
  ['Data must arrive in one format', '<b>PostToolUse</b> normalization', 'One transformation in code instead of reasoning on every turn'],
  ['Agent must not declare done until tests pass', '<b>Stop</b> hook gate', 'Completion becomes a checked condition'],
  ['Tone, empathy, explanation style, when to offer alternatives', '<b>Prompt</b> / system prompt / examples', 'Judgment and style cannot be coded as a rule'],
  ['Preferred tool order that is not a hard rule', 'Prompt or tool descriptions', 'A hook would over-constrain legitimate variations'],
  ['Conventions a team wants followed', 'CLAUDE.md / rules / skills', 'Guidance; add a hook only after it proves it must never be violated']
])}
${H.box('decision', 'Decision rule:', 'If the stem says <i>guarantee</i>, <i>always</i>, <i>never</i>, <i>compliance</i>, <i>financial</i> or <i>regulatory</i>, and the prompt-based option already exists or failed ("despite instructions, 3% of refunds exceeded the limit"), the answer is programmatic enforcement: a hook or gate. Strengthening the prompt, adding few-shot examples or "IMPORTANT" wording keeps the failure probabilistic.')}

<h3>How hooks interact with permission rules</h3>
${H.table(['Situation', 'Outcome'], [
  ['Hook returns <code>deny</code> (or command hook exits 2), and an allow rule matches the tool', '<b>Blocked.</b> Exit 2 blocks even if an allow rule matches'],
  ['Hook returns <code>allow</code>, and a deny rule matches', '<b>Still denied.</b> A hook allow cannot bypass deny rules (or ask rules)'],
  ['Hook returns nothing', 'Normal evaluation: deny → ask → allow, first match wins; deny at any scope beats allow anywhere'],
  ['Several hooks match (project and user scope)', 'All fire (hooks merge across scopes). Design each hook to stand alone and do not rely on execution order between them']
])}
<p>Treat hooks and permission rules as layers: static deny rules for what is never allowed by pattern, hooks for rules that need logic or data (amounts, customer state, prerequisite results), sandboxing for OS-level isolation.</p>

${H.box('real', 'Real-world notes:', '<ul><li><b>Zero context cost:</b> hooks run in your process and add nothing to the context window unless they return text for Claude. A 30-line policy in the system prompt costs tokens on every request; the same policy in a hook costs none.</li><li><b>Latency:</b> hooks run synchronously on every matching call. Keep matchers narrow, avoid slow network calls in hot paths, cache policy lookups, and set a timeout.</li><li><b>Observability:</b> log every deny with the reason, tool input and session id. A spike in denies is an early signal of a prompt regression or an abuse pattern.</li><li><b>Testing:</b> SDK callbacks are plain async functions: unit-test them with fixture inputs (at, below and above the threshold; malformed input; split refunds). Test command hooks by piping JSON to the script and asserting the exit code and stderr. Add should-block and should-allow cases to your regression evals and read transcripts to confirm Claude follows the redirect.</li><li><b>Security:</b> hooks run with your credentials. Untrusted repositories can ship hooks; for <code>claude -p</code> on untrusted code use <code>--bare</code>, <code>--setting-sources user</code> or <code>disableAllHooks</code>.</li></ul>')}

<h3>Failure modes: what happens when the hook itself breaks</h3>
${H.table(['Failure', 'Effect', 'Design response'], [
  ['Hook crashes or exits with a code other than 2', 'For command hooks this is a non-blocking error: the tool call proceeds (<b>fail-open</b>)', 'For compliance hooks, catch every error and block (exit 2 / deny): <b>fail-closed</b>'],
  ['Policy service unreachable', 'Hook cannot decide', 'Compliance rules: deny with "cannot verify, escalate". Convenience hooks (formatting, logging): allow and alert'],
  ['Hook slow', 'Every matching call waits; user-visible latency', 'Narrow matcher, cache, timeout, move heavy work async (logging) out of the decision path'],
  ['Normalizer meets an unknown format', 'Wrong value silently fed to Claude', 'Pass raw value with an explicit marker (<code>unknown_code_9</code>, <code>null</code>) and alert'],
  ['Deny reason is vague ("blocked")', 'Claude retries, rephrases or splits the call', 'Reason states the rule, what not to do, and the alternative tool to call']
])}
${H.box('decision', 'Fail-open vs fail-closed:', 'Choose per hook, deliberately. Money movement, data deletion, PII egress: fail-closed, and accept that an outage of the policy service pauses those actions. Formatting, enrichment, telemetry: fail-open, because blocking the agent costs more than the missing enhancement.')}

${H.box('exam', 'Exam vs current docs:', 'The exam guide describes hooks generically ("PostToolUse hooks", "tool call interception hooks"). Current docs give the exact shapes: PreToolUse <code>permissionDecision</code> allow / deny / ask (plus defer) with <code>updatedInput</code>; PostToolUse <code>updatedToolOutput</code>; command-hook exit code 2. Recognize both the concept and the field names.')}

${H.box('trap', 'Distractors and why they fail:', '<ul><li><b>"Add the $500 rule to the system prompt in capitals"</b>: still probabilistic.</li><li><b>"Few-shot examples of declined refunds"</b>: improves the rate, does not guarantee it.</li><li><b>"Validate the refund after it is processed"</b> (PostToolUse): the money already moved. Blocking belongs in PreToolUse.</li><li><b>"Ask the model to normalize dates in its reasoning"</b>: repeated work, inconsistent results; normalize in a PostToolUse hook.</li><li><b>"Deny and stop the conversation"</b>: the guide wants a <i>redirect</i> to an alternative workflow (human escalation).</li><li><b>"Per-call check for a cumulative cap"</b>: split refunds pass.</li><li><b>"A hook allow overrides the deny rule"</b>: it cannot.</li></ul>')}

<h3>Worked scenario</h3>
<p>A support agent built on the Agent SDK uses <code>get_customer</code>, <code>lookup_order</code> (both MCP) and <code>process_refund</code>. Production review finds: (1) 2% of refunds above $500 were processed despite a system-prompt rule; (2) a customer received two $400 refunds in one conversation; (3) Claude sometimes says an order is "overdue" because it compared a Unix timestamp from <code>lookup_order</code> with an ISO date from <code>get_customer</code>.</p>
<ol class="steps">
<li><b>Issue 1</b> is a guarantee failure: add a PreToolUse hook on <code>process_refund</code> that denies above $500 with a reason that redirects to <code>escalate_to_human</code> and a structured handoff (customer ID, order, amount, root cause, recommended action).</li>
<li><b>Issue 2</b> is a cumulative rule: the same hook sums prior refunds for the customer (from the ledger) plus the requested amount. The reason says "do not split refunds".</li>
<li><b>Issue 3</b> is a data-shape problem: a PostToolUse hook on the MCP tools converts all timestamps to ISO 8601 UTC and maps numeric status codes to names.</li>
<li>Make the refund hook fail-closed, unit-test the boundaries (500.00 allowed, 500.01 escalated, 2 × 400 escalated), and keep the prompt rule for explanation quality only.</li></ol>

${H.check([
  ['A compliance team wants a guarantee that no refund above $500 is processed without a human. The system prompt already states the rule. What do you add?', 'A PreToolUse hook on the refund tool that denies amounts above $500 and redirects to human escalation. Prompts give probabilistic compliance; the hook runs on every call.'],
  ['Why is PostToolUse the wrong event for the refund limit?', 'PostToolUse runs after the tool executed, so the refund already happened. Interception must happen before execution.'],
  ['Three MCP tools return dates as Unix seconds, milliseconds and ISO 8601, and status as numeric codes. Where do you fix it, and what about an unmapped code?', 'A PostToolUse hook matching those tools converts to one canonical format before Claude sees the result. An unmapped code is passed through with an explicit marker (for example <code>unknown_code_9</code>) and alerted, never guessed.'],
  ['A project settings file allows <code>mcp__billing__*</code>. Your PreToolUse command hook exits 2 for a refund. Does the refund run?', 'No. Exit code 2 blocks even when an allow rule matches, and stderr goes to Claude as the reason.'],
  ['Your refund hook calls a policy service that times out. What should happen, and how do you make a command hook do it?', 'For money movement, fail closed: block and redirect to escalation. A command hook that crashes with a code other than 2 does not block, so trap errors and exit 2 explicitly.'],
  ['Why do hooks not bloat context the way prompt rules do?', 'They run in your process. Nothing enters the context window unless the hook returns text (a deny reason or added context).']
])}
${H.src([['Agent SDK: hooks', 'https://code.claude.com/docs/en/agent-sdk/hooks'], ['Claude Code hooks reference', 'https://code.claude.com/docs/en/hooks'], ['Claude Code permissions', 'https://code.claude.com/docs/en/permissions'], ['Agent SDK: permissions', 'https://code.claude.com/docs/en/agent-sdk/permissions']])}`;
    }
  });

  /* ------------------------------------------------------------------ 1.6 */
  CCAR.lessons.push({
    id: 'hb-16-decomposition', track: 'handbook', part: 'P1', num: '1.6', order: 106, domain: 'D1',
    objs: ['O07', 'O08'], ts: ['1.6'], minutes: 30,
    title: 'Task decomposition: fixed pipelines vs adaptive plans',
    summary: 'When to chain fixed steps and when to let the plan evolve, per-file plus cross-file review passes, mapping-first decomposition of open-ended work, dependency-aware hybrids, gates between stages, and long-running harness patterns.',
    body: function () {
      return `
<p>Decomposition is the architect's first decision on any complex task: how the work is cut into steps, who decides the steps, and when. Get it right and each step fits comfortably in one context with a clear success check. Get it wrong and you see the classic symptoms: shallow coverage of some parts, contradictory findings, duplicated work, or an agent that one-shots a huge change and declares it done. The exam tests one distinction above all: <b>fixed sequential pipelines (prompt chaining) for predictable work versus dynamic adaptive decomposition for open-ended investigation</b>, plus the per-file / cross-file split for large reviews.</p>

<h3>Two families of decomposition</h3>
${H.table(['', 'Fixed pipeline (prompt chaining)', 'Dynamic adaptive decomposition'], [
  ['Who defines the steps', 'You, in code, before the run', 'The agent (or a coordinator), based on what each step discovers'],
  ['Shape', 'Step 1 → gate → step 2 → gate → step 3', 'Explore → plan → execute part → re-plan → …'],
  ['Best for', 'Predictable, repeatable, multi-aspect work: code review checklists, document extraction, report generation', 'Open-ended investigation: debugging an unknown failure, "add comprehensive tests to a legacy codebase", research questions'],
  ['Strengths', 'Consistent, testable, cheap to evaluate, easy to parallelize per item', 'Handles unknown structure; spends effort where the findings point'],
  ['Weaknesses', 'Cannot react to surprises; wasted steps when an aspect does not apply', 'Less predictable cost and path; needs budgets, visibility and a stopping condition'],
  ['Anthropic pattern names', 'Prompt chaining, parallelization (sectioning)', 'Orchestrator-workers; evaluator-optimizer loops inside steps']
])}
${H.box('rule', 'Selection rule from the exam guide:', 'prompt chaining for <b>predictable multi-aspect reviews</b>; dynamic decomposition for <b>open-ended investigation tasks</b>. If you can write the step list before seeing the input, chain it. If the right next step depends on what the last step found, let the plan adapt.')}

<h3>Prompt chaining for reviews: per-file local passes plus a cross-file integration pass</h3>
<p>A single pass over many files spreads attention thinly. The exam guide's sample question describes the signature: a PR touching 14 files in a stock tracking module gets detailed feedback on some files and superficial comments on others, misses obvious bugs, and flags a pattern in one file while approving identical code in another. The root cause is <b>attention dilution</b>. The fix is structural.</p>
${D({ w: 760, h: 260, title: 'Two-stage review chain',
  nodes: [
    { id: 'pr', x: 20, y: 100, w: 130, h: 56, label: 'PR: 14 files', sub: 'diff + standards', kind: 'store' },
    { id: 'f1', x: 200, y: 20, w: 170, h: 44, label: 'Local pass: file 1', sub: 'bugs, logic, style', kind: 'sub' },
    { id: 'f2', x: 200, y: 80, w: 170, h: 44, label: 'Local pass: file 2', sub: 'same criteria, same schema', kind: 'sub' },
    { id: 'fn', x: 200, y: 140, w: 170, h: 44, label: 'Local pass: file 14', sub: 'one file per call', kind: 'sub' },
    { id: 'g', x: 410, y: 80, w: 110, h: 44, label: 'Gate', sub: 'schema-valid?', kind: 'tool' },
    { id: 'ip', x: 560, y: 60, w: 180, h: 56, label: 'Integration pass', sub: 'cross-file data flow', kind: 'agent' },
    { id: 'mg', x: 560, y: 170, w: 180, h: 56, label: 'Merge in code', sub: 'dedupe, rank, post', kind: 'good' }
  ],
  edges: [{ from: 'pr', to: 'f1' }, { from: 'pr', to: 'f2' }, { from: 'pr', to: 'fn' }, { from: 'f1', to: 'g' }, { from: 'f2', to: 'g' }, { from: 'fn', to: 'g' }, { from: 'g', to: 'ip', label: 'summaries' }, { from: 'ip', to: 'mg' }, { from: 'g', to: 'mg', dashed: true, label: 'local findings' }],
  caption: 'Each local pass gets the full attention budget for one file, so depth is consistent and identical code gets identical judgments. The integration pass sees compact per-file summaries (interfaces, changed signatures, data flow) and looks only for cross-file issues.' })}
<pre class="code">// Orchestration in code (Client SDK or claude -p per stage)
const local = await Promise.all(
  changedFiles.map((f) =&gt; reviewFile({ file: f, diff: diffFor(f), standards }))   // independent: run in parallel
);
for (const r of local) {                                   // gate between stages
  if (!isValidFindings(r) || r.stop_reason === "max_tokens") throw new Error("local pass failed: " + r.file);
}
const integration = await reviewIntegration({
  perFile: local.map((r) =&gt; ({ file: r.file, exports: r.exports, changedSignatures: r.changedSignatures, calls: r.calls })),
  focus: "cross-file data flow, contract mismatches, inconsistent handling of the same pattern",
});
const report = mergeAndDedupe(local.flatMap((r) =&gt; r.findings), integration.findings);</pre>
${H.table(['Option in the 14-file question', 'Verdict', 'Why'], [
  ['Split into per-file local passes plus a separate integration pass', '<b>Correct</b>', 'Fixes the root cause (attention dilution); consistent depth per file; cross-file issues still caught'],
  ['Require developers to split PRs into 3–4 files', 'Wrong', 'Shifts the burden to people and does not improve the system'],
  ['Bigger model / larger context window, one pass', 'Wrong', 'A larger window does not fix attention quality across many files'],
  ['Three full-PR passes, flag only issues found in two of three', 'Wrong', 'Consensus suppresses real bugs that are caught intermittently']
])}
<p>Multi-aspect chaining works the same way: when every review must cover security, correctness and API compatibility, run each aspect as its own focused step with its own criteria and output schema, then merge. Every run follows the same path, so results are comparable across PRs and each step can be evaluated on its own.</p>

<h3>Dynamic decomposition for open-ended tasks</h3>
<p>"Add comprehensive tests to a legacy codebase" has no step list you could write in advance: you do not know the module boundaries, which code is dead, where the risk is, or what makes code testable. The guide's sequence:</p>
<ol class="steps">
<li><b>Map the structure.</b> Explore with Glob / Grep / Read (or an Explore subagent so the main context stays clean): modules, entry points, existing tests and fixtures, build and test commands.</li>
<li><b>Identify high-impact areas.</b> Rank by business criticality (payments, auth), change frequency, defect history, and absence of coverage. Prefer tests that would catch real regressions over line-coverage quotas.</li>
<li><b>Create a prioritized plan</b> and write it down (a plan file or task list), with a done condition per item ("characterization tests for <code>pricing/</code> pass on current behavior").</li>
<li><b>Execute item by item and adapt.</b> Discoveries change the plan: a hidden dependency on a live database means building a fake first; a module turns out to be dead code and drops off; a tangled class needs a seam before it can be tested.</li></ol>
<pre class="code">// test-plan.json after two iterations (the plan is data, and it changes)
{
  "goal": "Regression safety net for billing and auth before the framework upgrade",
  "items": [
    { "id": "T1", "area": "billing/pricing", "priority": 1, "status": "done",    "note": "characterization tests, 41 cases" },
    { "id": "T0", "area": "test infra: fake payment gateway", "priority": 1, "status": "in_progress",
      "added_because": "T2 discovered billing/invoice calls the live gateway" },
    { "id": "T2", "area": "billing/invoice", "priority": 2, "status": "blocked", "blocked_by": "T0" },
    { "id": "T3", "area": "auth/session", "priority": 2, "status": "pending" },
    { "id": "T4", "area": "legacy/reports_v1", "priority": null, "status": "dropped", "note": "no callers; dead code" }
  ]
}</pre>
${H.box('rule', 'What makes adaptive decomposition work:', 'the plan is explicit and persisted (not just in the agent\'s head), every item has a checkable done condition, new subtasks record why they were added, and the coordinator keeps visibility and control while workers adapt inside their items.')}

<h3>Hybrid: dependency-aware decomposition</h3>
<p>Many real tasks are neither fully fixed nor fully open. Resolve the <b>gating fact</b> first, then fan out. Examples: determine which of three services owns the corrupted field before investigating all three; confirm which test framework and fixture strategy the repo uses before spawning per-module test writers; identify the migration target API version before converting 45+ files. Parallelizing before the gating fact is known produces duplicated or incompatible work.</p>
${D({ w: 760, h: 170, title: 'Resolve the gate, then fan out',
  nodes: [
    { id: 'q', x: 20, y: 55, w: 150, h: 56, label: 'Task', sub: 'migrate 45+ files', kind: 'human' },
    { id: 'g', x: 210, y: 55, w: 170, h: 56, label: 'Gating step (serial)', sub: 'target API + pattern', kind: 'agent' },
    { id: 'w1', x: 430, y: 10, w: 150, h: 40, label: 'Worker: batch A', kind: 'sub' },
    { id: 'w2', x: 430, y: 63, w: 150, h: 40, label: 'Worker: batch B', kind: 'sub' },
    { id: 'w3', x: 430, y: 116, w: 150, h: 40, label: 'Worker: batch C', kind: 'sub' },
    { id: 'v', x: 620, y: 55, w: 120, h: 56, label: 'Verify', sub: 'build + tests', kind: 'good' }
  ],
  edges: [{ from: 'q', to: 'g' }, { from: 'g', to: 'w1' }, { from: 'g', to: 'w2' }, { from: 'g', to: 'w3' }, { from: 'w1', to: 'v' }, { from: 'w2', to: 'v' }, { from: 'w3', to: 'v' }],
  caption: 'Serial where there is a dependency, parallel where there is not. Each worker receives the resolved pattern in its prompt, so outputs are consistent.' })}

<h3>Selection table</h3>
${H.table(['If the situation is…', 'Choose', 'Because', 'You give up'], [
  ['Same review aspects every time; many files', 'Prompt chain: per-file local passes + integration pass', 'Consistent depth, comparable results, parallel local passes', 'Adaptivity to unusual PRs'],
  ['Document extraction with fixed stages (classify → extract → validate)', 'Prompt chain with gates', 'Each stage testable; failures stop early', 'Flexibility for novel document types'],
  ['Unknown root cause, unfamiliar codebase, research question', 'Dynamic decomposition (explore → plan → adapt)', 'Next step depends on findings', 'Predictable cost and path; needs budgets'],
  ['One fact determines how the rest should be done', 'Hybrid: gating step first, then fan out', 'Prevents duplicated or incompatible parallel work', 'Some wall-clock time on the serial step'],
  ['Many independent items (hundreds of files, documents)', 'Fan-out: <code>claude -p</code> loop, <code>/batch</code>, Workflow tool for dozens to hundreds of agents', 'Scales, isolates failures per item', 'Cross-item reasoning (add an integration pass)'],
  ['Tightly coupled change (most coding)', 'One agent, sequential, with plan and verification', 'Multi-agent overhead (~15x tokens) buys little on coupled work', 'Parallel speed'],
  ['Simple, well-scoped fix', 'Direct execution', 'Decomposition overhead exceeds the task', 'Nothing meaningful']
])}

<h3>Gates between stages</h3>
<ul>
<li><b>Programmatic checks</b> between steps: schema validity, <code>stop_reason</code> not <code>"max_tokens"</code>, required fields present, build and tests pass. A failed gate stops the chain or retries that stage with the specific error, rather than feeding bad output forward.</li>
<li><b>Human gates</b> where risk or approval requires it: approve the plan before execution, approve before anything irreversible.</li>
<li><b>Verification</b> at the end by a fresh context (independent reviewer or verification subagent), since the generator is biased toward its own output.</li></ul>

<h3>Relation to plan mode and multi-phase workflows (see 3.4)</h3>
${H.table(['Scope and risk', 'Architecture', 'Decomposition role'], [
  ['Clear, local, low risk (known bug, one file)', 'Direct execution plus existing tests', 'None needed'],
  ['Many files, several valid approaches, unclear structure', 'Plan mode (explore and plan without edits), then execute', 'Plan mode is the "map and plan" phase of adaptive decomposition'],
  ['Needs human approval, production impact, or independent review', 'Multi-phase: plan → approve → execute → independent review', 'Gates between phases are explicit and owned by people or code']
])}
<p>Claude Code's recommended workflow (explore → plan → implement → commit) is the same idea at the level of one session. The interview pattern (Claude interviews you, writes a spec, then a fresh session implements it) decomposes requirements from implementation.</p>

<h3>Long-running work: harness patterns</h3>
${H.table(['Technique', 'What it does', 'Failure it prevents'], [
  ['Initializer session', 'Creates the setup script, a <b>feature list</b>, a progress file and an initial git commit', 'Each later session rediscovering the project'],
  ['One feature per session', 'Each coding session takes the next item, implements and tests it, and leaves a clean, committed state', '<b>One-shotting</b> everything and leaving half-finished work'],
  ['Progress file (for example <code>claude-progress.txt</code>) plus git history', 'Next session reads what was done and what is next', 'Losing state across context windows'],
  ['Structured test tracking (for example <code>tests.json</code>)', 'Done means tests pass, not "looks finished"', 'A later agent <b>declaring the project done prematurely</b>'],
  ['Fresh window plus progress files', 'Often more reliable than compacting a long session', 'Compaction losing specifics']
])}

${H.box('real', 'Real-world notes:', '<ul><li><b>Cost:</b> fixed chains have predictable token budgets per item; adaptive plans need <code>maxTurns</code> / <code>maxBudgetUsd</code> and a written stopping condition. Scale effort to complexity (Anthropic\'s research system: a simple fact needs one agent and 3–10 tool calls; comparisons 2–4 subagents; complex research more than 10).</li><li><b>Evaluation:</b> a chain lets you eval each stage separately and localize regressions. For adaptive systems, grade outcomes (tests pass, bug fixed) and read transcripts to see whether the plan adapted sensibly.</li><li><b>Observability:</b> persist the plan and its revisions; "why was T0 added" is the question you will ask during an incident.</li><li><b>Boundaries:</b> give each worker an objective, output format, tool guidance and explicit boundaries, or parallel workers duplicate and leave gaps.</li></ul>')}

${H.box('trap', 'Distractors and why they fail:', '<ul><li><b>"Bigger context window / better model, single pass"</b> for inconsistent multi-file reviews: attention dilution is not a capacity problem.</li><li><b>"Consensus of several full passes"</b>: suppresses intermittent true positives.</li><li><b>"Make developers split the PR"</b>: moves the burden, fixes nothing.</li><li><b>A fixed pipeline for open-ended investigation</b>: steps chosen before the facts waste effort and miss what the exploration would reveal.</li><li><b>"Write tests for every file to hit 80% coverage"</b>: rewards trivial tests; the guide wants mapping and prioritization by impact.</li><li><b>Fanning out before the gating fact is known</b>: duplicated or incompatible work.</li><li><b>Plan held only in context</b>: lost at compaction or crash; persist it.</li></ul>')}

<h3>Worked scenario</h3>
<p>A team asks an agent to "add comprehensive tests" to a 200k-line legacy monolith before a framework upgrade. The first attempt ran one long session that wrote tests file by file in alphabetical order; after a day it had many trivial tests in utility modules, nothing in billing, and it compacted twice, losing track of what was covered.</p>
<ol class="steps">
<li>This is open-ended, so use <b>dynamic decomposition</b>, not a fixed per-file chain.</li>
<li>Start in plan mode or with an Explore subagent: map modules, entry points, test infrastructure and change hotspots.</li>
<li>Rank areas by risk for the upgrade (billing, auth, data access first) and write <code>test-plan.json</code> with done conditions.</li>
<li>Resolve the gating fact first: how to isolate external dependencies (fakes for the payment gateway and database). That becomes item T0.</li>
<li>Execute one plan item per session, commit, update the progress file and plan; add or drop items as discoveries happen.</li>
<li>Gate each item on tests passing; finish with an independent review of the test suite's quality.</li></ol>

${H.check([
  ['Every PR must be reviewed for security, correctness and API compatibility with the same criteria. Chain or adaptive plan?', 'A fixed chain: the aspects are known in advance, so run focused steps with their own criteria and schemas, then merge. Results are consistent and each step is testable.'],
  ['A 14-file PR review gives deep comments on some files, shallow on others, and contradictory judgments on identical code. What is the root cause and fix?', 'Attention dilution from a single pass over many files. Split into per-file local passes plus a separate cross-file integration pass. A larger context window or consensus voting does not fix it.'],
  ['Why is "map structure, then prioritize" better than "write tests for every file" for a legacy codebase?', 'Effort goes to high-impact, high-risk areas; discoveries (hidden dependencies, dead code) reshape the plan; coverage-driven file order produces trivial tests where they matter least.'],
  ['You need to investigate data corruption that could come from any of three services. You plan three parallel investigators. What do you do first?', 'Resolve the gating fact (which service writes the corrupted field, from logs or schema ownership) serially, then investigate the owning path in depth. Parallel investigation before that duplicates effort.'],
  ['A long-running coding agent keeps declaring the project finished while features are missing. Which harness changes help?', 'A feature list and structured test tracking as the definition of done, one feature per session with a clean commit, and a progress file read at the start of each session. A Stop hook can also gate completion on tests.']
])}
${H.src([['Building effective agents', 'https://www.anthropic.com/engineering/building-effective-agents'], ['Effective harnesses for long-running agents', 'https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents'], ['Multi-agent research system', 'https://www.anthropic.com/engineering/multi-agent-research-system'], ['Claude Code best practices', 'https://code.claude.com/docs/en/best-practices']])}`;
    }
  });

  /* ------------------------------------------------------------------ 1.7 */
  CCAR.lessons.push({
    id: 'hb-17-sessions', track: 'handbook', part: 'P1', num: '1.7', order: 107, domain: 'D1',
    objs: ['O02', 'O09'], ts: ['1.7'], minutes: 30,
    title: 'Session state, resumption and forking',
    summary: 'Naming, resuming, continuing and forking sessions in Claude Code and the Agent SDK, telling a resumed session what changed, when a fresh session with a structured summary beats resuming, CI pitfalls, subagent resume, and manifest-based state for pipelines.',
    body: function () {
      return `
<p>A session is the persisted conversation of an agent run: every prompt, assistant turn, tool call and tool result. Resuming a session restores that full context so work continues where it stopped; forking copies it into a new, independent branch. This is powerful and risky in the same way: the restored context includes <b>tool results that may no longer be true</b>. The exam probes four skills: resuming named sessions, forking from a shared baseline, informing a resumed session about changed files, and choosing between resuming and starting fresh with a structured summary. For multi-agent pipelines, the durable answer is state outside the conversation (O09).</p>

<h3>Session controls</h3>
${H.table(['Goal', 'Claude Code CLI', 'Agent SDK'], [
  ['Name a session so you can find it later', '<code>claude -n auth-refactor</code> (<code>--name</code>)', 'Store the <code>session_id</code> under your own name or key (ticket, user, job)'],
  ['Resume a specific session', '<code>claude --resume auth-refactor</code> (name or ID)', '<code>resume: sessionId</code> (TS) / <code>resume=session_id</code> (Python)'],
  ['Continue the most recent session in this directory', '<code>claude --continue</code> (<code>-c</code>)', 'Resume by the ID you captured; do not rely on "most recent" in services'],
  ['Branch from an existing session', '<code>claude --resume auth-refactor --fork-session</code> (also with <code>--continue</code>): new session ID, shared history', '<code>forkSession: true</code> (TS) / <code>fork_session=True</code> (Python) together with resume'],
  ['Non-interactive run that continues a session', '<code>claude -p "…" --resume &lt;id&gt;</code>', 'Same options on <code>query()</code>'],
  ['Do not persist the session at all', '<code>--no-session-persistence</code> (print mode)', 'Session store configuration'],
  ['Stateless or serverless host', 'Not applicable', 'A <b>session store</b> adapter keeps sessions outside the local disk so any worker can resume']
])}

<h3>Capturing and reusing session IDs in the SDK</h3>
<pre class="code">// TypeScript, Agent SDK
import { query } from "@anthropic-ai/claude-agent-sdk";

let baselineId;
for await (const msg of query({ prompt: "Map the auth module: entry points, token flow, test gaps.", options })) {
  if (msg.type === "result") baselineId = msg.session_id;      // also present on the init system message
}
await saveSession("auth-investigation", baselineId);             // your own name → id mapping

// Next day: resume the same investigation
for await (const msg of query({
  prompt: "Continue: propose the token refresh fix.",
  options: { ...options, resume: await loadSession("auth-investigation") },
})) { /* … */ }

// Explore two approaches from the same baseline without touching it
const branchA = query({ prompt: "Strategy A: integration tests against a local auth server.",
  options: { ...options, resume: baselineId, forkSession: true } });
const branchB = query({ prompt: "Strategy B: contract tests with mocked token service.",
  options: { ...options, resume: baselineId, forkSession: true } });</pre>
<p class="small muted">Iterate each stream to completion and capture each fork's own <code>session_id</code> from its result message; the forks get new IDs and the baseline stays unchanged.</p>

<h3>Forking from a shared analysis baseline</h3>
${D({ w: 760, h: 230, title: 'fork_session: divergent branches, one baseline',
  nodes: [
    { id: 'b', x: 20, y: 85, w: 190, h: 60, label: 'Baseline session', sub: 'codebase analysis (expensive)', kind: 'agent' },
    { id: 'a', x: 290, y: 20, w: 200, h: 56, label: 'Fork A (new session ID)', sub: 'refactor: extract service', kind: 'sub' },
    { id: 'c', x: 290, y: 150, w: 200, h: 56, label: 'Fork B (new session ID)', sub: 'refactor: strangler adapter', kind: 'sub' },
    { id: 'cmp', x: 570, y: 85, w: 170, h: 60, label: 'Compare outcomes', sub: 'tests, diff size, risk', kind: 'human' }
  ],
  edges: [{ from: 'b', to: 'a', label: 'fork' }, { from: 'b', to: 'c', label: 'fork' }, { from: 'a', to: 'cmp' }, { from: 'c', to: 'cmp' }],
  caption: 'Both forks inherit the full baseline context, so neither repeats the analysis, and neither contaminates the other. Use git worktrees or separate branches if both forks edit files.' })}
${H.table(['Use a fork when', 'Do not use a fork when'], [
  ['Comparing two testing strategies or refactoring approaches from one codebase analysis', 'You need an <b>independent reviewer</b>: a fork inherits the generator\'s reasoning and bias; use a fresh session with only the artifact'],
  ['Trying a risky direction while keeping the original session clean', 'The baseline\'s tool results are stale: forking copies stale context twice'],
  ['Handing a copy of a rich investigation to a teammate or a different task', 'The branch only needs a few facts: a fresh session with a summary is cheaper']
])}

<h3>Resuming after code changes: tell the session what changed</h3>
<p>A resumed session's history contains the file contents Claude read yesterday. It has no way to know that four of the 34 files it analyzed were modified overnight, so it will reason from the old reads. Re-exploring everything wastes the value of resuming. The right move is <b>targeted re-analysis</b>: name the changed files and what to update.</p>
<pre class="code">claude --resume payments-investigation

Since our last session these files changed (commit a1b2c3d):
- src/payments/retry.ts: backoff rewritten, max attempts now configurable
- src/payments/gateway.ts: new timeout handling
- test/payments/retry.test.ts: 6 new cases
- config/payments.yaml: new keys retry.max_attempts, retry.base_ms
Re-read only these files. Update your findings on the duplicate-charge root cause
and tell me which earlier conclusions no longer hold. Everything else is unchanged.</pre>
<p>A <code>git diff --stat</code> or the list of changed paths since the session's last commit is an easy, reliable source for that message. A SessionStart hook can inject it automatically.</p>

<h3>Resume, or start fresh with a structured summary?</h3>
${H.table(['Situation', 'Choose', 'Why'], [
  ['Prior context mostly valid; a few known files changed', '<b>Resume</b> + list the changed files', 'Keeps the expensive analysis; targeted re-reads fix the stale parts'],
  ['Most tool results are stale (large refactor merged, data refreshed, days of drift)', '<b>Fresh session + injected structured summary</b>', 'Stale results in context compete with new reads; Claude may trust the old ones'],
  ['Session is long, compacted several times, or wandered through failed attempts', '<b>Fresh + summary</b>', 'Failed paths and lossy summaries dilute attention; a clean context performs better'],
  ['Two alternative approaches from one baseline', '<b>Fork</b>', 'Shared starting point, independent branches'],
  ['Independent review of generated work', '<b>Fresh session</b> with only the artifact and criteria', 'No inherited reasoning or bias'],
  ['CI job on an ephemeral runner', '<b>Fresh</b> + prior findings passed in the prompt (or a session store)', 'The previous runner\'s local sessions are gone']
])}
<pre class="code">&lt;investigation_summary as_of="2026-09-28" commit="9f8e7d6"&gt;
Goal: find the cause of duplicate charges on retried payments.
Established (verified against code at 9f8e7d6):
  - retry.ts retries on HTTP 502 without an idempotency key (retry.ts, sendCharge)
  - gateway.ts treats timeouts as failures although the charge may have succeeded
Ruled out: webhook double-delivery (dedupe table confirmed working)
Open questions: does the new configurable backoff (merged since) change retry timing?
Files to re-read first: src/payments/retry.ts, src/payments/gateway.ts
&lt;/investigation_summary&gt;</pre>
${H.box('rule', 'Why fresh-with-summary is often more reliable:', 'a summary carries <b>conclusions with their evidence and date</b>, not raw tool output that silently went stale. It is short, so it does not dilute attention, and it says explicitly what must be re-verified.')}

<h3>Subagents and sessions</h3>
<ul>
<li>A custom subagent's work can be resumed through the parent session plus the subagent's <code>agentId</code>, so a long-running specialist can continue instead of starting over.</li>
<li>The built-in Explore and Plan agents are one-shot: they return a result and have no <code>agentId</code> to resume.</li>
<li>Non-fork subagents never inherit the parent conversation. Anything they need from a resumed session must be passed in their prompt.</li></ul>

<h3>Pipelines: state belongs outside the conversation (O09)</h3>
<p>For multi-agent pipelines that run for hours, a session transcript is not a recovery mechanism: in-flight subagent results are not in it, it is bloated and it may be stale. Persist <b>structured state</b> that a restarted coordinator can load: a manifest plus artifacts on disk or in a database.</p>
<pre class="code">// manifest.json (one entry per unit of work)
{
  "run_id": "audit-2026-09-29",
  "items": [
    { "id": "t1", "scope": "src/billing/**", "status": "complete",    "artifact": "findings/t1.json",
      "input_hash": "sha256:4c1…", "attempts": 1 },
    { "id": "t2", "scope": "src/auth/**",    "status": "in_progress", "artifact": "findings/t2.json",
      "input_hash": "sha256:9ab…", "attempts": 2, "batch_id": "msgbatch_…", "custom_id": "t2-auth" },
    { "id": "t3", "scope": "src/reports/**", "status": "pending" }
  ]
}</pre>
${H.table(['Manifest field', 'Prevents'], [
  ['Per-item <b>status</b>: pending / in_progress / complete / failed', 'Repeating finished work; a single "last batch" counter cannot represent partial failure'],
  ['Exact delegated <b>scope</b> (paths, query, instructions)', 'A re-dispatched item doing different work than the original'],
  ['<b>Artifact</b> path', 'Findings that exist only in a dead process\'s context'],
  ['<b>Input version</b> (content hash, commit SHA)', 'Trusting findings for inputs that changed mid-run'],
  ['<b>External IDs</b> (batch_id, custom_id, refund or ticket IDs, idempotency keys)', 'Paying twice for batches, duplicate refunds or tickets after a restart'],
  ['Attempts and last error', 'Infinite retry loops; supports routing to a human after N failures']
])}
<ul>
<li><b>Resume algorithm:</b> load the manifest; skip <code>complete</code>; re-dispatch <code>in_progress</code>, <code>pending</code> and retryable <code>failed</code> items with their recorded scope; inject completed artifacts into downstream prompts.</li>
<li><b>Atomic writes:</b> write the artifact to a temporary file and rename it into place, then flip status to <code>complete</code>. Never merge an <code>in_progress</code> artifact: it may be half-written.</li>
<li><b>Idempotent side effects:</b> derive external IDs deterministically from the item (for example <code>custom_id = run_id + item id</code>, refund idempotency key = case ID) so a replayed step cannot act twice.</li></ul>
${H.box('trap', 'Resume bug the exam likes:', '<code>todo = items where status == "pending"</code> and <code>done = items where findings exist</code>. An <code>in_progress</code> item with a partial file is neither re-queued nor excluded, so partial output gets merged as final. Merge only <code>complete</code>; re-run everything else.')}

<h3>Checkpoints and rewind vs sessions</h3>
${H.table(['', 'Checkpoints / rewind (Claude Code)', 'Sessions (resume / fork)'], [
  ['What it is', 'Snapshots of files before each change Claude makes, within a session', 'The persisted conversation of a run'],
  ['How', '<kbd>Esc</kbd> <kbd>Esc</kbd> or <code>/rewind</code>: restore conversation, code or both; or summarize from a point', '<code>--resume</code>, <code>--continue</code>, <code>--fork-session</code>; SDK <code>resume</code> / <code>forkSession</code>'],
  ['Use for', 'Undo a wrong turn quickly and try again', 'Continue work later, or branch to compare approaches'],
  ['Limits', 'Covers Claude\'s file edits, not external side effects (deployed services, database writes, pushed commits); not a replacement for git', 'Restores context, including stale tool results; does not restore the outside world']
])}

${H.box('exam', 'Exam vs current docs:', 'The guide says <code>fork_session</code>. Current docs: <code>--fork-session</code> on the CLI (with <code>--resume</code> or <code>--continue</code>), <code>forkSession</code> in the TypeScript SDK, <code>fork_session</code> in the Python SDK. All mean "new session ID, copied history, original untouched". The guide\'s <code>--resume &lt;session-name&gt;</code> matches current CLI behavior, where names come from <code>-n</code> / <code>--name</code>.')}

${H.box('real', 'Real-world notes:', '<ul><li><b>Where sessions live:</b> locally on the machine that ran them unless you configure a session store. Services and serverless workers need the store, keyed by your own identifiers.</li><li><b>Data handling:</b> session transcripts contain tool results, which can include customer PII and secrets read from files. Apply retention and access controls; use <code>--no-session-persistence</code> for jobs that must not keep transcripts.</li><li><b>Cost:</b> a resumed session re-sends its history. Prompt caching softens repeated prefixes, but a bloated session costs more on every turn than a fresh one with a 500-token summary.</li><li><b>Observability:</b> log session IDs with job IDs, so an incident can be traced to the exact transcript and the forks derived from it.</li></ul>')}

${H.box('trap', 'Distractors and why they fail:', '<ul><li><b>"<code>--continue</code> in the CI job to pick up the last review"</b>: an ephemeral runner has no previous session; pass prior findings explicitly.</li><li><b>"Resume and let Claude re-explore the whole codebase"</b>: wastes the resumed context; name the changed files for targeted re-analysis.</li><li><b>"Resume the session although most files were rewritten"</b>: stale tool results; start fresh with a structured summary.</li><li><b>"Fork the session to get an unbiased review"</b>: forks inherit the reasoning they should be checking.</li><li><b>"Resume the coordinator transcript after a crash"</b>: use the manifest and artifacts.</li><li><b>"Use /rewind to undo a deployment"</b>: checkpoints cover file edits, not external effects.</li></ul>')}

<h3>Worked scenario</h3>
<p>On Monday a developer ran a long investigation named <code>inventory-sync</code> that analyzed 34 files and identified two race conditions. On Tuesday a teammate merged fixes touching 4 of those files. The developer wants to (a) continue the investigation and (b) compare two approaches for the remaining race: optimistic locking versus a queue.</p>
<ol class="steps">
<li>Prior context is mostly valid (30 of 34 files unchanged), so <b>resume</b>: <code>claude --resume inventory-sync</code>.</li>
<li>First message: list the 4 changed files with a one-line note each, ask Claude to re-read only those and state which conclusions changed.</li>
<li>Once the baseline is updated, <b>fork twice</b> (<code>--fork-session</code>), one per approach, each in its own worktree, and compare test results and diff size.</li>
<li>If the merge had rewritten most of the module, the answer would change: start a fresh session with a structured summary of verified conclusions and the files to re-read.</li></ol>

${H.check([
  ['You resume a named session after a teammate changed 3 of the 20 files it analyzed. What should your first message contain, and why?', 'The specific changed files and what changed, with a request to re-read only those and revise affected conclusions. The history holds the old reads; without being told, Claude reasons on stale content, and full re-exploration wastes the resumed context.'],
  ['When is starting a fresh session with a structured summary better than resuming?', 'When most prior tool results are stale, or the session is long, repeatedly compacted or full of failed attempts. A summary carries dated, verified conclusions without stale raw output.'],
  ['You want to compare two refactoring approaches without repeating a 40-minute codebase analysis. How?', 'Fork the analysis session twice (<code>--fork-session</code> / <code>forkSession</code> / <code>fork_session</code>): each branch gets a new session ID and the full baseline, and the baseline stays unchanged.'],
  ['A CI review job uses <code>claude -p --continue</code> to build on the previous run\'s findings, but it always starts from scratch. Why, and what is the fix?', 'Each run gets a fresh runner with no local sessions, so there is nothing to continue. Pass prior findings (with status) in the prompt from a stored artifact, or use a session store.'],
  ['A pipeline crashed with items in states complete, in_progress and pending. What does the restarted coordinator do?', 'Load the manifest, skip complete items, re-dispatch in_progress and pending items with their recorded scope, merge only complete artifacts (written atomically), and reuse deterministic external IDs so no side effect repeats.'],
  ['Can /rewind replace git or undo a database migration Claude ran?', 'No. Checkpoints snapshot files Claude edits within a session. External side effects are not reverted, and checkpoints are not version control.']
])}
${H.src([['Agent SDK: sessions', 'https://code.claude.com/docs/en/agent-sdk/sessions'], ['Claude Code CLI reference', 'https://code.claude.com/docs/en/cli-reference'], ['Claude Code best practices', 'https://code.claude.com/docs/en/best-practices'], ['Multi-agent research system', 'https://www.anthropic.com/engineering/multi-agent-research-system']])}`;
    }
  });
})();
