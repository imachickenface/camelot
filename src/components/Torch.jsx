/**
 * Animated pixel torch. Wooden handle + iron bracket + a flame that flickers via
 * CSS (see .torch-flame in components.css). Used in the Hub corners and headers.
 */
export default function Torch({ size = 44, className = '', style, flip = false }) {
  return (
    <svg
      className={`torch ${className}`}
      width={size}
      height={(size * 34) / 16}
      viewBox="0 0 16 34"
      shapeRendering="crispEdges"
      aria-hidden="true"
      style={{ transform: flip ? 'scaleX(-1)' : undefined, ...style }}
    >
      {/* handle */}
      <rect x="6" y="15" width="4" height="18" fill="#3e2713" />
      <rect x="6" y="15" width="1" height="18" fill="#5a3a1e" />
      <rect x="9" y="15" width="1" height="18" fill="#241206" />
      {/* iron bracket */}
      <rect x="4" y="14" width="8" height="3" fill="#2b2f3d" />
      <rect x="4" y="14" width="8" height="1" fill="#4a4f63" />
      {/* rising embers */}
      <g className="torch-ember">
        <rect x="8" y="2" width="1" height="1" fill="#e8d48b" />
        <rect x="6" y="5" width="1" height="1" fill="#d97b29" />
        <rect x="10" y="4" width="1" height="1" fill="#d97b29" />
      </g>
      {/* flame */}
      <g className="torch-flame">
        <rect x="5" y="11" width="6" height="3" fill="#d97b29" />
        <rect x="5" y="9" width="6" height="2" fill="#d97b29" />
        <rect x="6" y="6" width="4" height="3" fill="#d97b29" />
        <rect x="7" y="4" width="2" height="2" fill="#d97b29" />
        <rect x="7" y="2" width="1" height="2" fill="#d97b29" />
        <rect x="6" y="10" width="4" height="3" fill="#c9a227" />
        <rect x="7" y="7" width="2" height="3" fill="#c9a227" />
        <rect x="7" y="5" width="1" height="2" fill="#c9a227" />
        <rect x="7" y="10" width="2" height="2" fill="#e8d48b" />
        <rect x="7" y="8" width="1" height="2" fill="#e8d48b" />
      </g>
    </svg>
  );
}
