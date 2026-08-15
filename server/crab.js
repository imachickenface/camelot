import { visualQaCheck } from './anthropic.js';

/**
 * The Mighty Crab's QA pass — pinches every asset before it ships. Checks that
 * each generated URL is actually reachable, plus a visual sanity check on
 * Merlin's still frame (orientation, render quality, matches the prompt).
 */

async function checkUrl(label, url) {
  if (!url) return null;
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return { label, url, reachable: res.ok, status: res.status };
  } catch (err) {
    return { label, url, reachable: false, status: null, error: err.message };
  }
}

/**
 * @param {object} assets
 * @param {string} [assets.imageUrl] — Merlin's still frame
 * @param {string} [assets.videoUrl] — Merlin's clip
 * @param {string} [assets.prompt] — the shot prompt the image/clip was meant to depict
 * @param {string} [assets.voiceUrl] — Miku's voiceover
 * @param {string} [assets.musicUrl] — Miku's backing track
 * @param {string} [assets.sfxUrl] — Teto's sound effect
 * @returns {Promise<{ assets: object[], visual: object|null }>}
 */
export async function runQa({ imageUrl, videoUrl, prompt, voiceUrl, musicUrl, sfxUrl }) {
  const assetChecks = (
    await Promise.all([
      checkUrl('image', imageUrl),
      checkUrl('video', videoUrl),
      checkUrl('voice', voiceUrl),
      checkUrl('music', musicUrl),
      checkUrl('sfx', sfxUrl),
    ])
  ).filter(Boolean);

  const visual = imageUrl && prompt ? await visualQaCheck(imageUrl, prompt) : null;

  return { assets: assetChecks, visual };
}
