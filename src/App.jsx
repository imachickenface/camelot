import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useCamelot } from './state/CamelotContext';
import TabNav from './components/TabNav';
import ErrorBoundary from './components/ErrorBoundary';
import RoundTableHub from './pages/hub/index.jsx';
import AgentEditor from './pages/editor/index.jsx';
import Village from './pages/village/index.jsx';
import CustomTab from './pages/CustomTab.jsx';
import './App.css';

function LoadingHall({ error }) {
  return (
    <div className="loading-hall">
      <div className="loading-hall__crest font-title">Camelot</div>
      <div className="loading-hall__msg font-label">
        {error ? `The hall is sealed: ${error}` : 'Lighting the torches…'}
      </div>
    </div>
  );
}

export default function App() {
  const { loaded, error } = useCamelot();
  const location = useLocation();

  return (
    <div className="app-shell">
      <TabNav />
      <main className="app-main">
        {!loaded ? (
          <LoadingHall error={error} />
        ) : (
          /* Keyed by path so a crash in one view resets when you navigate away. */
          <ErrorBoundary key={location.pathname}>
            <Routes>
              <Route path="/" element={<RoundTableHub />} />
              <Route path="/village" element={<Village />} />
              <Route path="/editor" element={<AgentEditor />} />
              {/* HOOK: custom tab content mounting — CustomTab renders the empty hall now;
                  a future contentRef on the tab entry can mount real components here. */}
              <Route path="/tab/:id" element={<CustomTab />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ErrorBoundary>
        )}
      </main>
    </div>
  );
}
