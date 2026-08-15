# Camelot — Status

Kept up to date at the end of every session (see the End-of-session rule in
`CLAUDE.md`). This is the quickest way for a new session to see where things stand.

## ✅ Completed

- **Round Table Hub** — top-down stone table, 12 seats, seat detail panel,
  live "Knights seated: N / 12" council strip, Excalibur easter egg.
- **Agent Editor** — full CRUD on every seat (portrait upload, name, role,
  description, personality, active toggle), deep-linkable via `?seat=`.
- **The Village** — dusk overworld with 12 cottages mirroring the seats; Arthur's
  sprite wanders/sleeps live off his `active` flag.
- **Custom tabs** — create/rename/delete, persisted to `tabs.json`.
- **Shared state & persistence** (`CamelotContext` + `camelot-data-plugin.js`) —
  JSON files as source of truth, live-synced across all three pages, no refresh.
- **Dark gothic pixel-art design system** — palette, fonts, shared component kit
  (see `docs/DESIGN.md`).
- **2026-08-15** — migrated the project from the old Node/Fastify monorepo
  (`apps/` + `packages/`) to this single-app Vite build. Old code archived on the
  `legacy-monorepo` branch. `CLAUDE.md` and this file rewritten to match.

## 🚧 In progress

- Nothing actively in flight as of 2026-08-15 — the foundation/UI shell is stable
  and this is a good point to start wiring in automation.

## 📋 Planned

- **Wire up the automation agents.** The integration files already exist in
  `server/` (`anthropic.js`, `elevenlabs.js`, `higgsfield.js`, `reddit-scout.js`,
  `arthur.js`, `activity-watcher.js`, `pipeline-store.js`) but aren't connected to
  the UI yet. Extension points are marked `// HOOK:` — see `CLAUDE.md`'s
  "How to add automation" section.
- **Reddit scouting** → content idea sourcing.
- **Scriptwriting** (Hagrid) + **fact-checking** (Percival) via Anthropic.
- **Voiceover/music** (Miku) + **sound effects** (Teto) via ElevenLabs.
- **Video/clip generation** (Merlin) via Higgsfield.
- **Lead emails** — end of the pipeline, not started.
- **Pipeline status feed** on the Hub — the hook point exists, no data flowing yet.
