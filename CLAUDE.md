# CLAUDE.md — orientation for AI sessions

Read this first. It tells a brand-new session (which starts with no memory of
past ones) what Camelot is, where everything lives, and the rules to follow.

## What Camelot is

A local web dashboard that will eventually automate a **faceless content & clipping
pipeline**: Reddit scouting → scriptwriting → video/clip production → lead emails.
It's themed entirely around King Arthur and the Knights of the Round Table, rendered
in a **dark gothic pixel-art** aesthetic (carved stone, gold inlay, torchlight,
blackletter — see `docs/DESIGN.md`).

The current build is the **foundation + UI shell**: the Round Table Hub, the Agent
Editor, the Village overworld, and a persistent tab system. The automation agents
(Reddit scouting, scriptwriting, video/voice generation) are **not wired into the UI
yet** — but the backend integration files for them already exist in `server/`
(`anthropic.js`, `elevenlabs.js`, `higgsfield.js`, `reddit-scout.js`, `arthur.js`,
`activity-watcher.js`, `pipeline-store.js`) as building blocks, and the app is
structured so they can be plugged in without restructuring. Look for `// HOOK:`
comments marking the extension points.

> **August 2026 note:** this project used to be a different Node/Fastify monorepo
> (`apps/server` + `apps/web` + `packages/shared`). That version was retired and
> replaced with the current single-app design described here. The old code isn't
> deleted — it's preserved on the `legacy-monorepo` git branch — but master no
> longer has anything to do with it. If a future session finds references to
> `apps/`, `packages/`, `@camelot/shared`, or Docker/Fastify, that's stale; ignore
> it and trust this file instead.

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
  - `GET /api/data/:name` — read `agents` / `tabs` / `settings`
  - `PUT /api/data/:name` — write it back
  - `POST /api/upload` — save an uploaded portrait
- **Saving**: the JSON files in `src/data/` (`agents.json`, `tabs.json`,
  `settings.json`, `pipeline.json`) are the single source of truth.
  `localStorage` is **not** used for state — the files win, so a future session
  (or the owner) can read/edit them directly and the app reflects it on next load.
- **No Docker.** `npm run dev` at http://localhost:5173 is the whole app — the
  canonical way to run it, not a preview of something else.
- **Secrets**: `.env` (gitignored) holds `HF_CREDENTIALS` (Higgsfield, for Merlin's
  video generation), `ANTHROPIC_API_KEY` (Hagrid's scriptwriting, Percival's
  fact-checking), and `ELEVENLABS_API_KEY`/`ELEVENLABS_VOICE_ID` (Miku's
  voiceover/music, Teto's sound effects). See `.env.example` for the full list.

## The three main tabs

- **The Round Table** (`src/pages/hub/`) — a top-down stone table with 12 seats
  (Arthur always occupies seat-01 + up to 11 more); click a seat for its detail
  panel; vacant seats deep-link into the Agent Editor.
- **Agent Editor** (`src/pages/editor/`) — edit any seat's portrait, name, role,
  description, personality, and active status. Saves reflect instantly everywhere.
- **The Village** (`src/pages/village/`) — a dusk pixel village where each seat has
  a cottage. Arthur's sprite wanders when Active, sleeps (💤) when Inactive.

Custom tabs (`✦ New Hall`) persist to `tabs.json`; each has `{ id, name, type,
contentRef }` — `contentRef` is reserved for mounting real content later.

## How to add automation (the plug-in design)

Extension points are already marked with `// HOOK:` comments:
- **Agent task execution** — in the Hub's seat detail panel, the Editor form, and a
  `runAgentTask(id, task)` stub in `CamelotContext`.
- **Pipeline status feed** — in the Hub's council status strip and the persistence
  plugin.
- **Custom tab content mounting** — in the router and `src/pages/CustomTab.jsx`.

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
