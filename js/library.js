// Library — searchable, filterable knowledge records with previews, evidence-linked claims and generated handoff notes.
import { store, STATUS } from "./store.js";
import { daysAgo, inDays } from "./data.js";
import { h, clear, openModal, toast, cap, esc } from "./ui.js";

const KINDS = [["all", "All"], ["project", "Projects"], ["component", "Components"], ["evidence", "Evidence"], ["dead_end", "Dead ends"], ["note", "Notes"]];
const KIND_LABEL = { project: "Project", component: "Component", evidence: "Evidence", dead_end: "Dead end", note: "Note" };
const KIND_GLYPH = { project: "◉", component: "◇", evidence: "△", dead_end: "✕", note: "○" };
const MATURITY = { exploratory: "Exploratory", experiment: "Experiment", deliverable: "Deliverable", validated_for_reuse: "Validated for reuse" };
const MCOLOR = { exploratory: "mat-0", experiment: "mat-1", deliverable: "mat-2", validated_for_reuse: "mat-3" };
const STATUS_LABEL = { active: "Active", paused: "Paused", completed: "Completed", archived: "Archived" };
const GRAPH_TO_LIB = { folder: "project", deadend: "dead_end", note: "note", component: "component", evidence: "evidence" };
const LIB_TO_GRAPH_KINDS = new Set(["folder", "note", "component", "evidence", "deadend"]);

