import { useEffect } from 'react';
import { PixelPanel, PixelButton } from './ui';
import { Crown } from './emblems';

/**
 * Confirm dialog styled as a wax-seal proclamation. Used for destructive actions
 * (e.g. deleting a custom tab). Controlled via `open`.
 */
export default function WaxSealDialog({
  open,
  title = 'Are you certain?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'crimson',
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel?.();
      if (e.key === 'Enter') onConfirm?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel, onConfirm]);

  if (!open) return null;

  return (
    <div
      className="wax-overlay"
      onMouseDown={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <PixelPanel className="wax-dialog" onMouseDown={(e) => e.stopPropagation()}>
        <div className="wax-seal" aria-hidden="true">
          <span className="wax-seal__blob" />
          <Crown size={30} className="wax-seal__crown" />
        </div>
        <h3 className="wax-dialog__title">{title}</h3>
        {message && <p className="wax-dialog__msg font-body">{message}</p>}
        <div className="wax-dialog__actions">
          <PixelButton onClick={onCancel}>{cancelLabel}</PixelButton>
          <PixelButton variant={variant} onClick={onConfirm} autoFocus>
            {confirmLabel}
          </PixelButton>
        </div>
      </PixelPanel>
    </div>
  );
}
