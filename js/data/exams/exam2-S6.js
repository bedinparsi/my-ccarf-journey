/* Practice Exam 2 — Scenario S6: Structured Data Extraction
   Context: clinical-trial PDFs (CSRs), scanned lab reports, and supplier certificates of analysis (CoAs). */
CCAR.addQuestions('exam2', [
  {
    id: 'e2-S6-01',
    scenario: 'S6',
    domain: 'D4',
    obj: 'O28',
    type: 'single',
    select: 1,
    stem: 'You extract every adverse event (AE) from clinical study reports (CSRs) into a <code>record_adverse_events</code> tool whose input is an array of AE objects. For a 180-page CSR with ~600 AEs across its listings tables, the response ends with <code>stop_reason: "max_tokens"</code> and the tool input is cut off mid-object at AE #214. Smaller CSRs extract correctly. What is the best fix?',
    options: [
      'Raise <code>max_tokens</code> to the model\'s maximum output limit so that the full 600-AE array fits into a single response for this and all future CSRs.',
      'Add "Be concise and abbreviate field values" to the prompt so that each AE object uses fewer output tokens and the array fits within the current limit.',
      'Move to a model with a larger context window, since the 180-page CSR plus the extraction output together exceed what the current model is able to hold.',
      'Split extraction into scoped calls (per listings table or page range), each returning its own AEs, then merge and de-duplicate the results in code.'
    ],
    answer: [3],
    explanation: 'Output truncation (<code>stop_reason: "max_tokens"</code>) means the requested output is larger than one response should produce. Splitting the work into smaller, scoped calls and merging the results in code scales with document size and keeps each call focused. Raising the ceiling only moves the failure point to the next larger CSR and degrades attention over very long outputs.',
    rationales: [
      'Output ceilings are finite; a larger CSR will truncate again, and very long single outputs are less accurate.',
      'Abbreviation degrades data quality and only buys a little headroom for this document.',
      'The problem is output length, not input context; a bigger context window does not raise the output limit.',
      'Correct. Scoped extraction calls plus a deterministic merge handle any document size.'
    ],
    trap: 'Raising max_tokens or context window for output truncation'
  },
  {
    id: 'e2-S6-02',
    scenario: 'S6',
    domain: 'D4',
    obj: 'O28',
    type: 'single',
    select: 1,
    stem: 'Your lab-report pipeline logs this for a 64-page scanned multi-visit panel:<pre>stop_reason: "max_tokens"\ncontent[0].type: "tool_use"   name: "record_lab_results"\ncontent[0].input: {"results": [{"subject":"1042-017","visit":"W12","analyte":"ALT", ... (truncated)\nretry 1: identical request -&gt; stop_reason "max_tokens"\nretry 2: identical request -&gt; stop_reason "max_tokens"\nstored: 187 of ~520 expected results</pre>The code then stores whatever could be parsed. What change should you make?',
    options: [
      'On <code>max_tokens</code>, send a follow-up asking Claude to "continue the JSON from exactly where it stopped" and concatenate the fragments into one tool input.',
      'Treat <code>max_tokens</code> as incomplete: extract the report in page ranges, merge on <code>subject+visit+analyte</code>, and never store partial output.',
      'Raise the retry count to five with exponential backoff, since truncation at the output limit is usually transient and tends to resolve on a later attempt.',
      'Accept the partial array but mark the document <code>status: "partial"</code>, so downstream reporting can proceed with whatever results were extracted.'
    ],
    answer: [1],
    explanation: 'A <code>max_tokens</code> stop is deterministic for the same request, so identical retries fail identically, and truncated tool input must never be stored as if complete. The fix is to scope each call to a slice of the document that fits, then merge with a natural key so duplicates across page boundaries collapse. Stitching partial JSON across turns is fragile and hard to validate.',
    rationales: [
      'Continuation of a truncated tool input is fragile: fragments may overlap, break mid-token, and cannot be schema-validated as one object.',
      'Correct. Smaller scoped calls with a keyed merge, and truncated output treated as a failure rather than data.',
      'Truncation is not transient; the same request will exceed the same limit every time.',
      'Silently passing 36% of the data downstream is error suppression, even with a status flag.'
    ],
    trap: 'Retrying identical requests or storing partial output after truncation'
  },
  {
    id: 'e2-S6-03',
    scenario: 'S6',
    domain: 'D4',
    obj: 'O28',
    type: 'multi',
    select: 2,
    stem: 'Supplier certificate bundles arrive as single PDFs containing anywhere from 1 to 400 certificates of analysis (CoAs). Extracting a whole bundle in one call works for small bundles but truncates on large ones. Which TWO changes make the pipeline robust to bundle size? (Select 2)',
    options: [
      'Raise max_tokens to the model maximum and move to a larger-context model so that even 400-certificate bundles fit in one extraction response.',
      'First run a lightweight call that returns only certificate boundaries (page ranges and certificate numbers), then extract each certificate in its own call.',
      'Remove the optional fields (test method, retest date, remarks) from the schema to shrink each certificate\'s output enough for large bundles.',
      'Check <code>stop_reason</code> on every call and, when it is <code>max_tokens</code>, re-split that range into smaller pieces and re-extract instead of accepting it.',
      'Switch from tool use to a prompt that asks for compact JSON Lines, which spends fewer tokens per certificate than a tool input object does.'
    ],
    answer: [1, 3],
    explanation: 'Robustness to variable output size comes from scoping each call to a unit whose output is bounded (one certificate), found via a cheap boundary-detection pass, and from treating any <code>max_tokens</code> stop as a signal to split further rather than accept partial data. Together they handle both typical and pathological bundles without sacrificing schema fields or structured-output reliability.',
    rationales: [
      'A higher ceiling still has a limit that a large enough bundle will exceed, and context size does not raise output size.',
      'Correct. Boundary detection first, then per-certificate extraction, bounds each call\'s output.',
      'Dropping fields loses required QA data and only delays truncation for the largest bundles.',
      'Correct. Detecting truncation and re-splitting the range is the safety net for unusually dense sections.',
      'Prompt-only JSON is less reliable than tool use and the token savings are marginal.'
    ],
    trap: 'Shrinking or enlarging a single call instead of splitting by unit'
  },
  {
    id: 'e2-S6-04',
    scenario: 'S6',
    domain: 'D4',
    obj: 'O29',
    type: 'single',
    select: 1,
    stem: 'Lab reports from nine central and local labs report glucose in mg/dL or mmol/L, dates as <code>03/04/2025</code>, <code>2025-04-03</code>, or <code>3 Apr 25</code>, and results such as <code>&lt;0.5</code>, <code>ND</code>, or <code>5.2 H</code>. A strict tool schema guarantees valid JSON, yet 11% of glucose values are stored in the wrong unit and European-format dates are read as US dates. Which change best addresses these accuracy errors?',
    options: [
      'Make the <code>value</code> field a free-text string so the model copies exactly what appears in the report, and let each downstream analyst interpret the original text.',
      'Add a schema pattern forcing every date to match <code>YYYY-MM-DD</code>, which prevents any ambiguous date string from ever being written to the database.',
      'Add normalization rules (unit conversion, each lab\'s date convention, qualifiers), keep original value/unit fields, and add few-shot examples from several lab formats.',
      'Extract every report twice and store a value only when both runs agree exactly, sending any disagreement to the manual data-entry queue for review.'
    ],
    answer: [2],
    explanation: 'Strict schemas eliminate syntax errors, not semantic ones such as misread units or day/month order. Accuracy improves when the prompt states explicit normalization rules alongside the schema, the schema preserves the original value and unit for traceability, and few-shot examples show correct handling across the varied source formats. Together these address interpretation, which is where the errors occur.',
    rationales: [
      'Pushing raw text downstream abandons normalization and makes the data unusable for analysis.',
      'A format pattern guarantees ISO syntax, but <code>03/04/2025</code> can still be stored as the wrong ISO date.',
      'Correct. Normalization rules, preserved originals, and multi-format few-shot examples target the semantic errors.',
      'Two runs with the same misunderstanding agree on the same wrong value; consistency is not accuracy.'
    ],
    trap: 'Schema syntax constraints for a semantic normalization problem'
  },
  {
    id: 'e2-S6-05',
    scenario: 'S6',
    domain: 'D4',
    obj: 'O29',
    type: 'single',
    select: 1,
    stem: 'Extraction of <code>reference_range</code> from scanned lab reports is 98% accurate for seven labs but returns <code>null</code> for 64% of reports from two labs. Those two labs print reference ranges in a footnote block keyed by superscript letters (e.g. <code>ALT 52ᵇ</code> … <code>ᵇ 7–56 U/L</code>) instead of in a table column. The prompt already says "extract the reference range for each analyte". What is the most effective change?',
    options: [
      'Add few-shot examples from those two layouts that link each footnote-keyed range to its analyte, alongside one standard column-layout example.',
      'Make <code>reference_range</code> a required, non-nullable field so the model can no longer return <code>null</code> and has to find a value in every single report.',
      'Add "Look very carefully for reference ranges; they are almost always present somewhere" in capital letters at the top of the extraction prompt.',
      'Route every report from those two labs to manual data entry permanently, since their footnote layout is fundamentally incompatible with automated extraction.'
    ],
    answer: [0],
    explanation: 'When required information is present but expressed in an unfamiliar structure, few-shot examples demonstrating extraction from that structure are the most effective fix; they teach the mapping (superscript key → footnote range) that the instruction alone does not convey. Forcing a value invites fabrication, and emphasis does not explain where to look.',
    rationales: [
      'Correct. Layout-specific examples show the model how to resolve footnote-keyed ranges and generalize to similar layouts.',
      'Required fields pressure the model to fabricate ranges when it cannot resolve the footnote, trading nulls for wrong values.',
      'Emphasis does not tell the model how footnote keys map to analytes.',
      'Premature: the layout is learnable, and permanent manual entry wastes reviewer capacity.'
    ],
    trap: 'Required fields or emphasis instead of format-specific few-shot examples'
  },
  {
    id: 'e2-S6-06',
    scenario: 'S6',
    domain: 'D4',
    obj: 'O31',
    type: 'single',
    select: 1,
    stem: 'The pipeline fills a <code>serious_adverse_events</code> list from CSR narratives for a safety dashboard. The prompt says "extract serious or significant adverse events". Medical reviewers find 41% of extracted items are grade 3 "severe" events (e.g., severe nausea managed at home) that do not meet regulatory seriousness criteria, while two hospitalizations described as "mild" were missed. What is the best prompt change?',
    options: [
      'Add "include only events you are highly confident are serious" plus a <code>confidence</code> field, and filter the dashboard to items the model scores at 0.8 or higher.',
      'Replace the list with a single <code>is_serious</code> boolean per narrative, so the model makes one decision per document instead of classifying every event it finds.',
      'Tell the model to be conservative and extract fewer items overall, since the reviewers\' main complaint is the sheer volume of false serious-event flags.',
      'Define seriousness by its regulatory criteria (death, life-threatening, hospitalization, disability, etc.) and state that a severe grade alone does not qualify.'
    ],
    answer: [3],
    explanation: 'The errors come from a vague category: "serious or significant" invites the model to conflate severity (intensity) with seriousness (outcome-based criteria). Explicit inclusion criteria plus an explicit exclusion ("a severe grade alone is not serious") fix both false positives and the missed "mild" hospitalizations. Confidence thresholds and "be conservative" do not change what the category means.',
    rationales: [
      'Confidence filtering keeps the same misunderstanding and could drop the true hospitalizations the model mislabels.',
      'Collapsing to a document boolean loses event-level data the safety dashboard needs.',
      'General conservatism reduces volume indiscriminately and does nothing for the missed hospitalizations.',
      'Correct. Categorical inclusion criteria and an explicit exclusion boundary resolve the severity/seriousness confusion.'
    ],
    trap: 'Confidence thresholds or "be conservative" instead of explicit criteria'
  },
  {
    id: 'e2-S6-07',
    scenario: 'S6',
    domain: 'D4',
    obj: 'O31',
    type: 'single',
    select: 1,
    stem: 'A CoA review step flags certificates as "non-conforming" for Quality Assurance. The prompt asks Claude to "flag any certificate with problems". QA dismisses 70% of flags, which turn out to be unit notation variants (<code>ppm</code> vs <code>mg/kg</code>), date formats, and letterhead differences. Last month two genuinely out-of-spec heavy-metal results were buried in the noise. What is the best change?',
    options: [
      'Keep the prompt but add a <code>severity</code> field, have the model rate each problem it finds, and show QA only the items that the model itself rates as "high".',
      'List what to flag (result outside spec limit, expired or missing retest date, missing QA signature, lot mismatch) and what to ignore (unit notation, date format, layout).',
      'Add three real non-conforming certificates to the prompt as examples and ask the model to flag any certificate that looks broadly similar to those three examples.',
      'Run the review with two independent instances and flag only the certificates that both instances mark as non-conforming, to reduce the false-positive rate.'
    ],
    answer: [1],
    explanation: '"Any problems" has no boundary, so the model reports cosmetic differences with the same weight as out-of-spec results, and the noise hides real issues. Explicit criteria that define what counts (spec violations, expiry, signatures, lot mismatches) and what to skip (notation, formats, layout) improve precision without sacrificing the cases that matter. Model-rated severity and consensus do not supply the missing definition.',
    rationales: [
      'Self-rated severity rests on the same undefined notion of "problem", so ratings are unreliable.',
      'Correct. Explicit inclusion and exclusion boundaries remove the false-positive categories while keeping true issues.',
      'Similarity to three examples is vaguer than stated criteria and will miss non-conformance types not shown.',
      'Consensus between two instances with the same vague prompt suppresses intermittent true positives and keeps the shared false positives.'
    ],
    trap: 'Vague "flag problems" criteria; consensus voting'
  },
  {
    id: 'e2-S6-08',
    scenario: 'S6',
    domain: 'D4',
    obj: 'O23',
    type: 'single',
    select: 1,
    stem: 'Two workloads are moving off real-time calls to cut cost. (1) A regulator requires every received lab report to be extracted and loaded within 32 hours of receipt; reports arrive continuously. You plan to use the Message Batches API (up to 24-hour processing) and must reserve 2 hours for resubmitting failed items. (2) At the receiving dock, a shipment cannot be released until its CoA is extracted, and dock staff wait for the result. Which plan meets both requirements at the lowest cost?',
    options: [
      'Batch lab reports every 6 hours; use the synchronous API for dock CoA checks.',
      'Batch lab reports every 8 hours; use the synchronous API for the dock CoA checks.',
      'Batch lab reports every 6 hours; batch dock CoA checks every 6 hours as well.',
      'Batch lab reports every 12 hours; batch dock CoA checks every 1 hour instead.'
    ],
    answer: [0],
    explanation: 'Worst-case latency for batched work is the wait until the next submission plus the 24-hour processing window plus the retry buffer: 6 + 24 + 2 = 32 hours meets the SLA, while 8 hours gives 34. The dock check is a blocking workflow with people waiting, so it needs the synchronous API; the Batches API has no latency guarantee. Matching each workload to the right API gives the savings without breaking either requirement.',
    rationales: [
      'Correct. 6 + 24 + 2 = 32 hours for lab reports, and synchronous calls for the blocking dock check.',
      '8 + 24 + 2 = 34 hours, which can exceed the 32-hour regulatory SLA.',
      'Batching the dock check can leave shipments waiting up to a day; blocking workflows need synchronous calls.',
      '12 + 24 + 2 = 38 hours breaks the SLA, and hourly batching still has no latency guarantee for the dock.'
    ],
    trap: 'Batch API for blocking workflows; SLA submission-interval math'
  },
  {
    id: 'e2-S6-09',
    scenario: 'S6',
    domain: 'D4',
    obj: 'O27',
    type: 'single',
    select: 1,
    stem: 'An intake service receives mixed PDFs (lab reports, CSR excerpts, CoAs) without reliable type metadata. You define three extraction tools (<code>extract_lab_report</code>, <code>extract_csr_section</code>, <code>extract_coa</code>) and call the API with <code>tool_choice: {"type": "auto"}</code>. In 6% of calls Claude replies with text such as "This appears to be a certificate of analysis for lot 22-118…" and no tool call, which crashes the loader. What is the best fix?',
    options: [
      'Force <code>tool_choice: {"type": "tool", "name": "extract_lab_report"}</code>, since lab reports are the most common type, and let the loader correct other types.',
      'Add "You must always call one of the extraction tools" to the system prompt, and parse the text reply with a regex whenever no tool call comes back.',
      'Set <code>tool_choice: {"type": "any"}</code> so Claude must call one of the three tools while still choosing the one matching the document type.',
      'Merge the three tools into one <code>extract_document</code> tool with every field from all three schemas marked optional, keeping <code>tool_choice</code> on auto.'
    ],
    answer: [2],
    explanation: 'With <code>"auto"</code> the model may answer in text. <code>"any"</code> guarantees a tool call while leaving the choice of tool to the model, which is exactly what an unknown document type requires. Forcing one named tool is for cases where a specific extraction must run (e.g., metadata first), not for type-dependent routing.',
    rationales: [
      'Forcing the lab-report schema onto CoAs and CSR excerpts produces wrong-schema extractions for a third of documents.',
      'A prompt instruction still leaves a non-zero text-reply rate, and regex parsing of prose is brittle.',
      'Correct. "any" guarantees structured output while preserving type selection.',
      'A catch-all schema weakens validation, and auto still allows text replies.'
    ],
    trap: 'tool_choice auto vs any vs forced'
  },
  {
    id: 'e2-S6-10',
    scenario: 'S6',
    domain: 'D4',
    obj: 'O26',
    type: 'single',
    select: 1,
    stem: 'The CoA extraction schema includes:<pre>"retest_or_expiry_date": { "type": "string", "format": "date" },\n"storage_condition": { "type": "string", "enum": ["2-8C", "15-25C", "-20C"] },\n"required": ["lot_number", "retest_or_expiry_date", "storage_condition"]</pre>Audits find that for certificates with no expiry date, extractions contain plausible but invented dates (often manufacture date + 24 months), and "store below 30°C" certificates are recorded as <code>15-25C</code>. What schema change best fixes both problems?',
    options: [
      'Keep the schema and add prompt text: "Never invent dates; if unsure about storage, pick the closest enum value", together with two short examples.',
      'Remove both fields from the extraction schema entirely and have QA staff enter the expiry date and storage condition by hand for every certificate.',
      'Change both fields to unconstrained free-text strings, so the model can copy whatever appears on the certificate, and keep both of them in <code>required</code>.',
      'Make the date nullable and optional, and add <code>"other"</code> (plus a detail string) and <code>"not_stated"</code> to the storage enum.'
    ],
    answer: [3],
    explanation: 'A required, non-nullable field forces the model to produce a value even when the source has none, which invites fabrication; a closed enum forces the nearest wrong category. Nullable optional fields let absence be represented honestly, and an enum with "other" + a detail string (plus "not_stated") captures values outside the known set. The schema should represent missing and novel data rather than hide it.',
    rationales: [
      'The schema still demands a date and a listed enum value, so the pressure to fabricate or force-fit remains.',
      'Throws away automation for fields that are extractable on most certificates.',
      'Free text removes normalization, and keeping the date required still pressures the model to invent one.',
      'Correct. Nullable dates plus "other"/"not_stated" enum values represent missing and novel data honestly.'
    ],
    trap: 'Required fields and closed enums forcing fabrication'
  },
  {
    id: 'e2-S6-11',
    scenario: 'S6',
    domain: 'D4',
    obj: 'X08',
    type: 'multi',
    select: 2,
    stem: 'Your validation-retry loop sends the original document, the failed extraction, and the specific validation errors back to Claude. Last week\'s failures fell into five categories. For which TWO is retry-with-error-feedback likely to succeed? (Select 2)',
    options: [
      'A CoA\'s impurity line items sum to 1.4%, but <code>total_impurities</code> was extracted as 0.14% because it was read from the adjacent column.',
      'A CoA says "results per attached annex B", but annex B was not included in the uploaded PDF, so the assay values are missing.',
      'A lab report\'s <code>collection_date</code> was output as <code>12 Mar 2025</code>, failing the loader\'s ISO-8601 date validation.',
      'A scanned report\'s hemoglobin value is obscured by a fax artifact, and the extraction left it null, failing a required-field check.',
      'A CSR excerpt cites baseline labs "reported in the prior interim CSR", a separate document that was not provided to the pipeline.'
    ],
    answer: [0, 2],
    explanation: 'Retry with specific error feedback works when the correct answer is present in the provided document and the failure is a format or placement error the model can fix once told (wrong column, non-ISO date). It cannot help when the information is absent from the input (a missing annex or external document) or unreadable in the source; those need the missing document or human review.',
    rationales: [
      'Correct. The value is in the document; the feedback (sum mismatch) points the model to the right column.',
      'The data exists only in an attachment that was never provided; no amount of retrying can recover it.',
      'Correct. A format mismatch is exactly what error feedback fixes.',
      'The value is illegible in the source; retries risk a guessed value. Route to human review.',
      'The information lives in an external document that was not provided, so retries cannot succeed.'
    ],
    trap: 'Retrying when the information is absent from the source'
  },
  {
    id: 'e2-S6-12',
    scenario: 'S6',
    domain: 'D4',
    obj: 'O25',
    type: 'single',
    select: 1,
    stem: 'The CoA extraction service asks for "JSON only" in the prompt and prefills the assistant turn with <code>{</code>. After migrating to a Claude 4.6-family model, requests with the prefill are rejected. On the old model, 3% of outputs were malformed JSON and 2% had line items that did not sum to the stated total. Which approach should you adopt?',
    options: [
      'Drop the prefill, keep "JSON only" in the prompt, and add a JSON-repair library that fixes malformed output before it reaches validation and loading.',
      'Define an extraction tool with a strict JSON schema and read the tool_use input; keep a semantic check comparing summed line items with the stated total.',
      'Use strict tool use with a JSON schema, which guarantees both valid syntax and correct totals, so the separate validation step can now be retired.',
      'Keep the prefill idea but move it into the system prompt as "Begin your answer with {", which achieves the same effect as prefill on newer models.'
    ],
    answer: [1],
    explanation: 'Tool use with a strict JSON schema is the most reliable structured-output method and removes syntax errors; assistant-turn prefill is not supported on Claude 4.6 and later models. Schema compliance does not guarantee semantic correctness, so business checks such as calculated vs stated totals must stay. The keyed option combines the reliable method with the check it cannot replace.',
    rationales: [
      'Prompt-only JSON plus repair is the least reliable approach, and repair can silently change data.',
      'Correct. Strict tool use eliminates malformed JSON; a semantic validation step still catches totals that do not add up.',
      'Strict schemas enforce structure, not arithmetic; retiring validation would let sum mismatches through.',
      'An instruction to start with "{" is just prompt-based formatting, with the same reliability limits.'
    ],
    trap: 'Assuming strict schemas prevent semantic errors'
  },
  {
    id: 'e2-S6-13',
    scenario: 'S6',
    domain: 'D5',
    obj: 'O22',
    type: 'single',
    select: 1,
    stem: 'After three months, overall field accuracy for lab-report extraction is 97.2%, and the ops lead proposes ending human review for every document the model marks high-confidence. A breakdown you run shows: typed central-lab PDFs 99.1%, local-lab faxes 88%, handwritten investigator notes 79%, and the <code>units</code> field at 91% across all types. What should you do before reducing review?',
    options: [
      'Validate accuracy per document type and field, keep review on weak segments (faxes, handwriting, units), and automate only segments that earn it.',
      'Proceed with the proposal as written, since 97.2% exceeds the 95% target and high-confidence items are by definition the ones the model extracted correctly.',
      'Reduce review uniformly by sampling 10% of all documents at random, because random sampling is unbiased and will surface any systematic problem on its own.',
      'Keep full human review of every document until overall accuracy exceeds 99%, and then re-evaluate the proposal once the aggregate metric crosses that bar.'
    ],
    answer: [0],
    explanation: 'Aggregate accuracy can hide poor performance on specific document types and fields, as the breakdown shows. Before automating, accuracy must be validated per segment, and review should stay focused where error rates are high while well-performing segments are automated. Uniform random sampling spreads scarce reviewer time evenly and under-samples the segments that fail most.',
    rationales: [
      'Correct. Segment-level validation decides where automation is safe and where review must continue.',
      'High model confidence is not proof of correctness, and the aggregate hides 79–88% segments.',
      'Uniform sampling wastes review on the 99% segment and under-covers the weak ones.',
      'An aggregate target is the wrong gate and keeps reviewers on documents that do not need them.'
    ],
    trap: 'Aggregate accuracy masking weak segments'
  },
  {
    id: 'e2-S6-14',
    scenario: 'S6',
    domain: 'D5',
    obj: 'O22',
    type: 'single',
    select: 1,
    stem: 'Reviewers can check about 250 documents a day out of ~6,000 extracted CoAs and lab reports. The model outputs field-level confidence scores. You need to catch as many errors as possible with that capacity and also detect new error patterns in documents the model is confident about. Which design fits best?',
    options: [
      'Send documents whose overall self-rated confidence is below 7 out of 10 to reviewers, and auto-accept everything else with no further checks of any kind.',
      'Randomly sample 250 documents a day across the entire stream, which gives an unbiased error estimate and should eventually catch every error pattern that exists.',
      'Calibrate field thresholds on a labeled set, route low-confidence or contradictory fields to review, and stratify-sample a slice of high-confidence items.',
      'Send documents from new suppliers and new labs to reviewers for their first month, and auto-accept all documents from established sources after that point.'
    ],
    answer: [2],
    explanation: 'Confidence is useful for routing only after it is calibrated against labeled data at the field level. Routing low-confidence and contradictory fields concentrates limited reviewer capacity where errors are likely, while stratified sampling of high-confidence items measures the residual error rate and exposes novel failure patterns the model does not know it is making.',
    rationales: [
      'Uncalibrated, document-level self-ratings are poor routing signals, and nothing checks the auto-accepted stream.',
      'Pure random sampling spends most capacity on correct documents and finds concentrated error sources slowly.',
      'Correct. Calibrated field-level routing plus stratified sampling of high-confidence output.',
      'Source age is a crude proxy; established sources can still produce hard documents, and nothing monitors them later.'
    ],
    trap: 'Uncalibrated confidence or random sampling for review routing'
  },
  {
    id: 'e2-S6-15',
    scenario: 'S6',
    domain: 'D5',
    obj: 'O18',
    type: 'single',
    select: 1,
    stem: 'CSR extraction is split across section-level subagents (synopsis, efficacy tables, safety listings), and an aggregator reconciles their outputs into one study record. Each subagent currently returns <code>{"field": "primary_endpoint_result", "value": "HR 0.72"}</code>. When the synopsis says HR 0.72 and an efficacy table says HR 0.74 (a later data cut), the aggregator keeps whichever arrived last, and reviewers cannot see where either value came from. What should each subagent\'s output include?',
    options: [
      'A single <code>value</code> plus a free-text <code>notes</code> field where the subagent explains in prose anything unusual that it noticed about that value.',
      'Each value with its source location (section, page, table ID), a verbatim excerpt, the data-cut date, and a flag if it conflicts with other stated values.',
      'A self-reported <code>confidence</code> between 0 and 1, so that the aggregator can keep the higher-confidence value whenever two of the sections disagree.',
      'The full text of the section it processed, so that the aggregator can re-read the source itself whenever values from two different sections conflict.'
    ],
    answer: [1],
    explanation: 'Downstream reconciliation needs structured metadata alongside each value: where it came from, the supporting excerpt, and the temporal context (data cut) that explains apparent conflicts. With that, the aggregator can apply a rule (e.g., prefer the latest data cut) or route the conflict to review, and reviewers can verify values. Prose notes, confidence scores, and raw text do not provide a usable reconciliation contract.',
    rationales: [
      'Free-text notes are unstructured and inconsistent, so the aggregator cannot act on them programmatically.',
      'Correct. Source location, excerpt, data-cut date, and conflict flag enable correct reconciliation and verification.',
      'Self-reported confidence does not explain why values differ and would pick arbitrarily between two correct values from different cuts.',
      'Raw section text overloads the aggregator and moves extraction work to the wrong stage.'
    ],
    trap: 'Bare values without provenance or temporal metadata'
  }
]);
