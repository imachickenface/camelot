import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCamelot } from '../../state/CamelotContext';
import { PixelPanel } from '../../components/ui';

const STATUS_CLASS = {
  complete: 't-gold',
  blocked: 't-crimson',
};

/**
 * The manager pipeline's project list — read-only, polled from src/data/projects.json
 * (written by the scheduled Claude Code session described in docs/MANAGER-RUNBOOK.md,
 * not by this app). Renders nothing when there are no projects yet, so an unused
 * pipeline doesn't clutter the Hub. Clicking a project opens its Hall (a
 * 'project-viewer' custom tab), creating one on first click rather than the manager
 * session pre-creating tabs itself — see CustomTab.jsx's registry.
 *
 * HOOK: pipeline status feed — this is that feed, for the software-dev pipeline.
 */
export default function ProjectsPanel() {
  const { tabs, addTab } = useCamelot();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    let alive = true;
    async function poll() {
      try {
        const res = await fetch('/api/data/projects');
        if (res.ok) {
          const data = await res.json();
          if (alive) setProjects(Array.isArray(data.projects) ? data.projects : []);
        }
      } catch {
        // endpoint/network hiccup — keep the last snapshot, retry next tick
      }
    }
    poll();
    const timer = setInterval(poll, 8000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  if (projects.length === 0) return null;

  const openProject = (project) => {
    const existing = tabs.find((t) => t.contentRef === 'project-viewer' && t.meta?.projectId === project.id);
    const id = existing ? existing.id : addTab(project.name, 'project-viewer', { projectId: project.id });
    navigate(`/tab/${id}`);
  };

  return (
    <PixelPanel className="hub-projects">
      <h3 className="hub-projects__heading font-label t-gold">Projects</h3>
      <ul className="hub-projects__list">
        {projects.map((p) => {
          const steps = p.plan?.steps || [];
          const done = steps.filter((s) => s.status === 'complete').length;
          return (
            <li key={p.id}>
              <button type="button" className="hub-projects__row" onClick={() => openProject(p)}>
                <span className={`hub-projects__status font-label ${STATUS_CLASS[p.status] || 't-pale'}`}>
                  [{p.status}]
                </span>
                <span className="hub-projects__name font-body">{p.name}</span>
                {steps.length > 0 && (
                  <span className="hub-projects__steps font-body t-ghost">
                    {done}/{steps.length} steps
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </PixelPanel>
  );
}
