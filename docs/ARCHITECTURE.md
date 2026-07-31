# Architecture

This explains how Camelot is shaped and why. It is meant to be readable by
someone non-technical *and* useful to a developer continuing the work.

## The big idea

Camelot is a **platform**, not a single app. Its core only knows about generic
ideas — *agents*, *tools (modules)*, *activity* — and stays out of the way. The
content-creation features (video, audio, scraping) are just the first tools that
will plug into it. This is what keeps Camelot a "swiss-army-knife".

## Two halves + a shared dictionary

```
            packages/shared  ← the dictionary both halves agree on
                  ▲   ▲
                  │   │
   apps/server ───┘   └─── apps/web
   (the engine)            (the website)
```

- **`packages/shared`** — TypeScript type definitions (what an "agent" or an
  "activity event" looks like). Both halves import these so they can never
  disagree. File: `src/types.ts`.

- **`apps/server` (the engine)** — a small Fastify web server that:
  - serves the list of agents (`GET /api/agents`),
  - saves edits to an agent (`PUT /api/agents/:id`),
  - streams live activity to the browser (`GET /api/events`, via Server-Sent
    Events),
  - runs the **tools (modules)**.

- **`apps/web` (the website)** — a React app (Vite + Tailwind + shadcn/ui) with
  the dashboard shell, the Round Table page, and the Settings screen.

## How data flows

1. The website loads the 12 seats from `GET /api/agents`.
2. It opens a long-lived connection to `GET /api/events`.
3. The simulation module (in the engine) changes an agent's status on a timer,
   saves it, and publishes an event on the **event bus**.
4. The events route forwards that event down the open connection.
5. The website's shared store (`apps/web/src/lib/agents-store.tsx`) receives it
   and updates the screen — no refresh needed.

When the owner edits an agent in Settings, the website calls `PUT /api/agents/:id`;
the engine saves it and also publishes an event, so every open browser updates.

## The plug-in system (modules)

The seam that future tools use lives in `apps/server/src/core/`:

- **`registry.ts`** defines a `CamelotModule` (something with `start`/`stop`) and
  keeps a list of them. `registry.startAll()` boots them when the engine starts.
- **`eventBus.ts`** is the shared "address system": modules `publish` activity;
  the events route forwards it to browsers.

A module is handed a `ModuleContext` (`{ app, bus }`) so it can broadcast events
and, if it wants, register its own routes. The only module today is the
**simulation** (`apps/server/src/modules/simulation/index.ts`). A real video tool
would have the same shape but call an outside image/video service instead of
inventing quests. See [`ADDING_A_MODULE.md`](ADDING_A_MODULE.md).

## Saving data

`apps/server/src/storage/jsonStore.ts` is the only place that reads/writes saved
agents. Today it uses a single JSON file (zero setup). To move to a real
database later, reimplement the functions in that one file; the routes and
modules call those functions and don't care how data is stored.

## Why these choices

- **One language (TypeScript) front and back** — only one thing to learn.
- **Run with `tsx`, no build step on the server** — fewer moving parts; the
  shared types are read directly as source everywhere.
- **Server-Sent Events, not websockets** — all live traffic goes one way
  (engine → browser), which is exactly what SSE is for, and it's simpler.
- **A JSON file, not a database** — nothing to install for a non-technical owner;
  easy to upgrade later behind one file.
- **Docker** — guarantees the same behavior on the owner's Windows and macOS
  machines.

## Folder map

See the README for the high-level tree. Key files:

| Area | File |
|------|------|
| Shared types | `packages/shared/src/types.ts` |
| Engine entry / wiring | `apps/server/src/index.ts` |
| Module system | `apps/server/src/core/{registry,eventBus}.ts` |
| Simulation (example tool) | `apps/server/src/modules/simulation/index.ts` |
| Storage | `apps/server/src/storage/jsonStore.ts` |
| Starting agents | `apps/server/src/data/agents.seed.ts` |
| Routes | `apps/server/src/routes/{agents,events}.ts` |
| Web layout shell | `apps/web/src/layout/DashboardShell.tsx` |
| Round Table | `apps/web/src/features/round-table/` |
| Settings | `apps/web/src/features/agent-settings/` |
| Live data store | `apps/web/src/lib/agents-store.tsx` |
| Theme | `apps/web/src/index.css`, `apps/web/tailwind.config.js` |
