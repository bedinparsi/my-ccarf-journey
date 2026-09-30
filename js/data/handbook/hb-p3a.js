/* Architect Handbook · Part 3 (a): CLAUDE.md hierarchy and rules, custom slash commands and skills, path-specific rules. */
(function () {
  var H = CCAR.hb, D = H.D;

  /* ------------------------------------------------------------------ 3.1 */
  CCAR.lessons.push({
    id: 'hb-31-claude-md', track: 'handbook', part: 'P3', num: '3.1', order: 301, domain: 'D3',
    objs: ['X07', 'O16'], ts: ['3.1'], minutes: 30,
    title: 'CLAUDE.md hierarchy, imports, rules directory and diagnosis',
    summary: 'Where every memory file lives, who sees it, how files combine, how @imports and .claude/rules/ keep instructions modular, and how to diagnose "Claude follows the rules for me but not for my teammate".',
    body: function () {
      return `
<p>CLAUDE.md is the persistent instruction layer of Claude Code: build commands, conventions, architecture decisions and gotchas that every session should know. It is loaded into context at session start, so it shapes every request a developer makes. In production the questions are always the same: <b>who receives this instruction, when is it loaded, and what does it cost in context</b>. The exam probes exactly that: the hierarchy (user vs project vs directory), the fact that user-level files are not shared, @import for modular per-package standards, splitting a monolith into <code>.claude/rules/</code>, and verifying what is loaded with <code>/memory</code>.</p>

<h3>The hierarchy</h3>
${H.table(['Level', 'Location', 'Who receives it', 'In version control?', 'When loaded', 'Put here'], [
  ['<b>Managed policy</b>', 'Organization-managed CLAUDE.md deployed by IT/admins', 'Every user on managed machines', 'No (deployed centrally)', 'Session start', 'Org-wide policies: security, compliance, approved tooling'],
  ['<b>User</b>', '<code>~/.claude/CLAUDE.md</code>', '<b>Only you</b>, in every project', '<b>No</b>: lives in your home directory', 'Session start', 'Personal preferences that apply everywhere (tone, your editor habits)'],
  ['<b>Project</b>', '<code>./CLAUDE.md</code> or <code>./.claude/CLAUDE.md</code>', 'Everyone who clones the repo', '<b>Yes</b>: committed and shared', 'Session start', 'Team standards: build and test commands, conventions, architecture, repo etiquette'],
  ['<b>Local (personal project)</b>', '<code>./CLAUDE.local.md</code>', 'Only you, in this project', 'No: gitignored', 'Session start', 'Your sandbox URLs, local test data, personal shortcuts for this repo'],
  ['<b>Directory</b>', '<code>packages/api/CLAUDE.md</code> (any subdirectory)', 'Everyone (if committed)', 'Yes, if committed', '<b>On demand</b>, when Claude reads files in that directory', 'Conventions specific to one directory or package'],
  ['<b>Rules</b>', '<code>.claude/rules/*.md</code> (project), <code>~/.claude/rules/</code> (user)', 'Project: everyone. User: only you', 'Project: yes. User: no', 'No <code>paths</code>: session start. With <code>paths</code>: when matching files are read (3.3)', 'Topic files: testing, API conventions, deployment']
])}

${D({ w: 760, h: 300, title: 'How memory files combine into one context',
  groups: [{ x: 10, y: 30, w: 330, h: 260, label: 'LOADED AT SESSION START', kind: 'soft' }, { x: 360, y: 30, w: 190, h: 260, label: 'ON DEMAND', kind: 'soft' }],
  nodes: [
    { id: 'm', x: 30, y: 55, w: 290, h: 38, label: 'Managed policy CLAUDE.md', sub: 'org, cannot be skipped by users', kind: 'store' },
    { id: 'u', x: 30, y: 105, w: 290, h: 38, label: '~/.claude/CLAUDE.md', sub: 'user: NOT shared via git', kind: 'bad' },
    { id: 'p', x: 30, y: 155, w: 290, h: 38, label: './CLAUDE.md + @imports', sub: 'project: committed, shared', kind: 'good' },
    { id: 'l', x: 30, y: 205, w: 140, h: 38, label: 'CLAUDE.local.md', sub: 'personal, gitignored', kind: 'store' },
    { id: 'r', x: 180, y: 205, w: 140, h: 38, label: 'rules (no paths)', sub: '.claude/rules/*.md', kind: 'store' },
    { id: 'd', x: 375, y: 80, w: 160, h: 50, label: 'subdir CLAUDE.md', sub: 'when files there are read', kind: 'store' },
    { id: 'pr', x: 375, y: 180, w: 160, h: 50, label: 'rules with paths:', sub: 'when matching files read', kind: 'store' },
    { id: 'c', x: 580, y: 130, w: 165, h: 60, label: 'Context window', sub: 'all concatenated, additive', kind: 'agent' }
  ],
  edges: [{ from: 'p', to: 'c' }, { from: 'd', to: 'c', dashed: true }, { from: 'pr', to: 'c', dashed: true }],
  caption: 'Files are <b>concatenated, not overridden</b>. A more specific file is read later, but the general one is still in context. Only project-level files (and committed directory files and rules) reach teammates.' })}

<h3>Additive concatenation</h3>
<p>Claude Code does not pick one CLAUDE.md and discard the rest. Every applicable file is added to context. Two consequences for architects:</p>
<ul>
<li><b>Conflicts are not resolved by precedence.</b> If the user file says "use tabs" and the project file says "use 2 spaces", both instructions are in context and behavior becomes inconsistent. Fix the conflict at the source rather than hoping the later file wins.</li>
<li><b>Every loaded line costs context on every request.</b> Adding a level never removes one. This is why pruning and on-demand mechanisms (directory files, path rules, skills) matter.</li></ul>

<h3>@import: modular files, same context cost</h3>
<pre class="code"># CLAUDE.md (project root)
See @README.md for the project overview and @package.json for npm scripts.

## Standards
- Git workflow: @docs/git-workflow.md
- Error handling: @docs/standards/errors.md</pre>
${H.table(['Property', 'Behavior', 'Why it matters'], [
  ['Syntax', '<code>@path/to/file</code> anywhere in a CLAUDE.md', 'Keeps the main file short and readable'],
  ['Path resolution', '<b>Relative to the importing file</b>, not to the working directory', 'A per-package CLAUDE.md imports with <code>@../../docs/...</code>'],
  ['Depth', 'Imports can import, <b>up to four hops</b>', 'Deeper chains are not followed; keep the graph flat'],
  ['Loading', 'Imported files <b>load at launch</b> with their parent', 'Organization, <b>not context savings</b>. For on-demand content use path rules or skills'],
  ['Sharing', 'Import a committed file to share it; import a file under <code>~/</code> for personal content', 'An import of <code>@~/.claude/my-notes.md</code> works only on your machine']
])}

<h4>Per-package imports in a monorepo (the exam skill)</h4>
<p>The maintainers of each package know which standards apply. Instead of one root file with every standard, each package CLAUDE.md imports only what its domain needs:</p>
<pre class="code">repo/
  CLAUDE.md                        # universal: build, test, git etiquette
  docs/standards/
    api-design.md   pci.md   react.md   data-retention.md
  packages/
    payments/CLAUDE.md             # @../../docs/standards/pci.md
                                   # @../../docs/standards/api-design.md
    web-ui/CLAUDE.md               # @../../docs/standards/react.md
    analytics/CLAUDE.md            # @../../docs/standards/data-retention.md</pre>
<p>A developer working in <code>web-ui</code> never receives the PCI standard; the payments package always does. Because package CLAUDE.md files load on demand, their imports arrive only when Claude works in that package.</p>

<h3>Splitting a monolith into .claude/rules/</h3>
<p>A 600-line CLAUDE.md is hard to review and gets ignored. Split it by topic:</p>
<pre class="code">.claude/
  CLAUDE.md                 # short: project summary, commands, pointers
  rules/
    testing.md              # test framework, fixtures, naming, coverage rules
    api-conventions.md      # error envelope, pagination, versioning
    deployment.md           # release steps, environments, what never to touch</pre>
<p>Rule files <b>without</b> <code>paths</code> frontmatter load at launch exactly like CLAUDE.md: the split improves ownership and code review (one topic per file, clear diffs), not context. Add <code>paths:</code> to make a rule conditional (chapter 3.3), which is where the token savings come from.</p>

<h3>Exam skills: how to do each one</h3>
${H.table(['Skill (exam guide 3.1)', 'How', 'Why'], [
  ['Diagnose hierarchy issues', 'Ask "which file holds this instruction?" Run <code>/memory</code> (or <code>/context</code>) in both sessions and compare', 'Differences between developers almost always come from user-level or local files'],
  ['Selective @import per package', 'Each package CLAUDE.md imports only the standards files its maintainers deem relevant', 'Relevant standards, less noise, owned by domain experts'],
  ['Split large CLAUDE.md into rules', 'Move topics into <code>.claude/rules/testing.md</code>, <code>api-conventions.md</code>, <code>deployment.md</code>', 'Focused files, reviewable diffs, optional path scoping'],
  ['Verify loaded memory files', '<code>/memory</code> lists the memory files in use and opens them for editing', 'Confirms whether a file is loaded before you change its content']
])}

<h3>Diagnosing "the new team member does not get the instructions"</h3>
<ol class="steps">
<li><b>Symptom:</b> the lead\'s sessions follow the API conventions; a new hire\'s sessions on the same repo do not.</li>
<li><b>Verify:</b> both run <code>/memory</code> (exam) or <code>/context</code> (current docs). The lead sees <code>~/.claude/CLAUDE.md</code> containing the conventions; the new hire does not have that file.</li>
<li><b>Root cause:</b> the instructions live at <b>user level</b> (or in the lead\'s <code>CLAUDE.local.md</code>), which is never committed.</li>
<li><b>Fix:</b> move team standards into <code>./CLAUDE.md</code>, <code>./.claude/CLAUDE.md</code> or <code>.claude/rules/</code>, commit, and keep only personal preferences at user level.</li>
<li><b>Prevent:</b> review CLAUDE.md changes like code; a quick check in onboarding is to run <code>/memory</code> and confirm the project file is listed.</li></ol>
${H.box('exam', 'Exam vs current docs:', 'The exam guide names <code>/memory</code> as the way to verify which memory files are loaded, and that is the answer to pick. Current docs: <code>/memory</code> lists and opens the memory files, while <code>/context</code> shows exactly what occupies the context window (memory files, rules, skills, tools) and is the precise tool to confirm loading. Recognize both.')}

<h3>What belongs in CLAUDE.md</h3>
${H.table(['Include', 'Exclude'], [
  ['Commands Claude cannot guess (<code>make test-integration</code>, custom scripts)', 'What Claude can read from the code itself (folder structure, obvious patterns)'],
  ['Style rules that differ from language defaults', 'Standard conventions any engineer knows'],
  ['How to run and interpret tests', 'Long reference docs (link or import them, or make a skill)'],
  ['Repo etiquette: branch names, commit format, PR rules', 'Frequently changing information (sprint goals, ticket lists)'],
  ['Architecture decisions and their reasons', 'Step-by-step procedures used occasionally (make them skills)'],
  ['Environment quirks and gotchas ("the dev DB resets at midnight")', 'Rules that must always hold (enforce them with permissions or hooks)']
])}
<ul>
<li><b>Size:</b> keep each file under about 200 lines. Bloat makes Claude ignore rules, including the important ones.</li>
<li><b>Pruning:</b> for each line ask "would Claude make a mistake without this?" If not, delete it. <code>/doctor</code> can propose cuts.</li>
<li><b>Emphasis:</b> "IMPORTANT" or "YOU MUST" helps adherence when used sparingly. Overuse dilutes it, and current models already follow instructions precisely.</li>
<li><b>Adoption trigger:</b> when Claude makes the same mistake twice, add a line to CLAUDE.md.</li></ul>

<h3>Compaction and CLAUDE.md</h3>
<p>When a session auto-compacts or you run <code>/compact</code>, early conversation turns are summarized and instructions you typed in chat may be lost. The project-root CLAUDE.md is <b>re-injected after compaction</b>, so persistent rules belong there, not in an early chat message. You can also steer what compaction keeps:</p>
<pre class="code">## Compaction
When compacting, always preserve: the list of modified files,
failing test names, and any decisions about the public API.</pre>

<h3>When CLAUDE.md is not loaded</h3>
<ul>
<li><code>claude --bare</code> skips auto-discovery of CLAUDE.md, hooks, skills and MCP configuration. Scripted runs that use it lose your standards unless you pass them explicitly (for example <code>--append-system-prompt</code>).</li>
<li>In the Agent SDK, CLAUDE.md is loaded through <code>settingSources</code>; if your application does not include the project source, project CLAUDE.md is not in context.</li>
<li>Directory CLAUDE.md files load only after Claude reads a file in that directory. A session that never touches <code>packages/payments/</code> never sees its rules.</li></ul>

<h3>Context, not enforcement</h3>
${H.box('rule', 'Right layer for the requirement:', 'CLAUDE.md and rules are <b>context</b>: Claude usually follows them, but nothing guarantees it. If an action must never happen (edit generated code, read <code>.env</code>, run <code>terraform apply</code>), use <code>permissions.deny</code> in committed <code>.claude/settings.json</code> or a PreToolUse hook that exits 2. If something must happen after every edit (formatting), use a PostToolUse hook.')}

<h3>Design decisions</h3>
${H.table(['If the situation is', 'Choose', 'Because', 'You give up'], [
  ['Team-wide standard every session needs', 'Project <code>CLAUDE.md</code> or unscoped <code>.claude/rules/</code> file', 'Committed, reaches everyone at launch', 'Context tokens on every request'],
  ['Standard only relevant to one package', 'That package\'s CLAUDE.md (with selective @imports)', 'Loads only when work touches the package', 'Invisible to sessions that never read files there'],
  ['Convention for a file type across many directories', 'Path-scoped rule (3.3)', 'Glob matching is not directory-bound', 'A little frontmatter to maintain'],
  ['Personal preference', '<code>~/.claude/CLAUDE.md</code> or <code>CLAUDE.local.md</code>', 'Does not impose on teammates', 'Not reproducible for others'],
  ['Long reference, used occasionally', 'Skill (3.2) or a pointer to a doc', 'Loaded on demand', 'Claude must decide or be told to load it'],
  ['Must always or never happen', 'Hook or permission rule', 'Deterministic', 'Engineering effort; less flexible']
])}

${H.box('real', 'Real-world notes:', 'Treat CLAUDE.md as code: code review, an owner, and pruning when tools change. Watch for drift between user files and project files across a team; a quarterly "run /context and compare" catches it. Every always-loaded line is re-sent on every request (cached, but still consuming the attention budget), so a lean file is both cheaper and more reliable. For untrusted repositories in automation, remember that project CLAUDE.md is instructions from whoever wrote the repo; <code>--setting-sources user</code> or <code>--bare</code> keeps them out.')}

${H.box('trap', 'Traps:', '<b>"Put the team standards in ~/.claude/CLAUDE.md"</b>: not shared, the classic new-hire bug. <b>"Use @imports to save context"</b>: imports load at launch. <b>"The subdirectory CLAUDE.md overrides the root one"</b>: files are additive. <b>"Add IMPORTANT to every line"</b>: dilutes emphasis. <b>"Write NEVER edit generated files in CLAUDE.md"</b> as a guarantee: it is guidance; enforce with deny rules or hooks. <b>"Restate the rule in chat after compaction"</b>: put it in CLAUDE.md, which is re-injected.')}

<h3>Worked scenario</h3>
<p>A platform team has a 540-line root CLAUDE.md covering React, payments (PCI), analytics, testing and deployment. New developers report that Claude ignores the testing conventions, and a senior engineer says "it works fine for me".</p>
<ol class="steps">
<li><b>Diagnose:</b> the senior engineer runs <code>/memory</code> and finds her own <code>~/.claude/CLAUDE.md</code> repeats the testing rules. Her sessions get them twice; everyone else gets them buried in 540 lines.</li>
<li><b>Restructure:</b> root CLAUDE.md shrinks to about 80 lines (commands, architecture, etiquette). Testing, API and deployment content move to <code>.claude/rules/testing.md</code>, <code>api-conventions.md</code>, <code>deployment.md</code>.</li>
<li><b>Scope by package:</b> <code>packages/payments/CLAUDE.md</code> imports <code>@../../docs/standards/pci.md</code>; <code>packages/web-ui/CLAUDE.md</code> imports the React standard.</li>
<li><b>Clean up:</b> the senior engineer deletes the duplicate rules from her user file, keeping only personal preferences.</li>
<li><b>Enforce:</b> "never edit <code>src/generated/**</code>" moves from prose to <code>permissions.deny</code> in <code>.claude/settings.json</code>.</li></ol>
<p><b>Answer pattern:</b> shared standards in project-level files, per-package imports chosen by maintainers, topic rules for modularity, user files for personal content only, deterministic controls for hard rules.</p>

${H.check([
  ['A new hire\'s Claude sessions ignore the commit-message format the rest of the team gets. Where do you look first, and how do you confirm?', 'User-level configuration of the teammates who see the correct behavior: the rule is probably in their <code>~/.claude/CLAUDE.md</code> (or <code>CLAUDE.local.md</code>), which is not in version control. Confirm with <code>/memory</code> (exam answer) or <code>/context</code>, then move it to project CLAUDE.md or <code>.claude/rules/</code>.'],
  ['You replace a 400-line CLAUDE.md with a 40-line file that @imports five standards files. How much context did you save?', 'None. Imports load at launch with their parent. You improved organization. To save context, make content conditional (path rules), directory-scoped (package CLAUDE.md) or on demand (skills).'],
  ['The root CLAUDE.md says "use Jest" and <code>packages/legacy/CLAUDE.md</code> says "use Mocha". What happens when Claude edits a legacy file?', 'Both instructions are in context because files are concatenated, not overridden. The more specific file is read later, which may tip the balance, but the outcome is ambiguous. Make the root rule explicit ("Jest, except packages/legacy which uses Mocha") or remove the conflict.'],
  ['<code>packages/payments/CLAUDE.md</code> contains <code>@docs/standards/pci.md</code> but the standard never appears. Why?', 'Import paths resolve relative to the importing file, so it looks for <code>packages/payments/docs/standards/pci.md</code>. Use <code>@../../docs/standards/pci.md</code>. Also check the chain is within four hops.'],
  ['After a long session auto-compacts, Claude stops following a rule you typed in your first message. Fix?', 'Early chat instructions can be lost in compaction. Put persistent rules in project CLAUDE.md, which is re-injected after compaction, and add compaction instructions there for what must be preserved.'],
  ['A nightly script runs <code>claude --bare -p "..."</code> and ignores team conventions. Why?', '<code>--bare</code> skips auto-discovery of CLAUDE.md, rules, hooks, skills and MCP. Drop <code>--bare</code> for trusted repos, or pass the standards explicitly (for example with <code>--append-system-prompt</code>).']
])}
${H.src([['Claude Code: memory (CLAUDE.md)', 'https://code.claude.com/docs/en/memory'], ['Claude Code best practices', 'https://code.claude.com/docs/en/best-practices'], ['Features overview', 'https://code.claude.com/docs/en/features-overview'], ['CLI reference', 'https://code.claude.com/docs/en/cli-reference'], ['Settings', 'https://code.claude.com/docs/en/settings']])}`;
    }
  });

  /* ------------------------------------------------------------------ 3.2 */
  CCAR.lessons.push({
    id: 'hb-32-commands-skills', track: 'handbook', part: 'P3', num: '3.2', order: 302, domain: 'D3',
    objs: ['X12', 'O14', 'O16'], ts: ['3.2'], minutes: 35,
    title: 'Custom slash commands and skills',
    summary: 'Project vs personal commands and skills, every SKILL.md frontmatter field that matters (context: fork, allowed-tools, argument-hint, disable-model-invocation), arguments, precedence and shadowing, and when a skill beats CLAUDE.md.',
    body: function () {
      return `
<p>Skills and custom slash commands turn a prompt your team keeps retyping into a named, versioned, reusable workflow: <code>/review</code>, <code>/fix-issue 1234</code>, <code>/release</code>. In production they are how you standardize procedures without bloating CLAUDE.md, because a skill\'s full content loads only when it is used. The exam probes the scope question (project <code>.claude/</code> shared via git vs personal <code>~/.claude/</code>), the three frontmatter options it names (<code>context: fork</code>, <code>allowed-tools</code>, <code>argument-hint</code>), personal variants that avoid shadowing, and the skills-vs-CLAUDE.md choice.</p>

<h3>Where commands and skills live</h3>
${H.table(['Type', 'Location', 'Scope', 'Shared via git?', 'Invoked as'], [
  ['<b>Project command</b>', '<code>.claude/commands/review.md</code>', 'Everyone who clones the repo', '<b>Yes</b>', '<code>/review</code>'],
  ['<b>Personal command</b>', '<code>~/.claude/commands/review.md</code>', 'Only you, all projects', 'No', '<code>/review</code>'],
  ['<b>Project skill</b>', '<code>.claude/skills/review/SKILL.md</code> (+ supporting files)', 'Everyone who clones the repo', '<b>Yes</b>', '<code>/review</code>, or automatically by description'],
  ['<b>Personal skill</b>', '<code>~/.claude/skills/review/SKILL.md</code>', 'Only you, all projects', 'No', 'Same'],
  ['<b>Managed skill</b>', 'Deployed by the organization', 'Every managed user', 'No (central)', 'Same'],
  ['<b>Plugin skill</b>', 'Inside an installed plugin', 'Whoever installs the plugin', 'Via the plugin', '<code>/plugin-name:skill-name</code> (namespaced)']
])}
<p>Commands are the older format and still work. A command file and a skill directory with the same name both create the same slash command; skills add a directory for supporting files (templates, scripts, reference docs) and more frontmatter. <b>On a name clash, the skill wins over the command.</b></p>

<h3>Sample question 4, reasoned</h3>
<p>"A custom <code>/review</code> command must be available to every developer when they clone or pull the repository. Where do you create it?"</p>
${H.table(['Option', 'Verdict', 'Why'], [
  ['<code>.claude/commands/</code> in the project repo', '<b>Correct</b>', 'Version-controlled, so every clone or pull gets it automatically'],
  ['<code>~/.claude/commands/</code> in each home directory', 'Wrong', 'Personal scope, not shared; each developer would have to copy it and it drifts'],
  ['The root CLAUDE.md', 'Wrong', 'CLAUDE.md holds instructions and context, not command definitions'],
  ['<code>.claude/config.json</code> with a <code>commands</code> array', 'Wrong', '<b>Does not exist</b> in Claude Code. A plausible-sounding invented config file is a standard distractor']
])}
<p class="small muted">Today <code>.claude/skills/review/SKILL.md</code> is equally correct for team-wide availability. When both appear as options, the exam wording "slash command" plus "clone or pull" points at the project directory, not the file format.</p>

<h3>A complete SKILL.md</h3>
<pre class="code"># .claude/skills/analyze-deps/SKILL.md
---
name: analyze-deps
description: Maps the internal dependency graph of one package and reports
  circular imports, unused modules and the heaviest fan-in files. Use when the
  user asks to analyze dependencies, find cycles, or plan splitting a package.
argument-hint: [package-path]
allowed-tools: Read, Grep, Glob
context: fork
agent: Explore
model: sonnet
effort: low
---
Analyze the dependency graph of the package at $ARGUMENTS.

1. Glob all source files under $0 and Grep their import statements.
2. Build the graph; list every cycle as a path (a -> b -> c -> a).
3. List modules nothing imports, and the 10 files with the most importers.
4. Return ONLY a summary under 40 lines: cycles, unused modules, top fan-in,
   and one recommended first split. Do not paste raw grep output.</pre>

${H.table(['Field', 'What it does', 'Use it for'], [
  ['<code>name</code>', 'The slash-command name (defaults from the directory)', 'Short, verb-like, unique within its scope'],
  ['<code>description</code>', 'What the skill does and when to use it. <b>Claude reads it to decide on automatic invocation</b>', 'Specific triggers ("Use when...") so it fires when it should and not otherwise'],
  ['<code>when_to_use</code>', 'Additional guidance on when the skill applies', 'Disambiguating similar skills'],
  ['<code>argument-hint</code>', 'Shown when invoking, e.g. <code>[package-path]</code>, <code>[issue-number]</code>', 'Prompting developers for required parameters'],
  ['<code>arguments</code>', 'Declared arguments for the skill', 'Structured parameters'],
  ['<code>allowed-tools</code>', 'Tool list tied to the skill (see purple callout)', 'Exam: restrict tools. Docs: pre-approve them'],
  ['<code>disallowed-tools</code>', 'Removes tools while the skill runs', 'Actually preventing Bash, Edit, etc. (current docs)'],
  ['<code>context: fork</code>', 'Runs the skill in an <b>isolated subagent context</b>; only the result returns', 'Verbose analysis, exploratory brainstorming'],
  ['<code>agent</code>', 'Which subagent type runs a forked skill', 'e.g. a read-only Explore agent for analysis'],
  ['<code>model</code>, <code>effort</code>', 'Model and reasoning effort for the skill', 'Cheaper/faster model and low effort for mechanical work'],
  ['<code>disable-model-invocation: true</code>', 'Only a human can invoke it; Claude cannot trigger it and does not see it until invoked', 'Side-effect workflows: deploy, release, commit'],
  ['<code>user-invocable</code>', 'Whether it appears as a user slash command', 'Background knowledge skills Claude loads itself'],
  ['<code>hooks</code>', 'Hooks active while the skill runs', 'Deterministic checks scoped to one workflow'],
  ['<code>paths</code>', 'File patterns that make the skill relevant', 'Skills tied to file types']
])}

<h4>Arguments</h4>
<pre class="code">&gt; /fix-issue 1234
# SKILL.md body:  "Fix GitHub issue $ARGUMENTS following our coding standards."
# $ARGUMENTS = "1234"   $0 = first argument ("1234")</pre>
<p>If a developer types <code>/fix-issue</code> with no argument, the <code>argument-hint</code> (<code>[issue-number]</code>) is what tells them a parameter is required. Write the body so a missing argument makes Claude ask rather than guess.</p>

<h3>context: fork, isolation of conversation context</h3>
${D({ w: 760, h: 230, title: 'Inline skill vs forked skill',
  groups: [{ x: 10, y: 30, w: 360, h: 190, label: 'INLINE (default)', kind: 'soft' }, { x: 390, y: 30, w: 360, h: 190, label: 'context: fork', kind: 'hard' }],
  nodes: [
    { id: 'a1', x: 30, y: 60, w: 150, h: 50, label: 'Main session', sub: 'invokes /analyze-deps', kind: 'agent' },
    { id: 'b1', x: 200, y: 60, w: 150, h: 50, label: 'Skill runs inline', sub: '300 grep hits, 60 reads', kind: 'bad' },
    { id: 'c1', x: 30, y: 145, w: 320, h: 50, label: 'Main context now bloated', sub: 'raw output stays for the rest of the session', kind: 'bad' },
    { id: 'a2', x: 410, y: 60, w: 150, h: 50, label: 'Main session', sub: 'invokes /analyze-deps', kind: 'agent' },
    { id: 'b2', x: 580, y: 60, w: 150, h: 50, label: 'Forked subagent', sub: 'own context, does the work', kind: 'sub' },
    { id: 'c2', x: 410, y: 145, w: 320, h: 50, label: 'Only the 40-line summary returns', sub: 'main context stays clean', kind: 'good' }
  ],
  edges: [{ from: 'a1', to: 'b1' }, { from: 'b1', to: 'c1' }, { from: 'a2', to: 'b2' }, { from: 'b2', to: 'c2' }],
  caption: '<code>context: fork</code> isolates the <b>conversation context</b>. It does not sandbox the file system; a forked skill with write tools can still change files.' })}
<ul>
<li><b>Verbose output</b> (codebase analysis, dependency mapping, log triage): fork so hundreds of tool results never enter the main session.</li>
<li><b>Exploratory context</b> (brainstorming alternative designs): fork so rejected ideas do not anchor the main conversation; bring back only the shortlist.</li>
<li><b>Do not fork</b> when the skill must build on the current conversation (a fork\'s subagent does not see your chat) or when you want the output to stay in context for follow-up edits.</li></ul>

${H.box('exam', 'Exam vs current docs (allowed-tools):', 'The exam guide says <code>allowed-tools</code> <b>restricts tool access during skill execution</b>, for example limiting a skill to file write operations so it cannot run destructive commands. Pick that answer on the exam. Current docs: <code>allowed-tools</code> <b>pre-approves</b> the listed tools (no permission prompt while the skill runs), and <code>disallowed-tools</code> is what <b>removes</b> tools. In real work, to stop a skill running Bash, list Bash under <code>disallowed-tools</code> (and keep project deny rules for anything that must never happen).')}
<pre class="code"># exam framing: a scaffolding skill that may only read and write files
---
name: scaffold-component
description: Creates a new React component with test and story files from our templates.
argument-hint: [ComponentName]
allowed-tools: Read, Write, Edit        # exam: limits the skill to file operations
disallowed-tools: Bash                  # current docs: actually removes Bash
---</pre>

<h3>Precedence and shadowing</h3>
${H.table(['Rule', 'Consequence'], [
  ['Skills override by name: <b>managed &gt; user (personal) &gt; project</b>', 'A personal <code>~/.claude/skills/review/</code> shadows the team\'s <code>.claude/skills/review/</code> for you'],
  ['A skill beats a command of the same name', '<code>.claude/skills/review/</code> wins over <code>.claude/commands/review.md</code>'],
  ['Plugin skills are namespaced', '<code>/acme-tools:review</code> never collides with <code>/review</code>'],
  ['CLAUDE.md is additive, skills are not', 'Two CLAUDE.md files both load; two same-name skills resolve to one']
])}
${H.box('rule', 'Personal variants:', 'To customize a team skill for yourself, copy it to <code>~/.claude/skills/</code> under a <b>different name</b> (<code>review-strict</code>, <code>my-review</code>). A same-name personal copy silently shadows the team version, so when a teammate says "run /review" you get different behavior and team fixes to the project skill never reach you.')}

<h3>Skills vs CLAUDE.md vs the alternatives</h3>
${H.table(['Mechanism', 'Loaded', 'Context cost', 'Best for'], [
  ['<b>CLAUDE.md</b>', 'Always, at session start', 'Every request', 'Universal standards every task needs'],
  ['<b>Skill</b>', 'On demand: user types <code>/name</code>, or Claude matches the description', 'Description every request; full body only when invoked; zero until invoked with <code>disable-model-invocation</code>', 'Task-specific workflows and reference knowledge'],
  ['<b>Path rule</b> (3.3)', 'When matching files are read', 'Only when relevant', 'File-type conventions that must apply automatically'],
  ['<b>Subagent</b>', 'When delegated', 'Isolated; only the summary returns', 'Side tasks that would flood context'],
  ['<b>Hook</b>', 'On lifecycle events', 'Zero unless it outputs', 'Things that must happen every time (guardrails)']
])}
<p><b>Reference skills</b> carry knowledge Claude applies while working (API style guide, domain glossary): let Claude auto-invoke them from a precise description. <b>Action skills</b> perform a procedure with side effects (deploy, release, migrate): set <code>disable-model-invocation: true</code> so only a human triggers them.</p>
<p><b>Adoption triggers:</b> you type the same prompt repeatedly, or paste the same playbook a third time → make it a skill. A second repository needs the same skills, hooks and agents → package them as a plugin.</p>

<h3>Design decisions</h3>
${H.table(['If the situation is', 'Choose', 'Because', 'You give up'], [
  ['Team workflow everyone should have on clone', '<code>.claude/skills/</code> or <code>.claude/commands/</code>, committed', 'Version-controlled, reviewed, shared', 'Personal tweaks need a differently named copy'],
  ['Your own shortcut', '<code>~/.claude/skills/</code> with a unique name', 'No effect on teammates', 'Not reproducible for others'],
  ['Skill produces large intermediate output', '<code>context: fork</code> (optionally <code>agent</code>, cheaper <code>model</code>)', 'Main context stays clean', 'The fork cannot see the current conversation'],
  ['Skill has side effects', '<code>disable-model-invocation: true</code> + narrow tools', 'Human decides when it runs', 'No automatic triggering'],
  ['Knowledge needed on every task', 'CLAUDE.md, not a skill', 'Always present, no invocation risk', 'Always costs context'],
  ['Same setup in many repos', 'Plugin', 'One install, namespaced, versioned', 'Plugin maintenance']
])}

${H.box('real', 'Real-world notes:', 'Descriptions are routing logic: vague ones ("helps with code") fire randomly or never, and every description is sent on every request, so dozens of verbose skills cost context. Test a new skill by asking the kinds of questions that should and should not trigger it. Keep side-effect skills human-invoked and back them with permission rules, since frontmatter is not a security boundary. Review skill changes in PRs like code; a bad edit to a shared skill changes behavior for the whole team on their next pull.')}

${H.box('trap', 'Traps:', '<b>"~/.claude/commands/ so everyone has it"</b>: personal. <b>".claude/config.json commands array"</b>: does not exist. <b>"Put the workflow in CLAUDE.md"</b>: always loaded, wastes context for an occasional task. <b>"Same-name personal skill to customize"</b>: shadows the team version. <b>"context: fork prevents file changes"</b>: it isolates conversation context only. <b>"disable-model-invocation hides the skill\'s output"</b>: it only controls who triggers it; use fork for output isolation. <b>"/compact after each analysis"</b>: lossy and after the fact; fork up front.')}

<h3>Worked scenario</h3>
<p>A team wants three workflows: a <code>/review</code> checklist for everyone, a <code>/codebase-map</code> that scans a 200-module repo, and a <code>/release</code> that tags and publishes. One developer wants a stricter review for himself.</p>
<ol class="steps">
<li><code>/review</code> → <code>.claude/skills/review/SKILL.md</code>, committed. Description names when it applies; the checklist lives in a supporting file in the skill directory.</li>
<li><code>/codebase-map</code> → <code>context: fork</code>, <code>agent: Explore</code>, read-only tools, returns a bounded summary. The scan never floods the main session.</li>
<li><code>/release</code> → <code>disable-model-invocation: true</code>, <code>argument-hint: [version]</code>, narrow tool list; publishing commands also gated by project permission rules.</li>
<li>Stricter review → <code>~/.claude/skills/review-strict/</code>, a <b>different name</b>, so <code>/review</code> still means the team version for him too.</li></ol>

${H.check([
  ['A developer puts <code>deploy.md</code> in <code>~/.claude/commands/</code> and tells the team to use <code>/deploy</code>. Two teammates report it does not exist. Why, and what is the fix?', 'User-scoped commands live in the author\'s home directory and are not shared. Move it to <code>.claude/commands/</code> (or <code>.claude/skills/deploy/SKILL.md</code>) in the repo and commit.'],
  ['Your <code>/audit-deps</code> skill reads 150 files and leaves the session sluggish and unfocused. Which single frontmatter change helps most?', '<code>context: fork</code>. The work runs in an isolated subagent context and only the summary returns. Instruct the skill to return a bounded summary.'],
  ['On the exam, how do you limit a skill to file operations so it cannot run destructive commands? How would you do it against current docs?', 'Exam: <code>allowed-tools</code> in the SKILL.md frontmatter (for example Read, Write, Edit). Current docs: <code>allowed-tools</code> pre-approves; use <code>disallowed-tools: Bash</code> to remove Bash, backed by deny rules for anything critical.'],
  ['You copy the team\'s <code>review</code> skill to <code>~/.claude/skills/review/</code> and tweak it. What goes wrong?', 'Personal skills take precedence over project skills of the same name, so your copy shadows the team version. You stop getting team updates and "/review" means something different for you. Use a different name.'],
  ['Should a 150-line "how to write a database migration" procedure go in CLAUDE.md or a skill?', 'A skill. It is task-specific and occasional; CLAUDE.md is for always-loaded universal standards. As a skill only the description costs context until it is invoked.'],
  ['Developers keep running <code>/generate-client</code> without the service name and Claude guesses. Fix?', 'Add <code>argument-hint: [service-name]</code> so the parameter is prompted, reference <code>$ARGUMENTS</code> in the body, and instruct Claude to ask when it is missing.']
])}
${H.src([['Claude Code: skills', 'https://code.claude.com/docs/en/skills'], ['Features overview', 'https://code.claude.com/docs/en/features-overview'], ['Claude Code best practices', 'https://code.claude.com/docs/en/best-practices'], ['Agent SDK overview', 'https://code.claude.com/docs/en/agent-sdk/overview']])}`;
    }
  });

  /* ------------------------------------------------------------------ 3.3 */
  CCAR.lessons.push({
    id: 'hb-33-path-rules', track: 'handbook', part: 'P3', num: '3.3', order: 303, domain: 'D3',
    objs: ['O16'], ts: ['3.3'], minutes: 20,
    title: 'Path-specific rules for conditional conventions',
    summary: 'How .claude/rules/ files with a paths: glob list load only when Claude works on matching files, why that beats subdirectory CLAUDE.md for conventions spread across a codebase, and the pitfalls (ignored frontmatter keys, monorepo globs, diff-only CI reviews).',
    body: function () {
      return `
<p>Many conventions apply to a <b>kind of file</b>, not to a directory: every test file, every Terraform module, every API handler. Loading all of them at launch wastes context and dilutes attention; hoping Claude picks the right section of a big CLAUDE.md is unreliable. Path-specific rules solve this: a rule file in <code>.claude/rules/</code> declares glob patterns in <code>paths:</code> frontmatter and enters context only when Claude reads or edits a matching file. The exam probes the syntax, the token-saving reason, and above all the choice of path rules over subdirectory CLAUDE.md files for files spread across the codebase (sample question 6).</p>

<h3>Syntax</h3>
<div class="two"><div>
<pre class="code"># .claude/rules/terraform.md
---
paths: ["terraform/**/*"]
---
- Pin every provider version.
- Every resource has the mandatory tags block.
- No inline IAM policies; use modules/iam.
- Never run apply; plan output only.</pre>
</div><div>
<pre class="code"># .claude/rules/testing.md
---
paths: ["**/*.test.tsx", "**/*.test.ts"]
---
- Use React Testing Library; query by role.
- One behavior per test; name it "does X when Y".
- Use factories in test/factories, not inline
  object literals.
- No snapshot tests for logic.</pre>
</div></div>
<pre class="code"># .claude/rules/api-handlers.md
---
paths: ["src/api/**/*"]
---
- Handlers are async/await; wrap errors in ApiError with a stable code.
- Validate input with the shared schema before any database call.</pre>

<h3>Loading mechanics</h3>
${H.table(['Rule file', 'When it loads', 'Effect'], [
  ['<code>.claude/rules/x.md</code> <b>without</b> <code>paths</code>', 'At session start, like CLAUDE.md', 'Always in context: modular organization only'],
  ['<code>.claude/rules/x.md</code> <b>with</b> <code>paths</code>', 'When Claude reads (or edits) a file matching any glob', 'Conditional: only relevant conventions consume context'],
  ['<code>~/.claude/rules/x.md</code>', 'Same rules, user level', 'Personal, all projects, not shared via git'],
  ['Frontmatter with <code>globs:</code> or <code>alwaysApply:</code> instead of <code>paths</code>', 'At session start (the keys are ignored)', 'Silently unconditional: <code>paths</code> is the only supported frontmatter field']
])}

${D({ w: 760, h: 250, title: 'Path rule activation',
  nodes: [
    { id: 't', x: 20, y: 40, w: 170, h: 54, label: 'Task: fix Button test', sub: 'user prompt', kind: 'human' },
    { id: 'r', x: 230, y: 40, w: 190, h: 54, label: 'Read Button.test.tsx', sub: 'src/ui/Button/Button.test.tsx', kind: 'tool' },
    { id: 'g', x: 460, y: 40, w: 280, h: 54, label: 'Glob match: **/*.test.tsx', sub: 'testing.md paths match this file', kind: 'good' },
    { id: 'c', x: 460, y: 150, w: 280, h: 60, label: 'testing.md joins context', sub: 'conventions applied to the edit', kind: 'agent' },
    { id: 'n', x: 20, y: 150, w: 400, h: 60, label: 'terraform.md, api-handlers.md stay out', sub: 'no matching file read, zero tokens', kind: 'note' }
  ],
  edges: [{ from: 't', to: 'r' }, { from: 'r', to: 'g' }, { from: 'g', to: 'c' }],
  caption: 'Activation is driven by the files Claude actually touches, not by the wording of the prompt. That is what makes it deterministic compared with hoping Claude infers which CLAUDE.md section applies.' })}

<h3>Glob patterns</h3>
${H.table(['Pattern', 'Matches', 'Does not match'], [
  ['<code>terraform/**/*</code>', 'Everything under <code>terraform/</code> at any depth', '<code>infra/terraform/main.tf</code> (different root)'],
  ['<code>**/*.test.tsx</code>', '<code>Button.test.tsx</code> in any directory, e.g. <code>src/ui/Button/Button.test.tsx</code>', '<code>Button.spec.tsx</code>, <code>Button.test.ts</code>'],
  ['<code>src/api/**/*</code>', 'All files under <code>src/api/</code>', '<code>apps/api/src/handlers.ts</code>'],
  ['<code>**/*.tf</code>', 'Terraform files anywhere', 'Variable files (<code>*.tfvars</code>) unless listed too'],
  ['<code>**/migrations/**/*</code>', 'Migration files in every package', 'Seed scripts elsewhere']
])}
${H.box('trap', 'Monorepo pitfall:', 'Globs are relative to the <b>project root</b>, not to the rule file or the package. A rule written for a single-app repo as <code>src/api/**/*</code> matches nothing after the code moves to <code>apps/api/src/</code>. Use <code>apps/*/src/api/**/*</code> or <code>**/api/**/*</code>, and verify with <code>/context</code> after reading a target file.')}

<h3>Sample question 6, reasoned</h3>
<p>React components use functional style with hooks, API handlers use async/await with specific error handling, database models follow a repository pattern, and test files sit next to the code they test (<code>Button.test.tsx</code> next to <code>Button.tsx</code>). All tests must follow the same conventions wherever they are. What is the most maintainable way for Claude to apply the right conventions automatically?</p>
${H.table(['Option', 'Mechanism', 'Verdict'], [
  ['A', '<code>.claude/rules/</code> files with <code>paths:</code> globs (<code>**/*.test.tsx</code>, <code>src/api/**/*</code>)', '<b>Correct.</b> Explicit file matching, independent of directory, loads only when relevant'],
  ['B', 'All conventions in root CLAUDE.md under headers per area', 'Wrong: relies on Claude <b>inferring</b> which section applies; everything always loaded'],
  ['C', 'One skill per code type in <code>.claude/skills/</code>', 'Wrong: needs manual invocation or Claude choosing to load it; not automatic by file path'],
  ['D', 'A CLAUDE.md in each subdirectory', 'Wrong: CLAUDE.md files are <b>directory-bound</b>; tests spread across dozens of folders would need a copy in each']
])}

<h3>Path rules vs the alternatives</h3>
${H.table(['Mechanism', 'Scope unit', 'Trigger', 'Choose when'], [
  ['<b>Path rule</b> (<code>paths:</code>)', 'Any set of files a glob can describe', 'Claude reads a matching file', 'Conventions by file type or cross-cutting location (tests, Terraform, handlers)'],
  ['<b>Subdirectory CLAUDE.md</b>', 'One directory subtree', 'Claude reads a file in that directory', 'Conventions that really belong to one package or folder'],
  ['<b>Skill</b>', 'A task', 'User invokes it, or Claude matches its description', 'Procedures and workflows, not always-on conventions'],
  ['<b>Root CLAUDE.md section</b>', 'Whole project', 'Always loaded', 'Short universal rules every task needs'],
  ['<b>Unscoped rule</b>', 'Whole project', 'Always loaded', 'Universal topics you want in separate files'],
  ['<b>Hook / permission</b>', 'Tool calls', 'Every matching tool call', 'Must be enforced, not merely suggested']
])}

<h3>Exam skills: how to do each one</h3>
${H.table(['Skill (exam guide 3.3)', 'How', 'Why'], [
  ['Create path-scoped rules', '<code>.claude/rules/terraform.md</code> with <code>paths: ["terraform/**/*"]</code>', 'Terraform conventions load only when Terraform files are in play'],
  ['Apply conventions by file type anywhere', '<code>paths: ["**/*.test.tsx"]</code>', 'Matches test files regardless of directory'],
  ['Prefer path rules over subdirectory CLAUDE.md for spread-out files', 'One rule file with a glob instead of N directory files', 'One source of truth, no copies to drift, automatic matching']
])}

<h3>When path rules do not fire</h3>
<ul>
<li><b>Diff-only CI review.</b> A pipeline that pipes <code>git diff</code> into <code>claude -p</code> never reads the changed files, so no path rule loads and the review ignores your test and API conventions. Let the review read the changed files, put review-critical standards in CLAUDE.md or an unscoped rule, or pass them explicitly.</li>
<li><b>Wrong frontmatter key.</b> <code>globs:</code> or <code>alwaysApply:</code> (conventions from other tools) are ignored, so the rule loads for every session: no error, just wasted context.</li>
<li><b>Root mismatch.</b> Globs written for another layout (see monorepo pitfall).</li>
<li><b>Discovery skipped.</b> <code>--bare</code> skips auto-discovery; rules do not load.</li>
<li><b>Before any file is read.</b> A planning question asked before Claude opens a matching file will not have the rule yet. If the rule matters from the first turn, it is not a path rule candidate.</li></ul>

${H.box('exam', 'Exam wording:', 'The guide says path-scoped rules load "only when editing matching files". Current docs describe loading when Claude <b>reads</b> matching files, which in practice precedes any edit. Both lead to the same answers: conditional loading keyed on file paths, reducing irrelevant context and token usage.')}

<h3>Design decisions</h3>
${H.table(['If the situation is', 'Choose', 'Because', 'You give up'], [
  ['Test conventions for test files in every folder', '<code>.claude/rules/testing.md</code>, <code>paths: ["**/*.test.tsx"]</code>', 'Glob spans directories', 'Rule absent until a test file is read'],
  ['Conventions only for <code>terraform/</code>', 'Path rule <code>terraform/**/*</code> (or <code>terraform/CLAUDE.md</code>)', 'Either is directory-bound here; the rule keeps all rules in one place', 'Nothing significant'],
  ['Legacy package with its own style', '<code>packages/legacy/CLAUDE.md</code>', 'Truly one subtree; owned by that team', 'Cannot cover similar files elsewhere'],
  ['Rule needed from turn one on every task', 'Root CLAUDE.md or unscoped rule', 'Path rules wait for a matching read', 'Always-on context cost'],
  ['Reviewer in CI must apply file-type standards', 'Have the review read changed files, or load standards unconditionally', 'Diff text alone never triggers path rules', 'More tokens per review'],
  ['"Never modify generated files"', '<code>permissions.deny</code> / PreToolUse hook', 'Rules are context, not enforcement', 'Setup effort']
])}

${H.box('real', 'Real-world notes:', 'Path rules are the main lever for keeping a large repo\'s instruction set under control: the root file stays short and each domain team owns a rule file with its glob. Keep each rule short and specific to its files. After adding or moving code, check a representative file with <code>/context</code> to confirm the rule actually attaches. Personal file-type preferences go in <code>~/.claude/rules/</code>, never in the committed directory.')}

${H.box('trap', 'Traps:', '<b>"Subdirectory CLAUDE.md in every folder with tests"</b>: directory-bound, duplicated, drifts. <b>"Root CLAUDE.md with headers per area"</b>: inference, not matching. <b>"A skill per file type"</b>: depends on invocation. <b>"Use globs: or alwaysApply: frontmatter"</b>: ignored; only <code>paths</code> works. <b>"Path rules will guide the diff-only CI reviewer"</b>: nothing is read, nothing loads. <b>"Path rules guarantee compliance"</b>: they are context; enforce hard rules with hooks or permissions.')}

<h3>Worked scenario</h3>
<p>A monorepo has <code>apps/web</code>, <code>apps/api</code> and <code>infra/terraform</code>. Test files (<code>*.test.tsx</code>, <code>*.test.ts</code>) live beside source in every app. A rule <code>.claude/rules/api.md</code> with <code>paths: ["src/api/**/*"]</code> "stopped working" after the code moved into <code>apps/</code>, and a teammate\'s <code>testing.md</code> uses <code>globs:</code> frontmatter.</p>
<ol class="steps">
<li><b>api.md:</b> globs are relative to the project root; change to <code>paths: ["apps/api/**/*"]</code>.</li>
<li><b>testing.md:</b> replace <code>globs:</code> with <code>paths: ["**/*.test.tsx", "**/*.test.ts"]</code>. It had been loading into every session.</li>
<li><b>terraform.md:</b> <code>paths: ["infra/terraform/**/*"]</code>; the "never apply" line also becomes a deny rule for the apply command in <code>.claude/settings.json</code>.</li>
<li><b>Verify:</b> open a test file and an API handler, run <code>/context</code>, confirm only the matching rules are present.</li>
<li><b>CI:</b> the diff-only review job is changed to read the changed files so the same rules apply there.</li></ol>

${H.check([
  ['Test files live next to components in 40 folders. Why is a path rule better than 40 subdirectory CLAUDE.md files?', 'CLAUDE.md files are directory-bound, so you would need a copy in every folder, and copies drift. One rule with <code>paths: ["**/*.test.tsx"]</code> matches test files anywhere and loads only when one is read.'],
  ['A rule file has frontmatter <code>alwaysApply: false</code> and <code>globs: ["**/*.sql"]</code>, yet it appears in every session. Why?', '<code>paths</code> is the only supported frontmatter field; the others are ignored, so the rule has no scope and loads at launch. Rename the key to <code>paths</code>.'],
  ['Your CI job runs <code>git diff | claude -p "review this"</code>. The review ignores the API conventions in a path rule. Why?', 'Path rules load when Claude reads matching files. The diff arrives as prompt text and no file is read, so the rule never loads. Let the review read the changed files, or load review standards unconditionally.'],
  ['Why is "put everything in the root CLAUDE.md under headers" the wrong answer to sample question 6?', 'It relies on Claude inferring which section applies (unreliable) and loads every area\'s conventions into every session (context cost). Path rules match explicitly by file path.'],
  ['Which rule loads at session start: one with no frontmatter or one with <code>paths: ["docs/**/*"]</code>?', 'The one with no frontmatter. Without <code>paths</code> a rule behaves like CLAUDE.md; with <code>paths</code> it waits for a matching file read.']
])}
${H.src([['Claude Code: memory and .claude/rules/', 'https://code.claude.com/docs/en/memory'], ['Features overview', 'https://code.claude.com/docs/en/features-overview'], ['Claude Code best practices', 'https://code.claude.com/docs/en/best-practices']])}`;
    }
  });
})();
