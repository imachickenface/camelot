import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Watches the user's real, currently-running Claude Code sessions so the Village page
 * can draw knights walking to themed buildings based on what each session is doing
 * right now (Read/Grep/search -> library, Edit/Write -> forge, Bash -> arena, else idle).
 *
 * HOW IT FINDS SESSIONS:
 * Claude Code writes one append-only JSONL transcript per session at
 *   ~/.claude/projects/<munged-project-path>/<session-uuid>.jsonl
 * ("munged" = the project's absolute path with `/` swapped for `-`, e.g. a session
 * working in /Users/pat/camelot lives under ~/.claude/projects/-Users-pat-camelot/).
 * We treat a transcript as "live" purely by mtime: if the file was written to within
 * the last `windowMs`, a session is presumably active. We stat every *.jsonl file
 * under every project dir (cheap) and only ever read the ones that pass that check
 * (transcripts can run tens of MB, so we never read a cold one).
 *
 * HOW IT CLASSIFIES ACTIVITY:
 * For each live transcript we read only the last ~64KB (fs.openSync + positional
 * read — not readFileSync, since a hot session's file can be huge), split that tail
 * into JSONL lines, drop the first line (it's a partial line unless we got lucky and
 * landed exactly on a line boundary), and scan the remaining lines backward for the
 * most recent `{ type: "assistant", message: { content: [{ type: "tool_use", name }] } }`
 * entry. The tool name maps to an activity via classifyTool(). Transcripts also
 * contain non-message bookkeeping lines (type "ai-title", "mode", "last-prompt",
 * "custom-title", ...) with no `message` field at all, and message lines whose
 * content is plain text or a tool_result rather than a tool_use — all of those are
 * simply skipped while scanning backward, not treated as errors.
 *
 * PRIVACY: this module only ever reads local transcript files already sitting on
 * disk in the user's own ~/.claude directory, and only ever extracts a session id,
 * a project directory name, a tool *name* (e.g. "Read", "Bash" — never tool inputs,
 * outputs, or message text), and file timestamps. Nothing is written anywhere, and
 * nothing leaves the machine — this is purely local introspection for the Village
 * visualization.
 */

const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const PROJECTS_DIR = path.join(CLAUDE_DIR, 'projects');

const TAIL_BYTES = 65536; // read at most this many trailing bytes of a transcript
const LISTING_TTL_MS = 3000; // how long we trust a cached project-dir listing

// Tool name -> Village building. Matched in this order: exact name, then
// "search"/"read" substring (case-insensitive), then falls through to idle.
const TOOL_ACTIVITY_MAP = {
  Read: 'library',
  Grep: 'library',
  Glob: 'library',
  WebFetch: 'library',
  WebSearch: 'library',
  Edit: 'forge',
  Write: 'forge',
  NotebookEdit: 'forge',
  Bash: 'arena',
  BashOutput: 'arena',
  KillShell: 'arena',
};

/**
 * Map a tool name (as it appears in a tool_use content block's `name` field) to a
 * Village activity. Exported standalone so it can be unit-tested / reused without
 * touching the filesystem.
 * @param {string} name
 * @returns {'library'|'forge'|'arena'|'idle'}
 */
export function classifyTool(name) {
  if (!name || typeof name !== 'string') return 'idle';
  if (TOOL_ACTIVITY_MAP[name]) return TOOL_ACTIVITY_MAP[name];
  const lower = name.toLowerCase();
  if (lower.includes('search') || lower.includes('read')) return 'library';
  return 'idle';
}

// --- Per-file cache: keyed by path, invalidated on (mtimeMs, size) change so a
// steady ~2s poll loop doesn't re-open and re-parse transcripts that haven't moved.
const fileCache = new Map(); // path -> { mtimeMs, size, activity, lastTool }

// --- Cached listing of live transcript paths, so a burst of polls within the same
// couple of seconds doesn't re-walk ~/.claude/projects on every single call.
let listingCache = { at: 0, windowMs: -1, entries: [] };

function safeReaddir(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

/**
 * Best-effort de-munge of a Claude Code project directory name back into a readable
 * path. Munging is lossy (the original path's `/` and `-` both become `-`), so this
 * can't be perfectly reversed — we just turn leading `-` segments into `/` the way
 * an absolute path would read, which is right for the common case and harmless
 * (merely cosmetic) when it isn't.
 * @param {string} dirName
 * @returns {string}
 */
function demungeProjectDir(dirName) {
  if (!dirName) return dirName;
  if (dirName.startsWith('-')) return dirName.replace(/-/g, '/');
  return dirName;
}

/**
 * Walk ~/.claude/projects and collect { transcriptPath, projectDirName, mtimeMs }
 * for every *.jsonl transcript whose mtime is within windowMs of now. Cached for
 * LISTING_TTL_MS so rapid polling doesn't re-stat the whole tree every call; the
 * cache is keyed on windowMs too since a different window changes which files
 * qualify as live.
 * @param {number} windowMs
 * @returns {Array<{ transcriptPath: string, projectDirName: string, mtimeMs: number }>}
 */
function listLiveTranscripts(windowMs) {
  const now = Date.now();
  if (listingCache.windowMs === windowMs && now - listingCache.at < LISTING_TTL_MS) {
    return listingCache.entries;
  }

  const entries = [];
  const projectDirs = safeReaddir(PROJECTS_DIR);
  for (const projectDirent of projectDirs) {
    if (!projectDirent.isDirectory()) continue;
    const projectDirName = projectDirent.name;
    const projectPath = path.join(PROJECTS_DIR, projectDirName);
    const files = safeReaddir(projectPath);
    for (const fileDirent of files) {
      // Session transcripts are *.jsonl files directly inside the project dir.
      // Sibling subdirectories (e.g. "subagents", "tool-results") hold unrelated
      // per-session artifacts and are intentionally not descended into.
      if (!fileDirent.isFile() || !fileDirent.name.endsWith('.jsonl')) continue;
      const transcriptPath = path.join(projectPath, fileDirent.name);
      let stat;
      try {
        stat = fs.statSync(transcriptPath);
      } catch {
        continue; // file vanished between readdir and stat — skip it
      }
      if (now - stat.mtimeMs <= windowMs) {
        entries.push({ transcriptPath, projectDirName, mtimeMs: stat.mtimeMs, size: stat.size });
      }
    }
  }

  listingCache = { at: now, windowMs, entries };
  return entries;
}

/**
 * Read the trailing TAIL_BYTES of a file via a positional read (no readFileSync —
 * transcripts can be tens of MB and we only ever want the tail).
 * @param {string} filePath
 * @param {number} size
 * @returns {string}
 */
function readTail(filePath, size) {
  const length = Math.min(TAIL_BYTES, size);
  if (length <= 0) return '';
  const start = size - length;
  const buf = Buffer.alloc(length);
  const fd = fs.openSync(filePath, 'r');
  try {
    fs.readSync(fd, buf, 0, length, start);
  } finally {
    fs.closeSync(fd);
  }
  return buf.toString('utf8');
}

/**
 * Pull the most recent tool_use name out of a transcript tail. Lines are scanned
 * newest-first. The first line of the tail is dropped unconditionally (it's a
 * partial line unless the tail happened to start exactly on a line boundary, and a
 * partial-line JSON.parse failure would otherwise be indistinguishable from one we
 * should actually worry about).
 * @param {string} tailText
 * @returns {string|null} tool name, or null if none found in the tail
 */
function findLastToolUse(tailText) {
  const lines = tailText.split('\n');
  lines.shift(); // drop the (possibly partial) first line of the tail
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue; // malformed/partial JSON line — skip, never throw
    }
    const content = entry && entry.message && entry.message.content;
    if (!Array.isArray(content)) continue;
    for (let j = content.length - 1; j >= 0; j--) {
      const block = content[j];
      if (block && block.type === 'tool_use' && typeof block.name === 'string') {
        return block.name;
      }
    }
  }
  return null;
}

