/**
 * Chair — an ORIGINAL pixel-art high-backed gothic chair sprite (inline SVG).
 * Drawn on a 16x22 pixel grid with crisp edges. Desaturated purple/grey so a
 * vacant seat reads as cold and empty; hover-glow is applied by the parent via
 * a drop-shadow filter (see hub.css) so it is never clipped.
 *
 * All colors come from the theme palette (royal-purple + ghost-grey family).
 */
export default function Chair({ size = 60, className = '', style }) {
  return (
    <svg
      className={`hub-chair ${className}`}
      width={size}
      height={(size * 22) / 16}
      viewBox="0 0 16 22"
      shapeRendering="crispEdges"
      role="img"
      aria-label="An empty high-backed chair"
      style={style}
    >
      {/* ---- tall carved backrest ---- */}
      {/* outer frame (light purple bevel) */}
      <rect x="3" y="0" width="10" height="14" fill="#57407e" />
      {/* pointed-arch crest cut into the top corners */}
      <rect x="3" y="0" width="2" height="2" fill="#241833" />
      <rect x="11" y="0" width="2" height="2" fill="#241833" />
      <rect x="7" y="0" width="2" height="1" fill="#8b8699" />
      {/* inner back panel (dark) */}
      <rect x="5" y="2" width="6" height="10" fill="#241833" />
      {/* carved vertical rib highlights */}
      <rect x="6" y="3" width="1" height="8" fill="#3d2a5c" />
      <rect x="9" y="3" width="1" height="8" fill="#3d2a5c" />
      {/* a faint ghost-grey inlay stud on the crest */}
      <rect x="7" y="4" width="2" height="2" fill="#8b8699" />
      {/* left/right back posts (bevel light on left, dark on right) */}
      <rect x="3" y="2" width="1" height="12" fill="#8b8699" />
      <rect x="12" y="2" width="1" height="12" fill="#241833" />

      {/* ---- seat slab ---- */}
      <rect x="2" y="13" width="12" height="4" fill="#3d2a5c" />
      <rect x="2" y="13" width="12" height="1" fill="#57407e" />
      <rect x="2" y="16" width="12" height="1" fill="#241833" />
      {/* seat cushion hint */}
      <rect x="4" y="14" width="8" height="2" fill="#241833" />

      {/* ---- legs ---- */}
      <rect x="3" y="17" width="2" height="5" fill="#3d2a5c" />
      <rect x="3" y="17" width="1" height="5" fill="#57407e" />
      <rect x="11" y="17" width="2" height="5" fill="#3d2a5c" />
      <rect x="12" y="17" width="1" height="5" fill="#241833" />
      {/* front stretcher between legs */}
      <rect x="5" y="19" width="6" height="1" fill="#241833" />
    </svg>
  );
}
