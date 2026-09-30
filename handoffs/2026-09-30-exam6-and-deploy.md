# Handoff: session 3 (2026-09-30): GitHub, Vercel, Practice Exam 6

Read after `handoffs/2026-09-29-architect-handbook.md` (still the main project handoff).

## Repository and deployment
- Git repo on `main`, remote `origin` = https://github.com/bedinparsi/my-ccarf-journey (public). First commit pushed on top of GitHub's initial README/.gitignore commit.
- `docs/past-exam-result/` is gitignored on purpose: the score report PDF has the candidate ID and registration number. Keep it out of the public repo.
- Vercel project `bedinparsis-projects/my-ccarf-journey`, production URL https://my-ccarf-journey.vercel.app, connected to the GitHub repo, so every push to `main` deploys production. `.vercelignore` is an allowlist (`/*`, `!index.html`, `!css`, `!js`): a new top-level folder needs its own `!folder` line or it will not deploy.
- Browser progress is per origin: the file:// copy and the Vercel site keep separate localStorage (use Export/Import in Progress & settings).

## Practice Exam 6 (long-scenario simulation)
- Form `exam6` in `CCAR.EXAM_FORMS`: S2, S3, S5, S6; 60 items; D1 17, D2 11, D3 12, D4 11, D5 9; 8 select-2 items; 38 weak-objective items; all 30 task statements touched. `minStemWords: 120` (prose words outside `<pre>`); stems average about 172 prose words, roughly three times the older forms.
- Files: `js/data/exams/exam6-S2a.js` ... `exam6-S6b.js` (8 parts, items 01-08 and 09-15 per scenario). Spec and item plan: `docs/_ref/exam6-spec.md`.
- New optional item field `signals` ("Decisive: ... Noise: ..."), rendered as "Reading the scenario" in instant feedback (runner.js) and results review (results.js).
- `tools/validate.js`: new `--file <path>` mode and long-form checks for forms with `minStemWords` (signals, explanation length, rationale length, no em dashes, plain-text trap, id pattern), plus stem-length stats and a warning when the keyed option is the longest in more than 30% of single items.
- tool_choice items (e6-S6-06, e6-S6-12) state Haiku 4.5 in the stem so the exam answer also matches current docs.

## Gotchas from this session
- Parallel `general-task-execution` sub-agents mostly returned nothing or timed out (only 3 of 15 attempts produced a file). Writing items directly, one item per `fs_write`/`fs_append` call, was reliable; a whole file in one call exceeds the output limit.
- `Start-Process msedge` fails when `-RedirectStandardError` is used (no shell execute); run it without redirection.
- The keyed option drifts toward being the longest; check with a quick length script and shorten the key or lengthen a distractor.

## Verify after any change
`node tools/validate.js` (OK), `node tools/check-lessons.js` (OK), `node tools/audit-coverage.js` (ALL BULLET KEYWORDS PRESENT), `node --check` on every js file.
