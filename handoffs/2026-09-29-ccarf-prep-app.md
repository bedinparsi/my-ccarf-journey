# Handoff: CCAR-F exam-prep SPA (session 2026-09-29)

Read this first; it replaces re-exploring the repo. Workspace: `c:\Users\m.partovi\Documents\Anthropic\CCAR-F` (Windows, PowerShell, Node 24, Python 3.14 + pypdf, Edge installed).

## Goal & user context
- User (Mohammad Partovi) failed **CCAR-F (Claude Certified Architect – Foundations)** on 2026-09-22: **656 / pass 720** (~5–6 items short of 60). Wants a hard, realistic study app + 5×60-question exams, emphasis on missed objectives, progress in Edge localStorage.
- **Standing rule** (`.kiro/steering/sources-of-truth.md`, always included): Anthropic is source of truth (Skilljar → code.claude.com/docs → platform.claude.com/docs → anthropic.com/engineering → modelcontextprotocol.io → exam guide). Use only current material; third-party = leads only; when guide ≠ current docs, teach current and note guide terminology.
- Status: **complete and verified**. User was happy ("This is great").

## Exam facts (from official guide v1.0, July 2026)
60 items · 120 min · 4 of 6 scenarios · single + multiple-response · scaled 100–1000, pass 720. Domains: D1 Agentic Arch 27%, D2 Tool/MCP 18%, D3 Claude Code 20%, D4 Prompt/Structured 20%, D5 Context/Reliability 15%. Scenarios S1 Support agent, S2 Claude Code dev, S3 Multi-agent research, S4 Dev productivity, S5 CI/CD, S6 Data extraction.

## Weak objectives (score report → `prev` in blueprint)
- **0%:** O06 subagent misconfig, O08 plan/direct/multi-phase, O09 state persistence/manifests, O10 orchestration patterns, O13 CI review config, O16 config-mechanism selection, O18 subagent output schemas, O19 synthesis uncertainty, O28 truncation→split.
- **33–67%:** O22 human review routing 33, O04 delegation 50, O29 extraction accuracy 50, O31 incl/excl criteria 50, O33 tool distribution 50, O17 codebase exploration 60, O03 subagent prompts 67. (O23 batch vs sync 75.)
- Weak threshold = <70 (`CCAR.WEAK_THRESHOLD`).

## File map
```
index.html                 # SPA shell; classic <script> tags (no ES modules → works on file://). Script ORDER matters.
css/styles.css             # theme vars, light/dark, diagrams, runner, responsive
js/data/blueprint.js       # CCAR namespace bootstrap (exams/views/lessons), DOMAINS, SCENARIOS, OBJECTIVES (O01–O37 = report, X01–X12 = extra), EXAM_FORMS, addQuestions(), isWeak()
js/core/ui.js              # esc, $, toast, confirm(<dialog>), fmt*, seeded rng + shuffle
js/core/storage.js         # localStorage key 'ccarf.progress.v1': {attempts, qstats, lessonsDone, cards, settings}; export/import/reset
js/core/charts.js          # dependency-free SVG: hbars, radar, line, gauge, diagram(nodes/edges/groups spec)
js/core/engine.js          # qIndex, createAttempt (scenario-grouped, shuffled q + options, stable per attempt), score, submit (updates qstats), mastery; scaled = 100+900*pct (linear approx)
js/data/lessons/lessons-1..4.js  # 15 lessons {id,domain,objs,minutes,title,summary,body()}; weak-objective lessons first
js/data/flashcards.js      # 62 cards {id,obj,q,a}
js/data/exams/examN-SX.js  # 20 files, 15 items each → CCAR.addQuestions('examN',[...])
js/views/*.js              # dashboard(+report), study(+lesson), exams(+CCAR.actions drills), runner, results, misc(history, flashcards, settings)
js/app.js                  # hash router (#/, #/report, #/study, #/lesson/:id, #/exams, #/attempt/:id, #/results/:id, #/history, #/flashcards, #/settings)
tools/validate.js          # `node tools/validate.js [examId]` → schema + coverage stats; must print OK
docs/past-exam-result/scorereport (1).pdf   # original report (text via pypdf)
docs/_ref/exam-guide.txt   # full extracted official exam guide (task statements §6, samples §9)
docs/_ref/facts.md         # verified current-docs facts used for authoring (CLI flags, AgentDefinition, hooks, rules, skills, settings, MCP scopes, Batches)
docs/_ref/question-spec.md # question schema + difficulty/distractor rules + per-exam quotas
```

## Question schema
`{id:'e1-S3-07', scenario, domain, obj, type:'single'|'multi', select, stem(HTML), options[4 | 5–6], answer:[idx], explanation, rationales[per option], trap}`. No "all/none of the above" or letter references (options shuffle at runtime).

## Exam forms (all validate OK; single-answer key positions ≈13 each)
| Form | Scenarios | Domains D1/D2/D3/D4/D5 | weak-obj items |
|---|---|---|---|
| exam1 | S1 S3 S5 S6 | 18/5/8/16/13 | 37 |
| exam2 | S2 S3 S4 S6 | 17/10/12/12/9 | 43 |
| exam3 | S1 S2 S3 S5 | 25/6/12/8/9 | 38 |
| exam4 | S3 S4 S5 S6 | 17/10/12/12/9 | 43 |
| exam5 | S1 S2 S4 S6 | 16/10/11/12/11 | 44 |

## Known gaps / possible next work
- D2 under-weighted in exam1 (5) and exam3 (6); exam3 D1 heavy (25). Could add D2 items or a separate MCP/tools drill form.
- exam3 has only 2 each of O18/O19/O28; exam5 has 2 of O19. exam2 has 7 items where the key is the longest option.
- exam4-S5.js items are stored out of order (01–04, 09–12, 05–08, 13–15); harmless.
- Scaled score is a linear approximation (real exam equates forms) — told user to target ≥80%.
- No Skilljar practice tests were found; all 300 items are original. Possible adds: spaced-repetition scheduling, per-objective trend chart, printable cheat sheet, a 6th mixed form drawn from the pool.

## Gotchas learned
- `CCAR.views`/`CCAR.lessons` must be initialized in blueprint.js (first script) — views files assign into them.
- JS lesson/question strings are single-quoted: escape apostrophes (`\'`). Run `node --check` on every file after edits.
- Headless Edge caches file:// scripts per profile → use a fresh `--user-data-dir` each run. Screenshot: `msedge --headless=new --window-size=1400,1800 --virtual-time-budget=3000 --screenshot=<abs path> file:///...`; wait ~3s before reading the PNG.
- PowerShell prints a noisy `:\WINDOWS\...powershell.exe\` line after commands; ignore.
- Sub-agents writing 60 items in one go returned nothing twice; splitting into 30-item halves written in 5-item chunks (fs_write then fs_append) worked.
- CSS: `.btn.menu-btn` needed higher specificity to hide the mobile menu button on desktop.

## Verify after any change
1. `node tools/validate.js` → `OK`.
2. `Get-ChildItem js -Recurse -Filter *.js | % { node --check $_.FullName }` → no failures.
3. Optional smoke: temp HTML that loads index scripts + a script calling each `CCAR.views[name](main, params)` and a full `createAttempt → submit` cycle; dump DOM via headless Edge; delete temp files after.
