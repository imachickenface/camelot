import { useEffect, useRef, useState } from 'react';
import { useCamelot } from '../../state/CamelotContext';
import { PixelPanel } from '../../components/ui';
import { Crown, Excalibur } from '../../components/emblems';
import StatusLamp from '../../components/StatusLamp';
import Portrait from '../../components/Portrait';
import Torch from '../../components/Torch';
import Seat from './Seat';
import SeatDetailPanel from './SeatDetailPanel';
import { isOccupied } from '../../state/CamelotContext';
import './hub.css';

/** Below this window width, or this window height (the arena is capped at
 * 78vh — see .hub-arena — so a short window shrinks it too), the circular
 * layout collapses to a scrollable grid rather than crowding 12 seats. */
const CIRCLE_MIN_WIDTH = 1024;
const CIRCLE_MIN_HEIGHT = 640;

/**
 * Seat positions around the table rim, computed with trig once.
 * Seat i (1-based) sits at angle -90deg + (i-1)*30deg, so seat 1 is at 12 o'clock.
 * We place seats on a circle of radius `R%` from the arena center; because the
 * arena is a square, equal x/y percentages give a true circle.
 */
const SEAT_RADIUS = 45; // percent of the arena half-extent from center
/** How far outside the arena each seat starts its mount animation from, along
 * its own angle on the rim — comfortably clears the viewport on any desktop
 * size so chairs visibly converge "from outside the page". */
const ARRIVE_DISTANCE_VMIN = 140;
/** Round trig output to hundredths so inline custom properties don't carry
 * floating-point noise like `8.57e-15` for what is conceptually a clean 0. */
const round2 = (n) => Math.round(n * 100) / 100;

function seatPosition(seatIndex /* 1..12 */) {
  const angleDeg = -90 + (seatIndex - 1) * 30;
  const angleRad = (angleDeg * Math.PI) / 180;
  const left = 50 + SEAT_RADIUS * Math.cos(angleRad);
  const top = 50 + SEAT_RADIUS * Math.sin(angleRad);
  return {
    left: `${left}%`,
    top: `${top}%`,
    '--seat-order': seatIndex - 1,
    '--arrive-x': `${round2(Math.cos(angleRad) * ARRIVE_DISTANCE_VMIN)}vmin`,
    '--arrive-y': `${round2(Math.sin(angleRad) * ARRIVE_DISTANCE_VMIN)}vmin`,
  };
}

/** Track the viewport width so we can swap circle <-> grid (belt + braces with CSS). */
function isTooSmallForCircle() {
  return (
    typeof window !== 'undefined' &&
    (window.innerWidth < CIRCLE_MIN_WIDTH || window.innerHeight < CIRCLE_MIN_HEIGHT)
  );
}

