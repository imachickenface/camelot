import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

/**
 * Miku and Teto's connection to ElevenLabs — Miku sings (voiceover + music),
 * Teto fills in the rest (foley / sound design), routed through the same account.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const AUDIO_DIR = path.join(ROOT, 'src', 'assets', 'audio');

// ElevenLabs' own default premade voice ("Rachel") — used unless the caller
// (or ELEVENLABS_VOICE_ID) overrides it. There's no portrait-equivalent "pick
// a voice" UI yet, so this keeps Miku usable out of the box.
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

let client = null;
function getClient() {
  if (!process.env.ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY is not set — add it to camelot/.env (see .env.example)');
  }
  if (!client) {
    client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });
  }
  return client;
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks.map((c) => (Buffer.isBuffer(c) ? c : Buffer.from(c))));
}

function saveAudio(prefix, buffer, ext = 'mp3') {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
  const filename = `${prefix}-${Date.now()}.${ext}`;
  fs.writeFileSync(path.join(AUDIO_DIR, filename), buffer);
  return `/assets/audio/${filename}`;
}

/** Miku: turn a line of script into a voiceover clip. */
export async function generateVoiceover(text, voiceId) {
  const eleven = getClient();
  const stream = await eleven.textToSpeech.convert(voiceId || process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID, {
    text,
    modelId: 'eleven_multilingual_v2',
  });
  const buffer = await streamToBuffer(stream);
  return { audioUrl: saveAudio('miku-voice', buffer) };
}

/** Miku: compose a short backing track from a text prompt. */
export async function generateMusic(prompt) {
  const eleven = getClient();
  const stream = await eleven.music.compose({ prompt, musicLengthMs: 30000 });
  const buffer = await streamToBuffer(stream);
  return { audioUrl: saveAudio('miku-music', buffer) };
}

/** Teto: turn a description into a sound-effect / foley clip. */
export async function generateSoundEffect(text, durationSeconds) {
  const eleven = getClient();
  const stream = await eleven.textToSoundEffects.convert({
    text,
    durationSeconds: durationSeconds || undefined,
  });
  const buffer = await streamToBuffer(stream);
  return { audioUrl: saveAudio('teto-sfx', buffer) };
}
