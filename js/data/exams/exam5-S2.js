/* Practice Exam 5 — Scenario S2: Code Generation with Claude Code
   Context: a data-engineering repo (dbt/ models, airflow/ DAGs, terraform/ modules, libs/python). */
CCAR.addQuestions('exam5', [
  {
    id: 'e5-S2-01',
    scenario: 'S2',
    domain: 'D3',
    obj: 'O16',
    type: 'single',
    select: 1,
    stem: 'Your data-platform repo has Terraform conventions (pin provider versions, mandatory <code>tags</code> block, no inline IAM policies). The <code>.tf</code> files live in <code>terraform/modules/*</code> but also in <code>airflow/infra/</code> and <code>dbt/ci/</code>. The conventions currently sit in a 340-line root CLAUDE.md, and engineers editing dbt SQL complain about irrelevant context. A teammate moved them to <code>terraform/CLAUDE.md</code>, and Claude then ignored them when editing <code>airflow/infra/workers.tf</code>. What is the best configuration?',
    options: [
      'Keep terraform/CLAUDE.md and copy the same file into airflow/infra/ and dbt/ci/, adding a note in each copy to update the others whenever a convention changes.',
      'Create .claude/rules/terraform.md with frontmatter paths: ["**/*.tf", "**/*.tfvars"] and remove the conventions from the root CLAUDE.md.',
      'Create a project skill at .claude/skills/terraform/SKILL.md whose description says "Terraform conventions" so Claude loads the guidance whenever it thinks it is relevant.',
      'Move the conventions to docs/terraform-standards.md and reference it from the root CLAUDE.md with an @docs/terraform-standards.md import line to keep the root file short.'
    ],
    answer: [1],
    explanation: 'Path-scoped rules in .claude/rules/ load only when Claude works with files matching their globs, regardless of directory, which is exactly what conventions spread across the tree need. It also removes the noise from sessions that never touch Terraform. Directory CLAUDE.md files are tied to one subtree, and @imports still load at launch.',
    rationales: [
      'Duplicated directory files drift out of sync and still miss .tf files added in new directories.',
      'Correct. A glob-scoped rule follows the file type across directories and loads only when relevant.',
      'Skills are on-demand workflows; conventions that must apply every time a .tf file is edited should not depend on the model choosing to invoke a skill.',
      'Imports organize content but are expanded at launch, so the context noise in dbt sessions remains.'
    ],
    trap: 'Directory CLAUDE.md for cross-directory conventions'
  },
  {
    id: 'e5-S2-02',
    scenario: 'S2',
    domain: 'D3',
    obj: 'O16',
    type: 'single',
    select: 1,
    stem: 'The root CLAUDE.md says: "NEVER run <code>terraform apply</code> or <code>dbt run --target prod</code> locally; CI performs deploys." Yesterday a session ran <code>terraform apply -auto-approve</code> in <code>terraform/modules/warehouse</code> while "fixing drift." The committed <code>.claude/settings.json</code> is:<pre>{\n  "permissions": {\n    "allow": ["Bash(dbt *)", "Bash(terraform *)"]\n  }\n}</pre>The team needs a guarantee for every developer. What change should you make?',
    options: [
      'Move the rule to the top of CLAUDE.md in capital letters with a short explanation of the incident, so it is the first instruction Claude reads in every session.',
      'Ask each developer to add deny rules for terraform apply and prod dbt targets to their own ~/.claude/settings.json, since permissions are personal preferences.',
      'Create a project skill named deploy-safety that reminds Claude of the no-local-deploy rule, and reference it from CLAUDE.md so it is invoked before infrastructure work.',
      'In .claude/settings.json, add deny rules such as "Bash(terraform apply *)" and "Bash(dbt run * --target prod*)"; deny overrides the broad allows.'
    ],
    answer: [3],
    explanation: 'CLAUDE.md is context, not enforcement, so it can be ignored. Project-level permission deny rules are committed, apply to everyone, and take precedence over allow rules; a PreToolUse hook is the other deterministic option for more complex matching. Narrowing the overly broad allow rules is a sensible follow-up.',
    rationales: [
      'Louder instructions are still probabilistic; the rule was already present when it was violated.',
      'User-level settings are not shared, so coverage depends on every developer remembering to do it.',
      'A skill is on-demand guidance and cannot block a command.',
      'Correct. Committed deny rules deterministically block the commands for the whole team, overriding the broad allow patterns.'
    ],
    trap: 'CLAUDE.md or user-level config for a team-wide guarantee'
  },
  {
    id: 'e5-S2-03',
    scenario: 'S2',
    domain: 'D3',
    obj: 'O16',
    type: 'multi',
    select: 2,
    stem: 'You are cleaning up how the data-platform team configures Claude Code. Which TWO requirement-to-mechanism pairings are correct? (Select 2)',
    options: [
      'An 8-step backfill runbook used about twice a month: put it in the root CLAUDE.md so it is always available when someone needs it.',
      'Airflow DAG conventions (TaskFlow API, no top-level DB calls) for files under airflow/: .claude/rules/airflow.md with paths: ["airflow/**/*.py"].',
      'Prevent Claude from reading .env and dbt profiles.yml, which hold warehouse credentials: add a CLAUDE.md line telling Claude not to open them.',
      'Run sqlfluff fix automatically on every .sql file Claude edits: a PostToolUse hook in .claude/settings.json matching Edit|Write.',
      'One engineer\'s preference for verbose explanations: add it to the committed .claude/settings.json so it applies to the engineer\'s sessions.'
    ],
    answer: [1, 3],
    explanation: 'Match the mechanism to the need: path-scoped rules for conventions tied to file locations or types, hooks for actions that must happen every time, skills for occasional on-demand workflows, permission deny rules for hard access restrictions, and personal files (CLAUDE.local.md or user-level config) for individual preferences.',
    rationales: [
      'An occasional multi-step workflow belongs in a skill invoked on demand, not in always-loaded CLAUDE.md.',
      'Correct. A path-scoped rule loads Airflow conventions only when DAG files are in play.',
      'Credential protection needs enforcement, such as permissions.deny for Read(./.env), not a prompt instruction.',
      'Correct. A PostToolUse hook runs the formatter deterministically after every matching edit.',
      'Committed project settings affect everyone; a personal preference belongs in CLAUDE.local.md or user-level config.'
    ],
    trap: 'Mechanism mismatch: always-loaded vs on-demand vs enforced'
  },
  {
    id: 'e5-S2-04',
    scenario: 'S2',
    domain: 'D3',
    obj: 'O08',
    type: 'single',
    select: 1,
    stem: 'You must migrate 64 Airflow DAGs off deprecated <code>airflow.contrib</code> operators and <code>SubDagOperator</code> to Airflow 2.9. Eighteen fan-out DAGs could use either TaskGroups or dynamic task mapping, which behave differently under catchup, and a shared plugin in <code>airflow/plugins/meridian_ops.py</code> is imported by 40 DAGs. A teammate suggests starting immediately in direct execution and "letting Claude go file by file." What approach is best?',
    options: [
      'Use direct execution with acceptEdits enabled and run airflow dags test after each file, so any regression surfaces immediately and can be fixed on the spot.',
      'Use direct execution on the shared plugin first, since most DAGs depend on it, and then let Claude migrate the remaining DAGs one by one in the same session.',
      'Use plan mode to explore DAG and plugin usage, compare the fan-out options, and produce a reviewed plan, then execute the approved plan in batches.',
      'Have Claude migrate one representative DAG directly, then apply the resulting diff pattern to the other 63 DAGs with a sed script to save tokens and time.'
    ],
    answer: [2],
    explanation: 'Plan mode is designed for large multi-file changes with multiple valid approaches and architectural consequences. Exploring first and reviewing a plan prevents costly rework (for example, choosing the wrong fan-out pattern for 18 DAGs or breaking a plugin 40 DAGs import), and the approved plan is then executed directly.',
    rationales: [
      'Tests after each file catch local breakage but not a wrong design choice repeated across dozens of DAGs.',
      'Changing a heavily shared plugin first without analysis is the riskiest possible starting point.',
      'Correct. Plan-then-execute fits a 64-file migration with competing approaches and shared dependencies.',
      'Mechanical diff replay ignores that the DAGs differ, especially the 18 fan-out cases.'
    ],
    trap: 'Direct execution for an architectural multi-file change'
  },
  {
    id: 'e5-S2-05',
    scenario: 'S2',
    domain: 'D3',
    obj: 'O08',
    type: 'single',
    select: 1,
    stem: 'An Airflow task fails with <code>KeyError: \'ds_nodash\'</code> raised at <code>libs/python/meridian_utils/partitions.py:42</code>, after yesterday\'s commit renamed the template variable passed into <code>partition_path()</code>. Grep shows one caller, and <code>tests/test_partitions.py</code> already covers the function. A teammate insists every change to <code>libs/</code> must go through plan mode "for safety." Which workflow is most appropriate?',
    options: [
      'Direct execution: give Claude the stack trace and the commit, let it make the fix in partitions.py, and run the existing test to confirm.',
      'Plan mode: have Claude explore the libs/python package and produce a written plan for review, because any change to a shared library can have architectural implications.',
      'Spawn an Explore subagent to map every module in libs/python and all DAGs that import meridian_utils before any edit is made, then decide whether to proceed.',
      'Run a multi-phase workflow: plan mode for investigation, then a short design document for team review, and only after approval switch to direct execution for the fix.'
    ],
    answer: [0],
    explanation: 'Direct execution fits well-scoped changes with a clear cause: a stack trace pinpointing the line, a known triggering commit, a single caller, and an existing test. Plan mode and multi-phase workflows add value when scope, approach, or risk is uncertain; here they only add overhead.',
    rationales: [
      'Correct. The scope is already established, so fix directly and verify with the existing test.',
      'Blanket plan-mode rules waste effort on changes whose scope and fix are already clear.',
      'Mapping the whole package is disproportionate when grep already confirmed a single caller.',
      'A design review for a one-line regression fix is process for its own sake.'
    ],
    trap: 'Over-engineering a well-scoped fix'
  },
  {
    id: 'e5-S2-06',
    scenario: 'S2',
    domain: 'D3',
    obj: 'O13',
    type: 'single',
    select: 1,
    stem: 'The team\'s local review skill, <code>.claude/skills/review/SKILL.md</code>:<pre>---\nname: review\ndescription: Review staged dbt and Airflow changes against team standards\nallowed-tools: Read, Grep, Glob, Bash, Edit, Write\n---\nReview the diff from `git diff --cached`.\nApply the standards in docs/standards/review.md.\nReport findings.</pre>Developers report three problems: the skill sometimes "fixes" issues by editing files mid-review; findings come back in a different shape each time, so they are hard to paste into PRs; and after a review the main session is full of diff output. Which revision addresses all three?',
    options: [
      'Add "Do not modify any files" to the skill body and include one example finding, keeping the current allowed-tools list so the skill can still run any commands it needs.',
      'Move the skill to ~/.claude/skills/review/ so each developer can tune the tools and output format to match the way they personally prefer to review code.',
      'Add context: fork to the frontmatter, since a forked subagent works in an isolated context and therefore cannot change files in the developer\'s working tree.',
      'Restrict allowed-tools to Read, Grep, Glob, Bash(git diff *), add context: fork, and require a fixed finding structure with an example.'
    ],
    answer: [3],
    explanation: 'Each symptom maps to a mechanism: restricting allowed-tools removes the edit capability during review, context: fork keeps the verbose diff analysis out of the main conversation, and an explicit output structure with an example makes findings consistent. A prompt-only "do not edit" is probabilistic while Edit and Write remain available.',
    rationales: [
      'The instruction is probabilistic while Edit/Write stay allowed, and nothing addresses context pollution.',
      'Moving to user scope fragments a team standard and fixes none of the three problems.',
      'Forking isolates conversation context, not file-system access; the subagent could still edit files with Edit/Write available.',
      'Correct. Tool restriction, forked context, and a fixed output format address the three problems one-to-one.'
    ],
    trap: 'Assuming context: fork prevents file edits'
  },
  {
    id: 'e5-S2-07',
    scenario: 'S2',
    domain: 'D3',
    obj: 'O13',
    type: 'multi',
    select: 2,
    stem: 'Before opening a PR, engineers run a scripted local review whose output a script turns into a checklist:<pre>claude --bare -p "Review the changes on this branch against main" \\\n  --output-format json</pre>Two problems: the findings ignore the team standards in the project CLAUDE.md and <code>.claude/rules/</code>, and the checklist script fails on about 20% of runs because findings arrive as prose inside the result text. Which TWO changes fix these problems? (Select 2)',
    options: [
      'Switch to --output-format stream-json so that each finding arrives as a separate event that the script can parse individually.',
      'Add --json-schema with a findings schema (file, line, severity, rule_id, message) so the structured result is validated against it.',
      'Add --append-system-prompt "Output only valid JSON findings, no prose" so the result text contains nothing but machine-readable findings.',
      'Set the environment variable CLAUDE_HEADLESS=true so Claude Code switches to its built-in review preset that emits structured findings.',
      'Remove --bare so the project CLAUDE.md and .claude/rules/ are discovered and loaded for the review.'
    ],
    answer: [1, 4],
    explanation: '--bare skips auto-discovery of CLAUDE.md, rules, hooks, skills, and MCP, which is why team standards were missing. --output-format json only wraps the run in a JSON envelope; adding --json-schema makes Claude Code return validated structured output matching the findings schema, which a script can parse reliably.',
    rationales: [
      'stream-json streams events of the run; it does not structure the findings themselves.',
      'Correct. --json-schema enforces a machine-parseable findings structure.',
      'Prompt-only JSON instructions are the least reliable way to get structured output.',
      'CLAUDE_HEADLESS is not a real Claude Code setting.',
      'Correct. Removing --bare restores loading of the project standards.'
    ],
    trap: 'JSON envelope mistaken for structured findings; --bare skipping standards'
  },
  {
    id: 'e5-S2-08',
    scenario: 'S2',
    domain: 'D3',
    obj: 'X07',
    type: 'single',
    select: 1,
    stem: 'A new engineer working in <code>dbt/models/marts/</code> reports that Claude ignores the team\'s dbt conventions (stg_/int_/fct_ prefixes, incremental models must declare <code>unique_key</code>), while the tech lead\'s sessions follow them consistently. The lead says, "They\'re in CLAUDE.md." Both use the same Claude Code version and cloned the same commit. What is the most likely diagnosis and fix?',
    options: [
      'The new engineer\'s Claude Code needs a newer release to support .claude/rules/; upgrade Claude Code and restart the session so the rules directory is detected.',
      'Run /memory in both sessions; the conventions likely live in the lead\'s ~/.claude/CLAUDE.md, which is not shared, so move them into project configuration.',
      'The new engineer must add an @~/.claude/CLAUDE.md import to the project CLAUDE.md so the team conventions are pulled into the new engineer\'s sessions.',
      'The conventions are in dbt/CLAUDE.md, which loads only when Claude is launched from dbt/; ask the new engineer to always start Claude from that directory.'
    ],
    answer: [1],
    explanation: 'User-level ~/.claude/CLAUDE.md applies only to that user and is not in version control, which is the classic reason one teammate gets instructions and another does not. /memory shows which memory files each session loaded; moving the conventions to the project CLAUDE.md or a .claude/rules/ file shares them with everyone.',
    rationales: [
      'Both run the same version, so a version gap cannot explain the difference.',
      'Correct. Verify with /memory, then move user-level instructions into shared project configuration.',
      'Importing a user-level file still resolves to each user\'s own home directory, so it would not deliver the lead\'s content.',
      'Subdirectory CLAUDE.md files load when Claude reads files in that directory, which the engineer already does.'
    ],
    trap: 'User-level config for team-wide conventions'
  },
  {
    id: 'e5-S2-09',
    scenario: 'S2',
    domain: 'D3',
    obj: 'X12',
    type: 'single',
    select: 1,
    stem: 'The repo has a project skill, <code>.claude/skills/backfill/SKILL.md</code> (dry-run first, 7-day chunks, Slack notification). Priya wanted to experiment with 1-day chunks and extra logging, so she created <code>~/.claude/skills/backfill/SKILL.md</code>. Now <code>/backfill</code> always runs her variant, even when she wants the team flow, and a demo from her laptop confused teammates about how the team skill behaves. What should she do?',
    options: [
      'Commit her variant to .claude/skills/backfill-priya/ in the repo so the whole team can see exactly how her experimental backfill behaves compared to the standard one.',
      'Add disable-model-invocation: true to her personal backfill skill so that it runs only when she types the command explicitly and never gets auto-invoked by Claude.',
      'Rename her personal skill directory, for example to ~/.claude/skills/backfill-dayslice/, so /backfill resolves to the team skill and her variant has its own name.',
      'Delete her personal skill and put her 1-day chunking instructions in CLAUDE.local.md so they adjust the team skill\'s steps only in her own sessions.'
    ],
    answer: [2],
    explanation: 'A personal skill with the same name as a project skill takes precedence for that user, which shadows the team workflow. Personal variants should live in ~/.claude/skills/ under a different name so the shared command keeps its team meaning and the experiment is invoked deliberately.',
    rationales: [
      'Committing a personal experiment to the project adds noise for the whole team; user scope is the right place for it.',
      'Disabling model invocation does not stop the same-name skill from shadowing /backfill when typed.',
      'Correct. A distinct personal name avoids shadowing the project skill and keeps both available.',
      'Free-text overrides in CLAUDE.local.md conflict with the skill\'s steps unpredictably and still alter the team workflow for her.'
    ],
    trap: 'Same-name personal skill shadowing the project skill'
  },
  {
    id: 'e5-S2-10',
    scenario: 'S2',
    domain: 'D3',
    obj: 'O14',
    type: 'single',
    select: 1,
    stem: 'The <code>/lineage-audit</code> skill runs <code>dbt ls --select +fct_revenue+ --output json</code> and reads about 90 model files to produce an impact report. After running it mid-refactor, developers find Claude forgetting refactor decisions made earlier in the session; <code>/context</code> shows roughly 110k tokens of audit output. What is the best fix?',
    options: [
      'Add context: fork to the skill\'s frontmatter so the audit runs in an isolated subagent context and returns only its impact summary.',
      'Instruct developers to run /compact immediately after every audit so the verbose output is summarized before they continue the refactor in the same session.',
      'Add "Keep your output concise and summarize the model files you read" to the skill body so the audit adds fewer tokens to the main conversation each time.',
      'Use a model with a larger context window for any session that runs the audit, so the 110k tokens of output fit alongside the earlier refactor discussion.'
    ],
    answer: [0],
    explanation: 'context: fork runs a skill in an isolated subagent context, so verbose discovery output never enters the main conversation; only the result returns. That preserves the session\'s earlier decisions without relying on after-the-fact cleanup.',
    rationales: [
      'Correct. Forked execution isolates the verbose output and returns just the summary.',
      '/compact is reactive and lossy; refactor decisions may be summarized away along with the audit output.',
      'The file reads themselves consume context; a concise final message does not undo them.',
      'A bigger window postpones the problem and does not stop attention dilution from irrelevant output.'
    ],
    trap: 'Bigger context / compaction instead of isolation'
  },
  {
    id: 'e5-S2-11',
    scenario: 'S2',
    domain: 'D2',
    obj: 'O17',
    type: 'single',
    select: 1,
    stem: 'You need every dbt model that uses the macro <code>safe_divide</code>, including indirect use through wrapper macros such as <code>margin_pct</code>, which some models call with the package namespace <code>{{ fin.margin_pct(...) }}</code>. The project has 2,300 SQL/Jinja files. An earlier attempt read files in <code>dbt/models/</code> one by one and exhausted context after about 400. Which approach is best?',
    options: [
      'Glob **/*.sql to get the full file list, then Read each file in order, keeping a running list of files that mention the macro until the whole project has been checked.',
      'Grep for the literal string safe_divide across dbt/models and report the matching files, since any model that uses the macro must contain its name somewhere in the source.',
      'Read everything in dbt/macros/ first, then Read every model under dbt/models/marts/, because that is the layer where the team puts financial ratio calculations.',
      'Grep dbt/macros for wrappers that call safe_divide, then Grep models for each macro name including namespaced calls, and Read only the matches.'
    ],
    answer: [3],
    explanation: 'Build understanding incrementally: use Grep to locate definitions and wrappers, expand the search set to every exported or wrapping name, then Read only the matching files to confirm usage. This covers indirect usage without loading thousands of irrelevant files into context.',
    rationales: [
      'Reading every file is the approach that already exhausted context.',
      'A literal search misses indirect use through wrappers like margin_pct and namespaced calls.',
      'Assuming a directory holds all usages is a guess, and it still reads many irrelevant files.',
      'Correct. Grep wrappers first, then search for each name, then Read only matches.'
    ],
    trap: 'Reading everything upfront vs incremental Grep-then-Read'
  },
  {
    id: 'e5-S2-12',
    scenario: 'S2',
    domain: 'D3',
    obj: 'O13',
    type: 'single',
    select: 1,
    stem: 'SQL style standards live in <code>.claude/rules/sql-style.md</code> with frontmatter <code>paths: ["dbt/**/*.sql"]</code>. The <code>/review</code> skill runs <code>git diff main...HEAD</code> through Bash and reviews the diff text. Reviews of Python changes cite the Python standards (which are in the always-loaded root CLAUDE.md), but reviews of dbt diffs never cite SQL style rules, even for obvious violations. Interactive editing sessions on the same .sql files do apply those rules. What is the cause and fix?',
    options: [
      'Path-scoped rules only load in the session where they were first created; re-commit sql-style.md so every new session registers the rules again at startup.',
      'The review only sees diff text from Bash and never reads a .sql file, so the path-scoped rule never loads; have the skill Read the changed files.',
      'The glob dbt/**/*.sql does not match files nested more than one directory deep; change the paths entry to dbt/**/**/*.sql so the nested model folders are included.',
      'Skills cannot see .claude/rules/ content under any circumstances, so the only option is to duplicate the full SQL style rules into the body of the review SKILL.md.'
    ],
    answer: [1],
    explanation: 'Rules with a paths field are loaded when Claude reads files matching the glob, not whenever related text appears in a command\'s output. A review that works only from git diff output never reads a matching file, so the rule never loads. Having the review Read the changed files (or explicitly load the standards file) makes the correct standards part of the review context.',
    rationales: [
      'Rules are files in the repo loaded by every session; there is no per-session registration.',
      'Correct. The trigger is reading a matching file, which the diff-only review never does.',
      '** already matches any depth, and interactive sessions prove the glob works.',
      'Rules are loaded into the session like other memory; duplicating them creates drift instead of fixing the trigger.'
    ],
    trap: 'Misdiagnosing when path-scoped rules load'
  },
  {
    id: 'e5-S2-13',
    scenario: 'S2',
    domain: 'D1',
    obj: 'O02',
    type: 'single',
    select: 1,
    stem: 'Yesterday, in a session named <code>dbt-refactor-revenue</code>, Claude analyzed 30 models and you agreed on a refactor plan. Overnight, a teammate merged a PR that changed <code>fct_revenue.sql</code>, <code>int_orders_enriched.sql</code>, <code>stg_payments.sql</code>, and <code>marts/schema.yml</code>. The other 26 models are unchanged. What is the best way to continue this morning?',
    options: [
      'Start a new session and ask Claude to re-analyze all 30 models from scratch, so that no part of the plan relies on analysis done before the merge.',
      'Run claude --resume dbt-refactor-revenue and continue the plan as-is; Claude will notice any differences in the changed files when it next edits them.',
      'Run claude --resume dbt-refactor-revenue, name the four files the merged PR changed, and have Claude re-read those and update the plan before continuing.',
      'Run claude --continue --fork-session so that the stale analysis stays isolated on a separate branch while you carry on with the refactor under a fresh session ID.'
    ],
    answer: [2],
    explanation: 'When most prior context is still valid, resume the named session and inform it about the specific changed files so it performs targeted re-analysis. That avoids repeating work on 26 unchanged models while ensuring the plan reflects the merged changes.',
    rationales: [
      'Full re-analysis wastes the valid work on 26 unchanged models.',
      'Resuming without telling Claude about the changes leaves it reasoning from stale tool results.',
      'Correct. Resume plus explicit notification of changed files enables targeted re-analysis.',
      'Forking copies the same stale context; it does not refresh the changed files.'
    ],
    trap: 'Resuming with stale tool results'
  },
  {
    id: 'e5-S2-14',
    scenario: 'S2',
    domain: 'D5',
    obj: 'O20',
    type: 'single',
    select: 1,
    stem: 'You are three hours into a session mapping how 140 Airflow DAGs trigger dbt jobs. Claude now says the finance DAGs "typically use an ExternalTaskSensor," contradicting its own earlier, file-cited finding that they use Airflow Datasets. Several remaining domains (marketing, ops, ML) still need mapping. What should you do going forward?',
    options: [
      'Have Claude keep a scratchpad file of confirmed findings with file references, consult it for later questions, and delegate each remaining domain to a subagent.',
      'Switch to a model with a larger context window so that the earlier file-cited findings stay in view for the rest of the mapping work across the remaining domains.',
      'Restart the session every hour and re-explore the DAGs from scratch each time, so Claude never has to rely on findings that were made long ago in the conversation.',
      'Add a CLAUDE.md rule telling Claude never to rely on typical patterns and to always cite a specific file, and then continue working in the same long session.'
    ],
    answer: [0],
    explanation: 'In long exploration sessions, context degradation shows up as vague "typical pattern" answers replacing specific findings. Persisting confirmed findings in a scratchpad file counters this across context boundaries, and delegating remaining domains to subagents isolates verbose exploration so the main session keeps high-level coordination.',
    rationales: [
      'Correct. A scratchpad plus subagent delegation preserves specific findings and isolates verbose exploration.',
      'A larger window does not prevent attention dilution over hours of verbose output.',
      'Restarting from scratch throws away verified work and repeats exploration.',
      'An instruction does not restore degraded context; the specific findings are what need persisting.'
    ],
    trap: 'Bigger window instead of scratchpad and isolation'
  },
  {
    id: 'e5-S2-15',
    scenario: 'S2',
    domain: 'D4',
    obj: 'O28',
    type: 'single',
    select: 1,
    stem: 'A script calls the Claude API with a forced tool <code>write_model_docs</code> whose input is an array of model documentation objects, asking for docs for all 180 models in <code>dbt/models/marts</code> in one request. The response has <code>stop_reason: "max_tokens"</code> and the tool input JSON is cut off at model 71. Raising max_tokens from 8k to 32k moved the cut-off to model 150, pushed latency to 4 minutes, and made descriptions for later models noticeably generic. What is the best fix?',
    options: [
      'Raise max_tokens to the model\'s maximum output limit and stream the response, so that the full array can finish without hitting the ceiling on the next run.',
      'Instruct Claude to use terser descriptions of at most one sentence per column so that all 180 models fit within the current 32k output budget in a single request.',
      'Detect the truncation, then send a follow-up "continue from where you stopped" message and concatenate the partial JSON fragments into one tool input.',
      'Split the work into scoped calls per model or small group, each returning a complete tool input, then validate each and merge them into the schema.yml files.'
    ],
    answer: [3],
    explanation: 'Truncated structured output is a sign the unit of work is too large. Splitting into smaller scoped calls produces complete, independently valid tool inputs, keeps attention focused on each model (fixing the generic later descriptions), and allows retrying only failed pieces. Raising the ceiling treats the symptom and degrades quality.',
    rationales: [
      'Output ceilings are finite, and larger single outputs dilute attention, as the generic descriptions show.',
      'Degrading content quality to fit a budget sacrifices the purpose of the docs.',
      'Stitching partial JSON is fragile and still produces one enormous, degraded output.',
      'Correct. Scoped calls with validation and merging eliminate truncation and improve per-model quality.'
    ],
    trap: 'Raising max_tokens for truncated structured output'
  }
]);
