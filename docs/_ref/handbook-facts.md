# Handbook facts (verified against current Anthropic docs, 2026-09-29)

Supplements facts.md. Use ONLY these, facts.md and exam-guide.txt when writing handbook lessons. If a fact is not here, do not invent it (especially CLI flags, field names, numbers).

## Models (platform.claude.com/docs/en/about-claude/models/overview)
- Current lineup: Claude Fable 5.1 (demanding reasoning, long-horizon agentic; $10/$50 per MTok in/out), Claude Opus 5.5 (recommended starting point for most workloads; long-running agentic coding & knowledge work; $4/$20), Claude Sonnet 5.5 (speed + intelligence; $2/$10), Claude Haiku 4.5 (fastest; $1/$5).
- Context window: 1M tokens for Fable 5.1, Opus 5.5, Sonnet 5.5; 200K for Haiku 4.5. Max output: 128K (Fable/Opus/Sonnet), 64K (Haiku 4.5). Batch requests can use a beta header for up to 300K output on some models.
- Thinking: adaptive thinking; on Fable 5.1 / Opus 5.5 thinking is always on (adaptive only). Haiku 4.5 uses manual extended thinking. The Models API returns max_input_tokens, max_tokens and capabilities per model.
- Model choice rule of thumb (docs): start with Opus 5.5; move up to Fable 5.1 when evals at higher effort still fall short; Sonnet 5.5 / Haiku 4.5 for cost/latency-sensitive or high-volume subtasks (e.g. subagents doing simple lookups). Always decide with your own evals.

## Effort & thinking (build-with-claude/adaptive-thinking, effort)
- `effort` levels: low, medium, high (default on most models), xhigh, max. Default on Opus 5.5 is medium. Effort is the primary lever for how often/deeply Claude thinks; no level guarantees a thinking block every turn.
- Don't build logic assuming every assistant turn starts with a thinking block.
- Interleaved thinking (thinking between tool calls) is automatic.
- `budget_tokens` (manual extended thinking) is deprecated on 4.6 and returns 400 on Claude 4.7+; use effort, and max_tokens as the hard ceiling.
- Agent SDK: `effort` option at query level or per AgentDefinition (e.g. "low" for simple lookup subagents).

## Tool choice on current models (agents-and-tools/tool-use/define-tools) — EXAM vs CURRENT DOCS DIVERGENCE
- tool_choice options: auto (default with tools), any, tool (forced), none (default without tools).
- With `any`/`tool` the API prefills the assistant turn, so no natural-language text precedes the tool_use block.
- Manual extended thinking (`thinking: {type:"enabled"}`) is incompatible with any/tool (error).
- **Claude Opus 5.5, Sonnet 5.5, Fable 5.1 (and Mythos 5.1) return 400 for tool_choice any/tool.** Docs: use `auto` + strict tool use (`strict: true`) to guarantee schema-valid inputs, or structured outputs (`output_config.format`) for a fixed JSON response; prompting still steers which tool auto picks. Haiku 4.5 and older models still support forced tool choice.
- Exam guide still teaches `tool_choice: "any"` / forced tool as THE way to guarantee a tool call. For exam answers choose the guide's mechanism; in real work on the newest models use structured outputs / strict tool use / programmatic gating (e.g. only expose the prerequisite tool on the first call).
- Tool definition: name (^[a-zA-Z0-9_-]{1,128}$), description ("by far the most important factor"; aim 3–4+ sentences: what, when/when not, each parameter, caveats/what it does not return), input_schema, optional input_examples (schema-validated examples; not for server tools), strict, cache_control, defer_loading.
- Docs best practices: consolidate related operations (action parameter) to reduce selection ambiguity; namespace names by service (github_list_prs, slack_send_message); return only high-signal fields and semantic stable identifiers.
- Tools add a hidden tool-use system prompt (~286 tokens on Opus/Sonnet 5.5) plus schemas.
- Client tools (you execute; stop_reason "tool_use") vs server tools (Anthropic executes: web_search, web_fetch, code_execution, tool_search, MCP connector, advisor). Anthropic-schema client tools: bash, text_editor, memory, computer use.
- Tool Runner in client SDKs can drive the loop for you.

