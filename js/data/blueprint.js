/* CCAR-F blueprint: domains, scenarios, objectives (mapped to the candidate's score report), exam forms.
   Source of truth: Claude Certified Architect – Foundations Exam Guide v1.0 (July 2026) + current Anthropic docs. */
window.CCAR = window.CCAR || {};

CCAR.PASS_SCALED = 720;
CCAR.PREVIOUS_ATTEMPT = { date: '2026-09-22', scaled: 656, result: 'Fail' };

CCAR.DOMAINS = [
  { id: 'D1', name: 'Agentic Architecture & Orchestration', weight: 27, color: '#d97757' },
  { id: 'D2', name: 'Tool Design & MCP Integration', weight: 18, color: '#6a9bcc' },
  { id: 'D3', name: 'Claude Code Configuration & Workflows', weight: 20, color: '#788c5d' },
  { id: 'D4', name: 'Prompt Engineering & Structured Output', weight: 20, color: '#b07cc6' },
  { id: 'D5', name: 'Context Management & Reliability', weight: 15, color: '#c9a227' }
];

CCAR.SCENARIOS = {
  S1: { name: 'Customer Support Resolution Agent', short: 'Support Agent',
    text: 'You are building a customer support resolution agent using the Claude Agent SDK. The agent handles high-ambiguity requests like returns, billing disputes, and account issues. It has access to your backend systems through custom MCP tools (get_customer, lookup_order, process_refund, escalate_to_human). Your target is 80%+ first-contact resolution while knowing when to escalate.' },
  S2: { name: 'Code Generation with Claude Code', short: 'Claude Code Dev',
    text: 'You are using Claude Code to accelerate software development. Your team uses it for code generation, refactoring, debugging, and documentation. You need to integrate it into your development workflow with custom slash commands, CLAUDE.md configurations, and understand when to use plan mode vs direct execution.' },
  S3: { name: 'Multi-Agent Research System', short: 'Research System',
    text: 'You are building a multi-agent research system using the Claude Agent SDK. A coordinator agent delegates to specialized subagents: one searches the web, one analyzes documents, one synthesizes findings, and one generates reports. The system researches topics and produces comprehensive, cited reports.' },
  S4: { name: 'Developer Productivity with Claude', short: 'Dev Productivity',
    text: 'You are building developer productivity tools using the Claude Agent SDK. The agent helps engineers explore unfamiliar codebases, understand legacy systems, generate boilerplate code, and automate repetitive tasks. It uses the built-in tools (Read, Write, Bash, Grep, Glob) and integrates with MCP servers.' },
  S5: { name: 'Claude Code for Continuous Integration', short: 'CI/CD',
    text: 'You are integrating Claude Code into your CI/CD pipeline. The system runs automated code reviews, generates test cases, and provides feedback on pull requests. You need to design prompts that provide actionable feedback and minimize false positives.' },
  S6: { name: 'Structured Data Extraction', short: 'Data Extraction',
    text: 'You are building a structured data extraction system using Claude. The system extracts information from unstructured documents, validates the output using JSON schemas, and maintains high accuracy. It must handle edge cases gracefully and integrate with downstream systems.' }
};

/* Objectives. O01–O37 are the exact objectives printed on the 2026-09-22 score report (prev = % correct).
   X01–X12 are blueprint task statements that did not appear as separate lines on the report. */
