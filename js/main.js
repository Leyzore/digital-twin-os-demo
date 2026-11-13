// Application shell: header, routing, command palette, guided tour, about dialog.
import { store, KIND } from "./store.js";
import { h, $, clear, openModal, toast, ICONS, modalOpen } from "./ui.js";
import { createLive } from "./live.js";
import { createTower } from "./tower.js";
import { createLibrary } from "./library.js";
import { createMysi } from "./mysi.js";

const ROUTES = [
  ["live", "Live", "live"],
  ["tower", "Control Tower", "tower"],
  ["library", "Library", "library"],
  ["mysi", "MYSI", "mysi"],
];

const app = { go, askMysi, startTour, openAbout, openPalette };
const views = {};
let current = null;

// ---------- shell ----------
const root = $("#app");
const tabsEl = h("nav", { class: "tabs", "aria-label": "Sections" });
const tabbar = h("nav", { class: "tabbar", "aria-label": "Sections" });
const decideBtn = h("button", { class: "pill decide", title: "Open the decisions waiting for you", onclick: () => go("tower", { tab: "handle", filter: "decide" }) });
const mysiPill = h("button", { class: "pill mysi-pill", title: "Open MYSI", onclick: () => go("mysi") });
const menuBox = h("div", { class: "menu", hidden: true, role: "menu" },
  h("button", { role: "menuitem", onclick: () => { closeMenu(); startTour(); } }, "Take the guided tour"),
  h("button", { role: "menuitem", onclick: () => { closeMenu(); openAbout(); } }, "About this demo"),
  h("button", { role: "menuitem", onclick: () => { closeMenu(); openShortcuts(); } }, "Keyboard shortcuts"),
  h("hr"),
  h("button", { role: "menuitem", onclick: () => { closeMenu(); store.reset(); toast("Demo data reset to its initial state."); } }, "Reset demo data"));
const moreBtn = h("button", { class: "pill", "aria-haspopup": "menu", "aria-expanded": "false", onclick: (e) => { e.stopPropagation(); menuBox.hidden ? openMenu() : closeMenu(); } }, "More ▾");
function openMenu() { menuBox.hidden = false; moreBtn.setAttribute("aria-expanded", "true"); }
function closeMenu() { menuBox.hidden = true; moreBtn.setAttribute("aria-expanded", "false"); }
document.addEventListener("click", () => closeMenu());

root.append(
  h("div", { class: "ribbon" }, h("b", {}, "DEMO"), h("span", {}, "Simulated product demonstration — fictional projects, agents and data. No real backend, no AI model calls."), h("button", { onclick: openAbout }, "About")),
  h("header", { class: "topbar" },
    h("button", { class: "brand", onclick: () => go("live"), "aria-label": "Digital Twin OS — home" }, h("i", { class: "orb" }), h("span", { class: "name" }, "Digital Twin ", h("b", {}, "OS"))),
    tabsEl,
    h("span", { class: "spacer" }),
    h("button", { class: "searchbtn", onclick: openPalette, "aria-label": "Search or ask (Ctrl K)" }, h("span", { html: ICONS.search }), h("span", { class: "lbl" }, "Search or ask…"), h("kbd", {}, "Ctrl K")),
    mysiPill, decideBtn,
    h("div", { class: "menu-wrap" }, moreBtn, menuBox)),
  h("main", { id: "main" }), tabbar);

const main = $("#main");
ROUTES.forEach(([id, label, icon]) => {
  tabsEl.append(h("button", { class: "tab", dataset: { route: id }, onclick: () => go(id) }, label, id === "mysi" && h("i", { class: "dot", id: "mysi-dot" })));
  tabbar.append(h("button", { dataset: { route: id }, onclick: () => go(id), "aria-label": label }, h("span", { html: ICONS[icon], style: { display: "contents" } }), label === "Control Tower" ? "Tower" : label));
});

function syncPills() {
  const c = store.counts();
  decideBtn.textContent = `To decide · ${c.decide}`;
  decideBtn.hidden = c.decide === 0;
  const busy = store.mysiState === "working";
  mysiPill.replaceChildren(h("i", { class: "dot" + (busy ? " busy" : "") }), busy ? "MYSI · Working" : "MYSI · Idle");
  const dot = $("#mysi-dot"); if (dot) dot.classList.toggle("busy", busy);
}
store.subscribe(syncPills);
syncPills();

