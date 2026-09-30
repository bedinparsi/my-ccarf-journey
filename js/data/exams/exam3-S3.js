/* Practice Exam 3 — Scenario S3: Multi-Agent Research System
   Contexts: AI regulation research (EU AI Act, US state AI laws) and climate adaptation policy research.
   Note: regulatory facts in stems are framed as findings of a research run, not as legal statements. */
CCAR.addQuestions('exam3', [
  {
    id: 'e3-S3-01',
    scenario: 'S3',
    domain: 'D1',
    obj: 'O10',
    type: 'single',
    select: 1,
    stem: 'A policy-analytics firm asks the research system: "Compare how the EU AI Act, Colorado\'s AI Act, and Texas\'s AI law treat automated hiring decisions: scope, deployer obligations, enforcement." The coordinator currently runs search → document analysis → synthesis for the EU, then repeats the chain for Colorado, then Texas, before a single report. Runs take 41 minutes; the three jurisdictions share no intermediate dependencies. The client wants under 15 minutes, and token spend per report must stay within 1.5× today\'s. Which orchestration best fits?',
    options: [
      'Keep the per-jurisdiction chains in order but switch the search and document-analysis subagents to haiku, so every stage of each chain finishes faster.',
      'Spawn one research subagent per jurisdiction in a single coordinator turn, each scoped to its law and hiring, then run synthesis once on all three.',
      'Give a single subagent all the search and analysis tools and have it cover the three jurisdictions in turn, so it can cross-reference them as it goes.',
      'Spawn twelve subagents in parallel, four per jurisdiction (definitions, obligations, enforcement, timelines), to maximize both parallelism and depth.'
    ],
    answer: [1],
    explanation: 'Independent subtopics should be researched in parallel by emitting multiple Task calls in one coordinator response, each with a distinct scope to avoid duplication, followed by one synthesis pass. For a three-way comparison, a few scoped subagents give the latency gain at roughly the same token cost as the sequential chains.',
    rationales: [
      'Faster models shorten each stage, but the chains still run sequentially without any dependency reason, and analysis quality may drop.',
      'Correct. Parallel, jurisdiction-scoped subagents cut latency to the slowest branch while keeping token spend similar.',
      'One agent covering everything sequentially keeps the latency problem and concentrates all tools and context in one place.',
      'Twelve agents overlap heavily (definitions and obligations sit in the same statutory text) and multiply token spend well past the 1.5× cap.'
    ],
    trap: 'Sequential pipeline for independent subtopics / over-decomposition'
  },
  {
    id: 'e3-S3-02',
    scenario: 'S3',
    domain: 'D1',
    obj: 'O06',
    type: 'single',
    select: 1,
    stem: 'The coordinator delegates to <code>web-researcher</code> as expected, but every web-researcher result cites only the seed URLs given in its Task prompt. Transcripts show no search calls, and results end with "Unable to discover additional sources." Coverage of US state AI laws is limited to the three seed pages.<pre>options: {\n  allowedTools: ["Task", "Read", "Write"],\n  agents: {\n    "web-researcher": {\n      description: "Finds and reads current primary and secondary sources on AI regulation and climate adaptation policy",\n      prompt: "You search the web for sources relevant to the assigned subtopic...",\n      tools: ["WebFetch", "Read", "Write"],\n      model: "sonnet"\n    },\n    "doc-analyst": { /* ... */ }\n  }\n}</pre>What is the root cause?',
    options: [
      'The coordinator\'s allowedTools must also list WebSearch, because a subagent can only use the tools that the coordinator itself is allowed to use.',
      'The description is too broad, so the coordinator is sending document-analysis work to web-researcher when doc-analyst should be handling it.',
      'Subagents set to model "sonnet" cannot use web tools; the model must be "inherit" so the subagent gets the coordinator\'s web capabilities.',
      'web-researcher\'s tools list omits WebSearch, so it can only fetch the URLs it is handed; adding WebSearch to its tools fixes the gap.'
    ],
    answer: [3],
    explanation: 'A subagent\'s tools field defines what it can use. With WebFetch but no WebSearch, the subagent can open URLs it is given but cannot discover new ones, which matches the transcripts exactly. Delegation itself works because "Task" is in the coordinator\'s allowedTools.',
    rationales: [
      'Subagent tool access is set in its own definition; there is no rule that the coordinator must hold every subagent tool.',
      'The subagent is doing web research, just without search; misrouting would show document-analysis tasks, not missing searches.',
      'There is no model-based restriction on web tools; the model setting does not explain missing search calls.',
      'Correct. The missing WebSearch tool in the subagent definition is exactly what prevents source discovery.'
    ],
    trap: 'Subagent tools list omits a required tool'
  },
  {
    id: 'e3-S3-03',
    scenario: 'S3',
    domain: 'D5',
    obj: 'O18',
    type: 'single',
    select: 1,
    stem: 'For a report on national climate adaptation plans, <code>doc-analyst</code> returns a 3–5 page prose summary for each of 14 plans. The synthesis subagent has a tight context budget. Reviewers found three problems: synthesis attributed a coastal-defense figure to the wrong country; it presented modeled cost estimates as committed funding; and it omitted most figures from plans in the middle of its input. How should doc-analyst\'s output be redesigned?',
    options: [
      'Return claim objects (statement, value, unit, claim type, document, page, publication date, excerpt) plus a short context summary per plan.',
      'Shorten doc-analyst\'s prose summaries to one paragraph per plan so that all fourteen fit comfortably within the synthesis agent\'s context budget.',
      'Switch the synthesis agent to a model with a larger context window, so the full prose summaries for all fourteen plans can be read in a single pass.',
      'Return the complete text of each plan\'s relevant chapters, so synthesis can extract the figures itself directly from the source without any loss.'
    ],
    answer: [0],
    explanation: 'When downstream agents have limited context, upstream agents should return structured data (key facts, citations, metadata) rather than verbose prose. Per-claim fields for source, page, and claim type (commitment vs estimate) fix misattribution and type confusion, and compact records reduce the lost-in-the-middle omissions caused by long inputs.',
    rationales: [
      'Correct. Structured claims with type and provenance metadata give synthesis compact, unambiguous inputs.',
      'Shorter prose compresses away exactly the attribution and claim-type distinctions that are being lost.',
      'A larger context window does not fix missing structure, and long inputs still suffer from position effects.',
      'Raw chapters make the context problem worse and push extraction work onto the agent with the smallest budget.'
    ],
    trap: 'Bigger context window / shorter prose instead of structured output'
  },
  {
    id: 'e3-S3-04',
    scenario: 'S3',
    domain: 'D5',
    obj: 'O19',
    type: 'single',
    select: 1,
    stem: 'In a run on EU AI Act compliance costs for SMEs, the document-analysis findings include two per-system cost estimates for high-risk AI systems: Source A, an official impact-assessment study (2021), which excludes setting up a quality-management system; and Source B, an industry-association survey (2024), whose figure is about four times higher and includes that setup. The draft report states a single "estimated compliance cost" equal to the midpoint. The client uses the report to brief legislators. How should synthesis handle this?',
    options: [
      'Report Source A\'s figure as the finding, since an official impact assessment is the most authoritative source, and cite Source B in a footnote.',
      'Keep the midpoint as the central figure, but show the full range in parentheses so that readers can see the spread between the two estimates.',
      'Put both estimates in a contested-findings section with each source\'s method, scope, and date, kept apart from the well-established findings.',
      'Have synthesis re-delegate searches until a third independent estimate is found, then report whichever figure the majority of sources supports.'
    ],
    answer: [2],
    explanation: 'Conflicting figures from credible sources should be preserved with attribution and methodological context rather than collapsed. Here the difference is largely explained by scope (quality-management setup included or not), which readers need to see. Separating contested from established findings keeps the report honest about uncertainty.',
    rationales: [
      'Picking one source by authority hides a credible alternative and the scope difference that explains the gap.',
      'A midpoint of two differently scoped estimates is a number neither source supports, and it erases the methodological context.',
      'Correct. Presenting both with source, method, scope, and date preserves source-level uncertainty for the reader.',
      'Majority voting treats the question as a tally and may still discard the better-scoped estimate; conflicts should be annotated, not outvoted.'
    ],
    trap: 'Collapsing conflicting findings into one number'
  },
  {
    id: 'e3-S3-05',
    scenario: 'S3',
    domain: 'D1',
    obj: 'O01',
    type: 'single',
    select: 1,
    stem: 'The coordinator\'s plan for a US state AI law survey reads: "Step 1: research Colorado. Step 2: using the Colorado findings, scope the Illinois search. Step 3: using those findings, scope California..." for five states. Each subtask\'s scope is actually fixed in advance (the state\'s statute and the employment-decision use case). Logs show the coordinator emits one Task call per turn and waits for each result, so a run takes about 20 minutes (five subagents × about 4 minutes). What is the most effective change?',
    options: [
      'Submit the five state research tasks through the Message Batches API, so they are all processed concurrently instead of one after another.',
      'Rewrite the plan so the five state subtasks are independent, and have the coordinator emit all five Task calls in a single response.',
      'Raise the coordinator\'s maxTurns so it has enough turns to finish all five sequential delegations before it reaches the turn limit.',
      'Launch five separate query() calls from application code, each with its own coordinator, and concatenate their final reports at the end.'
    ],
    answer: [1],
    explanation: 'Parallel subagent execution happens when the coordinator emits multiple Task calls in one response. Here the plan creates false dependencies between subtasks whose scope is already fixed, so the coordinator serializes them. Removing those dependencies and instructing parallel emission cuts the run to roughly the slowest subagent.',
    rationales: [
      'The Batches API has up to a 24-hour window, no latency guarantee, and no multi-turn tool use within a request, so it does not suit agentic subagent runs.',
      'Correct. Independent subtasks plus multiple Task calls in one response give true parallel execution.',
      'More turns let the sequential run finish but do nothing to reduce its latency.',
      'Separate coordinators lose the shared plan, cross-state synthesis, and consistent error handling of a single hub.'
    ],
    trap: 'False dependencies forcing serial delegation'
  },
  {
    id: 'e3-S3-06',
    scenario: 'S3',
    domain: 'D5',
    obj: 'X10',
    type: 'single',
    select: 1,
    stem: 'A report on US state AI laws contains: "Sources conflict on when Colorado\'s AI Act takes effect: February 1, 2026 (Source 3) vs June 30, 2026 (Source 7)." A reviewer notes this is not a conflict: Source 3 is a 2024 law-firm brief and Source 7 is a late-2025 article reporting that the legislature postponed the date. The web-researcher\'s claim records contain <code>claim</code>, <code>source_url</code>, and <code>excerpt</code> only. Which change best prevents this class of error?',
    options: [
      'Instruct the synthesis agent to prefer whichever source ranked higher in the original search results whenever two sources give different dates.',
      'Add a verification subagent that runs three fresh searches and reports the date that most of the retrieved sources agree on for the effective date.',
      'Have the synthesis agent drop any date claims that conflict and state only that the law "takes effect in 2026," so the report avoids stating an error.',
      'Require each claim record to include the source\'s publication date and the as-of date of the fact, so synthesis can recognize a later amendment.'
    ],
    answer: [3],
    explanation: 'Without publication or as-of dates, synthesis cannot tell a temporal change (an amendment) from a genuine contradiction. Requiring dates in the structured claim records lets downstream agents order the claims correctly and report the current date along with the history.',
    rationales: [
      'Search rank reflects relevance and popularity, not recency or correctness of a legal date.',
      'Voting can favor the stale date, since older sources often outnumber reports of a recent amendment.',
      'Dropping the claim discards a precise, verifiable fact that clients need and hides the amendment history.',
      'Correct. Dated claim records let synthesis interpret temporal differences rather than mislabel them as conflicts.'
    ],
    trap: 'Temporal change misread as contradiction'
  },
  {
    id: 'e3-S3-07',
    scenario: 'S3',
    domain: 'D1',
    obj: 'O03',
    type: 'single',
    select: 1,
    stem: 'After web-researcher and doc-analyst finish work on state rules for automated hiring tools, the coordinator spawns the synthesis subagent with a prompt containing a six-paragraph prose recap, for example: "Several jurisdictions, including Colorado, Illinois and New York City, regulate automated hiring tools; bias audits are required in some cases..." The final report reads well, but the citation step can attribute only 22% of its claims, and two claims mix up which jurisdiction requires bias audits. What is the most effective fix?',
    options: [
      'Pass each finding as a structured record (claim, excerpt, source URL or document, section, publication date) rather than as a prose recap.',
      'Give the synthesis agent WebSearch, so it can look up sources for the claims in the coordinator\'s recap before writing each section of the report.',
      'Ask the coordinator to write a longer, more detailed prose recap that mentions the name of the source wherever it summarizes a specific finding.',
      'Move all citation work to the report generator, instructing it to find and add a source for every paragraph once synthesis has been completed.'
    ],
    answer: [0],
    explanation: 'Attribution is lost when findings are compressed into prose without claim-source mappings. The coordinator must pass complete findings from prior agents in a structured format that separates content from metadata (URLs, document names, sections, dates), so synthesis can preserve and merge those mappings.',
    rationales: [
      'Correct. Structured claim-source records carry attribution through synthesis and prevent jurisdiction mix-ups.',
      'Re-searching during synthesis is cross-role tool misuse, adds latency, and may attach different sources than the ones actually analyzed.',
      'Longer prose still blends claims across sources and leaves attribution to inference.',
      'Adding citations after the fact is reverse-engineering attribution; the original mappings have already been lost.'
    ],
    trap: 'Prose recap strips provenance'
  },
  {
    id: 'e3-S3-08',
    scenario: 'S3',
    domain: 'D1',
    obj: 'O04',
    type: 'single',
    select: 1,
    stem: 'For a report on adaptation finance for developing countries, the coordinator instructs web-researcher: "Search \'climate adaptation funding 2025\'. Open the top 5 results. Extract every dollar figure. Return them as a list." Results are dominated by press releases and blogs that repeat one figure; two top results were paywalled, so the subagent returned three figures; and no primary sources (multilateral fund reports, national plans) appear. How should the delegation be rewritten?',
    options: [
      'Expand the procedure to three fixed queries and the top ten results each, so more sources are captured even when several of the pages are paywalled.',
      'Replace the prompt with "Research climate adaptation funding thoroughly" so the subagent is free to decide the scope, the sources, and the format.',
      'State the question, source criteria (primary, dated within 24 months), subtopic boundaries, and output format; leave query choice to the subagent.',
      'Hard-code twelve trusted URLs in the prompt and instruct the subagent to extract funding figures from those pages only, ignoring other results.'
    ],
    answer: [2],
    explanation: 'Goal-oriented delegation specifies the research objective, quality criteria, scope boundaries, and output format, and lets the subagent adapt its queries when results are poor or paywalled. This fixes the failures of the rigid procedure without losing the structure the coordinator needs.',
    rationales: [
      'More fixed queries and results scale the same rigid procedure; it still cannot react to low-quality or duplicated sources.',
      'An open-ended prompt drops the quality criteria, boundaries, and output format, inviting duplication and unusable results.',
      'Correct. Goals plus quality criteria plus boundaries plus output format enable adaptive, high-quality research.',
      'A fixed URL list prevents discovery of newer or better primary sources and goes stale quickly.'
    ],
    trap: 'Procedural search script vs goal plus quality criteria'
  },
  {
    id: 'e3-S3-09',
    scenario: 'S3',
    domain: 'D1',
    obj: 'O09',
    type: 'single',
    select: 1,
    stem: 'A three-hour research run crashed. Each subagent writes its findings to a file, and the coordinator maintains this manifest:<pre>{\n  "run_id": "rr-2291",\n  "topic": "US state AI laws: automated employment decisions",\n  "subtasks": [\n    { "id": "co",  "status": "done",        "artifact": "findings/co.json" },\n    { "id": "il",  "status": "done",        "artifact": "findings/il.json" },\n    { "id": "nyc", "status": "in_progress", "artifact": null },\n    { "id": "tx",  "status": "pending",     "artifact": null }\n  ],\n  "synthesis": { "status": "pending" }\n}</pre>Which resume behavior best avoids both repeated work and lost findings?',
    options: [
      'Start the coordinator from its original prompt and add a note asking it to check the findings/ folder for any work that might already be done.',
      'Restart every subtask from scratch, since in-progress work may be inconsistent, and overwrite the artifacts so the report reflects one clean run.',
      'Skip co and il, re-run nyc and tx, and pass synthesis only the nyc and tx results, since co and il were already summarized before the crash.',
      'Load the manifest, skip co and il, re-spawn nyc and tx, then pass synthesis the co and il artifacts together with the new nyc and tx results.'
    ],
    answer: [3],
    explanation: 'Crash recovery should be driven by structured state: the coordinator loads the manifest on resume, skips completed subtasks, re-runs incomplete ones, and injects all persisted findings into downstream prompts. This avoids repeating the two finished subtasks while ensuring synthesis still receives their results.',
    rationales: [
      'Asking the model to look around is probabilistic; the manifest already states exactly what is done and what is not.',
      'Restarting everything throws away two hours of valid work that is already persisted.',
      'Leaving out co and il loses completed findings; a pre-crash summary is not in synthesis\'s context after restart.',
      'Correct. Manifest-driven resume skips done work, redoes incomplete work, and injects every artifact downstream.'
    ],
    trap: 'Resuming without injecting persisted findings'
  },
  {
    id: 'e3-S3-10',
    scenario: 'S3',
    domain: 'D5',
    obj: 'X06',
    type: 'single',
    select: 1,
    stem: 'doc-analyst was assigned nine state statutes. Seven analyses succeeded; one PDF timed out once, and another returned HTTP 403 (paywalled legislative database). doc-analyst returned only:<pre>{ "status": "error", "message": "analysis failed" }</pre>The coordinator then terminated the run and the client received nothing. Which redesign is most appropriate?',
    options: [
      'Have doc-analyst return the seven successful analyses as a complete result and leave out the two failures, so that the run can finish cleanly.',
      'Retry the timeout locally, then return the seven analyses plus per-source errors (type, URL, attempts, retryable, alternatives).',
      'Keep the generic error, but have the coordinator retry the entire doc-analyst task up to three times before it terminates the whole run.',
      'Treat both failures as valid empty results (no relevant provisions found), so synthesis can report that those two states have no applicable rules.'
    ],
    answer: [1],
    explanation: 'Subagents should recover locally from transient failures and propagate only what they cannot resolve, with structured context (failure type, what was attempted, partial results, alternatives). The coordinator can then decide how to recover (for example, try an official alternative source) and synthesis can annotate the coverage gap instead of the run failing outright.',
    rationales: [
      'Silently omitting failures makes the report appear complete when two states were never analyzed.',
      'Correct. Local retry plus partial results and structured error context enable coordinator recovery and honest coverage annotations.',
      'Retrying the whole task wastes seven successful analyses, will not fix a 403, and still ends by terminating the workflow.',
      'Reporting access failures as empty results turns missing data into a false finding that those states have no rules.'
    ],
    trap: 'Silent suppression or whole-workflow termination'
  },
  {
    id: 'e3-S3-11',
    scenario: 'S3',
    domain: 'D2',
    obj: 'O33',
    type: 'single',
    select: 1,
    stem: 'To "avoid dead ends," the synthesis subagent was given WebSearch and WebFetch. On climate adaptation reports it now averages 34 searches per run, synthesis time has tripled, and 12% of the final claims come from pages no research subagent analyzed and that the citation step cannot verify. Legitimately, synthesis needs to double-check a few specific facts (for example, a date or a figure) in about 30% of runs. Which change is best?',
    options: [
      'Remove web tools from synthesis, give it a narrow verify_claim tool for spot checks, and send real gaps back to the coordinator to re-delegate.',
      'Keep the web tools, but add a prompt rule that limits synthesis to five searches per report and requires a citation for every new claim it adds.',
      'Remove every tool from synthesis, including verification, and require it to flag every uncertain fact inline in the report text for the readers.',
      'Give synthesis the full web-researcher tool set plus the Task tool, so it can spawn its own researchers whenever it notices a gap in the findings.'
    ],
    answer: [0],
    explanation: 'Agents given tools outside their specialization tend to misuse them; a synthesis agent running open-ended searches is the classic example. Scoping synthesis to its role, with a constrained cross-role verification tool for the frequent simple case, and routing substantive gaps through the coordinator preserves observability and research quality.',
    rationales: [
      'Correct. Role-scoped tools plus a narrow verify tool meet the real need while complex gaps go back through the coordinator.',
      'A prompt limit is probabilistic and still lets synthesis introduce unanalyzed sources.',
      'Removing verification entirely forces round-trips or weak hedging for simple checks that a scoped tool handles well.',
      'Letting synthesis spawn its own researchers bypasses the coordinator\'s hub-and-spoke control and widens the misuse.'
    ],
    trap: 'Tools outside the agent\'s specialization'
  },
  {
    id: 'e3-S3-12',
    scenario: 'S3',
    domain: 'D5',
    obj: 'O18',
    type: 'multi',
    select: 2,
    stem: 'Reviewers of a report on sea-level-rise adaptation spending found two defects: (1) synthesis combined a 2019 municipal budget figure and a 2025 figure into one "current annual spend," and (2) after synthesis, many statements could no longer be traced to the source they came from. You are redesigning the web-researcher output schema that feeds synthesis. <b>Which TWO additions most directly address these defects?</b>',
    options: [
      'A self-reported confidence score from 1 to 10 on each claim, so synthesis can drop any claim scored below 6.',
      'A free-text notes field where the subagent can describe anything else it noticed about the sources it used.',
      'Publication date and data-collection period on each claim, so figures from different years are not merged.',
      'A per-claim source mapping (URL or document, section, verbatim excerpt) that synthesis must carry through.',
      'A polished summary paragraph per subtopic in the report\'s style, so synthesis can paste it in directly.'
    ],
    answer: [2, 3],
    explanation: 'Temporal metadata (publication date and collection period) lets synthesis recognize that figures describe different years instead of treating them as concurrent. Structured claim-source mappings with excerpts give synthesis something to preserve and merge, so attribution survives into the final report.',
    rationales: [
      'Self-reported confidence is poorly calibrated and addresses neither the date mixing nor the lost attribution.',
      'Unstructured notes are not reliably consumed downstream and do not enforce dates or mappings.',
      'Correct. Dates on each claim prevent temporal differences from being merged or misread.',
      'Correct. Claim-source mappings are what synthesis must preserve to keep statements traceable.',
      'Pre-written prose encourages copy-through without mappings, reproducing the attribution loss.'
    ],
    trap: 'Self-reported confidence and prose in place of metadata'
  },
  {
    id: 'e3-S3-13',
    scenario: 'S3',
    domain: 'D1',
    obj: 'O07',
    type: 'single',
    select: 1,
    stem: 'Researching "climate adaptation policy in US coastal cities," the coordinator planned four regional subtasks (Northeast, Southeast, Gulf, West Coast). Two regional subagents independently report that a federal hazard-mitigation grant program several cities relied on was cancelled and is now being litigated, and that city plans in their regions are being re-sequenced around it. The plan has no subtask on federal funding, and the Gulf and West Coast subagents have not started. What should the coordinator do?',
    options: [
      'Complete the four regional subtasks as planned and add a limitations note to the report stating that federal funding changes were out of scope.',
      'Instruct all four regional subagents to also research the federal grant changes, so each region\'s findings include the full funding context.',
      'Discard the findings gathered so far and restart the run with a new plan that uses federal funding as the primary organizing dimension.',
      'Add a federal-funding subtask for one subagent, then pass its findings into the regional subtasks that still need to account for them.'
    ],
    answer: [3],
    explanation: 'Open-ended research benefits from dynamic decomposition that adapts as findings emerge. A cross-cutting discovery warrants a new dedicated subtask, and its results should flow into the regional work that has not yet run, avoiding both a coverage gap and four-way duplicated research.',
    rationales: [
      'Sticking to the original plan knowingly leaves out a factor that is driving the decisions the report is meant to explain.',
      'Having four agents research the same federal topic duplicates effort and produces inconsistent versions of one finding.',
      'Restarting wastes valid regional findings; the plan can be adapted incrementally.',
      'Correct. Adding one scoped subtask and feeding its results to pending regional work adapts the plan with no duplication.'
    ],
    trap: 'Fixed plan despite new cross-cutting findings'
  },
  {
    id: 'e3-S3-14',
    scenario: 'S3',
    domain: 'D5',
    obj: 'O19',
    type: 'multi',
    select: 2,
    stem: 'A report on the adaptation finance gap for developing countries draws on five sources. Three give broadly similar annual estimates from modeled adaptation costs; two give substantially higher figures derived from needs reported in countries\' national plans. Some other findings (for example, that current flows are well below every estimate) are supported by all five. The client asked that the report "not hide disagreement among experts." <b>Which TWO design choices best meet this requirement?</b>',
    options: [
      'Structure the report with separate sections for well-established and contested findings, keeping each source\'s own characterization and method.',
      'Have doc-analyst resolve each conflict before returning results, keeping the value from the most recent source and discarding the older values.',
      'Report a single consensus range from the lowest to the highest estimate, so readers get one clear number without methodological detail.',
      'Keep only findings that at least three of the five sources agree on, so that the report contains no claims that could be disputed later.',
      'Have doc-analyst return conflicting values with source attribution annotated, and let the coordinator decide how to reconcile before synthesis.'
    ],
    answer: [0, 4],
    explanation: 'Preserving uncertainty requires two things: upstream agents must pass conflicting values through with attribution rather than silently resolving them, and the report must distinguish established findings from contested ones while keeping each source\'s methodology (modeled costs vs reported needs) visible.',
    rationales: [
      'Correct. Separate established and contested sections with methodological context let readers see real disagreement.',
      'Resolving by recency discards credible estimates that differ by method, not by date.',
      'A single range without method strips the explanation for why the estimates differ.',
      'Majority filtering suppresses the two needs-based estimates, which is exactly the disagreement the client wants shown.',
      'Correct. Annotated conflicts with attribution let the coordinator make an explicit reconciliation decision before synthesis.'
    ],
    trap: 'Consensus filtering collapses legitimate disagreement'
  },
  {
    id: 'e3-S3-15',
    scenario: 'S3',
    domain: 'D1',
    obj: 'O10',
    type: 'single',
    select: 1,
    stem: 'Usage analytics show 45% of queries are simple factual lookups such as "When do the EU AI Act\'s obligations for general-purpose AI models apply?" Yet every query runs the full pipeline: web-researcher, doc-analyst, synthesis, and report-generator, taking about 9 minutes and about 220k tokens. Comparative and multi-jurisdiction queries perform well in the full pipeline. Which change best improves cost and latency without degrading the complex queries?',
    options: [
      'Have the coordinator judge each query\'s scope and invoke only what it needs: one search subagent for a cited fact, parallel researchers for comparisons.',
      'Route any query under 15 words to a single-agent path using a keyword rule, and send everything else through the full four-agent pipeline as it runs today.',
      'Send the simple factual queries through the Message Batches API at a 50% discount, since those queries do not need the full report-generation stage.',
      'Lower maxTurns on every subagent so that each pipeline run finishes faster regardless of how complex the incoming query happens to be.'
    ],
    answer: [0],
    explanation: 'The coordinator should analyze query requirements and select which subagents to invoke, scaling effort to complexity: a simple fact needs one agent and a handful of tool calls, while comparisons warrant several parallel subagents. This removes wasted stages for simple lookups while leaving complex queries unchanged.',
    rationales: [
      'Correct. Complexity-based dynamic selection cuts cost and latency for simple queries and preserves the full path where it adds value.',
      'Query length is a poor proxy for complexity; short questions can be comparative and long ones simple.',
      'Batch processing has no latency guarantee (up to 24 hours), which is unacceptable for interactive lookups.',
      'Uniform turn limits truncate complex research and do not remove the unnecessary stages for simple queries.'
    ],
    trap: 'Always running the full pipeline regardless of query complexity'
  }
]);
