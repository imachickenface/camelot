import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';

/**
 * CamelotContext — the single shared state for the whole app.
 *
 * SOURCE OF TRUTH = the JSON files in src/data/*.json, read/written through the
 * Vite persistence server (see server/camelot-data-plugin.js). This provider loads
 * them once on boot and writes them back on every mutation, so the Hub, Agent Editor
 * and Village all stay live-in-sync within the single-page app (no refresh needed).
 *
 * HOOK: agent task execution — future automation can call runAgentTask(id, task)
 * from here; the stub below is where a pipeline runner would be wired in.
 */

const CamelotContext = createContext(null);

export function useCamelot() {
  const ctx = useContext(CamelotContext);
  if (!ctx) throw new Error('useCamelot must be used inside <CamelotProvider>');
  return ctx;
}

async function getJSON(name) {
  const res = await fetch(`/api/data/${name}`);
  if (!res.ok) throw new Error(`failed to load ${name}.json`);
  return res.json();
}

async function putJSON(name, data) {
  try {
    await fetch(`/api/data/${name}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      // pretty-print so the files stay human- and Claude-readable on disk
      body: JSON.stringify(data, null, 2),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[camelot] failed to persist ${name}.json`, err);
  }
}

/** A seat counts as "occupied" once it has a non-empty name. */
export function isOccupied(agent) {
  return Boolean(agent && agent.name && agent.name.trim());
}

