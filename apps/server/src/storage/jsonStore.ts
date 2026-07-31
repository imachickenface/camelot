import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Agent, AgentProfileUpdate } from '@camelot/shared';
import { AGENT_SEED } from '../data/agents.seed';

/**
 * The simplest possible "database": a single JSON file on disk.
 *
 * Why a file and not a real database? Zero setup for the non-technical owner —
 * nothing to install. When the app outgrows this, swap this one file for a
 * database; nothing else in the engine needs to change, because the rest of the
 * code only ever calls the functions below.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
/** Where saved agents live. Overridable so Docker can mount a volume here. */
const DATA_FILE =
  process.env.CAMELOT_DATA_FILE ?? resolve(HERE, '../../data/agents.json');

/** In-memory copy of the agents, kept in sync with the file. */
let agents: Agent[] = [];

/** Load agents from disk, seeding the file on first ever run. */
export async function loadAgents(): Promise<void> {
  try {
    const raw = await readFile(DATA_FILE, 'utf8');
    agents = JSON.parse(raw) as Agent[];
  } catch {
    // No file yet (first run) — start from the seed and save it.
    agents = structuredClone(AGENT_SEED);
    await persist();
  }
}

/** Return all agents, ordered by seat. */
export function getAgents(): Agent[] {
  return [...agents].sort((a, b) => a.seat - b.seat);
}

/** Find one agent by id, or undefined. */
export function getAgent(id: string): Agent | undefined {
  return agents.find((a) => a.id === id);
}

/**
 * Save a profile edit from the Settings screen. Only the owner-editable fields
 * are allowed through; live fields (status, currentTask) are left untouched.
 * Returns the updated agent, or undefined if the id is unknown.
 */
export async function updateAgentProfile(
  id: string,
  patch: AgentProfileUpdate,
): Promise<Agent | undefined> {
  const agent = agents.find((a) => a.id === id);
  if (!agent) return undefined;

  if (patch.name !== undefined) agent.name = patch.name;
  if (patch.rank !== undefined) agent.rank = patch.rank;
  if (patch.personality !== undefined) agent.personality = patch.personality;
  if (patch.capability !== undefined) agent.capability = patch.capability;
  if (patch.sigil !== undefined) agent.sigil = patch.sigil;
  if (patch.color !== undefined) agent.color = patch.color;

  if (patch.isVacant !== undefined) {
    agent.isVacant = patch.isVacant;
    // A freshly emptied seat goes quiet; a freshly filled one rests, ready.
    agent.status = patch.isVacant ? 'offline' : 'idle';
    agent.currentTask = null;
  }

  await persist();
  return agent;
}

/**
 * Update an agent's live state (status / current task). Used by the engine
 * (e.g. the simulation), not by the settings screen. Returns the updated agent.
 */
export async function setAgentActivity(
  id: string,
  status: Agent['status'],
  currentTask: string | null,
): Promise<Agent | undefined> {
  const agent = agents.find((a) => a.id === id);
  if (!agent) return undefined;
  agent.status = status;
  agent.currentTask = currentTask;
  agent.lastActiveAt = new Date().toISOString();
  await persist();
  return agent;
}

/** Write the current agents list to disk, creating the folder if needed. */
async function persist(): Promise<void> {
  await mkdir(dirname(DATA_FILE), { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(agents, null, 2), 'utf8');
}
