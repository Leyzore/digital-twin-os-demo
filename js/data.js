// Digital Twin OS — public demo content.
// EVERYTHING in this file is fictional: projects, agents, clients, tasks, decisions, documents and figures.
// Nothing here comes from a real backend, real client, or private repository.

const DAY = 86400000;
export const daysAgo = (n) => new Date(Date.now() - n * DAY).toISOString().slice(0, 10);
export const inDays = (n) => new Date(Date.now() + n * DAY).toISOString().slice(0, 10);

export const FAMILIES = ["Platform", "AI Tools", "Clients", "Ideas & Personal"];

export const FOLDERS = [
  { id: "dtos", name: "Digital Twin OS", family: "Platform", status: "active", blurb: "The control layer: live graph, control tower, shared library and the MYSI coordinator." },
  { id: "forge", name: "Pipeline Forge", family: "Platform", status: "active", blurb: "A software factory that turns approved plans into reviewed, verified code." },
  { id: "sheet", name: "Sheet Pilot", family: "AI Tools", status: "active", blurb: "An AI spreadsheet engineer that plans, patches and verifies workbooks." },
  { id: "lens", name: "Repo Lens", family: "AI Tools", status: "active", blurb: "Explains open-source repositories and suggests where a newcomer can contribute." },
  { id: "harbor", name: "Harbor Clinic Intake", family: "Clients", status: "active", blurb: "Patient intake assistant pilot for a fictional clinic network." },
  { id: "acme", name: "Acme Logistics Console", family: "Clients", status: "paused", blurb: "Dispatch dashboard with anomaly alerts for a fictional freight carrier." },
  { id: "signal", name: "Signal Weekly", family: "Ideas & Personal", status: "active", blurb: "A weekly AI newsletter produced by a supervised drafting pipeline." },
  { id: "radar", name: "Market Radar", family: "Ideas & Personal", status: "active", blurb: "A weekly scan for under-served niches, with sources and confidence levels." },
  { id: "lab", name: "Learning Lab", family: "Ideas & Personal", status: "paused", blurb: "Study plans, practice blocks and reading notes." },
];

// kind: workstream | decision | evidence | deadend | component | note | reminder
// status (workstream): running | blocked | validate | todo | done ; (decision): decide
export const WORKSTREAMS = [
  { id: "w1", folder: "dtos", title: "Rendering engine v2 for the knowledge graph", status: "running", progress: 62, agent: "forge", age: "2 h ago", summary: "Moves node drawing to a pre-rendered glow sprite pipeline to keep large graphs smooth." },
  { id: "w2", folder: "dtos", title: "Library write-back with human review", status: "validate", progress: 100, agent: "archivist", age: "5 h ago", summary: "Agents can propose Library changes; nothing is accepted without a human decision.", result: "Proposal queue implemented. 12 of 12 checks passed. Two UI wording changes suggested by the reviewer were applied." },
  { id: "w3", folder: "forge", title: "Sandboxed test runner for generated code", status: "blocked", progress: 35, agent: "forge", age: "1 day ago", summary: "Runs generated code in an isolated container and reports deterministic test results.", reason: "The run needs permission to start a container runtime on this machine, and the consent for it has not been granted.", unblock: [{ label: "Grant sandbox access for this run", detail: "Allows one bounded run; permission expires afterwards." }, { label: "Switch to dry-run mode", detail: "Skips execution and only validates the plan and the diff." }] },
  { id: "w4", folder: "forge", title: "Independent reviewer pass on campaign #214", status: "validate", progress: 100, agent: "auditor", age: "3 h ago", summary: "A second model reviews the diff without seeing the author's reasoning.", result: "Reviewer found 1 blocking issue and 2 style notes. The author corrected the blocking issue; the second review passed." },
  { id: "w5", folder: "sheet", title: "Formula-repair planner for broken workbooks", status: "running", progress: 41, agent: "forge", age: "40 min ago", summary: "Detects broken references and proposes minimal, reversible formula edits." },
  { id: "w6", folder: "sheet", title: "Empty-cell detection benchmark", status: "todo", progress: 0, agent: "verifier", age: "2 days ago", summary: "Builds a labelled benchmark to measure how well empty cells are detected." },
  { id: "w7", folder: "lens", title: "Contribution-fit scoring (beta)", status: "running", progress: 78, agent: "scout", age: "1 h ago", summary: "Scores how well a repository matches a contributor's skills and available time." },
  { id: "w8", folder: "lens", title: "Security review of untrusted repository content", status: "blocked", progress: 20, agent: "auditor", age: "2 days ago", summary: "Checks how the agent behaves when repository files contain hostile instructions.", reason: "Waiting for the sandbox policy decision for untrusted repositories. Work resumes automatically once it is resolved.", blockedBy: "d5", unblock: [{ label: "Open the pending decision", detail: "Resolving the sandbox policy will unblock this workstream.", goto: "d5" }] },
  { id: "w9", folder: "harbor", title: "Intake form pilot: scope and consent flow", status: "validate", progress: 100, agent: "scout", age: "1 day ago", summary: "A first intake flow with explicit consent wording and a plain-language summary.", result: "Prototype flow complete. 9 of 10 test participants finished it without help; the consent wording needs one more pass." },
  { id: "w10", folder: "acme", title: "Anomaly alert tuning", status: "todo", progress: 0, agent: "forge", age: "6 days ago", summary: "Reduces false alerts by replaying historical dispatch data." },
  { id: "w11", folder: "signal", title: "Issue #47 draft pipeline", status: "todo", progress: 0, agent: "scout", age: "3 days ago", summary: "Collects sources, drafts the issue and queues it for human editing." },
  { id: "w12", folder: "radar", title: "Weekly opportunity scan", status: "done", progress: 100, agent: "scout", age: "4 days ago", summary: "Scans a fixed list of sources and ranks niches by evidence strength." },
];

