# Verified facts for question authoring (checked against Anthropic docs, Sept 2026)

Primary sources: CCAR-F Exam Guide v1.0 (docs/_ref/exam-guide.txt), code.claude.com/docs (CLI reference, memory, skills, hooks, settings, agent-sdk), platform.claude.com/docs, anthropic.com/engineering/multi-agent-research-system.

## Terminology: exam guide vs current docs (questions must follow the EXAM GUIDE framing)
- Exam guide: subagents are spawned with the **Task** tool and the coordinator's `allowedTools` must include "Task". Current SDK: the tool is named **Agent** (formerly Task). In questions, use "Task tool" (you may add "(Agent tool in current SDK)" in explanations).
- Exam guide: `/memory` verifies which memory files are loaded. Current docs: `/memory` lists/opens memory files; `/context` shows exactly what is loaded. Either can appear in explanations; the exam-correct answer for "verify which memory files are loaded" is `/memory`.
- Exam guide: skill `allowed-tools` frontmatter "restricts tool access during skill execution". Current docs: `allowed-tools` pre-approves tools; `disallowed-tools` removes tools. For exam answers, treat allowed-tools as the mechanism for limiting a skill's tools.
- Current SDK `allowedTools` = auto-approve list; `tools` / `disallowedTools` restrict availability. Exam guide wiring rule: coordinator needs "Task" in allowedTools. Don't write questions whose answer depends on this nuance, except the exam-guide rule itself.

