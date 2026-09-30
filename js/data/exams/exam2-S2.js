/* Practice Exam 2 — Scenario S2: Code Generation with Claude Code
   Context: TypeScript/React + Node SaaS monorepo (pnpm workspaces: apps/web, apps/api, packages/*). */
CCAR.addQuestions('exam2', [
  {
    id: 'e2-S2-01',
    scenario: 'S2',
    domain: 'D3',
    obj: 'O16',
    type: 'single',
    select: 1,
    stem: 'Your pnpm monorepo has generated GraphQL client code under <code>packages/*/src/generated/**</code>, rebuilt by <code>pnpm codegen</code>. Despite a root CLAUDE.md line ("NEVER edit files in src/generated — regenerate instead"), session logs from the last sprint show Claude hand-edited generated files 9 times, and every edit was silently overwritten by the next codegen run. The tech lead wants such edits to be impossible for every developer on the team, with no reliance on the model remembering an instruction. What should you do?',
    options: [
      'Move the instruction into <code>.claude/rules/generated.md</code> with <code>paths: ["packages/*/src/generated/**"]</code> so it loads exactly when Claude opens a generated file.',
      'Add <code>"deny": ["Edit(packages/*/src/generated/**)"]</code> under <code>permissions</code> in each developer\'s <code>~/.claude/settings.json</code> via the onboarding script.',
      'Add <code>"deny": ["Edit(packages/*/src/generated/**)"]</code> under <code>permissions</code> in the committed <code>.claude/settings.json</code>.',
      'Rewrite the CLAUDE.md line in capitals at the very top of the file and add two short examples of the correct codegen workflow so it is weighted more heavily.'
    ],
    answer: [2],
    explanation: '"Must never happen, for everyone" is a deterministic requirement, so it belongs in an enforcement layer (settings permissions or hooks), not in context. A deny rule in the committed project <code>.claude/settings.json</code> is shared through version control, deny always wins over allow, and Edit rules cover Claude\'s built-in file-editing tools. CLAUDE.md and rules files are loaded as context: they guide the model but have a non-zero failure rate, which is exactly what the logs show.',
    rationales: [
      'Path-scoped rules only control when guidance is loaded; the content is still an instruction the model can ignore, so this remains probabilistic.',
      'The right mechanism at the wrong scope: user settings are not version-controlled, drift per machine, and miss anyone who skipped onboarding or joins later.',
      'Correct. A committed project-level deny rule deterministically blocks the edit for every developer who clones the repo.',
      'Emphasis and examples may raise compliance but cannot guarantee it; the requirement is enforcement, not better phrasing.'
    ],
    trap: 'Probabilistic context for a deterministic block; user-level config for a team need'
  },
  {
    id: 'e2-S2-02',
    scenario: 'S2',
    domain: 'D3',
    obj: 'O16',
    type: 'multi',
    select: 2,
    stem: 'You are reorganizing the monorepo\'s Claude Code configuration. Five requirements came out of the team retro, each with a proposed mechanism. Which TWO proposals choose the correct mechanism? (Select 2)',
    options: [
      'Run <code>pnpm prettier --write</code> on every file Claude edits: a <code>PostToolUse</code> hook matching <code>Edit|Write</code> in the committed <code>.claude/settings.json</code>.',
      'GraphQL resolver conventions that apply in <code>apps/*/src/graphql/**</code> and <code>packages/schema/**</code>: a <code>.claude/rules/graphql.md</code> file whose <code>paths</code> list covers both globs.',
      'A 12-step release procedure used about twice a month: a new section in the root CLAUDE.md so it is always available whenever someone asks Claude to cut a release.',
      'Never run <code>pnpm publish</code> from a Claude session: a <code>.claude/rules/release.md</code> file without <code>paths</code> frontmatter so the rule is loaded in every session.',
      'One developer\'s preference for terse answers without explanations: a line in the committed root CLAUDE.md under a "Personal preferences" heading.'
    ],
    answer: [0, 1],
    explanation: 'Match each requirement to the mechanism\'s nature. Something that must happen after every edit is a deterministic side effect, so it is a hook. Conventions tied to file locations that span directories are path-scoped rules. An occasional multi-step procedure is a skill (on-demand), a hard prohibition is a settings deny rule or PreToolUse hook, and personal preferences go in <code>CLAUDE.local.md</code> or <code>~/.claude/CLAUDE.md</code>, not in shared project memory.',
    rationales: [
      'Correct. A PostToolUse hook runs deterministically after each matching tool call, and the committed project settings share it with the team.',
      'Correct. A rules file with <code>paths</code> globs loads only when Claude works on matching files, and globs can span several directories.',
      'An infrequent procedure in CLAUDE.md costs context in every session; it should be a project skill invoked on demand.',
      'A rules file is still context, not enforcement; a prohibition needs <code>permissions.deny</code> (e.g. <code>Bash(pnpm publish *)</code>) or a PreToolUse hook.',
      'Committing a personal preference imposes it on the whole team; it belongs in <code>CLAUDE.local.md</code> or user-level memory.'
    ],
    trap: 'Mapping requirements to CLAUDE.md vs rules vs skills vs hooks vs permissions'
  },
  {
    id: 'e2-S2-03',
    scenario: 'S2',
    domain: 'D3',
    obj: 'O16',
    type: 'single',
    select: 1,
    stem: 'The root CLAUDE.md is 410 lines. 190 of them are a database migration playbook (generate with <code>pnpm --filter db migrate:new</code>, write a reversible backfill, update seeds, regenerate types, run the shadow-DB check). Developers use this workflow about twice a month, usually by asking something like "create a migration adding <code>trial_ends_at</code> to accounts". The rest of the time the playbook just consumes context. The team wants it available on demand, invocable with the column change as an argument, and out of everyday context. What is the best change?',
    options: [
      'Move the playbook into <code>.claude/skills/db-migration/SKILL.md</code> with a specific <code>description</code> and an <code>argument-hint</code>, and remove it from CLAUDE.md.',
      'Move the playbook into <code>docs/migrations.md</code> and replace the section with an <code>@docs/migrations.md</code> import so that CLAUDE.md itself stays short and modular.',
      'Move the playbook into <code>.claude/rules/migrations.md</code> without any frontmatter so it is organized as its own topic file, separate from the general coding standards.',
      'Move the playbook into <code>.claude/rules/migrations.md</code> with <code>paths: ["packages/db/migrations/**"]</code> so it loads only after Claude opens an existing migration file.'
    ],
    answer: [0],
    explanation: 'Skills are the mechanism for task-specific workflows invoked on demand: only the description sits in context until the skill is used, and <code>argument-hint</code> prompts for the parameter. CLAUDE.md (and anything it imports, and rules without <code>paths</code>) is loaded at launch, so moving text around does not remove it from context. Path-scoped rules suit file-type conventions, not procedures that start from a request.',
    rationales: [
      'Correct. A skill keeps the playbook out of everyday context, is invoked when needed, and accepts the column change as an argument.',
      '@imports are for organization only; imported files are still expanded into context at launch, so nothing is saved.',
      'Rules files without <code>paths</code> load at launch just like CLAUDE.md, so this only relocates the same context cost.',
      'Tempting, but the workflow begins from a request before any migration file is read, so the rule may not load when needed, and rules cannot take arguments.'
    ],
    trap: '@import or unscoped rules mistaken for on-demand loading'
  },
  {
    id: 'e2-S2-04',
    scenario: 'S2',
    domain: 'D3',
    obj: 'X07',
    type: 'single',
    select: 1,
    stem: 'A developer reports that Claude ignores the API error-handling conventions when editing <code>apps/api/src/routes/billing.ts</code>. Running <code>/memory</code> after Claude has read that file lists the root CLAUDE.md but not the API rule. The rule file is:<pre># .claude/rules/api-conventions.md\n---\npaths:\n  - "src/api/**/*.ts"\n  - "src/routes/**/*.ts"\n---\n- Wrap handlers with asyncHandler(); no try/catch inside routes.\n- Throw AppError subclasses; never call res.status(500) directly.</pre>What is the most likely cause?',
    options: [
      'Path-scoped rules are evaluated only at session start, so the developer must restart Claude Code after opening the file for the rule to be attached to the session.',
      'Rules files are ignored unless CLAUDE.md also references them with an <code>@.claude/rules/api-conventions.md</code> import line near the top of the file.',
      'The <code>paths</code> key must be paired with <code>alwaysApply: false</code>; without it Claude Code discards the frontmatter block and skips the file entirely.',
      'Globs match from the project root, so <code>src/api/**</code> never matches <code>apps/api/src/</code>; use <code>apps/api/src/**/*.ts</code> instead.'
    ],
    answer: [3],
    explanation: 'Path-scoped rules load when Claude reads a file matching one of the <code>paths</code> globs, and those globs are evaluated relative to the project root. In a monorepo the API lives under <code>apps/api/src/</code>, so patterns written for a single-package layout never match. <code>/memory</code> (or <code>/context</code>) showing the rule absent after the file was read points directly at the glob.',
    rationales: [
      'Path-scoped rules are attached on demand when a matching file is read during the session; no restart is needed.',
      'Files in <code>.claude/rules/</code> are discovered automatically; an @import is not required (and would load the rule unconditionally).',
      '<code>alwaysApply</code> is not a Claude Code rules field; <code>paths</code> is the only frontmatter the rules loader uses.',
      'Correct. The patterns do not match the monorepo path, so the rule is never triggered.'
    ],
    trap: 'Non-existent frontmatter field vs glob that does not match the monorepo layout'
  },
  {
    id: 'e2-S2-05',
    scenario: 'S2',
    domain: 'D1',
    obj: 'O08',
    type: 'single',
    select: 1,
    stem: 'Product wants <code>apps/web</code> (React) and <code>apps/api</code> (Node) to share typed contracts. Two approaches are on the table: adopt tRPC end to end (a new router layer, changes to ~40 route files and all React Query hooks) or generate a typed client from the existing OpenAPI spec (a new codegen step in CI, no route changes). The staff engineer requires a written design she can review before any file is modified. Which workflow fits best?',
    options: [
      'Direct execution with a detailed prompt specifying the tRPC approach, since tRPC gives stronger type guarantees and the edits are mechanical once it is chosen.',
      'Plan mode to explore both apps and propose an approach with its tradeoffs for review, then direct execution of the approved plan in package-sized steps.',
      'Direct execution on a throwaway branch that implements both approaches in turn, so the staff engineer can compare the two finished diffs before choosing one.',
      'Direct execution beginning with the OpenAPI client because it is the smaller change, switching into plan mode only if unexpected coupling appears during the work.'
    ],
    answer: [1],
    explanation: 'Plan mode is designed for changes with multiple valid approaches, architectural implications, and multi-file impact, and it explores read-only so nothing is modified before the design is approved. Once the reviewer signs off, direct execution of the planned approach is efficient. This plan-then-execute combination satisfies both the risk profile and the explicit human-approval gate.',
    rationales: [
      'Pre-selects an approach without exploring the code or surfacing tradeoffs, and skips the required design review.',
      'Correct. Read-only exploration and a reviewable plan first, then direct implementation of the approved approach.',
      'Implementing both approaches is costly rework and modifies files before the required review; the reviewer wanted a design, not two diffs.',
      'The architectural choice is already known to be open; deferring planning until problems appear invites rework and bypasses the approval gate.'
    ],
    trap: 'Direct execution for an architectural decision that needs approval'
  },
  {
    id: 'e2-S2-06',
    scenario: 'S2',
    domain: 'D1',
    obj: 'O08',
    type: 'single',
    select: 1,
    stem: 'A Sentry alert shows <code>RangeError: toFixed() digits argument must be between 0 and 100</code> thrown from <code>formatMoney()</code> at <code>packages/utils/src/currency.ts:42</code> when a currency has <code>minorUnits: undefined</code>. The function is 30 lines with an existing unit-test file and is imported by 14 packages; the fix is to default <code>minorUnits</code> to 2 and add a regression test. A teammate proposes an elaborate workflow because of the 14 consumers. What should you do?',
    options: [
      'Enter plan mode and have Claude map all 14 consuming packages and their call patterns before proposing a fix, because a shared utility has a wide blast radius.',
      'Run a multi-phase workflow: an Explore subagent inventories the consumers, a planning pass designs the change, and a separate session implements and reviews it.',
      'Use direct execution: give Claude the stack trace and expected behavior, have it add the default and a regression test, and run the package tests.',
      'Ask Claude, in plan mode, to redesign <code>formatMoney()</code> around <code>Intl.NumberFormat</code> so currency handling is future-proofed while the file is open anyway.'
    ],
    answer: [2],
    explanation: 'Direct execution fits well-understood changes with clear scope, such as a single-file bug fix with a precise stack trace and an obvious correction. The fix only changes behavior for the previously crashing input, so the number of importers does not make the task architectural; the existing tests are the safety net. Plan mode and multi-phase workflows add cost without reducing real risk here.',
    rationales: [
      'Over-engineering: the change is local and backward compatible, so mapping every consumer adds time without changing the fix.',
      'A multi-phase architecture is meant for large, uncertain work; here it multiplies sessions for a one-line default.',
      'Correct. Clear stack trace, single function, known fix, existing tests: direct execution with a regression test.',
      'Scope creep: a redesign turns a contained bug fix into a risky refactor of a widely imported function.'
    ],
    trap: 'Plan mode or multi-phase for a well-scoped single-file fix'
  },
  {
    id: 'e2-S2-07',
    scenario: 'S2',
    domain: 'D1',
    obj: 'O08',
    type: 'single',
    select: 1,
    stem: 'You started a plan-mode session to design replacing <code>moment</code> with <code>date-fns</code> across the monorepo (~170 import sites in 9 packages). After Claude read ~120 files directly, <code>/context</code> shows the window 85% full, and the draft plan now refers to "the usual moment patterns" instead of the specific wrappers it found earlier (<code>toBillingDate</code>, <code>parseTenantTz</code>). What is the best way to restructure the work?',
    options: [
      'Delegate per-package discovery to the Explore subagent so only concise inventories of wrappers and call sites return, keep planning in the main session, then execute directly.',
      'Leave plan mode and switch to direct execution now, since discovery is mostly done and editing the files will ground Claude in the concrete wrappers again as it goes.',
      'Keep reading the remaining files in the same session but run <code>/compact</code> after every 20 files so that the context window never goes above 60% during the discovery phase.',
      'Restart the session with a larger-context model and repeat the full discovery so all 170 import sites and their surrounding code fit into a single context window at once.'
    ],
    answer: [0],
    explanation: 'A multi-phase task should isolate verbose discovery from the coordinating context. The Explore subagent reads files in its own context and returns summaries, so the main session keeps the specific findings and the plan instead of 120 raw files. Once the plan is approved, direct execution implements it; this is the plan-investigate-execute pattern the exam guide describes.',
    rationales: [
      'Correct. Subagent isolation keeps discovery output out of the main context, preserving specific findings for planning and execution.',
      'Executing on a degraded, generic understanding risks missing the custom wrappers; the plan is not yet reliable.',
      'Repeated compaction of raw file dumps loses exactly the specific details that are already fading; it treats the symptom, not the architecture.',
      'A bigger window does not fix attention dilution over 170 sites and repeats all the discovery work.'
    ],
    trap: 'Bigger context / compaction instead of isolating the discovery phase'
  },
  {
    id: 'e2-S2-08',
    scenario: 'S2',
    domain: 'D3',
    obj: 'X12',
    type: 'single',
    select: 1,
    stem: 'The team\'s project skill <code>.claude/skills/release-notes/SKILL.md</code> produces customer-facing notes in a fixed format. Priya wants a version that also lists internal ticket IDs for her own changelog, so she copies it to <code>~/.claude/skills/release-notes/SKILL.md</code> and edits it. A week later she files a bug that "the team release-notes skill leaks ticket IDs", and nobody else can reproduce it. What should she have done?',
    options: [
      'Edited the project skill directly and added a <code>$ARGUMENTS</code> switch for ticket IDs, since the project copy always takes precedence over a personal skill.',
      'Put her variant in <code>.claude/commands/release-notes.md</code> so the command and the skill can coexist under the same name without any conflict.',
      'Added her variant instructions to <code>CLAUDE.local.md</code> so they apply only in her own checkout while the shared skill file stays unchanged.',
      'Created the personal variant under a different name, such as <code>~/.claude/skills/release-notes-internal/</code>, leaving the team skill untouched.'
    ],
    answer: [3],
    explanation: 'When a personal and a project skill share a name, the personal one takes precedence for that user, so Priya silently replaced the team skill in her own sessions. Personal customizations should be created in <code>~/.claude/skills/</code> under a different name so both remain available and teammates\' expectations about the shared skill hold. Changing the shared skill for a personal need affects everyone.',
    rationales: [
      'Wrong on precedence (personal wins over project on a name clash), and it changes a shared workflow for one person\'s preference.',
      'On a name clash the skill wins over a command, so the variant would be hidden, and commands are the older mechanism anyway.',
      'CLAUDE.local.md is always loaded, so the ticket-ID instruction would leak into unrelated tasks; it is not a separately invocable workflow.',
      'Correct. A distinctly named personal skill avoids shadowing the team skill and keeps both invocable.'
    ],
    trap: 'Personal skill shadowing a project skill with the same name'
  },
  {
    id: 'e2-S2-09',
    scenario: 'S2',
    domain: 'D3',
    obj: 'O14',
    type: 'single',
    select: 1,
    stem: 'This project skill audits dependency drift across the 23 workspace packages:<pre>---\nname: dep-audit\ndescription: Audit dependency version drift across workspace packages\nallowed-tools: Read, Grep, Glob, Bash(pnpm why *), Bash(pnpm outdated *)\n---\nFor every package in pnpm-workspace.yaml, run pnpm outdated, then pnpm why\nfor each mismatched dependency, and report a drift table.</pre>Each run dumps ~45k tokens of <code>pnpm</code> output into the conversation, and developers who run it mid-task find that Claude afterwards loses track of the feature they were building. The final drift table is all they need. What is the most effective change?',
    options: [
      'Add <code>disable-model-invocation: true</code> so the skill runs only when a developer types <code>/dep-audit</code> deliberately at the start of a fresh session.',
      'Add <code>context: fork</code> so the skill runs in an isolated subagent context and only its final report returns to the main conversation.',
      'Narrow <code>allowed-tools</code> to <code>Bash(pnpm outdated *)</code> only, so the skill produces less output by skipping all of the <code>pnpm why</code> calls.',
      'Tell developers to run <code>/compact</code> right after each audit so the verbose <code>pnpm</code> output is summarized out of the main context window.'
    ],
    answer: [1],
    explanation: '<code>context: fork</code> runs a skill in an isolated subagent context, so verbose intermediate output stays there and only the result returns to the main session. That is exactly the need: keep the drift table and discard 45k tokens of tool output. The other options change when or how much the skill runs, or clean up after the damage, rather than isolating it.',
    rationales: [
      'Controls who can trigger the skill, not where its output goes; manual runs still flood the main context.',
      'Correct. Forked execution isolates the verbose output and returns only the final drift table.',
      'Removing <code>pnpm why</code> breaks the audit\'s purpose (explaining mismatches) and still leaves substantial output in context.',
      'Compaction after the fact is lossy and manual; the feature context may already be degraded, and it relies on everyone remembering.'
    ],
    trap: 'Tool restriction or /compact instead of context: fork isolation'
  },
  {
    id: 'e2-S2-10',
    scenario: 'S2',
    domain: 'D3',
    obj: 'O13',
    type: 'single',
    select: 1,
    stem: 'A git <code>pre-push</code> hook runs a scripted review with Claude Code. The reviews are consistently generic: they ignore the conventions in the root CLAUDE.md and <code>.claude/rules/</code> and never flag the project\'s banned <code>as any</code> casts, although interactive <code>/review</code> sessions flag them reliably.<pre>#!/usr/bin/env bash\ngit diff origin/main...HEAD &gt; /tmp/push.diff\nclaude --bare -p "Review /tmp/push.diff against our project standards." \\\n  --output-format json --max-turns 8 &gt; /tmp/review.json</pre>What is the most likely cause?',
    options: [
      '<code>--max-turns 8</code> stops the run before Claude can read CLAUDE.md, which print mode fetches lazily through tool calls during its first few turns.',
      '<code>--output-format json</code> switches Claude Code into a raw API mode that skips project memory; the standards only load with plain-text output.',
      '<code>--bare</code> skips auto-discovery of CLAUDE.md, rules, hooks, skills, and MCP servers, so the scripted run never sees the project standards.',
      'Print mode loads only <code>~/.claude/CLAUDE.md</code>, so the standards must be copied into each developer\'s user-level memory for scripted runs.'
    ],
    answer: [2],
    explanation: 'The <code>--bare</code> flag starts Claude Code without auto-discovering CLAUDE.md, rules, hooks, skills, or MCP configuration, which is useful for hermetic scripts but removes the project standards a review depends on. Removing it (or explicitly supplying the standards) restores the conventions. Print mode (<code>-p</code>) otherwise loads project memory the same way an interactive session does.',
    rationales: [
      'Memory files are loaded at startup, not fetched via tool calls, so the turn limit does not control whether CLAUDE.md is seen.',
      'Output format only changes how the result is serialized; it does not change which memory files are loaded.',
      'Correct. <code>--bare</code> explicitly disables discovery of project configuration, including CLAUDE.md and rules.',
      'Print mode loads project memory as well; moving team standards to user-level files would also stop sharing them via VCS.'
    ],
    trap: 'Blaming output format or turn limits instead of the flag that disables config discovery'
  },
  {
    id: 'e2-S2-11',
    scenario: 'S2',
    domain: 'D3',
    obj: 'O13',
    type: 'multi',
    select: 2,
    stem: 'You are hardening the pre-push review script. Requirements: the run must be unable to modify files or execute arbitrary shell commands, and its output must be machine-parseable JSON matching <code>review-schema.json</code> so a Node script can fail the push on any <code>severity: "blocker"</code> finding. Which TWO additions to the <code>claude -p</code> invocation satisfy these requirements? (Select 2)',
    options: [
      '<code>--permission-mode acceptEdits</code>, so the run never blocks waiting on an approval prompt',
      '<code>--tools "Read,Grep,Glob"</code>',
      'Appending "Do not modify files. Reply only with JSON matching review-schema.json." to the prompt',
      '<code>--output-format json --json-schema "$(cat review-schema.json)"</code>',
      '<code>--dangerously-skip-permissions</code>, so read operations are never interrupted by prompts'
    ],
    answer: [1, 3],
    explanation: 'Hard requirements need CLI-level guarantees. <code>--tools</code> restricts the built-in tools available to the run, so a read-only set removes Edit, Write, and Bash entirely. <code>--output-format json</code> with <code>--json-schema</code> returns validated structured output a script can parse, instead of hoping free text is well-formed. Prompt instructions are probabilistic, and permission-bypassing modes widen rather than narrow what the run may do.',
    rationales: [
      'acceptEdits auto-approves file edits, which is the opposite of a read-only review.',
      'Correct. Restricting the run to Read, Grep, and Glob makes modification and shell execution unavailable.',
      'Prompt wording is guidance, not a guarantee; it can still produce edits or malformed JSON.',
      'Correct. Schema-validated JSON output gives the Node script a reliable, machine-parseable contract.',
      'Bypassing permissions removes all approval checks, so any tool call, including destructive ones, would run unprompted.'
    ],
    trap: 'Prompt instructions or permission bypass instead of tool restriction + schema'
  },
  {
    id: 'e2-S2-12',
    scenario: 'S2',
    domain: 'D5',
    obj: 'O20',
    type: 'single',
    select: 1,
    stem: 'You are chasing a memory leak in the SSR server (<code>apps/web/server</code>) over three days. In the current long session Claude has confirmed two retainers (<code>tenantCache</code> in <code>i18n/loader.ts</code> and an unbounded <code>listeners</code> array in <code>featureFlags.ts</code>) and ruled out five hypotheses. By the afternoon it re-proposes one ruled-out hypothesis and talks about "a typical Express middleware leak" instead of the specific files. What is the most effective practice to adopt?',
    options: [
      'Have Claude keep a scratchpad file of confirmed retainers and ruled-out hypotheses, consult it before each step, and run <code>/compact</code> as the window fills.',
      'Add the confirmed retainers and ruled-out hypotheses to the committed root CLAUDE.md so they load in every session for everyone until the leak is finally closed.',
      'Keep one long-running session for the entire investigation and reopen it each morning with <code>--continue</code> so that no earlier tool output is ever discarded.',
      'Restart the session whenever the model drifts and let it re-read the heap snapshots and all source files, so its understanding is rebuilt completely from scratch.'
    ],
    answer: [0],
    explanation: 'Drifting into "typical patterns" and revisiting ruled-out hypotheses are signs of context degradation in a long session. A scratchpad file persists key findings outside the conversation so they survive compaction and new sessions, and referencing it keeps later steps anchored to specifics; <code>/compact</code> then reclaims space taken by verbose output. Longer sessions or full re-reads make degradation worse or repeat work.',
    rationales: [
      'Correct. Persisted findings counteract degradation and survive compaction, while /compact frees space used by raw output.',
      'Wrong layer: temporary investigation notes in shared project memory burden every teammate\'s sessions and need manual cleanup.',
      'The long session with accumulated tool output is the cause of the degradation; resuming it preserves the problem.',
      'Re-reading everything repeats expensive work and loses the ruled-out hypotheses, so the same dead ends recur.'
    ],
    trap: 'Longer session or shared memory instead of a scratchpad file'
  },
  {
    id: 'e2-S2-13',
    scenario: 'S2',
    domain: 'D3',
    obj: 'X07',
    type: 'single',
    select: 1,
    stem: 'A contractor joins and reports that Claude never follows the team\'s React conventions (named exports, <code>useQuery</code> wrappers from <code>packages/data</code>, no <code>defaultProps</code>). The staff engineer who wrote the conventions sees them applied every time. On the contractor\'s machine <code>/memory</code> lists <code>./CLAUDE.md</code> and <code>~/.claude/CLAUDE.md</code>; on the staff engineer\'s machine it also lists <code>./CLAUDE.local.md</code>. What is the correct fix?',
    options: [
      'Have the contractor create a <code>CLAUDE.local.md</code> with the same content, and add a step to the onboarding doc so every new joiner copies it after cloning.',
      'Remove <code>CLAUDE.local.md</code> from <code>.gitignore</code> and commit it, so every clone receives the staff engineer\'s personal project memory file as well.',
      'Ask the contractor to add the conventions to <code>~/.claude/CLAUDE.md</code>, since user-level memory takes precedence over project memory for each developer.',
      'Move the conventions into the committed root CLAUDE.md or a <code>.claude/rules/</code> file, and keep <code>CLAUDE.local.md</code> for personal notes only.'
    ],
    answer: [3],
    explanation: '<code>CLAUDE.local.md</code> is personal, per-project memory that is gitignored, so anything in it exists only on the author\'s machine. <code>/memory</code> reveals the hierarchy difference directly. Team-wide conventions belong in version-controlled project memory, either the root CLAUDE.md or modular <code>.claude/rules/</code> files, so every clone gets them.',
    rationales: [
      'Manual copying per developer drifts over time and does not make the conventions part of the repository.',
      'Committing a file meant to be personal breaks its purpose and would also ship the engineer\'s private preferences to everyone.',
      'User-level memory is not shared and memory files are combined rather than overriding one another; this just moves the problem.',
      'Correct. Shared conventions in committed project memory reach every team member; personal notes stay local.'
    ],
    trap: 'Team conventions stored in personal memory (CLAUDE.local.md)'
  },
  {
    id: 'e2-S2-14',
    scenario: 'S2',
    domain: 'D3',
    obj: 'O12',
    type: 'single',
    select: 1,
    stem: 'You ask Claude to write a codemod that converts legacy API response mappers in <code>apps/api/src/mappers</code> to Zod schemas. Your prose spec ("optional fields become <code>.optional()</code>, nullable DB columns become <code>.nullable()</code>, ISO strings become dates") has produced three inconsistent versions: one uses <code>.nullish()</code> everywhere, one coerces all strings to dates, and one drops default values. What is the most effective next step?',
    options: [
      'Rewrite the specification in more detail, with a separate paragraph defining optional, nullable, and date semantics and a list of Zod methods that are not allowed.',
      'Provide 2–3 concrete before/after pairs of real mappers and their expected Zod output, covering an optional field, a nullable column, and a defaulted date.',
      'Ask Claude to generate ten candidate codemods in one go and pick whichever version produces output that looks closest to expectations on a sample mapper.',
      'Switch to plan mode so Claude can explore the mapper files first and infer the intended semantics from existing usages before it writes the codemod.'
    ],
    answer: [1],
    explanation: 'When prose descriptions are interpreted inconsistently, concrete input/output examples are the most effective way to communicate a transformation. Two or three pairs that exercise the confusing distinctions (optional vs nullable vs defaulted) remove ambiguity the prose cannot. These examples can also become the codemod\'s tests for further iteration.',
    rationales: [
      'More prose has already failed three times; the ambiguity is in interpretation, which examples resolve better than definitions.',
      'Correct. Targeted before/after examples pin down exactly the edge cases the prose left ambiguous.',
      'Sampling many candidates and eyeballing one is unreliable and does not communicate the requirement.',
      'The existing mappers are the inputs, not the specification; exploring them cannot reveal the intended Zod semantics.'
    ],
    trap: 'More prose or more exploration instead of concrete I/O examples'
  },
  {
    id: 'e2-S2-15',
    scenario: 'S2',
    domain: 'D1',
    obj: 'O02',
    type: 'single',
    select: 1,
    stem: 'Yesterday you ran a named session (<code>claude -n billing-refactor</code>) that analyzed 40 files in <code>apps/api/src/billing</code> and produced a refactoring plan. Overnight a teammate merged a PR touching three of those files (<code>invoice.ts</code>, <code>proration.ts</code>, <code>taxRates.ts</code>); the other 37 are unchanged. You want to continue implementing the plan today. What is the best approach?',
    options: [
      'Start a new session and have Claude re-read all 40 billing files so its analysis reflects the merged PR, then regenerate the refactoring plan from scratch.',
      'Resume with <code>claude --resume billing-refactor</code> and continue implementing immediately, since Claude re-reads any file it edits before changing it anyway.',
      'Resume with <code>claude --resume billing-refactor</code>, tell Claude which three files changed and what the PR did, and have it re-analyze those before continuing.',
      'Use <code>--fork-session</code> to branch yesterday\'s session so the stale analysis stays isolated, then continue implementing the original plan in the fork.'
    ],
    answer: [2],
    explanation: 'When most prior context is still valid, resuming the named session preserves the analysis, but the agent must be told about specific changes so it performs targeted re-analysis instead of acting on stale tool results. Starting fresh wastes the valid work on 37 files. Continuing silently risks applying a plan built on outdated versions of the changed files.',
    rationales: [
      'Discards valid analysis of 37 unchanged files; a fresh start with a summary is for when most prior context is stale.',
      'Re-reading at edit time does not update the plan\'s earlier reasoning about those files, so stale decisions persist.',
      'Correct. Resume the named session and inject the specific changes for targeted re-analysis.',
      'Forking creates a branch from the same stale baseline; it does not inform the agent about what changed.'
    ],
    trap: 'Resuming without informing the agent of file changes, or full re-exploration'
  }
]);