function useIsNarrow() {
  const [narrow, setNarrow] = useState(isTooSmallForCircle);
  useEffect(() => {
    const onResize = () => setNarrow(isTooSmallForCircle());
    window.addEventListener('resize', onResize);
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return narrow;
}

export default function RoundTableHub() {
  const { agents, arthur, seatedCount, toggleAgentActive } = useCamelot();
  const [selectedId, setSelectedId] = useState(null);
  const [excaliburGlow, setExcaliburGlow] = useState(false);
  const narrow = useIsNarrow();
  const glowTimer = useRef(null);

  // Clean up the easter-egg timer on unmount.
  useEffect(() => () => clearTimeout(glowTimer.current), []);

  // Defensive: the parent gates on `loaded`, but agents can still be briefly empty.
  if (!agents || agents.length === 0) {
    return (
      <div className="page page--center">
        <PixelPanel style={{ padding: 32, textAlign: 'center' }}>
          <h2>The Round Table</h2>
          <p className="font-body">Summoning the council…</p>
        </PixelPanel>
      </div>
    );
  }

  // Sort seats by their seat number so the circle order is deterministic.
  const seats = [...agents].sort((a, b) => a.seat - b.seat);
  const selectedAgent = selectedId ? agents.find((a) => a.id === selectedId) || null : null;

  const openSeat = (agent) => setSelectedId(agent.id);
  const closePanel = () => setSelectedId(null);

  // Cosmetic easter egg: pulse Excalibur's glow for one animation cycle.
  const flickExcalibur = () => {
    setExcaliburGlow(false);
    // force the class to re-apply so the keyframe restarts on repeat clicks
    requestAnimationFrame(() => setExcaliburGlow(true));
    clearTimeout(glowTimer.current);
    glowTimer.current = setTimeout(() => setExcaliburGlow(false), 950);
  };

  const arthurActive = arthur ? arthur.active : false;

  return (
    <div className="hub">
      {/* Torchlight ambiance in the hall corners */}
      <Torch size={46} className="hub-torch hub-torch--left" />
      <Torch size={46} flip className="hub-torch hub-torch--right" />
      <Torch size={40} className="hub-torch hub-torch--bl" />
      <Torch size={40} flip className="hub-torch hub-torch--br" />

      {/* ---- Hall banner ---- */}
      <div className="hub-banner pennant">
        <Crown size={40} className="hub-banner__crown" title="Camelot" />
        <h1 className="hub-banner__title">THE ROUND TABLE</h1>
      </div>

      {/* ---- Council status strip (LIVE from context) ---- */}
      {/* HOOK: pipeline status feed — a future task/pipeline feed renders here. */}
      <div className="hub-status">
        <span className="hub-status__item">
          Knights seated:&nbsp;
          <span className="hub-status__count">{seatedCount}</span>
          &nbsp;/ 12
        </span>
        <span className="hub-status__sep" aria-hidden="true" />
        <span className="hub-status__item">
          Arthur:&nbsp;
          <StatusLamp active={arthurActive} size={16} />
        </span>
      </div>

      {narrow ? (
        /* ---- RESPONSIVE FALLBACK: scrollable grid of seat cards ---- */
        <div className="hub-grid" role="list" aria-label="Round Table seats">
          {seats.map((agent) => {
            const occ = isOccupied(agent);
            return (
              <PixelPanel
                as="div"
                key={agent.id}
                role="listitem"
                className={`hub-gridcard${selectedId === agent.id ? ' is-selected' : ''}`}
                tabIndex={0}
                onClick={() => openSeat(agent)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openSeat(agent);
                  }
                }}
                aria-label={occ ? `${agent.name}, ${agent.role}` : `Vacant seat ${agent.seat}`}
                title={occ ? undefined : 'A seat awaits a worthy knight.'}
              >
                <span className="hub-gridcard__seatno">
                  SEAT {String(agent.seat).padStart(2, '0')}
                </span>
                <Portrait agent={agent} size={72} framed />
                <span
                  className={
                    occ ? 'hub-nameplate__name' : 'hub-nameplate__name hub-nameplate__name--vacant'
                  }
                >
                  {occ ? agent.name : 'Vacant Seat'}
                </span>
                {occ && <StatusLamp active={agent.active} size={16} />}
              </PixelPanel>
            );
          })}
        </div>
      ) : (
        /* ---- PRIMARY: the great round table ---- */
        <div className="hub-tablewrap hub--force-circle">
          <div className="hub-arena">
            {/* The carved stone disc */}
            <div className="hub-table" aria-hidden="true">
              <div className="hub-table__runes" />
              <div className="hub-table__inlay" />
              <div className="hub-table__inlay2" />
            </div>

            {/* Center Excalibur emblem — cosmetic glow easter egg */}
            <button
              type="button"
              className="hub-center"
              onClick={flickExcalibur}
              aria-label="Excalibur in the stone"
            >
              <Excalibur size={58} glow={excaliburGlow} />
              <span className="hub-center__label">Excalibur</span>
            </button>

            {/* 12 seats around the rim, positioned by trig */}
            {seats.map((agent) => (
              <Seat
                key={agent.id}
                agent={agent}
                selected={selectedId === agent.id}
                onSelect={openSeat}
                onToggleActive={toggleAgentActive}
                style={seatPosition(agent.seat)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ---- Slide-in seat dossier ---- */}
      {selectedAgent && (
        <SeatDetailPanel
          agent={selectedAgent}
          onClose={closePanel}
          onToggleActive={toggleAgentActive}
        />
      )}
    </div>
  );
}
