import { randomUUID } from 'node:crypto';
import type { ActivityEvent, Agent, AgentStatus } from '@camelot/shared';
import type { CamelotModule, ModuleContext } from '../../core/registry';
import { getAgents, setAgentActivity } from '../../storage/jsonStore';

/**
 * The simulation module — Camelot's first and (for now) only tool.
 *
 * It makes the Round Table feel alive: on a gentle timer it picks an active
 * knight, nudges their status along a believable path (rest → counsel → quest
 * → complete), invents a fitting "quest" line, and announces each change on the
 * event bus so the website updates by itself.
 *
 * It is also the worked example for adding real tools later. A real video tool
 * would have this same shape — a `start` that does work and broadcasts events —
 * but would call an outside service instead of inventing quests. See
 * docs/ADDING_A_MODULE.md.
 */

/** Plausible quests per role, so the activity reads naturally. */
const QUESTS_BY_CAPABILITY: Record<string, string[]> = {
  orchestrator: [
    'Reviewing the day’s petitions',
    'Dividing quests among the knights',
    'Weighing which idea to pursue first',
    'Holding council on the next campaign',
  ],
  video: [
    'Sketching the opening scene',
    'Illuminating a storyboard',
    'Rendering a moving tapestry',
    'Choosing colors for the next vision',
  ],
  audio: [
    'Composing a fanfare',
    'Tuning the lute for narration',
    'Scoring the closing verse',
    'Recording a herald’s announcement',
  ],
  scraper: [
    'Riding out to the markets of Reddit',
    'Gathering rumors from distant forums',
    'Returning with a satchel of fresh ideas',
    'Mapping which topics stir the crowd',
  ],
  custom: ['Tending to an appointed task'],
  none: [],
};

/** The order a knight moves through while completing a quest. */
const NEXT_STATUS: Partial<Record<AgentStatus, AgentStatus>> = {
  idle: 'thinking',
  thinking: 'working',
  working: 'done',
  done: 'idle',
};

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** A short human line describing what just happened. */
function describe(agent: Agent, status: AgentStatus): string {
  switch (status) {
    case 'thinking':
      return `${agent.name} retires to counsel.`;
    case 'working':
      return `${agent.name} sets out: ${agent.currentTask}.`;
    case 'done':
      return `${agent.name} completes the quest.`;
    case 'idle':
    default:
      return `${agent.name} returns to rest.`;
  }
}

export function createSimulationModule(intervalMs = 4000): CamelotModule {
  let timer: NodeJS.Timeout | undefined;

  async function tick(ctx: ModuleContext): Promise<void> {
    // Only active knights take part; vacant seats stay quiet.
    const active = getAgents().filter((a) => !a.isVacant && a.capability !== 'none');
    if (active.length === 0) return;

    const agent = pick(active);
    const next = NEXT_STATUS[agent.status] ?? 'thinking';

    // When a knight begins working, give them a fresh quest line.
    let task = agent.currentTask;
    if (next === 'working') {
      task = pick(QUESTS_BY_CAPABILITY[agent.capability] ?? ['Tending to a task']);
    } else if (next === 'idle') {
      task = null;
    }

    const updated = await setAgentActivity(agent.id, next, task);
    if (!updated) return;

    ctx.bus.publish({ type: 'agent.updated', agent: updated });

    const event: ActivityEvent = {
      id: randomUUID(),
      agentId: updated.id,
      message: describe(updated, next),
      status: next,
      at: new Date().toISOString(),
    };
    ctx.bus.publish({ type: 'activity', event });
  }

  return {
    id: 'simulation',
    description: 'Brings the Round Table to life with simulated agent activity.',
    start(ctx) {
      ctx.app.log.info('[simulation] the Round Table stirs to life');
      timer = setInterval(() => {
        void tick(ctx);
      }, intervalMs);
    },
    stop() {
      if (timer) clearInterval(timer);
    },
  };
}
