# Changelog

All notable changes to **Camelot** are recorded here.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [0.9.5] — 2026-08-15 — Stop button and file attach for local Hermes

### Added
- **Stop button** for local Hermes calls — Hermes's Hall and the Editor's task panel
  both swap Send for a Stop button while a call is in flight. `server/hermes.js` now
  tracks the in-flight child process (`currentProc`) and exposes `stopHermes()`,
  wired to a new `POST /api/hermes/stop` route. Local inference can run for minutes;
  this lets you cut a bad or unwanted reply short instead of waiting out the full
  10-minute server-side timeout.
- **File attach** (📎) in Hermes's Hall — reads a text file client-side (200KB cap)
  and folds its contents into the message actually sent to Hermes, while the chat
  log shows just a short "📎 filename" line. Verified live: attached a file with a
  planted secret word, Hermes read it back correctly from the attachment.

## [0.9.4] — 2026-08-15 — Hermes's Hall: a persistent chat, plus real bugs found running it live

### Added
- **Hermes's Hall** (`src/pages/hermes-chat/`) — a standing, multi-turn conversation
  with local Hermes, distinct from the Editor's one-shot task panel. Continues one
  Hermes Agent session across messages (`hermes -z --continue camelot-hermes-hall`) —
  genuine conversational memory, not history replayed into the prompt each time.
  Verified live: asked a fact several turns earlier, correctly recalled it later.
  Transcript persists to `src/data/hermeschat.json`.
- **This is the first real use of custom-tab content mounting** — previously just a
  `// HOOK:` comment. `CustomTab.jsx` now has a `contentRef` → component registry;
  `CamelotContext`'s `addTab(name, contentRef)` takes an optional second argument.
  Opened via a new button in the Editor's Hermes panel, which reuses the existing
  Hall instead of creating duplicates on repeat clicks.
- **Reasoning-effort setting**, adjustable from within the Hall itself
  (`none`/`minimal`/`low`/.../`ultra`, stored as `settings.json`'s
  `hermesReasoningEffort`, default `"low"`). Applies to every Hermes call — Qwen3.8
  does hidden chain-of-thought before each reply by default, which costs real
  generation time even on trivial prompts; this is the main speed lever available
  short of changing the model or hardware.

### Fixed
- **`server/hermes.js` never actually read `HERMES_BIN` from `.env`.** It captured
  `process.env.HERMES_BIN` in a module-level `const`, but ES module imports are
  hoisted and evaluate before `vite.config.js`'s `defineConfig` callback loads `.env`
  into `process.env` — so the const permanently captured `undefined` and fell back to
  the literal string `"hermes"` (not on PATH outside the venv), failing every call
  with `spawn hermes ENOENT`. `anthropic.js`/`elevenlabs.js` already avoid this by
  reading `process.env` lazily inside functions; `hermes.js` now does too.
- **Ollama model registration kept breaking under disk pressure.** Repeated failed
  `ollama create` retries (each one writes a full new ~17.7GB blob rather than
  reusing an identical prior one) left orphaned duplicate blobs on disk, driving free
  space down to ~28GB and causing the *next* retry to fail too — a self-reinforcing
  loop. Cleaned up orphaned blobs and the broken manifest, freed disk to ~91GB, model
  registered cleanly on retry.
- **Concurrent chat messages could race on the same Hermes session.** Sending a
  second message before the first had replied (easy to do — see the reload bug
  below) meant two `--continue camelot-hermes-hall` calls running at once against
  the same session. `chatWithHermes` now serializes on a promise queue.
- **Vite was watching `src/data/*.json` as source code.** Every agent-task run or
  chat message writes to a file under `src/data/`, which Vite's dev server also
  watches by default — triggering a full page reload right as the response landed,
  silently wiping the "sending…" UI state. This read as "Hermes is stuck" when the
  backend had actually already succeeded (confirmed via the persisted file each
  time), and very likely caused users to resend, which is what triggered the
  concurrency bug above. `vite.config.js` now excludes `src/data/**` from the watcher.

### Investigated, not fixed
- **`rocblaslt` fails to load its tuned kernel library for this GPU's exact
  architecture code** (`TensileLibrary_lazy_gfx1201.dat`, RX 9070 XT / RDNA4). Ollama
  IS using ROCm (confirmed in `server.log`, not a slower fallback path) — this is a
  narrower issue in one acceleration layer, likely a version gap since this GPU is
  very new hardware. The file itself isn't corrupt (correct size vs. sibling
  architectures). Probably costs some throughput; not fixed here since the likely
  remedy is updating Ollama itself, a software-install decision left to the owner.

## [0.9.3] — 2026-08-15 — Hagrid becomes Hermes: a local, unrestricted engine option

