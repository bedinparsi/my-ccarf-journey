/* Domain 1 lessons: orchestration, subagent wiring, delegation, state persistence. */
(function () {
  var D = function (spec) { return CCAR.charts.diagram(spec); };
  CCAR.lessons = CCAR.lessons || [];

  CCAR.lessons.push({
    id: 'orchestration-patterns', domain: 'D1', objs: ['O10', 'O07', 'O01'], minutes: 25,
    title: 'Orchestration patterns: coordinator-worker, parallel, sequential',
    summary: 'Pick the structure that fits dependencies, coverage, latency and reliability. On your last attempt you scored 0% on this objective.',
    body: function () {
      return '' +
      '<p>The exam gives you a workload and constraints (latency target, token budget, coverage complaints, failure behavior) and asks which structure fits. The answer follows from one question: <b>what depends on what?</b></p>' +
      '<h3>The five workflow shapes (Anthropic, "Building effective agents")</h3>' +
      '<table class="tbl"><thead><tr><th>Pattern</th><th>Shape</th><th>Use when</th><th>Exam tell</th></tr></thead><tbody>' +
      '<tr><td><b>Prompt chaining / sequential pipeline</b></td><td>A → B → C, fixed order</td><td>Each stage needs the previous stage\'s output; steps are predictable</td><td>"stage 2 needs the verified policy form", "always the same four stages"</td></tr>' +
      '<tr><td><b>Routing</b></td><td>Classify, then send to one handler</td><td>Distinct request types with different handling</td><td>"62% of tickets are single-concern"</td></tr>' +
      '<tr><td><b>Parallelization (sectioning)</b></td><td>Fan-out, fixed set, then join</td><td>Known, fixed, independent parts (4 documents per packet)</td><td>"the packet always contains the same four documents"</td></tr>' +
      '<tr><td><b>Orchestrator-workers (coordinator-worker)</b></td><td>Coordinator decides subtasks at runtime, spawns workers, synthesizes</td><td>Open-ended, breadth-first, number of subtasks unknown up front</td><td>"research any topic", "teams own 2 to 14 packages"</td></tr>' +
      '<tr><td><b>Evaluator-optimizer / iterative refinement</b></td><td>Generate → evaluate → re-delegate</td><td>Quality or coverage must be checked and improved</td><td>"report missed GaN devices", "coverage gaps"</td></tr>' +
      '</tbody></table>' +
      D({ w: 760, h: 300, title: 'Coordinator-worker with parallel fan-out and a refinement loop',
        nodes: [
          { id: 'u', x: 20, y: 124, w: 110, h: 48, label: 'User query', kind: 'human' },
          { id: 'c', x: 180, y: 118, w: 150, h: 60, label: 'Coordinator', sub: 'plan · delegate · judge', kind: 'agent' },
          { id: 'w1', x: 400, y: 20, w: 150, h: 46, label: 'Search worker A', sub: 'subtopic 1', kind: 'sub' },
          { id: 'w2', x: 400, y: 90, w: 150, h: 46, label: 'Search worker B', sub: 'subtopic 2', kind: 'sub' },
          { id: 'w3', x: 400, y: 160, w: 150, h: 46, label: 'Doc analyst', sub: 'local PDFs', kind: 'sub' },
          { id: 's', x: 400, y: 236, w: 150, h: 46, label: 'Synthesis', sub: 'claims + sources', kind: 'sub' },
          { id: 'r', x: 610, y: 124, w: 130, h: 48, label: 'Cited report', kind: 'good' }
        ],
        edges: [
          { from: 'u', to: 'c' }, { from: 'c', to: 'w1', label: 'Task' }, { from: 'c', to: 'w2', label: 'Task' }, { from: 'c', to: 'w3', label: 'Task' },
          { from: 'c', to: 's', label: 'findings in prompt', dy: 14 }, { from: 's', to: 'c', dashed: true, label: 'gaps?', dx: 30 },
          { from: 'c', to: 'r' }
        ],
        caption: 'All three Task calls are emitted in <b>one</b> coordinator response, so they run in parallel. Workers never talk to each other; everything routes through the hub, which gives you observability, consistent error handling and controlled information flow.' }) +
      '<h3>Decision procedure you can run in 20 seconds</h3>' +
      '<ol class="steps">' +
      '<li><b>Are the parts independent?</b> Yes → parallel. No → sequential for the dependent part only.</li>' +
      '<li><b>Is the set of parts known and fixed?</b> Yes → static fan-out (sectioning) or a fixed pipeline. No → coordinator decides dynamically.</li>' +
      '<li><b>Does one upstream fact gate everything?</b> Resolve it first (one scoped subagent), then fan out. <i>Hybrid, dependency-aware</i> beats both "all parallel" and "all sequential".</li>' +
      '<li><b>Is quality/coverage uncertain?</b> Add an evaluate → re-delegate → re-synthesize loop in the coordinator.</li>' +
      '<li><b>Is the query simple?</b> Scale effort: one agent, a few tool calls. Do not run the full pipeline for a fact lookup.</li></ol>' +
      '<div class="callout rule"><b>Anthropic\'s research system numbers worth remembering.</b> Multi-agent (Opus lead + Sonnet subagents) beat single-agent Opus by 90.2% on breadth-first research; multi-agent uses about 15× the tokens of chat; lead spawns 3–5 subagents in parallel and subagents use 3+ tools in parallel, cutting research time up to 90%. Effort scaling: simple fact = 1 agent with 3–10 calls; comparison = 2–4 subagents; complex = 10+. Poor fit: tightly coupled work where agents must share context (most coding).</div>' +
      '<h3>Failure signatures and the layer to fix</h3>' +
      '<table class="tbl"><thead><tr><th>Symptom in the stem</th><th>Root cause</th><th>Correct fix</th></tr></thead><tbody>' +
      '<tr><td>Report covers only visual arts; each subagent "worked correctly"</td><td>Coordinator decomposition too narrow</td><td>Fix decomposition at the coordinator, not downstream agents</td></tr>' +
      '<tr><td>Three subagents overlap 60%, gaps elsewhere</td><td>No partitioning / no boundaries</td><td>Assign distinct subtopics or source types with explicit "covered elsewhere" boundaries</td></tr>' +
      '<tr><td>Late items shallower as context fills</td><td>One long sequential context</td><td>Parallel workers with fresh contexts</td></tr>' +
      '<tr><td>One failed fetch halts the whole run</td><td>Serial pipeline without coordinator error handling</td><td>Coordinator receives structured errors, proceeds with partial results, re-delegates</td></tr>' +
      '<tr><td>Findings overwritten in a shared file; unnoticed timeouts</td><td>Peer-to-peer coordination</td><td>Route handoffs through the coordinator (artifacts can still be files, referenced by path)</td></tr>' +
      '<tr><td>Dynamic coordinator skips stages / starts stage 2 before stage 1</td><td>Wrong pattern for a fixed dependent flow</td><td>Fixed sequential pipeline with validation gates</td></tr>' +
      '</tbody></table>' +
      '<div class="callout trap"><b>Distractors that keep winning points from candidates:</b> "run it three times and keep the majority" (consensus voting suppresses intermittent true findings and triples cost); "bigger context window" (does not fix attention dilution or latency); "twelve independent pipelines concatenated" (fixes latency, loses cross-entity synthesis and gap evaluation); "spawn subagents one per turn" (serializes them).</div>';
    }
  });

  CCAR.lessons.push({
    id: 'subagent-wiring', domain: 'D1', objs: ['O06', 'O05', 'O01'], minutes: 25,
    title: 'Subagent wiring: AgentDefinition, the Task tool, and diagnosing misconfiguration',
    summary: 'The objective you scored 0% on. Learn the five wiring faults the exam uses and how to spot each from a trace.',
    body: function () {
      return '' +
      '<p>These questions show you a <code>query()</code> config or an AgentDefinition plus a symptom and ask for the root cause. Read the code the way the SDK does, in this order.</p>' +
      D({ w: 760, h: 250, title: 'How a subagent gets spawned and what it can see',
        nodes: [
          { id: 'q', x: 20, y: 20, w: 190, h: 56, label: 'query() options', sub: 'allowedTools, agents, mcpServers', kind: 'store' },
          { id: 'c', x: 290, y: 20, w: 180, h: 56, label: 'Coordinator', sub: 'needs "Task" tool', kind: 'agent' },
          { id: 't', x: 290, y: 150, w: 180, h: 56, label: 'Task tool call', sub: 'subagent_type + prompt string', kind: 'tool' },
          { id: 's', x: 550, y: 150, w: 190, h: 56, label: 'Subagent', sub: 'own system prompt + tools', kind: 'sub' },
          { id: 'x', x: 550, y: 20, w: 190, h: 56, label: 'NOT inherited', sub: 'parent history, tool results', kind: 'bad' }
        ],
        edges: [{ from: 'q', to: 'c', label: 'config' }, { from: 'c', to: 't', label: 'routes by description' }, { from: 't', to: 's', label: 'only this prompt' }, { from: 'x', to: 's', dashed: true, kind: 'bad', label: 'never passed' }],
        caption: 'Exam guide wording: the coordinator\'s <code>allowedTools</code> must include <b>"Task"</b>. Current SDK docs call it the <b>Agent</b> tool. Recognize both names.' }) +
      '<h3>AgentDefinition fields (current Agent SDK)</h3>' +
      '<table class="tbl"><thead><tr><th>Field</th><th>Required</th><th>What it does</th><th>Common mistake</th></tr></thead><tbody>' +
      '<tr><td><code>description</code></td><td>Yes</td><td>Routing text: tells the <b>coordinator</b> when to use this agent</td><td>"Helper agent"; near-identical descriptions; role rules pasted here</td></tr>' +
      '<tr><td><code>prompt</code></td><td>Yes</td><td>The <b>subagent\'s system prompt</b> (role, rules, output format)</td><td>Generic "You are a helpful assistant" while the rules sit in description (swapped fields)</td></tr>' +
      '<tr><td><code>tools</code></td><td>No</td><td>Explicit allow-list. <b>Omitted = inherits every available tool</b></td><td>Omits the one tool the role needs (WebSearch, an <code>mcp__server__tool</code>) or omitted entirely on a read-only role</td></tr>' +
      '<tr><td><code>disallowedTools</code></td><td>No</td><td>Remove tools (patterns like <code>mcp__server__*</code>)</td><td>—</td></tr>' +
      '<tr><td><code>model</code></td><td>No</td><td>Alias (sonnet/opus/haiku/inherit) or ID; omitted = default</td><td>Distractor: "missing model stops the agent from being used". It doesn\'t.</td></tr>' +
      '<tr><td><code>mcpServers</code>, <code>skills</code>, <code>maxTurns</code></td><td>No</td><td>Servers available to the agent, preloaded skills, turn cap</td><td>MCP tool listed but its server is not configured, so the tool doesn\'t exist</td></tr>' +
      '</tbody></table>' +
      '<h3>The diagnostic ladder (check in this order)</h3>' +
      '<table class="tbl diag"><thead><tr><th>#</th><th>Symptom</th><th>Root cause</th><th>Fix</th></tr></thead><tbody>' +
      '<tr><td>1</td><td>No subagent is <b>ever</b> spawned; coordinator does the work with its own tools; context balloons</td><td><code>allowedTools</code> lacks <b>"Task"</b></td><td>Add "Task" (and usually remove the coordinator\'s research tools)</td></tr>' +
      '<tr><td>2</td><td><code>No agent type "X" is available</code></td><td>Agent defined in a local object but not passed in the <code>agents</code> option</td><td>Register it in <code>agents</code></td></tr>' +
      '<tr><td>3</td><td>Spawned correctly but "I can\'t access X", "No such tool available"</td><td>Subagent\'s explicit <code>tools</code> list omits it (tools are <b>not</b> inherited from the coordinator\'s allowedTools)</td><td>Add that tool to the <b>subagent\'s</b> tools, not to the coordinator</td></tr>' +
      '<tr><td>4</td><td>MCP tool name listed, still "no access"</td><td>The MCP server isn\'t configured in <code>mcpServers</code></td><td>Configure the server (or scope it to the subagent)</td></tr>' +
      '<tr><td>5</td><td>Wrong subagent chosen 90% of the time, or never chosen</td><td>Vague or overlapping <code>description</code>s</td><td>Specific, non-overlapping descriptions (purpose, inputs, when to prefer over sibling)</td></tr>' +
      '<tr><td>6</td><td>Subagent ignores the team\'s rules; also receives odd tasks</td><td><code>description</code> and <code>prompt</code> swapped</td><td>Rules → <code>prompt</code>; short routing statement → <code>description</code></td></tr>' +
      '<tr><td>7</td><td>Subagent asks "which reports?" or re-greps work already done</td><td>Context not passed in the Task prompt</td><td>Put the complete findings + metadata into the prompt</td></tr>' +
      '<tr><td>8</td><td>Read-only role edited files / ran builds</td><td><code>tools</code> omitted → full inheritance</td><td>Explicit least-privilege tool list</td></tr>' +
      '</tbody></table>' +
      '<pre class="code">// Spot the two faults\nconst copybookAgent = {\n  description: "Resolves COBOL copybook layouts ...",   // fine\n  prompt: "Always fetch the copybook with get_copybook ...",\n  tools: ["Read", "Grep", "Glob"]                    // (b) missing mcp__mainframe__get_copybook\n};\nquery({ prompt, options: {\n  allowedTools: ["Read", "Grep", "mcp__mainframe__get_copybook"],   // (a) no "Task"\n  mcpServers: { mainframe }, agents: { "copybook-analyst": copybookAgent } } });</pre>' +
      '<div class="callout rule"><b>Parallel spawning:</b> multiple Task calls in <b>a single coordinator response</b> run concurrently. One Task call per turn is sequential. If one subtask depends on another, launch the independent ones together, then spawn the dependent one with the result in its prompt.</div>' +
      '<div class="callout trap"><b>Traps:</b> "put Task in the subagent\'s tools so the coordinator can hand it work" (backwards: Task on a subagent only lets it spawn children); "tools must be a subset of the coordinator\'s tools" (no such rule); "prompt the coordinator to delegate" (a prompt cannot grant a missing tool); "subagent needs model set" (optional).</div>' +
      '<p class="src">Sources: <a href="https://code.claude.com/docs/en/agent-sdk/subagents" target="_blank" rel="noopener">Agent SDK: Subagents</a>, CCAR-F Exam Guide task 1.3.</p>';
    }
  });

  CCAR.lessons.push({
    id: 'delegation-context', domain: 'D1', objs: ['O04', 'O03', 'O05'], minutes: 18,
    title: 'Delegation style and complete subagent prompts',
    summary: 'Goal-oriented vs procedural delegation (you scored 50%) and self-sufficient Task prompts (67%).',
    body: function () {
      return '' +
      '<h3>The spectrum and where the right answer sits</h3>' +
      '<div class="spectrum"><div class="sp bad"><b>Rigid procedure</b><br>"1. Search X. 2. Open top 3. 3. Copy the table."<br><i>Breaks on paywalls, image tables, new aliases</i></div>' +
      '<div class="sp good"><b>Goal + criteria + boundaries + output contract</b><br>"Goal: onboard charger demand 2025–2030 (inverters are covered elsewhere). Prefer dated primary sources. Return claims with URL, date, excerpt; list what you did not cover."</div>' +
      '<div class="sp bad"><b>Unbounded autonomy</b><br>"Research EV semiconductors from any angle."<br><i>Duplication, gaps, no visibility</i></div></div>' +
      '<p>Anthropic\'s research team found that short instructions such as "research the semiconductor shortage" led to duplicated work and misread tasks. Each subagent needs <b>an objective, an output format, guidance on tools and sources, and clear task boundaries</b>.</p>' +
      '<table class="tbl"><thead><tr><th>Element</th><th>Why the coordinator needs it</th></tr></thead><tbody>' +
      '<tr><td>Goal / questions to answer</td><td>Lets the subagent adapt its method when a path fails</td></tr>' +
      '<tr><td>Quality criteria (primary sources, recency, evidence standard)</td><td>Steers away from SEO pages and aggregators without scripting queries</td></tr>' +
      '<tr><td>Scope boundaries ("X is assigned elsewhere")</td><td>Prevents duplication across parallel workers</td></tr>' +
      '<tr><td>Output format (structured, with "examined / not examined")</td><td>Keeps <b>visibility and control</b> at the coordinator</td></tr>' +
      '<tr><td>Limits (credit caps, eligible offers)</td><td>Adaptivity inside guardrails</td></tr></tbody></table>' +
      '<h3>Self-sufficient Task prompts</h3>' +
      '<p>The Task prompt string is the <b>only</b> channel from parent to subagent. "Synthesize the findings above", "the reports found earlier" and "the services identified above" mean nothing to the subagent.</p>' +
      D({ w: 760, h: 200, title: 'What a good synthesis Task prompt contains',
        nodes: [
          { id: 'f', x: 20, y: 30, w: 200, h: 60, label: 'Structured findings', sub: 'claim · value · unit', kind: 'store' },
          { id: 'm', x: 20, y: 110, w: 200, h: 60, label: 'Source metadata', sub: 'URL · doc · page · date', kind: 'store' },
          { id: 'p', x: 290, y: 70, w: 180, h: 60, label: 'Task prompt', sub: 'goal + scope + format', kind: 'tool' },
          { id: 's', x: 540, y: 70, w: 200, h: 60, label: 'Synthesis subagent', sub: 'no round-trips needed', kind: 'sub' }
        ],
        edges: [{ from: 'f', to: 'p' }, { from: 'm', to: 'p' }, { from: 'p', to: 's' }],
        caption: 'Keep content separate from metadata so attribution survives. For large artifacts, pass <b>paths + metadata</b> rather than pasting 11 PDFs.' }) +
      '<div class="callout rule"><b>Right amount of context:</b> complete but curated. The wrong answers are (a) a vague one-liner, (b) the parent\'s whole transcript including raw tool dumps, (c) "give the subagent the same tools and let it rediscover", and (d) a deliberate "ask me what you need" round trip.</div>' +
      '<div class="callout trap"><b>Classic trap:</b> "Enable shared memory / let the subagent inherit the conversation." Non-fork subagents do not inherit it. Forks do, but a fork drags the entire transcript in, which is not the curated context the question is looking for.</div>';
    }
  });

  CCAR.lessons.push({
    id: 'state-persistence', domain: 'D1', objs: ['O09', 'O02', 'O07'], minutes: 22,
    title: 'State persistence, manifests, crash recovery, and session resumption',
    summary: 'Resumable multi-agent pipelines (0% last time) plus --resume / fork_session decisions.',
    body: function () {
      return '' +
      '<p>The exam sets the scene: a crash at hour 4, nothing persisted, the rerun costs $140, and findings that lived only in the coordinator\'s context are gone. The correct design is always <b>structured state exports plus a manifest</b>.</p>' +
      D({ w: 760, h: 270, title: 'Manifest-driven resumption',
        nodes: [
          { id: 'c', x: 290, y: 16, w: 180, h: 54, label: 'Coordinator', sub: 'loads manifest on start', kind: 'agent' },
          { id: 'm', x: 20, y: 110, w: 210, h: 90, label: 'manifest.json', sub: 'task · status · scope · artifact · hash', kind: 'store' },
          { id: 'a1', x: 540, y: 90, w: 200, h: 44, label: 'findings/t1.json', sub: 'complete → inject', kind: 'store' },
          { id: 'a2', x: 540, y: 150, w: 200, h: 44, label: 't2: in_progress', sub: 're-dispatch same scope', kind: 'bad' },
          { id: 'a3', x: 540, y: 210, w: 200, h: 44, label: 't3: pending', sub: 'dispatch', kind: 'sub' }
        ],
        edges: [{ from: 'c', to: 'm', both: true, label: 'read / update' }, { from: 'c', to: 'a1' }, { from: 'c', to: 'a2' }, { from: 'c', to: 'a3' }],
        caption: 'Each agent writes its output to a known location; the coordinator records status + artifact path + the exact delegated scope. On resume: skip <i>complete</i>, re-run <i>in_progress</i> and <i>pending</i> with the recorded scope, inject saved findings into downstream prompts.' }) +
      '<h3>What a manifest must record (and why)</h3>' +
      '<table class="tbl"><thead><tr><th>Field</th><th>Prevents</th></tr></thead><tbody>' +
      '<tr><td>Per-item <b>status</b> (pending / in_progress / complete / failed)</td><td>Repeating finished work; a single "last batch" counter can\'t represent partial failures</td></tr>' +
      '<tr><td><b>Artifact path</b> of persisted output</td><td>"Couldn\'t find t1\'s findings, so I re-ran it"; lost findings when a source later disappears</td></tr>' +
      '<tr><td>The exact <b>delegated scope / prompt</b></td><td>Re-dispatching with a different decomposition, which causes overlap</td></tr>' +
      '<tr><td><b>Input version</b> (content hash / commit SHA)</td><td>Trusting stale findings for inputs that changed mid-run</td></tr>' +
      '<tr><td>External IDs (batch_id, custom_id, refund/RMA IDs)</td><td>Paying twice for batches; duplicate refunds after restart</td></tr></tbody></table>' +
      '<div class="callout trap"><b>Resume bug the exam loves:</b> <code>todo = status === "pending"</code> and <code>done = findings !== null</code>. An <code>in_progress</code> item with a half-written file is neither re-queued nor excluded, so partial output gets merged as final. Merge only <code>complete</code>; re-run everything else; write findings atomically <i>before</i> flipping status.</div>' +
      '<h3>Wrong answers and why they fail</h3><ul>' +
      '<li><b>"Resume the coordinator session and tell it to continue"</b>: the transcript is not a structured record; in-flight subagent results aren\'t in it; it\'s stale and bloated.</li>' +
      '<li><b>"Keep findings in context and /compact every N"</b>: dies with the process, and compaction loses specifics.</li>' +
      '<li><b>"Smaller chunks / bigger VM / health checks"</b>: shorter blast radius, no recovery.</li>' +
      '<li><b>"Restart and dedupe afterwards"</b>: still pays twice.</li></ul>' +
      '<h3>Session resumption in Claude Code / Agent SDK</h3>' +
      '<table class="tbl"><thead><tr><th>Situation</th><th>Do this</th></tr></thead><tbody>' +
      '<tr><td>Prior context mostly valid; 4 of 34 files changed overnight</td><td><code>claude --resume &lt;name&gt;</code> and <b>tell it which files changed</b> for targeted re-analysis</td></tr>' +
      '<tr><td>Prior tool results largely stale</td><td>Start fresh and inject a <b>structured summary</b> of what still holds</td></tr>' +
      '<tr><td>Compare two approaches from one baseline analysis</td><td><code>--fork-session</code> (with --resume/--continue) / <code>forkSession</code>: new session ID, shared history</td></tr>' +
      '<tr><td>Name a session for later</td><td><code>claude -n auth-refactor</code>, then <code>claude --resume auth-refactor</code></td></tr></tbody></table>' +
      '<div class="callout rule"><b>--continue</b> picks the most recent session in the directory. On an ephemeral CI runner that is unreliable or empty; pass prior findings in the prompt instead.</div>' +
      '<p class="src">Anthropic engineering: the lead researcher "saves its plan to Memory" because contexts over 200k tokens get truncated, and the system "resumes from where the agent was" with regular checkpoints rather than restarting (<a href="https://www.anthropic.com/engineering/multi-agent-research-system" target="_blank" rel="noopener">multi-agent research system</a>).</p>';
    }
  });
})();