## Structured outputs (build-with-claude/structured-outputs)
- Two features: JSON outputs (`output_config.format` with type "json_schema"; response in text block) and strict tool use (`strict: true`; tool names/inputs schema-valid). Constrained decoding → always valid JSON, required fields present, correct types. Some JSON Schema constraints unsupported (min/max, minLength…); SDKs (Pydantic `client.messages.parse()`, Zod) strip them, add descriptions and validate afterwards.
- Still no guarantee of semantic correctness (sums, wrong field, fabricated values) → validate in code.
- Prefill of the last assistant turn is NOT supported from Claude 4.6 onward (400 error). Earlier models still allow it.
- Agent SDK result subtype `error_max_structured_output_retries` exists when structured output validation keeps failing.

## Prompt caching (build-with-claude/prompt-caching)
- Prefix order tools → system → messages. Changing tools invalidates everything; changing system invalidates system+messages; tool_choice/images/thinking config/effort changes invalidate message cache.
- Up to 4 explicit `cache_control` breakpoints; automatic caching = top-level cache_control, moves breakpoint to last cacheable block. 20-block lookback window.
- Default TTL 5 min (refreshed free on each hit); 1-hour TTL option (2× base input write). 5-min writes cost 1.25× base input; reads 0.1× (0.05× on Opus 5.5; 0.025× on Fable 5.1).
- Minimum cacheable length: 512 tokens (Opus 5.5, Sonnet 5.5, Fable 5.1), 4,096 (Haiku 4.5). Shorter prompts silently not cached (check usage.cache_creation_input_tokens / cache_read_input_tokens).
- Put the breakpoint on the LAST block that is identical across requests — never on a block with timestamps/per-request data.
- Cache entry available only after first response begins → for parallel fan-out, send one request first, then the rest.
- Pre-warm with `max_tokens: 0`. Cache hits don't count against rate limits (1h cache helps utilization). Stable JSON key ordering matters.
- Batches + caching discounts stack; batch cache hits are best effort (30–98%).
- Agent SDK / Claude Code auto-cache stable prefixes (system prompt, tool defs, CLAUDE.md).

## Context management features (build-with-claude/context-editing, engineering posts)
- Context editing (server-side): tool result clearing `clear_tool_uses_20250919` (clears oldest tool results past a threshold, leaves placeholder; `clear_at_least` so cache invalidation is worth it), thinking block clearing `clear_thinking_20251015`. Client keeps full history.
- Compaction: server-side compaction preferred; client-side SDK compaction with tool_runner. Claude Code / Agent SDK auto-compact near limit, emit `compact_boundary`; early instructions may be lost → persistent rules belong in CLAUDE.md (re-injected). Compaction instructions can be put in CLAUDE.md; PreCompact hook can archive transcript. `/compact <instructions>`.
- Memory tool (Anthropic-schema client tool): file-based memory outside the context window.
- "Context rot": recall degrades as tokens increase; context is a finite "attention budget". Goal: smallest set of high-signal tokens.
- Just-in-time retrieval: keep lightweight identifiers (paths, queries, links) and load on demand; Claude Code is hybrid (CLAUDE.md up front, grep/glob just in time).
- Long-horizon techniques: compaction (conversational flow), structured note-taking (NOTES.md, progress files; milestones), sub-agent architectures (each returns condensed 1,000–2,000-token summary).
- Long-running harness (engineering/effective-harnesses-for-long-running-agents): initializer agent creates init.sh, progress file (claude-progress.txt), feature list, initial git commit; each coding session makes incremental progress on one feature and leaves a clean, committed state. Failure modes: one-shotting everything; later agent declaring done prematurely.
- Prompting docs for multi-window work: first window sets up framework (tests, setup scripts); track tests in structured file (tests.json); git for state; starting fresh + reading progress files can beat compaction.

