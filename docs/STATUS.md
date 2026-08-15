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
- **Real automation, not just stubs**, for 8 of 12 seats — each `runAgentTask` case
  hits a live backend and persists to `pipeline.json`:
  - Sir Scout (seat-06) — Reddit RSS idea sourcing (`server/reddit-scout.js`)
  - Hermes (seat-07) — scriptwriting; cloud (Anthropic) or local (Hermes Agent,
    unrestricted tool access) per its `engine` field (`server/anthropic.js` /
    `server/hermes.js`)
  - Sir Percival (seat-02) — fact-checking via Claude + web search (`server/anthropic.js`)
  - Miku (seat-03) / Teto (seat-04) — voiceover, music, sound effects (`server/elevenlabs.js`)
  - The Mighty Crab (seat-05) — QA pass over the pipeline's latest assets (`server/crab.js`)
  - Merlin (seat-12) — video/clip generation via Higgsfield (`server/higgsfield.js`)
  - King Arthur (seat-01) — runs the full council in sequence: Scout → Hermes →
    Percival → Miku → Teto → Merlin → Crab (`server/arthur.js`)
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

## 🚧 In progress

- Nothing actively in flight as of 2026-08-15.

## 📋 Planned

- **Rift Herald (seat-09)** — publishing/distribution to YouTube. Not started.
- **Vacant seats (08, 10, 11)** — unfilled; no role assigned yet.
- **Lead emails** — end of the pipeline, not started.
- **Pipeline status feed** on the Hub — the hook point exists, no data flowing yet.
- **Ollama on this GPU (RX 9070 XT / RDNA4, gfx1201)** is on ROCm (confirmed via
  server log, not the slower fallback path) but a `rocblaslt` kernel library fails
  to load for this exact architecture code (`TensileLibrary_lazy_gfx1201.dat` —
  file itself isn't corrupt, likely a version gap since this is very new hardware).
  Probably costs some throughput. Not fixed — would need an Ollama update, which
  wasn't done since it's a software-install decision, not a code change.
