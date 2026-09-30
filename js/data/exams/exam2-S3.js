/* Practice Exam 2 — Scenario S3: Multi-Agent Research System
   Context: market research on EV battery supply chains and semiconductor demand (Claude Agent SDK). */
CCAR.addQuestions('exam2', [
  {
    id: 'e2-S3-01',
    scenario: 'S3',
    domain: 'D1',
    obj: 'O10',
    type: 'single',
    select: 1,
    stem: 'A client wants a report comparing lithium, nickel, and cobalt supply risk across Australia, Indonesia, the DRC, and Chile through 2030. The mineral subtopics can be researched independently. The current design is a fixed sequential pipeline: a single web-search agent researches all 12 mineral–region pairs one after another, then document analysis, synthesis, and report generation run in order. Runs take 3.5 hours, and pairs researched late get visibly shallower coverage as the search agent\'s context fills. Which orchestration change best improves latency and coverage?',
    options: [
      'Keep the sequential pipeline but give the single search agent a larger context window and a higher turn limit, so that late pairs receive the same research depth as early ones.',
      'Have the coordinator partition the work by mineral or mineral–region and spawn parallel search/analysis subagents in one response, then synthesize across them.',
      'Split the job into 12 fully independent end-to-end pipelines, one per mineral–region pair, each producing its own report, and concatenate the 12 reports at the end.',
      'Run three complete copies of the sequential pipeline and keep only the findings that at least two of the three runs agree on before passing them to synthesis.'
    ],
    answer: [1],
    explanation: 'Independent, breadth-first subtopics suit the coordinator-worker pattern with parallel subagents: each worker gets a fresh, focused context (fixing the late-pair degradation), and emitting the Task calls in one response runs them concurrently (fixing latency). The coordinator still aggregates results so synthesis can compare across minerals and regions, which is the point of the report.',
    rationales: [
      'A bigger window does not fix attention dilution in one long context and leaves the 3.5-hour sequential latency unchanged.',
      'Correct. Parallel, partitioned subagents give each subtopic a clean context and cut wall-clock time, with coordinated synthesis.',
      'Fully separate pipelines lose the cross-pair comparison the client asked for and duplicate synthesis and reporting work.',
      'Consensus voting triples cost and suppresses findings that only one run surfaced; it does not address depth or latency.'
    ],
    trap: 'Bigger context window / consensus voting instead of parallel coordinator-worker'
  },
  {
    id: 'e2-S3-02',
    scenario: 'S3',
    domain: 'D1',
    obj: 'O10',
    type: 'single',
    select: 1,
    stem: 'Usage analytics show 38% of queries are single-fact lookups such as "What nameplate cell capacity did CATL report for 2025?" Every query runs through all four subagents (search → document analysis → synthesis → report), averaging 9 minutes and ~180k tokens even for these lookups, and users complain. Complex comparative queries are handled well. What is the best change?',
    options: [
      'Train a pre-classifier on past queries that sends lookups to a separate lightweight single-agent product with its own UI, prompts, and deployment pipeline.',
      'Cache the full pipeline\'s reports and answer any new query from the cache whenever it shares at least three keywords with a query that was answered previously.',
      'Keep the full pipeline for every query, but move the synthesis and report subagents to a smaller model so that each run is cheaper and finishes faster.',
      'Have the coordinator assess each query\'s complexity and invoke only the subagents it needs, e.g. a single search subagent and a direct answer for lookups.'
    ],
    answer: [3],
    explanation: 'A coordinator should analyze query requirements and dynamically choose which subagents to invoke, scaling effort to complexity, rather than routing every query through the full pipeline. A simple fact needs one agent and a handful of tool calls; comparative research justifies several. This keeps one system and puts the decision where the task understanding already lives.',
    rationales: [
      'Over-engineered: a separate classifier and product duplicate what the coordinator can decide with a prompt and delegation change.',
      'Keyword-overlap caching returns wrong answers for different questions sharing terms and does nothing for novel lookups.',
      'Still runs four stages for a one-fact question; a smaller model trims cost but not the unnecessary work.',
      'Correct. Dynamic subagent selection by query complexity removes the wasted stages for simple lookups.'
    ],
    trap: 'Always running the full pipeline vs dynamic subagent selection'
  },
  {
    id: 'e2-S3-03',
    scenario: 'S3',
    domain: 'D1',
    obj: 'O10',
    type: 'single',
    select: 1,
    stem: 'For "Semiconductor demand from EV power electronics, 2025–2030", the synthesis subagent\'s draft covers SiC MOSFET demand in depth but has one sentence on GaN devices and nothing on SiC substrate supply constraints. The search subagents were assigned SiC-device queries in the first round, and every call succeeded. The coordinator then passed the draft straight to the report generator. What orchestration change most directly addresses this?',
    options: [
      'Add a coordinator step that checks the synthesis output against the brief for gaps, re-delegates targeted queries for missing areas, and re-runs synthesis.',
      'Instruct the synthesis subagent to fill any gaps it notices from its own background knowledge, so that drafts are always complete before they reach the report generator.',
      'Raise the search subagents\' result limit from 10 to 40 per query, so that the first round retrieves enough material to cover GaN devices and substrate supply as well.',
      'Have the report generator append a "Limitations" section listing every thin topic, so that readers know which areas the report does not cover in real depth.'
    ],
    answer: [0],
    explanation: 'The coordinator owns coverage: an iterative refinement loop evaluates synthesis output for gaps, re-delegates targeted searches for missing subtopics, and re-invokes synthesis until coverage is sufficient. Nothing failed downstream; the one-pass pipeline simply had no step that compared output against the brief. Filling gaps from model memory or disclosing them does not produce the missing research.',
    rationales: [
      'Correct. A coordinator-driven evaluate → re-delegate → re-synthesize loop closes coverage gaps with real sources.',
      'Unsourced background knowledge breaks the cited-report requirement and hides the gap rather than researching it.',
      'More results for SiC-focused queries still return SiC material; the gap comes from what was asked, not how many results came back.',
      'Coverage annotations are useful when sources are unavailable, but here the gap is fixable by more targeted research.'
    ],
    trap: 'Fixing a coordinator coverage gap downstream'
  },
  {
    id: 'e2-S3-04',
    scenario: 'S3',
    domain: 'D1',
    obj: 'O06',
    type: 'single',
    select: 1,
    stem: 'After a refactor, no subagents are ever spawned. Traces show the coordinator itself issuing ~71 <code>WebSearch</code> calls per run, exhausting its context before synthesis, and producing thinly cited reports.<pre>const run = query({\n  prompt: brief,\n  options: {\n    systemPrompt: COORDINATOR_PROMPT, // "Decompose, delegate to specialists, assemble a cited report"\n    allowedTools: [\'WebSearch\', \'WebFetch\', \'Read\', \'Write\'],\n    agents: {\n      \'web-researcher\': webResearcher,\n      \'doc-analyst\': docAnalyst,\n      \'synthesizer\': synthesizer,\n      \'report-writer\': reportWriter\n    }\n  }\n});</pre>What is the root cause and fix?',
    options: [
      'The four subagent descriptions are too similar for reliable routing; rewrite each <code>description</code> so the coordinator can tell the specialists apart before delegating any work.',
      'The coordinator prompt says "delegate" too vaguely; add explicit instructions that name each subagent and when to spawn it, so the model stops searching itself.',
      '<code>allowedTools</code> lacks <code>"Task"</code>, so the coordinator cannot spawn subagents and researches itself; add <code>"Task"</code>, drop the web tools.',
      'Each entry in <code>agents</code> needs a <code>maxTurns</code> value; without a turn budget the SDK refuses to spawn subagents and runs the work inline instead.'
    ],
    answer: [2],
    explanation: 'Subagents are spawned through the Task tool (named Agent in the current SDK), so a coordinator whose <code>allowedTools</code> omits "Task" cannot delegate at all, however good its prompt or the agent definitions are. Because it was also handed WebSearch and WebFetch, it did the research itself in one ever-growing context. Adding "Task" and removing the research tools restores the hub-and-spoke design.',
    rationales: [
      'Description quality affects which subagent is chosen, but here no delegation happens at all; the spawning tool is missing.',
      'A prompt cannot grant a tool; without Task the instruction to delegate cannot be followed.',
      'Correct. Missing "Task" blocks spawning, and the coordinator\'s own web tools let it do the work inline.',
      '<code>maxTurns</code> is an optional limit; omitting it does not prevent spawning.'
    ],
    trap: 'Prompt or description fix for a missing Task tool permission'
  },
  {
    id: 'e2-S3-05',
    scenario: 'S3',
    domain: 'D1',
    obj: 'O03',
    type: 'single',
    select: 1,
    stem: 'The coordinator spawns the synthesis subagent with this Task prompt: "Synthesize the findings from the web researcher and document analyst into a report on cobalt supply risk. Cite all sources." The synthesis output cites only generic sources ("industry reports") and, in 30% of runs, states figures that appear nowhere in the earlier findings. The web and document subagents\' outputs are complete and correctly cited. What is the most effective fix?',
    options: [
      'Give the synthesis subagent WebSearch and WebFetch so it can re-find the sources the earlier subagents used and cite each of them directly on its own.',
      'Put the earlier subagents\' complete structured findings, with source URLs, document names, pages, and dates, directly into the synthesis Task prompt.',
      'Configure the synthesis subagent to inherit the coordinator\'s conversation history so it can see the earlier tool results without any prompt changes.',
      'Add few-shot examples of well-cited synthesis paragraphs to the synthesis subagent\'s system prompt so that it learns the expected citation style.'
    ],
    answer: [1],
    explanation: 'Subagents start with isolated context: they do not see the coordinator\'s conversation or other subagents\' results unless that content is passed in the Task prompt. The synthesis agent received only a reference to "the findings", so it improvised. Passing the complete findings with source metadata kept separate from content gives it what it needs to synthesize and attribute correctly.',
    rationales: [
      'Duplicates research, lets synthesis wander outside its role, and still may not match the original sources.',
      'Correct. Explicitly passing complete, structured findings with metadata is how context reaches a subagent.',
      'Subagents do not inherit the parent conversation; even fork-style inheritance would drag the whole coordinator transcript in rather than the curated findings.',
      'Citation-style examples cannot help when the agent never received the sources to cite.'
    ],
    trap: 'Assuming subagents inherit parent context'
  },
  {
    id: 'e2-S3-06',
    scenario: 'S3',
    domain: 'D1',
    obj: 'O03',
    type: 'single',
    select: 1,
    stem: 'The document-analysis subagent is spawned with: "Analyze the annual reports found earlier for semiconductor demand signals." In traces it either (a) calls Glob and WebSearch trying to rediscover which reports were "found earlier", re-downloading 11 PDFs the search subagent had already saved to <code>artifacts/filings/</code>, or (b) returns a message asking which companies and fiscal years are in scope, forcing another coordinator round trip. What should the coordinator\'s Task prompt contain?',
    options: [
      'A note that the subagent shares the coordinator\'s workspace memory, plus an instruction to read the coordinator\'s own log file to find the earlier search results.',
      'A shorter goal statement such as "Find semiconductor demand signals", so the subagent is free to choose its own sources and scope without being over-constrained.',
      'The full extracted text of all 11 PDFs pasted into the prompt, so the subagent has everything up front and needs no file access or clarification of any kind.',
      'The saved file paths and source metadata for the 11 reports, the in-scope companies and fiscal years, the questions to answer, and the required output format.'
    ],
    answer: [3],
    explanation: 'A subagent prompt must be self-sufficient: it should carry the specific inputs (here, references to already-saved artifacts with their metadata), the scope, the questions, and the output contract, so the subagent needs neither rediscovery nor a round trip. Passing file references rather than raw content keeps the prompt small and avoids a game of telephone, while metadata preserves attribution.',
    rationales: [
      'Subagents do not share the coordinator\'s memory; pointing at a log file is an indirect, fragile substitute for passing the inputs.',
      'Less context makes both failure modes worse: more rediscovery and more questions about scope.',
      'Pasting 11 full reports floods the subagent\'s context; paths plus metadata let it read selectively.',
      'Correct. Complete references, scope, questions, and output format eliminate rediscovery and clarification round trips.'
    ],
    trap: 'Vague subagent prompt relying on "found earlier"'
  },
  {
    id: 'e2-S3-07',
    scenario: 'S3',
    domain: 'D1',
    obj: 'O04',
    type: 'single',
    select: 1,
    stem: 'The coordinator delegates with long procedural scripts, e.g.: "1. Search \'lithium carbonate price 2025\'. 2. Open the top three results. 3. Copy the price table from each. 4. Search \'lithium hydroxide price 2025\'. 5. …" When top results are paywalled or the price tables are images, subagents follow the script anyway and return empty sections; they never try exchange data or government statistics that would have answered the question. What is the best change to the delegation style?',
    options: [
      'State the goal, the questions to answer, quality criteria (primary or official sources, dated figures), scope boundaries, and the output format, and let subagents choose how.',
      'Extend each script with fallback branches ("if paywalled, open result 4; if the table is an image, try result 5 instead") so that subagents always have a scripted next step.',
      'Remove every instruction except the topic name, so that subagents are fully autonomous and can pursue whichever leads they individually judge to be the most promising.',
      'Keep the scripts, and have the coordinator review each empty section and then send the subagent a new, corrected script for the missing items in a follow-up round.'
    ],
    answer: [0],
    explanation: 'Coordinator prompts should specify research goals and quality criteria rather than step-by-step procedures, so subagents can adapt when a path fails. Keeping explicit questions, scope boundaries, and an output format preserves the coordinator\'s visibility and control. Scripts break on the first unexpected obstacle, and adding branches only anticipates the obstacles someone already thought of.',
    rationales: [
      'Correct. Goal-oriented delegation with quality criteria and boundaries enables adaptivity while keeping control.',
      'Still procedural; every new obstacle needs another branch, and the scripts never reach better source types.',
      'Swings to the opposite failure: no criteria, boundaries, or output format, so results overlap and cannot be compared.',
      'Adds round trips and keeps the brittle procedural style that caused the empty sections.'
    ],
    trap: 'Procedural scripts vs goal-oriented delegation'
  },
  {
    id: 'e2-S3-08',
    scenario: 'S3',
    domain: 'D1',
    obj: 'O04',
    type: 'single',
    select: 1,
    stem: 'After moving to goal-only delegation, the coordinator spawns three parallel subagents with the same one-line prompt: "Research global semiconductor demand from EVs." Their outputs overlap ~60%, all three cover SiC traction inverters, none covers charging infrastructure, and the coordinator cannot tell which sources each consulted. Which delegation prompt for one of the subagents best balances adaptivity with coordinator control?',
    options: [
      '"Research EV semiconductor demand in depth. Be thorough, avoid duplicating the work of the other agents, and report back once you are confident that you have covered everything relevant."',
      '"Step 1: run these 8 queries in order. Step 2: open the first 5 results of each. Step 3: extract every number that has a unit. Step 4: return a table of all numbers found."',
      '"Goal: onboard-charger and DC fast-charger semiconductor demand, 2025–2030 (inverters are assigned elsewhere). Prefer dated primary sources. Return claims with URL, date, excerpt."',
      '"Research EV semiconductor demand from whatever angle you find most interesting and useful, and list all of the sources you used in a bibliography at the end of your answer."'
    ],
    answer: [2],
    explanation: 'Good delegation gives each subagent a distinct objective with explicit boundaries (what is covered elsewhere), quality criteria, and a structured output format, while leaving the search method to the subagent. Distinct partitions prevent duplication and gaps, and the claim-level output restores the coordinator\'s visibility into sources. Neither pure procedure nor unbounded autonomy achieves both.',
    rationales: [
      '"Avoid duplicating other agents" is unenforceable when the agent does not know what the others cover; it has no boundaries or output contract.',
      'Rigid procedure prevents adaptation and extracts numbers without context, dates, or attribution.',
      'Correct. A partitioned goal, explicit boundary, quality criterion, and structured, attributable output format.',
      'No partition and a bibliography-only format: duplication continues and claims cannot be traced to sources.'
    ],
    trap: 'Goal-only prompts without boundaries or output contracts'
  },
  {
    id: 'e2-S3-09',
    scenario: 'S3',
    domain: 'D1',
    obj: 'O09',
    type: 'single',
    select: 1,
    stem: 'A 26-subtask research run on "Battery-grade graphite supply 2026–2032" takes ~4 hours. A container restart at hour 3 killed the coordinator after 19 subtasks had finished. Nothing was persisted, so the rerun repeated all 19 subtasks (~$140 in tokens), and two sources found in the first run were no longer reachable, so those findings were lost. Which design best prevents this?',
    options: [
      'Give the container more memory and add a health check that restarts the coordinator automatically, so interruptions become both shorter and considerably rarer.',
      'Resume the coordinator\'s SDK session after a restart and ask it to continue, relying on its full conversation transcript to recall which of the subtasks were already completed.',
      'Have the coordinator hold every subagent\'s findings in its own context until the end of the run and then write the finished report to disk in a single final step.',
      'Have subagents write findings to a known location and update a subtask manifest; on restart the coordinator loads it, skips finished work, and injects saved findings.'
    ],
    answer: [3],
    explanation: 'Reliable resumption comes from structured state persistence: each agent exports its results to a known location and a manifest records subtask status, so after a crash the coordinator loads the manifest, re-runs only unfinished subtasks, and injects saved findings into later prompts. Findings survive even when sources later disappear. Relying on in-memory or transcript state loses exactly what a crash destroys.',
    rationales: [
      'Reduces how often crashes happen but does nothing to preserve work when one does.',
      'The transcript may be lost with the process or bloated with stale tool results; it is not a reliable, structured record of completed work.',
      'Holding everything in context until the end is the design that lost the findings in the first place.',
      'Correct. Per-agent state exports plus a manifest allow resumption without repeating or losing work.'
    ],
    trap: 'In-context or transcript state instead of persisted manifest'
  },
  {
    id: 'e2-S3-10',
    scenario: 'S3',
    domain: 'D5',
    obj: 'O18',
    type: 'single',
    select: 1,
    stem: 'The web-search subagent returns output in this shape:<pre>{\n  "summary": "string (~300-word overview of findings)",\n  "sources": ["string (URLs consulted)"]\n}</pre>In a review of 20 reports, synthesis attributed figures to the wrong source in 7 (e.g., an IEA 2024 cobalt demand figure cited to a BNEF URL) and could not say which source supported half the claims. What change to the subagent\'s output schema best supports downstream synthesis?',
    options: [
      'A <code>findings</code> array in which each item holds a claim, its supporting excerpt, source URL and title, publisher, publication date, and page or section.',
      'A longer <code>summary</code> of up to 1,000 words with the subagent\'s inline bracketed citations after each sentence, keeping the <code>sources</code> list exactly as it is today.',
      'A <code>confidence</code> score from 1 to 10 attached to the summary so that the synthesis stage can weight well-supported findings above weaker ones when attributing them.',
      'The raw HTML of every page consulted, added under a <code>pages</code> key, so the synthesis stage can verify each attribution against the original page text on its own.'
    ],
    answer: [0],
    explanation: 'Attribution survives multi-stage pipelines only when each claim is structurally bound to its source metadata. A per-claim schema (claim, excerpt, source, publisher, date, location) gives synthesis a claim-source mapping it can preserve and merge, and the date prevents temporal differences being read as conflicts. A prose summary with a detached URL list forces synthesis to guess which source supports which statement.',
    rationales: [
      'Correct. Structured claim-source mappings with dates and locations let synthesis attribute precisely.',
      'Inline prose citations help a little but remain unstructured and are easily lost or garbled when synthesis rewrites text.',
      'Self-reported confidence says nothing about which source supports which claim.',
      'Raw HTML bloats synthesis context and pushes the attribution work downstream instead of structuring it at the source.'
    ],
    trap: 'Prose summary plus detached source list'
  },
  {
    id: 'e2-S3-11',
    scenario: 'S3',
    domain: 'D5',
    obj: 'O18',
    type: 'multi',
    select: 2,
    stem: 'The synthesis subagent regularly exceeds its context budget: each of six research subagents returns 25–40k tokens of full page extracts plus its step-by-step reasoning. When the coordinator trims the input to fit, citations from the trimmed subagents disappear from the report. Which TWO changes best fix this while preserving attribution? (Select 2)',
    options: [
      'Have the coordinator condense each subagent\'s output into one prose paragraph before passing it on, keeping the synthesis input well under budget.',
      'Move the synthesis subagent to a model with a larger context window and raise its max_tokens so the six full outputs always fit in one request.',
      'Have research subagents return structured key facts, each with citation metadata and a relevance score, instead of page extracts and reasoning chains.',
      'Apply a sliding window at synthesis that keeps only the four most recent subagent outputs and drops earlier ones once the budget is reached.',
      'Have research subagents write full extracts to files and return lightweight references (paths plus metadata) that synthesis can read selectively.'
    ],
    answer: [2, 4],
    explanation: 'When downstream agents have limited context budgets, upstream agents should return structured data (key facts, citations, relevance scores) instead of verbose content and reasoning. Storing full artifacts in files and passing references keeps detail available on demand without flooding context. Both changes shrink the input while keeping every claim tied to its source.',
    rationales: [
      'Prose condensation is where claim-source mappings get lost; it reduces tokens by sacrificing attribution.',
      'A bigger window does not address attention dilution or cost, and the outputs will keep growing with more subagents.',
      'Correct. Structured facts with citation metadata are compact and preserve attribution for synthesis.',
      'Dropping whole subagent outputs silently removes findings and their citations, the problem being fixed.',
      'Correct. File artifacts with lightweight references keep full detail accessible without loading it into context.'
    ],
    trap: 'Bigger context or lossy summarization instead of structured, referenced outputs'
  },
  {
    id: 'e2-S3-12',
    scenario: 'S3',
    domain: 'D5',
    obj: 'O19',
    type: 'single',
    select: 1,
    stem: 'For 2030 global cobalt demand, the document-analysis subagent found two credible figures: 280 kt (a government geological survey, base case, published March 2025) and 390 kt (an industry consultancy, high-EV-adoption scenario, published November 2024). The current synthesis output states "Cobalt demand is expected to reach ~335 kt by 2030", citing both sources. What should the synthesis do instead?',
    options: [
      'Report only the more recent 280 kt figure, since newer publications incorporate more current EV sales data and therefore supersede older projections.',
      'Present both figures with their sources, dates, and scenario assumptions in a contested-findings section that explains why the estimates differ.',
      'Keep the 335 kt midpoint as the headline but add a footnote listing both original values, since one number is easier for executive readers to absorb.',
      'Prefer the government survey\'s 280 kt because public agencies are more authoritative than consultancies, and omit the 390 kt figure to avoid confusion.'
    ],
    answer: [1],
    explanation: 'When credible sources conflict, synthesis should preserve both values with attribution and the methodological context that explains the gap (here, base case vs high-adoption scenario), rather than averaging or picking one. A midpoint is a number neither source reported and misrepresents both as agreeing. Structuring the report to separate contested from established findings lets readers see the real uncertainty.',
    rationales: [
      'Recency does not resolve a difference in scenario assumptions; this arbitrarily discards a credible figure.',
      'Correct. Both values, attributed and contextualized, clearly marked as contested.',
      'The midpoint is a fabricated consensus; a footnote does not undo a misleading headline.',
      'Source-type authority is an arbitrary tiebreak here and hides a legitimate alternative scenario.'
    ],
    trap: 'Averaging or picking one value from conflicting credible sources'
  },
  {
    id: 'e2-S3-13',
    scenario: 'S3',
    domain: 'D5',
    obj: 'O19',
    type: 'multi',
    select: 2,
    stem: 'Analysts reviewing the semiconductor-demand reports complain that (1) a 2022 forecast and a 2025 forecast for the same metric are presented as a "contradiction between sources", and (2) claims backed by a single vendor white paper read with the same certainty as claims backed by six independent sources. Which TWO changes address these complaints? (Select 2)',
    options: [
      'Require subagents to record publication and data-collection dates for every claim, and have synthesis account for differences over time before flagging a conflict.',
      'Have synthesis choose, for each metric, the value reported by the majority of sources and omit the minority values so the report is less confusing to read.',
      'Ask each subagent to self-rate its confidence in every claim from 1 to 10 and print claims rated below 7 in italics so readers can gauge certainty.',
      'Structure reports with separate well-established and contested sections, preserving each source\'s own characterization and methodological context.',
      'Drop every claim supported by only a single source, so that each statement remaining in the report is backed by independent corroboration.'
    ],
    answer: [0, 3],
    explanation: 'Temporal differences are not contradictions: requiring publication and collection dates lets synthesis interpret a 2022 vs 2025 forecast correctly. Separating well-established findings from contested or thinly supported ones, while keeping each source\'s characterization, conveys the real strength of the evidence. Majority rules, self-rated confidence, and deletion all distort or hide source-level uncertainty.',
    rationales: [
      'Correct. Dates in structured outputs prevent temporal differences from being misread as conflicts.',
      'Majority voting suppresses legitimate minority findings and hides that the evidence is contested.',
      'Self-reported confidence is poorly calibrated and does not reflect the actual number or quality of sources.',
      'Correct. Explicit established vs contested sections preserve uncertainty and source characterizations.',
      'Deleting single-source claims loses potentially important findings instead of labeling their support level.'
    ],
    trap: 'Majority voting or self-rated confidence instead of dates and contested sections'
  },
  {
    id: 'e2-S3-14',
    scenario: 'S3',
    domain: 'D5',
    obj: 'O19',
    type: 'single',
    select: 1,
    stem: 'The document-analysis subagent\'s prompt says: "When sources disagree, resolve the discrepancy and return the single most defensible value." For Indonesian nickel output it returned 1.8 Mt, silently discarding a 2.2 Mt figure from a different source whose total includes nickel pig iron. The coordinator never learned the sources differed, and the final report stated 1.8 Mt as settled fact. What is the best change?',
    options: [
      'Keep the instruction, but have the subagent log every discarded value to a debug file that engineers can inspect whenever a published report is challenged.',
      'Have the synthesis subagent re-run the searches for every key metric so that it can detect any disagreements that the analysis stage may have hidden.',
      'Have the subagent return all conflicting values, each with attribution and definitional notes plus a conflict flag, and let the coordinator decide how to reconcile.',
      'Tell the subagent to average conflicting values when they differ by under 25% and to report the higher value whenever the difference is larger than that.'
    ],
    answer: [2],
    explanation: 'Document analysis should complete with conflicting values included and explicitly annotated, so the coordinator, which sees the whole research picture, decides how to reconcile before synthesis. Here the "conflict" is definitional (with vs without nickel pig iron), which only surfaces if both values and their definitions travel downstream. Resolving silently at the lowest layer collapses uncertainty that readers needed to see.',
    rationales: [
      'A debug log keeps the conflict out of the pipeline; the report still presents a contested number as settled.',
      'Duplicates research in the wrong agent instead of fixing the layer that discarded the information.',
      'Correct. Annotated conflicts with attribution flow to the coordinator for an informed reconciliation decision.',
      'Arbitrary numeric rules still collapse the conflict and ignore the definitional difference.'
    ],
    trap: 'Resolving conflicts silently at the analysis layer'
  },
  {
    id: 'e2-S3-15',
    scenario: 'S3',
    domain: 'D2',
    obj: 'O33',
    type: 'single',
    select: 1,
    stem: 'The report-generation subagent was given the full tool set "for flexibility": WebSearch, WebFetch, Read, Write, Bash, and 9 MCP market-data tools. Audits show that in 22% of reports it ran fresh searches while formatting and inserted new statistics that never passed through analysis or synthesis, so they have no claim-source mapping and no conflict review. What is the best fix?',
    options: [
      'Add a system-prompt rule for the report subagent: "Never add new facts; use only the synthesis output provided to you in this prompt."',
      'Add a post-processing step that deletes any statistic in the final report that lacks a citation, so that uncited additions never reach clients.',
      'Keep the tools but require the report subagent to cite every new statistic it adds with a source URL, so that its additions are as traceable as the rest of the report.',
      'Limit the report subagent to the tools its role needs (Read and Write for the synthesis artifact and output) and route new research needs through the coordinator.'
    ],
    answer: [3],
    explanation: 'Each subagent should get only the tools its role requires; agents holding tools outside their specialization tend to use them, as the report writer did with search. Removing research tools makes the unwanted behavior impossible and keeps any genuine new research need flowing through the coordinator, where it goes through analysis, synthesis, and provenance tracking.',
    rationales: [
      'A prompt rule is probabilistic while the tools remain available, so some reports will still gain unvetted facts.',
      'Treats the symptom after the fact and could delete legitimately cited statistics that lost a marker in formatting.',
      'Citations alone skip the analysis and conflict-handling stages; the role boundary is still violated.',
      'Correct. Least-privilege tooling for the report role, with research routed through the coordinator.'
    ],
    trap: 'Giving an agent all tools "for flexibility"'
  }
]);
