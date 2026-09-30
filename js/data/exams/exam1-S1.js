/* Practice Exam 1 — Scenario S1: Customer Support Resolution Agent
   Context: VoltMart, an online consumer-electronics retailer (returns, warranty claims, billing disputes, order issues). */
CCAR.addQuestions('exam1', [
  {
    id: 'e1-S1-01',
    scenario: 'S1',
    domain: 'D1',
    obj: 'O10',
    type: 'single',
    select: 1,
    stem: 'VoltMart\'s support agent often receives messages like: "Order #VM-88213 (a 65-inch TV) arrived with a cracked panel, I was charged twice for soundbar order #VM-88190, and are my 14-month-old earbuds still under the 2-year warranty?" Today the agent works through concerns strictly one after another in a single thread. On tickets with 3+ concerns, average handle time is 11 minutes and the last concern goes unaddressed in 22% of cases. The three investigations share only the verified customer record. Which orchestration change best improves coverage and latency?',
    options: [
      'Route each concern through a fixed chain of specialist agents (returns, then billing, then warranty), passing the full transcript of each stage on to the next one.',
      'Ask customers who report several issues to open one ticket per concern, so that each conversation stays focused on one order and a single resolution path.',
      'After verifying the customer, split the message into distinct issues, investigate them in parallel with the shared customer context, then send one unified reply.',
      'Keep the single sequential thread, but raise max_tokens and move to a larger-context model so that later concerns are no longer squeezed out of the reply.'
    ],
    answer: [2],
    explanation: 'Multi-concern requests should be decomposed into distinct items, investigated in parallel using the shared context (the verified customer), and then synthesized into one resolution. The concerns are independent, so running them concurrently cuts latency, and tracking them as explicit items stops the last one from being dropped. A fixed chain keeps the sequential latency and grows each stage\'s context, while bigger limits do not change the flow that causes the misses.',
    rationales: [
      'A sequential chain keeps the 11-minute latency and bloats every later stage with transcripts it does not need.',
      'Pushes the orchestration problem onto the customer and hurts first-contact resolution.',
      'Correct. Decompose, investigate independent issues in parallel with shared context, then synthesize one answer.',
      'Output size and context size are not the cause; the single sequential thread is what drops later concerns.'
    ],
    trap: 'Sequential chain or bigger limits instead of parallel decomposition of a multi-concern request'
  },
  {
    id: 'e1-S1-02',
    scenario: 'S1',
    domain: 'D1',
    obj: 'O06',
    type: 'single',
    select: 1,
    stem: 'VoltMart\'s coordinator delegates warranty questions to a subagent. Traces show the Task call reaches <code>warranty-specialist</code>, but every run ends with "I cannot confirm the purchase date for this device," and the subagent log contains <code>Error: No such tool available: mcp__voltmart__lookup_order</code>.<pre>const warrantySpecialist = {\n  description: \'Determines warranty eligibility and files warranty claims for defective products\',\n  prompt: \'Look up the original order for purchase date and serial, then check coverage...\',\n  tools: [\'mcp__voltmart__check_warranty\', \'mcp__voltmart__file_warranty_claim\']\n};\n\nquery({ prompt: ticket, options: {\n  allowedTools: [\'Task\', \'mcp__voltmart__get_customer\', \'mcp__voltmart__lookup_order\'],\n  agents: { \'warranty-specialist\': warrantySpecialist, \'billing-specialist\': billingSpecialist }\n}});</pre>What is the correct fix?',
    options: [
      'Add <code>mcp__voltmart__lookup_order</code> to the warranty subagent\'s own <code>tools</code> array; an explicit tools list grants only those tools.',
      'Keep the definition as is, have the coordinator call <code>lookup_order</code> itself, and re-spawn the subagent whenever it reports a missing purchase date.',
      'Delete the <code>tools</code> field so the subagent inherits every tool, including <code>process_refund</code>, and can therefore never lack a tool it needs.',
      'Rewrite the <code>description</code> to mention order lookups, so that the coordinator routes the order-lookup steps of warranty cases to the right agent.'
    ],
    answer: [0],
    explanation: 'An AgentDefinition with an explicit <code>tools</code> list restricts the subagent to exactly those tools; it does not pick up tools from the coordinator\'s <code>allowedTools</code>. The subagent\'s own prompt requires an order lookup, so the fix is to add that one tool to its list. Routing is already working (the Task call reaches the right agent), so description changes do not help.',
    rationales: [
      'Correct. The subagent needs the tool its role requires in its own tools list.',
      'Creates a round-trip through the coordinator for every warranty case instead of fixing the misconfiguration.',
      'Over-provisions the warranty agent with refund and other out-of-role tools; least privilege is the goal.',
      'Routing already succeeds; the failure is a missing tool inside the subagent, not coordinator selection.'
    ],
    trap: 'Assuming subagents inherit the coordinator\'s tools / giving all tools'
  },
  {
    id: 'e1-S1-03',
    scenario: 'S1',
    domain: 'D5',
    obj: 'O22',
    type: 'single',
    select: 1,
    stem: 'VoltMart\'s agent auto-resolves 81% of tickets. QA reviews a uniform 5% random sample and reports 96% decision accuracy. A deeper audit of 2,000 tickets finds errors concentrated in two segments: open-box/refurbished returns (79% accurate) and cross-border billing disputes involving currency conversion (84%). Tickets where <code>lookup_order</code> and the carrier feed disagree (e.g., "delivered" vs "lost in transit") are wrong 31% of the time. Reviewers can handle about 8% of volume. Which review routing design is best?',
    options: [
      'Raise the uniform random sample from 5% to 8% of resolved tickets, which uses the full reviewer capacity and keeps the measured error rate unbiased.',
      'Route the weak segments and any ticket with contradictory tool data to review first, and keep a small stratified sample of confident auto-resolutions.',
      'Have the agent rate its confidence from 1 to 10 on each decision and send every ticket rated below 7 to reviewers, filling capacity from the lowest scores.',
      'Route tickets whose final customer message shows negative sentiment, since dissatisfied customers are the most likely sign of an incorrect decision.'
    ],
    answer: [1],
    explanation: 'The 96% aggregate hides segments that perform far worse, so limited reviewer capacity should go to the case types and signals that predict errors: the weak segments and tickets with contradictory source data. A small stratified sample of high-confidence auto-resolutions still measures ongoing error rates and catches new failure patterns. Uniform sampling spends most reviews on easy cases, and self-rated confidence and sentiment are poor proxies for correctness.',
    rationales: [
      'Uniform sampling measures the average but spends most reviews on cases that are already right.',
      'Correct. Route by case characteristics and contradictory data, plus stratified sampling of confident cases.',
      'Self-reported confidence is poorly calibrated; the agent is often confident on exactly the cases it gets wrong.',
      'Sentiment tracks customer mood, not whether the agent applied policy correctly.'
    ],
    trap: 'Random sampling or self-rated confidence instead of segment- and ambiguity-based routing'
  },
  {
    id: 'e1-S1-04',
    scenario: 'S1',
    domain: 'D1',
    obj: 'X01',
    type: 'single',
    select: 1,
    stem: 'VoltMart\'s custom loop (Claude API, not the SDK) handles order issues:<pre>while (true) {\n  const res = await client.messages.create({ model, tools, messages, max_tokens: 2048 });\n  messages.push({ role: \'assistant\', content: res.content });\n  if (res.content.some(b =&gt; b.type === \'text\')) break;   // reply is ready\n  const results = [];\n  for (const b of res.content) {\n    if (b.type === \'tool_use\') results.push(await runTool(b));\n  }\n  messages.push({ role: \'user\', content: results });\n}</pre>In 18% of conversations the customer receives only "Let me pull up your order and check the refund status..." and nothing more. What is the root cause and fix?',
    options: [
      'The model narrates before acting; add a system prompt rule forbidding text in the same response as a tool call, so that the text check stays reliable.',
      'The loop has no upper bound; add a 10-iteration cap and also exit when the reply contains a phrase such as "anything else I can help with".',
      'The tool results are malformed; send each result in its own separate user message, one per tool_use block, so the model can match them to calls.',
      'A text block can accompany tool_use blocks; branch on <code>stop_reason</code>, continuing on "tool_use" and ending only on "end_turn".'
    ],
    answer: [3],
    explanation: 'A response can contain explanatory text and tool_use blocks together, so "has text" is not a completion signal. The loop should continue while <code>stop_reason</code> is "tool_use" (executing tools and returning their results) and end when it is "end_turn". Prompting away the text is probabilistic, phrase matching and iteration caps are named anti-patterns, and all tool results for one turn belong in a single user message.',
    rationales: [
      'A prompt rule reduces but cannot eliminate mixed responses, and the text check remains the wrong signal.',
      'Iteration caps as the primary stop and natural-language completion checks are both loop anti-patterns.',
      'Wrong: results for parallel tool calls go together in one user message, matched by tool_use_id.',
      'Correct. Loop control should key off stop_reason, not the presence of text.'
    ],
    trap: 'Text content as a completion signal'
  },
  {
    id: 'e1-S1-05',
    scenario: 'S1',
    domain: 'D1',
    obj: 'X02',
    type: 'single',
    select: 1,
    stem: 'VoltMart policy says a return refund may be issued only after the warehouse scans the item in (<code>get_rma_status</code> returns <code>"received"</code>). The system prompt states this rule in bold, with four few-shot examples. Finance still finds that 3.8% of return refunds were issued while the RMA was "label_created" or "in_transit", costing about $41k a month in items that are never sent back. What change most effectively fixes this?',
    options: [
      'Gate <code>process_refund</code> in code, blocking it unless this session\'s <code>get_rma_status</code> result for the order is "received".',
      'Put the rule at both the top and bottom of the system prompt, add eight more few-shot examples, and restate it in the refund tool description.',
      'Upgrade the support agent to a larger model, which follows multi-step policy instructions more consistently in long conversations.',
      'Run a nightly audit that finds refunds issued before receipt and reverses them automatically, emailing each customer an explanation.'
    ],
    answer: [0],
    explanation: 'When a business rule has financial consequences, the ordering must be enforced programmatically: a prerequisite gate (tool-layer check or PreToolUse hook) blocks <code>process_refund</code> until the required status has actually been returned, and tells the agent why. Prompt instructions and examples, however prominent, have a non-zero failure rate. Reversing refunds after the fact still leaks money and damages customer trust.',
    rationales: [
      'Correct. A deterministic prerequisite gate guarantees the refund cannot precede receipt.',
      'More prompt emphasis is still probabilistic compliance; the 3.8% already has a strong prompt.',
      'A bigger model lowers but does not remove the failure rate for a rule that must always hold.',
      'Detects violations after money has left and adds a poor customer experience; it does not prevent them.'
    ],
    trap: 'Prompt emphasis for a deterministic requirement'
  },
  {
    id: 'e1-S1-06',
    scenario: 'S1',
    domain: 'D1',
    obj: 'X03',
    type: 'single',
    select: 1,
    stem: 'VoltMart\'s agent reads dates from three MCP tools backed by different systems:<pre>lookup_order    → { "delivered_at": 1718841600 }            // Unix seconds\ncheck_warranty  → { "purchase_date": "06/07/2024" }        // MM/DD/YYYY\nlegacy_returns  → { "received": "2024-06-20T14:03:00Z" }   // ISO 8601</pre>In 6% of eligibility decisions the agent miscalculates the 30-day return window or the 2-year warranty, for example reading 06/07/2024 as 6 July for EU customers. The system prompt already explains each format. What is the most reliable fix?',
    options: [
      'Add a worked example for each date format to the system prompt and instruct the agent to restate every date in ISO 8601 before it uses the date.',
      'Register a PreToolUse hook on the three tools that rewrites their input arguments so that every request asks its backend for ISO 8601 dates.',
      'Add a PostToolUse hook that converts every date field in these tool results to ISO 8601 (UTC) before the model processes them.',
      'Give the agent a <code>date_diff</code> calculator tool and instruct it to call that tool whenever it compares a date against a policy window.'
    ],
    answer: [2],
    explanation: 'PostToolUse hooks intercept tool results before the model sees them, so heterogeneous formats (Unix timestamps, MM/DD strings, ISO 8601) can be normalized deterministically in code. The prompt already explains the formats and errors persist, which shows that instruction-based handling is probabilistic. A calculator helps with arithmetic but still depends on the model parsing an ambiguous date string correctly first.',
    rationales: [
      'More prompt guidance is what already exists; it leaves the model to interpret ambiguous strings.',
      'PreToolUse intercepts outgoing calls, not results, and these backends have no format parameter to request.',
      'Correct. Normalize results in a PostToolUse hook so the model only ever sees one unambiguous format.',
      'The model would still feed the calculator its own misreading of 06/07/2024.'
    ],
    trap: 'Prompt guidance or wrong hook event for data normalization'
  },
  {
    id: 'e1-S1-07',
    scenario: 'S1',
    domain: 'D2',
    obj: 'X04',
    type: 'single',
    select: 1,
    stem: 'VoltMart\'s <code>process_refund</code> MCP tool returns the same result for every failure:<pre>{ "isError": true,\n  "content": [{ "type": "text", "text": "Operation failed" }] }</pre>In one week there were 1,140 failures: 38% payment-gateway timeouts, 41% orders outside the 30-day window, and 21% amounts above the original charge. The agent retries every failure up to 4 times, then tells customers "our system is down, please try later." Which change best fixes this behavior?',
    options: [
      'Add a system prompt rule that the agent may retry <code>process_refund</code> once at most and must then escalate the ticket to a human with the error text.',
      'Return the failure category (transient, business, or validation), an <code>isRetryable</code> flag, and a customer-safe reason in each error result.',
      'Set <code>isError</code> to false for policy failures and put the reason in the text, so that the agent stops treating them as errors and does not retry.',
      'Have the MCP server retry every failure internally five times with exponential backoff before returning the generic error message to the agent.'
    ],
    answer: [1],
    explanation: 'A uniform "Operation failed" hides what the agent needs to decide: timeouts are transient and worth retrying, while out-of-window and over-amount requests are business or validation errors that will never succeed on retry. Structured metadata (errorCategory, isRetryable, a human-readable reason) lets the agent retry only transient failures and explain policy outcomes to the customer, for example offering a warranty claim instead. Blanket retry limits or internal retries treat all three causes the same way.',
    rationales: [
      'A retry cap still wastes a retry on non-retryable errors and escalates cases the agent could explain itself.',
      'Correct. Categorized, retryable-flagged errors with a readable reason enable the right recovery for each cause.',
      'Marking failures as successes hides them from the agent and breaks any error-handling logic.',
      'Server-side retries help only the 38% transient share and still return an uninformative message.'
    ],
    trap: 'Uniform error responses / suppressing errors as success'
  },
  {
    id: 'e1-S1-08',
    scenario: 'S1',
    domain: 'D5',
    obj: 'X05',
    type: 'multi',
    select: 2,
    stem: 'VoltMart is tuning its escalation rules. VoltMart policy offers price adjustments only for price drops on voltmart.com within 14 days of purchase. Which TWO of these conversations should the agent escalate to a human rather than keep resolving itself?',
    options: [
      'A customer asks VoltMart to match a lower price for the same laptop listed by a competitor retailer; they bought it from VoltMart 5 days ago.',
      'A customer writes in all caps that their delayed blender is "a joke"; lookup_order shows it is out for delivery today with tracking attached.',
      'get_customer returns two accounts for "Dana Reyes" in the same city, and the customer has not yet given an email address or an order number.',
      'A customer opens with "Just get me a human agent, please," and then asks a routine question about when their order will be shipped.',
      'A customer reports a dead-on-arrival router delivered 4 days ago, with photos, which clearly qualifies under the standard replacement policy.'
    ],
    answer: [0, 3],
    explanation: 'Escalation triggers are explicit customer requests for a human (honored immediately, without first investigating), policy gaps where the policy is silent on the request, and inability to make progress. Competitor price matching is not covered by an own-site policy, so it is a policy gap. Frustration about a resolvable issue calls for acknowledgement and a resolution offer, multiple customer matches call for an additional identifier, and a standard DOA replacement is squarely within the agent\'s authority.',
    rationales: [
      'Correct. The policy only covers voltmart.com price drops; competitor matching is a policy gap that needs a human decision.',
      'Acknowledge the frustration and share the delivery status; escalate only if the customer then asks for a human.',
      'Ask for an additional identifier such as email or order number instead of guessing or escalating.',
      'Correct. An explicit request for a human is honored immediately, even when the question itself is routine.',
      'A clear-cut replacement within policy is exactly what the agent should resolve to reach first-contact targets.'
    ],
    trap: 'Escalating on sentiment or ambiguity instead of explicit requests and policy gaps'
  },
  {
    id: 'e1-S1-09',
    scenario: 'S1',
    domain: 'D2',
    obj: 'O36',
    type: 'single',
    select: 1,
    stem: 'VoltMart\'s tools already have detailed descriptions: <code>create_return</code> says "Use within 30 days of delivery for any reason; not for defects after 30 days," and <code>file_warranty_claim</code> says "Use for manufacturer defects from day 31 to the end of warranty; requires serial number." Yet 17% of warranty-eligible cases ("I want to send back my 5-month-old headphones, the left side died") go to <code>create_return</code> and are rejected. The system prompt contains: "When the customer says return, send back, or refund, start with create_return." What is the most effective fix?',
    options: [
      'Expand both tool descriptions further with ten example customer phrasings each, so that the defect cases are matched to the warranty tool more often.',
      'Add a PreToolUse hook that blocks <code>create_return</code> for orders delivered more than 30 days ago and returns an error message to the agent.',
      'Merge the two tools into a single <code>handle_product_issue</code> tool that decides internally whether to open a return or a warranty claim.',
      'Remove or rewrite the keyword rule in the system prompt so that tool choice follows the eligibility boundaries already in the descriptions.'
    ],
    answer: [3],
    explanation: 'Keyword-sensitive system prompt instructions can override well-written tool descriptions: customers say "send back" for defects, and the prompt maps that phrase straight to <code>create_return</code>. The descriptions already state the boundaries, so the root cause is the prompt wording, and removing the keyword association lets the model select by eligibility. The hook would block bad calls but leave selection broken, costing a failed call and a retry on every such case.',
    rationales: [
      'The descriptions are not the weak point; more phrasings still compete with an explicit prompt instruction.',
      'Blocks the symptom after the wrong choice is made; the agent keeps choosing create_return first.',
      'A larger redesign that hides the boundary inside a tool when a one-line prompt fix removes the cause.',
      'Correct. Review system prompts for keyword rules that override tool descriptions.'
    ],
    trap: 'Improving descriptions when a keyword-sensitive prompt instruction is the cause'
  },
  {
    id: 'e1-S1-10',
    scenario: 'S1',
    domain: 'D2',
    obj: 'O37',
    type: 'single',
    select: 1,
    stem: 'VoltMart\'s chat widget passes an authenticated session token, and every conversation must begin with <code>get_customer</code> using that token before anything else happens. In 9% of conversations the first response is text ("Could you share your email so I can find your account?") even though identity is already available, and some later tool calls then run without a verified customer. Which configuration is correct?',
    options: [
      'Send the first request with <code>tool_choice: {"type": "tool", "name": "get_customer"}</code>, then use <code>"auto"</code> afterwards.',
      'Set <code>tool_choice: {"type": "any"}</code> on every request so that the model must always call a tool and can never reply with a text-only message.',
      'Force <code>{"type": "tool", "name": "get_customer"}</code> on every request in the conversation so that identity is re-verified before each action.',
      'Keep <code>{"type": "auto"}</code> and add a system prompt line plus three examples showing <code>get_customer</code> always being called first.'
    ],
    answer: [0],
    explanation: 'Forced tool selection guarantees that a specific tool is called first; subsequent steps then run in follow-up turns with normal selection. Here that means forcing <code>get_customer</code> on the first request only and returning to "auto" afterwards so the agent can choose other tools and reply to the customer. "any" guarantees some tool, not the right one, and on every turn it prevents plain replies; forcing get_customer throughout would loop on the same call.',
    rationales: [
      'Correct. Force the prerequisite tool on the first turn, then let the model choose freely.',
      '"any" does not guarantee get_customer and, applied to every turn, blocks the text replies customers need.',
      'Forcing the same tool on every request means the agent can never call anything else or answer.',
      'Prompt instructions are what already fail 9% of the time; tool_choice gives a guarantee.'
    ],
    trap: 'tool_choice "any" or prompt guidance instead of forced first-turn selection'
  },
  {
    id: 'e1-S1-11',
    scenario: 'S1',
    domain: 'D5',
    obj: 'O21',
    type: 'single',
    select: 1,
    stem: 'In billing disputes that run 40+ turns, VoltMart\'s agent summarizes older history to stay within budget. Each <code>lookup_order</code> result carries 58 fields, of which about 6 matter for disputes. Late in one session the agent told a customer their refund would be "about $200 in a few days," when the disputed charge was $214.37 and the customer had been promised a credit to their original card by Friday 14 June. Which change best prevents this?',
    options: [
      'Summarize the history more often, every 5 turns instead of every 15, so that the summaries stay short and the most recent facts are always near the end.',
      'Switch to a model with a larger context window and stop summarizing, so that every tool result and customer message stays in context verbatim.',
      'Keep amounts, dates, order IDs, and promises in a case-facts block sent with every prompt, and trim order results to dispute-relevant fields.',
      'Instruct the agent to ask the customer to restate the disputed amount and any promised dates before it gives its final answer on the refund.'
    ],
    answer: [2],
    explanation: 'Progressive summarization tends to blur exact amounts, dates, and customer-stated expectations into vague phrases. Extracting transactional facts into a persistent case-facts block that is included in every prompt, outside the summarized history, preserves them exactly, and trimming verbose tool results to relevant fields stops 52 irrelevant fields per lookup from consuming the budget. A bigger window defers the problem and still leaves key facts buried in the middle of a long context.',
    rationales: [
      'More frequent summarization compresses the same facts more often and loses precision faster.',
      'Larger windows raise cost and still suffer from key facts buried among verbose tool output.',
      'Correct. A persistent case-facts block plus trimmed tool outputs keeps exact values in view.',
      'Shifts the burden to the customer and still leaves the agent unable to track its own commitments.'
    ],
    trap: 'Bigger context window or more summarization instead of a persistent case-facts block'
  },
  {
    id: 'e1-S1-12',
    scenario: 'S1',
    domain: 'D1',
    obj: 'O09',
    type: 'single',
    select: 1,
    stem: 'For multi-issue tickets, VoltMart\'s coordinator spawns returns, billing, and warranty subagents in parallel. During a deployment the service restarted mid-case: the billing subagent had already issued a $129.00 refund, the returns subagent had created an RMA, and the warranty check was still running. When the customer reconnected, the agent re-ran all three investigations and issued a second $129.00 refund. How should the system persist state so that resumption is reliable?',
    options: [
      'Store the full conversation transcript after every turn and replay it to the coordinator on reconnect, so that it can reason about which steps already happened.',
      'After each subagent action, write a case record (issue, status, refund or RMA IDs) to a durable store; on resume, load it and dispatch only open issues.',
      'On reconnect, ask the customer to describe what was already resolved, then have the coordinator skip any issues that the customer confirms are done.',
      'Delay all refunds and RMAs until every subagent has finished, so that an interrupted case has made no changes and can safely be rerun from the start.'
    ],
    answer: [1],
    explanation: 'Reliable resumption needs structured state written as work completes: each subagent\'s outcome (status plus IDs of side effects such as refunds and RMAs) is persisted to a known location, and on resume the coordinator loads that record, injects completed results, and re-dispatches only unfinished issues. Replaying a transcript relies on the model inferring what happened and loses in-flight subagent work. Deferring all side effects still repeats every investigation and delays customers.',
    rationales: [
      'Leaves completion status to model inference over a long transcript, and in-flight subagent results are missing from it.',
      'Correct. Durable per-issue state with side-effect IDs lets the coordinator resume without repeating actions.',
      'Customers may not know what the system already did, so this is unreliable for financial actions.',
      'Avoids duplicate side effects only by rerunning all work and delaying resolutions for every case.'
    ],
    trap: 'Transcript replay or rerun-from-scratch instead of structured state persistence'
  },
  {
    id: 'e1-S1-13',
    scenario: 'S1',
    domain: 'D1',
    obj: 'O03',
    type: 'single',
    select: 1,
    stem: 'VoltMart\'s coordinator has verified the customer (ID C-58812) and found two $349.99 charges for order #VM-90417: a settled capture on 3 May (txn T-1) and a second on 4 May (txn T-2, status "pending authorization"). It spawns the billing subagent with this Task prompt: "Investigate the duplicate charge the customer mentioned and propose a resolution." The subagent makes 7 tool calls re-identifying the customer and in 40% of runs proposes refunding T-1. What is the most effective fix?',
    options: [
      'Let the billing subagent inherit the coordinator\'s whole conversation so that it can read the earlier get_customer and lookup_order results for itself.',
      'Give the billing subagent <code>get_customer</code> and <code>lookup_order</code> too, and tell it to re-verify every detail before it proposes anything.',
      'Tell the billing subagent in its system prompt to return to the coordinator with a list of questions whenever any case detail is unclear to it.',
      'Put the customer ID, order ID, both transactions with IDs, dates and statuses, and the customer\'s exact claim into the Task prompt.'
    ],
    answer: [3],
    explanation: 'Subagents do not inherit the coordinator\'s conversation or tool results; the Task prompt is the only context they receive. The coordinator already holds the verified ID and both transaction records, so passing them as structured data removes the redundant lookups and lets the subagent see that T-2 is a pending authorization, not a second capture. Re-verification and question round-trips add latency without supplying the facts it needs.',
    rationales: [
      'Subagents do not automatically inherit parent context, and dumping the whole transcript is not the targeted fix.',
      'Makes the subagent redo work the coordinator already did, and it still may not distinguish the two transactions.',
      'Builds in round-trips for context that could have been passed up front.',
      'Correct. Include complete findings and structured data in the subagent prompt.'
    ],
    trap: 'Expecting a subagent to see coordinator context it was not given'
  },
  {
    id: 'e1-S1-14',
    scenario: 'S1',
    domain: 'D1',
    obj: 'O04',
    type: 'single',
    select: 1,
    stem: 'VoltMart\'s coordinator sends the returns subagent a 14-step procedure: "1. Call lookup_order. 2. If delivered_at is more than 30 days ago, deny. 3. If the item is opened, apply a 15% restocking fee..." Audits show wrong denials on holiday purchases (Nov–Dec orders are returnable until 31 Jan), gift orders (the recipient is not the purchaser), and partial bundle returns. Each fix so far has added steps, and the procedure now contradicts itself in two places. Which delegation change is best?',
    options: [
      'Give the goal and the return policy with its exceptions, and require a structured decision that cites the clause and flags unclear cases.',
      'Add explicit branches for the holiday, gift, and bundle cases, renumber the procedure, and test each new branch against last month\'s tickets.',
      'Tell the subagent to use its own judgment on returns and resolve each case end to end, issuing refunds directly without reporting back.',
      'Remove the returns subagent and have the coordinator handle returns itself, since it already holds the full conversation with the customer.'
    ],
    answer: [0],
    explanation: 'Goal-oriented delegation states the objective, the constraints and quality criteria (the policy and its exceptions), and the required output, letting the subagent adapt to cases a script did not anticipate. Requiring a structured decision with the cited clause and flags for uncertain cases keeps the coordinator\'s visibility and control. More branches keep growing a brittle, self-contradicting script, while unchecked autonomy gives up oversight of financial actions.',
    rationales: [
      'Correct. Goals plus criteria enable adaptation; structured output preserves coordinator control.',
      'Procedural patching is what produced the contradictions; the next edge case will fail the same way.',
      'Swings to the other extreme: adaptive but with no coordinator visibility over refunds.',
      'Moves the same brittle logic into the coordinator and bloats its context without fixing the delegation.'
    ],
    trap: 'Procedural step lists vs goal-oriented delegation (and uncontrolled autonomy)'
  },
  {
    id: 'e1-S1-15',
    scenario: 'S1',
    domain: 'D2',
    obj: 'O33',
    type: 'multi',
    select: 2,
    stem: 'VoltMart\'s coordinator uses returns, billing, and warranty subagents, and every subagent currently receives all 16 MCP tools "for flexibility." Logs show the billing subagent occasionally calling <code>create_return</code>, and the warranty subagent issued 23 refunds last month through <code>process_refund</code>. Separately, warranty cases need the purchase date and serial number from the order record in 92% of claims. Which TWO changes should you make?',
    options: [
      'Keep all 16 tools on every subagent, but add a system prompt section to each one that lists the tools it is not allowed to call and why.',
      'Restrict each subagent to the few tools its role needs, e.g. billing gets billing-history and refund tools, warranty gets coverage and claim tools.',
      'Merge the three subagents into one generalist agent with all 16 tools and a larger model, so that no role ever lacks a tool it might need.',
      'Remove order data from the warranty subagent entirely and have it return to the coordinator every time it needs a purchase date or serial.',
      'Give the warranty subagent a scoped, read-only order lookup that returns only purchase date and serial, since most claims need that data.'
    ],
    answer: [1, 4],
    explanation: 'Too many tools degrade selection, and agents with out-of-role tools misuse them, so each subagent should receive only the tools its role needs. Where a role has a frequent, legitimate cross-role need, a narrowly scoped tool (read-only, limited fields) avoids constant round-trips through the coordinator without reopening broad access. Prompt-level prohibitions are probabilistic, and a single generalist makes selection harder.',
    rationales: [
      'Prompt prohibitions leave the tools available; misuse continues at a lower but non-zero rate.',
      'Correct. Role-scoped tool sets prevent cross-specialization misuse such as warranty refunds.',
      'Increases tool-selection complexity; a bigger model does not fix having 16 tools in play.',
      'Adds a coordinator round-trip to 92% of claims; a scoped tool meets the frequent need safely.',
      'Correct. A limited cross-role tool serves the high-frequency need without granting refund or write access.'
    ],
    trap: 'Giving all tools "for flexibility" vs scoped cross-role tools'
  }
]);