## Agent SDK (code.claude.com/docs/en/agent-sdk/*)
- Agent SDK = Claude Code's loop/tools/context management as a library (Python, TypeScript). Alternatives: Claude Code CLI (interactive / `-p`), Client SDK (raw Claude API, you write the loop or use Tool Runner), Managed Agents (Anthropic-hosted harness).
- Loop: SystemMessage(init) → AssistantMessage per content block → tools run → UserMessage with tool results → repeat until response with no tool calls → ResultMessage (result, usage, total_cost_usd, num_turns, session_id, stop_reason). Iterate stream to completion.
- ResultMessage subtypes: success, error_max_turns, error_max_budget_usd, error_during_execution, error_max_structured_output_retries. `result` only on success. stop_reason "refusal" detects refusals.
- `maxTurns` counts tool-use turns; `maxBudgetUsd` includes subagent spend. Good production default: set a budget.
- Built-in tools: Read, Edit, Write, Glob, Grep, Bash, WebSearch, WebFetch, ToolSearch, Agent (subagents), Skill, AskUserQuestion, TaskCreate/TaskUpdate.
- Permissions: `allowedTools` = auto-approve (unlisted tools still available and fall to permissionMode/canUseTool); `disallowedTools` = block regardless; `permissionMode` default|acceptEdits|plan|dontAsk|auto|bypassPermissions (bypass in TS needs allowDangerouslySkipPermissions; only for isolated envs). dontAsk = fixed explicit tool surface for headless agents (hard deny instead of prompt). canUseTool callback for custom approval UI.
- Rule evaluation (Claude Code permissions): deny → ask → allow; first match wins; specificity doesn't matter; allow cannot carve exception from deny; deny at any scope beats allow anywhere; managed settings can't be overridden. Bare tool deny (e.g. "Bash") removes the tool from context; scoped deny blocks matching calls. PreToolUse hook exit 2 blocks even if allow rule matches; hook "allow" cannot bypass deny/ask rules.
- Parallel execution: read-only tools (Read, Glob, Grep, MCP tools with readOnlyHint) run concurrently; state-modifying (Edit, Write, Bash) sequential. Custom tools sequential unless readOnlyHint annotation.
- Context costs: system prompt, CLAUDE.md (via settingSources), tool definitions (MCP schemas deferred via tool search by default), history, skill descriptions (full content on invoke).
- Sessions: capture session_id; resume restores full context; fork to branch; session_store adapter for stateless/serverless hosts.
- Hooks run in your process (no context cost): PreToolUse, PostToolUse, UserPromptSubmit, Stop, SubagentStart/SubagentStop, PreCompact, SessionStart, etc.
- Subagents: programmatic `agents` option (recommended), filesystem `.claude/agents/*.md`, built-in general-purpose. Invoked via Agent tool (exam guide: Task). Messages from inside a subagent carry parent_tool_use_id. Programmatic definitions override filesystem ones with same name.
- AgentDefinition fields: description (req), prompt (req), tools (omit = inherit all), disallowedTools (supports mcp__server__*), model ('fable'|'opus'|'sonnet'|'haiku'|'inherit'|ID), skills (preloaded), memory, mcpServers, maxTurns (partial output marked), background, effort, permissionMode, omitClaudeMd (TS), initialPrompt.
- Non-fork subagent receives: its own prompt + Agent-tool prompt string, project CLAUDE.md (unless omitClaudeMd), tool definitions, listed skills. Does NOT receive parent conversation, tool results, or parent system prompt. Forks inherit parent conversation. Only the final message returns to the parent.
- Subagents default to background execution; Claude sets run_in_background:false when it needs the result. Built-in Explore and Plan agents are one-shot (no agentId to resume); resume custom agents via session resume + agentId.
- Caps: CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH (default 3), CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS (default 20), maxBudgetUsd. Opus 5 delegates readily → set limits.
- Dynamic workflows (Workflow tool): script-driven orchestration for dozens–hundreds of agents; subagents for a few delegated tasks per turn.
- Troubleshooting non-delegation: mention subagent by name; write clear specific description.