// Each decision: options[{label, detail}], rec = index of the option MYSI would recommend, why = its short rationale.
export const DECISIONS = [
  { id: "d1", folder: "dtos", title: "Use one event format for all agent activity?", age: "2 days ago", ctx: "Today each agent writes its own log shape. A shared schema makes the activity feed and audits simpler, but requires a one-time migration.", options: [{ label: "Adopt the shared schema", detail: "Migrate all agents; keep old logs readable." }, { label: "Keep per-agent formats", detail: "No migration, harder to audit." }], rec: 0, why: "A single schema makes every later audit cheaper, and migration is reversible." },
  { id: "d2", folder: "dtos", title: "Should graph positions carry meaning?", age: "4 days ago", ctx: "A past experiment encoded structure in positions but the layout became unstable and misleading.", options: [{ label: "Keep positions decorative", detail: "Say so in the interface; encode meaning in shape and colour only." }, { label: "Try a stable layered layout", detail: "Another experiment, two days of work." }], rec: 0, why: "Shape and colour already carry meaning; the dead-end note shows why position did not work." },
  { id: "d3", folder: "forge", title: "Let Forge open pull requests automatically?", age: "1 day ago", ctx: "Forge prepares reviewed branches today. Opening the pull request itself would save a manual step but crosses into an external action.", options: [{ label: "Keep it manual", detail: "A human opens the pull request after reading the report." }, { label: "Allow it with a per-run consent", detail: "Each run asks once, in a separate window." }], rec: 0, why: "External actions should stay behind an explicit, separate consent." },
  { id: "d4", folder: "forge", title: "Raise the per-campaign compute budget from 5 to 8 units?", age: "3 days ago", ctx: "Two campaigns stopped at the cap before the reviewer pass. The extra budget is simulated compute units in this demo.", options: [{ label: "Raise to 8 units", detail: "Applies to new campaigns only." }, { label: "Keep 5 and split the work", detail: "Smaller campaigns, more approvals." }], rec: 1, why: "Smaller campaigns are easier to review and the cap protects the budget." },
  { id: "d5", folder: "lens", title: "Approve the sandbox policy for untrusted repositories", age: "2 days ago", ctx: "Repository files can contain hostile instructions. The proposed policy forbids network access, shell tools and writes outside a scratch folder.", options: [{ label: "Approve the policy", detail: "Unblocks the security review workstream." }, { label: "Ask for a stricter version", detail: "Adds read-only mounts; delays the review by a week." }], rec: 0, why: "The policy matches the evidence from the injection corpus and unblocks work.", unblocks: "w8" },
  { id: "d6", folder: "lens", title: "Publish the scoring method publicly?", age: "5 days ago", ctx: "Publishing the method builds trust, but it also reveals weights that could be gamed.", options: [{ label: "Publish a summary only", detail: "Describe inputs, not weights." }, { label: "Keep it internal for now", detail: "Revisit after the beta." }], rec: 0, why: "A summary builds trust without exposing the tunable weights." },
  { id: "d7", folder: "sheet", title: "Treat empty cells as zero in totals?", age: "3 days ago", ctx: "Treating blanks as zero is convenient but can hide missing data. A past attempt to let a model do arithmetic is recorded as a dead end.", options: [{ label: "Flag blanks, never assume zero", detail: "Totals show a warning when blanks are present." }, { label: "Treat blanks as zero", detail: "Matches spreadsheet default behaviour." }], rec: 0, why: "Silent assumptions are the main source of wrong totals." },
  { id: "d8", folder: "sheet", title: "Require a dry run before any workbook edit?", age: "1 day ago", ctx: "A dry run previews every change as a diff before touching the file.", options: [{ label: "Make dry runs mandatory", detail: "Edits are applied only after the diff is confirmed." }, { label: "Make them optional", detail: "Faster for trusted workbooks." }], rec: 0, why: "Edits to client workbooks should always be previewed." },
  { id: "d9", folder: "harbor", title: "Store intake drafts locally or in the client's tenant?", age: "2 days ago", ctx: "The pilot handles synthetic data only, but the production design must choose where drafts live.", options: [{ label: "Client tenant", detail: "Stronger ownership, more setup." }, { label: "Local only for the pilot", detail: "Simple; revisit before production." }], rec: 1, why: "The pilot uses synthetic data; a heavier setup can wait." },
  { id: "d10", folder: "harbor", title: "Is the consent wording clear enough to launch the pilot?", age: "6 h ago", ctx: "9 of 10 test participants completed the flow. One was unsure what consenting meant.", options: [{ label: "Launch with one more wording pass", detail: "Re-test with three people." }, { label: "Launch as is", detail: "Accept the risk of one confusing sentence." }], rec: 0, why: "A cheap re-test removes the only observed confusion." },
  { id: "d11", folder: "acme", title: "Alert threshold: fixed 3-sigma or adaptive?", age: "6 days ago", ctx: "Replayed data shows a fixed threshold misses slow drifts; an adaptive one is harder to explain to dispatchers.", options: [{ label: "Adaptive with an explanation panel", detail: "Each alert says why it fired." }, { label: "Fixed 3-sigma", detail: "Simple and predictable." }], rec: 0, why: "Explainable alerts keep the adaptive benefit without surprising dispatchers." },
  { id: "d12", folder: "acme", title: "Retire the legacy export endpoint?", age: "7 days ago", ctx: "Only one internal script still uses it.", options: [{ label: "Retire it", detail: "Remove after a two-week notice." }, { label: "Keep it for now", detail: "No action." }], rec: 0, why: "One remaining user is easy to migrate." },
  { id: "d13", folder: "signal", title: "Move the newsletter to biweekly during Q1?", age: "3 days ago", ctx: "Drafting time is stable, but source quality dips in the holiday weeks.", options: [{ label: "Biweekly in Q1", detail: "Higher quality, fewer issues." }, { label: "Stay weekly", detail: "Keep the habit." }], rec: 0, why: "Quality compounds more than frequency for a small newsletter." },
  { id: "d14", folder: "radar", title: "Drop the \"consumer apps\" scan category?", age: "4 days ago", ctx: "It produced noise for six weeks and no viable niche.", options: [{ label: "Drop it", detail: "Free the scan budget for other categories." }, { label: "Keep it for one more month", detail: "Collect more evidence first." }], rec: 0, why: "Six weeks without signal is already enough evidence." },
  { id: "d15", folder: "lab", title: "Start the statistics refresher now or after the launch?", age: "8 days ago", ctx: "Three practice blocks per week are available only if the launch slips nothing.", options: [{ label: "After the launch", detail: "Protect the launch date." }, { label: "Start now at one block per week", detail: "Slow but steady." }], rec: 1, why: "One block a week is cheap and keeps the habit alive." },
  { id: "d16", folder: "dtos", title: "Promote agent proposals to the Library only after human review?", age: "9 days ago", ctx: "Agents can propose Library changes. Accepting them automatically would be faster but removes the human check.", options: [{ label: "Always require human review", detail: "Proposals wait in a queue." }, { label: "Auto-accept low-risk proposals", detail: "Faster, harder to audit." }], rec: 0, why: "Memory that agents can edit unchecked is memory you cannot trust." },
];

