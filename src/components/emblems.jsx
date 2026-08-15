/**
 * Original pixel emblems drawn as inline SVG (nothing copyrighted).
 *  - Crown       uses currentColor, so a parent's `color` drives it (great for lamps).
 *  - Excalibur   the sword-in-stone, multi-color, used at the table's center.
 *  - QRune       the floating "?" over a vacant seat.
 */

export function Crown({ size = 20, className = '', style, title }) {
  return (
    <svg
      width={size}
      height={(size * 12) / 16}
      viewBox="0 0 16 12"
      shapeRendering="crispEdges"
      className={className}
      style={style}
      role={title ? 'img' : 'presentation'}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
    >
      <g fill="currentColor">
        {/* three towers */}
        <rect x="1" y="3" width="2" height="6" />
        <rect x="13" y="3" width="2" height="6" />
        <rect x="7" y="1" width="2" height="8" />
        {/* band */}
        <rect x="1" y="7" width="14" height="3" />
        {/* tips */}
        <rect x="1" y="2" width="1" height="1" />
        <rect x="14" y="2" width="1" height="1" />
        <rect x="7" y="0" width="1" height="1" />
      </g>
    </svg>
  );
}

export function Excalibur({ size = 64, className = '', style, glow = false }) {
  return (
    <svg
      width={size}
      height={(size * 20) / 16}
      viewBox="0 0 16 20"
      shapeRendering="crispEdges"
      className={`${className} ${glow ? 'excalibur-glowing' : ''}`}
      style={style}
      role="img"
      aria-label="Excalibur in the stone"
    >
      {/* pommel + grip */}
      <rect x="7" y="0" width="2" height="1" fill="#e8d48b" />
      <rect x="7" y="1" width="2" height="3" fill="#7a1e2b" />
      {/* crossguard */}
      <rect x="4" y="4" width="8" height="1" fill="#c9a227" />
      <rect x="4" y="5" width="8" height="1" fill="#7d6518" />
      {/* blade */}
      <rect x="7" y="6" width="2" height="8" fill="#c3c7da" />
      <rect x="7" y="6" width="1" height="8" fill="#f4f6ff" />
      {/* stone */}
      <rect x="1" y="13" width="14" height="6" fill="#3a3350" />
      <rect x="1" y="13" width="14" height="1" fill="#57407e" />
      <rect x="1" y="18" width="14" height="1" fill="#050409" />
      <rect x="6" y="14" width="1" height="4" fill="#241833" />
      <rect x="10" y="15" width="1" height="3" fill="#241833" />
    </svg>
  );
}

export function QRune({ className = '', style }) {
  return (
    <span className={`q-rune font-title ${className}`} style={style} aria-hidden="true">
      ?
    </span>
  );
}
