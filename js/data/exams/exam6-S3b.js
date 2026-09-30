/* Practice Exam 6, Scenario S3 (Multi-Agent Research System), items 09-15 */
CCAR.addQuestions('exam6', [
  {
    id: 'e6-S3-09', scenario: 'S3', domain: 'D2', obj: 'O36', type: 'single', select: 1,
    stem: `<p>Juniper Labs, a biotech company, runs a competitive-intelligence system on the Claude Agent SDK. Its document-analysis subagent reads competitors' clinical-trial registrations, conference posters and investor decks through a single tool:</p>
<pre>{
  "name": "analyze_document",
  "description": "Analyzes a document.",
  "input_schema": {
    "type": "object",
    "properties": {
      "doc_id": { "type": "string" },
      "instructions": { "type": "string" }
    },
    "required": ["doc_id", "instructions"]
  }
}</pre>
<p>Behind the tool, the backend can do three different jobs: extract specific data points such as enrollment or primary endpoints, summarize a named section, or check whether a claim is supported by the document. Traces show the subagent sending vague instructions such as "analyze thoroughly" and receiving 1,500-word summaries when it needed one number. Claim checks come back as free text in varying shapes ("mostly consistent", "see page 4", "yes, with caveats"), so the synthesis step cannot tell supported claims from unsupported ones. The backend team says it can expose each job as a separate endpoint this sprint. Last month the subagent moved to Sonnet 5.5, and the document store migrated to a new bucket without problems.</p>
<p>Which redesign most improves reliability?</p>`,
    options: [
      `Keep the single tool but expand its description to list the three jobs with an example instruction for each, so the subagent writes precise instructions and the backend returns what it actually needs.`,
      `Add few-shot examples of well-written instruction strings to the subagent's system prompt, showing how to ask <code>analyze_document</code> for one data point, one section summary or one claim check.`,
      `Split the tool into <code>extract_data_points</code>, <code>summarize_section</code> and <code>verify_claim_against_source</code>, each with a defined output contract and guidance on when to use it.`,
      `Replace the tool with Read access to the raw PDF files, so the subagent extracts numbers, summarizes sections and checks claims itself without depending on how the backend interprets requests.`
    ],
    answer: [2],
    explanation: `Generic tools with free-form instructions produce unpredictable inputs and outputs. The exam guide's remedy is to split a generic tool into purpose-specific tools with defined input and output contracts, for example splitting <code>analyze_document</code> into tools that extract data points, summarize content and verify a claim against the source. Here the backend already does three distinct jobs, but one vague interface hides them: the subagent must invent instructions, and results arrive in whatever shape the backend chooses, which is why synthesis cannot read the claim checks. Separate tools make each job selectable by name and description, take typed inputs (fields to extract, a section name, the claim text) and return fixed structures, such as a supported, unsupported or partial verdict with the supporting excerpt. A richer description or few-shot examples improve the instructions but keep one free-form interface with inconsistent outputs. Raw PDF reads move all three jobs into the model's context at high token cost with no contracts. The Sonnet 5.5 move and the bucket migration are noise.`,
    rationales: [
      `A better description helps the subagent write instructions, but results still come back in free-form shapes, so synthesis still cannot tell supported claims from unsupported ones.`,
      `Examples steer instruction wording probabilistically, while the single interface still returns whatever shape the backend chooses, including free-text claim verdicts.`,
      `Correct. Three purpose-specific tools give typed inputs and fixed outputs, so the subagent asks for one number when it needs one and synthesis receives explicit claim verdicts.`,
      `Reading raw PDFs puts whole documents into context and removes every output contract, so claim checks become even less consistent and far more expensive.`
    ],
    trap: `Improving a vague generic tool instead of splitting it into purpose-specific contracts`,
    signals: `Decisive: one tool with a free-form instructions string hides three distinct backend jobs, outputs come back in varying shapes, and the backend can expose separate endpoints this sprint. Noise: the move to Sonnet 5.5 and the uneventful bucket migration.`
  },
  {
    id: 'e6-S3-10', scenario: 'S3', domain: 'D2', obj: 'X04', type: 'single', select: 1,
    stem: `<p>The Everly Institute's research system gives its literature-review subagents a custom MCP tool, <code>search_literature</code>, that queries three academic databases. Over 30 days of traces, calls failed or came back empty for four different reasons: database timeouts on about 4% of calls, license exclusions that block full text from one publisher, date filters the agent wrote in an invalid format, and searches that genuinely match nothing. Today the tool reports them like this:</p>
<pre>// timeout, license exclusion, invalid date filter
{ "isError": true, "content": [{ "type": "text", "text": "Operation failed" }] }

// no matching papers
{ "content": [{ "type": "text", "text": "[]" }] }</pre>
<p>The consequences show up in cost and quality. Subagents retry license exclusions again and again, which consumes about 30% of the search budget. After a timeout they usually give up, although a second attempt succeeds 90% of the time. When a search legitimately finds nothing, they often assume something broke and launch broader searches that return off-topic papers. The databases' own uptime has been 99.7% this year, and the team is about to add a fourth database.</p>
<p>Which change to the tool's responses best enables correct recovery?</p>`,
    options: [
      `Retry every failure inside the tool up to five times with backoff before returning, and only then report "Operation failed", so the subagents see far fewer errors and stop spending their own attempts.`,
      `Return <code>isError</code> with an errorCategory (transient, permission, validation), isRetryable true only for timeouts and an actionable message, and keep true no-match results as successful.`,
      `Return an empty result list for every failure as well as for genuine no-match searches, so that subagents never enter retry loops and simply move on to the next planned query in their research.`,
      `Raise an exception from the tool whenever any database call fails, so the research run stops at once and an engineer can investigate before the subagents waste any more of the search budget.`
    ],
    answer: [1],
    explanation: `MCP tools should return structured error metadata so the agent can choose the right recovery: the <code>isError</code> flag with an error category, an isRetryable flag and a human-readable message, while valid empty results stay successful. The four cases need four different reactions. A timeout is transient and worth one retry, which succeeds 90% of the time. A license exclusion is a permission error that no retry can fix, and the message can point to an alternative such as the abstract. An invalid date filter is a validation error the agent should correct before calling again. A search that matches nothing is a successful answer, and treating it as failure causes the off-topic broadening. The single "Operation failed" string makes the three failures look alike, and the bare empty array cannot be told apart from breakage. Retrying inside the tool wastes attempts on permanent errors and still hides the cause, empty results for failures suppress errors, and exceptions end the whole run over one call. Uptime and the fourth database are noise.`,
    rationales: [
      `Five internal retries waste attempts on license exclusions and invalid filters that can never succeed, and the final generic message still hides which kind of failure happened.`,
      `Correct. Categories and isRetryable let subagents retry timeouts once, stop retrying license exclusions, fix bad filters, and trust genuine empty results instead of broadening the search.`,
      `Reporting failures as empty results suppresses them: subagents would conclude that no literature exists for topics that only timed out or were blocked by the license.`,
      `Stopping the whole run over one failed call discards the other subagents' work, although most failures here are recoverable once the subagent knows what went wrong.`
    ],
    trap: `Uniform errors, silent empties or exceptions instead of structured, categorized errors`,
    signals: `Decisive: one generic "Operation failed" covers three failures that need different reactions (retry, stop, fix the input), and a bare empty array looks the same as breakage. Noise: the databases' 99.7% uptime and the planned fourth database.`
  },
  {
    id: 'e6-S3-11', scenario: 'S3', domain: 'D5', obj: 'O18', type: 'single', select: 1,
    stem: `<p>Cobalt Research produces evidence reviews on health-care delivery for insurers. Its Claude Agent SDK system sends each of 15 papers to a document-analysis subagent, which returns a prose summary of 2,500 to 4,000 words. A synthesis subagent then combines the summaries into a review. To keep runs affordable, the synthesis subagent's input is capped at about 60k tokens, so the coordinator trims the longer summaries to fit.</p>
<p>A quality audit of the last six reviews found three recurring errors. Statistics are attributed to the wrong paper; one review credited a 21% readmission reduction to a 2024 randomized trial when it came from a 2019 observational study. Publication years disappear, so older findings read as current. And the reviews treat randomized trials and observational studies as equally strong evidence, although each summary mentions the design somewhere in its prose. Reviewers add that the summaries themselves are well written, and the insurer client recently asked for every review to open with a one-page executive summary.</p>
<p>Which change to the document-analysis subagent's output best fixes the audit findings?</p>`,
    options: [
      `Shorten each paper summary to about 300 words so all 15 fit easily within the synthesis budget without trimming, and ask the subagent to state the most important statistics in the first paragraph.`,
      `Remove the 60k-token cap and move synthesis to a larger model, so it can read every full summary and keep track of which statistic came from which paper and from which year.`,
      `Ask the subagent to attach a self-rated confidence score from 1 to 10 to each summary, so the synthesis subagent can give stronger papers more weight and discount the weaker ones.`,
      `Return structured records per finding (claim, supporting excerpt, source and page, publication date, study design, sample size) plus a short prose overview of each paper.`
    ],
    answer: [3],
    explanation: `When downstream agents have limited context budgets, upstream agents should return structured data (key facts, citations, metadata) instead of verbose prose, and subagents should include dates, source locations and methodological context in their outputs. All three audit errors are provenance losses: in prose, the link between a number and its paper, its year and its study design is implicit, and trimming breaks it. A record per finding keeps the claim, the excerpt that supports it, the source and page, the publication date, and the design and sample size together, so synthesis can merge claim-source mappings, show dates and weigh trials against observational studies without reading 50,000 words. A short prose overview still gives synthesis each paper's narrative. Shorter prose loses even more detail. A bigger budget and model still dig claims out of long prose, where recall degrades, and cost more. A self-rated score records neither source, date nor design. The writing quality and the executive-summary request are noise.`,
    rationales: [
      `Shorter prose fixes the budget by dropping detail, so attributions, years and study designs would be lost even more often than they are now.`,
      `More context lets synthesis read everything, but claim-to-paper links stay buried in prose and recall degrades as input grows, so misattribution continues at a higher cost.`,
      `A self-rated score is not provenance: it records neither the source, the date nor the design, so synthesis still could not attribute the 21% figure correctly.`,
      `Correct. Each record binds a claim to its source, page, date and design, so synthesis can attribute statistics, show years and weigh the evidence within its limited budget.`
    ],
    trap: `Shorter prose, bigger context or self-rated confidence instead of structured claim records`,
    signals: `Decisive: every audit error is a lost link between a claim and its paper, year or study design, and synthesis works from trimmed prose under a fixed budget. Noise: the well-written summaries and the client's request for a one-page executive summary.`
  },
  {
    id: 'e6-S3-12', scenario: 'S3', domain: 'D5', obj: 'O19', type: 'single', select: 1,
    stem: `<p>The Pembrook Energy Council publishes a quarterly briefing for city planners on low-carbon heating. Its Claude Agent SDK research system searches official statistics, industry reports and academic studies, and a synthesis subagent writes the briefing from structured findings that carry the source, the date and a short methods note for each figure.</p>
<p>For this quarter's headline on heat-pump adoption in new homes, the findings include two credible figures for the same year. The national statistics office reports that 38% of homes built in 2024 have a heat pump as the primary heating system. An industry association reports 52% for 2024, and its methods note says it counts hybrid systems that pair a heat pump with a gas boiler. The draft headline reads: "About 45% of new homes built in 2024 use heat pumps." Planners use the figure to set targets for 2027, and a council member has asked why the number differs from both sources. The association's report was downloaded from a mirror site because its main site was slow, and the briefing's charts were restyled last month.</p>
<p>How should the synthesis handle these figures?</p>`,
    options: [
      `Report both figures with sources and dates, explain that the association counts hybrid systems while the statistics office does not, and present the statistic as contested rather than merged.`,
      `Use only the statistics office's 38%, because official statistics are more authoritative, and drop the association's figure so that the city planners are not confused by two different numbers.`,
      `Keep the 45% average as the headline because it sits between two credible sources, and add a footnote saying that estimates vary between organizations and depend on the methods they use.`,
      `Ask the web-search subagent to find a third credible 2024 figure and use whichever value two of the three sources agree on, so the headline reflects the majority of the available evidence.`
    ],
    answer: [0],
    explanation: `When credible sources conflict, synthesis should annotate the conflict with source attribution instead of picking or merging values, and keep the methodological context that explains the difference. The findings already carry what is needed: both figures are for 2024, and the methods note shows the gap comes from different definitions (hybrid systems counted or not), not from an error. The 45% average matches neither source and describes nothing that was measured, which is why the council member cannot reconcile it. Presenting both figures with attribution and the definitional difference lets planners choose the definition that fits their 2027 targets. Dropping the association's figure silently discards a credible source and the insight about hybrids. Averaging with a vague footnote keeps an invented number. A majority vote treats a definitional difference as a disagreement to be outvoted. The mirror download and the restyled charts are noise.`,
    rationales: [
      `Correct. Both figures are credible for 2024 and differ by definition, so attribution plus the hybrid-systems explanation lets planners pick the measure that fits their targets.`,
      `Silently dropping a credible source hides the definitional difference planners need to know about, and choosing the official figure is arbitrary for their purpose.`,
      `The average matches neither source and describes nothing anyone measured; a vague footnote does not tell planners which definition produces which number.`,
      `A third source cannot outvote a definitional difference; majority voting suppresses a legitimate measure instead of explaining why the two figures differ.`
    ],
    trap: `Averaging, picking or voting instead of annotating a conflict with its cause`,
    signals: `Decisive: both figures are for 2024, the methods note shows the association counts hybrid systems, so the difference is definitional, and the 45% headline matches neither source. Noise: the mirror-site download and the restyled charts.`
  },
  {
    id: 'e6-S3-13', scenario: 'S3', domain: 'D5', obj: 'O19', type: 'multi', select: 2,
    stem: `<p>The Calder Water Institute is preparing a policy report on microplastics for a regional water regulator. Its Claude Agent SDK research system has returned structured findings on three questions, and the team is now specifying how the synthesis subagent must present them.</p>
<p>On presence, more than 30 sources, including national monitoring programs, agree that microplastics occur in treated drinking water. On health effects the evidence is contested: two small human studies (42 and 60 participants) describe their associations as "preliminary", while a larger systematic review finds the evidence insufficient to draw conclusions. On bottled water, a 2018 study counted about 325 particles per liter, while a 2025 study reported over 100,000 per liter, largely because newer imaging detects far smaller particles. An earlier draft stated that "microplastics harm human health" and that "bottled-water contamination has increased 300-fold since 2018". The regulator's staff will quote the report in public consultations, and the report must be published in both English and Welsh.</p>
<p>Which two requirements should the synthesis output follow? (Select 2.)</p>`,
    options: [
      `Produce one confidence-weighted conclusion per question by averaging the confidence the sources express, so that each question gets a single clear answer that staff can quote.`,
      `Separate well-established findings from contested ones in distinct sections, keeping each source's own characterization, such as "preliminary", and its sample size or method.`,
      `Present every finding in one uniform bullet list with the same format and level of certainty, so the report reads consistently and no finding appears more authoritative than another.`,
      `Leave the contested health-effect studies out of the report until a scientific consensus emerges, so public consultations are not swayed by findings that may later be overturned.`,
      `Carry publication and data-collection dates and measurement-method notes in the claim records, so the 2018 and 2025 bottled-water counts read as a method change, not a contradiction.`
    ],
    answer: [1, 4],
    explanation: `Synthesis should preserve source-level uncertainty instead of flattening it. The report needs distinct sections for well-established and contested findings, keeping each source's own characterization and methodological context: presence in drinking water is supported by more than 30 sources, while the health-effect evidence rests on two small studies that call themselves preliminary and a review that finds it insufficient. The earlier draft's "microplastics harm human health" collapsed that distinction. Dates and method notes matter for the bottled-water figures, which differ mainly because newer imaging detects smaller particles; without them, synthesis misreads a temporal and methodological change as a 300-fold increase. Averaging confidence produces a conclusion no source supports. A uniform list hides which findings are settled and which are contested. Excluding contested studies suppresses legitimate evidence that the regulator needs to see, labeled as uncertain. The bilingual publication requirement is noise.`,
    rationales: [
      `Averaging confidence collapses the disagreement into one conclusion that neither the small studies nor the systematic review supports, which is exactly the earlier draft's error.`,
      `Correct. Settled findings on presence and contested ones on health effects need separate sections, and keeping "preliminary" and the sample sizes shows readers why the evidence is weak.`,
      `A uniform list gives the 30-source consensus and two small studies the same standing on the page, hiding the distinction the regulator's staff need when they quote the report.`,
      `Omitting contested studies suppresses legitimate evidence; the regulator needs to know the question is open, with the uncertainty stated, not a report that looks settled.`,
      `Correct. With dates and method notes attached, synthesis can explain that newer imaging detects smaller particles instead of reporting a 300-fold rise in contamination.`
    ],
    trap: `Collapsing, flattening or suppressing uncertainty instead of structuring it`,
    signals: `Decisive: presence is supported by more than 30 sources, health effects rest on two small preliminary studies and an inconclusive review, and the bottled-water gap comes from newer imaging. Noise: the requirement to publish in English and Welsh.`
  },
  {
    id: 'e6-S3-14', scenario: 'S3', domain: 'D5', obj: 'O19', type: 'single', select: 1,
    stem: `<p>Marlowe Intelligence sells market-sizing reports to venture investors. In its Claude Agent SDK system, a document-analysis subagent extracts figures from analyst reports, filings and trade publications, and the coordinator passes the results to a synthesis subagent. Until April, the analysis output flagged conflicts explicitly:</p>
<pre>{ "metric": "EU e-bike market 2025", "conflict_detected": true,
  "values": [
    { "value": "EUR 18.2B", "source": "Analyst report A, p. 12", "date": "2025-03" },
    { "value": "EUR 23.9B", "source": "Trade association B, p. 4", "date": "2025-01" } ] }</pre>
<p>In April an engineer changed the analysis prompt to "resolve conflicts before returning results, keeping the most credible source," to shorten the synthesis input. Since then every record carries a single value, and <code>conflict_detected</code> is always false. Last week a client noticed that a report's EUR 18.2B figure left out the association's EUR 23.9B, although the report cited the association as a source; the higher figure includes cargo e-bikes, which matters to the client's investment thesis. The coordinator's logs show it has not seen a disagreement since April. Separately, synthesis latency fell by 12%, and the team renamed the analysis subagent from doc-reader to doc-analyst.</p>
<p>Which change best prevents a repeat?</p>`,
    options: [
      `Keep conflict resolution in the analysis subagent but have it log each dropped value and its source to a debug file, so engineers can review the discarded figures whenever a client raises a question.`,
      `Have the synthesis subagent re-search every figure independently before writing, so it can confirm or replace the value the analysis subagent kept and catch any figure that was wrongly discarded.`,
      `Have the analysis subagent return conflicting values with their sources, dates and methods, and let the coordinator decide how to reconcile them before anything is passed to synthesis.`,
      `Give the analysis subagent a more detailed credibility rubric that ranks analysts, filings and trade associations, so it keeps the right source more often when it resolves a conflict.`
    ],
    answer: [2],
    explanation: `Document analysis should finish with conflicting values included and explicitly annotated, and the coordinator should decide how to reconcile them before passing results to synthesis. The April change moved that decision into the analysis subagent and made it silent: the coordinator lost visibility, <code>conflict_detected</code> stopped firing, and a legitimate figure with a different scope (cargo e-bikes included) vanished even though the report cited its source. Restoring annotated conflicts with sources, dates and methods lets the coordinator decide, whether that means presenting both values, explaining the scope difference or requesting more research, and synthesis then receives an explicit, reconciled input. A debug log keeps the discarded value away from both the coordinator and the report. Re-searching every figure in synthesis duplicates the research role. A better rubric keeps the resolution silent, so even a defensible choice can hide information a client needs. The latency gain and the rename are noise.`,
    rationales: [
      `A debug log keeps the dropped figure invisible to the coordinator and the report; engineers would learn about conflicts only after a client complains, as happened last week.`,
      `Synthesis would duplicate the research role for every figure, adding cost and new sources of error, while the analysis step still hides the disagreements it resolves.`,
      `Correct. Annotated conflicts restore the coordinator's visibility, so it can present both values or explain the cargo scope difference instead of one silently disappearing.`,
      `A sharper rubric changes which value survives, but the resolution stays silent, so a figure with a different but legitimate scope can still vanish without anyone deciding.`
    ],
    trap: `Silent conflict resolution inside the analysis agent`,
    signals: `Decisive: since the April prompt change every record carries one value, <code>conflict_detected</code> is always false, and the coordinator has not seen a disagreement since. Noise: the 12% drop in synthesis latency and the subagent's rename.`
  },
  {
    id: 'e6-S3-15', scenario: 'S3', domain: 'D5', obj: 'X06', type: 'single', select: 1,
    stem: `<p>Altamira Trade Advisory tracks export-control rules for semiconductor equipment across six jurisdictions for its manufacturing clients. In its Claude Agent SDK system, the coordinator gives a regulatory-search subagent one jurisdiction per subtask, then passes the findings to a synthesis subagent that writes a monthly compliance brief.</p>
<p>In this month's run the subagent covered the United States, the European Union, Taiwan and South Korea normally. For Japan and the Netherlands, the regulatory database it queries timed out; the subagent retried each query three times with backoff, then gave up. Before the timeouts it had found two relevant Japanese notices through general web search, but for the Netherlands it has nothing. For failed subtasks it currently returns only the string "search unavailable". Depending on the coordinator's version, the run then either aborts entirely, or continues and publishes a brief that reads as if all six jurisdictions were covered. Official government gazettes for both countries are reachable. The database vendor now reports that the outage is over, and the client portal is being redesigned this quarter.</p>
<p>Which error-handling design best supports recovery and an honest brief?</p>`,
    options: [
      `Have the subagent return an empty result set marked as successful for any jurisdiction it cannot search, so the run never aborts and synthesis writes the brief from whatever it received.`,
      `Return structured error context (failure type, queries tried, retries, partial results, alternatives such as official gazettes), let the coordinator decide, and mark the gaps in the brief.`,
      `Have the coordinator abort the whole run whenever any subagent reports a failure, so clients never receive a brief missing a jurisdiction and the team can rerun it after the outage.`,
      `Have the subagent keep retrying the regulatory database with exponential backoff until it responds, however long that takes, so every jurisdiction is covered from the same source.`
    ],
    answer: [1],
    explanation: `Subagents should recover locally from transient failures and propagate only what they cannot resolve, with structured context: the failure type, what was attempted, any partial results and possible alternatives. The subagent already did the local part with three retries and backoff. What it passes up is the problem: "search unavailable" hides that Japan has two partial findings, that the Netherlands has none, and that gazettes are reachable. With structured context, the coordinator can re-delegate a gazette search, retry the database now that the vendor reports recovery, or proceed, and synthesis marks which jurisdictions are well supported and which have gaps due to unavailable sources, so the brief is honest either way. Returning empty success suppresses the failure and produces today's misleading brief. Aborting discards four complete jurisdictions over one outage. Retrying without limit blocks the run on a single source when alternatives exist. The portal redesign is noise.`,
    rationales: [
      `Empty success is silent suppression: it produces exactly today's misleading brief, which reads as if Japan and the Netherlands had been covered.`,
      `Correct. Structured context lets the coordinator re-delegate to the gazettes or proceed, and coverage annotations tell clients which jurisdictions have gaps and why.`,
      `Aborting throws away four complete jurisdictions and the partial Japanese findings over one database outage, although alternatives for both gaps are reachable.`,
      `Retrying without limit blocks the whole brief on one source, and the coordinator still learns nothing about the partial results or the gazette alternative.`
    ],
    trap: `Silent suppression, whole-run abort or endless retries instead of structured error context`,
    signals: `Decisive: local retries were already exhausted, the subagent returns only "search unavailable" although it holds partial Japanese results, and the gazettes are reachable. Noise: the vendor's report that the outage is over and the client-portal redesign.`
  },
]);