const norm = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
function hrand(str) { let a = 2166136261; for (let i = 0; i < str.length; i++) { a ^= str.charCodeAt(i); a = Math.imul(a, 16777619); } return ((a >>> 0) % 10007) / 10007; }
function toRecord(n) {
  const kind = GRAPH_TO_LIB[n.kind];
  const r1 = hrand(n.id + "u"), r2 = hrand(n.id + "r");
  return {
    id: n.id, kind, title: n.title, summary: n.summary || "", details: n.details || n.ctx || "",
    status: kind === "project" ? n.projectStatus : "active", maturity: n.maturity || null, exercised: n.exercised_with || null,
    project: n.kind === "folder" ? n.id : n.folder, tags: n.tags || (n.kind === "folder" ? [n.family.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-")] : []),
    updated: daysAgo(Math.floor(1 + r1 * 38)), review_by: inDays(Math.floor(r2 * 75 - 14)),
    claims: n.claims || null, method: n.method, result: n.result, attempted: n.attempted, why: n.why, node: n,
  };
}
const today = () => new Date().toISOString().slice(0, 10);
const overdue = (r) => r.review_by && r.review_by < today();

function highlight(text, words) {
  if (!words.length || !text) return document.createTextNode(text || "");
  const frag = document.createDocumentFragment();
  const re = new RegExp("(" + words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")", "ig");
  const folded = norm(text);
  // work on the folded string (same length for latin text) to find ranges
  let last = 0, m;
  const foldedRe = new RegExp("(" + words.map((w) => norm(w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")", "ig");
  while ((m = foldedRe.exec(folded))) {
    if (folded.length !== text.length) break;
    // only match at word starts
    if (m.index > 0 && /[a-z0-9]/.test(folded[m.index - 1])) { continue; }
    frag.append(document.createTextNode(text.slice(last, m.index)));
    const mk = document.createElement("mark"); mk.textContent = text.slice(m.index, m.index + m[0].length); frag.append(mk);
    last = m.index + m[0].length;
  }
  frag.append(document.createTextNode(text.slice(last)));
  return frag;
}

export function createLibrary(app) {
  const el = h("div", { class: "wrap library" });
  const S = { q: "", kind: "all", maturity: "", status: "", project: "", tag: "", sort: "relevance", open: null };
  let records = [];
  let visible = false;

  const searchInput = h("input", { class: "input", id: "libsearch", type: "search", placeholder: "Search the library…  ( / )", "aria-label": "Search the library", autocomplete: "off", oninput: (e) => { S.q = e.target.value; renderResults(); } });
  const healthEl = h("div", { class: "libhealth" });
  const kindRow = h("div", { class: "chiprow" });
  const maturitySel = h("select", { class: "input", "aria-label": "Maturity", onchange: (e) => { S.maturity = e.target.value; renderResults(); } }, h("option", { value: "" }, "Any maturity"), Object.entries(MATURITY).map(([v, l]) => h("option", { value: v }, l)));
  const statusSel = h("select", { class: "input", "aria-label": "Status", onchange: (e) => { S.status = e.target.value; renderResults(); } }, h("option", { value: "" }, "Any status"), Object.entries(STATUS_LABEL).slice(0, 2).map(([v, l]) => h("option", { value: v }, l)));
  const projectSel = h("select", { class: "input", "aria-label": "Project", onchange: (e) => { S.project = e.target.value; renderResults(); } });
  const sortSel = h("select", { class: "input", "aria-label": "Sort", onchange: (e) => { S.sort = e.target.value; renderResults(); } }, [["relevance", "Sort: relevance"], ["recent", "Sort: most recent"], ["title", "Sort: title A–Z"], ["review", "Sort: review date"]].map(([v, l]) => h("option", { value: v }, l)));
  const tagRow = h("div", { class: "chiprow tagrow" });
  const resultsMeta = h("div", { class: "resmeta hint", "aria-live": "polite" });
  const grid = h("div", { class: "libgrid" });
  const preview = h("aside", { class: "panel libpreview", "aria-label": "Record preview" });
  const examples = h("div", { class: "chiprow ex" }, h("span", { class: "hint" }, "Try:"), ["sandbox", "tests", "consent", "spreadsheet", "dry-run"].map((w) => h("button", { class: "chip", onclick: () => { S.q = w; searchInput.value = w; renderResults(); } }, w)));

  el.append(
    h("header", { class: "thead" }, h("div", {}, h("div", { class: "eyebrow" }, "Library"), h("h2", {}, "Shared memory, with evidence"),
      h("p", { class: "muted libintro" }, "Projects, components, evidence and dead ends the whole team can reuse. Claims point to evidence — or say they are not measured."))),
    healthEl,
    h("div", { class: "libtools panel" }, h("div", { class: "searchrow" }, searchInput, h("button", { class: "btn ghost small", onclick: resetFilters }, "Reset filters")), examples, kindRow,
      h("div", { class: "selrow" }, maturitySel, statusSel, projectSel, sortSel), tagRow),
    resultsMeta,
    h("div", { class: "libmain" }, grid, preview));

  function build() {
    records = store.all().filter((n) => LIB_TO_GRAPH_KINDS.has(n.kind)).map(toRecord);
    clear(projectSel);
    projectSel.append(h("option", { value: "" }, "Any project"), ...store.byKind("folder").map((f) => h("option", { value: f.id }, f.title)));
    projectSel.value = S.project;
  }

  function resetFilters() {
    Object.assign(S, { q: "", kind: "all", maturity: "", status: "", project: "", tag: "", sort: "relevance" });
    searchInput.value = ""; maturitySel.value = ""; statusSel.value = ""; projectSel.value = ""; sortSel.value = "relevance";
    renderResults();
  }

  function renderHealth() {
    const stale = records.filter(overdue).length;
    const counts = Object.fromEntries(KINDS.slice(1).map(([k]) => [k, records.filter((r) => r.kind === k).length]));
    const noEv = records.filter((r) => (r.claims || []).some((c) => !c.evidence.length)).length;
    healthEl.replaceChildren(
      h("div", { class: "hcard" }, h("strong", {}, records.length), h("span", { class: "hint" }, "records")),
      h("div", { class: "hcard" }, h("strong", {}, counts.component), h("span", { class: "hint" }, "components · " + records.filter((r) => r.maturity === "validated_for_reuse").length + " validated for reuse")),
      h("button", { class: "hcard clickable", onclick: () => { S.sort = "review"; sortSel.value = "review"; renderResults(); toast("Sorted by review date: overdue records first."); } }, h("strong", { style: { color: stale ? "var(--peach)" : "var(--mint)" } }, stale), h("span", { class: "hint" }, "overdue for review")),
      h("div", { class: "hcard", title: "Illustrative consistency check" }, h("strong", {}, "0"), h("span", { class: "hint" }, `errors · ${noEv} record${noEv === 1 ? "" : "s"} with unmeasured claims`)));
    clear(kindRow);
    KINDS.forEach(([k, l]) => kindRow.append(h("button", { class: "chip", "aria-pressed": String(S.kind === k), onclick: () => { S.kind = k; renderResults(); } }, (KIND_GLYPH[k] ? KIND_GLYPH[k] + " " : "") + l, h("span", { class: "n" }, k === "all" ? records.length : counts[k]))));
    const tagCount = {};
    records.forEach((r) => r.tags.forEach((t) => (tagCount[t] = (tagCount[t] || 0) + 1)));
    clear(tagRow);
    Object.entries(tagCount).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 14).forEach(([t, n]) => tagRow.append(h("button", { class: "chip tagchip", "aria-pressed": String(S.tag === t), onclick: () => { S.tag = S.tag === t ? "" : t; renderResults(); } }, "#" + t)));
  }

  function search() {
    const words = norm(S.q).split(/\s+/).filter(Boolean);
    let out = records.filter((r) => {
      if (S.kind !== "all" && r.kind !== S.kind) return false;
      if (S.maturity && r.maturity !== S.maturity) return false;
      if (S.status && r.status !== S.status) return false;
      if (S.project && r.project !== S.project) return false;
      if (S.tag && !r.tags.includes(S.tag)) return false;
      return true;
    });
    if (words.length) {
      out = out.map((r) => {
        const hay = norm([r.title, r.summary, r.details, r.tags.join(" "), r.id, KIND_LABEL[r.kind], store.folderName(r.project)].join(" "));
        const title = norm(r.title);
        const hit = words.every((w) => new RegExp("(^|[^a-z0-9])" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(hay));
        if (!hit) return null;
        const score = words.reduce((s, w) => s + (new RegExp("(^|[^a-z0-9])" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(title) ? 5 : 1), 0);
        return { r, score };
      }).filter(Boolean).sort((a, b) => b.score - a.score).map((x) => x.r);
    }
    if (S.sort === "recent") out = [...out].sort((a, b) => b.updated.localeCompare(a.updated));
    else if (S.sort === "title") out = [...out].sort((a, b) => a.title.localeCompare(b.title));
    else if (S.sort === "review") out = [...out].sort((a, b) => (a.review_by || "9").localeCompare(b.review_by || "9"));
    else if (!words.length) { const order = { project: 0, component: 1, evidence: 2, dead_end: 3, note: 4 }; out = [...out].sort((a, b) => order[a.kind] - order[b.kind]); }
    return { out, words };
  }

  function renderResults() {
    renderHealth();
    const { out, words } = search();
    const active = [S.kind !== "all" && KIND_LABEL[S.kind], S.maturity && MATURITY[S.maturity], S.status && STATUS_LABEL[S.status], S.project && store.folderName(S.project), S.tag && "#" + S.tag, S.q && `"${S.q}"`].filter(Boolean);
    resultsMeta.textContent = `${out.length} of ${records.length} records` + (active.length ? " · " + active.join(" · ") : "");
    clear(grid);
    if (!out.length) {
      grid.append(h("div", { class: "empty panel pad nores" }, h("b", {}, "No record matches."), h("p", { class: "hint" }, "Try fewer words, or reset the filters."), h("button", { class: "btn small", onclick: resetFilters }, "Reset filters"), " ", h("button", { class: "btn small ghost", onclick: () => app.askMysi(`Find library records about "${S.q}"`) }, "Ask MYSI")));
    }
    out.forEach((r) => grid.append(card(r, words)));
    if (S.open && !out.find((r) => r.id === S.open)) { /* keep preview even if filtered out */ }
  }

  function card(r, words) {
    const od = overdue(r);
    const sel = S.open === r.id;
    return h("article", { class: "rcard2 panel" + (sel ? " sel" : ""), tabindex: "0", role: "button", "aria-label": `${KIND_LABEL[r.kind]}: ${r.title}`, onclick: () => openRecord(r.id), onkeydown: (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), openRecord(r.id)) },
      h("div", { class: "ctop" }, h("span", { class: "kindlbl" }, h("span", { class: "kg" }, KIND_GLYPH[r.kind]), KIND_LABEL[r.kind]),
        r.maturity ? h("span", { class: "mat " + MCOLOR[r.maturity] }, MATURITY[r.maturity]) : r.status === "paused" ? h("span", { class: "mat mat-0" }, "Paused") : null),
      h("h4", {}, highlight(r.title, words)), h("p", { class: "csum" }, highlight(r.summary, words)),
      h("div", { class: "ctags" }, r.tags.slice(0, 3).map((t) => h("span", { class: "tg" }, "#" + t))),
      h("div", { class: "cfoot hint" }, h("span", {}, r.kind === "project" ? "Project" : store.folderName(r.project)), h("span", { class: od ? "stale" : "" }, od ? "Review overdue" : "Updated " + r.updated)));
  }

  // ---------- preview ----------
  function openRecord(id, tab = "overview") {
    const r = records.find((x) => x.id === id); if (!r) return;
    S.open = id;
    document.querySelectorAll(".rcard2.sel").forEach((c) => c.classList.remove("sel"));
    const content = previewContent(r, tab);
    if (window.matchMedia("(min-width: 1180px)").matches) {
      clear(preview); preview.append(content); preview.classList.add("has");
      [...grid.children].forEach((c) => c.classList.toggle("sel", c.getAttribute("aria-label")?.endsWith(r.title)));
    } else {
      openModal(content, { label: r.title, cls: "wide", onClose: () => (S.open = null) });
    }
  }

  function previewContent(r, tab) {
    const box = h("div", { class: "pv" });
    const body = h("div", { class: "pvbody" });
    const tabs = [["overview", "Overview"], ["claims", r.kind === "evidence" ? "Method & result" : r.kind === "dead_end" ? "Why abandoned" : "Claims"], ["links", "Links"], ...(r.kind === "project" ? [["handoff", "Handoff note"]] : [])];
    const tabBar = h("div", { class: "pvtabs", role: "tablist" });
    function paintTab(t) {
      clear(body); clear(tabBar);
      tabs.forEach(([id, l]) => tabBar.append(h("button", { role: "tab", "aria-selected": String(id === t), onclick: () => paintTab(id) }, l)));
      ({ overview: tabOverview, claims: tabClaims, links: tabLinks, handoff: tabHandoff })[t](r, body, box);
    }
    box.append(
      h("div", { class: "pvtop" }, h("span", { class: "kindlbl" }, h("span", { class: "kg" }, KIND_GLYPH[r.kind]), KIND_LABEL[r.kind] + " · " + r.id), h("div", {}, window.matchMedia("(min-width: 1180px)").matches ? h("button", { class: "icon-btn", "aria-label": "Close preview", onclick: () => { S.open = null; clear(preview); preview.classList.remove("has"); renderResults(); } }, "×") : null)),
      h("h3", { class: "pvtitle" }, r.title),
      h("div", { class: "pvmeta" }, r.maturity ? h("span", { class: "mat " + MCOLOR[r.maturity] }, MATURITY[r.maturity]) : null, h("span", { class: "tag kind" }, STATUS_LABEL[r.status] || r.status), overdue(r) ? h("span", { class: "tag blocked" }, "Review overdue") : null, h("span", { class: "tag sim" }, "Demo record")),
      tabBar, body,
      h("div", { class: "pvactions" }, h("button", { class: "btn small", onclick: () => app.go("live", { select: r.id }) }, "Show in Live graph"), h("button", { class: "btn small ghost", onclick: () => app.askMysi(`Tell me about "${r.title}"`, { recordId: r.id }) }, "Ask MYSI")));
    paintTab(tab);
    return box;
  }

  const metaRow = (k, v) => h("div", { class: "mrow" }, h("span", { class: "hint" }, k), h("span", {}, v));
  function tabOverview(r, body) {
    body.append(h("p", { class: "pvsum" }, r.summary));
    if (r.details && r.details !== r.summary) body.append(h("p", { class: "pvdet" }, r.details));
    const files = [[r.id + "-notes.md", 2 + Math.round(hrand(r.id + "f") * 9)], [r.id + "-data.json", 1 + Math.round(hrand(r.id + "g") * 40)]];
    body.append(h("div", { class: "meta" },
      metaRow("Project", r.kind === "project" ? "—" : store.folderName(r.project)), metaRow("Updated", r.updated), metaRow("Review by", r.review_by + (overdue(r) ? "  (overdue)" : "")),
      r.exercised ? metaRow("Exercised with", r.exercised) : null, r.maturity ? metaRow("Maturity", MATURITY[r.maturity]) : null,
      metaRow("Tags", r.tags.length ? r.tags.map((t) => "#" + t).join(" ") : "none")),
      h("div", { class: "eyebrow fam" }, "Linked files (placeholders)"),
      files.map(([n, kb]) => h("div", { class: "file" }, h("span", {}, "▤ " + n), h("span", { class: "hint" }, `${kb} KB · not included in the demo`))));
  }
  function tabClaims(r, body) {
    if (r.kind === "evidence") { body.append(metaRow("Method", r.method || "—"), metaRow("Result", r.result || "—"), h("p", { class: "hint" }, "Figures are illustrative demo content, not real measurements.")); return; }
    if (r.kind === "dead_end") { body.append(metaRow("What was tried", r.attempted || "—"), metaRow("Why it was abandoned", r.why || "—")); return; }
    let claims = r.claims;
    if (r.kind === "project") claims = store.byKind("evidence").filter((e) => e.folder === r.id).map((e) => ({ text: e.title, evidence: [e.id] }));
    if (!claims || !claims.length) { body.append(h("p", { class: "hint" }, "This record makes no claims.")); return; }
    body.append(claims.map((c) => h("div", { class: "claim" }, h("p", {}, c.text),
      c.evidence.length ? h("div", { class: "evrow" }, c.evidence.map((id) => h("button", { class: "chip", onclick: () => openRecord(id) }, "△ " + id))) : h("span", { class: "tag reminder" }, "Not measured"))));
  }
  function tabLinks(r, body) {
    const nb = store.neighbors(r.id).filter((n) => n.kind !== "reminder");
    if (!nb.length) { body.append(h("p", { class: "hint" }, "No links.")); return; }
    const groups = {};
    nb.forEach((n) => (groups[n.kind] ||= []).push(n));
    const L = { folder: "Projects", workstream: "Workstreams", decision: "Decisions", evidence: "Evidence", deadend: "Dead ends", component: "Components", note: "Notes" };
    Object.entries(groups).forEach(([k, ns]) => {
      body.append(h("div", { class: "eyebrow fam" }, L[k] + " · " + ns.length));
      ns.slice(0, 10).forEach((n) => body.append(h("button", { class: "linkrow", onclick: () => (LIB_TO_GRAPH_KINDS.has(n.kind) ? openRecord(n.id) : app.go("tower", { tab: "handle", open: n.id })) }, h("span", {}, n.title), n.status ? h("span", { class: "tag " + n.status }, STATUS[n.status].label) : h("span", { class: "hint" }, "Open →"))));
    });
  }
  function handoffText(r) {
    const ws = store.byKind("workstream").filter((w) => w.folder === r.id);
    const dec = store.byKind("decision").filter((d) => d.folder === r.id && d.status === "decide");
    const ev = store.byKind("evidence").filter((e) => e.folder === r.id);
    const comp = store.byKind("component").filter((c) => c.folder === r.id);
    const dead = store.byKind("deadend").filter((c) => c.folder === r.id);
    const stale = records.filter((x) => x.project === r.id && overdue(x));
    const li = (xs, f) => (xs.length ? xs.map((x) => "- " + f(x)).join("\n") : "- none");
    return `# Handoff — ${r.title}\n_Generated ${new Date().toISOString().slice(0, 16).replace("T", " ")} from library fields and links. Not written by a model. Demo content._\n\n## Purpose\n${r.summary}\n\n## Workstreams\n${li(ws, (w) => `${w.title} — ${STATUS[w.status].label.toLowerCase()} (${w.progress}%)`)}\n\n## Open decisions\n${li(dec, (d) => d.title)}\n\n## Latest evidence\n${li(ev, (e) => `${e.title} [${e.id}]`)}\n\n## Components\n${li(comp, (c) => `${c.title} — ${MATURITY[c.maturity]}`)}\n\n## Dead ends to avoid\n${li(dead, (d) => d.title)}\n\n## Needs review\n${li(stale, (s) => `${s.title} (review was due ${s.review_by})`)}\n`;
  }
  function tabHandoff(r, body) {
    const text = handoffText(r);
    body.append(h("p", { class: "hint" }, "Composed from fields and links at the moment you open this tab."), h("pre", { class: "handoff" }, text),
      h("button", { class: "btn small", onclick: async () => { try { await navigator.clipboard.writeText(text); toast("Handoff note copied."); } catch (e) { toast("Copy is not available in this browser."); } } }, "Copy note"));
  }

  store.subscribe(() => { if (visible) { build(); renderResults(); } });
  document.addEventListener("keydown", (e) => {
    if (!visible || document.querySelector(".overlay")) return;
    if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) { e.preventDefault(); searchInput.focus(); }
    else if (e.key === "Escape" && document.activeElement === searchInput) { S.q = ""; searchInput.value = ""; renderResults(); searchInput.blur(); }
  });

  return {
    el,
    show(params = {}) {
      visible = true;
      build();
      if (params.q != null) { S.q = params.q; searchInput.value = params.q; }
      renderResults();
      if (params.open) setTimeout(() => openRecord(params.open), 60);
      else if (!S.open && window.matchMedia("(min-width: 1180px)").matches && !preview.classList.contains("has")) {
        clear(preview); preview.append(h("div", { class: "pvempty" }, h("div", { class: "orb" }), h("h3", {}, "Select a record"), h("p", { class: "hint" }, "Preview details, evidence-backed claims, links and — for projects — a generated handoff note.")));
      }
    },
    hide() { visible = false; },
  };
}
