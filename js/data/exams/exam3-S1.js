/* Practice Exam 3 — Scenario S1: Customer Support Resolution Agent
   Context: Nimbus Mobile (telecom carrier) — billing disputes, roaming charges, plan changes, device returns, number porting. */
CCAR.addQuestions('exam3', [
  {
    id: 'e3-S1-01',
    scenario: 'S1',
    domain: 'D1',
    obj: 'O10',
    type: 'single',
    select: 1,
    stem: 'Nimbus Mobile\'s support coordinator currently routes every ticket through a fixed pipeline of four subagents: <code>billing-investigator</code> → <code>device-returns</code> → <code>plan-change</code> → <code>porting-specialist</code>. Each stage receives the ticket and either acts or returns "not applicable." Metrics: 62% of tickets involve a single concern, yet median handle time is 4.8 minutes because every ticket waits on all four stages; multi-concern tickets (for example, a roaming dispute plus a plan change) take 7.5 minutes. Finance has capped token spend per ticket at today\'s level. Which orchestration change best meets the latency goal within the cost cap?',
    options: [
      'Keep the four-stage pipeline but switch every stage to a haiku model and have each stage return "not applicable" as its first token when the ticket is outside its area.',
      'Replace the four specialists with one generalist agent that holds all sixteen MCP tools, so tickets never incur handoff latency between separate stages.',
      'Have the coordinator identify the concerns present, invoke only the matching subagents, and emit parallel Task calls in one response when there are several.',
      'Run all four specialists in parallel on every ticket so that the slowest single stage sets the latency, and have the coordinator discard each "not applicable" result before synthesis.'
    ],
    answer: [2],
    explanation: 'A coordinator should analyze each request and dynamically select which subagents to invoke rather than always routing through the full pipeline. Invoking only the relevant specialists removes the wasted stages on single-concern tickets, and emitting parallel Task calls for independent concerns cuts multi-concern latency to the slowest branch, all without spending tokens on irrelevant stages.',
    rationales: [
      'Cheaper, faster stages still make every ticket traverse four agents; it treats the symptom (per-stage speed) instead of the unnecessary routing.',
      'Sixteen tools in one agent degrades tool selection and removes the specialization that keeps each concern reviewable; it trades latency for reliability.',
      'Correct. Dynamic selection plus parallel Task calls for independent concerns addresses latency for both single- and multi-concern tickets without extra token spend.',
      'Parallel fan-out to all four fixes latency but roughly quadruples specialist token spend on single-concern tickets, breaking the cost cap.'
    ],
    trap: 'Always routing through the full pipeline'
  },
  {
    id: 'e3-S1-02',
    scenario: 'S1',
    domain: 'D1',
    obj: 'O06',
    type: 'single',
    select: 1,
    stem: 'Nimbus added a <code>porting-specialist</code> subagent for port-in/port-out requests. The coordinator already delegates billing tickets to <code>billing-investigator</code> successfully. However, 91% of porting tickets ("my number transfer to Nimbus is stuck," "I need my port-out PIN") still go to billing-investigator, which replies that it cannot see transfer status. The definitions are:<pre>"billing-investigator": {\n  description: "Handles account changes, charges, disputes and anything related to the customer\'s account",\n  ...\n},\n"porting-specialist": {\n  description: "Handles specialized customer requests",\n  tools: ["mcp__nimbus__get_port_status", "mcp__nimbus__generate_port_out_pin"],\n  ...\n}</pre>What is the most effective fix?',
    options: [
      'Rewrite porting-specialist\'s description to name port-in, port-out, PINs and transfer status, and narrow billing\'s to exclude transfers.',
      'Add "Task" to the coordinator\'s allowedTools so that the coordinator is able to spawn porting-specialist in addition to billing-investigator.',
      'Give billing-investigator the two porting tools as well, so whichever of the two subagents receives a porting ticket is able to resolve it end to end.',
      'Set porting-specialist\'s model to "opus" so that the coordinator treats it as the more capable option and prefers it when a ticket is complex.'
    ],
    answer: [0],
    explanation: 'The coordinator chooses among subagents primarily from their descriptions. Here porting-specialist\'s description is vague while billing-investigator\'s overlaps ("account changes ... anything related to the account"), so porting tickets match billing. Making each description specific about what it handles and excluding the overlap fixes routing at its root.',
    rationales: [
      'Correct. Specific, non-overlapping descriptions are the routing signal the coordinator uses to pick a subagent.',
      'Billing delegation already works, so Task is evidently in allowedTools; this does not explain misrouting between two reachable subagents.',
      'Duplicating tools across roles blurs specialization and gives billing-investigator fraud-sensitive PIN capability instead of fixing routing.',
      'The model setting does not influence which subagent the coordinator selects; routing depends on the description.'
    ],
    trap: 'Vague/overlapping subagent descriptions'
  },
  {
    id: 'e3-S1-03',
    scenario: 'S1',
    domain: 'D1',
    obj: 'O04',
    type: 'single',
    select: 1,
    stem: 'The coordinator delegates roaming disputes to <code>billing-investigator</code> with a fixed procedure: "1. Call get_usage_records for the last 30 days. 2. Keep sessions where country_code is not US. 3. Sum their charges. 4. If the sum exceeds $50, apply a 50% credit. 5. Report the credit." Audits of 400 disputes show three recurring failures: partner-network roaming posted with a 35–45 day lag and was never found; maritime sessions on cruise ships carry country_code "INTL-SEA" and were credited even though the customer\'s Travel Pass excludes them; and passes activated mid-trip were ignored, so valid pass-covered charges were refunded twice. How should the delegation be revised?',
    options: [
      'Add branches for maritime codes, a 45-day lookback, and mid-trip pass activation, keeping the fixed order so every investigation stays identical and auditable.',
      'Replace the steps with "Investigate the roaming dispute and resolve it however you think best," and let the subagent apply whatever credit it decides is fair.',
      'Keep the procedure, but have the coordinator re-run it with a 60-day window whenever the first run finds no foreign sessions for the customer.',
      'State the goal (decide which charges are valid under the plan and pass terms), the credit limits, and require a structured findings-and-proposal report.'
    ],
    answer: [3],
    explanation: 'Each failure is a case the script did not anticipate. Goal-oriented delegation states what must be determined and the quality criteria, letting the subagent adapt its investigation (longer lookbacks, pass activation times, network types), while explicit limits and a structured report keep the coordinator in control of the outcome.',
    rationales: [
      'Adding branches patches today\'s three failures but keeps a brittle script that will break on the next unanticipated billing pattern.',
      'Open-ended delegation with direct credit authority removes the limits and the reporting the coordinator needs for oversight.',
      'A wider window only addresses the lag; the maritime and mid-trip pass errors remain.',
      'Correct. Goal plus constraints plus structured output enables adaptation while preserving coordinator visibility and control.'
    ],
    trap: 'Patching a procedural script instead of delegating the goal'
  },
  {
    id: 'e3-S1-04',
    scenario: 'S1',
    domain: 'D1',
    obj: 'O03',
    type: 'single',
    select: 1,
    stem: 'For a device return, the coordinator has already verified customer C-88213 and gathered: two lines on the account; order ORD-55120 (line ending 0417) for a Pixelon 9 bought 2026-08-02 on a 24-month installment plan; IMEI 35-209900-176148-1; a $200 trade-in credit applied to that order; the 14-day return window; and the customer\'s statement that the screen arrived cracked, with photo upload UP-7731. It then spawns <code>returns-specialist</code> with: "Customer C-88213 wants to return their phone. Handle the return." In 30% of runs the subagent opens a return on the other line\'s device, and it never accounts for the trade-in credit. What is the most effective fix?',
    options: [
      'Forward the coordinator\'s entire transcript, including every raw tool output, as the Task prompt so that nothing the coordinator saw is omitted.',
      'Pass the verified facts as a structured block (customer, line, order, date, IMEI, installment, trade-in credit, damage claim, photo) with sources.',
      'Instruct the subagent to return a list of missing fields first, so the coordinator can supply the answers in a second Task call before it proceeds.',
      'Give returns-specialist the get_customer and lookup_order tools and instruct it to verify the account itself and pick the most recent device order.'
    ],
    answer: [1],
    explanation: 'Subagents receive only what is in their Task prompt; they do not see the coordinator\'s conversation or tool results. Passing the complete findings as structured data with source references removes the need to re-derive facts, and prevents the wrong-line and missing-credit errors caused by the subagent guessing.',
    rationales: [
      'Dumping the full transcript and raw outputs buries the key facts in noise and bloats the subagent\'s context instead of giving it a clean, structured case.',
      'Correct. Complete, structured findings with provenance give the subagent everything it needs on the first call.',
      'A deliberate round-trip adds latency for information the coordinator already has; it should be passed up front.',
      'Re-querying duplicates work, and "most recent order" is a heuristic that can still pick the wrong line on a multi-line account.'
    ],
    trap: 'Assuming the subagent can see coordinator context'
  },
  {
    id: 'e3-S1-05',
    scenario: 'S1',
    domain: 'D1',
    obj: 'X02',
    type: 'single',
    select: 1,
    stem: 'Port-out PINs let a customer move their number to another carrier, and they are a common SIM-swap fraud target. Nimbus policy: the agent may call <code>generate_port_out_pin</code> only after <code>verify_identity</code> (a one-time code sent to the account\'s registered email) returns <code>verified: true</code> for that account and line. The system prompt states this rule clearly. A fraud review of 21,000 PIN requests found 146 PINs issued without verification, almost all when the caller said their phone was lost and they "can\'t receive codes." Which change most effectively closes this gap?',
    options: [
      'Move the rule to the top of the system prompt in capitals and add three few-shot examples of the agent refusing PIN requests from callers who say their phone is lost.',
      'Route every port-out PIN request to a human agent, since fraud-sensitive actions should never be automated no matter what verification returns.',
      'Block generate_port_out_pin in code unless verify_identity has returned verified: true for the same account and line in the current session.',
      'Block generate_port_out_pin in code until get_customer has returned an account record, so the PIN can only be issued for an existing customer.'
    ],
    answer: [2],
    explanation: 'When a step must happen before a high-risk action, prompt instructions have a non-zero failure rate, as the 146 cases show. A programmatic prerequisite gate that checks the specific verification result for the same account and line provides a deterministic guarantee, while legitimate verified requests still resolve on first contact.',
    rationales: [
      'Stronger prompting and examples reduce but cannot eliminate failures under social-engineering pressure; the requirement is deterministic.',
      'Sending every request to humans sacrifices first-contact resolution for verified customers when a gate can enforce the rule precisely.',
      'Correct. A code-level prerequisite keyed to a successful verify_identity result for the same account and line guarantees the ordering.',
      'This gates on the wrong prerequisite: get_customer finds an account but does not prove the caller controls it.'
    ],
    trap: 'Prompt guidance for a deterministic requirement / gate on wrong prerequisite'
  },
  {
    id: 'e3-S1-06',
    scenario: 'S1',
    domain: 'D2',
    obj: 'O33',
    type: 'single',
    select: 1,
    stem: 'Nimbus policy blocks plan downgrades while an account has any past-due balance. <code>plan-change</code> (tools: get_plan_catalog, check_device_compatibility, change_plan) cannot see balances, so on 68% of downgrade requests it returns to the coordinator, which spawns <code>billing-investigator</code> (tools: get_billing_statement, get_past_due_balance, apply_credit, process_refund, open_dispute) just to read one number, then re-spawns plan-change. This adds about 40 seconds per downgrade. Which change best reduces the latency while keeping tool access appropriate to each role?',
    options: [
      'Give plan-change the read-only get_past_due_balance tool, and keep apply_credit, process_refund and open_dispute with billing-investigator alone.',
      'Give plan-change the full billing-investigator tool set, so it can resolve any balance problem it finds without having to go back through the coordinator.',
      'Merge plan-change and billing-investigator into one account agent, so that balance checks and plan changes both happen within the same context.',
      'Have the coordinator run the full billing-investigator subagent on every incoming ticket before routing, so balance data is always already available.'
    ],
    answer: [0],
    explanation: 'Agents should get only the tools their role needs, with limited cross-role tools for specific high-frequency needs. A narrow, read-only balance lookup removes the round-trip for the common case, while money-moving tools stay with the billing specialist and complex balance problems still route through the coordinator.',
    rationales: [
      'Correct. A scoped cross-role tool serves the high-frequency need without granting refund or credit authority.',
      'Handing over refund and credit tools invites cross-specialization misuse and enlarges plan-change\'s tool set for a single read.',
      'Merging creates one agent with eight tools and two responsibilities, degrading selection and losing role separation.',
      'Running a full investigation on every ticket wastes tokens and latency on the majority of tickets that involve no downgrade.'
    ],
    trap: 'Over-granting tools vs scoped cross-role tool'
  },
  {
    id: 'e3-S1-07',
    scenario: 'S1',
    domain: 'D1',
    obj: 'X01',
    type: 'single',
    select: 1,
    stem: 'Nimbus\'s custom agent loop (Claude API, not the Agent SDK) is shown below. Logs show that on 23% of roaming tickets the customer receives only "Let me pull your usage records for that trip." and nothing else, even though the same response contained a <code>tool_use</code> block for <code>get_usage_records</code>.<pre>while (true) {\n  const res = await client.messages.create({ model, tools, system, messages });\n  messages.push({ role: "assistant", content: res.content });\n  if (res.content.some(b =&gt; b.type === "text")) break;   // agent replied\n  for (const tu of res.content.filter(b =&gt; b.type === "tool_use")) {\n    const out = await runTool(tu);\n    messages.push({ role: "user", content: [\n      { type: "tool_result", tool_use_id: tu.id, content: out } ] });\n  }\n}</pre>Which change correctly fixes the loop?',
    options: [
      'Add "Never write text before calling a tool" to the system prompt, and re-send the request whenever a response contains text but no tool call.',
      'Break only when the text includes a closing phrase such as "anything else I can help with," and cap the loop at 10 iterations as a safety stop.',
      'Keep the text check, but set tool_choice to {"type": "any"} so that every response must include a tool call before the loop is allowed to exit.',
      'Loop while stop_reason is "tool_use" and exit otherwise, returning all of a turn\'s tool_result blocks together in a single user message.'
    ],
    answer: [3],
    explanation: 'Loop control should be driven by stop_reason: continue on "tool_use", stop on "end_turn". A response can legitimately contain explanatory text alongside tool_use blocks, so checking for text content ends the loop early. Tool results for parallel calls should be returned together in one user message so the model sees them as a single turn.',
    rationales: [
      'Prompt wording does not fix control flow; text alongside tool_use is normal and the loop logic is what is wrong.',
      'Parsing natural-language phrases and relying on iteration caps are both named anti-patterns for loop termination.',
      'Forcing a tool call on every turn means the model can never produce a final reply, so the loop can never end properly.',
      'Correct. stop_reason is the reliable completion signal, and batching tool_result blocks keeps the conversation structure valid.'
    ],
    trap: 'Text content as completion signal'
  },
  {
    id: 'e3-S1-08',
    scenario: 'S1',
    domain: 'D5',
    obj: 'O22',
    type: 'single',
    select: 1,
    stem: 'Nimbus\'s agent resolves about 9,000 billing tickets per day; the QA team can review 300. Today QA reviews a uniform random 3% sample and finds a 2.1% error rate. A one-off deep audit found errors concentrated in tickets with mid-cycle plan changes (proration: 11% error), multi-line family accounts (7%), and cases where get_billing_statement and get_usage_records disagree on amounts (19%); single-line tickets without plan changes had a 0.4% error rate. How should the 300 daily reviews be allocated?',
    options: [
      'Review every resolution where the agent\'s self-rated confidence is below 7 out of 10, and fill any remaining reviewer capacity with a random sample of the rest.',
      'Prioritize tickets by case traits (proration, multi-line, conflicting tool amounts, credit size) and keep a small stratified sample of the rest.',
      'Review every conversation in which the customer\'s closing sentiment is negative, since dissatisfied customers are the most likely to have been given an incorrect credit.',
      'Review every credit above $100 and stop random sampling entirely, so that all reviewer capacity goes to the highest-dollar decisions each day.'
    ],
    answer: [1],
    explanation: 'Limited reviewer capacity should be routed by characteristics that actually predict errors (proration, multi-line accounts, contradictory source data), which the audit identified. A small stratified random sample of the remaining low-risk traffic still measures the ongoing error rate and catches novel error patterns that the risk rules would miss.',
    rationales: [
      'Self-reported confidence is poorly calibrated; the agent is often confident on exactly the proration cases it gets wrong.',
      'Correct. Characteristic-based routing concentrates review where errors are, and stratified sampling of the rest detects new failure modes.',
      'Sentiment reflects how the customer feels, not whether the resolution was correct, and it misses customers who happily accepted an over-credit.',
      'Dollar amount alone misses the proration and conflicting-data cases, and dropping sampling blinds QA to new error types.'
    ],
    trap: 'Self-reported confidence or sentiment as routing signal'
  },
  {
    id: 'e3-S1-09',
    scenario: 'S1',
    domain: 'D5',
    obj: 'X05',
    type: 'multi',
    select: 2,
    stem: 'Nimbus is reviewing five transcripts to write escalation few-shot examples for the system prompt. <b>Which TWO transcripts show handling that should be used as positive examples?</b>',
    options: [
      'Customer: "Get me a human, I\'m done with bots." The request is a simple plan change. Agent: "I can do that in 30 seconds, let me just look up your plan first," and it proceeds with the change.',
      'Customer asks Nimbus to match rival carrier Vireo\'s $5/day Canada rate. Policy covers only adjustments to Nimbus\'s own promotions. Agent escalates with a structured summary of the request and the policy gap.',
      'get_customer returns three accounts for "Dana Whitfield." Agent picks the account with the most recent activity in the city the customer mentioned and continues with the billing dispute.',
      'Customer writes a long, angry message about a device return that is within the 14-day window and has photo evidence. Agent escalates to a human because the negative sentiment is very high.',
      'Customer, in all caps, disputes a $12 late fee that policy lets the agent waive once a year. Agent acknowledges the frustration, offers the waiver, and the customer accepts it.'
    ],
    answer: [1, 4],
    explanation: 'Good escalation triggers are explicit customer requests for a human, policy gaps or exceptions, and inability to make progress. Competitor price matching is outside a policy that addresses only Nimbus\'s own promotions, so escalation is correct. A frustrated customer with an issue the agent can resolve should get an acknowledgment and an offer to resolve, escalating only if they reiterate a preference for a human.',
    rationales: [
      'An explicit request for a human should be honored immediately rather than attempting the work first.',
      'Correct. Policy is silent on competitor matching, which is a policy gap that warrants escalation with a structured handoff.',
      'Multiple matches require asking for additional identifiers, not picking an account by heuristic.',
      'Sentiment is not a proxy for complexity; this is a standard, policy-covered return the agent should resolve.',
      'Correct. Acknowledging frustration and resolving a within-policy issue is the right handling when the customer has not asked for a human.'
    ],
    trap: 'Sentiment-driven escalation; heuristic account selection'
  },
  {
    id: 'e3-S1-10',
    scenario: 'S1',
    domain: 'D1',
    obj: 'O06',
    type: 'multi',
    select: 2,
    stem: 'Nimbus\'s coordinator answers roaming disputes itself, telling customers it "cannot see per-country usage." In a staging test where an engineer invoked <code>roaming-investigator</code> directly, the subagent reported it could see bill line items but not usage sessions, and guessed which charges were in-pass.<pre>query({\n  prompt: ticket,\n  options: {\n    systemPrompt: coordinatorPrompt,\n    allowedTools: ["mcp__nimbus__get_customer", "mcp__nimbus__escalate_to_human"],\n    mcpServers: { nimbus: nimbusServer },\n    agents: {\n      "roaming-investigator": {\n        description: "Investigates disputed international roaming and travel-pass charges on Nimbus bills",\n        prompt: "You determine which roaming charges are valid under the plan and pass terms...",\n        tools: ["mcp__nimbus__get_billing_statement", "mcp__nimbus__get_travel_passes"]\n      },\n      "device-returns": { /* ... */ }\n    }\n  }\n});</pre><b>Which TWO changes are required to fix both problems while keeping each agent limited to its role?</b>',
    options: [
      'Add "Task" to the coordinator\'s allowedTools so it can spawn roaming-investigator.',
      'Add mcp__nimbus__get_usage_records to the coordinator\'s allowedTools so the subagent inherits it.',
      'Broaden roaming-investigator\'s description to "Handles billing questions" so it matches more tickets.',
      'Add mcp__nimbus__get_usage_records to roaming-investigator\'s tools list.',
      'Remove the tools field from roaming-investigator so it inherits every available tool.'
    ],
    answer: [0, 3],
    explanation: 'Two separate misconfigurations exist. The coordinator spawns subagents through the Task tool, so "Task" must be in its allowedTools or it falls back to handling tickets itself. The subagent\'s tools list defines what it can use; it lacks get_usage_records, so it must be added there explicitly.',
    rationales: [
      'Correct. Without "Task" in allowedTools, the coordinator cannot delegate to any subagent.',
      'Subagents do not get tools through the coordinator\'s allowedTools; the subagent\'s own tools list controls its access.',
      'The description is already specific; broadening it would cause overlap with other billing work without fixing either problem.',
      'Correct. The subagent needs the usage tool in its own tools list to see per-country sessions.',
      'Omitting tools would grant every tool, including refund and credit tools, violating role-scoped access.'
    ],
    trap: 'Missing Task wiring plus missing subagent tool'
  },
  {
    id: 'e3-S1-11',
    scenario: 'S1',
    domain: 'D1',
    obj: 'X03',
    type: 'single',
    select: 1,
    stem: 'Nimbus policy: an agent may issue at most $150 in goodwill credits per account per conversation; anything more requires human approval. The team deployed this Agent SDK hook:<pre>const creditCap: HookCallback = async (input) =&gt; {\n  const amt = input.tool_input.amount_usd;\n  if (amt &gt; 150) {\n    return { hookSpecificOutput: {\n      hookEventName: "PreToolUse",\n      permissionDecision: "deny",\n      permissionDecisionReason: "Credits over $150 need approval; call escalate_to_human with a case summary." } };\n  }\n  return {};\n};\n// hooks: { PreToolUse: [{ matcher: "mcp__nimbus__apply_credit", hooks: [creditCap] }] }</pre>A month later, an audit finds 23 conversations where the agent applied two or three credits of $120–$150 each to the same account, totaling up to $420. What is the most effective change?',
    options: [
      'Add a system-prompt rule stating that splitting a credit into several smaller credits to avoid the approval limit is prohibited and is audited monthly.',
      'Lower the per-call threshold in the hook to $75, so that even when credits are split the total is less likely to exceed the policy cap for the account.',
      'Have the hook add the credits already applied to this account in the session to the requested amount, and deny when the total exceeds $150.',
      'Move the check into a PostToolUse hook that reverses any credit total above $150 after it posts and then sends the customer a reversal notice.'
    ],
    answer: [2],
    explanation: 'The hook enforces the wrong quantity: the policy is cumulative per account per conversation, but the hook checks each call in isolation. Tracking the running total in the interception hook makes enforcement deterministic for the actual rule, and the deny reason already redirects the agent to escalation.',
    rationales: [
      'A prompt rule is probabilistic; the rule must be guaranteed, which is why a hook exists in the first place.',
      'A lower per-call limit still allows splitting to exceed the cap and wrongly blocks legitimate single credits between $75 and $150.',
      'Correct. The PreToolUse interception must evaluate the cumulative amount the policy actually limits.',
      'Reversing after the fact lets policy-violating credits post and creates a confusing customer experience; interception should happen before the call.'
    ],
    trap: 'Hook enforces per-call instead of the cumulative policy'
  },
  {
    id: 'e3-S1-12',
    scenario: 'S1',
    domain: 'D1',
    obj: 'O03',
    type: 'single',
    select: 1,
    stem: 'A customer\'s port-in from another carrier was rejected. The coordinator called <code>get_port_status</code> (request PR-40981: rejected, code 6P "account number mismatch," submitted account number ending 4471, 2026-09-14 10:02 UTC). In the chat, the customer then explained that 4471 is their old account; the correct account number ends 9020 and their transfer PIN is on file with the losing carrier. The coordinator spawns <code>porting-specialist</code> with: "Port-in for (555) 010-0142 failed due to an account issue. Please fix and resubmit." The subagent resubmits with 4471 and is rejected again. What is the most effective fix?',
    options: [
      'Pass the request ID, rejection code and text, submitted values, and the customer\'s corrected account number and PIN, each labeled with its source.',
      'Give porting-specialist the get_port_status tool so it can read the rejection itself, since the carrier record is the authoritative source for what failed.',
      'Rewrite the Task prompt in fuller prose that explains the account mismatch in more detail and asks the subagent to be careful with the resubmission.',
      'Increase porting-specialist\'s maxTurns to 25 so it can retry the resubmission with variations of the account number until the losing carrier accepts it.'
    ],
    answer: [0],
    explanation: 'The subagent sees only its Task prompt. The critical correction exists only in the coordinator\'s conversation, so no tool call can recover it. The Task prompt must include the complete findings, both tool-sourced and customer-sourced, as structured data with provenance, so the subagent can act without guessing or round-trips.',
    rationales: [
      'Correct. Structured, complete context with sources gives the subagent both what failed and the corrected values.',
      'The carrier record shows only the wrong number that was submitted; the correction came from the customer and is not in any tool.',
      'More prose without the actual corrected values still leaves the subagent unable to fix the submission.',
      'Guessing account numbers against a carrier system is unsafe and cannot substitute for the value the customer already provided.'
    ],
    trap: 'Omitting conversation-only facts from the subagent prompt'
  },
  {
    id: 'e3-S1-13',
    scenario: 'S1',
    domain: 'D1',
    obj: 'O09',
    type: 'single',
    select: 1,
    stem: 'Some Nimbus cases run for hours: a device return (RMA, then warehouse receipt), an installment payoff, and a port-out that waits on the gaining carrier. When the agent service redeploys mid-case, the coordinator restarts the case from the original ticket. Last week this created 57 duplicate return authorizations and 19 double-applied credits, and in several cases it told customers their port was "pending" although it had completed an hour earlier. Which design best enables reliable resumption?',
    options: [
      'Resume the original agent session with its full history after the redeploy, so the coordinator can see every tool call and result from before the restart.',
      'Add a system-prompt instruction telling the coordinator to check whether a return authorization or credit already exists before creating a new one.',
      'Store the full conversation transcript in a database and replay it as the first user message whenever a case restarts after a service redeploy.',
      'Have each step write to a case manifest (completed actions with IDs and results, pending waits), and have the coordinator load and inject it on resume.'
    ],
    answer: [3],
    explanation: 'Reliable resumption needs structured state persisted outside the conversation: which actions completed (with their IDs), their results, and what is still pending. The coordinator loads this manifest on resume and injects it into prompts, so it skips completed work and re-checks only the pending items, such as current port status, instead of trusting stale results.',
    rationales: [
      'Resuming with the old history re-presents stale tool results (the "pending" port that has since completed) as current facts.',
      'A prompt check is probabilistic and does not tell the coordinator which pending items need a fresh status check.',
      'Replaying a transcript has the same staleness problem and forces the agent to infer state from prose rather than read it.',
      'Correct. A structured manifest loaded on resume prevents repeated actions and targets re-checks at pending steps only.'
    ],
    trap: 'Resuming with stale tool results instead of structured state'
  },
  {
    id: 'e3-S1-14',
    scenario: 'S1',
    domain: 'D2',
    obj: 'X04',
    type: 'single',
    select: 1,
    stem: 'Nimbus\'s <code>create_return_authorization</code> MCP tool returns the same result for every failure:<pre>{ "isError": true,\n  "content": [{ "type": "text", "text": "Operation failed" }] }</pre>Logs show two very different causes: the warehouse API timing out (about 4% of calls, which succeed on retry) and devices purchased outside the 14-day return window. On window failures the agent retries up to five times and then tells the customer "our system is having trouble, please try again later," which generates repeat contacts. What is the most effective fix?',
    options: [
      'Cap retries at two in the agent loop for every create_return_authorization failure, then escalate to a human with the raw error text attached.',
      'Return errorCategory, isRetryable and a customer-facing explanation so the agent retries timeouts and explains policy denials.',
      'Return isError: false with an empty result for window failures, so that the agent stops retrying and treats the device as simply not returnable.',
      'Add few-shot examples teaching the agent that "Operation failed" after a return request usually means the return window has already expired.'
    ],
    answer: [1],
    explanation: 'Uniform error messages prevent the agent from choosing the right recovery. Structured metadata distinguishes a transient timeout (retryable) from a business-rule violation (not retryable, with a customer-friendly explanation), so the agent retries only when it helps and can tell the customer the actual reason.',
    rationales: [
      'A fixed retry cap still wastes retries on non-retryable denials and escalates cases the agent could explain itself.',
      'Correct. errorCategory plus isRetryable plus a readable message lets the agent make the right decision for each failure type.',
      'Disguising a failure as a successful empty result hides the reason and loses the customer-facing explanation.',
      'Inferring the cause from a generic message is a guess that misclassifies the timeouts, which do succeed on retry.'
    ],
    trap: 'Generic error responses'
  },
  {
    id: 'e3-S1-15',
    scenario: 'S1',
    domain: 'D1',
    obj: 'O04',
    type: 'single',
    select: 1,
    stem: 'Nimbus switched <code>billing-investigator</code> from a rigid script to a goal-oriented prompt: "Resolve the customer\'s billing dispute fairly." Resolution quality improved, but the subagent now returns free-form prose and sometimes applies credits or even changes the customer\'s plan on its own. In 8% of cases, the coordinator\'s final reply contradicts what happened, for example telling the customer "no credit was applied" when $35 was. How should the delegation be revised?',
    options: [
      'Revert to the earlier step-by-step script, since fixed steps make it predictable which actions the subagent will take on every dispute it handles.',
      'Let billing-investigator send the final reply to the customer itself, since it knows exactly which actions it took and cannot contradict itself.',
      'Keep the goal, add limits (it may propose but not apply credits over $50 or any plan change), and require a structured report of findings and actions.',
      'Have the coordinator re-read the billing statement after every delegation and infer from the new line items which credits the subagent must have applied.'
    ],
    answer: [2],
    explanation: 'Goal-oriented delegation works best when paired with explicit boundaries and a structured result. The coordinator keeps control over high-impact actions (proposals it approves) and gets reliable visibility into what was done, which removes the contradictions without giving up the subagent\'s adaptability.',
    rationales: [
      'Reverting brings back the brittle behavior that the goal-oriented prompt fixed; visibility can be restored without losing adaptability.',
      'Bypassing the coordinator fragments the customer experience across concerns and removes central control and error handling.',
      'Correct. Goals plus constraints plus a structured action report restore coordinator visibility and control.',
      'Inferring actions from side effects is fragile and delayed; the subagent should report its actions explicitly.'
    ],
    trap: 'Goal-oriented delegation without boundaries or structured output'
  }
]);
