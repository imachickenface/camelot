import { scoutIdeas } from './reddit-scout.js';
import { draftScript, factCheckScript } from './anthropic.js';
import { generateVoiceover, generateSoundEffect } from './elevenlabs.js';
import { generateClip } from './higgsfield.js';
import { runQa } from './crab.js';
import { writePipeline } from './pipeline-store.js';

/**
 * Arthur's orchestrator — runs the full council in sequence: Scout -> Hagrid ->
 * Percival -> Miku -> Teto -> Merlin -> Crab. A demo-scoped run: Merlin and Teto
 * only work the shot list's FIRST beat (a full shot list would multiply Merlin's
 * ~1-2 minutes per clip by 5-15+ beats). Runs straight through with no approval
 * checkpoints — Percival's findings are recorded but don't block later stages.
 *
 * Each stage's own pipeline.json section is written exactly as if you'd run
 * that seat's panel individually, so the Editor stays consistent either way.
 */
export async function runPipeline({ idea: ideaOverride } = {}) {
  const steps = [];
  const now = () => new Date().toISOString();
  let currentStage = 'scout';

  try {
    let idea = ideaOverride && ideaOverride.trim();
    if (!idea) {
      const { candidates, errors } = await scoutIdeas({});
      writePipeline('scout', { lastRunAt: now(), candidates });
      if (!candidates.length) {
        steps.push({ stage: 'scout', ok: false, note: errors[0] || 'no candidates found' });
        return { ok: false, steps, error: 'Sir Scout found nothing to work from — give Arthur an idea manually.' };
      }
      idea = candidates[0].title;
      steps.push({ stage: 'scout', ok: true, note: `picked "${idea}" from ${candidates.length} candidates` });
    } else {
      steps.push({ stage: 'scout', ok: true, note: 'skipped — idea supplied manually' });
    }

    currentStage = 'hagrid';
    const { script, shotList } = await draftScript(idea);
    writePipeline('hagrid', { idea, lastRunAt: now(), script, shotList });
    steps.push({ stage: 'hagrid', ok: true, note: `script drafted, ${shotList.length} beats` });

    currentStage = 'percival';
    const { claims } = await factCheckScript(script);
    writePipeline('percival', { lastRunAt: now(), claims });
    const disputed = claims.filter((c) => c.verdict === 'disputed').length;
    steps.push({
      stage: 'percival',
      ok: true,
      note: disputed ? `${disputed} disputed claim(s) — not blocking` : `${claims.length} claim(s) checked, none disputed`,
    });

    // Miku and Teto are non-fatal: neither Merlin nor Teto depend on Miku's
    // output, and Crab's QA already handles a missing voice/sfx URL gracefully
    // — an ElevenLabs-side failure (tier limits, quota) shouldn't stop the
    // video-generation half of the run from being testable.
    currentStage = 'miku';
    let voice = { audioUrl: null };
    try {
      voice = await generateVoiceover(script);
      writePipeline('miku', { mode: 'voice', text: script, lastRunAt: now(), ...voice });
      steps.push({ stage: 'miku', ok: true, note: 'voiceover generated' });
    } catch (err) {
      steps.push({ stage: 'miku', ok: false, note: err.message || 'failed' });
    }

    currentStage = 'teto';
    const firstBeat = shotList[0];
    let sfx = { audioUrl: null };
    try {
      sfx = await generateSoundEffect(firstBeat.prompt);
      writePipeline('teto', { text: firstBeat.prompt, lastRunAt: now(), ...sfx });
      steps.push({ stage: 'teto', ok: true, note: `sound conjured for "${firstBeat.beat}"` });
    } catch (err) {
      steps.push({ stage: 'teto', ok: false, note: err.message || 'failed' });
    }

    currentStage = 'merlin';
    const clip = await generateClip(firstBeat.prompt);
    writePipeline('merlin', { prompt: firstBeat.prompt, lastRunAt: now(), ...clip });
    steps.push({ stage: 'merlin', ok: true, note: `first beat ("${firstBeat.beat}") cast` });

    currentStage = 'crab';
    const qa = await runQa({
      imageUrl: clip.imageUrl,
      videoUrl: clip.videoUrl,
      prompt: firstBeat.prompt,
      voiceUrl: voice.audioUrl,
      sfxUrl: sfx.audioUrl,
    });
    writePipeline('crab', { lastRunAt: now(), ...qa });
    const brokenAssets = qa.assets.filter((a) => !a.reachable).length;
    steps.push({ stage: 'crab', ok: !brokenAssets, note: brokenAssets ? `${brokenAssets} asset(s) unreachable` : 'all assets reachable' });

    const summary = {
      idea,
      script,
      shotList,
      claims,
      voiceUrl: voice.audioUrl,
      sfxUrl: sfx.audioUrl,
      imageUrl: clip.imageUrl,
      videoUrl: clip.videoUrl,
      qa,
    };
    writePipeline('arthur', { lastRunAt: now(), steps, ...summary });

    return { ok: true, steps, ...summary };
  } catch (err) {
    steps.push({ stage: currentStage, ok: false, note: err.message || 'failed' });
    writePipeline('arthur', { lastRunAt: now(), steps, error: err.message });
    return { ok: false, steps, error: err.message || 'pipeline run failed' };
  }
}
