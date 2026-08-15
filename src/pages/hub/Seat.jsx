import Portrait from '../../components/Portrait';
import { QRune } from '../../components/emblems';
import { Crown } from '../../components/emblems';
import { isOccupied } from '../../state/CamelotContext';
import Chair from './Chair';

/**
 * A single seat around the Round Table. Two visual modes, one behavior:
 *   - OCCUPIED (Arthur): framed pixel portrait, gold nameplate (name only —
 *     role/description live in the detail panel, not the seat, so names never
 *     collide with a neighboring seat), and an inline crown toggle (a compact
 *     icon, not a full text pill — with 12 seats packed tightly around the
 *     rim, a wide "ACTIVE" label reaches into the next seat's portrait) that
 *     writes straight to shared state (so the Village stays in sync).
 *   - VACANT: an original high-backed chair sprite with a bobbing "?" rune,
 *     desaturated purple/grey, a native hover tooltip, and a faint gold glow.
 *
 * Clicking anywhere on the seat opens the shared SeatDetailPanel (occupied or
 * vacant mode). `style` carries the absolute left/top computed by the parent
 * from the seat's angle on the circle.
 */
export default function Seat({ agent, selected, onSelect, onToggleActive, style }) {
  const occupied = isOccupied(agent);

  return (
    <div
      className={[
        'hub-seat',
        occupied ? 'hub-seat--occupied' : 'hub-seat--vacant',
        selected && 'is-selected',
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      role="button"
      tabIndex={0}
      aria-label={
        occupied
          ? `${agent.name}, ${agent.role}. Open details.`
          : `Vacant seat ${agent.seat}. Open details.`
      }
      aria-pressed={selected}
      title={occupied ? undefined : 'A seat awaits a worthy knight.'}
      onClick={() => onSelect(agent)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(agent);
        }
      }}
    >
      {occupied ? (
        <>
          <div className="hub-seat__body">
            <Portrait agent={agent} size={48} framed />
          </div>
          <div className="hub-nameplate">
            <span className="hub-nameplate__name" title={agent.name}>
              {agent.name}
            </span>
          </div>
          {/* Inline toggle — same state that drives the Village. A compact crown
              (not a text pill) so it never reaches into a neighboring seat. Stop
              the click from bubbling up and opening the detail panel. */}
          <button
            type="button"
            className={`hub-seat__toggle${agent.active ? ' is-active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleActive(agent.id);
            }}
            aria-label={`Set ${agent.name} ${agent.active ? 'inactive' : 'active'}`}
            aria-pressed={agent.active}
            title={agent.active ? 'Active' : 'Inactive'}
          >
            <Crown size={14} />
          </button>
        </>
      ) : (
        <>
          <QRune className="hub-seat__qrune" />
          <div className="hub-seat__body">
            <Chair size={40} />
          </div>
          <div className="hub-nameplate">
            <span className="hub-nameplate__name hub-nameplate__name--vacant">Vacant Seat</span>
          </div>
        </>
      )}
    </div>
  );
}
