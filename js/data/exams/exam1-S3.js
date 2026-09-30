/* Practice Exam 1 — Scenario S3: Multi-Agent Research System
   Context: research on energy policy (grid storage, carbon pricing) and pharmaceutical drug pricing (Claude Agent SDK). */
CCAR.addQuestions('exam1', [
  {
    id: 'e1-S3-01',
    scenario: 'S3',
    domain: 'D1',
    obj: 'O10',
    type: 'single',
    select: 1,
    stem: 'A brief asks: "For the 10 drugs with the highest 2024 Medicare Part D gross spend, compare U.S. net price after rebates with prices in Germany, Japan, and Canada, and give patent expiry dates." The coordinator currently spawns 10 parallel drug subagents immediately, choosing the drug list from its own training knowledge. In testing, 3 of the 10 drugs are wrong and the whole report has to be redone. Which orchestration design best balances correctness and latency?',
    options: [
      'Use a fully sequential pipeline: one subagent identifies the list, then researches each drug and country one at a time so every step sees all prior results.',
      'First have one search subagent establish the verified top-10 list from CMS data, then fan out parallel per-drug subagents and synthesize their results.',
      'Keep spawning the 10 subagents in parallel, but tell each one to determine the top-10 list itself first and then research the drug at its assigned rank.',
      'Run the current parallel design three times and keep only the drugs that appear in at least two of the three lists before generating the final report.'
    ],
    answer: [1],
    explanation: 'The per-drug research is independent and parallelizable, but it depends on one upstream fact: which drugs are in scope. A hybrid design resolves the dependency first (one sourced lookup), then fans out parallel workers, so it keeps parallel latency without building everything on an unverified list. A fully sequential pipeline is correct but slow, and voting across runs that share the same unsourced guess does not make the list correct.',
    rationales: [
      'Correct but slow: 30+ independent drug–country subtasks run one at a time for no benefit.',
      'Correct. Resolve the dependency with sourced data, then parallelize the independent work.',
      'Ten agents redo the same lookup and may each arrive at a different list, producing gaps and duplicates.',
      'Voting over the same knowledge-based guess triples cost and can still keep a wrong drug.'
    ],
    trap: 'All-parallel or all-sequential instead of dependency-aware orchestration'
  },
  {
    id: 'e1-S3-02',
    scenario: 'S3',
    domain: 'D1',
    obj: 'O10',
    type: 'single',
    select: 1,
    stem: 'To "save coordinator tokens," a team let subagents collaborate directly on a grid-storage report: search subagents append raw findings to a shared <code>findings.md</code>, the document analyst edits entries in place, and the synthesizer starts drafting as soon as the file exceeds 20 KB. Recent runs show findings overwritten mid-edit, two search timeouts that nobody noticed, and drafts built from half-finished analysis. Which change best restores reliability?',
    options: [
      'Add file locking to <code>findings.md</code> and have the synthesizer wait until the file has stopped changing for 60 seconds before it starts drafting.',
      'Merge search, analysis, and synthesis into one agent with a large context window, so that there is only one writer and no handoffs to coordinate.',
      'Have each subagent post a status line to <code>findings.md</code> when it finishes, and let the synthesizer decide on its own when there is enough material.',
      'Route all handoffs through the coordinator: subagents return results or artifact paths to it, and it checks errors and then sequences synthesis.'
    ],
    answer: [3],
    explanation: 'In a hub-and-spoke design the coordinator manages all inter-subagent communication, which gives observability, consistent error handling, and controlled information flow. Subagents can still write large artifacts to files, but they hand the coordinator a result or a reference, and the coordinator decides when analysis is complete and synthesis can start. Locks and status lines patch the symptoms of peer-to-peer coordination, and failures still go unseen.',
    rationales: [
      'Locking prevents overwrites but not unseen errors or synthesis starting on incomplete analysis.',
      'Collapses the specialization and puts all research into one ever-growing context.',
      'Leaves completeness and error handling to the synthesizer, which cannot see the timeouts either.',
      'Correct. Coordinator-routed communication restores visibility, error handling, and ordering.'
    ],
    trap: 'Peer-to-peer shortcuts instead of coordinator-routed communication'
  },
  {
    id: 'e1-S3-03',
    scenario: 'S3',
    domain: 'D1',
    obj: 'O06',
    type: 'single',
    select: 1,
    stem: 'A drug-pricing research run must analyze 18 FDA and payer PDFs stored locally. The trace shows all 18 Task calls went to <code>web-researcher</code> and <code>doc-analyst</code> was invoked zero times; web-researcher then fetched news summaries of the PDFs instead of reading them.<pre>agents: {\n  \'web-researcher\': {\n    description: \'Research helper for drug pricing questions\',\n    prompt: WEB_PROMPT,\n    tools: [\'WebSearch\', \'WebFetch\']\n  },\n  \'doc-analyst\': {\n    description: \'Research helper for drug pricing documents\',\n    prompt: DOC_PROMPT,\n    tools: [\'Read\', \'Grep\']\n  }\n},\nallowedTools: [\'Task\', \'Read\', \'Write\']</pre>What is the root cause and fix?',
    options: [
      'The near-identical descriptions leave the coordinator no basis for routing; state each agent\'s purpose, inputs (web vs local PDFs), and outputs.',
      'The coordinator lacks <code>"WebSearch"</code> in <code>allowedTools</code>, so it defaults to the web-researcher; add WebSearch to the coordinator\'s list as well.',
      'The doc-analyst needs <code>WebFetch</code> so that it can retrieve the PDFs by URL; until it has that tool, the coordinator will always route around it.',
      'The coordinator prompt should list the exact Task call to make for each document, so that routing no longer depends on how the agents are described.'
    ],
    answer: [0],
    explanation: 'The coordinator chooses a subagent from its <code>description</code>, so two descriptions that differ by one word ("questions" vs "documents") make routing effectively arbitrary. Spawning itself works ("Task" is present), so the fix is to write descriptions that separate purpose, inputs, and outputs, e.g. "analyzes local PDF filings with Read/Grep" vs "finds current web sources." Hard-coding each Task call in the prompt removes the coordinator\'s ability to route adaptively.',
    rationales: [
      'Correct. Vague, overlapping AgentDefinition descriptions cause misrouting between subagents.',
      'Wrong layer: the coordinator should not search itself, and its tools do not steer subagent selection.',
      'The PDFs are local; doc-analyst already has the tools it needs and was simply never selected.',
      'A procedural workaround that breaks for any new document set instead of fixing the definitions.'
    ],
    trap: 'Overlapping subagent descriptions misdiagnosed as a tool-permission problem'
  },
  {
    id: 'e1-S3-04',
    scenario: 'S3',
    domain: 'D1',
    obj: 'O06',
    type: 'single',
    select: 1,
    stem: 'The synthesis subagent for a carbon-pricing report ignores the team\'s citation format and conflict-annotation rules and writes generic prose. The coordinator also sometimes sends it raw search tasks.<pre>synthesizer: {\n  description: `You are the synthesis specialist. Merge findings from the search\n    and document agents. Preserve every claim-source mapping. Put conflicting\n    values side by side with attribution. Cite as [S#:page]. ... (~550 more words)`,\n  prompt: \'You are a helpful research assistant.\',\n  tools: [\'Read\', \'Write\']\n}</pre>What should be changed?',
    options: [
      'Paste the 550 words of rules into every Task prompt the coordinator sends to the synthesizer, so that they arrive as task input rather than configuration.',
      'Switch the synthesizer to a larger model, which will infer the citation and conflict rules from the description text more reliably than the current one.',
      'Move the rules into <code>prompt</code>, which is the subagent\'s system prompt, and make <code>description</code> a short statement of when to use it.',
      'Add <code>"Task"</code> to the synthesizer\'s tools so it can hand any search work it receives on to the web-research subagent by itself.'
    ],
    answer: [2],
    explanation: 'In an AgentDefinition, <code>prompt</code> is the subagent\'s system prompt and <code>description</code> tells the coordinator when to use the agent. Here the parameters are swapped: the role rules sit in the routing text, where they do not govern the subagent\'s behavior and blur routing, while the actual system prompt is generic. Moving the rules into <code>prompt</code> and writing a concise description fixes both symptoms.',
    rationales: [
      'Works around the misconfiguration at a token cost on every call and leaves routing confused.',
      'A larger model cannot follow rules that are not in its system prompt.',
      'Correct. Put role instructions in prompt; keep description as a concise routing statement.',
      'Lets the synthesizer spawn agents outside the coordinator and does not address the swapped fields.'
    ],
    trap: 'Wrong AgentDefinition parameters (description vs prompt)'
  },
  {
    id: 'e1-S3-05',
    scenario: 'S3',
    domain: 'D5',
    obj: 'O18',
    type: 'single',
    select: 1,
    stem: 'Document-analysis subagents currently return this for each batch of sources on grid-scale storage costs:<pre>{ "summary": "Several recent studies suggest 4-hour lithium-ion system costs fell\n              sharply, likely by 20-40%, with further declines expected...",\n  "sources": ["https://.../atb-2024", "https://.../bnef-survey", "https://.../lazard-lcos"] }</pre>The synthesizer cannot tell which figure came from which source, mixes $/kW and $/kWh values, and drops publication years. Which output design best supports downstream synthesis?',
    options: [
      'Keep the summary field, but require it to be at least 400 words long and to name every source inline, so that the synthesizer can locate each one.',
      'Return the full extracted text of every source alongside the summary, so that the synthesizer can recheck figures, units, and dates by itself.',
      'Add a self-rated <code>confidence</code> score from 0 to 1 to each summary, so the synthesizer can weight sources whenever their figures disagree.',
      'Return a list of claims, each with value, unit, source URL, title, page, publication date, method note, and a short supporting excerpt.'
    ],
    answer: [3],
    explanation: 'Downstream synthesis needs claim-level structure: each finding tied to its source, with units, dates, and methodological context kept as metadata separate from the content. A prose summary with a detached source list destroys the claim-source mapping, so attribution and unit or date comparison become guesswork. Returning full text shifts the analysis burden to the synthesizer and floods its context.',
    rationales: [
      'Longer prose still does not bind each figure to its source, unit, and date.',
      'Floods the synthesizer\'s context and makes it redo the analysis the subagent was meant to do.',
      'Self-rated confidence is poorly calibrated and does not restore attribution or units.',
      'Correct. Structured claim records with source and method metadata preserve attribution through synthesis.'
    ],
    trap: 'Prose summaries or confidence scores instead of structured claim-source records'
  },
  {
    id: 'e1-S3-06',
    scenario: 'S3',
    domain: 'D5',
    obj: 'O18',
    type: 'single',
    select: 1,
    stem: 'On a carbon-border-adjustment brief, five search subagents each return about 26k tokens: full article text, their own reasoning chains, and a closing summary. The synthesizer\'s input reaches roughly 135k tokens, and its drafts consistently omit findings from the second through fourth subagents while covering the first and last in depth. Which change most effectively fixes this?',
    options: [
      'Move the synthesizer to a model with a 1M-token context window, so that all 130k tokens of subagent output fit with plenty of room to spare.',
      'Have search subagents return structured key facts with citations and relevance scores, keeping full text in files referenced by path.',
      'Truncate each subagent\'s output to its first 5k tokens before passing it on, so that every subagent gets an equal share of the synthesis budget.',
      'Have the synthesizer first write a one-paragraph summary of each subagent\'s output, then draft the report only from those five paragraphs.'
    ],
    answer: [1],
    explanation: 'The pattern (strong start and end, weak middle) is the lost-in-the-middle effect, made worse by verbose inputs full of reasoning chains. When a downstream agent has a limited context budget, upstream agents should return structured data (key facts, citations, relevance scores) rather than raw content; full text can live in files and be passed by reference. A bigger window still holds the same diluted input.',
    rationales: [
      'The input already fits; position effects and dilution remain in a larger window.',
      'Correct. Compact structured outputs with references cut volume and keep every subagent\'s findings visible.',
      'Blind truncation drops whatever findings happen to come after the first 5k tokens.',
      'Progressive summarization loses figures and attribution before synthesis even starts.'
    ],
    trap: 'Bigger context window instead of structured upstream outputs'
  },
  {
    id: 'e1-S3-07',
    scenario: 'S3',
    domain: 'D5',
    obj: 'O19',
    type: 'multi',
    select: 2,
    stem: 'In a drug-pricing report, sources disagree: an IQVIA-based analysis puts average 2024 rebates for a GLP-1 drug at 58% of list price, a manufacturer disclosure implies 44%, and a payer survey gives 49–55%. The synthesizer currently picks the most recent figure and states it as fact, and the document analyst drops values it considers outliers before passing results on. Which TWO changes best preserve source-level uncertainty?',
    options: [
      'Have the synthesizer average the credible figures (about 51%) and report that single value, with all three sources listed in one shared citation.',
      'Have the document analyst keep all conflicting values with attribution and annotate the conflict, leaving reconciliation to the coordinator.',
      'Run three synthesis passes and report whichever rebate figure appears in most of the drafts, so that one-off outliers are filtered out.',
      'Structure the report into established and contested findings, presenting each rebate value with its source, method, and time period.',
      'Drop contested figures from the report and state that rebate levels are unknown, so that no reader can be misled by any single source.'
    ],
    answer: [1, 3],
    explanation: 'Conflicting statistics from credible sources should be annotated with attribution, not resolved by picking, averaging, or dropping values. Upstream, the document analyst should complete its analysis with every conflicting value included and flagged so the coordinator can decide how to reconcile. Downstream, the report should separate well-established from contested findings, keeping each value\'s source and methodological context.',
    rationales: [
      'Averaging invents a figure no source reported and hides the disagreement.',
      'Correct. Keep and annotate conflicts at analysis time; reconciliation is a coordinator decision.',
      'Majority voting across drafts reproduces whichever value the model favors and hides the conflict.',
      'Correct. Separate established from contested findings with per-value attribution and method.',
      'Discards useful, sourced evidence instead of presenting the range and its reasons.'
    ],
    trap: 'Collapsing conflicts by averaging, voting, or omission'
  },
  {
    id: 'e1-S3-08',
    scenario: 'S3',
    domain: 'D5',
    obj: 'O19',
    type: 'single',
    select: 1,
    stem: 'Reviewers of an energy-policy report flag two problems. Hedged source claims were hardened: "preliminary modelling suggests a $50/t carbon price could cut power-sector emissions 10–15% by 2030" became "a $50/t price cuts emissions 10–15%." And a peer-reviewed meta-analysis and a two-page advocacy brief both appear as "studies show." The claim records passed to the synthesizer already include source type and the original wording. What is the most effective change?',
    options: [
      'Require synthesis to keep each source\'s own hedging and evidence type per claim, and separate well-established findings from contested ones.',
      'Instruct the synthesizer to add "may" or "might" to every quantitative claim, so that no finding in the report is stated with false certainty.',
      'Exclude all sources that are not peer-reviewed before synthesis, so that the remaining evidence can be stated confidently without any caveats.',
      'Add a final report-writer pass with web search that rechecks each claim online and deletes any claim it cannot confirm in two independent places.'
    ],
    answer: [0],
    explanation: 'The upstream data is already right; the synthesis step is flattening it. Synthesis should preserve original source characterizations (hedges, model vs observation) and methodological context, and should distinguish established findings from contested or preliminary ones. Blanket hedging erases the distinctions readers need, and filtering or re-searching changes the evidence base instead of representing it honestly.',
    rationales: [
      'Correct. Preserve per-claim characterizations and separate established from contested findings.',
      'Uniform hedging makes a robust meta-analysis look as weak as a preliminary model.',
      'Removes relevant policy evidence and still would not stop hedges being hardened.',
      'Gives the report writer an out-of-role research job and may delete valid single-source findings.'
    ],
    trap: 'Uniform hedging or filtering instead of preserving source characterizations'
  },
  {
    id: 'e1-S3-09',
    scenario: 'S3',
    domain: 'D5',
    obj: 'X06',
    type: 'multi',
    select: 2,
    stem: 'While researching carbon markets, a web-search subagent hits two problems: fetching the EU ETS registry page returns HTTP 503 twice in a row, and the query "China national ETS 2025 allowance auction results" returns zero results from all three search providers. Which TWO behaviors should the subagent implement?',
    options: [
      'Retry the 503 locally with backoff; if it still fails, return a structured error with failure type, URL attempted, partial results, and alternatives.',
      'Report both problems to the coordinator as a single generic "search unavailable" status, so that the coordinator can retry the whole subtask later.',
      'Return an empty result set marked as success for the registry page, so that the run continues and synthesis is not delayed by a single source.',
      'Stop the research run and alert the on-call engineer whenever any fetch fails, since reports built on partial data cannot be trusted.',
      'Report the zero-hit query as a valid empty result, distinct from an access failure, including the exact query and the providers tried.'
    ],
    answer: [0, 4],
    explanation: 'Subagents should recover locally from transient failures and propagate only what they cannot resolve, with structured context (failure type, what was attempted, partial results, alternatives) so the coordinator can choose a recovery. A query that ran successfully and found nothing is a valid empty result, not an access failure, and must be reported as such so the coordinator can reformulate or annotate a coverage gap. Generic statuses, silent success, and whole-run termination are the anti-patterns.',
    rationales: [
      'Correct. Local retry for the transient error, then structured error context if it persists.',
      'A generic status hides which failure is transient and which is a genuine absence of data.',
      'Silent suppression: the coordinator never learns that a key source was unavailable.',
      'Terminating the whole workflow over one recoverable failure wastes all completed work.',
      'Correct. Distinguish valid empty results from access failures in what is reported.'
    ],
    trap: 'Generic errors, silent suppression, or whole-workflow termination'
  },
  {
    id: 'e1-S3-10',
    scenario: 'S3',
    domain: 'D5',
    obj: 'X10',
    type: 'single',
    select: 1,
    stem: 'A report states: "Sources conflict sharply on the annual cost of drug Z: $84,000 vs $61,000." Investigation shows the first figure is a 2021 list price from a news article and the second is a 2024 estimated net price from a payer report. The document-analysis output records only claim, value, and URL for each finding. Which change best prevents this class of error?',
    options: [
      'Instruct the synthesizer to always keep the most recent figure and drop older ones, so that the report only reflects current market conditions.',
      'Add a citation agent at the end that attaches the source URL to every sentence containing a price, so that readers can check figures themselves.',
      'Require each claim record to carry publication date, data period, and price basis (list or net), and have synthesis compare like with like.',
      'Instruct the synthesizer to flag every numeric difference over 10% as a conflict, so that readers are warned whenever the sources disagree.'
    ],
    answer: [2],
    explanation: 'Without publication or collection dates and definitional context in the structured output, temporal and basis differences look like contradictions. Requiring subagents to record dates, data periods, and what a figure measures lets synthesis explain the gap (list price rising vs net price after rebates) instead of reporting a false conflict. Recency rules discard valid data, and more URLs or more conflict flags do not supply the missing context.',
    rationales: [
      'Discards the list-price data point and still cannot tell list from net pricing.',
      'Attribution helps readers verify but does not stop the synthesizer misreading the two figures.',
      'Correct. Dates and price basis in claim records prevent temporal and definitional false conflicts.',
      'Produces more false conflicts, because every like-for-unlike comparison gets flagged.'
    ],
    trap: 'Recency rules or more citations instead of dated, qualified claim records'
  },
  {
    id: 'e1-S3-11',
    scenario: 'S3',
    domain: 'D1',
    obj: 'O01',
    type: 'single',
    select: 1,
    stem: 'A coordinator researches six carbon-pricing subtopics: EU ETS, UK ETS, California cap-and-trade, RGGI, Canada\'s federal fuel charge, and the effect of the EU CBAM on steel imports. Only the CBAM subtopic depends on another result (it needs the EU ETS price findings). The trace shows one Task call per coordinator turn, each awaited before the next, for 52 minutes in total. Which change most reduces latency without breaking the dependency?',
    options: [
      'Submit the six subtopic prompts through the Message Batches API, which processes the requests concurrently at lower cost, and then poll for results.',
      'Spawn one subagent with all six subtopics and a larger turn budget, so that it can plan its own order and handle the CBAM dependency internally.',
      'Emit all six Task calls in one coordinator response and tell the CBAM subagent to estimate the EU ETS price itself if it is not yet available.',
      'Emit the five independent Task calls in one coordinator response, then spawn the CBAM subagent with the EU ETS findings once they return.'
    ],
    answer: [3],
    explanation: 'Subagents run in parallel when the coordinator emits multiple Task calls in a single response; one call per turn serializes them. Independent subtopics should be launched together, while a dependent subtask should wait for its input and receive it explicitly in its prompt. The Batches API has no latency guarantee (up to 24 hours) and does not support multi-turn tool use within a request, so it suits neither this interactive research loop nor its tools.',
    rationales: [
      'Batch processing has no latency SLA and cannot run an agentic, tool-using research loop per request.',
      'Serializes all six subtopics inside one context, which is slower and dilutes attention.',
      'Parallel, but the CBAM subagent works from a guess instead of the researched EU ETS price.',
      'Correct. Parallelize independent Task calls in one response; pass the dependency when it is ready.'
    ],
    trap: 'Batch API for a blocking workflow / ignoring a dependency when parallelizing'
  },
  {
    id: 'e1-S3-12',
    scenario: 'S3',
    domain: 'D1',
    obj: 'O09',
    type: 'single',
    select: 1,
    stem: 'An OECD drug-pricing study runs about 3 hours with 14 subagents. The container was preempted at 2h10m: 9 subagents had finished, 3 were mid-run, and 2 had not started. The restart re-ran everything (about $180 in extra API cost), and after an earlier crash the rerun report silently lacked two countries whose subagents had completed. Which design gives reliable resumption?',
    options: [
      'Subagents save findings and status to known paths; on resume the coordinator loads a manifest, reruns only unfinished work, and reuses the rest.',
      'Cache every web response by URL for 24 hours, so that a full rerun after a crash repeats the reasoning but avoids paying again for earlier fetches.',
      'Resume the coordinator\'s session after a crash and instruct it to "continue where you left off," relying on its transcript to recall what is done.',
      'Reduce the run to 5 larger subagents so that it finishes in under an hour, which makes preemption during a run much less likely to happen.'
    ],
    answer: [0],
    explanation: 'Crash recovery for multi-agent pipelines relies on structured state exports: each agent writes its results and status to a known location, and the coordinator keeps a manifest that it loads on resume. Completed findings are injected into later prompts (so no country silently disappears), and only incomplete or unstarted subtasks are re-dispatched. Caching cuts fetch cost but not the rerun, and asking the model to recall progress from a transcript is not a reliable record of completion.',
    rationales: [
      'Correct. Manifest-based state lets the coordinator skip finished work and keep every completed finding.',
      'Still reruns all reasoning and subagent work; it does not address lost findings.',
      'Relies on model recall; in-flight subagent work is not in the transcript and completion is not tracked.',
      'Reduces exposure but gives no recovery when a crash does happen, and larger subagents get shallower coverage.'
    ],
    trap: 'Rerun-with-cache or transcript recall instead of manifest-based resumption'
  },
  {
    id: 'e1-S3-13',
    scenario: 'S3',
    domain: 'D1',
    obj: 'O03',
    type: 'single',
    select: 1,
    stem: 'After a first pass on grid storage, the coordinator spots a gap on sodium-ion costs and re-delegates: "Find more information about sodium-ion battery storage costs." The new search subagent returns 6 sources, 5 of which were already analyzed in the first pass, reports $/kWh cell prices when the report needs installed system costs, and covers only 2019–2021 data. What is the most effective fix?',
    options: [
      'Give the search subagent the coordinator\'s full conversation history so that it can see the first-pass results and avoid repeating them.',
      'Put in the Task prompt the sources already covered, findings so far, the exact gap (installed system cost), and the required date range.',
      'Increase the search subagent\'s result limit and turn budget so that it explores past the sources that dominate the first page of results.',
      'Have the synthesizer run its own sodium-ion searches, since it already knows which sources were used and exactly what the report is missing.'
    ],
    answer: [1],
    explanation: 'A re-delegated subagent starts with only its Task prompt, so a vague request produces duplicated sources and the wrong metric. The coordinator should pass what is already known (sources covered, current findings), the precise gap, and scope constraints such as metric and date range. Handing over the whole history is not how subagent context works and would bury the targeted instruction; giving the synthesizer search tools breaks role separation.',
    rationales: [
      'Subagents do not inherit parent history; passing the whole transcript is noisy and not the targeted fix.',
      'Correct. A complete, specific Task prompt prevents duplication and scopes the gap precisely.',
      'More results for a vague query return more of the same, still with the wrong metric and dates.',
      'Gives the synthesizer out-of-role search tools and bypasses the coordinator\'s control.'
    ],
    trap: 'Vague re-delegation prompt missing prior findings and scope'
  },
  {
    id: 'e1-S3-14',
    scenario: 'S3',
    domain: 'D1',
    obj: 'O04',
    type: 'single',
    select: 1,
    stem: 'The coordinator\'s Task prompts to search subagents read: "Search for \'carbon price emissions elasticity\'. Open the top 5 results. Summarize each in 3 sentences. Return the summaries." Outputs are dominated by paywalled abstracts and SEO explainers, IMF and peer-reviewed estimates for the EU ETS and British Columbia are often missing, and subagents never try a second query. Which delegation change is best?',
    options: [
      'Extend the procedure: open the top 10 results, skip any domain on a blocklist of SEO sites, and summarize each result in five sentences instead of three.',
      'Replace the prompt with "Research carbon pricing thoroughly," so that subagents can decide for themselves what to look for and how much to return.',
      'State the goal (empirical EU ETS and B.C. estimates), a quality bar (official or peer-reviewed, 2015+), and an output schema, and let them pick queries.',
      'Have the coordinator run the searches itself and pass subagents a fixed list of URLs to summarize, so that it keeps full control over source quality.'
    ],
    answer: [2],
    explanation: 'Coordinator prompts should specify research goals and quality criteria rather than step-by-step procedures, so subagents can adapt their queries when results are poor. A defined output schema and explicit scope keep the coordinator in control of what comes back. A longer script still cannot adapt, a bare "research X" loses boundaries and causes duplication, and doing the searches in the coordinator defeats delegation.',
    rationales: [
      'A longer script is still rigid; the subagent still cannot reformulate when results are poor.',
      'Too vague: no scope, criteria, or output format, which leads to gaps and duplicated work.',
      'Correct. Goal plus quality criteria plus output schema enables adaptation with coordinator visibility.',
      'Moves the research into the coordinator\'s context and removes the subagents\' ability to adapt.'
    ],
    trap: 'Procedural instructions vs goal-and-criteria delegation'
  },
  {
    id: 'e1-S3-15',
    scenario: 'S3',
    domain: 'D2',
    obj: 'O33',
    type: 'single',
    select: 1,
    stem: 'The report-writer subagent\'s job is to turn the approved synthesis into a formatted, publication-ready report. It was given 18 tools "for flexibility," including WebSearch, Bash, and the <code>mcp__drugprice__get_wac</code> pricing tool. In 27% of runs it "refreshes" prices through the pricing tool, so report tables no longer match the reviewed synthesis, and it sometimes runs unrelated Bash commands. What is the best fix?',
    options: [
      'Add a system prompt rule telling the report writer never to change any figure it receives, and to use research tools only when a value looks outdated.',
      'Keep the tools but add a PostToolUse hook that logs every pricing and Bash call, so reviewers can spot mismatches after each report is produced.',
      'Let the report writer keep the pricing tool but require it to cite the refresh date for every value it updates in the final report tables.',
      'Limit the report writer to the few tools its formatting role needs, such as Read and Write, and route data questions through the coordinator.'
    ],
    answer: [3],
    explanation: 'Agents given tools outside their specialization tend to use them, and large tool sets degrade selection. The report writer\'s role is formatting approved content, so it should hold only the tools that role needs; any data question goes back through the coordinator, which can re-delegate to research agents. A prompt rule still leaves the tools available, and logging only detects the problem after the report is wrong.',
    rationales: [
      'Probabilistic, and "only when outdated" invites exactly the refreshes that break consistency.',
      'Observability after the fact; the mismatched tables are still produced.',
      'Legitimizes out-of-role data changes that bypass the reviewed synthesis.',
      'Correct. Scope each subagent\'s tools to its role and route other needs via the coordinator.'
    ],
    trap: 'Giving an agent all tools "for flexibility"'
  }
]);
