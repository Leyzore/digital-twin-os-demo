// In-memory demo state shared by all four sections. Nothing is persisted or sent anywhere.
import { FOLDERS, WORKSTREAMS, DECISIONS, EVIDENCE, DEADENDS, COMPONENTS, NOTES, REMINDERS, EXTRA_LINKS, ACTIVITY_SEED, SIM_EVENTS, AGENTS } from "./data.js";

const clone = (o) => JSON.parse(JSON.stringify(o));

class Store {
  constructor() {
    this.listeners = new Set();
    this.mysiState = "idle";
    this.agentState = {};
    this.reset(false);
    this._timers = [];
  }

  reset(notify = true) {
    this.nodes = new Map();
    this.links = [];
    this.activity = [];
    this.version = 0;
    this._seq = 100;
    this.agentState = Object.fromEntries(AGENTS.map((a) => [a.id, "idle"]));
    this.mysiState = "idle";
    const put = (n) => this.nodes.set(n.id, n);
    FOLDERS.forEach((f) => put({ id: f.id, kind: "folder", folder: f.id, title: f.name, status: null, family: f.family, summary: f.blurb, projectStatus: f.status }));
    clone(WORKSTREAMS).forEach((w) => put({ ...w, kind: "workstream" }));
    clone(DECISIONS).forEach((d) => put({ ...d, kind: "decision", status: "decide" }));
    clone(EVIDENCE).forEach((e) => put({ ...e, kind: "evidence", status: null }));
    clone(DEADENDS).forEach((e) => put({ ...e, kind: "deadend", status: null }));
    clone(COMPONENTS).forEach((e) => put({ ...e, kind: "component", status: null }));
    clone(NOTES).forEach((e) => put({ ...e, kind: "note", status: null }));
    clone(REMINDERS).forEach((r) => put({ ...r, kind: "reminder", status: "reminder", summary: "Reminder note attached to " + this.nodes.get(r.folder).title + "." }));

    const seen = new Set();
    const link = (a, b, type = "relates") => {
      if (!this.nodes.has(a) || !this.nodes.has(b) || a === b) return;
      const k = a < b ? a + "|" + b : b + "|" + a;
      if (seen.has(k)) return;
      seen.add(k);
      this.links.push({ a, b, type });
    };
    this.nodes.forEach((n) => { if (n.kind !== "folder") link(n.id, n.folder, "belongs"); });
    this.nodes.forEach((n) => (n.links || []).forEach((t) => link(n.id, t)));
    this.nodes.forEach((n) => { if (n.blockedBy) link(n.id, n.blockedBy, "blocked"); if (n.unblocks) link(n.id, n.unblocks, "unblocks"); });
    EXTRA_LINKS.forEach(([a, b]) => link(a, b));
    this._seen = seen;
    this._link = link;

    ACTIVITY_SEED.forEach(([node, text, mins]) => this.activity.push({ id: ++this._seq, node, text, ts: Date.now() - mins * 60000, kind: "work" }));
    this.activity.sort((a, b) => b.ts - a.ts);
    this.version++;
    if (notify) this.emit({ reset: true });
  }

  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(info = {}) { this.version++; this.listeners.forEach((fn) => { try { fn(info); } catch (e) { console.error(e); } }); }

  get(id) { return this.nodes.get(id); }
  all() { return [...this.nodes.values()]; }
  byKind(kind) { return this.all().filter((n) => n.kind === kind); }
  neighbors(id) {
    const out = [];
    for (const l of this.links) { if (l.a === id) out.push(this.nodes.get(l.b)); else if (l.b === id) out.push(this.nodes.get(l.a)); }
    return out.filter(Boolean);
  }
  folderName(id) { return this.nodes.get(id)?.title || id; }

  counts() {
    const all = this.all();
    const ws = all.filter((n) => n.kind === "workstream");
    const c = (s) => ws.filter((w) => w.status === s).length;
    const folders = all.filter((n) => n.kind === "folder");
    const active = new Set(ws.filter((w) => w.status !== "done").map((w) => w.folder));
    return {
      decide: all.filter((n) => n.kind === "decision" && n.status === "decide").length,
      blocked: c("blocked"), validate: c("validate"), running: c("running"), todo: c("todo"), done: c("done"),
      reminder: all.filter((n) => n.status === "reminder").length,
      workstreams: ws.length, folders: folders.length,
      idleFolders: folders.filter((f) => !active.has(f.id)).length,
      elements: all.length, links: this.links.length,
    };
  }

  toHandle() {
    const order = { blocked: 0, validate: 1, decide: 2 };
    return this.all()
      .filter((n) => (n.kind === "workstream" && (n.status === "blocked" || n.status === "validate")) || (n.kind === "decision" && n.status === "decide"))
      .sort((a, b) => order[a.status] - order[b.status]);
  }

  log(text, node = null, kind = "work") {
    this.activity.unshift({ id: ++this._seq, node, text, ts: Date.now(), kind });
    if (this.activity.length > 60) this.activity.length = 60;
  }

  nextId(prefix) { return prefix + (++this._seq); }

  // ----- workflows -----
  resolveDecision(id, optIndex) {
    const d = this.get(id);
    if (!d || d.status !== "decide") return;
    if (optIndex === "defer") {
      d.status = "reminder"; d.deferred = true;
      this.log(`Decision deferred: "${d.title}" moved to Reminders.`, id, "decision");
    } else {
      d.status = "done"; d.chosen = d.options[optIndex]?.label;
      this.log(`You decided: "${d.chosen}" — ${d.title}`, id, "decision");
      if (d.unblocks) {
        const w = this.get(d.unblocks);
        if (w && w.status === "blocked") {
          w.status = "running"; w.reason = null;
          this.log(`"${w.title}" resumed automatically after the decision.`, w.id, "work");
        }
      }
    }
    this.emit();
  }

