import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SETTINGS_PATH = path.join(path.resolve(__dirname, '..'), 'src', 'data', 'settings.json');

const REASONING_LEVELS = new Set(['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'ultra']);

/**
 * Read the user's chosen reasoning effort (settings.json's `hermesReasoningEffort`,
 * editable in Hermes's Hall). Lower = faster (skips/shortens hidden chain-of-thought
 * before the visible reply) at the cost of less careful answers on hard requests.
 * Falls back to "low" if unset or invalid, rather than the model's own default (which
 * runs noticeably slower — see CLAUDE.md's "Speed" note under Engines).
 */
function reasoningEffort() {
  try {
    const { hermesReasoningEffort } = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
    return REASONING_LEVELS.has(hermesReasoningEffort) ? hermesReasoningEffort : 'low';
  } catch {
    return 'low';
  }
}

/**
 * Hermes's connection to the local Hermes Agent CLI (running Qwen3.8-27B via Ollama
 * on this machine — see CLAUDE.md). Unlike every other server/*.js integration, this
 * one is deliberately unrestricted: no toolset limits, no --safe-mode. Hermes runs
 * with the same shell/file/browser/MCP access it has when you run `hermes` yourself
 * in a terminal — Camelot's UI is just another way to hand it a task.
 *
 * --yolo is required, not optional: this is a non-interactive call with no terminal
 * attached, so if Hermes ever wanted to ask "ok to run this command?" there would be
 * no one there to answer and the call would hang until the timeout. --yolo auto-approves
 * every tool call instead. That's the real, practical meaning of "no limitations" here.
 *
 * IMPORTANT: read process.env lazily (inside functions), not as module-level consts.
 * vite.config.js copies .env into process.env inside its defineConfig callback, but
 * ES module imports are hoisted and evaluate BEFORE that callback runs — a top-level
 * `const X = process.env.X` here would permanently capture `undefined`. anthropic.js
 * and elevenlabs.js already do it this way; follow the same pattern.
 *
 * Speed note: Qwen3.8 does hidden chain-of-thought reasoning before every reply by
 * default, which costs real generation time even on trivial prompts. Every call here
 * passes `--reasoning <level>`, read fresh per-call from settings.json's
 * `hermesReasoningEffort` (editable in Hermes's Hall) — this is the main speed/quality
 * knob available without touching the model itself.
 */

function hermesBin() {
  return process.env.HERMES_BIN || 'hermes';
}
// Run from a neutral directory, not Camelot's own repo — this agent has full file
// access and shouldn't default to treating Camelot's source as its project.
function hermesCwd() {
  return process.env.HERMES_CWD || os.homedir();
}
function hermesTimeoutMs() {
  return Number(process.env.HERMES_TIMEOUT_MS) || 10 * 60 * 1000;
}

// Tracks whichever Hermes call is currently running so the UI's Stop button has
// something to kill. Single slot: fine in practice because chat calls are already
// serialized (chatQueue below) and this is a single-user local app — a task-panel
// call and a chat call running at the exact same moment is an edge case, not a
// case worth a multi-process registry for. Stop always targets the most recent call.
let currentProc = null;
let stopRequested = false;

async function callHermes(prompt, extraArgs = []) {
  const clean = String(prompt || '').trim();
  if (!clean) throw new Error('empty task');
  const timeoutMs = hermesTimeoutMs();
  const promise = execFileAsync(
    hermesBin(),
    ['-z', clean, '--no-restore-cwd', '--yolo', '--reasoning', reasoningEffort(), ...extraArgs],
    { cwd: hermesCwd(), timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024 },
  );
  // util.promisify(execFile)'s returned promise carries the underlying ChildProcess
  // on `.child` — that's what stopHermes() below actually kills.
  currentProc = promise.child;
  try {
    const { stdout } = await promise;
    return stdout.trim();
  } catch (err) {
    if (stopRequested) {
      throw new Error('Stopped');
    }
    if (err.killed || err.signal === 'SIGTERM') {
      throw new Error(`Hermes timed out after ${Math.round(timeoutMs / 1000)}s`);
    }
    throw new Error((err.stderr || '').trim() || err.message || 'Hermes call failed');
  } finally {
    currentProc = null;
    stopRequested = false;
  }
}

/**
 * Kill whatever Hermes call is currently running (task, chat, or script draft).
 * @returns {boolean} true if something was actually running and got killed.
 */
export function stopHermes() {
  if (!currentProc) return false;
  stopRequested = true;
  currentProc.kill();
  return true;
}

/**
 * Run an arbitrary task through local Hermes, full capability, no scoping.
 * @param {string} task — whatever the Hub/Editor sends; no shape requirement.
 * @returns {Promise<{ result: string }>}
 */
export async function runHermesTask(task) {
  const result = await callHermes(task);
  return { result };
}

// A fixed session name so every message in the chat Hall continues the same
// Hermes Agent session — real memory of prior turns, not history replayed into
// the prompt each time. `hermes -z --continue <name>` creates the session on its
// first use and resumes it on every call after that.
const CHAT_SESSION_NAME = 'camelot-hermes-hall';

// Two overlapping `--continue` calls against the same session (e.g. a second
// message sent before the first replied) can race or stall each other rather than
// queue cleanly. Serialize on a simple promise chain — one Node process, so this
// is enough; no file lock needed. Each call waits for the previous one to settle
// (success OR failure) before starting.
let chatQueue = Promise.resolve();

/**
 * Send one message in Hermes's persistent chat Hall session. Same unrestricted
 * capability as runHermesTask, just continuing one long-lived conversation instead
 * of a fresh one-shot call each time. Queued — see chatQueue above.
 * @param {string} message
 * @returns {Promise<{ reply: string }>}
 */
export async function chatWithHermes(message) {
  const run = chatQueue.then(() => callHermes(message, ['--continue', CHAT_SESSION_NAME]));
  chatQueue = run.then(
    () => {},
    () => {},
  );
  const reply = await run;
  return { reply };
}

// Models sometimes wrap JSON in ```json fences or add a sentence before/after it —
// pull out the first {...} block rather than assuming raw stdout is clean JSON.
function extractJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : text;
}

/**
 * Draft a script + shot list from a scouted idea, via local Hermes instead of the
 * cloud (Anthropic) path. Used when the scriptwriting seat's engine is "hermes" —
 * both for a direct request and by Arthur's full pipeline. Keeps the same
 * { script, shotList } shape draftScript() (server/anthropic.js) returns, so
 * downstream stages (Percival, Teto, Merlin) don't need to know which engine wrote it.
 * @param {string} idea
 * @returns {Promise<{ script: string, shotList: object[] }>}
 */
export async function draftScriptViaHermes(idea) {
  const prompt = `You are standing in for the Round Table's scriptwriting seat. Turn the
following scouted idea into a short narration script (60-90 seconds spoken aloud) with a
strong hook in the first line, and break it into a shot list of 5-15 second beats. Each beat
needs a vivid visual prompt an AI video generator (Kling/Veo/Sora-style) can render.

Respond with ONLY a JSON object, no markdown fences, no commentary, in exactly this shape:
{"script": "...", "shotList": [{"beat": "...", "durationSec": 10, "prompt": "..."}]}

Idea: ${idea}`;

  const raw = await callHermes(prompt);
  let parsed;
  try {
    parsed = JSON.parse(extractJson(raw));
  } catch {
    throw new Error('Hermes returned no valid script JSON');
  }
  if (!parsed.script || !Array.isArray(parsed.shotList)) {
    throw new Error('Hermes returned no script');
  }
  return parsed;
}
