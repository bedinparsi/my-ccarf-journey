/* Domain 3 lessons (+ O08): plan vs direct vs multi-phase, config mechanism selection, CI/CD review configuration. */
(function () {
  var D = function (spec) { return CCAR.charts.diagram(spec); };
  CCAR.lessons = CCAR.lessons || [];

  CCAR.lessons.push({
    id: 'plan-direct-multiphase', domain: 'D1', objs: ['O08', 'X12'], minutes: 18,
    title: 'Plan mode vs direct execution vs multi-phase workflows',
    summary: 'Choose the execution architecture from scope, risk, and approval gates. You scored 0% here.',
    body: function () {
      return '' +
      D({ w: 760, h: 300, title: 'Execution architecture decision tree',
        nodes: [
          { id: 'q1', x: 280, y: 10, w: 200, h: 54, label: 'Scope clear & local?', sub: 'stack trace, 1 file, known fix', kind: 'tool' },
          { id: 'd', x: 20, y: 110, w: 180, h: 54, label: 'Direct execution', sub: '+ run existing tests', kind: 'good' },
          { id: 'q2', x: 280, y: 110, w: 200, h: 54, label: 'Human approval required', sub: 'or prod / destructive?', kind: 'tool' },
          { id: 'p', x: 560, y: 110, w: 180, h: 54, label: 'Plan mode → execute', sub: 'many files, several approaches', kind: 'agent' },
          { id: 'mp', x: 250, y: 220, w: 260, h: 64, label: 'Multi-phase workflow', sub: 'plan → approve → execute → independent review', kind: 'agent' }
        ],
        edges: [{ from: 'q1', to: 'd', label: 'yes' }, { from: 'q1', to: 'q2', label: 'no' }, { from: 'q2', to: 'p', label: 'no gate' }, { from: 'q2', to: 'mp', label: 'yes' }],
        caption: 'Plan mode is read-only exploration and design. It never implements, so "stay in plan mode forever" is always wrong when code must change.' }) +
      '<table class="tbl"><thead><tr><th>Signal in the stem</th><th>Choose</th></tr></thead><tbody>' +
      '<tr><td>Single-file bug, precise stack trace, obvious fix, existing tests, "a teammate insists on plan mode for safety"</td><td><b>Direct execution</b>. Business criticality alone doesn\'t make it architectural.</td></tr>' +
      '<tr><td>45+ files, library migration, two valid approaches, service boundaries</td><td><b>Plan mode</b> to explore and design, then <b>direct execution of the approved plan</b></td></tr>' +
      '<tr><td>"Lead must approve before any code changes", prod Terraform, deletions, compliance</td><td><b>Multi-phase</b>: plan → human approval gate <i>between</i> phases → execute → independent review</td></tr>' +
      '<tr><td>Started direct; discovery reveals a cross-service API contract change</td><td><b>Stop and switch to plan mode</b></td></tr>' +
      '<tr><td>Plan-mode discovery floods context ("usual patterns" instead of specific wrappers)</td><td>Delegate discovery to the <b>Explore subagent</b>; keep planning in the main session</td></tr>' +
      '<tr><td>Mixed-risk bot fixes (48% lint, 22% local null-checks, 30% cross-module)</td><td><b>Route by scope</b>: direct for mechanical and local fixes, plan + approval for architectural ones</td></tr>' +
      '</tbody></table>' +
      '<div class="callout rule"><b>In CI, the approval gate sits between jobs.</b> A <code>-p</code> run can\'t pause and wait for a human answer. Phase 1 posts the plan; approval triggers phase 2.</div>' +
      '<div class="callout trap"><b>Traps:</b> "start direct and switch to plan if complexity appears" (the complexity is already stated); "approve the final 70-file diff" (that\'s approval after the fact); "let the agent run terraform apply after its own review" (self-approval of prod); "per-file jobs each choosing a strategy" (inconsistent migration); "a design review for a one-line regression" (process for its own sake).</div>' +
      '<h3>Modes you should know</h3><p><code>--permission-mode default | acceptEdits | plan | auto | dontAsk | bypassPermissions</code>. Shift+Tab cycles modes interactively. <code>acceptEdits</code> auto-approves file edits; <code>plan</code> is read-only.</p>';
    }
  });

  CCAR.lessons.push({
    id: 'config-mechanisms', domain: 'D3', objs: ['O16', 'X07', 'X12', 'O14'], minutes: 30,
    title: 'Choosing the right Claude Code mechanism: CLAUDE.md, rules, skills, hooks, permissions',
    summary: 'The config-selection objective you scored 0% on. One master table plus the loading rules behind it.',
    body: function () {
      return '' +
      '<p>Every question here is really asking two things: <b>must it be guaranteed, or is guidance enough?</b> and <b>when should it load: always, for certain files, or on demand?</b></p>' +
      D({ w: 760, h: 250, title: 'Guidance vs enforcement',
        groups: [{ x: 10, y: 10, w: 470, h: 230, label: 'CONTEXT (probabilistic guidance)', kind: 'soft' }, { x: 500, y: 10, w: 250, h: 230, label: 'ENFORCEMENT (deterministic)', kind: 'hard' }],
        nodes: [
          { id: 'cm', x: 30, y: 40, w: 200, h: 54, label: 'CLAUDE.md', sub: 'always loaded, universal', kind: 'store' },
          { id: 'ru', x: 260, y: 40, w: 200, h: 54, label: '.claude/rules/*.md', sub: 'paths: globs → on file read', kind: 'store' },
          { id: 'sk', x: 30, y: 150, w: 200, h: 54, label: 'Skills (SKILL.md)', sub: 'on demand / by description', kind: 'store' },
          { id: 'lo', x: 260, y: 150, w: 200, h: 54, label: 'CLAUDE.local.md', sub: 'personal, gitignored', kind: 'store' },
          { id: 'hk', x: 530, y: 40, w: 200, h: 54, label: 'Hooks', sub: 'PreToolUse / PostToolUse …', kind: 'good' },
          { id: 'pm', x: 530, y: 150, w: 200, h: 54, label: 'Permissions', sub: 'allow / ask / deny (deny wins)', kind: 'good' }
        ], edges: [] }) +
      '<h3>Master selection table</h3>' +
      '<table class="tbl"><thead><tr><th>Requirement</th><th>Mechanism</th><th>Why not the others</th></tr></thead><tbody>' +
      '<tr><td>Universal team standards: build commands, conventions, architecture facts</td><td><b>Project CLAUDE.md</b> (<code>./CLAUDE.md</code> or <code>./.claude/CLAUDE.md</code>)</td><td>Keep under ~200 lines; move procedures and file-specific rules out</td></tr>' +
      '<tr><td>Conventions for a file type spread across many directories (<code>**/*.test.tsx</code>, <code>**/*.tf</code>)</td><td><b><code>.claude/rules/x.md</code> with <code>paths:</code> globs</b></td><td>Subdirectory CLAUDE.md is directory-bound; a skill depends on invocation</td></tr>' +
      '<tr><td>Occasional multi-step workflow (release, migration playbook), maybe with arguments</td><td><b>Skill</b> in <code>.claude/skills/&lt;name&gt;/SKILL.md</code> (+ <code>argument-hint</code>)</td><td>CLAUDE.md, @imports and unscoped rules all load at launch</td></tr>' +
      '<tr><td>Must happen after <i>every</i> edit (formatter, validator, feed errors back)</td><td><b>PostToolUse hook</b> matching <code>Edit|Write</code></td><td>Instructions are followed ~70% of the time; PreToolUse would validate the old content</td></tr>' +
      '<tr><td>Must never happen: publish, prod apply, edit generated files, read <code>.env</code></td><td><b>permissions.deny</b> in committed <code>.claude/settings.json</code> (or a PreToolUse hook)</td><td>CLAUDE.md/rules are context, not enforcement</td></tr>' +
      '<tr><td>Conditional block ("edit new migrations OK, merged ones never")</td><td><b>PreToolUse hook</b> with logic, exit code 2 + stderr feedback</td><td>A path deny rule is too broad</td></tr>' +
      '<tr><td>Verbose skill output polluting the main session</td><td><b><code>context: fork</code></b> in the skill frontmatter</td><td>/compact is lossy; disable-model-invocation only controls who triggers it</td></tr>' +
      '<tr><td>Personal preference (terse answers, sandbox URLs)</td><td><b>CLAUDE.local.md</b> or <code>~/.claude/CLAUDE.md</code></td><td>Committed files impose it on the team</td></tr>' +
      '<tr><td>Personal variant of a team skill</td><td><code>~/.claude/skills/</code> <b>under a different name</b></td><td>A same-name personal skill <b>shadows</b> the project one</td></tr>' +
      '<tr><td>Team slash command available on clone</td><td><code>.claude/commands/</code> (older format) or <code>.claude/skills/</code></td><td><code>~/.claude/commands/</code> is personal; <code>.claude/config.json</code> doesn\'t exist</td></tr>' +
      '</tbody></table>' +
      '<h3>Loading rules the exam tests</h3><ul>' +
      '<li><b>Hierarchy:</b> managed policy → <code>~/.claude/CLAUDE.md</code> (user, <i>not shared</i>) → project → <code>CLAUDE.local.md</code>; subdirectory CLAUDE.md files load <b>when Claude reads files there</b>. Files are concatenated, not overridden.</li>' +
      '<li><b>"Works for the lead, not for the new hire"</b> almost always means the rules live in the lead\'s <code>~/.claude/CLAUDE.md</code> or <code>CLAUDE.local.md</code>. Verify with <code>/memory</code> (exam guide) or <code>/context</code> (current docs), then move them to project config.</li>' +
      '<li><b>@imports</b> (<code>@docs/standards.md</code>) are for organization. They still load at launch and save no context. Relative to the importing file, max four hops deep.</li>' +
      '<li><b>Rules:</b> <code>paths</code> is the <i>only</i> frontmatter field. <code>globs:</code>/<code>alwaysApply:</code> are ignored (they belong to another tool), so the rule loads unconditionally. No <code>paths</code> means always loaded, same as CLAUDE.md.</li>' +
      '<li><b>Path rules trigger on reading a matching file</b>, not on diff text. A review that only pipes <code>git diff</code> never loads them.</li>' +
      '<li>Globs are relative to the project root. In a monorepo, <code>src/api/**</code> will not match <code>apps/api/src/**</code>.</li>' +
      '<li><code>--bare</code> skips auto-discovery of CLAUDE.md, rules, hooks, skills, and MCP. Scripted runs using it lose your standards.</li></ul>' +
      '<pre class="code"># .claude/rules/terraform.md\n---\npaths: ["**/*.tf", "**/*.tfvars"]\n---\n- Pin provider versions; mandatory tags block; no inline IAM policies</pre>' +
      '<pre class="code">// .claude/settings.json (committed)\n{\n  "permissions": {\n    "allow": ["Bash(terraform plan *)"],\n    "deny":  ["Bash(terraform apply *)", "Edit(packages/*/src/generated/**)", "Read(./.env)"]\n  },\n  "hooks": {\n    "PostToolUse": [{ "matcher": "Edit|Write",\n      "hooks": [{ "type": "command", "command": "./tools/format-changed.sh" }] }]\n  }\n}</pre>' +
      '<h3>Skill frontmatter cheat sheet</h3><table class="tbl"><tbody>' +
      '<tr><td><code>description</code></td><td>What it does and when to use it. Drives automatic invocation.</td></tr>' +
      '<tr><td><code>context: fork</code></td><td>Runs in an isolated subagent context; only the result returns. This isolates <b>conversation context</b>, not file-system access.</td></tr>' +
      '<tr><td><code>allowed-tools</code></td><td>Exam framing: restricts the skill\'s tools. Current docs: pre-approves them, while <code>disallowed-tools</code> removes tools.</td></tr>' +
      '<tr><td><code>argument-hint</code></td><td>Prompts for parameters, e.g. <code>[issue-number]</code>; body uses <code>$ARGUMENTS</code>, <code>$0</code></td></tr>' +
      '<tr><td><code>disable-model-invocation: true</code></td><td>Only a human can trigger it (deploy, commit). Does not stop name shadowing.</td></tr>' +
      '<tr><td>Scope / precedence</td><td>Enterprise > personal > project on name clash; a skill beats a command of the same name</td></tr></tbody></table>' +
      '<div class="callout rule"><b>Settings scopes:</b> <code>~/.claude/settings.json</code> (user) · <code>.claude/settings.json</code> (project, committed) · <code>.claude/settings.local.json</code> (personal, gitignored) · managed (org, highest). Precedence: managed > CLI flags > local > project > user. Permission arrays merge; <b>deny wins</b>.</div>' +
      '<p class="src">Sources: <a href="https://code.claude.com/docs/en/memory" target="_blank" rel="noopener">Memory &amp; rules</a>, <a href="https://code.claude.com/docs/en/skills" target="_blank" rel="noopener">Skills</a>, <a href="https://code.claude.com/docs/en/hooks" target="_blank" rel="noopener">Hooks</a>, <a href="https://code.claude.com/docs/en/settings" target="_blank" rel="noopener">Settings</a>.</p>';
    }
  });

  CCAR.lessons.push({
    id: 'ci-review-config', domain: 'D3', objs: ['O13', 'O11', 'O15', 'O12', 'X11'], minutes: 25,
    title: 'Claude Code in CI/CD: review configurations that load standards, restrict tools, and emit structured output',
    summary: 'You aced the CLI flags but scored 0% on review configurations. This lesson connects the two.',
    body: function () {
      return '' +
      D({ w: 760, h: 230, title: 'A correct CI review job',
        nodes: [
          { id: 'co', x: 20, y: 20, w: 180, h: 54, label: 'Checkout', sub: 'CLAUDE.md + .claude/rules', kind: 'store' },
          { id: 'cl', x: 250, y: 20, w: 250, h: 54, label: 'claude -p (no --bare)', sub: 'loads project standards', kind: 'agent' },
          { id: 'tl', x: 250, y: 120, w: 250, h: 54, label: 'Tool surface', sub: '--tools / --allowedTools / --disallowedTools', kind: 'tool' },
          { id: 'js', x: 560, y: 20, w: 180, h: 54, label: '--output-format json', sub: '+ --json-schema', kind: 'good' },
          { id: 'po', x: 560, y: 120, w: 180, h: 54, label: 'Poster script', sub: 'inline PR comments', kind: 'sub' },
          { id: 'lm', x: 20, y: 150, w: 180, h: 60, label: 'Limits', sub: '--max-turns · --max-budget-usd', kind: 'tool' }
        ],
        edges: [{ from: 'co', to: 'cl' }, { from: 'tl', to: 'cl', label: 'read-only' }, { from: 'cl', to: 'js' }, { from: 'js', to: 'po' }, { from: 'lm', to: 'cl' }] }) +
      '<h3>The three requirements, and the only reliable way to meet each</h3>' +
      '<table class="tbl"><thead><tr><th>Requirement</th><th>Reliable</th><th>Unreliable (distractors)</th></tr></thead><tbody>' +
      '<tr><td><b>Load the correct project standards</b></td><td>Committed <code>CLAUDE.md</code> / <code>.claude/rules/</code>, loaded by <code>-p</code> from the checkout; no <code>--bare</code>; the review reads the changed files so path-scoped rules trigger (or pass standards via <code>--append-system-prompt</code>)</td><td>Standards in someone\'s <code>~/.claude/CLAUDE.md</code>; baked into the runner image; <code>--add-dir ~/.claude</code></td></tr>' +
      '<tr><td><b>Restrict tool access</b> (read-only review)</td><td><code>--tools "Read,Grep,Glob"</code>, <code>--disallowedTools "Edit" "Write"</code>, narrowly scoped <code>--allowedTools "Bash(go vet *)"</code></td><td>"Do not modify files" in the prompt; <code>--dangerously-skip-permissions</code>; <code>acceptEdits</code>; a fictional <code>--read-only</code></td></tr>' +
      '<tr><td><b>Structured output for automation</b></td><td><code>--output-format json --json-schema \'{…}\'</code> with an <b>enum</b> for severity</td><td>"Respond only with JSON" + regex; <code>--output-format json</code> alone (that\'s just an envelope); <code>stream-json</code> (events, not findings)</td></tr>' +
      '</tbody></table>' +
      '<pre class="code">claude -p "Review the changes on this branch against our standards. Read each changed file." \\\n  --output-format json \\\n  --json-schema "$(cat .github/review.schema.json)" \\\n  --tools "Read,Grep,Glob,Bash" --allowedTools "Bash(git diff *)" \\\n  --max-turns 30 --max-budget-usd 3.00</pre>' +
      '<h3>CLI facts (exam-safe and current)</h3><table class="tbl"><tbody>' +
      '<tr><td><code>-p / --print</code></td><td>Non-interactive. Without it the job hangs waiting for input.</td></tr>' +
      '<tr><td><code>--max-turns N</code>, <code>--max-budget-usd 5.00</code></td><td>Runaway protection in print mode. Not <code>--max-cost</code>.</td></tr>' +
      '<tr><td><code>--permission-mode acceptEdits</code> + scoped <code>--allowedTools</code></td><td>Test-generation jobs that must write tests and run test commands, with least privilege</td></tr>' +
      '<tr><td><code>--bare</code></td><td>Skips discovery of CLAUDE.md, rules, hooks, skills, MCP. Fast, but your standards disappear.</td></tr>' +
      '<tr><td>Fictional</td><td><code>--batch</code>, <code>--headless</code>, <code>CLAUDE_HEADLESS=true</code>, <code>--non-interactive</code>, <code>--ci</code>, <code>--read-only</code>, <code>--max-cost</code></td></tr></tbody></table>' +
      '<h3>Review quality patterns</h3><ul>' +
      '<li><b>Re-runs on new commits:</b> pass the prior findings with their status and ask for <b>new or still-unaddressed</b> issues only. Exact-text dedupe fails when wording shifts, and <code>--continue</code> on an ephemeral runner points at nothing.</li>' +
      '<li><b>Independent reviewer:</b> the session that generated code is biased toward approving it. Use a separate <code>claude -p</code> instance with only the diff and standards. Forks inherit the history, so they aren\'t independent.</li>' +
      '<li><b>Test generation:</b> put the existing test files in context to avoid duplicates, and document fixtures, fakes and valuable-test criteria in CLAUDE.md. Coverage quotas reward trivial assertions.</li>' +
      '<li><b>Iterative refinement:</b> when prose is misread twice, give 2–3 concrete input→output pairs (then encode them as tests). Fix interacting issues together, independent issues one at a time.</li></ul>' +
      '<div class="callout trap"><b>Trap pair:</b> "<code>--output-format json</code> guarantees schema compliance" is false; only <code>--json-schema</code> validates the shape. "The JSON schema replaces the system prompt / disables memory" is also false.</div>' +
      '<p class="src">Source: <a href="https://code.claude.com/docs/en/cli-reference" target="_blank" rel="noopener">Claude Code CLI reference</a>.</p>';
    }
  });
})();