### Added
- **`"engine"` field on every seat but Arthur** (`"cloud"` | `"hermes"`), editable in
  the Agent Editor. Cloud is the existing Anthropic/ElevenLabs/Higgsfield path; Hermes
  runs the task locally through a Hermes Agent install on this machine instead — no
  API key, but slower (local model inference).
- **`server/hermes.js`** — the local-engine integration. Shells out to the `hermes`
  CLI (`hermes -z "<task>" --yolo`, configurable via `HERMES_BIN`/`HERMES_CWD` in
  `.env`). `--yolo` auto-approves every tool call Hermes makes, since this is a
  non-interactive call with no terminal for it to prompt in.
- **`POST /api/hermes/run`** — new route, replaces `/api/hagrid/draft`. Runs any
  free-form task through local Hermes and persists the result to `pipeline.json`.

### Changed
- **Seat-07 renamed Hagrid → Hermes**, and reimagined, not just relabeled: was
  scriptwriting-only, is now a general-purpose, freely-tasked local agent with full
  shell/file/browser/MCP access — deliberately unrestricted, on the owner's explicit
  request. The Agent Editor's seat-07 panel changed from an "idea → script" box to a
  free-form task box, with that capability spelled out in the UI, not hidden.
- **Arthur's full-pipeline run still works end-to-end.** When it reaches the
  scriptwriting stage, it now checks seat-07's `engine` and calls either
  `draftScript()` (cloud) or the new `draftScriptViaHermes()` (local) — both return
  the same `{ script, shotList }` shape, so Percival/Teto/Merlin downstream don't
  need to know which one ran.
- `pipeline.json`'s `hagrid` key is now written as `hermes` going forward (old
  `hagrid` entries from prior runs are just inert leftover data, not migrated).

## [0.9.2] — 2026-08-15 — Migrated into the `imachickenface/camelot` repo, retired the old monorepo

### Changed
- This project previously lived alongside a different, older Camelot prototype in
  the `imachickenface/camelot` git repo — a Node/Fastify + React monorepo
  (`apps/server`, `apps/web`, `packages/shared`) with a Docker-based deploy. That
  prototype never had automation wired in either; this single-app Vite build is
  the more complete, actively-developed version, so it replaces it as the
  project going forward.
- The old monorepo's source is preserved on the `legacy-monorepo` branch, not
  deleted. `docker-compose.yml` and its Fastify/React source are gone from
  `master`.
- `CLAUDE.md` and `docs/STATUS.md` rewritten to describe this project instead of
  the retired one.
- Fixed `.claude/launch.json`, which had a hardcoded macOS path
  (`/Users/patrickxiao/.local/node/bin/npm`) left over from development on a
  different machine — now just `npm`, resolved from `PATH`.

## [0.9.1] — 2026-07-22 — Fixed a real infinite hang in Sir Scout, found by testing Arthur's run

### Fixed
- **`reddit-scout.js`'s `fetchWithTimeout` was dead code — never actually called.**
  `fetchSubreddit` called plain `fetch()` directly (both the initial request and
  the post-429 retry), so the documented "Reddit silently hangs a connection"
  behavior had no guard at all. Running Arthur's full pipeline for a real test
  surfaced this immediately: a `curl` against `/api/arthur/run` hung for 4+
  minutes with the Node process still processing server-side after the client
  gave up. Fixed by actually routing both fetch calls through
  `fetchWithTimeout`, and capped the 429 retry-after wait at 15s (previously
  uncapped — Reddit can report a `x-ratelimit-reset` far longer than one
  subreddit is worth blocking the whole scout run for). Verified: a direct
  `/api/scout/run` call that previously hung indefinitely now completes in
  ~68s and reports `403`/`429` on all five default subreddits — Reddit is
  still fully blocking this environment, unchanged from earlier findings, but
  the code now fails predictably instead of hanging forever.

## [0.9.0] — 2026-07-22 — Arthur orchestrates the full council

### Added
- **Arthur runs the whole pipeline in one pass.** `server/arthur.js`'s
  `runPipeline()` chains every wired seat in order — Scout (or a manually
  supplied idea) → Hagrid → Percival → Miku → Teto → Merlin → Crab — writing
  each stage's own `pipeline.json` section exactly as if it had been run from
  that seat's own panel. Deliberately demo-scoped per user decision: Merlin and
  Teto only work the shot list's **first beat** (a full shot list would multiply
  Merlin's ~1-2 minutes per clip across 5-15+ beats), and the run goes straight
  through with **no approval checkpoints** — Percival's findings are recorded but
  don't block Miku/Merlin from spending on generation regardless of verdict.
  A new `POST /api/arthur/run` route always returns `200` with an `{ok, steps,
  ...}` body — a stage failing partway is a meaningful result with its own
  step-by-step record, not an HTTP error, so a run that dies at (say) Hagrid
  still reports that Scout succeeded before it.
