# The Forge — hero section

This is the landing surface for **The Forge**, Camelot's video-making tool
(the knight Lancelot in the Round Table). For now the tab is just this
interactive hero; the real video-generation backend will grow behind it (see
[`ROADMAP.md`](ROADMAP.md) → "Video maker").

## Where it lives

| Piece | File |
| --- | --- |
| Hero component | `apps/web/src/features/forge/ForgeHero.tsx` |
| Page wrapper | `apps/web/src/pages/ForgePage.tsx` |
| Route (`/forge`) | `apps/web/src/App.tsx` |
| Side-menu entry | `apps/web/src/layout/DashboardShell.tsx` (`MAIN_NAV`) |
| `blink` cursor keyframe | `apps/web/src/index.css` |
| Background video | `apps/web/public/forge-hero.mp4` |

## Design note (meshed aesthetic)

The hero keeps its modern *layout* but now wears **Camelot's skin** so the app
reads as one project rather than two bolted together:

- Colors come from the shared theme tokens (`bg-background`, `text-foreground`,
  `border-border`, `bg-card`, `text-accent`, …) instead of hard-coded
  white/green — so it adapts to light **and** dark mode for free.
- A gold Cinzel **eyebrow** ("✦ Camelot · The Forge") and a `gold-rule` divider
  tie it back to the Round Table.
- Active service pills reuse the **royal-blue selected-nav** style
  (`bg-primary text-primary-foreground`); the status banner uses a gold left
  border and a gold "Start forging" call-to-action.
- The big headline stays in **Inter** (`font-sans`) as the modern anchor; the
  sub-heading and logo use the Cinzel display font (Camelot's heading face).
- On desktop a `bg-gradient-to-r from-background … to-transparent` **scrim**
  washes the left side (where the copy sits) into the theme background while the
  video glows through on the right.

### Fitting inside the dashboard frame

The Forge renders *inside* `DashboardShell` like every other page. Its top bar
is **`sticky`**, not `fixed`, so it stays within the main content column and
never overlaps Camelot's side menu.

## Dark mode

Light/dark is handled globally (not specific to the Forge):

- `apps/web/src/index.css` — a `.dark { … }` token block and a dimmed body
  vignette.
- `apps/web/src/lib/theme.tsx` — `ThemeProvider` / `useTheme`; persists the
  choice under `camelot-theme` in `localStorage` and toggles the `dark` class on
  `<html>` (Tailwind is `darkMode: ['class']`).
- `index.html` — an inline script applies the saved/system theme before paint to
  avoid a flash.
- `apps/web/src/components/ThemeToggle.tsx` — the reusable sun/moon button, shown
  in the sidebar footer and the Forge navbar.

## What it does

- **Background video** — served locally from `public/forge-hero.mp4`. On
  desktop (≥ `lg`) it sits as an absolute background and **scrubs with the
  mouse**: horizontal movement maps to the video's playhead. To keep this smooth,
  `mousemove` only records a target time; a `requestAnimationFrame` loop applies
  at most one seek per frame and never starts a new seek while the previous one
  is still resolving (and uses `fastSeek()` where supported). Below `lg` it
  stacks beneath the copy and simply **autoplays** (muted, `playsInline`).
- **Typewriter headline** — the `useTypewriter` hook builds the text one slice
  at a time and shows a blinking cursor until done.
- **Navbar** — fixed, transparent, with a `Mainframe`-style logo, centered nav
  links, a desktop CTA, and an animated hamburger that opens a full-screen
  mobile overlay menu.
- **Service pills** — a multi-select set of "forge methods" (`Image to video`,
  `Text to video`, `Reference blend`, `Other`). Selecting any reveals a status
  banner via `AnimatePresence`; the empty state shows a placeholder.

## Replacing the video

Drop a new `.mp4` into `apps/web/public/` and update `VIDEO_SRC` at the top of
`ForgeHero.tsx` to its path (e.g. `/forge-hero.mp4`). Keeping it in `public/`
means Vite serves it directly and nginx ships it with the production build —
no external host required.

**Encode it for smooth scrubbing.** Mouse-scrubbing seeks to arbitrary times, so
the clip must be **all-keyframe (intra-only)** — otherwise the browser decodes
from the nearest keyframe on every seek and it stutters. The shipped
`forge-hero.mp4` was made 60fps + all-keyframe with ffmpeg:

```bash
ffmpeg -i input.mp4 \
  -vf "minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1" \
  -c:v libx264 -preset slow -crf 22 \
  -x264-params "keyint=1:min-keyint=1:scenecut=0" \
  -pix_fmt yuv420p -movflags +faststart -an forge-hero.mp4
```

(`minterpolate` is optional — it interpolates a lower-fps source up to 60fps;
drop it if your source is already smooth. `keyint=1` is what makes every frame a
keyframe.) With this, seeks resolve in ~5ms and scrubbing is fluid.

**Remember to rebuild Docker** (`docker compose up -d --build`) so the canonical
app on :8080 picks up the new file.

## Dependency

The animations use **Framer Motion**, imported as `motion/react` (the `motion`
package). It was added to `apps/web` for this feature.

## Verified (2026-06-24)

Web type-check passes; the page renders with no console errors; the local video
loads (`readyState 4`); selecting a pill toggles the banner; the headline types
out in Inter.
