# Camelot

Camelot is a **content-creation engine** built as a modular, swiss-army-knife
platform. Its home page is a medieval **Round Table** where up to 12 "agents"
(helpers) each take a seat, and you can watch what every one of them is doing.

Today the table runs on *simulated* activity so you can see how it all looks and
works. Real tools — a video maker, a sound maker, and a web "explorer" that
hunts for content ideas — are designed to plug in later, one at a time.

> New here? Start with **[`CLAUDE.md`](CLAUDE.md)** for a quick orientation, then
> **[`docs/STATUS.md`](docs/STATUS.md)** to see exactly what's done and what's next.

---

## Running it

> **The app you use is Docker, at http://localhost:8080. That is *the* Camelot —
> the single source of truth.** There's also a "developer mode" on a different
> address (`http://localhost:5173`), but it runs the **same code** — it is *not*
> a second, separate project. If the two ever look different, it just means
> Docker is showing an older build and needs rebuilding (see below).

### The normal way — Docker (this is the one you open)

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/). One
command:

```bash
docker compose up -d
```

Then open **http://localhost:8080**. That's it — nothing else to install.
(`-d` runs it quietly in the background.)

- **Stop it:** `docker compose down`
- **See what's running:** `docker compose ps`

**After the code changes, rebuild so :8080 picks them up:**

```bash
docker compose up -d --build
```

Without `--build`, Docker keeps serving the *previous* version — which is exactly
how :8080 once fell behind the live code. Your customizations (renamed knights,
filled seats, …) are kept in a Docker "volume" and survive rebuilds and restarts.

### Developer mode — Node (optional, only while editing code)

Requires [Node.js 20+](https://nodejs.org/).

```bash
npm install
npm run dev
```

This serves the **same app** at **http://localhost:5173** and reloads instantly
as the code changes — handy while building. It runs the engine *and* the website
together, so it has the same sample data. When you're happy with a change here,
rebuild Docker (above) so the real app on :8080 reflects it.

---

## What you'll see

- **The Round Table** (home): 12 seats arranged in a circle. Four are filled by
  named knights; eight are empty and ready to fill. The four knights change
  status and pick up "quests" on their own, and the right-hand panel shows a
  live chronicle plus details on whichever seat you click.
- **Agents & Settings**: a click-to-edit screen where you can rename a knight,
  change their personality and role, recolor them, or empty/fill a seat. No code
  required — changes save automatically and show up on the table right away.

## The four starting knights (all placeholders, all editable)

| Seat | Name | Rank | Will become… |
|------|------|------|--------------|
| 1 | Arthur | The Sovereign | The leader that hands out tasks |
| 2 | Lancelot | The Illuminator | The video maker |
| 3 | Tristan | The Bard | The sound / audio maker |
| 4 | Percival | The Seeker | The web scraper / explorer |

---

## Project layout (where things live)

```
Camelot/
├─ apps/
│  ├─ server/   the engine (Node) — serves agents, saves edits, broadcasts activity
│  └─ web/      the website (React) — the Round Table and Settings screens
├─ packages/
│  └─ shared/   type definitions shared by both sides
└─ docs/        all project documentation (read these!)
```

See **[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)** for the full picture and
**[`docs/ADDING_A_MODULE.md`](docs/ADDING_A_MODULE.md)** to learn how new tools
plug in.