export const EVIDENCE = [
  { id: "ev1", folder: "sheet", title: "Planner repaired 46 of 50 seeded formula errors", summary: "Run on a labelled set of 50 broken workbooks; 4 cases needed human help.", method: "Deterministic comparison against the expected workbook.", result: "46/50 (92%).", tags: ["benchmark", "spreadsheets"], links: ["w5", "c4"] },
  { id: "ev2", folder: "forge", title: "Generated code passed 14 of 14 unit tests in dry-run", summary: "The deterministic check runner executed the test suite for campaign #214.", method: "Check runner, no AI involved.", result: "14/14 tests, 0 lint errors.", tags: ["tests", "verification"], links: ["c3", "w4"] },
  { id: "ev3", folder: "lens", title: "Fit score matches maintainers' own picks in 71% of cases", summary: "24 repositories scored; maintainers chose their own best first issue independently.", method: "Rank correlation, n = 24.", result: "Correlation 0.71. Small sample, treat as indicative.", tags: ["scoring", "small-sample"], links: ["w7"] },
  { id: "ev4", folder: "dtos", title: "Graph renders 4,000 nodes at 60 fps on a mid-range laptop", summary: "Measured with the sprite-based renderer on a synthetic graph.", method: "Frame timing over 60 seconds.", result: "Median 16.2 ms per frame.", tags: ["performance", "graph"], links: ["w1"] },
  { id: "ev5", folder: "harbor", title: "9 of 10 test participants completed the consent flow unaided", summary: "Usability session with ten volunteers on synthetic scenarios.", method: "Moderated test, task completion.", result: "9/10 completed; 1 unsure about the consent wording.", tags: ["usability", "consent"], links: ["w9", "d10"] },
  { id: "ev6", folder: "acme", title: "Alert tuning cut false positives by 31% on replayed data", summary: "Replay of four weeks of synthetic dispatch data.", method: "Replay with labelled anomalies.", result: "False positives -31%, recall unchanged.", tags: ["alerts", "replay"], links: ["w10", "d11"] },
  { id: "ev7", folder: "signal", title: "The drafting pipeline produces an issue in under 6 minutes", summary: "Timed over five dry-run drafts.", method: "Wall-clock timing.", result: "Median 5 min 12 s.", tags: ["timing"], links: ["w11"] },
  { id: "ev8", folder: "dtos", title: "Library search puts exact title matches first (12 of 12 queries)", summary: "A fixed query set was checked against expected ranking.", method: "Deterministic ranking test.", result: "12/12.", tags: ["search", "tests"], links: ["w2", "c2"] },
  { id: "ev9", folder: "lens", title: "38 of 40 hostile-instruction samples were contained by the sandbox", summary: "A corpus of 40 prompt-injection samples was embedded in repository files.", method: "Automated corpus run in a sandbox.", result: "38 contained, 2 produced a harmless log warning.", tags: ["security", "sandbox"], links: ["w8", "d5"] },
  { id: "ev10", folder: "radar", title: "The weekly scan found 3 viable niches in 6 weeks", summary: "Each niche came with at least two independent sources.", method: "Manual review of scan reports.", result: "3 niches, 2 with strong evidence.", tags: ["scan", "niches"], links: ["w12", "d14"] },
];

