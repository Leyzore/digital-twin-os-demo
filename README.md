# Digital Twin OS — interactive demo

A public, self-contained demonstration of **Digital Twin OS**, a control layer for AI-assisted work:
a live knowledge graph, a control tower, an evidence-linked library, and a coordinator (MYSI) that plans missions for specialist agents.

**Live demo:** https://leyzore.github.io/digital-twin-os-demo/

> **Everything here is simulated.** All projects, agents, clients, tasks, decisions, documents and figures are fictional.
> There is no backend, no network call, no analytics, no stored data and no AI model. MYSI's answers are scripted.
> This repository is separate from, and contains no code or data from, the private Digital Twin OS project.

## What to try

| Section | Try this |
|---|---|
| **Live** | Drag to rotate, scroll or pinch to zoom, click a node, filter by type or status, isolate a selection. Watch the simulated activity feed. |
| **Control Tower** | Open *To handle*, resolve a decision, unblock a workstream, validate a result, create a workstream. Counters and the graph update everywhere. |
| **Library** | Search ("sandbox"), filter by kind, maturity and status, open a record, read its claims and evidence, generate a handoff note. |
| **MYSI** | Ask a suggested question, approve a proposal, then run an example mission: objective → plan → mandate → work → checks → proposed lesson. |

`Ctrl K` opens the command palette. *More → Reset demo* restores the initial state.

## Run locally

No build step and no dependencies.

```
python -m http.server 8000
```

then open http://localhost:8000

## Stack and limits

- Plain HTML, CSS and ES modules; a canvas-based 3D graph; fonts (Manrope, Space Grotesk) are bundled.
- State lives in memory only and resets on reload.
- The data set is small and hand-written; mission runs are scripted animations, not real executions.
