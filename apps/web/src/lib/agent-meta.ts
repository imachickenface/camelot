import {
  CircleDashed,
  Compass,
  Crown,
  Film,
  Music,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import type { AgentCapability, AgentStatus } from '@camelot/shared';

/**
 * Display helpers for the website: how to label and color each status and role.
 * Keeping these in one place means the look stays consistent everywhere.
 */

interface StatusMeta {
  label: string;
  /** Tailwind classes for the small status dot. */
  dot: string;
  /** Whether to show the "pulsing" ring (i.e. the agent is busy). */
  busy: boolean;
}

export const STATUS_META: Record<AgentStatus, StatusMeta> = {
  idle: { label: 'At rest', dot: 'bg-emerald-500', busy: false },
  thinking: { label: 'In counsel', dot: 'bg-amber-500', busy: true },
  working: { label: 'On a quest', dot: 'bg-sky-500', busy: true },
  done: { label: 'Quest complete', dot: 'bg-violet-500', busy: false },
  error: { label: 'Troubled', dot: 'bg-red-500', busy: false },
  offline: { label: 'Seat empty', dot: 'bg-muted-foreground/50', busy: false },
};

interface CapabilityMeta {
  label: string;
  icon: LucideIcon;
  /** A short note on what this role does. */
  blurb: string;
}

export const CAPABILITY_META: Record<AgentCapability, CapabilityMeta> = {
  orchestrator: {
    label: 'Sovereign · leads the table',
    icon: Crown,
    blurb: 'Leads the others and hands out the quests.',
  },
  video: {
    label: 'Illuminator · video',
    icon: Film,
    blurb: 'Turns ideas into moving images. (Coming soon.)',
  },
  audio: {
    label: 'Bard · sound & audio',
    icon: Music,
    blurb: 'Gives stories a voice and a score. (Coming soon.)',
  },
  scraper: {
    label: 'Seeker · explores the web',
    icon: Compass,
    blurb: 'Roams the web for fresh ideas. (Coming soon.)',
  },
  custom: {
    label: 'Custom role',
    icon: Sparkles,
    blurb: 'A role of the owner’s own design.',
  },
  none: {
    label: 'No role yet',
    icon: CircleDashed,
    blurb: 'This seat is waiting to be filled.',
  },
};

/** Friendly list of capabilities for the Settings dropdown. */
export const CAPABILITY_OPTIONS: { value: AgentCapability; label: string }[] = [
  { value: 'orchestrator', label: 'Leader (hands out tasks)' },
  { value: 'video', label: 'Video maker' },
  { value: 'audio', label: 'Sound / audio maker' },
  { value: 'scraper', label: 'Scraper / explorer' },
  { value: 'custom', label: 'Custom role' },
  { value: 'none', label: 'No role (vacant)' },
];
