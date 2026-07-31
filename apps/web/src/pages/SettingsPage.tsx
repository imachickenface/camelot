import { AgentSettings } from '@/features/agent-settings/AgentSettings';

/**
 * The settings page — for now, this is where the owner customizes the 12 seats.
 * Future tool settings can be added here as the app grows.
 */
export function SettingsPage() {
  return (
    <div className="px-6 py-6 lg:px-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Agents &amp; Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Rename your knights, change their roles, and decide who sits at the
          table. Every seat is fully customizable.
        </p>
      </header>

      <AgentSettings />
    </div>
  );
}
