# Status

The living tracker of where Camelot stands. Keep this up to date — it is the
project's memory between sessions. Dates are `YYYY-MM-DD`.

> **At a glance:** the foundation is complete. The Round Table, the dashboard,
> 12 customizable agents, simulated live activity, Docker, and the docs are all
> in place. No real outside services are connected yet — that's the next phase.

---

## ✅ Completed

- **2026-06-24 — Project foundation.**
  - Monorepo set up (npm workspaces): `apps/server`, `apps/web`, `packages/shared`.
  - **Shared types** (`packages/shared`): Agent, AgentStatus, AgentCapability,
    ActivityEvent, Task, ServerEvent.
  - **Engine** (`apps/server`): Fastify server; module registry + event bus;
    JSON file storage; 12-seat seed (4 named knights + 8 vacant); routes for
    listing/editing agents and the live Server-Sent-Events feed.
  - **Simulation module**: drives believable, changing agent activity, and
    doubles as the template for future tools.
  - **Website** (`apps/web`): React + Vite + Tailwind + shadcn/ui; medieval
    theme; dashboard shell with side menu; Round Table page (two columns:
    circular 12-seat table + live chronicle + selected-agent detail); live
    updates via SSE; click-to-edit Agents & Settings screen.
  - **Docker**: Dockerfiles for both apps, `docker-compose.yml`, nginx proxy,
    persistent volume for saved agents. One command: `docker compose up`.
  - **Docs**: README, CLAUDE.md, ARCHITECTURE, ROADMAP, ADDING_A_MODULE, this
    STATUS file, and CHANGELOG.
  - **Verified end-to-end (2026-06-24):** all three packages type-check; the web
    production build succeeds; the engine serves the 12 agents; the live event
    stream (SSE) pushes updates; saving an edit persists to disk; and the Round
    Table renders correctly with live activity in the browser.

---

- **2026-06-24 — The Forge tab (interactive hero section).**
  - Promoted **The Forge** from a locked "coming soon" entry to a live tab in
    the side menu (`/forge`), wired up in `App.tsx` and `DashboardShell.tsx`.
  - New hero surface at `apps/web/src/features/forge/ForgeHero.tsx` (page wrapper
    `apps/web/src/pages/ForgePage.tsx`): a self-contained, white/Inter landing
    section with a mouse-scrubbed background video (autoplays on mobile), a
    typewriter headline, an animated navbar with a mobile overlay menu, and a
    multi-select set of "forge method" pills with a contingent status banner.
  - Copy is themed around the video-forging feature; the background video is
    served locally from `apps/web/public/forge-hero.mp4`.
  - Added the `motion` package (Framer Motion, imported as `motion/react`) for
    the animations, and a `blink` keyframe to `index.css` for the typing cursor.
  - Full write-up: [`FORGE_HERO.md`](FORGE_HERO.md).
  - **Verified (2026-06-24):** web type-check passes; the page renders with no
    console errors; pill selection toggles the banner; headline types in Inter.

- **2026-06-24 — Consolidated to one app; Docker (:8080) is the source of truth.**
  - Cleared up an apparent "two projects" split: there is only **one** codebase.
    `:8080` is the **Docker** stack (`camelot-web` + `camelot-server`) serving a
    pre-built `apps/web/dist`; `:5173` is the Vite **dev** server of the same
    `apps/web/src`. They diverged only because the running Docker image was a
    stale build (it predated the Forge tab + dark mode), and the dev server in a
    prior session was started without its engine (hence no sample data).
  - Rebuilt the Docker images from current source (`docker compose up -d
    --build`). **:8080 is now the canonical app** the owner uses, with the Forge
    tab, dark mode, the meshed aesthetic, AND the engine + sample data.
  - Documented the model so it can't recur: README "Running it" rewritten (Docker
    is the app; rebuild after changes), CLAUDE.md flags :8080 as canonical and
    warns future sessions not to fork the code, and the commands list now leads
    with `docker compose up -d --build`.
  - **Verified (2026-06-24):** both containers up; `http://localhost:8080`
    serves the new build (dark-mode script present), `/forge-hero.mp4` returns
    200, `/api/agents` returns the seeded knights, and the Forge tab renders with
    "Connected to the realm".

- **2026-06-24 — Unified aesthetic + app-wide dark mode.**
  - Meshed the two looks: the Forge hero now wears Camelot's theme tokens
    (parchment/gold/royal blue), sits *inside* the dashboard frame (its navbar is
    `sticky`, not `fixed`, so it no longer overlaps the side menu), gained a gold
    Cinzel "Camelot · The Forge" eyebrow, and its active pills reuse the
    royal-blue "selected nav" style. A parchment scrim keeps the copy readable
    over the background video.
  - Added a **toggleable dark mode**: a `.dark` token set + dimmed body vignette
    in `index.css`, a `ThemeProvider` (`lib/theme.tsx`) that persists the choice
    to `localStorage` and flips the `dark` class on `<html>`, an anti-flash
    inline script in `index.html`, and a reusable `ThemeToggle` (sun/moon) shown
    in the sidebar footer and the Forge navbar. Applies across every page.
  - One localhost confirmed: `npm run dev` already runs engine + web together
    (web on `:5173`, proxying `/api`).
  - **Verified (2026-06-24):** type-check passes; the toggle flips and persists
    light↔dark; both the Forge and the Round Table render correctly in each
    theme; pills and banner still work.

---

## 🚧 In progress

- **2026-07-30 — Camelot is now on GitHub with the Claude GitHub App wired up.**
  - Initialized git locally and pushed to `https://github.com/imachickenface/camelot`
    (branch `master`). Local git identity is set repo-locally (not global).
  - Added `.github/workflows/claude.yml` (from the official
    `anthropics/claude-code-action` template) so commenting `@claude` on an issue
    or PR triggers Claude Code via GitHub Actions.
  - Still needed from the owner (not done by the assistant — requires GitHub
    login and an API key): install the Claude GitHub App at
    `github.com/apps/claude` on the repo, and add an `ANTHROPIC_API_KEY` repo
    secret under Settings → Secrets and variables → Actions. Until both are
    done, `@claude` mentions on the repo won't do anything yet.

---

## 📋 Planned / backlog

In a sensible suggested order (each needs the owner's go-ahead, and most need an
account/API key):

0. **The Forge — real video tooling.** The tab and its hero section now exist
   (2026-06-24); the next step is wiring it to an actual video-generation API
   behind a server module. Needs an API key.
1. **Leader agent logic** — let Arthur actually assign quests to other agents
   (still no outside services). A good warm-up that exercises the module system.
2. **Web scraper / explorer** (Percival) — fetch content ideas from Reddit and
   show them in the chronicle. Likely the easiest "real" tool to start with.
3. **Sound / audio maker** (Tristan) — connect to a text-to-speech / audio API
   (e.g. ElevenLabs). Needs an API key.
4. **Video maker** (Lancelot) — connect to an image/video generation API. Needs
   an API key; usually the heaviest tool.
5. **Cross-cutting, when needed**: a real database (replacing the JSON file),
   user accounts/login, saving generated media, and a deployment setup.

See [`ROADMAP.md`](ROADMAP.md) for more on each.
