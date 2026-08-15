import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Portrait from '../../components/Portrait';
import StatusLamp from '../../components/StatusLamp';
import { PixelButton } from '../../components/ui';
import { isOccupied } from '../../state/CamelotContext';

/**
 * SeatDetailPanel — the slide-in stone dossier on the RIGHT.
 *
 * Two modes, driven by whether the seat is occupied:
 *   - OCCUPIED: large framed portrait, blackletter name, role, description,
 *     personality, a status toggle, and an "Edit in Agent Editor" deep-link.
 *   - VACANT:   the ghost silhouette (rendered automatically by <Portrait> for a
 *     nameless agent) plus a prominent gold "Forge This Knight" deep-link.
 *
 * Dismissible via the close button, a click on the dimmed overlay, or Escape.
 * Deep-links use the contract: navigate('/editor?seat=' + agent.id).
 */
export default function SeatDetailPanel({ agent, onClose, onToggleActive }) {
  const navigate = useNavigate();

  // Close on Escape for keyboard users.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!agent) return null;
  const occupied = isOccupied(agent);
  const seatNo = String(agent.seat).padStart(2, '0');

  // Deep-link into the Agent Editor with this seat preselected (contract §Deep-link).
  const openEditor = () => navigate(`/editor?seat=${agent.id}`);

  // HOOK: agent task execution — a future pipeline runner will dispatch this
  // seat's queued task here (e.g. runAgentTask(agent.id, task) from context).

  return (
    <>
      {/* click-outside dismiss */}
      <div className="hub-panel-overlay" onMouseDown={onClose} aria-hidden="true" />

      <aside
        className="hub-panel"
        role="dialog"
        aria-modal="true"
        aria-label={occupied ? `${agent.name} — seat details` : `Vacant seat ${seatNo} — details`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="hub-panel__head">
          <PixelButton
            size="sm"
            className="hub-panel__close"
            onClick={onClose}
            aria-label="Close panel"
          >
            ✕
          </PixelButton>
          <div className="hub-panel__seatno">Seat {seatNo}</div>
          <div className="hub-panel__portrait">
            <Portrait agent={agent} size={132} framed />
          </div>
          {occupied ? (
            <>
              <h2 className="hub-panel__name">{agent.name}</h2>
              <div className="hub-panel__role">{agent.role}</div>
            </>
          ) : (
            <h2 className="hub-panel__name">Vacant</h2>
          )}
        </header>

        {occupied ? (
          <div className="hub-panel__body">
            {agent.description && (
              <section>
                <div className="hub-panel__section-label">Charge</div>
                <p className="hub-panel__text">{agent.description}</p>
              </section>
            )}

            {agent.personality && (
              <section>
                <div className="hub-panel__section-label">Temperament</div>
                <p className="hub-panel__text">{agent.personality}</p>
              </section>
            )}

            <section>
              <div className="hub-panel__section-label">Standing</div>
              <div className="pixel-panel pixel-panel--raised hub-panel__statusrow">
                <StatusLamp active={agent.active} size={22} />
                <PixelButton
                  size="sm"
                  variant={agent.active ? 'ghost' : 'gold'}
                  onClick={() => onToggleActive(agent.id)}
                >
                  {agent.active ? 'STAND DOWN' : 'SUMMON'}
                </PixelButton>
              </div>
            </section>
          </div>
        ) : (
          <div className="hub-panel__body">
            <p className="hub-panel__vacant-note">
              This seat at the Round Table stands empty. A worthy knight has yet to
              be forged for this station.
            </p>
          </div>
        )}

        <footer className="hub-panel__foot">
          {occupied ? (
            <PixelButton variant="gold" block onClick={openEditor}>
              EDIT IN AGENT EDITOR
            </PixelButton>
          ) : (
            <PixelButton variant="gold" block onClick={openEditor}>
              FORGE THIS KNIGHT
            </PixelButton>
          )}
        </footer>
      </aside>
    </>
  );
}
