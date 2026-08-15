# Camelot ⚔️👑

**Camelot** is a local web dashboard that will eventually fully automate a faceless
content & clipping pipeline (Reddit scouting → scriptwriting → video/clip production →
lead emails). It is themed entirely around King Arthur and the Knights of the Round Table,
rendered in a **dark gothic pixel-art** aesthetic.

> This first build is the **foundation + UI shell** — the Round Table Hub, the Agent
> Editor, the Village overworld, and a persistent tab system. The automation agents are
> **not** wired in yet; the app is structured so they can be plugged in later without
> restructuring (see **Future automation hooks** below).

---

## Requirements

- **Node.js 18+** and npm. (This project was scaffolded with Node 24 LTS.)
- A modern browser.

> **No Node installed?** A self-contained copy can live under `~/.local/node` without
> touching system directories. If `node`/`npm` aren't on your `PATH`, prefix commands with
> it, e.g. `PATH="$HOME/.local/node/bin:$PATH" npm run dev`.

## Install & run

```bash
cd camelot
npm install
npm run dev
```

Then open **http://localhost:5173**. That single command runs everything — the React app
**and** the tiny local persistence server (it's a Vite middleware plugin, not a separate
process).

Other scripts:

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server (app + persistence API) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build (persistence API included) |
| `npm run gen:portraits` | Regenerate the original pixel-art portraits & cursor |

---

## Folder layout

```
camelot/
├── README.md              # this file
├── CHANGELOG.md           # every change, dated
├── package.json
├── vite.config.js         # wires in the persistence plugin
├── index.html
├── /server
│   └── camelot-data-plugin.js   # the local persistence server (Vite middleware)
├── /scripts
│   └── gen-portraits.mjs   # generates the original pixel portraits + cursor
├── /docs
│   ├── DESIGN.md           # palette, fonts, sprite & component conventions
│   └── CONTRACT.md         # the integration contract the pages build against
└── /src
    ├── main.jsx            # app entry
    ├── App.jsx             # shell + router
    ├── App.css
    ├── /state
    │   └── CamelotContext.jsx   # single shared state; reads/writes the JSON files
    ├── /components         # shared pixel-UI kit (PixelPanel/Button/Frame, Torch,
    │                       #   emblems, Portrait, StatusLamp, WaxSealDialog, TabNav)
    ├── /pages
    │   ├── /hub            # ★ The Round Table Hub (primary page)
    │   ├── /editor         # The Agent Editor (scribe's chamber)
    │   ├── /village        # The Village (canvas overworld)
    │   └── CustomTab.jsx   # generic page for user-created tabs
    ├── /styles             # theme.css, global.css, pixel.css, components.css
    ├── /data               # ⭐ SOURCE OF TRUTH — agents.json, tabs.json, settings.json
    └── /assets
        ├── /portraits      # arthur.svg, vacant-silhouette.svg, uploaded images
        ├── /sprites
        └── /ui             # cursor-sword.svg
```

---

## Where state lives (important)

**The JSON files in `src/data/` are the single source of truth.** The app reads them on
load and writes them back on every change. `localStorage` is **not** used as the source of
truth — the files win. This means a future Claude Code session (or you) can open the folder,
read/modify these files directly, and the app will reflect it on next load.

- `src/data/agents.json` — the 12 Round Table seats (see schema below).
- `src/data/tabs.json` — user-created custom tabs.
- `src/data/settings.json` — theme/behavior flags.

Persistence is served by `server/camelot-data-plugin.js`:

| Route | Purpose |
| --- | --- |
| `GET /api/data/:name` | read `agents` / `tabs` / `settings` |
| `PUT /api/data/:name` | write it back (validated JSON, pretty-printed) |
| `POST /api/upload` | save an uploaded portrait into `src/assets/portraits/` |
| `GET /assets/portraits/:file` | serve a portrait from disk |

### Agent schema

```json
{
  "id": "seat-01",
  "seat": 1,
  "name": "King Arthur",
  "role": "Chief of Staff — Orchestrator",
  "description": "Routes all tasks, decides which knights are summoned…",
  "personality": "Calm, decisive, delegates fast…",
  "portrait": "/assets/portraits/arthur.svg",
  "occupied": true,
  "active": true
}
```

A seat is considered **occupied** the moment it has a non-empty `name` (recomputed on
save). Arthur is always `seat-01`, and his `active` flag drives his behavior in the Village.

### Add a new agent (a "knight") manually via JSON

You normally do this in the **Agent Editor** UI, but you can also edit the file directly:

1. Open `src/data/agents.json` and pick a vacant seat (e.g. `seat-05`).
2. Fill in `name`, `role`, `description`, `personality`.
3. (Optional) Drop an image into `src/assets/portraits/` and set `portrait` to
   `"/assets/portraits/your-file.png"`. Leave it `""` to show a gold monogram tile.
4. Set `"occupied": true` (and `"active": true/false` as you like).
5. Reload the app — the seat is now filled at the Round Table and its cottage in the
   Village is occupied.

---

## Architecture overview

- **React + Vite** single-page app. Client-side routing (React Router) powers the tabs.
- **One shared state** (`CamelotContext`) loads the JSON files once and persists on every
  mutation, so the Hub, Agent Editor, and Village stay **live in sync** with no refresh.
- **Persistence** is a small Vite middleware plugin — no separate server to run.
- **Pixel-UI kit** in `src/components` + `src/styles` gives every page the same dark
  gothic look (chunky stone panels, torchlight glows, blackletter + pixel fonts).

### The three main tabs
- **The Round Table** — a top-down round stone table with 12 seats (Arthur + 11 vacant);
  click a seat for its detail panel; vacant seats deep-link into the Agent Editor.
- **Agent Editor** — a scribe's chamber to edit every seat (image, name, role,
  description, personality, active status); saves reflect instantly in the Hub & Village.
- **The Village** — a dusk pixel village where each seat has a cottage. When Arthur is
  Active his chibi sprite wanders; when Inactive he sleeps (💤 rising from his roof).

### Custom tabs
A `✦ New Hall` banner adds a new tab. Custom tabs are renamable inline (double-click or the
✎ icon), deletable (behind a wax-seal confirm), and persist in `tabs.json`. Each entry has
`{ id, name, type, contentRef }` — `contentRef` is reserved so real content can be mounted
into a custom tab later without refactoring.

---

## Design note: 12 houses, not 11

The brief mentioned 11 vacant houses. We render **12 houses** (Arthur's + 11 vacant) so the
village is a perfect **1:1 mirror of the 12 Round Table seats**. This was a deliberate
choice and is easy to change — the village derives its houses from the `agents` array, so
adjusting the seat count in `agents.json` (and `settings.seatCount`) changes both.

---

## Future automation hooks

Clearly-commented extension points are left where automation will plug in later:

- `// HOOK: agent task execution` — in the seat detail panel (Hub) and near the Editor form,
  and a `runAgentTask(id, task)` stub in `CamelotContext`.
- `// HOOK: pipeline status feed` — in the Hub council strip and the persistence plugin.
- `// HOOK: custom tab content mounting` — in the router + `CustomTab` page.

---

## Troubleshooting

- **Blank page / stale state?** State is loaded from `src/data/*.json`. Make sure the dev
  server is running (the app fetches `/api/data/...` from it).
- **Fonts look wrong offline?** Fonts load from Google Fonts; offline they fall back to
  system monospace/serif. The layout still works.
- **`node: command not found`** — see the local-Node note under **Requirements**.