export function CamelotProvider({ children }) {
  const [agents, setAgents] = useState([]);
  const [tabs, setTabs] = useState([]);
  const [settings, setSettings] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  // Load all state files once on boot (files win).
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [a, t, s] = await Promise.all([getJSON('agents'), getJSON('tabs'), getJSON('settings')]);
        if (!alive) return;
        setAgents(Array.isArray(a.agents) ? a.agents : []);
        setTabs(Array.isArray(t.tabs) ? t.tabs : []);
        setSettings(s && typeof s === 'object' ? s : {});
        setLoaded(true);
      } catch (err) {
        if (alive) setError(err.message || 'failed to load state');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // ---- Agent mutations (functional updates + persist) ----
  const mutateAgents = useCallback((updater) => {
    setAgents((prev) => {
      const next = updater(prev);
      putJSON('agents', { agents: next });
      return next;
    });
  }, []);

  /** Patch one agent by id. Recomputes `occupied` from the resulting name. */
  const updateAgent = useCallback(
    (id, patch) => {
      mutateAgents((prev) =>
        prev.map((a) => {
          if (a.id !== id) return a;
          const merged = { ...a, ...patch };
          merged.occupied = isOccupied(merged);
          return merged;
        }),
      );
    },
    [mutateAgents],
  );

  const toggleAgentActive = useCallback(
    (id) => {
      mutateAgents((prev) => prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a)));
    },
    [mutateAgents],
  );

  const setAgentActive = useCallback(
    (id, active) => {
      mutateAgents((prev) => prev.map((a) => (a.id === id ? { ...a, active: Boolean(active) } : a)));
    },
    [mutateAgents],
  );

  /**
   * Upload a portrait File for a seat. Reads it as a base64 data URL, POSTs it to
   * the persistence server which writes it into src/assets/portraits/, then stores
   * the returned path on the agent. Returns the stored path.
   */
  const uploadPortrait = useCallback(
    async (id, file) => {
      const dataUrl = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = reject;
        fr.readAsDataURL(file);
      });
      const ext = (file.name.split('.').pop() || 'png').toLowerCase();
      const filename = `${id}-${Date.now()}.${ext}`;
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, dataUrl }),
      });
      if (!res.ok) throw new Error('portrait upload failed');
      const { path } = await res.json();
      updateAgent(id, { portrait: path });
      return path;
    },
    [updateAgent],
  );

  // HOOK: agent task execution — a future pipeline runner plugs in here.
  // Arthur (seat-01), Merlin (seat-12), Percival (seat-02), Miku (seat-03),
  // Teto (seat-04), The Mighty Crab (seat-05), Sir Scout (seat-06), and Hagrid
  // (seat-07) are wired for real. Every other seat is still a stub until its
  // own pipeline is built.
  const runAgentTask = useCallback(async (id, task) => {
    if (id === 'seat-01') {
      // `task` is an optional idea override; empty lets Sir Scout pick. The
      // response may carry `ok: false` with a partial `steps` list if a stage
      // failed partway — that's still a real result to render, not an error
      // to throw away, so only a true network/HTTP failure throws here.
      const res = await fetch('/api/arthur/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task ? { idea: task } : {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'pipeline run failed');
      return data;
    }
    if (id === 'seat-12') {
      const res = await fetch('/api/merlin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: task }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'generation failed');
      return data;
    }
    if (id === 'seat-02') {
      const res = await fetch('/api/percival/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: task }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'fact-check failed');
      return data;
    }
    if (id === 'seat-03') {
      // `task` is a JSON-encoded { mode: 'voice' | 'music', text } payload —
      // the Editor's Miku panel builds this, since one seat drives two modes.
      const { mode, text } = JSON.parse(task);
      const res = await fetch('/api/miku/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, text }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'generation failed');
      return data;
    }
    if (id === 'seat-04') {
      const res = await fetch('/api/teto/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: task }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'generation failed');
      return data;
    }
    if (id === 'seat-05') {
      // `task` is unused — Crab pulls the pipeline's latest assets itself.
      const res = await fetch('/api/crab/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'QA run failed');
      return data;
    }
    if (id === 'seat-07') {
      const res = await fetch('/api/hagrid/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: task }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'draft failed');
      return data;
    }
    if (id === 'seat-06') {
      // `task` is an optional comma-separated subreddit override; empty uses
      // pipeline.json's last-configured list (or reddit-scout.js's defaults).
      const subreddits = String(task || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch('/api/scout/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subreddits.length ? { subreddits } : {}),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'scout run failed');
      return data;
    }
    // eslint-disable-next-line no-console
    console.info('[camelot] runAgentTask stub', { id, task });
    return { ok: true, note: 'automation not yet wired' };
  }, []);

  // ---- Live pipeline conversations (ephemeral — NOT persisted to JSON) ----
  // HOOK: pipeline status feed — when 2+ agents are talking in a pipeline, the
  // runner calls startConversation([...seatIds], [lines]) and the Village makes
  // their pixel villagers walk together and trade speech bubbles. Ending the
  // conversation (or setting a participant inactive) sends them back to wander.
  const [conversations, setConversations] = useState([]);
  const convoIdRef = useRef(0);

  const startConversation = useCallback((participants, lines = []) => {
    const id = `convo-${Date.now()}-${convoIdRef.current++}`;
    setConversations((prev) => [
      ...prev,
      { id, participants: Array.isArray(participants) ? participants : [], lines },
    ]);
    return id;
  }, []);

  const endConversation = useCallback((id) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const clearConversations = useCallback(() => setConversations([]), []);

  // ---- Live agent activity (ephemeral — NOT persisted to JSON) ----
  // HOOK: live session monitoring — a poller (wired where GET /api/activity
  // lands) pushes { [seatId]: { activity, lastTool, sessionId, ageMs } }
  // snapshots here. `activity` is 'library' | 'forge' | 'arena' | 'idle';
  // the Village walks each knight to the matching building, the same way it
  // animates `conversations`. Empty by default, so everything is a no-op
  // until the poller is wired.
  const [activities, setActivities] = useState({});

  const setAgentActivity = useCallback((id, activity) => {
    setActivities((prev) => {
      if (activity == null) {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: activity };
    });
  }, []);

  const setAllActivities = useCallback((map) => {
    setActivities(map && typeof map === 'object' ? map : {});
  }, []);

  const clearActivities = useCallback(() => setActivities({}), []);

  // Keep a live ref to the roster so the activity poller can read the current
  // seats without re-subscribing (and restarting its timer) on every mutation.
  const agentsRef = useRef(agents);
  agentsRef.current = agents;

  // ---- Poll the live-session activity feed and map it onto seated knights ----
  // GET /api/activity returns the user's currently-running Claude Code sessions
  // (server/activity-watcher.js). We assign them to the seated knights in seat
  // order, most-recently-active session first — so the busiest session shows up
  // as the first-seated knight, the next session as the following knight, etc.
  // Any failure is swallowed: the Village just keeps everyone wandering.
  useEffect(() => {
    let alive = true;
    let timer = null;
    async function poll() {
      try {
        const res = await fetch('/api/activity');
        if (res.ok) {
          const data = await res.json();
          const sessions = Array.isArray(data.sessions) ? data.sessions : [];
          const seated = agentsRef.current.filter(isOccupied).sort((a, b) => a.seat - b.seat);
          const next = {};
          sessions.forEach((s, i) => {
            const knight = seated[i];
            if (knight) {
              next[knight.id] = {
                activity: s.activity,
                lastTool: s.lastTool,
                sessionId: s.sessionId,
                ageMs: s.ageMs,
              };
            }
          });
          if (alive) setActivities(next);
        }
      } catch {
        // endpoint/network hiccup — keep the last snapshot, retry next tick
      }
      if (alive) timer = setTimeout(poll, 2000);
    }
    poll();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  // ---- Tab mutations ----
  const mutateTabs = useCallback((updater) => {
    setTabs((prev) => {
      const next = updater(prev);
      putJSON('tabs', { tabs: next });
      return next;
    });
  }, []);

  const idRef = useRef(0);
  const addTab = useCallback(
    (name = 'New Hall') => {
      // unique id even if two are added within the same millisecond
      const id = `tab-${Date.now()}-${idRef.current++}`;
      // future-proofing: each custom tab carries id/name/type/contentRef
      const entry = { id, name, type: 'custom', contentRef: null };
      mutateTabs((prev) => [...prev, entry]);
      return id;
    },
    [mutateTabs],
  );

  const renameTab = useCallback(
    (id, name) => {
      mutateTabs((prev) => prev.map((t) => (t.id === id ? { ...t, name } : t)));
    },
    [mutateTabs],
  );

  const deleteTab = useCallback(
    (id) => {
      mutateTabs((prev) => prev.filter((t) => t.id !== id));
    },
    [mutateTabs],
  );

  // ---- Settings ----
  const updateSettings = useCallback((patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      putJSON('settings', next);
      return next;
    });
  }, []);

  // ---- Derived ----
  const arthur = agents.find((a) => a.id === 'seat-01') || null;
  const seatedCount = agents.filter(isOccupied).length;
  const activeCount = agents.filter((a) => a.active).length;
  const getAgent = useCallback((id) => agents.find((a) => a.id === id) || null, [agents]);

  const value = {
    // state
    agents,
    tabs,
    settings,
    conversations,
    activities,
    loaded,
    error,
    // derived
    arthur,
    seatedCount,
    activeCount,
    getAgent,
    // agent ops
    updateAgent,
    toggleAgentActive,
    setAgentActive,
    uploadPortrait,
    runAgentTask,
    // pipeline conversation ops (Village animates these)
    startConversation,
    endConversation,
    clearConversations,
    // live-activity ops (Village walks knights to buildings)
    setAgentActivity,
    setAllActivities,
    clearActivities,
    // tab ops
    addTab,
    renameTab,
    deleteTab,
    // settings ops
    updateSettings,
  };

  return <CamelotContext.Provider value={value}>{children}</CamelotContext.Provider>;
}