## Agentic loop (Claude API)
- stop_reason values: "end_turn", "tool_use", "max_tokens", "stop_sequence", "pause_turn", "refusal". Loop continues on "tool_use", ends on "end_turn".
- Tool results are sent back as `tool_result` blocks (with matching tool_use_id) in the next user message; all results for parallel tool calls go in ONE user message.
- Anti-patterns: parsing natural-language "I'm done", iteration caps as the primary stop mechanism, checking for text content as completion signal.
- tool_choice: {"type":"auto"} (may answer in text), {"type":"any"} (must call some tool), {"type":"tool","name":"X"} (must call X), {"type":"none"}.
- Structured outputs: tool use with JSON schema is most reliable (strict tool use `strict: true`; JSON outputs via `output_config.format`). Eliminates syntax errors, NOT semantic errors (sums don't match, wrong field).
- Prefilling the assistant turn is NOT supported on Claude 4.6 and later models (platform docs). Prompt-only JSON is least reliable.
- max_tokens hit => stop_reason "max_tokens" => truncated JSON/tool input. Fix: split into smaller scoped calls (per file / per section) and merge results; not "just raise max_tokens" (output ceilings, attention dilution).

## Message Batches API
- 50% cost savings, up to 24h processing window, no latency SLA, `custom_id` correlates results (results are not guaranteed in order), poll for completion, results available for 29 days, no multi-turn tool calling inside one request.
- Good: overnight reports, weekly audits, nightly test generation, backfills. Bad: blocking pre-merge checks, live support.
- SLA math: worst case latency = time a document waits for the next submission + 24h batch window (+ buffer for retries). With a 30h SLA, submission interval must be < 6h; the exam guide uses 4-hour submission windows (4 + 24 = 28h ≤ 30h, leaving 2h buffer).
- Failures: resubmit only failed custom_ids with fixes (e.g., chunk oversized docs). Refine prompt on a sample first.

## Claude Code CLI (current reference)
- `-p/--print` non-interactive. `--output-format text|json|stream-json`. `--json-schema '<schema>'` validated structured output (print mode).
- `--max-turns N` (print mode), `--max-budget-usd 5.00` (print mode) — runaway protection.
- `--permission-mode default|acceptEdits|plan|auto|dontAsk|bypassPermissions`. `--dangerously-skip-permissions` = bypassPermissions.
- `--allowedTools "Bash(git diff *)" "Read"` (auto-approve without prompting), `--disallowedTools "Edit"` (removes/denies), `--tools "Read,Grep,Glob"` restricts built-ins.
- `--resume <id|name>`, `-n/--name <name>` to name a session, `--continue/-c` most recent, `--fork-session` (with --resume/--continue) creates new session ID branch.
- `--append-system-prompt`, `--system-prompt`, `--mcp-config`, `--strict-mcp-config`, `--bare` (skip auto-discovery of CLAUDE.md, hooks, skills, MCP), `--agents '<json>'`, `--add-dir`.
- NON-EXISTENT (good distractors): `--batch`, `--headless`, `CLAUDE_HEADLESS=true`, `--non-interactive`, `--ci`, `--max-cost`, `.claude/config.json` commands array.

## CLAUDE.md & rules
- Locations: managed policy CLAUDE.md (org), `~/.claude/CLAUDE.md` (user, not shared), `./CLAUDE.md` or `./.claude/CLAUDE.md` (project, shared via VCS), `./CLAUDE.local.md` (personal per-project, gitignored), subdirectory CLAUDE.md (loaded on demand when Claude reads files there).
- Files are concatenated, not overriding; more specific read later.
- `@path/to/file` imports; relative to the importing file; max depth four hops. Imports still load at launch (organization, not context savings).
- `.claude/rules/*.md`: without `paths` frontmatter → loaded at launch like CLAUDE.md; with `paths: ["src/api/**/*", "**/*.test.tsx"]` → loaded only when Claude reads matching files. `paths` is the only frontmatter field for rules. `~/.claude/rules/` = user-level rules.
- CLAUDE.md is context, not enforcement. To block actions deterministically → hooks (PreToolUse) or settings permissions (deny).
- CLAUDE.md target < 200 lines. Project-root CLAUDE.md is re-injected after /compact.

## Skills & commands
- Skills: `.claude/skills/<name>/SKILL.md` (project, shared), `~/.claude/skills/<name>/SKILL.md` (personal). Personal beats project on same name → create personal variants with DIFFERENT names to avoid shadowing teammates' expectations.
- Commands: `.claude/commands/*.md` (project), `~/.claude/commands/` (personal); older format, still works; skill wins on name clash.
- Frontmatter: name, description (used for auto-invocation), when_to_use, argument-hint, arguments, disable-model-invocation, user-invocable, allowed-tools, disallowed-tools, model, effort, context: fork, agent (subagent type when forked), hooks, paths.
- `context: fork` runs the skill in an isolated subagent context → verbose output doesn't pollute the main session.
- Skills = on-demand, task-specific; CLAUDE.md = always loaded universal standards. `$ARGUMENTS`, `$0`.

## Hooks (Claude Code settings / Agent SDK)
- Configured in settings.json (`hooks` key) — user, project (.claude/settings.json), local; also in skill/agent frontmatter; Agent SDK `hooks` option with callbacks.
- Events: PreToolUse, PostToolUse, PostToolUseFailure, UserPromptSubmit, Stop, SubagentStart, SubagentStop, SessionStart, SessionEnd, PreCompact, PostCompact, Notification, PermissionRequest, etc.
- Command hook exit code 2 = block (PreToolUse blocks the tool call; stderr fed to Claude). PreToolUse JSON `permissionDecision: allow|deny|ask|defer`, can rewrite `updatedInput`. PostToolUse can replace result with `updatedToolOutput` (normalization) or add context.
- Hooks = deterministic guarantees. Prompts/CLAUDE.md = probabilistic.

## Settings & permissions
- `~/.claude/settings.json` (user), `.claude/settings.json` (project, committed), `.claude/settings.local.json` (personal project, gitignored), managed settings (org, highest).
- Precedence: managed > CLI args (--settings etc.) > local > project > user. Permission arrays merge across scopes. `permissions.allow/ask/deny`; deny wins. Rule syntax: `Bash(npm run test *)`, `Read(./.env)`, `Edit(src/**)`, `mcp__github__*`.

## Subagents
- Claude Code: `.claude/agents/*.md` (project), `~/.claude/agents/` (user), frontmatter name, description, tools, model... Built-ins: Explore (read-only, fast discovery), Plan, general-purpose.
- Agent SDK AgentDefinition: `description` (required; used for automatic routing), `prompt` (required; system prompt), `tools` (optional; omitted = inherits all), `disallowedTools`, `model` ('sonnet'|'opus'|'haiku'|'inherit'|id), `skills`, `mcpServers`, `maxTurns`, `background`...
- Subagents do NOT inherit parent conversation, tool results, or parent system prompt. Only the Task/Agent prompt string passes context. (Forks are the exception: a fork inherits the conversation.)
- Parallel subagents: coordinator emits multiple Task calls in ONE response.
- Common misconfigs: coordinator's allowedTools lacks "Task"; subagent `tools` omits the tool it needs (e.g., WebSearch) or includes too many; vague/overlapping `description` so coordinator never routes to it; subagent defined but not registered in the `agents` option passed to query(); expecting subagent to "see" earlier findings not included in prompt; MCP server not listed in the subagent's mcpServers.

## MCP
- Scopes: project `.mcp.json` (committed, team-shared), user (in `~/.claude.json`, personal across projects), local (in `~/.claude.json` for this project only; default for `claude mcp add`). `claude mcp add --scope project|user|local`.
- Env var expansion in .mcp.json: `${GITHUB_TOKEN}`, `${VAR:-default}`.
- Tools from all configured servers are discovered at connection and available simultaneously. Tool names: `mcp__<server>__<tool>`.
- Primitives: tools (model-controlled actions), resources (application-exposed data/catalogs, URIs), prompts (user-invoked templates).
- Errors: tool result with `isError: true`; include structured metadata (errorCategory transient|validation|business|permission, isRetryable, human-readable message). Empty result ≠ failure.
- Prefer community servers (Jira, GitHub) over custom for standard integrations.

## Anthropic engineering: multi-agent research system (orchestrator-worker)
- Lead agent plans, saves plan to Memory (context > 200k tokens gets truncated), spawns 3–5 subagents in parallel; subagents use 3+ tools in parallel; cut research time up to 90%.
- Each subagent needs: objective, output format, tool/source guidance, clear task boundaries (vague "research X" → duplication/gaps).
- Scale effort: simple fact = 1 agent 3–10 calls; comparisons 2–4 subagents; complex >10 subagents.
- Multi-agent ≈ 15× tokens of chat; best for breadth-first, parallelizable, high-value tasks; poor fit for tightly coupled tasks (most coding).
- CitationAgent attributes claims at the end. Subagents write artifacts to filesystem and pass lightweight references ("avoid game of telephone").
- Resume from checkpoints rather than restart; errors compound.
- "Building effective agents" workflows: prompt chaining (sequential), routing, parallelization (sectioning/voting), orchestrator-workers, evaluator-optimizer.

## Human review / confidence
- Aggregate accuracy (97%) can hide weak document types/fields → segment by doc type & field.
- Field-level confidence calibrated on labeled validation set; route low-confidence / contradictory / ambiguous to humans; stratified random sampling of HIGH-confidence items to measure ongoing error rate and catch novel errors.
- Self-reported confidence and sentiment are poor escalation proxies for case complexity.