export const DEADENDS = [
  { id: "x1", folder: "forge", title: "Letting the coding agent approve its own changes", summary: "Abandoned: self-approval removed the independence of review and hid two defects in a test run.", attempted: "Coder and reviewer shared one context.", why: "Review is only useful when the reviewer cannot see the author's reasoning.", tags: ["review", "abandoned"], links: ["d3", "w4"] },
  { id: "x2", folder: "sheet", title: "Letting a language model do cell arithmetic", summary: "Abandoned: totals were occasionally wrong with no warning. Replaced by a deterministic engine.", attempted: "Model computes sums directly.", why: "Probabilistic arithmetic is not acceptable for finance sheets.", tags: ["arithmetic", "abandoned"], links: ["d7", "c4"] },
  { id: "x3", folder: "dtos", title: "A force-directed layout whose positions mean something", summary: "Abandoned: layouts changed between loads and users read meaning into noise.", attempted: "Physics layout encoding similarity.", why: "Unstable layouts mislead. Shape and colour carry meaning instead.", tags: ["graph", "abandoned"], links: ["d2", "w1"] },
];

export const COMPONENTS = [
  { id: "c1", folder: "dtos", title: "Plan approval gate", summary: "A consent step that blocks work until a human approves the plan.", details: "Plans are shown as a short list of tasks with their limits. Approving a plan does not grant permissions; that is a separate step, the mandate.", maturity: "deliverable", exercised_with: "simulated run", tags: ["consent", "workflow"], claims: [{ text: "Work cannot start without an approved plan.", evidence: ["ev8"] }, { text: "Approval is recorded with a timestamp.", evidence: [] }], links: ["w2", "n2"] },
  { id: "c2", folder: "dtos", title: "Evidence-linked claims", summary: "Every claim in a record points to the evidence behind it or says it is not measured.", details: "Claims without evidence are shown as \"not measured\" rather than hidden. This keeps summaries honest.", maturity: "validated_for_reuse", exercised_with: "real run", tags: ["trust", "library"], claims: [{ text: "Search ranks exact title matches first.", evidence: ["ev8"] }], links: ["w2", "ev8"] },
  { id: "c3", folder: "forge", title: "Deterministic check runner", summary: "Runs tests, linters and file checks with no AI in the loop.", details: "Checks are the final authority for the properties they measure. A language model never overrules a failing check.", maturity: "validated_for_reuse", exercised_with: "real run", tags: ["verification", "tests"], claims: [{ text: "14 of 14 tests passed on campaign #214.", evidence: ["ev2"] }, { text: "Handles projects up to 5,000 files.", evidence: [] }], links: ["w3", "w4", "ev2"] },
  { id: "c4", folder: "sheet", title: "Workbook patch engine", summary: "Applies minimal, reversible edits to spreadsheet formulas and cells.", details: "Edits are expressed as patches so they can be previewed, applied and undone. The engine does all arithmetic; models only plan.", maturity: "experiment", exercised_with: "fake provider", tags: ["spreadsheets", "patching"], claims: [{ text: "Repairs 92% of seeded formula errors.", evidence: ["ev1"] }, { text: "Preserves formatting.", evidence: [] }], links: ["w5", "x2", "ev1"] },
  { id: "c5", folder: "lens", title: "Repository summariser", summary: "Builds a short map of a repository: purpose, structure, entry points.", details: "Treats repository files as untrusted input. It reads, summarises and never executes anything.", maturity: "experiment", exercised_with: "real run", tags: ["repositories", "summaries"], claims: [{ text: "Hostile instructions in files are contained.", evidence: ["ev9"] }], links: ["w7", "w8", "ev9"] },
  { id: "c6", folder: "dtos", title: "Activity event schema", summary: "One shape for every event: who, what, when, and how it was verified.", details: "Used by the live feed and the control tower. Each event is marked simulated, real or imported.", maturity: "deliverable", exercised_with: "simulated run", tags: ["events", "schema"], claims: [{ text: "All demo events use the schema.", evidence: [] }], links: ["d1", "w1"] },
  { id: "c7", folder: "dtos", title: "Review-by reminders", summary: "Records get a review date; overdue ones are flagged as stale.", details: "Prevents old conclusions from being treated as current. Overdue items appear in the Library health strip.", maturity: "exploratory", exercised_with: "not yet exercised", tags: ["freshness"], claims: [{ text: "Overdue records are flagged.", evidence: [] }], links: ["n4"] },
  { id: "c8", folder: "dtos", title: "Handoff note generator", summary: "Generates a project handoff note from the Library at the moment you ask.", details: "The note is composed from fields and links, not written by a model, so it is always current.", maturity: "deliverable", exercised_with: "real run", tags: ["handoff", "library"], claims: [{ text: "Notes list open decisions and the latest evidence.", evidence: [] }], links: ["w2"] },
];

