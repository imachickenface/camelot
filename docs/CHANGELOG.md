# Changelog

Notable changes to Camelot, newest first. Dates are `YYYY-MM-DD`.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- **Camelot pushed to GitHub** (`github.com/imachickenface/camelot`) and
  `.github/workflows/claude.yml` added, enabling `@claude` mentions on issues/PRs
  to trigger Claude Code via GitHub Actions. Requires the owner to install the
  Claude GitHub App and add an `ANTHROPIC_API_KEY` repo secret before it's live.

### Fixed
- **Laggy background-video scrubbing in the Forge hero.** Two-part fix:
  1. *Code* — the mouse handler was setting `video.currentTime` on every
     `mousemove`, so seeks piled up faster than the decoder could resolve them.
     Reworked it so `mousemove` only records the target time and a
     `requestAnimationFrame` loop applies at most one seek per frame — never
     overlapping an in-flight seek (guarded by the `seeked` event) — and uses
     `fastSeek()` where supported. (`apps/web/src/features/forge/ForgeHero.tsx`)
  2. *Asset* — re-encoded `apps/web/public/forge-hero.mp4` to **60fps,
     all-keyframe (intra-only)** H.264 with ffmpeg (motion-interpolated 24→60fps
     via `minterpolate`, `keyint=1`). Every frame is now a seek target, so seek
     latency dropped to ~5ms (well under a 60fps frame) and scrubbing is smooth.
     File grew ~10MB → ~15MB.

### Added
- **App-wide dark mode** — a `.dark` palette in `index.css`, a `ThemeProvider`
  (`apps/web/src/lib/theme.tsx`) that persists the choice and toggles the `dark`
  class on `<html>`, an anti-flash inline script in `index.html`, and a reusable
  `ThemeToggle` (sun/moon) in the sidebar footer and the Forge navbar.

### Changed
- **Established Docker (`http://localhost:8080`) as the single source of truth.**
  Confirmed there is only one codebase — `:8080` is the Docker build, `:5173` is
  the dev server of the same source; they had diverged only because the running
  Docker image was stale. Rebuilt the images so :8080 carries the Forge tab, dark
  mode, and the meshed look alongside its engine + sample data. Rewrote the
  README run section and CLAUDE.md so the "one app, two ports" model is explicit
  and rebuilding (`docker compose up -d --build`) is the documented fix.
- **Meshed the Forge hero into the Camelot aesthetic.** It now uses the shared
  theme tokens (parchment/gold/royal blue) instead of hard-coded white/green,
  sits inside the dashboard frame (sticky navbar rather than a fixed bar that
  overlapped the side menu), gained a gold Cinzel eyebrow, a readability scrim
  over the video, and royal-blue active pills that match the selected-nav style.

### Added
- **The Forge tab** — the first real tool surface. Promoted from a locked
  "coming soon" menu entry to a live route (`/forge`) with its own page.
- An interactive **hero section** (`apps/web/src/features/forge/ForgeHero.tsx`):
  a white/Inter landing surface with a mouse-scrubbed background video (autoplay
  on mobile), a typewriter headline, an animated navbar + mobile overlay menu,
  and multi-select "forge method" pills with a contingent status banner. Copy is
  themed around forging video, and the background clip is served locally from
  `apps/web/public/forge-hero.mp4`.
- The `motion` dependency (Framer Motion, imported as `motion/react`) in
  `apps/web`, plus a `blink` keyframe in `index.css` for the cursor.
- New doc `docs/FORGE_HERO.md` describing the component and how to extend it.

### Verified
- Web type-check passes; the page renders with no console errors; selecting a
  service pill toggles the acknowledgment banner; the headline types out in Inter.

---

## [0.1.0] — 2026-06-24

The initial foundation build.

### Added
- Monorepo scaffold with npm workspaces (`apps/server`, `apps/web`,
  `packages/shared`) and a single `npm run dev` command.
- Shared TypeScript types for agents, statuses, activity, and live events
  (`packages/shared`).
- The engine (`apps/server`): Fastify server, a module registry and event bus
  (the plug-in seam for future tools), JSON-file storage, a 12-seat seed
  (Arthur, Lancelot, Tristan, Percival + 8 vacant seats), and routes for
  listing/editing agents and streaming live activity (Server-Sent Events).
- A simulation module that animates the Round Table and serves as the template
  for real tools.
- The website (`apps/web`): React + Vite + Tailwind + shadcn/ui with a medieval
  theme; a dashboard shell; the two-column Round Table page (circular 12-seat
  table, live chronicle, and per-agent detail); live updates over SSE; and a
  click-to-edit Agents & Settings screen.
- Docker setup: Dockerfiles for both apps, `docker-compose.yml`, an nginx proxy
  config, and a persistent volume for saved agents.
- Documentation: README, CLAUDE.md, and the `docs/` set (ARCHITECTURE, STATUS,
  ROADMAP, ADDING_A_MODULE, this changelog).

### Verified
- Type-check passes for all three packages; the web production build succeeds;
  the engine serves agents and the live SSE feed; edits save and persist; the
  Round Table renders with live activity in the browser.

### Notes
- No real outside services (video/audio/scraper) are connected yet; their places
  in the menu and engine are marked "coming soon".
