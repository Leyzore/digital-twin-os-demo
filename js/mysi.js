// MYSI — simulated coordinator: scripted chat, example missions with consent gates, and agent coordination view.
// No model is called anywhere in this file. Responses are templates filled with the demo state.
import { store, STATUS } from "./store.js";
import { AGENTS, MISSIONS } from "./data.js";
import { h, clear, toast, cap } from "./ui.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const bold = (text) => String(text).split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((p) => (p.startsWith("**") ? h("strong", {}, p.slice(2, -2)) : p));
const agent = (id) => AGENTS.find((a) => a.id === id);
const STATE_LABEL = { idle: "Idle", working: "Working", reviewing: "Reviewing" };

const SUGGESTIONS = [
  "What needs my attention today?",
  "Why is the sandboxed test runner blocked?",
  "Which components are ready for reuse?",
  "What did the agents do recently?",
  "Plan a mission: prepare the Harbor Clinic pilot brief",
  "How do you decide who works on what?",
];

// ---------- scripted intelligence ----------
function foldersMentioned(q) { return store.byKind("folder").filter((f) => q.includes(f.title.toLowerCase()) || (f.title.split(" ")[0].length > 4 && q.includes(f.title.toLowerCase().split(" ").slice(0, 2).join(" ")))); }

function respond(text, ctx = {}) {
  const q = text.toLowerCase();
  const c = store.counts();
  const handle = store.toHandle();
  const src = (...items) => ({ t: "sources", items });

  if (ctx.decisionId && store.get(ctx.decisionId)) {
    const d = store.get(ctx.decisionId);
    if (d.status !== "decide") return { blocks: [{ t: "p", text: `That decision is already resolved${d.chosen ? `: **${d.chosen}**` : ""}.` }], follow: ["What needs my attention today?"] };
    const evidence = store.neighbors(d.id).filter((n) => n.kind === "evidence" || n.kind === "deadend");
    return {
      blocks: [
        { t: "p", text: `For **${d.title}** I would pick **${d.options[d.rec].label}**.` },
        { t: "p", text: d.why },
        evidence.length ? { t: "ul", items: evidence.map((e) => `${e.kind === "deadend" ? "Dead end" : "Evidence"}: ${e.title}`) } : { t: "p", text: "No evidence is attached to this decision yet, so treat my suggestion as a judgement call." },
        { t: "proposal", title: `Record the decision: ${d.options[d.rec].label}`, detail: "Applies immediately in the Control Tower and the Live graph. You can defer instead from the Tower.", apply: () => { store.resolveDecision(d.id, d.rec); return "Decision recorded."; } },
        src(...evidence.map((e) => ({ label: e.id, go: () => ["library", { open: e.id }] })), { label: "Decision in Tower", go: () => ["tower", { tab: "handle", open: d.id }] }),
      ], follow: ["What needs my attention today?"],
    };
  }

  if (ctx.nodeId || /why is .*(blocked|stuck)|blocked|stuck|sandbox|unblock/.test(q)) {
    const blocked = ctx.nodeId ? [store.get(ctx.nodeId)] : store.byKind("workstream").filter((w) => w.status === "blocked");
    if (!blocked.length || !blocked[0]) return { blocks: [{ t: "p", text: "Nothing is blocked right now. Good moment to clear the decision queue." }], follow: ["What needs my attention today?"] };
    const blocks = [{ t: "p", text: `${blocked.length === 1 ? "One workstream is" : `${blocked.length} workstreams are`} blocked, and both stopped for a reason that needs **you**, not more compute:` }];
    blocked.forEach((w) => {
      blocks.push({ t: "ul", items: [`**${w.title}** (${store.folderName(w.folder)}): ${w.reason}`] });
      if (w.blockedBy && store.get(w.blockedBy)?.status === "decide") blocks.push({ t: "proposal", title: `Open the pending decision: ${store.get(w.blockedBy).title}`, detail: "Resolving it resumes this workstream automatically.", apply: () => { const d = store.get(w.blockedBy); store.resolveDecision(d.id, d.rec); return `Decided. "${w.title}" is running again.`; }, label: "Approve my suggestion" });
      else if (w.unblock) blocks.push({ t: "proposal", title: w.unblock[0].label, detail: w.unblock[0].detail + " I will not do this without your approval.", apply: () => { store.unblock(w.id, 0); return `"${w.title}" is running again.`; } });
    });
    blocks.push(src({ label: "Control Tower", go: () => ["tower", { tab: "handle", filter: "blocked" }] }, { label: "Evidence ev9", go: () => ["library", { open: "ev9" }] }));
    return { blocks, follow: ["Which components are ready for reuse?", "What needs my attention today?"] };
  }

  const folders = foldersMentioned(q);
  if (folders.length && !/plan|mission|launch|brief/.test(q)) {
    const f = folders[0];
    const ws = store.byKind("workstream").filter((w) => w.folder === f.id);
    const dec = store.byKind("decision").filter((d) => d.folder === f.id && d.status === "decide");
    return {
      blocks: [{ t: "p", text: `**${f.title}** (${f.family}): ${f.summary}` },
        { t: "ul", items: [...ws.map((w) => `${w.title} — ${STATUS[w.status].label.toLowerCase()}${w.status === "running" ? ` (${w.progress}%)` : ""}`), ...dec.map((d) => `Decision waiting: ${d.title}`)] },
        src({ label: f.title + " in Library", go: () => ["library", { open: f.id }] }, { label: "Show in graph", go: () => ["live", { select: f.id }] })],
      follow: ["What needs my attention today?"],
    };
  }

  if (/attention|today|priorit|status|overview|what.*(need|next)|summar.*(week|work)|weekly/.test(q)) {
    const top = handle.slice(0, 3);
    return {
      blocks: [
        { t: "p", text: `Here is where things stand: **${c.blocked} blocked**, **${c.validate} result${c.validate === 1 ? "" : "s"} to validate**, **${c.decide} decision${c.decide === 1 ? "" : "s"} waiting**, and **${c.running} workstream${c.running === 1 ? "" : "s"} running** on their own.` },
        top.length ? { t: "p", text: "If you only have ten minutes, I would do these in order:" } : { t: "p", text: "Nothing is waiting for you. I will keep working on the running streams." },
        top.length ? { t: "ul", items: top.map((n, i) => `${i + 1}. **${n.title}** — ${n.kind === "decision" ? "decide" : n.status === "blocked" ? "unblock" : "review the result"} (${store.folderName(n.folder)})`) } : null,
        src({ label: "Open the queue", go: () => ["tower", { tab: "handle" }] }, { label: "Weekly review checklist", go: () => ["library", { open: "n4" }] }),
      ].filter(Boolean), follow: ["Why is the sandboxed test runner blocked?", "Plan a mission: weekly review"],
    };
  }

  if (/component|reuse|ready|mature|validated/.test(q)) {
    const comps = store.byKind("component").filter((x) => ["validated_for_reuse", "deliverable"].includes(x.maturity));
    return {
      blocks: [{ t: "p", text: `${comps.length} components are mature enough to reuse. Maturity is a label I report, not a guess: it comes from the Library record.` },
        { t: "ul", items: comps.map((x) => `**${x.title}** — ${x.maturity === "validated_for_reuse" ? "validated for reuse" : "deliverable"}, exercised with ${x.exercised_with}`) },
        { t: "p", text: "Two of them have claims with no evidence yet; the Library shows those as **not measured**." },
        src(...comps.slice(0, 3).map((x) => ({ label: x.id, go: () => ["library", { open: x.id }] })), { label: "Browse components", go: () => ["library", { }] })],
      follow: ["How do you know that?", "What needs my attention today?"],
    };
  }

  if (/evidence|proof|how do you know|sure|source|cite/.test(q)) {
    return { blocks: [{ t: "p", text: "Every claim in a Library record either points to evidence or is labelled **not measured**. I do not turn my own summaries into knowledge: anything I learn is a **proposal** until you accept it." }, { t: "ul", items: ["Evidence records state method and result.", "Deterministic checks (tests, linters) are final for what they measure.", "Dead ends are kept, so nobody repeats them."] }, src({ label: "Evidence-linked claims", go: () => ["library", { open: "c2" }] })], follow: ["Which components are ready for reuse?"] };
  }

  if (/library|record|stale|overdue|knowledge/.test(q)) {
    return { blocks: [{ t: "p", text: "The Library holds projects, components, evidence, dead ends and notes. You can search it, filter by maturity, and generate a handoff note for any project." }, src({ label: "Open the Library", go: () => ["library", {}] }, { label: "Handoff for Digital Twin OS", go: () => ["library", { open: "dtos" }] })], follow: ["Which components are ready for reuse?"] };
  }

  if (/recent|overnight|did the agents|activity|happened|log/.test(q)) {
    return { blocks: [{ t: "p", text: "Latest simulated activity:" }, { t: "ul", items: store.activity.slice(0, 5).map((a) => a.text) }, src({ label: "Activity in Tower", go: () => ["tower", { tab: "activity" }] }, { label: "Live feed", go: () => ["live", {}] })], follow: ["What needs my attention today?"] };
  }

  if (/mission|plan|launch|brief|dry.?run|weekly review|run/.test(q)) {
    const pick = /dry.?run|patch|engine|workbook|code/.test(q) ? MISSIONS[1] : /weekly|review|blocked|propos/.test(q) ? MISSIONS[2] : MISSIONS[0];
    return {
      blocks: [{ t: "p", text: `I can run that as a bounded mission. I will write a plan, you approve it, then you grant a mandate with explicit limits — only then do agents start.` }, { t: "mission", id: pick.id },
        { t: "p", text: "Other example missions are available in the Missions tab." }], follow: ["How do you decide who works on what?"],
    };
  }

  if (/who works|decide who|coordinate|agents|how do you|how does|consent|mandate|permission/.test(q)) {
    return {
      blocks: [{ t: "p", text: "I split a goal into tasks and give each one to the specialist best suited to it. I never act outside a **mandate** you have granted." },
        { t: "ul", items: AGENTS.slice(1).map((a) => `**${a.name}** (${a.role}): ${a.blurb}`) },
        { t: "p", text: "Two rules protect you: the author of a change is never its reviewer, and deterministic checks overrule any opinion." }],
      follow: ["Plan a mission: prepare the Harbor Clinic pilot brief"],
    };
  }

  if (/real|fake|simulat|model|gpt|claude|llm|private|data|safe/.test(q)) {
    return { blocks: [{ t: "p", text: "Honest answer: **this is a simulation.** I am a set of scripted responses filled with fictional demo data. No AI model is called, nothing is stored, and no real project, client or repository is involved." }, { t: "p", text: "In the real product, the same interface sits on top of a local registry and a shared Library, and agents run only with your consent." }], follow: ["What needs my attention today?"] };
  }

  if (/^(hi|hello|hey|help|what can you)|can you do/.test(q.trim())) {
    return { blocks: [{ t: "p", text: "I can summarise what needs you, explain why work is blocked, find mature components, recommend how to settle a decision, and plan bounded missions for the agent team." }], follow: SUGGESTIONS.slice(0, 4) };
  }

  if (ctx.recordId || /tell me about|what is|explain/.test(q)) {
    const rid = ctx.recordId || [...store.nodes.values()].find((n) => q.includes(n.title.toLowerCase()))?.id;
    const n = rid && store.get(rid);
    if (n) {
      const nb = store.neighbors(n.id).filter((x) => x.kind !== "reminder").slice(0, 4);
      return { blocks: [{ t: "p", text: `**${n.title}** — ${n.summary}` }, nb.length ? { t: "p", text: "Connected to: " + nb.map((x) => x.title).join("; ") + "." } : null, src({ label: "Open in Library", go: () => ["library", { open: n.id }] }, { label: "Show in graph", go: () => ["live", { select: n.id }] })].filter(Boolean), follow: ["What needs my attention today?"] };
    }
  }

  return {
    blocks: [{ t: "p", text: "In this demo I only know a small set of topics, so I may have missed your question. I can help with:" }, { t: "ul", items: ["what needs your attention", "why work is blocked", "which components are ready to reuse", "recent agent activity", "planning a mission", "how coordination and consent work"] }],
    follow: SUGGESTIONS.slice(0, 4),
  };
}

