/* Keyword audit: each exam-guide Knowledge/Skills bullet has a distinctive phrase that must appear in the
   handbook chapter(s) for that task statement. Usage: node tools/audit-coverage.js */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const ctx = { console, document: { addEventListener() {}, querySelector() { return null; } } }; ctx.window = ctx; vm.createContext(ctx);
[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]).filter(s => /data\/|core\/(ui|charts)\.js/.test(s) && !/exams\//.test(s))
  .forEach(s => vm.runInContext(fs.readFileSync(path.join(root, s), 'utf8'), ctx));
const C = ctx.CCAR;
const text = ts => C.lessons.filter(l => l.track === 'handbook' && (l.ts || []).includes(ts)).map(l => l.body()).join(' ').replace(/<[^>]+>/g, ' ').toLowerCase();
const req = {
  '1.1': ['stop_reason', 'end_turn', 'tool_result', 'decision tree', 'iteration cap', 'natural language'],
  '1.2': ['hub-and-spoke', 'isolated context', 'too narrow', 'partition', 'refinement', 'observability', 'query complexity'],
  '1.3': ['allowedtools', 'task', 'agentdefinition', 'fork', 'metadata', 'single response', 'quality criteria', 'complete findings'],
  '1.4': ['prerequisite', 'non-zero failure rate', 'get_customer', 'verified customer id', 'handoff', 'root cause', 'in parallel'],
  '1.5': ['posttooluse', 'pretooluse', 'unix', 'iso 8601', 'status code', '$500', 'deterministic'],
  '1.6': ['prompt chaining', 'dynamic', 'per-file', 'integration pass', 'attention dilution', 'legacy', 'high-impact'],
  '1.7': ['--resume', 'fork_session', 'changed', 'structured summary', 'stale'],
  '2.1': ['primary', 'edge cases', 'analyze_content', 'extract_web_results', 'extract_data_points', 'verify_claim_against_source', 'system prompt', 'keyword'],
  '2.2': ['iserror', 'transient', 'validation', 'business', 'permission', 'isretryable', 'operation failed', 'empty result', 'partial results'],
  '2.3': ['18', 'verify_fact', 'load_document', 'fetch_url', 'extract_metadata', '"any"', 'cross-role'],
  '2.4': ['.mcp.json', '~/.claude.json', '${github_token}', 'simultaneous', 'resources', 'community', 'grep'],
  '2.5': ['grep', 'glob', '**/*.test.tsx', 'unique', 'read + write', 'entry point', 'wrapper', 'exported'],
  '3.1': ['~/.claude/claude.md', 'not shared', '@import', '.claude/rules/', '/memory', 'new team member'],
  '3.2': ['.claude/commands/', '~/.claude/commands/', 'skill.md', 'context: fork', 'allowed-tools', 'argument-hint', 'different name'],
  '3.3': ['paths', 'glob', '**/*.test.tsx', 'terraform/**/*', 'subdirectory claude.md'],
  '3.4': ['plan mode', 'direct execution', '45+', 'microservice', 'explore subagent', 'stack trace', 'date validation'],
  '3.5': ['input/output examples', 'test', 'interview', 'interacting', 'sequential', 'null'],
  '3.6': ['-p', '--output-format json', '--json-schema', 'claude.md', 'independent', 'prior findings', 'existing test', 'fixtures'],
  '4.1': ['explicit criteria', 'be conservative', 'high-confidence', 'false positive', 'temporarily disabl', 'severity'],
  '4.2': ['few-shot', '2-4', 'ambiguous', 'format', 'generaliz', 'inline citations', 'bibliograph', 'null'],
  '4.3': ['tool_use', '"auto"', '"any"', 'forced', 'semantic', 'nullable', '"other"', '"unclear"', 'normalization'],
  '4.4': ['retry', 'validation error', 'absent', 'external document', 'detected_pattern', 'calculated_total', 'conflict_detected'],
  '4.5': ['50%', '24', 'sla', 'pre-merge', 'custom_id', 'multi-turn tool', '4-hour', 'sample'],
  '4.6': ['self-review', 'independent', 'extended thinking', 'per-file', 'integration', 'confidence'],
  '5.1': ['progressive summarization', 'lost in the middle', '40+', 'case facts', 'section headers', 'metadata', 'relevance scores', 'complete conversation history'],
  '5.2': ['explicitly', 'policy gap', 'sentiment', 'self-reported confidence', 'multiple', 'additional identifier', 'competitor', 'few-shot', 'reiterate'],
  '5.3': ['failure type', 'attempted', 'partial results', 'alternative', 'empty', 'search unavailable', 'terminat', 'coverage annotation'],
  '5.4': ['typical patterns', 'scratchpad', 'subagent', 'manifest', '/compact', 'summar'],
  '5.5': ['97%', 'stratified', 'field-level', 'labeled validation', 'document type', 'contradictory'],
  '5.6': ['claim-source', 'conflict', 'publication', 'well-established', 'contested', 'tables', 'prose', 'excerpt']
};
let miss = 0;
for (const [ts, keys] of Object.entries(req)) {
  const t = text(ts).replace(/–/g, '-');
  const m = keys.filter(k => !t.includes(k));
  if (m.length) { miss += m.length; console.log(ts, 'missing:', m.join(' | ')); }
}
console.log(miss ? `MISSING ${miss}` : 'ALL BULLET KEYWORDS PRESENT');
