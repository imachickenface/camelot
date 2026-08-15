import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateClip } from './higgsfield.js';
import { getLiveActivities } from './activity-watcher.js';
import { scoutIdeas } from './reddit-scout.js';
import { factCheckScript } from './anthropic.js';
import { runHermesTask, chatWithHermes } from './hermes.js';
import { generateVoiceover, generateMusic, generateSoundEffect } from './elevenlabs.js';
import { runQa } from './crab.js';
import { runPipeline } from './arthur.js';
import { readPipeline, writePipeline } from './pipeline-store.js';

/**
 * Camelot local persistence server — implemented as a Vite middleware plugin so the
 * whole app runs from a single `npm run dev`, with no separate server process.
 *
 * THE JSON FILES IN src/data/*.json ARE THE SINGLE SOURCE OF TRUTH.
 * The browser reads them on load and writes them on every save. localStorage is NOT
 * used as the source of truth — the files in this folder win.
 *
 * Routes:
 *   GET  /api/data/:name       -> read  src/data/<name>.json      (name in agents|tabs|settings)
 *   PUT  /api/data/:name       -> write src/data/<name>.json      (body must be valid JSON)
 *   POST /api/upload           -> write an uploaded portrait into src/assets/portraits/
 *   GET  /assets/portraits/:f  -> serve a portrait file from disk (arthur.svg, uploads, etc.)
 *   POST /api/merlin/generate  -> cast a script beat into a clip via Higgsfield (server/higgsfield.js)
 *   POST /api/scout/run        -> pull candidate ideas from Reddit's RSS feeds (server/reddit-scout.js),
 *                                 persisted into src/data/pipeline.json
 *   POST /api/hermes/run       -> run any free-form task through the local Hermes Agent
 *                                 (server/hermes.js) — full shell/file/browser/MCP access, no
 *                                 approval prompts (--yolo). Persisted into src/data/pipeline.json
 *   POST /api/hermes/chat      -> one turn in Hermes's persistent chat Hall — same local
 *                                 engine, but continues one long-lived session (`hermes -z
 *                                 --continue`) instead of a fresh call each time. Transcript
 *                                 persisted into src/data/hermeschat.json
 *   POST /api/percival/check   -> fact-check a script via Claude + web search (server/anthropic.js),
 *                                 persisted into src/data/pipeline.json
 *   POST /api/miku/generate    -> voiceover or music via ElevenLabs (server/elevenlabs.js)
 *   POST /api/teto/generate    -> a sound-effect / foley clip via ElevenLabs (server/elevenlabs.js)
 *   POST /api/crab/check       -> QA pass over the pipeline's latest assets (server/crab.js),
 *                                 persisted into src/data/pipeline.json
 *   POST /api/arthur/run       -> run the full council in sequence (server/arthur.js):
 *                                 Scout -> Hermes -> Percival -> Miku -> Teto -> Merlin -> Crab
 *                                 (Merlin/Teto scoped to the shot list's first beat; the Hermes
 *                                 stage drafts via Claude or local Hermes per seat-07's `engine`)
 *   GET  /assets/audio/:f      -> serve a generated audio clip from disk
 *   GET  /api/activity         -> live local Claude Code sessions + what each is doing
 *                                 (server/activity-watcher.js); the Village polls this
 *                                 to walk knights to the Library / Forge / Tilting Yard
 *
 * HOOK: pipeline status feed — a future automation runner can expose additional
 * endpoints here (e.g. GET /api/pipeline/status) that the Hub council strip polls.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'src', 'data');
const PORTRAITS_DIR = path.join(ROOT, 'src', 'assets', 'portraits');
const AUDIO_DIR = path.join(ROOT, 'src', 'assets', 'audio');

const ALLOWED_FILES = new Set(['agents', 'tabs', 'settings', 'pipeline', 'hermeschat']);
const IMAGE_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};
const AUDIO_TYPES = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

function sendJSON(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(obj));
}

/** Read a seat's `engine` field ("cloud" | "hermes") straight from agents.json. */
function getAgentEngine(id) {
  try {
    const { agents } = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'agents.json'), 'utf-8'));
    return (agents.find((a) => a.id === id) || {}).engine || 'cloud';
  } catch {
    return 'cloud';
  }
}

