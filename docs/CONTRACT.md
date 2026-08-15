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
  runAgentTask(id, task),     // wired for seats 02-07, 12 (see CamelotContext.jsx); stub elsewhere.
                               // Seat-01 (Arthur) has no runAgentTask case — he's "the manager,"
                               // running outside this app as a scheduled Claude Code session;
                               // see docs/MANAGER-RUNBOOK.md.
  addTab(name?, contentRef?, meta?), renameTab(id,name), deleteTab(id),
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
Every seat except Arthur (`seat-01`) also carries `"engine": "cloud" | "hermes"` — which
backend `runAgentTask` calls into for that seat: cloud APIs (Anthropic/ElevenLabs/Higgsfield)
or the local Hermes Agent (`server/hermes.js`). Editable per-seat in the Agent Editor.
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

## Custom tabs (`tabs.json`)
```json
{ "id":"tab-<ts>-<n>", "name":"...", "type":"custom", "contentRef":"project-viewer"|"hermes-chat"|null,
  "meta": { "projectId":"proj-..." } | null }
```
`contentRef` opts a tab into a component mounted by `src/pages/CustomTab.jsx`'s
`CONTENT_COMPONENTS` registry; `meta` parameterizes that component (only
`project-viewer` uses it today, via `meta.projectId`). `null` renders the default
empty-hall placeholder. The "✦ New Hall" button (`TabNav.jsx`) always creates an
unparameterized tab — populated tabs are created in code via
`addTab(name, contentRef, meta)`, using a find-existing-or-create pattern (see
`editor/index.jsx`'s `handleOpenHermesHall` or `hub/ProjectsPanel.jsx`) so
repeat clicks reuse the same Hall instead of spawning duplicates.

## Projects (`src/data/projects.json`)
The manager pipeline's job record — an array of projects (id/slug/name/idea/
status/step-by-step plan/activity log/folderPath), written directly to disk by
the scheduled Claude Code session that runs the manager loop, read by the UI via
`GET /api/data/projects`. Full schema and the read/write contract in
`docs/MANAGER-RUNBOOK.md`. `GET /api/projects/:id/tree` and
`GET /api/projects/:id/file?path=` serve a read-only, path-traversal-guarded
view of one project's folder for its Hall (`src/pages/project-viewer/`).
