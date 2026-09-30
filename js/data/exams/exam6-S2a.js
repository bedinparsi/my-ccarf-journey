/* Practice Exam 6, Scenario S2 (Code Generation with Claude Code), items 01-08 */
CCAR.addQuestions('exam6', [
  {
    id: 'e6-S2-01', scenario: 'S2', domain: 'D1', obj: 'O08', type: 'single', select: 1,
    stem: `<p>Farwell Journeys, a travel-booking company, is replacing its home-grown date library, <code>@farwell/chrono</code>, with the Temporal API across a 380k-line TypeScript monorepo. A search finds 52 files in 11 packages that import it; the Booking team owns eight of those packages and the Pricing team owns three. A quick look at a handful of files suggests at least three usage styles: display formatting in React components, a Pricing wrapper that does time-zone arithmetic for fare rules, and helpers that serialize local departure times into booking records. Nobody yet knows whether the wrapper relies on the library's habit of treating strings without an offset as UTC.</p>
<p>Anika, the developer leading the work, has used Claude Code daily for six months. Her last task, a single-file fix for a time-zone bug in the invoice footer, went smoothly in direct execution, and last week the team moved its sessions to Opus 5.5. Company policy says the principal architect must approve the migration approach before any file is edited, and each team wants its packages changed in separate pull requests that its own reviewers can check.</p>
<p>How should Anika run this migration with Claude Code?</p>`,
    options: [
      `Use direct execution with a detailed prompt that maps every <code>chrono</code> function to its Temporal equivalent, then send the architect the finished migration diffs so the approach is reviewed against real code.`,
      `Use direct execution on the smallest Booking package first, let the results show which usage styles really matter, and then bring that working example to the architect before migrating the rest.`,
      `Start in plan mode, using the Explore subagent to survey all 52 files, write a migration plan grouped by usage style for the architect, then switch to direct execution one package at a time.`,
      `Have Claude spawn one subagent per importing file right away, so all 52 files are migrated in parallel, and then ask the architect and both teams to review the combined result in one sitting.`
    ],
    answer: [2],
    explanation: `Plan mode fits large-scale, multi-file changes with several valid approaches and architectural decisions; direct execution fits simple, well-scoped changes. This migration has every planning trigger: 52 files in 11 packages, three usage styles nobody has analyzed, and an open question about how the Pricing wrapper treats strings without an offset. The approval policy adds a hard phase boundary before the first edit. Plan mode lets Claude explore without changing files, the Explore subagent keeps the verbose survey out of the main context, and a plan grouped by usage style gives the architect a concrete approach to approve. After approval, direct execution per package matches the teams' request for separate pull requests. The detailed prompt and the pilot package both edit files before approval, and per-file fan-out lets each subagent guess its own answer to the UTC question. The Opus 5.5 move and the smooth invoice fix are noise: that fix was exactly the kind of change direct execution suits.`,
    rationales: [
      `Editing first and showing the architect finished diffs breaks the approve-before-edit policy, and no prompt can map functions correctly while the Pricing wrapper's UTC behavior is still unknown.`,
      `A pilot package still edits files before the architect approves an approach, and the smallest Booking package may not contain the Pricing wrapper's time-zone arithmetic at all.`,
      `Correct. Plan mode and the Explore subagent map all three usage styles without edits, the architect approves a concrete plan, and direct execution then proceeds one package per pull request.`,
      `Parallel per-file edits start before anyone approves an approach, give each subagent its own guess about the UTC question, and produce one combined result instead of per-team pull requests.`
    ],
    trap: `Direct execution or immediate fan-out when the task needs plan, approval, then execution`,
    signals: `Decisive: 52 files in 11 packages, three usage styles whose interactions nobody understands, and a policy that the architect approves the approach before any file is edited. Noise: the Opus 5.5 move and Anika's smooth single-file fix, which was the well-scoped kind of change direct execution suits and says nothing about this migration.`
  },
  {
    id: 'e6-S2-02', scenario: 'S2', domain: 'D1', obj: 'O08', type: 'multi', select: 2,
    stem: `<p>Fernhill Parking runs <code>gate-api</code>, a 900-file Express service written in 2016 that authorizes garage entry for its mobile app. About 0.4% of requests end in a 502 from the load balancer, mostly between 7 and 9 a.m. Nobody on the current team wrote the service; its original authors left two years ago.</p>
<p>Yesterday a developer asked Claude Code, in direct execution, to "find why gate-api returns 502s." Claude ran broad searches for "timeout", "proxy", "next(" and "res.status" that returned over 1,300 matching lines, read dozens of route files, and the session compacted twice. By the end, its answers had drifted toward typical Express patterns: it suggested raising a body-parser limit the service does not use and recommended a cluster setup that already exists. The on-call notes name two suspects: the keep-alive settings in <code>src/server.js</code> and the session-refresh middleware in <code>src/middleware/auth/</code>. Either way, the fix is expected to be a few lines.</p>
<p>Engineering policy says any change under <code>src/middleware/auth/</code> needs a written plan reviewed by a second engineer. The service moved from Node 18 to Node 22 in the spring without incident, and the team's dashboards moved to Datadog last month.</p>
<p>Which two changes should the developer make to how Claude Code is used for this task? (Select 2.)</p>`,
    options: [
      `Hand the discovery work across the 900 files to the Explore subagent, so the verbose search and read output stays in its own context and only a summary of the suspect paths comes back.`,
      `Move the session to a model with a larger context window, so that all of the search and read output from the 900 files fits at once and earlier findings are no longer lost to compaction.`,
      `Keep the session in plan mode for the whole task, including the fix itself, so that the second engineer reviews every line Claude changes in the auth middleware or server settings before it is applied.`,
      `Investigate the suspects in plan mode and propose the change for the second engineer's review, then switch to direct execution to apply the approved fix, since it touches only a few lines.`,
      `Start in direct execution on the two suspects to move quickly, and switch to plan mode only if the fix turns out to span several files, since a change of a few lines needs no written plan.`
    ],
    answer: [0, 3],
    explanation: `The session failed in two separate ways, and each needs its own fix. The drift came from context exhaustion: more than 1,300 lines of search output and two compactions left little room for the code that matters, so answers slid toward generic Express advice. The Explore subagent exists for verbose discovery; it searches and reads in its own context and returns a summary. The unknown root cause and the review policy call for plan mode: Claude investigates and proposes the change without editing, the second engineer reviews the written plan, and the small approved fix then suits direct execution. That is the documented pairing of plan mode for investigation with direct execution for implementation. A larger window only holds more low-signal output, and recall degrades as context fills. Staying in plan mode after approval adds nothing to a few-line change, and starting in direct execution repeats yesterday's session. The Node 22 upgrade and the Datadog move are noise.`,
    rationales: [
      `Correct. Yesterday's drift followed 1,300 lines of search output and two compactions in the main session; Explore absorbs that verbose discovery and returns only a summary of the suspect paths.`,
      `A bigger window holds more of the same low-signal output, and recall degrades as context fills, so the drift toward generic Express advice would likely return in a longer session.`,
      `After the second engineer approves the plan, the fix is a few well-scoped lines; plan mode is for exploring and designing, so staying in it only delays applying the approved change.`,
      `Correct. Plan mode investigates and proposes without editing, which gives the second engineer a written plan to review for <code>src/middleware/auth/</code>, and direct execution then applies the small approved fix.`,
      `The root cause is unknown and one suspect sits in <code>src/middleware/auth/</code>, so starting in direct execution repeats yesterday's context flood and risks editing auth code before any plan is reviewed.`
    ],
    trap: `Bigger context or a single mode for the whole task instead of Explore plus plan then execute`,
    signals: `Decisive: more than 1,300 lines of search output and two compactions preceded the drift, policy requires a reviewed plan for changes under <code>src/middleware/auth/</code>, and the fix is expected to be a few lines. Noise: the Node 22 upgrade and the Datadog move, which have nothing to do with how the investigation is run.`
  },
  {
    id: 'e6-S2-03', scenario: 'S2', domain: 'D3', obj: 'O16', type: 'single', select: 1,
    stem: `<p>Kestrel Mobility, a scooter-sharing company, keeps its Protocol Buffers definitions in <code>proto/</code> and generates TypeScript clients into <code>gen/</code> with <code>make proto</code>. Fourteen developers use Claude Code on the monorepo from VS Code, JetBrains IDEs and Neovim. For a year the root CLAUDE.md has said: "Never edit files in gen/. Change the .proto file and run make proto."</p>
<p>Last Tuesday a developer asked Claude to add a refund reason to the billing API. The diff looked reasonable and was merged, but the next <code>make proto</code> run regenerated <code>gen/</code> without the new field, and the billing build broke for everyone until the cause was traced three hours later. The session log:</p>
<pre>Read   proto/billing.proto
Read   gen/billing_pb.ts
Edit   gen/billing_pb.ts                (+14 lines)
Edit   services/billing/src/refunds.ts
Done: added refundReason to Refund and used it in refunds.ts</pre>
<p>The lead wants a guarantee that Claude never edits a generated file in any developer's session, that it is sent to <code>make proto</code> when it tries, and that new hires are covered without an extra setup step. The repository already runs Husky pre-commit hooks for lint-staged.</p>
<p>Which change best meets these requirements?</p>`,
    options: [
      `Create <code>.claude/rules/generated.md</code> with <code>paths: ["gen/**"]</code>, stating that generated files must never be edited and that Claude should run <code>make proto</code>, so the rule loads whenever Claude works in <code>gen/</code>.`,
      `Add a PreToolUse hook for Edit and Write to the committed <code>.claude/settings.json</code> that exits with code 2 for any path under <code>gen/</code>, with a message telling Claude to run <code>make proto</code> instead.`,
      `Add a PreToolUse hook that blocks Edit and Write under <code>gen/</code> to each developer's <code>~/.claude/settings.json</code> during onboarding, so every engineer's sessions are protected without changing the shared repository.`,
      `Extend the existing Husky pre-commit hook to reject any commit that changes <code>gen/</code> unless <code>make proto</code> reproduces the same files, so a hand-edited generated file can never reach the main branch.`
    ],
    answer: [1],
    explanation: `CLAUDE.md and rules files are context that Claude usually follows, not enforcement, and the session log shows the year-old instruction being ignored. A guarantee needs a hook. A PreToolUse hook matching Edit and Write runs before the tool call; when the target path is under <code>gen/</code>, exit code 2 blocks the call and the hook's stderr message goes back to Claude, which can then run <code>make proto</code> as intended. Because the hook lives in the committed <code>.claude/settings.json</code>, it applies to every developer's session and to new hires with no extra step, whatever editor they use. A path-scoped rule loads the same kind of instruction that already failed. User-level settings depend on each developer completing onboarding and drift over time. The Husky hook is tempting because it already exists, but it runs at commit time, after Claude has edited the file, so it cannot deliver the guarantee that Claude never edits generated code.`,
    rationales: [
      `A path-scoped rule loads the same kind of instruction as the CLAUDE.md line that Claude ignored last Tuesday; loading it at the right moment still enforces nothing.`,
      `Correct. Exit code 2 stops the edit before it happens and returns the message to Claude, and committed project settings cover all fourteen developers and every new hire.`,
      `User-level settings live outside the repository, so each new hire needs an extra setup step and copies drift when the hook changes, which is exactly what the lead wants to avoid.`,
      `A commit hook runs only after Claude has already edited <code>gen/billing_pb.ts</code>, so it cannot stop the edit, and developers who commit by hand see the rejection after the session ends.`
    ],
    trap: `Instructions, user-level config or commit-time checks instead of a committed PreToolUse hook`,
    signals: `Decisive: the year-old CLAUDE.md instruction was ignored in the logged session, and the lead needs a guarantee in every developer's session, new hires included, with Claude pointed to <code>make proto</code>. Noise: the existing Husky setup, which tempts a commit-time check, and the mix of editors, which has no bearing on project settings.`
  },
  {
    id: 'e6-S2-04', scenario: 'S2', domain: 'D3', obj: 'O16', type: 'multi', select: 2,
    stem: `<p>Brambleway, an online furniture retailer, keeps its React design system in a pnpm monorepo of 40 packages, and 22 engineers use Claude Code on it. A staff engineer is cleaning up the team's setup. The root CLAUDE.md has grown to 410 lines, and engineers say Claude follows its rules less reliably than it did when the file was short.</p>
<p>She has four needs. First, the roughly 600 Storybook files matching <code>**/*.stories.tsx</code>, spread across all 40 packages, must follow the team's CSF3 conventions whenever Claude edits them. Second, a 12-step release-notes workflow, run twice a month, reads every pull request merged since the last tag and produces about 20k tokens of intermediate output before the final notes. Third, everyone must use pnpm, never npm. Fourth, Claude must never force-push, because a force push to a release branch last spring destroyed two days of work. The team also moved from Jest to Vitest in June, and most engineers work on macOS. She has drafted five proposals.</p>
<p>Which two proposals put their need in the right mechanism? (Select 2.)</p>`,
    options: [
      `Move the CSF3 conventions into <code>docs/storybook.md</code> and add <code>@docs/storybook.md</code> to the root CLAUDE.md, so the conventions load only in sessions where Claude edits files matching <code>**/*.stories.tsx</code>.`,
      `Move the CSF3 conventions into <code>.claude/rules/storybook.md</code> with <code>paths: ["**/*.stories.tsx"]</code>, so they load only when Claude works with a story file, wherever it lives.`,
      `Add the 12-step release-notes procedure to the root CLAUDE.md, so that it is available in every session and nobody has to remember the steps or how to start the workflow twice a month.`,
      `Add "IMPORTANT: never run <code>git push --force</code>" near the top of the root CLAUDE.md, so every session receives the rule at launch and Claude declines any force push to a release branch.`,
      `Package the release-notes procedure as <code>.claude/skills/release-notes/SKILL.md</code> with <code>context: fork</code>, so it loads on demand, runs in an isolated context and returns only the finished draft.`
    ],
    answer: [1, 4],
    explanation: `Each need has a natural home. Conventions for files spread across many directories belong in a path-scoped rule: <code>paths: ["**/*.stories.tsx"]</code> loads the CSF3 rules only when Claude works with matching files, in any package, and costs nothing elsewhere. A long, occasional workflow belongs in a skill, which loads on demand; <code>context: fork</code> runs it in an isolated subagent context, so the 20k tokens of pull request data stay out of the main conversation. An @import defers nothing, because imported files load at launch, so the conventions would reach every session and inflate a 410-line file that is already followed less reliably. The release procedure in CLAUDE.md would cost context in every session for a task run twice a month. A force-push ban is a must-never requirement, and CLAUDE.md is context, not enforcement; it needs a permissions deny rule or a PreToolUse hook. The pnpm rule, a universal standard, is what CLAUDE.md is for.`,
    rationales: [
      `Imports load when the session starts, so the CSF3 conventions would reach every session, even ones that never touch a story file, and the 410-line CLAUDE.md effectively grows.`,
      `Correct. A glob-scoped rule covers story files wherever they live across the 40 packages and loads only when Claude works with them, which one subdirectory CLAUDE.md could not do.`,
      `A procedure used twice a month would cost context in every session and add 12 steps to a file already too long to be followed reliably, and its output would still fill the main conversation.`,
      `CLAUDE.md is context that Claude usually follows, not enforcement; after last spring's lost work, a must-never rule needs a permissions deny rule or a PreToolUse hook that blocks the command.`,
      `Correct. A project skill loads only when the workflow runs, and <code>context: fork</code> keeps the 20k tokens of intermediate output in an isolated context, returning only the draft notes.`
    ],
    trap: `Imports or CLAUDE.md for conditional, occasional or must-never needs`,
    signals: `Decisive: story files are spread across all 40 packages, the release workflow runs twice a month with 20k tokens of intermediate output, and force pushes must never happen. Noise: the Jest to Vitest move and the engineers' macOS laptops. The 410-line CLAUDE.md is a hint against adding more always-loaded content.`
  },
  {
    id: 'e6-S2-05', scenario: 'S2', domain: 'D3', obj: 'X07', type: 'single', select: 1,
    stem: `<p>Hollowbrook Genomics builds its sequencing pipelines in a Python monorepo that 18 engineers work on with Claude Code. The team's standards are uv for dependencies, ruff for linting and formatting, and shared fixtures in <code>tests/fixtures/</code>. Dmitri joined last week and reports that Claude ignores all three in his sessions: it runs <code>pip install</code>, formats with black and defines fixtures inline in each test module. Priya, the tech lead, says Claude follows the standards every time for her, and the two of them confirmed that they run the same Claude Code version.</p>
<p>The repository's root CLAUDE.md contains only this:</p>
<pre># Hollowbrook pipelines
@~/.claude/team-python.md
@docs/testing.md</pre>
<p>Priya wrote the Python standards two years ago, when she was the only engineer on the project. <code>docs/testing.md</code> explains how to run the suites against the sample genomes. Dmitri works on Windows while Priya uses macOS, and IT imaged his laptop with the standard developer setup. Three more engineers join next month.</p>
<p>Which approach best diagnoses and fixes the problem?</p>`,
    options: [
      `Have Dmitri copy Priya's <code>~/.claude/team-python.md</code> into the same location in his own home directory, so the existing import resolves on his Windows laptop exactly the way it does on hers.`,
      `Add "IMPORTANT: always follow the team's Python standards for dependencies, linting and test fixtures" to the top of the root CLAUDE.md, so Claude gives those conventions more weight in every session.`,
      `Turn the Python standards into a skill in the repository that Dmitri invokes at the start of each session, so the conventions load on demand whenever he is working on the pipelines.`,
      `Use <code>/memory</code> in Dmitri's session to see which files load, then move the standards into a repository file such as <code>docs/standards/python.md</code> and import it by relative path.`
    ],
    answer: [3],
    explanation: `A relative import resolves against the importing file, but a path that starts with <code>~</code> points to the home directory of whoever runs the session. On Priya's laptop <code>~/.claude/team-python.md</code> exists because she wrote it for herself; on Dmitri's freshly imaged laptop it does not, so only <code>docs/testing.md</code> loads and Claude falls back to generic Python habits. Running <code>/memory</code> in his session shows which memory files are loaded (in current releases <code>/context</code> also shows what is loaded). The lasting fix is to move the standards into version control, such as <code>docs/standards/python.md</code>, and import that file, so every current and future engineer gets the same instructions. Copying the file fixes one laptop, leaves the three new hires with the same gap and drifts whenever Priya edits hers. An IMPORTANT line asks Claude to follow standards that are not in its context, and a skill makes universal standards optional. The Windows laptop and the matching versions are noise.`,
    rationales: [
      `Copying fixes Dmitri's laptop only; the three engineers joining next month hit the same gap, and every personal copy drifts whenever Priya updates the original.`,
      `Emphasis cannot help when the standards never reach Dmitri's context; the only import that resolves for him is <code>docs/testing.md</code>, which says nothing about uv, ruff or fixtures.`,
      `Standards that apply to every session belong in always-loaded memory; a skill Dmitri must remember to invoke makes them optional, and any session where he forgets still gets generic habits.`,
      `Correct. <code>/memory</code> shows that <code>team-python.md</code> is missing from Dmitri's loaded files, and a repository file imported by path reaches every current and future engineer through version control.`
    ],
    trap: `Per-user copies, emphasis or skills for standards that live in one user's home directory`,
    signals: `Decisive: the only import that carries the standards starts with ~, so it resolves to each user's home directory, and Priya wrote that file for herself when she worked alone. Noise: Dmitri's Windows laptop and IT image, which tempt a platform explanation, and the matching Claude Code versions.`
  },
  {
    id: 'e6-S2-06', scenario: 'S2', domain: 'D3', obj: 'X12', type: 'single', select: 1,
    stem: `<p>Starling Tutors runs its tutoring marketplace on a TypeScript API backed by Postgres, and 34 developers use Claude Code on it. To standardize schema changes, the platform team wrote a project skill that creates timestamped up and down SQL files in <code>db/migrations/</code>, updates <code>db/schema.sql</code> and, when asked, adds seed data. Its frontmatter and first body lines:</p>
<pre>---
name: gen-migration
description: Database helper
---
Create a Postgres migration for the table $ARGUMENTS.
Read db/schema.sql and the newest file in db/migrations/ first.
Name the file YYYYMMDDHHMM_&lt;verb&gt;_$ARGUMENTS.sql and ...</pre>
<p>Three complaints have piled up. When developers discuss slow queries or connection pooling, Claude often loads the skill and starts drafting a migration nobody asked for. When a developer writes "add a migration that creates the lesson_notes table", Claude never uses the skill and writes a file by hand with no down section. Developers who type <code>/gen-migration</code> with nothing after it get a migration for a table name Claude guessed from the conversation. When a table name is supplied, the 180-line body produces correct files every time. The repository also has a <code>/review</code> command in <code>.claude/commands/</code> that works as expected.</p>
<p>Which change best addresses all three complaints?</p>`,
    options: [
      `Rewrite <code>description</code> to say that the skill generates Postgres migration files and when to use it, and add <code>argument-hint: "&lt;table_name&gt; [--with-seed]"</code>.`,
      `Add <code>context: fork</code> to the frontmatter, so the skill runs in an isolated subagent context and stops pulling the team's unrelated database discussions into its migration workflow.`,
      `Add <code>allowed-tools: Write</code> to the frontmatter, so the skill can only create migration files and can no longer query the Postgres database or read unrelated code during a discussion.`,
      `Move the skill into each developer's <code>~/.claude/skills/</code> directory, so every developer controls when it triggers and can tune the description to the way they usually ask for new migrations.`
    ],
    answer: [0],
    explanation: `Claude decides whether to load a skill from its <code>description</code>, so "Database helper" matches any database conversation while never mentioning migrations. That one line explains the first two complaints: the skill fires during pooling discussions and is skipped when a developer literally asks for a migration. A description that says what the skill does (up and down SQL for a named table) and when to use it fixes both. The third complaint is a missing parameter: <code>argument-hint</code> prompts developers for the table name when they invoke <code>/gen-migration</code> without one, instead of leaving Claude to guess. <code>context: fork</code> changes where the skill runs once it is chosen, not whether it is chosen, and restricting its tools neither changes when it triggers nor supplies a table name. Personal copies would split one team workflow into 34 drifting variants that still need the same fixes. The working 180-line body and the <code>/review</code> command are noise.`,
    rationales: [
      `Correct. A specific description stops the skill from firing during pooling discussions and lets Claude match plain requests for a migration, and <code>argument-hint</code> prompts for the missing table name.`,
      `Forking isolates the skill's context after it has been chosen, but all three complaints are about when it is chosen and the missing table name, which depend on the description and arguments.`,
      `Limiting the skill's tools changes nothing about when Claude selects it, and a developer who types <code>/gen-migration</code> with no table name would still get a guessed one.`,
      `Personal copies are not shared through the repository, so the standardized workflow splits into 34 variants that drift, and each copy still starts with the vague description and no hint.`
    ],
    trap: `Changing execution context, tools or scope when the description and argument hint are the problem`,
    signals: `Decisive: the description is only "Database helper", which matches every database conversation but never mentions migrations, and nothing in the frontmatter asks for the table name that $ARGUMENTS expects. Noise: the 180-line body, which works once a table is given, and the unrelated <code>/review</code> command.`
  },
  {
    id: 'e6-S2-07', scenario: 'S2', domain: 'D3', obj: 'O14', type: 'single', select: 1,
    stem: `<p>Copperline Media builds the web and TV apps for its streaming service in a TypeScript monorepo with 30 workspace packages. Developers share a project skill, <code>/dep-audit</code>, that checks dependency health before anyone adds or upgrades a package. It runs <code>npm ls --all --json</code>, reads all 30 <code>package.json</code> files, checks licenses against the allowlist the security team introduced in May, and ends with a one-page summary of duplicates, license flags and upgrade risks. A typical run produces about 15k tokens of tool output before that summary, and <code>npm ls</code> alone takes about 50 seconds.</p>
<p>Developers usually run the audit in the middle of other work. Last week an engineer spent an hour with Claude planning a refactor of the player's buffering logic, ran <code>/dep-audit</code> to check whether a new HLS library was safe to add, and then asked Claude to continue. Claude no longer remembered which buffering files had been agreed on or the order of the steps, and it proposed an approach the engineer had already rejected. Several developers describe the same pattern after audits.</p>
<p>The audit must keep running <code>npm ls</code> through Bash, and its summary must reach the developer's main session so the next step can use it.</p>
<p>Which change best fixes the problem?</p>`,
    options: [
      `Add <code>allowed-tools: Read</code> to the skill's frontmatter, so the audit is limited to reading the <code>package.json</code> files and produces far less output in the developer's main conversation.`,
      `Ask developers to run <code>/compact</code> right after each audit, so the 15k tokens of tool output are condensed into a short summary before they return to the task they were working on.`,
      `Add <code>context: fork</code> to the skill's frontmatter, so the audit runs in an isolated subagent context and only its one-page summary returns to the developer's main conversation.`,
      `Add an instruction to <code>SKILL.md</code> telling Claude to keep its intermediate output to a minimum and to report only the final one-page summary back to the developer's session.`
    ],
    answer: [2],
    explanation: `A skill normally runs inside the conversation that invokes it, so everything it does, including about 15k tokens of <code>npm ls</code> output and 30 file reads, lands in the developer's context and crowds out the refactor plan. <code>context: fork</code> runs the skill in an isolated subagent context: the audit still runs Bash, the verbose tool output stays in the fork, and only the one-page summary comes back, which meets both constraints. Changing the skill's tools does not change where its output lands, and a Read-only audit could not run the required <code>npm ls</code> step. <code>/compact</code> is manual and lossy: it runs after the damage and summarizes the whole conversation, including the refactor details that are going missing. An instruction to keep output minimal targets Claude's narration, but the bulk is tool results the audit must produce to do its job. The May allowlist and the 50-second <code>npm ls</code> run are noise.`,
    rationales: [
      `Changing the skill's tools does not change where its output lands: the 30 <code>package.json</code> reads would still fill the main conversation, and a Read-only audit could not run <code>npm ls</code>.`,
      `Compaction runs after the damage, depends on every developer remembering it, and summarizes the whole conversation, which can drop the very refactor details the engineer needed.`,
      `Correct. A forked context keeps the 15k tokens of tool output out of the main session while the audit still runs Bash, and only the one-page summary returns to the developer.`,
      `The 15k tokens are tool results from <code>npm ls</code> and file reads, not Claude's commentary, so asking for less narration leaves nearly all of that output in the main context.`
    ],
    trap: `Tool limits, manual compaction or prompt wording instead of a forked skill context`,
    signals: `Decisive: the audit adds about 15k tokens of tool output to the conversation it runs in, Claude loses the earlier plan right after it, and the constraints require Bash and a summary that returns. Noise: the May license allowlist and the 50-second <code>npm ls</code> run, which affect neither where output lands nor what Claude remembers.`
  },
  {
    id: 'e6-S2-08', scenario: 'S2', domain: 'D3', obj: 'O12', type: 'single', select: 1,
    stem: `<p>Harborview Provisions, a US food importer, receives a nightly CSV feed of shipments from its Italian olive-oil supplier and converts it to JSON for its inventory system. A developer is using Claude Code to write the converter, a 300-line Python module. The feed is semicolon-delimited, dates such as <code>03/04/2025</code> are day-first, amounts such as <code>1.234,50</code> use a dot for thousands and a comma for decimals, and empty cells must become <code>null</code> rather than an empty string or zero.</p>
<p>Three attempts from a prose description of these rules each produced different mistakes. The developer then switched to fixing one issue per message, but every fix broke a case that had worked before: all three behaviors are decided in one function, <code>parseCell</code>, and each change reordered its type checks. Output from the latest version:</p>
<pre>in : 1042;03/04/2025;1.234,50;;EV-5L
out: {"order_id": 1042, "ship_date": "2025-04-03", "amount": 1234.5, "lot": 0, "sku": "EV-5L"}
in : 1043;15/04/2025;980,00;L-778;EV-1L
out: {"order_id": 1043, "ship_date": "2025-04-15", "amount": 98000, "lot": "L-778", "sku": "EV-1L"}</pre>
<p>The supplier plans to add a currency column next year, the file arrives over SFTP at 2 a.m., and the inventory team needs the converter by Friday.</p>
<p>Which next step is most likely to get to a correct converter quickly?</p>`,
    options: [
      `Keep fixing one issue per message in <code>parseCell</code>, starting with the amounts, and re-run the sample file after each change to check the JSON, so that every fix stays small and easy to review.`,
      `Send one message with three input rows and the exact JSON each should produce, covering dates, amounts and empty cells, and ask Claude to add them as tests before changing the code.`,
      `Rewrite the prose description with MUST and NEVER for each rule (day-first dates, comma decimals, null for empty cells) and send it again, so Claude cannot misread any of the requirements.`,
      `Ask Claude to interview the developer about the feed before writing more code, so it can surface requirements and edge cases the developer may not have considered for the supplier's format.`
    ],
    answer: [1],
    explanation: `When prose descriptions are interpreted inconsistently, concrete input and output examples are the most effective way to specify a transformation, and when fixes interact they belong in one detailed message rather than a sequence. All three rules here are decided in <code>parseCell</code>, so fixing them one at a time let each change undo another, as the latest output shows: row 1042 gets 0 for an empty lot, and row 1043 turns <code>980,00</code> into 98000. Two or three rows with the exact expected JSON, covering day-first dates, comma decimals and empty cells, remove the ambiguity. Having Claude write them as tests first turns the examples into a check it can run after every change, which is test-driven iteration. MUST and NEVER wording is still prose, which has already failed three times. The interview pattern surfaces unknown requirements, but these are known; the problem is communicating them. The currency column and the SFTP schedule are noise.`,
    rationales: [
      `The fixes interact inside <code>parseCell</code>, so one issue per message repeats the pattern already observed: each change reorders the type checks and undoes an earlier fix.`,
      `Correct. Concrete rows with exact expected JSON remove the ambiguity that prose left, one message covers the interacting rules together, and tests catch any regression in <code>parseCell</code>.`,
      `Stronger wording is still a prose description, the format that already produced three different sets of mistakes, and it gives Claude no concrete expected values to check against.`,
      `Interviewing helps when requirements are unclear, but the developer already knows all three rules; the failure lies in how they are communicated and in fixes that interact.`
    ],
    trap: `Sequential fixes or stronger prose when interacting rules need concrete examples in one message`,
    signals: `Decisive: three prose attempts produced different mistakes, and all three rules are decided in <code>parseCell</code>, where each one-issue fix undid another. Noise: the planned currency column and the 2 a.m. SFTP delivery; the Friday deadline tempts quick one-off fixes but favors the approach that converges.`
  }
]);