// ---------- view ----------
export function createMysi(app) {
  const el = h("div", { class: "wrap mysi", dataset: { pane: "chat" } });
  const threads = [
    { id: "t0", title: "New conversation", when: "now", messages: [] },
    { id: "t1", title: "Weekly review", when: "yesterday", messages: [{ role: "user", blocks: [{ t: "p", text: "Give me the weekly review." }] }, { role: "mysi", blocks: [{ t: "p", text: "Last week: **2 workstreams finished**, 1 stalled on a consent question and 3 decisions aged beyond five days." }, { t: "ul", items: ["Finished: weekly opportunity scan; library write-back prototype", "Stalled: sandboxed test runner (waiting for your consent)", "Oldest decision: \"Start the statistics refresher now or after the launch?\""] }] }] },
    { id: "t2", title: "Harbor Clinic scope", when: "3 days ago", messages: [{ role: "user", blocks: [{ t: "p", text: "What did the intake pilot test tell us?" }] }, { role: "mysi", blocks: [{ t: "p", text: "9 of 10 volunteers completed the consent flow unaided. One person was unsure what consenting meant, so I suggest one more wording pass before launch." }, { t: "sources", items: [{ label: "ev5", go: () => ["library", { open: "ev5" }] }] }] }] },
  ];
  let cur = threads[0], busy = false, pane = "chat", sel = null, run = null, token = 0;
  const runs = {}; // mission effect applied once per session

  const msgBox = h("div", { class: "msgs", role: "log", "aria-live": "polite" });
  const input = h("textarea", { class: "input chatin", rows: "1", placeholder: "Ask MYSI… (scripted demo answers)", "aria-label": "Message MYSI", onkeydown: (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }, oninput: () => { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 120) + "px"; } });
  const sendBtn = h("button", { class: "btn", onclick: () => send() }, "Send");
  const chips = h("div", { class: "chiprow sugg" });
  const threadList = h("div", { class: "threads" });
  const left = h("aside", { class: "mleft panel" });
  const center = h("section", { class: "mcenter panel" });
  const rail = h("aside", { class: "mrail" });
  const segs = h("div", { class: "segs", role: "tablist" });
  const chatPane = h("div", { class: "chatpane" }, msgBox, chips, h("div", { class: "composer" }, input, sendBtn));
  const missionPane = h("div", { class: "missionpane" });

  el.append(
    h("header", { class: "thead" }, h("div", {}, h("div", { class: "eyebrow" }, "MYSI"), h("h2", {}, "The central coordinator"),
      h("p", { class: "muted libintro" }, "Ask questions, then run a mission: MYSI plans, you approve, agents work inside a mandate you grant, and code verifies the result.")),
      h("span", { class: "tag sim big" }, "Simulation · scripted responses · no AI model called")),
    segs,
    h("div", { class: "mgrid" }, left, center, rail));
  center.append(chatPane, missionPane);

  function setPane(p) { pane = p; el.dataset.pane = p; renderSegs(); if (p === "chat") scrollEnd(); }
  function renderSegs() {
    clear(segs);
    [["chat", "Chat"], ["missions", "Missions"], ["agents", "Agents"]].forEach(([id, l]) => segs.append(h("button", { role: "tab", class: id === "agents" ? "onlysmall" : "", "aria-selected": String(pane === id), onclick: () => setPane(id) }, l)));
  }

  // ----- left rail -----
  function renderLeft() {
    clear(left);
    left.append(h("div", { class: "phead" }, h("h3", {}, "Conversations"), h("button", { class: "btn small ghost", onclick: newThread }, "+ New")));
    threads.forEach((t) => left.append(h("button", { class: "thread" + (t === cur ? " on" : ""), onclick: () => { cur = t; setPane("chat"); renderLeft(); renderMessages(); } }, h("b", {}, t.title), h("span", { class: "hint" }, t.when))));
    left.append(h("hr"), h("div", { class: "phead" }, h("h3", {}, "Example missions")));
    MISSIONS.forEach((m) => left.append(h("button", { class: "thread" + (sel === m.id && pane === "missions" ? " on" : ""), onclick: () => { openMission(m.id); } }, h("b", {}, m.title), h("span", { class: "hint" }, m.effort))));
    left.append(h("p", { class: "hint note" }, "Missions are animated simulations. Nothing is executed."));
  }
  function newThread() {
    const t = { id: "t" + Date.now(), title: "New conversation", when: "now", messages: [] };
    threads.unshift(t); cur = t; setPane("chat"); renderLeft(); renderMessages();
  }

  // ----- chat -----
  function renderBlocks(blocks, container, instant = true) {
    blocks.forEach((b) => container.append(blockEl(b)));
  }
  function blockEl(b) {
    if (b.t === "p") return h("p", {}, bold(b.text));
    if (b.t === "ul") return h("ul", {}, b.items.map((i) => h("li", {}, bold(i))));
    if (b.t === "sources") return h("div", { class: "srcs" }, h("span", { class: "hint" }, "Sources:"), b.items.map((s) => h("button", { class: "chip", onclick: () => { const [r, p] = s.go(); app.go(r, p); } }, s.label)));
    if (b.t === "mission") {
      const m = MISSIONS.find((x) => x.id === b.id);
      return h("div", { class: "mcard" }, h("div", { class: "eyebrow" }, "Mission proposal"), h("b", {}, m.title), h("p", { class: "hint" }, m.objective),
        h("div", { class: "agentrow" }, m.agents.map((a) => h("span", { class: "ag" }, agent(a).name))), h("button", { class: "btn small", onclick: () => openMission(m.id) }, "Review the plan →"));
    }
    if (b.t === "proposal") {
      const btns = h("div", { class: "actions" });
      const card = h("div", { class: "mcard prop" }, h("div", { class: "eyebrow" }, "Proposal · needs your approval"), h("b", {}, b.title), h("p", { class: "hint" }, b.detail), btns);
      btns.append(h("button", { class: "btn small mint", onclick: () => { const msg = b.apply(); btns.replaceChildren(h("span", { class: "tag done" }, "✓ Approved and applied")); toast(msg); } }, b.label || "Approve"), h("button", { class: "btn small ghost", onclick: () => btns.replaceChildren(h("span", { class: "tag reminder" }, "Dismissed — nothing changed")) }, "Dismiss"));
      return card;
    }
    return document.createTextNode("");
  }
  function msgEl(m) {
    const wrap = h("div", { class: "msg " + m.role }, h("div", { class: "who" }, m.role === "user" ? "You" : "MYSI"), h("div", { class: "bub" }));
    renderBlocks(m.blocks, wrap.lastChild);
    return wrap;
  }
  function renderMessages() {
    clear(msgBox);
    if (!cur.messages.length) cur.messages.push({ role: "mysi", blocks: [{ t: "p", text: "Hello. I am MYSI, the coordinator in this demo. I read the Library and the Control Tower, propose plans, and hand work to specialist agents — only after you approve a plan and grant a mandate." }, { t: "p", text: "**Everything here is simulated:** my answers are scripted and no AI model is being called. Try a suggestion below." }] });
    cur.messages.forEach((m) => msgBox.append(msgEl(m)));
    renderChips(cur.messages.length <= 1 ? SUGGESTIONS : cur.follow || SUGGESTIONS.slice(0, 3));
    scrollEnd();
  }
  function renderChips(list) {
    clear(chips);
    list.forEach((s) => chips.append(h("button", { class: "chip", onclick: () => send(s) }, s)));
  }
  const scrollEnd = () => requestAnimationFrame(() => (msgBox.scrollTop = msgBox.scrollHeight));

  async function send(text, ctx = {}) {
    text = (text ?? input.value).trim();
    if (!text || busy) return;
    busy = true; input.value = ""; input.style.height = "auto"; sendBtn.disabled = true;
    if (pane !== "chat") setPane("chat");
    if (cur.title === "New conversation") { cur.title = text.length > 34 ? text.slice(0, 33) + "…" : text; renderLeft(); }
    const um = { role: "user", blocks: [{ t: "p", text }] };
    cur.messages.push(um); msgBox.append(msgEl(um)); clear(chips); scrollEnd();
    store.setMysi("working");
    const typing = h("div", { class: "msg mysi" }, h("div", { class: "who" }, "MYSI"), h("div", { class: "bub typing" }, h("i"), h("i"), h("i")));
    msgBox.append(typing); scrollEnd();
    await sleep(650 + Math.random() * 450);
    const res = respond(text, ctx);
    typing.remove();
    const m = { role: "mysi", blocks: res.blocks };
    cur.messages.push(m); cur.follow = res.follow;
    const wrap = h("div", { class: "msg mysi" }, h("div", { class: "who" }, "MYSI"), h("div", { class: "bub" }));
    msgBox.append(wrap);
    for (const b of res.blocks) {
      if (b.t === "p") {
        const p = h("p", {}); wrap.lastChild.append(p);
        const words = b.text.split(" ");
        let acc = "";
        for (let i = 0; i < words.length; i++) { acc += (i ? " " : "") + words[i]; if (i % 3 === 2 || i === words.length - 1) { p.replaceChildren(...bold(acc)); scrollEnd(); await sleep(26); } }
      } else { await sleep(140); wrap.lastChild.append(blockEl(b)); scrollEnd(); }
    }
    renderChips(res.follow || SUGGESTIONS.slice(0, 3));
    store.setMysi("idle"); busy = false; sendBtn.disabled = false;
    scrollEnd();
  }

  // ----- missions -----
  function renderMissionList() {
    clear(missionPane); sel = null; run = null;
    missionPane.append(h("div", { class: "eyebrow" }, "Example missions"), h("h3", { class: "mh" }, "Choose a mission to simulate"),
      h("p", { class: "muted" }, "Each mission follows the same path: objective → plan → mandate → work → results → lessons. You decide at each gate."),
      h("div", { class: "mlist" }, MISSIONS.map((m) => h("article", { class: "mcard big", tabindex: "0", onclick: () => openMission(m.id), onkeydown: (e) => e.key === "Enter" && openMission(m.id) },
        h("div", { class: "eyebrow" }, m.effort), h("b", {}, m.title), h("p", { class: "hint" }, m.objective), h("div", { class: "agentrow" }, m.agents.map((a) => h("span", { class: "ag" }, agent(a).name))), h("button", { class: "btn small" }, "Open mission →")))));
  }

  function openMission(id) {
    const m = MISSIONS.find((x) => x.id === id); if (!m) return;
    token++; sel = id; run = { m, step: 0, log: [], done: false };
    pane = "missions"; el.dataset.pane = "missions"; renderSegs(); renderLeft(); renderMission();
  }

  const STEPS = ["Objective", "Plan", "Mandate", "Work", "Results", "Lessons"];
  function renderMission() {
    clear(missionPane);
    if (!run) { renderMissionList(); return; }
    const { m, step } = run;
    const stepper = h("ol", { class: "stepper" }, STEPS.map((s, i) => h("li", { class: i < step ? "done" : i === step ? "now" : "" }, h("i", {}, i < step ? "✓" : i + 1), h("span", {}, s))));
    const body = h("div", { class: "mbody" });
    missionPane.append(h("button", { class: "btn small ghost back", onclick: () => { token++; renderMissionList(); store.setMysi("idle"); AGENTS.forEach((a) => store.agentState[a.id] = "idle"); store.emit({ mysi: true }); } }, "← All missions"), h("h3", { class: "mh" }, m.title), stepper, body);
    const gate = (title, text, ...btns) => body.append(h("div", { class: "gate" }, h("div", { class: "eyebrow" }, title), text, h("div", { class: "actions" }, btns)));
    if (step === 0) {
      body.append(h("div", { class: "block" }, h("div", { class: "eyebrow" }, "Objective (set by you)"), h("p", {}, m.objective)),
        h("div", { class: "block" }, h("div", { class: "eyebrow" }, "Agents MYSI would involve"), h("div", { class: "agentrow" }, m.agents.map((a) => h("span", { class: "ag", title: agent(a).blurb }, agent(a).name + " · " + agent(a).role)))));
      gate("Next", h("p", { class: "hint" }, "MYSI will turn this into a plan. Nothing runs yet."), h("button", { class: "btn", "data-autofocus": "", onclick: async (e) => { e.target.disabled = true; e.target.textContent = "Planning…"; store.setMysi("working"); await sleep(900); store.setMysi("idle"); run.step = 1; renderMission(); } }, "Ask MYSI for a plan"));
    } else if (step === 1) {
      body.append(h("div", { class: "block" }, h("div", { class: "eyebrow" }, "Proposed plan · " + m.plan.length + " tasks"), h("ol", { class: "plan" }, m.plan.map((t) => h("li", {}, t)))));
      gate("Gate 1 · Plan approval", h("p", { class: "hint" }, "Approving the plan says \"this is the work\". It does not grant any permission."), h("button", { class: "btn", onclick: () => { run.step = 2; renderMission(); } }, "Approve plan"), h("button", { class: "btn ghost", onclick: () => { run.step = 0; renderMission(); toast("Plan declined. Nothing ran."); } }, "Decline"));
    } else if (step === 2) {
      body.append(h("div", { class: "twocolm" }, h("div", { class: "block ok" }, h("div", { class: "eyebrow" }, "Allowed"), h("ul", {}, m.mandate.allow.map((x) => h("li", {}, "✓ " + x)))), h("div", { class: "block no" }, h("div", { class: "eyebrow" }, "Not allowed"), h("ul", {}, m.mandate.deny.map((x) => h("li", {}, "✕ " + x))))));
      gate("Gate 2 · Mandate", h("p", { class: "hint" }, "A mandate sets the limits for this mission only. In the real product, consent is given in a separate window."), h("button", { class: "btn", onclick: () => { run.step = 3; renderMission(); startWork(); } }, "Grant mandate and start"), h("button", { class: "btn ghost", onclick: () => { run.step = 1; renderMission(); } }, "Back to plan"));
    } else if (step === 3) {
      const logBox = h("div", { class: "worklog", "aria-live": "polite" });
      body.append(h("div", { class: "block" }, h("div", { class: "eyebrow" }, "Work in progress (simulated)"), h("div", { class: "progress" }, h("i", { id: "mprog", style: { width: "0%" } })), logBox),
        h("div", { class: "actions" }, h("button", { class: "btn small ghost", onclick: () => skipWork() }, "Skip animation")));
      run.log.forEach((l) => logBox.append(logLine(l)));
      run.logBox = logBox;
    } else if (step === 4) {
      body.append(h("div", { class: "block" }, h("div", { class: "eyebrow" }, "Deterministic checks (no AI)"), h("table", { class: "ktable" }, m.checks.map(([a, b, ok]) => h("tr", {}, h("td", {}, a), h("td", {}, h("span", { class: "tag " + (ok ? "running" : "blocked") }, (ok ? "✓ " : "✕ ") + b)))))),
        h("div", { class: "block" }, h("div", { class: "eyebrow" }, "Result"), h("p", {}, m.result)),
        h("div", { class: "block" }, h("div", { class: "eyebrow" }, "Work log"), h("div", { class: "worklog small" }, run.log.map(logLine))));
      const eff = m.effect.addWorkstream ? "A workstream was added to the Control Tower for your validation." : m.effect.addDecision ? "A decision was added to your Control Tower queue." : "";
      gate("Outcome", h("p", { class: "hint" }, eff), h("button", { class: "btn", onclick: () => { run.step = 5; renderMission(); } }, "See proposed lesson"), h("button", { class: "btn ghost", onclick: () => app.go("tower", { tab: "handle" }) }, "Open Control Tower"));
    } else {
      body.append(h("div", { class: "block" }, h("div", { class: "eyebrow" }, "Proposed lesson · not accepted knowledge"), h("p", { class: "lesson" }, "\u201C" + m.lesson + "\u201D"), h("p", { class: "hint" }, "Lessons are proposals. They enter the Library only after a person reviews them — never automatically.")));
      const out = h("div", { class: "actions" },
        h("button", { class: "btn mint", onclick: () => { out.replaceChildren(h("span", { class: "tag done" }, "✓ Queued for review in the Library")); store.log(`Lesson proposal queued for review: "${m.lesson}"`, null, "system"); store.emit(); toast("Lesson queued for review. Not accepted yet."); } }, "Queue for review"),
        h("button", { class: "btn ghost", onclick: () => out.replaceChildren(h("span", { class: "tag reminder" }, "Dismissed")) }, "Dismiss"),
        h("button", { class: "btn ghost", onclick: () => { token++; renderMissionList(); } }, "Run another mission"));
      body.append(out);
    }
  }

  const logLine = ([a, text]) => h("div", { class: "ll" }, h("span", { class: "ag" }, agent(a).name), h("span", {}, text));
  async function startWork() {
    const my = ++token; const { m } = run; run.log = [];
    store.setMysi("working");
    for (let i = 0; i < m.work.length; i++) {
      if (my !== token) return;
      const [a, text] = m.work[i];
      store.agentState[a] = a === "auditor" ? "reviewing" : "working"; store.agentState.mysi = "working"; store.emit({ mysi: true });
      await sleep(1100);
      if (my !== token) return;
      run.log.push([a, text]);
      if (run.logBox && run.step === 3) { run.logBox.append(logLine([a, text])); const pr = document.getElementById("mprog"); if (pr) pr.style.width = Math.round(((i + 1) / m.work.length) * 100) + "%"; }
      store.agentState[a] = "idle"; store.emit({ mysi: true });
    }
    finishWork(my);
  }
  function skipWork() { const my = ++token; run.log = [...run.m.work]; finishWork(my); }
  function finishWork(my) {
    if (my !== token || !run) return;
    const { m } = run;
    AGENTS.forEach((a) => (store.agentState[a.id] = "idle"));
    store.mysiState = "idle";
    if (!runs[m.id]) {
      runs[m.id] = true;
      if (m.effect.addWorkstream) store.addWorkstream(m.effect.addWorkstream);
      if (m.effect.addDecision) store.addDecision(m.effect.addDecision);
      store.log(`Mission finished: "${m.title}" — all deterministic checks passed.`, null, "work");
    }
    store.emit({ mysi: true });
    run.step = 4; renderMission();
    toast(runs[m.id] ? "Mission finished. Results are ready." : "Mission finished.");
  }

  // ----- right rail -----
  function renderRail() {
    clear(rail);
    const active = AGENTS.filter((a) => a.id !== "mysi" && store.agentState[a.id] !== "idle").map((a) => a.id);
    const pos = { scout: [150, 28], forge: [262, 92], auditor: [222, 188], verifier: [78, 188], archivist: [38, 92] };
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 300 220"); svg.setAttribute("class", "coord"); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", "MYSI coordinating five specialist agents");
    const ns = (t, a, txt) => { const e = document.createElementNS("http://www.w3.org/2000/svg", t); Object.entries(a).forEach(([k, v]) => e.setAttribute(k, v)); if (txt) e.textContent = txt; return e; };
    Object.entries(pos).forEach(([id, [x, y]]) => svg.append(ns("line", { x1: 150, y1: 110, x2: x, y2: y, class: "cl" + (active.includes(id) ? " hot" : "") })));
    Object.entries(pos).forEach(([id, [x, y]]) => { const on = active.includes(id); const g = ns("g", { class: "cn" + (on ? " hot" : "") }); g.append(ns("circle", { cx: x, cy: y, r: 15 }), ns("text", { x, y: y + 31, "text-anchor": "middle" }, agent(id).name)); svg.append(g); });
    const mg = ns("g", { class: "cn mysi" + (store.mysiState === "working" ? " hot" : "") }); mg.append(ns("circle", { cx: 150, cy: 110, r: 24 }), ns("text", { x: 150, y: 114, "text-anchor": "middle", class: "in" }, "MYSI")); svg.append(mg);
    rail.append(h("section", { class: "panel pad" }, h("div", { class: "phead" }, h("h3", {}, "Agent coordination"), h("span", { class: "tag " + (store.mysiState === "working" ? "decide" : "running") }, store.mysiState === "working" ? "Working" : "Idle")), svg,
      h("p", { class: "hint" }, "Lines light up when MYSI hands a task to an agent.")),
      h("section", { class: "panel pad" }, h("h3", { class: "mh" }, "Team"), AGENTS.map((a) => { const st = store.agentState[a.id] || "idle"; return h("div", { class: "arow" }, h("i", { class: "sd " + st }), h("div", {}, h("b", {}, a.name), h("span", { class: "hint" }, " · " + a.role), h("div", { class: "hint" }, a.blurb)), h("span", { class: "hint st" }, STATE_LABEL[st])); })),
      h("section", { class: "panel pad" }, h("h3", { class: "mh" }, "What MYSI can see"), h("p", { class: "hint" }, "Bounded context, listed so nothing is hidden:"),
        h("ul", { class: "ctxl" }, h("li", {}, `Library: ${store.all().filter((n) => ["folder", "note", "component", "evidence", "deadend"].includes(n.kind)).length} records`), h("li", {}, `Control Tower: ${store.counts().workstreams} workstreams, ${store.counts().decide} open decisions`), h("li", {}, "Mandate: none active"), h("li", {}, "No secrets, no private conversations, no external accounts"))));
  }
  store.subscribe((info) => { if (!el.parentElement?.classList.contains("active")) return; if (info.mysi || info.reset || info.tick) renderRail(); });

  renderSegs(); renderLeft(); renderMessages(); renderMissionList(); renderRail();

  return {
    el,
    show(params = {}) {
      renderRail(); renderLeft();
      if (params.mission) openMission(params.mission);
      else if (params.tab === "missions") { setPane("missions"); if (!run) renderMissionList(); }
      else setPane(pane === "agents" && window.innerWidth >= 1180 ? "chat" : pane);
      if (params.ask) { setPane("chat"); setTimeout(() => send(params.ask, params.ctx || {}), 250); }
    },
    hide() {},
  };
}