- **"Run the Pipeline" panel** on Arthur's own seat (seat-01) — an optional idea
  override (skips Sir Scout), a Run button, a step-by-step `[ok]`/`[failed]` log
  per stage, and the final script/video/voiceover/sfx once a run completes.
- **`server/pipeline-store.js`** extracted the `readPipeline()`/`writePipeline()`
  helpers out of `camelot-data-plugin.js` so both the HTTP routes and Arthur's
  orchestrator (which calls the same stage functions directly, not over HTTP)
  share one source of truth for `pipeline.json`.

## [0.8.0] — 2026-07-22 — The Mighty Crab pinches, and the pipeline gains a shared memory

### Added
- **The Mighty Crab is wired for real.** `server/crab.js` runs a QA pass over the
  pipeline's latest generated assets: a `HEAD` request against every URL Merlin,
  Miku, and Teto produced (broken-link detection), plus a visual sanity check on
  Merlin's still frame via a new `visualQaCheck` (`server/anthropic.js`) — Claude
  looks at the actual image and checks orientation, render quality, and whether it
  matches the intended shot prompt, via a forced `submit_qa_report` tool rather
  than free text. A new `POST /api/crab/check` route pulls its targets from
  `pipeline.json` by default (no input needed — "Run QA" just inspects whatever's
  there) and persists its verdict under a `crab` key.
- **Every wired seat now writes to `pipeline.json`.** Merlin, Miku, and Teto
  previously returned results straight to the Editor UI without persisting them —
  fine in isolation, but it meant nothing downstream (Crab, and eventually an
  orchestrator) could see what the other seats had produced. All three now record
  their latest output the same way Scout/Hagrid/Percival already did.
  `server/camelot-data-plugin.js` gained `readPipeline()` / `writePipeline(key,
  patch)` helpers to de-duplicate what had become six near-identical
  read-merge-write blocks.
- **"Inspect the Work" panel** in the Agent Editor, visible only on Crab's seat —
  a single Run QA button (it has no free-text input; it reads the pipeline
  itself), a reachability list per asset, and the visual verdict's note.

## [0.5.0] — 2026-07-22 — The Round Table grows: Sir Scout rides, Hagrid and the Rift Herald take their seats

### Added
- **Three new seats filled.** Sir Scout (seat 6 — Idea Sourcing), Hagrid (seat 7 —
  Scriptwriting) and the Rift Herald (seat 9 — Publishing & Distribution) join the
  council in `src/data/agents.json`, all with role/description/personality in the
  established voice. Hagrid and the Rift Herald are deliberate crossover picks (Harry
  Potter, League of Legends) rather than original Arthurian names — per user request.
  No portrait art was generated for either: Camelot's own design contract
  (`docs/DESIGN.md`) requires all art be original, so drawing their real likenesses
  would conflict with that rule; both render on the existing gold-monogram fallback.
  Seats 8, 10, 11 remain vacant placeholders for future knights (Editor/assembly,
  lead-gen, and one held in reserve).
- **Sir Scout is wired for real** — the second seat (after Merlin) with actual
  automation instead of the `runAgentTask` stub. `server/reddit-scout.js` pulls
  candidate story ideas from Reddit's own public RSS feeds
  (`reddit.com/r/<sub>/top/.rss`) — a first-class, Reddit-supported syndication
  format, not scraping. Reddit's JSON/API endpoints (`*.json`, `api.reddit.com`,
  even `oauth.reddit.com` unauthenticated) all return a blanket `403` from this
  environment (confirmed via direct `curl`), and RSS itself escalated from a
  rate-limited `429` to a `403` after a burst of diagnostic requests — this reads as
  an IP-level anti-abuse block (common for cloud/datacenter ranges), not something
  fixable client-side, and not something to spoof around. `fetchWithTimeout` guards
  every request (`AbortController`, 8s) since Reddit was observed to silently hang a
  connection rather than answer — without it, one bad request stalled the whole
  scout run indefinitely. Sir Scout is left wired to Reddit as-is: it may fail
  intermittently until whatever cooldown this IP is under lifts, and the UI already
  surfaces per-subreddit errors rather than pretending they succeeded. Subreddits
  are fetched sequentially (not in parallel) with spacing between requests, since
  RSS's per-IP rate limit is tight. A new `POST /api/scout/run` route
  (`server/camelot-data-plugin.js`) runs the fetch and persists results into a new
  `src/data/pipeline.json` (added to `ALLOWED_FILES`), the pipeline's first piece of
  state alongside `agents.json`.
