/* Architect Handbook: parts, task statements (exam guide v1.0 §6), and helpers.
   Handbook lessons live in js/data/handbook/*.js and push into CCAR.lessons with track: 'handbook'.
   Existing retake lessons (lessons-1..4) have no track and are shown as "Retake focus". */
(function () {
  CCAR.HANDBOOK_PARTS = [
    { id: 'P0', name: 'Part 0 · Foundations of the Claude platform', blurb: 'The API, models, tool mechanics, Agent SDK, Claude Code, MCP and prompting fundamentals every later chapter builds on.' },
    { id: 'P1', name: 'Part 1 · Agentic architecture & orchestration (D1, 27%)', blurb: 'One chapter per task statement 1.1–1.7: loops, coordinators, subagents, enforcement, hooks, decomposition, sessions.', domain: 'D1' },
    { id: 'P2', name: 'Part 2 · Tool design & MCP integration (D2, 18%)', blurb: 'Task statements 2.1–2.5: tool interfaces, structured errors, tool distribution, MCP integration, built-in tools.', domain: 'D2' },
    { id: 'P3', name: 'Part 3 · Claude Code configuration & workflows (D3, 20%)', blurb: 'Task statements 3.1–3.6: CLAUDE.md, commands and skills, path rules, plan mode, iterative refinement, CI/CD.', domain: 'D3' },
    { id: 'P4', name: 'Part 4 · Prompt engineering & structured output (D4, 20%)', blurb: 'Task statements 4.1–4.6: explicit criteria, few-shot, schemas and tool use, validation loops, batch, multi-pass review.', domain: 'D4' },
    { id: 'P5', name: 'Part 5 · Context management & reliability (D5, 15%)', blurb: 'Task statements 5.1–5.6: long conversations, escalation, error propagation, codebase exploration, human review, provenance.', domain: 'D5' },
    { id: 'P6', name: 'Part 6 · Scenario playbooks', blurb: 'The six exam scenarios as reference architectures: components, decisions, failure signatures and the fixes the exam expects.' },
    { id: 'P7', name: 'Part 7 · Architect\'s casebook: hard design decisions', blurb: 'Decision frameworks, production readiness (evals, security, cost, observability) and worked design cases with trade-offs.' },
    { id: 'P8', name: 'Part 8 · Reference', blurb: 'Cheat sheets, exam-vs-current-docs terminology map, anti-pattern encyclopedia, and a final-week plan.' }
  ];

  CCAR.TASK_STATEMENTS = [
    { id: '1.1', d: 'D1', t: 'Design and implement agentic loops for autonomous task execution' },
    { id: '1.2', d: 'D1', t: 'Orchestrate multi-agent systems with coordinator-subagent patterns' },
    { id: '1.3', d: 'D1', t: 'Configure subagent invocation, context passing, and spawning' },
    { id: '1.4', d: 'D1', t: 'Implement multi-step workflows with enforcement and handoff patterns' },
    { id: '1.5', d: 'D1', t: 'Apply Agent SDK hooks for tool call interception and data normalization' },
    { id: '1.6', d: 'D1', t: 'Design task decomposition strategies for complex workflows' },
    { id: '1.7', d: 'D1', t: 'Manage session state, resumption, and forking' },
    { id: '2.1', d: 'D2', t: 'Design effective tool interfaces with clear descriptions and boundaries' },
    { id: '2.2', d: 'D2', t: 'Implement structured error responses for MCP tools' },
    { id: '2.3', d: 'D2', t: 'Distribute tools appropriately across agents and configure tool choice' },
    { id: '2.4', d: 'D2', t: 'Integrate MCP servers into Claude Code and agent workflows' },
    { id: '2.5', d: 'D2', t: 'Select and apply built-in tools (Read, Write, Edit, Bash, Grep, Glob) effectively' },
    { id: '3.1', d: 'D3', t: 'Configure CLAUDE.md files with appropriate hierarchy, scoping, and modular organization' },
    { id: '3.2', d: 'D3', t: 'Create and configure custom slash commands and skills' },
    { id: '3.3', d: 'D3', t: 'Apply path-specific rules for conditional convention loading' },
    { id: '3.4', d: 'D3', t: 'Determine when to use plan mode vs direct execution' },
    { id: '3.5', d: 'D3', t: 'Apply iterative refinement techniques for progressive improvement' },
    { id: '3.6', d: 'D3', t: 'Integrate Claude Code into CI/CD pipelines' },
    { id: '4.1', d: 'D4', t: 'Design prompts with explicit criteria to improve precision and reduce false positives' },
    { id: '4.2', d: 'D4', t: 'Apply few-shot prompting to improve output consistency and quality' },
    { id: '4.3', d: 'D4', t: 'Enforce structured output using tool use and JSON schemas' },
    { id: '4.4', d: 'D4', t: 'Implement validation, retry, and feedback loops for extraction quality' },
    { id: '4.5', d: 'D4', t: 'Design efficient batch processing strategies' },
    { id: '4.6', d: 'D4', t: 'Design multi-instance and multi-pass review architectures' },
    { id: '5.1', d: 'D5', t: 'Manage conversation context to preserve critical information across long interactions' },
    { id: '5.2', d: 'D5', t: 'Design effective escalation and ambiguity resolution patterns' },
    { id: '5.3', d: 'D5', t: 'Implement error propagation strategies across multi-agent systems' },
    { id: '5.4', d: 'D5', t: 'Manage context effectively in large codebase exploration' },
    { id: '5.5', d: 'D5', t: 'Design human review workflows and confidence calibration' },
    { id: '5.6', d: 'D5', t: 'Preserve information provenance and handle uncertainty in multi-source synthesis' }
  ];

  /* Authoring helpers used by js/data/handbook/*.js (all return HTML strings). */
  CCAR.hb = {
    D: function (spec) { return CCAR.charts.diagram(spec); },
    check: function (items) {
      return '<h3>Check yourself</h3>' + items.map(function (it) {
        return '<details class="check"><summary>' + it[0] + '</summary>' + it[1] + '</details>';
      }).join('');
    },
    src: function (links) {
      return '<p class="src">Sources: ' + links.map(function (l) {
        return '<a href="' + l[1] + '" target="_blank" rel="noopener">' + l[0] + '</a>';
      }).join(' · ') + '</p>';
    },
    box: function (kind, title, html) { return '<div class="callout ' + kind + '"><b>' + title + '</b> ' + html + '</div>'; },
    table: function (head, rows, cls) {
      return '<table class="tbl' + (cls ? ' ' + cls : '') + '">' + (head ? '<thead><tr>' + head.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead>' : '') +
        '<tbody>' + rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
    }
  };
  /* Which task statements a lesson covers (handbook: l.ts; retake: derived from its objectives' ts field). */
  CCAR.lessonTS = function (l) {
    if (l.ts) return l.ts;
    var out = [];
    (l.objs || []).forEach(function (oid) {
      var o = CCAR.objectiveById(oid); if (!o) return;
      String(o.ts).split('/').forEach(function (part) {
        var m = part.match(/^(\d)\.(\d)(?:[–-](\d)\.(\d))?$/);
        if (!m) return;
        if (m[3]) { for (var i = +m[2]; i <= +m[4]; i++) out.push(m[1] + '.' + i); } else out.push(m[1] + '.' + m[2]);
      });
    });
    return out.filter(function (v, i, a) { return a.indexOf(v) === i; });
  };

  CCAR.isHandbook = function (l) { return l.track === 'handbook'; };
  CCAR.handbookLessons = function () {
    return CCAR.lessons.filter(CCAR.isHandbook).slice().sort(function (a, b) { return a.order - b.order; });
  };
  CCAR.retakeLessons = function () { return CCAR.lessons.filter(function (l) { return !CCAR.isHandbook(l); }); };
})();
