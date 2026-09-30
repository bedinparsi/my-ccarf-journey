/* Practice Exam 1 — Scenario S6: Structured Data Extraction (scanned multi-page vendor invoices and insurance claim forms with varied layouts) */
CCAR.addQuestions('exam1', [
  {
    id: 'e1-S6-01', scenario: 'S6', domain: 'D4', obj: 'O28', type: 'single', select: 1,
    stem: 'A claims pipeline sends an entire scanned auto-claim packet (claim form, police report, three repair estimates, rental receipts) in one request and forces the <code>extract_claim_packet</code> tool. Large packets fail like this:<pre>packet=CLM-2026-118842 pages=46 input_tokens=148930\nstop_reason: "max_tokens"   usage.output_tokens: 16000\ncontent[0]: tool_use  name=extract_claim_packet\n  input.estimates[2].line_items: 211 rows, last row cut off mid-string\nschema validation failed: estimates[2] missing "subtotal", "tax", "total"</pre>Which fix is most effective?',
    options: [
      'Raise <code>max_tokens</code> to the model\'s maximum output limit so that the largest packets fit, and alert whenever stop_reason is still max_tokens.',
      'Switch from tool use to a prompt that asks for compact, minified JSON, so that the same extracted data takes fewer output tokens for every packet.',
      'Split extraction into scoped calls per document, and per page range for long estimates, then merge the partial results in code and validate totals.',
      'On a max_tokens stop, send a follow-up asking the model to continue the tool input from where it stopped, and concatenate the two partial outputs.'
    ],
    answer: [2],
    explanation: 'stop_reason max_tokens means generation was cut off, so the tool input is incomplete. The reliable fix is to scope each call to a smaller unit of work (one document, or a page range of a long estimate) so every structured output completes, then merge the results in code and check totals. Raising the limit only moves the ceiling for the next bigger packet, prompt-only JSON loses schema reliability, and stitching continued tool input is fragile and unsupported as a structured pattern.',
    rationales: [
      'Moves the ceiling; packets keep growing and one huge output also dilutes attention across 46 pages.',
      'Gives up the most reliable structured-output method to save a few tokens, and still truncates on big packets.',
      'Correct. Smaller scoped calls complete within limits and merge deterministically.',
      'Concatenating partial tool inputs is brittle and cannot be schema-validated until pieced back together.'
    ],
    trap: 'Raise max_tokens instead of splitting into scoped calls'
  },
  {
    id: 'e1-S6-02', scenario: 'S6', domain: 'D4', obj: 'O28', type: 'single', select: 1,
    stem: 'Invoices from a freight carrier run up to 30 pages with about 1,400 line items. After the team raised <code>max_tokens</code> from 8,000 to 32,000, truncation errors dropped, but p95 latency is now four minutes, reconciliation finds 3–6% of middle-page line items missing even when <code>stop_reason</code> is <code>end_turn</code>, and about 2% of invoices still stop on <code>max_tokens</code>. Which redesign best fixes this?',
    options: [
      'Extract the header once and line items per page range in separate calls tagged with page numbers; merge in code, joining split rows, and check the sum.',
      'Raise <code>max_tokens</code> again to 64,000 and add "extract every line item and do not skip any rows" to the prompt so that the middle pages get full attention.',
      'Keep the single call per invoice but move it to the Message Batches API, so that long invoices can take as long as they need without timing out the extraction job.',
      'Ask the model to summarize the line items by charge category instead of listing each one, so the output stays well within the token budget for every invoice.'
    ],
    answer: [0],
    explanation: 'Very long single outputs both truncate and lose items from the middle of the input. Splitting into scoped calls (header once, line items per page range) keeps each output small and focused; merging in code with a rule for rows that straddle page breaks and checking the sum against the stated total catches anything still missing. More tokens and stronger wording do not fix attention over 1,400 rows, batching changes latency but not output size, and summarizing destroys the line-level data AP needs.',
    rationales: [
      'Correct. Page-range calls avoid truncation and dropped middle rows; the sum check verifies completeness.',
      'Same design with a higher ceiling; instructions do not fix attention dilution across a huge output.',
      'Batch processing does not change the per-request output limit or the middle-page omissions.',
      'Loses the line-item detail that downstream reconciliation requires.'
    ],
    trap: 'Bigger output budget or batch API for an output-size problem'
  },
  {
    id: 'e1-S6-03', scenario: 'S6', domain: 'D5', obj: 'O22', type: 'single', select: 1,
    stem: 'After six weeks, the claim-form extractor scores 97.1% field-level accuracy on a 5,000-document labeled set, and operations wants to cut human review from 100% of claims to a random 5% sample. A breakdown shows typed PDF forms at 99.3%, while handwritten scanned forms (18% of volume) score 88% overall, with <code>date_of_loss</code> at 79% and <code>claimed_amount</code> at 84%. What should the team do before reducing review?',
    options: [
      'Go ahead with the random 5% sample, because 97.1% overall exceeds the 95% target and random sampling gives an unbiased estimate of the error rate.',
      'Route claims to review when the model\'s self-reported overall confidence is "low", and auto-approve every claim that the model rates as "high".',
      'Keep 100% review until every field on handwritten forms exceeds 97.1%, and then remove human review for all of the document types at once.',
      'Segment by type and field: automate segments that meet target, route low calibrated-confidence fields to review, and sample the rest.'
    ],
    answer: [3],
    explanation: 'An aggregate 97.1% hides a weak segment: handwritten forms, and two critical fields on them, fall well below target. Accuracy must be validated per document type and field before automating, with calibrated field-level confidence routing the risky fields to reviewers and stratified sampling of high-confidence output to keep measuring error rates. Random sampling spends capacity uniformly and misses the concentrated errors, and self-reported document confidence is not calibrated.',
    rationales: [
      'The aggregate masks a segment at 79% on a critical field; random 5% sampling would let most of those errors through.',
      'Uncalibrated self-reported confidence is a poor routing signal and is not field-level.',
      'Over-conservative and then all-or-nothing; typed forms can already be automated safely.',
      'Correct. Segment-level validation plus calibrated field-level routing and stratified sampling.'
    ],
    trap: 'Aggregate accuracy and random sampling hide weak segments'
  },
  {
    id: 'e1-S6-04', scenario: 'S6', domain: 'D5', obj: 'O22', type: 'multi', select: 2,
    stem: 'The invoice pipeline processes 3,200 invoices per day, and the AP review team can check about 350. The model outputs a confidence score for each extracted field, and the team has a 4,000-invoice labeled validation set. Which two routing rules make the best use of limited reviewer capacity? (Select 2)',
    options: [
      'Route an invoice when any critical field (total, IBAN, due date) falls below a per-field threshold calibrated on the labeled validation set.',
      'Route a random 11% of invoices each day, so that reviewer workload matches capacity and routing introduces no selection bias of any kind.',
      'Route invoices whose sources are contradictory or ambiguous, such as a stated total that differs from the line-item sum, or two bank accounts.',
      'Route every invoice longer than ten pages, since long invoices are the hardest to extract and therefore the most likely source of errors.',
      'Ask the model for one 1–10 rating of how sure it is about the whole invoice, and route every invoice that it rates below 7 to a reviewer.'
    ],
    answer: [0, 2],
    explanation: 'Limited review capacity should go where errors are likely: fields whose confidence falls below thresholds calibrated against labeled data, and documents whose source content is contradictory or ambiguous. Random routing spends capacity uniformly (random sampling belongs in stratified monitoring of high-confidence output, not as the routing rule), page count is a crude proxy, and a single uncalibrated self-rating does not identify which field is at risk.',
    rationales: [
      'Correct. Calibrated field-level thresholds target the specific values most likely to be wrong.',
      'Uniform random routing ignores every available risk signal and wastes most reviews on correct invoices.',
      'Correct. Contradictory or ambiguous sources need human judgment regardless of model confidence.',
      'Length is a weak proxy; many long invoices are clean and many short ones are ambiguous.',
      'Uncalibrated document-level self-ratings are poor routing signals and hide which field is uncertain.'
    ],
    trap: 'Random sampling or self-reported confidence as routing'
  },
  {
    id: 'e1-S6-05', scenario: 'S6', domain: 'D4', obj: 'O29', type: 'single', select: 1,
    stem: 'The invoice extractor handles vendors from 14 countries using a tool schema with <code>invoice_date</code> (string) and <code>total_amount</code> (number). Downstream systems report that <code>03/04/2026</code> from a UK vendor is stored as March 4, <code>1.234,56</code> from a German vendor is extracted as <code>1.234</code>, and <code>12.500,00 €</code> becomes <code>12.5</code>. Which change best fixes these errors?',
    options: [
      'Add a regex post-processor that infers the date and number format from each string\'s pattern and rewrites the values as ISO dates and decimals after extraction.',
      'Add normalization rules alongside the strict schema: ISO 8601 dates read by the vendor country\'s convention, decimal amounts, raw source strings kept too.',
      'Change both fields to free-text strings so that the model copies exactly what is printed on the invoice and downstream systems can parse the values themselves.',
      'Add "be careful with international formats and double-check each date and amount" to the system prompt, and lower the sampling temperature to zero.'
    ],
    answer: [1],
    explanation: 'A strict schema guarantees structure, not interpretation. Explicit normalization rules in the prompt (target ISO 8601 and decimal formats, and how to read source conventions such as day-first dates and comma decimals for the vendor\'s country) tell the model how to map inconsistent source formats, and keeping the raw string supports auditing. A regex cannot tell whether 03/04 is day-first without the document context, free text pushes the problem downstream, and a vague caution changes nothing specific.',
    rationales: [
      'Pattern matching cannot disambiguate 03/04/2026 or 1.234 without knowing the vendor\'s locale from the document.',
      'Correct. Normalization rules plus a strict schema handle inconsistent source formatting.',
      'Moves the ambiguity to every downstream consumer instead of resolving it once.',
      'Vague caution gives no rule to apply; temperature does not supply locale knowledge.'
    ],
    trap: 'Post-hoc regex or vague caution instead of normalization rules'
  },
  {
    id: 'e1-S6-06', scenario: 'S6', domain: 'D4', obj: 'O29', type: 'multi', select: 2,
    stem: '<code>policy_number</code> comes back null on 17% of claim forms from two insurers, even though reviewers find it on every one of those forms. Insurer A labels it "Certificate Ref." in the page footer; Insurer B prints it unlabeled under a barcode, as in <code>PX-0042-118-7</code>. Forms from other insurers are null only 0.5% of the time. The field is nullable on purpose, because some claim types genuinely have no policy number. Which two changes should the team make? (Select 2)',
    options: [
      'Make <code>policy_number</code> required with <code>minLength: 1</code>, so that the model can no longer return null and must locate a value on every form.',
      'Add few-shot examples from both insurers\' layouts showing the policy number being found under the footer label and beneath the barcode.',
      'Retry the extraction up to three times whenever <code>policy_number</code> comes back null, and keep the first non-null value that is returned.',
      'Add prompt rules listing label synonyms such as "Certificate Ref." and "Pol. No." and the canonical <code>PX-####-###-#</code> format to normalize to.',
      'Route these two insurers to a larger model with a longer context window, since their forms are evidently harder for the current model to read.'
    ],
    answer: [1, 3],
    explanation: 'Nulls concentrated in two layouts where the value is present point to a layout-recognition gap. Few-shot examples of those layouts show where the value lives, and explicit label-synonym and format rules tell the model what to map to policy_number and how to normalize it. Making the field required would force fabricated values on forms that truly lack one, identical retries repeat the same miss, and a bigger model does not teach the layout conventions.',
    rationales: [
      'Removing nullability pushes the model to invent values for claim types that genuinely have none.',
      'Correct. Examples across varied layouts fix empty extraction of fields that are present.',
      'Same prompt, same layout gap; retries mostly return null again and add cost.',
      'Correct. Synonym and normalization rules map unfamiliar labels and formats to the field.',
      'Capacity is not the issue; the model has not been shown these layout conventions.'
    ],
    trap: 'Required fields or retries for a layout-coverage gap'
  },
  {
    id: 'e1-S6-07', scenario: 'S6', domain: 'D1', obj: 'O09', type: 'single', select: 1,
    stem: 'A backfill of 1.2 million archived invoices uses the Message Batches API in 12 batches of 100,000 requests, with <code>custom_id</code> set to each document\'s content hash. The orchestrator crashed after submitting batches 1–7. Batches 1–3 had ended and their results were fully written to the warehouse; batch 4 had ended and was half written; batches 5–7 were still processing. The orchestrator kept batch IDs only in memory. How should the job be redesigned so it can resume reliably without repeating work or losing results?',
    options: [
      'Restart the backfill from the beginning with the same inputs; the warehouse upsert keyed by document will overwrite any rows that were written before.',
      'Count the rows already in the warehouse and skip that many invoices from the start of the input list, since results were written in submission order.',
      'Keep a manifest keyed by custom_id with batch ID and status; on resume, poll recorded batches, upsert idempotently, submit only unsent or failed IDs.',
      'Resubmit batches 4–12 as new batches, since batch 4 was only half written and batches 5–7 cannot be recovered once their handles are gone.'
    ],
    answer: [2],
    explanation: 'Reliable resumption needs persisted state that says what was submitted, where, and with what outcome. A durable manifest keyed by custom_id and batch ID lets a restarted orchestrator poll batches that are still running, re-read results from batches that ended (results remain available for 29 days), write them idempotently, and submit only requests that were never sent or that failed. Restarting doubles the cost, counting rows assumes an ordering that batch results do not guarantee, and resubmitting 4–12 repeats work that is already done or in progress.',
    rationales: [
      'Correct results but pays again for 700,000 already-processed requests.',
      'Batch results are not returned in order, so a row count does not identify which documents are done.',
      'Correct. A durable manifest keyed by custom_id enables idempotent, targeted resumption.',
      'Batches 5–7 are recoverable by ID once the IDs are persisted; resubmitting duplicates work in progress.'
    ],
    trap: 'Restarting or position-based resume instead of a custom_id manifest'
  },
  {
    id: 'e1-S6-08', scenario: 'S6', domain: 'D5', obj: 'O18', type: 'single', select: 1,
    stem: 'A claim packet is split among per-document extraction subagents (claim form, police report, repair estimates, medical bills), and a synthesis step writes the adjuster summary and red-flag list. Each subagent currently returns a prose paragraph. Adjusters complain that the summary says "damage estimate $8,420" without saying which of three estimates it came from, that missing information appears inconsistently as "not mentioned" or is silently omitted, and that no value can be traced to a page. What should the subagents return?',
    options: [
      'Structured records per field: value, source document ID and page, a short verbatim excerpt, a status enum (found, not_found, illegible), and brief notes.',
      'A longer prose summary of each document that mentions page numbers inline, so that the synthesis step has richer context from which to write its narrative.',
      'Only the final normalized field values in a flat JSON object, so the synthesis step receives the smallest possible payload for each document in the packet.',
      'The complete OCR text of each document, so that the synthesis step can re-read the sources itself and find any detail it needs for the adjuster summary.'
    ],
    answer: [0],
    explanation: 'Downstream synthesis needs structured data that keeps provenance and honest status: each value with its source document, page and excerpt, and an explicit status for values that are absent or illegible, plus a short notes field for context that does not fit the schema. That lets the summary attribute each figure and represent gaps consistently. Longer prose keeps the parsing problem, bare values lose provenance, and raw OCR text floods the synthesis context and repeats the extraction work.',
    rationales: [
      'Correct. Structured values with source metadata and explicit status support attributable synthesis.',
      'Prose still has to be re-parsed, and inline page mentions are inconsistent and easy to drop.',
      'Compact but loses the source mapping and the difference between not found and illegible.',
      'Shifts extraction back onto synthesis and consumes its context budget with raw text.'
    ],
    trap: 'Prose or bare values instead of structured records with provenance'
  },
  {
    id: 'e1-S6-09', scenario: 'S6', domain: 'D5', obj: 'O19', type: 'single', select: 1,
    stem: 'For claim CLM-2026-120517, the claim form (signed by the claimant on 2026-03-20) gives the date of loss as 2026-03-14, the police report (filed 2026-03-12) records the incident on 2026-03-12, and the repair shop\'s intake sheet is dated 2026-03-13. The synthesis step currently outputs <code>date_of_loss: "2026-03-14"</code> with no note. The fraud team says date discrepancies between sources are one of its strongest signals. What should synthesis do?',
    options: [
      'Apply a fixed precedence rule (police report over claim form over repair intake) and output only the single date from the highest-precedence source.',
      'Ask the model to judge which date is most plausible given the narrative, and output that date together with a one-line justification for the choice.',
      'Output the earliest date across all sources, since a loss must precede both reporting and repair, and write the other dates to an audit log.',
      'Keep each date with its source document and page, set <code>conflict_detected</code> to true, and route the claim to an adjuster without choosing.'
    ],
    answer: [3],
    explanation: 'When credible sources conflict, synthesis should preserve every value with its attribution and mark the conflict, rather than collapsing it to one number. Here the discrepancy itself is the signal the fraud team needs, and a human adjuster should decide. Precedence rules, plausibility judgments and earliest-date heuristics all hide the conflict in the primary output, even when they happen to pick the right date.',
    rationales: [
      'Deterministic, but it silently discards the conflicting values the fraud team relies on.',
      'Collapses the conflict into a model judgment; the justification does not surface the discrepancy for review.',
      'A heuristic pick with the evidence moved to a log that adjusters do not read.',
      'Correct. Attributed values plus an explicit conflict flag preserve the uncertainty for human review.'
    ],
    trap: 'Collapsing conflicting sources into one value'
  },
  {
    id: 'e1-S6-10', scenario: 'S6', domain: 'D4', obj: 'X08', type: 'single', select: 1,
    stem: 'The validator reports three errors for one extracted invoice:<pre>E1 sum(line_items.amount)=4812.50 != total_amount=4875.00  (diff 62.50)\nE2 po_number=null; invoice text reads "Ref: see attached PO" (no PO in packet)\nE3 due_date="Net 30" does not match format YYYY-MM-DD</pre>Page 2 of the scan has a small footer box reading "Freight surcharge 62.50", and the invoice date is 2026-05-04. Which retry policy is best?',
    options: [
      'Retry all three errors with the unchanged prompt up to three times, since extraction is non-deterministic and a later attempt may resolve each of them.',
      'Retry with the document, the prior extraction and E1 and E3 as specific errors; route E2 for PO lookup instead, since that value is not in the packet.',
      'Retry E2 with a stronger instruction to find the PO number, and fix E1 and E3 in code by overwriting the stated total and defaulting the due date.',
      'Skip retries and send the invoice to human review whenever any validation error appears, since retries on extraction errors rarely succeed in practice.'
    ],
    answer: [1],
    explanation: 'Retry with specific error feedback works when the information is in the document and the problem is the extraction: the missed freight surcharge (E1) and the unnormalized payment term that can be computed from the invoice date (E3). It cannot work when the value exists only in an external document that was not provided (E2), so that case should be flagged or routed instead. Blind retries lack guidance, overwriting totals hides real discrepancies, and sending everything to humans wastes a fixable case.',
    rationales: [
      'Identical retries give no feedback on what was wrong, and E2 can never succeed.',
      'Correct. Targeted feedback for fixable errors; no retry for information that is absent from the source.',
      'Retrying E2 invites a fabricated PO number, and overwriting the total masks a genuine mismatch.',
      'E1 and E3 are usually fixed by one feedback retry; routing them to humans wastes reviewer capacity.'
    ],
    trap: 'Retrying when the information is absent from the source'
  },
  {
    id: 'e1-S6-11', scenario: 'S6', domain: 'D4', obj: 'O25', type: 'single', select: 1,
    stem: 'The invoice pipeline, running on a current Claude model, prompts "Return the invoice as JSON with these keys: ..." and parses the reply with <code>json.loads</code>. About 2.4% of responses fail to parse: some begin with "Here is the extracted data:", some contain unescaped quotes in vendor names such as <code>ACME "Rapid" Freight</code>, and some have trailing commas. Which approach is the most reliable fix?',
    options: [
      'Prefill the assistant turn with an opening brace so that the model begins directly with the JSON object and cannot add any preamble text first.',
      'Add three few-shot examples of perfectly formatted JSON output and an instruction to "return only valid JSON with no commentary at all".',
      'Define an extraction tool whose input schema is the invoice schema, force it with tool_choice, and read the structured tool_use input.',
      'Keep the prompt and add a JSON-repair library that strips preambles, escapes stray quotes and removes trailing commas before parsing.'
    ],
    answer: [2],
    explanation: 'Tool use with a JSON schema (optionally strict) is the most reliable way to get schema-compliant structured output: the arguments arrive as parsed tool input, so preambles, quoting and trailing-comma errors disappear. Prefilling the assistant turn is not supported on recent Claude models and never guaranteed the schema anyway, few-shot formatting still leaves free-text output, and repair libraries guess at intent and fail on new malformations.',
    rationales: [
      'Not supported on current models, and even where it worked it did not enforce the schema or escaping.',
      'Improves consistency but remains prompt-only JSON, the least reliable method.',
      'Correct. Schema-defined tool input eliminates JSON syntax failures.',
      'Heuristic repair treats symptoms and can silently corrupt values such as quoted vendor names.'
    ],
    trap: 'Prefill or prompt-only JSON instead of tool use with a schema'
  },
  {
    id: 'e1-S6-12', scenario: 'S6', domain: 'D4', obj: 'O26', type: 'single', select: 1,
    stem: 'Part of the claim-form extraction tool\'s input schema:<pre>"injury_type":  { "type": "string",\n                  "enum": ["whiplash", "fracture", "laceration", "none"] },\n"witness_name": { "type": "string" },\n...\n"required": ["claimant_name", "injury_type", "witness_name", "date_of_loss"]</pre>An audit finds that forms marked "Other: burn" are extracted as <code>"none"</code>, illegible handwritten injury entries become <code>"laceration"</code>, and forms with a blank witness section produce <code>"John Smith"</code>, <code>"Unknown"</code> or the name of the reporting police officer. Which change best fixes this?',
    options: [
      'Make witness_name nullable and optional; add "other" with an injury_type_detail string, plus an "unclear" value for illegible entries.',
      'Keep the schema and add prompt text telling the model never to invent witness names and to pick the closest injury type in the enum list.',
      'Replace the injury_type enum with a free-text string, and keep witness_name required so that every form still produces a complete record.',
      'Add a validator that rejects "Unknown" or "N/A" as witness names, and retry the extraction every time the validator rejects the value.'
    ],
    answer: [0],
    explanation: 'The schema forces dishonest answers: a required string makes the model fabricate a witness when the section is blank, and a closed enum with no "other" or "unclear" value forces a wrong category. Making the field nullable and optional, and adding "other" with a detail string and "unclear" for illegible entries, lets the output represent missing and ambiguous data honestly. Prompt text fights the schema, free text loses the categories downstream needs, and rejecting placeholder names just drives more creative fabrication.',
    rationales: [
      'Correct. Nullable fields and "other"/"unclear" enum values let the model report reality.',
      'The required field and closed enum still force a value; "closest type" keeps the misclassification.',
      'Loses consistent categories for downstream systems and keeps the fabrication pressure on witness_name.',
      'Retrying against a required field pushes the model toward plausible-looking invented names.'
    ],
    trap: 'Required fields and closed enums that force fabrication'
  },
  {
    id: 'e1-S6-13', scenario: 'S6', domain: 'D4', obj: 'O27', type: 'single', select: 1,
    stem: 'A shared inbox receives vendor invoices, insurance claim forms and a few percent of other documents such as cover letters and remittance advice. The extraction request is configured as:<pre>tools: [extract_invoice, extract_claim_form]\ntool_choice: {"type": "auto"}</pre>In 4.1% of responses the model replies in text, for example "This document appears to be a remittance advice, not an invoice...", and the downstream loader crashes because it expects a <code>tool_use</code> block. What is the best change?',
    options: [
      'Force <code>{"type": "tool", "name": "extract_invoice"}</code>, since invoices are the majority of the inbox, and send claim forms to a separate queue afterward.',
      'Keep <code>"auto"</code> and add "You must always call one of the tools and never reply in plain text" to the system prompt to eliminate text replies.',
      'Keep <code>"auto"</code> and, whenever the reply is text, send it to a second call that converts the prose description into the invoice schema instead.',
      'Set <code>tool_choice</code> to <code>{"type": "any"}</code> and add a <code>report_unsupported_document</code> tool for other document types.'
    ],
    answer: [3],
    explanation: 'With "auto" the model may answer in text, which breaks a loader that expects tool output. tool_choice "any" guarantees a tool call while still letting the model pick the right schema for an unknown document type, and adding a tool for unsupported documents gives cover letters and remittance advice an honest structured outcome instead of forcing them into an invoice or claim schema. Forcing extract_invoice mis-extracts claim forms, prompt wording is probabilistic, and converting prose adds a fragile second step.',
    rationales: [
      'Forcing one schema makes every claim form and cover letter produce a wrong invoice extraction.',
      'An instruction lowers the text-reply rate but cannot guarantee a tool call.',
      'Recovers from failures after the fact and pushes non-invoice documents into the wrong schema.',
      'Correct. "any" guarantees structured output; the extra tool handles documents that fit neither schema.'
    ],
    trap: 'Prompt fix or wrong forced tool instead of tool_choice "any"'
  },
  {
    id: 'e1-S6-14', scenario: 'S6', domain: 'D4', obj: 'X09', type: 'single', select: 1,
    stem: 'On handwritten claim forms, claimants often strike through and rewrite amounts (a crossed-out <code>1,200</code> followed by <code>1,450</code>), write values such as "approx 2k", or tick two boxes for vehicle use. The prompt already has a detailed paragraph of rules for these cases, yet output varies across near-identical forms: sometimes the struck amount, sometimes the corrected one, sometimes null. Which change is most effective?',
    options: [
      'Expand the rules paragraph into a numbered list that covers each correction style, and restate the most important rule again at the end of the prompt.',
      'Add 3–4 few-shot examples of such forms, each showing the output chosen and why: use the corrected value, set is_estimate, flag both ticked boxes.',
      'Add 40 few-shot examples of clean, typed claim forms so that the model sees many correctly completed extractions for every field in the schema.',
      'Lower the temperature to zero so that the model gives the same answer on similar forms, and send any claim with a null amount to human review.'
    ],
    answer: [1],
    explanation: 'When detailed instructions still produce inconsistent handling of ambiguous inputs, a few targeted examples that show the chosen output and the reasoning behind it are the most effective fix, and they generalize to similar correction styles the rules did not list. More rules repeat the approach that is already failing, many clean examples do not demonstrate the ambiguous cases at all, and temperature zero gives consistency without making the choices correct.',
    rationales: [
      'Restructured rules are still rules; the inconsistency persists on ambiguous cases.',
      'Correct. Targeted examples with reasoning demonstrate how to resolve each ambiguity.',
      'Volume of clean examples does not teach how to handle strikethroughs or double ticks.',
      'Deterministic sampling can be consistently wrong; routing nulls does not fix the struck-amount errors.'
    ],
    trap: 'More rules or more clean examples instead of targeted ambiguous-case examples'
  },
  {
    id: 'e1-S6-15', scenario: 'S6', domain: 'D4', obj: 'O31', type: 'single', select: 1,
    stem: 'The invoice extractor also sets an <code>audit_flag</code> with a reason, driven by the instruction "Flag any invoice that looks suspicious or unusual." The vendor master record (bank account, usual currency, open PO amounts) is included in context. The model now flags 38% of invoices, for reasons such as new letterheads, handwritten notes, round totals and foreign-language text. The AP team stopped reading the flags and missed a real fraud in which a vendor\'s bank account had been changed. Which change is best?',
    options: [
      'Keep the instruction but add "only flag invoices when you are highly confident that they are fraudulent", so that far fewer benign invoices get flagged.',
      'Have the model output a suspicion score from 0 to 1, and raise the flag threshold until the flag rate falls to roughly five percent of all invoices.',
      'Use explicit criteria: flag bank details that differ from the vendor master, currency changes, or totals over PO by more than 2%; skip layout changes.',
      'Remove audit flags from the extraction prompt and rely on the AP team\'s manual spot checks, which caught this kind of fraud pattern in the past.'
    ],
    answer: [2],
    explanation: 'Vague categories such as "suspicious or unusual" produce noisy flags that erode trust in the accurate ones. Explicit inclusion criteria tied to the data in context (bank account mismatch against the vendor master, currency change, PO overrun beyond a threshold) and explicit exclusions (layout, letterhead, language) make the flag precise and keep the bank-change fraud in scope. Confidence wording and tuned score thresholds do not define what counts, and removing flags drops the signal entirely.',
    rationales: [
      'A confidence instruction does not tell the model which signals matter; precision barely improves.',
      'Tuning an uncalibrated score to a target rate can filter out the real bank-change case.',
      'Correct. Categorical inclusion and exclusion boundaries target real risk signals.',
      'Gives up automated detection instead of fixing the criteria.'
    ],
    trap: 'Confidence thresholds instead of explicit flag criteria'
  }
]);
