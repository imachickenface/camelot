import type { Agent } from '@camelot/shared';
import { Link } from 'react-router-dom';
import { ScrollText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { CAPABILITY_META, STATUS_META } from '@/lib/agent-meta';
import { timeAgo } from '@/lib/format';

/**
 * The detail panel for whichever seat is currently selected. Shows the knight's
 * sigil, rank, live status, current quest, role, and personality.
 */
export function AgentDetail({ agent }: { agent: Agent | null }) {
  if (!agent) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
        <ScrollText className="h-8 w-8 opacity-60" />
        <p className="text-sm">Choose a seat to read about the knight who holds it.</p>
      </div>
    );
  }

  const status = STATUS_META[agent.status];
  const capability = CAPABILITY_META[agent.capability];
  const CapabilityIcon = capability.icon;

  if (agent.isVacant) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-border bg-muted/40 font-display text-muted-foreground">
            {agent.seat}
          </span>
          <div>
            <p className="font-display text-lg font-semibold">Vacant Seat</p>
            <p className="text-sm text-muted-foreground">Seat {agent.seat}</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{agent.personality}</p>
        <Button asChild variant="gold" size="sm">
          <Link to="/settings">Fill this seat</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-full font-display font-semibold text-white shadow-sm"
          style={{ backgroundColor: agent.color }}
        >
          {agent.sigil}
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-semibold">{agent.name}</p>
          <p className="truncate text-sm text-muted-foreground">{agent.rank}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="gap-1.5">
          <span className={cn('h-2 w-2 rounded-full', status.dot)} />
          {status.label}
        </Badge>
        <Badge variant="outline" className="gap-1.5">
          <CapabilityIcon className="h-3 w-3" />
          {capability.label}
        </Badge>
      </div>

      <div className="rounded-md border border-border bg-secondary/40 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Current quest
        </p>
        <p className="mt-1 text-sm">
          {agent.currentTask ?? 'Resting, ready for the next quest.'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Last active {timeAgo(agent.lastActiveAt)}
        </p>
      </div>

      <Separator />

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Personality
        </p>
        <p className="mt-1 text-sm leading-relaxed">{agent.personality}</p>
      </div>

      <Button asChild variant="outline" size="sm">
        <Link to="/settings">Edit this knight</Link>
      </Button>
    </div>
  );
}
