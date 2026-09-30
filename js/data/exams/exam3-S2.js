/* Practice Exam 3 — Scenario S2: Code Generation with Claude Code
   Context: the "ledgerly" Python/Django monolith being split into services (services/*),
   a terraform/ infrastructure folder, and a React admin frontend (admin-ui/). */
CCAR.addQuestions('exam3', [
  {
    id: 'e3-S2-01',
    scenario: 'S2',
    domain: 'D1',
    obj: 'O08',
    type: 'single',
    select: 1,
    stem: 'Your team is splitting the <code>ledgerly</code> Django monolith. The next target is the <code>billing</code> app: 71 modules in <code>shipments</code>, <code>accounts</code> and <code>reports</code> import <code>billing.models</code> directly, two <code>post_save</code> signal handlers write invoices, and the architecture group has not chosen between synchronous REST calls and an SQS event stream (the SQS option needs new queues and IAM policies in <code>terraform/</code>). The platform lead must sign off on the approach before any code changes land. How should you run this work in Claude Code?',
    options: [
      'Start in direct execution with acceptEdits, extract billing into services/billing behind a REST client, and rely on the Django test suite to reveal any callers that break along the way.',
      'Use plan mode to map every billing import and signal, compare the REST and SQS options with their terraform impact, and get the plan approved before executing it in phases.',
      'Run an Explore subagent to list the billing importers, then switch straight to direct execution and implement the SQS option, since events decouple the services most cleanly.',
      'Generate the SQS queues in terraform/ first in direct execution so infrastructure is ready, then decide the application-side approach once the queues exist in staging.'
    ],
    answer: [1],
    explanation: 'Plan mode is designed for changes with architectural decisions, multiple valid approaches and wide multi-file impact, and this task also has an explicit human-approval gate. Exploring read-only and producing a plan the lead can approve prevents costly rework; the approved plan is then executed directly, in phases.',
    rationales: [
      'Tests reveal broken callers after the fact but do not resolve the open REST-vs-SQS decision or respect the sign-off requirement.',
      'Correct. Plan-then-execute fits a 71-module, multi-approach change that needs human approval before implementation.',
      'Exploration is useful, but picking SQS unilaterally skips the design comparison and the required sign-off.',
      'Building infrastructure before the approach is chosen commits to one option and may be wasted work.'
    ],
    trap: 'Direct execution for an architectural change with an approval gate'
  },
  {
    id: 'e3-S2-02',
    scenario: 'S2',
    domain: 'D1',
    obj: 'O08',
    type: 'single',
    select: 1,
    stem: 'A ticket asks Claude to move <code>aws_db_instance.main</code> in <code>terraform/envs/prod/main.tf</code> into a new <code>module.billing_db</code>. A trial <code>terraform plan</code> shows <code>module.billing_db.aws_db_instance.this will be created</code> and <code>aws_db_instance.main will be destroyed</code>. Change policy requires a human to approve every prod plan, and applies run only from the deploy pipeline. Which workflow is most appropriate?',
    options: [
      'Direct execution with acceptEdits: let Claude refactor into the module, add a moved block, run terraform plan, and run terraform apply itself once its own review shows no replacement.',
      'Direct execution, because it is a mechanical rename; Claude edits main.tf and the module, and the deploy pipeline will catch any destructive change when it runs the apply step.',
      'Plan mode to analyze state addresses and draft moved blocks, then the edits plus a read-only terraform plan whose output a human approves before the pipeline applies it.',
      'Plan mode for analysis, then let Claude run terraform state mv against prod directly so the next plan comes back clean, since state surgery avoids replacing the database.'
    ],
    answer: [2],
    explanation: 'The edit is small, but the risk is high (destroying the prod database) and policy requires human approval of the plan. A multi-phase flow fits: investigate and design in plan mode, implement with moved blocks, produce a read-only plan artifact, and gate the apply on human approval in the pipeline. Letting the agent approve or mutate prod state itself removes the required checkpoint.',
    rationales: [
      'The agent approving and applying its own change bypasses the mandatory human approval of prod plans.',
      'A rename that destroys a prod database is not low risk; relying on the pipeline to catch it after the fact is backwards.',
      'Correct. Plan, implement, then a read-only plan artifact gated by human approval matches the scope, risk and approval needs.',
      'Running state mv against prod is a direct production mutation that skips both approval and the pipeline.'
    ],
    trap: 'Small diff treated as low risk; agent self-approves a prod change'
  },
  {
    id: 'e3-S2-03',
    scenario: 'S2',
    domain: 'D1',
    obj: 'O08',
    type: 'single',
    select: 1,
    stem: 'In direct execution you asked Claude to rename the <code>customer_ref</code> field to <code>account_ref</code> in <code>monolith/shipments/serializers.py</code>. After two edits it reports: "customer_ref also appears in admin-ui/src/api/shipments.ts, in the OpenAPI contract consumed by services/tracking and services/notifications, and in a terraform-managed API Gateway request mapping." Nothing has been committed yet. What is the best next step?',
    options: [
      'Stop editing, switch to plan mode, map every consumer and contract, and agree on a migration approach (for example dual fields with a deprecation window) before continuing.',
      'Continue in direct execution and let Claude update each consumer it listed, then run the backend, frontend and contract test suites to confirm nothing else still uses the old name.',
      'Have Claude add a serializer alias so both names are accepted, finish the rename inside the monolith only, and open follow-up tickets for the frontend, services and gateway later.',
      'Start a new session on a larger-context model so Claude can hold the monolith, services, frontend and terraform in view at once and finish the rename in one single pass.'
    ],
    answer: [0],
    explanation: 'The task began as a well-scoped direct edit, but discovery revealed a cross-service contract change with several valid approaches (hard rename vs dual fields with deprecation) and multiple owning teams. That is the signal to switch to plan mode: explore read-only, design the migration, and get agreement before making more edits.',
    rationales: [
      'Correct. Scope expanded into an API contract change across teams, so investigation and an agreed plan should precede further edits.',
      'Tests only cover known consumers; a breaking contract change across services needs a design decision, not a faster rollout.',
      'An alias is one possible approach, but choosing it unilaterally without mapping all consumers skips the design step.',
      'A bigger context window does not answer the design question or the coordination needed across teams.'
    ],
    trap: 'Staying in direct execution after scope expands mid-task'
  },
  {
    id: 'e3-S2-04',
    scenario: 'S2',
    domain: 'D3',
    obj: 'O16',
    type: 'single',
    select: 1,
    stem: 'Monolith policy: migrations already merged to <code>main</code> must never be edited; schema changes need a new migration file. Claude still edits old migrations about once a week despite a CLAUDE.md rule. The committed <code>.claude/settings.json</code> contains:<pre>{\n  "permissions": {\n    "allow": ["Edit(monolith/**)", "Bash(python manage.py *)"]\n  }\n}</pre>Claude must still be able to write new hand-written data migrations. What is the best change?',
    options: [
      'Add "Edit(**/migrations/*.py)" to permissions.deny in .claude/settings.json so that no migration file can be modified by Claude in any team member\'s session.',
      'Create .claude/rules/migrations.md with paths: ["**/migrations/*.py"] restating the policy, so it loads exactly when Claude opens a migration file.',
      'Move the policy into a project skill named safe-migrations, and add a CLAUDE.md line telling Claude to invoke that skill before touching any migrations folder.',
      'Add a PreToolUse hook on Edit|Write that exits 2 when the target migration already exists on origin/main, telling Claude to create a new migration instead.'
    ],
    answer: [3],
    explanation: 'The requirement is deterministic and conditional: block edits to merged migrations while still allowing new ones. A PreToolUse hook can evaluate that condition (is this path tracked on origin/main?) and exit 2 to block with feedback Claude can act on. CLAUDE.md, rules and skills are context and can be ignored; a path deny rule is deterministic but too broad.',
    rationales: [
      'Deterministic, but Edit rules cover file-writing tools generally, so this also blocks the new hand-written migrations the team needs.',
      'A path-scoped rule is still guidance loaded into context; the same instruction in CLAUDE.md is already being ignored.',
      'A skill is on-demand guidance and cannot block a tool call; invocation itself depends on the model.',
      'Correct. A conditional PreToolUse hook enforces the policy exactly and leaves new migrations allowed.'
    ],
    trap: 'Context mechanism (or an over-broad deny) for a conditional guarantee'
  },
  {
    id: 'e3-S2-05',
    scenario: 'S2',
    domain: 'D3',
    obj: 'O16',
    type: 'multi',
    select: 2,
    stem: 'You are reorganizing how the monolith-split team configures Claude Code in the shared repository. Which TWO requirement-to-mechanism pairings are correct? (Select 2)',
    options: [
      'Keep terraform/**/*.tfstate and terraform/*.tfvars (which contain DB passwords) away from Claude: add Read deny rules to each developer\'s ~/.claude/settings.json.',
      'A 9-step "extract a Django app into a service" checklist used a few times per quarter: a project skill at .claude/skills/extract-service/SKILL.md.',
      'Run npm run lint in admin-ui after every frontend edit: add "always run npm run lint after editing .tsx files" to the root CLAUDE.md for everyone.',
      'Django model conventions for models.py in both monolith/ and services/*/: .claude/rules/django-models.md with paths: ["**/models.py", "**/models/*.py"].',
      'One developer wants Claude to explain every diff in detail: add that preference to the root CLAUDE.md so it follows the developer across branches.'
    ],
    answer: [1, 3],
    explanation: 'Match mechanism to need: skills for occasional on-demand workflows, path-scoped rules for conventions tied to file types across directories, committed permission deny rules for hard access restrictions, hooks for actions that must run every time, and personal files (CLAUDE.local.md, user config) for individual preferences.',
    rationales: [
      'Secret protection is a team-wide requirement; user-level settings are not shared, so it belongs in committed .claude/settings.json deny rules.',
      'Correct. An occasional multi-step workflow is a good fit for an on-demand project skill shared through version control.',
      'An action that must happen after every edit needs a PostToolUse hook; a CLAUDE.md reminder is probabilistic.',
      'Correct. A glob-scoped rule follows models.py files across the monolith and every new service.',
      'The root CLAUDE.md is shared with the whole team; a personal preference belongs in CLAUDE.local.md or ~/.claude/CLAUDE.md.'
    ],
    trap: 'User-level config for team needs; prompts for deterministic actions'
  },
  {
    id: 'e3-S2-06',
    scenario: 'S2',
    domain: 'D2',
    obj: 'O17',
    type: 'single',
    select: 1,
    stem: 'Before extracting <code>billing</code>, you need every code path in the 1.1M-line monolith that writes to the <code>billing_invoice</code> table: ORM calls, <code>bulk_create</code>, raw SQL in <code>reports/</code>, and signal receivers. A first attempt that asked Claude to "read the monolith and list invoice writers" hit auto-compaction after 140 files, and the final list had lost entries found early on. Which exploration strategy is best?',
    options: [
      'Glob for **/billing/**/*.py, read every matching file in full, and list the write operations found there, since writes to a table normally live inside the owning app.',
      'Ask Claude to infer the writers from billing/models.py and its Meta options alone, then confirm the list by reading only the files that the model itself names.',
      'Grep for Invoice.objects, invoice_set, bulk_create and the literal billing_invoice, then Read only the hit locations and follow imports and receivers from there.',
      'Switch to a 1M-token context model to raise the budget, then repeat the original request so Claude can read all monolith files without triggering auto-compaction.'
    ],
    answer: [2],
    explanation: 'Incremental exploration starts with Grep to find entry points by content (ORM managers, related-name accessors, raw table names) and then uses Read to follow the specific imports and signal registrations. This keeps context focused while staying complete. Reading everything up front exhausts context, and a bigger window only postpones attention dilution.',
    rationales: [
      'Writers outside the owning app (reports/ raw SQL, signal receivers in other apps) are exactly what this misses.',
      'The model file does not reveal who writes to the table; guessing callers is not exploration.',
      'Correct. Content search finds all entry points cheaply; targeted reads build understanding incrementally.',
      'A larger window does not fix reading 1.1M lines up front; findings still dilute and cost grows.'
    ],
    trap: 'Read everything / bigger context window'
  },
  {
    id: 'e3-S2-07',
    scenario: 'S2',
    domain: 'D2',
    obj: 'O17',
    type: 'single',
    select: 1,
    stem: 'Grep for <code>create_invoice(</code> finds 3 callers, but production traces show about 40 distinct call sites. Claude then reads <code>monolith/common/billing_api.py</code>:<pre>from billing.services import (\n    create_invoice as make_invoice,\n    void_invoice as cancel_invoice,\n)\nfrom billing import services as billing_services\n__all__ = ["make_invoice", "cancel_invoice", "billing_services"]</pre>What should the next exploration step be?',
    options: [
      'Grep for each exported name (make_invoice, cancel_invoice, billing_services.) across the monolith, then Read the callers found to map the real call sites.',
      'Grep the monolith for the broad pattern "invoice" to catch every variant at once, and have Claude read each matching file to decide which are true call sites.',
      'Read every module that imports anything from monolith/common, because wrapper modules usually hide more indirection than a name search is able to reveal.',
      'Conclude that the traces are counting retries, since Grep is authoritative for call sites, and record the 3 callers as the complete list for the extraction plan.'
    ],
    answer: [0],
    explanation: 'When a wrapper module re-exports functions under aliases, first identify every exported name, then search for each name across the codebase and read the hits. This traces usage through the indirection without reading unrelated files. A broad pattern floods context with noise, and dismissing the trace evidence ignores a clear signal.',
    rationales: [
      'Correct. Enumerate the wrapper\'s exported names, then Grep for each to find the real call sites.',
      'Matching "invoice" returns thousands of irrelevant lines and pushes the work back into bulk reading.',
      'Reading every importer of a shared package is unfocused and consumes context on unrelated code.',
      'The wrapper clearly explains the gap; ignoring it would produce an incomplete extraction plan.'
    ],
    trap: 'Stopping at direct-name Grep; ignoring aliased re-exports'
  },
  {
    id: 'e3-S2-08',
    scenario: 'S2',
    domain: 'D3',
    obj: 'X07',
    type: 'single',
    select: 1,
    stem: 'Django developers who never touch the frontend report that <code>/memory</code> lists <code>.claude/rules/react-admin.md</code> in every session, and its 180 lines of React conventions add noise. The root CLAUDE.md contains no @imports. The rule file begins:<pre>---\nglobs: ["admin-ui/**/*.tsx"]\nalwaysApply: false\n---\n# React admin conventions</pre>What is the root cause?',
    options: [
      'Files in .claude/rules/ always load at launch regardless of frontmatter; path scoping is only available through a CLAUDE.md placed inside admin-ui/.',
      'Claude Code scopes rules only with a paths field; globs and alwaysApply are not recognized, so the file is unconditional and loads at launch.',
      'The glob is resolved relative to each developer\'s home directory, so it matches nothing and Claude Code falls back to loading the rule in every session.',
      'The /memory command loads every rule file in the directory in order to list it, so running the listing is what added the React rules to those sessions.'
    ],
    answer: [1],
    explanation: 'In Claude Code, paths is the frontmatter field that scopes a .claude/rules/ file to matching files; a rule without paths is loaded at launch like CLAUDE.md. The globs/alwaysApply fields come from another tool\'s format and are ignored here. Replacing them with paths: ["admin-ui/**/*.tsx"] makes the rule load only when Claude works with matching files.',
    rationales: [
      'Rules support conditional loading via paths frontmatter; a subdirectory CLAUDE.md is not the only option.',
      'Correct. Unrecognized frontmatter leaves the rule without a paths scope, so it is always loaded.',
      'Path globs are evaluated against the project, not the home directory, and a non-match would not cause loading.',
      '/memory shows which memory files are loaded; it does not itself inject rules into the session.'
    ],
    trap: 'Wrong frontmatter field for path-scoped rules'
  },
  {
    id: 'e3-S2-09',
    scenario: 'S2',
    domain: 'D3',
    obj: 'X12',
    type: 'single',
    select: 1,
    stem: 'The team maintains a project skill at <code>.claude/skills/extract-service/SKILL.md</code>. To try extra steps, a developer copied it to <code>~/.claude/skills/extract-service/SKILL.md</code> and edited it. Two weeks later the team added a mandatory "update the terraform/ IAM module" step to the project skill, but his <code>/extract-service</code> runs keep skipping it. What should he do?',
    options: [
      'Add the new IAM step to his personal copy as well, and set a reminder to diff his copy against the project skill every time the team changes it.',
      'Move his variant into .claude/commands/extract-service.md in the repo, since commands take precedence over skills that share the same name.',
      'Add disable-model-invocation: true to his copy so that Claude falls back to the project skill whenever the extraction workflow is triggered.',
      'Rename his copy to a distinct name such as extract-service-exp, so /extract-service resolves to the team\'s project skill again.'
    ],
    answer: [3],
    explanation: 'A personal skill with the same name as a project skill takes precedence, so his copy silently shadows the team version and misses its updates. Personal variants should use a different name so the shared skill keeps working as the team expects while he experiments separately.',
    rationales: [
      'Manual syncing keeps the shadowing in place and will drift again the next time the team edits the skill.',
      'A skill wins over a command with the same name, and a repo command would affect every teammate.',
      'That flag only stops automatic invocation of his copy; it does not make the name resolve to the project skill.',
      'Correct. A distinct personal name removes the shadowing and keeps the team skill authoritative.'
    ],
    trap: 'Same-name personal variant shadowing a project skill'
  },
  {
    id: 'e3-S2-10',
    scenario: 'S2',
    domain: 'D3',
    obj: 'O14',
    type: 'single',
    select: 1,
    stem: 'The project skill <code>/dep-graph</code> maps a Django app\'s import and FK dependencies before extraction. Its output averages 3,500 lines, and after running it the main session keeps losing earlier design decisions to compaction. Current frontmatter:<pre>---\nname: dep-graph\ndescription: Map import and FK dependencies for a Django app\nargument-hint: &lt;app-label&gt;\nallowed-tools: Read, Grep, Glob, Bash(python manage.py graph_models *)\n---</pre>Which change best addresses the problem?',
    options: [
      'Add disable-model-invocation: true so the skill only runs when a developer types /dep-graph explicitly, which keeps its output out of routine sessions.',
      'Narrow allowed-tools to Grep and Glob only so the skill produces fewer tool results, which shrinks the transcript it adds to the main conversation.',
      'Add context: fork so the skill runs in an isolated subagent context and only its summary returns, keeping the verbose output out of the main session.',
      'Keep the frontmatter and have developers run /compact right after each /dep-graph run so the verbose output is summarized before design work resumes.'
    ],
    answer: [2],
    explanation: 'context: fork runs a skill in an isolated subagent context, so its verbose intermediate output stays there and only the result returns to the main conversation. That protects the design decisions already in the main session. Invocation control, tool narrowing and manual compaction do not isolate the output.',
    rationales: [
      'Developers already invoke it explicitly during extraction; the output still lands in the main context.',
      'Fewer tools may weaken the analysis and do not isolate whatever output remains.',
      'Correct. Forked execution isolates verbose skill output from the main conversation.',
      'Compaction after the fact is lossy and is exactly what is dropping earlier decisions.'
    ],
    trap: 'Invocation or tool settings instead of context isolation'
  },
  {
    id: 'e3-S2-11',
    scenario: 'S2',
    domain: 'D1',
    obj: 'O02',
    type: 'single',
    select: 1,
    stem: 'Yesterday, in a named session <code>billing-extraction</code>, Claude analyzed 34 files and agreed a step plan with you. Overnight a teammate merged an MR touching 4 of those files: <code>billing/services.py</code>, <code>billing/signals.py</code>, <code>terraform/modules/billing_db/main.tf</code> and <code>admin-ui/src/api/invoices.ts</code>. The other 30 files are unchanged. What is the most efficient reliable way to continue?',
    options: [
      'Run claude --resume billing-extraction, tell it which 4 files changed and what the MR did, and ask it to re-analyze only those before the next step.',
      'Run claude --resume billing-extraction and continue with the next plan step, since Claude will notice changed file contents the next time it edits them.',
      'Start a fresh session and have Claude re-explore all 34 files from scratch, because any resumed session holds tool results that can no longer be trusted.',
      'Run claude --continue in another terminal, then ask Claude to re-read the whole billing app and the terraform module so nothing stale survives in the plan.'
    ],
    answer: [0],
    explanation: 'When most prior context is still valid, resume the named session and explicitly inform it about the specific files that changed so it re-analyzes only those. Resuming silently leaves stale tool results in play, while full re-exploration wastes the valid analysis of 30 files. Starting fresh with a summary is the better choice only when most prior results are stale.',
    rationales: [
      'Correct. Named resumption plus targeted re-analysis of the changed files preserves valid work and removes stale assumptions.',
      'The plan may already depend on stale reads of services.py and signals.py; Claude must be told what changed.',
      'Discarding the analysis of 30 unchanged files is unnecessary when only 4 changed.',
      '--continue picks the most recent session, not necessarily this one, and re-reading everything repeats prior work.'
    ],
    trap: 'Resuming without informing about changes, or full re-exploration'
  },
  {
    id: 'e3-S2-12',
    scenario: 'S2',
    domain: 'D5',
    obj: 'O20',
    type: 'multi',
    select: 2,
    stem: 'A three-day investigation maps the dependencies of 12 Django apps before extraction. On day 1 the main session filled with Grep output and file reads; after two auto-compactions Claude no longer knew which FK cycles it had already confirmed and re-verified several. Which TWO changes best keep the exploration reliable within context limits? (Select 2)',
    options: [
      'Delegate per-app discovery to the Explore subagent so verbose search and read output stays in its context and only a concise summary returns to the main session.',
      'Disable auto-compaction so the main session never loses detail, and open a new session only when Claude reports that the context window is completely full.',
      'Switch the session to a model with a larger context window and ask Claude to read all 12 apps in full at the start, so every dependency is visible at once.',
      'Paste each day\'s Grep output into the root CLAUDE.md so confirmed findings are reloaded into every session, including the sessions of other teammates.',
      'Have Claude maintain a scratchpad file (docs/extraction/deps.md) of confirmed FK cycles and open questions, and re-read it after compaction or on resume.'
    ],
    answer: [0, 4],
    explanation: 'Long explorations stay reliable when verbose discovery is isolated in subagents that return summaries, and when key findings are persisted outside the conversation in a scratchpad file that survives compaction and session boundaries. Bigger windows, disabling compaction, or stuffing raw output into always-loaded memory all increase context pressure instead of managing it.',
    rationales: [
      'Correct. The Explore subagent isolates verbose discovery and returns only what the main session needs.',
      'Without compaction the session simply runs out of context; this does not preserve findings.',
      'Reading everything up front dilutes attention and still overflows over a three-day investigation.',
      'Raw Grep output bloats CLAUDE.md for the whole team; findings belong in a focused working file.',
      'Correct. A persisted scratchpad keeps confirmed findings available after compaction and across sessions.'
    ],
    trap: 'Bigger window / disable compaction instead of isolation and scratchpads'
  },
  {
    id: 'e3-S2-13',
    scenario: 'S2',
    domain: 'D3',
    obj: 'O12',
    type: 'single',
    select: 1,
    stem: 'Claude is writing the data migration that moves monolith invoices into the new billing service, converting <code>amount</code> (Decimal, major units) into <code>amount_minor</code> (int). After three rounds of prose ("convert to minor units, respecting currency and rounding correctly"), each attempt treats JPY, negative credit notes and half-cent values differently. What is the most effective next step?',
    options: [
      'Rewrite the instruction as a longer, stricter paragraph in capitals that explains ISO 4217 exponents and banker\'s rounding, then ask Claude to regenerate the script.',
      'Fix one case per iteration, starting with JPY, then credit notes, then rounding, so each change can be reviewed on its own before the next prompt is sent.',
      'Switch to a larger model for this script only, since currency conversion needs stronger reasoning, and keep the same prose instruction for consistency.',
      'Give concrete input/output pairs such as (1500, JPY) → 1500, (-3.10, EUR) → -310 and (12.345, USD) → 1234, then have Claude encode them as tests.'
    ],
    answer: [3],
    explanation: 'When prose is interpreted inconsistently, 2-3 concrete input/output examples are the most effective way to pin down the transformation, and turning them into tests first gives a verifiable target for iteration. The three cases interact inside one conversion function, so they should be specified together rather than fixed one at a time.',
    rationales: [
      'More or louder prose is what has already failed three times; examples remove the ambiguity.',
      'Exponent handling, sign and rounding all live in the same conversion logic, so sequential fixes keep reopening each other.',
      'Model size is not the problem; the specification is ambiguous.',
      'Correct. Concrete examples encoded as tests communicate the exact expected behavior for each edge case.'
    ],
    trap: 'More prose or a bigger model instead of concrete examples'
  },
  {
    id: 'e3-S2-14',
    scenario: 'S2',
    domain: 'D1',
    obj: 'O09',
    type: 'single',
    select: 1,
    stem: 'A coordinator session in Claude Code migrates ORM call sites to service clients one Django app at a time, spawning a subagent per app. After 7 of 12 apps a laptop crash killed the session. On restart with <code>--continue</code>, the transcript had been compacted: Claude re-did 2 finished apps and no longer knew about three cross-app FK conflicts one subagent had reported. What design prevents this next time?',
    options: [
      'Name the session with -n so it can be resumed by name with --resume, which restores the full uncompacted transcript including every subagent result.',
      'After each app, have the coordinator write a manifest file with per-app status, commit SHA and open findings; on restart, load it and skip completed apps.',
      'On restart, have Claude read git log to infer which apps are finished, then re-spawn subagents for all of the remaining apps using the original migration prompt.',
      'Make every app migration idempotent and re-run all 12 apps after any interruption, so that no state ever has to be tracked between sessions at all.'
    ],
    answer: [1],
    explanation: 'Reliable resumption needs explicit, structured state persisted outside the conversation: which units are done (with a verifiable marker such as a commit SHA) and which findings are still open. On restart the coordinator loads that state, skips completed work and passes open findings to the remaining subagents, instead of depending on a transcript that may be compacted or lost.',
    rationales: [
      'Naming helps select the right session but does not undo compaction; findings still live only in conversation history.',
      'Correct. A manifest updated after each unit makes progress and findings durable and resumable.',
      'git log may show progress but loses the FK-conflict findings, which never lived in commits.',
      'Re-running everything wastes finished work and still loses findings that were never persisted.'
    ],
    trap: 'Relying on conversation history as pipeline state'
  },
  {
    id: 'e3-S2-15',
    scenario: 'S2',
    domain: 'D2',
    obj: 'O32',
    type: 'single',
    select: 1,
    stem: 'Claude must add <code>deletion_protection_enabled = true</code> to only the <code>billing_events</code> table in <code>terraform/modules/tables/main.tf</code>, which contains 9 near-identical generated <code>aws_dynamodb_table</code> blocks. Edit failed with "old_string matches 9 occurrences", and two retries with larger anchors still matched several blocks because the only distinguishing line is far from the insertion point. What should Claude do?',
    options: [
      'Retry Edit with replace_all enabled so every match is updated, then revert the other 8 tables by hand in a follow-up series of targeted Edit calls.',
      'Use Bash with sed -i on the line number reported by grep -n, since sed does not need unique anchor text to apply the change to the file.',
      'Read the whole file, apply the change to the billing_events block in the full content, Write the file back, and then review the resulting diff.',
      'Ask the developer to add a unique comment above the billing_events block first, so that later Edit calls can always find a single anchor.'
    ],
    answer: [2],
    explanation: 'Edit requires a unique match. When anchors cannot be made unique, the reliable fallback is Read to load the full content, make the targeted change with full knowledge of the structure, and Write the file back, then verify the diff. Line-number sed edits and replace-all-then-revert are fragile, and blocking on the developer is unnecessary.',
    rationales: [
      'Reverting 8 blocks faces the same uniqueness problem and risks leaving unintended changes.',
      'Line numbers from a separate grep are brittle and easy to get wrong in near-identical blocks.',
      'Correct. Read plus Write is the documented fallback when Edit cannot find unique anchor text.',
      'Claude can resolve this itself; editing the file for the tool\'s convenience is an unnecessary detour.'
    ],
    trap: 'Forcing Edit or sed when Read + Write is the fallback'
  }
]);
