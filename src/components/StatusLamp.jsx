import { Crown } from './emblems';

/**
 * Status indicator: a crown that is lit gold when Active, dim grey when Inactive.
 * Optionally shows an ACTIVE/INACTIVE label. This same `active` flag (from agents.json)
 * drives Arthur's behavior in the Village.
 */
export default function StatusLamp({ active, showLabel = true, size = 20, className = '' }) {
  return (
    <span className={`status-lamp ${active ? 'is-active' : 'is-dim'} ${className}`}>
      <Crown size={size} className="status-lamp__crown" />
      {showLabel && (
        <span className="status-lamp__text font-label">{active ? 'ACTIVE' : 'INACTIVE'}</span>
      )}
    </span>
  );
}
