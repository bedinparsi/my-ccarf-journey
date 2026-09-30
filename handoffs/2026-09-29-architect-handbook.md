# Handoff: CCAR-F prep app, session 2 (2026-09-29): Architect Handbook

Load this file first (attach with `#File`). It is self-contained and supersedes `handoffs/2026-09-29-ccarf-prep-app.md`, which is now history (read it only if you need session-1 details such as exam-form stats).

## 1. State at end of session (TL;DR)
- App: offline single-page study app for the **CCAR-F (Claude Certified Architect – Foundations)** exam. Opened from `index.html` in Microsoft Edge (file://). Progress lives in Edge localStorage.
- Session 1 built: dashboard, score-report analysis, 15 short "retake focus" lessons, 62 flashcards, 5 practice exams × 60 items (300 items), drills, history, settings.
- **Session 2 (this one) added the Architect Handbook**: 52 chapters in 9 parts (~1.2 MB rendered HTML, ~26 h reading) covering every exam task statement (1.1–5.6), platform fundamentals, 6 scenario playbooks, design casebook, reference sheets. The 15 retake lessons were deliberately **not modified** (user request).
- All checks pass: `check-lessons` OK, `audit-coverage` all bullets present, `validate` OK, `node --check` clean, Edge screenshots render correctly.
- User reaction so far: asked for this handoff; no open complaints.

## 2. User and standing rules
- User: Mohammad Partovi. Failed CCAR-F on 2026-09-22 with **656** (pass **720**, scale 100–1000; about 5–6 items short). Wants to fully depend on this guide for the exam **and** real Claude architecture work.
- Workspace: `c:\Users\m.partovi\Documents\Anthropic\CCAR-F` · Windows · PowerShell · Node 24 · Python 3.14 (+pypdf) · Edge installed. Not a git repo.
- Steering (always injected): `.kiro/steering/sources-of-truth.md`. Anthropic is the source of truth (order: Skilljar → code.claude.com/docs → platform.claude.com/docs → anthropic.com/engineering + research → modelcontextprotocol.io → exam guide). Current material only; third-party sources are leads only; when guide ≠ current docs, teach current behavior and note the guide's terminology; cite Anthropic URLs.
- Style the user accepted: dense tables, diagrams, no filler, no em dashes, no exclamation marks.

## 3. Exam facts (official guide v1.0, July 2026)
- 60 items · 120 min · 4 of 6 scenarios · single and multiple response · scaled 100–1000, pass 720.
- Domains: D1 Agentic Architecture 27% · D2 Tool Design & MCP 18% · D3 Claude Code 20% · D4 Prompt/Structured Output 20% · D5 Context & Reliability 15%.
- Scenarios: S1 support agent · S2 Claude Code dev · S3 multi-agent research · S4 dev productivity · S5 CI/CD · S6 data extraction.
- Out of scope (guide appendix): fine-tuning, auth/billing, MCP hosting/infra, embeddings/vector DBs, computer use, vision, **streaming/SSE, rate limits, pricing calculations, prompt caching implementation details**, cloud-provider config, benchmarks, tokenization.
- Weak objectives from the score report (`prev` in `js/data/blueprint.js`, weak = <70): **0%**: O06, O08, O09, O10, O13, O16, O18, O19, O28 · **33–67%**: O22 (33), O04 (50), O29 (50), O31 (50), O33 (50), O17 (60), O03 (67). O23 = 75.

## 4. What this session did (in order)
1. Researched current Anthropic docs and wrote **`docs/_ref/handbook-facts.md`** (verified facts: model lineup, effort/adaptive thinking, tool_choice, structured outputs, prompt caching, context editing, Agent SDK loop/permissions/subagents, Claude Code best practices/permissions/security/GitHub Actions, MCP latest spec, engineering posts on tools, context engineering, evals, long-running harnesses, Message Batches).
2. Wrote **`docs/_ref/handbook-authoring.md`**: the chapter spec (sources, file format, helpers, chapter structure, escaping, chunked writing procedure).
3. Built infrastructure: `js/data/handbook.js` (parts, task statements, helpers), rewrote `js/views/study.js` (two tabs), router + dashboard tweaks, CSS for new components.
4. Wrote Part 0 chapters 0.0–0.3 myself (`hb-p0a.js`) as the quality template.
5. Delegated the other 48 chapters to parallel `general-task-execution` sub-agents (one file each), then spot-reviewed output. One sub-agent failed with "high load" after writing 1.1–1.3; a follow-up agent appended 1.4 and closed the file.
6. Added verification tools `tools/check-lessons.js` and `tools/audit-coverage.js`.
7. Added an "Exam scope vs real-work depth" section to 0.0 and scope notes in 0.1/0.2; fixed chapter-number spacing (`.hb-num`) and an overlapping diagram label in 6.1.

## 5. File map (with read strategy)
Large files: do **not** read whole. Use grep or `read_file` with offset/limit.
```
index.html                      # script ORDER matters (classic scripts, no modules)
css/styles.css                  # + .callout.exam/.real/.decision, details.check, .hb-num, .hb-part, .cov-tbl, .track-tabs
js/data/blueprint.js            # CCAR bootstrap, DOMAINS, SCENARIOS, OBJECTIVES (O01–O37, X01–X12), EXAM_FORMS
js/core/{ui,storage,charts,engine}.js
js/data/handbook.js             # NEW: HANDBOOK_PARTS (P0–P8), TASK_STATEMENTS (30), CCAR.hb helpers, lessonTS(), handbookLessons(), retakeLessons()
js/data/lessons/lessons-1..4.js # 15 retake lessons (unchanged)
js/data/handbook/hb-p0a.js … hb-p8.js   # NEW: 14 files, 42–108 KB each (see §7)
js/data/flashcards.js           # 62 cards
js/data/exams/examN-SX.js       # 20 files × 15 items (unchanged)
js/views/study.js               # REWRITTEN: #/study (handbook by part) and #/study/retake; prev/next within a track
js/views/dashboard.js           # EDITED: plan list + "Lessons completed" use retake lessons; KPI subline shows handbook progress
js/app.js                       # EDITED: route regex ^#\/study(?:\/(retake))?$
tools/validate.js               # exam item schema/coverage (session 1)
tools/check-lessons.js          # NEW: renders every lesson in Node; checks tags, leaked ${expr}, unknown objs/ts, dup ids, TS coverage; --list
tools/audit-coverage.js         # NEW: one keyword per exam-guide Knowledge/Skills bullet must appear in that TS's handbook chapters
docs/_ref/exam-guide.txt        # 86 KB; §6 task statements lines 113–718; §9 sample questions 830–1050; §17 appendix (technologies, in/out of scope) 1146–1235
docs/_ref/facts.md              # session-1 verified facts (CLI, CLAUDE.md, skills, hooks, settings, MCP, batches)
docs/_ref/handbook-facts.md     # NEW 24 KB: session-2 verified facts (primary source for any new content)
docs/_ref/handbook-authoring.md # NEW: spec for writing/adding chapters
docs/_ref/question-spec.md      # exam item schema and rules
.kiro/steering/sources-of-truth.md
```

## 6. Handbook data model and conventions
- Lesson object: `{ id, track:'handbook', part:'P0'..'P8', num:'1.4', order:104, domain:'D1'|'ALL', objs:[objective ids for the Drill button], ts:[task statement ids], minutes, title, summary, body() }`. Retake lessons have no `track`.
- `order` = part×100 + index (0.x uses 0–7). Chapters sort by `order`; study page groups by `part`.
- Bodies are **template literals** built with `CCAR.hb` helpers: `H.table(head, rows, cls?)`, `H.box(kind, title, html)` (kinds: rule green, trap red, real blue, exam purple, decision orange, weak amber), `H.check([[q, a]...])` (collapsible self-check), `H.src([[title, url]...])`, `D(spec)` SVG diagram (`{w:760,h,title,nodes,edges,groups,caption}`).
- Escaping: literal `${` → `\${` (e.g. `"\${GITHUB_TOKEN}"`); literal backtick → `` \` ``; `<`/`>` in code → `&lt;`/`&gt;`; single-quoted helper args need `\'`. Diagram labels are HTML-escaped by `D()`, so never put entities like `&lt;` in labels.
- Chapter structure: opening (why it matters, what the exam probes) → mechanics → every exam bullet taught → decision table → real-world notes → exam-vs-docs note → traps → worked scenario → 4–6 check questions → sources.
- `lessonsDone` in localStorage is keyed by lesson id: **never rename ids** (it silently resets progress).
- `CCAR.lessons` order: retake lessons load first, handbook after. Dashboard `lessonForObj` intentionally returns the retake lesson for an objective.
- Chapter 0.0 builds its coverage matrix live from lesson `ts` values (retake lessons map via their objectives' `ts` field).

## 7. Chapter index (num · id · file · task statements)
```
P0 hb-p0a: 0.0 hb-00-roadmap (scope, principles, coverage map) · 0.1 hb-01-api-models (1.1 5.1) · 0.2 hb-02-cost-latency (4.5 5.1) · 0.3 hb-03-tool-mechanics (1.1 2.3 4.3)
P0 hb-p0b: 0.4 hb-04-agent-sdk (1.1 1.3 1.5 1.7) · 0.5 hb-05-claude-code (3.1 3.2 3.4 3.6) · 0.6 hb-06-mcp (2.1 2.2 2.4) · 0.7 hb-07-prompting (4.1 4.2 5.1)
P1 hb-p1a: 1.1 hb-11-agentic-loop · 1.2 hb-12-coordinator · 1.3 hb-13-subagent-config · 1.4 hb-14-enforcement-handoff
P1 hb-p1b: 1.5 hb-15-sdk-hooks · 1.6 hb-16-decomposition · 1.7 hb-17-sessions
P2 hb-p2:  2.1 hb-21-tool-interfaces · 2.2 hb-22-structured-errors · 2.3 hb-23-tool-distribution · 2.4 hb-24-mcp-integration · 2.5 hb-25-builtin-tools
P3 hb-p3a: 3.1 hb-31-claude-md · 3.2 hb-32-commands-skills · 3.3 hb-33-path-rules
P3 hb-p3b: 3.4 hb-34-plan-mode · 3.5 hb-35-iterative-refinement · 3.6 hb-36-cicd
P4 hb-p4a: 4.1 hb-41-explicit-criteria · 4.2 hb-42-few-shot · 4.3 hb-43-structured-output
P4 hb-p4b: 4.4 hb-44-validation-retry · 4.5 hb-45-batch · 4.6 hb-46-multi-pass-review
P5 hb-p5a: 5.1 hb-51-long-context · 5.2 hb-52-escalation · 5.3 hb-53-error-propagation
P5 hb-p5b: 5.4 hb-54-codebase-context · 5.5 hb-55-human-review · 5.6 hb-56-provenance
P6 hb-p6:  6.1 hb-61-support-agent (S1) · 6.2 hb-62-claude-code-dev (S2) · 6.3 hb-63-research-system (S3) · 6.4 hb-64-dev-productivity (S4) · 6.5 hb-65-ci-cd (S5) · 6.6 hb-66-data-extraction (S6)
P7 hb-p7:  7.1 hb-71-decision-frameworks (14 decisions) · 7.2 hb-72-production-readiness · 7.3 hb-73-design-cases (15 cases) · 7.4 hb-74-trace-forensics (17 evidence snippets)
P8 hb-p8:  8.1 hb-81-cheat-sheet · 8.2 hb-82-terminology (24 divergences, ~95 glossary terms) · 8.3 hb-83-anti-patterns (119 rows) · 8.4 hb-84-final-week (7-day plan, 50-question self-test)
```
In P1–P5 each chapter's `ts` equals its number. Find a chapter's source line: `grep "id: 'hb-43"` in `js/data/handbook/`.

## 8. Verify after any change (PowerShell, from the workspace root)
1. `node tools/check-lessons.js` → last line `OK` (`--list` prints every lesson with size).
2. `node tools/audit-coverage.js` → `ALL BULLET KEYWORDS PRESENT`.
3. `node tools/validate.js` → `OK`.
4. `Get-ChildItem js -Recurse -Filter *.js | % { node --check $_.FullName }` → no output means clean.
5. Optional visual check (see gotchas for the safe Edge procedure).

## 9. Accuracy notes
- **Biggest exam-vs-docs divergence found:** `tool_choice` `{"type":"any"}` and forced `{"type":"tool",...}` return **HTTP 400 on Opus 5.5, Sonnet 5.5 and Fable 5.1** (Haiku 4.5 and older still accept them). Current approach: `auto` + strict tool use (`strict: true`), or JSON outputs (`output_config.format`), or programmatic gating. The exam guide still teaches forced/any, so chapters give the exam answer and the real-work answer side by side.
- Other divergences taught the same way: Task tool (exam) = Agent tool (current); `/memory` (exam) vs `/context`; skill `allowed-tools` (exam: restricts; docs: pre-approves, `disallowed-tools` removes); assistant prefill returns 400 on Claude 4.6+; `budget_tokens` deprecated (400 on 4.7+), use `effort`; `fork_session` = `--fork-session` / `forkSession`.
- Current models (Sept 2026): Fable 5.1 ($10/$50, 1M ctx), Opus 5.5 ($4/$20, 1M, docs' recommended default), Sonnet 5.5 ($2/$10, 1M), Haiku 4.5 ($1/$5, 200K).
- Details sub-agents used that are **not in the facts files** (believed correct, not re-verified): GitHub Action input `anthropic_api_key`; Python batch SDK names `client.messages.batches.create/retrieve/results` and `processing_status == "ended"`; hook callback field `tool_response` and the Python hook signature; command-hook exit codes other than 2 are non-blocking (fail-open). Verify against docs before building more content on them.
- Any new content: use only `handbook-facts.md`, `facts.md`, `exam-guide.txt`; if a fact is missing, fetch current Anthropic docs and add it to `handbook-facts.md` first.

## 10. Gotchas
- PowerShell prints a noisy `:\WINDOWS\...powershell.exe\` line after commands; ignore it.
- Complex one-line `node -e "..."` commands with nested quotes can hang or time out in PowerShell. Write a temp `.js` file instead, run it, then delete it.
- `$env:TEMP` may resolve to an 8.3 short path (`C:\Users\MDFD0~1.PAR\...`); `Remove-Item` can fail on it. Use the full `C:\Users\m.partovi\AppData\Local\Temp\...` path.
- **Edge screenshots:** `Start-Process msedge -ArgumentList '--headless=new','--disable-gpu','--user-data-dir=<fresh dir in TEMP>','--window-size=1400,2200','--virtual-time-budget=4000','--screenshot=<abs png>','file:///C:/Users/m.partovi/Documents/Anthropic/CCAR-F/index.html#/study' -PassThru`, sleep ~12 s, kill the process if still running, read the PNG, then delete the user-data dir. Never put the user-data dir inside the workspace: lingering msedge processes lock it (cleanup needs waiting ~10 s). Using `-Wait` can hang the terminal for minutes.
- `check-lessons.js` flags the literal word "undefined" in rendered HTML; reword if you mean it in prose.
- Sub-agents: 7 parallel `general-task-execution` agents worked; one failed with "high load" mid-file. Always instruct: fs_write the first chapter, fs_append each further chapter, append `})();`, run the checks. Partial files show up as `LOAD FAIL ... Unexpected end of input`.
- Headless Edge caches file:// scripts per profile: always use a fresh `--user-data-dir`.

## 11. Working efficiently next session (Opus 5.5 on Kiro)
- Start from this file; do not re-explore the repo or re-read handbook files end to end (14 files, 42–108 KB each, ~1 MB total). Grep for ids/titles and read targeted ranges.
- For content questions, check `handbook-facts.md` (24 KB) before web research; it already holds the verified current-docs facts.
- For new chapters or large rewrites, reuse `docs/_ref/handbook-authoring.md` as the sub-agent brief and give each sub-agent one file.
- Keep retake lessons untouched unless the user asks; keep lesson ids stable.

## 12. Possible next work (not started)
- Short "5-minute summary" box at the top of each long chapter (most are 14–35 KB vs the 9–16 KB target).
- Handbook-specific drills or new exam items keyed to task statements (exam items are keyed by objective only).
- Print/export view of the handbook; spaced repetition built from the `H.check` questions.
- Session-1 leftovers: D2 under-weighted in exam1 (5 items) and exam3 (6); exam3 has only 2 each of O18/O19/O28; scaled score is a linear approximation, so target ≥80% on two consecutive forms.