export const NOTES = [
  { id: "n1", folder: "dtos", title: "Operating principles", summary: "Humans set goals. Agents propose. Code verifies. Memory is reviewed.", details: "1. A person owns every goal.\n2. Agents prepare, never publish.\n3. Deterministic checks are the authority for what they measure.\n4. A second, independent reviewer reads important work.\n5. Anything learned is a proposal until a person accepts it.", tags: ["principles"], links: ["d16", "c1"] },
  { id: "n2", folder: "dtos", title: "How consent gates work", summary: "Plan approval and mandate are two separate decisions.", details: "Approving a plan says \"this is the work\". Granting a mandate says \"these are the limits\": what may be read, written, spent. A gate can be declined at either step.", tags: ["consent"], links: ["c1"] },
  { id: "n3", folder: "dtos", title: "Glossary: workstream, mandate, campaign", summary: "Shared vocabulary used by people and agents.", details: "Workstream: a unit of ongoing work. Campaign: one bounded run from objective to report. Mandate: the limits for a campaign. Proposal: a suggested change awaiting review.", tags: ["glossary"], links: [] },
  { id: "n4", folder: "dtos", title: "Weekly review checklist", summary: "A ten-minute routine: blocked work, decisions, stale records.", details: "Open the Control Tower. Clear blocked items first, then decisions older than five days, then stale Library records.", tags: ["routine"], links: ["c7"] },
  { id: "n5", folder: "harbor", title: "Client pilot playbook", summary: "How a small pilot is scoped, run and closed.", details: "Define one measurable outcome. Use synthetic data. Agree the end date. Write the closing report before the pilot ends.", tags: ["clients", "playbook"], links: ["w9"] },
  { id: "n6", folder: "dtos", title: "Naming conventions", summary: "How workstreams, records and campaigns are named.", details: "Use a verb phrase for workstreams, a noun phrase for components, and a claim for evidence.", tags: ["style"], links: [] },
];

