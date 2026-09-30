/* Practice Exam 5 — Scenario S6: Structured Data Extraction
   Context: financial statements / 10-K excerpts and multilingual expense receipts. */
CCAR.addQuestions('exam5', [
  {
    id: 'e5-S6-01',
    scenario: 'S6',
    domain: 'D4',
    obj: 'O28',
    type: 'single',
    select: 1,
    stem: 'A single forced tool call, <code>extract_10k_notes</code>, extracts all notes to the financial statements (debt maturities, leases, segment revenue, tax, subsequent events, and nine more) into one schema. For large filers (200+ pages), 31% of calls end with <code>stop_reason: "max_tokens"</code> and truncated tool input that fails validation. Raising max_tokens to 16k cut failures to 18%, but the notes extracted last (segments, subsequent events) are now sparse even when the call completes. What is the best fix?',
    options: [
      'Raise max_tokens again to the model\'s maximum output and automatically retry any call that is still truncated using the identical request until it completes successfully.',
      'Split the extraction: identify note boundaries first, run one scoped extraction per note with its own schema, validate each, and merge by note ID into the filing record.',
      'Tell the model to abbreviate field names and omit every optional field in the schema, so that the complete extraction fits within the current 16k output budget.',
      'Switch from tool use to prompt-based JSON output, which removes tool-call overhead from the output tokens and leaves more of the budget available for extracted values.'
    ],
    answer: [1],
    explanation: 'Truncation of large structured outputs is solved by decomposing the work into smaller scoped calls and merging the results, not by raising the ceiling. Per-note calls produce complete, valid outputs, keep attention focused (fixing the sparse late notes), and allow retrying just the failed notes.',
    rationales: [
      'Identical retries hit the same ceiling, and larger outputs keep diluting attention on later notes.',
      'Correct. Scoped per-note extraction with validation and merging removes truncation and improves late-note quality.',
      'Dropping optional fields discards real data to fit a budget.',
      'Prompt-based JSON is less reliable and does not solve an output that is simply too large.'
    ],
    trap: 'Raising max_tokens for truncated extraction'
  },
  {
    id: 'e5-S6-02',
    scenario: 'S6',
    domain: 'D4',
    obj: 'O28',
    type: 'single',
    select: 1,
    stem: 'A nightly job extracts corporate-card packets. One log entry reads:<pre>tool_choice: {"type":"tool","name":"record_receipts"}\ninput: 1 PDF, 84 pages (one receipt per page)\nmax_tokens: 8192\nstop_reason: "max_tokens"\ntool_use.input: {"receipts":[{...},{...}, ... ,{"merchant":"Cafe Lumiere","date":"2026-0\nparser: JSONDecodeError: Unterminated string at char 8190</pre>The current fallback retries the identical request three times. What is the best change?',
    options: [
      'Extract per receipt (a page or small page range per call), each returning a complete record_receipts input, validate each result, and merge them by page number.',
      'Keep the single request but switch tool_choice to auto so the model can decide on its own to stop early and return partial but syntactically valid JSON for the packet.',
      'Add a JSON repair step that closes open strings, arrays, and objects in the truncated output, then keep every receipt that parses successfully after the repair.',
      'Retry with max_tokens set to 64000 and temperature 0, so the output becomes deterministic and has enough room to finish all 84 receipts in one response.'
    ],
    answer: [0],
    explanation: 'The unit of work is too large for one structured response. Splitting into per-receipt or small-range calls yields complete, independently valid outputs that can be validated and merged, and failures can be retried individually. Retrying the same oversized request cannot succeed.',
    rationales: [
      'Correct. Smaller scoped calls eliminate truncation and allow per-item validation and retry.',
      'auto allows plain-text replies and does not make an oversized output fit.',
      'Repairing truncated JSON silently drops the unfinished receipts and may keep a corrupted final record.',
      'A bigger ceiling postpones the failure for larger packets, and temperature does not affect length limits.'
    ],
    trap: 'Retrying or repairing instead of splitting'
  },
  {
    id: 'e5-S6-03',
    scenario: 'S6',
    domain: 'D4',
    obj: 'O29',
    type: 'single',
    select: 1,
    stem: 'Receipts arrive from 23 countries in formats such as <code>03/04/2026</code>, <code>2026年3月4日</code>, <code>1.234,50 €</code>, <code>¥1,234</code>, and <code>CHF 1\'234.50</code>. The schema defines <code>date</code> as YYYY-MM-DD, <code>amount</code> as a number, and <code>currency</code> as ISO 4217, and every output passes schema validation. Error analysis shows 14% day/month swaps and 9% amount errors on decimal-comma receipts. What is the most effective improvement?',
    options: [
      'Change date and amount to raw strings in the schema and let downstream finance systems interpret each country\'s formats, since those systems already have locale libraries built in.',
      'Route all non-English receipts to a larger model, since the errors come from locale-specific formats that a more capable model will interpret more accurately.',
      'Add a validation-retry loop that re-sends the receipt whenever JSON schema validation fails, including the specific validation error in the retry request.',
      'Add locale-aware normalization rules for dates, separators, and currency symbols, keep raw values beside normalized ones, and add few-shot examples of ambiguous formats.'
    ],
    answer: [3],
    explanation: 'Strict schemas guarantee format, not semantic correctness. Explicit normalization rules, combined with few-shot examples of ambiguous formats, teach the model how to interpret locale-dependent values; keeping raw values beside normalized ones preserves auditability and makes errors detectable.',
    rationales: [
      'Pushing interpretation downstream abandons the extraction goal and moves the same ambiguity elsewhere.',
      'The failures come from missing interpretation rules, not model capacity.',
      'The outputs already pass schema validation, so a schema-triggered retry never fires for these semantic errors.',
      'Correct. Normalization rules plus few-shot examples address the locale ambiguity directly, with raw values for traceability.'
    ],
    trap: 'Schema validation mistaken for semantic accuracy'
  },
  {
    id: 'e5-S6-04',
    scenario: 'S6',
    domain: 'D4',
    obj: 'O29',
    type: 'multi',
    select: 2,
    stem: 'In 10-K extraction, <code>total_operating_lease_liability</code> comes back null for 22% of filings where analysts can find it. Some filers present it in a Note 9 table, some only in narrative ("Total lease liabilities were $412.6 million"), and some report current and noncurrent portions without a total. Separately, values from tables headed "in thousands" are sometimes stored as if in millions. Which TWO changes most improve accuracy? (Select 2)',
    options: [
      'Make total_operating_lease_liability a required field in the schema so that the model can no longer return null for it on any filing.',
      'Add few-shot examples covering table, narrative, and split current/noncurrent presentations, showing the extracted value, the source, and a derived flag when summed.',
      'Retry the extraction with the same prompt whenever the field comes back null, up to three times, until a value is returned for the filing.',
      'Add fields for the stated unit scale and source currency, with a normalization rule converting values to whole USD and recording the original scale.',
      'Add the instruction "Be thorough and read every note carefully; this value is almost always present in the filing" to the extraction prompt.'
    ],
    answer: [1, 3],
    explanation: 'Few-shot examples that show extraction across varied document structures are the most effective fix for nulls caused by format variety, and explicit scale fields plus normalization rules fix unit errors while keeping them auditable. Making the field required invites fabrication, and blind retries or exhortations do not add the missing knowledge.',
    rationales: [
      'Requiring the field pressures the model to fabricate values when a filing genuinely lacks it.',
      'Correct. Examples across table, narrative, and split presentations teach generalizable extraction.',
      'Identical retries repeat the same failure because nothing about the prompt changed.',
      'Correct. Capturing scale and normalizing explicitly fixes the thousands/millions errors.',
      'Generic exhortations do not tell the model how to handle the varied formats.'
    ],
    trap: 'Required fields and exhortations instead of examples and normalization'
  },
  {
    id: 'e5-S6-05',
    scenario: 'S6',
    domain: 'D5',
    obj: 'O22',
    type: 'single',
    select: 1,
    stem: 'The receipt pipeline processes 40,000 receipts a month; six reviewers can check about 3,000. The model outputs per-field confidence for merchant, date, amount, currency, tax, and category. Routing today is a random 7.5% sample. An audit found errors concentrated in handwritten receipts, faded thermal prints, multi-currency receipts, and receipts where the stated total disagrees with the line items. How should review capacity be allocated?',
    options: [
      'Ask the model for one overall 1-10 confidence rating per receipt and route anything under 7 to reviewers, since the model has seen the whole document and can judge its own reliability.',
      'Keep the random 7.5% sample because it is statistically unbiased, covers every receipt type in proportion to volume, and is simple for the reviewers to administer.',
      'Route by calibrated field-level confidence thresholds plus triggers (handwritten, faded, multi-currency, total mismatch), then stratified-sample high-confidence receipts.',
      'Send every receipt from countries that use non-Latin scripts to human review, since those are the hardest receipts and are most likely to contain the errors the audit found.'
    ],
    answer: [2],
    explanation: 'Limited reviewer capacity should go where errors are likely: fields with low calibrated confidence and documents with known risk characteristics or internal contradictions. A stratified sample of high-confidence receipts keeps measuring the error rate of the automated path and surfaces novel error patterns.',
    rationales: [
      'A single self-rated score is poorly calibrated and hides which field is uncertain.',
      'Random sampling spends most capacity on easy receipts and misses concentrated risk.',
      'Correct. Calibrated field confidence plus document triggers, with stratified sampling of the rest, targets errors efficiently.',
      'Script is a crude proxy; it misses the audited risk factors and floods reviewers with easy receipts.'
    ],
    trap: 'Random sampling or self-reported confidence as routing'
  },
  {
    id: 'e5-S6-06',
    scenario: 'S6',
    domain: 'D5',
    obj: 'O22',
    type: 'multi',
    select: 2,
    stem: 'On 1,200 labeled filings, 10-K extraction reaches 98.1% field accuracy overall. Finance wants to stop human review of high-confidence extractions entirely. The corpus mixes banks and insurers with industrials, and XBRL-tagged filings with scanned exhibits. Which TWO actions should you take before and while reducing review? (Select 2)',
    options: [
      'Stop sampling once the 98.1% figure is confirmed on a second labeled set, since downstream analysts will notice and report any later regressions.',
      'Break accuracy down by filer segment and by field, and automate only the segments and fields that meet the target individually.',
      'Replace the field-level confidence scores with a single document-level score, which makes thresholds simpler to set and to explain to finance.',
      'Keep human review only for filings whose rationale text sounds uncertain, using hedging words such as "appears" or "likely" as the routing trigger.',
      'Keep stratified random sampling of high-confidence extractions across segments to measure ongoing error rates and catch novel error patterns.'
    ],
    answer: [1, 4],
    explanation: 'An aggregate accuracy figure can hide weak segments, such as bank-specific fields or scanned exhibits, so validate by segment and field before automating. After automation, stratified sampling of high-confidence output provides an ongoing error-rate measurement and early warning of new failure modes.',
    rationales: [
      'Ending measurement leaves drift and novel errors undetected until they cause damage downstream.',
      'Correct. Segment- and field-level validation prevents the aggregate from masking weak areas.',
      'A document-level score hides which fields are uncertain and weakens routing.',
      'Hedging language is not a calibrated signal of extraction correctness.',
      'Correct. Stratified sampling of high-confidence items keeps measuring real error rates across segments.'
    ],
    trap: 'Aggregate accuracy and ending measurement'
  },
  {
    id: 'e5-S6-07',
    scenario: 'S6',
    domain: 'D4',
    obj: 'O31',
    type: 'single',
    select: 1,
    stem: 'To compute adjusted EBITDA, the pipeline extracts non-recurring items from MD&A using: "Extract any unusual or non-recurring items." It includes restructuring charges the company has recorded in each of the last six years, ordinary FX losses, and seasonal inventory write-downs, yet misses a litigation settlement described as "one-time" in a footnote. What is the best fix?',
    options: [
      'Add "Be conservative and only extract items you are highly confident are genuinely non-recurring" to the instruction, so borderline items like recurring restructuring are skipped.',
      'Define inclusions (company-labeled one-time items, impairments, divestiture gains, settlements) and exclusions (items in 2 of 3 prior years, ordinary FX, seasonal), with examples.',
      'Extract every income-statement line item with an is_unusual flag and let the analysts filter the results themselves, so the model never has to decide what counts.',
      'Have the model attach a confidence score to each extracted item and automatically drop any item whose score falls below 0.8 before the results reach the analysts.'
    ],
    answer: [1],
    explanation: 'Vague categories such as "unusual" produce both false positives and misses. Explicit inclusion and exclusion criteria, with a boundary example for each, make the category precise and consistent; general calls to be conservative or confidence cut-offs do not define the category.',
    rationales: [
      '"Be conservative" does not define what counts and would not surface the missed settlement.',
      'Correct. Categorical inclusion and exclusion boundaries directly fix both error types.',
      'Offloading the judgment to analysts abandons the task and floods them with noise.',
      'Confidence thresholds filter by the model\'s self-assessment, not by the business definition.'
    ],
    trap: 'Vague category with confidence filtering'
  },
  {
    id: 'e5-S6-08',
    scenario: 'S6',
    domain: 'D4',
    obj: 'O31',
    type: 'single',
    select: 1,
    stem: 'Receipts are categorized into <code>meals</code>, <code>entertainment</code>, <code>travel</code>, <code>lodging</code>, <code>office</code>, or <code>other</code>. Policy: meals are the employee\'s own meals while traveling or working late; entertainment is any meal or event with clients or other non-employees present. The prompt says "categorize appropriately." 31% of client dinners are labeled meals, and hotel room-service charges flip between meals and lodging. What is the best fix?',
    options: [
      'Add a combined enum value meals_or_entertainment that the model can use whenever a receipt could reasonably belong to either category, and let finance split them later.',
      'Add ten few-shot examples drawn at random from last month\'s receipts, each showing its correct category label, so that the model can infer the policy from real cases.',
      'Have the model output a confidence value for each category decision and send all receipts with confidence below 0.7 to the finance team for manual categorization.',
      'Write explicit rules: entertainment when attendees beyond the employee are listed; single diner is meals; folio room service is lodging; unclear if attendees are unknown.'
    ],
    answer: [3],
    explanation: 'The misclassifications come from undefined boundaries. Explicit criteria for each boundary (attendee evidence, folio charges) plus an unclear value for undeterminable cases make classification consistent and route truly ambiguous receipts deliberately rather than by guess.',
    rationales: [
      'A merged category destroys the distinction the policy requires.',
      'Random examples rarely cover the boundary cases and do not state the rule.',
      'Confidence thresholds do not define the boundary and are poorly calibrated.',
      'Correct. Explicit inclusion and exclusion criteria plus an unclear fallback fix the boundary errors.'
    ],
    trap: 'Few-shot or confidence in place of boundary criteria'
  },
  {
    id: 'e5-S6-09',
    scenario: 'S6',
    domain: 'D4',
    obj: 'O26',
    type: 'single',
    select: 1,
    stem: 'The receipt extraction schema includes:<pre>"vat_number":     { "type": "string" },\n"tip_amount":     { "type": "number" },\n"payment_method": { "type": "string", "enum": ["card", "cash"] },\n...\n"required": ["merchant", "date", "total",\n             "vat_number", "tip_amount", "payment_method"]</pre>Audits find plausible-looking but fabricated VAT numbers on receipts that show none, <code>tip_amount: 0</code> on receipts with no tip line (indistinguishable from a real zero tip), and "card" for mobile-wallet, voucher, and company-account payments. What is the best schema revision?',
    options: [
      'Make vat_number and tip_amount nullable and return null when absent; extend payment_method with mobile_wallet, other, and unclear, plus a detail string.',
      'Keep the fields required but add a regex pattern for vat_number, so invented numbers fail validation and trigger a retry with the validation error included in the prompt.',
      'Remove vat_number, tip_amount, and payment_method from the schema entirely, since they have proven unreliable and downstream systems can live without them for now.',
      'Keep the schema exactly as it is and add "Never invent VAT numbers or tip amounts" and "Choose the closest payment method" to the extraction prompt as explicit rules.'
    ],
    answer: [0],
    explanation: 'Required fields pressure the model to fabricate values when the information is absent. Nullable fields represent missing data honestly, and extending an enum with other and unclear values plus a detail string captures real-world variety without forcing a wrong category.',
    rationales: [
      'Correct. Nullable fields and an extensible enum represent missing and ambiguous data honestly.',
      'A regex rejects some fabrications, but retries cannot supply a VAT number that is not on the receipt; the field must allow null.',
      'Removing fields discards data that is often present and needed.',
      'Prompt rules fight the schema: required fields and a two-value enum still force a value.'
    ],
    trap: 'Required fields forcing fabrication'
  },
  {
    id: 'e5-S6-10',
    scenario: 'S6',
    domain: 'D4',
    obj: 'X08',
    type: 'single',
    select: 1,
    stem: 'Supplier invoices go through a validation-retry loop that checks (a) line items sum to the subtotal within 0.01, (b) invoice_date is on or before due_date, and (c) a purchase_order_number is present for invoices over EUR 5,000. Retries that include the specific error fix 71% of sum mismatches, but only 3% of missing-PO failures; those invoices say "PO: see attached," and the PO is a separate document that is not provided. What is the best change?',
    options: [
      'Increase the retry limit for missing-PO failures from two to five and strengthen the retry prompt so the model searches the invoice more carefully for the PO number.',
      'Remove the PO check from validation entirely, since the retry statistics show the model is rarely able to satisfy that requirement for the affected invoices.',
      'Keep error-feedback retries for sum and date errors; for missing POs, stop retrying, return null with a reason like external_document, and route for review.',
      'Send missing-PO failures to a larger model on retry, since reasoning about references to attached documents requires more capability than the default model provides.'
    ],
    answer: [2],
    explanation: 'Retry with error feedback works when the information is in the source but was extracted or formatted wrongly. It cannot help when the data lives in a document that was not provided; the right response is to record the absence with a reason and route it for human review or retrieval of the referenced document.',
    rationales: [
      'More retries cannot find data that is not in the input.',
      'The PO requirement is a real policy; removing the check hides violations.',
      'Correct. Distinguishing retryable semantic errors from absent information avoids wasted retries and routes the gap properly.',
      'No model can extract a PO number from a document it never receives.'
    ],
    trap: 'Retrying when information is absent from the source'
  },
  {
    id: 'e5-S6-11',
    scenario: 'S6',
    domain: 'D4',
    obj: 'O23',
    type: 'single',
    select: 1,
    stem: 'Three workloads share the extraction service: (1) employees photograph receipts in the mobile app and expect a categorized expense line within seconds so they can submit their report; (2) a backfill of 180,000 archived receipts for audit analytics, due in 10 days; (3) 10-K filings arrive between 06:00 and 22:00 and are submitted in one batch at 23:00, with a 48-hour SLA from filing time. Which API assignment is best?',
    options: [
      'Use the Message Batches API for all three workloads to capture the 50% cost savings, showing a "processing" status in the mobile app until the batch results arrive.',
      'Use the synchronous API for mobile receipts, and the Message Batches API with a custom_id per document for the backfill and the nightly 10-K run.',
      'Use the synchronous API for all three workloads, because the Message Batches API offers no latency guarantee and could therefore miss any of the deadlines.',
      'Use the Message Batches API for mobile receipts submitted every five minutes to keep latency low, and the synchronous API for the large backfill to finish it quickly.'
    ],
    answer: [1],
    explanation: 'Blocking, user-facing work needs the synchronous API; batches can take up to 24 hours with no latency SLA. Latency-tolerant work fits the Batches API: the backfill has days of slack, and for 10-Ks the worst case is 17 hours waiting (06:00 to 23:00) plus 24 hours processing, which is 41 hours and within the 48-hour SLA. custom_id correlates results, which are not returned in order.',
    rationales: [
      'Batch processing can take up to 24 hours, which breaks the in-app experience.',
      'Correct. Sync for blocking interactions, batch for latency-tolerant bulk work that fits the SLA math.',
      'Synchronous processing for the bulk workloads forgoes 50% savings the SLAs can accommodate.',
      'Frequent submission does not change the up-to-24-hour processing window; the assignment is inverted.'
    ],
    trap: 'Batch API for blocking workflows'
  },
  {
    id: 'e5-S6-12',
    scenario: 'S6',
    domain: 'D5',
    obj: 'O19',
    type: 'single',
    select: 1,
    stem: 'In one filing, FY2025 revenue appears as $4,812.3M ("Total revenue") in the income statement, $4,790.1M ("Net revenue") in the MD&A narrative, and as segment amounts summing to $4,812.3M in Note 18. Sections are extracted in parallel, and the merge step keeps whichever value arrives first, so repeated runs disagree. Downstream analysts reconcile definitional differences. What should the pipeline do?',
    options: [
      'Always keep the income-statement value and discard the others, since the audited primary statement is the authoritative figure for reported revenue.',
      'Average the three values into a single revenue figure, which reduces the effect of any single extraction error and yields one stable number across runs.',
      'Keep the value that appears most often across sections, treating agreement between the income statement and the segment note as confirmation of the correct figure.',
      'Keep each value with its section, page, and label, set conflict_detected when they differ, and pass all of them to reconciliation instead of choosing one.'
    ],
    answer: [3],
    explanation: 'When sources within a document disagree, extraction should preserve each value with its attribution and flag the conflict, leaving reconciliation to the step that has the context and authority to decide. The difference here may be definitional (net vs total revenue), and silently choosing one value hides that from the analysts.',
    rationales: [
      'Picking a source by rule discards the net-revenue figure and its label, which analysts may need, and hides that a discrepancy exists.',
      'Averaging produces a number that appears nowhere in the filing.',
      'Majority agreement still silently drops a differently defined value.',
      'Correct. Attributed values plus an explicit conflict flag preserve the information needed for reconciliation.'
    ],
    trap: 'Silently resolving conflicting values'
  },
  {
    id: 'e5-S6-13',
    scenario: 'S6',
    domain: 'D4',
    obj: 'O27',
    type: 'single',
    select: 1,
    stem: 'An intake pipeline receives receipts, supplier invoices, and 10-K excerpts without knowing the type in advance. It defines three tools, <code>extract_receipt</code>, <code>extract_invoice</code>, and <code>extract_10k_excerpt</code>, with <code>tool_choice: {"type": "auto"}</code>. In 6% of calls the model replies in text ("This looks like a hotel folio; which schema should I use?"), and the downstream parser crashes. What is the best fix?',
    options: [
      'Set tool_choice to {"type": "any"} so a tool call is guaranteed while the model still picks the schema that matches the document type.',
      'Force {"type": "tool", "name": "extract_receipt"} on every call, since receipts make up the majority of the incoming documents by volume.',
      'Keep tool_choice at auto and add "Always respond with exactly one tool call and never reply in plain text" near the top of the system prompt.',
      'Keep tool_choice at auto, parse the text replies for a document type, and re-send those documents with the matching extraction tool forced.'
    ],
    answer: [0],
    explanation: 'tool_choice "any" guarantees the model calls one of the provided tools rather than replying in text, while still letting it choose which schema fits an unknown document type. Forcing one specific tool is right only when that exact extraction must run.',
    rationales: [
      'Correct. "any" removes text replies and preserves schema selection by document type.',
      'Forcing the receipt tool would push invoices and 10-K excerpts into the wrong schema.',
      'A prompt instruction is probabilistic; auto still permits text responses.',
      'Parsing text replies adds a fragile extra round trip for something the API can guarantee.'
    ],
    trap: 'auto tool_choice when a tool call is mandatory'
  },
  {
    id: 'e5-S6-14',
    scenario: 'S6',
    domain: 'D2',
    obj: 'X04',
    type: 'single',
    select: 1,
    stem: 'The extraction agent calls an <code>ocr_page</code> MCP tool. When the upstream OCR service rate-limits during month-end peaks, the tool returns <code>{"text": ""}</code> as a successful result. The agent concludes the receipt is blank, returns all-null fields, and 4% of month-end receipts are auto-rejected as unreadable. What is the best fix?',
    options: [
      'Have the agent treat every empty OCR result as a failure and retry the call up to five times before extracting, regardless of whether the page is actually blank.',
      'Raise the OCR service quota for the month-end period, so rate limiting stops occurring during peaks and the tool no longer returns empty text under load.',
      'Return rate limits as isError: true with errorCategory transient, isRetryable, and retry-after; return truly blank pages as success with a blank_page flag.',
      'Return every OCR failure as a generic "OCR failed" error so that the agent routes each affected receipt to human review instead of extracting from it.'
    ],
    answer: [2],
    explanation: 'Tools must distinguish access failures from valid empty results. Structured error metadata (isError, category, retryability, retry-after) lets the agent retry transient failures appropriately, while a genuinely blank page remains a successful result that should not be retried.',
    rationales: [
      'Retrying every empty result wastes calls on truly blank pages and still cannot tell the cases apart.',
      'More quota reduces frequency but leaves the tool misreporting failures as success whenever limits are hit.',
      'Correct. Structured transient errors plus an explicit blank-page signal separate failures from valid empty results.',
      'A generic error hides retryability and sends recoverable cases to humans.'
    ],
    trap: 'Failure disguised as a valid empty result'
  },
  {
    id: 'e5-S6-15',
    scenario: 'S6',
    domain: 'D5',
    obj: 'O18',
    type: 'single',
    select: 1,
    stem: 'A 10-K is split into sections, and per-section extraction subagents run in parallel. An aggregator must build a debt maturity table, reconcile it with the balance sheet, and let reviewers jump to the source page. Subagents currently return <code>{"section_summary": "Debt: the company has $2.1B of senior notes maturing 2027-2031 and a revolver..."}</code>. Which subagent output design best supports the aggregator?',
    options: [
      'Longer prose summaries that mention every number found in the section, so the aggregator receives complete information and can build tables from the text itself.',
      'Per-fact records (field, value, unit/scale, period, page and table locator, excerpt, status extracted/derived/not_found) plus section-level coverage notes.',
      'The full raw text of each section, so that the aggregator can re-extract every value consistently in one place using a single prompt and a single schema.',
      'Records with only the field name and value for each fact, keeping payloads as small as possible to protect the aggregator\'s limited context budget.'
    ],
    answer: [1],
    explanation: 'Downstream synthesis needs structured data rather than prose: values with units and periods for tables and reconciliation, source locators and excerpts for reviewer navigation, and explicit status and coverage notes so gaps are visible. This keeps payloads compact while preserving provenance.',
    rationales: [
      'Prose forces the aggregator to re-parse numbers and loses page-level provenance.',
      'Correct. Structured, attributed per-fact records support tables, reconciliation, and review navigation.',
      'Raw text defeats the purpose of parallel extraction and overloads the aggregator\'s context.',
      'Without units, periods, and locators, the aggregator cannot reconcile values or link to sources.'
    ],
    trap: 'Prose or stripped-down outputs for downstream synthesis'
  }
]);
