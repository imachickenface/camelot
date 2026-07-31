import type { Agent, AgentProfileUpdate } from '@camelot/shared';

/**
 * Tiny wrapper around the engine's web API.
 *
 * All paths are relative (`/api/...`). In development Vite forwards them to the
 * engine; in Docker nginx does the same. So this code never needs to know the
 * engine's address.
 */

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Request failed (${res.status}).`);
  }
  return res.json() as Promise<T>;
}

/** Fetch all 12 seats. */
export async function fetchAgents(): Promise<Agent[]> {
  const data = await asJson<{ agents: Agent[] }>(await fetch('/api/agents'));
  return data.agents;
}

/** Save a profile edit for one agent. */
export async function saveAgent(
  id: string,
  patch: AgentProfileUpdate,
): Promise<Agent> {
  const data = await asJson<{ agent: Agent }>(
    await fetch(`/api/agents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }),
  );
  return data.agent;
}
