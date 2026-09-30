/* Practice Exam 6, Scenario S6 (Structured Data Extraction), items 09-15 */
CCAR.addQuestions('exam6', [
  {
    id: 'e6-S6-09', scenario: 'S6', domain: 'D5', obj: 'O22', type: 'multi', select: 2,
    stem: `<p>Poplar Mutual, a regional insurer, extracts 22 fields from about 4,000 claim forms a day, including policy number, incident date, claimed amount and repair-shop details. Two reviewers can check about 300 forms a day between them, so the team must decide which extractions they see. A labeled validation set of 3,000 forms, checked field by field by senior adjusters, was completed last month.</p>
<p>The pilot has so far used the model's single overall confidence score per form, and reviewers found that many forms scored 0.95 had one badly wrong field, usually the claimed amount on forms with handwritten corrections. Leadership also wants evidence, month after month, that auto-accepted extractions stay accurate, and a way to notice new kinds of errors, for example when a large repair-shop network changes its invoice template, which happens several times a year. The claims system itself is being upgraded next quarter, and most forms now arrive through the mobile app.</p>
<p>Which two practices should the review design include? (Select 2.)</p>`,
    options: [
      `Have the model output a confidence score for each field, and calibrate per-field review thresholds on the labeled validation set so reviewers see the fields most likely to be wrong.`,
      `Route forms to review by the model's single overall confidence score, sending everything below 0.95 to the two reviewers until their daily capacity of 300 forms is used up.`,
      `Review a random 10% of all incoming forms regardless of confidence, so every kind of form is equally likely to be checked and the reviewers' workload stays predictable each day.`,
      `Run every form through extraction twice and send a form to review only when the two runs disagree on a field, treating agreement between runs as evidence that the extraction is correct.`,
      `Take a stratified random sample of the high-confidence, auto-accepted extractions each week, across form types and sources, to measure their error rate and catch new error patterns.`
    ],
    answer: [0, 4],
    explanation: `Review capacity should go where errors are likely, and automation needs ongoing evidence that it still works. Field-level confidence, calibrated against the labeled validation set, addresses the first need: the pilot showed that one overall score hides a single badly wrong field, while per-field thresholds set from adjuster-checked data send reviewers to the risky fields, such as claimed amounts on forms with handwritten corrections. Stratified random sampling of high-confidence, auto-accepted extractions addresses the second: it measures the error rate of work nobody reviews, across form types and sources, and surfaces new error patterns, such as a repair network's changed template, before they spread. The overall per-form score is the signal that already failed. A uniform 10% sample spends most of the capacity on forms that are fine. Two runs can agree on the same wrong value, and running every form twice doubles cost. The claims-system upgrade and the mobile app are noise.`,
    rationales: [
      `Correct. Per-field confidence calibrated on the adjuster-checked set exposes the one bad field that an overall 0.95 hides and sends limited review capacity to the riskiest fields.`,
      `The overall score is the signal that already failed: forms at 0.95 had one badly wrong field, so a threshold on it keeps auto-accepting those errors.`,
      `A uniform sample spends most of the 300 daily reviews on forms that are fine and does not concentrate attention on risky fields or new error types.`,
      `Two runs can agree on the same wrong value, especially on handwritten corrections, and running every form twice doubles cost without calibrated evidence.`,
      `Correct. Sampling auto-accepted work across form types and sources measures the error rate of unreviewed extractions and catches new patterns such as a changed template.`
    ],
    trap: `Uncalibrated overall confidence, uniform sampling or consensus instead of calibrated field-level routing`,
    signals: `Decisive: capacity covers 300 of 4,000 forms, the overall score hid single wrong fields, a labeled validation set exists, and leadership wants ongoing accuracy evidence and detection of new errors. Noise: the claims-system upgrade and the move to mobile submissions.`
  },
  {
    id: 'e6-S6-10', scenario: 'S6', domain: 'D5', obj: 'O18', type: 'single', select: 1,
    stem: `<p>Willow Staffing, a recruitment agency, extracts commercial terms from each client's contract set into its billing system. A typical set has a master services agreement, one or more amendments and several statements of work. For one large client, the 2021 MSA sets payment terms at net 45, Amendment 1 (effective March 2023) changes them to net 60, and the 2024 SOW sets new hourly rates. The pipeline extracts each document separately into flat fields such as <code>payment_terms_days</code> and <code>hourly_rate</code>, then a merge step combines the documents into one record per client.</p>
<p>Finance found that 12% of client records have wrong terms. The merge keeps the value from whichever document it processed last, and document order follows upload order, which is effectively random. The extracted fields carry no indication of which document or section a value came from, or when it took effect, so the merge cannot apply the rule the legal team uses: the latest effective amendment wins, and conflicts that are not clearly resolved go to a lawyer. Billing is also moving to monthly invoicing, and most contract sets arrive as signed PDFs.</p>
<p>Which change to the extraction output best fixes the merge?</p>`,
    options: [
      `Process the documents in each contract set in filename order instead of upload order, so the merge applies them in a consistent sequence and the last document processed always wins.`,
      `Put all the documents of a contract set into a single prompt and ask the model to return the final terms for the client, so that no separate merge step is needed at all.`,
      `Have the model attach a self-reported confidence score to each extracted field, and let the merge keep whichever value has the highest confidence across the documents in the set.`,
      `Return each field with its value, source document, section, supporting excerpt and effective date, so the merge applies the latest-amendment rule and flags unresolved conflicts.`
    ],
    answer: [3],
    explanation: `When extractions from several documents are combined downstream, each value needs provenance and temporal metadata: which document and section it came from, the supporting text, and when it took effect. Here the merge has only bare values, so it cannot know that net 60 comes from an amendment effective in 2023 that supersedes the MSA's net 45, and it falls back on processing order, which is random. With the source document, section, excerpt and effective date on each field, the merge can apply the legal team's rule deterministically (the latest effective amendment wins), send genuinely unresolved conflicts to a lawyer, and show auditors where every billed term came from. Filename order is consistent but arbitrary, since filenames do not encode legal precedence. One large prompt returns answers that cannot be audited field by field and gets harder as sets grow. Self-reported confidence says nothing about which document governs. Monthly invoicing and the signed PDFs are noise.`,
    rationales: [
      `Filename order is consistent but arbitrary, because filenames do not encode which document legally governs, so wrong terms would simply become wrong in a repeatable way.`,
      `One prompt returns final terms with no per-field source or date, so finance and lawyers cannot audit which document set each billed term, and large sets get harder.`,
      `Confidence reflects how clearly a value was printed, not which document governs, so the MSA's clearly printed net 45 could beat the amendment's net 60.`,
      `Correct. Source, section, excerpt and effective date on each field let the merge apply the latest-amendment rule deterministically and route true conflicts to a lawyer.`
    ],
    trap: `Ordering tricks, one big prompt or confidence instead of provenance and effective dates`,
    signals: `Decisive: the merge keeps the last-processed value because fields carry no source or effective date, while the legal rule depends on exactly those. Noise: the move to monthly invoicing and the signed PDFs.`
  },
  {
    id: 'e6-S6-11', scenario: 'S6', domain: 'D5', obj: 'X05', type: 'single', select: 1,
    stem: `<p>Elmstead Hospitality, a hotel group with 45 properties, uses an extraction agent to process supplier invoices. After extracting the invoice fields, the agent calls <code>lookup_vendor(name)</code> to match the supplier to a vendor record before payment is scheduled. For an invoice from "Acme Supply", the tool returned:</p>
<pre>[{ "vendor_id": "V-10442", "name": "Acme Supply Ltd",  "country": "UK", "status": "active",   "tax_id": "GB 293 4471 06" },
 { "vendor_id": "V-20917", "name": "Acme Supply GmbH", "country": "DE", "status": "active",   "tax_id": "DE 811 604 223" },
 { "vendor_id": "V-08813", "name": "Acme Supply",      "country": "UK", "status": "inactive", "tax_id": null }]</pre>
<p>The agent's instructions tell it to pick the most likely match, and it chose V-20917 because that vendor had the most invoices in the last 90 days. Two payments last month went to the wrong Acme entity and took three weeks to recover. The invoices themselves usually show a VAT number, a remit-to address and bank details near the footer. The finance team is also rolling out a new approval workflow for invoices over $10,000, and invoice volume peaks in December.</p>
<p>How should the agent handle multiple matches?</p>`,
    options: [
      `When a lookup returns several matches, compare extra identifiers from the invoice, such as its VAT number and remit-to address, and route it to AP review if no single match is certain.`,
      `Choose the match with the highest total spend over the past year, because the largest existing relationship is the most likely supplier and keeps the pipeline fully automated.`,
      `Choose the most recently active match, because suppliers that invoiced recently are the most likely to be sending the current invoice, and inactive records can safely be ignored.`,
      `Create a new vendor record whenever a lookup returns more than one match, so that the invoice can be paid without risking a payment to the wrong existing Acme entity.`
    ],
    answer: [0],
    explanation: `When a lookup returns several plausible matches, the agent should gather additional identifiers instead of choosing by heuristic, and escalate when the ambiguity remains. The invoice usually carries exactly what distinguishes these records: a VAT number to compare with each <code>tax_id</code>, a remit-to address and bank details. Matching on those resolves most cases deterministically (a GB VAT number rules out the German entity), and anything still ambiguous goes to accounts payable with the candidates and the evidence, which is far cheaper than recovering a misdirected payment. Choosing by spend or recency is the same kind of heuristic that caused last month's two wrong payments: volume says nothing about which entity sent this invoice. Creating a new vendor record duplicates suppliers, bypasses vendor verification and opens a path for fraudulent payees. The approval workflow and the December peak are noise.`,
    rationales: [
      `Correct. The invoice's VAT number, remit-to address and bank details can be compared with each candidate, and genuinely ambiguous cases go to AP instead of being guessed.`,
      `Spend describes the relationship, not this invoice, so it repeats the heuristic logic that sent two payments to the wrong Acme entity last month.`,
      `Recent activity is also a heuristic; the German entity was the most active and still the wrong payee, and the invoice's own identifiers were never checked.`,
      `A new record duplicates the supplier, bypasses vendor verification and creates a path for fraudulent payees, while the matching question is never answered.`
    ],
    trap: `Heuristic selection among multiple matches instead of more identifiers or escalation`,
    signals: `Decisive: the lookup returned three plausible records, the agent picked by recent volume and misdirected payments, and the invoice carries a VAT number, remit-to address and bank details. Noise: the new approval workflow for large invoices and the December peak.`
  },
  {
    id: 'e6-S6-12', scenario: 'S6', domain: 'D2', obj: 'O37', type: 'single', select: 1,
    stem: `<p>Cypress Customs Brokerage prepares import declarations from the commercial invoices and packing lists that clients email in. Its extraction agent runs on Claude Haiku 4.5 and has four tools: <code>extract_metadata</code> (document type, shipper, consignee, invoice number, currency), <code>lookup_vendor</code>, <code>lookup_tariff_code</code> and <code>enrich_line_items</code>. The workflow depends on <code>extract_metadata</code> running first, because the vendor lookup, tariff lookups and enrichment all need its output, and which of them are needed depends on what the document contains.</p>
<p>Traces from 5,000 documents show that in about 6% of runs the agent's first call is <code>lookup_vendor</code>, using a shipper name guessed from the email subject line, such as "FW: Shipment from Kowloon", which produces wrong vendor matches downstream. The system prompt already says "Always begin by calling extract_metadata." When <code>extract_metadata</code> does run first, the rest of the workflow is accurate. The brokerage also moved its email ingestion to a new provider last month, and declarations are due within 24 hours of arrival.</p>
<p>Which configuration most reliably fixes the ordering problem while keeping later steps flexible?</p>`,
    options: [
      `Set <code>tool_choice</code> to <code>{"type": "any"}</code> on every turn of the agent loop, so that the model always calls a tool instead of replying with text and extraction continues without interruption.`,
      `Strengthen the system prompt with "You MUST call extract_metadata before any other tool", and add three few-shot examples that show <code>extract_metadata</code> as the first call of each run.`,
      `Force <code>{"type": "tool", "name": "extract_metadata"}</code> on the first request, then switch to auto so the model picks lookups and enrichment from the extracted metadata.`,
      `Remove the lookup and enrichment tools from the agent and run every lookup and enrichment step in code after extraction, so that the model can only ever call <code>extract_metadata</code>.`
    ],
    answer: [2],
    explanation: `When a specific tool must run first, forced tool choice guarantees it: setting <code>tool_choice</code> to <code>{"type": "tool", "name": "extract_metadata"}</code> on the first request makes that call certain, and later turns can return to auto so the model decides which lookups and enrichment the extracted content requires. That removes the 6% of runs that start from a guessed vendor name while keeping the flexibility the workflow needs. Tool choice any guarantees some tool call, not which one, so <code>lookup_vendor</code> could still come first. The prompt already states the order, and stronger wording or examples remain probabilistic. Moving every lookup into code discards the model's judgment about which lookups a document needs, so every step would run every time. On current docs: Haiku 4.5 accepts forced tool choice, but Opus 5.5, Sonnet 5.5 and Fable 5.1 return HTTP 400 for any and forced choice; on those models, expose only <code>extract_metadata</code> on the first call, or use strict tool use or structured outputs. The email provider and the deadline are noise.`,
    rationales: [
      `Tool choice any guarantees that some tool is called, not which one, so the agent could still start with <code>lookup_vendor</code> and a guessed shipper name.`,
      `The prompt already states the rule and still fails in 6% of runs; stronger wording and examples make the right order more likely, not guaranteed.`,
      `Correct. Forcing <code>extract_metadata</code> on the first request makes the order certain, and switching to auto afterward lets the model pick the lookups each document needs.`,
      `Running every lookup in code ignores that the needed steps depend on document content, so the pipeline does unnecessary lookups and loses the model's judgment.`
    ],
    trap: `Prompt ordering, tool_choice any or removed flexibility instead of forcing the first tool`,
    signals: `Decisive: <code>extract_metadata</code> must run first, the prompt rule already fails in 6% of runs, later steps depend on content, and the agent runs on Haiku 4.5, which accepts forced tool choice. Noise: the new email provider and the 24-hour filing deadline.`
  },
  {
    id: 'e6-S6-13', scenario: 'S6', domain: 'D1', obj: 'X01', type: 'single', select: 1,
    stem: `<p>Sycamore Utilities extracts supplier invoices with a custom agent loop written against the Claude Client SDK in Python. The agent has an extraction tool and two enrichment tools, <code>lookup_vendor</code> and <code>lookup_contract</code>. A simplified version of the loop:</p>
<pre>messages = [{"role": "user", "content": build_prompt(doc)}]
while True:
    resp = client.messages.create(model=MODEL, max_tokens=4096,
                                  tools=TOOLS, messages=messages)
    messages.append({"role": "assistant", "content": resp.content})
    if resp.content[0].type == "text":
        break                      # assume the agent is finished
    results = [run_tool(b) for b in resp.content if b.type == "tool_use"]
    messages.append({"role": "user", "content": results})
save(final_extraction(messages))</pre>
<p>About 18% of invoices are saved without vendor or contract enrichment. The finance team noticed because unenriched invoices cannot be matched to contracts and wait in a manual queue. In those transcripts, the last response begins with a short text block, such as "I'll look up the vendor now.", followed by a tool_use block for <code>lookup_vendor</code>, and its <code>stop_reason</code> is "tool_use". Invoices whose responses contain only tool_use blocks are enriched correctly. The team recently raised <code>max_tokens</code> from 2,048 to 4,096 for unrelated reasons, and the vendor database added 3,000 new suppliers last month.</p>
<p>Which change fixes the loop?</p>`,
    options: [
      `Raise <code>max_tokens</code> again so that the model has room to finish its text preamble and all of its tool calls in one response, which stops the loop from exiting before enrichment runs.`,
      `Continue while <code>stop_reason</code> is "tool_use", running every tool_use block and returning all results in one user message, and stop only when it is "end_turn".`,
      `Add "Never write any text before calling a tool" to the system prompt, so that responses always start with a tool_use block and the existing check keeps the loop running.`,
      `Replace the text check with a limit of 10 iterations and treat reaching the limit as completion, so that the loop always runs long enough for the enrichment tools to be called.`
    ],
    answer: [1],
    explanation: `An agentic loop should be driven by <code>stop_reason</code>: continue while it is "tool_use", executing the requested tools and returning their results, and finish when it is "end_turn". This loop instead checks whether the first content block is text, which mistakes a short preamble for completion. A response can legitimately contain text followed by tool_use blocks; in the failing transcripts <code>stop_reason</code> is "tool_use", so Claude was asking for <code>lookup_vendor</code>, and the loop exited before running it. Checking <code>stop_reason</code> fixes every such case, and returning all tool_result blocks in a single user message keeps parallel tool calls correct. <code>max_tokens</code> was never the problem, because the responses ended with tool_use, not max_tokens. A prompt rule against preambles is probabilistic and leaves the fragile check in place. An iteration cap as the primary stop is an anti-pattern: it cuts off long runs and wastes calls on short ones. The max_tokens change and the new suppliers are noise.`,
    rationales: [
      `The failing responses ended with stop_reason tool_use, not max_tokens, so more output room changes nothing; the loop still exits on the first text block.`,
      `Correct. <code>stop_reason</code> says whether Claude wants tools run, so a text preamble followed by a tool call no longer ends the loop before enrichment.`,
      `Telling the model to avoid preambles is probabilistic, and the loop still ends the run whenever a response happens to start with text.`,
      `An iteration cap as the main stopping rule is an anti-pattern: it ends long runs early and counts hitting the cap as success whether or not the work is done.`
    ],
    trap: `Text content or iteration caps as the completion signal instead of stop_reason`,
    signals: `Decisive: the loop breaks when the first block is text, while the failing responses have stop_reason "tool_use" with a tool call after a short preamble. Noise: the recent <code>max_tokens</code> increase and the 3,000 new suppliers in the vendor database.`
  },
  {
    id: 'e6-S6-14', scenario: 'S6', domain: 'D1', obj: 'X02', type: 'single', select: 1,
    stem: `<p>Thistle Wholesale's accounts-payable agent, built on the Claude Agent SDK, processes about 9,000 supplier invoices a week. For each invoice it extracts the fields, calls <code>validate_invoice(invoice_id)</code>, which checks totals, tax and purchase-order matching, calls <code>check_duplicate(invoice_id)</code>, and finally calls <code>post_to_erp(invoice_id, record)</code>, which schedules payment. The system prompt states: "Never call post_to_erp unless validate_invoice returned status PASS and check_duplicate returned no match for the same invoice."</p>
<p>An audit found that 1.5% of postings last quarter skipped one of the two checks, usually on invoices where the agent had already processed a near-identical invoice earlier in the session and assumed the result would be the same. Eleven duplicate payments had to be clawed back, at an average of $4,200 each, and each reversal takes finance about two hours. The results of both checks are recorded in the pipeline's state store by invoice ID. The company also plans to move the agent to Opus 5.5 next quarter, and invoice volume spikes at month end.</p>
<p>Which change best guarantees the required order?</p>`,
    options: [
      `Rewrite the rule in capital letters, move it to the end of the system prompt, and add few-shot examples that show the agent calling both checks before every call to <code>post_to_erp</code>.`,
      `Add a nightly reconciliation job that compares the day's ERP postings with the validation and duplicate-check records and reverses any posting that was made without both checks passing.`,
      `Add a <code>validated</code> boolean argument to <code>post_to_erp</code> and have the handler reject any call where it is false, so the agent must confirm both checks passed before it posts.`,
      `Have the <code>post_to_erp</code> handler, or a PreToolUse hook, reject the call unless the state store holds a PASS validation and a clean duplicate check for that invoice, naming what is missing.`
    ],
    answer: [3],
    explanation: `When an ordering rule protects money, it must be enforced in code, because prompt instructions have a non-zero failure rate. A programmatic prerequisite checks the state store at the moment of the call: the <code>post_to_erp</code> handler, or a PreToolUse hook on that tool, looks up the invoice ID and rejects the call unless a PASS validation and a clean duplicate check are recorded, returning an error that tells the agent which check is missing so it can run it. That turns the rule from a request into a guarantee, including for the near-identical invoices where the agent assumed the results. Stronger wording and examples still fail at some rate. A nightly reconciliation detects bad postings only after payments are scheduled, so clawbacks continue. A <code>validated</code> argument is self-reported by the model: an agent that skipped a check can simply pass true. The Opus 5.5 plan and the month-end spikes are noise.`,
    rationales: [
      `Emphasis and examples make the rule more likely to be followed, but compliance stays probabilistic, and the skipped checks already happen despite a clear instruction.`,
      `Reconciliation finds bad postings after payments are scheduled, so duplicate payments still happen and each still costs a clawback and two hours of finance time.`,
      `The flag is self-reported by the model, so an agent that skipped a check can pass true, and the handler has no independent evidence that either check ran.`,
      `Correct. The check runs in code against recorded results for that invoice ID, so posting without both checks becomes impossible, and the error says what to run.`
    ],
    trap: `Prompt emphasis, after-the-fact reconciliation or self-reported flags instead of a programmatic gate`,
    signals: `Decisive: 1.5% of postings skip a check despite a clear prompt rule, each error costs money, and both check results are recorded by invoice ID in the state store. Noise: the planned Opus 5.5 move and the month-end volume spikes.`
  },
  {
    id: 'e6-S6-15', scenario: 'S6', domain: 'D1', obj: 'X03', type: 'single', select: 1,
    stem: `<p>Larch Freight Audit checks carrier invoices against shipment records with an extraction agent built on the Claude Agent SDK. The agent calls three MCP tools owned by other teams: <code>get_shipment</code> from the transport system, <code>get_contract_rate</code> from the contracts system, and <code>get_delivery_status</code> from a carrier-tracking integration. Their results use different conventions:</p>
<pre>get_shipment          "picked_up": 1714636800        "status": 2
get_contract_rate     "valid_from": "2024-05-02"      "status": "ACTIVE"
get_delivery_status   "delivered_on": "02.05.2024"    "status": 9</pre>
<p>Audit findings are wrong in about 4% of cases. The agent misreads status code 9, which means "delivered with exception", as a normal delivery, and it sometimes compares a Unix timestamp with a day-first date and concludes that a delivery happened before pickup. The owning teams have said they cannot change their servers this quarter. The system prompt already contains a paragraph explaining each date format and status code, yet the errors continue. The auditors have also asked for findings to be exported to CSV, and the tracking integration's latency doubled after a vendor change.</p>
<p>Which change most reliably fixes the misreadings?</p>`,
    options: [
      `Add a PostToolUse hook that converts every date to ISO 8601 and maps numeric status codes to named values in each tool result, before the agent sees the data from the three tools.`,
      `Expand the system prompt's explanation into a detailed table of every date format and status code for all three tools, with worked examples, so the agent converts the values itself.`,
      `Ask the three owning teams to change their MCP servers so that every tool returns ISO 8601 dates and named status values, and wait for them to schedule the work next quarter.`,
      `Add a PreToolUse hook that rewrites the arguments of each call to the three tools, so that every request asks the servers for dates and statuses in one consistent, normalized format.`
    ],
    answer: [0],
    explanation: `Heterogeneous formats from different tools are best normalized deterministically before the model processes them, and PostToolUse hooks exist for exactly that: they intercept tool results and transform them before the agent reasons over them. A hook that converts Unix timestamps and day-first dates to ISO 8601, and maps status 9 to a named value such as "delivered_with_exception", removes the ambiguity at its source, so every comparison the agent makes uses one format. The system prompt already explains the formats and the errors persist, so a longer table is still a probabilistic request to convert values correctly every time. Asking the owning teams contradicts the constraint that they cannot change their servers this quarter. A PreToolUse hook modifies outgoing arguments, but the servers' output formats are fixed on their side, so rewriting requests does not change what comes back. The CSV export and the tracking latency are noise.`,
    rationales: [
      `Correct. Normalizing results in a PostToolUse hook gives the agent one date format and named statuses, so it can no longer misread code 9 or compare mismatched dates.`,
      `The prompt already explains the formats and the errors continue, so a longer table keeps the conversion probabilistic instead of guaranteeing consistent data.`,
      `The owning teams have already said they cannot change their servers this quarter, so this leaves the 4% of wrong findings in place for months.`,
      `A PreToolUse hook changes outgoing arguments, but the servers return their fixed formats regardless, so the results the agent reads would not change.`
    ],
    trap: `Prompt explanations or input rewriting instead of PostToolUse normalization`,
    signals: `Decisive: three tools return dates and statuses in different formats, the prompt explanation has not stopped the errors, and the servers cannot change this quarter. Noise: the CSV export request and the tracking integration's doubled latency.`
  },
]);