/**
 * Classify a single transcript, using the per-file cache when the file hasn't
 * changed since the last poll (same mtimeMs + size).
 * @param {string} transcriptPath
 * @param {number} mtimeMs
 * @param {number} size
 * @returns {{ activity: string, lastTool: string|null }}
 */
function classifyTranscript(transcriptPath, mtimeMs, size) {
  const cached = fileCache.get(transcriptPath);
  if (cached && cached.mtimeMs === mtimeMs && cached.size === size) {
    return { activity: cached.activity, lastTool: cached.lastTool };
  }

  let lastTool = null;
  try {
    const tail = readTail(transcriptPath, size);
    lastTool = findLastToolUse(tail);
  } catch {
    lastTool = null; // unreadable tail (permissions, race, whatever) -> idle, never throw
  }
  const activity = classifyTool(lastTool);

  fileCache.set(transcriptPath, { mtimeMs, size, activity, lastTool });
  return { activity, lastTool };
}

/**
 * Find the user's currently-live Claude Code sessions and classify what each one is
 * doing right now, most-recently-active first.
 *
 * Synchronous under the hood (fs.statSync/readSync throughout), but always returns
 * a Promise so callers can treat it uniformly and this can grow async internals
 * later (e.g. swapping in fs.promises) without changing its call sites.
 *
 * Never throws: any missing directory, permissions error, or malformed transcript
 * line is swallowed and treated as "no session" / "no tool use found" respectively.
 *
 * @param {object} [opts]
 * @param {number} [opts.windowMs=120000] a transcript must have been written to within
 *   this many ms of now to count as "live"
 * @param {number} [opts.maxSessions=12] cap on the number of sessions returned
 * @returns {Promise<Array<{ sessionId: string, projectDir: string, activity: 'library'|'forge'|'arena'|'idle', lastTool: string|null, ageMs: number }>>}
 */
export async function getLiveActivities({ windowMs = 120000, maxSessions = 12 } = {}) {
  try {
    if (!fs.existsSync(PROJECTS_DIR)) return [];

    const live = listLiveTranscripts(windowMs);
    const now = Date.now();

    const results = live.map(({ transcriptPath, projectDirName, mtimeMs, size }) => {
      const sessionId = path.basename(transcriptPath, '.jsonl');
      const { activity, lastTool } = classifyTranscript(transcriptPath, mtimeMs, size);
      return {
        sessionId,
        projectDir: demungeProjectDir(projectDirName),
        activity,
        lastTool,
        ageMs: Math.max(0, now - mtimeMs),
      };
    });

    results.sort((a, b) => a.ageMs - b.ageMs); // most-recently-active first
    return results.slice(0, maxSessions);
  } catch {
    // Belt-and-suspenders: getLiveActivities must never throw, no matter what.
    return [];
  }
}
