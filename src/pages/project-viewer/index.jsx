import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useCamelot } from '../../state/CamelotContext';
import { PixelPanel, ArchHeader } from '../../components/ui';
import './project-viewer.css';

const STATUS_CLASS = {
  complete: 't-gold',
  failed: 't-crimson',
  blocked: 't-crimson',
};

/**
 * One node in the project's file tree — a folder (toggles) or a file (selects).
 * `parentPath` is `null` for the tree's root (the project folder itself, never
 * selectable) and '' for its direct children (a real, but empty, prefix) — those
 * two must stay distinct, since a naive `prefix ? ... : ''` conflates "no prefix
 * yet, I'm at the top level" with "I am the root" and silently drops every
 * top-level file's name from its own relative path.
 */
function TreeNode({ node, parentPath, selectedPath, onSelectFile }) {
  const isRoot = parentPath === null;
  const [open, setOpen] = useState(isRoot);
  const fullPath = isRoot ? '' : parentPath ? `${parentPath}/${node.name}` : node.name;

  if (node.type === 'file') {
    return (
      <li className="project-viewer__tree-node">
        <button
          type="button"
          className={`project-viewer__tree-row${selectedPath === fullPath ? ' is-selected' : ''}`}
          onClick={() => onSelectFile(fullPath)}
        >
          {node.name}
        </button>
      </li>
    );
  }

  return (
    <li className="project-viewer__tree-node">
      <button type="button" className="project-viewer__tree-row" onClick={() => setOpen((o) => !o)}>
        {open ? '▾' : '▸'} {node.name || '/'}
      </button>
      {open && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {(node.children || []).map((child) => (
            <TreeNode
              key={child.name}
              node={child}
              parentPath={isRoot ? '' : fullPath}
              selectedPath={selectedPath}
              onSelectFile={onSelectFile}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * A finished (or in-flight) project's Hall — read-only view of its plan, activity
 * log, and file tree. Mounted via a tab's contentRef: 'project-viewer' (see
 * CustomTab.jsx), parameterized by that tab's meta.projectId (set by
 * ProjectsPanel's find-or-create when the owner clicks a project on the Hub).
 * projects.json is written by the scheduled Claude Code session that runs the
 * manager loop (docs/MANAGER-RUNBOOK.md), not by this app — this page only reads.
 */
export default function ProjectViewer() {
  const { id: tabId } = useParams();
  const { tabs } = useCamelot();
  const tab = tabs.find((t) => t.id === tabId);
  const projectId = tab?.meta?.projectId;

  const [project, setProject] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [tree, setTree] = useState(null);
  const [selectedPath, setSelectedPath] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [fileNote, setFileNote] = useState(null);
  const [fileError, setFileError] = useState(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/data/projects')
      .then((res) => (res.ok ? res.json() : { projects: [] }))
      .then((data) => {
        if (!alive) return;
        const list = Array.isArray(data.projects) ? data.projects : [];
        setProject(list.find((p) => p.id === projectId) || null);
      })
      .catch(() => {
        if (alive) setProject(null);
      })
      .finally(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    let alive = true;
    fetch(`/api/projects/${encodeURIComponent(projectId)}/tree`)
      .then((res) => (res.ok ? res.json() : { tree: null }))
      .then((data) => {
        if (alive) setTree(data.tree);
      })
      .catch(() => {
        if (alive) setTree(null);
      });
    return () => {
      alive = false;
    };
  }, [projectId]);

  const selectFile = useCallback(
    (relPath) => {
      setSelectedPath(relPath);
      setFileContent(null);
      setFileNote(null);
      setFileError(null);
      fetch(`/api/projects/${encodeURIComponent(projectId)}/file?path=${encodeURIComponent(relPath)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.error) {
            setFileError(data.error);
          } else if (data.binary) {
            setFileNote(data.note || 'binary file, not previewable');
          } else {
            setFileContent(data.content);
          }
        })
        .catch(() => setFileError('failed to load file'));
    },
    [projectId],
  );

  if (!tab || !projectId) {
    return (
      <div className="page project-viewer-page">
        <PixelPanel style={{ padding: 32, textAlign: 'center' }}>
          <p className="font-body">This hall isn&rsquo;t linked to a project.</p>
        </PixelPanel>
      </div>
    );
  }

  if (loaded && !project) {
    return (
      <div className="page project-viewer-page">
        <PixelPanel style={{ padding: 32, textAlign: 'center' }}>
          <p className="font-body">No such project — it may have been removed from projects.json.</p>
        </PixelPanel>
      </div>
    );
  }

  const steps = project?.plan?.steps || [];
  const log = project?.activityLog || [];

  return (
    <div className="page project-viewer-page">
      <div className="project-viewer-wrap">
        <PixelPanel className="project-viewer">
          <ArchHeader className="project-viewer__arch">
            <span className="font-title">{project ? project.name : 'Loading…'}</span>
          </ArchHeader>
          {project && (
            <>
              <p className="font-body t-ghost project-viewer__meta">
                <span className={STATUS_CLASS[project.status] || 't-pale'}>[{project.status}]</span>{' '}
                {project.folderPath}
              </p>
              <p className="font-body project-viewer__idea">{project.idea?.text}</p>

              {steps.length > 0 && (
                <>
                  <p className="font-label t-gold project-viewer__section-heading">Plan</p>
                  <ul className="project-viewer__steps">
                    {steps.map((s) => (
                      <li key={s.id} className="font-body">
                        <span className={STATUS_CLASS[s.status] || 't-pale'}>[{s.status}]</span> {s.description}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {log.length > 0 && (
                <>
                  <p className="font-label t-gold project-viewer__section-heading">Activity</p>
                  <ul className="project-viewer__log">
                    {log
                      .slice()
                      .reverse()
                      .map((e, i) => (
                        <li key={i} className="font-body t-ghost">
                          {e.at} · {e.actor} · {e.note}
                        </li>
                      ))}
                  </ul>
                </>
              )}

              <p className="font-label t-gold project-viewer__section-heading">Files</p>
              <div className="project-viewer__files">
                <div className="project-viewer__tree">
                  {tree ? (
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                      <TreeNode node={tree} parentPath={null} selectedPath={selectedPath} onSelectFile={selectFile} />
                    </ul>
                  ) : (
                    <p className="font-body t-ghost">No files yet.</p>
                  )}
                </div>
                <div className="project-viewer__content">
                  {fileError && <p className="font-body project-viewer__content-empty" style={{ color: 'var(--crimson-bright)' }}>{fileError}</p>}
                  {fileNote && <p className="font-body t-ghost project-viewer__content-empty">{fileNote}</p>}
                  {fileContent != null && <pre>{fileContent}</pre>}
                  {!selectedPath && !fileError && !fileNote && (
                    <p className="font-body t-ghost project-viewer__content-empty">Select a file to view it.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </PixelPanel>
      </div>
    </div>
  );
}
