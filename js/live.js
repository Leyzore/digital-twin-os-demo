// Live — interactive 3D knowledge and project graph (canvas), inspector and simulated activity feed.
import { store, STATUS, KIND, relTime } from "./store.js";
import { h, clear, toast, cap } from "./ui.js";

const TABS = [
  ["all", "All", null],
  ["workstreams", "Workstreams", new Set(["workstream"])],
  ["library", "Library", new Set(["note", "component"])],
  ["decisions", "Decisions", new Set(["decision"])],
  ["evidence", "Evidence", new Set(["evidence", "deadend"])],
];
const TYPE_CHIPS = ["workstream", "note", "decision", "evidence", "deadend", "component"];
const STATUS_CHIPS = ["blocked", "validate", "running", "todo", "decide", "reminder"];
const NEUTRAL = "#ecd2fa";
const LIBRARY_KINDS = new Set(["folder", "note", "component", "evidence", "deadend"]);

function hashRand(str) {
  let a = 2166136261;
  for (let i = 0; i < str.length; i++) { a ^= str.charCodeAt(i); a = Math.imul(a, 16777619); }
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function createLive(app) {
  const el = h("div", { class: "wrap live" });
  const filters = { tab: "all", kinds: new Set(), statuses: new Set() };
  let selected = null, hovered = null, isolate = false;
  const pos = new Map();
  let list = [], listVersion = -1;

  // ---------- layout ----------
  function ensurePositions() {
    const folders = store.byKind("folder");
    folders.forEach((f, i) => {
      if (pos.has(f.id)) return;
      const n = folders.length, k = i + 0.5;
      const phi = Math.acos(1 - (2 * k) / n), th = Math.PI * (1 + Math.sqrt(5)) * k;
      const r = hashRand(f.id);
      const R = 0.62 + r() * 0.16;
      pos.set(f.id, { x: Math.cos(th) * Math.sin(phi) * R, y: Math.cos(phi) * R * 0.9, z: Math.sin(th) * Math.sin(phi) * R });
    });
    store.all().forEach((n) => {
      if (pos.has(n.id)) return;
      const hub = pos.get(n.folder) || { x: 0, y: 0, z: 0 };
      const r = hashRand(n.id);
      const u = r() * 2 - 1, t = r() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      const d = 0.11 + Math.pow(r(), 0.75) * (n.kind === "reminder" ? 0.3 : 0.26);
      pos.set(n.id, { x: hub.x + s * Math.cos(t) * d, y: hub.y + u * d, z: hub.z + s * Math.sin(t) * d });
    });
  }

  // ---------- header and controls (DOM) ----------
  const clockEl = h("span", { class: "mono" });
  const metaEl = h("div", { class: "live-meta" });
  const feedEl = h("section", { class: "panel feed", "aria-label": "Activity feed" });
  const inspEl = h("aside", { class: "panel inspector", "aria-live": "polite" });
  const tabsEl = h("div", { class: "live-tabs", role: "tablist" });
  const typeEl = h("div", { class: "chiprow" });
  const statusEl = h("div", { class: "chiprow" });
  const hudL = h("span", {}), hudR = h("span", { class: "mono" });
  const captionEl = h("p", { class: "caption" });
  const tip = h("div", { class: "gtip", hidden: true });
  const canvas = h("canvas", { class: "gcanvas", role: "img", "aria-label": "Interactive 3D graph of folders, workstreams, decisions, evidence and components. Use the inspector or the lists to navigate by keyboard." });
  const isoBtn = h("button", { class: "gbtn", disabled: true, onclick: () => { isolate = !isolate; syncControls(); } }, "Isolate selection");
  const clearBtn = h("button", { class: "gbtn", onclick: () => { filters.tab = "all"; filters.kinds.clear(); filters.statuses.clear(); renderFilters(); } }, "Clear filters");
  const controls = h("div", { class: "gctrl" },
    h("button", { class: "gbtn sq", "aria-label": "Zoom in", onclick: () => zoomBy(1.25) }, "+"),
    h("button", { class: "gbtn sq", "aria-label": "Zoom out", onclick: () => zoomBy(0.8) }, "−"),
    h("button", { class: "gbtn", onclick: recenter }, "Recenter"),
    isoBtn, clearBtn);

  el.append(
    h("header", { class: "live-head" },
      h("div", {}, h("div", { class: "eyebrow" }, "Digital Twin OS / Live"), metaEl),
      h("div", { class: "live-status" }, clockEl, h("span", { class: "tag sim" }, "Simulated feed"), h("span", { class: "livedot" }, "Live"))),
    tabsEl,
    h("div", { class: "filters" }, typeEl, statusEl),
    h("p", { class: "explain" }, h("b", {}, "What are you looking at? "), "A fictional organisation: nine folders (large glowing nodes) and the work, decisions and knowledge attached to them. ", h("b", {}, "Shape = type · colour = status"), ". Size and position carry no meaning."),
    h("div", { class: "live-main" },
      h("section", { class: "panel graph-panel" },
        h("div", { class: "graph-top" }, hudL, hudR),
        h("div", { class: "canvas-wrap" }, canvas, tip, controls),
        captionEl),
      inspEl),
    h("p", { class: "hint legend-hint" }, "Drag to rotate · right-drag or shift-drag to pan · scroll or pinch to zoom · click or tap a node to select · Esc to clear · R to recenter"),
    feedEl);

  // ---------- filters ----------
  const isLit = (n) => {
    if (n.kind === "folder") return true;
    const tab = TABS.find((t) => t[0] === filters.tab)[2];
    if (tab && !tab.has(n.kind)) return false;
    if (filters.kinds.size && !filters.kinds.has(n.kind)) return false;
    if (filters.statuses.size && !filters.statuses.has(n.status)) return false;
    return true;
  };

  function renderFilters() {
    const c = store.counts();
    clear(tabsEl);
    TABS.forEach(([id, label]) => tabsEl.append(h("button", { role: "tab", class: "ltab", "aria-selected": String(filters.tab === id), onclick: () => { filters.tab = id; renderFilters(); } }, label)));
    clear(typeEl); clear(statusEl);
    const count = (k) => store.byKind(k).length;
    TYPE_CHIPS.forEach((k) => typeEl.append(h("button", { class: "chip", "aria-pressed": String(filters.kinds.has(k)), onclick: () => { filters.kinds.has(k) ? filters.kinds.delete(k) : filters.kinds.add(k); renderFilters(); } },
      h("span", { class: "sw " + KIND[k].shape, style: { width: "10px", height: "10px", color: NEUTRAL } }), KIND[k].plural, h("span", { class: "n" }, count(k)))));
    STATUS_CHIPS.forEach((s) => {
      const n = s === "reminder" ? c.reminder : s === "decide" ? c.decide : store.all().filter((x) => x.kind === "workstream" && x.status === s).length;
      statusEl.append(h("button", { class: "chip", "aria-pressed": String(filters.statuses.has(s)), onclick: () => { filters.statuses.has(s) ? filters.statuses.delete(s) : filters.statuses.add(s); renderFilters(); } },
        h("span", { class: "sw circle", style: { width: "9px", height: "9px", color: STATUS[s].color } }), STATUS[s].label.toLowerCase(), h("span", { class: "n" }, n)));
    });
    const lit = list.filter(isLit).length;
    captionEl.textContent = `${c.elements} elements · ${c.folders} folders · 4 families — hover, click or tap to explore.` + (lit < list.length ? ` ${lit} match the current filters.` : "");
  }

  function renderMeta() {
    const c = store.counts();
    const d = new Date();
    metaEl.textContent = `SOURCE DEMO DATASET · ${c.folders} FOLDERS · ${c.elements} ELEMENTS · ${c.links} LINKS · UPDATED ${d.toTimeString().slice(0, 5)}`;
  }

  // ---------- feed ----------
  function renderFeed() {
    clear(feedEl);
    feedEl.append(h("div", { class: "feed-head" }, h("h3", {}, "Activity"), h("span", { class: "hint" }, "Fictional events generated in your browser")));
    const ul = h("ul", { class: "feedlist" });
    store.activity.slice(0, 12).forEach((a, i) => {
      const t = new Date(a.ts);
      ul.append(h("li", { class: i === 0 ? "new" : "" },
        h("button", { onclick: () => a.node && select(a.node, true), disabled: !a.node, title: a.node ? "Show in graph" : "" },
          h("span", { class: "mono tm" }, t.toTimeString().slice(0, 5)), h("span", { class: "tx" }, a.text), h("span", { class: "tag sim" }, "Simulated"), h("span", { class: "ago hint" }, relTime(a.ts)))));
    });
    feedEl.append(ul);
  }

  // ---------- inspector ----------
  function renderInspector() {
    clear(inspEl);
    const n = selected && store.get(selected);
    if (!n) {
      inspEl.append(h("div", { class: "eyebrow" }, "Folder index"), h("h3", { class: "insp-title" }, "Select a node"),
        h("p", { class: "hint" }, "Click any node in the graph, or pick a folder below to fly to it."));
      const fams = {};
      store.byKind("folder").forEach((f) => (fams[f.family] ||= []).push(f));
      Object.entries(fams).forEach(([fam, fs]) => {
        inspEl.append(h("div", { class: "eyebrow fam" }, fam));
        fs.forEach((f) => inspEl.append(h("button", { class: "idxrow", onclick: () => select(f.id, true) }, h("span", {}, f.title), h("span", { class: "n mono" }, store.neighbors(f.id).length))));
      });
      return;
    }
    const st = n.status && STATUS[n.status];
    inspEl.append(
      h("div", { class: "insp-top" }, h("div", { class: "eyebrow" }, KIND[n.kind].label), h("button", { class: "icon-btn", "aria-label": "Clear selection", onclick: () => select(null) }, "×")),
      h("h3", { class: "insp-title" }, n.title),
      h("div", { class: "insp-tags" }, st && h("span", { class: "tag " + n.status }, st.label), n.kind !== "folder" && h("span", { class: "tag kind" }, store.folderName(n.folder))),
      n.kind === "workstream" && h("div", { class: "insp-prog" }, h("div", { class: "progress" }, h("i", { style: { width: n.progress + "%" } })), h("span", { class: "hint mono" }, n.progress + "% · " + (n.agent ? cap(n.agent) : ""))),
      h("p", { class: "insp-sum" }, n.summary || ""));
    if (n.kind === "folder") inspEl.append(h("div", { class: "hint" }, `${n.family} · ${n.projectStatus === "paused" ? "paused" : "active"}`));
    const actions = h("div", { class: "insp-actions" });
    if (LIBRARY_KINDS.has(n.kind)) actions.append(h("button", { class: "btn small", onclick: () => app.go("library", { open: n.id }) }, "Open in Library"));
    if (n.kind === "workstream" || n.kind === "decision") actions.append(h("button", { class: "btn small", onclick: () => app.go("tower", { tab: "handle", open: n.id }) }, n.kind === "decision" ? "Decide in Control Tower" : "Open in Control Tower"));
    if (n.kind === "reminder") actions.append(h("button", { class: "btn small ghost", onclick: () => { store.dismissReminder(n.id); toast("Reminder dismissed."); } }, "Dismiss reminder"));
    actions.append(h("button", { class: "btn small ghost", onclick: () => { isolate = !isolate; syncControls(); } }, isolate ? "Show everything" : "Isolate"));
    inspEl.append(actions);
    const nb = store.neighbors(n.id).filter((x) => x.id !== n.id);
    inspEl.append(h("div", { class: "eyebrow fam" }, "Related · " + nb.length));
    const groups = {};
    nb.forEach((x) => (groups[x.kind] ||= []).push(x));
    const box = h("div", { class: "relbox" });
    Object.entries(groups).forEach(([k, xs]) => {
      box.append(h("div", { class: "relgrp" }, `${xs.length} ${xs.length > 1 ? KIND[k].plural : KIND[k].label.toLowerCase()}`));
      xs.slice(0, 7).forEach((x) => box.append(h("button", { class: "relrow", onclick: () => select(x.id, true) },
        h("span", { class: "sw " + (KIND[x.kind].shape === "hub" ? "hub" : KIND[x.kind].shape), style: { width: "9px", height: "9px", color: colorOf(x), flex: "none" } }), h("span", { class: "rt" }, x.title))));
      if (xs.length > 7) box.append(h("div", { class: "hint more" }, `+ ${xs.length - 7} more`));
    });
    inspEl.append(box);
  }

  function select(id, focus = false) {
    selected = id || null;
    if (!selected) isolate = false;
    syncControls();
    renderInspector();
    if (selected && focus) { flyTo(selected); if (window.innerWidth < 1000) inspEl.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
    if (!selected) { /* resume auto rotation */ lastInput = performance.now() - 1500; }
  }
  function syncControls() { isoBtn.disabled = !selected; isoBtn.textContent = isolate ? "Show everything" : "Isolate selection"; isoBtn.classList.toggle("on", isolate); renderInspector(); }

  // ---------- rendering ----------
  const cam = { yaw: 0.6, pitch: 0.28, zoom: 1, panX: 0, panY: 0 };
  let anim = null, W = 0, H = 0, dpr = 1, lastInput = 0, fpsAvg = 60, drawMs = 0, lastFrame = 0, hudT = 0, running = false, raf = 0;
  const sprites = new Map();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ctx = canvas.getContext("2d");
  const stars = Array.from({ length: 140 }, (_, i) => { const r = hashRand("star" + i); return { x: r(), y: r(), s: 0.4 + r() * 1.1, a: 0.15 + r() * 0.5 }; });

  const colorOf = (n) => (n.status ? STATUS[n.status].color : n.kind === "folder" ? "#ffffff" : NEUTRAL);
  function sprite(color) {
    let s = sprites.get(color);
    if (s) return s;
    s = document.createElement("canvas"); s.width = s.height = 96;
    const g = s.getContext("2d"), grad = g.createRadialGradient(48, 48, 0, 48, 48, 48);
    grad.addColorStop(0, color); grad.addColorStop(0.18, color + "cc"); grad.addColorStop(0.5, color + "30"); grad.addColorStop(1, color + "00");
    g.fillStyle = grad; g.fillRect(0, 0, 96, 96);
    sprites.set(color, s);
    return s;
  }

  function resize() {
    const r = canvas.parentElement.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(200, r.width); H = Math.max(240, r.height);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
  }

  function projector() {
    const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    const base = Math.min(W, H) * 0.5, S = base * cam.zoom;
    return {
      S,
      to(p) {
        const x1 = p.x * cy + p.z * sy, z1 = -p.x * sy + p.z * cy;
        const y2 = p.y * cp - z1 * sp, z2 = p.y * sp + z1 * cp;
        const k = 1 / (1 - z2 * 0.32);
        return { x: W / 2 + cam.panX + x1 * S * k, y: H / 2 + cam.panY + y2 * S * k, z: z2, k, rx: x1, ry: y2 };
      },
    };
  }

  function rebuildList() {
    ensurePositions();
    list = store.all();
    listVersion = store.version;
  }

  let proj = [], projMap = new Map();
  function drawShape(kind, x, y, r) {
    ctx.beginPath();
    switch (kind) {
      case "square": { const s = r * 1.6; ctx.roundRect(x - s / 2, y - s / 2, s, s, 2); break; }
      case "triangle": ctx.moveTo(x, y - r * 1.15); ctx.lineTo(x + r * 1.05, y + r * 0.8); ctx.lineTo(x - r * 1.05, y + r * 0.8); ctx.closePath(); break;
      case "diamond": ctx.moveTo(x, y - r * 1.2); ctx.lineTo(x + r * 1.05, y); ctx.lineTo(x, y + r * 1.2); ctx.lineTo(x - r * 1.05, y); ctx.closePath(); break;
      case "cross": { const a = r * 0.95; ctx.moveTo(x - a, y - a); ctx.lineTo(x + a, y + a); ctx.moveTo(x + a, y - a); ctx.lineTo(x - a, y + a); break; }
      default: ctx.arc(x, y, r, 0, Math.PI * 2);
    }
  }

  function frame(ts) {
    raf = requestAnimationFrame(frame);
    if (!running) return;
    const dt = Math.min(0.1, (ts - (lastFrame || ts)) / 1000); lastFrame = ts;
    if (dt > 0) fpsAvg += (Math.min(60, 1 / dt) - fpsAvg) * 0.05;
    const t0 = performance.now();
    if (listVersion !== store.version) { rebuildList(); }
    // camera animation / auto-rotation
    if (anim) {
      let done = true;
      for (const k of ["yaw", "pitch", "zoom", "panX", "panY"]) {
        const d = anim[k] - cam[k];
        if (Math.abs(d) > (k === "zoom" ? 0.002 : k.startsWith("pan") ? 0.4 : 0.002)) { cam[k] += d * Math.min(1, dt * 7); done = false; } else cam[k] = anim[k];
      }
      if (done) anim = null;
    } else if (!reduced && !selected && !drag && performance.now() - lastInput > 2500) cam.yaw += dt * 0.06;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // stars
    ctx.fillStyle = "#f2e4ff";
    for (const s of stars) { ctx.globalAlpha = s.a * (0.7 + 0.3 * Math.sin(ts / 900 + s.x * 20)); ctx.fillRect(s.x * W, s.y * H, s.s, s.s); }
    ctx.globalAlpha = 1;

    const P = projector();
    const focus = selected ? new Set([selected, ...store.neighbors(selected).map((n) => n.id)]) : null;
    proj.length = 0; projMap.clear();
    for (const n of list) {
      const lit = isLit(n), inFocus = !focus || focus.has(n.id);
      if (isolate && focus && !inFocus) continue;
      const p = P.to(pos.get(n.id));
      const o = { n, p, a: lit && inFocus ? 1 : lit ? 0.16 : 0.07, lit: lit && inFocus };
      proj.push(o); projMap.set(n.id, o);
    }
    proj.sort((a, b) => a.p.z - b.p.z);

    // edges
    ctx.lineWidth = 1;
    for (const l of store.links) {
      const A = projMap.get(l.a), B = projMap.get(l.b);
      if (!A || !B) continue;
      const hot = (selected && (l.a === selected || l.b === selected)) || (hovered && (l.a === hovered || l.b === hovered));
      const both = A.lit && B.lit;
      const depth = 0.5 + 0.5 * ((A.p.z + B.p.z) / 2 + 1) / 2;
      ctx.strokeStyle = hot ? `rgba(247,182,220,${0.85})` : `rgba(214,170,240,${(both ? 0.22 : 0.05) * depth})`;
      ctx.lineWidth = hot ? 1.6 : l.type === "belongs" ? 0.8 : 1;
      ctx.beginPath(); ctx.moveTo(A.p.x, A.p.y); ctx.lineTo(B.p.x, B.p.y); ctx.stroke();
    }

    // nodes
    const zs = Math.pow(cam.zoom, 0.55);
    for (const o of proj) {
      const { n, p } = o;
      const col = colorOf(n), kind = KIND[n.kind].shape;
      const baseR = n.kind === "folder" ? 11 : n.kind === "workstream" ? 6 : n.kind === "reminder" ? 2.8 : 4.2;
      const r = baseR * p.k * zs * (0.85 + 0.15 * (p.z + 1));
      const sel = n.id === selected, hov = n.id === hovered;
      ctx.globalAlpha = o.a * (n.status === "done" ? 0.55 : 1);
      const glow = r * (n.kind === "folder" ? 7 : 4.6) * (sel || hov ? 1.35 : 1);
      ctx.drawImage(sprite(col), p.x - glow, p.y - glow, glow * 2, glow * 2);
      if (n.kind === "folder") {
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.8, 0, 6.3); ctx.fill();
      } else if (kind === "cross") {
        ctx.strokeStyle = col; ctx.lineWidth = 1.8; drawShape(kind, p.x, p.y, r); ctx.stroke();
      } else {
        ctx.fillStyle = col; drawShape(kind, p.x, p.y, r); ctx.fill();
      }
      if (sel || hov) { ctx.globalAlpha = 1; ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p.x, p.y, r * 1.9 + 3, 0, 6.3); ctx.stroke(); }
      o.r = r;
    }
    // labels: selected/hovered first, then nearest folders; flip at the edges and skip collisions
    ctx.textBaseline = "middle";
    const placed = [];
    const pri = (o) => (o.n.id === selected || o.n.id === hovered ? 2 : o.n.kind === "folder" ? 1 : 0) * 10 + o.p.z;
    for (const o of [...proj].sort((x, y) => pri(y) - pri(x))) {
      const { n, p } = o;
      const forced = n.id === selected || n.id === hovered;
      const show = n.kind === "folder" ? o.a > 0.5 || o.lit : forced || (focus && focus.has(n.id) && o.lit && (n.kind === "workstream" || n.kind === "decision" || focus.size < 14)) || (cam.zoom > 2 && n.kind === "workstream" && o.lit);
      if (!show) continue;
      const big = n.kind === "folder";
      ctx.font = `${big ? 600 : 500} ${big ? 13 : 11.5}px Manrope, system-ui, sans-serif`;
      const label = big || forced ? n.title : n.title.length > 34 ? n.title.slice(0, 33) + "…" : n.title;
      const tw = ctx.measureText(label).width, gap = (o.r || 6) + 6;
      let lx = p.x + gap, align = "left";
      if (lx + tw > W - 6) { lx = p.x - gap; align = "right"; }
      const x0 = align === "left" ? lx : lx - tw;
      if (x0 < 6) continue;
      const box = [x0 - 3, p.y - 9, x0 + tw + 3, p.y + 9];
      if (!forced && placed.some((q) => box[0] < q[2] && box[2] > q[0] && box[1] < q[3] && box[3] > q[1])) continue;
      placed.push(box);
      ctx.textAlign = align;
      ctx.globalAlpha = Math.min(1, 0.45 + 0.55 * (p.z + 1) / 2 + (n.id === selected ? 0.5 : 0));
      ctx.lineWidth = 4; ctx.strokeStyle = "rgba(21,6,32,0.85)"; ctx.lineJoin = "round";
      ctx.strokeText(label, lx, p.y); ctx.fillStyle = big ? "#fffff2" : "#ecd2fa"; ctx.fillText(label, lx, p.y);
    }
    ctx.textAlign = "left";
    ctx.globalAlpha = 1;
    drawMs += (performance.now() - t0 - drawMs) * 0.1;
    if (ts - hudT > 250) {
      hudT = ts;
      const c = store.counts();
      hudL.textContent = `GRAPH · ${c.elements} ELEMENTS · ${c.links} LINKS` + (filters.tab !== "all" ? " · " + filters.tab.toUpperCase() : "") + (selected ? " › " + (() => { const t = store.get(selected)?.title.toUpperCase() || ""; return t.length > 30 ? t.slice(0, 29) + "…" : t; })() : "");
      hudR.textContent = `ROTATION ${Math.round(((cam.yaw * 180) / Math.PI) % 360 + 360) % 360}° · ZOOM ${cam.zoom.toFixed(2)}× · DRAW ${drawMs.toFixed(1)} MS · ${Math.round(fpsAvg)} FPS`;
    }
  }

  // ---------- camera actions ----------
  function zoomBy(f) { anim = null; cam.zoom = Math.max(0.5, Math.min(5, cam.zoom * f)); lastInput = performance.now(); }
  function recenter() { anim = { yaw: cam.yaw, pitch: 0.28, zoom: 1, panX: 0, panY: 0 }; selected && select(null); lastInput = performance.now(); }
  function flyTo(id) {
    const p = pos.get(id); if (!p) return;
    const zoomT = Math.max(cam.zoom, 1.7);
    const base = Math.min(W, H) * 0.5, S = base * zoomT;
    const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    const x1 = p.x * cy + p.z * sy, z1 = -p.x * sy + p.z * cy, y2 = p.y * cp - z1 * sp, z2 = p.y * sp + z1 * cp;
    const k = 1 / (1 - z2 * 0.32);
    anim = { yaw: cam.yaw, pitch: cam.pitch, zoom: zoomT, panX: -x1 * S * k, panY: -y2 * S * k };
  }

  // ---------- pointer interaction ----------
  let drag = null;
  const ptrs = new Map();
  function pick(x, y, touch) {
    let best = null, bd = 1e9;
    for (let i = proj.length - 1; i >= 0; i--) {
      const o = proj[i]; if (!o.lit && !(isolate)) continue;
      const d = Math.hypot(o.p.x - x, o.p.y - y), lim = Math.max(10, (o.r || 5) * 1.8) + (touch ? 12 : 4);
      if (d < lim && d - (o.r || 0) * 0.3 < bd) { bd = d; best = o.n; }
    }
    return best;
  }
  const local = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    anim = null; lastInput = performance.now();
    const pan = e.button === 2 || e.button === 1 || e.shiftKey;
    drag = { moved: 0, pan, t: performance.now(), startX: e.clientX, startY: e.clientY, pinch: ptrs.size === 2 ? pinchDist() : 0, touch: e.pointerType === "touch" };
  });
  const pinchDist = () => { const [a, b] = [...ptrs.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  canvas.addEventListener("pointermove", (e) => {
    const [lx, ly] = local(e);
    if (!ptrs.has(e.pointerId)) { updateHover(lx, ly, e); return; }
    const prev = ptrs.get(e.pointerId); const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    lastInput = performance.now();
    if (!drag) return;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    if (ptrs.size === 2) {
      const d = pinchDist();
      if (drag.pinch) cam.zoom = Math.max(0.5, Math.min(5, cam.zoom * (d / drag.pinch)));
      drag.pinch = d; cam.panX += dx / 2; cam.panY += dy / 2;
    } else if (drag.pan) { cam.panX += dx; cam.panY += dy; }
    else { cam.yaw += dx * 0.0065; cam.pitch = Math.max(-1.35, Math.min(1.35, cam.pitch + dy * 0.0065)); }
  });
  function endPtr(e) {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId);
    if (drag && ptrs.size === 0) {
      const click = drag.moved < 6 && performance.now() - drag.t < 600;
      if (click) {
        const [x, y] = local(e), n = pick(x, y, drag.touch);
        if (n) select(n.id, false); else if (selected) select(null);
      }
      drag = null;
    }
  }
  canvas.addEventListener("pointerup", endPtr);
  canvas.addEventListener("pointercancel", endPtr);
  canvas.addEventListener("pointerleave", () => { if (!drag) { hovered = null; tip.hidden = true; canvas.style.cursor = ""; } });
  canvas.addEventListener("wheel", (e) => { e.preventDefault(); anim = null; lastInput = performance.now(); cam.zoom = Math.max(0.5, Math.min(5, cam.zoom * Math.exp(-e.deltaY * 0.0014))); }, { passive: false });
  function updateHover(x, y, e) {
    if (drag) return;
    const n = pick(x, y, false);
    hovered = n ? n.id : null;
    canvas.style.cursor = n ? "pointer" : "grab";
    if (n) {
      tip.hidden = false;
      tip.innerHTML = "";
      tip.append(h("b", {}, n.title), h("span", {}, KIND[n.kind].label + (n.status ? " · " + STATUS[n.status].label : "")));
      tip.style.left = Math.min(x + 14, W - 230) + "px"; tip.style.top = Math.max(8, y - 12) + "px";
    } else tip.hidden = true;
  }
  const onKey = (e) => {
    if (!el.parentElement?.classList.contains("active") || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || document.querySelector(".overlay")) return;
    if (e.key === "Escape") select(null);
    else if (e.key === "+" || e.key === "=") zoomBy(1.2);
    else if (e.key === "-") zoomBy(0.83);
    else if (e.key.toLowerCase() === "r" && !e.ctrlKey && !e.metaKey) recenter();
  };
  document.addEventListener("keydown", onKey);

  new ResizeObserver(() => { if (el.offsetParent) resize(); }).observe(canvas.parentElement);
  rebuildList();
  renderFilters(); renderMeta(); renderFeed(); renderInspector();
  setInterval(() => { if (running) clockEl.textContent = new Date().toTimeString().slice(0, 8); }, 1000);
  clockEl.textContent = new Date().toTimeString().slice(0, 8);

  let lastRendered = -1;
  store.subscribe((info) => {
    if (!running && !info.reset) return;
    if (info.reset) { selected = null; isolate = false; pos.clear(); }
    rebuildList();
    renderFilters(); renderMeta(); renderFeed();
    if (selected && !store.get(selected)) selected = null;
    syncControls();
  });
  setInterval(() => { if (running) renderFeed(); }, 20000); // keep "x min ago" fresh
  raf = requestAnimationFrame(frame);

  return {
    el,
    show(params = {}) {
      running = true; lastFrame = 0;
      resize();
      requestAnimationFrame(() => { resize(); rebuildList(); renderFilters(); renderFeed(); renderMeta(); if (params.select) { filters.tab = "all"; select(params.select, true); } });
    },
    hide() { running = false; },
    selectNode: (id) => select(id, true),
  };
}
