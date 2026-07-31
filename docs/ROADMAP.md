# Roadmap

Where Camelot is headed. This is a guide, not a contract — the owner decides
what to build and when, and **each real tool should be confirmed before it's
built** (most need an account and an API key).

## Guiding principles

- **Stay modular.** Every new tool is a *module* that plugs into the engine
  (see [`ADDING_A_MODULE.md`](ADDING_A_MODULE.md)). The core never gets
  hard-wired to any one feature.
- **One tool at a time.** Add, test, and polish a single tool before starting
  the next.
- **Keep it owner-friendly.** Anything the owner touches stays click-and-go;
  secrets (API keys) go in environment variables, never in the code.

## Suggested order

### 1. Leader logic (Arthur)
Teach the leader to hand out quests to the other agents. No outside services —
this just exercises the module system and makes the table feel coordinated. A
safe first step.

### 2. Explorer / scraper (Percival)
Fetch content ideas from the web (e.g. Reddit's public listings) and post them
into the live chronicle. Usually the simplest "real" tool, and Reddit has a
public read-only API. **Needs:** possibly a Reddit app key for higher limits.

### 3. Sound / audio maker (Tristan)
Turn text into narration/audio via a service like ElevenLabs. **Needs:** an
ElevenLabs (or similar) account and API key; somewhere to store the audio files.

### 4. Video maker (Lancelot)
Generate images/video via an AI image/video API. Usually the heaviest tool.
**Needs:** the chosen provider's account and API key; media storage; and likely
a job/queue approach since generation can be slow.

## Cross-cutting upgrades (do these when the app outgrows the basics)

- **Real database** — replace the JSON file. Only `apps/server/src/storage/
  jsonStore.ts` should need to change.
- **Media storage** — a place to keep generated audio/video (local folder or a
  cloud bucket).
- **Background jobs** — a queue for slow tasks (video especially) so the app
  stays responsive.
- **Accounts / login** — if more than one person will use it.
- **Deployment** — hosting so it's reachable beyond the owner's own machine.

## Out of scope for now

Anything not listed above. When a new idea comes up, add it here first and
discuss before building.
