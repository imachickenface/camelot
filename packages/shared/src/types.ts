/**
 * Camelot — shared type definitions
 * ----------------------------------
 * These describe the shapes of data that flow between the engine (server) and
 * the website (web). Both sides import from here so they can never disagree
 * about what an "agent" or an "activity event" looks like.
 *
 * Everything here is intentionally generic. Camelot is a "swiss-army-knife"
 * platform: an agent is just a worker with a role, and a role is just a label.
 * Today the roles happen to be about content creation, but nothing in these
 * types is locked to that.
 */

/**
 * What an agent is doing right now. Stored with these plain keys; the website
 * maps each key to a medieval-flavored label (see STATUS_LABELS below).
 */
export type AgentStatus =
  | 'idle' // resting, ready for a task
  | 'thinking' // planning / deciding
  | 'working' // actively doing a task
  | 'done' // just finished a task
  | 'error' // something went wrong
  | 'offline'; // seat is empty or the agent is switched off

/** Human-friendly, on-theme labels for each status (used by the website). */
export const STATUS_LABELS: Record<AgentStatus, string> = {
  idle: 'At rest',
  thinking: 'In counsel',
  working: 'On a quest',
  done: 'Quest complete',
  error: 'Troubled',
  offline: 'Seat empty',
};

/**
 * A "capability" is the kind of work an agent is meant to do. This is the seam
 * that future tools plug into: the video tool will provide the `video`
 * capability, the audio tool `audio`, and so on. `none` marks a vacant seat.
 */
export type AgentCapability =
  | 'none' // vacant seat — no role yet
  | 'orchestrator' // leads the others and hands out tasks
  | 'video' // makes video (planned)
  | 'audio' // makes sound / audio (planned)
  | 'scraper' // explores the web for ideas (planned)
  | 'custom'; // any future role the owner invents

/** One member of the Round Table (or an empty seat awaiting one). */
export interface Agent {
  /** Stable identifier, e.g. "arthur". Never shown to the user. */
  id: string;
  /** Which of the 12 seats this agent occupies (1–12). */
  seat: number;
  /** True when the seat is empty and inviting a new knight. */
  isVacant: boolean;

  /** Display name, e.g. "Arthur". */
  name: string;
  /** Medieval rank / honorific, e.g. "The Sovereign". */
  rank: string;
  /** A short personality blurb shown in the detail panel. */
  personality: string;
  /** The kind of work this agent does. */
  capability: AgentCapability;

  /** Two-letter sigil shown on the seat when there is no avatar. */
  sigil: string;
  /** Accent color (hex) used for the agent's seat and badge. */
  color: string;

  /** Live status — updated by the engine as the agent works. */
  status: AgentStatus;
  /** A one-line description of the current quest, or null when idle. */
  currentTask: string | null;
  /** ISO timestamp of the last time this agent's status changed. */
  lastActiveAt: string | null;
}

/**
 * The editable subset of an agent. The settings screen sends one of these to
 * the engine to save a knight's details. (Live fields like `status` are owned
 * by the engine and are not edited by hand.)
 */
export interface AgentProfileUpdate {
  name?: string;
  rank?: string;
  personality?: string;
  capability?: AgentCapability;
  sigil?: string;
  color?: string;
  isVacant?: boolean;
}

/** A single entry in the live activity feed. */
export interface ActivityEvent {
  id: string;
  /** Which agent this is about. */
  agentId: string;
  /** A short, human-readable line, e.g. "Arthur assigned a new quest." */
  message: string;
  /** The agent's status at the moment of the event. */
  status: AgentStatus;
  /** ISO timestamp. */
  at: string;
}

/**
 * A unit of work. Tasks are minimal for now (the simulation invents them); the
 * real tools will flesh this out when they are added.
 */
export interface Task {
  id: string;
  agentId: string;
  title: string;
  status: AgentStatus;
  createdAt: string;
}

/** Shape of the live event stream messages (sent over Server-Sent Events). */
export type ServerEvent =
  | { type: 'agent.updated'; agent: Agent }
  | { type: 'activity'; event: ActivityEvent };