  unblock(id, optIndex) {
    const w = this.get(id);
    if (!w || w.status !== "blocked") return;
    const opt = w.unblock?.[optIndex];
    w.status = "running"; w.reason = null;
    if (w.blockedBy) { const d = this.get(w.blockedBy); if (d && d.status === "decide") { d.status = "done"; d.chosen = "Resolved from the blocked workstream"; } }
    this.log(`Unblocked "${w.title}" — ${opt ? opt.label : "resumed"}.`, id, "work");
    this.emit();
  }

  startWorkstream(id) {
    const w = this.get(id);
    if (!w || w.status !== "todo") return;
    w.status = "running"; w.progress = Math.max(w.progress, 4);
    this.log(`Started "${w.title}".`, id, "work");
    this.emit();
  }

  reviewResult(id, accept) {
    const w = this.get(id);
    if (!w || w.status !== "validate") return;
    if (accept) { w.status = "done"; w.progress = 100; this.log(`You validated the result of "${w.title}".`, id, "decision"); }
    else { w.status = "running"; w.progress = 70; this.log(`You requested changes on "${w.title}"; work resumed.`, id, "decision"); }
    this.emit();
  }

  dismissReminder(id) {
    const n = this.get(id);
    if (!n || n.status !== "reminder") return;
    if (n.kind === "decision") { n.status = "decide"; n.deferred = false; this.log(`Decision back in your queue: "${n.title}".`, id, "decision"); }
    else { n.status = "done"; this.log(`Reminder dismissed: ${n.title}`, id, "system"); }
    this.emit();
  }

  dismissAllReminders() {
    this.all().filter((n) => n.status === "reminder" && n.kind === "reminder").forEach((n) => (n.status = "done"));
    this.log("All reminders dismissed.", null, "system");
    this.emit();
  }

  addWorkstream({ folder, title, status = "todo", progress = 0, agent = "scout", summary = "", result = "" }) {
    const id = this.nextId("w");
    this.nodes.set(id, { id, kind: "workstream", folder, title, status, progress, agent, age: "just now", summary: summary || "Created in this demo session.", result });
    this._link(id, folder, "belongs");
    this.log(`New workstream created: "${title}".`, id, "work");
    this.emit({ added: id });
    return id;
  }

  addDecision({ folder, title, ctx, options, rec = 0, why = "", age = "just now" }) {
    const id = this.nextId("d");
    this.nodes.set(id, { id, kind: "decision", folder, title, status: "decide", ctx, options, rec, why, age, summary: ctx });
    this._link(id, folder, "belongs");
    this.log(`A new decision needs you: "${title}".`, id, "decision");
    this.emit({ added: id });
    return id;
  }

  setMysi(state) { this.mysiState = state; this.emit({ mysi: true }); }
  setAgent(id, state) { this.agentState[id] = state; this.emit({ mysi: true }); }

  // ----- simulation ticker -----
  start() {
    if (this._ticking) return;
    this._ticking = true;
    let i = 0;
    const tick = () => {
      if (document.hidden) return;
      const running = this.byKind("workstream").filter((w) => w.status === "running");
      if (running.length) {
        const w = running[Math.floor(Math.random() * running.length)];
        w.progress = Math.min(100, w.progress + 3 + Math.floor(Math.random() * 7));
        if (w.progress >= 100) {
          w.status = "validate"; w.result = w.result || "Work finished. Deterministic checks passed; the reviewer found no blocking issue.";
          this.log(`Result ready for your judgement: "${w.title}".`, w.id, "work");
        } else if (i % 2 === 0) {
          this.log(`${w.title} reached ${w.progress}%.`, w.id, "work");
        }
      }
      if (i % 3 === 1) {
        const f = SIM_EVENTS[Math.floor(Math.random() * SIM_EVENTS.length)];
        this.log(f(2 + Math.floor(Math.random() * 6)), null, "system");
      }
      i++;
      this.emit({ tick: true });
    };
    this._timers.push(setInterval(tick, 7000));
  }
}

export const store = new Store();

export function relTime(ts) {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 10) return "just now";
  if (s < 60) return s + " s ago";
  const m = Math.round(s / 60);
  if (m < 60) return m + " min ago";
  const h = Math.round(m / 60);
  if (h < 24) return h + " h ago";
  return Math.round(h / 24) + " d ago";
}

export const STATUS = {
  blocked: { label: "Blocked", color: "#f06ab4" },
  validate: { label: "To validate", color: "#ffc59e" },
  running: { label: "Running", color: "#b6e6da" },
  todo: { label: "To do", color: "#9dbbff" },
  decide: { label: "To decide", color: "#cf9cf0" },
  reminder: { label: "Reminder", color: "#9c86ad" },
  done: { label: "Done", color: "#6f5a80" },
};

export const KIND = {
  folder: { label: "Folder", plural: "folders", shape: "hub" },
  workstream: { label: "Workstream", plural: "workstreams", shape: "square" },
  note: { label: "Note", plural: "notes", shape: "circle" },
  decision: { label: "Decision", plural: "decisions", shape: "dot" },
  evidence: { label: "Evidence", plural: "evidence", shape: "triangle" },
  deadend: { label: "Dead end", plural: "dead ends", shape: "cross" },
  component: { label: "Component", plural: "components", shape: "diamond" },
  reminder: { label: "Reminder", plural: "reminders", shape: "dot" },
};
