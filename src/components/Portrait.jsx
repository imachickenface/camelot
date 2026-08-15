import { useEffect, useState } from 'react';
import { isOccupied } from '../state/CamelotContext';

const VACANT_SILHOUETTE = '/assets/portraits/vacant-silhouette.svg';

/**
 * Renders a seat's portrait consistently everywhere:
 *   - has an uploaded/assigned portrait -> that image (pixelated)
 *   - named but no image, or the image 404s -> a gold monogram tile
 *   - vacant                            -> the ghost-grey silhouette
 *
 * Pass `framed` to wrap it in the ornate gold pixel frame.
 */
export default function Portrait({ agent, size = 96, framed = false, className = '', style }) {
  const occupied = isOccupied(agent);
  const portraitSrc = agent && agent.portrait;
  // A broken <img> renders its unclipped alt text over surrounding layout, so
  // treat a load failure the same as "no portrait" rather than leaving it broken.
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => {
    setImgFailed(false);
  }, [portraitSrc]);
  const hasImg = Boolean(portraitSrc) && !imgFailed;
  const vacant = !occupied;

  let inner;
  if (hasImg) {
    inner = (
      <img
        src={portraitSrc}
        alt={agent.name ? `${agent.name} portrait` : 'portrait'}
        width={size}
        height={size}
        style={{ width: size, height: size, objectFit: 'cover' }}
        onError={() => setImgFailed(true)}
      />
    );
  } else if (occupied) {
    const initial = agent.name.trim().charAt(0).toUpperCase();
    inner = (
      <span
        className="portrait-monogram font-title"
        style={{ width: size, height: size, fontSize: size * 0.55 }}
        aria-label={`${agent.name} monogram`}
      >
        {initial}
      </span>
    );
  } else {
    inner = (
      <img
        src={VACANT_SILHOUETTE}
        alt="Vacant seat"
        width={size}
        height={size}
        style={{ width: size, height: size }}
      />
    );
  }

  if (!framed) {
    return (
      <span className={`portrait ${className}`} style={style}>
        {inner}
      </span>
    );
  }

  const frameCls = ['pixel-frame', vacant && 'pixel-frame--vacant', className].filter(Boolean).join(' ');
  // NB: don't force the frame to `size` — box-sizing:border-box would push the
  // `size`-wide image off-center (down/right) by the padding+border. Let the frame
  // shrink-wrap the image so the gold border sits evenly around it.
  return (
    <span className={frameCls} style={style}>
      {inner}
    </span>
  );
}
