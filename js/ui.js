// Small DOM helpers shared by every section.
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "html") el.innerHTML = v;
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "dataset") Object.assign(el.dataset, v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };
export const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export function toast(msg, { ms = 3200 } = {}) {
  let box = $("#toasts");
  if (!box) { box = h("div", { id: "toasts", class: "toasts", role: "status", "aria-live": "polite" }); document.body.append(box); }
  const t = h("div", { class: "toast" }, h("span", { class: "tick" }, "✓"), h("span", {}, msg));
  box.append(t);
  setTimeout(() => t.remove(), ms);
}

let modalStack = [];
export function openModal(content, { onClose, label = "Dialog", cls = "" } = {}) {
  const prevFocus = document.activeElement;
  const overlay = h("div", { class: "overlay", role: "presentation" });
  const box = h("div", { class: "modal " + cls, role: "dialog", "aria-modal": "true", "aria-label": label });
  const closeBtn = h("button", { class: "icon-btn close", "aria-label": "Close", onclick: () => close() }, "×");
  box.append(closeBtn, content);
  overlay.append(box);
  overlay.addEventListener("mousedown", (e) => { if (e.target === overlay) close(); });
  const onKey = (e) => { if (e.key === "Escape" && modalStack[modalStack.length - 1] === close) { e.stopPropagation(); close(); } };
  document.addEventListener("keydown", onKey, true);
  function close() {
    document.removeEventListener("keydown", onKey, true);
    overlay.remove();
    modalStack = modalStack.filter((c) => c !== close);
    prevFocus && prevFocus.focus && prevFocus.focus();
    onClose && onClose();
  }
  modalStack.push(close);
  document.body.append(overlay);
  (box.querySelector("[data-autofocus]") || closeBtn).focus();
  return { close, box };
}
export const modalOpen = () => modalStack.length > 0;

export const ICONS = {
  live: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2.4"/><circle cx="5" cy="6" r="1.6"/><circle cx="19" cy="7" r="1.6"/><circle cx="17" cy="19" r="1.6"/><path d="M10.2 10.6 6.2 7.2M14 11l3.9-3M13.2 14l2.8 3.9"/></svg>',
  tower: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 4 8v2h16V8z"/><path d="M6 10v9M10 10v9M14 10v9M18 10v9M4 21h16"/></svg>',
  library: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h4v16H4zM10 4h4v16h-4z"/><path d="m16.5 5.3 3.6-.9 3 14.6-3.6.9z" transform="translate(-2.5 0) scale(.95)"/></svg>',
  mysi: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/></svg>',
  search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
};