export const REMINDERS = [
  ["dtos", "Review the event-format proposal before Friday"], ["dtos", "Re-check graph accessibility labels"], ["dtos", "Archive last quarter's demo recordings"],
  ["forge", "Rotate the sandbox image monthly"], ["forge", "Re-run the regression suite after the dependency bump"], ["forge", "Update the reviewer checklist to v3"],
  ["sheet", "Add five more broken-workbook samples"], ["sheet", "Compare the planner against the baseline"], ["sheet", "Write the benchmark README"],
  ["lens", "Refresh the 24-repository evaluation set"], ["lens", "Document scoring caveats"], ["lens", "Check licence notes on sample repositories"],
  ["harbor", "Confirm the pilot timeline with the clinic lead"], ["harbor", "Archive anonymised test transcripts"], ["harbor", "Review accessibility of the intake form"],
  ["acme", "Replay last week's anomaly data"], ["acme", "Review alert wording with dispatchers"], ["acme", "Update runbook screenshots"],
  ["signal", "Collect three reader questions"], ["signal", "Check the links in issue 46"], ["signal", "Refresh the sponsor-free policy note"],
  ["radar", "Re-score the top five niches"], ["radar", "Prune stale sources"],
  ["lab", "Schedule the weekly practice block"], ["lab", "Capture notes on probability basics"], ["lab", "Revisit the reading list"],
].map(([folder, title], i) => ({ id: "r" + (i + 1), folder, title, age: ["1 day ago", "3 days ago", "5 days ago", "1 week ago"][i % 4] }));

