import * as React from 'react';
import type { Agent } from '@camelot/shared';
import { Pencil } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CAPABILITY_META } from '@/lib/agent-meta';
import { useAgents } from '@/lib/agents-store';
import { AgentEditDialog } from './AgentEditDialog';

/**
 * The settings screen: every one of the 12 seats listed as a card, each with an
 * "Edit" button that opens the click-to-edit form.
 */
export function AgentSettings() {
  const { agents } = useAgents();
  const [editing, setEditing] = React.useState<Agent | null>(null);
  const [open, setOpen] = React.useState(false);

  function edit(agent: Agent) {
    setEditing(agent);
    setOpen(true);
  }

  const seats = [...agents].sort((a, b) => a.seat - b.seat);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
        {seats.map((agent) => {
          const capability = CAPABILITY_META[agent.capability];
          const CapabilityIcon = capability.icon;
          return (
            <Card key={agent.id} className={cn(agent.isVacant && 'border-dashed')}>
              <CardContent className="flex items-start gap-3 p-4">
                <span
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold',
                    agent.isVacant
                      ? 'border-2 border-dashed border-border bg-muted/40 text-muted-foreground'
                      : 'text-white',
                  )}
                  style={
                    agent.isVacant ? undefined : { backgroundColor: agent.color }
                  }
                >
                  {agent.isVacant ? agent.seat : agent.sigil}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-semibold">
                      {agent.isVacant ? `Seat ${agent.seat}` : agent.name}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 px-2"
                      onClick={() => edit(agent)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {agent.isVacant ? 'Vacant' : agent.rank}
                  </p>
                  <Badge variant="outline" className="mt-2 gap-1.5">
                    <CapabilityIcon className="h-3 w-3" />
                    {capability.label}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AgentEditDialog agent={editing} open={open} onOpenChange={setOpen} />
    </>
  );
}