- **"Scout for Ideas" panel in the Agent Editor**, visible only on Sir Scout's seat
  (`src/pages/editor/index.jsx`) — an optional comma-separated subreddit override, a
  Scout button, inline error/partial-failure messages, and a scrollable results list
  (title, subreddit, rank) linking out to each source. Mirrors the layout Merlin's
  "Cast a Clip" panel established.
- `.claude/launch.json` added so the dev server can be started via the standard
  preview tooling (`npm run dev` on :5173, using the local Node install).

## [0.7.0] — 2026-07-22 — Percival, Miku, and Teto join the pipeline

### Added
- **Percival is wired for real.** `factCheckScript` (`server/anthropic.js`) hands a
  script to Claude with the `web_search_20260209` server tool and a
  `output_config.format` JSON schema, getting back a structured claim-by-claim
  verdict (`confirmed` / `disputed` / `unverifiable` + a one-line note) instead of
  free text to parse. A new `POST /api/percival/check` route persists the result
  into `pipeline.json` under a `percival` key. The Editor's Fact-Check panel offers
  a one-click pull of Hagrid's latest script when one exists.
- **Miku and Teto are wired for real, via ElevenLabs** (`server/elevenlabs.js`,
  `@elevenlabs/elevenlabs-js`) — Higgsfield's SDK (used by Merlin) only covers
  image/video, not text-to-speech, music, or sound effects, so a second provider
  was added for audio specifically. Miku's seat drives two ElevenLabs endpoints —
  `textToSpeech.convert` (voiceover, default voice "Rachel", overridable via
  `ELEVENLABS_VOICE_ID`) and `music.compose` (a 30s backing track) — through one
  `POST /api/miku/generate` route (`{ mode: "voice" | "music" }`). Teto's seat
  calls `textToSoundEffects.convert` via `POST /api/teto/generate`. Generated clips
  are saved to a new `src/assets/audio/` (gitignored, pure output) and served at
  `GET /assets/audio/:file`, mirroring the existing portrait-serving route.
  Requires `ELEVENLABS_API_KEY` in `.env` (see `.env.example`).
- **Three new Editor panels**: "Fact-Check a Script" (seat-02), "Sing It" —
  Voiceover / Compose Music buttons (seat-03), and "Conjure a Sound" (seat-04).
  Miku and Teto's results render with a native `<audio controls>` player.

## [0.6.0] — 2026-07-22 — Hagrid drafts real scripts

### Added
- **Hagrid is wired for real** — the third seat with actual automation.
  `server/anthropic.js` calls the Claude API (`@anthropic-ai/sdk`, model
  `claude-opus-4-8`) with a forced `submit_script` tool (strict JSON schema) so an
  idea comes back as a structured `{ script, shotList }` rather than free-text to
  parse — `shotList` entries are 5-15s beats with a duration and a visual prompt,
  matching what Merlin's Cast a Clip panel expects per-beat. A new
  `POST /api/hagrid/draft` route (`server/camelot-data-plugin.js`) runs the call and
  persists the result into `src/data/pipeline.json` under a new `hagrid` key.
  Requires `ANTHROPIC_API_KEY` in `.env` (see `.env.example`), same credential
  pattern as Merlin's `HF_CREDENTIALS`.
- **"Draft a Script" panel in the Agent Editor**, visible only on Hagrid's seat
  (`src/pages/editor/index.jsx`) — an idea textarea, an optional dropdown pulling
  from Sir Scout's most recent candidates (fetched from `pipeline.json` when
  Hagrid's seat is selected), a Draft button, and the resulting script plus a
  rendered shot list (beat / duration / prompt per line).

## [0.4.2] — 2026-07-21 — Chibi Miku/Teto, and a crab that reads as a crab

### Changed
- **Miku and Teto's portraits are now full-body chibis, not shoulder busts.**
  Redrawn in `scripts/gen-portraits.mjs` in the oversized-head/small-body
  proportions of the brief's reference sketch (big round face, bead eyes,
  cheek blush) while staying dark-gothic rather than idol-bright: desaturated
  teal/coral instead of neon, a gold gorget + belt instead of jewelry, void-
  black outlines throughout. Authored as a left half (`MIKU_L`/`TETO_L`, 8
  cols) and mirrored via the new `mirrorH()` helper so the face/dress only
  exist once and stay perfectly symmetric — the previous hand-typed symmetric
  grids had a center-column bug (a transparent gap down the jaw/neck) that
  this catches structurally instead of by counting characters. Added one
  shared palette entry, `x` (chibi cheek blush). Grid shrank from 17×22 to
  16×18 — closer to the square aspect the portrait frame crops to, so less
  of the art is lost to `object-fit: cover`.
