# Camelot — Integration Contract (for page builders)

This is the binding contract every page (Hub, Agent Editor, Village) builds against.
The foundation (theme, state, router, shared components, persistence server) is DONE and
RUNNING at `http://localhost:5173`. Do **not** restart the server, run `npm install`, or edit
shared files. Only create files inside your assigned page folder.

## Shared state — `useCamelot()`

```js
import { useCamelot, isOccupied } from '../../state/CamelotContext';

const {
  agents,            // Array<Agent> — 12 seats, see schema below
  tabs, settings,    // custom tabs + settings.json
  loaded, error,
  arthur,            // agents.find(id==='seat-01')
  seatedCount,       // count of occupied seats (name non-empty)
  activeCount,
  getAgent(id),      // -> Agent | null
  updateAgent(id, patch),     // merge patch, recomputes `occupied`, persists agents.json
  toggleAgentActive(id),      // flips .active, persists
  setAgentActive(id, bool),
  uploadPortrait(id, File),   // async -> stored path "/assets/portraits/xxx"; also sets agent.portrait
  runAgentTask(id, task),     // HOOK stub for future automation
  addTab(name?), renameTab(id,name), deleteTab(id),
  updateSettings(patch),
} = useCamelot();
```

`isOccupied(agent)` === agent has a non-empty `.name`. A seat is "occupied" the moment it is
named. Persistence is automatic on every mutation — the JSON files in `src/data/` are the
single source of truth, and all three pages share this one context, so an edit on one page is
LIVE on the others with no refresh.

### Agent schema (`src/data/agents.json`)
```json
{ "id":"seat-01", "seat":1, "name":"King Arthur",
  "role":"Chief of Staff — Orchestrator", "description":"...", "personality":"...",
  "portrait":"/assets/portraits/arthur.svg", "occupied":true, "active":true }
```
Seats `seat-02`..`seat-12` start vacant (all string fields `""`, occupied/active `false`).
Arthur is always `seat-01`. His `active` flag drives the Village behavior.

## Deep-link contract (React Router v6 is installed)
- To the editor, preselecting a seat: `navigate('/editor?seat=seat-03')`.
- The editor reads it via `const [sp] = useSearchParams(); const seatId = sp.get('seat') || 'seat-01'`.
- Back to the hub: `navigate('/')`. Village: `/village`.

## Shared components (import these — do not re-invent)
```js
import { PixelPanel, PixelButton, PixelFrame, ArchHeader } from '../../components/ui';
import { Crown, Excalibur, QRune } from '../../components/emblems';
import Portrait from '../../components/Portrait';        // <Portrait agent={a} size={96} framed />
import StatusLamp from '../../components/StatusLamp';     // <StatusLamp active={a.active} />
import Torch from '../../components/Torch';               // <Torch size={44} flip />
import WaxSealDialog from '../../components/WaxSealDialog';
```
- `PixelButton` variants: `variant="gold" | "crimson" | "ghost"`, `size="sm"`, `block`.
- `Portrait` handles all three cases (image / named-monogram / vacant silhouette).

## Theme — use these, never hardcode new colors
CSS variables (in `:root`): `--void-black --dungeon-stone --raised-stone --aged-gold
--pale-gold --blood-crimson --royal-purple --ghost-grey --parchment --torch-orange`
plus derived: `--stone-edge-light --stone-edge-dark --gold-dim --gold-dark --crimson-dark
--crimson-bright --purple-dark --purple-light --px (4px pixel unit) --nav-w`.

Fonts: `var(--font-title)` blackletter (headings), `var(--font-label)` Press Start 2P
(labels/buttons — keep short), `var(--font-body)` VT323 (paragraphs).

Utility classes: `.pixel-panel[.--raised .--flush]`, `.pixel-btn[--gold/--crimson/--ghost/--sm/--block]`,
`.pixel-frame[.--vacant]`, `.arch-header` (pointed arch), `.pennant` (banner notch),
`.rune-divider`, `.torch-hover`, text: `.font-title/.font-label/.font-body .t-gold/.t-pale/
.t-ghost/.t-crimson`. Shared keyframes: `bob glow-pulse flicker ember-rise seal-press
excalibur-glow panel-slide-in fade-in`. Respect `prefers-reduced-motion` (already handled globally).

Design language: chunky stepped pixel borders, NO rounded corners (except intentional wax-seal
octagon), NO modern flat/material shadows, stone + torchlight. On clipped shapes use
`filter: drop-shadow(...)` for glow (box-shadow gets clipped).

## Page wrapper
Your `index.jsx` default export renders into `<main class="app-main">`. Wrap content in
`<div className="page">…</div>` (add `page--center` to center). Import your own CSS file
(e.g. `import './hub.css'`) scoped with a page prefix so class names don't collide with the
other pages (`.hub-*`, `.editor-*`, `.village-*`).

## All art must be ORIGINAL
Draw sprites/props yourself as inline SVG or canvas. No copyrighted assets (no Stardew rips).
"Stardew-like" = the cozy top-down feel only.

## Future-proofing hooks (leave these comments where noted in the brief)
`// HOOK: agent task execution`, `// HOOK: pipeline status feed`, `// HOOK: custom tab content mounting`.
