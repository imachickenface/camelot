import * as React from 'react';
import type { Agent, AgentCapability, AgentProfileUpdate } from '@camelot/shared';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CAPABILITY_OPTIONS } from '@/lib/agent-meta';
import { saveAgent } from '@/lib/api';
import { useAgents } from '@/lib/agents-store';

/**
 * The click-to-edit form. A non-technical owner changes a knight's name,
 * rank, personality, role, sigil, and color here — no code required. Saving
 * sends the changes to the engine and updates the table immediately.
 */
interface AgentEditDialogProps {
  agent: Agent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Auto-build a two-letter sigil from a name, e.g. "Galahad" → "GA". */
function sigilFromName(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.slice(0, 2).toUpperCase() : '—';
}

export function AgentEditDialog({ agent, open, onOpenChange }: AgentEditDialogProps) {
  const { applyAgent } = useAgents();
  const [form, setForm] = React.useState<AgentProfileUpdate>({});
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Re-seed the form each time a different seat is opened.
  React.useEffect(() => {
    if (agent) {
      setForm({
        name: agent.name,
        rank: agent.rank,
        personality: agent.personality,
        capability: agent.capability,
        sigil: agent.sigil,
        color: agent.color,
        isVacant: agent.isVacant,
      });
      setError(null);
    }
  }, [agent]);

  if (!agent) return null;

  const set = <K extends keyof AgentProfileUpdate>(
    key: K,
    value: AgentProfileUpdate[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  async function handleSave() {
    if (!agent) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await saveAgent(agent.id, form);
      applyAgent(updated);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }

  const filled = !form.isVacant;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit seat {agent.seat}</DialogTitle>
          <DialogDescription>
            Change who sits here and what they do. Changes appear on the Round
            Table right away.
          </DialogDescription>
        </DialogHeader>

        {/* Filled / vacant toggle. */}
        <label className="flex items-center gap-3 rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[hsl(var(--primary))]"
            checked={filled}
            onChange={(e) => set('isVacant', !e.target.checked)}
          />
          <span>
            <span className="font-medium">This seat is filled.</span>{' '}
            <span className="text-muted-foreground">
              Uncheck to leave it vacant.
            </span>
          </span>
        </label>

        <div className={filled ? 'space-y-4' : 'space-y-4 opacity-50'}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="agent-name">Name</Label>
              <Input
                id="agent-name"
                value={form.name ?? ''}
                disabled={!filled}
                onChange={(e) => {
                  const name = e.target.value;
                  set('name', name);
                  // Keep the sigil in step with the name unless hand-edited.
                  if (!form.sigil || form.sigil === sigilFromName(form.name ?? '')) {
                    set('sigil', sigilFromName(name));
                  }
                }}
                placeholder="e.g. Galahad"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="agent-rank">Rank / title</Label>
              <Input
                id="agent-rank"
                value={form.rank ?? ''}
                disabled={!filled}
                onChange={(e) => set('rank', e.target.value)}
                placeholder="e.g. The Pure"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="agent-personality">Personality</Label>
            <Textarea
              id="agent-personality"
              value={form.personality ?? ''}
              disabled={!filled}
              onChange={(e) => set('personality', e.target.value)}
              placeholder="A short description of who they are and how they work."
            />
          </div>

          <div className="grid grid-cols-[1fr_auto_auto] items-end gap-4">
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={form.capability}
                disabled={!filled}
                onValueChange={(v) => set('capability', v as AgentCapability)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a role" />
                </SelectTrigger>
                <SelectContent>
                  {CAPABILITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="agent-sigil">Sigil</Label>
              <Input
                id="agent-sigil"
                value={form.sigil ?? ''}
                disabled={!filled}
                maxLength={2}
                onChange={(e) => set('sigil', e.target.value.toUpperCase())}
                className="w-16 text-center"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="agent-color">Color</Label>
              <input
                id="agent-color"
                type="color"
                value={form.color ?? '#c9a227'}
                disabled={!filled}
                onChange={(e) => set('color', e.target.value)}
                className="h-10 w-12 cursor-pointer rounded-md border border-input bg-background"
              />
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="gold" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