- **The Mighty Crab's Village sprite now actually reads as a crab.** The old
  design (`src/pages/village/sprites.js`) was a rounded blob with a giant
  white clown-face patch — no visible claws or eyestalks, just an outline
  the same crimson as the shell so they disappeared into it. Redrawn at
  20×25 (up from 16×24 — `buildCrabSprites`' `W`/`H`) with: a wide flat
  shell instead of a rounded body; a pair of **gold** pincer claws (a
  color deliberately different from the crimson shell, with a dark notch
  for the open pincer) that burst out past the shell's own silhouette
  instead of blending into it; visible jointed legs; and eyestalks. The
  jester identity is now a light touch — a small red nose + two blush dots
  on the shell, plus the three-tip gold/purple hat — rather than a face
  patch covering the crab. `CRAB_MAP` dropped four now-unused colors
  (`K`/`k` claw-red, `w`/`W` face-paint white). DOWN/UP are authored as a
  mirrored left half (`mirrorCrabRow`, same technique as the portraits);
  LEFT (profile) is hand-drawn full-width with one big forward-reaching
  claw and a small tucked one at the back, RIGHT still mirrors LEFT at draw
  time. The generic villager draw path already reads `spr.width`/`height`
  off the sprite canvas (`village/index.jsx`), so the size bump needed no
  changes anywhere else — confirmed live in the village with no clipping
  against the crab's cave.



### Fixed
- **Right- and left-side seats' Active/Inactive badges overlapped the next seat's portrait.**
  With 12 seats spaced 30° apart on the rim, the straight-line distance between adjacent seat
  centers was smaller than a seat's own content height at every arena size up to the circle's
  700px cap — worst-case near 3/9 o'clock, where neighboring seats sit almost directly above
  one another. The wide "ACTIVE"/"INACTIVE" text-pill toggle plus a nameplate that could wrap
  to two lines pushed seats (Mifu, Teto, The Mighty Crab, etc.) tall enough to visibly clip
  into the next seat's portrait frame, confirmed via bounding-rect overlap at 1280×720 and
  1440×900. Fixed with three changes in `src/pages/hub/`:
  - `Seat.jsx` / `hub.css`: the inline toggle is now a compact 24×24 crown icon-button
    (`.hub-seat__toggle`, reusing the existing `Crown` emblem in `currentColor`) instead of a
    full-width text pill, cutting the toggle's footprint roughly in half.
  - `hub.css`: `.hub-nameplate__name` is now a fixed single line (`nowrap` + ellipsis) instead
    of wrapping, so every seat has the same predictable height; the full name is still
    reachable via a native `title` tooltip and the existing `aria-label`.
  - `index.jsx` / `hub.css`: `SEAT_RADIUS` raised 42% → 45% and the arena's size cap raised
    (`72vh, 700px` → `78vh, 740px`) for more breathing room, and the circle → grid responsive
    fallback (`useIsNarrow`) now also collapses on short windows (`< 640px` tall), not just
    narrow ones (`< 1024px` wide) — backed by a matching `(max-height: 639px)` CSS media query.
  Verified collision-free at 900×1000 (grid fallback), 1280×720, 1280×1100, and 1440×900; the
  inline toggle still writes to shared state and stays keyboard-focusable.

## [0.4.0] — 2026-07-07 — A fuller council & a self-building table

### Added
- **Four new knights take their seats.** Sir Percival (seat 2 — Research & Fact-Checking),
  Miku (seat 3 — Voice & Music), Teto (seat 4 — Sound Design & Foley) and The Mighty Crab
  (seat 5 — QA & Bug-Catching) are filled in in `src/data/agents.json` with role, description
  and personality in the same voice as Arthur and Merlin.
- **Original pixel portraits for all four.** New ASCII-grid busts added to
  `scripts/gen-portraits.mjs` (regenerate with `npm run gen:portraits`): Percival is a
  bare-headed blond knight with a forest-green cloak, Miku has teal twin-tails, Teto has
  coral drill-twintails, and the Crab is a bespoke non-humanoid crab face (claws, eye-stalks,
  legs) rather than a knight bust. Three new palette accents (`f` forest-green, `t` teal,
  `r` coral, plus hair/shadow shades) join the shared rig so the four read as one set with
  Arthur/Merlin while staying instantly distinguishable at seat size. The stale clown-crab
  placeholder grid was replaced.
- **The Round Table builds itself on arrival.** A one-time construction sequence plays each
  time you navigate onto the Hub (`src/pages/hub/index.jsx`, `hub.css`): the stone disc rises
  out of the floor, the rune ring and gold inlays pop in, Excalibur appears, then all twelve
  seats converge from outside the viewport along their own radial angle, staggered clockwise
  seat 1 → 12, with each occupied portrait settling in a beat after its chair lands. Honors
  `prefers-reduced-motion` (falls back to the existing plain fade).

### Changed
- **Hub seats show less, and never collide.** Each occupied seat now shows only the portrait,
  the name, and the Active/Inactive toggle — the role subtitle and status lamp were removed
  from the seat (they still live in the slide-in detail panel). Portraits were resized
  (76 → 48px) with a tightened frame glow scoped to the Hub, the nameplate wraps within its
  own column, and the name font was reduced so long names ("The Mighty Crab", "Merlin The
  Wizard") no longer overflow into neighbouring seats. Verified collision-free at 1440, 1100
  and 1024px (the circle layout's minimum width).

### Fixed
- **The Village no longer throws every frame.** Navigating to `/village` was spamming
  `[village] paintable draw failed: TypeError: Cannot read properties of undefined (reading
  'width')` from the canvas loop. Root cause: a `requestAnimationFrame` timestamp landing at
  or before the previous one made `dt` negative, which drove a villager's `walkPhase` negative,
  so `frames[Math.floor(walkPhase) % length]` resolved to `undefined` and the draw read
  `.width` off nothing. Fixed by clamping `dt` to `[0, 48ms]` at the top of the frame loop
  (`src/pages/village/index.jsx`), which also absorbs tab-switch time jumps. Verified clean
  across repeated navigate-away-and-back cycles.

## [0.3.0] — 2026-07-04 — Merlin casts real clips

### Added
- **Merlin is wired to Higgsfield for real.** `runAgentTask('seat-12', prompt)`
  (`src/state/CamelotContext.jsx`) now POSTs to a new `/api/merlin/generate` route
  (`server/camelot-data-plugin.js`), which calls the official `@higgsfield/client` SDK
  (`server/higgsfield.js`): a prompt renders a Soul text-to-image still frame, then a DoP
  image-to-video call animates it into a short clip. Every other seat's `runAgentTask` is
  still the stub. Credentials come from `HF_CREDENTIALS` (`KEY_ID:KEY_SECRET`) in a
  gitignored `.env`, loaded into `process.env` via `loadEnv` in `vite.config.js` (see
  `.env.example`).
- **"Cast a Clip" panel in the Agent Editor.** Visible only on Merlin's seat
  (`src/pages/editor/index.jsx`) — a prompt box, a Cast button, an inline error message
  (e.g. missing `HF_CREDENTIALS`), and a `<video>` preview of the result once generation
  completes. A cast can take a minute or two since both Higgsfield calls await full
  completion before returning.

### Fixed
- **Broken portrait images corrupted the seat roll's layout.** `agents.json` references
  portraits (`percival.svg`, `miku.svg`, `teto.svg`, `crab.svg`) that were never added to
  `src/assets/portraits/` (only `arthur.svg` and `merlin.svg` exist), so those seats' `<img>`
  tags 404'd. Browsers render a broken image's unclipped alt text right over the layout, which
  visually overlapped the seat name next to it in the Scribe's Chamber. `Portrait.jsx` now
  tracks image-load failures with an `onError` handler and falls back to the gold monogram
  tile, the same as a named seat with no portrait at all.

## [0.2.1] — 2026-07-04 — Village canvas crash fix

### Fixed
- **Village threw "[village] paintable draw failed: ... reading 'width'" on every load.** The
  rAF loop's frame-delta calc (`src/pages/village/index.jsx`, `frame()`) clamped `dt`'s upper
  bound (for backgrounded tabs) but never its lower one. `requestAnimationFrame` timestamps
  aren't guaranteed strictly monotonic relative to a `performance.now()` read outside the
  callback, so a single backward tick made `dt` negative, driving a villager's `walkPhase`
  negative. `Math.floor(walkPhase) % frames.length` then returned `-1` (JS's `%` keeps the
  dividend's sign), so `frames[-1]` was `undefined` and the sprite draw crashed reading its
  `.width`. Clamped `dt` to `[0, 48ms]` at its single source so `walkPhase` can never go
  negative. Reproduced and confirmed the fix by driving the real `villagers.js` state machine
  with an adversarial backward-clock sequence in an isolated Node script (the module has no
  DOM dependency).

## [0.2.0] — 2026-07-02 — Merlin's tower & wandering villagers

### Added
- **Merlin's wizard tower.** Seat 12's plain cottage is replaced by a tall stone tower with a
  conical purple roof, gold ring + finial, two arched arcane windows and a runed oak door
  (`buildWizardTower` in `src/pages/village/sprites.js`). A twinkling finial sparkle shows
  while he's active.
- **Merlin now behaves exactly like Arthur in the Village.** New chibi wizard sprite
  (`buildMerlinSprites` — pointed hat, white beard, star-trimmed robe, 4 dirs × 2 frames).
  When his seat is **inactive** he sleeps inside and `z z Z` rise from the spire; when
  **active** he strolls the village. Toggle it from the Hub/Editor like any knight.
- **Pipeline-conversation seam (dormant, ready to wire).** When 2+ agents talk in a pipeline,
  their villagers can walk together, face each other and trade pixel **speech bubbles**.
  `CamelotContext` gained `conversations` + `startConversation(ids, lines)` /
  `endConversation(id)` / `clearConversations()` (the pipeline runner calls these). The
  Village animates whatever is in that list — empty by default, so it's a no-op until wired.
  Dev helper in a dev build: `__camelot.talk()` / `.hush()` / `.sleep()`.
- **Merlin's Round Table dossier is filled in.** Seat 12 now carries his identity from the
  Merlin skill — role *"Court Wizard — Video Generation"*, a Higgsfield-based description and
  his dry, no-flattery personality (`src/data/agents.json`).
- **Merlin chibi portrait.** A new `merlin.svg` bust (pointed hat + gold star, white beard,
  purple robe) added to `scripts/gen-portraits.mjs` in the same ASCII-grid style as Arthur,
  so it regenerates with `npm run gen:portraits`. It shows in his seat, the seat dossier and
  the Agent Editor.

### Fixed
- **Agent Editor didn't acknowledge Merlin's Village link.** The Status-toggle hint ("…governs
  his behavior in the Village") was hard-coded to `seat-01` only, so editing Merlin gave no
  indication his Active flag does the same thing Arthur's does. Generalized to a
  `VILLAGE_LINKED_SEATS` lookup covering both seats — the three surfaces (Editor, Round Table,
  Village) now all read from and describe the same `agents.json` record for Merlin.

### Changed
- **The single hard-coded "Arthur" sprite is now a reusable *villager*.** Extracted the
  inhabitant state machine + sleep particles into `src/pages/village/villagers.js`
  (`createVillager` / `stepVillager` / `updateConversations`); the Village renders a list of
  villagers (Arthur + Merlin today) through one code path, so adding another is a registry
  entry. Arthur's look and behavior are byte-for-byte unchanged.
- Added `--glow-purple` to the theme and a `.village-bubble--merlin` arcane tooltip variant.

### Fixed
- Villagers waking from a **tall** residence (the tower) no longer wedge inside their own
  collision box — they now spawn at the door threshold, which sits below the footprint.
- Villagers no longer get stuck head-on against the central well: `stepToward` slips one step
  perpendicular to round an obstacle instead of freezing.

## [0.1.1] — 2026-07-02 — Legibility & polish fixes

### Fixed
- **Round Table portraits now center in their frames.** `Portrait` (framed) was sized to
  `size` while its image was also `size`; with `box-sizing: border-box` the padding + border
  pushed the image down/right and clipped it. The frame now shrink-wraps the image so the
  gold border sits evenly around it (verified: 8px on all sides).
- **Village no longer renders blank after leaving and returning to the tab.** Root cause:
  on a client-side remount the `requestAnimationFrame` loop can stay paused (rAF is throttled
  whenever the tab/preview panel isn't actively painting), so the canvas never received its
  first frame and sat blank. The scene now paints **one frame synchronously on mount** (and
  repaints on `visibilitychange`), so it's visible immediately regardless of rAF timing.
  Also guards `resize()` against a 0×0 stage and adds a `.village-stage` `min-height` floor.
- **Views can no longer blank the whole app.** Added an `ErrorBoundary` around the routed
  views (keyed by path, so it resets on navigation) — if a page ever throws it now shows a
  themed "a shadow falls on this hall" fallback with the error and a reload button, instead
  of a blank screen. The Village's canvas render loop is also fully fail-soft now: each
  sprite draw and each frame is isolated in try/catch and logged once, so a single bad draw
  can never kill the animation loop or clear the scene.

### Changed — legibility
- Body text (VT323) bumped 20px → 22px with more line-height (1.15 → 1.35) and a touch of
  letter-spacing.
- The smallest Press Start 2P labels (nameplate subtitles, status text, seat numbers, etc.)
  raised from 7–8px to 9–10px so they're actually readable.

## [0.1.0] — 2026-07-02 — Initial build: foundation + UI shell

The first build. Establishes the project, the dark gothic pixel-art theme, persistent
state, the tab system, and the three primary tabs (Round Table Hub, Agent Editor, Village).
Automation logic is intentionally **not** included — extension hooks are left in place.

### Added — Project & tooling
- Created the `camelot/` project (React + Vite) with the full folder structure.
- `server/camelot-data-plugin.js` — a tiny local persistence server implemented as a Vite
  middleware, so the whole app runs from a single `npm run dev`. Routes: read/write
  `agents|tabs|settings` JSON, upload portraits, and serve portrait files from disk.
- `scripts/gen-portraits.mjs` — generates the ORIGINAL pixel-art `arthur.svg`,
  `vacant-silhouette.svg`, and `cursor-sword.svg` from ASCII grids (no copyrighted art).
- Seeded state files (the **source of truth**): `agents.json` (Arthur pre-filled + 11 vacant
  seats), `tabs.json`, `settings.json`.

### Added — Global theme (dark gothic pixel-art)
- `styles/theme.css` (palette + font + pixel-metric tokens), `global.css` (reset, tiled
  stone background texture, custom pixel-sword cursor, typography, chunky scrollbars),
  `pixel.css` (reusable pixel-UI classes + shared keyframes), `components.css`.
- Fonts: UnifrakturMaguntia (blackletter titles), Press Start 2P (labels), VT323 (body).
- Chunky stepped pixel borders (no rounded corners), stone + torchlight glows, pointed-arch
  headers, pennant tab shapes, torch flicker & ember animations.

### Added — Shared state & navigation
- `state/CamelotContext.jsx` — single shared state that loads the JSON files on boot and
  persists on every mutation (files win; no `localStorage` source of truth). Exposes
  `updateAgent`, `toggleAgentActive`, `uploadPortrait`, tab CRUD, and a `runAgentTask` HOOK.
- `App.jsx` — shell + React Router routes and a themed loading screen.
- `components/TabNav.jsx` — left rail of hanging gothic banners. Default tabs (Round Table,
  Village, Agent Editor) are fixed; **custom tabs** can be created (`✦ New Hall`), renamed
  inline (double-click / ✎), and deleted behind a **wax-seal confirm** — persisted to
  `tabs.json` with `{ id, name, type, contentRef }` for future content mounting.
- Shared pixel-UI kit: `PixelPanel`, `PixelButton`, `PixelFrame`, `ArchHeader`, `Torch`,
  `Crown`/`Excalibur`/`QRune` emblems, `Portrait`, `StatusLamp`, `WaxSealDialog`.

### Added — The Round Table Hub (primary page)
- Top-down round stone table with a carved rune ring; 12 seats around the rim (Arthur
  occupied at 12 o'clock + 11 vacant gothic chairs with a floating `?` rune).
- Seat detail slide-in panel (occupied / vacant modes); vacant seats deep-link into the
  Agent Editor ("Forge This Knight"); Arthur links to his editor entry.
- Hall banner header, live council status strip (`Knights seated: N / 12`), clickable
  Excalibur-in-the-stone center easter egg, torch-lit corners, responsive fallback.

### Added — The Agent Editor
- Scribe's-chamber page: left seat roll + right form to edit each seat's image (upload with
  live preview in the gold frame), name (blackletter preview), role, description,
  personality, and Active/Inactive status. Wax-seal Save + Revert. Deep-link preselect via
  `?seat=`. Saves reflect live in the Hub and Village.

### Added — The Village
- Canvas dusk overworld: 12 cottages mirroring the 12 seats (Arthur's lit + gold-trimmed,
  11 boarded-up). Arthur's chibi sprite wanders with 4-direction walk cycles + collision
  when **Active**; retreats indoors with floating 💤 over the roof when **Inactive** —
  driven live by the shared `active` flag. Clickable houses/sprite with speech bubble &
  links back to the Hub / into the Editor.

### Fixed / polished
- Seat toggle `aria-label` now uses the knight's actual name instead of a hardcoded one.

### Verified end-to-end (running the dev server)
- Editing a seat in the Agent Editor persists to `agents.json` and reflects live in the Hub
  (seat becomes occupied, council count updates) with no refresh.
- Toggling Arthur Active/Inactive switches his Village behavior live (wander ↔ 💤).
- Vacant-seat "Forge This Knight" deep-links to `/editor?seat=seat-NN` with the seat preselected.
- Creating/renaming/deleting custom tabs persists to `tabs.json` across restarts.
- All three pages render with no runtime errors; the circular table falls back to a
  scrollable grid below 1024px.

### Notes / deliberate decisions
- **12 houses, not 11** — the village renders one cottage per seat for a perfect 1:1 mirror
  of the 12 Round Table seats. Easy to change via `agents.json` / `settings.seatCount`.
- Future-automation hooks left in place: `// HOOK: agent task execution`,
  `// HOOK: pipeline status feed`, `// HOOK: custom tab content mounting`.
