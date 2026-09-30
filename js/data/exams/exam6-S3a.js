/* Practice Exam 6, Scenario S3 (Multi-Agent Research System), items 01-08 */
CCAR.addQuestions('exam6', [
  {
    id: 'e6-S3-01', scenario: 'S3', domain: 'D1', obj: 'O10', type: 'single', select: 1,
    stem: `<p>Ashgrove Capital, a mid-market private equity firm, prepares first-pass due-diligence briefs on acquisition targets with a research system built on the Claude Agent SDK. For each target the system covers five research streams: SEC and state filings, litigation history, the patent portfolio, news coverage from the past 24 months, and the backgrounds of the executive team. A risk-synthesis step then weighs all five streams together, and a report step formats the brief for the deal team.</p>
<p>Today the stages run as a fixed sequential pipeline, one stream after another, and a brief takes 48 minutes on average. The deal team's new SLA is 15 minutes. Each stream takes 6 to 11 minutes on its own, and none of them needs another stream's output. Last month the litigation database was down for an afternoon; the pipeline stopped at that stage and produced no brief at all, although the other four streams would have worked. Partners have said they would rather receive a brief that clearly marks a missing stream than no brief. In August the firm also moved the report step from Sonnet 5.5 to Haiku 4.5, which saved about 40 seconds per brief.</p>
<p>Which orchestration best meets the latency, coverage and reliability requirements?</p>`,
    options: [
      `Keep the sequential pipeline but move every research stage to Haiku 4.5, as was done for the report step, so that each stream runs faster and the total time drops toward the 15-minute target.`,
      `Have the coordinator spawn the five research subagents in parallel with several Task calls in one response, collect results or structured errors, then run synthesis and the report with gaps marked.`,
      `Let the five research subagents write findings into a shared document as they go, and start the report agent once the document looks complete, so that no coordinator process sits in the critical path of the brief.`,
      `Start the five research streams, risk synthesis and the report all at the same moment, so the brief is ready as soon as the slowest stream finishes and total time stays close to 11 minutes.`
    ],
    answer: [1],
    explanation: `Independent subtasks followed by a dependent stage call for a coordinator-worker design: fan the independent work out in parallel, then run the dependent steps in order. None of the five streams needs another's output, so the coordinator can spawn all five subagents with multiple Task tool calls in a single response (the tool is named Agent in current SDK releases). Research time then falls from the sum of the streams, about 48 minutes, to roughly the slowest one, about 11 minutes, which leaves room for synthesis and the report inside 15 minutes. Routing every result through the coordinator also meets the reliability requirement: a failed stream returns structured error context, and the coordinator still runs synthesis with the gap annotated instead of stopping. A faster model shortens stages but keeps the times additive, and starting synthesis alongside research ignores that it needs all five streams. The Haiku 4.5 switch for the report step is noise.`,
    rationales: [
      `A faster model shortens each stage, but a sequence still adds five stream times together, and a failed stage would still stop the pipeline and leave the partners with no brief.`,
      `Correct. Parallel Task calls cut research time to about the slowest stream, and results or structured errors return to the coordinator, which runs synthesis and marks any missing stream.`,
      `Without a coordinator nobody decides when research is complete, handles a failed stream or records a gap, so a partial document could be formatted and sent as if it were a full brief.`,
      `Risk synthesis needs all five streams, so starting it at the same moment as research means it works from empty or partial inputs, and the report inherits every one of those gaps.`
    ],
    trap: `Sequential chain, peer-to-peer sharing or an ignored dependency instead of parallel coordinator-worker`,
    signals: `Decisive: the five streams are independent, synthesis needs all five, the SLA is 15 minutes against 6 to 11 minutes per stream, and partners want a brief with the gap marked rather than no brief. Noise: the report step's move to Haiku 4.5, which saved seconds, not the 33 minutes that matter.`
  },
  {
    id: 'e6-S3-02', scenario: 'S3', domain: 'D1', obj: 'O10', type: 'multi', select: 2,
    stem: `<p>The Lumen Policy Institute gives its 120 analysts a research assistant built on the Claude Agent SDK. A coordinator sends every request through the same four subagents in order: web search, document analysis, synthesis and report writing. An audit of 2,400 requests from the last quarter found two problems.</p>
<p>First, about 60% of requests are simple factual questions, such as "When did the EU AI Act's obligations for general-purpose AI models start to apply?" Each one still runs all four subagents, takes about three minutes and costs roughly twelve times as much as the search subagent answering alone. Second, about one complex report in five misses a subtopic the analyst expected. For a report on regional housing policy, the coordinator's plan listed five subtopics, but the synthesis covered only three; the gap is visible as soon as the synthesis is compared with that plan. Analysts rate the writing quality of the reports highly, and the system moved from Sonnet 5.5 to Opus 5.5 in June.</p>
<p>Which two changes to the coordinator address both problems? (Select 2.)</p>`,
    options: [
      `Have the coordinator assess each request's complexity and invoke only the subagents it needs, so a simple factual question can be answered by the search subagent without running the full pipeline.`,
      `Put a keyword classifier in front of the coordinator that sends short factual questions straight to the search subagent, so simple requests skip the coordinator and its planning step entirely.`,
      `After synthesis, have the coordinator compare the output with its planned subtopics, re-delegate targeted queries for any missing ones, and re-run synthesis until the coverage criteria are met.`,
      `Let the synthesis subagent call the search subagent directly whenever it notices a missing subtopic, so gaps are filled inside synthesis without another round trip through the coordinator.`,
      `Raise every subagent's maxTurns so that each one researches its assignment more exhaustively, which makes it more likely that all of the planned subtopics are covered in the first pass.`
    ],
    answer: [0, 2],
    explanation: `A coordinator should decide which subagents a request needs and check whether the result covers its plan. For the first problem, assessing query complexity and invoking only the necessary subagents lets a simple fact go to the search subagent alone instead of paying for four stages; Anthropic's multi-agent research guidance scales effort to the query, with simple facts handled by one agent and a few tool calls. For the second, the gap is detectable by comparing synthesis with the plan, so the coordinator can run an iterative refinement loop: find missing subtopics, re-delegate targeted queries to search and analysis, and re-run synthesis until coverage is sufficient. A keyword classifier in front of the coordinator guesses complexity from wording and removes those requests from the coordinator's observability. Letting synthesis call search directly creates traffic the coordinator cannot see. More turns deepen work on what each subagent was given, not on subtopics synthesis never covered. The ratings and the model move are noise.`,
    rationales: [
      `Correct. Selecting subagents by complexity lets the search subagent answer the 60% of simple questions alone, which removes most of the three-minute, twelvefold cost of the full pipeline.`,
      `A classifier in front of the coordinator guesses complexity from wording and moves those requests outside the coordinator's observability and error handling, which the design is meant to centralize.`,
      `Correct. The gap is detectable against the coordinator's own plan, so evaluating synthesis, re-delegating the missing subtopics and re-running synthesis closes it before the report is written.`,
      `Direct calls from synthesis to search bypass the coordinator, so it can no longer track what was searched, handle failures consistently or explain why the report changed.`,
      `More turns make each subagent dig deeper into its own assignment, but the missing subtopics never reached synthesis, and the cost of the simple questions would grow further.`
    ],
    trap: `Bypassing the coordinator or adding effort instead of dynamic selection and a coverage loop`,
    signals: `Decisive: 60% of requests are simple facts that still run all four subagents, and the missing subtopics are visible when synthesis is compared with the coordinator's own plan. Noise: the high ratings for writing quality and the June move to Opus 5.5, neither of which touches routing or coverage.`
  },
  {
    id: 'e6-S3-03', scenario: 'S3', domain: 'D1', obj: 'O06', type: 'single', select: 1,
    stem: `<p>Meridian Advisory runs a market-research coordinator on the Claude Agent SDK. It delegates to three subagents: <code>web-researcher</code>, <code>filings-analyst</code> and <code>synthesizer</code>. Two weeks ago an experimental subagent defined without a <code>tools</code> list inherited every tool, spawned subagents of its own in a loop and burned $900 overnight, so the platform team added shared options to every <code>query()</code> call in the service:</p>
<pre>const baseOptions = {
  disallowedTools: ["Task", "Bash"],
  maxBudgetUsd: 4
};

const run = query({ prompt: brief, options: {
  ...baseOptions,
  allowedTools: ["Task", "WebSearch", "WebFetch", "Read", "Write"],
  agents: {
    "web-researcher":  { description: "Finds recent public sources on a named market segment",
                         prompt: WEB_PROMPT, tools: ["WebSearch", "WebFetch"] },
    "filings-analyst": { description: "Extracts figures from annual reports saved in ./filings",
                         prompt: FILINGS_PROMPT, tools: ["Read", "Grep"] },
    "synthesizer":     { description: "Combines structured findings into a cited draft",
                         prompt: SYNTH_PROMPT, tools: ["Read", "Write"] }
  }
}});</pre>
<p>Since the change, traces show zero Task calls. The coordinator runs every web search itself, its context passes 400k tokens on large briefs, and reports have become thinner. Budgets are not being hit: typical runs end at about $1.80. The subagent descriptions have not changed since spring, when delegation worked well, and the team upgraded the SDK to its latest release the same week as the change.</p>
<p>What is the root cause, and which fix keeps the protection against runaway spawning?</p>`,
    options: [
      `The $4 budget in <code>baseOptions</code> is below what a delegating run can cost, so the SDK declines to start subagents; raising <code>maxBudgetUsd</code> to $10 restores delegation without other changes.`,
      `The descriptions are too short to compete with the coordinator's own search tools, so it never picks a subagent; adding "use proactively for all research" to each description restores delegation.`,
      `The coordinator holds WebSearch and WebFetch, so it prefers to research by itself; removing both from its <code>allowedTools</code> forces it to hand every search to <code>web-researcher</code>.`,
      `<code>disallowedTools</code> blocks Task even though <code>allowedTools</code> lists it, so the coordinator cannot spawn anything; drop Task from its deny list and keep Task out of every subagent's tools.`
    ],
    answer: [3],
    explanation: `In the Agent SDK, <code>disallowedTools</code> blocks a tool regardless of <code>allowedTools</code>, and subagents are spawned only through the Task tool (named Agent in current releases). Spreading <code>baseOptions</code> into the coordinator removed the one tool it needs to delegate, which matches the trace: zero Task calls, every search done inline and a ballooning context. The protection the platform team wanted concerns subagents spawning children, and that is controlled by each subagent's own <code>tools</code> list: the runaway agent had no list, so it inherited everything. A subagent whose list omits Task cannot spawn anything, and all three definitions already omit it. Budgets are not the cause, because runs end near $1.80. No description wording can route work through a tool the coordinator is denied, and removing the coordinator's search tools would leave it unable to research while delegation stays blocked. The SDK upgrade is noise that happened to coincide with the change.`,
    rationales: [
      `Runs end near $1.80, well under the $4 cap, and a budget limits spending as a run proceeds; it does not stop the coordinator from spawning subagents in the first place.`,
      `The descriptions have not changed since spring, when delegation worked, and no wording can make the coordinator use a tool that <code>disallowedTools</code> has removed.`,
      `Removing the search tools leaves the coordinator unable to research while Task stays blocked, so briefs get worse and still no subagent starts.`,
      `Correct. The deny list overrides the allow list for Task, which explains zero spawns, while explicit subagent tools lists without Task are what prevent runaway nested spawning.`
    ],
    trap: `Tuning budget, descriptions or tools when a deny rule blocks the spawning tool`,
    signals: `Decisive: <code>baseOptions</code> puts Task in <code>disallowedTools</code> and is spread into the coordinator's options, and zero Task calls began with that change. Noise: the unchanged descriptions, the SDK upgrade in the same week, and the $4 budget, which typical runs never reach.`
  },
  {
    id: 'e6-S3-04', scenario: 'S3', domain: 'D1', obj: 'O04', type: 'single', select: 1,
    stem: `<p>Solstice Health Economics uses a research system built on the Claude Agent SDK to prepare evidence summaries for hospital purchasing committees. The coordinator delegates source discovery to a web-search subagent with a prompt that has grown to 14 numbered steps over the past year. An excerpt:</p>
<pre>1. Search Google Scholar for "&lt;therapy&gt; cost-effectiveness".
2. Take the top 5 results by citation count.
3. For each result, fetch the abstract and record the year.
4. If fewer than 3 results are from the last 5 years, search PubMed.
5. If still fewer than 3, search news sites for "&lt;therapy&gt; price".
...
14. Return the URLs you collected as a bulleted list.</pre>
<p>Reviewers see three recurring failures. For medical devices, the best evidence sits in reports from health-technology-assessment agencies that neither Scholar nor PubMed ranks highly, so the subagent never finds them. When step 2 already surfaces a recent meta-analysis that answers the committee's question, the subagent keeps working through steps 3 to 13 and pads the list with weaker studies. For rare-disease therapies, the steps return mostly irrelevant results. Separately, the committee chair has asked for summaries as PDF instead of Word from next month.</p>
<p>Which change to the delegation is most effective?</p>`,
    options: [
      `Replace the procedure with the research goal, the committee's questions, source-quality criteria such as recency, scope boundaries and the output format, and let the subagent choose how to search.`,
      `Extend the procedure with branches for medical devices, rare-disease therapies and early meta-analysis hits, so that each known failure case has an explicit step telling the subagent what to do next.`,
      `Replace the 14 steps with one instruction to "research the cost-effectiveness of the therapy", so the subagent has full freedom to decide where to search and what to hand back to the coordinator.`,
      `Move the 14-step procedure out of the delegation prompt into the subagent's system prompt, so it applies consistently on every call and the coordinator's delegation prompts become much shorter.`
    ],
    answer: [0],
    explanation: `Coordinator prompts work best when they state research goals and quality criteria instead of step-by-step procedures, because goals let a subagent adapt to what it finds. All three failures come from the procedure itself: it names the sources in advance, so agency reports are never tried; it has no notion of enough, so a sufficient meta-analysis does not end the search; and it cannot anticipate rare-disease topics. Delegating the goal, the committee's questions, explicit quality criteria, boundaries and the output format lets the subagent search agency sites for devices and stop when the criteria are met, while the coordinator still defines what a good answer is and what comes back. Adding branches patches known cases and fails on the next unanticipated one. A bare topic drops the criteria and output contract the coordinator needs. Moving the steps into the system prompt keeps the same rigidity. The PDF request is noise.`,
    rationales: [
      `Correct. Goals and criteria let the subagent look in agency reports for devices and stop at a sufficient meta-analysis, while the output format keeps the coordinator in control of the results.`,
      `Each branch patches one known failure, but the procedure still dictates sources and steps, so the next unanticipated topic fails the same way and the prompt keeps growing.`,
      `A bare topic gives freedom but no quality criteria, boundaries or output format, so the coordinator cannot judge, compare or combine what the subagent returns.`,
      `Relocating the steps changes where the procedure lives, not what it does, so the subagent would still skip agency reports and pad its lists on every call.`
    ],
    trap: `Patching or relocating a procedural script instead of delegating goals and criteria`,
    signals: `Decisive: each failure traces to the fixed steps: sources named in advance, no stopping condition once the question is answered, and no fit for niche topics. Noise: the chair's request for PDF delivery, which concerns formatting after the research is done.`
  },
  {
    id: 'e6-S3-05', scenario: 'S3', domain: 'D1', obj: 'O04', type: 'single', select: 1,
    stem: `<p>Ironwood Markets, a commodities research firm, rebuilt the delegation in its Claude Agent SDK research system after a consultant criticized its rigid step-by-step subagent prompts. The coordinator now sends each of four search subagents the same goal-only brief: "Find everything important about the economics of lithium-ion battery recycling."</p>
<p>The first month of reports shows new problems. Two subagents both researched hydrometallurgical processing costs in depth and returned overlapping sources, while none covered collection and transport logistics, which clients consider the largest cost. One subagent spent 40 tool calls on electric-vehicle sales forecasts, which are out of scope for this report series. When the coordinator assembles a report, it cannot tell which subtopics were searched and came up empty and which were never searched at all, so it cannot say where the gaps are. Clients still praise the depth of the sources that were found, and the firm moved all subagents to Opus 5.5 in the same release as the prompt change.</p>
<p>Which change best fixes these problems while keeping the subagents' ability to adapt their searches?</p>`,
    options: [
      `Return to detailed step-by-step procedures for each subagent that list the exact sources and queries to use, so every search path is predictable and the coordinator always knows exactly what was covered.`,
      `Give the four subagents a shared scratchpad file where each records what it is researching, so they can see one another's progress and divide the remaining work among themselves as they go.`,
      `Keep goal-based briefs but give each subagent a distinct subtopic with boundaries, quality criteria and effort guidance, and require output listing what it searched, found and could not find.`,
      `Set <code>maxTurns</code> to 10 for each subagent so that no subagent can spend 40 tool calls on one line of inquiry, which keeps research effort spread evenly across the whole topic.`
    ],
    answer: [2],
    explanation: `Goal-oriented delegation keeps subagents adaptable, but the coordinator still owns decomposition, scope and visibility. All four subagents received the same unbounded goal, so the overlap, the missing logistics coverage and the forecasting detour were predictable. Partitioning the scope, one subtopic or source type per subagent with explicit boundaries (for example, EV sales forecasts are out of scope), removes the duplication and the gap. Quality criteria and effort guidance tell each subagent what good enough looks like, and a structured output that lists what was searched, found and not found gives the coordinator the visibility to report gaps honestly. Returning to procedures would bring back the rigidity the firm just removed. A shared scratchpad lets subagents negotiate scope among themselves, outside the coordinator's control. A turn cap limits spending but still assigns logistics to nobody. The praise for source depth and the Opus 5.5 move are noise.`,
    rationales: [
      `Scripts restore predictability but bring back the rigidity the consultant criticized: subagents would again follow fixed sources and queries instead of adapting to what they find.`,
      `Letting subagents divide the work among themselves moves decomposition out of the coordinator, which still lacks a reliable record of what was covered and why.`,
      `Correct. Distinct subtopics remove the overlap and cover logistics, boundaries stop out-of-scope detours, and the structured output shows the coordinator what was searched but not found.`,
      `A turn cap trims one symptom of the vague brief, but nobody is assigned logistics, the overlap remains, and searched gaps still look the same as unsearched ones.`
    ],
    trap: `Swinging back to procedures or capping turns instead of bounded goals with an output contract`,
    signals: `Decisive: all four subagents received the same unbounded goal, and the coordinator cannot tell subtopics that were searched and empty from ones never searched. Noise: clients' praise for the depth of sources and the simultaneous move to Opus 5.5.`
  },
  {
    id: 'e6-S3-06', scenario: 'S3', domain: 'D1', obj: 'O03', type: 'single', select: 1,
    stem: `<p>Verdant Analytics produces sustainability briefings for consumer-electronics manufacturers with a Claude Agent SDK research system. After the first pass on "end-of-life rules for portable batteries in Asia", the coordinator reviewed the synthesis and found a gap: nothing covered extended producer responsibility (EPR) obligations in Japan and South Korea from 2023 onward. During that pass, the document-analysis subagent had also flagged a 2019 industry white paper as outdated, because both countries amended their rules after it was published. The coordinator's context holds all of this, along with the 23 source URLs collected so far.</p>
<p>The coordinator re-delegated with this Task prompt:</p>
<pre>Find more on Asian recycling policy, as discussed. Focus on the gaps.</pre>
<p>The web-search subagent returned nine sources. Six were already among the 23 collected, two covered China, which the briefing does not need, and one was the 2019 white paper, which the synthesis then cited. The team points out that the subagent's own system prompt is well written, and the second pass finished in four minutes, comfortably within budget.</p>
<p>Which change most directly prevents this outcome on future re-delegations?</p>`,
    options: [
      `Re-delegate to the same web-search subagent type, because it keeps what it found in its first invocation and can use that memory to avoid returning sources it has already reported.`,
      `Write the re-delegation prompt to state the exact gap, list the URLs already collected, name the discredited 2019 paper and why, and give the output schema, since the subagent sees only its prompt.`,
      `Raise the web-search subagent's <code>maxTurns</code> so it can search more broadly on the second pass, giving it room to find the Japanese and Korean sources even from a very brief delegation prompt.`,
      `Ask the synthesis subagent to fill the Japan and South Korea gap from its own general knowledge, so that no extra search round is needed and the briefing is completed sooner.`
    ],
    answer: [1],
    explanation: `Subagents do not inherit the coordinator's conversation or share memory between invocations; everything they need must be in the prompt. The re-delegation said "as discussed" and "the gaps", but the subagent never saw that discussion, so it searched a broad version of the original topic and predictably returned known sources, out-of-scope countries and the discredited paper. A complete prompt names the precise gap (EPR obligations in Japan and South Korea, 2023 onward), lists the 23 URLs already collected so duplicates can be skipped, names the 2019 white paper and why it is excluded, and specifies the output structure with source metadata so the new results merge cleanly. Invoking the same subagent type again still starts a fresh context. More turns only widen an undirected search. Filling the gap from general knowledge puts unsourced claims into a cited briefing. The well-written system prompt and the four-minute runtime are noise.`,
    rationales: [
      `Each invocation starts with a fresh context; the subagent does not remember an earlier run, so it cannot know which sources it or its siblings have already reported.`,
      `Correct. The subagent acts only on its prompt, so stating the gap, the known URLs, the excluded paper and the schema supplies everything that "as discussed" assumed it knew.`,
      `More turns let the subagent search longer, but it still does not know which countries, years or sources matter, so it finds more of the same duplicates and off-scope results.`,
      `The briefing is a cited report; answering from general knowledge produces unsourced claims about recent rule changes, exactly where accuracy and dates matter most.`
    ],
    trap: `Assuming the subagent knows what the coordinator discussed`,
    signals: `Decisive: the Task prompt relies on "as discussed" and "the gaps", which exist only in the coordinator's context, and the results are duplicates, off-scope countries and the discredited paper. Noise: the well-written system prompt and the four-minute, within-budget runtime.`
  },
  {
    id: 'e6-S3-07', scenario: 'S3', domain: 'D1', obj: 'O09', type: 'single', select: 1,
    stem: `<p>Harbor Point Research publishes a weekly "state of the market" report on 40 listed logistics companies. A coordinator built on the Claude Agent SDK assigns each company to a research subagent, which gathers filings, earnings-call notes and news; a synthesis subagent then writes sector conclusions from all 40 company summaries. A full run takes about three hours and costs around $70.</p>
<p>Last Thursday the container restarted during a cluster upgrade while company 27 was being researched. The team tried two recoveries. Rerunning from scratch took another three hours, missed the publishing deadline and produced conclusions that differed from the first 26 summaries, because sources had changed overnight. Resuming the coordinator's session failed differently: its conversation had been compacted twice, it could not reliably tell which companies were finished, and it re-researched eight while skipping two. The working directory still holds <code>summaries/</code> with finished files for companies 1 to 26 and a partial file for company 27. The cluster upgrade was a one-off, and next month the team plans to move the synthesis subagent to Opus 5.5.</p>
<p>Which design makes future runs recover reliably?</p>`,
    options: [
      `Disable compaction for the coordinator and give it a larger context window, so that after a restart the resumed session still remembers exactly which companies were finished and continues from there.`,
      `After a restart, resume the coordinator's session and tell it to continue where it left off, checking its own conversation history to decide which of the 40 companies still need research before synthesis.`,
      `Submit the 40 company research jobs as one Message Batches request each week, so that a container restart cannot interrupt them and the results can be collected once the batch has finished.`,
      `Have each subagent write its summary to a known path, keep a manifest of company, status, artifact path and input version, and on restart load it, skip finished companies and re-run in-progress ones.`
    ],
    answer: [3],
    explanation: `Reliable resumption comes from structured state that lives outside any conversation: each agent exports its results to a known location, and the coordinator keeps a manifest that it loads on restart and injects into later prompts. With a manifest recording each company's status, artifact path and input version, a restart skips companies 1 to 26, re-runs 27 because its status is still in progress (a partial file must not count as done), continues with 28 to 40, and hands the saved summaries to synthesis. That avoids both failures the team saw: the three-hour rerun with inconsistent conclusions, and the compacted session that could not tell finished work from unfinished. More context only postpones compaction and still loses in-memory state when the process dies. Asking a resumed session to continue relies on the history that already proved unreliable. A batch request cannot run the multi-turn tool use each company's research needs. The upgrade and the Opus 5.5 plan are noise.`,
    rationales: [
      `A bigger window only delays compaction; a crash still ends the process, and the next session would still depend on conversation memory instead of durable, structured state.`,
      `This is the recovery that already failed: after two compactions the history could not say which companies were done, so the session re-researched eight and skipped two.`,
      `Each company's research needs multi-turn tool use (search, fetch, read), which a batch request cannot perform, and the pipeline would still have no record of which companies finished.`,
      `Correct. The manifest makes finished, in-progress and pending companies explicit, so a restart re-runs only company 27 onward and passes the saved summaries to synthesis.`
    ],
    trap: `Relying on conversation state or batch processing instead of a persisted manifest`,
    signals: `Decisive: the compacted session could not say which companies were finished, finished summaries already exist on disk, and company 27 is only partial. Noise: the one-off cluster upgrade and the planned move of synthesis to Opus 5.5.`
  },
  {
    id: 'e6-S3-08', scenario: 'S3', domain: 'D2', obj: 'O33', type: 'single', select: 1,
    stem: `<p>Quartz Insights sells quarterly market-sizing reports produced by a Claude Agent SDK research system with four subagents: web search, document analysis, synthesis and report generation. In June a developer gave the report-generation subagent WebSearch and WebFetch so it could "pull chart images and double-check a few numbers" while laying out the final report. Its other tools are Read and Write for the report workspace.</p>
<p>Quality reviews of the 60 reports published since then found that 18% contain claims with no citation from the research phase. Traces show the report subagent fetching new pages mid-layout, paraphrasing figures from them, and sometimes replacing a figure that the synthesis subagent had carefully attributed. Median report latency rose 35%, and two clients asked why numbers in the executive summary differ from the cited tables. Every chart is drawn from data the synthesis step already produced. The company also moved its report template to a new brand style in July, and the search subagent's rate of failed fetches is unchanged at 2%.</p>
<p>Which change best addresses the problem?</p>`,
    options: [
      `Remove WebSearch and WebFetch from the report subagent, give it a narrow <code>render_chart</code> tool for supplied data, and route any further verification through the coordinator.`,
      `Keep the web tools on the report subagent but add a system-prompt rule that it may use them only to fetch chart images, never to look up figures or add new claims to a report.`,
      `Give the report subagent every research tool plus a <code>verify_fact</code> tool, so it can check any number it doubts during layout instead of trusting figures it cannot confirm itself.`,
      `Add a PostToolUse hook that logs every WebFetch call from the report subagent, and review the log weekly so the team can spot and correct uncited claims before the next reports.`
    ],
    answer: [0],
    explanation: `Each subagent should hold only the tools its role needs; agents with tools outside their specialization tend to misuse them, as a report or synthesis agent does when it starts searching. The report subagent's job is layout from findings that were already researched, cited and synthesized. Web access let it pull in new, uncited content and override attributed figures, which explains the uncited claims, the mismatched numbers and the added latency. Removing the web tools restores the boundary, and a narrow <code>render_chart</code> tool covers the one legitimate need, since charts come from data synthesis already produced. A number that looks wrong is a research question for the coordinator to route, not something the formatter should settle. A prompt rule leaves the tools in place and relies on compliance that has already failed. Adding every tool widens the problem, and logging only observes misuse after reports ship. The template change and the steady fetch-failure rate are noise.`,
    rationales: [
      `Correct. Without web tools the report subagent can only lay out attributed findings, <code>render_chart</code> covers the chart need, and real doubts about numbers go back through the coordinator.`,
      `The tools stay available, so the fix depends on the subagent obeying a rule it is already breaking; uncited claims might drop, but nothing stops them.`,
      `More tools on a formatting role increase cross-specialization misuse and decision complexity, and the report subagent would do even more unreviewed research during layout.`,
      `A weekly log detects problems after reports reach clients, and nothing prevents the subagent from fetching and paraphrasing new content in the meantime.`
    ],
    trap: `Giving a role tools outside its specialization, then patching with prompts or logging`,
    signals: `Decisive: the problems began when the report subagent received web tools, traces show it fetching and paraphrasing mid-layout, and charts come from data synthesis already produced. Noise: the July template change and the unchanged 2% fetch-failure rate of the search subagent.`
  },
]);
