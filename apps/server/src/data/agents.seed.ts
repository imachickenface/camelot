import type { Agent } from '@camelot/shared';

/**
 * The 12 starting seats of the Round Table.
 *
 * Four are named knights themed to the planned tools; the remaining eight are
 * vacant and ready for the owner to fill in (via the Settings screen).
 *
 * These are only the *defaults*. The first time the engine runs it copies this
 * list into a saved file (data/agents.json). After that, the saved file wins —
 * so edits made in the app are never overwritten by this seed.
 */

/** Helper to keep each seat definition readable. */
function vacantSeat(seat: number): Agent {
  return {
    id: `seat-${seat}`,
    seat,
    isVacant: true,
    name: 'Vacant Seat',
    rank: 'Awaiting a worthy knight',
    personality:
      'This seat stands empty. Open Settings to call a new knight to the table.',
    capability: 'none',
    sigil: '—',
    color: '#8a7f6d',
    status: 'offline',
    currentTask: null,
    lastActiveAt: null,
  };
}

export const AGENT_SEED: Agent[] = [
  {
    id: 'arthur',
    seat: 1,
    isVacant: false,
    name: 'Arthur',
    rank: 'The Sovereign',
    personality:
      'Calm, fair, and decisive. Arthur sees the whole board, weighs every option, and hands the right quest to the right knight.',
    capability: 'orchestrator',
    sigil: 'AR',
    color: '#c9a227', // royal gold
    status: 'idle',
    currentTask: null,
    lastActiveAt: null,
  },
  {
    id: 'lancelot',
    seat: 2,
    isVacant: false,
    name: 'Lancelot',
    rank: 'The Illuminator',
    personality:
      'Bold and imaginative. Lancelot turns raw ideas into striking moving images. (Will become the video maker.)',
    capability: 'video',
    sigil: 'LA',
    color: '#7c3aed', // violet
    status: 'idle',
    currentTask: null,
    lastActiveAt: null,
  },
  {
    id: 'tristan',
    seat: 3,
    isVacant: false,
    name: 'Tristan',
    rank: 'The Bard',
    personality:
      'Expressive and melodic. Tristan gives every story its voice and score. (Will become the sound / audio maker.)',
    capability: 'audio',
    sigil: 'TR',
    color: '#0ea5e9', // sky blue
    status: 'idle',
    currentTask: null,
    lastActiveAt: null,
  },
  {
    id: 'percival',
    seat: 4,
    isVacant: false,
    name: 'Percival',
    rank: 'The Seeker',
    personality:
      'Curious and tireless. Percival roams the outer realms of the web, hunting for fresh ideas worth pursuing. (Will become the scraper / explorer.)',
    capability: 'scraper',
    sigil: 'PE',
    color: '#16a34a', // forest green
    status: 'idle',
    currentTask: null,
    lastActiveAt: null,
  },
  vacantSeat(5),
  vacantSeat(6),
  vacantSeat(7),
  vacantSeat(8),
  vacantSeat(9),
  vacantSeat(10),
  vacantSeat(11),
  vacantSeat(12),
];