// Extra cross links between records (besides "belongs to folder" and the links listed on each record).
export const EXTRA_LINKS = [
  ["dtos", "forge"], ["dtos", "sheet"], ["dtos", "lens"], ["dtos", "harbor"], ["dtos", "acme"], ["dtos", "signal"], ["dtos", "radar"], ["dtos", "lab"],
  ["forge", "sheet"], ["forge", "lens"], ["lens", "radar"], ["signal", "radar"],
  ["n1", "c3"], ["n2", "c2"], ["d1", "c6"], ["d8", "c4"], ["d9", "n5"], ["d12", "w10"], ["d13", "w11"], ["d6", "w7"], ["d4", "w3"], ["d15", "n4"],
];

export const AGENTS = [
  { id: "mysi", name: "MYSI", role: "Coordinator", blurb: "Understands the goal, splits the work, hands tasks to specialists and reports back. Never acts outside its mandate." },
  { id: "scout", name: "Scout", role: "Researcher", blurb: "Reads the Library and approved sources, returns cited findings." },
  { id: "forge", name: "Forge", role: "Developer", blurb: "Writes code inside a sandbox, on a branch, never on the main line." },
  { id: "auditor", name: "Auditor", role: "Independent reviewer", blurb: "Reviews work without seeing the author's reasoning." },
  { id: "verifier", name: "Verifier", role: "Deterministic checks", blurb: "Runs tests, linters and file checks. No AI in the loop; its verdict is final for what it measures." },
  { id: "archivist", name: "Archivist", role: "Librarian", blurb: "Proposes Library updates. Proposals wait for human review." },
];

