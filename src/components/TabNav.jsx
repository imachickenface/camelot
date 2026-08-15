import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useCamelot } from '../state/CamelotContext';
import { Crown } from './emblems';
import WaxSealDialog from './WaxSealDialog';

// Built-in tabs map to real pages and cannot be renamed/deleted.
const DEFAULT_TABS = [
  { to: '/', label: 'The Round Table', key: 'round-table', end: true },
  { to: '/village', label: 'The Village', key: 'village', end: false },
  { to: '/editor', label: 'Agent Editor', key: 'editor', end: false },
];

/**
 * Left rail of hanging gothic banners. Default tabs are fixed; custom tabs are
 * user-created (persisted to tabs.json), renamable inline (double-click / ✎) and
 * deletable behind a wax-seal confirm.
 */
export default function TabNav() {
  const { tabs, addTab, renameTab, deleteTab } = useCamelot();
  const navigate = useNavigate();
  const location = useLocation();

  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);

  const startEdit = (tab) => {
    setEditingId(tab.id);
    setEditValue(tab.name);
  };
  const commitEdit = () => {
    if (editingId) renameTab(editingId, editValue.trim() || 'Unnamed Hall');
    setEditingId(null);
  };
  const handleAdd = () => {
    const id = addTab();
    navigate(`/tab/${id}`);
  };
  const confirmDelete = () => {
    const id = pendingDelete.id;
    deleteTab(id);
    setPendingDelete(null);
    if (location.pathname === `/tab/${id}`) navigate('/');
  };

  return (
    <nav className="tabnav" aria-label="Camelot navigation">
      <div className="tabnav__brand">
        <Crown size={28} className="tabnav__crown" />
        <span className="tabnav__title font-title">Camelot</span>
        <span className="tabnav__sub font-label">The Round Table</span>
      </div>

      <div className="tabnav__list">
        {DEFAULT_TABS.map((t) => (
          <NavLink
            key={t.key}
            to={t.to}
            end={t.end}
            className={({ isActive }) => `tab-banner pennant ${isActive ? 'is-active' : ''}`}
          >
            <span className="tab-banner__label font-label">{t.label}</span>
          </NavLink>
        ))}

        {tabs.map((tab) => {
          const active = location.pathname === `/tab/${tab.id}`;
          const editing = editingId === tab.id;
          return (
            <div
              key={tab.id}
              className={`tab-banner pennant tab-banner--custom ${active ? 'is-active' : ''}`}
            >
              {editing ? (
                <input
                  className="tab-banner__input font-label"
                  autoFocus
                  value={editValue}
                  maxLength={22}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitEdit();
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                />
              ) : (
                <button
                  type="button"
                  className="tab-banner__label font-label"
                  onClick={() => navigate(`/tab/${tab.id}`)}
                  onDoubleClick={() => startEdit(tab)}
                  title="Double-click to rename"
                >
                  {tab.name}
                </button>
              )}
              {!editing && (
                <span className="tab-banner__tools">
                  <button
                    type="button"
                    className="tab-icon"
                    title="Rename hall"
                    aria-label="Rename tab"
                    onClick={() => startEdit(tab)}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className="tab-icon tab-icon--danger"
                    title="Delete hall"
                    aria-label="Delete tab"
                    onClick={() => setPendingDelete(tab)}
                  >
                    ✕
                  </button>
                </span>
              )}
            </div>
          );
        })}

        <button type="button" className="tab-add pennant font-label" onClick={handleAdd} title="Add a new hall">
          ✦ New Hall
        </button>
      </div>

      <div className="tabnav__foot font-body">Forge the council, one knight at a time.</div>

      <WaxSealDialog
        open={Boolean(pendingDelete)}
        title="Break the seal?"
        message={pendingDelete ? `Cast down the hall “${pendingDelete.name}”? This cannot be undone.` : ''}
        confirmLabel="Destroy it"
        cancelLabel="Spare it"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </nav>
  );
}
