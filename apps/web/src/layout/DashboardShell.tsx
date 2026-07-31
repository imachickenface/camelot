import { NavLink } from 'react-router-dom';
import {
  Crown,
  LayoutGrid,
  Settings,
  Film,
  Music,
  Compass,
  Lock,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAgents } from '@/lib/agents-store';
import { ThemeToggle } from '@/components/ThemeToggle';

/**
 * The frame that wraps every page: a medieval side menu on the left and the
 * page content on the right.
 *
 * The "Tools" section lists the future modules (video, audio, scraper) as
 * locked "coming soon" entries. When a real tool is added, give it a route and
 * move it up into the live navigation — the shell is built to grow.
 */

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const MAIN_NAV: NavItem[] = [
  { to: '/', label: 'Round Table', icon: LayoutGrid },
  { to: '/forge', label: 'The Forge', icon: Film },
  { to: '/settings', label: 'Agents & Settings', icon: Settings },
];

const COMING_SOON: { label: string; icon: LucideIcon }[] = [
  { label: 'Bard’s Hall (audio)', icon: Music },
  { label: 'The Scriptorium (explorer)', icon: Compass },
];

function LiveIndicator() {
  const { live } = useAgents();
  return (
    <span className="flex items-center gap-2 text-xs text-muted-foreground">
      <span
        className={cn(
          'h-2 w-2 rounded-full',
          live ? 'bg-emerald-500' : 'bg-muted-foreground/50',
        )}
      />
      {live ? 'Connected to the realm' : 'Reconnecting…'}
    </span>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* ---- Side menu ---- */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card/70 backdrop-blur md:flex">
        <div className="flex items-center gap-3 px-6 py-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-accent/15 text-accent">
            <Crown className="h-6 w-6" />
          </span>
          <div>
            <p className="font-display text-xl font-semibold leading-tight">
              Camelot
            </p>
            <p className="text-xs text-muted-foreground">Content engine</p>
          </div>
        </div>

        <div className="gold-rule mx-6 h-px" />

        <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
          {MAIN_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground/80 hover:bg-secondary',
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}

          <p className="px-3 pb-1 pt-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Tools — coming soon
          </p>
          {COMING_SOON.map((item) => (
            <div
              key={item.label}
              className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground/70"
              title="This tool will be added later."
            >
              <item.icon className="h-4 w-4" />
              <span className="flex-1">{item.label}</span>
              <Lock className="h-3 w-3" />
            </div>
          ))}
        </nav>

        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <LiveIndicator />
          <ThemeToggle />
        </div>
      </aside>

      {/* ---- Page content ---- */}
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