CCAR.OBJECTIVES = [
  { id: 'O01', d: 'D1', ts: '1.3', prev: 100, t: 'Emit multiple tool calls (e.g., multiple Task/Agent calls) in a single response for parallel execution of independent subtasks' },
  { id: 'O02', d: 'D1', ts: '1.7', prev: 100, t: 'Session resumption: targeted re-analysis of changed files and context injection without repeating prior work' },
  { id: 'O03', d: 'D1', ts: '1.3', prev: 67, t: 'Construct subagent prompts that include all findings, structured data, and source metadata required (no round-trips for missing context)' },
  { id: 'O04', d: 'D1', ts: '1.3', prev: 50, t: 'Delegation strategy: goal-oriented vs procedural instructions that enable adaptivity while keeping coordinator visibility/control' },
  { id: 'O05', d: 'D1', ts: '1.3', prev: 100, t: 'Configure subagent invocations with tool restrictions, context scoping, and role-constraining system prompts' },
  { id: 'O06', d: 'D1', ts: '1.3', prev: 0, t: 'Diagnose misconfigured subagent spawning: missing tool permissions, wrong AgentDefinition parameters, absent coordinator-to-subagent wiring' },
  { id: 'O07', d: 'D1', ts: '1.6', prev: 100, t: 'Dynamic decomposition into subtasks that adapt as new information is discovered' },
  { id: 'O08', d: 'D1', ts: '3.4/1.6', prev: 0, t: 'Select the agentic review architecture (plan mode, direct execution, multi-phase workflow) by scope, risk, and human-approval needs' },
  { id: 'O09', d: 'D1', ts: '5.4/1.7', prev: 0, t: 'State persistence for multi-agent pipelines: reliable resumption after interruption without repeating work or losing findings' },
  { id: 'O10', d: 'D1', ts: '1.2', prev: 0, t: 'Evaluate orchestration patterns (coordinator-worker, parallel, sequential pipeline) against coverage, latency, and reliability needs' },
  { id: 'O11', d: 'D3', ts: '3.6', prev: 100, t: 'Claude Code CLI in CI/CD: non-interactive flags, permission modes, cost and turn limits' },
  { id: 'O12', d: 'D3', ts: '3.5', prev: 100, t: 'Iterative refinement: concrete I/O examples, targeted feedback, batched issue descriptions' },
  { id: 'O13', d: 'D3', ts: '3.6', prev: 0, t: 'Claude Code review configurations: load correct project standards, restrict tool access, emit structured output for automation' },
  { id: 'O14', d: 'D3', ts: '3.2', prev: 100, t: 'context: fork frontmatter for Skills/commands that must run in an isolated subagent context' },
  { id: 'O15', d: 'D3', ts: '3.6', prev: 100, t: 'Improve test generation with existing tests as context, fixture conventions, and meaningful-test criteria' },
  { id: 'O16', d: 'D3', ts: '3.1–3.3', prev: 0, t: 'Select the right mechanism: CLAUDE.md, .claude/rules/ globs, Skills, hooks, or settings permissions' },
  { id: 'O17', d: 'D2', ts: '2.5/5.4', prev: 60, t: 'Systematic codebase exploration with Grep/Glob/Read that builds understanding incrementally within context limits' },
  { id: 'O18', d: 'D5', ts: '5.1/5.6', prev: 0, t: 'Design subagent output schemas (structured data, prose summaries, citation metadata) for downstream synthesis' },
  { id: 'O19', d: 'D5', ts: '5.6', prev: 0, t: 'Synthesis that preserves source-level uncertainty: established vs contested findings, no collapsing of conflicts' },
  { id: 'O20', d: 'D5', ts: '5.4', prev: 100, t: 'Context strategies for long exploration: subagent isolation, scratchpad files, targeted reads' },
  { id: 'O21', d: 'D5', ts: '5.1', prev: 100, t: 'Context window optimization: summarization, sliding windows, structured state objects, selective retention' },
  { id: 'O22', d: 'D5', ts: '5.5', prev: 33, t: 'Human review routing by confidence, document characteristics, and field-level ambiguity (not random sampling)' },
  { id: 'O23', d: 'D4', ts: '4.5', prev: 75, t: 'Choose synchronous Messages API vs Message Batches API by latency, blocking behavior, and processing window' },
  { id: 'O24', d: 'D4', ts: '4.6', prev: 100, t: 'Specialized review passes separating concerns (security, business logic, API design) with dedicated few-shot examples' },
  { id: 'O25', d: 'D4', ts: '4.3', prev: 100, t: 'Select the most reliable structured-output method (tool use/JSON schema, prompt formatting, prefill)' },
  { id: 'O26', d: 'D4', ts: '4.3', prev: 100, t: 'Extraction schemas with optional/nullable fields and enums that represent missing or ambiguous data honestly' },
  { id: 'O27', d: 'D4', ts: '4.3', prev: 100, t: 'Tool use with JSON schemas plus tool_choice to guarantee invocation when text replies would break downstream' },
  { id: 'O28', d: 'D4', ts: '4.3/4.6', prev: 0, t: 'Resolve structured-output truncation by splitting into smaller scoped calls and merging, not by raising max_tokens' },
  { id: 'O29', d: 'D4', ts: '4.2/4.3', prev: 50, t: 'Extraction accuracy patterns: schemas with optional fields, normalization rules, few-shot examples across formats' },
  { id: 'O30', d: 'D4', ts: '4.1', prev: 100, t: 'Reduce review false positives with project conventions, accepted patterns, and exclusions as persistent context' },
  { id: 'O31', d: 'D4', ts: '4.1', prev: 50, t: 'Prompt criteria with explicit inclusion/exclusion boundaries to avoid unreliable categories' },
  { id: 'O32', d: 'D2', ts: '2.5', prev: 100, t: 'Pick the right built-in tool (Grep, Glob, Read, Bash) for the operation' },
  { id: 'O33', d: 'D2', ts: '2.3', prev: 50, t: 'Tool distribution in multi-agent systems: each subagent gets only the tools its role needs' },
  { id: 'O34', d: 'D2', ts: '2.4', prev: 100, t: 'MCP resources vs tools; expose content catalogs as resources to cut exploratory calls' },
  { id: 'O35', d: 'D2', ts: '2.4', prev: 100, t: 'Integrate MCP servers: scope selection, env-var expansion for auth, tool discovery' },
  { id: 'O36', d: 'D2', ts: '2.1', prev: 100, t: 'Write MCP tool descriptions that separate purpose, inputs, boundaries, and similar tools' },
  { id: 'O37', d: 'D2', ts: '2.3', prev: 100, t: 'tool_choice to guarantee invocation; sequence multi-tool workflows so prerequisites run first' },
  { id: 'X01', d: 'D1', ts: '1.1', prev: null, t: 'Agentic loop control via stop_reason ("tool_use" vs "end_turn") and tool-result handling' },
  { id: 'X02', d: 'D1', ts: '1.4', prev: null, t: 'Programmatic enforcement (prerequisite gates) vs prompt guidance; structured human handoffs' },
  { id: 'X03', d: 'D1', ts: '1.5', prev: null, t: 'Agent SDK hooks: PostToolUse normalization and PreToolUse interception for policy compliance' },
  { id: 'X04', d: 'D2', ts: '2.2', prev: null, t: 'Structured MCP error responses: isError, errorCategory, isRetryable, empty-result vs failure' },
  { id: 'X05', d: 'D5', ts: '5.2', prev: null, t: 'Escalation and ambiguity resolution: explicit criteria, honoring human requests, policy gaps' },
  { id: 'X06', d: 'D5', ts: '5.3', prev: null, t: 'Error propagation across multi-agent systems: local recovery, structured context, coverage annotations' },
  { id: 'X07', d: 'D3', ts: '3.1', prev: null, t: 'CLAUDE.md hierarchy, @import, .claude/rules/, and diagnosing what is loaded (/memory, /context)' },
  { id: 'X08', d: 'D4', ts: '4.4', prev: null, t: 'Validation-retry loops with specific error feedback; knowing when retries cannot help' },
  { id: 'X09', d: 'D4', ts: '4.2', prev: null, t: 'Few-shot prompting for ambiguous cases, output consistency, and generalization' },
  { id: 'X10', d: 'D5', ts: '5.6', prev: null, t: 'Provenance: claim-source mappings, publication dates, conflict annotation' },
  { id: 'X11', d: 'D4', ts: '4.6', prev: null, t: 'Independent review instances vs self-review in the generating session' },
  { id: 'X12', d: 'D3', ts: '3.2/3.4', prev: null, t: 'Slash commands & skills scope (project vs user), allowed-tools, argument-hint; plan mode vs direct execution' }
];

