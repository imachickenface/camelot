import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAgents } from '@/lib/agents-store';
import { RoundTable } from '@/features/round-table/RoundTable';
import { AgentDetail } from '@/features/round-table/AgentDetail';
import { ActivityFeed } from '@/features/round-table/ActivityFeed';

/**
 * The home page. Two columns on desktop:
 *   left  — the Round Table of 12 seats
 *   right — the selected knight's details, then the live activity feed
 */
export function RoundTablePage() {
  const { agents, activity, loading, error } = useAgents();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  // Default the selection to the first occupied seat once agents load.
  React.useEffect(() => {
    if (!selectedId && agents.length > 0) {
      const firstActive = agents.find((a) => !a.isVacant) ?? agents[0];
      setSelectedId(firstActive.id);
    }
  }, [agents, selectedId]);

  const selected = agents.find((a) => a.id === selectedId) ?? null;

  return (
    <div className="px-6 py-6 lg:px-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">The Round Table</h1>
        <p className="mt-1 text-muted-foreground">
          Every agent has a seat. Watch the realm at work, and click a seat to
          learn more.
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error} — is the engine running?
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* ---- Left: the table ---- */}
        <Card>
          <CardContent className="py-8">
            {loading ? (
              <div className="flex aspect-square w-full max-w-[620px] mx-auto items-center justify-center text-muted-foreground">
                Summoning the knights…
              </div>
            ) : (
              <RoundTable
                agents={agents}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            )}
          </CardContent>
        </Card>

        {/* ---- Right: detail + activity ---- */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Knight in focus</CardTitle>
            </CardHeader>
            <CardContent>
              <AgentDetail agent={selected} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Live chronicle</CardTitle>
              <CardDescription>What the table is doing, as it happens.</CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityFeed activity={activity} agents={agents} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
