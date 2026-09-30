/* Architect Handbook · Part 8: reference (cheat sheet, terminology map and glossary, anti-pattern encyclopedia, final-week plan and self-test). */
(function () {
  var H = CCAR.hb, D = H.D;

  /* ------------------------------------------------------------------ 8.1 */
  CCAR.lessons.push({
    id: 'hb-81-cheat-sheet', track: 'handbook', part: 'P8', num: '8.1', order: 801, domain: 'ALL',
    objs: ['O11', 'O13', 'O16', 'O35', 'O27', 'X07', 'X12'], ts: ['2.4', '3.1', '3.2', '3.3', '3.6', '4.3', '4.5'], minutes: 30,
    title: 'Cheat sheet: flags, fields, files and limits',
    summary: 'Every CLI flag, permission mode, settings file, hook event, file location, frontmatter field, MCP config rule, Agent SDK option, API field and number you are expected to recognize on sight, plus the fake flags the exam uses as distractors.',
    body: function () {
      return `
<p>This is the lookup sheet. The exam does not ask you to recite syntax, but many options hinge on one detail: a flag that does not exist, a file in the wrong scope, a field that means something else. Every name below comes from the current Anthropic docs or the exam guide. If an option in a question uses a name that is not on this sheet, treat it with suspicion. Where the exam guide and today's docs disagree, the purple notes tell you which to use on the exam; chapter 8.2 lists every divergence.</p>

<h3>1. Claude Code CLI flags (real)</h3>
${H.table(['Flag', 'Purpose', 'Exam / production note'], [
  ['<code>-p</code>, <code>--print</code>', 'Non-interactive: run the prompt, print the result, exit', 'THE answer for "CI job hangs waiting for input" (3.6, sample Q10)'],
  ['<code>--output-format text|json|stream-json</code>', 'Output shape in print mode', '<code>json</code> for machine parsing in CI'],
  ['<code>--json-schema \'&lt;schema&gt;\'</code>', 'Validated structured output matching a schema (print mode)', 'Pair with <code>--output-format json</code> to post inline PR comments (3.6)'],
  ['<code>--max-turns N</code>', 'Cap agentic turns (print mode)', 'Runaway protection, not the primary stop signal'],
  ['<code>--max-budget-usd 5.00</code>', 'Cap spend (print mode)', 'Cost guard for CI. The fake variant is <code>--max-cost</code>'],
  ['<code>--permission-mode &lt;mode&gt;</code>', 'default | acceptEdits | plan | auto | dontAsk | bypassPermissions', 'See table 3'],
  ['<code>--dangerously-skip-permissions</code>', 'Same as bypassPermissions', 'Only in isolated, disposable environments'],
  ['<code>--allowedTools "Bash(git diff *)" "Read"</code>', 'Auto-approve matching tools without prompting', 'Does not hide other tools'],
  ['<code>--disallowedTools "Edit"</code>', 'Remove / deny tools', 'Read-only reviewer in CI'],
  ['<code>--tools "Read,Grep,Glob"</code>', 'Restrict the set of built-in tools available', 'Least privilege for a CI job'],
  ['<code>--resume &lt;id|name&gt;</code>', 'Resume a specific session by ID or name', 'Exam: <code>--resume &lt;session-name&gt;</code> (1.7)'],
  ['<code>-n</code>, <code>--name &lt;name&gt;</code>', 'Name a session', 'Makes later <code>--resume</code> by name possible'],
  ['<code>-c</code>, <code>--continue</code>', 'Continue the most recent session', 'Not a specific named one'],
  ['<code>--fork-session</code>', 'With <code>--resume</code>/<code>--continue</code>: branch into a new session ID', 'Exam term: <code>fork_session</code>'],
  ['<code>--no-session-persistence</code>', 'Do not persist the session', 'Print-mode sessions persist otherwise'],
  ['<code>--system-prompt</code> / <code>--append-system-prompt</code>', 'Replace / extend the system prompt', 'Append keeps Claude Code defaults'],
  ['<code>--mcp-config</code> / <code>--strict-mcp-config</code>', 'Load MCP servers from a file / use only those servers', 'Reproducible CI tool surface'],
  ['<code>--agents \'&lt;json&gt;\'</code>', 'Define subagents inline for this run', 'CLI-defined agents override project and user agents of the same name'],
  ['<code>--add-dir</code>', 'Give access to an additional directory', ''],
  ['<code>--bare</code>', 'Skip auto-discovery of CLAUDE.md, hooks, skills, MCP', 'Untrusted repos in headless runs'],
  ['<code>--setting-sources user</code>', 'Load only the listed settings sources', 'Ignore a repo\'s project settings'],
  ['<code>--settings \'{"disableAllHooks": true}\'</code>', 'Pass settings on the command line', 'Disable repo hooks for untrusted code'],
  ['<code>--model</code>', 'Choose the model', 'Passed via <code>claude_args</code> in GitHub Actions']
])}

<h4 class="bad-h">Non-existent flags, variables and files (distractors)</h4>
${H.table(['Looks plausible', 'Reality', 'Real mechanism'], [
  ['<code>--batch</code>', 'Does not exist (sample Q10)', '<code>-p</code> for non-interactive; Message Batches API is an API, not a CLI flag'],
  ['<code>CLAUDE_HEADLESS=true</code>', 'Does not exist (sample Q10)', '<code>-p</code>'],
  ['<code>--headless</code>, <code>--non-interactive</code>, <code>--ci</code>', 'Do not exist', '<code>-p</code>'],
  ['<code>--max-cost</code>', 'Does not exist', '<code>--max-budget-usd</code>'],
  ['<code>.claude/config.json</code> with a commands array', 'Does not exist (sample Q4)', '<code>.claude/commands/*.md</code> or <code>.claude/skills/&lt;name&gt;/SKILL.md</code>'],
  ['<code>alwaysApply</code> in a rules file', 'Not a Claude Code field', 'Rules without <code>paths</code> already load at launch; <code>paths</code> is the only rules field'],
  ['<code>claude "..." &lt; /dev/null</code>', 'Unix workaround, not the documented way (sample Q10)', '<code>-p</code>']
])}

<h4>Slash commands and session keys</h4>
${H.table(['Command / key', 'What it does'], [
  ['<code>/memory</code>', 'Lists and opens memory files (exam: verify which memory files are loaded)'],
  ['<code>/context</code>', 'Shows exactly what is loaded in the context'],
  ['<code>/compact &lt;instructions&gt;</code>', 'Summarize history to free context, with focus instructions'],
  ['<code>/clear</code>', 'Fresh context between unrelated tasks (also after two failed corrections)'],
  ['<code>/rewind</code>, Esc+Esc', 'Checkpoints: restore conversation, code or both; summarize from here'],
  ['Esc', 'Stop the current action'],
  ['<code>/btw</code>', 'Side question that does not enter history'],
  ['<code>/doctor</code>', 'Diagnostics; proposes CLAUDE.md cuts'],
  ['<code>/sandbox</code>', 'OS-level filesystem and network isolation for Bash'],
  ['<code>/install-github-app</code>', 'Quick setup of the GitHub Actions integration'],
  ['<code>/batch</code>', 'Fan-out to 5–30 subagents in worktrees'],
  ['<code>/code-review</code>', 'Bundled code review skill'],
  ['<code>/plugin:skill</code>', 'Namespaced skill from a plugin']
])}

<h3>2. File locations</h3>
${H.table(['Artifact', 'Project (shared via VCS)', 'Personal', 'Other'], [
  ['CLAUDE.md', '<code>./CLAUDE.md</code> or <code>./.claude/CLAUDE.md</code>', '<code>~/.claude/CLAUDE.md</code> (not shared); <code>./CLAUDE.local.md</code> (personal per project, gitignored)', 'Managed policy CLAUDE.md (org); subdirectory CLAUDE.md loads on demand when Claude reads files there'],
  ['Rules', '<code>.claude/rules/*.md</code>', '<code>~/.claude/rules/</code>', 'Frontmatter: <code>paths</code> only'],
  ['Skills', '<code>.claude/skills/&lt;name&gt;/SKILL.md</code>', '<code>~/.claude/skills/&lt;name&gt;/SKILL.md</code>', 'Plugins (namespaced)'],
  ['Commands (older format)', '<code>.claude/commands/*.md</code>', '<code>~/.claude/commands/</code>', 'Skill wins on a name clash'],
  ['Subagents', '<code>.claude/agents/*.md</code>', '<code>~/.claude/agents/</code>', '<code>--agents</code> JSON; SDK <code>agents</code> option'],
  ['Settings', '<code>.claude/settings.json</code>', '<code>~/.claude/settings.json</code>; <code>.claude/settings.local.json</code> (gitignored)', 'Managed settings (org, highest)'],
  ['MCP servers', '<code>.mcp.json</code> (project scope)', '<code>~/.claude.json</code> (user scope; local scope also stored here, per project)', '<code>--mcp-config</code> file']
])}

<h4>CLAUDE.md and rules mechanics</h4>
<ul>
<li>All CLAUDE.md files are <b>concatenated</b>, not overridden; more specific files are read later.</li>
<li><code>@path/to/file</code> imports resolve relative to the importing file, up to <b>four hops</b> deep. Imports load at launch: organization, not context savings.</li>
<li>Rules without <code>paths</code> load at launch like CLAUDE.md. With <code>paths: ["src/api/**/*", "**/*.test.tsx"]</code> they load only when Claude reads matching files.</li>
<li>Keep CLAUDE.md under about 200 lines. Project-root CLAUDE.md is re-injected after <code>/compact</code>; instructions given only in conversation are not.</li>
<li>CLAUDE.md is context, not enforcement. Blocking needs a hook or a permission deny.</li></ul>

<h4>Skill / command frontmatter (SKILL.md)</h4>
${H.table(['Field', 'Meaning'], [
  ['<code>name</code>', 'Skill name (also the slash command)'],
  ['<code>description</code>', 'Used for automatic invocation; loaded every request'],
  ['<code>when_to_use</code>', 'Extra guidance on when to invoke'],
  ['<code>argument-hint</code>', 'Prompts the developer for parameters when invoked without arguments'],
  ['<code>arguments</code>', 'Declared arguments; body uses <code>$ARGUMENTS</code>, <code>$0</code>'],
  ['<code>disable-model-invocation</code>', 'Only the user can invoke; description hidden from context until invoked'],
  ['<code>user-invocable</code>', 'Whether it appears as a user slash command'],
  ['<code>allowed-tools</code>', 'Exam: restricts tools during the skill. Docs: pre-approves tools'],
  ['<code>disallowed-tools</code>', 'Removes tools during the skill (docs)'],
  ['<code>model</code>, <code>effort</code>', 'Model and effort for the skill'],
  ['<code>context: fork</code>', 'Run in an isolated subagent context; verbose output stays out of the main session'],
  ['<code>agent</code>', 'Subagent type used when forked'],
  ['<code>hooks</code>', 'Hooks scoped to the skill'],
  ['<code>paths</code>', 'Path scoping for the skill']
])}
<p><b>Subagent file frontmatter</b> (<code>.claude/agents/*.md</code>): <code>name</code>, <code>description</code>, <code>tools</code>, <code>model</code>, with the body as the system prompt. Built-ins: <b>Explore</b> (read-only, fast discovery), <b>Plan</b>, <b>general-purpose</b>.</p>

<h3>3. Permission modes</h3>
${H.table(['Mode', 'Behavior', 'Use'], [
  ['<code>default</code> (labeled Manual)', 'Prompts for anything not pre-approved', 'Interactive work'],
  ['<code>acceptEdits</code>', 'File edits auto-approved', 'Trusted coding sessions'],
  ['<code>plan</code>', 'Explore and plan, no changes', 'Architectural or multi-file work (3.4)'],
  ['<code>auto</code>', 'A classifier reviews actions', 'Fewer prompts with a safety check; <code>disableAutoMode</code> (managed) turns it off'],
  ['<code>dontAsk</code>', 'Hard deny instead of prompting for unlisted tools', 'Headless agents with a fixed, explicit tool surface'],
  ['<code>bypassPermissions</code>', 'Everything runs', 'Isolated environments only; TS SDK needs <code>allowDangerouslySkipPermissions</code>; <code>disableBypassPermissionsMode</code> (managed) blocks it']
])}

<h3>4. Settings precedence and permission rules</h3>
${H.table(['Precedence (high → low)', 'File'], [
  ['1. Managed', 'Org policy; cannot be overridden'],
  ['2. CLI arguments', '<code>--settings</code>, <code>--allowedTools</code>, etc.'],
  ['3. Local', '<code>.claude/settings.local.json</code> ("Yes, don\'t ask again" saves here)'],
  ['4. Project', '<code>.claude/settings.json</code> (committed)'],
  ['5. User', '<code>~/.claude/settings.json</code>']
])}
<pre class="code">{
  "permissions": {
    "allow": ["Bash(npm run test *)", "Bash(git diff *)", "mcp__github__*"],
    "ask":   ["Edit(src/**)"],
    "deny":  ["Read(./.env)", "Bash(rm *)"]
  },
  "hooks": { "PreToolUse": [ { "matcher": "Bash", "hooks": [ { "type": "command", "command": "./scripts/guard.sh" } ] } ] }
}</pre>
<ul>
<li>Permission arrays <b>merge</b> across scopes. Evaluation order: <b>deny → ask → allow</b>, first match wins, specificity does not matter.</li>
<li>An allow cannot carve an exception out of a deny. A deny at any scope beats an allow anywhere.</li>
<li>A bare deny (<code>"Bash"</code>) removes the tool from context; a scoped deny (<code>"Bash(rm *)"</code>) blocks matching calls.</li>
<li>Project allow rules and <code>.mcp.json</code> servers need workspace trust in interactive sessions. <code>claude -p</code> and the SDK never show the trust dialog.</li></ul>

<h3>5. Hooks</h3>
${H.table(['Event', 'Fires', 'Typical use'], [
  ['<code>PreToolUse</code>', 'Before a tool call runs', 'Block policy violations ($500 refund), rewrite input, redirect to escalation (1.5)'],
  ['<code>PostToolUse</code>', 'After a tool call succeeds', 'Normalize results (Unix / ISO 8601 dates, numeric status codes) before the model sees them; add context'],
  ['<code>PostToolUseFailure</code>', 'After a tool call fails', 'Log, annotate failures'],
  ['<code>PermissionRequest</code>', 'When a permission prompt would appear', 'Custom approval handling'],
  ['<code>UserPromptSubmit</code>', 'When the user submits a prompt', 'Add context, screen prompts'],
  ['<code>Stop</code>', 'When Claude is about to finish', 'Deterministic verification gate (tests must pass)'],
  ['<code>SubagentStart</code> / <code>SubagentStop</code>', 'Around subagent runs', 'Observability, output checks'],
  ['<code>SessionStart</code> / <code>SessionEnd</code>', 'Session boundaries', 'Load context, clean up'],
  ['<code>PreCompact</code> / <code>PostCompact</code>', 'Around compaction', 'Archive the transcript before it is summarized'],
  ['<code>Notification</code>', 'When Claude Code sends a notification', 'Alerts']
])}
${H.table(['Signal', 'Effect'], [
  ['Command hook exit <b>0</b>', 'Success; continue'],
  ['Command hook exit <b>2</b> on PreToolUse', '<b>Blocks the tool call</b>; stderr is fed to Claude. Blocks even if an allow rule matches'],
  ['Exit 2 on PostToolUse', 'Stderr shown to Claude; the tool already ran'],
  ['<code>permissionDecision: allow|deny|ask|defer</code>', 'PreToolUse JSON decision, with <code>permissionDecisionReason</code> inside <code>hookSpecificOutput</code>. A hook "allow" cannot bypass deny or ask rules'],
  ['<code>updatedInput</code>', 'PreToolUse rewrites the tool input'],
  ['<code>updatedToolOutput</code>', 'PostToolUse replaces the tool result (normalization)'],
  ['<code>disableAllHooks</code>', 'Setting that turns hooks off (untrusted repos)']
])}
<p>Where hooks live: <code>hooks</code> key in user, project or local settings; skill or agent frontmatter; the Agent SDK <code>hooks</code> option with in-process callbacks. Hooks run outside the context window (zero token cost unless they return output). Hooks merge across scopes: all matching hooks fire.</p>

<h3>6. MCP configuration</h3>
${H.table(['Item', 'Value'], [
  ['Project scope', '<code>.mcp.json</code>, committed, team-shared: <code>claude mcp add --scope project</code>'],
  ['User scope', '<code>~/.claude.json</code>, personal, all projects (experimental servers)'],
  ['Local scope', '<code>~/.claude.json</code>, this project only, private. <b>Default</b> for <code>claude mcp add</code> (why teammates do not see your server)'],
  ['Override by name', 'local &gt; project &gt; user'],
  ['Env expansion', '<code>\${GITHUB_TOKEN}</code>, <code>\${VAR:-default}</code>. Never commit literal secrets'],
  ['Tool naming', '<code>mcp__&lt;server&gt;__&lt;tool&gt;</code>; permission rule <code>mcp__github__*</code>'],
  ['Discovery', 'Tools from all configured servers are discovered at connection and available simultaneously; Claude Code defers schemas behind tool search'],
  ['Primitives', 'Tools (model-controlled actions), resources (application-exposed data and catalogs via URIs), prompts (user-invoked templates)'],
  ['Errors', 'Tool execution error: <code>isError: true</code> in the result (give to the model); protocol error: JSON-RPC error (unknown tool, malformed request)'],
  ['Annotations', '<code>readOnlyHint</code>, <code>destructiveHint</code>, <code>idempotentHint</code>, <code>openWorldHint</code> (hints only)'],
  ['Transports', 'stdio (subprocess) and Streamable HTTP']
])}
<pre class="code">{
  "mcpServers": {
    "github": {
      "command": "github-mcp-server",
      "env": { "GITHUB_TOKEN": "\${GITHUB_TOKEN}" }
    }
  }
}</pre>
<p class="small muted">Server command is illustrative. The pattern that matters is the env block with expansion.</p>

<h3>7. Agent SDK</h3>
${H.table(['Option', 'Meaning'], [
  ['<code>allowedTools</code>', 'Auto-approve listed tools (exam: coordinator must include "Task"). Unlisted tools remain available and fall to permissionMode / canUseTool'],
  ['<code>disallowedTools</code>', 'Block regardless of mode; supports <code>mcp__server__*</code>'],
  ['<code>tools</code>', 'Restrict which tools are available'],
  ['<code>permissionMode</code>', 'default | acceptEdits | plan | dontAsk | auto | bypassPermissions'],
  ['<code>canUseTool</code>', 'Callback for a custom approval UI'],
  ['<code>maxTurns</code>', 'Caps tool-use turns'],
  ['<code>maxBudgetUsd</code>', 'Caps spend, including subagents. Good production default'],
  ['<code>effort</code>', 'low | medium | high | xhigh | max; per query or per AgentDefinition'],
  ['<code>settingSources</code>', 'Which settings (and CLAUDE.md) to load, e.g. <code>["project"]</code>'],
  ['<code>agents</code>', 'Programmatic subagents (recommended); override filesystem agents of the same name'],
  ['<code>mcpServers</code>', 'MCP servers for the run'],
  ['<code>hooks</code>', 'In-process callback hooks'],
  ['<code>resume</code> + <code>forkSession</code> (TS) / <code>fork_session</code> (Python)', 'Continue a session / branch it into a new session ID']
])}
${H.table(['AgentDefinition field', 'Notes'], [
  ['<code>description</code> (required)', 'Used for automatic routing; vague descriptions mean the coordinator never delegates'],
  ['<code>prompt</code> (required)', 'The subagent\'s system prompt'],
  ['<code>tools</code>', 'Omit = inherit all tools. List only what the role needs'],
  ['<code>disallowedTools</code>', 'Remove tools; supports <code>mcp__server__*</code>'],
  ['<code>model</code>', "'fable' | 'opus' | 'sonnet' | 'haiku' | 'inherit' | model ID"],
  ['<code>skills</code>', 'Preloaded skills'],
  ['<code>mcpServers</code>', 'Servers the subagent can use (missing entry = tool unavailable)'],
  ['<code>maxTurns</code>', 'Cap; partial output is marked'],
  ['<code>memory</code>, <code>background</code>, <code>effort</code>, <code>permissionMode</code>, <code>omitClaudeMd</code> (TS), <code>initialPrompt</code>', 'Further controls']
])}
${H.table(['ResultMessage subtype', 'Meaning'], [
  ['<code>success</code>', 'Finished; only this subtype carries <code>result</code>'],
  ['<code>error_max_turns</code>', 'Hit <code>maxTurns</code>'],
  ['<code>error_max_budget_usd</code>', 'Hit <code>maxBudgetUsd</code>'],
  ['<code>error_during_execution</code>', 'Failure during the run'],
  ['<code>error_max_structured_output_retries</code>', 'Structured output validation kept failing']
])}
<ul>
<li>ResultMessage also carries <code>usage</code>, <code>total_cost_usd</code>, <code>num_turns</code>, <code>session_id</code>, <code>stop_reason</code> (<code>"refusal"</code> detects refusals).</li>
<li>Built-in tools: Read, Edit, Write, Glob, Grep, Bash, WebSearch, WebFetch, ToolSearch, Agent (subagents; exam: Task), Skill, AskUserQuestion, TaskCreate / TaskUpdate.</li>
<li>Parallelism: read-only tools (Read, Glob, Grep, MCP tools with <code>readOnlyHint</code>) run concurrently; Edit, Write, Bash run sequentially.</li>
<li>Caps: <code>CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH</code> (default 3), <code>CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS</code> (default 20). Messages from inside a subagent carry <code>parent_tool_use_id</code>.</li>
<li>Claude Code caps tool responses at 25,000 tokens by default.</li></ul>

<h3>8. Messages API</h3>
${H.table(['stop_reason', 'Next step'], [
  ['<code>tool_use</code>', 'Run every requested tool; return all <code>tool_result</code> blocks (matching <code>tool_use_id</code>) in ONE user message; call again'],
  ['<code>end_turn</code>', 'Done'],
  ['<code>max_tokens</code>', 'Output truncated; split into smaller scoped calls'],
  ['<code>stop_sequence</code>', 'Custom stop sequence reached'],
  ['<code>pause_turn</code>', 'Server-tool turn paused; send content back to continue'],
  ['<code>refusal</code>', 'Declined; surface or route, do not blindly retry']
])}
${H.table(['tool_choice', 'Effect', 'Current models'], [
  ['<code>{"type":"auto"}</code>', 'May call a tool or answer in text (default with tools)', 'All models'],
  ['<code>{"type":"any"}</code>', 'Must call some tool', '<b>400 on Opus 5.5, Sonnet 5.5, Fable 5.1</b>; works on Haiku 4.5 and older'],
  ['<code>{"type":"tool","name":"extract_metadata"}</code>', 'Must call that tool', 'Same as <code>any</code>'],
  ['<code>{"type":"none"}</code>', 'No tool calls (default without tools)', 'All models']
])}
${H.box('exam', 'Exam vs current docs:', 'The exam guide teaches <code>tool_choice: "any"</code> to guarantee a tool call and forced selection to make <code>extract_metadata</code> run first. Choose those on the exam. On Opus 5.5, Sonnet 5.5 and Fable 5.1 use <code>auto</code> plus strict tool use, structured outputs, or programmatic gating (only expose the prerequisite tool on the first call). Forced choice also prefills the turn (no text before the tool_use) and is incompatible with manual extended thinking.')}
${H.table(['Content block', 'Direction', 'Key fields'], [
  ['<code>text</code>', 'both', 'Text; can accompany tool_use'],
  ['<code>image</code>, <code>document</code>', 'user', 'Vision, PDFs'],
  ['<code>tool_use</code>', 'assistant', '<code>id</code>, <code>name</code>, <code>input</code>'],
  ['<code>tool_result</code>', 'user', '<code>tool_use_id</code>, <code>content</code>, <code>is_error</code>'],
  ['<code>thinking</code>', 'assistant', 'Not guaranteed every turn; pass back unchanged in tool loops']
])}
${H.table(['usage field', 'Meaning'], [
  ['<code>input_tokens</code>', 'Uncached input after the last breakpoint'],
  ['<code>cache_creation_input_tokens</code>', 'Written to cache this call'],
  ['<code>cache_read_input_tokens</code>', 'Served from cache'],
  ['<code>output_tokens</code>', 'Generated tokens']
])}
<p><b>Tool definition fields:</b> <code>name</code> (<code>^[a-zA-Z0-9_-]{1,128}$</code>), <code>description</code> (the most important factor; 3–4+ sentences), <code>input_schema</code>, optional <code>input_examples</code>, <code>strict</code>, <code>cache_control</code>, <code>defer_loading</code>. Tools add a hidden tool-use system prompt (about 286 tokens on Opus/Sonnet 5.5) plus schemas. <b>Effort:</b> <code>output_config.effort</code>, default high on most models, medium on Opus 5.5. <code>budget_tokens</code> is deprecated on 4.6 and returns 400 on 4.7+.</p>

<h3>9. Structured outputs</h3>
${H.table(['Mechanism', 'Guarantees', 'Does not guarantee'], [
  ['JSON outputs: <code>output_config.format</code> with <code>type: "json_schema"</code> (answer in a text block)', 'Valid JSON, required fields present, correct types (constrained decoding)', 'Semantic correctness: sums, right field, no fabrication'],
  ['Strict tool use: <code>strict: true</code> on a tool', 'Tool names and inputs schema-valid', 'Same'],
  ['Tool use with a JSON schema (exam framing)', 'Most reliable; eliminates syntax errors', 'Semantic errors'],
  ['Prompt-only JSON', 'Nothing', 'Least reliable'],
  ['Prefill the assistant turn', '400 on Claude 4.6 and later', '']
])}
<p>Unsupported schema constraints (min/max, minLength and similar) are stripped by the SDK helpers (Pydantic <code>client.messages.parse()</code>, Zod) and validated afterwards. Schema design: nullable/optional fields for information that may be absent, enums with <code>"unclear"</code> and <code>"other"</code> + detail string, <code>calculated_total</code> next to <code>stated_total</code>, <code>conflict_detected</code> booleans (4.3, 4.4).</p>

<h3>10. Prompt caching numbers</h3>
${H.table(['Item', 'Value'], [
  ['Prefix order', 'tools → system → messages. Tool change invalidates all; system change invalidates system + messages; tool_choice, images, thinking config or effort change invalidates messages'],
  ['Breakpoints', 'Up to 4 explicit <code>cache_control</code>; or top-level automatic caching; 20-block lookback'],
  ['TTL', '5 minutes (refreshed free on hit); 1 hour option'],
  ['Write price', '1.25x base input (5 min); 2x (1 hour)'],
  ['Read price', '0.1x base input; 0.05x on Opus 5.5; 0.025x on Fable 5.1'],
  ['Minimum cacheable', '512 tokens (Opus 5.5, Sonnet 5.5, Fable 5.1); 4,096 (Haiku 4.5); shorter silently not cached'],
  ['Parallel fan-out', 'Entry exists after the first response begins: send one first or pre-warm with <code>max_tokens: 0</code>'],
  ['Rate limits', 'Cache hits do not count'],
  ['Exam scope', 'Implementation details are out of scope beyond knowing caching exists']
])}

<h3>11. Message Batches numbers</h3>
${H.table(['Item', 'Value'], [
  ['Cost', '50% of standard; stacks with caching (batch cache hits best effort, 30–98%)'],
  ['Window', 'Up to 24 hours; most finish in under 1 hour; no latency SLA; expired after 24 hours'],
  ['Limits', '100,000 requests or 256 MB per batch'],
  ['Results', '.jsonl, unordered, kept 29 days; correlate with <code>custom_id</code> (1–64 chars, <code>^[a-zA-Z0-9_-]{1,64}$</code>)'],
  ['Result types', 'succeeded, errored, canceled, expired (the last three not billed)'],
  ['Not supported', 'stream, fast mode, <code>max_tokens: 0</code>, client-tool round trips mid-request (exam: "no multi-turn tool calling")'],
  ['SLA math', 'Worst case = wait for next submission + 24h. 30h SLA → submit every 4h (4 + 24 = 28h, 2h buffer)'],
  ['Failures', 'Resubmit only failed <code>custom_id</code>s with fixes (chunk oversized docs); refine the prompt on a sample first']
])}

<h3>12. Models</h3>
${H.table(['Model', 'Positioning', 'In / out per MTok', 'Context', 'Max output', 'Thinking', 'Forced tool_choice'], [
  ['Claude Fable 5.1', 'Demanding reasoning, long-horizon agentic', '$10 / $50', '1M', '128K', 'Adaptive, always on', '400'],
  ['Claude Opus 5.5', 'Recommended starting point', '$4 / $20', '1M', '128K', 'Adaptive, always on', '400'],
  ['Claude Sonnet 5.5', 'Speed + intelligence', '$2 / $10', '1M', '128K', 'Adaptive', '400'],
  ['Claude Haiku 4.5', 'Fastest', '$1 / $5', '200K', '64K', 'Manual extended thinking', 'Supported']
])}

<h3>13. Numbers from the exam guide to recognize</h3>
${H.table(['Number', 'Context', 'Ch.'], [
  ['60 items · 120 min · 4 of 6 scenarios · pass 720 (100–1000)', 'Exam format', '8.4'],
  ['27 / 18 / 20 / 20 / 15%', 'Domain weights D1–D5', '8.4'],
  ['80%+ first-contact resolution; 55% observed', 'Support agent target; sample Q3', '5.2'],
  ['12% of cases skip get_customer', 'Sample Q1: programmatic prerequisite', '1.4'],
  ['$500', 'Refund threshold blocked by a PreToolUse hook', '1.5'],
  ['18 tools vs 4–5', 'Tool selection degrades', '2.3'],
  ['85% simple / 15% complex verifications; 40% latency', 'Sample Q9: scoped verify_fact', '2.3'],
  ['40+ fields per lookup, 5 relevant', 'Trim tool outputs', '5.1'],
  ['45+ files', 'Library migration: plan mode', '3.4'],
  ['14 files', 'Sample Q12: per-file + integration passes', '4.6'],
  ['2–3 I/O examples; 2–4 few-shot examples', 'Iterative refinement; ambiguous cases', '3.5, 4.2'],
  ['97% aggregate accuracy', 'Masks weak segments', '5.5'],
  ['4-hour windows, 24h batch, 30h SLA', 'Batch submission frequency', '4.5']
])}

${H.box('trap', 'Traps this sheet protects you from:', 'a fake flag (<code>--batch</code>, <code>CLAUDE_HEADLESS</code>, <code>--max-cost</code>); a real file in the wrong scope (<code>~/.claude/commands/</code> for a team command, local-scope MCP for a team server); a real field with the wrong meaning (<code>allowedTools</code> as a hiding whitelist, <code>@import</code> as context savings); a real mechanism at the wrong layer (CLAUDE.md for a "must never" rule).')}

${H.check([
  ['A CI job must run a read-only security review, never hang, cap spend and emit findings a script can post as PR comments. Which flags?', '<code>claude -p</code> with <code>--output-format json --json-schema \'...\'</code>, a read-only surface (<code>--tools "Read,Grep,Glob"</code> or <code>--disallowedTools "Edit"</code>), plus <code>--max-turns</code> and <code>--max-budget-usd</code>. Each flag is real; <code>--max-cost</code> and <code>--ci</code> are not (3.6).'],
  ['A teammate added a server with <code>claude mcp add</code>; nobody else sees it. Why, and the fix?', 'The default scope is local (private, in <code>~/.claude.json</code>). Re-add with <code>--scope project</code> so it lands in the committed <code>.mcp.json</code>, with the token as <code>\${TOKEN}</code> expansion (2.4).'],
  ['A project allow rule permits <code>Bash(git push *)</code>; a user-level deny blocks <code>Bash(git push *)</code>. What happens?', 'Denied. Deny is evaluated first and a deny at any scope beats an allow anywhere; specificity and scope precedence do not change that (3.1, 1.5).'],
  ['A PreToolUse hook exits 2 on a Bash call that an allow rule matches. Does the call run?', 'No. Exit 2 blocks the call and feeds stderr to Claude, even when an allow rule matches (1.5).'],
  ['Your extraction on Opus 5.5 sets <code>tool_choice: {"type":"any"}</code> and gets 400. What do you change, and what would the exam answer be?', 'Real work: <code>auto</code> with <code>strict: true</code> on the extraction tool, or <code>output_config.format</code>, and validate semantics in code. Exam: <code>tool_choice: "any"</code> is still the guide\'s way to guarantee a tool call (4.3, 8.2).'],
  ['A batch job reports 2% expired and 1% errored requests. What do you resubmit and do you pay for them?', 'Only those <code>custom_id</code>s, fixed where needed (chunk oversized documents). Errored, canceled and expired requests are not billed (4.5).']
])}
${H.src([['Claude Code CLI reference', 'https://code.claude.com/docs/en/cli-reference'], ['Settings and permissions', 'https://code.claude.com/docs/en/settings'], ['Hooks', 'https://code.claude.com/docs/en/hooks'], ['Memory (CLAUDE.md)', 'https://code.claude.com/docs/en/memory'], ['Skills', 'https://code.claude.com/docs/en/skills'], ['MCP in Claude Code', 'https://code.claude.com/docs/en/mcp'], ['Agent SDK overview', 'https://code.claude.com/docs/en/agent-sdk/overview'], ['Define tools', 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools'], ['Structured outputs', 'https://platform.claude.com/docs/en/build-with-claude/structured-outputs'], ['Prompt caching', 'https://platform.claude.com/docs/en/build-with-claude/prompt-caching'], ['Batch processing', 'https://platform.claude.com/docs/en/build-with-claude/batch-processing'], ['Models overview', 'https://platform.claude.com/docs/en/about-claude/models/overview']])}`;
    }
  });

  /* ------------------------------------------------------------------ 8.2 */
  CCAR.lessons.push({
    id: 'hb-82-terminology', track: 'handbook', part: 'P8', num: '8.2', order: 802, domain: 'ALL',
    objs: [], ts: [], minutes: 20,
    title: 'Exam-vs-current-docs terminology map and glossary',
    summary: 'Every place where the exam guide (v1.0) and today\'s Anthropic docs use different names or behavior, with what to answer on the exam and what to do in real work, followed by an A–Z glossary of the terms the exam uses.',
    body: function () {
      return `
<p>The exam guide was written against a snapshot of the platform, and the docs have moved on. Questions are keyed to the guide. Production systems run on current behavior. You need both vocabularies so that neither one surprises you on test day, and so that you do not ship exam-era code that returns 400 on the newest models. The rule is simple: <b>answer the exam in the guide's terms; build with the current docs</b>.</p>

<h3>Divergence map</h3>
${H.table(['Topic', 'Exam guide', 'Current docs', 'Answer on the exam', 'Do in real work'], [
  ['Subagent spawning tool', '<b>Task</b> tool', '<b>Agent</b> tool (renamed from Task)', '"Task tool"; coordinator emits multiple Task calls in one response for parallelism', 'Agent tool; subagents default to background, Claude sets <code>run_in_background: false</code> when it needs the result'],
  ['<code>allowedTools</code>', 'Coordinator\'s allowedTools must include "Task"', 'Auto-approve list; unlisted tools stay available and fall to permissionMode / canUseTool. <code>tools</code> / <code>disallowedTools</code> restrict availability', 'Missing "Task" in allowedTools = coordinator cannot spawn', 'Restrict with <code>tools</code>/<code>disallowedTools</code>; use <code>dontAsk</code> for a hard, fixed surface'],
  ['Verify loaded memory', '<code>/memory</code>', '<code>/memory</code> lists and opens memory files; <code>/context</code> shows exactly what is loaded', '<code>/memory</code>', '<code>/context</code> for the full picture, <code>/memory</code> to edit'],
  ['Skill <code>allowed-tools</code>', 'Restricts tool access during the skill', 'Pre-approves tools; <code>disallowed-tools</code> removes them', 'allowed-tools is the mechanism to limit a skill\'s tools', '<code>disallowed-tools</code> to remove; <code>allowed-tools</code> to skip prompts'],
  ['Guaranteeing a tool call', '<code>tool_choice: "any"</code>; forced <code>{"type":"tool","name":"extract_metadata"}</code>', '400 on Opus 5.5, Sonnet 5.5, Fable 5.1 (and Mythos 5.1); still valid on Haiku 4.5 and older', '"any" when document type is unknown; forced tool to run extract_metadata first', '<code>auto</code> + <code>strict: true</code>, or <code>output_config.format</code>; gate programmatically (expose only the prerequisite tool on the first call)'],
  ['Prefill', 'A weaker structured-output option', 'Prefilling the last assistant turn returns 400 on Claude 4.6+', 'Never the most reliable option', 'Do not use on 4.6+; use structured outputs'],
  ['Structured output "strict mode"', 'Tool use with JSON schema; strict mode eliminates syntax errors', 'Two features: JSON outputs (<code>output_config.format</code>) and strict tool use (<code>strict: true</code>)', 'Tool use + schema is most reliable; still validate semantics', 'Pick JSON outputs for a fixed response, strict tool use for tool inputs; validate sums and fields in code'],
  ['Extended thinking', '"Extended thinking" does not remove self-review bias', 'Adaptive thinking; <code>effort</code> low…max is the lever; <code>budget_tokens</code> deprecated on 4.6, 400 on 4.7+; always on for Fable 5.1 / Opus 5.5', 'An independent instance beats self-review or more thinking', 'Set <code>effort</code>; use <code>max_tokens</code> as ceiling; never assume a thinking block every turn'],
  ['Forking', '<code>fork_session</code>', 'CLI <code>--fork-session</code> (with --resume/--continue); SDK <code>forkSession</code> (TS) / <code>fork_session</code> (Python)', 'fork_session for divergent branches from a shared baseline', 'Use the flag or option for your surface; the original session stays untouched'],
  ['Named sessions', '<code>--resume &lt;session-name&gt;</code>', '<code>--resume &lt;id|name&gt;</code>; name with <code>-n/--name</code>; <code>-c/--continue</code> = most recent', 'Named resume for a specific investigation', 'Name sessions deliberately; capture <code>session_id</code> in SDK apps'],
  ['Explore subagent', 'Explore isolates verbose discovery', 'Built-ins Explore, Plan, general-purpose; Explore and Plan are one-shot (no agentId to resume)', 'Explore for verbose discovery phases', 'Custom agents when you need to resume them'],
  ['MCP tool discovery', 'Tools from all servers discovered at connection, available simultaneously', 'Tool names loaded at start; schemas deferred behind tool search by default', 'All servers\' tools available at once', 'Large tool libraries are cheap until used; still write strong descriptions'],
  ['MCP user vs local scope', 'User-level <code>~/.claude.json</code> for personal servers', 'Local scope (also in <code>~/.claude.json</code>, this project only) is the default for <code>claude mcp add</code>', 'Project <code>.mcp.json</code> for team; <code>~/.claude.json</code> for personal', 'Pass <code>--scope</code> explicitly'],
  ['MCP error metadata', '<code>isError</code> with errorCategory, isRetryable (also written "retriable: false")', 'Spec: tool execution errors use <code>isError: true</code>; protocol errors are JSON-RPC errors. errorCategory / isRetryable are payload conventions you define', 'Structured metadata beats "Operation failed"', 'Put the category, retryability and a readable message in the result content or <code>structuredContent</code>'],
  ['Error categories', 'Knowledge: transient, validation, business, permission. Skill example lists transient/validation/permission', 'Not defined by the spec', 'Recognize all four; business errors are non-retryable with a customer-safe reason', 'Define your own taxonomy consistently'],
  ['Slash commands', '<code>.claude/commands/</code> for team commands', 'Commands are the older format and still work; skills (<code>.claude/skills/</code>) win on name clash and add frontmatter', '<code>.claude/commands/</code> for a shared command (sample Q4)', 'Prefer skills for new work'],
  ['Directory-level CLAUDE.md', 'Directory-level hierarchy', 'Subdirectory CLAUDE.md loads on demand when Claude reads files there; all files concatenate', 'Path rules beat subdirectory CLAUDE.md for conventions spread across directories', 'Same'],
  ['Batch "no multi-turn tool calling"', 'Cannot execute tools mid-request and return results', 'Client-tool round trips impossible; server tools do run (may return <code>pause_turn</code>)', 'No tool loops inside a batch request', 'Batch single-shot extractions; run agent loops synchronously'],
  ['Prompt caching', 'Out of scope beyond knowing it exists', 'Detailed mechanics and prices (8.1 §10)', 'Never the answer to a correctness problem', 'Structure prompts stable-first; watch cache usage fields'],
  ['Model names', 'No model versions; reasons in tiers ("higher-tier model with a larger context window")', 'Fable 5.1, Opus 5.5, Sonnet 5.5, Haiku 4.5; AgentDefinition model aliases include \'fable\'', 'A bigger model or window does not fix attention dilution or missing structure', 'Choose per role with evals; start with Opus 5.5'],
  ['Headless / CI', '<code>-p</code>, <code>--output-format json</code>, <code>--json-schema</code>', 'Also <code>--max-turns</code>, <code>--max-budget-usd</code>, <code>--bare</code>, <code>--setting-sources user</code>, <code>--no-session-persistence</code>; no trust dialog in <code>-p</code>', '<code>-p</code> prevents hangs', 'Add budgets, turn caps, a restricted tool surface, and protection against untrusted repo config'],
  ['Permission modes', 'Plan mode vs direct execution', 'default (Manual), acceptEdits, plan, auto, dontAsk, bypassPermissions', 'Plan mode for architectural or multi-file work', 'Pick a mode per surface; manage bypass/auto centrally'],
  ['Self-reported confidence', '5.2: unreliable for escalation. 4.6/5.5: field-level confidence calibrated on labeled data is fine for routing', 'Same idea in evals guidance: calibrate model graders against humans', 'Raw self-rating = wrong; calibrated field confidence = right', 'Calibrate thresholds; keep sampling high-confidence items'],
  ['Compaction', '<code>/compact</code> during long exploration', 'Auto-compaction near the limit emits <code>compact_boundary</code>; server-side compaction; context editing (<code>clear_tool_uses_20250919</code>, <code>clear_thinking_20251015</code>)', '<code>/compact</code> plus scratchpad files', 'Persistent rules in CLAUDE.md; PreCompact hook to archive']
])}
${H.box('exam', 'How to use this table on test day:', 'If an option uses the guide\'s term (Task tool, <code>/memory</code>, <code>tool_choice: "any"</code>, <code>fork_session</code>), do not eliminate it for being "outdated". The exam is keyed to the guide. Eliminate options only for names that exist nowhere (8.1 distractor list).')}
${H.box('real', 'Real-world note:', 'The divergence most likely to break production is forced <code>tool_choice</code> on Opus 5.5 / Sonnet 5.5 / Fable 5.1. Code copied from exam-era examples returns 400. Search your codebase for <code>"type": "any"</code>, <code>"type": "tool"</code>, prefilled assistant turns and <code>budget_tokens</code> before a model upgrade.')}

<h3>Glossary A–Z</h3>
${H.table(['Term', 'Definition', 'Ch.'], [
  ['acceptEdits', 'Permission mode that auto-approves file edits', '0.5'],
  ['Adaptive thinking', 'The model decides per request whether and how much to think; steered by effort', '0.1'],
  ['Agent tool', 'Current name of the tool that spawns subagents (exam: Task)', '1.3'],
  ['AgentDefinition', 'Programmatic subagent config: description, prompt (required), tools, model, skills, mcpServers, maxTurns…', '1.3'],
  ['Agentic loop', 'Send request → inspect stop_reason → run tools → append results → repeat until end_turn', '1.1'],
  ['Aggregate accuracy', 'Overall metric (e.g. 97%) that can hide weak document types or fields', '5.5'],
  ['allowedTools', 'Exam: tools an agent may use (must include "Task"). Docs: auto-approve list', '1.3'],
  ['argument-hint', 'Skill frontmatter that prompts for parameters when invoked without arguments', '3.2'],
  ['Attention dilution', 'Quality drop when too much material is processed at once (the 14-file single-pass review)', '1.6, 4.6'],
  ['Batch (Message Batches API)', '50% cheaper asynchronous processing, up to 24h, no SLA, custom_id correlation', '4.5'],
  ['budget_tokens', 'Manual extended-thinking budget; deprecated on 4.6, 400 on 4.7+', '0.1'],
  ['bypassPermissions', 'Mode where everything runs; isolated environments only', '0.5'],
  ['cache_control', 'Marker that sets a prompt-cache breakpoint', '0.2'],
  ['canUseTool', 'Agent SDK callback that decides calls that would otherwise prompt', '0.4'],
  ['Case facts block', 'Persistent block of amounts, dates, IDs and promises sent with every prompt, outside summarized history', '5.1'],
  ['Claim-source mapping', 'Structured link from each claim to its source URL/document, excerpt and date, preserved through synthesis', '5.6'],
  ['CLAUDE.md', 'Always-loaded project/user instructions; concatenated across levels; context, not enforcement', '3.1'],
  ['CLAUDE.local.md', 'Personal per-project instructions, gitignored', '3.1'],
  ['Compaction', 'Summarizing history to free context; emits compact_boundary; project-root CLAUDE.md is re-injected', '5.1, 5.4'],
  ['context: fork', 'Skill frontmatter that runs the skill in an isolated subagent context', '3.2'],
  ['Context rot', 'Recall degrades as tokens increase; context is a finite attention budget', '5.1'],
  ['Coordinator', 'Hub agent that decomposes, delegates, aggregates, handles errors and routes all subagent traffic', '1.2'],
  ['Coverage annotation', 'Note in synthesis output marking well-supported findings vs gaps from unavailable sources', '5.3'],
  ['custom_id', 'Per-request ID (1–64 chars) that correlates unordered batch results', '4.5'],
  ['detected_pattern', 'Field on a finding recording which code construct triggered it, for analyzing dismissals', '4.4'],
  ['Direct execution', 'Implementing immediately; right for clear, well-scoped changes', '3.4'],
  ['disallowedTools', 'Tools removed or denied regardless of mode', '0.4'],
  ['dontAsk', 'Mode that hard-denies unlisted tools instead of prompting', '0.4'],
  ['Effort', 'low | medium | high | xhigh | max: how readily and deeply Claude thinks', '0.1'],
  ['Elicitation', 'MCP client feature: the server asks the user for information via the client', '0.6'],
  ['end_turn', 'stop_reason meaning Claude finished; the loop ends', '1.1'],
  ['errorCategory', 'Structured error field: transient, validation, business, permission', '2.2'],
  ['Escalation triggers', 'Explicit request for a human, policy gap or exception, inability to progress', '5.2'],
  ['Evaluator-optimizer', 'Workflow where one call generates and another evaluates in a loop', '1.2'],
  ['Explore subagent', 'Built-in read-only subagent for verbose discovery that returns a summary', '3.4'],
  ['Few-shot examples', '2–4 targeted examples showing the reasoning for ambiguous cases and the output format', '4.2'],
  ['Fork', 'New session branched from an existing one (shared baseline, independent afterwards); also a subagent that inherits the conversation', '1.7'],
  ['Hook', 'Deterministic code run at lifecycle events (PreToolUse, PostToolUse, Stop…), outside the context window', '1.5'],
  ['Hub-and-spoke', 'Topology where all inter-agent communication passes through the coordinator', '1.2'],
  ['Interview pattern', 'Claude asks questions to surface considerations before implementing', '3.5'],
  ['isError', 'MCP tool-result flag marking a tool execution failure the model should see', '2.2'],
  ['isRetryable', 'Boolean in structured error metadata telling the agent whether retrying can help', '2.2'],
  ['Just-in-time retrieval', 'Keep identifiers (paths, queries) in context and load content on demand', '5.4'],
  ['Least privilege', 'Each agent gets only the tools its role needs, plus scoped cross-role tools', '2.3'],
  ['Lost in the middle', 'Models reliably use the start and end of long inputs but may omit middle sections', '5.1'],
  ['Manifest', 'Structured state export each agent writes to a known location; the coordinator loads it on resume', '5.4'],
  ['maxBudgetUsd / --max-budget-usd', 'Spend cap for a run (SDK includes subagents)', '0.4, 3.6'],
  ['maxTurns / --max-turns', 'Turn cap; a safety rail, not the stop signal', '1.1'],
  ['MCP', 'Model Context Protocol: JSON-RPC protocol between host, client and server exposing tools, resources and prompts', '0.6'],
  ['mcp__server__tool', 'Naming pattern for MCP tools in Claude Code and permission rules', '2.4'],
  ['Model-driven decision', 'Claude picks the next tool from context, vs a pre-configured decision tree', '1.1'],
  ['Nullable field', 'Schema field that may be null so the model does not fabricate absent information', '4.3'],
  ['Orchestrator-workers', 'Lead agent plans and delegates to parallel workers; basis of the research system', '1.2'],
  ['"other" + detail', 'Enum value plus free-text field for extensible categories', '4.3'],
  ['Outcome (eval)', 'Final environment state (e.g. a DB row exists), not what the agent claims', '7.2'],
  ['output_config.format', 'JSON outputs: constrains the response to a JSON schema', '4.3'],
  ['parent_tool_use_id', 'Field on messages emitted inside a subagent, linking them to the spawning call', '0.4'],
  ['pass@k', 'Probability that at least one of k trials succeeds', '7.2'],
  ['pass^k', 'Probability that all k trials succeed; customer-facing consistency (75% per trial → pass^3 ≈ 42%)', '7.2'],
  ['Path-specific rule', '<code>.claude/rules/</code> file with <code>paths</code> globs, loaded only for matching files', '3.3'],
  ['pause_turn', 'stop_reason for a paused long-running server-tool turn', '0.1'],
  ['Plan mode', 'Explore and design without changes; for architectural, multi-file, multi-approach work', '3.4'],
  ['PostToolUse', 'Hook after a tool succeeds; normalizes results (updatedToolOutput)', '1.5'],
  ['Prefill', 'Pre-writing the start of the assistant turn; 400 on Claude 4.6+', '4.3'],
  ['PreToolUse', 'Hook before a tool runs; can deny, ask, allow or rewrite input; exit 2 blocks', '1.5'],
  ['Prerequisite gate', 'Code that blocks a downstream tool (process_refund) until a prerequisite (verified customer ID) exists', '1.4'],
  ['Programmatic enforcement', 'Deterministic control (hooks, gates, permissions, schemas) vs probabilistic prompt guidance', '1.4'],
  ['Progressive summarization', 'Repeatedly condensing history; loses numbers, dates and customer expectations', '5.1'],
  ['Prompt chaining', 'Fixed sequence of focused calls (per-file passes, then integration pass)', '1.6'],
  ['readOnlyHint', 'MCP tool annotation; read-only tools may run in parallel in the SDK', '0.6'],
  ['Resource (MCP)', 'Application-exposed data identified by URI (catalogs, schemas, doc hierarchies); cuts exploratory tool calls', '2.4'],
  ['ResultMessage', 'Final Agent SDK message: subtype, result, usage, total_cost_usd, num_turns, session_id', '0.4'],
  ['Roots', 'MCP client feature: file:// boundaries a server may operate on', '0.6'],
  ['Sampling (MCP)', 'Server requests an LLM completion via the client, with a human in the loop', '0.6'],
  ['Scratchpad', 'File where an agent records confirmed findings to survive context degradation and compaction', '5.4'],
  ['Scoped cross-role tool', 'Narrow tool for a frequent off-role need (verify_fact for the synthesis agent)', '2.3'],
  ['Self-review bias', 'The generating session keeps its reasoning and rarely questions itself; use an independent instance', '4.6'],
  ['Session', 'Persisted conversation identified by session_id or name; resume, continue or fork it', '1.7'],
  ['Skill', 'On-demand instructions in SKILL.md; description always loaded, body on invocation', '3.2'],
  ['stop_reason', 'Why the model stopped: tool_use, end_turn, max_tokens, stop_sequence, pause_turn, refusal', '1.1'],
  ['Stratified sampling', 'Random sampling within segments (including high-confidence items) to measure error rates and catch novel errors', '5.5'],
  ['Strict tool use', '<code>strict: true</code>: tool inputs are guaranteed schema-valid', '4.3'],
  ['Structured handoff', 'Escalation summary for a human without the transcript: customer ID, root cause, amounts, actions tried, recommendation', '1.4'],
  ['Subagent', 'Isolated worker with its own context; receives only its prompt; returns only its final message', '1.3'],
  ['tool_choice', 'auto | any | tool | none; any/tool return 400 on the newest models', '2.3, 4.3'],
  ['tool_result', 'User-turn block returning a tool\'s output, matched by tool_use_id; is_error for failures', '0.3'],
  ['Tool search', 'Deferred loading of tool schemas until needed', '0.3'],
  ['Trial / grader', 'Eval terms: one attempt at a task / the logic that scores it (code, model, human)', '7.2'],
  ['verify_fact', 'The exam\'s scoped fact-check tool for the synthesis agent (85% simple checks)', '2.3'],
  ['Workspace trust', 'Interactive approval needed before project allow rules and .mcp.json servers apply; never shown in -p', '0.5']
])}

${H.check([
  ['An option says "add <code>Task</code> to the coordinator\'s <code>allowedTools</code>". A colleague says that is outdated because the tool is now called Agent. Eliminate it?', 'No. The exam is keyed to the guide, where Task is the spawning tool and must be in allowedTools. Know that the current SDK calls it Agent.'],
  ['On the exam, which command verifies which memory files are loaded? In real work, which gives the fuller view?', 'Exam: <code>/memory</code>. Real work: <code>/context</code> shows exactly what is in context; <code>/memory</code> lists and opens memory files.'],
  ['You upgrade an extraction service from Haiku 4.5 to Sonnet 5.5 and every request fails with 400. Likely causes?', 'Forced <code>tool_choice</code> (any/tool), a prefilled assistant turn, or <code>budget_tokens</code>. Switch to <code>auto</code> + <code>strict: true</code> or <code>output_config.format</code>, and <code>effort</code>.'],
  ['What is the difference between pass@k and pass^k, and which matters for a customer-facing agent?', 'pass@k: at least one of k trials succeeds. pass^k: all k succeed. Customer-facing consistency is pass^k; 75% per trial gives about 42% for pass^3.'],
  ['A question describes skill <code>allowed-tools</code> as the way to stop a skill from running destructive commands. Right or wrong on the exam?', 'Right on the exam (the guide says it restricts tools). In current docs it pre-approves; <code>disallowed-tools</code> removes tools.']
])}
${H.src([['Agent SDK: subagents', 'https://code.claude.com/docs/en/agent-sdk/subagents'], ['Agent SDK: permissions', 'https://code.claude.com/docs/en/agent-sdk/permissions'], ['Skills', 'https://code.claude.com/docs/en/skills'], ['Define tools (tool_choice)', 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools'], ['Structured outputs', 'https://platform.claude.com/docs/en/build-with-claude/structured-outputs'], ['Adaptive thinking', 'https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking'], ['MCP specification', 'https://modelcontextprotocol.io/specification/latest'], ['Demystifying evals for AI agents', 'https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents']])}`;
    }
  });

  /* ------------------------------------------------------------------ 8.3 */
  CCAR.lessons.push({
    id: 'hb-83-anti-patterns', track: 'handbook', part: 'P8', num: '8.3', order: 803, domain: 'ALL',
    objs: ['X02', 'O33', 'O22', 'O28', 'O19', 'O10', 'O31'], ts: ['1.1', '1.2', '1.4', '2.1', '2.3', '3.1', '4.1', '4.3', '4.6', '5.1', '5.2', '5.3', '5.5', '5.6'], minutes: 30,
    title: 'Anti-pattern encyclopedia: every distractor family and the right move',
    summary: 'Over 110 wrong answers as they appear in exam options, organized by domain, each with why it tempts, why it fails, the right move and the chapter that teaches it. Includes the 12 trap patterns and every distractor from the guide\'s sample questions.',
    body: function () {
      var hd = ['Anti-pattern (as it appears in an option)', 'Why it is tempting', 'Why it fails', 'The right move', 'Ch.'];
      return `
<p>Exam distractors are not random. They are plausible designs that fail for a specific, repeatable reason, and the same few families recur across all six scenarios. If you can name the family an option belongs to, you can eliminate it in seconds and spend your time on the two options that remain. The same list works as a design-review checklist in production: each row is a failure somebody shipped. Rows marked <b>SQn</b> are distractors from the exam guide's sample question n.</p>

<h3>The 12 trap families</h3>
${H.table(['#', 'Family', 'Tell in the option', 'Right instinct', 'Rows below'], [
  ['1', 'Probabilistic fix for a must-always rule', '"Add to the system prompt / CLAUDE.md / few-shot" when the stem says financial, compliance, never, guarantee', 'Hook, prerequisite gate, permission deny, schema', 'D1 6–9, D3 12'],
  ['2', 'Heavy infrastructure as the first step', 'Classifier, routing layer, new service, fine-tuned model', 'Fix descriptions, criteria or examples first', 'D2 2, D5 7'],
  ['3', 'Fixing the wrong layer', 'Blames the agent the logs show working correctly', 'Fix the layer the evidence names', 'D1 12'],
  ['4', 'Bigger model / window / max_tokens', '"Higher-tier model", "larger context", "raise max_tokens"', 'Split, scope, structure', 'D4 8, 21; D5 2'],
  ['5', 'Self-confidence or sentiment as a signal', '"Self-report a 1–10 score", "sentiment threshold"', 'Explicit criteria; calibrated field confidence', 'D5 5–6'],
  ['6', 'Majority voting', '"Flag only issues found in 2 of 3 runs"', 'Focused passes; voting suppresses intermittent true positives', 'D4 20'],
  ['7', 'Silent suppression or total failure', '"Return empty as success", "terminate the workflow"', 'Structured error context, partial results, coverage notes', 'D2 7; D5 12–14'],
  ['8', 'All tools for flexibility', '"Give the agent access to all tools"', 'Least privilege + scoped cross-role tool', 'D2 9'],
  ['9', 'Batch for blocking work', '"Switch the pre-merge check to batch for 50% savings"', 'Sync for blocking; batch for overnight', 'D4 14–15'],
  ['10', 'Wrong configuration scope', '"~/.claude/…" for a team need; committed file for a personal one', 'Project scope for team, user scope for personal', 'D3 1, 2, 4; D2 14'],
  ['11', 'Non-existent features', '<code>--batch</code>, <code>CLAUDE_HEADLESS</code>, <code>.claude/config.json</code>, <code>--max-cost</code>, <code>alwaysApply</code>', 'Know the real names (8.1)', 'D3 13–14'],
  ['12', 'Collapsing conflicting data', '"Average the two values", "use the more recent source"', 'Keep both with attribution; flag the conflict', 'D5 17']
])}

${D({ w: 760, h: 200, title: 'Eliminating options in three passes',
  nodes: [
    { id: 'o', x: 20, y: 70, w: 120, h: 56, label: '4 options', sub: 'read stem first', kind: 'note' },
    { id: 'a', x: 180, y: 70, w: 150, h: 56, label: 'Pass 1: fake names', sub: 'flags, files, fields', kind: 'bad' },
    { id: 'b', x: 370, y: 70, w: 160, h: 56, label: 'Pass 2: trap family', sub: 'probabilistic, heavy, wrong layer', kind: 'bad' },
    { id: 'c', x: 570, y: 70, w: 170, h: 56, label: 'Pass 3: root cause', sub: 'which one fixes the evidence', kind: 'good' }
  ],
  edges: [{ from: 'o', to: 'a' }, { from: 'a', to: 'b' }, { from: 'b', to: 'c' }],
  caption: 'Most items fall to two options after passes 1 and 2. Pass 3 compares them against the stem\'s evidence and qualifiers ("first step", "most maintainable", "guarantee").' })}

<h3>D1 · Agentic architecture and orchestration</h3>
${H.table(hd, [
  ['1. Stop the loop when the response contains text', 'Text looks like an answer', 'Text often accompanies tool_use blocks; the loop exits mid-task', 'Continue on <code>stop_reason: "tool_use"</code>, stop on <code>"end_turn"</code>', '1.1'],
  ['2. Parse "I\'m done" / "anything else?" to end the loop', 'Mirrors how humans end conversations', 'Natural language is not a protocol; phrasing varies', 'Use stop_reason', '1.1'],
  ['3. Iteration cap as the primary stop condition', 'Feels safe and bounded', 'Cuts off legitimate long tasks, lets short broken ones spin', 'stop_reason to stop; <code>maxTurns</code> / budget as safety rails', '1.1'],
  ['4. Send each tool_result in its own message, or omit results from history', 'Looks simpler', 'Breaks the pairing; the model cannot reason about new information', 'Append all results for a turn in one user message, in full history', '1.1'],
  ['5. Hard-code a fixed tool sequence for open-ended support requests', 'Predictable', 'Cannot adapt to ambiguous, multi-concern requests', 'Model-driven tool choice, with gates only where compliance requires order', '1.1'],
  ['6. "State in the system prompt that get_customer is mandatory" (SQ1 B)', 'Cheap, fast', 'Prompt compliance has a non-zero failure rate; the 12% skip continues', 'Programmatic prerequisite blocking lookup_order and process_refund until a verified ID exists', '1.4'],
  ['7. "Few-shot examples always calling get_customer first" (SQ1 C)', 'Examples work elsewhere', 'Still probabilistic for a financial rule', 'Same gate', '1.4'],
  ['8. "Routing classifier enabling tool subsets per request" (SQ1 D)', 'Sounds rigorous', 'Solves tool availability, not tool ordering', 'Same gate', '1.4'],
  ['9. Gate that checks "get_customer was called" rather than "returned a verified ID"', 'It is a gate', 'A failed or ambiguous lookup still unlocks refunds', 'Key the gate to the verified result for the same customer', '1.4'],
  ['10. Per-call refund check when the policy is cumulative', 'Simple threshold', 'Split refunds slip under the limit', 'Hook tracks the running total per conversation', '1.5'],
  ['11. Escalate with "see the conversation" or a raw transcript dump', 'Nothing is lost', 'The human lacks the transcript or the time', 'Structured handoff: customer ID, root cause, amount, what was tried, recommended action', '1.4'],
  ['12. Fix search / analysis / synthesis when the coordinator split "creative industries" into visual-arts subtasks only (SQ7 A, C, D)', 'Downstream agents produced the output', 'Logs show they executed their assignments correctly', 'Fix the coordinator\'s decomposition (broaden subtopics)', '1.2'],
  ['13. Always run the full pipeline for every query', 'Consistent', 'Wastes tokens and latency on simple queries (multi-agent ≈ 15x tokens)', 'Coordinator selects subagents by query complexity', '1.2'],
  ['14. Subagents message each other directly', 'Fewer hops', 'Loses observability, consistent error handling and controlled flow', 'Hub-and-spoke through the coordinator', '1.2'],
  ['15. Expect the subagent to "already know" earlier findings', 'It is the same system', 'Subagents do not inherit parent conversation, tool results or system prompt', 'Pass complete findings in the Task prompt, with metadata', '1.3'],
  ['16. Spawn parallel subagents in consecutive turns', 'Looks orderly', 'Serializes the work', 'Multiple Task calls in one coordinator response', '1.3'],
  ['17. Coordinator\'s allowedTools lacks "Task"; subagent tools omit what it needs; vague description', 'Configuration looks complete', 'Coordinator cannot spawn, subagent cannot act, or routing never happens', 'Wire "Task", list needed tools, write a specific description, register in <code>agents</code>', '1.3'],
  ['18. Step-by-step procedural instructions in the coordinator prompt', 'Feels controlled', 'Removes subagent adaptability', 'Specify research goals and quality criteria', '1.3'],
  ['19. Vague "research X" subtasks', 'Short prompt', 'Duplication and gaps between subagents', 'Objective, output format, source guidance, boundaries; partition by subtopic or source type', '1.2'],
  ['20. Resume a session with stale tool results after major file changes', 'Keeps prior context', 'The agent reasons from outdated reads', 'Fresh session with an injected structured summary; or resume and name the changed files', '1.7'],
  ['21. Full re-exploration after a small change', 'Thorough', 'Wastes time and context', 'Resume and tell the session which files changed for targeted re-analysis', '1.7'],
  ['22. Parallelize before the gating fact is known', 'Faster', 'Duplicated or incompatible work', 'Resolve the gate (framework, target API) first, then fan out', '1.6'],
  ['23. One-shot "add comprehensive tests to the legacy codebase"', 'One instruction', 'No map, no priorities, premature "done"', 'Map structure → find high-impact areas → prioritized plan that adapts', '1.6']
])}

<h3>D2 · Tool design and MCP integration</h3>
${H.table(hd, [
  ['1. "5–8 few-shot examples routing order queries to lookup_order" as the first step (SQ2 A)', 'Examples help', 'Token overhead; the root cause is minimal descriptions', 'Expand descriptions: inputs, example queries, edge cases, when to use vs similar tools', '2.1'],
  ['2. Keyword routing layer that pre-selects the tool (SQ2 C)', 'Deterministic', 'Over-engineered; bypasses language understanding', 'Better descriptions', '2.1'],
  ['3. Merge both tools into lookup_entity as the first step (SQ2 D)', 'Removes ambiguity', 'Valid design but more effort than a first step warrants', 'Descriptions first; consolidate later if evidence supports it', '2.1'],
  ['4. Keep analyze_content and analyze_document with near-identical descriptions', 'Both are useful', 'Misrouting', 'Rename (analyze_content → extract_web_results) and differentiate', '2.1'],
  ['5. Generic analyze_document for everything', 'One tool, fewer choices', 'No clear contract', 'Split: extract_data_points, summarize_content, verify_claim_against_source', '2.1'],
  ['6. System prompt line "always search reports first" left in place', 'Seems harmless', 'Keyword-sensitive instructions override good descriptions', 'Review the system prompt for unintended tool associations', '2.1'],
  ['7. Timeout returned as "No charges found" (success)', 'Keeps the flow moving', 'Agent confidently tells the customer there is no charge', '<code>isError: true</code>, errorCategory transient, isRetryable true', '2.2'],
  ['8. Uniform "Operation failed"', 'Simple', 'Agent cannot choose retry, rephrase, explain or escalate', 'errorCategory + isRetryable + readable message', '2.2'],
  ['9. Give every agent all 18 tools; give synthesis all web tools (SQ9 C)', '"Flexibility"', 'Selection degrades; off-role misuse (synthesis web-searching)', '4–5 role tools plus scoped verify_fact for the 85% simple checks', '2.3'],
  ['10. Batch all verification needs to the end of synthesis (SQ9 B)', 'Fewer round trips', 'Later synthesis steps depend on earlier verified facts', 'Scoped verify_fact; complex checks via the coordinator', '2.3'],
  ['11. Search agent pre-caches extra context "just in case" (SQ9 D)', 'Anticipates needs', 'Speculative; cannot predict what synthesis will verify', 'Scoped verify_fact', '2.3'],
  ['12. Generic fetch_url tool', 'Handles any URL', 'Unconstrained, misused', 'Constrained load_document that validates document URLs', '2.3'],
  ['13. Build a custom Jira MCP server', 'Full control', 'Maintenance for a solved problem', 'Community server for standard integrations; custom for team-specific workflows', '2.4'],
  ['14. Team server in user or local scope; literal token in <code>.mcp.json</code>', 'Works on my machine', 'Teammates lack it; secrets leak via VCS', 'Project <code>.mcp.json</code> with <code>\${TOKEN}</code> expansion', '2.4'],
  ['15. Agent keeps using Grep instead of the MCP tool, so remove Grep', 'Forces the choice', 'Loses a useful tool; root cause is a weak MCP description', 'Enhance the MCP tool description (capabilities and outputs)', '2.4'],
  ['16. Dozens of exploratory list calls to discover what exists', 'Tools are familiar', 'Burns turns and context', 'Expose catalogs (docs hierarchy, schemas, issue summaries) as MCP resources', '2.4'],
  ['17. Wrap every API endpoint as its own tool', 'Complete coverage', 'Too many low-level tools; ambiguous selection', 'Few workflow-level tools (search_contacts, get_customer_context), namespaced', '2.1'],
  ['18. Glob <code>**/*.java</code> and read everything alphabetically', 'Complete', 'Exhausts context before the answer', 'Grep for the entry point, then Read and follow imports', '2.5'],
  ['19. Edit fails on a non-unique anchor, so retry or use repo-wide sed', 'Quick', 'Same failure, or unintended edits', 'Widen the anchor, or Read + Write the file', '2.5'],
  ['20. Grep only the original function name across wrapper modules', 'Literal search seems exhaustive', 'Misses re-exported aliases', 'Read the wrapper, list exported names, Grep each', '2.5'],
  ['21. Use Grep to find files by name, Glob to find content', 'Both "search"', 'Wrong tool for the job', 'Grep = contents; Glob = path patterns (<code>**/*.test.tsx</code>)', '2.5']
])}

<h3>D3 · Claude Code configuration and workflows</h3>
${H.table(hd, [
  ['1. Team standards in <code>~/.claude/CLAUDE.md</code>', 'It works for the author', 'User level is not shared; new teammates miss it', 'Project <code>CLAUDE.md</code> or <code>.claude/CLAUDE.md</code>', '3.1'],
  ['2. Team command in <code>~/.claude/commands/</code> (SQ4 B)', 'Personal commands work', 'Not in version control', '<code>.claude/commands/</code> in the repo', '3.2'],
  ['3. Define the command in CLAUDE.md (SQ4 C)', 'CLAUDE.md is loaded', 'CLAUDE.md is context, not a command definition', '<code>.claude/commands/</code> or a skill', '3.2'],
  ['4. Personal skill with the same name as the project skill', 'Customization', 'Shadows the team version and confuses expectations', 'Personal variant with a different name in <code>~/.claude/skills/</code>', '3.2'],
  ['5. All conventions under headers in the root CLAUDE.md (SQ6 B)', 'One place', 'Relies on inference; always-loaded bloat', '<code>.claude/rules/</code> with <code>paths</code> globs', '3.3'],
  ['6. A skill per code type holding conventions (SQ6 C)', 'Skills are modular', 'Requires invocation; not automatic', 'Path-scoped rules', '3.3'],
  ['7. Subdirectory CLAUDE.md for test conventions (SQ6 D)', 'Directory-local', 'Test files are spread everywhere; CLAUDE.md is directory-bound', '<code>paths: ["**/*.test.tsx"]</code> rule', '3.3'],
  ['8. Use @import to save context', 'Modular files', 'Imports load at launch; organization only', '@import for modularity; path rules or skills for conditional loading', '3.1'],
  ['9. Direct execution for a monolith-to-microservices restructure (SQ5 B, C, D)', 'Faster start', 'Late discovery of dependencies causes rework; complexity is already known', 'Plan mode first, then execute the plan', '3.4'],
  ['10. Plan mode for a single-file fix with a clear stack trace', 'Caution', 'Overhead with no decision to make', 'Direct execution', '3.4'],
  ['11. Verbose analysis skill without <code>context: fork</code>', 'Simpler', 'Floods the main session', '<code>context: fork</code>', '3.2'],
  ['12. "Never edit migrations" written in CLAUDE.md', 'Visible to Claude', 'Guidance, not enforcement', 'Permission deny or PreToolUse hook', '3.1'],
  ['13. <code>CLAUDE_HEADLESS=true</code> or <code>--batch</code> for a hanging CI job (SQ10 B, D)', 'Sound like CI flags', 'Do not exist', '<code>claude -p</code>', '3.6'],
  ['14. Redirect stdin from /dev/null (SQ10 C)', 'Unix habit', 'Not the documented mechanism', '<code>claude -p</code>', '3.6'],
  ['15. Parse free-text review output with regex', 'Quick', 'Fragile', '<code>--output-format json --json-schema</code>', '3.6'],
  ['16. The session that wrote the code reviews it', 'Has full context', 'Self-review bias: keeps its reasoning', 'Independent review instance', '3.6, 4.6'],
  ['17. Re-run the review on new commits without prior findings', 'Fresh look', 'Duplicate comments', 'Include prior findings; report only new or unaddressed issues', '3.6'],
  ['18. Generate tests without showing existing tests', 'Less context', 'Duplicate scenarios', 'Provide existing test files; document fixtures and valuable-test criteria in CLAUDE.md', '3.6'],
  ['19. <code>bypassPermissions</code> and no turn or budget caps on untrusted PRs', 'No prompts in CI', 'Prompt injection, runaway cost', 'Restricted tools, <code>--max-turns</code>, <code>--max-budget-usd</code>, sandboxing', '3.6'],
  ['20. Keep rewording prose when output is inconsistent', 'More detail seems clearer', 'Prose is interpreted inconsistently', '2–3 concrete input/output examples', '3.5'],
  ['21. Fix interacting issues one message at a time', 'Focused', 'Fixes conflict with each other', 'One detailed message for interacting issues; sequential for independent ones', '3.5']
])}

<h3>D4 · Prompt engineering and structured output</h3>
${H.table(hd, [
  ['1. "Be conservative" / "only report high-confidence findings"', 'Sounds like precision', 'Does not change what counts as a finding', 'Specific categorical criteria: report X, skip Y', '4.1'],
  ['2. Keep a high false-positive category running while tuning', 'Coverage', 'Erodes trust in accurate categories', 'Temporarily disable that category; improve its prompt', '4.1'],
  ['3. Severity labels without examples', 'Labels seem clear', 'Inconsistent classification', 'Explicit severity criteria with concrete code examples per level', '4.1'],
  ['4. "Check that comments are accurate"', 'Broad', 'Vague criterion, many false positives', '"Flag comments only when claimed behavior contradicts actual code"', '4.1'],
  ['5. Many near-identical few-shot examples', 'More is better', 'No generalization to novel cases', '2–4 targeted, diverse examples showing why one choice beats alternatives', '4.2'],
  ['6. Prompt-only JSON, or prefill', 'Easy', 'Least reliable; prefill returns 400 on 4.6+', 'Tool use with JSON schema / strict tool use / JSON outputs', '4.3'],
  ['7. <code>tool_choice: "auto"</code> when a text reply breaks the pipeline', 'Default', 'Model may answer in text', 'Exam: <code>"any"</code>, or forced tool to run extract_metadata first. Current models: auto + strict, or <code>output_config.format</code>', '4.3'],
  ['8. Raise <code>max_tokens</code> for truncated JSON', 'Direct', 'Output ceilings and attention dilution remain', 'Split into smaller scoped calls and merge in code', '4.3'],
  ['9. Required fields for information that may be absent', 'Completeness', 'Model fabricates values to satisfy the schema', 'Nullable/optional fields', '4.3'],
  ['10. Closed enum for an open category', 'Clean data', 'Forced miscategorization', '"other" + detail string; "unclear" for ambiguity', '4.3'],
  ['11. Trust strict schemas to catch wrong totals', 'Schema is validated', 'Syntax, not semantics', 'calculated_total vs stated_total, conflict_detected, code validation', '4.4'],
  ['12. Retry when the information is not in the document', 'Retries fix errors', 'Nothing to find; wasted calls', 'Return null / flag for review; retry only format or structure errors', '4.4'],
  ['13. Retry with "try again"', 'Simple', 'No signal to correct', 'Send the document, the failed extraction and the specific validation errors', '4.4'],
  ['14. Move the blocking pre-merge check to batch (SQ11 B, D)', '50% savings', 'Up to 24h, no SLA; developers are blocked', 'Batch only the overnight report; sync for pre-merge', '4.5'],
  ['15. Avoid batch because results are unordered (SQ11 C)', 'Ordering matters', 'custom_id correlates results', 'Use batch where latency-tolerant', '4.5'],
  ['16. Submit once a day for a 30h SLA', 'Fewer jobs', '24h wait + 24h processing breaks the SLA', 'Submit every 4h (4 + 24 = 28h)', '4.5'],
  ['17. Resubmit the whole batch after failures; skip sample testing', 'Simple', 'Pays again for successes; repeats prompt issues at scale', 'Resubmit failed custom_ids with fixes; refine on a sample first', '4.5'],
  ['18. Batch requests that need your tools mid-request', 'Cheaper', 'No client-tool round trips inside a batch request', 'Synchronous loop for tool-using agents', '4.5'],
  ['19. "Review your own output carefully" or more thinking in the same session', 'Cheap', 'Keeps the generator\'s reasoning context', 'Independent instance without that context', '4.6'],
  ['20. Three full-PR passes, flag issues found in 2 of 3 (SQ12 D)', 'Reduces noise', 'Suppresses intermittent true positives', 'Per-file passes + cross-file integration pass', '4.6'],
  ['21. Higher-tier model with a larger window for 14 files (SQ12 C)', 'More capacity', 'Window size does not fix attention quality', 'Same split', '4.6'],
  ['22. Make developers split PRs into 3–4 files (SQ12 B)', 'Smaller inputs', 'Shifts burden without improving the system', 'Same split', '4.6']
])}

<h3>D5 · Context management and reliability</h3>
${H.table(hd, [
  ['1. Summarize history more often', 'Saves tokens', 'Turns "$214.37 on 14 June" into "about $200 recently"', 'Case facts block outside summarized history', '5.1'],
  ['2. Switch to a bigger context window', 'Fits more', 'Attention still dilutes; cost rises', 'Trim, structure, delegate', '5.1'],
  ['3. Keep all 40+ fields of every lookup', 'Nothing lost', 'Irrelevant tokens accumulate', 'Trim to relevant fields (5 of 40) before they accumulate', '5.1'],
  ['4. Key findings buried mid-input', 'Chronological order', 'Lost in the middle', 'Key-findings summary first, explicit section headers', '5.1'],
  ['5. Sentiment threshold triggers escalation (SQ3 D)', 'Frustration feels urgent', 'Sentiment does not track case complexity', 'Explicit escalation criteria with few-shot examples', '5.2'],
  ['6. Self-reported confidence 1–10 routes to humans (SQ3 B)', 'Model knows its limits', 'Poorly calibrated; already confident on hard cases', 'Same criteria + examples', '5.2'],
  ['7. Train an escalation classifier first (SQ3 C)', 'Data-driven', 'Needs labeled data and ML infrastructure before prompting was tried', 'Same criteria + examples', '5.2'],
  ['8. Investigate before honoring "I want a human"', 'Might resolve it', 'Ignores an explicit request', 'Escalate immediately', '5.2'],
  ['9. Escalate every frustrated customer', 'Safe', 'Hurts first-contact resolution on solvable cases', 'Acknowledge, offer the resolution; escalate if they reiterate', '5.2'],
  ['10. Pick the most likely of multiple customer matches', 'Faster', 'Wrong account, wrong refund', 'Ask for another identifier', '5.2'],
  ['11. Resolve a policy gap autonomously (competitor price match)', 'Helpful', 'Policy is silent; agent invents policy', 'Escalate policy gaps and exceptions', '5.2'],
  ['12. Retry, then return generic "search unavailable" (SQ8 B)', 'Local recovery', 'Hides failure type, query and partial results', 'Structured error context: type, attempted query, partial results, alternatives', '5.3'],
  ['13. Catch the timeout, return empty success (SQ8 C)', 'Pipeline continues', 'Suppresses the error; no recovery possible', 'Same structured context', '5.3'],
  ['14. Propagate to a top-level handler that kills the run (SQ8 D)', 'Fail fast', 'Throws away recoverable work', 'Coordinator decides: retry, alternative, or proceed with partial results', '5.3'],
  ['15. Synthesis output with no coverage notes', 'Clean report', 'Gaps look like "nothing found"', 'Coverage annotations: well-supported vs gaps from unavailable sources', '5.3'],
  ['16. Upstream agents return verbose reasoning chains', 'Transparency', 'Overflows downstream context budgets', 'Structured key facts, citations, relevance scores', '5.1'],
  ['17. Average or pick one of two credible conflicting statistics', 'One clean number', 'Destroys information; misleading', 'Keep both with attribution; mark contested; coordinator reconciles', '5.6'],
  ['18. Drop publication / collection dates', 'Simpler schema', 'Temporal differences look like contradictions', 'Require dates in structured outputs', '5.6'],
  ['19. Summaries without claim-source mappings', 'Shorter', 'Attribution lost in compression', 'Structured claim-source mappings preserved through synthesis', '5.6'],
  ['20. Render all content in one uniform format', 'Consistency', 'Financial data unreadable as prose', 'Tables for financial data, prose for news, lists for technical findings', '5.6'],
  ['21. 97% overall, so reduce human review', 'Strong metric', 'Masks weak document types or fields', 'Segment by document type and field first', '5.5'],
  ['22. Review only low-confidence items; no sampling of high-confidence ones', 'Efficient', 'Novel errors in high-confidence output go unseen', 'Stratified random sampling of high-confidence extractions', '5.5'],
  ['23. Uncalibrated confidence thresholds', 'Numbers look precise', 'Thresholds do not match real error rates', 'Calibrate field-level confidence on a labeled validation set', '5.5'],
  ['24. After a crash, restart and re-read everything', 'Clean slate', 'Repeats work, loses ruled-out hypotheses', 'Agents export state to a known location; coordinator loads the manifest', '5.4'],
  ['25. Investigation notes in the shared CLAUDE.md', 'Persistent', 'Burdens every teammate\'s context', 'Scratchpad file for the task', '5.4'],
  ['26. Keep exploring in one ever-growing session', 'Continuity', '"Typical patterns" answers, contradictions', 'Subagents for specific questions, scratchpad, <code>/compact</code>, phase summaries injected into new subagents', '5.4']
])}

<h3>Cross-cutting</h3>
${H.table(hd, [
  ['1. The most powerful option for a "first step" question', 'Maximal effect', '"First step" asks for the proportionate root-cause fix', 'Cheapest fix that addresses the evidence', 'All'],
  ['2. A better prompt when the stem says the prompt already states the rule clearly', 'Prompts are the usual lever', 'The stem has ruled it out', 'Deterministic mechanism', '1.4'],
  ['3. An option that drops a stated requirement ("skip verification to cut latency")', 'Solves the metric', 'Violates the scenario constraint', 'Meet the requirement, then optimize', 'All'],
  ['4. Both multi-response picks at the same layer', 'They sound alike', 'Keyed pairs are usually different layers (wiring + tool list)', 'Judge each option true or false on its own', '8.4'],
  ['5. "Log it and review later" for a live policy violation', 'Observability', 'The damage is done', 'Block at call time (hook, gate)', '1.5'],
  ['6. Humans shoulder the fix ("require developers to…")', 'Removes the problem', 'Does not improve the system', 'Architectural fix', '4.6']
])}

${H.box('rule', 'The right-answer signature:', 'deterministic where it must hold, proportionate as a first step, at the layer the evidence names, least privilege, structured at every boundary, never hiding uncertainty, measured per segment.')}
${H.box('real', 'Real-world note:', 'Use this list in design reviews. Rows D2 7, D5 13 and D4 11 (silent success, empty-as-success, schema-valid but wrong totals) are the failures that reach customers without an alert. Add tests for each.')}

${H.check([
  ['An option proposes "add a sentence to CLAUDE.md telling Claude never to run migrations in production". Which family, and the fix?', 'Family 1 (probabilistic for a must-never). Use a permission deny rule or a PreToolUse hook that blocks the command (D3 12).'],
  ['Stem: synthesis agent needs quick fact checks 85% of the time. Options: all web tools; batch checks at the end; scoped verify_fact; pre-caching. Pick and explain the eliminations.', 'Scoped verify_fact. All tools = family 8; batching creates blocking dependencies; pre-caching is speculative (D2 9–11).'],
  ['Stem: review of 14 files is inconsistent. Which two families appear among the usual distractors?', 'Family 4 (bigger model/window) and family 6 (majority voting), plus shifting burden to developers. Right: per-file passes plus an integration pass (D4 20–22).'],
  ['A subagent times out. Which options belong to family 7?', 'Returning empty results as success, and terminating the whole workflow. Also the generic "search unavailable" status hides context. Right: structured error context with partial results (D5 12–14).'],
  ['Two credible sources report 23% and 31%. Options: average; use the newer; keep both annotated; drop the statistic. Which is right?', 'Keep both with source attribution and dates, marked as contested (family 12, D5 17–18). Dates may show the gap is temporal, not a contradiction.']
])}
${H.src([['CCAR-F Exam Guide v1.0 §9 sample questions (docs/_ref/exam-guide.txt)', '#/study'], ['Building effective agents', 'https://www.anthropic.com/engineering/building-effective-agents'], ['Multi-agent research system', 'https://www.anthropic.com/engineering/multi-agent-research-system'], ['Writing tools for agents', 'https://www.anthropic.com/engineering/writing-tools-for-agents'], ['Claude Code best practices', 'https://code.claude.com/docs/en/best-practices']])}`;
    }
  });

  /* ------------------------------------------------------------------ 8.4 */
  CCAR.lessons.push({
    id: 'hb-84-final-week', track: 'handbook', part: 'P8', num: '8.4', order: 804, domain: 'ALL',
    objs: [], ts: [], minutes: 30,
    title: 'Final-week plan and rapid self-test',
    summary: 'A seven-day plan built around timed practice forms and review of misses (target 80% or higher), exam-day tactics for time, flagging, multi-response items and stem keywords, and a 50-question rapid self-test weighted by domain.',
    body: function () {
      return `
<p>The last week is for converting knowledge into points, not for new material. Your previous result was 656 against a cut score of 720, which is roughly five or six more correct answers out of 60. Those points usually come from two places: objectives you scored 0% on (on your last report, for example O08, O09, O10, O13, O16, O18, O19 and O28) and avoidable misses where you knew the concept but fell for a trap family. The plan below attacks both. The practice forms in this app use a linear scaled approximation, and the real exam equates forms, so aim for <b>80% or higher on two consecutive timed forms</b> to have a margin.</p>

<h3>Exam facts that shape the plan</h3>
${H.table(['Item', 'Value'], [
  ['Items / time', '60 items, 120 minutes (2 minutes per item)'],
  ['Scenarios', '4 drawn at random from 6; each frames a set of questions'],
  ['Formats', 'Multiple choice and multiple response; each item states how many to select'],
  ['Scoring', 'Scaled 100–1,000; pass at 720; percent correct by domain on the report'],
  ['Weights', 'D1 27% (about 16 items) · D2 18% (about 11) · D3 20% (12) · D4 20% (12) · D5 15% (9)'],
  ['Reschedule', 'Up to 24 hours before the appointment; later changes forfeit the fee'],
  ['Day of', 'Government photo ID whose name matches the registration exactly; clear workspace; no notes, phones or second monitors']
])}

<h3>Seven-day plan</h3>
${H.table(['Day', 'Focus', 'Read', 'Do', 'Exit criterion'], [
  ['1', 'Baseline under exam conditions', '8.3 (trap families)', 'Timed practice exam (60 items, 120 min) from <a href="#/exams">Exams</a>. Review every miss: write the trap family number and the chapter that teaches it', 'Miss log started; weakest domain identified'],
  ['2', 'D1 depth (27%, your 0% objectives O08–O10)', '1.2, 1.3, 1.6, 1.7, 5.4 (manifests)', 'Chapter drills for each; redo any D1 misses from Day 1', '90% on the D1 drills'],
  ['3', 'D3 and D2 configuration (O13, O16, O33)', '3.1, 3.2, 3.3, 3.6, 2.3, 8.1 sections 1–6', 'Drills; from memory, write where each artifact lives (team vs personal) and one real CI command line', 'No scope or flag errors in drills'],
  ['4', 'Second timed form', '8.2 (terminology)', 'Timed practice exam; review misses; "Retry the missed" on both forms', '≥ 75%, with no repeated trap family'],
  ['5', 'D4 and D5 (O28, O22, O19, O18, O31)', '4.1, 4.3, 4.6, 5.3, 5.5, 5.6', 'Drills; weak-objective drill from the dashboard', '90% on the drills'],
  ['6', 'Third timed form', '8.1 skim', 'Timed practice exam; review misses; check the <a href="#/report">score report analysis</a>', '≥ 80% on two consecutive forms. If not, consider rescheduling (at least 24h ahead)'],
  ['7', 'Consolidate, rest', '8.4 self-test, 8.3 family table, 8.2 table', 'Self-test below out loud; re-read your miss log only; no new timed form', 'Self-test ≥ 45/50; sleep']
])}
${H.box('rule', 'How to review a miss (10 minutes each):', '1) Which option did you pick and which trap family is it? 2) Which word in the stem should have ruled it out ("first step", "guarantee", "team", "blocking", a log line)? 3) Which chapter row states the right move? 4) Write a one-line rule in your miss log. Retrying a question without steps 1–3 teaches you the answer, not the pattern.')}

<h3>Exam-day tactics</h3>
<h4>Time budget</h4>
${H.table(['Checkpoint', 'Elapsed', 'Rule'], [
  ['Item 20', '≈ 35 min', 'First pass at about 90–105 seconds per item'],
  ['Item 40', '≈ 70 min', 'Flag anything past 2 minutes; pick your best current answer before moving on'],
  ['Item 60', '≈ 105 min', 'Leaves about 15 minutes for flagged items'],
  ['Final 5 min', '115 min', 'Every item answered; no blanks. Change an answer only for a concrete reason found in the stem']
])}
<h4>Reading the stem</h4>
${H.table(['Stem signal', 'What it asks for', 'Usually wrong'], [
  ['"most effective <b>first step</b>"', 'The proportionate root-cause fix (descriptions, criteria, examples)', 'Classifier, routing layer, new infrastructure, consolidation'],
  ['"<b>guarantee</b>", "must never", "financial", "compliance"', 'Deterministic: hook, prerequisite gate, permission deny, schema', 'Prompt, CLAUDE.md, few-shot'],
  ['Logs or traces in the stem', 'The layer the log line names (for example a coordinator\'s narrow subtasks)', 'Fixing the agents that worked correctly'],
  ['"prompt already states the rule clearly"', 'Not a better prompt', 'Rewording, emphasis, CAPS'],
  ['"every developer", "when they clone", "team"', 'Project scope, committed files', '<code>~/.claude/…</code>, local scope'],
  ['"personal", "experimental"', 'User scope', 'Committed project files'],
  ['"without committing secrets"', '<code>\${VAR}</code> expansion in <code>.mcp.json</code>', 'Literal tokens, CLAUDE.md'],
  ['"blocking", "developers wait"', 'Synchronous API', 'Batch'],
  ['"overnight", "weekly", "30-hour SLA"', 'Batch, with submission-interval math', 'Real-time calls for everything'],
  ['"automatically", "regardless of location"', 'Path-scoped rules with globs', 'Skills, subdirectory CLAUDE.md, headers'],
  ['"intermittent", "sometimes catches"', 'Keep independent signals', 'Majority voting'],
  ['"most maintainable"', 'The standard mechanism with the least duplication', 'Per-directory copies, manual steps']
])}
<h4>Multi-response items</h4>
<ol class="steps">
<li>Read how many to select. Never select more or fewer.</li>
<li>Judge each option on its own as true or false for this scenario. Do not look for a "pair".</li>
<li>Keyed answers are usually <b>different layers of one fix</b> (wiring + tool list; split the work + verify totals; scoped tool + coordinator routing for the rest).</li>
<li>If two options say the same thing in different words, at most one is keyed; the other usually carries a flaw (wrong scope, fake flag).</li></ol>
<h4>Scenario framing</h4>
<p>Read each scenario introduction once and note its constraints (support: 80%+ first-contact resolution, escalate appropriately; CI: actionable feedback, few false positives; extraction: schemas, accuracy, downstream integration). Options that violate the scenario's stated goal are wrong even if technically valid.</p>
${H.box('exam', 'Terminology on the day:', 'Answer in the guide\'s terms: Task tool, <code>/memory</code>, <code>tool_choice: "any"</code>, forced tool selection, <code>fork_session</code>, skill <code>allowed-tools</code> as restriction. See 8.2.')}

<h3>Rapid self-test (50 questions)</h3>
<p>Answer out loud in under 30 seconds each, then open. Grouped by domain; counts are roughly proportional to weights.</p>

<h3>D1 · Agentic architecture and orchestration (27%): 14 questions</h3>
${H.check([
  ['1. When does the loop continue and when does it end?', 'Continue on <code>stop_reason: "tool_use"</code>; end on <code>"end_turn"</code>. Not on text presence, phrases or caps (1.1).'],
  ['2. Claude returns three tool_use blocks. How do you send results?', 'All three <code>tool_result</code> blocks, each with its <code>tool_use_id</code>, in one user message appended to full history (1.1).'],
  ['3. 12% of cases skip get_customer and misidentify accounts. Fix?', 'Programmatic prerequisite blocking lookup_order and process_refund until a verified customer ID exists. Prompts and few-shot are probabilistic (1.4).'],
  ['4. Refunds over $500 must reach a human. Mechanism?', 'PreToolUse hook that denies the call and redirects to escalate_to_human with a structured handoff (1.5).'],
  ['5. Tools return Unix timestamps, ISO 8601 and numeric status codes. Fix?', 'PostToolUse hook that normalizes results before the model sees them (1.5).'],
  ['6. Coordinator logs show "AI in digital art / graphic design / photography" for "creative industries". Root cause?', 'Coordinator decomposition too narrow. Subagents worked correctly (1.2).'],
  ['7. The synthesis subagent ignores search findings. Why?', 'Subagents do not inherit parent context. Pass complete findings, with source metadata, in the Task prompt (1.3).'],
  ['8. The coordinator never spawns subagents. First config check?', '"Task" in the coordinator\'s allowedTools (Agent tool in the current SDK), and that the agents are registered (1.3).'],
  ['9. Subagents run sequentially. Make them parallel?', 'Emit multiple Task calls in a single coordinator response (1.3).'],
  ['10. Coordinator prompt lists 12 procedural steps; subagents cannot adapt. Fix?', 'Specify research goals and quality criteria instead of steps (1.3).'],
  ['11. Predictable multi-aspect review vs "add comprehensive tests to a legacy codebase": which decomposition?', 'Prompt chaining for the review; for the open-ended task, map structure, find high-impact areas, then a prioritized plan that adapts (1.6).'],
  ['12. Compare two refactoring strategies from one expensive analysis. How?', '<code>fork_session</code> from the shared baseline; one branch per strategy (1.7).'],
  ['13. You resume after teammates changed three analyzed files. What do you tell the session? When start fresh instead?', 'Name the changed files for targeted re-analysis. Start fresh with a structured summary when most prior tool results are stale (1.7).'],
  ['14. What goes in a mid-process handoff to a human?', 'Customer ID, root cause, refund amount, what was tried, recommended action: the human has no transcript (1.4).']
])}

<h3>D2 · Tool design and MCP integration (18%): 9 questions</h3>
${H.check([
  ['15. get_customer is called for "check my order #12345"; descriptions are one line each. First step?', 'Expand descriptions: input formats, example queries, edge cases, when to use vs the similar tool (2.1).'],
  ['16. analyze_content and analyze_document overlap. Fix?', 'Rename analyze_content to extract_web_results with a web-specific description; split generic tools by purpose (2.1).'],
  ['17. A payment lookup times out and the agent says "no duplicate charge". What was wrong?', 'The timeout was returned as an empty success. Return <code>isError: true</code>, transient, isRetryable; keep valid empty results distinct (2.2).'],
  ['18. How should a policy-violation error look?', 'errorCategory business, isRetryable false, a customer-friendly explanation (2.2).'],
  ['19. An agent with 18 tools misselects. Fix?', 'Scope to the 4–5 tools its role needs, plus narrow cross-role tools for frequent needs (2.3).'],
  ['20. Synthesis needs fact checks: 85% simple, 15% deep. Design?', 'Scoped verify_fact for simple checks; complex ones go through the coordinator to the search agent (2.3).'],
  ['21. Team-shared GitHub MCP server with a token. Where and how?', 'Project <code>.mcp.json</code> with <code>"\${GITHUB_TOKEN}"</code> expansion; personal servers in <code>~/.claude.json</code> (2.4).'],
  ['22. Agent makes 30 list calls to learn the docs hierarchy. Fix?', 'Expose the catalog as an MCP resource (2.4).'],
  ['23. Edit fails: anchor text not unique. Next move? And which tool finds <code>**/*.test.tsx</code>?', 'Read + Write (or a longer unique anchor). Glob finds paths; Grep searches contents (2.5).']
])}

<h3>D3 · Claude Code configuration and workflows (20%): 10 questions</h3>
${H.check([
  ['24. A new teammate does not get the team conventions. Likely cause and check?', 'They are in <code>~/.claude/CLAUDE.md</code> (user level, not shared). Move to project CLAUDE.md; verify with <code>/memory</code> (3.1).'],
  ['25. A 600-line CLAUDE.md covers testing, API and deployment. Restructure?', 'Topic files in <code>.claude/rules/</code> (testing.md, api-conventions.md, deployment.md); @import package-specific standards (3.1).'],
  ['26. A /review command for every developer who clones the repo?', '<code>.claude/commands/</code> in the repo. Not <code>~/.claude/commands/</code>, CLAUDE.md, or <code>.claude/config.json</code> (3.2).'],
  ['27. A codebase-analysis skill floods the main session. Fix?', '<code>context: fork</code> in its frontmatter (3.2).'],
  ['28. Developers invoke a skill without the required ticket ID. Fix?', '<code>argument-hint</code> frontmatter (3.2).'],
  ['29. Terraform conventions only when editing Terraform files?', '<code>.claude/rules/</code> file with <code>paths: ["terraform/**/*"]</code> (3.3).'],
  ['30. Test files sit next to source everywhere. Rule or subdirectory CLAUDE.md?', 'Rule with <code>paths: ["**/*.test.tsx"]</code>: glob rules span directories (3.3).'],
  ['31. Library migration across 45+ files vs adding a date validation conditional?', 'Plan mode, then execute the plan; direct execution for the conditional (3.4).'],
  ['32. The CI job hangs waiting for input. Fix? What else belongs on that command line?', '<code>claude -p</code>; plus <code>--output-format json --json-schema</code> for PR comments and caps such as <code>--max-turns</code> (3.6).'],
  ['33. Re-running review after new commits posts duplicate comments. Fix?', 'Include prior findings; ask for only new or still-unaddressed issues (3.6).']
])}

<h3>D4 · Prompt engineering and structured output (20%): 9 questions</h3>
${H.check([
  ['34. "Be conservative" did not reduce style nitpicks. Fix?', 'Explicit categorical criteria: report bugs and security, skip minor style and local patterns (4.1).'],
  ['35. One finding category has a high false-positive rate and developers ignore everything. Fix?', 'Temporarily disable that category while improving its prompt (4.1).'],
  ['36. Output format varies despite detailed instructions. Fix?', 'Few-shot examples showing location, issue, severity, suggested fix (4.2).'],
  ['37. Document type unknown, several extraction schemas, text replies break the pipeline. Exam answer and current-model answer?', 'Exam: <code>tool_choice: "any"</code>. On Opus 5.5 / Sonnet 5.5 / Fable 5.1: <code>auto</code> + strict tool use or <code>output_config.format</code> (4.3, 8.2).'],
  ['38. The model invents PO numbers for invoices that have none. Fix?', 'Make the field nullable/optional; add "unclear" / "other" + detail where categories are open (4.3).'],
  ['39. Extraction JSON is cut off with <code>stop_reason: "max_tokens"</code>. Fix?', 'Split into smaller scoped calls (per section or file) and merge; not a bigger max_tokens (4.3).'],
  ['40. Line items do not sum to the total under a strict schema. When will a retry help and when not?', 'Validate semantics (calculated_total vs stated_total) and retry with the document, failed output and specific errors. Retries fail when the data is absent from the source (4.4).'],
  ['41. 30-hour SLA using batch. Submission interval, and failed documents?', 'Every 4 hours (4 + 24 = 28h). Resubmit only failed custom_ids, chunking oversized documents (4.5).'],
  ['42. Generated code reviewed in the same session misses subtle bugs. Fix?', 'Independent review instance without the generator\'s reasoning context (4.6).']
])}

<h3>D5 · Context management and reliability (15%): 8 questions</h3>
${H.check([
  ['43. Summaries turned "$214.37, 14 June" into "about $200". Fix?', 'Persistent case facts block included in every prompt, outside summarized history (5.1).'],
  ['44. Findings in the middle of an aggregated input are dropped. Fix?', 'Key-findings summary at the top; detailed results under explicit section headers (5.1).'],
  ['45. First message: "I want to talk to a person." Action?', 'Escalate immediately, without investigating first (5.2).'],
  ['46. get_customer returns three matches for the name. Action?', 'Ask for an additional identifier; never pick heuristically (5.2).'],
  ['47. A search subagent times out. What does it return?', 'Structured error context: failure type, attempted query, partial results, alternatives. Coordinator proceeds and annotates coverage gaps (5.3).'],
  ['48. Hours into exploration, answers cite "typical patterns". Fix? And crash recovery?', 'Scratchpad of findings, subagents for specific questions, <code>/compact</code>, phase summaries into new subagents. Crash recovery: state exports plus a manifest the coordinator loads (5.4).'],
  ['49. 97% overall accuracy; the team wants to cut human review. First?', 'Segment accuracy by document type and field; calibrate field-level confidence on a labeled set; stratified sampling of high-confidence items (5.5).'],
  ['50. Two credible sources give different statistics. Synthesis?', 'Keep both with attribution and dates; mark as contested; separate established from contested findings (5.6).']
])}

${H.box('decision', 'Scoring your self-test:', '45 or more: you are ready; keep Day 7 light. 40–44: re-read the chapter rows for every miss and redo the matching drill. Under 40: another timed form and review cycle before you sit the exam.')}
${H.src([['CCAR-F Exam Guide v1.0 (docs/_ref/exam-guide.txt)', '#/study'], ['Anthropic Academy', 'https://anthropic.skilljar.com'], ['Claude Code docs', 'https://code.claude.com/docs'], ['Claude Developer Platform docs', 'https://platform.claude.com/docs']])}`;
    }
  });
})();
