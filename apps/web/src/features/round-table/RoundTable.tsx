import type { Agent } from '@camelot/shared';
import { Crown } from 'lucide-react';
import { AgentSeat } from './AgentSeat';

/**
 * The Round Table itself: 12 seats placed evenly around a circle, with a
 * crowned emblem in the middle. Seats are positioned with a little trigonometry
 * so the layout stays perfectly even no matter how the agents are ordered.
 */
interface RoundTableProps {
  agents: Agent[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** How far the seats sit from the center, as a % of the table's size. */
const SEAT_RADIUS = 46;

export function RoundTable({ agents, selectedId, onSelect }: RoundTableProps) {
  const seats = [...agents].sort((a, b) => a.seat - b.seat);
  const activeCount = seats.filter((a) => !a.isVacant).length;

  return (
    <div className="mx-auto aspect-square w-full max-w-[620px]">
      <div className="relative h-full w-full">
        {/* The table surface. */}
        <div className="absolute left-1/2 top-1/2 h-[62%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-full border-[6px] border-accent/30 bg-gradient-to-b from-[hsl(222_45%_30%)] to-[hsl(222_48%_22%)] shadow-[inset_0_2px_24px_rgba(0,0,0,0.45)]">
          <div className="absolute inset-3 rounded-full border border-accent/25" />
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-primary-foreground">
            <Crown className="h-9 w-9 text-accent" />
            <p className="font-display text-lg font-semibold tracking-widest">
              CAMELOT
            </p>
            <p className="text-xs text-primary-foreground/70">
              {activeCount} of 12 seats filled
            </p>
          </div>
        </div>

        {/* The 12 seats around the rim. */}
        {seats.map((agent, index) => {
          // Start at the top (12 o'clock) and go clockwise.
          const angle = (index / seats.length) * 2 * Math.PI - Math.PI / 2;
          const left = 50 + SEAT_RADIUS * Math.cos(angle);
          const top = 50 + SEAT_RADIUS * Math.sin(angle);
          return (
            <div
              key={agent.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${left}%`, top: `${top}%` }}
            >
              <AgentSeat
                agent={agent}
                selected={selectedId === agent.id}
                onSelect={onSelect}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
