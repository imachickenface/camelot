import type { Agent } from '@camelot/shared';
import { cn } from '@/lib/utils';
import { STATUS_META } from '@/lib/agent-meta';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * A single seat at the Round Table — a round "sigil" badge with the knight's
 * name and rank beneath it, plus a small live status dot. Busy knights get a
 * gentle pulsing ring so the eye is drawn to wherever the action is.
 */
interface AgentSeatProps {
  agent: Agent;
  selected: boolean;
  onSelect: (id: string) => void;
}

export function AgentSeat({ agent, selected, onSelect }: AgentSeatProps) {
  const status = STATUS_META[agent.status];
  const vacant = agent.isVacant;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => onSelect(agent.id)}
          className={cn(
            'group flex w-28 flex-col items-center gap-1.5 rounded-lg p-2 text-center transition-transform hover:-translate-y-0.5 focus:outline-none',
          )}
          aria-label={vacant ? `Vacant seat ${agent.seat}` : `${agent.name}, ${agent.rank}`}
        >
          <span className="relative inline-flex">
            {/* Pulsing ring while the knight is busy. */}
            {status.busy && !vacant && (
              <span
                className="absolute inset-0 rounded-full"
                style={{ backgroundColor: agent.color, opacity: 0.35 }}
              >
                <span
                  className="absolute inset-0 animate-pulse-ring rounded-full"
                  style={{ backgroundColor: agent.color }}
                />
              </span>
            )}

            {/* The sigil badge. */}
            <span
              className={cn(
                'relative flex h-14 w-14 items-center justify-center rounded-full border-2 font-display text-base font-semibold shadow-sm transition-all',
                vacant
                  ? 'border-dashed border-border bg-muted/40 text-muted-foreground'
                  : 'text-white',
                selected && 'ring-2 ring-accent ring-offset-2 ring-offset-background',
              )}
              style={
                vacant
                  ? undefined
                  : { backgroundColor: agent.color, borderColor: agent.color }
              }
            >
              {agent.sigil}
            </span>

            {/* Status dot. */}
            <span
              className={cn(
                'absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-card',
                status.dot,
              )}
            />
          </span>

          <span className="mt-0.5 max-w-full truncate text-sm font-semibold leading-tight">
            {vacant ? 'Vacant' : agent.name}
          </span>
          <span className="max-w-full truncate text-[11px] leading-tight text-muted-foreground">
            {vacant ? `Seat ${agent.seat}` : agent.rank}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent>
        {vacant ? (
          <span>Empty seat — open Settings to fill it.</span>
        ) : (
          <span>
            <span className="font-semibold">{agent.name}</span> — {status.label}
            {agent.currentTask ? `: ${agent.currentTask}` : ''}
          </span>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