## Claude Code (best-practices, features-overview, permissions, security, github-actions)
- Core constraint: context window fills fast and performance degrades as it fills.
- Give Claude a way to verify its work (tests, build exit codes, linters, screenshots); options: in-prompt, /goal condition, Stop hook deterministic gate, verification subagent (fresh context).
- Workflow: explore → plan → implement → commit; plan mode separates exploration from execution. Interview pattern: have Claude interview you and write a spec, then implement in a fresh session.
- CLAUDE.md: include commands Claude can't guess, non-default style rules, test instructions, repo etiquette, architecture decisions, env quirks, gotchas; exclude what code reveals, standard conventions, long docs, frequently changing info. Keep under ~200 lines; bloat makes Claude ignore rules; "IMPORTANT" emphasis sparingly. /context confirms loading. /doctor proposes cuts.
- Feature layering: CLAUDE.md additive; skills override by name (managed > user > project); subagents override by name (managed > CLI flag > project > user > plugin); MCP servers override by name (local > project > user); hooks merge (all fire).
- Context cost by feature: CLAUDE.md every request; skills descriptions every request, full on use (disable-model-invocation hides it entirely until invoked); MCP tool names at start, schemas on demand (tool search); subagents isolated; hooks zero unless output.
- Adoption triggers: mistake twice → CLAUDE.md; same prompt repeatedly → user-invocable skill; same playbook pasted 3rd time → skill; copying data from a system → MCP; side task floods context → subagent; must happen every time → hook; second repo needs same setup → plugin.
- Skill vs subagent: skill = reusable content loaded into a context; subagent = isolated worker returning summary. Combine: subagent `skills:` preload; skill `context: fork`.
- Hook vs skill: hook deterministic, zero context; skill interpreted. "Put guardrails in hooks."
- Output styles: role/tone/format per session (not facts).
- Plugins bundle skills, hooks, subagents, MCP servers; namespaced skills (/plugin:skill).
- Session hygiene: Esc to stop; Esc+Esc or /rewind for checkpoints (restore conversation/code/both, summarize from here); /clear between unrelated tasks; after two failed corrections, /clear and re-prompt; /compact <instructions>; /btw for side questions that don't enter history. Checkpoints snapshot files before each change.
- Non-interactive: `claude -p`, output text|json|stream-json; sessions persist unless --no-session-persistence. Fan-out: loop `claude -p` over files, or /batch (5–30 subagents in worktrees). Writer/Reviewer pattern across sessions; adversarial review in fresh subagent; bundled /code-review skill.
- Permission modes: default (labeled Manual), acceptEdits, plan, auto (classifier reviews actions), dontAsk, bypassPermissions. `permissions.disableBypassPermissionsMode` / `disableAutoMode` (managed). "Yes, don't ask again" saves to .claude/settings.local.json.
- Sandboxing (/sandbox): OS-level filesystem + network isolation for Bash; complements permissions (defense in depth vs prompt injection).
- Project allow rules and .mcp.json servers require workspace trust in interactive sessions; `claude -p`/SDK never shows trust dialog → for untrusted repos use `--setting-sources user`, `--bare`, `--settings '{"disableAllHooks": true}'`.
- Prompt-injection protections: permission system, network commands (curl/wget) not auto-approved, WebFetch uses separate context window, trust verification for new codebases/MCP servers, command-injection detection. Best practice: review commands, avoid piping untrusted content, use VMs/sandboxes for untrusted web interaction.
- MCP security: only trusted servers; Anthropic doesn't security-audit MCP servers.
- GitHub Actions: `anthropics/claude-code-action@v1`; quick setup `/install-github-app`; interactive mode (@claude mention, no prompt input) vs automation mode (prompt input, any event incl. schedule); `claude_args` passes CLI flags (--max-turns, --model, --allowedTools, --mcp-config, --append-system-prompt); secrets ANTHROPIC_API_KEY or CLAUDE_CODE_OAUTH_TOKEN; OIDC/workload identity federation or Bedrock/Vertex/Foundry to avoid static creds; only users with write access trigger; bots blocked unless allowed_bots; CLAUDE.md defines review standards; cost controls: --max-turns, workflow timeouts, concurrency. Fork PRs don't get secrets on public repos.