CCAR.WEAK_THRESHOLD = 70; // objectives below this on the last report are "weak"

/* Five exam forms. Each draws 4 of the 6 scenarios, 15 items per scenario, 60 items total, 120 minutes. */
CCAR.EXAM_FORMS = [
  { id: 'exam1', title: 'Practice Exam 1', scenarios: ['S1', 'S3', 'S5', 'S6'], focus: 'Orchestration patterns, subagent wiring, truncation, human review routing' },
  { id: 'exam2', title: 'Practice Exam 2', scenarios: ['S2', 'S3', 'S4', 'S6'], focus: 'Config mechanism selection, state persistence, synthesis uncertainty, extraction accuracy' },
  { id: 'exam3', title: 'Practice Exam 3', scenarios: ['S1', 'S2', 'S3', 'S5'], focus: 'Plan mode vs direct vs multi-phase, CI review configuration, delegation style' },
  { id: 'exam4', title: 'Practice Exam 4', scenarios: ['S3', 'S4', 'S5', 'S6'], focus: 'Misconfigured spawning, output schemas, inclusion/exclusion criteria, batch vs sync' },
  { id: 'exam5', title: 'Practice Exam 5', scenarios: ['S1', 'S2', 'S4', 'S6'], focus: 'Mixed hard review: tool distribution, codebase exploration, routing, persistence' }
];

CCAR.exams = CCAR.exams || {};
CCAR.views = CCAR.views || {};
CCAR.lessons = CCAR.lessons || [];
CCAR.addQuestions = function (examId, qs) {
  (CCAR.exams[examId] = CCAR.exams[examId] || []).push.apply(CCAR.exams[examId], qs);
};
CCAR.objectiveById = function (id) { return CCAR.OBJECTIVES.find(function (o) { return o.id === id; }); };
CCAR.isWeak = function (id) { var o = CCAR.objectiveById(id); return !!(o && o.prev !== null && o.prev < CCAR.WEAK_THRESHOLD); };