// ---------- routing ----------
const factories = { live: createLive, tower: createTower, library: createLibrary, mysi: createMysi };
function ensureView(id) {
  if (!views[id]) {
    const v = factories[id](app);
    const holder = h("section", { class: "view", id: "view-" + id, "aria-label": ROUTES.find((r) => r[0] === id)[1] }, v.el);
    main.append(holder);
    views[id] = { ...v, holder };
  }
  return views[id];
}
function show(id, params = {}) {
  if (!factories[id]) id = "live";
  if (current && current !== id) { views[current].hide?.(); views[current].holder.classList.remove("active"); }
  const v = ensureView(id);
  v.holder.classList.add("active");
  current = id;
  document.querySelectorAll("[data-route]").forEach((b) => (b.getAttribute("data-route") === id ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current")));
  document.title = `${ROUTES.find((r) => r[0] === id)[1]} · Digital Twin OS — interactive demo`;
  v.show?.(params);
}
function go(id, params = {}) {
  window.scrollTo({ top: 0 });
  const hash = "#/" + id;
  if (location.hash !== hash) { pending = params; location.hash = hash; } else show(id, params);
}
let pending = null;
window.addEventListener("hashchange", () => {
  const id = location.hash.replace(/^#\/?/, "").split("?")[0] || "live";
  const p = pending || {}; pending = null;
  show(id, p);
});
function askMysi(text, ctx) { go("mysi", { ask: text, ctx }); }

// ---------- command palette ----------
function openPalette() {
  const input = h("input", { class: "input", placeholder: "Search folders, work, decisions, records — or run an action…", "aria-label": "Search", "data-autofocus": "", autocomplete: "off" });
  const ul = h("ul", { role: "listbox" });
  const box = h("div", { class: "palette" }, input, ul);
  const overlay = h("div", { class: "overlay", role: "presentation" }, box);
  const prev = document.activeElement;
  let sel = 0, items = [];
  const close = () => { overlay.remove(); document.removeEventListener("keydown", key, true); prev?.focus?.(); };
  overlay.addEventListener("mousedown", (e) => { if (e.target === overlay) close(); });
  const actions = [
    { t: "Go to Live graph", g: "Action", run: () => go("live") },
    { t: "Go to Control Tower", g: "Action", run: () => go("tower") },
    { t: "Go to Library", g: "Action", run: () => go("library") },
    { t: "Go to MYSI", g: "Action", run: () => go("mysi") },
    { t: "Ask MYSI: What needs my attention today?", g: "Ask MYSI", run: () => askMysi("What needs my attention today?") },
    { t: "Run an example mission", g: "MYSI", run: () => go("mysi", { tab: "missions" }) },
    { t: "Take the guided tour", g: "Action", run: startTour },
    { t: "Reset demo data", g: "Action", run: () => { store.reset(); toast("Demo data reset."); } },
  ];
  const open = (n) => {
    if (["folder", "note", "component", "evidence", "deadend"].includes(n.kind)) go("library", { open: n.id });
    else if (n.kind === "workstream" || n.kind === "decision") go("tower", { tab: "handle", open: n.id });
    else go("live", { select: n.id });
  };
  const GROUP = { folder: "Folder", note: "Library", component: "Library", evidence: "Library", deadend: "Library", workstream: "Workstream", decision: "Decision", reminder: "Reminder" };
  function render() {
    const q = input.value.trim().toLowerCase();
    const nodes = store.all().filter((n) => !q || (n.title + " " + KIND[n.kind].label + " " + (n.tags || []).join(" ")).toLowerCase().includes(q)).slice(0, q ? 30 : 0)
      .map((n) => ({ t: n.title, g: GROUP[n.kind], run: () => open(n), kind: n.kind }));
    const acts = actions.filter((a) => !q || a.t.toLowerCase().includes(q));
    items = [...acts, ...nodes];
    if (q && !nodes.length && !acts.length) items = [{ t: `Ask MYSI: "${input.value.trim()}"`, g: "Ask MYSI", run: () => askMysi(input.value.trim()) }];
    sel = Math.min(sel, items.length - 1);
    clear(ul);
    items.forEach((it, i) => ul.append(h("li", {}, h("button", { role: "option", "aria-selected": String(i === sel), onclick: () => { close(); it.run(); }, onmousemove: () => { sel = i; paint(); } }, h("span", {}, it.t), h("span", { class: "grp" }, it.g)))));
    if (!items.length) ul.append(h("li", { class: "none" }, "No matches."));
  }
  function paint() { [...ul.querySelectorAll("button")].forEach((b, i) => { b.setAttribute("aria-selected", String(i === sel)); if (i === sel) b.scrollIntoView({ block: "nearest" }); }); }
  function key(e) {
    if (e.key === "Escape") { e.stopPropagation(); close(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); sel = Math.min(items.length - 1, sel + 1); paint(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(0, sel - 1); paint(); }
    else if (e.key === "Enter" && items[sel]) { e.preventDefault(); const it = items[sel]; close(); it.run(); }
  }
  document.addEventListener("keydown", key, true);
  input.addEventListener("input", () => { sel = 0; render(); });
  document.body.append(overlay);
  render(); input.focus();
}
document.addEventListener("keydown", (e) => {
  const typing = /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); if (!document.querySelector(".palette")) openPalette(); }
  else if (e.key === "/" && !typing && !modalOpen() && !document.querySelector(".palette") && current !== "tower" && current !== "library") { e.preventDefault(); openPalette(); }
});

// ---------- tour ----------
const TOUR = [
  { route: "live", title: "Live — your organisation as a graph", text: "Drag to rotate, scroll or pinch to zoom, and click any node. Shape shows the type, colour shows the status. The feed below streams simulated activity." },
  { route: "tower", title: "Control Tower — decide, unblock, validate", text: "Open a decision, unblock a stalled workstream or validate a finished result. Every action updates the graph and the counters in the header." },
  { route: "library", title: "Library — memory with evidence", text: "Search records, filter by kind and maturity, and open a preview. Claims either point to evidence or say \"not measured\"." },
  { route: "mysi", title: "MYSI — the coordinator", text: "Ask a question, then run an example mission. You approve the plan and grant the mandate before any agent works." },
];
let tourEl = null;
function startTour(i = 0) {
  tourEl?.remove();
  const s = TOUR[i];
  go(s.route);
  const dots = h("div", { class: "steps" }, TOUR.map((_, k) => h("i", { class: k === i ? "on" : "" })));
  tourEl = h("div", { class: "tour", role: "dialog", "aria-label": "Guided tour" },
    h("div", { class: "eyebrow" }, `Step ${i + 1} of ${TOUR.length}`), h("h3", {}, s.title), h("p", { class: "muted" }, s.text),
    h("div", { class: "row" }, dots,
      i > 0 && h("button", { class: "btn small ghost", onclick: () => startTour(i - 1) }, "Back"),
      h("button", { class: "btn small ghost", onclick: () => { tourEl.remove(); tourEl = null; } }, "Close"),
      h("button", { class: "btn small", onclick: () => (i < TOUR.length - 1 ? startTour(i + 1) : (tourEl.remove(), (tourEl = null), toast("Tour finished. Explore freely!"))) }, i < TOUR.length - 1 ? "Next" : "Finish")));
  document.body.append(tourEl);
}

// ---------- dialogs ----------
function openAbout() {
  const c = h("div", {},
    h("div", { class: "eyebrow" }, "About this demo"), h("h2", {}, "Digital Twin OS — interactive demonstration"),
    h("p", { class: "muted" }, "Digital Twin OS is a personal operating layer for AI-assisted work: a live graph of projects and knowledge, a control tower for decisions, a shared library with evidence, and MYSI, a coordinator that plans work for specialised agents under explicit human consent."),
    h("p", { style: { marginTop: "12px" } }, h("b", {}, "This is a standalone, simulated demo.")),
    h("ul", {},
      h("li", {}, "All projects, clients, agents, tasks, decisions and documents are fictional."),
      h("li", {}, "There is no backend, account, database or AI model behind it. Everything runs in your browser and resets when you reload."),
      h("li", {}, "MYSI answers come from a small set of scripted responses; missions are animated simulations, not real agent runs."),
      h("li", {}, "Numbers such as test counts, scores and budgets are illustrative and not measurements."),
      h("li", {}, "No cookies, analytics or tracking are used.")),
    h("p", { class: "hint" }, "The real system is private; this demo reproduces its look, structure and workflows with sanitised content."),
    h("div", { class: "actions" }, h("button", { class: "btn", "data-autofocus": "", onclick: () => { m.close(); startTour(); } }, "Take the tour"), h("button", { class: "btn ghost", onclick: () => m.close() }, "Close")));
  const m = openModal(c, { label: "About this demo" });
}
function openShortcuts() {
  const rows = [["Ctrl / ⌘ + K", "Search or ask anything"], ["/", "Search (Live, MYSI) or focus the list search (Tower, Library)"], ["J / K", "Move through the Control Tower queue"], ["Enter", "Open the selected item"], ["Esc", "Close a dialog or clear a selection"], ["R", "Recenter the graph"], ["+ / −", "Zoom the graph"]];
  const m = openModal(h("div", {}, h("div", { class: "eyebrow" }, "Keyboard"), h("h2", {}, "Shortcuts"),
    h("table", { class: "ktable" }, rows.map(([k, d]) => h("tr", {}, h("td", {}, h("kbd", { class: "key" }, k)), h("td", {}, d)))),
    h("div", { class: "actions" }, h("button", { class: "btn ghost", onclick: () => m.close() }, "Close"))), { label: "Keyboard shortcuts" });
}
function welcome() {
  if (sessionStorage.getItem("dtos-welcome")) return;
  try { sessionStorage.setItem("dtos-welcome", "1"); } catch (e) { /* ignore */ }
  const m = openModal(h("div", {},
    h("div", { class: "eyebrow" }, "Interactive demo"), h("h2", {}, "Welcome to Digital Twin OS"),
    h("p", { class: "muted" }, "Explore four connected sections: ", h("b", {}, "Live"), ", ", h("b", {}, "Control Tower"), ", ", h("b", {}, "Library"), " and ", h("b", {}, "MYSI"), ". Everything here is a simulation with fictional data."),
    h("div", { class: "actions" },
      h("button", { class: "btn", "data-autofocus": "", onclick: () => { m.close(); startTour(); } }, "Take the 1-minute tour"),
      h("button", { class: "btn ghost", onclick: () => m.close() }, "Explore on my own"))), { label: "Welcome" });
}

// ---------- boot ----------
store.start();
const first = location.hash.replace(/^#\/?/, "").split("?")[0] || "live";
show(first);
if (!location.hash) history.replaceState(null, "", "#/live");
setTimeout(welcome, 350);
window.__dtos = { store, go }; // handy for the test script; contains only fictional demo data
