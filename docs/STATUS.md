# Camelot — Status

Kept up to date at the end of every session (see the End-of-session rule in
`CLAUDE.md`). This is the quickest way for a new session to see where things stand.

## ✅ Completed

- **Round Table Hub** — top-down stone table, 12 seats, seat detail panel,
  live "Knights seated: N / 12" council strip, Excalibur easter egg.
- **Agent Editor** — full CRUD on every seat (portrait upload, name, role,
  description, personality, active toggle, and — for every seat but Arthur —
  a Cloud/Hermes engine selector), deep-linkable via `?seat=`.
- **The Village** — dusk overworld with 12 cottages mirroring the seats; Arthur's
  sprite wanders/sleeps live off his `active` flag.
- **Custom tabs** — create/rename/delete, persisted to `tabs.json`.
- **Shared state & persistence** (`CamelotContext` + `camelot-data-plugin.js`) —
  JSON files as source of truth, live-synced across all three pages, no refresh.
- **Dark gothic pixel-art design system** — palette, fonts, shared component kit
  (see `docs/DESIGN.md`).
- **Real automation, not just stubs**, for 7 of 12 seats (dormant seats still
  live and callable, just `active: false` — see 2026-08-15 retirement entry
  below) — each `runAgentTask` case hits a live backend and persists to
  `pipeline.json`:
  - Sir Scout (seat-06, dormant) — Reddit RSS idea sourcing (`server/reddit-scout.js`)
  - Hermes (seat-07) — lead programmer for the manager pipeline (below), plus
    scriptwriting and free-form tasks; cloud (Anthropic) or local (Hermes Agent,
    unrestricted tool access) per its `engine` field
  - Sir Percival (seat-02, dormant) — fact-checking via Claude + web search (`server/anthropic.js`)
  - Miku (seat-03, dormant) / Teto (seat-04, dormant) — voiceover, music, sound
    effects (`server/elevenlabs.js`)
  - The Mighty Crab (seat-05, dormant) — QA pass over the pipeline's latest
    assets (`server/crab.js`)
  - Merlin (seat-12, dormant) — video/clip generation via Higgsfield (`server/higgsfield.js`)
- **2026-08-15** — migrated the project from the old Node/Fastify monorepo
  (`apps/` + `packages/`) to this single-app Vite build. Old code archived on the
  `legacy-monorepo` branch.
- **2026-08-15** — added a per-seat `engine` field (cloud vs. local) and gave seat-07
  a full identity change: was "Hagrid" (scriptwriting only), now "Hermes" — an
  unrestricted, freely-tasked local agent (full shell/file/browser/MCP access via
  `server/hermes.js`) that still drafts a script in the shape Arthur's pipeline needs
  when asked to. See `CLAUDE.md`'s "Engines" section before touching this seat.
- **2026-08-15** — **custom tab content mounting is no longer just a HOOK.**
  Hermes's Hall (`src/pages/hermes-chat/`) is the first real content mounted via a
  tab's `contentRef` (see `CustomTab.jsx`'s registry) — a standing, multi-turn
  conversation that continues one Hermes Agent session (`hermes -z --continue`, not
  history replayed into the prompt), transcript persisted to `src/data/hermeschat.json`.
  Opened from the Editor's Hermes panel ("Open Hermes's Chat Hall →"); reuses the
  existing Hall rather than creating duplicates.
