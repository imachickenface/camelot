import { Navigate, Route, Routes } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/lib/theme';
import { AgentsProvider } from '@/lib/agents-store';
import { DashboardShell } from '@/layout/DashboardShell';
import { RoundTablePage } from '@/pages/RoundTablePage';
import { ForgePage } from '@/pages/ForgePage';
import { SettingsPage } from '@/pages/SettingsPage';

/**
 * The app root: shared providers (live agent data + tooltips), the dashboard
 * frame, and the page routes. Add new pages by adding new <Route>s here.
 */
export default function App() {
  return (
    <ThemeProvider>
      <AgentsProvider>
        <TooltipProvider delayDuration={150}>
          <DashboardShell>
            <Routes>
              <Route path="/" element={<RoundTablePage />} />
              <Route path="/forge" element={<ForgePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </DashboardShell>
        </TooltipProvider>
      </AgentsProvider>
    </ThemeProvider>
  );
}
