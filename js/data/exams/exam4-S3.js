/* Practice Exam 4 — Scenario S3: Multi-Agent Research System (threat intelligence + competitive intelligence) */
CCAR.addQuestions('exam4', [
  {
    id: 'e4-S3-01', scenario: 'S3', domain: 'D1', obj: 'O06', type: 'single', select: 1,
    stem: 'A threat-intelligence team runs a coordinator built on the Claude Agent SDK to produce briefs on newly reported ransomware variants. Traces show the coordinator performing every web search and PDF read itself; no subagent is ever started, and its context reaches 180k tokens before the brief is written. The configuration is:<pre>const run = query({\n  prompt: briefRequest,\n  options: {\n    allowedTools: ["WebSearch", "WebFetch", "Read", "Write"],\n    agents: {\n      "web-scout": {\n        description: "Finds and triages open-web reporting (vendor blogs, CERT advisories) on a named threat actor or malware family.",\n        prompt: SCOUT_PROMPT,\n        tools: ["WebSearch", "WebFetch"]\n      },\n      "doc-analyst": {\n        description: "Extracts IOCs, TTPs and affected versions from advisory PDFs already downloaded to ./intake.",\n        prompt: ANALYST_PROMPT,\n        tools: ["Read", "Grep"]\n      }\n    }\n  }\n});</pre>What is the root cause?',
    options: [
      'The subagent descriptions overlap with tools the coordinator already holds, so it judges delegation unnecessary; both descriptions need explicit "use this instead of searching yourself" routing language.',
      'Neither AgentDefinition sets a <code>model</code>, so both subagents fail to initialize and the coordinator silently falls back to doing the work with its own tools.',
      'The coordinator\'s <code>allowedTools</code> does not include "Task", so it has no way to spawn the subagents it was given and uses its own search and read tools instead.',
      'Each subagent lists only two tools; they need "Task" in their own <code>tools</code> arrays so that the coordinator is able to hand work to them.'
    ],
    answer: [2],
    explanation: 'Subagents are spawned through the Task tool (named Agent in the current SDK), and the exam-guide wiring rule is that the coordinator\'s allowedTools must include "Task". Here the agents are registered and well described, but the coordinator can only act with the tools it has, so it does the research inline and exhausts its context. Removing WebSearch from the coordinator would not enable delegation by itself; adding "Task" does.',
    rationales: [
      'The descriptions are specific and distinct (open-web triage vs. PDFs in ./intake). Better routing language cannot help when the spawning tool itself is unavailable.',
      '<code>model</code> is optional in an AgentDefinition; when omitted the default/inherited model is used. It does not stop a subagent from running.',
      'Correct. Without "Task" in allowedTools the coordinator cannot invoke any subagent, which matches the trace: zero spawns and all work done inline.',
      'Subagents do not need Task to receive work; Task is what the coordinator uses to spawn them. On a subagent it would only let that subagent spawn its own children.'
    ],
    trap: 'Blaming descriptions or model choice when the spawning tool is missing'
  },
  {
    id: 'e4-S3-02', scenario: 'S3', domain: 'D1', obj: 'O06', type: 'multi', select: 2,
    stem: 'A competitive-intelligence pipeline for a payments company registers subagents as shown. After deployment two problems appear: (1) the coordinator logs <code>No agent type "filings-analyst" is available</code> and then parses 10-K PDFs itself; (2) the <code>news-scout</code> subagent only summarizes URLs quoted in its task prompt and never discovers new coverage.<pre>const defs = {\n  "news-scout": {\n    description: "Finds recent press, analyst notes and product-launch coverage for a named competitor.",\n    prompt: SCOUT_PROMPT,\n    tools: ["WebFetch", "Read"]\n  },\n  "filings-analyst": {\n    description: "Analyzes SEC filings and earnings transcripts saved under ./filings.",\n    prompt: FILINGS_PROMPT,\n    tools: ["Read", "Grep", "Glob"]\n  }\n};\n\nquery({ prompt: req, options: {\n  allowedTools: ["Task", "Read", "Write"],\n  agents: { "news-scout": defs["news-scout"] }\n}});</pre>Which two changes fix both problems? (Select 2)',
    options: [
      'Add "Task" to the <code>tools</code> array of <code>news-scout</code> so that it can hand discovery work to a helper agent of its own.',
      'Pass <code>filings-analyst</code> in the <code>agents</code> option given to <code>query()</code>; defining it in a local object does not register it.',
      'Describe <code>filings-analyst</code> in the coordinator\'s system prompt so the coordinator knows the agent exists and can call it by name.',
      'Add "WebSearch" to the <code>tools</code> array of <code>news-scout</code>; with only WebFetch it can open known URLs but cannot discover new ones.',
      'Set <code>model: "opus"</code> on <code>news-scout</code> so that it plans broader discovery strategies instead of stopping at the provided URLs.'
    ],
    answer: [1, 3],
    explanation: 'Only agents passed in the agents option are available to the Task tool, so filings-analyst must be registered there; an object the SDK never receives has no effect. Separately, a subagent can use only the tools in its tools list: WebFetch retrieves a known URL, while discovery needs WebSearch. Both are wiring defects, not prompt or model problems.',
    rationales: [
      'Task on a subagent lets it spawn children; it grants no search capability, so discovery still fails.',
      'Correct. The error says the agent type is unavailable, which is exactly what happens when a definition is not registered in the agents option.',
      'Mentioning an agent in a prompt cannot make an unregistered agent type exist; the Task call would fail the same way.',
      'Correct. The subagent behaves exactly as its tool list allows: it fetches supplied URLs and has no search tool for finding new coverage.',
      'A stronger model still cannot call a tool it was not given; the limit is the tools array, not planning quality.'
    ],
    trap: 'Prompt or model fixes for registration and tool-list defects'
  },
  {
    id: 'e4-S3-03', scenario: 'S3', domain: 'D1', obj: 'O10', type: 'single', select: 1,
    stem: 'A market-research firm produces a quarterly landscape report covering 12 competitors in the observability market. The current design is a fixed sequential pipeline (search, analyze, synthesize, report) run competitor by competitor. A run takes 3h40m, one failed PDF fetch for a single competitor halts everything after it, and editors say cross-competitor themes (for example, pricing moves several vendors made in the same month) are rarely identified. New targets: under 45 minutes, partial results when one competitor\'s sources fail, and genuine cross-competitor analysis. Which orchestration design best meets all three?',
    options: [
      'A coordinator that fans out per-competitor research subagents in parallel, receives structured results or errors from each, re-delegates gaps, and runs one cross-competitor synthesis.',
      'Twelve independent end-to-end pipelines launched in parallel by a job scheduler, each writing its own finished report section, which a deterministic script concatenates once all twelve have completed.',
      'The existing sequential pipeline with automatic retries and exponential backoff on every fetch, so that a single failure no longer stops the competitors that follow it.',
      'A single agent on a larger-context model that researches all 12 competitors in one loop, so that cross-competitor patterns stay visible in one context window throughout.'
    ],
    answer: [0],
    explanation: 'Coordinator-worker with parallel subagents addresses all three needs: latency (independent competitors are researched concurrently), reliability (the coordinator receives structured errors and can proceed with partial results or re-delegate), and coverage (a synthesis step sees all findings together and can surface cross-competitor themes). Parallelism without a coordinator loses gap evaluation and cross-entity synthesis; a serial pipeline cannot hit the latency target; a single agent reintroduces context exhaustion.',
    rationales: [
      'Correct. Parallel fan-out for latency, coordinator-level error handling for partial results, and a combined synthesis for cross-competitor coverage.',
      'Fixes latency, but nothing evaluates gaps or synthesizes across competitors, and a failed pipeline just leaves a hole with no recovery decision.',
      'Retries add robustness but the run stays serial and takes hours; permanent failures (removed or paywalled PDFs) still need a recovery decision.',
      'One agent accumulating tool output for 12 companies suffers attention dilution; a larger window does not fix that, and the work is still serial.'
    ],
    trap: 'Parallelism without coordination; bigger context window'
  },
  {
    id: 'e4-S3-04', scenario: 'S3', domain: 'D1', obj: 'O10', type: 'single', select: 1,
    stem: 'An analyst asks the threat-intel assistant: "What is the CVSS base score and the first fixed version for CVE-2026-31337?" Traces show the coordinator spawning the web-search, document-analysis, synthesis and report subagents in turn; the answer takes 6 minutes and about 190k tokens. Broad requests such as "assess the ransomware threat to European hospitals" are handled well by the same flow. What change is most appropriate?',
    options: [
      'Cache every subagent\'s output keyed by the normalized query string so that repeated lookups of the same CVE return instantly without re-running the pipeline.',
      'Lower <code>max_tokens</code> on each subagent so that every stage of the pipeline produces shorter output for narrow questions like this one.',
      'Put a keyword classifier in front of the coordinator that sends any request containing a CVE identifier straight to a static lookup script.',
      'Instruct the coordinator to assess query complexity and scale effort, delegating a simple fact lookup to one search subagent with a few tool calls.'
    ],
    answer: [3],
    explanation: 'The coordinator should decide which subagents to invoke based on the query rather than always routing through the full pipeline. Anthropic\'s research system scales effort explicitly: a simple fact needs one agent and a handful of tool calls, comparisons a few subagents, and complex research many. Multi-agent runs cost many times the tokens of a single agent, so full fan-out should be reserved for broad, parallelizable questions.',
    rationales: [
      'Caching only helps repeats; the first lookup of every new CVE still runs the whole four-agent pipeline.',
      'Shorter outputs trim tokens slightly, but all four agents still run; the waste is invoking stages the question does not need.',
      'A keyword router is brittle (CVE IDs also appear in broad questions) and bypasses the coordinator\'s judgment; effort scaling belongs in the coordinator.',
      'Correct. Dynamic subagent selection by query complexity is the coordinator\'s job and removes the unnecessary stages.'
    ],
    trap: 'Always running the full pipeline; token trimming as a fix'
  },
  {
    id: 'e4-S3-05', scenario: 'S3', domain: 'D1', obj: 'O09', type: 'single', select: 1,
    stem: 'A six-hour threat-landscape job fans out to nine research subagents. At hour four the coordinator host was restarted for patching. On restart the job began from scratch, re-ran all nine subagents (about $140 of tokens), and two findings that had existed only in the coordinator\'s conversation were missing from the final report because a source page had since been taken down. Which design gives reliable resumption without repeating work or losing findings?',
    options: [
      'Resume the coordinator\'s previous session by its session ID after the restart and instruct it to work out where it had stopped and continue from that point.',
      'Have each subagent persist its structured output to a known path, keep a manifest of task status and artifact paths, and load it on resume to skip completed work.',
      'Have the coordinator write a running summary of its progress into its own conversation every 30 minutes, so the most important findings are always available in compact form.',
      'Have each subagent append free-text progress notes to a shared log file, which the coordinator reads on restart to infer which tasks are already finished.'
    ],
    answer: [1],
    explanation: 'Crash recovery in multi-agent pipelines should rely on structured state exported to known locations plus a manifest that the coordinator loads on resume and injects into later prompts. Completed work is read from artifacts instead of recomputed, and findings no longer depend on living in one process\'s memory. Resuming a conversation asks the model to reconstruct progress (in-flight subagent results are not in it), in-context summaries die with the process, and free-text logs force the coordinator to guess.',
    rationales: [
      'Session resumption restores conversation, not a reliable record of which subagents finished and where their outputs are; the model has to infer progress.',
      'Correct. Durable per-task artifacts plus a manifest let the coordinator skip completed tasks and inject saved findings on resume.',
      'A summary held in the coordinator\'s conversation is lost with the process, and compression drops specifics such as indicators and sources.',
      'Unstructured notes require interpretation and do not reliably identify completed tasks or where their findings are stored.'
    ],
    trap: 'Relying on conversation/session state instead of a manifest'
  },
  {
    id: 'e4-S3-06', scenario: 'S3', domain: 'D1', obj: 'O09', type: 'single', select: 1,
    stem: 'After adding a manifest to a threat-intel pipeline, a test crash still produced a bad resume: the coordinator re-ran task t1 because it could not find t1\'s findings, and re-dispatched t2 with a different decomposition than the original, so two subagents covered overlapping infrastructure. The manifest written before the crash was:<pre>{\n  "run_id": "ti-2026-10-03",\n  "tasks": [\n    { "id": "t1", "agent": "web-scout",   "status": "complete" },\n    { "id": "t2", "agent": "web-scout",   "status": "running"  },\n    { "id": "t3", "agent": "doc-analyst", "status": "pending"  }\n  ]\n}</pre>What change to the manifest design fixes both defects?',
    options: [
      'Add heartbeat timestamps to each task so that the coordinator can tell which running tasks were still alive at the moment the process crashed.',
      'Store the coordinator\'s complete conversation transcript in the manifest so that the resumed coordinator can re-read exactly what it had been doing.',
      'Add a <code>percent_complete</code> field to every task and have the resumed coordinator continue partially finished tasks from that point onward.',
      'Record for each task the exact scoped prompt it was delegated and the path of its persisted output artifact, written when the task completes.'
    ],
    answer: [3],
    explanation: 'On resume the coordinator must (1) load completed results, so the manifest needs each artifact\'s location, and (2) re-dispatch incomplete tasks with the same boundaries, so it needs the original delegated prompt or scope. Status alone says what finished, not where its findings are or what it covered. With both recorded, the coordinator injects t1\'s saved findings downstream and re-issues t2 exactly as before.',
    rationales: [
      'Heartbeats show liveness, not where findings are stored or what scope a task had.',
      'A transcript is large, contains stale tool output, and still makes the model reconstruct scope rather than read it.',
      'Subagents have no persisted partial state to continue from, and a percentage carries neither scope nor artifact location.',
      'Correct. Artifact paths prevent recomputation and the recorded scope keeps re-dispatched tasks from overlapping.'
    ],
    trap: 'Manifest that records status but not artifacts or scope'
  },
  {
    id: 'e4-S3-07', scenario: 'S3', domain: 'D1', obj: 'O03', type: 'single', select: 1,
    stem: 'In a cyber threat-intel system, the coordinator spawns the synthesis subagent with this Task prompt: "Synthesize the web-scout and doc-analyst findings above into a threat assessment for the Scattered Lynx actor." The resulting assessments contain generic statements ("the actor is known to use phishing"), no indicator values, and occasionally IP addresses that appear in no source. The web-scout and doc-analyst outputs visible in the coordinator\'s trace are detailed and correct. What is the most effective fix?',
    options: [
      'Include the complete structured findings from both subagents (claims, IOCs, source URLs, dates) directly in the synthesis subagent\'s Task prompt.',
      'Give the synthesis subagent WebSearch and WebFetch so that it can re-collect any evidence it needs instead of relying on another agent\'s summary.',
      'Switch the synthesis subagent to a more capable model and raise its <code>max_tokens</code> so that it can write a more detailed, specific assessment.',
      'Add a rule to the synthesis subagent\'s system prompt forbidding it from including any indicator that it has not personally verified.'
    ],
    answer: [0],
    explanation: 'Subagents do not inherit the coordinator\'s conversation, so "the findings above" refers to text the synthesis subagent never received. With nothing to synthesize, it writes generic prose and fabricates specifics. The coordinator must pass the complete findings in the Task prompt, ideally as structured data that separates content from source metadata so attribution survives.',
    rationales: [
      'Correct. Explicit context passing gives the subagent the actual findings and their sources.',
      'Duplicates the web-scout\'s role and gives a synthesis agent tools outside its specialization; it still lacks the doc-analyst\'s results.',
      'No model can synthesize data it was never given; more tokens just produce longer generic text.',
      'A prohibition may suppress fabricated IPs but still leaves the subagent with no findings to work from.'
    ],
    trap: 'Assuming subagents inherit coordinator context'
  },
  {
    id: 'e4-S3-08', scenario: 'S3', domain: 'D1', obj: 'O04', type: 'single', select: 1,
    stem: 'The coordinator delegates to the web-scout with procedural instructions: "1. Search for \'&lt;actor&gt; ransomware\'. 2. Open the top three results. 3. Copy any IP addresses and hashes. 4. Return them." For newer actors the top results are SEO aggregator pages, vendor advisories published as PDFs are never reached, and the scout never pivots to the actor\'s known aliases. Which delegation approach best fixes this while keeping the coordinator able to check what was covered?',
    options: [
      'Extend the procedure with extra steps for PDF advisories and alias searches, and specify the exact query strings the scout should run at each step.',
      'Have the coordinator run the searches itself and pass the scout a curated list of URLs, so the scout only has to extract indicators from them.',
      'State the research goal, quality criteria (primary sources, recency, alias coverage), and an output format listing sources and queries used.',
      'Increase the number of results the scout opens from three to ten so that primary vendor advisories are more likely to be captured by the procedure.'
    ],
    answer: [2],
    explanation: 'Goal-oriented delegation with explicit quality criteria lets the subagent adapt its strategy (pivot to aliases, reach PDFs, discard aggregators), while a structured output recording sources and queries preserves the coordinator\'s visibility into coverage. Procedural scripts fail whenever reality differs from the script; adding steps only makes a longer brittle script, and moving the searching into the coordinator defeats delegation and bloats its context.',
    rationales: [
      'Still a rigid script: it anticipates today\'s gaps but not the next actor whose sources look different.',
      'Pulls the search work and its verbose output into the coordinator, which is what delegation is meant to avoid.',
      'Correct. Goals and quality criteria enable adaptation; the required output format keeps coverage auditable.',
      'More results under the same rigid procedure still favors aggregator pages and never pivots to aliases.'
    ],
    trap: 'Patching a procedural script instead of delegating goals'
  },
  {
    id: 'e4-S3-09', scenario: 'S3', domain: 'D2', obj: 'O33', type: 'single', select: 1,
    stem: 'A report-generation subagent in a competitive-intelligence system was defined without a <code>tools</code> field. About one report in five contains market-share figures that appear in none of the synthesized findings; traces show the report agent calling WebSearch mid-draft and, once, invoking the CRM MCP server\'s <code>update_account</code> tool. Its role is to render the approved synthesis into the house template and save it. What is the best change?',
    options: [
      'Keep the inherited tools and add a system-prompt rule stating that the report agent must never search the web or modify any CRM records.',
      'Give the report agent an explicit <code>tools</code> list with only what rendering needs: Read for the synthesis artifact and Write.',
      'Remove WebSearch from the report agent while keeping the rest of the inherited tools available in case a report needs extra data.',
      'Add a PostToolUse hook that logs every WebSearch and CRM call made by the report agent so reviewers can audit reports afterwards.'
    ],
    answer: [1],
    explanation: 'When tools is omitted, a subagent inherits every available tool. Agents holding tools outside their specialization tend to use them, here adding unverified figures and making an unintended write. Restrict each subagent to the tools its role needs; if a report needs new data, that is a research task routed through the coordinator.',
    rationales: [
      'A prompt rule is probabilistic, and the agent still has dozens of irrelevant tools competing for selection.',
      'Correct. Least-privilege tool scoping removes both the off-role searches and the CRM write.',
      'Partial: the CRM write and many other irrelevant tools remain available.',
      'Logging detects misuse after the report is written; it does not prevent it.'
    ],
    trap: 'Prompt rules or logging instead of tool scoping'
  },
  {
    id: 'e4-S3-10', scenario: 'S3', domain: 'D2', obj: 'O36', type: 'single', select: 1,
    stem: 'A threat-intel MCP server exposes two tools with detailed descriptions:<pre>search_reports: Full-text keyword search over analyst reports.\n  Input: free-text query. Use for actor names, campaigns, themes.\n  Do NOT use for exact indicators (hashes, IPs, domains).\nlookup_indicator: Exact-match reputation lookup for one IOC.\n  Input: SHA-256/MD5 hash, IPv4/IPv6, or FQDN.\n  Returns verdict, first_seen, related campaigns.</pre>The doc-analyst subagent\'s system prompt includes: "Before concluding anything about an indicator, always search the reports to see what analysts have said." Logs show 70% of hash checks go to <code>search_reports</code> and return fuzzy text matches. What is the most effective fix?',
    options: [
      'Merge the two tools into a single <code>query_threat_data</code> tool that detects the input type internally and routes it to the correct backend.',
      'Add six few-shot examples to the system prompt showing hashes going to <code>lookup_indicator</code> and actor names going to <code>search_reports</code>.',
      'Expand both tool descriptions further with more example queries and edge cases so that the boundary between the two tools becomes even clearer.',
      'Reword the system prompt to check indicators with <code>lookup_indicator</code>, removing the "always search the reports" instruction.'
    ],
    answer: [3],
    explanation: 'The descriptions already separate purpose, inputs and boundaries. The misrouting comes from keyword-sensitive system-prompt wording: "always search the reports" creates an association with search_reports that overrides well-written descriptions. Reviewing and rewording such instructions is the targeted fix; merging tools, adding examples, or lengthening descriptions all work around a problem that lives in the prompt.',
    rationales: [
      'A larger redesign that hides the conflict instead of removing the instruction that causes it.',
      'Examples would compete with the "always search" instruction instead of removing it, and add token overhead.',
      'The descriptions are not the weak point; more detail does not outweigh an explicit system-prompt directive.',
      'Correct. Removing the keyword-sensitive instruction lets the existing descriptions drive selection.'
    ],
    trap: 'Fixing tool descriptions when the system prompt causes misrouting'
  },
  {
    id: 'e4-S3-11', scenario: 'S3', domain: 'D5', obj: 'O18', type: 'multi', select: 2,
    stem: 'Editors of a ransomware threat report find two recurring defects. First, claims are attributed to the wrong vendor, because the web-scout returns a prose summary followed by a bibliography and synthesis guesses which source said what. Second, synthesis flags a "contradiction" between 2,100 and 4,300 leak-site victim postings, which actually come from a 2024 annual report and a 2026 H1 tracker. Which two changes to the web-scout\'s output contract address these defects? (Select 2)',
    options: [
      'Return findings as a list of objects, each carrying its own claim, a supporting evidence excerpt, and the source URL or document name.',
      'Return a self-reported confidence score from 1 to 10 for each claim so that synthesis can prefer the higher-confidence figure when they differ.',
      'Have the web-scout drop any claim that conflicts with another source it found, so synthesis receives only figures the sources agree on.',
      'Return the full text of every source page alongside the summary so that synthesis can verify attribution by reading the originals itself.',
      'Require each finding to include the source\'s publication date and the period its data covers, so that different periods are not read as conflicts.'
    ],
    answer: [0, 4],
    explanation: 'Claim-level source mappings keep attribution attached to each claim through synthesis, which fixes misattribution. Publication and data-collection dates let synthesis recognize figures from different periods as a trend or scope difference rather than a contradiction. Self-reported confidence does not repair attribution, dropping conflicts discards genuine disagreement, and full page text overwhelms the synthesis context.',
    rationales: [
      'Correct. Per-claim evidence and source metadata preserve provenance through synthesis.',
      'Confidence is poorly calibrated and does not say which source made the claim.',
      'Silently removing conflicts hides contested findings the report should present.',
      'Pushes the attribution work downstream and floods the synthesis agent\'s context.',
      'Correct. Temporal metadata prevents different collection periods from being misread as contradictions.'
    ],
    trap: 'Confidence scores or conflict suppression instead of provenance metadata'
  },
  {
    id: 'e4-S3-12', scenario: 'S3', domain: 'D5', obj: 'O18', type: 'single', select: 1,
    stem: 'A document-analysis subagent processes about 30 vendor whitepapers per competitive-intelligence run and returns, for each, a narrative of its reasoning plus quoted passages, roughly 35k tokens per document. The synthesis subagent has a 200k-token budget. Reports cover the first and last few documents well but omit findings from the middle of the set, and some claims lose their page references. What is the most effective change?',
    options: [
      'Have the analysis subagent return compact structured records per document: key findings, cited page numbers, dates and relevance.',
      'Move the synthesis subagent to a model with a larger context window so that all 30 full analyses fit within a single request.',
      'Have the synthesis subagent first condense each analysis into a short paragraph, then synthesize across the 30 resulting paragraphs.',
      'Have the coordinator truncate each analysis to its first 5,000 tokens before passing the set to synthesis so the total fits comfortably.'
    ],
    answer: [0],
    explanation: 'When a downstream agent has a limited context budget, fix the upstream contract: return structured key facts, citations and metadata instead of verbose reasoning chains. This shrinks the input by an order of magnitude, reduces lost-in-the-middle omissions, and keeps page-level provenance attached to each finding. Larger windows do not fix attention dilution, progressive summarization strips attribution, and blind truncation drops findings.',
    rationales: [
      'Correct. Structured, compact upstream output fits the budget and preserves citations.',
      'Even if the text fits, attention over a very long input still misses middle content.',
      'Condensing first loses the specific figures and page references that synthesis needs.',
      'Arbitrary truncation discards whatever appears after the cut-off, including key findings.'
    ],
    trap: 'Bigger context window instead of structured upstream output'
  },
  {
    id: 'e4-S3-13', scenario: 'S3', domain: 'D5', obj: 'O19', type: 'single', select: 1,
    stem: 'Two credible sources disagree on initial-access vectors. An incident-response vendor reports that 38% of its 2026 H1 engagements (n=610) began with VPN appliance exploitation; a national cyber agency reports 21% across all incidents reported to it in 2025 (n=4,900). The synthesis subagent currently writes "approximately 30% of intrusions begin with VPN exploitation." How should synthesis handle this?',
    options: [
      'Use the agency figure, because its much larger sample size makes it the statistically more reliable estimate of the underlying rate.',
      'Report a sample-size-weighted average of the two figures, and note in a footnote that the underlying sources differed in their estimates.',
      'Report both figures with attribution, period and population, place them under contested findings, and note the difference in method.',
      'Send a subagent to find a third source and report whichever of the two figures that third source is closer to, as a tie-breaker.'
    ],
    answer: [2],
    explanation: 'Conflicting statistics from credible sources should be preserved and annotated with attribution and methodological context, not collapsed. These figures measure different populations (one vendor\'s IR engagements vs. all incidents reported to an agency) over different periods, so both can be accurate. Averaging, choosing by sample size, or tie-breaking with a third source each manufactures certainty the evidence does not support.',
    rationales: [
      'Sample size does not make a different population the "right" answer; the vendor data may better reflect serious intrusions.',
      'An average of two differently scoped measurements describes nothing real, and a footnote does not undo the invented figure.',
      'Correct. Both values stay visible with the context readers need to interpret them.',
      'A third figure is just another data point with its own scope; it does not resolve which population the reader cares about.'
    ],
    trap: 'Collapsing conflicting statistics into one number'
  },
  {
    id: 'e4-S3-14', scenario: 'S3', domain: 'D5', obj: 'O19', type: 'single', select: 1,
    stem: 'A competitive-intelligence report states as fact: "Competitor X will launch its EU data-residency offering in Q2." The only source for Q2 is a single analyst blog; Competitor X\'s own 10-Q says "planned for the second half of the year," and a job posting references a Q4 go-live. Leadership made a pricing decision on the Q2 claim. Which change to the synthesis instructions best prevents this class of error?',
    options: [
      'Instruct synthesis to omit any claim that is supported by fewer than two independent sources, so that only corroborated statements reach the report.',
      'Require separate sections for well-established and contested or single-source findings, keeping each source\'s wording and type (filing, blog).',
      'Instruct synthesis to attach a self-assessed confidence score from 1 to 10 to every sentence and highlight any sentence that scores below 6.',
      'Add a general instruction telling synthesis to be cautious and conservative when it reports speculative or forward-looking competitor claims.'
    ],
    answer: [1],
    explanation: 'Synthesis should preserve source-level uncertainty: distinguish well-established findings from contested or single-source ones, and keep each source\'s own characterization ("planned for H2" per a regulatory filing, "Q2" per a blog) with its methodological context. Readers can then weigh the evidence. Omitting single-source claims hides useful early signals, self-rated confidence is poorly calibrated, and vague caution does not change behavior reliably.',
    rationales: [
      'Discards potentially valuable single-source intelligence instead of labeling it.',
      'Correct. Structural separation plus original characterization exposes the conflict and its sources.',
      'Self-assessed scores are not calibrated and still present the claim without its conflicting evidence.',
      'Vague guidance does not define how conflicts or source types must be represented.'
    ],
    trap: 'Suppressing or vaguely hedging instead of structuring uncertainty'
  },
  {
    id: 'e4-S3-15', scenario: 'S3', domain: 'D5', obj: 'X06', type: 'single', select: 1,
    stem: 'The doc-analyst subagent queries a members-only ISAC portal through an MCP tool. In one run the portal returned <code>403 membership expired</code>; the subagent returned <code>{ "status": "success", "advisories": [] }</code>, and the final report stated "No ISAC advisories exist for this actor." Which error-handling design is correct?',
    options: [
      'Return a structured, non-retryable permission error with the attempted query and any partial results; the coordinator proceeds and notes the coverage gap.',
      'Retry the portal call up to five times with exponential backoff inside the subagent, and return the empty advisory list as the result only if every attempt still fails.',
      'Treat the permission failure as fatal and terminate the entire research run, so that no report is ever published without ISAC coverage.',
      'Have the subagent fall back to WebSearch for the portal\'s advisories and return whatever public copies it finds, marked as a success.'
    ],
    answer: [0],
    explanation: 'An access failure is not a valid empty result. Returning [] as success silently suppresses the error and turns a coverage gap into a false claim. The subagent should propagate a structured error (category, retryability, what was attempted, partial results) so the coordinator can continue with what it has and annotate the report\'s coverage gap. Retrying a permission error wastes attempts, and terminating the run discards all the valid work.',
    rationales: [
      'Correct. Structured error context enables recovery decisions and honest coverage annotation.',
      'Permission errors are not transient; retries waste time and still end in the same silent empty result.',
      'Whole-workflow termination on one failed source throws away valid findings from other sources.',
      'Masks the failure as success and swaps in unvetted sources outside the subagent\'s role.'
    ],
    trap: 'Silent empty result vs. whole-workflow termination'
  }
]);
