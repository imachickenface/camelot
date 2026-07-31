# Adding a tool (module)

This is the step-by-step for plugging a new tool into the Camelot engine — the
mechanism that keeps Camelot a swiss-army-knife. It's written for a developer
(or a future AI session) and uses the existing **simulation** module as the
worked example to copy.

## The idea in one sentence

A **module** is a self-contained tool that the engine starts up; it can announce
activity (so the Round Table shows it) and/or add its own web routes.

## The contract

Defined in `apps/server/src/core/registry.ts`:

```ts
interface CamelotModule {
  id: string;            // e.g. "scraper"
  description: string;   // shown in the logs
  start(ctx: ModuleContext): void | Promise<void>;
  stop?(): void | Promise<void>;
}

interface ModuleContext {
  app: FastifyInstance;  // add your own routes here if needed
  bus: typeof eventBus;  // broadcast activity to the live feed
}
```

## Steps

### 1. Create the module folder
Copy the example as a starting point:

```
apps/server/src/modules/simulation/index.ts   ← the template
apps/server/src/modules/<your-tool>/index.ts   ← your new file
```

Export a factory that returns a `CamelotModule`:

```ts
import type { CamelotModule } from '../../core/registry';

export function createScraperModule(): CamelotModule {
  return {
    id: 'scraper',
    description: 'Fetches content ideas from the web.',
    start(ctx) {
      // do your work here; call ctx.bus.publish(...) to report activity
    },
    stop() {
      // clean up timers/connections
    },
  };
}
```

### 2. Report activity (so it shows on the table)
When your tool does something, update the relevant agent and broadcast it —
exactly as the simulation does:

```ts
import { setAgentActivity } from '../../storage/jsonStore';

const updated = await setAgentActivity('percival', 'working', 'Searching Reddit…');
if (updated) {
  ctx.bus.publish({ type: 'agent.updated', agent: updated });
  ctx.bus.publish({
    type: 'activity',
    event: {
      id: crypto.randomUUID(),
      agentId: updated.id,
      message: 'Percival rides out to the markets of Reddit.',
      status: 'working',
      at: new Date().toISOString(),
    },
  });
}
```

The website updates on its own — no front-end change needed for activity.

### 3. (Optional) Add your own routes
If the tool needs its own endpoints, register them in `start` using `ctx.app`:

```ts
start(ctx) {
  ctx.app.post('/api/scraper/run', async () => {
    // kick off a scrape, return a result
    return { started: true };
  });
}
```

### 4. Register the module
In `apps/server/src/index.ts`, add it next to the simulation:

```ts
import { createScraperModule } from './modules/scraper';
// ...
registry.register(createScraperModule());
```

That's the only change to the core. Restart the engine and the module runs.

### 5. Keep secrets out of the code
API keys go in **environment variables**, read via `process.env`. Add an
example to a `.env.example` file and document it; never commit real keys.

```ts
const apiKey = process.env.SCRAPER_API_KEY;
```

### 6. (If it's a brand-new role) wire up the front-end labels
Most tools attach to an existing agent (e.g. Percival → scraper), so no UI
change is needed. If you introduce a *new kind of role*, add it to:

- `AgentCapability` in `packages/shared/src/types.ts`,
- `CAPABILITY_META` and `CAPABILITY_OPTIONS` in
  `apps/web/src/lib/agent-meta.ts` (label + icon).

### 7. Update the docs
Per the rule in `CLAUDE.md`, update `docs/STATUS.md` and `docs/CHANGELOG.md`
when you're done.

## Checklist

- [ ] New `modules/<tool>/index.ts` exporting a `create…Module()` factory
- [ ] Reports activity via `ctx.bus.publish(...)` (and `setAgentActivity`)
- [ ] Any secrets read from `process.env`, documented in `.env.example`
- [ ] Registered in `apps/server/src/index.ts`
- [ ] New role types added to shared + web meta (only if introducing a new role)
- [ ] `STATUS.md` and `CHANGELOG.md` updated
