import { HiggsfieldClient } from '@higgsfield/client';

/**
 * Merlin's connection to Higgsfield — a script beat goes in, a short clip comes out.
 *
 * Two Higgsfield calls chained together, since the SDK's typed v2 endpoints only
 * cover text-to-IMAGE (Soul) and image-to-VIDEO (DoP), not text-to-video directly:
 *   1. /v1/text2image/soul  — render a still frame from the prompt
 *   2. /v1/image2video/dop  — animate that still into a clip
 *
 * withPolling defaults to true on both calls, so this awaits full completion of
 * each stage before returning — callers should expect this to take up to a
 * couple of minutes per clip.
 */

let client = null;
function getClient() {
  if (!process.env.HF_CREDENTIALS) {
    throw new Error('HF_CREDENTIALS is not set — add it to camelot/.env (see .env.example)');
  }
  if (!client) {
    client = new HiggsfieldClient({ credentials: process.env.HF_CREDENTIALS });
  }
  return client;
}

function firstResultUrl(jobSet) {
  const job = jobSet.jobs && jobSet.jobs[0];
  return job && job.results && job.results.raw && job.results.raw.url;
}

/**
 * Generate a short clip from a text prompt.
 * @param {string} prompt
 * @returns {Promise<{ imageUrl: string, videoUrl: string }>}
 */
export async function generateClip(prompt) {
  const hf = getClient();

  const stillJob = await hf.generate('/v1/text2image/soul', {
    prompt,
    width_and_height: '1536x1536',
    quality: '1080p',
    batch_size: 1,
  });
  if (stillJob.isFailed || stillJob.isNsfw) {
    throw new Error(`still frame generation ${stillJob.isNsfw ? 'flagged nsfw' : 'failed'}`);
  }
  const imageUrl = firstResultUrl(stillJob);
  if (!imageUrl) throw new Error('still frame generation returned no image');

  const videoJob = await hf.generate('/v1/image2video/dop', {
    model: 'dop-turbo',
    prompt,
    input_images: [{ type: 'image_url', image_url: imageUrl }],
  });
  if (videoJob.isFailed || videoJob.isNsfw) {
    throw new Error(`clip generation ${videoJob.isNsfw ? 'flagged nsfw' : 'failed'}`);
  }
  const videoUrl = firstResultUrl(videoJob);
  if (!videoUrl) throw new Error('clip generation returned no video');

  return { imageUrl, videoUrl };
}
