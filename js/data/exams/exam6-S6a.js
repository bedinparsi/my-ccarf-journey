/* Practice Exam 6, Scenario S6 (Structured Data Extraction), items 01-08 */
CCAR.addQuestions('exam6', [
  {
    id: 'e6-S6-01', scenario: 'S6', domain: 'D4', obj: 'O28', type: 'single', select: 1,
    stem: `<p>Foxglove Logistics extracts pricing from its carrier supply agreements into a rate engine. A typical agreement runs to 90 pages: the main terms plus Annexes A to F, each holding price schedules by lane and weight band, about 420 rows in all. The extraction service sends the whole agreement in one Messages API call with an <code>extract_price_schedule</code> tool whose input is an array of rows, and a validator loads the rows into the rate engine.</p>
<p>For the largest agreements the response ends like this:</p>
<pre>stop_reason: "max_tokens"
tool_use.input: {"rows": [ ... 311 complete rows ...,
  {"annex": "E", "lane": "RTM-HAM", "band": "5-10t", "rate_eur": 14</pre>
<p>The validator rejects the truncated input, so no rows load at all. The team has already raised <code>max_tokens</code> to the model's maximum output, and latency on these calls has grown to about six minutes. Every annex begins on a new page with its own heading, and each annex's schedule fits comfortably in one response on its own. The rate-engine team has also asked for rates to be stored in cents from next month, and the agreements are written in English and Dutch.</p>
<p>Which change best fixes the extraction for large agreements?</p>`,
    options: [
      `Extract each annex in its own scoped call with the annex named in the prompt, then merge the rows in code, removing duplicates and checking row counts and totals before loading.`,
      `Move the extraction to a model with a larger context window, so that the whole 90-page agreement and its full set of rows fit comfortably in a single request and a single response.`,
      `Instruct the model to abbreviate field values, such as shortening lane codes and dropping units, so that all 420 rows fit within the current output limit of a single response.`,
      `Send each agreement through the Message Batches API instead of the synchronous API, so that the long extraction runs without time pressure and returns complete results.`
    ],
    answer: [0],
    explanation: `Truncation happens when a single call must produce more output than its limit allows; the remedy is to split the work into smaller scoped calls and merge the results, not to keep raising <code>max_tokens</code>, which is already at the maximum here. The stem supplies the natural unit: every annex starts on its own page with a heading, and each annex's schedule fits in one response. Extracting per annex keeps every tool call complete and gives each schedule full attention, and a deterministic merge in code combines the rows, removes duplicates and checks counts and totals before anything reaches the rate engine. A larger context window raises input capacity, not the output ceiling that causes the truncation. Abbreviating fields damages data the rate engine needs and only postpones the problem as agreements grow. The Batches API changes when results arrive, not how much one response can hold. The request for cents and the two languages are noise.`,
    rationales: [
      `Correct. Annexes are natural, bounded units that each fit in one response, so per-annex calls finish without truncation and the merge restores the full schedule.`,
      `The input already fits; the failure is the output ceiling, which a larger context window does not raise, so the rows array would still be cut off.`,
      `Abbreviations corrupt data the rate engine needs, such as units and lane codes, and larger agreements would soon exceed the limit again.`,
      `Batch processing changes cost and timing, not the size of a single response, so each batched request would stop at max_tokens in the same place.`
    ],
    trap: `Raising limits or compressing output instead of splitting into scoped calls`,
    signals: `Decisive: <code>stop_reason</code> is max_tokens with truncated tool input, <code>max_tokens</code> is already at the model maximum, and each annex fits in one response. Noise: the request to store rates in cents and the English and Dutch agreements.`
  },
  {
    id: 'e6-S6-02', scenario: 'S6', domain: 'D4', obj: 'O28', type: 'multi', select: 2,
    stem: `<p>Redwood Procurement Services extracts bid line items from public-tender responses into a comparison database. Responses run from 40 to 260 pages, and one call per document with an <code>extract_line_items</code> tool now ends at <code>max_tokens</code> on about a third of documents, even at the model's maximum output. The team has agreed to split the work and is reviewing a design document for the split.</p>
<p>Two facts shape the design. First, line items live in numbered schedules that start with headings, but some schedules run for 30 pages, and a line item's description sometimes continues from one page onto the next, so a page boundary can cut an item in half. Second, every schedule ends with a stated total, and auditors require the database totals to match the documents exactly. In a pilot that sent each page separately, 4% of items appeared twice and 2% were split into two partial items. The procurement office is also switching to a new supplier-ID format in January, and most responses arrive as scanned PDFs.</p>
<p>Which two design elements should the split include? (Select 2.)</p>`,
    options: [
      `When a response stops at <code>max_tokens</code>, send a follow-up asking the model to continue from where it stopped, and concatenate the JSON fragments into one array before loading.`,
      `Scope each call to a bounded unit, such as one schedule or a fixed page range with a small overlap at its edges, named in the prompt and sized so its output stays well under the limit.`,
      `Enable strict tool use on <code>extract_line_items</code>, so the model's output always matches the schema and the tool input can no longer be truncated when a document is long.`,
      `Merge in code with stable item IDs (schedule plus line number), remove overlap duplicates, rejoin items cut at page breaks, and check each schedule's total against the document.`,
      `Raise <code>max_tokens</code> again on a model with a higher output ceiling, so that even the 260-page responses fit into one call and the pipeline needs no merge logic at all.`
    ],
    answer: [1, 3],
    explanation: `Splitting fixes truncation only if each call is bounded and the merge is deterministic. Each call should cover a unit whose output reliably fits, such as one schedule or a fixed page range; because schedules can run 30 pages and items cross page breaks, ranges need a small overlap at their edges so no item falls into a gap. The overlap and the page breaks are then resolved in code: stable IDs built from schedule and line number let the merge drop the duplicates the pilot saw, rejoin items that were cut in two, and compare each schedule's merged sum with its stated total, which is what the auditors require. Continuation prompts produce fragments that break mid-object and must be stitched by guesswork. Strict tool use guarantees schema-valid input when output completes, but it does not raise the output ceiling. Another <code>max_tokens</code> increase repeats the approach that already fails on a third of documents. The supplier-ID change and the scanned PDFs are noise.`,
    rationales: [
      `Continuing from a cut-off point yields JSON fragments that break mid-object and must be stitched by guesswork, inviting the duplicates and split items seen in the pilot.`,
      `Correct. Bounded units with a small overlap keep each response under the limit and make sure no line item falls into a gap between two calls.`,
      `Strict tool use guarantees schema-valid input when the output completes, but it does not raise the output ceiling, so long documents would still stop at max_tokens.`,
      `Correct. Stable IDs let the merge remove overlap duplicates and rejoin split items, and checking each schedule total gives the exact match the auditors require.`,
      `The team is already at the model's maximum output and documents keep growing, so another increase repeats the approach that fails on a third of documents.`
    ],
    trap: `Continuation prompts, strict mode or bigger limits instead of bounded calls with a deterministic merge`,
    signals: `Decisive: items cross page breaks, schedules can run 30 pages, the per-page pilot produced duplicates and split items, and auditors require exact totals. Noise: the new supplier-ID format and the scanned PDFs.`
  },
  {
    id: 'e6-S6-03', scenario: 'S6', domain: 'D4', obj: 'O29', type: 'single', select: 1,
    stem: `<p>Alder Industrial Supply, a distributor based in Chicago, is extending its invoice-extraction pipeline to 140 new suppliers in Germany, Austria and the Netherlands. The pipeline uses tool use with a strict JSON schema, and a downstream ERP import reads the output:</p>
<pre>"invoice_date": { "type": "string", "description": "ISO 8601 date" },
"total":        { "type": "number" },
"currency":     { "type": "string", "enum": ["USD", "EUR"] }</pre>
<p>Schema validation passes on every European invoice, yet finance keeps finding wrong values. An invoice showing "Gesamtbetrag: 1.234,56 &euro;" came through as <code>"total": 1.23456</code>, and another as <code>123456</code>. A date printed as "03.04.2025", which the supplier means as 3 April, came through as <code>"2025-03-04"</code>. The prompt says only "extract the invoice date and total." Invoices from US suppliers are unaffected. The ERP team also plans to add a VAT field next quarter, and the European invoices arrive as clean digital PDFs rather than scans.</p>
<p>Which change most directly fixes the wrong values?</p>`,
    options: [
      `Rely on the strict schema to catch these errors, and add a validation rule that rejects any invoice whose total is not a number, so that malformed values never reach the ERP import.`,
      `Add a post-processing step that removes every dot from the total field and then converts the text to a number, so European thousands separators no longer shift the decimal point.`,
      `Add normalization rules to the prompt (separators by locale, day-first dates for these suppliers, ISO 8601 output) with two or three short examples next to the schema.`,
      `Change <code>total</code> from a number to a string in the schema, so the original text is preserved exactly as printed on the invoice and nothing is lost during extraction.`
    ],
    answer: [2],
    explanation: `A strict schema guarantees the shape and types of the output, not that the values are right: 1.23456 is a valid number and 2025-03-04 is a valid ISO date, so validation passes while the data is wrong. The fix belongs where the misreading happens. Format normalization rules in the prompt, alongside the strict schema, tell the model how to read these suppliers' conventions: in German, Austrian and Dutch amounts a dot separates thousands and a comma marks decimals, dates are day-first, and output must be ISO 8601. Two or three short examples, such as 1.234,56 becoming 1234.56 and 03.04.2025 becoming 2025-04-03, make the rules concrete. Rejecting non-numbers catches nothing, because the wrong values are numbers. Stripping dots in code breaks amounts like 12.50 from suppliers that use a decimal point and does nothing for dates. A string field only moves the parsing problem downstream. The VAT plan and the PDF quality are noise.`,
    rationales: [
      `The wrong values are valid numbers and valid ISO dates, so schema checks and a type rule pass them; strict schemas prevent syntax errors, not semantic ones.`,
      `Blindly stripping dots corrupts amounts written with a decimal point, such as 12.50, and does nothing for the day-first dates that are also being misread.`,
      `Correct. Locale-aware rules and short examples tell the model how these suppliers write numbers and dates, fixing both errors where the misreading happens.`,
      `A string keeps the text but moves the parsing problem into the ERP import, and the date field would still be misread as month-first.`
    ],
    trap: `Schema validation or naive post-processing for a semantic normalization problem`,
    signals: `Decisive: validation passes while values are wrong, the errors match European separators and day-first dates, and the prompt gives no normalization guidance. Noise: the planned VAT field and the clean digital PDFs, which rule out scanning as the cause.`
  },
  {
    id: 'e6-S6-04', scenario: 'S6', domain: 'D4', obj: 'O29', type: 'single', select: 1,
    stem: `<p>Cedarcrest Property Management requires every contractor working in its 300 buildings to file a certificate of insurance. An extraction pipeline reads certificates from about 30 insurance carriers and records the policy number, carrier, coverage limits and expiry date. The schema makes <code>policy_number</code> nullable, because some certificates are filed before a policy has been issued.</p>
<p>Audits show <code>policy_number</code> is null on 14% of certificates, and reviewers confirm that almost all of those certificates do show a policy number. The misses cluster by carrier: four carriers print the number in the header row of the coverage table instead of beside a "Policy Number" label, and two print it in the footer next to the abbreviation "Ref." Certificates from the other 24 carriers extract correctly. The prompt describes the field only as "the policy number shown on the certificate." Cedarcrest is also moving its contractor portal to a new vendor in the spring, and certificates arrive as a mix of scans and digital PDFs, with scans extracting as accurately as PDFs.</p>
<p>Which change most effectively reduces the missed policy numbers?</p>`,
    options: [
      `Make <code>policy_number</code> a required field in the schema, so the model must always return a value and can no longer leave the field empty when the number is printed in an unusual place.`,
      `Add few-shot examples of the header-row and "Ref." footer layouts with the correct policy number extracted, each with a brief note on where the number appears and how it is labeled.`,
      `Retry every extraction that returns a null <code>policy_number</code> with the added instruction to "look harder for the policy number", so the model makes a second, more careful attempt.`,
      `Add a regular expression that searches each certificate's OCR text for the word "Policy" and takes the next alphanumeric string as the number whenever the model returns null.`
    ],
    answer: [1],
    explanation: `Few-shot examples are the most effective way to teach extraction across varied document structures, including fixing null results for fields the documents do contain. The misses cluster in six carriers' layouts, where the number sits in a table header row or beside "Ref." instead of a "Policy Number" label, and the one-line field description gives the model no reason to look there. Showing each layout with the correct value and a short note on where the number appears lets the model generalize to those carriers and to similar layouts from new ones. Making the field required forces a value onto certificates that genuinely have no policy yet, which invites fabrication. A "look harder" retry adds no information about where to look. A regex keyed on the word "Policy" fails on exactly the layouts that use a header row or "Ref." The portal migration and the scan quality are noise.`,
    rationales: [
      `Some certificates legitimately have no policy number yet, so a required field pushes the model to fabricate a value instead of teaching it where the real one appears.`,
      `Correct. Examples of the header-row and "Ref." layouts show the model where these carriers print the number, fixing the clustered misses and generalizing to similar layouts.`,
      `A retry with "look harder" adds no information about where the number is printed, so the same six layouts produce the same nulls on the second attempt.`,
      `The failing layouts are exactly the ones without a "Policy" label, using a table header row or "Ref.", so a regex keyed on that word misses them too.`
    ],
    trap: `Required fields, vague retries or regex instead of layout-specific few-shot examples`,
    signals: `Decisive: the nulls cluster in six carriers' layouts (table header row, "Ref." footer) while 24 carriers extract correctly, and the field description names no layouts. Noise: the portal migration and the mix of scans and PDFs, which extract equally well.`
  },
  {
    id: 'e6-S6-05', scenario: 'S6', domain: 'D4', obj: 'O31', type: 'single', select: 1,
    stem: `<p>Birchline Foods' legal-operations team uses Claude to review 2,300 supplier contracts before a renegotiation cycle. For each clause the model returns a category from a fixed list and a short justification; clauses tagged <code>auto_renewal</code> go onto a calendar so the team can give notice before a contract rolls over. The prompt defines the category as "clauses about automatic renewal."</p>
<p>A lawyer reviewed 400 tagged clauses and found errors in both directions. False positives include "This Agreement may be renewed for a further term by mutual written agreement of the parties," and customer options such as "Buyer may renew for one additional year by giving 60 days' written notice," neither of which renews unless someone acts. False negatives include evergreen wording such as "This Agreement shall continue on a month-to-month basis unless terminated by either party," which does roll over automatically but never uses the word "renew." The lawyer notes that the justifications show the model keying on that word. Contracts arrive as both Word files and PDFs, and the renegotiation cycle starts in six weeks.</p>
<p>Which prompt change most improves the category's accuracy?</p>`,
    options: [
      `Tell the model to tag a clause as <code>auto_renewal</code> only when it is highly confident, so that borderline mutual-agreement and option clauses stay untagged instead of reaching the calendar.`,
      `Add several more examples of obvious auto-renewal clauses that use the word "renew", so the model sees more of the standard wording and recognizes the category more consistently across contracts.`,
      `Classify each clause three times and keep the <code>auto_renewal</code> tag only when at least two of the three runs agree, so that inconsistent tags on borderline clauses are filtered out.`,
      `Define the category: include terms that continue without action by either party, evergreen wording included; exclude mutual-agreement renewals and notice-based options, with boundary examples.`
    ],
    answer: [3],
    explanation: `Vague category definitions produce unreliable classification; explicit inclusion and exclusion criteria, with examples at the boundary, are what improve precision and recall. The justifications show the model keying on the word "renew", so the definition "clauses about automatic renewal" is doing what it says: tagging clauses about renewal. The errors sit at a boundary the definition never draws. The deciding question is whether the contract continues without anyone acting: evergreen month-to-month terms do, so they belong in the category, while mutual-agreement renewals and options that require notice do not. Stating those criteria and showing an example on each side of the line fixes both the false positives and the false negatives. A confidence instruction does not tell the model where the line is and still misses evergreen clauses. More obvious examples reinforce the keyword the model already overuses. Majority voting repeats the same misunderstanding three times. The file formats and the timeline are noise.`,
    rationales: [
      `A confidence instruction does not say where the boundary is, so the model stays unsure in the same places and still misses evergreen clauses that never say "renew".`,
      `More examples containing "renew" reinforce the keyword the model already overuses, so evergreen clauses stay missed and the customer options stay tagged.`,
      `Three runs with the same vague definition repeat the same misunderstanding, so voting mostly agrees on the wrong tags while tripling the cost.`,
      `Correct. The action test separates evergreen terms (include) from mutual-agreement and option renewals (exclude), and boundary examples show exactly where the line falls.`
    ],
    trap: `Confidence, more keyword examples or voting instead of explicit inclusion and exclusion criteria`,
    signals: `Decisive: errors run in both directions at the category's boundary, and the justifications show the model keying on the word "renew" because the definition gives no criteria. Noise: the Word and PDF formats and the six-week timeline.`
  },
  {
    id: 'e6-S6-06', scenario: 'S6', domain: 'D4', obj: 'O27', type: 'single', select: 1,
    stem: `<p>Rowan Expense, a corporate expense platform, extracts data from the receipts, invoices and credit notes that employees upload, about 60,000 documents a day. The extraction service runs on Claude Haiku 4.5 for cost and speed. Each request includes three tools, <code>extract_receipt</code>, <code>extract_invoice</code> and <code>extract_credit_note</code>, each with its own schema, and uses <code>tool_choice: {"type": "auto"}</code>. Uploads are not labeled by type, so the model must decide which schema fits.</p>
<p>About 3% of responses contain no tool call at all, only text such as "This looks like a credit note rather than an invoice. Would you like me to extract it?" The parser expects a tool_use block, so these responses crash the job and the documents wait for manual handling. When the model does call a tool, it picks the correct one 99.2% of the time. The system prompt already says "Always extract the document by calling one of the tools." The team also added a receipt-image deblurring step last month, and the finance team wants monthly accuracy reports.</p>
<p>Which change most reliably eliminates the text-only responses?</p>`,
    options: [
      `Set <code>tool_choice</code> to <code>{"type": "any"}</code>, so every response must call one of the three extraction tools while the model still chooses which schema fits the uploaded document.`,
      `Set <code>tool_choice</code> to <code>{"type": "tool", "name": "extract_invoice"}</code>, so every response calls the invoice tool and the parser always receives a tool_use block in one format.`,
      `Strengthen the system prompt with "You MUST call exactly one extraction tool and must never reply with text", repeated at the end of the prompt as well, so that the model always complies with it.`,
      `Add a fallback parser that searches text-only replies for the document type the model mentions, then re-sends the request with that document type named in the prompt.`
    ],
    answer: [0],
    explanation: `With <code>tool_choice</code> auto, the model may answer in text instead of calling a tool, which is what happens in 3% of responses. Setting it to any guarantees a call to one of the provided tools while leaving the choice of tool to the model, which fits a pipeline with several extraction schemas and documents of unknown type; selection is already 99.2% accurate. Forcing <code>extract_invoice</code> guarantees a call but sends receipts and credit notes into the wrong schema. Stronger wording is still a request the model can decline, and the prompt already contains one. A fallback parser adds a second request and more failure paths for a problem the API setting removes. On current docs: Haiku 4.5 still accepts any and forced tool choice, but Opus 5.5, Sonnet 5.5 and Fable 5.1 return HTTP 400 for them; on those models, use strict tool use or structured outputs with programmatic checks instead. The deblurring step and accuracy reports are noise.`,
    rationales: [
      `Correct. Tool choice any guarantees a tool call on every response while the model keeps choosing among the three schemas, which it already does correctly 99.2% of the time.`,
      `Forcing one named tool guarantees a call but pushes every receipt and credit note through the invoice schema, trading crashes for wrong extractions.`,
      `The prompt already asks for a tool call; stronger wording is still probabilistic, so some responses keep arriving as text and crashing the parser.`,
      `A fallback adds a second request and new failure paths to recover from replies that the <code>tool_choice</code> setting can prevent in the first place.`
    ],
    trap: `Prompt wording or the wrong forced tool instead of tool_choice any`,
    signals: `Decisive: <code>tool_choice</code> is auto, 3% of responses are text only, documents are unlabeled across three schemas, and the pipeline runs on Haiku 4.5, which accepts any. Noise: the new deblurring step and the monthly accuracy reports.`
  },
  {
    id: 'e6-S6-07', scenario: 'S6', domain: 'D4', obj: 'X08', type: 'single', select: 1,
    stem: `<p>Laurel Fleet Services, a vehicle-maintenance company, extracts supplier invoices into its accounts-payable system. After extraction a validator checks each record, and every failure is retried three times with the same prompt and document. Last month 1,840 of 52,000 invoices failed validation. An analysis of the failures:</p>
<pre>failure type                                  share   pass after 3 retries
invoice_date not ISO 8601 / total as string    38%    22%
line-item sum differs from stated total        22%    18%
po_number missing                              25%     0%
other                                          15%    31%</pre>
<p>For the missing PO numbers, reviewers found that these suppliers never print the PO on the invoice; it appears only on the separate purchase-order document the buyer issued, which the pipeline does not send to the model. Retries cost about $1,900 last month and delay payment runs by a day. The AP team has also started a project to consolidate duplicate supplier records, and invoice volume grows about 3% a month.</p>
<p>Which change to the retry strategy is most effective?</p>`,
    options: [
      `Raise the retry limit from three to five attempts for every validation failure, so that more of the failed invoices eventually pass without any manual review by the accounts-payable team.`,
      `Retry failed invoices with a larger model instead of the same one, so that the more capable model resolves the format errors, the mismatched sums and the missing PO numbers.`,
      `Retry format and sum failures with the document, the failed extraction and the specific validation errors, and stop retrying missing PO numbers, routing them with a reason code.`,
      `Fill in "N/A" for any missing <code>po_number</code> before validation runs, so that those invoices pass the validator immediately and no longer consume any retries at all.`
    ],
    answer: [2],
    explanation: `Retries help when the model can fix its own output and are useless when the information is not in the source. Format errors and mismatched sums are fixable: a follow-up that includes the original document, the failed extraction and the specific validation errors (for example, "invoice_date must be ISO 8601; line items sum to 1,204.50 but the stated total is 1,240.50") guides the model to the correction, unlike the blind retries used today. Missing PO numbers are different: the number exists only on a purchase-order document the model never sees, so no retry can find it, as the 0% pass rate confirms. Those invoices should stop retrying at once and go to a review queue with a reason code, or the pipeline should supply the PO document. More retries or a larger model spend more on the same blind attempts. Writing "N/A" makes invalid records pass and hides a real gap from AP. The supplier consolidation and the growth rate are noise.`,
    rationales: [
      `Two more blind retries repeat the same prompt, add cost, and still cannot produce PO numbers that exist only on a document the model never receives.`,
      `A larger model still cannot read a PO number that is not in the invoice, and specific error feedback, not model size, is what fixes the format and sum failures.`,
      `Correct. Specific validation errors make retries effective for fixable failures, while missing PO numbers stop retrying at once and go to review with a clear reason.`,
      `Placeholder values let invalid records pass validation, so AP would pay invoices without PO matching and lose track of which ones need the purchase order.`
    ],
    trap: `Blind or bigger retries when the information is absent from the source`,
    signals: `Decisive: missing PO numbers pass 0% of retries because the PO appears only on a document the model never sees, while format and sum failures are fixable with specific feedback. Noise: the supplier-consolidation project and the 3% monthly growth.`
  },
  {
    id: 'e6-S6-08', scenario: 'S6', domain: 'D5', obj: 'O22', type: 'single', select: 1,
    stem: `<p>Oakhurst Manufacturing extracts data from supplier delivery notes to reconcile deliveries against purchase orders before payment. The pipeline returns each field with a model confidence score, and today every note goes to a clerk for review. On a labeled sample of 2,000 notes, field-level accuracy is 97% overall, and the finance director proposes auto-approving any note whose fields all have a confidence of 0.9 or higher, which would remove about 80% of the clerks' workload.</p>
<p>A breakdown of the same sample tells a different story. Typed delivery notes, 92% of volume, reach 98% accuracy on every field. Handwritten notes, 8% of volume and mostly from small regional suppliers, reach 78% accuracy on the quantity field, and many of the wrong quantities carry confidence above 0.9. Quantity errors are the costliest kind, because they cause over- or under-payment. The labeled sample was collected last quarter across all suppliers, and the reconciliation team is switching to a new ERP module in the autumn.</p>
<p>What should the team do before reducing human review?</p>`,
    options: [
      `Approve the finance director's plan as proposed, because 97% overall accuracy meets the target, and revisit the results after a quarter to see whether any supplier group needs adjustments.`,
      `Measure accuracy by document type and field, keep human review for weak segments such as handwritten quantities, and set any auto-approval thresholds per segment from the labeled data.`,
      `Replace review of every note with review of a random 5% sample across all delivery notes, so the clerks' workload falls immediately while the team still tracks overall accuracy.`,
      `Route notes to review based on how certain the model sounds in its free-text explanation, sending notes with hedging words such as "appears" or "possibly" to a clerk for checking.`
    ],
    answer: [1],
    explanation: `Aggregate accuracy can hide weak segments, so accuracy should be validated by document type and field before high-confidence extractions are automated. The 97% figure blends typed notes at 98% with handwritten notes at 78% on quantity, the costliest field, and because many wrong handwritten quantities carry confidence above 0.9, one global threshold would auto-approve exactly the errors that cause wrong payments. Segment-level analysis shows where automation is safe (typed notes) and where review must stay (handwritten quantities), and calibrating thresholds per segment on labeled data keeps an overconfident segment from slipping through. Approving the plan and reviewing later lets a quarter of payment errors through first. A random 5% sample spreads scarce review evenly instead of concentrating it on the risky segment. Hedging words in free text are self-reported confidence and a poor routing signal. The sample's timing and the ERP switch are noise.`,
    rationales: [
      `The aggregate hides that handwritten quantities are only 78% accurate, often with confidence above 0.9, so the plan would auto-approve the costliest errors for a full quarter.`,
      `Correct. Segmenting by document type and field shows typed notes can be automated while handwritten quantities need review, with thresholds calibrated per segment.`,
      `A uniform random sample spreads scarce review across mostly accurate typed notes and lets most handwritten quantity errors through unreviewed.`,
      `Hedging language is self-reported confidence, which is poorly calibrated; many wrong quantities already come with high confidence and no hedging at all.`
    ],
    trap: `Aggregate accuracy and a uniform threshold masking a weak segment`,
    signals: `Decisive: 97% overall hides 78% accuracy on handwritten quantities, the costliest field, and many of those errors carry confidence above 0.9. Noise: last quarter's sample timing and the autumn ERP module switch.`
  },
]);
