# Camelot — Design System

**Aesthetic:** dark gothic pixel-art — a 16-bit gothic RPG menu, not a modern web app.
Everything is carved stone, gold inlay, torchlight, and blackletter. No smooth rounded
corners, no material shadows, no flat-design pills or web-y gradients.

---

## Color palette

All colors are CSS variables declared in `src/styles/theme.css`. **Never hardcode a new
color** — reuse these.

### Core palette (from the brief)

| Variable | Hex | Usage |
| --- | --- | --- |
| `--void-black` | `#0b0a12` | Page background, outlines |
| `--dungeon-stone` | `#1a1725` | Panels, cards |
| `--raised-stone` | `#262033` | Hover states, raised surfaces |
| `--aged-gold` | `#c9a227` | Primary accent — headings, active borders, Arthur |
| `--pale-gold` | `#e8d48b` | Highlights, hover glow |
| `--blood-crimson` | `#7a1e2b` | Danger, alerts, wax-seal accents |
| `--royal-purple` | `#3d2a5c` | Secondary accent, vacant-seat tint |
| `--ghost-grey` | `#8b8699` | Muted/disabled text, vacant elements |
| `--parchment` | `#d8cfc0` | Body text |
| `--torch-orange` | `#d97b29` | Flame/ember accents, notification dots |

### Derived tones (bevels, states)

`--stone-edge-light #3a3350` · `--stone-edge-dark #050409` · `--gold-dim #7d6518` ·
`--gold-dark #4f3f0f` · `--crimson-dark #4a121b` · `--crimson-bright #a83545` ·
`--purple-dark #241833` · `--purple-light #57407e` · `--parchment-field #cabfa8` ·
`--parchment-dark #b3a88f`.

---

## Typography

Loaded via Google Fonts in `index.html`, with system fallbacks.

| Role | Font | Variable | Why |
| --- | --- | --- | --- |
| Headings / titles | **UnifrakturMaguntia** (blackletter) | `--font-title` | Gothic, regal, unmistakably medieval |
| Labels / buttons | **Press Start 2P** (pixel) | `--font-label` | Crisp 8-bit UI chrome — keep strings SHORT, it's wide |
| Body / paragraphs | **VT323** (pixel mono) | `--font-body` | Legible at paragraph length where Press Start 2P is far too heavy |

Fonts themselves are vector; we keep pixel art crisp with `image-rendering: pixelated` on
`img/svg/canvas`, and `shape-rendering="crispEdges"` on generated SVGs.

---

## Navigation: left banner rail (justification)

A **persistent left sidebar** of hanging gothic **pennants** was chosen over a top banner
bar because:
- Tabs are open-ended (users add custom halls) — a vertical list scales without crowding.
- The pennant/banner metaphor reads naturally as a vertical hanging cloth on a stone wall.
- It keeps the wide Hub canvas (the round table + Village canvas) unobstructed horizontally.

The active tab is lit gold; hover raises a torchlight glow (via `filter: drop-shadow`, since
the `.pennant` clip-path would clip a normal `box-shadow`).

---

## Pixel border / bevel technique

Chunky stepped bevels, never `border-radius`. The recipe (see `.pixel-panel`, `.pixel-btn`,
`.pixel-frame` in `src/styles/pixel.css`):

1. **Per-side bevel** — light top/left, dark bottom/right border colors give the 3D "carved"
   look: `border-color: var(--stone-edge-light) var(--stone-edge-dark) var(--stone-edge-dark) var(--stone-edge-light);`
2. **Outer pixel outline** — a hard `box-shadow: 0 0 0 2px var(--void-black)` wraps the whole
   thing in a crisp black pixel edge.
3. **Inset carve** — an `inset` shadow adds depth inside the stone.
4. **Active/press** — swap the bevel colors and nudge `translateY(2px)`.

**Glows on clipped shapes** (pennants, wax-seal octagon): use `filter: drop-shadow(...)`,
because `box-shadow` is clipped away by `clip-path`.

Pixel unit: `--px: 4px` is the standard chunky border width.

---

## Sprite & art conventions

- **All art is original.** No copyrighted assets. "Stardew-like" refers to the cozy
  top-down village *feel* only.
- **Portraits & emblems** are drawn as inline SVG `<rect>` pixels on a small grid
  (typically 16-wide) with `shape-rendering="crispEdges"`, scaled up via `width/height`.
  See `scripts/gen-portraits.mjs`, which turns an ASCII grid + palette into an SVG. Run
  `npm run gen:portraits` to regenerate `arthur.svg`, `vacant-silhouette.svg`, and the
  `cursor-sword.svg`.
- **Village sprites** are drawn with canvas commands / code-generated offscreen sprite
  canvases (built once, blitted each frame), with `imageSmoothingEnabled = false`.
- **Uploaded portraits** live in `src/assets/portraits/` and are served by the persistence
  plugin at `/assets/portraits/<file>`; they render with `image-rendering: pixelated`.
- **Cursor:** a pixel sword (`src/assets/ui/cursor-sword.svg`), applied via
  `body[data-cursor='sword']`, hotspot at the blade tip; falls back to the default cursor.

---

## Component conventions

Shared pixel-UI kit in `src/components`:

- `PixelPanel` (`.pixel-panel`, `--raised`, `--flush`) — carved stone container.
- `PixelButton` (`.pixel-btn`, variants `--gold` / `--crimson` / `--ghost`, `--sm`,
  `--block`) — chunky button with torchlight hover.
- `PixelFrame` (`.pixel-frame`, `--vacant`) — ornate gold portrait frame with corner studs.
- `ArchHeader` (`.arch-header`) — gothic pointed-arch header bar (clip-path peak).
- `Torch` — animated pixel torch (flame flicker + rising embers).
- `Crown`, `Excalibur`, `QRune` — SVG emblems (`Crown` uses `currentColor`).
- `Portrait` — resolves image / named-monogram / vacant-silhouette automatically.
- `StatusLamp` — crown lit gold (Active) / dim grey (Inactive).
- `WaxSealDialog` — wax-seal confirm modal for destructive actions.
- `TabNav` — the left banner rail.

**CSS scoping:** global theme in `src/styles`; each page imports its own CSS file with a
page-prefixed class namespace (`.hub-*`, `.editor-*`, `.village-*`) so pages never collide.

---

## Animation

Shared keyframes in `src/styles/pixel.css`: `bob` (floating `?`), `glow-pulse`, `flicker`
(torch), `ember-rise`, `seal-press` (wax stamp), `excalibur-glow` (easter egg),
`panel-slide-in` (seat detail), `fade-in`.

**Accessibility:** `@media (prefers-reduced-motion: reduce)` collapses all animation/transition
durations globally. Interactive art carries `aria-label`s or `aria-hidden` as appropriate.
