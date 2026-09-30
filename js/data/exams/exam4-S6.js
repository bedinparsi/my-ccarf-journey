/* Practice Exam 4 — Scenario S6: Structured Data Extraction (commercial contracts, shipping manifests / bills of lading) */
CCAR.addQuestions('exam4', [
  {
    id: 'e4-S6-01', scenario: 'S6', domain: 'D1', obj: 'O10', type: 'single', select: 1,
    stem: 'A freight forwarder extracts data from shipment packets that always contain the same four documents: bill of lading, commercial invoice, packing list and certificate of origin. Today one prompt receives all four documents and emits a single record. Field accuracy within each document is good, but mismatches between documents (consignee name, gross weight, HS codes) go unnoticed about 40% of the time, and each packet takes 90 seconds. Which pattern fits best?',
    options: [
      'A coordinator agent that inspects each packet, decides dynamically which extraction subagents to invoke, and iterates until it judges the packet complete.',
      'Extract each document in parallel with its own schema, then run a fixed reconciliation step that compares the shared fields and flags mismatches.',
      'Extract the four documents one after another, passing each extraction into the next prompt so that later documents can be checked against earlier ones.',
      'Run the current single prompt three times per packet and accept each field value only when at least two of the three runs agree on it.'
    ],
    answer: [1],
    explanation: 'The packet structure is fixed and predictable, so a static workflow fits: parallel sectioning (one focused extraction per document type) followed by a dedicated reconciliation step that compares shared fields. This improves attention per document, cuts latency, and makes cross-document checking an explicit task instead of a side effect. Dynamic orchestration adds cost without benefit for a fixed structure, a sequential chain is slower, and voting measures consistency, not cross-document agreement.',
    rationales: [
      'Dynamic decomposition suits open-ended tasks; a fixed four-document packet does not need it.',
      'Correct. Parallel per-document extraction plus an explicit reconciliation pass.',
      'Serializes independent work and still buries the comparison inside extraction prompts.',
      'Three runs of the same diluted prompt can agree on the same missed mismatch.'
    ],
    trap: 'Dynamic orchestration for a fixed, predictable workflow'
  },
  {
    id: 'e4-S6-02', scenario: 'S6', domain: 'D1', obj: 'O09', type: 'single', select: 1,
    stem: 'A backfill of 180,000 bills of lading is split into 30 Message Batches. The orchestrator process crashed after submitting 14 batches and writing results from 9 of them to the database. On restart it resubmitted all 30 batches, paying twice for the first 14 and inserting duplicate rows for the first 9. Which design prevents this?',
    options: [
      'Keep the orchestrator\'s batch list in memory and add a supervisor that restarts the process immediately so that the in-memory list survives.',
      'Always resubmit all batches on restart, but deduplicate database rows afterwards by comparing each shipment\'s B/L number and carrier.',
      'Switch the backfill to the synchronous Messages API so that there are no outstanding batch jobs to lose track of when a crash occurs.',
      'Persist a manifest of batch IDs and per-custom_id status; on resume, poll existing batches, fetch unwritten results, submit the rest.'
    ],
    answer: [3],
    explanation: 'Reliable resumption needs durable state: a manifest recording which batches were submitted (batch IDs) and which custom_ids have been retrieved and written, with idempotent writes keyed by custom_id. On restart the orchestrator polls existing batches and processes only what is outstanding; results stay available for retrieval for 29 days. In-memory state dies with the process, post-hoc dedupe still pays twice, and synchronous processing forfeits the discount without solving resumption.',
    rationales: [
      'A restarted process starts with empty memory; nothing survives the crash.',
      'Cleans up duplicates but still pays for 14 batches twice.',
      'Gives up the 50% saving and still needs durable progress tracking for 180,000 documents.',
      'Correct. A durable manifest keyed by batch ID and custom_id enables exact resumption.'
    ],
    trap: 'Restarting from scratch instead of resuming from a manifest'
  },
  {
    id: 'e4-S6-03', scenario: 'S6', domain: 'D4', obj: 'O28', type: 'single', select: 1,
    stem: 'An extraction call for a 140-page master services agreement returns:<pre>stop_reason: "max_tokens"\nusage: { "output_tokens": 16000 }\ncontent[0]: { "type": "tool_use", "name": "record_obligations",\n  "input": { "obligations": [ ...212 complete items...,\n    { "clause": "14.3", "party": "Suppl</pre>Contracts under 60 pages extract cleanly. Obligations are required for every clause. What is the most appropriate fix?',
    options: [
      'Raise <code>max_tokens</code> to 64,000 so that the full obligations list for even the longest contracts fits in one response.',
      'Tell the model to abbreviate obligation descriptions and omit clause text so that 140-page contracts fit within 16,000 tokens.',
      'Extract obligations per top-level article in separate calls with the same tool schema, then merge and de-duplicate in code.',
      'Retry the same request with <code>strict: true</code> on the tool so that the returned input is always complete, schema-valid JSON.'
    ],
    answer: [2],
    explanation: 'stop_reason "max_tokens" means output stopped mid-tool-input. Split the work into smaller scoped calls (per article or section) and merge the results deterministically; each call stays within output limits and gets focused attention. Raising the ceiling postpones the failure to the next, larger contract; abbreviating loses required detail; strict mode guarantees schema conformance of completed output but cannot make truncated output complete.',
    rationales: [
      'Moves the cut-off rather than removing it and increases attention dilution across 140 pages.',
      'Sacrifices required content and still fails on longer agreements.',
      'Correct. Scoped calls avoid the output ceiling and merge into one complete list.',
      'Strict schemas do not extend the output budget; the response is still cut off.'
    ],
    trap: 'Raising max_tokens or strict mode for truncation'
  },
  {
    id: 'e4-S6-04', scenario: 'S6', domain: 'D4', obj: 'O28', type: 'multi', select: 2,
    stem: 'Container manifests for a transpacific carrier can list up to 1,900 line items (marks, package count, description, HS code, gross weight). Extraction of large manifests ends with <code>stop_reason: "max_tokens"</code>. Each manifest footer states total packages and total gross weight, and the downstream customs filing requires every line item. Which two changes should the team make? (Select 2)',
    options: [
      'For large manifests, ask the model for only the footer totals and a summary of commodity types, skipping the individual line items.',
      'Split large manifests into page or line-range chunks, extract each chunk with the same schema, and merge by line number in code.',
      'After merging, check the summed package counts and weights against the footer totals to detect dropped or duplicated lines.',
      'Raise <code>max_tokens</code> for manifests over 500 lines and keep processing each manifest in a single extraction call.',
      'Send a "continue" message after each truncation and splice the partial JSON arrays together before running schema validation.'
    ],
    answer: [1, 2],
    explanation: 'Truncation is fixed by splitting into smaller scoped calls and merging deterministically, not by raising the ceiling. Chunking introduces its own risk (lines dropped or duplicated at chunk boundaries), so a semantic check of summed values against the stated footer totals verifies the merged result. Summaries fail the every-line-item requirement, and splicing partial JSON from "continue" turns is fragile.',
    rationales: [
      'The customs filing needs every line item; totals alone do not satisfy it.',
      'Correct. Scoped chunk extraction avoids the output ceiling.',
      'Correct. Comparing computed and stated totals catches boundary errors introduced by chunking.',
      'Pushes the limit out but still truncates the largest manifests and dilutes attention.',
      'Stitched partial JSON is error-prone and bypasses the tool schema guarantees.'
    ],
    trap: 'Raising max_tokens; summarizing instead of splitting'
  },
  {
    id: 'e4-S6-05', scenario: 'S6', domain: 'D4', obj: 'O23', type: 'single', select: 1,
    stem: 'A customs broker must deliver extracted bill-of-lading data within 30 hours of receiving each document, and documents arrive continuously. The team will use the Message Batches API (up to a 24-hour processing window) and reserves 3 hours after each batch completes to resubmit failed custom_ids through the synchronous API and run QA. How often must batches be submitted to guarantee the SLA?',
    options: [
      'Every 6 hours, because 6 hours of waiting plus the 24-hour processing window exactly equals the 30-hour SLA.',
      'Every 3 hours, because a document can wait up to 3 hours, plus 24 hours of processing and 3 hours for retries and QA.',
      'Once every 24 hours, because most batches finish well within an hour, leaving ample time for retries and QA before the SLA.',
      'Every 12 hours, because averaging typical and worst-case batch completion times leaves a comfortable margin under the SLA.'
    ],
    answer: [1],
    explanation: 'Worst-case latency is the longest time a document waits for the next submission, plus the full 24-hour batch window, plus the reserved retry and QA time. With a 30-hour SLA: 30 − 24 − 3 = 3 hours maximum between submissions. The Batches API offers no latency guarantee, so plans must use the 24-hour worst case rather than typical completion times.',
    rationales: [
      'Leaves zero time for the 3 hours reserved for resubmission and QA.',
      'Correct. 3 + 24 + 3 = 30 hours in the worst case.',
      'Relies on typical completion times the API does not guarantee; worst case is 24 + 24 + 3 hours.',
      'Averages are irrelevant to a guarantee; 12 + 24 + 3 = 39 hours breaks the SLA.'
    ],
    trap: 'Planning on typical rather than worst-case batch latency'
  },
  {
    id: 'e4-S6-06', scenario: 'S6', domain: 'D4', obj: 'O29', type: 'single', select: 1,
    stem: 'Bills of lading from about 40 carriers show gross weight as "12.500 KGS", "12,500.5 kg", "27,558 LBS" and "12 500 KG", and dates as "03/04/26", "4 MAR 2026" and "2026-03-04". The extraction schema has <code>gross_weight_kg: number</code> and <code>on_board_date: string</code>. About 9% of weights are off by 1,000× or not converted from pounds, and numeric dates from US and EU carriers are swapped. Which change most improves accuracy?',
    options: [
      'Post-process weights by stripping every non-digit character before converting to a number, and parse all dates with one fixed MM/DD/YY format.',
      'Mark <code>gross_weight_kg</code> and <code>on_board_date</code> as required so that the model cannot leave either field empty when it is uncertain.',
      'Move the extraction to a larger model and add the instruction "be careful with units and date formats" to the system prompt for all carriers.',
      'Add normalization rules (units, locale separators, ISO dates by carrier origin), keep raw values, and add few-shot examples per format.'
    ],
    answer: [3],
    explanation: 'Inconsistent source formatting calls for explicit normalization rules alongside the strict schema, plus few-shot examples that show correct handling of each variant. Keeping the raw value next to the normalized one supports verification and review. Stripping non-digits turns 12,500.5 into 125005 and ignores LBS, a single date format swaps EU dates, required fields encourage fabrication, and vague caution does not define the rules.',
    rationales: [
      'Destroys decimal information, never converts pounds, and hard-codes the US date order.',
      'Required fields push the model to invent values instead of fixing the format problem.',
      'Model size does not supply the missing locale and unit rules; vague instructions are not rules.',
      'Correct. Explicit normalization rules plus varied few-shot examples, with raw values retained.'
    ],
    trap: 'Naive post-processing or bigger model for format variance'
  },
  {
    id: 'e4-S6-07', scenario: 'S6', domain: 'D4', obj: 'O29', type: 'single', select: 1,
    stem: 'An extraction pipeline for commercial supply contracts returns <code>governing_law: null</code> for 18% of contracts. A labeled review of those shows: 15 percentage points state governing law somewhere other than a heading named "Governing Law" (inside "Miscellaneous", in a schedule, or phrased as "construed under the laws of the State of New York"); 3 points only say "as set out in the Master Agreement," which is not included in the input. What is the most effective change?',
    options: [
      'Add few-shot examples extracting governing law from varied placements and phrasings, and a null reason such as "incorporated by reference".',
      'Make <code>governing_law</code> a required string so that the model must always return a value, and retry any extraction that comes back null.',
      'Add a validation-retry loop that re-sends every null extraction with the message "governing law is missing, look again" until the field is filled in.',
      'Raise <code>max_tokens</code> and have the model quote the entire boilerplate section so that it has more room to find the governing-law clause.'
    ],
    answer: [0],
    explanation: 'Few-shot examples covering varied document structures fix the recoverable 15 points by showing where and how the clause can appear. The remaining 3 points are absent from the input, so no prompt or retry can recover them; the honest output is null with a reason, which can route to review or trigger retrieval of the master agreement. Required fields and blind retries push the model to fabricate.',
    rationales: [
      'Correct. Examples fix structural variety; an explicit null reason handles information that is genuinely absent.',
      'Forcing a value makes the model invent governing law for the incorporated-by-reference cases.',
      'Retries cannot find text that is not in the input and generic feedback does not teach placements.',
      'Output length is not what causes the misses; quoting boilerplate adds cost without guidance.'
    ],
    trap: 'Required fields and retries when information is absent'
  },
  {
    id: 'e4-S6-08', scenario: 'S6', domain: 'D4', obj: 'O31', type: 'single', select: 1,
    stem: 'Lawyers asked the contract pipeline to "flag unusual or risky clauses." It now flags about 30 clauses per contract, including standard mutual confidentiality and routine notice provisions. The legal team has stopped reading the flags and missed an uncapped indemnity last month. Which prompt change most improves precision without losing important flags?',
    options: [
      'Instruct the model to flag only clauses it is highly confident are risky, and to be conservative when a clause is merely unusual in its wording.',
      'Ask the model to score each clause\'s risk from 1 to 10 and surface only the clauses scoring 8 or higher to the legal team for review.',
      'List clause types to flag (e.g., uncapped indemnity, auto-renewal over 12 months) and types to skip, each with a short example.',
      'Flag a clause only when two of three independent extraction runs identify it as risky, to filter out flags that are produced inconsistently.'
    ],
    answer: [2],
    explanation: 'Explicit inclusion and exclusion criteria, with examples, define what is reportable, which "unusual or risky" never did. General instructions such as "be conservative" or "high confidence only" do not reliably improve precision, self-rated scores are poorly calibrated, and consensus voting suppresses real but intermittently detected flags such as the missed uncapped indemnity.',
    rationales: [
      'Vague confidence language leaves the boundary undefined; the model is already confident about boilerplate flags.',
      'Self-assigned scores are uncalibrated, so the threshold filters arbitrarily.',
      'Correct. Categorical report/skip criteria with examples set a precise, testable boundary.',
      'Voting keeps consistent noise and drops intermittently detected real risks.'
    ],
    trap: '"Be conservative" and confidence thresholds instead of explicit criteria'
  },
  {
    id: 'e4-S6-09', scenario: 'S6', domain: 'D4', obj: 'O26', type: 'single', select: 1,
    stem: 'Part of the bill-of-lading extraction tool schema:<pre>"incoterm":     { "type": "string", "enum": ["FOB", "CIF", "EXW", "DAP", "DDP"] },\n"notify_party": { "type": "string" },\n...\n"required": ["shipper", "consignee", "notify_party", "incoterm"]</pre>Audits find that B/Ls quoting FCA or CPT come back as "FOB", B/Ls with no Incoterm get a plausible guess, and B/Ls reading "Notify: SAME AS CONSIGNEE" or with a blank notify box get an invented company name. Which schema change best fixes this?',
    options: [
      'Keep the schema and add "never guess the Incoterm or notify party; use only what the document states" to the extraction prompt.',
      'Make <code>notify_party</code> nullable; give <code>incoterm</code> "other" plus a detail field, and a "not_stated" value.',
      'Expand the <code>incoterm</code> enum to all eleven Incoterms 2020 rules and enable <code>strict: true</code> on the extraction tool.',
      'Remove the enum from <code>incoterm</code> and make both fields optional free-text strings that downstream code will parse later.'
    ],
    answer: [1],
    explanation: 'Required, closed fields force the model to produce something even when the document says nothing or uses an unlisted value. Nullable fields let absence be represented honestly, and an enum with "other" plus a detail string, and an explicit not-stated value, handles extensible categories. A prompt-only "don\'t guess" fights a schema that demands a value, a complete enum still forces a guess when no term is stated, and free text gives up validation.',
    rationales: [
      'The schema still requires a value from a closed list, so guessing continues.',
      'Correct. Nullable and "other" + detail patterns represent missing and unlisted values honestly.',
      'Fixes FCA/CPT but still forces a value when none is stated; strict mode only guarantees syntax.',
      'Loses enum validation and pushes ambiguity onto downstream parsers.'
    ],
    trap: 'Required closed fields that force fabrication'
  },
  {
    id: 'e4-S6-10', scenario: 'S6', domain: 'D4', obj: 'X08', type: 'single', select: 1,
    stem: 'Invoice extraction validates two rules: (a) line-item amounts must sum to the stated invoice total, which fails on 7% of documents; (b) <code>consignee_tax_id</code> must be present, which fails on 5%, and spot checks show those invoices contain no tax ID anywhere. The current loop retries every failure up to three times with "The output was invalid, please try again." Which redesign is best?',
    options: [
      'Increase the retries to five for both rules, since more attempts give the model more chances to produce a valid extraction for each document.',
      'Enable strict tool use so that schema validation guarantees the line items sum correctly and that the tax ID is always present in the output.',
      'Stop retrying altogether and send every document that fails either rule straight to the human review queue for manual correction.',
      'Retry sum failures with the document, the failed output and the specific discrepancy; set absent tax IDs to null and route them.'
    ],
    answer: [3],
    explanation: 'Retry with specific error feedback works for errors the model can correct from the source, such as a misread line item. Retries cannot help when the information is absent from the document, so those cases should be recorded as null and routed. Generic "try again" messages give no guidance, strict schemas prevent syntax errors but not semantic ones like mismatched sums, and sending every failure to humans wastes reviewers on fixable cases.',
    rationales: [
      'More blind retries repeat the same mistakes and can never produce a tax ID that is not in the document.',
      'Schema enforcement cannot check arithmetic or create absent data.',
      'Discards cheap automated correction for the fixable sum errors.',
      'Correct. Targeted feedback where retry can help; honest null and routing where it cannot.'
    ],
    trap: 'Generic retries for errors retries cannot fix'
  },
  {
    id: 'e4-S6-11', scenario: 'S6', domain: 'D5', obj: 'O18', type: 'single', select: 1,
    stem: 'Per-document extraction subagents feed a reconciliation agent for shipment packets. Each returns a flat record such as <code>{"gross_weight_kg": 18400, "consignee": "Nordhafen GmbH"}</code>. The reconciliation agent cannot say which page a value came from or tell a stated value from one the subagent calculated (for example, a weight converted from LBS), and reviewers must re-open the PDFs for every flag. What output design should the subagents use?',
    options: [
      'For each field, return value, raw text, document and page, a short excerpt, and whether it was stated or derived (with any conversion).',
      'Return the flat record plus a single document-level confidence score so that the reconciliation agent can weigh documents against each other.',
      'Return a prose paragraph per document explaining how each value was found, so reviewers and the reconciliation agent can follow the reasoning.',
      'Return the flat record plus the full OCR text of the document so that the reconciliation agent can locate each value itself when it needs to.'
    ],
    answer: [0],
    explanation: 'Downstream synthesis needs structured values carrying provenance and method metadata: source document and page, a supporting excerpt, the raw text, and whether the value was stated or derived. That lets the reconciliation agent compare like with like, explain conflicts, and hand reviewers a direct pointer. A single confidence score carries no provenance, prose is hard to process mechanically, and full OCR text bloats context and pushes the lookup work downstream.',
    rationales: [
      'Correct. Field-level provenance and method metadata support reconciliation and fast review.',
      'One number per document says nothing about where a specific value came from.',
      'Unstructured narrative is costly to parse and inconsistent across documents.',
      'Shifts the extraction work to the reconciliation agent and consumes its context.'
    ],
    trap: 'Flat values without provenance for downstream synthesis'
  },
  {
    id: 'e4-S6-12', scenario: 'S6', domain: 'D5', obj: 'O19', type: 'single', select: 1,
    stem: 'For one shipment, the bill of lading states gross weight 18,400 kg, the packing list states 18,040 kg, and the commercial invoice does not state a weight. The reconciliation step currently outputs <code>gross_weight_kg: 18400</code> because the B/L is listed first. The value feeds a customs filing in which misdeclared weight triggers penalties. How should reconciliation handle this?',
    options: [
      'Use the value from the most recently dated document, since later documents usually reflect corrections made after earlier ones were issued.',
      'Output the average of the two figures, 18,220 kg, and flag the record as approximate so the customs filing team can double-check it.',
      'Output both values with their sources, set <code>conflict_detected: true</code>, and route the record to review instead of choosing one.',
      'Re-run the extraction on both documents three times each and keep whichever weight appears most often across the six runs.'
    ],
    answer: [2],
    explanation: 'When credible sources conflict, preserve both values with attribution and flag the conflict so a human or an explicit business rule decides. A digit transposition (18,400 vs 18,040) could be an error in either document, and the filing carries penalties. Choosing by date or document order, averaging, or re-extracting (which only confirms that each document says what it says) all hide a real discrepancy.',
    rationales: [
      'Document date says nothing about which figure was transposed.',
      'An average matches neither document and would be a misdeclaration in its own right.',
      'Correct. Conflict preserved with attribution and routed for resolution.',
      'Both extractions are already accurate; voting over re-runs cannot resolve a source-level conflict.'
    ],
    trap: 'Arbitrarily resolving conflicting source values'
  },
  {
    id: 'e4-S6-13', scenario: 'S6', domain: 'D5', obj: 'O22', type: 'single', select: 1,
    stem: 'A bill-of-lading pipeline reports 97% field accuracy on a 5,000-document weekly sample, and management wants to cut human review from 100% to the 300 documents per day that reviewers can handle. A breakdown shows charter-party B/Ls at 81% accuracy and handwritten amendments at 74%, while standard liner B/Ls are at 99.2%. How should the 300 daily review slots be allocated?',
    options: [
      'Randomly sample 300 documents per day across all types, since a random sample gives an unbiased estimate of the overall accuracy.',
      'Route low calibrated field confidence, conflicts and weak document types, plus a stratified sample of high-confidence liner B/Ls.',
      'Route only documents where the model\'s self-reported overall confidence is below 7 out of 10, since those are the ones it finds hardest.',
      'Stop reviewing standard liner B/Ls entirely and give all 300 daily slots to charter-party B/Ls and handwritten amendments, in order of arrival.'
    ],
    answer: [1],
    explanation: 'Aggregate accuracy hides weak segments, so review should be targeted by document type and field, using field-level confidence calibrated on labeled data and flags for conflicting or ambiguous sources. A stratified sample of high-confidence extractions keeps measuring error rates and catches novel failure patterns. Random sampling spends most slots on easy documents, uncalibrated self-reported confidence is unreliable, and dropping all monitoring of liner B/Ls leaves new errors undetected.',
    rationales: [
      'Measures the aggregate but wastes most slots on documents that are already 99% accurate.',
      'Correct. Risk-based routing plus stratified sampling of the high-confidence segment.',
      'Self-reported, uncalibrated confidence is a poor proxy for which extractions are wrong.',
      'Targets weak types but abandons monitoring of the largest segment and ignores field-level signals.'
    ],
    trap: 'Random sampling or self-reported confidence for review routing'
  },
  {
    id: 'e4-S6-14', scenario: 'S6', domain: 'D5', obj: 'O22', type: 'multi', select: 2,
    stem: 'A contract-extraction service currently has attorneys review 100% of extractions (party names, term, renewal, liability cap, governing law). The model now outputs a confidence score for each field. Before letting high-confidence extractions skip attorney review, which two steps are required? (Select 2)',
    options: [
      'Use the model\'s confidence scores as-is with a 0.9 threshold, since field-level scores are more granular than document-level ones.',
      'Skip review whenever three independent extraction runs return identical values for every field in the contract.',
      'Calibrate the confidence thresholds on a labeled validation set and verify accuracy per contract type and per field before automating.',
      'Route only contracts above $1M in value to attorneys, since risk depends mainly on contract size rather than on extraction difficulty.',
      'After launch, review a stratified random sample of auto-approved extractions to track error rates and catch new error patterns.'
    ],
    answer: [2, 4],
    explanation: 'Confidence is useful for routing only after it has been calibrated against labeled data, and accuracy must be verified per document type and field because aggregates hide weak segments. Once high-confidence items skip review, a stratified sample of them is the only way to keep measuring their error rate and detect novel failures. Raw thresholds are uncalibrated, agreement across runs can be consistently wrong, and contract value says nothing about extraction ambiguity.',
    rationales: [
      'Granularity does not equal calibration; an uncalibrated 0.9 may correspond to much lower accuracy.',
      'Runs sharing the same blind spot agree on the same wrong value.',
      'Correct. Calibration and segment-level validation must come before reducing review.',
      'Ignores ambiguous or low-confidence fields in smaller contracts, where errors still matter.',
      'Correct. Ongoing stratified sampling monitors the automated segment for drift and novel errors.'
    ],
    trap: 'Uncalibrated thresholds and consensus as review gates'
  },
  {
    id: 'e4-S6-15', scenario: 'S6', domain: 'D2', obj: 'O37', type: 'single', select: 1,
    stem: 'A contract pipeline offers three tools: <code>extract_contract_metadata</code> (parties, effective date, contract type), <code>lookup_counterparty</code> (CRM search by legal name) and <code>classify_clauses</code>. In about 15% of runs the model calls <code>lookup_counterparty</code> first with a guessed name such as "Acme Ltd" before extracting the actual party names, causing wrong CRM matches. The first request uses <code>tool_choice: {"type": "auto"}</code>. What is the best fix?',
    options: [
      'Change the first request to <code>tool_choice: {"type": "any"}</code> so that the model is required to call a tool rather than reply in text.',
      'Add a system-prompt instruction stating that metadata must always be extracted first, with a few-shot example showing the correct order.',
      'Remove <code>lookup_counterparty</code> from the tool list and have application code perform a CRM lookup for every extracted party name.',
      'Force <code>{"type": "tool", "name": "extract_contract_metadata"}</code> on the first request, then allow enrichment tools in later turns.'
    ],
    answer: [3],
    explanation: 'Forced tool selection guarantees a specific tool runs first; later turns can return to auto so the model chooses enrichment steps with the real party names in context. "any" guarantees a tool call but still lets the model pick the wrong one, prompt-based ordering is probabilistic, and removing the tool gives up model-driven enrichment when the problem is only ordering.',
    rationales: [
      '"any" forces some tool call, which the model is already making; it does not control which one.',
      'Probabilistic; the 15% failure rate would shrink but not disappear.',
      'Over-corrects by removing a capability when only the order of calls is wrong.',
      'Correct. Forcing the prerequisite extraction first guarantees ordering deterministically.'
    ],
    trap: 'tool_choice "any" vs forced tool selection'
  }
]);
