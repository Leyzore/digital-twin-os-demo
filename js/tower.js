// Control Tower — overview, queue of decisions/blocked/validation, portfolio, activity, reminders.
import { store, STATUS, KIND, relTime } from "./store.js";
import { AGENTS } from "./data.js";
import { h, clear, toast, openModal, cap, ICONS } from "./ui.js";

const SIDE = [["overview", "Overview", "◎"], ["handle", "To handle", "!"], ["portfolio", "Portfolio", "▦"], ["activity", "Activity", "≋"], ["reminders", "Reminders", "◔"]];

function hashRand(str) {
  let a = 2166136261;
  for (let i = 0; i < str.length; i++) { a ^= str.charCodeAt(i); a = Math.imul(a, 16777619); }
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const agentName = (id) => AGENTS.find((a) => a.id === id)?.name || cap(id || "MYSI");

export function createTower(app) {
  const el = h("div", { class: "wrap tower" });
  const side = h("nav", { class: "tsidebar", "aria-label": "Control Tower sections" });
  const content = h("div", { class: "tcontent" });
  el.append(side, content);
  const S = { tab: "overview", filter: "all", q: "", sel: 0, actFilter: "all" };
  let visible = false, heroStop = null;

  // ---------- sidebar ----------
  function renderSide() {
    const c = store.counts();
    clear(side);
    SIDE.forEach(([id, label, glyph]) => {
      const badge = id === "handle" ? c.decide + c.blocked + c.validate : id === "reminders" ? c.reminder : 0;
      side.append(h("button", { class: "sbtn", "aria-current": S.tab === id ? "page" : null, onclick: () => setTab(id) }, h("span", { class: "g" }, glyph), h("span", { class: "sl" }, label), badge ? h("span", { class: "badge" }, badge) : null));
    });
    side.append(h("hr"),
      h("button", { class: "sbtn ghosty", onclick: () => app.go("live") }, h("span", { class: "g" }, "✦"), h("span", { class: "sl" }, "Live graph")),
      h("button", { class: "sbtn ghosty", onclick: () => app.go("library") }, h("span", { class: "g" }, "❏"), h("span", { class: "sl" }, "Library")),
      h("button", { class: "sbtn ghosty", onclick: () => app.go("mysi") }, h("span", { class: "g" }, "◈"), h("span", { class: "sl" }, "MYSI")),
      h("button", { class: "sbtn ghosty", onclick: () => app.openPalette() }, h("span", { class: "g" }, "⌕"), h("span", { class: "sl" }, "Search"), h("kbd", { class: "key" }, "Ctrl K")));
  }

  function setTab(t, extra = {}) { S.tab = t; Object.assign(S, extra); S.sel = 0; render(); window.scrollTo({ top: 0 }); }

  // ---------- helpers ----------
  const itemTag = (n) => n.kind === "decision" ? ["decide", "To decide"] : n.status === "blocked" ? ["blocked", "Blocked"] : ["validate", "To validate"];
  const cta = (n) => (n.kind === "decision" ? "Decide →" : n.status === "blocked" ? "See why →" : "Review →");
  function queue() {
    let items = store.toHandle();
    if (S.filter !== "all") items = items.filter((n) => (S.filter === "decide" ? n.kind === "decision" : n.status === S.filter));
    if (S.q) items = items.filter((n) => (n.title + " " + store.folderName(n.folder)).toLowerCase().includes(S.q.toLowerCase()));
    return items;
  }

  function itemCard(n, i, selected) {
    const [cls, label] = itemTag(n);
    return h("article", { class: "qitem " + cls + (selected ? " sel" : ""), tabindex: "0", dataset: { id: n.id }, onclick: () => { S.sel = i; openItem(n); }, onkeydown: (e) => { if (e.key === "Enter") openItem(n); } },
      h("div", { class: "qmain" },
        h("div", { class: "qtop" }, h("span", { class: "tag " + cls }, label), h("span", { class: "hint" }, `${store.folderName(n.folder)} · ${n.age || "recently"}`)),
        h("h4", {}, n.title),
        h("p", { class: "hint qsub" }, n.kind === "decision" ? n.ctx : n.status === "blocked" ? n.reason : (n.result || n.summary))),
      h("button", { class: "btn small", tabindex: "-1" }, cta(n)));
  }

  // ---------- item dialogs ----------
  function openItem(n) {
    if (n.kind === "decision") return decisionModal(n);
    if (n.status === "blocked") return blockedModal(n);
    return reviewModal(n);
  }
  function decisionModal(n) {
    const m = openModal(h("div", {},
      h("div", { class: "eyebrow" }, `Decision · ${store.folderName(n.folder)}`), h("h2", {}, n.title), h("p", { class: "muted" }, n.ctx),
      n.options.map((o, i) => h("button", { class: "opt", "data-autofocus": i === 0 ? "" : null, onclick: () => { m.close(); store.resolveDecision(n.id, i); toast(n.unblocks && store.get(n.unblocks)?.status === "running" ? `Decided. "${store.get(n.unblocks).title}" is running again.` : "Decision recorded."); } },
        h("b", {}, o.label + (i === n.rec ? "  ·  MYSI suggests this" : "")), h("span", {}, o.detail))),
      h("div", { class: "mysi-note" }, h("b", {}, "Why MYSI suggests option " + (n.rec + 1) + ": "), n.why),
      h("div", { class: "actions" },
        h("button", { class: "btn ghost small", onclick: () => { m.close(); store.resolveDecision(n.id, "defer"); toast("Deferred to Reminders."); } }, "Defer"),
        h("button", { class: "btn ghost small", onclick: () => { m.close(); app.askMysi(`Should I approve: "${n.title}"?`, { decisionId: n.id }); } }, "Ask MYSI about this"),
        h("button", { class: "btn ghost small", onclick: () => { m.close(); app.go("live", { select: n.id }); } }, "Show in graph"))), { label: "Decision" });
  }
  function blockedModal(n) {
    const m = openModal(h("div", {},
      h("div", { class: "eyebrow" }, `Blocked · ${store.folderName(n.folder)}`), h("h2", {}, n.title),
      h("p", { class: "why" }, h("b", {}, "Why it stopped: "), n.reason),
      h("div", { class: "hint" }, `Owner: ${agentName(n.agent)} · progress ${n.progress}%`),
      (n.unblock || []).map((o, i) => h("button", { class: "opt", "data-autofocus": i === 0 ? "" : null, onclick: () => {
        m.close();
        if (o.goto) { const d = store.get(o.goto); d && decisionModal(d); return; }
        store.unblock(n.id, i); toast(`"${n.title}" is running again.`);
      } }, h("b", {}, o.label), h("span", {}, o.detail))),
      h("div", { class: "actions" }, h("button", { class: "btn ghost small", onclick: () => { m.close(); app.go("live", { select: n.id }); } }, "Show in graph"), h("button", { class: "btn ghost small", onclick: () => { m.close(); app.askMysi(`Why is "${n.title}" blocked?`, { nodeId: n.id }); } }, "Ask MYSI"))), { label: "Blocked workstream" });
  }
  function reviewModal(n) {
    const m = openModal(h("div", {},
      h("div", { class: "eyebrow" }, `Result to validate · ${store.folderName(n.folder)}`), h("h2", {}, n.title), h("p", { class: "muted" }, n.summary),
      h("div", { class: "resultbox" }, h("div", { class: "eyebrow" }, "Report (simulated)"), h("p", {}, n.result || "Work finished. Deterministic checks passed; the independent reviewer found no blocking issue.")),
      h("div", { class: "hint" }, `Prepared by ${agentName(n.agent)} · you remain the final judge.`),
      h("div", { class: "actions" },
        h("button", { class: "btn mint", "data-autofocus": "", onclick: () => { m.close(); store.reviewResult(n.id, true); toast("Result validated. Marked as done."); } }, "Accept result"),
        h("button", { class: "btn pink", onclick: () => { m.close(); store.reviewResult(n.id, false); toast("Changes requested. Work resumed."); } }, "Request changes"),
        h("button", { class: "btn ghost small", onclick: () => { m.close(); app.go("live", { select: n.id }); } }, "Show in graph"))), { label: "Validate result" });
  }
  function newWorkstream() {
    const title = h("input", { class: "input", placeholder: "e.g. Draft the Q1 evaluation plan", maxlength: "90", "data-autofocus": "" });
    const folder = h("select", { class: "input" }, store.byKind("folder").map((f) => h("option", { value: f.id }, f.title)));
    const err = h("div", { class: "hint", style: { color: "var(--pink-soft)", minHeight: "18px" } });
    const m = openModal(h("div", {}, h("div", { class: "eyebrow" }, "Simulated workflow"), h("h2", {}, "New workstream"),
      h("p", { class: "muted" }, "Creates a \"to do\" workstream. It appears in the Live graph and the portfolio immediately."),
      h("label", { class: "flabel" }, "Title", title), h("label", { class: "flabel" }, "Folder", folder), err,
      h("div", { class: "actions" }, h("button", { class: "btn", onclick: create }, "Create workstream"), h("button", { class: "btn ghost", onclick: () => m.close() }, "Cancel"))), { label: "New workstream" });
    function create() {
      if (title.value.trim().length < 4) { err.textContent = "Please give it a title of at least 4 characters."; title.focus(); return; }
      const id = store.addWorkstream({ folder: folder.value, title: title.value.trim() });
      m.close(); toast("Workstream created."); S.tab = "portfolio"; S.focusFolder = folder.value; render();
    }
    title.addEventListener("keydown", (e) => e.key === "Enter" && create());
  }

  // ---------- views ----------
  function metricCards() {
    const c = store.counts();
    const cards = [
      ["decide", "To decide", c.decide, "wait for your call", "var(--lilac)", () => setTab("handle", { filter: "decide" })],
      ["blocked", "Blocked", c.blocked, "workstreams will not resume on their own", "var(--pink)", () => setTab("handle", { filter: "blocked" })],
      ["validate", "To validate", c.validate, "results waiting for your judgement", "var(--peach)", () => setTab("handle", { filter: "validate" })],
      ["running", "Running", c.running, "workstreams in progress", "var(--mint)", () => setTab("portfolio")],
      ["reminder", "Reminders", c.reminder, "notes, nothing to reply to", "var(--cream)", () => setTab("reminders")],
      ["ws", "Workstreams", c.workstreams, "all states combined", "var(--cream)", () => setTab("portfolio")],
      ["folders", "Folders", c.folders, `${c.idleFolders} without active work`, "var(--cream)", () => setTab("portfolio")],
      ["checks", "Failed checks", 0, "out of 5 recorded checks", "var(--cream)", checksModal],
    ];
    return h("div", { class: "metrics" }, cards.map(([id, label, n, sub, color, fn]) => h("button", { class: "metric", onclick: fn, "aria-label": `${label}: ${n}. ${sub}` },
      h("span", { class: "eyebrow" }, label), h("strong", { style: { color } }, n), h("span", { class: "hint" }, sub))));
  }
  function checksModal() {
    const rows = [["Unit tests: workbook patch engine", "14 / 14"], ["Linter: Pipeline Forge branch", "0 errors"], ["Library consistency check", "0 errors, 3 warnings"], ["File integrity: scratch area", "no changes"], ["Event schema validation", "all events valid"]];
    const m = openModal(h("div", {}, h("div", { class: "eyebrow" }, "Deterministic checks (simulated)"), h("h2", {}, "5 recorded checks, 0 failed"),
      h("p", { class: "muted" }, "Checks run without AI; their verdict is final for the property they measure."),
      h("table", { class: "ktable" }, rows.map(([a, b]) => h("tr", {}, h("td", {}, a), h("td", {}, h("span", { class: "tag running" }, b))))),
      h("div", { class: "actions" }, h("button", { class: "btn ghost", onclick: () => m.close() }, "Close"))), { label: "Checks" });
  }

  function heroPanel() {
    const c = store.counts();
    const canvas = h("canvas", { class: "herocanvas", "aria-hidden": "true" });
    const head = c.blocked > 0 ? `${c.blocked} workstream${c.blocked > 1 ? "s" : ""} blocked` : c.validate > 0 ? `${c.validate} result${c.validate > 1 ? "s" : ""} to validate` : "Nothing needs you right now";
    const panel = h("section", { class: "panel hero" }, canvas,
      h("div", { class: "heroTxt" },
        h("div", { class: "eyebrow" }, "Control Tower"),
        h("h2", {}, h("i", { class: "hdot", style: { background: c.blocked ? "var(--pink)" : c.validate ? "var(--peach)" : "var(--mint)" } }), head),
        h("p", { class: "muted" }, `${c.decide} decision${c.decide === 1 ? "" : "s"} wait for you · ${c.running} workstream${c.running === 1 ? "" : "s"} running`),
        h("p", { class: "hint" }, "Last work: " + (store.activity[0] ? relTime(store.activity[0].ts) : "—") + " · demo dataset, updated live"),
        h("div", { class: "heroBtns" }, h("button", { class: "btn", onclick: newWorkstream }, "+ New workstream"), h("button", { class: "btn ghost", onclick: () => setTab("handle") }, "Open the queue"))),
      h("div", { class: "heroHint hint" }, "Click a number below to filter the queue"));
    startHero(canvas, panel);
    return panel;
  }

  function startHero(canvas, panel) {
    heroStop && heroStop();
    const ctx = canvas.getContext("2d");
    const folders = store.byKind("folder");
    const blockedF = new Set(store.byKind("workstream").filter((w) => w.status === "blocked").map((w) => w.folder));
    const pts = folders.map((f, i) => { const r = hashRand(f.id); return { f, x: 0.5 + r() * 0.46, y: 0.12 + r() * 0.76, ph: r() * 6.3, big: f.id === "dtos" }; });
    // a fixed arrangement works better than random positions
    const spots = [[0.74, 0.5], [0.58, 0.28], [0.9, 0.3], [0.66, 0.78], [0.88, 0.7], [0.5, 0.58], [0.96, 0.52], [0.56, 0.86], [0.8, 0.14]];
    pts.forEach((p, i) => { p.x = spots[i % spots.length][0]; p.y = spots[i % spots.length][1]; });
    const stars = Array.from({ length: 90 }, (_, i) => { const r = hashRand("hs" + i); return [r(), r(), 0.4 + r() * 1.1, r() * 6.3]; });
    let raf = 0, alive = true, dpr = 1, w = 0, hh = 0;
    const fit = () => { const r = panel.getBoundingClientRect(); dpr = Math.min(devicePixelRatio || 1, 2); w = r.width; hh = r.height; canvas.width = w * dpr; canvas.height = hh * dpr; canvas.style.width = w + "px"; canvas.style.height = hh + "px"; };
    const loop = (t) => {
      if (!alive) return;
      raf = requestAnimationFrame(loop);
      if (!w) fit();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, hh);
      const mobile = w < 700, ox = mobile ? 0 : 0;
      stars.forEach(([x, y, s, ph]) => { ctx.globalAlpha = 0.25 + 0.35 * Math.sin(t / 1000 + ph); ctx.fillStyle = "#f2e4ff"; ctx.fillRect(x * w, y * hh, s, s); });
      const P = (p) => [(mobile ? 0.15 + p.x * 0.8 : p.x) * w + Math.sin(t / 2600 + p.ph) * 5, (mobile ? 0.45 + p.y * 0.5 : p.y) * hh + Math.cos(t / 3100 + p.ph) * 5];
      ctx.globalAlpha = 1; ctx.lineWidth = 1;
      pts.forEach((a, i) => pts.forEach((b, j) => { if (j <= i || store.links.findIndex((l) => (l.a === a.f.id && l.b === b.f.id) || (l.b === a.f.id && l.a === b.f.id)) < 0) return; const [x1, y1] = P(a), [x2, y2] = P(b); ctx.strokeStyle = "rgba(214,170,240,0.22)"; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }));
      pts.forEach((p) => {
        const [x, y] = P(p), bl = blockedF.has(p.f.id), col = bl ? "#f06ab4" : "#cf9cf0", r = p.big ? 11 : 6.5;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * (p.big ? 7 : 5) * (1 + 0.08 * Math.sin(t / 700 + p.ph)));
        g.addColorStop(0, col + "cc"); g.addColorStop(0.3, col + "44"); g.addColorStop(1, col + "00");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 7, 0, 6.3); ctx.fill();
        ctx.fillStyle = p.big ? "#fff" : col; ctx.beginPath(); ctx.arc(x, y, r * 0.75, 0, 6.3); ctx.fill();
        ctx.font = "600 10.5px Manrope, system-ui, sans-serif"; ctx.fillStyle = "rgba(236,210,250,0.85)"; ctx.textAlign = "center"; ctx.fillText(p.f.title.toUpperCase(), x, y + r + 16);
      });
    };
    const ro = new ResizeObserver(() => { w = 0; }); ro.observe(panel);
    raf = requestAnimationFrame(loop);
    heroStop = () => { alive = false; cancelAnimationFrame(raf); ro.disconnect(); heroStop = null; };
  }

  function renderOverview() {
    content.append(heroPanel(), metricCards());
    const items = store.toHandle().slice(0, 4);
    const left = h("section", { class: "panel pad" }, h("div", { class: "phead" }, h("h3", {}, "To handle", h("span", { class: "badge" }, store.toHandle().length)), h("button", { class: "btn small ghost", onclick: () => setTab("handle") }, "View all")),
      items.length ? h("div", { class: "qlist" }, items.map((n, i) => itemCard(n, i, false))) : h("p", { class: "empty" }, "All clear. Nothing is waiting for you."));
    const right = h("section", { class: "panel pad" }, h("div", { class: "phead" }, h("h3", {}, "Activity"), h("span", { class: "hint" }, "latest first")), activityList(7));
    content.append(h("div", { class: "twocol" }, left, right));
  }

  function activityList(limit, filter = "all") {
    const rows = store.activity.filter((a) => filter === "all" || a.kind === filter).slice(0, limit);
    if (!rows.length) return h("p", { class: "empty" }, "No events yet.");
    return h("ul", { class: "alist" }, rows.map((a) => h("li", {}, h("button", { disabled: !a.node, onclick: () => a.node && app.go("live", { select: a.node }) },
      h("span", { class: "tx" }, a.text), h("span", { class: "hint" }, `${relTime(a.ts)} · Digital Twin OS · `, h("span", { class: "tag sim" }, "Simulated"))))));
  }

  function renderHandle() {
    const items = queue();
    S.sel = Math.max(0, Math.min(S.sel, items.length - 1));
    const total = store.toHandle().length;
    const counts = { all: total, blocked: store.counts().blocked, validate: store.counts().validate, decide: store.counts().decide };
    const search = h("input", { class: "input qsearch", id: "qsearch", placeholder: "Filter the queue…  ( / )", value: S.q, "aria-label": "Filter the queue", oninput: (e) => { S.q = e.target.value; S.sel = 0; renderList(); } });
    const listBox = h("div", { class: "qlist" });
    function renderList() {
      clear(listBox);
      const its = queue();
      if (!its.length) listBox.append(h("p", { class: "empty" }, S.q || S.filter !== "all" ? "Nothing matches this filter." : "All clear. Nothing is waiting for you — try resetting the demo from the More menu."));
      its.forEach((n, i) => listBox.append(itemCard(n, i, i === S.sel)));
    }
    content.append(
      h("header", { class: "thead" }, h("div", {}, h("div", { class: "eyebrow" }, "Control Tower"), h("h2", {}, "To handle")), h("button", { class: "btn", onclick: newWorkstream }, "+ New workstream")),
      h("div", { class: "chiprow" }, [["all", "All"], ["blocked", "Blocked"], ["validate", "To validate"], ["decide", "To decide"]].map(([id, label]) => h("button", { class: "chip", "aria-pressed": String(S.filter === id), onclick: () => { S.filter = id; S.sel = 0; render(); } }, label, h("span", { class: "n" }, counts[id])))),
      h("div", { class: "qtools" }, search, h("span", { class: "hint kbdhint" }, h("kbd", { class: "key" }, "J"), h("kbd", { class: "key" }, "K"), " browse · ", h("kbd", { class: "key" }, "Enter"), " open")),
      listBox);
    renderList();
  }

  function renderPortfolio() {
    const folders = store.byKind("folder");
    content.append(h("header", { class: "thead" }, h("div", {}, h("div", { class: "eyebrow" }, "Control Tower"), h("h2", {}, "Portfolio")), h("button", { class: "btn", onclick: newWorkstream }, "+ New workstream")),
      h("div", { class: "pgrid" }, folders.map((f) => {
        const ws = store.byKind("workstream").filter((w) => w.folder === f.id);
        const dec = store.byKind("decision").filter((d) => d.folder === f.id && d.status === "decide").length;
        const done = ws.filter((w) => w.status === "done").length;
        const pct = ws.length ? Math.round(ws.reduce((s, w) => s + (w.status === "done" ? 100 : w.progress), 0) / ws.length) : 0;
        const blocked = ws.filter((w) => w.status === "blocked").length, val = ws.filter((w) => w.status === "validate").length;
        const health = blocked ? ["blocked", "Needs attention"] : val || dec ? ["validate", "Waiting for you"] : f.projectStatus === "paused" ? ["reminder", "Paused"] : ["running", "On track"];
        return h("article", { class: "pcard panel" + (S.focusFolder === f.id ? " flash" : ""), tabindex: "0", onclick: () => folderModal(f), onkeydown: (e) => e.key === "Enter" && folderModal(f) },
          h("div", { class: "qtop" }, h("span", { class: "eyebrow" }, f.family), h("span", { class: "tag " + health[0] }, health[1])),
          h("h4", {}, f.title), h("p", { class: "hint" }, f.summary),
          h("div", { class: "progress" }, h("i", { style: { width: pct + "%" } })),
          h("div", { class: "pfoot hint" }, h("span", {}, `${ws.length} workstream${ws.length === 1 ? "" : "s"} · ${done} done`), h("span", {}, `${dec} to decide`)));
      })));
    S.focusFolder = null;
  }
  function folderModal(f) {
    const ws = store.byKind("workstream").filter((w) => w.folder === f.id);
    const dec = store.byKind("decision").filter((d) => d.folder === f.id && d.status === "decide");
    const m = openModal(h("div", {}, h("div", { class: "eyebrow" }, f.family), h("h2", {}, f.title), h("p", { class: "muted" }, f.summary),
      h("h4", { class: "sub" }, "Workstreams"),
      ws.length ? ws.map((w) => h("div", { class: "frow" }, h("div", { class: "fr-main" }, h("b", {}, w.title), h("div", { class: "progress" }, h("i", { style: { width: w.progress + "%" } }))), h("span", { class: "tag " + w.status }, STATUS[w.status].label),
        w.status === "todo" ? h("button", { class: "btn small", onclick: () => { store.startWorkstream(w.id); toast("Workstream started."); m.close(); folderModal(f); } }, "Start") :
          w.status === "blocked" || w.status === "validate" ? h("button", { class: "btn small ghost", onclick: () => { m.close(); openItem(w); } }, w.status === "blocked" ? "See why" : "Review") : null)) : h("p", { class: "hint" }, "No workstreams yet."),
      dec.length ? [h("h4", { class: "sub" }, "Decisions waiting"), dec.map((d) => h("div", { class: "frow" }, h("div", { class: "fr-main" }, h("b", {}, d.title)), h("button", { class: "btn small ghost", onclick: () => { m.close(); decisionModal(d); } }, "Decide")))] : null,
      h("div", { class: "actions" }, h("button", { class: "btn small", onclick: () => { m.close(); app.go("live", { select: f.id }); } }, "Show in Live graph"), h("button", { class: "btn small ghost", onclick: () => { m.close(); app.go("library", { open: f.id }); } }, "Open in Library"))), { label: f.title });
  }

  function renderActivity() {
    content.append(h("header", { class: "thead" }, h("div", {}, h("div", { class: "eyebrow" }, "Control Tower"), h("h2", {}, "Activity"))),
      h("div", { class: "chiprow" }, [["all", "Everything"], ["work", "Work"], ["decision", "Decisions"], ["system", "System"]].map(([id, l]) => h("button", { class: "chip", "aria-pressed": String(S.actFilter === id), onclick: () => { S.actFilter = id; render(); } }, l))),
      h("section", { class: "panel pad" }, activityList(40, S.actFilter)));
  }

  function renderReminders() {
    const rs = store.all().filter((n) => n.status === "reminder");
    content.append(h("header", { class: "thead" }, h("div", {}, h("div", { class: "eyebrow" }, "Control Tower"), h("h2", {}, "Reminders")), rs.some((r) => r.kind === "reminder") ? h("button", { class: "btn ghost", onclick: () => { store.dismissAllReminders(); toast("Reminders dismissed."); } }, "Dismiss all reminders") : null),
      h("p", { class: "hint" }, "Notes attached to records. Nothing here needs a reply; deferred decisions return to the queue when you bring them back."),
      rs.length ? h("div", { class: "rgrid" }, rs.map((r) => h("div", { class: "rcard panel" }, h("div", {}, h("div", { class: "qtop" }, h("span", { class: "tag reminder" }, r.deferred ? "Deferred decision" : "Reminder"), h("span", { class: "hint" }, `${store.folderName(r.folder)} · ${r.age || "recently"}`)), h("p", {}, r.title)),
        h("button", { class: "btn small ghost", onclick: () => { store.dismissReminder(r.id); toast(r.kind === "decision" ? "Back in your queue." : "Reminder dismissed."); } }, r.kind === "decision" ? "Bring back" : "Dismiss")))) : h("p", { class: "empty panel pad" }, "No reminders. Enjoy the quiet."));
  }

  function render() {
    if (!visible) return;
    heroStop && heroStop();
    renderSide();
    clear(content);
    ({ overview: renderOverview, handle: renderHandle, portfolio: renderPortfolio, activity: renderActivity, reminders: renderReminders })[S.tab]();
  }

  store.subscribe((info) => {
    if (!visible) return;
    const ae = document.activeElement;
    if (info.tick && (ae?.id === "qsearch" || document.querySelector(".overlay"))) { renderSide(); return; }
    if (document.querySelector(".overlay") && info.tick) return;
    render();
  });

  document.addEventListener("keydown", (e) => {
    if (!visible || document.querySelector(".overlay") || e.ctrlKey || e.metaKey) return;
    const typing = /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
    if (e.key === "/" && !typing) { e.preventDefault(); if (S.tab !== "handle") { setTab("handle"); } document.getElementById("qsearch")?.focus(); return; }
    if (typing || S.tab !== "handle") return;
    const items = queue(); if (!items.length) return;
    if (e.key.toLowerCase() === "j" || e.key === "ArrowDown") { S.sel = Math.min(items.length - 1, S.sel + 1); paintSel(); e.preventDefault(); }
    else if (e.key.toLowerCase() === "k" || e.key === "ArrowUp") { S.sel = Math.max(0, S.sel - 1); paintSel(); e.preventDefault(); }
    else if (e.key === "Enter" && document.activeElement === document.body) { openItem(items[S.sel]); }
  });
  function paintSel() {
    const cards = [...content.querySelectorAll(".qitem")];
    cards.forEach((c, i) => c.classList.toggle("sel", i === S.sel));
    cards[S.sel]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  return {
    el,
    show(params = {}) {
      visible = true;
      if (params.tab) { S.tab = params.tab; S.filter = params.filter || "all"; S.q = ""; S.sel = 0; }
      else if (params.filter) S.filter = params.filter;
      render();
      if (params.open) { const n = store.get(params.open); if (n) { S.tab = "handle"; S.filter = "all"; render(); const idx = queue().findIndex((x) => x.id === n.id); if (idx >= 0) S.sel = idx; paintSel(); setTimeout(() => (n.kind === "workstream" && !["blocked", "validate"].includes(n.status) ? folderModal(store.get(n.folder)) : n.kind === "decision" && n.status !== "decide" ? folderModal(store.get(n.folder)) : openItem(n)), 120); } }
    },
    hide() { visible = false; heroStop && heroStop(); },
  };
}