async function handle(req, res, next) {
  const url = (req.url || '').split('?')[0];

  // --- Serve portrait assets straight from disk so runtime paths in agents.json resolve ---
  if (req.method === 'GET' && url.startsWith('/assets/portraits/')) {
    const file = path.basename(decodeURIComponent(url));
    const filePath = path.join(PORTRAITS_DIR, file);
    if (!filePath.startsWith(PORTRAITS_DIR) || !fs.existsSync(filePath)) {
      return sendJSON(res, 404, { error: 'portrait not found' });
    }
    const ext = path.extname(filePath).toLowerCase();
    res.setHeader('Content-Type', IMAGE_TYPES[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-cache');
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // --- Serve generated audio clips straight from disk ---
  if (req.method === 'GET' && url.startsWith('/assets/audio/')) {
    const file = path.basename(decodeURIComponent(url));
    const filePath = path.join(AUDIO_DIR, file);
    if (!filePath.startsWith(AUDIO_DIR) || !fs.existsSync(filePath)) {
      return sendJSON(res, 404, { error: 'audio not found' });
    }
    const ext = path.extname(filePath).toLowerCase();
    res.setHeader('Content-Type', AUDIO_TYPES[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-cache');
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // --- Read / write the JSON state files ---
  const dataMatch = url.match(/^\/api\/data\/([a-z]+)$/i);
  if (dataMatch && ALLOWED_FILES.has(dataMatch[1].toLowerCase())) {
    const filePath = path.join(DATA_DIR, `${dataMatch[1].toLowerCase()}.json`);
    if (req.method === 'GET') {
      if (!fs.existsSync(filePath)) return sendJSON(res, 404, { error: 'not found' });
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-cache');
      res.end(fs.readFileSync(filePath, 'utf-8'));
      return;
    }
    if (req.method === 'PUT' || req.method === 'POST') {
      const body = await readBody(req);
      try {
        JSON.parse(body); // validate before writing
      } catch {
        return sendJSON(res, 400, { error: 'invalid JSON body' });
      }
      fs.writeFileSync(filePath, body);
      return sendJSON(res, 200, { ok: true });
    }
  }

  // --- Upload a portrait image (base64 data URL -> file on disk) ---
  if (req.method === 'POST' && url === '/api/upload') {
    try {
      const body = await readBody(req);
      const { filename, dataUrl } = JSON.parse(body);
      const m = /^data:(.+?);base64,(.*)$/s.exec(dataUrl || '');
      if (!m) return sendJSON(res, 400, { error: 'invalid data URL' });
      const safe = String(filename || 'portrait.png').replace(/[^a-zA-Z0-9._-]/g, '_');
      const buf = Buffer.from(m[2], 'base64');
      fs.mkdirSync(PORTRAITS_DIR, { recursive: true });
      fs.writeFileSync(path.join(PORTRAITS_DIR, safe), buf);
      return sendJSON(res, 200, { path: `/assets/portraits/${safe}` });
    } catch {
      return sendJSON(res, 500, { error: 'upload failed' });
    }
  }

  // --- Live Claude Code sessions -> Village activity feed (never throws, [] worst case) ---
  if (req.method === 'GET' && url === '/api/activity') {
    res.setHeader('Cache-Control', 'no-cache');
    return sendJSON(res, 200, { sessions: await getLiveActivities() });
  }

  // --- Merlin: cast a text prompt into a clip via Higgsfield, persist to pipeline.json ---
  if (req.method === 'POST' && url === '/api/merlin/generate') {
    try {
      const body = await readBody(req);
      const { prompt } = JSON.parse(body);
      if (!prompt || !String(prompt).trim()) {
        return sendJSON(res, 400, { error: 'prompt is required' });
      }
      const { imageUrl, videoUrl } = await generateClip(String(prompt).trim());
      writePipeline('merlin', { prompt: String(prompt).trim(), lastRunAt: new Date().toISOString(), imageUrl, videoUrl });
      return sendJSON(res, 200, { ok: true, imageUrl, videoUrl });
    } catch (err) {
      return sendJSON(res, 502, { ok: false, error: err.message || 'generation failed' });
    }
  }

  // --- Sir Scout: pull candidate ideas from Reddit's RSS feeds and persist them to pipeline.json ---
  if (req.method === 'POST' && url === '/api/scout/run') {
    try {
      const body = await readBody(req);
      const { subreddits, limit } = body ? JSON.parse(body) : {};
      const { candidates, errors } = await scoutIdeas({ subreddits, limit });

      const prevSubreddits = (readPipeline().scout || {}).subreddits || [];
      writePipeline('scout', {
        subreddits: subreddits && subreddits.length ? subreddits : prevSubreddits,
        lastRunAt: new Date().toISOString(),
        candidates,
      });

      return sendJSON(res, 200, { ok: true, candidates, errors });
    } catch (err) {
      return sendJSON(res, 502, { ok: false, error: err.message || 'scout run failed' });
    }
  }

  // --- Hermes: run any free-form task locally, full tool access, persist to pipeline.json ---
  if (req.method === 'POST' && url === '/api/hermes/run') {
    try {
      const body = await readBody(req);
      const { task } = JSON.parse(body);
      if (!task || !String(task).trim()) {
        return sendJSON(res, 400, { error: 'task is required' });
      }
      const { result } = await runHermesTask(String(task).trim());

      writePipeline('hermes', {
        task: String(task).trim(),
        lastRunAt: new Date().toISOString(),
        result,
      });

      return sendJSON(res, 200, { ok: true, result });
    } catch (err) {
      return sendJSON(res, 502, { ok: false, error: err.message || 'Hermes run failed' });
    }
  }

  // --- Hermes: one turn in his persistent chat Hall (src/data/hermeschat.json) ---
  if (req.method === 'POST' && url === '/api/hermes/chat') {
    try {
      const body = await readBody(req);
      const { message } = JSON.parse(body);
      if (!message || !String(message).trim()) {
        return sendJSON(res, 400, { error: 'message is required' });
      }
      const clean = String(message).trim();
      const { reply } = await chatWithHermes(clean);

      const chatPath = path.join(DATA_DIR, 'hermeschat.json');
      const chat = fs.existsSync(chatPath) ? JSON.parse(fs.readFileSync(chatPath, 'utf-8')) : { messages: [] };
      chat.messages.push({ role: 'user', text: clean, at: new Date().toISOString() });
      chat.messages.push({ role: 'hermes', text: reply, at: new Date().toISOString() });
      fs.writeFileSync(chatPath, JSON.stringify(chat, null, 2));

      return sendJSON(res, 200, { ok: true, reply });
    } catch (err) {
      return sendJSON(res, 502, { ok: false, error: err.message || 'Hermes chat failed' });
    }
  }

  // --- Percival: fact-check a script via Claude + web search, persist to pipeline.json ---
  if (req.method === 'POST' && url === '/api/percival/check') {
    try {
      const body = await readBody(req);
      const { script } = JSON.parse(body);
      if (!script || !String(script).trim()) {
        return sendJSON(res, 400, { error: 'script is required' });
      }
      const { claims } = await factCheckScript(String(script).trim());

      writePipeline('percival', { lastRunAt: new Date().toISOString(), claims });

      return sendJSON(res, 200, { ok: true, claims });
    } catch (err) {
      return sendJSON(res, 502, { ok: false, error: err.message || 'fact-check failed' });
    }
  }

  // --- Miku: text -> voiceover or a backing track via ElevenLabs ---
  if (req.method === 'POST' && url === '/api/miku/generate') {
    try {
      const body = await readBody(req);
      const { mode, text, voiceId } = JSON.parse(body);
      if (!text || !String(text).trim()) {
        return sendJSON(res, 400, { error: 'text is required' });
      }
      const resolvedMode = mode === 'music' ? 'music' : 'voice';
      const result =
        resolvedMode === 'music'
          ? await generateMusic(String(text).trim())
          : await generateVoiceover(String(text).trim(), voiceId);
      writePipeline('miku', {
        mode: resolvedMode,
        text: String(text).trim(),
        lastRunAt: new Date().toISOString(),
        ...result,
      });
      return sendJSON(res, 200, { ok: true, mode: resolvedMode, ...result });
    } catch (err) {
      return sendJSON(res, 502, { ok: false, error: err.message || 'generation failed' });
    }
  }

  // --- Teto: a description -> a sound-effect / foley clip via ElevenLabs ---
  if (req.method === 'POST' && url === '/api/teto/generate') {
    try {
      const body = await readBody(req);
      const { text, durationSeconds } = JSON.parse(body);
      if (!text || !String(text).trim()) {
        return sendJSON(res, 400, { error: 'text is required' });
      }
      const result = await generateSoundEffect(String(text).trim(), durationSeconds);
      writePipeline('teto', { text: String(text).trim(), lastRunAt: new Date().toISOString(), ...result });
      return sendJSON(res, 200, { ok: true, ...result });
    } catch (err) {
      return sendJSON(res, 502, { ok: false, error: err.message || 'generation failed' });
    }
  }

  // --- Crab: QA pass over the pipeline's latest assets, persist to pipeline.json ---
  if (req.method === 'POST' && url === '/api/crab/check') {
    try {
      const body = await readBody(req);
      const overrides = body ? JSON.parse(body) : {};
      const pipeline = readPipeline();

      const targets = {
        imageUrl: overrides.imageUrl || (pipeline.merlin && pipeline.merlin.imageUrl),
        videoUrl: overrides.videoUrl || (pipeline.merlin && pipeline.merlin.videoUrl),
        prompt: overrides.prompt || (pipeline.merlin && pipeline.merlin.prompt),
        voiceUrl: overrides.voiceUrl || (pipeline.miku && pipeline.miku.mode === 'voice' ? pipeline.miku.audioUrl : undefined),
        musicUrl: overrides.musicUrl || (pipeline.miku && pipeline.miku.mode === 'music' ? pipeline.miku.audioUrl : undefined),
        sfxUrl: overrides.sfxUrl || (pipeline.teto && pipeline.teto.audioUrl),
      };

      const { assets, visual } = await runQa(targets);
      writePipeline('crab', { lastRunAt: new Date().toISOString(), assets, visual });

      return sendJSON(res, 200, { ok: true, assets, visual });
    } catch (err) {
      return sendJSON(res, 502, { ok: false, error: err.message || 'QA run failed' });
    }
  }

  // --- Arthur: run the full council in sequence, one demo-scoped pass ---
  if (req.method === 'POST' && url === '/api/arthur/run') {
    try {
      const body = await readBody(req);
      const { idea } = body ? JSON.parse(body) : {};
      // Always 200 — a pipeline run that stopped partway (e.g. one stage
      // errored) is a meaningful result with its own `ok`/`steps`, not an
      // HTTP-level failure; the client renders whatever progress was made.
      const result = await runPipeline({ idea, scriptEngine: getAgentEngine('seat-07') });
      return sendJSON(res, 200, result);
    } catch (err) {
      return sendJSON(res, 502, { ok: false, error: err.message || 'pipeline run failed' });
    }
  }

  next();
}

export function camelotDataPlugin() {
  const install = (server) => {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.mkdirSync(PORTRAITS_DIR, { recursive: true });
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
    server.middlewares.use((req, res, next) => {
      handle(req, res, next).catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[camelot-data-plugin]', err);
        sendJSON(res, 500, { error: 'server error' });
      });
    });
  };
  return {
    name: 'camelot-data-plugin',
    configureServer: install, // `npm run dev`
    configurePreviewServer: install, // `npm run preview`
  };
}
