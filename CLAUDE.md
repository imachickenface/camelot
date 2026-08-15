# CLAUDE.md — orientation for AI sessions

Read this first. It tells a brand-new session (which starts with no memory of
past ones) what Camelot is, where everything lives, and the rules to follow.

## What Camelot is

A local web dashboard, themed entirely around King Arthur and the Knights of the
Round Table, rendered in a **dark gothic pixel-art** aesthetic (carved stone, gold
inlay, torchlight, blackletter — see `docs/DESIGN.md`).

Past the UI shell (Round Table Hub, Agent Editor, Village, tab system), the app
now runs a **software-dev pipeline**: a manager (Arthur, seat-01) conceives small
digital-product ideas, plans them step by step, and hands each step to Hermes
(seat-07) as lead programmer; finished (or in-flight) work is browsable in a
per-project Hall. The manager itself runs **outside this app**, as a scheduled
Claude Code session — see **The Manager Pipeline**, below, and
`docs/MANAGER-RUNBOOK.md` for exactly what it does each time it wakes.

An earlier version of this app ran a different, fixed video-production pipeline
(Reddit scouting → scriptwriting → voice/SFX → video clip → QA) chained by
`server/arthur.js`. That was retired 2026-08-15 in favor of the pipeline above —
see the note on `legacy-video-pipeline` below. The six seats that pipeline used
(Percival, Miku, Teto, Crab, Scout, Merlin) are **dormant, not deleted**: their
`server/*.js` integrations, routes, and Editor panels are all still live and
callable, just `active: false` in `agents.json` — a future project can pull one
back in (e.g. Miku's ElevenLabs voice) without resurrecting anything from a
branch.

### The Manager Pipeline

- **Arthur (seat-01)** is the manager. He no longer runs from a button in the
  Editor — his old "Run the Pipeline" panel is now a read-only status view. The
  actual manager loop is a **scheduled Claude Code session** (not Anthropic-API
  code in `server/`, deliberately — no API key needed), following
  `docs/MANAGER-RUNBOOK.md` on every wake-up: pick or resume a project, write or
  advance its step-by-step plan, dispatch the next step to Hermes, review what
  comes back, escalate small fixes to a fast Sonnet-medium subagent or send big
  issues back to Hermes, and mark the project complete once every step passes.
- **Hermes (seat-07)** is lead programmer — unchanged, see below.
- State lives in **`src/data/projects.json`** (id/slug/name/idea/status/plan
  steps/activity log per project — full schema in the runbook), read by the UI
  via `GET /api/data/projects`, written directly to disk by the scheduled
  session (not through this app's HTTP API).
- Each project's files live in **`C:\Users\super\Documents\CamelotProjects\<slug>\`**
  — a sibling directory entirely outside this repo, so a finished project can
  become its own independent GitHub repo later without ever touching Camelot's
  own `.git`. **Nothing here auto-pushes to GitHub** — the owner decides by hand,
  per project, via its Hall (`src/pages/project-viewer/`, a read-only plan/
  activity/file-tree view opened from the Hub's Projects panel).
- **Confirmed by hand-testing (2026-08-15): don't trust Hermes's `--in DIR` flag
  or a shell `cd` to scope where it writes files** — neither reliably worked in
  practice (`--in` only affects *resumed* sessions per `hermes --help`; a fresh
  `-z` call ignored it entirely and wrote to the OS home directory regardless).
  The fix that actually works: every step's prompt to Hermes must spell out the
  full absolute path under the project folder for any file it touches. See the
  runbook for the full story — this bit the very first hand-verification run.

### Engines — cloud vs. local

Every seat except Arthur (`seat-01`) has an `"engine"` field in `agents.json`:
`"cloud"` (Anthropic/ElevenLabs/Higgsfield, needs API keys) or `"hermes"` (runs on
this machine via a local Hermes Agent install, no API key, but slower). Editable
per-seat in the Agent Editor. `server/hermes.js` is the integration — it shells out to
the `hermes` CLI (`hermes -z "<task>" --yolo`), so it needs a working local Hermes Agent
install configured with a model (this machine has one wired to a local Qwen3.8-27B via
Ollama; a fresh machine would need its own setup).

**Seat-07 ("Hermes") is a special case, not just an engine choice on a normal seat.**
It's deliberately unrestricted — full shell/file/browser/MCP access, `--yolo` auto-approves
every tool call because there's no terminal for Hermes to prompt in. That's a real,
significant capability for something one button-click in a web UI can trigger, not a
detail to gloss over. It was built this way on the owner's explicit, informed request
(2026-08-15) — don't walk it back to something safer without asking first, and don't
extend that same "no limitations" treatment to any other seat without asking either.

> **August 2026 note:** this project used to be a different Node/Fastify monorepo
> (`apps/server` + `apps/web` + `packages/shared`). That version was retired and
> replaced with the current single-app design described here. The old code isn't
> deleted — it's preserved on the `legacy-monorepo` git branch — but master no
> longer has anything to do with it. A second, later retirement did the same thing
> to the video-content pipeline described above — that code is preserved on the
> `legacy-video-pipeline` branch. If a future session finds references to `apps/`,
> `packages/`, `@camelot/shared`, Docker/Fastify, or `server/arthur.js`'s
> `runPipeline`, that's stale; ignore it and trust this file instead.

## Who it's for (important)

The owner is **non-technical**. So:

- Explain things in plain language; avoid jargon in anything owner-facing.
- Keep "one command to run" true — it already is (`npm run dev`).
- **Do not build a major feature without asking the owner first.** When unsure,
  ask before implementing.

## How it's built

- **React + Vite** single-page app — no monorepo, no workspaces, no TypeScript.
  Client-side routing via React Router powers the tabs.
- **One shared state** (`src/state/CamelotContext.jsx`) loads the JSON files once
  on boot and persists on every mutation, so the Hub, Agent Editor, and Village
  stay live in sync with no page refresh.
- **Persistence** is a small Vite middleware plugin (`server/camelot-data-plugin.js`)
  — there is no separate server process to run. It exposes:
  - `GET /api/data/:name` — read `agents` / `tabs` / `settings` / `pipeline` /
    `hermeschat` / `projects`
  - `PUT /api/data/:name` — write it back
  - `POST /api/upload` — save an uploaded portrait
  - `GET /api/projects/:id/tree` / `GET /api/projects/:id/file?path=` —
    read-only, path-traversal-guarded file browser for one project's folder
- **Saving**: the JSON files in `src/data/` (`agents.json`, `tabs.json`,
  `settings.json`, `pipeline.json`, `projects.json`) are the single source of
  truth. `localStorage` is **not** used for state — the files win, so a future
  session (or the owner) can read/edit them directly and the app reflects it on
  next load. `projects.json` is the one file this app's own code never writes —
  the scheduled manager session writes it directly to disk (see `server/
  projects-store.js` for the same read-modify-write pattern in code).
- **No Docker.** `npm run dev` at http://localhost:5173 is the whole app — the
  canonical way to run it, not a preview of something else.
- **Secrets & local config**: `.env` (gitignored) holds `HF_CREDENTIALS` (Higgsfield,
  for Merlin's video generation), `ANTHROPIC_API_KEY` (the scriptwriting seat's cloud
  engine, Percival's fact-checking), `ELEVENLABS_API_KEY`/`ELEVENLABS_VOICE_ID` (Miku's
  voiceover/music, Teto's sound effects), and `HERMES_BIN`/`HERMES_CWD` (path to the
  local Hermes Agent CLI). See `.env.example` for the full list.

## The three main tabs

- **The Round Table** (`src/pages/hub/`) — a top-down stone table with 12 seats
  (Arthur always occupies seat-01 + up to 11 more); click a seat for its detail
  panel; vacant seats deep-link into the Agent Editor.
- **Agent Editor** (`src/pages/editor/`) — edit any seat's portrait, name, role,
  description, personality, and active status. Saves reflect instantly everywhere.
- **The Village** (`src/pages/village/`) — a dusk pixel village where each seat has
  a cottage. Arthur's sprite wanders when Active, sleeps (💤) when Inactive.

Custom tabs (`✦ New Hall`) persist to `tabs.json`; each has `{ id, name, type,
contentRef, meta }` — `contentRef` opts into a specific mounted component (see
`CustomTab.jsx`'s registry: `hermes-chat`, `project-viewer`), `meta` parameterizes
it (e.g. `project-viewer`'s `{ projectId }`). The "✦ New Hall" button always
creates an unparameterized empty hall; populated tabs are created in code via
`addTab(name, contentRef, meta)` — see the Editor's `handleOpenHermesHall` or the
Hub's `ProjectsPanel` for the find-or-create pattern both use.

## How to add automation for a remaining seat

Follow the existing pattern: a `server/<name>.js` integration module, a route in
`server/camelot-data-plugin.js`, and a case in `runAgentTask(id, task)` in
`CamelotContext.jsx` — `server/hermes.js` + its `/api/hermes/run` route + its
`CamelotContext` case is the most recent worked example for a *button-triggered*
seat. Both `// HOOK:` extension points from earlier in the project are now filled
by real examples, not just comments:
- **Pipeline status feed** — `src/pages/hub/ProjectsPanel.jsx`, polling
  `GET /api/data/projects`.
- **Custom tab content mounting** — `src/pages/CustomTab.jsx`'s
  `CONTENT_COMPONENTS` registry, with `hermes-chat` and `project-viewer` as the
  two real entries.

The binding contract every page builds against — shared state API, agent schema,
deep-link conventions, shared components — is **`docs/CONTRACT.md`**. Read it
before touching `src/pages/` or `src/state/`.

## Conventions

- Keep code clean and human-legible; comments explain the *why*. Match the
  surrounding style (plain JS/JSX, no TypeScript).
- **Never hardcode a color.** Use the CSS variables in `src/styles/theme.css`
  (`--void-black`, `--aged-gold`, `--parchment`, etc. — full palette and fonts in
  `docs/DESIGN.md`). Reuse the shared pixel-UI kit in `src/components/` — don't
  re-invent `PixelPanel`/`PixelButton`/`Torch`/etc.
- Relative `/api/...` paths only — the Vite plugin handles them; never hard-code
  a host/port.

## Useful commands

```bash
npm install              # install everything (run once)
npm run dev              # THE app — http://localhost:5173 (UI + persistence, hot reload)
npm run build             # production build to dist/
npm run preview           # preview the production build
npm run gen:portraits     # regenerate the original pixel-art portraits & cursor
```

## ⚠️ End-of-session rule

Before you finish a session in which you changed anything, **update the docs** so
the next session is not lost:

1. **`docs/STATUS.md`** — move items between ✅ Completed / 🚧 In progress / 📋
   Planned, and date anything newly completed.
2. **`CHANGELOG.md`** (top-level, not in `docs/`) — add a dated entry describing
   what changed. This file has the project's full build history — read it if you
   want context on how a feature came to be.

Keep both accurate. They are the memory this project has.