export const MISSIONS = [
  {
    id: "m1", title: "Prepare the Harbor Clinic pilot brief", effort: "≈ 4 min (simulated)",
    objective: "Write a one-page pilot brief for the Harbor Clinic Intake project, citing only Library records.",
    agents: ["scout", "archivist", "auditor"],
    plan: ["Collect pilot requirements from Library notes and evidence", "Draft a one-page brief with a citation for every claim", "Independent review for unclear or unsupported statements"],
    mandate: { allow: ["Read Library records", "Write a draft file in the scratch area"], deny: ["Contact anyone", "Edit the Library directly", "Spend budget"] },
    work: [["scout", "Reading notes n5, ev5, w9 from the Library."], ["scout", "Found 7 relevant claims, 6 with evidence."], ["archivist", "Draft brief written: 312 words, 7 citations."], ["auditor", "Review: one claim lacks evidence (\"clinics prefer short forms\")."], ["archivist", "Claim removed from the brief and listed as \"not measured\"."], ["auditor", "Second review passed."]],
    checks: [["Every claim cites a Library record", "7 / 7", true], ["Word limit (400)", "312 words", true], ["Unsupported claims", "1 found, 1 removed", true]],
    result: "A one-page brief with seven cited claims and one explicit \"not measured\" item. No external message was sent.",
    lesson: "Attach the consent wording to every client brief.",
    effect: { addWorkstream: { folder: "harbor", title: "Pilot brief review and sign-off", status: "validate", progress: 100, agent: "archivist", summary: "One-page pilot brief prepared by agents, waiting for your judgement.", result: "Brief drafted with 7 cited claims and one \"not measured\" item. Reviewed twice by the Auditor." } },
  },
  {
    id: "m2", title: "Add a dry-run mode to the workbook patch engine", effort: "≈ 6 min (simulated)",
    objective: "Add a dry-run flag to the patch engine that previews every change as a diff without touching the file.",
    agents: ["scout", "forge", "auditor", "verifier"],
    plan: ["Read the patch engine component and its evidence", "Implement the dry-run flag in a sandbox branch", "Independent diff review", "Run deterministic checks (tests and lint)"],
    mandate: { allow: ["Read Library records", "Write to a sandbox branch"], deny: ["Merge to main", "Edit client workbooks", "Open pull requests"] },
    work: [["scout", "Read component c4 and evidence ev1. Summary sent to Forge."], ["forge", "Implemented --dry-run; 3 files changed."], ["auditor", "Review: dry-run still writes a temporary file. Blocking."], ["forge", "Fixed: dry-run now holds the diff in memory only."], ["auditor", "Second review passed."], ["verifier", "Ran 14 tests and the linter."]],
    checks: [["Unit tests", "14 / 14 pass", true], ["Linter", "0 errors", true], ["Files written in dry-run mode", "0", true]],
    result: "A sandbox branch with the dry-run flag, one corrected reviewer finding and all deterministic checks green. Nothing was merged.",
    lesson: "Add a check that dry-run mode never writes to disk.",
    effect: { addWorkstream: { folder: "sheet", title: "Dry-run mode for the workbook patch engine", status: "validate", progress: 100, agent: "forge", summary: "Previews every edit as a diff before any file is touched.", result: "14/14 tests pass, 0 lint errors. One blocking reviewer finding was fixed and re-reviewed." } },
  },
  {
    id: "m3", title: "Weekly review: summarise blocked work and propose next steps", effort: "≈ 3 min (simulated)",
    objective: "Summarise what is blocked and why, then propose the smallest next step for each item.",
    agents: ["scout", "archivist"],
    plan: ["List blocked and stale items from the Control Tower", "Read the related decisions and evidence", "Write two proposals; do not change any state"],
    mandate: { allow: ["Read the Control Tower", "Read Library records"], deny: ["Change any status", "Resolve decisions", "Contact anyone"] },
    work: [["scout", "2 blocked workstreams and 1 stale record found."], ["scout", "Linked evidence ev9 supports the sandbox policy."], ["archivist", "Proposal 1 drafted: split the test runner into two milestones."], ["archivist", "Proposal 2 drafted: review the oldest decision first."]],
    checks: [["Proposals change no state", "0 changes", true], ["Every proposal cites a source", "2 / 2", true]],
    result: "A short summary and two proposals. One proposal was added to your decision queue; the other is a note in this report.",
    lesson: "Run the weekly review on Mondays, before the decision queue grows.",
    effect: { addDecision: { folder: "forge", title: "Split the sandboxed test runner into two milestones?", age: "just now", ctx: "Proposed by MYSI during the weekly review: ship a dry-run milestone first, then the container runner once consent is available.", options: [{ label: "Split into two milestones", detail: "Dry-run first; container runner later." }, { label: "Keep one milestone", detail: "Wait for sandbox consent." }], rec: 0, why: "It delivers value while the consent question is open." } },
  },
];

export const ACTIVITY_SEED = [
  ["w4", "The second review of campaign #214 passed.", 8],
  ["ev2", "Deterministic checks: 14 of 14 tests passed.", 22],
  ["d10", "A decision was requested: consent wording for the pilot.", 41],
  ["w1", "Rendering engine v2 reached 62%.", 64],
  ["w3", "Run paused: waiting for sandbox consent.", 95],
  ["c8", "A handoff note was generated for Digital Twin OS.", 130],
  ["w9", "Result ready for your judgement: intake flow prototype.", 190],
  ["w12", "Weekly opportunity scan completed.", 260],
];

export const SIM_EVENTS = [
  (n) => `Scout read ${n} Library records for the current goal.`,
  () => "Verifier ran the file-integrity check: no changes found.",
  () => "Archivist drafted a Library proposal and queued it for review.",
  () => "Auditor started an independent review.",
  () => "MYSI reordered the queue: oldest decision first.",
  () => "A reminder was moved to the weekly review.",
  () => "Forge saved a draft to the scratch area.",
  () => "Library index refreshed: all records current.",
];
