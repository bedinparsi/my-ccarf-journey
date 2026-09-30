# CCAR-F practice question authoring spec

## Goal
Write HARD, realistic, scenario-based items that mimic the real CCAR-F exam (see sample questions in docs/_ref/exam-guide.txt section 9). The candidate already scored 656/1000 (pass = 720). Items must be harder than the sample questions, never trivia.

## Output format (JavaScript, classic script — no ES modules, no imports)
Each file calls `CCAR.addQuestions('<examId>', [ ... ]);` exactly once. Example:

```js
CCAR.addQuestions('exam1', [
  {
    id: 'e1-s1-01',            // e<exam#>-<scenario>-<2-digit index>
    scenario: 'S1',            // one of S1..S6
    domain: 'D1',              // D1..D5 (the domain the item actually tests)
    obj: 'O06',                // objective id from js/data/blueprint.js (O01..O37, X01..X12)
    type: 'single',            // 'single' or 'multi'
    select: 1,                 // number of correct answers; 'multi' items use 2 (occasionally 3)
    stem: 'Question text. May use <code>inline code</code> and <pre>code blocks</pre>.',
    options: ['...', '...', '...', '...'],   // single: exactly 4 options; multi: 5 options (select 2) or 6 (select 3)
    answer: [2],               // zero-based indices of correct options
    explanation: 'Why the correct answer is correct and the underlying principle (2-4 sentences).',
    rationales: ['Why option 0 is wrong/right', '...', '...', '...'], // one per option, same order
    trap: 'Short label of the distractor pattern this item tests, e.g. "Prompt fix for a deterministic requirement"'
  }
]);
```

Rules for the JS:
- Use single-quoted JS strings; escape any apostrophes as `\'`, or use double-quoted strings consistently. Must parse with `node --check`.
- HTML allowed in stem/options/explanations: `<code>`, `<pre>`, `<b>`, `<br>`. Escape `<` and `>` in code as `&lt;` `&gt;` when they are literal characters (e.g., generics, arrows).
- NEVER write options like "Both A and B", "All of the above", "None of the above", or refer to options by letter — options are shuffled at runtime.
- Options must be similar in length and specificity. The correct option must NOT be systematically the longest. Distractors must be plausible to a practitioner.

## Difficulty requirements (every item)
- Grounded in a concrete production situation with specifics (numbers, logs, config snippets, error messages, file names).
- Tests judgment/tradeoffs, root-cause diagnosis, or "best FIRST step" / "MOST effective" choices — not definitions.
- At least 2 distractors must be things a competent engineer might actually do. Use these distractor patterns:
  - probabilistic fix (prompt/CLAUDE.md/few-shot) for a deterministic requirement (and the reverse: over-engineering when a prompt/description fix is the proportionate first step)
  - right idea at the wrong layer (fix the downstream agent when the coordinator decomposition is the root cause)
  - "bigger model / bigger context window / raise max_tokens" non-fixes
  - self-reported confidence or sentiment as routing signals
  - consensus voting that suppresses intermittent true positives
  - silent error suppression or whole-workflow termination
  - giving an agent all tools "for flexibility"
  - batch API for blocking workflows
  - user-level config for team-wide needs (or project-level for personal experiments)
  - non-existent flags/features (use sparingly: max 1 per 5 items), e.g. `--batch`, `CLAUDE_HEADLESS`, `.claude/config.json`
- ~20% of items are code/config reading: show a snippet (AgentDefinition, .mcp.json, SKILL.md frontmatter, settings.json hooks/permissions, .claude/rules frontmatter, CLI invocation, JSON schema, tool result) and ask what is wrong / what happens / what to change.
- Include "select 2" multi-response items: ~8 per 60-item exam (2 per scenario). Both correct answers must be independently necessary/valid; distractors must be tempting.
- Some items should be "which is the root cause" given logs; some "which change is most effective"; some "which design best satisfies constraints X, Y, Z"; some "what is the most likely outcome of this configuration".

## Coverage and weighting (per 60-item exam)
- 4 scenarios × 15 items.
- Domain totals across the exam approximately: D1 16, D2 11, D3 12, D4 12, D5 9 (±2).
- WEAK objectives from the candidate's report MUST be emphasized. Across the exam, ~40% of items (≈24) target weak objectives:
  - 0% objectives, at least 3 items each when the exam's scenarios support them: O06, O08, O09, O10, O13, O16, O18, O19, O28
  - 33–67% objectives, at least 2 items each when scenarios support them: O03, O04, O17, O22, O29, O31, O33 (and O23 at 75%: at least 1)
- Remaining items spread across the other objectives (O01–O37, X01–X12) so every scenario-relevant objective gets ≥1 item across the exam where possible.
- Scenario → objective fit guide:
  - S1 Support: X01 X02 X03 X04 X05 O03 O04 O06 O10 O21 O33 O36 O37 O22 O09
  - S2 Claude Code dev: O08 O16 X07 X12 O14 O12 O02 O17 O32 O20 O21 O13
  - S3 Research: O10 O06 O03 O04 O01 O09 O18 O19 X10 X06 O33 O07 O36 O34 O21
  - S4 Dev productivity: O17 O32 O06 O33 O09 O20 O16 O08 O35 O34 O36 O02 O07 O05
  - S5 CI/CD: O11 O13 O15 O28 O31 O30 O24 X11 O23 O16 O08 X08 O12
  - S6 Extraction: O25 O26 O27 O28 O29 O22 O23 X08 X09 O31 O21 O18

## Correctness
- Follow docs/_ref/facts.md and the exam guide. Where they differ, follow the exam-guide framing (e.g., Task tool, allowedTools must include "Task").
- The keyed answer must be unambiguously best according to the exam guide's principles. Explanations should state the principle and briefly why each distractor fails (rationales array).
- Do not copy the exam guide sample questions; write new ones. Vary company/product contexts inside each scenario so items don't feel repetitive.