## MCP spec (modelcontextprotocol.io/specification/latest)
- JSON-RPC 2.0. Roles: host (LLM app), client (connector inside host, one per server), server (exposes capabilities).
- Server features: Resources (context/data, application/user-driven; URIs; resource templates RFC 6570; subscriptions), Prompts (user-invoked templated messages/workflows), Tools (model-controlled functions). Client features: elicitation (server asks user for info via client; form or URL mode), sampling (server requests an LLM completion via client; client keeps human in the loop), roots (file:// boundaries the server may operate on).
- Transports: stdio (client launches subprocess; newline-delimited JSON-RPC) and Streamable HTTP (POST to one endpoint; reply JSON or request-scoped SSE). Latest revision is stateless per request (protocol version + client capabilities in each request's _meta); earlier revisions used an initialize handshake / connection session — clients fall back for older servers.
- Tool definition: name, title, description, inputSchema (JSON Schema, default 2020-12), optional outputSchema, annotations (readOnlyHint, destructiveHint, idempotentHint, openWorldHint — hints; untrusted unless server trusted). Results: `content` blocks (text, image, audio, resource_link, embedded resource) and/or `structuredContent` (must conform to outputSchema; also serialize to text for back-compat).
- Two error channels: protocol errors (JSON-RPC error: unknown tool, malformed request) vs tool execution errors (`isError: true` in result: API failures, input validation, business logic) — the latter should be given to the model for self-correction.
- Stateful tools: no protocol-level session → return an explicit handle (e.g. basket_id) and accept it on later calls; validate authorization per call; state lifetime in description; expired handle → tool execution error.
- Tool list should be deterministic order (helps prompt cache). listChanged notifications.
- Security: servers MUST validate inputs, access control, rate limit, sanitize outputs; clients SHOULD confirm sensitive ops, show inputs, validate results, timeouts, audit logs. Hosts must get user consent before invoking tools / exposing data.
- Claude API also has an MCP connector (remote MCP servers from Messages API) and Claude Code tool search defers MCP schemas.

## Tool-writing guidance (anthropic.com/engineering/writing-tools-for-agents)
- Tools are a contract between deterministic systems and non-deterministic agents. Don't just wrap every API endpoint. Build few, thoughtful tools for high-impact workflows (search_contacts not list_contacts; schedule_event; search_logs; get_customer_context consolidating several calls).
- Namespacing by service/resource (asana_search, jira_search; asana_projects_search).
- Return meaningful context: natural-language names over opaque UUIDs; `response_format` enum (concise|detailed) — concise ≈ 1/3 tokens.
- Token efficiency: pagination, range selection, filtering, truncation with sensible defaults; Claude Code caps tool responses at 25,000 tokens by default; truncation messages should steer toward targeted searches; error messages should be specific and actionable (not tracebacks/opaque codes).
- Prompt-engineer descriptions like onboarding a new hire; unambiguous parameter names (user_id not user). Small description refinements yield big gains.
- Evaluate tools with realistic multi-call tasks; track accuracy, runtime, number of tool calls, tokens, tool errors; read transcripts; held-out test sets.

## Evals (anthropic.com/engineering/demystifying-evals-for-ai-agents)
- Terms: task, trial, grader, transcript, outcome (final environment state, e.g. DB row exists — not what agent claims), evaluation harness, agent harness, suite.
- Graders: code-based (fast, cheap, objective; brittle), model-based (rubrics, pairwise, flexible; needs calibration vs humans; give "Unknown" out; one isolated judge per dimension), human (gold standard; calibrate model graders).
- Capability evals (start low, hill-climb) vs regression evals (~100% pass; guard backsliding; saturated capability evals graduate to regression).
- pass@k (at least one success in k) vs pass^k (all k succeed; customer-facing consistency). 75% per trial → pass^3 ≈ 42%.
- Roadmap: start early with 20–50 tasks from real failures; unambiguous tasks with reference solutions (0% pass@100 usually = broken task); balanced sets (should AND should-not cases); isolated clean environments; grade outcomes not paths; partial credit; read transcripts; watch saturation; eval-driven development; combine with production monitoring, A/B tests, user feedback, transcript review, human studies (Swiss-cheese model).

## Prompting best practices (platform docs claude-prompting-best-practices)
- Be clear and direct (brilliant new employee; "golden rule": colleague test); give context/motivation; numbered steps when order matters.
- Examples: relevant, diverse, wrapped in <example>/<examples> tags. Few-shot works with thinking (show reasoning in examples).
- XML tags to separate instructions, context, examples, input; nest documents <document index> with <document_content>, <source>.
- Role in system prompt.
- Long context (20k+): put long documents at the TOP, query/instructions at the end; wrap docs + metadata in XML; ask Claude to quote relevant parts first (ground in quotes).
- Tell Claude what to do instead of what not to do; match prompt style to desired output.
- Latest models follow instructions precisely: say "implement" not "suggest"; dial back aggressive "CRITICAL: MUST" language (causes overtriggering).
- Parallel tool calling is default & steerable.
- Prefer general instructions ("think thoroughly") over hand-written step lists for reasoning; ask for self-check against criteria (except Opus 5 which over-verifies).
- Agentic: long-horizon state tracking; structured state (JSON) + unstructured progress notes + git; ask for confirmation before irreversible actions if desired.

## Message Batches (build-with-claude/batch-processing) — additions
- Limits: 100,000 requests or 256 MB per batch; most finish < 1h; expire at 24h; results 29 days; results .jsonl, unordered → custom_id (1–64 chars, ^[a-zA-Z0-9_-]{1,64}$).
- Result types: succeeded, errored (not billed), canceled (not billed), expired (not billed).
- Not supported in batch: stream, fast mode speed, max_tokens 0. Server tools DO work (server-side loop, may return pause_turn); client-tool round trips (your code executing tools mid-request) are not possible — this is the exam's "no multi-turn tool calling within a single request".
- Best practice: dry-run one request shape with Messages API first; meaningful custom_ids; split very large datasets.
