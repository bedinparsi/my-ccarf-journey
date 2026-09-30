/* Practice Exam 5 — Scenario S1: Customer Support Resolution Agent
   Contexts: Lumora (subscription streaming service) and Harborline Mutual (home-insurance claims desk). */
CCAR.addQuestions('exam5', [
  {
    id: 'e5-S1-01',
    scenario: 'S1',
    domain: 'D1',
    obj: 'O10',
    type: 'single',
    select: 1,
    stem: 'Lumora\'s support coordinator receives: "I was charged twice for March ($17.99 each), my 4K plan keeps dropping to HD on my living-room TV, and I want to move to Basic starting next cycle." The three concerns are independent of each other. Today the coordinator works them one at a time in a single context: average handle time is 6.1 minutes, and in 14% of multi-concern tickets the final reply misstates an amount from the first concern. Subagents <code>billing-investigator</code>, <code>playback-diagnostics</code>, and <code>plan-change</code> are already defined. Which orchestration best improves latency and accuracy?',
    options: [
      'Route the whole message to billing-investigator first because it carries financial risk, and have it hand the remaining two concerns back to the coordinator only after the duplicate-charge refund has been completed.',
      'Run a fixed sequential pipeline of billing, then playback, then plan change, so that each subagent receives the previous subagent\'s full output and can avoid contradicting what was already said.',
      'Decompose the message into three items, emit three Task calls in one coordinator response with the shared account context, then synthesize a single reply.',
      'Spawn the three subagents with the raw customer message and let each one reply to the customer directly as soon as its own concern is resolved, so fast answers are not held back by slow ones.'
    ],
    answer: [2],
    explanation: 'Independent concerns should be decomposed and investigated in parallel (multiple Task calls in a single coordinator response), each with the shared context it needs (account ID, plan, billing cycle), and then synthesized by the coordinator into one unified resolution. This cuts latency to the slowest branch and keeps each branch\'s facts isolated, which removes the cross-concern amount drift seen in the single long context.',
    rationales: [
      'Serializing everything behind the refund adds latency for no dependency reason, and pushing coordination into a worker breaks hub-and-spoke control.',
      'A sequential pipeline suits dependent stages; these concerns are independent, so chaining them only adds latency and propagates context that is irrelevant to each stage.',
      'Correct. Parallel investigation with shared context plus coordinator synthesis matches independent concerns and fixes both latency and accuracy.',
      'Letting workers reply directly bypasses the coordinator, produces three fragmented messages, and loses the unified resolution and consistent error handling.'
    ],
    trap: 'Sequential chaining of independent concerns'
  },
  {
    id: 'e5-S1-02',
    scenario: 'S1',
    domain: 'D1',
    obj: 'O06',
    type: 'single',
    select: 1,
    stem: 'After adding a billing specialist, Lumora\'s coordinator never delegates. On billing tickets it calls <code>lookup_order</code> itself and tells customers it "cannot view invoice history."<pre>const result = query({\n  prompt: ticketText,\n  options: {\n    allowedTools: [\n      "mcp__support__get_customer",\n      "mcp__support__lookup_order",\n      "mcp__support__escalate_to_human"\n    ],\n    agents: {\n      "billing-investigator": {\n        description: "Investigates duplicate charges, failed payments and refund eligibility for Lumora subscriptions",\n        prompt: "You are a billing investigator. ...",\n        tools: ["mcp__support__lookup_order", "mcp__support__get_invoice_history"]\n      }\n    },\n    mcpServers: { support: supportServer }\n  }\n});</pre>What is the most likely root cause?',
    options: [
      'The coordinator\'s allowedTools does not include "Task", so it has no way to spawn billing-investigator even though the agent is defined.',
      'The description is too specific; coordinators route only to subagents whose descriptions are generic enough to match most incoming tickets.',
      'A subagent\'s tools must be a subset of the coordinator\'s tools, and get_invoice_history is missing from the coordinator list, so the SDK silently drops the subagent.',
      'The AgentDefinition omits a model field, and subagents without an explicit model such as "sonnet" are registered but never made available for delegation.'
    ],
    answer: [0],
    explanation: 'Subagents are spawned through the Task tool (named Agent in the current SDK), and a coordinator can only invoke them if "Task" is in its allowedTools. Without it, the coordinator falls back to the tools it does have, which matches the symptom exactly. The definition itself (specific description, scoped tools) is fine.',
    rationales: [
      'Correct. Missing "Task" in the coordinator\'s allowedTools is the classic wiring failure: the agent exists but cannot be invoked.',
      'Specific descriptions help routing; generic descriptions cause overlap and misrouting, so this reverses the principle.',
      'There is no subset rule; subagents are scoped independently and routinely hold tools the coordinator lacks.',
      'model is optional and inherits a default when omitted; its absence does not prevent delegation.'
    ],
    trap: 'Coordinator wiring: allowedTools lacks Task'
  },
  {
    id: 'e5-S1-03',
    scenario: 'S1',
    domain: 'D2',
    obj: 'O33',
    type: 'single',
    select: 1,
    stem: 'Harborline Mutual\'s claims desk uses a coordinator with three subagents: <code>coverage-analyst</code> (policy forms, endorsements, exclusions), <code>damage-estimator</code> (adjuster photos and contractor estimates), and <code>payments</code>. To "avoid blocking anyone," every subagent was given all 14 MCP tools. Last week coverage-analyst called <code>issue_claim_payment</code> for $3,200 right after deciding coverage applied, before the estimate was reviewed, and damage-estimator repeatedly called <code>search_policy_forms</code> instead of its estimate tools. Which change best addresses both problems?',
    options: [
      'Add a line to coverage-analyst\'s system prompt stating that it must never issue payments and should only recommend a payable amount to the coordinator for later action.',
      'Keep all 14 tools on every subagent, but add a PreToolUse hook that blocks issue_claim_payment unless the call comes from the payments subagent, and log any blocked attempts for review.',
      'Merge the three subagents into a single claims agent that holds all 14 tools, so that one context sees coverage, estimate, and payment together before any money moves.',
      'Scope each subagent to its role\'s tools, give issue_claim_payment only to payments, and have the coordinator invoke payments after both findings return.'
    ],
    answer: [3],
    explanation: 'Giving every agent every tool degrades selection (14 choices instead of 4-5) and invites cross-specialization misuse. Restricting each subagent to its role\'s tools fixes both the wrong-tool selection and the premature payment, and routing the payment step through the coordinator keeps sequencing under its control.',
    rationales: [
      'A prompt rule is probabilistic and does nothing for damage-estimator\'s tool-selection confusion.',
      'The hook stops the payment symptom but leaves 14 tools on every agent, so misselection like search_policy_forms continues.',
      'One agent with 14 tools worsens selection reliability and removes the separation that made the workflow reviewable.',
      'Correct. Role-scoped tool sets address both symptoms, and coordinator-controlled sequencing ensures payment happens only after both findings.'
    ],
    trap: 'All tools on every agent "for flexibility"'
  },
  {
    id: 'e5-S1-04',
    scenario: 'S1',
    domain: 'D1',
    obj: 'O03',
    type: 'single',
    select: 1,
    stem: 'For claim CLM-9921, Harborline\'s coordinator has already gathered: policy HM-44821 (HO-3 form, version in force on the loss date, water-backup endorsement with $10,000 sublimit, $1,000 deductible), date of loss 2026-05-20 (sump pump failure, basement flooding), and an adjuster estimate of $14,850. The policy renewed on 2026-06-01 with a different endorsement. The coordinator spawns coverage-analyst with: "Determine whether claim CLM-9921 is covered and the payable amount." In 38% of runs the subagent answers "need policy details," and in others it fetches the current (post-renewal) policy. What is the most effective fix?',
    options: [
      'Enable shared memory between the coordinator and coverage-analyst so the subagent can read the coordinator\'s earlier get_policy and get_estimate tool results directly.',
      'Put the gathered facts in the Task prompt as structured data (policy version on loss date, form, sublimit, deductible, loss date and cause, estimate) with source IDs.',
      'Raise coverage-analyst\'s maxTurns so it has enough turns to look up the policy, endorsement, and estimate details on its own before answering.',
      'Add to coverage-analyst\'s system prompt: "Always call get_policy for the most recent policy version first, then read its endorsements before deciding coverage."'
    ],
    answer: [1],
    explanation: 'Subagents do not inherit the coordinator\'s conversation or tool results; the Task prompt is the only context they receive. Passing the complete findings as structured data with source metadata eliminates the round-trips and prevents the subagent from re-deriving facts incorrectly, such as picking the post-renewal policy for a pre-renewal loss.',
    rationales: [
      'Subagents have isolated context; there is no shared memory of the coordinator\'s tool results to enable.',
      'Correct. Complete, structured findings with provenance in the prompt give the subagent everything it needs, including the correct policy version.',
      'More turns just buys more redundant lookups and does not stop it from selecting the wrong policy version.',
      'The most recent version is exactly wrong here, because the loss predates the renewal; the rule would institutionalize the error.'
    ],
    trap: 'Assuming subagents inherit coordinator context'
  },
  {
    id: 'e5-S1-05',
    scenario: 'S1',
    domain: 'D1',
    obj: 'O04',
    type: 'single',
    select: 1,
    stem: 'Lumora\'s coordinator delegates cancellations to a retention subagent with this prompt: "Step 1: call get_customer. Step 2: if tenure &gt; 24 months, offer 50% off for 3 months. Step 3: if declined, offer the ad-supported tier. Step 4: if declined, cancel." Logs show discounts pushed on customers cancelling because of a billing error (who just need a refund) and on customers relocating to countries Lumora does not serve. Retention is flat and complaints are up. Which revision to the delegation is best?',
    options: [
      'State the goal (resolve the actual cancellation reason; offer retention only where an offer fits it), list eligible offers and limits, and require a structured result.',
      'Add a Step 0 that classifies the cancellation reason into six categories, followed by a separate fixed decision table of offers, fallbacks, and cancellation steps for each of the six categories.',
      'Remove the retention subagent and let the coordinator run retention inline, since the coordinator already holds the full conversation and can apply the four steps with better judgment.',
      'Replace the steps with "Use your best judgment to keep the customer," and drop the offer catalog and output format so the subagent can adapt freely to each conversation it handles.'
    ],
    answer: [0],
    explanation: 'Goal-oriented delegation states the objective, quality criteria, and constraints and lets the subagent adapt to what it discovers, while a required output structure preserves the coordinator\'s visibility and control. Rigid procedures fail on cases the script did not anticipate; fully open-ended prompts lose the boundaries (eligible offers) and the reporting the coordinator needs.',
    rationales: [
      'Correct. Goal plus constraints plus a structured result balances adaptability with coordinator oversight.',
      'More branches keep the brittle procedural approach and still break on reasons outside the six categories.',
      'Moving the work inline does not fix the procedural script, and it bloats the coordinator\'s context with retention dialogue.',
      'Removing constraints and output format loses offer eligibility rules and the coordinator\'s visibility into outcomes.'
    ],
    trap: 'Procedural step lists vs. goal-oriented delegation'
  },
  {
    id: 'e5-S1-06',
    scenario: 'S1',
    domain: 'D1',
    obj: 'O09',
    type: 'single',
    select: 1,
    stem: 'After a hailstorm, Harborline runs an overnight job pushing 2,400 claims through a coordinator with coverage, estimate-review, and fraud-screen subagents. The process crashed at 03:10 after about 1,500 claims. On restart the coordinator began again from claim 1: it re-ran the paid third-party fraud screen, 37 claims received duplicate payment recommendations, and several coverage findings were lost because they had only ever existed in the coordinator\'s context. Which design best prevents this?',
    options: [
      'Resume the coordinator\'s previous session by ID after a crash so its conversation, including the earlier findings for the first 1,500 claims, is restored and the loop can simply continue.',
      'Split the job into nightly chunks of 200 claims so any crash loses at most one chunk of work, and restart the failed chunk from its first claim once the process is healthy again.',
      'Have each subagent export per-claim results to a known store, keep a manifest of completed steps, and on restart load it, skip finished steps, and inject stored findings.',
      'Make the payments system reject duplicate recommendations for the same claim ID, and otherwise keep restarting from the first claim, since re-running the analysis is the safest option.'
    ],
    answer: [2],
    explanation: 'Reliable resumption comes from structured state exports: each agent persists its outputs to a known location and the coordinator maintains a manifest it loads on resume. That lets it skip completed work (no repeated fraud-screen spend or duplicate recommendations) and inject prior findings into prompts for remaining steps, so nothing lives only in volatile context.',
    rationales: [
      'Resuming a 1,500-claim conversation relies on huge, possibly incomplete context and cannot tell which in-flight tool calls finished; it is not a durable record.',
      'Smaller chunks limit the blast radius but still repeat work inside the failed chunk and still lose findings held only in context.',
      'Correct. Per-step persisted outputs plus a coordinator manifest enable skip-and-inject resumption without repeats or loss.',
      'Idempotent payments treat one symptom, but full restarts still repeat paid screens and waste hours of processing.'
    ],
    trap: 'Relying on conversation state instead of a manifest'
  },
  {
    id: 'e5-S1-07',
    scenario: 'S1',
    domain: 'D5',
    obj: 'O22',
    type: 'single',
    select: 1,
    stem: 'Harborline proposes auto-approving claims under $5,000 when the agent\'s coverage determination has confidence of at least 0.90. On 3,000 labeled historical claims the agent agrees with adjusters 96.8% of the time, above the 95% target. The plan adds a random 2% QA sample of auto-approved claims. What should you require before approving the rollout?',
    options: [
      'Approve as proposed: 96.8% agreement exceeds the target, and a uniform random 2% QA sample of auto-approved claims will surface any systematic issues within the first few weeks of operation.',
      'Raise the auto-approval threshold from 0.90 to 0.97 so that the confidence cutoff matches the accuracy target, and keep the random 2% QA sample unchanged for simplicity.',
      'Replace the model\'s confidence score with a customer-sentiment check, auto-approving only claims whose FNOL notes show calm, cooperative language and no signs of dispute or frustration.',
      'Measure accuracy by claim type and key field, calibrate thresholds per segment on the labeled set, and QA with stratified sampling across segments.'
    ],
    answer: [3],
    explanation: 'Aggregate accuracy can hide weak segments: a small, hard claim type (for example water backup with sublimits) can be far below target while the average looks fine. Validate accuracy by segment and field, calibrate thresholds on labeled data per segment, and measure ongoing error rates with stratified sampling so low-volume segments are actually observed.',
    rationales: [
      'The aggregate can mask a failing segment, and a uniform 2% sample may contain almost no examples of low-volume claim types.',
      'Matching a confidence number to an accuracy target is not calibration; without segment analysis the threshold is arbitrary.',
      'Sentiment is not a proxy for coverage correctness or case complexity.',
      'Correct. Segment-level validation, calibrated thresholds, and stratified sampling are the prerequisites for safe automation.'
    ],
    trap: 'Aggregate accuracy masking weak segments'
  },
  {
    id: 'e5-S1-08',
    scenario: 'S1',
    domain: 'D1',
    obj: 'X02',
    type: 'single',
    select: 1,
    stem: 'Lumora policy: refunds over $50 may be issued only to the verified account owner, not to household profile members. The system prompt states this clearly, yet in 3% of refunds over $50 the requester was a secondary profile whose email matched the account. <code>get_customer</code> returns <code>role</code> (owner/member) and <code>verification_status</code>. What is the most effective fix?',
    options: [
      'Add four few-shot examples to the system prompt showing the agent politely declining refunds over $50 for member profiles and offering to contact the account owner instead.',
      'Gate process_refund in code: block amounts over $50 unless get_customer returned role=owner and verified for that customer ID, and return a structured reason.',
      'Have the agent ask "Are you the account owner?" before any refund over $50, record the answer in the case notes, and proceed only when the customer confirms ownership explicitly.',
      'Route every refund request over $50 to escalate_to_human so a person always checks the account role before money is returned, regardless of what get_customer reports.'
    ],
    answer: [1],
    explanation: 'When a business rule must hold every time and errors have financial impact, prompt instructions (non-zero failure rate) are insufficient; a programmatic prerequisite gate blocks the downstream tool until the verified condition is met. The structured rejection lets the agent redirect to the owner-verification flow instead of failing silently.',
    rationales: [
      'Few-shot examples improve odds but remain probabilistic; the prompt already states the rule and still fails 3% of the time.',
      'Correct. A deterministic gate tied to get_customer\'s verified owner result enforces the policy on every call.',
      'Self-attestation is the weak link that caused the problem; the backend already has an authoritative role field.',
      'Escalating all refunds over $50 sacrifices first-contact resolution when the system can enforce the rule automatically.'
    ],
    trap: 'Prompt guidance for a deterministic requirement'
  },
  {
    id: 'e5-S1-09',
    scenario: 'S1',
    domain: 'D1',
    obj: 'X03',
    type: 'multi',
    select: 2,
    stem: 'Harborline\'s agent uses tools backed by three systems. The legacy claims system returns dates like <code>05/20/26</code> and numeric statuses (<code>3</code> = open-pending-docs); policy admin returns ISO 8601; payments returns Unix epoch seconds. The agent misjudges whether claims were reported within the 60-day window, and occasionally calls <code>issue_claim_payment</code> above the desk\'s $25,000 settlement authority. Which TWO changes should you make? (Select 2)',
    options: [
      'Add a table to the system prompt explaining each backend\'s date format and the meaning of every numeric status code, with a worked example of the 60-day calculation.',
      'Add a PostToolUse hook that normalizes all dates to ISO 8601 and maps numeric status codes to labels before the model sees the tool results.',
      'Force tool_choice to get_policy before every payment so the agent always re-reads the settlement authority limit from the policy record first.',
      'Require the agent to self-rate its confidence before any payment over $20,000 and escalate automatically whenever the rating is below 8 out of 10.',
      'Add a PreToolUse hook on issue_claim_payment that blocks amounts above $25,000 and redirects to escalate_to_human with a structured handoff.'
    ],
    answer: [1, 4],
    explanation: 'Hooks give deterministic guarantees. A PostToolUse hook normalizes heterogeneous formats before the model reasons over them, removing the date-parsing ambiguity; a PreToolUse interception hook enforces the hard authority limit and redirects to human escalation. Both requirements are mechanical and must hold every time, so prompt- or confidence-based approaches are the wrong layer.',
    rationales: [
      'Explaining formats in the prompt leaves parsing to probabilistic model behavior; normalization belongs in code.',
      'Correct. PostToolUse normalization gives the model consistent data for the 60-day computation.',
      'Forcing a lookup does not enforce the limit; the model could still call issue_claim_payment above it.',
      'Self-reported confidence is poorly calibrated and does not enforce a hard dollar limit.',
      'Correct. PreToolUse interception deterministically blocks over-limit payments and routes them to a human.'
    ],
    trap: 'Prompt/confidence fixes for deterministic data and policy rules'
  },
  {
    id: 'e5-S1-10',
    scenario: 'S1',
    domain: 'D2',
    obj: 'X04',
    type: 'single',
    select: 1,
    stem: 'When Lumora\'s billing backend times out, the <code>lookup_billing_events</code> MCP tool returns:<pre>{\n  "content": [{ "type": "text", "text": "No charges found" }],\n  "isError": false\n}</pre>The agent then tells customers "I don\'t see a duplicate charge," and several customers filed bank chargebacks. What is the best fix?',
    options: [
      'Return timeouts with isError: true, errorCategory "transient", isRetryable: true, and what was attempted; keep real no-match results as successful empty results.',
      'Have the tool retry the backend internally up to ten times and, if all attempts fail, return an empty charges list so the agent\'s conversation flow stays simple and uninterrupted.',
      'Return a generic "Operation failed" error for every failure type so the agent always escalates to a human instead of guessing about the customer\'s billing situation.',
      'Add a system-prompt rule: when a lookup reports no charges, ask the customer to check their bank statement and send a screenshot before concluding there is no duplicate charge.'
    ],
    answer: [0],
    explanation: 'An access failure disguised as a valid empty result leads the agent to a confident but false conclusion. Structured MCP errors (isError, errorCategory, isRetryable, human-readable detail) let the agent retry transient failures or explain the delay, while genuine empty results remain distinguishable as successful queries with no matches.',
    rationales: [
      'Correct. It separates access failures from valid empty results and gives the agent the metadata to recover appropriately.',
      'Converting final failure into an empty list is silent error suppression and reproduces the exact bug.',
      'Uniform generic errors hide the category and retryability, forcing unnecessary escalations for transient blips.',
      'A prompt workaround shifts burden to customers and still cannot tell a timeout from a real empty result.'
    ],
    trap: 'Access failure reported as empty success'
  },
  {
    id: 'e5-S1-11',
    scenario: 'S1',
    domain: 'D5',
    obj: 'X05',
    type: 'single',
    select: 1,
    stem: 'A Harborline policyholder asks to be reimbursed for two hotel nights. The county closed her road with an order after storm-downed power lines; her house is undamaged. The policy\'s Additional Living Expense section covers costs when "a civil authority prohibits you from use of the residence premises" because of damage to neighboring premises by a covered peril. The agent\'s escalation criteria do not address road closures. The customer is calm and has not asked for a human. What should the agent do?',
    options: [
      'Deny the request and explain that ALE requires the residence itself to be uninhabitable or directly named in an order, which is not the case here since the house is undamaged.',
      'Approve reimbursement for both nights, because a civil authority order was issued due to storm damage, and the clause covers orders that follow damage to neighboring property.',
      'Ask the customer to rate her frustration on a 1-5 scale and escalate only if she answers 4 or higher; otherwise explain the clause and close the case as resolved.',
      'Escalate to a human adjuster with a structured summary (policy, order details, clause text, open question), since whether a road closure counts is a policy gap.'
    ],
    answer: [3],
    explanation: 'Escalation is warranted when policy is ambiguous or silent on the customer\'s specific situation, not only when a customer demands a human. Whether a road-closure order "prohibits use of the residence premises" is an interpretation the agent\'s criteria do not cover, so a structured handoff lets a human decide without re-collecting facts.',
    rationales: [
      'Denial asserts one reading of an ambiguous clause as fact and may wrongly deny a covered claim.',
      'Approval asserts the opposite reading; both outcomes are policy interpretations outside the agent\'s criteria.',
      'Sentiment does not measure whether the case needs a policy decision.',
      'Correct. A policy gap is an explicit escalation trigger, and the structured handoff preserves the facts for the adjuster.'
    ],
    trap: 'Resolving a policy gap autonomously'
  },
  {
    id: 'e5-S1-12',
    scenario: 'S1',
    domain: 'D5',
    obj: 'O19',
    type: 'single',
    select: 1,
    stem: 'A Lumora customer disputes a $17.99 charge dated 2026-03-15. The billing system shows the subscription cancelled on 03-02; the entitlement service shows the account active with streaming on 03-05 and 03-09. The agent\'s handoff to a human read: "Subscription cancelled 3/2; 3/15 charge is erroneous; recommend refund." The human refunded it, then learned the customer had re-subscribed through a TV app store on 03-04. What change best prevents this?',
    options: [
      'Instruct the agent to treat the billing system as the system of record and to use its status whenever sources disagree, noting the other systems only if space allows in the summary.',
      'Instruct the agent to take the value with the most recent timestamp across all systems as authoritative, since later events usually supersede earlier ones in subscription data.',
      'Have the handoff list the conflicting values with system, field, and timestamp, mark the status as contested, and say what to check rather than assert a conclusion.',
      'Leave conflicting records out of the handoff to keep it concise, because the human agent can look up every backend system directly if they have doubts about the recommendation.'
    ],
    answer: [2],
    explanation: 'When credible sources conflict, synthesis should preserve the conflict with attribution rather than silently choosing one value. Presenting both values with their source and timestamp and marking the finding as contested lets the human reconcile it (for example, by checking third-party purchase channels) instead of acting on a false certainty.',
    rationales: [
      'Picking a fixed source of record collapses the conflict; here the billing system was exactly the stale source.',
      'Recency is an arbitrary tie-breaker; the 03-05 streaming event is the most recent but still does not explain the charge.',
      'Correct. Attributed, side-by-side conflicting values marked as contested preserve source-level uncertainty for the decision-maker.',
      'Handoffs must be self-contained; omitting the conflict hides the very signal that should have stopped the refund.'
    ],
    trap: 'Collapsing conflicting sources into one conclusion'
  },
  {
    id: 'e5-S1-13',
    scenario: 'S1',
    domain: 'D1',
    obj: 'O10',
    type: 'single',
    select: 1,
    stem: 'Harborline\'s FNOL intake must run the same four stages for every claim: (1) policy verification, (2) coverage determination, which needs the verified policy form, (3) reserve estimate, which needs the coverage outcome, and (4) acknowledgment letter. The team built a dynamic coordinator that decides which subagents to spawn. Logs show it sometimes skips the reserve estimate, sometimes starts coverage before verification returns, and uses about 3x the tokens of a single agent. Which pattern fits best?',
    options: [
      'Keep the coordinator-worker design but have the coordinator spawn all four subagents in parallel in one response, so total latency drops to that of the slowest stage.',
      'Use a fixed sequential pipeline where each stage\'s structured output feeds the next, with a validation gate between stages.',
      'Keep the dynamic coordinator but strengthen its system prompt with the four stages listed in order and an explicit instruction never to skip or reorder any of them.',
      'Collapse the design into one agent holding every tool, with a long system prompt that describes the four stages, their dependencies, and the required output of each.'
    ],
    answer: [1],
    explanation: 'Fixed, predictable, dependent stages are the textbook case for a sequential pipeline (prompt chaining); dynamic decomposition is for open-ended work where subtasks depend on discoveries. Chaining with gates guarantees order and completeness and removes the coordinator\'s planning overhead.',
    rationales: [
      'The stages depend on each other, so parallel spawning would run coverage and reserves without their inputs.',
      'Correct. A deterministic sequence with validation gates matches a fixed, dependent workflow.',
      'Prompting harder keeps a probabilistic planner in charge of a sequence that should be fixed in code.',
      'A single agent still decides order probabilistically and loses stage-level validation.'
    ],
    trap: 'Dynamic orchestration for a fixed dependent workflow'
  },
  {
    id: 'e5-S1-14',
    scenario: 'S1',
    domain: 'D2',
    obj: 'O33',
    type: 'multi',
    select: 2,
    stem: 'Lumora is redesigning its agent as a coordinator (triage and customer communication) plus <code>account-investigator</code> and <code>refund-executor</code> subagents. Available tools: get_customer, lookup_order, get_playback_logs, search_help_center, update_plan, process_refund, escalate_to_human. Which TWO tool assignments follow sound tool-distribution principles? (Select 2)',
    options: [
      'account-investigator: get_customer, lookup_order, and get_playback_logs, the read-only tools its diagnostic role needs.',
      'refund-executor: all seven tools, so it can re-verify anything it needs without a round-trip back through the coordinator.',
      'refund-executor: process_refund plus a scoped read-only lookup_order to confirm the charge; anything else goes back through the coordinator.',
      'coordinator: Task plus every tool held by any subagent, so it can take over a subagent\'s work directly whenever that subagent fails.',
      'account-investigator: its read tools plus process_refund, so it can refund at once when it confirms a duplicate charge, saving a hop.'
    ],
    answer: [0, 2],
    explanation: 'Each agent should get only the tools its role needs, with limited cross-role tools for specific high-frequency needs. A read-only investigator and an executor with process_refund plus one scoped read tool keep selection reliable and prevent a diagnostic agent from taking financial actions.',
    rationales: [
      'Correct. Read-only diagnostic tools match the investigator\'s role.',
      'Seven tools for a single-purpose executor increases decision complexity and invites misuse.',
      'Correct. A scoped cross-role read tool for a frequent need is the recommended exception; complex needs route via the coordinator.',
      'Duplicating every tool on the coordinator defeats specialization and degrades its routing decisions.',
      'Giving the investigator a write/financial tool is cross-specialization misuse waiting to happen.'
    ],
    trap: 'Over-provisioning tools across roles'
  },
  {
    id: 'e5-S1-15',
    scenario: 'S1',
    domain: 'D2',
    obj: 'O36',
    type: 'single',
    select: 1,
    stem: 'Lumora exposes <code>pause_subscription</code> ("Pauses a subscription") and <code>cancel_subscription</code> ("Cancels a subscription"). Cancelling forfeits grandfathered pricing and cannot be undone. The system prompt contains: "If the customer wants to stop their membership, start the cancellation flow with cancel_subscription." Customers who say "stop my membership for the summer" get cancelled 9% of the time. What is the most effective first step?',
    options: [
      'Remove the keyword-triggered cancellation line from the system prompt and expand both descriptions with purpose, reversibility, inputs, and when to use each.',
      'Add a routing classifier in front of the agent that detects time-bounded phrases such as "for the summer" and preselects pause_subscription before the model runs.',
      'Merge the two tools into a single change_subscription tool with a mode parameter, so the model always sees one entry point and picks pause or cancel as an argument.',
      'Expand pause_subscription\'s description with detailed guidance and eight example phrasings such as "stop for the summer," while leaving the rest of the configuration unchanged.'
    ],
    answer: [0],
    explanation: 'Tool descriptions are the primary selection mechanism, but a keyword-sensitive system prompt instruction ("stop" leads to cancel) can override well-written descriptions. The proportionate first step fixes both: remove the misleading association and make the descriptions differentiate purpose, reversibility, inputs, and when to use each.',
    rationales: [
      'Correct. It removes the keyword trigger causing misrouting and gives the model the information to choose correctly.',
      'A pre-routing classifier is over-engineered for a first step and bypasses the model\'s understanding.',
      'Consolidation is a heavier redesign and the keyword instruction would still push toward cancel mode.',
      'Better descriptions help, but the system prompt line mapping "stop" to cancellation would keep overriding them.'
    ],
    trap: 'Keyword-sensitive system prompt overriding descriptions'
  }
]);
