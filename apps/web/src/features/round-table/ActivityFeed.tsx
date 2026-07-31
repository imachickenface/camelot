import type { ActivityEvent, Agent } from '@camelot/shared';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { STATUS_META } from '@/lib/agent-meta';
import { timeAgo } from '@/lib/format';

/**
 * The live chronicle: a running list of what the knights have been doing,
 * newest first. New lines arrive on their own via the engine's event stream.
 */
interface ActivityFeedProps {
  activity: ActivityEvent[];
  agents: Agent[];
}

export function ActivityFeed({ activity, agents }: ActivityFeedProps) {
  const colorFor = (agentId: string) =>
    agents.find((a) => a.id === agentId)?.color ?? '#8a7f6d';

  if (activity.length === 0) {
    return (
      <p className="px-1 py-6 text-center text-sm text-muted-foreground">
        The hall is quiet. Activity will appear here as the knights set to work.
      </p>
    );
  }

  return (
    <ScrollArea className="h-[320px] pr-3">
      <ul className="space-y-3">
        {activity.map((event) => (
          <li key={event.id} className="flex items-start gap-3">
            <span
              className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: colorFor(event.agentId) }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug">{event.message}</p>
              <p className="text-xs text-muted-foreground">
                <span className={cn('font-medium')}>
                  {STATUS_META[event.status].label}
                </span>{' '}
                · {timeAgo(event.at)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
}
