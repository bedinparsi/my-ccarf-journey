/* Architect Handbook · Part 4 (b): validation/retry/feedback loops (4.4), Message Batches strategies (4.5), multi-instance and multi-pass review (4.6). */
(function () {
  var H = CCAR.hb, D = H.D;

  /* ------------------------------------------------------------------ 4.4 */
  CCAR.lessons.push({
    id: 'hb-44-validation-retry', track: 'handbook', part: 'P4', num: '4.4', order: 404, domain: 'D4',
    objs: ['X08', 'O29'], ts: ['4.4'], minutes: 30,
    title: 'Validation, retry and feedback loops for extraction quality',
    summary: 'Schema validation, semantic validation in code, retry with specific error feedback, knowing when a retry cannot help, self-correcting fields (calculated_total, conflict_detected), detected_pattern for dismissal analysis, and retry budgets with human routing.',
    body: function () {
      return `
<p>Structured outputs guarantee the <b>shape</b> of an extraction. They do not guarantee that the numbers add up, that a value landed in the right field, or that a value exists in the document at all. Production extraction therefore needs a loop around the model: validate in code, feed specific errors back when a retry can fix them, and route to a human when it cannot. The exam probes three things here: what goes into a retry request, which failures a retry can and cannot fix, and which schema fields make errors detectable (and dismissals analyzable) in the first place.</p>

<h3>The pipeline</h3>
${D({ w: 760, h: 280, title: 'Extraction quality loop',
  nodes: [
    { id: 'doc', x: 15, y: 95, w: 110, h: 54, label: 'Source doc', sub: 'PDF, scan, email', kind: 'store' },
    { id: 'ext', x: 150, y: 95, w: 130, h: 54, label: 'Extract', sub: 'tool use + JSON schema', kind: 'agent' },
    { id: 'sch', x: 305, y: 95, w: 130, h: 54, label: 'Schema validate', sub: 'types, required, enums', kind: 'tool' },
    { id: 'sem', x: 460, y: 95, w: 135, h: 54, label: 'Semantic validate', sub: 'sums, formats, placement', kind: 'tool' },
    { id: 'ok', x: 625, y: 20, w: 120, h: 50, label: 'Accept', sub: 'downstream system', kind: 'good' },
    { id: 'hum', x: 625, y: 185, w: 120, h: 54, label: 'Human queue', sub: 'conflict, absent, budget', kind: 'human' },
    { id: 'rt', x: 230, y: 210, w: 300, h: 54, label: 'Retry with feedback', sub: 'doc + failed output + specific errors', kind: 'sub' }
  ],
  edges: [
    { from: 'doc', to: 'ext' }, { from: 'ext', to: 'sch' }, { from: 'sch', to: 'sem', label: 'valid' },
    { from: 'sem', to: 'ok', label: 'pass' }, { from: 'sem', to: 'hum', label: 'not retryable', dashed: true },
    { from: 'sem', to: 'rt', label: 'retryable' }, { from: 'rt', to: 'ext', label: 'attempt n+1' }
  ],
  caption: 'Every failure is classified before anything happens next. Retryable errors (format, structure, placement, arithmetic) go back with feedback inside a small budget. Unretryable ones (value absent from the source, genuinely conflicting source data) go straight to a human with the reason attached.' })}

<h3>Syntax errors vs semantic errors</h3>
${H.table(['Error class', 'Examples', 'Eliminated by tool use / strict schema?', 'How you catch it'], [
  ['<b>Schema syntax</b>', 'Invalid JSON, missing required field, string where a number belongs, value outside an enum', 'Yes. Tool use with a JSON schema (plus <code>strict: true</code> or JSON outputs via <code>output_config.format</code>) makes these disappear', 'Nothing left to catch, but keep a validator anyway for constraints the strict mode does not enforce (min/max, minLength): SDKs strip those and validate afterwards'],
  ['<b>Semantic</b>', 'Line items do not sum to the total; a date read as 03/04 in the wrong locale; the tax amount placed in <code>shipping</code>; a plausible but fabricated PO number', 'No. The output is perfectly schema-valid', 'Code checks: arithmetic, cross-field rules, format rules, lookups against reference data, and self-correcting fields the model fills in'],
  ['<b>Absence</b>', 'The payment terms live in a master agreement that was not provided', 'No, and a required non-nullable field makes it worse (it forces a guess)', 'Nullable fields plus a <code>missing_reason</code>; route, do not retry']
])}
${H.box('rule', 'The principle:', 'tool use moves the problem from "is it JSON?" to "is it right?". The second question is answered by your code, never by the schema alone.')}

<h3>Retry with error feedback</h3>
<p>A retry that simply repeats the request tends to reproduce the same mistake. The retry that works is a <b>follow-up request containing three things</b>: the original document, the failed extraction, and the specific validation errors. The errors should read like a precise code review: which field, what was wrong, what rule applies. Generic "that was invalid, try again" wastes the attempt.</p>
<pre class="code">from datetime import date
from pydantic import BaseModel, ValidationError
import anthropic, json

client = anthropic.Anthropic()

class LineItem(BaseModel):
    description: str
    amount: float

class Invoice(BaseModel):
    invoice_number: str
    invoice_date: str | None            # ISO 8601, or null if the document has no date
    line_items: list[LineItem]
    stated_total: float | None          # the total PRINTED on the document
    calculated_total: float             # the model's own sum of line_items
    conflict_detected: bool             # true if the source itself is inconsistent
    missing_reason: str | None = None   # "not_in_document" | "external_document" | null

def semantic_errors(inv: Invoice) -&gt; list[str]:
    errs, s = [], round(sum(li.amount for li in inv.line_items), 2)
    if abs(s - inv.calculated_total) &gt; 0.01:
        errs.append(f"calculated_total is {inv.calculated_total} but line_items sum to {s}. "
                    "Recompute calculated_total from line_items.")
    if inv.stated_total is not None and abs(s - inv.stated_total) &gt; 0.01 and not inv.conflict_detected:
        errs.append(f"stated_total {inv.stated_total} differs from the line-item sum {s}. Re-read the "
                    "line items (look for missed surcharges or credits). If the document itself is "
                    "inconsistent, keep both values and set conflict_detected to true.")
    if inv.invoice_date:
        try: date.fromisoformat(inv.invoice_date)
        except ValueError:
            errs.append(f"invoice_date '{inv.invoice_date}' is not ISO 8601 (YYYY-MM-DD).")
    return errs

def retry_prompt(doc: str, failed: dict, errs: list[str]) -&gt; str:
    numbered = "\\n".join(f"{i}. {e}" for i, e in enumerate(errs, 1))
    return (f"&lt;document&gt;\\n{doc}\\n&lt;/document&gt;\\n"
            f"&lt;previous_extraction&gt;\\n{json.dumps(failed, indent=2)}\\n&lt;/previous_extraction&gt;\\n"
            f"&lt;validation_errors&gt;\\n{numbered}\\n&lt;/validation_errors&gt;\\n"
            "Fix only the fields named in the errors and keep every other value. If a value is not "
            "present in the document, set it to null and set missing_reason. Do not guess.")

def extract(doc: str, max_attempts: int = 3):
    prompt = first_prompt(doc)                  # instructions + normalization rules + few-shot
    for attempt in range(1, max_attempts + 1):
        resp = client.messages.create(model=MODEL, max_tokens=4096,
                                      tools=[INVOICE_TOOL], messages=[{"role": "user", "content": prompt}])
        failed = next(b.input for b in resp.content if b.type == "tool_use")
        try:
            inv = Invoice.model_validate(failed)
            errs = semantic_errors(inv)
        except ValidationError as e:
            errs = [f"{'.'.join(map(str, x['loc']))}: {x['msg']}" for x in e.errors()]
            inv = None
        log_attempt(doc_id(doc), attempt, classify(errs))   # error classes, not just pass/fail
        if not errs:
            return route_if_flagged(inv)          # conflict_detected / missing_reason still go to review
        if not any(is_retryable(e) for e in errs):
            break
        prompt = retry_prompt(doc, failed, errs)
    return send_to_human(doc, failed, errs)</pre>
<p class="small muted">Outline only: <code>MODEL</code>, <code>INVOICE_TOOL</code>, <code>first_prompt</code>, <code>classify</code> and the routing helpers are yours. An equivalent in-conversation variant returns the errors as a <code>tool_result</code> with <code>is_error: true</code> for the extraction tool call, so the document and the failed input are already in the history.</p>

${H.table(['Retry message element', 'Why it is there'], [
  ['Original document', 'The model must re-read the source, not rationalize its previous answer. Without it, a fresh request cannot correct anything.'],
  ['Failed extraction', 'Lets the model make a targeted fix and keep correct fields stable. Reduces churn in fields that were right.'],
  ['Specific errors (field, observed value, rule, hint)', 'Points attention at the exact defect. "Totals do not match" is weaker than "line_items sum to 1,240.00, calculated_total is 1,420.00".'],
  ['An explicit null path', 'Stops the model from inventing a value just to satisfy the validator on the retry.']
])}

<h3>When retries help and when they cannot</h3>
${H.table(['Failure', 'Retryable?', 'Why', 'Action'], [
  ['Date in wrong format, currency symbol left in a number, unit not normalized', 'Yes', 'The information is present; only the representation is wrong', 'Retry with the rule quoted (ISO 8601, vendor locale)'],
  ['Structural output error: nested array flattened, list items merged', 'Yes', 'The model can re-read and restructure', 'Retry with the expected structure named'],
  ['Wrong field placement: tax in <code>shipping</code>, buyer and seller swapped', 'Yes', 'Evidence exists in the document to place it correctly', 'Retry naming the field and the label to look for'],
  ['Arithmetic slip: <code>calculated_total</code> does not equal the sum', 'Yes', 'Pure recomputation', 'Retry with both numbers'],
  ['Missed line item (a surcharge in a footnote)', 'Usually', 'It is in the document, attention missed it', 'Retry pointing at the gap between sum and stated total'],
  ['Value exists only in an external document not provided ("pricing per PO 4471", "terms per master agreement")', '<b>No</b>', 'No amount of re-reading produces information that is not in the input', 'Null + <code>missing_reason: "external_document"</code>; route, or fetch the external document and run a new extraction with it'],
  ['Source is genuinely inconsistent (printed total ≠ sum of printed lines)', '<b>No</b>', 'The extraction is correct; the document is wrong', 'Keep both values, <code>conflict_detected: true</code>, route to a human'],
  ['Illegible scan, cropped page', '<b>No</b> (not by prompting)', 'Input quality problem', 'Re-scan or human entry'],
  ['<code>stop_reason: "max_tokens"</code> truncated the output', '<b>No</b> (not as the same request)', 'Deterministic for the same request', 'Split into smaller scoped calls and merge (4.3, 4.6)']
])}
${H.box('decision', 'Decision rule:', 'before retrying, ask "is the missing or wrong information actually in what I am sending?" If yes, retry with specific feedback. If no, a retry only burns tokens and invites fabrication; change the input or route to a human.')}

<h3>Self-correcting fields: make errors visible in the output</h3>
<p>The schema can ask the model to produce evidence your code can check. Two patterns from the exam guide:</p>
${H.table(['Field', 'What the model fills in', 'What your code does'], [
  ['<code>stated_total</code> + <code>calculated_total</code>', 'The total as printed, and its own sum of the extracted line items', 'Recompute the sum. If <code>calculated_total</code> ≠ code sum → model error, retryable. If code sum = <code>calculated_total</code> but ≠ <code>stated_total</code> → either a missed line (retry once, pointing at the gap) or a source conflict'],
  ['<code>conflict_detected</code> (boolean) + a short <code>conflict_note</code>', 'True when the source contradicts itself: two different due dates, totals that disagree, two bank accounts', 'Route to a human with both values preserved. Never "resolve" the conflict silently by picking one'],
  ['Nullable field + <code>missing_reason</code> enum', 'Why a value is empty: <code>not_in_document</code>, <code>external_document</code>, <code>illegible</code>', 'Skip retries for these, report coverage by reason']
])}
${H.box('real', 'Real-world note:', 'keep the raw source string next to each normalized value (for example <code>invoice_date_raw: "03/04/26"</code>). It makes semantic validation explainable to reviewers and lets you re-normalize later without re-extracting.')}

<h3>Feedback loops beyond a single document: detected_pattern</h3>
<p>The same idea applies to review and classification systems. When developers dismiss automated findings, you want to know <b>which kind</b> of finding gets dismissed. Add a <code>detected_pattern</code> field naming the code construct that triggered each finding, then aggregate dismissals by pattern.</p>
<pre class="code">{
  "finding_id": "f-0192",
  "file": "src/inventory/sync.py",
  "line": 88,
  "category": "error_handling",
  "severity": "medium",
  "detected_pattern": "broad_except_with_logging",
  "explanation": "except Exception swallows StockLevelError; the caller never sees the failure.",
  "developer_action": "dismissed"          // filled in later from the PR tool
}</pre>
${H.table(['detected_pattern', 'Findings', 'Dismissed', 'Reading', 'Fix'], [
  ['<code>broad_except_with_logging</code>', '140', '82%', 'Team convention: top-level handlers log and re-raise', 'Add the accepted pattern to review criteria (persistent context) with an example'],
  ['<code>sql_string_concat</code>', '35', '6%', 'High-value, trusted', 'Keep; use as a positive few-shot example'],
  ['<code>missing_docstring</code>', '410', '95%', 'Noise eroding trust in everything else', 'Disable the category while its criteria are rewritten']
])}
<p>Without <code>detected_pattern</code> you only see "38% of findings dismissed", which gives no lever. With it, the fix is targeted: explicit exclusion criteria, a new few-shot example, or temporarily disabling one noisy category (4.1, 4.2).</p>

<h3>Retry budgets, routing and logging</h3>
<ul>
<li><b>Small fixed budget.</b> One or two feedback retries catch most retryable errors; beyond that, returns diminish and the risk of the model bending values to pass the validator grows. Make the budget a config value and measure the success rate per attempt number.</li>
<li><b>Route with context.</b> The human sees the document, the last extraction, the error list and the reason (budget spent, conflict, absent value), not just "failed".</li>
<li><b>Log error classes, not booleans.</b> Count schema, format, placement, arithmetic, absent, conflict and truncation separately, per document type and per field. A spike in one class after a prompt change is a regression signal; a persistent class in one document type means a missing few-shot example or normalization rule.</li>
<li><b>Measure first-pass success.</b> Retries hide prompt weaknesses and cost money. Track first-pass validity alongside final validity.</li>
<li><b>Idempotent writes.</b> Only the accepted extraction is written downstream; attempts are logged, not loaded.</li></ul>
${H.box('exam', 'Agent SDK and current docs:', 'when an Agent SDK run is asked for structured output and validation keeps failing, the run ends with the ResultMessage subtype <code>error_max_structured_output_retries</code> (no <code>result</code>). Treat it like an exhausted retry budget: log and route, do not wrap it in another blind loop. The exam guide says tool use eliminates syntax errors; current docs reach the same guarantee with strict tool use or JSON outputs. On Opus 5.5, Sonnet 5.5 and Fable 5.1 forced <code>tool_choice</code> returns 400, so use <code>auto</code> with strict tool use; exam answers may still show <code>any</code> or a forced tool.')}

<h3>Design decisions</h3>
${H.table(['If the situation is', 'Choose', 'Because', 'You give up'], [
  ['Output is valid JSON but numbers do not reconcile', 'Semantic validators in code + <code>calculated_total</code> field + feedback retry', 'Schemas cannot express cross-field arithmetic', 'Extra tokens per document for the check field'],
  ['Values are absent in some documents', 'Nullable fields + <code>missing_reason</code>, no retry', 'Required fields force fabrication; retries cannot create information', 'Some records need human completion'],
  ['Source documents contradict themselves', '<code>conflict_detected</code> + both values + human route', 'Picking one silently corrupts data', 'Review workload'],
  ['A specific format keeps failing across documents', 'Fix the first-pass prompt (normalization rule or few-shot example)', 'Cheaper than retrying every document forever', 'Prompt iteration time'],
  ['Reviewers dismiss many findings', '<code>detected_pattern</code> + dismissal analytics', 'Turns noise into targeted criteria changes', 'A feedback integration with the PR tool']
])}

${H.box('trap', 'Traps:', '<b>"Retry until it validates"</b>: unbounded loops cost money and pressure the model to invent values. <b>"Retry with the same prompt"</b>: no new information, same answer. <b>"Retry when the value is in another document"</b>: the input lacks it. <b>"Make the field required so it is always filled"</b>: guarantees fabrication. <b>"Strict schema means correct data"</b>: it means valid shape. <b>"Pick the stated total when they disagree"</b>: hides a real conflict. <b>"Raise max_tokens and retry"</b> for truncation: split the work instead.')}

<h3>Worked scenario</h3>
<p>An accounts-payable pipeline extracts invoices with a strict tool schema. Validation shows three failure groups over a week: 6% of documents have <code>calculated_total</code> not matching the code sum, 3% have dates like "03.04.26" left unnormalized, and 2% have <code>payment_terms</code> empty with the note "Terms per framework agreement FA-2021-07". The current code retries every failure three times with the message "Validation failed, please try again", and the 2% group fails all three attempts every time.</p>
<p><b>Reasoning.</b> The first two groups are retryable: the information is in the document. They fail repeatedly because the retry message is generic. The third group is not retryable: the terms live in an external agreement that was never provided, so no retry can succeed, and repeated pressure risks an invented value.</p>
<p><b>Answer.</b> Replace the generic retry with a follow-up containing the document, the failed extraction and the specific errors ("line_items sum to 1,240.00; calculated_total is 1,420.00", "invoice_date must be ISO 8601; vendor country DE, day-first"). Add the date normalization rule to the first-pass prompt. Make <code>payment_terms</code> nullable with <code>missing_reason: "external_document"</code> and route those invoices (or attach the framework agreement and extract again). Cap retries at two and log error classes per vendor.</p>

${H.check([
  ['A schema-valid extraction has <code>stated_total: 980.00</code>, <code>calculated_total: 980.00</code>, but your code sums the line items to 930.00. Retry or route?', 'Retry. The model mis-summed or duplicated a value (its <code>calculated_total</code> disagrees with the actual sum), which is fixable from the document. Send the document, the extraction and the specific numbers. If after correction the sum still differs from the printed total, that is a source conflict: set <code>conflict_detected</code> and route.'],
  ['Why include the failed extraction in the retry, not just the document and the errors?', 'It lets the model fix the named fields while keeping the correct ones stable, and it shows exactly what it produced. A fresh extraction without it may introduce new errors in fields that were right.'],
  ['A contract extraction keeps returning an invented renewal date on retry. The contract says "renewal terms as per Schedule C", which is not attached. What went wrong in the design?', 'The information is absent from the input, so retries cannot help, and a required field plus repeated retries pressures the model to fabricate. Make the field nullable with a <code>missing_reason</code>, skip retries for that class, and route or supply Schedule C.'],
  ['Developers dismiss 40% of automated review findings. What single schema change enables a systematic fix?', 'Add <code>detected_pattern</code> to each finding and capture the dismissal. Aggregating dismissals by pattern shows which constructs produce false positives, so you can add exclusion criteria or examples for those patterns instead of guessing.'],
  ['Your team argues strict tool use makes the validator unnecessary. Respond.', 'Strict tool use removes syntax errors (invalid JSON, missing required fields, wrong types). It does not detect values that do not sum, wrong field placement or fabricated values, and some constraints (min/max) are not enforced by the strict mode. Semantic validation still belongs in code.'],
  ['An Agent SDK extraction job ends with subtype <code>error_max_structured_output_retries</code>. What should the orchestrating code do?', 'Treat it as a spent retry budget: no <code>result</code> is available, so log the error class and route the document to review (or fix the prompt or schema if it recurs). Do not restart the same run in a loop.']
])}
${H.src([['Structured outputs', 'https://platform.claude.com/docs/en/build-with-claude/structured-outputs'], ['Define tools / strict tool use', 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools'], ['Agent SDK: agent loop and result messages', 'https://code.claude.com/docs/en/agent-sdk/agent-loop'], ['Prompting best practices', 'https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices']])}`;
    }
  });

  /* ------------------------------------------------------------------ 4.5 */
  CCAR.lessons.push({
    id: 'hb-45-batch', track: 'handbook', part: 'P4', num: '4.5', order: 405, domain: 'D4',
    objs: ['O23'], ts: ['4.5'], minutes: 30,
    title: 'Batch processing strategies with the Message Batches API',
    summary: 'Batch mechanics and limits, matching workloads to sync vs batch, SLA submission math, failure handling by custom_id, sample-set prompt refinement, caching on top of batch, and multi-step pipelines across batches.',
    body: function () {
      return `
<p>The Message Batches API trades latency for price: every token costs half, and in exchange you get no latency guarantee. Chapter 0.2 covered the basic sync-vs-batch comparison. This chapter is about <b>designing</b> with batches: which workloads qualify, how often to submit to meet an SLA, how to handle partial failure, how to get a high first-pass success rate, and how to run multi-step pipelines when a single batch request cannot run your tools. The exam tests the latency match (sample question 11), the SLA arithmetic, <code>custom_id</code> correlation and the no-client-tools limitation.</p>

<h3>Mechanics and limits</h3>
${H.table(['Property', 'Value', 'Design consequence'], [
  ['Price', '50% of standard for input and output tokens', 'Stacks with prompt caching discounts'],
  ['Processing window', 'Up to 24 hours; most batches finish within 1 hour', 'Plan capacity on the <b>24h worst case</b>, never on the typical case'],
  ['Latency SLA', 'None', 'Unsuitable when anyone or anything is blocked waiting'],
  ['Size limits', '100,000 requests or 256 MB per batch, whichever comes first', 'Split large datasets into several batches'],
  ['<code>custom_id</code>', '1 to 64 characters, letters, digits, <code>_</code> and <code>-</code> only', 'Use meaningful, unique, stable IDs (for example <code>inv-2026-09-000123</code>); no dots, colons or slashes'],
  ['Results', '.jsonl, <b>not in submission order</b>, available for 29 days', 'Always map results by <code>custom_id</code>; download and persist within 29 days'],
  ['Result types', '<code>succeeded</code>, <code>errored</code>, <code>canceled</code>, <code>expired</code>', 'Only <code>succeeded</code> is billed; the other three are resubmission candidates'],
  ['Not supported', '<code>stream</code>, fast mode speed, <code>max_tokens: 0</code>', 'No cache pre-warm request inside a batch; results arrive whole'],
  ['Tools', 'Server tools run (Anthropic executes them; a turn may return <code>pause_turn</code>). Client tools cannot round-trip', 'Your code cannot execute a tool mid-request and hand the result back']
])}

<h3>No multi-turn tool calling inside one request</h3>
<p>In a synchronous loop, <code>stop_reason: "tool_use"</code> hands control to your code, you run the tool, and you call the API again with the <code>tool_result</code>. A batch request is one self-contained Messages call processed on Anthropic's side, so there is no point where your code can run a client tool and continue the same request. If a batch request produces a <code>tool_use</code> block for one of your tools, that is where the request ends. Server tools such as web search are different: they execute server-side within the request.</p>
${H.box('rule', 'Design consequence:', 'batch work must be single-shot per request (classify, extract, summarize, generate from provided inputs). If a workflow needs your tools between steps, break it into <b>several batches</b> and run the "tool" step in your own code between them, or keep that workflow synchronous.')}

<h3>Workload matching</h3>
${H.table(['Workload', 'API', 'Why'], [
  ['Blocking pre-merge check: developers wait to merge', '<b>Synchronous</b>', 'Someone is blocked; "usually under an hour" is not a guarantee'],
  ['Technical debt report generated overnight, read next morning', '<b>Batch</b>', 'Latency-tolerant, runs while nobody waits'],
  ['Weekly security or compliance audit of all repositories', '<b>Batch</b>', 'Large, periodic, no one blocked'],
  ['Nightly test generation for changed modules', '<b>Batch</b>', 'Output consumed the next day'],
  ['Backfill: re-extract 2 million archived documents', '<b>Batch</b> (split into many batches)', 'Cost dominates; respect 100,000 / 256 MB per batch'],
  ['Live customer support, in-app answers', '<b>Synchronous</b>', 'Interactive latency'],
  ['Agent that runs tests, reads failures and edits code', '<b>Synchronous</b>', 'Needs client tool round trips'],
  ['Document intake with a 30-hour contractual SLA', '<b>Batch</b> with a submission cadence sized to the SLA', 'Latency-tolerant within a bound you can calculate']
])}

<h3>SLA math</h3>
<p>A document can arrive just after a submission, so it waits almost a full submission interval before it is even sent. Then the batch may take up to the full processing window. Leave a buffer for resubmitting failures and for your own post-processing.</p>
<pre class="code">worst-case latency = submission interval (I) + processing window (24h) + buffer (B)  &lt;=  SLA (S)
                  =&gt;  I  &lt;=  S - 24h - B</pre>
${H.table(['SLA (S)', 'Buffer (B)', 'Max interval (I)', 'Choice'], [
  ['30h', '0h', '6h', 'Mathematically fits, but any failure breaches the SLA'],
  ['30h', '2h', '4h', '<b>The exam guide answer: 4-hour windows</b> (4 + 24 = 28h, 2h left for failures)'],
  ['36h', '4h', '8h', 'Three submissions per day'],
  ['48h', '6h', '18h', 'One daily submission comfortably fits'],
  ['24h', 'any', '&lt; 0', 'Batch cannot guarantee this SLA; use synchronous calls (or batch with a sync fallback that you pay for)']
])}
${H.box('real', 'Real-world note on the buffer:', 'a resubmitted request gets a new window of up to 24 hours, so a 2-hour buffer does not cover a worst-case resubmission through the batch API. For hard SLAs, reprocess the (few) failed <code>custom_id</code>s synchronously inside the buffer. This is different from sample question 11 option D: there the whole workflow was blocking, so batch was the wrong tool from the start.')}

<h3>Code outline: create, poll, collect, map by custom_id</h3>
<pre class="code">import anthropic, time

client = anthropic.Anthropic()

requests = [{
    "custom_id": f"inv-{doc.id}",                    # meaningful, unique, ^[a-zA-Z0-9_-]{1,64}$
    "params": {
        "model": MODEL, "max_tokens": 2048,
        "system": [{"type": "text", "text": SHARED_INSTRUCTIONS,     # identical across requests
                    "cache_control": {"type": "ephemeral"}}],
        "tools": [INVOICE_TOOL],
        "messages": [{"role": "user", "content": doc.text}],
    },
} for doc in docs]                                   # split if &gt; 100,000 requests or 256 MB

batch = client.messages.batches.create(requests=requests)
save_batch_id(batch.id)                              # persist: the job may outlive this process

while client.messages.batches.retrieve(batch.id).processing_status != "ended":
    time.sleep(60)                                   # poll; no streaming, no callback needed

by_id, retry = {}, []
for r in client.messages.batches.results(batch.id):  # .jsonl, unordered
    if r.result.type == "succeeded":
        by_id[r.custom_id] = r.result.message        # then validate as in 4.4
    else:                                            # errored | canceled | expired (not billed)
        retry.append((r.custom_id, r.result.type))
persist(by_id)                                       # results are kept for 29 days only</pre>
<p class="small muted">Outline: <code>MODEL</code>, <code>INVOICE_TOOL</code> and the persistence helpers are yours. Dry-run one request shape through the synchronous Messages API before submitting thousands.</p>

<h3>Handling failures</h3>
${H.table(['Result', 'Typical cause', 'Resubmit how'], [
  ['<code>errored</code>: request invalid', 'Malformed params, document too large for the context window', 'Fix the request. For oversized documents, <b>chunk</b> them into several requests (<code>inv-000123-p1</code>, <code>-p2</code>) and merge the results'],
  ['<code>errored</code>: server-side', 'Transient failure', 'Resubmit unchanged in the next batch'],
  ['<code>expired</code>', 'Not processed within 24h', 'Resubmit; consider smaller batches or a sync path if the SLA is tight'],
  ['<code>canceled</code>', 'You canceled the batch', 'Resubmit only if still needed'],
  ['<code>succeeded</code> but fails validation (4.4)', 'Semantic error in a schema-valid output', 'Build a retry request with document + failed extraction + errors; submit in the next batch or synchronously']
])}
${H.box('rule', 'Resubmit only what failed:', 'collect the failed <code>custom_id</code>s, apply the fix that matches the failure (chunking, corrected params, feedback prompt) and submit just those. Re-running the whole batch doubles cost and can overwrite good results.')}

<h3>Refine the prompt on a sample first</h3>
<ol class="steps">
<li>Pick a stratified sample (every document type, vendor locale and edge case you know of; tens to a few hundred items).</li>
<li>Run it synchronously (fast iteration) and validate every output with the full semantic validator.</li>
<li>Fix the prompt: normalization rules, few-shot examples for failing layouts, nullable fields for absent data.</li>
<li>Repeat until first-pass success on the sample meets your target, then submit the full volume.</li></ol>
<p>Every percentage point of first-pass failure on 100,000 documents is 1,000 resubmissions, each possibly another 24-hour cycle. Sample refinement is the cheapest reliability work in a batch design.</p>

<h3>Caching on top of batch</h3>
<ul>
<li>Batch and caching discounts <b>stack</b>. Put the shared prefix (tools, system instructions, few-shot examples) first and identical across every request, with the breakpoint on its last block.</li>
<li>Cache hits in batches are <b>best effort</b> (roughly 30 to 98%), because requests are processed in an order and timing you do not control. Budget on the pessimistic end.</li>
<li>Because processing may spread over longer than 5 minutes, the 1-hour cache TTL can be worth its higher write price for big shared prefixes.</li>
<li><code>max_tokens: 0</code> pre-warming is not supported inside a batch.</li></ul>

<h3>Multi-step pipelines across batches</h3>
${D({ w: 760, h: 220, title: 'Each step is its own batch, correlated by custom_id',
  nodes: [
    { id: 'b1', x: 20, y: 70, w: 150, h: 60, label: 'Batch 1: extract', sub: 'custom_id = doc-000123', kind: 'agent' },
    { id: 'c1', x: 205, y: 70, w: 150, h: 60, label: 'Your code', sub: 'validate, run tools, lookups', kind: 'tool' },
    { id: 'b2', x: 390, y: 70, w: 150, h: 60, label: 'Batch 2: analyze', sub: 'same custom_id + step', kind: 'agent' },
    { id: 'c2', x: 575, y: 70, w: 165, h: 60, label: 'Join + report', sub: 'map all steps by custom_id', kind: 'good' },
    { id: 'f', x: 205, y: 160, w: 150, h: 46, label: 'Failed ids', sub: 'fix, resubmit only these', kind: 'bad' }
  ],
  edges: [{ from: 'b1', to: 'c1' }, { from: 'c1', to: 'b2' }, { from: 'b2', to: 'c2' }, { from: 'c1', to: 'f', dashed: true }],
  caption: 'Client tool work (database lookups, fetching a referenced document) happens in your code between batches. Each step adds up to 24 hours to the worst case, so multi-step batch pipelines need the SLA math per step.' })}
<ul>
<li>Derive IDs per step from a stable document key (<code>doc-000123-s1</code>, <code>doc-000123-s2</code>) so every stage joins cleanly.</li>
<li>Only feed validated step-1 outputs into step 2; route the rest.</li>
<li>Worst-case latency for N batch steps is roughly N × 24h plus intervals and buffers.</li></ul>

<h3>Design decisions</h3>
${H.table(['If the situation is', 'Choose', 'Because', 'You give up'], [
  ['Nobody waits, volume is high', 'Batch', '50% off, plus caching', 'Latency guarantee'],
  ['A person or pipeline is blocked on the answer', 'Synchronous', 'Batch has no SLA', 'The discount'],
  ['Bounded SLA longer than 24h', 'Batch with interval I ≤ S − 24h − buffer', 'Guarantees the worst case', 'More, smaller submissions'],
  ['Workflow needs your tools mid-reasoning', 'Sync loop, or multi-batch with tool steps in code', 'Batch cannot round-trip client tools', 'Simplicity or latency'],
  ['New prompt, large volume', 'Sample refinement first', 'Maximizes first-pass success', 'A day of iteration'],
  ['Hard SLA and a few failures near the deadline', 'Sync reprocessing of failed <code>custom_id</code>s', 'A batch resubmission may take another 24h', 'Full price on those few requests']
])}

${H.box('trap', 'Traps:', '<b>"Batch everything for 50%"</b>: breaks blocking workflows. <b>"Batch with polling is fine because it is often fast"</b>: no SLA means no guarantee. <b>"Timeout fallback to sync"</b> for a blocking check: complexity instead of matching the API to the workload. <b>"Keep sync because results come back out of order"</b>: <code>custom_id</code> solves ordering. <b>"Resubmit the whole batch"</b>: pay twice. <b>"Batch agent that runs our test tool"</b>: client tools cannot run mid-request. <b>"Submit every 6h for a 30h SLA"</b>: zero buffer for failures.')}
${H.box('exam', 'Exam note:', 'the guide phrases the tool limitation as "no multi-turn tool calling within a single request". Current docs add that server tools do run in batches. For the exam, "the batch agent needs to call our internal API and continue" means batch is wrong for that step.')}

<h3>Worked scenario: sample question 11</h3>
<p>Two workflows use real-time calls: a blocking pre-merge check and an overnight technical debt report. The manager proposes moving both to batch for the 50% discount.</p>
${H.table(['Option', 'Verdict', 'Reason'], [
  ['A. Batch for the debt report only; keep real-time for pre-merge', '<b>Correct</b>', 'Matches each workflow to its latency requirement'],
  ['B. Both to batch with status polling', 'Wrong', 'Polling does not create a latency guarantee; developers could wait up to 24 hours'],
  ['C. Keep real-time for both to avoid ordering issues', 'Wrong', '<code>custom_id</code> correlates results; ordering is not a reason to pay double'],
  ['D. Both to batch with timeout fallback to real-time', 'Wrong', 'Adds complexity and still delays the blocking check until the timeout fires']
])}
<p>Extension: the debt report must be ready by 08:00 and code freezes at 20:00. Submitting at 20:00 gives 12 hours, which does not cover the 24-hour worst case. Either accept that the report is occasionally late (it is not blocking) or submit the previous day's snapshot earlier. The key is to state the worst case explicitly.</p>

${H.check([
  ['Documents must be processed within 30 hours of arrival. Why 4-hour submission windows rather than 6?', 'Worst case is interval + 24h. Six hours reaches exactly 30h with no room for failures; four hours gives 28h and a 2-hour buffer to handle errored or expired requests.'],
  ['A nightly batch of 50,000 contracts returns 1,200 errored results, all very long documents. What do you do?', 'Resubmit only those 1,200 <code>custom_id</code>s, each chunked into sections that fit the context window (IDs such as <code>ctr-000812-p1</code>), then merge chunk results in code. Do not rerun the 48,800 that succeeded.'],
  ['A team wants to run their code-fixing agent (read file, run tests, edit) through the batch API to save money. Assess it.', 'It does not work as one batch request: the agent needs client tool round trips, and your code cannot execute tools mid-request. Keep it synchronous, or restructure into single-shot batch steps with your code running the tools between batches, accepting up to 24h per step.'],
  ['Why refine the prompt on a sample before a 200,000-document backfill?', 'First-pass failures turn into resubmissions, each at cost and possibly another 24-hour cycle. Fixing normalization and edge-case examples on a stratified sample raises first-pass success cheaply.'],
  ['Results come back in a different order than you submitted. Is anything wrong?', 'No. Batch results are unordered .jsonl by design. Map every result by <code>custom_id</code>, and persist results before the 29-day retention ends.'],
  ['A batch shares a 30,000-token instruction prefix. How do you cut cost further and what should you expect?', 'Mark the identical prefix with <code>cache_control</code>; batch and caching discounts stack. Batch cache hits are best effort (roughly 30 to 98%), so budget conservatively; the 1-hour TTL can help when processing spreads out.']
])}
${H.src([['Batch processing', 'https://platform.claude.com/docs/en/build-with-claude/batch-processing'], ['Prompt caching', 'https://platform.claude.com/docs/en/build-with-claude/prompt-caching'], ['Define tools (client vs server tools)', 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools']])}`;
    }
  });

  /* ------------------------------------------------------------------ 4.6 */
  CCAR.lessons.push({
    id: 'hb-46-multi-pass-review', track: 'handbook', part: 'P4', num: '4.6', order: 406, domain: 'D4',
    objs: ['O24', 'O28', 'X11'], ts: ['4.6'], minutes: 30,
    title: 'Multi-instance and multi-pass review architectures',
    summary: 'Why self-review fails, how to get a truly independent reviewer, per-file plus integration passes, specialized passes by concern, confidence-scored verification with calibrated routing, merging findings, and splitting review output to avoid truncation.',
    body: function () {
      return `
<p>Automated review is where many Claude systems earn trust or lose it. Two structural problems dominate: a model reviewing its own work in the same session tends to agree with itself, and a single pass over a large change spreads attention thinly, so depth becomes uneven and verdicts contradict each other. The fixes are architectural, not prompt tweaks: independent instances, focused passes, and a verification step that makes routing decisions measurable. The exam probes the self-review limitation, the per-file plus integration split (sample question 12) and confidence-scored verification.</p>

<h3>Why self-review underperforms</h3>
<p>The generating session holds the reasoning that produced the code: the assumptions, the rejected alternatives, the "this is fine because" chain. Asked to review, the model re-reads its output through that same reasoning and is less likely to question its own decisions. Adding "review critically" or raising thinking effort does not remove the context that causes the bias. A <b>second instance that never saw the generation reasoning</b> reads the artifact the way a colleague would.</p>
${D({ w: 760, h: 230, title: 'Self-review vs independent review',
  groups: [{ x: 10, y: 10, w: 360, h: 210, label: 'SAME SESSION', kind: 'soft' }, { x: 390, y: 10, w: 360, h: 210, label: 'FRESH CONTEXT', kind: 'hard' }],
  nodes: [
    { id: 'g', x: 30, y: 45, w: 150, h: 54, label: 'Generator', sub: 'writes code + reasoning', kind: 'agent' },
    { id: 's', x: 200, y: 45, w: 150, h: 54, label: '"Now review it"', sub: 'same context, same beliefs', kind: 'bad' },
    { id: 'n1', x: 30, y: 140, w: 320, h: 54, label: 'Confirms its own choices', sub: 'subtle issues survive', kind: 'note' },
    { id: 'a', x: 410, y: 45, w: 150, h: 54, label: 'Artifact only', sub: 'diff + spec + criteria', kind: 'store' },
    { id: 'r', x: 580, y: 45, w: 150, h: 54, label: 'Independent reviewer', sub: 'no generator reasoning', kind: 'good' },
    { id: 'n2', x: 410, y: 140, w: 320, h: 54, label: 'Questions assumptions', sub: 'catches subtle issues', kind: 'note' }
  ],
  edges: [{ from: 'g', to: 's' }, { from: 's', to: 'n1' }, { from: 'a', to: 'r' }, { from: 'r', to: 'n2' }],
  caption: 'Independence means the reviewer starts without the generator\'s conversation. What it receives is the artifact, the requirements and explicit review criteria.' })}

<h3>Ways to get an independent reviewer</h3>
${H.table(['Mechanism', 'Independent?', 'Notes'], [
  ['Separate API call with only the diff, spec and criteria', 'Yes', 'The simplest form. You control exactly what the reviewer sees'],
  ['Claude Code Writer/Reviewer pattern: a second session reviews what the first wrote', 'Yes', 'The reviewer session never saw the writing conversation'],
  ['Verification subagent (non-fork) invoked via the Task tool (Agent tool in current docs)', 'Yes', 'Subagents receive their own prompt plus the Task prompt string, not the parent conversation or tool results'],
  ['Adversarial review in a fresh subagent, the bundled <code>/code-review</code> skill', 'Yes', 'Fresh context by design'],
  ['Forked session (<code>--fork-session</code>, <code>fork_session</code>) or a forked subagent', '<b>No</b>', 'A fork inherits the parent conversation, including the generation reasoning'],
  ['"Now review your work critically" in the same session', '<b>No</b>', 'Same context, same bias'],
  ['Same session with higher effort or extended thinking', '<b>No</b>', 'More reasoning over the same biased context']
])}
${H.box('exam', 'Exam vs current docs:', 'the guide says independent instances beat self-review instructions or <b>extended thinking</b>. On current models thinking is adaptive (always on for Opus 5.5 and Fable 5.1) and steered with <code>effort</code>; the conclusion is unchanged: more thinking in the generating context does not replace a fresh reviewer. The guide\'s Task tool is the Agent tool in current SDKs.')}

<h3>Multi-pass review: per-file passes plus an integration pass</h3>
${D({ w: 760, h: 300, title: 'Multi-pass review pipeline',
  nodes: [
    { id: 'pr', x: 15, y: 120, w: 110, h: 54, label: '14-file PR', sub: 'diff + context', kind: 'store' },
    { id: 'f1', x: 160, y: 20, w: 150, h: 44, label: 'File pass: a.py', sub: 'local issues, full depth', kind: 'sub' },
    { id: 'f2', x: 160, y: 80, w: 150, h: 44, label: 'File pass: b.py', kind: 'sub' },
    { id: 'f3', x: 160, y: 140, w: 150, h: 44, label: 'File pass: ...n', kind: 'sub' },
    { id: 'ip', x: 160, y: 215, w: 150, h: 54, label: 'Integration pass', sub: 'cross-file data flow', kind: 'sub' },
    { id: 'm', x: 350, y: 110, w: 130, h: 64, label: 'Merge + dedupe', sub: 'key: file, line, pattern', kind: 'tool' },
    { id: 'v', x: 515, y: 110, w: 115, h: 64, label: 'Verify pass', sub: 'confidence per finding', kind: 'agent' },
    { id: 'post', x: 655, y: 60, w: 95, h: 50, label: 'Post', sub: 'high conf', kind: 'good' },
    { id: 'hum', x: 655, y: 175, w: 95, h: 50, label: 'Triage', sub: 'low conf', kind: 'human' }
  ],
  edges: [
    { from: 'pr', to: 'f1' }, { from: 'pr', to: 'f2' }, { from: 'pr', to: 'f3' }, { from: 'pr', to: 'ip' },
    { from: 'f1', to: 'm' }, { from: 'f2', to: 'm' }, { from: 'f3', to: 'm' }, { from: 'ip', to: 'm' },
    { from: 'm', to: 'v' }, { from: 'v', to: 'post' }, { from: 'v', to: 'hum', dashed: true }
  ],
  caption: 'Per-file passes run in parallel with consistent criteria. The integration pass looks only at the seams between files. Findings are merged in code, then an independent verification pass scores each finding so routing can use calibrated thresholds.' })}
${H.table(['Pass', 'Input', 'Looks for', 'Output'], [
  ['<b>Per-file local pass</b> (one per file)', 'That file\'s diff and full content, relevant conventions, review criteria', 'Logic bugs, error handling, null handling, security issues visible within the file', 'Structured findings for that file only'],
  ['<b>Integration pass</b>', 'Changed signatures and interfaces, call sites across changed files, data-flow notes or short per-file summaries (not every local finding)', 'Mismatched contracts, units or states between modules, an ordering assumption broken in another file, missing updates at call sites', 'Cross-file findings naming every file involved'],
  ['<b>Verification pass</b> (independent)', 'The merged findings plus the code they cite', 'Is each finding real? How confident?', 'Keep/drop + confidence per finding']
])}
<p>Why it works: each call has a small, focused input, so every file gets the same depth, and the same criteria are applied the same way everywhere. The contradictory-feedback symptom (a pattern flagged in one file and approved in another) is a signature of attention dilution in one big pass; per-file passes with identical criteria remove most of it, and the merge step can check for remaining inconsistencies (same <code>detected_pattern</code>, different verdicts).</p>

<h3>Sample question 12 reasoning</h3>
${H.table(['Option', 'Verdict', 'Why'], [
  ['A. Per-file local passes plus a separate cross-file integration pass', '<b>Correct</b>', 'Fixes the root cause: attention dilution across 14 files. Consistent depth per file; cross-file issues still covered'],
  ['B. Make developers split PRs into 3 to 4 files', 'Wrong', 'Shifts the burden to developers without improving the system; real changes span modules'],
  ['C. Higher-tier model with a larger context window', 'Wrong', 'The files already fit; a bigger window does not fix attention quality over a large input'],
  ['D. Three full-PR runs, flag only issues found in 2 of 3', 'Wrong', 'Consensus suppresses real bugs that are caught intermittently, exactly the ones a diluted pass misses; it also triples cost without fixing depth']
])}

<h3>Specialized passes by concern</h3>
<p>A single prompt that reviews "security, business logic and API design" with a mixed set of examples tends to over-serve whichever concern its examples illustrate best. Splitting by concern gives each pass its own criteria, severity definitions and <b>dedicated few-shot examples</b>.</p>
${H.table(['Pass', 'Criteria focus', 'Few-shot examples show'], [
  ['Security', 'Injection, authn/authz checks, secrets, unsafe deserialization', 'A true positive (string-concatenated SQL) and an accepted pattern (parameterized query builder) side by side'],
  ['Business logic', 'Domain rules: stock never negative, refund limits, state transitions', 'A violated invariant with the expected finding, and a correct edge-case handling that must not be flagged'],
  ['API design', 'Naming, backward compatibility, error contracts, pagination', 'A breaking change to a public response field vs an additive, compatible change']
])}
<p>Concern passes and file passes combine: per file × per concern for large changes, or concern passes over the whole diff for small ones. Measure precision and recall per concern on a labeled set before deciding how far to split.</p>

<h3>Verification pass with self-reported confidence</h3>
<p>An independent verification pass re-checks each merged finding against the code and outputs a confidence alongside it. That enables <b>routing</b>: post high-confidence findings directly, send mid-range ones as suggestions or to triage, drop or sample the lowest.</p>
<pre class="code">{
  "finding_id": "f-031",
  "files": ["stock/reserve.py", "stock/release.py"],
  "category": "business_logic",
  "detected_pattern": "unpaired_reservation_release",
  "claim": "release() decrements reserved_qty without checking it was reserved in this order",
  "evidence": "reserve.py:112 writes order_id; release.py:57 ignores it",
  "verdict": "confirmed",               // confirmed | refuted | uncertain
  "confidence": 0.86                    // self-reported; calibrated before use in routing
}</pre>
${H.box('rule', 'Calibrate before you route:', 'raw self-reported confidence is not a probability. Build a labeled set (historical findings marked accepted or dismissed by developers, or code with seeded known bugs), bin findings by reported confidence, and measure actual precision per bin and per category. Set thresholds from that curve, re-check them when the prompt or model changes, and keep sampling auto-posted findings to catch drift.')}

<h3>Merging and deduplicating findings</h3>
<ul>
<li><b>Dedupe key:</b> file, line range, category and <code>detected_pattern</code>. Overlapping findings from different passes merge into one, keeping the highest severity and recording which passes found it.</li>
<li><b>Union, not intersection.</b> Keep a finding that only one pass reported; let verification judge it. Requiring agreement is consensus voting in disguise.</li>
<li><b>Consistency check:</b> same <code>detected_pattern</code> with opposite verdicts in two files is itself a finding for the verification pass or a human.</li>
<li><b>Cross-file findings</b> reference all involved files so they are not deduped away as a local duplicate.</li></ul>

<h3>Truncated review output: split per file</h3>
<p>A single call asked to return every finding for a large PR can hit <code>max_tokens</code>: <code>stop_reason: "max_tokens"</code>, the JSON or tool input cut off mid-array, schema validation fails. Retrying the same request fails the same way. Raising <code>max_tokens</code> only moves the cut-off to the next larger PR, and quality in very long outputs still dilutes. The fix is the same split this chapter already recommends: <b>one scoped call per file (or per concern), merged in code</b>. If one file's output is still too long, split that file by function or hunk.</p>

<h3>Cost and latency trade-offs</h3>
${H.table(['Choice', 'Cost / latency effect', 'Mitigation'], [
  ['Per-file passes', 'More calls, but each is small; wall-clock stays low if run in parallel', 'Parallelize; cache the shared prefix (criteria, conventions, examples)'],
  ['Concern passes', 'Multiplies calls by number of concerns', 'Split only concerns where evals show crowding-out; skip irrelevant concerns per file type'],
  ['Integration pass', 'One extra call over interfaces, not full files', 'Feed signatures and summaries, not every line'],
  ['Verification pass', 'One call per batch of findings', 'Only verify findings above a noise floor; smaller model if evals allow'],
  ['Pre-merge vs nightly', 'Pre-merge must be synchronous', 'Run the deep multi-concern audit as a nightly batch job (4.5)']
])}

<h3>Design decisions</h3>
${H.table(['If the situation is', 'Choose', 'Because', 'You give up'], [
  ['Generated code needs review before merge', 'Independent instance with the diff, spec and criteria only', 'Self-review keeps the generator\'s reasoning and bias', 'One extra call'],
  ['Large PR, uneven depth, contradictory verdicts', 'Per-file passes + integration pass', 'Removes attention dilution, keeps cross-file coverage', 'More calls and a merge step'],
  ['One concern dominates findings, others get missed', 'Specialized passes with dedicated few-shot examples', 'Each concern gets its own attention and examples', 'Cost per extra pass'],
  ['Too many low-value comments posted', 'Verification pass with calibrated confidence thresholds', 'Routing on measured precision, not raw scores', 'A labeled set and upkeep'],
  ['Review JSON truncated', 'Scoped per-file calls merged in code', 'Output size per call stays bounded', 'Merge logic']
])}
${H.box('real', 'Real-world notes:', 'store every finding with pass, model, prompt version and developer action; that dataset calibrates confidence, drives <code>detected_pattern</code> dismissal analysis (4.4) and becomes your regression eval. Keep review criteria and accepted patterns in persistent context (CLAUDE.md or rules) so every pass applies the same standards (4.1). Budget review runs with turn and cost caps in CI.')}
${H.box('trap', 'Traps:', '<b>"Ask the same session to double-check"</b> or <b>"enable extended thinking for self-review"</b>: same context, same bias. <b>"Fork the session to review"</b>: forks inherit the reasoning. <b>"Bigger context window"</b>: capacity is not attention. <b>"Consensus of three runs"</b>: suppresses intermittently caught real bugs. <b>"Make developers split PRs"</b>: burden shift. <b>"Raise max_tokens"</b>: moves the truncation. <b>"Route on raw confidence"</b>: uncalibrated scores are not probabilities.')}

<h3>Worked scenario</h3>
<p>A code-generation agent writes a new inventory reservation module (9 files) and then, in the same session, is asked to "review your changes carefully with extended thinking". It reports no issues. In production, reservations leak because <code>release()</code> in one file does not respect the order ID written by <code>reserve()</code> in another. Separately, the team's PR reviewer posts 60 comments per PR and developers ignore most of them.</p>
<p><b>Reasoning.</b> The self-review could not see past its own design assumption, and the bug is cross-file, so a single diluted pass is also likely to miss it. The noise problem is a routing problem: nothing distinguishes strong findings from weak ones.</p>
<p><b>Answer.</b> Review generated code with an independent instance that receives only the diff, the spec and criteria. Run per-file passes plus an integration pass over the interfaces between <code>reserve</code> and <code>release</code>. Add a verification pass that outputs a verdict and confidence per finding, calibrate thresholds on historical accepted and dismissed findings, and post only findings above the calibrated threshold, sending the rest to a digest.</p>

${H.check([
  ['Why does "review your own code critically" with more thinking effort not fix missed bugs in generated code?', 'The reviewer still holds the generation reasoning, so it tends to confirm its own decisions. More effort means more reasoning over the same biased context. An independent instance without that context is more effective.'],
  ['Is a forked session a valid independent reviewer?', 'No. A fork inherits the parent conversation, including the generation reasoning. Use a fresh session, a separate API call or a non-fork subagent that receives only the artifact, spec and criteria.'],
  ['A 14-file PR review flags a pattern in one file and approves identical code in another. What restructuring fixes it and what does each part do?', 'Per-file local passes with identical criteria give consistent depth per file; a separate integration pass examines cross-file data flow. Merging in code can also flag same-pattern, different-verdict pairs.'],
  ['Why is "flag only issues found in 2 of 3 runs" harmful?', 'The bugs a diluted pass misses are exactly the ones caught intermittently; requiring agreement suppresses them. It also triples cost without addressing the cause.'],
  ['Your verification pass reports confidence 0.9 on findings that developers dismiss half the time. What do you do before using confidence for routing?', 'Calibrate: bin findings by reported confidence on a labeled set (accepted vs dismissed, or seeded bugs), measure precision per bin and category, and set thresholds from measured precision. Keep sampling auto-posted findings.'],
  ['The review tool returns truncated JSON for large PRs with <code>stop_reason: "max_tokens"</code>. Fix?', 'Split into scoped calls per file (or per concern) and merge the findings in code. Retrying the same request fails the same way, and raising <code>max_tokens</code> only moves the cut-off.']
])}
${H.src([['Claude Code best practices (writer/reviewer, verification subagent)', 'https://code.claude.com/docs/en/best-practices'], ['Agent SDK: subagents', 'https://code.claude.com/docs/en/agent-sdk/subagents'], ['Prompting best practices (examples)', 'https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices'], ['Demystifying evals for AI agents', 'https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents']])}`;
    }
  });
})();
