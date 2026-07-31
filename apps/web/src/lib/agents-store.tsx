import * as React from 'react';
import type { Agent, ServerEvent, ActivityEvent } from '@camelot/shared';
import { fetchAgents } from './api';

/**
 * One shared place that holds the 12 seats and the live activity feed.
 *
 * It loads the agents once, then opens the engine's live stream
 * (`/api/events`) and keeps everything up to date by itself — so any screen
 * that reads from here (the Round Table, the Settings list) always shows the
 * latest state without re-fetching.
 */

interface AgentsState {
  agents: Agent[];
  activity: ActivityEvent[];
  loading: boolean;
  error: string | null;
  /** True while the live stream is connected. */
  live: boolean;
  /** Replace one agent in the store (e.g. right after saving an edit). */
  applyAgent: (agent: Agent) => void;
  /** Re-load everything from the engine. */
  refresh: () => Promise<void>;
}

const AgentsContext = React.createContext<AgentsState | null>(null);

const MAX_ACTIVITY = 40; // keep the feed to a readable length

export function AgentsProvider({ children }: { children: React.ReactNode }) {
  const [agents, setAgents] = React.useState<Agent[]>([]);
  const [activity, setActivity] = React.useState<ActivityEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [live, setLive] = React.useState(false);

  const applyAgent = React.useCallback((updated: Agent) => {
    setAgents((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a)),
    );
  }, []);

  const refresh = React.useCallback(async () => {
    try {
      setLoading(true);
      setAgents(await fetchAgents());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reach the engine.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load.
  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  // Live updates over Server-Sent Events.
  React.useEffect(() => {
    const source = new EventSource('/api/events');

    source.onopen = () => setLive(true);
    source.onerror = () => setLive(false); // the browser auto-reconnects

    source.onmessage = (msg) => {
      const event = JSON.parse(msg.data) as ServerEvent;
      if (event.type === 'agent.updated') {
        applyAgent(event.agent);
      } else if (event.type === 'activity') {
        setActivity((prev) => [event.event, ...prev].slice(0, MAX_ACTIVITY));
      }
    };

    return () => source.close();
  }, [applyAgent]);

  const value: AgentsState = {
    agents,
    activity,
    loading,
    error,
    live,
    applyAgent,
    refresh,
  };

  return <AgentsContext.Provider value={value}>{children}</AgentsContext.Provider>;
}

/** Read the shared agents state from any component. */
export function useAgents(): AgentsState {
  const ctx = React.useContext(AgentsContext);
  if (!ctx) {
    throw new Error('useAgents must be used inside <AgentsProvider>.');
  }
  return ctx;
}
