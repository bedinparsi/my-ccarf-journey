/* Practice Exam 6, Scenario S2 (Code Generation with Claude Code), items 09-15 */
CCAR.addQuestions('exam6', [
  {
    id: 'e6-S2-09', scenario: 'S2', domain: 'D2', obj: 'O17', type: 'single', select: 1,
    stem: `<p>Pinecrest Ticketing runs its resale marketplace on a 14-year-old Python monolith of about 2,000 files; the payments package, <code>app/payments/</code>, alone holds about 140 modules. Finance found 214 refunds last month above the $500 threshold with no fraud-check record. A developer who joined the payments team two weeks ago is using Claude Code to find the path those refunds take. In her first session, Claude read 60 files in alphabetical order, starting in <code>app/accounts/</code>; by the time it reached the refund modules, its answers described "typical Django signal patterns" instead of the classes it had opened.</p>
<p>In a second session, a Grep for <code>fraud_check(</code> returned two hits: the definition in <code>risk/checks.py</code> and a caller in <code>jobs/nightly_chargeback_scan.py</code>. A senior engineer then explained that no service calls a refund handler directly. Services publish events, <code>events/registry.py</code> maps event names to handlers with lines such as <code>EVENT_HANDLERS["refund.created"] = handle_refund</code>, and a generic <code>dispatch(event_type, payload)</code> looks up the handler at runtime.</p>
<p>The incident review is tomorrow morning and needs the exact handler and line where the check is bypassed. The monolith moved to Python 3.12 in the spring, and in March the fraud vendor's API latency briefly rose to 900 ms.</p>
<p>Which exploration approach should she ask Claude to follow in a fresh session?</p>`,
    options: [
      `Glob <code>**/*refund*.py</code> and Read all 38 matching files, so that every refund-related module is in context at once and Claude can compare them before deciding which path skips the check.`,
      `Read <code>events/registry.py</code> and then all of the roughly 140 modules under <code>app/payments/</code> upfront, so that the whole refund domain is loaded before Claude starts tracing any single path.`,
      `Repeat the <code>fraud_check</code> search case-insensitively across the whole repository, including scripts and tests, so that any caller the first Grep missed shows up and the skipped path becomes visible.`,
      `Grep for refund event names such as <code>"refund.created"</code> to find the publishers and the registered handlers, Read those handlers, then follow their calls and imports one step at a time.`
    ],
    answer: [3],
    explanation: `Large-codebase exploration should be incremental: Grep finds an entry point, Read follows the code from there, and only files on the path enter context. Here the entry point is not a function call. Refund handlers are looked up at runtime by event name, so the path starts at the string that publishers pass to <code>dispatch</code> and that the registry maps to a handler. Searching for refund event names reveals every publisher and every registered handler, and reading those handlers and their calls shows which path never reaches the check, down to the line the review needs. Searching for <code>fraud_check</code> again, with any casing, finds only places where the check runs, while these refunds take a path that never mentions it. Loading 38 or 140 files upfront repeats the first session, where 60 alphabetical reads filled the context and answers drifted to "typical" patterns. The Python 3.12 move and the vendor latency are noise.`,
    rationales: [
      `Matching filenames loads 38 files whether or not they sit on the refund path, repeating the first session's context exhaustion, and a handler module with a generic name would not match the pattern at all.`,
      `Reading about 140 modules before tracing is the strategy that already failed after 60 alphabetical reads: the context fills first, and the answers drift toward "typical" patterns instead of the actual handlers.`,
      `Any <code>fraud_check</code> search finds only places where the check runs. The refunds that skip it follow a path with no reference to the check, so a case-insensitive repeat cannot reveal that path.`,
      `Correct. The event name is the literal link between publishers, the registry and the handlers, so Grep finds the real entry points, and Read can then trace the path that bypasses the check.`
    ],
    trap: `Reading broadly or re-searching the symptom instead of tracing from the dynamic entry point`,
    signals: `Decisive: <code>events/registry.py</code> maps event names to handlers that <code>dispatch</code> looks up at runtime, so no static call leads to the refund path, and the first session exhausted its context after 60 alphabetical reads. Noise: the Python 3.12 move and the vendor's March latency spike, which do not change how to explore.`
  },
  {
    id: 'e6-S2-10', scenario: 'S2', domain: 'D2', obj: 'O17', type: 'single', select: 1,
    stem: `<p>Tamarind Health's patient portal is a TypeScript React monorepo with about 6,000 files in 31 packages. The design-system team plans to delete the legacy <code>withTheme</code> higher-order component before the token-based theme ships in November. First it needs a list of every component that still wraps itself with <code>withTheme</code>, and whether each of those components has a test. By convention a test sits beside its component with the same base name, as in <code>Avatar.tsx</code> and <code>Avatar.test.tsx</code>. Storybook files such as <code>Avatar.stories.tsx</code> live in the same folders but do not count as tests.</p>
<p>A teammate's first attempt asked Claude to "go through the components and check each one." Claude opened files in <code>packages/ui/src</code> one at a time. After about 90 files the session was close to its context limit, the list covered only two packages, and it included three components that mention <code>withTheme</code> only in a deprecation comment.</p>
<p>The list is needed for tomorrow's sprint planning. Last quarter the repository moved from Jest to Vitest without renaming any test files, and most of the team works in VS Code.</p>
<p>Which sequence of tool use should Claude follow this time?</p>`,
    options: [
      `Grep for <code>withTheme(</code> to list the components that still call it, Glob for same-name test files such as <code>**/Avatar.test.tsx</code>, and Read only the matches that need confirming.`,
      `Glob <code>**/*.tsx</code> to collect every component, story and test file in the monorepo, then Read each one, so that Claude sees directly which components use the wrapper and which have tests.`,
      `Grep for the <code>.test.tsx</code> naming pattern to list every test file, then Glob for <code>withTheme</code> to find the components that use it, and Read both lists to pair each component with its test.`,
      `Run <code>find packages -name "*.tsx" | xargs cat</code> through Bash, so that all component and test source arrives in a single tool result that Claude can scan in one pass.`
    ],
    answer: [0],
    explanation: `Grep searches file contents and Glob matches file paths, and using each for its own question keeps exploration within the context budget. Whether a component uses the HOC is a content question, so a Grep for <code>withTheme(</code> returns only the files that call it. Whether a test exists is a naming question, so a Glob for the same base name with <code>.test.tsx</code> answers it without opening any file, and the exact suffix leaves out the <code>.stories.tsx</code> files. Read is then spent only on doubtful hits, such as files where the name may appear only in a deprecation comment. The first attempt failed because one-by-one reading used up the context after about 90 files. Reading every <code>.tsx</code> file, or piping all source through <code>cat</code>, repeats that failure at a larger scale, and the swapped option asks each tool to do the other's job. The Vitest move is noise because test names did not change.`,
    rationales: [
      `Correct. Grep answers the content question and Glob answers the naming question, so only matching paths enter context, and Read is spent only on doubtful hits such as deprecation comments.`,
      `Reading every .tsx file in a 6,000-file monorepo is the first attempt's failure at a larger scale; that attempt was near its context limit after about 90 files and two packages.`,
      `The tools are swapped: Glob matches paths, so it cannot find a call inside a file, and Grep searches contents, so it is the wrong way to list files by their names.`,
      `Piping thousands of files through cat puts the whole codebase into one tool result, which floods the context far faster than the file-by-file reading that already failed.`
    ],
    trap: `Reading everything or swapping Grep and Glob`,
    signals: `Decisive: the task splits into a content question (which files call <code>withTheme</code>) and a naming question (which of them have a same-name <code>.test.tsx</code> file), and one-by-one reading ran out of context after about 90 files. Noise: the Jest to Vitest move, which kept test names, the Storybook files and the team's editor.`
  },
  {
    id: 'e6-S2-11', scenario: 'S2', domain: 'D2', obj: 'O32', type: 'single', select: 1,
    stem: `<p>Corvid Pay, a card-payment gateway, keeps per-region settings in <code>config/regions.yaml</code>, a 612-line file with six region blocks. Compliance needs 3-D Secure turned on for EU West, and only EU West, by Friday. A developer asked Claude Code to make the change. An excerpt of the file and of the session log:</p>
<pre>regions:
  us-east:
    display_name: "US East"
    # 38 lines of shared limits and webhook settings
    card_processing:
      enable_3ds: false
      retry_limit: 3
  eu-west:
    display_name: "EU West"
    # 38 lines of shared limits and webhook settings
    card_processing:
      enable_3ds: false
      retry_limit: 3
  # four more regions follow in the same shape

Edit config/regions.yaml
  Error: old_string matches 6 locations</pre>
<p>Apart from each region's key and display name, the blocks are byte-identical, so the only text unique to EU West sits about 40 lines above its <code>enable_3ds</code> line. After the error, Claude proposed <code>sed -i '112s/false/true/' config/regions.yaml</code>, using a line number it noted when it first read the file. Since that read, the developer has pulled main, which added an 18-line <code>me-central</code> block above EU West.</p>
<p>Any diff that touches another region's settings triggers a four-approver change review, which would miss the Friday deadline. The team adopted a stricter yamllint profile last week, and the gateway reloads the file every 30 seconds.</p>
<p>How should Claude make the change?</p>`,
    options: [
      `Retry the Edit with <code>replace_all: true</code> so the tool stops rejecting the repeated old_string, and then rely on the developer to check the diff and confirm that EU West changed.`,
      `Approve the proposed <code>sed -i</code> command, because a line number picks out exactly one occurrence and the command changes a single line without needing any unique text around it.`,
      `Read the whole file again, then Write it back with only the EU West <code>enable_3ds</code> value changed, so the change no longer depends on finding a unique anchor for Edit.`,
      `Glob for <code>config/regions.yaml</code> to confirm the exact path, then retry the same Edit call, since the error may come from a stale view of the file rather than from repeated text.`
    ],
    answer: [2],
    explanation: `Edit works by unique text matching, so it cannot target one of six byte-identical <code>card_processing</code> blocks; a unique anchor would have to stretch about 40 lines up to the EU West key. When Edit cannot find unique anchor text, the reliable fallback is Read plus Write: read the current file, change only the EU West value, and write the full file back. Because the read happens now, it also includes the <code>me-central</code> block that the pull added. The proposed <code>sed</code> command relies on a line number from before that pull, so line 112 no longer points at EU West, and sed could change another region's setting, or nothing, without any error. <code>replace_all</code> would enable 3-D Secure in all six regions and trigger the four-approver review. Retrying the same Edit fails the same way, because the cause is repeated text, not the path. The yamllint profile and the reload interval are noise.`,
    rationales: [
      `<code>replace_all</code> changes every match, so 3-D Secure would be enabled in all six regions, and a diff that touches five other regions triggers the four-approver review that would miss Friday.`,
      `The line number comes from a read made before the pull added 18 lines above EU West, so line 112 now points elsewhere, and sed could change the wrong setting without reporting any error.`,
      `Correct. A fresh Read reflects the file as it is after the pull, and Write puts back the full content with one value changed, which is the fallback when Edit has no unique anchor.`,
      `The path is correct, and the error reports six matches, which is a property of the file's content; the identical old_string will match the same six blocks on every retry.`
    ],
    trap: `Forcing Edit or a line-number sed instead of the Read plus Write fallback`,
    signals: `Decisive: the Edit error reports six matches of a byte-identical sub-block whose only unique context is about 40 lines higher, and the sed line number predates a pull that added 18 lines above it. Noise: the stricter yamllint profile and the 30-second reload, which do not affect how to make the edit.`
  },
  {
    id: 'e6-S2-12', scenario: 'S2', domain: 'D2', obj: 'O35', type: 'single', select: 1,
    stem: `<p>Larkspur Games has 26 developers on the live-ops backend for its mobile titles. The platform lead wants every Claude Code session in that repository to have two MCP servers: <code>flagpost</code>, the studio's internal feature-flag server, and the community Sentry server for looking up crash reports. Last week a developer set up both with <code>claude mcp add</code>, without a scope option, and pasted his personal Sentry token into the command. Both servers work in his sessions, but none of his teammates see either of them, and a Slack thread in which the lead explained the setup has produced four slightly different configurations.</p>
<p>The security policy forbids committing credentials to any repository, private or not, and every developer already has a personal Sentry token. The platform team plans to add a third shared server next quarter and does not want to ask 26 people to rerun setup commands. One developer has been trying an experimental Notion server for her own notes and wants to keep it out of everyone else's sessions.</p>
<p>The repository is private, and <code>flagpost</code> was rewritten from Python to Go in the spring, which halved its startup time.</p>
<p>Which configuration meets all of these needs?</p>`,
    options: [
      `Commit a project <code>.mcp.json</code> that defines both shared servers with the Sentry token written inline, since only employees can read the private repository, and keep the Notion server in her user scope.`,
      `Define both shared servers in a committed <code>.mcp.json</code> that reads the token through <code>\${SENTRY_TOKEN}</code>, have each developer export it, and keep the Notion server in her user scope.`,
      `Ask every developer to run <code>claude mcp add --scope user</code> for both shared servers with a personal token, so each laptop loads them in every project, and keep the Notion server in her user scope.`,
      `Build a custom MCP server that wraps the Sentry API and holds one service token on the server side, so no developer handles credentials, and document how to set up both shared servers in the wiki.`
    ],
    answer: [1],
    explanation: `Shared MCP servers belong in the project-scoped <code>.mcp.json</code>, which is committed with the repository and gives every session there the same servers. <code>claude mcp add</code> without a scope writes to local scope, which applies only to that developer in that project, so his teammates see nothing. Environment variable expansion keeps the secret out of version control: the file references <code>\${SENTRY_TOKEN}</code>, and each developer exports the personal token they already have. Next quarter's server then becomes one reviewed change to the file. The experimental Notion server is personal, so it belongs in her user scope in <code>~/.claude.json</code>. An inline token breaks the policy even in a private repository. Separate <code>--scope user</code> setups recreate the drift the Slack thread produced. A custom wrapper replaces a working community server for a standard integration and still leaves setup to each person. The <code>flagpost</code> rewrite is noise.`,
    rationales: [
      `Committing the token breaks the policy against credentials in any repository, private or not, even though the shared file and the decision about the Notion server are otherwise right.`,
      `Correct. The committed file gives all 26 developers the same two servers, expansion keeps each personal token out of Git, and the Notion experiment stays in her own user scope.`,
      `User scope is per-person configuration: 26 separate setups drift, as the Slack thread already showed, and next quarter's server would again require everyone to rerun commands.`,
      `Sentry is a standard integration with a working community server; a custom wrapper adds a service to build and operate, while each developer still configures both servers by hand.`
    ],
    trap: `Inline secrets or per-user setup for team-wide MCP servers`,
    signals: `Decisive: <code>claude mcp add</code> without a scope created local configuration that only one developer sees, the policy bans committed credentials in any repository, and one server is a personal experiment. Noise: the private repository, which tempts an inline token, and the rewrite of <code>flagpost</code> in Go.`
  },
  {
    id: 'e6-S2-13', scenario: 'S2', domain: 'D2', obj: 'O34', type: 'single', select: 1,
    stem: `<p>Brindle Bank's web team builds customer pages with Keel, the bank's in-house React design system of 140 components. The design-system team runs an MCP server with two tools: <code>search_components(query)</code>, which matches keywords against component names and returns the top 5, and <code>get_component(id)</code>, which returns props, usage examples and accessibility notes, about 3,000 tokens per component. The server's index already holds a name and a one-line description for every component, about 4,000 tokens in all. Part of a trace from building the account settings page:</p>
<pre>mcp__keel__search_components("toggle")         -&gt; Switch, ToggleButton
mcp__keel__search_components("toggle group")   -&gt; (no results)
mcp__keel__search_components("button group")   -&gt; ButtonGroup
mcp__keel__search_components("switch options") -&gt; Switch
mcp__keel__search_components("tabs")           -&gt; Tabs, TabPanel
... 29 more searches ...
Write src/settings/NotificationModeToggle.tsx</pre>
<p>Pages like this take 25 to 40 searches, and Claude often hand-builds a widget that Keel already provides; here it wrote a custom toggle group, although <code>SegmentedControl</code> exists for exactly that purpose. The full Keel documentation runs to 400 pages, and the team keeps CLAUDE.md under 200 lines. The design-system team can add features to the server this sprint. Last month the web team moved from Sonnet 5.5 to Opus 5.5, and search calls return in about 120 ms.</p>
<p>Which change most directly addresses the guessed searches?</p>`,
    options: [
      `Raise the number of index matches that each <code>search_components</code> call returns from 5 to 50, so every guessed keyword brings back more names and SegmentedControl is more likely to appear.`,
      `Add few-shot examples of effective queries to CLAUDE.md, such as searching "segmented" when a page needs an option group, so Claude learns which keywords match the names Keel uses.`,
      `Paste the 400-page Keel documentation into CLAUDE.md, so every component, prop and usage rule is already in context when a session starts and Claude never needs to search at all.`,
      `Expose the index of all 140 names and one-line descriptions as an MCP resource, so Claude can see what Keel offers before it builds, and keep <code>get_component</code> for details.`
    ],
    answer: [3],
    explanation: `MCP resources let a server expose a content catalog, so an agent can see what exists without exploratory tool calls. Claude cannot search for a component whose name it does not know: every query in the trace is a guess at Keel's vocabulary, and none of the keywords it tried leads to <code>SegmentedControl</code>. Publishing the 140 names and one-line descriptions as a resource, about 4,000 tokens, lets Claude choose the right component before it writes code, then call <code>get_component</code> for props and examples. Fifty results per call still depend on a keyword that matches a name, and "toggle group" matched nothing. Few-shot queries cover the cases someone anticipated, not the next unfamiliar widget. Pasting 400 pages into CLAUDE.md breaks the 200-line limit and loads detail most sessions never use. The Opus 5.5 move and the 120 ms latency are noise.`,
    rationales: [
      `More results help only when a keyword matches a name; "toggle group" returned nothing, and 50 matches per call add noise without telling Claude what Keel actually contains.`,
      `Example queries cover only the cases someone thought of in advance; the next page will need a widget nobody wrote an example for, and Claude will be back to guessing names.`,
      `400 pages would break the team's 200-line limit many times over and load every prop of every component into each session, burying the few details a page actually needs.`,
      `Correct. With the full index visible up front, Claude can pick <code>SegmentedControl</code> from its description before writing code and fetch details only for the components it chooses.`
    ],
    trap: `Tuning search or stuffing docs into CLAUDE.md instead of exposing the catalog as a resource`,
    signals: `Decisive: every search in the trace is a guess at component names, the index of 140 names and one-line descriptions is small, and the team can change the server this sprint. Noise: the move to Opus 5.5 and the 120 ms search latency, which do not explain why Claude cannot see what exists.`
  },
  {
    id: 'e6-S2-14', scenario: 'S2', domain: 'D1', obj: 'O06', type: 'single', select: 1,
    stem: `<p>Osprey Freight's routing team keeps a project subagent in <code>.claude/agents/reviewer.md</code> that checks Go changes when developers ask Claude to review their branch before opening a pull request. Last week the team adopted a structured logging standard, <code>log/slog</code> with request IDs instead of <code>log.Printf</code>, and updated the subagent's prompt to enforce it. Months earlier, a platform engineer wrote a shared wrapper script that most developers use to launch Claude Code, because it also sets up the corporate proxy. Excerpts:</p>
<pre>$ cat bin/cc
# shared launcher, added in March
export HTTPS_PROXY=http://proxy.osprey.internal:3128
exec claude --agents '{"reviewer": {
  "description": "Reviews Go changes against team standards",
  "prompt": "Review the diff for error wrapping, naming and log.Printf usage ...",
  "tools": ["Read", "Grep", "Glob", "Bash"]}}' "$@"

$ head -5 .claude/agents/reviewer.md
---
name: reviewer
description: Reviews Go changes against team standards
tools: Read, Grep, Glob
---</pre>
<p>Since the update, reviews in sessions started through <code>bin/cc</code> still approve new <code>log.Printf</code> calls (11 of the last 20 did), and some of them run <code>go test ./...</code> through Bash, which the team never meant the reviewer to do. Developers who start a plain <code>claude</code> session get reviews that enforce the new standard and never touch Bash. Neither definition sets a <code>model</code>. Claude Code was upgraded on every laptop on Tuesday, and the team enabled two new golangci-lint checks last week.</p>
<p>What is the most likely cause of the difference?</p>`,
    options: [
      `The wrapper's <code>--agents</code> definition has the same name as the project file and takes precedence over it, so wrapper sessions run the old inline prompt with a tool list that includes Bash.`,
      `The project file has no <code>model</code> field, so the reviewer falls back to a default model that ignores the new logging rules, and adding <code>model: opus</code> to its frontmatter would fix both symptoms.`,
      `Subagents inherit the main session's tools, and wrapper sessions allow Bash for the main agent, so the reviewer's own <code>tools</code> line is ignored; removing Bash from those sessions would fix it.`,
      `The reviewer's description overlaps the built-in general-purpose agent, so in wrapper sessions Claude sends reviews there instead, and a more specific description would route them back to the reviewer.`
    ],
    answer: [0],
    explanation: `When two subagent definitions share a name, Claude Code uses the one with higher priority, and definitions passed with <code>--agents</code> on the command line rank above project files in <code>.claude/agents/</code> (the order is managed, CLI flag, project, user, plugin). Every session started through <code>bin/cc</code> therefore gets the months-old inline <code>reviewer</code>: its prompt still describes <code>log.Printf</code>, and its tool list includes Bash, which explains both symptoms. Plain <code>claude</code> sessions pass no flag, so they load the updated project file. The fix is to remove the inline definition from the wrapper so the committed file is the single source; in the Agent SDK, too, programmatic definitions override same-name files. Neither definition sets <code>model</code>, so the model cannot explain a difference between the two kinds of session. A subagent with a <code>tools</code> list gets only those tools, and the description text is identical in both sessions. Tuesday's upgrade and the lint checks are noise.`,
    rationales: [
      `Correct. The CLI-flag definition outranks the project file with the same name, so wrapper sessions get the stale prompt and the Bash tool, while plain sessions load the updated file.`,
      `Neither definition sets a model, so both kinds of session resolve it the same way; a model field cannot explain why only wrapper sessions apply the old standard and run Bash.`,
      `Plain sessions also give the main agent Bash, yet their reviews never run it. A subagent with an explicit tools list gets only those tools, so inheritance is not the difference.`,
      `Both sessions see the same description, so routing cannot differ between them, and the symptoms match the old inline prompt exactly, which points to which definition loaded, not to routing.`
    ],
    trap: `Blaming model, tool inheritance or routing when a same-name CLI definition shadows the project file`,
    signals: `Decisive: <code>bin/cc</code> passes an inline <code>reviewer</code> with the old <code>log.Printf</code> prompt and Bash, and only sessions started through it misbehave. Noise: the missing <code>model</code> field, which both definitions share, Tuesday's Claude Code upgrade and the new golangci-lint checks.`
  },
  {
    id: 'e6-S2-15', scenario: 'S2', domain: 'D2', obj: 'O36', type: 'single', select: 1,
    stem: `<p>Sorrel Insurance's platform team runs <code>codeindex</code>, an internal MCP server built on the company's code-intelligence service. It is configured through a committed <code>.mcp.json</code> in each of the team's 12 repositories. Its <code>find_references(symbol)</code> tool resolves usages semantically across all 12 repositories: it follows import aliases, re-exports and dynamic imports, and returns each usage with repository, file, line and usage kind. The tool's entire description is "Find references."</p>
<p>During a refactor of the shared <code>PolicyQuote</code> type, Claude used built-in Grep in every session the team reviewed. It reported 31 usages in the current repository and missed 17 others: usages in other repositories and imports that rename the type, such as <code>import { PolicyQuote as Quote }</code>. Developers now start every refactoring request with "use codeindex for this." Grep remains the right tool for literal text such as log messages, error strings and feature-flag keys, which developers search for many times a day.</p>
<p>The server moved to a larger instance in July after a timeout incident, and the team is standardizing on Opus 5.5 for all Claude Code sessions.</p>
<p>Which change most effectively fixes the tool choice?</p>`,
    options: [
      `Add Grep to <code>permissions.deny</code> in the project <code>.claude/settings.json</code>, so that Claude can no longer fall back to text search and must call <code>find_references</code> whenever it looks for usages.`,
      `Add a CLAUDE.md rule telling Claude to always use codeindex instead of Grep when it searches code, so the reminder developers type today is loaded into every session automatically.`,
      `Rewrite the <code>find_references</code> description to state what it resolves beyond text matching, what each result contains, and when to prefer it over Grep, which stays the tool for literal strings.`,
      `Move the <code>codeindex</code> server from project scope to each developer's user scope, so that it loads before the built-in tools and Claude considers its tools first whenever it searches code.`
    ],
    answer: [2],
    explanation: `Claude chooses tools largely from their descriptions, and a two-word description gives it no reason to prefer an unfamiliar MCP tool over Grep, which it knows well. The description should say what <code>find_references</code> does that text search cannot (aliases, re-exports, dynamic imports, all 12 repositories), what each result contains, and when to use it instead of Grep, while leaving Grep as the choice for literal strings. That fixes selection in every session without a typed reminder. Denying Grep would break the many daily searches for log messages and flag keys. An "always use codeindex" rule is keyword-driven: it would push those literal searches to a symbol resolver and still leave the tool itself undescribed. Scope decides who gets a server, not its priority: tools from all configured servers are discovered at connection and available together, and user scope would also drop the shared configuration. The July instance move and Opus 5.5 are noise.`,
    rationales: [
      `A deny rule removes Grep from every session, breaking the literal searches for log messages, error strings and flag keys that developers run many times a day.`,
      `An always-use rule sends literal-text searches to a symbol resolver too, and it leaves the two-word description in place, so Claude still does not know what the tool returns.`,
      `Correct. A description that states capabilities, outputs and when to prefer the tool over Grep gives Claude the reason it is missing, while Grep stays the choice for literal text.`,
      `Tools from every configured server are discovered at connection and available together, so scope sets who gets the server, not priority; user scope also discards the shared project configuration.`
    ],
    trap: `Removing or mandating tools instead of fixing a minimal tool description`,
    signals: `Decisive: the tool's whole description is "Find references.", Claude picks Grep every time and misses aliased and cross-repository usages, and Grep is still needed for literal text. Noise: the July move to a larger instance and the Opus 5.5 standardization, which do not change what Claude knows about the tool.`
  }
]);