- **2026-08-15** — **reasoning-effort control**, adjustable from within Hermes's Hall
  (`settings.json`'s `hermesReasoningEffort`, default `"low"`). Applies to every
  Hermes call, not just chat — Qwen3.8 does hidden chain-of-thought before each reply
  by default, which costs real time even on trivial prompts; lower settings skip/shorten
  that. This is the main speed lever available without changing the model or hardware.
- **2026-08-15 bug fixes**, all found and fixed live while wiring Hermes in:
  - `server/hermes.js` read `process.env.HERMES_BIN` as a module-level `const` —
    captured `undefined` on cold start because ES imports are hoisted before
    `vite.config.js` loads `.env` into `process.env`. Fixed to read lazily, matching
    `anthropic.js`'s existing pattern (see the warning comment at the top of the file).
  - Repeated failed `ollama create` retries left orphaned ~17.7GB duplicate model
    blobs, cutting free disk to ~28GB and causing further retries to fail outright.
    Cleaned up; if this recurs, check `C:\Users\<user>\.ollama\models\blobs\` for
    blobs not referenced by the current manifest.
  - Concurrent chat messages (e.g. a second message sent before the first replied)
    could race on the same `--continue` session. `chatWithHermes` now serializes
    calls on a promise queue.
  - Vite was watching `src/data/*.json` as source, so every agent-task/chat write
    triggered a full page reload — silently wiping in-progress UI state (a
    "sending…" indicator) right as a response landed, which read as "it's stuck"
    when the backend had actually already succeeded. `vite.config.js` now excludes
    `src/data/**` from the watcher.

- **2026-08-15** — **Stop button** for local Hermes calls, in both Hermes's Hall and
  the Editor's task panel. Local inference can take minutes; this kills the running
  `hermes` child process (`server/hermes.js`'s `stopHermes()`, `POST /api/hermes/stop`)
  instead of making you wait out the full 10-minute server-side timeout.
- **2026-08-15** — **File attach** in Hermes's Hall (📎 button). Reads a text file
  client-side and folds its contents into the message sent to Hermes — shown to the
  user as a short "📎 filename" line, full text goes to the model. Capped at 200KB;
  Hermes has full filesystem access on its own regardless, so this is for pointing it
  at one file's contents inline, not a bulk upload channel. Verified live: attached a
  file with a planted "secret word," Hermes read it back correctly.

- **2026-08-15** — **retired the video-content pipeline, built a software-dev
  pipeline in its place.** `server/arthur.js`'s `runPipeline` (Scout → script →
  Percival → Miku → Teto → Merlin → Crab) is gone from master, preserved on the
  `legacy-video-pipeline` branch; the six seats it used are now dormant
  (`active: false`) but not deleted — everything they can do is still callable.
  Arthur (seat-01) is now "the manager": his Editor panel is a read-only status
  view, and the actual manager loop runs as a **scheduled Claude Code session**
  (not a `server/*.js` Anthropic-API integration — no API key needed), following
  `docs/MANAGER-RUNBOOK.md`. New pieces:
  - `src/data/projects.json` + `server/projects-store.js` — the job record
    (id/slug/idea/status/step-by-step plan/activity log per project), written
    directly to disk by the scheduled session, read by the UI.
  - `src/pages/project-viewer/` — a project's Hall: plan, activity log, and a
    read-only file-tree + content viewer for its folder
    (`C:\Users\super\Documents\CamelotProjects\<slug>\`, a sibling directory
    outside this repo so a project can become its own independent GitHub repo
    later — nothing here auto-pushes).
  - `GET/POST /api/projects/:id/tree` and `/file` — path-traversal-guarded
    (tested by hand: `..`-laden and absolute-path payloads correctly 403).
  - `src/pages/hub/ProjectsPanel.jsx` — the Hub's project list, the "pipeline
    status feed" hook's first real implementation.
  - Tabs gained an optional `meta` field (`addTab(name, contentRef, meta)`) so
    `project-viewer` tabs can carry which project they show.
  - **Hand-verified end to end** with a trivial one-step project — and caught a
    real bug doing it: Hermes's `--in DIR` flag and a shell `cd` do **not**
    reliably scope where it writes files (confirmed: a file meant for the
    project folder landed in the OS home directory instead, twice, with
    different flag combinations). The fix — spelling out the full absolute
    path in every step's prompt — is documented in `MANAGER-RUNBOOK.md` and
    `CLAUDE.md`. Also caught and fixed a real path-computation bug in
    `project-viewer`'s file tree (top-level files always resolved to an empty
    path, so nothing was ever openable) during the same verification pass.

## 🚧 In progress

- **Manager pipeline cron job** — the design, code, and docs above are built
  and hand-verified, but the recurring `CronCreate`/`ScheduleWakeup` job that
  runs it unattended hasn't been created yet (2026-08-15) — confirming with the
  owner first, given it's a standing autonomous automation with real filesystem
  and shell access.

## 📋 Planned

- **Rift Herald (seat-09)** — publishing/distribution to YouTube. Not started
  (unrelated to the manager pipeline — this seat was never part of the retired
  video pipeline either; it's simply still unbuilt).
- **Vacant seats (08, 10, 11)** — unfilled; no role assigned yet.
- **Ollama on this GPU (RX 9070 XT / RDNA4, gfx1201)** is on ROCm (confirmed via
  server log, not the slower fallback path) but a `rocblaslt` kernel library fails
  to load for this exact architecture code (`TensileLibrary_lazy_gfx1201.dat` —
  file itself isn't corrupt, likely a version gap since this is very new hardware).
  Probably costs some throughput. Not fixed — would need an Ollama update, which
  wasn't done since it's a software-install decision, not a code change.
