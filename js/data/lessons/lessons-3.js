/* Domains 4/5 lessons: output schemas & synthesis, truncation, human review, extraction accuracy. */
(function () {
  var D = function (spec) { return CCAR.charts.diagram(spec); };
  CCAR.lessons = CCAR.lessons || [];

  CCAR.lessons.push({
    id: 'schemas-synthesis', domain: 'D5', objs: ['O18', 'O19', 'X10', 'X06'], minutes: 25,
    title: 'Subagent output schemas and synthesis that preserves uncertainty',
    summary: 'Two 0% objectives: output schemas for downstream synthesis, and keeping contested findings visible.',
    body: function () {
      return '' +
      '<p>Attribution dies at summarization. Once a subagent returns "a 300-word overview plus a list of URLs", no later step can reliably say which source supports which claim.</p>' +
      '<div class="two"><div><h4 class="bad-h">Before</h4><pre class="code">{\n  "summary": "Several studies suggest costs fell\n    20–40%, with further declines expected...",\n  "sources": ["https://…/atb-2024", "https://…/bnef"]\n}</pre></div>' +
      '<div><h4 class="good-h">After (claim-level records)</h4><pre class="code">{\n  "findings": [{\n    "claim": "4-h Li-ion system cost fell 22% (2022→2024)",\n    "value": 22, "unit": "%", "basis": "installed $/kWh",\n    "claim_type": "observed",        // vs modeled / projected\n    "status": "confirmed",           // vs inferred\n    "source": { "url": "…", "title": "…", "page": 14,\n                "published": "2024-06", "data_period": "2022–2024" },\n    "excerpt": "…", "method_note": "survey of 38 projects"\n  }],\n  "not_covered": ["sodium-ion"], "errors": []\n}</pre></div></div>' +
      '<h3>Schema design rules for subagent outputs</h3><ul>' +
      '<li><b>Separate content from metadata</b> (URL, document, page or file:line, publication date, data-collection period).</li>' +
      '<li><b>Carry dates</b>. A 2021 list price vs a 2024 net price, or a 2022 vs a 2025 forecast, is a <i>temporal or definitional</i> difference, not a contradiction.</li>' +
      '<li><b>Mark claim type and verification status</b> (observed / modeled; confirmed / inferred) so hedges ("preliminary modelling suggests") don\'t harden into facts.</li>' +
      '<li><b>Include merge keys</b> (symbols, entity IDs) so parallel workers\' overlapping findings can be merged.</li>' +
      '<li><b>List coverage gaps and errors</b> explicitly ("not_covered", structured errors).</li>' +
      '<li>When the downstream agent has a small context budget, return <b>compact structured facts with citations and relevance</b>, not reasoning chains and page dumps. Store full text in files and pass <b>paths</b>.</li></ul>' +
      D({ w: 760, h: 210, title: 'Synthesis report structure',
        nodes: [
          { id: 'in', x: 20, y: 70, w: 170, h: 60, label: 'Claim records', sub: 'from all subagents', kind: 'store' },
          { id: 's', x: 250, y: 70, w: 160, h: 60, label: 'Synthesis', sub: 'preserve + merge maps', kind: 'sub' },
          { id: 'e', x: 480, y: 10, w: 260, h: 50, label: 'Well-established findings', sub: 'multiple independent sources', kind: 'good' },
          { id: 'c', x: 480, y: 75, w: 260, h: 50, label: 'Contested findings', sub: 'each value + source + method + date', kind: 'bad' },
          { id: 'g', x: 480, y: 140, w: 260, h: 50, label: 'Coverage gaps', sub: 'unavailable sources, not researched', kind: 'note' }
        ], edges: [{ from: 'in', to: 's' }, { from: 's', to: 'e' }, { from: 's', to: 'c' }, { from: 's', to: 'g' }] }) +
      '<h3>How to handle conflicting credible sources</h3>' +
      '<table class="tbl"><thead><tr><th>Wrong</th><th>Why it fails</th></tr></thead><tbody>' +
      '<tr><td>Average them (335 kt midpoint)</td><td>A number neither source reported; it hides a scenario difference</td></tr>' +
      '<tr><td>Take the most recent / most authoritative</td><td>An arbitrary tie-break that discards a credible alternative</td></tr>' +
      '<tr><td>Majority vote across sources or runs</td><td>Suppresses legitimate minority evidence</td></tr>' +
      '<tr><td>Drop contested figures or "say unknown"</td><td>Throws away sourced evidence</td></tr>' +
      '<tr><td>Uniformly add "may" to every claim</td><td>Makes a meta-analysis look as weak as a two-page brief</td></tr>' +
      '<tr><td>Self-rated confidence 1–10 per claim</td><td>Poorly calibrated, and it restores neither attribution nor dates</td></tr></tbody></table>' +
      '<div class="callout rule"><b>Right:</b> keep every value with its source, method, scope and date; annotate the conflict (<code>conflict_detected: true</code>); let the <b>coordinator</b> or a human decide how to reconcile; present it in a contested section with the methodological context that explains the gap (base case vs high-adoption scenario, with vs without QMS setup).</div>' +
      '<h3>Error propagation across agents (X06)</h3><ul>' +
      '<li>Transient failure → <b>retry locally</b>, then return <b>structured error context</b>: failure type, what was attempted, partial results, alternatives.</li>' +
      '<li>Zero-hit query → a <b>valid empty result</b>, distinct from an access failure.</li>' +
      '<li>Anti-patterns: generic "search unavailable"; empty results marked as success; terminating the whole run on one failure.</li>' +
      '<li>Synthesis output carries <b>coverage annotations</b> (well-supported vs gaps due to unavailable sources).</li></ul>' +
      '<div class="callout rule"><b>Render by content type:</b> financial data as tables, news as prose, technical findings as structured lists. Don\'t force everything into one format.</div>';
    }
  });

  CCAR.lessons.push({
    id: 'truncation-multipass', domain: 'D4', objs: ['O28', 'O24', 'X11'], minutes: 15,
    title: 'Structured-output truncation and multi-pass review',
    summary: 'Fix max_tokens truncation by splitting into scoped calls and merging. You scored 0% here.',
    body: function () {
      return '' +
      '<pre class="code">stop_reason: "max_tokens"      usage.output_tokens: 16000\ncontent[0]: tool_use name=record_obligations\n  input: {"obligations":[ …212 items…, {"clause":"14.3","party":"Suppl\nschema validation failed</pre>' +
      '<p><code>stop_reason: "max_tokens"</code> means generation stopped mid-output, so the JSON or tool input is <b>incomplete</b>. It is deterministic for the same request.</p>' +
      D({ w: 760, h: 200, title: 'Split, extract, merge, verify',
        nodes: [
          { id: 'b', x: 20, y: 70, w: 150, h: 60, label: 'Boundary pass', sub: 'cheap: pages / sections', kind: 'tool' },
          { id: 'x1', x: 230, y: 10, w: 160, h: 44, label: 'Scoped call 1', sub: 'same schema', kind: 'sub' },
          { id: 'x2', x: 230, y: 78, w: 160, h: 44, label: 'Scoped call 2', kind: 'sub' },
          { id: 'x3', x: 230, y: 146, w: 160, h: 44, label: 'Scoped call N', kind: 'sub' },
          { id: 'm', x: 450, y: 70, w: 140, h: 60, label: 'Merge in code', sub: 'natural key, dedupe', kind: 'agent' },
          { id: 'v', x: 630, y: 70, w: 120, h: 60, label: 'Verify', sub: 'sum vs stated total', kind: 'good' }
        ], edges: [{ from: 'b', to: 'x1' }, { from: 'b', to: 'x2' }, { from: 'b', to: 'x3' }, { from: 'x1', to: 'm' }, { from: 'x2', to: 'm' }, { from: 'x3', to: 'm' }, { from: 'm', to: 'v' }] }) +
      '<table class="tbl"><thead><tr><th>Distractor</th><th>Why it\'s wrong</th></tr></thead><tbody>' +
      '<tr><td>Raise max_tokens (8k → 16k → 64k)</td><td>Moves the cut-off to the next larger document; attention still dilutes over huge outputs (middle rows go missing even at end_turn)</td></tr>' +
      '<tr><td>Bigger context window</td><td>Input size isn\'t the problem; the <i>output</i> is</td></tr>' +
      '<tr><td>"Be concise", abbreviate, drop optional fields</td><td>Loses required data and only buys a little headroom</td></tr>' +
      '<tr><td>"Continue from where you stopped" and splice the JSON</td><td>Fragile; can\'t be schema-validated as one object</td></tr>' +
      '<tr><td>Retry the identical request</td><td>Fails identically</td></tr>' +
      '<tr><td>Store the partial array with <code>status: "partial"</code></td><td>Silent error suppression</td></tr>' +
      '<tr><td><code>strict: true</code></td><td>Guarantees conformance of <i>completed</i> output, not completeness</td></tr>' +
      '<tr><td>Move it to the Batches API</td><td>Same per-request output limit</td></tr></tbody></table>' +
      '<div class="callout rule"><b>Chunking creates boundary risk.</b> Add a semantic check (summed line items vs footer total, package counts vs manifest totals) and a rule for rows that straddle page breaks. If a chunk still hits max_tokens, split that range further.</div>' +
      '<h3>Multi-pass review (O24, X11)</h3><ul>' +
      '<li><b>Attention dilution:</b> 14 files in one pass gives uneven depth and contradictory verdicts. Use <b>per-file local passes</b> plus a separate <b>cross-file integration pass</b>.</li>' +
      '<li><b>Separate concerns:</b> security, business logic and API design each get their own pass with <b>dedicated few-shot examples</b>. Otherwise the best-illustrated category crowds out the rest.</li>' +
      '<li><b>Independent instance</b> beats self-review in the generating session. Extended thinking or a "skeptical senior engineer" role doesn\'t remove the bias.</li>' +
      '<li>Consensus of 3 runs is <b>wrong</b>: it suppresses bugs that are caught only intermittently.</li></ul>';
    }
  });

  CCAR.lessons.push({
    id: 'human-review-routing', domain: 'D5', objs: ['O22'], minutes: 15,
    title: 'Human review routing and confidence calibration',
    summary: 'You scored 33%. Route by calibrated field confidence and document traits, and monitor with stratified samples.',
    body: function () {
      return '' +
      '<div class="callout weak"><b>The core insight:</b> a 97% aggregate hides the 79% segment. The exam always gives a breakdown (typed PDF 99.3%, handwritten 88%, <code>date_of_loss</code> 79%). The answer is always segment-aware.</div>' +
      D({ w: 760, h: 230, title: 'Review routing design',
        nodes: [
          { id: 'x', x: 20, y: 90, w: 150, h: 54, label: 'Extraction', sub: 'field-level confidence', kind: 'agent' },
          { id: 'cal', x: 220, y: 10, w: 200, h: 54, label: 'Calibrate thresholds', sub: 'labeled validation set, per field', kind: 'tool' },
          { id: 'r', x: 220, y: 90, w: 200, h: 54, label: 'Router', sub: 'confidence + doc traits + conflicts', kind: 'tool' },
          { id: 'h', x: 480, y: 30, w: 260, h: 54, label: 'Human review queue', sub: 'low conf · weak segment · contradictory', kind: 'human' },
          { id: 'a', x: 480, y: 110, w: 260, h: 44, label: 'Auto-accept', sub: 'high conf, validated segments', kind: 'good' },
          { id: 's', x: 480, y: 170, w: 260, h: 44, label: 'Stratified random sample', sub: 'of auto-accepted → error rate, novel errors', kind: 'note' }
        ], edges: [{ from: 'x', to: 'r' }, { from: 'cal', to: 'r' }, { from: 'r', to: 'h' }, { from: 'r', to: 'a' }, { from: 'a', to: 's' }] }) +
      '<h3>Checklist before reducing human review</h3><ol class="steps">' +
      '<li>Break accuracy down <b>by document type and by field</b>. Automate only segments that meet the target individually.</li>' +
      '<li>Have the model output <b>field-level</b> confidence, then <b>calibrate thresholds</b> against a labeled validation set. Raw scores aren\'t probabilities.</li>' +
      '<li>Route to humans: low calibrated confidence on critical fields, <b>ambiguous or contradictory source documents</b> (stated total ≠ line-item sum, two bank accounts, conflicting dates), known weak document types.</li>' +
      '<li>Keep <b>stratified random sampling</b> of high-confidence output, across segments, to keep measuring error rates and catch novel failure patterns.</li></ol>' +
      '<table class="tbl"><thead><tr><th>Distractor</th><th>Why it fails</th></tr></thead><tbody>' +
      '<tr><td>Uniform random 5% or 10% sample as the routing rule</td><td>Unbiased for measurement, but spends reviewer capacity on documents that are already 99% right</td></tr>' +
      '<tr><td>Self-reported 1–10 document confidence</td><td>Uncalibrated, and hides which field is at risk</td></tr>' +
      '<tr><td>Sentiment ("customer sounds calm")</td><td>Unrelated to correctness</td></tr>' +
      '<tr><td>Three runs agree → skip review</td><td>Consistent errors agree too</td></tr>' +
      '<tr><td>Crude proxy (page count, contract value, non-Latin script)</td><td>Misses the actual risk signals</td></tr>' +
      '<tr><td>Stop sampling once 98% is confirmed</td><td>Drift and novel errors go undetected</td></tr></tbody></table>' +
      '<div class="callout rule">In support escalation: <b>sentiment and self-reported confidence are unreliable</b> proxies for case complexity. Use explicit criteria with few-shot examples.</div>';
    }
  });

  CCAR.lessons.push({
    id: 'extraction-accuracy', domain: 'D4', objs: ['O29', 'O26', 'O25', 'O27', 'X08', 'X09', 'O31', 'O30', 'O23'], minutes: 30,
    title: 'Extraction accuracy, schemas, tool_choice, explicit criteria, and Batch vs sync',
    summary: 'Includes your 50% objectives (extraction accuracy, inclusion/exclusion criteria) and Batch API (75%).',
    body: function () {
      return '' +
      '<h3>Reliability ladder for structured output</h3>' +
      '<table class="tbl"><thead><tr><th>Method</th><th>Syntax guaranteed?</th><th>Notes</th></tr></thead><tbody>' +
      '<tr><td><b>Tool use with JSON schema</b> (+ <code>strict: true</code>) or JSON outputs (<code>output_config.format</code>)</td><td>Yes</td><td>Most reliable. Read the <code>tool_use</code> input. Still does <b>not</b> prevent semantic errors (sums, wrong field).</td></tr>' +
      '<tr><td>Prompt "return JSON" + few-shot</td><td>No</td><td>Preambles, unescaped quotes, trailing commas</td></tr>' +
      '<tr><td>Assistant-turn prefill <code>{</code></td><td>No</td><td><b>Not supported on Claude 4.6 and later models</b> (current platform docs)</td></tr>' +
      '<tr><td>JSON-repair library</td><td>No</td><td>Guesses at intent; can silently corrupt values</td></tr></tbody></table>' +
      '<h3>tool_choice</h3><table class="tbl"><tbody>' +
      '<tr><td><code>{"type":"auto"}</code></td><td>May reply with text. That breaks loaders expecting tool_use.</td></tr>' +
      '<tr><td><code>{"type":"any"}</code></td><td>Must call <i>some</i> tool; the model picks the schema. Use it for <b>unknown document types</b> (plus a <code>report_unsupported_document</code> tool).</td></tr>' +
      '<tr><td><code>{"type":"tool","name":"X"}</code></td><td>Must call X. Use it for a <b>prerequisite step first</b> (extract_metadata, get_customer), on the first turn only, then back to auto.</td></tr></tbody></table>' +
      '<h3>Schemas that don\'t force fabrication</h3>' +
      '<pre class="code">"retest_date":   { "type": ["string","null"], "format": "date" },    // nullable + optional\n"incoterm":      { "type": "string", "enum": ["FOB","CIF","FCA","other","not_stated"] },\n"incoterm_detail": { "type": ["string","null"] },                    // "other" + detail\n"injury_type":   { "enum": ["whiplash","fracture","other","unclear"] },\n"total_stated":  { "type": "number" }, "total_calculated": { "type": "number" },\n"conflict_detected": { "type": "boolean" }\n"required": ["lot_number"]                                          // only truly always-present</pre>' +
      '<ul><li>Required + non-nullable → invented dates, witness names and VAT numbers. A closed enum → nearest wrong category.</li><li>Keep the <b>raw source value</b> next to the normalized one for auditability.</li></ul>' +
      '<h3>Accuracy across varied formats (O29)</h3><table class="tbl"><thead><tr><th>Problem</th><th>Fix</th></tr></thead><tbody>' +
      '<tr><td>Valid JSON but wrong units, day/month swaps, decimal commas</td><td><b>Normalization rules in the prompt</b> alongside the strict schema (ISO 8601, locale by vendor country, unit scale fields), raw values retained</td></tr>' +
      '<tr><td>Value present but returned null for two layouts (footnote-keyed ranges, "Certificate Ref.")</td><td><b>Few-shot examples of those layouts</b> + label-synonym rules</td></tr>' +
      '<tr><td>Value genuinely absent ("see attached PO", separate master agreement)</td><td>null + reason (e.g. <code>external_document</code>), route; <b>retries can\'t help</b></td></tr></tbody></table>' +
      '<h3>Validation-retry loops (X08)</h3><p>Send back <b>the original document + the failed extraction + the specific error</b>. Retries succeed for format and placement errors (wrong column, non-ISO date, a missed surcharge). They fail when the information isn\'t in the input. Track <code>detected_pattern</code> on review findings to analyze dismissals.</p>' +
      '<h3>Explicit criteria beat vague instructions (O31, O30)</h3>' +
      '<div class="two"><div class="callout trap"><b>Vague:</b> "flag unusual or risky clauses", "be conservative", "only report high-confidence findings", "categorize appropriately", "check comments are accurate"</div>' +
      '<div class="callout rule"><b>Categorical:</b> "Report: uncapped indemnity, auto-renewal &gt; 12 months… Skip: mutual confidentiality, notice provisions" + one short example per boundary; an <code>unclear</code> fallback</div></div>' +
      '<ul><li>High false-positive category eroding trust? <b>Temporarily disable it</b> while you rewrite its criteria.</li><li>Accepted project patterns (generated code, sanctioned idioms, ADRs) go into <b>persistent context</b> (CLAUDE.md or rules) applied on every run.</li><li>Define severity with concrete code examples per level.</li></ul>' +
      '<h3>Message Batches API vs synchronous (O23)</h3>' +
      '<table class="tbl"><tbody><tr><td>Batches</td><td>50% cheaper, up to 24h, <b>no latency SLA</b>, results unordered → correlate with <code>custom_id</code>, poll, results kept 29 days, <b>no multi-turn tool calling within a request</b></td></tr>' +
      '<tr><td>Use for</td><td>Overnight reports, weekly audits, backfills, single-shot nightly steps</td></tr>' +
      '<tr><td>Never for</td><td>Blocking pre-merge gates, in-app receipts, dock staff waiting, run-test-fix loops</td></tr></tbody></table>' +
      '<div class="callout rule"><b>SLA math:</b> worst case = submission interval + 24h + retry/QA buffer ≤ SLA. With a 30h SLA and a 3h buffer, submit every ≤3h. With a 32h SLA and 2h buffer: every 6h. Plan on the <b>worst case</b>, never on "usually finishes in an hour". Resubmit only failed <code>custom_id</code>s (chunk oversized ones). Refine the prompt on a sample before a big batch.</div>';
    }
  });
})();
