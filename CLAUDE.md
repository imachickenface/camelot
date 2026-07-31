# CLAUDE.md — orientation for AI sessions

Read this first. It tells a brand-new session (which starts with no memory of
past ones) what Camelot is, where everything lives, and the rules to follow.

## What Camelot is

A **modular content-creation engine**. The home page is a medieval **Round
Table** of up to 12 "agents" (helpers), where you can watch what each is doing.
The platform is intentionally generic ("swiss-army-knife") — it is **not** to be
hard-wired to content creation. New tools should plug in without rewriting the
core.

Planned tools (not built yet): a **video maker**, a **sound/audio maker**, and a
**web scraper/explorer** for content ideas, all coordinated by a **leader** agent.

## Who it's for (important)

The owner is **non-technical**. So:

- Explain things in plain language; avoid jargon in anything owner-facing.
- Keep "one command to run" true (`docker compose up`, or `npm run dev`).
- **Do not build a major feature without asking the owner first.** When unsure,
  ask before implementing.

## How it's built

- **Monorepo** with npm workspaces.
  - `apps/server` — the engine: Node + TypeScript + **Fastify**. Runs with
    `tsx` (no compile step). Reads `.ts` directly, including the shared package.
  - `apps/web` — the website: **React + TypeScript + Vite + Tailwind + shadcn/ui**.
  - `packages/shared` — TypeScript types used by both sides (the single source of
    truth for data shapes). Imported as `@camelot/shared`.
- **Live updates** flow engine → browser via **Server-Sent Events** (`/api/events`).
- **Saving**: agent edits are written to a JSON file (`apps/server/data/agents.json`,
  or the path in `CAMELOT_DATA_FILE`). Swap this for a real database later behind
  the same functions in `apps/server/src/storage/jsonStore.ts` — nothing else
  needs to change.
- **Docker**: `docker-compose.yml` builds both apps; nginx serves the website and
  proxies `/api` to the engine.

> **Canonical app = Docker at http://localhost:8080.** This is the owner's single
> source of truth — what they actually use. `npm run dev` (http://localhost:5173)
> is the **same codebase**, just a hot-reloading dev preview — *not* a second
> project. They can look different only when the Docker image is stale: it serves
> a pre-built `apps/web/dist` snapshot, so **any code change requires a rebuild**
> (`docker compose up -d --build`) before :8080 shows it. If a future session
> sees "two Camelots on different ports", this is why — reconcile by rebuilding
> Docker, never by forking the code.

## The plug-in design (how to add a tool)

The engine is organized around **modules** (`apps/server/src/core/registry.ts`).
A module registers itself in `apps/server/src/index.ts` and can broadcast
activity on the shared event bus and/or add its own routes. The only module today
is the **simulation** (`apps/server/src/modules/simulation/`), which also serves
as the worked example. Full walkthrough: **`docs/ADDING_A_MODULE.md`**.

## Conventions

- Keep code clean and human-legible; comments explain the *why*. Match the
  surrounding style.
- Shared data shapes go in `packages/shared/src/types.ts` so both sides agree.
- UI uses shadcn components in `apps/web/src/components/ui` and the theme tokens
  in `apps/web/src/index.css` / `tailwind.config.js`.
- Relative `/api/...` paths only in the web app — never hard-code the engine's
  address (Vite/nginx handle the forwarding).

## Useful commands

```bash
npm install              # install everything (run once)
npm run dev              # dev preview at :5173 (engine + website, hot reload)
npm run typecheck        # type-check every package
docker compose up -d --build   # build + run the REAL app at :8080 (do this after code changes)
docker compose ps        # see what's running
docker compose down      # stop the app
```

## ⚠️ End-of-session rule

Before you finish a session in which you changed anything, **update the docs** so
the next session is not lost:

1. **`docs/STATUS.md`** — move items between ✅ Completed / 🚧 In progress / 📋
   Planned, and date anything newly completed.
2. **`docs/CHANGELOG.md`** — add a dated entry describing what changed.

Keep both accurate. They are the memory this project has.
