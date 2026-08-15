/**
 * Thin wrappers over the pixel-UI CSS classes (see styles/pixel.css) so pages get
 * consistent chunky stone panels and buttons without repeating class strings.
 */

export function PixelPanel({ as: Tag = 'div', raised, flush, className = '', children, ...rest }) {
  const cls = ['pixel-panel', raised && 'pixel-panel--raised', flush && 'pixel-panel--flush', className]
    .filter(Boolean)
    .join(' ');
  return (
    <Tag className={cls} {...rest}>
      {children}
    </Tag>
  );
}

export function PixelButton({
  variant, // 'gold' | 'crimson' | 'ghost'
  size, // 'sm'
  block,
  className = '',
  type = 'button',
  children,
  ...rest
}) {
  const cls = [
    'pixel-btn',
    variant && `pixel-btn--${variant}`,
    size === 'sm' && 'pixel-btn--sm',
    block && 'pixel-btn--block',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button type={type} className={cls} {...rest}>
      {children}
    </button>
  );
}

export function PixelFrame({ vacant, className = '', children, style }) {
  const cls = ['pixel-frame', vacant && 'pixel-frame--vacant', className].filter(Boolean).join(' ');
  return (
    <span className={cls} style={style}>
      {children}
    </span>
  );
}

/** Gothic pointed-arch header bar. */
export function ArchHeader({ className = '', children, ...rest }) {
  return (
    <div className={`arch-header ${className}`} {...rest}>
      {children}
    </div>
  );
}
