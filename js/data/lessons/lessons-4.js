/* Remaining lessons: agentic loop + hooks + escalation, tools & MCP, context management, exam strategy. */
(function () {
  var D = function (spec) { return CCAR.charts.diagram(spec); };
  CCAR.lessons = CCAR.lessons || [];

  CCAR.lessons.push({
    id: 'loop-hooks-escalation', domain: 'D1', objs: ['X01', 'X02', 'X03', 'X05'], minutes: 22,
    title: 'Agentic loop, programmatic enforcement, hooks, and escalation',
    summary: 'stop_reason control flow, deterministic gates vs prompts, PreToolUse/PostToolUse, when to escalate.',
    body: function () {
      return '' +
      D({ w: 760, h: 220, title: 'The agentic loop',
        nodes: [
          { id: 'm', x: 20, y: 80, w: 150, h: 56, label: 'messages[]', sub: 'full history', kind: 'store' },
          { id: 'api', x: 230, y: 80, w: 160, h: 56, label: 'messages.create', sub: 'tools, system', kind: 'agent' },
          { id: 'sr', x: 450, y: 80, w: 150, h: 56, label: 'stop_reason?', kind: 'tool' },
          { id: 'run', x: 450, y: 170, w: 150, h: 42, label: 'run tools', sub: '"tool_use"', kind: 'sub' },
          { id: 'end', x: 640, y: 80, w: 110, h: 56, label: 'done', sub: '"end_turn"', kind: 'good' }
        ],
        edges: [{ from: 'm', to: 'api' }, { from: 'api', to: 'sr' }, { from: 'sr', to: 'end' }, { from: 'sr', to: 'run' }, { from: 'run', to: 'm', label: 'all tool_results in ONE user msg', dy: 18 }] }) +
      '<ul><li>Continue while <code>stop_reason === "tool_use"</code>; stop on <code>"end_turn"</code>. Others: <code>max_tokens</code>, <code>stop_sequence</code>, <code>pause_turn</code>, <code>refusal</code>.</li>' +
      '<li><b>Anti-patterns:</b> stopping when the response "has text" (text can accompany tool_use blocks), parsing "anything else I can help with", iteration caps as the <i>primary</i> stop, sending each tool_result in its own message.</li>' +
      '<li>Model-driven decisions (Claude picks the next tool from context) vs pre-configured decision trees.</li></ul>' +
      '<h3>Deterministic vs probabilistic</h3><table class="tbl"><thead><tr><th>Requirement</th><th>Mechanism</th></tr></thead><tbody>' +
      '<tr><td>Identity verified before refund / PIN issuance</td><td><b>Programmatic prerequisite gate</b> on the downstream tool, keyed to the <i>right</i> prerequisite result (verify_identity for the same account and line, not just get_customer)</td></tr>' +
      '<tr><td>Refunds above $500 need a human</td><td><b>PreToolUse interception</b> → deny + redirect to escalate_to_human with a structured handoff</td></tr>' +
      '<tr><td>Cumulative cap per conversation ($150 total)</td><td>The hook must track the <b>running total</b>. A per-call check lets split credits through.</td></tr>' +
      '<tr><td>Heterogeneous dates (Unix, MM/DD, ISO), numeric status codes</td><td><b>PostToolUse</b> normalization before the model sees the results</td></tr></tbody></table>' +
      '<pre class="code">// Agent SDK PreToolUse callback\nhooks: { PreToolUse: [{ matcher: "mcp__shop__process_refund", hooks: [async (input) =&gt; {\n  if (input.tool_input.amount &gt; 500) return { hookSpecificOutput: {\n    hookEventName: "PreToolUse", permissionDecision: "deny",\n    permissionDecisionReason: "Over $500: call escalate_to_human with a case summary" } };\n  return {};\n}]}] }</pre>' +
      '<p>Claude Code command hooks: <b>exit code 2 blocks</b> PreToolUse and feeds stderr to Claude. On PostToolUse exit 2 shows stderr to Claude (the tool already ran). PostToolUse can replace output via <code>updatedToolOutput</code>.</p>' +
      '<h3>Escalation (X05)</h3><table class="tbl"><thead><tr><th>Escalate</th><th>Don\'t escalate. Instead:</th></tr></thead><tbody>' +
      '<tr><td>Customer <b>explicitly asks for a human</b>. Honor it immediately, without investigating first.</td><td>Frustrated but resolvable: acknowledge, offer the resolution, escalate only if they reiterate</td></tr>' +
      '<tr><td><b>Policy gap or exception</b> (competitor price match when policy covers own-site only; does a road closure count as a civil-authority order?)</td><td>Standard in-policy case (DOA with photos): resolve it to reach first-contact resolution targets</td></tr>' +
      '<tr><td><b>Unable to make progress</b></td><td>Multiple customer matches: ask for another identifier, don\'t guess</td></tr></tbody></table>' +
      '<div class="callout rule"><b>Structured handoff:</b> the human lacks the transcript, so include customer ID, root cause, amounts, what was tried, the recommended action, and any conflicting data marked as contested. Calibrate escalation with explicit criteria plus few-shot examples, not with sentiment or self-rated confidence.</div>';
    }
  });

  CCAR.lessons.push({
    id: 'tools-mcp', domain: 'D2', objs: ['O33', 'O36', 'O34', 'O35', 'O37', 'X04', 'O32', 'O17'], minutes: 28,
    title: 'Tool design, MCP integration, tool distribution, and built-in tools',
    summary: 'Includes your 50% (tool distribution) and 60% (codebase exploration) objectives.',
    body: function () {
      return '' +
      '<h3>Tool distribution (O33, 50% last time)</h3>' +
      D({ w: 760, h: 200, title: 'Scoped tools per role',
        nodes: [
          { id: 'c', x: 300, y: 10, w: 180, h: 50, label: 'Coordinator', sub: 'Task + catalog lookup', kind: 'agent' },
          { id: 'a', x: 20, y: 120, w: 220, h: 60, label: 'code-explorer', sub: 'Read · Grep · Glob', kind: 'sub' },
          { id: 'b', x: 270, y: 120, w: 220, h: 60, label: 'synthesizer', sub: 'Read · Write · verify_fact (scoped)', kind: 'sub' },
          { id: 'd', x: 520, y: 120, w: 220, h: 60, label: 'payments', sub: 'issue_claim_payment only here', kind: 'sub' }
        ], edges: [{ from: 'c', to: 'a' }, { from: 'c', to: 'b' }, { from: 'c', to: 'd' }] }) +
      '<ul><li>18 tools instead of 4–5 per agent <b>degrades selection</b>. Agents holding off-role tools <b>misuse them</b>: a synthesizer web-searching, an explainer "fixing" files, coverage issuing payments.</li>' +
      '<li>Give a <b>scoped cross-role tool</b> for the high-frequency need (verify_fact for 85% simple checks; a read-only get_past_due_balance), and route complex cases through the coordinator.</li>' +
      '<li>Replace generic tools with constrained ones (<code>fetch_url</code> → <code>load_document</code> that validates URLs).</li>' +
      '<li>Wrong: "all tools for flexibility", "prompt says never use X" (probabilistic), "log misuse afterwards", "merge agents into one with everything".</li></ul>' +
      '<h3>Tool descriptions (O36)</h3><ul><li>The primary selection signal. Include purpose, input formats, example queries, edge cases, and <b>when to use it vs the similar tool</b>.</li>' +
      '<li>Overlap (analyze_content vs analyze_document) causes misrouting: rename and split into purpose-specific tools.</li>' +
      '<li><b>Keyword-sensitive system prompt lines</b> ("always search the reports first", "when they say return, use create_return") can override good descriptions. Fix the prompt.</li></ul>' +
      '<h3>MCP (O34, O35)</h3><table class="tbl"><tbody>' +
      '<tr><td>Project scope</td><td><code>.mcp.json</code>, committed, team-shared; <code>claude mcp add --scope project</code></td></tr>' +
      '<tr><td>User scope</td><td>In <code>~/.claude.json</code>, personal, across projects (experiments)</td></tr>' +
      '<tr><td>Local scope (default for <code>claude mcp add</code>)</td><td>Private to you in this project, which is why "teammates don\'t see the server"</td></tr>' +
      '<tr><td>Secrets</td><td><code>"env": { "JIRA_TOKEN": "${JIRA_TOKEN}" }</code>. Never literal tokens (rotate any that leaked).</td></tr>' +
      '<tr><td>Discovery</td><td>Tools from all configured servers are available at once, named <code>mcp__server__tool</code></td></tr>' +
      '<tr><td>Resources vs tools</td><td><b>Resources</b> expose catalogs (docs hierarchy, schemas, service index) so the agent can see what exists without 25–40 exploratory list calls. <b>Tools</b> perform actions and targeted lookups.</td></tr>' +
      '<tr><td>Build vs reuse</td><td>Community servers for standard systems (Jira, GitHub); custom only for team-specific workflows</td></tr></tbody></table>' +
      '<h3>Structured MCP errors (X04)</h3><pre class="code">{ "isError": true, "content": [{ "type": "text", "text": "{\\"errorCategory\\":\\"transient\\",\n  \\"isRetryable\\":true, \\"retryAfterSec\\":30, \\"message\\":\\"Payment gateway timeout\\"}" }] }\n// business rule: errorCategory "business", isRetryable false, customer-safe reason\n// valid no-match: isError false, results [] (NOT a failure)</pre>' +
      '<p>The worst bug here: a timeout returned as "No charges found" (a success), so the agent confidently tells customers there\'s no duplicate charge.</p>' +
      '<h3>Built-in tools and exploration (O32, O17: 60% last time)</h3><table class="tbl"><tbody>' +
      '<tr><td><b>Grep</b></td><td>Search file <i>contents</i>: callers, error strings, imports</td></tr>' +
      '<tr><td><b>Glob</b></td><td>Match file <i>paths</i>: <code>**/*.test.tsx</code>, <code>services/**/*.proto</code></td></tr>' +
      '<tr><td><b>Read / Write</b></td><td>Full file; <b>Edit</b> needs a unique anchor. If it\'s not unique, widen the anchor or <b>Read + Write</b>. Never repo-wide sed, never blind retries.</td></tr>' +
      '<tr><td><b>Bash</b></td><td>Run commands (tests, builds), not a substitute for search</td></tr></tbody></table>' +
      '<ol class="steps"><li><b>Grep for the entry point</b> (the symbol, topic string, route).</li><li><b>Read</b> the hits and follow imports and calls outward.</li><li><b>Wrappers and re-exports:</b> read the wrapper, list every exported alias (<code>make_invoice</code>, <code>emb.embed_batch</code>, Spring bean alias), then Grep each name.</li><li>Record confirmed facts (file:line) in a <b>scratchpad</b>; delegate breadth to subagents.</li></ol>' +
      '<div class="callout trap"><b>Wrong exploration:</b> Glob <code>**/*.java</code> and read alphabetically; read by file size; <code>cat $(find …)</code>; a broad regex like "post" or "retry"; trusting stale Confluence pages; "Grep is exhaustive for the literal name".</div>';
    }
  });

  CCAR.lessons.push({
    id: 'context-management', domain: 'D5', objs: ['O21', 'O20'], minutes: 15,
    title: 'Context management: case facts, trimming, scratchpads, and position effects',
    summary: 'You scored 100% on these, so this is a quick refresher and a check that you still know why.',
    body: function () {
      return '' +
      '<table class="tbl"><thead><tr><th>Problem</th><th>Pattern</th></tr></thead><tbody>' +
      '<tr><td>Progressive summarization turned $214.37 and "Friday 14 June" into "about $200 in a few days"</td><td>Persistent <b>case-facts block</b> (amounts, dates, IDs, promises) sent with every prompt, outside the summarized history</td></tr>' +
      '<tr><td>58-field order lookups when 6 matter</td><td><b>Trim tool outputs</b> to relevant fields before they accumulate</td></tr>' +
      '<tr><td>Middle findings omitted from a long aggregated input</td><td>Put a <b>key-findings summary first</b>, with explicit section headers (lost in the middle)</td></tr>' +
      '<tr><td>Hours in: "typical patterns", contradicts earlier findings</td><td><b>Scratchpad file</b> of confirmed facts plus <b>subagent delegation</b>; <code>/compact</code> for verbose output</td></tr>' +
      '<tr><td>Multi-issue sessions</td><td>A separate structured layer per issue (order ID, amount, status)</td></tr>' +
      '<tr><td>Next phase of exploration</td><td>Summarize phase 1 findings and <b>inject them into the new subagents\' initial context</b></td></tr></tbody></table>' +
      '<div class="callout trap"><b>Always wrong here:</b> "switch to a bigger context window" (attention still dilutes); "summarize more often" (loses precision faster); "put investigation notes in the shared CLAUDE.md" (burdens the team); "restart and re-read everything" (repeats work, loses ruled-out hypotheses).</div>' +
      '<p>Project-root CLAUDE.md is re-injected after <code>/compact</code>. Instructions given only in conversation are not.</p>';
    }
  });

  CCAR.lessons.push({
    id: 'exam-strategy', domain: 'ALL', objs: [], minutes: 12,
    title: 'Exam strategy: how the distractors are built',
    summary: 'Recognize the recurring trap patterns so you can eliminate two options quickly.',
    body: function () {
      return '' +
      '<h3>Format</h3><ul><li>60 items, 120 minutes (2 min/item), 4 of 6 scenarios, multiple choice and multiple response (the item states how many to pick). Scaled 100–1000, pass 720. Your last score was 656, which is about 5–6 more correct answers short.</li>' +
      '<li>Budget: first pass at about 90s/item, flag anything over 2 min, keep 15 min for flagged items.</li></ul>' +
      '<h3>The 12 trap patterns (eliminate these first)</h3><table class="tbl"><thead><tr><th>#</th><th>Pattern</th><th>Right instinct</th></tr></thead><tbody>' +
      '<tr><td>1</td><td>Prompt, CLAUDE.md or few-shot for a <b>must-always</b> rule</td><td>Hook, gate, or permission deny</td></tr>' +
      '<tr><td>2</td><td>Heavy infrastructure (classifier, routing layer) as the <b>first step</b></td><td>Fix descriptions, criteria or examples first</td></tr>' +
      '<tr><td>3</td><td>Fixing the downstream agent when the <b>coordinator</b> decomposed badly</td><td>Fix at the layer the logs point to</td></tr>' +
      '<tr><td>4</td><td>Bigger model / context window / max_tokens</td><td>Split, scope, or structure instead</td></tr>' +
      '<tr><td>5</td><td>Self-reported confidence or sentiment as a routing signal</td><td>Calibrated field confidence, explicit criteria</td></tr>' +
      '<tr><td>6</td><td>Majority voting across runs</td><td>Suppresses intermittent true positives</td></tr>' +
      '<tr><td>7</td><td>Silent suppression (empty = success) or killing the whole run</td><td>Structured errors, partial results, coverage notes</td></tr>' +
      '<tr><td>8</td><td>"Give it all the tools for flexibility"</td><td>Least privilege plus a scoped cross-role tool</td></tr>' +
      '<tr><td>9</td><td>Batch API for anything someone is waiting on</td><td>Sync for blocking; batch for overnight</td></tr>' +
      '<tr><td>10</td><td>User-level config for a team need (or committed config for a personal one)</td><td>Project scope for the team</td></tr>' +
      '<tr><td>11</td><td>Non-existent flags and files (<code>--batch</code>, <code>CLAUDE_HEADLESS</code>, <code>.claude/config.json</code>, <code>--max-cost</code>, <code>alwaysApply</code>)</td><td>Know the real ones</td></tr>' +
      '<tr><td>12</td><td>Averaging or picking one of two conflicting credible values</td><td>Preserve both with attribution; flag the conflict</td></tr></tbody></table>' +
      '<h3>Reading the stem</h3><ul><li>"<b>Most effective first step</b>" usually means the proportionate, root-cause fix, not the most powerful one.</li><li>"<b>Guarantee</b>", "must never", "financial", "compliance" point to deterministic mechanisms.</li><li>Logs in the stem name the root cause. Find the line that proves it (for example <code>num_turns: 1</code> with no tool calls, so no file was read, so path rules never loaded).</li><li>If a stem says the prompt <i>already</i> states the rule clearly, the answer is not a better prompt.</li><li>Multi-response: evaluate each option independently as true or false for the scenario. Both keyed answers are usually <b>different layers</b> of the fix (wiring + tool list; split + verify totals).</li></ul>';
    }
  });
})();
